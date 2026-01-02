# Asphalt Premium

Aplikacja webowa do wizualizacji jakości dróg w Polsce na podstawie danych z OpenStreetMap.

## Opis

Asphalt Premium to aplikacja internetowa, która wyświetla interaktywną mapę Polski z możliwością sprawdzenia jakości dróg w poszczególnych województwach. Aplikacja wykorzystuje dane z OpenStreetMap pobierane przez OverpassAPI i umożliwia bezpośrednią edycję danych jakości nawierzchni.

## Główne funkcjonalności

### 🗺️ Wizualizacja dróg
- **Interaktywna mapa** - pełnoekranowa mapa Polski oparta na Leaflet.js
- **Filtrowanie według województw** - dane dla wszystkich 16 województw
- **Typy dróg** - wyświetlanie dróg trzeciorzędnych (tertiary) i niesklasyfikowanych (unclassified)
- **Wyszukiwanie lokalne** - pobieranie dróg dla widocznego obszaru mapy (niezależnie od województwa)
- **Kolorystyka dróg** według jakości nawierzchni:
  - **Czarna linia ciągła** - doskonała jakość (excellent)
  - **Czarna linia przerywana** - dobra jakość (good)  
  - **Czerwona linia** - słaba jakość (intermediate, bad, very_bad, horrible, very_horrible, impassable)
  - **Niebieska linia** - brak danych o jakości (smoothness nie jest określone)

### ✏️ Edycja bezpośrednia w OSM
- **Wizualna galeria opcji** - 8 poziomów jakości nawierzchni z opisami i zdjęciami przykładowymi
- **OAuth 2.0 z PKCE** - bezpieczna autoryzacja dla aplikacji statycznych
- **Tryb deweloperski i produkcyjny** - możliwość testowania na serwerze dev.openstreetmap.org
- **Sidebar z informacjami o drodze** - wyświetlanie szczegółów wybranej drogi
- **Potwierdzenie przed zapisem** - modalne okno z podsumowaniem zmian
- **Automatyczne changesets** - tworzenie, aktualizacja i zamykanie changesetów OSM
- **Widoczne końce odcinka** - fioletowe markery oznaczające początek i koniec wybranej drogi

### 💾 Inteligentne cache'owanie
- **IndexedDB** - przechowywanie dużych zbiorów danych lokalnie
- **Cache na 3 dni** - automatyczne odświeżanie przeterminowanych danych
- **Per województwo** - osobny cache dla każdego regionu
- **Automatyczne czyszczenie** - usuwanie wygasłych wpisów

### 📊 Statystyki i analiza
- **Procentowy rozkład** - ile dróg ma poszczególne oceny jakości
- **Drogi bez danych** - podświetlenie brakujących ocen
- **Wizualizacja w czasie rzeczywistym** - aktualizacja po załadowaniu danych

### 🎨 Interfejs użytkownika
- **Responsywny design** - działa na wszystkich urządzeniach
- **Sidebar z kontrolkami** - wybór województwa, odświeżanie, legenda
- **Przełączanie widoczności warstw** - pokazuj/ukrywaj drogi według jakości
- **Overlay "O projekcie"** - instrukcje i informacje o projekcie (wyświetlane przy pierwszej wizycie)
- **Toast notifications** - powiadomienia o statusie operacji
- **Modal potwierdzenia** - dialogi dla krytycznych akcji

## Technologie

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapa**: Leaflet.js 1.9.4
- **Dane**: OpenStreetMap via OverpassAPI (3 serwery fallback)
- **Cache**: IndexedDB
- **Autoryzacja**: OAuth 2.0 z PKCE
- **Style**: Własne CSS z CSS Variables, Font Awesome icons, Google Fonts (Inter)
- **API OSM**: bezpośrednia integracja z api.openstreetmap.org

## Uruchomienie

### Wymagania wstępne
- Przeglądarka wspierająca ES6+ i IndexedDB
- Lokalny serwer HTTP (ze względu na CORS i OAuth)
- (Opcjonalnie) Konto OpenStreetMap dla funkcji edycji

### Instalacja i uruchomienie

1. **Sklonuj repozytorium:**
   ```bash
   git clone <repository-url>
   cd asphalt-premium
   ```

2. **Uruchom lokalny serwer HTTP:**
   ```bash
   # Node.js (zalecany port 8081)
   npx http-server -p 8081
   
   # Alternatywnie Python:
   python -m http.server 8081
   
   # Lub dowolny inny serwer HTTP
   ```

3. **Otwórz aplikację w przeglądarce:**
   ```
   http://127.0.0.1:8081
   ```
   ⚠️ **Ważne:** Używaj `127.0.0.1` zamiast `localhost` (wymóg OAuth OSM)

### Konfiguracja OAuth (opcjonalna - dla edycji dróg)

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
   - Wpisz otrzymany `Client ID` w odpowiednie pole:
     - `CLIENT_ID_DEV` dla developmentu
     - `CLIENT_ID_PROD` dla produkcji
   - Ustaw flagę `USE_DEV_SERVER`:
     - `true` - dla testów na dev.openstreetmap.org
     - `false` - dla produkcji na api.openstreetmap.org

4. **Szczegółowa instrukcja:**
   - Zobacz plik `OAUTH_SETUP.md` dla pełnej dokumentacji
   - Zobacz plik `SZYBKI_START_OAUTH.txt` dla skróconej instrukcji

## Instrukcja użytkowania

### Podstawowa nawigacja

1. **Przy pierwszym uruchomieniu:**
   - Aplikacja automatycznie wyświetla overlay "O projekcie" z instrukcjami
   - Kliknij "Zobacz mapę" aby przejść do mapy
   
2. **Wybór województwa:**
   - W bocznym panelu (sidebar) wybierz województwo z listy rozwijanej
   - Lista zawiera wszystkie 16 województw z oznaczeniami rozmiaru
   
3. **Ładowanie danych:**
   - **Metoda A (Województwa):** Wybierz województwo z listy. Dane załadują się automatycznie, a mapa dopasuje się do granic regionu.
   - **Metoda B (Lokalnie):** Przesuń mapę w interesujące Cię miejsce (wymagany zoom > 11) i kliknij przycisk "Wczytaj drogi" widoczny na mapie.
   - **Odświeżanie:** Kliknij "Odśwież" w panelu bocznym. Pozycja mapy zostanie zachowana (nie resetuje widoku).
   - **Cache:** Dane są zapisywane w IndexedDB (cache 3 dni) dla szybkiego dostępu offline.

4. **Nawigacja po mapie:**
   - Użyj przycisków zoom lub scroll myszy do zmiany przybliżenia
   - Przeciągaj mapę aby przesuwać widok
   - Drogi stają się bardziej widoczne przy większym przybliżeniu (zoom > 7)

### Kontrola widoczności warstw

- **Ikony oka w legendzie** - kliknij aby pokazać/ukryć drogi danego typu:
  - 👁️ Doskonała jakość (czarna ciągła)
  - 👁️ Dobra jakość (czarna przerywana)
  - 👁️ Słaba jakość (czerwona)
  - 👁️ Brak danych (niebieska)

### Przeglądanie szczegółów drogi

1. **Kliknij na drogę** na mapie
2. **Otworzy się panel boczny** z informacjami:
   - Nazwa drogi
   - Obecna jakość nawierzchni
   - Typ drogi (highway tag)
   - OSM ID
3. **Widoczne markery** - fioletowe punkty na początku i końcu odcinka
4. **Podświetlenie** - wybrana droga jest zaznaczona na fioletowo
5. **Zamknięcie panelu** - kliknij X lub kliknij w puste miejsce na mapie

### Edycja jakości drogi (wymaga logowania)

1. **Zaloguj się do OSM:**
   - Kliknij przycisk "Zaloguj" w prawym górnym rogu mapy (toolbar)
   - Zostaniesz przekierowany do OSM (lub okno popup)
   - Zaloguj się swoim kontem OpenStreetMap
   - Autoryzuj aplikację Asphalt Premium
   - Po zalogowaniu zobaczysz swoją nazwę użytkownika w toolbarze

2. **Wybierz drogę do edycji:**
   - Kliknij na wybraną drogę na mapie
   - Otworzy się panel boczny z informacjami o drodze
   - Panel edycji jest dostępny tylko po zalogowaniu

3. **Wybierz jakość nawierzchni:**
   - W galerii kliknij na odpowiednią opcję (5 głównych opcji)
   - Każda opcja ma: obraz przykładowy, nazwę i opis
   - Dostępne opcje: Doskonała, Dobra, Średnia, Słaba, Bardzo słaba

4. **Zapisz zmiany:**
   - Kliknij przycisk "Zapisz"
   - W oknie potwierdzenia sprawdź zmiany
   - Potwierdź klikając "Potwierdź"
   - Aplikacja automatycznie:
     - Utworzy changeset w OSM
     - Zaktualizuje tag smoothness
     - Zamknie changeset
     - Odświeży wyświetlane informacje

5. **Edycja bezpośrednio w OSM:**
   - Kliknij przycisk "OSM" w prawym dolnym rogu panelu
   - Otworzy się edytor iD na stronie openstreetmap.org
   - Możesz edytować wszystkie tagi drogi

### Statystyki

Panel boczny pokazuje automatycznie wygenerowane statystyki dla załadowanego województwa:
- Procent dróg bez oceny jakości (niebieskie)
- Rozkład procentowy poszczególnych ocen jakości
- Liczby aktualizują się po każdym załadowaniu danych

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
├── index.html                  # Główny plik HTML z kompletną strukturą UI
├── styles/                     # Style CSS
│   ├── main.css                # Główne style, zmienne CSS, layout
│   └── components.css          # Style komponentów (sidebar, modals, etc.)
├── js/                         # Pliki JavaScript (modułowa architektura)
│   ├── app.js                  # Główna logika aplikacji, inicjalizacja
│   ├── map.js                  # MapManager - zarządzanie mapą Leaflet
│   ├── cache.js                # CacheManager - IndexedDB cache
│   ├── overpass.js             # OverpassAPI - pobieranie danych OSM
│   ├── oauth.js                # OSMOAuth - autoryzacja OAuth 2.0 PKCE
│   ├── osm-api.js              # OSMAPIClient - komunikacja z OSM API
│   ├── config.js               # Konfiguracja (województwa, style, OAuth)
│   └── image-modal.js          # Obsługa modalu z obrazkami
├── assets/                     # Zasoby graficzne
│   ├── logo.jpg                # Logo aplikacji
│   ├── map_exapmle.jpg         # Przykładowy screenshot mapy
│   ├── asphatl_blue.png        # Przykład drogi bez danych
│   ├── asphatl_good.png        # Przykład dobrej drogi
│   ├── street_complete_*.jpg   # Screenshoty z instrukcji StreetComplete
│   └── smoothness/             # Zdjęcia przykładowe jakości nawierzchni
│       ├── excellent.jpg
│       ├── good.jpg
│       ├── intermediate.jpg
│       ├── bad.jpg
│       ├── very_bad.jpg
│       ├── horrible.jpg
│       ├── very_horrible.jpg
│       ├── impassable.jpg
│       └── README.md
├── OAUTH_SETUP.md              # Szczegółowa instrukcja konfiguracji OAuth
├── SZYBKI_START_OAUTH.txt      # Skrócona instrukcja OAuth
├── TODO.md                     # Lista zadań do zrobienia
└── README.md                   # Ten plik - dokumentacja projektu
```

### Architektura kodu

#### Klasy główne:
- **AsphaltPremiumApp** (`app.js`) - główny kontroler aplikacji
- **MapManager** (`map.js`) - zarządzanie mapą, warstwami, interakcjami
- **CacheManager** (`cache.js`) - obsługa IndexedDB cache
- **OverpassAPI** (`overpass.js`) - pobieranie danych z OSM
- **OSMOAuth** (`oauth.js`) - autoryzacja OAuth 2.0 z PKCE
- **OSMAPIClient** (`osm-api.js`) - modyfikacja danych w OSM

#### Przepływ danych:
1. Użytkownik wybiera województwo → `app.js`
2. Sprawdzenie cache → `cache.js` (IndexedDB)
3. Jeśli brak/przestarzałe → zapytanie do OverpassAPI → `overpass.js`
4. Konwersja do GeoJSON → wyświetlenie na mapie → `map.js`
5. Kliknięcie w drogę → wyświetlenie sidebara z informacjami
6. Edycja → autoryzacja OAuth → `oauth.js`
7. Zapis do OSM → `osm-api.js` → aktualizacja UI

## API i źródła danych

### OpenStreetMap
- **Źródło danych**: Wszystkie dane o drogach pochodzą z [OpenStreetMap](https://www.openstreetmap.org)
- **Tag główny**: `smoothness=*` - standard jakości nawierzchni OSM
- **Licencja danych**: [ODbL (Open Database License)](https://opendatacommons.org/licenses/odbl/)

### OverpassAPI
- **Serwery**:
  - `https://overpass-api.de/api/interpreter` (główny)
  - `https://overpass.kumi.systems/api/interpreter` (backup)
  - `https://overpass.openstreetmap.ru/api/interpreter` (backup)
- **Timeout**: 90 sekund dla zapytań
- **Fallback**: automatyczne przełączanie między serwerami przy błędach

### OSM API
- **Development**: `https://master.apis.dev.openstreetmap.org`
- **Production**: `https://api.openstreetmap.org`
- **Wersja API**: 0.6
- **Metody używane**:
  - `GET /api/0.6/way/:id` - pobieranie szczegółów drogi
  - `PUT /api/0.6/way/:id` - aktualizacja drogi
  - `PUT /api/0.6/changeset/create` - tworzenie changesetów
  - `PUT /api/0.6/changeset/:id/close` - zamykanie changesetów

### Mapy i kafelki
- **Biblioteka**: [Leaflet.js 1.9.4](https://leafletjs.com/)
- **Tile server**: OpenStreetMap standard tiles
- **URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## Wydajność i optymalizacja

- **Canvas rendering** - Leaflet używa Canvas dla lepszej wydajności
- **Lazy loading** - drogi są ukrywane przy zoom < 7
- **IndexedDB** - przechowywanie dużych zbiorów danych (do kilku MB na województwo)
- **3-dniowy cache** - redukcja obciążenia serwerów OverpassAPI
- **Kompresja GeoJSON** - optymalna struktura danych
- **Fallback servers** - 3 serwery OverpassAPI dla niezawodności

## Bezpieczeństwo

- **OAuth 2.0 PKCE** - bezpieczna autoryzacja dla aplikacji publicznych (bez client secret)
- **CSRF protection** - weryfikacja `state` podczas OAuth callback
- **SessionStorage** - tokeny przechowywane tylko w sesji przeglądarki
- **CORS compliance** - wymagany lokalny serwer HTTP
- **No credential exposure** - Client ID jest publiczny, brak wrażliwych danych w kodzie

## Kompatybilność

- **Przeglądarki**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **Wymagania**:
  - ES6+ (Promise, async/await, Classes, Arrow functions)
  - IndexedDB
  - Crypto API (dla PKCE)
  - Fetch API
- **Responsywność**: działa na desktopach, tabletach i smartfonach
- **Ekran**: minimalna szerokość 320px

## Rozwój i contributing

Projekt jest otwarty na kontrybucje! Jeśli chcesz pomóc:

1. **Zgłaszanie błędów**: Użyj Issues na GitHubie
2. **Propozycje funkcji**: Otwórz Issue z opisem funkcjonalności
3. **Pull requesty**: Mile widziane! Proszę o:
   - Opisanie zmian
   - Testy funkcjonalności
   - Zgodność z istniejącym stylem kodu

### Planowane funkcjonalności (zobacz TODO.md)
- Analityka użytkowania
- Eksport danych do różnych formatów
- Statystyki dla widocznego obszaru (obecnie per województwo)

## Licencja

- **Kod aplikacji**: Open source (licencja do określenia)
- **Dane OSM**: [ODbL (Open Database License)](https://opendatacommons.org/licenses/odbl/)
- **Zobowiązania**:
  - Należy przypisać źródło: © OpenStreetMap contributors
  - Zmiany w danych OSM muszą być udostępnione na tej samej licencji
  - Szczegóły: https://www.openstreetmap.org/copyright

## Autor i kontakt

**Asphalt Premium** - aplikacja do wizualizacji jakości dróg dla cyklistów i mapperów OSM.

Projekt stworzony w celu:
- Ułatwienia życia cyklistom poprzez lepsze planowanie tras
- Zachęcenia społeczności do uzupełniania danych o jakości dróg w OSM
- Pokazania mocy danych otwartych i crowdsourcingu

**Wkład w społeczność OpenStreetMap:**
Każda ocena drogi dodana przez tę aplikację pomaga milionom użytkowników OSM na całym świecie!

## Statystyki pokrycia danych

Procent dróg **bez** oceny jakości (smoothness) w poszczególnych województwach (stan na 2025-09-11):

| Województwo | Drogi bez oceny |
|---|---|
| Podlaskie | 82,4% |
| Mazowieckie | 82,9% |
| Lubelskie | 84,2% |
| Pomorskie | 86,5% |
| Kujawsko-pomorskie | 87,4% |
| Podkarpackie | 88,4% |
| Małopolskie | 88,6% |
| Śląskie | 89,0% |
| Dolnośląskie | 89,2% |
| Warmińsko-mazurskie | 89,5% |
| Opolskie | 90,8% |
| Zachodniopomorskie | 90,9% |
| Świętokrzyskie | 92,6% |
| Wielkopolskie | 92,6% |
| Łódzkie | 93,4% |
| Lubuskie | 95,8% |

**Cel projektu**: zmniejszyć te wartości poprzez zachęcenie społeczności do dodawania ocen jakości dróg!

---

## Przydatne linki

- **OpenStreetMap Wiki - smoothness**: https://wiki.openstreetmap.org/wiki/Key:smoothness
- **StreetComplete (Android)**: https://play.google.com/store/apps/details?id=de.westnordost.streetcomplete
- **OSM OAuth Documentation**: https://wiki.openstreetmap.org/wiki/OAuth
- **OverpassAPI Documentation**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **Leaflet.js Documentation**: https://leafletjs.com/reference.html

---

**Dziękujemy za korzystanie z Asphalt Premium! 🚴‍♂️🗺️**


