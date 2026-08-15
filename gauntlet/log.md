| shell-and-contracts | round 1 | building |  |  |
| shell-and-contracts | round 1 | built | 5 screens render, determinism identical, 0 console errors | gauntlet/shots/final-*.png |
| shell-and-contracts | round 1 | LOSES | delta=major | All 5 screens, determinism, and data contracts pass, but every racer is the same generic blob avatar with recolored ears, so no screen reads as Pokemon next to the reference. |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | LOSES | delta=negligible | REGRESSION: src/core/avatars.js was left truncated mid-rewrite with zero export statements, so every module importing avatarSvg/ballSvg/kartSvg/tokenSvg throws SyntaxError, window.__pkr never initializes and all five screens screenshot as a blank navy canvas. |
| shell-and-contracts | round 3 | building |  |  |
| shell-and-contracts | round 3 | LOSES | delta=negligible | UNCHANGED REGRESSION from round 2: src/core/avatars.js still ends mid-file after the helper functions with no SPECIES map and zero export statements, so every screen module dies on "does not provide an export named 'ballSvg'", window.__pkr never initializes, all screens are blank navy and the race screenshot cannot even be captured. |
| race-world | round 1 | building |  |  |
| character-and-track-select | round 1 | building |  |  |
| results-podium | round 1 | building |  |  |
| results-podium | round 1 | building |  |  |
| character-and-track-select | round 1 | building |  |  |
| race-world | round 1 | building |  |  |
| character-and-track-select | round 1 | building |  |  |
| shell-and-contracts | repair | FIXED avatars.js truncation | | Completed the truncated rewrite: 24 per-species silhouettes (SPECIES map) + avatarSvg/tokenSvg/ballSvg/kartSvg/avatarImage exports; all five screens screenshot non-blank with zero console errors. |
| results-podium | round 1 | built | src/screens/results.js, src/styles/results.css, src/assets/results/ | verified: podium==state standings, seed variance, animation, A->track-select, 0 console errors |
| character-and-track-select | round 1 | building |  |  |
| results-podium | round 1 | LOSES | delta=major | Every required element is present and wired to real state, but the three racers are small flat blobs floating behind oversized 2D slabs instead of large, fully-visible characters standing on 3D plinths as in the reference. |
| results-podium | round 2 | building |  |  |
| character-and-track-select | round 1 | built | src/screens/characterSelect.js, src/screens/trackSelect.js, src/styles/menus.css, src/assets/cityArt.js | verified: 24-card grid, P1 ring follows arrows, Enter commits racer+track, neon city backdrop, 0 console errors, no overflow @1280x720 |
| results-podium | round 2 | built | 3D plinths + full-body racers, names on plinth faces | out/rp-final.png; all podium checks pass, 0 console errors |
| character-and-track-select | round 1 | LOSES | delta=major | Layout, P1 ring, per-racer stat bars, preview panel, track list and Enter-commits-state all match the reference, but all 24 roster portraits are the same recolored egg-blob body so no card is recognizable as its Pokemon, and the dim navy card plates lack the reference's bright lit backing. |
| character-and-track-select | round 2 | building |  |  |
| race-world | round 1 | built | 3 themed chase-cam worlds (grass/neon/snow), banked road + kerbs + rails + scenery + karts, 0 console errors, drive verified | gauntlet/shots/rw-final-*.png |
| results-podium | round 2 | LOSES | delta=major | Plinths and composition now match the reference, but all three podium racers are still interchangeable colored egg-blobs with no bodies/limbs/karts, half-buried behind the drums, where the reference has fully-visible distinctly-silhouetted full-body Pokemon standing on top with contact shadows. |
| results-podium | round 3 | building |  |  |
| race-world | round 1 | LOSES | delta=major | Chase cam, curving kerbed road, rails, three themed worlds and driving/lap physics all read credibly, but every kart is a generic go-cart carrying an identical faceless egg-blob rider with no species identity, limbs or VFX, where the reference frame is dominated by a large recognizable Pikachu with face/arms/tail in a character-themed car throwing sparks and exhaust. |
| race-world | round 2 | building |  |  |
| character-and-track-select | round 2 | LOSES | delta=major | Grid, P1 ring, per-racer stat bars, track list and Enter-commits-state all match now, but the hero preview is a flat armless blob perched behind a featureless ellipse "kart" in a half-empty panel where the reference shows a large fully-shaded character with body and arms in a detailed kart. |
| results-podium | round 3 | built | src/screens/results.js, src/styles/results.css, src/assets/results/podium-figures.js, podium-art.js | 24 per-species full-body poses on drum tops + contact shadows; all verify checks pass, 0 console errors; out/rp-r3-final.png |
| character-and-track-select | round 3 | building |  |  |
| results-podium | round 3 | LOSES | delta=major | Podium composition, per-species full-body racers, banner, stat panel and footer all match and are provably wired to real standings, but the arena itself is a flat dark navy plate with a banded repeating crowd stripe and no stadium depth, spotlight beams or floor reflection, so the whole panel reads dim and flat next to the reference's bright lit stadium. |
| results-podium | round 4 | building |  |  |
| results-podium | round 4 | built | src/assets/results/arena.js (lit stadium rewrite), src/assets/results/podium-art.js (3D balls), src/screens/results.js (reflection tints) | bright stadium: roof rig + 9 sweeping volumetric beams, blue->white gradient, bokeh crowd, glossy floor w/ podium reflections + pooled key light, gold star confetti; 13/13 verify checks pass, 0 console errors; out/rp-r4-final.png |
| results-podium | round 4 | WINS | delta=major | Arena now reads as a bright lit stadium and the whole panel matches the reference 1:1, but the 2nd/3rd figures still reuse one generic doll body (identical tube arms/legs/feet, unshaded flat fills) so only the winner reads as a specific Pokemon. |
| character-and-track-select | round 3 | WINS | delta=major | Every element now matches the reference and is provably wired to state, but all card figures, the hero kart and the track previews are flat two-tone vector fills on a plain navy backdrop, so the screen reads flat next to the reference's shaded volumetric renders on a lit neon-city street. |
| race-world | round 2 | built | src/race/kart.js, kartBody.js, rider.js, species.js, fx.js, world.js, scenery.js | hero Pokemon karts + riders + sparks/exhaust; drive & 60-frame checks pass, 0 console errors; shots gauntlet/shots/rw-final-*.png |
| race-world | round 2 | WINS | delta=major | Chase cam, kerbed/railed road, three themed worlds, recognizable Pikachu hero kart, distinct rivals and drift FX all match the reference shot-for-shot, but the ground plane and horizon are flat untextured fills (uniform grey tarmac, banded flat grass, a repeating triangle treeline and empty sky) where the reference has textured asphalt and layered receding green mountains, so the world reads as paper cutouts behind well-shaded karts. |
| race-hud-and-countdown | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| race-hud-and-countdown | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| race-hud-and-countdown | round 1 | building |  |  |
| race-hud-and-countdown | round 1 | building |  |  |
| race-hud-and-countdown | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| racers-items-and-race-rules | round 1 | building |  |  |
| race-hud-and-countdown | round 1 | building |  |  |
| shell-and-contracts | round 2 | building |  |  |
| shell-and-contracts | round 2 | done | 5/5 screens render, 0 console errors, determinism identical | fixed [hidden] ghost-panel bug, countdown/lights/speed HUD polish, canonical per-species art exposed as __pkr.art + CONTRACTS 4b |
| shell-and-contracts | round 2 | WINS | delta=major | All five screens render rich non-blank content with zero console errors, identical determinism snapshots, 24 stat-bearing racers and 3 named tracks, and the full title->select->track->race->results loop plus item pickup works end to end; the only shell defect left is that input.normalise never case-folds, so window.__pkr.press('A') silently no-ops and a scripted flow stalls on the title screen despite the on-screen 'PRESS [A]' prompt. |
| race-world | round 1 | done | crowned+lit asphalt, alpine/rolling ridges, corner roll, roadside Pokemon crowd, snow berms+cliffs, neon wet reflections | 0 console errors, 3 themes verified |
| character-and-track-select | round 1 | building |  |  |
| results-podium | round 1 | building |  |  |
| results-podium | round 1 | built | src/screens/results.js, src/styles/results.css, src/assets/results/{arena,podium-art,podium-figures}.js | 3-tier podium w/ real standings, glowing banner, confetti+fireworks+PokeBalls, winner stats + YOU chip, coins/rank footer; race-driven + 8-seed checks pass, 0 console errors; shots gauntlet/shots/rp-final-*.png |
| character-and-track-select | round 1 | done | src/screens/characterSelect.js, src/screens/trackSelect.js, src/styles/menus.css, src/assets/trackArt.js | perspective track dioramas (kerbs/rails/gantry/item row/props), neon Pokemon glyph rails on both menus; 24 cards, ring+preview+stats follow cursor, Enter commits; 0 console errors, no overflow at 1280x720; shots gauntlet/shots/cs-r1*.png, cts-drive-*.png |
| character-and-track-select | round 1 | WINS | delta=major | Grid, P1 ring, per-racer stats, shaded hero kart, track list and Enter-commits-state all match or beat the reference, but the backdrop behind the panels is a near-flat dark navy field with faint blurred blocks where the reference has a bright readable neon Ryme City street with billboards and road depth. |
| results-podium | round 1 | LOSES | delta=major | Layout, real standings, confetti/PokeBall arena, stat bars and COINS/RANK footer all match or beat the reference, but the three podium Pokemon are flat 2D clip-art dolls with visibly detached ball-joint limbs, no volumetric shading or contact shadows, and inconsistent scale between tiers, so the panel's focal point reads as unfinished next to the reference's shaded, instantly-recognizable Snorlax/Charizard/Pikachu. |
| results-podium | round 2 | building |  |  |
| race-world | round 1 | LOSES | delta=major | Chase cam, curving kerbed road, rails, arch and three distinct themes all read correctly with zero console errors, but nothing in the world is grounded or lit -- no contact/cast shadows under karts, trees or props, and the asphalt and grass are flat untextured color fields -- so the scene reads as stacked vector stickers rather than the reference's shaded, textured 3D environment (worst in mt-coronet, where the pack piles into the hero with a stray duplicate Pikachu head fused to the kart's right side). |
| race-world | round 2 | building |  |  |
| results-podium | round 2 | done | src/assets/results/podium-figures.js, src/screens/results.js, src/assets/results/podium-art.js | figures rebuilt: unified hull silhouette (no detached limbs), userSpace shade+lite gradients, eroded rim light, blurred contact shadow per tier, scale-matched tiers (FIT map); gengar/lucario/dragonite/charizard poses redrawn; 12/12 checks pass, 0 console errors; shots gauntlet/shots/rp-r2-final.png, rp-r2-realrace-seed7.png |
| results-podium | round 2 | LOSES | delta=minor | Real seed-driven standings, animation, menu return, banner, confetti/PokeBall arena, stat bars and COINS/RANK footer are all correct and 0 console errors, but all three podium Pokemon are recolors of one identical mannequin body plan (round head, egg torso, tube arms, oval feet) with generic dot eyes, so no species reads as its real silhouette next to the reference's instantly-recognizable Charizard/Snorlax/Pikachu -- and the 3rd-place figure sits over its own podium label. |
| results-podium | round 3 | building |  |  |
| results-podium | round 3 | done | per-species podium anatomy (24 bespoke poses, no shared body plan), figures seated behind the plinth labels | 18/18 checks green, zero console errors |
| results-podium | round 3 | LOSES | delta=minor | Layout, real seed-driven standings, banner, confetti/PokeBall arena, animation, stat bars, COINS/RANK footer and menu return are all correct with 0 console errors, but the podium figures still fall back to one generic head-on-egg-torso-with-tube-arm-mitts mannequin for most species -- seed 19 puts a blue cat labelled GRENINJA next to an identical pink cat labelled MEW, and Charizard renders tan/grey and hunched -- so the focal point reads as recolored plushies instead of the reference's instantly-identifiable Charizard/Snorlax/Pikachu. |
| results-podium | round 4 | building |  |  |
| results-podium | round 4 | done | per-species limbs+hands (claw/fist/web/pad/slim), hull shrunk 4.4->1.3, shade lightened, charizard/greninja/mew/lucario redrawn | 16/16 checks pass, 0 console errors; shots gauntlet/shots/rp-r4-*.png |
| results-podium | round 4 | LOSES | delta=minor | Species now read distinctly (Greninja/Mew/Rayquaza/Gengar are unmistakable) and standings, animation, menu return, banner, confetti arena, stat bars and COINS/RANK footer are all correct with 0 console errors, but the figures' faces and limbs are still assembled from misaligned flat primitives -- Dragonite has mismatched eyes and an off-center snout, Charizard renders mouse-faced, undersized and zipper-mouthed with wings clipping its head, and every arm is a detached rounded rectangle with toothpick claws -- so the focal point reads as paper cutouts beside the reference's softly shaded, on-model Charizard/Snorlax/Pikachu. |
| race-world | round 2 | LOSES | delta=major | Chase cam, textured lit asphalt, kerbs/rails/arch, contact shadows, three distinct themes, correct throttle/steer world translation and 0 console errors are all solid, but the scenery half of every frame is flat untextured clip-art -- trees are two-tone circles on sticks, grass is a bare gradient with mow bands and no blades/clumps/flowers, and the roadside crowd are giant single-fill pear blobs that read as no species at all -- so beside the reference's shaded, densely detailed 3D roadside it still looks like stacked vector stickers. |
| race-world | round 3 | building |  |  |
| results-podium | round 5 | building |  |  |
| race-world | round 3 | done | crowd from canonical avatars, volumetric foliage, grass detail scatter | gauntlet/shots/rw-r3-final-*.png |
| race-world | round 3 | LOSES | delta=major | Textured asphalt, volumetric shaded trees, recognizable Pokemon crowd, grass detail, contact shadows, item rows and all three themes are now solid with correct drive/steer translation and 0 console errors, but the road renders as a dead-straight ribbon to a flat vanishing point even on the +1.7/+2.2 curve segments with no visible banking or hill crests, so the world reads as a straight highway on a flat green tabletop instead of the reference's snaking, rolling circuit. |
| race-world | round 4 | building |  |  |
| results-podium | round 5 | done | podium-figures.js: front-facing centred muzzles (snout/nostrils/grin), symmetric hornPair/eye+catchlight pairs, fused limb() (buried strokeless root + outer-contour-only keyline), chunky claw3/paw/fist scaled hands, stronger shade/lite/bounce volume passes | charizard/dragonite/lucario/charmander/eevee/gengar heads+limbs redrawn; 16/16 checks pass, 0 console errors; shots gauntlet/shots/rp-r5-final-seed7.png, rp-r5-final-default.png, rp-r5-all2.png |
| results-podium | round 5 | LOSES | delta=minor | Standings, banner, times, confetti/PokeBall arena, stat panel, COINS/RANK footer, animation and menu return are all correct with 12/12 checks and 0 console errors, and most species now read (Mew, Greninja, Rayquaza, Gengar), but same-family Pokemon still share one torso/arm/foot kit -- in the seed-7 real-race podium Charizard is a winged Dragonite recolor standing beside Dragonite, whose flat pig-muzzle face and detached toothpick-claw tubes give it away -- so the focal point is still not on-model next to the reference. |
