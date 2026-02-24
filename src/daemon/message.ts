import { appendMessage, type UserMessage } from '../shared/chats.js';
import { getQueue } from './queue.js';
import { type Settings } from '../shared/config.js';

export async function handleUserMessage(
  chatId: string,
  message: string,
  settings: Settings | undefined,
  cwd: string = process.cwd(),
  noWait: boolean = false,
  runCommand: (args: { command: string; cwd: string; env: Record<string, string> }) => Promise<void>
): Promise<void> {
  // TODO: Immediately persist the user message somewhere (e.g., a crash-recovery log)
  // before enqueueing it, in case the daemon crashes before processing this queue item.

  if (!settings?.chats?.new) {
    throw new Error('No chats.new defined in settings.json');
  }

  const command = settings.chats.new;
  const queue = getQueue(cwd);
  const env = {
    ...process.env,
    CLAW_CLI_MESSAGE: message,
  } as Record<string, string>;

  const taskPromise = queue.enqueue(async () => {
    const userMsg: UserMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    await appendMessage(chatId, userMsg);

    await runCommand({
      command,
      cwd,
      env,
    });
  });

  if (!noWait) {
    await taskPromise;
  }
}
