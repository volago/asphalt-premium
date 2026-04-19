import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import pliku GPX', () => {
  test('wczytanie i usunięcie pliku gpx zmienia prawidłowo interfejs uzytkownika i widok mapy', async ({ page }) => {
    
    // 1. Otwarcie instancji strony i akceptacja popupu (jeśli się pojawia)
    await page.goto('/');

    // Popup włącza się z 600ms timeoutem w app.js, więc musimy na niego poczekać
    const welcomePopup = page.locator('#welcome-start-btn');
    try {
        await welcomePopup.waitFor({ state: 'visible', timeout: 2000 });
        await welcomePopup.click();
        
        // Wait for removal animation to complete (250ms in app.js + buffer)
        await page.waitForTimeout(300);
    } catch (e) {
        // ignorujemy brak popupu
    }
    // Poczekaj na wejście mapy i warstw Leafleta
    await page.waitForSelector('.leaflet-container');

    // Zapamiętaj obecny srodek (bounds lub center)
    const initialCenter = await page.evaluate(() => {
        const center = window.asphaltApp.mapManager.map.getCenter();
        return { lat: center.lat, lng: center.lng };
    });

    const importBtn = page.locator('#import-gpx-btn');
    const removeBtn = page.locator('#remove-gpx-btn');
    
    // Upewniamy się, że poprawne przyciski są widoczne
    await expect(importBtn).toBeVisible();
    await expect(removeBtn).toBeHidden();

    // 2. Wczytujemy plik
    // Ponieważ wejście plikowe to <input type="file" id="gpx-file-input">
    const filePath = path.resolve('features/gpx-import/test.gpx');
    await page.setInputFiles('#gpx-file-input', filePath);

    // 3. Po wczytaniu weryfikacja
    await expect(importBtn).toBeHidden();
    await expect(removeBtn).toBeVisible();
    await expect(page.locator('.toast-notification.alert-success')).toBeVisible(); // Powinniśmy mieć wyświetlony toast success
    
    // Zamiast szukać elementu DOM SVG, weryfikujemy czy GpxImporter przypisał poprawnie warstwę do swojego stanu.
    const hasLayer = await page.evaluate(() => window.asphaltApp.gpxImporter.gpxLayer !== null);
    expect(hasLayer).toBeTruthy();

    const newCenter = await page.evaluate(() => {
        const center = window.asphaltApp.mapManager.map.getCenter();
        return { lat: center.lat, lng: center.lng };
    });
    
    // Sprawdzamy czy zmiana center zadziałała, poniewaz GPX jest blisko Warszawy (52.23)
    expect(newCenter.lat).not.toBeCloseTo(initialCenter.lat, 4);

    // 4. Skasowanie śladu
    await removeBtn.click();

    // 5. Powrót to stanu wejściowego
    await expect(importBtn).toBeVisible();
    await expect(removeBtn).toBeHidden();
    
    // Upewniamy się, że warstwa została wyczyszczona
    const isLayerRemoved = await page.evaluate(() => window.asphaltApp.gpxImporter.gpxLayer === null);
    expect(isLayerRemoved).toBeTruthy();
  });
});
