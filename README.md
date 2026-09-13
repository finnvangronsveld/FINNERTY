# Finnertyverse — Frost Orbit

Een werkende lokale websitebasis voor Finnerty. The Vault blijft **Under construction**. Eigen Vault Points staan in een PostgreSQL-journaal; StreamElements levert uitsluitend kijktijd. Geen spel-, inzet-, koop-, transfer- of uitbetalingsfunctionaliteit.

## Lokaal starten

Node.js 24 en pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:3000**. Zonder configuratie start de ontwikkelserver in herkenbare lokale demomodus. `Demo-account` maakt een geïsoleerd fictief account met 80 demo-VP uit acht gecontroleerde kijktijddelta's. De 2 uur historische demokijktijd worden niet beloond. Linksonder kun je live/offline/onbekend en playerfouten testen.

De demo gebruikt PGlite (PostgreSQL WASM) in `.local/demo-postgres`. Herladen bewaart je account via een intrekbare HttpOnly-sessie van 24 uur. Na uitloggen maakt een volgende demo-login een nieuw fictief account; echte Twitch-login gebruikt de vaste Twitch-ID. Start maar één ontwikkelserver op deze demodatabase. Dit is geen productiedatabase.

## Controles

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# Terwijl pnpm dev draait:
pnpm exec playwright install chromium
pnpm test:browser
```

Op Windows kan een reeds geïnstalleerde Chrome worden gebruikt:

```powershell
$env:PLAYWRIGHT_CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node node_modules/@playwright/test/cli.js test
```

De browserflows bewaren screenshots in `docs/screenshots`. Database- en providertests gebruiken uitsluitend PGlite en gecontroleerde fixtures. Gelijktijdige aanroepen zijn getest; meerdere echte PostgreSQL-processen/verbindingen en echte provideraccounts nog niet.

## Echte configuratie

Voor hosting: volg [het Vercel-stappenplan](docs/deployment.md). De repository bevat een vaste installatiestap, Node 24, Frankfurt als functionregio en PostgreSQL-poolbeheer voor Vercel Fluid Compute. Een deployment bouwt zonder secrets; echte login en integraties vereisen de productieconfiguratie hieronder.

Kopieer `.env.example` naar `.env.local` en vul secrets alleen daar of in de secretmanager van de host in. Zet `APP_MODE=live` voor echte integraties. `APP_URL` moet exact het browserorigin zijn (scheme, host en poort). Productie vereist HTTPS en schakelt de demo altijd uit. Zonder geldige configuratie toont de site een onbekende status en weigert login; geen stille demoterugval.

- Registreer Twitch-callback: `APP_URL/api/auth/callback/twitch`. Geen e-mailscope gevraagd.
- Verifieer kanaallogin en broadcaster-ID; merknaam is geen bewijs van kanaalidentiteit.
- `AUTH_SECRET`: 32 cryptografisch willekeurige bytes als base64, gebruikt voor AES-256-GCM. Rotatie vraagt een expliciete migratie van versleutelde tokens.
- Bevestig PostgreSQL-engine, bestaande inhoud en backup vóór migratie. Migratie gebruikt de CLI-environment, niet automatisch `.env.local`. `pnpm db:migrate` vereist daarnaast `MIGRATION_REVIEWED=yes`. De applicatie migreert externe databases nooit bij opstarten.
- Plan `node scripts/run-maintenance.mjs` iedere minuut met de scheduler van de host, met `APP_URL` en `JOB_SECRET`. Het script bevat geen timer. Deze planning is voorbereid, niet extern geïnstalleerd.
- EventSub-webhook: `APP_URL/api/twitch/webhook`. Abonnementen zijn nog niet aangemaakt. HTTPS, domeinen en callbacks moeten echt worden getest.
- StreamElements-normalisatie en kijkbeloningen blijven **gesloten** tot de read-only integratieproef identiteit, eenheid en paginering bewijst. Een JWT invullen activeert geen toekenning.

## Opleverstatus

Fase A is lokaal gebouwd. Fase B heeft OAuth, sessies, tokenvalidatie/refresh, gedeelde streamcache, persistente playerhost en EventSub-code. Fase C heeft migraties, read-only transport, intern adaptercontract en geteste accounting. Fase D heeft de Vault-teaser, profielvoorkeuren, verwijderingsregistratie en afgeschermd basisbeheer. **Dit is nog geen afgeronde of gepubliceerde v1.**

Nog nodig: echte Twitch-smoketest, StreamElements-contractproef en mapping/syncworker, PostgreSQL-tests met onafhankelijke workers, beheer van mappingconflicten/regels, definitief verwijderings- en bewaarbeleid, scheduler/deployment, echte player-/autoplaytest en performance op een telefoon.

Zie [handoff](docs/handoff.md), [architectuur](docs/architecture.md), [integraties](docs/integrations.md), [product](docs/product.md) en [beslissingen](docs/decisions.md).
