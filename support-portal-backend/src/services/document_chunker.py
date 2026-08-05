import hashlib
import re
from typing import List, Dict

class DocumentChunker:
    """
    Cleans, normalizes, and intelligently chunks document text.
    """

    def __init__(self, max_chunk_size: int = 1500, overlap: int = 200):
        self.max_chunk_size = max_chunk_size
        self.overlap = overlap

    def clean_text(self, text: str) -> str:
        """
        Normalizes text, removes extra whitespace but preserves paragraph breaks.
        """
        # Replace 3+ newlines with exactly 2
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove trailing/leading spaces on lines
        lines = [line.strip() for line in text.split('\n')]
        return "\n".join(lines)

    def chunk(self, text: str, document_id: str) -> List[Dict]:
        """
        Splits text into chunks, trying to split on natural boundaries.
        Returns a list of dicts ready for insertion into DocumentChunk.
        """
        text = self.clean_text(text)
        
        # A simple fallback chunking strategy: split by paragraphs, group them until size limit
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk_text = ""
        chunk_index = 0
        current_page = 1
        
        # Simple page extraction based on the marker we inject in PDF extractor
        page_marker_re = re.compile(r'--- PAGE (\d+) ---')

        for p in paragraphs:
            # Check if this paragraph is a page marker
            match = page_marker_re.search(p)
            if match:
                current_page = int(match.group(1))
                continue
                
            if not p.strip():
                continue

            if len(current_chunk_text) + len(p) > self.max_chunk_size and current_chunk_text:
                # Save current chunk
                chunks.append(self._create_chunk_dict(
                    text=current_chunk_text.strip(),
                    index=chunk_index,
                    page=current_page,
                    document_id=document_id
                ))
                chunk_index += 1
                
                # For overlap, keep the last paragraph of the previous chunk if it fits
                # (Very basic overlap implementation)
                if len(p) < self.overlap:
                    current_chunk_text = p + "\n\n"
                else:
                    current_chunk_text = ""
            else:
                current_chunk_text += p + "\n\n"

        # Add the last chunk
        if current_chunk_text.strip():
            chunks.append(self._create_chunk_dict(
                text=current_chunk_text.strip(),
                index=chunk_index,
                page=current_page,
                document_id=document_id
            ))

        return chunks

    def _create_chunk_dict(self, text: str, index: int, page: int, document_id: str) -> Dict:
        content_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
        words = len(text.split())
        return {
            "chunk_index": index,
            "content": text,
            "page_number": page,
            "character_count": len(text),
            "word_count": words,
            "content_hash": content_hash,
            "document_id": document_id
        }

document_chunker = DocumentChunker()
