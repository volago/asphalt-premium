# OAuth Setup Instructions

## Rejestracja aplikacji w OSM Dev Server

Aby aplikacja mogła edytować dane w OpenStreetMap, musisz zarejestrować aplikację OAuth2.

### Krok 1: Zaloguj się do OSM Dev Server

Przejdź do: https://master.apis.dev.openstreetmap.org/
- Zaloguj się swoim kontem (lub utwórz nowe konto testowe)

### Krok 2: Utwórz nową aplikację OAuth2

1. Przejdź do: https://master.apis.dev.openstreetmap.org/oauth2/applications
2. Kliknij "Register new application" (Zarejestruj nową aplikację)

### Krok 3: Wypełnij formularz

Użyj następujących wartości:

- **Name** (Nazwa): `Asphalt Premium Dev` (lub dowolna nazwa)
- **Redirect URIs** (URI przekierowania): 
  ```
  http://127.0.0.1:8081/
  ```
  ⚠️ **WAŻNE:** Użyj **127.0.0.1** a NIE localhost! OSM wymaga HTTPS dla wszystkich URI **OPRÓCZ** `http://127.0.0.1`
  
- **Confidential**: **NIE** (UNCHECKED) 
  - ⚠️ To bardzo ważne! Dla aplikacji statycznych (PKCE) musi być NIE
  
- **Scopes** (Zakresy uprawnień):
  - ✅ `read_prefs` - odczyt preferencji użytkownika
  - ✅ `write_api` - edycja mapy

### Krok 4: Zapisz aplikację

Po zapisaniu aplikacji otrzymasz **Client ID** (np. `abc123def456...`)

### Krok 5: Skopiuj Client ID do konfiguracji

1. Otwórz plik `js/config.js`
2. Znajdź sekcję `CLIENT_ID_DEV`:
   ```javascript
   CLIENT_ID_DEV: 'YOUR_CLIENT_ID_HERE',
   ```
3. Zamień `YOUR_CLIENT_ID_HERE` na swój Client ID:
   ```javascript
   CLIENT_ID_DEV: 'twoj-client-id-z-osm',
   ```

**Ważne:** To jest Client ID dla **serwera deweloperskiego**. 

Gdy będziesz gotowy wdrożyć aplikację na produkcję:
- Zarejestruj nową aplikację na https://www.openstreetmap.org/oauth2/applications
- Użyj swojego właściwego URL produkcyjnego jako Redirect URI (np. `https://twoja-domena.com/`)
- Skopiuj Client ID do `CLIENT_ID_PROD` w `config.js`
- Zmień `REDIRECT_URI_PROD` na swój URL produkcyjny

### Krok 6: Zapisz i przetestuj

1. Zapisz plik `js/config.js`
2. Odśwież aplikację w przeglądarce
3. Kliknij na drogę i spróbuj "Zaloguj się aby edytować"

## Dla produkcji

Gdy będziesz gotowy do użycia produkcyjnego serwera OSM:

1. Zarejestruj aplikację na: https://www.openstreetmap.org/oauth2/applications
2. Użyj tego samego procesu jak powyżej
3. W `js/config.js` zmień:
   ```javascript
   USE_DEV_SERVER: false,
   ```
4. Dodaj nowy Client ID dla produkcji (możesz mieć osobny CLIENT_ID_DEV i CLIENT_ID_PROD)

## Rozwiązywanie problemów

### Błąd: "Client authentication failed"
- Upewnij się, że Client ID jest prawidłowy
- Sprawdź czy Redirect URI dokładnie pasuje (włącznie z trailing slash `/`)
- Sprawdź czy aplikacja ma zaznaczone "Confidential: NO"

### Błąd: "must be an HTTPS/SSL URI"
- OSM wymaga HTTPS dla wszystkich Redirect URI
- **Wyjątek:** `http://127.0.0.1` jest akceptowany dla rozwoju lokalnego
- **NIE używaj** `http://localhost` - to nie zadziała!
- Zawsze używaj `http://127.0.0.1:8081/` dla developmentu

### Błąd: "Invalid redirect URI"
- Redirect URI musi dokładnie pasować
- Używaj `http://127.0.0.1:8081/` (NIE localhost!)
- Upewnij się, że kończy się slashem `/`

### Testowanie z różnymi portami
Jeśli używasz innego portu niż 8081:
1. Dodaj nowy URI do aplikacji OAuth (np. `http://127.0.0.1:8080/`)
2. Lub zmień `REDIRECT_URI_DEV` w config.js na konkretny URL

---

## Konfiguracja dla Produkcji

Gdy będziesz gotowy wdrożyć aplikację na serwer produkcyjny:

### 1. Zarejestruj aplikację na produkcyjnym OSM

1. Przejdź do: https://www.openstreetmap.org/oauth2/applications
2. Zaloguj się swoim kontem OSM (produkcyjnym)
3. Kliknij "Register new application"
4. Wypełnij formularz:
   - **Name**: `Asphalt Premium` (nazwa produkcyjna)
   - **Redirect URI**: `https://twoja-domena.com/` (Twój rzeczywisty URL produkcyjny)
   - **Confidential**: **NIE** (unchecked)
   - **Scopes**: ✅ `read_prefs` ✅ `write_api`
5. Kliknij "Create"
6. Skopiuj **Client ID**

### 2. Zaktualizuj config.js

W pliku `js/config.js` znajdź sekcję produkcyjną i zaktualizuj:

```javascript
// === PRODUCTION SERVER ===
CLIENT_ID_PROD: 'twoj-produkcyjny-client-id',
REDIRECT_URI_PROD: 'https://twoja-domena.com/',
```

### 3. Przełącz na produkcję

W `js/config.js` zmień flagę:

```javascript
OSM_API: {
    USE_DEV_SERVER: false,  // ← Zmień na false
    // ...
}
```

⚠️ **WAŻNE:** Nie zapomnij wrócić do `USE_DEV_SERVER: true` podczas dalszego developmentu!

### 4. Testuj na produkcji

Po wdrożeniu:
1. Otwórz aplikację na produkcyjnym URL
2. Kliknij drogę
3. Zaloguj się - zostaniesz przekierowany na www.openstreetmap.org
4. Po zalogowaniu wrócisz do aplikacji
5. Wybierz jakość drogi i zapisz
6. Sprawdź na OSM czy zmiana została zapisana

---

## Bezpieczeństwo

- ✅ Client ID można bezpiecznie pokazywać publicznie (to nie jest secret)
- ✅ PKCE zapewnia bezpieczeństwo bez client secret
- ✅ Token jest przechowywany w sessionStorage (usuwa się po zamknięciu przeglądarki)
- ⚠️ Dla aplikacji statycznych NIE używaj "Confidential: YES"

