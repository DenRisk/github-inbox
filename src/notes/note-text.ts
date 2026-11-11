import type { WorkItem } from "../domain/work-item";

export interface NoteReference {
  itemId: string;
  url: string;
  repository: string;
  number: number;
  title: string;
}

export type NoteSegment = { kind: "text"; text: string } | { kind: "reference"; reference: NoteReference };

export interface Mention {
  start: number;
  query: string;
}

const MARKER = /@([\w.-]+)#(\d+)/g;
const MAX_HITS = 8;

export function referenceOf(item: WorkItem): NoteReference {
  return { itemId: item.id, url: item.url, repository: item.repository, number: item.number, title: item.title };
}

export function markerOf(reference: Pick<NoteReference, "repository" | "number">): string {
  return `@${reference.repository}#${reference.number}`;
}

function referenceFor(references: NoteReference[], repository: string, number: number): NoteReference | undefined {
  return references.find((reference) => reference.repository === repository && reference.number === number);
}

export function segmentsOf(text: string, references: NoteReference[]): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let pending = "";
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    const reference = referenceFor(references, match[1], Number(match[2]));
    if (!reference) continue;
    pending += text.slice(last, match.index);
    if (pending) segments.push({ kind: "text", text: pending });
    segments.push({ kind: "reference", reference });
    pending = "";
    last = match.index + match[0].length;
  }
  pending += text.slice(last);
  if (pending) segments.push({ kind: "text", text: pending });
  return segments;
}

export function pruneReferences(text: string, references: NoteReference[]): NoteReference[] {
  const kept: NoteReference[] = [];
  for (const match of text.matchAll(MARKER)) {
    const reference = referenceFor(references, match[1], Number(match[2]));
    if (reference && !kept.includes(reference)) kept.push(reference);
  }
  return kept;
}

export function mentionAt(text: string, caret: number): Mention | null {
  if (caret <= 0) return null;
  const start = text.lastIndexOf("@", caret - 1);
  if (start < 0) return null;
  const query = text.slice(start + 1, caret);
  if (/\s/.test(query)) return null;
  if (start > 0 && !/\s/.test(text[start - 1])) return null;
  return { start, query };
}

export function insertReference(
  text: string,
  mention: Mention,
  reference: NoteReference,
  caret: number,
): { text: string; caret: number } {
  const rest = text.slice(caret);
  const marker = /^\s/.test(rest) ? markerOf(reference) : `${markerOf(reference)} `;
  const before = text.slice(0, mention.start) + marker;
  return { text: before + rest, caret: before.length };
}

export function searchItems(items: WorkItem[], query: string): WorkItem[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^#+/, ""))
    .filter(Boolean);
  return items
    .filter((item) => {
      const haystack = `${item.title} ${item.repository} ${item.number}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, MAX_HITS);
}
