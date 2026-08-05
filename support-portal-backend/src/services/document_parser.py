import os
from typing import Dict, Optional, Tuple

import pypdf
import docx

class DocumentParser:
    """
    Extracts text and metadata from uploaded documents.
    Supports PDF, DOCX, TXT, and Markdown.
    """

    @classmethod
    def extract(cls, file_path: str, mime_type: str) -> Tuple[str, Dict]:
        """
        Returns (extracted_text, metadata_dict).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if mime_type == "application/pdf":
            return cls._extract_pdf(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return cls._extract_docx(file_path)
        elif mime_type in ("text/plain", "text/markdown"):
            return cls._extract_text(file_path)
        else:
            raise ValueError(f"Unsupported mime type for parsing: {mime_type}")

    @classmethod
    def _extract_pdf(cls, file_path: str) -> Tuple[str, Dict]:
        text_parts = []
        metadata = {}
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            metadata["page_count"] = len(reader.pages)
            if reader.metadata:
                metadata["title"] = reader.metadata.title
                metadata["author"] = reader.metadata.author
            
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    # Keep track of pages for chunking if we want to be advanced, 
                    # but for now we just append a page marker.
                    text_parts.append(f"\n\n--- PAGE {i+1} ---\n\n")
                    text_parts.append(page_text)
                    
        return "".join(text_parts), metadata

    @classmethod
    def _extract_docx(cls, file_path: str) -> Tuple[str, Dict]:
        doc = docx.Document(file_path)
        metadata = {}
        if doc.core_properties:
            metadata["title"] = doc.core_properties.title
            metadata["author"] = doc.core_properties.author
        
        text_parts = []
        for p in doc.paragraphs:
            text_parts.append(p.text)
            
        return "\n".join(text_parts), metadata

    @classmethod
    def _extract_text(cls, file_path: str) -> Tuple[str, Dict]:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        return text, {}

document_parser = DocumentParser()
