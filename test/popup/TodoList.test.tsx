import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { TodoList } from "../../src/popup/TodoList";
import { createMemoryStore } from "../../src/storage/key-value-store";
import { TodoStore } from "../../src/todos/todo-store";
import { sequentialIds } from "../support/popup-ports";

function setup() {
  const store = new TodoStore(createMemoryStore(), sequentialIds());
  const onChange = vi.fn();
  render(<TodoList itemId="I_1" store={store} onChange={onChange} />);
  const input = screen.getByPlaceholderText("Todo hinzufügen") as HTMLInputElement;
  return { store, onChange, input };
}

function typeAndEnter(input: HTMLInputElement, text: string) {
  fireEvent.input(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("TodoList", () => {
  it("adds a todo with Enter and clears the input", async () => {
    const { input, store, onChange } = setup();
    typeAndEnter(input, "Test on phone");
    expect(await screen.findByLabelText("Test on phone")).toBeTruthy();
    expect(input.value).toBe("");
    expect(await store.list("I_1")).toHaveLength(1);
    expect(onChange).toHaveBeenCalled();
  });

  it("does not add a blank todo", async () => {
    const { input, store } = setup();
    typeAndEnter(input, "   ");
    await waitFor(async () => expect(await store.list("I_1")).toEqual([]));
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("toggles and deletes a todo", async () => {
    const { input } = setup();
    typeAndEnter(input, "Write release notes");
    const checkbox = (await screen.findByLabelText("Write release notes")) as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => expect((screen.getByLabelText("Write release notes") as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Todo löschen" }));
    await waitFor(() => expect(screen.queryByLabelText("Write release notes")).toBeNull());
  });

  it("shows the todos stored for the item", async () => {
    const store = new TodoStore(createMemoryStore(), sequentialIds());
    await store.add("I_1", "Existing todo");
    render(<TodoList itemId="I_1" store={store} onChange={() => {}} />);
    expect(await screen.findByLabelText("Existing todo")).toBeTruthy();
  });
});
