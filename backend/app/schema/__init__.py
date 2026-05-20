"""API I/O Pydantic 스키마 — 화면 ↔ 핸들러 계약 계층.

도메인별 모듈:
- common        : 공통 응답/페이지네이션/에러
- auth          : 인증·가입 (AU-*)
- account       : 계좌 (AC-*)
- product       : 상품 카탈로그·개설 (OP-*)
- transfer      : 이체·자동이체 (TR-*)
- loan          : 대출 (LN-*)
- notification  : 알림 (HM-004)
- asset         : 자산분석 RAG (AS-*)
- chatbot       : 챗봇 3-tier RAG (CB-*)

핸들러는 Request 모델을 dep 으로 받고 Response 모델을 반환.
필드 이름은 camelCase 가 아닌 snake_case (FastAPI 가 alias 처리 가능하지만 단순화).
DB 식별자(account_no/loan_contract_no/transaction_id 등)는 토큰화되어 \\*_token 으로 노출.
"""