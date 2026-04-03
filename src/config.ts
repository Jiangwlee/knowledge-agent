// src/config.ts — Data directory and configuration management
//
// Runtime data lives at ~/.local/share/kb-agent/ (or KB_AGENT_DATA_DIR).
// This module resolves paths but does NOT create directories (init command does that).

import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';

export interface Config {
  version: string;
  createdAt: string;
}

const DEFAULT_DATA_DIR = join(homedir(), '.local', 'share', 'kb-agent');

export type SubDir = 'raw' | 'markdown' | 'wiki';

export function getDataDir(): string {
  return process.env.KB_AGENT_DATA_DIR || DEFAULT_DATA_DIR;
}

export function getSubDir(name: SubDir): string {
  return join(getDataDir(), name);
}

export function getConfigPath(): string {
  return join(getDataDir(), 'config.json');
}

export function readConfig(): Config | null {
  try {
    const raw = readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return null;
  }
}

export function writeConfig(config: Config): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
