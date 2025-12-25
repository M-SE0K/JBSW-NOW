# [Stage 1] 빌드 단계: Node 환경에서 Expo 웹 빌드 수행
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 웹 빌드 실행 (npx expo export -p web)
# 결과물은 보통 'dist' 폴더에 생깁니다.
RUN npx expo export -p web

# [Stage 2] 실행 단계: Nginx로 정적 파일 배포
FROM nginx:alpine

# Stage 1에서 만든 dist 폴더를 Nginx html 폴더로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 (SPA 라우팅 문제 해결을 위해 필요하다면 추가 설정이 필요하지만 일단 기본으로)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]