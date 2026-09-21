# Changelog

## 0.0.4
- Added Daily Pulse, area reveal and live-now counter.
- Added anonymous public micro-posts with reporting and server-side link blocking.
- Added Mood Rooms and live-event tagging infrastructure.
- Added Ask the World polls backed by real votes.
- Added private Mood Circles with aggregate-only shared links.
- Added Nearby Pulse, real-data Mood Waves and Moodaro Moments.
- Added 24-hour map playback and shareable area deep links.
- Added place comparison.
- Added weekly and yearly private recap share cards.
- Added Moodaro Mini PWA shortcut and daily reminder preference.
- Preserved existing v0.0.3 data and RPC compatibility.
- No simulated mood activity was introduced.


## 0.0.4-socialfix
- Fixed composer scrollbar escaping the rounded modal edge and removed native scrollbar arrow buttons.
- Removed Private Mood Circles from the main UI because the share flow was not self-explanatory enough.
- Replaced the Circles card with a private Your Mood Journey / Weekly Pulse card using only local journal data.
- Existing circle backend schema remains untouched for backward compatibility.


## 0.0.4-headerfix
- Removed the desktop top gap above the sticky header.
- Unified the page and header top-edge background.
- Increased header opacity slightly to prevent a visible hue seam.
- Preserved mobile safe-area and sticky behavior.


## 0.0.4-floatingheaderfix
- Restored the original floating glass desktop header with 10px top breathing room.
- Removed the full-width pinned-header appearance introduced by the previous patch.
- Neutralized only the narrow decorative color strip above the floating header.
- Kept the glass transparency, rounded corners, sticky behavior and mobile safe-area behavior unchanged.

## 0.0.4-migrationsync
- Added the five versioned Supabase migration files that match the production migration history.
- Fixed GitHub Supabase Preview failure: `Remote migration versions not found in local migrations directory`.
- No production data or live RPC behavior changed.


## 0.0.4-reminderfix
- Renamed the 2-hour map range from Now to 2H for clarity.
- Changed the default map range to 24H.
- Added a locally saved time picker for Daily Pulse reminders.
- Reminder scheduling now respects the selected local time and skips days with an existing check-in.


## 0.0.4-coffeefix
- Removed the live-network status pill from the global header.
- Added a Buy Me a Coffee support button linking to https://buymeacoffee.com/moodaro.
- Kept live network status inside the product surfaces where it is contextually useful.
- Added compact responsive support-button behavior for mobile.


## 0.0.4-composerfix
- Moved composer scrolling into an inner container so the scrollbar stays clipped inside the rounded modal.
- Added responsive reason-chip sizing and wrapping to prevent labels from overflowing at any width or browser zoom.


## 0.0.4-symmetryfix
- Unified reason and mood-room controls into matching 3-column desktop grids.
- Standardized button height, width, gaps and label alignment.
- Centered the standalone Other reason in the final row.
- Equalized both context panel heights for a balanced composer layout.


## 0.0.4-pinclarity
- Enlarged the white face area inside map pins without enlarging the overall pin footprint.
- Increased emoji size and centered it correctly inside the pin face.
- Reduced pin glow for better legibility when markers are close together.
- Added explicit color-emoji font fallbacks for more consistent rendering across iOS, Windows and Android.
