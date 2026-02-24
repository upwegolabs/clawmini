# Notes for Chats Feature

## Current State of the Codebase
- **Initialization:** `clawmini init` sets up a workspace by creating a `.clawmini` directory and a `settings.json` file. The settings file currently has a minimal structure: `{ "chats": { "new": "echo $CLAW_CLI_MESSAGE" } }`.
- **Client:** The CLI provides `clawmini messages send <message>`. This command communicates with a local background daemon via tRPC over a UNIX domain socket.
- **Daemon Router:** The daemon receives the message, reads `settings.json`, and spawns the command configured in `chats.new`. The message is passed securely via the `CLAW_CLI_MESSAGE` environment variable.
- **Missing functionality:** There is no notion of multiple separate chats, no local storage of history, and commands are simply spawned immediately without any directory-based concurrency control.

## Feature Requirements
1. **Chat Management:**
   - `clawmini chats` with subcommands: `list`, `add <id>`, `delete <id>`.
   - Users create IDs for chats.
   - Set a default chat ID automatically, user can update it with `set-default`.
2. **Message Sending & Viewing:**
   - `clawmini messages send <message> [--chat <id>]`
   - `clawmini messages tail [-n NUM] [--json] [--chat <id>]`
   - Use a default chat if `--chat` is not specified.
   - `tail` should have a nicely formatted text output by default, and a `--json` flag for raw data.
3. **Storage:**
   - Chat history saved in `.clawmini/chats/<id>/chat.jsonl`.
   - Each line is a JSON object representing a message (either sent by user or the response from the command).
   - Schema ideas: 
     - User Input: `{ "role": "user", "content": "..." }`
     - Command Output: `{ "role": "log", "content": "<stdout>", "stderr": "<stderr>", "timestamp": "...", "command": "...", "cwd": "..." }`
4. **Daemon Internals:**
   - A new core function: `handleUserMessage(chat-id, message, settings) -> Promise<{command, directory, envvars}>`.
   - Directory-based concurrency constraint: `handleUserMessage` must wait to resolve until any previously running command in the *same directory* has finished.
