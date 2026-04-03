---
name: compile
description: >-
  Use when: building or updating wiki knowledge from markdown sources.
  Handles both quick compile (single source) and deep compile (cross-source synthesis).
  Do NOT use when: importing new material (use ingest) or health-checking (use lint).
---

# Compile

Transform markdown extractions into structured wiki knowledge.

## Modes

- **Quick compile** (triggered by ingest): single source → sources/ summary + index update
- **Deep compile** (manual or cron): cross-source synthesis → concepts/ + maps/ + _index/

## Implementation

Phase 2 (quick), Phase 4 (deep).
