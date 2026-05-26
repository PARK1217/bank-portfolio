# 시연 운영 노트

발표·시연 직전 본인이 확인하는 운영용 체크리스트입니다. README 의 "3분 시연 시나리오" 와는 대상이 다릅니다:
README 는 외부 리뷰어용 가이드, 이 문서는 발표자용 점검표.

---

## 시연 직전 체크리스트 (5분)

발표 자리에서 데이터가 어긋나거나 컨테이너가 꺼져 있어 빈 화면을 보이는
사고를 피하려면, 시작 직전 아래 순서로 점검합니다.

```bash
# 1. 컨테이너 상태 — 5개 다 running 인가?
docker compose ps
# postgres / backend / frontend / kafka / phoenix 모두 'Up' 이어야 함

# 2. 백엔드 health
curl http://localhost:8001/health
# {"status":"ok"} 가 돌아오면 OK

# 3. 박철수 시드 정합 — 누적 검증 데이터로 시연 row 수가 어긋났다면 reset
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT count(*) FROM public.\"ACCOUNT\" WHERE \"CUSTOMER_NO\"=100001;"
# 시드 기준 3 (주거래·정기예금·정기적금). 14+ 라면 검증 누적 — reset 권장:
#   docker compose down -v && docker compose up -d

# 4. OTP 등록 상태 — 박철수는 시드에서 OTP 미등록 (시연 흐름 의도)
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT \"CUSTOMER_NO\",\"SIMPLE_PIN\" IS NOT NULL AS pin_set FROM public.\"CUSTOMER\" WHERE \"CUSTOMER_NO\"=100001;"

# 5. FDS 의심거래 시드 — PENDING 2건이 노출돼야 의심거래 시연 가능
docker compose exec postgres psql -U bank -d bank -c \
  "SELECT count(*) FROM public.\"FDS_DETECTION\" WHERE \"CUSTOMER_NO\"=100001 AND \"DECISION_CD\"='PENDING';"

# 6. Phoenix 트레이스 적재 확인 — 챗봇 시연 직후 새 trace 가 보여야 함
curl -s http://localhost:6006/api/v1/traces?project=banking-rag | python -c "import sys,json; print(len(json.load(sys.stdin)))"
```

시연 직전에 한 번 더 클릭으로 확인:

- [ ] http://localhost:3001/login — 박철수 로그인 → 대시보드 정상 (총자산·미읽음 알림·이번 달 ±)
- [ ] http://localhost:3001/security/fds-alerts — FDS PENDING 2건 노출
- [ ] http://localhost:5001/login — ADMIN001 로그인 → /loans/review-queue 김미선·김영희 2건 노출
- [ ] http://localhost:6006/projects — banking-rag 프로젝트 보임

---

## 시연 동선 의도

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
