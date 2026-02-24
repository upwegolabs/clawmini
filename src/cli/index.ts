#!/usr/bin/env node
import { Command } from 'commander';
import { initCmd } from './commands/init.js';
import { messagesCmd } from './commands/messages.js';
import { chatsCmd } from './commands/chats.js';

const program = new Command();

program.name('clawmini').description('Clawmini v3 CLI').version('0.0.1');

program.addCommand(initCmd);
program.addCommand(messagesCmd);
program.addCommand(chatsCmd);

program.parse();
