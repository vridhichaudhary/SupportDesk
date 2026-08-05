import uuid
from typing import List, Optional, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.dependencies import get_db, get_current_user
from src.models import User
from src.services.ai_copilot import ai_copilot_service

router = APIRouter(prefix="/ai", tags=["ai"])


class AskRequest(BaseModel):
    query: str = Field(..., description="The user's question")
    session_id: Optional[uuid.UUID] = Field(None, description="Optional ID of an existing session to continue")


class Citation(BaseModel):
    ref_id: int
    title: str
    source_type: str
    document_id: Optional[uuid.UUID] = None
    kb_article_id: Optional[uuid.UUID] = None


class AskResponse(BaseModel):
    session_id: uuid.UUID
    answer: str
    citations: List[Citation]


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: List[Citation] = []
    created_at: Any


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: Any
    updated_at: Any


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask the AI Copilot a question",
)
def ask_ai(
    request: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Asks the enterprise AI Copilot a question based on organization knowledge.
    Returns the answer and citations.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    msg, session = ai_copilot_service.ask(db, current_user, request.query, request.session_id)
    
    citations_data = msg.citations_json or []
    citations = [Citation(**c) for c in citations_data]
    
    return AskResponse(
        session_id=session.id,
        answer=msg.content,
        citations=citations
    )


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponse],
    summary="List AI chat sessions",
)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = ai_copilot_service.list_sessions(db, current_user)
    return [
        ChatSessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        for s in sessions
    ]


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="Get messages for a session",
)
def get_session_messages(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages = ai_copilot_service.get_session_messages(db, current_user, session_id)
    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=[Citation(**c) for c in (m.citations_json or [])],
            created_at=m.created_at
        )
        for m in messages
    ]


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat session",
)
def delete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_copilot_service.delete_session(db, current_user, session_id)
    return None
