import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item, linkedPullRequest } from "../support/work-item";

const first = item({ id: "PR_1", kind: "review", title: "First review" });
const second = item({ id: "PR_2", kind: "review", title: "Second review" });
const third = item({ id: "PR_3", kind: "review", title: "Third review" });

const merged = linkedPullRequest({ url: "https://github.com/acme/sample-repo/pull/7", number: 7, state: "merged" });
const open = linkedPullRequest({ url: "https://github.com/acme/sample-repo/pull/8", number: 8 });
const doneTask = item({ id: "I_1", kind: "task", title: "Done task", pullRequests: [merged] });
const runningTask = item({ id: "I_2", kind: "task", title: "Running task", pullRequests: [merged, open] });
const freshTask = item({ id: "I_3", kind: "task", title: "Fresh task" });

const snapshot: Snapshot = {
  reviews: [first, second, third],
  tasks: [doneTask, runningTask, freshTask],
  closed: [],
  fetchedAt: "2026-10-19T09:58:00.000Z",
  error: null,
};

function shownTitles(): string[] {
  return [...document.querySelectorAll(".work-title")].map((title) => title.textContent ?? "");
}

function entryOf(title: string): HTMLElement {
  return screen.getByText(title).closest("li.work-entry") as HTMLElement;
}

async function openTasks() {
  fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
}

describe("WorkList order", () => {
  it("puts tasks with every pull request merged into their own group below", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    await openTasks();
    expect([...document.querySelectorAll(".work-section-title")].map((title) => title.textContent)).toEqual(["In Arbeit", "Gemergt"]);
    expect(shownTitles()).toEqual(["Running task", "Fresh task", "Done task"]);
  });

  it("shows no group headings while nothing is merged", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    await screen.findByText("First review");
    expect(document.querySelector(".work-section-title")).toBeNull();
  });

  it("folds the merged group away and back", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    await openTasks();
    const toggle = screen.getByRole("button", { name: /^Gemergt/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Done task")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("Done task")).toBeTruthy();
  });

  it("moves an entry with the arrow keys on its handle and remembers the order", async () => {
    const { ports } = fakePorts(snapshot);
    const { unmount } = render(<App ports={ports} />);
    fireEvent.keyDown(await screen.findByRole("button", { name: "Third review verschieben" }), { key: "ArrowUp" });
    expect(shownTitles()).toEqual(["First review", "Third review", "Second review"]);
    await waitFor(async () => expect((await ports.order.all()).reviews).toEqual(["PR_1", "PR_3", "PR_2"]));
    unmount();
    render(<App ports={ports} />);
    await waitFor(() => expect(shownTitles()).toEqual(["First review", "Third review", "Second review"]));
  });

  it("moves an entry by dragging it onto the upper half of another one", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    await screen.findByText("First review");
    fireEvent.dragStart(entryOf("First review"));
    fireEvent.dragOver(entryOf("Third review"));
    expect(entryOf("Third review").classList.contains("drop-before")).toBe(true);
    fireEvent.drop(entryOf("Third review"));
    expect(shownTitles()).toEqual(["Second review", "First review", "Third review"]);
    expect(document.querySelector(".drop-before, .drop-after, .dragging")).toBeNull();
  });

  it("keeps a dragged task inside its group", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    await openTasks();
    fireEvent.dragStart(entryOf("Running task"));
    fireEvent.dragOver(entryOf("Done task"));
    expect(entryOf("Done task").classList.contains("drop-before")).toBe(false);
    fireEvent.drop(entryOf("Done task"));
    expect(shownTitles()).toEqual(["Running task", "Fresh task", "Done task"]);
  });

  it("shows new entries on top of an arranged list", async () => {
    const { ports } = fakePorts(snapshot);
    await ports.order.save("reviews", ["PR_3", "PR_1"]);
    render(<App ports={ports} />);
    await waitFor(() => expect(shownTitles()).toEqual(["Second review", "Third review", "First review"]));
  });

  it("goes back to the automatic order on reset", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    expect(screen.queryByRole("button", { name: "Reihenfolge zurücksetzen" })).toBeNull();
    fireEvent.keyDown(await screen.findByRole("button", { name: "First review verschieben" }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "Reihenfolge zurücksetzen" }));
    expect(shownTitles()).toEqual(["First review", "Second review", "Third review"]);
    await waitFor(async () => expect(await ports.order.all()).toEqual({}));
    expect(screen.queryByRole("button", { name: "Reihenfolge zurücksetzen" })).toBeNull();
  });
});
