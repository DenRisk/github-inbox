import { formatDate, formatDeadline, formatRelative, isOverdue, localDateKey } from "../../src/domain/dates";

describe("dates", () => {
  it("formats a deadline without shifting the day", () => {
    expect(formatDeadline("2026-10-24")).toBe("24.10.2026");
  });

  it("formats a creation timestamp as a local date", () => {
    expect(formatDate("2026-10-12T11:20:38Z")).toBe("12.10.2026");
  });

  it.each([
    [30_000, "gerade eben"],
    [2 * 60_000, "vor 2 Min."],
    [3 * 3_600_000, "vor 3 Std."],
    [86_400_000, "vor 1 Tag"],
    [2 * 86_400_000, "vor 2 Tagen"],
  ])("describes %i ms ago as %s", (ago, text) => {
    const now = new Date(2026, 9, 19, 12, 0);
    expect(formatRelative(new Date(now.getTime() - ago), now)).toBe(text);
  });

  it("builds a local date key", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("does not treat today's deadline as overdue", () => {
    expect(isOverdue("2026-10-19", new Date(2026, 9, 19, 23, 59))).toBe(false);
  });

  it("treats yesterday's deadline as overdue", () => {
    expect(isOverdue("2026-10-18", new Date(2026, 9, 19, 0, 1))).toBe(true);
  });
});
