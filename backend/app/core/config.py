from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI Dyslexia Backend"
    debug: bool = True
    version: str = "0.1.0"
    host: str = "127.0.0.1"
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
