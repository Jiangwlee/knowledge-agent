// tests/commands/lint.test.ts — Lint command tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

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
  testDir = join(tmpdir(), `kb-test-lint-${Date.now()}`);
  mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'concepts'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'maps'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });

  writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), `# Master Index

## Recent Sources

- [[sources/article-one]]

## Statistics

- Sources: 1
- Concepts: 0
- Maps: 0
`, 'utf-8');

  writeFileSync(join(testDir, 'wiki', 'sources', 'article-one.md'), '# Article One\n\nContent.', 'utf-8');

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

import { lintCommand } from '../../src/commands/lint.js';

describe('lintCommand', () => {
  it('runs index pre-check and calls Pi for content lint', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Lint summary: 0 issues found.'));

    await lintCommand({});

    // Index should be consistent
    expect(console.log).toHaveBeenCalledWith('Index consistency: OK');

    // Pi should be called for content-level checks
    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');

    // Verify lint + search skills loaded
    const skillFlags = (args as string[]).filter((a, i) => (args as string[])[i - 1] === '--skill');
    expect(skillFlags).toContain('agents/librarian.md');
    expect(skillFlags).toContain('skills/lint/SKILL.md');
  });

  it('detects missing index entries', async () => {
    // Add a source file not referenced in master.md
    writeFileSync(join(testDir, 'wiki', 'sources', 'article-two.md'), '# Article Two\n\nContent.', 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Fixed index.'));

    await lintCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Index issues found'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('sources/article-two'));
  });

  it('detects stale index entries', async () => {
    // master.md references a file that doesn't exist
    writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), `# Master Index

## Recent Sources

- [[sources/article-one]]
- [[sources/deleted-article]]

## Statistics

- Sources: 1
- Concepts: 0
- Maps: 0
`, 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Fixed stale entries.'));

    await lintCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Stale index entries'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted-article'));
  });

  it('detects outdated statistics', async () => {
    // Stats say 0 sources but there's 1
    writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), `# Master Index

## Recent Sources

- [[sources/article-one]]

## Statistics

- Sources: 0
- Concepts: 0
- Maps: 0
`, 'utf-8');

    mockSpawn.mockReturnValue(createMockProcess('Fixed stats.'));

    await lintCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Statistics'));
  });

  it('sets cwd to wiki directory', async () => {
    mockSpawn.mockReturnValue(createMockProcess('OK.'));

    await lintCommand({});

    const spawnOpts = mockSpawn.mock.calls[0][2] as any;
    expect(spawnOpts.cwd).toBe(join(testDir, 'wiki'));
  });

  it('reports error when knowledge base is not initialized', async () => {
    process.env.KB_AGENT_DATA_DIR = join(testDir, 'nonexistent');

    await lintCommand({});

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('handles Pi failure gracefully', async () => {
    const proc = new EventEmitter() as any;
    proc.stdout = Readable.from(['']);
    proc.stderr = Readable.from(['API error']);
    setTimeout(() => proc.emit('close', 1), 10);
    mockSpawn.mockReturnValue(proc);

    await lintCommand({});

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Lint failed'));
  });
});
