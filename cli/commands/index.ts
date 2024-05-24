const { Command } = require('commander');
import { Generate } from "../actions/Generate";
import { Setup } from "../actions/Setup";

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
  .action(Generate.action);

program.command('setup')
  .description('Setup new project (adapt an existing nestjs application)')
  .argument('<type>', 'mongo | postgre')
  .argument('<name>', 'project name (will be used for db)')
  .action(Setup.action);

program.parse(process.argv);