export type Task<T = void> = (signal: AbortSignal) => Promise<T>;

interface QueueEntry<TPayload = string> {
  task: Task;
  payload?: TPayload | undefined;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: unknown) => void;
}

export class Queue<TPayload = string> {
  private pending: QueueEntry<TPayload>[] = [];
  private isRunning = false;
  private currentController: AbortController | null = null;
  private currentPayload?: TPayload | undefined;
  private taskStartTime: number = 0;
  private lastActivityTime: number = 0;
  private static readonly STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes with no activity = stuck

  enqueue(task: Task, payload?: TPayload): Promise<void> {
    // Auto-recovery: if no activity for too long, the queue is stuck
    if (this.isRunning && this.lastActivityTime > 0) {
      const sinceActivity = Date.now() - this.lastActivityTime;
      if (sinceActivity > Queue.STUCK_THRESHOLD_MS) {
        console.error(`[queue] No activity for ${Math.round(sinceActivity / 1000)}s — force-resetting stuck queue`);
        this.forceReset();
      }
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ task, payload, resolve, reject });
      // We don't await processNext because we want enqueue to return the task's promise
      // and let processNext run in the background.
      this.processNext().catch(() => {});
    });
  }

  private async processNext() {
    if (this.isRunning || this.pending.length === 0) return;

    this.isRunning = true;
    this.taskStartTime = Date.now();
    this.lastActivityTime = Date.now();
    const entry = this.pending.shift()!;
    this.currentController = new AbortController();
    this.currentPayload = entry.payload;

    // Safety watchdog: if the task doesn't complete within 15 minutes,
    // force-reset and move on. This catches all stuck scenarios.
    const watchdog = setTimeout(() => {
      if (this.isRunning) {
        console.error('[queue] Watchdog: task exceeded 15 minutes, force-resetting');
        this.forceReset();
      }
    }, 15 * 60 * 1000);

    try {
      await entry.task(this.currentController.signal);
      entry.resolve();
    } catch (error) {
      entry.reject(error);
    } finally {
      clearTimeout(watchdog);
      this.isRunning = false;
      this.currentController = null;
      this.currentPayload = undefined;
      // Continue processing the next item
      this.processNext().catch(() => {});
    }
  }

  /**
   * Force-reset the queue if it's stuck (e.g., after a process was killed externally).
   * Rejects any pending tasks and allows new tasks to be processed.
   */
  forceReset(): void {
    if (this.isRunning) {
      console.error('[queue] Force-resetting stuck queue');
      this.isRunning = false;
      if (this.currentController) {
        const error = new Error('Queue force-reset');
        error.name = 'AbortError';
        this.currentController.abort(error);
      }
      this.currentController = null;
      this.currentPayload = undefined;
    }
    // Process next if anything is pending
    this.processNext().catch(() => {});
  }

  abortCurrent(predicate?: (payload: TPayload) => boolean): void {
    if (this.currentController) {
      if (!predicate || (this.currentPayload !== undefined && predicate(this.currentPayload))) {
        const error = new Error('Task aborted');
        error.name = 'AbortError';
        this.currentController.abort(error);
      }
    }
  }

  getCurrentPayload(): TPayload | undefined {
    return this.currentPayload;
  }

  /**
   * Report that the current task is still making progress.
   * Resets the stuck-detection timer.
   */
  reportActivity(): void {
    if (this.isRunning) {
      this.lastActivityTime = Date.now();
    }
  }

  clear(reason: string = 'Task cleared', predicate?: (payload: TPayload) => boolean): void {
    const tasksToClear = predicate
      ? this.pending.filter((p) => p.payload !== undefined && predicate(p.payload))
      : [...this.pending];

    if (predicate) {
      this.pending = this.pending.filter((p) => !(p.payload !== undefined && predicate(p.payload)));
    } else {
      this.pending = [];
    }

    for (const { reject } of tasksToClear) {
      const error = new Error(reason);
      error.name = 'AbortError';
      reject(error);
    }
  }

  extractPending(predicate?: (payload: TPayload) => boolean): TPayload[] {
    const extracted = this.pending
      .map((p) => p.payload)
      .filter((p): p is TPayload => p !== undefined && (!predicate || predicate(p)));

    this.clear('Task extracted for batching', predicate);

    return extracted;
  }
}

export interface MessageQueuePayload {
  text: string;
  sessionId: string;
}

const messageQueues = new Map<string, Queue<MessageQueuePayload>>();

export function getMessageQueue(dir: string): Queue<MessageQueuePayload> {
  if (!messageQueues.has(dir)) {
    messageQueues.set(dir, new Queue<MessageQueuePayload>());
  }
  return messageQueues.get(dir)!;
}
