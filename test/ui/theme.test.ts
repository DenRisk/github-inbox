import { appliedTheme, applyTheme, resolveTheme, saveTheme } from "../../src/ui/theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.head.innerHTML = "";
});

describe("theme", () => {
  it("follows the system until a theme was chosen", () => {
    expect(resolveTheme(localStorage, true)).toBe("light");
    expect(resolveTheme(localStorage, false)).toBe("dark");
  });

  it("keeps the chosen theme over the system", () => {
    saveTheme(localStorage, "light");
    expect(resolveTheme(localStorage, false)).toBe("light");
    saveTheme(localStorage, "dark");
    expect(resolveTheme(localStorage, true)).toBe("dark");
  });

  it("ignores an unknown stored value", () => {
    localStorage.setItem("github-inbox:theme", "sepia");
    expect(resolveTheme(localStorage, false)).toBe("dark");
  });

  it("marks the page and the window color", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
    applyTheme(document, "light");
    expect(appliedTheme(document)).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#f6f5fb");
    applyTheme(document, "dark");
    expect(appliedTheme(document)).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#0d0c14");
  });
});
