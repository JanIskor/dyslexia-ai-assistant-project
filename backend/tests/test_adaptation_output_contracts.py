import unittest

from app.services.adaptation_contract_validator import validate_adaptation_output_contract
from app.services.adaptation_output_contracts import get_adaptation_output_contract
from app.services.adaptation_prompt_builder import build_adaptation_system_prompt


class AdaptationOutputContractsTests(unittest.TestCase):
    def test_basic_simplify_contract_returned(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
            risk_level="medium",
        )

        self.assertEqual(contract["contract_id"], "basic_simplify")
        self.assertEqual(contract["title"], "Упрощённый текст")
        self.assertIn("Связный адаптированный текст.", contract["required_structure"])

    def test_structured_explanation_contract_returned(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="instruction",
            risk_level="medium",
        )

        self.assertEqual(contract["contract_id"], "structured_explanation")
        self.assertEqual(contract["title"], "Пошаговое объяснение")
        self.assertIn("Этапы или шаги.", contract["required_structure"])

    def test_key_points_focus_contract_returned(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="educational",
            risk_level="low",
        )

        self.assertEqual(contract["contract_id"], "key_points_focus")
        self.assertEqual(contract["title"], "Выделение главного")
        self.assertIn("Краткие bullets или короткие блоки.", contract["required_structure"])

    def test_legal_mode_b_override_limits_paraphrasing(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            risk_level="high",
        )

        self.assertTrue(
            any("Свободное перефразирование" in item for item in contract["forbidden_output_patterns"])
        )
        self.assertTrue(
            any("юридические формулировки" in item.lower() for item in contract["format_instructions"])
        )

    def test_key_points_focus_validator_flags_full_retelling(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Это длинный учебный текст, который подробно объясняет несколько связанных идей и примеров.",
            adapted_text=(
                "Это длинный учебный текст, который подробно объясняет несколько связанных идей и примеров. "
                "Он последовательно пересказывает весь исходный материал в полном объёме без выделения ключевых пунктов."
            ),
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("key_points_focus" in issue for issue in result["issues"]))

    def test_structured_explanation_validator_expects_steps(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="instruction",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Сначала возьмите образец, затем измерьте температуру и после этого запишите вывод.",
            adapted_text="Нужно взять образец, измерить температуру и записать вывод одним абзацем без выделения шагов.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("шаги" in issue.lower() or "этап" in issue.lower() for issue in result["issues"]))

    def test_prompt_includes_output_contract(self) -> None:
        prompt = build_adaptation_system_prompt(
            "structured_explanation",
            genre="instruction",
            source_text="Сначала выполните шаг 1, затем шаг 2.",
            retrieved_chunks=None,
        )

        self.assertIn("OUTPUT CONTRACT", prompt)
        self.assertIn("required format", prompt)
        self.assertIn("do not produce", prompt)
        self.assertIn("Пошаговое объяснение", prompt)


if __name__ == "__main__":
    unittest.main()
