# Technische basis

## Stack en modules

Next.js 16.3.5 App Router, React 19, TypeScript 6, Drizzle ORM 0.45, PostgreSQL-driver `pg`, Zod en `oauth4webapi`. PGlite uitsluitend voor lokale demo en tests. Eén applicatie, geen microservices. Node 22+; hier getest met Node 24.19.0. Versies zijn vergrendeld in `pnpm-lock.yaml`.

| Module                    | Grens en verantwoordelijkheid                                             |
| ------------------------- | ------------------------------------------------------------------------- |
| `src/lib`                 | Publieke contracten en merkcopy; geen secrets                             |
| `src/components`          | Responsive UI, rootprovider en permanente playerhost                      |
| `src/server/auth`         | OAuth, accountidentiteit, versleuteling, sessies, autorisatie             |
| `src/server/integrations` | Twitch-adapters, EventSub-verificatie, read-only StreamElements-transport |
| `src/server/points`       | Getransactioneerde accounting; uitsluitend genormaliseerde waarnemingen   |
| `src/server/vault`        | Vault-spellen, tempo onder walletlock, rondejournaal en leaderboards      |
| `src/server/db`           | Schema en server-only databaseverbinding                                  |
| `src/app/api`             | Gevalideerde HTTP-grenzen en private accountresponses                     |
| `scripts`                 | Gecontroleerde migratie en host-scheduler-ingang                          |

## Player

`SiteProvider → SiteShell → PersistentPlayer` staat in de rootlayout. Het element `player-host` verandert niet van ouder en heeft geen routesleutel. Een anker in home/stream geeft alleen geometrie door. Scroll/resize past positie en formaat aan; er zijn geen portals. De demo-iframe bewaart een unieke instance-ID en een lopende teller; browsertests vergelijken die over routewissels.

Bij desktopvideo: minimum 400 × 300, standaard dock 544 × 306 plus 44 px bediening erbuiten. Expanded gebruikt 16:9 waar dat boven de minima past. Op te smalle/lage schermen wordt de player verborgen/gepauzeerd en verschijnt een livebalk. Sluiten is expliciet en omkeerbaar. Footerlinks staan links en er is extra scrollruimte tijdens dockgebruik. Twitch-SDK-events sturen blocked/ready/playing-states. Dit pad is nog niet met echte Twitch-media getest.

## Identiteit en sessies

Uniek `(provider, provider_user_id)`. Eerste login wordt geserialiseerd met een PostgreSQL advisory transaction lock vóór accountcreatie. Profielnamen zijn metadata. Na wijziging van een login pauzeren bestaande externe mappings en wordt mappinghistorie toegevoegd.

OAuth-codewisseling met `oauth4webapi`, state + browsergebonden eenmalige DB-flow, PKCE S256, serverconfiguratie voor callback en vaste return-routeallowlist. Browsercookie is HttpOnly/SameSite=Lax; productie gebruikt Secure en `__Host-` voor sessies. Sessietokens zijn willekeurig; de database bewaart alleen SHA-256-hashes. Provideraccess-/refreshtokens staan in AES-256-GCM-enveloppen met identity-bound AAD.

Validation bij eerste gebruik per serverstart, bij login en na maximaal 55 minuten; onderhoudsjobs behandelen periodiek maximaal 25 achterstallige autorisaties. Refresh wordt binnen een row lock uitgevoerd en atomair opgeslagen. Bij ingetrokken autorisatie verdwijnen tokens en sessies. Bij netwerkfout worden geen nieuwe permissies aangenomen. Capaciteit/hosttijdslimieten voor grotere aantallen accounts moeten vóór productie worden afgestemd.

## Dataflow en punten

Twitch-identiteit → geverifieerde StreamElements-mapping (nog niet aangesloten) → bewezen genormaliseerde cumulatieve seconden → `creditWatchtime` → snapshot, checkpoint, remainder, ledger en wallet in één transactie. Walletrow-lock serialiseert credits en correcties. Unieke idempotency keys en SQL-checkconstraints vormen een tweede verdedigingslaag.

Er zijn tabellen voor users, authaccounts, sessions, streamstates, externalidentities, snapshots, checkpoints, wallets, ledger, point rules, syncjobs, processed events, audits, OAuth-flows, integrationcredentials en rate limits. Migraties staan onder `drizzle/`. Providerhistorie is beperkt tot relevante snapshots/mappinghistorie; definitieve cleanuptermijnen zijn nog vast te leggen.

## Status en jobs

Clients lezen alleen de gedeelde DB-streamcache (15 seconden HTTP-cache); geen externe Twitch-poll per bezoeker. De onderhoudsroute ververs­t rond elke minuut met advisory lock en exponentiële backoff. Mislukte calls behouden de laatste bevestigde status en markeren die verouderd. EventSub verifieert raw-body HMAC, timestamp en kanaal, dedupliceert IDs en plant een autoritatieve Get Streams-hercontrole. Zo overschrijft een oud offline-event geen nieuwe live-uitzending. Scheduler is herstelpad.

De scheduler van de gekozen host moet `scripts/run-maintenance.mjs` iedere minuut uitvoeren. Geen process-local timer als productiejobrunner. StreamElements-sync is bewust nog niet geïmplementeerd: er bestaat nog geen bewezen inputcontract.

## Beveiliging en releasegrenzen

Geheimen worden uitsluitend uit serverenvironment gelezen. Publieke config projecteert alleen merklabels, geverifieerde kanaallogin, embedhosts en Discord-link. Account/adminresponses zijn private/no-store. Mutaties controleren origin, sessie en waar nodig admin-ID, met beperkte bodygrootte en gedeelde DB-rate limits op login/profiel/correcties. Overige perimeterlimieten moeten bij de host ingesteld worden.

CSP beperkt scripts/frames tot self en Twitch en blokkeert objecten; dev heeft unsafe-eval nodig. Inline scripts/styles zijn momenteel toegestaan voor Next en CSS. Een nonce-CSP en productiecontrole op echte Twitch-requests blijven releasewerk, geen claim dat dit al volledig gehard is. Geen secrets of raw providerresponses naar clients.

Backups, restore-oefening, SQL-rollen, onafhankelijke PostgreSQL-workerconcurrentie, monitoring, alerting, definitieve retentie en deployment nog uit te voeren. `/api/health` is alleen liveness; het is geen bewijs van database-schrijfbaarheid. De beschermde `/api/admin/health` doet een write/delete-proef binnen één transactie en vergelijkt zowel saldo als totaal verdiend met het journaal. Deze route is nog niet met een echte beheerder op externe PostgreSQL beproefd. OAuth-callbackrequests zijn uitgesloten van Nexts ontwikkelrequestlog; de productieproxy moet eveneens codes en tokens uit logs houden.
