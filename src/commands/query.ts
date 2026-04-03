// src/commands/query.ts — Natural language query against the wiki
//
// Single-shot Q&A: sends question to Pi with search skill.
// Pi navigates wiki indexes via tools, finds relevant articles, answers.

import { existsSync } from 'node:fs';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { runAgent } from '../pi.js';
import { getPreset, resolveRunOptions } from '../presets.js';

/**
 * Query command: ask a question against the wiki.
 *
 * The librarian agent + search skill (loaded via preset) handle wiki navigation.
 * We pass the user's question and the data directory path so Pi can use tools.
 */
export async function queryCommand(question: string, opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');

  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  const prompt = `Answer the following question using the knowledge base at ${wikiDir}.

Question: ${question}`;

  const preset = getPreset('query');
  const runOptions = resolveRunOptions(preset, {
    prompt,
    model: opts.model,
    mode: opts.mode as 'text' | 'json' | 'stream' | undefined,
  });
  runOptions.cwd = wikiDir;

  try {
    const result = await runAgent(runOptions);

    if (result.rendered) {
      return;
    }

    if (result.content.trim()) {
      console.log(result.content.trim());
    } else {
      console.log('No answer generated. The knowledge base may not have relevant information.');
    }
  } catch (err: any) {
    console.error(`Query failed: ${err.message || err}`);
  }
}
