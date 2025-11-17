/**
 * CLI Help Utilities
 * Shared utilities for building consistent CLI help structures
 */

/**
 * Standard option definitions for common CLI patterns
 */
export const standardOptions = {
  suggest: {
    long: '--suggest',
    desc: 'Show intelligent fix suggestions',
    detailed: ['Provide suggestions for fixing validation errors']
  },

  fix: {
    long: '--fix',
    desc: 'Auto-apply safe fixes',
    detailed: [
      'Automatically fix issues that can be safely corrected.',
      'Manual review recommended after automated fixes.'
    ]
  },

  file: {
    short: '-f',
    long: '--file',
    value: '<path>',
    desc: 'Specify input file path',
    detailed: ['Custom path to configuration file']
  },

  json: {
    long: '--json',
    desc: 'Output results in JSON format',
    detailed: ['Machine-readable output for automation']
  },

  verbose: {
    short: '-v',
    long: '--verbose',
    desc: 'Show detailed output',
    detailed: ['Display additional information and debug details']
  }
};

/**
 * Standard example patterns
 */
export const examplePatterns = {
  basicValidation: (command, target) => ({
    cmd: `${command} ${target}`,
    desc: `Validate ${target} in current directory`
  }),

  fileValidation: (command, file) => ({
    cmd: `${command} --file ${file}`,
    desc: 'Validate specific file'
  }),

  pathValidation: (command, path) => ({
    cmd: `${command} ${path}`,
    desc: 'Validate template in directory'
  }),

  withSuggestions: (command, target) => ({
    cmd: `${command} ${target} --suggest`,
    desc: 'Get fix suggestions'
  }),

  withFix: (command, target) => ({
    cmd: `${command} ${target} --fix`,
    desc: 'Auto-fix safe issues'
  })
};

/**
 * Build option groups for validate commands
 */
export function buildValidateOptions(includeFile = false, includeJson = false) {
  const options = [standardOptions.suggest, standardOptions.fix];

  if (includeFile) {
    options.unshift(standardOptions.file);
  }

  if (includeJson) {
    options.push(standardOptions.json);
  }

  return [{
    title: 'Options',
    options
  }];
};

/**
 * Build examples for validate commands
 */
export function buildValidateExamples(command, target, includeFileExamples = false) {
  const examples = [];

  if (includeFileExamples) {
    examples.push(examplePatterns.basicValidation(command, target));
    examples.push(examplePatterns.fileValidation(command, 'my-template.json'));
  } else {
    examples.push(examplePatterns.pathValidation(command, './my-template'));
    examples.push({
      cmd: `${command} ./template.json`,
      desc: 'Validate template configuration file'
    });
  }

  examples.push(examplePatterns.withSuggestions(command, includeFileExamples ? `--file ${target}` : './my-template'));
  examples.push(examplePatterns.withFix(command, includeFileExamples ? `--file ${target}` : './my-template'));

  return examples;
};

/**
 * Build standard validate help structure
 */
export function buildValidateHelp(config) {
  const {
    name,
    usage,
    description,
    detailedDescription,
    includeFile = false,
    includeJson = false,
    target = 'template.json'
  } = config;

  return {
    name,
    usage,
    description,
    detailedDescription,
    optionGroups: buildValidateOptions(includeFile, includeJson),
    examples: buildValidateExamples(name, target, includeFile)
  };
};