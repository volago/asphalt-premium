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
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (jeśli masz zainstalowany http-server)
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```

3. Otwórz przeglądarkę i przejdź do:
   ```
   http://localhost:8000
   ```

## Instrukcja użytkowania

1. **Wybór województwa**: W sidebarze po lewej stronie wybierz województwo z listy rozwijanej
2. **Ładowanie danych**: Kliknij przycisk "Odśwież" aby pobrać dane dla wybranego województwa
3. **Cache**: Przy pierwszym uruchomieniu dane są pobierane z OverpassAPI. Kolejne ładowania używają lokalnego cache (ważnego 3 dni)
4. **Nawigacja**: Użyj przycisków "Mapa" i "O projekcie" w górnym toolbarze
5. **Interakcja z mapą**: Kliknij na drogę aby zobaczyć szczegóły w popup'ie

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
