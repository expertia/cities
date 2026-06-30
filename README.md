# VS — IDIOTSKÝ TURNAJ ⚽🤪

Fotbalová arkáda v prohlížeči. Mistrovství světa, kde **16 zemí** nastoupí
se sestavami **prapodivných hráčů** — každý má jednu vadu na kráse
(modré vlasy, jedno oko, tři oči, obří nos, klaunský nos, jednorožčí roh,
zelená kůže, fialový knír, oči na stopkách…).

## Jak spustit

Stačí otevřít `index.html` v prohlížeči. Žádná instalace, žádný build.

```
# případně přes lokální server:
npx http-server .   # a otevři http://localhost:8080
```

## Jak se hraje

1. V menu klikni na **HRÁT IDIOT TURNAJ**.
2. **Vyber si zemi** (DR Kongo, Belgie, Španělsko, Brazílie, Paraguay,
   Egypt, Panama, Česko, Anglie, Maroko, Tunisko, Švédsko, USA,
   Portugalsko, Mexiko, Uruguay) — uvidíš celou bláznivou sestavu.
3. **Losování** rozhodí 16 zemí do 4 skupin po 4. Hraješ své 3 skupinové
   zápasy, ostatní se dopočítají.
4. Postupuješ **skupina → čtvrtfinále → semifinále → finále**. Z každé
   skupiny jdou dál 2 týmy. Soupeře v pavouku ti vždy vylosuje, kdo
   zrovna postoupil.

### Ovládání

| Klávesa | Akce |
|---------|------|
| **Šipky** | pohyb hráče |
| **I** | nahrávka spoluhráči |
| **L** | střela (a kopání penalt) |

- Zápas trvá **3 minuty** (jeden poločas), čas i stav jsou vlevo nahoře.
- Kamera tě sleduje podle míče z mírného nadhledu.
- **Body:** výhra 3, remíza 1, prohra 0.
- V pavouku se při remíze kope **penaltový rozstřel** (kopeš `L`,
  v bráně chytáš šipkami ← ↑ →).

## Struktura projektu

```
index.html        # kostra a obrazovky
css/style.css     # vzhled
js/teams.js       # 16 zemí + generátor sestav s vadami
js/faces.js       # kreslení bláznivých obličejů podle vady
js/tournament.js  # losování skupin, tabulky, pavouk, simulace
js/game.js        # menu, výběr, hub, herní engine, penalty
```
