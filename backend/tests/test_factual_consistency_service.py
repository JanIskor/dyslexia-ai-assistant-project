import unittest

from app.services.factual_consistency_service import build_factual_consistency_report


class FactualConsistencyServiceTests(unittest.TestCase):
    def test_preserved_numbers_produce_no_warning(self) -> None:
        report = build_factual_consistency_report(
            source_text="В 2024 году температура составила 20 °C.",
            adapted_text="В 2024 году температура составила 20 °C.",
        )

        self.assertEqual(report["summary_status"], "ok")
        self.assertEqual(report["issues"], [])

    def test_missing_number_is_detected(self) -> None:
        report = build_factual_consistency_report(
            source_text="В классе 15 учеников.",
            adapted_text="В классе много учеников.",
        )

        self.assertEqual(report["summary_status"], "warning")
        self.assertTrue(any(issue["type"] == "missing_fact" for issue in report["issues"]))

    def test_changed_unit_is_detected(self) -> None:
        report = build_factual_consistency_report(
            source_text="Скорость равна 10 км/ч.",
            adapted_text="Скорость равна 10 м/с.",
        )

        self.assertTrue(any(issue["type"] == "changed_unit" for issue in report["issues"]))

    def test_formula_change_is_detected(self) -> None:
        report = build_factual_consistency_report(
            source_text="Используем формулу E=mc^2 для объяснения.",
            adapted_text="Используем формулу E=mc^3 для объяснения.",
        )

        self.assertTrue(any(issue["type"] == "formula_changed" for issue in report["issues"]))

    def test_added_number_is_detected(self) -> None:
        report = build_factual_consistency_report(
            source_text="В опыте участвовали ученики.",
            adapted_text="В опыте участвовали 12 учеников.",
        )

        self.assertTrue(any(issue["type"] == "added_fact" for issue in report["issues"]))

    def test_strict_mode_escalates_formula_and_unit_issues(self) -> None:
        report = build_factual_consistency_report(
            source_text="По формуле F=ma сила равна 12 Н при массе 3 кг.",
            adapted_text="По формуле F=mv сила равна 12 Дж при массе 3 кг.",
        )

        self.assertTrue(report["strict_mode"])
        critical_types = {issue["type"] for issue in report["issues"] if issue["severity"] == "critical"}
        self.assertIn("formula_changed", critical_types)
        self.assertIn("changed_unit", critical_types)

    def test_legacy_empty_report_fallback_message_does_not_require_report(self) -> None:
        report = build_factual_consistency_report(
            source_text="Текст без чисел и формул.",
            adapted_text="Текст без чисел и формул.",
        )

        self.assertEqual(report["summary_message"], "Проверка фактов: критических расхождений не найдено.")


if __name__ == "__main__":
    unittest.main()
