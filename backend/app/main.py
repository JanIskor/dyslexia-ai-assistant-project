from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import health, auth
from app.core.config import settings

app = FastAPI(
    title="AI Dyslexia Backend",
    description="Foundation API for dyslexia adaptation system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

@app.get("/health", tags=["Health"])
def health_root() -> dict:
    return {"status": "ok", "service": "backend", "detail": "alive"}
