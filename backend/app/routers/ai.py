from fastapi import APIRouter
from pydantic import BaseModel

from ..config import settings
from ..gemini_client import ai_enabled

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AiStatusResponse(BaseModel):
    enabled: (
        bool  # False without GEMINI_API_KEY: AI buttons are disabled, the AI tab shows setup steps
    )
    model: str


@router.get("/status", response_model=AiStatusResponse)
def ai_status():
    return AiStatusResponse(enabled=ai_enabled(), model=settings.gemini_model)
