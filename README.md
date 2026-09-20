# World Mood v0.0.2

**Feel the planet. Together.**

World Mood is a privacy-first PWA that turns real anonymous mood check-ins into a living social pulse and emotional weather map. Version 0.0.2 removes all simulated activity and strengthens the project as a social product rather than a static mood visualization.

## What changed in v0.0.2

- English-only interface
- No demo, seeded or fake public mood data
- Real shared data architecture through Supabase RPC functions
- Live polling every 12 seconds while the app is visible
- Anonymous social Pulse feed
- Community Resonance reactions without public profiles
- Rate-limited anonymous submissions using a one-way device hash
- Approximate geolocation with on-device country detection
- Exact GPS is discarded before a public submission is sent
- Private journal notes never leave the device
- Interactive world map with mouse wheel, trackpad, buttons, drag and mobile pinch zoom
- Page-level zoom locked on mobile while map gestures remain enabled
- Fully rebuilt responsive layout for small phones, large phones, tablets, desktop and ultrawide displays
- Refined light mode and dark mode using the existing blue, violet and pink palette
- New unified World Mood brand mark used by the site, favicon, Apple touch icon and PWA icons
- iOS startup splash assets plus a short branded standalone launch screen
- PWA manifest, offline caching and install flow
- Shareable World Mood social card generator
- GitHub Pages deployment workflow

## Public data model

The application does not expose the underlying tables directly to anonymous users. Supabase exposes only three security-definer RPC functions:

- `submit_mood`
- `get_live_moods`
- `react_to_mood`

The public feed never returns actor hashes. The actor hash exists only for basic anti-spam and one-reaction-per-device behavior. It is derived locally from a random installation identifier and is not an account, email, advertising ID or precise device fingerprint.

## Run locally

```bash
npm install
npm run dev
```

Production check:

```bash
npm run build
```

## Deploy to Donacgreece/World_Mood

From PowerShell, with `World_Mood-v0.0.2.zip` in Downloads:

```powershell
$zip="$HOME\Downloads\World_Mood-v0.0.2.zip"; $dst="$HOME\Downloads"; Expand-Archive -Path $zip -DestinationPath $dst -Force; Set-ExecutionPolicy -Scope Process Bypass -Force; & "$dst\World_Mood-v0.0.2\push-world-mood.ps1"
```

The site target is:

`https://donacgreece.github.io/World_Mood/`

## Connect the real live network

A static GitHub Pages site cannot create a shared database by itself. Create one Supabase project once, then:

1. Open the Supabase SQL Editor.
2. Run `supabase/schema.sql` in full.
3. Copy the Project URL and public anonymous key from Supabase Project Settings > API.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$HOME\Downloads\World_Mood-v0.0.2\setup-live-backend.ps1"
```

The script copies the schema to your clipboard, asks for the Project URL and anonymous key, stores them in GitHub Actions as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then triggers a fresh Pages deployment.

Until this one-time backend setup is completed, World Mood deliberately shows an empty live network. It never fills the map with invented activity.

## Privacy behavior

- No account is required.
- No public profile is created.
- Journal notes stay in localStorage only.
- Exact location is used only in memory long enough to identify the country and round coordinates to a 0.5 degree bucket.
- Only the rounded location is eligible for public submission.
- Public social reactions are anonymous.
- The app is non-diagnostic and is not intended to infer health conditions.
