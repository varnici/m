from __future__ import annotations

from abc import ABC, abstractmethod

from app.core.config import settings
from app.models.schemas import BusinessAction


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError


class OpenAILLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key)
        self.model = model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or ""


class GroundedBusinessLLM(LLMProvider):
    """Local fallback that keeps responses grounded in retrieved evidence."""

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        del system_prompt
        sections = user_prompt.split("Retrieved evidence:")
        question = user_prompt.split("User question:", 1)[-1].split("\n", 1)[0].strip()
        evidence = sections[-1].strip()[:1600] if len(sections) > 1 else ""
        if not evidence:
            return (
                "I do not have enough indexed business evidence to answer confidently. "
                "Ingest recent sales, inventory, margin, supplier, and customer data first."
            )
        return (
            f"Based on the indexed business evidence, here is the practical read on '{question}'. "
            "Prioritize the products and channels that show stronger turnover, protect margin on fast movers, "
            "and reduce cash tied up in slow-moving stock. The strongest supporting context is: "
            f"{evidence}"
        )


def get_llm_provider() -> LLMProvider:
    if settings.openai_api_key:
        try:
            return OpenAILLMProvider(settings.openai_api_key, settings.openai_model)
        except Exception:
            if not settings.allow_stub_llm:
                raise
    return GroundedBusinessLLM()


def default_actions() -> list[BusinessAction]:
    return [
        BusinessAction(
            title="Review fast-moving SKUs weekly",
            rationale="The assistant found demand signals that should influence replenishment.",
            expected_impact="Improves stock availability and protects revenue.",
            priority="high",
            metric_to_watch="stockout_rate",
        ),
        BusinessAction(
            title="Reduce exposure to slow movers",
            rationale="Slow inventory ties up working capital that could be used for profitable stock.",
            expected_impact="Improves cash flow and inventory turnover.",
            priority="medium",
            metric_to_watch="inventory_turnover",
        ),
    ]
