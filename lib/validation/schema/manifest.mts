/**
 * Template Manifest Validator
 *
 * Validates template.json manifest files at runtime for consumption.
 * Returns normalized values used by downstream consumers.
 *
 * @module lib/validation/schema/manifest
 */

import { normalizePlaceholders } from '../../placeholder/schema.mts';
import { ValidationError } from '../../error/validation.mts';

/**
 * Cache for validated manifests to avoid re-validation of the same object.
 */
const manifestCache = new WeakMap<object, ManifestResult>();

/**
 * Result of manifest validation with normalized values.
 */
export interface ManifestResult {
  readonly schemaVersion: string;
  readonly name: string;
  readonly description: string;
  readonly dimensions: Record<string, unknown>;
  readonly gates: Record<string, unknown>;
  readonly featureSpecs: Record<string, unknown>;
  readonly hints: Record<string, unknown>;
  readonly authorAssetsDir: string;
  readonly placeholders: ReturnType<typeof normalizePlaceholders>;
  readonly canonicalVariables: readonly string[];
  readonly handoff: readonly string[];
}

/**
 * Raw manifest input structure.
 */
interface RawManifest {
  schemaVersion?: string;
  id?: string;
  name?: string;
  description?: string;
  placeholderFormat?: string;
  placeholders?: Record<string, {
    description?: string;
    default?: string | number | boolean;
    required?: boolean;
    secure?: boolean;
    type?: string;
  }>;
  dimensions?: Record<string, unknown>;
  gates?: Record<string, unknown>;
  featureSpecs?: Record<string, unknown>;
  hints?: Record<string, unknown>;
  setup?: {
    authorAssetsDir?: string;
  };
  handoff?: string[];
}

/**
 * Validate template.json manifest against the published schema subset.
 *
 * Returns normalized values used by downstream consumers.
 *
 * @param manifest - Raw template.json content
 * @returns Normalized manifest with validated fields
 * @throws ValidationError if manifest is invalid
 *
 * @example
 * ```typescript
 * import { validate } from './validation/schema/manifest.mts';
 *
 * const result = validate({
 *   schemaVersion: '1.0.0',
 *   id: 'author/template',
 *   name: 'My Template',
 *   description: 'A template',
 *   placeholderFormat: 'unicode',
 *   placeholders: {}
 * });
 * ```
 */
export function validate(manifest: unknown): ManifestResult {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new ValidationError('template.json must be an object', 'template');
  }

  const cached = manifestCache.get(manifest as object);
  if (cached) {
    return cached;
  }

  const rawManifest = manifest as RawManifest;

  // Only support V1.0.0 schema - roll forward only
  const schemaVersion = rawManifest.schemaVersion;
  if (schemaVersion === '1.0.0') {
    return validateV1(rawManifest);
  }

  throw new ValidationError(
    'template.json must specify schemaVersion: "1.0.0". Legacy schema support has been removed.',
    'schemaVersion'
  );
}

/**
 * Validate V1 template manifest.
 */
function validateV1(manifest: RawManifest): ManifestResult {
  // Basic V1 structure validation
  if (!manifest.schemaVersion || manifest.schemaVersion !== '1.0.0') {
    throw new ValidationError('V1 template must specify schemaVersion: "1.0.0"', 'schemaVersion');
  }

  if (!manifest.id || typeof manifest.id !== 'string') {
    throw new ValidationError('V1 template must have a valid id', 'id');
  }

  // Validate ID format
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(manifest.id)) {
    throw new ValidationError(`Invalid ID format: ${manifest.id}. Expected: author/template-name`, 'id');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    throw new ValidationError('V1 template must have a valid name', 'name');
  }

  if (!manifest.description || typeof manifest.description !== 'string') {
    throw new ValidationError('V1 template must have a valid description', 'description');
  }

  // Validate required placeholderFormat field
  if (!manifest.placeholderFormat || typeof manifest.placeholderFormat !== 'string') {
    throw new ValidationError(
      'V1 template must specify placeholderFormat (unicode, mustache, dollar, or percent)',
      'placeholderFormat'
    );
  }

  // Validate placeholderFormat value
  const validFormats = ['unicode', 'mustache', 'dollar', 'percent'];
  if (!validFormats.includes(manifest.placeholderFormat)) {
    throw new ValidationError(
      `Invalid placeholderFormat: ${manifest.placeholderFormat}. Must be one of: ${validFormats.join(', ')}`,
      'placeholderFormat'
    );
  }

  // Validate required placeholders field
  if (!manifest.placeholders || typeof manifest.placeholders !== 'object' || Array.isArray(manifest.placeholders)) {
    throw new ValidationError('V1 template must have a placeholders object', 'placeholders');
  }

  // Validate dimensions if present
  if (manifest.dimensions) {
    validateDimensions(manifest.dimensions);
  }

  // Validate gates if present
  if (manifest.gates) {
    validateGates(manifest.gates);
  }

  // Validate featureSpecs if present
  if (manifest.featureSpecs) {
    validateFeatureSpecs(manifest.featureSpecs);
  }

  // Validate hints if present
  if (manifest.hints) {
    validateHints(manifest.hints);
  }

  // Process placeholders from V1 format (object) to normalized array format
  const normalizedPlaceholders = processPlaceholders(manifest.placeholders);

  const result = Object.freeze({
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    description: manifest.description,
    dimensions: manifest.dimensions || {},
    gates: manifest.gates || {},
    featureSpecs: manifest.featureSpecs || {},
    hints: manifest.hints || {},
    // Setup properties with correct defaults
    authorAssetsDir: manifest.setup?.authorAssetsDir || '__scaffold__',
    placeholders: normalizePlaceholders(normalizedPlaceholders),
    canonicalVariables: [] as readonly string[],
    handoff: Object.freeze(manifest.handoff || [])
  });

  manifestCache.set(manifest, result);
  return result;
}

/**
 * Validate dimensions configuration.
 */
function validateDimensions(dimensions: unknown): void {
  if (typeof dimensions !== 'object' || Array.isArray(dimensions) || dimensions === null) {
    throw new ValidationError('dimensions must be an object', 'dimensions');
  }

  for (const [dimName, dimConfig] of Object.entries(dimensions as Record<string, unknown>)) {
    if (typeof dimConfig !== 'object' || dimConfig === null || Array.isArray(dimConfig)) {
      throw new ValidationError(`dimension '${dimName}' must be an object`, `dimensions.${dimName}`);
    }

    const config = dimConfig as Record<string, unknown>;

    // Handle different dimension formats
    if (config.values) {
      // Simple format: { values: [...] }
      if (!Array.isArray(config.values)) {
        throw new ValidationError(
          `dimension '${dimName}' values must be an array`,
          `dimensions.${dimName}.values`
        );
      }
      if ((config.values as unknown[]).length === 0) {
        throw new ValidationError(
          `dimension '${dimName}' must have at least one value`,
          `dimensions.${dimName}.values`
        );
      }
    } else if (config.options) {
      // Structured format: { name, description, options: [{id, name}, ...] }
      if (!config.name || typeof config.name !== 'string') {
        throw new ValidationError(
          `dimension '${dimName}' must have a name`,
          `dimensions.${dimName}.name`
        );
      }
      if (!config.description || typeof config.description !== 'string') {
        throw new ValidationError(
          `dimension '${dimName}' must have a description`,
          `dimensions.${dimName}.description`
        );
      }
      if (!Array.isArray(config.options)) {
        throw new ValidationError(
          `dimension '${dimName}' must have options array`,
          `dimensions.${dimName}.options`
        );
      }
      // Validate each option
      (config.options as unknown[]).forEach((option, index) => {
        const opt = option as Record<string, unknown>;
        if (!opt.id || typeof opt.id !== 'string') {
          throw new ValidationError(
            `dimension '${dimName}' option ${index} must have an id`,
            `dimensions.${dimName}.options[${index}].id`
          );
        }
        if (!opt.name || typeof opt.name !== 'string') {
          throw new ValidationError(
            `dimension '${dimName}' option ${index} must have a name`,
            `dimensions.${dimName}.options[${index}].name`
          );
        }
      });
    } else {
      throw new ValidationError(
        `dimension '${dimName}' must have either 'values' or 'options' property`,
        `dimensions.${dimName}`
      );
    }
  }
}

/**
 * Validate gates configuration.
 */
function validateGates(gates: unknown): void {
  if (typeof gates !== 'object' || Array.isArray(gates) || gates === null) {
    throw new ValidationError('gates must be an object', 'gates');
  }

  for (const [gateName, gateConfig] of Object.entries(gates as Record<string, unknown>)) {
    if (typeof gateConfig !== 'object' || gateConfig === null || Array.isArray(gateConfig)) {
      throw new ValidationError(`gate '${gateName}' must be an object`, `gates.${gateName}`);
    }
    // At minimum, gates should have some configuration
    if (Object.keys(gateConfig as object).length === 0) {
      throw new ValidationError(
        `gate '${gateName}' must have configuration properties`,
        `gates.${gateName}`
      );
    }
  }
}

/**
 * Validate featureSpecs configuration.
 */
function validateFeatureSpecs(featureSpecs: unknown): void {
  if (typeof featureSpecs !== 'object' || Array.isArray(featureSpecs) || featureSpecs === null) {
    throw new ValidationError('featureSpecs must be an object', 'featureSpecs');
  }

  for (const [featureName, featureConfig] of Object.entries(featureSpecs as Record<string, unknown>)) {
    if (typeof featureConfig !== 'object' || featureConfig === null || Array.isArray(featureConfig)) {
      throw new ValidationError(`feature '${featureName}' must be an object`, `featureSpecs.${featureName}`);
    }
    // At minimum, features should have some identifying information
    if (Object.keys(featureConfig as object).length === 0) {
      throw new ValidationError(
        `feature '${featureName}' must have configuration properties`,
        `featureSpecs.${featureName}`
      );
    }
  }
}

/**
 * Validate hints configuration.
 */
function validateHints(hints: unknown): void {
  if (typeof hints !== 'object' || Array.isArray(hints) || hints === null) {
    throw new ValidationError('hints must be an object', 'hints');
  }

  for (const [hintName, hintConfig] of Object.entries(hints as Record<string, unknown>)) {
    if (typeof hintConfig !== 'object' || hintConfig === null || Array.isArray(hintConfig)) {
      throw new ValidationError(`hint '${hintName}' must be an object`, `hints.${hintName}`);
    }
    // At minimum, hints should have some content
    if (Object.keys(hintConfig as object).length === 0) {
      throw new ValidationError(
        `hint '${hintName}' must have configuration properties`,
        `hints.${hintName}`
      );
    }
  }
}

/**
 * Placeholder config from manifest.
 */
interface PlaceholderConfig {
  description?: string;
  default?: string | number | boolean;
  required?: boolean;
  secure?: boolean;
  type?: string;
}

/**
 * Process placeholders from V1 format (object) to normalized array format.
 */
function processPlaceholders(placeholders: unknown): Array<{
  name: string;
  description: string;
  default?: string | number | boolean;
  required: boolean;
  sensitive: boolean;
  type: string;
}> {
  const normalizedPlaceholders: Array<{
    name: string;
    description: string;
    default?: string | number | boolean;
    required: boolean;
    sensitive: boolean;
    type: string;
  }> = [];

  if (typeof placeholders !== 'object' || Array.isArray(placeholders) || placeholders === null) {
    throw new ValidationError(
      'placeholders must be an object with placeholder names as keys',
      'placeholders'
    );
  }

  // Convert object format to array format expected by placeholder resolver
  for (const [placeholderName, config] of Object.entries(placeholders as Record<string, unknown>)) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new ValidationError(
        `placeholder '${placeholderName}' must be an object`,
        `placeholders.${placeholderName}`
      );
    }

    const phConfig = config as PlaceholderConfig;

    // Validate required properties (description is the only required field per new schema)
    if (typeof phConfig.description !== 'string') {
      throw new ValidationError(
        `placeholder '${placeholderName}' must have a string description`,
        `placeholders.${placeholderName}.description`
      );
    }

    // Validate optional default field (can be string, number, or boolean per new schema)
    if (phConfig.default !== undefined) {
      const defaultType = typeof phConfig.default;
      if (defaultType !== 'string' && defaultType !== 'number' && defaultType !== 'boolean') {
        throw new ValidationError(
          `placeholder '${placeholderName}' default must be string, number, or boolean`,
          `placeholders.${placeholderName}.default`
        );
      }
    }

    // Convert to the format expected by normalizePlaceholders
    normalizedPlaceholders.push({
      name: `{{${placeholderName}}}`,
      description: phConfig.description,
      default: phConfig.default, // Can be undefined (optional per new schema)
      required: phConfig.required !== undefined ? phConfig.required : true, // New schema: defaults to true
      sensitive: phConfig.secure || false, // New schema uses 'secure' instead of 'sensitive'
      type: phConfig.type || 'text' // New schema: defaults to 'text' (was 'string' in old schema)
    });
  }

  return normalizedPlaceholders;
}

// Legacy export name for backward compatibility
export { validate as validateTemplateManifest };
