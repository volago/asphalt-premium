/* ==========================================
   OSM-API.JS - OpenStreetMap API Client
   Asphalt Premium
   ========================================== */

class OSMAPIClient {
    constructor(oauth) {
        this.oauth = oauth;
        this.apiUrl = CONFIG.OSM_API.getApiUrl();
    }
    
    /* ==========================================
       API REQUESTS
       ========================================== */
    
    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async makeRequest(endpoint, options = {}) {
        if (!this.oauth.isAuthenticated()) {
            throw new Error('User not authenticated');
        }
        
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.oauth.getAccessToken()}`,
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            return response;
            
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    /* ==========================================
       WAY OPERATIONS
       ========================================== */
    
    /**
     * Get way details with full data
     * @param {number} wayId - Way ID
     * @returns {Promise<Object>} Way data in XML format (parsed)
     */
    async getWayDetails(wayId) {
        try {
            const response = await this.makeRequest(`/api/0.6/way/${wayId}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get way details: ${response.status}`);
            }
            
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for XML parsing errors
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Failed to parse way XML');
            }
            
            // Extract way element
            const wayElement = xmlDoc.getElementsByTagName('way')[0];
            if (!wayElement) {
                throw new Error('No way element found in response');
            }
            
            return this.parseWayXML(wayElement);
            
        } catch (error) {
            console.error('Failed to get way details:', error);
            throw error;
        }
    }
    
    /**
     * Parse way XML element to object
     * @param {Element} wayElement - Way XML element
     * @returns {Object} Parsed way data
     */
    parseWayXML(wayElement) {
        const wayData = {
            id: wayElement.getAttribute('id'),
            version: wayElement.getAttribute('version'),
            changeset: wayElement.getAttribute('changeset'),
            timestamp: wayElement.getAttribute('timestamp'),
            user: wayElement.getAttribute('user'),
            uid: wayElement.getAttribute('uid'),
            visible: wayElement.getAttribute('visible') === 'true',
            nodes: [],
            tags: {}
        };
        
        // Parse nodes
        const ndElements = wayElement.getElementsByTagName('nd');
        for (let i = 0; i < ndElements.length; i++) {
            wayData.nodes.push(ndElements[i].getAttribute('ref'));
        }
        
        // Parse tags
        const tagElements = wayElement.getElementsByTagName('tag');
        for (let i = 0; i < tagElements.length; i++) {
            const key = tagElements[i].getAttribute('k');
            const value = tagElements[i].getAttribute('v');
            wayData.tags[key] = value;
        }
        
        return wayData;
    }
    
    /**
     * Build way XML for update
     * @param {Object} wayData - Way data object
     * @returns {string} Way XML string
     */
    buildWayXML(wayData) {
        let xml = `<osm>\n`;
        xml += `  <way id="${wayData.id}" version="${wayData.version}" changeset="${wayData.changeset}">\n`;
        
        // Add nodes
        for (const nodeRef of wayData.nodes) {
            xml += `    <nd ref="${nodeRef}"/>\n`;
        }
        
        // Add tags
        for (const [key, value] of Object.entries(wayData.tags)) {
            // Escape special XML characters
            const escapedValue = value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
            xml += `    <tag k="${key}" v="${escapedValue}"/>\n`;
        }
        
        xml += `  </way>\n`;
        xml += `</osm>`;
        
        return xml;
    }
    
    /* ==========================================
       CHANGESET OPERATIONS
       ========================================== */
    
    /**
     * Create a new changeset
     * @param {string} comment - Changeset comment
     * @param {Object} tags - Additional changeset tags (optional)
     * @returns {Promise<number>} Changeset ID
     */
    async createChangeset(comment, tags = {}) {
        try {
            // Build changeset XML
            let xml = `<osm>\n`;
            xml += `  <changeset>\n`;
            xml += `    <tag k="created_by" v="Asphalt Premium"/>\n`;
            xml += `    <tag k="comment" v="${comment}"/>\n`;
            
            // Add additional tags
            for (const [key, value] of Object.entries(tags)) {
                xml += `    <tag k="${key}" v="${value}"/>\n`;
            }
            
            xml += `  </changeset>\n`;
            xml += `</osm>`;
            
            const response = await this.makeRequest('/api/0.6/changeset/create', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/xml'
                },
                body: xml
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create changeset: ${response.status} - ${errorText}`);
            }
            
            const changesetId = parseInt(await response.text());
            console.log('Created changeset:', changesetId);
            
            return changesetId;
            
        } catch (error) {
            console.error('Failed to create changeset:', error);
            throw error;
        }
    }
    
    /**
     * Update a way with new data
     * @param {number} wayId - Way ID
     * @param {Object} wayData - Way data with updated tags
     * @param {number} changesetId - Changeset ID
     * @returns {Promise<number>} New version number
     */
    async updateWay(wayId, wayData, changesetId) {
        try {
            // Set changeset ID in way data
            wayData.changeset = changesetId;
            
            // Build XML
            const xml = this.buildWayXML(wayData);
            
            console.log('Updating way XML:', xml);
            
            const response = await this.makeRequest(`/api/0.6/way/${wayId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/xml'
                },
                body: xml
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update way: ${response.status} - ${errorText}`);
            }
            
            const newVersion = parseInt(await response.text());
            console.log('Way updated successfully, new version:', newVersion);
            
            return newVersion;
            
        } catch (error) {
            console.error('Failed to update way:', error);
            throw error;
        }
    }
    
    /**
     * Close a changeset
     * @param {number} changesetId - Changeset ID
     * @returns {Promise<void>}
     */
    async closeChangeset(changesetId) {
        try {
            const response = await this.makeRequest(`/api/0.6/changeset/${changesetId}/close`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to close changeset: ${response.status} - ${errorText}`);
            }
            
            console.log('Changeset closed:', changesetId);
            
        } catch (error) {
            console.error('Failed to close changeset:', error);
            throw error;
        }
    }
    
    /* ==========================================
       HIGH-LEVEL OPERATIONS
       ========================================== */
    
    /**
     * Update smoothness tag for a way
     * @param {number} wayId - Way ID
     * @param {string} smoothnessValue - New smoothness value
     * @param {string} comment - Optional custom comment
     * @returns {Promise<Object>} Result with success status and new version
     */
    async updateSmoothness(wayId, smoothnessValue, comment = null) {
        let changesetId = null;
        
        try {
            console.log(`Updating smoothness for way ${wayId} to: ${smoothnessValue}`);
            
            // Get current way data
            const wayData = await this.getWayDetails(wayId);
            
            // Store old smoothness value
            const oldSmoothness = wayData.tags.smoothness || null;
            
            // Update smoothness tag
            wayData.tags.smoothness = smoothnessValue;
            
            // Create changeset
            const changesetComment = comment || 
                (oldSmoothness 
                    ? `Updated smoothness from ${oldSmoothness} to ${smoothnessValue}`
                    : `Added smoothness tag: ${smoothnessValue}`);
            
            changesetId = await this.createChangeset(changesetComment, {
                'source': 'survey',
                'description': 'Road quality assessment via Asphalt Premium'
            });
            
            // Update way
            const newVersion = await this.updateWay(wayId, wayData, changesetId);
            
            // Close changeset
            await this.closeChangeset(changesetId);
            
            return {
                success: true,
                wayId: wayId,
                newVersion: newVersion,
                oldSmoothness: oldSmoothness,
                newSmoothness: smoothnessValue,
                changesetId: changesetId
            };
            
        } catch (error) {
            console.error('Failed to update smoothness:', error);
            
            // Try to close changeset if it was created
            if (changesetId) {
                try {
                    await this.closeChangeset(changesetId);
                } catch (closeError) {
                    console.error('Failed to close changeset after error:', closeError);
                }
            }
            
            throw error;
        }
    }
}

