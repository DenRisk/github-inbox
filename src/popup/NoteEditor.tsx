import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { WorkItem } from "../domain/work-item";
import { insertReference, mentionAt, referenceOf, searchItems, type Mention, type NoteReference } from "../notes/note-text";
import { KindTile } from "./WorkList";

interface NoteEditorProps {
  text: string;
  references: NoteReference[];
  items: WorkItem[];
  onChange: (text: string, references: NoteReference[]) => void;
  onDone: () => void;
}

const KEYS_HANDLED_BY_HITS = new Set(["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"]);

function caretOf(element: HTMLTextAreaElement): number {
  return element.selectionStart ?? element.value.length;
}

function isSameMention(a: Mention | null, b: Mention | null): boolean {
  return a?.start === b?.start && a?.query === b?.query;
}

export function NoteEditor({ text, references, items, onChange, onDone }: NoteEditorProps) {
  const field = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [mention, setMention] = useState<Mention | null>(null);
  const [active, setActive] = useState(0);
  const hits = mention ? searchItems(items, mention.query) : [];
  const open = hits.length > 0;

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  function track(element: HTMLTextAreaElement) {
    const next = mentionAt(element.value, caretOf(element));
    if (isSameMention(next, mention)) return;
    setMention(next);
    setActive(0);
  }

  function choose(item: WorkItem) {
    const element = field.current;
    if (!element || !mention) return;
    const reference = referenceOf(item);
    const result = insertReference(element.value, mention, reference, caretOf(element));
    element.value = result.text;
    element.setSelectionRange(result.caret, result.caret);
    setMention(null);
    onChange(result.text, [...references, reference]);
  }

  function handleHitKeys(event: KeyboardEvent) {
    if (!open || !KEYS_HANDLED_BY_HITS.has(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "ArrowDown") setActive((active + 1) % hits.length);
    else if (event.key === "ArrowUp") setActive((active - 1 + hits.length) % hits.length);
    else if (event.key === "Escape") setMention(null);
    else choose(hits[active]);
  }

  return (
    <div class="note-editor">
      <textarea
        ref={field}
        class="note-field"
        aria-label="Notiz"
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        value={text}
        onInput={(event) => {
          track(event.currentTarget);
          onChange(event.currentTarget.value, references);
        }}
        onKeyDown={handleHitKeys}
        onKeyUp={(event) => !KEYS_HANDLED_BY_HITS.has(event.key) && track(event.currentTarget)}
        onClick={(event) => track(event.currentTarget)}
        onBlur={onDone}
      />
      {open && (
        <ul id={listId} class="mention-list" role="listbox" aria-label="Aufgabe verknüpfen">
          {hits.map((item, index) => (
            <li
              key={item.id}
              id={`${listId}-${index}`}
              class={index === active ? "mention active" : "mention"}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(item);
              }}
            >
              <KindTile item={item} />
              <span class="mention-text">
                <span class="mention-source">
                  {item.repository} #{item.number}
                </span>
                <span class="mention-title">{item.title}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
