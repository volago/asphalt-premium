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
            }
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
        
        const cachedData = this.cache.get(this.currentVoivodeship);
        
        if (cachedData) {
            console.log(`Loading cached data for ${this.currentVoivodeship}`);
            this.showMessage(CONFIG.MESSAGES.CACHE_LOADED, 'success');
            this.displayRoads(cachedData);
            this.zoomToVoivodeship(this.currentVoivodeship);
        } else {
            console.log(`No cached data for ${this.currentVoivodeship}`);
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
            const data = await this.overpass.fetchRoads(voivodeshipData.bbox);
            
            // Cache the data
            this.cache.set(this.currentVoivodeship, data);
            
            // Display on map
            this.displayRoads(data);
            this.zoomToVoivodeship(this.currentVoivodeship);
            
            this.showMessage(`${CONFIG.MESSAGES.DATA_FETCHED} (${data.features.length} dróg)`, 'success');
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showMessage(CONFIG.MESSAGES.ERROR_FETCH, 'error');
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
        console.log(`Displayed roads:`, roadCounts);
        
        return roadCounts;
    }
    
    zoomToVoivodeship(voivodeshipKey) {
        if (this.mapManager) {
            this.mapManager.zoomToVoivodeship(voivodeshipKey);
        }
    }
    
    /* ==========================================
       UI HELPERS
       ========================================== */
    
    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }
    
    setRefreshButtonState(enabled) {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = !enabled;
            refreshBtn.innerHTML = enabled ? 
                '<span class="btn-icon">🔄</span>Odśwież' : 
                '<span class="btn-icon">⏳</span>Ładowanie...';
        }
    }
    
    showMessage(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} animate-slide-in-right`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '5rem';
        notification.style.right = '1rem';
        notification.style.zIndex = '10000';
        notification.style.minWidth = '250px';
        notification.style.maxWidth = '400px';
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Allow manual close on click
        notification.addEventListener('click', () => {
            notification.remove();
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
