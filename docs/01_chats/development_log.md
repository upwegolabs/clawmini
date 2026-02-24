# Development Log

## Step 1: Core Chat Data Types & Storage Utilities

- Implemented `src/shared/chats.ts` with `UserMessage`, `CommandLogMessage`, and file utilities.
- Implemented unit tests in `src/shared/chats.test.ts`.

## Step 2: Daemon Concurrency & Execution Logic

- Added `handleUserMessage` in `src/daemon/queue.ts` which uses a queue-per-directory concurrency control.
- Updated `sendMessage` in `src/daemon/router.ts` to call `handleUserMessage` with the default chat if none is provided.
- Added test coverage in `src/daemon/queue.test.ts` for directory-based execution sequences and failure logging without halting.
