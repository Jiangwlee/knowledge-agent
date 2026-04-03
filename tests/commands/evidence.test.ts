import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evidenceCommand } from '../../src/commands/evidence.js';

function writeWikiFile(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, 'wiki', relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('evidence command', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'kb-agent-evidence-'));
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
    await evidenceCommand('sources/test.md', {});
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('init'));
  });

  it('reports missing evidence path', async () => {
    mkdirSync(join(testDir, 'wiki'), { recursive: true });
    await evidenceCommand('sources/missing.md', {});
    expect(console.error).toHaveBeenCalledWith('Evidence not found: sources/missing.md');
  });

  it('prints json evidence result', async () => {
    writeWikiFile(testDir, 'sources/harness.md', `---
title: Harness Design
---

# Harness Design

Discusses planner-generator-evaluator structure.

See also [[concepts/harness-agent]] and [[maps/agent-architectures]].
`);

    await evidenceCommand('sources/harness.md', { mode: 'json' });

    const payload = JSON.parse((console.log as any).mock.calls[0][0]);
    expect(payload.path).toBe('sources/harness.md');
    expect(payload.kind).toBe('source');
    expect(payload.title).toBe('Harness Design');
    expect(payload.summary).toContain('Discusses planner-generator-evaluator structure.');
    expect(payload.wikilinks).toEqual(['concepts/harness-agent', 'maps/agent-architectures']);
    expect(payload.content).toContain('# Harness Design');
  });

  it('prints text evidence result', async () => {
    writeWikiFile(testDir, 'concepts/harness-agent.md', '# Harness Agent\n\nCoordinates generation and evaluation.');

    await evidenceCommand('concepts/harness-agent.md', {});

    expect(console.log).toHaveBeenCalledWith('Kind: concept');
    expect(console.log).toHaveBeenCalledWith('Title: Harness Agent');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Coordinates generation and evaluation.'));
  });
});

