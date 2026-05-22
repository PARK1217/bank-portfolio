# frontend-admin

다온뱅크 운영·감독 콘솔 (Phase 6 §9.4).

기존 사용자용 frontend(`/`, 포트 3001) 와 분리된 별도 Next.js 프로젝트입니다. 도메인·번들·CSP 분리가 이유.

## 실행

```bash
cd frontend-admin
npm install
npm run dev          # 포트 5001
# → http://localhost:5001
```

백엔드 API 베이스는 기본 `http://localhost:8001`. 다른 host 사용 시:

```bash
NEXT_PUBLIC_ADMIN_API_URL=http://api.example.com npm run dev
```

## 시드 자격증명

| 사번 | 비밀번호 | 부서 |
| --- | --- | --- |
| `ADMIN001` | `admin1234` | 여신정책팀 |
| `AUDIT001` | `admin1234` | 감사팀 |

자세한 시드 위치: `db/11_admin_auth_migration.sql`.

## Phase A 완료 화면 (이번 스코프)

- `/login` — 사번/비번 로그인 (백엔드 `POST /api/admin/auth/login`)
- `/dashboard` — KPI 5종 (검토대기·자동승인·자동반려·연체회원·외부망정상) + 바로가기
- `/loans/review-queue` — 사람 검토 대기 큐 (`GET /api/admin/loans/review-queue`)
- `/loans/decisions` — AI 의사결정 이력 (필터: 전체·자동승인·자동반려·검토중·승인·반려)
- `/loans/{appId}` — 신청 상세 + ML 추론 + 점수 시각화 + 사람 라벨링 (승인·반려)
- `/loans/{appId}/attachments` — 첨부서류 일치성 매트릭스 (VERIFIED/PENDING/REJECTED/MISSING)

## Phase B 화면 (placeholder 만 있음)

- `/overdue` — 연체 회원 추적
- `/health` — 외부망 4종 헬스 카드
- `/observability` — Phoenix iframe (docker-compose 통합 후)

## Phase C 화면 (백엔드 라우트 신설 필요)

- `/audit` — 감사 로그 조회. 미들웨어 INSERT 는 있지만 `GET /api/admin/audit/logs` 가 없음.

## 디렉토리

```
frontend-admin/
├── app/
│   ├── (admin)/           ─ 사이드바 레이아웃 그룹 (인증 필요)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── loans/
│   │   │   ├── review-queue/page.tsx
│   │   │   ├── decisions/page.tsx
│   │   │   └── [appId]/
│   │   │       ├── page.tsx
│   │   │       └── attachments/page.tsx
│   │   ├── overdue/page.tsx        (placeholder)
│   │   ├── health/page.tsx         (placeholder)
│   │   ├── observability/page.tsx  (placeholder)
│   │   └── audit/page.tsx          (placeholder)
│   ├── login/page.tsx
│   ├── globals.css
│   ├── layout.tsx                  (AdminAuthProvider 마운트)
│   └── page.tsx                    (/dashboard 또는 /login 으로 리다이렉트)
├── components/
│   ├── ui/                         (button·card·input·badge·spinner·table)
│   └── sidebar.tsx
├── lib/
│   ├── api.ts                      (admin API 클라이언트 + 타입)
│   ├── auth.tsx                    (AdminAuthProvider · useAdminAuth)
│   └── utils.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── postcss.config.mjs
```

## 인증 흐름

1. `/login` 진입 → 사번·비번 입력
2. 백엔드 `POST /api/admin/auth/login` → JWT(role=ADMIN) 반환
3. `localStorage('admin.jwt')` 저장
4. `(admin)` 그룹의 모든 페이지 마운트 시 `GET /api/admin/auth/me` 로 검증
5. 401 응답 시 토큰 제거 + `/login` 리다이렉트
6. 로그아웃 → `POST /api/admin/auth/logout` + 토큰 제거 + `/login`

## 사이드바 메뉴 구조 (6그룹)

```
🏠 대시보드
💼 대출
  ├ 검토 큐
  └ AI 의사결정
👥 회원 관리
  └ 연체 추적
🌐 외부망 헬스
🔬 AI 관측 (Phoenix)
📜 감사 로그
─────────────
👤 ADMIN001 박관리
   여신정책팀
[→] 로그아웃
```