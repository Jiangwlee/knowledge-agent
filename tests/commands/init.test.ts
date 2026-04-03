import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand } from '../../src/commands/init.js';

describe('init command', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kb-agent-test-'));
    process.env.KB_AGENT_DATA_DIR = testDir;
  });

  afterEach(() => {
    delete process.env.KB_AGENT_DATA_DIR;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates complete directory structure', async () => {
    await initCommand();

    expect(existsSync(join(testDir, 'raw'))).toBe(true);
    expect(existsSync(join(testDir, 'markdown'))).toBe(true);
    expect(existsSync(join(testDir, 'wiki', 'sources'))).toBe(true);
    expect(existsSync(join(testDir, 'wiki', 'concepts'))).toBe(true);
    expect(existsSync(join(testDir, 'wiki', 'maps'))).toBe(true);
    expect(existsSync(join(testDir, 'wiki', '_index'))).toBe(true);
  });

  it('creates SCHEMA.md with initial content', async () => {
    await initCommand();

    const schema = readFileSync(join(testDir, 'wiki', 'SCHEMA.md'), 'utf-8');
    expect(schema).toContain('Knowledge Base Schema');
    expect(schema).toContain('sources/');
    expect(schema).toContain('concepts/');
    expect(schema).toContain('maps/');
  });

  it('creates master.md index', async () => {
    await initCommand();

    const master = readFileSync(join(testDir, 'wiki', '_index', 'master.md'), 'utf-8');
    expect(master).toContain('Master Index');
  });

  it('creates config.json', async () => {
    await initCommand();

    const config = JSON.parse(readFileSync(join(testDir, 'config.json'), 'utf-8'));
    expect(config.version).toBe('0.1.0');
    expect(config.createdAt).toBeDefined();
  });

  it('is idempotent — does not overwrite existing files', async () => {
    await initCommand();

    const firstSchema = readFileSync(join(testDir, 'wiki', 'SCHEMA.md'), 'utf-8');

    // Run init again
    await initCommand();

    const secondSchema = readFileSync(join(testDir, 'wiki', 'SCHEMA.md'), 'utf-8');
    expect(secondSchema).toBe(firstSchema);
  });
});
