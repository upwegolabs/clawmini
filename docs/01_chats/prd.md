# Product Requirements Document: Chats Feature

## 1. Vision
To enhance the `clawmini` CLI by introducing persistent, multi-session chat capabilities. Users will be able to manage multiple distinct conversation threads (chats) natively within the CLI, persist command histories locally, and execute background tasks safely with directory-based concurrency controls.

## 2. Product/Market Background
Currently, the `clawmini` tool is stateless from the perspective of user interactions. Users can send messages to a background daemon, which blindly executes a configured command. There's no way to maintain context, separate different workflows, or review the history of interactions. By introducing the concept of "chats," `clawmini` evolves into a stateful, interactive tool capable of managing complex, iterative tasks seamlessly. 

## 3. Use Cases
1. **Context Separation:** A developer wants to maintain separate interaction histories for different tasks (e.g., "debugging-auth" vs. "writing-tests"). They can create different chats for each task.
2. **History Review:** A user wants to review what commands were generated and executed, along with their outputs, from a previous session. They can use the `messages tail` command to see the history.
3. **Safe Concurrency:** A user sends multiple messages rapidly that trigger commands in the same project directory. The system automatically queues these commands to prevent race conditions or file lock issues, ensuring they run sequentially. If a command fails, subsequent commands still run, and failure logs are preserved in the history.
4. **Resilience and Auditing:** If a background daemon restarts or a user closes their terminal, the state is preserved in local files, allowing workflows to resume or be audited later.

## 4. Requirements

### 4.1. Chat Management
*   **`clawmini chats list`**: Displays all existing chats.
*   **`clawmini chats add <id>`**: Creates a new chat with the specified identifier.
*   **`clawmini chats delete <id>`**: Removes the chat and its associated history.
*   **`clawmini chats set-default <id>`**: Updates the globally configured default chat for the workspace.
*   **Default Chat**: The system should automatically initialize a default chat (e.g., `default`) when no chats exist.

### 4.2. Messaging and History
*   **`clawmini messages send <message> [--chat <id>]`**: Sends a message to a specific chat. If `--chat` is omitted, it targets the default chat.
*   **`clawmini messages tail [-n NUM] [--json] [--chat <id>]`**: Displays the most recent messages in a chat. 
    *   `-n NUM`: Limits the output to the last NUM messages (default: all or a sensible limit like 20).
    *   `--json`: Outputs the raw JSONL data instead of human-readable formatted text.
*   **Storage**: 
    *   Chat logs must be stored in `.clawmini/chats/<id>/chat.jsonl`.
    *   Messages are appended as individual JSON objects.
*   **Schema**:
    *   **User Message**: `{ "role": "user", "content": "<message>", "timestamp": "<ISO8601>" }`
    *   **Command Output**: `{ "role": "log", "content": "<stdout>", "stderr": "<stderr>", "timestamp": "<ISO8601>", "command": "<executed-cmd>", "cwd": "<working-dir>", "exitCode": <number> }`

### 4.3. Daemon Internals & Concurrency Control
*   **`handleUserMessage(chatId, message, settings)`**: A new core function in the daemon router responsible for processing incoming messages.
*   **Execution Strategy**:
    *   The daemon must resolve the command, working directory, and environment variables based on the message and settings.
    *   The daemon must maintain a queue or lock mechanism based on the target execution directory (`cwd`).
    *   A command must not start executing until all prior commands queued for the same directory have finished (either succeeded or failed).
*   **Error Handling**: If a command exits with a non-zero code, it does *not* halt the queue for that directory. The next command in the queue proceeds. The failure must be recorded in the `chat.jsonl` log as a `{ role: "log" }` entry containing the exit code and stderr.

## 5. Security, Privacy, and Accessibility Concerns
*   **Security**: Command execution must continue to safely pass user input via environment variables (`CLAW_CLI_MESSAGE`) or other safe mechanisms to prevent shell injection attacks.
*   **Privacy**: Chat histories are stored completely locally in `.clawmini/chats/` within the user's workspace. No data is sent to external servers by default (unless explicitly configured by the user in `settings.json` command hooks).
*   **Accessibility**: The CLI output (specifically `messages tail`) should be formatted with clear visual distinctions (e.g., colors or prefixes) between user inputs and system logs to improve readability for terminal users.
