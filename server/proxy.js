// .env 파일 로드
try {
  require("dotenv").config();
} catch (err) {
  // dotenv가 없으면 무시
}

const express = require("express");

const app = express();
const PORT = process.env.PORT || 4000;

// OLLAMA_URL 처리: 프로토콜이 없으면 http:// 자동 추가
let OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// JSON 파싱 미들웨어
app.use(express.json());

// 간단 요청 로깅 미들웨어
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[proxy] ${req.method} ${req.url} -> ${res.statusCode} ${ms}ms`);
  });
  next();
});

// 공통 CORS 헤더
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// 간단한 헬스체크
app.get("/health", (_req, res) => res.json({ ok: true }));

// Ollama 프록시 엔드포인트
app.post("/api/ollama/chat", async (req, res) => {
  try {
    const { model, messages, options } = req.body;
    
    if (!model || !messages) {
      return res.status(400).json({ error: "Missing 'model' or 'messages'" });
    }

    // URL 검증
    const chatUrl = `${OLLAMA_URL}/api/chat`;
    try {
      new URL(chatUrl);
    } catch (urlError) {
      return res.status(500).json({ 
        error: `유효하지 않은 Ollama URL: ${OLLAMA_URL}`,
        suggestion: "OLLAMA_URL 환경 변수가 올바른 형식인지 확인하세요."
      });
    }

    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: errorText,
        model: model,
        suggestion: response.status === 404 
          ? `모델 '${model}'을 찾을 수 없습니다. 'ollama list'로 사용 가능한 모델을 확인하거나 'ollama pull ${model}'로 다운로드하세요.`
          : undefined
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      return res.status(503).json({ 
        error: `Ollama 서버에 연결할 수 없습니다: ${OLLAMA_URL}`,
        suggestion: "Ollama 서버가 실행 중인지 확인하세요. 터미널에서 'ollama serve'를 실행하거나 Ollama 데스크톱 앱을 실행하세요."
      });
    }
    
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Ollama 모델 목록 조회
app.get("/api/ollama/models", async (_req, res) => {
  try {
    const tagsUrl = `${OLLAMA_URL}/api/tags`;
    const response = await fetch(tagsUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Ollama 모델 다운로드
app.post("/api/ollama/pull", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Missing 'name'" });
    }

    const pullUrl = `${OLLAMA_URL}/api/pull`;
    const response = await fetch(pullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    // 스트리밍 응답 처리
    res.setHeader("Content-Type", "application/json");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    
    res.end();
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// 템플릿 방식: /proxy?url={target}
app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Missing 'url' query" });
    }

    const upstream = await fetch(target);
    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text());
    }

    // 원본 Content-Type 유지
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // 스트리밍 전송
    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// 서버 시작 시 Ollama 연결 확인
async function checkOllamaConnection() {
  try {
    const tagsUrl = `${OLLAMA_URL}/api/tags`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(tagsUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      // eslint-disable-next-line no-console
      console.log(`[ollama] ✅ 연결 성공: ${OLLAMA_URL}`);
    }
  } catch (err) {
    // 연결 실패는 조용히 무시 (서버는 계속 실행)
  }
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[proxy] listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[ollama] Ollama URL: ${OLLAMA_URL}`);
  checkOllamaConnection();
});


