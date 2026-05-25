# 다온뱅크 (Da-On Bank)

은행 서비스에서 흔히 보는 화면들을 한 번씩은 다 만들어 본, 풀스택 포트폴리오 프로젝트입니다.
계좌 이체, 자동이체, 대출 신청, 적금 가입, 의심거래 신고, 챗봇 상담, 그리고 직원이 쓰는 관리자 화면까지 한 묶음으로 동작합니다.

기술 스택: FastAPI · Next.js 14 · PostgreSQL 16 · Kafka · Phoenix · XGBoost · scikit-learn · LLM(Groq/Mistral)

---

## 이거 뭐 보여주려고 만든 거예요?

세 가지를 신경 써서 만들었습니다.

**1. 은행 업무 흐름을 제대로 따라가는 것**

이체 하나만 봐도 같은 은행 안에서 보내는 경우, 다른 은행으로 보내는 경우(금융결제원 경유),
1억 이상의 거액 송금(한국은행 거액결제망 경유) 이렇게 세 갈래로 갈리는데, 그걸 다 분기해서 처리합니다.
자동이체는 백그라운드에서 1분마다 도래분을 찾아 자동 실행되며, 같은 회차가 두 번 빠지지 않도록 잠금 키를 둡니다.
대출은 "한도 조회 → 신청 → 약정 → 실행 → 매달 상환" 이 끝까지 이어지고, 공동명의 통장이나
미성년 자녀 명의 통장은 누가 무슨 권한을 갖는지(조회·출금·이체·해지)까지 별도 테이블로 관리합니다.

**2. 챗봇·ML 이 단순 데모로 끝나지 않게 하는 것**

챗봇은 자주 묻는 질문이 먼저 매칭되도록 하고, 안 맞으면 키워드, 그래도 안 맞으면 본문 임베딩으로 찾아갑니다.
세 단계 다 신뢰도가 낮으면 솔직하게 "잘 모르겠다"고 답해 엉뚱한 말을 만들어내지 않도록 막았습니다.
대출 자동 승인은 XGBoost 로 0~1 점수를 매기는데, 0.85 이상은 자동 승인, 0.30 이하는 자동 거절,
**그 사이 회색지대는 사람 직원이 검토하는 큐로 떨어집니다.** 사람과 AI 가 협업하는 흐름을 직접 시연할 수 있습니다.

의심거래(FDS)도 단순 시드 카드가 아닙니다. 거래가 발생하면 Kafka 로 흘러가서 **룰 8개 + IsolationForest 이상 탐지 + LLM 자연어 설명**
이 한 파이프라인으로 돌아가고, 점수가 임계치를 넘으면 알림 카드가 자동으로 뜨면서 "왜 의심됐는지" 한국어로 설명까지 같이 노출됩니다.

**3. 동작이 보이게 만드는 것**

LLM 호출이 얼마나 걸렸는지, 어떤 답변을 어떤 자료를 보고 만들었는지, 토큰을 얼마나 썼는지를
Phoenix(Arize) UI 에서 바로 볼 수 있게 자동 추적을 붙였습니다. 관리자 화면의 모든 API 호출은
감사 로그 테이블에 자동 적재되고, 누가 언제 무엇을 조회했는지가 기록됩니다.

---

## 한 번 따라가 보고 싶으면 (3분 시연)

```
1) http://localhost:3001/login
   박철수(park@daon.example / demo1234)로 로그인
   → 대시보드, 보유 계좌 3개, 잔액 약 1,800만 원

2) 상품 카탈로그에서 "자유적립식 적금" 선택 → 약관 동의
   → 매달 10만 원 / 12개월 / 매월 15일 자동이체로 등록
   → 가입 완료 후 자동이체 목록에 새 항목이 들어가 있음

3) 즉시 이체 화면 → 받을 계좌 입력 → 예금주 자동 표시 → 100원 송금
   → 백그라운드에서 정산 메시지가 처리되어 거래 내역에 반영

4) 챗봇 화면에서 "드론 배달 통장 같은 거 있어요?" 라고 물어보기
   → 자료에 없는 질문이라 정중히 거절 + 6006 포트의 Phoenix UI 에 호출 흔적 남음

5) 의심거래 화면 → 자동 탐지된 알림 카드에서 LLM 한국어 설명 확인
   → "본인 거래 확인" 클릭 시 카드가 "확인됨" 으로 바뀌고 알림 목록에 반영
   → 카드에 발동된 룰 칩 4종 + ML 이상도 % 표시
─────────────────────────────────────────
6) http://localhost:5001/login   (관리자 콘솔)
   사번 ADMIN001 / 비번 admin1234
   → "대출 검토 큐" 에 김미선(점수 0.45) 신청 건 노출
   → 신청 상세에서 점수·특성 확인 → "승인" 또는 "거절" 확정
   → 감사 로그 화면에 방금 한 행동이 기록되어 있음

7) http://localhost:6006   (Phoenix)
   조금 전 챗봇 호출의 추적 정보 — 토큰 사용량, 응답 시간 확인
```

---

## 실행

도커가 설치돼 있다는 전제로, 한 번에 다 띄울 수 있습니다.

```bash
# 1) 백엔드 묶음 (DB · API 서버 · 메시지 큐 · 관측 UI)
docker compose up -d --build

# 2) 일반 사용자 화면
cd frontend && npm install && npm run dev          # http://localhost:3001

# 3) 직원/관리자 화면
cd frontend-admin && npm install && npm run dev    # http://localhost:5001
```

| 접속처 | URL | 메모 |
|---|---|---|
| 사용자 화면 | http://localhost:3001 | 일반 고객용 |
| 관리자 화면 | http://localhost:5001 | 직원·심사용 |
| API 문서 | http://localhost:8001/docs | FastAPI 가 자동으로 만들어 주는 OpenAPI 문서 |
| Phoenix | http://localhost:6006 | 챗봇/LLM 호출 추적 화면 |
| 데이터베이스 | localhost:5434 | 계정: `bank / bank1234 / bank` |

### 시연용 계정

| 누구 | 이메일 또는 사번 | 비밀번호 | 어떤 시나리오? |
|---|---|---|---|
| 박철수 | `park@daon.example` | `demo1234` | 주거래 고객 — 계좌·대출·자동이체 다 있음 |
| 김영희 | `kim.yh@daon.example` | `demo1234` | 박철수 배우자 (공동명의 시연용) |
| 김연체 | `kim.over@daon.example` | `demo1234` | 30일 넘게 연체 중 (관리자 추적용) |
| 김미선 | `kim.ms@daon.example` | `demo1234` | 마이너스 통장 + 신용대출 (검토 큐에 잡힘) |
| 회귀용 | `test@example.com` | `testpass123!` | 회귀 검증 기본 계정 |
| 관리자 | `ADMIN001` (사번) | `admin1234` | 관리자 콘솔용 |

---

## 어떻게 생긴 시스템인가요?

```
            ┌────────────────────────────────────────┐
            │   브라우저 (고객용 / 관리자용)             │
            └─────────────┬─────────────┬────────────┘
                          │ 3001        │ 5001
            ┌─────────────▼──┐    ┌─────▼─────────────┐
            │  frontend      │    │  frontend-admin    │
            │  (Next.js)     │    │  (Next.js)         │
            └─────────┬──────┘    └─────────┬──────────┘
                      │ /api/*              │ /api/admin/*
                      └─────────┬───────────┘
                                ▼
                ┌──────────────────────────────────┐
                │   backend (FastAPI, 8001 포트)    │
                │   - 요청 ID/감사 로그 자동 적재 │
                │   - 개인정보 자동 마스킹         │
                │   - 25개+ 도메인 라우터          │
                │   - 백그라운드 작업 3종           │
                │      · 자동이체 실행 (1분 주기)  │
                │      · 외부망 상태 체크          │
                │      · Kafka 이벤트 처리         │
                └────┬──────────┬──────────┬───────┘
                     ▼          ▼          ▼
              ┌──────────┐ ┌─────────┐ ┌──────────┐
              │PostgreSQL│ │  Kafka  │ │ Phoenix  │
              │ (100+ 표) │ │  메시지큐 │ │  관측 UI  │
              └──────────┘ └─────────┘ └──────────┘
```

---

## 이체는 어떻게 처리되나요?

당행이체는 DB 한 트랜잭션 안에서 즉시 처리(ACID) 하고, 타행이체는 출금만 즉시 끝낸 뒤 Kafka 토픽에 "정산 요청" 메시지를 던져 백그라운드 컨슈머가 외부 결제망(KFTC) 호출을 흉내내며 입금까지 마무리합니다.

실패하면 Saga 보상 트랜잭션(역분개) 로 출금액을 자동 복원하고, 중복 요청은 멱등성 키 UNIQUE 제약으로 차단, Kafka 가 죽어도 같은 핸들러를 asyncio 태스크로 in-process fallback 실행해서 절대 끊기지 않습니다.

결과: 사용자 체감은 항상 100ms 이내, 시스템은 외부 결제망 장애로부터 격리 — 실제 한국 은행이 쓰는 event-driven 분산 트랜잭션 모델입니다.

---

## 대출 자동 심사는 어떻게 분류하나요?

신청이 들어오면 우리 DB 에서 6개 피처를 즉시 집계해 XGBoost 모델에 넣고 **0~1 사이 점수**를 받습니다. 점수 구간에 따라 세 갈래로 자동 분류:

| 점수 | 결정 | 설명 |
|---|---|---|
| **≥ 0.85** | `AUTO_APPROVE` | 신용·소득 우량 → 즉시 승인 |
| **≤ 0.30** | `AUTO_REJECT` | 연체·소득 부족 → 즉시 거절 |
| **0.30 ~ 0.85** | `HUMAN_REVIEW` | 회색지대 → 관리자 검토 큐로 |

### 점수에 들어가는 6개 피처

| 피처 | 출처 | 의미 |
|---|---|---|
| `credit_score` | `CUST_GRADE_CD` + 연체이력·연봉 기반 룰 (300~950) | 신용점수 |
| `overdue_days_24m` | `LOAN_REPAY_HISTORY.OVERDUE_DAYS` 24개월 누적 | 누적 연체일수 |
| `overdue_ratio` | `OVERDUE` 회차 / 전체 회차 | 연체 비율 (0~1) |
| `deposit_balance` | `ACCOUNT.BALANCE` 양수 합계 | 보유 예금 |
| `annual_income` | `INDIVIDUAL_PARTY.ANNUAL_INCOME` | 연소득 |
| `request_ratio` | 신청금액 / (신용점수 × 10만) | 권장한도 대비 신청 비율 |

### 학습 데이터

**UCI German Credit (1,000행)** 의 신용 등급·저축·고용 정보를 한국 은행 피처로 매핑해 베이스로 쓰고, **합성 데이터 9,000행** 을 추가해 한국 시장 분포(연봉·예금 잔액 KRW 단위)에 맞춥니다. XGBoost 와 Logistic Regression 두 모델을 학습시켜 AUC 가 더 높은 XGBoost(`loan_xgb_v1.joblib`)를 운영에 사용. 모든 추론 결과는 `AI_LOAN_DECISION` 테이블에 영구 저장되어 감사·재현 가능합니다.

### 모델·임계값 운영 노트

- **학습 스크립트**: `backend/app/scripts/train_loan_model.py` — UCI German Credit + 합성 9,000행 → 8:2 stratified split.
- **XGBoost 파라미터**: `n_estimators=200, max_depth=5, learning_rate=0.1, eval_metric="logloss", random_state=42`.
- **Logistic Regression** 는 `class_weight="balanced"` + `StandardScaler` 파이프라인으로 비교용 학습 후 폐기.
- **임계값 결정 근거**: 0.85/0.30 은 시드+페르소나 9명 sanity set 에서 자동 승인 우량 비율 ≈ 35%, 자동 거절 ≈ 20%, 회색지대 ≈ 45% 가 되도록 조정. 회색지대를 일부러 넓게 잡아 사람 검토 데모 비중 확보.
- **추론 폴백**: `_load_model` 이 joblib 로드 실패하면 BusinessError(`E_INTERNAL_ERROR`) 로 즉시 알람 — 임의 점수로 자동 승인되는 사고 방지.
- **재추론 가드**: 같은 application 에 미검토 HUMAN_REVIEW row 가 있으면 재추론하지 않고 기존 row 를 그대로 반환(`meta.reused=True`) — 관리자 큐에서 점수가 흔들리지 않도록.

### 사람이 검토하는 회색지대 — Phase 6 §9.2.6 핵심 어필

자동 승인·거절은 빠르지만 모호한 신청을 무리하게 분류하지 않습니다. 점수가 0.30~0.85 구간이면 **관리자 콘솔의 "검토 큐" 로 자동 이관**되고, 직원이 ML 입력 피처 + 첨부서류 일치성을 함께 보면서 최종 승인·반려를 결정합니다. **"AI 가 자신 있을 때만 자동, 나머지는 사람"** 이라는 사람+AI 협업 모델을 그대로 구현했습니다.

---

## 의심거래는 어떻게 자동 분류되나요?

대출 점수 모델과는 다른 결을 가진 **하이브리드 분류기** 입니다 — **룰(전문가 지식)** · **ML(IsolationForest 이상 탐지)** · **LLM(자연어 설명)** 셋이 한 파이프라인을 이룹니다.

```
[고객 이체 발생] → TRANSACTION INSERT
       ↓ Kafka topic: fds.transaction.detected
       ↓
[Consumer: handle_fds_evaluation]
   ① 룰 평가 (8개)        → rule_score [0~145] + fired 리스트
   ② IsolationForest    → ml_anomaly [0~1] → ml_score = round(ml_anomaly × 40)
   ③ total_score = round(rule_score × 0.6 + ml_score)
   ④ total ≥ 60: LLM 자연어 설명 → FDS_DETECTION INSERT + 알림
      total < 60: AI_FDS_DECISION 만 적재(감사 추적)
```

### 판정 임계값 — `service/fds_pipeline.py:THRESHOLD`

총점은 0 ~ 약 127 범위. 60 이상이 알람·관리자 큐 진입 대상이고, 60 이상에서 다시 3 단계로 갈립니다.

| 총점 | judgment | 화면 표시 |
|---|---|---|
| **< 60** | (감사용 row 만 적재) | 카드 미노출 |
| **60 ~ 74** | `REVIEW` | "검토 필요" |
| **75 ~ 89** | `WARN` | "경고" |
| **≥ 90** | `ALARM` | "즉시 차단 권고" |

### 룰 8개 — 도메인 전문가 규칙

| 룰 코드 | 트리거 조건 | 점수 |
|---|---|---|
| `R_NIGHT` | 거래 시각 00~05시 | 15 |
| `R_AMOUNT_ZSCORE` | 본인 30일 평균 + 3σ 초과 | 25 |
| `R_NEW_COUNTERPART` | 90일 거래 없던 신규 수취인 | 15 |
| `R_BURST` | 10분 안 동일 계좌 출금 3건 이상 | 20 |
| `R_FOREIGN_IP` | 해외 IP (ACCESS_COUNTRY ≠ KR) | 25 |
| `R_DAILY_LIMIT_NEAR` | 일일 누적 ≥ DAILY_WITHDRAW_LIMIT × 0.9 | 10 |
| `R_NEW_DEVICE` | `CUSTOMER_DEVICE` 미등록 디바이스 | 20 |
| `R_LARGE_INTERBANK` | 타행 + 1천만원 이상 | 15 |

### ML 모델 — IsolationForest (sklearn)

라벨 없이 정상 거래 분포만으로 학습하는 unsupervised anomaly detection. 부팅 시점에 `service/fds_anomaly.py:ensure_model()` 이 시드+검증 누적 거래 1,000건으로 fit → `/app/data/fds_isoforest.pkl` 캐시 → 추론은 1ms.

**파라미터**: `IsolationForest(contamination=0.10, n_estimators=100, random_state=42)` — 정상 90% 가정, 트리 100개. 학습 row 가 30건 미만이면 학습 스킵하고 추론 시 중립값 0.5 반환(폴백).

**7개 피처** (`_FEATURE_ORDER`):

| 피처 | 의미 |
|---|---|
| `log_amount` | log(거래 금액) — 큰 금액 비선형 정규화 |
| `hour_of_day` | 시각 (0~23) |
| `day_of_week` | 요일 (0~6) |
| `is_interbank` | 타행 여부 (0/1) |
| `counterpart_freq` | 본인이 지난 90일간 이 상대 계좌로 보낸 횟수 |
| `amount_zscore_personal` | 본인 30일 평균 대비 z-score |
| `daily_cum_amount_log` | log(오늘 누적 출금액) |

raw `decision_function` 결과(약 -0.5 ~ +0.5) 를 `[0, 1]` 로 정규화 — 1에 가까울수록 이상. 그 후 `× 40` 으로 ml_score 환산 (룰 60% + ML 40% 가중치 의도).

### LLM — 자연어 설명 생성

룰·ML 점수를 그대로 보여주면 "왜?" 가 이해가 안 됩니다. `service/fds_llm_explain.py` 가 거래 컨텍스트(고객명·평소 평균·이번 금액·발동된 룰·ML 점수)를 Groq Llama 3.1 에 보내 **한국어 3~4문장** 으로 정리:

> "안녕하세요, 박철수 고객님. 다온뱅크 의심거래 분석 결과를 알려드리겠습니다. 이번 거래는 심야 시간대에 발생하여 R_NIGHT 룰이 발동되었습니다. 또한, 10분 안에 같은 계좌에서 3건 이상의 출금이 발생하여 R_BURST 룰이 발동되었습니다. 해외 IP 접속과 미등록 디바이스 사용으로 R_FOREIGN_IP 와 R_NEW_DEVICE 룰이 함께 발동됐어요. 본인 거래가 아니라면 즉시 신고해주세요."

LLM 호출이 실패해도 룰 desc 슬래시 결합으로 fallback — 서비스 끊김 없음.

### 어디에 영구화?

`AI_FDS_DECISION` 테이블에 룰·ML·LLM 점수 근거를 영구 저장. `FDS_DETECTION` 과 1:1 매핑 + `LLM_CALL_ID` 컬럼이 `AI_LLM_CALL_LOG` 와 링크되어 Phoenix trace 까지 추적 가능. 감사·재현·재학습 데이터 베이스로 그대로 사용 가능.

### 어필 포인트

> - **"룰의 정확성 + ML 의 일반화 + LLM 의 설명력"** — 한 모델 단점을 다른 둘이 보완
> - **"심야 1시 신규 수취인 거액 이체 → 카드 자동 등장 + 한국어 설명"** — 발표 1분 시연
> - **"FDS_DETECTION 시드 카드 3장 → 실시간 자동 누적"** — 운영 도메인 완성도

---

## 챗봇은 어떻게 답변하나요?

사용자 질문이 들어오면 한국어 임베딩 모델(**`jhgan/ko-sroberta-multitask`**)로 768차원 벡터로 변환한 뒤, pgvector 의 `<=>` 코사인 거리로 사전에 임베딩된 FAQ·약관 코퍼스와 비교해 **신뢰도에 따라 3단계로 분기**합니다. 답변 못 만들면 솔직하게 "확인되지 않습니다" 라고 거절 — **환각(hallucination) 방지가 최우선**입니다.

| Tier | 매칭 조건 | 처리 방식 | confidence |
|---|---|---|---|
| **1. KEYWORD** | FAQ 거리 ≤ 0.30 | FAQ 답변 그대로 반환 (LLM 미호출) | HIGH |
| **2. FAQ** | FAQ 거리 ≤ 0.50 | FAQ 답변 그대로 반환 (LLM 미호출) | MEDIUM |
| **3. VECTOR** | 약관 거리 ≤ 0.70 | 약관 본문 발췌 → **LLM 으로 답변 합성** + 출처 표시 | MEDIUM / LOW |
| **거절** | 모두 초과 | "관련 정보를 찾지 못했습니다" 솔직 안내 | LOW |

### 환각 방지 — 3단계 안전망

1. **거리 임계값 게이팅**: 약관 거리가 0.85 초과면 LLM 호출 자체를 안 함
2. **시스템 프롬프트 강제**: "**아래 약관/규정 발췌만을 근거로** 답변하세요. 발췌에 없는 내용은 추측하지 말고 '약관에서 확인되지 않습니다' 라고 답하세요"
3. **출처 표시**: VECTOR Tier 답변은 항상 참조한 약관 청크(출처)를 사용자에게 함께 노출 — 클릭하면 원문 확인 가능

### LLM 호출은 외부 API 멀티 폴백

`Groq Llama 3.1-8B-Instant` 를 1순위로 쓰고, 키 없으면 자동으로 `Mistral` → `HuggingFace` 순으로 fallback. 어느 키도 없으면 LLM 합성을 스킵하고 약관 발췌만 그대로 보여줍니다 (서비스 절대 안 끊김).

### 모든 호출은 자동 추적 → Phoenix

`service/llm.py` 가 LLM 호출할 때마다 **Kafka 토픽 2개**에 메시지를 던집니다:
- `chatbot.llm.calls` → `AI_LLM_CALL_LOG` (모델명, 토큰 수, 지연 시간)
- `chatbot.rag.evaluations` → `AI_RAG_EVALUATION` (질문·검색 문서·답변, 향후 Faithfulness 점수)

동시에 `OpenTelemetry` 자동 계측으로 **Arize Phoenix UI** 에 trace 가 실시간 적재되어 관리자가 한 화면에서 모니터링 가능합니다 (Total Traces · Latency P50 · Token 누적).

---

## 관리자 콘솔은 어떻게 동작하나요?

고객용 화면(`frontend`, 포트 3001)과 **완전히 분리된 별도 Next.js 프로젝트(`frontend-admin`, 포트 5001)** 입니다. 백엔드도 라우터 prefix 를 `/api/admin/*` 로 격리하고 직원 계정 인증을 별도로 운영합니다 — 일반 고객 JWT 로는 절대 진입 못 합니다.

### 1. 인증 — 직원 계정 전용

```
EMPLOYEE_MASTER (직원 마스터)
   └─ EMPLOYEE_NO + bcrypt 해시 비번 + AUTH_LEVEL_CD (ADMIN / AUDIT)
        ↓ 로그인
ADMIN_SESSION (세션 이력)
   └─ SESSION_ID, LOGIN_DATETIME, LAST_ACTIVITY_DT, SESSION_STATUS_CD
        ↓ JWT 발급 (role=ADMIN, employee_no, session_id 클레임)
require_admin Depends 가드
   - JWT 디코드 검증
   - ADMIN_SESSION.STATUS=ACTIVE 확인
   - LAST_ACTIVITY_DT + INQUIRY_COUNT 자동 갱신
```

권한 등급:
- **`ADMIN`** (박관리, ADMIN001) — 전권 (대출 승인·반려, 회원 조회)
- **`AUDIT`** (김감사, AUDIT001) — 감사 — 조회만 가능

### 2. 모든 호출 자동 감사 — `AdminAuditMiddleware`

`/api/admin/*` 로 들어오는 **모든 요청은 응답 후 `ADMIN_AUDIT_LOG` 테이블에 자동 INSERT** 됩니다 (사용자 코드 한 줄도 추가 안 필요).

| 컬럼 | 내용 |
|---|---|
| EMPLOYEE_NO | 누가 (미인증이면 `UNKNOWN`) |
| ACTION_CD | 무엇을 (`LOAN_PREDICT`, `OVERDUE_DETAIL` 등 매핑) |
| TARGET_TABLE / TARGET_ID | 어떤 자원에 (`LOAN_APPLICATION:20002`) |
| RESULT_CD | OK / DENIED / ERROR |
| ACCESS_IP / USER_AGENT | 접속 경로 |
| REQUEST_PAYLOAD | 민감 키 자동 마스킹된 본문 |
| TIMESTAMP | 언제 |

**미인증 호출도 적재** — 위조 토큰·만료 세션 시도까지 감사 흔적 남깁니다.

### 3. 9 화면 — 사람+AI 협업 콘솔

| 화면 | 핵심 동작 |
|---|---|
| **대시보드** | 검토 대기 / 자동 승인 / 연체 회원 / 외부망 정상 / Phoenix 카운터 한 화면 |
| **대출 검토 큐** | ML 점수 0.30~0.85 회색지대 신청 목록 (HUMAN_REVIEW) |
| **AI 의사결정 이력** | 전체 추론 결과 + 자동 승인·거절·검토 분포 |
| **신청 상세** | 6개 ML 입력 피처 + 점수 + 사람 라벨링(승인/반려/메모) |
| **첨부서류 일치성** | 요구 서류(`DOC_REQUIREMENT`) vs 제출(`ATTACHED_DOC`) 매트릭스 — 누락·미검증 빨강 |
| **연체 추적** | `LOAN_REPAY_HISTORY.OVERDUE` 회차 집계 + 회원별 상세 + 가산금리 |
| **외부망 헬스** | KFTC / BOK-Wire / 마이데이터 / NICE / KCB 5종 — 워커가 60초마다 ping → `EXTERNAL_API_HEALTH` 적재 |
| **AI 관측 (Phoenix)** | Phoenix UI 를 iframe 으로 임베드 — 한 화면에서 LLM 트레이스·토큰·지연 모니터링 |
| **감사 로그** | `ADMIN_AUDIT_LOG` 조회 — 누가 언제 무엇을 했는지 시계열 |

### 4. 핵심 어필 포인트 — "한 콘솔에서 동시 감독"

> 가이드 §9.5 의 발표 포인트 그대로 구현했습니다:
>
> - **"AI 자동 승인 30% + 사람 검토 70%"** — 사람·AI 협업 모델
> - **"Faithfulness 0.85 미만 답변은 자동 보류"** — RAG 품질 게이팅 (Phase B/C)
> - **"첨부서류 누락 자동 감지"** — `DOC_REQUIREMENT` vs `ATTACHED_DOC` 차집합 시각화
> - **"한 화면에서 LLM 품질 + 외부망 헬스 + 연체 큐 동시 감독"** — 운영 콘솔 일관성

---

## 어떤 화면들이 있나요?

| 영역 | 화면 수 | 핵심 내용 |
|---|---|---|
| 로그인 / 가입 / 보안 | 12 | 비밀번호 / 간편 비밀번호 / 일회용 비밀번호 / 생체 / 디바이스 등록 / 세션 자동 갱신 |
| 계좌 | 8 | 잔액 / 거래 내역 / 계좌 설정 / 한도 변경(7일 점검 기간 적용) |
| 이체 | 8 | 즉시 이체 / 자동이체 / 1회 예약 / 자주 쓰는 계좌 |
| 대출 | 9 | 한도 조회 → 신청 → 약정 → 실행 → 매달 상환 |
| 상품 가입 | 11 | 카탈로그 / 약관 / 입출금·정기예금·적금·외화·공동명의·미성년 |
| 챗봇 | 5 | 자주 묻는 질문 + 키워드 + 임베딩 단계 응답 / 출처 보기 / 좋아요·싫어요 |
| 의심거래 | 2 | 자동 분류기(룰+ML+LLM) 알림 + 본인 확인·신고 |
| 자산분석 | 4 | 설문 → 분석 → 결과 → 맞춤 상품 추천 |
| 공지 / 이벤트 | 4 | 게시판 (비로그인 공개) |
| **관리자 콘솔** | 9 | 대시보드 / 검토 큐 / AI 의사결정 이력 / 신청 상세 / 첨부서류 일치성 / 연체 추적 / 외부망 상태 / Phoenix 임베드 / 감사 로그 |

---

## 기술 스택

| 분야 | 사용 기술 | 한 줄 설명 |
|---|---|---|
| 프런트엔드 | **Next.js 14** (App Router) | React 기반 웹 프레임워크 |
| | **React 18** · **TypeScript** | 화면 라이브러리 + 정적 타입 |
| | **Tailwind CSS** · **shadcn/ui** | 스타일링 + 재사용 UI 컴포넌트 |
| 백엔드 | **FastAPI** | 파이썬 비동기 웹 프레임워크 |
| | **asyncpg** | PostgreSQL 비동기 드라이버 |
| | **Pydantic** | 요청·응답 검증 |
| | **PyJWT** · **bcrypt** · **pyotp** | 토큰 인증 / 비밀번호 해시 / 일회용 비밀번호 |
| 데이터베이스 | **PostgreSQL 16** | 관계형 DB, JSON 컬럼 활용 |
| | 100+ 테이블 | 거래 주체를 PARTY 공통 테이블로 묶고 개인·법인 정보를 분리한 표준 패턴 |
| AI / LLM | **Groq Llama 3.1** · Mistral · HuggingFace | 응답 생성 LLM (키 없으면 자동 전환) |
| | **jhgan/ko-sroberta-multitask** | 한국어 문장 임베딩 모델 |
| 머신러닝 | **XGBoost** | 대출 자동 승인 점수 모델 |
| | **scikit-learn IsolationForest** | 의심거래 이상 탐지(unsupervised) |
| | UCI German Credit + 합성 데이터 | 학습 데이터셋 |
| 관측 | **Arize Phoenix** + **OpenTelemetry** | LLM 호출 자동 추적·시각화 |
| | **structlog** | JSON 구조화 로그 |
| | 관리자 감사 로그 | 미들웨어에서 자동 적재 |
| 메시지 큐 | **Apache Kafka 3.7** (KRaft) | 이체 정산·자동이체·LLM 호출 로그 |
| 인프라 | **Docker Compose** | 5개 컨테이너 묶음 실행 |
| 검증 | **Playwright** · **pytest** | 브라우저 자동화 + 백엔드 테스트 |

---

## 폴더 구조

```
bank-portfolio/
├── backend/                # FastAPI 서버
│   └── app/
│       ├── api/            # HTTP 라우터 (도메인별)
│       ├── service/        # 비즈니스 로직, 백그라운드 워커
│       ├── schema/         # 요청/응답 모델
│       ├── middleware/     # 요청 ID, 감사 로그, 개인정보 마스킹
│       ├── scripts/        # ML 학습 스크립트
│       └── main.py         # 진입점
├── frontend/               # 일반 사용자 화면 (3001 포트)
├── frontend-admin/         # 관리자 화면 (5001 포트)
├── db/
│   ├── 01_schema.sql                 # 라이브 DB 에서 추출한 스키마
│   ├── 02_seed.sql                   # 상품 25종 + 약관 + 매핑
│   ├── 05_persona_seed.sql           # 페르소나 5명 풀 세트
│   ├── 06_notice_event.sql           # 공지·이벤트 게시판
│   ├── 09_fds_alert_seed.sql         # 의심거래 시드
│   ├── 11_admin_auth_migration.sql   # 관리자 직원 계정
│   ├── 12_seed_999999_party.sql      # 회귀 계정 보강
│   ├── 13_doc_seed.sql               # 대출 첨부서류
│   ├── 14_human_review_seed.sql      # 검토 큐 시연 시드
│   └── 18_fds_decision.sql           # 의심거래 자동 분류기 결과(룰·ML·LLM)
└── docker-compose.yml      # 5개 서비스 + DB 초기 시드 자동 마운트
```

---

## 데이터베이스 스키마 갱신

라이브 DB 가 정답입니다. 스키마를 바꾼 다음에는 다시 뽑아 둡니다.

```bash
docker exec bank-portfolio-postgres \
  pg_dump -U bank -d bank --schema-only --no-owner --no-privileges \
  > db/01_schema.sql
```

---

## 검증

도메인별로 풀체인 e2e 가 돌아가는 것을 확인해 두었습니다.

- 상품 5종 가입(보통예금·정기예금·외화·공동명의·미성년) — 브라우저 자동화로 끝까지
- 이체 3갈래 — 같은 은행 안 / 타행 / 거액
- 자동이체 워커 — 1회·매월·매주 일정 + 같은 회차 중복 실행 방지
- 의심거래 — 거래 발생 → 자동 평가(룰+ML+LLM) → 카드 자동 등장 → 본인 확인/신고 후 알림 발행
- 관리자 인증·감사 — 세션 만료 / 잘못된 토큰 거부 / 모든 호출 자동 기록
- 챗봇 — 단계별 응답 분기 + Phoenix 에 추적 정보 적재