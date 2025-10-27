#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';

export class SetupSandboxError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SetupSandboxError';
  }
}

const UTF8 = 'utf8';
const DEFAULT_SELECTOR = '**/*';

const IDE_PRESETS = {
  kiro: (ctx) => [
    {
      kind: 'json',
      path: '.kiro/settings.json',
      data: {
        'editor.tabSize': 2,
        'editor.insertSpaces': true,
        'files.autoSave': 'afterDelay',
        'kiro.projectName': ctx.projectName
      }
    },
    {
      kind: 'json',
      path: '.kiro/tasks.json',
      data: {
        version: '2.0.0',
        tasks: [
          {
            label: 'Start Application',
            type: 'shell',
            command: 'npm start',
            group: 'build'
          }
        ]
      }
    }
  ],
  vscode: () => [
    {
      kind: 'json',
      path: '.vscode/settings.json',
      data: {
        'editor.formatOnSave': true,
        'editor.codeActionsOnSave': {
          'source.fixAll.eslint': true
        },
        'editor.defaultFormatter': 'esbenp.prettier-vscode'
      }
    },
    {
      kind: 'json',
      path: '.vscode/extensions.json',
      data: {
        recommendations: [
          'esbenp.prettier-vscode',
          'dbaeumer.vscode-eslint',
          'ms-vscode.vscode-typescript-next'
        ]
      }
    },
    {
      kind: 'json',
      path: '.vscode/launch.json',
      data: {
        version: '0.2.0',
        configurations: [
          {
            name: 'Launch App',
            type: 'node',
            request: 'launch',
            program: '${workspaceFolder}/index.js',
            skipFiles: ['<node_internals>/**']
          }
        ]
      }
    }
  ],
  cursor: () => [
    {
      kind: 'json',
      path: '.cursor/config.json',
      data: {
        useGitIgnore: true,
        assistant: {
          style: 'pair-programmer'
        }
      }
    }
  ],
  windsurf: () => [
    {
      kind: 'json',
      path: '.windsurf/settings.json',
      data: {
        'editor.tabSize': 2,
        'files.autoSave': 'onFocusChange',
        'windsurf.experimental.aiAssistance': true
      }
    }
  ]
};

function transformModuleSource(source) {
  if (/(^|\s)import\s+[^(']/m.test(source)) {
    throw new SetupSandboxError('Import is disabled inside setup scripts. Use provided tools instead.');
  }

  if (!/export\s+default\s+/m.test(source)) {
    throw new SetupSandboxError('Setup scripts must export a default async function (ctx, tools).');
  }

  return source.replace(/export\s+default\s+/g, 'module.exports.default = ');
}

function createSandboxContext() {
  const context = vm.createContext({}, {
    name: 'SetupSandbox',
    codeGeneration: { strings: false, wasm: false }
  });

  const forbidden = (name) => () => {
    throw new SetupSandboxError(`${name} is disabled inside setup scripts. Use provided tools instead.`);
  };

  context.console = console;
  context.global = context;
  context.globalThis = context;
  if (typeof structuredClone === 'function') {
    context.structuredClone = structuredClone;
  }
  context.setTimeout = setTimeout;
  context.clearTimeout = clearTimeout;
  context.setInterval = setInterval;
  context.clearInterval = clearInterval;
  context.process = { env: process.env };
  context.eval = forbidden('eval');
  context.Function = forbidden('Function');
  context.require = forbidden('require');
  context.import = forbidden('import');
  context.module = { exports: {} };
  context.exports = context.module.exports;

  return context;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function resolveProjectPath(root, relative, label = 'path') {
  if (typeof relative !== 'string' || !relative.trim()) {
    throw new SetupSandboxError(`${label} must be a non-empty string`);
  }

  const normalizedRoot = path.resolve(root);
  const target = path.resolve(normalizedRoot, relative);

  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + path.sep)) {
    throw new SetupSandboxError(`${label} must stay within the project directory`);
  }

  return target;
}

async function ensureParentDirectory(filePath) {
  const parent = path.dirname(filePath);
  await fs.mkdir(parent, { recursive: true, mode: 0o755 });
}

async function walkFiles(root, directory, collector) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, absolutePath, collector);
    } else {
      const relative = toPosix(path.relative(root, absolutePath));
      collector.push({ absolute: absolutePath, relative });
    }
  }
}

function globToRegExp(pattern) {
  const normalized = toPosix(pattern.trim() || DEFAULT_SELECTOR);
  let escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  escaped = escaped.replace(/\\\*\\\*/g, '::DOUBLE_STAR::');
  escaped = escaped.replace(/\\\*/g, '[^/]*');
  escaped = escaped.replace(/::DOUBLE_STAR::/g, '.*');
  escaped = escaped.replace(/\\\?/g, '.');

  return new RegExp(`^${escaped}$`);
}

async function findMatchingFiles(root, selector) {
  const patterns = Array.isArray(selector) ? selector : [selector || DEFAULT_SELECTOR];
  const matchers = patterns.map(globToRegExp);
  const files = [];
  await walkFiles(root, root, files);
  return files.filter(file => matchers.some(matcher => matcher.test(file.relative)));
}

function validateReplacements(replacements) {
  if (typeof replacements !== 'object' || replacements === null || Array.isArray(replacements)) {
    throw new SetupSandboxError('Replacements must be provided as an object map');
  }

  for (const [key, value] of Object.entries(replacements)) {
    if (typeof value !== 'string') {
      throw new SetupSandboxError(`Replacement value for "${key}" must be a string`);
    }
  }
}

function applyReplacements(content, replacements) {
  let result = content;
  for (const [token, replacement] of Object.entries(replacements)) {
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(token)}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, replacement);
  }
  return result;
}

async function replaceInFile(root, file, replacements) {
  const absolute = resolveProjectPath(root, file, 'file path');
  const original = await fs.readFile(absolute, UTF8);
  const updated = applyReplacements(original, replacements);

  if (updated !== original) {
    await fs.writeFile(absolute, updated, UTF8);
  }
}

async function replaceAll(root, replacements, selector) {
  const matches = await findMatchingFiles(root, selector);

  for (const match of matches) {
    const original = await fs.readFile(match.absolute, UTF8);
    const updated = applyReplacements(original, replacements);
    if (original !== updated) {
      await fs.writeFile(match.absolute, updated, UTF8);
    }
  }
}

async function copyEntry(root, fromRelative, toRelative, { overwrite = false } = {}) {
  const src = resolveProjectPath(root, fromRelative, 'source path');
  const dest = resolveProjectPath(root, toRelative, 'destination path');

  try {
    await fs.stat(src);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`Source not found: ${fromRelative}`);
    }
    throw new SetupSandboxError(`Unable to read source: ${error.message}`);
  }

  await ensureParentDirectory(dest);

  try {
    await fs.cp(src, dest, {
      recursive: true,
      force: !!overwrite,
      errorOnExist: !overwrite
    });
  } catch (error) {
    throw new SetupSandboxError(`Copy failed (${fromRelative} → ${toRelative}): ${error.message}`);
  }
}

async function moveEntry(root, fromRelative, toRelative, { overwrite = false } = {}) {
  const src = resolveProjectPath(root, fromRelative, 'source path');
  const dest = resolveProjectPath(root, toRelative, 'destination path');

  if (!overwrite) {
    try {
      await fs.access(dest);
      throw new SetupSandboxError(`Target already exists: ${toRelative}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new SetupSandboxError(`Unable to check destination: ${error.message}`);
      }
    }
  }

  await ensureParentDirectory(dest);

  try {
    await fs.rename(src, dest);
  } catch (error) {
    if (error.code === 'EXDEV') {
      await copyEntry(root, fromRelative, toRelative, { overwrite });
      await fs.rm(src, { recursive: true, force: true });
      return;
    }
    throw new SetupSandboxError(`Move failed (${fromRelative} → ${toRelative}): ${error.message}`);
  }
}

async function removeEntry(root, relativePath) {
  const target = resolveProjectPath(root, relativePath, 'remove path');
  await fs.rm(target, { recursive: true, force: true });
}

function deepMerge(target, source) {
  if (Array.isArray(source)) {
    return source.slice();
  }

  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    target = {};
  }

  if (typeof source !== 'object' || source === null) {
    return source;
  }

  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMerge(result[key], value);
    } else if (Array.isArray(value)) {
      result[key] = value.slice();
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function readJson(root, relativePath) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  try {
    const raw = await fs.readFile(absolute, UTF8);
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`JSON file not found: ${relativePath}`);
    }
    throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
  }
}

async function writeJson(root, relativePath, data) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  await ensureParentDirectory(absolute);

  try {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(absolute, json, UTF8);
  } catch (error) {
    throw new SetupSandboxError(`Failed to write JSON (${relativePath}): ${error.message}`);
  }
}

async function mergeJson(root, relativePath, patch) {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    throw new SetupSandboxError('json.merge requires a plain object patch');
  }

  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  let base = {};

  try {
    const raw = await fs.readFile(absolute, UTF8);
    base = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
    }
  }

  const merged = deepMerge(base, patch);
  await writeJson(root, relativePath, merged);
  return merged;
}

async function updateJson(root, relativePath, updater) {
  if (typeof updater !== 'function') {
    throw new SetupSandboxError('json.update requires an updater function');
  }

  const existing = await readJson(root, relativePath);
  const draft = structuredClone(existing);
  const result = await updater(draft);
  const output = result === undefined ? draft : result;
  await writeJson(root, relativePath, output);
  return output;
}

async function renderFile(root, sourceRelative, targetRelative, data) {
  const source = resolveProjectPath(root, sourceRelative, 'template source');
  const template = await fs.readFile(source, UTF8);
  const rendered = applyReplacements(template, data);
  const target = resolveProjectPath(root, targetRelative, 'template destination');
  await ensureParentDirectory(target);
  await fs.writeFile(target, rendered, UTF8);
}

function createLoggerApi(logger) {
  return Object.freeze({
    info(message, data) {
      if (data !== undefined) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    },
    warn(message, data) {
      if (data !== undefined) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    },
    table(rows) {
      console.table(rows);
    }
  });
}

function createOptionsApi(options) {
  const optionList = Array.isArray(options) ? options.slice() : [];
  const optionSet = new Set(optionList);

  return Object.freeze({
    has(name) {
      return optionSet.has(name);
    },
    async when(name, fn) {
      if (optionSet.has(name) && typeof fn === 'function') {
        return await fn();
      }
      return undefined;
    },
    list() {
      return optionList.slice();
    }
  });
}

async function loadAstGrepAdapter() {
  try {
    const mod = await import('@ast-grep/napi');
    const runFn = typeof mod.run === 'function'
      ? mod.run
      : typeof mod.default === 'function'
        ? mod.default
        : null;
    const transformFn = typeof mod.transform === 'function' ? mod.transform : null;

    return Object.freeze({
      available: true,
      async run(query, options = {}) {
        if (!runFn) {
          throw new SetupSandboxError('ast-grep run API is not available in the installed module.');
        }
        return runFn(query, options);
      },
      async transform(config) {
        if (!transformFn) {
          throw new SetupSandboxError('ast-grep transform API is not available in the installed module.');
        }
        return transformFn(config);
      }
    });
  } catch (error) {
    return Object.freeze({
      available: false,
      reason: error.code === 'ERR_MODULE_NOT_FOUND'
        ? 'ast-grep adapter not installed'
        : error.message
    });
  }
}

function createIdeApi(ctx, root) {
  const presetKeys = Object.keys(IDE_PRESETS);

  return Object.freeze({
    presets: presetKeys.slice(),
    async applyPreset(name) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new SetupSandboxError('applyPreset requires an IDE name');
      }

      const key = name.trim().toLowerCase();
      const presetBuilder = IDE_PRESETS[key];

      if (!presetBuilder) {
        throw new SetupSandboxError(`Unsupported IDE preset: ${name}`);
      }

      const resources = presetBuilder(ctx);
      for (const resource of resources) {
        if (resource.kind === 'json') {
          const merged = await mergeJson(root, resource.path, resource.data);
          await writeJson(root, resource.path, merged);
        } else if (resource.kind === 'text') {
          const target = resolveProjectPath(root, resource.path, 'preset path');
          await ensureParentDirectory(target);
          await fs.writeFile(target, resource.content, UTF8);
        } else {
          throw new SetupSandboxError(`Unsupported preset resource kind: ${resource.kind}`);
        }
      }
    }
  });
}

function buildPlaceholderApi(root) {
  return Object.freeze({
    async replaceAll(replacements, selector = DEFAULT_SELECTOR) {
      validateReplacements(replacements);
      await replaceAll(root, replacements, selector);
    },
    async replaceInFile(file, replacements) {
      validateReplacements(replacements);
      await replaceInFile(root, file, replacements);
    }
  });
}

function buildFileApi(root) {
  return Object.freeze({
    async ensureDirs(paths) {
      const list = Array.isArray(paths) ? paths : [paths];
      for (const dir of list) {
        const target = resolveProjectPath(root, dir, 'directory path');
        await fs.mkdir(target, { recursive: true, mode: 0o755 });
      }
    },
    async copy(fromRelative, toRelative, options = {}) {
      await copyEntry(root, fromRelative, toRelative, options);
    },
    async remove(relativePath) {
      await removeEntry(root, relativePath);
    },
    async move(fromRelative, toRelative, options = {}) {
      await moveEntry(root, fromRelative, toRelative, options);
    }
  });
}

function buildJsonApi(root) {
  return Object.freeze({
    async read(relativePath) {
      return await readJson(root, relativePath);
    },
    async merge(relativePath, patch) {
      return await mergeJson(root, relativePath, patch);
    },
    async update(relativePath, updater) {
      return await updateJson(root, relativePath, updater);
    }
  });
}

function buildTemplateApi(root) {
  return Object.freeze({
    renderString(template, data) {
      if (typeof template !== 'string') {
        throw new SetupSandboxError('templates.renderString requires template string input');
      }
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new SetupSandboxError('templates.renderString requires a data object');
      }
      return applyReplacements(template, data);
    },
    async renderFile(sourceRelative, targetRelative, data) {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new SetupSandboxError('templates.renderFile requires a data object');
      }
      await renderFile(root, sourceRelative, targetRelative, data);
    }
  });
}

export async function loadSetupScript(setupPath, ctx, tools, logger = null) {
  const scriptSource = await fs.readFile(setupPath, UTF8);
  const transformedSource = transformModuleSource(scriptSource);
  const context = createSandboxContext();

  try {
    const script = new vm.Script(transformedSource, {
      filename: setupPath,
      displayErrors: true
    });
    script.runInContext(context, { displayErrors: true });
  } catch (error) {
    throw new SetupSandboxError(error.message);
  }

  const entry = context.module?.exports?.default ?? context.exports?.default;

  if (typeof entry !== 'function') {
    throw new SetupSandboxError(
      'Setup scripts must export a default async function with signature (ctx, tools).'
    );
  }

  return await entry(ctx, tools);
}

export async function createSetupTools({ projectDirectory, projectName, logger, context }) {
  const root = path.resolve(projectDirectory);
  const ctx = {
    projectName,
    projectDir: root,
    ide: context?.ide ?? null,
    options: Array.isArray(context?.options) ? context.options.slice() : []
  };

  const astGrep = await loadAstGrepAdapter();

  return Object.freeze({
    placeholders: buildPlaceholderApi(root),
    files: buildFileApi(root),
    json: buildJsonApi(root),
    templates: buildTemplateApi(root),
    logger: createLoggerApi(logger),
    ide: createIdeApi(ctx, root),
    options: createOptionsApi(ctx.options),
    astGrep
  });
}
