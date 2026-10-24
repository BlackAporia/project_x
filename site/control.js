// Bot control from the website: connect the Cartridge wallet (a session key approved in the Cartridge keychain and
// stored encrypted as a GitHub Actions secret), start and stop bot runs, schedule settings, live run monitoring.
// Requests go straight from this browser to api.github.com (and the keychain page of x.cartridge.gg). The GitHub
// token stays in this browser: sessionStorage, or localStorage when "remember" is ticked.
import { newSessionKey, sealSecret, textToB64 } from './vendor/crypto.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const API = 'https://api.github.com';
const LS = 'botctl.';

// ------------------------------------------------------------------ storage
function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
const store = {
  get: (k) => safe(() => sessionStorage.getItem(LS + k) ?? localStorage.getItem(LS + k)),
  set: (k, v, remember) =>
    safe(() => {
      (remember ? localStorage : sessionStorage).setItem(LS + k, v);
      (remember ? sessionStorage : localStorage).removeItem(LS + k);
    }),
  del: (k) => safe(() => (sessionStorage.removeItem(LS + k), localStorage.removeItem(LS + k))),
};

function detectRepo() {
  const saved = store.get('repo');
  if (saved) return saved;
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  const first = location.pathname.split('/').filter(Boolean)[0];
  if (m && first) return `${m[1]}/${first}`;
  return 'BlackAporia/project_x';
}

let repo = detectRepo();
const token = () => store.get('token');

// ------------------------------------------------------------------ GitHub API
async function gh(path, { method = 'GET', body, raw = false, auth = true } = {}) {
  const headers = { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (auth && token()) headers.Authorization = `Bearer ${token()}`;
  const r = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  if (r.status === 204) return null;
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).message ?? text;
    } catch {
      /* not json */
    }
    const e = new Error(`${r.status}: ${msg}`);
    e.status = r.status;
    throw e;
  }
  if (raw) return text;
  return text ? JSON.parse(text) : null;
}

let repoInfo = null;
async function repoMeta() {
  if (!repoInfo) repoInfo = await gh(`/repos/${repo}`);
  return repoInfo;
}

async function variables() {
  const out = {};
  let page = 1;
  for (;;) {
    const r = await gh(`/repos/${repo}/actions/variables?per_page=30&page=${page}`);
    for (const v of r.variables ?? []) out[v.name] = v;
    if ((r.variables ?? []).length < 30) break;
    page++;
  }
  return out;
}

async function setVariable(name, value) {
  try {
    await gh(`/repos/${repo}/actions/variables/${name}`, { method: 'PATCH', body: { name, value: String(value) } });
  } catch (e) {
    if (e.status !== 404) throw e;
    await gh(`/repos/${repo}/actions/variables`, { method: 'POST', body: { name, value: String(value) } });
  }
}

async function putSecret(name, value) {
  const key = await gh(`/repos/${repo}/actions/secrets/public-key`);
  await gh(`/repos/${repo}/actions/secrets/${name}`, { method: 'PUT', body: { encrypted_value: sealSecret(value, key.key), key_id: key.key_id } });
}

async function secretInfo(name) {
  try {
    return await gh(`/repos/${repo}/actions/secrets/${name}`);
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

let cfgCache = null;
async function config() {
  if (!cfgCache) cfgCache = await (await fetch(`bot-config.json?t=${Date.now()}`, { cache: 'no-store' })).json();
  return cfgCache;
}

// ------------------------------------------------------------------ live data for the dashboard (app.js)
// the bot pushes its data to the bot-data branch after every run; read it there instead of waiting for Pages
window.botData = {
  async load(name) {
    const path = `data/${name.split('/').map(encodeURIComponent).join('/')}`;
    if (token()) {
      try {
        return JSON.parse(await gh(`/repos/${repo}/contents/${path}?ref=bot-data`, { raw: true }));
      } catch {
        /* fall through */
      }
    }
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/bot-data/${path}?t=${Math.floor(Date.now() / 30000)}`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch {
      /* fall through: the Pages copy */
    }
    return undefined;
  },
};
window.dispatchEvent(new Event('bot:refresh'));

// ------------------------------------------------------------------ UI helpers
function note(id, html, kind = '') {
  const el = $(id);
  if (!el) return;
  el.className = `ctl-note ${kind}`;
  el.innerHTML = html;
}

function busy(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.setAttribute('aria-busy', String(on));
}

function needToken(id) {
  if (token()) return false;
  note(id, 'Спершу додайте GitHub‑токен у блоці «Доступ до GitHub».', 'warn');
  return true;
}

// ------------------------------------------------------------------ GitHub access
async function renderAccess() {
  $('#ctlRepo').value = repo;
  const t = token();
  $('#ctlTokenState').textContent = t ? 'токен збережено в цьому браузері' : 'токен не задано';
  $('#ctlForget').hidden = !t;
  if (!t) {
    note('#ctlAccessNote', 'Без токена сайт лише показує дані. Щоб керувати ботом, додайте токен із доступом до цього репозиторію.');
    return;
  }
  try {
    const me = await repoMeta();
    const can = me.permissions ? (me.permissions.admin || me.permissions.push ? 'запис' : 'лише читання') : 'ok';
    note('#ctlAccessNote', `Підключено до <b>${esc(me.full_name)}</b> (${can}), гілка ${esc(me.default_branch)}.`, 'ok');
  } catch (e) {
    note('#ctlAccessNote', `Токен не працює: ${esc(e.message)}`, 'bad');
  }
}

$('#ctlSaveToken')?.addEventListener('click', async () => {
  const v = $('#ctlToken').value.trim();
  const r = $('#ctlRepo').value.trim();
  if (r && /^[\w.-]+\/[\w.-]+$/.test(r)) {
    repo = r;
    store.set('repo', r, true);
  }
  if (v) store.set('token', v, $('#ctlRemember').checked);
  $('#ctlToken').value = '';
  repoInfo = null;
  await finishWallet(); // a Cartridge approval may be waiting for the token
  await renderAll();
});

$('#ctlForget')?.addEventListener('click', async () => {
  store.del('token');
  repoInfo = null;
  await renderAll();
});

// ------------------------------------------------------------------ Cartridge wallet
async function renderWallet() {
  if (!token()) {
    $('#ctlWallet').innerHTML = '<p class="muted">Потрібен GitHub‑токен.</p>';
    return;
  }
  try {
    const [vars, secret] = await Promise.all([variables(), secretInfo('CARTRIDGE_SESSION_B64')]);
    const addr = vars.MAINNET_ACCOUNT_ADDRESS?.value;
    const user = vars.CARTRIDGE_USERNAME?.value;
    const exp = Number(vars.CARTRIDGE_SESSION_EXPIRES?.value ?? 0) * 1000;
    const expired = exp && exp < Date.now();
    const rows = [
      ['Акаунт', addr ? `<a href="https://voyager.online/contract/${esc(addr)}" target="_blank" rel="noopener">${esc(user ? `${user} · ` : '')}${esc(short(addr))}</a>` : '<span class="muted">не підключено</span>'],
      ['Сесія бота', secret ? `збережена ${new Date(secret.updated_at).toLocaleString('uk-UA')}` : '<span class="muted">немає</span>'],
      ['Діє до', exp ? `${new Date(exp).toLocaleString('uk-UA')}${expired ? ' — <b class="bad">закінчилась</b>' : ''}` : '–'],
    ];
    $('#ctlWallet').innerHTML = `<dl class="ctl-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
    $('#ctlConnect').textContent = secret && !expired ? 'Оновити сесію Cartridge' : 'Підключити Cartridge';
  } catch (e) {
    $('#ctlWallet').innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}

$('#ctlConnect')?.addEventListener('click', async () => {
  if (needToken('#ctlWalletNote')) return;
  const cfg = await config();
  const key = newSessionKey();
  // the session private key lives only in this tab until it is sealed into the GitHub secret
  sessionStorage.setItem(`${LS}pendingSigner`, JSON.stringify(key));
  const redirect = location.origin + location.pathname;
  const q = new URLSearchParams({
    public_key: key.pubKey,
    redirect_uri: redirect,
    redirect_query_name: 'startapp',
    rpc_url: cfg.rpcUrl,
    policies: JSON.stringify(cfg.policies),
  });
  location.href = `${cfg.keychainUrl}/session?${q}`;
});

function decodeRegistration(data) {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

/** Back from the Cartridge keychain: seal the approved session into the GitHub secret the bot reads. */
async function finishWallet() {
  const params = new URLSearchParams(location.search);
  const data = params.get('startapp');
  if (data) {
    sessionStorage.setItem(`${LS}pendingSession`, data);
    params.delete('startapp');
    history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : '') + location.hash);
  }
  const pending = sessionStorage.getItem(`${LS}pendingSession`);
  if (!pending) return;
  const signer = JSON.parse(sessionStorage.getItem(`${LS}pendingSigner`) ?? 'null');
  if (!signer) {
    sessionStorage.removeItem(`${LS}pendingSession`);
    note('#ctlWalletNote', 'Відповідь Cartridge отримано, але ключ сесії з цієї вкладки втрачено. Підключіть ще раз.', 'bad');
    return;
  }
  if (needToken('#ctlWalletNote')) return;
  try {
    const cfg = await config();
    const registration = decodeRegistration(pending);
    const session = { signer, session: registration, policies: cfg.policies };
    await putSecret(cfg.secret, textToB64(JSON.stringify(session)));
    await setVariable('MAINNET_ACCOUNT_ADDRESS', String(registration.address).toLowerCase());
    if (registration.expiresAt) await setVariable('CARTRIDGE_SESSION_EXPIRES', registration.expiresAt);
    if (registration.username) await setVariable('CARTRIDGE_USERNAME', registration.username);
    sessionStorage.removeItem(`${LS}pendingSession`);
    sessionStorage.removeItem(`${LS}pendingSigner`);
    note('#ctlWalletNote', `Сесію для <b>${esc(registration.username ?? short(registration.address))}</b> збережено як секрет репозиторію. Бот може грати вашим акаунтом (лише ходи й зарахування результату).`, 'ok');
  } catch (e) {
    note('#ctlWalletNote', `Не вдалося зберегти сесію: ${esc(e.message)}. Перевірте права токена (Secrets і Variables: запис) і натисніть «Підключити» ще раз.`, 'bad');
  }
}

// ------------------------------------------------------------------ bot runs and schedule
async function renderControls() {
  const cfg = await config().catch(() => null);
  const sel = $('#ctlDungeon');
  if (cfg && sel && !sel.options.length) {
    for (const d of cfg.dungeons) sel.add(new Option(d === 'default' ? 'Default' : d, d === 'default' ? '' : d));
  }
  if (!token()) {
    $('#ctlSchedule').innerHTML = '<p class="muted">Потрібен GitHub‑токен.</p>';
    return;
  }
  try {
    const vars = await variables();
    const on = (n) => vars[n]?.value === 'true';
    $('#ctlSchedule').innerHTML = `
      <label class="ctl-switch"><input type="checkbox" data-var="MAINNET_ENABLED" ${on('MAINNET_ENABLED') ? 'checked' : ''}> Mainnet за розкладом (кожні 3 год)</label>
      <label class="ctl-switch"><input type="checkbox" data-var="MAINNET_LIVE" ${on('MAINNET_LIVE') ? 'checked' : ''}> Реальні транзакції за розкладом (інакше dry run)</label>
      <label class="ctl-field">Practice‑підземелля за розкладом
        <select data-var="PRACTICE_DUNGEON">${(cfg?.dungeons ?? []).map((d) => `<option value="${d === 'default' ? '' : d}" ${(vars.PRACTICE_DUNGEON?.value ?? '') === (d === 'default' ? '' : d) ? 'selected' : ''}>${d}</option>`).join('')}</select>
      </label>`;
  } catch (e) {
    $('#ctlSchedule').innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}

$('#ctlSchedule')?.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-var]');
  if (!el) return;
  const name = el.dataset.var;
  const value = el.type === 'checkbox' ? String(el.checked) : el.value;
  if (name === 'MAINNET_LIVE' && value === 'true' && !confirm('Бот надсилатиме реальні транзакції з вашого акаунта за розкладом. Увімкнути?')) {
    el.checked = false;
    return;
  }
  try {
    await setVariable(name, value);
    note('#ctlRunNote', `Збережено: ${esc(name)} = ${esc(value || '(default)')}`, 'ok');
  } catch (err) {
    note('#ctlRunNote', `Не вдалося зберегти ${esc(name)}: ${esc(err.message)}`, 'bad');
  }
});

$('#ctlMode')?.addEventListener('change', () => {
  const m = $('#ctlMode').value;
  $('#ctlLiveWrap').hidden = m === 'practice';
  $('#ctlDungeon').closest('label').hidden = m === 'mainnet'; // mainnet plays the dungeons of your own game tokens
  if (m === 'practice') $('#ctlLive').checked = false;
});

$('#ctlRun')?.addEventListener('click', async () => {
  if (needToken('#ctlRunNote')) return;
  const mode = $('#ctlMode').value;
  const live = mode !== 'practice' && $('#ctlLive').checked;
  if (live && !confirm('Бот надсилатиме реальні транзакції з вашого акаунта Cartridge (ходи у ваших іграх). Продовжити?')) return;
  const btn = $('#ctlRun');
  busy(btn, true);
  try {
    const cfg = await config();
    const meta = await repoMeta();
    await gh(`/repos/${repo}/actions/workflows/${cfg.workflows.bot}/dispatches`, {
      method: 'POST',
      body: {
        ref: meta.default_branch,
        inputs: {
          mode,
          minutes: String(Math.max(5, Math.min(300, Number($('#ctlMinutes').value) || 40))),
          live: String(live),
          dungeon: $('#ctlDungeon').value,
          settings_id: '',
          max_games: String(Math.max(1, Math.min(1000, Number($('#ctlMaxGames').value) || 50))),
        },
      },
    });
    note('#ctlRunNote', `Запуск поставлено в чергу: ${esc(mode)}${live ? ' (live)' : ''}. Статус з’явиться в «Запусках» за кілька секунд.`, 'ok');
    setTimeout(renderRuns, 4000);
  } catch (e) {
    note('#ctlRunNote', `Не вдалося запустити: ${esc(e.message)}`, 'bad');
  } finally {
    busy(btn, false);
  }
});

$('#ctlLearn')?.addEventListener('click', async () => {
  if (needToken('#ctlRunNote')) return;
  try {
    const cfg = await config();
    const meta = await repoMeta();
    await gh(`/repos/${repo}/actions/workflows/${cfg.workflows.learn}/dispatches`, { method: 'POST', body: { ref: meta.default_branch } });
    note('#ctlRunNote', 'Навчання поставлено в чергу (лідерборд, білди лідерів, тюнінг політики).', 'ok');
    setTimeout(renderRuns, 4000);
  } catch (e) {
    note('#ctlRunNote', `Не вдалося запустити навчання: ${esc(e.message)}`, 'bad');
  }
});

// ------------------------------------------------------------------ run monitoring
const STATUS = {
  queued: ['в черзі', 'warn'],
  waiting: ['чекає', 'warn'],
  pending: ['в черзі', 'warn'],
  requested: ['в черзі', 'warn'],
  in_progress: ['виконується', 'run'],
  success: ['успіх', 'ok'],
  failure: ['помилка', 'bad'],
  cancelled: ['скасовано', 'muted'],
  skipped: ['пропущено', 'muted'],
  timed_out: ['таймаут', 'bad'],
};
let anyRunning = false;

function duration(run) {
  const a = new Date(run.run_started_at ?? run.created_at).getTime();
  const b = run.status === 'completed' ? new Date(run.updated_at).getTime() : Date.now();
  const m = Math.max(0, Math.round((b - a) / 60000));
  return m < 60 ? `${m} хв` : `${Math.floor(m / 60)} год ${m % 60} хв`;
}

async function renderRuns() {
  const host = $('#ctlRuns');
  if (!host) return;
  try {
    const r = await gh(`/repos/${repo}/actions/runs?per_page=10`);
    const runs = (r.workflow_runs ?? []).filter((x) => !['CI'].includes(x.name));
    anyRunning = runs.some((x) => x.status !== 'completed');
    const steps = {};
    if (token()) {
      for (const run of runs.filter((x) => x.status === 'in_progress').slice(0, 2)) {
        try {
          const jobs = await gh(`/repos/${repo}/actions/runs/${run.id}/jobs`);
          const step = jobs.jobs?.[0]?.steps?.find((s) => s.status === 'in_progress');
          if (step) steps[run.id] = step.name;
        } catch {
          /* optional */
        }
      }
    }
    host.innerHTML = runs.length
      ? `<table class="ctl-runs"><thead><tr><th>Workflow</th><th>Статус</th><th>Тривалість</th><th></th></tr></thead><tbody>${runs
          .map((run) => {
            const [label, cls] = STATUS[run.conclusion ?? run.status] ?? [run.conclusion ?? run.status, ''];
            const when = new Date(run.run_started_at ?? run.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
            const ev = run.event === 'schedule' ? 'розклад' : run.event === 'workflow_dispatch' ? 'вручну' : run.event;
            return `<tr>
              <td><a href="${esc(run.html_url)}" target="_blank" rel="noopener">${esc(run.name)}</a><div class="muted small">${esc(ev)} · ${esc(when)}${steps[run.id] ? ` · ${esc(steps[run.id])}` : ''}</div></td>
              <td><span class="badge ${cls}">${esc(label)}</span></td>
              <td>${duration(run)}</td>
              <td>${run.status !== 'completed' && token() ? `<button class="btn small" data-cancel="${run.id}">Зупинити</button>` : ''}</td>
            </tr>`;
          })
          .join('')}</tbody></table>`
      : '<p class="muted">Запусків ще немає.</p>';
  } catch (e) {
    host.innerHTML = `<p class="muted">Список запусків недоступний: ${esc(e.message)}${token() ? '' : ' (для приватного репозиторію потрібен токен)'}</p>`;
  }
}

$('#ctlRuns')?.addEventListener('click', async (e) => {
  const id = e.target.closest('[data-cancel]')?.dataset.cancel;
  if (!id || !confirm('Зупинити цей запуск?')) return;
  try {
    await gh(`/repos/${repo}/actions/runs/${id}/cancel`, { method: 'POST' });
    setTimeout(renderRuns, 3000);
  } catch (err) {
    note('#ctlRunNote', `Не вдалося зупинити: ${esc(err.message)}`, 'bad');
  }
});

// ------------------------------------------------------------------ main
async function renderAll() {
  await renderAccess();
  await Promise.all([renderWallet(), renderControls(), renderRuns()]);
  window.dispatchEvent(new Event('bot:refresh'));
}

await finishWallet();
await renderAll();
// poll runs: every 20 s while something runs, otherwise every 90 s (unauthenticated API: 60 requests/hour)
let last = Date.now();
setInterval(() => {
  const every = anyRunning ? 20_000 : token() ? 60_000 : 90_000;
  if (Date.now() - last >= every && !document.hidden) {
    last = Date.now();
    renderRuns();
    if (anyRunning) window.dispatchEvent(new Event('bot:refresh'));
  }
}, 5_000);
