# 로컬 시연 점검 가이드

로컬에서 이 프로젝트를 직접 띄워 시연·데모해 보기 전에 실행 환경이
일관된 상태인지 확인하기 위한 점검 가이드입니다.
README 의 "3분 시연 시나리오" 가 화면 흐름을 보여 주는 가이드라면,
이 문서는 그 시연을 안정적으로 재현하기 위해 컨테이너·시드·트레이스가
같은 시점에 정합한지 점검하는 운영 절차에 가깝습니다.

---

## 환경 점검 (5분)

장기간 띄워 두면 검증 거래·재가입 데이터가 누적되어 시드 row 수와
화면 카운트가 어긋날 수 있습니다. 시연 직전에는 아래 순서로 한 번 훑어
보고, 어긋나면 `docker compose down -v && up -d` 로 초기 상태로
되돌릴 수 있습니다.

```bash
# 1. 컨테이너 상태 — 5개 다 running 인가?
docker compose ps
# postgres / backend / frontend / kafka / phoenix 모두 'Up' 이어야 함

# 2. 백엔드 health
curl http://localhost:8001/health
# {"status":"ok"} 가 돌아오면 OK

# 3. 시드 정합 — 박철수(100001) 의 계좌 row 수가 시드 기준과 같은가?
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT count(*) FROM public.\"ACCOUNT\" WHERE \"CUSTOMER_NO\"=100001;"
# 시드 기준 3 (주거래·정기예금·정기적금). 14+ 라면 검증 누적 — reset 권장:
#   docker compose down -v && docker compose up -d

# 4. OTP 등록 상태 — 박철수는 시드에서 OTP 미등록 (송금 시 등록 흐름 의도)
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT \"CUSTOMER_NO\",\"SIMPLE_PIN\" IS NOT NULL AS pin_set FROM public.\"CUSTOMER\" WHERE \"CUSTOMER_NO\"=100001;"

# 5. FDS 의심거래 시드 — PENDING 2건이 있어야 의심거래 화면이 비어 보이지 않음
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT count(*) FROM public.\"FDS_DETECTION\" WHERE \"CUSTOMER_NO\"=100001 AND \"DECISION_CD\"='PENDING';"

# 6. Phoenix 트레이스 적재 확인 — 챗봇 한 번 호출하면 새 trace 가 보여야 함
curl -s http://localhost:6006/api/v1/traces?project=banking-rag | python -c "import sys,json; print(len(json.load(sys.stdin)))"
```

화면에서도 한 번 더 클릭으로 확인:

- [ ] http://localhost:3001/login — 박철수 로그인 → 대시보드 정상 (총자산·미읽음 알림·이번 달 ±)
- [ ] http://localhost:3001/security/fds-alerts — FDS PENDING 2건 노출
- [ ] http://localhost:5001/login — ADMIN001 로그인 → /loans/review-queue 김미선·김영희 2건 노출
- [ ] http://localhost:6006/projects — banking-rag 프로젝트 보임

---

## 시연 동선과 의도

각 단계를 어떤 어필 포인트와 연결하기 위해 그 순서로 배치했는지 정리한 표입니다.
README 의 "3분 시연 시나리오" 가 "무엇을 본다" 라면, 이 표는 "왜 이 순서인가" 의 의도입니다.

| 단계 | 화면 | 어필 포인트 |
|---|---|---|
| 1 | /login → /dashboard | 총자산·이번 달 ±·미읽음 알림·대출 일정 한눈 |
| 2 | /products → 상품 상세 → 약관 동의 → /open-saving | 약관 모달 강제 노출 + 가입 트랜잭션 1회 |
| 3 | /transfer → 받는 분 verify → 100원 송금 | INTRA atomic / KFTC Saga 보상 |
| 4 | /security/fds-alerts | 룰+ML+LLM 분류, 한국어 설명, 본인 확인·신고 |
| 5 | /chatbot → "드론 배달 통장 같은 거 있어요?" | 환각 방지 3단계 안전망 + Phoenix 추적 |
| 6 | http://localhost:5001/login → /loans/review-queue | 회색지대 자동 큐 + 사람+AI 협업 |
| 7 | http://localhost:5001/loans/{appId}/attachments | 첨부 검토(승인/반려) + 파일 미리보기 |
| 8 | http://localhost:5001/ai-assist → "보이스피싱 신고 절차" | 직원 SOP 챗봇 — RBAC 분리로 일반 고객에 미노출 |
| 9 | http://localhost:6006/projects/banking-rag | 챗봇 호출 토큰·지연 추적 |
