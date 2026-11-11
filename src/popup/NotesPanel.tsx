import { useEffect, useState } from "preact/hooks";
import { formatDate } from "../domain/dates";
import type { WorkItem } from "../domain/work-item";
import type { Note, NoteStore } from "../notes/note-store";
import { segmentsOf, type NoteReference } from "../notes/note-text";
import { Icon } from "../ui/Icon";
import { NoteEditor } from "./NoteEditor";

interface NotesPanelProps {
  notes: NoteStore;
  items: WorkItem[];
  onOpenReference: (reference: NoteReference) => void;
  onCountChange: (count: number) => void;
}

function hasText(note: Note): boolean {
  return note.text.trim().length > 0;
}

function NoteText({ note, onOpenReference }: { note: Note; onOpenReference: (reference: NoteReference) => void }) {
  return (
    <>
      {segmentsOf(note.text, note.references).map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <button
            key={index}
            type="button"
            class="note-chip"
            title={segment.reference.title}
            onClick={(event) => {
              event.stopPropagation();
              onOpenReference(segment.reference);
            }}
          >
            {segment.reference.repository} #{segment.reference.number}
          </button>
        ),
      )}
    </>
  );
}

export function NotesPanel({ notes, items, onOpenReference, onCountChange }: NotesPanelProps) {
  const [list, setList] = useState<Note[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const shown = list ?? [];
  const written = shown.filter(hasText);

  useEffect(() => {
    notes.all().then(setList);
  }, [notes]);

  useEffect(() => {
    if (list) onCountChange(list.filter(hasText).length);
  }, [list]);

  async function createNote() {
    const created = await notes.create();
    setList((current) => [created, ...(current ?? [])]);
    setEditingId(created.id);
  }

  function change(id: string, text: string, references: NoteReference[]) {
    setList((current) => (current ?? []).map((note) => (note.id === id ? { ...note, text, references } : note)));
    void notes.save(id, text, references);
  }

  function finishEditing() {
    setEditingId(null);
    setList((current) => (current ?? []).filter(hasText));
  }

  function removeNote(id: string) {
    void notes.remove(id);
    setList((current) => (current ?? []).filter((note) => note.id !== id));
  }

  return (
    <section class="notes" aria-label="Notizen">
      <header class="notes-header">
        <h2 class="section-title">
          <Icon name="notes" />
          Notizen <span class="count">{written.length}</span>
        </h2>
        <button type="button" class="secondary-button new-note" onClick={createNote}>
          <Icon name="plus" small />
          Neue Notiz
        </button>
      </header>
      {shown.length ? (
        <ul class="note-list">
          {shown.map((note) => (
            <li key={note.id} class="note">
              {note.id === editingId ? (
                <NoteEditor
                  text={note.text}
                  references={note.references}
                  items={items}
                  onChange={(text, references) => change(note.id, text, references)}
                  onDone={finishEditing}
                />
              ) : (
                <div
                  class="note-text"
                  tabIndex={0}
                  onClick={() => setEditingId(note.id)}
                  onKeyDown={(event) => event.key === "Enter" && setEditingId(note.id)}
                >
                  <NoteText note={note} onOpenReference={onOpenReference} />
                </div>
              )}
              <footer class="note-meta">
                <span>Geändert {formatDate(note.updatedAt)}</span>
                <button type="button" class="todo-remove" aria-label="Notiz löschen" onClick={() => removeNote(note.id)}>
                  <Icon name="remove" small />
                </button>
              </footer>
            </li>
          ))}
        </ul>
      ) : (
        <div class="hint">
          <span class="tile">
            <Icon name="notes" />
          </span>
          <p>Halte hier fest, was du nicht vergessen willst. Mit @ verweist du auf eine Aufgabe.</p>
        </div>
      )}
    </section>
  );
}
