/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserMessage } from './message.js';
import * as chats from '../shared/chats.js';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';

vi.mock('../shared/chats.js', () => ({
  appendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

describe('Daemon Execution Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runCommandCallback = async ({ command, cwd, env }: any) => {
    return new Promise<void>((resolve) => {
      const p = spawn(command, { shell: true, cwd, env });
      let stdout = '';
      let stderr = '';
      if (p.stdout) p.stdout.on('data', (data: any) => (stdout += data.toString()));
      if (p.stderr) p.stderr.on('data', (data: any) => (stderr += data.toString()));
      p.on('close', async (code: any) => {
        await chats.appendMessage('chat1', {
          role: 'log',
          content: stdout,
          stderr,
          timestamp: new Date().toISOString(),
          command,
          cwd,
          exitCode: code ?? 1,
        });
        resolve();
      });
      p.on('error', async (err: any) => {
        await chats.appendMessage('chat1', {
          role: 'log',
          content: '',
          stderr: err.toString(),
          timestamp: new Date().toISOString(),
          command,
          cwd,
          exitCode: 1,
        });
        resolve();
      });
    });
  };

  it('runs sequentially for the same directory', async () => {
    const mockSpawn = vi.fn().mockImplementation((_cmd, _options) => {
      const emitter = new EventEmitter() as any;
      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();

      emitter.finish = (code: number) => {
        emitter.emit('close', code);
      };

      (mockSpawn as any).lastEmitter = emitter;
      return emitter;
    });

    (spawn as any).mockImplementation(mockSpawn);

    const settings = { chats: { new: 'echo msg' } };

    const p1 = handleUserMessage(
      'chat1',
      'msg1',
      settings as any,
      '/dir1',
      false,
      runCommandCallback
    );

    await new Promise((r) => setTimeout(r, 0));

    const emitter1 = (mockSpawn as any).lastEmitter;
    expect(mockSpawn).toHaveBeenCalledTimes(1);

    const p2 = handleUserMessage(
      'chat1',
      'msg2',
      settings as any,
      '/dir1',
      false,
      runCommandCallback
    );

    await new Promise((r) => setTimeout(r, 0));

    // spawn should still be 1 because p2 is queued
    expect(mockSpawn).toHaveBeenCalledTimes(1);

    // finish process 1
    emitter1.finish(0);
    await p1;

    // wait a tick for p2 to start
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const emitter2 = (mockSpawn as any).lastEmitter;

    emitter2.finish(0);
    await p2;

    expect(chats.appendMessage).toHaveBeenCalled();
  });

  it('runs concurrently for different directories', async () => {
    const mockSpawn = vi.fn().mockImplementation((_cmd, _options) => {
      const emitter = new EventEmitter() as any;
      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();
      emitter.finish = (code: number) => {
        emitter.emit('close', code);
      };
      return emitter;
    });

    (spawn as any).mockImplementation(mockSpawn);

    const settings = { chats: { new: 'echo msg' } };

    handleUserMessage('chat1', 'msg1', settings as any, '/dir1', false, runCommandCallback);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSpawn).toHaveBeenCalledTimes(1);

    handleUserMessage('chat1', 'msg2', settings as any, '/dir2', false, runCommandCallback);
    await new Promise((r) => setTimeout(r, 0));

    // Since it's a different directory, it should spawn immediately
    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  it('records failure logs without halting the queue', async () => {
    const mockSpawn = vi.fn().mockImplementation((_cmd, _options) => {
      const emitter = new EventEmitter() as any;
      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();
      emitter.finish = (code: number) => {
        emitter.emit('close', code);
      };
      emitter.fail = (err: Error) => {
        emitter.emit('error', err);
      };

      (mockSpawn as any).emitters = (mockSpawn as any).emitters || [];
      (mockSpawn as any).emitters.push(emitter);
      return emitter;
    });

    (spawn as any).mockImplementation(mockSpawn);

    const settings = { chats: { new: 'echo msg' } };

    const p1 = handleUserMessage(
      'chat1',
      'msg1',
      settings as any,
      '/dir-fail',
      false,
      runCommandCallback
    );
    await new Promise((r) => setTimeout(r, 0));

    const p2 = handleUserMessage(
      'chat1',
      'msg2',
      settings as any,
      '/dir-fail',
      false,
      runCommandCallback
    );

    const emitter1 = (mockSpawn as any).emitters[0];
    emitter1.fail(new Error('command not found'));
    await p1;

    expect(chats.appendMessage).toHaveBeenCalledWith(
      'chat1',
      expect.objectContaining({
        role: 'log',
        exitCode: 1,
        stderr: 'Error: command not found',
      })
    );

    await new Promise((r) => setTimeout(r, 0));

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    const emitter2 = (mockSpawn as any).emitters[1];
    emitter2.finish(0);
    await p2;
  });
});
