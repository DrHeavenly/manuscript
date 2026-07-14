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
- Tier k: base cost = 10^(2k-1) Letters (10, 1e3, 1e5, 1e7, 1e9, 1e11);
  each purchase multiplies its cost by 7. Production per unit per second:
  1 of tier below, times all multipliers.
- Buy buttons: x1 / x10 / Max. Tiers unlock when previous tier owned >= 1
  (T1 always visible; show next locked tier as "???" for anticipation).

## Prestige: Publish
- Unlocks at 1e12 lifetime Letters ("You have enough for a manuscript...").
- Publishing resets Letters, tiers, and upgrades; you gain **Inspiration**:
  floor(cbrt(lifetimeLetters / 1e12)) minimum 1.
- Each Inspiration: +25% production (multiplicative with everything).
- Track "Editions published" count; show it like a bibliography.

## Upgrades (bought with Letters, reset on Publish)
1. Sturdier Keys — click power x2 (cost 100, x10 per level, max 10)
2. Fresh Ribbon — T1 production x2 (500, x12/level, max 8)
3. Thesaurus — T2 production x2 (5e3, x12/level, max 8)
4. Coffee — ALL production x1.5 (1e5, x50/level, max 6)
5. Muse — click also earns 1% of Letters/sec (1e6, single)
6. Editor — tier costs grow x6.5 instead of x7 (1e8, single)

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

## Design: typewriter terminal
- Cream paper background (#f4efe4), ink text (#232019), red-ink accent
  (#a33327) for Publish/prestige elements, faded blue-ink (#3a5a8c) for links.
- Monospace everything (Courier Prime via Google Fonts, fallback Courier).
- The clicker is a big round typewriter KEY (letter changes randomly on click).
- Letters counter ticks like a page count; on click, faint letters "type"
  across the header line (small animation, CSS only).
- Ruled-paper horizontal lines as section dividers; achievements grid looks
  like a typesetter's drawer.
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
