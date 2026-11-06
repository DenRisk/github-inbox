import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { formatRelative } from "../domain/dates";
import type { OrderByList } from "../ordering/order-store";
import { DEFAULT_SETTINGS, type QuickLinks as Links } from "../settings/settings";
import type { Snapshot } from "../sync/snapshot";
import type { Todo } from "../todos/todo-store";
import { Icon } from "../ui/Icon";
import { ThemeToggle } from "../ui/ThemeToggle";
import type { PopupPorts } from "./ports";
import { QuickLinks } from "./QuickLinks";
import { WorkDetail } from "./WorkDetail";
import { WorkList } from "./WorkList";

type Tab = "reviews" | "tasks" | "closed";

const WORK_TAB_LABELS: Record<Exclude<Tab, "closed">, string> = { reviews: "Reviews", tasks: "Aufgaben" };

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
  const [links, setLinks] = useState<Links>(DEFAULT_SETTINGS.links);
  const [orderByList, setOrderByList] = useState<OrderByList>({});

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
    ports.loadLinks().then(setLinks);
    ports.order.all().then(setOrderByList);
    return unsubscribe;
  }, [ports, requestRefresh, reloadTodos]);

  if (!snapshot) return <div class="popup screen" />;

  const now = ports.now();
  const items = snapshot[tab];
  const selectedId = selectedByTab[tab];
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const select = (id: string) => setSelectedByTab({ ...selectedByTab, [tab]: id });
  const reorder = (keys: string[]) => {
    setOrderByList({ ...orderByList, [tab]: keys });
    void ports.order.save(tab, keys);
  };
  const resetOrder = () => {
    const { [tab]: _forgotten, ...rest } = orderByList;
    setOrderByList(rest);
    void ports.order.reset(tab);
  };

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
      <QuickLinks links={links} onOpen={ports.openUrl} />
      <ErrorBar snapshot={snapshot} now={now} onOpenOptions={ports.openOptions} />
      <div class="columns">
        <nav class="list-column">
          <div class="tab-row" role="tablist">
            <div class="tabs">
              {(Object.keys(WORK_TAB_LABELS) as (keyof typeof WORK_TAB_LABELS)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={key === tab}
                  class={key === tab ? "tab active" : "tab"}
                  onClick={() => setTab(key)}
                >
                  {WORK_TAB_LABELS[key]} <span class="count">{snapshot[key].length}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "closed"}
              aria-label="Geschlossen"
              title="Geschlossen"
              class={tab === "closed" ? "closed-tab active" : "closed-tab"}
              onClick={() => setTab("closed")}
            >
              <Icon name="closed" />
            </button>
          </div>
          <WorkList
            items={items}
            emptyText={EMPTY_TEXTS[tab]}
            selectedId={selectedId}
            todosByItem={todosByItem}
            today={now}
            onSelect={select}
            order={orderByList[tab] ?? []}
            onReorder={reorder}
            onResetOrder={resetOrder}
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
