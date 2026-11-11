import type { KeyValueStore } from "../storage/key-value-store";
import { pruneReferences, type NoteReference } from "./note-text";

export interface Note {
  id: string;
  text: string;
  references: NoteReference[];
  createdAt: string;
  updatedAt: string;
}

const NOTES_KEY = "notes";

function newestFirst(a: Note, b: Note): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export class NoteStore {
  private notes: Note[] | null = null;
  private loading: Promise<Note[]> | null = null;

  constructor(
    private readonly store: KeyValueStore,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async all(): Promise<Note[]> {
    return (this.notes ?? (await this.load())).filter((note) => note.text.trim()).sort(newestFirst);
  }

  async create(): Promise<Note> {
    const timestamp = this.now().toISOString();
    const note: Note = { id: this.createId(), text: "", references: [], createdAt: timestamp, updatedAt: timestamp };
    await this.update((notes) => [...notes, note]);
    return note;
  }

  save(id: string, text: string, references: NoteReference[]): Promise<void> {
    const updatedAt = this.now().toISOString();
    return this.update((notes) =>
      notes.map((note) => (note.id === id ? { ...note, text, references: pruneReferences(text, references), updatedAt } : note)),
    );
  }

  remove(id: string): Promise<void> {
    return this.update((notes) => notes.filter((note) => note.id !== id));
  }

  private load(): Promise<Note[]> {
    this.loading ??= this.store.get<Note[]>(NOTES_KEY).then((stored) => (this.notes = stored ?? []));
    return this.loading;
  }

  private update(change: (notes: Note[]) => Note[]): Promise<void> {
    if (this.notes) return this.write(change(this.notes));
    return this.load().then((notes) => this.write(change(this.notes ?? notes)));
  }

  private write(notes: Note[]): Promise<void> {
    this.notes = notes;
    return this.store.set(NOTES_KEY, notes);
  }
}
