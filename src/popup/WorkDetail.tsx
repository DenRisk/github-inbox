import { formatDate } from "../domain/dates";
import { isFullyMerged } from "../domain/merge-progress";
import type { WorkItem } from "../domain/work-item";
import type { TodoStore } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { PullRequestList } from "./PullRequestList";
import { TodoList } from "./TodoList";
import { DeadlineLabel, KindTile, MergeLabel, StatusLabel } from "./WorkList";

interface WorkDetailProps {
  item: WorkItem;
  today: Date;
  todos: TodoStore;
  onTodosChange: () => void;
  onOpen: (url: string) => void;
  markedMerged: boolean;
  onMarkMerged: (marked: boolean) => void;
}

export function WorkDetail({ item, today, todos, onTodosChange, onOpen, markedMerged, onMarkMerged }: WorkDetailProps) {
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
          <p class="meta detail-meta">
            {item.deadline && <DeadlineLabel deadline={item.deadline} today={today} />}
            <StatusLabel item={item} />
            <MergeLabel item={item} marked={markedMerged} />
          </p>
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
      {item.kind !== "review" && (
        <PullRequestList item={item} onOpen={onOpen}>
          {item.kind === "task" && !isFullyMerged(item) && (
            <button type="button" class="secondary-button merge-mark" onClick={() => onMarkMerged(!markedMerged)}>
              <Icon name={markedMerged ? "remove" : "check"} small />
              {markedMerged ? "Markierung entfernen" : "Als gemergt markieren"}
            </button>
          )}
        </PullRequestList>
      )}
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
