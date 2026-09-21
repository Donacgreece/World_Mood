# Moodaro v0.0.4

Moodaro is a privacy-first live social mood network built from real anonymous pulses.

## v0.0.4

This release keeps the existing v0.0.3 live map and Supabase data, then adds viral/social loops without fabricated activity:

- Daily Pulse habit loop and post-check-in area reveal
- Optional anonymous 120-character public micro-posts
- “I feel this too” resonance feed plus community reporting
- Mood Rooms for shared situations
- Private Your Mood Journey / Weekly Pulse recap built from the on-device journal
- Ask the World anonymous poll
- Nearby Pulse from the user's latest coarse map area
- Real-data Mood Waves and Moodaro Moments with sample thresholds
- 24-hour map playback
- Shareable approximate area deep links
- Place-vs-place comparison
- Live-event backend support, displayed only when real active events exist
- Weekly recap and Moodaro Year cards generated locally
- Daily reminder preference and Moodaro Mini compact PWA view
- PWA shortcuts for check-in and Moodaro Mini
- Existing light/dark themes, PWA, splash, map zoom, journal and real Supabase network retained

## Privacy

Private journal notes remain local on the device. Public micro-posts are optional, anonymous, limited to 120 characters and reject links/email addresses. Exact GPS is not stored. Your private journal and recap data remain on this device.

## Backend

The v0.0.4 migration is additive. Existing v0.0.3 RPCs are kept for backward compatibility. See `supabase/migrations/004_social_loops.sql`.
