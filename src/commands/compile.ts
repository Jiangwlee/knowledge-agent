// src/commands/compile.ts — Compile: transform markdown extractions into wiki knowledge
//
// Quick compile: single source → wiki/sources/ summary + index update (triggered by ingest)
// Deep compile: LLM-autonomous cross-source synthesis → concepts/ + maps/ + _index/ (Phase 4)

import { readFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFileAtomic } from '../pipeline/atomic-write.js';
import { join, basename } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir, getConfigPath, readConfig, writeConfig } from '../config.js';
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
    mode: opts.mode as 'text' | 'json' | 'stream' | undefined,
  });

  try {
    const result = await runAgent(runOptions);

    if (result.content.trim()) {
      // Save source summary
      const sourcesDir = join(wikiDir, 'sources');
      mkdirSync(sourcesDir, { recursive: true });
      const sourcePath = join(sourcesDir, `${sourceFilename}.md`);
      writeFileAtomic(sourcePath, result.content.trim() + '\n');
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
 * List source filenames that were added after the last deep compile.
 * Returns all sources if no previous compile timestamp exists.
 */
function getNewSources(lastCompileTime: number): string[] {
  const sourcesDir = join(getSubDir('wiki'), 'sources');
  if (!existsSync(sourcesDir)) return [];

  return readdirSync(sourcesDir)
    .filter(f => f.endsWith('.md'))
    .filter(f => {
      const mtime = statSync(join(sourcesDir, f)).mtimeMs;
      return mtime > lastCompileTime;
    })
    .map(f => basename(f, '.md'));
}

/**
 * Deep compile command: LLM-autonomous cross-source synthesis.
 *
 * The LLM reads the current wiki state, identifies new/unprocessed sources,
 * and creates/updates concepts, maps, indexes, and SCHEMA.md.
 * Pi has write access to the wiki directory via tools.
 */
export async function compileCommand(opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');

  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  // Determine new sources since last compile
  const config = readConfig();
  const lastCompileTime = config?.lastDeepCompile
    ? new Date(config.lastDeepCompile).getTime()
    : 0;
  const newSources = getNewSources(lastCompileTime);

  if (newSources.length === 0) {
    console.log('No new sources since last deep compile. Nothing to do.');
    return;
  }

  console.log(`Deep compile: ${newSources.length} new source(s) to process.`);

  // Build prompt with incremental context
  const sourcesList = newSources.map(s => `- sources/${s}.md`).join('\n');
  const prompt = `Deep compile: synthesize new sources into concepts, maps, and indexes.

New sources since last compile:
${sourcesList}

Read these sources and the current wiki state (_index/master.md, SCHEMA.md, existing concepts/ and maps/).
Then:
1. Create or update concept articles in concepts/ for topics that span multiple sources
2. Create or update maps in maps/ for high-level overviews
3. Update _index/ to reflect all changes
4. Update SCHEMA.md if the wiki structure has evolved

Work incrementally — extend existing articles rather than rewriting them.`;

  const preset = getPreset('compile');
  const runOptions = resolveRunOptions(preset, {
    prompt,
    model: opts.model,
    mode: opts.mode as 'text' | 'json' | 'stream' | undefined,
  });
  runOptions.cwd = wikiDir;

  try {
    const result = await runAgent(runOptions);

    if (result.content.trim()) {
      console.log(result.content.trim());

      // Only record timestamp when LLM produced output
      const currentConfig = readConfig() ?? { version: '0.1.0', createdAt: new Date().toISOString() };
      writeConfig({ ...currentConfig, lastDeepCompile: new Date().toISOString() });
      console.log('Deep compile complete. Timestamp recorded.');
    } else {
      console.error('Deep compile produced empty output. Timestamp not updated — will retry next run.');
    }
  } catch (err: any) {
    console.error(`Deep compile failed: ${err.message || err}`);
  }
}
