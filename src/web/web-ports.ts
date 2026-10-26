import type { FetchFn } from "../github/graphql-client";
import type { PopupPorts } from "../popup/ports";
import type { KeyValueStore } from "../storage/key-value-store";
import { refresh } from "../sync/refresh";
import { SerialRunner } from "../sync/serial-runner";
import { loadSnapshot, type Snapshot } from "../sync/snapshot";
import { TodoStore } from "../todos/todo-store";

export interface WebPortsDeps {
  store: KeyValueStore;
  fetchFn: FetchFn;
  now: () => Date;
  setBadge: (count: number) => void;
  openOptions: () => void;
  openUrl: (url: string) => void;
}

export function createWebPorts(deps: WebPortsDeps): PopupPorts {
  const listeners = new Set<(snapshot: Snapshot) => void>();

  const refresher = new SerialRunner(async () => {
    const snapshot = await refresh({ store: deps.store, fetchFn: deps.fetchFn, now: deps.now });
    deps.setBadge(snapshot.reviews.length);
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  });

  return {
    loadSnapshot: () => loadSnapshot(deps.store),
    requestRefresh: () => refresher.run(),
    onSnapshotChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    todos: new TodoStore(deps.store),
    openOptions: deps.openOptions,
    openUrl: deps.openUrl,
    now: deps.now,
  };
}
