import hashlib
import hmac


def build_signature(secret: str, order_id: str, payment_id: str) -> str:
    payload = f"{order_id}|{payment_id}"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_signature(secret: str, payload: str, signature: str) -> bool:
    expected = build_signature(secret, payload.split("|", 1)[0], payload.split("|", 1)[1]) if "|" in payload else hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    provided = (signature or "").strip().lower()
    return hmac.compare_digest(expected, provided)
