from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Local dev over http: COOKIE_SECURE=false, COOKIE_SAMESITE=lax.
    # Deployed with the frontend on a different domain: true / none. A
    # SameSite=lax cookie is never sent on a cross-site request, so login
    # appears to succeed and every following request is a 401. Browsers also
    # reject SameSite=None unless Secure is set, so the two travel together.
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Comma-separated list of origins allowed to call this API with credentials.
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
