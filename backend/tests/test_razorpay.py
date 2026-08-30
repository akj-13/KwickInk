import pytest

from app.services.razorpay import validate_order_amount


def test_validate_order_amount_rejects_below_minimum():
    with pytest.raises(ValueError, match="at least 100 paise"):
        validate_order_amount(0.99)


def test_validate_order_amount_accepts_minimum_amount():
    assert validate_order_amount(1.00) == 100
