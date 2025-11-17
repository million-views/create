import { Command } from '../../../../lib/cli/command.js';
import { testHelp } from './help.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class TestCommand extends Command {
  constructor() {
    super(testHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (arg === '--keep-temp') {
      parsed.keepTemp = true;
    } else if (!arg.startsWith('-')) {
      if (!parsed.templatePath) {
        parsed.templatePath = arg;
      }
    }
  }

  async run(parsed) {
    if (!parsed.templatePath) {
      console.error('❌ Template path is required');
      this.showHelp();
      process.exit(1);
    }

    const templatePath = path.resolve(parsed.templatePath);

    // Validate template exists
    if (!fs.existsSync(templatePath)) {
      console.error(`❌ Template path does not exist: ${templatePath}`);
      process.exit(1);
    }

    // Validate template.json exists
    const templateJsonPath = path.join(templatePath, 'template.json');
    if (!fs.existsSync(templateJsonPath)) {
      console.error(`❌ template.json not found in: ${templatePath}`);
      process.exit(1);
    }

    console.log(`🧪 Testing template: ${templatePath}`);

    if (parsed.verbose) {
      console.log('Running comprehensive template tests...');
      console.log(`Template path: ${templatePath}`);
      console.log(`Template JSON: ${templateJsonPath}`);
    }

    try {
      await this.runTemplateTest(templatePath, parsed);
      console.log('✅ Template test passed');
    } catch (error) {
      console.error(`❌ Template test failed: ${error.message}`);
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
      if (!fs.existsSync(testProjectPath)) {
        throw new Error('Test project was not created');
      }

      // Check for basic project files
      const hasPackageJson = fs.existsSync(path.join(testProjectPath, 'package.json'));
      const hasReadme = fs.existsSync(path.join(testProjectPath, 'README.md'));

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
      if (!options.keepTemp && fs.existsSync(testProjectPath)) {
        console.log('🧹 Cleaning up test project...');
        fs.rmSync(testProjectPath, { recursive: true, force: true });
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
      const createScaffoldPath = path.join(process.cwd(), 'bin', 'create-scaffold', 'index.mjs');

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
