/* eslint-env node */

module.exports = {
  root: true,
  env: {
    node: true,
    mocha: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    requireConfigFile: false,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint/eslint-plugin',
  ],
  rules: {
    'no-var': 'warn',
    'eqeqeq': 'warn',
    'keyword-spacing': 'error',
    'handle-callback-err': 'error',
    'no-console': 0,
    'linebreak-style': 0,
    'react/no-unescaped-entities': 0,
    'quotes': [ 'error', 'single', { avoidEscape: true, allowTemplateLiterals: true } ],
    'semi': ['error', 'always'],
    'semi-spacing': 'error',
    'spaced-comment': 0,
    'vue/multi-word-component-names': 'off',
    'comma-dangle': ['warn', 'always-multiline'],
    'no-unused-vars': [
      'warn',
      { vars: 'all', args: 'all', argsIgnorePattern: '^_|this', ignoreRestSiblings: false },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
