import path from 'path';
import { readJsonFile, writeJsonFile, exists } from '../../../../lib/fs-utils.mjs';
import { ErrorContext, ErrorSeverity, handleError } from '../../../../lib/error-handler.mjs';
import { processJSONFile } from '../../../../lib/templatize-json.mjs';
import { processMarkdownFile } from '../../../../lib/templatize-markdown.mjs';
import { processJSXFile } from '../../../../lib/templatize-jsx.mjs';
import { processHTMLFile } from '../../../../lib/templatize-html.mjs';
import { loadConfig, loadConfigFromFile, getPatternsForFile } from '../../../../lib/templatize-config.mjs';

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
    const packageJson = await readJsonFile(packageJsonPath) || {};

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

    // Load templatization configuration
    console.log('📋 Loading templatization configuration...');
    let config;
    try {
      if (this.options.config) {
        // Load from custom config file
        config = loadConfigFromFile(this.options.config);
      } else {
        // Load from project directory
        config = loadConfig(projectPath);
      }
      console.log(`✓ Loaded configuration with ${Object.keys(config.rules).length} file pattern(s)`);
    } catch (error) {
      console.error(`❌ Configuration error: ${error.message}`);
      console.error('\n💡 To create a configuration file, run: npx make-template init');
      console.error('   Or specify a custom config with: --config <path>');
      throw error;
    }

    // Find all files that match configuration rules
    const filesToProcess = await this.discoverFilesToProcess(projectPath, config);
    console.log(`📁 Discovered ${filesToProcess.length} file(s) to process`);

    for (const fileConfig of filesToProcess) {
      const filePath = path.join(projectPath, fileConfig.path);
      if (await exists(filePath)) {
        try {
          // Translate design patterns to processor format
          const processorPatterns = this.translatePatternsForProcessor(fileConfig.patterns, fileConfig.processorType);

          const result = await this.processFileWithProcessor(
            filePath, fileConfig.processor, processorPatterns,
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

  async discoverFilesToProcess(projectPath, config) {
    const filesToProcess = [];
    const processedFiles = new Set();

    // Get all file patterns from config rules
    const filePatterns = Object.keys(config.rules);

    // Scan project directory for files matching patterns
    const matchingFiles = await this.scanProjectForMatchingFiles(projectPath, filePatterns);

    // Process each matching file
    for (const filePath of matchingFiles) {
      if (processedFiles.has(filePath)) continue;

      const patterns = getPatternsForFile(filePath, config);
      if (patterns.length > 0) {
        const processorType = this.getProcessorTypeForFile(filePath);
        if (processorType) {
          filesToProcess.push({
            path: filePath,
            processor: this.getProcessorForType(processorType),
            processorType,
            patterns
          });
          processedFiles.add(filePath);
        }
      }
    }

    return filesToProcess;
  }

  async scanProjectForMatchingFiles(projectPath, filePatterns) {
    const matchingFiles = [];
    const fs = await import('fs/promises');
    const pathModule = await import('path');

    // Recursive function to scan directories
    const scanDirectory = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = pathModule.join(dirPath, entry.name);
          const relativePath = pathModule.relative(projectPath, fullPath);

          // Skip certain directories
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
              continue;
            }
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            // Check if file matches any pattern
            if (this.matchesAnyPattern(relativePath, filePatterns)) {
              matchingFiles.push(relativePath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
      }
    };

    await scanDirectory(projectPath);
    return matchingFiles;
  }

  matchesAnyPattern(filePath, patterns) {
    const fileName = path.basename(filePath);

    for (const pattern of patterns) {
      // Exact filename match
      if (pattern === fileName) {
        return true;
      }

      // Extension match (e.g., ".jsx" matches "App.jsx")
      if (pattern.startsWith('.') && filePath.endsWith(pattern)) {
        return true;
      }

      // Could add glob pattern matching here if needed in the future
    }

    return false;
  }

  getProcessorTypeForFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    if (fileName === 'package.json' || ext === '.json') return 'json';
    if (ext === '.md') return 'markdown';
    if (ext === '.html' || ext === '.htm') return 'html';
    if (ext === '.jsx' || ext === '.tsx' || ext === '.js' || ext === '.ts') return 'jsx';

    return null;
  }

  getProcessorForType(type) {
    switch (type) {
      case 'json': return processJSONFile;
      case 'markdown': return processMarkdownFile;
      case 'html': return processHTMLFile;
      case 'jsx': return processJSXFile;
      default: return null;
    }
  }

  translatePatternsForProcessor(patterns, processorType) {
    return patterns.map(pattern => {
      // Handle malformed patterns gracefully
      if (!pattern || typeof pattern !== 'object' || !pattern.type) {
        console.warn(`Warning: Invalid pattern encountered: ${JSON.stringify(pattern)}`);
        return pattern;
      }

      // Convert design format to processor format
      switch (processorType) {
        case 'json':
          if (pattern.type === 'json-value') {
            const { path, ...rest } = pattern; // Extract path, spread the rest
            return {
              ...rest, // Preserve additional fields
              selector: pattern.path,
              type: 'string-literal',
              context: 'json-value',
              allowMultiple: pattern.allowMultiple || false
            };
          }
          break;

        case 'markdown':
          if (pattern.type === 'markdown-heading') {
            const { level, ...rest } = pattern; // Extract level, spread the rest
            return {
              ...rest, // Preserve additional fields
              selector: `h${pattern.level}`,
              type: 'string-literal',
              context: 'markdown',
              allowMultiple: pattern.allowMultiple || false
            };
          } else if (pattern.type === 'markdown-paragraph') {
            const { position, ...rest } = pattern; // Extract position, spread the rest
            return {
              ...rest, // Preserve additional fields
              selector: pattern.position === 'first' ? 'p:first-of-type' : 'p',
              type: 'string-literal',
              context: 'markdown',
              allowMultiple: pattern.allowMultiple || false
            };
          }
          break;

        case 'html':
          if (pattern.type === 'html-text') {
            return {
              ...pattern, // Preserve additional fields
              selector: pattern.selector,
              type: 'string-literal',
              context: 'html',
              allowMultiple: pattern.allowMultiple || false
            };
          } else if (pattern.type === 'html-attribute') {
            return {
              ...pattern, // Preserve additional fields
              selector: pattern.selector,
              type: 'string-literal',
              context: 'html-attribute',
              attribute: pattern.attribute,
              allowMultiple: pattern.allowMultiple || false
            };
          }
          break;

        case 'jsx':
          if (pattern.type === 'string-literal') {
            return {
              ...pattern, // Preserve additional fields
              selector: pattern.selector,
              type: 'string-literal',
              context: pattern.context,
              allowMultiple: pattern.allowMultiple || false,
              ...(pattern.attribute && { attribute: pattern.attribute })
            };
          }
          break;
      }

      // If no translation found, return pattern as-is (for forwards compatibility)
      console.warn(`Warning: Could not translate pattern type '${pattern.type}' for ${processorType} processor`);
      return pattern;
    });
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
