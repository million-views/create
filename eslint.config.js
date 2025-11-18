/** @type {import('eslint').Linter.Config[]} */
import markdown from '@eslint/markdown';

export default [
  {
    ignores: ['tmp/**', 'test-*/**'],
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        // Node.js timers and performance
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        // Node.js URL and other globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        // Additional Node.js globals
        AbortController: 'readonly',
        fetch: 'readonly',
        structuredClone: 'readonly',
        require: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'eqeqeq': 'error',
      'curly': ['error', 'multi-line'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'never'],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2, { SwitchCase: 1, ignoreComments: true }],
      'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'computed-property-spacing': ['error', 'never'],
      'func-call-spacing': ['error', 'never'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'spaced-comment': ['error', 'always'],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'strict': ['error', 'global']
    }
  },
  {
    files: ['bin/**/*.mjs', 'bin/**/*.js'],
    rules: {
      // Allow console.log in CLI tools as it's the standard output mechanism
      'no-console-log': 'off'
    }
  },
  {
    files: ['lib/logger.mjs'],
    rules: {
      // Allow console.log in the Logger class as it's the centralized output mechanism
      'no-console-log': 'off'
    }
  },
  // Include the markdown recommended config
  ...markdown.configs.recommended.map(config => ({
    ...config,
    ignores: ['tmp/**', 'test-*/**'],
    rules: {
      ...config.rules,
      // Adjust some rules for our documentation style
      'markdown/fenced-code-language': 'warn', // Warn instead of error for missing languages
      'markdown/no-duplicate-headings': 'off', // Allow duplicate headings in recipe documentation
      'markdown/no-empty-links': 'error',
      'markdown/no-invalid-label-refs': 'error',
      'markdown/no-missing-label-refs': 'off', // Disable for template files with placeholders
      'markdown/no-multiple-h1': 'error'
    }
  }))
];
