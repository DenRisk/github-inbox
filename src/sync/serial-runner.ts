export class SerialRunner<T> {
  private running: Promise<T> | null = null;
  private queued: Promise<T> | null = null;

  constructor(private readonly task: () => Promise<T>) {}

  run(): Promise<T> {
    return this.queued ?? this.running ?? this.start();
  }

  runFresh(): Promise<T> {
    if (this.queued) return this.queued;
    if (!this.running) return this.start();
    const startQueued = () => {
      this.queued = null;
      return this.start();
    };
    this.queued = this.running.then(startQueued, startQueued);
    return this.queued;
  }

  private start(): Promise<T> {
    this.running = this.task().finally(() => {
      this.running = null;
    });
    return this.running;
  }
}
