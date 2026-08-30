import httpx

from app.config import get_settings
from app.services.crypto import hmac_sha256, verify_hmac


class RazorpayError(RuntimeError):
    pass


def validate_order_amount(amount_inr: float | int) -> int:
    amount = float(amount_inr)
    paise_amount = int(round(amount * 100))
    if paise_amount < 100:
        raise ValueError("Amount must be at least 100 paise")
    return paise_amount


def paise(amount_inr: float) -> int:
    return validate_order_amount(amount_inr)


def razorpay_enabled() -> bool:
    settings = get_settings()
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


def create_order(amount_inr: float, receipt: str, notes: dict) -> dict:
    settings = get_settings()
    payload = {
        "amount": paise(amount_inr),
        "currency": "INR",
        "receipt": receipt[:40],
        "notes": notes,
        "payment_capture": 1,
    }
    try:
        response = httpx.post(
            "https://api.razorpay.com/v1/orders",
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            json=payload,
            timeout=20.0,
        )
    except httpx.HTTPError as exc:
        raise RazorpayError("Could not reach Razorpay") from exc
    if response.status_code >= 400:
        raise RazorpayError(response.text[:300] or "Razorpay order failed")
    return response.json()


def verify_checkout(order_id: str, payment_id: str, signature: str) -> bool:
    settings = get_settings()
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac_sha256(settings.razorpay_key_secret, message)
    return verify_hmac(settings.razorpay_key_secret, message, signature) or expected == (signature or "").lower()


def webhook_secret() -> str:
    settings = get_settings()
    return settings.payment_webhook_secret or settings.razorpay_key_secret
