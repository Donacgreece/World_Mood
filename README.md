# World Mood

**Feel the planet. Together.**

World Mood is a privacy-first live social pulse and emotional weather map. Public activity is built only from real anonymous check-ins. The application never seeds or simulates community data.

## v0.0.2 refined build

This build focuses on the live-map path and a full mobile/desktop frontend pass.

- Real Supabase RPC data only, with modern publishable-key support.
- Immediate optimistic map/feed update after a successful live check-in.
- Map placement enabled by default. Approximate browser location is requested when posting, unless the user turns it off.
- Exact GPS is never stored. Coordinates are rounded to 0.5° before sharing.
- Interactive map with drag, wheel zoom, pinch zoom, double-click zoom, controls and auto-focus on selected areas.
- Page zoom is locked on mobile while map pinch zoom remains available.
- Responsive layouts for phones, tablets, landscape, desktop and ultrawide displays.
- Purpose-built light and dark themes.
- Anonymous Live Pulse feed and Resonance interactions.
- Private local journal. Journal notes never go to Supabase.
- Unified favicon, site mark, PWA icons and launch/splash identity.
- PWA install, offline shell and safe-area support.

## Live backend

The frontend expects these GitHub Actions values:

- `VITE_SUPABASE_URL` as a repository variable.
- `VITE_SUPABASE_ANON_KEY` as a repository secret. A modern `sb_publishable_...` key is recommended.

The production database schema is in `supabase/schema.sql`.

### Important

The public base tables use RLS and deny direct anonymous table access. Public interaction happens through constrained RPC functions:

- `submit_mood`
- `get_live_moods`
- `react_to_mood`

## Deploy

From PowerShell, run `push-world-mood.ps1`. The script syncs this complete project into `Donacgreece/World_Mood`, pushes `main`, and watches the GitHub Pages workflow.

Live site: `https://donacgreece.github.io/World_Mood/`

## Map interaction hotfix

This build keeps mood markers visually stable while zooming, uses a native non-passive wheel listener so desktop map zoom never scrolls the page at the same time, and uses cooperative mobile gestures so one finger scrolls the page while two fingers control map zoom. Marker colors now include an explicit legend and selected regions show the dominant emotion, score, approximate privacy grid, and real check-in count.


### v0.0.2 UX refinement
- Clickable brand returns to Now/Home.
- iOS status bar no longer uses translucent mode.
- Mood composer has improved mobile scrolling, spacing and symmetric reason controls.
- Great + intensity 5 reaches 10.0/10.
- Private note remains on-device and is labeled ‘A private note for future you’.
