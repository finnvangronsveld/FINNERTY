# Finnerty — redesign

De visuele audit is doorgevoerd als een nieuw ontwerp voor alle pagina's. De technische account-, punten-, spel- en playerflows blijven behouden.

## Richting

- Warm charcoal `#111210`, crème `#e8e4d8` en vermiljoen `#ff6845`. Ondersteunende, gedempte tinten onderscheiden de vier spellen.
- Manrope voor koppen en lopende tekst, Space Grotesk voor cijfers en metadata. Een lowercase woordmerk met een oranje punt.
- Een grafische Vault-poster met eigen speelkaarten; vier SVG-spelillustraties vervangen het oude ruimtebeeld. Er zijn geen fictieve portretten of streammomenten toegevoegd.
- Kleine hoverbewegingen en gerichte spelanimaties. Zowel de systeemvoorkeur voor minder beweging als de handmatige effectenschakelaar blijven werken.

## Pagina's

Home heeft een duidelijke streamactie, een Vault-poster, vier kaarten die het gekozen spel direct openen en een contrasterend communityblok. Stream heeft een rustige offline/onbekend-weergave en behoudt de persistente player wanneer live. Community heeft een crèmekleurige Discord-uitnodiging en het echte leaderboard. Account, privacy, admin, 404, foutpagina en de lokale demoplayer gebruiken dezelfde vormgeving.

The Vault begint met titel, saldo en één regel uitleg. Desktop zet het spelobject en de bediening naast elkaar. Mobiel staan de vier tabs op één rij en deelt de munt zijn rij met het resultaat. Op 390 px staat de Coinflip-knop rond y=910, tegenover circa y=1509 tijdens de live audit. De vergelijking betreft de uitgelogde weergave; fonts en scrollbar kunnen enkele pixels verschil geven.

## Validatie

- Typecheck, ESLint en productiebuild.
- 37 bestaande tests voor account, punten, OAuth, synchronisatie en spelafhandeling.
- Browsertests voor routes op 360, 390, 430, 768 en 1440 px, spelrondes, account en uitloggen, behoud van één playeriframe, toetsenbordfocus en minder beweging.
- Aanvullende regressie voor de nieuwe spelkaarten, onbekende spelparameters en de compacte mobiele Coinflip-bediening.
- Visuele controle in de lokale browser van desktop- en mobiele layouts. Bijgewerkte referentiebeelden staan in `docs/screenshots/`.

Echte streambeelden en een Finnerty-portret kunnen later het merk verder eigen maken. Ontbrekende Discord- of kanaalconfiguratie wordt zichtbaar opgevangen. De privacytekst blijft een concept totdat de eigenaar de ontbrekende gegevens aanvult.
