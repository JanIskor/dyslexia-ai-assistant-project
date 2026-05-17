# Semantic Validation Pipeline

## Purpose

This document defines post-generation semantic validation.

Validation must detect:
- meaning drift;
- protected span loss;
- factual distortion;
- actor replacement;
- causal corruption.

---

# Validation Stages

## 1. Protected Span Validation

Check:
- protected spans preserved;
- no forbidden replacements;
- no semantic weakening.

---

## 2. Actor Validation

Check:
- who performs action;
- who owns right;
- who has obligation.

Especially important for legal genre.

---

## 3. Modality Validation

Check preservation of:
- вправе;
- обязан;
- допускается;
- запрещается;
- не допускается.

---

## 4. Deadline Validation

Check preservation of:
- dates;
- periods;
- procedural timing;
- deadlines.

---

## 5. Causal Validation

Check:
- causal relations preserved;
- scientific logic preserved;
- educational process meaning preserved.

---

## 6. Fiction Narrative Validation

Check:
- atmosphere preserved;
- emotional dynamics preserved;
- imagery preserved;
- symbolic meaning preserved.

---

# Critical Distortion Rules

Generation is rejected if:
- actor changes;
- obligation changes;
- modality changes;
- new unsupported fact appears;
- protected span removed;
- causal structure destroyed.

---

# Regeneration Policy

If critical distortion detected:
- launch regeneration;
- reduce rewriting freedom;
- strengthen preservation priority;
- hard-lock protected spans.