// tests/pipeline/index-updater.test.ts — Index updater tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateMasterIndex } from '../../src/pipeline/index-updater.js';

let testDir: string;
let wikiDir: string;
let masterPath: string;

const INITIAL_MASTER = `# Master Index

> LLM entry point: read this file first to navigate the knowledge base.

## Topics

_No topics yet. Run \`kb-agent ingest\` to add your first source._

## Recent Sources

_Empty._

## Statistics

- Sources: 0
- Concepts: 0
- Maps: 0
`;

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-index-${Date.now()}`);
  wikiDir = join(testDir, 'wiki');
  masterPath = join(wikiDir, '_index', 'master.md');
  mkdirSync(join(wikiDir, 'sources'), { recursive: true });
  mkdirSync(join(wikiDir, 'concepts'), { recursive: true });
  mkdirSync(join(wikiDir, 'maps'), { recursive: true });
  mkdirSync(join(wikiDir, '_index'), { recursive: true });
  writeFileSync(masterPath, INITIAL_MASTER, 'utf-8');
  process.env.KB_AGENT_DATA_DIR = testDir;
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
});

describe('updateMasterIndex', () => {
  it('replaces empty placeholder with first source link', () => {
    // Create a source file so count is accurate
    writeFileSync(join(wikiDir, 'sources', 'test-article.md'), '# Test', 'utf-8');

    updateMasterIndex('test-article');

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('[[sources/test-article]]');
    expect(content).not.toContain('_Empty._');
    expect(content).toContain('- Sources: 1');
  });

  it('adds second source without removing first', () => {
    writeFileSync(join(wikiDir, 'sources', 'first.md'), '# First', 'utf-8');
    updateMasterIndex('first');

    writeFileSync(join(wikiDir, 'sources', 'second.md'), '# Second', 'utf-8');
    updateMasterIndex('second');

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('[[sources/first]]');
    expect(content).toContain('[[sources/second]]');
    expect(content).toContain('- Sources: 2');
  });

  it('does not duplicate existing source entry', () => {
    writeFileSync(join(wikiDir, 'sources', 'test.md'), '# Test', 'utf-8');
    updateMasterIndex('test');
    updateMasterIndex('test'); // duplicate call

    const content = readFileSync(masterPath, 'utf-8');
    const matches = content.match(/\[\[sources\/test\]\]/g);
    expect(matches).toHaveLength(1);
  });

  it('updates statistics correctly', () => {
    writeFileSync(join(wikiDir, 'sources', 'a.md'), '# A', 'utf-8');
    writeFileSync(join(wikiDir, 'sources', 'b.md'), '# B', 'utf-8');
    writeFileSync(join(wikiDir, 'concepts', 'c1.md'), '# C1', 'utf-8');

    updateMasterIndex('a');

    const content = readFileSync(masterPath, 'utf-8');
    expect(content).toContain('- Sources: 2');
    expect(content).toContain('- Concepts: 1');
    expect(content).toContain('- Maps: 0');
  });
});
