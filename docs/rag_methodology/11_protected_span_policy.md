# Protected Span Policy

## Purpose

This document defines protected spans and semantic preservation requirements used during adaptation generation.

Protected spans are text fragments that must preserve their semantic meaning during adaptation.

The system must prioritize protected span preservation over readability optimization.

---

# General Rules

Protected spans MUST NOT be:
- semantically replaced;
- generalized;
- weakened;
- strengthened;
- interpreted;
- emotionally rewritten;
- converted into бытовые аналоги;
- omitted.

Allowed operations:
- sentence splitting;
- visual segmentation;
- formatting;
- local clarification nearby;
- hierarchy restructuring.

---

# Legal Protected Spans

## Protected Classes

- legal_actor
- legal_action
- legal_modality
- legal_condition
- legal_exception
- legal_deadline
- legal_procedure
- rights_and_obligations
- operational_constraints

## Examples

- вправе
- обязан
- допускается
- не допускается
- исключительно
- за исключением
- если иное
- не более
- в течение
- с даты
- до момента
- письменный отзыв

## Legal Preservation Rules

Legal protected spans must preserve:
- actor;
- modality;
- condition;
- deadline;
- procedural meaning.

Legal simplification must never become бытовой пересказ.

---

# Educational Protected Spans

Protected:
- definitions;
- process names;
- scientific entities;
- causal relations;
- educational terminology.

Allowed:
- controlled simplification;
- restructuring;
- segmentation.

Forbidden:
- scientific distortion;
- unsupported simplification.

---

# Fiction Protected Spans

Protected:
- atmosphere;
- imagery;
- emotional tone;
- symbolic objects;
- narrative implications;
- metaphorical structures.

Forbidden:
- emotional reinterpretation;
- atmosphere flattening;
- symbolic replacement;
- narrative rewriting.

---

# Scientific-popular Protected Spans

Protected:
- scientific claims;
- causal chains;
- terminology;
- factual structures;
- cognitive mechanisms.

Forbidden:
- unsupported generalization;
- simplification causing misinformation;
- deletion of causal structures.