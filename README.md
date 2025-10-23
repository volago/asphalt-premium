odpal przez node i tyle a nie cudujesz
# Asphalt Premium

Aplikacja webowa do wizualizacji jakości dróg w Polsce na podstawie danych z OpenStreetMap.

## Opis

Asphalt Premium to responsywna aplikacja internetowa, która wyświetla interaktywną mapę Polski z możliwością sprawdzenia jakości dróg w poszczególnych województwach. Aplikacja wykorzystuje dane z OpenStreetMap pobierane przez OverpassAPI.

## Funkcjonalności

- 🗺️ **Interaktywna mapa** - pełnoekranowa mapa z możliwością nawigacji
- 🚴 **Kolarski motyw** - aplikacja dedykowana cyklistom
- 📍 **Wybór województwa** - możliwość filtrowania danych według województw
- 🛣️ **Jakość dróg** - wizualizacja według standardów smoothness OSM:
  - **Czarna linia ciągła** - doskonała jakość (excellent)
  - **Czarna linia przerywana** - dobra jakość (good)  
  - **Czerwona linia** - słaba jakość (intermediate, bad, very_bad, horrible, very_horrible, impassable)
- ✏️ **Edycja bezpośrednia w OSM** - możliwość edycji jakości dróg bezpośrednio z aplikacji:
  - Wizualna galeria opcji smoothness z obrazkami
  - Autoryzacja OAuth 2.0 z PKCE (bezpieczna dla aplikacji statycznych)
  - Potwierdzenie przed zapisem zmian
  - Automatyczne tworzenie i zamykanie changesetów
- 💾 **Inteligentne cache'owanie** - lokalny cache danych na 3 dni dla każdego województwa
- 📱 **Responsywny design** - działa na wszystkich urządzeniach
- ⚡ **Wysoka wydajność** - optymalizacja wyświetlania tysięcy dróg

## Technologie

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapa**: Leaflet.js
- **Dane**: OpenStreetMap via OverpassAPI
- **Cache**: LocalStorage
- **Style**: Własne CSS z system designu

## Uruchomienie

1. Sklonuj repozytorium:
   ```bash
   git clone <repository-url>
   cd asphalt-premium
   ```

2. Uruchom lokalny serwer HTTP (wymagane ze względu na CORS):
   ```bash
   # Node.js (zalecany port 8081)
   npx http-server -p 8081
   ```

3. **Konfiguracja OAuth (wymagane dla edycji dróg):**
   - Zobacz szczegółową instrukcję w pliku `OAUTH_SETUP.md` lub `SZYBKI_START_OAUTH.txt`
   - **Development:** Zarejestruj aplikację OAuth2 na https://master.apis.dev.openstreetmap.org/oauth2/applications
   - **Ważne:** Użyj `http://127.0.0.1:8081/` jako Redirect URI (NIE localhost!)
   - Skopiuj Client ID do `CLIENT_ID_DEV` w `js/config.js`
   - **Produkcja:** Przed wdrożeniem zarejestruj osobną aplikację na https://www.openstreetmap.org/oauth2/applications

4. Otwórz przeglądarkę i przejdź do:
   ```
   http://127.0.0.1:8081
   ```
   ⚠️ **Uwaga:** Używaj `127.0.0.1` zamiast `localhost` (wymóg OAuth OSM)

## Instrukcja użytkowania

1. **Wybór województwa**: W sidebarze po lewej stronie wybierz województwo z listy rozwijanej
2. **Ładowanie danych**: Kliknij przycisk "Odśwież" aby pobrać dane dla wybranego województwa
3. **Cache**: Przy pierwszym uruchomieniu dane są pobierane z OverpassAPI. Kolejne ładowania używają lokalnego cache (ważnego 3 dni)
4. **Nawigacja**: Użyj przycisków "Mapa" i "O projekcie" w górnym toolbarze
5. **Interakcja z mapą**: Kliknij na drogę aby zobaczyć szczegóły w sidebarze
6. **Edycja jakości drogi**:
   - Kliknij na drogę aby otworzyć sidebar z informacjami
   - W sekcji "Edycja jakości nawierzchni" wybierz odpowiednią opcję z galerii
   - Jeśli niezalogowany, kliknij "Zaloguj się aby edytować"
   - Po wybraniu opcji kliknij "Zapisz zmiany"
   - Potwierdź zapis w wyświetlonym oknie
   - Zmiany zostaną zapisane bezpośrednio w OpenStreetMap

## Konfiguracja środowiska

### Przełączanie między Development a Production

W pliku `js/config.js` znajdziesz flagę kontrolującą środowisko:

```javascript
OSM_API: {
    USE_DEV_SERVER: true,  // true = dev, false = produkcja
    // ...
}
```

**Development (domyślnie):**
- `USE_DEV_SERVER: true`
- Używa https://master.apis.dev.openstreetmap.org
- Wymaga `CLIENT_ID_DEV` i `REDIRECT_URI_DEV`
- Bezpieczne do testowania - nie wpływa na produkcyjne dane OSM

**Production:**
- `USE_DEV_SERVER: false`
- Używa https://api.openstreetmap.org
- Wymaga `CLIENT_ID_PROD` i `REDIRECT_URI_PROD`
- Zmiany są zapisywane do prawdziwej bazy danych OSM

⚠️ **Uwaga:** Przed przełączeniem na produkcję upewnij się, że:
1. Zarejestrowałeś aplikację na https://www.openstreetmap.org/oauth2/applications
2. Wpisałeś poprawny `CLIENT_ID_PROD` i `REDIRECT_URI_PROD` w `config.js`
3. Dokładnie przetestowałeś aplikację na serwerze deweloperskim

## Struktura projektu

```
asphalt-premium/
├── index.html              # Główny plik HTML
├── styles/                 # Style CSS
│   ├── main.css            # Główne style
│   └── components.css      # Style komponentów
├── js/                     # Pliki JavaScript
│   ├── app.js              # Główna logika aplikacji
│   ├── map.js              # Zarządzanie mapą
│   ├── cache.js            # System cache'owania
│   ├── overpass.js         # Komunikacja z OverpassAPI
│   └── config.js           # Konfiguracja
└── README.md               # Ten plik
```

## API i źródła danych

- **OpenStreetMap**: Źródło danych o drogach
- **OverpassAPI**: Interface do pobierania danych OSM
- **Leaflet.js**: Biblioteka map
- **Tiles**: OpenStreetMap tile server

## Licencja

Projekt open source. Dane pochodzą z OpenStreetMap na licencji ODbL.

## Autor

Asphalt Premium - aplikacja do wizualizacji jakości dróg dla cyklistów.

## Progress

| Nazwa | 2025-09-11 |
|---|---|
|Dolnośląskie|89,2%|
|Kujawsko-pomorskie|87,4%|
|Lubelskie|84,2%|
|Lubuskie|95,8%|
|Łódzkie|93,4%|
|Małopolskie|88,6%|
|Mazowieckie|82,9%|
|Opolskie|90,8%|
|Podkarpackie|88,4%|
|Podlaskie|82,4%|
|Pomorskie|86,5%|
|Śląskie|89,0%|
|Świętokrzyskie|92,6%|
|Warmińsko-mazurskie|89,5%|
|Wielkopolskie|92,6%|
|Zachodniopomorskie|90,9%|


