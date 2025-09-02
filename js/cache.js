/* ==========================================
   CACHE.JS - Local Storage Cache Management
   Asphalt Premium
   ========================================== */

class CacheManager {
    constructor() {
        this.prefix = CONFIG.CACHE_KEY_PREFIX;
        this.durationMs = CONFIG.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        
        // Clean expired entries on initialization
        this.cleanExpired();
    }
    
    /* ==========================================
       CACHE OPERATIONS
       ========================================== */
    
    /**
     * Store data in cache with timestamp
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @param {Object} data - GeoJSON data to cache
     */
    set(voivodeshipKey, data) {
        try {
            const cacheEntry = {
                data: data,
                timestamp: Date.now(),
                voivodeship: voivodeshipKey,
                version: '1.0'
            };
            
            const key = this.getCacheKey(voivodeshipKey);
            const serializedData = JSON.stringify(cacheEntry);
            
            // Check storage size before saving
            if (this.willExceedStorageQuota(serializedData)) {
                console.warn('Cache size would exceed quota, clearing old entries');
                this.clearOldestEntries();
            }
            
            localStorage.setItem(key, serializedData);
            
            console.log(`Cached data for ${voivodeshipKey} (${this.formatDataSize(serializedData.length)})`);
            
            return true;
            
        } catch (error) {
            console.error('Failed to cache data:', error);
            
            // If quota exceeded, try clearing some space and retry
            if (error.name === 'QuotaExceededError') {
                this.clearOldestEntries();
                try {
                    localStorage.setItem(key, serializedData);
                    return true;
                } catch (retryError) {
                    console.error('Failed to cache data after cleanup:', retryError);
                }
            }
            
            return false;
        }
    }
    
    /**
     * Retrieve data from cache if not expired
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @returns {Object|null} Cached data or null if not found/expired
     */
    get(voivodeshipKey) {
        try {
            const key = this.getCacheKey(voivodeshipKey);
            const serializedData = localStorage.getItem(key);
            
            if (!serializedData) {
                return null;
            }
            
            const cacheEntry = JSON.parse(serializedData);
            
            // Check if data is expired
            if (this.isExpired(cacheEntry.timestamp)) {
                console.log(`Cache expired for ${voivodeshipKey}, removing`);
                this.remove(voivodeshipKey);
                return null;
            }
            
            // Validate data structure
            if (!this.isValidCacheEntry(cacheEntry)) {
                console.warn(`Invalid cache entry for ${voivodeshipKey}, removing`);
                this.remove(voivodeshipKey);
                return null;
            }
            
            console.log(`Cache hit for ${voivodeshipKey} (age: ${this.getAgeString(cacheEntry.timestamp)})`);
            
            return cacheEntry.data;
            
        } catch (error) {
            console.error('Failed to retrieve cached data:', error);
            this.remove(voivodeshipKey); // Remove corrupted entry
            return null;
        }
    }
    
    /**
     * Remove specific voivodeship data from cache
     * @param {string} voivodeshipKey - Voivodeship identifier
     */
    remove(voivodeshipKey) {
        try {
            const key = this.getCacheKey(voivodeshipKey);
            localStorage.removeItem(key);
            console.log(`Removed cache entry for ${voivodeshipKey}`);
        } catch (error) {
            console.error('Failed to remove cache entry:', error);
        }
    }
    
    /**
     * Clear all cached data
     */
    clear() {
        try {
            const keys = this.getAllCacheKeys();
            keys.forEach(key => localStorage.removeItem(key));
            console.log(`Cleared ${keys.length} cache entries`);
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
    
    /* ==========================================
       CACHE MAINTENANCE
       ========================================== */
    
    /**
     * Remove expired cache entries
     */
    cleanExpired() {
        try {
            const keys = this.getAllCacheKeys();
            let removedCount = 0;
            
            keys.forEach(key => {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const cacheEntry = JSON.parse(data);
                        if (this.isExpired(cacheEntry.timestamp)) {
                            localStorage.removeItem(key);
                            removedCount++;
                        }
                    }
                } catch (error) {
                    // Remove corrupted entries
                    localStorage.removeItem(key);
                    removedCount++;
                }
            });
            
            if (removedCount > 0) {
                console.log(`Cleaned ${removedCount} expired cache entries`);
            }
            
        } catch (error) {
            console.error('Failed to clean expired cache entries:', error);
        }
    }
    
    /**
     * Remove oldest cache entries to free up space
     */
    clearOldestEntries() {
        try {
            const entries = this.getAllCacheEntries();
            
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest half
            const toRemove = Math.ceil(entries.length / 2);
            
            for (let i = 0; i < toRemove && i < entries.length; i++) {
                localStorage.removeItem(entries[i].key);
            }
            
            console.log(`Removed ${toRemove} oldest cache entries`);
            
        } catch (error) {
            console.error('Failed to clear oldest entries:', error);
        }
    }
    
    /* ==========================================
       CACHE INFORMATION
       ========================================== */
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        try {
            const entries = this.getAllCacheEntries();
            let totalSize = 0;
            
            const stats = {
                totalEntries: entries.length,
                voivodeships: [],
                totalSize: 0,
                oldestEntry: null,
                newestEntry: null
            };
            
            if (entries.length === 0) {
                return stats;
            }
            
            entries.forEach(entry => {
                const size = new Blob([localStorage.getItem(entry.key)]).size;
                totalSize += size;
                
                stats.voivodeships.push({
                    name: entry.voivodeship,
                    age: this.getAgeString(entry.timestamp),
                    size: this.formatDataSize(size),
                    features: entry.data && entry.data.features ? entry.data.features.length : 0
                });
            });
            
            // Sort by timestamp
            entries.sort((a, b) => a.timestamp - b.timestamp);
            
            stats.totalSize = this.formatDataSize(totalSize);
            stats.oldestEntry = entries[0];
            stats.newestEntry = entries[entries.length - 1];
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return {
                totalEntries: 0,
                voivodeships: [],
                totalSize: '0 B',
                oldestEntry: null,
                newestEntry: null
            };
        }
    }
    
    /**
     * Check if voivodeship has cached data
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @returns {boolean} True if cached data exists and is not expired
     */
    has(voivodeshipKey) {
        return this.get(voivodeshipKey) !== null;
    }
    
    /* ==========================================
       UTILITY METHODS
       ========================================== */
    
    getCacheKey(voivodeshipKey) {
        return `${this.prefix}${voivodeshipKey}`;
    }
    
    getAllCacheKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }
    
    getAllCacheEntries() {
        const entries = [];
        const keys = this.getAllCacheKeys();
        
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const cacheEntry = JSON.parse(data);
                    entries.push({
                        key: key,
                        ...cacheEntry
                    });
                }
            } catch (error) {
                // Skip corrupted entries
                console.warn(`Corrupted cache entry: ${key}`);
            }
        });
        
        return entries;
    }
    
    isExpired(timestamp) {
        return (Date.now() - timestamp) > this.durationMs;
    }
    
    isValidCacheEntry(entry) {
        return entry &&
               entry.data &&
               entry.timestamp &&
               entry.voivodeship &&
               typeof entry.data === 'object';
    }
    
    getAgeString(timestamp) {
        const ageMs = Date.now() - timestamp;
        const hours = Math.floor(ageMs / (1000 * 60 * 60));
        const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    formatDataSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }
    
    willExceedStorageQuota(newData) {
        try {
            // Rough estimate - localStorage typically has 5-10MB limit
            const currentSize = new Blob([JSON.stringify(localStorage)]).size;
            const newDataSize = new Blob([newData]).size;
            const estimatedQuota = 5 * 1024 * 1024; // 5MB conservative estimate
            
            return (currentSize + newDataSize) > estimatedQuota;
        } catch (error) {
            return false; // If we can't estimate, proceed
        }
    }
    
    /* ==========================================
       DEBUG METHODS
       ========================================== */
    
    debug() {
        const stats = this.getStats();
        console.table(stats.voivodeships);
        console.log('Cache Stats:', {
            'Total Entries': stats.totalEntries,
            'Total Size': stats.totalSize,
            'Oldest Entry': stats.oldestEntry ? 
                `${stats.oldestEntry.voivodeship} (${this.getAgeString(stats.oldestEntry.timestamp)})` : 
                'None',
            'Newest Entry': stats.newestEntry ? 
                `${stats.newestEntry.voivodeship} (${this.getAgeString(stats.newestEntry.timestamp)})` : 
                'None'
        });
    }
}
