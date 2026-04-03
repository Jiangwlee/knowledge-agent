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
}

export const PRESETS: Record<string, Preset> = {
  ingest: {
    skills: ['skills/ingest/SKILL.md', 'skills/compile/SKILL.md'],
    tools: ['read', 'write', 'bash', 'grep', 'ls'],
    thinking: 'medium',
  },
  compile: {
    skills: ['skills/compile/SKILL.md', 'skills/search/SKILL.md'],
    tools: ['read', 'write', 'bash', 'grep', 'ls'],
    thinking: 'high',
  },
  query: {
    skills: ['skills/search/SKILL.md'],
    tools: ['read', 'grep', 'find', 'ls'],
    thinking: 'medium',
  },
  lint: {
    skills: ['skills/lint/SKILL.md', 'skills/search/SKILL.md'],
    tools: ['read', 'grep', 'find', 'ls'],
    thinking: 'high',
  },
  chat: {
    skills: ['skills/search/SKILL.md', 'skills/compile/SKILL.md'],
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
  mode?: 'text' | 'json';
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
    model: overrides.model,
    mode: overrides.mode,
  };
}
