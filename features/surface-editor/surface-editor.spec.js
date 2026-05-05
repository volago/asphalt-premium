import { test, expect } from '@playwright/test';

// Pomocnik: zamknij welcome popup jeśli się pojawi
async function dismissWelcomePopup(page) {
    const welcomeBtn = page.locator('#welcome-start-btn');
    try {
        await welcomeBtn.waitFor({ state: 'visible', timeout: 2000 });
        await welcomeBtn.click();
        await page.waitForTimeout(300);
    } catch {
        // popup nieobecny — ignorujemy
    }
}

/**
 * Minimalne dane GeoJSON z dwoma drogami:
 * 1. Droga asfaltowa (smoothness=good)
 * 2. Droga bez surface (surface=null)
 */
const MOCK_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[21.0, 52.0], [21.01, 52.01]] },
            properties: { highway: 'tertiary', smoothness: 'good', surface: 'asphalt', osm_id: 101, name: 'Asfaltowa' }
        },
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[21.02, 52.02], [21.03, 52.03]] },
            properties: { highway: 'unclassified', surface: null, smoothness: null, osm_id: 102, name: 'Brak Nawierzchni' }
        }
    ]
};

test.describe('Edycja nawierzchni (surface)', () => {

    test('otwiera edytor nawierzchni dla dróg bez surface i blokuje mieszanie', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        // Wstrzyknięcie mockowanych danych
        await page.evaluate((geoJson) => {
            window.asphaltApp.displayRoads(geoJson, false);
        }, MOCK_GEOJSON);

        // Zmockowanie OSM API i OAuth dla instancji MapManager (która używa this.osmApi / this.oauth)
        await page.evaluate(() => {
            const mapMgr = window.asphaltApp.mapManager;
            mapMgr.osmApi = {
                updateSurface: async (wayIds, surface) => {
                    return { success: true, changesetId: 999 };
                }
            };
            mapMgr.oauth = { isAuthenticated: () => true };
            window.asphaltApp.osmApi = mapMgr.osmApi;
            window.asphaltApp.oauth = mapMgr.oauth;
        });

        // Pobranie dostępu do dróg i wywołanie selectRoad bezpośrednio na obiekcie MapManager
        await page.evaluate(() => {
            const mapMgr = window.asphaltApp.mapManager;
            const roadNoSurface = Object.values(mapMgr.roadsLayer._layers).find(l => l.feature.properties.osm_id === 102);
            mapMgr.selectRoad(roadNoSurface, null);
        });

        // Sprawdź, czy otworzył się panel z Edycją rodzaju nawierzchni
        await expect(page.locator('.road-info-sidebar')).toBeVisible();
        await expect(page.locator('text="Edycja rodzaju nawierzchni"')).toBeVisible();

        // Próba zaznaczenia drugiej drogi (asfaltowej) z klawiszem Ctrl (mieszanie typów)
        await page.evaluate(() => {
            const mapMgr = window.asphaltApp.mapManager;
            const roadAsphalt = Object.values(mapMgr.roadsLayer._layers).find(l => l.feature.properties.osm_id === 101);
            // Symulacja kliknięcia z Ctrl
            mapMgr.selectRoad(roadAsphalt, { originalEvent: { ctrlKey: true } });
        });

        // Sprawdzenie, czy pojawił się odpowiedni komunikat toast (toast z błędem o mieszaniu)
        const toast = page.locator('.toast.toast-warning');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Nie można jednocześnie zaznaczać dróg asfaltowych i dróg bez nawierzchni');

        // Upewnienie się, że wciąż zaznaczona jest tylko 1 droga
        const selectedCount = await page.evaluate(() => {
            return window.asphaltApp.mapManager.selectedRoads.length;
        });
        expect(selectedCount).toBe(1);

        // Upewnienie się, że można wybrać "Asfaltowa" w edytorze
        await page.locator('.smoothness-option[data-value="asphalt"]').click();
        
        // Zapis - klikamy zapisz
        await page.locator('#save-surface-btn').click();

        // Potwierdzamy w modalu
        await expect(page.locator('#confirmationModal')).toBeVisible();
        await page.locator('#confirmationModalConfirm').click();

        // Toast success
        const successToast = page.locator('.toast.toast-success');
        await expect(successToast).toBeVisible();
        await expect(successToast).toContainText('zaktualizowany');
    });

});
