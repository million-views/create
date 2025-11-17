import { Command } from '../../../../lib/cli/command.js';
import { initHelp } from './help.js';
import fs from 'fs';
import { join } from 'path';

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
      id: '',
      name: '',
      description: '',
      tags: [],
      author: '',
      license: '',
      setup: {
        dimensions: {
          deployment: {
            type: 'single',
            values: ['cloudflare-workers', 'linode', 'droplet', 'deno-deploy'],
            default: 'cloudflare-workers'
          },
          features: {
            type: 'multi',
            values: [],
            default: []
          },
          database: {
            type: 'single',
            values: ['d1', 'tursodb', 'sqlite3', 'none'],
            default: 'none'
          },
          storage: {
            type: 'single',
            values: ['r2', 's3', 'file', 'none'],
            default: 'none'
          },
          auth: {
            type: 'multi',
            values: ['google', 'github'],
            default: []
          },
          payments: {
            type: 'single',
            values: ['stripe', 'hyperswitch', 'none'],
            default: 'none'
          },
          analytics: {
            type: 'single',
            values: ['umami', 'plausible', 'none'],
            default: 'none'
          }
        },
        gates: {
          deployment: {}
        },
        policy: 'strict'
      },
      featureSpecs: [],
      constants: {},
      hints: {}
    };

    fs.writeFileSync(outputPath, JSON.stringify(skeleton, null, 2));
    console.log(`Skeleton template.json generated successfully`);

    // Next steps guidance
    console.log(`
Next steps:
1. Edit template.json to customize your template
2. Add your project files to the template
3. Run 'make-template validate' to check your template
4. Use 'make-template convert' to create a template from an existing project`);
  }
}
