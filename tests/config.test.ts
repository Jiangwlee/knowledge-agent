import { describe, it, expect, afterEach, vi } from 'vitest';
import { getDataDir, getSubDir } from '../src/config.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('config', () => {
  afterEach(() => {
    delete process.env.KB_AGENT_DATA_DIR;
  });

  it('returns default data dir', () => {
    delete process.env.KB_AGENT_DATA_DIR;
    expect(getDataDir()).toBe(join(homedir(), '.local', 'share', 'kb-agent'));
  });

  it('respects KB_AGENT_DATA_DIR env var', () => {
    process.env.KB_AGENT_DATA_DIR = '/tmp/test-kb';
    expect(getDataDir()).toBe('/tmp/test-kb');
  });

  it('returns correct sub-directory paths', () => {
    process.env.KB_AGENT_DATA_DIR = '/tmp/test-kb';
    expect(getSubDir('raw')).toBe('/tmp/test-kb/raw');
    expect(getSubDir('markdown')).toBe('/tmp/test-kb/markdown');
    expect(getSubDir('wiki')).toBe('/tmp/test-kb/wiki');
  });
});
