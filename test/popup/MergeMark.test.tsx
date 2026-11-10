import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item, linkedPullRequest } from "../support/work-item";

const merged = linkedPullRequest({ url: "https://github.com/acme/sample-repo/pull/7", number: 7, state: "merged" });
const open = linkedPullRequest({ url: "https://github.com/acme/sample-repo/pull/8", number: 8 });
const customerTask = item({ id: "I_1", kind: "task", title: "Customer task" });
const runningTask = item({ id: "I_2", kind: "task", title: "Running task", pullRequests: [merged, open] });
const doneTask = item({ id: "I_3", kind: "task", title: "Done task", pullRequests: [merged] });
const closedIssue = item({ id: "I_4", kind: "closed", title: "Closed issue", closedAt: "2026-10-17T10:00:00.000Z" });

const snapshot: Snapshot = {
  reviews: [],
  tasks: [customerTask, runningTask, doneTask],
  closed: [closedIssue],
  fetchedAt: "2026-10-19T09:58:00.000Z",
  error: null,
};

const MARK = "Als gemergt markieren";
const UNMARK = "Markierung entfernen";

function titlesIn(section: "open" | "merged"): string[] {
  return [...document.querySelectorAll(`.work-section.${section} .work-title`)].map((title) => title.textContent ?? "");
}

async function openTask(ports: ReturnType<typeof fakePorts>["ports"], title: string) {
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
  fireEvent.click(screen.getByText(title));
}

describe("marking a task as merged by hand", () => {
  it("moves the task into the merged group and shows it as merged", async () => {
    const { ports } = fakePorts(snapshot);
    await openTask(ports, "Customer task");
    fireEvent.click(screen.getByRole("button", { name: MARK }));
    const badge = document.querySelector(".detail-meta .badge.merged.complete");
    expect(badge?.textContent).toBe("Gemergt");
    expect(badge?.getAttribute("title")).toBe("von dir markiert");
    expect(titlesIn("merged")).toEqual(["Customer task", "Done task"]);
    await waitFor(async () => expect(await ports.mergeMarks.all()).toEqual(["I_1"]));
  });

  it("marks a task whose pull requests are only partly merged", async () => {
    const { ports } = fakePorts(snapshot);
    await openTask(ports, "Running task");
    fireEvent.click(screen.getByRole("button", { name: MARK }));
    expect(titlesIn("merged")).toEqual(["Running task", "Done task"]);
    expect(screen.queryByText("1/2 gemergt")).toBeNull();
  });

  it("takes the mark back", async () => {
    const { ports } = fakePorts(snapshot);
    await ports.mergeMarks.set("I_1", true);
    await openTask(ports, "Customer task");
    await waitFor(() => expect(titlesIn("merged")).toContain("Customer task"));
    fireEvent.click(screen.getByRole("button", { name: UNMARK }));
    expect(titlesIn("open")).toEqual(["Customer task", "Running task"]);
    expect(document.querySelector(".detail-meta .badge.merged")).toBeNull();
    await waitFor(async () => expect(await ports.mergeMarks.all()).toEqual([]));
  });

  it("offers no mark for a task that is already merged", async () => {
    const { ports } = fakePorts(snapshot);
    await openTask(ports, "Done task");
    expect(screen.queryByRole("button", { name: MARK })).toBeNull();
  });

  it("offers no mark for a closed issue", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: "Geschlossen" }));
    fireEvent.click(screen.getByText("Closed issue"));
    expect(screen.queryByRole("button", { name: MARK })).toBeNull();
  });
});
