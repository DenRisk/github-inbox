import { insertReference, markerOf, mentionAt, pruneReferences, referenceOf, searchItems, segmentsOf } from "../../src/notes/note-text";
import { item } from "../support/work-item";

const tile = item({
  id: "I_25",
  repository: "sample-app",
  number: 25,
  title: "Tile shows citizen content",
  url: "https://github.com/acme/sample-app/issues/25",
});
const epic = item({ id: "I_17", repository: "sample-app", number: 17, title: "Board map like app map" });
const other = item({ id: "I_9", repository: "other-app", number: 9, title: "Theme layer drawer" });
const ref = referenceOf(tile);

describe("note text", () => {
  it("writes a reference as a readable marker", () => {
    expect(markerOf(ref)).toBe("@sample-app#25");
    expect(ref).toEqual({
      itemId: "I_25",
      url: "https://github.com/acme/sample-app/issues/25",
      repository: "sample-app",
      number: 25,
      title: "Tile shows citizen content",
    });
  });

  it("splits a note into text and the references it knows", () => {
    expect(segmentsOf("Ask about @sample-app#25 and @other-app#9.", [ref])).toEqual([
      { kind: "text", text: "Ask about " },
      { kind: "reference", reference: ref },
      { kind: "text", text: " and @other-app#9." },
    ]);
  });

  it("drops references whose marker is gone from the text", () => {
    expect(pruneReferences("nothing left", [ref])).toEqual([]);
    expect(pruneReferences("see @sample-app#25", [ref, ref])).toEqual([ref]);
  });

  it("finds the mention the caret is in", () => {
    expect(mentionAt("see @samp", 9)).toEqual({ start: 4, query: "samp" });
    expect(mentionAt("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionAt("mail@example.com", 16)).toBeNull();
    expect(mentionAt("see @samp le", 12)).toBeNull();
    expect(mentionAt("@sample", 0)).toBeNull();
  });

  it("replaces the mention with the marker and puts the caret after it", () => {
    expect(insertReference("see @samp later", { start: 4, query: "samp" }, ref, 9)).toEqual({
      text: "see @sample-app#25 later",
      caret: 18,
    });
    expect(insertReference("Ask @cit", { start: 4, query: "cit" }, ref, 8)).toEqual({
      text: "Ask @sample-app#25 ",
      caret: 19,
    });
  });

  it("searches title, repository and number and keeps at most eight hits", () => {
    expect(searchItems([tile, epic, other], "25")).toEqual([tile]);
    expect(searchItems([tile, epic, other], "#9")).toEqual([other]);
    expect(searchItems([tile, epic, other], "sample CITIZEN")).toEqual([tile]);
    expect(searchItems([tile, epic, other], "")).toEqual([tile, epic, other]);
    const many = Array.from({ length: 12 }, (_, n) => item({ id: `I_${n}`, number: n }));
    expect(searchItems(many, "")).toHaveLength(8);
  });
});
