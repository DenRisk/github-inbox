import { SerialRunner } from "../../src/sync/serial-runner";

function controllableTask() {
  const pending: { resolve: (value: number) => void; reject: (error: Error) => void }[] = [];
  const task = vi.fn(
    () =>
      new Promise<number>((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  return {
    task,
    finish: (index: number, value: number) => pending[index].resolve(value),
    fail: (index: number) => pending[index].reject(new Error("boom")),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("SerialRunner", () => {
  it("joins the running task instead of starting a second one", async () => {
    const { task, finish } = controllableTask();
    const runner = new SerialRunner(task);
    const first = runner.run();
    const second = runner.run();
    expect(task).toHaveBeenCalledTimes(1);
    finish(0, 1);
    expect(await first).toBe(1);
    expect(await second).toBe(1);
  });

  it("starts a new task once the previous one has finished", async () => {
    const { task, finish } = controllableTask();
    const runner = new SerialRunner(task);
    const first = runner.run();
    finish(0, 1);
    await first;
    const second = runner.run();
    expect(task).toHaveBeenCalledTimes(2);
    finish(1, 2);
    expect(await second).toBe(2);
  });

  it("runs exactly once more after the running task when fresh runs are requested meanwhile", async () => {
    const { task, finish } = controllableTask();
    const runner = new SerialRunner(task);
    const first = runner.run();
    const fresh = runner.runFresh();
    const alsoFresh = runner.runFresh();
    await settle();
    expect(task).toHaveBeenCalledTimes(1);
    finish(0, 1);
    expect(await first).toBe(1);
    await settle();
    expect(task).toHaveBeenCalledTimes(2);
    finish(1, 2);
    expect(await fresh).toBe(2);
    expect(await alsoFresh).toBe(2);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("lets a plain run join the queued fresh run", async () => {
    const { task, finish } = controllableTask();
    const runner = new SerialRunner(task);
    runner.run();
    const fresh = runner.runFresh();
    const joined = runner.run();
    finish(0, 1);
    await settle();
    finish(1, 2);
    expect(await joined).toBe(2);
    expect(await fresh).toBe(2);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("starts a fresh run right away when nothing is running", async () => {
    const { task, finish } = controllableTask();
    const runner = new SerialRunner(task);
    const fresh = runner.runFresh();
    expect(task).toHaveBeenCalledTimes(1);
    finish(0, 1);
    expect(await fresh).toBe(1);
  });

  it("still runs the queued fresh run when the running task fails", async () => {
    const { task, finish, fail } = controllableTask();
    const runner = new SerialRunner(task);
    const first = runner.run();
    const fresh = runner.runFresh();
    fail(0);
    await expect(first).rejects.toThrow("boom");
    await settle();
    finish(1, 2);
    expect(await fresh).toBe(2);
  });

  it("starts again after a failed task", async () => {
    const { task, finish, fail } = controllableTask();
    const runner = new SerialRunner(task);
    const first = runner.run();
    fail(0);
    await expect(first).rejects.toThrow("boom");
    const second = runner.run();
    finish(1, 2);
    expect(await second).toBe(2);
  });
});
