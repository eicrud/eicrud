#!/usr/bin/env node
import { Command } from 'commander';
import { Generate } from "../actions/Generate.js";
import { Setup } from "../actions/Setup.js";

const program = new Command();

program
  .name('eicrud-cli')
  .description('CLI for Eicrud')
  .version('0.1.0');

program.command('generate')
  .description('Generate new files')
  .argument('<type>', 'service, cmd')
  .argument('<serviceName>')
  .argument('[cmdName]')
  .option('-n, --non-crud', 'will not create a DB table for this service')
  .action(
    function() {
      return Generate.action.apply(this, this.args)
    }
  );

program.command('setup')
  .description('Setup new project (adapt an existing nestjs application)')
  .argument('<type>', 'mongo | postgre')
  .argument('<name>', 'project name (will be used for db)')
  .action(Setup.action);

program.parse(process.argv);