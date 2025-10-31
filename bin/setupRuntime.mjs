#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { shouldIgnoreTemplateEntry } from './utils/templateIgnore.mjs';

export class SetupSandboxError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SetupSandboxError';
  }
}

const UTF8 = 'utf8';
const DEFAULT_SELECTOR = '**/*';

function includeTemplateCopyEntry(source) {
  const name = path.basename(source);
  if (!name) {
    return true;
  }
  return !shouldIgnoreTemplateEntry(name);
}

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
    throw new SetupSandboxError('Setup scripts must export a default async function that receives the Environment object ({ ctx, tools }).');
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
      errorOnExist: !overwrite,
      filter: includeTemplateCopyEntry
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

function parseJsonPath(pathExpression) {
  if (typeof pathExpression !== 'string' || !pathExpression.trim()) {
    throw new SetupSandboxError('JSON path must be a non-empty string');
  }

  const segments = [];
  const parts = pathExpression.split('.');
  const tokenRegex = /([^\[\]]+)|\[(\d+)\]/g;

  for (const part of parts) {
    const matches = Array.from(part.matchAll(tokenRegex));
    if (matches.length === 0) {
      throw new SetupSandboxError(`Invalid JSON path segment "${part}" in "${pathExpression}"`);
    }
    for (const match of matches) {
      if (match[1]) {
        segments.push(match[1]);
      } else if (match[2]) {
        segments.push(Number(match[2]));
      }
    }
  }

  if (segments.length === 0 || typeof segments[0] === 'number') {
    throw new SetupSandboxError(`JSON path must start with an object property: "${pathExpression}"`);
  }
  return segments;
}

function ensureArraySize(array, index) {
  while (array.length <= index) {
    array.push(undefined);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveParentForPath(target, segments, { createMissing } = { createMissing: false }) {
  let current = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const nextKey = segments[i + 1];

    if (typeof key === 'number') {
      if (!Array.isArray(current)) {
        throw new SetupSandboxError('JSON path expected an array segment but found non-array value');
      }
      ensureArraySize(current, key);
      let next = current[key];
      if (next === undefined || next === null || typeof next !== 'object') {
        if (!createMissing) {
          return null;
        }
        next = typeof nextKey === 'number' ? [] : {};
        current[key] = next;
      }
      current = next;
    } else {
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        if (!createMissing) {
          return null;
        }
        current[key] = typeof nextKey === 'number' ? [] : {};
      } else if (typeof nextKey === 'number' && !Array.isArray(current[key])) {
        if (!createMissing) {
          throw new SetupSandboxError('JSON path expected an array segment but found non-array value');
        }
        current[key] = [];
      }
      current = current[key];
    }
  }

  return { parent: current, key: segments[segments.length - 1] };
}

function setAtPath(target, segments, value) {
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (typeof key === 'number') {
    if (!Array.isArray(parent)) {
      throw new SetupSandboxError('JSON path expected an array segment but found non-array value');
    }
    ensureArraySize(parent, key);
    parent[key] = value;
  } else {
    parent[key] = value;
  }
}

function removeAtPath(target, segments) {
  const resolved = resolveParentForPath(target, segments, { createMissing: false });
  if (!resolved) {
    return false;
  }
  const { parent, key } = resolved;
  if (typeof key === 'number') {
    if (!Array.isArray(parent) || key < 0 || key >= parent.length) {
      return false;
    }
    parent.splice(key, 1);
    return true;
  }
  if (parent && Object.prototype.hasOwnProperty.call(parent, key)) {
    delete parent[key];
    return true;
  }
  return false;
}

function addToArrayAtPath(target, segments, value, unique) {
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (parent[key] === undefined) {
    parent[key] = [];
  }
  if (!Array.isArray(parent[key])) {
    throw new SetupSandboxError('JSON path expected an array but found an object');
  }
  if (unique && parent[key].some(item => deepEqual(item, value))) {
    return;
  }
  parent[key].push(value);
}

function mergeArrayAtPath(target, segments, items, unique) {
  if (!Array.isArray(items)) {
    throw new SetupSandboxError('json.mergeArray requires an array of items');
  }
  const resolved = resolveParentForPath(target, segments, { createMissing: true });
  const { parent, key } = resolved;
  if (parent[key] === undefined) {
    parent[key] = [];
  }
  if (!Array.isArray(parent[key])) {
    throw new SetupSandboxError('JSON path expected an array but found an object');
  }
  for (const item of items) {
    if (unique && parent[key].some(existing => deepEqual(existing, item))) {
      continue;
    }
    parent[key].push(item);
  }
}

async function editJsonFile(root, relativePath, mutator, { allowCreate = true } = {}) {
  const absolute = resolveProjectPath(root, relativePath, 'JSON path');
  let data;
  try {
    const raw = await fs.readFile(absolute, UTF8);
    data = JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT' && allowCreate) {
      data = {};
    } else if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`JSON file not found: ${relativePath}`);
    } else {
      throw new SetupSandboxError(`Failed to read JSON (${relativePath}): ${error.message}`);
    }
  }
  const draft = structuredClone(data);
  mutator(draft);
  await writeJson(root, relativePath, draft);
  return draft;
}

function createLoggerApi(_logger) {
  return Object.freeze({
    info(message, data) {
      if (data !== undefined) {
        // ast-grep-ignore: no-console-log
        console.log(message, data);
      } else {
        // ast-grep-ignore: no-console-log
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

function createOptionsApi({ options, dimensions }) {
  const rawList = Array.isArray(options?.raw) ? options.raw.slice() : [];
  const rawSet = new Set(rawList);
  const dimensionDefinitions = dimensions ?? {};
  const normalizedByDimension = normalizeByDimension(options?.byDimension ?? {}, dimensionDefinitions);
  const defaultDimension = pickDefaultDimension(dimensionDefinitions);

  const api = {
    has(name) {
      if (typeof name !== 'string') {
        return false;
      }

      if (defaultDimension) {
        const selected = normalizedByDimension[defaultDimension];
        if (Array.isArray(selected)) {
          return selected.includes(name);
        }
      }

      return rawSet.has(name);
    },
    async when(name, fn) {
      if (api.has(name) && typeof fn === 'function') {
        return await fn();
      }
      return undefined;
    },
    list(dimension) {
      if (dimension === undefined) {
        return rawList.slice();
      }

      const definition = dimensionDefinitions[dimension];
      const value = normalizedByDimension[dimension];

      if (!definition) {
        return Array.isArray(value) ? value.slice() : value ?? null;
      }

      if (definition.type === 'single') {
        return value ?? null;
      }

      return Array.isArray(value) ? value.slice() : [];
    },
    in(dimension, value) {
      if (typeof dimension !== 'string' || typeof value !== 'string') {
        return false;
      }

      const definition = dimensionDefinitions[dimension];
      const selected = normalizedByDimension[dimension];

      if (!definition) {
        if (Array.isArray(selected)) {
          return selected.includes(value);
        }
        return selected === value;
      }

      if (definition.type === 'single') {
        return selected === value;
      }

      return Array.isArray(selected) && selected.includes(value);
    },
    require(arg1, arg2) {
      if (arg2 === undefined) {
        const dimension = defaultDimension;
        const value = arg1;
        if (!dimension) {
          throw new SetupSandboxError('No default dimension is configured for require(). Specify a dimension explicitly.');
        }
        if (!api.in(dimension, value)) {
          throw new SetupSandboxError(`Required option "${value}" not selected in dimension "${dimension}".`);
        }
        return;
      }

      const dimension = arg1;
      const value = arg2;
      if (!api.in(dimension, value)) {
        throw new SetupSandboxError(`Required option "${value}" not selected in dimension "${dimension}".`);
      }
    },
    dimensions() {
      const copy = {};
      for (const [dimension, value] of Object.entries(normalizedByDimension)) {
        copy[dimension] = Array.isArray(value) ? value.slice() : value;
      }
      return copy;
    },
    raw() {
      return rawList.slice();
    }
  };

  return Object.freeze(api);
}

function normalizeByDimension(byDimension, dimensionDefinitions) {
  const normalized = {};

  for (const [dimension, definition] of Object.entries(dimensionDefinitions)) {
    const rawValue = byDimension[dimension];

    if (definition.type === 'single') {
      normalized[dimension] = typeof rawValue === 'string' ? rawValue : (rawValue ?? definition.default ?? null);
    } else {
      if (Array.isArray(rawValue)) {
        normalized[dimension] = rawValue.map(value => value);
      } else {
        normalized[dimension] = Array.isArray(definition.default) ? definition.default.slice() : [];
      }
    }
  }

  for (const [dimension, value] of Object.entries(byDimension)) {
    if (normalized[dimension] === undefined) {
      normalized[dimension] = Array.isArray(value) ? value.map(v => v) : value;
    }
  }

  return normalized;
}

function pickDefaultDimension(dimensions) {
  if (dimensions.capabilities && dimensions.capabilities.type === 'multi') {
    return 'capabilities';
  }

  for (const [name, definition] of Object.entries(dimensions)) {
    if (definition.type === 'multi' && !definition.builtIn) {
      return name;
    }
  }

  return null;
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

function buildPlaceholderApi(root, placeholderContext) {
  return Object.freeze({
    async replaceAll(replacements, selector = DEFAULT_SELECTOR) {
      validateReplacements(replacements);
      await replaceAll(root, replacements, selector);
    },
    async replaceInFile(file, replacements) {
      validateReplacements(replacements);
      await replaceInFile(root, file, replacements);
    },
    async applyInputs(selector = DEFAULT_SELECTOR, extra = {}) {
      if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) {
        throw new SetupSandboxError('tools.placeholders.applyInputs extras must be provided as an object');
      }

      const replacements = buildInputReplacements(placeholderContext, extra);
      if (Object.keys(replacements).length === 0) {
        return;
      }

      validateReplacements(replacements);
      await replaceAll(root, replacements, selector);
    }
  });
}

function buildInputReplacements(placeholderContext, extra) {
  const result = {};
  const sourceInputs = placeholderContext?.inputs ?? {};

  for (const [token, value] of Object.entries(sourceInputs)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[token] = stringifyReplacementValue(value);
  }

  if (!Object.prototype.hasOwnProperty.call(result, 'PROJECT_NAME') && placeholderContext?.projectName) {
    result.PROJECT_NAME = String(placeholderContext.projectName);
  }

  for (const [token, value] of Object.entries(extra)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof token !== 'string' || token.trim() === '') {
      throw new SetupSandboxError('tools.placeholders.applyInputs extras must use string tokens');
    }
    result[token] = stringifyReplacementValue(value);
  }

  return result;
}

function stringifyReplacementValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    throw new SetupSandboxError('Placeholder replacement values cannot be null or undefined');
  }

  return String(value);
}

function buildInputsApi(inputs) {
  const reference = inputs ?? Object.freeze({});

  return Object.freeze({
    get(name, fallback) {
      if (typeof name !== 'string' || name.trim() === '') {
        throw new SetupSandboxError('inputs.get requires a placeholder token');
      }
      if (Object.prototype.hasOwnProperty.call(reference, name)) {
        return reference[name];
      }
      return fallback;
    },
    all() {
      return Object.freeze({ ...reference });
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
    },
    async write(relativePath, content, options = {}) {
      const absolute = resolveProjectPath(root, relativePath, 'file path');
      if (options.overwrite === false) {
        try {
          await fs.access(absolute);
          throw new SetupSandboxError(`File already exists: ${relativePath}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw new SetupSandboxError(`Failed to access ${relativePath}: ${error.message}`);
          }
        }
      }

      const data = Array.isArray(content)
        ? content.join('\n')
        : typeof content === 'string' || content instanceof Buffer
          ? content
          : (() => { throw new SetupSandboxError('files.write content must be a string, array of strings, or Buffer'); })();

      await ensureParentDirectory(absolute);
      await fs.writeFile(absolute, data, typeof data === 'string' ? UTF8 : undefined);
    },
    async copyTemplateDir(fromRelative, toRelative, options = {}) {
      const source = resolveProjectPath(root, fromRelative, 'source path');
      const destination = resolveProjectPath(root, toRelative, 'destination path');
      await ensureParentDirectory(destination);
      await fs.cp(source, destination, {
        recursive: true,
        force: options.overwrite === true,
        errorOnExist: options.overwrite !== true,
        filter: includeTemplateCopyEntry
      });
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
    },
    async set(relativePath, pathExpression, value) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        setAtPath(draft, segments, value);
      });
    },
    async remove(relativePath, pathExpression) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        removeAtPath(draft, segments);
      }, { allowCreate: false });
    },
    async addToArray(relativePath, pathExpression, value, options = {}) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        addToArrayAtPath(draft, segments, value, options.unique === true);
      });
    },
    async mergeArray(relativePath, pathExpression, items, options = {}) {
      const segments = parseJsonPath(pathExpression);
      return await editJsonFile(root, relativePath, (draft) => {
        mergeArrayAtPath(draft, segments, items, options.unique === true);
      });
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

function normalizeTextInput(input, label) {
  if (Array.isArray(input)) {
    for (const line of input) {
      if (typeof line !== 'string') {
        throw new SetupSandboxError(`${label} array entries must be strings`);
      }
    }
    return input.join('\n');
  }
  if (typeof input !== 'string') {
    throw new SetupSandboxError(`${label} must be a string or array of strings`);
  }
  return input;
}

function ensureLeadingNewline(block) {
  return block.startsWith('\n') ? block : `\n${block}`;
}

function ensureTrailingNewline(block) {
  return block.endsWith('\n') ? block : `${block}\n`;
}

function stripDuplicateNewlines(left, block, right) {
  let result = block;
  if (!left.endsWith('\n')) {
    result = `\n${result}`;
  }
  if (!right.startsWith('\n')) {
    result = `${result}\n`;
  }
  return result;
}

function buildTextApi(root) {
  return Object.freeze({
    async insertAfter({ file, marker, block }) {
      if (typeof marker !== 'string' || !marker) {
        throw new SetupSandboxError('text.insertAfter requires a non-empty marker string');
      }
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text insert target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const normalizedBlock = normalizeTextInput(block, 'text.insertAfter block');
      if (content.includes(normalizedBlock.trim())) {
        return;
      }

      const index = content.indexOf(marker);
      if (index === -1) {
        throw new SetupSandboxError(`Marker "${marker}" not found in ${file}`);
      }

      const markerEnd = index + marker.length;
      const before = content.slice(0, markerEnd);
      const after = content.slice(markerEnd);

      const insertion = stripDuplicateNewlines(before, ensureTrailingNewline(normalizedBlock), after);
      const updated = before + insertion + after;
      await fs.writeFile(absolute, updated, UTF8);
    },

    async ensureBlock({ file, marker, block }) {
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text ensure target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const normalizedBlock = normalizeTextInput(block, 'text.ensureBlock block');
      if (content.includes(normalizedBlock.trim())) {
        return;
      }

      await this.insertAfter({ file, marker, block: normalizedBlock });
    },

    async replaceBetween({ file, start, end, block }) {
      if (typeof start !== 'string' || !start || typeof end !== 'string' || !end) {
        throw new SetupSandboxError('text.replaceBetween requires non-empty start and end markers');
      }
      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text replace target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      const startIndex = content.indexOf(start);
      if (startIndex === -1) {
        throw new SetupSandboxError(`Start marker "${start}" not found in ${file}`);
      }
      const startEnd = startIndex + start.length;
      const endIndex = content.indexOf(end, startEnd);
      if (endIndex === -1) {
        throw new SetupSandboxError(`End marker "${end}" not found in ${file}`);
      }

      const before = content.slice(0, startEnd);
      const after = content.slice(endIndex);
      let replacement = normalizeTextInput(block, 'text.replaceBetween block');
      if (replacement.length > 0) {
        replacement = ensureTrailingNewline(ensureLeadingNewline(replacement));
      } else {
        replacement = '\n';
      }

      const updated = before + replacement + after;
      await fs.writeFile(absolute, updated, UTF8);
    },

    async appendLines({ file, lines }) {
      const absolute = resolveProjectPath(root, file, 'text file');
      let content = '';
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
        }
      }

      let block = normalizeTextInput(lines, 'text.appendLines lines');
      block = ensureTrailingNewline(block);

      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }

      const updated = content + block;
      await ensureParentDirectory(absolute);
      await fs.writeFile(absolute, updated, UTF8);
    },

    async replace({ file, search, replace, ensureMatch = false }) {
      if (typeof replace !== 'string') {
        throw new SetupSandboxError('text.replace requires the replacement value to be a string');
      }

      const absolute = resolveProjectPath(root, file, 'text file');
      let content;
      try {
        content = await fs.readFile(absolute, UTF8);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new SetupSandboxError(`Text replace target not found: ${file}`);
        }
        throw new SetupSandboxError(`Failed to read ${file}: ${error.message}`);
      }

      let pattern;
      if (typeof search === 'string') {
        pattern = new RegExp(escapeRegExp(search), 'g');
      } else if (search instanceof RegExp) {
        pattern = search;
      } else {
        throw new SetupSandboxError('text.replace requires search to be a string or RegExp');
      }

      let matchCount = 0;
      const updated = content.replace(pattern, (..._args) => {
        matchCount++;
        return replace;
      });

      if (matchCount === 0) {
        if (ensureMatch) {
          throw new SetupSandboxError(`text.replace could not find a match in ${file}`);
        }
        return;
      }

      if (updated !== content) {
        await fs.writeFile(absolute, updated, UTF8);
      }
    }
  });
}

export async function loadSetupScript(setupPath, ctx, tools, _logger = null) {
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
      'Setup scripts must export a default async function that receives the Environment object ({ ctx, tools }).'
    );
  }

  if (entry.length >= 2) {
    throw new SetupSandboxError(
      'Setup scripts must now accept a single Environment object. Update the signature to `export default async function setup({ ctx, tools })`.'
    );
  }

  const environment = Object.freeze({ ctx, tools });
  return await entry(environment);
}

export async function createSetupTools({ projectDirectory, projectName, logger, context, dimensions = {} }) {
  const root = path.resolve(projectDirectory);
  const placeholderInputs = context?.inputs ?? Object.freeze({});
  const ctx = {
    projectName,
    projectDir: root,
    ide: context?.ide ?? null,
    authoringMode: context?.authoringMode ?? 'wysiwyg',
    options: context?.options ?? { raw: [], byDimension: {} },
    inputs: placeholderInputs
  };

  return Object.freeze({
    placeholders: buildPlaceholderApi(root, { projectName: ctx.projectName, inputs: placeholderInputs }),
    inputs: buildInputsApi(placeholderInputs),
    files: buildFileApi(root),
    json: buildJsonApi(root),
    templates: buildTemplateApi(root),
    text: buildTextApi(root),
    logger: createLoggerApi(logger),
    ide: createIdeApi(ctx, root),
    options: createOptionsApi({
      options: ctx.options,
      dimensions
    })
  });
}
