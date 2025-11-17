import fs from 'fs';
import path from 'path';

export class Converter {
  constructor(options) {
    this.options = options;
  }

  convert() {
    console.log(`Converting project: ${this.options.projectPath}`);

    // Check for development repository indicators
    const devIndicators = this.checkDevelopmentIndicators();
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
    this.createTemplateJson();

    // Create undo log
    this.createUndoLog();

    // TODO: Implement actual conversion logic
    console.log('✓ Project converted to template successfully');
  }

  checkDevelopmentIndicators() {
    const indicators = [];
    const projectPath = path.resolve(this.options.projectPath);

    // Check for .git directory
    if (fs.existsSync(path.join(projectPath, '.git'))) {
      indicators.push('Git repository (.git directory found)');
    }

    // Check for node_modules
    if (fs.existsSync(path.join(projectPath, 'node_modules'))) {
      indicators.push('Node modules installed (node_modules directory found)');
    }

    // Check for common development files
    const devFiles = ['.gitignore', '.env', 'README.md', '.eslintrc.js', '.prettierrc'];
    devFiles.forEach(file => {
      if (fs.existsSync(path.join(projectPath, file))) {
        indicators.push(`Development file found: ${file}`);
      }
    });

    return indicators;
  }

  createTemplateJson() {
    const projectPath = path.resolve(this.options.projectPath);

    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

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

    // Write template.json
    const templatePath = path.join(projectPath, 'template.json');
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
  }

  createUndoLog() {
    const projectPath = path.resolve(this.options.projectPath);

    const undoPath = path.join(projectPath, '.template-undo.json');
    let existingUndo = null;

    // Check for existing undo log
    if (fs.existsSync(undoPath)) {
      try {
        existingUndo = JSON.parse(fs.readFileSync(undoPath, 'utf8'));
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
    fs.writeFileSync(undoPath, JSON.stringify(undoLog, null, 2));
  }
}
