# 🕸️ Pavúk LM 26/27

Appka na sledovanie a zaznamenávanie **Ligy majstrov 2026/27** — pre otca a syna
na jednu celú sezónu. Zapisujeme výsledky, tipujeme si zápasy dopredu, sledujeme
cestu tímov pavúkom až do finále a na konci si z toho vygenerujeme kroniku.

Všetko beží **lokálne v prehliadači**. Žiadny server, žiadne prihlasovanie,
žiadny účet. Dáta sú uložené v tvojom zariadení (IndexedDB) a appka funguje aj
bez internetu.

---

## Čo appka vie

| | |
|---|---|
| **Kolá** | Všetkých 8 hracích kôl, rýchle zadanie výsledku veľkými +/− tlačidlami — dva kliky a je to. |
| **Tabuľka** | Živá tabuľka 36 tímov s farebnými pásmi (1.–8. zelená, 9.–24. žltá, 25.–36. sivá), filtre a detail tímu s grafom vývoja pozície. |
| **Pavúk** | Interaktívny SVG pavúk od play-off po finále. Priblíženie prstami, posúvanie, automatický postup víťaza, zvýraznenie cesty nášho tímu a režim „Čo ak…". |
| **Tipovačka** | Viac profilov, tipy na presný výsledok pred každým kolom, zámok pri prvom výkope, rebríček, vyhodnotenie kola „ako otváranie balíčka", veľká predpoveď sezóny a odznaky. |
| **Kronika** | Pri každom zápase „pozerali sme spolu", hviezdičky, moment zápasu, poznámka a fotka. Na konci jedno tlačidlo → kompletná kronika sezóny ako HTML/PDF. |
| **Navyše** | Monte Carlo kalkulačka šancí na postup, export do kalendára (.ics), upozornenia pred zápasom, detský režim, záloha a obnova celej sezóny. |

---

## Ako to spustiť

Potrebuješ [Node.js](https://nodejs.org/) 18+.

```bash
cd lm2627
npm install
npm run dev      # vývojový server, adresa sa vypíše (zvyčajne http://localhost:5173)
```

Ďalšie príkazy:

```bash
npm run build      # produkčná verzia do lm2627/dist
npm run preview    # náhľad produkčnej verzie
npm test           # testy výpočtov (tabuľka, pavúk, tipovačka, validátor)
npm run typecheck  # kontrola typov
```

### Nasadenie

`npm run build` vyrobí statickú stránku v `lm2627/dist`. Obsah tohto priečinka
nahraj kamkoľvek — Vercel, Netlify, Cloudflare Pages, GitHub Pages. Appka
používa relatívne cesty, takže funguje aj v podpriečinku.

V tomto repozitári je hotový build priložený v `lm2627-app/`, takže sa dá
otvoriť rovno cez GitHub Pages.

### Inštalácia do telefónu

Otvor stránku v prehliadači a daj **„Pridať na plochu"**. Appka sa nainštaluje
ako PWA, má vlastnú ikonu a funguje offline.

---

## Ako naimportovať rozpis zápasov

Rozpis 144 zápasov **nie je v appke predvyplnený** — zverejňuje ho UEFA po žrebe
(27. 8. 2026) a nemá zmysel ho hádať.

1. Otvor **Nastavenia → Import rozpisu** (alebo tlačidlo na prázdnej obrazovke).
2. Vlož JSON alebo CSV, prípadne vyber súbor.
3. Appka rozpis **skontroluje** a ukáže, čo nesedí. Uložiť sa dá až keď je
   validátor spokojný (alebo natvrdo cez „Uložiť aj tak").

### Čo validátor kontroluje

- presne **144 zápasov**, **18 v každom z 8 kôl**
- každý tím hrá **8 zápasov**: **4 doma + 4 vonku**
- každý tím má **2 súperov z každého koša**
- žiadny súper sa neopakuje, nikto nehrá dvakrát v tom istom kole
- všetky `id` tímov existujú, dátumy sedia do termínov kôl (len upozornenie)

### Formát

JSON — pole zápasov:

```json
[
  {
    "matchday": 1,
    "date": "2026-09-08T19:00:00Z",
    "homeId": "psg",
    "awayId": "slovan"
  }
]
```

CSV — hlavička a riadky:

```csv
matchday,date,homeId,awayId
1,2026-09-08T19:00:00Z,psg,slovan
```

Namiesto `id` môžeš použiť aj skratku (`PSG`) alebo celý názov tímu —
aj bez diakritiky. Ak už poznáš výsledok, pridaj `homeScore` a `awayScore`.
Zoznam `id` všetkých 36 tímov je v `src/data/teams.json`.

### Ukážkový rozpis

Kým ten skutočný nie je k dispozícii, na obrazovke Import si vieš vygenerovať
**ukážkový** rozpis. Dodržiava všetky pravidlá žrebu, takže sa na ňom dá appka
poriadne vyskúšať — ale sú to **vymyslené zápasy** a appka ti to bude
pripomínať oranžovým pásom, kým ho nezmažeš.

---

## Ako naplniť pavúk

Pavúk sa dá používať aj úplne prázdny. Keď je ligová fáza dohraná:

- **„Nasadiť podľa tabuľky"** predvyplní pozície (9. proti 24., 10. proti 23. …
  a tímy 1.–8. do osemfinále).
- Skutočný žreb play-off je náhodný, takže tímy si v každom dvojzápase vieš
  prehodiť ručne v jeho detaile.
- Víťaz sa po zadaní oboch zápasov (prípadne predĺženia a penált) **automaticky
  posunie** do ďalšieho kola.

---

## Kde sa čo mení

| Chcem zmeniť | Súbor |
|---|---|
| Poradie kritérií pri rovnosti bodov | `src/config/rules.ts` (`tiebreakers`) |
| Bodovanie tipovačky | `src/config/rules.ts` (`SCORING`) |
| Termíny kôl a vyraďovacej fázy | `src/config/calendar.ts` |
| Tímy, koše, farby, erby | `src/data/teams.json` |
| Nasadenie a tvar pavúka | `src/config/bracketTopology.ts` |
| Parametre simulácie | `src/config/simulation.ts` |
| Odznaky | `src/config/badges.ts` + `src/lib/badges.ts` |

---

## Zálohovanie

Dáta sú len v tomto zariadení. V **Nastaveniach → Bezpečnosť dát**:

- **Exportovať sezónu** — jeden JSON súbor so všetkým (aj s fotkami a poznámkami).
- **Importovať zálohu** — obnoví presne ten istý stav.
- **História** — appka si sama pamätá posledných 10 stavov, dá sa vrátiť späť.

Rob si export občas. Je to jediná poistka proti vymazaniu dát prehliadača.

---

## Čo ešte nie je overené

Pozri `NOTES.md` — sú tam všetky veci, ktoré sa nedali overiť a treba ich
skontrolovať v oficiálnom reglemente UEFA.
