// src/pipeline/markdown.ts — Markdown file management for the extraction layer
//
// Saves content to the markdown/ directory with YAML frontmatter.
// Handles filename generation (slugify), title extraction, and deduplication.

import { existsSync, readFileSync } from 'node:fs';
import { writeFileAtomic } from './atomic-write.js';
import { join, basename } from 'node:path';
import { getSubDir } from '../config.js';

export interface SaveMarkdownInput {
  /** Markdown content body */
  content: string;
  /** Article title (from defuddle metadata or extracted from content) */
  title: string;
  /** Source URL or file path */
  source: string;
  /** Source domain (optional) */
  domain?: string;
  /** Article description (optional) */
  description?: string;
}

export interface SaveMarkdownResult {
  /** Absolute path to the saved file */
  path: string;
  /** Generated filename (without directory) */
  filename: string;
  /** True if file already existed and was not overwritten */
  alreadyExists: boolean;
}

export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[];

export interface ParsedFrontmatter<T extends Record<string, FrontmatterValue> = Record<string, FrontmatterValue>> {
  frontmatter: T;
  body: string;
}

/**
 * Convert a string to a filename-safe slug.
 * Preserves CJK characters, lowercases latin, strips special chars.
 */
export function slugify(text: string): string {
  let slug = text
    .toLowerCase()
    // Keep word chars (including unicode), spaces, and hyphens
    .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff-]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Collapse multiple hyphens
    .replace(/-{2,}/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  // Truncate to 80 chars max
  if (slug.length > 80) {
    slug = slug.slice(0, 80).replace(/-+$/, '');
  }

  return slug || 'untitled';
}

/**
 * Extract the first markdown heading from content.
 * Returns the heading text or null if none found.
 */
export function extractTitle(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Extract a slug from a URL path (last segment).
 */
function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = basename(pathname);
    // Remove file extensions
    const withoutExt = last.replace(/\.\w+$/, '');
    return slugify(withoutExt || 'page');
  } catch {
    return slugify(url);
  }
}

/**
 * Generate YAML frontmatter string.
 */
/**
 * Escape a string for safe use as a YAML value.
 * Wraps in double quotes if it contains special characters.
 */
function yamlEscape(value: string): string {
  if (value.length === 0) {
    return '""';
  }
  if (/[:#"'\[\]{}&*!|>%@`]/.test(value) || value.startsWith('- ') || value.startsWith('? ')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function parseYamlScalar(raw: string): string | number | boolean | null {
  const value = raw.trim();

  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unquoted = value.slice(1, -1);
    return value.startsWith('"')
      ? unquoted.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : unquoted;
  }

  return value;
}

function serializeYamlValue(value: FrontmatterValue): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return ['[]'];
    return ['__ARRAY__', ...value.map(item => `- ${yamlEscape(String(item))}`)];
  }

  if (value === null) return ['null'];
  if (typeof value === 'boolean' || typeof value === 'number') return [String(value)];
  return [yamlEscape(value)];
}

export function parseFrontmatter<T extends Record<string, FrontmatterValue> = Record<string, FrontmatterValue>>(
  content: string,
): ParsedFrontmatter<T> {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {} as T, body: content };
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: {} as T, body: content };
  }

  const rawFrontmatter = content.slice(4, end);
  const body = content.slice(end + 5);
  const frontmatter: Record<string, FrontmatterValue> = {};
  const lines = rawFrontmatter.split('\n');

  let currentArrayKey: string | null = null;

  for (const line of lines) {
    if (line.trim().length === 0) continue;

    const arrayItem = line.match(/^\s*-\s+(.*)$/);
    if (arrayItem && currentArrayKey) {
      const current = (frontmatter[currentArrayKey] as Array<string | number | boolean> | undefined) ?? [];
      if (Array.isArray(current)) {
        current.push(parseYamlScalar(arrayItem[1]) as string | number | boolean);
        frontmatter[currentArrayKey] = current as FrontmatterValue;
      }
      continue;
    }

    currentArrayKey = null;
    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();

    if (rawValue === '[]') {
      frontmatter[key] = [];
      continue;
    }

    if (rawValue.length === 0) {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }

    frontmatter[key] = parseYamlScalar(rawValue) as FrontmatterValue;
  }

  return { frontmatter: frontmatter as T, body };
}

export function serializeFrontmatter<T extends Record<string, FrontmatterValue>>(
  frontmatter: T,
  body: string,
): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    const serialized = serializeYamlValue(value);
    if (serialized[0] === '__ARRAY__') {
      lines.push(`${key}:`);
      lines.push(...serialized.slice(1).map(item => `  ${item}`));
      continue;
    }
    lines.push(`${key}: ${serialized[0]}`);
  }

  lines.push('---');

  const normalizedBody = body.startsWith('\n') ? body.slice(1) : body;
  return `${lines.join('\n')}\n\n${normalizedBody.replace(/\s+$/, '')}\n`;
}

export function readMarkdownWithFrontmatter<T extends Record<string, FrontmatterValue> = Record<string, FrontmatterValue>>(
  path: string,
): ParsedFrontmatter<T> {
  return parseFrontmatter<T>(readFileSync(path, 'utf-8'));
}

function buildFrontmatter(input: SaveMarkdownInput): string {
  const title = input.title || extractTitle(input.content) || 'Untitled';
  const frontmatter: Record<string, FrontmatterValue> = {
    title,
    source: input.source,
    date: new Date().toISOString().slice(0, 10),
  };
  if (input.domain) {
    frontmatter.domain = input.domain;
  }
  if (input.description) {
    frontmatter.description = input.description;
  }
  return serializeFrontmatter(frontmatter, '').trimEnd();
}

/**
 * Save markdown content to the markdown/ directory with YAML frontmatter.
 *
 * Generates a slugified filename from the title (or URL fallback).
 * Does not overwrite existing files (idempotent).
 */
export function saveMarkdown(input: SaveMarkdownInput): SaveMarkdownResult {
  const markdownDir = getSubDir('markdown');
  const titleSlug = input.title ? slugify(input.title) : null;
  const slug = titleSlug || slugFromUrl(input.source);
  const filename = `${slug}.md`;
  const filepath = join(markdownDir, filename);

  if (existsSync(filepath)) {
    return { path: filepath, filename, alreadyExists: true };
  }

  const frontmatter = buildFrontmatter(input);
  const fullContent = `${frontmatter}\n\n${input.content}\n`;
  writeFileAtomic(filepath, fullContent);

  return { path: filepath, filename, alreadyExists: false };
}
