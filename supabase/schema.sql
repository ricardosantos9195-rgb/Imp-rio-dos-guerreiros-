-- Império dos Guerreiros v0.22
-- Executar uma única vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 24),
  faith text not null default 'athenas' check (faith in ('athenas','ares','apolo')),
  power bigint not null default 1240 check (power >= 0),
  alliance_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.castles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  realm_id integer not null default 1 check (realm_id > 0),
  x integer not null check (x between 0 and 999),
  y integer not null check (y between 0 and 999),
  level integer not null default 1 check (level between 1 and 30),
  faith text not null default 'athenas' check (faith in ('athenas','ares','apolo')),
  protected_until timestamptz not null default (now() + interval '24 hours'),
  unique (realm_id, x, y)
);

create table if not exists public.player_states (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null default '{"food":12500,"wood":9200,"gold":4800,"wisdom":100,"power":1240,"diamonds":0,"inf":240,"cav":140,"arc":100,"siege":0}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists castles_realm_position_idx on public.castles(realm_id, x, y);

alter table public.profiles enable row level security;
alter table public.castles enable row level security;
alter table public.player_states enable row level security;

create policy "authenticated players can see profiles" on public.profiles for select to authenticated using (true);
create policy "players update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "authenticated players can see castles" on public.castles for select to authenticated using (true);
create policy "players update own castle" on public.castles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "players see own state" on public.player_states for select to authenticated using (auth.uid() = user_id);
create policy "players update own state" on public.player_states for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_new_player()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  chosen_x integer;
  chosen_y integer;
  attempts integer := 0;
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'Guerreiro-' || left(new.id::text, 6)), 24));

  loop
    chosen_x := floor(random() * 960 + 20)::integer;
    chosen_y := floor(random() * 960 + 20)::integer;
    begin
      insert into public.castles(user_id, x, y) values(new.id, chosen_x, chosen_y);
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 30 then raise exception 'Não foi possível encontrar posição livre'; end if;
    end;
  end loop;

  insert into public.player_states(user_id) values(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_new_player();

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.castles to authenticated;
grant select, update on public.player_states to authenticated;

-- A v0.22 sincroniza o protótipo e prova o mapa multijogador.
-- Antes de batalhas competitivas, cada ação económica/militar será movida
-- para funções do servidor, evitando que um APK modificado atribua recursos.
