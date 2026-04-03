// src/pipeline/atomic-write.ts — Atomic file write via temp + rename
//
// Prevents corrupted files from partial writes (e.g., process crash mid-write).
// Write to a sibling temp file, then rename (atomic on same filesystem).

import { writeFileSync, renameSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

/**
 * Write content to a file atomically.
 * Creates a temp file in the same directory, writes content, then renames.
 */
export function writeFileAtomic(filepath: string, content: string): void {
  const dir = dirname(filepath);
  const tmpPath = join(dir, `.${basename(filepath)}.tmp.${process.pid}`);

  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filepath);
}
