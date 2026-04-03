// src/commands/compile.ts — Compile: transform markdown extractions into wiki knowledge
//
// Quick compile: single source → wiki/sources/ summary + index update (triggered by ingest)
// Deep compile: cross-source synthesis → concepts/ + maps/ + _index/ (Phase 4)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { runAgent } from '../pi.js';
import { getPreset, resolveRunOptions } from '../presets.js';
import { updateMasterIndex } from '../pipeline/index-updater.js';

/**
 * Quick compile: single markdown source → wiki/sources/ summary + index update.
 * Called automatically after ingest.
 */
export async function quickCompile(markdownPath: string, opts: GlobalOptions): Promise<void> {
  const wikiDir = getSubDir('wiki');
  const schemaPath = join(wikiDir, 'SCHEMA.md');
  const masterIndexPath = join(wikiDir, '_index', 'master.md');

  // Read context files
  const schema = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf-8') : '';
  const masterIndex = existsSync(masterIndexPath) ? readFileSync(masterIndexPath, 'utf-8') : '';
  const markdownContent = readFileSync(markdownPath, 'utf-8');
  const sourceFilename = basename(markdownPath, '.md');

  // Build prompt for Pi
  const prompt = `你是图书管理员。以下是一篇新导入的文章，请为它生成一份 wiki/sources/ 摘要。

## 当前 Wiki 结构
${schema}

## 当前索引
${masterIndex}

## 新文章（文件名: ${sourceFilename}.md）
${markdownContent}

## 任务
为这篇文章生成一份 Obsidian 兼容的摘要文件，用于 wiki/sources/${sourceFilename}.md。

要求：
1. YAML frontmatter（title, source, tags, date）
2. 简洁但全面的内容摘要
3. 关键要点列表
4. 使用 [[wikilinks]] 链接相关概念
5. 保持来源归属

直接输出摘要文件的完整内容，不要添加额外解释。`;

  const preset = getPreset('compile');
  const runOptions = resolveRunOptions(preset, {
    prompt,
    model: opts.model,
  });

  try {
    const result = await runAgent(runOptions);

    if (result.content.trim()) {
      // Save source summary
      const sourcesDir = join(wikiDir, 'sources');
      mkdirSync(sourcesDir, { recursive: true });
      const sourcePath = join(sourcesDir, `${sourceFilename}.md`);
      writeFileSync(sourcePath, result.content.trim() + '\n', 'utf-8');
      console.log(`Source summary: wiki/sources/${sourceFilename}.md`);

      // Update master index
      updateMasterIndex(sourceFilename);
      console.log('Master index updated.');
    } else {
      console.error('Quick compile produced empty output.');
    }
  } catch (err: any) {
    console.error(`Quick compile failed: ${err.message || err}`);
    console.error('The markdown file has been saved. You can retry with: kb-agent compile');
  }
}

/**
 * Deep compile command (Phase 4).
 */
export async function compileCommand(opts: GlobalOptions): Promise<void> {
  console.log('compile: deep compile not yet implemented (Phase 4)');
}
