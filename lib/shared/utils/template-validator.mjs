#!/usr/bin/env node

import {
  ValidationError,
  validateAuthoringMode,
  validateAuthorAssetsDir,
  validateDimensionsMetadata,
  validateSupportedOptionsMetadata,
} from '../security.mjs';
import { normalizePlaceholders } from './placeholder-schema.mjs';
import {
  normalizeCanonicalVariables,
  mergeCanonicalPlaceholders
} from './canonical-variables.mjs';

const manifestCache = new WeakMap();

/**
 * Validate template.json manifest against the published schema subset.
 * Returns normalized values used by downstream consumers.
 * @param {unknown} manifest
 * @returns {{
 *   authoringMode: 'wysiwyg' | 'composable',
 *   authorAssetsDir: string,
 *   dimensions: Record<string, any>,
 *   supportedOptions: string[],
 *   placeholders: ReturnType<typeof normalizePlaceholders>,
 *   handoffSteps: string[]
 * }}
 */
export function validateTemplateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new ValidationError('template.json must be an object', 'template');
  }

  const cached = manifestCache.get(manifest);
  if (cached) {
    return cached;
  }

  const name = manifest.name;
  if (typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('template.json name must be a non-empty string', 'name');
  }
  if (name.length > 120) {
    throw new ValidationError('template.json name must be 120 characters or fewer', 'name');
  }

  const description = manifest.description;
  if (typeof description !== 'string' || !description.trim()) {
    throw new ValidationError('template.json description must be a non-empty string', 'description');
  }

  const handoffSteps = normalizeHandoff(manifest.handoff);

  const metadata = manifest.metadata;
  if (metadata !== undefined) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new ValidationError('metadata must be an object', 'metadata');
    }
    if (metadata.placeholders !== undefined && !Array.isArray(metadata.placeholders)) {
      throw new ValidationError('metadata.placeholders must be an array', 'metadata.placeholders');
    }
    if (metadata.variables !== undefined && !Array.isArray(metadata.variables)) {
      throw new ValidationError('metadata.variables must be an array', 'metadata.variables');
    }
  }

  const canonicalVariables = normalizeCanonicalVariables(metadata?.variables);
  const authorPlaceholders = normalizePlaceholders(metadata?.placeholders ?? []);
  const mergedPlaceholders = mergeCanonicalPlaceholders({
    canonical: canonicalVariables,
    placeholders: authorPlaceholders
  });

  const canonicalVariableSummaries = Object.freeze(
    canonicalVariables.map((entry) =>
      Object.freeze({
        id: entry.id,
        token: entry.placeholder.token,
        required: entry.placeholder.required,
        type: entry.placeholder.type,
        defaultValue: entry.placeholder.defaultValue,
        description: entry.placeholder.description ?? null,
        sensitive: entry.placeholder.sensitive
      })
    )
  );

  const placeholders = Object.freeze(
    mergedPlaceholders.map((placeholder) =>
      Object.freeze({ ...placeholder })
    )
  );

  const setup = manifest.setup;
  if (setup !== undefined) {
    if (!setup || typeof setup !== 'object' || Array.isArray(setup)) {
      throw new ValidationError('setup must be an object', 'setup');
    }
  }

  const authoringMode = validateAuthoringMode(setup?.authoringMode);
  const authorAssetsDir = validateAuthorAssetsDir(setup?.authorAssetsDir);

  if (setup?.dimensions !== undefined) {
    if (typeof setup.dimensions !== 'object' || setup.dimensions === null || Array.isArray(setup.dimensions)) {
      throw new ValidationError('setup.dimensions must be an object', 'dimensions');
    }
    if (Object.keys(setup.dimensions).length === 0) {
      throw new ValidationError('setup.dimensions must declare at least one dimension', 'dimensions');
    }
  }

  const dimensions = validateDimensionsMetadata(setup?.dimensions);
  const supportedOptions = Object.freeze(
    validateSupportedOptionsMetadata(setup?.supportedOptions)
  );
  const result = Object.freeze({
    authoringMode,
    authorAssetsDir,
    dimensions,
    supportedOptions,
    placeholders,
    canonicalVariables: canonicalVariableSummaries,
    handoffSteps: Object.freeze([...handoffSteps]),
  });

  manifestCache.set(manifest, result);
  return result;
}

function normalizeHandoff(raw) {
  if (raw === undefined) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new ValidationError('handoff must be an array of strings', 'handoff');
  }

  const steps = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      throw new ValidationError('handoff entries must be strings', 'handoff');
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      throw new ValidationError('handoff entries cannot be empty strings', 'handoff');
    }
    if (trimmed.length > 240) {
      throw new ValidationError('handoff entries must be 240 characters or fewer', 'handoff');
    }
    steps.push(trimmed);
  }

  return steps;
}
