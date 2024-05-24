const { Command } = require('commander');
const program = new Command();

import { Generate } from "../actions/Generate";

program
  .name('eicrud-cli')
  .description('CLI for Eicrud')
  .version('0.1.0');

program.command('generate')
  .description('Generate new files')
  .argument('<type>', 'app, service')
  .argument('<name>')
  .action(Generate.action);

program.parse(process.argv);