import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { referenceOf } from "../../src/notes/note-text";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item } from "../support/work-item";

const tile = item({
  id: "I_25",
  repository: "sample-app",
  number: 25,
  title: "Tile shows citizen content",
  url: "https://github.com/acme/sample-app/issues/25",
});

const snapshot: Snapshot = { reviews: [], tasks: [tile], closed: [], fetchedAt: "2026-10-19T09:58:00.000Z", error: null };

const EMPTY_HINT = /Halte hier fest/;

let ports: ReturnType<typeof fakePorts>["ports"];

beforeEach(() => {
  ports = fakePorts(snapshot).ports;
});

async function openNotes() {
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("button", { name: "Notizen" }));
}

describe("notes", () => {
  it("opens the notes in place of the details and closes them on a card", async () => {
    await openNotes();
    expect(screen.getByRole("button", { name: "Notizen" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(EMPTY_HINT)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText(EMPTY_HINT)).toBeTruthy();
    fireEvent.click(screen.getByText("Tile shows citizen content"));
    expect(screen.queryByText(EMPTY_HINT)).toBeNull();
    expect(screen.getByRole("button", { name: "Notizen" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("closes the notes again with the same button", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "Notizen" }));
    expect(screen.queryByText(EMPTY_HINT)).toBeNull();
  });

  it("saves every keystroke of a new note and shows it newest first", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    const field = await screen.findByRole("textbox", { name: "Notiz" });
    fireEvent.input(field, { target: { value: "Ask product" } });
    await waitFor(async () => expect((await ports.notes.all())[0]?.text).toBe("Ask product"));
    fireEvent.blur(field);
    expect(await screen.findByText("Ask product")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Notiz" })).toBeNull();
  });

  it("edits a note when its text is clicked", async () => {
    const note = await ports.notes.create();
    await ports.notes.save(note.id, "First thought", []);
    await openNotes();
    fireEvent.click(await screen.findByText("First thought"));
    const field = (await screen.findByRole("textbox", { name: "Notiz" })) as HTMLTextAreaElement;
    expect(field.value).toBe("First thought");
    fireEvent.input(field, { target: { value: "Second thought" } });
    await waitFor(async () => expect((await ports.notes.all())[0].text).toBe("Second thought"));
  });

  it("shows a stored reference as a chip and deletes a note", async () => {
    const note = await ports.notes.create();
    await ports.notes.save(note.id, "Check @sample-app#25", [referenceOf(tile)]);
    await openNotes();
    expect((await screen.findByRole("button", { name: "sample-app #25" })).getAttribute("title")).toBe("Tile shows citizen content");
    fireEvent.click(screen.getByRole("button", { name: "Notiz löschen" }));
    await waitFor(async () => expect(await ports.notes.all()).toEqual([]));
    expect(await screen.findByText(EMPTY_HINT)).toBeTruthy();
  });

  it("keeps a new note typed and left right away", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    const field = await screen.findByRole("textbox", { name: "Notiz" });
    fireEvent.input(field, { target: { value: "Quick" } });
    fireEvent.blur(field);
    expect(await screen.findByText("Quick")).toBeTruthy();
    await waitFor(async () => expect((await ports.notes.all()).map((note) => note.text)).toEqual(["Quick"]));
  });

  it("reopens an edited note with its latest text", async () => {
    const note = await ports.notes.create();
    await ports.notes.save(note.id, "First thought", []);
    await openNotes();
    fireEvent.click(await screen.findByText("First thought"));
    const field = await screen.findByRole("textbox", { name: "Notiz" });
    fireEvent.input(field, { target: { value: "First thought!" } });
    fireEvent.blur(field);
    fireEvent.click(await screen.findByText("First thought!"));
    expect(((await screen.findByRole("textbox", { name: "Notiz" })) as HTMLTextAreaElement).value).toBe("First thought!");
  });

  it("drops a new note left empty", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "Neue Notiz" }));
    fireEvent.blur(await screen.findByRole("textbox", { name: "Notiz" }));
    expect(await screen.findByText(EMPTY_HINT)).toBeTruthy();
  });
});
