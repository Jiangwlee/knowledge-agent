// tests/pi.test.ts — Pi subprocess runner tests
//
// Tests use mocked child_process.spawn to verify argument construction
// and JSONL event parsing without requiring a real Pi installation.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

// Mock child_process before importing pi.ts
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { runAgent } from '../src/pi.js';

const mockSpawn = vi.mocked(spawn);

function createMockProcess(stdout: string, stderr = '', exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = Readable.from([stdout]);
  proc.stderr = Readable.from([stderr]);
  // Emit close after streams end
  setTimeout(() => proc.emit('close', exitCode), 10);
  return proc;
}

function createJsonlMockProcess(events: object[], exitCode = 0) {
  const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  return createMockProcess(lines, '', exitCode);
}

beforeEach(() => {
  mockSpawn.mockReset();
});

describe('runAgent', () => {
  it('spawns pi with correct base arguments', async () => {
    mockSpawn.mockReturnValue(createMockProcess('hello'));

    await runAgent({ prompt: 'test prompt' });

    expect(mockSpawn).toHaveBeenCalledOnce();
    const [cmd, args] = mockSpawn.mock.calls[0];
    expect(cmd).toBe('pi');
    expect(args).toContain('--no-session');
    expect(args).toContain('-p');
  });

  it('collects text output in text mode', async () => {
    mockSpawn.mockReturnValue(createMockProcess('The answer is 42.\n'));

    const result = await runAgent({ prompt: 'question', mode: 'text' });

    expect(result.content).toBe('The answer is 42.');
  });

  it('parses JSONL events and extracts text_delta in json mode', async () => {
    const events = [
      { type: 'session', version: 1, id: 's1', timestamp: '2026-04-03', cwd: '/tmp' },
      { type: 'agent_start' },
      { type: 'message_start', message: { role: 'assistant', content: [] } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Hello' } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: ' world' } },
      { type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'Hello world' }] } },
      { type: 'agent_end', messages: [] },
    ];
    mockSpawn.mockReturnValue(createJsonlMockProcess(events));

    const result = await runAgent({ prompt: 'greet', mode: 'json' });

    expect(result.content).toBe('Hello world');
  });

  it('passes model flag when specified', async () => {
    mockSpawn.mockReturnValue(createMockProcess('ok'));

    await runAgent({ prompt: 'test', model: 'anthropic/claude-sonnet-4-6' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--model');
    expect(args).toContain('anthropic/claude-sonnet-4-6');
  });

  it('passes skill flags when specified', async () => {
    mockSpawn.mockReturnValue(createMockProcess('ok'));

    await runAgent({
      prompt: 'test',
      skills: ['skills/ingest/SKILL.md', 'skills/compile/SKILL.md'],
    });

    const args = mockSpawn.mock.calls[0][1] as string[];
    const skillIndices = args.reduce<number[]>((acc, arg, i) => {
      if (arg === '--skill') acc.push(i);
      return acc;
    }, []);
    expect(skillIndices).toHaveLength(2);
    expect(args[skillIndices[0] + 1]).toBe('skills/ingest/SKILL.md');
    expect(args[skillIndices[1] + 1]).toBe('skills/compile/SKILL.md');
  });

  it('passes tools flag when specified', async () => {
    mockSpawn.mockReturnValue(createMockProcess('ok'));

    await runAgent({ prompt: 'test', tools: ['read', 'bash', 'grep'] });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--tools');
    expect(args).toContain('read,bash,grep');
  });

  it('passes thinking flag when specified', async () => {
    mockSpawn.mockReturnValue(createMockProcess('ok'));

    await runAgent({ prompt: 'test', thinking: 'high' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--thinking');
    expect(args).toContain('high');
  });

  it('passes system-prompt when specified', async () => {
    mockSpawn.mockReturnValue(createMockProcess('ok'));

    await runAgent({ prompt: 'test', systemPrompt: 'You are a librarian.' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--system-prompt');
    expect(args).toContain('You are a librarian.');
  });

  it('rejects with error when pi exits with non-zero code', async () => {
    mockSpawn.mockReturnValue(createMockProcess('', 'Error: no API key', 1));

    await expect(runAgent({ prompt: 'test' })).rejects.toThrow('Pi process exited with code 1');
  });

  it('defaults to text mode', async () => {
    mockSpawn.mockReturnValue(createMockProcess('output'));

    await runAgent({ prompt: 'test' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    // text mode = no --mode flag, just -p
    expect(args).not.toContain('--mode');
  });

  it('passes --mode json when json mode specified', async () => {
    const events = [
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'ok' } },
      { type: 'agent_end', messages: [] },
    ];
    mockSpawn.mockReturnValue(createJsonlMockProcess(events));

    await runAgent({ prompt: 'test', mode: 'json' });

    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--mode');
    expect(args).toContain('json');
  });
});
