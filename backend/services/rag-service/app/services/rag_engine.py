from __future__ import annotations

import time

from app.core.config import settings
from app.models.schemas import (
    Citation,
    IngestRequest,
    IngestResponse,
    Modality,
    MultimodalPart,
    QueryRequest,
    QueryResponse,
    RetrievalMode,
)
from app.providers.embeddings import EmbeddingProvider, get_embedding_provider
from app.providers.llm import LLMProvider, default_actions, get_llm_provider
from app.retrieval.chunking import chunk_document
from app.retrieval.graph_store import BusinessGraph
from app.retrieval.vector_store import VectorStore, get_vector_store
from app.services.business_context import snapshot_to_documents


SYSTEM_PROMPT = """You are VentureRoot's business intelligence assistant.
Use only the retrieved business evidence and graph context. Be concrete, cite evidence,
and recommend actions that improve profit, cash flow, stock availability, and productivity.
If evidence is weak, say what data is missing."""


class RAGEngine:
    def __init__(
        self,
        embeddings: EmbeddingProvider | None = None,
        llm: LLMProvider | None = None,
        vector_store: VectorStore | None = None,
        graph: BusinessGraph | None = None,
    ):
        self.embeddings = embeddings or get_embedding_provider()
        self.llm = llm or get_llm_provider()
        self.vector_store = vector_store or get_vector_store(settings.vector_store, settings.deeplake_path)
        self.graph = graph or BusinessGraph()

    def ingest(self, request: IngestRequest) -> IngestResponse:
        documents = list(request.documents)
        if request.business_snapshot:
            documents.extend(snapshot_to_documents(request.business_snapshot))
            self.graph.upsert(request.business_snapshot.entities, request.business_snapshot.relations)

        chunks = []
        for document in documents:
            chunks.extend(chunk_document(document))
        if chunks:
            vectors = self.embeddings.embed([chunk.text for chunk in chunks])
            self.vector_store.upsert(chunks, vectors)

        stats = self.graph.stats()
        return IngestResponse(
            indexed_documents=len(documents),
            indexed_chunks=len(chunks),
            graph_nodes=stats.nodes,
            graph_edges=stats.edges,
        )

    def answer(self, request: QueryRequest) -> QueryResponse:
        started = time.perf_counter()
        if request.business_snapshot:
            self.ingest(IngestRequest(business_snapshot=request.business_snapshot))

        vector_results = []
        if request.mode in {RetrievalMode.index, RetrievalMode.hybrid}:
            query_vector = self.embeddings.embed([request.message])[0]
            vector_results = self.vector_store.search(
                query_vector,
                tenant_id=request.tenant_id,
                user_id=request.user_id,
                shop_id=request.shop_id,
                top_k=request.top_k,
            )

        graph_insights = []
        if request.mode in {RetrievalMode.graph, RetrievalMode.hybrid}:
            graph_insights = self.graph.query(request.message, limit=min(settings.graph_top_k, request.top_k))

        citations = [
            Citation(
                source_id=result.chunk.document_id,
                title=result.chunk.title,
                source_uri=result.chunk.source_uri,
                score=result.score,
                excerpt=result.chunk.text[:500],
                metadata=result.chunk.metadata,
            )
            for result in vector_results
        ]

        evidence = self._format_evidence(citations, graph_insights)
        answer = self.llm.generate(
            SYSTEM_PROMPT,
            f"User question: {request.message}\n\nRetrieved evidence:\n{evidence[:settings.max_context_chars]}",
        )
        confidence = self._confidence(citations, graph_insights)
        multimodal_output = self._build_multimodal_output(answer, request.output_modalities, citations)

        return QueryResponse(
            answer=answer,
            citations=citations,
            graph_insights=graph_insights,
            recommended_actions=default_actions() if citations or graph_insights else [],
            multimodal_output=multimodal_output,
            confidence=confidence,
            retrieval_mode=request.mode,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    def _format_evidence(self, citations: list[Citation], graph_insights: list) -> str:
        lines: list[str] = []
        for idx, citation in enumerate(citations, start=1):
            lines.append(f"[{idx}] {citation.title} score={citation.score:.3f}: {citation.excerpt}")
        for insight in graph_insights:
            lines.append(
                f"[graph] {insight.entity} {insight.relationship}; evidence={insight.evidence}; score={insight.score:.2f}"
            )
        return "\n".join(lines)

    def _confidence(self, citations: list[Citation], graph_insights: list) -> float:
        if not citations and not graph_insights:
            return 0.15
        best_vector = max((citation.score for citation in citations), default=0.0)
        graph_signal = min(len(graph_insights) / 5, 1.0) * 0.25
        return max(0.2, min(0.95, 0.55 + best_vector * 0.35 + graph_signal))

    def _build_multimodal_output(
        self,
        answer: str,
        requested: list[Modality],
        citations: list[Citation],
    ) -> list[MultimodalPart]:
        output = [MultimodalPart(modality=Modality.text, content=answer)]
        if Modality.table in requested and citations:
            rows = "source,score,title\n" + "\n".join(
                f"{citation.source_id},{citation.score:.3f},{citation.title}" for citation in citations[:5]
            )
            output.append(MultimodalPart(modality=Modality.table, content=rows, mime_type="text/csv"))
        return output


engine = RAGEngine()
