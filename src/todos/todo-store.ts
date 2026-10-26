import type { KeyValueStore } from "../storage/key-value-store";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

type TodosByItem = Record<string, Todo[]>;

const TODOS_KEY = "todos";

export class TodoStore {
  constructor(
    private readonly store: KeyValueStore,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async all(): Promise<TodosByItem> {
    return (await this.store.get<TodosByItem>(TODOS_KEY)) ?? {};
  }

  async list(itemId: string): Promise<Todo[]> {
    return (await this.all())[itemId] ?? [];
  }

  async add(itemId: string, text: string): Promise<Todo | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const todo: Todo = { id: this.createId(), text: trimmed, done: false };
    await this.update(itemId, (todos) => [...todos, todo]);
    return todo;
  }

  async toggle(itemId: string, todoId: string): Promise<void> {
    await this.update(itemId, (todos) =>
      todos.map((todo) => (todo.id === todoId ? { ...todo, done: !todo.done } : todo)),
    );
  }

  async remove(itemId: string, todoId: string): Promise<void> {
    await this.update(itemId, (todos) => todos.filter((todo) => todo.id !== todoId));
  }

  private pendingWrite: Promise<unknown> = Promise.resolve();

  private update(itemId: string, change: (todos: Todo[]) => Todo[]): Promise<void> {
    const write = this.pendingWrite.then(() => this.writeChange(itemId, change));
    this.pendingWrite = write.catch(() => {});
    return write;
  }

  private async writeChange(itemId: string, change: (todos: Todo[]) => Todo[]): Promise<void> {
    const all = await this.all();
    const changed = change(all[itemId] ?? []);
    if (changed.length) {
      all[itemId] = changed;
    } else {
      delete all[itemId];
    }
    await this.store.set(TODOS_KEY, all);
  }
}

export function todoProgress(todos: Todo[]): { done: number; total: number } {
  return { done: todos.filter((todo) => todo.done).length, total: todos.length };
}
