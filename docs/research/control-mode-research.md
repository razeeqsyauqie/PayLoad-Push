# Control mode: board game research

Problem being solved: in the current v4 rules (5x5 grid, place or move, flip on arrival, hold the Point when the round ends), the first mover wins round 1 about 88% of the time. Heroes only attack when they arrive on a tile, so whoever reaches the Point first can wall it off, and the score is only checked at the end.

Facts below come from general knowledge of these games, not from fresh web research.

## What the games teach

| Game | How it handles going first | Mechanic worth borrowing |
|---|---|---|
| Go | **Komi**: the second player gets 6.5–7.5 free points | A fixed head start for the second player, tuned by testing |
| Hex / Twixt | **Pie rule**: one player makes the opening move, the other picks which side to play | Self-balancing openings, no tuning needed |
| Hive | Tournament rule: no Queen on turn 1. Still a small first-player edge | Placement + movement with each piece moving its own way (already in v4) |
| Chess | Not fixed; White scores about 54% | Shows a small edge is acceptable, 88% is not |
| Azul | Whoever takes the **first-player marker** loses 1 point for it | Going first has a price |
| Power Grid | The **leader acts last** in key phases | Catch-up turn order |
| Marvel Snap | Both players play **at the same time**; whoever is winning reveals first | Simultaneous turns remove first-mover advantage entirely |
| Santorini | 5x5 grid, move then build, every player has a god power that bends one rule | Same board size as v4; each hero as a rule-bender is a good fit |
| Onitama | 5x5 grid; the move card you use **passes to your opponent** | Strong plays feed the enemy, so tempo evens out |
| Blokus | Each player starts in their own corner | Separate starting zones delay the clash (v4's back-row spawn does this) |
| GIPF | Pieces are pushed in from the edge and shove whole lines | Pushing instead of flipping breaks walls |
| Checkers / Breakthrough | Forced captures; race to the far row | Forced engagement stops turtling |
| Oink Games (Deep Sea Adventure, Startups) | Shared, shrinking resource; holding the most is risky | Pressure that grows the longer you hold something |

The pattern: games that stay fair either **score over time** (so an early lead is not final), **charge for initiative** (Azul, Power Grid, komi), or **remove turn order** (simultaneous play).

## Alternative 1: Capture meter + catch-up turns (recommended)

Closest to real Overwatch Control.
- At the end of each full turn, if only your heroes touch the Point (on it or next to it), you gain 1 capture. If both sides touch it, it's contested and nobody gains.
- First to a target (say 5) wins the round; if nobody reaches it, the higher capture wins.
- Whoever is behind on capture moves first next turn (Power Grid / Snap). On a tie, the player who didn't start the round goes first.
- Heroes can attack an adjacent enemy instead of moving (attack-in-place), so a wall can be broken.

Why it helps: holding the Point early only earns a lead, not the round, and the player behind gets tempo back each turn.

## Alternative 2: Simultaneous orders (Marvel Snap / Diplomacy)

Biggest change, but removes the first-player problem completely.
- Each turn both players secretly choose one card and a tile (or one hero to move), then reveal together.
- If both target the same tile, the higher Power takes it and the other card returns to hand (or goes to the Reserve).
- Abilities resolve in a fixed order (for example Supports, then Tanks, then Damage) so results are predictable.
- Scoring can use either the current end-of-round check or the capture meter above.

Why it helps: no one is ever first, and reading the opponent becomes the main skill, which suits a card game.

## Alternative 3: Keep v4, add a price for going first (Go / Hex / Azul)

Cheapest to test; mostly a rules dial.
- Pick one: the second player starts each round with a free extra placement (komi), or the round starter cannot touch the Point until their third turn, or the pie rule (starter places their first hero, then the opponent chooses which side to take).
- Optional Onitama twist: a card you play from hand goes into a shared pool your opponent can draw from, so big plays feed the enemy.

Why it helps: it directly cancels the 88% edge without changing how the game feels. Risk: at 88% a small handicap may not be enough, so it needs sim testing.

## Suggested order to test

1. Alternative 1 with attack-in-place, in the sim (it also covers the "next idea" from the last sim pass).
2. If round 1 is still lopsided, add Alternative 3's komi on top as a tuning dial.
3. Try Alternative 2 only if the turn-based version keeps snowballing.
