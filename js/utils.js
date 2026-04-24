/* ==========================================
   UTILS.JS - Shared utility functions
   Asfalt Premium
   ========================================== */

const Utils = (() => {

    /**
     * Format a Date object as Polish long date, e.g. "14 marca 2023".
     * @param {Date} date
     * @returns {string}
     */
    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return { formatDate };
})();
