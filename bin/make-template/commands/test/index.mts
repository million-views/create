// @ts-nocheck
import { Command } from '@m5nv/create-scaffold/lib/cli/command.mts';
import { testHelp } from './help.mts';
import { spawn } from 'child_process';
import path from 'path';
import { File } from '@m5nv/create-scaffold/lib/util/file.mts';
import { ContextualError, ErrorContext, ErrorSeverity, handleError } from '@m5nv/create-scaffold/lib/error/index.mts';

export class TestCommand extends Command {
  constructor() {
    super(testHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--verbose') {
      parsed.verbose = true;
      return i;
    } else if (arg === '--keep-temp') {
      parsed.keepTemp = true;
      return i;
    } else if (!arg.startsWith('-')) {
      if (!parsed.templatePath) {
        parsed.templatePath = arg;
      }
    }
  }

  async run(parsed) {
    try {
      if (!parsed.templatePath) {
        throw new ContextualError(
          'Template path is required',
          {
            context: ErrorContext.USER_INPUT,
            severity: ErrorSeverity.HIGH,
            operation: 'test',
            suggestions: [
              'Provide a template path as the first argument',
              'Use --help to see usage information'
            ]
          }
        );
      }

      const templatePath = path.resolve(parsed.templatePath);

      // Validate template exists
      if (!(await File.exists(templatePath))) {
        throw new ContextualError(
          `Template path does not exist: ${templatePath}`,
          {
            context: ErrorContext.FILE_OPERATION,
            severity: ErrorSeverity.HIGH,
            operation: 'test',
            suggestions: [
              'Check that the template path is correct',
              'Ensure the template directory exists and is accessible'
            ]
          }
        );
      }

      // Validate template.json exists
      const templateJsonPath = path.join(templatePath, 'template.json');
      if (!(await File.exists(templateJsonPath))) {
        throw new ContextualError(
          `template.json not found in: ${templatePath}`,
          {
            context: ErrorContext.FILE_OPERATION,
            severity: ErrorSeverity.HIGH,
            operation: 'test',
            suggestions: [
              'Ensure template.json exists in the template directory',
              'Run "make-template init" to create a basic template.json'
            ]
          }
        );
      }

      console.log(`🧪 Testing template: ${templatePath}`);

      if (parsed.verbose) {
        console.log('Running comprehensive template tests...');
        console.log(`Template path: ${templatePath}`);
        console.log(`Template JSON: ${templateJsonPath}`);
      }

      await this.runTemplateTest(templatePath, parsed);
      console.log('✅ Template test passed');
    } catch (error) {
      handleError(error, {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        operation: 'test',
        suggestions: [
          'Check that the template path exists and contains a valid template.json',
          'Ensure create-scaffold is properly installed and accessible',
          'Use --verbose for detailed error information'
        ]
      });
      process.exit(1);
    }
  }

  async runTemplateTest(templatePath, options) {
    const testProjectName = `test-template-${Date.now()}`;
    const testProjectPath = path.join(process.cwd(), testProjectName);

    try {
      console.log(`📁 Creating test project: ${testProjectName}`);

      // Run create-scaffold to test the template
      await this.executeCreateScaffold(templatePath, testProjectName, options);

      console.log('🔍 Validating test project structure...');

      // Basic validation - check if project was created
      if (!(await File.exists(testProjectPath))) {
        throw new ContextualError(
          'Test project was not created',
          {
            context: ErrorContext.FILE_OPERATION,
            severity: ErrorSeverity.HIGH,
            operation: 'test',
            suggestions: [
              'Check create-scaffold output for errors',
              'Ensure the template is valid and properly structured'
            ]
          }
        );
      }

      // Check for basic project files
      const hasPackageJson = await File.exists(path.join(testProjectPath, 'package.json'));
      const hasReadme = await File.exists(path.join(testProjectPath, 'README.md'));

      if (options.verbose) {
        console.log(`Package.json found: ${hasPackageJson}`);
        console.log(`README.md found: ${hasReadme}`);
      }

      if (!hasPackageJson) {
        console.warn('⚠️  Warning: package.json not found in test project');
      }

      console.log('✓ Template validation completed');

    } finally {
      // Cleanup unless --keep-temp is specified
      if (!options.keepTemp && (await File.exists(testProjectPath))) {
        console.log('🧹 Cleaning up test project...');
        await File.remove(testProjectPath);
        if (options.verbose) {
          console.log(`Removed: ${testProjectPath}`);
        }
      } else if (options.keepTemp) {
        console.log(`📂 Test project preserved: ${testProjectPath}`);
      }
    }
  }

  async executeCreateScaffold(templatePath, projectName, options) {
    return new Promise((resolve, reject) => {
      const createScaffoldPath = path.join(process.cwd(), 'bin', 'create-scaffold', 'index.mts');

      const args = [
        'new',
        projectName,
        '--template',
        templatePath,
        '--yes' // Skip prompts
      ];

      if (options.verbose) {
        console.log(`Running: node ${createScaffoldPath} ${args.join(' ')}`);
      }

      const child = spawn('node', [createScaffoldPath, ...args], {
        stdio: options.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd()
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`create-scaffold exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = new TestCommand();
  const args = process.argv.slice(2);
  cmd.execute(args);
}
