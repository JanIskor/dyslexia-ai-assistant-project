from fastapi import FastAPI
from app.api.v1 import health

app = FastAPI(
    title="AI Dyslexia Backend",
    description="Foundation API for dyslexia adaptation system",
    version="0.1.0",
)

app.include_router(health.router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_root() -> dict:
    return {"status": "ok", "service": "backend", "detail": "alive"}
