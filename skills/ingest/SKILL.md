---
name: ingest
description: >-
  Use when: importing new raw material into the knowledge base (URL, file, text).
  Do NOT use when: querying, compiling, or linting the wiki.
---

# Ingest

Import raw material and produce a markdown extraction + quick compile.

## Commands

- `kb-agent ingest <url>` — fetch URL content, save as markdown
- `kb-agent ingest <file>` — process local file (PDF/docx → markdown, images → description)
- `kb-agent ingest --text` — accept piped/pasted text

## Pipeline

```
Input → raw/ (binary only) → markdown/ (all content) → wiki/sources/ (quick compile)
```

## Implementation

Phase 2.
