import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Stubujemy globalne zależności SmoothnessEditor (CONFIG, Toast, ConfirmationModal).
// Ustawiamy je PRZED require(), żeby były dostępne w momencie wykonania pliku.
globalThis.CONFIG       = { SMOOTHNESS_OPTIONS: [] };  // potrzebne tylko do render/getLabel
globalThis.Toast        = { show: () => {} };
globalThis.ConfirmationModal = { show: async () => true };
globalThis.document     = {
    getElementById:   () => null,
    querySelectorAll: () => ({ forEach: () => {} }),
    addEventListener: () => {},
};

const require = createRequire(import.meta.url);
const { SmoothnessEditor } = require('./smoothness-editor.js');

// ──────────────────────────────────────────────
// Pomocnik: buduje obiekt road taki jak selectedRoads w MapManager
// ──────────────────────────────────────────────
function makeRoad(osmId, smoothness) {
    return {
        feature: {
            properties: { osm_id: osmId, smoothness }
        }
    };
}

// ──────────────────────────────────────────────
describe('SmoothnessEditor.filterRoadsToUpdate', () => {

    it('gdy 5 odcinków wybrano, a 2 już mają "excellent" → do changeset trafiają tylko 3', () => {
        const roads = [
            makeRoad(1, 'excellent'),   // już excellent — pomiń
            makeRoad(2, 'good'),        // zmiana
            makeRoad(3, 'excellent'),   // już excellent — pomiń
            makeRoad(4, 'bad'),         // zmiana
            makeRoad(5, undefined),     // brak tagu — zmiana
        ];

        const { toUpdate, unchangedIds } = SmoothnessEditor.filterRoadsToUpdate(roads, 'excellent');

        expect(toUpdate).toHaveLength(3);
        expect(unchangedIds).toHaveLength(2);

        // Do changeset idą ID: 2, 4, 5
        expect(toUpdate.map(r => r.id)).toEqual([2, 4, 5]);

        // Pominięte to ID: 1, 3
        expect(unchangedIds).toEqual([1, 3]);
    });

    it('gdy wszystkie odcinki już mają wybraną wartość → toUpdate jest puste', () => {
        const roads = [
            makeRoad(10, 'good'),
            makeRoad(11, 'good'),
        ];

        const { toUpdate, unchangedIds } = SmoothnessEditor.filterRoadsToUpdate(roads, 'good');

        expect(toUpdate).toHaveLength(0);
        expect(unchangedIds).toHaveLength(2);
    });

    it('gdy żaden odcinek nie ma wybranej wartości → wszystkie trafiają do changeset', () => {
        const roads = [
            makeRoad(20, 'bad'),
            makeRoad(21, 'intermediate'),
            makeRoad(22, undefined),
        ];

        const { toUpdate, unchangedIds } = SmoothnessEditor.filterRoadsToUpdate(roads, 'excellent');

        expect(toUpdate).toHaveLength(3);
        expect(unchangedIds).toHaveLength(0);
    });

    it('zachowuje stare wartości w toUpdate (potrzebne do wyświetlenia w dialogu)', () => {
        const roads = [makeRoad(99, 'bad')];

        const { toUpdate } = SmoothnessEditor.filterRoadsToUpdate(roads, 'excellent');

        expect(toUpdate[0]).toMatchObject({ id: 99, oldValue: 'bad' });
    });
});
