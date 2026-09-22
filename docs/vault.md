# The Vault — gameroom

The Vault is de gameroom van Finnertyverse: Coinflip, Dice, Orbit Slots en Europese roulette, gespeeld met Vault Points (VP), plus een leaderboard **Totaal** (huidig saldo) en **Deze maand** (netto VP-wijziging sinds de 1e, Belgische tijd). Er is geen echt geld, er zijn geen prijzen.

## Juridisch kader — waarom dit binnen de Kansspelwet valt

_Geen formeel juridisch advies. Bij twijfel over een nieuwe functie: vraag vooraf een standpunt aan de Kansspelcommissie._

De wet van 7 mei 1999 (Kansspelwet), art. 2, 1°, noemt iets een kansspel als **alle vier** de elementen aanwezig zijn: een spel, een **inzet van om het even welke aard**, winst of verlies van om het even welke aard, en toeval (ook als bijkomstig element). Toeval en „winst” (VP, een plek in de ranglijst) zitten er bewust in. The Vault blijft buiten de wet door het element **inzet** weg te nemen: VP zijn uitsluitend gratis te verdienen met kijktijd en hebben geen geldwaarde. Dezelfde redenering hanteerde de Kansspelcommissie in haar loot-boxrapport (2018): wat alleen door te spelen verdiend wordt, is geen inzet; wat (on)rechtstreeks met geld gekocht kan worden, wel. Ook zonder uitbetaling in euro kan een spel met gekochte fiches een kansspel zijn.

**Harde ontwerpregels.** Wie een van deze regels breekt, maakt van elke Vault-ronde mogelijk een vergunningsplichtig kansspel (strafrechtelijke sancties en blokkering van de site zijn dan mogelijk):

1. **Geen aankoop van VP, rechtstreeks of onrechtstreeks.** Geen VP voor bits, donaties, subs, betaalde multipliers, betaalde extra rondes of betaalde toegang tot spellen.
2. **Geen prijzen met geldwaarde** voor VP of voor een leaderboardpositie: geen giftcards, merch, gifted subs, game keys, skins of geld. Eer, een shoutout of een Discord-rol mag.
3. **Geen overdracht of handel** van VP tussen accounts; dat zou een secundaire markt met geldwaarde creëren.
4. **Geen koppeling met echte kansspelaanbieders** (links, sponsoring, referralcodes). Reclame voor kansspelen is in België sterk ingeperkt (KB van 27 februari 2023), en Twitch verbiedt ongelicentieerde gokstreams.

**Sub-multiplier: bewust niet gebouwd.** Een Twitch-sub kost geld. Levert die sub meer VP op die je vervolgens in kansspellen inzet, dan koop je onrechtstreeks fiches en is het inzet-element verdedigbaar aanwezig. Veilige alternatieven voor subs: cosmetische extra’s die VP niet raken (badge of naamkleur op het leaderboard), of een aparte, niet-inzetbare XP-/rangteller.

**Toon en doelgroep.** Twitch-publiek is 13+. De interface spreekt van „games” en „gameroom”, niet van casino of gokken, toont per spel de RTP en verwijst in de huisregels naar DrugLijn voor vragen over echt gokgedrag. Geen gemanipuleerde bijna-winst: de symbolen boven en onder de slotlijn zijn willekeurig getrokken met de echte rolgewichten.

## Tempo en misbruik

„Spammen en rijk worden” is op vier lagen afgesloten:

- **Tempo in de database.** `playRound` neemt de walletrij met `FOR UPDATE`. Onder die lock controleert de server met de databaseklok of de animatie van de vorige ronde voorbij is (`GAME_DURATION_MS`: coinflip 2,6 s, dice 2,4 s, slots 3,4 s, roulette 6,2 s). Anders volgt `429` met `retryAfterMs`. Parallelle requests, extra tabs of scripts worden daardoor geserialiseerd en geweigerd.
- **Rate limit.** Maximaal 30 rondes per minuut per account (`request_limits`).
- **Inzetlimieten.** 10–5.000 VP per ronde (roulette: totaal van maximaal 40 vakken). Saldo kan nooit negatief (check-constraint + lock).
- **Negatieve verwachting.** Elk spel betaalt ~97% terug (roulette 36/37). Meer rondes betekent gemiddeld minder VP, niet meer.

In de interface blijft de knop uitgeschakeld en vult hij zich precies zo lang als het servervenster. Met „Effecten beperken” of `prefers-reduced-motion` verdwijnen de animaties, maar niet de wachttijd.

## Techniek

- `src/lib/vault.ts` — gedeelde spelregels, multipliers (basispunten, integer VP) en tempo. UI en server gebruiken exact dezelfde getallen.
- `src/server/vault/games.ts` — Zod-validatie per spel en afhandeling met `crypto.randomInt` (CSPRNG). De RNG is injecteerbaar zodat tests de exacte RTP over alle uitkomsten berekenen.
- `src/server/vault/service.ts` — één transactie per ronde: tempo, saldo, uitkomst, `game_rounds`-record, één `ledger_entries`-regel van type `game` met het **netto** resultaat, walletupdate. Idempotent per client-UUID; dezelfde sleutel met een andere inzet geeft `IDEMPOTENCY_CONFLICT`. `total_earned` blijft uitsluitend kijktijd, zodat `/api/admin/health` blijft reconciliëren.
- Leaderboards tonen accounts met `listed = true` zonder verwijderingsverzoek. `listed` staat standaard aan (opt-out): alleen de openbare Twitch-naam, avatar en punten, uitzetten met één klik, vermeld op de privacypagina. Gelijke waarden delen een rang.
- API: `POST /api/vault/play`, `GET /api/vault/rounds`, `GET /api/vault/leaderboard?period=all|month`. Alles private/no-store; mutaties vereisen same-origin en sessie.
- Migratie `drizzle/0004_abandoned_piledriver.sql`: tabel `game_rounds`, ledgertype `game`, indexen voor ranglijst en historie.

## Productiestatus

In productie heeft iedereen 0 VP totdat de kijktijdkoppeling (StreamElements-contractproef + sync, zie `integrations.md`) live is. Tot dan is The Vault zichtbaar en speelbaar voor wie VP via een beheercorrectie krijgt, maar verdient niemand automatisch punten. Migratie 0004 moet op de productiedatabase worden toegepast vóór deze versie daar draait.

Mogelijke vervolgstappen: provably fair (server-seed-hash vooraf tonen), seizoensarchief van maandwinnaars, live „recente grote winsten”-feed voor stream-overlays, extra spellen (Mines, Plinko, Blackjack) volgens hetzelfde contract.
