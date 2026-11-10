import type { MergeMarkStore } from "../marks/merge-mark-store";
import type { OrderStore } from "../ordering/order-store";
import type { QuickLinks } from "../settings/settings";
import type { Snapshot } from "../sync/snapshot";
import type { TodoStore } from "../todos/todo-store";

export interface PopupPorts {
  loadSnapshot(): Promise<Snapshot>;
  requestRefresh(): Promise<Snapshot>;
  onSnapshotChange(listener: (snapshot: Snapshot) => void): () => void;
  todos: TodoStore;
  order: OrderStore;
  mergeMarks: MergeMarkStore;
  openOptions(): void;
  openUrl(url: string): void;
  now(): Date;
  loadLinks(): Promise<QuickLinks>;
}
