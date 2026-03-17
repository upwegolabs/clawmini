import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subagentRouter } from './subagent-router.js';
import * as chats from '../chats.js';
import * as message from '../message.js';
import * as queue from '../queue.js';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFile: vi.fn(),
      readdir: vi.fn(),
    },
    readFile: vi.fn(),
    readdir: vi.fn(),
  };
});

vi.mock('../message.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../message.js')>();
  return {
    ...actual,
    handleUserMessage: vi.fn(),
  };
});

vi.mock('../queue.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queue.js')>();
  return {
    ...actual,
    abortQueuesForDirPrefix: vi.fn(),
  };
});

vi.mock('../chats.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../chats.js')>();
  return {
    ...actual,
    getDefaultChatId: vi.fn(),
    getChatsDir: vi.fn().mockResolvedValue('/mock/chats'),
    getChatRelativePath: vi.fn().mockImplementation((id) => id.replace(/:/g, '/')),
    deleteChat: vi.fn(),
    getMessages: vi.fn(),
    isSubagentChatId: vi.fn().mockImplementation((id) => id.includes(':subagents:')),
  };
});

describe('Subagent Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subagentAdd', () => {
    it('should create a subagent and trigger execution asynchronously', async () => {
      vi.mocked(chats.getDefaultChatId).mockResolvedValue('default-chat');
      vi.mocked(fs.readFile).mockResolvedValue('{}');

      const caller = subagentRouter.createCaller({});
      const result = await caller.add({ message: 'do something', agentId: 'my-agent' });

      expect(result.subagentId).toMatch(/^default-chat:subagents:[a-f0-9-]+$/);
      expect(message.handleUserMessage).toHaveBeenCalledWith(
        result.subagentId,
        'do something',
        expect.any(Object),
        undefined,
        true, // noWait
        expect.any(Function),
        undefined,
        'my-agent'
      );
    });
  });

  describe('subagentList', () => {
    it('should list active subagents for a parent chat', async () => {
      vi.mocked(chats.getDefaultChatId).mockResolvedValue('parent');
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'uuid-1', isDirectory: () => true },
        { name: 'uuid-2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const caller = subagentRouter.createCaller({});
      const result = await caller.list({});

      expect(result).toEqual([
        { id: 'parent:subagents:uuid-1' },
        { id: 'parent:subagents:uuid-2' },
      ]);
    });
  });

  describe('subagentTail', () => {
    it('should tail messages from a subagent chat', async () => {
      vi.mocked(chats.getMessages).mockResolvedValue([
        { id: '1', role: 'user', content: 'hello', timestamp: '1' },
      ]);

      const caller = subagentRouter.createCaller({});
      const result = await caller.tail({ subagentId: 'parent:subagents:uuid1', limit: 5 });

      expect(chats.getMessages).toHaveBeenCalledWith('parent:subagents:uuid1', 5);
      expect(result).toHaveLength(1);
    });

    it('should throw if subagent ID is invalid', async () => {
      vi.mocked(chats.isSubagentChatId).mockReturnValue(false);
      const caller = subagentRouter.createCaller({});
      await expect(caller.tail({ subagentId: 'invalid-id' })).rejects.toThrow(
        'Invalid subagent ID'
      );
    });
  });

  describe('subagentSend', () => {
    it('should send a message to a subagent and trigger execution', async () => {
      vi.mocked(chats.isSubagentChatId).mockReturnValue(true);
      const caller = subagentRouter.createCaller({});
      await caller.send({ subagentId: 'parent:subagents:uuid1', message: 'next step' });

      expect(message.handleUserMessage).toHaveBeenCalledWith(
        'parent:subagents:uuid1',
        'next step',
        expect.any(Object),
        undefined,
        true, // noWait
        expect.any(Function),
        undefined,
        undefined
      );
    });
  });

  describe('subagentStop', () => {
    it('should abort queue for a subagent', async () => {
      vi.mocked(chats.isSubagentChatId).mockReturnValue(true);
      const caller = subagentRouter.createCaller({});
      await caller.stop({ subagentId: 'parent:subagents:uuid1' });

      expect(queue.abortQueuesForDirPrefix).toHaveBeenCalled();
    });
  });

  describe('subagentDelete', () => {
    it('should abort queue and delete subagent chat', async () => {
      vi.mocked(chats.isSubagentChatId).mockReturnValue(true);
      const caller = subagentRouter.createCaller({});
      await caller.delete({ subagentId: 'parent:subagents:uuid1' });

      expect(queue.abortQueuesForDirPrefix).toHaveBeenCalled();
      expect(chats.deleteChat).toHaveBeenCalledWith('parent:subagents:uuid1');
    });
  });
});
