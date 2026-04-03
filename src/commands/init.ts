// src/commands/init.ts — Initialize knowledge base directory structure
//
// Creates: raw/, markdown/, wiki/{SCHEMA.md, sources/, concepts/, maps/, _index/master.md}, config.json
// Idempotent: skips existing directories, does not overwrite existing files.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDataDir, getSubDir, getConfigPath, writeConfig } from '../config.js';

const SCHEMA_INITIAL = `# Knowledge Base Schema

This file describes the organization of the wiki. The LLM reads this file
to understand how to maintain the wiki structure.

## Directory Structure

- **sources/** — One summary per ingested document (1:1 with markdown/)
- **concepts/** — Concept articles synthesized across multiple sources
- **maps/** — High-level maps: topic overviews, timelines, comparisons
- **_index/** — Navigation indexes for LLM (layered loading)

## Candidate Shelves

- **AI Agent Systems** — agent architecture, harnesses, workflows, tool use, evaluation loops, engineering practice
- **LLM Models** — training, alignment, inference, reasoning, benchmarks, capabilities
- **Trading** — stock trading, strategy, execution, market structure, risk management
- **Design** — UI/UX, web design, interaction patterns, visual systems, frontend experience
- **GitHub Projects** — specific project architecture, evolution, implementation choices, maintenance practice

## Rules

1. Every source in markdown/ MUST have a corresponding summary in sources/
2. Concept articles link to their source summaries via [[wikilinks]]
3. Maps link to concepts and sources they synthesize
4. _index/master.md is always kept up-to-date as the top-level entry point
`;

// Obsidian app.json: enable wikilinks, no strict line breaks
const OBSIDIAN_APP_CONFIG = JSON.stringify({
  useMarkdownLinks: false,     // Use [[wikilinks]] not [](markdown links)
  strictLineBreaks: true,      // Standard markdown line breaks
  showFrontmatter: false,      // Hide YAML frontmatter in preview
}, null, 2);

const MASTER_INDEX_INITIAL = `# Master Index

> LLM entry point: read this file first to navigate the knowledge base.

## Query Protocol

Navigation rule:
1. Pick the most relevant bookshelf.
2. Within that bookshelf, read the shelf page for reading order and available material.
3. For mature shelves (with Maps/Concepts/Sources/Gaps sections), choose by question type.
4. For young shelves (flat source list), scan the listed sources directly.
5. If the shelf does not contain enough material, say so clearly.

## Bookshelves

_No active bookshelves yet. Compile more sources to activate a shelf._

## Cross-Cutting Views

These are perspectives inside bookshelves, not top-level bookshelves:
- Best Practices
- Comparisons
- Timelines
- Open Questions

## Recent Activity

_No structural activity yet._

## Library Status

- Active bookshelves: 0
- Sources: 0
- Concepts: 0
- Maps: 0
`;

export async function initCommand(): Promise<void> {
  const dataDir = getDataDir();
  const wikiDir = getSubDir('wiki');

  // Create directory tree
  const dirs = [
    getSubDir('raw'),
    getSubDir('markdown'),
    join(wikiDir, 'sources'),
    join(wikiDir, 'concepts'),
    join(wikiDir, 'maps'),
    join(wikiDir, '_index'),
    join(wikiDir, '_index', 'by-topic'),
    join(wikiDir, '.obsidian'),
  ];

  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  // Write initial files (skip if exist)
  const files: Array<[string, string]> = [
    [join(wikiDir, 'SCHEMA.md'), SCHEMA_INITIAL],
    [join(wikiDir, '_index', 'master.md'), MASTER_INDEX_INITIAL],
    [join(wikiDir, '.obsidian', 'app.json'), OBSIDIAN_APP_CONFIG],
  ];

  for (const [path, content] of files) {
    if (!existsSync(path)) {
      writeFileSync(path, content, 'utf-8');
    }
  }

  // Write config.json (skip if exists)
  if (!existsSync(getConfigPath())) {
    writeConfig({
      version: '0.1.0',
      createdAt: new Date().toISOString(),
    });
  }

  console.log(`Knowledge base initialized at ${dataDir}`);
}
