// src/pi.ts — Pi subprocess runner
//
// Spawns `pi` in print mode to execute single-shot agent tasks.
// Supports text mode (collect stdout) and json mode (parse JSONL events).
//
// Reference: ~/Github/pi-mono/packages/coding-agent/src/modes/print-mode.ts
//            ~/Github/pi-mono/packages/coding-agent/src/cli/args.ts

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { buildPresetArgs } from './presets.js';

export interface RunAgentOptions {
  /** The prompt to send to Pi */
  prompt: string;
  /** System prompt override */
  systemPrompt?: string;
  /** Skill file paths (each becomes --skill <path>) */
  skills?: string[];
  /** Tool names (comma-joined for --tools) */
  tools?: string[];
  /** Model identifier (e.g. 'anthropic/claude-sonnet-4-6') */
  model?: string;
  /** Thinking level: off/minimal/low/medium/high/xhigh */
  thinking?: string;
  /** Output mode: 'text' (default) collects stdout, 'json' parses JSONL events */
  mode?: 'text' | 'json';
  /** Working directory for the Pi process */
  cwd?: string;
}

export interface RunAgentResult {
  /** Collected text content from the agent response */
  content: string;
}

/**
 * Build the CLI argument array for the pi command.
 */
/**
 * Build the CLI argument array for pi in print mode.
 * Reuses buildPresetArgs for shared flags, adds print-mode specifics.
 */
function buildArgs(options: RunAgentOptions): string[] {
  const args: string[] = ['--no-session', '-p'];
  const mode = options.mode ?? 'text';

  if (mode === 'json') {
    args.push('--mode', 'json');
  }

  // Shared: model, tools, skills, thinking
  const preset = {
    skills: options.skills ?? [],
    tools: options.tools ?? [],
    thinking: options.thinking ?? '',
  };
  args.push(...buildPresetArgs(preset, { model: options.model }));

  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt);
  }

  // Prompt must be last (positional argument for pi)
  args.push(options.prompt);

  return args;
}

/**
 * Parse a JSONL line as a Pi event and extract text_delta content.
 * Returns the delta string if this is a text_delta event, null otherwise.
 */
function extractTextDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const event = JSON.parse(trimmed);
    if (
      event.type === 'message_update' &&
      event.assistantMessageEvent?.type === 'text_delta' &&
      typeof event.assistantMessageEvent.delta === 'string'
    ) {
      return event.assistantMessageEvent.delta;
    }
  } catch {
    // Non-JSON line, ignore
  }
  return null;
}

/**
 * Run a Pi agent in single-shot print mode.
 *
 * Spawns `pi` with the given options, collects the response, and returns it.
 * In text mode, stdout is collected directly.
 * In json mode, JSONL events are parsed and text_delta content is assembled.
 */
export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const args = buildArgs(options);
  const mode = options.mode ?? 'text';

  return new Promise((resolve, reject) => {
    const proc = spawn('pi', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: options.cwd,
    });

    let content = '';
    let stderr = '';

    if (mode === 'json') {
      const rl = createInterface({ input: proc.stdout! });
      rl.on('line', (line) => {
        const delta = extractTextDelta(line);
        if (delta !== null) {
          content += delta;
        }
      });
    } else {
      proc.stdout!.on('data', (chunk: Buffer) => {
        content += chunk.toString();
      });
    }

    proc.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ content: content.trim() });
      } else {
        reject(new Error(
          `Pi process exited with code ${code}.${stderr ? ' Stderr: ' + stderr.trim() : ''}`
        ));
      }
    });
  });
}
