import { fireEvent, render, screen } from "@testing-library/preact";
import { ThemeToggle } from "../../src/ui/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeToggle", () => {
  it("switches to the light design and remembers it", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Helles Design" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    expect(localStorage.getItem("github-inbox:theme")).toBe("light");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches back to the dark design", () => {
    document.documentElement.classList.add("theme-light");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Helles Design" }));
    expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    expect(localStorage.getItem("github-inbox:theme")).toBe("dark");
  });
});
