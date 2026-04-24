/* ==========================================
   WAY-HISTORY.JS - OSM Way History Service
   Asfalt Premium
   ==========================================

   Fetches the full history of an OSM way and finds the exact version
   where the 'smoothness' tag was last added or changed.

   Public API:
     WayHistoryService.getSmoothnessChangeDate(wayId)
       → Promise<{ date: Date, user: string } | null>

     WayHistoryService.invalidate(wayId)
       → void  (clears cache entry, e.g. after a save)
   ========================================== */

const WayHistoryService = (() => {
    const OSM_API_BASE = 'https://api.openstreetmap.org';

    // Cache: Map<wayId, Promise<result>>
    // We cache the promise itself (not the resolved value) to avoid
    // duplicate in-flight requests when the user clicks a road twice quickly.
    const _cache = new Map();

    /* ─────────────────────────────────────────
       PUBLIC API
    ───────────────────────────────────────── */

    /**
     * Get the date and user of the last smoothness tag change for a way.
     * Results are cached in memory for the duration of the session.
     *
     * @param {number|string} wayId - OSM way ID
     * @returns {Promise<{date: Date, user: string}|null>}
     *   Resolves to an object with `date` and `user`, or null if:
     *   - the way has no smoothness tag in any version
     *   - the API request fails
     */
    function getSmoothnessChangeDate(wayId) {
        const key = String(wayId);

        if (_cache.has(key)) {
            return _cache.get(key);
        }

        const promise = _fetchSmoothnessChangeDate(key);
        _cache.set(key, promise);

        // On error, remove from cache so a retry is possible later
        promise.catch(() => _cache.delete(key));

        return promise;
    }

    /**
     * Invalidate the cached result for a way (e.g. after saving new smoothness).
     * @param {number|string} wayId
     */
    function invalidate(wayId) {
        _cache.delete(String(wayId));
    }

    /* ─────────────────────────────────────────
       PRIVATE
    ───────────────────────────────────────── */

    async function _fetchSmoothnessChangeDate(wayId) {
        const url = `${OSM_API_BASE}/api/0.6/way/${wayId}/history.json`;

        let versions;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.warn(`WayHistoryService: HTTP ${response.status} for way ${wayId}`);
                return null;
            }

            const data = await response.json();
            versions = data.elements;
        } catch (err) {
            console.warn(`WayHistoryService: fetch failed for way ${wayId}:`, err.message);
            return null;
        }

        if (!versions || versions.length === 0) {
            return null;
        }

        return _findSmoothnessChangeVersion(versions);
    }

    /**
     * Iterate versions from newest to oldest and find the first version
     * where the 'smoothness' tag value differs from the next newer version.
     * That "first different" version is when the current smoothness was set.
     *
     * @param {Array} versions - Array of OSM element versions (oldest first)
     * @returns {{ date: Date, user: string } | null}
     */
    function _findSmoothnessChangeVersion(versions) {
        // versions are sorted oldest→newest by the API; we walk newest→oldest
        for (let i = versions.length - 1; i >= 0; i--) {
            const current = versions[i];
            const prev    = versions[i - 1]; // undefined when i === 0

            const currentSmoothness = current.tags && current.tags.smoothness;
            const prevSmoothness    = prev    && prev.tags && prev.tags.smoothness;

            // If smoothness exists in this version AND it differs from the
            // previous version (or there was no previous), this is the version
            // that introduced the current smoothness value.
            if (currentSmoothness && currentSmoothness !== prevSmoothness) {
                return {
                    date: new Date(current.timestamp),
                    user: current.user || 'nieznany'
                };
            }
        }

        // smoothness never changed (or is absent from all versions)
        return null;
    }

    /* ─────────────────────────────────────────
       EXPORT
    ───────────────────────────────────────── */
    return { getSmoothnessChangeDate, invalidate };
})();
