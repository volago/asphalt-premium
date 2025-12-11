/* ==========================================
   APP.JS - Main Application Logic
   Asphalt Premium
   ========================================== */

class AsphaltPremiumApp {
    constructor() {
        this.currentPage = 'map'; // Always start on map page
        this.map = null;
        this.mapManager = null;
        this.cache = null;
        this.overpass = null;
        this.currentVoivodeship = null;
        this.oauth = null;
        this.osmApi = null;
        this.isMobile = false;
        this.mobileMediaQuery = null;
        this.mobileFilterControl = null;
        
        this.init();
    }
    
    /**
     * Determine if about overlay should be shown (first visit)
     */
    shouldShowAboutOverlay() {
        const hasVisited = localStorage.getItem('asphalt_premium_visited');
        if (!hasVisited) {
            // First visit - show about overlay
            localStorage.setItem('asphalt_premium_visited', 'true');
            return true;
        }
        // Returning user - don't show overlay
        return false;
    }
    
    async init() {
        // Initialize components
        this.cache = new CacheManager();
        this.overpass = new OverpassAPI();
        
        // Initialize OAuth and OSM API
        this.oauth = new OSMOAuth();
        this.osmApi = new OSMAPIClient(this.oauth);
        
        // Check if this is an OAuth callback
        const isOAuthCallback = await this.handleOAuthCallback();
        
        // Initialize UI
        this.initNavigation();
        this.initSidebar();
        this.initMap();
        
        // Pass OAuth instances to map manager
        if (this.mapManager) {
            this.mapManager.setOAuthClient(this.oauth, this.osmApi);
        }
        
        // Setup responsive UI after map is initialized
        // Use setTimeout to ensure map is fully rendered
        setTimeout(() => {
            this.setupResponsiveUI();
        }, 100);
        
        // Set initial page state
        this.setInitialPageState();
        
        // Show about overlay if first visit (but not if OAuth callback)
        if (!isOAuthCallback && this.shouldShowAboutOverlay()) {
            this.showAboutOverlay();
        }
        
        // Bind events
        this.bindEvents();
        
        // Update toolbar login status
        this.updateToolbarLoginStatus();
        
        // Log authentication status
        if (this.oauth.isAuthenticated()) {
            console.log('User is authenticated');
            this.getUserInfo();
        } else {
            console.log('User is not authenticated');
        }
        
        console.log('Asphalt Premium App initialized');
    }
    
    /**
     * Handle OAuth callback if present
     * @returns {Promise<boolean>} True if OAuth callback was handled
     */
    async handleOAuthCallback() {
        try {
            const handled = await this.oauth.handleCallback();
            
            if (handled) {
                console.log('OAuth callback handled successfully');
                
                // Check if we're in a popup window
                if (window.opener && !window.opener.closed) {
                    // We're in a popup, notify parent and close
                    try {
                        window.opener.postMessage({ type: 'oauth_success' }, window.location.origin);
                        console.log('Notified parent window of successful login');
                        // Give the message time to be delivered
                        setTimeout(() => {
                            window.close();
                        }, 500);
                    } catch (error) {
                        console.error('Failed to notify parent window:', error);
                        // If we can't close the popup, show a message
                        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; text-align: center; padding: 2rem;"><div><h1>✓ Logowanie powiodło się!</h1><p>Możesz zamknąć to okno i wrócić do aplikacji.</p></div></div>';
                    }
                } else {
                    // Normal callback in main window
                    this.showMessage('Logowanie powiodło się! Możesz teraz edytować drogi.', 'success');
                }
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('OAuth callback error:', error);
            
            // Check if we're in a popup window
            if (window.opener && !window.opener.closed) {
                // We're in a popup, notify parent of error and close
                try {
                    window.opener.postMessage({ type: 'oauth_error', error: error.message }, window.location.origin);
                    setTimeout(() => {
                        window.close();
                    }, 500);
                } catch (notifyError) {
                    console.error('Failed to notify parent window:', notifyError);
                    document.body.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; text-align: center; padding: 2rem;"><div><h1>✗ Błąd logowania</h1><p>${error.message}</p><p>Możesz zamknąć to okno.</p></div></div>`;
                }
            } else {
                // Normal callback in main window
                this.showMessage(`Błąd logowania: ${error.message}`, 'error');
            }
            return false;
        }
    }
    
    /**
     * Get and display user info
     */
    async getUserInfo() {
        try {
            const userName = await this.oauth.getUserInfo();
            if (userName) {
                console.log('Logged in as:', userName);
                this.updateToolbarLoginStatus(userName);
            }
        } catch (error) {
            console.error('Failed to get user info:', error);
        }
    }
    
    /**
     * Update toolbar login status display
     * @param {string} userName - Optional username if authenticated
     */
    updateToolbarLoginStatus(userName = null) {
        const loginBtn = document.getElementById('toolbar-login-btn');
        const userSection = document.getElementById('toolbar-user-section');
        const userNameEl = document.getElementById('toolbar-user-name');
        
        if (!loginBtn || !userSection) return;
        
        const isAuthenticated = this.oauth && this.oauth.isAuthenticated();
        
        if (isAuthenticated && userName) {
            // Show user section (info + logout), hide login button
            loginBtn.style.display = 'none';
            userSection.style.display = 'flex';
            userNameEl.textContent = `Zalogowany jako ${userName}`;
        } else if (isAuthenticated) {
            // Authenticated but no username yet - try to get it
            this.getUserInfo();
        } else {
            // Not authenticated - show login button, hide user section
            loginBtn.style.display = 'inline-flex';
            userSection.style.display = 'none';
        }
    }
    
    /**
     * Set the initial page state - always show map page
     */
    setInitialPageState() {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === 'map') {
                btn.classList.add('active');
            }
        });
        
        // Show map page
        const mapPageElement = document.getElementById('map-page');
        if (mapPageElement) {
            mapPageElement.classList.add('active');
        }
        
        console.log('Initial page set to: map');
    }
    
    /**
     * Show about overlay
     */
    showAboutOverlay() {
        const aboutOverlay = document.getElementById('about-overlay');
        if (aboutOverlay) {
            aboutOverlay.style.display = 'flex';
            aboutOverlay.classList.add('animate-fade-in');
            document.body.classList.add('about-overlay-open');
            
            // Hide mobile filter control when about overlay is shown
            if (this.isMobile && this.mapManager && this.mapManager.mobileFilterControl) {
                const controlElement = this.mapManager.mobileFilterControl.getContainer();
                if (controlElement) {
                    controlElement.style.display = 'none';
                }
            }
        }
    }
    
    /**
     * Hide about overlay
     */
    hideAboutOverlay() {
        const aboutOverlay = document.getElementById('about-overlay');
        if (aboutOverlay) {
            aboutOverlay.style.display = 'none';
            aboutOverlay.classList.remove('animate-fade-in');
            document.body.classList.remove('about-overlay-open');
            
            // Show mobile filter control when about overlay is hidden
            if (this.isMobile && this.mapManager && this.mapManager.mobileFilterControl) {
                const controlElement = this.mapManager.mobileFilterControl.getContainer();
                if (controlElement) {
                    controlElement.style.display = 'block';
                }
            }
        }
    }

    /* ==========================================
       RESPONSIVE / MOBILE FILTERS
       ========================================== */

    setupResponsiveUI() {
        try {
            // Initialize mobile media query
            this.mobileMediaQuery = window.matchMedia('(max-width: 768px)');
            this.isMobile = this.mobileMediaQuery.matches;

            // React to viewport changes
            const handleChange = (event) => {
                try {
                    this.handleViewportChange(event.matches);
                } catch (error) {
                    console.error('Error handling viewport change:', error);
                }
            };

            if (this.mobileMediaQuery.addEventListener) {
                this.mobileMediaQuery.addEventListener('change', handleChange);
            } else if (this.mobileMediaQuery.addListener) {
                // Safari <14
                this.mobileMediaQuery.addListener(handleChange);
            }

            this.handleViewportChange(this.isMobile);
        } catch (error) {
            console.error('Error setting up responsive UI:', error);
        }
    }

    handleViewportChange(isMobile) {
        this.isMobile = isMobile;

        // Close mobile menu when switching to desktop
        if (!isMobile) {
            this.closeMobileMenu();
        }

        // Ensure map is initialized before adding controls
        if (!this.mapManager || !this.mapManager.map) {
            console.warn('MapManager not ready, retrying...');
            setTimeout(() => this.handleViewportChange(isMobile), 200);
            return;
        }

        if (isMobile) {
            this.mobileFilterControl = this.mapManager.addMobileFilterControl(() => this.openMobileFilterModal());
        } else {
            this.closeMobileFilterModal();
            this.mapManager.removeMobileFilterControl();
        }
    }

    openMobileFilterModal() {
        if (!this.isMobile) return;

        const overlay = document.getElementById('mobile-filter-overlay');
        const sidebar = document.getElementById('sidebar');

        if (overlay) {
            overlay.style.display = 'block';
        }

        if (sidebar) {
            sidebar.scrollTop = 0;
        }

        document.body.classList.add('mobile-filter-open');
    }

    closeMobileFilterModal() {
        const overlay = document.getElementById('mobile-filter-overlay');

        if (overlay) {
            overlay.style.display = 'none';
        }

        document.body.classList.remove('mobile-filter-open');
    }
    
    /* ==========================================
       NAVIGATION
       ========================================== */
    
    initNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu');
        const logo = document.querySelector('.logo');
        
        // Handle logo click - go to map
        if (logo) {
            logo.addEventListener('click', () => {
                this.hideAboutOverlay();
                
                // Update active state in navigation buttons
                navButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.page === 'map') {
                        btn.classList.add('active');
                    }
                });
                
                // Close mobile menu if open
                if (this.isMobile && mobileMenu && mobileMenu.classList.contains('open')) {
                    this.closeMobileMenu();
                }
            });
            
            // Make logo cursor pointer to indicate it's clickable
            logo.style.cursor = 'pointer';
        }
        
        // Handle navigation button clicks (both desktop and mobile)
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetPage = e.target.closest('.nav-btn').dataset.page;
                
                // Update active state
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Handle page navigation
                if (targetPage === 'about') {
                    this.showAboutOverlay();
                } else if (targetPage === 'map') {
                    this.hideAboutOverlay();
                }
                
                // Close mobile menu after selection
                if (this.isMobile && mobileMenu) {
                    this.closeMobileMenu();
                }
            });
        });
        
        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMobile && mobileMenu && mobileMenuToggle) {
                const isClickInsideMenu = mobileMenu.contains(e.target);
                const isClickOnToggle = mobileMenuToggle.contains(e.target);
                
                if (!isClickInsideMenu && !isClickOnToggle && mobileMenu.classList.contains('open')) {
                    this.closeMobileMenu();
                }
            }
        });
    }
    
    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            const isOpen = mobileMenu.classList.contains('open');
            if (isOpen) {
                mobileMenu.classList.remove('open');
                document.body.classList.remove('mobile-menu-open');
            } else {
                mobileMenu.classList.add('open');
                document.body.classList.add('mobile-menu-open');
            }
        }
    }
    
    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.remove('open');
            document.body.classList.remove('mobile-menu-open');
        }
    }
    
    
    /* ==========================================
       SIDEBAR
       ========================================== */
    
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const refreshBtn = document.getElementById('refresh-btn');
        const voivodeshipSelect = document.getElementById('voivodeship-select');
        const goToMapBtn = document.getElementById('go-to-map-btn');
        const mobileCloseBtn = document.getElementById('mobile-filter-close');
        const mobileOverlay = document.getElementById('mobile-filter-overlay');
        
        // Sidebar toggle functionality
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', () => this.closeMobileFilterModal());
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => this.closeMobileFilterModal());
        }
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // Voivodeship selection
        if (voivodeshipSelect) {
            voivodeshipSelect.addEventListener('change', (e) => {
                this.currentVoivodeship = e.target.value;
                if (this.currentVoivodeship) {
                    this.loadCachedData();
                } else {
                    // Hide statistics when no voivodeship selected
                    this.hideStatistics();
                }
            });
        }
        
        // Go to map buttons (all buttons with go-to-map-btn class)
        const goToMapButtons = document.querySelectorAll('.go-to-map-btn');
        goToMapButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideAboutOverlay();
            });
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
        
        // Close mobile filter modal after data is loaded (on mobile only)
        if (this.isMobile) {
            this.closeMobileFilterModal();
        }
        
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
        
        // Handle smooth scrolling for anchor links in about overlay
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a[href^="#"]');
            if (target && target.hash) {
                const aboutOverlay = document.getElementById('about-overlay');
                if (aboutOverlay && aboutOverlay.style.display !== 'none') {
                    e.preventDefault();
                    const targetElement = document.querySelector(target.hash);
                    if (targetElement) {
                        // Smooth scroll within the about overlay
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                    }
                }
            }
        });
        
        // Handle legend info button
        const legendInfoBtn = document.getElementById('legend-info-btn');
        const legendInfoPopup = document.getElementById('legend-info-popup');
        const legendInfoClose = document.getElementById('legend-info-popup-close');
        
        if (legendInfoBtn && legendInfoPopup) {
            // Open popup
            legendInfoBtn.addEventListener('click', () => {
                legendInfoPopup.style.display = 'flex';
            });
            
            // Close popup
            if (legendInfoClose) {
                legendInfoClose.addEventListener('click', () => {
                    legendInfoPopup.style.display = 'none';
                });
            }
            
            // Close on overlay click
            legendInfoPopup.addEventListener('click', (e) => {
                if (e.target === legendInfoPopup) {
                    legendInfoPopup.style.display = 'none';
                }
            });
            
            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && legendInfoPopup.style.display === 'flex') {
                    legendInfoPopup.style.display = 'none';
                }
            });
        }
        
        // Handle toolbar login button
        const toolbarLoginBtn = document.getElementById('toolbar-login-btn');
        if (toolbarLoginBtn) {
            toolbarLoginBtn.addEventListener('click', () => {
                if (this.oauth) {
                    this.oauth.login(window.location.href);
                }
            });
        }
        
        // Handle toolbar logout button
        const toolbarLogoutBtn = document.getElementById('toolbar-logout-btn');
        if (toolbarLogoutBtn) {
            toolbarLogoutBtn.addEventListener('click', () => {
                if (this.oauth) {
                    this.oauth.logout();
                    this.updateToolbarLoginStatus();
                    
                    // Close any open road info sidebar
                    const roadInfoSidebar = document.getElementById('road-info-sidebar');
                    if (roadInfoSidebar) {
                        roadInfoSidebar.style.display = 'none';
                    }
                    
                    // Show success message
                    this.showMessage('Wylogowano pomyślnie', 'success');
                }
            });
        }
        
        // Listen for OAuth success messages from popup
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'oauth_success') {
                console.log('OAuth success message received');
                this.updateToolbarLoginStatus();
                // Refresh user info
                if (this.oauth.isAuthenticated()) {
                    this.getUserInfo();
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
