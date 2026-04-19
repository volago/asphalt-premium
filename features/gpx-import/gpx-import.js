/**
 * GPX Importer Module
 * Obsługa ładowania i wyświetlania plików GPX na mapie jako nienaklikalnej warstwy pomocniczej.
 */

class GpxImporter {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.gpxLayer = null;
        this.map = mapManager.map;
        
        // Elementy UI
        this.importBtn = document.getElementById('import-gpx-btn');
        this.removeBtn = document.getElementById('remove-gpx-btn');
        this.fileInput = document.getElementById('gpx-file-input');
        
        // Stałe konfiguracyjne dla śladu GPX
        this.GPX_STYLE = {
            color: '#000000',      // Czarny pas
            weight: 12,            // 3-4 razy szerszy niż standardowa droga (np. 3-4px)
            opacity: 0.3,          // Wysoka przezroczystość
            interactive: false,    // Brak możliwości kliknięcia śladu GPX, nie przykrywa odcinków dróg
            lineCap: 'round',
            lineJoin: 'round'
        };

        this.initEvents();
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
        const parseError = xmlDoc.getElementsByTagName("parsererror");
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
        this.removeBtn.style.display = 'inline-flex';
        
        if (window.asphaltApp && window.asphaltApp.showMessage) {
            window.asphaltApp.showMessage("Pomocniczy ślad GPX został pomyślnie załadowany.", "success");
        }
    }

    removeGpxTrace() {
        if (this.gpxLayer) {
            this.map.removeLayer(this.gpxLayer);
            this.gpxLayer = null;
        }
        
        this.importBtn.style.display = 'inline-flex';
        this.removeBtn.style.display = 'none';
    }
}
