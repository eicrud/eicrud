import { _utils_cli } from '../utils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { Setup } from './Setup.js';
import { kebabToCamelCase, kebakToPascalCase } from '@eicrud/shared/utils.js';
import XRegExp from 'xregexp';
import { Generate } from './Generate.js';
import { CliOptions } from '@eicrud/core/config/index.js';
import wildcard from 'wildcard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Export {
  static action(type, name, cmd): Promise<any> {
    const opts = (this as any).opts();
    const cliConfig = Setup.getCliConfig();
    switch (type) {
      case 'dtos':
        try {
          return Export.dtos(opts, cliConfig);
        } catch (e) {
          // delete exported_dtos folder if present
          const dest = path.join('./exported_dtos');
          if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true });
          }
          throw e;
        }
      case 'superclient':
        return Export.superclient(opts);
      default:
        return Promise.resolve();
    }
  }

  static superclient(options?): Promise<any> {
    //console.log('Generating service', name);
    const src = path.join('./exported_dtos');

    if (!fs.existsSync(src)) {
      throw new Error(
        `${src} does not exist (did you forgot to run 'eicrud export dtos'?)`,
      );
    }

    //copy super client template
    const template_folder = path.join(__dirname, '../templates/superclient');
    const template_file = ['super_client.ts'];
    Generate.copyTemplateFiles(template_folder, template_file, {}, src);

    const conditionFun = (str) => str.endsWith('.entity.ts');
    const files = getFiles(src, conditionFun);

    for (const file of files) {
      //get dir from file path
      const dir = path.dirname(file);
      const fileName = path.basename(file);
      const entity_kebab_name = fileName.replace('.entity.ts', '');

      const tk_entity_name = kebakToPascalCase(entity_kebab_name);

      const template_files = ['tk_entity_lname.client.ts'];

      const keys = {
        tk_entity_lname: entity_kebab_name,
        tk_entity_camel_name: kebabToCamelCase(entity_kebab_name),
        tk_entity_name,
        tk_client_class_name: tk_entity_name + 'Client',
      };

      Generate.copyTemplateFiles(template_folder, template_files, keys, dir);

      const clientFilePath = file.replace('.entity.ts', '.client.ts');
      const cmdDir = path.join(dir, 'cmds');
      if (fs.existsSync(cmdDir)) {
        const cmdFiles = getFiles(cmdDir, (str) => str.endsWith('.dto.ts'));
        let clientFileContent = fs.readFileSync(clientFilePath, 'utf8');
        for (const cmdFile of cmdFiles) {
          const cmdFileName = path.basename(cmdFile);
          const tk_cmd_name = cmdFileName.replace('.dto.ts', '');

          const baseCmdDto = kebakToPascalCase(tk_cmd_name);
          const cmdFileNameContent = fs.readFileSync(cmdFile, 'utf8');
          const hasReturnDto = cmdFileNameContent.includes('ReturnDto');
          const keys = {
            tk_cmd_dto_name: baseCmdDto + 'Dto',
            tk_cmd_return_dto_name: hasReturnDto
              ? baseCmdDto + 'ReturnDto'
              : 'any',
            tk_cmd_name,
            tk_cmd_lname: tk_cmd_name,
          };

          const clientCmdTemplatePath = path.join(
            template_folder,
            'client_cmd.ts',
          );

          const importLine = `import { ${keys.tk_cmd_dto_name}${hasReturnDto ? ', ' + keys.tk_cmd_return_dto_name : ''} } from './cmds/${keys.tk_cmd_lname}/${keys.tk_cmd_lname}.dto';`;

          clientFileContent = _utils_cli.splitAndAddTemplateContent(
            fs,
            path,
            clientCmdTemplatePath,
            keys,
            clientFilePath,
            clientFileContent,
            importLine,
            'GENERATED START',
            { noWrite: true, noNewLine: false },
          );
        }
        fs.writeFileSync(clientFilePath, clientFileContent, 'utf8');
      }

      const superClientFilePath = path.join(src, 'super_client.ts');
      let superClientFileContent = fs.readFileSync(superClientFilePath, 'utf8');
      const clientFileUpdatedPath =
        '.' +
        clientFilePath
          .replace('exported_dtos', '')
          .replaceAll('\\', '/')
          .replace('.ts', '');
      const importLine = `import { ${keys.tk_client_class_name} } from '${clientFileUpdatedPath}';`;
      superClientFileContent = _utils_cli.splitAndAddTemplateContent(
        fs,
        path,
        path.join(template_folder, 'client_instanciation.ts'),
        keys,
        superClientFilePath,
        superClientFileContent,
        importLine,
        'GENERATED START 1',
        { noWrite: true, noNewLine: true },
      );

      _utils_cli.splitAndAddTemplateContent(
        fs,
        path,
        path.join(template_folder, 'client_declaration.ts'),
        keys,
        superClientFilePath,
        superClientFileContent,
        '',
        'GENERATED START 2',
        { noWrite: false, noNewLine: true },
      );
    }

    // remoce super_client folder if exist
    const superClientDir = path.join('./super_client');
    if (fs.existsSync(superClientDir)) {
      fs.rmSync(superClientDir, { recursive: true });
    }

    //rename exported_dtos to super_client
    fs.renameSync(src, superClientDir);

    return Promise.resolve();
  }

  static async dtos(options?, cliOptions?: CliOptions): Promise<any> {
    let excludeServices = cliOptions?.export?.excludeServices || [];
    excludeServices = excludeServices.map((se) => se.name || se);
    //console.log('Generating service', name);
    const src = path.join('./src/services');
    const dest = path.join('./exported_dtos');
    const conditionFun = (str) =>
      (str.endsWith('.dto.ts') ||
        str.endsWith('.entity.ts') ||
        cliOptions?.export?.includePatterns?.some((pattern) =>
          wildcard(pattern, str),
        )) &&
      !cliOptions?.export?.excludePatterns?.some((pattern) =>
        wildcard(pattern, str),
      );
    // delete dest recursively
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true });
    }
    const copiedFiles = copyDirectory(src, dest, conditionFun);

    const eicrud_core_dir = path.join(
      './node_modules/@eicrud/core/config/basecmd_dtos',
    );
    if (!fs.existsSync(eicrud_core_dir)) {
      throw new Error(
        '@eicrud/core package outdated / not found in node_modules',
      );
    }
    copiedFiles.push(
      ...copyDirectory(eicrud_core_dir, dest, conditionFun, {
        makeSubDir: true,
      }),
    );

    const removeFiles = [];
    for (const file of copiedFiles) {
      const fileContent = fs.readFileSync(file, 'utf8');
      const hideDirective = fileContent.includes('@eicrud:cli:export:hide');
      const excludeDirective = fileContent.includes(
        '@eicrud:cli:export:exclude',
      );
      if (file.endsWith('.entity.ts')) {
        const serviceName = path.basename(file).replace('.entity.ts', '');
        const pascalEntityName = kebakToPascalCase(serviceName);
        if (excludeDirective || excludeServices.includes(serviceName)) {
          removeFiles.push(file);
        } else if (hideDirective) {
          const fileContent = 'export type ' + pascalEntityName + ' = any;';
          fs.writeFileSync(file, fileContent, 'utf8');
        }
      } else if (file.endsWith('.dto.ts')) {
        if (hideDirective) {
          // delete file
          removeFiles.push(file);
        } else {
          const matchDtoServiceRegex = /([^\\/]+)[\\/]cmds[\\/].+\.dto\.ts/;
          const matchDtoService = matchDtoServiceRegex.exec(file);
          const serviceName = matchDtoService ? matchDtoService[1] : null;
          if (!serviceName) {
            //TODO: remove this check
            console.error('Service name not found for file: ' + file);
          }
          if (excludeServices.includes(serviceName)) {
            removeFiles.push(file);
          }
        }
      }
    }

    for (const file of removeFiles) {
      fs.rmSync(file);
      copiedFiles.splice(copiedFiles.indexOf(file), 1);
    }

    Export.removeDecoratorsFromFiles(copiedFiles, '@mikro-orm');
    Export.removeDecoratorsFromFiles(copiedFiles, '@eicrud/core/validation');
    Export.removeDecoratorsFromFiles(copiedFiles, '@eicrud/core/crud', [
      { regex: /.implements.+CrudEntity/g, replace: '' },
    ]);

    if (!options?.keepValidators) {
      Export.removeDecoratorsFromFiles(copiedFiles, 'class-validator');
    }

    for (const copied of copiedFiles) {
      console.log('EXPORTED: ' + copied);
    }
  }

  static removeDecoratorsFromFiles(files, library, replaces = []) {
    const libraryRegexStr = `import[^{;]*{([^{;]+)}[^{;]+${library}.+;`;
    //console.log('libraryRegexStr', libraryRegexStr);
    const libraryRegex = new RegExp(libraryRegexStr, 'gm');
    // loop through all files in the exported_dtos directory
    for (const filePath of files) {
      const data = fs.readFileSync(filePath, 'utf8');

      const match = libraryRegex.exec(data);
      const group1 = match ? match[1] : '';
      const imports = group1.split(',').map((str) => str.trim());
      // replace mikro-orm imports
      let result = data.replace(libraryRegex, '//delete-this-line');
      const decoratorRegexStr = '@XXX\\([\\s\\S]*';
      const matchRecursively = XRegExp.matchRecursive(
        result,
        '\\(',
        '\\)',
        'gm',
        {
          valueNames: ['literal', null, 'value', null],
        },
      );
      const formated = [];
      let prev = null;
      for (const match of matchRecursively) {
        if (!prev) {
          prev = match.value;
          continue;
        }
        formated.push({ prev, match: match.value });
        prev = null;
      }
      // console.log('matchRecursively', matchRecursively);
      // console.log('formated', formated);
      for (const imp of imports) {
        if (!imp) continue;
        const matchings = formated.filter((f) => f.prev.endsWith('@' + imp));
        for (const match of matchings) {
          result = result.replace(
            '@' + imp + '(' + match.match + ')',
            '//delete-this-line',
          );
        }

        const lineBreak = result.includes('\r\n') ? '\r\n' : '\n';
        result = result
          .split(lineBreak)
          .filter((line) => !line.includes('//delete-this-line'))
          .join(lineBreak);
      }

      for (const replace of replaces) {
        result = result.replace(replace.regex, replace.replace);
      }

      fs.writeFileSync(filePath, result, 'utf8');
    }
  }
}

// Recursively copy files that end with the specific string
const copyDirectory = (
  src,
  dest,
  conditionFun: (str: string) => boolean,
  opts = { makeSubDir: false },
) => {
  // Ensure destination directory exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const copiedFiles = [];

  // Read all items in the source directory
  const items = fs.readdirSync(src);

  items.forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      // If item is a directory, recurse
      copiedFiles.push(...copyDirectory(srcPath, destPath, conditionFun, opts));
    } else {
      // If item is a file, check if it ends with the specific string
      if (conditionFun(item)) {
        let destination = destPath;
        if (opts?.makeSubDir) {
          const fileName = path.basename(destPath);
          const cmdName = fileName.replace('.dto.ts', '');
          // const cmdDir = path.join(dest, cmdName);
          // if (!fs.existsSync(cmdDir)) {
          //   fs.mkdirSync(cmdDir, { recursive: true });
          // }
          destination = path.join(dest, 'cmds', cmdName, fileName);
        }
        fs.copyFileSync(srcPath, destination);
        copiedFiles.push(destination);
      }
    }
  });

  return copiedFiles;
};

// Get pathes of all files that end with the specific string
const getFiles = (src, conditionFun: (str: string) => boolean) => {
  const files = [];

  // Read all items in the source directory
  const items = fs.readdirSync(src);

  items.forEach((item) => {
    const srcPath = path.join(src, item);

    if (fs.statSync(srcPath).isDirectory()) {
      // If item is a directory, recurse
      files.push(...getFiles(srcPath, conditionFun));
    } else {
      // If item is a file, check if it ends with the specific string
      if (conditionFun(item)) {
        files.push(srcPath);
      }
    }
  });

  return files;
};
