type Task = () => Promise<void>;

export class Queue {
  private queue: Promise<void> = Promise.resolve();

  enqueue(task: Task): Promise<void> {
    const next = this.queue.then(task).catch(() => {});
    this.queue = next;
    return next;
  }
}

const directoryQueues = new Map<string, Queue>();

export function getQueue(dir: string): Queue {
  if (!directoryQueues.has(dir)) {
    directoryQueues.set(dir, new Queue());
  }
  return directoryQueues.get(dir)!;
}
