# Project: Manuscript — incremental/idle game

Read SPEC.md before any work. It is the authority; if code and spec disagree,
the spec wins. If the spec is silent, ask or choose the simplest option and
say so in your summary.

## Stack
- Vanilla HTML/CSS/JS. Three files: index.html, style.css, game.js.
- NO frameworks, NO build step, NO dependencies except the Google Fonts link.
- Deployed on Vercel as a static site; must work from file:// too.

## Conventions
- ES6+, const/let, no var. camelCase. One global `game` state object.
- All balance numbers (costs, multipliers) live in a CONFIG object at the top
  of game.js — never inline magic numbers in logic.
- Game loop: setInterval tick at 10/sec; render separated from simulation.
- localStorage key: "manuscript_save_v1". Never break old saves silently —
  migrate or version.
- Comments explain why, not what.

## Commands
- Run: open index.html (or python3 -m http.server)
- Test: manual playtest + browser console must stay clean
- Deploy: git push (Vercel auto-deploys)

## Definition of done (per task)
- No console errors; save/load survives refresh; numbers format correctly
  past 1e15; summarize what you changed and any decisions you made.
- Do not commit until Finny approves.
