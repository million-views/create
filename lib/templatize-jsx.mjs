/**
 * JSX Templatization - Re-export shim for backward compatibility
 *
 * This file re-exports from the templatize domain.
 * New code should import from lib/templatize/index.mts.
 *
 * @deprecated Import from './templatize/index.mts' instead
 * @module lib/templatize-jsx
 */

export { processJSXFile } from './templatize/strategy/jsx.mjs';
