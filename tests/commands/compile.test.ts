// tests/commands/compile.test.ts — Quick compile tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

// Mock child_process for Pi
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

const mockSpawn = vi.mocked(spawn);

function createMockProcess(stdout: string, exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = Readable.from([stdout]);
  proc.stderr = Readable.from(['']);
  setTimeout(() => proc.emit('close', exitCode), 10);
  return proc;
}

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-compile-${Date.now()}`);

  // Set up wiki structure
  mkdirSync(join(testDir, 'markdown'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'concepts'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'maps'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });

  writeFileSync(join(testDir, 'wiki', 'SCHEMA.md'), '# Schema\nTest schema.', 'utf-8');
  writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), `# Master Index

## Recent Sources

_Empty._

## Statistics

- Sources: 0
- Concepts: 0
- Maps: 0
`, 'utf-8');

  process.env.KB_AGENT_DATA_DIR = testDir;
  mockSpawn.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
  vi.restoreAllMocks();
});

import { quickCompile, compileCommand } from '../../src/commands/compile.js';

describe('quickCompile', () => {
  it('sends markdown content to Pi and saves source summary', async () => {
    const markdownPath = join(testDir, 'markdown', 'test-article.md');
    writeFileSync(markdownPath, '---\ntitle: Test\n---\n\n# Test Article\n\nContent here.', 'utf-8');

    const piOutput = `---
title: Test Article
source: text-input
tags: [testing]
date: 2026-04-03
---

# Test Article

Summary of the test article.

## Key Points

- Point one
- Point two
`;

    mockSpawn.mockReturnValue(createMockProcess(piOutput));

    await quickCompile(markdownPath, {});

    // Verify Pi was called with agent + skills (not hardcoded prompt)
    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');
    expect(args).toContain('--no-session');

    // Verify librarian agent is loaded as a skill
    const skillFlags = (args as string[]).filter((a, i) => (args as string[])[i - 1] === '--skill');
    expect(skillFlags).toContain('agents/librarian.md');

    // Verify prompt contains task data but not hardcoded architecture
    const prompt = (args as string[])[(args as string[]).length - 1];
    expect(prompt).toContain('test-article.md');
    expect(prompt).toContain('Content here.');

    // Verify source summary was saved
    const sourcePath = join(testDir, 'wiki', 'sources', 'test-article.md');
    expect(existsSync(sourcePath)).toBe(true);
    const saved = readFileSync(sourcePath, 'utf-8');
    expect(saved).toContain('Test Article');
  });

  it('updates master index after compile', async () => {
    const markdownPath = join(testDir, 'markdown', 'new-source.md');
    writeFileSync(markdownPath, '# New Source\n\nContent.', 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Summary output.'));

    await quickCompile(markdownPath, {});

    // Source file should exist for the count
    const masterContent = readFileSync(join(testDir, 'wiki', '_index', 'master.md'), 'utf-8');
    expect(masterContent).toContain('[[sources/new-source]]');
  });

  it('handles Pi failure gracefully', async () => {
    const markdownPath = join(testDir, 'markdown', 'fail-test.md');
    writeFileSync(markdownPath, '# Fail\n\nContent.', 'utf-8');

    const proc = new EventEmitter() as any;
    proc.stdout = Readable.from(['']);
    proc.stderr = Readable.from(['API key not found']);
    setTimeout(() => proc.emit('close', 1), 10);
    mockSpawn.mockReturnValue(proc);

    await quickCompile(markdownPath, {});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Quick compile failed'),
    );
  });

  it('passes model override from CLI', async () => {
    const markdownPath = join(testDir, 'markdown', 'model-test.md');
    writeFileSync(markdownPath, '# Model Test\n\nContent.', 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Output.'));

    await quickCompile(markdownPath, { model: 'openai/gpt-4o' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--model');
    expect(args).toContain('openai/gpt-4o');
  });
});

describe('compileCommand (deep)', () => {
  it('skips when no new sources since last compile', async () => {
    // Set lastDeepCompile to future so all sources are "old"
    writeFileSync(join(testDir, 'config.json'), JSON.stringify({
      version: '0.1.0',
      createdAt: '2026-04-01T00:00:00.000Z',
      lastDeepCompile: '2099-01-01T00:00:00.000Z',
    }), 'utf-8');

    await compileCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nothing to do'));
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('processes new sources and calls Pi with compile preset', async () => {
    // Add a source file (no lastDeepCompile → all sources are new)
    writeFileSync(join(testDir, 'wiki', 'sources', 'new-article.md'), '# New\n\nContent.', 'utf-8');
    writeFileSync(join(testDir, 'config.json'), JSON.stringify({
      version: '0.1.0',
      createdAt: '2026-04-01T00:00:00.000Z',
    }), 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Created concepts/ai-overview.md'));

    await compileCommand({});

    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');

    // Prompt should mention new sources
    const prompt = (args as string[])[(args as string[]).length - 1];
    expect(prompt).toContain('new-article');

    // Verify cwd set to wiki dir
    const spawnOpts = mockSpawn.mock.calls[0][2] as any;
    expect(spawnOpts.cwd).toBe(join(testDir, 'wiki'));
  });

  it('records lastDeepCompile timestamp after success', async () => {
    writeFileSync(join(testDir, 'wiki', 'sources', 'some-source.md'), '# Source\n\nContent.', 'utf-8');
    writeFileSync(join(testDir, 'config.json'), JSON.stringify({
      version: '0.1.0',
      createdAt: '2026-04-01T00:00:00.000Z',
    }), 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Done.'));

    await compileCommand({});

    const config = JSON.parse(readFileSync(join(testDir, 'config.json'), 'utf-8'));
    expect(config.lastDeepCompile).toBeDefined();
    expect(new Date(config.lastDeepCompile).getTime()).toBeGreaterThan(0);
  });

  it('does not record timestamp when LLM returns empty output', async () => {
    writeFileSync(join(testDir, 'wiki', 'sources', 'empty-test.md'), '# Empty\n\nContent.', 'utf-8');
    writeFileSync(join(testDir, 'config.json'), JSON.stringify({
      version: '0.1.0',
      createdAt: '2026-04-01T00:00:00.000Z',
    }), 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess(''));

    await compileCommand({});

    const config = JSON.parse(readFileSync(join(testDir, 'config.json'), 'utf-8'));
    expect(config.lastDeepCompile).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('empty output'));
  });

  it('reports error when knowledge base is not initialized', async () => {
    process.env.KB_AGENT_DATA_DIR = join(testDir, 'nonexistent');

    await compileCommand({});

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    expect(mockSpawn).not.toHaveBeenCalled();
  });
});
