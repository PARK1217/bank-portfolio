# bank-portfolio

은행 도메인 포트폴리오 프로젝트. FastAPI · Next.js · PostgreSQL 풀스택 환경.

## 스택

| 레이어 | 기술 |
| --- | --- |
| Backend | FastAPI, asyncpg, pydantic-settings, PyJWT, bcrypt |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| DB | PostgreSQL 16 (v52 영문 식별자 스키마, 83 테이블) |
| 인프라 | Docker Compose (postgres / backend / frontend) |

## 구조

```
bank-portfolio/
├── backend/        FastAPI 앱 (app/main.py 진입점)
├── frontend/       Next.js 앱 (App Router)
├── db/
│   ├── 01_schema.sql   v52 영문 스키마 (라이브 DB에서 pg_dump --schema-only)
│   └── 02_seed.sql     시드 placeholder (기능 진행에 따라 추가)
└── docker-compose.yml
```

## 실행

```bash
docker compose up -d --build
```

| 서비스 | URL |
| --- | --- |
| Frontend | http://localhost:3001 |
| Backend (Swagger) | http://localhost:8001/docs |
| PostgreSQL | localhost:5434 (user/pw/db: bank / bank1234 / bank) |

> 포트는 기존 banking 스택(3000/8000/5433)과 동시 실행 가능하도록 분리되어 있습니다.

헬스 체크:

```bash
curl http://localhost:8001/health
```

## 스키마 갱신

라이브 DB 스키마를 소스로 삼습니다. 스키마 변경 후 다음으로 재추출:

```bash
docker exec bank-portfolio-postgres \
  pg_dump -U bank -d bank --schema-only --no-owner --no-privileges \
  > db/01_schema.sql
```
