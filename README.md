# TraceCycle (web version)

**Traceable waste, verified recovery.** / हर किलो का हिसाब।

WhyCode4U Hackathon 2026, Track 2, Problem 2: *Waste to Worth*.

This is the **no-install version**: plain HTML, CSS and JavaScript (35 files, no build step). No npm, no Python, no database to set up. All data is synthetic and is saved in your browser (localStorage), so it stays when you reload.

## Feature map (where to find each one)

| # | Feature | Where in the app |
|---|---|---|
| 1 | AI waste classification | Household → Book pickup → *Take or choose a photo* (Gemini key in Settings, or Claude on claude.ai) |
| 2 | AI contamination detection + cleaning steps | Same result card: contamination level, what was noticed, *To help it get recycled*, *Listen* |
| 3 | Smart waste quality score (0–100, grade A–D) | Booking result card; household list; passport (*estimated at home* vs *measured at the recycler*); Analytics → *How good is the home check?* |
| 4 | Smart pickup route optimisation | Collector → Today's route: *Booking order* vs *Optimised*, distance saved, priority stops, drop-off when full |
| 5 | Waste hotspot detection | Admin → Hotspots (map shading by pending pickups, suggestion for the busiest ward) |
| 6 | Demand prediction | Admin → Analytics (Holt trend forecast with likely range, per ward) and Hotspots |
| 7 | Digital Waste Passport | Any bag or bundle → passport page (journey, map, outcome, print certificate) |
| 8 | QR code tracking | QR on every passport and sticker; *Scan QR with camera* on Track a bag and in the receive dialog |
| 9 | Tamper-evident event history | Passport → integrity seal; Admin → Demo controls → *Tamper with a record* |
| 10 | Batch merging and lineage | Aggregator → tick bags → *Make bundle*; passport shows parent/child bags |
| 11 | Anomaly detection | Automatic flags: weight mismatch, duplicate scan, repeated mismatch, unusual rejection → Admin → Flags, People |
| 12 | Waste impact calculator | Admin → Analytics → Impact and *Emission factors* (CO₂e only with a sourced factor) |
| 13 | Recycling performance analytics | Admin → Analytics → *Recycler performance* (recovery, turnaround, main rejection reason) |
| 14 | Green rewards and gamification | Household → Green Score (points, badges, ward leaderboard, Green Champion) |
| 15 | Hindi voice assistant | Green *Voice help* button on every page; voice type picker on the booking page |
| 16 | Smart notifications | Bell icon: filters (pickups, hand-offs, flags, recycled), unread state, live pop-ups |
| 17 | Offline-first collector mode | Collector → *Try offline mode*: pickups and hand-offs are queued and synced later, duplicates ignored, failures kept with the reason |
| 18 | Multilingual interface | English / हिंदी in the top bar, everywhere |
| 19 | Role-based dashboards | Summary line at the top of every role's page |
| 20 | Nearest collectors | Book pickup → map shows trucks near your pin, distance, pickups left, who serves your ward (updates as you move the pin) |
| 21 | Live pickup tracking | My pickups → *Where is my collector?*: stop number, arrival estimate, distance, map |
| 23 | Uber-style dispatch | A new booking goes to the **nearest on-duty collector** as a *New pickup request* card (Accept / Decline, 90-second timer). Declined or not answered → next nearest. Nobody → ward collector, admin notified. Collectors switch *On duty / Off duty* |
| 24 | Trucks around your location | Booking map shows all collectors as 🚚 with distance and arrival time; *Use my location* far from the sample village offers **Show around my location**, which moves the whole demo village (homes, trucks, wards) to where you are. Home → Village map has the same button |
| 25 | Notifications with QR | After pickup, the household's notification shows the bag's QR, *Passport* and *WhatsApp* buttons |
| 22 | Pickup handshake code | Household sees a 4-digit code; the collector types it when confirming. Wrong code is refused; no code raises a low-risk flag. Stops fake pickups |

Also: phone + OTP login and household self-registration, live maps (street and satellite), audit log, CSV export, accessibility bar, light and dark mode.

## AI photo check

- **On your own computer or a hosted copy:** open **Settings** (gear icon) and paste a Google Gemini API key from Google AI Studio. The key stays only in that browser. Use it for demos only.
- **Inside claude.ai** (the shared preview link): the check uses Claude and asks your permission the first time.
- **No key:** the app says the check is off and the household picks the type from the picture guide. It never makes up a result.

## Logging in

1. Press **Log in** (or a role card on the home page).
2. **Choose who you are:** Household, Collector, Aggregator, Recycler or Panchayat admin. Each role opens its own pages.
3. Enter the mobile number registered for that role and press **Send OTP**. The code appears in a box marked **SMS (simulated)** because this prototype has no SMS service. Each code is random, lasts 5 minutes and allows 5 tries.

- If the number belongs to another role, the page says which role to choose.
- **New households** register themselves (Household → *New household*).
- **New collectors, aggregators and recyclers** are added by the admin: *Admin → People → Add staff*. They can log in straight away with that number.
- Under the login form, *Testing this prototype?* shows the sample number for the chosen role.

Sample numbers in the synthetic data:

| Role | Mobile number | Name |
|---|---|---|
| Household | 9000000001 | Sunita Devi (Ward 4) |
| Collector | 9000000002 | Raju Kumar |
| Aggregator | 9000000003 | Shyam Scrap Traders |
| Recycler | 9000000004 | Green Polymers Recycling Unit |
| Panchayat admin | 9000000005 | Panchayat Secretary |
| Collector | 9000000006 | Mohan Lal (wards 5–6) |

## Maps

Real, zoomable maps (Leaflet) with **Map** and **Satellite** layers on: the booking page (drag or click to place the pickup pin, or *Use my location*), the collector's route, every passport (*Where it went*), the admin overview and ward hotspots.
They need an internet connection for the map tiles. Offline, or inside claude.ai (which blocks map tiles), the app draws a simple sketch with the same markers instead.

## Five-minute demo

1. **Household** (log in with 9000000001, or register a new household): *Book pickup*. Choose the type (or say it), size and time, drag the pin on the map, book. It appears on the collector's route.
2. **Collector:** *Today's route*. Switch *Booking order* / *Optimised* and compare the distances (calculated, not made up). *Confirm* a pickup with a weight; a batch ID and QR code appear.
3. **Collector → My bags:** *Hand off* the bag. The matching shows why each receiver is suggested.
4. **Aggregator:** *Scan to receive*, type the batch ID and a weight. Enter a weight about 30% lower to see a high-risk flag. Tick several PET bags and *Make bundle*, then hand the bundle to Green Polymers.
5. **Recycler:** receive the bundle and *Record outcome* (recovered + rejected, with a reason).
6. **Admin:** *Overview* (each kilo counted once, traced %, charts, map), *Hotspots* (which ward is waiting, next-week estimate), *Flags* (Mohan Lal already has a repeated-mismatch flag from the seed data), *People*, *Audit log*, *Download CSV*, and *Demo controls*. Run **Tamper with a record**, then open `TC-2026-0088`: the integrity seal turns red and names the edited event.
7. **Household again:** *Green Score* shows points from verified events and the ward leaderboard.

Use the top bar for **हिंदी**, text size and high contrast. **Reset demo data** in the yellow bar brings everything back to the start.

---

## How it works

- **Status machine:** `scheduled → picked_up → in_transit → at_aggregator → (merged) → in_transit → at_recycler → processed`. Every move checks the role allowed to make it (`js/services/lifecycle.js`).
- **Counting once:** collected = pickup weights only; recovered and rejected = recycler outcomes only. Hand-offs and bundles are movement (`js/pages/admin.js`, `stats()`).
- **Hash chain:** each event stores `SHA-256(event + previous hash)`. Editing any saved event breaks the chain from that point (`js/core/hash.js`). Works without internet; there is a plain JavaScript SHA-256 if the browser hides Web Crypto.
- **Weight check:** a hand-off more than 5% off raises a flag (over 15% is high risk). Scanning a bag you already received is refused and logged.
- **Route:** Haversine distance, high-priority stops first (wet waste, large bags), nearest neighbour then 2-opt, drop-off when the cart is full (`js/core/geo.js`).
- **Pages** use hash links (`#/collector`, `#/passport/TC-2026-0088`), so they work from a file, Live Server or any static host.

## Folder layout

```
TraceCycle-Web/
  index.html              loads the CSS and the scripts in order
  assets/css/             base (tokens, light and dark), layout, components, pages
  assets/img/             logo and favicon
  js/data/                translations (English, Hindi), synthetic seed data
  js/core/                state and storage, hash chain, route maths
  js/services/            lifecycle rules and anomaly checks, analytics, rewards, voice, AI photo check
  js/ui/                  layout, components, map, dialogs
  js/pages/               one file per page
  js/app/                 router and event wiring
```

## If something looks wrong

- **Blank page:** press F12 → Console and read the first red line. Make sure all folders were extracted from the zip (not opened inside the zip).
- **Old data after changes:** click *Reset demo data*, or clear the site's storage in the browser.
- **No QR image:** the QR library loads from the internet; without a connection the batch ID is shown instead.

## Honest limitations

- Synthetic data only, stored in one browser; nothing is shared between devices.
- The AI photo check needs a Gemini key (Settings) or claude.ai. Keys kept in a browser are fine for demos, not for production; the full app keeps them on the server.
- The next-week number per ward is a simple three-week average on synthetic data, not a forecast. CO₂e is not shown because no sourced emission factors were added.
- A bag's share of a bundle's outcome is an estimate, not proof for that exact bag.
- The hash chain detects later edits, not a wrong weight entered the first time; the two-sided weight check is there for that.
- Distances are straight-line estimates.
