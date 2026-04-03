// tests/pipeline/atomic-write.test.ts — Atomic write tests

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileAtomic } from '../../src/pipeline/atomic-write.js';

let testDir: string;

afterEach(() => {
  if (testDir) rmSync(testDir, { recursive: true, force: true });
});

describe('writeFileAtomic', () => {
  it('writes content to file', () => {
    testDir = join(tmpdir(), `kb-test-atomic-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filepath = join(testDir, 'test.md');

    writeFileAtomic(filepath, 'hello world');

    expect(readFileSync(filepath, 'utf-8')).toBe('hello world');
  });

  it('overwrites existing file', () => {
    testDir = join(tmpdir(), `kb-test-atomic-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filepath = join(testDir, 'test.md');

    writeFileAtomic(filepath, 'first');
    writeFileAtomic(filepath, 'second');

    expect(readFileSync(filepath, 'utf-8')).toBe('second');
  });

  it('does not leave temp files on success', () => {
    testDir = join(tmpdir(), `kb-test-atomic-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filepath = join(testDir, 'test.md');

    writeFileAtomic(filepath, 'content');

    const files = require('node:fs').readdirSync(testDir);
    expect(files).toEqual(['test.md']);
  });
});
