# VentureRoot Production RAG Engine

This service is the business assistant engine for tenant-scoped, multimodal RAG. It supports:

- Index-based retrieval over text, table, image/audio transcripts, metrics, and business documents.
- Graph RAG over products, categories, suppliers, stores, customers, and operational relationships.
- Optional OpenAI generation and embeddings.
- Optional SentenceTransformers local embeddings.
- Optional LlamaIndex index construction boundary.
- Optional Deep Lake vector-store adapter boundary.
- Deterministic local fallbacks for development and CI.

## Runtime Configuration

All settings use the `RAG_` prefix.

- `RAG_OPENAI_API_KEY`: enables OpenAI answer generation and embeddings when configured.
- `RAG_OPENAI_MODEL`: default `gpt-4o-mini`.
- `RAG_OPENAI_EMBEDDING_MODEL`: default `text-embedding-3-small`.
- `RAG_EMBEDDING_PROVIDER`: `hash`, `openai`, or `sentence-transformers`.
- `RAG_SENTENCE_TRANSFORMER_MODEL`: default `sentence-transformers/all-MiniLM-L6-v2`.
- `RAG_VECTOR_STORE`: `memory` or `deeplake`.
- `RAG_DEEPLAKE_PATH`: Deep Lake dataset path.
- `RAG_RETRIEVAL_TOP_K`: default retrieval depth.
- `RAG_MAX_CONTEXT_CHARS`: max grounded context passed to the LLM.

The Docker image installs the lean API runtime by default. To include local SentenceTransformers, LlamaIndex, and Deep Lake in the image, build with:

```bash
docker compose build --build-arg INSTALL_RAG_OPTIONAL=true rag-service
```

## API Surface

- `POST /v1/ingest`: indexes multimodal documents and/or a structured business snapshot.
- `POST /v1/query`: hybrid RAG query with citations, graph insights, multimodal output, confidence, and recommended actions.
- `POST /v1/chat`: compatibility wrapper for assistant chat.
- `POST /v1/inventory/personalize`: compatibility wrapper that indexes shop inventory.
- `GET /v1/inventory/suggest`: compatibility wrapper for inventory recommendations.

## Data Isolation

Every chunk is stored with `tenant_id`, `user_id`, and optional `shop_id`. Retrieval filters on these fields before scoring, which prevents cross-tenant context leakage. Production persistence should keep the same fields as partition keys or metadata filters in the vector store.

## Scale Plan for 2M Users

1. Run this service stateless behind the API gateway. Keep tenant data in external stores.
2. Use async ingestion workers for large document, image, audio, receipt, and sales-history uploads.
3. Use Deep Lake, pgvector, or a managed vector database with tenant partitions and metadata filters.
4. Store the graph in Neo4j, Memgraph, Postgres edge tables, or a managed graph service once graph size exceeds one-process memory.
5. Cache hot query embeddings and top retrieval results by tenant/query fingerprint.
6. Add rate limits by tenant, route, and model cost class.
7. Emit tracing for `ingest`, `embed`, `vector_search`, `graph_search`, and `llm_generate`.
8. Evaluate answer quality with offline golden sets for inventory, sales, margins, stockouts, and supplier decisions.

## Production Hardening Checklist

- Configure OpenAI or SentenceTransformers embeddings explicitly.
- Configure a persistent vector store before production traffic.
- Add authentication middleware at the gateway and pass verified tenant/user claims.
- Persist conversation summaries if multi-turn continuity is required.
- Add PII redaction for documents and transcripts before embedding.
- Add background re-indexing for changed products, sales records, and supplier terms.
- Add human-readable citations for every financial recommendation.
- Add cost, latency, and hallucination dashboards.
