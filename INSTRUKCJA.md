# 📖 Instrukcja użytkowania

> Pełna instrukcja korzystania z aplikacji [Asfalt Premium](https://volago.github.io/asphalt-premium/)

## 🧭 Podstawowa nawigacja

1. **Przy pierwszym uruchomieniu:**
   - Aplikacja automatycznie wyświetla overlay „O projekcie" z instrukcjami
   - Kliknij „Zobacz mapę" aby przejść do mapy

2. **Wybór województwa:**
   - W bocznym panelu (sidebar) wybierz województwo z listy rozwijanej
   - Lista zawiera wszystkie 16 województw

3. **Ładowanie danych:**
   - **Metoda A (Województwa):** Wybierz województwo z listy. Dane załadują się automatycznie, a mapa dopasuje się do granic regionu.
   - **Metoda B (Lokalnie):** Przesuń mapę w interesujące Cię miejsce (wymagany zoom > 11) i kliknij przycisk „Wczytaj drogi" widoczny na mapie.
   - **Odświeżanie:** Kliknij „Odśwież" w panelu bocznym. Pozycja mapy zostanie zachowana.
   - **Cache:** Dane są zapisywane lokalnie (cache 3 dni) dla szybkiego dostępu.

4. **Nawigacja po mapie:**
   - Użyj przycisków zoom lub scroll myszy do zmiany przybliżenia
   - Przeciągaj mapę aby przesuwać widok
   - Drogi stają się bardziej widoczne przy większym przybliżeniu (zoom > 7)

## 👁️ Kontrola widoczności warstw

- **Ikony oka w legendzie** — kliknij aby pokazać/ukryć drogi danego typu:
  - 👁️ Doskonała jakość (czarna ciągła)
  - 👁️ Dobra jakość (czarna przerywana)
  - 👁️ Słaba jakość (czerwona)
  - 👁️ Brak danych (niebieska)

## 🔍 Przeglądanie szczegółów drogi

1. **Kliknij na drogę** na mapie
2. **Otworzy się panel boczny** z informacjami:
   - Nazwa drogi
   - Obecna jakość nawierzchni
   - Typ drogi (highway tag)
   - OSM ID
3. **Widoczne markery** — fioletowe punkty na początku i końcu odcinka
4. **Podświetlenie** — wybrana droga jest zaznaczona na fioletowo
5. **Zamknięcie panelu** — kliknij ✕ lub kliknij w puste miejsce na mapie

## ✏️ Edycja jakości drogi (wymaga logowania)

1. **Zaloguj się do OSM:**
   - Kliknij przycisk „Zaloguj do OSM" w prawym górnym rogu (toolbar)
   - Zostaniesz przekierowany do OpenStreetMap
   - Zaloguj się swoim kontem i autoryzuj aplikację
   - Po zalogowaniu zobaczysz swoją nazwę użytkownika w toolbarze

2. **Wybierz drogę do edycji:**
   - Kliknij na wybraną drogę na mapie
   - Otworzy się panel boczny z informacjami o drodze

3. **Wybierz jakość nawierzchni:**
   - W galerii kliknij na odpowiednią opcję (5 głównych opcji)
   - Każda opcja ma: obraz przykładowy, nazwę i opis
   - Dostępne opcje: Doskonała, Dobra, Średnia, Słaba, Bardzo słaba

4. **Zapisz zmiany:**
   - Kliknij przycisk „Zapisz"
   - W oknie potwierdzenia sprawdź zmiany
   - Potwierdź klikając „Potwierdź"
   - Aplikacja automatycznie utworzy changeset w OSM, zaktualizuje dane i odświeży mapę

5. **Edycja bezpośrednio w OSM:**
   - Kliknij przycisk „Edytuj w OSM" aby otworzyć edytor iD na openstreetmap.org
   - Możesz edytować wszystkie tagi drogi ręcznie

## ⚡ Edycja wielu odcinków naraz

> 💡 **Porada:** Przytrzymaj **Ctrl** (⌘ na Mac) i klikaj na drogi, aby zaznaczyć wiele odcinków jednocześnie.

- Zaznaczone drogi podświetlą się na fioletowo
- W panelu bocznym zobaczysz liczbę zaznaczonych odcinków
- Wybierz jakość i zapisz — wszystkie odcinki zostaną zaktualizowane w jednym changesetcie
- Aby odznaczyć odcinek, kliknij na niego ponownie z wciśniętym **Ctrl**

## 🗺️ Import pomocniczego śladu GPX

Aby ułatwić ocenę jakości dróg po powrocie z wycieczki rowerowej, możesz zaimportować zapisany ślad GPX:

1. W lewym panelu bocznym kliknij przycisk **„Importuj GPX"**.
2. Wybierz plik z dysku (`.gpx`).
3. Ślad zostanie nałożony na mapę w postaci szerokiego, ciemnego pasa z wysoką przezroczystością, tak by nie zasłaniał elementów do edytowania. Mapa automatycznie przybliży się do dodanego elementu.
4. Po zakończeniu oceny odcinków kliknij **„Usuń trasę GPX"**, by wyczyścić mapę.

### 🚗 Automatyczne ładowanie dróg w obszarze śladu

Jeśli interesujące Cię drogi nie są jeszcze załadowane na mapie (np. nie wybrałeś województwa), możesz pobrać je automatycznie razem ze śladem GPX:

1. Przed kliknięciem „Importuj GPX" zaznacz opcję **„Wczytaj drogi w obszarze śladu"**.
2. Wczytaj plik GPX jak zwykle.
3. Po narysowaniu śladu aplikacja automatycznie pobierze drogi z obszaru obejmującego całą trasę i wyświetli je na mapie.

> ⚠️ **Uwaga:** Dla bardzo długich tras (kilkaset km) pobieranie dróg może zająć chwilę lub zwrócić dużo wyników. W takim przypadku rozważ ładowanie danych po województwach.

## 📊 Statystyki

Panel boczny pokazuje automatycznie wygenerowane statystyki dla załadowanego regionu:

- Procent dróg bez oceny jakości (niebieskie)
- Rozkład procentowy poszczególnych ocen jakości
- Liczby aktualizują się po każdym załadowaniu danych
