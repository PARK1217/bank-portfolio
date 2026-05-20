"""에러 코드 상수.

가이드라인 §3.2 — 41_에러코드 시트의 코드를 일관되게 사용한다.
시트(`명세서_v53_통합.xlsx`, gitignore)를 확정한 뒤 도메인 작업 시 동기화 필요.
부족한 코드를 임의로 만들지 말고 시트에 추가 후 가져올 것.

정책 메모:
- §3.6 본인 외 자원 접근은 403이 아닌 404(E_NOT_FOUND)로 응답한다.
"""

# 인프라 / 시스템
E_INTERNAL_ERROR = "E_INTERNAL_ERROR"            # 500
E_VALIDATION = "E_VALIDATION"                    # 422 (Pydantic 자동 검증 외)
E_EXTERNAL = "E_EXTERNAL"                        # 502 (LLM / 마이데이터 / 결제망)

# 인증
E_UNAUTHORIZED = "E_UNAUTHORIZED"                # 401

# 공통 비즈니스
E_NOT_FOUND = "E_NOT_FOUND"                      # 404 (본인 외 자원 접근 포함)
E_IDEMPOTENCY_CONFLICT = "E_IDEMPOTENCY_CONFLICT"  # 409

# 이체 도메인
E_BALANCE_INSUFFICIENT = "E_BALANCE_INSUFFICIENT"  # 422
E_BOK_WIRE_CLOSED = "E_BOK_WIRE_CLOSED"            # 422