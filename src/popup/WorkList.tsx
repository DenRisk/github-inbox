import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { formatDate, formatDeadline, isOverdue } from "../domain/dates";
import { arrangeByOrder, moveKey } from "../domain/manual-order";
import { isFullyMerged, mergeProgress } from "../domain/merge-progress";
import { groupStacks, singlesBeforeStacks, type StackGroup } from "../domain/stacks";
import type { IssueRef, StatusColor, WorkItem } from "../domain/work-item";
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
  onOpen: (url: string) => void;
}

interface Entry {
  key: string;
  group: StackGroup<WorkItem> | null;
  heading: IssueRef | null;
  children: WorkItem[];
}

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

const keysOf = (section: Section) => section.entries.map((entry) => entry.key);

const childKeysOf = (entry: Entry) => entry.children.map((child) => child.id);

const epicGroupKey = (entry: Entry) => `epic:${entry.key}`;

function rankOf(status: string | null): number {
  if (status === null) return STATUS_ORDER.length + 1;
  const rank = STATUS_ORDER.indexOf(status);
  return rank === -1 ? STATUS_ORDER.length : rank;
}

function leadOf(entry: Entry): WorkItem {
  return entry.group?.items[0] ?? [...entry.children].sort((a, b) => rankOf(a.status) - rankOf(b.status))[0];
}

function itemsOf(entry: Entry): WorkItem[] {
  return [...(entry.group?.items ?? []), ...entry.children];
}

function epicOf(item: WorkItem, epicIds: ReadonlySet<string>): IssueRef | null {
  return item.kind === "task" && !epicIds.has(item.id) ? (item.parent ?? null) : null;
}

function entriesOf(items: WorkItem[], order: string[]): Entry[] {
  const epicIds = new Set(items.flatMap((item) => (item.parent ? [item.parent.id] : [])));
  const childrenOf = new Map<string, WorkItem[]>();
  const headings = new Map<string, IssueRef>();
  const topLevel: WorkItem[] = [];
  for (const item of items) {
    const epic = epicOf(item, epicIds);
    if (!epic) {
      topLevel.push(item);
      continue;
    }
    childrenOf.set(epic.id, [...(childrenOf.get(epic.id) ?? []), item]);
    headings.set(epic.id, epic);
  }
  const childrenFor = (key: string) => arrangeByOrder(childrenOf.get(key) ?? [], (child) => child.id, order);
  const entries: Entry[] = singlesBeforeStacks(groupStacks(topLevel)).map((group) => ({
    key: group.items[0].id,
    group,
    heading: null,
    children: childrenFor(group.items[0].id),
  }));
  const shown = new Set(topLevel.map((item) => item.id));
  for (const [key, heading] of headings) {
    if (!shown.has(key)) entries.push({ key, group: null, heading, children: childrenFor(key) });
  }
  return arrangeByOrder(entries, (entry) => entry.key, order);
}

function statusSectionsOf(entries: Entry[]): Section[] {
  const byStatus = new Map<string | null, Section>();
  for (const entry of entries) {
    const { status, statusColor } = leadOf(entry);
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
  const entries = entriesOf(items, order);
  if (!entries.some((entry) => leadOf(entry).kind === "task")) {
    return [{ key: "all", title: null, color: null, merged: false, entries }];
  }
  const isMerged = (entry: Entry) => itemsOf(entry).every((item) => mergeMarks.has(item.id) || isFullyMerged(item));
  const merged = entries.filter(isMerged);
  const sections = statusSectionsOf(entries.filter((entry) => !isMerged(entry)));
  return merged.length ? [...sections, { key: "merged", title: "Gemergt", color: null, merged: true, entries: merged }] : sections;
}

function entryLabel(entry: Entry): string {
  if (!entry.group) return entry.heading?.title ?? "";
  return entry.group.isStack ? `Stack mit ${entry.group.items.length} PRs` : entry.group.items[0].title;
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

function SubIssueProgress({ item }: { item: WorkItem }) {
  return item.subIssues ? (
    <span class="badge sub-issues">
      {item.subIssues.completed}/{item.subIssues.total} erledigt
    </span>
  ) : null;
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
          <SubIssueProgress item={item} />
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

function EpicHeading({ epic, onOpen }: { epic: IssueRef; onOpen: (url: string) => void }) {
  return (
    <a
      class="work-row epic-heading"
      href={epic.url}
      onClick={(event) => {
        event.preventDefault();
        onOpen(epic.url);
      }}
    >
      <span class="tile task">
        <Icon name="board" />
      </span>
      <span class="work-body">
        <span class="work-title">{epic.title}</span>
        <span class="work-source">
          {epic.repository} #{epic.number} · Epic
        </span>
      </span>
      <Icon name="opens" small />
    </a>
  );
}

interface WorkEntryProps {
  dragKey: string;
  label: string;
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

function WorkEntry({ dragKey, label, dragging, drop, onDragStart, onDragOver, onDrop, onDragEnd, onMove, children }: WorkEntryProps) {
  const classes = ["work-entry", dragging && "dragging", drop && `drop-${drop}`].filter(Boolean).join(" ");
  return (
    <li
      class={classes}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer?.setData("text/plain", dragKey);
        onDragStart();
      }}
      onDragOver={(event) => {
        if (!onDragOver(isLowerHalf(event))) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        if (!onDrop(isLowerHalf(event))) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragEnd={(event) => {
        event.stopPropagation();
        onDragEnd();
      }}
    >
      <button
        type="button"
        class="drag-handle"
        aria-label={`${label} verschieben`}
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
  const { items, emptyText, selectedId, todosByItem, today, onSelect, order, onReorder, mergeMarks, onOpen } = props;
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const [dragged, setDragged] = useState<{ key: string; group: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  if (!items.length) return <p class="empty">{emptyText}</p>;

  const toggleFold = (key: string) => {
    const next = new Set(folded);
    if (!next.delete(key)) next.add(key);
    setFolded(next);
  };

  const sections = sectionsOf(items, order, mergeMarks);
  const entryByKey = new Map(sections.flatMap((section) => section.entries.map((entry) => [entry.key, entry] as const)));
  const reorder = (group: string, siblings: string[], moving: string, target: string, after: boolean) => {
    const keys = moveKey(siblings, moving, target, after);
    const arranged = (key: string, current: string[]) => (key === group ? keys : current);
    onReorder(
      sections.flatMap((section) =>
        arranged(section.key, keysOf(section)).flatMap((key) => {
          const entry = entryByKey.get(key);
          return entry ? [key, ...arranged(epicGroupKey(entry), childKeysOf(entry))] : [key];
        }),
      ),
    );
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
  const movable = (group: string, siblings: string[], key: string, label: string, children: ComponentChildren) => {
    const accepts = dragged !== null && dragged.group === group;
    const neighbour = (step: -1 | 1) => siblings[siblings.indexOf(key) + step];
    return (
      <WorkEntry
        key={key}
        dragKey={key}
        label={label}
        dragging={dragged?.key === key}
        drop={dropTarget?.key === key ? (dropTarget.after ? "after" : "before") : null}
        onDragStart={() => setDragged({ key, group })}
        onDragOver={(after) => {
          if (!accepts) return false;
          if (dropTarget?.key !== key || dropTarget.after !== after) setDropTarget({ key, after });
          return true;
        }}
        onDrop={(after) => {
          if (!accepts || !dragged) return false;
          reorder(group, siblings, dragged.key, key, after);
          endDrag();
          return true;
        }}
        onDragEnd={endDrag}
        onMove={(step) => {
          const target = neighbour(step);
          if (target) reorder(group, siblings, key, target, step === 1);
        }}
      >
        {children}
      </WorkEntry>
    );
  };
  const headOf = (entry: Entry) => {
    if (entry.heading) return <EpicHeading epic={entry.heading} onOpen={onOpen} />;
    if (!entry.group?.isStack) return rowFor(leadOf(entry), null);
    return (
      <div class="stack">
        <StackHeader size={entry.group.items.length} base={entry.group.base} />
        <ol class="stack-list">
          {entry.group.items.map((item, index) => (
            <li key={item.id}>{rowFor(item, index + 1)}</li>
          ))}
        </ol>
      </div>
    );
  };
  const withChildren = (entry: Entry) => {
    const group = epicGroupKey(entry);
    const open = !folded.has(group);
    const siblings = childKeysOf(entry);
    return (
      <div class="epic">
        <div class="epic-head">
          {headOf(entry)}
          <button
            type="button"
            class="epic-toggle"
            aria-label={`Unteraufgaben von ${entryLabel(entry)}`}
            aria-expanded={open}
            title={open ? "Unteraufgaben einklappen" : "Unteraufgaben ausklappen"}
            onClick={() => toggleFold(group)}
          >
            <Icon name="chevron" small />
          </button>
        </div>
        {open && (
          <ul class="work-group epic-children">
            {entry.children.map((child) => movable(group, siblings, child.id, child.title, rowFor(child, null)))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div class="work-list">
      {sections.map((section) => {
        const sectionFolded = folded.has(section.key);
        const siblings = keysOf(section);
        return (
          <section key={section.key} class={section.merged ? "work-section merged" : "work-section"}>
            {section.title && (
              <SectionHeader section={section} folded={sectionFolded} onToggle={() => toggleFold(section.key)} />
            )}
            {!sectionFolded && (
              <ul class="work-group">
                {section.entries.map((entry) =>
                  movable(
                    section.key,
                    siblings,
                    entry.key,
                    entryLabel(entry),
                    entry.children.length ? withChildren(entry) : headOf(entry),
                  ),
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
