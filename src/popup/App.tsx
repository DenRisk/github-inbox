import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { formatRelative } from "../domain/dates";
import type { Snapshot } from "../sync/snapshot";
import type { Todo } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "../ui/ThemeToggle";
import type { PopupPorts } from "./ports";
import { WorkDetail } from "./WorkDetail";
import { WorkList } from "./WorkList";

type Tab = "reviews" | "tasks" | "closed";

const TAB_LABELS: Record<Tab, string> = { reviews: "Reviews", tasks: "Aufgaben", closed: "Geschlossen" };

const EMPTY_TEXTS: Record<Tab, string> = {
  reviews: "Nichts offen.",
  tasks: "Nichts offen.",
  closed: "In den letzten 30 Tagen nichts geschlossen.",
};

function ErrorBar({ snapshot, now, onOpenOptions }: { snapshot: Snapshot; now: Date; onOpenOptions: () => void }) {
  const { error, fetchedAt } = snapshot;
  if (!error) return null;
  if (error.kind === "no-token") {
    return (
      <div class="error-bar" role="alert">
        <Icon name="alert" />
        <span>Kein GitHub-Token hinterlegt.</span>
        <button type="button" class="error-action" onClick={onOpenOptions}>
          Einstellungen öffnen
        </button>
      </div>
    );
  }
  return (
    <div class="error-bar" role="alert">
      <Icon name="alert" />
      <span>{error.message}</span>
      {fetchedAt && <span class="stale">Stand: {formatRelative(new Date(fetchedAt), now)}, Aktualisieren fehlgeschlagen</span>}
    </div>
  );
}

export function App({ ports }: { ports: PopupPorts }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>("reviews");
  const [selectedByTab, setSelectedByTab] = useState<Record<Tab, string | null>>({ reviews: null, tasks: null, closed: null });
  const [todosByItem, setTodosByItem] = useState<Record<string, Todo[]>>({});

  const reloadTodos = useCallback(() => {
    ports.todos.all().then(setTodosByItem);
  }, [ports]);

  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  const requestRefresh = useCallback(() => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    ports
      .requestRefresh()
      .then(setSnapshot, () => {})
      .finally(() => {
        refreshInFlight.current = false;
        setRefreshing(false);
      });
  }, [ports]);

  useEffect(() => {
    const unsubscribe = ports.onSnapshotChange(setSnapshot);
    ports.loadSnapshot().then((cached) => {
      setSnapshot((current) => current ?? cached);
      requestRefresh();
    });
    reloadTodos();
    return unsubscribe;
  }, [ports, requestRefresh, reloadTodos]);

  if (!snapshot) return <div class="popup screen" />;

  const now = ports.now();
  const items = snapshot[tab];
  const selectedId = selectedByTab[tab];
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const select = (id: string) => setSelectedByTab({ ...selectedByTab, [tab]: id });

  return (
    <div class="popup screen">
      <header class="header">
        <span class="tile">
          <Icon name="inbox" />
        </span>
        <div class="header-text">
          <h1>Meine Arbeit</h1>
          <span class="updated">
            {snapshot.fetchedAt && `aktualisiert ${formatRelative(new Date(snapshot.fetchedAt), now)}`}
          </span>
        </div>
        <span class="header-actions">
          <ThemeToggle />
          <button
            type="button"
            class={refreshing ? "icon-button refresh spinning" : "icon-button refresh"}
            aria-label="Aktualisieren"
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={requestRefresh}
          >
            <Icon name="refresh" />
          </button>
          <button type="button" class="icon-button" aria-label="Einstellungen" onClick={ports.openOptions}>
            <Icon name="settings" />
          </button>
        </span>
      </header>
      <ErrorBar snapshot={snapshot} now={now} onOpenOptions={ports.openOptions} />
      <div class="columns">
        <nav class="list-column">
          <div class="tabs" role="tablist">
            {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={key === tab}
                class={key === tab ? "tab active" : "tab"}
                onClick={() => setTab(key)}
              >
                {TAB_LABELS[key]} <span class="count">{snapshot[key].length}</span>
              </button>
            ))}
          </div>
          <WorkList
            items={items}
            emptyText={EMPTY_TEXTS[tab]}
            selectedId={selectedId}
            todosByItem={todosByItem}
            today={now}
            onSelect={select}
          />
        </nav>
        <main class="detail-column">
          {selected ? (
            <WorkDetail
              key={selected.id}
              item={selected}
              today={now}
              todos={ports.todos}
              onTodosChange={reloadTodos}
              onOpen={ports.openUrl}
            />
          ) : (
            <div class="hint">
              <span class="tile">
                <Icon name="inbox" />
              </span>
              <p>Eintrag anklicken, um Details und Todos zu sehen.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
