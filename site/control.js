// Bot control from the website: connect the Cartridge wallet (a session key approved in the Cartridge keychain and
// stored encrypted as a GitHub Actions secret), start and stop bot runs, schedule settings, live run monitoring.
// Requests go straight from this browser to api.github.com (and the keychain page of x.cartridge.gg). The GitHub
// token stays in this browser: sessionStorage, or localStorage when "remember" is ticked.
import { newSessionKey, sealSecret, starkKey, textToB64 } from './vendor/crypto.js';

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

// ------------------------------------------------------------------ Game Account (EVM / Ronin wallet)
// lootsurvivor.io signs EVM-wallet players into a Game Account (a Starknet account owned by the wallet). Its owner
// can share a Game Session link; the bot plays with it (gas sponsored by lootsurvivor.io).
function parseGameSession(input, cfg) {
  const m = /game-session=([A-Za-z0-9_-]+)/.exec(input.trim());
  const payload = m ? m[1] : input.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) throw new Error('це не посилання сесії lootsurvivor.io');
  let t;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    t = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))));
  } catch {
    throw new Error('не вдалося розкодувати посилання');
  }
  if (!Array.isArray(t) || (t.length !== 6 && t.length !== 7) || t[0] !== 1) throw new Error('невідомий формат сесії');
  const [, classHash, owner, privateKey, a] = t;
  if (BigInt(classHash) !== BigInt(cfg.gameAccount.classHash)) throw new Error('це сесія не Game Account');
  if (!Array.isArray(a) || a.length !== 10) throw new Error('пошкоджені умови сесії');
  if (BigInt(starkKey(privateKey)) !== BigInt(a[2])) throw new Error('ключ сесії не відповідає підтвердженню');
  const expiresAt = Number(a[3]);
  if (expiresAt * 1000 < Date.now() + 120_000) throw new Error(`сесія вже закінчилась (${new Date(expiresAt * 1000).toLocaleString('uk-UA')})`);
  const perms = a[9].map(([target, method]) => ({ target, method }));
  const onCore = (m) => perms.some((p) => BigInt(p.target) === BigInt(cfg.gameCore) && p.method === m);
  if (!onCore('commit_actions')) throw new Error('сесія не дозволяє ходи (commit_actions) у Loot Survivor');
  return { account: '0x' + BigInt(a[0]).toString(16), owner: String(owner).toLowerCase(), expiresAt, perms, canVerify: onCore('verify_game') };
}

async function renderGameAccount() {
  const host = $('#ctlGameAccount');
  if (!host) return;
  if (!token()) {
    host.innerHTML = '<p class="muted">Потрібен GitHub‑токен.</p>';
    return;
  }
  try {
    const [vars, secret] = await Promise.all([variables(), secretInfo('GAME_SESSION_LINK')]);
    const exp = Number(vars.GAME_SESSION_EXPIRES?.value ?? 0) * 1000;
    if (!secret) {
      host.innerHTML = '<p class="muted">Не підключено. Бот грає акаунтом Cartridge (блок вище).</p>';
      $('#ctlGaRemove').hidden = true;
      return;
    }
    host.innerHTML = `<dl class="ctl-dl">
      <dt>Game Account</dt><dd>${esc(short(vars.GAME_ACCOUNT_ADDRESS?.value ?? ''))} <span class="badge ok">активний для бота</span></dd>
      <dt>Власник (EVM)</dt><dd>${esc(short(vars.GAME_ACCOUNT_OWNER?.value ?? ''))}</dd>
      <dt>Сесія діє до</dt><dd>${exp ? `${new Date(exp).toLocaleString('uk-UA')}${exp < Date.now() ? ' — <b class="bad">закінчилась</b>' : ''}` : '–'}</dd>
    </dl>`;
    $('#ctlGaRemove').hidden = false;
  } catch (e) {
    host.innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}

$('#ctlGaSave')?.addEventListener('click', async () => {
  if (needToken('#ctlGaNote')) return;
  const input = $('#ctlGaLink').value;
  try {
    const cfg = await config();
    const g = parseGameSession(input, cfg);
    await putSecret(cfg.gameAccount.secret, input.trim());
    await setVariable('GAME_ACCOUNT_ADDRESS', g.account);
    await setVariable('GAME_ACCOUNT_OWNER', g.owner);
    await setVariable('GAME_SESSION_EXPIRES', String(g.expiresAt));
    await setVariable('MAINNET_ACCOUNT_ADDRESS', g.account);
    $('#ctlGaLink').value = '';
    note('#ctlGaNote', `Збережено. Бот гратиме Game Account <b>${esc(short(g.account))}</b> (власник ${esc(short(g.owner))}) до ${new Date(g.expiresAt * 1000).toLocaleString('uk-UA')}.${g.canVerify ? '' : ' Увага: сесія не дозволяє verify_game — результати доведеться зараховувати вручну.'}`, 'ok');
    await renderGameAccount();
  } catch (e) {
    note('#ctlGaNote', esc(e.message), 'bad');
  }
});

$('#ctlGaRemove')?.addEventListener('click', async () => {
  if (needToken('#ctlGaNote') || !confirm('Від’єднати Game Account? Бот повернеться до акаунта Cartridge.')) return;
  try {
    await gh(`/repos/${repo}/actions/secrets/GAME_SESSION_LINK`, { method: 'DELETE' });
    note('#ctlGaNote', 'Game Account від’єднано.', 'ok');
    await renderGameAccount();
  } catch (e) {
    note('#ctlGaNote', esc(e.message), 'bad');
  }
});

// ------------------------------------------------------------------ Ronke Casino
async function renderRonke() {
  const host = $('#ctlRonke');
  if (!host) return;
  const r = await window.botData?.load('ronke.json').catch(() => undefined);
  const vars = token() ? await variables().catch(() => ({})) : {};
  const sw = token()
    ? `<label class="ctl-switch"><input type="checkbox" id="ctlRonkeAuto" ${vars.RONKE_CLAIM?.value === 'true' ? 'checked' : ''}> Забирати щоденні ігри автоматично (з розкладом mainnet)</label>`
    : '';
  if (!r) {
    host.innerHTML = `<p class="muted">Ще не перевірялось. Натисніть «Забрати ігри зараз».</p>${sw}`;
    return;
  }
  const label = { claim: 'можна забрати', playing: 'граються', spent: 'зіграно', missed: 'пропущено', locked: 'закрито' };
  const days = (r.days ?? []).map((d) => `<span class="badge ${d.state === 'claim' ? 'warn' : d.state === 'missed' ? 'bad' : d.state === 'locked' ? 'muted' : 'ok'}">День ${d.day}: ${label[d.state] ?? d.state}${d.games ? ` · ${d.played ?? 0}/${d.games + (d.bonusClaimed ?? 0)}` : ''}</span>`).join(' ');
  host.innerHTML = `<dl class="ctl-dl">
      <dt>Акаунт</dt><dd>${esc(short(r.address))} (${esc(r.kind)})</dd>
      <dt>Право на ігри</dt><dd>${r.error ? `<span class="bad">${esc(r.error)}</span>` : r.eligible ? `<span class="ok">так</span>${r.dailyGames ? ` · ${r.dailyGames} ігор на день` : ''}` : `<span class="bad">ні</span> — ${esc(r.reason ?? (r.needsWallet ? 'Ronin-гаманець не прив’язаний' : ''))}`}</dd>
      <dt>Дні</dt><dd>${days || '–'}</dd>
      <dt>Останнє</dt><dd>${esc(r.message ?? '')}${r.claimed?.length ? ` → ігри ${r.claimed.map(esc).join(', ')}` : ''} <span class="muted small">${new Date(r.updated).toLocaleString('uk-UA')}</span></dd>
    </dl>${sw}`;
}

$('#ctlRonke')?.addEventListener('change', async (e) => {
  if (e.target.id !== 'ctlRonkeAuto') return;
  try {
    await setVariable('RONKE_CLAIM', String(e.target.checked));
    note('#ctlRonkeNote', `Автоматичне отримання ігор ${e.target.checked ? 'увімкнено' : 'вимкнено'}.`, 'ok');
  } catch (err) {
    note('#ctlRonkeNote', esc(err.message), 'bad');
  }
});

$('#ctlRonkeClaim')?.addEventListener('click', async () => {
  if (needToken('#ctlRonkeNote')) return;
  const play = $('#ctlRonkePlay').checked;
  if (play && !confirm('Забрати ігри й одразу зіграти їх у mainnet (реальні транзакції, газ оплачує lootsurvivor.io для Game Account)?')) return;
  try {
    const cfg = await config();
    const meta = await repoMeta();
    await gh(`/repos/${repo}/actions/workflows/${cfg.workflows.bot}/dispatches`, {
      method: 'POST',
      body: { ref: meta.default_branch, inputs: { mode: play ? 'mainnet' : 'practice', minutes: play ? '120' : '5', live: String(play), dungeon: '', settings_id: '', max_games: play ? '20' : '1', ronke_claim: 'true' } },
    });
    note('#ctlRonkeNote', `Запуск у черзі: забрати ігри${play ? ' і зіграти' : ''}. Результат з’явиться тут і в «Запусках».`, 'ok');
    setTimeout(renderRuns, 4000);
  } catch (e) {
    note('#ctlRonkeNote', `Не вдалося запустити: ${esc(e.message)}`, 'bad');
  }
});

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
          ronke_claim: String(mode !== 'practice' && $('#ctlRonkeBefore').checked),
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
  await Promise.all([renderWallet(), renderGameAccount(), renderRonke(), renderControls(), renderRuns()]);
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
