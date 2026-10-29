import { formatDate } from "../domain/dates";
import type { WorkItem } from "../domain/work-item";
import type { TodoStore } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { PullRequestList } from "./PullRequestList";
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
          {(item.deadline || (item.kind === "task" && item.status)) && (
            <p class="meta detail-meta">
              {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
              <StatusLabel item={item} />
            </p>
          )}
        </div>
        <a
          class="icon-button open-link"
          href={item.url}
          aria-label="Auf GitHub öffnen"
          title="Auf GitHub öffnen"
          onClick={(event) => {
            event.preventDefault();
            onOpen(item.url);
          }}
        >
          <Icon name="external" />
        </a>
      </header>
      {item.kind !== "review" && <PullRequestList item={item} onOpen={onOpen} />}
      <section class="detail-section">
        <h3 class="section-title">
          <Icon name="description" />
          Beschreibung
        </h3>
        <p class={description ? "description" : "description missing"}>{description || "Keine Beschreibung."}</p>
      </section>
      <TodoList itemId={item.id} store={todos} onChange={onTodosChange} />
    </article>
  );
}
