---
name: lint
description: >-
  Use when: performing health checks on the wiki — finding and fixing
  contradictions, gaps, orphan articles, broken links, and inconsistencies.
  Discover-and-fix: when you find a problem, fix it immediately in the same pass.
  Do NOT use when: importing material (use ingest) or synthesizing new knowledge (use compile).
---

# Lint

Wiki health check and repair. **Discover and fix in one pass** — you have full write access.

## Philosophy

Lint is "maintenance", not "construction". You fix structural problems and data integrity issues.
You do NOT create new concepts or maps from scratch — that's compile's job.
But you DO fix broken links, update stale references, and add missing cross-references.

## Checks (run all, in order)

### 1. Index Consistency

Verify `_index/` matches actual files on disk:
- Every file in `sources/`, `concepts/`, `maps/` should appear in the relevant index
- Every entry in an index should point to an existing file
- Statistics in `master.md` should match actual file counts

**Fix**: rewrite the index to match reality. Add missing entries, remove stale ones, update counts.

### 2. Orphan Detection

Find articles with **no inbound links** (nothing links to them):
- Read all `.md` files in `sources/`, `concepts/`, `maps/`
- Build a link graph from `[[wikilinks]]`
- Identify files that are never referenced

**Fix**: add references from the most relevant concept or map. If no natural fit, note in `master.md` under a "Needs Classification" section.

### 3. Broken Links

Find `[[wikilinks]]` that point to non-existent files.

**Fix**:
- If the target is a minor typo, correct the link
- If the target is a concept that should exist but doesn't, note it as a "concept candidate" in `master.md` (compile will create it next run)
- If the link is stale (article was renamed/deleted), remove or update it

### 4. Contradiction Detection

Read source summaries and concept articles. Flag claims that directly contradict each other.

**Fix**: add a `> ⚠️ Contradiction` callout in both articles, citing the conflicting source. Do NOT silently resolve — contradictions require transparency. Example:

```markdown
> ⚠️ **Contradiction**: This article states X, but [[sources/other-article]] claims Y. Both sources should be reviewed.
```

### 5. Gap Identification

Look for topics that are **mentioned frequently** in wikilinks or tags but have **no dedicated article**.

**Fix**: add candidates to `master.md` under a "Suggested Topics" section with a brief note on why. Do not create the article — that's compile's job.

### 6. Cross-Domain Connections

Discover non-obvious relationships between articles in different topic areas.

**Fix**: add `## See Also` sections with brief explanations of the connection. Only add connections that are genuinely insightful, not trivial.

## Output

After completing all checks, print a summary:
- Number of issues found per category
- Number of issues fixed
- Any items that need human attention (contradictions, ambiguous cases)

## Language

Match the dominant language of the wiki content.
