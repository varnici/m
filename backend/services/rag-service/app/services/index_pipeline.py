from __future__ import annotations

from app.models.schemas import DocumentInput


class LlamaIndexPipeline:
    """
    Optional LlamaIndex boundary for teams that want managed index construction.

    The service's default path uses local chunking plus the vector-store interface
    so it can run in constrained environments. When llama-index is installed, this
    helper can be used by workers to build richer document indexes without changing
    the API contract.
    """

    def __init__(self):
        try:
            from llama_index.core import Document, VectorStoreIndex

            self.Document = Document
            self.VectorStoreIndex = VectorStoreIndex
            self.available = True
        except Exception:
            self.Document = None
            self.VectorStoreIndex = None
            self.available = False

    def build_index(self, documents: list[DocumentInput]):
        if not self.available:
            raise RuntimeError("llama-index is not installed")
        llama_documents = []
        for document in documents:
            text = "\n".join(part.content for part in document.parts)
            llama_documents.append(
                self.Document(
                    text=text,
                    metadata={
                        "document_id": document.document_id,
                        "tenant_id": document.tenant_id,
                        "user_id": document.user_id,
                        "shop_id": document.shop_id,
                        **document.metadata,
                    },
                )
            )
        return self.VectorStoreIndex.from_documents(llama_documents)
