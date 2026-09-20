# World Mood

**Version 0.0.1**

World Mood is a privacy-first Progressive Web App that turns real anonymous mood check-ins into a live emotional weather map of the world.

The public map contains **no demo, seeded, generated or simulated mood data**. If there are no real submissions, the map stays empty and says so clearly.

## Product principles

- English-only interface
- Real community submissions only
- No account required
- No public user profiles
- No precise location storage
- Notes stay private on the device and are never uploaded
- Responsive from small phones to ultrawide desktop displays
- Full light, dark and system appearance modes
- Installable PWA with offline private journal support
- Interactive world map with pan, wheel/trackpad zoom, zoom controls and reset

## Features

- Live global mood summary from real backend submissions
- Time ranges: Now, 24H, 7D and 30D
- Honest empty states when live data is missing
- Approximate map areas aggregated from coarse half-degree location buckets
- Real response count, mapped-area count, most common mood and period-over-period score change
- Anonymous mood composer with eight emotions, five intensity levels and optional context
- Private local journal
- Shareable World Mood card generated from live data only
- Responsive navigation for mobile, tablet and desktop
- PWA manifest, service worker, install flow, favicon, app icons and Apple touch icon
- GitHub Pages deployment workflow
- Supabase schema with Row Level Security

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Real live data with Supabase

The frontend deliberately does not fall back to fake information when no backend is connected.

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql` once.
4. In the GitHub repository settings, add:
   - Actions variable: `VITE_SUPABASE_URL`
   - Actions secret: `VITE_SUPABASE_ANON_KEY`
5. Push to `main` or rerun the Pages workflow.

The browser sends only the public Supabase anon key. Never put a service-role key in the frontend or GitHub Pages environment.

## Public data model

Shared submissions contain:

- mood score
- emotion
- intensity
- optional reason category
- optional coarse location rounded to a half-degree bucket
- server timestamp

Free-form journal notes remain only in browser storage and are never uploaded to the public database.

## Deployment

GitHub Actions builds the Vite app and deploys `dist` to GitHub Pages.

Expected project URL:

`https://donacgreece.github.io/World_Mood/`

## Stack

- React
- TypeScript
- Vite
- Vite PWA
- D3 Geo
- TopoJSON
- World Atlas
- Supabase REST
- GitHub Pages

## Privacy note

World Mood is not a diagnostic or medical product. It visualizes voluntary, anonymous self-reported check-ins and should not be interpreted as a scientific measurement of an entire population.
