import { useState } from "preact/hooks";
import { Icon } from "./Icon";
import { appliedTheme, applyTheme, saveTheme, type Theme } from "./theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => appliedTheme(document));

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    saveTheme(localStorage, next);
    applyTheme(document, next);
    setTheme(next);
  }

  return (
    <button type="button" class="icon-button" aria-label="Helles Design" aria-pressed={theme === "light"} onClick={toggle}>
      <Icon name={theme === "light" ? "moon" : "sun"} />
    </button>
  );
}
