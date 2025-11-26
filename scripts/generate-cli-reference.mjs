#!/usr/bin/env node

/**
 * CLI Reference Auto-Generation Script
 *
 * Generates CLI reference documentation from structured help files.
 * Preserves manual narrative content while auto-generating command reference sections.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceBetween } from '../lib/primitives/text.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Replace content between markers in a file (wrapper for file I/O).
 * @param {string} filePath - Path to the file
 * @param {string} start - Start marker
 * @param {string} end - End marker
 * @param {string} block - Replacement content
 */
async function replaceInFile(filePath, start, end, block) {
  const content = await fs.readFile(filePath, 'utf8');
  const updated = replaceBetween(content, start, end, block);
  await fs.writeFile(filePath, updated, 'utf8');
}

const ROOT_DIR = path.resolve(__dirname, '..');
const CLI_REF_PATH = path.join(ROOT_DIR, 'docs', 'reference', 'cli-reference.md');

/**
 * Load help data from all command help files
 */
async function loadHelpFiles() {
  const tools = ['create-scaffold', 'make-template'];
  const helpData = {};

  for (const tool of tools) {
    helpData[tool] = {};

    const commandsDir = path.join(ROOT_DIR, 'bin', tool, 'commands');
    const commandDirs = await fs.readdir(commandsDir);

    for (const cmdDir of commandDirs) {
      const helpPath = path.join(commandsDir, cmdDir, 'help.js');

      try {
        // Check if help.js exists at command level
        await fs.access(helpPath);

        // Dynamic import of help file
        const helpModule = await import(path.resolve(helpPath));
        const helpName = Object.keys(helpModule)[0]; // e.g., 'newHelp', 'convertHelp'
        const helpContent = helpModule[helpName];

        helpData[tool][cmdDir] = helpContent;
      } catch (error) {
        // Check if this is a subcommand structure (like config/init, config/validate)
        try {
          const subCmdDir = path.join(commandsDir, cmdDir);
          const subDirs = await fs.readdir(subCmdDir);

          // Look for subcommand help files
          for (const subDir of subDirs) {
            const subHelpPath = path.join(subCmdDir, subDir, 'help.js');
            try {
              await fs.access(subHelpPath);
              const subHelpModule = await import(path.resolve(subHelpPath));
              const subHelpName = Object.keys(subHelpModule)[0];
              const subHelpContent = subHelpModule[subHelpName];

              // Store as tool.command.subcommand
              if (!helpData[tool][cmdDir]) {
                helpData[tool][cmdDir] = {};
              }
              helpData[tool][cmdDir][subDir] = subHelpContent;
            } catch (_subError) {
              // Skip subcommands without help
            }
          }
        } catch (_subError) {
          console.warn(`Warning: Could not load help for ${tool}/${cmdDir}:`, error.message);
        }
      }
    }
  }

  return helpData;
}

/**
 * Generate markdown for a single command
 */
function generateCommandMarkdown(tool, command, help) {
  // Validate help structure
  if (!help || typeof help !== 'object') {
    console.warn(`Warning: Invalid help structure for ${tool}/${command}`);
    return [`### \`${command}\` - Command help unavailable`, '', 'Command help could not be loaded.', ''];
  }

  if (!help.usage) {
    console.warn(`Warning: Missing usage for ${tool}/${command}`);
    help.usage = `${command} [options]`;
  }

  if (!help.description) {
    console.warn(`Warning: Missing description for ${tool}/${command}`);
    help.description = 'Command description unavailable';
  }

  const lines = [];

  // Command header
  lines.push(`### \`${command}\` - ${help.description}`);
  lines.push('');

  // Description
  if (help.detailedDescription && help.detailedDescription.length > 0) {
    lines.push(...help.detailedDescription);
    lines.push('');
  }

  // Usage
  lines.push('**Usage:**');
  lines.push('');
  lines.push('```bash');
  lines.push(`${tool} ${help.usage}`);
  lines.push('```');
  lines.push('');

  // Arguments (if any in usage)
  const argsMatch = help.usage.match(/<[^>]+>/g);
  if (argsMatch) {
    lines.push('**Arguments:**');
    argsMatch.forEach(arg => {
      const argName = arg.slice(1, -1); // Remove < >
      const description = getArgumentDescription(argName, help);
      lines.push(`- \`${arg}\`: ${description}`);
    });
    lines.push('');
  }

  // Options
  if (help.optionGroups && help.optionGroups.length > 0) {
    lines.push('**Options:**');
    lines.push('');

    // Use table format for options
    lines.push('| Option | Description |');
    lines.push('|--------|-------------|');

    for (const group of help.optionGroups) {
      // Add group header if there are multiple groups
      if (help.optionGroups.length > 1) {
        lines.push(`| **${group.title}** | |`);
      }

      for (const option of group.options) {
        const optionStr = formatOptionString(option);
        const desc = option.desc + (option.detailed ? ` ${option.detailed.join(' ')}` : '');
        lines.push(`| \`${optionStr}\` | ${desc} |`);
      }
    }
    lines.push('');
  }

  // Examples
  if (help.examples && help.examples.length > 0) {
    lines.push('**Examples:**');
    lines.push('');
    for (const example of help.examples) {
      lines.push('```bash');
      lines.push(`# ${example.desc}`);
      lines.push(example.cmd);
      lines.push('```');
      lines.push('');
    }
  }

  // Footer (if present)
  if (help.footer && help.footer.length > 0) {
    lines.push(...help.footer);
    lines.push('');
  }

  return lines.join('\n');
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
 * Get description for an argument
 */
function getArgumentDescription(argName, help) {
  // First, try to find argument descriptions in the help content
  if (help.detailedDescription) {
    // Look for patterns like "project-path: description" or "- project-path: description"
    const argPatterns = [
      new RegExp(`\\b${argName}\\b:\\s*([^\\n.!?]+[.!?]?)`, 'i'),
      new RegExp(`-\\s*${argName}\\b:\\s*([^\\n.!?]+[.!?]?)`, 'i'),
      new RegExp(`${argName}\\b[^\\n]*:\\s*([^\\n.!?]+[.!?]?)`, 'i')
    ];

    for (const pattern of argPatterns) {
      for (const desc of help.detailedDescription) {
        const match = desc.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }

  // Fallback to predefined descriptions
  const descriptions = {
    'project-name': 'Name of the directory to create for your project',
    'project-path': 'Path to the project directory to convert',
    'template-path': 'Path to the template directory to test',
    'template-name': 'Template to use for project creation',
    'config-file': 'Path to configuration file'
  };

  return descriptions[argName] || `The ${argName.replace(/-/g, ' ')}`;
}

/**
 * Generate content for a specific tool
 */
function generateToolContent(tool, helpData) {
  const sections = [];
  sections.push(`## ${tool} Commands`);
  sections.push('');

  for (const [command, help] of Object.entries(helpData)) {
    // Handle subcommands (like config)
    if (typeof help === 'object' && !help.name) {
      // This is a subcommand container (like config: {init: {...}, validate: {...}})
      for (const [subcommand, subHelp] of Object.entries(help)) {
        sections.push(generateCommandMarkdown(tool, `${command} ${subcommand}`, subHelp));
      }
    } else {
      // Regular command
      sections.push(generateCommandMarkdown(tool, command, help));
    }
  }

  return sections;
}

/**
 * Generate the complete CLI reference content
 */
async function generateCliReference() {
  const helpData = await loadHelpFiles();

  // Generate content for each tool separately
  const tools = ['create-scaffold', 'make-template'];

  for (const tool of tools) {
    const toolContent = generateToolContent(tool, helpData[tool]);
    const startMarker = `<!-- AUTO-GENERATED: ${tool} commands -->`;
    const endMarker = `<!-- END AUTO-GENERATED: ${tool} commands -->`;

    await replaceInFile(CLI_REF_PATH, startMarker, endMarker, toolContent);
  }
  console.log('✅ CLI reference updated successfully');
}

/**
 * Main execution
 */
async function main() {
  try {
    await generateCliReference();
    console.log('🎉 CLI reference generation complete!');
  } catch (error) {
    console.error('❌ Error generating CLI reference:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateCliReference, loadHelpFiles, generateCommandMarkdown };
