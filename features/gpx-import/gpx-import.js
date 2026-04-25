/**
 * GPX Importer Module
 * Obsługa ładowania i wyświetlania plików GPX na mapie jako nienaklikalnej warstwy pomocniczej.
 * Opcjonalnie pobiera drogi w obszarze śladu przez Overpass API.
 */

class GpxImporter {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.gpxLayer = null;
        this.map = mapManager.map;

        // Zewnętrzne zależności (ustawiane przez setOverpassClient)
        this.overpass = null;
        this.displayRoadsCallback = null;

        // Elementy UI
        this.importBtn = document.getElementById('import-gpx-btn');
        this.removeBtn = document.getElementById('remove-gpx-btn');
        this.fileInput = document.getElementById('gpx-file-input');
        this.loadRoadsCheckbox = document.getElementById('load-gpx-roads-checkbox');
        this.loadRoadsLabel = document.getElementById('load-gpx-roads-label');

        // Stałe konfiguracyjne dla śladu GPX
        this.GPX_STYLE = {
            color: '#000000',      // Czarny pas
            weight: 12,            // 3-4 razy szerszy niż standardowa droga (np. 3-4px)
            opacity: 0.3,          // Wysoka przezroczystość
            interactive: false,    // Brak możliwości kliknięcia śladu GPX, nie przykrywa odcinków dróg
            lineCap: 'round',
            lineJoin: 'round'
        };

        // Margines dodawany do bbox śladu GPX przy pobieraniu dróg (w stopniach)
        this.BBOX_MARGIN_DEG = 0.005;

        this.initEvents();
    }

    /**
     * Ustawia klienta Overpass i callback do wyświetlania dróg.
     * Wywoływane przez app.js po inicjalizacji wszystkich komponentów.
     * @param {OverpassAPI} overpass - instancja OverpassAPI
     * @param {Function} displayRoadsCallback - callback(geoJsonData) wyświetlający drogi na mapie
     */
    setOverpassClient(overpass, displayRoadsCallback) {
        this.overpass = overpass;
        this.displayRoadsCallback = displayRoadsCallback;
    }

    initEvents() {
        if (!this.importBtn || !this.removeBtn || !this.fileInput) {
            console.warn('Brak wymaganych elementów HTML dla GpxImporter.');
            return;
        }

        this.importBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        this.removeBtn.addEventListener('click', () => {
            this.removeGpxTrace();
        });
    }

    handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseAndDrawGpx(e.target.result);
                // Wyczyść input, by ponowny wybór tego samego pliku znów uruchomił "change"
                this.fileInput.value = '';
            } catch (error) {
                console.error("Błąd podczas odczytu pliku GPX:", error);
                if (window.asphaltApp && window.asphaltApp.showMessage) {
                    window.asphaltApp.showMessage("Błędny plik GPX lub problem z jego parsowaniem.", "error");
                }
            }
        };
        reader.readAsText(file);
    }

    parseAndDrawGpx(gpxText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, "text/xml");

        // Sprawdź czy to na pewno poprawne XML
        const parseError = xmlDoc.getElementsByTagName("parseerror");
        if (parseError.length > 0) {
            throw new Error("Błąd parsowania pliku XML/GPX.");
        }

        // Zbierz segmenty: obsługujemy tracki lub routy (trkpt, rtept)
        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        const rtepts = xmlDoc.getElementsByTagName("rtept");

        let targetPts = trkpts.length > 0 ? trkpts : rtepts;

        if (targetPts.length === 0) {
            if (window.asphaltApp && window.asphaltApp.showMessage) {
                window.asphaltApp.showMessage("Nie znaleziono żadnych punktów śladu (trkpt lub rtept) w pilku GPX.", "warning");
            }
            return;
        }

        const polylinesData = [];
        const trksegs = xmlDoc.getElementsByTagName("trkseg");

        if (trksegs.length > 0) {
            for (let i = 0; i < trksegs.length; i++) {
                const segPts = trksegs[i].getElementsByTagName("trkpt");
                const currentSegment = [];
                for (let j = 0; j < segPts.length; j++) {
                    const lat = parseFloat(segPts[j].getAttribute("lat"));
                    const lon = parseFloat(segPts[j].getAttribute("lon"));
                    if (!isNaN(lat) && !isNaN(lon)) {
                        currentSegment.push([lat, lon]);
                    }
                }
                if (currentSegment.length > 0) {
                    polylinesData.push(currentSegment);
                }
            }
        } else {
            // Może to route (rtept) albo tylko luźne trkpt
            const currentSegment = [];
            for (let i = 0; i < targetPts.length; i++) {
                const lat = parseFloat(targetPts[i].getAttribute("lat"));
                const lon = parseFloat(targetPts[i].getAttribute("lon"));
                if (!isNaN(lat) && !isNaN(lon)) {
                    currentSegment.push([lat, lon]);
                }
            }
            if (currentSegment.length > 0) polylinesData.push(currentSegment);
        }

        if (polylinesData.length === 0) return;

        this.removeGpxTrace();

        // Rysuj linię na mapie
        this.gpxLayer = L.polyline(polylinesData, this.GPX_STYLE).addTo(this.map);

        // Dopasuj widok do śladu
        this.map.fitBounds(this.gpxLayer.getBounds(), { padding: [50, 50] });

        // Aktualizuj przyciski UI
        this.importBtn.style.display = 'none';
        if (this.loadRoadsLabel) this.loadRoadsLabel.style.display = 'none';
        this.removeBtn.style.display = 'inline-flex';

        if (window.asphaltApp && window.asphaltApp.showMessage) {
            window.asphaltApp.showMessage("Pomocniczy ślad GPX został pomyślnie załadowany.", "success");
        }

        // Opcjonalne ładowanie dróg w obszarze śladu
        const shouldLoadRoads = this.loadRoadsCheckbox && this.loadRoadsCheckbox.checked;
        if (shouldLoadRoads) {
            this.loadRoadsForTrace(polylinesData);
        }
    }

    /**
     * Oblicza bounding box obejmujący wszystkie punkty śladu.
     * @param {Array} polylinesData - tablica segmentów [[lat, lon], ...]
     * @param {number} marginDeg - margines w stopniach
     * @returns {Array} [west, south, east, north]
     */
    computeBBox(polylinesData, marginDeg = this.BBOX_MARGIN_DEG) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        for (const segment of polylinesData) {
            for (const [lat, lon] of segment) {
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
            }
        }

        return [
            minLon - marginDeg, // west
            minLat - marginDeg, // south
            maxLon + marginDeg, // east
            maxLat + marginDeg  // north
        ];
    }

    /**
     * Pobiera drogi z Overpass API dla obszaru śladu GPX i wyświetla je na mapie.
     * @param {Array} polylinesData - tablica segmentów [[lat, lon], ...]
     */
    async loadRoadsForTrace(polylinesData) {
        if (!this.overpass || !this.displayRoadsCallback) {
            console.warn('[GpxImporter] Overpass client not configured — cannot load roads.');
            return;
        }

        const bbox = this.computeBBox(polylinesData);
        console.log('[GpxImporter] Loading roads for bbox:', bbox);

        if (window.asphaltApp && window.asphaltApp.showMessage) {
            window.asphaltApp.showMessage("Pobieranie dróg w obszarze śladu…", "info");
        }

        try {
            const geoJsonData = await this.overpass.fetchRoadsInBBox(bbox);

            if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
                if (window.asphaltApp && window.asphaltApp.showMessage) {
                    window.asphaltApp.showMessage("Nie znaleziono dróg w obszarze śladu GPX.", "warning");
                }
                return;
            }

            this.displayRoadsCallback(geoJsonData);

            if (window.asphaltApp && window.asphaltApp.showMessage) {
                window.asphaltApp.showMessage(
                    `Załadowano ${geoJsonData.features.length} dróg w obszarze śladu GPX.`,
                    "success"
                );
            }
        } catch (error) {
            console.error('[GpxImporter] Failed to load roads for trace:', error);
            if (window.asphaltApp && window.asphaltApp.showMessage) {
                window.asphaltApp.showMessage("Błąd pobierania dróg w obszarze śladu. Spróbuj ponownie.", "error");
            }
        }
    }

    removeGpxTrace() {
        if (this.gpxLayer) {
            this.map.removeLayer(this.gpxLayer);
            this.gpxLayer = null;
        }

        this.importBtn.style.display = 'inline-flex';
        if (this.loadRoadsLabel) this.loadRoadsLabel.style.display = 'flex';
        this.removeBtn.style.display = 'none';
    }
}
