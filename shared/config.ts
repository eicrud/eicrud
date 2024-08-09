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

  //https://swagger.io/specification
  openApiBaseSpec?: any;
}

export interface CliOptions {
  export?: ExportOptions;
}

export type NotVoid =
  | { [key: string]: NotVoid }
  | object
  | string
  | boolean
  | symbol
  | number
  | null
  | undefined;
