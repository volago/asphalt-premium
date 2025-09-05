/* ==========================================
   APP.JS - Main Application Logic
   Asphalt Premium
   ========================================== */

class AsphaltPremiumApp {
    constructor() {
        this.currentPage = 'map';
        this.map = null;
        this.mapManager = null;
        this.cache = null;
        this.overpass = null;
        this.currentVoivodeship = null;
        
        this.init();
    }
    
    init() {
        // Initialize components
        this.cache = new CacheManager();
        this.overpass = new OverpassAPI();
        
        // Initialize UI
        this.initNavigation();
        this.initSidebar();
        this.initMap();
        
        // Bind events
        this.bindEvents();
        
        console.log('Asphalt Premium App initialized');
    }
    
    /* ==========================================
       NAVIGATION
       ========================================== */
    
    initNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = e.target.dataset.page;
                this.switchPage(targetPage);
            });
        });
    }
    
    switchPage(pageName) {
        if (this.currentPage === pageName) return;
        
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            }
        });
        
        // Hide current page
        const currentPageElement = document.getElementById(`${this.currentPage}-page`);
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
        }
        
        // Show new page
        const newPageElement = document.getElementById(`${pageName}-page`);
        if (newPageElement) {
            newPageElement.classList.add('active');
            newPageElement.classList.add('animate-fade-in');
        }
        
        this.currentPage = pageName;
        
        // Handle map resize when switching back to map
        if (pageName === 'map' && this.mapManager) {
            setTimeout(() => {
                this.mapManager.invalidateSize();
            }, 100);
        }
        
        console.log(`Switched to page: ${pageName}`);
    }
    
    /* ==========================================
       SIDEBAR
       ========================================== */
    
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const refreshBtn = document.getElementById('refresh-btn');
        const voivodeshipSelect = document.getElementById('voivodeship-select');
        
        // Sidebar toggle functionality
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
        
        // Refresh button
        refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });
        
        // Voivodeship selection
        voivodeshipSelect.addEventListener('change', (e) => {
            this.currentVoivodeship = e.target.value;
            if (this.currentVoivodeship) {
                this.loadCachedData();
            } else {
                // Hide statistics when no voivodeship selected
                this.hideStatistics();
            }
        });
        
        // Eye toggle buttons for layer visibility
        document.querySelectorAll('.eye-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roadType = e.currentTarget.getAttribute('data-type');
                this.toggleLayerVisibility(roadType);
            });
        });
    }
    
    /* ==========================================
       MAP INITIALIZATION
       ========================================== */
    
    initMap() {
        // Initialize map manager
        this.mapManager = new MapManager();
        this.map = this.mapManager.initialize('map');
        
        console.log('Map initialized');
    }
    
    /* ==========================================
       DATA LOADING
       ========================================== */
    
    async loadCachedData() {
        if (!this.currentVoivodeship) {
            this.showMessage(CONFIG.MESSAGES.NO_VOIVODESHIP, 'warning');
            return;
        }
        
        try {
            const cachedData = await this.cache.get(this.currentVoivodeship);
            
            if (cachedData) {
                console.log(`Loading cached data for ${this.currentVoivodeship}`);
                
                const featureCount = cachedData.features ? cachedData.features.length : 0;
                
                this.showMessage(`Dane z cache IndexedDB (${featureCount} dróg)`, 'success');
                this.displayRoads(cachedData);
                this.zoomToVoivodeship(this.currentVoivodeship);
                
                // Ensure roads are visible after zoom
                setTimeout(() => {
                    if (this.mapManager) {
                        this.mapManager.updateRoadVisibility();
                    }
                }, 500);
            } else {
                console.log(`No cached data for ${this.currentVoivodeship}`);
            }
        } catch (error) {
            console.error('Error loading cached data:', error);
        }
    }
    
    async refreshData() {
        if (!this.currentVoivodeship) {
            this.showMessage(CONFIG.MESSAGES.NO_VOIVODESHIP, 'warning');
            return;
        }
        
        this.showLoading(true);
        this.setRefreshButtonState(false);
        
        try {
            console.log(`Fetching fresh data for ${this.currentVoivodeship}`);
            
            const voivodeshipData = CONFIG.VOIVODESHIPS[this.currentVoivodeship];
            const data = await this.overpass.fetchRoads(voivodeshipData.adminName);
            
            // Check if we got meaningful data
            if (!data || !data.features || data.features.length === 0) {
                this.showMessage(`Brak danych dla województwa ${voivodeshipData.name}. Spróbuj ponownie później.`, 'warning');
                return;
            }
            
            // Cache the data in IndexedDB
            const cached = await this.cache.set(this.currentVoivodeship, data);
            if (!cached) {
                this.showMessage('Uwaga: Dane nie zostały zapisane w cache IndexedDB', 'warning');
            }
            
            // Display on map
            this.displayRoads(data);
            this.zoomToVoivodeship(this.currentVoivodeship);
            
            // Ensure roads are visible after zoom
            setTimeout(() => {
                if (this.mapManager) {
                    this.mapManager.updateRoadVisibility();
                }
            }, 500);
            
            this.showMessage(`${CONFIG.MESSAGES.DATA_FETCHED} (${data.features.length} dróg)`, 'success');
            
        } catch (error) {
            console.error('Error fetching data:', error);
            
            // Provide more specific error messages
            let errorMessage = CONFIG.MESSAGES.ERROR_FETCH;
            
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorMessage = `Zapytanie przekroczyło limit czasu. Spróbuj wybrać mniejsze województwo lub spróbuj ponownie później.`;
            } else if (error.message.includes('504') || error.message.includes('Gateway Timeout')) {
                errorMessage = `Serwer OverpassAPI jest przeciążony. Spróbuj ponownie za kilka minut.`;
            } else if (error.message.includes('429')) {
                errorMessage = `Zbyt wiele zapytań. Poczekaj chwilę przed kolejną próbą.`;
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = `Problemy z połączeniem internetowym. Sprawdź połączenie i spróbuj ponownie.`;
            }
            
            this.showMessage(errorMessage, 'error');
            
            // Try to load cached data as fallback
            try {
                const cachedData = await this.cache.get(this.currentVoivodeship);
                if (cachedData) {
                    this.showMessage('Załadowano dane z cache IndexedDB jako rezerwę', 'info');
                    this.displayRoads(cachedData);
                    this.zoomToVoivodeship(this.currentVoivodeship);
                }
            } catch (cacheError) {
                console.error('Failed to load fallback cache data:', cacheError);
            }
            
        } finally {
            this.showLoading(false);
            this.setRefreshButtonState(true);
        }
    }
    
    /* ==========================================
       MAP DISPLAY
       ========================================== */
    
    displayRoads(geoJsonData) {
        if (!this.mapManager) {
            console.error('Map manager not initialized');
            return;
        }
        
        const roadCounts = this.mapManager.displayRoads(geoJsonData);
        
        // Update statistics
        this.updateRoadStatistics(geoJsonData, roadCounts);
        
        return roadCounts;
    }
    
    zoomToVoivodeship(voivodeshipKey) {
        if (this.mapManager) {
            this.mapManager.zoomToVoivodeship(voivodeshipKey);
        }
    }
    
    /**
     * Toggle visibility of a specific road type layer
     * @param {string} roadType - Type of road to toggle
     */
    toggleLayerVisibility(roadType) {
        if (!this.mapManager) return;
        
        // Get current visibility state
        const currentState = this.mapManager.getLayerVisibility(roadType);
        const newState = !currentState;
        
        // Toggle visibility in map
        this.mapManager.toggleLayerVisibility(roadType, newState);
        
        // Update UI
        this.updateEyeToggleUI(roadType, newState);
    }
    
    /**
     * Update the eye toggle button UI state
     * @param {string} roadType - Type of road
     * @param {boolean} visible - Whether the layer is visible
     */
    updateEyeToggleUI(roadType, visible) {
        const eyeButton = document.querySelector(`.eye-toggle[data-type="${roadType}"]`);
        const legendItem = document.querySelector(`.legend-item[data-road-type="${roadType}"]`);
        
        if (eyeButton && legendItem) {
            if (visible) {
                eyeButton.classList.add('active');
                legendItem.classList.remove('disabled');
            } else {
                eyeButton.classList.remove('active');
                legendItem.classList.add('disabled');
            }
        }
    }
    
    /**
     * Update road quality statistics in sidebar
     * @param {Object} geoJsonData - Full road data
     * @param {Object} roadCounts - Road counts by quality
     */
    updateRoadStatistics(geoJsonData, roadCounts) {
        const statsElement = document.getElementById('road-stats');
        if (!statsElement) return;
        
        // Calculate statistics
        const totalRoads = geoJsonData.features ? geoJsonData.features.length : 0;
        
        if (totalRoads === 0) {
            statsElement.style.display = 'none';
            return;
        }
        
        // Count roads with smoothness data
        const roadsWithSmoothness = geoJsonData.features.filter(feature => 
            feature.properties && feature.properties.smoothness
        ).length;
        
        // Calculate counts and percentages
        const excellentPercent = totalRoads > 0 ? (roadCounts.excellent / totalRoads) * 100 : 0;
        const goodPercent = totalRoads > 0 ? (roadCounts.good / totalRoads) * 100 : 0;
        const poorPercent = totalRoads > 0 ? (roadCounts.poor / totalRoads) * 100 : 0;
        const unknownPercent = totalRoads > 0 ? (roadCounts.unknown / totalRoads) * 100 : 0;
        
        // Update UI elements
        const unknownElement = document.getElementById('unknown-roads');
        unknownElement.textContent = `${roadCounts.unknown} (${unknownPercent.toFixed(1)}%)`;
        
        // Set blue color to match map lines
        unknownElement.className = 'stat-value stat-unknown';
        unknownElement.style.color = '#2563eb';
        
        document.getElementById('excellent-percent').textContent = `${excellentPercent.toFixed(1)}%`;
        document.getElementById('good-percent').textContent = `${goodPercent.toFixed(1)}%`;
        document.getElementById('poor-percent').textContent = `${poorPercent.toFixed(1)}%`;
        
        // Show statistics
        statsElement.style.display = 'block';
        
    }
    
    /**
     * Hide road statistics
     */
    hideStatistics() {
        const statsElement = document.getElementById('road-stats');
        if (statsElement) {
            statsElement.style.display = 'none';
        }
    }
    
    /* ==========================================
       UI HELPERS
       ========================================== */
    

    
    showLoading(show) {
        // Loading state is now handled by setRefreshButtonState
        // This method kept for compatibility but does nothing
    }
    
    setRefreshButtonState(enabled) {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = !enabled;
            if (enabled) {
                refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>Odśwież';
                refreshBtn.classList.remove('loading');
            } else {
                refreshBtn.innerHTML = '<div class="btn-spinner"></div>Ładowanie...';
                refreshBtn.classList.add('loading');
            }
        }
    }
    
    showMessage(message, type = 'info') {
        // Remove any existing notifications of the same type first
        const existingNotifications = document.querySelectorAll('.toast-notification');
        existingNotifications.forEach(notification => {
            if (notification.classList.contains(`alert-${type}`)) {
                notification.remove();
            }
        });
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} animate-slide-in-right toast-notification`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '5rem';
        notification.style.right = '1rem';
        notification.style.zIndex = '10000';
        notification.style.minWidth = '250px';
        notification.style.maxWidth = '400px';
        notification.style.cursor = 'pointer';
        
        document.body.appendChild(notification);
        
        // Different timeout for different types
        const timeout = type === 'info' ? 3000 : 5000;
        
        // Auto remove after timeout
        const timeoutId = setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, timeout);
        
        // Allow manual close on click
        notification.addEventListener('click', () => {
            clearTimeout(timeoutId);
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }
    
    /* ==========================================
       EVENT BINDING
       ========================================== */
    
    bindEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.mapManager && this.currentPage === 'map') {
                this.mapManager.invalidateSize();
            }
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchPage('map');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchPage('about');
                        break;
                    case 'r':
                        e.preventDefault();
                        if (this.currentPage === 'map') {
                            this.refreshData();
                        }
                        break;
                }
            }
        });
    }
}

/* ==========================================
   INITIALIZE APP
   ========================================== */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    window.asphaltApp = new AsphaltPremiumApp();
});

// Add some CSS for road popup
const popupStyles = `
<style>
.road-popup h4 {
    margin: 0 0 8px 0;
    color: var(--primary-blue);
    font-size: 14px;
    font-weight: 600;
}

.road-popup p {
    margin: 4px 0;
    font-size: 12px;
    color: var(--secondary-gray);
}

.leaflet-popup-content {
    margin: 8px 12px;
    line-height: 1.4;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', popupStyles);
