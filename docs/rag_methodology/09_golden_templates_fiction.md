# Golden adaptation templates for fiction genre

## Назначение документа

Документ задаёт retrieval-aware golden templates для `fiction`.

Его задача — помогать системе снижать когнитивную нагрузку без разрушения:

- narrative structure;
- atmosphere;
- emotional dynamics;
- imagery;
- authorial tone.

## Общий принцип

Для fiction readability improvement допустим только в том объёме, в котором он не превращает художественный текст в summary, retelling или informational explanation.

## `fiction + basic_simplify`

Ожидаемое поведение:

- narrative-preserving simplification;
- short readable scene blocks;
- clear dialogues;
- сохранение immersion.

Рекомендуемая структура:

```text
# [Название сцены или главы]

Короткий narratively coherent абзац.

Отдельный эмоциональный или сюжетный акцент.

### Реплика персонажа

Короткий описательный блок.
```

## `fiction + structured_explanation`

Ожидаемое поведение:

- episode-aware scene guidance;
- episodes instead of technical steps;
- scene navigation without technicalizing the text.

Рекомендуемая структура:

```text
# [Название сцены]

### Эпизод 1
### Эпизод 2
### Эпизод 3

### Важный поворот
```

## `fiction + key_points_focus`

Ожидаемое поведение:

- scene anchors without plot retelling;
- emphasis on important moments, imagery and emotional tone;
- concise support for reading, not dry summarization.

Рекомендуемая структура:

```text
# Главное в сцене

- ключевое действие
- важное изменение состояния

## Образы и настроение

- опорный образ
- эмоциональный тон
```

## Разрешённые операции

- sentence splitting;
- dialogue separation;
- visual segmentation;
- syntactic simplification;
- selective clarification.

## Запрещённые операции

- plot retelling;
- emotional flattening;
- metaphor destruction;
- atmosphere removal;
- aggressive simplification;
- informational rewriting.

## Связанные теги применения

### Методы адаптации

- `basic_simplify`
- `structured_explanation`
- `key_points_focus`

### Стратегии адаптации

- `mode_a`
- `mode_b`

### Жанры

- `fiction`
