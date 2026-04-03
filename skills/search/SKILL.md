---
name: search
description: >-
  Use when: navigating the wiki to find information, answering user queries,
  or locating relevant articles during compile/lint operations.
  Do NOT use when: importing new material (use ingest).
---

# Search

Navigate the compiled wiki using layered index loading to find, verify, and
synthesize information.

This skill is for **querying the compiled knowledge base**, not for scanning raw
notes blindly. Treat the wiki as a structured knowledge system:

- `maps/` = high-level overviews, comparisons, timelines
- `concepts/` = synthesized topic articles
- `sources/` = evidence layer and source-specific summaries
- `_index/` = navigation layer

Default posture: answer like a small research task, not like a keyword search.

Library-first rule:

1. `kb-agent nav` — inspect entrypoints and knowledge maturity
2. Read `SCHEMA.md` and `_index/master.md`
3. Follow indexes and article links to navigate to the right materials
4. Use `kb-agent evidence "<path>" --mode json` to normalize selected articles

If the index structure does not lead to enough relevant material, treat that as
a knowledge-base gap. Do not compensate by scanning the whole library like a
search engine.

## Navigation Strategy

Follow this hierarchy — never scan all files blindly:

1. **Start with `kb-agent nav`** — inspect entrypoints and current knowledge maturity
2. **Read `_index/master.md`** — get the global overview, topics, and recent sources
3. **Follow index files and article links** — move from high-level structure into specific articles
4. **Prefer synthesized knowledge first** — read relevant `maps/` and `concepts/` before diving into `sources/`
5. **Verify against evidence** — use `kb-agent evidence` or direct reads on selected `sources/` files to confirm important claims, dates, definitions, and contested points
6. **Cross-reference** — follow `[[wikilinks]]` within articles to find related content

If the wiki is sparse or immature and only source summaries exist, say so
explicitly and answer with appropriately reduced confidence.

## Answering Questions

When answering a user query:

1. Run `kb-agent nav` first unless you already have the current wiki state in hand
2. Read the index structure before reading specific articles
3. Prefer `maps/` and `concepts/` for the main answer structure
4. Use `kb-agent evidence` on selected article paths before forming the answer
5. Use `sources/` to support or check the answer's factual basis
6. If the index cannot lead you to enough relevant material, state that the current knowledge base is insufficient
7. Synthesize across multiple articles when applicable
8. **Distinguish fact from synthesis**
   - Facts: directly supported by cited wiki articles
   - Synthesis: conclusions drawn by combining multiple cited articles
9. **State uncertainty clearly**
   - If the wiki is incomplete, say that the current knowledge base is insufficient
   - If only one weak source is available, do not present strong conclusions
10. **Never fabricate** — only state what the cited wiki articles support

## Output Format

Use Obsidian-compatible markdown and structure the response as:

## Answer

Give the direct answer first. Be concise but complete.

## References

List the wiki articles you actually used, one per bullet, using `[[wikilinks]]`.
Prefer including synthesized articles first, then supporting sources.

## Notes

Use this section for one or more of:

- Fact vs inference clarification
- Scope limits in the current wiki
- Confidence reduction when the wiki only has partial coverage

Do not omit `References`, even for short answers.
