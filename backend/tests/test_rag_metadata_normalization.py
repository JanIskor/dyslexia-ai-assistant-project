import unittest

from app.services.adaptation_prompt_builder import build_adaptation_system_prompt, build_retrieval_tags, resolve_strategy_mode
from app.services.retrieval_service import _document_matches_selected_tags


class RagMetadataNormalizationTests(unittest.TestCase):
    def test_strategy_resolver_prefers_mode_b_for_legal_text(self) -> None:
        self.assertEqual(resolve_strategy_mode("basic_simplify", "legal"), "mode_b")
        self.assertEqual(resolve_strategy_mode("key_points_focus", "legal"), "mode_b")

    def test_strategy_resolver_prefers_mode_b_for_fiction_text(self) -> None:
        self.assertEqual(resolve_strategy_mode("basic_simplify", "fiction"), "mode_b")
        self.assertEqual(resolve_strategy_mode("structured_explanation", "fiction"), "mode_b")

    def test_strategy_resolver_prefers_mode_a_for_basic_and_structured_in_safe_genres(self) -> None:
        self.assertEqual(resolve_strategy_mode("basic_simplify", "educational"), "mode_a")
        self.assertEqual(resolve_strategy_mode("structured_explanation", "instruction"), "mode_a")
        self.assertEqual(resolve_strategy_mode("key_points_focus", "educational"), "mode_a")
        self.assertEqual(resolve_strategy_mode("structured_explanation", "scientific_popular"), "mode_a")

    def test_retrieval_tags_include_product_strategy_genre_and_general(self) -> None:
        self.assertEqual(
            build_retrieval_tags("basic_simplify", "educational"),
            ["basic_simplify", "mode_a", "educational", "general"],
        )
        self.assertEqual(
            build_retrieval_tags("key_points_focus", "legal"),
            ["key_points_focus", "mode_b", "legal", "general"],
        )

    def test_general_documents_without_tags_still_match(self) -> None:
        self.assertTrue(
            _document_matches_selected_tags(
                [],
                selected_mode="basic_simplify",
                selected_genre="educational",
            )
        )

    def test_product_mode_tags_still_retrieve_for_matching_product_mode(self) -> None:
        self.assertTrue(
            _document_matches_selected_tags(
                ["basic_simplify"],
                selected_mode="basic_simplify",
                selected_genre="educational",
            )
        )
        self.assertFalse(
            _document_matches_selected_tags(
                ["basic_simplify"],
                selected_mode="structured_explanation",
                selected_genre="educational",
            )
        )

    def test_legacy_strategy_only_tags_remain_compatible(self) -> None:
        self.assertTrue(
            _document_matches_selected_tags(
                ["mode_a"],
                selected_mode="structured_explanation",
                selected_genre="instruction",
            )
        )
        self.assertTrue(
            _document_matches_selected_tags(
                ["mode_b", "legal"],
                selected_mode="basic_simplify",
                selected_genre="legal",
            )
        )
        self.assertFalse(
            _document_matches_selected_tags(
                ["mode_b", "legal"],
                selected_mode="basic_simplify",
                selected_genre="educational",
            )
        )

    def test_prompt_includes_genre_aware_method_behavior_for_educational_basic(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="educational",
            source_text="Текст объясняет учебное явление.",
            retrieved_chunks=None,
        )

        self.assertIn("GENRE-AWARE METHOD BEHAVIOR", prompt)
        self.assertIn("pedagogical rewrite", prompt)
        self.assertIn("стабильную объяснительную учебную структуру", prompt)

    def test_prompt_includes_genre_aware_method_behavior_for_legal_key_points(self) -> None:
        prompt = build_adaptation_system_prompt(
            "key_points_focus",
            genre="legal",
            source_text="Документ устанавливает права и ограничения.",
            retrieved_chunks=None,
        )

        self.assertIn("GENRE-AWARE METHOD BEHAVIOR", prompt)
        self.assertIn("obligations/conditions/rights extraction", prompt)

    def test_prompt_includes_genre_aware_method_behavior_for_fiction(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="fiction",
            source_text="Марина не стала спорить и посмотрела на реку.",
            retrieved_chunks=None,
        )

        self.assertIn("GENRE-AWARE METHOD BEHAVIOR", prompt)
        self.assertIn("narrative-preserving simplification", prompt)

    def test_prompt_includes_genre_aware_method_behavior_for_scientific_popular(self) -> None:
        prompt = build_adaptation_system_prompt(
            "key_points_focus",
            genre="scientific_popular",
            source_text="Текст описывает ключевые научные понятия и их связи.",
            retrieved_chunks=None,
        )

        self.assertIn("GENRE-AWARE METHOD BEHAVIOR", prompt)
        self.assertIn("concept anchors", prompt)


if __name__ == "__main__":
    unittest.main()
