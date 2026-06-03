from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


class RetrievalMode(str, Enum):
    index = "index"
    graph = "graph"
    hybrid = "hybrid"


class Modality(str, Enum):
    text = "text"
    image = "image"
    audio = "audio"
    table = "table"
    metric = "metric"


class MultimodalPart(BaseModel):
    modality: Modality = Modality.text
    content: str
    mime_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BusinessMetric(BaseModel):
    name: str
    value: float | int | str
    unit: str | None = None
    period: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BusinessEntity(BaseModel):
    entity_id: str
    entity_type: Literal["product", "category", "supplier", "customer", "store", "transaction", "policy", "document"]
    name: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class BusinessRelation(BaseModel):
    source_id: str
    target_id: str
    relation_type: str
    weight: float = Field(default=1.0, ge=0.0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BusinessSnapshot(BaseModel):
    user_id: str
    shop_id: str
    metrics: list[BusinessMetric] = Field(default_factory=list)
    entities: list[BusinessEntity] = Field(default_factory=list)
    relations: list[BusinessRelation] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    source: str = "business_snapshot"


class DocumentInput(BaseModel):
    tenant_id: str
    user_id: str
    shop_id: str | None = None
    title: str
    parts: list[MultimodalPart]
    source_uri: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    document_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("parts")
    @classmethod
    def require_parts(cls, value: list[MultimodalPart]) -> list[MultimodalPart]:
        if not value:
            raise ValueError("at least one multimodal part is required")
        return value


class IngestRequest(BaseModel):
    documents: list[DocumentInput] = Field(default_factory=list)
    business_snapshot: BusinessSnapshot | None = None
    rebuild_graph: bool = True


class IngestResponse(BaseModel):
    indexed_documents: int
    indexed_chunks: int
    graph_nodes: int
    graph_edges: int


class QueryRequest(BaseModel):
    user_id: str
    tenant_id: str
    shop_id: str | None = None
    message: str
    mode: RetrievalMode = RetrievalMode.hybrid
    top_k: int = Field(default=8, ge=1, le=25)
    output_modalities: list[Modality] = Field(default_factory=lambda: [Modality.text])
    conversation_id: str | None = None
    business_snapshot: BusinessSnapshot | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Citation(BaseModel):
    source_id: str
    title: str
    source_uri: str | None = None
    score: float
    excerpt: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphInsight(BaseModel):
    entity: str
    relationship: str
    evidence: str
    score: float = 0.0


class BusinessAction(BaseModel):
    title: str
    rationale: str
    expected_impact: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    metric_to_watch: str | None = None


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    graph_insights: list[GraphInsight] = Field(default_factory=list)
    recommended_actions: list[BusinessAction] = Field(default_factory=list)
    multimodal_output: list[MultimodalPart] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    retrieval_mode: RetrievalMode
    latency_ms: int
