from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[str] = []


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Placeholder: wire to vector store + LLM later.
    return ChatResponse(
        answer=f"(stub) I received: {req.message}",
        citations=["documentation.md"],
    )

