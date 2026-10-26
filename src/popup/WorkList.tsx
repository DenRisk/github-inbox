import { formatDate, formatDeadline, isOverdue } from "../domain/dates";
import type { WorkItem } from "../domain/work-item";
import { todoProgress, type Todo } from "../todos/todo-store";

interface WorkListProps {
  items: WorkItem[];
  emptyText: string;
  selectedId: string | null;
  todosByItem: Record<string, Todo[]>;
  today: Date;
  onSelect: (id: string) => void;
}

export function DeadlineLabel({ deadline, today }: { deadline: string; today: Date }) {
  return (
    <span class={isOverdue(deadline, today) ? "deadline overdue" : "deadline"}>
      Deadline {formatDeadline(deadline)}
    </span>
  );
}

function TodoProgress({ todos }: { todos: Todo[] }) {
  const { done, total } = todoProgress(todos);
  return total ? <span class="progress">☐ {done}/{total}</span> : null;
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
            <span class="work-title">{item.title}</span>
            <span class="meta">
              <span>
                {item.repository} #{item.number}
              </span>
              {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
              {item.closedAt && <span>geschlossen {formatDate(item.closedAt)}</span>}
              {item.kind === "task" && item.status && <span class="status">{item.status}</span>}
              <TodoProgress todos={todosByItem[item.id] ?? []} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
