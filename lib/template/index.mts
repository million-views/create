/**
 * Template Domain Facade
 *
 * Exports template discovery and ignore functionality.
 *
 * @module lib/template
 */

// Template discovery
export { TemplateDiscovery, loadTemplateMetadataFromPath } from './discover.mjs';

// Template ignore utilities
export {
  createTemplateIgnoreSet,
  shouldIgnoreTemplateEntry,
  stripIgnoredFromTree
} from './ignore.mjs';

// Convenient aliases
export { TemplateDiscovery as Discover } from './discover.mjs';
export { createTemplateIgnoreSet as ignore } from './ignore.mjs';
