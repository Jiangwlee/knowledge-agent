// tests/pipeline/markdown.test.ts — Markdown file management tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { saveMarkdown, slugify, extractTitle } from '../../src/pipeline/markdown.js';

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `kb-test-md-${Date.now()}`);
  mkdirSync(join(testDir, 'markdown'), { recursive: true });
  process.env.KB_AGENT_DATA_DIR = testDir;
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  delete process.env.KB_AGENT_DATA_DIR;
});

describe('slugify', () => {
  it('converts title to filename-safe slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles CJK characters', () => {
    expect(slugify('知识管理工具')).toBe('知识管理工具');
  });

  it('strips special characters', () => {
    expect(slugify('What I Wish (Someone) Had Told Me!')).toBe('what-i-wish-someone-had-told-me');
  });

  it('collapses multiple dashes', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });

  it('truncates long slugs', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe('extractTitle', () => {
  it('extracts first markdown heading', () => {
    expect(extractTitle('# My Title\n\nSome content')).toBe('My Title');
  });

  it('extracts h2 if no h1', () => {
    expect(extractTitle('## Section Title\n\nContent')).toBe('Section Title');
  });

  it('returns null for no heading', () => {
    expect(extractTitle('Just some text without headings')).toBeNull();
  });
});

describe('saveMarkdown', () => {
  it('saves content with YAML frontmatter', () => {
    const result = saveMarkdown({
      content: '# Test Article\n\nSome content here.',
      title: 'Test Article',
      source: 'https://example.com/article',
      domain: 'example.com',
    });

    expect(result.path).toContain('markdown');
    expect(existsSync(result.path)).toBe(true);

    const saved = readFileSync(result.path, 'utf-8');
    expect(saved).toContain('---');
    expect(saved).toContain('title: Test Article');
    expect(saved).toContain('source: https://example.com/article');
    expect(saved).toContain('# Test Article');
  });

  it('generates filename from title', () => {
    const result = saveMarkdown({
      content: 'Some content',
      title: 'What I Wish Someone Had Told Me',
      source: 'https://blog.samaltman.com/post',
    });

    expect(result.filename).toContain('what-i-wish-someone-had-told-me');
  });

  it('falls back to URL slug when title is empty', () => {
    const result = saveMarkdown({
      content: 'Content without title',
      title: '',
      source: 'https://example.com/some-page',
    });

    expect(result.filename).toContain('some-page');
  });

  it('does not overwrite existing file', () => {
    const first = saveMarkdown({
      content: 'First version',
      title: 'Duplicate Test',
      source: 'https://example.com/dup',
    });

    const second = saveMarkdown({
      content: 'Second version',
      title: 'Duplicate Test',
      source: 'https://example.com/dup',
    });

    expect(second.path).toBe(first.path);
    expect(second.alreadyExists).toBe(true);
    // Content should still be the first version
    const saved = readFileSync(second.path, 'utf-8');
    expect(saved).toContain('First version');
  });

  it('includes date in frontmatter', () => {
    const result = saveMarkdown({
      content: 'Content',
      title: 'Dated Article',
      source: 'https://example.com',
    });

    const saved = readFileSync(result.path, 'utf-8');
    // Should contain an ISO date string
    expect(saved).toMatch(/date: \d{4}-\d{2}-\d{2}/);
  });
});
