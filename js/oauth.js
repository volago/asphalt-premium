/* ==========================================
   OAUTH.JS - OAuth 2.0 with PKCE for OSM
   Asfalt Premium
   ========================================== */

class OSMOAuth {
    constructor() {
        this.config = CONFIG.OSM_API.OAUTH;
        this.storageKeys = {
            accessToken: 'osm_access_token',
            codeVerifier: 'osm_code_verifier',
            state: 'osm_oauth_state',
            returnUrl: 'osm_return_url'
        };
    }
    
    /* ==========================================
       PKCE HELPERS
       ========================================== */
    
    /**
     * Generate random string for code_verifier
     * @returns {string} Random string
     */
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64URLEncode(array);
    }
    
    /**
     * Generate code_challenge from code_verifier
     * @param {string} verifier - Code verifier
     * @returns {Promise<string>} Code challenge
     */
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.base64URLEncode(new Uint8Array(hash));
    }
    
    /**
     * Base64 URL encode
     * @param {Uint8Array} buffer - Buffer to encode
     * @returns {string} Base64 URL encoded string
     */
    base64URLEncode(buffer) {
        const base64 = btoa(String.fromCharCode.apply(null, buffer));
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    
    /**
     * Generate random state for CSRF protection
     * @returns {string} Random state string
     */
    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return this.base64URLEncode(array);
    }
    
    /* ==========================================
       OAUTH FLOW
       ========================================== */
    
    /**
     * Start OAuth login flow
     * @param {string} returnUrl - URL to return to after login (optional)
     */
    async login(returnUrl = null) {
        try {
            // Generate PKCE parameters
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateState();
            
            // Store code_verifier and state in localStorage (shared between windows)
            localStorage.setItem(this.storageKeys.codeVerifier, codeVerifier);
            localStorage.setItem(this.storageKeys.state, state);
            
            // Store return URL if provided
            if (returnUrl) {
                localStorage.setItem(this.storageKeys.returnUrl, returnUrl);
            }
            
            // Build authorization URL
            const authUrl = new URL(CONFIG.OSM_API.getAuthorizationEndpoint());
            authUrl.searchParams.append('client_id', this.config.getClientId());
            authUrl.searchParams.append('redirect_uri', this.config.getRedirectUri());
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('scope', this.config.SCOPES);
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('state', state);
            
            console.log('Starting OAuth login flow...');
            console.log('Redirect URI:', this.config.getRedirectUri());
            
            // Redirect to authorization endpoint
            window.location.href = authUrl.toString();
            
        } catch (error) {
            console.error('Failed to start OAuth login:', error);
            throw error;
        }
    }
    
    /**
     * Handle OAuth callback after user authorizes
     * @returns {Promise<boolean>} True if successful
     */
    async handleCallback() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            
            // Check for authorization errors
            if (error) {
                console.error('OAuth authorization error:', error);
                const errorDescription = urlParams.get('error_description');
                throw new Error(`Authorization failed: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
            }
            
            // Check if we have a code
            if (!code) {
                return false; // No OAuth callback
            }
            
            // Check if user is already authenticated (callback was already processed)
            if (this.isAuthenticated()) {
                console.log('User already authenticated, cleaning up URL');
                // Clean URL without processing callback again
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                return true; // Callback already handled
            }
            
            // Verify state to prevent CSRF
            const savedState = localStorage.getItem(this.storageKeys.state);
            if (!savedState || savedState !== state) {
                console.warn('State parameter mismatch - callback may have been already processed');
                // Clean URL and return
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                return false;
            }
            
            // Get code_verifier from storage
            const codeVerifier = localStorage.getItem(this.storageKeys.codeVerifier);
            if (!codeVerifier) {
                throw new Error('Code verifier not found in session');
            }
            
            console.log('Exchanging authorization code for access token...');
            
            // Exchange code for access token
            const tokenData = await this.exchangeCodeForToken(code, codeVerifier);
            
            // Store access token
            sessionStorage.setItem(this.storageKeys.accessToken, tokenData.access_token);
            
            // Clean up temporary storage
            localStorage.removeItem(this.storageKeys.codeVerifier);
            localStorage.removeItem(this.storageKeys.state);
            
            // Get return URL if any
            const returnUrl = localStorage.getItem(this.storageKeys.returnUrl);
            localStorage.removeItem(this.storageKeys.returnUrl);
            
            // Clean URL (remove OAuth parameters)
            const cleanUrl = returnUrl || window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            console.log('OAuth login successful!');
            return true;
            
        } catch (error) {
            console.error('Failed to handle OAuth callback:', error);
            // Clean up on error
            sessionStorage.removeItem(this.storageKeys.codeVerifier);
            sessionStorage.removeItem(this.storageKeys.state);
            throw error;
        }
    }
    
    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code
     * @param {string} codeVerifier - Code verifier for PKCE
     * @returns {Promise<Object>} Token response
     */
    async exchangeCodeForToken(code, codeVerifier) {
        const tokenUrl = CONFIG.OSM_API.getTokenEndpoint();
        
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', this.config.getRedirectUri());
        params.append('client_id', this.config.getClientId());
        params.append('code_verifier', codeVerifier);
        
        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
            }
            
            const tokenData = await response.json();
            
            if (!tokenData.access_token) {
                throw new Error('No access token in response');
            }
            
            return tokenData;
            
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }
    
    /* ==========================================
       AUTHENTICATION STATE
       ========================================== */
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        const token = sessionStorage.getItem(this.storageKeys.accessToken);
        return token !== null && token !== '';
    }
    
    /**
     * Logout user and clear all stored tokens
     */
    logout() {
        // Clear access token
        sessionStorage.removeItem(this.storageKeys.accessToken);
        
        // Clear any remaining OAuth data
        localStorage.removeItem(this.storageKeys.codeVerifier);
        localStorage.removeItem(this.storageKeys.state);
        localStorage.removeItem(this.storageKeys.returnUrl);
        
        console.log('User logged out successfully');
    }
    
    /**
     * Get access token
     * @returns {string|null} Access token or null
     */
    getAccessToken() {
        return sessionStorage.getItem(this.storageKeys.accessToken);
    }
    
    
    /**
     * Get user display name (requires authenticated token)
     * @returns {Promise<string|null>} User display name or null
     */
    async getUserInfo() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        try {
            const apiUrl = CONFIG.OSM_API.getApiUrl();
            const response = await fetch(`${apiUrl}/api/0.6/user/details.json`, {
                headers: {
                    'Authorization': `Bearer ${this.getAccessToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.status}`);
            }
            
            const data = await response.json();
            return data.user?.display_name || null;
            
        } catch (error) {
            console.error('Failed to get user info:', error);
            return null;
        }
    }
}

