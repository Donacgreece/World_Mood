# Moodaro v0.0.3

**Feel the world together.**

Moodaro is a playful, privacy-first social mood map. It keeps the real-data-only backend and anonymous check-in model from the previous World Mood builds, but replaces the entire visual identity with the new Moodaro brand.

## v0.0.3 highlights

- Full Moodaro rebrand across UI, PWA, favicon, app icon, splash screens and social artwork
- New emotive location-pin mascot logo
- Playful consumer-social visual system with violet, blue, cyan and pink gradients
- New desktop top navigation and redesigned home hero
- Quick mood entry strip on the home screen
- Existing live Supabase check-ins, reactions, journal and real-data-only map retained
- Emoji-led map pins and clearer selected-area mood feedback
- 30x desktop zoom, pinch zoom on mobile and high-detail 50m world geometry
- English-only UI
- Light, dark and system appearance modes
- Responsive layouts for mobile, tablet, desktop and ultrawide
- PWA installation and updated iOS splash artwork
- GitHub Pages deployment through Actions

## Backend

The project continues to use the existing Supabase backend configured through GitHub Actions variables/secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No simulated public activity is generated. Empty map regions remain empty until real users submit moods.

## Deploy

Run `push-moodaro.ps1` from PowerShell. It clones `Donacgreece/World_Mood`, mirrors this complete build, pushes `main`, and watches the GitHub Pages workflow.

Current GitHub Pages URL: `https://donacgreece.github.io/World_Mood/`

The future public brand domain is intended to be `Moodaro.com` once purchased and connected.
