import type { KeyValueStore } from "../storage/key-value-store";

export interface BoardSettings {
  projectNumber: number;
  query: string;
}

export interface Settings {
  token: string | null;
  organization: string;
  reviews: BoardSettings;
  tasks: BoardSettings;
}

export const SETTINGS_KEY = "settings";

export const DEFAULT_SETTINGS: Settings = {
  token: null,
  organization: "sw-code",
  reviews: { projectNumber: 25, query: "is:pr is:open review-requested:@me archived:false" },
  tasks: { projectNumber: 13, query: "is:issue assignee:@me -status:Done is:open" },
};

export async function loadSettings(store: KeyValueStore): Promise<Settings> {
  const stored = (await store.get<Partial<Settings>>(SETTINGS_KEY)) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    reviews: { ...DEFAULT_SETTINGS.reviews, ...stored.reviews },
    tasks: { ...DEFAULT_SETTINGS.tasks, ...stored.tasks },
  };
}

export async function saveSettings(store: KeyValueStore, settings: Settings): Promise<void> {
  await store.set(SETTINGS_KEY, settings);
}
