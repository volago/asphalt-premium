---
description: Implementuje issue z Github
---

Wykonaj poniższe kroki, aby poprawnie zaimplementować kolejną z zaplanowanych funkcjonalności:

1. Sprawdź czy w parametrze workflow użytkownik podał numer albo link do issue. Jeśli nie, to napisz, że jest to wymagane i zakończ działanie.

2. Jeśli coś jest dla Ciebie niezrozumiałe, to nie wahaj się dopytać i ustalić szczegóły.

3. **Analiza i Planowanie**: Jeśli zadanie tego wymaga (np. większa zmiana, nowa złożona struktura), wejdź w *Planning Mode*. Przeanalizuj odpowiednie pliki `HTML`, `JS` i `CSS`, by zrozumieć w jaki sposób dodać lub zintegrować proponowane rozwiązanie w kodzie projektu.

4. **Przygotowanie planu**: W ramach przygotowanego `implementation_plan.md` zawrzyj wszystkie niezbędne modyfikacje w plikach i poproś użytkownika o zgodę na ich realizację. 
- pamiętaj o podstawowych zasadach programowania, utrzymuj małe pliki, nowe funkcjonalności staraj się lokować w nowe moduły, style, które można użyć ponownie wydzielaj do osobnych plików
- używaj już gotowych styli jeśli istnieją, np. przyciski;

5. **Implementacja**: Po akceptacji przystąp do modyfikacji plików w projekcie. Podążaj za spójnymi konwencjami językowymi oraz istniejącą architekturą UI aplikacji (np. pop-upy, stylowanie okienek modalnych, modułowość kontrolerów).

6. Jeśli zmiana jest na poziomi major lub minor, to zaktualizuj plik `RELEASES.MD` by uwzględnić właśnie dodaną nową możliwość lub optymalizację. Jeśli nie masz pewności jakiego rozmiatu jest zmiana, to dopytaj.

7. Jeśli trzeba, to uakrualnij pliki `README.md`, `INSTRUKCJA.md` oraz `DEVELOPMENT.md`

8. **Raport**: Zaprezentuj podsumowanie wykonanego zadania (np. poprzez `walkthrough.md`).