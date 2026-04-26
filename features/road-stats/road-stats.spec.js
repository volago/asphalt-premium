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
 * Minimalne dane GeoJSON symulujące wynik z Overpass API.
 * Dwie drogi: jedna z smoothness (excellent), jedna bez.
 */
const MOCK_AREA_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[21.0, 52.0], [21.01, 52.01]] },
            properties: { highway: 'tertiary', smoothness: 'excellent', osm_id: 1 }
        },
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[21.02, 52.02], [21.03, 52.03]] },
            properties: { highway: 'unclassified', smoothness: null, osm_id: 2 }
        }
    ]
};

const MOCK_VOIVODESHIP_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[17.0, 51.0], [17.01, 51.01]] },
            properties: { highway: 'tertiary', smoothness: 'good', osm_id: 10 }
        },
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[17.02, 51.02], [17.03, 51.03]] },
            properties: { highway: 'unclassified', smoothness: null, osm_id: 11 }
        },
        {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[17.04, 51.04], [17.05, 51.05]] },
            properties: { highway: 'unclassified', smoothness: null, osm_id: 12 }
        }
    ]
};

test.describe('Statystyki dróg', () => {
    test('wyświetlanie dróg z obszaru (bbox) nie pokazuje statystyk', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const roadStats = page.locator('#road-stats');

        // Na start statystyki nie są widoczne
        await expect(roadStats).toBeHidden();

        // Symuluj załadowanie dróg z obszaru (showStatistics = false — jak GPX importer)
        await page.evaluate((geoJson) => {
            window.asphaltApp.displayRoads(geoJson, false);
        }, MOCK_AREA_GEOJSON);

        // Statystyki nadal nie powinny być widoczne
        await expect(roadStats).toBeHidden();
    });

    test('wyświetlanie dróg dla województwa pokazuje statystyki', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const roadStats = page.locator('#road-stats');

        // Na start statystyki nie są widoczne
        await expect(roadStats).toBeHidden();

        // Symuluj załadowanie danych województwa (showStatistics = true — jak loadCachedData/refreshData)
        await page.evaluate((geoJson) => {
            window.asphaltApp.displayRoads(geoJson, true);
        }, MOCK_VOIVODESHIP_GEOJSON);

        // Statystyki powinny być widoczne
        await expect(roadStats).toBeVisible();
    });

    test('ładowanie fragmentu obszaru, a potem województwa — statystyki pojawiają się po województwie', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const roadStats = page.locator('#road-stats');

        // 1. Wczytaj mały obszar (bez statystyk)
        await page.evaluate((geoJson) => {
            window.asphaltApp.displayRoads(geoJson, false);
        }, MOCK_AREA_GEOJSON);

        // 2. Statystyki nie powinny się pojawić
        await expect(roadStats).toBeHidden();

        // 3. Wczytaj województwo
        await page.evaluate((geoJson) => {
            window.asphaltApp.displayRoads(geoJson, true);
        }, MOCK_VOIVODESHIP_GEOJSON);

        // 4. Teraz statystyki powinny być widoczne
        await expect(roadStats).toBeVisible();

        // 5. Sprawdź że statystyki zawierają jakieś dane
        const excellentPercent = page.locator('#excellent-percent');
        await expect(excellentPercent).not.toHaveText('-');
    });
});
