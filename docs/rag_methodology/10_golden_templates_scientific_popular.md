# Golden adaptation templates for scientific-popular genre

## Назначение документа

Документ задаёт genre-aware methodology для `scientific_popular`.

Его задача — снижать cognitive overload без потери:

- scientific correctness;
- educational value;
- key concepts;
- causal relationships;
- explanatory logic.

## Общий принцип

Scientific-popular adaptation должна помогать читать и понимать текст, но не превращать научное объяснение в vague summary или бытовой пересказ.

## `scientific_popular + basic_simplify`

Ожидаемое поведение:

- scientifically safe pedagogical rewrite;
- clear hierarchy;
- reduced overload;
- careful term clarification.

Рекомендуемая структура:

```text
# [Тема]

Короткое вводное объяснение.

## Основная идея

## Как это работает

## Важный термин

## Почему это важно
```

## `scientific_popular + structured_explanation`

Ожидаемое поведение:

- process / logic explanation;
- causal steps;
- no distortion of scientific sequence.

Рекомендуемая структура:

```text
# Как это работает

## Шаг 1. Исходное условие
## Шаг 2. Что происходит дальше
## Шаг 3. Какой получается результат

## Почему это важно
```

## `scientific_popular + key_points_focus`

Ожидаемое поведение:

- concept anchors;
- concise key ideas;
- preserved educational logic.

Рекомендуемая структура:

```text
# Главное

- ключевое понятие
- ключевая связь

## Важно

- условие или ограничение
- важный термин

## Запомнить

- главный вывод без расширения scope
```

## Разрешённые операции

- sentence splitting;
- terminology clarification;
- semantic segmentation;
- hierarchy enhancement;
- visual restructuring;
- controlled simplification.

## Запрещённые операции

- scientific distortion;
- oversimplification causing misinformation;
- removal of causal relationships;
- factual inaccuracies;
- deletion of key concepts.

## Связанные теги применения

### Методы адаптации

- `basic_simplify`
- `structured_explanation`
- `key_points_focus`

### Стратегии адаптации

- `mode_a`
- `mode_b`

### Жанры

- `scientific_popular`
