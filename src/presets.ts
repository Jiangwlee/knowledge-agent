// src/presets.ts — Subcommand preset configurations
//
// Central mapping of Pi parameters per subcommand. Each preset defines which
// skills, tools, and thinking level to use. CLI flags (--model) override these.
// Future: can be externalized to config.json when customization is needed.

import type { RunAgentOptions } from './pi.js';

export interface Preset {
  /** Skill file paths relative to project root */
  skills: string[];
  /** Pi tool names to enable */
  tools: string[];
  /** Default thinking level */
  thinking: string;
  /** Default model for this subcommand (optional, overridden by --model CLI flag) */
  model?: string;
}

/** Base agent loaded as the first skill in every preset */
const AGENT = 'agents/librarian.md';

export const PRESETS: Record<string, Preset> = {
  ingest: {
    skills: [AGENT, 'skills/ingest/SKILL.md', 'skills/compile/SKILL.md'],
    tools: ['read', 'write', 'bash', 'grep', 'ls'],
    thinking: 'medium',
  },
  compile: {
    skills: [AGENT, 'skills/compile/SKILL.md', 'skills/search/SKILL.md'],
    tools: ['read', 'write', 'bash', 'grep', 'ls'],
    thinking: 'high',
  },
  query: {
    skills: [AGENT, 'skills/search/SKILL.md'],
    tools: ['read', 'bash', 'ls'],
    thinking: 'medium',
  },
  lint: {
    skills: [AGENT, 'skills/lint/SKILL.md', 'skills/search/SKILL.md'],
    tools: ['read', 'write', 'grep', 'find', 'ls'],
    thinking: 'high',
  },
  chat: {
    skills: [AGENT, 'skills/search/SKILL.md', 'skills/compile/SKILL.md'],
    tools: ['read', 'write', 'bash', 'grep', 'ls'],
    thinking: 'medium',
  },
};

/**
 * Get the preset for a subcommand. Throws if command is unknown.
 */
export function getPreset(command: string): Preset {
  const preset = PRESETS[command];
  if (!preset) {
    throw new Error(`Unknown command: "${command}". Valid commands: ${Object.keys(PRESETS).join(', ')}`);
  }
  return preset;
}

export interface CliOverrides {
  prompt: string;
  model?: string;
  mode?: 'text' | 'json' | 'stream';
}

/**
 * Merge a preset with CLI overrides to produce RunAgentOptions.
 * CLI flags take precedence over preset defaults.
 */
export function resolveRunOptions(preset: Preset, overrides: CliOverrides): RunAgentOptions {
  return {
    prompt: overrides.prompt,
    skills: preset.skills,
    tools: preset.tools,
    thinking: preset.thinking,
    model: overrides.model ?? preset.model,
    mode: overrides.mode,
  };
}

/**
 * Build common Pi CLI args from a preset and optional model override.
 * Handles: --model, --tools, --skill (repeated), --thinking.
 * Does NOT add print-mode flags (--no-session, -p) or prompt — callers add those.
 */
export function buildPresetArgs(preset: Preset, opts?: { model?: string }): string[] {
  const args: string[] = [];

  const model = opts?.model ?? preset.model;
  if (model) {
    args.push('--model', model);
  }

  if (preset.tools.length > 0) {
    args.push('--tools', preset.tools.join(','));
  }

  for (const skill of preset.skills) {
    args.push('--skill', skill);
  }

  if (preset.thinking) {
    args.push('--thinking', preset.thinking);
  }

  return args;
}
