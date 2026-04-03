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

  it('routes to ingest placeholder', async () => {
    await main(['node', 'kb-agent', 'ingest', 'https://example.com']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
  });

  it('routes to compile placeholder', async () => {
    await main(['node', 'kb-agent', 'compile']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
  });

  it('routes to lint placeholder', async () => {
    await main(['node', 'kb-agent', 'lint']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
  });

  it('routes to query placeholder', async () => {
    await main(['node', 'kb-agent', 'query', 'what is AI?']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
  });

  it('routes to chat placeholder', async () => {
    await main(['node', 'kb-agent', 'chat']);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not yet implemented'));
  });
});
