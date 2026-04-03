---
name: search
description: >-
  Use when: navigating the wiki to find information, answering user queries,
  or locating relevant articles during compile/lint operations.
  Do NOT use when: importing new material (use ingest).
---

# Search

Navigate the wiki using layered index loading to find and synthesize information.

## Navigation Strategy

Follow this hierarchy — never scan all files blindly:

1. **Read `_index/master.md`** — get the global overview, topic list, recent sources
2. **Follow topic indexes** — if `_index/by-topic.md` or similar exists, use it to narrow scope
3. **Read specific articles** — open `sources/`, `concepts/`, or `maps/` files as needed
4. **Cross-reference** — follow `[[wikilinks]]` within articles to find related content

## Answering Questions

When answering a user query:

1. Navigate to relevant articles using the strategy above
2. Synthesize information from multiple sources when applicable
3. **Always cite sources** — reference the wiki articles you drew from: `[[sources/article-name]]`
4. **Distinguish fact from inference** — if the wiki doesn't contain enough information, say so explicitly
5. **Never fabricate** — only state what the sources support

## Output Format

- Use Obsidian-compatible markdown
- Cite with `[[wikilinks]]` to the articles you referenced
- Be concise but complete — the user asked a specific question, answer it directly
