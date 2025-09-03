/* eslint-disable import/no-default-export */
import { defineConfig, globalIgnores } from 'eslint/config';

import * as tsParser from '@typescript-eslint/parser';
import * as typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import * as _import from 'eslint-plugin-import';

import { fixupPluginRules } from '@eslint/compat';

import * as globals from 'globals';
import * as js from '@eslint/js';

import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ),
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        tsconfigRootDir: __dirname,
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      import: fixupPluginRules(_import as any),
    },

    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/prefer-ts-expect-error': 'off',
      'import/no-default-export': 2,
    },
  },
  globalIgnores(['**/.eslintrc.js', 'docs/overrides/**/*']),
  globalIgnores(['cli/templates/**/*']),
]);
