import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { formatDate, formatDeadline, isOverdue } from "../domain/dates";
import { arrangeByOrder, moveKey } from "../domain/manual-order";
import { isFullyMerged, mergeProgress } from "../domain/merge-progress";
import { groupStacks, singlesBeforeStacks, type StackGroup } from "../domain/stacks";
import type { StatusColor, WorkItem } from "../domain/work-item";
import { todoProgress, type Todo } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { PullRequestCount } from "./PullRequestList";
import { StackHeader } from "./StackHeader";

interface WorkListProps {
  items: WorkItem[];
  emptyText: string;
  selectedId: string | null;
  todosByItem: Record<string, Todo[]>;
  today: Date;
  onSelect: (id: string) => void;
  order: string[];
  onReorder: (keys: string[]) => void;
  mergeMarks: ReadonlySet<string>;
}

type Entry = StackGroup<WorkItem>;

interface Section {
  key: string;
  title: string | null;
  color: StatusColor | null;
  merged: boolean;
  entries: Entry[];
}

const STATUS_ORDER = ["In Progress", "In Review", "Sprint Backlog", "Todo"];

const NO_STATUS = "Ohne Status";

interface DropTarget {
  key: string;
  after: boolean;
}

const entryKey = (entry: Entry) => entry.items[0].id;

const keysOf = (section: Section) => section.entries.map(entryKey);

function rankOf(status: string | null): number {
  if (status === null) return STATUS_ORDER.length + 1;
  const rank = STATUS_ORDER.indexOf(status);
  return rank === -1 ? STATUS_ORDER.length : rank;
}

function statusSectionsOf(entries: Entry[]): Section[] {
  const byStatus = new Map<string | null, Section>();
  for (const entry of entries) {
    const { status, statusColor } = entry.items[0];
    const section = byStatus.get(status) ?? {
      key: status === null ? "no-status" : `status:${status}`,
      title: status ?? NO_STATUS,
      color: status === null ? null : (statusColor ?? "GRAY"),
      merged: false,
      entries: [],
    };
    section.entries.push(entry);
    byStatus.set(status, section);
  }
  return [...byStatus.entries()].sort(([a], [b]) => rankOf(a) - rankOf(b)).map(([, section]) => section);
}

function sectionsOf(items: WorkItem[], order: string[], mergeMarks: ReadonlySet<string>): Section[] {
  const entries = arrangeByOrder(singlesBeforeStacks(groupStacks(items)), entryKey, order);
  if (!entries.some((entry) => entry.items[0].kind === "task")) {
    return [{ key: "all", title: null, color: null, merged: false, entries }];
  }
  const isMerged = (entry: Entry) => entry.items.every((item) => mergeMarks.has(item.id) || isFullyMerged(item));
  const merged = entries.filter(isMerged);
  const sections = statusSectionsOf(entries.filter((entry) => !isMerged(entry)));
  return merged.length ? [...sections, { key: "merged", title: "Gemergt", color: null, merged: true, entries: merged }] : sections;
}

function entryLabel(entry: Entry): string {
  return entry.isStack ? `Stack mit ${entry.items.length} PRs` : entry.items[0].title;
}

function isLowerHalf(event: DragEvent): boolean {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return event.clientY > box.top + box.height / 2;
}

export function KindTile({ item }: { item: WorkItem }) {
  return (
    <span class={`tile ${item.kind}`}>
      <Icon name={item.kind} />
    </span>
  );
}

export function DeadlineLabel({ deadline, today }: { deadline: string; today: Date }) {
  return (
    <span class={isOverdue(deadline, today) ? "badge deadline overdue" : "badge deadline"}>
      <Icon name="clock" small />
      Deadline {formatDeadline(deadline)}
    </span>
  );
}

export function StatusLabel({ item }: { item: WorkItem }) {
  if (item.kind !== "task" || !item.status) return null;
  const color = (item.statusColor ?? "GRAY").toLowerCase();
  return <span class={`badge status status-${color}`}>{item.status}</span>;
}

export function MergeLabel({ item, marked }: { item: WorkItem; marked: boolean }) {
  if (item.kind !== "task") return null;
  const progress = mergeProgress(item.pullRequests);
  if (marked || progress?.complete) {
    return (
      <span class="badge merged complete" title={progress?.complete ? undefined : "von dir markiert"}>
        <Icon name="check" small />
        Gemergt
      </span>
    );
  }
  if (!progress) return null;
  return (
    <span class="badge merged">
      {progress.merged}/{progress.total} gemergt
    </span>
  );
}

function TodoProgress({ todos }: { todos: Todo[] }) {
  const { done, total } = todoProgress(todos);
  return total ? (
    <span class="badge progress">
      <Icon name="todos" small />
      {done}/{total}
    </span>
  ) : null;
}

interface WorkRowProps {
  item: WorkItem;
  step: number | null;
  selected: boolean;
  todos: Todo[];
  today: Date;
  marked: boolean;
  onSelect: (id: string) => void;
}

function WorkRow({ item, step, selected, todos, today, marked, onSelect }: WorkRowProps) {
  return (
    <button type="button" class={selected ? "work-row selected" : "work-row"} onClick={() => onSelect(item.id)}>
      {step === null ? (
        <KindTile item={item} />
      ) : (
        <span class={`tile ${item.kind} step`}>
          {step}
        </span>
      )}
      <span class="work-body">
        <span class="work-title">{item.title}</span>
        <span class="work-source">
          {item.repository} #{item.number}
        </span>
        <span class="meta">
          {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
          {item.closedAt && <span class="badge">geschlossen {formatDate(item.closedAt)}</span>}
          <StatusLabel item={item} />
          <MergeLabel item={item} marked={marked} />
          <PullRequestCount item={item} />
          <TodoProgress todos={todos} />
        </span>
      </span>
    </button>
  );
}

function SectionHeader({ section, folded, onToggle }: { section: Section; folded: boolean; onToggle: () => void }) {
  return (
    <button type="button" class="work-section-header" aria-expanded={!folded} onClick={onToggle}>
      {section.color && <span class={`status-dot status-${section.color.toLowerCase()}`} />}
      <span class="work-section-title">{section.title}</span>
      <span class="count">{section.entries.length}</span>
      <span class="work-section-rule" />
      <Icon name="chevron" small />
    </button>
  );
}

interface WorkEntryProps {
  entry: Entry;
  dragging: boolean;
  drop: "before" | "after" | null;
  onDragStart: () => void;
  onDragOver: (after: boolean) => boolean;
  onDrop: (after: boolean) => boolean;
  onDragEnd: () => void;
  onMove: (step: -1 | 1) => void;
  children: ComponentChildren;
}

const MOVE_KEYS: Record<string, -1 | 1> = { ArrowUp: -1, ArrowDown: 1 };

function WorkEntry({ entry, dragging, drop, onDragStart, onDragOver, onDrop, onDragEnd, onMove, children }: WorkEntryProps) {
  const classes = ["work-entry", dragging && "dragging", drop && `drop-${drop}`].filter(Boolean).join(" ");
  return (
    <li
      class={classes}
      draggable
      onDragStart={(event) => {
        event.dataTransfer?.setData("text/plain", entryKey(entry));
        onDragStart();
      }}
      onDragOver={(event) => {
        if (onDragOver(isLowerHalf(event))) event.preventDefault();
      }}
      onDrop={(event) => {
        if (onDrop(isLowerHalf(event))) event.preventDefault();
      }}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        class="drag-handle"
        aria-label={`${entryLabel(entry)} verschieben`}
        title="Ziehen oder mit den Pfeiltasten verschieben"
        onKeyDown={(event) => {
          const step = MOVE_KEYS[event.key];
          if (!step) return;
          event.preventDefault();
          onMove(step);
        }}
      >
        <Icon name="grip" small />
      </button>
      <div class="work-entry-body">{children}</div>
    </li>
  );
}

export function WorkList(props: WorkListProps) {
  const { items, emptyText, selectedId, todosByItem, today, onSelect, order, onReorder, mergeMarks } = props;
  const [foldedSections, setFoldedSections] = useState<ReadonlySet<string>>(new Set());
  const [dragged, setDragged] = useState<{ key: string; section: Section["key"] } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  if (!items.length) return <p class="empty">{emptyText}</p>;

  const toggleFold = (key: string) => {
    const next = new Set(foldedSections);
    if (!next.delete(key)) next.add(key);
    setFoldedSections(next);
  };

  const sections = sectionsOf(items, order, mergeMarks);
  const reorder = (section: Section, moving: string, target: string, after: boolean) => {
    const keys = moveKey(keysOf(section), moving, target, after);
    onReorder(sections.flatMap((each) => (each === section ? keys : keysOf(each))));
  };
  const endDrag = () => {
    setDragged(null);
    setDropTarget(null);
  };
  const rowFor = (item: WorkItem, step: number | null) => (
    <WorkRow
      item={item}
      step={step}
      selected={item.id === selectedId}
      todos={todosByItem[item.id] ?? []}
      today={today}
      marked={mergeMarks.has(item.id)}
      onSelect={onSelect}
    />
  );
  const entryFor = (section: Section, entry: Entry) => {
    const key = entryKey(entry);
    const accepts = dragged !== null && dragged.section === section.key;
    const neighbour = (step: -1 | 1) => keysOf(section)[keysOf(section).indexOf(key) + step];
    return (
      <WorkEntry
        key={key}
        entry={entry}
        dragging={dragged?.key === key}
        drop={dropTarget?.key === key ? (dropTarget.after ? "after" : "before") : null}
        onDragStart={() => setDragged({ key, section: section.key })}
        onDragOver={(after) => {
          if (!accepts) return false;
          if (dropTarget?.key !== key || dropTarget.after !== after) setDropTarget({ key, after });
          return true;
        }}
        onDrop={(after) => {
          if (!accepts || !dragged) return false;
          reorder(section, dragged.key, key, after);
          endDrag();
          return true;
        }}
        onDragEnd={endDrag}
        onMove={(step) => {
          const target = neighbour(step);
          if (target) reorder(section, key, target, step === 1);
        }}
      >
        {entry.isStack ? (
          <div class="stack">
            <StackHeader size={entry.items.length} base={entry.base} />
            <ol class="stack-list">
              {entry.items.map((item, index) => (
                <li key={item.id}>{rowFor(item, index + 1)}</li>
              ))}
            </ol>
          </div>
        ) : (
          rowFor(entry.items[0], null)
        )}
      </WorkEntry>
    );
  };

  return (
    <div class="work-list">
      {sections.map((section) => {
        const folded = foldedSections.has(section.key);
        return (
          <section key={section.key} class={section.merged ? "work-section merged" : "work-section"}>
            {section.title && (
              <SectionHeader section={section} folded={folded} onToggle={() => toggleFold(section.key)} />
            )}
            {!folded && <ul class="work-group">{section.entries.map((entry) => entryFor(section, entry))}</ul>}
          </section>
        );
      })}
    </div>
  );
}
