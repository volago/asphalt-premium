/* ==========================================
   MAP.JS - Map Management
   Asphalt Premium
   ========================================== */

class MapManager {
    constructor() {
        this.map = null;
        this.roadsLayer = null;
        this.currentBounds = null;
        this.selectedRoad = null;
        this.selectedRoadMarkers = [];
        this.layerVisibility = {
            excellent: true,
            good: true,
            poor: true,
            unknown: true
        };
        this.oauth = null;
        this.osmApi = null;
        this.selectedSmoothnessValue = null;
    }
    
    /**
     * Set OAuth and OSM API instances
     * @param {OSMOAuth} oauth - OAuth instance
     * @param {OSMAPIClient} osmApi - OSM API client instance
     */
    setOAuthClient(oauth, osmApi) {
        this.oauth = oauth;
        this.osmApi = osmApi;
    }
    
    /* ==========================================
       MAP INITIALIZATION
       ========================================== */
    
    initialize(containerId) {
        if (this.map) {
            console.warn('Map already initialized');
            return this.map;
        }
        
        // Create map instance
        this.map = L.map(containerId, {
            center: CONFIG.MAP.DEFAULT_CENTER,
            zoom: CONFIG.MAP.DEFAULT_ZOOM,
            minZoom: CONFIG.MAP.MIN_ZOOM,
            maxZoom: CONFIG.MAP.MAX_ZOOM,
            zoomControl: false, // We'll add it manually in better position
            preferCanvas: true // Better performance for many features
        });
        
        // Add base tile layer
        this.addBaseTileLayer();
        
        // Initialize roads layer
        this.roadsLayer = L.featureGroup().addTo(this.map);
        
        // Add map controls
        this.addCustomControls();
        
        // Bind map events
        this.bindMapEvents();
        
        console.log('Map initialized successfully');
        return this.map;
    }
    
    addBaseTileLayer() {
        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom: CONFIG.MAP.MAX_ZOOM,
            detectRetina: false  // Wyłączamy detectRetina - może to powoduje problem
        }).addTo(this.map);
    }
    
    addCustomControls() {
        // Add zoom control in bottom left corner to avoid sidebar overlap
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);
        
        // Scale control next to zoom
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(this.map);
        
        // Custom info control
        const infoControl = L.control({position: 'bottomright'});
        infoControl.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'map-info-control');
            div.innerHTML = '<small>Asphalt Premium &copy; 2024</small>';
            div.style.cssText = `
                background: rgba(255,255,255,0.9);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                color: #666;
                border: 1px solid #ccc;
            `;
            return div;
        };
        infoControl.addTo(this.map);
    }
    
    bindMapEvents() {
        this.map.on('zoomend', () => {
            this.updateRoadVisibility();
        });
        
        this.map.on('moveend', () => {
            this.currentBounds = this.map.getBounds();
        });
        
        // Clear selection when clicking on empty map area
        this.map.on('click', (e) => {
            // Only clear if click was not on a road
            if (!e.originalEvent.defaultPrevented) {
                this.clearSelection();
            }
        });
    }
    
    /* ==========================================
       ROAD DISPLAY MANAGEMENT
       ========================================== */
    
    displayRoads(geoJsonData) {
        if (!this.roadsLayer) {
            console.error('Roads layer not initialized');
            return;
        }
        
        // Clear existing roads
        this.clearRoads();
        
        if (!geoJsonData || !geoJsonData.features) {
            console.warn('No road data to display');
            return;
        }
        
        let roadCounts = {
            excellent: 0,
            good: 0,
            poor: 0,
            unknown: 0,
            total: 0
        };
        
        // Process each road feature
        geoJsonData.features.forEach(feature => {
            if (this.isValidRoadFeature(feature)) {
                const road = this.createRoadLayer(feature);
                if (road) {
                    this.roadsLayer.addLayer(road);
                    
                    // Update statistics
                    const styleType = this.getRoadStyleType(feature.properties.smoothness);
                    roadCounts[styleType]++;
                    roadCounts.total++;
                }
            }
        });
        this.updateRoadVisibility();
        
        return roadCounts;
    }
    
    isValidRoadFeature(feature) {
        return feature && 
               feature.geometry && 
               feature.geometry.type === 'LineString' &&
               feature.geometry.coordinates &&
               feature.geometry.coordinates.length > 1;
    }
    
    createRoadLayer(feature) {
        const coordinates = feature.geometry.coordinates;
        const properties = feature.properties;
        
        // Convert coordinates (GeoJSON uses [lon, lat], Leaflet uses [lat, lon])
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Determine road style
        const styleType = this.getRoadStyleType(properties.smoothness);
        const style = this.getRoadStyle(styleType);
        
        // Create polyline
        const road = L.polyline(latLngs, style);
        
        // Note: Popup replaced with sidebar - no popup binding needed
        
        // Add click handler for road selection
        road.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // Prevent map click event
            this.selectRoad(road, e);
        });
        
        // Add tooltip for quick info
        const tooltipContent = this.createRoadTooltip(properties);
        road.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'custom-tooltip'
        });
        
        // Store metadata
        road.feature = feature;
        road.styleType = styleType;
        
        return road;
    }
    
    getRoadStyleType(smoothness) {
        if (!smoothness) return 'unknown';  // Blue for roads without smoothness
        return CONFIG.SMOOTHNESS_MAPPING[smoothness] || 'poor';
    }
    
    getRoadStyle(styleType) {
        const baseStyle = CONFIG.ROAD_STYLES[styleType];
        return {
            ...baseStyle,
            interactive: true,
            bubblingMouseEvents: false
        };
    }
    
    
    createRoadTooltip(properties) {
        const name = properties.name || 'Droga bez nazwy';
        const smoothness = properties.smoothness || 'brak danych';
        return `${name} (${smoothness})`;
    }
    
    /* ==========================================
       VISIBILITY AND PERFORMANCE
       ========================================== */
    
    updateRoadVisibility() {
        if (!this.roadsLayer || !this.map) return;
        
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();
        
        // Hide roads at very low zoom levels for performance
        if (zoom < 7) {
            this.roadsLayer.eachLayer(layer => {
                if (layer.setStyle) {
                    layer.setStyle({opacity: 0});
                }
            });
            return;
        }
        
        // Show roads with appropriate opacity based on zoom and layer visibility
        let baseOpacity = Math.min(1, Math.max(0.3, (zoom - 8) / 4));
        
        this.roadsLayer.eachLayer(layer => {
            if (layer.setStyle && layer.styleType) {
                // Check if this is the selected road
                const isSelected = (this.selectedRoad && layer === this.selectedRoad);
                
                if (isSelected) {
                    // Keep selected style for selected road
                    const selectedStyle = {
                        color: '#8b5cf6',
                        weight: 4,
                        opacity: 1,
                        dashArray: null
                    };
                    layer.setStyle(selectedStyle);
                } else {
                    // Apply normal style rules
                    const style = this.getRoadStyle(layer.styleType);
                    const isVisible = this.layerVisibility[layer.styleType];
                    const opacity = isVisible ? baseOpacity : 0;
                    layer.setStyle({...style, opacity: opacity});
                }
            }
        });
    }
    
    /**
     * Toggle visibility of a specific road type
     * @param {string} roadType - Type of road (excellent, good, poor, unknown)
     * @param {boolean} visible - Whether to show or hide
     */
    toggleLayerVisibility(roadType, visible) {
        if (this.layerVisibility.hasOwnProperty(roadType)) {
            this.layerVisibility[roadType] = visible;
            this.updateRoadVisibility();
        }
    }
    
    /**
     * Get current visibility state for a road type
     * @param {string} roadType - Type of road
     * @returns {boolean} Current visibility state
     */
    getLayerVisibility(roadType) {
        return this.layerVisibility.hasOwnProperty(roadType) ? this.layerVisibility[roadType] : true;
    }
    
    clearRoads() {
        // Clear selection first
        this.clearSelection();
        
        if (this.roadsLayer) {
            this.roadsLayer.clearLayers();
        }
    }
    
    /* ==========================================
       NAVIGATION AND BOUNDS
       ========================================== */
    
    fitToBounds(bounds, options = {}) {
        if (!this.map) return;
        
        const defaultOptions = {
            padding: [20, 20],
            maxZoom: 12
        };
        
        this.map.fitBounds(bounds, {...defaultOptions, ...options});
    }
    
    zoomToVoivodeship(voivodeshipKey) {
        const voivodeship = CONFIG.VOIVODESHIPS[voivodeshipKey];
        if (!voivodeship || !voivodeship.bbox) {
            console.warn(`No bounds data for voivodeship: ${voivodeshipKey}`);
            return;
        }
        
        const bbox = voivodeship.bbox;
        const bounds = [
            [bbox[1], bbox[0]], // Southwest [lat, lon]
            [bbox[3], bbox[2]]  // Northeast [lat, lon]
        ];
        
        this.fitToBounds(bounds);
    }
    
    /* ==========================================
       ROAD SELECTION MANAGEMENT
       ========================================== */
    
    /**
     * Select a road and apply visual indication
     * @param {L.Polyline} road - The road layer to select
     * @param {Event} e - Click event
     */
    selectRoad(road, e) {
        // Clear previous selection
        this.clearSelection();
        
        // Set as selected
        this.selectedRoad = road;
        
        // Apply selected style
        const selectedStyle = {
            color: '#8b5cf6', // Purple color
            weight: 4,
            opacity: 1,
            dashArray: null
        };
        
        road.setStyle(selectedStyle);
        
        // Add endpoint markers
        this.addEndpointMarkers(road);
        
        // Bring to front
        road.bringToFront();
        
        // Show road info sidebar
        this.showRoadInfo(road.feature.properties);
        
        console.log('Road selected:', road.feature.properties.osm_id);
    }
    
    /**
     * Clear current road selection
     */
    clearSelection() {
        if (this.selectedRoad) {
            // Restore original style
            const originalStyle = this.getRoadStyle(this.selectedRoad.styleType);
            this.selectedRoad.setStyle(originalStyle);
            
            // Remove endpoint markers
            this.removeEndpointMarkers();
            
            // Hide road info sidebar
            this.hideRoadInfo();
            
            this.selectedRoad = null;
        }
    }
    
    /**
     * Add purple markers at road endpoints
     * @param {L.Polyline} road - The road layer
     */
    addEndpointMarkers(road) {
        const coordinates = road.getLatLngs();
        if (coordinates.length < 2) return;
        
        const startPoint = coordinates[0];
        const endPoint = coordinates[coordinates.length - 1];
        
        const markerStyle = {
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 1,
            radius: 5,
            weight: 2
        };
        
        // Create start marker
        const startMarker = L.circleMarker(startPoint, markerStyle).addTo(this.map);
        startMarker.bindTooltip('Początek odcinka', { permanent: false, direction: 'top' });
        
        // Create end marker  
        const endMarker = L.circleMarker(endPoint, markerStyle).addTo(this.map);
        endMarker.bindTooltip('Koniec odcinka', { permanent: false, direction: 'top' });
        
        // Store markers for cleanup
        this.selectedRoadMarkers = [startMarker, endMarker];
    }
    
    /**
     * Remove endpoint markers
     */
    removeEndpointMarkers() {
        this.selectedRoadMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.selectedRoadMarkers = [];
    }
    
    /**
     * Show road information in sidebar
     * @param {Object} properties - Road properties
     */
    showRoadInfo(properties) {
        const sidebar = document.getElementById('road-info-sidebar');
        const content = document.getElementById('road-info-content');
        
        if (!sidebar || !content) return;
        
        const name = properties.name || 'Droga bez nazwy';
        const smoothness = properties.smoothness || null;
        const highway = properties.highway || 'nieznany typ';
        const maxspeed = properties.maxspeed || 'nieograniczona';
        const osmId = properties.osm_id;
        
        // Reset selected smoothness
        this.selectedSmoothnessValue = smoothness;
        
        content.innerHTML = `
            <h4>${name}</h4>
            <div class="road-details">
                <p><strong>Typ drogi:</strong> ${highway}</p>
                <p><strong>Jakość nawierzchni:</strong> ${smoothness || 'brak danych'}</p>
                <p><strong>Prędkość maksymalna:</strong> ${maxspeed}</p>
                <p><strong>ID obiektu way:</strong> ${osmId}</p>
            </div>
            <div class="road-actions">
                <a href="https://www.openstreetmap.org/edit?way=${osmId}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="btn-edit-osm">
                    <i class="fas fa-external-link-alt"></i>
                    Edytuj w OpenStreetMap
                </a>
            </div>
            ${this.renderSmoothnessEditor(smoothness, osmId)}
        `;
        
        sidebar.style.display = 'flex';
        
        // Initialize close button if not already done
        this.initRoadInfoSidebar();
        
        // Initialize smoothness editor controls
        this.initSmoothnessEditor(osmId, smoothness);
    }
    
    /**
     * Hide road information sidebar
     */
    hideRoadInfo() {
        const sidebar = document.getElementById('road-info-sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
    }
    
    /**
     * Initialize road info sidebar controls
     */
    initRoadInfoSidebar() {
        const closeBtn = document.getElementById('road-info-close');
        
        // Avoid multiple event listeners
        if (closeBtn && !closeBtn.dataset.initialized) {
            closeBtn.addEventListener('click', () => {
                this.clearSelection();
            });
            closeBtn.dataset.initialized = 'true';
        }
    }

    /* ==========================================
       SMOOTHNESS EDITOR
       ========================================== */
    
    /**
     * Render smoothness editor HTML
     * @param {string} currentSmoothness - Current smoothness value
     * @param {number} wayId - Way ID
     * @returns {string} HTML string
     */
    renderSmoothnessEditor(currentSmoothness, wayId) {
        const isAuthenticated = this.oauth && this.oauth.isAuthenticated();
        
        // Separate common and rare options
        const commonOptions = CONFIG.SMOOTHNESS_OPTIONS.filter(opt => opt.common);
        const rareOptions = CONFIG.SMOOTHNESS_OPTIONS.filter(opt => !opt.common);
        
        let html = `
            <div class="smoothness-editor">
                <h4>
                    <i class="fas fa-edit"></i>
                    Edycja jakości nawierzchni
                </h4>
                <div class="smoothness-editor-info">
                    Wybierz jakość nawierzchni tej drogi. Twoja ocena zostanie zapisana w OpenStreetMap.
                </div>
        `;
        
        // Show current value if exists
        if (currentSmoothness) {
            const currentOption = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === currentSmoothness);
            const label = currentOption ? currentOption.label : currentSmoothness;
            html += `
                <div class="smoothness-current-value">
                    <strong>Obecna wartość:</strong> ${label} (${currentSmoothness})
                </div>
            `;
        }
        
        // Common options gallery
        html += '<div class="smoothness-gallery">';
        for (const option of commonOptions) {
            const selected = option.value === currentSmoothness ? 'selected' : '';
            const imagePath = `assets/smoothness/${option.image}`;
            html += `
                <div class="smoothness-option ${selected}" data-value="${option.value}">
                    <div class="smoothness-option-image">
                        <img src="${imagePath}" alt="${option.label}" 
                             onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i> ${option.labelEn}'">
                    </div>
                    <div class="smoothness-option-label">${option.label}</div>
                    <div class="smoothness-option-description">${option.description}</div>
                </div>
            `;
        }
        html += '</div>';
        
        // Rare options collapsible section
        if (rareOptions.length > 0) {
            html += `
                <div class="smoothness-rare-section">
                    <button class="smoothness-rare-toggle">
                        <span>Pokaż rzadziej używane opcje</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="smoothness-rare-options">
                        <div class="smoothness-gallery">
            `;
            
            for (const option of rareOptions) {
                const selected = option.value === currentSmoothness ? 'selected' : '';
                const imagePath = `assets/smoothness/${option.image}`;
                html += `
                    <div class="smoothness-option ${selected}" data-value="${option.value}">
                        <div class="smoothness-option-image">
                            <img src="${imagePath}" alt="${option.label}"
                                 onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i> ${option.labelEn}'">
                        </div>
                        <div class="smoothness-option-label">${option.label}</div>
                        <div class="smoothness-option-description">${option.description}</div>
                    </div>
                `;
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Save section
        html += '<div class="smoothness-save-section">';
        
        if (isAuthenticated) {
            html += `
                <button class="btn-save-smoothness" id="save-smoothness-btn" disabled>
                    <i class="fas fa-save"></i>
                    Zapisz zmiany
                </button>
            `;
        } else {
            html += `
                <button class="btn-login-osm" id="login-osm-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Zaloguj się aby edytować
                </button>
            `;
        }
        
        html += '</div></div>';
        
        return html;
    }
    
    /**
     * Initialize smoothness editor event handlers
     * @param {number} wayId - Way ID
     * @param {string} currentSmoothness - Current smoothness value
     */
    initSmoothnessEditor(wayId, currentSmoothness) {
        // Handle smoothness option selection
        const options = document.querySelectorAll('.smoothness-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                options.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Store selected value
                this.selectedSmoothnessValue = option.dataset.value;
                
                // Enable save button
                const saveBtn = document.getElementById('save-smoothness-btn');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            });
        });
        
        // Handle rare options toggle
        const rareToggle = document.querySelector('.smoothness-rare-toggle');
        if (rareToggle) {
            rareToggle.addEventListener('click', () => {
                rareToggle.classList.toggle('expanded');
                const rareOptions = document.querySelector('.smoothness-rare-options');
                if (rareOptions) {
                    rareOptions.classList.toggle('expanded');
                }
            });
        }
        
        // Handle save button
        const saveBtn = document.getElementById('save-smoothness-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSmoothnessEdit(wayId, currentSmoothness);
            });
        }
        
        // Handle login button
        const loginBtn = document.getElementById('login-osm-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.oauth) {
                    this.oauth.login(window.location.href);
                }
            });
        }
    }
    
    /**
     * Save smoothness edit to OSM
     * @param {number} wayId - Way ID
     * @param {string} oldSmoothness - Old smoothness value
     */
    async saveSmoothnessEdit(wayId, oldSmoothness) {
        if (!this.selectedSmoothnessValue) {
            alert('Proszę wybrać jakość nawierzchni');
            return;
        }
        
        // Check if value changed
        if (this.selectedSmoothnessValue === oldSmoothness) {
            alert('Wybrano tę samą wartość. Nie ma zmian do zapisania.');
            return;
        }
        
        // Show confirmation dialog
        const confirmed = await this.showConfirmationDialog(
            wayId,
            oldSmoothness,
            this.selectedSmoothnessValue
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Disable save button and show loading
            const saveBtn = document.getElementById('save-smoothness-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<div class="btn-spinner"></div>Zapisywanie...';
            }
            
            // Call OSM API
            const result = await this.osmApi.updateSmoothness(
                wayId,
                this.selectedSmoothnessValue
            );
            
            console.log('Smoothness updated successfully:', result);
            
            // Show success message
            this.showSuccessMessage(result);
            
            // Update road info display
            const properties = this.selectedRoad?.feature?.properties;
            if (properties) {
                properties.smoothness = this.selectedSmoothnessValue;
                this.showRoadInfo(properties);
            }
            
        } catch (error) {
            console.error('Failed to save smoothness:', error);
            
            // Show error message
            alert(`Błąd podczas zapisywania: ${error.message}`);
            
            // Re-enable save button
            const saveBtn = document.getElementById('save-smoothness-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i>Zapisz zmiany';
            }
        }
    }
    
    /**
     * Show confirmation dialog
     * @param {number} wayId - Way ID
     * @param {string} oldValue - Old smoothness value
     * @param {string} newValue - New smoothness value
     * @returns {Promise<boolean>} True if confirmed
     */
    showConfirmationDialog(wayId, oldValue, newValue) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmationModal');
            const title = document.getElementById('confirmationModalTitle');
            const body = document.getElementById('confirmationModalBody');
            const confirmBtn = document.getElementById('confirmationModalConfirm');
            const cancelBtn = document.getElementById('confirmationModalCancel');
            const closeBtn = document.getElementById('confirmationModalClose');
            
            if (!modal) {
                resolve(false);
                return;
            }
            
            // Set title
            title.textContent = 'Potwierdź zapisanie zmian';
            
            // Build body content
            const oldOption = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === oldValue);
            const newOption = CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === newValue);
            
            let bodyHTML = '<p>Czy na pewno chcesz zapisać następujące zmiany w OpenStreetMap?</p>';
            
            bodyHTML += '<div class="info-grid">';
            bodyHTML += `<strong>ID drogi:</strong><span>${wayId}</span>`;
            bodyHTML += `<strong>Nowa wartość:</strong><span>${newOption ? newOption.label : newValue} (${newValue})</span>`;
            if (oldValue) {
                bodyHTML += `<strong>Poprzednia wartość:</strong><span>${oldOption ? oldOption.label : oldValue} (${oldValue})</span>`;
            }
            bodyHTML += '</div>';
            
            if (oldValue) {
                bodyHTML += `
                    <div class="warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Uwaga:</strong> Ta droga już ma przypisaną jakość nawierzchni. 
                        Nowa wartość nadpisze obecną.
                    </div>
                `;
            }
            
            bodyHTML += '<p>Zmiana zostanie natychmiast zapisana w bazie OpenStreetMap.</p>';
            
            body.innerHTML = bodyHTML;
            
            // Show modal
            modal.style.display = 'flex';
            
            // Handle confirm
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            // Handle cancel
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            // Cleanup function
            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
        });
    }
    
    /**
     * Show success message after saving
     * @param {Object} result - Save result
     */
    showSuccessMessage(result) {
        const message = `Sukces! Jakość nawierzchni została zaktualizowana.\n\n` +
                       `Droga: ${result.wayId}\n` +
                       `Nowa wartość: ${result.newSmoothness}\n` +
                       `Changeset: ${result.changesetId}`;
        
        alert(message);
    }

    /* ==========================================
       UTILITY METHODS
       ========================================== */
    
    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    
    getCenter() {
        return this.map ? this.map.getCenter() : null;
    }
    
    getZoom() {
        return this.map ? this.map.getZoom() : null;
    }
    
    getBounds() {
        return this.map ? this.map.getBounds() : null;
    }
    
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.roadsLayer = null;
        }
    }
}

// Add custom CSS for map popups and tooltips
const mapStyles = `
<style>
.custom-popup .leaflet-popup-content {
    margin: 8px 12px;
    line-height: 1.4;
    min-width: 200px;
}

.road-popup h4 {
    margin: 0 0 8px 0;
    color: var(--primary-blue);
    font-size: 14px;
    font-weight: 600;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
}

.road-details p {
    margin: 4px 0;
    font-size: 12px;
    color: var(--secondary-gray);
}

.road-details strong {
    color: var(--dark-gray);
}

.custom-tooltip {
    background: rgba(0, 0, 0, 0.8) !important;
    border: none !important;
    color: white !important;
    font-size: 11px !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
}

.custom-tooltip::before {
    border-top-color: rgba(0, 0, 0, 0.8) !important;
}

.leaflet-container {
    font-family: var(--font-family);
}

.map-info-control {
    pointer-events: none;
    user-select: none;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', mapStyles);
