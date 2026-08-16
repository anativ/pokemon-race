# Gauntlet Loop Workbench — Pokémon Racing Game — FINAL

**Goal:** A browser game like Mario Kart 8 gameplay ("Pokémon Racing Game"). Entry: `index.html`.
**Bar:** The 4 reference screenshots in `./goal/`.
**Run:** `wf_57d50d7e-e0f` · finished 2026-08-16 02:44 · 45 agents · ~5.1M tokens.
**Status board:** https://claude.ai/code/artifact/54efa066-4095-4bbb-98f2-b213fb92fde2
**Code:** https://github.com/anativ/pokemon-race

## Final verdicts

| Piece | Rounds | Verdict | Final gap named by the critic |
|---|---|---|---|
| shell-and-contracts | 2 (+hot-fix) | **WINS** | uppercase keys ignored by `__pkr.press()` |
| race-world | 5 | capped (minor) | hero kart mesh reads as seamed quads up close |
| racers-items-and-race-rules | 5 | capped (minor) | Hyper Beam is a thin ribbon, not an anchored flame cone |
| race-hud-and-countdown | 4 | **WINS** | minimap chips oversized vs the route ribbon |
| character-and-track-select | 3 | **WINS** | backdrop dimmer than the reference's lit neon street |
| results-podium | 5 | capped (minor) | same-family species share a body kit (Charizard ≈ Dragonite recolor) |

**Smoothing pass (fresh eyes):** full keyboard playthrough clean, zero console errors, choices
carry end-to-end. Fixed: HUD announcing rivals' items, minimap white-on-white on snow,
stale confirm flags on back-nav. Flagged for future work: unify the three racer art systems
(avatars / kart riders / podium figures) — the parametric kart-rider recipe collapses for
complex species.

Round-by-round history: [gauntlet/log.md](gauntlet/log.md). Evidence shots: `gauntlet/shots/` (untracked).
