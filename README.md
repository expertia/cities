# VS — IDIOTSKÝ TURNAJ ⚽🤪

Arkádová fotbalová hra (čisté HTML5 + Canvas, žádné závislosti). Mistrovství světa
parodující turnaj se **16 zeměmi**, kde **každý hráč má jednu „vadu na kráse"** —
modré vlasy, jedno oko, obří nos, zelenou kůži, srostlé obočí, lesklou pleš…

## Jak spustit

Otevři `index.html` v prohlížeči. Žádná instalace, žádný server — funguje rovnou
z disku. (Volitelně lze posloužit i přes libovolný statický server.)

## Co hra umí

- **Menu** s tlačítkem **HRÁT IDIOT TURNAJ**.
- **Výběr země** z 16 týmů: DR KONGO, BELGIE, ŠPANĚLSKO, BRAZÍLIE, PARAGUAY,
  EGYPT, PANAMA, ČESKO, ANGLIE, MAROKO, TUNISKO, ŠVÉDSKO, USA, PORTUGALSKO,
  MEXIKO, URUGUAY.
- Každá země má **kompletní soupisku 11 hráčů** ve formaci 4-3-3 a každý hráč má
  vygenerovaný **divný obličej** s právě jednou vadou.
- **Losování skupin**: 4 skupiny po 4, náhodně. Hraješ svoje 3 zápasy ve skupině,
  ostatní se dolosují simulací.
- **Bodování**: výhra 3 body, remíza 1, prohra 0. Z každé skupiny **postupují 2**
  týmy do vyřazovací fáze.
- **Pavouk**: čtvrtfinále → semifinále → finále. Soupeři se losují náhodně a další
  soupeř závisí na tom, kdo postoupí.
- **Penaltový rozstřel** při remíze ve vyřazovacím zápase (kopeš i chytáš).

## Ovládání

| Akce | Klávesa |
|------|---------|
| Pohyb | **šipky** ← ↑ → ↓ |
| Nahrávka | **I** |
| Střela | **L** |
| Penalta (střela / skok brankáře) | **L** (směr šipkami) |

- Jeden poločas trvá **3 minuty**, hrají se 2 poločasy.
- Vlevo nahoře je **stav zápasu a minuta**.
- **Kamera** automaticky sleduje míč (mírný nadhled).

## Struktura projektu

```
index.html        – vstupní stránka
css/style.css     – styly menu a obrazovek
js/data.js        – země, soupisky, generátor hráčů a vad
js/draw.js        – kreslení obličejů hráčů + jejich vad
js/match.js       – herní engine zápasu (pohyb, AI, góly, penalty, kamera)
js/tournament.js  – losování skupin, tabulky, pavouk, simulace
js/main.js        – obrazovky a herní smyčka
```
