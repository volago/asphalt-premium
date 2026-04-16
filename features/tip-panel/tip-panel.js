/* ==========================================
   TIP-PANEL.JS - Tip Panel Manager
   Asfalt Premium
   ========================================== */

class TipPanel {
    /**
     * Show a tip panel on the map.
     * Only on desktop, only if not previously dismissed via localStorage.
     * @param {string} id - Unique ID for the tip (used for DOM element and localStorage key)
     * @param {string} message - HTML content for the tip body
     * @param {Object} [options] - Optional settings
     * @param {string} [options.title='Porada'] - Title text
     * @param {string} [options.icon='fas fa-lightbulb'] - FontAwesome icon class
     * @param {string} [options.dismissLabel='Nie pokazuj więcej'] - Dismiss button label
     * @param {number} [options.mobileBreakpoint=768] - Hide on screens narrower than this
     */
    static show(id, message, options = {}) {
        const {
            title = 'Porada',
            icon = 'fas fa-lightbulb',
            dismissLabel = 'Nie pokazuj więcej',
            mobileBreakpoint = 768
        } = options;

        // Don't show on mobile
        if (window.innerWidth <= mobileBreakpoint) return;

        // Don't show if already dismissed
        const storageKey = `asphalt_tip_${id}_dismissed`;
        if (localStorage.getItem(storageKey)) return;

        // Don't show if already visible
        const elementId = `map-tip-${id}`;
        if (document.getElementById(elementId)) return;

        const panel = document.createElement('div');
        panel.className = 'map-tip-panel';
        panel.id = elementId;
        panel.innerHTML = `
            <div class="map-tip-header">
                <div class="map-tip-title">
                    <i class="${icon}"></i>
                    ${title}
                </div>
                <button class="map-tip-close" aria-label="Zamknij">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="map-tip-body">
                ${message}
            </div>
            <button class="map-tip-dismiss">${dismissLabel}</button>
        `;

        document.body.appendChild(panel);

        // Close button — hides for this session only
        panel.querySelector('.map-tip-close').addEventListener('click', () => {
            TipPanel.dismiss(id, false);
        });

        // "Don't show again" — persists in localStorage
        panel.querySelector('.map-tip-dismiss').addEventListener('click', () => {
            TipPanel.dismiss(id, true);
        });
    }

    /**
     * Dismiss a tip panel.
     * @param {string} id - Tip ID
     * @param {boolean} permanent - If true, remember in localStorage
     */
    static dismiss(id, permanent) {
        const panel = document.getElementById(`map-tip-${id}`);
        if (!panel) return;

        if (permanent) {
            localStorage.setItem(`asphalt_tip_${id}_dismissed`, 'true');
        }

        panel.classList.add('hiding');
        setTimeout(() => panel.remove(), 300);
    }
}
