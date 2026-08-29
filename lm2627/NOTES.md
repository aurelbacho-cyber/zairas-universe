# NOTES — čo nie je overené

Zoznam vecí, ktoré som **nevedel overiť** a preto som ich nehádal, ale spravil
konfigurovateľné. Každá položka hovorí, kde sa to mení a čo si treba pozrieť.

---

## 1. Presné poradie kritérií pri rovnosti bodov ⚠️

**Kde:** `src/config/rules.ts` → `tiebreakers`

Predvolené poradie:

1. Body
2. Gólový rozdiel
3. Strelené góly
4. Strelené góly vonku
5. Počet výhier
6. Výhry vonku
7. Disciplinárne body
8. Klubový koeficient

**Toto treba overiť v aktuálnom reglemente UEFA pre 2026/27.** Poradie sa medzi
sezónami menilo. Zmena je jednoduchá — stačí prehádzať položky v tom poli,
tabuľka aj všetky testy idú podľa neho.

## 2. Disciplinárne body sa nikde nezadávajú

**Kde:** `src/lib/standings.ts` → `disciplinaryPoints` je vždy `0`

Appka nikde neeviduje karty, takže tento tiebreaker reálne nič nerozhodne.
Ak by na ňom niekedy záležalo, treba pridať zadávanie kariet k zápasu.

## 3. Klubové koeficienty nie sú vyplnené

**Kde:** `src/data/teams.json` → `"coefficient": null`

Nemám overené hodnoty, tak sú prázdne (počítajú sa ako 0). Ak ich chceš,
doplň ich ručne — sú posledným kritériom v tabuľke.

## 4. Nasadenie play-off (9.–24.) ⚠️

**Kde:** `src/config/bracketTopology.ts` → `PLAYOFF_PAIRS`

Predpokladám, že tímy z miest **9.–16. sú nasadené** a hrajú proti tímom
z miest **17.–24.**, pričom nasadený hrá odvetu doma. Dvojice sú
9–24, 10–23, 11–22, 12–21, 13–20, 14–19, 15–18, 16–17.

**Presný mechanizmus žrebu (ktoré dvojice sa môžu stretnúť) som neoveril.**
Skutočný žreb je aj tak náhodný, takže tímy si v appke vieš v každom
dvojzápase prehodiť ručne. Tabuľka `PLAYOFF_PAIRS` slúži len na predvyplnenie.

## 5. Ktorý víťaz play-off ide proti komu v osemfinále ⚠️

**Kde:** `src/config/bracketTopology.ts` → `R16_PAIRS`

Predvolene ide tím z 1. miesta proti víťazovi dvojzápasu 16.–17., tím z 2.
miesta proti víťazovi 15.–18. a tak ďalej. Poradie nasadených v pavúku je
1, 8, 4, 5, 3, 6, 2, 7 (zhora nadol) — to je štandardný „tenisový" tvar, ktorý
zaručí, že sa prvý a druhý tím môžu stretnúť najskôr vo finále (a to overené
je, je to v zadaní).

**Konkrétne priradenie víťazov play-off k osemfinálovým dvojiciam treba overiť**
po zverejnení žrebu 26. 2. 2027 a prípadne prepísať v tom poli.

## 6. Presné výkopy zápasov

**Kde:** `src/config/calendar.ts` → `MATCHDAYS`, `KNOCKOUT_ROUNDS`

Mám len **termínové okná** zo zadania (napr. „13. / 14. október 2026"), nie časy
jednotlivých zápasov. Presné výkopy prídu spolu s rozpisom pri importe — appka
ich preberie zo súboru. Validátor len upozorní (nie chyba), keď dátum zápasu
nesedí do okna svojho kola.

Ukážkový rozpis si časy vymýšľa (18:45 / 21:00 SEČ) — sú fiktívne.

## 7. Farby klubov sú približné

**Kde:** `src/data/teams.json` → `colors`

Erby ani logá klubov v appke zámerne nie sú (nemám na ne práva ani overené
súbory). Tímy sa kreslia ako farebná dlaždica so skratkou. Farby som odhadol
podľa klubových dresov — pokojne si ich uprav. Ak chceš skutočný erb, doplň
tímu `"crestUrl": "https://…"`.

## 8. Slovenské názvy tímov

**Kde:** `src/data/teams.json` → `name`

Použil som názvy zo zadania (Neapol, AS Rím, RB Lipsko, Bayern Mníchov,
Šachtar Doneck…). Pri PSG som zvolil „Paríž Saint-Germain". Ak sa ti niektorý
názov nepáči, je to jeden riadok v JSON-e.

## 9. „Favorit" pri bonusovom bode za prekvapenie — vlastná definícia

**Kde:** `src/lib/strength.ts` → `favouriteOf`, `src/config/rules.ts` → `SCORING.upsetBonus`

Zadanie hovorí: *bonus +1 za trafený presný výsledok v zápase, kde bol favorit
porazený*. Nikde ale nie je napísané, kto je „favorit" — tak som to definoval
takto:

- favorit = tím s vyšším očakávaným počtom gólov v tom zápase (model sily
  z koša + doterajších výsledkov, vrátane výhody domáceho prostredia),
- ak sú tímy takmer vyrovnané (rozdiel < 0,15 gólu), favorit **nie je** a bonus
  sa nedáva,
- remíza nie je prekvapenie — favorit musí zápas prehrať.

Je to naše pravidlo, nie oficiálne. Mení sa na jednom mieste.

## 10. Model sily tímov je hračka, nie predpoveď

**Kde:** `src/config/simulation.ts`

Očakávané góly podľa koša + váha doterajších výsledkov + výhoda domáceho
prostredia, góly sa losujú z Poissonovho rozdelenia. Čísla som odhadol tak, aby
dávali rozumné výsledky — nie sú kalibrované na reálne dáta. Kalkulačka
scenárov je zábava a orientačný odhad, nie stávková predikcia.

## 11. Upozornenia fungujú len kým je appka otvorená

**Kde:** `src/lib/notifications.ts`

Bez servera sa nedá poslať skutočná push notifikácia. Appka si nastaví časovač
na 60 minút pred výkopom zápasu obľúbeného tímu — ale zafunguje len ak je
appka v tom čase otvorená (prípadne na pozadí, podľa prehliadača), a len pre
zápasy do ~20 dní dopredu. Na spoľahlivé pripomienky použi radšej export do
kalendára (`.ics`).

## 12. Fotky sa zmenšujú

**Kde:** `src/lib/photo.ts`

Fotky sú uložené priamo v dátach sezóny (aj v exportnom JSON-e), takže sa pred
uložením zmenšia na max. 1024 px a JPEG kvalitu 0,72. Inak by mala záloha
stovky megabajtov.

## 13. Držiteľ trofeje

Obhajca titulu je PSG (vo finále 2026 zdolal Arsenal) — je to v zadaní, ale
appka to nikde nepoužíva. Ak by sa to hodilo (napr. odznak alebo poznámka
v kronike), treba to doplniť.

---

## Čo je naopak overené a v appke pevne zapísané

Toto je priamo zo zadania a testami pokryté:

- 36 tímov, 8 zápasov na tím (4 doma + 4 vonku), 2 súperi z každého koša,
  144 zápasov, 18 na kolo, 8 kôl
- výhra 3 / remíza 1 / prehra 0
- 1.–8. priamo do osemfinále, 9.–24. play-off, 25.–36. koniec v Európe
  (bez prestupu do Európskej ligy)
- termíny všetkých kôl a vyraďovacích fáz, finále 5. 6. 2027 v Madride
- vo vyraďovacej fáze **neplatí** pravidlo gólov na ihrisku súpera; pri
  rovnosti nasleduje predĺženie a potom penalty
- tímy z top 8 hrajú odvetu doma
- pavúk je od osemfinále predurčený, 1. a 2. tím sú v opačných poloviciach
- zloženie všetkých štyroch košov zo žrebu 27. 8. 2026
