import { formatDate } from "../domain/dates";
import type { WorkItem } from "../domain/work-item";
import type { TodoStore } from "../todos/todo-store";
import { TodoList } from "./TodoList";
import { DeadlineLabel } from "./WorkList";

interface WorkDetailProps {
  item: WorkItem;
  today: Date;
  todos: TodoStore;
  onTodosChange: () => void;
  onOpen: (url: string) => void;
}

export function WorkDetail({ item, today, todos, onTodosChange, onOpen }: WorkDetailProps) {
  const description = item.body.trim();
  return (
    <article class="detail">
      <h2 class="detail-title">{item.title}</h2>
      <p class="meta">
        <span>
          {item.repository} #{item.number} · erstellt {formatDate(item.createdAt)}
          {item.closedAt && ` · geschlossen ${formatDate(item.closedAt)}`}
        </span>
        {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
        {item.kind === "task" && item.status && <span class="status">{item.status}</span>}
      </p>
      <a
        class="open-link"
        href={item.url}
        onClick={(event) => {
          event.preventDefault();
          onOpen(item.url);
        }}
      >
        Auf GitHub öffnen ↗
      </a>
      <p class={description ? "description" : "description missing"}>{description || "Keine Beschreibung."}</p>
      <TodoList itemId={item.id} store={todos} onChange={onTodosChange} />
    </article>
  );
}
