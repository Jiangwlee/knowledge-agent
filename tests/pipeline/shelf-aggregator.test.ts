import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { formatShelfAggregateSummary, scanSourceClassifications } from '../../src/pipeline/shelf-aggregator.js';

let testDir: string;
let wikiDir: string;

function writeSource(name: string, content: string) {
  writeFileSync(join(wikiDir, 'sources', `${name}.md`), content, 'utf-8');
}

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-shelf-agg-${Date.now()}`);
  wikiDir = join(testDir, 'wiki');
  mkdirSync(join(wikiDir, 'sources'), { recursive: true });
  mkdirSync(join(wikiDir, '_index', 'by-topic'), { recursive: true });
  process.env.KB_AGENT_DATA_DIR = testDir;
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
});

describe('scanSourceClassifications', () => {
  it('classifies assigned, unassigned, and invalid sources', () => {
    writeSource('assigned-a', `---
kind: source
title: Assigned A
source_type: discussion
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);

    writeSource('unassigned-a', `---
kind: source
title: Unassigned A
source_type: discussion
primary_subject: mixed workflow notes
candidate_shelves: []
recommended_shelf: null
unassigned: true
---

Body.
`);

    writeSource('invalid-a', `---
kind: source
title: Invalid A
source_type: discussion
primary_subject: invalid sample
candidate_shelves:
  - AI Agent Systems
recommended_shelf: LLM Models
unassigned: false
---

Body.
`);

    const scan = scanSourceClassifications();
    expect(scan.assigned).toHaveLength(1);
    expect(scan.unassigned).toHaveLength(1);
    expect(scan.invalid).toHaveLength(1);
    expect(scan.invalid[0].issue).toContain('recommended_shelf');
  });

  it('aggregates sources into active stage1 shelves', () => {
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

    const scan = scanSourceClassifications();
    expect(scan.aggregates).toHaveLength(1);
    expect(scan.aggregates[0].shelf).toBe('AI Agent Systems');
    expect(scan.aggregates[0].activationStatus).toBe('active_stage1');
    expect(scan.aggregates[0].sourceCount).toBe(3);
  });

  it('marks shelves as stage2 when concept/map signals emerge', () => {
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

    const scan = scanSourceClassifications();
    expect(scan.aggregates[0].activationStatus).toBe('active_stage2');
    expect(scan.aggregates[0].hasConceptCandidates).toBe(true);
    expect(scan.aggregates[0].hasMapCandidates).toBe(true);
  });

  it('formats a readable aggregate summary', () => {
    writeSource('one', `---
kind: source
title: one
source_type: discussion
primary_subject: harness design for long-running ai agents
candidate_shelves:
  - AI Agent Systems
recommended_shelf: AI Agent Systems
unassigned: false
---

Body.
`);

    const summary = formatShelfAggregateSummary(scanSourceClassifications());
    expect(summary).toContain('Assigned sources: 1');
    expect(summary).toContain('AI Agent Systems');
  });
});
