from __future__ import annotations

from dataclasses import dataclass

from app.services.adaptation_post_polish_service import post_polish_adaptation_output
from app.services.adaptation_prompt_builder import (
    AdaptationGenre,
    AdaptationMode,
    RetrievedKnowledgeChunkPromptContext,
    build_adaptation_repair_prompt,
)
from app.services.llm_service import LlmService, PlainTextAdaptationRequest
from app.services.protected_span_extractor import ProtectedSpan
from app.services.protected_span_validator import ProtectedSpanValidationReport


MAX_AUTOMATIC_REPAIR_ATTEMPTS = 1


@dataclass
class AdaptationRepairResult:
    repaired_text: str
    repair_applied: bool
    repair_attempts: int
    repair_summary: str


def should_run_adaptation_repair(report: ProtectedSpanValidationReport) -> bool:
    return report["status"] == "critical" and report["repair_required"]


def run_adaptation_repair(
    *,
    llm_service: LlmService,
    original_text: str,
    previous_adapted_text: str,
    product_mode: str,
    mode: AdaptationMode,
    genre: AdaptationGenre,
    protected_spans: list[ProtectedSpan],
    validation_report: ProtectedSpanValidationReport,
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext],
) -> AdaptationRepairResult:
    if not should_run_adaptation_repair(validation_report):
        return AdaptationRepairResult(
            repaired_text=previous_adapted_text,
            repair_applied=False,
            repair_attempts=0,
            repair_summary="Automatic repair was not required.",
        )

    repair_prompt = build_adaptation_repair_prompt(
        original_text=original_text,
        previous_adapted_text=previous_adapted_text,
        protected_spans=protected_spans,
        validation_issues=validation_report["issues"],
        mode=mode,
        genre=genre,
        retrieved_chunks=retrieved_chunks,
    )

    repair_result = llm_service.adapt_plain_text(
        PlainTextAdaptationRequest(
            source_text=original_text,
            mode=mode,
            genre=genre,
            retrieved_chunks=retrieved_chunks,
            system_prompt_override=repair_prompt,
            user_text_override=previous_adapted_text,
        )
    )
    repaired_text = post_polish_adaptation_output(
        adapted_text=repair_result.adapted_text,
        product_mode=product_mode,
        genre=genre,
    )
    return AdaptationRepairResult(
        repaired_text=repaired_text,
        repair_applied=True,
        repair_attempts=MAX_AUTOMATIC_REPAIR_ATTEMPTS,
        repair_summary="Automatic repair pass executed after critical protected-span distortion.",
    )
