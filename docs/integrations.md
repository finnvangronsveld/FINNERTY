# Integraties en bewijsstatus

Documentatie gecontroleerd op 13 september 2026; geen echte credentials gebruikt. Alle huidige providerfixtures zijn zelfgemaakte testdata, geen geanonimiseerde echte respons.

## Twitch

- [Embeddocumentatie](https://dev.twitch.tv/docs/embed/video-and-clips/): minimum 400 px breed en 300 px hoog, juiste parenthost, bedieningsruimte buiten video. Implementatie gebruikt officiële SDK; live mediapad nog onbewezen.
- [OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/): server-side codeflow. Geen e-mailscope. Callback `/api/auth/callback/twitch`. Identity uit gevalideerd token + Get Users.
- [Tokenvalidatie](https://dev.twitch.tv/docs/authentication/validate-tokens/): start- en periodieke validatie voorbereid met 55 minuten marge; [refresh](https://dev.twitch.tv/docs/authentication/refresh-tokens/) onder DB-lock.
- [Get Streams / Get Users](https://dev.twitch.tv/docs/api/reference/): schema's gevalideerd aan de servergrens. Gedeelde DB-cache; fouten wissen de laatste bevestigde livestatus niet.
- [EventSub-webhooks](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/): raw-body signature, freshness, challenge, kanaalcontrole en deduplicatie. Verkeerde volgorde veroorzaakt een actuele statushercontrole. Revocation wordt vastgelegd en monitoring moet herabonneren signaleren; abonnementprovisioning nog niet gebouwd/uitgevoerd.
- [oauth4webapi](https://github.com/panva/oauth4webapi): onderhouden OAuth-primitieven. PKCE wordt meegestuurd; echte Twitch-compatibiliteit moet de smoketest bevestigen.

**Getest:** statefouten, providerweigering, mockcodewisseling, unique identity, naamswijziging, encryptie/AAD, refreshconcurrentie, intrekking, HMAC en stale-cachegedrag. Geen echte OAuth-grant, Twitch-player, chatlogin, EventSub-delivery of providerquota getest.

## StreamElements — uitsluitend kijktijd

[OpenAPI](https://raw.githubusercontent.com/StreamElements/api-docs/main/api.yaml) bevat `GET /channels/me` en gepagineerd `GET /points/{channel}/watchtime` met limit/offset. Het kijktijdresponsmodel is leeg/onvoldoende voor een bewezen parser. [JWT-toegang](https://github.com/StreamElements/api-docs/blob/main/docs/Personal%20Access.md) is server-side Bearer-authenticatie.

`streamElementsReadOnly` heeft alleen twee GET-methoden. Er zijn geen puntenmutaties. Het eigen contract heeft onder meer `providerAccountKey`, `twitchUserId`, `providerUsername`, `watchtimeSeconds` (bigint) en `observedAt`; dit zijn **onze velden**.

### Contractproef uitgevoerd — 22 september 2026 (read-only, echte account)

- `/channels/me`: `_id` = `STREAMELEMENTS_CHANNEL_ID`, `provider: twitch`, `providerId` = broadcaster-ID 442232328, `username: finnerty_`. Kanaalidentiteit bewezen; de sync controleert dit bij elke run opnieuw en stopt bij een afwijking.
- `/points/{channel}/watchtime?limit&offset`: `{ _total, users: [{ username, minutes }] }`, aflopend gesorteerd op minuten, cumulatief. Eenheid **minuten** (veldnaam, en gelijk aan `watchtime` in `/points/{channel}/{user}`). `limit` tot 100 werkt; pagina's overlappen niet; voorbij het einde is `users` **null**. Geen Twitch-ID: sleutel = gebruikersnaam.
- De lijst is publiek: een ongeldige token krijgt ook 200. De JWT is alleen nodig voor `/channels/me`.
- Echte data (4.111 rijen) bevatte één rij met lege gebruikersnaam; zulke rijen worden overgeslagen (tellen wel mee voor paginering). Andere afwijkingen (structuur, niet-gehele minuten) stoppen de run: `STREAMELEMENTS_RESPONSE_CHANGED`.
- Lokale droogloop tegen de echte API met een wegwerpdatabase: 4.110 kijkers, 43 requests, ~5 s.

### Syncworker (`src/server/watchtime/sync.ts`)

Draait in de onderhoudsroute, maximaal elke 10 minuten onder een DB-lease (`sync_jobs`, uniek per `kind`), met exponentiële backoff (2–60 min) bij fouten. Per run: kanaal verifiëren → eerste puntenregel aanmaken als die ontbreekt (`POINTS_PER_INTERVAL`/`POINTS_INTERVAL_SECONDS`, standaard 10 VP per 600 s, `current_month`) → elk Twitch-account koppelen aan de StreamElements-gebruikersnaam met dezelfde huidige login → alle kijkers scannen (bij verschuivende ranglijst de hoogste waarde houden) → maandijkpunten voor iedereen → `creditWatchtime` per gekoppeld account (fouten per account geïsoleerd). Naamswijzigingen pauzeren de koppeling (bestaand gedrag in `identity.ts`); een gerecyclede naam die al aan een ander account hangt, wordt niet gekoppeld.

### Echte read-only proef vóór aansluiting

1. Credentials in lokale secretconfiguratie/hostsecretmanager, niet in prompts of bestanden die gecommit worden.
2. Haal `/channels/me` op in een private serveromgeving en bevestig Twitch-platform, Twitch broadcaster-ID en StreamElements channel-ID. Die IDs zijn verschillende begrippen.
3. Lees een beperkte pagina kijktijd. Bepaal de exacte structuur, identifier, veldnaam en tijdseenheid. Vergelijk een bekende kijker met dashboard/watchtime-uitkomst.
4. Controleer tweede en volgende pagina's, lege resultaten, 401/404/429 en onvolledige scans. Een gemist record op een gedeeltelijke lijst is nooit nul.
5. Maak een minimaal opgeschoonde fixture en bewijs de conversie. Bouw pas daarna de echte parser en mappingproef; claims op historische usernames vragen aparte verificatie.
6. Verifieer trackinggedrag bij Twitch zelf, embed met/zonder chat en mobiel volgens de [loyalty-uitleg](https://support.streamelements.com/hc/en-us/articles/10474478470290-Loyalty-System-The-Complete-Guide-Setup-Leaderboard-Points). Kijktijdregistratie is geen onafhankelijk bewijs van iedere bekeken seconde.
7. Voeg centrale bounded syncjobs toe (start 5–10 minuten), met DB-leases, paginacursors, retries/backoff en mappingconflicten. Laat ook afwezige sitegebruikers inhalen.

Er is geen extra rewardbron via player-heartbeats. Kijktijd is StreamElements-registratie (chatlijst), geen onafhankelijk bewijs van iedere bekeken seconde.

**Maandinhaal bij eerste login (beslist 2026-09-22).** StreamElements levert kijktijd alleen als cumulatief totaal, zonder maand- of periodefilter (gecontroleerd in de OpenAPI: `period` bestaat alleen voor activities en sessions). De syncworker moet daarom voor **elke** kijker op elke pagina `recordMonthMark` aanroepen, ook zonder siteaccount, met dezelfde `provider`/`channelId`/`providerKey` als de latere `external_identities` (gebeurt in `syncWatchtime`). `creditWatchtime` krediteert bij de eerste waarneming van een account eenmalig het verschil met dat maandijkpunt. Een maand telt pas volledig als de sync vanaf het begin van die maand draait; daarvóór is er geen ijkpunt en geen inhaal.

## Database en hosting

Externe engine/verbinding en bestaande inhoud zijn nog onbekend. PostgreSQL-SQL is gegenereerd en lokaal toegepast via PGlite. Dit bewijst SQL/transaction semantics op één lokale engine, geen echte multi-connection productieconcurrentie. De pg-driver en gecontroleerde migratie-entrypoint zijn voorbereid. Geen externe migratie of publicatie uitgevoerd.
