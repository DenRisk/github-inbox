import { NoteStore } from "../../src/notes/note-store";
import { createMemoryStore } from "../../src/storage/key-value-store";
import { sequentialIds } from "../support/popup-ports";

const ref = { itemId: "I_25", url: "https://github.com/acme/sample-app/issues/25", repository: "sample-app", number: 25, title: "Tile" };

function storeAt(times: string[]) {
  const clock = [...times];
  return new NoteStore(createMemoryStore(), sequentialIds(), () => new Date(clock.length > 1 ? clock.shift()! : clock[0]));
}

describe("NoteStore", () => {
  it("creates empty notes and lists the newest first", async () => {
    const notes = storeAt(["2026-11-11T08:00:00Z", "2026-11-11T08:30:00Z", "2026-11-11T09:00:00Z", "2026-11-11T09:30:00Z"]);
    const first = await notes.create();
    await notes.save(first.id, "first", []);
    const second = await notes.create();
    await notes.save(second.id, "second", []);
    expect((await notes.all()).map((note) => note.text)).toEqual(["second", "first"]);
  });

  it("keeps the last of many quick saves and only the references still in the text", async () => {
    const notes = storeAt(["2026-11-11T08:00:00Z"]);
    const note = await notes.create();
    await Promise.all(["@", "@sample-app#25", "see @sample-app#25"].map((text) => notes.save(note.id, text, [ref])));
    expect(await notes.all()).toEqual([expect.objectContaining({ text: "see @sample-app#25", references: [ref] })]);
    await notes.save(note.id, "gone", [ref]);
    expect((await notes.all())[0].references).toEqual([]);
  });

  it("removes a note and skips blank notes when listing", async () => {
    const notes = storeAt(["2026-11-11T08:00:00Z"]);
    const kept = await notes.create();
    await notes.save(kept.id, "kept", []);
    const blank = await notes.create();
    await notes.save(blank.id, "   ", []);
    const removed = await notes.create();
    await notes.save(removed.id, "removed", []);
    await notes.remove(removed.id);
    expect((await notes.all()).map((note) => note.text)).toEqual(["kept"]);
  });
});

describe("NoteStore writes", () => {
  it("hands a save to storage right away once the notes are loaded", async () => {
    const backing = createMemoryStore();
    const set = vi.spyOn(backing, "set");
    const notes = new NoteStore(backing, sequentialIds(), () => new Date("2026-11-11T08:00:00Z"));
    const note = await notes.create();
    void notes.save(note.id, "typed", []);
    expect(set).toHaveBeenLastCalledWith("notes", [expect.objectContaining({ text: "typed" })]);
  });
});
