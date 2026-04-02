/* ==========================================
   OSM-API.JS - OpenStreetMap API Client
   Asfalt Premium
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
        const requireAuth = options.requireAuth !== false;

        if (requireAuth && !this.oauth.isAuthenticated()) {
            throw new Error('User not authenticated');
        }

        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            ...options.headers
        };

        if (this.oauth.isAuthenticated()) {
            headers['Authorization'] = `Bearer ${this.oauth.getAccessToken()}`;
        }

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
       MAP DATA
       ========================================== */

    /**
     * Get map data for a bounding box
     * @param {Array} bbox - [minLon, minLat, maxLon, maxLat]
     * @returns {Promise<Document>} XML Document
     */
    async getMapData(bbox) {
        try {
            const bboxStr = bbox.join(',');
            const response = await this.makeRequest(`/api/0.6/map?bbox=${bboxStr}`, {
                method: 'GET',
                requireAuth: false
            });

            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('OSM Server Error: Area too large (try zooming in)');
                }
                throw new Error(`Failed to get map data: ${response.status}`);
            }

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('Failed to parse map XML');
            }

            return xmlDoc;

        } catch (error) {
            console.error('Failed to get map data:', error);
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
            xml += `    <tag k="created_by" v="Asfalt_Premium"/>\n`;
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
     * Update smoothness tag for one or multiple ways in one changeset
     * @param {number|Array<number>} wayIds - Way ID or Array of Way IDs
     * @param {string} smoothnessValue - New smoothness value
     * @param {string} comment - Optional custom comment
     * @returns {Promise<Object>} Result with success status, changesetId, and array of updates
     */
    async updateSmoothness(wayIds, smoothnessValue, comment = null) {
        let changesetId = null;

        // Ensure wayIds is an array
        const ids = Array.isArray(wayIds) ? wayIds : [wayIds];

        try {
            console.log(`Updating smoothness for ways ${ids.join(', ')} to: ${smoothnessValue}`);

            // Create changeset
            const changesetComment = comment || (ids.length === 1 
                ? `Updated smoothness to ${smoothnessValue}` 
                : `Updated smoothness to ${smoothnessValue} for multiple ways`);

            changesetId = await this.createChangeset(changesetComment, {
                'source': 'survey',
                'description': 'Road quality assessment via Asfalt Premium'
            });

            const results = [];

            // Update each way
            for (const wayId of ids) {
                // Get current way data
                const wayData = await this.getWayDetails(wayId);

                // Store old smoothness value
                const oldSmoothness = wayData.tags.smoothness || null;

                // Update smoothness tag
                wayData.tags.smoothness = smoothnessValue;

                // Update way
                const newVersion = await this.updateWay(wayId, wayData, changesetId);

                results.push({
                    wayId: wayId,
                    newVersion: newVersion,
                    oldSmoothness: oldSmoothness,
                    newSmoothness: smoothnessValue
                });
            }

            // Close changeset
            await this.closeChangeset(changesetId);

            // To maintain compatibility with callers expecting a single object result (plus updates array)
            return {
                success: true,
                changesetId: changesetId,
                updates: results,
                // also mapping top-level values for 1-element updates (legacy support)
                wayId: ids.length === 1 ? ids[0] : undefined,
                newVersion: ids.length === 1 ? results[0].newVersion : undefined,
                oldSmoothness: ids.length === 1 ? results[0].oldSmoothness : undefined,
                newSmoothness: smoothnessValue
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

