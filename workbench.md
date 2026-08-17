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

## Polish gauntlet (run `wf_556ef69f-006`, finished 2026-08-17 · 25 agents · ~3.3M tokens)

Four loops seeded with the first gauntlet's final gap verdicts:

| Piece | Rounds | Verdict | Residual |
|---|---|---|---|
| kart-mesh | 3 | **WINS** | shell still boxier than the reference roadster |
| podium-species | 2 | **WINS** | Charmander still snoutless |
| rider-art | 3 | **WINS** | hero head bobblehead-large (~40% of kart width vs ~27% in ref) |
| item-vfx | 4 | capped (minor) | beam cone lands on the correct victim (verifier confirmed) but crosses the rider and fires with no target |

**Fresh-eyes verify:** full playthrough clean at 900p and 720p, zero console errors, determinism
intact, state carries across all seams. Found + fixed: near rivals' mesh karts rendered
X-ray-transparent in the fade-in band (`src/race/world.js`). Also noted: minimap chips still
oversized, pickup-pop ring lands on the kart deck.

## Round 3 (run `wf_f3bad004-ba1`, finished 2026-08-17 · 17 agents · ~2.4M tokens)

| Piece | Rounds | Verdict | Note |
|---|---|---|---|
| rider-scale | 1 | **WINS** | all 24 heads normalized to ~27% of kart width |
| minimap-chips | 1 | **WINS** | 12 chips single-file; ribbon weight still heavier than ref |
| beam-anchor | 3 | capped | verifier then found + fixed the real bug: renderer flipped cone→burst mid-burn |
| podium-charmander | 3 | capped | muzzle doesn't break the skull silhouette (same on Blaziken's beak) |

**Verify pass 3:** zero console errors across full flow, 3 tracks, beam stress run and a 40-lap
long-run; determinism byte-identical; no regressions. Known cosmetic leftovers: Charmander/Blaziken
muzzle silhouettes, minimap ribbon weight, dry-burst offset on hard bends, Ditto's nubs.

## Round 4 (run `wf_bd49fc64-ae1`, finished 2026-08-18 · 15 agents · ~1.8M tokens · round cap 10)

**Clean sweep — all four loops WIN:**

| Piece | Rounds | Verdict | Win-note residual |
|---|---|---|---|
| podium-silhouettes | 2 | **WINS** | Garchomp's head slab escaped the sweep; Blaziken torso plates busy |
| minimap-ribbon | 1 | **WINS** | player chip could be ~1.4x rivals for instant "you are here" |
| kart-shell-sculpt | 1 | **WINS** | loft has low-poly dents; rear cowl reads as a block |
| beam-dry-burst | 3 | **WINS** | burst is a static lozenge; wants halo/flicker |

**Verify pass 4: PASS.** Zero console errors across full flow + 13-URL sweep, determinism
byte-identical, no regressions. Pre-existing bugs documented (not from these fixes): road/kerb
quad projection explodes into a full-width color bar for a frame at crests (repro:
ryme-city `rolling=1` + `step(5200)`, `verify4-17/19` shots) — flagged for follow-up; item
banner briefly covered by the muzzle burst; wet-floor reflection crosshatch at the near plane.

Round-by-round history: [gauntlet/log.md](gauntlet/log.md). Evidence shots: `gauntlet/shots/` (untracked).
