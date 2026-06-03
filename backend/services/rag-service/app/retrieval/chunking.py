from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.schemas import DocumentInput, Modality


@dataclass
class Chunk:
    chunk_id: str
    document_id: str
    tenant_id: str
    user_id: str
    shop_id: str | None
    title: str
    text: str
    source_uri: str | None
    metadata: dict[str, Any] = field(default_factory=dict)


def document_to_text(document: DocumentInput) -> str:
    parts: list[str] = []
    for part in document.parts:
        prefix = part.modality.value.upper()
        if part.modality is Modality.table:
            prefix = "TABLE"
        parts.append(f"{prefix}: {part.content}")
    return "\n".join(parts)


def chunk_document(document: DocumentInput, chunk_size: int = 900, overlap: int = 120) -> list[Chunk]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size")

    text = document_to_text(document).strip()
    if not text:
        return []

    chunks: list[Chunk] = []
    start = 0
    index = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        window = text[start:end]
        chunks.append(
            Chunk(
                chunk_id=f"{document.document_id}:{index}",
                document_id=document.document_id,
                tenant_id=document.tenant_id,
                user_id=document.user_id,
                shop_id=document.shop_id,
                title=document.title,
                text=window,
                source_uri=document.source_uri,
                metadata={**document.metadata, "created_at": document.created_at.isoformat()},
            )
        )
        if end == len(text):
            break
        start = max(0, end - overlap)
        index += 1
    return chunks
