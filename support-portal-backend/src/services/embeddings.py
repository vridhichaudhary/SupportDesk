import abc
import structlog
from typing import List, Optional

import google.generativeai as genai

from src.core.config import settings

logger = structlog.get_logger()

class EmbeddingProvider(abc.ABC):
    @abc.abstractmethod
    def get_embedding(self, text: str, task_type: str = "retrieval_document") -> Optional[List[float]]:
        pass

    @abc.abstractmethod
    def get_embeddings(self, texts: List[str], task_type: str = "retrieval_document") -> List[Optional[List[float]]]:
        pass


class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model_name = "models/text-embedding-004"
        genai.configure(api_key=self.api_key)

    def get_embedding(self, text: str, task_type: str = "retrieval_document") -> Optional[List[float]]:
        try:
            response = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type=task_type
            )
            return response['embedding']
        except Exception as e:
            logger.error("Gemini embedding generation failed", error=str(e), text_preview=text[:50])
            return None

    def get_embeddings(self, texts: List[str], task_type: str = "retrieval_document") -> List[Optional[List[float]]]:
        try:
            response = genai.embed_content(
                model=self.model_name,
                content=texts,
                task_type=task_type
            )
            return response.get('embedding', [None]*len(texts))
        except Exception as e:
            logger.error("Gemini batch embedding generation failed", error=str(e), num_texts=len(texts))
            return [None] * len(texts)


class MockEmbeddingProvider(EmbeddingProvider):
    """Fallback provider when API key is missing. Generates zero-vectors."""
    def get_embedding(self, text: str, task_type: str = "retrieval_document") -> Optional[List[float]]:
        return [0.0] * 768

    def get_embeddings(self, texts: List[str], task_type: str = "retrieval_document") -> List[Optional[List[float]]]:
        return [[0.0] * 768 for _ in texts]


def _init_embedding_service() -> EmbeddingProvider:
    if settings.GEMINI_API_KEY:
        logger.info("Initializing Gemini embedding service")
        return GeminiEmbeddingProvider(api_key=settings.GEMINI_API_KEY)
    else:
        logger.warning("GEMINI_API_KEY not found. Falling back to MockEmbeddingProvider.")
        return MockEmbeddingProvider()

embedding_service = _init_embedding_service()
