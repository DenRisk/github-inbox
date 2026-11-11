import { fireEvent, render, screen } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import type { Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item } from "../support/work-item";

const bug = item({
  id: "I_1",
  title: "[Bug]: Broken filter",
  status: "In Progress",
  statusColor: "BLUE",
  type: { name: "Bug", color: "RED" },
});

const plain = item({ id: "I_2", number: 2, title: "Plain task", status: "In Progress", statusColor: "BLUE" });

const snapshot: Snapshot = { reviews: [], tasks: [bug, plain], closed: [], fetchedAt: "2026-10-19T09:58:00.000Z", error: null };

async function openTasks() {
  const { ports } = fakePorts(snapshot);
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
}

describe("type icon", () => {
  it("shows the type as the colored tile of a task and keeps the title as it is", async () => {
    await openTasks();
    const tile = screen.getByRole("img", { name: "Bug" });
    expect(tile.classList.contains("status-red")).toBe(true);
    expect(document.querySelector(".work-list .meta .badge.type")).toBeNull();
    expect(screen.getByText("[Bug]: Broken filter")).toBeTruthy();
  });

  it("keeps the plain tile for a task without a type", async () => {
    await openTasks();
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("names the type in the details", async () => {
    await openTasks();
    fireEvent.click(screen.getByText("[Bug]: Broken filter"));
    expect(document.querySelector(".detail-meta .badge.type")?.textContent).toBe("Bug");
  });
});
