import { Command } from '../../../../lib/cli/command.js';
import { initHelp } from './help.js';
import fs from 'fs';
import { join } from 'path';
import { generateConfigFile } from '../../../../lib/templatize-config.mjs';

export class InitCommand extends Command {
  constructor() {
    super(initHelp);
  }

  parseArg(arg, args, i, parsed) {
    if (arg === '--file' || arg === '-f') {
      parsed.file = args[i + 1];
      return i + 1;
    } else if (!arg.startsWith('-')) {
      if (!parsed.projectPath) {
        parsed.projectPath = arg;
      }
      return i;
    }
  }

  run(parsed) {
    const projectPath = parsed.projectPath || process.cwd();
    const outputFile = parsed.file || 'template.json';
    const outputPath = join(projectPath, outputFile);

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      console.error(`Error: ${outputFile} already exists. Cannot proceed with template initialization.`);
      process.exit(1);
    }

    console.log(`Generating skeleton template.json${parsed.file ? ` at ${outputFile}` : ''}`);

    const skeleton = {
      schemaVersion: '1.0.0',
      id: 'my-org/my-template',
      name: 'My Template',
      description: 'A template generated with make-template init',
      placeholderFormat: 'unicode',
      placeholders: {
        PACKAGE_NAME: {
          description: 'Package name (used in package.json)',
          default: 'my-awesome-project',
          type: 'text',
          required: true
        }
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(skeleton, null, 2));
    console.log(`Skeleton template.json generated successfully`);

    // Generate .templatize.json configuration (only if it doesn't exist)
    const templatizeConfigPath = join(projectPath, '.templatize.json');
    if (fs.existsSync(templatizeConfigPath)) {
      console.log(`.templatize.json already exists, skipping configuration generation`);
    } else {
      console.log(`Generating .templatize.json configuration file`);
      generateConfigFile(projectPath);
    }

    // Next steps guidance
    console.log(`
Next steps:
1. Edit template.json to customize your template metadata
2. Edit .templatize.json to customize templatization rules (optional)
3. Add your project files to the template
4. Run 'make-template validate' to check your template
5. Use 'make-template convert' to create a template from an existing project`);
  }
}
