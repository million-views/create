/**
 * TypeScript definitions for the Environment module.
 *
 * The Environment object is passed to template setup scripts (_setup.mjs)
 * and provides access to project context and tools for file manipulation.
 *
 * @module lib/environment
 */

// =============================================================================
// Context Types
// =============================================================================

/**
 * User-selected options organized by dimension and raw form.
 */
export interface ContextOptions {
  /** Raw option strings as provided by user */
  readonly raw: readonly string[];
  /** Options organized by dimension name */
  readonly byDimension: Readonly<Record<string, string | readonly string[]>>;
}

/**
 * Immutable context object passed to setup scripts.
 *
 * The Context provides read-only information about the project being scaffolded.
 * All properties are deeply frozen to prevent accidental mutation.
 */
export interface Context {
  /** Sanitized project name (letters, numbers, hyphen, underscore) */
  readonly projectName: string;
  /** Absolute path to the project directory */
  readonly projectDir: string;
  /** Directory where the CLI command was executed */
  readonly cwd: string;
  /** Template authoring mode from template.json */
  readonly authoring: 'wysiwyg' | 'composable';
  /** Directory name for template assets (default: '__scaffold__') */
  readonly authorAssetsDir: string;
  /** Placeholder values collected during instantiation */
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
  /** Template-defined constants from template.json */
  readonly constants: Readonly<Record<string, unknown>>;
  /** Normalized user selections with defaults applied */
  readonly options: ContextOptions;
}

/**
 * Options for creating a Context object.
 */
export interface CreateContextOptions {
  /** Sanitized project name */
  projectName: string;
  /** Path to project directory (will be resolved to absolute) */
  projectDirectory: string;
  /** Current working directory (default: process.cwd()) */
  cwd?: string;
  /** Template authoring mode (default: 'wysiwyg') */
  authoring?: 'wysiwyg' | 'composable';
  /** Assets directory name (default: '__scaffold__') */
  authorAssetsDir?: string;
  /** Placeholder values */
  inputs?: Record<string, string | number | boolean>;
  /** Template constants */
  constants?: Record<string, unknown>;
  /** User selections */
  options?: {
    raw?: string[];
    byDimension?: Record<string, string | string[]>;
  };
}

// =============================================================================
// Tools Types
// =============================================================================

/**
 * Logger interface for setup script logging.
 */
export interface Logger {
  /** Log an info message */
  info(message: string, data?: unknown): void;
  /** Log a warning message */
  warn(message: string, data?: unknown): void;
}

/**
 * Placeholder replacement API.
 */
export interface PlaceholdersApi {
  /**
   * Apply values from ctx.inputs, ctx.projectName, and optional extra map to files.
   * @param selector - File glob pattern(s) (default: all files)
   * @param extra - Additional replacement values
   */
  applyInputs(selector?: string | string[], extra?: Record<string, unknown>): Promise<void>;

  /**
   * Replace {{TOKEN}} placeholders in files with custom values.
   * @param replacements - Map of token names to replacement values
   * @param selector - File glob pattern(s) (default: all files)
   */
  replaceAll(replacements: Record<string, string>, selector?: string | string[]): Promise<void>;

  /**
   * Replace placeholders in a single file.
   * @param file - Relative path to file
   * @param replacements - Map of token names to replacement values
   */
  replaceInFile(file: string, replacements: Record<string, string>): Promise<void>;
}

/**
 * Input values API.
 */
export interface InputsApi {
  /**
   * Get a collected placeholder value.
   * @param name - Placeholder name (e.g., 'PROJECT_NAME')
   * @param fallback - Fallback value if undefined
   */
  get<T = string>(name: string, fallback?: T): T;

  /**
   * Get all placeholder values as a frozen clone.
   */
  all(): Readonly<Record<string, string | number | boolean>>;
}

/**
 * File operations API (scoped to project directory).
 */
export interface FilesApi {
  /** Read file contents as UTF-8 string */
  read(path: string): Promise<string>;

  /** Check if file or directory exists */
  exists(path: string): Promise<boolean>;

  /** Create directories (recursive) */
  ensureDirs(paths: string | string[]): Promise<void>;

  /** Copy files or directories */
  copy(from: string, to: string, options?: { overwrite?: boolean }): Promise<void>;

  /** Move files or directories */
  move(from: string, to: string, options?: { overwrite?: boolean }): Promise<void>;

  /** Remove file or directory (recursive) */
  remove(path: string): Promise<void>;

  /** Write text content to file */
  write(file: string, content: string | string[] | Buffer, options?: { overwrite?: boolean }): Promise<void>;
}

/**
 * JSON manipulation API.
 */
export interface JsonApi {
  /** Read and parse a JSON file */
  read<T = unknown>(path: string): Promise<T>;

  /** Deep-merge an object into a JSON file */
  merge(path: string, patch: object): Promise<void>;

  /** Update JSON with a function that receives mutable clone */
  update<T = unknown>(path: string, updater: (data: T) => T | void): Promise<void>;

  /** Set a value at a dot-path (e.g., 'scripts.dev') */
  set(relativePath: string, pathExpression: string, value: unknown): Promise<void>;

  /** Remove a property at a dot-path */
  remove(relativePath: string, pathExpression: string): Promise<void>;

  /** Add value to array at dot-path */
  addToArray(relativePath: string, pathExpression: string, value: unknown, options?: { unique?: boolean }): Promise<void>;

  /** Merge values into array at dot-path */
  mergeArray(relativePath: string, pathExpression: string, items: unknown[], options?: { unique?: boolean }): Promise<void>;
}

/**
 * Template asset operations API.
 */
export interface TemplatesApi {
  /** Render a string with {{TOKEN}} placeholders */
  renderString(template: string, data: Record<string, unknown>): string;

  /** Render template file and write to target location */
  renderFile(source: string, target: string, data: Record<string, unknown>): Promise<void>;

  /** Copy directory tree from template assets to project */
  copy(from: string, to: string, options?: { overwrite?: boolean }): Promise<void>;
}

/**
 * Text manipulation API.
 */
export interface TextApi {
  /** Insert block after marker line */
  insertAfter(opts: { file: string; marker: string; block: string | string[] }): Promise<void>;

  /** Ensure block exists after marker (idempotent) */
  ensureBlock(opts: { file: string; marker: string; block: string | string[] }): Promise<void>;

  /** Replace content between start and end markers */
  replaceBetween(opts: { file: string; start: string; end: string; block: string | string[] }): Promise<void>;

  /** Append lines to file */
  appendLines(opts: { file: string; lines: string | string[] }): Promise<void>;

  /** String or regex replacement */
  replace(opts: { file: string; search: string | RegExp; replace: string; ensureMatch?: boolean }): Promise<void>;
}

/**
 * Logger API for setup scripts.
 */
export interface LoggerApi {
  /** Log info message */
  info(message: string, data?: unknown): void;
  /** Log warning message */
  warn(message: string, data?: unknown): void;
  /** Log tabular data */
  table(rows: unknown[]): void;
}

/**
 * Options checking API.
 */
export interface OptionsApi {
  /** Get raw options or dimension selection */
  list(dimension?: string): string[] | string | null;

  /** Get raw option strings */
  raw(): string[];

  /** Get shallow clone of options by dimension */
  dimensions(): Record<string, string | string[]>;

  /** Check if default multi-select dimension includes value */
  has(name: string): boolean;

  /** Check if dimension includes value */
  in(dimension: string, value: string): boolean;

  /** Require value in default dimension (throws if missing) */
  require(value: string): void;
  /** Require value in dimension (throws if missing) */
  require(dimension: string, value: string): void;

  /** Run callback when default dimension includes value */
  when(value: string, fn: () => void | Promise<void>): Promise<void> | undefined;
}

/**
 * The complete Tools object passed to setup scripts.
 */
export interface Tools {
  /** Placeholder replacement operations */
  readonly placeholders: PlaceholdersApi;
  /** Input values access */
  readonly inputs: InputsApi;
  /** File system operations */
  readonly files: FilesApi;
  /** JSON manipulation */
  readonly json: JsonApi;
  /** Template asset operations */
  readonly templates: TemplatesApi;
  /** Text manipulation */
  readonly text: TextApi;
  /** Logging */
  readonly logger: LoggerApi;
  /** Options checking */
  readonly options: OptionsApi;
}

/**
 * Options for creating a Tools object.
 */
export interface ToolsConfig {
  /** Absolute path to project directory */
  projectDirectory: string;
  /** Sanitized project name */
  projectName: string;
  /** Logger with info/warn methods */
  logger?: Logger;
  /** Placeholder values */
  inputs?: Record<string, string | number | boolean>;
  /** Template constants */
  constants?: Record<string, unknown>;
  /** Author assets directory name */
  authorAssetsDir?: string;
  /** Placeholder format (unicode/double-brace) */
  placeholderFormat?: 'unicode' | 'double-brace';
  /** Template authoring mode */
  authoring?: 'wysiwyg' | 'composable';
  /** Dimension definitions */
  dimensions?: Record<string, unknown>;
  /** User-selected options */
  options?: {
    raw?: string[];
    byDimension?: Record<string, string | string[]>;
  };
}

// =============================================================================
// Environment Type
// =============================================================================

/**
 * The Environment object passed to template setup scripts.
 *
 * Setup scripts receive this frozen object as their single parameter:
 * ```javascript
 * export default async function setup({ ctx, tools }) {
 *   // ctx provides project context
 *   // tools provides file manipulation APIs
 * }
 * ```
 */
export interface Environment {
  /** Immutable context with project information */
  readonly ctx: Context;
  /** Tools for file manipulation and setup operations */
  readonly tools: Tools;
}

// =============================================================================
// Testing Types
// =============================================================================

/**
 * A logger that captures calls for test assertions.
 */
export interface TestLogger extends Logger {
  /** Captured info() call messages */
  infoCalls: string[];
  /** Captured warn() call messages */
  warnCalls: string[];
}

/**
 * Default values used by test utilities.
 */
export interface TestDefaults {
  readonly projectName: string;
  readonly projectDirectory: string;
  readonly authoring: 'wysiwyg' | 'composable';
  readonly authorAssetsDir: string;
  readonly placeholderFormat: string;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an immutable Context object.
 * @throws {ContextValidationError} If required fields are missing or invalid
 */
export function createContext(options: CreateContextOptions): Context;

/**
 * Check if a value is a valid Context object.
 */
export function isContext(value: unknown): value is Context;

/**
 * Create a Tools object for template setup scripts.
 */
export function createTools(config: ToolsConfig): Promise<Tools>;

/**
 * Check if a value is a valid Tools object.
 */
export function isTools(value: unknown): value is Tools;

// =============================================================================
// Testing Utilities
// =============================================================================

/** Default values for test environments */
export const TEST_DEFAULTS: TestDefaults;

/** Default directory name for template author assets */
export const DEFAULT_AUTHOR_ASSETS_DIR: string;

/** Default template authoring mode */
export const DEFAULT_AUTHORING_MODE: 'wysiwyg' | 'composable';

/**
 * Create a minimal valid Context for testing.
 */
export function createTestContext(overrides?: Partial<CreateContextOptions>): Context;

/**
 * Create a Tools object for testing.
 * @param config - Must include projectDirectory
 */
export function createTestTools(config: ToolsConfig & { projectDirectory: string }): Promise<Tools>;

/**
 * Create a complete Environment object for testing.
 * @param config - Must include projectDirectory
 */
export function createTestEnvironment(config: ToolsConfig & { projectDirectory: string }): Promise<Environment>;

/**
 * Create a stub logger that captures log calls.
 */
export function createTestLogger(): TestLogger;

/**
 * Create a silent logger (no-op).
 */
export function createSilentLogger(): Logger;

/**
 * Validation error thrown when context construction fails.
 */
export class ContextValidationError extends Error {
  name: 'ContextValidationError';
  field: string;
  constructor(message: string, field: string);
}
