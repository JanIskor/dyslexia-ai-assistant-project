from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://dyslexia_user:dyslexia_password@localhost:5433/dyslexia_db"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    MINIO_ENDPOINT: str = "http://127.0.0.1:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "dyslexia-media"
    MINIO_SECURE: bool = False
    LLM_PROVIDER: str = "gigachat"
    GIGACHAT_AUTH_KEY: str | None = None
    GIGACHAT_SCOPE: str = "GIGACHAT_API_PERS"
    GIGACHAT_MODEL: str = "GigaChat-2"
    GIGACHAT_BASE_URL: str = "https://gigachat.devices.sberbank.ru/api/v1"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str | None = None
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
