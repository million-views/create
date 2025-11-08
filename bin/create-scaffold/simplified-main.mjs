/**
 * Main entry point for the create-scaffold CLI tool
 * This is a simplified version that only uses the guided workflow
 */
async function main() {
  try {
    // Parse arguments using native Node.js parseArgs
    const args = parseArguments();

    // Handle early exit modes first
    if (args.help) {
      console.log(generateHelpText());
      process.exit(0);
    }

    if (args.listTemplates) {
      const exitCode = await executeListTemplates({
        jsonOutput: Boolean(args.json)
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
    const logger = args.logFile ? new Logger(args.logFile) : null;

    // Load configuration if not disabled
    let configMetadata = null;
    try {
      const configResult = await loadConfig({
        cwd: process.cwd(),
        env: process.env,
        skip: Boolean(args.noConfig)
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
      // Configuration errors are non-fatal, just log and continue
      if (logger) {
        await logger.logOperation('config_load_error', {
          error: error.message,
          path: error.path
        });
      }
    }

    // Execute the guided workflow - this is now the only execution path
    const workflow = new GuidedSetupWorkflow({
      cacheManager,
      logger,
      configMetadata,
      args
    });

    const result = await workflow.executeWorkflow();

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

    handleError(contextualError, { logger: null, operation: 'main_execution' });
  }
}