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

const snapshot: Snapshot = { reviews: [], tasks: [bug], closed: [], fetchedAt: "2026-10-19T09:58:00.000Z", error: null };

async function openTasks() {
  const { ports } = fakePorts(snapshot);
  render(<App ports={ports} />);
  fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
}

describe("type tag", () => {
  it("leads the tags of a task in the list and keeps the title as it is", async () => {
    await openTasks();
    const tags = document.querySelectorAll(".work-list .meta .badge");
    expect(tags[0].textContent).toBe("Bug");
    expect(tags[0].classList.contains("type")).toBe(true);
    expect(tags[0].classList.contains("status-red")).toBe(true);
    expect(screen.getByText("[Bug]: Broken filter")).toBeTruthy();
  });

  it("shows the type in the details too", async () => {
    await openTasks();
    fireEvent.click(screen.getByText("[Bug]: Broken filter"));
    expect(document.querySelector(".detail-meta .badge.type")?.textContent).toBe("Bug");
  });
});
