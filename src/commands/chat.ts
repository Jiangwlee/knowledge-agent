// src/commands/chat.ts — Interactive chat with the knowledge base (Pi TUI)
//
// Thin wrapper: spawns Pi in interactive mode with stdio inherited.
// The user interacts directly with Pi's TUI. We just configure the right
// agent + skills + tools and hand off control.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { getPreset, buildPresetArgs } from '../presets.js';

/**
 * Chat command: spawn Pi in interactive mode with inherited stdio.
 * The user talks directly to Pi's TUI — we just set up the context.
 */
export async function chatCommand(opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');

  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  const preset = getPreset('chat');
  const args = buildPresetArgs(preset, { model: opts.model });

  return new Promise((resolve, reject) => {
    const proc = spawn('pi', args, {
      stdio: 'inherit',
      cwd: wikiDir,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Pi exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(
          'pi not found. Install pi-coding-agent:\n' +
          '  npm i -g @mariozechner/pi-coding-agent'
        ));
      } else {
        reject(new Error(`Failed to start Pi: ${err.message}`));
      }
    });
  });
}
