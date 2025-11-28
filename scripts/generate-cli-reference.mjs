#!/usr/bin/env node

/**
 * CLI Reference Documentation Generator
 *
 * Generates per-command markdown files from structured help.mts files.
 * Output: docs/reference/commands/{domain}/{command}.md
 *
 * Source of truth: bin/create/domains/{domain}/commands/{command}/help.mts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT_DIR, 'docs', 'reference', 'commands');

/**
 * Load help data from all command help files
 */
async function loadHelpFiles() {
  const domains = [
    { name: 'scaffold', path: 'bin/create/domains/scaffold/commands' },
    { name: 'template', path: 'bin/create/domains/template/commands' }
  ];
  const helpData = {};

  for (const domain of domains) {
    helpData[domain.name] = {};

    const commandsDir = path.join(ROOT_DIR, domain.path);
    const commandDirs = await fs.readdir(commandsDir);

    for (const cmdDir of commandDirs) {
      const helpPath = path.join(commandsDir, cmdDir, 'help.mts');

      try {
        // Check if help.mts exists at command level
        await fs.access(helpPath);

        // Dynamic import of help file
        const helpModule = await import(path.resolve(helpPath));
        const helpName = Object.keys(helpModule)[0]; // e.g., 'newHelp', 'convertHelp'
        const helpContent = helpModule[helpName];

        helpData[domain.name][cmdDir] = helpContent;
      } catch (error) {
        // Check if this is a subcommand structure (like config/validate)
        try {
          const subCmdDir = path.join(commandsDir, cmdDir);
          const subDirs = await fs.readdir(subCmdDir);

          // Look for subcommand help files
          for (const subDir of subDirs) {
            const subHelpPath = path.join(subCmdDir, subDir, 'help.mts');
            try {
              await fs.access(subHelpPath);
              const subHelpModule = await import(path.resolve(subHelpPath));
              const subHelpName = Object.keys(subHelpModule)[0];
              const subHelpContent = subHelpModule[subHelpName];

              // Store as "command-subcommand" (e.g., "config-validate")
              helpData[domain.name][`${cmdDir}-${subDir}`] = subHelpContent;
            } catch (_subError) {
              // Skip subcommands without help
            }
          }
        } catch (_dirError) {
          console.warn(`Warning: Could not load help for ${domain.name}/${cmdDir}:`, error.message);
        }
      }
    }
  }

  return helpData;
}

/**
 * Format option string for display
 */
function formatOptionString(option) {
  const parts = [];

  if (option.short) {
    parts.push(`${option.short},`);
  }

  parts.push(option.long);

  if (option.value) {
    parts.push(option.value);
  }

  return parts.join(' ');
}

/**
 * Get list of related commands for "See Also" section
 */
function getRelatedCommands(tool, currentCommand, allCommands) {
  const related = [];

  // Common command relationships
  const relationships = {
    'create-scaffold': {
      new: ['list', 'validate'],
      list: ['new', 'validate'],
      validate: ['new', 'list']
    },
    'make-template': {
      init: ['convert', 'config-validate'],
      convert: ['init', 'restore', 'config-validate'],
      restore: ['convert', 'init'],
      validate: ['init', 'config-validate'],
      hints: ['init', 'convert'],
      test: ['validate', 'convert'],
      'config-validate': ['init', 'convert', 'validate']
    }
  };

  const commandRelations = relationships[tool]?.[currentCommand] || [];

  for (const rel of commandRelations) {
    if (allCommands.includes(rel)) {
      related.push(rel);
    }
  }

  return related;
}

/**
 * Generate markdown content for a single command
 */
function generateCommandMarkdown(tool, command, help, allCommands) {
  const lines = [];

  // Title
  const displayCommand = command.replace('-', ' '); // config-validate -> config validate
  lines.push(`# ${tool} ${displayCommand}`);
  lines.push('');

  // Description
  lines.push(help.description);
  lines.push('');

  // Usage
  lines.push('## Usage');
  lines.push('');
  lines.push('```bash');
  lines.push(`${tool} ${help.usage}`);
  lines.push('```');
  lines.push('');

  // Detailed description
  if (help.detailedDescription && help.detailedDescription.length > 0) {
    lines.push('## Description');
    lines.push('');
    for (const para of help.detailedDescription) {
      if (para.startsWith('  ')) {
        // Indented content - likely a list
        lines.push(para);
      } else if (para === '') {
        lines.push('');
      } else {
        lines.push(para);
      }
    }
    lines.push('');
  }

  // Options
  if (help.optionGroups && help.optionGroups.length > 0) {
    lines.push('## Options');
    lines.push('');

    for (const group of help.optionGroups) {
      if (help.optionGroups.length > 1 && group.title) {
        lines.push(`### ${group.title}`);
        lines.push('');
      }

      if (group.options && group.options.length > 0) {
        lines.push('| Option | Description |');
        lines.push('|--------|-------------|');

        for (const option of group.options) {
          const optionStr = formatOptionString(option);
          lines.push(`| \`${optionStr}\` | ${option.desc} |`);
        }
        lines.push('');

        // Add detailed explanations if present
        for (const option of group.options) {
          if (option.detailed && option.detailed.length > 0) {
            lines.push(...option.detailed);
            lines.push('');
          }
        }
      }
    }
  }

  // Examples
  if (help.examples && help.examples.length > 0) {
    lines.push('## Examples');
    lines.push('');
    lines.push('```bash');
    for (const example of help.examples) {
      lines.push(`# ${example.desc}`);
      lines.push(`${tool} ${example.cmd}`);
      lines.push('');
    }
    // Remove trailing empty line inside code block
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    lines.push('```');
    lines.push('');
  }

  // Footer (workflow tips, etc.)
  if (help.footer && help.footer.length > 0) {
    lines.push('## Notes');
    lines.push('');
    for (const line of help.footer) {
      lines.push(line);
    }
    lines.push('');
  }

  // See Also
  const related = getRelatedCommands(tool, command, allCommands);
  if (related.length > 0) {
    lines.push('## See Also');
    lines.push('');
    for (const rel of related) {
      const relDisplay = rel.replace('-', ' ');
      lines.push(`- [${relDisplay}](./${rel}.md)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate all command documentation files
 */
async function generateCommandDocs() {
  const helpData = await loadHelpFiles();

  let generated = 0;
  let errors = 0;

  for (const [tool, commands] of Object.entries(helpData)) {
    const toolDir = path.join(COMMANDS_DIR, tool);
    const allCommands = Object.keys(commands);

    // Ensure tool directory exists
    await fs.mkdir(toolDir, { recursive: true });

    for (const [command, help] of Object.entries(commands)) {
      const outputPath = path.join(toolDir, `${command}.md`);

      try {
        const content = generateCommandMarkdown(tool, command, help, allCommands);
        await fs.writeFile(outputPath, content, 'utf8');
        console.log(`  ✓ ${tool}/${command}.md`);
        generated++;
      } catch (error) {
        console.error(`  ✗ ${tool}/${command}: ${error.message}`);
        errors++;
      }
    }
  }

  return { generated, errors };
}

/**
 * Main execution
 */
async function main() {
  console.log('Generating CLI command documentation...\n');

  try {
    const { generated, errors } = await generateCommandDocs();

    console.log('');
    console.log(`✅ Generated ${generated} command files`);

    if (errors > 0) {
      console.log(`⚠️  ${errors} errors occurred`);
    }

    console.log('');
    console.log('Output: docs/reference/commands/{domain}/{command}.md');
    console.log('');
    console.log('Note: Do not edit generated files directly.');
    console.log('Edit source help.mts files in bin/create/domains/{domain}/commands/{command}/');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateCommandDocs, loadHelpFiles, generateCommandMarkdown };
