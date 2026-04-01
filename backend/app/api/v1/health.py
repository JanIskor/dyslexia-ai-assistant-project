from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
def health() -> dict:
    return {"status": "ok", "detail": "api v1 healthy"}
