# 로컬 데모용 — dev 서버 (NEXT_PUBLIC_API_URL 런타임 주입, compose env 사용)
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]