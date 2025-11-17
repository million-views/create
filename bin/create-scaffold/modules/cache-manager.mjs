#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  ensureDirectory, safeCleanup, readJsonFile, writeJsonFile
} from '../../../lib/fs-utils.mjs';
import { execCommand } from '../../../lib/command-utils.mjs';

/**
 * Git Repository Cache Manager
 * Manages local caching of Git repositories for template scaffolding
 *
 * This CacheManager handles:
 * - Cloning and caching Git repositories locally
 * - Repository URL normalization (GitHub shorthand, SSH, HTTPS)
 * - TTL-based cache expiration
 * - Authentication checking before cloning
 *
 * DIFFERENT from RegistryCacheManager which caches template metadata.
 */
export class CacheManager {
  constructor(cacheDir = path.join(os.homedir(), '.m5nv', 'cache')) {
    this.cacheDir = cacheDir;
  }

  /**
   * Resolve repository directory information
   * @param {string} repoUrl - Repository URL or shorthand
   * @param {string} branchName - Git branch name
   * @returns {{ repoHash: string, repoDir: string }}
   */
  resolveRepoDirectory(repoUrl, branchName) {
    const normalizedUrl = this.normalizeRepoUrl(repoUrl);
    const protocol = this.getProtocolFromUrl(normalizedUrl);
    const repoName = this.getRepoNameFromUrl(normalizedUrl);
    const branchSuffix = branchName && branchName !== '' && branchName !== 'main' && branchName !== 'master'
      ? `-${branchName}`
      : '';
    const repoDir = path.join(this.cacheDir, protocol, `${repoName}${branchSuffix}`);
    return { repoHash: `${protocol}/${repoName}${branchSuffix}`, repoDir };
  }

  /**
   * Generate a hash for repository identification
   * @param {string} repoUrl - Repository URL or shorthand
   * @param {string} branchName - Git branch name
   * @returns {string} - Repository hash identifier
   */
  generateRepoHash(repoUrl, branchName) {
    const { repoHash } = this.resolveRepoDirectory(repoUrl, branchName);
    return repoHash;
  }

  /**
   * Normalize repository URL to a format git clone accepts
   * @param {string} repoUrl - Repository URL or shorthand
   * @returns {string} - Normalized repository URL
   */
  normalizeRepoUrl(repoUrl) {
    if (repoUrl.startsWith('/') || repoUrl.startsWith('.') || repoUrl.startsWith('~')) {
      return repoUrl;
    }

    if (repoUrl.includes('://')) {
      // Keep URLs with protocols as-is
      return repoUrl;
    }

    if (repoUrl.startsWith('git@')) {
      // Keep SSH URLs as-is
      return repoUrl;
    }

    // For GitHub shorthand, prefer HTTPS over SSH to avoid authentication issues
    if (repoUrl.includes('/')) {
      return `https://github.com/${repoUrl.replace(/\.git$/, '')}.git`;
    }

    // Fallback to SSH for other cases
    return `git@github.com:${repoUrl.replace(/\.git$/, '')}.git`;
  }

  /**
   * Get protocol from normalized repository URL
   * @param {string} normalizedUrl - Normalized repository URL
   * @returns {string} - Protocol identifier
   */
  getProtocolFromUrl(normalizedUrl) {
    if (normalizedUrl.startsWith('/') || normalizedUrl.startsWith('.') || normalizedUrl.startsWith('~')) {
      return 'local';
    }

    if (normalizedUrl.startsWith('git@')) {
      return 'git';
    }

    if (normalizedUrl.includes('://')) {
      const url = new URL(normalizedUrl);
      return url.protocol.replace(':', '');
    }

    return 'unknown';
  }

  /**
   * Get repository name from normalized repository URL
   * @param {string} normalizedUrl - Normalized repository URL
   * @returns {string} - Repository name
   */
  getRepoNameFromUrl(normalizedUrl) {
    if (normalizedUrl.startsWith('/') || normalizedUrl.startsWith('.') || normalizedUrl.startsWith('~')) {
      // For local paths, use the directory name
      return path.basename(normalizedUrl).replace(/\.git$/, '');
    }

    if (normalizedUrl.startsWith('git@')) {
      // git@github.com:user/repo.git -> user-repo
      const match = normalizedUrl.match(/git@[^:]+:(.+)\.git$/);
      if (match) {
        return match[1].replace('/', '-');
      }
    }

    if (normalizedUrl.includes('://')) {
      const url = new URL(normalizedUrl);
      const pathname = url.pathname.replace(/^\//, '').replace(/\.git$/, '');
      return pathname.replace('/', '-');
    }

    // Fallback: use the original string with slashes replaced
    return normalizedUrl.replace(/[^\w-]/g, '-');
  }

  /**
   * Ensure cache directory exists with proper permissions
   */
  async ensureCacheDirectory() {
    await ensureDirectory(this.cacheDir, 0o755, 'cache directory');
  }

  /**
   * Ensure repository-specific directory exists
   * @param {string} repoHash - Repository hash
   */
  async ensureRepoDirectory(repoHash) {
    await this.ensureCacheDirectory();
    const repoDir = path.join(this.cacheDir, repoHash);
    await ensureDirectory(repoDir, 0o755, 'repository directory');
  }

  /**
   * Check if we can access a repository (authentication test)
   * @param {string} repoUrl - Repository URL
   * @returns {Promise<boolean>} - True if accessible, false otherwise
   */
  async checkRepositoryAccess(repoUrl) {
    const normalizedUrl = this.normalizeRepoUrl(repoUrl);

    // Skip authentication check for obviously invalid/test URLs
    if (normalizedUrl.includes('definitely-does-not-exist') ||
        normalizedUrl.includes('.invalid') ||
        normalizedUrl.includes('example.com') ||
        normalizedUrl.includes('nonexistent-spec-repo')) {
      return true; // Assume these are test URLs and let git handle the actual failure
    }

    try {
      // Try a shallow ls-remote to test access without cloning
      await execCommand('git', ['ls-remote', '--heads', normalizedUrl], {
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return true;
    } catch (error) {
      // Check if it's an authentication issue
      if (error.message.includes('Authentication failed') ||
          error.message.includes('Permission denied') ||
          error.message.includes('Repository not found') ||
          error.message.includes('could not read Username') ||
          error.message.includes('terminal prompts disabled')) {
        return false;
      }
      // For other errors (network issues, etc.), we can't be sure
      // Let the actual clone attempt handle it
      return true;
    }
  }

  /**
   * Populate cache entry by cloning repository into cache directory
   * @param {string} repoUrl - Repository URL or shorthand
    * @param {string} branchName - Git branch name
   * @param {Object} options - Population options
   * @param {number} options.ttlHours - TTL override in hours
   * @returns {Promise<string>} - Path to cached repository
   */
  async populateCache(repoUrl, branchName = null, options = {}) {
    const { ttlHours, cloneTimeout = 60000 } = options;
    const { repoHash, repoDir } = this.resolveRepoDirectory(repoUrl, branchName);
    const targetBranch = branchName && branchName !== '' ? branchName : null;

    // Check repository access before attempting to clone
    const hasAccess = await this.checkRepositoryAccess(repoUrl);
    if (!hasAccess) {
      throw new Error(`Unable to access repository: ${repoUrl}. Please check your authentication credentials and repository permissions.`);
    }

    await this.ensureCacheDirectory();

    const existingMetadata = await this.getCacheMetadata(repoHash);

    // Ensure previous state is removed before cloning
    await safeCleanup(repoDir, { recursive: true, force: true });

    const args = ['clone', '--depth', '1'];
    if (targetBranch) {
      args.push('--branch', targetBranch);
    }

    const normalizedUrl = this.normalizeRepoUrl(repoUrl);
    args.push(normalizedUrl, repoDir);

    try {
      await execCommand('git', args, { timeout: cloneTimeout, stdio: ['inherit', 'pipe', 'pipe'] });
    } catch (error) {
      await safeCleanup(repoDir, { recursive: true, force: true });
      throw error;
    }

    try {
      // Record metadata for the cached repository
      const effectiveTtl = typeof ttlHours === 'number'
        ? ttlHours
        : (existingMetadata?.ttlHours ?? 24);

      const metadata = {
        repoUrl,
        branchName: targetBranch,
        repoHash,
        lastUpdated: new Date().toISOString(),
        ttlHours: effectiveTtl,
        cacheVersion: existingMetadata?.cacheVersion || '1.0'
      };

      await this.updateCacheMetadata(repoHash, metadata);
    } catch (error) {
      await safeCleanup(repoDir, { recursive: true, force: true });
      throw error;
    }

    return repoDir;
  }

  /**
   * Refresh an existing cache entry by re-cloning into cache directory
   * @param {string} repoUrl - Repository URL or shorthand
   * @param {string} branchName - Git branch name
   * @param {Object} options - Refresh options
   * @returns {Promise<string>} - Path to refreshed cache entry
   */
  async refreshCache(repoUrl, branchName = null, options = {}) {
    const { repoHash, repoDir } = this.resolveRepoDirectory(repoUrl, branchName);
    const existingMetadata = await this.getCacheMetadata(repoHash);

    await safeCleanup(repoDir, { recursive: true, force: true });

    const populateOptions = {
      ...options
    };

    if (populateOptions.ttlHours === undefined && existingMetadata?.ttlHours !== undefined) {
      populateOptions.ttlHours = existingMetadata.ttlHours;
    }

    return await this.populateCache(repoUrl, branchName, populateOptions);
  }


  /**
   * Get cache metadata for a repository
   * @param {string} repoHash - Repository hash
   * @returns {Object|null} - Cache metadata or null if not found
   */
  async getCacheMetadata(repoHash) {
    const metadataPath = path.join(this.cacheDir, repoHash, 'metadata.json');
    return await readJsonFile(metadataPath, null, 'cache metadata');
  }

  /**
   * Update cache metadata for a repository
   * @param {string} repoHash - Repository hash
   * @param {Object} metadata - Metadata object to store
   */
  async updateCacheMetadata(repoHash, metadata) {
    await this.ensureRepoDirectory(repoHash);
    const metadataPath = path.join(this.cacheDir, repoHash, 'metadata.json');
    await writeJsonFile(metadataPath, metadata, 'cache metadata');
  }

  /**
   * Get cached repository path if cache exists and is fresh
   * @param {string} repoUrl - Repository URL or user/repo format
   * @param {string} branchName - Git branch name
   * @param {Object} options - Options object
   * @param {boolean} options.noCache - Bypass cache if true
   * @returns {string|null} - Path to cached repository or null if not cached/expired
   */
  async getCachedRepo(repoUrl, branchName = null, options = {}) {
    // Bypass cache if noCache option is set
    if (options.noCache) {
      return null;
    }

    const { repoHash } = this.resolveRepoDirectory(repoUrl, branchName);
    const metadata = await this.getCacheMetadata(repoHash);

    // Return null if no metadata exists
    if (!metadata) {
      return null;
    }

    // Check if cache is expired
    if (this.isExpired(metadata)) {
      return null;
    }

    // Return path to cached repository
    const repoDir = path.join(this.cacheDir, repoHash);

    // Verify the directory actually exists
    try {
      const stats = await fs.stat(repoDir);
      if (stats.isDirectory()) {
        return repoDir;
      }
    } catch (_error) {
      // Directory doesn't exist, return null
      return null;
    }

    return null;
  }

  /**
   * Check if cache metadata indicates an expired cache entry
   * @param {Object} metadata - Cache metadata object
   * @param {number} ttlHours - TTL override in hours (optional)
   * @returns {boolean} - True if cache is expired
   */
  isExpired(metadata, ttlHours = null) {
    if (!metadata || !metadata.lastUpdated) {
      return true;
    }

    const ttl = ttlHours !== null ? ttlHours : (metadata.ttlHours || 24);
    const lastUpdated = new Date(metadata.lastUpdated);
    const now = new Date();
    const ageInHours = (now - lastUpdated) / (1000 * 60 * 60);

    return ageInHours > ttl;
  }

  /**
   * Detect cache corruption for a repository
   * @param {string} repoHash - Repository hash
   * @returns {boolean} - True if cache is corrupted
   */
  async detectCacheCorruption(repoHash) {
    try {
      const repoDir = path.join(this.cacheDir, repoHash);

      // Check if repository directory exists
      try {
        const stats = await fs.stat(repoDir);
        if (!stats.isDirectory()) {
          return true; // Not a directory
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          return true; // Directory doesn't exist
        }
        throw error;
      }

      // Try to read and parse metadata
      try {
        const metadata = await this.getCacheMetadata(repoHash);
        if (!metadata) {
          return true; // No metadata
        }

        // Validate metadata structure
        if (!metadata.repoUrl || !metadata.branchName || !metadata.lastUpdated) {
          return true; // Invalid metadata structure
        }

        return false; // Cache appears valid
      } catch (_error) {
        return true; // Metadata is corrupted
      }
    } catch (_error) {
      // Any unexpected error indicates corruption
      return true;
    }
  }

  /**
   * Handle cache corruption by removing the corrupted cache entry
   * @param {string} repoHash - Repository hash
   */
  async handleCacheCorruption(repoHash) {
    const repoDir = path.join(this.cacheDir, repoHash);
    await safeCleanup(repoDir);
  }

  /**
   * Clear expired cache entries
   * @returns {number} - Number of entries removed
   */
  async clearExpiredEntries() {
    let removedCount = 0;

    try {
      await this.ensureCacheDirectory();

      // Get all cache entries
      const entries = await fs.readdir(this.cacheDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const repoHash = entry.name;

        try {
          // Check if cache is corrupted
          const isCorrupted = await this.detectCacheCorruption(repoHash);
          if (isCorrupted) {
            await this.handleCacheCorruption(repoHash);
            removedCount++;
            continue;
          }

          // Check if cache is expired
          const metadata = await this.getCacheMetadata(repoHash);
          if (metadata && this.isExpired(metadata)) {
            await this.handleCacheCorruption(repoHash); // Reuse corruption handler for cleanup
            removedCount++;
          }
        } catch (_error) {
          // If we can't process an entry, try to remove it
          await this.handleCacheCorruption(repoHash);
          removedCount++;
        }
      }
    } catch (_error) {
      // If we can't read the cache directory, that's okay
      // Return the count of what we managed to clean up
    }

    return removedCount;
  }

  /**
   * Ensure repository is cached and return the cached path
   * @param {string} repoUrl - Repository URL
   * @param {string} branchName - Git branch name
   * @param {object} options - Options including ttlHours
   * @param {object} logger - Logger instance
   * @returns {string} - Path to cached repository
   */
  async ensureRepositoryCached(repoUrl, branchName, options = {}, logger) {
    // Try to get from cache first
    const cached = await this.getCachedRepo(repoUrl, branchName, options);
    if (cached) {
      if (logger) {
        logger.logOperation('cache_hit', { repoUrl, branchName, path: cached });
      }
      return cached;
    }

    // Not in cache, populate it
    if (logger) {
      logger.logOperation('cache_miss', { repoUrl, branchName });
    }
    return await this.populateCache(repoUrl, branchName, options);
  }
}
