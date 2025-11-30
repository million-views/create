/**
 * Template Runtime Validator
 *
 * Validates template.json files at runtime for consumption.
 * Returns normalized values used by downstream consumers.
 *
 * This is distinct from template-validator.mts which handles authoring validation.
 *
 * @module lib/validation/schema/template-runtime-validator
 */

import { normalizePlaceholders } from '../../placeholder/schema.mts';
import { ValidationError } from '../../error/validation.mts';

/**
 * Cache for validated manifests to avoid re-validation of the same object.
 */
const manifestCache = new WeakMap<object, ManifestResult>();

/**
 * V1.0.0 Schema: Fixed vocabulary of 7 infrastructure dimensions.
 */
const VALID_DIMENSIONS = ['deployment', 'database', 'storage', 'identity', 'billing', 'analytics', 'monitoring'] as const;

/**
 * Feature definition from V1.0.0 schema.
 */
export interface FeatureDefinition {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly needs: Record<string, 'required' | 'optional' | 'none'>;
  readonly placeholders?: readonly string[];
}

/**
 * Dimension option from V1.0.0 schema.
 */
export interface DimensionOption {
  readonly id: string;
  readonly label?: string;
  readonly desc?: string;
  readonly icon?: string;
  readonly placeholders?: readonly string[];
}

/**
 * Dimension definition from V1.0.0 schema.
 */
export interface DimensionDefinition {
  readonly label?: string;
  readonly policy?: 'strict' | 'warn';
  readonly default?: string;
  readonly options: readonly DimensionOption[];
}

/**
 * Result of manifest validation with normalized values.
 */
export interface ManifestResult {
  readonly schemaVersion: string;
  readonly name: string;
  readonly description: string;
  readonly dimensions: Record<string, DimensionDefinition>;
  readonly gates: Record<string, unknown>;
  readonly features: readonly FeatureDefinition[];
  readonly authorAssetsDir: string;
  readonly placeholders: ReturnType<typeof normalizePlaceholders>;
  readonly canonicalVariables: readonly string[];
  readonly handoff: readonly string[];
}

/**
 * Raw manifest input structure per V1.0.0 schema.
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
  dimensions?: Record<string, {
    label?: string;
    policy?: string;
    default?: string;
    options?: Array<{
      id: string;
      label?: string;
      desc?: string;
      icon?: string;
      placeholders?: string[];
    }>;
  }>;
  gates?: Record<string, unknown>;
  features?: Array<{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    needs: Record<string, string>;
    placeholders?: string[];
  }>;
  setup?: {
    script?: string;
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
 * import { validate } from './validation/schema/template-runtime-validator.mts';
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

  // Validate and normalize dimensions (V1.0.0: fixed vocabulary, options array format)
  const normalizedDimensions: Record<string, DimensionDefinition> = {};
  if (manifest.dimensions) {
    // V1.0.0: Dimensions must be an object
    if (Array.isArray(manifest.dimensions) || typeof manifest.dimensions !== 'object') {
      throw new ValidationError('dimensions must be an object', 'dimensions');
    }

    for (const [dimName, dimConfig] of Object.entries(manifest.dimensions)) {
      // V1.0.0: Only allow fixed dimension names
      if (!VALID_DIMENSIONS.includes(dimName as typeof VALID_DIMENSIONS[number])) {
        throw new ValidationError(
          `Invalid dimension name: ${dimName}. Valid dimensions are: ${VALID_DIMENSIONS.join(', ')}`,
          `dimensions.${dimName}`
        );
      }

      // V1.0.0: Dimensions must have options array
      if (!dimConfig.options || !Array.isArray(dimConfig.options)) {
        throw new ValidationError(
          `Dimension '${dimName}' must have an 'options' array`,
          `dimensions.${dimName}.options`
        );
      }

      // V1.0.0: Options array must have at least one option
      if (dimConfig.options.length === 0) {
        throw new ValidationError(
          `Dimension '${dimName}' must have at least one option`,
          `dimensions.${dimName}.options`
        );
      }

      // Validate each option
      for (let i = 0; i < dimConfig.options.length; i++) {
        const option = dimConfig.options[i];
        if (!option.id || typeof option.id !== 'string') {
          throw new ValidationError(
            `Dimension '${dimName}' option ${i} must have an 'id' string`,
            `dimensions.${dimName}.options[${i}].id`
          );
        }
        if (!/^[a-z0-9-]+$/.test(option.id)) {
          throw new ValidationError(
            `Dimension '${dimName}' option '${option.id}' has invalid format. Use lowercase letters, numbers, and hyphens only.`,
            `dimensions.${dimName}.options[${i}].id`
          );
        }
      }

      // Validate policy if present
      if (dimConfig.policy && !['strict', 'warn'].includes(dimConfig.policy)) {
        throw new ValidationError(
          `Dimension '${dimName}' policy must be 'strict' or 'warn'`,
          `dimensions.${dimName}.policy`
        );
      }

      normalizedDimensions[dimName] = {
        label: dimConfig.label,
        policy: (dimConfig.policy as 'strict' | 'warn') || 'strict',
        default: dimConfig.default,
        options: dimConfig.options.map(opt => ({
          id: opt.id,
          label: opt.label,
          desc: opt.desc,
          icon: opt.icon,
          placeholders: opt.placeholders ? Object.freeze(opt.placeholders) : undefined
        }))
      };
    }
  }

  // Validate gates if present (V1.0.0: keyed by dimension name)
  if (manifest.gates) {
    validateGates(manifest.gates, normalizedDimensions);
  }

  // Validate and normalize features (V1.0.0: array format with id, label, needs)
  const normalizedFeatures: FeatureDefinition[] = [];
  if (manifest.features && Array.isArray(manifest.features)) {
    for (let i = 0; i < manifest.features.length; i++) {
      const feature = manifest.features[i];

      if (!feature.id || typeof feature.id !== 'string') {
        throw new ValidationError(
          `Feature ${i} must have an 'id' string`,
          `features[${i}].id`
        );
      }

      if (!/^[a-z0-9_-]+$/.test(feature.id)) {
        throw new ValidationError(
          `Feature '${feature.id}' has invalid format. Use lowercase letters, numbers, underscores, and hyphens only.`,
          `features[${i}].id`
        );
      }

      if (!feature.label || typeof feature.label !== 'string') {
        throw new ValidationError(
          `Feature '${feature.id}' must have a 'label' string`,
          `features[${i}].label`
        );
      }

      if (!feature.needs || typeof feature.needs !== 'object') {
        throw new ValidationError(
          `Feature '${feature.id}' must have a 'needs' object`,
          `features[${i}].needs`
        );
      }

      // Validate needs values
      const normalizedNeeds: Record<string, 'required' | 'optional' | 'none'> = {};
      for (const [needDim, needLevel] of Object.entries(feature.needs)) {
        if (!VALID_DIMENSIONS.includes(needDim as typeof VALID_DIMENSIONS[number])) {
          throw new ValidationError(
            `Feature '${feature.id}' needs references invalid dimension: ${needDim}`,
            `features[${i}].needs.${needDim}`
          );
        }
        if (!['required', 'optional', 'none'].includes(needLevel)) {
          throw new ValidationError(
            `Feature '${feature.id}' needs.${needDim} must be 'required', 'optional', or 'none'`,
            `features[${i}].needs.${needDim}`
          );
        }
        normalizedNeeds[needDim] = needLevel as 'required' | 'optional' | 'none';
      }

      normalizedFeatures.push({
        id: feature.id,
        label: feature.label,
        description: feature.description,
        icon: feature.icon,
        needs: normalizedNeeds,
        placeholders: feature.placeholders ? Object.freeze(feature.placeholders) : undefined
      });
    }
  }

  // Process placeholders from V1 format (object) to normalized array format
  const normalizedPlaceholders = processPlaceholders(manifest.placeholders);

  const result: ManifestResult = Object.freeze({
    schemaVersion: manifest.schemaVersion as '1.0.0',
    name: manifest.name,
    description: manifest.description,
    dimensions: normalizedDimensions,
    gates: manifest.gates || {},
    features: Object.freeze(normalizedFeatures),
    authorAssetsDir: manifest.setup?.authorAssetsDir || '__scaffold__',
    placeholders: normalizePlaceholders(normalizedPlaceholders),
    canonicalVariables: [] as readonly string[],
    handoff: Object.freeze(manifest.handoff || [])
  });

  manifestCache.set(manifest, result);
  return result;
}

/**
 * Validate gates configuration per V1.0.0 schema.
 * Gates are keyed by dimension name, then by option ID.
 */
function validateGates(gates: unknown, dimensions: Record<string, DimensionDefinition>): void {
  if (typeof gates !== 'object' || Array.isArray(gates) || gates === null) {
    throw new ValidationError('gates must be an object', 'gates');
  }

  const dimensionNames = new Set(Object.keys(dimensions));

  for (const [dimName, dimGates] of Object.entries(gates as Record<string, unknown>)) {
    // V1.0.0: Gate keys must be valid dimension names
    if (!VALID_DIMENSIONS.includes(dimName as typeof VALID_DIMENSIONS[number])) {
      throw new ValidationError(
        `Gate key '${dimName}' is not a valid dimension. Valid dimensions are: ${VALID_DIMENSIONS.join(', ')}`,
        `gates.${dimName}`
      );
    }

    if (typeof dimGates !== 'object' || dimGates === null || Array.isArray(dimGates)) {
      throw new ValidationError(`gates.${dimName} must be an object`, `gates.${dimName}`);
    }

    // Get valid option IDs for this dimension
    const validOptionIds = new Set(
      dimensions[dimName]?.options.map(opt => opt.id) || []
    );

    for (const [optionId, constraints] of Object.entries(dimGates as Record<string, unknown>)) {
      // Validate option ID exists in dimension (if dimension is defined)
      if (dimensionNames.has(dimName) && !validOptionIds.has(optionId)) {
        throw new ValidationError(
          `Gate option '${optionId}' is not defined in dimension '${dimName}'`,
          `gates.${dimName}.${optionId}`
        );
      }

      if (typeof constraints !== 'object' || constraints === null || Array.isArray(constraints)) {
        throw new ValidationError(
          `gates.${dimName}.${optionId} must be an object`,
          `gates.${dimName}.${optionId}`
        );
      }

      // Validate constraint targets are valid dimensions
      for (const [targetDim, allowedValues] of Object.entries(constraints as Record<string, unknown>)) {
        if (!VALID_DIMENSIONS.includes(targetDim as typeof VALID_DIMENSIONS[number])) {
          throw new ValidationError(
            `Gate constraint target '${targetDim}' is not a valid dimension`,
            `gates.${dimName}.${optionId}.${targetDim}`
          );
        }

        if (!Array.isArray(allowedValues)) {
          throw new ValidationError(
            `gates.${dimName}.${optionId}.${targetDim} must be an array of allowed option IDs`,
            `gates.${dimName}.${optionId}.${targetDim}`
          );
        }
      }
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
      default: phConfig.default,
      required: phConfig.required !== undefined ? phConfig.required : true,
      sensitive: phConfig.secure || false,
      type: phConfig.type || 'text'
    });
  }

  return normalizedPlaceholders;
}

export { validate as validateTemplateManifest };
