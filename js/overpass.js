/* ==========================================
   OVERPASS.JS - OverpassAPI Communication
   Asphalt Premium
   ========================================== */

class OverpassAPI {
    constructor() {
        this.apiUrls = CONFIG.OVERPASS_API_URLS;
        this.currentApiIndex = 0;
        this.timeout = 45000; // 45 seconds timeout for large queries
        this.retryAttempts = 2; // Reduce retry attempts
        this.retryDelay = 3000; // 3 seconds delay
    }
    
    /* ==========================================
       MAIN API METHODS
       ========================================== */
    
    /**
     * Fetch roads data for a given bounding box
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {Promise<Object>} GeoJSON FeatureCollection
     */
    async fetchRoads(bbox) {
        console.log(`Fetching roads for bbox: ${bbox.join(', ')}`);
        
        const query = this.buildRoadsQuery(bbox);
        
        try {
            const data = await this.executeQuery(query);
            const geoJson = this.convertToGeoJSON(data);
            
            console.log(`Fetched ${geoJson.features.length} roads from OverpassAPI`);
            
            return geoJson;
            
        } catch (error) {
            console.error('Failed to fetch roads from OverpassAPI:', error);
            throw new Error(`OverpassAPI request failed: ${error.message}`);
        }
    }
    
    /* ==========================================
       QUERY BUILDING
       ========================================== */
    
    /**
     * Build Overpass QL query for roads
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {string} Overpass QL query
     */
    buildRoadsQuery(bbox) {
        // Convert bbox to Overpass format: [south, west, north, east]
        const overpassBbox = [bbox[1], bbox[0], bbox[3], bbox[2]];
        
        // Optimized Overpass QL query - prioritize roads with smoothness data
        // Limited to reduce timeout issues
        const query = `
[out:json][timeout:30][maxsize:67108864][bbox:${overpassBbox.join(',')}];
(
  // Primary focus: roads with explicit smoothness data
  way[highway=tertiary][smoothness];
  way[highway=unclassified][smoothness];
  
  // Secondary: roads with surface data (fewer results)
  way[highway=tertiary][surface~"^(asphalt|concrete|paved|gravel|dirt|unpaved)$"];
  way[highway=unclassified][surface~"^(asphalt|concrete|paved|gravel|dirt|unpaved)$"];
);
out geom;
        `.trim();
        
        console.log('Generated Overpass query:', query);
        
        return query;
    }
    
    /* ==========================================
       API COMMUNICATION
       ========================================== */
    
    /**
     * Execute Overpass query with retry logic and server fallback
     * @param {string} query - Overpass QL query
     * @returns {Promise<Object>} Raw Overpass response
     */
    async executeQuery(query) {
        let lastError;
        
        // Try each API server
        for (let serverIndex = 0; serverIndex < this.apiUrls.length; serverIndex++) {
            this.currentApiIndex = serverIndex;
            const currentUrl = this.apiUrls[this.currentApiIndex];
            
            console.log(`Trying OverpassAPI server ${serverIndex + 1}/${this.apiUrls.length}: ${currentUrl}`);
            
            for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
                try {
                    console.log(`OverpassAPI attempt ${attempt}/${this.retryAttempts} on server ${serverIndex + 1}`);
                    
                    const response = await this.makeRequest(query);
                    
                    if (!response.elements || response.elements.length === 0) {
                        console.warn('OverpassAPI returned no data');
                    }
                    
                    console.log(`Success on server ${serverIndex + 1}, attempt ${attempt}`);
                    return response;
                    
                } catch (error) {
                    lastError = error;
                    console.warn(`OverpassAPI server ${serverIndex + 1}, attempt ${attempt} failed:`, error.message);
                    
                    // If it's a server error (5xx) or timeout, try next server
                    if (error.message.includes('50') || error.message.includes('timeout')) {
                        break; // Try next server
                    }
                    
                    if (attempt < this.retryAttempts) {
                        console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
                        await this.delay(this.retryDelay);
                    }
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Make HTTP request to OverpassAPI
     * @param {string} query - Overpass QL query
     * @returns {Promise<Object>} Parsed JSON response
     */
    async makeRequest(query) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const currentUrl = this.apiUrls[this.currentApiIndex];
        
        try {
            const response = await fetch(currentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'AsphaltPremium/1.0'
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid content type received from OverpassAPI');
            }
            
            const data = await response.json();
            
            if (data.remark && data.remark.includes('error')) {
                throw new Error(`OverpassAPI error: ${data.remark}`);
            }
            
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }
    
    /* ==========================================
       DATA CONVERSION
       ========================================== */
    
    /**
     * Convert Overpass response to GeoJSON
     * @param {Object} overpassData - Raw Overpass response
     * @returns {Object} GeoJSON FeatureCollection
     */
    convertToGeoJSON(overpassData) {
        if (!overpassData || !overpassData.elements) {
            return {
                type: 'FeatureCollection',
                features: []
            };
        }
        
        const features = [];
        
        overpassData.elements.forEach(element => {
            if (element.type === 'way' && element.geometry) {
                const feature = this.convertWayToFeature(element);
                if (feature) {
                    features.push(feature);
                }
            }
        });
        
        return {
            type: 'FeatureCollection',
            features: features,
            metadata: {
                timestamp: new Date().toISOString(),
                source: 'OverpassAPI',
                query_bbox: overpassData.bbox || null,
                feature_count: features.length
            }
        };
    }
    
    /**
     * Convert Overpass way element to GeoJSON feature
     * @param {Object} way - Overpass way element
     * @returns {Object|null} GeoJSON Feature or null if invalid
     */
    convertWayToFeature(way) {
        if (!way.geometry || way.geometry.length < 2) {
            return null;
        }
        
        // Extract coordinates
        const coordinates = way.geometry.map(node => [node.lon, node.lat]);
        
        // Process tags
        const properties = this.processWayTags(way.tags || {});
        
        // Add metadata
        properties.osm_id = way.id;
        properties.osm_type = 'way';
        properties.osm_version = way.version;
        properties.osm_timestamp = way.timestamp;
        
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            properties: properties
        };
    }
    
    /**
     * Process and normalize OSM tags
     * @param {Object} tags - Raw OSM tags
     * @returns {Object} Processed properties
     */
    processWayTags(tags) {
        const properties = {};
        
        // Required properties
        properties.highway = tags.highway || 'unknown';
        properties.name = tags.name || tags['name:pl'] || tags['name:en'] || null;
        
        // Road quality indicators
        properties.smoothness = this.normalizeSmoothness(tags.smoothness);
        properties.surface = tags.surface || null;
        
        // Additional road properties
        properties.maxspeed = tags.maxspeed || null;
        properties.lanes = tags.lanes || null;
        properties.width = tags.width || null;
        properties.oneway = tags.oneway === 'yes';
        
        // Access restrictions
        properties.access = tags.access || null;
        properties.bicycle = tags.bicycle || null;
        properties.motor_vehicle = tags['motor_vehicle'] || null;
        
        // Surface condition
        properties.tracktype = tags.tracktype || null;
        properties.grade = tags.grade || null;
        
        // Administrative info
        properties.ref = tags.ref || null;
        properties.operator = tags.operator || null;
        
        // If no smoothness but we have surface, try to infer quality
        if (!properties.smoothness && properties.surface) {
            properties.smoothness = this.inferSmoothnessFromSurface(properties.surface);
        }
        
        return properties;
    }
    
    /**
     * Normalize smoothness values
     * @param {string} smoothness - Raw smoothness value
     * @returns {string|null} Normalized smoothness
     */
    normalizeSmoothness(smoothness) {
        if (!smoothness) return null;
        
        const normalized = smoothness.toLowerCase().trim();
        
        // Map common variations to standard values
        const mappings = {
            'excellent': 'excellent',
            'very_good': 'excellent',
            'good': 'good',
            'intermediate': 'intermediate',
            'bad': 'bad',
            'very_bad': 'very_bad',
            'horrible': 'horrible',
            'very_horrible': 'very_horrible',
            'impassable': 'impassable',
            
            // Common variations
            'perfect': 'excellent',
            'smooth': 'good',
            'rough': 'bad',
            'very_rough': 'very_bad',
            'poor': 'bad'
        };
        
        return mappings[normalized] || normalized;
    }
    
    /**
     * Infer smoothness from surface type
     * @param {string} surface - Surface type
     * @returns {string|null} Inferred smoothness
     */
    inferSmoothnessFromSurface(surface) {
        if (!surface) return null;
        
        const surfaceQuality = {
            'asphalt': 'good',
            'concrete': 'good',
            'paved': 'good',
            'concrete:plates': 'intermediate',
            'concrete:lanes': 'intermediate',
            'paving_stones': 'intermediate',
            'cobblestone': 'bad',
            'sett': 'bad',
            'unhewn_cobblestone': 'very_bad',
            'gravel': 'bad',
            'fine_gravel': 'intermediate',
            'pebblestone': 'bad',
            'ground': 'bad',
            'earth': 'bad',
            'dirt': 'bad',
            'grass': 'very_bad',
            'sand': 'very_bad',
            'mud': 'horrible'
        };
        
        return surfaceQuality[surface.toLowerCase()] || null;
    }
    
    /* ==========================================
       UTILITY METHODS
       ========================================== */
    
    /**
     * Create delay promise
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Validate bounding box
     * @param {Array} bbox - Bounding box [west, south, east, north]
     * @returns {boolean} True if valid
     */
    isValidBbox(bbox) {
        return Array.isArray(bbox) && 
               bbox.length === 4 && 
               bbox.every(coord => typeof coord === 'number') &&
               bbox[0] < bbox[2] && // west < east
               bbox[1] < bbox[3];   // south < north
    }
    
    /**
     * Get API status
     * @returns {Promise<Object>} API status information
     */
    async getApiStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                return {
                    available: true,
                    status: response.status,
                    message: 'API is available'
                };
            } else {
                return {
                    available: false,
                    status: response.status,
                    message: response.statusText
                };
            }
            
        } catch (error) {
            return {
                available: false,
                status: 0,
                message: error.message
            };
        }
    }
}
