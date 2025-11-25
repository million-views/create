/**
 * Template Discovery - Re-export shim for backward compatibility
 *
 * This file re-exports from the template domain.
 * New code should import from lib/template/index.mts.
 *
 * @deprecated Import from './template/index.mts' instead
 * @module lib/template-discovery
 */

export { TemplateDiscovery, loadTemplateMetadataFromPath } from './template/discover.mjs';
