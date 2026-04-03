// src/pipeline/index-updater.ts — Wiki index management
//
// Maintains _index/master.md as the LLM entry point.
// Adds new source entries and keeps statistics current.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getSubDir } from '../config.js';

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

  let content = readFileSync(masterPath, 'utf-8');

  // Add to Recent Sources section
  const recentMarker = '## Recent Sources';
  const emptyMarker = '_Empty._';
  const sourceLink = `- [[sources/${sourceFilename}]]`;

  if (content.includes(emptyMarker)) {
    // Replace empty placeholder with the first entry
    content = content.replace(emptyMarker, sourceLink);
  } else if (content.includes(recentMarker)) {
    // Check if already listed
    if (!content.includes(`sources/${sourceFilename}`)) {
      // Add at top of Recent Sources list (after the heading)
      content = content.replace(
        recentMarker + '\n',
        recentMarker + '\n\n' + sourceLink + '\n',
      );
    }
  }

  // Update statistics
  const sourcesDir = join(wikiDir, 'sources');
  const conceptsDir = join(wikiDir, 'concepts');
  const mapsDir = join(wikiDir, 'maps');

  const sourceCount = countMdFiles(sourcesDir);
  const conceptCount = countMdFiles(conceptsDir);
  const mapCount = countMdFiles(mapsDir);

  content = content.replace(/- Sources: \d+/, `- Sources: ${sourceCount}`);
  content = content.replace(/- Concepts: \d+/, `- Concepts: ${conceptCount}`);
  content = content.replace(/- Maps: \d+/, `- Maps: ${mapCount}`);

  writeFileSync(masterPath, content, 'utf-8');
}

/**
 * Count .md files in a directory. Returns 0 if directory doesn't exist.
 */
function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => f.endsWith('.md')).length;
}
