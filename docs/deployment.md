# Finnerty online zetten: stap voor stap

Gebruik Vercel voor de Next.js-website en Neon voor je eigen PostgreSQL-database. De eerste deployment kan al zonder credentials. Daarna activeer je achtereenvolgens de database, Twitch-login en onderhoud. The Vault (gameroom) werkt pas met saldo zodra er VP zijn. Automatische kijktijdpunten vereisen nog implementatie en verificatie van de StreamElements-adapter; alleen instellingen invullen maakt dat deel niet af.

## 1. Controleer GitHub

Open de FINNERTY-repository en selecteer `main`. Controleer dat je `package.json`, `src/`, `drizzle/` en `vercel.json` ziet. De oorspronkelijke zip, briefing, referentieoriginelen en lokale database horen daar niet te staan. Ook `.env.local` en andere secretbestanden mogen niet zichtbaar zijn; `.env.example` bevat uitsluitend voorbeeldwaarden.

## 2. Maak het Vercel-project

1. Log in bij [Vercel](https://vercel.com/new) met je GitHub-account.
2. Kies **Add New → Project**, geef toegang tot FINNERTY en importeer de repository.
3. Gebruik repository-root als Root Directory, **Next.js** als framework, **main** als production branch en **Node.js 24.x**. Laat de outputdirectory op de Next.js-default staan. Gebruik Fluid Compute.
4. Laat de commando's uit `vercel.json` gelden. Install: `npx --yes pnpm@11.19.0 install --frozen-lockfile`. Build: `npm run build`. Er draait geen databasemigratie tijdens de build.
5. Klik **Deploy**. Open het vaste projectdomein, bijvoorbeeld `https://jouw-project.vercel.app`. Gebruik niet de tijdelijke URL van een afzonderlijke previewdeployment.

De vormgeving en publieke pagina's horen nu te werken. Login en streamstatus mogen nog ongeconfigureerd zijn. Er verschijnt geen lokale demo in productie. Noteer de vaste URL; hieronder heet die `APP_URL`.

Een eigen domein kan via Project → Settings → Domains. Als je dat later toevoegt, werk dan ook APP_URL, de Twitch-callback en de embed-parentlijst bij.

## 3. Maak een lege PostgreSQL-database

1. Maak bij [Neon](https://console.neon.tech/) een project voor Finnerty. Gebruik een aparte lege database, geen database van een ander project.
2. Kies bij voorkeur Frankfurt; de Vercel-functions gebruiken `fra1`. Heb je al een database elders, stem beide regio's op elkaar af.
3. Open **Connect**. Bewaar de connection string met **Connection pooling aan** voor Vercel.
4. Bewaar ook de directe connection string met **Connection pooling uit** voor de eenmalige migratie. Neem de TLS-instellingen uit Neon over; schakel certificaatcontrole niet uit.

Beide connection strings bevatten een wachtwoord. Bewaar ze in je passwordmanager en de daarvoor bedoelde secretvelden. Zie [Neons verbindingsuitleg](https://neon.com/docs/connect/connection-pooling) en [Vercel handmatig koppelen](https://neon.com/docs/guides/vercel-manual).

## 4. Maak de databasetabellen

Open deze projectmap lokaal in je terminal. Bekijk de bestanden in `drizzle/`. Deze stap is bedoeld voor de nieuwe lege database; inventariseer bestaande inhoud en maak een backup als je toch een bestaande database gebruikt.

Maak lokaal een bestand `.env.migrate.local` in de projectroot met:

```dotenv
DATABASE_URL=PLAK_HIER_DE_DIRECTE_NEON_CONNECTION_STRING
MIGRATION_REVIEWED=yes
```

Dit bestand valt onder `.gitignore`. Gebruik Node.js 24 en voer uit:

```powershell
node --env-file=.env.migrate.local --import tsx scripts/migrate.ts
```

Verwacht: **Migraties voltooid.** Controleer daarna in Neon dat onder andere `users`, `auth_accounts`, `wallets` en `ledger_entries` bestaan. Verwijder het tijdelijke secretbestand na afloop of bewaar het uitsluitend lokaal. De migratie importeert geen demoaccounts of demo-VP.

Als dit een verse clone is, installeer eerst Node.js 24 en de dependencies met `npx --yes pnpm@11.19.0 install --frozen-lockfile`.

## 5. Registreer je Twitch-app

1. Open de [Twitch Developer Console](https://dev.twitch.tv/console/apps) en log in. Twitch vereist 2FA.
2. Kies **Register Your Application**, bijvoorbeeld met naam Finnertyverse.
3. Stel de OAuth Redirect URL exact in op `https://JOUW-VASTE-DOMEIN/api/auth/callback/twitch`.
4. Kies een passende websitecategorie en het **Confidential** clienttype voor deze serverapp.
5. Sla op en open **Manage**. Bewaar de **Client ID** en maak een **Client Secret**.

Plak het Client Secret uitsluitend in Vercel of lokale secretconfiguratie. Zie [Twitch-appregistratie](https://dev.twitch.tv/docs/authentication/register-app/).

## 6. Vul de Vercel-environment in

Ga naar Project → Settings → Environment Variables. Voeg de volgende waarden toe voor **Production**, niet voor Preview. Markeer secrets als Sensitive waar beschikbaar.

| Naam                   | Wat je invult                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_MODE`             | `live`                                                                                                                                    |
| `APP_URL`              | Exact de vaste HTTPS-origin, zonder afsluitend pad                                                                                        |
| `DATABASE_URL`         | De pooled Neon-connection string                                                                                                          |
| `TWITCH_CLIENT_ID`     | De Client ID uit Twitch                                                                                                                   |
| `TWITCH_CLIENT_SECRET` | Het Client Secret uit Twitch                                                                                                              |
| `TWITCH_CHANNEL_LOGIN` | De kanaalnaam uit de Twitch-URL, in kleine letters                                                                                        |
| `TWITCH_EMBED_PARENTS` | Alleen je websitehostname, bijvoorbeeld `jouw-project.vercel.app`; meerdere hostnamen kommagescheiden, zonder `https://`, pad of wildcard |
| `AUTH_SECRET`          | Een nieuwe willekeurige sleutel: exact 32 bytes, als base64 (44 tekens) of hex (64 tekens)                                                |
| `JOB_SECRET`           | Een afzonderlijk willekeurig geheim van minstens 32 tekens voor een externe scheduler                                                     |
| `EVENTSUB_SECRET`      | Een afzonderlijk willekeurig geheim voor latere Twitch-webhookregistratie                                                                 |
| `DISCORD_INVITE_URL`   | Je echte Discord-uitnodigingslink; optioneel                                                                                              |

Een geschikte willekeurige waarde genereer je lokaal met onderstaande opdracht. Voer deze opnieuw uit voor elk afzonderlijk geheim; gebruik niet overal dezelfde waarde:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Sla de waarden op in je passwordmanager. Verander `AUTH_SECRET` later niet zomaar: bestaande Twitch-tokens zijn daarmee versleuteld. Geef secrets nooit een `NEXT_PUBLIC_`-prefix.

Laat `STREAMELEMENTS_JWT` en `STREAMELEMENTS_CHANNEL_ID` voorlopig leeg. De puntennaam valt standaard terug op Vault Points en VP. Laat `HISTORICAL_IMPORT` op `off` als je die instelling toevoegt.

Ga naar **Deployments → laatste productie-deployment → Redeploy**. Environmentwijzigingen gelden pas in een nieuwe deployment.

## 7. Test login en leg de vaste kanaal-ID vast

1. Open de productie-URL en log in met het Twitch-account van het kanaal.
2. Controleer de accountpagina. Een nieuw echt account begint op **0 VP**, niet op het demosaldo.
3. Open in Neon de tabel `auth_accounts`. Zoek de rij met de juiste `login` en kopieer alleen `provider_user_id`: dit is de vaste numerieke Twitch-ID. Kopieer geen versleutelde tokenvelden.
4. Voeg die ID in Vercel toe als `TWITCH_BROADCASTER_ID` voor het kanaal. Als dat account ook beheerder is, zet dezelfde ID in `ADMIN_TWITCH_USER_IDS`. Meerdere beheerders: kommagescheiden vaste ID's.
5. Redeploy opnieuw. Test uitloggen en inloggen. Open `/admin` met het beheerdersaccount.

De beschermde `/api/admin/health` controleert database-schrijfbaarheid en de aansluiting tussen wallets en journaal. `/api/health` controleert alleen of de applicatie draait.

## 8. Activeer onderhoud elke minuut

Dit houdt de streamstatus en Twitch-autorisaties bij. Gebruik één van de twee opties. Zonder scheduler worden deze controles niet automatisch periodiek gestart.

**Vercel Pro/Enterprise:** voeg `CRON_SECRET` toe als een nieuw onafhankelijk willekeurig geheim van minstens 32 tekens. Voeg aan de bestaande `vercel.json` deze sleutel toe en commit/push de wijziging:

```json
"crons": [{ "path": "/api/jobs/maintenance", "schedule": "* * * * *" }]
```

Vercel doet dan GET met `Authorization: Bearer <CRON_SECRET>`. Controleer na deployment de Cron Jobs-instellingen en logs. Dit fragment is een extra sleutel, geen vervanging van het volledige configuratiebestand.

**Vercel Hobby met externe scheduler:** configureer een taak iedere minuut naar `APP_URL/api/jobs/maintenance`, methode **POST**, met header `Authorization: Bearer <JOB_SECRET>`. Bewaar het geheim in de schedulerconfiguratie, nooit in de URL. Als de scheduler scripts uitvoert, kan hij `node scripts/run-maintenance.mjs` gebruiken met APP_URL en JOB_SECRET in zijn environment. Laat de scheduler geen gelijktijdige retries stapelen; gebruik een requesttimeout van 120 seconden.

Hobby ondersteunt alleen dagelijkse native cron; daarom bevat de standaardconfiguratie geen cron die deployment op Hobby zou laten mislukken. Zie [Vercels cronlimieten](https://vercel.com/docs/cron-jobs/usage-and-pricing) en [cronbeveiliging](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Verwacht bij correct onderhoud HTTP 200. `watchtime: contract_not_verified` is in deze fase normaal. 401 betekent een onjuist/ontbrekend schedulergeheim; 503 wijst op ontbrekende configuratie of een integratie/databasefout. Onderhoud start na 45 seconden geen nieuwe accountvalidaties meer, verwerkt maximaal 25 accounts en heeft een functionlimiet van 120 seconden. Bewaak bij groei of autorisaties tijdig gevalideerd blijven.

Controleer eventuele Vercel Deployment Protection. Een externe scheduler kan een door Vercel voorgeschreven automation-bypassheader nodig hebben; het meegeleverde script voegt die niet automatisch toe. De publieke Twitch-webhook moet voor Twitch bereikbaar zijn.

## 9. Test de echte player en streamstatus

Ga live op het ingestelde Twitch-kanaal. Na een succesvolle onderhoudstaak moet de site de live-status weergeven. Test player, geluid/autoplay en navigatie tussen Home, Vault en Account. Test ook op een telefoon. Stop de stream en controleer dat de volgende onderhoudstaak de offline-status verwerkt.

Veelvoorkomende fouten: onjuiste broadcaster-ID, ontbrekende clientcredentials of een hostname die niet in `TWITCH_EMBED_PARENTS` staat. Een geblokkeerde autoplay kan een gebruikersklik vereisen.

## 10. Wat daarna nog nodig is

De webhookroute is gebouwd, maar EventSub-abonnementen zijn nog niet aangemaakt. Voor snellere statusupdates moeten `stream.online` en `stream.offline` voor de juiste broadcaster worden geregistreerd op `APP_URL/api/twitch/webhook`, met hetzelfde EVENTSUB_SECRET. Een werkende scheduler kan de status al ophalen zonder deze abonnementen. Laat registratie en verificatie als aparte integratiestap uitvoeren; alleen de webhook-URL invullen in Vercel maakt geen abonnement aan.

Automatische kijktijdpunten zijn nog niet actief. Daarvoor volgen een echte read-only StreamElements-contractproef, geverifieerde accountmapping en de syncworker. StreamElements blijft uitsluitend kijktijdbron. De eigen PostgreSQL-database blijft de bron voor Vault Points. The Vault gebruikt alleen die gratis punten; zie `vault.md` voor de regels die het buiten de Kansspelwet houden.

Voor openbaar gebruik moeten ook de echte contactgegevens en het definitieve privacy-/verwijderingsbeleid worden ingevuld. Bekijk `docs/handoff.md` voor de resterende productfasen. Een geslaagde deployment is geen bewijs dat alle externe integraties zijn getest.

## Technische hostingkeuzes

Node.js 24 is [ondersteund door Vercel](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions). PostgreSQL gebruikt een kleine gedeelde pool en Vercels [attachDatabasePool](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) voor het vrijgeven van idle verbindingen bij suspenderen. De productiecode opent geen lokale demodatabase. Preview krijgt geen productiesecrets; integratiepreviews vragen een aparte database, aparte secrets en een vaste geregistreerde callback/origin.
