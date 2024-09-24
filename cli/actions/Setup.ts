import { _utils_cli } from '../utils.js';
import { Generate } from './Generate.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import child_process from 'child_process';
import { toKebabCase } from '@eicrud/shared/utils.js';
import { CliOptions } from '@eicrud/shared/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class Setup {
  static getCliConfig(): CliOptions {
    const configPath = path.join(process.cwd(), 'eicrud-cli.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } else {
      console.warn('No eicrud-cli.json file found in the current directory');
    }
  }
  static getMikroOrmDriver(type, keys, moduleImports, packages?) {
    if (type === 'mongo') {
      packages?.push('@eicrud/mongodb');
      keys.tk_orm_driver = 'MongoDriver';
      moduleImports.push("import { MongoDriver } from '@mikro-orm/mongodb';");
    } else {
      packages?.push('@eicrud/postgresql');
      keys.tk_orm_driver = 'PostgreSqlDriver';
      moduleImports.push(
        "import { PostgreSqlDriver } from '@mikro-orm/postgresql';",
      );
    }
  }

  static action(type, name): Promise<any> {
    const opts = (this as any).opts();
    let packages = ['@eicrud/core', '@nestjs/config'];
    const allowedTypes = ['mongo', 'postgre'];
    if (!allowedTypes.includes(type)) {
      throw new Error(
        `Invalid type: ${type}. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const templateDir = path.join(__dirname, '../templates');

    const moduleImports = [
      "import { MikroOrmModule } from '@mikro-orm/nestjs';",
      "import { EICRUDModule } from '@eicrud/core';",
      "import { CRUDEntities } from './services/index';",
      "import { CRUD_CONFIG_KEY } from '@eicrud/core/config';",
      "import { MyConfigService } from './eicrud.config.service';",
      "import { ConfigModule } from '@nestjs/config';",
    ];

    const keys: any = {
      tk_db_name: `"${name.toLowerCase()}-db"`,
      tk_db_adapter_path:
        type === 'mongo' ? "'@eicrud/mongodb'" : "'@eicrud/postgresql'",
      tk_db_adapter: type === 'mongo' ? 'MongoDbAdapter' : 'PostgreDbAdapter',
    };

    Setup.getMikroOrmDriver(type, keys, moduleImports, packages);

    const moduleTemplateFile = path.join(templateDir, 'module-imports.ts');
    let moduleContent = fs.readFileSync(moduleTemplateFile, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      moduleContent = moduleContent.replace(new RegExp(key, 'g'), value);
    }

    const providerTemplateFile = path.join(templateDir, 'module-providers.ts');
    let providerContent = fs.readFileSync(providerTemplateFile, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      providerContent = providerContent.replace(new RegExp(key, 'g'), value);
    }

    const modulePath = './src/app.module.ts';

    let content = fs.readFileSync(modulePath, 'utf8');
    content = moduleImports.join('\n') + '\n' + content;

    const importsReguex = /imports[ ]{0,}:[ ]{1,}\[([^\]]*)\]/;
    const getReplaceString = (array) => {
      let rep = array.trim();
      rep = rep ? '  ' + rep + '\n' : '';
      return `imports: [\n${moduleContent}\n${rep}  ]`;
    };
    content = _utils_cli.addNewLineToMatched(
      content,
      importsReguex,
      getReplaceString,
      `Could not find imports array in ${modulePath}`,
    );

    const providersReguex = /providers[ ]{0,}:[ ]{1,}\[([^\]]*)\]/;
    const getProvidersReplaceString = (array) => {
      let rep = array.trim();
      rep = rep ? '  ' + rep + '\n' : '';
      return `providers: [\n${providerContent}\n${rep}  ]`;
    };
    content = _utils_cli.addNewLineToMatched(
      content,
      providersReguex,
      getProvidersReplaceString,
      `Could not find providers array in ${modulePath}`,
    );

    //write content
    fs.writeFileSync(modulePath, content);
    console.log('UPDATED:', modulePath);

    const configPath = './src/eicrud.config.service.ts';
    const configTemplateFile = path.join(
      templateDir,
      '/eicrud.config.service.ts',
    );

    let configContent = fs.readFileSync(configTemplateFile, 'utf8');
    for (const key in keys) {
      const value = keys[key];
      configContent = configContent.replace(new RegExp(key, 'g'), value);
    }

    fs.writeFileSync(configPath, configContent);
    console.log('CREATED:', configPath);

    const rolesTemplateFile = path.join(templateDir, '/eicrud.roles.ts');
    const rolesPath = './src/eicrud.roles.ts';
    fs.copyFileSync(rolesTemplateFile, rolesPath);
    console.log('CREATED:', rolesPath);

    Generate.service('user');
    Generate.service('email', { nonCrud: true });

    const userBaseCmds = [
      'sendVerificationEmail',
      'verifyEmail',
      'sendPasswordResetEmail',
      'changePassword',
      'resetPassword',
      'createAccount',
      'logoutEverywhere',
      'login',
      'checkJwt',
      'timeoutUser',
      'logout',
    ];

    const bKeysArray = [];

    for (const baseCmd of userBaseCmds) {
      const snaked = toKebabCase(baseCmd).replaceAll('-', '_');

      const bKeys = {
        tk_cmd_camel_name: baseCmd,
        tk_cmd_lname: snaked,
        tk_cmd_name: snaked,
        tk_entity_lname: 'user',
        tk_entity_camel_name: 'user',
        tk_entity_name: 'User',
        tk_role_type: 'any',
        tk_import_role_type: '',
      };

      _utils_cli.addRoleTypeKeys(fs, '', bKeys);

      const dir = `./src/services/user/cmds/${snaked}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const basecmdSecurityTemplateFile = path.join(
        templateDir,
        'cmd/tk_basecmd_lname.security.ts',
      );
      const basecmdSecurityPath = dir + `/${snaked}.security.ts`;
      let basecmdSecurityContent = fs.readFileSync(
        basecmdSecurityTemplateFile,
        'utf8',
      );
      for (const key in bKeys) {
        const value = bKeys[key];
        basecmdSecurityContent = basecmdSecurityContent.replace(
          new RegExp(key, 'g'),
          value,
        );
      }
      fs.writeFileSync(basecmdSecurityPath, basecmdSecurityContent);
      console.log('CREATED:', basecmdSecurityPath);

      bKeysArray.push(bKeys);
    }

    _utils_cli.addSecurityToCmdIndex(fs, path, templateDir, 'user', bKeysArray);

    const userServicePath = './src/services/user/user.service.ts';
    let userServiceContent = fs.readFileSync(userServicePath, 'utf8');

    const userServiceImports = [
      "import { CrudUserService } from '@eicrud/core/config'",
    ];

    userServiceContent =
      userServiceImports.join('\n') + '\n' + userServiceContent;
    userServiceContent = userServiceContent.replace(
      'CrudService<User>',
      'CrudUserService<User>',
    );

    fs.writeFileSync(userServicePath, userServiceContent);
    console.log('UPDATED:', userServicePath);

    const userTemplateFile = path.join(templateDir, '/user.ts');
    const userPath = './src/services/user/user.entity.ts';
    fs.copyFileSync(userTemplateFile, userPath);
    console.log('UPDATED:', userPath);

    const cliCongigTemplateFile = path.join(templateDir, '/eicrud-cli.json');
    const cliConfigPath = './eicrud-cli.json';
    fs.copyFileSync(cliCongigTemplateFile, cliConfigPath);
    console.log('CREATED:', cliConfigPath);

    const emailServiceTemplateFile = path.join(
      templateDir,
      '/email.service.ts',
    );
    const emailServicePath = './src/services/email/email.service.ts';
    fs.copyFileSync(emailServiceTemplateFile, emailServicePath);
    console.log('UPDATED:', emailServicePath);

    const mainFile = './src/main.ts';
    let mainFileContent = fs.readFileSync(mainFile, 'utf8');
    const mainFileImports = [
      "import { FastifyAdapter } from '@nestjs/platform-fastify';",
    ];
    mainFileContent =
      mainFileImports.join('\n') +
      '\n' +
      mainFileContent.replace(
        'NestFactory.create(AppModule)',
        'NestFactory.create(AppModule, new FastifyAdapter())',
      );
    fs.writeFileSync(mainFile, mainFileContent);
    console.log('UPDATED:', mainFile);

    if (opts.version) {
      // install specific version of all @eicrud/* packages
      for (const key in packages) {
        if (packages[key].includes('@eicrud/')) {
          packages[key] = packages[key] + '@' + opts.version;
        }
      }
    }

    child_process.execSync('npm install ' + packages.join(' '), {
      stdio: 'inherit',
    });

    const corePackageJson = path.join(
      __dirname,
      './node_modules/@eicrud/core/package.json',
    );
    const corePackageJsonObj = JSON.parse(
      fs.readFileSync(corePackageJson, 'utf8'),
    );

    // push @mikro-orm/core && class-validator with exact versions
    // listing them as direct dependencies allows IDEs to auto-import them
    const newPackages = [
      `@mikro-orm/core@${corePackageJsonObj.dependencies['@mikro-orm/core']}`,
      `class-validator@${corePackageJsonObj.dependencies['class-validator']}`,
    ];

    child_process.execSync('npm install ' + newPackages.join(' '), {
      stdio: 'inherit',
    });

    return null;
  }
}
