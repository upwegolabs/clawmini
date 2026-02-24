import { Command } from 'commander';

export const messagesCmd = new Command('messages').description('Manage messages');

messagesCmd
  .command('send <message>')
  .description('Send a new message')
  .action((_message) => {
    // does nothing for now
  });
