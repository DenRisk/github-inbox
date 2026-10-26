import { fireEvent, render, screen } from "@testing-library/preact";
import { OptionsForm } from "../../src/options/OptionsForm";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../../src/settings/settings";
import { createMemoryStore } from "../../src/storage/key-value-store";
import { fakeFetch, type FakeResponse } from "../support/fake-fetch";

const REVIEW_SEARCH = "is:pr is:open review-requested:@me archived:false";
const TASK_FILTER = "is:issue assignee:@me -status:Done is:open";

function userResponse(scopes = "repo, read:org, read:project"): FakeResponse {
  return { body: { login: "octocat" }, headers: { "x-oauth-scopes": scopes } };
}

function field(label: string) {
  return screen.getByLabelText(label) as HTMLInputElement;
}

async function renderForm(response: FakeResponse = userResponse()) {
  const store = createMemoryStore();
  const fetchFn = fakeFetch(response);
  render(<OptionsForm store={store} fetchFn={fetchFn} />);
  await screen.findByDisplayValue(REVIEW_SEARCH);
  return { store, fetchFn };
}

function change(label: string, value: string) {
  fireEvent.input(field(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Speichern und prüfen" }));
}

describe("OptionsForm", () => {
  it("shows the stored settings", async () => {
    await renderForm();
    expect(field("GitHub-Token").value).toBe("");
    expect(field("Organisation").value).toBe("sw-code");
    expect(field("Reviews: Board für Status und Deadline").value).toBe("25");
    expect(field("Reviews: GitHub-Suche").value).toBe(REVIEW_SEARCH);
    expect(field("Aufgaben: Projektnummer").value).toBe("13");
    expect(field("Aufgaben: Filter").value).toBe(TASK_FILTER);
  });

  it("keeps the token in a password field", async () => {
    await renderForm();
    expect(field("GitHub-Token").type).toBe("password");
  });

  it("trims the token before validating and saving", async () => {
    const { store, fetchFn } = await renderForm();
    change("GitHub-Token", "  test-token\n");
    submit();
    await screen.findByText("Angemeldet als octocat.");
    expect((fetchFn.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect((await loadSettings(store)).token).toBe("test-token");
  });

  it("saves changed board settings", async () => {
    const { store } = await renderForm();
    change("GitHub-Token", "test-token");
    change("Aufgaben: Projektnummer", "7");
    change("Aufgaben: Filter", "is:open");
    submit();
    await screen.findByText("Angemeldet als octocat.");
    expect((await loadSettings(store)).tasks).toEqual({ projectNumber: 7, query: "is:open" });
  });

  it("warns about missing scopes but still saves", async () => {
    const { store } = await renderForm(userResponse("repo, read:org"));
    change("GitHub-Token", "test-token");
    submit();
    expect(await screen.findByText("Fehlende Berechtigungen: read:project")).toBeTruthy();
    expect((await loadSettings(store)).token).toBe("test-token");
  });

  it("does not save an invalid token", async () => {
    const { store } = await renderForm({ status: 401 });
    change("GitHub-Token", "test-token");
    submit();
    expect(await screen.findByText("Token ungültig oder abgelaufen.")).toBeTruthy();
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it("rejects a project number that is not a positive integer", async () => {
    const { store, fetchFn } = await renderForm();
    change("GitHub-Token", "test-token");
    change("Reviews: Board für Status und Deadline", "abc");
    submit();
    expect(await screen.findByText("Projektnummern müssen positive ganze Zahlen sein.")).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it("restores the default filters but keeps the token", async () => {
    const store = createMemoryStore();
    await saveSettings(store, { ...DEFAULT_SETTINGS, token: "test-token", reviews: { projectNumber: 3, query: "is:pr" } });
    render(<OptionsForm store={store} fetchFn={fakeFetch(userResponse())} />);
    await screen.findByDisplayValue("is:pr");
    fireEvent.click(screen.getByRole("button", { name: "Standardwerte" }));
    expect(field("Reviews: GitHub-Suche").value).toBe(REVIEW_SEARCH);
    expect(field("Reviews: Board für Status und Deadline").value).toBe("25");
    expect(field("GitHub-Token").value).toBe("test-token");
  });
});
