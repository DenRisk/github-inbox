import { fireEvent, render, screen, within } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item } from "../support/work-item";

const tile = item({ id: "I_25", repository: "sample-app", number: 25, title: "Tile shows citizen content" });
const epic = item({ id: "I_17", repository: "sample-app", number: 17, title: "Board map like app map" });

const snapshot: Snapshot = { reviews: [], tasks: [tile, epic], closed: [], fetchedAt: "2026-10-19T09:58:00.000Z", error: null };

async function openNewNote(): Promise<HTMLTextAreaElement> {
  const { ports } = fakePorts(snapshot);
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("button", { name: "Notizen" }));
  fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
  return (await screen.findByRole("textbox", { name: "Notiz" })) as HTMLTextAreaElement;
}

function type(field: HTMLTextAreaElement, text: string) {
  field.value = text;
  field.setSelectionRange(text.length, text.length);
  fireEvent.input(field);
}

describe("note mentions", () => {
  it("suggests tasks after @ and inserts the chosen one", async () => {
    const field = await openNewNote();
    type(field, "Ask @citizen");
    const options = within(screen.getByRole("listbox", { name: "Aufgabe verknüpfen" })).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("sample-app #25");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field.value).toBe("Ask @sample-app#25 ");
    expect(field.selectionStart).toBe(19);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.blur(field);
    expect(await screen.findByRole("button", { name: "sample-app #25" })).toBeTruthy();
  });

  it("moves through the hits with the arrow keys", async () => {
    const field = await openNewNote();
    type(field, "@sample");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1].id);
    fireEvent.keyDown(field, { key: "Tab" });
    expect(field.value).toBe("@sample-app#17 ");
  });

  it("takes a hit on click", async () => {
    const field = await openNewNote();
    type(field, "@board");
    fireEvent.mouseDown(screen.getByRole("option"));
    expect(field.value).toBe("@sample-app#17 ");
  });

  it("closes the hits on Escape and keeps the text", async () => {
    const field = await openNewNote();
    type(field, "@sam");
    const notCancelled = fireEvent.keyDown(field, { key: "Escape" });
    expect(notCancelled).toBe(false);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field.value).toBe("@sam");
  });

  it("does not suggest anything for an @ inside a word", async () => {
    const field = await openNewNote();
    type(field, "mail@sample");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
