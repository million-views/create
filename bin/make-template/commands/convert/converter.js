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
    this.fileOperations = [];
  }

  async convert() {
    try {
      console.log(`Converting project: ${this.options.projectPath}`);

      const projectPath = path.resolve(this.options.projectPath);

      // Verify configuration files exist before proceeding
      const templateJsonPath = path.join(projectPath, 'template.json');
      const templatizeJsonPath = path.join(projectPath, '.templatize.json');

      if (!await exists(templateJsonPath)) {
        console.error('❌ Configuration files not found\n');
        console.error('Before converting, initialize your template configuration:');
        console.error('  npx make-template init\n');
        console.error('This creates the required configuration files:');
        console.error('  • .templatize.json (extraction rules)');
        console.error('  • template.json (placeholder metadata)\n');
        process.exit(1);
      }

      if (!await exists(templatizeJsonPath)) {
        console.error('❌ Configuration file missing: .templatize.json\n');
        console.error('Run: npx make-template init\n');
        process.exit(1);
      }

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
          'Run: npx make-template init',
          'Check that configuration files exist',
          'Verify write permissions in the target directory'
        ]
      });
      process.exit(1);
    }
  }

  async checkDevelopmentIndicators() {
    const indicators = [];
    const projectPath = path.resolve(this.options.projectPath);

    // Note: Since .templatize.json is required (user must run 'init' first),
    // its presence indicates explicit intent to convert this directory.
    // We only check for truly problematic indicators that suggest mistakes.

    // Check for .git directory (suggests uncommitted changes risk)
    if (await exists(path.join(projectPath, '.git'))) {
      indicators.push('Git repository (.git directory found)');
    }

    // Check for node_modules (suggests dependency bloat in template)
    if (await exists(path.join(projectPath, 'node_modules'))) {
      indicators.push('Node modules installed (node_modules directory found)');
    }

    // Check for .env file (suggests secrets might be included)
    if (await exists(path.join(projectPath, '.env'))) {
      indicators.push('Environment file found (.env) - may contain secrets');
    }

    // Note: Files like README.md, .gitignore, .eslintrc.js are normal in templates
    // and should not trigger warnings since .templatize.json presence indicates intent

    return indicators;
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

    // Add all file modification operations
    undoLog.fileOperations.push(...this.fileOperations);

    // Write undo log
    await writeJsonFile(undoPath, undoLog);
  }

  async detectAndReplacePlaceholders() {
    const projectPath = path.resolve(this.options.projectPath);
    const detectedPlaceholders = {};
    const placeholderFormat = this.options.placeholderFormat || '⦃NAME⦄';

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

  async processFileWithProcessor(filePath, processor, patterns, placeholderFormat) {
    const placeholders = {};

    try {
      // Read file content as string for all processors
      const fs = await import('fs/promises');
      const originalContent = await fs.readFile(filePath, 'utf8');
      let content = originalContent;
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

        // Record file operation for undo log
        const relativePath = path.relative(path.resolve(this.options.projectPath), filePath);
        this.fileOperations.push({
          type: 'modified',
          path: relativePath,
          originalContent,
          description: `Modified file with ${Object.keys(placeholders).length} placeholder(s)`,
          timestamp: new Date().toISOString()
        });
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

    // Handle named formats
    const formatMap = {
      'mustache': '{{NAME}}',
      'dollar': '$NAME$',
      'percent': '%NAME%',
      'unicode': '⦃NAME⦄'
    };

    if (formatMap[format]) {
      format = formatMap[format];
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

    // Merge detected placeholders with existing ones
    // Preserves manually added placeholders and adds newly detected ones
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
      console.log(`✓ Updated template.json with ${Object.keys(detectedPlaceholders).length} detected placeholder(s)`);
    } catch (error) {
      throw new Error(`Failed to write template.json: ${error.message}`);
    }
  }
}
