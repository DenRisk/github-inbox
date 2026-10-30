import { groupStacks, type StackGroup } from "../../src/domain/stacks";
import type { WorkItem } from "../../src/domain/work-item";
import { item } from "../support/work-item";

function pullRequest(id: string, base: string, head: string, repository = "sample-repo") {
  return item({ id, kind: "review", repository, branches: { base, head } });
}

function shape(groups: StackGroup<WorkItem>[]) {
  return groups.map((group) => group.items.map((member) => member.id));
}

describe("groupStacks", () => {
  it("keeps pull requests against the main branch on their own", () => {
    const groups = groupStacks([pullRequest("A", "main", "a"), pullRequest("B", "main", "b")]);
    expect(shape(groups)).toEqual([["A"], ["B"]]);
    expect(groups.every((group) => !group.isStack)).toBe(true);
  });

  it("orders a stack from the pull request on the main branch upwards", () => {
    const groups = groupStacks([
      pullRequest("TOP", "step-2", "step-3"),
      pullRequest("BOTTOM", "main", "step-1"),
      pullRequest("MIDDLE", "step-1", "step-2"),
    ]);
    expect(shape(groups)).toEqual([["BOTTOM", "MIDDLE", "TOP"]]);
    expect(groups[0].isStack).toBe(true);
    expect(groups[0].base).toBe("main");
  });

  it("keeps a stack whose lowest pull request is not in the list", () => {
    const groups = groupStacks([pullRequest("UPPER", "step-2", "step-3"), pullRequest("LOWER", "step-1", "step-2")]);
    expect(shape(groups)).toEqual([["LOWER", "UPPER"]]);
    expect(groups[0].base).toBe("step-1");
  });

  it("places a stack where its first member was in the list", () => {
    const groups = groupStacks([
      pullRequest("SINGLE", "main", "single"),
      pullRequest("TOP", "step-1", "step-2"),
      pullRequest("OTHER", "main", "other"),
      pullRequest("BOTTOM", "main", "step-1"),
    ]);
    expect(shape(groups)).toEqual([["SINGLE"], ["BOTTOM", "TOP"], ["OTHER"]]);
  });

  it("does not stack branches with the same name in different repositories", () => {
    const groups = groupStacks([pullRequest("A", "main", "feature", "app"), pullRequest("B", "feature", "next", "other-app")]);
    expect(shape(groups)).toEqual([["A"], ["B"]]);
  });

  it("collects pull requests that build on the same branch into one stack", () => {
    const groups = groupStacks([
      pullRequest("LEFT", "step-1", "left"),
      pullRequest("RIGHT", "step-1", "right"),
      pullRequest("BOTTOM", "main", "step-1"),
    ]);
    expect(shape(groups)).toEqual([["BOTTOM", "LEFT", "RIGHT"]]);
  });

  it("keeps items without branches on their own", () => {
    expect(shape(groupStacks([item({ id: "I_1" }), item({ id: "I_2" })]))).toEqual([["I_1"], ["I_2"]]);
  });
});
