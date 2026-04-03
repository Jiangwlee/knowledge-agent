import { describe, it, expect, vi, beforeEach } from 'vitest';
import { main } from '../src/cli.js';

// Suppress console output during tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('kb-agent CLI', () => {
  it('shows help with no arguments', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    try {
      await main(['node', 'kb-agent', '--help']);
    } catch {
      // commander calls process.exit on --help
    }
    exitSpy.mockRestore();
  });

  it('shows version', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    try {
      await main(['node', 'kb-agent', '--version']);
    } catch {
      // commander calls process.exit on --version
    }
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('0.1.0'));
    exitSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('routes to init command', async () => {
    // init will fail because data dir may not exist, but it should route correctly
    await main(['node', 'kb-agent', 'init']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('initialized'));
  });

  it('routes to ingest command', async () => {
    // Point to nonexistent dir so ingest hits the init guard immediately
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'ingest', 'https://example.com']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to nav command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'nav']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to lookup command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'lookup', 'harness agent']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to evidence command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'evidence', 'sources/test.md']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to compile command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'compile']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to lint command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'lint']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to query command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'query', 'what is AI?']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });

  it('routes to chat command', async () => {
    const origDir = process.env.KB_AGENT_DATA_DIR;
    process.env.KB_AGENT_DATA_DIR = '/tmp/kb-nonexistent-' + Date.now();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await main(['node', 'kb-agent', 'chat']);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
    process.env.KB_AGENT_DATA_DIR = origDir;
  });
});
