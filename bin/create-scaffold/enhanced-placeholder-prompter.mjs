#!/usr/bin/env node

import { resolvePlaceholders, PlaceholderResolutionError } from './placeholder-resolver.mjs';
import { sanitizeErrorMessage } from '../../lib/shared/security.mjs';

/**
 * Enhanced interactive placeholder prompting with validation, dependencies, and multi-step workflows
 */
export class EnhancedPlaceholderPrompter {
  constructor({
    promptAdapter,
    logger,
    maxAttempts = 3
  }) {
    this.prompt = promptAdapter;
    this.logger = logger;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Resolve placeholders with enhanced interactive prompting
   */
  async resolvePlaceholdersEnhanced({
    definitions = [],
    flagInputs = [],
    configDefaults = [],
    env = process.env,
    templateMetadata = {}
  }) {
    if (!Array.isArray(definitions) || definitions.length === 0) {
      return {
        values: Object.freeze({}),
        report: Object.freeze([]),
        unknownTokens: Object.freeze([])
      };
    }

    // Group placeholders by dependencies and logical groupings
    const groups = this.#groupPlaceholdersByWorkflow(definitions, templateMetadata);

    const allResolved = new Map();
    const allSources = new Map();

    // Process each group in order
    for (const group of groups) {
      const groupResult = await this.#resolveGroupInteractively(
        group,
        definitions,
        flagInputs,
        configDefaults,
        env,
        allResolved,
        templateMetadata
      );

      // Merge results
      for (const [token, value] of groupResult.values) {
        allResolved.set(token, value);
      }
      for (const [token, source] of groupResult.sources) {
        allSources.set(token, source);
      }
    }

    // Build final report
    const valuesObject = Object.create(null);
    const reportEntries = [];

    for (const definition of definitions) {
      if (!allResolved.has(definition.token)) {
        continue;
      }

      const value = allResolved.get(definition.token);
      valuesObject[definition.token] = value;
      reportEntries.push(Object.freeze({
        token: definition.token,
        source: allSources.get(definition.token) ?? 'default',
        sensitive: definition.sensitive === true,
        value
      }));
    }

    return {
      values: Object.freeze(valuesObject),
      report: Object.freeze(reportEntries),
      unknownTokens: Object.freeze([])
    };
  }

  /**
   * Group placeholders into logical workflow steps
   */
  #groupPlaceholdersByWorkflow(definitions, templateMetadata) {
    const groups = [];
    const processed = new Set();

    // Group 1: Project identity (name, description, author)
    const identityTokens = ['PROJECT_NAME', 'PROJECT_DESCRIPTION', 'AUTHOR_NAME', 'AUTHOR_EMAIL'];
    const identityGroup = definitions.filter(d =>
      identityTokens.includes(d.token) && !processed.has(d.token)
    );
    if (identityGroup.length > 0) {
      groups.push({
        name: 'Project Identity',
        description: 'Basic project information',
        placeholders: identityGroup,
        priority: 1
      });
      identityGroup.forEach(d => processed.add(d.token));
    }

    // Group 2: Technology choices (framework, language, runtime)
    const techTokens = ['FRAMEWORK', 'LANGUAGE', 'RUNTIME', 'PACKAGE_MANAGER'];
    const techGroup = definitions.filter(d =>
      techTokens.includes(d.token) && !processed.has(d.token)
    );
    if (techGroup.length > 0) {
      groups.push({
        name: 'Technology Stack',
        description: 'Choose your technology preferences',
        placeholders: techGroup,
        priority: 2
      });
      techGroup.forEach(d => processed.add(d.token));
    }

    // Group 3: Configuration (ports, databases, APIs)
    const configTokens = ['PORT', 'DATABASE_URL', 'API_KEY', 'SECRET_KEY'];
    const configGroup = definitions.filter(d =>
      configTokens.some(token => d.token.includes(token)) && !processed.has(d.token)
    );
    if (configGroup.length > 0) {
      groups.push({
        name: 'Configuration',
        description: 'Configure services and connections',
        placeholders: configGroup,
        priority: 3
      });
      configGroup.forEach(d => processed.add(d.token));
    }

    // Group 4: Everything else
    const remaining = definitions.filter(d => !processed.has(d.token));
    if (remaining.length > 0) {
      groups.push({
        name: 'Additional Settings',
        description: 'Additional configuration options',
        placeholders: remaining,
        priority: 4
      });
    }

    return groups.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Resolve a group of placeholders interactively
   */
  async #resolveGroupInteractively(
    group,
    allDefinitions,
    flagInputs,
    configDefaults,
    env,
    previouslyResolved,
    templateMetadata
  ) {
    await this.prompt.write(`\n📋 ${group.name}\n`);
    await this.prompt.write(`${group.description}\n\n`);

    const groupValues = new Map();
    const groupSources = new Map();

    // First pass: resolve non-interactive values
    const basicResult = await resolvePlaceholders({
      definitions: group.placeholders,
      flagInputs,
      configDefaults,
      env,
      interactive: false,
      noInputPrompts: true
    });

    // Merge basic resolutions
    for (const entry of basicResult.report) {
      groupValues.set(entry.token, entry.value);
      groupSources.set(entry.token, entry.source);
    }

    // Interactive pass for missing required values
    const missingRequired = group.placeholders.filter(p =>
      p.required && !groupValues.has(p.token)
    );

    if (missingRequired.length > 0) {
      await this.prompt.write(`Please provide values for the following:\n\n`);

      for (const placeholder of missingRequired) {
        const value = await this.#promptForPlaceholder(
          placeholder,
          previouslyResolved,
          templateMetadata
        );
        groupValues.set(placeholder.token, value);
        groupSources.set(placeholder.token, 'prompt');
      }
    }

    // Optional values - offer to configure
    const missingOptional = group.placeholders.filter(p =>
      !p.required && !groupValues.has(p.token)
    );

    if (missingOptional.length > 0) {
      const configureOptional = await this.#promptYesNo(
        `\nWould you like to configure optional ${group.name.toLowerCase()} settings?`,
        false
      );

      if (configureOptional) {
        for (const placeholder of missingOptional) {
          const value = await this.#promptForPlaceholder(
            placeholder,
            previouslyResolved,
            templateMetadata
          );
          groupValues.set(placeholder.token, value);
          groupSources.set(placeholder.token, 'prompt');
        }
      }
    }

    return { values: groupValues, sources: groupSources };
  }

  /**
   * Prompt for a single placeholder with enhanced UX
   */
  async #promptForPlaceholder(placeholder, resolvedContext, templateMetadata) {
    const suggestions = this.#getSmartSuggestions(placeholder, resolvedContext, templateMetadata);

    await this.prompt.write(`\n${'─'.repeat(50)}\n`);

    // Show description and context
    if (placeholder.description) {
      await this.prompt.write(`📝 ${placeholder.description}\n`);
    }

    await this.prompt.write(`🔸 ${placeholder.token} (${placeholder.type}${placeholder.required ? ' - required' : ' - optional'})`);

    if (placeholder.defaultValue !== null && placeholder.defaultValue !== undefined) {
      await this.prompt.write(` [default: ${placeholder.defaultValue}]`);
    }
    await this.prompt.write('\n');

    // Show smart suggestions
    if (suggestions.length > 0) {
      await this.prompt.write('\n💡 Suggestions:\n');
      for (let i = 0; i < suggestions.length; i++) {
        await this.prompt.write(`   ${i + 1}. ${suggestions[i]}\n`);
      }
      await this.prompt.write('\n');
    }

    // Prompt with validation
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        let promptText = `Enter ${placeholder.token}`;
        if (placeholder.defaultValue !== null && placeholder.defaultValue !== undefined) {
          promptText += ` (press enter for default)`;
        }
        if (suggestions.length > 0) {
          promptText += ` (or number for suggestion)`;
        }
        promptText += ': ';

        const input = (await this.prompt.question(promptText)).trim();

        // Handle empty input with default
        if (!input && placeholder.defaultValue !== null && placeholder.defaultValue !== undefined) {
          return placeholder.defaultValue;
        }

        // Handle suggestion selection
        if (suggestions.length > 0 && /^\d+$/.test(input)) {
          const index = parseInt(input, 10) - 1;
          if (index >= 0 && index < suggestions.length) {
            return suggestions[index];
          }
        }

        // Validate and coerce the input
        const value = this.#validateAndCoerceInput(input, placeholder);

        // Additional validation based on context
        this.#validateContextualConstraints(value, placeholder, resolvedContext);

        return value;

      } catch (error) {
        const message = sanitizeErrorMessage(error.message);
        await this.prompt.write(`❌ ${message}\n`);

        if (attempt === this.maxAttempts) {
          if (placeholder.defaultValue !== null && placeholder.defaultValue !== undefined) {
            await this.prompt.write(`Using default value: ${placeholder.defaultValue}\n`);
            return placeholder.defaultValue;
          }
          throw new PlaceholderResolutionError(`Failed to get valid input for ${placeholder.token} after ${this.maxAttempts} attempts`);
        }

        await this.prompt.write(`Please try again (${this.maxAttempts - attempt} attempts remaining).\n`);
      }
    }
  }

  /**
   * Get smart suggestions based on placeholder type and context
   */
  #getSmartSuggestions(placeholder, resolvedContext, templateMetadata) {
    const suggestions = [];

    switch (placeholder.token) {
      case 'PROJECT_NAME':
        suggestions.push('my-awesome-project', 'project-name', 'app-name');
        break;

      case 'AUTHOR_NAME':
        suggestions.push('Your Name', 'John Doe', 'Jane Smith');
        break;

      case 'AUTHOR_EMAIL':
        suggestions.push('your.email@example.com', 'user@domain.com');
        break;

      case 'FRAMEWORK':
        suggestions.push('express', 'fastify', 'koa', 'hapi');
        break;

      case 'LANGUAGE':
        suggestions.push('javascript', 'typescript', 'python', 'java');
        break;

      case 'RUNTIME':
        suggestions.push('node', 'bun', 'deno');
        break;

      case 'PACKAGE_MANAGER':
        suggestions.push('npm', 'yarn', 'pnpm', 'bun');
        break;

      case 'PORT':
        suggestions.push('3000', '8080', '5000', '4000');
        break;

      case 'DATABASE_URL':
        suggestions.push('postgresql://localhost:5432/db', 'mongodb://localhost:27017/db', 'sqlite://./database.db');
        break;
    }

    // Add template-specific suggestions from metadata
    if (templateMetadata.suggestions && templateMetadata.suggestions[placeholder.token]) {
      suggestions.unshift(...templateMetadata.suggestions[placeholder.token]);
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Validate and coerce input based on placeholder type
   */
  #validateAndCoerceInput(input, placeholder) {
    if (!input && placeholder.required) {
      throw new Error('This field is required');
    }

    switch (placeholder.type) {
      case 'number':
        const num = Number(input);
        if (isNaN(num)) {
          throw new Error('Must be a valid number');
        }
        return num;

      case 'boolean':
        const lower = input.toLowerCase();
        if (['true', '1', 'yes', 'y'].includes(lower)) return true;
        if (['false', '0', 'no', 'n'].includes(lower)) return false;
        throw new Error('Must be true/false, yes/no, or 1/0');

      case 'string':
      default:
        if (placeholder.token === 'AUTHOR_EMAIL' && input) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input)) {
            throw new Error('Must be a valid email address');
          }
        }
        return input;
    }
  }

  /**
   * Validate contextual constraints between placeholders
   */
  #validateContextualConstraints(value, placeholder, resolvedContext) {
    // Example: If using TypeScript, ensure compatible runtime
    if (placeholder.token === 'LANGUAGE' && value === 'typescript') {
      const runtime = resolvedContext.get('RUNTIME');
      if (runtime && !['node', 'bun'].includes(runtime)) {
        throw new Error('TypeScript requires Node.js or Bun runtime');
      }
    }

    // Example: Port validation
    if (placeholder.token === 'PORT') {
      const port = parseInt(value, 10);
      if (port < 1 || port > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }
    }
  }

  /**
   * Enhanced yes/no prompt
   */
  async #promptYesNo(question, defaultValue = false) {
    const defaultText = defaultValue ? '[Y/n]' : '[y/N]';

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const answer = (await this.prompt.question(`${question} ${defaultText} `)).trim().toLowerCase();

      if (!answer) {
        return defaultValue;
      }

      if (['y', 'yes', '1', 'true'].includes(answer)) {
        return true;
      }

      if (['n', 'no', '0', 'false'].includes(answer)) {
        return false;
      }

      await this.prompt.write('Please answer yes or no.\n');
    }

    return defaultValue;
  }
}