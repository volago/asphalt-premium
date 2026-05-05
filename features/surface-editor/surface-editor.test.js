import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Stubujemy globalne zależności SurfaceEditor (CONFIG, Toast, ConfirmationModal).
globalThis.CONFIG       = { SURFACE_OPTIONS: [] }; 
globalThis.Toast        = { show: () => {} };
globalThis.ConfirmationModal = { show: async () => true };
globalThis.document     = {
    getElementById:   () => null,
    querySelectorAll: () => ({ forEach: () => {} }),
    addEventListener: () => {},
};

const require = createRequire(import.meta.url);
const { SurfaceEditor } = require('./surface-editor.js');

// ──────────────────────────────────────────────
// Pomocnik: buduje obiekt road taki jak selectedRoads w MapManager
// ──────────────────────────────────────────────
function makeRoad(osmId, surface) {
    return {
        feature: {
            properties: { osm_id: osmId, surface }
        }
    };
}

describe('SurfaceEditor.filterRoadsToUpdate', () => {

    it('gdy 3 odcinki wybrano, a 1 już ma "asphalt" → do changeset trafiają 2', () => {
        const roads = [
            makeRoad(1, 'asphalt'),     // już asphalt — pomiń
            makeRoad(2, undefined),     // brak tagu — zmiana
            makeRoad(3, null),          // brak tagu — zmiana
        ];

        const { toUpdate, unchangedIds } = SurfaceEditor.filterRoadsToUpdate(roads, 'asphalt');

        expect(toUpdate).toHaveLength(2);
        expect(unchangedIds).toHaveLength(1);

        // Do changeset idą ID: 2, 3
        expect(toUpdate.map(r => r.id)).toEqual([2, 3]);

        // Pominięte to ID: 1
        expect(unchangedIds).toEqual([1]);
    });

    it('gdy wszystkie odcinki już mają wybraną wartość → toUpdate jest puste', () => {
        const roads = [
            makeRoad(10, 'asphalt'),
            makeRoad(11, 'asphalt'),
        ];

        const { toUpdate, unchangedIds } = SurfaceEditor.filterRoadsToUpdate(roads, 'asphalt');

        expect(toUpdate).toHaveLength(0);
        expect(unchangedIds).toHaveLength(2);
    });

    it('gdy żaden odcinek nie ma wybranej wartości → wszystkie trafiają do changeset', () => {
        const roads = [
            makeRoad(20, undefined),
            makeRoad(21, null),
        ];

        const { toUpdate, unchangedIds } = SurfaceEditor.filterRoadsToUpdate(roads, 'asphalt');

        expect(toUpdate).toHaveLength(2);
        expect(unchangedIds).toHaveLength(0);
    });

    it('zachowuje stare wartości w toUpdate (potrzebne do wyświetlenia w dialogu)', () => {
        const roads = [makeRoad(99, undefined), makeRoad(100, 'gravel')];

        const { toUpdate } = SurfaceEditor.filterRoadsToUpdate(roads, 'asphalt');

        expect(toUpdate[0]).toMatchObject({ id: 99, oldValue: undefined });
        expect(toUpdate[1]).toMatchObject({ id: 100, oldValue: 'gravel' });
    });
});
