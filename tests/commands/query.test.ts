// tests/commands/query.test.ts — Query command tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
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
  testDir = join(tmpdir(), `kb-test-query-${Date.now()}`);
  mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });
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

import { queryCommand } from '../../src/commands/query.js';

describe('queryCommand', () => {
  it('sends question to Pi with search skill and prints answer', async () => {
    const answer = 'Based on [[sources/transformers]], attention is a mechanism...';
    mockSpawn.mockReturnValue(createMockProcess(answer));

    await queryCommand('What is attention?', {});

    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');

    // Verify librarian agent loaded
    const skillFlags = (args as string[]).filter((a, i) => (args as string[])[i - 1] === '--skill');
    expect(skillFlags).toContain('agents/librarian.md');
    expect(skillFlags).toContain('skills/search/SKILL.md');

    // Verify question is in prompt
    const prompt = (args as string[])[(args as string[]).length - 1];
    expect(prompt).toContain('What is attention?');
    expect(prompt).toContain('kb-agent nav');
    expect(prompt).toContain('kb-agent lookup');
    expect(prompt).toContain('kb-agent evidence');

    // Verify answer printed
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('attention'));
  });

  it('sets cwd to wiki directory', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Answer.'));

    await queryCommand('test', {});

    const spawnOpts = mockSpawn.mock.calls[0][2] as any;
    expect(spawnOpts.cwd).toBe(join(testDir, 'wiki'));
  });

  it('reports error when knowledge base is not initialized', async () => {
    process.env.KB_AGENT_DATA_DIR = join(testDir, 'nonexistent');

    await queryCommand('test', {});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('init'),
    );
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('handles empty Pi response', async () => {
    mockSpawn.mockReturnValue(createMockProcess(''));

    await queryCommand('obscure question', {});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('No answer'),
    );
  });

  it('passes model override', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Answer.'));

    await queryCommand('test', { model: 'anthropic/claude-sonnet-4-6' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--model');
    expect(args).toContain('anthropic/claude-sonnet-4-6');
  });

  it('passes --mode json for structured output', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Answer.'));

    await queryCommand('test', { mode: 'json' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--mode');
    expect(args).toContain('json');
  });

  it('passes --mode json when stream mode requested', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Answer.'));

    await queryCommand('test', { mode: 'stream' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--mode');
    expect(args).toContain('json');
  });

  it('does not print a duplicate answer in stream mode', async () => {
    mockSpawn.mockReturnValue(createMockProcess('Answer.'));

    await queryCommand('test', { mode: 'stream' });

    expect(console.log).not.toHaveBeenCalledWith('Answer.');
  });

  it('does not print a second copy in json mode', async () => {
    mockSpawn.mockReturnValue(createMockProcess('{"type":"message_update"}\n'));

    await queryCommand('test', { mode: 'json' });

    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('"type":"message_update"'));
  });
});
