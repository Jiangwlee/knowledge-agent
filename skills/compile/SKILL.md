---
name: compile
description: >-
  Use when: building or updating wiki knowledge from markdown sources.
  Handles both quick compile (single source) and deep compile (cross-source synthesis).
  Do NOT use when: importing new material (use ingest) or health-checking (use lint).
---

# Compile

Transform markdown extractions into structured wiki knowledge.

## Quick Compile（单源编译）

Triggered after ingest. Input: one markdown file from `markdown/`. Output: one summary in `wiki/sources/`.

### Output Requirements

1. **YAML frontmatter** — must include:
   - `title`: article title
   - `source`: original URL or file path (from input frontmatter)
   - `tags`: 3-8 topic tags (lowercase, hyphenated)
   - `date`: ingest date (from input frontmatter)

2. **Summary body** — Obsidian-compatible markdown:
   - Concise but comprehensive summary of the article
   - Key takeaways as a bullet list
   - Use `[[wikilinks]]` to link related concepts (even if the target doesn't exist yet)
   - Preserve source attribution — never fabricate claims not in the original

3. **Language** — match the language of the source material

### Example Output

```markdown
---
title: Attention Is All You Need
source: https://arxiv.org/abs/1706.03762
tags: [transformer, attention, deep-learning, nlp]
date: 2026-04-03
---

## Summary

The paper introduces the Transformer architecture...

## Key Takeaways

- Self-attention replaces recurrence and convolution
- Multi-head attention allows attending to different representation subspaces
- Positional encoding compensates for the lack of recurrence

## Related

- [[attention-mechanism]]
- [[sequence-to-sequence]]
```

## Deep Compile（深度编译）

Phase 4. Cross-source synthesis → `concepts/` + `maps/` + `_index/` updates.
