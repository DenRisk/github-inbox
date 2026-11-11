import type { StatusColor } from "./work-item";

export interface IssueType {
  name: string;
  color: StatusColor;
}

export interface IssueTypeSource {
  declared: IssueType | null;
  hasSubIssues: boolean;
  title: string;
  labels: string[];
}

const KNOWN_TYPES: Record<string, IssueType> = {
  bug: { name: "Bug", color: "RED" },
  feature: { name: "Feature", color: "BLUE" },
  refactoring: { name: "Refactoring", color: "GREEN" },
  epic: { name: "Epic", color: "PURPLE" },
};

const TITLE_PREFIX = /^\s*\[([^\]]+)\]/;

function knownType(name: string): IssueType | undefined {
  return KNOWN_TYPES[name.trim().toLowerCase()];
}

function typeFromTitle(title: string): IssueType | null {
  const name = TITLE_PREFIX.exec(title)?.[1].trim();
  if (!name) return null;
  return knownType(name) ?? { name, color: "GRAY" };
}

function typeFromLabels(labels: string[]): IssueType | null {
  return labels.map(knownType).find((type) => type !== undefined) ?? null;
}

export function deriveIssueType({ declared, hasSubIssues, title, labels }: IssueTypeSource): IssueType | null {
  if (declared) return declared;
  if (hasSubIssues) return KNOWN_TYPES.epic;
  return typeFromTitle(title) ?? typeFromLabels(labels);
}
