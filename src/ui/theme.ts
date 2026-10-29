export type Theme = "light" | "dark";

const THEME_KEY = "github-inbox:theme";

const WINDOW_COLORS: Record<Theme, string> = { light: "#f6f5fb", dark: "#0d0c14" };

export function resolveTheme(storage: Storage, prefersLight: boolean): Theme {
  const stored = storage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return prefersLight ? "light" : "dark";
}

export function saveTheme(storage: Storage, theme: Theme) {
  storage.setItem(THEME_KEY, theme);
}

export function appliedTheme(document: Document): Theme {
  return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
}

export function applyTheme(document: Document, theme: Theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", WINDOW_COLORS[theme]);
}

function systemPrefersLight(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

export function applyStartTheme() {
  applyTheme(document, resolveTheme(localStorage, systemPrefersLight()));
}
