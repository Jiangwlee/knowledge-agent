import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lookupCommand } from '../../src/commands/lookup.js';

function writeWikiFile(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, 'wiki', relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('lookup command', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kb-agent-lookup-'));
    process.env.KB_AGENT_DATA_DIR = testDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.KB_AGENT_DATA_DIR;
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reports init guard when wiki is missing', async () => {
    await lookupCommand('harness', {});
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
  });

  it('returns grouped json results with title/path/content matches', async () => {
    mkdirSync(join(testDir, 'wiki'), { recursive: true });
    writeWikiFile(testDir, 'sources/harness-design-for-long-running-application-development.md', `---
title: Harness Design for Long-running Application Development
---

# Harness Design for Long-running Application Development

Planner generator evaluator loop.
`);
    writeWikiFile(testDir, 'concepts/harness-agent.md', '# Harness Agent\n\nA harness agent coordinates generation and evaluation.');
    writeWikiFile(testDir, 'maps/agent-architectures.md', '# Agent Architectures\n\nComparison of harness agent architectures.');

    await lookupCommand('Harness Agent 设计', { mode: 'json' });

    const payload = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(payload.query).toBe('Harness Agent 设计');
    expect(payload.strategy).toBe('filesystem');
    expect(payload.results.maps[0].path).toBe('maps/agent-architectures.md');
    expect(payload.results.concepts[0].path).toBe('concepts/harness-agent.md');
    expect(payload.results.sources[0].path).toBe('sources/harness-design-for-long-running-application-development.md');
    expect(payload.results.sources[0].match_reason).toBe('title');
  });

  it('prints text results grouped by kind', async () => {
    mkdirSync(join(testDir, 'wiki'), { recursive: true });
    writeWikiFile(testDir, 'sources/example.md', '# Example Agent\n\nHarness content.');

    await lookupCommand('example agent', {});

    expect(console.log).toHaveBeenCalledWith('maps:');
    expect(console.log).toHaveBeenCalledWith('concepts:');
    expect(console.log).toHaveBeenCalledWith('sources:');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('sources/example.md'));
  });

  it('adds notes when higher-level articles are missing', async () => {
    mkdirSync(join(testDir, 'wiki'), { recursive: true });
    writeWikiFile(testDir, 'sources/only-source.md', '# Only Source\n\nHarness content.');

    await lookupCommand('harness', { mode: 'json' });

    const payload = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(payload.notes).toContain('No map articles matched.');
    expect(payload.notes).toContain('No concept articles matched.');
    expect(payload.notes).not.toContain('No source summaries matched.');
  });
});

