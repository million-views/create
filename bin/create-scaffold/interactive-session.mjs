#!/usr/bin/env node

import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';
import process, { stdin as defaultStdin, stdout as defaultStdout } from 'node:process';
import { TemplateDiscovery } from '../../lib/shared/utils/template-discovery.mjs';
import {
  sanitizeErrorMessage,
  ValidationError,
  validateProjectDirectory
} from '../../lib/shared/security.mjs';
import { resolvePlaceholders, PlaceholderResolutionError } from './placeholder-resolver.mjs';
import { EnhancedPlaceholderPrompter } from './enhanced-placeholder-prompter.mjs';

const MAX_PROMPT_ATTEMPTS = 3;
const CANCEL_INPUTS = new Set(['q', 'quit', 'exit']);

export class InteractiveSession {
  constructor({
    cacheManager,
    logger,
    defaults = {},
    env = process.env,
    promptAdapter,
    configurationProvider,
    stdin = defaultStdin,
    stdout = defaultStdout,
    templateDiscovery
  }) {
    if (!cacheManager) {
      throw new Error('InteractiveSession requires a cacheManager instance');
    }

    this.cacheManager = cacheManager;
    this.logger = logger;
    this.defaults = {
      repo: defaults.repo ?? null,
      branch: defaults.branch ?? null
    };
    this.env = env ?? process.env;
    this.configurationProvider = configurationProvider;
    this.prompt = promptAdapter ?? createPrompt({ stdin, stdout });
    this.ownsPrompt = !promptAdapter;
    this.discovery = templateDiscovery ?? new TemplateDiscovery(cacheManager);
    this.enhancedPrompter = new EnhancedPlaceholderPrompter({
      promptAdapter: this.prompt,
      logger: this.logger
    });
    this.cachedConfiguration = null;
    this.configurationLoaded = false;
  }

  async collectInputs(initialArgs = {}) {
    await this.prompt.write('\n✨ Interactive mode enabled. Press Ctrl+C to exit at any time.\n');

    try {
      const defaults = await this.#resolveDefaults(initialArgs);
      this.logger.debug('initialArgs:', initialArgs);
      this.logger.debug('defaults:', defaults);
      this.logger.debug('this.defaults:', this.defaults);
      const repo = defaults.repoUrl ?? this.defaults.repo;
      this.logger.debug('repo:', repo);
      const branch = defaults.branchName ?? this.defaults.branch ?? null;

      if (!repo) {
        throw new ValidationError('Interactive mode requires a template repository', 'repo');
      }

      let cachePath;
      try {
        cachePath = await ensureRepositoryCached({
          repoUrl: repo,
          branchName: branch,
          cacheManager: this.cacheManager,
          logger: this.logger,
          cacheTtl: initialArgs.cacheTtl
        });
      } catch (error) {
        const message = sanitizeErrorMessage(error.message);
        throw new ValidationError(`Interactive mode failed to access repository: ${message}`, 'repo');
      }

      const catalog = await this.#loadCatalog(cachePath);

      if (!Array.isArray(catalog) || catalog.length === 0) {
        throw new ValidationError('Interactive mode cannot continue: no templates available.', 'template');
      }

      const selection = await this.#promptTemplateSelection(catalog);
      if (!selection) {
        return { cancelled: true };
      }

      const projectDirectory = await this.#promptProjectDirectory(initialArgs.projectDirectory);

      const answers = {
        projectDirectory,
        template: selection.handle ?? selection.name,
        repo,
        branch,
        ide: initialArgs.ide ?? null,
        options: this.#normalizeOptions(initialArgs.options),
        logFile: initialArgs.logFile ?? null,
        noCache: Boolean(initialArgs.noCache),
        cacheTtl: initialArgs.cacheTtl ?? null,
        placeholders: [...(initialArgs.placeholders ?? [])],
        experimentalPlaceholderPrompts: Boolean(initialArgs.experimentalPlaceholderPrompts),
        dryRun: false,
        listTemplates: false
      };

      if (!initialArgs.repo && !initialArgs.template) {
        answers.repo = await this.#promptOptionalText('Repository (owner/name or URL)', answers.repo);
      }

      if (!initialArgs.branch) {
        answers.branch = await this.#promptOptionalText('Branch (press enter for default)', answers.branch);
      }

      if (!initialArgs.ide) {
        answers.ide = await this.#promptOptionalText('Target IDE (press enter to skip)', null);
      }

      if (!initialArgs.options) {
        const optionsInput = await this.#promptOptionalText(
          'Options (comma-separated, press enter to skip)',
          null
        );
        answers.options = this.#normalizeOptions(optionsInput);
      }

      if (!initialArgs.logFile) {
        answers.logFile = await this.#promptOptionalText('Log file path (press enter to skip)', null);
      }

      if (!initialArgs.cacheTtl) {
        answers.cacheTtl = await this.#promptOptionalText('Cache TTL in hours (press enter for default)', null);
      }

      if (!initialArgs.experimentalPlaceholderPrompts) {
        answers.experimentalPlaceholderPrompts = await this.#promptYesNo(
          'Enable experimental placeholder prompts?',
          answers.experimentalPlaceholderPrompts
        );
      }

      if (answers.experimentalPlaceholderPrompts && selection.placeholders.length > 0) {
        const resolution = await this.enhancedPrompter.resolvePlaceholdersEnhanced({
          definitions: selection.placeholders,
          flagInputs: answers.placeholders,
          env: this.env,
          templateMetadata: selection
        });
        answers.placeholders = resolution.placeholders;
      }

      return answers;
    } finally {
      if (this.ownsPrompt && typeof this.prompt.close === 'function') {
        await this.prompt.close();
      }
    }
  }

  async #resolveDefaults(initialArgs) {
    if (initialArgs.repo || initialArgs.branch || initialArgs.template) {
      return {
        repoUrl: initialArgs.repo ?? initialArgs.template ?? this.defaults.repo,
        branchName: initialArgs.branch ?? this.defaults.branch ?? null
      };
    }

    const config = await this.#getConfiguration();
    if (config?.repo) {
      return {
        repoUrl: config.repo,
        branchName: config.branch ?? null
      };
    }

    return {
      repoUrl: this.defaults.repo,
      branchName: this.defaults.branch ?? null
    };
  }

  async #loadCatalog(cachePath) {
    try {
      const templates = await this.discovery.listTemplatesFromPath(cachePath);
      const formatted = typeof this.discovery.formatTemplateOptions === 'function'
        ? this.discovery.formatTemplateOptions(templates)
        : templates.map((template, index) => ({
          id: index + 1,
          name: template.name,
          handle: template.handle,
          description: template.description ?? 'No description available',
          tags: Array.isArray(template.tags) ? template.tags : [],
          canonicalVariables: Array.isArray(template.canonicalVariables) ? template.canonicalVariables : [],
          handoffSteps: Array.isArray(template.handoff) ? template.handoff : [],
          placeholders: Array.isArray(template.placeholders) ? template.placeholders : []
        }));

      return formatted;
    } catch (error) {
      const message = sanitizeErrorMessage(error.message);
      if (this.logger?.logError) {
        await this.logger.logError(error, { operation: 'interactive_catalog_load' });
      }
      throw new ValidationError(`Interactive mode failed to load templates: ${message}`, 'template');
    }
  }

  async #promptTemplateSelection(catalog) {
    const lines = catalog.map((entry) => {
      const description = entry.description || 'No description available';
      const tags = entry.tags.length > 0 ? `  Tags: ${entry.tags.join(', ')}` : '';
      const canonical = entry.canonicalVariables.length > 0
        ? `  Canonical variables: ${entry.canonicalVariables.join(', ')}`
        : '';
      return `${entry.id}. ${entry.name}\n    ${description}${tags ? `\n    ${tags}` : ''}${canonical ? `\n    ${canonical}` : ''}`;
    }).join('\n\n');

    await this.prompt.write(`\nAvailable templates:\n\n${lines}\n\n`);

    for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt += 1) {
      const answer = (await this.prompt.question('Select a template (number or q to cancel): ')).trim();

      if (CANCEL_INPUTS.has(answer.toLowerCase())) {
        return null;
      }

      const parsed = Number.parseInt(answer, 10);
      const selected = Number.isFinite(parsed)
        ? catalog.find((entry) => entry.id === parsed)
        : undefined;

      if (selected) {
        return selected;
      }

      await this.prompt.write('Invalid selection. Please enter one of the listed numbers.\n');
    }

    throw new ValidationError('Interactive mode aborted: template selection failed.', 'template');
  }

  async #promptProjectDirectory(provided) {
    if (provided) {
      const validated = validateProjectDirectory(provided);
      await checkDirectoryAvailability(validated);
      return validated;
    }

    for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt += 1) {
      const answer = (await this.prompt.question('Project directory name: ')).trim();

      if (answer.length === 0) {
        await this.prompt.write('Project directory is required.\n');
        continue;
      }

      try {
        const validated = validateProjectDirectory(answer);
        await checkDirectoryAvailability(validated);
        return validated;
      } catch (error) {
        const message = sanitizeErrorMessage(error.message);
        await this.prompt.write(`Directory validation failed: ${message}\n`);
      }
    }

    throw new ValidationError('Interactive mode aborted: could not determine project directory.', 'projectDirectory');
  }

  async #promptOptionalText(message, current) {
    const suffix = current ? ` [${current}]` : '';
    const answer = (await this.prompt.question(`${message}${suffix}: `)).trim();
    if (!answer) {
      return current ?? null;
    }
    return answer;
  }

  async #promptYesNo(message, current) {
    const suffix = current ? ' [Y/n]' : ' [y/N]';

    for (let attempt = 0; attempt < MAX_PROMPT_ATTEMPTS; attempt += 1) {
      const answer = (await this.prompt.question(`${message}${suffix} `)).trim().toLowerCase();

      if (!answer) {
        return current;
      }

      if (['y', 'yes', '1', 'true'].includes(answer)) {
        return true;
      }

      if (['n', 'no', '0', 'false'].includes(answer)) {
        return false;
      }

      await this.prompt.write('Please respond with yes or no.\n');
    }

    return current;
  }

  async #resolvePlaceholdersInteractively(definitions, answers) {
    const config = await this.#getConfiguration();
    const configDefaults = Array.isArray(config?.placeholders) ? config.placeholders : [];

    try {
      const resolution = await resolvePlaceholders({
        definitions,
        flagInputs: answers.placeholders,
        configDefaults,
        env: this.env,
        interactive: true,
        promptAdapter: async ({ placeholder }) => {
          const descriptor = placeholder.description
            ? `${placeholder.description} [${placeholder.token}]`
            : `Enter value for ${placeholder.token}`;
          return this.prompt.question(`${descriptor}: `);
        }
      });

      return {
        placeholders: Object.entries(resolution.values).map(([token, value]) => `${token}=${value}`)
      };
    } catch (error) {
      if (error instanceof PlaceholderResolutionError) {
        throw new ValidationError(error.message, 'metadata.placeholders');
      }
      throw error;
    }
  }

  #normalizeOptions(options) {
    if (options === undefined || options === null) {
      return null;
    }

    if (Array.isArray(options)) {
      return options.join(',');
    }

    const trimmed = String(options).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async #getConfiguration() {
    if (!this.configurationProvider || typeof this.configurationProvider.load !== 'function') {
      return null;
    }

    if (this.configurationLoaded) {
      return this.cachedConfiguration;
    }

    try {
      const config = await this.configurationProvider.load();
      this.cachedConfiguration = config ?? null;
    } catch (error) {
      this.cachedConfiguration = null;
      if (this.logger?.logError) {
        await this.logger.logError(error, { operation: 'interactive_config_load' });
      }
    } finally {
      this.configurationLoaded = true;
    }

    return this.cachedConfiguration;
  }
}

function createPrompt({ stdin, stdout }) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  return {
    async question(message) {
      return rl.question(message);
    },
    async write(message) {
      stdout.write(message);
    },
    async close() {
      rl.close();
    }
  };
}

async function ensureRepositoryCached({ repoUrl, branchName, cacheManager, logger, cacheTtl }) {
  const cachedRepoPath = await cacheManager.getCachedRepo(repoUrl, branchName);

  if (cachedRepoPath) {
    if (logger?.logOperation) {
      await logger.logOperation('cache_hit', {
        repoUrl,
        branchName,
        cachedPath: cachedRepoPath
      });
    }
    return cachedRepoPath;
  }

  const { repoHash, repoDir } = cacheManager.resolveRepoDirectory(repoUrl, branchName);
  const priorMetadata = await cacheManager.getCacheMetadata(repoHash);

  if (logger?.logOperation) {
    await logger.logOperation(priorMetadata ? 'cache_refresh' : 'cache_miss', {
      repoUrl,
      branchName,
      cachePath: repoDir
    });
  }

  const ttl = Number.parseFloat(cacheTtl);
  const options = Number.isFinite(ttl) ? { ttlHours: ttl } : {};

  try {
    const cachePath = await cacheManager.populateCache(repoUrl, branchName, options);

    if (logger?.logOperation) {
      await logger.logOperation('cache_populate_complete', {
        repoUrl,
        branchName,
        cachedPath: cachePath
      });
    }

    return cachePath;
  } catch (error) {
    if (logger?.logError) {
      await logger.logError(error, {
        operation: 'cache_population',
        repoUrl,
        branchName
      });
    }
    throw error;
  }
}

async function checkDirectoryAvailability(directoryName) {
  const target = path.resolve(directoryName);
  try {
    const stats = await fs.stat(target);
    if (stats.isDirectory()) {
      throw new ValidationError('Project directory already exists', 'projectDirectory');
    }
    throw new ValidationError('Target path already exists and is not a directory', 'projectDirectory');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    if (error instanceof ValidationError) {
      throw error;
    }

    const message = sanitizeErrorMessage(error.message);
    throw new ValidationError(`Directory validation failed: ${message}`, 'projectDirectory');
  }
}
