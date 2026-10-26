import type { Snapshot } from "../sync/snapshot";
import type { TodoStore } from "../todos/todo-store";

export interface PopupPorts {
  loadSnapshot(): Promise<Snapshot>;
  requestRefresh(): Promise<Snapshot>;
  onSnapshotChange(listener: (snapshot: Snapshot) => void): () => void;
  todos: TodoStore;
  openOptions(): void;
  openUrl(url: string): void;
  now(): Date;
}
