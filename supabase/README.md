# Moodaro live backend

Moodaro intentionally ships with no fake public activity. Shared map data starts only after a real Supabase project is connected.

1. Create a Supabase project.
2. Open the SQL Editor and run `schema.sql` in full.
3. In Supabase Project Settings > API, copy the Project URL and the public anonymous key.
4. From the Moodaro source folder run `setup-live-backend.ps1`.
5. Paste the URL and anonymous key when prompted. The script stores them as GitHub Actions configuration and starts a fresh Pages deployment.

The schema exposes anonymous clients only through three RPC functions: `submit_mood`, `get_live_moods`, and `react_to_mood`. Raw actor hashes are never returned by the feed function. Private journal notes never leave the device.
