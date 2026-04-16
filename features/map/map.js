/* ==========================================
   MAP.JS - Map Management
   Asfalt Premium
   ========================================== */

class MapManager {
    constructor() {
        this.map = null;
        this.roadsLayer = null;
        this.currentBounds = null;
        this.selectedRoads = [];
        this.selectedRoadMarkers = [];
        this.hasShownMultiSelectHint = false;
        this.layerVisibility = {
            excellent: true,
            good: true,
            poor: true,
            unknown: true
        };
        this.oauth = null;
        this.osmApi = null;
        this.overpassApi = null;
        this.selectedSmoothnessValue = null;
        this.mobileFilterControl = null;
        this.loadedWayIds = new Set(); // Track loaded way IDs to avoid duplicates
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

    setOverpassClient(overpassApi) {
        this.overpassApi = overpassApi;
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

        // Restore map state from localStorage
        this.restoreMapState();

        // Add map controls
        this.addCustomControls();

        // Bind map events
        this.bindMapEvents();

        // Save state on moveend
        this.map.on('moveend', () => {
            this.saveMapState();
        });

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
        // Scale control first (so it's at the bottom)
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(this.map);

        // Zoom control second (so it's above scale)
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);

        // Custom info control first (so it's at the bottom)
        const infoControl = L.control({ position: 'bottomright' });
        infoControl.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'map-info-control');
            div.innerHTML = '<small>Asfalt Premium &copy; 2024</small>';
            div.style.cssText = `
                background: rgba(255,255,255,0.9);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                color: #666;
                border: 1px solid #ccc;
                margin-bottom: 5px; 
            `;
            return div;
        };
        infoControl.addTo(this.map);

        // Geolocation Control second (so it's above info)
        const locateControl = L.control({ position: 'bottomright' });
        locateControl.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('a', 'leaflet-control-locate', container);
            button.href = '#';
            button.title = 'Pokaż moją lokalizację';
            button.innerHTML = '<i class="fas fa-crosshairs"></i>';
            button.style.cssText = `
                width: 34px;
                height: 34px;
                line-height: 34px;
                text-align: center;
                background: white;
                display: block;
                color: #333;
                font-size: 16px;
                text-decoration: none;
                cursor: pointer;
            `;

            L.DomEvent.disableClickPropagation(button);
            L.DomEvent.on(button, 'click', (e) => {
                L.DomEvent.stop(e);
                this.locateUser();
            });

            return container;
        };
        locateControl.addTo(this.map);

        // Load visible roads control
        this.addLoadRoadsControl();
    }

    locateUser() {
        if (!this.map) return;

        // Start locating using Leaflet's built-in method
        this.map.locate({
            setView: true,
            maxZoom: 16,
            enableHighAccuracy: true
        });
    }

    addMobileFilterControl(onClick) {
        if (!this.map) return null;
        if (this.mobileFilterControl) {
            return this.mobileFilterControl;
        }

        const MobileFilterControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: () => {
                const container = L.DomUtil.create('div', 'leaflet-control mobile-filter-control');
                const button = L.DomUtil.create('button', 'mobile-filter-control-btn', container);
                button.type = 'button';
                button.title = 'Filtry';
                button.setAttribute('aria-label', 'Pokaż filtry');
                button.innerHTML = '<i class="fas fa-filter"></i>';

                L.DomEvent.disableClickPropagation(button);
                L.DomEvent.on(button, 'click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (typeof onClick === 'function') {
                        onClick();
                    }
                });

                return container;
            }
        });

        this.mobileFilterControl = new MobileFilterControl();
        this.map.addControl(this.mobileFilterControl);
        return this.mobileFilterControl;
    }

    removeMobileFilterControl() {
        if (this.map && this.mobileFilterControl) {
            this.map.removeControl(this.mobileFilterControl);
            this.mobileFilterControl = null;
        }
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
                // Don't deselect when Ctrl/Cmd is held (multi-select mode)
                if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) return;
                this.clearSelection();
            }
        });

        // Geolocation events
        this.map.on('locationfound', (e) => {
            const radius = e.accuracy / 2;

            // Remove existing location marker/circle if any
            if (this.currentLocationMarker) {
                this.map.removeLayer(this.currentLocationMarker);
            }
            if (this.currentLocationAccuracy) {
                this.map.removeLayer(this.currentLocationAccuracy);
            }

            // Create pulsing blue dot marker
            const locationIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="user-location-dot"></div><div class="user-location-pulse"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            this.currentLocationMarker = L.marker(e.latlng, {
                icon: locationIcon,
                zIndexOffset: 1000 // Ensure it's on top
            }).addTo(this.map);

            // Accuracy circle
            this.currentLocationAccuracy = L.circle(e.latlng, {
                radius: radius,
                color: '#4285F4',
                fillColor: '#4285F4',
                fillOpacity: 0.15,
                weight: 1,
                opacity: 0.4
            }).addTo(this.map);

            this.currentLocationMarker.bindPopup(`Jesteś tutaj (dokładność: ${Math.round(radius)}m)`).openPopup();
        });

        this.map.on('locationerror', (e) => {
            Toast.show('Nie udało się ustalić Twojej lokalizacji: ' + e.message, 'warning');
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

        // Create invisible wider polyline for better click detection
        const clickableLine = L.polyline(latLngs, {
            color: 'transparent',
            weight: 15, // Much wider for easier clicking
            opacity: 0,
            interactive: true,
            bubblingMouseEvents: false
        });

        // Create visible polyline with actual road style
        const visibleLine = L.polyline(latLngs, {
            ...style,
            interactive: false // Clicks go to the wider invisible line
        });

        // Create a layer group with both lines
        const road = L.layerGroup([clickableLine, visibleLine]);

        // Add click handler to the clickable line
        clickableLine.on('click', (e) => {
            L.DomEvent.stopPropagation(e); // Prevent map click event
            this.selectRoad(road, e);
        });

        // Add tooltip to the clickable line for quick info
        const tooltipContent = this.createRoadTooltip(properties);
        clickableLine.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'custom-tooltip'
        });

        // Store metadata on the road group
        road.feature = feature;
        road.styleType = styleType;
        road._clickableLine = clickableLine; // Store reference for later
        road._visibleLine = visibleLine;

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
                if (layer._visibleLine) {
                    layer._visibleLine.setStyle({ opacity: 0 });
                }
            });
            return;
        }

        // Show roads with appropriate opacity based on zoom and layer visibility
        let baseOpacity = Math.min(1, Math.max(0.3, (zoom - 8) / 4));

        this.roadsLayer.eachLayer(layer => {
            if (layer._visibleLine && layer.styleType) {
                // Check if this is the selected road
                const isSelected = this.selectedRoads.includes(layer);

                if (isSelected) {
                    // Keep selected style for selected road
                    const selectedStyle = {
                        color: '#8b5cf6',
                        weight: 4,
                        opacity: 1,
                        dashArray: null
                    };
                    layer._visibleLine.setStyle(selectedStyle);
                } else {
                    // Apply normal style rules
                    const style = this.getRoadStyle(layer.styleType);
                    const isVisible = this.layerVisibility[layer.styleType];
                    const opacity = isVisible ? (baseOpacity * style.opacity) : 0;
                    layer._visibleLine.setStyle({ ...style, opacity: opacity });
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

        this.map.fitBounds(bounds, { ...defaultOptions, ...options });
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
        const isMultiSelect = e && e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
        
        if (isMultiSelect) {
            const index = this.selectedRoads.indexOf(road);
            if (index > -1) {
                // Deselect
                this.selectedRoads.splice(index, 1);
                
                // Restore original style
                const originalStyle = this.getRoadStyle(road.styleType);
                if (road._visibleLine) {
                    road._visibleLine.setStyle(originalStyle);
                }
                
                // Restore tooltip
                if (road._clickableLine) {
                    const tooltipContent = this.createRoadTooltip(road.feature.properties);
                    road._clickableLine.bindTooltip(tooltipContent, {
                        sticky: true,
                        className: 'custom-tooltip'
                    });
                }
                
                // Re-calculate everything
                this.removeEndpointMarkers();
                this.selectedRoads.forEach(r => this.addEndpointMarkers(r));
                
                if (this.selectedRoads.length === 0) {
                    this.hideRoadInfo();
                    TipPanel.dismiss('multiselect', false);
                } else {
                    this.showRoadInfo();
                }
                return;
            } else {
                // Add to selection
                this.selectedRoads.push(road);
            }
        } else {
            // Single select, clear previous
            this.clearSelection();
            this.selectedRoads = [road];
            
            this.showMultiSelectTip();
        }

        // Apply selected style to the visible line
        const selectedStyle = {
            color: '#8b5cf6', // Purple color
            weight: 4,
            opacity: 1,
            dashArray: null
        };

        this.selectedRoads.forEach(r => {
            if (r._visibleLine) {
                r._visibleLine.setStyle(selectedStyle);
                r._visibleLine.bringToFront();
            }
            if (r._clickableLine) {
                r._clickableLine.closeTooltip();
                r._clickableLine.unbindTooltip();
            }
        });

        // Add endpoint markers for all
        this.removeEndpointMarkers();
        this.selectedRoads.forEach(r => this.addEndpointMarkers(r));

        // Show road info sidebar
        this.showRoadInfo();

        console.log('Road selected. Total selected:', this.selectedRoads.length);
    }

    /**
     * Clear current road selection
     */
    clearSelection() {
        if (this.selectedRoads && this.selectedRoads.length > 0) {
            this.selectedRoads.forEach(road => {
                // Restore original style to the visible line
                const originalStyle = this.getRoadStyle(road.styleType);
                if (road._visibleLine) {
                    road._visibleLine.setStyle(originalStyle);
                }

                // Restore tooltip
                if (road._clickableLine) {
                    const tooltipContent = this.createRoadTooltip(road.feature.properties);
                    road._clickableLine.bindTooltip(tooltipContent, {
                        sticky: true,
                        className: 'custom-tooltip'
                    });
                }
            });

            // Remove endpoint markers
            this.removeEndpointMarkers();

            // Hide road info sidebar
            this.hideRoadInfo();

            this.selectedRoads = [];
            TipPanel.dismiss('multiselect', false);
        }
    }

    /**
     * Add purple markers at road endpoints
     * @param {L.Polyline} road - The road layer
     */
    addEndpointMarkers(road) {
        // Get coordinates from the visible line
        const line = road._visibleLine || road;
        const coordinates = line.getLatLngs();
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
        this.selectedRoadMarkers.push(startMarker, endMarker);
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
    /**
     * Show road information in sidebar
     * @param {Object} properties - Road properties
     */
    showRoadInfo() {
        if (!this.selectedRoads || this.selectedRoads.length === 0) return;

        const sidebar = document.getElementById('road-info-sidebar');
        const content = document.getElementById('road-info-content');

        if (!sidebar || !content) return;

        const isMulti = this.selectedRoads.length > 1;
        const firstProps = this.selectedRoads[0].feature.properties;

        // Calculate common smoothness
        let commonSmoothness = firstProps.smoothness;
        for (let i = 1; i < this.selectedRoads.length; i++) {
            if (this.selectedRoads[i].feature.properties.smoothness !== commonSmoothness) {
                commonSmoothness = 'mixed';
                break;
            }
        }
        
        let name = firstProps.name || 'Droga bez nazwy';
        let osmId = firstProps.osm_id;
        
        if (isMulti) {
            name = `Zaznaczono odcinków: ${this.selectedRoads.length}`;
            osmId = 'wiele (' + this.selectedRoads.length + ')';
        }

        const properties = {
            name: name,
            osm_id: osmId,
            smoothness: commonSmoothness === 'mixed' ? null : commonSmoothness,
            highway: isMulti ? 'wiele typów dróg' : (firstProps.highway || 'nieznany typ'),
            isMulti: isMulti,
            firstOsmId: firstProps.osm_id
        };


        // Determine layout mode based on screen width
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            this.renderMobileSummary(sidebar, content, properties);
        } else {
            this.renderFullEditor(sidebar, content, properties);
        }

        // Initialize tech info icon if header exists (desktop or after expansion)
        this.initTechInfoIcon(properties);

        // Ensure sidebar is visible
        sidebar.style.display = 'flex';
    }

    renderMobileSummary(sidebar, content, properties) {
        const name = properties.name || 'Droga bez nazwy';

        // Determine style type from raw property
        const styleType = this.getRoadStyleType(properties.smoothness);

        // Prepare text label
        const smoothnessLabel = properties.smoothness ?
            (CONFIG.SMOOTHNESS_OPTIONS.find(opt => opt.value === properties.smoothness)?.label || properties.smoothness)
            : 'brak danych';

        // Add mobile styling class
        sidebar.classList.add('mobile-bottom-sheet');
        sidebar.classList.remove('expanded');

        // Hide standard header in mobile summary mode
        const header = sidebar.querySelector('.road-info-header');
        if (header) header.style.display = 'none';

        // Get style from configuration
        const styleConfig = CONFIG.ROAD_STYLES[styleType] || CONFIG.ROAD_STYLES.unknown;

        const strokeColor = styleConfig.color;
        const borderStyle = styleConfig.dashArray ? 'dashed' : 'solid';

        content.innerHTML = `
            <div class="mobile-summary-content">
                <div class="mobile-summary-info">
                    <h3 class="mobile-road-name">${name}</h3>
                    <div class="mobile-quality-line" style="
                        background: none; 
                        border-top: 4px ${borderStyle} ${strokeColor}; 
                        height: 0; 
                        width: 60px;
                        margin-top: 8px;">
                    </div>
                </div>
                <button class="btn-mobile-edit" id="mobile-edit-btn">
                    <i class="fas fa-pen"></i>
                    Edytuj
                </button>
            </div>
        `;

        // Add event listener to expand to full editor
        const editBtn = document.getElementById('mobile-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.renderFullEditor(sidebar, content, properties);
                sidebar.classList.add('expanded');
            });
        }
    }

    renderFullEditor(sidebar, content, properties) {
        const name = properties.name || 'Droga bez nazwy';
        const smoothness = properties.smoothness || null;
        const osmId = properties.osm_id;

        // Show standard header
        const header = sidebar.querySelector('.road-info-header');
        if (header) {
            header.style.display = 'flex';
            const headerTitle = header.querySelector('h3');
            if (headerTitle) {
                headerTitle.innerHTML = `
                    ${name}
                    <i class="fas fa-info-circle road-info-icon" id="road-tech-info-icon" 
                       title="Informacje techniczne"></i>
                `;
            }
        }

        content.innerHTML = `
            <div class="road-info-scrollable">
                ${SmoothnessEditor.render(smoothness)}
            </div>
            ${SmoothnessEditor.renderActions(properties, this.oauth && this.oauth.isAuthenticated())}
        `;

        // Initialize close button if not already done
        this.initRoadInfoSidebar();

        // Pass selectedRoads and API refs to SmoothnessEditor via init()
        SmoothnessEditor.init({
            currentSmoothness: smoothness,
            selectedRoads:     this.selectedRoads,
            osmApi:            this.osmApi,
            oauth:             this.oauth,
            onSaveSuccess:     ({ updatedIds, newValue }) => {
                updatedIds.forEach(id => this.updateRoadLocally(id, newValue, false));
                this.showRoadInfo();
            }
        });

        // Re-init tech info icon as header was touched
        this.initTechInfoIcon(properties);
    }

    /**
     * Hide road information sidebar
     */
    hideRoadInfo() {
        const sidebar = document.getElementById('road-info-sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
            // Reset classes
            sidebar.classList.remove('mobile-bottom-sheet', 'expanded');
            // Reset header display
            const header = sidebar.querySelector('.road-info-header');
            if (header) {
                header.style.display = 'flex';
                // Reset header title
                const headerTitle = header.querySelector('h3');
                if (headerTitle) headerTitle.textContent = 'Informacje o drodze';
            }
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


    /**
     * Initialize tech info icon click handler
     * @param {Object} properties - Road properties
     */
    initTechInfoIcon(properties) {
        const infoIcon = document.getElementById('road-tech-info-icon');
        if (!infoIcon) return;

        // Remove previous listener if exists
        const newIcon = infoIcon.cloneNode(true);
        infoIcon.parentNode.replaceChild(newIcon, infoIcon);

        newIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTechInfoPopup(properties);
        });
    }

    /**
     * Show technical information popup
     * @param {Object} properties - Road properties
     */
    showTechInfoPopup(properties) {
        const highway = properties.highway || 'nieznany typ';
        const smoothness = properties.smoothness || 'brak danych';
        const osmId = properties.osm_id;

        const popupHtml = `
            <div class="tech-info-popup-overlay" id="tech-info-popup-overlay">
                <div class="tech-info-popup">
                    <div class="tech-info-popup-header">
                        <h4>Informacje techniczne</h4>
                        <button class="tech-info-popup-close" id="tech-info-popup-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="tech-info-popup-content">
                        <div class="tech-info-item">
                            <span class="tech-info-label">Typ drogi:</span>
                            <span class="tech-info-value">${highway}</span>
                        </div>
                        <div class="tech-info-item">
                            <span class="tech-info-label">Jakość nawierzchni:</span>
                            <span class="tech-info-value">${smoothness}</span>
                        </div>
                        <div class="tech-info-item">
                            <span class="tech-info-label">OSM ID:</span>
                            <span class="tech-info-value">${osmId}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing popup if any
        const existingPopup = document.getElementById('tech-info-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Add popup to body
        document.body.insertAdjacentHTML('beforeend', popupHtml);

        // Add close handlers
        const overlay = document.getElementById('tech-info-popup-overlay');
        const closeBtn = document.getElementById('tech-info-popup-close');

        const closePopup = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        };

        closeBtn.addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });
    }
    updateRoadLocally(wayId, newSmoothness, refreshUI = true) {
        const road = this.selectedRoads ? this.selectedRoads.find(r => r.feature.properties.osm_id === wayId) : null;
        if (!road) return;

        // Update the road properties
        const properties = road.feature.properties;
        properties.smoothness = newSmoothness;

        // Calculate new style
        const newStyleType = this.getRoadStyleType(newSmoothness);
        const newStyle = this.getRoadStyle(newStyleType);

        // Update the road style type
        road.styleType = newStyleType;

        // Update the visible line style
        if (road._visibleLine) {
            road._visibleLine.setStyle(newStyle);

            // If the road is selected, reapply selection style
            const selectedStyle = {
                color: '#8b5cf6',
                weight: 4,
                opacity: 1,
                dashArray: null
            };
            road._visibleLine.setStyle(selectedStyle);
        }

        // Update the road info panel only if refreshUI is true
        if (refreshUI) {
            this.showRoadInfo();
        }

        console.log(`✓ Road ${wayId} updated locally with smoothness: ${newSmoothness} (style: ${newStyleType})`);
    }


    /* ==========================================
       TIP PANEL (Multi-select hint)
       ========================================== */

    showMultiSelectTip() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const keyLabel = isMac ? '⌘ Cmd' : 'Ctrl';
        TipPanel.show('multiselect',
            `Przytrzymaj <kbd>${keyLabel}</kbd> i klikaj drogi, aby zaznaczyć wiele odcinków naraz i edytować je hurtowo.`
        );
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
    /* ==========================================
       VIEWPORT ROAD LOADING
       ========================================== */

    addLoadRoadsControl() {
        if (!this.map) return;

        const container = L.DomUtil.create('div', 'map-load-control');
        const button = L.DomUtil.create('button', 'btn-load-roads', container);

        button.innerHTML = '<i class="fas fa-cloud-download-alt"></i> <span>Wczytaj drogi</span>';
        button.title = 'Wczytaj drogi z widocznego obszaru';

        // Initial state check
        this.updateLoadButtonState(button);

        // Zoom listener to update state
        this.map.on('zoomend', () => {
            this.updateLoadButtonState(button);
        });

        // Click handler
        button.addEventListener('click', (e) => {
            L.DomEvent.stop(e);
            if (!button.disabled) {
                this.loadVisibleRoads(button);
            }
        });

        // Prevent map clicks
        L.DomEvent.disableClickPropagation(container);

        // Append to map container (custom positioning)
        this.map.getContainer().appendChild(container);
        this.loadRoadsButton = button;
    }

    updateLoadButtonState(button) {
        if (!button) return;
        const zoom = this.map.getZoom();
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const minLoadZoom = isMobile ? CONFIG.MAP.MIN_LOAD_ZOOM_MOBILE : CONFIG.MAP.MIN_LOAD_ZOOM;

        if (zoom < minLoadZoom) {
            button.disabled = true;
            button.classList.add('disabled');
            button.title = `Przybliż mapę, aby wczytać drogi (min. zoom ${minLoadZoom})`;
        } else {
            button.disabled = false;
            button.classList.remove('disabled');
            button.title = 'Wczytaj drogi z widocznego obszaru';
        }
    }

    async loadVisibleRoads(button) {
        if (this.isLoading) return;

        // Ensure OverpassAPI is available
        if (!this.overpassApi) {
            console.error('OverpassAPI client not initialized in MapManager');
            Toast.show('Błąd wewnętrzny: Moduł OverpassAPI nie jest dostępny.', 'error');
            return;
        }

        const zoom = this.map.getZoom();
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const minLoadZoom = isMobile ? CONFIG.MAP.MIN_LOAD_ZOOM_MOBILE : CONFIG.MAP.MIN_LOAD_ZOOM;

        if (zoom < minLoadZoom) {
            Toast.show(`Obszar jest zbyt duży. Przybliż mapę, aby wczytać drogi (wymagany zoom ${minLoadZoom}+).`, 'warning');
            return;
        }

        try {
            this.isLoading = true;
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Wczytuję...</span>';
            button.disabled = true;

            const bounds = this.map.getBounds();
            // Leaflet bounds: [west, south, east, north]
            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ];

            // Fetch data from OverpassAPI (returns GeoJSON)
            const geoJson = await this.overpassApi.fetchRoadsInBBox(bbox);

            let addedCount = 0;
            const features = geoJson.features || [];

            for (const feature of features) {
                const id = feature.properties.osm_id;

                // Skip if already loaded
                if (this.loadedWayIds.has(id.toString())) continue;

                // Create and add layer
                // feature is already in the format expected by createRoadLayer
                const layer = this.createRoadLayer(feature);
                this.roadsLayer.addLayer(layer);

                this.loadedWayIds.add(id.toString());
                addedCount++;
            }

            console.log(`Loaded ${addedCount} new roads.`);

            if (addedCount === 0) {
                Toast.show('Nie znaleziono nowych dróg w tym obszarze (lub już są wczytane).', 'info');
            }

        } catch (error) {
            console.error('Error loading roads:', error);
            // Handle Overpass specific errors
            if (error.message.includes('timeout') || error.message.includes('size')) {
                Toast.show('Serwer Overpass zwrócił błąd (zbyt duży obszar lub timeout). Proszę przybliżyć mapę.', 'error', 6000);
            } else {
                Toast.show('Wystąpił błąd podczas wczytywania dróg: ' + error.message, 'error', 6000);
            }
        } finally {
            this.isLoading = false;
            if (button) {
                // Restore button state
                button.innerHTML = '<i class="fas fa-cloud-download-alt"></i> <span>Wczytaj drogi</span>';
                button.disabled = false;
                this.updateLoadButtonState(button);
            }
        }
    }

    saveMapState() {
        if (!this.map) return;
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const state = {
            lat: center.lat,
            lng: center.lng,
            zoom: zoom
        };
        localStorage.setItem('mapState', JSON.stringify(state));
    }

    restoreMapState() {
        const savedState = localStorage.getItem('mapState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.lat && state.lng && state.zoom) {
                    this.map.setView([state.lat, state.lng], state.zoom);
                }
            } catch (e) {
                console.error('Failed to parse saved map state', e);
            }
        }
    }

}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MapManager };
}

