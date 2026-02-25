import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

export function getWorkspaceRoot(startDir = process.cwd()): string {
  let curr = startDir;
  while (curr !== path.parse(curr).root) {
    if (fs.existsSync(path.join(curr, '.clawmini'))) {
      return curr;
    }
    if (fs.existsSync(path.join(curr, 'package.json')) || fs.existsSync(path.join(curr, '.git'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return startDir;
}

export function getClawminiDir(startDir = process.cwd()): string {
  return path.join(getWorkspaceRoot(startDir), '.clawmini');
}

export function getSocketPath(startDir = process.cwd()): string {
  return path.join(getClawminiDir(startDir), 'server.sock');
}

export function getSettingsPath(startDir = process.cwd()): string {
  return path.join(getClawminiDir(startDir), 'settings.json');
}

export function getChatSettingsPath(chatId: string, startDir = process.cwd()): string {
  return path.join(getClawminiDir(startDir), 'chats', chatId, 'settings.json');
}

export function getAgentSessionSettingsPath(
  agentId: string,
  sessionId: string,
  startDir = process.cwd()
): string {
  return path.join(getClawminiDir(startDir), 'agents', agentId, 'sessions', sessionId, 'settings.json');
}

export async function readChatSettings(
  chatId: string,
  startDir = process.cwd()
): Promise<Record<string, unknown> | null> {
  const p = getChatSettingsPath(chatId, startDir);
  if (!fs.existsSync(p)) return null;
  try {
    const data = await fsPromises.readFile(p, 'utf-8');
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writeChatSettings(
  chatId: string,
  data: Record<string, unknown>,
  startDir = process.cwd()
): Promise<void> {
  const p = getChatSettingsPath(chatId, startDir);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    await fsPromises.mkdir(dir, { recursive: true });
  }
  await fsPromises.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readAgentSessionSettings(
  agentId: string,
  sessionId: string,
  startDir = process.cwd()
): Promise<Record<string, unknown> | null> {
  const p = getAgentSessionSettingsPath(agentId, sessionId, startDir);
  if (!fs.existsSync(p)) return null;
  try {
    const data = await fsPromises.readFile(p, 'utf-8');
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writeAgentSessionSettings(
  agentId: string,
  sessionId: string,
  data: Record<string, unknown>,
  startDir = process.cwd()
): Promise<void> {
  const p = getAgentSessionSettingsPath(agentId, sessionId, startDir);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    await fsPromises.mkdir(dir, { recursive: true });
  }
  await fsPromises.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}
