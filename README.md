# World Mood 🌍💜

**World Mood** is a playful, privacy-first PWA that visualizes the emotional weather of the world. People can check in anonymously, explore a living global mood map, keep a private local journal and share the current world pulse.

> Version: **0.0.1**  
> Product maturity target: feature-complete foundation, designed like a 1.0 product.

## Included in v0.0.1

- Responsive map-first interface for mobile, tablet, desktop and large screens
- Animated global mood atmosphere built with SVG, D3 Geo and Natural Earth data
- Eight emotion states with intensity, optional reason and note
- Optional coarse location. Browser coordinates are rounded to 0.5 degrees before they enter app state
- Local private mood journal stored only in the browser
- Explore dashboard with regional pulse cards and activity rankings
- Shareable 1080 × 1920 mood card generator using Canvas
- Greek and English interface
- Light, Dark and System appearance modes
- First-run onboarding
- Full PWA manifest, service worker, offline shell and install flow
- Custom favicon, app icons, maskable icon, Apple touch icon and social preview artwork
- SEO metadata, robots.txt and sitemap.xml
- GitHub Pages deployment workflow
- Optional Supabase live community backend with SQL schema and Row Level Security
- Deterministic demo-network fallback, so the public site works before backend credentials are added
- Accessibility basics, keyboard interactions and reduced-motion support

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Live community backend

The site works without a backend in demo-network mode. To enable shared community submissions:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Add repository variable `VITE_SUPABASE_URL`.
4. Add repository secret `VITE_SUPABASE_ANON_KEY`.
5. Push to `main` or manually run the Pages workflow.

The frontend uses only the public anonymous key. Never place a Supabase service-role key in the client or in GitHub Pages.

## GitHub Pages

The app is configured for:

`https://donacgreece.github.io/World_Mood/`

The Vite base path and PWA scope are already set to `/World_Mood/`.

## Privacy model

World Mood is intentionally account-free. Local journal entries remain on the device. Shared check-ins contain only the selected mood fields and, when explicitly requested by the user, a coarse 0.5-degree location bucket. No precise location is intentionally stored by the application.

For a high-traffic public launch, add server-side abuse controls or a Supabase Edge Function in front of anonymous inserts.

## Project structure

```text
src/
  components/      UI and product surfaces
  data/            deterministic demo network
  lib/             storage, sharing, Supabase adapter and types
supabase/
  schema.sql       optional live backend schema
public/            PWA icons, favicon, logo, social art, SEO files
.github/workflows/ GitHub Pages CI/CD
```

## Design principles

World Mood should feel like emotional weather, not analytics software. The map is the hero, interaction is playful and brief, privacy is visible, and the interface avoids diagnostic or medical claims.
