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
        const smoothness = properties.smoothness || 'brak danych';
        const highway = properties.highway || 'nieznany typ';
        const maxspeed = properties.maxspeed || 'nieograniczona';
        const osmId = properties.osm_id;
        
        content.innerHTML = `
            <h4>${name}</h4>
            <div class="road-details">
                <p><strong>Typ drogi:</strong> ${highway}</p>
                <p><strong>Jakość nawierzchni:</strong> ${smoothness}</p>
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
        `;
        
        sidebar.style.display = 'flex';
        
        // Initialize close button if not already done
        this.initRoadInfoSidebar();
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
