import { useEffect, useState } from "preact/hooks";
import type { Todo, TodoStore } from "../todos/todo-store";

interface TodoListProps {
  itemId: string;
  store: TodoStore;
  onChange: () => void;
}

export function TodoList({ itemId, store, onChange }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let current = true;
    store.list(itemId).then((loaded) => current && setTodos(loaded));
    return () => {
      current = false;
    };
  }, [itemId, store]);

  async function applyAndReload(change: Promise<unknown>) {
    await change;
    setTodos(await store.list(itemId));
    onChange();
  }

  async function addDraft() {
    const text = draft;
    setDraft("");
    if (text.trim()) await applyAndReload(store.add(itemId, text));
  }

  return (
    <section class="todos">
      <h3 class="section-label">Meine Todos</h3>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} class={todo.done ? "todo done" : "todo"}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => applyAndReload(store.toggle(itemId, todo.id))}
              />
              {todo.text}
            </label>
            <button
              type="button"
              class="todo-remove"
              aria-label="Todo löschen"
              onClick={() => applyAndReload(store.remove(itemId, todo.id))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        class="todo-input"
        type="text"
        placeholder="Todo hinzufügen"
        value={draft}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Enter" && addDraft()}
      />
    </section>
  );
}
