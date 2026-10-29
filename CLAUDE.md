# Trackerrr – poznámky pro Clauda

**Trackerrr** – osobní PWA na pití, suplementy a recenze jídla. Celá v **češtině**, majitel je Honza. Rodina appek jendovyapky
(Mraq, Phasmapp, Qamera, Klapqa…) → písmo Geist / Geist Mono / Doto, tečkové robotí oči, zrnité tmavé pozadí.

- Repo `jendovyapky/tracker`. Živě: Cloudflare Worker se statickými soubory `trackerrr` → https://trackerrr.jendovyapky.workers.dev (cíl: https://tracker.jendovyapky.eu).
  Nasazení z kořene repa `npx wrangler deploy` (účet Jendovyapky). Co se nenahrává (git, poznámky, sync/), je v `.assetsignore` – **při přidání souboru, který nemá být veřejný, ho tam dopsat**.
- Stará adresa GitHub Pages (jendovyapky.github.io/tracker) jen smaže stará data trackeru v prohlížeči a přesměruje na novou adresu (inline skript v `<head>` index.html).
- Verze 2 (10/2026) přepsaná z původní jednosouborové verze od Gemini. Logo `icons/logo.png` (ručně psané „Trackerrr“) Honza chce zachovat – je v úvodu a v nastavení. Ikona appky = kapka s tečkovýma očima.

## Soubory
- `index.html` – kostra (hlavička, 5 obrazovek, dok, toast, vysouvací okno)
- `app.js` – veškerá logika bez frameworku. Obrazovky se kreslí funkcemi `render*()`, kliky jdou přes `data-act` → objekt `ACT`.
- `style.css`, `sw.js` (po větší změně zvýšit `VERSION`; přijímá i push), `manifest.webmanifest`, `icons/`
- Pohyb: žádné prolínání dvou obrazovek přes sebe a žádný animovaný `blur` (na iPhonu dělal „ghosting“) – jen transform + opacity. Okraje u lišt = postupné rozmazání (`.edge`). Stavový řádek `black-translucent` (appka sahá pod výřez), při změně meta tagů appku smazat z plochy a přidat znovu.

## Data – pozor, ať se neztratí
- localStorage klíče **zůstávají ze staré verze**: `trackerrr_state_v10` (dny) a `trackerrr_config_v10` (nastavení). Formát je nadmnožina starého
  (den = `{ water, waterLogs[{id,amount,type,time}], vitamins{id:[timestamp]}, food[{id,category,name,emoji,stars,time,place,detail,edited}] }`).
- Mazání = id/timestamp do `deletedLogs` (náhrobky), slučování (`merge`) = sjednocení podle id minus náhrobky; upravené jídlo vyhrává podle `edited`.
- Nastavení, které se synchronizuje (cíl, nápoje, suplementy), je ve stavu pod `_settings` s `updatedAt` – vyhrává novější.
- **Soukromý cloud** (od 2.1): Cloudflare Worker `trackerrr-sync` ve složce `sync/` (https://trackerrr-sync.jendovyapky.workers.dev/data, nasazení `cd sync && npx wrangler deploy`, účet Jendovyapky).
  Přístup jen 24znakovým náhodným klíčem (`config.cloudKey`, ~120 bitů) v hlavičce `Authorization: Bearer` – nikdy v URL. Durable Object `Vault` podle SHA-256 otisku klíče, každý den = vlastní klíč v úložišti (`d:YYYY-MM-DD`), `meta` = náhrobky + `_settings`.
  POST = server spojí a vrátí všechno, GET = přečíst, DELETE = smazat. CORS jen pro tracker.jendovyapky.eu, trackerrr.jendovyapky.workers.dev, *.pages.dev a localhost. `mergeDay()` ve workeru musí zůstat stejný jako `merge()` v app.js.
  Další zařízení se připojí odkazem `#klic=…` (fragment se na server neposílá) nebo vepsáním klíče. Klíč se nedává do exportu.
- Starý Google Apps Script cloud se už nepoužívá (adresa byla ve veřejném repu a vracela data všech místností). Data se nepřenášela – Honza začal od nuly (10/2026).
- **Upozornění (Web Push)** posílá stejný Worker `trackerrr-sync`: cron každých 15 min (`runChecks` → `Vault.check`), noční klid 22–7, pití podle tempa (7:00 → 0 %, 21:00 → 100 % cíle, pozadu ≥ 250 ml), suplementy 15 min po naplánovaném čase, opakování po `interval` (1/2/3 h). Potřebuje zapnutý cloud a `_settings` v datech (cíl, suplementy).
  Telefon se přihlásí `/push/subscribe` (Authorization = klíč cloudu), VAPID klíče a seznam otisků s telefony drží Durable Object `Registry` – **nemazat**, jinak přestanou chodit upozornění. VAPID/aes128gcm kód je převzatý z `mraq-push` (repo pocasi).
  Na iPhonu jen v appce přidané na plochu (iOS 16.4+).

## Pravidla
- Nikdy nesahat na nic, co souvisí se studiem (studiodepo.cz, DEPO). Platby, hesla a API klíče zadává Honza sám.
- Nic se nesmí překrývat – testovat šířky 320 / 375 / 430 px. Zablokované přibližování stránky.
