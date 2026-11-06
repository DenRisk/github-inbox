import type { KeyValueStore } from "../storage/key-value-store";

export type OrderByList = Record<string, string[]>;

const ORDER_KEY = "order";

export class OrderStore {
  constructor(private readonly store: KeyValueStore) {}

  async all(): Promise<OrderByList> {
    return (await this.store.get<OrderByList>(ORDER_KEY)) ?? {};
  }

  async save(list: string, keys: string[]): Promise<void> {
    await this.store.set(ORDER_KEY, { ...(await this.all()), [list]: keys });
  }

  async reset(list: string): Promise<void> {
    const { [list]: _forgotten, ...rest } = await this.all();
    await this.store.set(ORDER_KEY, rest);
  }
}
