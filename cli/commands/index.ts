#!/usr/bin/env node
import { Command } from 'commander';
import { Generate } from '../actions/Generate.js';
import { Setup } from '../actions/Setup.js';
const program = new Command();

import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { Export } from '../actions/Export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getVersion = () => {
  const packageContent = fs.readFileSync(
    path.join(__dirname, '../package.json'),
    'utf8',
  );
  const packageJ = JSON.parse(packageContent);
  return packageJ.version;
};

program.name('eicrud-cli').description('CLI for Eicrud').version(getVersion());

program
  .command('generate')
  .description('Generate new files')
  .argument('<type>', 'service, cmd')
  .argument('<serviceName>')
  .argument('[cmdName]')
  .option('-n, --non-crud', 'will not create a DB table for this service')
  .option(
    '-ms, --ms <string>',
    'a subfolder for the service to be created/modified in',
  )
  .action(function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return Generate.action.apply(this, this.args);
  });

program
  .command('setup')
  .description('Setup new project (adapt an existing nestjs application)')
  .argument('<type>', 'mongo | postgre')
  .argument('<name>', 'project name (will be used for db)')
  .action(function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return Setup.action.apply(this, this.args);
  });

program
  .command('export')
  .description('Export dtos or generate superclient')
  .argument('<type>', 'dtos | superclient | openapi')
  .option(
    '-kv, --keep-validators',
    'will keep class-validator decorators when exporting',
  )
  .option('-cc, --convert-classes', 'will convert classes into interfaces')
  .action(function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return Export.action.apply(this, this.args);
  });

program.parse(process.argv);
