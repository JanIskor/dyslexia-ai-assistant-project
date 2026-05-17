# Golden adaptation templates for educational and legal genres

## Назначение документа

Документ задаёт эталонные шаблоны результата для двух приоритетных жанров:

- `educational`
- `legal`

Эти шаблоны нужны retrieval-слою не как источник новых фактов, а как источник устойчивой формы результата.

## Общий принцип

Если document tags совпадают по:

- `genre`
- `product mode`

то golden template chunk должен иметь повышенный retrieval priority и помогать системе удерживать форму результата.

## Educational golden templates

### `basic_simplify`

Ожидаемое поведение:

- pedagogical rewrite;
- short educational title;
- `Главная мысль`;
- thematic sections;
- short coherent explanations;
- no new facts;
- no new notation.

Рекомендуемая структура:

```text
# [Тема]

Главная мысль: ...

## 1. Что это такое
## 2. Как это происходит
## 3. От чего зависит
## 4. Почему это важно

Вывод: ...
```

### `structured_explanation`

Ожидаемое поведение:

- process / logic steps;
- clear sequential transitions;
- stable teaching layout;
- no invented steps.

Рекомендуемая структура:

```text
# [Тема]

### Шаг 1.
### Шаг 2.
### Шаг 3.

### Что получается в результате
### Почему это важно
```

### `key_points_focus`

Ожидаемое поведение:

- learning anchors;
- concise bullets;
- no full retelling;
- preserve terminology;
- no new notation.

Рекомендуемая структура:

```text
# Главное

- ...

## Важно

- ...

## Запомнить

- ...
```

## Legal golden templates

### Общий принцип

Юридический текст относится к preservation-first жанрам.

Даже если teacher выбирает product mode с более свободной pedagogical целью, retrieval должен усиливать:

- `mode_b`;
- near-source preservation;
- structural adaptation instead of free paraphrase.

### `basic_simplify`

Ожидаемое поведение:

- structured near-source adaptation;
- neutral document title;
- sections for subjects, regulation scope, conditions, deadlines, rights;
- wording remains close to source.

### `structured_explanation`

Ожидаемое поведение:

- document structure steps;
- participants, conditions, restrictions and deadlines are shown as blocks;
- not a household retelling.

### `key_points_focus`

Ожидаемое поведение:

- obligations / conditions / rights extraction;
- preserve restrictions, exceptions and deadlines;
- concise, but still legally accurate.

Рекомендуемая структура:

```text
# [Название документа]

## 1. Кто участвует
## 2. Что регулируется
## 3. Какие сведения или действия указаны
## 4. Ограничения и условия
## 5. Срок действия / отзыв / изменение
## 6. Право на запрос / ответ / действие организации
```

## Retrieval guidance

Golden template chunk получает повышенный приоритет, если:

- document looks like methodology golden template;
- tags include matching `genre`;
- tags include matching `product mode`.

## Связанные теги применения

### Методы адаптации

- `basic_simplify`
- `structured_explanation`
- `key_points_focus`

### Стратегии адаптации

- `mode_a`
- `mode_b`

### Жанры

- `educational`
- `legal`
