import hashlib
import hmac
import os
import re
import secrets
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

PDF_MAGIC = b"%PDF"
SAFE_NAME = re.compile(r"^[\w.\- ()]{1,120}\.pdf$", re.I)


def is_pdf_magic(header: bytes) -> bool:
    return header.startswith(PDF_MAGIC)


def hash_password(password: str) -> str:
    import bcrypt

    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    import bcrypt

    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def generate_otp() -> str:
    return f"{secrets.randbelow(10000):04d}"


def _pepper() -> bytes:
    return get_settings().secret_key.encode()


def hash_otp(otp: str) -> str:
    return hmac.new(_pepper(), otp.encode(), hashlib.sha256).hexdigest()


def otp_match(otp: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    return hmac.compare_digest(hash_otp(otp), stored_hash)


def hmac_sha256(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def verify_hmac(secret: str, body: bytes, signature: str) -> bool:
    expected = hmac_sha256(secret, body)
    provided = (signature or "").strip().lower()
    return hmac.compare_digest(expected, provided)


def _fernet() -> Fernet:
    digest = hashlib.sha256(_pepper()).digest()
    import base64

    return Fernet(base64.urlsafe_b64encode(digest))


def seal_otp(otp: str) -> str:
    return _fernet().encrypt(otp.encode()).decode()


def unseal_otp(token: str | None) -> str | None:
    if not token:
        return None
    if len(token) == 4 and token.isdigit():
        return None
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        return None


def sanitize_filename(name: str | None) -> str:
    raw = Path(name or "document.pdf").name
    if not SAFE_NAME.match(raw):
        return "document.pdf"
    return raw


def upload_root() -> Path:
    root = Path(get_settings().upload_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def purge_file(path: str | None) -> bool:
    if not path:
        return False
    root = upload_root()
    try:
        target = Path(path).resolve()
        target.relative_to(root)
    except (OSError, ValueError):
        return False
    try:
        if target.is_file():
            os.remove(target)
            return True
    except OSError:
        return False
    return False
