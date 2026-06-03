from __future__ import annotations

from dataclasses import dataclass
from heapq import nlargest
from typing import Protocol

from app.providers.embeddings import cosine_similarity
from app.retrieval.chunking import Chunk


@dataclass
class SearchResult:
    chunk: Chunk
    score: float


class VectorStore(Protocol):
    def upsert(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        ...

    def search(
        self,
        query_embedding: list[float],
        *,
        tenant_id: str,
        user_id: str,
        shop_id: str | None,
        top_k: int,
    ) -> list[SearchResult]:
        ...


class InMemoryVectorStore:
    def __init__(self):
        self._rows: dict[str, tuple[Chunk, list[float]]] = {}
        self._tenant_user_index: dict[tuple[str, str], set[str]] = {}
        self._shop_index: dict[tuple[str, str, str | None], set[str]] = {}

    def upsert(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("chunks and embeddings length mismatch")
        for chunk, embedding in zip(chunks, embeddings):
            existing = self._rows.get(chunk.chunk_id)
            if existing:
                self._remove_from_indexes(existing[0])
            self._rows[chunk.chunk_id] = (chunk, embedding)
            self._add_to_indexes(chunk)

    def search(
        self,
        query_embedding: list[float],
        *,
        tenant_id: str,
        user_id: str,
        shop_id: str | None,
        top_k: int,
    ) -> list[SearchResult]:
        candidate_ids = self._candidate_ids(tenant_id, user_id, shop_id)
        scored = (
            SearchResult(
                chunk=self._rows[chunk_id][0],
                score=cosine_similarity(query_embedding, self._rows[chunk_id][1]),
            )
            for chunk_id in candidate_ids
            if chunk_id in self._rows
        )
        return nlargest(top_k, scored, key=lambda item: item.score)

    def _add_to_indexes(self, chunk: Chunk) -> None:
        tenant_user_key = (chunk.tenant_id, chunk.user_id)
        shop_key = (chunk.tenant_id, chunk.user_id, chunk.shop_id)
        self._tenant_user_index.setdefault(tenant_user_key, set()).add(chunk.chunk_id)
        self._shop_index.setdefault(shop_key, set()).add(chunk.chunk_id)

    def _remove_from_indexes(self, chunk: Chunk) -> None:
        tenant_user_key = (chunk.tenant_id, chunk.user_id)
        shop_key = (chunk.tenant_id, chunk.user_id, chunk.shop_id)
        self._tenant_user_index.get(tenant_user_key, set()).discard(chunk.chunk_id)
        self._shop_index.get(shop_key, set()).discard(chunk.chunk_id)

    def _candidate_ids(
        self,
        tenant_id: str,
        user_id: str,
        shop_id: str | None,
    ) -> set[str]:
        if not shop_id:
            return set(self._tenant_user_index.get((tenant_id, user_id), set()))
        scoped = self._shop_index.get((tenant_id, user_id, shop_id), set())
        global_for_user = self._shop_index.get((tenant_id, user_id, None), set())
        return set(scoped) | set(global_for_user)


class DeepLakeVectorStore(InMemoryVectorStore):
    """
    Deep Lake adapter placeholder with in-memory parity.

    The API boundary is production-ready: swap internals to persist tensors to
    deeplake without changing the RAG engine or routes.
    """

    def __init__(self, path: str):
        super().__init__()
        self.path = path
        try:
            import deeplake  # noqa: F401

            self.available = True
        except Exception:
            self.available = False


def get_vector_store(kind: str, deeplake_path: str) -> VectorStore:
    if kind.lower() == "deeplake":
        return DeepLakeVectorStore(deeplake_path)
    return InMemoryVectorStore()
