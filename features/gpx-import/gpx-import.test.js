import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window } from 'happy-dom';
import fs from 'fs';
import path from 'path';

// Pobierz JS source żeby wywołać go w kontekście po załadowaniu
const gpxImporterSrc = fs.readFileSync(path.resolve(__dirname, 'gpx-import.js'), 'utf-8');

describe('GpxImporter', () => {
    let window;
    let document;
    let mapManagerMock;

    beforeEach(() => {
        // Setup DOM
        window = new Window();
        document = window.document;
        
        // Eval w kontekście z dostępem do window pozwoli na synchroniczną inicjalizację klasy GpxImporter
        eval(gpxImporterSrc + '\nwindow.GpxImporter = GpxImporter;');

        // Dodaj buttony na stronie dla testów
        document.body.innerHTML += `
            <button id="import-gpx-btn"></button>
            <button id="remove-gpx-btn"></button>
            <input type="file" id="gpx-file-input" />
        `;

        // Mocki obiektów globalnych dla DOM
        global.document = document;
        global.window = window;

        // Przypnij "GpxImporter" do lokalnego scope by wywołać
        global.GpxImporter = window.GpxImporter;
        
        // Mockowanie DOMParser
        global.DOMParser = window.DOMParser;
        global.FileReader = window.FileReader;

        // Zmockuj window.asphaltApp i leafleta L
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

    it('Inicjalizuje obiekt prawidłowo i podłącza event listenery', () => {
        const importer = new global.GpxImporter(mapManagerMock);
        expect(importer.importBtn).not.toBeNull();
        expect(importer.gpxLayer).toBeNull();
    });

    it('Usunięcie trasy powoduje wywołanie z warstwy oraz zmiany UI', () => {
        const importer = new global.GpxImporter(mapManagerMock);
        
        // Symulacja, że coś już jest przypisane
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
        
        // Symulacja pliku GPX
        const file = new window.File(['<gpx></gpx>'], 'test.gpx', { type: 'text/xml' });
        
        // Mock parseAndDrawGpx poniewaz File Reader testujemy async
        importer.parseAndDrawGpx = vi.fn();
        
        // Wywołaj handlera manualnie (zasymuluj onLoad)
        importer.handleFile(file);
        
        // W DOM/happy-dom musimy poczekać tick żeby reader odpalił, aczkolwiek w happy-dom może być też od razu
        // Hacky setTimeout:
        return new Promise(resolve => setTimeout(() => {
            expect(importer.parseAndDrawGpx).toHaveBeenCalled();
            expect(importer.fileInput.value).toBe('');
            resolve();
        }, 50));
    });
});
