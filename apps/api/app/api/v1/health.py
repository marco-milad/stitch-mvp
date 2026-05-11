from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "env": settings.APP_ENV,
        "model": settings.GEMINI_MODEL,
        "timestamp": datetime.now(UTC).isoformat(),
    }
