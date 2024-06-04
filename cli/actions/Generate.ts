import { _utils_cli } from '../utils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { Setup } from './Setup.js';
import { CrudService } from '@eicrud/core/crud/crud.service.js';
import { toKebabCase } from '@eicrud/shared/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Generate {
  static action(type, name, cmd): Promise<any> {
    switch (type) {
      case 'cmd':
        return Generate.cmd(name, cmd);
      case 'service':
        return Generate.service(name, (this as any).opts());
      default:
        return Promise.resolve();
    }
  }

  static copyTemplateFiles(template_folder, files, keys, dir) {
    files.forEach((file) => {
      const sourcePath = path.join(template_folder, file);
      let newFileName = file;
      for (const key in keys) {
        const value = keys[key];
        newFileName = newFileName.replace(key, value);
      }
      const targetPath = path.join(dir, newFileName);
      fs.copyFileSync(sourcePath, targetPath);
      console.log('CREATED:', targetPath);

      //replace content
      let content = fs.readFileSync(targetPath, 'utf8');
      for (const key in keys) {
        const value = keys[key];
        content = content.replace(new RegExp(key, 'g'), value);
      }
      //write content
      fs.writeFileSync(targetPath, content);
    });
  }

  static service(name, options?): Promise<any> {
    //console.log('Generating service', name);

    name = name.charAt(0).toUpperCase() + name.slice(1);

    const keys = {
      tk_entity_name: name,
      tk_entity_lname: name.toLowerCase(),
      tk_entity_uname: name.toUpperCase(),
    };

    const dir = `./src/services/${keys.tk_entity_lname}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const template_folder = path.join(__dirname, '../templates/service');

    const files = [
      'tk_entity_lname.entity.ts',
      'tk_entity_lname.security.ts',
      'tk_entity_lname.service.ts',
    ];

    Generate.copyTemplateFiles(template_folder, files, keys, dir);

    const indexFile = `./src/services/index.ts`;
    if (!fs.existsSync(indexFile)) {
      const templateIndex = path.join(template_folder, '/index.ts');
      fs.copyFileSync(templateIndex, indexFile);
    }

    const cmdsFile = dir + `/cmds.ts`;
    if (!fs.existsSync(cmdsFile)) {
      const templateIndex = path.join(template_folder, '/cmds.ts');
      fs.copyFileSync(templateIndex, cmdsFile);
      console.log('CREATED:', cmdsFile);
    }

    const serviceName = `${name}Service`;
    const importLines = [
      `import { ${serviceName} } from './${keys.tk_entity_lname}/${keys.tk_entity_lname}.service';`,
      `import ${name} from './${keys.tk_entity_lname}/${keys.tk_entity_lname}.entity';`,
    ];

    //update index file
    let content = fs.readFileSync(indexFile, 'utf8');

    importLines.forEach((importLine) => {
      content = importLine + '\n' + content;
    });

    const replaces = [
      {
        regex:
          /export[ ]{1,}const[ ]{1,}CRUDServices[ ]{1,}=[ ]{1,}\[([^\]]*)\]/,
        getReplaceString: (array) => {
          let rep = array.trim();
          rep = rep ? '    ' + rep + '\n' : '';
          return `export const CRUDServices = [\n    ${serviceName},\n${rep}]`;
        },
        error: 'Could not find CRUDServices array in index file',
      },
    ];

    if (!options?.nonCrud) {
      replaces.push({
        regex:
          /export[ ]{1,}const[ ]{1,}CRUDEntities[ ]{1,}=[ ]{1,}\[([^\]]*)\]/,
        getReplaceString: (array) => {
          let rep = array.trim();
          rep = rep ? '    ' + rep + '\n' : '';
          return `export const CRUDEntities = [\n    ${name},\n${rep}]`;
        },
        error: 'Could not find CRUDEntities array in index file',
      });
    }

    for (let replace of replaces) {
      content = _utils_cli.addNewLineToMatched(
        content,
        replace.regex,
        replace.getReplaceString,
        replace.error,
      );
    }

    //write content
    fs.writeFileSync(indexFile, content);

    console.log('UPDATED:', indexFile);

    const providersFile = `./src/app.module.ts`;
    if (!fs.existsSync(providersFile)) {
      throw new Error('Could not find app.module.ts');
    }

    //update app.module.ts
    content = fs.readFileSync(providersFile, 'utf8');

    const dbType = content.includes('MongoDriver') ? 'mongo' : 'postgres';

    const contentlength = content.length;

    const importServicesLine = `import { CRUDServices } from './services/index';`;

    //add import line at beginning of file if not already there
    if (!content.includes(importServicesLine)) {
      content = importServicesLine + '\n' + content;
    }

    const crudServicesSpread = '...CRUDServices';

    if (!content.includes(crudServicesSpread)) {
      const providersRegex = /providers[ ]{0,}:[ ]{1,}\[([^\]]*)\]/;
      const newLine = `    ${crudServicesSpread},`;
      const getReplaceString = (array) => {
        let rep = array.trim();
        rep = rep ? '    ' + rep + '\n' : '';
        return `providers: [\n${newLine}\n${rep}  ]`;
      };
      content = _utils_cli.addNewLineToMatched(
        content,
        providersRegex,
        getReplaceString,
        `Could not find providers array in ${providersFile}`,
      );
    }

    //write content
    if (content.length !== contentlength) {
      fs.writeFileSync(providersFile, content);
      console.log('UPDATED:', providersFile);
    }

    // add test file
    const importsTestFile = [];
    Setup.getMikroOrmDriver(dbType, keys, importsTestFile, []);
    const testFileTemplate = path.join(
      template_folder,
      'tk_entity_lname.service.spec.ts',
    );
    let testContent =
      importsTestFile.join('\n') +
      '\n' +
      fs.readFileSync(testFileTemplate, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      testContent = testContent.replace(new RegExp(key, 'g'), value);
    }
    const testFile = path.join(dir, `/${keys.tk_entity_lname}.service.spec.ts`);
    fs.writeFileSync(testFile, testContent);
    console.log('CREATED:', testFile);

    return Promise.resolve();
  }

  static cmd(serviceName, name): Promise<any> {
    //console.log('Generating service', name);
    serviceName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

    const tk_cmd_bname = name;
    const tk_cmd_dto_name =
      name.charAt(0).toUpperCase() + name.slice(1) + 'Dto';

    name = toKebabCase(name);

    name = name.replaceAll('-', '_');

    const keys = {
      tk_entity_name: serviceName,
      tk_entity_lname: serviceName.toLowerCase(),
      tk_entity_uname: serviceName.toUpperCase(),
      tk_cmd_name: name,
      tk_cmd_lname: name.toLowerCase(),
      tk_cmd_uname: name.toUpperCase(),
      tk_cmd_dto_name,
      tk_cmd_bname,
    };

    let dir = `./src/services/${keys.tk_entity_lname}`;
    if (!fs.existsSync(dir)) {
      throw new Error(`Could not find service directory: ${dir}`);
    }

    dir = dir + '/cmds/' + keys.tk_cmd_lname;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const template_folder = path.join(__dirname, '../templates');
    const files = [
      'tk_cmd_lname.action.ts',
      'tk_cmd_lname.security.ts',
      'tk_cmd_lname.dto.ts',
    ];

    Generate.copyTemplateFiles(
      path.join(template_folder, '/cmd'),
      files,
      keys,
      dir,
    );

    _utils_cli.addSecurityToCmdIndex(fs, path, template_folder, serviceName, [
      keys,
    ]);

    const servicePath = `./src/services/${keys.tk_entity_lname}/${keys.tk_entity_lname}.service.ts`;
    let serviceFileContent = fs.readFileSync(servicePath, 'utf8');

    if (!serviceFileContent.includes('GENERATED START')) {
      throw new Error(
        'Could not find "// GENERATED START - do not remove" in service file',
      );
    }

    const [before, rest, after] =
      serviceFileContent.split(/GENERATED START(.+)/);

    const defTemplateFile = path.join(
      template_folder,
      '/service/cmd_definition.ts',
    );
    let defContent = fs.readFileSync(defTemplateFile, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      defContent = defContent.replace(new RegExp(key, 'g'), value);
    }

    const importLine = `import ${keys.tk_cmd_dto_name} from './cmds/${keys.tk_cmd_lname}/${keys.tk_cmd_lname}.dto';`;

    serviceFileContent =
      importLine +
      '\n' +
      before +
      'GENERATED START' +
      rest +
      '\n' +
      defContent +
      '\n' +
      after;

    //write content
    fs.writeFileSync(servicePath, serviceFileContent);
    console.log('UPDATED:', servicePath);

    return Promise.resolve();
  }
}
