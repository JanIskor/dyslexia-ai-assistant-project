import unittest
from types import SimpleNamespace

from app.services.adaptation_repair_service import run_adaptation_repair, should_run_adaptation_repair
from app.services.adaptation_prompt_builder import RetrievedKnowledgeChunkPromptContext, build_adaptation_repair_prompt
from app.services.protected_span_extractor import extract_protected_spans
from app.services.protected_span_validator import validate_protected_spans


class ProtectedSpanServicesTests(unittest.TestCase):
    def test_extract_legal_protected_spans(self) -> None:
        result = extract_protected_spans(
            "Законный представитель вправе направить письменный отзыв в образовательную организацию в течение 30 календарных дней.",
            genre="legal",
        )

        span_types = {item["span_type"] for item in result["spans"]}
        self.assertIn("legal_actor", span_types)
        self.assertIn("legal_modality", span_types)
        self.assertIn("legal_procedure", span_types)
        self.assertIn("legal_deadline", span_types)

    def test_validate_legal_actor_narrowing_is_critical(self) -> None:
        spans = extract_protected_spans(
            "Законный представитель вправе направить письменный отзыв в образовательную организацию.",
            genre="legal",
        )["spans"]
        report = validate_protected_spans(
            source_text="Законный представитель вправе направить письменный отзыв в образовательную организацию.",
            adapted_text="Родитель может отправить письменный отказ в школу.",
            genre="legal",
            protected_spans=spans,
        )

        self.assertEqual(report["status"], "critical")
        self.assertTrue(report["repair_required"])
        self.assertTrue(any(issue["issue_type"] == "legal_actor_narrowed" for issue in report["issues"]))

    def test_validate_fiction_interpretive_addition(self) -> None:
        spans = extract_protected_spans(
            "Марина не стала спорить. Рядом плыл кораблик.",
            genre="fiction",
        )["spans"]
        report = validate_protected_spans(
            source_text="Марина не стала спорить. Рядом плыл кораблик.",
            adapted_text="Марина молча согласилась. Рядом плыл большой корабль.",
            genre="fiction",
            protected_spans=spans,
        )

        self.assertEqual(report["status"], "warning")
        self.assertTrue(any(issue["issue_type"] in {"narrative_detail_added", "narrative_action_changed"} for issue in report["issues"]))

    def test_validate_educational_generalization(self) -> None:
        spans = extract_protected_spans(
            "Фотосинтез помогает растениям получать вещества.",
            genre="educational",
        )["spans"]
        report = validate_protected_spans(
            source_text="Фотосинтез помогает растениям получать вещества.",
            adapted_text="Фотосинтез всегда полностью обеспечивает жизнь всех растений на Земле.",
            genre="educational",
            protected_spans=spans,
        )

        self.assertEqual(report["status"], "warning")
        self.assertTrue(any(issue["issue_type"] == "unsupported_generalization" for issue in report["issues"]))

    def test_repair_prompt_contains_protected_spans_and_issues(self) -> None:
        prompt = build_adaptation_repair_prompt(
            original_text="Законный представитель вправе направить письменный отзыв.",
            previous_adapted_text="Родитель может отправить письменный отказ.",
            protected_spans=[
                {
                    "text": "Законный представитель",
                    "normalized_text": "законный представитель",
                    "span_type": "legal_actor",
                    "severity": "critical",
                    "preservation_mode": "near_exact",
                    "reason": "Юридический субъект должен сохраняться.",
                }
            ],
            validation_issues=[
                {
                    "issue_type": "legal_actor_narrowed",
                    "severity": "critical",
                    "original_span": "Законный представитель",
                    "adapted_evidence": "родитель",
                    "message": "Юридический субъект сужен.",
                    "repair_instruction": "Верни исходный юридический субъект.",
                }
            ],
            mode="basic_simplify",
            genre="legal",
            retrieved_chunks=[
                RetrievedKnowledgeChunkPromptContext(
                    document_title="11_protected_span_policy",
                    chunk_index=0,
                    content="Policy chunk",
                )
            ],
        )

        self.assertIn("Protected spans extracted from source text", prompt)
        self.assertIn("Законный представитель", prompt)
        self.assertNotIn("legal_actor", prompt)
        self.assertIn("Верни исходный юридический субъект", prompt)
        self.assertIn("LEGAL REPAIR RULES", prompt)

    def test_run_adaptation_repair_executes_one_attempt(self) -> None:
        validation_report = {
            "status": "critical",
            "issues": [
                {
                    "issue_type": "legal_actor_narrowed",
                    "severity": "critical",
                    "original_span": "Законный представитель",
                    "adapted_evidence": "родитель",
                    "message": "Юридический субъект сужен.",
                    "repair_instruction": "Верни исходный юридический субъект.",
                }
            ],
            "critical_count": 1,
            "warning_count": 0,
            "repair_required": True,
            "summary": "critical",
        }
        result = run_adaptation_repair(
            llm_service=SimpleNamespace(
                adapt_plain_text=lambda request: SimpleNamespace(adapted_text="Законный представитель вправе направить письменный отзыв.")
            ),
            original_text="Законный представитель вправе направить письменный отзыв.",
            previous_adapted_text="Родитель может отправить письменный отказ.",
            product_mode="basic_simplify",
            mode="basic_simplify",
            genre="legal",
            protected_spans=extract_protected_spans(
                "Законный представитель вправе направить письменный отзыв.",
                genre="legal",
            )["spans"],
            validation_report=validation_report,
            retrieved_chunks=[],
        )

        self.assertTrue(should_run_adaptation_repair(validation_report))
        self.assertTrue(result.repair_applied)
        self.assertEqual(result.repair_attempts, 1)
        self.assertIn("Законный представитель", result.repaired_text)


if __name__ == "__main__":
    unittest.main()
