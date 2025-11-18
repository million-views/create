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

      // Detect and replace placeholders in files
      const detectedPlaceholders = await this.detectAndReplacePlaceholders();

      // Update template.json with detected placeholders
      await this.updateTemplateJsonWithPlaceholders(detectedPlaceholders);

      // Create undo log
      await this.createUndoLog();
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

  async detectAndReplacePlaceholders() {
    const projectPath = path.resolve(this.options.projectPath);
    const detectedPlaceholders = {};
    const placeholderFormat = this.options.placeholderFormat || '{{NAME}}';

    // Files to scan for placeholders
    const filesToScan = [
      'package.json',
      'README.md',
      'index.html',
      'src/index.html',
      'public/index.html',
      'vite.config.js',
      'vite.config.ts',
      'src/main.js',
      'src/main.ts',
      'src/App.jsx',
      'src/App.tsx',
      'src/App.js',
      'src/App.ts'
    ];

    for (const file of filesToScan) {
      const filePath = path.join(projectPath, file);
      if (await exists(filePath)) {
        const result = await this.processFileForPlaceholders(filePath, placeholderFormat);
        Object.assign(detectedPlaceholders, result.placeholders);
      }
    }

    return detectedPlaceholders;
  }

  async processFileForPlaceholders(filePath, format) {
    const fileExt = path.extname(filePath);
    let content;

    if (fileExt === '.json') {
      content = await readJsonFile(filePath, null, 'utf8');
    } else {
      // For non-JSON files, read as text
      const fs = await import('fs/promises');
      content = await fs.readFile(filePath, 'utf8');
    }

    const placeholders = {};
    let modifiedContent = content;

    // Detect common placeholders based on file type
    const basename = path.basename(filePath, fileExt);

    if (basename === 'package' && fileExt === '.json') {
      // Package.json placeholders
      const packageData = content; // content is already parsed from readJsonFile
      if (packageData.name && packageData.name !== 'my-template') {
        const placeholderName = 'PROJECT_NAME';
        const placeholder = this.formatPlaceholder(placeholderName, format);
        placeholders[placeholderName] = {
          default: packageData.name,
          description: 'Project name'
        };
        packageData.name = placeholder;
      }
      if (packageData.description) {
        const placeholderName = 'DESCRIPTION';
        const placeholder = this.formatPlaceholder(placeholderName, format);
        placeholders[placeholderName] = {
          default: packageData.description,
          description: 'Project description'
        };
        packageData.description = placeholder;
      }
      if (packageData.author) {
        const placeholderName = 'AUTHOR';
        const placeholder = this.formatPlaceholder(placeholderName, format);
        placeholders[placeholderName] = {
          default: packageData.author,
          description: 'Author information'
        };
        packageData.author = placeholder;
      }
      modifiedContent = JSON.stringify(packageData, null, 2);
    } else if (basename === 'README' && fileExt === '.md') {
      // README.md placeholders
      const titleMatch = content.match(/^# (.+)$/m);
      if (titleMatch) {
        const placeholderName = 'README_TITLE';
        const placeholder = this.formatPlaceholder(placeholderName, format);
        placeholders[placeholderName] = {
          default: titleMatch[1],
          description: 'README title'
        };
        modifiedContent = modifiedContent.replace(
          titleMatch[0],
          `# ${placeholder}`
        );
      }
    } else if (basename === 'index' && fileExt === '.html') {
      // HTML title placeholder
      const titleMatch = content.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const placeholderName = 'HTML_TITLE';
        const placeholder = this.formatPlaceholder(placeholderName, format);
        placeholders[placeholderName] = {
          default: titleMatch[1],
          description: 'HTML page title'
        };
        modifiedContent = modifiedContent.replace(
          titleMatch[0],
          `<title>${placeholder}</title>`
        );
      }
    }

    // Write back modified content if changed
    if (modifiedContent !== content) {
      if (fileExt === '.json') {
        // For JSON files, write the modified object back
        await writeJsonFile(filePath, JSON.parse(modifiedContent));
      } else {
        const fs = await import('fs/promises');
        await fs.writeFile(filePath, modifiedContent, 'utf8');
      }
    }

    return { placeholders };
  }

  formatPlaceholder(name, format) {
    return format.replace('NAME', name);
  }

  async updateTemplateJsonWithPlaceholders(detectedPlaceholders) {
    const projectPath = path.resolve(this.options.projectPath);
    const templatePath = path.join(projectPath, 'template.json');

    const template = await readJsonFile(templatePath);

    // Add detected placeholders to template
    template.placeholders = { ...template.placeholders, ...detectedPlaceholders };

    await writeJsonFile(templatePath, template);
  }
}
