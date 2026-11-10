import { OrderStore } from "../../src/ordering/order-store";
import { createMemoryStore } from "../../src/storage/key-value-store";

describe("OrderStore", () => {
  it("has no order before anything was moved", async () => {
    expect(await new OrderStore(createMemoryStore()).all()).toEqual({});
  });

  it("keeps an order per list", async () => {
    const orders = new OrderStore(createMemoryStore());
    await orders.save("tasks", ["b", "a"]);
    await orders.save("reviews", ["x"]);
    expect(await orders.all()).toEqual({ tasks: ["b", "a"], reviews: ["x"] });
  });
});
