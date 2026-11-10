import type { KeyValueStore } from "../storage/key-value-store";

const MERGE_MARKS_KEY = "merge-marks";

export class MergeMarkStore {
  constructor(private readonly store: KeyValueStore) {}

  async all(): Promise<string[]> {
    return (await this.store.get<string[]>(MERGE_MARKS_KEY)) ?? [];
  }

  async set(itemId: string, marked: boolean): Promise<void> {
    const marks = await this.all();
    if (marks.includes(itemId) === marked) return;
    await this.store.set(MERGE_MARKS_KEY, marked ? [...marks, itemId] : marks.filter((id) => id !== itemId));
  }
}
