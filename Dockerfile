# [Stage 1] 빌드 단계: Node 환경에서 Expo 웹 빌드 수행
FROM node:20-alpine AS builder

WORKDIR /app

# 빌드 시 환경변수 (ARG로 받아서 ENV로 설정)
ARG EXPO_PUBLIC_PROXY_URL
ARG EXPO_PUBLIC_OLLAMA_MODEL=llama3.1:8b

ENV EXPO_PUBLIC_PROXY_URL=$EXPO_PUBLIC_PROXY_URL
ENV EXPO_PUBLIC_OLLAMA_MODEL=$EXPO_PUBLIC_OLLAMA_MODEL

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 웹 빌드 실행 (환경변수가 빌드 시점에 코드에 포함됨)
RUN npx expo export -p web

# [Stage 2] 실행 단계: Nginx로 정적 파일 배포
FROM nginx:alpine

# Stage 1에서 만든 dist 폴더를 Nginx html 폴더로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
