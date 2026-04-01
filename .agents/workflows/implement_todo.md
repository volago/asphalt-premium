---
description: Implementuje kolejną funkcjonalność z pliku TODO.MD
---

Wykonaj poniższe kroki, aby poprawnie zaimplementować i spakować kolejną z zaplanowanych funkcjonalności:

1. **Wczytaj zadanie**: Przeczytaj zawartość pliku `TODO.MD` za pomocą narzędzia `view_file` i wybierz pierwszy dostępny punkt (tj. najnowszą/pierwszą niezrealizowaną funkcjonalność). Jeśli użytkownik podał w parametrze workloadu namiar na inny niż pierwszy punkt, to zaimplementuj funkcjonalność żądaną przez użytkownika


2. **Analiza i Planowanie**: Jeśli zadanie tego wymaga (np. większa zmiana, nowa złożona struktura), wejdź w *Planning Mode*. Przeanalizuj odpowiednie pliki `HTML`, `JS` i `CSS`, by zrozumieć w jaki sposób dodać lub zintegrować proponowane rozwiązanie w kodzie projektu.

3. **Przygotowanie planu**: W ramach przygotowanego `implementation_plan.md` zawrzyj wszystkie niezbędne modyfikacje w plikach i poproś użytkownika o zgodę na ich realizację. 
- pamiętaj o podstawowych zasadach programowania, utrzymuj małe pliki, nowe funkcjonalności staraj się lukować w nowe moduły, style, które można użyć ponownie wydzielaj do osobnych plików

4. **Implementacja**: Po akceptacji przystąp do modyfikacji plików w projekcie. Podążaj za spójnymi konwencjami językowymi oraz istniejącą architekturą UI aplikacji (np. pop-upy, stylowanie okienek modalnych, modułowość kontrolerów).

5. **Czyszczenie `TODO.MD`**: Po udanej modyfikacji kodu i przetestowaniu rozwiązania, użyj narzędzia `replace_file_content` by usunąć z pliku `TODO.MD` zrealizowany punkt. Zaktualizuj plik `RELEASES.MD` by uwzględnić właśnie dodaną nową możliwość lub optymalizację.

6. **Raport**: Zaprezentuj podsumowanie wykonanego zadania (np. poprzez `walkthrough.md`).