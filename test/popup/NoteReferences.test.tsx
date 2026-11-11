import { fireEvent, render, screen } from "@testing-library/preact";
import { referenceOf, type NoteReference } from "../../src/notes/note-text";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item } from "../support/work-item";

const openTile = item({
  id: "I_25",
  kind: "task",
  repository: "sample-app",
  number: 25,
  title: "Tile shows citizen content",
  url: "https://github.com/acme/sample-app/issues/25",
});
const closedTile = { ...openTile, kind: "closed" as const, closedAt: "2026-10-17T10:00:00.000Z" };

async function openNoteWith(snapshot: Snapshot, reference: NoteReference) {
  const { ports } = fakePorts(snapshot);
  const note = await ports.notes.create();
  await ports.notes.save(note.id, `See @${reference.repository}#${reference.number}`, [reference]);
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("button", { name: "Notizen" }));
  fireEvent.click(await screen.findByRole("button", { name: `${reference.repository} #${reference.number}` }));
  return ports;
}

function snapshotWith(tasks: Snapshot["tasks"], closed: Snapshot["closed"]): Snapshot {
  return { reviews: [], tasks, closed, fetchedAt: "2026-10-19T09:58:00.000Z", error: null };
}

describe("note references", () => {
  it("opens a referenced task in its tab", async () => {
    await openNoteWith(snapshotWith([], [closedTile]), referenceOf(closedTile));
    expect(screen.getByRole("tab", { name: "Geschlossen" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Tile shows citizen content" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notizen" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("prefers the open task over the closed one", async () => {
    await openNoteWith(snapshotWith([openTile], [closedTile]), referenceOf(openTile));
    expect(screen.getByRole("tab", { name: /Aufgaben/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Tile shows citizen content" })).toBeTruthy();
  });

  it("finds the task by its url when the id changed", async () => {
    await openNoteWith(snapshotWith([openTile], []), { ...referenceOf(openTile), itemId: "I_old" });
    expect(screen.getByRole("heading", { level: 2, name: "Tile shows citizen content" })).toBeTruthy();
  });

  it("opens GitHub for a task the app no longer knows", async () => {
    const gone = { itemId: "I_gone", url: "https://github.com/acme/sample-app/issues/3", repository: "sample-app", number: 3, title: "Gone" };
    const ports = await openNoteWith(snapshotWith([openTile], []), gone);
    expect(ports.openUrl).toHaveBeenCalledWith("https://github.com/acme/sample-app/issues/3");
  });
});
