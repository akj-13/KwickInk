from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "KwickInk"
    secret_key: str = "change-me-to-a-long-random-hackathon-secret"
    jwt_expire_minutes: int = 720
    database_url: str = "sqlite:///./kwickink.db"
    upload_dir: str = "./uploads"
    printer_ppm: int = 30
    eta_buffer_minutes: int = 2
    payment_webhook_secret: str = "kwickink_webhook_hmac_secret"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    trusted_hosts: str = "localhost,127.0.0.1"
    shop_open: str = "08:00"
    shop_close: str = "20:00"
    slot_minutes: int = 15
    bw_rate: float = 2.0
    color_rate: float = 8.0
    scan_rate: float = 5.0
    offpeak_discount: float = 0.20
    demo_mode: bool = True
    max_upload_bytes: int = 15 * 1024 * 1024
    otp_max_attempts: int = 5
    seed_student_password: str = "student123"
    seed_vendor_password: str = "vendor123"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def hosts(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def is_insecure_default_secret(self) -> bool:
        return self.secret_key in {"change-me-to-a-long-random-hackathon-secret", "kwickink-hackathon-dev-secret-change-me"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
