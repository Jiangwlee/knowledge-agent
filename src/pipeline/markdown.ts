// src/pipeline/markdown.ts — Markdown file management for the extraction layer
//
// Saves content to the markdown/ directory with YAML frontmatter.
// Handles filename generation (slugify), title extraction, and deduplication.

import { existsSync } from 'node:fs';
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
  if (/[:#"'\[\]{}&*!|>%@`]/.test(value) || value.startsWith('- ') || value.startsWith('? ')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function buildFrontmatter(input: SaveMarkdownInput): string {
  const lines: string[] = ['---'];
  const title = input.title || extractTitle(input.content) || 'Untitled';
  lines.push(`title: ${yamlEscape(title)}`);
  lines.push(`source: ${input.source}`);
  if (input.domain) {
    lines.push(`domain: ${input.domain}`);
  }
  if (input.description) {
    lines.push(`description: ${input.description}`);
  }
  lines.push(`date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('---');
  return lines.join('\n');
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
