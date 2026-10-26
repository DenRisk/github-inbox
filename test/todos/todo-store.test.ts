import { createMemoryStore } from "../../src/storage/key-value-store";
import { TodoStore, todoProgress } from "../../src/todos/todo-store";

function ids() {
  let n = 0;
  return () => `todo-${++n}`;
}

describe("TodoStore", () => {
  it("adds a trimmed todo to one item only", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    await todos.add("I_1", "  Test on phone  ");
    expect(await todos.list("I_1")).toEqual([{ id: "todo-1", text: "Test on phone", done: false }]);
    expect(await todos.list("I_2")).toEqual([]);
  });

  it("ignores blank text", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    expect(await todos.add("I_1", "   ")).toBeNull();
    expect(await todos.list("I_1")).toEqual([]);
  });

  it("toggles and removes a todo", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    const todo = await todos.add("I_1", "Write release notes");
    await todos.toggle("I_1", todo!.id);
    expect((await todos.list("I_1"))[0].done).toBe(true);
    await todos.toggle("I_1", todo!.id);
    expect((await todos.list("I_1"))[0].done).toBe(false);
    await todos.remove("I_1", todo!.id);
    expect(await todos.list("I_1")).toEqual([]);
  });

  it("keeps todos of items that are no longer listed", async () => {
    const store = createMemoryStore();
    await new TodoStore(store, ids()).add("I_gone", "Follow up");
    expect(await new TodoStore(store, ids()).list("I_gone")).toEqual([{ id: "todo-1", text: "Follow up", done: false }]);
  });

  it("keeps both todos when two are added at the same time", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    await Promise.all([todos.add("I_1", "First"), todos.add("I_1", "Second")]);
    expect((await todos.list("I_1")).map((todo) => todo.text)).toEqual(["First", "Second"]);
  });

  it("applies two quick toggles one after the other", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    const todo = await todos.add("I_1", "Double click");
    await Promise.all([todos.toggle("I_1", todo!.id), todos.toggle("I_1", todo!.id)]);
    expect((await todos.list("I_1"))[0].done).toBe(false);
  });

  it("returns all todos by item", async () => {
    const todos = new TodoStore(createMemoryStore(), ids());
    await todos.add("I_1", "First");
    await todos.add("I_2", "Second");
    expect(Object.keys(await todos.all())).toEqual(["I_1", "I_2"]);
  });
});

describe("todoProgress", () => {
  it("counts progress", () => {
    expect(
      todoProgress([
        { id: "a", text: "x", done: true },
        { id: "b", text: "y", done: false },
      ]),
    ).toEqual({ done: 1, total: 2 });
  });
});
