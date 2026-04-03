// tests/presets.test.ts — Subcommand preset configuration tests

import { describe, it, expect } from 'vitest';
import { getPreset, resolveRunOptions, buildPresetArgs, PRESETS } from '../src/presets.js';

describe('PRESETS', () => {
  it('has presets for all subcommands', () => {
    expect(PRESETS).toHaveProperty('ingest');
    expect(PRESETS).toHaveProperty('compile');
    expect(PRESETS).toHaveProperty('query');
    expect(PRESETS).toHaveProperty('lint');
    expect(PRESETS).toHaveProperty('chat');
  });

  it('ingest preset includes ingest and compile skills', () => {
    expect(PRESETS.ingest.skills).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ingest'),
        expect.stringContaining('compile'),
      ])
    );
  });

  it('compile preset includes compile and search skills', () => {
    expect(PRESETS.compile.skills).toEqual(
      expect.arrayContaining([
        expect.stringContaining('compile'),
        expect.stringContaining('search'),
      ])
    );
  });

  it('query preset includes bash for query primitives', () => {
    expect(PRESETS.query.tools).toContain('bash');
    expect(PRESETS.query.tools).not.toContain('grep');
    expect(PRESETS.query.tools).not.toContain('find');
  });

  it('all presets have required fields', () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      expect(preset.skills, `${name}.skills`).toBeInstanceOf(Array);
      expect(preset.tools, `${name}.tools`).toBeInstanceOf(Array);
      expect(preset.thinking, `${name}.thinking`).toBeTruthy();
    }
  });
});

describe('getPreset', () => {
  it('returns preset for known command', () => {
    const preset = getPreset('ingest');
    expect(preset).toBe(PRESETS.ingest);
  });

  it('throws for unknown command', () => {
    expect(() => getPreset('nonexistent')).toThrow('Unknown command');
  });
});

describe('resolveRunOptions', () => {
  it('builds RunAgentOptions from preset', () => {
    const options = resolveRunOptions(PRESETS.ingest, { prompt: 'test' });
    expect(options.skills).toEqual(PRESETS.ingest.skills);
    expect(options.tools).toEqual(PRESETS.ingest.tools);
    expect(options.thinking).toBe(PRESETS.ingest.thinking);
    expect(options.prompt).toBe('test');
  });

  it('CLI model overrides preset', () => {
    const options = resolveRunOptions(PRESETS.ingest, {
      prompt: 'test',
      model: 'openai/gpt-4o',
    });
    expect(options.model).toBe('openai/gpt-4o');
  });

  it('CLI mode is passed through', () => {
    const options = resolveRunOptions(PRESETS.ingest, {
      prompt: 'test',
      mode: 'json',
    });
    expect(options.mode).toBe('json');
  });

  it('uses preset thinking when no CLI override', () => {
    const options = resolveRunOptions(PRESETS.compile, { prompt: 'test' });
    expect(options.thinking).toBe(PRESETS.compile.thinking);
  });
});

describe('buildPresetArgs', () => {
  it('builds args with model, tools, skills, and thinking', () => {
    const preset = PRESETS.query;
    const args = buildPresetArgs(preset, { model: 'anthropic/claude-sonnet-4-6' });

    expect(args).toContain('--model');
    expect(args).toContain('anthropic/claude-sonnet-4-6');
    expect(args).toContain('--tools');
    expect(args).toContain('--thinking');

    // Each skill gets its own --skill flag
    for (const skill of preset.skills) {
      expect(args).toContain(skill);
    }
  });

  it('omits --model when not provided', () => {
    const args = buildPresetArgs(PRESETS.query);
    expect(args).not.toContain('--model');
  });

  it('does not include print-mode flags', () => {
    const args = buildPresetArgs(PRESETS.compile, { model: 'test' });
    expect(args).not.toContain('--no-session');
    expect(args).not.toContain('-p');
  });
});
