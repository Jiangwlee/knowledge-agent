// src/pipeline/index-updater.ts — Wiki index management
//
// Maintains _index/master.md as the LLM entry point.
// Uses structured parse → modify → serialize instead of fragile string replacement.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getSubDir } from '../config.js';
import { writeFileAtomic } from './atomic-write.js';

interface MasterIndex {
  /** Lines before the Recent Sources section */
  header: string[];
  /** Source wikilinks (without bullet prefix) */
  recentSources: string[];
  /** Lines between Recent Sources and Statistics */
  middle: string[];
  /** Statistics counts */
  stats: { sources: number; concepts: number; maps: number };
  /** Lines after Statistics */
  footer: string[];
}

/**
 * Parse master.md into structured sections.
 */
function parseMasterIndex(content: string): MasterIndex {
  const lines = content.split('\n');

  const result: MasterIndex = {
    header: [],
    recentSources: [],
    middle: [],
    stats: { sources: 0, concepts: 0, maps: 0 },
    footer: [],
  };

  type Section = 'header' | 'recentSources' | 'middle' | 'stats' | 'footer';
  let section: Section = 'header';

  for (const line of lines) {
    if (line.startsWith('## Recent Sources')) {
      result.header.push(line);
      section = 'recentSources';
      continue;
    }

    if (line.startsWith('## Statistics')) {
      result.middle.push(line);
      section = 'stats';
      continue;
    }

    // Detect start of a new ## section after Statistics
    if (section === 'stats' && line.startsWith('## ')) {
      section = 'footer';
    }

    switch (section) {
      case 'header':
        result.header.push(line);
        break;
      case 'recentSources': {
        const linkMatch = line.match(/^- \[\[(.+)\]\]$/);
        if (linkMatch) {
          result.recentSources.push(linkMatch[1]);
        } else if (line.startsWith('## ')) {
          // Hit next section
          result.middle.push(line);
          section = 'middle';
        }
        // Skip empty lines and placeholders like "_Empty._"
        break;
      }
      case 'middle':
        result.middle.push(line);
        break;
      case 'stats': {
        const statsMatch = line.match(/^- (Sources|Concepts|Maps): (\d+)$/);
        if (statsMatch) {
          const key = statsMatch[1].toLowerCase() as 'sources' | 'concepts' | 'maps';
          result.stats[key] = Number(statsMatch[2]);
        }
        break;
      }
      case 'footer':
        result.footer.push(line);
        break;
    }
  }

  return result;
}

/**
 * Serialize a MasterIndex back to markdown.
 */
function serializeMasterIndex(index: MasterIndex): string {
  const lines: string[] = [...index.header];

  // Recent Sources
  lines.push('');
  if (index.recentSources.length === 0) {
    lines.push('_Empty._');
  } else {
    for (const link of index.recentSources) {
      lines.push(`- [[${link}]]`);
    }
  }
  lines.push('');

  // Middle (includes ## Statistics heading)
  lines.push(...index.middle);

  // Statistics values
  lines.push('');
  lines.push(`- Sources: ${index.stats.sources}`);
  lines.push(`- Concepts: ${index.stats.concepts}`);
  lines.push(`- Maps: ${index.stats.maps}`);

  // Footer
  if (index.footer.length > 0) {
    lines.push('');
    lines.push(...index.footer);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Count .md files in a directory. Returns 0 if directory doesn't exist.
 */
function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => f.endsWith('.md')).length;
}

/**
 * Update _index/master.md to include a new source entry.
 * Also refreshes the statistics section.
 */
export function updateMasterIndex(sourceFilename: string): void {
  const wikiDir = getSubDir('wiki');
  const masterPath = join(wikiDir, '_index', 'master.md');

  if (!existsSync(masterPath)) {
    return;
  }

  const content = readFileSync(masterPath, 'utf-8');
  const index = parseMasterIndex(content);

  // Add source if not already present
  const sourceLink = `sources/${sourceFilename}`;
  if (!index.recentSources.includes(sourceLink)) {
    index.recentSources.unshift(sourceLink);
  }

  // Update statistics from disk
  index.stats.sources = countMdFiles(join(wikiDir, 'sources'));
  index.stats.concepts = countMdFiles(join(wikiDir, 'concepts'));
  index.stats.maps = countMdFiles(join(wikiDir, 'maps'));

  writeFileAtomic(masterPath, serializeMasterIndex(index));
}
