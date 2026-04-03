// src/commands/lookup.ts — Read-only candidate retrieval over the compiled wiki
//
// First implementation is filesystem-first: path/title/frontmatter/content
// scoring with grouped results for maps/concepts/sources.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { extractTitle } from '../pipeline/markdown.js';

type LookupKind = 'maps' | 'concepts' | 'sources';
type MatchReason = 'title' | 'path' | 'content';

interface LookupResultItem {
  path: string;
  title: string;
  score: number;
  match_reason: MatchReason;
}

interface LookupResult {
  query: string;
  strategy: 'filesystem';
  results: Record<LookupKind, LookupResultItem[]>;
  notes: string[];
}

const RESULT_KINDS: LookupKind[] = ['maps', 'concepts', 'sources'];
const RESULT_LIMIT_PER_KIND = 5;

function normalize(text: string): string {
  return text.toLowerCase();
}

function tokenize(query: string): string[] {
  const lowered = normalize(query).trim();
  const parts = lowered
    .split(/[\s\-_/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const tokens = new Set<string>([lowered, ...parts]);
  return [...tokens].filter((token) => token.length >= 2 || token === lowered);
}

function parseFrontmatterTitle(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?\ntitle:\s*(.+)\n[\s\S]*?\n---/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function summarizeTitle(content: string, filename: string): string {
  return parseFrontmatterTitle(content) || extractTitle(content) || filename.replace(/\.md$/, '');
}

function scoreMatch(path: string, title: string, content: string, tokens: string[]): LookupResultItem | null {
  const normalizedPath = normalize(path);
  const normalizedTitle = normalize(title);
  const normalizedContent = normalize(content);

  let titleHits = 0;
  let pathHits = 0;
  let contentHits = 0;

  for (const token of tokens) {
    if (normalizedTitle.includes(token)) titleHits += 1;
    if (normalizedPath.includes(token)) pathHits += 1;
    if (normalizedContent.includes(token)) contentHits += 1;
  }

  if (titleHits === 0 && pathHits === 0 && contentHits === 0) {
    return null;
  }

  const titleScore = titleHits > 0 ? 0.6 + Math.min(0.2, (titleHits - 1) * 0.1) : 0;
  const pathScore = pathHits > 0 ? 0.4 + Math.min(0.15, (pathHits - 1) * 0.05) : 0;
  const contentScore = contentHits > 0 ? 0.25 + Math.min(0.2, (contentHits - 1) * 0.05) : 0;
  const rawScore = Math.min(0.99, titleScore + pathScore + contentScore);

  let matchReason: MatchReason = 'content';
  if (titleHits >= pathHits && titleHits >= contentHits && titleHits > 0) {
    matchReason = 'title';
  } else if (pathHits >= contentHits && pathHits > 0) {
    matchReason = 'path';
  }

  return {
    path,
    title,
    score: Number(rawScore.toFixed(2)),
    match_reason: matchReason,
  };
}

function collectKindResults(wikiDir: string, kind: LookupKind, tokens: string[]): LookupResultItem[] {
  const dir = join(wikiDir, kind);
  if (!existsSync(dir)) return [];

  const items: LookupResultItem[] = [];
  for (const filename of readdirSync(dir).filter((name) => name.endsWith('.md'))) {
    const fullPath = join(dir, filename);
    const relativePath = `${kind}/${filename}`;
    const content = readFileSync(fullPath, 'utf-8');
    const title = summarizeTitle(content, filename);
    const match = scoreMatch(relativePath, title, content, tokens);
    if (match) {
      items.push(match);
    }
  }

  return items
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, RESULT_LIMIT_PER_KIND);
}

function buildLookupResult(query: string): LookupResult {
  const wikiDir = getSubDir('wiki');
  const tokens = tokenize(query);
  const results: Record<LookupKind, LookupResultItem[]> = {
    maps: collectKindResults(wikiDir, 'maps', tokens),
    concepts: collectKindResults(wikiDir, 'concepts', tokens),
    sources: collectKindResults(wikiDir, 'sources', tokens),
  };

  const notes: string[] = [];
  if (results.maps.length === 0) notes.push('No map articles matched.');
  if (results.concepts.length === 0) notes.push('No concept articles matched.');
  if (results.sources.length === 0) notes.push('No source summaries matched.');

  return {
    query,
    strategy: 'filesystem',
    results,
    notes,
  };
}

function printText(result: LookupResult): void {
  console.log(`Query: ${result.query}`);
  console.log(`Strategy: ${result.strategy}`);
  for (const kind of RESULT_KINDS) {
    console.log(`${kind}:`);
    if (result.results[kind].length === 0) {
      console.log('  (none)');
      continue;
    }
    for (const item of result.results[kind]) {
      console.log(`  - ${item.path} | ${item.title} | score=${item.score} | match=${item.match_reason}`);
    }
  }
  if (result.notes.length > 0) {
    console.log('Notes:');
    for (const note of result.notes) {
      console.log(`  - ${note}`);
    }
  }
}

export async function lookupCommand(query: string, opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');
  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  const result = buildLookupResult(query);
  if (opts.mode === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printText(result);
}

