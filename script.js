/* =====================================================================
   underrated.fi · three tools for the investment thesis
   ===================================================================== */

// ====================================================================
// TOOL I — STRATEGY CALCULATOR
// ====================================================================
const STRATEGIES = [
  { key: 'spot',       short: 'Spot',        fn: k => k,                       color: '#7A6650', dashed: true },
  { key: 'linear2x',   short: '2× Linear',   fn: k => 2 * k - 1,               color: '#8B2A1E', dashed: true, canLiquidate: true },
  { key: 'eth_plus',   short: 'ETH+',        fn: k => k,                       color: '#2C4870' },
  { key: 'super_eth',  short: 'SuperETH+',   fn: k => 0.5 * k * k + 0.5,       color: '#5D6B3E' },
  { key: 'long_eth',   short: 'LongETH+',    fn: k => k * k,                   color: '#3F5424' },
  { key: 'eth_usdc',   short: 'ETH_USDC+',   fn: k => 1 / k,                   color: '#8E5C9A' },
  { key: 'super_usdc', short: 'SuperUSDC+',  fn: k => 0.5 / (k * k) + 0.5 * k, color: '#B53A2A' },
  { key: 'long_usdc',  short: 'LongUSDC+',   fn: k => 1 / (k * k),             color: '#8B2A1E' },
];

const calcState = {
  cost: 2000,
  target: 4000,
  asset: 'TKN',
  // Strategy visibility on the chart. Spot + 2x Linear are baselines (always on).
  // SuperETH+ shown by default to demonstrate the convex advantage.
  visible: new Set(['spot', 'linear2x', 'super_eth']),
  autoWinner: null,     // which Strats strategy is auto-shown (tracks best)
  manualToggled: new Set(), // strategies the user has manually toggled (override auto-winner)
};
const getK = () => calcState.target / calcState.cost;

// Baseline strategies never turn off
const BASELINE_KEYS = new Set(['spot', 'linear2x']);

function fmtPct(n) {
  if (!isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(n >= 100 || n <= -100 ? 0 : 1)}%`;
}
function fmtUsd(n) {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtUsdCompact(n) {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function computeResults(k) {
  return STRATEGIES.map(s => {
    const mult = s.fn(k);
    const liquidated = s.canLiquidate && mult <= 0;
    const value = calcState.cost * Math.max(mult, 0);
    const ret = (mult - 1) * 100;
    return { ...s, mult, value, ret, liquidated };
  });
}

function renderReadout() {
  const el = document.getElementById('calc-readout');
  if (!el) return;
  const k = getK();
  const results = computeResults(k);
  const stratsOnly = results.filter(r => !['spot', 'linear2x'].includes(r.key));
  const winner = stratsOnly.reduce((best, r) => r.ret > best.ret ? r : best, stratsOnly[0]);
  const spot = results.find(r => r.key === 'spot');
  const dirPct = ((k - 1) * 100).toFixed(0);
  const dirSign = k > 1 ? '+' : '';
  el.innerHTML = `
    <strong>${calcState.asset}</strong> ${fmtUsd(calcState.cost)} → ${fmtUsd(calcState.target)}
    (<span class="k-val">${dirSign}${dirPct}%</span>) · spot
    <strong>${fmtPct(spot.ret)}</strong> · best Strats (<strong>${winner.short}</strong>)
    <strong>${fmtPct(winner.ret)}</strong>
  `;
}

function renderChart() {
  const svg = document.getElementById('chart');
  if (!svg) return;
  const W = 800, H = 240;
  const PAD = { l: 48, r: 18, t: 20, b: 34 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const kMin = 0.1, kMax = 3;
  const yMin = -100, yMax = 900;

  const xScale = k => PAD.l + (k - kMin) / (kMax - kMin) * innerW;
  const yScale = ret => PAD.t + (1 - (ret - yMin) / (yMax - yMin)) * innerH;

  const parts = [];

  [-100, 0, 100, 200, 300, 500, 700, 900].forEach(y => {
    const yy = yScale(y);
    const isZero = y === 0;
    parts.push(`<line x1="${PAD.l}" y1="${yy}" x2="${W - PAD.r}" y2="${yy}"
      stroke="${isZero ? '#7A6650' : '#A8895C'}" stroke-width="${isZero ? 1.2 : 0.5}"
      stroke-dasharray="${isZero ? '0' : '1,3'}" />`);
    parts.push(`<text x="${PAD.l - 6}" y="${yy + 3}" text-anchor="end"
      font-family="JetBrains Mono, monospace" font-size="9" fill="#7A6650" font-weight="600">${y >= 0 ? '+' : ''}${y}%</text>`);
  });

  [0.5, 1, 1.5, 2, 2.5, 3].forEach(x => {
    const xx = xScale(x);
    const isOne = x === 1;
    parts.push(`<line x1="${xx}" y1="${PAD.t}" x2="${xx}" y2="${H - PAD.b}"
      stroke="${isOne ? '#7A6650' : '#A8895C'}" stroke-width="${isOne ? 1.2 : 0.5}"
      stroke-dasharray="${isOne ? '0' : '1,3'}" />`);
    const lbl = x === 1 ? 'flat' : `${x > 1 ? '+' : ''}${((x - 1) * 100).toFixed(0)}%`;
    parts.push(`<text x="${xx}" y="${H - PAD.b + 14}" text-anchor="middle"
      font-family="JetBrains Mono, monospace" font-size="9" fill="#7A6650" font-weight="600">${lbl}</text>`);
  });

  parts.push(`<text x="${PAD.l + innerW / 2}" y="${H - 4}" text-anchor="middle"
    font-family="Instrument Serif, serif" font-size="11" font-style="italic" fill="#44362A">${calcState.asset} change from your cost</text>`);

  const winner = getWinnerKey();
  const samples = 220;
  STRATEGIES.forEach(s => {
    // Only draw strategies the user has made visible
    if (!calcState.visible.has(s.key)) return;
    const isWinner = s.key === winner;
    let path = '';
    let started = false;
    for (let i = 0; i <= samples; i++) {
      const k = kMin + (kMax - kMin) * i / samples;
      const mult = s.fn(k);
      const ret = (mult - 1) * 100;
      if (ret < yMin) {
        if (s.canLiquidate && mult <= 0) {
          if (started) {
            const xx = xScale(k);
            parts.push(`<circle cx="${xx}" cy="${yScale(yMin)}" r="5" fill="#B53A2A" stroke="#FAF2D8" stroke-width="2" />`);
            parts.push(`<text x="${xx}" y="${yScale(yMin) - 10}" text-anchor="middle"
              font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="#B53A2A" letter-spacing="0.05em">LIQUIDATED</text>`);
          }
          started = false;
          continue;
        }
        const cx = xScale(k);
        const cy = yScale(yMin);
        path += started ? ` L ${cx},${cy}` : ` M ${cx},${cy}`;
        started = true;
        continue;
      }
      if (ret > yMax) continue;
      const cx = xScale(k);
      const cy = yScale(ret);
      path += started ? ` L ${cx},${cy}` : ` M ${cx},${cy}`;
      started = true;
    }
    // Winner gets thicker stroke, full opacity. Baselines slightly thicker for visibility.
    const strokeWidth = isWinner ? 3 : (s.dashed ? 1.8 : 2.2);
    const opacity = isWinner ? 1 : (s.dashed ? 0.7 : 0.9);
    const dashArray = s.dashed ? 'stroke-dasharray="5,4"' : '';
    parts.push(`<path d="${path}" stroke="${s.color}" stroke-width="${strokeWidth}"
      fill="none" stroke-linecap="round" stroke-linejoin="round"
      ${dashArray} opacity="${opacity}" />`);
  });

  const k = getK();
  if (k >= kMin && k <= kMax) {
    const xx = xScale(k);
    parts.push(`<line x1="${xx}" y1="${PAD.t}" x2="${xx}" y2="${H - PAD.b}"
      stroke="#1E1611" stroke-width="1.4" />`);
    parts.push(`<text x="${xx}" y="${PAD.t - 6}" text-anchor="middle"
      font-family="Instrument Serif, serif" font-style="italic" font-size="11" font-weight="500" fill="#1E1611">target</text>`);
    STRATEGIES.forEach(s => {
      if (!calcState.visible.has(s.key)) return;
      const mult = s.fn(k);
      const ret = (mult - 1) * 100;
      if (ret < yMin || ret > yMax) return;
      if (s.canLiquidate && mult <= 0) return;
      const isWinner = s.key === winner;
      const r = isWinner ? 4.5 : 3.5;
      parts.push(`<circle cx="${xx}" cy="${yScale(ret)}" r="${r}" fill="${s.color}" stroke="#FAF2D8" stroke-width="1.6" />`);
    });
  }

  svg.innerHTML = parts.join('');
}

// Returns the key of the best-performing non-baseline strategy at current k
function getWinnerKey() {
  const k = getK();
  const stratsOnly = STRATEGIES.filter(s => !BASELINE_KEYS.has(s.key));
  let best = stratsOnly[0];
  let bestRet = (best.fn(k) - 1) * 100;
  stratsOnly.forEach(s => {
    const ret = (s.fn(k) - 1) * 100;
    if (ret > bestRet) { best = s; bestRet = ret; }
  });
  return best.key;
}

// Update what's auto-shown based on current winner
function syncAutoWinner() {
  const newWinner = getWinnerKey();
  // Remove old auto-winner if user hasn't manually toggled it
  if (calcState.autoWinner && calcState.autoWinner !== newWinner
      && !calcState.manualToggled.has(calcState.autoWinner)) {
    calcState.visible.delete(calcState.autoWinner);
  }
  // Add new winner (respecting manual toggles)
  if (!calcState.manualToggled.has(newWinner)) {
    calcState.visible.add(newWinner);
  }
  calcState.autoWinner = newWinner;
}

function renderResults() {
  const k = getK();
  const results = computeResults(k);
  const winnerKey = getWinnerKey();
  const container = document.getElementById('result-grid');
  if (!container) return;

  const baselines = results.filter(r => BASELINE_KEYS.has(r.key));
  const strats = results.filter(r => !BASELINE_KEYS.has(r.key));

  function renderCard(r) {
    const isWinner = r.key === winnerKey;
    const isShown = calcState.visible.has(r.key);
    const isBaseline = BASELINE_KEYS.has(r.key);
    const cls = ['result-card'];
    if (isShown) cls.push('shown');
    if (isWinner) cls.push('winner');
    if (r.liquidated) cls.push('liquidated');
    if (isBaseline) cls.push('baseline');
    return `
      <button type="button" class="${cls.join(' ')}" data-key="${r.key}" style="--strategy-color:${r.color}">
        <div class="name">${r.short}</div>
        ${r.liquidated
          ? `<div class="ret liq">⚠ liquidated</div>`
          : `<div class="ret ${r.ret >= 0 ? 'pos' : 'neg'}">${fmtPct(r.ret)}</div>
             <div class="val">${fmtUsd(r.value)}</div>`}
      </button>`;
  }

  container.innerHTML =
    `<div class="result-section-label">traditional</div>` +
    baselines.map(renderCard).join('') +
    `<div class="result-section-label">strats strategies</div>` +
    strats.map(renderCard).join('');

  // Wire up click handlers — toggle visibility for non-baseline strategies
  container.querySelectorAll('.result-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (BASELINE_KEYS.has(key)) return; // baselines always on
      calcState.manualToggled.add(key);
      if (calcState.visible.has(key)) calcState.visible.delete(key);
      else calcState.visible.add(key);
      renderCalculator();
    });
  });
}

function renderCalculator() {
  syncAutoWinner();
  renderReadout();
  renderChart();
  renderResults();
}

function setupCalculator() {
  const costEl = document.getElementById('cost');
  const targetEl = document.getElementById('target');
  const sliderEl = document.getElementById('target-slider');
  const assetEl = document.getElementById('asset');
  if (!costEl) return;

  const chips = document.querySelectorAll('#act-1 .chip');

  function syncSlider() {
    const k = getK();
    sliderEl.value = Math.min(3, Math.max(0.1, k));
  }
  function updateChipState() {
    const pct = (getK() - 1) * 100;
    chips.forEach(chip => {
      const preset = parseFloat(chip.dataset.scenario);
      chip.classList.toggle('active', Math.abs(pct - preset) < 0.5);
    });
  }
  function update() {
    calcState.cost = parseFloat(costEl.value) || 1;
    calcState.target = parseFloat(targetEl.value) || 1;
    calcState.asset = assetEl.value;
    syncSlider();
    renderCalculator();
    updateChipState();
  }

  function animateTo(newTarget, ms = 650) {
    const startTarget = calcState.target;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      calcState.target = startTarget + (newTarget - startTarget) * eased;
      targetEl.value = calcState.target.toFixed(0);
      syncSlider();
      renderCalculator();
      if (t < 1) requestAnimationFrame(step);
      else updateChipState();
    }
    requestAnimationFrame(step);
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const pct = parseFloat(chip.dataset.scenario);
      animateTo(calcState.cost * (1 + pct / 100), 650);
    });
  });
  costEl.addEventListener('input', update);
  targetEl.addEventListener('input', update);
  assetEl.addEventListener('change', update);
  sliderEl.addEventListener('input', () => {
    const k = parseFloat(sliderEl.value);
    calcState.target = calcState.cost * k;
    targetEl.value = calcState.target.toFixed(0);
    renderCalculator();
    updateChipState();
  });

  syncSlider();
  renderCalculator();
  updateChipState();
}

// ====================================================================
// TOOL II — SCALE SIMULATOR (Act 3)
// ====================================================================
// TVL slider uses logarithmic scale from current $5M up to $10B
const TVL_MIN = 5_000_000;
const TVL_MAX = 10_000_000_000;
const REV_TVL_RATIO = 0.005; // 0.5% monthly — average during Peapods' LVF TVL run-up
const BUYBACK_PCT = 0.60;
const PE_MULTIPLE = 30;
const STRATS_LAUNCH_FDV = 50_000_000;

// Log scale helpers
function sliderToTvl(v) {
  // v in [0, 1] → TVL on log scale
  const logMin = Math.log10(TVL_MIN);
  const logMax = Math.log10(TVL_MAX);
  return Math.pow(10, logMin + (logMax - logMin) * v);
}
function tvlToSlider(tvl) {
  const logMin = Math.log10(TVL_MIN);
  const logMax = Math.log10(TVL_MAX);
  const clamped = Math.max(TVL_MIN, Math.min(TVL_MAX, tvl));
  return (Math.log10(clamped) - logMin) / (logMax - logMin);
}

function computeScale(tvl) {
  const monthlyRev = tvl * REV_TVL_RATIO;
  const annualRev = monthlyRev * 12;
  const annualToHolders = annualRev * BUYBACK_PCT;
  const impliedFdv = annualToHolders * PE_MULTIPLE;
  return { tvl, monthlyRev, annualRev, annualToHolders, impliedFdv };
}

function renderScale(tvl) {
  const m = computeScale(tvl);
  const tvlEl = document.getElementById('scale-tvl-val');
  const mRevEl = document.getElementById('scale-monthly');
  const hEl = document.getElementById('scale-holders');
  if (tvlEl) tvlEl.textContent = fmtUsdCompact(m.tvl);
  if (mRevEl) mRevEl.textContent = fmtUsdCompact(m.monthlyRev);
  if (hEl) hEl.textContent = fmtUsdCompact(m.annualToHolders);
}

function setupScale() {
  const slider = document.getElementById('scale-tvl');
  if (!slider) return;
  const presets = document.querySelectorAll('.scale-presets .chip');

  function update() {
    const v = parseFloat(slider.value);
    const tvl = sliderToTvl(v);
    renderScale(tvl);
    updatePresetState(tvl);
  }
  function updatePresetState(tvl) {
    presets.forEach(p => {
      const preset = parseFloat(p.dataset.tvl);
      const rel = Math.abs(Math.log10(tvl) - Math.log10(preset));
      p.classList.toggle('active', rel < 0.01);
    });
  }

  function animateTo(targetTvl, ms = 750) {
    const startTvl = sliderToTvl(parseFloat(slider.value));
    const startTime = performance.now();
    const startLog = Math.log10(startTvl);
    const endLog = Math.log10(targetTvl);
    function step(now) {
      const t = Math.min(1, (now - startTime) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const curLog = startLog + (endLog - startLog) * eased;
      const curTvl = Math.pow(10, curLog);
      slider.value = tvlToSlider(curTvl);
      renderScale(curTvl);
      if (t < 1) requestAnimationFrame(step);
      else updatePresetState(curTvl);
    }
    requestAnimationFrame(step);
  }

  presets.forEach(p => {
    p.addEventListener('click', () => {
      animateTo(parseFloat(p.dataset.tvl), 750);
    });
  });

  slider.addEventListener('input', update);
  // Initial: $1B (roughly the base 12mo case)
  slider.value = tvlToSlider(1_000_000_000);
  update();
}

// ====================================================================
// TOOL III — 3×3 GRID (Act 4)
// ====================================================================
// TVL from capture rate analysis, FDV from DCF formula with DefiLlama-anchored P/E.
// mult is relative to STRATS_LAUNCH_FDV ($50M) such that fdv = 50M * mult.
// Any null field is treated as "no data yet" by the render functions.
const GRID_DATA = {
  bearish: {
    6:  { tvl: 70_000_000,     revPct: '0.50%', pe: '25×', fdv: 63_000_000 },
    12: { tvl: 130_000_000,    revPct: '0.50%', pe: '25×', fdv: 117_000_000 },
    24: { tvl: 152_000_000,    revPct: '0.50%', pe: '25×', fdv: 137_000_000 },
  },
  conservative: {
    6:  { tvl: 150_000_000,    revPct: '0.50%', pe: '25×', fdv: 135_000_000 },
    12: { tvl: 310_000_000,    revPct: '0.50%', pe: '25×', fdv: 279_000_000 },
    24: { tvl: 557_000_000,    revPct: '0.50%', pe: '25×', fdv: 501_000_000 },
  },
  base: {
    6:  { tvl: 240_000_000,    revPct: '0.50%', pe: '25×', fdv: 216_000_000 },
    12: { tvl: 595_000_000,    revPct: '0.50%', pe: '25×', fdv: 536_000_000 },
    24: { tvl: 1_280_000_000,  revPct: '0.50%', pe: '25×', fdv: 1_152_000_000 },
  },
  bullish: {
    6:  { tvl: 530_000_000,    revPct: '0.50%', pe: '25×', fdv: 477_000_000 },
    12: { tvl: 1_450_000_000,  revPct: '0.50%', pe: '25×', fdv: 1_305_000_000 },
    24: { tvl: 3_390_000_000,  revPct: '0.50%', pe: '25×', fdv: 3_051_000_000 },
  },
};

const SCENARIO_WORDS = {
  bearish: '$152M TVL · 0.50% rev/TVL · 25× P/E · $137M FDV · 29× from PEAS',
  conservative: '$557M TVL · 0.50% rev/TVL · 25× P/E · $501M FDV · 104× from PEAS',
  base: '$1.28B TVL · 0.50% rev/TVL · 25× P/E · $1.15B FDV · 240× from PEAS',
  bullish: '$3.39B TVL · 0.50% rev/TVL · 25× P/E · $3.05B FDV · 636× from PEAS',
};

function fmtMult(mult) {
  if (mult >= 1000) return `${(mult / 1).toFixed(0)}×`;
  if (mult >= 100) return `${mult.toFixed(0)}×`;
  if (mult >= 10) return `${mult.toFixed(1)}×`;
  return `${mult.toFixed(2)}×`;
}

function renderGridDetail(row, col) {
  const detail = document.getElementById('grid-detail');
  if (!detail) return;
  const data = GRID_DATA[row] && GRID_DATA[row][col];
  const rowLabel = row.charAt(0).toUpperCase() + row.slice(1);
  const scenarioWord = SCENARIO_WORDS[row] || '';

  if (!data || data.fdv == null) {
    detail.innerHTML = `<div class="detail-view detail-view-placeholder"><p>No data for this cell.</p></div>`;
    return;
  }

  const fdv = data.fdv;

  detail.innerHTML = `
    <div class="detail-view">
      <div class="detail-head">
        <span class="detail-scenario scenario-${row}">${rowLabel} · ${col} months</span>
        <span class="detail-mult">${fmtUsdCompact(fdv)}</span>
        <span class="detail-from">implied FDV from TVL × Act 3 DCF formula</span>
      </div>
      <div class="detail-body">
        <div class="detail-stat">
          <span class="detail-stat-lbl">TVL assumed</span>
          <span class="detail-stat-val">${fmtUsdCompact(data.tvl)}</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-lbl">rev / TVL</span>
          <span class="detail-stat-val">${data.revPct}</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-lbl">P/E multiple</span>
          <span class="detail-stat-val">${data.pe}</span>
        </div>
      </div>
      <div class="detail-example">
        <em>${scenarioWord}</em>
      </div>
      <p class="detail-caveat">
        Scenario, not prediction. TVL from capture rate analysis; rev/TVL from Peapods data; P/E from DefiLlama cashflow-token comparables. Assumes 60% of revenue routes to $STRATS buybacks (the design), not a future fee-switch vote.
      </p>
    </div>`;
}

function renderGridCells() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    const row = cell.dataset.row;
    const col = cell.dataset.col;
    if (!row || !col) return;
    const data = GRID_DATA[row] && GRID_DATA[row][col];
    if (!data || data.fdv == null) return;
    const mEl = cell.querySelector('.cell-mult');
    if (mEl) mEl.textContent = fmtUsdCompact(data.fdv);
  });
}

function setupGrid() {
  const cells = document.querySelectorAll('.cell');
  if (!cells.length) return;
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      cells.forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      const row = cell.dataset.row;
      const col = cell.dataset.col;
      renderGridDetail(row, col);
    });
  });
  renderGridCells();
  // Default: show the base 12mo cell
  const defaultCell = document.querySelector('.cell[data-row="base"][data-col="12"]');
  if (defaultCell) {
    defaultCell.classList.add('selected');
    renderGridDetail('base', '12');
  }
}

// ====================================================================
// PROGRESS RAIL (scroll indicator)
// ====================================================================
function setupRail() {
  const rail = document.getElementById('rail-fill');
  if (!rail) return;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    rail.style.width = `${(pct * 100).toFixed(2)}%`;
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ====================================================================
// THE NARRATOR — jump on section change, tip hat on click
// ====================================================================
function setupNarrator() {
  const narrator = document.getElementById('narrator');
  if (!narrator) return;

  // Don't attach on very small screens (hidden via CSS anyway)
  if (window.matchMedia('(max-width: 420px)').matches) return;

  let jumpTimer = null;
  let idleTimer = null;

  function setIdle(on) {
    narrator.classList.toggle('idle', !!on);
  }

  function jumpTo(direction) {
    narrator.classList.remove('idle', 'jumping', 'hopping-up', 'tipping');
    void narrator.offsetWidth; // reflow to restart animation
    narrator.classList.add(direction > 0 ? 'jumping' : 'hopping-up');
    clearTimeout(jumpTimer);
    const dur = direction > 0 ? 900 : 500;
    jumpTimer = setTimeout(() => {
      narrator.classList.remove('jumping', 'hopping-up');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIdle(true), 500);
    }, dur);
  }

  // Click → tip hat
  narrator.addEventListener('click', () => {
    narrator.classList.remove('idle', 'jumping', 'hopping-up', 'tipping');
    void narrator.offsetWidth;
    narrator.classList.add('tipping');
    clearTimeout(jumpTimer);
    setTimeout(() => {
      narrator.classList.remove('tipping');
      setIdle(true);
    }, 1100);
  });

  setIdle(true);

  // Detect which section is in view — jump on transitions
  const sections = Array.from(document.querySelectorAll('section[id], .intro'));
  if (!sections.length) return;
  let activeIdx = 0;

  function checkActive() {
    const mid = window.scrollY + window.innerHeight / 2;
    let newIdx = 0;
    let smallestDist = Infinity;
    sections.forEach((s, i) => {
      const sCenter = s.offsetTop + s.offsetHeight / 2;
      const d = Math.abs(sCenter - mid);
      if (d < smallestDist) { smallestDist = d; newIdx = i; }
    });
    if (newIdx !== activeIdx) {
      const dir = newIdx - activeIdx;
      activeIdx = newIdx;
      jumpTo(dir);
    }
  }

  let scrollRaf = null;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      checkActive();
      scrollRaf = null;
    });
  }, { passive: true });

  checkActive();
}

// ====================================================================
// TAM CAPTURE SIMULATOR — Act 2 (protocol page)
// ====================================================================
// TAM sizing — DefiLlama verified, April 16 2026 (api.llama.fi)
const TAM_SEGMENTS = [
  { key: 'longtail',   name: 'Long-tail token holders',   tam: 30_000_000_000, sizeLabel: '$30B+ in tokens earning nothing today' },
  { key: 'perps',      name: 'Perp DEX refugees',         tam: 2_500_000_000,  sizeLabel: '$2.5B in decentralised derivatives' },
  { key: 'neutral',    name: 'Stable yield seekers',      tam: 20_000_000_000, sizeLabel: '~$20B across stablecoin yield products' },
  { key: 'passive',    name: 'Passive DeFi savers',       tam: 52_500_000_000, sizeLabel: '$52.5B in lending protocols' },
  { key: 'token',      name: 'ETH + LST yield stackers',  tam: 66_600_000_000, sizeLabel: '$66.6B in liquid staking + restaking' },
  { key: 'rwa',        name: 'Onchain RWAs + traditional', tam: 27_100_000_000, sizeLabel: '$27.1B and growing fast' },
];

const TAM_PRESETS = {
  bearish: 0.08,
  conservative: 0.28,
  base: 0.64,
  bullish: 1.7,
  clear: 0,
};

// Comparables removed — kept in deep dive only

function setupTamSimulator() {
  const wrapper = document.getElementById('tam-segments');
  if (!wrapper) return;
  const totalEl = document.getElementById('tam-total-val');
  const presetButtons = document.querySelectorAll('.tam-presets .chip');
  // Build segment UI
  wrapper.innerHTML = TAM_SEGMENTS.map(seg => `
    <div class="tam-segment" data-key="${seg.key}">
      <div class="tam-seg-info">
        <span class="tam-seg-name">${seg.name}</span>
        <span class="tam-seg-size">${seg.sizeLabel}</span>
      </div>
      <div class="tam-seg-slider">
        <input type="range" min="0" max="10" step="0.1" value="0" data-key="${seg.key}" />
        <div class="tam-seg-slider-ticks"><span>0%</span><span>5%</span><span>10%</span></div>
      </div>
      <div class="tam-seg-output">
        <span class="tam-seg-pct" data-key="${seg.key}-pct">0.0%</span>
        <span class="tam-seg-capture" data-key="${seg.key}-cap">$0</span>
      </div>
    </div>
  `).join('');

  function updateAll() {
    let total = 0;
    TAM_SEGMENTS.forEach(seg => {
      const slider = wrapper.querySelector(`input[data-key="${seg.key}"]`);
      const pctEl = wrapper.querySelector(`[data-key="${seg.key}-pct"]`);
      const capEl = wrapper.querySelector(`[data-key="${seg.key}-cap"]`);
      const segWrap = wrapper.querySelector(`.tam-segment[data-key="${seg.key}"]`);
      const pct = parseFloat(slider.value);
      const capture = seg.tam * (pct / 100);
      total += capture;
      pctEl.textContent = `${pct.toFixed(1)}%`;
      capEl.textContent = fmtUsdCompact(capture);
      segWrap.classList.toggle('touched', pct > 0);
    });
    if (totalEl) {
      totalEl.textContent = fmtUsdCompact(total);
      totalEl.classList.toggle('zero', total === 0);
    }
  }

  function animateTo(targetPcts, ms = 700) {
    const sliders = Array.from(wrapper.querySelectorAll('input[type="range"]'));
    const startPcts = sliders.map(s => parseFloat(s.value));
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      sliders.forEach((s, i) => {
        const end = targetPcts[i];
        s.value = (startPcts[i] + (end - startPcts[i]) * eased).toFixed(2);
      });
      updateAll();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Wire slider events
  wrapper.querySelectorAll('input[type="range"]').forEach(s => {
    s.addEventListener('input', updateAll);
  });

  // Wire preset buttons
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const val = TAM_PRESETS[preset] ?? 0;
      const targets = TAM_SEGMENTS.map(() => val);
      animateTo(targets);
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  updateAll();
}

// ====================================================================
// DRAWER — slides in from right with full argument per act
// ====================================================================
function setupDrawer() {
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close');
  const tagEl = document.getElementById('drawer-tag');
  const body = document.getElementById('drawer-body');
  if (!drawer || !backdrop || !body) return;

  const TAG_LABELS = {
    'drawer-act-1': 'Act 1 · the product',
    'drawer-act-2': 'Act 2 · the protocol',
    'drawer-act-3': 'Act 3 · the token',
    'drawer-act-4': 'Act 4 · the thesis',
  };

  function open(templateId) {
    const tpl = document.getElementById(templateId);
    if (!tpl) return;
    body.innerHTML = '';
    body.appendChild(tpl.content.cloneNode(true));
    body.scrollTop = 0;
    if (tagEl) tagEl.textContent = TAG_LABELS[templateId] || 'enclosure';

    backdrop.hidden = false;
    // Force reflow, then apply visible state
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    });
    document.body.classList.add('drawer-open');
    // Focus the close button for keyboard users
    setTimeout(() => closeBtn?.focus(), 400);
  }

  function close() {
    backdrop.classList.remove('visible');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    // Hide backdrop after transition completes
    setTimeout(() => { backdrop.hidden = true; }, 360);
  }

  // Open triggers
  document.querySelectorAll('.open-drawer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open(btn.dataset.drawer);
    });
  });

  // Close triggers
  closeBtn?.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) close();
  });
}

// ====================================================================
// TOOL V — INVESTMENT CALCULATORS (Hero + Act 4 Part 3)
// ====================================================================
// TVL + multiplier data per scenario per timeframe
const INVEST_DATA = {
  bearish:      { 6: { tvl: 70e6,   mult: 13 },  12: { tvl: 130e6,  mult: 24 },  24: { tvl: 152e6,   mult: 29 } },
  conservative: { 6: { tvl: 150e6,  mult: 28 },  12: { tvl: 310e6,  mult: 58 },  24: { tvl: 557e6,   mult: 104 } },
  base:         { 6: { tvl: 240e6,  mult: 45 },  12: { tvl: 595e6,  mult: 112 }, 24: { tvl: 1.28e9,  mult: 240 } },
  bullish:      { 6: { tvl: 530e6,  mult: 99 },  12: { tvl: 1.45e9, mult: 272 }, 24: { tvl: 3.39e9,  mult: 636 } },
};

function setupInvestCalc() {
  const input = document.getElementById('invest-amount');
  if (!input) return;
  const rows = document.querySelectorAll('#invest-results [data-scenario]');
  const tfChips = document.querySelectorAll('#invest-timeframe [data-tf]');
  let currentTf = '24';

  function update() {
    const amount = Math.max(1, parseFloat(input.value) || 1000);
    rows.forEach(row => {
      const scenario = row.dataset.scenario;
      const d = INVEST_DATA[scenario] && INVEST_DATA[scenario][currentTf];
      if (!d) return;
      const result = amount * d.mult;
      const tvlEl = row.querySelector('.invest-tvl');
      const multEl = row.querySelector('.invest-mult');
      const retEl = row.querySelector('.invest-return');
      if (tvlEl) tvlEl.textContent = fmtUsdCompact(d.tvl);
      if (multEl) multEl.textContent = `${d.mult}×`;
      if (retEl) {
        if (result >= 1_000_000) retEl.textContent = `$${(result / 1_000_000).toFixed(1)}M`;
        else if (result >= 1_000) retEl.textContent = `$${Math.round(result).toLocaleString()}`;
        else retEl.textContent = `$${result.toFixed(0)}`;
      }
    });
  }

  tfChips.forEach(chip => {
    chip.addEventListener('click', () => {
      tfChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentTf = chip.dataset.tf;
      update();
    });
  });

  input.addEventListener('input', update);
  update();
}

// ====================================================================
// INIT
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupCalculator();
  setupScale();
  setupGrid();
  setupTamSimulator();
  setupInvestCalc();
  setupRail();
  setupDrawer();
});
