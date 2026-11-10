import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item, linkedPullRequest } from "../support/work-item";
import { sectionTitles, titlesUnder } from "../support/work-list";

const epicRef = {
  id: "I_epic",
  title: "Epic task",
  url: "https://github.com/acme/sample-repo/issues/100",
  number: 100,
  repository: "sample-repo",
};

const epic = item({
  id: "I_epic",
  title: "Epic task",
  number: 100,
  status: "In Progress",
  statusColor: "BLUE",
  subIssues: { total: 3, completed: 1 },
});
const firstChild = item({ id: "I_c1", title: "First sub-issue", status: "Sprint Backlog", statusColor: "YELLOW", parent: epicRef });
const secondChild = item({ id: "I_c2", title: "Second sub-issue", status: "Sprint Backlog", statusColor: "YELLOW", parent: epicRef });
const loose = item({ id: "I_loose", title: "Loose task", status: "In Progress", statusColor: "BLUE" });

function snapshotWith(tasks: Snapshot["tasks"]): Snapshot {
  return { reviews: [], tasks, closed: [], fetchedAt: "2026-10-19T09:58:00.000Z", error: null };
}

function epicEntry(title: string): HTMLElement {
  return screen.getByText(title).closest("li.work-entry") as HTMLElement;
}

function childTitles(title: string): string[] {
  return [...epicEntry(title).querySelectorAll(".epic-children .work-title")].map((each) => each.textContent ?? "");
}

async function openTasks(snapshot: Snapshot) {
  const { ports } = fakePorts(snapshot);
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
  return ports;
}

describe("Epic groups", () => {
  it("nests sub-issues under their epic inside the epic's status group", async () => {
    await openTasks(snapshotWith([firstChild, epic, loose, secondChild]));
    expect(sectionTitles()).toEqual(["In Progress"]);
    expect(childTitles("Epic task")).toEqual(["First sub-issue", "Second sub-issue"]);
    expect(within(epicEntry("Epic task")).getAllByText("Sprint Backlog")).toHaveLength(2);
    expect(epicEntry("Epic task").querySelector(".badge.sub-issues")?.textContent).toBe("1/3 erledigt");
    expect(titlesUnder("In Progress")).toContain("Loose task");
  });

  it("folds the sub-issues of an epic away and back", async () => {
    await openTasks(snapshotWith([epic, firstChild]));
    const toggle = screen.getByRole("button", { name: "Unteraufgaben von Epic task" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(screen.queryByText("First sub-issue")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText("First sub-issue")).toBeTruthy();
  });

  it("gathers sub-issues under a link to their epic when the epic is not in the list", async () => {
    await openTasks(snapshotWith([firstChild, secondChild, loose]));
    const link = screen.getByRole("link", { name: /Epic task/ });
    expect(link.getAttribute("href")).toBe(epicRef.url);
    expect(sectionTitles()).toEqual(["In Progress", "Sprint Backlog"]);
    expect(childTitles("Epic task")).toEqual(["First sub-issue", "Second sub-issue"]);
  });

  it("keeps a merged sub-issue with its epic", async () => {
    const merged = linkedPullRequest({ state: "merged" });
    await openTasks(snapshotWith([epic, { ...firstChild, pullRequests: [merged] }, secondChild]));
    expect(sectionTitles()).toEqual(["In Progress"]);
    expect(childTitles("Epic task")).toEqual(["First sub-issue", "Second sub-issue"]);
  });

  it("moves a sub-issue with the arrow keys within its epic and remembers the order", async () => {
    const ports = await openTasks(snapshotWith([epic, firstChild, secondChild, loose]));
    fireEvent.keyDown(screen.getByRole("button", { name: "Second sub-issue verschieben" }), { key: "ArrowUp" });
    expect(childTitles("Epic task")).toEqual(["Second sub-issue", "First sub-issue"]);
    await waitFor(async () => {
      const saved = (await ports.order.all()).tasks;
      expect(saved.indexOf("I_c2")).toBeLessThan(saved.indexOf("I_c1"));
    });
  });

  it("keeps a dragged sub-issue inside its epic", async () => {
    await openTasks(snapshotWith([epic, firstChild, secondChild, loose]));
    const child = screen.getByText("Second sub-issue").closest("li.work-entry") as HTMLElement;
    const other = screen.getByText("Loose task").closest("li.work-entry") as HTMLElement;
    fireEvent.dragStart(child);
    fireEvent.dragOver(other);
    expect(other.classList.contains("drop-before")).toBe(false);
    expect(epicEntry("Epic task").classList.contains("dragging")).toBe(false);
    const sibling = screen.getByText("First sub-issue").closest("li.work-entry") as HTMLElement;
    fireEvent.dragOver(sibling);
    fireEvent.drop(sibling);
    expect(childTitles("Epic task")).toEqual(["Second sub-issue", "First sub-issue"]);
  });
});
