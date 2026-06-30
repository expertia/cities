# VS — IDIOTSKÝ TURNAJ ⚽

Fotbalová arkáda v prohlížeči (HTML5 Canvas, čisté JavaScript, bez závislostí).
Mistrovství 16 podivných národů, kde **každý hráč má jednu vadu** — modré vlasy,
jedno oko, tři oči, obří nos, fialový knír, uši jako Shrek a tak dále.

## Jak hrát

Otevři `index.html` v prohlížeči. To je vše — žádná instalace.

1. **Menu** → tlačítko **HRÁT IDIOT TURNAJ**
2. **Výběr země** — vyber si jeden z 16 národů:
   DR KONGO, BELGIE, ŠPANĚLSKO, BRAZÍLIE, PARAGUAY, EGYPT, PANAMA, ČESKO,
   ANGLIE, MAROKO, TUNISKO, ŠVÉDSKO, USA, PORTUGALSKO, MEXIKO, URUGUAY.
3. **Soupiska** — prohlédni si svůj tým plný šílených obličejů.
4. **Turnaj** — odehraj své zápasy a postupuj turnajem.

## Ovládání

| Klávesa | Akce |
|---------|------|
| Šipky ← ↑ → ↓ | pohyb hráče |
| **I** | nahrávka spoluhráči |
| **L** | střela na branku / kop penalty |

Ovládáš vždy hráče svého týmu nejblíže míči (je zvýrazněný žlutým kroužkem).

## Pravidla turnaje

- **4 skupiny po 4 týmech**, rozlosované náhodně.
- Ve skupině hraje každý s každým. **Výhra = 3 body, remíza = 1, prohra = 0.**
- Z každé skupiny postupují **2 nejlepší** do vyřazovací fáze.
- Pavouk: **čtvrtfinále → semifinále → finále.**
- Soupeře ti v prvním zápase vylosuje turnaj, dál postupuje vždy ten, kdo vyhrál.
- Při remíze ve vyřazovacím zápase se kope **penaltový rozstřel** (klávesa L).

## Zápas

- Pohled shora, kamera jezdí za míčem a u branek se mírně přiblíží na šance.
- Dva poločasy, vlevo nahoře je stav zápasu a herní minuta.
- Při remíze ve vyřazovací fázi přijdou na řadu penalty.

## Soubory

```
index.html        struktura a obrazovky
css/style.css     vzhled
js/data.js        16 zemí + generování sestav s vadami
js/faces.js       kreslení vtipných obličejů
js/tournament.js  losování, tabulky, pavouk, simulace AI zápasů
js/match.js       herní engine zápasu (pohyb, míč, kamera, góly, penalty)
js/main.js        řízení obrazovek a průběhu turnaje
```
