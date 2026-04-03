import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { navCommand } from '../../src/commands/nav.js';

describe('nav command', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kb-agent-nav-'));
    process.env.KB_AGENT_DATA_DIR = testDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.KB_AGENT_DATA_DIR;
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reports init guard when wiki is missing', async () => {
    await navCommand({});

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
  });

  it('prints text nav status for initialized knowledge base', async () => {
    mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'concepts'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'maps'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });
    writeFileSync(join(testDir, 'wiki', 'SCHEMA.md'), '# Schema\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), '# Master\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', 'sources', 'one.md'), '# One\n', 'utf-8');

    await navCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Data dir: ${testDir}`));
    expect(console.log).toHaveBeenCalledWith('Schema: SCHEMA.md');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('sources=1'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('maturity=sources_only'));
  });

  it('prints json nav status', async () => {
    mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'concepts'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'maps'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });
    writeFileSync(join(testDir, 'wiki', 'SCHEMA.md'), '# Schema\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), '# Master\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', 'concepts', 'c1.md'), '# Concept\n', 'utf-8');

    await navCommand({ mode: 'json' });

    const payload = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(payload.data_dir).toBe(testDir);
    expect(payload.schema_path).toBe('SCHEMA.md');
    expect(payload.master_index_path).toBe('_index/master.md');
    expect(payload.counts.concepts).toBe(1);
    expect(payload.status.knowledge_maturity).toBe('has_concepts');
  });

  it('reports has_maps when maps exist', async () => {
    mkdirSync(join(testDir, 'wiki', 'sources'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'concepts'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', 'maps'), { recursive: true });
    mkdirSync(join(testDir, 'wiki', '_index'), { recursive: true });
    writeFileSync(join(testDir, 'wiki', 'SCHEMA.md'), '# Schema\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', '_index', 'master.md'), '# Master\n', 'utf-8');
    writeFileSync(join(testDir, 'wiki', 'maps', 'm1.md'), '# Map\n', 'utf-8');

    await navCommand({ mode: 'json' });

    const payload = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(payload.status.knowledge_maturity).toBe('has_maps');
  });
});

