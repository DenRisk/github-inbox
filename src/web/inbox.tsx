import { render } from "preact";
import { App } from "../popup/App";
import "../popup/popup.css";
import { createWebStorageStore } from "../storage/key-value-store";
import { createWebPorts } from "./web-ports";
import "./web.css";

const REFRESH_INTERVAL_MS = 5 * 60_000;

function showOnAppIcon(count: number) {
  if (count) void navigator.setAppBadge?.(count);
  else void navigator.clearAppBadge?.();
}

const ports = createWebPorts({
  store: createWebStorageStore(localStorage),
  fetchFn: (input, init) => fetch(input, init),
  now: () => new Date(),
  setBadge: showOnAppIcon,
  openOptions: () => location.assign("settings.html"),
  openUrl: (url) => void window.open(url, "_blank", "noopener"),
});

setInterval(() => void ports.requestRefresh(), REFRESH_INTERVAL_MS);

render(<App ports={ports} />, document.getElementById("app")!);
