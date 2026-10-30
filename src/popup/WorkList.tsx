import { formatDate, formatDeadline, isOverdue } from "../domain/dates";
import { groupStacks, type WorkGroup } from "../domain/stacks";
import type { WorkItem } from "../domain/work-item";
import { todoProgress, type Todo } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { PullRequestCount } from "./PullRequestList";

interface WorkListProps {
  items: WorkItem[];
  emptyText: string;
  selectedId: string | null;
  todosByItem: Record<string, Todo[]>;
  today: Date;
  onSelect: (id: string) => void;
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
  onSelect: (id: string) => void;
}

function WorkRow({ item, step, selected, todos, today, onSelect }: WorkRowProps) {
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
          <PullRequestCount item={item} />
          <TodoProgress todos={todos} />
        </span>
      </span>
    </button>
  );
}

function StackHeader({ group }: { group: WorkGroup }) {
  return (
    <div class="stack-header">
      <Icon name="stack" small />
      <span>Stack mit {group.items.length} PRs</span>
      {group.base && <span class="stack-base">auf {group.base}</span>}
    </div>
  );
}

export function WorkList({ items, emptyText, selectedId, todosByItem, today, onSelect }: WorkListProps) {
  if (!items.length) return <p class="empty">{emptyText}</p>;
  const rowFor = (item: WorkItem, step: number | null) => (
    <WorkRow
      item={item}
      step={step}
      selected={item.id === selectedId}
      todos={todosByItem[item.id] ?? []}
      today={today}
      onSelect={onSelect}
    />
  );
  return (
    <ul class="work-list">
      {groupStacks(items).map((group) =>
        group.isStack ? (
          <li key={group.items[0].id} class="stack">
            <StackHeader group={group} />
            <ol class="stack-list">
              {group.items.map((item, index) => (
                <li key={item.id}>{rowFor(item, index + 1)}</li>
              ))}
            </ol>
          </li>
        ) : (
          <li key={group.items[0].id}>{rowFor(group.items[0], null)}</li>
        ),
      )}
    </ul>
  );
}
