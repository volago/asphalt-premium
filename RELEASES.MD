1.8.0 (2026-08-29)
Feature: Wyodrębniono jakość dróg `intermediate` jako samodzielną kategorię (Średnia jakość). Otrzymała ona dedykowany pomarańczowy styl na mapie i w interfejsie oraz osobny pasek procentowy w statystykach.

1.7.0 (2026-06-10)
Feature: Na urządzeniach mobilnych zaznaczanie odcinków dróg jest teraz addytywne — każde kliknięcie dodaje kolejny odcinek do zaznaczenia (bez potrzeby przytrzymywania Ctrl). Kliknięcie w mapę poza drogą nie czyści zaznaczenia, by uniknąć przypadkowych dotknięć. Na mapie pojawia się przycisk „Wyczyść zaznaczenie" umożliwiający ręczne wyczyszczenie. Zachowanie na desktopie nie ulega zmianie.

1.6.0 (2026-05-05)
Feature: Dodano możliwość ustawiania rodzaju nawierzchni (surface=asphalt) na drogach trzeciorzędnych i niesklasyfikowanych. Drogi bez tagu surface wyświetlane są niebieskimi przerywanymi liniami. Po kliknięciu na taką drogę otwiera się panel boczny z opcją oznaczenia drogi jako asfaltowej. Obsługuje zaznaczanie wielu odcinków i zapis hurtowy. Drogi asfaltowe i drogi bez nawierzchni nie mogą być zaznaczane jednocześnie.

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
