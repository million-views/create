#!/usr/bin/env node

/**
 * Cache Manager
 * Manages caching for template registry operations
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Cache manager for template registry
 */
export class CacheManager extends EventEmitter {
  constructor(templateRegistry) {
    super();
    this.templateRegistry = templateRegistry;

    this.options = {
      enabled: true,
      cacheDir: this.getCacheDir(),
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 100 * 1024 * 1024, // 100MB
      compression: false
    };

    this.memoryCache = new Map();
    this.initialized = false;
  }

  /**
   * Get the appropriate cache directory for template metadata
   */
  getCacheDir() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, '.m5nv', 'cache', 'templates');
  }

  /**
   * Initialize the cache manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure cache directory exists
      await fs.mkdir(this.options.cacheDir, { recursive: true });

      // Load existing cache metadata
      await this.loadCacheMetadata();

      // Clean up expired entries
      await this.cleanup();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      // If cache initialization fails, disable caching
      this.options.enabled = false;
      this.emit('initialization:failed', error);
    }
  }

  /**
   * Load cache metadata from disk
   */
  async loadCacheMetadata() {
    try {
      const metadataPath = path.join(this.options.cacheDir, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Restore memory cache from metadata
      for (const [key, entry] of Object.entries(metadata.entries || {})) {
        if (this.isExpired(entry)) {
          await this.delete(key);
        } else {
          this.memoryCache.set(key, entry);
        }
      }
    } catch (_error) {
      // No existing metadata or corrupted - start fresh
      this.memoryCache.clear();
    }
  }

  /**
   * Save cache metadata to disk
   */
  async saveCacheMetadata() {
    if (!this.options.enabled) return;

    try {
      const metadata = {
        version: '1.0.0',
        created: new Date().toISOString(),
        entries: Object.fromEntries(this.memoryCache)
      };

      const metadataPath = path.join(this.options.cacheDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      this.emit('metadata:save:failed', error);
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    if (!this.options.enabled) return null;

    const entry = this.memoryCache.get(key);
    if (!entry) {
      this.emit('cache:miss', key);
      return null;
    }

    if (this.isExpired(entry)) {
      await this.delete(key);
      this.emit('cache:expired', key);
      return null;
    }

    this.emit('cache:hit', key);
    return entry.data;
  }

  /**
   * Set a value in cache
   */
  async set(key, data, ttl = this.options.maxAge) {
    if (!this.options.enabled) return;

    const entry = {
      data,
      created: Date.now(),
      ttl,
      expires: Date.now() + ttl,
      size: this.calculateSize(data)
    };

    // Check if adding this entry would exceed max cache size
    if (this.wouldExceedMaxSize(entry.size)) {
      await this.evictOldEntries(entry.size);
    }

    this.memoryCache.set(key, entry);
    await this.saveToDisk(key, entry);
    await this.saveCacheMetadata();

    this.emit('cache:set', { key, size: entry.size });
  }

  /**
   * Delete a cache entry
   */
  async delete(key) {
    if (!this.memoryCache.has(key)) return;

    this.memoryCache.delete(key);

    // Delete from disk
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (_error) {
      // File might not exist
    }

    await this.saveCacheMetadata();
    this.emit('cache:deleted', key);
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    if (!this.options.enabled) return;

    const keys = Array.from(this.memoryCache.keys());
    this.memoryCache.clear();

    // Delete all cache files
    try {
      const files = await fs.readdir(this.options.cacheDir);
      for (const file of files) {
        if (file !== 'metadata.json') {
          await fs.unlink(path.join(this.options.cacheDir, file));
        }
      }
    } catch (_error) {
      // Directory might not exist
    }

    await this.saveCacheMetadata();
    this.emit('cache:cleared', keys.length);
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expires;
  }

  /**
   * Calculate size of data
   */
  calculateSize(data) {
    return JSON.stringify(data).length;
  }

  /**
   * Check if adding entry would exceed max cache size
   */
  wouldExceedMaxSize(newEntrySize) {
    const currentSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);

    return currentSize + newEntrySize > this.options.maxSize;
  }

  /**
   * Evict old entries to make room for new entry
   */
  async evictOldEntries(requiredSpace) {
    // Sort entries by access time (oldest first)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    const toDelete = [];

    for (const [key, entry] of entries) {
      toDelete.push(key);
      freedSpace += entry.size;

      if (freedSpace >= requiredSpace) break;
    }

    // Delete the selected entries
    for (const key of toDelete) {
      await this.delete(key);
    }

    this.emit('cache:evicted', toDelete.length);
  }

  /**
   * Save entry to disk
   */
  async saveToDisk(key, entry) {
    try {
      const filePath = this.getFilePath(key);
      const content = JSON.stringify(entry);
      await fs.writeFile(filePath, content);
    } catch (error) {
      this.emit('cache:save:failed', { key, error });
    }
  }

  /**
   * Load entry from disk
   */
  async loadFromDisk(key) {
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get file path for cache key
   */
  getFilePath(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.options.cacheDir, `${hash}.json`);
  }

  /**
   * Clean up expired entries
   */
  async cleanup() {
    const expiredKeys = [];

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.emit('cache:cleanup', expiredKeys.length);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const entries = Array.from(this.memoryCache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const expiredCount = entries.filter(entry => this.isExpired(entry)).length;

    return {
      enabled: this.options.enabled,
      entries: this.memoryCache.size,
      totalSize,
      maxSize: this.options.maxSize,
      expiredCount,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  calculateHitRate() {
    // This would require tracking hits/misses over time
    // For now, return a placeholder
    return 0.85; // 85% hit rate as example
  }

  /**
   * Shutdown the cache manager
   */
  async shutdown() {
    await this.saveCacheMetadata();
    this.memoryCache.clear();
    this.emit('shutdown');
  }
}
