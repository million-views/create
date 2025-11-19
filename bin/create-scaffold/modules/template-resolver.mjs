#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import {
  ContextualError, ErrorContext, ErrorSeverity
} from '../../../lib/error-handler.mjs';
import { sanitizePath, validateRepoUrl } from '../../../lib/security.mjs';
import { CacheManager } from './cache-manager.mjs';

/**
 * Template URL Resolver
 * Resolves template URLs to template directories and extracts parameters
 */
export class TemplateResolver {
  constructor(cacheManager = new CacheManager(), config = {}) {
    this.cacheManager = cacheManager;
    this.config = config;
  }

  /**
   * Resolve registry aliases - if templateUrl matches registry/template format, return the mapped value
   * @param {string} templateUrl - Template URL that might be a registry alias
   * @returns {string} - Resolved URL (original or mapped value)
   */
  resolveRegistryAlias(templateUrl) {
    // First check templates config for aliases
    const templates = this.config?.defaults?.templates;
    if (templates && typeof templates === 'object') {
      // Check if templateUrl matches alias/template format
      const slashIndex = templateUrl.indexOf('/');
      if (slashIndex !== -1) {
        const aliasName = templateUrl.substring(0, slashIndex);
        const templateName = templateUrl.substring(slashIndex + 1);

        if (templateName) {
          const alias = templates[aliasName];
          if (alias && typeof alias === 'object') {
            const mappedUrl = alias[templateName];
            if (typeof mappedUrl === 'string' && mappedUrl.trim()) {
              return mappedUrl.trim();
            }
          }
        }
      }
    }

    // Fallback to legacy registries for backward compatibility
    const registries = this.config?.defaults?.registries;
    if (!registries || typeof registries !== 'object') {
      return templateUrl;
    }

    // Check if templateUrl matches registry/template format
    const slashIndex = templateUrl.indexOf('/');
    if (slashIndex === -1) {
      return templateUrl; // No slash, not a registry reference
    }

    const registryName = templateUrl.substring(0, slashIndex);
    const templateName = templateUrl.substring(slashIndex + 1);

    if (!templateName) {
      return templateUrl; // No template name after slash
    }

    // Check if registry exists and is a legacy template mapping
    const registry = registries[registryName];
    if (!registry || typeof registry !== 'object' || registry.type) {
      return templateUrl; // Not a legacy template mapping
    }

    // Check if template exists in registry
    const mappedUrl = registry[templateName];
    if (typeof mappedUrl === 'string' && mappedUrl.trim()) {
      return mappedUrl.trim();
    }

    return templateUrl; // Template not found in registry
  }

  /**
   * Resolve a template URL to a template directory
   * @param {string} templateUrl - Template URL or shorthand
   * @param {object} options - Resolution options
   * @returns {Promise<{templatePath: string, parameters: object, metadata: object}>}
   */
  async resolveTemplate(templateUrl, options = {}) {
    const { branch = 'main', logger } = options;

    // Validate the original URL format first
    const _validatedUrl = this.validateTemplateUrl(templateUrl);

    // Then check if templateUrl matches a registry alias
    const resolvedUrl = this.resolveRegistryAlias(templateUrl);

    // Parse URL to extract components (use resolved URL to preserve branch info)
    const parsed = this.parseTemplateUrl(resolvedUrl);

    // Resolve to actual template directory
    const templatePath = await this.resolveToPath(parsed, { branch, logger });

    // Extract template parameters from URL
    const parameters = this.extractParameters(parsed);

    // Load template metadata
    const metadata = await this.loadTemplateMetadata(templatePath);

    return {
      templatePath,
      parameters,
      metadata
    };
  }

  /**
   * Validate template URL format
   * @param {string} templateUrl - Template URL to validate
   * @returns {string} - Validated URL
   */
  validateTemplateUrl(templateUrl) {
    if (!templateUrl || typeof templateUrl !== 'string') {
      throw new ContextualError('Template URL must be a non-empty string', {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        suggestions: [
          'Provide a valid template URL or name',
          'Use --help to see template URL examples'
        ]
      });
    }

    // Check for injection characters
    if (templateUrl.includes('\0')) {
      throw new ContextualError('Template contains null bytes', {
        context: ErrorContext.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        suggestions: [
          'Avoid null bytes in template URLs',
          'Use only safe characters in template specifications'
        ]
      });
    }

    // Check for command injection characters
    if (templateUrl.includes(';') || templateUrl.includes('|') || templateUrl.includes('&') ||
        templateUrl.includes('`') || templateUrl.includes('$(') || templateUrl.includes('${')) {
      throw new ContextualError('Template not accessible', {
        context: ErrorContext.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        suggestions: [
          'Avoid shell metacharacters in template URLs',
          'Use only alphanumeric characters, slashes, and safe punctuation'
        ]
      });
    }

    // Handle local paths
    if (templateUrl.startsWith('/') || templateUrl.startsWith('./') || templateUrl.startsWith('../') || templateUrl.startsWith('~')) {
      // Validate local paths for security (path traversal prevention)
      try {
        sanitizePath(templateUrl);
      } catch (error) {
        throw new ContextualError(`Invalid template path: ${error.message}`, {
          context: ErrorContext.USER_INPUT,
          severity: ErrorSeverity.HIGH,
          suggestions: [
            'Avoid using ".." in template paths',
            'Use absolute paths or paths within the current directory',
            'Configure registries in .m5nvrc and use registry/template-name format'
          ]
        });
      }
      return templateUrl;
    }

    // Handle registry URLs
    if (!templateUrl.includes('://') && templateUrl.includes('/')) {
      const parts = templateUrl.split('/');
      if (parts.length >= 2 && parts.length <= 3) {
        const registryName = parts[0];
        // Known registry names - could be expanded from config in the future
        const knownRegistries = ['registry', 'official', 'community', 'private'];
        if (knownRegistries.includes(registryName)) {
          return templateUrl; // Allow registry URLs
        }
      }
    }

    // Handle full URLs and GitHub shorthand
    try {
      // For GitHub shorthand with branch syntax (user/repo#branch), validate the user/repo part only
      let urlToValidate = templateUrl;
      if (!templateUrl.includes('://') && templateUrl.includes('#')) {
        const hashIndex = templateUrl.indexOf('#');
        urlToValidate = templateUrl.substring(0, hashIndex);
      }
      validateRepoUrl(urlToValidate);
      return templateUrl;
    } catch (error) {
      throw new ContextualError(`Invalid template URL format: ${templateUrl}`, {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        technicalDetails: error.message,
        suggestions: [
          'Configure registries in .m5nvrc and use registry/template-name format',
          'Use user/repo for GitHub repositories',
          'Use user/repo#branch for specific branches',
          'Use https://github.com/user/repo for full URLs',
          'Use ./path/to/local/template for local templates'
        ]
      });
    }
  }

  /**
   * Parse template URL into components
   * @param {string} templateUrl - Template URL to parse
   * @returns {object} - Parsed URL components
   */
  parseTemplateUrl(templateUrl) {
    // Handle local paths
    if (templateUrl.startsWith('/') || templateUrl.startsWith('./') || templateUrl.startsWith('../') || templateUrl.startsWith('~')) {
      return {
        type: 'local',
        path: templateUrl,
        parameters: []
      };
    }

    // Handle full URLs (including GitHub URLs with branches, tags, etc.)
    if (templateUrl.includes('://')) {
      return this.parseFullUrl(templateUrl);
    }

    // Handle registry URLs: registry/namespace/template or registry/template
    if (!templateUrl.includes('://') && templateUrl.includes('/')) {
      const parts = templateUrl.split('/');
      if (parts.length >= 2 && parts.length <= 3) {
        // Check if this looks like a registry URL (first part is a known registry name)
        const registryName = parts[0];
        // Known registry names - could be expanded from config in the future
        const knownRegistries = ['registry', 'official', 'community', 'private'];
        if (knownRegistries.includes(registryName)) {
          if (parts.length === 2) {
            // registry/template format - assume 'official' namespace
            return {
              type: 'registry',
              namespace: 'official',
              template: parts[1],
              parameters: []
            };
          } else if (parts.length === 3) {
            // registry/namespace/template format
            return {
              type: 'registry',
              namespace: parts[1],
              template: parts[2],
              parameters: []
            };
          }
        }
      }
    }

    // Handle GitHub shorthand with branch: owner/repo#branch or owner/repo#branch/path
    if (!templateUrl.includes('://') && templateUrl.includes('/')) {
      // Check if there's a #branch suffix
      const hashIndex = templateUrl.indexOf('#');
      let branch = null;
      let subpathFromBranch = '';
      let repoPart = templateUrl;

      if (hashIndex !== -1) {
        const branchPart = templateUrl.substring(hashIndex + 1);
        repoPart = templateUrl.substring(0, hashIndex);

        // Split branch part on first slash: branch/subpath
        const branchParts = branchPart.split('/');
        branch = branchParts[0];
        subpathFromBranch = branchParts.slice(1).join('/');
      }

      const parts = repoPart.split('/');
      if (parts.length >= 2) {
        const result = {
          type: 'github-shorthand',
          owner: parts[0],
          repo: parts[1].replace(/\.git$/, ''), // Remove .git suffix if present
          subpath: parts.length > 2 ? parts.slice(2).join('/') : subpathFromBranch,
          branch,
          parameters: []
        };
        // If we have subpath from both repo part and branch part, combine them
        if (parts.length > 2 && subpathFromBranch) {
          result.subpath = path.join(result.subpath, subpathFromBranch);
        } else if (subpathFromBranch) {
          result.subpath = subpathFromBranch;
        }
        return result;
      }
    }

    throw new ContextualError(`Unsupported template URL format: ${templateUrl} (checked local, full URL, and GitHub shorthand)`, {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Use user/repo for GitHub repositories',
        'Use user/repo#branch for specific branches',
        'Use https://github.com/user/repo for full URLs',
        'Use ./path/to/local/template for local templates',
        'Configure registries in .m5nvrc for custom aliases'
      ]
    });
  }

  /**
   * Parse full URLs including GitHub URLs with branches, tags, archives, etc.
   * @param {string} templateUrl - Full URL to parse
   * @returns {object} - Parsed URL components
   */
  parseFullUrl(templateUrl) {
    const url = new URL(templateUrl);

    // Handle GitHub URLs specifically
    if (url.hostname === 'github.com') {
      return this.parseGitHubUrl(url);
    }

    // Handle tarball URLs
    if (templateUrl.endsWith('.tar.gz') || templateUrl.endsWith('.tgz')) {
      return {
        type: 'tarball',
        url: templateUrl,
        parameters: []
      };
    }

    // Handle other URLs as generic repository URLs
    return {
      type: 'url',
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams),
      parameters: []
    };
  }

  /**
   * Parse GitHub URLs with support for branches, tags, archives, etc.
   * @param {URL} url - Parsed URL object
   * @returns {object} - Parsed GitHub URL components
   */
  parseGitHubUrl(url) {
    const pathname = url.pathname.replace(/^\//, '');
    const parts = pathname.split('/');

    if (parts.length < 2) {
      throw new ContextualError('Invalid GitHub URL format', {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        technicalDetails: `Expected: https://github.com/owner/repo[/path], got: ${url.href}`,
        suggestions: [
          'Use https://github.com/owner/repo for repository root',
          'Use https://github.com/owner/repo/tree/branch for specific branch',
          'Use https://github.com/owner/repo/tree/branch/path for subdirectory'
        ]
      });
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    const remainingParts = parts.slice(2);

    // Handle archive/tag URLs
    if (pathname.includes('/archive/refs/tags/') || pathname.includes('/releases/download/')) {
      return {
        type: 'github-archive',
        owner,
        repo,
        archiveUrl: url.href,
        parameters: []
      };
    }

    // Handle tree URLs (branches and subdirectories)
    if (remainingParts[0] === 'tree' && remainingParts.length >= 2) {
      const branch = remainingParts[1];
      const subpath = remainingParts.slice(2).join('/');
      return {
        type: 'github-branch',
        owner,
        repo,
        branch,
        subpath,
        parameters: []
      };
    }

    // Handle regular repository URLs
    const subpath = remainingParts.join('/');
    return {
      type: 'github-repo',
      owner,
      repo,
      subpath,
      parameters: []
    };
  }

  /**
   * Resolve parsed URL to actual template directory path
   * @param {object} parsed - Parsed URL components
   * @param {object} options - Resolution options
   * @returns {Promise<string>} - Template directory path
   */
  async resolveToPath(parsed, options = {}) {
    const { branch = 'main', _logger } = options;

    switch (parsed.type) {
      case 'local':
        return this.resolveLocalPath(parsed.path);

      case 'registry':
        return this.resolveRegistryUrl(parsed, options);

      case 'github-shorthand':
        try {
          const shorthandUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
          const shorthandBranch = parsed.branch || branch;
          const shorthandCachedPath = await this.cacheManager.getCachedRepo(shorthandUrl, shorthandBranch);
          if (shorthandCachedPath) {
            return parsed.subpath ? path.join(shorthandCachedPath, parsed.subpath) : shorthandCachedPath;
          }
          // Need to populate cache
          const shorthandPopulatedPath = await this.cacheManager.populateCache(shorthandUrl, shorthandBranch);
          return parsed.subpath ? path.join(shorthandPopulatedPath, parsed.subpath) : shorthandPopulatedPath;
        } catch (error) {
          // Re-throw all errors - no fallback allowed as it masks security validation failures
          throw new ContextualError('Template not accessible (git clone failed)', {
            context: ErrorContext.TEMPLATE,
            severity: ErrorSeverity.HIGH,
            technicalDetails: error.message,
            suggestions: [
              'Verify the repository exists and is accessible',
              'Check that the specified branch exists',
              'Ensure you have permission to access the repository'
            ]
          });
        }

      case 'github-repo':
        const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        const repoCachedPath = await this.cacheManager.getCachedRepo(repoUrl, branch);
        if (repoCachedPath) {
          return parsed.subpath ? path.join(repoCachedPath, parsed.subpath) : repoCachedPath;
        }
        try {
          const repoPopulatedPath = await this.cacheManager.populateCache(repoUrl, branch);
          return parsed.subpath ? path.join(repoPopulatedPath, parsed.subpath) : repoPopulatedPath;
        } catch (error) {
          // Re-throw all errors - no fallback allowed as it masks security validation failures
          throw new ContextualError('Template not accessible (git clone failed)', {
            context: ErrorContext.TEMPLATE,
            severity: ErrorSeverity.HIGH,
            technicalDetails: error.message,
            suggestions: [
              'Verify the repository exists and is accessible',
              'Check that the specified branch exists',
              'Ensure you have permission to access the repository'
            ]
          });
        }

      case 'github-branch':
        const branchUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        const branchCachedPath = await this.cacheManager.getCachedRepo(branchUrl, parsed.branch);
        if (branchCachedPath) {
          return parsed.subpath ? path.join(branchCachedPath, parsed.subpath) : branchCachedPath;
        }
        try {
          const branchPopulatedPath = await this.cacheManager.populateCache(branchUrl, parsed.branch);
          return parsed.subpath ? path.join(branchPopulatedPath, parsed.subpath) : branchPopulatedPath;
        } catch (error) {
          // Re-throw all errors - no fallback allowed as it masks security validation failures
          throw new ContextualError('Template not accessible (git clone failed)', {
            context: ErrorContext.TEMPLATE,
            severity: ErrorSeverity.HIGH,
            technicalDetails: error.message,
            suggestions: [
              'Verify the repository exists and is accessible',
              'Check that the specified branch exists',
              'Ensure you have permission to access the repository'
            ]
          });
        }

      case 'github-archive':
        // For now, treat archives as repositories (future: download and extract)
        throw new ContextualError('GitHub archive URLs not yet supported', {
          context: ErrorContext.TEMPLATE,
          severity: ErrorSeverity.HIGH,
          technicalDetails: 'Archive URLs (tags, releases) are not yet implemented',
          suggestions: [
            'Use repository URLs instead: https://github.com/owner/repo',
            'Use branch URLs for specific branches: https://github.com/owner/repo/tree/branch'
          ]
        });

      case 'tarball':
        // For now, treat tarballs as unsupported
        throw new ContextualError('Tarball URLs not yet supported', {
          context: ErrorContext.TEMPLATE,
          severity: ErrorSeverity.HIGH,
          technicalDetails: 'Direct tarball URLs are not yet implemented',
          suggestions: [
            'Use repository URLs instead: https://github.com/owner/repo',
            'Use local paths for tarballs: ./path/to/template.tar.gz'
          ]
        });

      case 'url':
        // Handle tarball URLs, GitHub URLs, etc.
        return this.resolveFullUrl(parsed, options);

      default:
        throw new Error(`Unsupported URL type: ${parsed.type}`);
    }
  }

  /**
   * Resolve local file path
   * @param {string} localPath - Local path
   * @returns {string} - Absolute path
   */
  resolveLocalPath(localPath) {
    const absolutePath = path.resolve(localPath);
    // Validate it exists and is a directory
    // Note: We'll validate existence when actually accessing
    return absolutePath;
  }

  /**
   * Resolve full URLs (tarballs, direct repo URLs, etc.)
   * @param {object} parsed - Parsed URL
   * @param {object} options - Options
   * @returns {Promise<string>} - Template path
   */
  async resolveFullUrl(parsed, options) {
    // For now, treat as repository URL
    // Future: handle tarballs, specific file URLs, etc.
    const url = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    const cachedPath = await this.cacheManager.getCachedRepo(url, options.branch);

    if (cachedPath) {
      return cachedPath;
    }

    try {
      return this.cacheManager.populateCache(url, options.branch);
    } catch (error) {
      // Re-throw all errors - no fallback allowed as it masks security validation failures
      throw new ContextualError('Template not accessible (git clone failed)', {
        context: ErrorContext.TEMPLATE,
        severity: ErrorSeverity.HIGH,
        technicalDetails: error.message,
        suggestions: [
          'Verify the repository exists and is accessible',
          'Check that the specified branch exists',
          'Ensure you have permission to access the repository'
        ]
      });
    }
  }

  /**
   * Resolve registry URLs
   * @param {object} parsed - Parsed registry URL
   * @param {object} options - Options
   * @returns {Promise<string>} - Template path
   */
  async resolveRegistryUrl(parsed, options) {
    // For now, map registry URLs to template directories
    // Note: Local registry folder removed - use config-based registries instead
    const registryMappings = {
      'official': {
        'nextjs-app': 'million-views/packages/nextjs-app'
      }
    };

    const namespace = registryMappings[parsed.namespace];
    if (!namespace) {
      throw new ContextualError(`Unknown registry namespace: ${parsed.namespace}`, {
        context: ErrorContext.TEMPLATE,
        severity: ErrorSeverity.HIGH,
        suggestions: [
          'Available namespaces: official',
          'Configure registries in .m5nvrc for custom aliases',
          'Run with --list-templates to see available templates'
        ]
      });
    }

    const templatePath = namespace[parsed.template];
    if (!templatePath) {
      throw new ContextualError(`Unknown template in ${parsed.namespace} namespace: ${parsed.template}`, {
        context: ErrorContext.TEMPLATE,
        severity: ErrorSeverity.HIGH,
        suggestions: [
          `Available templates in ${parsed.namespace}: ${Object.keys(namespace).join(', ')}`,
          'Run with --list-templates to see all available templates',
          'Check template name for typos'
        ]
      });
    }

    // For local registry templates, return the path directly
    if (templatePath.startsWith('registry/')) {
      throw new ContextualError('Local registry paths are no longer supported', {
        context: ErrorContext.TEMPLATE,
        severity: ErrorSeverity.HIGH,
        suggestions: [
          'Configure registries in your .m5nvrc config file',
          'Use registry aliases like "myregistry/template" after configuration',
          'Use GitHub URLs or local paths directly'
        ]
      });
    }

    // For GitHub repos, resolve as before
    const shorthandParsed = {
      type: 'github-shorthand',
      owner: templatePath.split('/')[0],
      repo: templatePath.split('/')[1],
      subpath: '',
      parameters: []
    };

    return this.resolveToPath(shorthandParsed, options);
  }

  /**
   * Extract parameters from parsed URL
   * @param {object} parsed - Parsed URL
   * @returns {object} - Extracted parameters
   */
  extractParameters(parsed) {
    const parameters = {};

    // Extract from search params (for full URLs)
    if (parsed.searchParams) {
      Object.assign(parameters, parsed.searchParams);
    }

    // Extract from URL path segments (future: support query-like syntax)
    // For now, basic parameter extraction

    return parameters;
  }

  /**
   * Load template metadata from template directory
   * @param {string} templatePath - Template directory path
   * @returns {Promise<object>} - Template metadata
   */
  async loadTemplateMetadata(templatePath) {
    try {
      const templateJsonPath = path.join(templatePath, 'template.json');
      const content = await fs.readFile(templateJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (_error) {
      // Return minimal metadata for backward compatibility
      return {
        id: path.basename(templatePath),
        name: path.basename(templatePath),
        version: '1.0.0'
      };
    }
  }
}
