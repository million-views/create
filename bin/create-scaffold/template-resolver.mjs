#!/usr/bin/env node

import path from 'node:path';
import { ContextualError, ErrorContext, ErrorSeverity } from '../../lib/shared/utils/error-handler.mjs';
import { sanitizePath } from '../../lib/shared/security.mjs';
import { CacheManager } from './cache-manager.mjs';

/**
 * Template URL Resolver
 * Resolves template URLs to template directories and extracts parameters
 */
export class TemplateResolver {
  constructor(cacheManager = new CacheManager()) {
    this.cacheManager = cacheManager;
  }

  /**
   * Resolve a template URL to a template directory
   * @param {string} templateUrl - Template URL or shorthand
   * @param {object} options - Resolution options
   * @returns {Promise<{templatePath: string, parameters: object, metadata: object}>}
   */
  async resolveTemplate(templateUrl, options = {}) {
    const { branch = 'main', logger } = options;

    // Validate the URL format
    const validatedUrl = this.validateTemplateUrl(templateUrl);

    // Parse URL to extract components
    const parsed = this.parseTemplateUrl(validatedUrl);

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

    // Handle registry URLs
    if (templateUrl.startsWith('registry/')) {
      return templateUrl; // Registry URLs have their own validation
    }

    // Handle local paths
    if (templateUrl.startsWith('/') || templateUrl.startsWith('./') || templateUrl.startsWith('../') || templateUrl.startsWith('~')) {
      console.error('DEBUG: Template resolver validating local path:', templateUrl);
      // Validate local paths for security (path traversal prevention)
      try {
        sanitizePath(templateUrl);
        console.error('DEBUG: Template resolver validation passed for:', templateUrl);
      } catch (error) {
        console.error('DEBUG: Template resolver validation failed for:', templateUrl, 'error:', error.message);
        throw new ContextualError(`Invalid template path: ${error.message}`, {
          context: ErrorContext.USER_INPUT,
          severity: ErrorSeverity.HIGH,
          suggestions: [
            'Avoid using ".." in template paths',
            'Use absolute paths or paths within the current directory',
            'Use registry/official/template-name for official templates'
          ]
        });
      }
      return templateUrl;
    }

    // Handle full URLs and GitHub shorthand
    try {
      return validateRepoUrl(templateUrl);
    } catch (error) {
      throw new ContextualError(`Invalid template URL format: ${templateUrl}`, {
        context: ErrorContext.USER_INPUT,
        severity: ErrorSeverity.HIGH,
        technicalDetails: error.message,
        suggestions: [
          'Use registry/official/template-name for official templates',
          'Use user/repo for GitHub repositories',
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
    // Handle registry URLs: registry/official/express-api
    if (templateUrl.startsWith('registry/')) {
      const parts = templateUrl.split('/');
      if (parts.length < 3) {
        throw new ContextualError('Invalid registry URL format', {
          context: ErrorContext.USER_INPUT,
          severity: ErrorSeverity.HIGH,
          technicalDetails: `Expected: registry/namespace/template, got: ${templateUrl}`,
          suggestions: [
            'Use format: registry/official/template-name',
            'Available namespaces: official',
            'Run with --list-templates to see available templates'
          ]
        });
      }
      return {
        type: 'registry',
        namespace: parts[1],
        template: parts[2],
        parameters: parts.slice(3)
      };
    }

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

    // Handle GitHub shorthand: owner/repo or owner/repo/path
    if (!templateUrl.includes('://') && templateUrl.includes('/')) {
      const parts = templateUrl.split('/');
      if (parts.length >= 2) {
        return {
          type: 'github-shorthand',
          owner: parts[0],
          repo: parts[1],
          subpath: parts.slice(2).join('/'),
          parameters: []
        };
      }
    }

    throw new ContextualError(`Unsupported template URL format: ${templateUrl}`, {
      context: ErrorContext.USER_INPUT,
      severity: ErrorSeverity.HIGH,
      suggestions: [
        'Use registry/official/template-name for official templates',
        'Use user/repo for GitHub repositories',
        'Use https://github.com/user/repo for full URLs',
        'Use ./path/to/local/template for local templates'
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
    const { branch = 'main', logger } = options;

    switch (parsed.type) {
      case 'local':
        return this.resolveLocalPath(parsed.path);

      case 'github-shorthand':
        const fullUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        const cachedPath = await this.cacheManager.getCachedRepo(fullUrl, branch);
        if (cachedPath) {
          return parsed.subpath ? path.join(cachedPath, parsed.subpath) : cachedPath;
        }
        // Need to populate cache
        const populatedPath = await this.cacheManager.populateCache(fullUrl, branch);
        return parsed.subpath ? path.join(populatedPath, parsed.subpath) : populatedPath;

      case 'github-repo':
        const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        const repoCachedPath = await this.cacheManager.getCachedRepo(repoUrl, branch);
        if (repoCachedPath) {
          return parsed.subpath ? path.join(repoCachedPath, parsed.subpath) : repoCachedPath;
        }
        const repoPopulatedPath = await this.cacheManager.populateCache(repoUrl, branch);
        return parsed.subpath ? path.join(repoPopulatedPath, parsed.subpath) : repoPopulatedPath;

      case 'github-branch':
        const branchUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        const branchCachedPath = await this.cacheManager.getCachedRepo(branchUrl, parsed.branch);
        if (branchCachedPath) {
          return parsed.subpath ? path.join(branchCachedPath, parsed.subpath) : branchCachedPath;
        }
        const branchPopulatedPath = await this.cacheManager.populateCache(branchUrl, parsed.branch);
        return parsed.subpath ? path.join(branchPopulatedPath, parsed.subpath) : branchPopulatedPath;

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

      case 'registry':
        return this.resolveRegistryUrl(parsed, options);

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

    return this.cacheManager.populateCache(url, options.branch);
  }

  /**
   * Resolve registry URLs
   * @param {object} parsed - Parsed registry URL
   * @param {object} options - Options
   * @returns {Promise<string>} - Template path
   */
  async resolveRegistryUrl(parsed, options) {
    // For now, map registry URLs to local template directories
    // Future: implement actual registry system
    const registryMappings = {
      'official': {
        'express-api': 'registry/official/express-api',
        'react-spa': 'registry/official/react-spa',
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
          'Use registry/official/template-name format',
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
      return path.resolve(templatePath);
    }

    // For GitHub repos, resolve as before
    const shorthandParsed = {
      type: 'github-shorthand',
      type: 'github-shorthand',
      owner: repoPath.split('/')[0],
      repo: repoPath.split('/')[1],
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
    } catch (error) {
      // Return minimal metadata for backward compatibility
      return {
        id: path.basename(templatePath),
        name: path.basename(templatePath),
        version: '1.0.0'
      };
    }
  }
}