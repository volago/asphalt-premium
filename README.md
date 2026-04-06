# 🚴 Asfalt Premium

**Społecznościowa mapa jakości nawierzchni dróg w Polsce** — tworzona przez rowerzystów dla rowerzystów na bazie danych [OpenStreetMap](https://www.openstreetmap.org).

🔗 **[Otwórz aplikację](https://volago.github.io/asphalt-premium/)** · 📖 **[Instrukcja użytkowania](INSTRUKCJA.md)**

---

## 🗺️ Główne funkcjonalności

### Wizualizacja dróg

- **Interaktywna mapa** — pełnoekranowa mapa Polski oparta na [Leaflet.js](https://leafletjs.com/)
- **Filtrowanie według województw** — dane dla wszystkich 16 województw
- **Wyszukiwanie lokalne** — pobieranie dróg dla widocznego obszaru mapy (niezależnie od województwa)
- **Typy dróg** — drogi trzeciorzędne (tertiary) i niesklasyfikowane (unclassified)
- **Kolorystyka** według jakości nawierzchni:
  - ⬛ **Czarna ciągła** — doskonała jakość (`excellent`)
  - ◼️ **Czarna przerywana** — dobra jakość (`good`)
  - 🟥 **Czerwona** — słaba jakość (`intermediate`, `bad`, `very_bad`, `horrible`, `very_horrible`, `impassable`)
  - 🟦 **Niebieska** — brak danych o jakości
- **Przełączanie widoczności warstw** — pokazuj/ukrywaj drogi według jakości

### ✏️ Edycja bezpośrednia w OSM

- **Wizualna galeria opcji** — 5 poziomów jakości nawierzchni z opisami i zdjęciami
- **Edycja wielu odcinków** — zaznacz wiele dróg przytrzymując **Ctrl** (⌘ na Mac) i edytuj je hurtowo
- **[OAuth 2.0](https://wiki.openstreetmap.org/wiki/OAuth) z PKCE** — bezpieczna autoryzacja
- **Automatyczne changesets** — tworzenie, aktualizacja i zamykanie changesetów OSM
- **Potwierdzenie przed zapisem** — modalne okno z podsumowaniem zmian

### 📊 Statystyki i analiza

- **Procentowy rozkład** — ile dróg ma poszczególne oceny jakości
- **Drogi bez danych** — podświetlenie brakujących ocen
- **Wizualizacja w czasie rzeczywistym** — aktualizacja po załadowaniu danych

> 📖 Szczegółowa instrukcja krok po kroku: **[INSTRUKCJA.md](INSTRUKCJA.md)**

---

## 📈 Statystyki pokrycia danych

Procent dróg **bez** oceny jakości (`smoothness`) w poszczególnych województwach:

| Województwo | 2025-09-11 | 2026-04-04 |
| --- | --- | --- |
| Podlaskie | 82,4% | 82,1% |
| Mazowieckie | 82,9% | 81,5% |
| Lubelskie | 84,2% | 83,8% |
| Pomorskie | 86,5% | 85,2% |
| Kujawsko-pomorskie | 87,4% | 87,5% |
| Podkarpackie | 88,4% | 87,6% |
| Małopolskie | 88,6% | 88,0% |
| Śląskie | 89,0% | 87,8%|
| Dolnośląskie | 89,2% | 87,5% |
| Warmińsko-mazurskie | 89,5% | 88,5% |
| Opolskie | 90,8% | 89,9% |
| Zachodniopomorskie | 90,9% | 88,0% |
| Świętokrzyskie | 92,6% | 92,0% |
| Wielkopolskie | 92,6% | 91,2% |
| Łódzkie | 93,4% | 92,8% |
| Lubuskie | 95,8% | 95,6% |

- 2025-09-11 - pierwszy odczyt
- 2026-04-04 - 3 dni po premierze na forum VeloPlaner

🎯 **Cel projektu**: zmniejszyć te wartości poprzez zachęcenie społeczności do dodawania ocen jakości dróg!

📊 **[Zobacz aktualne statystyki changesetów →](https://resultmaps.neis-one.org/osm-changesets?comment=Asfalt_Premium)**

---

## 🤝 Rozwój i contributing

Projekt jest otwarty na kontrybucje! Jeśli chcesz pomóc:

1. **🐛 Zgłaszanie błędów**: Użyj [Issues na GitHubie](https://github.com/volago/asphalt-premium/issues)
2. **💡 Propozycje funkcji**: Otwórz Issue z opisem funkcjonalności
3. **🔧 Pull requesty**: Mile widziane!

> 🛠️ Informacje dla deweloperów (uruchomienie, konfiguracja, architektura): **[DEVELOPMENT.md](DEVELOPMENT.md)**

---

## 📜 Licencja

- **Kod aplikacji**: Open source
- **Dane OSM**: [ODbL (Open Database License)](https://opendatacommons.org/licenses/odbl/) — © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

## 👤 Autor i kontakt

- **Autor**: [Volago](https://github.com/volago)
- **Cel projektu**: Uzupełnienie danych o jakości dróg w [OpenStreetMap](https://www.openstreetmap.org) dla społeczności cyklistów w Polsce

---

## 🔗 Przydatne linki

- 🔗 [Asfalt Premium — aplikacja](https://volago.github.io/asphalt-premium/)
- 📊 [Statystyki changesetów Asfalt Premium](https://resultmaps.neis-one.org/osm-changesets?comment=Asfalt_Premium)
- 💬 [Forum społeczności OSM Polska](https://community.openstreetmap.org/c/communities/pl/40)
- 📖 [OpenStreetMap Wiki — smoothness](https://wiki.openstreetmap.org/wiki/Key:smoothness)
- 📱 [StreetComplete (Android)](https://play.google.com/store/apps/details?id=de.westnordost.streetcomplete)
- 🔑 [Konfiguracja OAuth](OAUTH_SETUP.md)
- 📚 [OverpassAPI](https://wiki.openstreetmap.org/wiki/Overpass_API)
- 🗺️ [Leaflet.js](https://leafletjs.com/)

---

**Dziękujemy za korzystanie z Asfalt Premium! 🚴‍♂️🗺️**
