// src/commands/evidence.ts — Read and normalize a single wiki article
//
// Produces a structured view over one knowledge unit for downstream query use.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { extractTitle } from '../pipeline/markdown.js';

type EvidenceKind = 'map' | 'concept' | 'source';

interface EvidenceResult {
  path: string;
  kind: EvidenceKind;
  title: string;
  summary: string;
  wikilinks: string[];
  content: string;
}

function parseFrontmatterTitle(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?\ntitle:\s*(.+)\n[\s\S]*?\n---/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function inferKind(path: string): EvidenceKind {
  if (path.startsWith('maps/')) return 'map';
  if (path.startsWith('concepts/')) return 'concept';
  return 'source';
}

function summarizeTitle(content: string, fallbackPath: string): string {
  return parseFrontmatterTitle(content) || extractTitle(content) || fallbackPath.replace(/^.*\//, '').replace(/\.md$/, '');
}

function extractSummary(content: string): string {
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n*/m, '');
  const withoutHeadings = withoutFrontmatter
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('- ') && !line.startsWith('>'));
  return withoutHeadings[0] ?? '';
}

function extractWikilinks(content: string): string[] {
  const matches = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim());
  return [...new Set(matches)];
}

function buildEvidenceResult(relativePath: string): EvidenceResult {
  const wikiDir = getSubDir('wiki');
  const fullPath = join(wikiDir, relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return {
    path: relativePath,
    kind: inferKind(relativePath),
    title: summarizeTitle(content, relativePath),
    summary: extractSummary(content),
    wikilinks: extractWikilinks(content),
    content,
  };
}

function printText(result: EvidenceResult): void {
  console.log(`Path: ${result.path}`);
  console.log(`Kind: ${result.kind}`);
  console.log(`Title: ${result.title}`);
  console.log(`Summary: ${result.summary}`);
  console.log(`Wikilinks: ${result.wikilinks.length > 0 ? result.wikilinks.join(', ') : '(none)'}`);
}

export async function evidenceCommand(path: string, opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');
  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  const fullPath = join(wikiDir, path);
  if (!existsSync(fullPath)) {
    console.error(`Evidence not found: ${path}`);
    return;
  }

  const result = buildEvidenceResult(path);
  if (opts.mode === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printText(result);
}

