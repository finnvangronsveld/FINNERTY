# Visuele assets

Het actieve ontwerp gebruikt de lokale vectoren en CSS in `src/components/game-art.tsx`, de spelobjecten in `src/components/vault/games.tsx` en het F-favicon. Hiervoor worden geen rasterillustraties geladen. Fonts zijn zelf gehost: Manrope en Space Grotesk. Lucide verzorgt interface-iconen.

## Archief: voormalig Frost Orbit-asset

De onderstaande assets blijven als archief aanwezig, maar worden door het nieuwe ontwerp niet gebruikt.

Primair referentiebeeld: `references/07-frost-orbit.png`, gelezen uit het aangeleverde startpakket. Alleen visuele richting; de verouderde spelpresentatie is niet overgenomen.

Het oorspronkelijke startpakket, de briefing en `references/` blijven lokaal buiten Git en de deployment. De geoptimaliseerde bestanden in `public/art/` zijn onderdeel van de applicatie.

Nieuwe hero: `public/art/frost-orbit.webp` (1440 px, ongeveer 96 KB) en `public/art/frost-orbit-small.webp` (768 px, ongeveer 30 KB). Origineel: `references/frost-orbit-generated.png`. Gegenereerd met de ingebouwde imagegen-tool en daarna lokaal naar WebP geoptimaliseerd. Geen interface of tekst ingebakken behalve de sculpturale F.

Gebruikte prompt:

> Use case: stylized-concept. Asset type: decorative website hero artwork only, NOT a UI mockup. Create a premium photoreal CGI glass sphere floating in deep nearly black blue space (#030812), containing a large sculptural bevelled chrome uppercase F, with a thin elliptical icy cyan luminous orbital ring wrapping around the sphere. A shadowed cratered moon behind it at upper right, subtle distant stars, a few small floating chrome droplets. Framing: landscape 3:2, sphere centered toward right, all objects entirely contained with generous dark margin, left third mostly dark empty space. Glass has realistic crisp refractions and beautiful silver highlights, cinematic understated blue light. Match a luxury space x glass streamer brand. No interface, no buttons, no words, no panels, no games, no purple or green. Only the sculptural letter F. The artwork will sit alongside real HTML heading and controls.

De twee fontfamilies zijn zelf gehost via Fontsource Variable: Manrope en Space Grotesk. Licentieteksten worden met de packages geleverd. Lucide levert interface-iconen; de F-mark en kaartdecoratie zijn lokale vector/CSS-elementen.
