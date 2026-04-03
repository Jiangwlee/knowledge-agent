// src/pipeline/index-updater.ts — Runtime navigation index writer
//
// Rebuilds _index/master.md and stage-1 by-topic shelf pages from aggregated
// source classifications. This keeps runtime navigation aligned with the
// library-first architecture instead of incrementally patching old sections.

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSubDir } from '../config.js';
import { writeFileAtomic } from './atomic-write.js';
import { slugify } from './markdown.js';
import { scanSourceClassifications, type ShelfAggregate } from './shelf-aggregator.js';

const SHELF_DESCRIPTIONS: Record<string, string> = {
  'AI Agent Systems': 'AI agents, harnesses, workflows, tool use, evaluation loops, engineering practice.',
  'LLM Models': 'Training, alignment, inference, reasoning, benchmarks, capabilities.',
  Trading: 'Stock trading, strategy, execution, market structure, risk management.',
  Design: 'UI/UX, web design, interaction patterns, visual systems, frontend experience.',
  'GitHub Projects': 'Repositories, architectures, implementation notes, maintainers, project evolution.',
};

function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => name.endsWith('.md')).length;
}

function titleForShelf(shelf: string): string {
  return shelf;
}

function activeShelves(aggregates: ShelfAggregate[]): ShelfAggregate[] {
  return aggregates.filter((aggregate) =>
    aggregate.activationStatus === 'active_stage1' || aggregate.activationStatus === 'active_stage2',
  );
}

function renderMasterIndex(aggregates: ShelfAggregate[], wikiDir: string): string {
  const active = activeShelves(aggregates);
  const totalSources = countMdFiles(join(wikiDir, 'sources'));
  const totalConcepts = countMdFiles(join(wikiDir, 'concepts'));
  const totalMaps = countMdFiles(join(wikiDir, 'maps'));

  const lines: string[] = [
    '# Master Index',
    '',
    '> LLM entry point: read this file first to navigate the knowledge base.',
    '',
    '## Query Protocol',
    '',
    'Navigation rule:',
    '1. Pick the most relevant bookshelf.',
    '2. Within that bookshelf, read the shelf page for reading order and available material.',
    '3. For mature shelves (with Maps/Concepts/Sources/Gaps sections), choose by question type:',
    '   - "what is X" -> Concepts',
    '   - "how / compare / overview" -> Maps',
    '   - "evidence / who said" -> Sources',
    '   - "does the library cover this" -> Gaps',
    '4. For young shelves (flat source list), scan the listed sources directly.',
    '5. If the shelf does not contain enough material, say so clearly — treat it as a knowledge gap, not a search failure.',
    '',
    '## Bookshelves',
    '',
  ];

  if (active.length === 0) {
    lines.push('_No active bookshelves yet. Compile more sources to activate a shelf._');
  } else {
    for (const aggregate of active) {
      lines.push(`### ${titleForShelf(aggregate.shelf)}`);
      lines.push(`Focus: ${SHELF_DESCRIPTIONS[aggregate.shelf] ?? 'Shelf description pending.'}`);
      lines.push(`Sources: ${aggregate.sourceCount}`);
      lines.push(`Status: ${aggregate.activationStatus === 'active_stage2' ? 'mature' : 'young'}`);
      lines.push(`Shelf page: [[_index/by-topic/${slugify(aggregate.shelf)}]]`);
      lines.push('');
    }
    if (lines[lines.length - 1] === '') {
      // keep a single separator after the shelf list
    }
  }

  lines.push('## Cross-Cutting Views');
  lines.push('');
  lines.push('These are perspectives inside bookshelves, not top-level bookshelves:');
  lines.push('- Best Practices');
  lines.push('- Comparisons');
  lines.push('- Timelines');
  lines.push('- Open Questions');
  lines.push('');
  lines.push('## Recent Activity');
  lines.push('');

  const activity = active.slice(0, 5).map((aggregate) => {
    if (aggregate.activationStatus === 'active_stage2') {
      return `- Shelf matured — ${aggregate.shelf}`;
    }
    return `- Shelf active — ${aggregate.shelf}`;
  });
  if (activity.length === 0) {
    lines.push('_No structural activity yet._');
  } else {
    lines.push(...activity);
  }

  lines.push('');
  lines.push('## Library Status');
  lines.push('');
  lines.push(`- Active bookshelves: ${active.length}`);
  lines.push(`- Sources: ${totalSources}`);
  lines.push(`- Concepts: ${totalConcepts}`);
  lines.push(`- Maps: ${totalMaps}`);
  lines.push('');

  return lines.join('\n');
}

function renderStage1ShelfPage(aggregate: ShelfAggregate): string {
  const lines: string[] = [
    `# ${titleForShelf(aggregate.shelf)}`,
    '',
    `> ${SHELF_DESCRIPTIONS[aggregate.shelf] ?? 'Shelf description pending.'}`,
    '',
    '## Sources',
    '',
  ];

  for (const sourcePath of aggregate.sourcePaths) {
    lines.push(`- [[${sourcePath.replace(/\.md$/, '')}]]`);
  }

  lines.push('');
  lines.push('## Gaps');
  lines.push('');

  const notes = aggregate.notes.filter((note) => note !== 'Below initial activation threshold.');
  if (notes.length === 0) {
    lines.push('- [suggested] Concept coverage is still incomplete.');
  } else {
    for (const note of notes.slice(0, 5)) {
      lines.push(`- [suggested] ${note}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function renderStage2ShelfPage(aggregate: ShelfAggregate): string {
  const lines: string[] = [
    `# ${titleForShelf(aggregate.shelf)}`,
    '',
    `> ${SHELF_DESCRIPTIONS[aggregate.shelf] ?? 'Shelf description pending.'}`,
    '',
    '## When To Use This Shelf',
    '',
    `Use this shelf for questions about ${SHELF_DESCRIPTIONS[aggregate.shelf] ?? aggregate.shelf.toLowerCase()}`,
    '',
    '## Reading Order',
    '',
    '1. Start with `Maps` for overview, comparison, and how-to questions.',
    '2. Go to `Concepts` for term definitions and boundaries.',
    '3. Use `Sources` for evidence, attribution, and original claims.',
    '4. Check `Gaps` if the shelf does not contain enough material.',
    '',
    '## Maps',
    '',
    '_No stable maps generated yet._',
    '',
    '## Concepts',
    '',
    '_No stable concepts generated yet._',
    '',
    '## Sources',
    '',
  ];

  for (const sourcePath of aggregate.sourcePaths) {
    lines.push(`- [[${sourcePath.replace(/\.md$/, '')}]]`);
  }

  lines.push('');
  lines.push('## Gaps');
  lines.push('');
  for (const note of aggregate.notes.slice(0, 5)) {
    lines.push(`- [suggested] ${note}`);
  }
  lines.push('');
  lines.push('## Related Shelves');
  lines.push('');
  lines.push('_None yet._');
  lines.push('');
  lines.push('## Query Notes');
  lines.push('');
  lines.push('See `_index/master.md` Query Protocol for general navigation rules.');
  lines.push('');

  return lines.join('\n');
}

function writeShelfPages(aggregates: ShelfAggregate[], wikiDir: string): void {
  const byTopicDir = join(wikiDir, '_index', 'by-topic');
  mkdirSync(byTopicDir, { recursive: true });

  for (const aggregate of activeShelves(aggregates)) {
    const path = join(byTopicDir, `${slugify(aggregate.shelf)}.md`);
    const content = aggregate.activationStatus === 'active_stage2'
      ? renderStage2ShelfPage(aggregate)
      : renderStage1ShelfPage(aggregate);
    writeFileAtomic(path, content);
  }
}

export function rebuildNavigationIndexes(): void {
  const wikiDir = getSubDir('wiki');
  const indexDir = join(wikiDir, '_index');
  mkdirSync(indexDir, { recursive: true });

  const scan = scanSourceClassifications(wikiDir);
  const masterPath = join(indexDir, 'master.md');
  writeFileAtomic(masterPath, renderMasterIndex(scan.aggregates, wikiDir));
  writeShelfPages(scan.aggregates, wikiDir);
}

/**
 * Backward-compatible entrypoint used by quickCompile. The source filename is
 * ignored because the writer now rebuilds master.md from aggregated source
 * classifications rather than patching a Recent Sources list.
 */
export function updateMasterIndex(_sourceFilename?: string): void {
  rebuildNavigationIndexes();
}
