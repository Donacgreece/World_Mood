-- Mirrors remote migration 20260920172730_world_mood_v0_0_2_security_hardening.
-- Defense in depth for direct Data API access.
revoke execute on function public.submit_mood(numeric, text, integer, text, numeric, numeric, text, text) from public, authenticated;
revoke execute on function public.get_live_moods(timestamptz, integer) from public, authenticated;
revoke execute on function public.react_to_mood(uuid, text) from public, authenticated;

grant execute on function public.submit_mood(numeric, text, integer, text, numeric, numeric, text, text) to anon;
grant execute on function public.get_live_moods(timestamptz, integer) to anon;
grant execute on function public.react_to_mood(uuid, text) to anon;

drop policy if exists "deny direct mood entry access" on public.mood_entries;
create policy "deny direct mood entry access" on public.mood_entries
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists "deny direct reaction access" on public.mood_reactions;
create policy "deny direct reaction access" on public.mood_reactions
as restrictive for all to anon, authenticated
using (false) with check (false);
