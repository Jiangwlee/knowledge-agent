// tests/commands/chat.test.ts — Chat command tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';

const mockSpawn = vi.mocked(spawn);

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-chat-${Date.now()}`);
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

import { chatCommand } from '../../src/commands/chat.js';

describe('chatCommand', () => {
  it('spawns Pi in interactive mode with stdio inherit', async () => {
    const proc = new EventEmitter() as any;
    setTimeout(() => proc.emit('close', 0), 10);
    mockSpawn.mockReturnValue(proc);

    await chatCommand({});

    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args, opts] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');

    // Should NOT have -p flag (not print mode)
    expect(args).not.toContain('-p');
    // Should NOT have --no-session (interactive needs session)
    expect(args).not.toContain('--no-session');

    // Should use inherited stdio
    expect(opts).toMatchObject({ stdio: 'inherit' });
  });

  it('loads librarian agent and search + compile skills', async () => {
    const proc = new EventEmitter() as any;
    setTimeout(() => proc.emit('close', 0), 10);
    mockSpawn.mockReturnValue(proc);

    await chatCommand({});

    const args = mockSpawn.mock.calls[0][1] as string[];
    const skillFlags = args.filter((a, i) => args[i - 1] === '--skill');
    expect(skillFlags).toContain('agents/librarian.md');
    expect(skillFlags).toContain('skills/search/SKILL.md');
    expect(skillFlags).toContain('skills/compile/SKILL.md');
  });

  it('sets cwd to wiki directory', async () => {
    const proc = new EventEmitter() as any;
    setTimeout(() => proc.emit('close', 0), 10);
    mockSpawn.mockReturnValue(proc);

    await chatCommand({});

    const spawnOpts = mockSpawn.mock.calls[0][2] as any;
    expect(spawnOpts.cwd).toBe(join(testDir, 'wiki'));
  });

  it('reports error when knowledge base is not initialized', async () => {
    process.env.KB_AGENT_DATA_DIR = join(testDir, 'nonexistent');

    await chatCommand({});

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('init'),
    );
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('passes model override', async () => {
    const proc = new EventEmitter() as any;
    setTimeout(() => proc.emit('close', 0), 10);
    mockSpawn.mockReturnValue(proc);

    await chatCommand({ model: 'openai/gpt-4o' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--model');
    expect(args).toContain('openai/gpt-4o');
  });

  it('rejects when pi is not found', async () => {
    const proc = new EventEmitter() as any;
    setTimeout(() => proc.emit('error', Object.assign(new Error('spawn pi ENOENT'), { code: 'ENOENT' })), 10);
    mockSpawn.mockReturnValue(proc);

    await expect(chatCommand({})).rejects.toThrow('pi not found');
  });
});
