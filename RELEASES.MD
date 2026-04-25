1.5.0 (2026-04-25)
Feature: Podczas importu śladu GPX można teraz zaznaczyć opcję "Wczytaj drogi w obszarze śladu". Po jej zaznaczeniu aplikacja automatycznie pobiera drogi z Overpass API w obszarze bounding box śladu i wyświetla je na mapie — bez konieczności ręcznego wyboru województwa czy zoomu.

1.4.0 (2026-04-24)
Feature: Po kliknięciu na odcinek drogi widoczna jest teraz data ostatniej modyfikacji jakości nawierzchni.

1.3.1 (2026-04-23)
Fix: Zapytania Overpass filtrują teraz wyłącznie drogi asfaltowe (surface=asphalt). Drogi betonowe, paved oraz gruntowe nie są już wyświetlane.

1.3.0 (2026-04-19)
Feature: Dodano funkcję "Importuj GPX". Umożliwia wczytanie pliku GPX z wbudowaną trasą, nakładając go na mapę w postaci szerokiego czarnego pasa z wysoką przezroczystością jako warstwę pomocniczą (nieklikalną), aby ułatwić i przyśpieszyć proces oceny fragmentów dróg OSM po odbytej wycieczce.

1.2.1 (2026-04-06)
Fix: Zapis drogi o tej samej jakości (x -> x) jest blokowany z informacyjnym komunikatem. W oknie potwierdzenia zapisu dla wielu odcinków wyświetlana jest teraz informacja, ile z nich zostanie pominięte (bo już mają wybraną wartość).

1.2.0
Dodano możliwość zaznaczania wielu odcinków drogi z przytrzymanym klawiszem Ctrl/Meta. Umożliwia to hurtową ocenę stanu kilkunastu dróg naraz, co przyspiesza pracę, korzystając z jednego wspólnego zapisu w OSM.

1.1.0
Dodano przycisk "Nowości" oraz moduł powiadomień. Użytkownik widzi od teraz nowo wprowadzone funkcjonalności.

1.0.0
General release
