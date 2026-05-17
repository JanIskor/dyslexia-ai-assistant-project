import unittest

from app.services.adaptation_contract_validator import validate_adaptation_output_contract
from app.services.adaptation_output_contracts import get_adaptation_output_contract, resolve_golden_template
from app.services.adaptation_post_polish_service import post_polish_adaptation_output
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

    def test_educational_basic_simplify_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "educational_basic_simplify")
        self.assertIn("Главная мысль: ...", template["structure"])

    def test_educational_structured_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="educational",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "educational_structured_explanation")
        self.assertIn("## Шаг 1. ...", template["structure"])

    def test_scientific_popular_structured_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="scientific_popular",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "scientific_popular_structured_explanation")
        self.assertIn("## Короткое объяснение", template["structure"])
        self.assertIn("### Шаг 1. Исходное условие", template["structure"])

    def test_educational_key_points_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="educational",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "educational_key_points_focus")
        self.assertIn("# Главное", template["structure"])

    def test_legal_mode_b_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "legal_preservation_mode_b")
        self.assertIn("## 1. Кто участвует", template["structure"])

    def test_fiction_basic_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="fiction",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "fiction_basic_simplify")
        self.assertIn("### Реплика персонажа", template["structure"])

    def test_scientific_popular_basic_template_resolved(self) -> None:
        template = resolve_golden_template(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="scientific_popular",
        )

        self.assertIsNotNone(template)
        assert template is not None
        self.assertEqual(template["template_id"], "scientific_popular_basic_simplify")
        self.assertIn("## Как это работает", template["structure"])

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
        self.assertTrue(
            any("образовательная организация" in item.lower() for item in contract["forbidden_output_patterns"])
        )
        self.assertEqual(contract["golden_template_title"], "Юридическая сегментация с сохранением формулировок")

    def test_legal_prompt_contains_near_source_rules(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="legal",
            source_text="Законный представитель вправе направить письменный отзыв в образовательную организацию.",
            retrieved_chunks=None,
        )

        self.assertIn("LEGAL NEAR-SOURCE RULES", prompt)
        self.assertIn("сохрани её в исходной формулировке", prompt)

    def test_legal_modality_terms_are_preserved_in_prompt_policy(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="legal",
            source_text="Оператор вправе принять заявление в течение 30 календарных дней, если иное не установлено.",
            retrieved_chunks=None,
        )

        self.assertIn("вправе", prompt)
        self.assertIn("если иное", prompt)
        self.assertIn("в течение", prompt)
        self.assertIn("Не меняй направление действия", prompt)

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

    def test_fiction_structured_explanation_uses_episode_format(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_b",
            genre="fiction",
            risk_level="high",
        )

        self.assertTrue(any("Эпизод 1" in item for item in contract["required_structure"]))
        self.assertTrue(any("Эпизод 1" in item for item in contract["format_instructions"]))

    def test_combined_step_heading_is_flagged(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="instruction",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Сначала откройте окно, затем заполните форму.",
            adapted_text="### Шаг 1 / Шаг 2\nОткройте окно, затем заполните форму.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("одном заголовке" in issue for issue in result["issues"]))

    def test_validator_flags_missing_educational_basic_structure(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Фотосинтез зависит от света, воды и углекислого газа.",
            adapted_text="Фотосинтез - это процесс, который помогает растениям жить. Он важен для природы.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("Главная мысль" in issue or "тематической структуре" in issue for issue in result["issues"]))

    def test_validator_flags_legal_informal_substitutions(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            risk_level="high",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Законный представитель вправе направить письменный отзыв в образовательную организацию в течение 30 календарных дней.",
            adapted_text="Родитель может отправить официальный отказ в школу в течение 30 рабочих дней.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("бытовая замена" in issue.lower() for issue in result["issues"]))

    def test_validator_flags_legal_representative_substitution(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            risk_level="high",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Законный представитель вправе получить ответ от образовательной организации.",
            adapted_text="Родитель может получить ответ от школы.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("бытовая замена" in issue.lower() or "сроков, адресатов" in issue.lower() for issue in result["issues"]))

    def test_validator_flags_missing_legal_sections(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            risk_level="high",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Документ описывает участников, условия, срок отзыва и право образовательной организации на ответ.",
            adapted_text="Документ в целом описывает правила обработки данных и порядок взаимодействия сторон.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("юридически значимым разделам" in issue for issue in result["issues"]))

    def test_external_additions_ban_appears_in_prompt(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="educational",
            source_text="В тексте указано только основное определение.",
            retrieved_chunks=None,
        )

        self.assertIn("Не добавляй примеры, причины, термины, объяснения или выводы", prompt)

    def test_prompt_includes_golden_template(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="educational",
            source_text="Текст объясняет, что такое фотосинтез, как он происходит и почему важен.",
            retrieved_chunks=None,
        )

        self.assertIn("golden template", prompt)
        self.assertIn("Главная мысль", prompt)
        self.assertIn("Не придумывай отсутствующие разделы", prompt)

    def test_educational_validator_flags_co2_if_source_has_only_word(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Растения используют углекислый газ и воду.",
            adapted_text="Главная мысль: растения используют CO2 и воду.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("новая нотация" in issue.lower() for issue in result["issues"]))

    def test_educational_validator_flags_o2_if_source_has_only_word(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="key_points_focus",
            strategy_mode="mode_b",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="В процессе образуется кислород.",
            adapted_text="# Главное\n- Образуется O2.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("новая нотация" in issue.lower() for issue in result["issues"]))

    def test_educational_validator_flags_broad_unsupported_expansion(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_a",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Фотосинтез помогает растениям получать вещества.",
            adapted_text="Главная мысль: фотосинтез всегда полностью обеспечивает жизнь всех растений на Земле.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("слишком широкое обобщение" in issue.lower() for issue in result["issues"]))

    def test_educational_prompt_contains_no_new_notation_rule(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="educational",
            source_text="Растения используют углекислый газ и воду.",
            retrieved_chunks=None,
        )

        self.assertIn("EDUCATIONAL NO-NEW-NOTATION RULES", prompt)
        self.assertIn("Не вводи новые обозначения", prompt)

    def test_fiction_prompt_contains_preservation_rules(self) -> None:
        prompt = build_adaptation_system_prompt(
            "basic_simplify",
            genre="fiction",
            source_text="Егор молчал, а кораблик качался на воде.",
            retrieved_chunks=None,
        )

        self.assertIn("FICTION PRESERVATION RULES", prompt)
        self.assertIn("narrative structure", prompt)
        self.assertIn("атмосферу", prompt)

    def test_scientific_popular_prompt_contains_clarity_rules(self) -> None:
        prompt = build_adaptation_system_prompt(
            "structured_explanation",
            genre="scientific_popular",
            source_text="Текст объясняет, как возникает явление и почему оно важно.",
            retrieved_chunks=None,
        )

        self.assertIn("SCIENTIFIC-POPULAR CLARITY RULES", prompt)
        self.assertIn("scientific correctness", prompt)
        self.assertIn("cognitive overload", prompt)
        self.assertIn("3-5 крупных смысловых блоков", prompt)

    def test_post_polish_splits_combined_steps_without_semantic_rewrite(self) -> None:
        polished = post_polish_adaptation_output(
            adapted_text="### Шаг 1 / Шаг 2\nСначала откройте окно. Затем заполните форму.",
            product_mode="structured_explanation",
            genre="instruction",
        )

        self.assertIn("### Шаг 1", polished)
        self.assertIn("### Шаг 2", polished)
        self.assertIn("Сначала откройте окно. Затем заполните форму.", polished)

    def test_post_polish_fixes_mixed_markdown_heading_markup(self) -> None:
        polished = post_polish_adaptation_output(
            adapted_text="**### Шаг 1.** Подготовьте материал.",
            product_mode="structured_explanation",
            genre="educational",
        )

        self.assertIn("### Шаг 1. Подготовьте материал.", polished)
        self.assertNotIn("**###", polished)

    def test_scientific_popular_post_polish_removes_nested_step_heading_markup(self) -> None:
        polished = post_polish_adaptation_output(
            adapted_text="## ### Шаг 1. Как начинается процесс",
            product_mode="structured_explanation",
            genre="scientific_popular",
        )

        self.assertEqual(polished, "### Шаг 1. Как начинается процесс")
        self.assertNotIn("## ###", polished)

    def test_scientific_popular_post_polish_removes_bold_wrapped_step_heading(self) -> None:
        polished = post_polish_adaptation_output(
            adapted_text="**### Шаг 1. Как начинается процесс**",
            product_mode="structured_explanation",
            genre="scientific_popular",
        )

        self.assertEqual(polished, "### Шаг 1. Как начинается процесс")
        self.assertNotIn("**###", polished)

    def test_post_polish_removes_internal_protected_span_labels(self) -> None:
        polished = post_polish_adaptation_output(
            adapted_text=(
                "[critical/exact] legal_actor: обучающийся\n"
                "[critical/near_exact] legal_modality: допускается\n"
                "legal_condition\n"
                "Текст должен остаться читабельным."
            ),
            product_mode="basic_simplify",
            genre="legal",
        )

        self.assertNotIn("[critical/exact]", polished)
        self.assertNotIn("legal_actor:", polished)
        self.assertNotIn("legal_condition", polished)
        self.assertIn("обучающийся", polished)
        self.assertIn("допускается", polished)
        self.assertIn("Текст должен остаться читабельным.", polished)

    def test_validator_flags_mixed_markdown_heading_markup(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="educational",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Сначала растение получает свет, затем образует вещества.",
            adapted_text="**### Шаг 1.** Растение получает свет.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("heading syntax" in issue.lower() for issue in result["issues"]))

    def test_scientific_popular_structured_validator_flags_nested_heading_markup(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="scientific_popular",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Текст объясняет процесс и его значение.",
            adapted_text=(
                "# Тема\n\n## Короткое объяснение\n\nВводный абзац.\n\n"
                "## ### Шаг 1. Как начинается процесс\nТекст шага.\n\n## Почему это важно\nИтог."
            ),
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("не должны быть вложенными" in issue.lower() for issue in result["issues"]))

    def test_validator_flags_legal_actor_action_shift(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="legal",
            risk_level="high",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Письменный отзыв направляется законным представителем в образовательную организацию. После получения отзыва организация прекращает обработку персональных данных.",
            adapted_text="Организация направляет письменный отзыв и после этого прекращает обработку данных.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("субъекта действия" in issue.lower() for issue in result["issues"]))

    def test_validator_flags_fiction_interpretive_additions(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="basic_simplify",
            strategy_mode="mode_b",
            genre="fiction",
            risk_level="high",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Марина не стала спорить. Рядом плыл кораблик.",
            adapted_text="Марина молча согласилась. Рядом плыл большой корабль.",
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("fiction" in issue.lower() for issue in result["issues"]))

    def test_validator_flags_scientific_popular_micro_fragmentation(self) -> None:
        contract = get_adaptation_output_contract(
            product_mode="structured_explanation",
            strategy_mode="mode_a",
            genre="scientific_popular",
            risk_level="medium",
        )
        result = validate_adaptation_output_contract(
            contract=contract,
            source_text="Текст объясняет явление как последовательный процесс с несколькими крупными этапами.",
            adapted_text=(
                "### Шаг 1\nА\n\n### Шаг 2\nБ\n\n### Шаг 3\nВ\n\n### Шаг 4\nГ\n\n### Шаг 5\nД\n\n### Шаг 6\nЕ"
            ),
        )

        self.assertEqual(result["contract_status"], "needs_review")
        self.assertTrue(any("микрошагов" in issue.lower() for issue in result["issues"]))

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
