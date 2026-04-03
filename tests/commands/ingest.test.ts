// tests/commands/ingest.test.ts — Ingest command tests
//
// Tests URL and text ingest pipelines with mocked external dependencies
// (omp-web-operator, Pi, filesystem).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock child_process for both omp-web-operator and pi
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFileSync: vi.fn(),
}));

import { spawn, execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

const mockSpawn = vi.mocked(spawn);
const mockExecFileSync = vi.mocked(execFileSync);

// Helper to create mock processes
function createMockProcess(stdout: string, stderr = '', exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = Readable.from([stdout]);
  proc.stderr = Readable.from([stderr]);
  setTimeout(() => proc.emit('close', exitCode), 10);
  return proc;
}

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-ingest-${Date.now()}`);
  mkdirSync(join(testDir, 'markdown'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
  mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });
  process.env.KB_AGENT_DATA_DIR = testDir;
  mockSpawn.mockReset();
  mockExecFileSync.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
  vi.restoreAllMocks();
});

// Import after mocks are set up
import { ingestCommand } from '../../src/commands/ingest.js';

describe('ingest URL', () => {
  it('calls omp-web-operator read-url with --json for URLs', async () => {
    const webOpOutput = JSON.stringify({
      title: 'Test Article',
      url: 'https://example.com/test',
      domain: 'example.com',
      description: 'A test article',
      content: '# Test Article\n\nSome content here.',
    });

    // First call: omp-web-operator (execFileSync)
    mockExecFileSync.mockReturnValue(webOpOutput);

    // Second call: pi for quick compile (spawn)
    mockSpawn.mockReturnValue(createMockProcess('Compiled summary here.'));

    await ingestCommand('https://example.com/test', {});

    // Verify omp-web-operator was called with safe array args
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'omp-web-operator',
      ['read-url', 'https://example.com/test', '--json'],
      expect.objectContaining({ encoding: 'utf-8' }),
    );

    // Verify markdown file was saved
    const files = require('node:fs').readdirSync(join(testDir, 'markdown'));
    expect(files.length).toBe(1);
    expect(files[0]).toContain('test-article');

    const content = readFileSync(join(testDir, 'markdown', files[0]), 'utf-8');
    expect(content).toContain('title: Test Article');
    expect(content).toContain('source: "https://example.com/test"');
  });

  it('reports error when omp-web-operator is not available', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw Object.assign(new Error('command not found'), { status: 127 });
    });

    await ingestCommand('https://example.com/test', {});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('omp-web-operator'),
    );
  });
});

describe('ingest text', () => {
  it('saves piped text content to markdown/', async () => {
    // Pi for quick compile
    mockSpawn.mockReturnValue(createMockProcess('Compiled.'));

    await ingestCommand('--text', {}, 'Some interesting text about AI.\nIt covers many topics.');

    const files = require('node:fs').readdirSync(join(testDir, 'markdown'));
    expect(files.length).toBe(1);

    const content = readFileSync(join(testDir, 'markdown', files[0]), 'utf-8');
    expect(content).toContain('Some interesting text about AI.');
  });
});

describe('ingest guard', () => {
  it('reports error when knowledge base is not initialized', async () => {
    // Point to non-existent directory
    process.env.KB_AGENT_DATA_DIR = join(testDir, 'nonexistent');

    await ingestCommand('https://example.com', {});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('init'),
    );
  });
});
