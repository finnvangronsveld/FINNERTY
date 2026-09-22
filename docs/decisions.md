# Beslissingen

2026-09-13 — Start uit lege repository (alleen README, briefing en zip). Briefing volledig gelezen; `references/07-frost-orbit.png` bekeken. Aangeleverde bestanden blijven behouden.

- Next.js App Router + React + TypeScript; één modulaire applicatie. Vercel-configuratie toegevoegd op verzoek, met een expliciet toegestane push naar main.
- PostgreSQL + Drizzle. Migraties voorbereiden, geen externe database migreren zonder engine/inventariscontrole. PGlite uitsluitend voor lokale geïsoleerde demo en database-integratietests.
- Root-layout houdt één playerhost vast; alleen geometrie verandert bij navigatie. Op schermen waar 400 × 300 niet past een Twitch-link. Geen portals of dubbele player.
- CSS voor beweging; geen animatiebibliotheek of WebGL nodig voor deze eerste compositie. Systeemvoorkeur en expliciete effectenschakelaar.
- Gegenereerde decoratieve Frost Orbit-asset; alle tekst, navigatie en bediening in HTML. Geen concept-screenshot als website.
- Eigen journaal en saldo. StreamElements uitsluitend read-only kijktijd. Eerste gevalideerde waarneming = basislijn, nooit automatische historische beloning. _(Aangepast 2026-09-22: maandinhaal, zie onder.)_
- Productie faalt gesloten bij ontbrekende configuratie; lokale demo expliciet herkenbaar en gescheiden.
- ~~The Vault is permanent Under construction in deze versie.~~ Vervangen op 2026-09-22, zie onder.
- OAuth via oauth4webapi met server-side identiteitscontrole; eigen intrekbare sessies en versleutelde tokens. Arctic bleek deprecated en is verwijderd vóór implementatie.
- TypeScript 6 en ESLint 9 voorlopig voor compatibele Next-lintplugins. ESLint-upgrade blijft een gedocumenteerd releasepunt; geen genegeerde peerconflicten.
- EventSub schrijft geen afgeleide live/offline-status: een ondertekend event start een actuele Get Streams-controle. Dat voorkomt terugzetten door vertraagde gebeurtenissen.
- Geen StreamElements-normalisatie op basis van gegokte velden/eenheden. Kijktijdcredits blijven gesloten totdat echte read-only fixtures zijn geverifieerd.

- Vercel + externe PostgreSQL. Node 24, pnpm 11.19.0 expliciet in de installatiestap, Frankfurt als functionregio. Geen databasemigraties tijdens een deployment. Onderhoud kan via externe POST-scheduler of optionele Vercel GET-cron; de standaardconfiguratie vereist geen betaald cronplan.
- Bronbriefing, zip, referentieoriginelen, lokale databases en secrets blijven buiten Git. Alleen geoptimaliseerde website-assets gaan mee.

2026-09-22 — The Vault als gameroom (expliciete opdracht eigenaar).

- Spellen met gratis VP binnen de Kansspelwet door het inzet-element weg te nemen: VP alleen via kijktijd, niet te koop, niet overdraagbaar, geen prijzen. Details en harde regels in `vault.md`.
- Sub-multiplier niet gebouwd: betaalde sub → meer inzetbare VP is een onrechtstreekse aankoop. Alleen cosmetische sub-perks zijn veilig.
- Tempo wordt server-side afgedwongen onder de walletlock met de databaseklok, gelijk aan de animatieduur; plus 30 rondes/minuut, 10–5.000 VP per ronde en ~97% RTP.
- Netto resultaat per ronde als één ledgerregel `game`; details in `game_rounds`. `total_earned` blijft kijktijd.
- Maandleaderboard = netto ledgerwijziging sinds middernacht op de 1e in Europe/Brussels; totaal = huidig saldo.
- Leaderboards zijn opt-out (eigenaar, 2026-09-22): `users.listed` standaard `true`. Alleen de openbare Twitch-naam, avatar en punten; uitzetten met één klik in het account; vermeld op de privacypagina. Bestaande accounts niet overschreven.
- Maandinhaal bij eerste login (eigenaar, 2026-09-22): `point_rules.historical_import = 'current_month'` (nieuwe standaard). De sync legt per kijker het laagste cumulatieve totaal per Belgische maand vast (`watchtime_month_marks`); de eerste waarneming van een nieuw account krediteert eenmalig het verschil, met reden in het journaal. Alleen kijktijd die de site zelf heeft waargenomen telt; vorige maanden niet. `off` blijft mogelijk per regelversie.

Open: geverifieerde Twitch-login/ID, Discord-link, database-engine/inhoud, daadwerkelijke Vercel-koppeling en scheduler, echte StreamElements-response en eenheid, definitieve puntennaam en koers, eigenaar/contactgegevens voor privacy.
