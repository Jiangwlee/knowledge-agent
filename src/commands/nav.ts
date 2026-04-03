// src/commands/nav.ts — Knowledge-base navigation entrypoint
//
// Read-only command that reports the wiki entry files, content counts,
// and a coarse knowledge maturity signal. This gives agents and users
// a stable starting point before lookup/evidence primitives exist.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getDataDir, getSubDir } from '../config.js';

type KnowledgeMaturity = 'empty' | 'sources_only' | 'has_concepts' | 'has_maps';

interface NavResult {
  data_dir: string;
  wiki_dir: string;
  schema_path: string;
  master_index_path: string;
  counts: {
    sources: number;
    concepts: number;
    maps: number;
  };
  status: {
    has_schema: boolean;
    has_master_index: boolean;
    knowledge_maturity: KnowledgeMaturity;
  };
  entrypoints: string[];
}

function countMdFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => name.endsWith('.md')).length;
}

function getKnowledgeMaturity(counts: NavResult['counts']): KnowledgeMaturity {
  if (counts.maps > 0) return 'has_maps';
  if (counts.concepts > 0) return 'has_concepts';
  if (counts.sources > 0) return 'sources_only';
  return 'empty';
}

function buildNavResult(): NavResult {
  const dataDir = getDataDir();
  const wikiDir = getSubDir('wiki');
  const schemaPath = join(wikiDir, 'SCHEMA.md');
  const masterIndexPath = join(wikiDir, '_index', 'master.md');
  const counts = {
    sources: countMdFiles(join(wikiDir, 'sources')),
    concepts: countMdFiles(join(wikiDir, 'concepts')),
    maps: countMdFiles(join(wikiDir, 'maps')),
  };

  return {
    data_dir: dataDir,
    wiki_dir: wikiDir,
    schema_path: 'SCHEMA.md',
    master_index_path: '_index/master.md',
    counts,
    status: {
      has_schema: existsSync(schemaPath),
      has_master_index: existsSync(masterIndexPath),
      knowledge_maturity: getKnowledgeMaturity(counts),
    },
    entrypoints: ['SCHEMA.md', '_index/master.md'],
  };
}

function printText(result: NavResult): void {
  console.log(`Data dir: ${result.data_dir}`);
  console.log(`Wiki dir: ${result.wiki_dir}`);
  console.log(`Schema: ${result.schema_path}`);
  console.log(`Master index: ${result.master_index_path}`);
  console.log(`Counts: sources=${result.counts.sources} concepts=${result.counts.concepts} maps=${result.counts.maps}`);
  console.log(
    `Status: schema=${result.status.has_schema ? 'yes' : 'no'} ` +
    `master_index=${result.status.has_master_index ? 'yes' : 'no'} ` +
    `maturity=${result.status.knowledge_maturity}`,
  );
}

export async function navCommand(opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');

  if (!existsSync(wikiDir)) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  const result = buildNavResult();
  if (opts.mode === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printText(result);
}

