from __future__ import annotations

from typing import Literal, TypedDict


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


class AdaptationContractOverride(TypedDict):
    required_structure_append: list[str]
    forbidden_output_patterns_append: list[str]
    format_instructions_append: list[str]
    preserve_notes: list[str]


def get_adaptation_contract_override(
    *,
    product_mode: ProductAdaptationMode,
    strategy_mode: StrategyAdaptationMode,
    genre: AdaptationGenre,
    risk_level: RiskLevel,
) -> AdaptationContractOverride | None:
    if genre == "legal" and strategy_mode == "mode_b":
        return {
            "required_structure_append": [
                "Нейтральные заголовки и аккуратная сегментация вместо свободного пересказа.",
                "Разрешена только структуризация без смысловой подмены.",
            ],
            "forbidden_output_patterns_append": [
                "Свободное перефразирование юридических формулировок.",
                "Замена терминов и условий на бытовые аналоги.",
                "Объяснительный пересказ вместо сохранения исходного юридического смысла.",
                "Суммаризация вместо адаптации, кроме режима key_points_focus.",
            ],
            "format_instructions_append": [
                "Сохраняй юридические формулировки максимально близко к исходнику.",
            ],
            "preserve_notes": [
                "Юридические формулировки должны сохраняться максимально близко к исходнику.",
            ],
        }

    if genre == "fiction" and strategy_mode == "mode_b":
        return {
            "required_structure_append": [
                "Сохраняй образность, ритм и интонацию, если они важны для смысла.",
            ],
            "forbidden_output_patterns_append": [
                "Сухой конспект вместо художественного фрагмента, если только это не key_points_focus.",
                "Замена художественных образов прямыми бытовыми объяснениями.",
            ],
            "format_instructions_append": [
                "Сохраняй стиль и образность ближе к исходному тексту.",
            ],
            "preserve_notes": [
                "Художественные образы и авторская интонация не должны теряться без необходимости.",
            ],
        }

    if genre == "educational" and strategy_mode == "mode_a":
        return {
            "required_structure_append": [
                "Допустимо controlled simplification с сохранением учебной логики.",
            ],
            "forbidden_output_patterns_append": [],
            "format_instructions_append": [
                "Можно пояснять учебные связи, если не добавляются новые факты.",
            ],
            "preserve_notes": [
                "Учебная логика и причинно-следственные связи должны сохраняться.",
            ],
        }

    if risk_level == "high":
        return {
            "required_structure_append": [
                "При высоком риске опирайся на структуру больше, чем на глубокое переписывание.",
            ],
            "forbidden_output_patterns_append": [
                "Глубокое переписывание вместо сохранения чувствительных формулировок.",
            ],
            "format_instructions_append": [
                "Если есть сомнение, сохраняй исходную формулировку и только структурируй её.",
            ],
            "preserve_notes": [
                "Высокий риск: приоритет у сохранения формулировок и точных элементов.",
            ],
        }

    return None
