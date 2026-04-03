// src/commands/ingest.ts — Import raw material into the knowledge base
//
// Pipeline: source → omp-web-operator (URL) or direct save (text) → markdown/ → quick compile
// Depends on: oh-my-superpowers (omp-web-operator read-url --json)

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { GlobalOptions } from '../cli.js';
import { getSubDir } from '../config.js';
import { saveMarkdown, extractTitle, slugify } from '../pipeline/markdown.js';
import { quickCompile } from './compile.js';

// omp-web-operator returns different shapes depending on page type.
// We only rely on the fields we know about; unknown fields are ignored.
interface WebOperatorResult {
  title?: string;
  url?: string;
  domain?: string;
  description?: string;
  content?: string;
  // Fallback text field (e.g. Twitter/X, some social pages)
  text?: string;
  // Allow any additional fields without breaking the parse
  [key: string]: unknown;
}

/**
 * Check if the knowledge base has been initialized.
 */
function isInitialized(): boolean {
  return existsSync(getSubDir('markdown')) && existsSync(getSubDir('wiki'));
}

/**
 * Detect if a source string is a URL.
 */
function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Fetch URL content via omp-web-operator read-url --json.
 */
function fetchUrl(url: string): WebOperatorResult {
  const output = execFileSync(
    'omp-web-operator',
    ['read-url', url, '--json'],
    { encoding: 'utf-8', timeout: 60_000 },
  );
  return JSON.parse(output);
}

/**
 * Ingest command: import raw material and trigger quick compile.
 *
 * @param source - URL, file path, or '--text' for stdin
 * @param opts - CLI options (--model, --mode)
 * @param textInput - Direct text input (for --text mode, used in tests)
 */
export async function ingestCommand(
  source: string,
  opts: GlobalOptions,
  textInput?: string,
): Promise<void> {
  // Guard: knowledge base must be initialized
  if (!isInitialized()) {
    console.error('Knowledge base not initialized. Run `kb-agent init` first.');
    return;
  }

  let markdownPath: string;

  if (source === '--text' || textInput) {
    // Text mode: save direct text input
    const content = textInput || '';
    if (!content.trim()) {
      console.error('No text input provided.');
      return;
    }

    const title = extractTitle(content) || `text-${Date.now()}`;
    const result = saveMarkdown({
      content,
      title,
      source: 'text-input',
    });

    if (result.alreadyExists) {
      console.log(`Already ingested: ${result.filename}`);
      return;
    }

    markdownPath = result.path;
    console.log(`Saved text to ${result.filename}`);

  } else if (isUrl(source)) {
    // URL mode: fetch via omp-web-operator
    let data: WebOperatorResult;
    try {
      data = fetchUrl(source);
    } catch (err: any) {
      if (err.status === 127 || err.message?.includes('command not found')) {
        console.error(
          'omp-web-operator not found. Install oh-my-superpowers:\n' +
          '  curl -fsSL https://raw.githubusercontent.com/anthropics/oh-my-superpowers/main/install.sh | bash'
        );
      } else {
        console.error(`Failed to fetch URL: ${err.message || err}`);
      }
      return;
    }

    const content = data.content ?? data.text ?? '';
    const title = data.title;
    const domain = data.domain ?? (data.url ? new URL(data.url).hostname : undefined);

    if (!content.trim()) {
      console.error(`Ingest failed: omp-web-operator returned no content for ${source}`);
      console.error('Raw response:', JSON.stringify(data, null, 2));
      return;
    }

    if (!title) {
      console.warn(`No title found for ${source}. Raw response logged to stderr for inspection.`);
      console.error('Raw response:', JSON.stringify(data, null, 2));
    }

    const result = saveMarkdown({
      content,
      title,
      source: data.url || source,
      domain,
      description: data.description,
    });

    if (result.alreadyExists) {
      console.log(`Already ingested: ${result.filename}`);
      return;
    }

    markdownPath = result.path;
    console.log(`Ingested: ${title || result.filename} (${domain || 'unknown'})`);
    if (!title) {
      console.warn('Title missing — filename derived from URL. Edit the markdown file to set a title if needed.');
    }

  } else {
    // Local file ingest (PDF, docx, images) — deferred until tech selection
    console.error(`Local file ingest not yet supported. Currently only URLs and --text are available.\nSource: ${source}`);
    return;
  }

  // Trigger quick compile
  console.log('Running quick compile...');
  await quickCompile(markdownPath, opts);
}
