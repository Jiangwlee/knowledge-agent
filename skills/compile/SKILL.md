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

Cross-source synthesis. You have full write access to the wiki — create, update, and reorganize as needed.

### What You Do

1. **Read `_index/master.md`** to understand current state
2. **Identify new/unprocessed sources** — sources in `sources/` that haven't been synthesized into concepts yet (check wikilink references)
3. **Create or update `concepts/` articles** — synthesize knowledge across multiple sources into standalone concept articles
4. **Create or update `maps/` articles** — high-level overviews, timelines, comparison tables that connect multiple concepts
5. **Update `_index/`** — keep master.md, by-topic.md, and other indexes current
6. **Update `SCHEMA.md`** — if the wiki's organizational structure has evolved, reflect it

### Concepts (`concepts/`)

A concept article synthesizes knowledge about **one topic** from **multiple sources**.

```markdown
---
title: Transformer Architecture
tags: [transformer, deep-learning, architecture]
sources: [attention-is-all-you-need, bert-paper, gpt-overview]
date: 2026-04-03
---

## Overview

Brief definition and significance.

## Key Ideas

- Idea 1 — synthesized from [[sources/attention-is-all-you-need]] and [[sources/bert-paper]]
- Idea 2 — ...

## Related Concepts

- [[self-attention]]
- [[positional-encoding]]
```

Rules:
- A concept must reference **at least 2 sources** — single-source knowledge stays in `sources/`
- Always cite which sources support each claim
- Use `[[wikilinks]]` liberally to connect concepts

### Maps (`maps/`)

A map provides a **bird's-eye view** across multiple concepts.

Types:
- **Topic overview** — "Map of Deep Learning Architectures"
- **Timeline** — chronological progression of a field
- **Comparison** — structured comparison table across approaches
- **Learning path** — suggested reading order for a topic

```markdown
---
title: Deep Learning Architectures Overview
type: topic-overview
tags: [deep-learning, architecture, map]
date: 2026-04-03
---

## Landscape

Brief overview of the field.

## Architectures

| Architecture | Key Innovation | Era | Sources |
|---|---|---|---|
| CNN | Spatial feature extraction | 2012 | [[sources/alexnet]] |
| Transformer | Self-attention | 2017 | [[sources/attention-is-all-you-need]] |

## Related Concepts

- [[concepts/transformer-architecture]]
- [[concepts/convolutional-networks]]
```

Rules:
- Maps synthesize across **concepts**, not directly from sources
- Always include links to the concepts and sources that inform the map

### Incremental Strategy

- Only process sources that are **new since last deep compile**
- When updating existing concepts/maps, **extend** rather than rewrite — add new information, update dates
- If a concept has grown too large, consider splitting it
- If new sources reveal connections between existing concepts, create a new map

### SCHEMA.md Maintenance

After making structural changes, update `SCHEMA.md` to reflect:
- New topic categories that have emerged
- Changes to the organizational hierarchy
- New conventions or patterns you've established
