from fastapi import FastAPI
from app.api.v1 import health, auth
from app.db.base import Base
from app.db.session import engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Dyslexia Backend",
    description="Foundation API for dyslexia adaptation system",
    version="0.1.0",
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

@app.get("/health", tags=["Health"])
def health_root() -> dict:
    return {"status": "ok", "service": "backend", "detail": "alive"}
