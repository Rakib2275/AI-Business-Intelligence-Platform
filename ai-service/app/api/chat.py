from fastapi import APIRouter, Depends

from app.api.text_to_sql import require_service_key
from app.schemas.query_schema import ChatDecision, ChatRequest
from app.services.llm_service import decide_chat_response

router = APIRouter(
    prefix="/api/v1/chat",
    dependencies=[Depends(require_service_key)],
)


@router.post("/respond", response_model=ChatDecision)
async def respond(request: ChatRequest) -> ChatDecision:
    return await decide_chat_response(request)