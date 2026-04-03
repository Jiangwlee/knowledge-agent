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

/** Default timeout for Pi subprocess in milliseconds (5 minutes) */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

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
  /** Output mode: text collects stdout, json parses JSONL, stream renders JSONL live */
  mode?: 'text' | 'json' | 'stream';
  /** Working directory for the Pi process */
  cwd?: string;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
}

export interface RunAgentResult {
  /** Collected text content from the agent response */
  content: string;
  /** Whether stdout was already rendered directly by the runner */
  rendered: boolean;
}

/**
 * Build the CLI argument array for pi in print mode.
 * Reuses buildPresetArgs for shared flags, adds print-mode specifics.
 */
function buildArgs(options: RunAgentOptions): string[] {
  const args: string[] = ['--no-session', '-p'];
  const mode = options.mode ?? 'text';

  if (mode === 'json' || mode === 'stream') {
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

interface StreamState {
  inTextStream: boolean;
  lineOpen: boolean;
  pendingTrailingNewlines: string;
  assistantStreamOpen: boolean;
  pendingTools: Map<string, { name: string; argsSummary: string }>;
}

function summarizeArgs(args: unknown): string {
  if (!args || typeof args !== 'object') return '';

  const entries = Object.entries(args as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 3)
    .map(([key, value]) => {
      const rendered = typeof value === 'string' ? value : JSON.stringify(value);
      const compact = rendered.length > 60 ? `${rendered.slice(0, 57)}...` : rendered;
      return `${key}=${compact}`;
    });

  return entries.join(' ');
}

function summarizeResult(result: unknown): string {
  if (result === undefined || result === null) return '';
  const rendered = typeof result === 'string' ? result : JSON.stringify(result);
  const compact = rendered.replace(/\s+/g, ' ').trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

function splitVisibleAndTrailing(delta: string): [string, string] {
  const stripped = delta.replace(/\n+$/, '');
  return [stripped, delta.slice(stripped.length)];
}

function flushTrailingNewlines(state: StreamState, compact: boolean): void {
  if (!state.pendingTrailingNewlines) return;
  process.stdout.write(compact ? '\n' : state.pendingTrailingNewlines);
  state.lineOpen = !compact && !state.pendingTrailingNewlines.endsWith('\n');
  state.pendingTrailingNewlines = '';
}

function ensureLineClosed(state: StreamState): void {
  if (state.pendingTrailingNewlines) {
    process.stdout.write('\n');
    state.pendingTrailingNewlines = '';
    state.lineOpen = false;
  }
  if (state.lineOpen) {
    process.stdout.write('\n');
    state.lineOpen = false;
  }
  state.inTextStream = false;
  state.assistantStreamOpen = false;
}

function renderStreamEvent(line: string, state: StreamState): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let event: any;
  try {
    event = JSON.parse(trimmed);
  } catch {
    ensureLineClosed(state);
    process.stdout.write(`${trimmed}\n`);
    return null;
  }

  if (event.type === 'message_update') {
    const assistantEvent = event.assistantMessageEvent ?? {};
    if (
      assistantEvent.type === 'text_delta' &&
      typeof assistantEvent.delta === 'string'
    ) {
      flushTrailingNewlines(state, !state.assistantStreamOpen);
      if (!state.inTextStream) {
        process.stdout.write('[assistant] ');
        state.inTextStream = true;
        state.lineOpen = true;
      }
      state.assistantStreamOpen = true;
      const [visible, trailing] = splitVisibleAndTrailing(assistantEvent.delta);
      if (visible) {
        process.stdout.write(visible);
        state.lineOpen = true;
      }
      if (trailing) {
        state.pendingTrailingNewlines += trailing;
      }
      return assistantEvent.delta;
    }

    if (assistantEvent.type === 'text_end' && state.inTextStream) {
      state.inTextStream = false;
      state.assistantStreamOpen = false;
    }
    return null;
  }

  if (event.type === 'tool_execution_start') {
    flushTrailingNewlines(state, true);
    ensureLineClosed(state);
    state.pendingTools.set(String(event.toolCallId ?? ''), {
      name: String(event.toolName ?? 'tool'),
      argsSummary: summarizeArgs(event.args),
    });
    return null;
  }

  if (event.type === 'tool_execution_end') {
    flushTrailingNewlines(state, true);
    ensureLineClosed(state);
    const toolCallId = String(event.toolCallId ?? '');
    const tool = state.pendingTools.get(toolCallId) ?? {
      name: String(event.toolName ?? 'tool'),
      argsSummary: summarizeArgs(event.args),
    };
    state.pendingTools.delete(toolCallId);
    const status = event.isError ? 'x' : 'ok';
    const summary = summarizeResult(event.result);
    const suffix = summary ? `  ${summary}` : '';
    process.stdout.write(`  [${status}] ${tool.name}  ${tool.argsSummary}${suffix}\n`);
    return null;
  }

  if (event.type === 'message_end') {
    state.assistantStreamOpen = false;
  }

  return null;
}

/**
 * Run a Pi agent in single-shot print mode.
 *
 * Spawns `pi` with the given options, collects the response, and returns it.
 * In text mode, stdout is collected directly.
 * In json mode, raw JSONL stdout is passed through directly.
 * In stream mode, JSONL events are rendered live and text_delta content is assembled.
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
    let killed = false;

    // Timeout guard
    const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    if (mode === 'json') {
      proc.stdout!.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        content += text;
        process.stdout.write(text);
      });
    } else if (mode === 'stream') {
      const rl = createInterface({ input: proc.stdout! });
      const streamState: StreamState = {
        inTextStream: false,
        lineOpen: false,
        pendingTrailingNewlines: '',
        assistantStreamOpen: false,
        pendingTools: new Map(),
      };
      rl.on('line', (line) => {
        const delta = renderStreamEvent(line, streamState);
        if (delta !== null) {
          content += delta;
        }
      });
      rl.on('close', () => {
        ensureLineClosed(streamState);
      });
    } else {
      proc.stdout!.on('data', (chunk: Buffer) => {
        content += chunk.toString();
      });
    }

    proc.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(
          'pi not found. Install pi-coding-agent:\n  npm i -g @mariozechner/pi-coding-agent'
        ));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new Error(`Pi process timed out after ${timeoutMs / 1000}s`));
      } else if (code === 0) {
        resolve({ content: content.trim(), rendered: mode === 'json' || mode === 'stream' });
      } else {
        reject(new Error(
          `Pi process exited with code ${code}.${stderr ? ' Stderr: ' + stderr.trim() : ''}`
        ));
      }
    });
  });
}
