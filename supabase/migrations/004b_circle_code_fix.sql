create or replace function public.create_mood_circle(p_actor_hash text)
returns table(code varchar, members bigint, checkins bigint, score numeric, emotion text, latest_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code varchar(8);
  v_expires timestamptz;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_ACTOR'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.mood_circles(code, creator_hash)
    values (v_code, p_actor_hash)
    on conflict do nothing
    returning id, mood_circles.expires_at into v_id, v_expires;
    exit when v_id is not null;
  end loop;
  return query select v_code, 0::bigint, 0::bigint, null::numeric, null::text, null::timestamptz, v_expires;
end;
$$;
revoke execute on function public.create_mood_circle(text) from public, authenticated;
grant execute on function public.create_mood_circle(text) to anon;
