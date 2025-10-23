<!-- ccd0072a-5ce7-4caa-8bcf-db68c1c93839 c080820e-9217-427c-96a9-c6df61afd31a -->
# Implementacja edycji OSM w Asphalt Premium

## Przegląd

Dodanie funkcjonalności pozwalającej użytkownikom bezpośrednio edytować tagi smoothness w OpenStreetMap z poziomu aplikacji, używając OAuth 2.0 z PKCE (bez backendu).

## 1. Konfiguracja OSM API i OAuth (config.js)

Rozszerzyć `js/config.js` o:

- Endpoints OSM API (dev i prod) - jedna wartość `USE_DEV_SERVER` do szybkiego przełączania
- Parametry OAuth 2.0 (client_id, scopes, redirect_uri)
- Lista wartości smoothness z opisami w języku polskim
- Mapowanie smoothness na nazwy plików obrazków
```javascript
OSM_API: {
    USE_DEV_SERVER: true, // Zmień na false dla produkcji
    DEV_URL: 'https://master.apis.dev.openstreetmap.org',
    PROD_URL: 'https://api.openstreetmap.org',
    // ... OAuth config
},
SMOOTHNESS_OPTIONS: [
    { value: 'excellent', label: 'Doskonała', description: '...', image: 'excellent.jpg' },
    // ... pozostałe opcje
]
```


## 2. Pobranie i dodanie obrazów smoothness

Pobrać obrazy z wiki OSM dla każdej wartości smoothness:

- excellent, good, intermediate, bad, very_bad, horrible, very_horrible, impassable
- Zapisać w `assets/smoothness/`
- Każdy obraz powinien pokazywać przykład nawierzchni

Linki do obrazów z galerii: https://wiki.openstreetmap.org/wiki/Key:smoothness/Gallery

## 3. Moduł OAuth 2.0 z PKCE (js/oauth.js)

Utworzyć nowy moduł `js/oauth.js` implementujący:

- Generowanie code_verifier i code_challenge (PKCE)
- Przekierowanie do strony autoryzacji OSM
- Obsługę callback z authorization_code
- Wymianę kodu na access_token
- Przechowywanie tokenu w sessionStorage
- Sprawdzanie czy użytkownik jest zalogowany
- Wylogowanie

Klasa `OSMOAuth` z metodami:

```javascript
class OSMOAuth {
    async login() // Rozpoczyna flow OAuth
    async handleCallback() // Obsługuje powrót z OSM
    isAuthenticated() // Sprawdza czy zalogowany
    getAccessToken() // Zwraca token
    logout() // Wylogowuje
}
```

## 4. Moduł OSM API (js/osm-api.js)

Utworzyć nowy moduł `js/osm-api.js` do komunikacji z OSM API:

- Pobieranie szczegółów drogi (way) z pełnymi danymi
- Tworzenie changeset
- Aktualizacja tagu smoothness
- Zamykanie changeset
- Obsługa błędów i rate limiting

Klasa `OSMAPIClient` z metodami:

```javascript
class OSMAPIClient {
    async getWayDetails(wayId) // GET /api/0.6/way/:id
    async createChangeset(comment) // PUT /api/0.6/changeset/create
    async updateWay(wayId, wayData, changesetId) // PUT /api/0.6/way/:id
    async closeChangeset(changesetId) // PUT /api/0.6/changeset/:id/close
}
```

## 5. Formularz edycji w sidebar (map.js)

Modyfikacja metody `showRoadInfo()` w `MapManager`:

- Dodać sekcję "Edycja jakości nawierzchni"
- Wyświetlić galerię opcji smoothness z obrazkami
- Najczęstsze opcje (excellent, good, intermediate, bad) na górze, widoczne
- Rzadsze opcje (very_bad, horrible, very_horrible, impassable) w przewijanym kontenerze
- Dodać przycisk "Zapisz zmiany"
- Jeśli użytkownik niezalogowany - przycisk "Zaloguj się aby edytować"
- Przed zapisem - modal z potwierdzeniem i ostrzeżeniem jeśli tag już istnieje

Dodać nowe metody:

```javascript
showSmoothnessEditor(currentSmoothness) // Renderuje formularz
async saveSmoothnessEdit(wayId, smoothnessValue) // Zapisuje zmiany
showConfirmationDialog(message) // Modal potwierdzenia
```

## 6. Stylowanie formularza (styles/components.css)

Dodać style dla:

- `.smoothness-editor` - kontener formularza edycji
- `.smoothness-gallery` - grid z opcjami
- `.smoothness-option` - pojedyncza opcja (obrazek + label)
- `.smoothness-option.selected` - zaznaczona opcja
- `.smoothness-rare-options` - kontener z przewijanymi rzadkimi opcjami
- `.btn-save-smoothness` - przycisk zapisu
- `.confirmation-modal` - modal potwierdzenia
- Responsive design dla małych ekranów

## 7. Integracja w HTML (index.html)

Dodać nowe skrypty przed `app.js`:

```html
<script src="js/oauth.js"></script>
<script src="js/osm-api.js"></script>
```

## 8. Inicjalizacja w app.js

W `AsphaltPremiumApp.init()`:

- Inicjalizować `OSMOAuth` i sprawdzać callback URL
- Jeśli jest `?code=...` w URL - obsłużyć OAuth callback
- Przekazać instancje OAuth i OSM API do MapManager

## 9. Flow użytkownika

1. Użytkownik klika na drogę
2. Otwiera się sidebar z informacjami o drodze
3. Widzi sekcję "Edycja jakości nawierzchni" z galerią obrazków
4. Wybiera odpowiednią opcję smoothness
5. Klika "Zapisz zmiany"
6. Jeśli niezalogowany - zostaje przekierowany do OAuth
7. Po zalogowaniu - pokazuje się modal potwierdzenia
8. Po potwierdzeniu - zapisuje zmiany do OSM
9. Pokazuje komunikat sukcesu lub błędu
10. Odświeża dane drogi (opcjonalnie)

## Testowanie

- Używać dev server OSM dla testów: `https://master.apis.dev.openstreetmap.org`
- Przetestować full flow OAuth
- Przetestować zapisywanie tagów
- Przetestować obsługę błędów (brak internetu, błędny token, itp.)
- Przed produkcją zmienić `USE_DEV_SERVER` na `false`

### To-dos

- [ ] Rozszerzyć config.js o konfigurację OSM API, OAuth 2.0 i opcje smoothness
- [ ] Pobrać i dodać obrazy smoothness z wiki OSM do assets/smoothness/
- [ ] Stworzyć js/oauth.js z implementacją OAuth 2.0 PKCE flow
- [ ] Stworzyć js/osm-api.js z metodami do komunikacji z OSM API
- [ ] Dodać formularz wyboru smoothness z galerią obrazków w map.js showRoadInfo()
- [ ] Zaimplementować logikę zapisywania zmian smoothness w map.js
- [ ] Dodać style dla formularza smoothness, galerii i modala potwierdzenia w components.css
- [ ] Dodać nowe skrypty oauth.js i osm-api.js do index.html
- [ ] Zintegrować OAuth i OSM API w app.js, obsłużyć callback
- [ ] Przetestować full flow edycji z dev serverem OSM