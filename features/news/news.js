/* ==========================================
   NEWS.JS - News and Releases Module
   Asfalt Premium
   ========================================== */

class NewsManager {
    constructor() {
        this.releasesData = [];
        this.lastSeenVersion = null;
    }

    /**
     * Fetch RELEASES.MD, parse it, check localStorage and update dot
     */
    async init() {
        try {
            const response = await fetch('RELEASES.MD?_=' + Date.now());
            const text = await response.text();
            this.releasesData = this.parseReleasesMarkdown(text);

            if (this.releasesData.length === 0) return;

            // Newest version = first entry
            const latestVersion = this.releasesData[0].version;
            this.lastSeenVersion = localStorage.getItem('asphalt_last_seen_version');

            const hasNew = this.lastSeenVersion !== latestVersion;
            this.updateDot(hasNew);

            console.log(`[News] Latest: ${latestVersion}, LastSeen: ${this.lastSeenVersion}, hasNew: ${hasNew}`);
            
            this.bindEvents();
        } catch (err) {
            console.warn('[News] Could not load RELEASES.MD:', err);
        }
    }

    /**
     * Parse RELEASES.MD text into array of { version, description }
     */
    parseReleasesMarkdown(text) {
        const lines   = text.split(/\r?\n/);
        const VERSION = /^\s*([\d]+\.[\d]+\.[\d]+(?:[\w.-]*)?)/;
        const entries = [];
        let current   = null;

        for (const line of lines) {
            const match = line.match(VERSION);
            if (match) {
                if (current) entries.push(current);
                current = { version: match[1].trim(), descLines: [] };
            } else if (current && line.trim() !== '') {
                current.descLines.push(line.trim());
            }
        }
        if (current) entries.push(current);

        return entries.map(e => ({
            version:     e.version,
            description: e.descLines.join('\n'),
        }));
    }

    /**
     * Show or hide the red notification dot on both buttons
     */
    updateDot(show) {
        ['news-dot', 'news-dot-mobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'inline-block' : 'none';
        });
    }

    /**
     * Build and inject HTML for release entries into the modal body
     */
    renderHTML() {
        const body = document.getElementById('news-modal-body');
        if (!body) return;

        if (!this.releasesData || this.releasesData.length === 0) {
            body.innerHTML = '<p class="news-modal-empty" style="text-align:center; color: var(--medium-gray); padding: 2rem 0;">Brak informacji o zmianach.</p>';
            return;
        }

        const latestVersion  = this.releasesData[0].version;
        const lastSeen       = localStorage.getItem('asphalt_last_seen_version');

        const html = this.releasesData.map((release, idx) => {
            const isNew = lastSeen !== latestVersion && idx === 0;
            const newBadge = isNew
                ? '<span class="release-version-new" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.06em; text-transform: uppercase;">Nowe</span>'
                : '';
            const desc = release.description
                ? `<p class="release-description" style="font-size: 0.9rem; color: var(--secondary-gray); line-height: 1.65; margin: 0; white-space: pre-line;">${this.escapeHtml(release.description)}</p>`
                : '';
            return `
                <div class="release-entry" style="margin-bottom: 1.5rem; border-left: 3px solid var(--primary-blue); padding-left: 1rem;">
                    <div class="release-version" style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span class="release-version-badge" style="background: linear-gradient(135deg, var(--primary-blue), #1e40af); color: white; font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 99px;">v${this.escapeHtml(release.version)}</span>
                        ${newBadge}
                    </div>
                    ${desc}
                </div>`;
        }).join('');

        body.innerHTML = html;
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    openModal() {
        this.renderHTML();
        const overlay = document.getElementById('news-modal');
        if (overlay) {
            overlay.classList.remove('modal-hiding');
            overlay.style.display = 'flex';
        }

        // Mark as seen
        if (this.releasesData && this.releasesData.length > 0) {
            const latestVersion = this.releasesData[0].version;
            localStorage.setItem('asphalt_last_seen_version', latestVersion);
            this.lastSeenVersion = latestVersion;
            this.updateDot(false);
        }
    }

    closeModal() {
        const overlay = document.getElementById('news-modal');
        if (overlay) {
            overlay.classList.add('modal-hiding');
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('modal-hiding');
            }, 250); // match animation duration
        }
    }
    
    bindEvents() {
        const newsBtn       = document.getElementById('news-btn');
        const newsBtnMobile = document.getElementById('news-btn-mobile');
        const newsClose     = document.getElementById('news-modal-close');
        const newsOverlay   = document.getElementById('news-modal');

        const openNews = () => {
            this.openModal();
            // Optional: try to close mobile menu if it exists (using global function or app instance)
            const mobileMenu = document.getElementById('mobile-menu');
            const hamburgerBtn = document.getElementById('hamburger-btn');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                if (hamburgerBtn) hamburgerBtn.classList.remove('active');
            }
        };

        if (newsBtn)       newsBtn.addEventListener('click', openNews);
        if (newsBtnMobile) newsBtnMobile.addEventListener('click', openNews);

        if (newsClose) {
            newsClose.addEventListener('click', () => this.closeModal());
        }

        if (newsOverlay) {
            newsOverlay.addEventListener('click', (e) => {
                if (e.target === newsOverlay) this.closeModal();
            });
        }

        // We bind keyboard escape globally, handled in app.js or specific component
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('news-modal');
                if (overlay && overlay.style.display !== 'none') {
                    this.closeModal();
                }
            }
        });
    }
}
