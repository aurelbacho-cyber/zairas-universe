# Dáta

## `teams.json`

Všetkých 36 tímov ligovej fázy 2026/27 aj s košmi zo žrebu (27. 8. 2026, Monako).
Farby sú **približné** klubové farby — pokojne si ich uprav. Erby zámerne nie sú
súčasťou: každý tím sa vykresľuje ako farebná dlaždica so skratkou. Ak chceš erb,
doplň k tímu `"crestUrl": "https://..."`.

`"coefficient": null` — klubový koeficient (posledný tiebreaker) nie je overený,
doplň ho ručne alebo ho nechaj `null` (počíta sa ako 0).

## `fixtures.json`

**Zámerne prázdne.** Rozpis 144 zápasov nie je vymyslený — stiahni si ho z
uefa.com po zverejnení a naimportuj cez obrazovku *Import* (JSON alebo CSV).
Validátor skontroluje, či rozpis sedí (144 zápasov, 8 na tím, 4 doma + 4 vonku,
2 súperi z každého koša, žiadny duplicitný súper).

### Schéma jedného zápasu

```json
{
  "id": "md1-psg-slovan",
  "matchday": 1,
  "date": "2026-09-08T21:00:00.000Z",
  "homeId": "psg",
  "awayId": "slovan",
  "status": "scheduled"
}
```

`id` si môžeš zvoliť ľubovoľne (musí byť unikátne). `homeId` a `awayId` musia
zodpovedať `id` z `teams.json`. Ostatné polia (`score`, `watchedTogether`,
`rating`, `note`, ...) dopĺňa appka sama.

### CSV variant

```
matchday,date,homeId,awayId
1,2026-09-08T21:00:00Z,psg,slovan
```
