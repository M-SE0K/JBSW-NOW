# Ollama 챗봇 설정 가이드

이 프로젝트는 Ollama를 사용하여 로컬 LLM 모델로 챗봇을 실행합니다.

## 1. Ollama 설치

### macOS
```bash
# Homebrew를 사용하는 경우
brew install ollama

# 또는 공식 웹사이트에서 다운로드
# https://ollama.com/download
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
[Ollama 공식 웹사이트](https://ollama.com/download)에서 설치 프로그램을 다운로드하세요.

## 2. Ollama 서버 실행

터미널에서 다음 명령어를 실행하여 Ollama 서버를 시작합니다:

```bash
ollama serve
```

또는 Ollama 데스크톱 앱을 실행하면 자동으로 서버가 시작됩니다.

기본적으로 Ollama는 `http://localhost:11434`에서 실행됩니다.

## 3. 모델 다운로드

사용할 LLM 모델을 다운로드합니다. 추천 모델:

### 작은 모델 (빠른 응답, 낮은 리소스)
```bash
# llama3.2 (1B 파라미터, 약 1.3GB)
npm run ollama:pull llama3.2

# gemma2:2b (2B 파라미터, 약 1.4GB)
npm run ollama:pull gemma2:2b
```

### 중간 모델 (균형잡힌 성능)
```bash
# llama3.2:3b (3B 파라미터, 약 2GB)
npm run ollama:pull llama3.2:3b

# qwen2.5:7b (7B 파라미터, 약 4.4GB)
npm run ollama:pull qwen2.5:7b
```

### 큰 모델 (높은 성능, 높은 리소스)
```bash
# llama3.1:8b (8B 파라미터, 약 4.7GB)
npm run ollama:pull llama3.1:8b

# qwen2.5:14b (14B 파라미터, 약 8.4GB)
npm run ollama:pull qwen2.5:14b
```

또는 직접 스크립트를 실행할 수도 있습니다:
```bash
node scripts/download-ollama-model.mjs <model-name>
```

## 4. 환경 변수 설정 (선택사항)

프로젝트 루트에 `.env` 파일을 생성하여 다음 변수들을 설정할 수 있습니다:

```env
# Ollama 서버 URL (기본값: http://localhost:11434)
OLLAMA_URL=http://localhost:11434

# 사용할 Ollama 모델 (기본값: llama3.2)
EXPO_PUBLIC_OLLAMA_MODEL=llama3.2

# 프록시 서버 URL (기본값: http://localhost:4000)
EXPO_PUBLIC_PROXY_URL=http://localhost:4000
```

## 5. 프록시 서버 실행

프로젝트 루트에서 프록시 서버를 실행합니다:

```bash
npm run proxy

```

또는

```bash
node server/proxy.js
```

프록시 서버는 기본적으로 `http://localhost:4000`에서 실행됩니다.

## 6. 앱 실행

다른 터미널에서 Expo 앱을 실행합니다:

```bash
npm run dev
```

## 사용 가능한 모델 확인

다운로드된 모델 목록을 확인하려면:

```bash
ollama list
```

## 문제 해결

### Ollama 서버에 연결할 수 없음
- Ollama가 실행 중인지 확인: `ollama serve` 또는 데스크톱 앱 실행
- 포트 11434가 사용 가능한지 확인

### 모델을 찾을 수 없음
- 모델이 다운로드되었는지 확인: `ollama list`
- 올바른 모델 이름을 사용했는지 확인
- 모델을 다시 다운로드: `npm run ollama:pull <model-name>`

### 프록시 서버 오류
- 프록시 서버가 실행 중인지 확인: `npm run proxy`
- 포트 4000이 사용 가능한지 확인
- Ollama 서버 URL이 올바른지 확인

## 모델 추천

### 한국어 지원이 좋은 모델
- `qwen2.5:7b` - 중국어/한국어 지원이 우수
- `llama3.2:3b` - 다국어 지원, 빠른 응답

### 빠른 응답이 필요한 경우
- `llama3.2` (1B) - 가장 빠름
- `gemma2:2b` - 빠르고 효율적

### 높은 품질이 필요한 경우
- `llama3.1:8b` - 높은 품질
- `qwen2.5:14b` - 매우 높은 품질 (리소스 많이 필요)

