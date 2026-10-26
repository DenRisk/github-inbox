import type { PopupPorts } from "../../src/popup/ports";
import { createMemoryStore } from "../../src/storage/key-value-store";
import { EMPTY_SNAPSHOT, type Snapshot } from "../../src/sync/snapshot";
import { TodoStore } from "../../src/todos/todo-store";

export function sequentialIds(): () => string {
  let n = 0;
  return () => `todo-${++n}`;
}

export function fakePorts(snapshot: Snapshot = EMPTY_SNAPSHOT, overrides: Partial<PopupPorts> = {}) {
  const listeners = new Set<(snapshot: Snapshot) => void>();
  const ports: PopupPorts = {
    loadSnapshot: async () => snapshot,
    requestRefresh: vi.fn(() => new Promise<Snapshot>(() => {})),
    onSnapshotChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    todos: new TodoStore(createMemoryStore(), sequentialIds()),
    openOptions: vi.fn(),
    openUrl: vi.fn(),
    now: () => new Date("2026-10-19T10:00:00.000Z"),
    ...overrides,
  };
  return {
    ports,
    emit: (next: Snapshot) => listeners.forEach((listener) => listener(next)),
  };
}
