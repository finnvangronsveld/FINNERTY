# Product en huidige scope

Finnerty is het merk. Finnertyverse is de wereld. The Crew is de community. The Vault is de gameroom: spellen met gratis Vault Points en leaderboards voor de eer. Zie [The Vault](vault.md).

De actuele gebruikersopdracht en volledige masterprompt zijn gelezen. De tekst in `PROJECT-START-HIER.md` is als projectcontext behandeld, niet als een afzonderlijke opdracht om agents in te zetten of externe acties uit te voeren. Geen externe services gewijzigd of publicatie uitgevoerd.

## Routes

| Route        | Huidige invulling                                                              |
| ------------ | ------------------------------------------------------------------------------ |
| `/`          | Frost Orbit-hero, streamactie, Vault-kaart en community                        |
| `/stream`    | Uitgebreide playerzone of eerlijke offline/onbekend-state, accountstrook       |
| `/vault`     | Gameroom: saldo, vier spellen, leaderboard totaal/maand, rondes, huisregels    |
| `/account`   | Identiteit, kijktijd, saldo/totaal verdiend, pagineerbaar journaal en voorkeur |
| `/community` | Discord-link en leaderboard (top 25, opt-out); geen verzonnen aantallen        |
| `/privacy`   | Eerlijke conceptbeschrijving en expliciete ontbrekende publicatiegegevens      |
| `/admin`     | Alleen geverifieerde Twitch-ID’s uit serverconfiguratie; geen demo-admin       |

## Eigen punten

Voorlopige naam: Vault Points / VP. Serverconfiguratie bepaalt labels. De demo gebruikt regelversie 1: 10 VP per 600 nieuwe geregistreerde seconden. Dit is geen vastgestelde kanaaleconomie. De koers in de database is leidend; productie begint zonder regel of mapping en kan daardoor geen ongecontroleerde toekenning doen.

- Eerste login, beleid `current_month` (standaard): de eerste geldige waarneming krediteert eenmalig de kijktijd sinds het maandbegin-ijkpunt van die kijker (Belgische kalendermaand). Oudere maanden blijven basislijn. Zonder ijkpunt of met beleid `off` is de eerste waarneming alleen basislijn.
- Alleen positieve gevalideerde delta’s onder dezelfde geverifieerde identiteit en hetzelfde brontijdperk tellen mee.
- Resterende seconden worden bewaard. Lagere tellers, ontbrekende records en mappingconflicten geven geen reset of beloning.
- Koerswijzigingen vragen expliciete checkpointmigratie; tot die tijd pauzeert toekenning.
- Balans en totaal verdiend staan apart; beheercorrecties veranderen het verdiende totaal niet.
- Geen aankoop, overdracht, opname of inwisseling. Spelrondes in The Vault gebruiken alleen bestaand saldo en boeken het netto resultaat als `game` in het journaal; `total_earned` blijft kijktijd.

## Ontwerp

Leidend: `references/07-frost-orbit.png`. Canvas #030812, diepblauw glas, zilver en ijsblauwe accenten. Manrope en Space Grotesk lokaal geladen via Fontsource (OFL). Geen externe fontrequests. Sculpturale afbeelding is losse decoratie, geen screenshotinterface. De kleine kaartobjecten zijn CSS/SVG; geen WebGL nodig.

Mobiel <432 px of een zeer lage viewport: livebalk met Twitch-link. Dit is de expliciete productuitzondering op een altijd zichtbare video vanwege de embedminimumafmetingen. Een ontbrekende echte kanaallink wordt gemeld in plaats van gegokt.

## Open productkeuzes

Echte kanaalidentiteit, Discord-link, definitieve puntennaam/koers, bewaartermijnen, contactgegevens eigenaar. Siteaccounts staan standaard in het leaderboard (alleen Twitch-naam, avatar en punten) en kunnen dat in hun account uitzetten.
