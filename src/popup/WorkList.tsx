import { formatDate, formatDeadline, isOverdue } from "../domain/dates";
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

export function WorkList({ items, emptyText, selectedId, todosByItem, today, onSelect }: WorkListProps) {
  if (!items.length) return <p class="empty">{emptyText}</p>;
  return (
    <ul class="work-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            class={item.id === selectedId ? "work-row selected" : "work-row"}
            onClick={() => onSelect(item.id)}
          >
            <KindTile item={item} />
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
                <TodoProgress todos={todosByItem[item.id] ?? []} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
