// src/commands/lint.ts — Wiki health check and repair
//
// Discover-and-fix in one pass: LLM finds problems and fixes them immediately.
// Index consistency is pre-checked by code, then LLM handles content-level checks.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { runAgent } from '../pi.js';
import { getPreset, resolveRunOptions } from '../presets.js';

interface IndexReport {
  missingFromIndex: string[];
  staleInIndex: string[];
  statsCorrect: boolean;
}

/**
 * Pre-check index consistency using code (no LLM needed).
 * Returns a report of files missing from master.md and stale entries.
 */
function checkIndexConsistency(): IndexReport {
  const wikiDir = getSubDir('wiki');
  const masterPath = join(wikiDir, '_index', 'master.md');

  const report: IndexReport = {
    missingFromIndex: [],
    staleInIndex: [],
    statsCorrect: true,
  };

  if (!existsSync(masterPath)) return report;

  const masterContent = readFileSync(masterPath, 'utf-8');

  // Collect actual files
  const dirs = ['sources', 'concepts', 'maps'] as const;
  const actualFiles: Record<string, string[]> = {};

  for (const dir of dirs) {
    const dirPath = join(wikiDir, dir);
    actualFiles[dir] = existsSync(dirPath)
      ? readdirSync(dirPath).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
      : [];
  }

  // Check all wiki directories referenced in master.md
  for (const dir of dirs) {
    for (const file of actualFiles[dir]) {
      if (!masterContent.includes(`${dir}/${file}`)) {
        report.missingFromIndex.push(`${dir}/${file}`);
      }
    }
  }

  // Check for stale references (links to files that don't exist)
  const linkPattern = /\[\[(sources|concepts|maps)\/([^\]]+)\]\]/g;
  let match;
  while ((match = linkPattern.exec(masterContent)) !== null) {
    const dir = match[1] as 'sources' | 'concepts' | 'maps';
    const filename = match[2];
    if (!actualFiles[dir]?.includes(filename)) {
      report.staleInIndex.push(`${dir}/${filename}`);
    }
  }

  // Check statistics
  const sourceCountMatch = masterContent.match(/Sources: (\d+)/);
  const conceptCountMatch = masterContent.match(/Concepts: (\d+)/);
  const mapCountMatch = masterContent.match(/Maps: (\d+)/);

  if (sourceCountMatch && Number(sourceCountMatch[1]) !== actualFiles.sources.length) {
    report.statsCorrect = false;
  }
  if (conceptCountMatch && Number(conceptCountMatch[1]) !== actualFiles.concepts.length) {
    report.statsCorrect = false;
  }
  if (mapCountMatch && Number(mapCountMatch[1]) !== actualFiles.maps.length) {
    report.statsCorrect = false;
  }

  return report;
}

/**
 * Lint command: discover and fix wiki health issues.
 *
 * 1. Code pre-check: index consistency (fast, no LLM)
 * 2. LLM pass: content-level checks (contradictions, orphans, gaps, connections)
 *    with immediate fixes via write tools
 */
export async function lintCommand(opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');

  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  // Step 1: Code-based index consistency check
  console.log('Checking index consistency...');
  const indexReport = checkIndexConsistency();

  const issues: string[] = [];
  if (indexReport.missingFromIndex.length > 0) {
    issues.push(`Missing from index: ${indexReport.missingFromIndex.join(', ')}`);
  }
  if (indexReport.staleInIndex.length > 0) {
    issues.push(`Stale index entries: ${indexReport.staleInIndex.join(', ')}`);
  }
  if (!indexReport.statsCorrect) {
    issues.push('Statistics in master.md are outdated');
  }

  if (issues.length === 0) {
    console.log('Index consistency: OK');
  } else {
    console.log(`Index issues found: ${issues.length}`);
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
  }

  // Step 2: LLM content-level lint + fix
  console.log('Running content-level checks...');

  const indexContext = issues.length > 0
    ? `\nPre-check found these index issues (fix them first):\n${issues.map(i => `- ${i}`).join('\n')}\n`
    : '\nIndex consistency pre-check passed.\n';

  const prompt = `Lint the knowledge base wiki. Discover problems and fix them immediately.
${indexContext}
Run all checks defined in the lint skill:
1. Index consistency (fix the issues listed above if any)
2. Orphan detection
3. Broken links
4. Contradiction detection
5. Gap identification
6. Cross-domain connections

After fixing, print a summary of what you found and what you fixed.`;

  const preset = getPreset('lint');
  const runOptions = resolveRunOptions(preset, {
    prompt,
    model: opts.model,
    mode: opts.mode as 'text' | 'json' | 'stream' | undefined,
  });
  runOptions.cwd = wikiDir;

  try {
    const result = await runAgent(runOptions);

    if (result.rendered) {
      console.log('Lint complete.');
      return;
    }

    if (result.content.trim()) {
      console.log(result.content.trim());
    }

    console.log('Lint complete.');
  } catch (err: any) {
    console.error(`Lint failed: ${err.message || err}`);
  }
}
