from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from heapq import nlargest
import re

from app.models.schemas import BusinessEntity, BusinessRelation, GraphInsight


@dataclass
class GraphStats:
    nodes: int = 0
    edges: int = 0


class BusinessGraph:
    def __init__(self):
        self._entities: dict[str, BusinessEntity] = {}
        self._edges: dict[str, list[BusinessRelation]] = defaultdict(list)
        self._edge_keys: set[tuple[str, str, str]] = set()
        self._entity_terms: dict[str, set[str]] = {}
        self._term_index: dict[str, set[str]] = defaultdict(set)

    def upsert(self, entities: list[BusinessEntity], relations: list[BusinessRelation]) -> GraphStats:
        for entity in entities:
            self._remove_entity_terms(entity.entity_id)
            self._entities[entity.entity_id] = entity
            self._index_entity(entity)
        for relation in relations:
            edge_key = (relation.source_id, relation.target_id, relation.relation_type)
            if edge_key in self._edge_keys:
                continue
            self._edge_keys.add(edge_key)
            self._edges[relation.source_id].append(relation)
        return GraphStats(nodes=len(self._entities), edges=sum(len(v) for v in self._edges.values()))

    def stats(self) -> GraphStats:
        return GraphStats(nodes=len(self._entities), edges=sum(len(v) for v in self._edges.values()))

    def query(self, text: str, limit: int) -> list[GraphInsight]:
        tokens = self._tokenize(text)
        candidate_ids: set[str] = set()
        for token in tokens:
            candidate_ids.update(self._term_index.get(token, set()))

        scored: list[GraphInsight] = []
        for entity_id in candidate_ids:
            entity = self._entities[entity_id]
            terms = self._entity_terms.get(entity_id, set())
            score = len(tokens & terms)
            if score == 0:
                continue
            for relation in self._edges.get(entity_id, [])[:3]:
                target = self._entities.get(relation.target_id)
                target_name = target.name if target else relation.target_id
                scored.append(
                    GraphInsight(
                        entity=entity.name,
                        relationship=f"{relation.relation_type} -> {target_name}",
                        evidence=str(relation.metadata or entity.attributes),
                        score=float(score) * relation.weight,
                    )
                )
        return nlargest(limit, scored, key=lambda item: item.score)

    def neighborhood(self, entity_id: str, depth: int = 2) -> list[BusinessRelation]:
        seen = {entity_id}
        queue: deque[tuple[str, int]] = deque([(entity_id, 0)])
        relations: list[BusinessRelation] = []
        while queue:
            current, level = queue.popleft()
            if level >= depth:
                continue
            for relation in self._edges.get(current, []):
                relations.append(relation)
                if relation.target_id not in seen:
                    seen.add(relation.target_id)
                    queue.append((relation.target_id, level + 1))
        return relations

    def _index_entity(self, entity: BusinessEntity) -> None:
        terms = self._tokenize(f"{entity.name} {entity.entity_type} {entity.attributes}")
        self._entity_terms[entity.entity_id] = terms
        for term in terms:
            self._term_index[term].add(entity.entity_id)

    def _remove_entity_terms(self, entity_id: str) -> None:
        for term in self._entity_terms.pop(entity_id, set()):
            ids = self._term_index.get(term)
            if not ids:
                continue
            ids.discard(entity_id)
            if not ids:
                self._term_index.pop(term, None)

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return {token for token in re.findall(r"[a-z0-9_]+", text.lower()) if len(token) > 2}
