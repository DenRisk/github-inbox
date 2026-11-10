export function sectionTitles(): string[] {
  return [...document.querySelectorAll(".work-section-title")].map((title) => title.textContent ?? "");
}

export function titlesUnder(sectionTitle: string): string[] {
  const section = [...document.querySelectorAll(".work-section")].find(
    (each) => each.querySelector(".work-section-title")?.textContent === sectionTitle,
  );
  return [...(section?.querySelectorAll(".work-title") ?? [])].map((title) => title.textContent ?? "");
}
