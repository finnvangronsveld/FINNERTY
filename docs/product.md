# Product en huidige scope

Finnerty is het merk. Finnertyverse is de wereld. The Crew is de community. The Vault is de definitieve naam van een toekomstige uitbreiding, in deze versie uitsluitend **Under construction**: “We bouwen aan iets nieuws. Binnenkort meer.” Geen datum of beloofde puntenwaarde.

De actuele gebruikersopdracht en volledige masterprompt zijn gelezen. De tekst in `PROJECT-START-HIER.md` is als projectcontext behandeld, niet als een afzonderlijke opdracht om agents in te zetten of externe acties uit te voeren. Geen externe services gewijzigd of publicatie uitgevoerd.

## Routes

| Route        | Huidige invulling                                                              |
| ------------ | ------------------------------------------------------------------------------ |
| `/`          | Frost Orbit-hero, streamactie, Vault-teaser en community                       |
| `/stream`    | Uitgebreide playerzone of eerlijke offline/onbekend-state, accountstrook       |
| `/vault`     | Decoratieve F-bol, Under construction, stream- en homeactie                    |
| `/account`   | Identiteit, kijktijd, saldo/totaal verdiend, pagineerbaar journaal en voorkeur |
| `/community` | Geconfigureerde Discord-link; geen verzonnen aantallen of ranglijst            |
| `/privacy`   | Eerlijke conceptbeschrijving en expliciete ontbrekende publicatiegegevens      |
| `/admin`     | Alleen geverifieerde Twitch-ID’s uit serverconfiguratie; geen demo-admin       |

## Eigen punten

Voorlopige naam: Vault Points / VP. Serverconfiguratie bepaalt labels. De demo gebruikt regelversie 1: 10 VP per 600 nieuwe geregistreerde seconden. Dit is geen vastgestelde kanaaleconomie. De koers in de database is leidend; productie begint zonder regel of mapping en kan daardoor geen ongecontroleerde toekenning doen.

- De eerste geldige cumulatieve waarneming vormt de basislijn; historische tijd blijft zichtbaar.
- Alleen positieve gevalideerde delta’s onder dezelfde geverifieerde identiteit en hetzelfde brontijdperk tellen mee.
- Resterende seconden worden bewaard. Lagere tellers, ontbrekende records en mappingconflicten geven geen reset of beloning.
- Koerswijzigingen vragen expliciete checkpointmigratie; tot die tijd pauzeert toekenning.
- Balans en totaal verdiend staan apart; beheercorrecties veranderen het verdiende totaal niet.
- Geen aankoop, overdracht, inzet, opname, inwisseling of spelrondes.

## Ontwerp

Leidend: `references/07-frost-orbit.png`. Canvas #030812, diepblauw glas, zilver en ijsblauwe accenten. Manrope en Space Grotesk lokaal geladen via Fontsource (OFL). Geen externe fontrequests. Sculpturale afbeelding is losse decoratie, geen screenshotinterface. De kleine kaartobjecten zijn CSS/SVG; geen WebGL nodig.

Mobiel <432 px of een zeer lage viewport: livebalk met Twitch-link. Dit is de expliciete productuitzondering op een altijd zichtbare video vanwege de embedminimumafmetingen. Een ontbrekende echte kanaallink wordt gemeld in plaats van gegokt.

## Open productkeuzes

Echte kanaalidentiteit, Discord-link, definitieve puntennaam/koers, historische importbeleid, profielpubliekheid, bewaartermijnen, contactgegevens eigenaar. Het leaderboard is nog niet gepubliceerd. De opt-in-voorkeur wordt wel opgeslagen.
