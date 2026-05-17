# Forced Methodology Retrieval

## Purpose

This document defines mandatory methodology retrieval rules.

The system must not rely only on semantic vector similarity.

Adaptation generation must always include mandatory methodology documents.

---

# Retrieval Order

## Highest Priority

1. VKR_methodology_authority
2. Protected span policy
3. Genre methodology
4. Golden templates
5. Product mode rules
6. General adaptation rules
7. Semantic retrieval chunks

---

# Mandatory Retrieval

## Always inject

- 01_general_principles.md
- 07_controlled_adaptation_operations.md
- 11_protected_span_policy.md

---

# Genre Mandatory Retrieval

## Legal

- 05_genre_modes_a_b.md
- 06_protected_elements_policy.md
- 08_golden_templates_educational_legal.md

## Educational

- 08_golden_templates_educational_legal.md

## Fiction

- 09_golden_templates_fiction.md

## Scientific-popular

- 10_golden_templates_scientific_popular.md

---

# Product Mode Mandatory Retrieval

Always inject:
- simplify mode rules;
- step-by-step mode rules;
- key-points mode rules.

---

# VKR Methodology Authority

If VKR_метода.docx exists:
- it becomes mandatory retrieval source;
- retrieval threshold must be reduced;
- methodology chunks receive higher score;
- retrieval becomes always-on.

The methodology document acts as authoritative adaptation specification.

---

# Semantic Retrieval

Only after mandatory retrieval:
- top-k semantic chunks may be added.

Semantic retrieval must never override methodology rules.