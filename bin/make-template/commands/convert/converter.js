import path from 'path';
import { readJsonFile, writeJsonFile, exists } from '../../../../lib/fs-utils.mjs';
import { ErrorContext, ErrorSeverity, handleError } from '../../../../lib/error-handler.mjs';

export class Converter {
  constructor(options) {
    this.options = options;
  }

  async convert() {
    try {
      console.log(`Converting project: ${this.options.projectPath}`);

      // Check for development repository indicators
      const devIndicators = await this.checkDevelopmentIndicators();
      if (devIndicators.length > 0 && !this.options.yes) {
        console.error('❌ This appears to be a development repository:');
        devIndicators.forEach(indicator => console.error(`   • ${indicator}`));
        console.error("\n💡 Use --yes to proceed anyway, or ensure you're converting a clean project directory.");
        process.exit(1);
      }

      if (devIndicators.length > 0 && this.options.yes) {
        console.log('Proceeding automatically (--yes flag used)');
      }

      if (this.options.dryRun) {
        console.log('DRY RUN MODE - No changes will be made');
        console.log('DRY RUN: Would convert project to template');
        console.log('No changes were made');
        return;
      }

      // Create basic template.json
      await this.createTemplateJson();

      // Create undo log
      await this.createUndoLog();

      // TODO: Implement actual conversion logic
      console.log('✓ Project converted to template successfully');
    } catch (error) {
      handleError(error, {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        operation: 'convert',
        suggestions: [
          'Check that the project path exists and is accessible',
          'Ensure the project is not a development repository (or use --yes)',
          'Verify write permissions in the target directory'
        ]
      });
      process.exit(1);
    }
  }

  async checkDevelopmentIndicators() {
    const indicators = [];
    const projectPath = path.resolve(this.options.projectPath);

    // Check for .git directory
    if (await exists(path.join(projectPath, '.git'))) {
      indicators.push('Git repository (.git directory found)');
    }

    // Check for node_modules
    if (await exists(path.join(projectPath, 'node_modules'))) {
      indicators.push('Node modules installed (node_modules directory found)');
    }

    // Check for common development files
    const devFiles = ['.gitignore', '.env', 'README.md', '.eslintrc.js', '.prettierrc'];
    for (const file of devFiles) {
      if (await exists(path.join(projectPath, file))) {
        indicators.push(`Development file found: ${file}`);
      }
    }

    return indicators;
  }

  async createTemplateJson() {
    const projectPath = path.resolve(this.options.projectPath);

    // Read package.json using shared utility
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await readJsonFile(packageJsonPath);

    // Create basic template structure
    const template = {
      schemaVersion: '1.0.0',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString()
      },
      name: packageJson.name || 'my-template',
      description: packageJson.description || '',
      author: packageJson.author || '',
      license: packageJson.license || '',
      setup: {
        dimensions: {
          deployment: {
            type: 'single',
            values: ['cloudflare-workers'],
            default: 'cloudflare-workers'
          },
          features: {
            type: 'multi',
            values: [],
            default: []
          },
          database: {
            type: 'single',
            values: ['none'],
            default: 'none'
          },
          storage: {
            type: 'single',
            values: ['none'],
            default: 'none'
          },
          auth: {
            type: 'multi',
            values: [],
            default: []
          },
          payments: {
            type: 'single',
            values: ['none'],
            default: 'none'
          },
          analytics: {
            type: 'single',
            values: ['none'],
            default: 'none'
          }
        }
      },
      featureSpecs: [],
      constants: {},
      hints: {}
    };

    // Write template.json using shared utility
    const templatePath = path.join(projectPath, 'template.json');
    await writeJsonFile(templatePath, template);
  }

  async createUndoLog() {
    const projectPath = path.resolve(this.options.projectPath);

    const undoPath = path.join(projectPath, '.template-undo.json');
    let existingUndo = null;

    // Check for existing undo log
    if (await exists(undoPath)) {
      try {
        existingUndo = await readJsonFile(undoPath);
        console.log('⚠️  Existing undo log found, existing undo log will be updated');
      } catch (_error) {
        console.log('⚠️  Existing undo log is corrupted, creating new one');
      }
    }

    const undoLog = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        command: 'convert'
      },
      fileOperations: existingUndo?.fileOperations || []
    };

    // Add current operation
    undoLog.fileOperations.push({
      type: 'create',
      path: 'template.json',
      description: 'Created template configuration file',
      timestamp: new Date().toISOString()
    });

    // Write undo log
    await writeJsonFile(undoPath, undoLog);
  }
}
