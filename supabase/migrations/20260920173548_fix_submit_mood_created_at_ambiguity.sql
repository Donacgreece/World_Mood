-- Mirrors remote migration 20260920173548_fix_submit_mood_created_at_ambiguity.
create or replace function public.submit_mood(
  p_mood_score numeric,
  p_emotion text,
  p_intensity integer,
  p_reason text default null,
  p_lat_bucket numeric default null,
  p_lng_bucket numeric default null,
  p_country_code text default null,
  p_actor_hash text default null
)
returns table(id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_created timestamptz;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_ACTOR';
  end if;

  if p_mood_score < 1 or p_mood_score > 10 then raise exception 'INVALID_SCORE'; end if;
  if p_emotion not in ('great','good','calm','okay','low','stressed','angry','tired') then raise exception 'INVALID_EMOTION'; end if;
  if p_intensity < 1 or p_intensity > 5 then raise exception 'INVALID_INTENSITY'; end if;
  if p_reason is not null and p_reason not in ('work','family','money','health','love','weather','other') then raise exception 'INVALID_REASON'; end if;
  if p_lat_bucket is not null and (p_lat_bucket < -90 or p_lat_bucket > 90 or mod(p_lat_bucket * 2, 1) <> 0) then raise exception 'INVALID_LAT'; end if;
  if p_lng_bucket is not null and (p_lng_bucket < -180 or p_lng_bucket > 180 or mod(p_lng_bucket * 2, 1) <> 0) then raise exception 'INVALID_LNG'; end if;
  if p_country_code is not null and p_country_code !~ '^[A-Za-z]{2}$' then raise exception 'INVALID_COUNTRY'; end if;

  if exists (
    select 1
    from public.mood_entries m
    where m.actor_hash = p_actor_hash
      and m.created_at > now() - interval '45 seconds'
  ) then
    raise exception 'RATE_LIMIT';
  end if;

  insert into public.mood_entries (
    mood_score, emotion, intensity, reason, lat_bucket, lng_bucket, country_code, actor_hash
  ) values (
    round(p_mood_score, 1), p_emotion, p_intensity, p_reason,
    p_lat_bucket, p_lng_bucket, upper(p_country_code), p_actor_hash
  )
  returning mood_entries.id, mood_entries.created_at into v_id, v_created;

  return query select v_id, v_created;
end;
$$;
