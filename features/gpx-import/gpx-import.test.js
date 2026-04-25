import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window } from 'happy-dom';
import fs from 'fs';
import path from 'path';

const gpxImporterSrc = fs.readFileSync(path.resolve(__dirname, 'gpx-import.js'), 'utf-8');

describe('GpxImporter', () => {
    let window;
    let document;
    let mapManagerMock;

    beforeEach(() => {
        // Setup DOM
        window = new Window();
        document = window.document;

        eval(gpxImporterSrc + '\nwindow.GpxImporter = GpxImporter;');

        // Bazowe elementy UI
        document.body.innerHTML += `
            <button id="import-gpx-btn"></button>
            <button id="remove-gpx-btn"></button>
            <input type="file" id="gpx-file-input" />
            <label id="load-gpx-roads-label">
                <input type="checkbox" id="load-gpx-roads-checkbox" />
            </label>
        `;

        global.document = document;
        global.window = window;
        global.GpxImporter = window.GpxImporter;
        global.DOMParser = window.DOMParser;
        global.FileReader = window.FileReader;

        global.window.asphaltApp = {
            showMessage: vi.fn()
        };

        const gpxLayerMock = {
            getBounds: vi.fn().mockReturnValue('mock-bounds')
        };

        global.L = {
            polyline: vi.fn().mockReturnValue({
                addTo: vi.fn().mockReturnValue(gpxLayerMock)
            })
        };

        mapManagerMock = {
            map: {
                fitBounds: vi.fn(),
                removeLayer: vi.fn()
            }
        };
    });

    // ─── Istniejące testy ────────────────────────────────────────────────────

    it('Inicjalizuje obiekt prawidłowo i podłącza event listenery', () => {
        const importer = new global.GpxImporter(mapManagerMock);
        expect(importer.importBtn).not.toBeNull();
        expect(importer.gpxLayer).toBeNull();
    });

    it('Usunięcie trasy powoduje wywołanie z warstwy oraz zmiany UI', () => {
        const importer = new global.GpxImporter(mapManagerMock);

        importer.gpxLayer = 'some_layer_ref';
        importer.removeGpxTrace();

        expect(mapManagerMock.map.removeLayer).toHaveBeenCalledWith('some_layer_ref');
        expect(importer.gpxLayer).toBeNull();
        expect(importer.importBtn.style.display).toBe('inline-flex');
        expect(importer.removeBtn.style.display).toBe('none');
    });

    it('Konwertuje poprawny GPX (trz) do Polyline i dodaje do mapy', () => {
        const importer = new global.GpxImporter(mapManagerMock);

        const rawGpx = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="52.0" lon="21.0"></trkpt>
              <trkpt lat="52.1" lon="21.1"></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        importer.parseAndDrawGpx(rawGpx);

        expect(global.L.polyline).toHaveBeenCalled();
        expect(mapManagerMock.map.fitBounds).toHaveBeenCalledWith('mock-bounds', { padding: [50, 50] });
        expect(importer.importBtn.style.display).toBe('none');
        expect(importer.removeBtn.style.display).toBe('inline-flex');
        expect(global.window.asphaltApp.showMessage).toHaveBeenCalledWith(
            "Pomocniczy ślad GPX został pomyślnie załadowany.", "success"
        );
    });

    it('Wyrzuca powiadomienie warning gdy GPX jest poprawny składniowo (XML) ale brakuje znaczników', () => {
        const importer = new global.GpxImporter(mapManagerMock);

        const rawGpx = `<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>`;
        importer.parseAndDrawGpx(rawGpx);

        expect(global.window.asphaltApp.showMessage).toHaveBeenCalledWith(
            expect.stringContaining("Nie znaleziono żadnych punktów"), "warning"
        );
    });

    it('Obsługuje FileReader event przy wrzuceniu pliku', () => {
        const importer = new global.GpxImporter(mapManagerMock);

        const file = new window.File(['<gpx></gpx>'], 'test.gpx', { type: 'text/xml' });
        importer.parseAndDrawGpx = vi.fn();
        importer.handleFile(file);

        return new Promise(resolve => setTimeout(() => {
            expect(importer.parseAndDrawGpx).toHaveBeenCalled();
            expect(importer.fileInput.value).toBe('');
            resolve();
        }, 50));
    });

    // ─── Nowe testy: computeBBox ─────────────────────────────────────────────

    describe('computeBBox()', () => {
        it('Oblicza prawidłowy bbox dla jednego segmentu', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const polylinesData = [
                [[52.0, 21.0], [52.5, 21.8], [52.2, 21.3]]
            ];
            const margin = 0;
            const bbox = importer.computeBBox(polylinesData, margin);

            // [west, south, east, north]
            expect(bbox[0]).toBeCloseTo(21.0); // west (minLon)
            expect(bbox[1]).toBeCloseTo(52.0); // south (minLat)
            expect(bbox[2]).toBeCloseTo(21.8); // east (maxLon)
            expect(bbox[3]).toBeCloseTo(52.5); // north (maxLat)
        });

        it('Oblicza prawidłowy bbox dla wielu segmentów', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const polylinesData = [
                [[51.0, 20.0], [51.5, 20.5]],
                [[53.0, 22.0], [52.0, 21.0]]
            ];
            const bbox = importer.computeBBox(polylinesData, 0);

            expect(bbox[0]).toBeCloseTo(20.0); // west
            expect(bbox[1]).toBeCloseTo(51.0); // south
            expect(bbox[2]).toBeCloseTo(22.0); // east
            expect(bbox[3]).toBeCloseTo(53.0); // north
        });

        it('Dodaje margines do wszystkich stron bbox', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const polylinesData = [[[52.0, 21.0], [52.1, 21.1]]];
            const margin = 0.01;
            const bbox = importer.computeBBox(polylinesData, margin);

            expect(bbox[0]).toBeCloseTo(21.0 - margin); // west
            expect(bbox[1]).toBeCloseTo(52.0 - margin); // south
            expect(bbox[2]).toBeCloseTo(21.1 + margin); // east
            expect(bbox[3]).toBeCloseTo(52.1 + margin); // north
        });

        it('Używa domyślnego marginesu BBOX_MARGIN_DEG gdy nie podano', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const polylinesData = [[[52.0, 21.0], [52.1, 21.1]]];
            const bbox = importer.computeBBox(polylinesData);

            const m = importer.BBOX_MARGIN_DEG;
            expect(bbox[0]).toBeCloseTo(21.0 - m);
            expect(bbox[1]).toBeCloseTo(52.0 - m);
            expect(bbox[2]).toBeCloseTo(21.1 + m);
            expect(bbox[3]).toBeCloseTo(52.1 + m);
        });

        it('Obsługuje ślad z jednym punktem', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const polylinesData = [[[52.0, 21.0]]];
            const bbox = importer.computeBBox(polylinesData, 0);

            expect(bbox[0]).toBeCloseTo(21.0);
            expect(bbox[1]).toBeCloseTo(52.0);
            expect(bbox[2]).toBeCloseTo(21.0);
            expect(bbox[3]).toBeCloseTo(52.0);
        });
    });

    // ─── Nowe testy: loadRoadsForTrace ───────────────────────────────────────

    describe('loadRoadsForTrace()', () => {
        const samplePolylines = [[[52.0, 21.0], [52.1, 21.1]]];
        const sampleGeoJson = {
            type: 'FeatureCollection',
            features: [{ type: 'Feature' }, { type: 'Feature' }]
        };

        it('Wywołuje fetchRoadsInBBox z prawidłowym bbox', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const overpassMock = { fetchRoadsInBBox: vi.fn().mockResolvedValue(sampleGeoJson) };
            const displayMock = vi.fn();
            importer.setOverpassClient(overpassMock, displayMock);

            await importer.loadRoadsForTrace(samplePolylines);

            expect(overpassMock.fetchRoadsInBBox).toHaveBeenCalledTimes(1);
            const bbox = overpassMock.fetchRoadsInBBox.mock.calls[0][0];
            // bbox powinien być tablicą 4 liczb [west, south, east, north]
            expect(bbox).toHaveLength(4);
            expect(bbox[1]).toBeLessThan(52.0); // south < minLat (margines ujemny)
            expect(bbox[3]).toBeGreaterThan(52.1); // north > maxLat
        });

        it('Wywołuje displayRoadsCallback gdy Overpass zwróci dane', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const overpassMock = { fetchRoadsInBBox: vi.fn().mockResolvedValue(sampleGeoJson) };
            const displayMock = vi.fn();
            importer.setOverpassClient(overpassMock, displayMock);

            await importer.loadRoadsForTrace(samplePolylines);

            expect(displayMock).toHaveBeenCalledWith(sampleGeoJson);
        });

        it('Pokazuje success toast z liczbą dróg', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const overpassMock = { fetchRoadsInBBox: vi.fn().mockResolvedValue(sampleGeoJson) };
            importer.setOverpassClient(overpassMock, vi.fn());

            await importer.loadRoadsForTrace(samplePolylines);

            expect(global.window.asphaltApp.showMessage).toHaveBeenCalledWith(
                expect.stringContaining('2'), 'success'
            );
        });

        it('Pokazuje warning gdy Overpass zwróci puste features', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const emptyGeoJson = { type: 'FeatureCollection', features: [] };
            const overpassMock = { fetchRoadsInBBox: vi.fn().mockResolvedValue(emptyGeoJson) };
            const displayMock = vi.fn();
            importer.setOverpassClient(overpassMock, displayMock);

            await importer.loadRoadsForTrace(samplePolylines);

            expect(displayMock).not.toHaveBeenCalled();
            expect(global.window.asphaltApp.showMessage).toHaveBeenCalledWith(
                expect.stringContaining('Nie znaleziono dróg'), 'warning'
            );
        });

        it('Pokazuje error toast i nie wywołuje displayRoads gdy Overpass rzuci błąd', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            const overpassMock = { fetchRoadsInBBox: vi.fn().mockRejectedValue(new Error('network error')) };
            const displayMock = vi.fn();
            importer.setOverpassClient(overpassMock, displayMock);

            await importer.loadRoadsForTrace(samplePolylines);

            expect(displayMock).not.toHaveBeenCalled();
            expect(global.window.asphaltApp.showMessage).toHaveBeenCalledWith(
                expect.stringContaining('Błąd'), 'error'
            );
        });

        it('Nie wywołuje Overpass gdy setOverpassClient nie był wywołany', async () => {
            const importer = new global.GpxImporter(mapManagerMock);
            // overpass i callback są null — nie powinno rzucić wyjątku
            await expect(importer.loadRoadsForTrace(samplePolylines)).resolves.toBeUndefined();
        });
    });

    // ─── Nowe testy: checkbox a wywołanie loadRoadsForTrace ─────────────────

    describe('parseAndDrawGpx() — integracja z checkboxem', () => {
        const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk><trkseg>
            <trkpt lat="52.0" lon="21.0"></trkpt>
            <trkpt lat="52.1" lon="21.1"></trkpt>
          </trkseg></trk>
        </gpx>`;

        it('NIE wywołuje loadRoadsForTrace gdy checkbox jest odznaczony', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            importer.loadRoadsForTrace = vi.fn();
            importer.loadRoadsCheckbox.checked = false;

            importer.parseAndDrawGpx(validGpx);

            expect(importer.loadRoadsForTrace).not.toHaveBeenCalled();
        });

        it('Wywołuje loadRoadsForTrace gdy checkbox jest zaznaczony', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            importer.loadRoadsForTrace = vi.fn();
            importer.loadRoadsCheckbox.checked = true;

            importer.parseAndDrawGpx(validGpx);

            expect(importer.loadRoadsForTrace).toHaveBeenCalledTimes(1);
        });

        it('Chowa label checkboxa po wczytaniu śladu', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            importer.loadRoadsForTrace = vi.fn();

            importer.parseAndDrawGpx(validGpx);

            expect(importer.loadRoadsLabel.style.display).toBe('none');
        });

        it('Przywraca widoczność labela po usunięciu śladu', () => {
            const importer = new global.GpxImporter(mapManagerMock);
            importer.loadRoadsForTrace = vi.fn();

            importer.parseAndDrawGpx(validGpx);
            importer.gpxLayer = 'mock';
            importer.removeGpxTrace();

            expect(importer.loadRoadsLabel.style.display).toBe('flex');
        });
    });
});
