CLI (Command line interface) package for the [Eicrud framework](https://github.com/eicrud/eicrud).

## Installation

```
npm i -g @eicrud/cli
```

## Setup
```bash
Usage: eicrud setup [options] <type> <name>

Setup new project (adapt an existing nestjs application)

Arguments:
  type        mongo | postgre
  name        project name (will be used for db)

Options:
  -h, --help  display help for command
```
Initialise Eicrud on a Nestjs application.

```
cd project-name
eicrud setup mongo project-name
```

## Generate
```bash
Usage: eicrud generate [options] <type> <serviceName> [cmdName]

Generate new files

Arguments:
  type                service, cmd
  serviceName
  cmdName

Options:
  -n, --non-crud      will not create a DB table for this service
  -ms, --ms <string>  a subfolder for the service to be created/modified in
  -h, --help          display help for command
```

Generate a new service.
```
eicrud generate service myService
```

Generate a new service in a subfolder (microservice architecture).

```
eicrud generate service myService -ms myFolder
```

Generate a new command for a service.

```
eicrud generate cmd myService myCmd (-ms myFolder)
```

### Export
```bash
Usage: eicrud export [options] <type>

Export dtos, superclient or openapi schemas

Arguments:
  type                              dtos | superclient | openapi

Options:
  -kv, --keep-validators            will keep class-validator decorators when exporting dtos
  -cc, --convert-classes            will convert classes into interfaces when exporting dtos
  -o-sr, --oapi-separate-refs       keep DTOs schemas in separate files
  -o-jqs, --oapi-json-query-string  export openapi schema json query parameters with type string for      
                                    compatibility with tools that do not support application/json there   
  -h, --help                        display help for command
```

Copy all your `.dto.ts` and `.entity.ts` to the `eicrud_exports` directory and strip them of their decorators.
```bash
eicrud export dtos
```
Build a typed client class for each of your exported entities and instantiate them in a main `SuperClient` class.

```bash
eicrud export superclient
```

Export an OpenAPI schema based on your entities and commands.

```bash
eicrud export openapi
```



## JSON config
You can specify ExportOptions in a `eicrud-cli.json` file at the root of your project.
```typescript
export interface ExportOptions {
  /**
   * Exclude the given services from the export.
   * @example ['user-profile', 'Email']
   */
  excludeServices?: Array<string>;

  /**
   * Include files that match the given patterns into the output directory.
   * @example ['*.shared.ts', '*.md']
   */
  includePatterns?: Array<string>;

  /**
   * Exclude files that match the given patterns from the output directory.
   * @example ['*secret-ms*.dto.ts']
   */
  excludePatterns?: Array<string>;

  /**
   * Remove given imports from the exported files.
   * @example ['@mypackage/core', 'rxjs']
   */
  removeImports?: Array<string>;

  /**
   * Output directory
   * @default 'eicrud_exports'
   */
  outputDir?: string;

  /**
   * Input directory
   * @default './src/services'
   **/
  inputDir?: string;

  /**
   * Location of the node_modules directory.
   * @default './node_modules'
   */
  modulesDir?: string;

  /**
   * Name of the user service directory.
   * @default 'user'
   */
  userServiceDir?: string;

  /**
   * Set the defaults for the exported openAPI schema.
   * https://swagger.io/specification
   */
  openApiBaseSpec?: any;
}
```
