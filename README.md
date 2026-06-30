# VS — IDIOTSKÝ TURNAJ ⚽🤪

Bláznivá fotbalová hra. Mistrovství 16 zemí, kde **každý hráč má jednu vadu** —
modré vlasy, jedno oko, tři oči, sloní uši, zelenou kůži, jizvu přes obličej…

## Jak hrát

Otevři **`index.html`** v prohlížeči (stačí dvojklik). Žádná instalace.

1. V menu klikni na **HRÁT IDIOT TURNAJ**
2. Vyber zemi, za kterou budeš hrát (DR Kongo, Belgie, Španělsko, Brazílie,
   Paraguay, Egypt, Panama, Česko, Anglie, Maroko, Tunisko, Švédsko, USA,
   Portugalsko, Mexiko, Uruguay) — uvidíš její celou bláznivou sestavu
3. Vylosuje se **skupina** (4 skupiny po 4)
4. Projdi skupinu → **čtvrtfinále** → **semifinále** → **finále**

## Ovládání

| Klávesa | Akce |
|---------|------|
| **Šipky** | pohyb hráče |
| **I** | přihrávka |
| **L** | střela (a kop penalty) |

- Ovládáš vždy hráče nejblíže míči (žlutý kroužek).
- Kamera automaticky sleduje míč.
- Vlevo nahoře je **stav zápasu a čas**. Jeden poločas trvá **3 minuty**.

## Pravidla turnaje

- Skupina: **výhra 3 body, remíza 1, prohra 0**. Postupují **2 týmy** dál.
- Pavouk (ČF/SF/F): při remíze se kope **penaltový rozstřel** (klávesa **L**,
  míříš šipkami ◀ ▶).
- Zápasy ostatních týmů se dopočítávají automaticky podle síly týmů.

## Soubory

```
index.html      vstupní stránka
css/style.css   styl menu a obrazovek
js/teams.js     16 zemí, generování bláznivých sestav, kreslení hráčů
js/match.js     engine zápasu (fyzika, AI, kamera, branky)
js/main.js      obrazovky, průběh turnaje, penalty, hlavní smyčka
```
