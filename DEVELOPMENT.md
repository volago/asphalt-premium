# 🛠️ Dokumentacja deweloperska — Asfalt Premium

> Informacje techniczne dla deweloperów chcących uruchomić, zmodyfikować lub rozwijać projekt.

## Strategia deweloperska

Projekt służy małemu celowi, jakim jest zebranie danych o jakości asfaltu na drogach w Polsce. Zatem postawiłem na najprostrzą technologię, czyli static web. Logowanie i magazyn danych jest zapewniony przez OpenStreetMap.

PoC był zrobiony w czystym vibe-code ;) Obecnie w każdej zmianie starma się poprawiać architekrurę, bo osiągnięta została pewna masa krytyczna, a użytkownicy nie zwalniają z nowymi pomysłami.

Nowe feature'y należy zatem implementować z poszanowaniem choć podstawowych zasad inżynierii oprogramowania. 


## Technologie

| Technologia | Wykorzystanie |
|---|---|
| **HTML5, CSS3, JavaScript (ES6+)** | Frontend |
| **[Leaflet.js 1.9.4](https://leafletjs.com/)** | Mapa interaktywna |
| **[OpenStreetMap](https://www.openstreetmap.org)** | Dane o drogach (via OverpassAPI) |
| **IndexedDB** | Cache danych lokalnie |
| **OAuth 2.0 z PKCE** | Autoryzacja do edycji OSM |
| **[Font Awesome](https://fontawesome.com/)** | Ikony |
| **[Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)** | Typografia |

## Uruchomienie lokalne

### Wymagania wstępne

- Przeglądarka wspierająca ES6+ i IndexedDB
- Lokalny serwer HTTP (ze względu na CORS i OAuth)
- (Opcjonalnie) Konto [OpenStreetMap](https://www.openstreetmap.org/user/new) dla funkcji edycji

### Instalacja i uruchomienie

1. **Sklonuj repozytorium:**

   ```bash
   git clone https://github.com/volago/asphalt-premium.git
   cd asphalt-premium
   ```

2. **Uruchom lokalny serwer HTTP:**

   ```bash
   # Node.js (zalecany port 8081)
   npx http-server -p 8081

   # Alternatywnie Python:
   python -m http.server 8081
   ```

3. **Otwórz aplikację w przeglądarce:**

   ```text
   http://127.0.0.1:8081
   ```

   ⚠️ **Ważne:** Używaj `127.0.0.1` zamiast `localhost` (wymóg OAuth OSM)

### Konfiguracja OAuth (opcjonalna — dla edycji dróg)

Jeśli chcesz włączyć funkcję edycji dróg bezpośrednio z aplikacji:

1. **Zarejestruj aplikację OAuth2:**
   - **Development (testy):** https://master.apis.dev.openstreetmap.org/oauth2/applications
   - **Production (produkcja):** https://www.openstreetmap.org/oauth2/applications

2. **Parametry rejestracji:**
   - **Application Name:** Asphalt Premium (lub własna nazwa)
   - **Redirect URI:** `http://127.0.0.1:8081/` (dla development)
   - **Confidential:** NO (aplikacja publiczna)
   - **Permissions:** `read_prefs`, `write_api`

3. **Konfiguracja w kodzie:**
   - Otwórz plik `js/config.js`
   - Wpisz otrzymany `Client ID` w odpowiednie pole (`CLIENT_ID_DEV` / `CLIENT_ID_PROD`)
   - Ustaw flagę `USE_DEV_SERVER`: `true` dla dev, `false` dla produkcji

4. **Szczegółowa instrukcja:** [OAUTH_SETUP.md](OAUTH_SETUP.md)

## Konfiguracja środowiska

### Przełączanie między Development a Production

W pliku `js/config.js` znajdziesz flagę kontrolującą środowisko:

```javascript
OSM_API: {
    USE_DEV_SERVER: true,  // true = dev, false = produkcja
}
```

| Środowisko | Flaga | Serwer | Klucz |
|---|---|---|---|
| **Development** | `true` | `master.apis.dev.openstreetmap.org` | `CLIENT_ID_DEV` |
| **Production** | `false` | `api.openstreetmap.org` | `CLIENT_ID_PROD` |

⚠️ **Uwaga:** Przed przełączeniem na produkcję upewnij się, że:

1. Zarejestrowałeś aplikację na https://www.openstreetmap.org/oauth2/applications
2. Wpisałeś poprawny `CLIENT_ID_PROD` i `REDIRECT_URI_PROD` w `config.js`
3. Dokładnie przetestowałeś aplikację na serwerze deweloperskim

## API i źródła danych

### OpenStreetMap

- **Źródło danych**: [OpenStreetMap](https://www.openstreetmap.org)
- **Tag główny**: [`smoothness=*`](https://wiki.openstreetmap.org/wiki/Key:smoothness) — standard jakości nawierzchni OSM
- **Licencja danych**: [ODbL](https://opendatacommons.org/licenses/odbl/)

### OverpassAPI

- **Serwery** (z automatycznym fallbackiem):
  - `https://overpass-api.de/api/interpreter` (główny)
  - `https://overpass.kumi.systems/api/interpreter` (backup)
  - `https://overpass.openstreetmap.ru/api/interpreter` (backup)
- **Timeout**: 90 sekund

### OSM API v0.6

| Metoda | Endpoint | Opis |
|---|---|---|
| `GET` | `/api/0.6/way/:id` | Pobieranie szczegółów drogi |
| `PUT` | `/api/0.6/way/:id` | Aktualizacja drogi |
| `PUT` | `/api/0.6/changeset/create` | Tworzenie changesetów |
| `PUT` | `/api/0.6/changeset/:id/close` | Zamykanie changesetów |

### Mapy i kafelki

- **Biblioteka**: [Leaflet.js 1.9.4](https://leafletjs.com/)
- **Tile server**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## Wydajność i optymalizacja

- **Canvas rendering** — Leaflet używa Canvas dla lepszej wydajności
- **Lazy loading** — drogi są ukrywane przy zoom < 7
- **IndexedDB** — przechowywanie dużych zbiorów danych (do kilku MB na województwo)
- **3-dniowy cache** — redukcja obciążenia serwerów OverpassAPI
- **Fallback servers** — 3 serwery OverpassAPI dla niezawodności

## Bezpieczeństwo

- **OAuth 2.0 PKCE** — bezpieczna autoryzacja dla aplikacji publicznych (bez client secret)
- **CSRF protection** — weryfikacja `state` podczas OAuth callback
- **SessionStorage** — tokeny przechowywane tylko w sesji przeglądarki
- **CORS compliance** — wymagany lokalny serwer HTTP
- **No credential exposure** — Client ID jest publiczny, brak wrażliwych danych w kodzie

## Kompatybilność

| Przeglądarka | Minimalna wersja |
|---|---|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |

**Wymagane API:** ES6+, IndexedDB, Crypto API (PKCE), Fetch API

**Responsywność:** Desktop, tablet, smartfon (min. 320px)
