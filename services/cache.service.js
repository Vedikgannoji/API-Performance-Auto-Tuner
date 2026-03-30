/**
 * Cache service
 * Manages in-memory caching for API responses
 */

// In-memory cache storage using Map for better performance
const cache = new Map();

// Cache metadata for tracking
const cacheMetadata = {
  hits: 0,
  misses: 0,
  enabled: true
};

const cacheService = {
  /**
   * Get cached data by key
   * @param {string} key - Cache key (usually endpoint URL)
   * @returns {Object|null} Cached data or null if not found/expired
   */
  get: (key) => {
    if (!cacheMetadata.enabled) {
      return null;
    }

    const cached = cache.get(key);
    
    if (!cached) {
      cacheMetadata.misses++;
      return null;
    }

    // Check if cache has expired
    if (Date.now() > cached.expiresAt) {
      cache.delete(key);
      cacheMetadata.misses++;
      return null;
    }

    cacheMetadata.hits++;
    return cached.data;
  },

  /**
   * Store data in cache with TTL (Time To Live)
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 60)
   */
  set: (key, data, ttl = 60) => {
    if (!cacheMetadata.enabled) {
      return;
    }

    const expiresAt = Date.now() + (ttl * 1000);
    
    cache.set(key, {
      data: data,
      expiresAt: expiresAt,
      createdAt: Date.now()
    });
  },

  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has: (key) => {
    if (!cacheMetadata.enabled) {
      return false;
    }

    const cached = cache.get(key);
    
    if (!cached) {
      return false;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      cache.delete(key);
      return false;
    }

    return true;
  },

  /**
   * Clear all cached data
   * @returns {Object} Result with count of cleared items
   */
  clear: () => {
    const count = cache.size;
    cache.clear();
    
    return {
      message: 'Cache cleared successfully',
      clearedItems: count
    };
  },

  /**
   * Enable caching globally
   * @returns {Object} Status message
   */
  enable: () => {
    cacheMetadata.enabled = true;
    return {
      message: 'Caching enabled',
      status: 'enabled'
    };
  },

  /**
   * Disable caching globally
   * @returns {Object} Status message
   */
  disable: () => {
    cacheMetadata.enabled = false;
    return {
      message: 'Caching disabled',
      status: 'disabled'
    };
  },

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats: () => {
    const totalRequests = cacheMetadata.hits + cacheMetadata.misses;
    const hitRate = totalRequests > 0 
      ? ((cacheMetadata.hits / totalRequests) * 100).toFixed(2)
      : 0;

    return {
      enabled: cacheMetadata.enabled,
      size: cache.size,
      hits: cacheMetadata.hits,
      misses: cacheMetadata.misses,
      hitRate: parseFloat(hitRate),
      totalRequests: totalRequests
    };
  },

  /**
   * Get all cache keys
   * @returns {Array} Array of cache keys
   */
  getKeys: () => {
    return Array.from(cache.keys());
  },

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if deleted, false if not found
   */
  delete: (key) => {
    return cache.delete(key);
  },

  /**
   * Get cache entry with metadata
   * @param {string} key - Cache key
   * @returns {Object|null} Cache entry with metadata or null
   */
  getWithMetadata: (key) => {
    const cached = cache.get(key);
    
    if (!cached) {
      return null;
    }

    return {
      data: cached.data,
      createdAt: new Date(cached.createdAt).toISOString(),
      expiresAt: new Date(cached.expiresAt).toISOString(),
      ttl: Math.max(0, Math.floor((cached.expiresAt - Date.now()) / 1000))
    };
  },

  /**
   * Clean expired cache entries
   * @returns {Object} Result with count of cleaned items
   */
  cleanExpired: () => {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
      if (now > value.expiresAt) {
        cache.delete(key);
        cleaned++;
      }
    }

    return {
      message: 'Expired cache entries cleaned',
      cleanedItems: cleaned
    };
  }
};

// Auto-clean expired entries every 5 minutes
setInterval(() => {
  cacheService.cleanExpired();
}, 5 * 60 * 1000);

module.exports = cacheService;
