import { formatDate } from "../domain/dates";
import type { WorkItem } from "../domain/work-item";
import type { TodoStore } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { TodoList } from "./TodoList";
import { DeadlineLabel, KindTile, StatusLabel } from "./WorkList";

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
      <header class="detail-header">
        <KindTile item={item} />
        <div class="detail-heading">
          <h2 class="detail-title">{item.title}</h2>
          <span class="work-source">
            {item.repository} #{item.number} · erstellt {formatDate(item.createdAt)}
            {item.closedAt && ` · geschlossen ${formatDate(item.closedAt)}`}
          </span>
        </div>
      </header>
      {(item.deadline || (item.kind === "task" && item.status)) && (
        <p class="meta">
          {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
          <StatusLabel item={item} />
        </p>
      )}
      <a
        class="primary-button open-link"
        href={item.url}
        onClick={(event) => {
          event.preventDefault();
          onOpen(item.url);
        }}
      >
        Auf GitHub öffnen
        <Icon name="external" small />
      </a>
      <p class={description ? "description" : "description missing"}>{description || "Keine Beschreibung."}</p>
      <TodoList itemId={item.id} store={todos} onChange={onTodosChange} />
    </article>
  );
}
