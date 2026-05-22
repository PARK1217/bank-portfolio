# 로컬 데모용 — dev 서버 (NEXT_PUBLIC_API_URL 런타임 주입, compose env 사용)
FROM node:20-alpine

# alpine 은 tzdata 미포함 → Node `new Date()` / SSR 로그가 UTC 로 동작.
# tzdata 설치 후 /etc/localtime 링크 + ENV TZ 로 KST 고정.
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && echo "Asia/Seoul" > /etc/timezone

ENV TZ=Asia/Seoul

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]