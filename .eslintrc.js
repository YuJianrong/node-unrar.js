//@ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  env: { browser: true, es6: true, node: true },
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'all',
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 2018,
  },

  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      env: { browser: true, es6: true, node: true },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint', 'prettier'],
      rules: {
        'prettier/prettier': [
          'error',
          { singleQuote: true, printWidth: 100, trailingComma: 'all' },
        ],
        '@typescript-eslint/no-unused-vars': 0,
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        chrome: 'readonly',
      },
    },
  ],
};
