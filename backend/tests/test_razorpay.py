import hashlib
import hmac
import unittest

from app.services.razorpay import verify_signature


class RazorpaySignatureTests(unittest.TestCase):
    def test_verify_signature_matches(self):
        secret = "test_secret"
        payload = "order_test_123|pay_test_456"
        signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        self.assertTrue(verify_signature(secret, payload, signature))

    def test_verify_signature_rejects_mismatch(self):
        secret = "test_secret"
        payload = "order_test_123|pay_test_456"
        self.assertFalse(verify_signature(secret, payload, "bad_signature"))


if __name__ == "__main__":
    unittest.main()
