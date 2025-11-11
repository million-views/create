#!/usr/bin/env node

import fs from 'fs/promises';
import { realpathSync, readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArguments, validateArguments, generateHelpText, ArgumentError } from './argument-parser.mjs';
import {
  validateAllInputs,
  sanitizeErrorMessage,
  createSecureTempDir,
  sanitizePath,
  ValidationError,
} from '../../lib/shared/security.mjs';
import {
  runAllPreflightChecks,
  PreflightError
} from './preflight-checks.mjs';
import { createEnvironmentObject } from './environment-factory.mjs';
import { CacheManager } from './cache-manager.mjs';
import { TemplateResolver } from './template-resolver.mjs';
import { Logger } from '../../lib/shared/utils/logger.mjs';
import { TemplateDiscovery } from './template-discovery.mjs';
import { DryRunEngine } from './dry-run-engine.mjs';
import { execCommand } from '../../lib/shared/utils/command-utils.mjs';
import { ensureDirectory, safeCleanup, validateDirectoryExists } from '../../lib/shared/utils/fs-utils.mjs';
import { loadSetupScript, createSetupTools, SetupSandboxError } from './setup-runtime.mjs';
import { shouldIgnoreTemplateEntry, createTemplateIgnoreSet, stripIgnoredFromTree } from '../../lib/shared/utils/template-ignore.mjs';
import { loadTemplateMetadataFromPath } from './template-metadata.mjs';
import { normalizeOptions } from './options-processor.mjs';
import { resolvePlaceholders, PlaceholderResolutionError } from './placeholder-resolver.mjs';
import { InteractiveSession } from './interactive-session.mjs';
import { shouldEnterInteractive } from '../../lib/shared/utils/interactive-utils.mjs';
import { createConfigManager } from '../../lib/cli/config-manager.mjs';
import {
  handleError,
  contextualizeError,
  ErrorMessages,
  ErrorContext
} from '../../lib/shared/utils/error-handler.mjs';

// Import validation classes for new schema validation
import { SelectionValidator } from '../../lib/validation/selection-validator.mjs';

// Import template validation functions
import { runTemplateValidation, formatValidationResults, formatValidationResultsAsJson } from './template-validation.mjs';

// Import guided setup workflow
import { GuidedSetupWorkflow } from './guided-setup-workflow.mjs';

// Default configuration
const DEFAULT_REPO = 'million-views/packages';
const DEFAULT_REGISTRY = 'git@github.com:million-views/templates.git';
const SETUP_SCRIPT = '_setup.mjs';
const DEFAULT_AUTHOR_ASSETS_DIR = '__scaffold__';

/**
 * Validate user selections against template constraints using SelectionValidator
 * @param {object} params - Validation parameters
 * @param {string} params.templatePath - Path to template directory
 * @param {string} params.templateName - Name of the template
 * @param {object} params.optionsByDimension - Normalized user options by dimension
 * @param {object} params.metadata - Template metadata
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, derived: object}>}
 */
async function validateUserSelections({ templatePath, templateName, optionsByDimension, metadata }) {
  try {
    // Load template.json from template directory
    const templateJsonPath = path.join(templatePath, 'template.json');
    let templateData;

    try {
      templateData = JSON.parse(readFileSync(templateJsonPath, 'utf8'));
    } catch (error) {
      // If template.json doesn't exist or is invalid, skip selection validation
      // This maintains backward compatibility with older templates
      return {
        valid: true,
        errors: [],
        warnings: [{
          type: 'COMPATIBILITY_WARNING',
          message: 'Template does not use new schema validation (template.json not found or invalid)',
          path: []
        }],
        derived: {}
      };
    }

    // Create selection object from user choices
    const selectionData = {
      schemaVersion: '1.0.0',
      templateId: templateData.id || `${templateName}/unknown`,
      version: templateData.version || '1.0.0',
      selections: {}
    };

    // Map user options to selection format
    for (const [dimensionName, dimensionValue] of Object.entries(optionsByDimension)) {
      if (dimensionName === 'features') {
        // Features are stored as array
        selectionData.selections[dimensionName] = Array.isArray(dimensionValue) ? dimensionValue : [dimensionValue];
      } else {
        // Other dimensions are stored as single values
        selectionData.selections[dimensionName] = dimensionValue;
      }
    }

    // Add project metadata if available
    if (metadata?.name) {
      selectionData.project = {
        name: metadata.name,
        packageManager: 'npm' // Default, could be enhanced to detect from context
      };
    }

    // Validate selection against template
    const validator = new SelectionValidator();
    // For validation, construct a template object with processed dimensions
    const templateForValidation = {
      ...templateData,
      dimensions: metadata.dimensions
    };
    const result = await validator.validate(selectionData, templateForValidation);

    return result;
  } catch (error) {
    return {
      valid: false,
      errors: [{
        type: 'VALIDATION_ERROR',
        message: `Selection validation failed: ${error.message}`,
        path: []
      }],
      warnings: [],
      derived: {}
    };
  }
}

// Import command router
import { routeCommand } from './command-router.mjs';

// Import terminology
import { TERMINOLOGY } from '../../lib/shared/ontology.mjs';

/**
 * Main entry point for the create-scaffold CLI tool
 * Now supports hierarchical commands with backward compatibility
 */
async function main() {
  try {
    // Parse arguments using native Node.js parseArgs
    const args = parseArguments();

    // Check if this is a command-based invocation
    const firstArg = process.argv[2]; // First argument after 'create-scaffold'

    // List of valid commands
    const validCommands = [TERMINOLOGY.COMMAND.NEW, TERMINOLOGY.COMMAND.LIST, TERMINOLOGY.COMMAND.INFO, TERMINOLOGY.COMMAND.VALIDATE];

    if (firstArg && validCommands.includes(firstArg)) {
      // Use new command routing
      const remainingArgs = process.argv.slice(3); // Arguments after command
      
      // Parse arguments for the command using a simple flag parser
      const commandArgs = {};
      for (let i = 0; i < remainingArgs.length; i++) {
        const arg = remainingArgs[i];
        if (arg.startsWith('--')) {
          const flagName = arg.slice(2);
          if (flagName === 'placeholder') {
            // Handle multiple placeholder values
            if (!commandArgs[flagName]) {
              commandArgs[flagName] = [];
            }
            if (i + 1 < remainingArgs.length && !remainingArgs[i + 1].startsWith('-')) {
              commandArgs[flagName].push(remainingArgs[i + 1]);
              i++; // Skip the value
            }
          } else if (i + 1 < remainingArgs.length && !remainingArgs[i + 1].startsWith('-')) {
            commandArgs[flagName] = remainingArgs[i + 1];
            i++; // Skip the value
          } else {
            commandArgs[flagName] = true;
          }
        }
      }
      
      // Extract positional arguments (non-flag arguments)
      const positionalArgs = [];
      let i = 0;
      while (i < remainingArgs.length) {
        const arg = remainingArgs[i];
        if (arg.startsWith('-')) {
          // Skip flags and their values
          if (arg.includes('=')) {
            // --flag=value format
            i++;
          } else {
            // --flag value format
            i++;
            // Check if next arg exists and doesn't start with -
            if (i < remainingArgs.length && !remainingArgs[i].startsWith('-')) {
              i++; // Skip the value
            }
          }
        } else {
          // Positional argument
          positionalArgs.push(arg);
          i++;
        }
      }
      
      const exitCode = await routeCommand(firstArg, positionalArgs, commandArgs);
      process.exit(exitCode);
    }

    // Backward compatibility: handle old-style invocations
    // Show deprecation warning for old usage
    // If the first argument is a non-option (doesn't start with '-') and
    // is not a known command, treat it as an unknown command and exit
    // with an error. If the invocation starts with an option (e.g.
    // `--template`), fall through to argument validation logic below.
    if (firstArg && !firstArg.startsWith('-') && !validCommands.includes(firstArg)) {
      console.error(`❌ Unknown command: ${firstArg}`);
      console.error('');
      console.log(generateHelpText());
      process.exit(1);
    }

    // Validate arguments before proceeding
    const validation = validateArguments(args);
    console.error('DEBUG: validation result:', validation);

    // Show help if requested or if validation failed
    if (validation.showHelp || args[TERMINOLOGY.OPTION.HELP] || args['help-intermediate'] || args['help-advanced'] || args['help-interactive']) {
      // Import the help generator dynamically
      const { generateHelp } = await import('../../lib/cli/help-generator.mjs');

      let disclosureLevel = 'basic';
      let interactive = false;

      if (args['help-advanced']) {
        disclosureLevel = 'advanced';
      } else if (args['help-intermediate']) {
        disclosureLevel = 'intermediate';
      }

      if (args['help-interactive']) {
        interactive = true;
      }

      // Use the enhanced help generator
      const helpText = generateHelp({
        toolName: '@m5nv/create-scaffold',
        description: 'Project scaffolding CLI for Million Views templates',
        commands: {
          new: {
            description: 'Create a new project from a template',
            usage: '<project-directory>',
            disclosureLevel: 'basic',
            options: {
              template: {
                type: 'string',
                short: 'T',
                description: 'Template URL or shorthand',
                required: true,
                examples: ['favorites/react-spa', 'user/repo', './local/template']
              },
              branch: {
                type: 'string',
                short: 'b',
                description: 'Git branch to use',
                default: 'main'
              },
              ide: {
                type: 'string',
                description: 'Target IDE for customization',
                examples: ['vscode', 'cursor', 'kiro']
              },
              options: {
                type: 'string',
                description: 'Contextual options for template customization',
                examples: ['typescript', 'monorepo', 'testing-focused']
              }
            },
            examples: [
              'my-app --template favorites/react-spa',
              'my-api --template favorites/express-api --options typescript,mvp',
              'my-project --template ./local-templates/custom --ide vscode'
            ],
            related: ['info', 'validate']
          },
          list: {
            description: 'List available templates and registries',
            disclosureLevel: 'basic',
            options: {
              registry: {
                type: 'string',
                description: 'Registry name to list templates from'
              }
            },
            examples: [
              '',
              '--registry favorites',
              '--registry company'
            ],
            related: ['info']
          },
          info: {
            description: 'Show detailed information about a template',
            usage: '<template>',
            disclosureLevel: 'intermediate',
            options: {
              registry: {
                type: 'string',
                description: 'Registry to search in'
              }
            },
            examples: [
              'favorites/react-spa',
              'react-app --registry favorites'
            ],
            related: ['list', 'validate']
          },
          validate: {
            description: 'Validate a template directory',
            usage: '<template-path>',
            disclosureLevel: 'intermediate',
            options: {
              json: {
                type: 'boolean',
                description: 'Output results in JSON format'
              }
            },
            examples: [
              './my-template',
              './templates/custom --json'
            ],
            related: ['new']
          }
        },
        globalOptions: {
          help: { type: 'boolean', short: 'h', description: 'Show help information', disclosureLevel: 'basic' },
          'help-intermediate': { type: 'boolean', description: 'Show intermediate help with additional options', disclosureLevel: 'basic' },
          'help-advanced': { type: 'boolean', description: 'Show advanced help with all options and details', disclosureLevel: 'basic' },
          'help-interactive': { type: 'boolean', description: 'Launch interactive help mode', disclosureLevel: 'basic' },
          version: { type: 'boolean', short: 'v', description: 'Show version information', disclosureLevel: 'basic' },
          verbose: { type: 'boolean', description: 'Enable verbose logging', disclosureLevel: 'basic' },
          'no-config': { type: 'boolean', description: 'Disable configuration file discovery', disclosureLevel: 'intermediate' },
          'log-file': { type: 'string', description: 'Log output to specified file', disclosureLevel: 'intermediate' }
        },
        examples: [
          '# Create a new project',
          'npm create @m5nv/scaffold my-app -- --template react-app',
          'npx @m5nv/create-scaffold new my-app --template react-app',
          '',
          '# List available templates',
          'create-scaffold list',
          'create-scaffold list --registry official',
          '',
          '# Get template information',
          'create-scaffold info react-app',
          '',
          '# Validate a template',
          'create-scaffold validate ./my-template',
          '',
          '# Legacy usage (deprecated)',
          'create-scaffold my-app --template react-app'
        ],
        disclosureLevel,
        interactive,
        command: args.command,
        commandOptions: args.commandOptions,
        context: {
          currentDirectory: process.cwd()
        }
      });

      console.log(helpText);
      process.exit(0);
    }

    // Handle validation errors
    if (!validation.isValid) {
      const errorMessage = validation.errors.length > 0
        ? `Invalid command arguments:\n${validation.errors.map(err => `  • ${err}`).join('\n')}`
        : 'Invalid command arguments';
      const argError = new ArgumentError(errorMessage, {
        suggestions: [
          'Use --help to see correct usage',
          'Check that all required arguments are provided',
          'Verify argument formats match the documentation'
        ]
      });
      handleError(argError, { operation: 'argument_validation', exit: true });
    }

    // Load configuration early for early exit modes that might need it
    let configMetadata = null;
    try {
      const configManager = createConfigManager({
        toolName: 'create-scaffold',
        toolConfigKey: 'create-scaffold',
        envPrefix: 'CREATE_SCAFFOLD',
        configFileName: '.m5nvrc',
        migrationSupport: true,
        defaults: {}
      });

      const configDefaults = await configManager.load();

      if (configDefaults && Object.keys(configDefaults).length > 0) {
        configMetadata = {
          path: configManager.globalConfigDir, // Use global config dir as primary location
          providedKeys: Object.keys(configDefaults),
          appliedKeys: Object.keys(configDefaults),
          author: configDefaults.author ?? null,
          placeholders: Array.isArray(configDefaults.placeholders)
            ? configDefaults.placeholders
            : [],
          defaults: configDefaults
        };
      }
    } catch (error) {
      // For early exit modes, configuration errors should cause failure
      if (args.listTemplates || args.validateTemplate) {
        console.error(`❌ Configuration error: ${error.message}`);
        process.exit(1);
      }
      // For other modes, just log and continue
      console.error(`Warning: Failed to load configuration: ${error.message}`);
    }

    if (args.listTemplates) {
      const exitCode = await executeListTemplates({
        jsonOutput: Boolean(args.json),
        registryName: args.registry,
        config: configMetadata
      });
      process.exit(exitCode);
    }

    if (args.validateTemplate) {
      const exitCode = await executeTemplateValidation({
        targetPath: args.validateTemplate,
        jsonOutput: Boolean(args.json)
      });
      process.exit(exitCode);
    }

    // Initialize cache manager and logger
    const cacheManager = new CacheManager();
    const logger = args['log-file'] ? new Logger('file', 'info', args['log-file']) : null;

    // Configuration already loaded above for early exit modes

    // Template resolution logic - handle different template input types
    let templatePath, templateName, repoUrl, branchName, metadata;
    let allowFallback = false;

    // First, check if the template is a registry alias and resolve it
    let resolvedTemplate = args.template;
    if (args.template && !args.template.includes('://') && !args.template.startsWith('/') && !args.template.startsWith('./') && !args.template.startsWith('../')) {
      const tempResolver = new TemplateResolver(cacheManager, configMetadata);
      resolvedTemplate = tempResolver.resolveRegistryAlias(args.template);
    }

    if (args.template) {
            // Process template URL
      // Handle different template input types
      if (args.template.startsWith('/') || args.template.startsWith('./') || args.template.startsWith('../') || 
          (resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../'))) {
        console.error('DEBUG: Taking local path branch');
        // Direct template directory path - validate for security (prevent path traversal)
        const templateToUse = (resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../')) 
          ? resolvedTemplate 
          : args.template;
        if (templateToUse.includes('..')) {
          handleError(new ValidationError('Path traversal attempts are not allowed in template paths', 'template'), { operation: 'template_validation', exit: true });
        }
        templatePath = templateToUse;
        templateName = path.basename(templateToUse);
        repoUrl = path.dirname(templateToUse);
        branchName = null;
        allowFallback = false; // Local paths should not fallback
      } else if (resolvedTemplate.includes('://') || resolvedTemplate.includes('#')) {
        // Template URL (including resolved registry aliases) or URL with branch syntax - use TemplateResolver
        const templateResolver = new TemplateResolver(cacheManager, configMetadata);
        const templateResolution = await templateResolver.resolveTemplate(resolvedTemplate, {
          branch: args.branch,
          logger
        });
        templatePath = templateResolution.templatePath;
        templateName = path.basename(templatePath);
        repoUrl = resolvedTemplate;
        branchName = args.branch;
        allowFallback = false; // URLs should not fallback
      } else {
        console.error('DEBUG: Taking repository shorthand branch');
        // Repository shorthand - assume it's a template name in default repo
        const repoUrlResolved = args.repo || DEFAULT_REPO;
        const branchNameResolved = args.branch;
        const cachedRepoPath = await ensureRepositoryCached(
          repoUrlResolved,
          branchNameResolved,
          cacheManager,
          logger,
          { ttlHours: args.cacheTtl }
        );
        templatePath = path.join(cachedRepoPath, args.template);
        templateName = args.template;
        repoUrl = repoUrlResolved;
        branchName = branchNameResolved;
        allowFallback = true; // Repository templates should fallback
      }
    } else {
      // No template specified - this will be handled by the guided workflow
      templatePath = null;
      templateName = null;
      repoUrl = args.repo || DEFAULT_REPO;
      branchName = args.branch;
      allowFallback = true; // No template specified should allow fallback
    }

    // Load template metadata if we have a template path
    if (templatePath) {
      metadata = await loadTemplateMetadata(templatePath, logger);
    }

    // Prepare options and placeholders
    let options = {};
    let placeholders = {};

    if (args.options && metadata) {
      const normalizedOptionResult = normalizeOptions({
        rawTokens: Array.isArray(args.options) ? args.options : [args.options],
        dimensions: metadata.dimensions
      });
      options = normalizedOptionResult.byDimension;
    }

    if (args.placeholders && args.experimentalPlaceholderPrompts && metadata) {
      const placeholderDefinitions = Array.isArray(metadata.placeholders) ? metadata.placeholders : [];
      if (placeholderDefinitions.length > 0) {
        const resolution = await resolvePlaceholders({
          definitions: placeholderDefinitions,
          flagInputs: args.placeholders,
          configDefaults: configMetadata?.placeholders ?? [],
          env: process.env,
          interactive: false,
          noInputPrompts: args.noInputPrompts
        });
        placeholders = resolution.values;
      }
    }

    // Handle dry-run mode
    if (args.dryRun) {
      if (!templatePath || !templateName) {
        throw ErrorMessages.validationFailed('--dry-run', 'requires a template to be specified');
      }

      const dryRunEngine = new DryRunEngine(cacheManager, logger);
      let preview;

      // Check if this is a local template directory (templatePath is set and repoUrl is local)
      if (templatePath && repoUrl && (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl === '.')) {
        // For local template directories, use previewScaffoldingFromPath directly
        preview = await dryRunEngine.previewScaffoldingFromPath(templatePath, args.projectDirectory);
      } else if (repoUrl) {
        // Otherwise, use previewScaffolding for remote repositories
        preview = await dryRunEngine.previewScaffolding(repoUrl, branchName || 'main', templateName, args.projectDirectory);
      } else {
        // For local template paths without repoUrl, use previewScaffoldingFromPath
        const repoPath = path.dirname(templatePath);
        preview = await dryRunEngine.previewScaffoldingFromPath(repoPath, templateName, args.projectDirectory);
      }      // Display preview output
      console.log('🔍 DRY RUN - Preview Mode');
      console.log('================================');
      console.log(`Template: ${templateName}`);
      console.log(`Source: ${repoUrl}${branchName ? ` (${branchName})` : ''}`);
      console.log(`Target: ${args.projectDirectory}`);
      console.log('');

      console.log('📋 Operations Preview:');
      console.log(`• Files: ${preview.summary.fileCount}`);
      console.log(`• Directories: ${preview.summary.directoryCount}`);
      console.log(`• Total operations: ${preview.operations.length}`);
      console.log('');

      if (preview.operations.length > 0) {
        console.log('File Operations:');
        // Group operations by type
        const fileOps = preview.operations.filter(op => op.type === 'file_copy');
        const dirOps = preview.operations.filter(op => op.type === 'directory_create');

        if (dirOps.length > 0) {
          console.log('• Directory Creation:');
          for (const op of dirOps.slice(0, 5)) { // Show first 5
            console.log(`  • ${op.relativePath}`);
          }
          if (dirOps.length > 5) {
            console.log(`  ... and ${dirOps.length - 5} more directories`);
          }
        }

        if (fileOps.length > 0) {
          console.log('• File Copy:');
          // Group by directory for readability
          const byDir = {};
          for (const op of fileOps) {
            const dir = path.dirname(op.relativePath);
            if (!byDir[dir]) byDir[dir] = [];
            byDir[dir].push(path.basename(op.relativePath));
          }

          for (const [dir, files] of Object.entries(byDir)) {
            console.log(`  • ./${dir}/ (${files.length} files)`);
          }
        }
      }

      // Check for tree command availability
      const treeCommand = process.env.CREATE_SCAFFOLD_TREE_COMMAND || 'tree';
      try {
        if (treeCommand === 'tree') {
          await execCommand(treeCommand, ['--version'], { stdio: 'pipe' });
        } else if (treeCommand.endsWith('.js') || treeCommand.endsWith('.mjs')) {
          // For JS files, check if file exists
          await fs.access(treeCommand, fs.constants.F_OK);
        } else {
          // For other commands, check if they exist
          await execCommand('which', [treeCommand], { stdio: 'pipe' });
        }
        // Tree command available, show tree preview
        console.log('');
        console.log('Directory Structure Preview:');
        console.log('-----------------------------');
        let treeCmd, treeArgs;
        if (treeCommand === 'tree') {
          treeCmd = treeCommand;
          treeArgs = ['-a', '-I', '.git', templatePath];
        } else if (treeCommand.endsWith('.js') || treeCommand.endsWith('.mjs')) {
          // For JavaScript tree commands, execute with node
          treeCmd = 'node';
          treeArgs = [treeCommand, templatePath];
        } else {
          // For other custom tree commands, execute directly
          treeCmd = treeCommand;
          treeArgs = [templatePath];
        }
        const treeResult = await execCommand(treeCmd, treeArgs, { stdio: 'pipe' });
        const ignoreSet = createTemplateIgnoreSet();
        const filteredTreeResult = stripIgnoredFromTree(treeResult, ignoreSet);
        console.log(filteredTreeResult);
      } catch {
        console.log('');
        console.log(`Note: Tree command (${treeCommand}) is unavailable for directory structure preview`);
      }

      console.log('');
      console.log('✅ Dry run completed - no files were created or modified');

      // Wait for any pending log writes to complete
      if (logger) {
        await logger.writeQueue;
      }

      process.exit(0); // Exit dry-run mode without creating project
    }

    // Execute the guided workflow with all resolved parameters
    // Always use guided workflow as the default
    console.error('DEBUG: About to call workflow for project:', args.projectDirectory, 'template:', templatePath);
    console.error('DEBUG: Template path exists:', !!templatePath);
    console.error('DEBUG: Project directory:', args.projectDirectory);
    console.error('DEBUG: NODE_ENV:', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'test') {
      console.log('DEBUG: About to create GuidedSetupWorkflow with:', {
        projectDirectory: args.projectDirectory,
        templatePath,
        templateName,
        options: !!options,
        placeholders: !!placeholders,
        metadata: !!metadata
      });
    }
    const workflow = new GuidedSetupWorkflow({
      cacheManager,
      logger,
      promptAdapter: process.env.NODE_ENV === 'test' || !process.stdin.isTTY ? {
        write: (text) => process.stderr.write(text),
        question: async (question) => {
          // In test/non-interactive mode, provide default answers
          if (question.includes('project name') || question.includes('Project name')) {
            return args.projectDirectory || './tmp/test-project';
          }
          if (question.includes('template') || question.includes('Template')) {
            return templateName || 'basic';
          }
          if (question.includes('repository') || question.includes('Repository')) {
            return repoUrl || DEFAULT_REPO;
          }
          if (question.includes('Enter choice')) {
            return '1'; // Choose first option in menus
          }
          if (question.includes('cleanup option')) {
            return '1'; // Choose clean up option
          }
          // For other questions, provide empty string or skip
          return '';
        }
      } : {
        write: (text) => process.stdout.write(text),
        question: async (question) => {
          process.stdout.write(question);
          return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
              resolve(data.toString().trim());
            });
          });
        }
      },
      projectDirectory: args.projectDirectory,
      templatePath,
      templateName,
      repoUrl,
      branchName,
      options,
      ide: args.ide,
      placeholders,
      metadata
    });

    let result;
    try {
      result = await workflow.executeWorkflow();
    } catch (error) {
      result = {
        success: false,
        projectDirectory: args.projectDirectory,
        templateUsed: templateName,
        error: error.message
      };
    }

    if (logger) {
      await logger.logOperation('workflow_complete', {
        success: result.success,
        projectDirectory: result.projectDirectory,
        templateUsed: result.templateUsed
      });
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    // Use centralized error handling
    const contextualError = contextualizeError(error, {
      context: ErrorContext.RUNTIME,
      suggestions: [
        'Check the command syntax with --help',
        'Ensure all required arguments are provided',
        'Verify template and repository URLs are correct'
      ]
    });

    handleError(contextualError, { logger: null, operation: 'main_execution', exit: true });
  }
}

/**
 * Ensure repository is cached and return the cached path
 */
async function ensureRepositoryCached(repoUrl, branchName, cacheManager, logger, options = {}) {
  const ttlHours = typeof options.ttlHours === 'number' ? options.ttlHours : undefined;

  // Handle local repositories directly without caching
  if (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl.startsWith('~')) {
    const absolutePath = path.resolve(repoUrl);
    await validateDirectoryExists(absolutePath, 'Local repository path');

    if (logger) {
      await logger.logOperation('local_repo_access', {
        repoUrl,
        absolutePath
      });
    }

    return absolutePath;
  }

  const cachedRepoPath = await cacheManager.getCachedRepo(repoUrl, branchName);

  if (cachedRepoPath) {
    if (logger) {
      await logger.logOperation('cache_hit', {
        repoUrl,
        branchName,
        cachedPath: cachedRepoPath
      });
    }
    return cachedRepoPath;
  }

  const { repoHash, repoDir } = cacheManager.resolveRepoDirectory(repoUrl, branchName);
  const priorMetadata = await cacheManager.getCacheMetadata(repoHash);

  if (logger) {
    await logger.logOperation(priorMetadata ? 'cache_refresh' : 'cache_miss', {
      repoUrl,
      branchName,
      cachePath: repoDir
    });
  }

  try {
    const cachePath = await cacheManager.populateCache(repoUrl, branchName, {
      ttlHours
    });

    if (logger) {
      await logger.logOperation('cache_populate_complete', {
        repoUrl,
        branchName,
        cachedPath: cachePath
      });
    }

    return cachePath;
  } catch (error) {
    if (logger) {
      await logger.logError(error, {
        operation: 'cache_population',
        repoUrl,
        branchName
      });
    }
    throw error;
  }
}

async function loadTemplateMetadata(templatePath, logger) {
  try {
    const metadata = await loadTemplateMetadataFromPath(templatePath);

    if (logger) {
      await logger.logOperation('template_metadata', {
        templatePath,
        handoffCount: metadata.handoffSteps.length,
        authoringMode: metadata.authoringMode,
        dimensions: Object.keys(metadata.dimensions)
      });
    }

    return metadata;
  } catch (error) {
    // For CLI usage, validation errors should cause the command to fail
    // Re-throw validation errors instead of swallowing them
    throw error;
  }
}

/**
 * Clone the template repository using cache-aware operations
 */
async function cloneTemplateRepo(repoUrl, branchName, options = {}) {
  const { noCache, cacheTtl, cacheManager, logger } = options;

  if (logger) {
    await logger.logOperation('git_clone_start', {
      repoUrl,
      branchName,
      noCache: !!noCache,
      cacheTtl
    });
  }

  // If cache is disabled, use direct cloning
  if (noCache) {
    // ast-grep-ignore: no-console-log
    console.log('📥 Cloning template repository (cache disabled)...');
    const tempPath = await directCloneRepo(repoUrl, branchName, logger);
    return {
      path: tempPath,
      temporary: true
    };
  }

  // Use cache-aware repository access
  try {
    // ast-grep-ignore: no-console-log
    console.log('📥 Accessing template repository...');
    const cachedPath = await ensureRepositoryCached(
      repoUrl,
      branchName,
      cacheManager,
      logger,
      {
        ttlHours: cacheTtl
      }
    );

    return {
      path: cachedPath,
      temporary: false
    };
  } catch (error) {
    if (logger) {
      await logger.logError(error, {
        operation: 'git_clone_cached',
        repoUrl,
        branchName
      });
    }

    // Provide helpful error messages based on common issues
    const sanitizedErrorMessage = sanitizeErrorMessage(error.message);

    if (error.message.includes('Repository not found')) {
      throw new Error(
        `Repository not found.\n` +
        'Please check that:\n' +
        '  1. The repository exists\n' +
        '  2. You have access to it\n' +
        '  3. Your git credentials are configured correctly'
      );
    } else if (error.message.includes('branch') && branchName) {
      throw new Error(
        `Branch not found in repository.\n` +
        'Please check the branch name and try again.'
      );
    } else if (error.message.includes('Authentication failed') || error.message.includes('403')) {
      throw new Error(
        'Authentication failed.\n' +
        'Please ensure your git credentials are configured correctly.\n' +
        'For private repositories, you need to set up:\n' +
        '  - SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh\n' +
        '  - Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
      );
    } else if (error.message.includes('timed out')) {
      throw new Error(
        'Git clone operation timed out.\n' +
        'This may be due to:\n' +
        '  • Network connectivity issues\n' +
        '  • Large repository size\n' +
        '  • Repository server being slow or unavailable\n' +
        '  • Firewall or proxy blocking the connection\n\n' +
        'Please check your network connection and try again.'
      );
    } else {
      throw new Error(`Failed to access repository: ${sanitizedErrorMessage}`);
    }
  }
}

/**
 * Direct clone repository (fallback for --no-cache)
 */
async function directCloneRepo(repoUrl, branchName, logger) {
  const tempDir = createSecureTempDir();

  const cloneArgs = ['clone', '--depth', '1'];

  if (branchName) {
    cloneArgs.push('--branch', branchName);
  }

  // Convert user/repo format to full GitHub URL if needed
  let fullRepoUrl;
  if (repoUrl.startsWith('/') || repoUrl.startsWith('.') || repoUrl.startsWith('~')) {
    fullRepoUrl = repoUrl;
  } else if (repoUrl.includes('://')) {
    fullRepoUrl = repoUrl;
  } else {
    fullRepoUrl = `https://github.com/${repoUrl}.git`;
  }

  cloneArgs.push(fullRepoUrl, tempDir);

  try {
    await execCommand('git', cloneArgs, { timeout: 60000, stdio: ['inherit', 'pipe', 'pipe'] });

    if (logger) {
      await logger.logOperation('git_clone_direct', {
        repoUrl,
        branchName,
        tempDir,
        fullRepoUrl
      });
    }
  } catch (error) {
    // Clean up temp directory if clone failed
    await safeCleanup(tempDir);

    if (logger) {
      await logger.logError(error, {
        operation: 'git_clone_direct',
        repoUrl,
        branchName,
        tempDir
      });
    }

    throw error;
  }

  return tempDir;
}

/**
 * Verify that the template subdirectory exists
 */
async function verifyTemplate(templatePath, templateName) {
  try {
    await validateDirectoryExists(templatePath, `Template "${templateName}"`);
  } catch (error) {
    if (error.message.includes('not found')) {
      throw ErrorMessages.templateNotFound(templateName);
    }
    throw contextualizeError(error, {
      context: ErrorContext.TEMPLATE,
      userFriendlyMessage: `Failed to verify template "${templateName}"`
    });
  }
}

/**
 * Copy template files to project directory
 */
async function copyTemplate(templatePath, projectDirectory, logger, options = {}) {
  // ast-grep-ignore: no-console-log
  console.log('📋 Copying template files...');

  if (logger) {
    await logger.logOperation('file_copy_start', {
      templatePath,
      projectDirectory
    });
  }

  try {
    // Create project directory
    await ensureDirectory(projectDirectory, 0o755, 'project directory');

    // Copy all files from template to project directory
    const ignoreSet = options.ignoreSet ?? createTemplateIgnoreSet();
    await copyRecursive(templatePath, projectDirectory, logger, ignoreSet);

    // Remove .git directory if it exists in the copied template
    const gitDir = path.join(projectDirectory, '.git');
    await safeCleanup(gitDir);

    if (logger) {
      await logger.logOperation('file_copy_complete', {
        templatePath,
        projectDirectory
      });
    }

  } catch (err) {
    if (logger) {
      await logger.logError(err, {
        operation: 'file_copy',
        templatePath,
        projectDirectory
      });
    }

    const sanitizedMessage = sanitizeErrorMessage(err.message);
    throw new Error(`Failed to copy template: ${sanitizedMessage}`);
  }
}

/**
 * Recursively copy directory contents
 */
async function copyRecursive(src, dest, logger, ignoreSet) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  await ensureDirectory(dest, 0o755, 'destination directory');

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldIgnoreTemplateEntry(entry.name, ignoreSet)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath, logger, ignoreSet);
    } else {
      await fs.copyFile(srcPath, destPath);

      if (logger) {
        await logger.logFileCopy(srcPath, destPath);
      }
    }
  }
}

/**
 * Stage author-only assets inside the project directory so setup scripts can
 * consume snippets before the directory is removed from the final scaffold.
 */
async function stageAuthorAssets(templatePath, projectDirectory, authorAssetsDir, logger) {
  const normalizedDir = typeof authorAssetsDir === 'string' && authorAssetsDir.trim()
    ? authorAssetsDir.trim()
    : DEFAULT_AUTHOR_ASSETS_DIR;

  const source = path.join(templatePath, normalizedDir);
  let stats;
  try {
    stats = await fs.stat(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    return;
  }

  const destination = path.join(projectDirectory, normalizedDir);
  await fs.cp(source, destination, {
    recursive: true,
    force: true,
    filter: (src) => !shouldIgnoreTemplateEntry(path.basename(src))
  });

  if (logger) {
    await logger.logOperation('author_assets_staged', {
      templatePath,
      projectDirectory,
      authorAssetsDir: normalizedDir
    });
  }
}

/**
 * Remove staged author assets after setup completes so the generated project
 * remains clean.
 */
async function cleanupAuthorAssets(projectDirectory, authorAssetsDir, logger) {
  const normalizedDir = typeof authorAssetsDir === 'string' && authorAssetsDir.trim()
    ? authorAssetsDir.trim()
    : DEFAULT_AUTHOR_ASSETS_DIR;

  const target = path.join(projectDirectory, normalizedDir);
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  if (logger) {
    await logger.logOperation('author_assets_removed', {
      projectDirectory,
      authorAssetsDir: normalizedDir
    });
  }
}

async function executeTemplateValidation({ targetPath, jsonOutput }) {
  try {
    const result = await runTemplateValidation({ targetPath });

    if (jsonOutput) {
      // ast-grep-ignore: no-console-log
      console.log(formatValidationResultsAsJson(result));
    } else {
      // ast-grep-ignore: no-console-log
      console.log(formatValidationResults(result));
    }

    return result.status === 'fail' ? 1 : 0;
  } catch (error) {
    const message = sanitizeErrorMessage(error?.message ?? String(error));
    console.error(`❌ Template validation error: ${message}`);
    return 1;
  }
}

/**
 * Execute optional setup script if it exists
 */
async function executeSetupScript({ projectDirectory, projectName, ide, options, authoringMode, dimensions = {}, logger, inputs = Object.freeze({}), author = null }) {
  const setupScriptPath = path.join(projectDirectory, SETUP_SCRIPT);

  // Check if setup script exists
  try {
    await fs.access(setupScriptPath);
  } catch {
    // Setup script doesn't exist - this is fine
    return;
  }

  if (logger) {
    await logger.logOperation('setup_script_start', {
      setupScriptPath,
      projectDirectory,
      ide,
      options: options?.raw ?? []
    });
  }

  // eslint-disable-next-line no-unused-vars
  function printPlaceholderSummary(report) {
    if (!Array.isArray(report) || report.length === 0) {
      return;
    }

    // ast-grep-ignore: no-console-log
    console.log('🧩 Placeholder inputs:');
    for (const entry of report) {
      const source = entry.source ?? 'default';
      const sensitive = entry.sensitive === true;
      const valueDisplay = sensitive ? '[redacted]' : formatPlaceholderValue(entry.value);
      const sensitiveNote = sensitive ? ' (sensitive)' : '';
      const valueSuffix = sensitive ? ' [redacted]' : valueDisplay ? ` (${valueDisplay})` : '';
      // ast-grep-ignore: no-console-log
      console.log(`  ${entry.token} ← ${source}${sensitiveNote}${valueSuffix}`);
    }
    // ast-grep-ignore: no-console-log
    console.log('');
  }

  function formatPlaceholderValue(value) {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  // Setup script exists, ensure it gets cleaned up regardless of what happens
  try {
    // ast-grep-ignore: no-console-log
    console.log('⚙️  Running template setup script...');

    // Import and execute the setup script
    const ctx = createEnvironmentObject({
      projectDirectory,
      projectName,
      cwd: process.cwd(),
      ide,
      options,
      authoringMode,
      inputs,
      author
    });

    const tools = await createSetupTools({
      projectDirectory,
      projectName,
      logger,
      context: ctx,
      dimensions
    });

    await loadSetupScript(setupScriptPath, ctx, tools, logger);

    if (logger) {
      await logger.logSetupScript(setupScriptPath, 'success', 'Setup script executed successfully');
    }

  } catch (err) {
    if (logger) {
      await logger.logSetupScript(setupScriptPath, 'failed', err.message);
      await logger.logError(err, {
        operation: 'setup_script_execution',
        setupScriptPath,
        projectDirectory
      });
    }

    let message = err.message;
    if (err instanceof SetupSandboxError) {
      message = err.message;
    } else {
      message = sanitizeErrorMessage(message);
    }

    console.warn(`⚠️  Warning: Setup script execution failed: ${message}`);
    console.warn('Continuing without setup...');
  } finally {
    // Remove the setup script after execution attempt (success or failure)
    try {
      await fs.unlink(setupScriptPath);

      if (logger) {
        await logger.logOperation('setup_script_cleanup', {
          setupScriptPath,
          removed: true
        });
      }
    } catch {
      // Ignore cleanup errors - setup script may have already been removed
      // or there may be permission issues, but we don't want to fail the entire process
      if (logger) {
        await logger.logOperation('setup_script_cleanup', {
          setupScriptPath,
          removed: false,
          reason: 'cleanup_failed'
        });
      }
    }
  }
}

async function listDefaultRegistryTemplates(cacheManager) {
  try {
    const templateDiscovery = new TemplateDiscovery(cacheManager);
    const templates = await templateDiscovery.listTemplates(DEFAULT_REGISTRY, 'main');
    return templates.map(template => ({
      name: template.name,
      description: template.description || `Template from default registry`,
      version: template.version || 'N/A'
    }));
  } catch (error) {
    // If default registry is unreachable, return empty array
    console.warn(`Warning: Could not load default registry: ${error.message}`);
    return [];
  }
}

async function executeListTemplates({ jsonOutput, registryName, config }) {
  try {
    // Initialize cache manager for template discovery
    const cacheManager = new CacheManager();
    const templateDiscovery = new TemplateDiscovery(cacheManager);

    let templates;

    if (registryName) {
      // List templates from specific registry
      const registries = config?.defaults?.registries;
      if (registries && typeof registries === 'object' && registries[registryName]) {
        // List templates from registry
        const registry = registries[registryName];
        templates = Object.keys(registry).map(name => ({
          name,
          description: `Template from ${registryName} registry`,
          version: 'N/A'
        }));
      } else {
        throw ErrorMessages.configError(`Registry '${registryName}'`, 'Registry not found in configuration');
      }
    } else {
      // List all available registries
      const registries = config?.defaults?.registries;
      if (registries && typeof registries === 'object') {
        const registryNames = Object.keys(registries);
        if (registryNames.length > 0) {
          templates = registryNames.map(name => ({
            name,
            description: `Registry with ${Object.keys(registries[name]).length} templates`,
            version: 'N/A'
          }));
        } else {
          // No user-defined registries, fall back to default registry
          templates = await listDefaultRegistryTemplates(cacheManager);
        }
      } else {
        // No config at all, fall back to default registry
        templates = await listDefaultRegistryTemplates(cacheManager);
      }
    }

    if (jsonOutput) {
      // ast-grep-ignore: no-console-log
      const source = registryName ? `registry: ${registryName}` : 'all registries';
      console.log(JSON.stringify({
        source,
        templates: templates.map(t => ({
          name: t.name,
          description: t.description,
          version: t.version
        }))
      }, null, 2));
    } else {
      const source = registryName ? `registry: ${registryName}` : 'all registries';
      let sourceDisplay;
      try {
        sourceDisplay = `from ${source}`;
      } catch {
        sourceDisplay = `from ${source}`;
      }
      // ast-grep-ignore: no-console-log
      console.log(`📦 Available templates ${sourceDisplay}:\n`);

      if (templates.length === 0) {
        // ast-grep-ignore: no-console-log
        console.log('No templates found.');
        return 0;
      }

      for (const template of templates) {
        // ast-grep-ignore: no-console-log
        console.log(`• ${template.name}`);
        if (template.description) {
          // ast-grep-ignore: no-console-log
          console.log(`  ${template.description}`);
        }
        // ast-grep-ignore: no-console-log
        console.log('');
      }
    }

    return 0;
  } catch (error) {
    const message = sanitizeErrorMessage(error?.message ?? String(error));
    console.error(`❌ Failed to list templates: ${message}`);
    return 1;
  }
}

// Run main function when executed directly
const entryPoint = process.argv[1];
if (entryPoint) {
  const modulePath = fileURLToPath(import.meta.url);
  const resolvedEntry = path.resolve(entryPoint);
  let realEntry = resolvedEntry;

  try {
    realEntry = realpathSync(resolvedEntry);
  } catch {
    // Ignore resolution failures; fall back to resolvedEntry comparison below.
  }

  if (modulePath === resolvedEntry || modulePath === realEntry) {
    main().catch(async (error) => {
      const { handleError } = await import('../../lib/shared/utils/error-handler.mjs');
      handleError(error, { operation: 'main_execution' });
    });
  }
}