const express = require("express");

const app = express();
const PORT = process.env.PORT || 4000;

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
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// 간단한 헬스체크
app.get("/health", (_req, res) => res.json({ ok: true }));

// 템플릿 방식: /proxy?url={target}
app.get("/proxy", async (req, res) => {
  try {
    const target = req.query.url;
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "Missing 'url' query" });
    }

    // 요청 대상 로그
    // eslint-disable-next-line no-console
    console.log(`[proxy] fetch → ${target}`);

    const upstream = await fetch(target);
    if (!upstream.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[proxy] upstream ${upstream.status} for ${target}`);
      return res.status(upstream.status).send(await upstream.text());
    }

    // 원본 Content-Type 유지
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // 스트리밍 전송
    const arrayBuffer = await upstream.arrayBuffer();
    // eslint-disable-next-line no-console
    console.log(`[proxy] delivered ${arrayBuffer.byteLength}B as ${contentType}`);
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[proxy] error:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[proxy] listening on http://localhost:${PORT}`);
});


