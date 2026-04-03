// src/commands/compile.ts — Compile: transform markdown extractions into wiki knowledge
//
// Quick compile: single source → wiki/sources/ summary + index update (triggered by ingest)
// Deep compile: cross-source synthesis → concepts/ + maps/ + _index/ (Phase 4)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { runAgent } from '../pi.js';
import { getPreset, resolveRunOptions } from '../presets.js';
import { updateMasterIndex } from '../pipeline/index-updater.js';

/**
 * Quick compile: single markdown source → wiki/sources/ summary + index update.
 * Called automatically after ingest.
 *
 * The librarian agent (loaded via preset) provides wiki architecture knowledge.
 * The compile skill provides output format requirements.
 * This function only passes the task-specific data as the prompt.
 */
export async function quickCompile(markdownPath: string, opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');
  const markdownContent = readFileSync(markdownPath, 'utf-8');
  const sourceFilename = basename(markdownPath, '.md');

  // Prompt only contains the task and data — architecture/rules come from agent + skill
  const prompt = `Quick compile: generate a wiki/sources/ summary for the following article.

File: ${sourceFilename}.md
Output to: wiki/sources/${sourceFilename}.md

${markdownContent}`;

  const preset = getPreset('compile');
  const runOptions = resolveRunOptions(preset, {
    prompt,
    model: opts.model,
  });

  try {
    const result = await runAgent(runOptions);

    if (result.content.trim()) {
      // Save source summary
      const sourcesDir = join(wikiDir, 'sources');
      mkdirSync(sourcesDir, { recursive: true });
      const sourcePath = join(sourcesDir, `${sourceFilename}.md`);
      writeFileSync(sourcePath, result.content.trim() + '\n', 'utf-8');
      console.log(`Source summary: wiki/sources/${sourceFilename}.md`);

      // Update master index
      updateMasterIndex(sourceFilename);
      console.log('Master index updated.');
    } else {
      console.error('Quick compile produced empty output.');
    }
  } catch (err: any) {
    console.error(`Quick compile failed: ${err.message || err}`);
    console.error('The markdown file has been saved. You can retry with: kb-agent compile');
  }
}

/**
 * Deep compile command (Phase 4).
 */
export async function compileCommand(opts: GlobalOptions): Promise<void> {
  console.log('compile: deep compile not yet implemented (Phase 4)');
}
