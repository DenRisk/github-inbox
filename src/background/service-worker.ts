import { SETTINGS_KEY } from "../settings/settings";
import { createChromeStore } from "../storage/key-value-store";
import { badgeFor } from "../sync/badge";
import { refresh } from "../sync/refresh";
import { SerialRunner } from "../sync/serial-runner";
import type { Snapshot } from "../sync/snapshot";

const REFRESH_ALARM = "refresh";
const REFRESH_PERIOD_MINUTES = 5;

const store = createChromeStore();

async function showBadge(snapshot: Snapshot): Promise<void> {
  const { text, color } = badgeFor(snapshot);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}

async function refreshAndShowBadge(): Promise<Snapshot> {
  const snapshot = await refresh({ store, fetchFn: (input, init) => fetch(input, init), now: () => new Date() });
  await showBadge(snapshot);
  return snapshot;
}

const refresher = new SerialRunner(refreshAndShowBadge);

async function scheduleAndRefresh(): Promise<void> {
  await chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES });
  await refresher.run();
}

chrome.runtime.onInstalled.addListener(() => void scheduleAndRefresh());
chrome.runtime.onStartup.addListener(() => void scheduleAndRefresh());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) void refresher.run();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && SETTINGS_KEY in changes) void refresher.runFresh();
});

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message.type !== "refresh") return false;
  refresher.run().then(sendResponse);
  return true;
});
