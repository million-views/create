#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/**
 * Generate TypeScript artifacts for the template and selection schemas.
 * @param {{ rootDir?: string, check?: boolean }} options
 */
export async function buildTemplateSchema(options = {}) {
  const { rootDir = repoRoot, check = false } = options;
  const schemaDir = path.join(rootDir, 'schema');
  const typesDir = path.join(rootDir, 'types');

  // Template schema files
  const templateSchemaFile = path.join(schemaDir, 'template.v1.json');
  const templateSchemaLatestFile = path.join(schemaDir, 'template.json');
  const templateTsFile = path.join(typesDir, 'template-schema.ts');
  const templateDtsFile = path.join(typesDir, 'template-schema.d.ts');
  const templateRuntimeFile = path.join(typesDir, 'template-schema.mjs');

  // Selection schema files
  const selectionSchemaFile = path.join(schemaDir, 'selection.v1.json');
  const selectionSchemaLatestFile = path.join(schemaDir, 'selection.json');
  const selectionTsFile = path.join(typesDir, 'selection-schema.ts');
  const selectionDtsFile = path.join(typesDir, 'selection-schema.d.ts');
  const selectionRuntimeFile = path.join(typesDir, 'selection-schema.mjs');

  await assertFileExists(templateSchemaFile, 'Template schema (template.v1.json) not found.');
  await assertFileExists(templateSchemaLatestFile, 'Latest schema copy (template.json) not found.');
  await assertFileExists(selectionSchemaFile, 'Selection schema (selection.v1.json) not found.');
  await assertFileExists(selectionSchemaLatestFile, 'Latest schema copy (selection.json) not found.');

  // Build template schema
  const templateSchemaRaw = await fs.readFile(templateSchemaFile, 'utf8');
  const templateSchema = JSON.parse(templateSchemaRaw);
  basicSchemaValidation(templateSchema);
  const templateVersion = path.basename(templateSchemaFile, '.json');
  const templateTsContent = generateTypeDefinitions(templateSchema, templateVersion, path.relative(rootDir, templateSchemaFile), 'ts');
  const templateDtsContent = generateTypeDefinitions(templateSchema, templateVersion, path.relative(rootDir, templateSchemaFile), 'dts');
  const templateRuntimeContent = generateRuntimeStub(path.relative(rootDir, templateSchemaFile));

  // Build selection schema
  const selectionSchemaRaw = await fs.readFile(selectionSchemaFile, 'utf8');
  const selectionSchema = JSON.parse(selectionSchemaRaw);
  basicSelectionSchemaValidation(selectionSchema);
  const selectionVersion = path.basename(selectionSchemaFile, '.json');
  const selectionTsContent = generateSelectionTypeDefinitions(selectionSchema, selectionVersion, path.relative(rootDir, selectionSchemaFile), 'ts');
  const selectionDtsContent = generateSelectionTypeDefinitions(selectionSchema, selectionVersion, path.relative(rootDir, selectionSchemaFile), 'dts');
  const selectionRuntimeContent = generateRuntimeStub(path.relative(rootDir, selectionSchemaFile));

  if (check) {
    await ensureContentMatches(templateTsFile, templateTsContent, 'template-schema.ts is out of date. Run npm run schema:build.');
    await ensureContentMatches(templateDtsFile, templateDtsContent, 'template-schema.d.ts is out of date. Run npm run schema:build.');
    await ensureContentMatches(templateRuntimeFile, templateRuntimeContent, 'template-schema.mjs is out of date. Run npm run schema:build.');
    await ensureContentMatches(selectionTsFile, selectionTsContent, 'selection-schema.ts is out of date. Run npm run schema:build.');
    await ensureContentMatches(selectionDtsFile, selectionDtsContent, 'selection-schema.d.ts is out of date. Run npm run schema:build.');
    await ensureContentMatches(selectionRuntimeFile, selectionRuntimeContent, 'selection-schema.mjs is out of date. Run npm run schema:build.');
    return;
  }

  await fs.mkdir(typesDir, { recursive: true });
  await fs.writeFile(templateTsFile, templateTsContent, 'utf8');
  await fs.writeFile(templateDtsFile, templateDtsContent, 'utf8');
  await fs.writeFile(templateRuntimeFile, templateRuntimeContent, 'utf8');
  await fs.writeFile(selectionTsFile, selectionTsContent, 'utf8');
  await fs.writeFile(selectionDtsFile, selectionDtsContent, 'utf8');
  await fs.writeFile(selectionRuntimeFile, selectionRuntimeContent, 'utf8');
}

async function assertFileExists(filePath, message) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(message);
  }
}

async function ensureContentMatches(filePath, expected, message) {
  try {
    const actual = await fs.readFile(filePath, 'utf8');
    if (normalizeLineEndings(actual) !== normalizeLineEndings(expected)) {
      throw new Error(message);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(message);
    }
    if (error.message === message) {
      throw error;
    }
    throw error;
  }
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function basicSchemaValidation(schema) {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be an object.');
  }

  if (schema.type !== 'object') {
    throw new Error('Schema root type must be "object".');
  }

  if (!Array.isArray(schema.required) || !schema.required.includes('name') || !schema.required.includes('description')) {
    throw new Error('Schema must require "name" and "description" properties.');
  }

  const properties = schema.properties ?? {};
  if (!properties.setup || typeof properties.setup !== 'object') {
    throw new Error('Schema must include a setup object.');
  }

  const setupProps = properties.setup.properties ?? {};
  const authoringModeEnum = setupProps.authoringMode?.enum;
  if (!Array.isArray(authoringModeEnum) || authoringModeEnum.length === 0) {
    throw new Error('Schema setup.authoringMode must declare enum values.');
  }

  const placeholderDef = schema.$defs?.placeholder;
  if (!placeholderDef || placeholderDef.type !== 'object') {
    throw new Error('Schema must define $defs.placeholder as an object.');
  }
}

function generateTypeDefinitions(schema, version, schemaRelativePath, target = 'ts') {
  const properties = schema.properties ?? {};
  const setup = properties.setup ?? {};
  const defs = schema.$defs ?? {};
  const authoringEnum = setup.properties?.authoringMode?.enum ?? [];
  const placeholderTypeEnum = defs.placeholder?.properties?.type?.enum ?? [];

  // Hardcode dimension types that are used in the TypeScript interfaces
  const dimensionTypeEnum = ['single', 'multi'];
  const policyEnum = ['warn'];
  const canonicalVariableNames = []; // No canonical variables defined yet

  const dimensionValueType = 'string';

  const constAssertion = target === 'ts' ? ' as const' : '';

  const lines = [
    '// @generated by scripts/build-template-schema.mjs',
    `// Source: ${schemaRelativePath}`,
    '',
    `export const TEMPLATE_SCHEMA_VERSION = '${version}'${constAssertion};`,
    `export const TEMPLATE_SCHEMA_PATH = '${schemaRelativePath}'${constAssertion};`,
    '',
    `export type TemplateAuthoringMode = ${enumUnion(authoringEnum)};`,
    `export type TemplatePlaceholderType = ${enumUnion(placeholderTypeEnum)};`,
    `export type TemplateDimensionType = ${enumUnion(dimensionTypeEnum)};`,
    `export type TemplateDimensionPolicy = ${enumUnion(policyEnum)};`,
    `export type TemplateCanonicalVariableName = ${enumUnion(canonicalVariableNames)};`,
    '',
    'export type TemplatePlaceholderPrimitive = string | number | boolean;',
    `export type TemplateDimensionValue = ${dimensionValueType};`,
    'export type TemplateDimensionRelation = Record<TemplateDimensionValue, TemplateDimensionValue[]>;',
    '',
    'export interface TemplatePlaceholder {',
    '  name: string;',
    '  description?: string;',
    '  required?: boolean;',
    '  sensitive?: boolean;',
    '  type?: TemplatePlaceholderType;',
    '  default?: TemplatePlaceholderPrimitive;',
    '}',
    '',
    'interface TemplateDimensionBase {',
    '  values: TemplateDimensionValue[];',
    '  requires?: TemplateDimensionRelation;',
    '  conflicts?: TemplateDimensionRelation;',
    '  policy?: TemplateDimensionPolicy;',
    '  builtIn?: boolean;',
    '  description?: string;',
    '}',
    '',
    'export interface TemplateSingleSelectDimension extends TemplateDimensionBase {',
    "  type: 'single';",
    '  default?: TemplateDimensionValue | null;',
    '}',
    '',
    'export interface TemplateMultiSelectDimension extends TemplateDimensionBase {',
    "  type: 'multi';",
    '  default?: TemplateDimensionValue[];',
    '}',
    '',
    'export type TemplateDimension = TemplateSingleSelectDimension | TemplateMultiSelectDimension;',
    'export type TemplateDimensions = Record<string, TemplateDimension>;',
    '',
    'export interface TemplateCanonicalVariableOverrides {',
    '  description?: string;',
    '  default?: TemplatePlaceholderPrimitive;',
    '  sensitive?: boolean;',
    '  type?: TemplatePlaceholderType;',
    '}',
    '',
    'export interface TemplateCanonicalVariable {',
    '  name: TemplateCanonicalVariableName;',
    '  required?: boolean;',
    '  overrides?: TemplateCanonicalVariableOverrides;',
    '}',
    '',
    'export interface TemplateMetadata {',
    '  placeholders?: TemplatePlaceholder[];',
    '  variables?: TemplateCanonicalVariable[];',
    '  [key: string]: unknown;',
    '}',
    '',
    'export interface TemplateSetup {',
    '  authoring?: TemplateAuthoringMode;',
    '  authorAssetsDir?: string;',
    '  dimensions?: TemplateDimensions;',
    '}',
    '',
    'export interface TemplateFeatureSpec {',
    '  label: string;',
    '  description: string;',
    '  needs: Record<string, \'required\' | \'optional\' | \'none\'>;',
    '}',
    '',
    'export interface TemplateHintFeature {',
    '  id: string;',
    '  label: string;',
    '  description: string;',
    '  needs: Record<string, \'required\' | \'optional\' | \'none\'>;',
    '  examples?: string[];',
    '}',
    '',
    'export interface TemplateHints {',
    '  features?: TemplateHintFeature[];',
    '}',
    '',
    'export interface TemplateConstants {',
    '  [key: string]: any;',
    '}',
    '',
    'export interface TemplateManifest {',
    '  schemaVersion?: string;',
    '  title?: string;',
    '  id?: string;',
    '  name: string;',
    '  description: string;',
    '  handoff?: string[];',
    '  metadata?: TemplateMetadata;',
    '  setup?: TemplateSetup;',
    '  featureSpecs?: Record<string, TemplateFeatureSpec>;',
    '  hints?: TemplateHints;',
    '  constants?: TemplateConstants;',
    '  [key: string]: unknown;',
    '}',
    ''
  ];

  return `${lines.join('\n')}\n`;
}

function enumUnion(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 'never';
  }
  return values.map(value => `'${value}'`).join(' | ');
}

function basicSelectionSchemaValidation(schema) {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Selection schema must be an object.');
  }

  if (schema.type !== 'object') {
    throw new Error('Selection schema root type must be "object".');
  }

  if (!Array.isArray(schema.required) || !schema.required.includes('templateId') || !schema.required.includes('version') || !schema.required.includes('selections')) {
    throw new Error('Selection schema must require "templateId", "version", and "selections" properties.');
  }

  const properties = schema.properties ?? {};
  if (!properties.selections || typeof properties.selections !== 'object') {
    throw new Error('Selection schema must include a selections object.');
  }
}

function generateSelectionTypeDefinitions(schema, version, schemaRelativePath, target = 'ts') {
  const properties = schema.properties ?? {};
  const selectionsProps = properties.selections?.properties ?? {};

  // Extract enums from the schema
  const deploymentTargetEnum = selectionsProps.deployment?.enum ?? [];
  const databaseEnum = selectionsProps.database?.enum ?? [];
  const storageEnum = selectionsProps.storage?.enum ?? [];
  const authProvidersEnum = selectionsProps.auth?.items?.enum ?? [];
  const paymentsEnum = selectionsProps.payments?.enum ?? [];
  const analyticsEnum = selectionsProps.analytics?.enum ?? [];
  const packageManagerEnum = properties.metadata?.properties?.packageManager?.enum ?? [];

  const constAssertion = target === 'ts' ? ' as const' : '';

  const lines = [
    '// @generated by scripts/build-template-schema.mjs',
    `// Source: ${schemaRelativePath}`,
    '',
    `export const SELECTION_SCHEMA_VERSION = '${version}'${constAssertion};`,
    `export const SELECTION_SCHEMA_PATH = '${schemaRelativePath}'${constAssertion};`,
    '',
    `export type SelectionDeploymentTarget = ${enumUnion(deploymentTargetEnum)};`,
    `export type SelectionDatabase = ${enumUnion(databaseEnum)};`,
    `export type SelectionStorage = ${enumUnion(storageEnum)};`,
    `export type SelectionAuthProvider = ${enumUnion(authProvidersEnum)};`,
    `export type SelectionPaymentProcessor = ${enumUnion(paymentsEnum)};`,
    `export type SelectionAnalyticsProvider = ${enumUnion(analyticsEnum)};`,
    `export type SelectionPackageManager = ${enumUnion(packageManagerEnum)};`,
    '',
    'export interface SelectionChoices {',
    '  deployment_target?: SelectionDeploymentTarget;',
    '  features?: string[];',
    '  database?: SelectionDatabase;',
    '  storage?: SelectionStorage;',
    '  auth?: SelectionAuthProvider[];',
    '  payments?: SelectionPaymentProcessor;',
    '  analytics?: SelectionAnalyticsProvider;',
    '}',
    '',
    'export interface SelectionDerived {',
    '  needAuth?: boolean;',
    '  needDb?: boolean;',
    '  needPayments?: boolean;',
    '  needStorage?: boolean;',
    '}',
    '',
    'export interface SelectionMetadata {',
    '  name: string;',
    '  packageManager?: SelectionPackageManager;',
    '  createdAt?: string;',
    '  cliVersion?: string;',
    '}',
    '',
    'export interface SelectionManifest {',
    '  templateId: string;',
    '  version: string;',
    '  selections: SelectionChoices;',
    '  derived?: SelectionDerived;',
    '  metadata: SelectionMetadata;',
    '}',
    ''
  ];

  return `${lines.join('\n')}\n`;
}

function generateRuntimeStub(schemaRelativePath) {
  return [
    '// @generated by scripts/build-template-schema.mjs',
    `// Source: ${schemaRelativePath}`,
    '// This module intentionally exports nothing at runtime. See template-schema.d.ts for declarations.',
    'export {};',
    ''
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');

  try {
    await buildTemplateSchema({ check });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main();
}
