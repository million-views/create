#!/usr/bin/env node
// @ts-nocheck

/**
 * Templates API for template setup scripts.
 *
 * @module lib/environment/tools/templates
 */

import fs from 'fs/promises';
import path from 'path';
import {
  SetupSandboxError,
  UTF8,
  resolveProjectPath,
  ensureParentDirectory,
  includeTemplateCopyEntry
} from '../utils.mts';
import { applyReplacements } from './placeholders.mts';

/**
 * Render a template file and write to target.
 * @param {string} root - Project root
 * @param {string} source - Source file path (absolute)
 * @param {string} target - Target file path (absolute)
 * @param {Record<string, unknown>} data - Template data
 * @param {string} placeholderFormat - Placeholder format
 */
async function renderFile(root, source, target, data, placeholderFormat) {
  let template;
  try {
    template = await fs.readFile(source, UTF8);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new SetupSandboxError(`Template source not found: ${path.relative(root, source)}`);
    }
    throw new SetupSandboxError(`Failed to read template: ${error.message}`);
  }

  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      continue;
    }
    stringData[key] = String(value);
  }

  const rendered = applyReplacements(template, stringData, placeholderFormat);
  await ensureParentDirectory(target);
  await fs.writeFile(target, rendered, UTF8);
}

/**
 * Create a templates API for setup scripts.
 *
 * @param {string} root - Project root directory
 * @param {string} authorAssetsDir - Author assets directory name
 * @param {string} [placeholderFormat='unicode'] - Placeholder format
 * @returns {Object} Frozen templates API
 */
export function buildTemplatesApi(root, authorAssetsDir, placeholderFormat = 'unicode') {
  return Object.freeze({
    /**
     * Render a string with placeholders.
     * @param {string} template - Template string
     * @param {Record<string, unknown>} data - Template data
     * @returns {string}
     */
    renderString(template, data) {
      if (typeof template !== 'string') {
        throw new SetupSandboxError('templates.renderString requires template string input');
      }
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new SetupSandboxError('templates.renderString requires a data object');
      }
      return applyReplacements(template, data, placeholderFormat);
    },

    /**
     * Render template file and write to target.
     * @param {string} sourceRelative - Source path (relative to assets dir)
     * @param {string} targetRelative - Target path (relative to project)
     * @param {Record<string, unknown>} data - Template data
     */
    async renderFile(sourceRelative, targetRelative, data) {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new SetupSandboxError('templates.renderFile requires a data object');
      }
      const source = path.resolve(root, authorAssetsDir, sourceRelative);
      const target = resolveProjectPath(root, targetRelative, 'target path');
      await renderFile(root, source, target, data, placeholderFormat);
    },

    /**
     * Copy directory tree from assets to project.
     * @param {string} fromRelative - Source path (relative to assets dir)
     * @param {string} toRelative - Target path (relative to project)
     * @param {Object} [options] - Copy options
     */
    async copy(fromRelative, toRelative, options = {}) {
      const source = path.resolve(root, authorAssetsDir, fromRelative);
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
