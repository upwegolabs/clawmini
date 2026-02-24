# Questions and Answers

## Question 1

**Q:** When the `--chat <id>` flag is omitted, how is the default chat determined? Should we always fall back to a built-in ID like `default` that is created automatically, or should it be the most recently used/created chat?

**A:** Let's have a default ID that is created automatically, but the user can change with `set-default`.

## Question 2

**Q:** Should the user's input `message` and the command's response both be stored in `.clawmini/chats/<id>/chat.jsonl`? If so, what should the basic schema look like for those JSON objects? For instance, `{ "role": "user", "content": "..." }` and `{ "role": "system", "content": "stdout/stderr of command" }`?

**A:** Yes, exactly. let's call outputs from the command `{role: "log", content: <stdout>, stderr: <stderr>}`. Also think about other relevant info we should store like timestamps, the chat-id + command + directory chosen, etc.

## Question 3

**Q:** For the directory-based concurrency limit (waiting for previous commands in the same directory to finish), what should happen if a previous command fails (exits with a non-zero code)? Should the next command in the queue still execute, or should it be aborted/rejected?

**A:** It should still execute. If a command fails, a `{role: log}` message should be added to the queue with notes about the failure.
