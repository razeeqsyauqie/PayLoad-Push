# Control scoring test: Point area vs Whole board

Tested 2026-10-12 on v66 rules: no placing on the enemy's back row; anywhere else is open on turn 1 and whenever you have no heroes on the board; 1 flip per hero; team-up +1; comeback +3. The bots play each other, and both versions use the same bot.

- **Point area:** add up the Power on the Point and the 4 tiles around it.
- **Whole board:** every hero you own scores its Power, and the hero on the Point scores double. I also tried a flat +3 bonus and no bonus. Double was the best of the three: with no bonus, skill barely mattered (the bot beat random only 69%).

## Results (400 bot-vs-bot matches each, decks at 500 games per pairing)

| | Point area | Whole board (Point ×2) |
|---|---|---|
| Leader after turn 3 goes on to win the round | 59% | 60% |
| First hero on the Point goes on to win the round | 57% | 61% |
| Comebacks (round won from behind after turn 3) | 41% | 40% |
| Lead changes per round | 0.91 | **1.15** |
| Average winning margin | 32% of all points | **25%** |
| Smart bot beats a random player | **100%** | 89% |
| Hero win rates in decks | **47–53%** | 46–53% |
| Frontline v Flankers | 50% | 48% |
| Frontline v Disruption | 51% | 53% |
| Flankers v Disruption | 46% | 53% |
| Draws | 2% | 1% |

## What it means

- **Snowball is about the same.** Both are around 60% for the turn-3 leader, down from 84–87% on the first build.
- **Whole board is more back-and-forth.** The lead changes more often and games end closer. Every hero counts, so synergies anywhere matter, as in Scrabble.
- **Point area rewards skill more.** A good player always beats a random one. With whole-board scoring, a random player still steals about 1 match in 9, because a lucky high-Power hand counts wherever it lands.
- **Both are balanced** after one deck fix: Disruption swapped Genji for Lúcio. It had climbed to 58–62% once the enemy back row was blocked.

## Recommendation

Keep **Point area** as the default. Control is meant to be the competitive mode, and it rewards good play the most. **Whole board** is a toggle on the Control deck screen ("Scoring"), so you can feel both. If Whole board feels more fun to you, switching the default is a one-line change.
