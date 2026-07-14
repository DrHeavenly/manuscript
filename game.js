'use strict';

// ---------------------------------------------------------------------------
// CONFIG — all balance numbers live here, never inline in logic.
// ---------------------------------------------------------------------------
const CONFIG = {
  saveKey: 'manuscript_save_v1',
  saveVersion: 5,
  autosaveIntervalMs: 10000,
  tickRate: 10, // simulation ticks per second
  clickPower: 1, // Letters earned per manual click
  // Each tier has its OWN cost multiplier — steeper for higher tiers, so the
  // late tiers keep demanding a real climb instead of flattening out once
  // you can afford them at all (AD-style spike-then-plateau pacing).
  tiers: [
    { id: 'words', name: 'Words', baseCost: 10, costMultiplier: 7 },
    { id: 'sentences', name: 'Sentences', baseCost: 1e3, costMultiplier: 8 },
    { id: 'paragraphs', name: 'Paragraphs', baseCost: 1e5, costMultiplier: 9 },
    { id: 'pages', name: 'Pages', baseCost: 1e7, costMultiplier: 10.5 },
    { id: 'chapters', name: 'Chapters', baseCost: 1e9, costMultiplier: 12 },
    { id: 'drafts', name: 'Drafts', baseCost: 1e11, costMultiplier: 14 },
  ],
  // Antimatter Dimensions-style milestones: every N units PURCHASED (not
  // owned — see the purchased/owned split below) grants that tier a
  // permanent multiplier, stacking per milestone crossed. Applies to all 6
  // tiers uniformly, keeping lower tiers worth buying into the late game.
  milestones: {
    purchasedPerMilestone: 10,
    multiplierPerMilestone: 2,
  },
  upgrades: [
    { id: 'sturdierKeys', name: 'Sturdier Keys', description: 'Click power ×2 per level.', baseCost: 100, costMultiplier: 10, maxLevel: 10 },
    { id: 'freshRibbon', name: 'Fresh Ribbon', description: 'Words produce ×2 Letters per level.', baseCost: 500, costMultiplier: 12, maxLevel: 8 },
    { id: 'thesaurus', name: 'Thesaurus', description: 'Sentences produce ×2 Words per level.', baseCost: 5e3, costMultiplier: 12, maxLevel: 8 },
    { id: 'coffee', name: 'Coffee', description: 'ALL production ×1.5 per level.', baseCost: 1e5, costMultiplier: 50, maxLevel: 6 },
    { id: 'muse', name: 'Muse', description: 'Clicking also earns 1% of your Letters/sec.', baseCost: 1e6, costMultiplier: 1, maxLevel: 1 },
    { id: 'editor', name: 'Editor', description: 'Every tier’s cost multiplier is 0.5 lower.', baseCost: 1e8, costMultiplier: 1, maxLevel: 1 },
  ],
  upgradeEffects: {
    sturdierKeysMultiplierPerLevel: 2,
    freshRibbonMultiplierPerLevel: 2,
    thesaurusMultiplierPerLevel: 2,
    coffeeMultiplierPerLevel: 1.5,
    museLettersPerSecShare: 0.01,
    editorCostReduction: 0.5, // subtracted from each tier's own cost multiplier
  },
  prestige: {
    unlockLifetimeLetters: 1e12,
    inspirationDivisor: 1e12,
    inspirationProductionBonus: 0.25, // +25% production per Inspiration, multiplicative
    newEditionCostFactor: 10, // each Publish multiplies every tier's base cost by this, compounding per edition
    // (simulated: 1e2 made run 2 a 3-hour wall; 10 gives runs of ~10/~33/~165 min — the AD-style escalating haul)
    inspirationSoftcap: 10, // gains beyond this per Publish are square-rooted, not linear
  },
  achievementProductionBonus: 0.03, // +3% ALL production per unlocked achievement, multiplicative
  achievementCheckIntervalMs: 1000, // checked at most 1x/sec, never per tick
  offlineProgress: {
    maxSeconds: 8 * 60 * 60, // capped at 8h
    stepSeconds: 1, // offline catch-up runs in 1s simulation steps, same math as tick()
    minSecondsToShow: 5, // don't bother with the modal for a same-second reload
  },
  // 25 achievements, 5x5 grid. Each `type` is evaluated by achievementConditionMet().
  // Per spec's illustrative list this covers every category named there; two of
  // the more extreme thresholds (1e50 lifetime Letters, owning 50 Words) were
  // dropped to land on exactly 25 for the grid — see task summary.
  achievements: [
    { id: 'firstLetter', name: 'First Letter', description: 'Type your very first Letter.', type: 'lifetimeLetters', value: 1 },
    { id: 'lifetime1e3', name: 'Getting Started', description: 'Earn 1,000 lifetime Letters.', type: 'lifetimeLetters', value: 1e3 },
    { id: 'lifetime1e6', name: 'Prolific', description: 'Earn 1,000,000 lifetime Letters.', type: 'lifetimeLetters', value: 1e6 },
    { id: 'lifetime1e9', name: 'Wordsmith', description: 'Earn 1e9 lifetime Letters.', type: 'lifetimeLetters', value: 1e9 },
    { id: 'lifetime1e12', name: 'Manuscript Ready', description: 'Earn 1e12 lifetime Letters.', type: 'lifetimeLetters', value: 1e12 },
    { id: 'lifetime1e15', name: 'Legendary Author', description: 'Earn 1e15 lifetime Letters.', type: 'lifetimeLetters', value: 1e15 },
    { id: 'words1', name: 'First Word', description: 'Own your first Word.', type: 'tierOwned', tierIndex: 0, value: 1 },
    { id: 'words10', name: 'Ten Words', description: 'Own 10 Words.', type: 'tierOwned', tierIndex: 0, value: 10 },
    { id: 'words100', name: 'Hundred Words', description: 'Own 100 Words.', type: 'tierOwned', tierIndex: 0, value: 100 },
    { id: 'sentences1', name: 'First Sentence', description: 'Own your first Sentence.', type: 'tierOwned', tierIndex: 1, value: 1 },
    { id: 'paragraphs1', name: 'First Paragraph', description: 'Own your first Paragraph.', type: 'tierOwned', tierIndex: 2, value: 1 },
    { id: 'pages1', name: 'First Page', description: 'Own your first Page.', type: 'tierOwned', tierIndex: 3, value: 1 },
    { id: 'chapters1', name: 'First Chapter', description: 'Own your first Chapter.', type: 'tierOwned', tierIndex: 4, value: 1 },
    { id: 'drafts1', name: 'First Draft', description: 'Own your first Draft.', type: 'tierOwned', tierIndex: 5, value: 1 },
    { id: 'clicks100', name: 'Hundred Keystrokes', description: 'Click the key 100 times.', type: 'totalClicks', value: 100 },
    { id: 'clicks1000', name: 'Thousand Keystrokes', description: 'Click the key 1,000 times.', type: 'totalClicks', value: 1000 },
    { id: 'everyUpgrade', name: 'Well-Equipped', description: 'Buy every upgrade type at least once.', type: 'everyUpgradeBought' },
    { id: 'publish1', name: 'First Edition', description: 'Publish 1 edition.', type: 'editionsPublished', value: 1 },
    { id: 'publish5', name: 'Prolific Publisher', description: 'Publish 5 editions.', type: 'editionsPublished', value: 5 },
    { id: 'publish25', name: 'Complete Works', description: 'Publish 25 editions.', type: 'editionsPublished', value: 25 },
    { id: 'playtime10m', name: 'Ten Minutes', description: 'Play for 10 minutes.', type: 'playtimeSeconds', value: 600 },
    { id: 'playtime1h', name: 'One Hour', description: 'Play for 1 hour.', type: 'playtimeSeconds', value: 3600 },
    { id: 'breakneck', name: 'Breakneck Pace', description: 'Reach 1,000,000 Letters/sec.', type: 'lettersPerSecond', value: 1e6 },
    { id: 'writersBlock', name: "Writer's Block", description: 'Own 0 Words with 1,000,000+ Letters.', type: 'writersBlock', value: 1e6 },
    { id: 'overcaffeinated', name: 'Overcaffeinated', description: 'Max out the Coffee upgrade.', type: 'maxUpgrade', upgradeId: 'coffee' },
  ],
};

const UPGRADE_INDEX = {};
CONFIG.upgrades.forEach((u, i) => { UPGRADE_INDEX[u.id] = i; });

// Tier k produces tier k-1 (tier 0's product is the Letters currency itself).
// `owned` is the live amount (grows continuously from cascade production).
// `purchased` is the count of manually-bought units, used only for cost —
// keeping it separate stops passive production from inflating your own prices.
function newTierState() {
  return CONFIG.tiers.map(() => ({ owned: 0, purchased: 0 }));
}

function newUpgradeState() {
  return CONFIG.upgrades.map(() => ({ level: 0 }));
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const game = {
  letters: 0,
  lifetimeLetters: 0, // never resets on Publish — gates the Publish unlock
  tiers: newTierState(),
  upgrades: newUpgradeState(), // reset on Publish
  inspiration: 0, // persists across Publishes; +25% production each
  editionsPublished: 0, // persists across Publishes
  totalClicks: 0, // lifetime manual clicks; never resets
  playtimeSeconds: 0, // lifetime seconds simulated; never resets
  upgradesEverBought: CONFIG.upgrades.map(() => false), // survives Publish resetting levels to 0
  achievementsUnlocked: CONFIG.achievements.map(() => false), // never re-locks once true
  lettersThisEdition: 0, // resets on Publish; drives the prestige gate and gain
  lastSaveTime: Date.now(), // wall-clock time of the last save; drives offline progress
  theme: 'dark', // 'dark' | 'light' — display preference, untouched by Publish/Hard Reset
};

// Hard numeric ceiling — beyond this, JS doubles approach Infinity and the UI
// breaks. A proper big-number lib (break_infinity-style) is the v2 fix.
const NUMBER_CAP = 1e300;
const clamp = (n) => (n > NUMBER_CAP ? NUMBER_CAP : n);

// Adds Letters earned (not spent). lifetimeLetters is the true total;
// lettersThisEdition resets on Publish and is what prestige gates/gains use —
// otherwise one Publish would qualify you forever (free-Inspiration exploit).
function addLetters(amount) {
  game.letters = clamp(game.letters + amount);
  game.lifetimeLetters = clamp(game.lifetimeLetters + amount);
  game.lettersThisEdition = clamp(game.lettersThisEdition + amount);
}

// ---------------------------------------------------------------------------
// Number formatting — plain to 1e6, scientific beyond.
// ---------------------------------------------------------------------------
function formatNumber(n) {
  if (!isFinite(n)) return '0';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  if (n < 1e6) {
    return Math.floor(n).toLocaleString('en-US');
  }
  const [mantissa, expPart] = n.toExponential(2).split('e');
  const exp = parseInt(expPart, 10);
  return `${mantissa}e${exp}`;
}

// ---------------------------------------------------------------------------
// Cost math
// ---------------------------------------------------------------------------
// Each Publish multiplies every tier's base cost by newEditionCostFactor,
// compounding with editionsPublished — run 2+ climbs against a steeper
// starting line than run 1, on top of the per-tier multiplier below.
function effectiveBaseCost(tierIndex) {
  const base = CONFIG.tiers[tierIndex].baseCost;
  return base * Math.pow(CONFIG.prestige.newEditionCostFactor, game.editionsPublished);
}

// Editor upgrade softens a tier's OWN cost multiplier by a flat amount,
// preserving the relative steepness between tiers rather than flattening
// them to one shared value.
function effectiveCostMultiplier(tierIndex) {
  const editor = game.upgrades[UPGRADE_INDEX.editor];
  const base = CONFIG.tiers[tierIndex].costMultiplier;
  return editor.level >= 1 ? base - CONFIG.upgradeEffects.editorCostReduction : base;
}

function costForOne(tierIndex, purchased) {
  return effectiveBaseCost(tierIndex) * Math.pow(effectiveCostMultiplier(tierIndex), purchased);
}

// Cost to buy n units starting from `purchased` already bought (geometric sum).
function costForN(tierIndex, purchased, n) {
  const r = effectiveCostMultiplier(tierIndex);
  return effectiveBaseCost(tierIndex) * Math.pow(r, purchased) * (Math.pow(r, n) - 1) / (r - 1);
}

// Largest n affordable with the given amount of letters.
function maxAffordable(tierIndex, purchased, letters) {
  const firstCost = costForOne(tierIndex, purchased);
  if (letters < firstCost) return 0;
  const r = effectiveCostMultiplier(tierIndex);
  let n = Math.floor(Math.log((letters * (r - 1)) / firstCost + 1) / Math.log(r));
  if (n < 0) n = 0;
  // Correct for floating-point drift around the boundary.
  while (costForN(tierIndex, purchased, n + 1) <= letters) n++;
  while (n > 0 && costForN(tierIndex, purchased, n) > letters) n--;
  return n;
}

// ---------------------------------------------------------------------------
// Production multipliers — tier-specific upgrades stack multiplicatively
// with the global multiplier (Coffee + Inspiration), per spec.
// ---------------------------------------------------------------------------
function unlockedAchievementCount() {
  return game.achievementsUnlocked.filter(Boolean).length;
}

function globalProductionMultiplier() {
  const coffeeLevel = game.upgrades[UPGRADE_INDEX.coffee].level;
  const coffeeMult = Math.pow(CONFIG.upgradeEffects.coffeeMultiplierPerLevel, coffeeLevel);
  const inspirationMult = Math.pow(1 + CONFIG.prestige.inspirationProductionBonus, game.inspiration);
  const achievementMult = Math.pow(1 + CONFIG.achievementProductionBonus, unlockedAchievementCount());
  return clamp(coffeeMult * inspirationMult * achievementMult);
}

function tierSpecificMultiplier(tierIndex) {
  if (tierIndex === 0) {
    const level = game.upgrades[UPGRADE_INDEX.freshRibbon].level;
    return Math.pow(CONFIG.upgradeEffects.freshRibbonMultiplierPerLevel, level);
  }
  if (tierIndex === 1) {
    const level = game.upgrades[UPGRADE_INDEX.thesaurus].level;
    return Math.pow(CONFIG.upgradeEffects.thesaurusMultiplierPerLevel, level);
  }
  return 1;
}

// Number of 10-purchased milestones crossed for a tier — based on `purchased`
// (manual buys only), same reasoning as cost: passive cascade production
// growing `owned` must never inflate this either.
function tierMilestoneCount(tierIndex) {
  return Math.floor(game.tiers[tierIndex].purchased / CONFIG.milestones.purchasedPerMilestone);
}

function tierMilestoneMultiplier(tierIndex) {
  return Math.pow(CONFIG.milestones.multiplierPerMilestone, tierMilestoneCount(tierIndex));
}

function tierOutputMultiplier(tierIndex) {
  return clamp(tierSpecificMultiplier(tierIndex) * tierMilestoneMultiplier(tierIndex) * globalProductionMultiplier());
}

function clickPower() {
  const level = game.upgrades[UPGRADE_INDEX.sturdierKeys].level;
  return CONFIG.clickPower * Math.pow(CONFIG.upgradeEffects.sturdierKeysMultiplierPerLevel, level);
}

function buyTier(tierIndex, amount) {
  const tier = game.tiers[tierIndex];
  const n = amount === 'max' ? maxAffordable(tierIndex, tier.purchased, game.letters) : amount;
  if (n <= 0) return;
  const cost = costForN(tierIndex, tier.purchased, n);
  if (cost > game.letters) return;
  game.letters -= cost;
  tier.purchased += n;
  tier.owned += n;
  render();
}

// ---------------------------------------------------------------------------
// Unlock logic — tier 0 always unlocked; tier i needs tier i-1 owned >= 1.
// ---------------------------------------------------------------------------
function isUnlocked(i) {
  return i === 0 || game.tiers[i - 1].owned >= 1;
}

// ---------------------------------------------------------------------------
// Simulation — production cascade. simulateProduction() is the single source
// of truth for "what does dt seconds of production do"; tick() calls it every
// 100ms during live play, and offline-progress catch-up calls it repeatedly
// in 1s steps so cascading compounds the same way it would have live.
// ---------------------------------------------------------------------------
function simulateProduction(dt) {
  const gains = new Array(CONFIG.tiers.length).fill(0);
  let letterGain = 0;

  // Read all pre-step amounts before mutating anything, so production
  // doesn't compound within a single step.
  for (let i = CONFIG.tiers.length - 1; i >= 0; i--) {
    const owned = game.tiers[i].owned;
    if (owned <= 0) continue;
    const produced = owned * dt * tierOutputMultiplier(i);
    if (i === 0) {
      letterGain += produced;
    } else {
      gains[i - 1] += produced;
    }
  }

  for (let i = 0; i < gains.length; i++) {
    game.tiers[i].owned = clamp(game.tiers[i].owned + gains[i]);
  }
  addLetters(letterGain);
}

function tick() {
  const dt = 1 / CONFIG.tickRate;
  simulateProduction(dt);
  game.playtimeSeconds += dt;
  render();
}

// Runs the cascade in whole-second steps for `elapsedSeconds` (capped),
// so cross-tier compounding matches what live play would have produced.
function simulateOfflineProgress(elapsedSeconds) {
  if (elapsedSeconds < CONFIG.offlineProgress.minSecondsToShow) return null;

  const cappedSeconds = Math.min(elapsedSeconds, CONFIG.offlineProgress.maxSeconds);
  const lettersBefore = game.letters;

  let remaining = cappedSeconds;
  while (remaining > 0) {
    const step = Math.min(CONFIG.offlineProgress.stepSeconds, remaining);
    simulateProduction(step);
    remaining -= step;
  }

  return {
    actualSeconds: elapsedSeconds,
    simulatedSeconds: cappedSeconds,
    wasCapped: elapsedSeconds > CONFIG.offlineProgress.maxSeconds,
    lettersGained: game.letters - lettersBefore,
  };
}

function lettersPerSecond() {
  return game.tiers[0].owned * tierOutputMultiplier(0);
}

// ---------------------------------------------------------------------------
// Rendering
//
// DOM nodes for tier rows and upgrade rows are built ONCE and cached; render()
// (called up to 10x/sec from tick()) only ever updates textContent/disabled/
// classList on existing nodes. Buy buttons are never destroyed mid-interaction,
// so a mousedown+mouseup pair always lands on the same element. Structural
// changes (adding/removing whole rows) happen only when a tier's unlock state
// actually changes — on purchase/production crossing a threshold, on Publish
// (which re-locks tiers), or on initial load. Upgrade rows never need
// structural changes; all 6 exist from boot and are only ever updated in
// place. Click handling is delegated once per list container instead of one
// listener per button.
// ---------------------------------------------------------------------------
const el = {
  lettersCount: document.getElementById('lettersCount'),
  lettersRate: document.getElementById('lettersRate'),
  tiersList: document.getElementById('tiersList'),
  statsList: document.getElementById('statsList'),
  typewriterKey: document.getElementById('typewriterKey'),
  typeLine: document.getElementById('typeLine'),
  bibliography: document.getElementById('bibliography'),
  upgradesList: document.getElementById('upgradesList'),
  publishSection: document.getElementById('publishSection'),
  publishBtn: document.getElementById('publishBtn'),
  publishModal: document.getElementById('publishModal'),
  publishModalBody: document.getElementById('publishModalBody'),
  publishCancelBtn: document.getElementById('publishCancelBtn'),
  publishConfirmBtn: document.getElementById('publishConfirmBtn'),
  achievementsGrid: document.getElementById('achievementsGrid'),
  toastContainer: document.getElementById('toastContainer'),
  offlineModal: document.getElementById('offlineModal'),
  offlineModalBody: document.getElementById('offlineModalBody'),
  offlineOkBtn: document.getElementById('offlineOkBtn'),
  exportBtn: document.getElementById('exportBtn'),
  exportModal: document.getElementById('exportModal'),
  exportText: document.getElementById('exportText'),
  exportCloseBtn: document.getElementById('exportCloseBtn'),
  importBtn: document.getElementById('importBtn'),
  importModal: document.getElementById('importModal'),
  importText: document.getElementById('importText'),
  importError: document.getElementById('importError'),
  importCancelBtn: document.getElementById('importCancelBtn'),
  importConfirmBtn: document.getElementById('importConfirmBtn'),
  hardResetBtn: document.getElementById('hardResetBtn'),
  hardResetModal: document.getElementById('hardResetModal'),
  hardResetInput: document.getElementById('hardResetInput'),
  hardResetCancelBtn: document.getElementById('hardResetCancelBtn'),
  hardResetConfirmBtn: document.getElementById('hardResetConfirmBtn'),
  themeToggle: document.getElementById('themeToggle'),
};

// ---------------------------------------------------------------------------
// Theme — dark by default; light mode via data-theme="light" on <html>.
// Persisted in the save, untouched by Publish/Hard Reset (a display
// preference, not game progress).
// ---------------------------------------------------------------------------
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    el.themeToggle.innerHTML = '&#9789;'; // last-quarter moon: switch to dark
  } else {
    document.documentElement.removeAttribute('data-theme');
    el.themeToggle.innerHTML = '&#9728;&#65038;'; // sun (text presentation): switch to light
  }
}

function toggleTheme() {
  game.theme = game.theme === 'light' ? 'dark' : 'light';
  applyTheme(game.theme);
  save();
}

el.themeToggle.addEventListener('click', toggleTheme);

// Displayed Letters count eases toward the real value instead of snapping,
// each render (10x/sec) — smooth enough without a separate rAF loop. Skipped
// entirely under prefers-reduced-motion.
let displayedLetters = 0;
const LETTERS_COUNT_EASE = 0.3;

function render() {
  if (prefersReducedMotion()) {
    displayedLetters = game.letters;
  } else {
    displayedLetters += (game.letters - displayedLetters) * LETTERS_COUNT_EASE;
    if (Math.abs(game.letters - displayedLetters) < Math.max(1, game.letters * 1e-6)) {
      displayedLetters = game.letters;
    }
  }
  el.lettersCount.textContent = formatNumber(displayedLetters);
  el.lettersRate.textContent = `+${formatNumber(lettersPerSecond())}/sec`;
  syncTierStructure();
  updateTierRows();
  updateUpgradeRows();
  updateStats();
  renderPublish();
  renderBibliography();
}

// --- Tier rows: build-once cache + incremental structural sync -------------
const tierRowCache = new Array(CONFIG.tiers.length).fill(null);
let renderedUnlockedCount = 0;
let lockedRowEl = null;

function computeUnlockedCount() {
  let count = 0;
  for (let i = 0; i < CONFIG.tiers.length; i++) {
    if (!isUnlocked(i)) break;
    count++;
  }
  return count;
}

// Adds/removes whole tier rows when the unlocked count changes (purchase,
// production crossing a threshold, Publish re-locking tiers, or load). Never
// touches rows for tiers whose unlock state hasn't changed.
function syncTierStructure() {
  const currentUnlockedCount = computeUnlockedCount();
  if (currentUnlockedCount === renderedUnlockedCount) return;

  if (currentUnlockedCount > renderedUnlockedCount) {
    for (let i = renderedUnlockedCount; i < currentUnlockedCount; i++) {
      if (!tierRowCache[i]) tierRowCache[i] = buildTierRow(i);
      el.tiersList.appendChild(tierRowCache[i].row);
    }
  } else {
    for (let i = currentUnlockedCount; i < renderedUnlockedCount; i++) {
      const cached = tierRowCache[i];
      if (cached && cached.row.parentNode) cached.row.parentNode.removeChild(cached.row);
    }
  }

  if (!lockedRowEl) lockedRowEl = buildLockedRow();
  if (lockedRowEl.parentNode) lockedRowEl.parentNode.removeChild(lockedRowEl);
  if (currentUnlockedCount < CONFIG.tiers.length) {
    el.tiersList.appendChild(lockedRowEl);
  }

  renderedUnlockedCount = currentUnlockedCount;
}

function buildLockedRow() {
  const row = document.createElement('div');
  row.className = 'tier-row locked';

  const head = document.createElement('div');
  head.className = 'tier-head';
  const name = document.createElement('span');
  name.className = 'tier-name';
  name.textContent = '???';
  head.appendChild(name);
  row.appendChild(head);

  const sub = document.createElement('div');
  sub.className = 'tier-sub';
  sub.textContent = 'Own your first unit of the tier above to reveal this.';
  row.appendChild(sub);

  return row;
}

function buildTierRow(i) {
  const cfg = CONFIG.tiers[i];

  const row = document.createElement('div');
  row.className = 'tier-row';

  const head = document.createElement('div');
  head.className = 'tier-head';
  const nameEl = document.createElement('span');
  nameEl.className = 'tier-name';
  nameEl.textContent = cfg.name;
  head.appendChild(nameEl);
  const ownedEl = document.createElement('span');
  ownedEl.className = 'tier-owned';
  head.appendChild(ownedEl);
  row.appendChild(head);

  const subEl = document.createElement('div');
  subEl.className = 'tier-sub';
  row.appendChild(subEl);

  const milestoneEl = document.createElement('div');
  milestoneEl.className = 'tier-milestone';
  row.appendChild(milestoneEl);

  const buttonsWrap = document.createElement('div');
  buttonsWrap.className = 'tier-buttons';
  const b1 = buildBuyButton(i, 1, 'x1');
  const b10 = buildBuyButton(i, 10, 'x10');
  const bMax = buildBuyButton(i, 'max', 'Max');
  buttonsWrap.appendChild(b1.btn);
  buttonsWrap.appendChild(b10.btn);
  buttonsWrap.appendChild(bMax.btn);
  row.appendChild(buttonsWrap);

  // Seeded from the CURRENT milestone count, not 0 — a tier built while
  // already partway through purchases (fresh unlock mid-game, or a loaded
  // save) must not glow on its very first render as if it just leveled up.
  return {
    row, ownedEl, subEl, milestoneEl,
    buttons: { 1: b1, 10: b10, max: bMax },
    lastMilestoneCount: tierMilestoneCount(i),
  };
}

// Restarts the CSS glow animation even if it's still mid-flight from a very
// recent trigger (remove + reflow + re-add, the standard trick for forcing a
// CSS animation to replay on an already-present class).
function triggerMilestoneGlow(row) {
  row.classList.remove('milestone-flash');
  void row.offsetWidth;
  row.classList.add('milestone-flash');
}

// Persistent button: label + optional count (Max only) + cost, as separate
// child spans so updates only ever touch textContent, never innerHTML.
function buildBuyButton(tierIndex, amount, label) {
  const btn = document.createElement('button');
  btn.className = 'buy-btn';
  btn.dataset.tierIndex = String(tierIndex);
  btn.dataset.amount = String(amount);

  const labelEl = document.createElement('span');
  labelEl.className = 'btn-label';
  labelEl.textContent = label;
  btn.appendChild(labelEl);

  let countEl = null;
  if (amount === 'max') {
    countEl = document.createElement('span');
    countEl.className = 'btn-count';
    btn.appendChild(countEl);
  }

  const costEl = document.createElement('span');
  costEl.className = 'cost';
  btn.appendChild(costEl);

  return { btn, costEl, countEl };
}

function updateTierRows() {
  for (let i = 0; i < renderedUnlockedCount; i++) updateTierRow(i);
}

function updateTierRow(i) {
  const cache = tierRowCache[i];
  const tier = game.tiers[i];

  cache.ownedEl.textContent = `${formatNumber(tier.purchased)} bought · ${formatNumber(tier.owned)} owned`;

  const producesUnit = i === 0 ? 'Letter' : CONFIG.tiers[i - 1].name.replace(/s$/, '');
  cache.subEl.textContent = `Each produces ${formatNumber(tierOutputMultiplier(i))} ${producesUnit}/sec`;

  const perMilestone = CONFIG.milestones.purchasedPerMilestone;
  const progress = tier.purchased % perMilestone;
  cache.milestoneEl.textContent =
    `Milestone ×${formatNumber(tierMilestoneMultiplier(i))} — ${progress}/${perMilestone} to ×${CONFIG.milestones.multiplierPerMilestone} more`;

  const currentMilestoneCount = tierMilestoneCount(i);
  if (currentMilestoneCount > cache.lastMilestoneCount) {
    triggerMilestoneGlow(cache.row);
  }
  cache.lastMilestoneCount = currentMilestoneCount;

  updateBuyButton(i, 1, cache.buttons[1]);
  updateBuyButton(i, 10, cache.buttons[10]);
  updateBuyButton(i, 'max', cache.buttons.max);
}

function updateBuyButton(tierIndex, amount, cache) {
  const tier = game.tiers[tierIndex];
  const n = amount === 'max' ? maxAffordable(tierIndex, tier.purchased, game.letters) : amount;
  const cost = n > 0 ? costForN(tierIndex, tier.purchased, n) : costForOne(tierIndex, tier.purchased);

  cache.btn.disabled = n <= 0 || cost > game.letters;
  cache.costEl.textContent = formatNumber(cost);
  if (cache.countEl) cache.countEl.textContent = n > 0 ? ` (${n})` : '';
}

function onTiersListClick(e) {
  const btn = e.target.closest('.buy-btn');
  if (!btn || !el.tiersList.contains(btn)) return;
  const tierIndex = Number(btn.dataset.tierIndex);
  const raw = btn.dataset.amount;
  buyTier(tierIndex, raw === 'max' ? 'max' : Number(raw));
}

// --- Stats: static rows built once, values updated in place -----------------
let statsCache = null;

function buildStatsRows() {
  const rows = [
    ['lettersPerSec', 'Letters / sec'],
    ['highestTier', 'Highest tier owned'],
    ['inspiration', 'Inspiration'],
    ['editions', 'Editions published'],
  ];
  const cache = {};
  rows.forEach(([key, label]) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'stat-value';
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    el.statsList.appendChild(row);
    cache[key] = valueEl;
  });
  return cache;
}

function updateStats() {
  const highestOwned = [...game.tiers].reverse().find((t) => t.owned >= 1);
  const highestIndex = highestOwned ? game.tiers.indexOf(highestOwned) : -1;
  const highestName = highestIndex >= 0 ? CONFIG.tiers[highestIndex].name : '—';
  const inspirationBonusPct = (Math.pow(1 + CONFIG.prestige.inspirationProductionBonus, game.inspiration) - 1) * 100;

  statsCache.lettersPerSec.textContent = formatNumber(lettersPerSecond());
  statsCache.highestTier.textContent = highestName;
  statsCache.inspiration.textContent = `${formatNumber(game.inspiration)} (+${formatNumber(inspirationBonusPct)}%)`;
  statsCache.editions.textContent = formatNumber(game.editionsPublished);
}

// ---------------------------------------------------------------------------
// Upgrades — all 6 rows built once at boot; never structurally changed again.
// ---------------------------------------------------------------------------
const upgradeRowCache = new Array(CONFIG.upgrades.length).fill(null);

function upgradeCost(upgradeIndex) {
  const cfg = CONFIG.upgrades[upgradeIndex];
  const level = game.upgrades[upgradeIndex].level;
  return cfg.baseCost * Math.pow(cfg.costMultiplier, level);
}

function buyUpgrade(upgradeIndex) {
  const cfg = CONFIG.upgrades[upgradeIndex];
  const state = game.upgrades[upgradeIndex];
  if (state.level >= cfg.maxLevel) return;
  const cost = upgradeCost(upgradeIndex);
  if (cost > game.letters) return;
  game.letters -= cost;
  state.level += 1;
  game.upgradesEverBought[upgradeIndex] = true; // survives Publish, unlike state.level
  render();
}

function buildUpgradeRow(i) {
  const cfg = CONFIG.upgrades[i];

  const row = document.createElement('div');
  row.className = 'upgrade-row';

  const head = document.createElement('div');
  head.className = 'upgrade-head';
  const nameEl = document.createElement('span');
  nameEl.className = 'upgrade-name';
  nameEl.textContent = cfg.name;
  head.appendChild(nameEl);
  const levelEl = document.createElement('span');
  levelEl.className = 'upgrade-level';
  head.appendChild(levelEl);
  row.appendChild(head);

  const descEl = document.createElement('div');
  descEl.className = 'upgrade-desc';
  descEl.textContent = cfg.description;
  row.appendChild(descEl);

  const btn = document.createElement('button');
  btn.className = 'buy-btn';
  btn.dataset.upgradeIndex = String(i);
  const labelEl = document.createElement('span');
  labelEl.className = 'btn-label';
  btn.appendChild(labelEl);
  const costEl = document.createElement('span');
  costEl.className = 'cost';
  btn.appendChild(costEl);
  row.appendChild(btn);

  return { row, levelEl, btn, labelEl, costEl };
}

function updateUpgradeRows() {
  for (let i = 0; i < CONFIG.upgrades.length; i++) updateUpgradeRow(i);
}

function updateUpgradeRow(i) {
  const cache = upgradeRowCache[i];
  const cfg = CONFIG.upgrades[i];
  const state = game.upgrades[i];
  const maxed = state.level >= cfg.maxLevel;

  cache.row.classList.toggle('maxed', maxed);
  cache.levelEl.textContent = cfg.maxLevel === 1 ? (maxed ? 'owned' : '') : `Lv ${state.level}/${cfg.maxLevel}`;

  if (maxed) {
    cache.btn.disabled = true;
    cache.labelEl.textContent = 'Maxed';
    cache.costEl.textContent = '';
  } else {
    cache.btn.disabled = upgradeCost(i) > game.letters;
    cache.labelEl.textContent = 'Buy';
    cache.costEl.textContent = formatNumber(upgradeCost(i));
  }
}

function onUpgradesListClick(e) {
  const btn = e.target.closest('.buy-btn');
  if (!btn || !el.upgradesList.contains(btn)) return;
  buyUpgrade(Number(btn.dataset.upgradeIndex));
}

// ---------------------------------------------------------------------------
// Achievements — 25 cells built once at boot; only classList/text updated
// afterward. Conditions are checked at most 1x/sec (see boot section), never
// per tick, and the grid is only refreshed when something actually unlocked.
// ---------------------------------------------------------------------------
const achievementCellCache = new Array(CONFIG.achievements.length).fill(null);

function achievementConditionMet(cfg) {
  switch (cfg.type) {
    case 'lifetimeLetters':
      return game.lifetimeLetters >= cfg.value;
    case 'tierOwned':
      return game.tiers[cfg.tierIndex].owned >= cfg.value;
    case 'totalClicks':
      return game.totalClicks >= cfg.value;
    case 'everyUpgradeBought':
      return game.upgradesEverBought.every(Boolean);
    case 'editionsPublished':
      return game.editionsPublished >= cfg.value;
    case 'playtimeSeconds':
      return game.playtimeSeconds >= cfg.value;
    case 'lettersPerSecond':
      return lettersPerSecond() >= cfg.value;
    case 'writersBlock':
      return game.tiers[0].owned === 0 && game.letters > cfg.value;
    case 'maxUpgrade': {
      const idx = UPGRADE_INDEX[cfg.upgradeId];
      return game.upgrades[idx].level >= CONFIG.upgrades[idx].maxLevel;
    }
    default:
      return false;
  }
}

// Checked on its own 1x/sec interval (see boot), independent of the 10x/sec
// tick loop, per the "at most once per second" requirement.
function checkAchievements() {
  let changed = false;
  for (let i = 0; i < CONFIG.achievements.length; i++) {
    if (game.achievementsUnlocked[i]) continue;
    if (achievementConditionMet(CONFIG.achievements[i])) {
      game.achievementsUnlocked[i] = true;
      changed = true;
      showAchievementToast(CONFIG.achievements[i]);
    }
  }
  if (changed) updateAchievementsGrid();
}

function buildAchievementCell(i) {
  const cfg = CONFIG.achievements[i];

  const cell = document.createElement('div');
  cell.className = 'achievement-cell locked';

  const nameEl = document.createElement('div');
  nameEl.className = 'achievement-name';
  nameEl.textContent = cfg.name;
  cell.appendChild(nameEl);

  const descEl = document.createElement('div');
  descEl.className = 'achievement-desc';
  descEl.textContent = cfg.description;
  cell.appendChild(descEl);

  return { cell };
}

// Only ever touches classList — names/descriptions are static text set once
// at build time, so there's nothing else to update in place.
function updateAchievementsGrid() {
  for (let i = 0; i < CONFIG.achievements.length; i++) {
    const cache = achievementCellCache[i];
    const unlocked = game.achievementsUnlocked[i];
    cache.cell.classList.toggle('unlocked', unlocked);
    cache.cell.classList.toggle('locked', !unlocked);
  }
}

function showAchievementToast(cfg) {
  const toast = document.createElement('div');
  toast.className = 'toast';

  const label = document.createElement('strong');
  label.textContent = 'Achievement unlocked: ';
  toast.appendChild(label);

  const name = document.createElement('span');
  name.textContent = cfg.name;
  toast.appendChild(name);

  el.toastContainer.appendChild(toast);
  // Matches the CSS toast-in/toast-out animation total duration.
  setTimeout(() => toast.remove(), 4300);
}

// Build the always-visible upgrade rows, achievement cells, and stats rows
// once, and wire up delegated click handling for both lists plus every modal.
function initDom() {
  for (let i = 0; i < CONFIG.upgrades.length; i++) {
    upgradeRowCache[i] = buildUpgradeRow(i);
    el.upgradesList.appendChild(upgradeRowCache[i].row);
  }
  for (let i = 0; i < CONFIG.achievements.length; i++) {
    achievementCellCache[i] = buildAchievementCell(i);
    el.achievementsGrid.appendChild(achievementCellCache[i].cell);
  }
  statsCache = buildStatsRows();
  el.tiersList.addEventListener('click', onTiersListClick);
  el.upgradesList.addEventListener('click', onUpgradesListClick);

  el.offlineOkBtn.addEventListener('click', closeOfflineModal);
  el.exportBtn.addEventListener('click', openExportModal);
  el.exportCloseBtn.addEventListener('click', closeExportModal);
  el.importBtn.addEventListener('click', openImportModal);
  el.importCancelBtn.addEventListener('click', closeImportModal);
  el.importConfirmBtn.addEventListener('click', importSave);
  el.hardResetBtn.addEventListener('click', openHardResetModal);
  el.hardResetCancelBtn.addEventListener('click', closeHardResetModal);
  el.hardResetConfirmBtn.addEventListener('click', () => {
    doHardReset();
    closeHardResetModal();
  });
  el.hardResetInput.addEventListener('input', () => {
    el.hardResetConfirmBtn.disabled = el.hardResetInput.value.trim().toUpperCase() !== 'RESET';
  });
}

// ---------------------------------------------------------------------------
// Prestige: Publish
// ---------------------------------------------------------------------------
function canPublish() {
  // Gates on THIS edition's letters, not lifetime — lifetime never resets,
  // so gating on it made every Publish after the first free (exploit).
  return game.lettersThisEdition >= CONFIG.prestige.unlockLifetimeLetters;
}

// Linear up to the softcap, then sqrt-scaled beyond it — early Publishes stay
// generous while very large lettersThisEdition runs don't snowball Inspiration.
function inspirationGainPreview() {
  const raw = Math.floor(Math.cbrt(game.lettersThisEdition / CONFIG.prestige.inspirationDivisor));
  const cap = CONFIG.prestige.inspirationSoftcap;
  const softcapped = raw <= cap ? raw : cap + Math.sqrt(raw - cap);
  return Math.max(1, Math.floor(softcapped));
}

function doPublish() {
  if (!canPublish()) return;
  const gained = inspirationGainPreview();
  game.inspiration += gained;
  game.editionsPublished += 1;
  game.letters = 0;
  game.lettersThisEdition = 0; // the exploit fix: progress toward next Publish restarts
  game.tiers = newTierState();
  game.upgrades = newUpgradeState();
  save();
  render();
}

function renderPublish() {
  el.publishSection.classList.toggle('hidden', !canPublish());
}

function openPublishModal() {
  if (!canPublish()) return;
  const gained = inspirationGainPreview();
  el.publishModalBody.textContent =
    `Publishing resets your Letters, tiers, and upgrades. You will gain ${formatNumber(gained)} ` +
    `Inspiration (${formatNumber(game.inspiration)} → ${formatNumber(game.inspiration + gained)}), ` +
    `each permanently adding +25% to all production.`;
  el.publishModal.classList.remove('hidden');
}

function closePublishModal() {
  el.publishModal.classList.add('hidden');
}

el.publishBtn.addEventListener('click', openPublishModal);
el.publishCancelBtn.addEventListener('click', closePublishModal);
el.publishConfirmBtn.addEventListener('click', () => {
  doPublish();
  closePublishModal();
});

// ---------------------------------------------------------------------------
// Bibliography — one roman numeral per published edition.
// ---------------------------------------------------------------------------
const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function toRoman(num) {
  let result = '';
  for (const [value, symbol] of ROMAN_NUMERALS) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

function renderBibliography() {
  if (game.editionsPublished <= 0) {
    el.bibliography.textContent = '';
    return;
  }
  const numerals = [];
  for (let i = 1; i <= game.editionsPublished; i++) numerals.push(toRoman(i));
  el.bibliography.textContent = numerals.join(' · ');
}

// ---------------------------------------------------------------------------
// Offline progress — computed once at boot from the gap since lastSaveTime.
// ---------------------------------------------------------------------------
function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

// Applies catch-up production for time elapsed since the last save and
// returns info for the "While you were away..." modal, or null if there's
// nothing worth showing (fresh game, or too little time passed).
function applyOfflineProgress() {
  const elapsedSeconds = (Date.now() - game.lastSaveTime) / 1000;
  game.lastSaveTime = Date.now();
  if (elapsedSeconds <= 0) return null;
  return simulateOfflineProgress(elapsedSeconds);
}

function showOfflineModal(info) {
  const cappedNote = info.wasCapped ? ' (offline progress caps at 8h)' : '';
  el.offlineModalBody.textContent =
    `You were away for ${formatDuration(info.actualSeconds)}${cappedNote}. ` +
    `Your Words and their descendants kept working — you earned ${formatNumber(info.lettersGained)} Letters.`;
  el.offlineModal.classList.remove('hidden');
}

function closeOfflineModal() {
  el.offlineModal.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Export / Import — base64-encoded JSON, reusing the same save payload and
// version-migration logic as normal load().
// ---------------------------------------------------------------------------
// btoa/atob only handle Latin1; this wrapping makes them UTF-8 safe using
// only built-in browser APIs (no dependencies, per project constraints).
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function openExportModal() {
  const json = JSON.stringify(buildSavePayload());
  el.exportText.value = encodeBase64(json);
  el.exportModal.classList.remove('hidden');
  el.exportText.select();
}

function closeExportModal() {
  el.exportModal.classList.add('hidden');
}

function openImportModal() {
  el.importText.value = '';
  el.importError.classList.add('hidden');
  el.importModal.classList.remove('hidden');
}

function closeImportModal() {
  el.importModal.classList.add('hidden');
}

function importSave() {
  const text = el.importText.value.trim();
  let json;
  try {
    json = text ? decodeBase64(text) : null;
  } catch (e) {
    json = null;
  }
  const data = json && parseSaveString(json);
  if (!data || !applySaveData(data)) {
    el.importError.classList.remove('hidden');
    return;
  }
  save();
  render();
  updateAchievementsGrid();
  closeImportModal();
}

// ---------------------------------------------------------------------------
// Hard Reset — double-confirm via typing "RESET"; wipes everything, including
// lifetime stats and achievements (unlike Publish, which keeps those).
// ---------------------------------------------------------------------------
function openHardResetModal() {
  el.hardResetInput.value = '';
  el.hardResetConfirmBtn.disabled = true;
  el.hardResetModal.classList.remove('hidden');
}

function closeHardResetModal() {
  el.hardResetModal.classList.add('hidden');
}

function doHardReset() {
  game.letters = 0;
  game.lifetimeLetters = 0;
  game.tiers = newTierState();
  game.upgrades = newUpgradeState();
  game.inspiration = 0;
  game.editionsPublished = 0;
  game.totalClicks = 0;
  game.playtimeSeconds = 0;
  game.upgradesEverBought = CONFIG.upgrades.map(() => false);
  game.achievementsUnlocked = CONFIG.achievements.map(() => false);
  game.lastSaveTime = Date.now();
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch (e) {
    // localStorage unavailable — in-memory state is still reset.
  }
  render();
  updateAchievementsGrid();
}

// ---------------------------------------------------------------------------
// Clicker interaction
// ---------------------------------------------------------------------------
const RANDOM_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomLetter() {
  return RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)];
}

function onKeyClick(event) {
  let gain = clickPower();
  if (game.upgrades[UPGRADE_INDEX.muse].level >= 1) {
    gain += CONFIG.upgradeEffects.museLettersPerSecShare * lettersPerSecond();
  }
  addLetters(gain);
  spawnClickGain(gain, event);
  game.totalClicks += 1;
  el.typewriterKey.textContent = randomLetter();
  spawnTypeFlit();
  el.lettersCount.classList.add('pulse');
  setTimeout(() => el.lettersCount.classList.remove('pulse'), 150);
  render();
}

// Floating "+N" at the cursor position on each click. Fixed positioning from
// clientX/Y so it works regardless of scroll or layout; small random x-drift
// stops rapid clicks from stacking into one unreadable blob.
function spawnClickGain(gain, event) {
  const tag = document.createElement('span');
  tag.className = 'click-gain';
  tag.textContent = `+${formatNumber(gain)}`;
  const x = event && typeof event.clientX === 'number' ? event.clientX : el.typewriterKey.getBoundingClientRect().left;
  const y = event && typeof event.clientY === 'number' ? event.clientY : el.typewriterKey.getBoundingClientRect().top;
  tag.style.left = `${x + (Math.random() * 24 - 12)}px`;
  tag.style.top = `${y - 14}px`;
  document.body.appendChild(tag);
  tag.addEventListener('animationend', () => tag.remove());
}

function spawnTypeFlit() {
  const flit = document.createElement('span');
  flit.className = 'flit';
  flit.textContent = randomLetter();
  flit.style.left = `${45 + Math.random() * 10}%`;
  el.typeLine.appendChild(flit);
  flit.addEventListener('animationend', () => flit.remove());
}

el.typewriterKey.addEventListener('click', onKeyClick);

// ---------------------------------------------------------------------------
// Save / load
//
// buildSavePayload()/applySaveData() are the single source of truth for the
// save shape, shared by the autosave/beforeunload path AND by Export/Import —
// so a save exported before a version bump still imports via the same
// migration chain that reading it from localStorage would use.
// ---------------------------------------------------------------------------
function buildSavePayload() {
  return {
    version: CONFIG.saveVersion,
    letters: game.letters,
    lifetimeLetters: game.lifetimeLetters,
    lettersThisEdition: game.lettersThisEdition,
    tiers: game.tiers.map((t) => ({ owned: t.owned, purchased: t.purchased })),
    upgrades: game.upgrades.map((u) => ({ level: u.level })),
    inspiration: game.inspiration,
    editionsPublished: game.editionsPublished,
    totalClicks: game.totalClicks,
    playtimeSeconds: game.playtimeSeconds,
    upgradesEverBought: game.upgradesEverBought.slice(),
    achievementsUnlocked: game.achievementsUnlocked.slice(),
    lastSaveTime: game.lastSaveTime,
    theme: game.theme,
  };
}

function save() {
  game.lastSaveTime = Date.now();
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(buildSavePayload()));
  } catch (e) {
    // localStorage unavailable (e.g. private mode quota) — nothing more to do.
  }
}

function loadTiers(savedTiers) {
  if (!Array.isArray(savedTiers)) return;
  savedTiers.forEach((saved, i) => {
    if (!game.tiers[i] || !saved) return;
    game.tiers[i].owned = typeof saved.owned === 'number' ? saved.owned : 0;
    game.tiers[i].purchased = typeof saved.purchased === 'number' ? saved.purchased : 0;
  });
}

function loadUpgradeLevels(savedUpgrades) {
  if (!Array.isArray(savedUpgrades)) return;
  savedUpgrades.forEach((saved, i) => {
    if (!game.upgrades[i] || !saved) return;
    game.upgrades[i].level = typeof saved.level === 'number' ? saved.level : 0;
  });
}

function parseSaveString(raw) {
  if (!raw) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return null; // corrupt save — caller starts fresh rather than crash
  }
  if (!data || typeof data !== 'object') return null;
  return data;
}

// Applies a parsed save object to `game`, migrating older versions forward.
// Returns false for unrecognized data (caller should leave state untouched).
function applySaveData(data) {
  if (!data || typeof data !== 'object') return false;

  if (data.version === 1) {
    // Pre-upgrades/prestige/achievements save. lifetimeLetters, upgrades,
    // achievements, click/playtime counters, and lastSaveTime didn't exist
    // yet — seed lifetimeLetters from current letters as a safe lower bound,
    // and leave the rest at their fresh-game defaults.
    if (typeof data.letters === 'number') {
      game.letters = data.letters;
      game.lifetimeLetters = data.letters;
    }
    loadTiers(data.tiers);
    game.lastSaveTime = Date.now(); // no history to diff offline progress against
    return true;
  }

  if (data.version === 2) {
    // Pre-achievements save. Everything from v2 carries over; achievements
    // start fresh, and "every upgrade bought" is inferred from current levels
    // (the best available signal, since v2 never tracked it separately).
    if (typeof data.letters === 'number') game.letters = data.letters;
    if (typeof data.lifetimeLetters === 'number') game.lifetimeLetters = data.lifetimeLetters;
    if (typeof data.inspiration === 'number') game.inspiration = data.inspiration;
    if (typeof data.editionsPublished === 'number') game.editionsPublished = data.editionsPublished;
    loadTiers(data.tiers);
    loadUpgradeLevels(data.upgrades);
    game.upgradesEverBought = game.upgrades.map((u) => u.level >= 1);
    game.lastSaveTime = Date.now();
    return true;
  }

  if (data.version === 3) {
    // Pre-lettersThisEdition save (the free-Inspiration exploit era). Seed
    // this edition's progress from lifetime so an in-flight run isn't robbed
    // of an earned Publish; the exploit dies because doPublish now resets it.
    data.lettersThisEdition = typeof data.lifetimeLetters === 'number' ? data.lifetimeLetters : 0;
    data.version = 4;
  }

  if (data.version === 4) {
    // Pre-theme save. Dark is the new default, so a save with no opinion on
    // theme should land there rather than defaulting to light.
    data.theme = 'dark';
    data.version = 5;
  }

  if (data.version !== CONFIG.saveVersion) {
    return false; // unknown/future version — caller leaves state untouched
  }

  if (typeof data.letters === 'number') game.letters = data.letters;
  if (typeof data.lifetimeLetters === 'number') game.lifetimeLetters = data.lifetimeLetters;
  if (typeof data.lettersThisEdition === 'number') game.lettersThisEdition = data.lettersThisEdition;
  if (typeof data.inspiration === 'number') game.inspiration = data.inspiration;
  if (typeof data.editionsPublished === 'number') game.editionsPublished = data.editionsPublished;
  if (typeof data.totalClicks === 'number') game.totalClicks = data.totalClicks;
  if (typeof data.playtimeSeconds === 'number') game.playtimeSeconds = data.playtimeSeconds;
  if (typeof data.lastSaveTime === 'number') game.lastSaveTime = data.lastSaveTime;
  if (data.theme === 'light' || data.theme === 'dark') game.theme = data.theme;
  loadTiers(data.tiers);
  loadUpgradeLevels(data.upgrades);
  if (Array.isArray(data.upgradesEverBought)) {
    game.upgradesEverBought = CONFIG.upgrades.map((_, i) => Boolean(data.upgradesEverBought[i]));
  }
  if (Array.isArray(data.achievementsUnlocked)) {
    game.achievementsUnlocked = CONFIG.achievements.map((_, i) => Boolean(data.achievementsUnlocked[i]));
  }
  return true;
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(CONFIG.saveKey);
  } catch (e) {
    return;
  }
  const data = parseSaveString(raw);
  if (!data) return;
  applySaveData(data);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
initDom();
load();
applyTheme(game.theme);
const offlineInfo = applyOfflineProgress();
render();
updateAchievementsGrid();
checkAchievements(); // catch anything already true (loaded save, offline catch-up) immediately
if (offlineInfo) showOfflineModal(offlineInfo);
setInterval(tick, 1000 / CONFIG.tickRate);
setInterval(checkAchievements, CONFIG.achievementCheckIntervalMs);
setInterval(save, CONFIG.autosaveIntervalMs);
window.addEventListener('beforeunload', save);
