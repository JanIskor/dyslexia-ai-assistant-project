import unittest

from app.services.adaptation_prompt_builder import build_adaptation_system_prompt
from app.services.controlled_adaptation_policy_service import build_controlled_adaptation_policy
from app.services.factual_consistency_service import extract_protected_elements


class ControlledAdaptationPolicyServiceTests(unittest.TestCase):
    def test_basic_simplify_policy_allows_safe_restructuring_and_forbids_fact_changes(self) -> None:
        protected_elements = extract_protected_elements("В 2024 году скорость составила 10 км/ч.")
        policy = build_controlled_adaptation_policy(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
            original_text="В 2024 году скорость составила 10 км/ч.",
            protected_elements=protected_elements,
        )

        self.assertEqual(policy["risk_level"], "high")
        self.assertIn("sentence_split", policy["allowed_operations"])
        self.assertIn("inline_definition", policy["allowed_operations"])
        self.assertIn("external_fact_insertion", policy["forbidden_operations"])
        self.assertIn("numeric_rewrite", policy["forbidden_operations"])

    def test_key_points_focus_uses_near_extractive_restrictions(self) -> None:
        protected_elements = extract_protected_elements("Главные выводы нужно сохранить без потери терминов.")
        policy = build_controlled_adaptation_policy(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="educational",
            original_text="Главные выводы нужно сохранить без потери терминов.",
            protected_elements=protected_elements,
        )

        self.assertIn("list_conversion", policy["allowed_operations"])
        self.assertIn("terminology_replacement", policy["forbidden_operations"])
        self.assertIn("unsupported_simplification", policy["forbidden_operations"])

    def test_legal_and_fiction_texts_raise_preservation_risk(self) -> None:
        legal_policy = build_controlled_adaptation_policy(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            original_text="Согласно статье 15 договор действует при условии...",
            protected_elements=extract_protected_elements("Согласно статье 15 договор действует при условии..."),
        )
        fiction_policy = build_controlled_adaptation_policy(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="fiction",
            original_text="«Он посмотрел на Луну», — сказал герой.",
            protected_elements=extract_protected_elements("«Он посмотрел на Луну», — сказал герой."),
        )

        self.assertEqual(legal_policy["risk_level"], "high")
        self.assertEqual(fiction_policy["risk_level"], "high")

    def test_protected_elements_are_extracted_and_included_in_policy(self) -> None:
        source_text = "Если температура 20 °C, сначала выполните шаг 1. Термин «диффузия» сохраните."
        protected_elements = extract_protected_elements(source_text)
        policy = build_controlled_adaptation_policy(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="instruction",
            original_text=source_text,
            protected_elements=protected_elements,
        )

        self.assertIn("20", policy["protected_elements"]["numbers"])
        self.assertIn("°c", policy["protected_elements"]["units"])
        self.assertIn("сначала", policy["protected_elements"]["action_order_markers"])
        self.assertIn("если", policy["protected_elements"]["condition_exception_markers"])
        self.assertIn("диффузия", [item.lower() for item in policy["protected_elements"]["quoted_terms"]])

    def test_formula_and_unit_heavy_text_becomes_high_risk(self) -> None:
        source_text = "По формуле F=ma сила равна 12 Н, масса 3 кг, путь 10 м."
        policy = build_controlled_adaptation_policy(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="scientific_popular",
            original_text=source_text,
            protected_elements=extract_protected_elements(source_text),
        )

        self.assertEqual(policy["risk_level"], "high")

    def test_prompt_contains_protected_elements_and_forbidden_operations(self) -> None:
        prompt = build_adaptation_system_prompt(
            "structured_explanation",
            genre="instruction",
            source_text="Сначала используйте формулу F=ma и значение 12 Н.",
            retrieved_chunks=None,
        )

        self.assertIn("Защищённые элементы", prompt)
        self.assertIn("F=ma", prompt)
        self.assertIn("Запрещённые операции", prompt)
        self.assertIn("formula_rewrite", prompt)
        self.assertIn("external_fact_insertion", prompt)


if __name__ == "__main__":
    unittest.main()
