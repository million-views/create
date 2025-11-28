// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import { SecurityGate } from '@m5nv/create/lib/security/gate.mts';
import { CacheManager } from '../../modules/cache-manager.mts';
import { TemplateResolver } from '../../modules/template-resolver.mts';
import { Logger } from '@m5nv/create/lib/util/logger.mts';
import { DryRunEngine } from '../../modules/dry-run-engine.mts';
import { Shell } from '@m5nv/create/lib/util/shell.mts';
import { File } from '@m5nv/create/lib/util/file.mts';
import { createTemplateIgnoreSet, stripIgnoredFromTree } from '@m5nv/create/lib/template/ignore.mts';
import { loadTemplateMetadataFromPath } from '@m5nv/create/lib/template/discover.mts';
import { normalizeOptions } from '../../modules/options-processor.mts';
import { resolvePlaceholders } from '@m5nv/create/lib/placeholder/resolve.mts';
import { loadConfig } from '../../modules/config-loader.mts';
import { handleError, contextualizeError } from '@m5nv/create/lib/error/handler.mts';
import { ErrorContext } from '@m5nv/create/lib/error/handler.mts';

// Import guided setup workflow
import { GuidedSetupWorkflow } from '../../modules/guided-setup-workflow.mts';

const DEFAULT_REPO = 'million-views/packages';

export class Scaffolder {
  #securityGate = new SecurityGate();

  constructor(options) {
    this.options = options;
    this.cacheManager = new CacheManager();
    this.logger = options.logFile ? new Logger('file', 'info', options.logFile) : Logger.getInstance();
  }

  async scaffold() {
    try {
      // Load configuration early for early exit modes that might need it
      let configMetadata = null;
      try {
        const configResult = await loadConfig({
          cwd: process.cwd(),
          env: process.env,
          skip: Boolean(this.options.config === false)
        });

        if (configResult) {
          configMetadata = {
            path: configResult.path,
            providedKeys: [],
            appliedKeys: [],
            author: configResult.defaults?.author ?? null,
            placeholders: Array.isArray(configResult.defaults?.placeholders)
              ? configResult.defaults.placeholders
              : [],
            defaults: configResult.defaults
          };
        }
      } catch (error) {
        // For other modes, just log and continue
        console.error(`Warning: Failed to load configuration: ${error.message}`);
      }

      // SECURITY LAYER 1: SecurityGate validation (architectural boundary)
      // Note: template is optional (guided mode), only projectName required
      const validated = await this.#securityGate.enforce(this.options, {
        command: 'scaffold',
        requiredFields: ['projectName'],
        timestamp: Date.now()
      });

      // Validate project directory early
      const resolvedProjectDirectory = path.resolve(validated.projectName);
      try {
        const entries = await fs.readdir(resolvedProjectDirectory);
        if (entries.length > 0) {
          // Check if it's just our workflow state file
          const WORKFLOW_STATE_FILE = '.create-scaffold-workflow.json';
          const nonStateFiles = entries.filter(file => file !== WORKFLOW_STATE_FILE);
          if (nonStateFiles.length > 0) {
            throw new Error(`Project directory is not empty`);
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // Directory doesn't exist, which is fine - we'll create it
      }

      // Template resolution logic - handle different template input types
      let templatePath, templateName, repoUrl, branchName, metadata, templateResolution;
      let _allowFallback = false;

      // First, check if the template is a registry alias and resolve it
      let resolvedTemplate = validated.template;
      if (validated.template && !validated.template.includes('://') && !validated.template.startsWith('/') && !validated.template.startsWith('./') && !validated.template.startsWith('../')) {
        const tempResolver = new TemplateResolver(this.cacheManager, configMetadata);
        resolvedTemplate = tempResolver.resolveRegistryAlias(validated.template);
      }

      if (validated.template) {
        // Process template URL
        // Handle different template input types
        if (validated.template.startsWith('/') || validated.template.startsWith('./') || validated.template.startsWith('../') ||
          resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../')) {
          // Direct template directory path
          const templateToUse = (resolvedTemplate.startsWith('/') || resolvedTemplate.startsWith('./') || resolvedTemplate.startsWith('../'))
            ? resolvedTemplate
            : validated.template;
          templatePath = templateToUse;
          templateName = path.basename(templateToUse);
          repoUrl = path.dirname(templateToUse);
          branchName = null;
          _allowFallback = false; // Local paths should not fallback
        } else if (resolvedTemplate.includes('://') || resolvedTemplate.includes('#') || resolvedTemplate.includes('/')) {
          // Template URL, URL with branch syntax, or repo/template shorthand - use TemplateResolver
          const templateResolver = new TemplateResolver(this.cacheManager, configMetadata);
          templateResolution = await templateResolver.resolveTemplate(resolvedTemplate, {
            logger: this.logger
          });
          templatePath = templateResolution.templatePath;
          templateName = path.basename(templatePath);
          repoUrl = resolvedTemplate;
          branchName = null; // Branch will be determined by TemplateResolver from URL
          _allowFallback = false; // URLs and repo/template specs should not fallback
        } else {
          // Repository shorthand - assume it's a template name in default repo
          const repoUrlResolved = DEFAULT_REPO;
          const branchNameResolved = 'main'; // Default branch
          const cachedRepoPath = await this.ensureRepositoryCached(
            repoUrlResolved,
            branchNameResolved,
            {
              ttlHours: this.options.cacheTtl ? parseInt(this.options.cacheTtl, 10) : undefined
            }
          );
          templatePath = path.join(cachedRepoPath, validated.template);
          templateName = validated.template;
          repoUrl = repoUrlResolved;
          branchName = branchNameResolved;
          _allowFallback = true; // Repository templates should fallback
        }
      } else {
        // No template specified - this will be handled by the guided workflow
        templatePath = null;
        templateName = null;
        repoUrl = DEFAULT_REPO;
        branchName = 'main'; // Default branch
        _allowFallback = true; // No template specified should allow fallback
      }

      // Load template metadata if we have a template path
      if (templatePath) {
        metadata = await this.loadTemplateMetadata(templatePath);
      }

      // Extract URL parameters if available
      let urlParameters = {};
      if (typeof templateResolution !== 'undefined' && templateResolution?.parameters) {
        urlParameters = templateResolution.parameters;
      }

      // Prepare options and placeholders
      let options = {
        raw: [],
        byDimension: {}
      };
      let placeholders = {};

      // Process options from URL parameters
      const allOptionTokens = [];
      if (urlParameters.options) {
        // URL options come as comma-separated string, split them
        const urlOptions = Array.isArray(urlParameters.options)
          ? urlParameters.options
          : urlParameters.options.split(',').map(opt => opt.trim());
        allOptionTokens.push(...urlOptions);
      }

      if (metadata) {
        const normalizedOptionResult = normalizeOptions({
          rawTokens: allOptionTokens,
          dimensions: metadata.dimensions
        });
        options = {
          raw: allOptionTokens.slice(),
          byDimension: normalizedOptionResult.byDimension
        };
      } else if (allOptionTokens.length > 0) {
        options = {
          raw: allOptionTokens.slice(),
          byDimension: {}
        };
      }

      // Resolve placeholders if we have explicit values OR template has placeholder definitions
      if ((this.options.placeholders || (metadata && metadata.placeholders)) && metadata) {

        // Convert placeholders from object format (schema v1.0.0) to array format for resolver
        let placeholderDefinitions = [];
        if (metadata.placeholders) {
          if (Array.isArray(metadata.placeholders)) {
            placeholderDefinitions = metadata.placeholders;
          } else if (typeof metadata.placeholders === 'object') {
            // Convert object format to array format
            // The resolver expects: {token: 'PACKAGE_NAME', description: '...', required: true, ...}
            placeholderDefinitions = Object.entries(metadata.placeholders).map(([key, value]) => ({
              token: key,
              ...value
            }));
          }
        }

        if (placeholderDefinitions.length > 0) {
          const resolution = await resolvePlaceholders({
            definitions: placeholderDefinitions,
            flagInputs: this.options.placeholders || [],
            configDefaults: configMetadata?.placeholders ?? [],
            env: process.env,
            interactive: false,
            noInputPrompts: this.options.inputPrompts === false
          });
          placeholders = resolution.values;
        }
      }

      // Handle dry-run mode
      if (this.options.dryRun) {
        if (!templatePath || !templateName) {
          throw new Error(`--dry-run requires a template to be specified`);
        }

        const dryRunEngine = new DryRunEngine(this.cacheManager, this.logger);
        let preview;

        // Check if this is a local template directory (templatePath is set and repoUrl is local)
        if (templatePath && repoUrl && (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl === '.')) {
          // For local template directories, use previewScaffoldingFromPath directly
          preview = await dryRunEngine.previewScaffoldingFromPath(templatePath, validated.projectName);
        } else if (repoUrl) {
          // Otherwise, use previewScaffolding for remote repositories
          preview = await dryRunEngine.previewScaffolding(repoUrl, branchName || 'main', templatePath, validated.projectName);
        } else {
          // For local template paths without repoUrl, use previewScaffoldingFromPath
          const repoPath = path.dirname(templatePath);
          preview = await dryRunEngine.previewScaffoldingFromPath(repoPath, templateName, validated.projectName);
        }

        // Validate preview output structure before displaying results
        const validationErrors = dryRunEngine.validatePreview(preview);
        if (validationErrors.length > 0) {
          throw new Error(`Dry run preview invalid:\n- ${validationErrors.join('\n- ')}`);
        }

        // Display preview output
        this.logger.info('🔍 DRY RUN - Preview Mode');
        this.logger.info('================================');
        this.logger.info(`Template: ${templateName}`);
        this.logger.info(`Source: ${repoUrl}${branchName ? ` (${branchName})` : ''}`);
        this.logger.info(`Target: ${validated.projectName}`);
        this.logger.info('');

        this.logger.info('📋 Operations Preview:');
        this.logger.info(`• Files: ${preview.summary.fileCount}`);
        this.logger.info(`• Directories: ${preview.summary.directoryCount}`);
        this.logger.info(`• Total operations: ${preview.operations.length}`);
        this.logger.info('');

        if (preview.operations.length > 0) {
          this.logger.info('File Operations:');
          // Group operations by type
          const fileOps = preview.operations.filter(op => op.type === 'file_copy');
          const dirOps = preview.operations.filter(op => op.type === 'directory_create');

          if (dirOps.length > 0) {
            this.logger.info('• Directory Creation:');
            for (const op of dirOps.slice(0, 5)) { // Show first 5
              this.logger.info(`  • ${op.relativePath}`);
            }
            if (dirOps.length > 5) {
              this.logger.info(`  ... and ${dirOps.length - 5} more directories`);
            }
          }

          if (fileOps.length > 0) {
            this.logger.info('• File Copy:');
            // Group by directory for readability
            const byDir = {};
            for (const op of fileOps) {
              const dir = path.dirname(op.relativePath);
              if (!byDir[dir]) byDir[dir] = [];
              byDir[dir].push(path.basename(op.relativePath));
            }

            for (const [dir, files] of Object.entries(byDir)) {
              this.logger.info(`  • ./${dir}/ (${files.length} files)`);
            }
          }
        }

        // Check for tree command availability
        const treeCommand = process.env.CREATE_SCAFFOLD_TREE_COMMAND || 'tree';
        try {
          if (treeCommand === 'tree') {
            await Shell.execCommand(treeCommand, ['--version'], { stdio: 'pipe' });
          } else if (treeCommand.endsWith('.mts') || treeCommand.endsWith('.mts')) {
            // For JS files, check if file exists
            await fs.access(treeCommand, fs.constants.F_OK);
          } else {
            // For other commands, check if they exist
            await Shell.execCommand('which', [treeCommand], { stdio: 'pipe' });
          }
          // Tree command available, show tree preview
          this.logger.info('');
          this.logger.info('Directory Structure Preview:');
          this.logger.info('-----------------------------');
          let treeCmd, treeArgs;
          if (treeCommand === 'tree') {
            treeCmd = treeCommand;
            treeArgs = ['-a', '-I', '.git', templatePath];
          } else if (treeCommand.endsWith('.mts') || treeCommand.endsWith('.mts')) {
            // For JavaScript tree commands, execute with node
            treeCmd = 'node';
            treeArgs = [treeCommand, templatePath];
          } else {
            // For other custom tree commands, execute directly
            treeCmd = treeCommand;
            treeArgs = [treeCommand, templatePath];
          }
          const treeResult = await Shell.execCommand(treeCmd, treeArgs, { stdio: 'pipe' });
          const ignoreSet = createTemplateIgnoreSet();
          const filteredTreeResult = stripIgnoredFromTree(treeResult, ignoreSet);
          this.logger.info(filteredTreeResult);
        } catch {
          this.logger.info('');
          this.logger.info(`Note: Tree command (${treeCommand}) is unavailable for directory structure preview`);
        }

        this.logger.info('');
        this.logger.info('✅ Dry run completed - no files were created or modified');

        // Wait for any pending log writes to complete
        if (this.logger) {
          await this.logger.writeQueue;
        }

        return { success: true, dryRun: true };
      }

      // Execute the guided workflow with all resolved parameters
      // Always use guided workflow as the default
      const workflow = new GuidedSetupWorkflow({
        cacheManager: this.cacheManager,
        logger: this.logger,
        promptAdapter: process.env.NODE_ENV === 'test' || !process.stdin.isTTY ? {
          write: (text) => process.stderr.write(text),
          question: async (question) => {
            // In test/non-interactive mode, provide default answers
            if (question.includes('project name') || question.includes('Project name')) {
              return validated.projectName || './tmp/test-project';
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
        projectDirectory: validated.projectName,
        templatePath,
        templateName,
        repoUrl,
        branchName,
        options,
        placeholders,
        metadata,
        selectionFilePath: this.options.selection
      });

      let result;
      try {
        result = await workflow.executeWorkflow();
      } catch (error) {
        result = {
          success: false,
          projectDirectory: validated.projectName,
          templateUsed: templateName,
          error: error.message
        };
      }

      if (this.logger) {
        await this.logger.logOperation('workflow_complete', {
          success: result.success,
          projectDirectory: result.projectDirectory,
          templateUsed: result.templateUsed
        });
      }

      return result;

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

      handleError(contextualError, { logger: this.logger, operation: 'new_command_execution' });
      throw error;
    }
  }

  /**
   * Ensure repository is cached and return the cached path
   */
  async ensureRepositoryCached(repoUrl, branchName, options = {}) {
    const ttlHours = typeof options.ttlHours === 'number' ? options.ttlHours : undefined;

    // Handle local repositories directly without caching
    if (repoUrl.startsWith('/') || repoUrl.startsWith('./') || repoUrl.startsWith('../') || repoUrl.startsWith('~')) {
      const absolutePath = path.resolve(repoUrl);
      await File.validateDirectoryExists(absolutePath, 'Local repository path');
      return absolutePath;
    }

    // For remote repositories, use cache manager
    return await this.cacheManager.ensureRepositoryCached(repoUrl, branchName, { ttlHours }, this.logger);
  }

  /**
   * Load template metadata from path
   */
  async loadTemplateMetadata(templatePath) {
    try {
      return await loadTemplateMetadataFromPath(templatePath);
    } catch (error) {
      if (this.logger) {
        await this.logger.logOperation('template_metadata_load_failed', {
          templatePath,
          error: error.message
        });
      }
      // Return minimal metadata if loading fails
      return {
        name: path.basename(templatePath),
        version: 'unknown',
        placeholders: [],
        dimensions: {}
      };
    }
  }
}
