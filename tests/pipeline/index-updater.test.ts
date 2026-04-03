// tests/pipeline/index-updater.test.ts — Runtime navigation writer tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rebuildNavigationIndexes, updateMasterIndex } from '../../src/pipeline/index-updater.js';

let testDir: string;
let wikiDir: string;
let masterPath: string;

function writeSource(name: string, content: string) {
  writeFileSync(join(wikiDir, 'sources', `${name}.md`), content, 'utf-8');
}

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-index-${Date.now()}`);
  wikiDir = join(testDir, 'wiki');
  masterPath = join(wikiDir, '_index', 'master.md');
  mkdirSync(join(wikiDir, 'sources'), { recursive: true });
  mkdirSync(join(wikiDir, 'concepts'), { recursive: true });
  mkdirSync(join(wikiDir, 'maps'), { recursive: true });
  mkdirSync(join(wikiDir, '_index', 'by-topic'), { recursive: true });
  writeFileSync(join(wikiDir, 'SCHEMA.md'), `# Knowledge Base Schema

## Candidate Shelves

- **AI Agent Systems** — agent architecture, harnesses, workflows, tool use, evaluation loops, engineering practice
- **LLM Models** — training, alignment, inference, reasoning, benchmarks, capabilities
- **Trading** — stock trading, strategy, execution, market structure, risk management
- **Design** — UI/UX, web design, interaction patterns, visual systems, frontend experience
- **GitHub Projects** — specific project architecture, evolution, implementation choices, maintenance practice
`, 'utf-8');
  process.env.KB_AGENT_DATA_DIR = testDir;
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
});

describe('rebuildNavigationIndexes', () => {
  it('writes a master index with no active bookshelves when nothing is activated', () => {
    writeSource('unassigned', `---
kind: source
title: Unassigned
source_type: discussion
primary_subject: mixed notes
candidate_shelves: []
recommended_shelf: null
unassigned: true
---

Body.
`);

    rebuildNavigationIndexes();

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('## Query Protocol');
    expect(content).toContain('_No active bookshelves yet.');
    expect(content).toContain('- Active bookshelves: 0');
    expect(content).toContain('- Sources: 1');
  });

  it('lists active bookshelves in master.md when a shelf activates', () => {
    for (const name of ['one', 'two', 'three']) {
      writeSource(name, `---
kind: source
title: ${name}
source_type: engineering_practice
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);
    }

    rebuildNavigationIndexes();

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('### AI Agent Systems');
    expect(content).toContain('Sources: 3');
    expect(content).toContain('Status: young');
    expect(content).toContain('[[_index/by-topic/ai-agent-systems]]');
  });

  it('writes a stage1 by-topic page for active stage1 shelves', () => {
    for (const name of ['one', 'two', 'three']) {
      writeSource(name, `---
kind: source
title: ${name}
source_type: engineering_practice
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);
    }

    rebuildNavigationIndexes();

    const shelfPath = join(wikiDir, '_index', 'by-topic', 'ai-agent-systems.md');
    expect(existsSync(shelfPath)).toBe(true);
    const content = readFileSync(shelfPath, 'utf-8');
    expect(content).toContain('# AI Agent Systems');
    expect(content).toContain('## Sources');
    expect(content).toContain('[[sources/one]]');
    expect(content).toContain('## Gaps');
  });

  it('writes a stage2 by-topic page for mature shelves', () => {
    for (const [name, type] of [
      ['one', 'engineering_practice'],
      ['two', 'engineering_practice'],
      ['three', 'discussion'],
      ['four', 'discussion'],
      ['five', 'technical_report'],
    ] as const) {
      writeSource(name, `---
kind: source
title: ${name}
source_type: ${type}
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);
    }

    rebuildNavigationIndexes();

    const shelfPath = join(wikiDir, '_index', 'by-topic', 'ai-agent-systems.md');
    const content = readFileSync(shelfPath, 'utf-8');
    expect(content).toContain('## When To Use This Shelf');
    expect(content).toContain('## Maps');
    expect(content).toContain('## Concepts');
    expect(content).toContain('## Related Shelves');
    expect(content).toContain('## Query Notes');
  });

  it('backward-compatible updateMasterIndex also rebuilds navigation indexes', () => {
    for (const name of ['one', 'two', 'three']) {
      writeSource(name, `---
kind: source
title: ${name}
source_type: engineering_practice
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);
    }

    updateMasterIndex('one');

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('### AI Agent Systems');
  });
});
