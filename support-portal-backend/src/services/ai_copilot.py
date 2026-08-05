import uuid
import structlog
from typing import List, Optional, Dict, Any, Tuple
import google.generativeai as genai
from sqlalchemy.orm import Session
from src.core.config import settings
from src.models import AIChatSession, AIChatMessage, User
from src.services.retrieval import retrieval_service
from src.core.exceptions import ValidationException

logger = structlog.get_logger()

class AICopilotService:
    def __init__(self):
        self.model_name = "models/gemini-2.5-flash"
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None

    def get_or_create_session(self, db: Session, user: User, title: str, session_id: Optional[uuid.UUID] = None) -> AIChatSession:
        if session_id:
            session = db.query(AIChatSession).filter(
                AIChatSession.id == session_id,
                AIChatSession.organization_id == user.organization_id,
                AIChatSession.user_id == user.id
            ).first()
            if not session:
                raise ValidationException("Chat session not found")
            return session
            
        session = AIChatSession(
            organization_id=user.organization_id,
            user_id=user.id,
            title=title
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def list_sessions(self, db: Session, user: User) -> List[AIChatSession]:
        return db.query(AIChatSession).filter(
            AIChatSession.user_id == user.id,
            AIChatSession.organization_id == user.organization_id
        ).order_by(AIChatSession.updated_at.desc()).limit(50).all()

    def get_session_messages(self, db: Session, user: User, session_id: uuid.UUID) -> List[AIChatMessage]:
        session = self.get_or_create_session(db, user, title="", session_id=session_id)
        return db.query(AIChatMessage).filter(AIChatMessage.session_id == session.id).order_by(AIChatMessage.created_at.asc()).all()

    def delete_session(self, db: Session, user: User, session_id: uuid.UUID) -> None:
        session = self.get_or_create_session(db, user, title="", session_id=session_id)
        db.delete(session)
        db.commit()

    def ask(
        self,
        db: Session,
        user: User,
        query: str,
        session_id: Optional[uuid.UUID] = None
    ) -> Tuple[AIChatMessage, AIChatSession]:
        """
        Retrieves context, calls Gemini, and stores the interaction.
        """
        # Determine title
        title = query[:50] + "..." if len(query) > 50 else query
        session = self.get_or_create_session(db, user, title, session_id)
        
        # Save user message
        user_msg = AIChatMessage(
            session_id=session.id,
            role="user",
            content=query
        )
        db.add(user_msg)
        
        if not self.model:
            # Fallback when no API key
            assistant_msg = AIChatMessage(
                session_id=session.id,
                role="assistant",
                content="GEMINI_API_KEY is not configured. Please set it to use the AI Copilot.",
                citations_json=[]
            )
            db.add(assistant_msg)
            db.commit()
            db.refresh(assistant_msg)
            return assistant_msg, session

        # Retrieve context
        contexts = retrieval_service.search(db, user.organization_id, query, top_k=5)
        
        if not contexts:
            assistant_msg = AIChatMessage(
                session_id=session.id,
                role="assistant",
                content="I couldn't find enough information in the organization's knowledge base to answer this question.",
                citations_json=[]
            )
            db.add(assistant_msg)
            db.commit()
            db.refresh(assistant_msg)
            return assistant_msg, session
            
        # Build prompt
        context_text = ""
        citations = []
        for i, ctx in enumerate(contexts):
            ref_id = i + 1
            context_text += f"\n\n--- Source [{ref_id}] ---\nTitle: {ctx['title']}\nContent: {ctx['content']}"
            citations.append({
                "ref_id": ref_id,
                "title": ctx['title'] or "Untitled Document",
                "source_type": ctx['source_type'],
                "document_id": ctx['document_id'],
                "kb_article_id": ctx['kb_article_id']
            })
            
        prompt = f"""
You are an Enterprise AI Copilot answering support questions based ONLY on the provided context.
You must use the provided context to answer the user's question accurately.
If the context does not contain enough information to answer the question fully, you must state: "I couldn't find enough information."
Do not hallucinate or use outside knowledge.
When you use information from a source, cite it inline using the format [1], [2], etc.

Context:
{context_text}

User Question: {query}

Answer:"""

        try:
            response = self.model.generate_content(prompt)
            answer_text = response.text
        except Exception as e:
            logger.error("Gemini generation failed", error=str(e))
            answer_text = "I encountered an error while generating the answer. Please try again."
            citations = []

        # Save assistant message
        assistant_msg = AIChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer_text,
            citations_json=citations
        )
        db.add(assistant_msg)
        
        # Touch session
        from datetime import datetime
        session.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(assistant_msg)
        db.refresh(session)
        
        return assistant_msg, session

ai_copilot_service = AICopilotService()
