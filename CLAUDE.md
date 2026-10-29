# Trackerrr – poznámky pro Clauda

**Trackerrr** – osobní PWA na pití, suplementy a recenze jídla. Celá v **češtině**, majitel je Honza. Rodina appek jendovyapky
(Mraq, Phasmapp, Qamera, Klapqa…) → písmo Geist / Geist Mono / Doto, tečkové robotí oči, zrnité tmavé pozadí.

- Repo `jendovyapky/tracker`, živě na GitHub Pages https://jendovyapky.github.io/tracker/ (push do `main` = nasazení).
- Verze 2 (10/2026) přepsaná z původní jednosouborové verze od Gemini. Logo `icons/logo.png` (ručně psané „Trackerrr“) Honza chce zachovat – je v úvodu a v nastavení. Ikona appky = kapka s tečkovýma očima.

## Soubory
- `index.html` – kostra (hlavička, 5 obrazovek, dok, toast, vysouvací okno)
- `app.js` – veškerá logika bez frameworku. Obrazovky se kreslí funkcemi `render*()`, kliky jdou přes `data-act` → objekt `ACT`.
- `style.css`, `sw.js` (po větší změně zvýšit `VERSION`), `manifest.webmanifest`, `icons/`

## Data – pozor, ať se neztratí
- localStorage klíče **zůstávají ze staré verze**: `trackerrr_state_v10` (dny) a `trackerrr_config_v10` (nastavení). Formát je nadmnožina starého
  (den = `{ water, waterLogs[{id,amount,type,time}], vitamins{id:[timestamp]}, food[{id,category,name,emoji,stars,time,place,detail,edited}] }`).
- Mazání = id/timestamp do `deletedLogs` (náhrobky), slučování (`merge`) = sjednocení podle id minus náhrobky; upravené jídlo vyhrává podle `edited`.
- Nastavení, které se synchronizuje (cíl, nápoje, suplementy), je ve stavu pod `_settings` s `updatedAt` – vyhrává novější.
- **Soukromý cloud** (od 2.1): Cloudflare Worker `trackerrr-sync` ve složce `sync/` (https://trackerrr-sync.jendovyapky.workers.dev/data, nasazení `cd sync && npx wrangler deploy`, účet Jendovyapky).
  Přístup jen 24znakovým náhodným klíčem (`config.cloudKey`, ~120 bitů) v hlavičce `Authorization: Bearer` – nikdy v URL. Durable Object `Vault` podle SHA-256 otisku klíče, každý den = vlastní klíč v úložišti (`d:YYYY-MM-DD`), `meta` = náhrobky + `_settings`.
  POST = server spojí a vrátí všechno, GET = přečíst, DELETE = smazat. CORS jen pro tracker.jendovyapky.eu, *.pages.dev projektu, jendovyapky.github.io a localhost. `mergeDay()` ve workeru musí zůstat stejný jako `merge()` v app.js.
  Další zařízení se připojí odkazem `#klic=…` (fragment se na server neposílá) nebo vepsáním klíče. Klíč se nedává do exportu.
- **Starý Google cloud je nebezpečný** (adresa skriptu je ve veřejné historii repa a GET vrací data všech místností). Appka ho umí jen jednorázově přenést (`migrateLegacy`) a místnost tam přepsat prázdnými daty. Nepoužívat na nic dalšího.
- Upozornění chodí jen při otevřené / uspané appce (žádný push server).

## Pravidla
- Nikdy nesahat na nic, co souvisí se studiem (studiodepo.cz, DEPO). Platby, hesla a API klíče zadává Honza sám.
- Nic se nesmí překrývat – testovat šířky 320 / 375 / 430 px. Zablokované přibližování stránky.
