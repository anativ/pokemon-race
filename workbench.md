# Gauntlet Loop Workbench — Pokémon Racing Game

**Goal:** A browser game like Mario Kart 8 gameplay ("Pokémon Racing Game").
**Bar:** The 4 reference screenshots in `./goal/` — critics compare real rendered screenshots side-by-side against them.
**Loop rule:** Each piece loops builder → fresh harsh critic until the critic says it WINS against the bar, improvements plateau (2× negligible), or round cap.

## Pieces

| Piece | Judged against | Status |
|---|---|---|
| shell-and-contracts | flow screens across all refs | ⏳ queued |
| race-world | sunny grass ref, neon night ref, snow panel | ⏳ queued |
| racers-items-and-race-rules | rival field + Poké Ball pickups, item-use panel | ⏳ queued |
| race-hud-and-countdown | HUD corners in both race refs, countdown panel | ⏳ queued |
| character-and-track-select | character select ref, track selection panel | ⏳ queued |
| results-podium | podium panel | ⏳ queued |

## Live round log

Builders and critics append one line per round to [gauntlet/log.md](gauntlet/log.md) as they run —
watch it with:

```bash
tail -f "/Users/alonnativ/code/playground/private/Gauntlet-Loop/pokemon-racing/gauntlet/log.md"
```

Critic screenshots land in `gauntlet/shots/` so you can eyeball what the critic saw.

_This file is updated with final verdicts when the loop finishes. Started 2026-08-14._
