// Loot Survivor bot dashboard: static page that reads the JSON files the bot writes to data/.
'use strict';

const $ = (s) => document.querySelector(s);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toLocaleString('uk-UA'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ago = (iso) => {
  if (!iso) return '–';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return `${Math.round(s)} с тому`;
  if (s < 5400) return `${Math.round(s / 60)} хв тому`;
  if (s < 129600) return `${Math.round(s / 3600)} год тому`;
  return `${Math.round(s / 86400)} дн тому`;
};
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

async function load(name, fallback) {
  // control.js reads the bot's data straight from the bot-data branch (no wait for the Pages rebuild)
  if (window.botData?.load) {
    const v = await window.botData.load(name);
    if (v !== undefined) return v;
  }
  try {
    const r = await fetch(`data/${name}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

// ------------------------------------------------------------------ tooltip
const tip = $('#tip');
function showTip(ev, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  const pad = 14;
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let x = ev.clientX + pad;
  let y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}
const hideTip = () => (tip.hidden = true);

// ------------------------------------------------------------------ charts (inline SVG, no dependencies)
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function empty(host, text) {
  host.innerHTML = `<div class="empty">${esc(text)}</div>`;
}
function legend(host, series) {
  if (series.length < 2) return;
  const d = document.createElement('div');
  d.className = 'legend';
  d.innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
  host.appendChild(d);
}

/** Line chart: series [{name, color, points:[{x:Date|number, y}]}], one shared y axis. */
function lineChart(host, series, opts = {}) {
  host.innerHTML = '';
  series = series.filter((s) => s.points.length);
  if (!series.length) return empty(host, opts.empty ?? 'Ще немає даних');
  legend(host, series);
  const W = Math.max(320, host.clientWidth);
  const H = opts.height ?? 220;
  const m = { l: 48, r: 56, t: 10, b: 24 };
  const xs = series.flatMap((s) => s.points.map((p) => +p.x));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs) === x0 ? x0 + 1 : Math.max(...xs);
  const yMax = niceMax(Math.max(...series.flatMap((s) => s.points.map((p) => p.y))) * 1.05);
  const X = (v) => m.l + ((+v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - (v / yMax) * (H - m.t - m.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': opts.label ?? 'chart' }, host);
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i;
    el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'gridline' }, svg);
    el('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(Math.round(v));
  }
  const isTime = opts.time !== false;
  const ticks = isTime ? 5 : Math.max(1, Math.min(5, Math.round(x1 - x0)));
  for (let i = 0; i <= ticks; i++) {
    const v = x0 + ((x1 - x0) / ticks) * i;
    const label = isTime ? new Date(v).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : Math.round(v);
    el('text', { x: X(v), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === ticks ? 'end' : 'middle' }, svg).textContent = label;
  }
  for (const s of series) {
    const pts = s.points.slice().sort((a, b) => +a.x - +b.x);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash ?? '' }, svg);
    const last = pts[pts.length - 1];
    if (pts.length === 1) el('circle', { cx: X(last.x), cy: Y(last.y), r: 4, fill: s.color, stroke: css('--surface-1'), 'stroke-width': 2 }, svg);
    if (series.length <= 4) {
      const t = el('text', { x: X(last.x) + 6, y: Y(last.y) + 4, class: 'val' }, svg);
      t.textContent = fmt(last.y);
    }
  }
  // hover crosshair
  const cross = el('line', { y1: m.t, y2: H - m.b, class: 'cross', visibility: 'hidden' }, svg);
  const dots = series.map((s) => el('circle', { r: 4, fill: s.color, stroke: css('--surface-1'), 'stroke-width': 2, visibility: 'hidden' }, svg));
  const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
  hit.addEventListener('mousemove', (ev) => {
    const box = svg.getBoundingClientRect();
    const px = ((ev.clientX - box.left) / box.width) * W;
    const xv = x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    const rows = [];
    series.forEach((s, i) => {
      // value in effect at xv (step semantics for "best so far" style series)
      let p = null;
      for (const q of s.points) if (+q.x <= xv && (!p || +q.x > +p.x)) p = q;
      if (!p) p = s.points.reduce((a, b) => (Math.abs(+b.x - xv) < Math.abs(+a.x - xv) ? b : a));
      dots[i].setAttribute('cx', X(p.x));
      dots[i].setAttribute('cy', Y(p.y));
      dots[i].setAttribute('visibility', 'visible');
      rows.push(`<div><i style="background:${s.color}"></i>${esc(s.name)}: <b>${fmt(p.y)}</b></div>`);
    });
    const title = isTime ? new Date(xv).toLocaleString('uk-UA') : `${opts.xName ?? 'x'} ${Math.round(xv)}`;
    showTip(ev, `<div class="t">${title}</div>${rows.join('')}`);
  });
  hit.addEventListener('mouseleave', () => {
    cross.setAttribute('visibility', 'hidden');
    dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
    hideTip();
  });
}

/** Vertical bars for a single series: data [{label, value}]. */
function columnChart(host, data, opts = {}) {
  host.innerHTML = '';
  if (!data.length) return empty(host, opts.empty ?? 'Ще немає даних');
  const W = Math.max(300, host.clientWidth);
  const H = opts.height ?? 150;
  const m = { l: 32, r: 8, t: 14, b: 22 };
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const bw = (W - m.l - m.r) / data.length;
  const Y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': opts.label ?? 'chart' }, host);
  for (let i = 0; i <= 2; i++) {
    const v = (max / 2) * i;
    el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'gridline' }, svg);
    el('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(v);
  }
  const step = Math.ceil(data.length / Math.floor((W - m.l) / 28));
  data.forEach((d, i) => {
    const x = m.l + i * bw + 1;
    const w = Math.max(2, bw - 2);
    const y = Y(d.value);
    const h = H - m.b - y;
    if (h > 0) el('path', { d: roundedTop(x, y, w, h, Math.min(4, w / 2)), fill: opts.color ?? css('--series-1') }, svg);
    if (i % step === 0) el('text', { x: x + w / 2, y: H - 6, 'text-anchor': 'middle' }, svg).textContent = d.label;
    const hit = el('rect', { x: m.l + i * bw, y: m.t, width: bw, height: H - m.t - m.b, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (ev) => showTip(ev, `<div class="t">${esc(opts.labelName ?? '')} ${esc(d.label)}</div><b>${fmt(d.value)}</b> ${esc(opts.unit ?? '')}`));
    hit.addEventListener('mouseleave', hideTip);
  });
}

function roundedTop(x, y, w, h, r) {
  r = Math.min(r, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function roundedRight(x, y, w, h, r) {
  r = Math.min(r, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

/** Horizontal bars: rows [{label, values:[...]}], series [{name,color}] (1-3 series, grouped). */
function barChart(host, rows, series, opts = {}) {
  host.innerHTML = '';
  if (!rows.length) return empty(host, opts.empty ?? 'Ще немає даних');
  legend(host, series);
  const W = Math.max(300, host.clientWidth);
  const labelW = Math.min(170, W * 0.38);
  const bh = series.length > 1 ? 9 : 14;
  const rowH = bh * series.length + (series.length - 1) * 2 + 12;
  const H = rows.length * rowH + 4;
  const max = opts.max ?? (Math.max(...rows.flatMap((r) => r.values)) * 1.15 || 1);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': opts.label ?? 'chart' }, host);
  rows.forEach((r, i) => {
    const y0 = i * rowH + 6;
    const t = el('text', { x: labelW - 8, y: y0 + (rowH - 12) / 2 + 4, 'text-anchor': 'end', class: 'lbl' }, svg);
    t.textContent = r.label.length > 26 ? r.label.slice(0, 25) + '…' : r.label;
    r.values.forEach((v, j) => {
      const y = y0 + j * (bh + 2);
      const w = Math.max(1, (v / max) * (W - labelW - 50));
      el('path', { d: roundedRight(labelW, y, w, bh, 4), fill: series[j].color }, svg);
      if (series.length === 1 || opts.labelAll) el('text', { x: labelW + w + 6, y: y + bh - 2, class: 'val' }, svg).textContent = opts.format ? opts.format(v) : fmt(v);
    });
    const hit = el('rect', { x: 0, y: y0 - 4, width: W, height: rowH, fill: 'transparent' }, svg);
    hit.addEventListener('mousemove', (ev) =>
      showTip(ev, `<div class="t">${esc(r.label)}</div>${r.values.map((v, j) => `<div><i style="background:${series[j].color}"></i>${esc(series[j].name)}: <b>${opts.format ? opts.format(v) : fmt(v)}</b></div>`).join('')}`),
    );
    hit.addEventListener('mouseleave', hideTip);
  });
}

// ------------------------------------------------------------------ sections
const MODE_NAMES = { mainnet: 'Mainnet', practice: 'Practice', sim: 'Симуляція' };
let DATA = {};
let currentMode = null;

function renderState(status) {
  const box = $('#state');
  const fresh = status?.updated && Date.now() - new Date(status.updated).getTime() < 15 * 60_000;
  const running = status?.running && fresh;
  box.classList.toggle('running', !!running);
  $('#stateText').textContent = running
    ? `грає · ${MODE_NAMES[status.mode?.replace('-dry', '')] ?? status.mode}`
    : status?.updated
      ? `очікує · останній запуск ${ago(status.updated)}`
      : 'бот ще не запускався';
}

function kpi(label, value, hint) {
  return `<div class="kpi"><div class="label">${esc(label)}</div><div class="value">${value}</div><div class="hint">${hint ?? ''}</div></div>`;
}

function renderKpis() {
  const { summary, leaderboard } = DATA;
  const mn = summary?.modes?.mainnet ?? {};
  const pr = summary?.modes?.practice ?? {};
  const sim = summary?.modes?.sim ?? {};
  const top1 = leaderboard?.target?.xp;
  const bot = leaderboard?.bot;
  const best = mn.best || 0;
  const policy = summary?.policy?.meta;
  $('#kpis').innerHTML = [
    kpi('Найкращий XP (mainnet)', fmt(best), mn.games ? `${fmt(mn.games)} ігор · рівень ${mn.bestLevel}` : 'ще немає ігор'),
    kpi('Місце в лідерборді', bot?.bestRank ? `#${bot.bestRank}` : '–', bot?.account ? short(bot.account) : 'акаунт не підключено'),
    kpi('Топ‑1 mainnet', fmt(top1), top1 ? `до цілі: ${fmt(Math.max(0, top1 - best))} XP` : ''),
    kpi('Practice', fmt(pr.best), pr.games ? `${fmt(pr.games)} ігор · сер. ${fmt(pr.mean)}` : 'ще немає ігор'),
    kpi('Політика (симуляції)', fmt(policy ? Math.round(policy.mean) : sim.mean), policy ? `сер. XP · p90 ${fmt(policy.p90)} · max ${fmt(policy.max)}` : 'середній XP'),
    kpi('Точність прогнозу', pr.predictionAccuracy != null ? `${(pr.predictionAccuracy * 100).toFixed(1)}%` : '–', 'рушій бота vs ланцюг (practice)'),
  ].join('');
}

function renderLive(status) {
  const c = status?.current;
  const host = $('#live');
  const stale = window.botActiveRunStart && (!status?.updated || new Date(status.updated).getTime() < window.botActiveRunStart);
  if (stale) {
    host.innerHTML = '<p class="muted">Запуск іде, бот ще не надіслав перших даних — вони оновлюються щохвилини.</p>';
  } else if (!c || !status.running) {
    host.innerHTML = `<p class="muted">Немає активної гри.${status?.message ? `<br>${esc(status.message)}${status.account ? ` <span class="small">· акаунт ${esc(short(status.account))}</span>` : ''} <span class="small">· ${ago(status.updated)}</span>` : ''}</p>`;
  } else {
    const hpPct = c.maxHp ? Math.round((c.hp / c.maxHp) * 100) : 0;
    const slots = ['Зброя', 'Груди', 'Голова', 'Пояс', 'Ноги', 'Руки', 'Шия', 'Кільце'];
    host.innerHTML = `
      <div class="row"><span class="big">Рівень ${c.level}</span><span>${fmt(c.xp)} XP</span><span>💰 ${fmt(c.gold)}</span><span class="muted small">гра #${esc(c.id.length > 12 ? short(c.id) : c.id)}</span></div>
      <div class="small">HP ${c.hp}/${c.maxHp}</div><div class="bar" role="meter" aria-valuenow="${c.hp}" aria-valuemax="${c.maxHp}"><span style="width:${hpPct}%"></span></div>
      ${c.beast ? `<div>У бою з: <span class="beast">${esc(c.beast)}</span></div>` : ''}
      <div class="stats">${Object.entries(c.stats).map(([k, v]) => `<span>${k.toUpperCase()} ${v}</span>`).join('')}</div>
      <div class="gear">${c.gear.map((g, i) => `<div><span>${slots[i]}:</span> ${esc(g)}</div>`).join('')}</div>
      <div class="reason">${esc(c.lastReason)}</div>`;
  }
  const recent = (status?.recent ?? []).slice().reverse();
  $('#recentMode').textContent = status?.mode ? `· ${status.mode}` : '';
  $('#recent').innerHTML = recent.length
    ? recent
        .map(
          (r) => `<li><div><span class="act">${esc(r.actions)}</span> <span class="muted small">L${r.level} · ${r.hp}/${r.maxHp} HP · ${fmt(r.gold)}💰</span>${r.ok === false ? ` <span class="bad">✖ ${esc(r.error ?? 'reverted')}</span>` : ''}</div><div class="why">${esc(r.reason)}</div></li>`,
        )
        .join('')
    : '<li class="muted">Поки порожньо</li>';
}

function renderProgress() {
  const hist = DATA.lbHistory ?? [];
  const mn = DATA.summary?.modes?.mainnet?.bestOverTime ?? [];
  const now = Date.now();
  const botPts = mn.map((p) => ({ x: new Date(p.t), y: p.xp }));
  if (botPts.length) botPts.push({ x: new Date(now), y: botPts[botPts.length - 1].y });
  lineChart(
    $('#progressChart'),
    [
      { name: 'Топ‑1 лідерборду', color: css('--series-2'), points: hist.map((h) => ({ x: new Date(h.t), y: h.top1 })) },
      { name: 'Топ‑10 лідерборду', color: css('--series-3'), points: hist.filter((h) => h.top10).map((h) => ({ x: new Date(h.t), y: h.top10 })) },
      { name: 'Бот (найкращий)', color: css('--series-1'), points: botPts },
    ],
    { label: 'Прогрес до топ-1', empty: 'Дані з’являться після першого запуску лідерборду / бота в mainnet' },
  );
}

function renderTraining() {
  const tr = (DATA.training ?? []).filter((r) => r.source === 'cmaes');
  lineChart(
    $('#trainingChart'),
    [
      { name: 'Середній XP', color: css('--series-1'), points: tr.map((r, i) => ({ x: i + 1, y: Math.round(r.mean) })) },
      { name: 'p90 XP', color: css('--series-2'), points: tr.map((r, i) => ({ x: i + 1, y: r.p90 })) },
    ],
    { time: false, xName: 'валідація', label: 'Навчання політики', empty: 'Запустіть npm run tune' },
  );
}

/** Probability of reaching each level (multilevel splitting in the tail tuner). */
function renderReach() {
  const r = DATA.reach;
  const host = $('#reachTable');
  if (!r?.levels?.length) {
    host.innerHTML = '<p class="muted small">З’явиться після запуску <code>npm run tune -- --objective tail</code></p>';
    return;
  }
  const oneIn = (p) => (p >= 0.5 ? '—' : `1 з ${fmt(Math.round(1 / p))}`);
  host.innerHTML =
    `<table><thead><tr><th>Рівень</th><th>Ймовірність</th><th>Тобто</th></tr></thead><tbody>` +
    r.levels.map((l) => `<tr><td>${l.level} (${fmt(l.level * l.level)} XP)</td><td>${l.p < 0.01 ? l.p.toExponential(1) : (100 * l.p).toFixed(1) + '%'}</td><td>${oneIn(l.p)}</td></tr>`).join('') +
    `</tbody></table><p class="muted small">Правила: ${esc(r.rules)}; політика ${esc(r.policy ?? '')}; оновлено ${new Date(r.updated).toLocaleString('uk-UA')}</p>`;
}

function renderModes() {
  const modes = DATA.summary?.modes ?? {};
  if (!currentMode) currentMode = ['mainnet', 'practice', 'sim'].find((m) => modes[m]?.games) ?? 'practice';
  for (const b of document.querySelectorAll('#modeSeg button')) b.setAttribute('aria-selected', String(b.dataset.mode === currentMode));
  const s = modes[currentMode] ?? {};
  $('#modeStats').innerHTML = [
    ['Ігор', fmt(s.games)],
    ['Найкращий', fmt(s.best)],
    ['Медіана', fmt(s.median)],
    ['Останні 20', fmt(s.last20Mean)],
  ]
    .map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`)
    .join('');
  const lv = Object.entries(s.levels ?? {}).map(([l, n]) => [+l, n]);
  const maxL = lv.reduce((m, [l]) => Math.max(m, l), 0);
  const levels = [];
  for (let l = 1; l <= maxL; l++) levels.push({ label: String(l), value: (s.levels ?? {})[l] ?? 0 });
  columnChart($('#levelChart'), levels, { labelName: 'рівень', unit: 'ігор', label: 'Рівень на момент смерті' });
  barChart(
    $('#deathChart'),
    (s.deathCauses ?? []).slice(0, 8).map(([c, n]) => ({ label: c, values: [n] })),
    [{ name: 'Смертей', color: css('--series-2') }],
    { label: 'Причини смерті' },
  );
}

function renderLeaderboard() {
  const lb = DATA.leaderboard;
  $('#lbUpdated').textContent = lb?.updated ? `оновлено ${ago(lb.updated)}` : '';
  const me = lb?.bot?.account ? BigInt(lb.bot.account) : null;
  const rows = (lb?.entries ?? []).slice(0, 50);
  $('#lbTable tbody').innerHTML = rows.length
    ? rows
        .map((e) => {
          let mine = false;
          try {
            mine = me !== null && BigInt(e.owner) === me;
          } catch {}
          return `<tr class="${mine ? 'me' : ''}"><td>${e.rank}</td><td>${esc(e.player || short(e.owner))}${mine ? ' (бот)' : ''}</td><td class="num">${fmt(e.xp)}</td><td class="num">${e.level}</td><td>${e.gameOver ? '<span class="muted">завершена</span>' : '<span class="ok">жива</span>'}</td></tr>`;
        })
        .join('')
    : '<tr><td colspan="5" class="muted">Ще немає даних (workflow «leaderboard»)</td></tr>';
}

function renderInsights() {
  const ins = DATA.insights;
  $('#insUpdated').textContent = ins?.updated ? `${ins.players} гравців · ${ago(ins.updated)}` : '';
  const keys = [['cha', 'Харизма'], ['dex', 'Спритність'], ['str', 'Сила'], ['int', 'Інтелект'], ['wis', 'Мудрість']]; // VIT: решта очок у бота
  const late = ins?.aggregate?.late?.players >= ins?.aggregate?.early?.players ? 'late' : 'early';
  const top = ins?.aggregate?.[late]?.ratios;
  const bot = ins?.botTargets?.[late];
  if (!top) return empty($('#insightChart'), 'Запустіть workflow «learn», щоб проаналізувати білди лідерів');
  barChart(
    $('#insightChart'),
    keys.filter(([k]) => top[k] !== undefined).map(([k, n]) => ({ label: n, values: [top[k] ?? 0, bot?.[k] ?? 0] })),
    [
      { name: `Топ‑гравці (${late === 'late' ? 'пізня гра' : 'рання гра'})`, color: css('--series-2') },
      { name: 'Ціль бота', color: css('--series-1') },
    ],
    { format: (v) => v.toFixed(2), labelAll: true, label: 'Стати на рівень' },
  );
  const a = ins.aggregate;
  $('#insightFacts').innerHTML = [
    ['Середній рівень', a.avgLevel],
    ['Заповнено слотів броні', `${a.avgArmorFilled} / 5`],
    ['Середній тир спорядження', a.avgGearTier],
    ['З прикрасами', `${Math.round(a.jewelryShare * 100)}%`],
    ['Популярна зброя', (a.weaponTypes ?? []).slice(0, 3).map(([n, c]) => `${n} (${c})`).join(', ')],
  ]
    .map(([k, v]) => `<div>${k}: <b>${esc(v)}</b></div>`)
    .join('');
}

async function renderGameSelect() {
  const games = (DATA.games ?? []).filter((g) => g.status !== 'dry_run').slice(-200).reverse();
  const sel = $('#gameSelect');
  const prev = sel.value;
  sel.innerHTML = games.length
    ? games.map((g) => `<option value="${g.mode}-${g.id}">${MODE_NAMES[g.mode]}${g.dungeon ? ` (${esc(g.dungeon)})` : ''} · ${g.xp} XP · L${g.level} · ${new Date(g.ended).toLocaleString('uk-UA')}</option>`).join('')
    : '<option>Ще немає зіграних ігор</option>';
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  if (games.length) await renderGameLog(sel.value);
}

async function renderGameLog(key) {
  const data = await load(`games/${key}.json`, null);
  const body = $('#gameLog tbody');
  if (!data) {
    $('#gameMeta').textContent = 'Журнал цієї гри не збережено (зберігаються останні та найкращі ігри).';
    body.innerHTML = '';
    return;
  }
  const g = data.game;
  $('#gameMeta').textContent = `${MODE_NAMES[g.mode]}${g.dungeon ? ` · ${g.dungeon}` : ''} · гра ${g.id} · ${g.xp} XP · рівень ${g.level} · причина: ${g.deathCause || '–'} · ${g.decisions} рішень · ${g.transactions} транзакцій · ${g.reverts} відкатів · ${Math.round(g.seconds / 60)} хв`;
  body.innerHTML = data.log
    .map(
      (r) => `<tr><td>${r.n}</td><td>${r.level}</td><td class="num">${fmt(r.xp)}</td><td class="num">${r.hp}/${r.maxHp}</td><td class="num">${fmt(r.gold)}</td><td>${esc(r.actions)}${r.ok === false ? ` <span class="no">${esc(r.error ?? '')}</span>` : ''}${r.tx ? ` <a class="muted small" href="https://voyager.online/tx/${esc(r.tx)}" target="_blank" rel="noopener">tx</a>` : ''}</td><td class="why">${esc(r.reason)}</td></tr>`,
    )
    .join('');
}

function renderDiscovery() {
  const d = DATA.discovery;
  const host = $('#discovery');
  $('#discUpdated').textContent = d?.updated ? `перевірено ${ago(d.updated)}` : '';
  if (!d) return (host.innerHTML = '<div class="muted">Запустіть workflow «discover»: він звіряє контракти, підземелля lootsurvivor.io і ABI.</div>');
  const items = [];
  for (const [name, c] of Object.entries(d.mainnet ?? {})) {
    items.push(`<div class="item"><div class="${c.live ? 'ok' : 'no'}">${esc(name)}</div><code>${esc(c.address)}</code>${c.functions ? `<div class="muted small">${c.functions.length} функцій</div>` : ''}</div>`);
  }
  for (const [name, c] of Object.entries(d.practice ?? {})) {
    items.push(`<div class="item"><div class="${c.live ? (c.matchesBundledAbi ? 'ok' : 'warn') : 'no'}">practice · ${esc(name)}</div><code>${esc(c.address)}</code></div>`);
  }
  if (d.frontend) {
    items.push(`<div class="item"><div class="ok">lootsurvivor.io</div><div class="small">Підземелля: ${esc((d.frontend.dungeonNames ?? []).join(', ') || '–')}</div><div class="small">Слоти: ${esc((d.frontend.slots ?? []).join(', ') || '–')}</div><div class="muted small">${(d.frontend.addresses ?? []).length} адрес у бандлі, ${(d.frontend.configuredButNotSeen ?? []).length} з конфігу не знайдено</div></div>`);
  }
  for (const p of d.problems ?? []) items.push(`<div class="item"><div class="warn">${esc(p)}</div></div>`);
  host.innerHTML = items.join('');
}

// ------------------------------------------------------------------ main
async function refresh() {
  const [status, summary, leaderboard, lbHistory, training, insights, discovery, games, reach] = await Promise.all([
    load('status.json', null),
    load('summary.json', null),
    load('leaderboard.json', null),
    load('leaderboard-history.json', []),
    load('training.json', []),
    load('insights.json', null),
    load('discovery.json', null),
    load('games.json', []),
    load('reach.json', null),
  ]);
  DATA = { status, summary, leaderboard, lbHistory, training, insights, discovery, games, reach };
  renderState(status);
  renderKpis();
  renderLive(status);
  renderProgress();
  renderTraining();
  renderReach();
  renderModes();
  renderLeaderboard();
  renderInsights();
  renderDiscovery();
  await renderGameSelect();
  $('#updated').textContent = summary?.updated ? `зведення: ${new Date(summary.updated).toLocaleString('uk-UA')}` : '';
}

$('#modeSeg').addEventListener('click', (e) => {
  const m = e.target.closest('button')?.dataset.mode;
  if (!m) return;
  currentMode = m;
  renderModes();
});
$('#gameSelect').addEventListener('change', (e) => renderGameLog(e.target.value));
let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    renderProgress();
    renderTraining();
    renderModes();
    renderInsights();
  }, 150);
});
refresh();
setInterval(refresh, 60_000);
addEventListener('bot:refresh', () => refresh());
