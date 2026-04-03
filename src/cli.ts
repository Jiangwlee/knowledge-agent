// src/cli.ts — CLI routing with commander
//
// Entry point for all kb-agent subcommands.
// Global options (--model, --mode) are parsed here and passed to handlers.

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { ingestCommand } from './commands/ingest.js';
import { compileCommand } from './commands/compile.js';
import { lintCommand } from './commands/lint.js';
import { queryCommand } from './commands/query.js';
import { chatCommand } from './commands/chat.js';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { resolve(data.trim()); });
    process.stdin.resume();
  });
}

export interface GlobalOptions {
  model?: string;
  mode?: string;
}

function createProgram(): Command {
  const program = new Command();

  program
    .name('kb-agent')
    .description('CLI knowledge management tool — compiles raw sources into a structured, queryable wiki')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize knowledge base directory structure')
    .action(async () => {
      await initCommand();
    });

  program
    .command('ingest <source>')
    .description('Import raw material (URL or --text for stdin)')
    .option('--model <model>', 'LLM model override')
    .option('--mode <mode>', 'Pi output mode: text / stream / json / interactive', 'text')
    .action(async (source: string, opts: GlobalOptions) => {
      let textInput: string | undefined;
      if (source === '--text' && !process.stdin.isTTY) {
        textInput = await readStdin();
      }
      await ingestCommand(source, opts, textInput);
    });

  program
    .command('compile')
    .description('Deep compile: cross-source synthesis, concept extraction, maps generation')
    .option('--model <model>', 'LLM model override')
    .option('--mode <mode>', 'Pi output mode: text / stream / json / interactive', 'text')
    .action(async (opts: GlobalOptions) => {
      await compileCommand(opts);
    });

  program
    .command('lint')
    .description('Health check: find contradictions, gaps, and suggest new connections')
    .option('--model <model>', 'LLM model override')
    .option('--mode <mode>', 'Pi output mode: text / stream / json / interactive', 'text')
    .action(async (opts: GlobalOptions) => {
      await lintCommand(opts);
    });

  program
    .command('query <question>')
    .description('Ask a question against the wiki')
    .option('--model <model>', 'LLM model override')
    .option('--mode <mode>', 'Pi output mode: text / stream / json / interactive', 'text')
    .action(async (question: string, opts: GlobalOptions) => {
      await queryCommand(question, opts);
    });

  program
    .command('chat')
    .description('Interactive chat with the knowledge base (Pi TUI)')
    .option('--model <model>', 'LLM model override')
    .option('--mode <mode>', 'Pi output mode: text / stream / json / interactive', 'interactive')
    .action(async (opts: GlobalOptions) => {
      await chatCommand(opts);
    });

  return program;
}

export async function main(argv?: string[]): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv ?? process.argv);
}
