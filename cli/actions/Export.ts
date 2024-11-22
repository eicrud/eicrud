import { _utils_cli } from '../utils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { Setup } from './Setup.js';
import {
  kebabToCamelCase,
  kebakToPascalCase,
  toKebabCase,
} from '@eicrud/shared/utils.js';
import XRegExp from 'xregexp';
import { Generate } from './Generate.js';
import { CliOptions } from '@eicrud/shared/config';
import wildcard from 'wildcard';
import lodash from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cleanFileContent(fileContent: string): string {
  const beforeString = '@eicrud:cli:export:delete:start';
  const afterString = '@eicrud:cli:export:delete:end';
  fileContent = _utils_cli.removeEnclosedContent(
    fileContent,
    beforeString,
    afterString,
  );

  const beforeNextLine = '@eicrud:cli:export:delete:next-line';
  fileContent = _utils_cli.removeLineAfterMarker(fileContent, beforeNextLine);

  return fileContent;
}

function getFileDirectives(file: string) {
  let fileContent = fs.readFileSync(file, 'utf8');
  const hideDirective = fileContent.includes('@eicrud:cli:export:hide');
  const excludeDirective = fileContent.includes('@eicrud:cli:export:exclude');
  return { hideDirective, excludeDirective, fileContent };
}

function cleanEmptyDirectories(dir) {
  const isDir = fs.statSync(dir).isDirectory();
  if (!isDir) {
    return;
  }
  let files = fs.readdirSync(dir);
  if (files.length > 0) {
    files.forEach(function (file) {
      const filePath = path.join(dir, file);
      cleanEmptyDirectories(filePath);
    });

    files = fs.readdirSync(dir);
  }

  if (files.length === 0) {
    fs.rmdirSync(dir);
    return;
  }
}

export class Export {
  static action(type, name, cmd): Promise<any> {
    const opts = (this as any).opts();
    const cliConfig = Setup.getCliConfig();
    // console.log('cliConfig', cliConfig);
    switch (type) {
      case 'dtos':
        try {
          return Export.dtos(opts, cliConfig);
        } catch (e) {
          // delete eicrud_exports folder if present
          const exportPath = cliConfig?.export?.outputDir || 'eicrud_exports';
          const dest = path.join(exportPath);
          if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true });
          }
          throw e;
        }
      case 'superclient':
        return Export.superclient(opts, cliConfig);
      case 'openapi':
        return Export.openapi(opts, cliConfig);
      default:
        return Promise.resolve();
    }
  }

  static async dtos(options?, cliOptions?: CliOptions) {
    let excludeServices = cliOptions?.export?.excludeServices || [];
    excludeServices = excludeServices.map((se) => toKebabCase(se));
    //console.log('Generating service', name);
    const inputDir = cliOptions?.export?.inputDir || './src';
    const src = path.join(inputDir);
    const exportPath = cliOptions?.export?.outputDir || 'eicrud_exports';
    const dest = path.join(exportPath);

    const nodeModulesDir = cliOptions?.export?.modulesDir || './node_modules';

    const userServiceDir = cliOptions?.export?.userServiceDir || 'user';

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

    const eicrud_core_dir = path.join(nodeModulesDir, '@eicrud/core');
    const eicrud_core_base_cmds = path.join(
      eicrud_core_dir,
      '/config/basecmd_dtos',
    );
    if (!fs.existsSync(eicrud_core_base_cmds)) {
      throw new Error(
        '@eicrud/core package outdated / not found in node_modules',
      );
    }
    copiedFiles.push(
      ...copyDirectory(
        eicrud_core_base_cmds,
        path.join(dest, 'services'),
        conditionFun,
        {
          makeSubDir: true,
          pathReplaces: [{ regex: /user$/g, replace: userServiceDir }],
        },
      ),
    );
    const crud_options_path = path.join(
      eicrud_core_dir,
      '/crud/model/CrudOptions.ts',
    );
    // copy crud_options to dest
    const options_dest = path.join(dest, 'CrudOptions.ts');
    fs.copyFileSync(crud_options_path, options_dest);
    copiedFiles.push(options_dest);

    const removeFiles = [];
    const excludedServices = [];
    for (const file of copiedFiles) {
      if (!file.endsWith('.entity.ts')) {
        continue;
      }
      let { hideDirective, excludeDirective, fileContent } =
        getFileDirectives(file);

      const serviceName = path.basename(file).replace('.entity.ts', '');
      const pascalEntityName = kebakToPascalCase(serviceName);
      if (excludeDirective || excludeServices.includes(serviceName)) {
        removeFiles.push(file);
        excludedServices.push(serviceName);
      } else if (hideDirective) {
        fileContent = 'export type ' + pascalEntityName + ' = any;';
        fs.writeFileSync(file, fileContent, 'utf8');
        continue;
      }

      fileContent = cleanFileContent(fileContent);

      // write file
      fs.writeFileSync(file, fileContent, 'utf8');
    }

    for (const file of copiedFiles) {
      if (!file.endsWith('.dto.ts')) {
        continue;
      }

      let { hideDirective, excludeDirective, fileContent } =
        getFileDirectives(file);

      if (hideDirective || excludeDirective) {
        // delete file
        removeFiles.push(file);
        continue;
      } else {
        const matchDtoServiceRegex = /([^\\/]+)[\\/]cmds[\\/].+\.dto\.ts/;
        const matchDtoService = matchDtoServiceRegex.exec(file);
        const serviceName = matchDtoService ? matchDtoService[1] : null;
        if (!serviceName) {
          //TODO: remove this check
          console.error('Service name not found for file: ' + file);
        }
        if (excludedServices.includes(serviceName)) {
          removeFiles.push(file);
          continue;
        }
      }

      fileContent = cleanFileContent(fileContent);

      // write file
      fs.writeFileSync(file, fileContent, 'utf8');
    }

    for (const file of copiedFiles) {
      if (file.endsWith('.dto.ts') || file.endsWith('.entity.ts')) {
        continue;
      }

      let { hideDirective, excludeDirective, fileContent } =
        getFileDirectives(file);

      if (hideDirective || excludeDirective) {
        // delete file
        removeFiles.push(file);
        continue;
      }

      fileContent = cleanFileContent(fileContent);

      // write file
      fs.writeFileSync(file, fileContent, 'utf8');
    }

    for (const file of removeFiles) {
      fs.rmSync(file);
      copiedFiles.splice(copiedFiles.indexOf(file), 1);
    }

    Export.removeDecoratorsFromFiles(copiedFiles, '@mikro-orm', [], {
      replaceNews: true,
    });
    // Export.removeDecoratorsFromFiles(copiedFiles, '@eicrud/core/validation');
    Export.removeDecoratorsFromFiles(copiedFiles, '@eicrud/core', [
      { regex: /.implements.+{/g, replace: ' {' },
    ]);

    if (!options?.keepValidators) {
      Export.removeDecoratorsFromFiles(copiedFiles, 'class-validator');
    }

    for (const importToRemove of cliOptions?.export?.removeImports || []) {
      Export.removeDecoratorsFromFiles(copiedFiles, importToRemove);
    }

    if (options?.convertClasses) {
      const replaces = [];
      replaces.push(
        { regex: /.implements[^{]+/g, replace: '' },
        { regex: /export .*class /g, replace: 'export interface ' },
        { regex: /;$/gm, replace: 'replaced_semicolon_5498615_1' },
        { regex: /;/g, replace: 'replaced_semicolon_5498615_2' },
        { regex: /replaced_semicolon_5498615_1/g, replace: ';' },
        {
          regex: /<(.+)=(.+)>/g,
          replace: 'replaced_generics_$1_6498_with_$2_default_5539',
        },
        {
          regex: /^(?!.*(export type )).*(=[^>][^;]+;$)/gm,
          replace: ';',
          onlyGroup: 2,
        },
        {
          regex: /replaced_generics_(.+)_6498_with_(.+)_default_5539/g,
          replace: '<$1=$2>',
        },
        { regex: /replaced_semicolon_5498615_2/g, replace: ';' },

        { regex: /([^!])![ ]*:(.+);$/gm, replace: '$1:$2;' },

        // { regex: /([^?]):(.+);$/gm, replace: '$1?:$2;' },
        // { regex: /([^!?])!\?:(.+);$/gm, replace: '$1?:$2;' }, //remove !?:

        { regex: /([^\r\n:]+) ;$/gm, replace: '$1;' },
        { regex: / \?;$/gm, replace: '?;' },
      );
      Export.removeDecoratorsFromFiles(
        copiedFiles,
        'fake-import-789651359',
        replaces,
      );
    }

    cleanEmptyDirectories(dest);

    for (const copied of copiedFiles) {
      console.log('EXPORTED: ' + copied);
    }
  }

  static async superclient(options?, cliOptions?: CliOptions) {
    //console.log('Generating service', name);
    const exportPath = cliOptions?.export?.outputDir || 'eicrud_exports';
    const src = path.join(exportPath);

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
          if (
            cmdFileNameContent.includes('@eicrud:cli:export:skip-superclient')
          ) {
            continue;
          }
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
            { noWrite: true, noNewLine: false, mute: true },
          );
        }
        fs.writeFileSync(clientFilePath, clientFileContent, 'utf8');
      }

      const superClientFilePath = path.join(src, 'super_client.ts');
      let superClientFileContent = fs.readFileSync(superClientFilePath, 'utf8');
      const clientFileUpdatedPath =
        '.' +
        clientFilePath
          .replace(src, '')
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
        { noWrite: true, noNewLine: true, mute: true },
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
        {
          noWrite: false,
          noNewLine: true,
          mute: files.indexOf(file) < files.length - 1,
        },
      );
    }
  }

  static removeDecoratorsFromFiles(
    files,
    library,
    replaces = [],
    opts = { replaceNews: false },
  ) {
    const libraryRegexStr = `import[^{;]*{([^{;]+)}[^{;]+${library}.+`;
    //console.log('libraryRegexStr', libraryRegexStr);
    const libraryRegex = new RegExp(libraryRegexStr, 'gm');
    // loop through all files in the eicrud_exports directory
    for (const filePath of files) {
      const data = fs.readFileSync(filePath, 'utf8');
      const imports = [];
      let match;
      while (null != (match = libraryRegex.exec(data))) {
        if (match[1]) {
          imports.push(...match[1].split(',').map((str) => str.trim()));
        }
      }
      // console.log('imports', imports);
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
      //console.log('formated', formated);
      //console.log('imports', imports);
      for (let imp of imports) {
        if (!imp) continue;
        //escape regex characters in imp
        const matchings = formated.filter((f) => f.prev.endsWith('@' + imp));
        // const impEscaped = imp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        //console.log('imp', imp);
        for (const match of matchings) {
          result = result.replace(
            '@' + imp + '(' + match.match + ')',
            '//delete-this-line',
          );
        }

        if (opts.replaceNews) {
          const newsRegex = '\\s*=.*new\\s+' + imp + '.+';
          result = result.replace(new RegExp(newsRegex, 'gm'), ';');
        }

        result = _utils_cli.removeDeletedLines(result);
      }

      for (const replace of replaces) {
        if (replace.onlyGroup) {
          //get regex group
          let match = new RegExp(replace.regex).exec(result);
          while (match) {
            const group = match?.[replace.onlyGroup];
            result = result.replace(group, replace.replace);
            match = new RegExp(replace.regex).exec(result);
          }
        } else {
          result = result.replace(replace.regex, replace.replace);
        }
      }

      fs.writeFileSync(filePath, result, 'utf8');
    }
  }

  static copyYamlTemplates(
    src: string,
    paths: { templateSubPath: string }[],
    options: any,
    specs: Omit<OpenAPIV3.Document, 'paths'>,
  ): void {
    paths.forEach(({ templateSubPath }) => {
      const dir = path.join(src, path.basename(templateSubPath));
      const templatePath = path.join(__dirname, templateSubPath);

      if (!fs.existsSync(dir)) {
        fs.copyFileSync(templatePath, dir);
        console.log('CREATED: ' + dir);
      }

      if (!options?.oapiSeparateRefs) {
        const dirObj: OpenAPIV3.Document = loadEntityYaml(dir);
        lodash.merge(specs, { components: dirObj.components });
      }
    });
  }

  static async openapi(options?, cliOptions?: CliOptions) {
    const baseSpecs: OpenAPIV3.Document =
      cliOptions?.export?.openApiBaseSpec || {};

    const specs: Omit<OpenAPIV3.Document, 'paths'> = {
      openapi: '3.0.0',
      info: {
        title: 'Eicrud Server',
        version: '1.0.0',
      },
      servers: [
        {
          description: 'Localhost',
          url: 'http://localhost:3000',
        },
      ],
    };
    lodash.merge(specs, baseSpecs);

    const exportPath = cliOptions?.export?.outputDir || 'eicrud_exports';
    const src = path.join(exportPath);

    const conditionFun = (str) => str.endsWith('.entity.ts');
    const files = getFiles(src, conditionFun);

    const paths = [
      { templateSubPath: '../templates/openapi/Entity.yaml' },
      { templateSubPath: '../templates/openapi/CrudOptions.yaml' },
    ];

    this.copyYamlTemplates(src, paths, options, specs);

    for (const file of files) {
      //get dir from file path
      const dir = path.dirname(file);
      const fileName = path.basename(file);
      const entity_kebab_name = fileName.replace('.entity.ts', '');

      const tk_entity_name = kebakToPascalCase(entity_kebab_name);
      const entityYamlPath = path.join(dir, `${entity_kebab_name}.entity.yaml`);
      const entityYamlPresent = fs.existsSync(entityYamlPath);
      if (!options?.oapiSeparateRefs && entityYamlPresent) {
        const entityYamlObj: OpenAPIV3.Document =
          loadEntityYaml(entityYamlPath);
        lodash.merge(specs.components, entityYamlObj.components);
      }

      const basePath = dir.replace(src, '.');
      const entityRef = entityYamlPresent
        ? path.join(
            basePath,
            `${entity_kebab_name}.entity.yaml#/components/schemas/${tk_entity_name}`,
          )
        : `./Entity.yaml#/components/schemas/Entity`;

      const entityContent: {
        [media: string]: OpenAPIV3.MediaTypeObject;
      } = {
        'application/json': {
          schema: {
            $ref: entityRef,
          },
        },
      };

      const findResponseDtoContent: {
        [media: string]: OpenAPIV3.MediaTypeObject;
      } = {
        'application/json': {
          schema: {
            title: `FindResponeDto<${tk_entity_name}>`,
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  $ref: entityRef,
                },
              },
              total: {
                type: 'number',
              },
              limit: {
                type: 'number',
              },
            },
          },
        },
      };

      const patchResponseDtoContent: {
        [media: string]: OpenAPIV3.MediaTypeObject;
      } = {
        'application/json': {
          schema: {
            title: `PatchResponseDto<${tk_entity_name}>`,
            type: 'object',
            properties: {
              updated: {
                $ref: entityRef,
                title: `Updated ${tk_entity_name} if returnUpdatedEntity CrudOption is specified`,
              },
              count: {
                type: 'number',
              },
            },
          },
        },
      };

      const deleteResponseDtoContent: {
        [media: string]: OpenAPIV3.MediaTypeObject;
      } = {
        'application/json': {
          schema: {
            title: `DeleteResponseDto<${tk_entity_name}>`,
            type: 'object',
            properties: {
              deleted: {
                $ref: entityRef,
                title: `Deleted ${tk_entity_name} if returnUpdatedEntity CrudOption is specified`,
              },
              count: {
                type: 'number',
              },
            },
          },
        },
      };

      const inQuery: OpenAPIV3.ParameterObject = {
        in: 'query',
        name: 'query',
        schema: options?.oapiJsonQueryString ? { type: 'string' } : undefined,
        content: options?.oapiJsonQueryString
          ? undefined
          : {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
        description: `The ${tk_entity_name} query (ids)`,
      };

      const entityQuery: OpenAPIV3.ParameterObject = {
        in: 'query',
        name: 'query',
        content: options?.oapiJsonQueryString ? undefined : entityContent,
        schema: options?.oapiJsonQueryString ? { type: 'string' } : undefined,
        description: `The ${tk_entity_name} query`,
      };

      const csrf_schema: OpenAPIV3.ParameterObject = {
        in: 'header',
        name: 'eicrud-csrf',
        description:
          'Anti-csrf code provided after authentication (if CrudOptions.jwtCookie == true)',
        schema: {
          type: 'string',
        },
      };

      const commonParams: OpenAPIV3.ParameterObject[] = [
        {
          in: 'query',
          name: 'options',
          schema: options?.oapiJsonQueryString ? { type: 'string' } : undefined,
          content: options?.oapiJsonQueryString
            ? undefined
            : {
                'application/json': {
                  schema: {
                    $ref: './CrudOptions.yaml#/components/schemas/CrudOptions',
                  },
                },
              },
          description:
            'CrudOptions (format: JSON) https://docs.eicrud.com/services/options',
        },
        {
          in: 'header',
          name: 'authorization',
          description:
            'Either JWT provided after authentication (if CrudOptions.jwtCookie == false) or Basic Auth',
          schema: {
            type: 'string',
            format: 'Bearer <JWT> or Basic <base64(username:password)>',
          },
        },
        {
          in: 'cookie',
          name: 'eicrud-jwt',
          description:
            'JWT provided after authentication (if CrudOptions.jwtCookie == true)',
          schema: {
            type: 'string',
          },
        },
        csrf_schema,
        { ...csrf_schema, in: 'cookie' },
      ];

      const crudServiceSpecs: Omit<OpenAPIV3.Document, 'openapi' | 'info'> = {
        paths: {
          [`/crud/s/${entity_kebab_name}/one`]: {
            get: {
              summary: `Find a ${tk_entity_name}`,
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The found ${tk_entity_name}`,
                  content: entityContent,
                },
              },
            },
            post: {
              summary: `Creates a ${tk_entity_name}`,
              requestBody: {
                description: `The ${tk_entity_name} to create`,
                required: true,
                content: entityContent,
              },
              parameters: [...commonParams],
              responses: {
                '201': {
                  description: `The created ${tk_entity_name}`,
                  content: entityContent,
                },
              },
            },
            patch: {
              summary: `Update a ${tk_entity_name}`,
              requestBody: {
                description: `The ${tk_entity_name} update`,
                required: true,
                content: entityContent,
              },
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The updated ${tk_entity_name}`,
                  content: patchResponseDtoContent,
                },
              },
            },
            delete: {
              summary: `Delete a ${tk_entity_name}`,
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `${tk_entity_name} deleted`,
                  content: deleteResponseDtoContent,
                },
              },
            },
          },
          [`/crud/s/${entity_kebab_name}/batch`]: {
            post: {
              summary: `Creates multiple ${tk_entity_name}s`,
              requestBody: {
                description: `The ${tk_entity_name}s to create`,
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: entityRef,
                      },
                    },
                  },
                },
              },
              parameters: [...commonParams],
              responses: {
                '201': {
                  description: `The created ${tk_entity_name}s`,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          $ref: entityRef,
                        },
                      },
                    },
                  },
                },
              },
            },
            patch: {
              summary: `Update multiple ${tk_entity_name}s`,
              requestBody: {
                description: `The ${tk_entity_name} queries and updates`,
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          query: {
                            $ref: entityRef,
                          },
                          data: {
                            $ref: entityRef,
                          },
                        },
                      },
                    },
                  },
                },
              },
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The updated ${tk_entity_name} counts`,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: patchResponseDtoContent,
                      },
                    },
                  },
                },
              },
            },
          },
          [`/crud/s/${entity_kebab_name}/many`]: {
            get: {
              summary: `Find ${tk_entity_name}s`,
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The found ${tk_entity_name}s`,
                  content: findResponseDtoContent,
                },
              },
            },
            patch: {
              summary: `Query update ${tk_entity_name}s`,
              requestBody: {
                description: `The ${tk_entity_name} update`,
                required: true,
                content: entityContent,
              },
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The updated ${tk_entity_name} count`,
                  content: patchResponseDtoContent,
                },
              },
            },
            delete: {
              summary: `Query delete ${tk_entity_name}s`,
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `${tk_entity_name} deleted count`,
                  content: deleteResponseDtoContent,
                },
              },
            },
          },
          [`/crud/s/${entity_kebab_name}/in`]: {
            get: {
              summary: `Find ${tk_entity_name}s with id in provided list`,
              parameters: [inQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The found ${tk_entity_name}s`,
                  content: findResponseDtoContent,
                },
              },
            },
            patch: {
              summary: `Query update ${tk_entity_name}s with id in provided list`,
              requestBody: {
                description: `The ${tk_entity_name} update`,
                required: true,
                content: entityContent,
              },
              parameters: [inQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The updated ${tk_entity_name} count`,
                  content: patchResponseDtoContent,
                },
              },
            },
            delete: {
              summary: `Query delete ${tk_entity_name}s with id in provided list`,
              parameters: [inQuery, ...commonParams],
              responses: {
                '200': {
                  description: `${tk_entity_name} deleted count`,
                  content: deleteResponseDtoContent,
                },
              },
            },
          },
          [`/crud/s/${entity_kebab_name}/ids`]: {
            get: {
              summary: `Find ${tk_entity_name}s and return only ids`,
              parameters: [entityQuery, ...commonParams],
              responses: {
                '200': {
                  description: `The found ${tk_entity_name}s' ids`,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      lodash.merge(specs, crudServiceSpecs);

      const cmdDir = path.join(dir, 'cmds');
      if (fs.existsSync(cmdDir)) {
        const cmdFiles = getFiles(cmdDir, (str) => str.endsWith('.dto.ts'));
        for (const cmdFile of cmdFiles) {
          const cmdFileName = path.basename(cmdFile);
          const tk_cmd_kebab_name = cmdFileName.replace('.dto.ts', '');

          const baseCmdDto = kebakToPascalCase(tk_cmd_kebab_name);
          const cmdFileNameContent = fs.readFileSync(cmdFile, 'utf8');
          const hasReturnDto = cmdFileNameContent.includes('ReturnDto');
          const keys = {
            tk_cmd_dto_name: baseCmdDto + 'Dto',
            tk_cmd_return_dto_name: hasReturnDto
              ? baseCmdDto + 'ReturnDto'
              : 'any',
            tk_cmd_name: tk_cmd_kebab_name,
            tk_cmd_lname: tk_cmd_kebab_name,
          };

          const dtoYamlPath = cmdFile.replace('.dto.ts', '.dto.yaml');
          const dtoYamlPresent = fs.existsSync(dtoYamlPath);
          let dtoRefName = dtoYamlPresent
            ? tk_entity_name + '_' + keys.tk_cmd_dto_name
            : keys.tk_cmd_dto_name;
          let returnDtoRefName = dtoYamlPresent
            ? tk_entity_name + '_' + keys.tk_cmd_return_dto_name
            : keys.tk_cmd_return_dto_name;
          if (!options?.oapiSeparateRefs && dtoYamlPresent) {
            const dtoYamlObj: OpenAPIV3.Document = loadEntityYaml(dtoYamlPath);
            specs.components.schemas[dtoRefName] =
              dtoYamlObj.components.schemas[keys.tk_cmd_dto_name];
            const returnDtoSchema =
              dtoYamlObj.components.schemas[keys.tk_cmd_return_dto_name];
            if (returnDtoSchema) {
              specs.components.schemas[returnDtoRefName] = returnDtoSchema;
            } else {
              returnDtoRefName = null;
            }
          }

          const baseCmdDir = cmdDir.replace(src, '.');
          const dtoRef = dtoYamlPresent
            ? path.join(
                baseCmdDir,
                `${tk_cmd_kebab_name}.dto.yaml#/components/schemas/${dtoRefName}`,
              )
            : `./Entity.yaml#/components/schemas/Entity`;

          const returnDtoRef =
            hasReturnDto && dtoYamlPresent
              ? path.join(
                  baseCmdDir,
                  `${tk_cmd_kebab_name}.dto.yaml#/components/schemas/${returnDtoRefName}`,
                )
              : `./Entity.yaml#/components/schemas/Entity`;

          let dtoContent: { [media: string]: OpenAPIV3.MediaTypeObject } = {
            'application/json': {
              schema: {
                $ref: dtoRef,
              },
            },
          };

          let dtoQuery: OpenAPIV3.ParameterObject = {
            in: 'query',
            name: 'query',
            content: options?.oapiJsonQueryString ? undefined : dtoContent,
            schema: options?.oapiJsonQueryString
              ? { type: 'string' }
              : undefined,
            description: `The ${keys.tk_cmd_dto_name} dto (${keys.tk_cmd_dto_name}) (format: JSON)`,
          };

          let returnDtoContent: { [media: string]: OpenAPIV3.MediaTypeObject } =
            {
              'application/json': {
                schema: {
                  $ref: returnDtoRef,
                },
              },
            };

          const patch: OpenAPIV3.OperationObject = {
            summary: `Execute the ${tk_entity_name} ${tk_cmd_kebab_name} command`,
            requestBody: {
              description: `${keys.tk_cmd_dto_name}`,
              required: true,
              content: dtoContent,
            },
            parameters: [...commonParams],
            responses: {
              '200': {
                description: `The command response (${keys.tk_cmd_return_dto_name})`,
                content: returnDtoContent,
              },
            },
          };

          const cmdSpecs: Omit<OpenAPIV3.Document, 'openapi' | 'info'> = {
            paths: {
              [`/crud/s/${entity_kebab_name}/cmd/${tk_cmd_kebab_name}`]: {
                patch: patch,
                post: {
                  ...patch,
                  summary: `Execute the ${tk_entity_name} ${tk_cmd_kebab_name} command in secure mode (non cached user)`,
                  responses: {
                    '201': {
                      description: `The command response (${keys.tk_cmd_return_dto_name})`,
                      content: returnDtoContent,
                    },
                  },
                },
                get: {
                  summary: `Execute the ${tk_entity_name} ${tk_cmd_kebab_name} command (allowGetMethod must be enabled)`,
                  parameters: [...commonParams, dtoQuery],
                  responses: {
                    '200': {
                      description: `The command response (${keys.tk_cmd_return_dto_name})`,
                      content: returnDtoContent,
                    },
                  },
                },
              },
            },
          };
          lodash.merge(specs, cmdSpecs);
        }
      }
    }

    const replaceRecursive = (obj, func: (obj, k) => void) => {
      for (let k in obj) {
        if (typeof obj[k] == 'object' && obj[k] !== null) {
          replaceRecursive(obj[k], func);
        } else {
          func(obj, k);
        }
      }
    };

    if (!options?.oapiSeparateRefs) {
      const func = (obj, k) => {
        if (k == '$ref') {
          obj[k] = obj[k].replace(/(.*)#/g, '#');
        }
      };
      replaceRecursive(specs, func);
    }

    let yamlStr = yaml.dump(specs);
    const openApiPath = path.join(exportPath, 'eicrud-open-api.yaml');

    yamlStr = yamlStr.replace(/\\/g, '/');

    fs.writeFileSync(openApiPath, yamlStr);
    console.log('CREATED: ' + openApiPath);
  }
}

function loadEntityYaml(entityYamlDir: string): OpenAPIV3.Document {
  let entityYamlContent = fs.readFileSync(entityYamlDir, 'utf8');
  const entityYamlObj: OpenAPIV3.Document = yaml.load(
    entityYamlContent,
  ) as OpenAPIV3.Document;
  return entityYamlObj;
}

// Recursively copy files that end with the specific string
const copyDirectory = (
  src,
  dest,
  conditionFun: (str: string) => boolean,
  opts = { makeSubDir: false, pathReplaces: [] },
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
    let destItem = item;
    for (const replace of opts?.pathReplaces || []) {
      destItem = destItem.replace(replace.regex, replace.replace);
      // normalize slashes
      destItem = destItem.replace(/\\/g, '/');
    }
    const destPath = path.join(dest, destItem);

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
          const cmdDir = path.join(dest, 'cmds', cmdName);
          if (!fs.existsSync(cmdDir)) {
            fs.mkdirSync(cmdDir, { recursive: true });
          }
          destination = path.join(cmdDir, fileName);
        }
        fs.copyFileSync(srcPath, destination);
        copiedFiles.push(destination);
      }
    }
  });

  return copiedFiles;
};

// Get pathes of all files that end with the specific string
export const getFiles = (src, conditionFun: (str: string) => boolean) => {
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
