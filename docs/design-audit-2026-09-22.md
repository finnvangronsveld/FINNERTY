# Designaudit — Finnerty

Datum: 22 september 2026. Primaire bron: https://finnerty.vercel.app.

Dit document legt de situatie vóór het redesign vast. De daaropvolgende implementatie staat beschreven in [het redesignverslag](design-redesign-2026-09-23.md).

De site heeft een herkenbare kleurwereld, maar de visuele hiërarchie, de verhouding tussen decoratie en inhoud en de presentatie van het merk zijn onvoldoende. De grote ruimteillustratie draagt bijna alle identiteit. Daaronder ontstaat een herhaling van donkerblauwe panelen, dunne randen, kleine teksten en dezelfde accentkleur. Het resultaat voelt afstandelijk en generiek voor een streamer en zijn community.

Dit vraagt om een nieuwe compositie en een strakker designsysteem. Alleen kleuren wijzigen of meer animaties toevoegen zal het probleem niet oplossen.

## Onderzoek en grenzen

- Live bekeken: home, stream, alle vier Vault-spelinterfaces, community, uitgelogd account en privacy.
- Screenshots visueel beoordeeld op 1440 px en 390 px; aanvullend de homepage op 768 px. DOM-layoutcontroles van de zes publieke routes op 360 en 768 px. Uitlijning van de homepage aanvullend gemeten op 1920 px.
- Live DOM gebruikt voor tekstgroottes, posities, breedtes en actieve decoratieanimaties. Metingen zijn afgerond; scrollbar en renderafronding kunnen enkele pixels verschil geven.
- Lokale CSS en componenten aanvullend gelezen voor motion, responsive regels, ingelogd account en foutpagina's. Deze broninspectie is geen bewijs dat iedere lokale wijziging al gepubliceerd is. Er waren bestaande lokale wijzigingen vóór deze audit.
- De live site toonde een onbekende streamstatus. Echte videoweergave, de zwevende player, ingelogde accountschermen, spelresultaten en spelanimaties zijn niet live getest. Er is geen Twitch-login of spelronde uitgevoerd.
- Geen performancebenchmark, volledige toegankelijkheidsaudit, technische beveiligingsaudit of juridische beoordeling. Contrastproblemen zijn hier visuele aandachtspunten, geen gemeten WCAG-overtredingen.
- Deze oplevering bevat een audit en ontwerpvoorstel; de applicatie is niet aangepast.

## Belangrijkste bevindingen

| Prioriteit | Bevinding                                         | Bewijs                                                                                                 | Ontwerpactie                                                                |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Hoog       | Decoratie verdringt de hoofdtaak                  | Home toont vooral slogan en bol; Vault-bediening staat ver onder de introductie                        | Per pagina één hoofdtaak bovenaan; artwork ondersteunend maken              |
| Hoog       | Tekst is structureel te klein                     | Home: 11 px kaarttekst desktop; mobiel 10 px kaarttekst, 12 px introductie en 7–8 px labels            | Body 16–18 px; interface 14–16 px; metadata meestal minimaal 12 px          |
| Hoog       | Mobiele Vault begint te laat                      | Op 390 px: tabs rond y=749, spelpaneel y=899, Coinflip-knop y=1509                                     | Titel, saldo en spelkeuze compact boven elkaar; regels ondergeschikt        |
| Hoog       | Merkinhoud ontbreekt                              | Geen zichtbare streammomenten, portret of concrete communityactiviteit op home                         | Echte Finnerty-content als belangrijkste visuele materiaal gebruiken        |
| Hoog       | Nauwelijks verschil tussen oppervlakken           | Vrijwel iedere kaart heeft hetzelfde blauwe verloop, dezelfde dunne rand en vergelijkbare ronde hoeken | Achtergrond, contentvlakken en interactieve vlakken duidelijk onderscheiden |
| Middel     | Verschillende illustratiestijlen                  | Fotorealistische chrome bol naast CSS-F, grote lijniconen en eenvoudige spelillustraties               | Eén consistente vorm- en materiaaltaal                                      |
| Middel     | Onrustige verhouding in typografie                | Zeer grote displaykoppen tegenover miniatuurtekst; sterke negatieve letterspatiëring                   | Vaste schaal, leesbaardere koppen en minder decoratieve labels              |
| Middel     | Overmatige herhaling van boodschappen             | Meerdere slogans per pagina, herhaalde loginacties en RTP op tab én spelpaneel                         | Minder herhaling en duidelijkere informatievolgorde                         |
| Middel     | Sommige lege toestanden domineren                 | Leeg leaderboard krijgt volwaardig paneel; stream toont grote wachtillustratie en placeholderchat      | Bewust ontworpen, compacte en bruikbare lege toestanden                     |
| Middel     | Breed scherm heeft verschillende uitlijningen     | Op 1920 px ligt hero-inhoud circa 55 px links van de featurekaarten                                    | Eén gedeeld grid voor header, hero en secties                               |
| Middel     | Motion heeft geen duidelijke overkoepelende stijl | Zachte zwevende decoratie tegenover bounce, shake en herhaalde gloed in spel-CSS                       | Motionregels vastleggen per type interactie                                 |
| Lager      | Footer en hulpschermen missen afwerking           | Kleine footerlinks; lokale error/404 hebben weinig eigen spacing en hiërarchie                         | Ook secundaire schermen opnemen in componentontwerp                         |

## Pagina voor pagina

### Home

De hero is leesbaar op desktop en de primaire knop valt op. De compositie is echter sterk afhankelijk van één grote afbeelding. De slogan vertelt weinig over Finnerty zelf. Bij een streamer hoort zichtbaar te worden wie je volgt, wat je kunt kijken en wat de community bijzonder maakt.

Op mobiel neemt de illustratie een groot deel van de eerste schermhoogte in. De eerste featurekaart begint pas rond het volgende scherm. De oplossing is een speciaal ontworpen mobiele hero: beknopte introductie, duidelijke actie en een kleiner beeld dat de inhoud ondersteunt.

De twee featurekaarten herhalen de heroformule: label, tweeregelige Engelse slogan, kleine Nederlandse toelichting, knop, decoratie. De grote lijnillustratie van een tekstballon sluit niet aan bij de gedetailleerde chrome bol. De daaropvolgende accountstrook blijft door zijn kleine tekst en losse pijl visueel ondergeschikt.

Voorgestelde opbouw: compacte merkintro met echte streamvisual, actuele status met passende actie, direct herkenbare ingangen naar The Vault en Discord, vervolgens relevante stream- of communitymomenten zodra echte content beschikbaar is. Geen fictieve activiteit of cijfers invullen.

### The Vault

De pagina behandelt een gebruiksscherm als een tweede marketinghomepage. Breadcrumb, extra label, enorme titel, alinea, loginpaneel, vier regelchips en een tweerijige mobiele spelkiezer gaan vooraf aan het spel.

Op desktop van 1440 × 1000 begint het Coinflip-paneel rond y=582 en staat de speelknop rond y=1182. Op 390 × 844 verschuift dat naar y=899 en y=1509. Dit is de meest concrete prioriteitsfout in de layout.

Maak een compacte gameroom: titel en saldo in één bovenstrook, spelkeuze direct daaronder en de belangrijkste bediening bij het spel. Toon de uitleg over gratis punten kort bij de introductie en bied volledige regels in een rustige, goed vindbare sectie. Een lange lijst chips boven het spel is niet nodig om die informatie toegankelijk te houden.

De vier spellen hebben verschillende visuele kwaliteit:

- Coinflip: duidelijk object, maar klein binnen een groot leeg paneel. Munt, keuze en actie moeten één samenhangende compositie vormen.
- Dice: groot getal en lichtgevende balk hebben potentie. De tweede slider oogt veel generieker. Maak readout, kansinstelling en resultaat visueel familie van elkaar.
- Slots: lijniconen en een typografische F voelen als interface-iconen die in een kast zijn gezet. Ontwerp een eigen, consistente set spelsymbolen met duidelijkere silhouetten en vergelijkbaar detailniveau.
- Roulette: de meest uitgesproken interface door de extra kleuren. Op mobiel wordt de tafel een lange verticale lijst van twaalf rijen. De numerieke vlakken meten circa 99 × 40 px bij 390 px; breedte is bruikbaar, maar inzetkeuze, totaal en draaiactie liggen ver uit elkaar. Houd de samenvatting en actie dichtbij de tafel zonder deze te bedekken.

Het lege leaderboard krijgt nu dezelfde visuele zwaarte als een gevuld competitief onderdeel. Gebruik een compacte lege toestand. Een gevuld leaderboard kan later nadruk op topplaatsen en eigen positie krijgen, met grotere namen en getallen.

### Stream

De onbekende status is eerlijk aangegeven, maar de compositie voelt onaf: een grote wachtillustratie, technische uitleg en een tweede paneel dat toekomstige chat belooft. De beschikbare Twitch-link staat in het zijpaneel en komt op mobiel pas lager in beeld. De opvallende actie in het hoofdvlak stuurt juist naar The Vault.

Ontwerp live, offline en onbekend als drie afzonderlijke presentaties. Live: video voorop en ondersteunende chat. Offline: duidelijke status en echte beschikbare content of kanaalactie. Onbekend: compacte uitleg met directe Twitch-actie. Houd de visuele nadruk bij de reden waarom iemand deze pagina opent.

De echte player en zijn zwevende toestand moeten later in een ingelogde/live controle worden beoordeeld. De lokale implementatie heeft een vrij groot zwevend venster; de mate waarin dat spelbediening bedekt is nog niet live vastgesteld.

### Community

De tekst belooft mensen en gesprekken, maar de pagina laat hoofdzakelijk een grote orbitillustratie en een Discord-knop zien. De grote lege breedte van het Discord-paneel voegt weinig toe. Daarna volgen nog een label, een kop en een uitleg vóór het leaderboard.

Maak Discord het duidelijke middelpunt. Gebruik een compactere uitnodiging met concreet karakter van de community, herkenbaar Discord-symbool en eventueel echte momenten of content wanneer beschikbaar. Houd de ranglijst een herkenbaar tweede onderdeel. Schrap dubbele introducties.

### Account

Uitgelogd: de links uitgelijnde paginakop en het los gecentreerde loginpaneel vormen twee verschillende composities. “Jouw orbit” en “One crew. Your identity.” vertellen grotendeels hetzelfde, terwijl de loginbutton klein en terughoudend is.

Maak één overtuigende logincompositie met duidelijke voordelen en één hoofdactie. Trek de veiligheidsuitleg rustig onder de knop.

Ingelogd, uitsluitend vanuit lokale code: saldo, kijktijd en synchronisatiemoment krijgen vergelijkbare visuele ruimte. Saldo en kijktijd zijn voor de bezoeker belangrijker; synchronisatie hoort bij kleinere statusinformatie. Journaalregels en instellingen gebruiken veel tekst van 9–11 px. Werk die uit als leesbare functionele interface en controleer later met echte lange namen en getallen.

### Privacy en hulpschermen

Privacy heeft een rustiger tekstkolom dan de rest van de site. De tekst kan groter, zeker op mobiel. De gepubliceerde tekst verwijst nog naar een lokale ontwikkelpreview; visueel en redactioneel versterkt dat de indruk van een onaf product. Inhoudelijke vaststelling van privacybeleid valt buiten deze audit.

De lokale error- en 404-componenten hebben geen volwaardige gezamenlijke kop- en spacingstructuur zoals andere pagina's. Geef ze een herkenbaar maar sober scherm met titel, uitleg en herstelactie. Deze fouttoestanden zijn niet live opgeroepen.

## Kleur, typografie en merk

De huidige basiskleuren zijn bruikbaar: bijna zwart `#030812`, licht tekstwit `#F2F7FF` en ijsblauw `#65CFFF`. Het probleem is de brede toepassing van dezelfde koele tinten en effecten. Achtergronden, randen, illustraties, actieve toestanden en decoratieve lijnen zitten dicht bij elkaar in uitstraling.

Mijn voorgestelde richting is donker grafiet met helder wit en selectief ijsblauw. Minder spacebehang, meer nadruk op Finnerty, inhoud en tastbare spelobjecten. Dit is een ontwerpvoorstel, geen al goedgekeurde nieuwe merkidentiteit.

| Rol              | Voorstel  | Toepassing                       |
| ---------------- | --------- | -------------------------------- |
| Canvas           | `#0B0D10` | Rustige achtergrond              |
| Contentvlak      | `#14181D` | Kaarten en spelvlak              |
| Verhoogd vlak    | `#1D232B` | Menus en interactieve groepen    |
| Hoofdtekst       | `#F4F6F8` | Koppen en belangrijke informatie |
| Secundaire tekst | `#AEB7C4` | Uitleg en metadata               |
| Actieaccent      | `#65CFFF` | Hoofdactie en actieve keuze      |
| Rand             | `#303945` | Functionele scheiding, spaarzaam |

Deze kleuren zijn een startset voor prototypes. Controleer contrast op de uiteindelijke combinaties, inclusief transparantie en disabled states.

Manrope en Space Grotesk hoeven niet per definitie vervangen te worden. Eerst de toepassing oplossen: één duidelijke typografische schaal, minder negatieve tracking, veel grotere lopende tekst en minder ver uit elkaar gespatieerde kapitalen. Gebruik displaytypografie voor merkimpact en rustigere tekst voor bediening. Kies één taal voor functionele acties; merknamen kunnen Engels blijven.

Laat logo, F-symbool, spelobjecten en iconen dezelfde beeldtaal spreken. De gedetailleerde F in de hero, schuine F in de header, CSS-F in de kaart en eenvoudige F op de munt zijn nu geen overtuigend samenhangend merksysteem.

## Animaties en interactie

Live gemeten op brede desktop: de heroillustratie gebruikt een zweefanimatie van 12 seconden en het Vault-embleem 9 seconden. Dit geeft geringe beweging, maar weinig betekenisvolle feedback. De gewone site heeft vooral kleurwisselingen en opwaartse knopbeweging.

De lokale spelcode bevat meer effecten: muntworp, schaduw, geanimeerde cijfers, rollen, roulettewiel, resultaatpop, verlies-shake en meerdere gloedpulsen. De lokale rondeduren zijn 2,6 / 2,4 / 3,4 / 6,2 seconden. De audit stelt geen wijzigingen aan het speltempo voor; die timing heeft ook een functionele rol.

Voorgestelde motionregels:

- Hover en focus: 120–180 ms; kleur, rand of kleine helderheidsverandering. Alleen beweging als die iets toevoegt.
- Wisselen tussen tabs: 180–240 ms; subtiele overgang met stabiele positie van de bediening.
- Eerste verschijning van een belangrijke sectie: hoogstens een kleine eenmalige overgang van 250–400 ms. Inhoud blijft direct beschikbaar.
- Spellen: duidelijke start, beweging, landing en resultaat. Eén primaire resultaatreactie; beperk gelijktijdige shake, pop en herhaalde gloed.
- Reduced motion: behoud directe feedback en duidelijke voortgang zonder grote bewegingen. De lokale implementatie bevat hier al ondersteuning voor; die moet behouden en opnieuw gecontroleerd worden.

Er is geen framerate- of apparaattest uitgevoerd. Eventuele performanceproblemen met blur, schaduw en gradients zijn onderzoekspunten, geen bewezen defecten.

## Wat behouden kan blijven

- De herkenbare F en het ijsblauwe accent als vertrekpunt.
- De duidelijke vier hoofdonderdelen in navigatie.
- De onderscheidbare primaire homepageactie.
- Eerlijke weergave van onbekende en lege toestanden, met een betere presentatie.
- Lokale fonts, focusstyling en ondersteuning voor minder beweging uit de bestaande basis.
- Responsive grids: in de controles op 360 en 768 px hadden de zes publieke routes geen horizontale paginaoverflow. Dit zegt niets over de kwaliteit van de compositie of alle mogelijke inhoudstoestanden.

## Volgorde voor het redesign

1. Leg de visuele richting vast met één uitgewerkte homepagecompositie op desktop én mobiel. Inclusief echte typografie, knoppen, oppervlakken en de rol van beeld.
2. Maak gedeelde tokens voor kleur, type, ruimte, radius, rand en motion. Laat header, inhoud en footer op hetzelfde grid aansluiten.
3. Bouw home om rond Finnerty en de belangrijkste bezoekersacties.
4. Herbouw The Vault als compacte gameroom; optimaliseer eerst de mobiele positie van spelkeuze en bediening.
5. Trek stream, community en account door naar dezelfde stijl, met hun eigen functionele compositie.
6. Werk lege, geladen, fout-, disabled-, focus- en resultaattoestanden af. Daarna de animaties verfijnen.

Acceptatiepunten voor de volgende versie: hoofdtaak snel herkenbaar; geen essentiële microtekst; op mobiel geen lange decoratieve aanloop vóór de taak; consistente uitlijning op 360/390/768/1440/1920 px; geen overlap van player en spelbediening; consistente iconen en objecten; heldere focus en leesbare disabled states; gecontroleerde motion met reduced-motionvariant.

## Bestanden voor de uitvoering

| Onderdeel                                  | Lokale bron                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Tokens, shell, homepage, responsive gedrag | `src/app/globals.css`                                                         |
| Vault-layout, spelstijlen, motion          | `src/app/vault.css`                                                           |
| Header, footer en status                   | `src/components/site-shell.tsx`                                               |
| Home, stream, community, accountintro      | `src/components/pages.tsx`                                                    |
| Accountoverzicht en journaal               | `src/components/account-page.tsx`                                             |
| Heroillustratie                            | `src/components/orbit-art.tsx`, `public/art/`                                 |
| Vaultstructuur en ranglijst                | `src/components/vault/vault-room.tsx`, `src/components/vault/leaderboard.tsx` |
| Spelobjecten en feedback                   | `src/components/vault/games.tsx`, `src/components/vault/shared.tsx`           |
| Videopresentatie                           | `src/components/stream-player.tsx`                                            |

Bij uitvoering de bestaande lokale wijzigingen respecteren en vóór codewijzigingen de relevante lokale Next.js-documentatie lezen, zoals AGENTS.md voorschrijft.
