/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2024: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:promise/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'promise/avoid-new': 'off'
  }
};
