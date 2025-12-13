/* ==========================================
   CACHE.JS - IndexedDB Cache Management
   Asfalt Premium
   ========================================== */

class CacheManager {
    constructor() {
        this.dbName = 'AsfaltPremiumCache';
        this.dbVersion = 1;
        this.storeName = 'voivodeships';
        this.durationMs = CONFIG.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;
        this.db = null;
        this.isInitialized = false;
        
        // Initialize IndexedDB
        this.init();
    }
    
    /**
     * Initialize IndexedDB
     */
    async init() {
        try {
            this.db = await this.openDatabase();
            this.isInitialized = true;
            console.log('IndexedDB cache initialized successfully');
            
            // Clean expired entries on initialization
            await this.cleanExpired();
        } catch (error) {
            console.error('Failed to initialize IndexedDB cache:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Open IndexedDB database
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'voivodeship' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    /**
     * Ensure database is ready
     */
    async ensureReady() {
        if (!this.isInitialized) {
            await this.init();
        }
        if (!this.isInitialized) {
            throw new Error('IndexedDB cache not available');
        }
    }
    
    /* ==========================================
       CACHE OPERATIONS
       ========================================== */
    
    /**
     * Store data in IndexedDB cache with timestamp
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @param {Object} data - GeoJSON data to cache
     */
    async set(voivodeshipKey, data) {
        try {
            await this.ensureReady();
            
            const cacheEntry = {
                voivodeship: voivodeshipKey,
                data: data, // Store full data - IndexedDB can handle large objects
                timestamp: Date.now(),
                version: '2.0' // IndexedDB version
            };
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.put(cacheEntry);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            const dataSize = JSON.stringify(data).length;
            console.log(`Cached data for ${voivodeshipKey} in IndexedDB (${data.features.length} features, ${this.formatDataSize(dataSize)})`);
            
            return true;
            
        } catch (error) {
            console.error('Failed to cache data in IndexedDB:', error);
            return false;
        }
    }
    
    /**
     * Retrieve data from IndexedDB cache if not expired
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @returns {Object|null} Cached data or null if not found/expired
     */
    async get(voivodeshipKey) {
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const cacheEntry = await new Promise((resolve, reject) => {
                const request = store.get(voivodeshipKey);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (!cacheEntry) {
                return null;
            }
            
            // Check if data is expired
            if (this.isExpired(cacheEntry.timestamp)) {
                console.log(`Cache expired for ${voivodeshipKey}, removing`);
                await this.remove(voivodeshipKey);
                return null;
            }
            
            console.log(`IndexedDB cache hit for ${voivodeshipKey} (${cacheEntry.data.features.length} features, age: ${this.getAgeString(cacheEntry.timestamp)})`);
            
            return cacheEntry.data;
            
        } catch (error) {
            console.error('Failed to retrieve cached data from IndexedDB:', error);
            return null;
        }
    }
    
    /**
     * Remove specific voivodeship data from IndexedDB cache
     * @param {string} voivodeshipKey - Voivodeship identifier
     */
    async remove(voivodeshipKey) {
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.delete(voivodeshipKey);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log(`Removed cache entry for ${voivodeshipKey}`);
        } catch (error) {
            console.error('Failed to remove cache entry:', error);
        }
    }
    
    /**
     * Clear all cached data from IndexedDB
     */
    async clear() {
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log('Cleared all cache entries from IndexedDB');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
    
    /* ==========================================
       CACHE MAINTENANCE
       ========================================== */
    
    /**
     * Remove expired cache entries from IndexedDB
     */
    async cleanExpired() {
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const allEntries = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            let removedCount = 0;
            
            for (const entry of allEntries) {
                if (this.isExpired(entry.timestamp)) {
                    await new Promise((resolve, reject) => {
                        const deleteRequest = store.delete(entry.voivodeship);
                        deleteRequest.onsuccess = () => resolve();
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                    });
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                console.log(`Cleaned ${removedCount} expired cache entries from IndexedDB`);
            }
            
        } catch (error) {
            console.error('Failed to clean expired cache entries:', error);
        }
    }
    
    /**
     * Check if voivodeship has cached data
     * @param {string} voivodeshipKey - Voivodeship identifier
     * @returns {boolean} True if cached data exists and is not expired
     */
    async has(voivodeshipKey) {
        const data = await this.get(voivodeshipKey);
        return data !== null;
    }
    
    /* ==========================================
       CACHE INFORMATION
       ========================================== */
    
    /**
     * Get IndexedDB cache statistics
     * @returns {Object} Cache statistics
     */
    async getStats() {
        try {
            await this.ensureReady();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const allEntries = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const stats = {
                totalEntries: allEntries.length,
                voivodeships: [],
                oldestEntry: null,
                newestEntry: null
            };
            
            if (allEntries.length === 0) {
                return stats;
            }
            
            allEntries.forEach(entry => {
                stats.voivodeships.push({
                    name: entry.voivodeship,
                    age: this.getAgeString(entry.timestamp),
                    features: entry.data && entry.data.features ? entry.data.features.length : 0,
                    version: entry.version || 'unknown'
                });
            });
            
            // Sort by timestamp
            allEntries.sort((a, b) => a.timestamp - b.timestamp);
            
            stats.oldestEntry = allEntries[0];
            stats.newestEntry = allEntries[allEntries.length - 1];
            
            return stats;
            
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return {
                totalEntries: 0,
                voivodeships: [],
                oldestEntry: null,
                newestEntry: null
            };
        }
    }
    
    /* ==========================================
       UTILITY METHODS
       ========================================== */
    
    isExpired(timestamp) {
        return (Date.now() - timestamp) > this.durationMs;
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
    

    
    /* ==========================================
       DEBUG METHODS
       ========================================== */
    
    async debug() {
        const stats = await this.getStats();
        console.table(stats.voivodeships);
        console.log('IndexedDB Cache Stats:', {
            'Total Entries': stats.totalEntries,
            'Oldest Entry': stats.oldestEntry ? 
                `${stats.oldestEntry.voivodeship} (${this.getAgeString(stats.oldestEntry.timestamp)})` : 
                'None',
            'Newest Entry': stats.newestEntry ? 
                `${stats.newestEntry.voivodeship} (${this.getAgeString(stats.newestEntry.timestamp)})` : 
                'None'
        });
    }
}
