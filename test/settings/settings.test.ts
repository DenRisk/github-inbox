import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../../src/settings/settings";
import { createMemoryStore } from "../../src/storage/key-value-store";

describe("settings", () => {
  it("returns the defaults when nothing is stored", async () => {
    expect(await loadSettings(createMemoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it("fills fields missing from stored settings with defaults", async () => {
    const store = createMemoryStore({ settings: { token: "test-token" } });
    expect(await loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, token: "test-token" });
  });

  it("uses the review search and board filter from the spec as defaults", () => {
    expect(DEFAULT_SETTINGS.reviews).toEqual({ projectNumber: 25, query: "is:pr is:open review-requested:@me archived:false" });
    expect(DEFAULT_SETTINGS.tasks).toEqual({ projectNumber: 13, query: "is:issue assignee:@me -status:Done is:open" });
    expect(DEFAULT_SETTINGS.organization).toBe("sw-code");
    expect(DEFAULT_SETTINGS.token).toBeNull();
  });

  it("loads what was saved", async () => {
    const store = createMemoryStore();
    const changed = { ...DEFAULT_SETTINGS, token: "test-token", tasks: { projectNumber: 7, query: "is:open" } };
    await saveSettings(store, changed);
    expect(await loadSettings(store)).toEqual(changed);
  });
});
