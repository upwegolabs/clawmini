#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program.name('clawmini').description('Clawmini v3 CLI').version('0.0.1');

program
  .command('ping')
  .description('Ping the system to check status')
  .action(() => {
    console.log('pong');
  });

program
  .command('status')
  .description('Get the current status of the daemon')
  .action(() => {
    console.log('Daemon is not running.');
  });

program.parse();
