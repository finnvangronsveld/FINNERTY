# Handoff — 13 september 2026

## Wat er staat

De masterprompt is volledig gelezen en Frost Orbit visueel geïnspecteerd. De repository begon leeg. Een responsive Next.js-app is gebouwd en lokaal gestart op `http://127.0.0.1:3000`.

- Fase A: home, Vault, Stream, Community, Account, privacyconcept en permanente applicatieshell.
- Fase B: OAuth-codeflow via oauth4webapi, DB-sessies, vaste Twitch-identiteit, encryptie, validatie/refresh, gedeelde livecache, EventSub-handler en beveiligde scheduler-ingang. Echte koppelingen nog niet beproefd.
- Fase C: PostgreSQL/Drizzle-migraties, lokale PGlite-demo, checkpoints/remainders, integer accounting, ledger en auditable correcties. Read-only StreamElements-transport en strikt intern contract. Echte mapping/normalisatie/sync expliciet nog gesloten.
- Fase D: verzorgde Vault-teaser zonder gamefuncties; accountjournaal met paginering, profielvoorkeur, verwijderingsregistratie; basisbeheer met zoeken en correcties voor geconfigureerde Twitch-admins.

## Controles

Afsluitende controles geslaagd: 17 unit/database/providerfixture-tests, 4 browserflows, 9 lokale productiesmokechecks, TypeScript, lint en productiebuild. Een canarycontrole vond geen ingestelde testsecrets in browserbestanden of geteste HTML/API-responses. Geen peerconflicten. Zie `verification.md` voor de precieze grenzen. Screenshots: home/Vault op 390 en 1440 px, plus account. Viewports 360, 390, 430, 768 en 1440 zijn automatisch gecontroleerd op overflow.

Geteste playercontinuïteit betreft de lokale demo-iframe: dezelfde instance-ID over home → vault → account → stream, scroll, browser-terug, resize, sluiten/heropenen en foutstates. Echte Twitch playback/autoplay/audio/CSP nog testen.

PGlite serialiseert databasewerk op één engine. Concurrent aangeroepen domeinfuncties zijn getest, **onafhankelijke PostgreSQL-workers niet**. Dit onderscheid niet wegpoetsen in een volgende oplevering.

## Eerstvolgende stappen

1. Niet-geheime Twitch-login, broadcaster-ID en Discord-link bevestigen. Database-engine/inhoud/host bevestigen. Secrets uitsluitend via `.env.local` of secretmanager.
2. Echte PostgreSQL-devdatabase aansluiten na inventaris/backup; migraties controleren en toepassen. Multi-connection races en herstel testen.
3. Twitch-OAuth, usernamewissel, intrekking, expiry, SDK-events, embedparents en HTTPS echt beproeven. EventSub-abonnementen aanmaken na configuratie; revocationherstel/monitoring afronden.
4. Read-only StreamElements-proef volgens `integrations.md`; gecontroleerde echte fixture opslaan. Mappingverificatie, naamrecycling/conflicten, centrale gepagineerde sync en leases afbouwen. Geen credits vóór bewezen schema/eenheid.
5. Beheer uitbreiden met transactiedetails, mappingbeoordeling, versiebeleid voor puntenregels en herstel van vastgelopen syncjobs. `/api/admin/health` heeft al een private database-schrijfproef en saldo/journaalreconciliatie; livegebruik en UI-integratie nog testen. Eenmalige historische import blijft uit totdat beleid expliciet is vastgesteld.
6. Verwijderingsworkflow werkelijk afhandelen; retentie/contactgegevens en privacy afronden. Een opgeslagen verzoek is geen uitgevoerde verwijdering.
7. Host-scheduler, observability, backups/restore, nonce-CSP, performance op echte telefoon en lage bandbreedte. Publicatie pas na beoordeling van de concrete werkende versie.

## Werkafspraken en beperkingen

- `AGENTS.md` is automatisch door Next.js aangemaakt; lees relevante lokale Next-documentatie vóór verdere Next-wijzigingen.
- Gebruik alleen eigen punten. StreamElements-punten nooit lezen als saldo of aanpassen.
- Geen spelengine of inzet-/uitbetalingsroute toevoegen zonder nieuwe expliciete opdracht.
- Demo uitsluitend lokaal; geen productie-fallback of onbeveiligde admin.
- Bewaak claimniveau: dit is voortgang door bouwfases, geen afgeronde v1.
- ESLint 9.39.5 is momenteel nodig door peer-ranges van Nexts react/import/a11y-plugins; upstream markeert die linterversie deprecated. Voor release afhankelijkheden opnieuw afstemmen. TypeScript 7 werkte nog niet met typescript-eslint; TypeScript 6.0.3 wel.
