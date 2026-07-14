# Manuscript — an incremental about writing

Static site, no backend, no build step. Everything in-browser (like Cookie
Clicker), deployed on Vercel. Target: a couple hours of gameplay.

## Core fantasy
You are a writer at a typewriter. Letters are the base currency. Higher tiers
of writing produce lower tiers automatically (Antimatter Dimensions model).

## Currency & tiers
- **Letters** — base currency. Clicking the typewriter key types letters
  (click power upgradeable). Everything is bought with Letters.
- Production chain (each unit of tier k produces tier k-1 per second):
  T1 **Words** → produce Letters
  T2 **Sentences** → produce Words
  T3 **Paragraphs** → produce Sentences
  T4 **Pages** → produce Paragraphs
  T5 **Chapters** → produce Pages
  T6 **Drafts** → produce Chapters
- Tier k: base cost = 10^(2k-1) Letters (10, 1e3, 1e5, 1e7, 1e9, 1e11) on a
  fresh save, multiplied by 10^editionsPublished after every Publish (see
  Prestige) — each run climbs an order of magnitude steeper than the last.
  (Simulated: 100x made run 2 a 3-hour wall; 10x yields ~10/~33/~165-minute
  runs, the intended escalating-haul curve.) Each purchase multiplies a tier's OWN cost
  multiplier, steeper for higher tiers: Words x7, Sentences x8, Paragraphs
  x9, Pages x10.5, Chapters x12, Drafts x14. Production per unit per second:
  1 of tier below, times all multipliers.
- Milestones (Antimatter Dimensions-style): every 10 units PURCHASED of a
  tier (manual buys only — cascade production growing owned amount doesn't
  count, same split as cost) grants that tier a permanent x2 production
  multiplier, stacking per milestone crossed (20 purchased = x4, 30 = x8,
  ...). Applies uniformly to all 6 tiers and is multiplicative with
  everything else (Fresh Ribbon/Thesaurus, Coffee, Inspiration,
  achievements) — keeps lower tiers worth buying into the late game instead
  of being outpaced once their dedicated upgrade caps out. Each tier row
  shows purchased vs. owned, progress to the next milestone, and the
  current milestone multiplier.
- Buy buttons: x1 / x10 / Max. Tiers unlock when previous tier owned >= 1
  (T1 always visible; show next locked tier as "???" for anticipation).

## Prestige: Publish
- Unlocks at 1e12 Letters earned THIS EDITION ("You have enough for a
  manuscript..."). Gates on lettersThisEdition, not lifetime Letters —
  lifetime never resets, so gating on it would make every Publish after the
  first free.
- Publishing resets Letters, tiers, and upgrades (and lettersThisEdition);
  you gain **Inspiration**: floor(cbrt(lettersThisEdition / 1e12)), minimum
  1, with a softcap — gains beyond 10 per Publish are square-rooted
  (10 + sqrt(raw - 10)) rather than linear, so early Publishes stay
  generous while a single very-long run doesn't snowball Inspiration.
- Each Inspiration: +25% production (multiplicative with everything).
- Each Publish multiplies every tier's base cost by 10x, compounding per
  edition (see Currency & tiers) — the growth spike of a fresh run is
  followed by an earned plateau, not a repeat of the same climb.
- Track "Editions published" count; show it like a bibliography.

## Upgrades (bought with Letters, reset on Publish)
1. Sturdier Keys — click power x2 (cost 100, x10 per level, max 10)
2. Fresh Ribbon — T1 production x2 (500, x12/level, max 8)
3. Thesaurus — T2 production x2 (5e3, x12/level, max 8)
4. Coffee — ALL production x1.5 (1e5, x50/level, max 6)
5. Muse — click also earns 1% of Letters/sec (1e6, single)
6. Editor — every tier's own cost multiplier is 0.5 lower (1e8, single)

## Achievements (each gives +3% ALL production — makes them matter)
25 achievements in a 5x5 grid, mix of: first Letter typed; 1e3/1e6/1e9/1e12/
1e15/1e50 lifetime Letters; own 10/50/100 Words; own 1 of each tier up to
Drafts; 100/1000 manual clicks; buy every upgrade type once; publish 1/5/25
editions; 10 min/1 hour total playtime; Letters/sec exceeds 1e6; own exactly
0 Words with >1e6 letters ("Writer's block"); reach max Coffee ("Overcaffeinated").
Locked achievements show name only; unlocked show description. Toast on unlock.

## Persistence & numbers
- Autosave to localStorage every 10s + on unload; "wiped" warning nowhere —
  add manual Export/Import save (base64 JSON) and Hard Reset (double-confirm).
- Offline progress: on load, grant production for elapsed time, capped 8h,
  shown in a "While you were away..." modal.
- Number formatting: plain to 1e6, then scientific (2.34e12). No libraries.

## Design: writing by lamplight
- Dark by default: near-black warm paper (#1a1713), soft cream ink text
  (#e8ddc7), amber lamp-glow accent (#d9a441) for interactive/highlighted
  elements (hover states, rates, milestone glow), red-ink (#a33327) kept
  unchanged for Publish/prestige elements. A light-mode toggle (moon/sun
  icon, top-right of the header) switches to the original cream-paper
  typewriter palette (#f4efe4 paper, #232019 ink, #3a5a8c accent); the
  choice persists in the save.
- Monospace everything (Courier Prime via Google Fonts, fallback Courier).
- The clicker is a big round typewriter KEY (letter changes randomly on
  click) with a subtle press-depression animation on click.
- Letters counter ticks like a page count, easing/counting up toward its new
  value rather than snapping instantly; on click, faint letters "type"
  across the header line (small animation, CSS only).
- A tier row gets a brief golden glow pulse when one of its milestone
  multipliers triggers.
- Achievement toasts slide in like typed index cards (paper-colored card,
  red-ink tab, a small tilt on entry) rather than a flat notification bar.
- Ruled-paper horizontal lines as section dividers; achievements grid looks
  like a typesetter's drawer.
- All motion is CSS-only where practical and respects
  `prefers-reduced-motion` (animations/transitions collapse to near-instant
  for users who request it).
- Responsive: single column on mobile, two columns desktop (tiers left,
  upgrades/achievements right).

## Non-goals (v1)
No sound, no particles beyond the typing animation, no cloud saves, no
balance beyond "feels steady for ~2 hours", no automation upgrades (v2 idea),
no tutorial beyond one intro line.

## Files
index.html (structure) · style.css · game.js (all logic) — 3 files, no build.

## Definition of done
Playable loop: click → buy Words → tiers cascade → first Publish reachable in
~30-40 min active play; saves survive refresh; achievements pop; deployed on
Vercel; no console errors.
