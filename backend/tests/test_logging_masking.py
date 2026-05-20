"""민감정보 마스킹 단위 테스트 (가이드라인 §3.1).

표준 unittest만 사용. 실행:
    cd backend && python -m unittest tests.test_logging_masking
또는 컨테이너 안에서:
    docker compose exec backend python -m unittest tests.test_logging_masking
"""

from __future__ import annotations

import os
import sys
import unittest

# backend/ 를 import 경로에 추가 — cwd가 어디든 `app.*` import가 동작하도록.
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app.logging_setup import (  # noqa: E402
    mask_account_no,
    mask_card_no,
    mask_jwt,
    mask_password,
    mask_sensitive,
    mask_ssn,
)


class MaskAccountTests(unittest.TestCase):
    def test_with_hyphens(self):
        # 뒤 2자만 노출, 나머지(하이픈 포함) 전부 * 처리
        self.assertEqual(mask_account_no("110-001-123456"), "************56")

    def test_no_hyphens(self):
        self.assertEqual(mask_account_no("11000112345678"), "************78")

    def test_short(self):
        self.assertEqual(mask_account_no("12"), "**")
        self.assertEqual(mask_account_no("1"), "*")

    def test_numeric(self):
        self.assertEqual(mask_account_no(1234567890), "********90")


class MaskSsnTests(unittest.TestCase):
    def test_guideline_format(self):
        self.assertEqual(mask_ssn("900101-1234567"), "900101-1******")

    def test_no_hyphen(self):
        self.assertEqual(mask_ssn("9001011234567"), "9001011" + "*" * 6)

    def test_short(self):
        self.assertEqual(mask_ssn("1234567"), "*******")

    def test_hyphen_but_empty_tail(self):
        self.assertEqual(mask_ssn("900101-"), "900101-")


class MaskPasswordTests(unittest.TestCase):
    def test_always_redacted(self):
        self.assertEqual(mask_password("mypw"), "***")
        self.assertEqual(mask_password(""), "***")
        self.assertEqual(mask_password(12345), "***")


class MaskJwtTests(unittest.TestCase):
    def test_long(self):
        self.assertEqual(mask_jwt("eyJhbGciOiJI"), "eyJ***")

    def test_short(self):
        self.assertEqual(mask_jwt("ab"), "***")
        self.assertEqual(mask_jwt("abc"), "***")


class MaskCardTests(unittest.TestCase):
    def test_guideline_format(self):
        self.assertEqual(mask_card_no("1234-5678-9012-3456"), "1234-****-****-3456")

    def test_no_hyphens_16(self):
        self.assertEqual(mask_card_no("1234567890123456"), "1234********3456")

    def test_short(self):
        self.assertEqual(mask_card_no("12345678"), "********")


class MaskSensitiveProcessorTests(unittest.TestCase):
    """structlog processor — event_dict 키 기반 자동 마스킹."""

    @staticmethod
    def _apply(d):
        return mask_sensitive(None, None, dict(d))

    def test_password_keynames(self):
        for k in ("password", "passwd", "pw"):
            out = self._apply({k: "mypw!"})
            self.assertEqual(out[k], "***", f"key={k}")

    def test_account_key_variants(self):
        for k in (
            "account_no",
            "account_number",
            "from_account_no",
            "to_account_no",
            "accountToken",  # 가이드 §2.3 — camelCase 식별 토큰
        ):
            out = self._apply({k: "110-001-123456"})
            self.assertEqual(out[k], "************56", f"key={k}")

    def test_ssn_key_variants(self):
        for k in ("ssn", "resident_no", "resident_number", "juminbeonho"):
            out = self._apply({k: "900101-1234567"})
            self.assertEqual(out[k], "900101-1******", f"key={k}")

    def test_jwt_key_variants(self):
        for k in ("jwt", "token", "access_token", "refresh_token", "authorization"):
            out = self._apply({k: "eyJhbGciXYZ"})
            self.assertEqual(out[k], "eyJ***", f"key={k}")

    def test_card_key_variants(self):
        for k in ("card_no", "card_number", "pan"):
            out = self._apply({k: "1234-5678-9012-3456"})
            self.assertEqual(out[k], "1234-****-****-3456", f"key={k}")

    def test_case_insensitive_keys(self):
        out = self._apply({"PASSWORD": "x", "Account_No": "110-001-123456"})
        self.assertEqual(out["PASSWORD"], "***")
        self.assertEqual(out["Account_No"], "************56")

    def test_unrelated_keys_untouched(self):
        before = {"customer_no": 100001, "amount": 5000, "status": "OK"}
        self.assertEqual(self._apply(before), before)

    def test_none_values_untouched(self):
        out = self._apply({"password": None, "account_no": None})
        self.assertIsNone(out["password"])
        self.assertIsNone(out["account_no"])

    def test_nested_dict_recursed(self):
        out = self._apply(
            {
                "extra": {
                    "password": "x",
                    "amount": 5000,
                    "card_no": "1234-5678-9012-3456",
                }
            }
        )
        self.assertEqual(out["extra"]["password"], "***")
        self.assertEqual(out["extra"]["amount"], 5000)
        self.assertEqual(out["extra"]["card_no"], "1234-****-****-3456")

    def test_list_of_dicts_recursed(self):
        out = self._apply(
            {
                "accounts": [
                    {"account_no": "110-001-123456"},
                    {"account_no": "220-002-654321"},
                ]
            }
        )
        self.assertEqual(out["accounts"][0]["account_no"], "************56")
        self.assertEqual(out["accounts"][1]["account_no"], "************21")

    def test_event_keys_preserved(self):
        before = {"event": "transfer_complete", "request_id": "abc", "password": "x"}
        out = self._apply(before)
        self.assertEqual(set(out.keys()), set(before.keys()))


if __name__ == "__main__":
    unittest.main()