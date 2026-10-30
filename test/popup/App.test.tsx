import { act, fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { App } from "../../src/popup/App";
import { EMPTY_SNAPSHOT, type Snapshot } from "../../src/sync/snapshot";
import { fakePorts } from "../support/popup-ports";
import { item, linkedPullRequest } from "../support/work-item";

const HINT = "Eintrag anklicken, um Details und Todos zu sehen.";

const review = item({
  id: "PR_1",
  kind: "review",
  title: "Sample review",
  body: "Review description",
  url: "https://github.com/acme/sample-repo/pull/5",
  number: 5,
});
const task = item({ id: "I_1", kind: "task", title: "Sample task", status: "In Review", statusColor: "PINK" });
const closedIssue = item({
  id: "I_2",
  kind: "closed",
  title: "Sample closed issue",
  body: "Closed description",
  closedAt: "2026-10-17T10:00:00.000Z",
});

const snapshot: Snapshot = {
  reviews: [review],
  tasks: [task],
  closed: [closedIssue],
  fetchedAt: "2026-10-19T09:58:00.000Z",
  error: null,
};

describe("App", () => {
  it("shows the cached reviews before the refresh finishes", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    expect(await screen.findByText("Sample review")).toBeTruthy();
    expect(ports.requestRefresh).toHaveBeenCalled();
  });

  it("refreshes again on the refresh button", async () => {
    const { ports } = fakePorts(snapshot, { requestRefresh: vi.fn(async () => snapshot) });
    render(<App ports={ports} />);
    const button = await screen.findByRole("button", { name: "Aktualisieren" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect(ports.requestRefresh).toHaveBeenCalledTimes(2);
  });

  it("disables and spins the refresh button while refreshing", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    const button = (await screen.findByRole("button", { name: "Aktualisieren" })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.classList.contains("spinning")).toBe(true);
  });

  it("does not start another refresh while one is running", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    const button = await screen.findByRole("button", { name: "Aktualisieren" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(ports.requestRefresh).toHaveBeenCalledTimes(1);
  });

  it("enables the refresh button again when the refresh failed", async () => {
    const { ports } = fakePorts(snapshot, { requestRefresh: vi.fn(async () => Promise.reject(new Error("gone"))) });
    render(<App ports={ports} />);
    const button = (await screen.findByRole("button", { name: "Aktualisieren" })) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(button.classList.contains("spinning")).toBe(false);
  });

  it("opens the settings from the header", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("button", { name: "Einstellungen" }));
    expect(ports.openOptions).toHaveBeenCalled();
  });

  it("counts the items on the tabs", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    expect((await screen.findByRole("tab", { name: /Reviews/ })).textContent).toContain("1");
    expect(screen.getByRole("tab", { name: /Aufgaben/ }).textContent).toContain("1");
  });

  it("switches to the tasks tab", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText("Sample task")).toBeTruthy();
    expect(screen.queryByText("Sample review")).toBeNull();
    expect(screen.getByText("In Review")).toBeTruthy();
  });

  it("shows the recently closed issues with their closing day", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    const closedTab = await screen.findByRole("tab", { name: /Geschlossen/ });
    expect(closedTab.textContent).toContain("1");
    fireEvent.click(closedTab);
    expect(screen.getByText("Sample closed issue")).toBeTruthy();
    expect(screen.queryByText("Sample task")).toBeNull();
    expect(screen.getByText("geschlossen 17.10.2026")).toBeTruthy();
  });

  it("shows the closing day in the details of a closed issue", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Geschlossen/ }));
    fireEvent.click(screen.getByText("Sample closed issue"));
    expect(screen.getByText("Closed description")).toBeTruthy();
    expect(screen.getByText(/· geschlossen 17\.10\.2026/)).toBeTruthy();
  });

  it("says when nothing was closed recently", async () => {
    const { ports } = fakePorts({ ...snapshot, closed: [] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Geschlossen/ }));
    expect(screen.getByText("In den letzten 30 Tagen nichts geschlossen.")).toBeTruthy();
  });

  it("shows a hint until an item is selected, then its details", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    expect(await screen.findByText(HINT)).toBeTruthy();
    fireEvent.click(screen.getByText("Sample review"));
    expect(screen.getByText("Review description")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Auf GitHub öffnen" })).toBeTruthy();
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it("remembers the selection per tab", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    fireEvent.click(screen.getByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.queryByText("Review description")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Reviews/ }));
    expect(screen.getByText("Review description")).toBeTruthy();
  });

  it("shows the status of a selected task", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    fireEvent.click(screen.getByText("Sample task"));
    expect(screen.getAllByText("In Review")).toHaveLength(2);
  });

  it("colors the status like the board does", async () => {
    const { ports } = fakePorts({ ...snapshot, tasks: [task, item({ id: "I_3", title: "Unknown color", status: "Todo" })] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText("In Review").classList.contains("status-pink")).toBe(true);
    expect(screen.getByText("Todo").classList.contains("status-gray")).toBe(true);
  });

  it("hides the board status of a selected review", async () => {
    const { ports } = fakePorts({ ...snapshot, reviews: [{ ...review, status: "Waiting for Review" }] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    expect(screen.getByText("Review description")).toBeTruthy();
    expect(screen.queryByText("Waiting for Review")).toBeNull();
  });

  it("shows a placeholder for an empty description", async () => {
    const { ports } = fakePorts({ ...snapshot, reviews: [{ ...review, body: "  " }] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    expect(screen.getByText("Keine Beschreibung.")).toBeTruthy();
  });

  it("marks an overdue deadline", async () => {
    const { ports } = fakePorts({ ...snapshot, reviews: [{ ...review, deadline: "2026-10-18" }] });
    render(<App ports={ports} />);
    const label = await screen.findByText("Deadline 18.10.2026");
    expect(label.classList.contains("overdue")).toBe(true);
  });

  it("does not mark a future deadline as overdue", async () => {
    const { ports } = fakePorts({ ...snapshot, reviews: [{ ...review, deadline: "2026-10-24" }] });
    render(<App ports={ports} />);
    const label = await screen.findByText("Deadline 24.10.2026");
    expect(label.classList.contains("overdue")).toBe(false);
  });

  it("falls back to the hint when the selected item disappears", async () => {
    const { ports, emit } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    act(() => emit({ ...snapshot, reviews: [] }));
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.getByText("Nichts offen.")).toBeTruthy();
  });

  it("offers the settings when no token is stored", async () => {
    const { ports } = fakePorts({ ...EMPTY_SNAPSHOT, error: { kind: "no-token", message: "x" } });
    render(<App ports={ports} />);
    expect(await screen.findByText("Kein GitHub-Token hinterlegt.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Einstellungen öffnen" }));
    expect(ports.openOptions).toHaveBeenCalled();
  });

  it("keeps the last state visible when the refresh failed", async () => {
    const { ports } = fakePorts({ ...snapshot, error: { kind: "network", message: "GitHub nicht erreichbar." } });
    render(<App ports={ports} />);
    expect(await screen.findByText("GitHub nicht erreichbar.")).toBeTruthy();
    expect(screen.getByText("Stand: vor 2 Min., Aktualisieren fehlgeschlagen")).toBeTruthy();
    expect(screen.getByText("Sample review")).toBeTruthy();
  });

  it("shows when the data was fetched", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    expect(await screen.findByText("aktualisiert vor 2 Min.")).toBeTruthy();
  });

  it("opens the item on GitHub", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    fireEvent.click(screen.getByRole("link", { name: "Auf GitHub öffnen" }));
    expect(ports.openUrl).toHaveBeenCalledWith("https://github.com/acme/sample-repo/pull/5");
  });

  it("lists the pull requests of a selected task and opens one", async () => {
    const pullRequests = [
      linkedPullRequest({ title: "Sample fix", url: "https://github.com/acme/sample-repo/pull/3", number: 3, state: "merged", closesIssue: true }),
      linkedPullRequest({ title: "Sample follow-up", url: "https://github.com/acme/other-repo/pull/4", number: 4, repository: "other-repo", state: "draft" }),
    ];
    const { ports } = fakePorts({ ...snapshot, tasks: [{ ...task, pullRequests }] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText("2 PRs")).toBeTruthy();
    fireEvent.click(screen.getByText("Sample task"));
    expect(screen.getByText("Gemergt")).toBeTruthy();
    expect(screen.getByText("Entwurf")).toBeTruthy();
    expect(screen.getByText("schließt")).toBeTruthy();
    expect(screen.getByText("other-repo#4")).toBeTruthy();
    fireEvent.click(screen.getByText("Sample fix"));
    expect(ports.openUrl).toHaveBeenCalledWith("https://github.com/acme/sample-repo/pull/3");
  });

  it("shows the pull requests of a task as a stack in their order with their review state", async () => {
    const step = (number: number, base: string, head: string, review: "approved" | "changes-requested" | "required") =>
      linkedPullRequest({ title: `Step ${number}`, url: `https://github.com/acme/sample-repo/pull/${number}`, number, branches: { base, head }, review });
    const pullRequests = [
      step(12, "step-1", "step-2", "required"),
      step(11, "main", "step-1", "changes-requested"),
      step(13, "main", "solo", "approved"),
    ];
    const { ports } = fakePorts({ ...snapshot, tasks: [{ ...task, pullRequests }] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    fireEvent.click(screen.getByText("Sample task"));
    expect(screen.getByText("Stack mit 2 PRs")).toBeTruthy();
    const stacked = [...document.querySelectorAll(".pull-request-stack .pull-request")].map(
      (row) => `${row.querySelector(".step-number")?.textContent} ${row.querySelector(".pull-request-number")?.textContent}`,
    );
    expect(stacked).toEqual(["1 #11", "2 #12"]);
    expect(screen.getByText("Änderungen angefragt")).toBeTruthy();
    expect(screen.getByText("Review offen")).toBeTruthy();
    expect(screen.getByText("Freigegeben")).toBeTruthy();
  });

  it("gives every section of a selected task its own heading", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    fireEvent.click(screen.getByText("Sample task"));
    for (const name of ["Pull Requests", "Beschreibung", "Meine Todos"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeTruthy();
    }
  });

  it("marks a task whose pull requests are merged", async () => {
    const merged = linkedPullRequest({ title: "Merged fix", url: "https://github.com/acme/sample-repo/pull/5", number: 5, state: "merged" });
    const open = linkedPullRequest({ title: "Open fix", url: "https://github.com/acme/sample-repo/pull/6", number: 6 });
    const done = item({ id: "I_5", kind: "task", title: "Done task", pullRequests: [merged] });
    const halfway = item({ id: "I_6", kind: "task", title: "Halfway task", pullRequests: [merged, open] });
    const { ports } = fakePorts({ ...snapshot, tasks: [done, halfway] });
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    expect(screen.getByText("Gemergt")).toBeTruthy();
    expect(screen.getByText("1/2 gemergt")).toBeTruthy();
    fireEvent.click(screen.getByText("Done task"));
    expect(document.querySelector(".detail-meta .badge.merged")?.textContent).toBe("Gemergt");
  });

  it("says when no pull request belongs to a task", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Aufgaben/ }));
    fireEvent.click(screen.getByText("Sample task"));
    expect(screen.getByText("Kein Pull Request verknüpft oder erwähnt.")).toBeTruthy();
  });

  it("shows no pull request section for a review", async () => {
    const { ports } = fakePorts(snapshot);
    render(<App ports={ports} />);
    fireEvent.click(await screen.findByText("Sample review"));
    expect(screen.queryByText("Pull Requests")).toBeNull();
  });

  it("groups stacked reviews in order and keeps them selectable", async () => {
    const lower = item({ id: "PR_2", kind: "review", title: "Lower step", branches: { base: "main", head: "step-1" } });
    const upper = item({ id: "PR_3", kind: "review", title: "Upper step", body: "Upper description", branches: { base: "step-1", head: "step-2" } });
    const { ports } = fakePorts({ ...snapshot, reviews: [upper, review, lower] });
    render(<App ports={ports} />);
    expect(await screen.findByText("Stack mit 2 PRs")).toBeTruthy();
    expect(screen.getByText("auf main")).toBeTruthy();
    const titles = [...document.querySelectorAll(".stack .work-title")].map((title) => title.textContent);
    expect(titles).toEqual(["Lower step", "Upper step"]);
    fireEvent.click(screen.getByText("Upper step"));
    expect(screen.getByText("Upper description")).toBeTruthy();
  });

  it("shows the todo progress of an item in the list", async () => {
    const { ports } = fakePorts(snapshot);
    await ports.todos.add("PR_1", "Check on phone");
    render(<App ports={ports} />);
    expect(await screen.findByText("0/1")).toBeTruthy();
  });
});
