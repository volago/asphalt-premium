/**
 * map.test.js – testy jednostkowe dla MapManager.updateRoadLocally / updateRoadSurfaceLocally
 *
 * Bug #5: Jeśli użytkownik szybko przełączy drogę ZANIM zakończy się async _doSave,
 * this.selectedRoads już wskazuje na inną drogę.  updateRoadLocally() szuka wayId
 * w this.selectedRoads i nie może go znaleźć → return bez aktualizacji → zmiana nie
 * jest odzwierciedlona na mapie (choć API OSM zapisało poprawnie).
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

// ────────────────────────────────────────────────────────────
//  Minimalne stuby wymagane przez map.js
// ────────────────────────────────────────────────────────────
globalThis.L = {
    map: () => ({ on: () => {}, getZoom: () => 14, getBounds: () => ({}) }),
    tileLayer: () => ({ addTo: () => {} }),
    featureGroup: () => ({ addTo: () => {}, clearLayers: () => {}, eachLayer: () => {} }),
    control: () => ({ addTo: () => {} }),
    polyline: () => ({
        on: () => {},
        bindTooltip: () => {},
        setStyle: () => {},
        bringToFront: () => {},
        closeTooltip: () => {},
        unbindTooltip: () => {},
        getLatLngs: () => [[0, 0], [1, 1]],
    }),
    layerGroup: () => ({ addTo: () => {} }),
    circleMarker: () => ({ addTo: () => {}, bindTooltip: () => {} }),
    DomUtil: { create: () => ({ style: {}, innerHTML: '' }) },
    DomEvent: { disableClickPropagation: () => {}, on: () => {}, stopPropagation: () => {} },
    Control: { extend: (obj) => function() { return obj; } },
};
globalThis.CONFIG = {
    MAP: { DEFAULT_CENTER: [0, 0], DEFAULT_ZOOM: 12, MIN_ZOOM: 5, MAX_ZOOM: 19, TILE_LAYER: '', ATTRIBUTION: '' },
    ROAD_STYLES: {
        excellent:  { color: '#00ff00', weight: 3, opacity: 0.8, dashArray: null },
        good:       { color: '#88ff00', weight: 3, opacity: 0.8, dashArray: null },
        intermediate: { color: '#ffa500', weight: 3, opacity: 0.8, dashArray: null },
        poor:       { color: '#ff0000', weight: 3, opacity: 0.8, dashArray: null },
        unknown:    { color: '#0000ff', weight: 3, opacity: 0.8, dashArray: null },
        no_surface: { color: '#aaaaaa', weight: 3, opacity: 0.5, dashArray: '5,5' },
    },
    SMOOTHNESS_MAPPING: {
        excellent: 'excellent',
        good: 'good',
        intermediate: 'intermediate',
        bad: 'poor',
        very_bad: 'poor',
    },
    VOIVODESHIPS: {},
    SMOOTHNESS_OPTIONS: [],
};
globalThis.Toast = { show: () => {} };
globalThis.TipPanel = { show: () => {}, dismiss: () => {} };
globalThis.WayHistoryService = undefined;
globalThis.SmoothnessEditor = { render: () => '', renderActions: () => '', init: () => {} };
globalThis.SurfaceEditor = { render: () => '', renderActions: () => '', init: () => {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const require = createRequire(import.meta.url);
const { MapManager } = require('./map.js');

// ────────────────────────────────────────────────────────────
//  Pomocnik: tworzy minimalny road-obiekt (jak w roadsLayer)
// ────────────────────────────────────────────────────────────
function makeRoad(osmId, smoothness = 'good', surface = 'asphalt') {
    const visibleLine = { setStyle: vi.fn(), bringToFront: vi.fn() };
    const clickableLine = { closeTooltip: vi.fn(), unbindTooltip: vi.fn(), bindTooltip: vi.fn() };
    return {
        feature: { properties: { osm_id: osmId, smoothness, surface, name: `Droga ${osmId}` } },
        styleType: 'good',
        _visibleLine: visibleLine,
        _clickableLine: clickableLine,
    };
}

/**
 * Tworzy instancję MapManager z ominięciem inicjalizacji Leaflet.
 * Bezpośrednio ustawia selectedRoads i roadsLayer.
 */
function makeManager() {
    const mgr = new MapManager();
    mgr.selectedRoads = [];
    mgr.selectedRoadMarkers = [];
    mgr.map = null;
    return mgr;
}

// ────────────────────────────────────────────────────────────
describe('MapManager.updateRoadLocally', () => {

    it('aktualizuje smoothness drogi gdy jest ona nadal w selectedRoads', () => {
        const mgr = makeManager();
        const road = makeRoad(42, 'good');
        mgr.selectedRoads = [road];

        mgr.updateRoadLocally(42, 'excellent', false);

        expect(road.feature.properties.smoothness).toBe('excellent');
        expect(road.styleType).toBe('excellent');
    });

});

describe('MapManager.updateRoadSurfaceLocally', () => {

    it('aktualizuje surface drogi gdy jest ona nadal w selectedRoads', () => {
        const mgr = makeManager();
        const road = makeRoad(10, null, null);
        mgr.selectedRoads = [road];

        mgr.updateRoadSurfaceLocally(10, 'asphalt', false);

        expect(road.feature.properties.surface).toBe('asphalt');
        expect(road.styleType).toBe('unknown'); // surface ustawiona, brak smoothness → unknown
    });


});

// ────────────────────────────────────────────────────────────
describe('MapManager – mobile multi-select (issue #9)', () => {

    it('isMobileViewport() zwraca true gdy innerWidth <= 768', () => {
        const mgr = makeManager();

        // Simulate mobile viewport
        const original = globalThis.window;
        globalThis.window = { innerWidth: 768 };
        expect(mgr.isMobileViewport()).toBe(true);

        globalThis.window = { innerWidth: 375 };
        expect(mgr.isMobileViewport()).toBe(true);

        // Simulate desktop viewport
        globalThis.window = { innerWidth: 1024 };
        expect(mgr.isMobileViewport()).toBe(false);

        globalThis.window = original;
    });

    it('na mobile selectRoad dodaje drogę do zaznaczenia (tryb addytywny)', () => {
        const mgr = makeManager();
        const roadA = makeRoad(1, 'good');
        const roadB = makeRoad(2, 'good');

        // Stub isMobileViewport to return true
        mgr.isMobileViewport = () => true;

        // Stub map-dependent methods
        mgr.map = { removeLayer: vi.fn(), addControl: vi.fn(), removeControl: vi.fn() };
        mgr.removeEndpointMarkers = vi.fn();
        mgr.addEndpointMarkers = vi.fn();
        mgr.showRoadInfo = vi.fn();

        // Stub document.getElementById for deselect button update
        const origGetById = globalThis.document?.getElementById;
        globalThis.document = { getElementById: () => null };

        // First click – selects road A
        mgr.selectRoad(roadA, { originalEvent: {} });
        expect(mgr.selectedRoads).toContain(roadA);
        expect(mgr.selectedRoads.length).toBe(1);

        // Second click – adds road B (additive, no Ctrl needed)
        mgr.selectRoad(roadB, { originalEvent: {} });
        expect(mgr.selectedRoads).toContain(roadA);
        expect(mgr.selectedRoads).toContain(roadB);
        expect(mgr.selectedRoads.length).toBe(2);

        // Restore
        if (origGetById) globalThis.document.getElementById = origGetById;
    });

    it('na mobile ponowne kliknięcie odznacza drogę (toggle)', () => {
        const mgr = makeManager();
        const roadA = makeRoad(1, 'good');

        mgr.isMobileViewport = () => true;
        mgr.map = { removeLayer: vi.fn(), addControl: vi.fn(), removeControl: vi.fn() };
        mgr.removeEndpointMarkers = vi.fn();
        mgr.addEndpointMarkers = vi.fn();
        mgr.showRoadInfo = vi.fn();
        mgr.hideRoadInfo = vi.fn();
        globalThis.document = { getElementById: () => null };

        // Select road A
        mgr.selectRoad(roadA, { originalEvent: {} });
        expect(mgr.selectedRoads.length).toBe(1);

        // Click road A again – should deselect
        mgr.selectRoad(roadA, { originalEvent: {} });
        expect(mgr.selectedRoads.length).toBe(0);
    });

    it('na desktop bez Ctrl selectRoad nadal działa jako single-select', () => {
        const mgr = makeManager();
        const roadA = makeRoad(1, 'good');
        const roadB = makeRoad(2, 'good');

        // Desktop viewport
        mgr.isMobileViewport = () => false;
        mgr.map = { removeLayer: vi.fn(), addControl: vi.fn(), removeControl: vi.fn() };
        mgr.removeEndpointMarkers = vi.fn();
        mgr.addEndpointMarkers = vi.fn();
        mgr.showRoadInfo = vi.fn();
        mgr.hideRoadInfo = vi.fn();
        globalThis.document = { getElementById: () => null };

        // Select road A (no Ctrl)
        mgr.selectRoad(roadA, { originalEvent: {} });
        expect(mgr.selectedRoads).toEqual([roadA]);

        // Click road B without Ctrl – should replace, not add
        mgr.selectRoad(roadB, { originalEvent: {} });
        expect(mgr.selectedRoads).toEqual([roadB]);
    });
});
