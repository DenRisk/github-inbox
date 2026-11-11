import { deriveIssueType } from "../../src/domain/issue-type";

const plain = { declared: null, hasSubIssues: false, title: "Sample issue", labels: [] };

describe("deriveIssueType", () => {
  it("has no type when nothing names one", () => {
    expect(deriveIssueType(plain)).toBeNull();
  });

  it("takes the type GitHub declares", () => {
    const declared = { name: "Refactoring", color: "GREEN" as const };
    expect(deriveIssueType({ ...plain, declared, hasSubIssues: true, title: "[Bug]: Sample" })).toEqual(declared);
  });

  it("calls an issue with sub-issues an epic", () => {
    expect(deriveIssueType({ ...plain, hasSubIssues: true, title: "[Bug]: Sample" })).toEqual({ name: "Epic", color: "PURPLE" });
  });

  it("reads the type from the title prefix in the board's colors", () => {
    expect(deriveIssueType({ ...plain, title: "[bug]: Sample" })).toEqual({ name: "Bug", color: "RED" });
    expect(deriveIssueType({ ...plain, title: "[Feature]: Sample" })).toEqual({ name: "Feature", color: "BLUE" });
  });

  it("shows a prefix it does not know in gray", () => {
    expect(deriveIssueType({ ...plain, title: "[Tech]: Sample" })).toEqual({ name: "Tech", color: "GRAY" });
  });

  it("falls back to a label that names a known type", () => {
    expect(deriveIssueType({ ...plain, labels: ["Design", "bug"] })).toEqual({ name: "Bug", color: "RED" });
    expect(deriveIssueType({ ...plain, labels: ["question"] })).toBeNull();
  });
});
