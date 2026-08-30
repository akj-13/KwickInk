import hashlib
import hmac


def build_signature(secret: str, order_id: str, payment_id: str) -> str:
    payload = f"{order_id}|{payment_id}"
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_signature(secret: str, payload: str, signature: str) -> bool:
    if "|" not in payload:
        return False
    order_id, payment_id = payload.split("|", 1)
    expected = build_signature(secret, order_id, payment_id)
    provided = (signature or "").strip().lower()
    return hmac.compare_digest(expected, provided)
