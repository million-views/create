/**
 * Template Domain Facade
 *
 * Exports template discovery and ignore functionality.
 *
 * @module lib/template
 */

// Template discovery
export { TemplateDiscovery, loadTemplateMetadataFromPath } from './discover.mts';

// Template ignore utilities
export {
  createTemplateIgnoreSet,
  shouldIgnoreTemplateEntry,
  stripIgnoredFromTree
} from './ignore.mts';

// Convenient aliases
export { TemplateDiscovery as Discover } from './discover.mts';
export { createTemplateIgnoreSet as ignore } from './ignore.mts';
