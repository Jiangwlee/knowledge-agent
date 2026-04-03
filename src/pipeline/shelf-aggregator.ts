// src/pipeline/shelf-aggregator.ts — Aggregate source-level classifications into shelf-level signals

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSubDir } from '../config.js';
import { readMarkdownWithFrontmatter, slugify } from './markdown.js';

export type ShelfConfidence = 'high' | 'medium' | 'low';
export type ActivationStatus = 'inactive' | 'active_stage1' | 'active_stage2' | 'degrading';

export interface SourceClassificationRecord {
  path: string;
  title: string;
  sourceType: string;
  primarySubject: string;
  candidateShelves: string[];
  recommendedShelf: string | null;
  unassigned: boolean;
  shelfConfidence?: ShelfConfidence;
  classificationReason?: string;
  body: string;
}

export interface SourceClassificationIssue {
  path: string;
  issue: string;
}

export interface ShelfAggregate {
  shelf: string;
  sourceCount: number;
  sourcePaths: string[];
  primarySubjects: string[];
  sourceTypes: string[];
  unassignedRelatedCount: number;
  hasConceptCandidates: boolean;
  hasMapCandidates: boolean;
  activationStatus: ActivationStatus;
  notes: string[];
}

export interface SourceClassificationScan {
  assigned: SourceClassificationRecord[];
  unassigned: SourceClassificationRecord[];
  invalid: SourceClassificationIssue[];
  aggregates: ShelfAggregate[];
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidConfidence(value: unknown): value is ShelfConfidence {
  return value === 'high' || value === 'medium' || value === 'low';
}

function parseSourceClassification(path: string): SourceClassificationRecord | SourceClassificationIssue {
  const { frontmatter, body } = readMarkdownWithFrontmatter<Record<string, unknown>>(path);
  const relativePath = `sources/${path.split('/').pop()}`;

  const kind = frontmatter.kind;
  const title = normalizeOptionalString(frontmatter.title);
  const sourceType = normalizeOptionalString(frontmatter.source_type);
  const primarySubject = normalizeOptionalString(frontmatter.primary_subject);
  const candidateShelves = normalizeStringArray(frontmatter.candidate_shelves);
  const recommendedShelf = normalizeOptionalString(frontmatter.recommended_shelf);
  const unassigned = frontmatter.unassigned;
  const shelfConfidence = frontmatter.shelf_confidence;
  const classificationReason = normalizeOptionalString(frontmatter.classification_reason) ?? undefined;

  if (kind !== 'source') {
    return { path: relativePath, issue: 'kind must be source' };
  }
  if (!title) {
    return { path: relativePath, issue: 'missing title' };
  }
  if (!sourceType) {
    return { path: relativePath, issue: 'missing source_type' };
  }
  if (!primarySubject) {
    return { path: relativePath, issue: 'missing primary_subject' };
  }
  if (typeof unassigned !== 'boolean') {
    return { path: relativePath, issue: 'unassigned must be boolean' };
  }
  if (recommendedShelf && !candidateShelves.includes(recommendedShelf)) {
    return { path: relativePath, issue: 'recommended_shelf must appear in candidate_shelves' };
  }
  if (recommendedShelf === null && unassigned !== true) {
    return { path: relativePath, issue: 'unassigned must be true when recommended_shelf is null' };
  }
  if (recommendedShelf !== null && unassigned !== false) {
    return { path: relativePath, issue: 'unassigned must be false when recommended_shelf is set' };
  }
  if (shelfConfidence !== undefined && !isValidConfidence(shelfConfidence)) {
    return { path: relativePath, issue: 'invalid shelf_confidence' };
  }

  return {
    path: relativePath,
    title,
    sourceType,
    primarySubject,
    candidateShelves,
    recommendedShelf,
    unassigned,
    shelfConfidence: isValidConfidence(shelfConfidence) ? shelfConfidence : undefined,
    classificationReason,
    body,
  };
}

function summarizePrimarySubjects(records: SourceClassificationRecord[]): string[] {
  return [...new Set(records.map(record => record.primarySubject))];
}

function summarizeSourceTypes(records: SourceClassificationRecord[]): string[] {
  return [...new Set(records.map(record => record.sourceType))];
}

function hasTopicConcentration(records: SourceClassificationRecord[]): boolean {
  const subjects = summarizePrimarySubjects(records);
  if (records.length < 3) return false;
  if (subjects.length === 0) return false;
  return subjects.length <= Math.max(2, Math.ceil(records.length / 2));
}

function detectConceptCandidates(records: SourceClassificationRecord[]): boolean {
  if (records.length < 4) return false;
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.primarySubject, (counts.get(record.primarySubject) ?? 0) + 1);
  }
  return [...counts.values()].some(count => count >= 2);
}

function detectMapCandidates(records: SourceClassificationRecord[]): boolean {
  if (records.length < 5) return false;
  return hasTopicConcentration(records) && summarizeSourceTypes(records).length >= 2;
}

function inferActivationStatus(
  shelf: string,
  records: SourceClassificationRecord[],
  wikiDir: string,
): ActivationStatus {
  const byTopicPath = join(wikiDir, '_index', 'by-topic', `${slugify(shelf)}.md`);
  const enoughSources = records.length >= 3;
  const concentrated = hasTopicConcentration(records);

  if (enoughSources && concentrated) {
    if (detectConceptCandidates(records) || detectMapCandidates(records)) {
      return 'active_stage2';
    }
    return 'active_stage1';
  }

  // Only mark as degrading if the shelf was previously active (by-topic file exists)
  // AND still has some sources. A shelf with 0 sources and an old by-topic file
  // is simply inactive — the file is retained per design but doesn't imply degrading.
  if (existsSync(byTopicPath) && records.length > 0) {
    return 'degrading';
  }

  return 'inactive';
}

function buildAggregateNotes(records: SourceClassificationRecord[], activationStatus: ActivationStatus): string[] {
  const notes: string[] = [];
  const subjects = summarizePrimarySubjects(records);

  if (records.length < 3) {
    notes.push('Below initial activation threshold.');
  }
  if (!hasTopicConcentration(records)) {
    notes.push('Primary subjects appear too diffuse for a stable shelf.');
  }
  if (activationStatus === 'active_stage1') {
    notes.push('Shelf is active but still in flat stage; concepts/maps are not yet stable.');
  }
  if (activationStatus === 'active_stage2') {
    notes.push('Shelf shows enough structure for concepts/maps.');
  }
  if (subjects.length > 0) {
    notes.push(`Dominant subjects: ${subjects.slice(0, 3).join('; ')}`);
  }

  return notes;
}

export function scanSourceClassifications(wikiDir = getSubDir('wiki')): SourceClassificationScan {
  const sourcesDir = join(wikiDir, 'sources');
  if (!existsSync(sourcesDir)) {
    return { assigned: [], unassigned: [], invalid: [], aggregates: [] };
  }

  const assigned: SourceClassificationRecord[] = [];
  const unassigned: SourceClassificationRecord[] = [];
  const invalid: SourceClassificationIssue[] = [];

  for (const filename of readdirSync(sourcesDir).filter(name => name.endsWith('.md'))) {
    const parsed = parseSourceClassification(join(sourcesDir, filename));
    if ('issue' in parsed) {
      invalid.push(parsed);
      continue;
    }

    if (parsed.unassigned || parsed.recommendedShelf === null) {
      unassigned.push(parsed);
    } else {
      assigned.push(parsed);
    }
  }

  const shelves = [...new Set(assigned.map(record => record.recommendedShelf!).filter(Boolean))];
  const aggregates = shelves.map((shelf) => {
    const records = assigned.filter(record => record.recommendedShelf === shelf);
    const unassignedRelatedCount = unassigned.filter(record => record.candidateShelves.includes(shelf)).length;
    const hasConceptCandidates = detectConceptCandidates(records);
    const hasMapCandidates = detectMapCandidates(records);
    const activationStatus = inferActivationStatus(shelf, records, wikiDir);

    return {
      shelf,
      sourceCount: records.length,
      sourcePaths: records.map(record => record.path),
      primarySubjects: summarizePrimarySubjects(records),
      sourceTypes: summarizeSourceTypes(records),
      unassignedRelatedCount,
      hasConceptCandidates,
      hasMapCandidates,
      activationStatus,
      notes: buildAggregateNotes(records, activationStatus),
    };
  });

  return {
    assigned,
    unassigned,
    invalid,
    aggregates: aggregates.sort((a, b) => a.shelf.localeCompare(b.shelf)),
  };
}

export function formatShelfAggregateSummary(scan: SourceClassificationScan): string {
  const lines: string[] = [];
  lines.push(`Assigned sources: ${scan.assigned.length}`);
  lines.push(`Unassigned sources: ${scan.unassigned.length}`);
  lines.push(`Invalid sources: ${scan.invalid.length}`);

  if (scan.invalid.length > 0) {
    lines.push('Invalid source classifications:');
    for (const issue of scan.invalid) {
      lines.push(`- ${issue.path}: ${issue.issue}`);
    }
  }

  if (scan.aggregates.length === 0) {
    lines.push('Shelf aggregates: (none)');
    return lines.join('\n');
  }

  lines.push('Shelf aggregates:');
  for (const aggregate of scan.aggregates) {
    lines.push(
      `- ${aggregate.shelf}: ${aggregate.activationStatus} | sources=${aggregate.sourceCount} | concepts=${aggregate.hasConceptCandidates ? 'yes' : 'no'} | maps=${aggregate.hasMapCandidates ? 'yes' : 'no'} | unassigned_related=${aggregate.unassignedRelatedCount}`,
    );
    for (const note of aggregate.notes) {
      lines.push(`  - ${note}`);
    }
  }

  return lines.join('\n');
}
