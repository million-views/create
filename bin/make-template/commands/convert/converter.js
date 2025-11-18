import path from 'path';
import { readJsonFile, writeJsonFile, exists } from '../../../../lib/fs-utils.mjs';
import { ErrorContext, ErrorSeverity, handleError } from '../../../../lib/error-handler.mjs';
import { processJSONFile } from '../../../../lib/templatize-json.mjs';
import { processMarkdownFile } from '../../../../lib/templatize-markdown.mjs';
import { processJSXFile } from '../../../../lib/templatize-jsx.mjs';
import { processHTMLFile } from '../../../../lib/templatize-html.mjs';

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

    // Generate author name from package.json or use default
    const author = packageJson.author || 'my-org';
    const authorSlug = author.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const projectSlug = (packageJson.name || 'my-template').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Create minimal template structure
    const template = {
      schemaVersion: '1.0.0',
      id: `${authorSlug}/${projectSlug}`,
      name: packageJson.name || 'My Template',
      description: packageJson.description || 'A template generated from a project',
      placeholders: {}
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

    // Define common templatization patterns
    const commonPatterns = [
      // Project name patterns
      { selector: '$.name', type: 'string-literal', context: 'json-value', placeholder: 'PROJECT_NAME', allowMultiple: false },
      { selector: 'h1', type: 'string-literal', context: 'markdown', placeholder: 'PROJECT_NAME', allowMultiple: false },
      { selector: 'title', type: 'string-literal', context: 'html', placeholder: 'PROJECT_NAME', allowMultiple: false },
      { selector: 'h1', type: 'string-literal', context: 'jsx-text', placeholder: 'PROJECT_NAME', allowMultiple: false },

      // Description patterns
      { selector: '$.description', type: 'string-literal', context: 'json-value', placeholder: 'DESCRIPTION', allowMultiple: false },
      { selector: 'p:first-of-type', type: 'string-literal', context: 'markdown', placeholder: 'DESCRIPTION', allowMultiple: false },
      { selector: '.description, [data-description]', type: 'string-literal', context: 'html', placeholder: 'DESCRIPTION', allowMultiple: false },

      // Author patterns
      { selector: '$.author', type: 'string-literal', context: 'json-value', placeholder: 'AUTHOR', allowMultiple: false },

      // Version patterns
      { selector: '$.version', type: 'string-literal', context: 'json-value', placeholder: 'VERSION', allowMultiple: false }
    ];

    // Files to scan for placeholders with their appropriate processors
    const filesToProcess = [
      { path: 'package.json', processor: processJSONFile, patterns: commonPatterns.filter(p => p.context === 'json-value') },
      { path: 'README.md', processor: processMarkdownFile, patterns: commonPatterns.filter(p => p.context === 'markdown') },
      { path: 'index.html', processor: processHTMLFile, patterns: commonPatterns.filter(p => p.context === 'html') },
      { path: 'src/index.html', processor: processHTMLFile, patterns: commonPatterns.filter(p => p.context === 'html') },
      { path: 'public/index.html', processor: processHTMLFile, patterns: commonPatterns.filter(p => p.context === 'html') },
      { path: 'src/App.jsx', processor: processJSXFile, patterns: commonPatterns.filter(p => p.context === 'jsx-text') },
      { path: 'src/App.tsx', processor: processJSXFile, patterns: commonPatterns.filter(p => p.context === 'jsx-text') },
      { path: 'src/App.js', processor: processJSXFile, patterns: commonPatterns.filter(p => p.context === 'jsx-text') },
      { path: 'src/App.ts', processor: processJSXFile, patterns: commonPatterns.filter(p => p.context === 'jsx-text') }
    ];

    for (const fileConfig of filesToProcess) {
      const filePath = path.join(projectPath, fileConfig.path);
      if (await exists(filePath)) {
        try {
          const result = await this.processFileWithProcessor(
            filePath, fileConfig.processor, fileConfig.patterns,
            placeholderFormat);
          Object.assign(detectedPlaceholders, result.placeholders);
        } catch (error) {
          // Skip files that can't be processed
          console.warn(`Warning: Could not process ${fileConfig.path}: ${error.message}`);
        }
      }
    }

    return detectedPlaceholders;
  }

  async processFileWithProcessor(filePath, processor, patterns, placeholderFormat) {
    const placeholders = {};

    try {
      // Read file content as string for all processors
      const fs = await import('fs/promises');
      let content = await fs.readFile(filePath, 'utf8');
      const fileExt = path.extname(filePath);

      // Validate content is not empty
      if (!content || content.trim().length === 0) {
        console.warn(`Warning: ${filePath} is empty, skipping`);
        return { placeholders };
      }

      // Use the templatization processor to find matches
      const matches = await processor(filePath, content, patterns);

      // Validate matches
      if (!Array.isArray(matches)) {
        throw new Error(`Processor returned invalid result: ${typeof matches}`);
      }

      // Process matches and create placeholders
      // Sort matches by startIndex in reverse order to avoid position shifts
      const sortedMatches = matches.sort(
        (a, b) => b.startIndex - a.startIndex
      );

      for (const match of sortedMatches) {
        // Validate match structure
        if (!match || typeof match !== 'object') {
          console.warn(`Warning: Invalid match object, skipping`);
          continue;
        }

        if (!match.placeholder || typeof match.placeholder !== 'string') {
          console.warn(`Warning: Match missing valid placeholder, skipping`);
          continue;
        }

        if (typeof match.startIndex !== 'number' || typeof match.endIndex !== 'number') {
          console.warn(`Warning: Match missing valid position indices, skipping`);
          continue;
        }

        if (match.startIndex < 0 || match.endIndex <= match.startIndex || match.endIndex > content.length) {
          console.warn(`Warning: Match has invalid position indices, skipping`);
          continue;
        }

        const placeholderName = match.placeholder;

        // Skip if we already have this placeholder
        if (placeholders[placeholderName]) {
          continue;
        }

        // Validate placeholder format
        if (!/^[A-Z][A-Z0-9_]*$/.test(placeholderName)) {
          console.warn(`Warning: Invalid placeholder name '${placeholderName}', must be uppercase letters, numbers, and underscores, starting with a letter`);
          continue;
        }

        // Create placeholder definition
        placeholders[placeholderName] = {
          default: match.originalText || '',
          description: `${placeholderName.toLowerCase().replace(/_/g, ' ')}`
        };

        // Replace the content in the file
        const placeholderValue = this.formatPlaceholder(placeholderName, placeholderFormat);
        const beforeMatch = content.substring(0, match.startIndex);
        const afterMatch = content.substring(match.endIndex);
        content = beforeMatch + placeholderValue + afterMatch;
      }

      // Write back modified content if any replacements were made
      if (Object.keys(placeholders).length > 0) {
        // Validate that the content is still valid after modifications
        if (fileExt === '.json') {
          try {
            JSON.parse(content);
          } catch (error) {
            throw new Error(`Modified JSON content is invalid: ${error.message}`);
          }
        }

        await fs.writeFile(filePath, content, 'utf8');
      }

    } catch (error) {
      // Re-throw with more context
      throw new Error(`Failed to process ${filePath}: ${error.message}`);
    }

    return { placeholders };
  }

  formatPlaceholder(name, format) {
    if (!name || typeof name !== 'string') {
      throw new Error(`Invalid placeholder name: ${name}`);
    }
    if (!format || typeof format !== 'string') {
      throw new Error(`Invalid placeholder format: ${format}`);
    }
    if (!format.includes('NAME')) {
      throw new Error(`Placeholder format must contain 'NAME' placeholder: ${format}`);
    }
    return format.replace('NAME', name);
  }

  async updateTemplateJsonWithPlaceholders(detectedPlaceholders) {
    const projectPath = path.resolve(this.options.projectPath);
    const templatePath = path.join(projectPath, 'template.json');

    let template;
    try {
      template = await readJsonFile(templatePath);
    } catch (error) {
      throw new Error(`Failed to read template.json: ${error.message}`);
    }

    // Validate template structure
    if (!template || typeof template !== 'object') {
      throw new Error('Invalid template.json structure');
    }

    if (!template.placeholders || typeof template.placeholders !== 'object') {
      template.placeholders = {};
    }

    // Add detected placeholders to template
    template.placeholders = { ...template.placeholders, ...detectedPlaceholders };

    // Validate placeholder definitions
    for (const [name, def] of Object.entries(template.placeholders)) {
      if (!def || typeof def !== 'object') {
        console.warn(`Warning: Invalid placeholder definition for ${name}, skipping`);
        delete template.placeholders[name];
        continue;
      }
      if (typeof def.default !== 'string') {
        console.warn(`Warning: Placeholder ${name} missing valid default value, setting to empty string`);
        def.default = '';
      }
      if (!def.description || typeof def.description !== 'string') {
        def.description = `${name.toLowerCase().replace(/_/g, ' ')}`;
      }
    }

    try {
      await writeJsonFile(templatePath, template);
    } catch (error) {
      throw new Error(`Failed to write template.json: ${error.message}`);
    }
  }
}
