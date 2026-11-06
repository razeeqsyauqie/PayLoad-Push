# Control v67: heroes and rules

## Rules
- 3 rounds, 4 turns each. You play 12 of your 15 heroes.
- Heroes stay on the board for the whole match. Heroes played this round can be flipped; heroes from earlier rounds are locked.
- Score: every hero you own scores its Power, and the hero on the Point scores double. The bigger board at the end of round 3 wins the match.
- Winning a round: your first hero next round gets +2 (+4 after two wins). Behind on score: your next hero gets +2.
- Movers only move on the turn you play them.

## Heroes
| Hero | Role | Power | Ability |
|---|---|---|---|
| Reinhardt | tank | 6 | **Barrier Field:** Allies behind him in his column +1. |
| Winston | tank | 5 | **Jump Pack:** Move: when played, can leap onto the empty Point from 2 tiles away. |
| D.Va | tank | 6 | **Defense Matrix:** Enemy abilities can't lower her Power. |
| Orisa | tank | 5 | **Fortify:** +2 while next to an ally. |
| Zarya | tank | 4 | **Graviton Surge:** +1 for each enemy next to her. |
| Sigma | tank | 5 | **Accretion:** When played: pushes an adjacent enemy 1 tile back. |
| Soldier: 76 | damage | 6 | **No ability:** No tricks, just Power. |
| Cassidy | damage | 4 | **Deadeye:** Enemies in his row −1. |
| Genji | damage | 5 | **Swift Strike:** Move: when played, can dash 1 tile diagonally. |
| Hanzo | damage | 4 | **Storm Arrows:** When played: the first enemy in each line −1. |
| Tracer | damage | 5 | **Blink:** Move: when played, can blink up to 2 tiles. |
| Widowmaker | damage | 4 | **Headshot:** When played: the strongest enemy in her row −2. |
| Reaper | damage | 4 | **Death Blossom:** Enemies all around him (diagonals too) −1. |
| Mercy | support | 2 | **Damage Boost:** Damage allies next to her +2. |
| Sombra | support | 2 | **Hack:** Enemies next to her −2. |
| Ana | support | 2 | **Nano Boost:** When played: the strongest ally next to her +3. |
| Lúcio | support | 2 | **Speed Boost:** Allies in his column +1. |
| Moira | support | 2 | **Biotic Orb:** Allies next to her +1, enemies next to her −1. |
| Baptiste | support | 3 | **Amplification Matrix:** Allies in his row +1. |
| Kiriko | support | 3 | **Swift Step:** Move: when played, can teleport next to the Point. Allies next to her +1. |

## Test results (bot vs bot)
| Check | Result |
|---|---|
| First seat wins | 52% |
| Round 1 winner wins the match | 61% |
| Starter decks vs each other | 47–53% |
| Every hero (win rate when in deck) | 46–54% |
| Smart bot beats random player | about 90% |

Tried and dropped: adding up all 3 round scores (round 1 winner then wins 74–95%), and +1 to every later hero per round won (77–99%).
