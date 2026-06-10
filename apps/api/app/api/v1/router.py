from fastapi import APIRouter

from app.api.v1 import (
    amenities,
    gate,
    health,
    maintenance,
    me,
    posts,
    requests,
    voice,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(posts.router, tags=["posts"])
api_router.include_router(gate.router, tags=["gate"])
api_router.include_router(requests.router, tags=["requests"])
api_router.include_router(maintenance.router)
api_router.include_router(amenities.router)
api_router.include_router(me.router, tags=["me"])
api_router.include_router(voice.router, tags=["voice"])
api_router.include_router(webhooks.router)
