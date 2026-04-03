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

When available, prefer the query primitives over raw file-system searching:

1. `kb-agent nav` — inspect entrypoints and knowledge maturity
2. `kb-agent lookup "<query>" --mode json` — retrieve grouped candidates
3. `kb-agent evidence "<path>" --mode json` — read normalized evidence

Only fall back to raw `find` / `grep` / `ls` / `read` when:

- the query primitives are unavailable
- the primitives return insufficient coverage
- you need targeted verification after using the primitives

## Navigation Strategy

Follow this hierarchy — never scan all files blindly:

1. **Start with `kb-agent nav`** — inspect entrypoints and current knowledge maturity
2. **Use `kb-agent lookup`** — get grouped candidates across `maps/`, `concepts/`, and `sources/`
3. **Prefer synthesized knowledge first** — read relevant `maps/` and `concepts/` before diving into `sources/`
4. **Verify against evidence** — use `kb-agent evidence` or raw reads on `sources/` to confirm important claims, dates, definitions, and contested points
5. **Cross-reference** — follow `[[wikilinks]]` within articles to find related content

If the wiki is sparse or immature and only source summaries exist, say so
explicitly and answer with appropriately reduced confidence.

## Answering Questions

When answering a user query:

1. Run `kb-agent nav` first unless you already have the current wiki state in hand
2. Run `kb-agent lookup` to identify candidate articles
3. Prefer `maps/` and `concepts/` for the main answer structure
4. Use `kb-agent evidence` on the best candidates before forming the answer
5. Use `sources/` to support or check the answer's factual basis
6. Synthesize across multiple articles when applicable
7. **Distinguish fact from synthesis**
   - Facts: directly supported by cited wiki articles
   - Synthesis: conclusions drawn by combining multiple cited articles
8. **State uncertainty clearly**
   - If the wiki is incomplete, say that the current knowledge base is insufficient
   - If only one weak source is available, do not present strong conclusions
9. **Never fabricate** — only state what the cited wiki articles support

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
