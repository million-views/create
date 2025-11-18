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
    }
  }

  run(parsed) {
    const outputFile = parsed.file || 'template.json';
    const outputPath = join(process.cwd(), outputFile);

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
      placeholders: {
        PROJECT_NAME: {
          default: 'my-awesome-project',
          description: 'Name of the generated project'
        }
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(skeleton, null, 2));
    console.log(`Skeleton template.json generated successfully`);

    // Generate .templatize.json configuration
    console.log(`Generating .templatize.json configuration file`);
    generateConfigFile(process.cwd());

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
