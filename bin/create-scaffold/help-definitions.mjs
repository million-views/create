#!/usr/bin/env node

/**
 * Create-Scaffold CLI Help Definitions
 * Tool-specific help definitions that belong with the create-scaffold tool
 * These would NOT be part of the reusable CLI framework package
 */

import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';
import { HELP_PATTERNS } from '../../lib/cli/framework.mjs';
import { sanitizeBranchName } from '../../lib/shared/security.mjs';

/**
 * Help definitions for create-scaffold CLI
 * These are specific to the create-scaffold tool and its commands
 */
export const CREATE_SCAFFOLD_HELP = {
  [TERMINOLOGY.COMMAND.NEW]: {
    description: 'Create a new project from a template',
    detailedDescription: `Create a new project by scaffolding from a template. This command clones a template
repository, processes placeholders, and sets up a new project directory ready for development.

The command supports various template sources including GitHub repositories, local directories,
and registered template collections. Placeholders in templates are automatically detected and
can be filled interactively or via command-line options.

After scaffolding, the new project will be ready to run with standard commands like 'npm install'
and 'npm start' (or equivalent for the project's package manager).`,
    options: {
      [TERMINOLOGY.OPTION.TEMPLATE]: {
        type: 'string',
        short: 'T',
        description: 'Template to use',
        detailedDescription: `Specify the template to scaffold from. Supports multiple formats:
- GitHub shorthand: 'user/repo' or 'favorites/template-name'
- Full URLs: 'https://github.com/user/repo'
- Local paths: './path/to/template' or '/absolute/path'
- Registry references: 'registry-name/template-name'

Examples:
  --template react-app
  --template favorites/express-api
  --template https://github.com/myorg/template
  --template ./local-templates/custom`,
        examples: ['react-app', 'favorites/express-api', 'https://github.com/myorg/template']
      },
      [TERMINOLOGY.OPTION.BRANCH]: {
        type: 'string',
        short: 'b',
        description: 'Git branch to use',
        detailedDescription: `Specify which git branch to clone from the template repository.
Defaults to 'main' for newer repositories, falls back to 'master' for older ones.

Useful when templates have different versions on different branches:
- main: Latest stable version
- develop: Bleeding edge features
- v1.x: Legacy version compatibility

Example: --branch develop`,
        default: 'main/master',
        examples: ['develop', 'v1.x']
      },
      'log-file': {
        type: 'string',
        description: 'Enable detailed logging to specified file',
        detailedDescription: `Write detailed operation logs to the specified file. Useful for debugging
template processing issues or understanding what changes were made.

The log includes:
- Template cloning progress
- Placeholder detection and replacement
- File processing operations
- Error details and recovery actions

Example: --log-file scaffold.log`,
        examples: ['scaffold.log', './logs/scaffold.log']
      },
      [TERMINOLOGY.OPTION.DRY_RUN]: HELP_PATTERNS.DRY_RUN,
      'no-cache': {
        type: 'boolean',
        description: 'Bypass cache system and clone directly',
        detailedDescription: `Force fresh clone of the template repository, ignoring any cached versions.
Useful when you need the absolute latest version or suspect cache corruption.

Note: This will be slower as it bypasses the local template cache.
Use when developing templates or needing latest changes.

Example: --no-cache`
      },
      'cache-ttl': {
        type: 'string',
        description: 'Override default cache TTL in hours',
        detailedDescription: `Set custom cache expiration time in hours. Templates are cached locally
to speed up repeated scaffolding from the same template.

Default TTL is 24 hours. Set to 0 to disable caching entirely.
Higher values improve performance but may use stale templates.

Example: --cache-ttl 168  # 1 week`,
        examples: ['0', '168']
      },
      placeholder: {
        type: 'string',
        multiple: true,
        description: 'Supply placeholder value in NAME=value form',
        detailedDescription: `Pre-supply values for template placeholders. Prevents interactive prompts
for known values. Multiple placeholders can be specified.

Format: NAME=value
The NAME must match placeholder names detected in the template.

Examples:
  --placeholder projectName=MyApp
  --placeholder author="John Doe"
  --placeholder version=1.0.0

Can be combined: --placeholder name=App --placeholder port=3000`,
        examples: ['projectName=MyApp', 'author="John Doe"', 'version=1.0.0']
      },
      'experimental-placeholder-prompts': {
        type: 'boolean',
        description: 'Enable experimental placeholder prompting features',
        detailedDescription: `Enable advanced placeholder prompting with validation and smart defaults.
Provides better UX for complex templates with many placeholders.

Features include:
- Type validation for placeholders
- Smart default value suggestions
- Placeholder dependency handling
- Validation feedback

This is experimental and may change behavior.`
      },
      'no-input-prompts': HELP_PATTERNS.SILENT_MODE,
      [TERMINOLOGY.OPTION.INTERACTIVE]: {
        type: 'boolean',
        description: 'Force interactive mode',
        detailedDescription: 'Force interactive prompting even when placeholders are provided via --placeholder. Allows reviewing and modifying pre-supplied values interactively.'
      },
      'no-interactive': {
        type: 'boolean',
        description: 'Force non-interactive mode',
        detailedDescription: 'Ensures no prompts are shown, even if required placeholders are missing. Will fail if placeholders cannot be resolved. Ideal for automated scripts and CI/CD pipelines.'
      },
      'no-config': {
        type: 'boolean',
        description: 'Skip loading user configuration',
        detailedDescription: `Ignore user configuration files and global settings. Uses only default
values and command-line options.

Useful for:
- Testing default behavior
- Avoiding user-specific customizations
- Ensuring consistent behavior across environments`
      },
      options: {
        type: 'string',
        description: 'Path to options file for template configuration',
        detailedDescription: `Load template configuration from a JSON file. Allows complex template
customization through structured configuration.

The file should contain template-specific options and settings.
Format depends on the template's requirements.

Example: --options ./my-template-config.json`,
        examples: ['./my-template-config.json', './config/template-options.json']
      }
    },
    validate: (commandOptions, positionals) => {
      const errors = [];

      // Check required template flag
      if (!commandOptions[TERMINOLOGY.OPTION.TEMPLATE]) {
        errors.push('--template flag is required');
      }

      // Check project directory positional argument
      if (!positionals[0]) {
        errors.push('Project directory is required');
      } else {
        const projectDir = positionals[0];

        // Check for path traversal
        if (projectDir.includes('../') || projectDir.includes('..\\') || projectDir.startsWith('/')) {
          errors.push('Project directory name contains path separators or traversal attempts');
        }

        // Check for invalid characters
        if (projectDir.includes('/') || projectDir.includes('\\')) {
          errors.push('Project directory name contains path separators or traversal attempts');
        }

        // Check for reserved names
        const reservedNames = ['node_modules', 'src', 'lib', 'bin', 'test', 'tests', 'docs', 'config', 'scripts', 'tmp', 'temp', 'cache', 'logs', 'build', 'dist', 'public', 'assets', 'static', 'vendor', 'packages', 'components', 'utils', 'helpers', 'types', 'interfaces', 'models', 'services', 'controllers', 'routes', 'middleware', 'plugins', 'extensions', 'themes', 'templates', 'examples', 'samples', 'demos', 'tools', 'cli', 'api', 'web', 'mobile', 'desktop', 'server', 'client', 'frontend', 'backend', 'database', 'storage', 'auth', 'security', 'admin', 'user', 'profile', 'settings', 'preferences', 'dashboard', 'home', 'login', 'logout', 'register', 'signup', 'forgot', 'reset', 'verify', 'confirm', 'success', 'error', '404', '500', 'index', 'main', 'app', 'application', 'project', 'workspace', 'repo', 'repository', 'git', 'github', 'gitlab', 'bitbucket', 'npm', 'yarn', 'pnpm', 'webpack', 'babel', 'eslint', 'prettier', 'jest', 'mocha', 'chai', 'sinon', 'enzyme', 'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby', 'express', 'koa', 'hapi', 'fastify', 'restify', 'loopback', 'sails', 'meteor', 'rails', 'django', 'flask', 'spring', 'laravel', 'symfony', 'codeigniter', 'cakephp', 'phalcon', 'zend', 'slim', 'lumen', 'adonis', 'nest', 'strapi', 'keystone', 'payload', 'directus', 'hasura', 'supabase', 'firebase', 'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'surge', 'now', 'zeit', 'docker', 'kubernetes', 'helm', 'terraform', 'ansible', 'puppet', 'chef', 'salt', 'vagrant', 'virtualbox', 'vmware', 'hyperv', 'wsl', 'bash', 'zsh', 'fish', 'powershell', 'cmd', 'terminal', 'console', 'shell', 'script', 'batch', 'make', 'cmake', 'gradle', 'maven', 'ant', 'grunt', 'gulp', 'webpack', 'rollup', 'parcel', 'vite', 'snowpack', 'esbuild', 'swc', 'tsc', 'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'php', 'ruby', 'perl', 'swift', 'kotlin', 'scala', 'clojure', 'haskell', 'erlang', 'elixir', 'lua', 'r', 'matlab', 'julia', 'dart', 'flutter', 'react-native', 'ionic', 'cordova', 'capacitor', 'electron', 'tauri', 'nwjs', 'neutralino', 'pwa', 'spa', 'mpa', 'ssr', 'csr', 'isr', 'prerender', 'static', 'dynamic', 'hybrid', 'serverless', 'lambda', 'edge', 'cdn', 'cache', 'proxy', 'gateway', 'api', 'rest', 'graphql', 'soap', 'rpc', 'websocket', 'sse', 'webhook', 'cron', 'job', 'task', 'worker', 'queue', 'stream', 'event', 'message', 'notification', 'email', 'sms', 'push', 'chat', 'forum', 'blog', 'cms', 'ecommerce', 'marketplace', 'social', 'network', 'platform', 'saas', 'paas', 'iaas', 'faas', 'baas', 'mbaas', 'dbaas', 'caas', 'maas', 'haas', 'xaas'];
        if (reservedNames.includes(projectDir.toLowerCase())) {
          errors.push('Project directory name is reserved');
        }

        // Check for empty or whitespace-only names
        if (!projectDir.trim()) {
          errors.push('Project directory name cannot be empty');
        }

        // Check for overly long names
        if (projectDir.length > 255) {
          errors.push('Project directory name is too long');
        }
      }

      // Check template validation
      if (commandOptions[TERMINOLOGY.OPTION.TEMPLATE]) {
        const template = commandOptions[TERMINOLOGY.OPTION.TEMPLATE];

        // Check for path traversal in template (but allow absolute paths for local templates)
        if (template.includes('../') || template.includes('..\\')) {
          errors.push('Path traversal attempts are not allowed in template paths');
        }

        // Check for invalid characters in template name (spaces, special chars, etc.)
        if (template.includes(' ') || template.includes('!') || template.includes('@') ||
            template.includes('$') || template.includes('%') || template.includes('^') || template.includes('&') ||
            template.includes('*') || template.includes('(') || template.includes(')') || template.includes('+') ||
            template.includes('=') || template.includes('{') || template.includes('}') || template.includes('[') ||
            template.includes(']') || template.includes('|') || template.includes('\\') || template.includes(':') ||
            template.includes('"') || template.includes("'") || template.includes('<') ||
            template.includes('>') || template.includes(',') || template.includes('?')) {
          errors.push('Template name contains invalid characters');
        }        // Check for empty template
        if (!template.trim()) {
          errors.push('Template name cannot be empty');
        }

        // Check for overly long template names
        if (template.length > 255) {
          errors.push('Template name segment is too long');
        }
      }

      // Check branch validation
      if (commandOptions[TERMINOLOGY.OPTION.BRANCH]) {
        const branch = commandOptions[TERMINOLOGY.OPTION.BRANCH];

        try {
          sanitizeBranchName(branch);
        } catch (error) {
          errors.push(`Branch name validation failed: ${error.message}`);
        }
      }

      // Check placeholder validation
      // Note: Placeholder validation happens at runtime, not argument parsing time
      // because we need to know what placeholders are required by the template

      // Check cache TTL validation
      if (commandOptions['cache-ttl'] !== undefined) {
        const ttlValue = commandOptions['cache-ttl'];
        const ttlNum = parseInt(ttlValue, 10);
        if (isNaN(ttlNum) || ttlNum < 0) {
          errors.push('Cache TTL must be a non-negative integer');
        }
      }

      // Check for conflicting cache flags
      if (commandOptions['no-cache'] && commandOptions['cache-ttl'] !== undefined) {
        errors.push('Cannot use both --no-cache and --cache-ttl');
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }
    }
  },

  [TERMINOLOGY.COMMAND.LIST]: {
    description: 'List available templates',
    detailedDescription: 'Display all available templates from configured sources including local templates, GitHub favorites, and registered template collections.',
    options: {
      [TERMINOLOGY.OPTION.REGISTRY]: {
        type: 'string',
        description: 'Registry to list templates from',
        detailedDescription: 'Specify which template registry to list templates from. Registries are defined in your configuration file.',
        examples: ['official', 'favorites', 'local']
      },
      [TERMINOLOGY.OPTION.VERBOSE]: HELP_PATTERNS.VERBOSE_MODE,
      format: {
        type: 'string',
        description: 'Output format',
        detailedDescription: 'Specify the output format for the template list. Supported formats: table (default), json, csv.',
        default: 'table',
        examples: ['table', 'json', 'csv']
      }
    }
  },

  [TERMINOLOGY.COMMAND.VALIDATE]: {
    description: 'Validate template configuration',
    detailedDescription: 'Check template.json files and template configurations for correctness, completeness, and best practices.',
    options: {
      [TERMINOLOGY.OPTION.PATH]: HELP_PATTERNS.INPUT_FILE,
      suggest: {
        type: 'boolean',
        description: 'Show intelligent fix suggestions',
        detailedDescription: 'Display detailed suggestions for fixing validation errors and improving template configurations.',
        disclosureLevel: 'basic'
      },
      fix: {
        type: 'boolean',
        description: 'Auto-apply safe fixes',
        detailedDescription: 'Automatically apply safe, non-destructive fixes to template files.',
        disclosureLevel: 'basic'
      }
    }
  },
  help: {
    description: 'Show help information',
    detailedDescription: 'Display help information for commands. Use "help <command>" for detailed help or "<command> --help" for a quick option reference.',
    options: {}
  }
};
