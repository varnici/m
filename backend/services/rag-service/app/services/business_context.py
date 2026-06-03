from __future__ import annotations

from app.models.schemas import BusinessSnapshot, DocumentInput, Modality, MultimodalPart


def snapshot_to_documents(snapshot: BusinessSnapshot) -> list[DocumentInput]:
    lines: list[str] = []
    if snapshot.metrics:
        lines.append("Business metrics")
        for metric in snapshot.metrics:
            value = f"{metric.value}{' ' + metric.unit if metric.unit else ''}"
            period = f" during {metric.period}" if metric.period else ""
            lines.append(f"- {metric.name}: {value}{period}. Metadata: {metric.metadata}")
    if snapshot.entities:
        lines.append("Business entities")
        for entity in snapshot.entities:
            lines.append(f"- {entity.entity_type} {entity.name}: {entity.attributes}")
    if snapshot.relations:
        lines.append("Business relationships")
        for relation in snapshot.relations:
            lines.append(
                f"- {relation.source_id} {relation.relation_type} {relation.target_id} "
                f"weight={relation.weight} metadata={relation.metadata}"
            )
    if snapshot.notes:
        lines.append("Operator notes")
        lines.extend(f"- {note}" for note in snapshot.notes)

    if not lines:
        return []

    return [
        DocumentInput(
            tenant_id=snapshot.user_id,
            user_id=snapshot.user_id,
            shop_id=snapshot.shop_id,
            title=f"Business snapshot for shop {snapshot.shop_id}",
            parts=[MultimodalPart(modality=Modality.text, content="\n".join(lines))],
            source_uri=snapshot.source,
            metadata={"source": snapshot.source, "kind": "business_snapshot"},
        )
    ]
