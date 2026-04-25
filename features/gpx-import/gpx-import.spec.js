import { test, expect } from '@playwright/test';
import path from 'path';

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

test.describe('Import pliku GPX', () => {
    test('wczytanie i usunięcie pliku gpx zmienia prawidłowo interfejs uzytkownika i widok mapy', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const initialCenter = await page.evaluate(() => {
            const center = window.asphaltApp.mapManager.map.getCenter();
            return { lat: center.lat, lng: center.lng };
        });

        const importBtn = page.locator('#import-gpx-btn');
        const removeBtn = page.locator('#remove-gpx-btn');

        await expect(importBtn).toBeVisible();
        await expect(removeBtn).toBeHidden();

        const filePath = path.resolve('features/gpx-import/test.gpx');
        await page.setInputFiles('#gpx-file-input', filePath);

        await expect(importBtn).toBeHidden();
        await expect(removeBtn).toBeVisible();
        await expect(page.locator('.toast-notification.alert-success')).toBeVisible();

        const hasLayer = await page.evaluate(() => window.asphaltApp.gpxImporter.gpxLayer !== null);
        expect(hasLayer).toBeTruthy();

        const newCenter = await page.evaluate(() => {
            const center = window.asphaltApp.mapManager.map.getCenter();
            return { lat: center.lat, lng: center.lng };
        });

        // GPX jest blisko Warszawy (52.23), widok powinien się zmienić
        expect(newCenter.lat).not.toBeCloseTo(initialCenter.lat, 4);

        await removeBtn.click();

        await expect(importBtn).toBeVisible();
        await expect(removeBtn).toBeHidden();

        const isLayerRemoved = await page.evaluate(() => window.asphaltApp.gpxImporter.gpxLayer === null);
        expect(isLayerRemoved).toBeTruthy();
    });
});

test.describe('Checkbox "Wczytaj drogi w obszarze śladu"', () => {
    test('Checkbox jest widoczny obok przycisku importu GPX', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const checkbox = page.locator('#load-gpx-roads-checkbox');
        const label = page.locator('#load-gpx-roads-label');

        await expect(label).toBeVisible();
        await expect(checkbox).toBeVisible();
        await expect(checkbox).not.toBeChecked();
    });

    test('Checkbox można zaznaczyć i odznaczyć', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const checkbox = page.locator('#load-gpx-roads-checkbox');

        await checkbox.check();
        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    });

    test('Label checkboxa chowa się po wczytaniu śladu GPX', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const label = page.locator('#load-gpx-roads-label');
        await expect(label).toBeVisible();

        const filePath = path.resolve('features/gpx-import/test.gpx');
        await page.setInputFiles('#gpx-file-input', filePath);

        // Po załadowaniu śladu label powinien być ukryty
        await expect(label).toBeHidden();
    });

    test('Label checkboxa wraca po usunięciu śladu GPX', async ({ page }) => {
        await page.goto('/');
        await dismissWelcomePopup(page);
        await page.waitForSelector('.leaflet-container');

        const label = page.locator('#load-gpx-roads-label');
        const removeBtn = page.locator('#remove-gpx-btn');

        const filePath = path.resolve('features/gpx-import/test.gpx');
        await page.setInputFiles('#gpx-file-input', filePath);
        await expect(label).toBeHidden();

        await removeBtn.click();
        await expect(label).toBeVisible();
    });
});
