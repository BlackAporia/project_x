// Bot control from the website: connect the Cartridge wallet (a session key approved in the Cartridge keychain and
// stored encrypted as a GitHub Actions secret), start and stop bot runs, schedule settings, live run monitoring.
// Requests go straight from this browser to api.github.com (and the keychain page of x.cartridge.gg). The GitHub
// token stays in this browser: sessionStorage, or localStorage when "remember" is ticked.
import {
  createSessionTypedData,
  feeCaps,
  gameAccountAddress,
  newSessionKey,
  ownerSignatureFelts,
  recoverOwner,
  sealSecret,
  sessionDigest,
  sessionLink,
  starkKey,
  textToB64,
} from './vendor/crypto.js';

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
  note(id, 'Спершу додайте GitHub‑токен: вкладка <a href="#accounts" data-goto="accounts">🔑 Акаунти</a>.', 'warn');
  return true;
}

// ------------------------------------------------------------------ tabs
const TABS = ['home', 'accounts', 'schedule', 'stats'];
function showTab(name, remember = true) {
  if (!TABS.includes(name)) name = 'home';
  document.querySelectorAll('[data-pane]').forEach((el) => (el.hidden = el.dataset.pane !== name));
  document.querySelectorAll('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  if (remember) safe(() => localStorage.setItem(LS + 'tab', name));
  if (location.hash.slice(1) !== name) history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
  if (name === 'stats') {
    // charts measure their container: redraw once it is visible
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('bot:refresh'));
    });
  }
}
$('#tabs')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-goto]');
  if (!a) return;
  e.preventDefault();
  showTab(a.dataset.goto);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : (safe(() => localStorage.getItem(LS + 'tab')) ?? 'home'), false);

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
// lootsurvivor.io signs EVM-wallet players into a Game Account (a Starknet account owned by the wallet). Its session
// manager ("Share session") is switched off in production, so the website asks the same wallet to sign the same
// CreateGameSession terms lootsurvivor.io uses; the resulting session link is sealed into a secret for the bot.
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

// Starknet reads from the browser (deployment, session epoch, STRK balance)
async function starknet(cfg, method, params) {
  let last;
  for (const url of cfg.gameAccount.rpcUrls) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const body = await r.json();
      if (body.error) {
        const e = new Error(body.error.message ?? 'rpc error');
        e.code = body.error.code;
        throw e;
      }
      return body.result;
    } catch (e) {
      if (e.code !== undefined) throw e; // the node answered: no point asking another one
      last = e;
    }
  }
  throw last ?? new Error('no Starknet RPC reachable');
}

async function gameAccountInfo(cfg, account) {
  let deployed;
  try {
    await starknet(cfg, 'starknet_getClassHashAt', ['latest', account]);
    deployed = true;
  } catch (e) {
    if (e.code === 20) deployed = false; // CONTRACT_NOT_FOUND
    else throw e;
  }
  const call = (contract, selector, calldata = []) => starknet(cfg, 'starknet_call', [{ contract_address: contract, entry_point_selector: selector, calldata }, 'latest']);
  const epoch = deployed ? BigInt((await call(account, cfg.gameAccount.selectors.get_session_epoch))[0]) : 0n;
  let strk = 0n;
  if (deployed) {
    const [lo, hi] = await call(cfg.gameAccount.strk, cfg.gameAccount.selectors.balance_of, [account]).catch(() => ['0x0', '0x0']);
    strk = BigInt(lo) + (BigInt(hi ?? 0) << 128n);
  }
  return { deployed, epoch, strk };
}

/** STRK price in micro-USD for the session's fee caps (falls back to a low price = more generous caps). */
async function strkMicroUsd() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=starknet&vs_currencies=usd', { cache: 'no-store' });
    const usd = (await r.json())?.starknet?.usd;
    if (typeof usd === 'number' && usd > 0.001 && usd < 1000) return BigInt(Math.round(usd * 1e6));
  } catch {
    /* fall through */
  }
  return 50_000n;
}

// EVM wallets: EIP-6963 discovery (MetaMask, Ronin Wallet, Rabby, ...) with the legacy injected providers as fallback
const evmWallets = new Map();
function addEvmWallet(id, name, provider) {
  if (!provider || [...evmWallets.values()].some((w) => w.provider === provider)) return;
  evmWallets.set(id, { name, provider });
  renderEvmWallets();
}
function renderEvmWallets() {
  const sel = $('#ctlEvmWallet');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = evmWallets.size ? '' : '<option value="">гаманець не знайдено</option>';
  for (const [id, w] of evmWallets) sel.add(new Option(w.name, id));
  if (evmWallets.has(cur)) sel.value = cur;
  else {
    const ronin = [...evmWallets.entries()].find(([, w]) => /ronin/i.test(w.name));
    if (ronin) sel.value = ronin[0];
  }
}
window.addEventListener('eip6963:announceProvider', (e) => {
  const d = e.detail;
  if (d?.info?.uuid && d.provider) addEvmWallet(d.info.uuid, d.info.name ?? 'Wallet', d.provider);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
setTimeout(() => {
  if (window.ronin?.provider) addEvmWallet('ronin-injected', 'Ronin Wallet', window.ronin.provider);
  if (window.ethereum) addEvmWallet('injected', window.ethereum.isMetaMask ? 'MetaMask' : 'Браузерний гаманець', window.ethereum);
  renderEvmWallets();
}, 600);

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
      $('#ctlGaCreate').textContent = 'Створити сесію гаманцем';
      return;
    }
    const addr = vars.GAME_ACCOUNT_ADDRESS?.value ?? '';
    host.innerHTML = `<dl class="ctl-dl">
      <dt>Game Account</dt><dd><a href="https://voyager.online/contract/${esc(addr)}" target="_blank" rel="noopener">${esc(short(addr))}</a> <span class="badge ok">активний для бота</span></dd>
      <dt>Власник (EVM)</dt><dd>${esc(short(vars.GAME_ACCOUNT_OWNER?.value ?? ''))}</dd>
      <dt>Сесія діє до</dt><dd>${exp ? `${new Date(exp).toLocaleString('uk-UA')}${exp < Date.now() ? ' — <b class="bad">закінчилась</b>' : ''}` : '–'}</dd>
      <dt>Газ (STRK)</dt><dd id="ctlGaGas" class="muted">перевіряю…</dd>
    </dl>`;
    $('#ctlGaRemove').hidden = false;
    $('#ctlGaCreate').textContent = 'Оновити сесію';
    if (addr) {
      const cfg = await config();
      gameAccountInfo(cfg, addr)
        .then((i) => {
          const el = $('#ctlGaGas');
          if (!el) return;
          el.className = '';
          el.innerHTML = i.deployed
            ? `${(Number(i.strk) / 1e18).toFixed(3)} STRK <span class="muted small">— для Proving Grounds (газ платить акаунт); ігри Ronke спонсоровані</span>`
            : '<span class="muted">акаунт ще не розгорнуто — розгорнеться з першою спонсорованою дією</span>';
        })
        .catch(() => {
          const el = $('#ctlGaGas');
          if (el) el.textContent = 'не вдалося перевірити';
        });
    }
  } catch (e) {
    host.innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}

async function saveGameSession(link, g) {
  const cfg = await config();
  await putSecret(cfg.gameAccount.secret, link);
  await setVariable('GAME_ACCOUNT_ADDRESS', g.account);
  await setVariable('GAME_ACCOUNT_OWNER', g.owner);
  await setVariable('GAME_SESSION_EXPIRES', String(g.expiresAt));
  await setVariable('MAINNET_ACCOUNT_ADDRESS', g.account);
  renderChecklist();
}

$('#ctlGaCreate')?.addEventListener('click', async (ev) => {
  if (needToken('#ctlGaNote')) return;
  const w = evmWallets.get($('#ctlEvmWallet').value);
  if (!w) {
    note('#ctlGaNote', 'EVM‑гаманець не знайдено. Встановіть MetaMask або Ronin Wallet (на телефоні — відкрийте сайт у браузері гаманця).', 'bad');
    return;
  }
  const btn = ev.currentTarget;
  busy(btn, true);
  try {
    const cfg = await config();
    note('#ctlGaNote', 'Підтвердіть підключення в гаманці…');
    const [owner] = (await w.provider.request({ method: 'eth_requestAccounts' })).map((a) => String(a).toLowerCase());
    if (!owner) throw new Error('гаманець не дав адресу');
    const account = gameAccountAddress(owner);
    note('#ctlGaNote', `Game Account ${esc(short(account))}: перевіряю стан у Starknet…`);
    let info;
    try {
      info = await gameAccountInfo(cfg, account);
    } catch {
      info = null; // RPC unreachable from this browser: a new account has epoch 0
    }
    const days = Number($('#ctlGaDays').value || 90);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = BigInt(now + Math.min(days * 86400, cfg.gameAccount.maxSessionSeconds));
    const key = newSessionKey();
    const terms = {
      account,
      chainId: cfg.chainId,
      sessionKey: key.pubKey,
      expiresAt,
      epoch: info?.epoch ?? 0n,
      ...feeCaps(await strkMicroUsd()),
      maxSelfPaidTxs: BigInt(cfg.gameAccount.maxSelfPaidTxs),
      maxFeeExceptions: BigInt(cfg.gameAccount.maxFeeExceptions),
      permissions: cfg.gameAccount.permissions,
    };
    const td = createSessionTypedData(terms);
    note('#ctlGaNote', 'Підпишіть «CreateGameSession» у гаманці (це не транзакція, газу немає)…');
    const sig = await w.provider.request({ method: 'eth_signTypedData_v4', params: [owner, JSON.stringify(td)] });
    const felts = ownerSignatureFelts(sig);
    if (recoverOwner(sessionDigest(td), felts) !== owner) throw new Error('підпис не належить цьому гаманцю — сесію не збережено');
    const link = sessionLink({ owner, privateKey: key.privKey, terms, ownerSignature: felts });
    await saveGameSession(link, { account, owner, expiresAt: Number(expiresAt) });
    note(
      '#ctlGaNote',
      `Готово. Бот гратиме Game Account <b>${esc(short(account))}</b> (гаманець ${esc(short(owner))}) до ${new Date(Number(expiresAt) * 1000).toLocaleString('uk-UA')}.` +
        (info === null ? ' <span class="warn">Стан акаунта не вдалося перевірити з браузера — якщо ви раніше відкликали всі сесії, створіть нову на lootsurvivor.io.</span>' : '') +
        (info && !info.deployed ? ' Акаунт ще не розгорнуто: він розгорнеться з першою спонсорованою дією (ігри Ronke).' : ''),
      'ok',
    );
    await renderGameAccount();
  } catch (e) {
    const msg = e?.code === 4001 ? 'запит відхилено в гаманці' : e.message;
    note('#ctlGaNote', `Не вдалося створити сесію: ${esc(msg)}`, 'bad');
  } finally {
    busy(btn, false);
  }
});

$('#ctlGaSave')?.addEventListener('click', async () => {
  if (needToken('#ctlGaNote')) return;
  const input = $('#ctlGaLink').value;
  try {
    const cfg = await config();
    const g = parseGameSession(input, cfg);
    await saveGameSession(input.trim(), g);
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
      ${r.needsWallet ? `<dt>Що зробити</dt><dd>Ігри Ronke дають лише акаунту з прив’язаним Ronin‑гаманцем зі снапшоту (Ronke score 1+ або 100+ RON). На <a href="https://lootsurvivor.io/ronkeverse" target="_blank" rel="noopener">lootsurvivor.io/ronkeverse</a> увійдіть тим акаунтом, яким грає бот, і натисніть <b>Link wallet</b>.</dd>` : ''}
      ${r.extra?.tasks ? `<dt>Завдання</dt><dd>${Object.entries(r.extra.tasks).map(([k, v]) => `<span class="badge ${v === 'done' || v === 'claimed' ? 'ok' : 'muted'}">${esc(k)}: ${esc(v)}</span>`).join(' ')}</dd>` : ''}
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
      body: { ref: meta.default_branch, inputs: { mode: play ? 'mainnet' : 'practice', minutes: play ? '120' : '5', live: String(play), dungeon: '', settings_id: '', max_games: play ? '20' : '1', ronke_claim: 'true', proving_grounds: '0' } },
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
  for (const el of [sel, $('#qaDungeon')]) {
    if (cfg && el && !el.options.length) for (const d of cfg.dungeons) el.add(new Option(d === 'default' ? 'Default' : d, d === 'default' ? '' : d));
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
      <label class="ctl-field">Proving Grounds за розкладом: входів за запуск (0 = вимкнено)
        <input type="number" min="0" max="50" data-var="PROVING_GROUNDS_GAMES" value="${esc(vars.PROVING_GROUNDS_GAMES?.value ?? '0')}">
      </label>
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
    note('#ctlScheduleNote', `Збережено: ${esc(name)} = ${esc(value || '(default)')}`, 'ok');
    renderChecklist();
  } catch (err) {
    note('#ctlScheduleNote', `Не вдалося зберегти ${esc(name)}: ${esc(err.message)}`, 'bad');
  }
});

$('#ctlMode')?.addEventListener('change', () => {
  const m = $('#ctlMode').value;
  $('#ctlLiveWrap').hidden = m === 'practice';
  $('#ctlPgWrap').hidden = m === 'practice';
  $('#ctlDungeon').closest('label').hidden = m === 'mainnet'; // mainnet plays the dungeons of your own game tokens
  if (m === 'practice') $('#ctlLive').checked = false;
});

/** Start the Bot workflow with the given inputs; remembers what was asked so the monitor can name the run. */
async function dispatchBot(inputs, label) {
  const cfg = await config();
  const meta = await repoMeta();
  const full = { mode: 'practice', minutes: '40', live: 'false', dungeon: '', settings_id: '', max_games: '50', ronke_claim: 'false', proving_grounds: '0', ...inputs };
  await gh(`/repos/${repo}/actions/workflows/${cfg.workflows.bot}/dispatches`, { method: 'POST', body: { ref: meta.default_branch, inputs: full } });
  safe(() => localStorage.setItem(LS + 'lastLaunch', JSON.stringify({ label, at: Date.now(), workflow: 'Bot' })));
  soonRefresh();
}

function soonRefresh() {
  anyRunning = true;
  for (const t of [3000, 8000, 15000]) setTimeout(renderRuns, t);
}

$('#ctlRun')?.addEventListener('click', async () => {
  if (needToken('#ctlRunNote')) return;
  const mode = $('#ctlMode').value;
  const live = mode !== 'practice' && $('#ctlLive').checked;
  const pg = mode === 'practice' ? 0 : Math.max(0, Math.min(50, Number($('#ctlPg').value) || 0));
  if (live && !confirm(`Бот надсилатиме реальні транзакції з вашого акаунта (ходи у ваших іграх${pg ? `, до ${pg} входів у Proving Grounds з оплатою газу` : ''}). Продовжити?`)) return;
  const btn = $('#ctlRun');
  busy(btn, true);
  try {
    await dispatchBot(
      {
        mode,
        minutes: String(Math.max(5, Math.min(300, Number($('#ctlMinutes').value) || 40))),
        live: String(live),
        dungeon: $('#ctlDungeon').value,
        max_games: String(Math.max(1, Math.min(1000, Number($('#ctlMaxGames').value) || 50))),
        ronke_claim: String(mode !== 'practice' && $('#ctlRonkeBefore').checked),
        proving_grounds: String(pg),
      },
      `Свій запуск: ${mode}${live ? ' · реальні транзакції' : ''}${pg ? ` · Proving Grounds ×${pg}` : ''}`,
    );
    note('#ctlRunNote', `Запуск поставлено в чергу: ${esc(mode)}${live ? ' (live)' : ''}. Слідкуйте в блоці «Зараз».`, 'ok');
  } catch (e) {
    note('#ctlRunNote', `Не вдалося запустити: ${esc(e.message)}`, 'bad');
  } finally {
    busy(btn, false);
  }
});

// quick actions on the home tab
document.querySelectorAll('[data-step]').forEach((b) =>
  b.addEventListener('click', () => {
    const inp = $('#qaPgCount');
    inp.value = String(Math.max(1, Math.min(50, (Number(inp.value) || 1) + Number(b.dataset.step))));
  }),
);

const QUICK = {
  pg: () => {
    const n = Math.max(1, Math.min(50, Number($('#qaPgCount').value) || 5));
    return {
      confirm: `Зіграти ${n} ${n === 1 ? 'гру' : n < 5 ? 'гри' : 'ігор'} у Proving Grounds у mainnet? Це реальні транзакції з вашого акаунта (газ платить акаунт).`,
      inputs: { mode: 'mainnet', live: 'true', minutes: String(Math.min(300, 30 + n * 15)), max_games: String(n + 20), proving_grounds: String(n) },
      label: `Mainnet · Proving Grounds ×${n}`,
    };
  },
  mine: () => ({
    confirm: 'Дограти незавершені ігри на вашому акаунті (реальні транзакції)?',
    inputs: { mode: 'mainnet', live: 'true', minutes: '150', max_games: '50' },
    label: 'Mainnet · дограти мої ігри',
  }),
  ronke: () => ({
    confirm: 'Забрати сьогоднішні ігри Ronke Casino й одразу зіграти їх (реальні транзакції, газ оплачує lootsurvivor.io)?',
    inputs: { mode: 'mainnet', live: 'true', minutes: '120', max_games: '20', ronke_claim: 'true' },
    label: 'Ronke Casino · забрати й зіграти',
  }),
  practice: () => {
    const d = $('#qaDungeon').value;
    return { inputs: { mode: 'practice', minutes: '30', max_games: '200', dungeon: d }, label: `Тренування · ${d || 'Default'}` };
  },
};

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-quick]');
  if (!btn) return;
  if (needToken('#ctlRunNote')) return;
  const q = QUICK[btn.dataset.quick]();
  if (btn.dataset.quick === 'ronke') {
    // Ronke games belong to the Game Account of the Ronin wallet: without its session the bot plays Cartridge
    const ga = await secretInfo('GAME_SESSION_LINK').catch(() => null);
    if (!ga) {
      note(
        '#ctlRunNote',
        'Ігри Ronke лежать на вашому <b>Game Account</b> (акаунт Ronin‑гаманця), а бот зараз підключений лише до Cartridge і їх не бачить. Спершу: <a href="#accounts" data-goto="accounts">🔑 Акаунти</a> → «EVM‑гаманець» → <b>Створити сесію гаманцем</b> (той самий Ronin‑гаманець, що на lootsurvivor.io), потім знову натисніть «Забрати й зіграти».',
        'warn',
      );
      return;
    }
  }
  if (q.confirm && !confirm(q.confirm)) return;
  busy(btn, true);
  try {
    await dispatchBot(q.inputs, q.label);
    note('#ctlRunNote', `▶ «${esc(q.label)}» запущено. Прогрес — у блоці «Зараз» нижче.`, 'ok');
    $('#monitor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    note('#ctlRunNote', `Не вдалося запустити: ${esc(err.message)}`, 'bad');
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
    safe(() => localStorage.setItem(LS + 'lastLaunch', JSON.stringify({ label: 'Навчання стратегії', at: Date.now(), workflow: 'Learn' })));
    note('#ctlRunNote', 'Навчання поставлено в чергу (лідерборд, білди лідерів, тюнінг політики).', 'ok');
    soonRefresh();
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
    const runs = (r.workflow_runs ?? []).filter((x) => !['CI', 'Pages', 'pages-build-deployment'].includes(x.name));
    anyRunning = runs.some((x) => x.status !== 'completed');
    renderMonitor(runs).catch(() => {});
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

// ------------------------------------------------------------------ live monitor ("Зараз")
const WF_LABEL = { Bot: 'Гра бота', Learn: 'Навчання', Task: 'Службове завдання' };
const STEP_LABEL = {
  'Discover live contracts and dungeons': 'Перевірка контрактів',
  'Practice dungeon': 'Тренування',
  'Ronke Casino daily games': 'Ronke Casino',
  Mainnet: 'Ігри в mainnet',
  'Leaderboard snapshot': 'Лідерборд',
  Summaries: 'Підсумки',
  'Push data': 'Збереження даних',
};
function stepName(n) {
  return STEP_LABEL[n] ?? n.replace(/^Run /, '');
}

async function renderMonitor(runs) {
  const host = $('#monitor');
  if (!host) return;
  const run = runs.find((x) => x.status !== 'completed') ?? runs[0];
  if (!run) {
    host.innerHTML = '<p class="muted">Ще нічого не запускалось. Оберіть дію вище.</p>';
    return;
  }
  const launch = safe(() => JSON.parse(localStorage.getItem(LS + 'lastLaunch') ?? 'null'));
  const created = new Date(run.created_at).getTime();
  const label = launch && launch.workflow === run.name && Math.abs(created - launch.at) < 120_000 ? launch.label : `${WF_LABEL[run.name] ?? run.name}${run.event === 'schedule' ? ' · за розкладом' : ''}`;
  const running = run.status !== 'completed';
  // app.js hides the previous run's live status until this run pushes its own (scripts/live-push.sh, every minute)
  window.botActiveRunStart = running && run.name === 'Bot' ? new Date(run.run_started_at ?? run.created_at).getTime() : null;
  const [stLabel, stCls] = STATUS[run.conclusion ?? run.status] ?? [run.conclusion ?? run.status, ''];
  let stepsHtml = '';
  let pct = running ? 5 : 100;
  if (token() && (running || Date.now() - new Date(run.updated_at).getTime() < 6 * 3600_000)) {
    try {
      const jobs = await gh(`/repos/${repo}/actions/runs/${run.id}/jobs`);
      const job = jobs.jobs?.find((j) => j.name === 'play' || j.name === 'task' || j.name === 'learn') ?? jobs.jobs?.[0];
      const steps = (job?.steps ?? []).filter((x) => !/^(Set up job|Complete job|Post |Run actions\/|Run npm ci|Run scripts\/data-branch|Remove session)/.test(x.name));
      const done = steps.filter((x) => x.status === 'completed').length;
      if (steps.length) pct = Math.max(pct, Math.round((done / steps.length) * 100));
      stepsHtml = `<ol class="steps">${steps
        .map((x) => {
          const icon = x.status === 'in_progress' ? '⏳' : x.status !== 'completed' ? '○' : x.conclusion === 'skipped' ? '–' : x.conclusion === 'success' ? '✓' : '✗';
          const cls = x.status === 'in_progress' ? 's-run' : x.conclusion === 'skipped' ? 's-skip' : x.conclusion === 'failure' ? 's-bad' : x.status === 'completed' ? 's-ok' : 's-wait';
          return `<li class="${cls}"><span class="step-icon">${icon}</span>${esc(stepName(x.name))}</li>`;
        })
        .join('')}</ol>`;
    } catch {
      /* jobs need the token */
    }
  }
  // results of the latest bot run (bot-data/runs.json)
  let result = '';
  if (run.name === 'Bot') {
    const d = await window.botData?.load('runs.json').catch(() => undefined);
    const list = Array.isArray(d) ? d : d?.runs ?? [];
    const since = new Date(run.run_started_at ?? run.created_at).getTime() - 60_000;
    const mine = list.filter((x) => new Date(x.started).getTime() >= since);
    if (mine.length) {
      result = `<div class="mon-results">${mine
        .map(
          (x) => `<div class="mon-result"><span class="badge ${x.mode.startsWith('mainnet') ? 'run' : 'muted'}">${esc(x.mode === 'mainnet' ? 'Mainnet' : x.mode === 'mainnet-dry' ? 'Mainnet (dry run)' : 'Тренування')}</span>
            <b>${x.games}</b> ігор · найкраща <b>${x.bestXp}</b> XP · середня ${x.meanXp}${x.errors ? ` · <span class="bad">${x.errors} помилок</span>` : ''}${x.ended ? '' : ' · <span class="run">триває</span>'}
            ${x.ended && x.games === 0 && x.mode.startsWith('mainnet') ? '<span class="muted small">— на акаунті бота не знайшлося незіграних ігор (ігри Ronke потребують сесії Game Account; для нових ігор — Proving Grounds)</span>' : ''}</div>`,
        )
        .join('')}</div>`;
    } else if (running) result = '<p class="muted small">Результати з’являться після першої зіграної гри.</p>';
  }
  host.innerHTML = `
    <div class="mon-head">
      <div><div class="mon-title">${esc(label)}</div>
        <div class="muted small">${new Date(run.run_started_at ?? run.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })} · ${duration(run)}</div></div>
      <div class="mon-side"><span class="badge ${stCls}">${esc(stLabel)}</span>
        ${running && token() ? `<button class="btn small" data-cancel="${run.id}">Зупинити</button>` : ''}
        <a class="btn small" href="${esc(run.html_url)}" target="_blank" rel="noopener">Лог</a></div>
    </div>
    <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="pbar ${running ? 'b-running' : `b-${stCls}`}" style="width:${pct}%"></div></div>
    ${stepsHtml}${result}`;
  $('#monUpdated').textContent = running ? 'оновлюється автоматично' : '';
}

$('#monitor')?.addEventListener('click', async (e) => {
  const id = e.target.closest('[data-cancel]')?.dataset.cancel;
  if (!id || !confirm('Зупинити цей запуск?')) return;
  try {
    await gh(`/repos/${repo}/actions/runs/${id}/cancel`, { method: 'POST' });
    setTimeout(renderRuns, 3000);
  } catch (err) {
    note('#ctlRunNote', `Не вдалося зупинити: ${esc(err.message)}`, 'bad');
  }
});

// ------------------------------------------------------------------ readiness checklist
async function renderChecklist() {
  const host = $('#checklist');
  if (!host) return;
  const item = (ok, title, detail, action) =>
    `<div class="check ${ok === true ? 'c-ok' : ok === false ? 'c-bad' : 'c-warn'}"><span class="check-icon">${ok === true ? '✓' : ok === false ? '!' : '•'}</span>
      <div><b>${title}</b><div class="muted small">${detail}</div></div>${action ?? ''}</div>`;
  if (!token()) {
    host.innerHTML =
      item(false, 'GitHub‑токен', 'Потрібен, щоб сайт міг запускати бота.', '<a class="btn small primary" href="#accounts" data-goto="accounts">Додати</a>') +
      item(null, 'Акаунт гри', 'Після токена підключіть Cartridge або EVM‑гаманець.', '') +
      item(null, 'Розклад', 'Бот може грати сам кожні 3 години.', '');
    $('#tabAccountsDot').hidden = false;
    return;
  }
  try {
    const [vars, cart, ga] = await Promise.all([variables(), secretInfo('CARTRIDGE_SESSION_B64'), secretInfo('GAME_SESSION_LINK')]);
    const now = Date.now();
    const cExp = Number(vars.CARTRIDGE_SESSION_EXPIRES?.value ?? 0) * 1000;
    const gExp = Number(vars.GAME_SESSION_EXPIRES?.value ?? 0) * 1000;
    const cOk = !!cart && (!cExp || cExp > now);
    const gOk = !!ga && (!gExp || gExp > now);
    const acct = gOk ? `Game Account ${short(vars.GAME_ACCOUNT_ADDRESS?.value ?? '')}` : cOk ? `Cartridge ${vars.CARTRIDGE_USERNAME?.value ?? short(vars.MAINNET_ACCOUNT_ADDRESS?.value ?? '')}` : '';
    const exp = gOk ? gExp : cExp;
    const soon = exp && exp - now < 7 * 86400_000;
    const sched = vars.MAINNET_ENABLED?.value === 'true';
    const live = vars.MAINNET_LIVE?.value === 'true';
    const pg = Number(vars.PROVING_GROUNDS_GAMES?.value ?? 0);
    host.innerHTML =
      item(true, 'GitHub‑токен', 'Збережено в цьому браузері.') +
      item(
        cOk || gOk ? (soon ? null : true) : false,
        'Акаунт гри',
        cOk || gOk ? `${esc(acct)}${exp ? ` · сесія до ${new Date(exp).toLocaleDateString('uk-UA')}${soon ? ' — скоро закінчиться' : ''}` : ''}` : 'Не підключено (або сесія закінчилась) — mainnet‑ігри недоступні.',
        cOk || gOk ? (soon ? '<a class="btn small" href="#accounts" data-goto="accounts">Оновити</a>' : '') : '<a class="btn small primary" href="#accounts" data-goto="accounts">Підключити</a>',
      ) +
      item(
        sched && live ? true : null,
        'Розклад',
        sched ? `Mainnet кожні 3 год${live ? '' : ' (dry run — без транзакцій)'}${pg ? ` · Proving Grounds ×${pg}` : ''}` : 'Вимкнено: бот грає mainnet лише коли ви запускаєте вручну.',
        '<a class="btn small" href="#schedule" data-goto="schedule">Налаштувати</a>',
      );
    $('#tabAccountsDot').hidden = cOk || gOk;
  } catch (e) {
    host.innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}

// ------------------------------------------------------------------ main
async function renderAll() {
  await renderAccess();
  await Promise.all([renderWallet(), renderGameAccount(), renderRonke(), renderControls(), renderRuns(), renderChecklist()]);
  window.dispatchEvent(new Event('bot:refresh'));
}

await finishWallet();
await renderAll();
// poll runs: every 20 s while something runs, otherwise every 90 s (unauthenticated API: 60 requests/hour)
let last = Date.now();
setInterval(() => {
  const every = anyRunning ? 12_000 : token() ? 60_000 : 90_000;
  if (Date.now() - last >= every && !document.hidden) {
    last = Date.now();
    renderRuns();
    if (anyRunning) window.dispatchEvent(new Event('bot:refresh'));
  }
}, 5_000);
