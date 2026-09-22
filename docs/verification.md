# Verificatie — lokale oplevering 13 september 2026

| Controle               | Uitkomst                      | Reikwijdte                                                                                       |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `tsc --noEmit`         | Geslaagd                      | Strikte TypeScript-controle                                                                      |
| ESLint                 | Geslaagd, geen waarschuwingen | Applicatie, tests en scripts                                                                     |
| `next build`           | Geslaagd                      | Geoptimaliseerde productiebundel                                                                 |
| 17 tests               | Geslaagd                      | PostgreSQL-semantiek in PGlite, accounting, OAuth/streamfixtures en EventSub-HMAC                |
| 4 Playwright-flows     | Geslaagd                      | Chrome op Windows, lokale demo                                                                   |
| 9 productiesmokechecks | Geslaagd                      | Lokale `next start` op 3001, geen externe configuratie                                           |
| Clientsecret-canaries  | Geslaagd                      | Testwaarden voor Twitch-secret en StreamElements-JWT niet in `.next/static` of geteste responses |
| Peer dependencies      | Geen conflicten               | ESLint 9/TypeScript 6 voor huidige Next-plugins                                                  |

Browserflows: vijf routes op 360, 390, 430, 768 en 1440 px zonder horizontale overflow; home/Vault-screenshots op 390/1440 visueel bekeken. Accountdemo ingelogd, meerdere journaalpagina’s met disjuncte IDs, voorkeur opgeslagen en na refresh behouden, CSRF afgewezen, admin geweigerd, HttpOnly-cookie en logoutrevocatie gecontroleerd. Playerdemo behield exact dezelfde iframe-instance-ID bij home → vault → account → stream, terug, scroll, resize, sluiten/heropenen en blocked/unavailable. Keyboard-skiplink, zichtbare focus en reduced-motion gecontroleerd.

Production smoke: home beschikbaar; account zonder sessie 401; admin en private health 403; demo-login en demoplayer 404; job zonder token 401; ongeconfigureerde webhook 503; streamstatus eerlijk unknown/unconfigured. Geen lokale demobediening in productie-HTML.

## Niet bewezen

- Echte Twitch-OAuth, SDK/audio/autoplay, parentdomeinen, mobiele embed en chat.
- Echte EventSub-delivery/challenge/revocation of extern geconfigureerde scheduler.
- StreamElements-identiteit, eenheid, schema, echte pagina’s, registratie bij embeds of werkende sync.
- PostgreSQL-races met meerdere fysieke verbindingen/werkers; PGlite draait op één engine.
- Werkelijke beheerrechten/correcties/health op een externe database.
- Performance op een fysieke middelmatige telefoon of trage verbinding; geen Lighthouse-score geclaimd.
- Volledige accessibility-audit, definitieve privacy/retentie en uitgevoerde verwijdering.

De tests tonen een controleerbare lokale basis. Ze zijn geen verklaring dat v1 of de externe integraties klaar zijn.

## The Vault — 22 september 2026

| Controle                      | Uitkomst | Reikwijdte                                                                                                    |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| 8 Vault-tests (PGlite)        | Geslaagd | Exacte RTP over alle uitkomsten per spel, ongeldige inzetten, ledger = saldo, tempo, parallel, idempotentie   |
| Leaderboard/maandvenster      | Geslaagd | Alleen opt-in, verwijderingsverzoeken uitgesloten, gedeelde rang, middernacht Europe/Brussels incl. zomertijd |
| Browserflow Vault             | Geslaagd | 8 snelle klikken → 1 request; directe API-burst van 5 → max. 1× 200, rest 429; CSRF 403; opt-in ranglijst     |
| Overflow 360/390/430/768/1440 | Geslaagd | Alle vier spellen, zonder horizontale scroll                                                                  |

Niet bewezen: tempo en walletlock met meerdere echte PostgreSQL-verbindingen (PGlite serialiseert), en animatieprestaties op een fysieke middelmatige telefoon.

## StreamElements-kijktijd — 22 september 2026

| Controle                   | Uitkomst | Reikwijdte                                                                                                   |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| Read-only contractproef    | Geslaagd | Echte account: kanaal-ID, provider, broadcaster-ID; vorm, eenheid (minuten), paginering, einde (`null`)      |
| Droogloop sync (echte API) | Geslaagd | 4.110 kijkers, 43 requests, ~5 s, in een wegwerpdatabase; één lege gebruikersnaam overgeslagen               |
| Synctests (PGlite)         | Geslaagd | Koppeling, maandijkpunt voor iedereen, tempo 10 min, inhaal na latere login, kanaal-/vormafwijking + backoff |

Niet bewezen: een volledige productierun via de scheduler (die draait nog niet) en StreamElements-rate-limits bij langdurig gebruik.
