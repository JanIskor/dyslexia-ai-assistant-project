from __future__ import annotations

from typing import Literal, TypedDict

from app.services.factual_consistency_service import ExtractedFacts


ProductAdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]
StrategyAdaptationMode = Literal["mode_a", "mode_b"]
AdaptationGenre = Literal[
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]
RiskLevel = Literal["low", "medium", "high"]
AllowedOperation = Literal[
    "sentence_split",
    "paragraph_segmentation",
    "list_conversion",
    "heading_insertion",
    "inline_definition",
    "logical_connector_clarification",
    "visual_emphasis",
    "structural_scaffolding",
]
ForbiddenOperation = Literal[
    "external_fact_insertion",
    "numeric_rewrite",
    "unit_rewrite",
    "formula_rewrite",
    "terminology_replacement",
    "causal_reinterpretation",
    "unsupported_generalization",
    "unsupported_simplification",
    "mechanical_segmentation",
]


class ControlledAdaptationPolicy(TypedDict):
    product_mode: ProductAdaptationMode
    strategy_mode: StrategyAdaptationMode
    genre: AdaptationGenre
    risk_level: RiskLevel
    protected_elements: ExtractedFacts
    allowed_operations: list[AllowedOperation]
    forbidden_operations: list[ForbiddenOperation]
    policy_summary: str


def build_controlled_adaptation_policy(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    original_text: str,
    protected_elements: ExtractedFacts,
) -> ControlledAdaptationPolicy:
    risk_level = _resolve_risk_level(
        genre=genre,
        original_text=original_text,
        protected_elements=protected_elements,
    )
    allowed_operations = _resolve_allowed_operations(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        risk_level=risk_level,
    )
    forbidden_operations = _resolve_forbidden_operations(
        product_mode=product_mode,
        strategy_mode=strategy_mode,
        risk_level=risk_level,
    )

    return {
        "product_mode": product_mode,
        "strategy_mode": strategy_mode,
        "genre": genre,
        "risk_level": risk_level,
        "protected_elements": protected_elements,
        "allowed_operations": allowed_operations,
        "forbidden_operations": forbidden_operations,
        "policy_summary": _build_policy_summary(
            product_mode=product_mode,
            strategy_mode=strategy_mode,
            genre=genre,
            risk_level=risk_level,
        ),
    }


def _resolve_risk_level(
    *,
    genre: AdaptationGenre,
    original_text: str,
    protected_elements: ExtractedFacts,
) -> RiskLevel:
    normalized_text = original_text.lower()
    protected_count = sum(
        len(protected_elements[key])
        for key in (
            "numbers",
            "percentages",
            "units",
            "dates",
            "ranges",
            "formulas",
            "technical_symbols",
            "quoted_terms",
            "legal_markers",
            "action_order_markers",
            "condition_exception_markers",
        )
    )

    if genre in {"legal", "fiction"}:
        return "high"
    if protected_elements["formulas"] or protected_elements["units"] or protected_elements["legal_markers"]:
        return "high"
    if any(marker in normalized_text for marker in ("алгоритм", "код", "инструкция", "протокол", "медицин", "норматив")):
        return "high"
    if protected_count >= 8 or len(protected_elements["numbers"]) >= 3:
        return "medium"
    if any(
        protected_elements[key]
        for key in (
            "numbers",
            "dates",
            "quoted_terms",
            "domain_terms",
            "condition_exception_markers",
        )
    ):
        return "medium"
    return "low"


def _resolve_allowed_operations(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    risk_level: RiskLevel,
) -> list[AllowedOperation]:
    operations: list[AllowedOperation] = [
        "sentence_split",
        "paragraph_segmentation",
        "logical_connector_clarification",
        "visual_emphasis",
    ]

    if product_mode in {"basic_simplify", "structured_explanation"}:
        operations.append("inline_definition")
    if product_mode == "structured_explanation":
        operations.extend(["list_conversion", "heading_insertion", "structural_scaffolding"])
    if product_mode == "key_points_focus":
        operations.extend(["list_conversion", "heading_insertion"])
    if strategy_mode == "mode_a" and risk_level != "high":
        operations.append("structural_scaffolding")

    return list(dict.fromkeys(operations))


def _resolve_forbidden_operations(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    risk_level: RiskLevel,
) -> list[ForbiddenOperation]:
    operations: list[ForbiddenOperation] = [
        "external_fact_insertion",
        "numeric_rewrite",
        "unit_rewrite",
        "formula_rewrite",
        "terminology_replacement",
        "causal_reinterpretation",
        "unsupported_generalization",
        "unsupported_simplification",
        "mechanical_segmentation",
    ]

    if product_mode == "structured_explanation":
        operations.extend(["unsupported_generalization", "mechanical_segmentation"])
    if product_mode == "key_points_focus":
        operations.extend(["terminology_replacement", "unsupported_simplification"])
    if strategy_mode == "mode_b" or risk_level == "high":
        operations.extend(["terminology_replacement", "causal_reinterpretation"])

    return list(dict.fromkeys(operations))


def _build_policy_summary(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
) -> str:
    summary = (
        f"Controlled adaptation policy: product mode {product_mode}, "
        f"strategy {strategy_mode}, genre {genre}, risk {risk_level}. "
        "Protected elements must be preserved, external facts are forbidden. "
        "Do not add facts, examples, causes, terms, explanations or conclusions absent from the original text."
    )

    if genre == "legal":
        summary += (
            " Legal near-source rule: preserve legally significant wording as close to the source as possible. "
            "Do not change modality, conditions, exceptions, deadlines, recipients or action order. "
            "If a legal phrase is hard to simplify safely, keep the original phrase and improve structure around it."
        )
    if genre == "educational":
        summary += (
            " Educational no-new-notation rule: do not introduce new notation, abbreviations, symbols, formulas "
            "or broad unsupported generalizations absent from the source."
        )
    return summary
