# Loot Survivor Bot

Автономний бот для **Loot Survivor 2 (Death Mountain, Starknet)**. Мета: топ‑1 лідерборду mainnet. Бот грає
безкоштовне practice‑підземелля і (коли ви дозволите) ваші mainnet‑ігри через **ваш власний акаунт Cartridge
Controller**. Він навчається в симуляціях і на білдах лідерів, а прогрес видно на сайті (GitHub Pages).

> Чесно про гарантії: бот приймає рішення за точною моделлю ймовірностей гри, але результат кожної гри
> визначає VRF‑випадковість. Топ‑1 — мета, а не гарантія. Кожну зміну стратегії бот спершу перевіряє на тисячах
> симульованих ігор.

## Як він думає

| Шар | Що робить | Файли |
|---|---|---|
| Рушій | Точний порт правил контракту Death Mountain (бій, крити, засідки, перешкоди, ринок, рівні, предмети) з тестами на векторах із Cairo | `src/game/` |
| Модель | Точні розподіли шкоди, шанси втечі/засідки/ухилення, ризик миттєвої смерті при дослідженні | `src/ai/model.ts` |
| Бій | Динамічне програмування «атакувати / тікати» до кінця бою з урахуванням цінності продовження гри | `src/ai/battle.ts` |
| Політика | Розподіл статів (CHA→DEX рано, VIT/STR пізніше), покупки, зілля, заміна спорядження, `explore till beast` при малому ризику | `src/ai/policy.ts` |
| Навчання | CMA‑ES на всіх ядрах CPU + value learning; білд топ‑гравців як кандидат; value‑мережа на GPU | `src/learn/`, `trainer/` |
| Ланцюг | Читання стану з контракту, calldata з живого ABI, VRF‑запит перед кожною випадковою дією, practice‑burner, Cartridge session | `src/chain/` |
| Раннер | Цикл «стан → рішення → транзакції → журнал», дані для сайту | `src/runner/` |
| Сайт | Дашборд: поточна гра, рішення з поясненнями, прогрес до топ‑1, навчання, лідерборд, білди лідерів, живі контракти | `site/` |

Кожне рішення бот пояснює текстом (наприклад, `Attack: P(win)=92%, P(death)=1.2%; attack value 171 vs flee 140`) —
ці пояснення видно на сайті й у журналах ігор.

## Швидкий старт (локально)

Потрібно: Node.js 22+, git. Для GPU‑навчання: Python 3.10+ і PyTorch з CUDA.

```bash
npm ci
npm test                         # тести рушія і кодування транзакцій
npm run sim -- --seed 5          # одна симульована гра з поясненнями кожного рішення
npm run bench -- --games 1000    # якість поточної політики (середній XP, p90, max)
npm run tune -- --generations 30 --games 300     # покращити політику (CMA-ES, всі ядра)
npm run play -- --mode practice --minutes 30     # грати безкоштовне practice-підземелля on-chain
npm run play -- --mode sim --max-games 50        # симуляція з тим самим записом даних, що й онлайн
```

Локальний сайт: після `play` дані лежать у `site/data/`; відкрийте `site/` будь‑яким статичним сервером
(`npx serve site` або `python -m http.server -d site`).

### Локальне навчання на відеокарті (RTX 3060 тощо)

```bash
python -m venv trainer/.venv
trainer/.venv/Scripts/activate            # Windows (Linux/macOS: source trainer/.venv/bin/activate)
pip install torch --index-url https://download.pytorch.org/whl/cu124
pip install numpy
npm run local -- --rounds 3 --games 6000 --python trainer/.venv/Scripts/python
```

Цикл `local`: самогра поточною політикою (усі ядра CPU) → тренування value‑мережі на GPU → A/B‑порівняння на
однакових сидах (таблиця vs мережа) → мережа приймається лише при виграші ≥2% → тюнінг CMA‑ES. Результат —
файли `policy/policy.json` і `policy/value-net.json`. Закомітьте їх, і онлайн‑бот гратиме новою політикою.

### Practice у будь‑якому підземеллі (рушій сайту)

Кнопка «Practice» на lootsurvivor.io більше не використовує окремий блокчейн‑слот: гра йде **прямо в браузері**
на клієнтському рушії V2 з налаштуваннями підземелля (`settings_id`). Бот робить те саме: завантажує свіжий
JS‑бандл сайту, запускає його рушій у Node (емуляція браузера happy-dom, мережу вимкнено) і грає ним, приймаючи
рішення своєю політикою. Налаштування підземелля читаються з ігрового ядра V2 у mainnet.

```bash
npm run play -- --mode practice --dungeon ronke --max-games 50     # Ronke Casino («Ronkeverse Large», #7)
npm run play -- --mode practice --settings-id 6                     # Ronkeverse Medium
npm run play -- --mode practice                                     # Default (#0)
npm run bot -- dungeon-settings --ids 0,1,2,3,4,5,6,7               # переглянути налаштування підземель
```

Відомі підземелля — `DUNGEON_SETTINGS` у `src/chain/config.ts` (ronke: 7/6/5/4, beastmode: 2, lootbag: 1, …).
На GitHub: Actions → Bot → Run workflow → `mode=practice`, `dungeon=ronke`.

## Запуск на GitHub

1. **Actions**: Settings → Actions → General → Workflow permissions → *Read and write permissions*.
2. **Pages**: Settings → Pages → Source: *GitHub Actions*. Сайт з’явиться після першого запуску workflow
   (`Bot`, `Learn` або `Pages`).
3. Workflows:
   - `CI` — типи, тести, швидкий бенчмарк на кожен push.
   - `Bot` — кожні 3 години: practice (40 хв), mainnet (якщо увімкнено), знімок лідерборду, публікація сайту.
     Вручну: Actions → Bot → *Run workflow* (режим `practice | mainnet | both`, хвилини, `live`).
   - `Learn` — щодня: звірка живих контрактів і підземель з lootsurvivor.io, лідерборд, аналіз білдів лідерів,
     тюнінг політики й коміт покращеної `policy/policy.json`.
   - `Pages` — збирає сайт із гілки `bot-data` (туди бот складає всі журнали, щоб не засмічувати історію коду).

Для приватного репозиторію хвилини Actions обмежені тарифом (у безкоштовному — 2000 хв/міс); тоді зменште
`PRACTICE_MINUTES` / `MAINNET_MINUTES` або розклад. Для публічного репозиторію хвилини не лімітовані.

## Mainnet через ваш акаунт Cartridge

Бот грає **вашим** Controller‑акаунтом через session key. Сесія має мінімальні права: лише `commit_actions`
(ходи) і `verify_game` (зарахування результату) на ігровому ядрі V2 — жодних переказів, покупок чи інших
контрактів. Головний ключ акаунта нікуди не передається; сесія має термін дії.

### Протокол V2 (commit-reveal)

Нинішні підземелля lootsurvivor.io (Ronke Casino, Beast Mode, Loot Bag, …) працюють на ядрі V2
`0x011afdf…183b`: ходи кодуються в 16‑бітні інструкції (до 15 у пакеті), комітяться через `commit_actions`,
результат визначає хеш блоку коміту, стан читається через `replay_transcript`, а після смерті гра
фіналізується `verify_game` (інакше score = 0). Бот реалізує цей протокол (`src/v2/`) і звіряє його з кодом сайту
(`scripts/v2-protocol-check.ts`) та з живими іграми (`npm run bot -- v2-inspect`). Бот грає **ігри (токени), які вже є
на вашому акаунті** — отримайте/купіть їх на сайті (квиток Beast Mode, безкоштовні ігри Ronke для власників тощо).
Перевірити рішення на будь‑якій грі без транзакцій: `npm run play -- --mode mainnet --game <id>`.

1. На своєму комп’ютері (потрібен браузер):
   ```bash
   npm run authorize
   ```
   Відкриється Cartridge → увійдіть і підтвердіть сесію. Файл сесії з’явиться в `.session/cartridge/session.json`
   (у git не потрапляє).
2. Збережіть його як секрет репозиторію `CARTRIDGE_SESSION_B64` (команда друкується після authorize), наприклад:
   ```bash
   base64 -w0 .session/cartridge/session.json | gh secret set CARTRIDGE_SESSION_B64
   ```
3. Змінні репозиторію (Settings → Secrets and variables → Actions → Variables):
   - `MAINNET_ACCOUNT_ADDRESS` — адреса вашого Controller (для лідерборду/підсвітки на сайті);
   - `MAINNET_ENABLED=true` — запускати mainnet‑крок за розкладом;
   - `MAINNET_LIVE=true` — **реально** надсилати транзакції. Без цього бот працює в *dry run*: читає ваші ігри,
     вирішує й пише рішення на сайт, нічого не відправляючи. Почніть із dry run і подивіться рішення.
4. Купіть/отримайте ігри (квитки підземелля) в інтерфейсі lootsurvivor.io. Бот бере **незавершені** ігри вашого
   акаунта (через індексатор Denshokan) — і нові, і розпочаті — та грає їх до кінця. Незакінчена за запуск гра
   продовжується наступним запуском.
5. Коли сесія спливе, бот напише про це в журналі/на сайті — повторіть `npm run authorize` і оновіть секрет.

### Звірка з живим сайтом і контрактами

`npm run discover` (і щоденний `Learn`) читає ABI всіх відомих контрактів mainnet і practice‑слота, сканує
бандл lootsurvivor.io на адреси, слоти й назви підземель і показує розбіжності з `src/chain/config.ts` на сайті
(блок «Живі контракти та підземелля»). Calldata будується з **живого** ABI, а адреси перевизначаються змінними
середовища (`GAME_CORE_ADDRESS`, `PRACTICE_GAME_SYSTEMS`, `VRF_CALLER`, … — див. `src/chain/config.ts`), тож
передеплой контрактів не ламає бота.

## Навчання на лідерах

`npm run learn` бере топ‑ігри з лідерборду Denshokan, читає їхній стан on-chain (стати, спорядження, золото,
рівень) і рахує, як лідери розподіляють стати на рівень у ранній і пізній грі, скільки слотів броні заповнюють,
які тири та зброю носять. Ці дані з’являються на сайті, а тюнер пробує «білд лідерів» як кандидата: якщо в
симуляціях він кращий за поточну політику — бот його переймає, якщо ні — лишається при своєму.

## Безпека

- Приватні ключі ніколи не потрапляють у код, журнали чи LLM; `.session/`, `secrets/`, `*.key`, `.env` у `.gitignore`.
- Mainnet‑транзакції — лише з явним `MAINNET_LIVE=true`; без нього dry run.
- Session key обмежений пресетом Cartridge і має термін дії; practice використовує одноразовий burner без цінності.
- Workflow видаляє файл сесії після запуску.

## Структура

```
src/game/      рушій (порт контракту) + тести в tests/
src/ai/        модель, бій (DP), політика, параметри, value-мережа (inference)
src/learn/     CMA-ES, пул воркерів, тюнер
src/chain/     RPC, ABI, декодування стану, клієнт гри, practice/mainnet, Denshokan
src/runner/    ігровий цикл і сховище даних для сайту
src/commands/  CLI-команди (play, learn, leaderboard, discover, dataset, local, site, sim/bench)
trainer/       PyTorch-тренер value-мережі (GPU)
site/          дашборд (GitHub Pages)
policy/        поточна політика (policy.json), білд лідерів (insights.json), value-мережа
.github/       CI, Bot, Learn, Pages
```
