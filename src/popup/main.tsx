import { render } from "preact";
import { createChromeStore } from "../storage/key-value-store";
import { loadSnapshot, SNAPSHOT_KEY, type Snapshot } from "../sync/snapshot";
import { TodoStore } from "../todos/todo-store";
import { App } from "./App";
import { applyStartTheme } from "../ui/theme";
import type { PopupPorts } from "./ports";
import "./popup.css";

applyStartTheme();

const store = createChromeStore();

const chromePorts: PopupPorts = {
  loadSnapshot: () => loadSnapshot(store),
  requestRefresh: () => chrome.runtime.sendMessage<{ type: string }, Snapshot>({ type: "refresh" }),
  onSnapshotChange(listener) {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[SNAPSHOT_KEY]?.newValue) listener(changes[SNAPSHOT_KEY].newValue as Snapshot);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  },
  todos: new TodoStore(store),
  openOptions: () => void chrome.runtime.openOptionsPage(),
  openUrl: (url) => void chrome.tabs.create({ url }),
  now: () => new Date(),
};

render(<App ports={chromePorts} />, document.getElementById("app")!);
