-- World Mood v0.0.1
-- Real community data only. Run in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  mood_score numeric(3,1) not null check (mood_score >= 1 and mood_score <= 10),
  emotion text not null check (emotion in ('great','good','calm','okay','low','stressed','angry','tired')),
  intensity smallint not null check (intensity between 1 and 5),
  reason text null check (reason is null or reason in ('work','family','money','health','love','weather','other')),
  lat_bucket numeric(5,1) null check (
    lat_bucket is null or (
      lat_bucket between -90 and 90
      and mod(lat_bucket * 2, 1) = 0
    )
  ),
  lng_bucket numeric(5,1) null check (
    lng_bucket is null or (
      lng_bucket between -180 and 180
      and mod(lng_bucket * 2, 1) = 0
    )
  ),
  country_code varchar(3) null,
  created_at timestamptz not null default now()
);

-- Notes are intentionally device-only. Remove an older column if an earlier schema created it.
alter table public.mood_entries drop column if exists note;

create index if not exists mood_entries_created_at_idx on public.mood_entries (created_at desc);
create index if not exists mood_entries_geo_idx on public.mood_entries (lat_bucket, lng_bucket)
where lat_bucket is not null and lng_bucket is not null;

alter table public.mood_entries enable row level security;

drop policy if exists "public can read recent moods" on public.mood_entries;
create policy "public can read recent moods"
on public.mood_entries for select
to anon
using (created_at > now() - interval '90 days');

drop policy if exists "public can submit valid moods" on public.mood_entries;
create policy "public can submit valid moods"
on public.mood_entries for insert
to anon
with check (
  mood_score between 1 and 10
  and intensity between 1 and 5
  and created_at between now() - interval '5 minutes' and now() + interval '5 minutes'
  and (lat_bucket is null or mod(lat_bucket * 2, 1) = 0)
  and (lng_bucket is null or mod(lng_bucket * 2, 1) = 0)
);

-- Optional retention cleanup:
-- delete from public.mood_entries where created_at < now() - interval '90 days';
