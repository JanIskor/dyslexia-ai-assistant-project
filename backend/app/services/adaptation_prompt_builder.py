from dataclasses import dataclass
from typing import Final, Literal

from app.services.adaptation_output_contracts import get_adaptation_output_contract
from app.services.controlled_adaptation_policy_service import build_controlled_adaptation_policy
from app.services.factual_consistency_service import extract_protected_elements


ProductAdaptationMode = Literal["basic_simplify", "structured_explanation", "key_points_focus"]
StrategyAdaptationMode = Literal["mode_a", "mode_b"]
AdaptationMode = Literal[
    "mode_a",
    "mode_b",
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
]
AdaptationGenre = Literal[
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]
MethodologyAdaptationTag = Literal[
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
    "mode_a",
    "mode_b",
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
]

DEFAULT_PRODUCT_ADAPTATION_MODE: Final[ProductAdaptationMode] = "basic_simplify"
DEFAULT_ADAPTATION_MODE: Final[ProductAdaptationMode] = DEFAULT_PRODUCT_ADAPTATION_MODE
DEFAULT_ADAPTATION_GENRE: Final[AdaptationGenre] = "educational"
GENERAL_RETRIEVAL_TAG: Final[str] = "general"
ALL_GENRE_TAGS: Final[set[str]] = {
    "educational",
    "scientific_popular",
    "fiction",
    "legal",
    "instruction",
    "other",
}
ALL_PRODUCT_MODE_TAGS: Final[set[str]] = {
    "basic_simplify",
    "structured_explanation",
    "key_points_focus",
}
ALL_STRATEGY_MODE_TAGS: Final[set[str]] = {"mode_a", "mode_b"}
ALL_MODE_TAGS: Final[set[str]] = ALL_PRODUCT_MODE_TAGS | ALL_STRATEGY_MODE_TAGS
ALL_METHODOLOGY_TAGS: Final[set[str]] = ALL_MODE_TAGS | ALL_GENRE_TAGS


@dataclass(frozen=True)
class RetrievedKnowledgeChunkPromptContext:
    document_title: str
    chunk_index: int
    content: str


BASE_PROMPT: Final[str] = (
    "Ты — ИИ-ассистент для преподавателя, который адаптирует текст "
    "для обучающегося с дислексией. "
    "Сохраняй смысл, факты, учебную точность и коммуникативную задачу исходного текста. "
    "Не придумывай новую информацию и не добавляй того, чего нет в исходном материале. "
    "Не изменяй числа, даты, единицы измерения, формулы, имена, технические обозначения и ключевые термины. "
    "Не добавляй факты, которых нет в исходном тексте. "
    "Не добавляй примеры, причины, термины, объяснения или выводы, которых нет в исходном тексте, даже если они правдоподобны или верны. "
    "Не добавляй новых субъектов действия, новых признаков, новых цветов, новых оценок, новых причин и новых выводов, которых нет в исходном тексте. "
    "Если в тексте есть сложная формула, сохрани её и при необходимости поясни словами, не меняя саму запись. "
    "Верни только готовый адаптированный текст без вводных комментариев от себя."
)

BASE_RAG_GUARDRAILS: Final[str] = (
    "Используй контекст из базы знаний только как методические рекомендации "
    "по адаптации текста для обучающегося с дислексией. "
    "Очень важно: "
    "не добавляй новые предметные факты, которых нет в исходном тексте; "
    "не расширяй содержание исходного материала за счёт внешних знаний; "
    "не подменяй смысл исходного текста новым содержанием; "
    "не добавляй примеры, причины, термины, объяснения или выводы, которых нет в исходном тексте, даже если они кажутся полезными; "
    "не меняй числа, даты, единицы измерения, формулы и технические обозначения; "
    "не используй контекст из базы знаний как источник предметной информации; "
    "используй его только для выбора формы подачи, например: "
    "деление длинных предложений, визуальная сегментация, "
    "синтаксическое упрощение, пояснение терминов, повышение читаемости. "
    "Твоя задача — адаптировать исходный учебный материал, а не дописывать его."
)

MODE_PROMPT_BLOCKS: Final[dict[StrategyAdaptationMode, str]] = {
    "mode_a": (
        "Стратегия адаптации: mode A, сильное педагогическое упрощение. "
        "Разрешены: синтаксическое упрощение, деление длинных предложений, "
        "перестройка структуры, пошаговая подача, переформулирование, "
        "краткие пояснения терминов и повышение визуальной читаемости. "
        "Можно сокращать второстепенные детали, если смысл и учебная точность сохраняются."
    ),
    "mode_b": (
        "Стратегия адаптации: mode B, только структурная адаптация без смыслового переписывания. "
        "Приоритет: максимально точное сохранение смысла, фактов, терминологии, субъектов действия, модальности и ключевых формулировок исходного текста. "
        "Разрешены только: деление длинных предложений, заголовки, маркированные списки, абзацы и визуальная сегментация при сохранении исходного порядка смысла. "
        "Запрещены: синонимическая замена, лексическое упрощение, семантический парафраз, интерпретация, пересказ, суммаризация и добавление примеров. "
        "Нельзя менять субъектов действия, модальность, юридические условия, причинно-следственные связи, эмоциональные или сюжетные импликации. "
        "Сохраняй исходные числа, даты, единицы измерения, формулы, имена, сроки и технические обозначения без изменений."
    ),
}

PRODUCT_MODE_PROMPT_BLOCKS: Final[dict[ProductAdaptationMode, str]] = {
    "basic_simplify": (
        "Метод адаптации: basic_simplify. "
        "Главная педагогическая цель — сделать текст проще и легче для чтения, "
        "снижая перегрузку формулировок."
    ),
    "structured_explanation": (
        "Метод адаптации: structured_explanation. "
        "Главная педагогическая цель — сделать объяснение пошаговым, "
        "последовательным и прозрачным по структуре."
    ),
    "key_points_focus": (
        "Метод адаптации: key_points_focus. "
        "Главная педагогическая цель — выделить главное, опорные идеи и "
        "не перегружать второстепенными деталями."
    ),
}

GENRE_PROMPT_BLOCKS: Final[dict[AdaptationGenre, str]] = {
    "educational": (
        "Жанр: учебный текст. "
        "Сохраняй учебную логику, определения, причинно-следственные связи и последовательность объяснения."
    ),
    "scientific_popular": (
        "Жанр: научно-популярный текст. "
        "Сохраняй научную корректность, но делай объяснение доступным и прозрачным для чтения."
    ),
    "fiction": (
        "Жанр: художественный текст. "
        "Осторожно обращайся с авторским стилем, образностью, ритмом и интонацией."
    ),
    "legal": (
        "Жанр: юридический текст. "
        "Особенно строго сохраняй формулировки, условия, ограничения и нормативный смысл."
    ),
    "instruction": (
        "Жанр: инструкция. "
        "Сохраняй порядок действий, условия выполнения, предупреждения и операционную точность."
    ),
    "other": (
        "Жанр: другой. "
        "Определи наиболее безопасную стратегию адаптации по функции текста и не искажай его назначение."
    ),
}


def is_strategy_mode(mode: str | None) -> bool:
    return mode in ALL_STRATEGY_MODE_TAGS


def is_product_mode(mode: str | None) -> bool:
    return mode in ALL_PRODUCT_MODE_TAGS


def resolve_strategy_mode(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> StrategyAdaptationMode:
    effective_mode = mode or DEFAULT_PRODUCT_ADAPTATION_MODE
    effective_genre = genre or DEFAULT_ADAPTATION_GENRE

    if effective_genre in {"legal", "fiction"}:
        return "mode_b"
    if effective_mode == "mode_b":
        return "mode_b"
    if effective_mode == "mode_a":
        return "mode_a"
    return "mode_a"


def normalize_adaptation_mode(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> StrategyAdaptationMode:
    return resolve_strategy_mode(mode, genre)


def build_retrieval_tags(
    mode: AdaptationMode | None,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> list[str]:
    effective_genre = genre or DEFAULT_ADAPTATION_GENRE
    resolved_strategy = resolve_strategy_mode(mode, effective_genre)
    tags: list[str] = []

    if mode and is_product_mode(mode):
        tags.append(mode)

    if mode and is_strategy_mode(mode):
        tags.append(mode)

    tags.extend([resolved_strategy, effective_genre, GENERAL_RETRIEVAL_TAG])
    return list(dict.fromkeys(tags))


def resolve_mode_filter_tags(
    mode: AdaptationMode | None,
    *,
    genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE,
) -> set[str]:
    if mode is None:
        return set()
    return set(build_retrieval_tags(mode, genre))


def _build_knowledge_context_block(
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None,
) -> str:
    if not retrieved_chunks:
        return ""

    knowledge_context = "\n\n".join(
        (
            f"[Источник: {chunk.document_title}, chunk {chunk.chunk_index}]\n"
            f"{chunk.content.strip()}"
        )
        for chunk in retrieved_chunks[:12]
        if chunk.content.strip()
    )

    if not knowledge_context:
        return ""

    return (
        "Ниже дан дополнительный контекст из базы знаний. "
        "Используй его только как методические рекомендации по форме адаптации, "
        "а не как источник новых предметных фактов.\n\n"
        f"Контекст из базы знаний:\n{knowledge_context}"
    )


def build_adaptation_system_prompt(
    mode: AdaptationMode,
    *,
    genre: AdaptationGenre = DEFAULT_ADAPTATION_GENRE,
    source_text: str,
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None,
    protected_spans: list[dict[str, str]] | None = None,
) -> str:
    normalized_product_mode = mode if is_product_mode(mode) else DEFAULT_PRODUCT_ADAPTATION_MODE
    normalized_mode = normalize_adaptation_mode(mode, genre)
    retrieval_tags = build_retrieval_tags(mode, genre)
    protected_elements = extract_protected_elements(source_text)
    policy = build_controlled_adaptation_policy(
        product_mode=normalized_product_mode,
        strategy_mode=normalized_mode,
        genre=genre,
        original_text=source_text,
        protected_elements=protected_elements,
    )
    output_contract = get_adaptation_output_contract(
        product_mode=normalized_product_mode,
        strategy_mode=normalized_mode,
        genre=genre,
        risk_level=policy["risk_level"],
    )
    prompt_parts = [
        BASE_PROMPT,
        BASE_RAG_GUARDRAILS,
        PRODUCT_MODE_PROMPT_BLOCKS.get(normalized_product_mode),
        MODE_PROMPT_BLOCKS[normalized_mode],
        GENRE_PROMPT_BLOCKS[genre],
        _build_genre_aware_method_behavior_block(
            product_mode=normalized_product_mode,
            genre=genre,
        ),
        f"Уровень риска адаптации: {policy['risk_level']}.",
        policy["policy_summary"],
        _build_genre_specific_guardrails_block(genre=genre),
        _build_visual_markup_guidance_block(genre=genre),
        _build_protected_elements_block(protected_elements),
        _build_protected_spans_block(protected_spans or []),
        _build_operations_block(
            title="Разрешённые операции",
            operations=policy["allowed_operations"],
        ),
        _build_operations_block(
            title="Запрещённые операции",
            operations=policy["forbidden_operations"],
        ),
        _build_output_contract_block(
            product_mode=normalized_product_mode,
            output_contract=output_contract,
            protected_elements=protected_elements,
        ),
        (
            "Правило неопределённости: если ты не уверен, как безопасно упростить фрагмент, "
            "сохрани исходную формулировку. Не придумывай объяснения и не добавляй факты, "
            "примеры, причины, термины или выводы, которых нет в источнике. Защищённые элементы можно только визуально структурировать "
            "или пояснить после сохранения их исходной формы."
        ),
        f"Связанные теги применения: {', '.join(retrieval_tags)}.",
    ]

    knowledge_context_block = _build_knowledge_context_block(retrieved_chunks)
    if knowledge_context_block:
        prompt_parts.append(knowledge_context_block)

    return "\n\n".join(part for part in prompt_parts if part)


def build_adaptation_repair_prompt(
    *,
    original_text: str,
    previous_adapted_text: str,
    protected_spans: list[dict[str, str]],
    validation_issues: list[dict[str, str | None]],
    mode: AdaptationMode,
    genre: AdaptationGenre,
    retrieved_chunks: list[RetrievedKnowledgeChunkPromptContext] | None = None,
) -> str:
    protected_lines = _build_protected_spans_block(protected_spans)
    issue_lines = "\n".join(
        f"- Проблема: {issue['message']}\n  Что исправить: {issue['repair_instruction']}"
        for issue in validation_issues[:12]
    ) or "- Явные ошибки не перечислены."

    genre_block = _build_repair_genre_block(genre=genre)
    knowledge_context_block = _build_knowledge_context_block(retrieved_chunks)

    prompt_parts = [
        "Ты исправляешь уже созданную адаптацию текста для обучающегося с дислексией.",
        "Не переписывай текст заново без необходимости.",
        "Исправь только те места, где были потеряны или искажены защищённые фрагменты.",
        "Не добавляй новые факты, новые субъекты, новые признаки, новые причины, новые выводы и новые интерпретации.",
        "Если читаемость конфликтует с сохранением защищённого фрагмента, сохрани защищённый фрагмент.",
        "Никогда не копируй во внешний ответ служебные маркеры, внутренние типы фрагментов, уровни серьёзности и технические подписи проверки.",
        f"Product mode: {mode}",
        f"Genre: {genre}",
        protected_lines,
        f"Validation issues that must be repaired:\n{issue_lines}",
        (
            "Исходный текст:\n"
            f"{original_text}"
        ),
        (
            "Текущая адаптация, которую нужно исправить:\n"
            f"{previous_adapted_text}"
        ),
        genre_block,
        (
            "Правила repair-pass:\n"
            "- Верни защищённые фрагменты.\n"
            "- Сохрани субъект, действие, срок, условие, исключение и направление действия.\n"
            "- Не усиливай и не ослабляй утверждения.\n"
            "- Улучшай читаемость только структурой, абзацами, заголовками и аккуратной сегментацией.\n"
            "- Верни только исправленный адаптированный текст без пояснений от себя."
        ),
    ]
    if knowledge_context_block:
        prompt_parts.append(knowledge_context_block)
    return "\n\n".join(part for part in prompt_parts if part)


def _build_protected_elements_block(protected_elements: dict[str, list[str]]) -> str:
    visible_items: list[str] = []
    for label, key in (
        ("Числа", "numbers"),
        ("Проценты", "percentages"),
        ("Даты", "dates"),
        ("Диапазоны", "ranges"),
        ("Единицы измерения", "units"),
        ("Формулы", "formulas"),
        ("Технические обозначения", "technical_symbols"),
        ("Имена и сущности", "named_entities"),
        ("Цитируемые термины", "quoted_terms"),
        ("Термины предметной области", "domain_terms"),
        ("Юридические маркеры", "legal_markers"),
        ("Маркеры порядка действий", "action_order_markers"),
        ("Маркеры условий и исключений", "condition_exception_markers"),
    ):
        values = protected_elements.get(key) or []
        if not values:
            continue
        preview = ", ".join(values[:6])
        if len(values) > 6:
            preview += ", ..."
        visible_items.append(f"{label}: {preview}")

    if not visible_items:
        return "Защищённые элементы: явных чувствительных элементов не найдено, но факты всё равно нельзя менять."

    return "Защищённые элементы, которые нужно сохранить без изменения:\n- " + "\n- ".join(visible_items)


def _build_protected_spans_block(protected_spans: list[dict[str, str]]) -> str:
    if not protected_spans:
        return (
            "Protected spans extracted from source text.\n"
            "Защищённые фрагменты источника: явных списков не найдено, "
            "но факты и значимые формулировки всё равно нельзя менять. "
            "Никогда не выводи служебные названия категорий и внутренние метки в итоговом тексте."
        )

    visible_spans = protected_spans[:20]
    exact_spans = [span["text"] for span in visible_spans if span["preservation_mode"] == "exact"]
    near_exact_spans = [
        span["text"] for span in visible_spans if span["preservation_mode"] == "near_exact"
    ]
    semantic_spans = [span["text"] for span in visible_spans if span["preservation_mode"] == "semantic"]
    lines: list[str] = [
        "Protected spans extracted from source text.",
        "Защищённые фрагменты источника. Сохраняй их по степени строгости.",
        "Никогда не копируй во внешний ответ служебные названия категорий, уровни серьёзности и технические метки.",
    ]
    if exact_spans:
        lines.append("Сохрани без изменения:")
        lines.extend(f"- {item}" for item in exact_spans)
    if near_exact_spans:
        lines.append("Сохрани максимально близко к исходной формулировке:")
        lines.extend(f"- {item}" for item in near_exact_spans)
    if semantic_spans:
        lines.append("Сохрани смысл и функцию без расширения значения:")
        lines.extend(f"- {item}" for item in semantic_spans)
    return "\n".join(lines)


def _build_operations_block(*, title: str, operations: list[str]) -> str:
    return f"{title}:\n- " + "\n- ".join(operations)


def _build_genre_specific_guardrails_block(*, genre: AdaptationGenre) -> str:
    if genre == "legal":
        return (
            "LEGAL NEAR-SOURCE RULES:\n"
            "- Сильно предпочитай сохранение исходной формулировки.\n"
            "- Адаптируй через структуру, а не через свободный парафраз.\n"
            "- Не меняй юридический субъект, модальность, условия, исключения, сроки, адресатов и порядок действий.\n"
            "- Не меняй направление действия: тот, кто выполняет действие в исходнике, должен оставаться тем же субъектом в адаптации.\n"
            "- Бережно сохраняй формулировки и маркеры вроде «вправе», «обязан», «допускается», «не допускается», «исключительно», «за исключением», «если иное», «не более», «в течение», «с даты», «до момента», «письменный отзыв», «письменное поручение».\n"
            "- Не заменяй юридически значимые формулировки бытовыми аналогами вроде «законный представитель» -> «родители», «образовательная организация» -> «школа», «обработка данных» -> «сбор и использование», «письменный отзыв» -> «отказ».\n"
            "- Не добавляй примеры, пояснения и выводы, которых нет в исходнике.\n"
            "- Если юридическую фразу трудно упростить безопасно, сохрани её в исходной формулировке и улучши структуру вокруг неё."
        )
    if genre == "educational":
        return (
            "EDUCATIONAL NO-NEW-NOTATION RULES:\n"
            "- Не вводи новые обозначения, символы, формулы, аббревиатуры и технические ярлыки, если их нет в исходнике.\n"
            "- Не заменяй слова символами или формулами.\n"
            "- Не добавляй внешние примеры, причины и широкие выводы.\n"
            "- Не расширяй сферу утверждений словами вроде «все», «всегда», «полностью», «главный», «единственный», если этого нет в источнике.\n"
            "- Сохраняй ключевые термины и scope исходного объяснения без смыслового усиления."
        )
    if genre == "fiction":
        return (
            "FICTION PRESERVATION RULES:\n"
            "- Улучшай читаемость без разрушения narrative structure.\n"
            "- Сохраняй атмосферу, образность, эмоциональную динамику и tone.\n"
            "- Не добавляй новые признаки, цвета, размеры, мотивации, оценки, причины, эмоции и интерпретации, которых нет в исходнике.\n"
            "- Не вводи новых персонажей, ролей, гендера, отношений и идентичностей.\n"
            "- Не превращай «не стала спорить» в «согласилась» и не меняй предметные детали вроде «кораблик» на более общий аналог.\n"
            "- Не объясняй символы и подтекст внутри адаптированного текста.\n"
            "- Не пересказывай сюжет вместо художественной сцены.\n"
            "- Не уничтожай метафоры и не превращай fiction в informational summary."
        )
    if genre == "scientific_popular":
        return (
            "SCIENTIFIC-POPULAR CLARITY RULES:\n"
            "- Сохраняй scientific correctness и educational value.\n"
            "- Снижая cognitive overload, не удаляй causal relationships и key concepts.\n"
            "- Поясняй термины бережно и не вводи новые факты.\n"
            "- Усиливай hierarchy, segmentation и readability без scientific distortion.\n"
            "- В structured_explanation группируй материал в 3-5 крупных смысловых блоков, а не в множество микрошагов."
        )
    return ""


def _build_genre_aware_method_behavior_block(
    *,
    product_mode: ProductAdaptationMode,
    genre: AdaptationGenre,
) -> str:
    if product_mode == "basic_simplify" and genre == "educational":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- basic_simplify + educational = pedagogical rewrite.\n"
            "- Используй стабильную объяснительную учебную структуру.\n"
            "- Сохраняй термины, причинно-следственные связи и scope исходного утверждения.\n"
            "- Не добавляй новые факты и новые обозначения."
        )
    if product_mode == "basic_simplify" and genre == "legal":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- basic_simplify + legal = structured near-source adaptation.\n"
            "- Улучшай структуру документа, но минимизируй rewriting.\n"
            "- Сохраняй юридические конструкции, ограничения, сроки и условия максимально близко к source."
        )
    if product_mode == "structured_explanation" and genre == "educational":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- structured_explanation + educational = process/logic steps.\n"
            "- Шаги должны отражать реальную учебную или причинно-следственную логику текста.\n"
            "- Не смешивай markdown heading и bold в одной строке. Нельзя писать «**### Шаг 1.**».\n"
            "- Используй отдельные заголовки формата «### Шаг 1. Название шага»."
        )
    if product_mode == "structured_explanation" and genre == "legal":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- structured_explanation + legal = document structure steps.\n"
            "- Показывай участников, условия, ограничения, сроки и права как структурные блоки документа, а не как бытовой пересказ."
        )
    if product_mode == "key_points_focus" and genre == "educational":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- key_points_focus + educational = learning anchors.\n"
            "- Выделяй главную мысль, важные условия и опорные термины без полного пересказа."
        )
    if product_mode == "key_points_focus" and genre == "legal":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- key_points_focus + legal = obligations/conditions/rights extraction.\n"
            "- Выделяй права, обязанности, условия, ограничения, сроки и исключения без потери юридической точности."
        )
    if product_mode == "basic_simplify" and genre == "fiction":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- basic_simplify + fiction = narrative-preserving simplification.\n"
            "- Улучшай navigability, но не разрушай immersion и эмоциональный ритм сцены."
        )
    if product_mode == "structured_explanation" and genre == "fiction":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- structured_explanation + fiction = episode-aware scene guidance.\n"
            "- Делай эпизоды и диалоги читаемее, но не превращай сцену в техническую инструкцию.\n"
            "- Для fiction используй эпизоды, а не шаги.\n"
            "- Используй форму «### Эпизод 1. ...», а не технические шаги."
        )
    if product_mode == "key_points_focus" and genre == "fiction":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- key_points_focus + fiction = scene anchors without retelling.\n"
            "- Выделяй важные моменты, настроение и опорные образы без сухого summary."
        )
    if product_mode == "basic_simplify" and genre == "scientific_popular":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- basic_simplify + scientific_popular = scientifically safe pedagogical rewrite.\n"
            "- Сохраняй causal logic и scientific correctness, уменьшая cognitive overload."
        )
    if product_mode == "structured_explanation" and genre == "scientific_popular":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- structured_explanation + scientific_popular = process/logic explanation.\n"
            "- Разбивай объяснение на понятные causal steps без scientific distortion.\n"
            "- Группируй материал в 3-5 крупных смысловых блоков, а не в микрошаги."
        )
    if product_mode == "key_points_focus" and genre == "scientific_popular":
        return (
            "GENRE-AWARE METHOD BEHAVIOR:\n"
            "- key_points_focus + scientific_popular = concept anchors.\n"
            "- Выделяй ключевые понятия, связи и ограничения без потери образовательной ценности."
        )
    return ""


def _build_visual_markup_guidance_block(*, genre: AdaptationGenre) -> str:
    common_rule = (
        "CLEAN MARKDOWN RULES:\n"
        "- Используй только чистый Markdown без HTML и технических маркеров.\n"
        "- Не смешивай heading syntax и bold в одной строке.\n"
        "- Предпочитай заголовки, короткие абзацы, списки и умеренное **bold** там, где это действительно помогает чтению."
    )

    if genre in {"educational", "scientific_popular"}:
        return (
            f"{common_rule}\n"
            "- Для учебных и научно-популярных текстов допустимо умеренно выделять **термины**, ключевые сущности и главную мысль блока.\n"
            "- Логические переходы и причинно-следственные связи делай заметными через структуру фразы, отдельные абзацы и списки, а не через декоративную разметку."
        )
    if genre == "legal":
        return (
            f"{common_rule}\n"
            "- Для legal используй сдержанную разметку: нейтральные заголовки, списки и умеренное **bold** только для субъектов, сроков, прав, обязанностей и запретов.\n"
            "- Не используй агрессивную разметку, которая может визуально исказить юридические акценты."
        )
    if genre == "fiction":
        return (
            f"{common_rule}\n"
            "- Для fiction основная помощь — абзацы, реплики и эпизоды.\n"
            "- Не перегружай художественный текст **bold** и не выделяй мораль или символ, если этого нет прямо в исходнике."
        )
    return common_rule


def _build_repair_genre_block(*, genre: AdaptationGenre) -> str:
    if genre == "legal":
        return (
            "LEGAL REPAIR RULES:\n"
            "- Legal wording has priority over simplification.\n"
            "- Preserve legal actors, legal actions, modality, deadlines, conditions and exceptions.\n"
            "- Do not narrow subjects and do not change direction of action."
        )
    if genre == "fiction":
        return (
            "FICTION REPAIR RULES:\n"
            "- Preserve narrative actions, imagery, emotional tone and ambiguity.\n"
            "- Do not add new adjectives, details or interpretations.\n"
            "- Do not turn the scene into summary."
        )
    if genre in {"educational", "scientific_popular"}:
        return (
            "EDUCATIONAL/SCIENTIFIC REPAIR RULES:\n"
            "- Preserve scope, terms and causal relations.\n"
            "- Do not add unsupported generalization, external explanation or new notation."
        )
    return (
        "GENERAL REPAIR RULES:\n"
        "- Preserve protected spans and avoid semantic drift.\n"
        "- Improve readability only through safe structure."
    )


def _build_output_contract_block(
    *,
    product_mode: ProductAdaptationMode,
    output_contract: dict[str, object],
    protected_elements: dict[str, list[str]],
) -> str:
    preserve_categories = [
        label
        for label, key in (
            ("числа", "numbers"),
            ("даты", "dates"),
            ("единицы измерения", "units"),
            ("формулы", "formulas"),
            ("термины", "important_terms"),
            ("условия и исключения", "condition_exception_markers"),
            ("порядок действий", "action_order_markers"),
        )
        if protected_elements.get(key)
    ]
    preserve_text = ", ".join(preserve_categories) if preserve_categories else "ключевые факты и формулировки"
    required_structure = "\n- ".join(output_contract["required_structure"])
    forbidden_patterns = "\n- ".join(output_contract["forbidden_output_patterns"])
    format_instructions = "\n- ".join(output_contract["format_instructions"])
    golden_template_title = output_contract.get("golden_template_title")
    golden_template_structure = output_contract.get("golden_template_structure") or []
    golden_template_rules = output_contract.get("golden_template_rules") or []
    golden_template_block = ""
    if golden_template_title:
        template_structure_lines = "\n- ".join(golden_template_structure)
        template_rule_lines = "\n- ".join(golden_template_rules)
        golden_template_block = (
            f"\n- golden template: {golden_template_title}\n"
            f"- golden template structure:\n- {template_structure_lines}\n"
            f"- golden template rules:\n- {template_rule_lines}\n"
            "- do not invent missing sections:\n"
            "- Не придумывай отсутствующие разделы.\n"
            "- Используй только те разделы, которые действительно поддержаны исходным текстом."
        )
    return (
        "OUTPUT CONTRACT:\n"
        f"- product mode: {product_mode}\n"
        f"- output type: {output_contract['title']}\n"
        f"- purpose: {output_contract['purpose']}\n"
        f"- required format:\n- {required_structure}\n"
        f"- do not produce:\n- {forbidden_patterns}\n"
        f"- preserve: {preserve_text}\n"
        f"- format instructions:\n- {format_instructions}"
        f"{golden_template_block}"
    )
