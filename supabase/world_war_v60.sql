-- Império dos Guerreiros v0.60: zonas, passes, alianças e objetivos globais.
-- Execute no SQL Editor do Supabase depois de schema.sql e map_v50.sql.

create extension if not exists pgcrypto;

create table if not exists public.world_zones (
  id smallint primary key check (id between 1 and 3),
  name text not null,
  min_radius_km integer not null,
  max_radius_km integer not null,
  power_multiplier numeric(6,2) not null default 1,
  unlocked boolean not null default true
);

insert into public.world_zones(id,name,min_radius_km,max_radius_km,power_multiplier,unlocked) values
  (1,'Fronteira Exterior',345,792,1.00,true),
  (2,'Domínio Interior',175,344,1.50,true),
  (3,'Coroa Central',0,174,2.50,true)
on conflict (id) do update set name=excluded.name,min_radius_km=excluded.min_radius_km,max_radius_km=excluded.max_radius_km,power_multiplier=excluded.power_multiplier;

create table if not exists public.border_passes (
  id uuid primary key default gen_random_uuid(),
  realm_id integer not null default 1,
  name text not null,
  x integer not null check (x between 0 and 1119),
  y integer not null check (y between 0 and 1119),
  target_zone smallint not null references public.world_zones(id),
  max_health bigint not null check (max_health > 0),
  health bigint not null check (health >= 0),
  owner_alliance_id uuid references public.alliances(id) on delete set null,
  shield_until timestamptz,
  unique(realm_id,name)
);

create table if not exists public.alliance_structures (
  id uuid primary key default gen_random_uuid(),
  realm_id integer not null default 1,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  structure_type text not null check (structure_type in ('fortress','watchtower','super_mine')),
  parent_structure_id uuid references public.alliance_structures(id) on delete cascade,
  x integer not null check (x between 0 and 1119),
  y integer not null check (y between 0 and 1119),
  level integer not null default 1 check (level between 1 and 25),
  health bigint not null default 1000000 check (health >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists one_alliance_fortress_per_realm on public.alliance_structures(realm_id,alliance_id) where structure_type='fortress' and active;
create index if not exists alliance_structures_map_idx on public.alliance_structures(realm_id,x,y);

create table if not exists public.alliance_buffs (
  alliance_id uuid primary key references public.alliances(id) on delete cascade,
  march_speed numeric(6,3) not null default 0.20,
  defense numeric(6,3) not null default 0.15,
  debuff_resistance numeric(6,3) not null default 0.10,
  updated_at timestamptz not null default now()
);

create table if not exists public.global_targets (
  id uuid primary key default gen_random_uuid(),
  realm_id integer not null default 1,
  target_type text not null check (target_type in ('resource_mine','monster','world_boss','throne')),
  subtype text not null,
  level integer not null check (level between 1 and 80),
  x integer not null check (x between 0 and 1119),
  y integer not null check (y between 0 and 1119),
  max_health bigint not null default 1,
  health bigint not null default 1,
  capacity bigint,
  occupied_by uuid references auth.users(id) on delete set null,
  respawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(realm_id,x,y)
);

create table if not exists public.alliance_rallies (
  id uuid primary key default gen_random_uuid(),
  realm_id integer not null default 1,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('pass','fortress','watchtower','world_boss','throne')),
  target_id uuid not null,
  status text not null default 'forming' check (status in ('forming','marching','fighting','won','lost','cancelled')),
  capacity bigint not null default 200000,
  total_power bigint not null default 0,
  launches_at timestamptz not null,
  arrives_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rally_members (
  rally_id uuid not null references public.alliance_rallies(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  troop_power bigint not null check (troop_power > 0),
  troop_payload jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  primary key(rally_id,player_id)
);

alter table public.world_zones enable row level security;
alter table public.border_passes enable row level security;
alter table public.alliance_structures enable row level security;
alter table public.alliance_buffs enable row level security;
alter table public.global_targets enable row level security;
alter table public.alliance_rallies enable row level security;
alter table public.rally_members enable row level security;

drop policy if exists world_zones_read on public.world_zones;
create policy world_zones_read on public.world_zones for select to authenticated using (true);
drop policy if exists border_passes_read on public.border_passes;
create policy border_passes_read on public.border_passes for select to authenticated using (true);
drop policy if exists structures_read on public.alliance_structures;
create policy structures_read on public.alliance_structures for select to authenticated using (true);
drop policy if exists buffs_read on public.alliance_buffs;
create policy buffs_read on public.alliance_buffs for select to authenticated using (true);
drop policy if exists targets_read on public.global_targets;
create policy targets_read on public.global_targets for select to authenticated using (true);
drop policy if exists rallies_read on public.alliance_rallies;
create policy rallies_read on public.alliance_rallies for select to authenticated using (true);
drop policy if exists rally_members_read on public.rally_members;
create policy rally_members_read on public.rally_members for select to authenticated using (true);

create or replace function public.player_alliance_id(p_user uuid default auth.uid()) returns uuid language sql stable security definer set search_path=public as $$
  select alliance_id from public.alliance_members where user_id=p_user limit 1
$$;

create or replace function public.create_alliance_structure(p_type text,p_parent uuid,p_x integer,p_y integer) returns public.alliance_structures
language plpgsql security definer set search_path=public as $$
declare a uuid; member_rank smallint; s public.alliance_structures; parent_row public.alliance_structures; radius integer;
begin
  select alliance_id,rank into a,member_rank from public.alliance_members where user_id=auth.uid();
  if a is null then raise exception 'Jogador sem aliança'; end if;
  if member_rank<4 then raise exception 'Apenas oficiais R4 e R5 podem construir território'; end if;
  if p_type not in ('fortress','watchtower','super_mine') then raise exception 'Tipo inválido'; end if;
  if p_x not between 0 and 1119 or p_y not between 0 and 1119 then raise exception 'Coordenadas inválidas'; end if;
  if p_type<>'fortress' then
    select * into parent_row from public.alliance_structures where id=p_parent and alliance_id=a and active for update;
    if not found then raise exception 'Estrutura principal inválida'; end if;
    if sqrt(power(p_x-parent_row.x,2)+power(p_y-parent_row.y,2))>190 then raise exception 'Estrutura fora da ligação territorial'; end if;
  end if;
  insert into public.alliance_structures(realm_id,alliance_id,structure_type,parent_structure_id,x,y)
  values(1,a,p_type,p_parent,p_x,p_y) returning * into s;
  radius:=case when p_type='fortress' then 125 when p_type='watchtower' then 80 else 45 end;
  insert into public.alliance_territories(realm_id,alliance_id,min_x,max_x,min_y,max_y,source_type)
  values(1,a,greatest(0,p_x-radius),least(1119,p_x+radius),greatest(0,p_y-radius),least(1119,p_y+radius),'fortress');
  insert into public.alliance_buffs(alliance_id) values(a) on conflict(alliance_id) do nothing;
  return s;
end $$;

create or replace function public.create_rally(p_target_kind text,p_target_id uuid,p_power bigint,p_launch_seconds integer default 300) returns public.alliance_rallies
language plpgsql security definer set search_path=public as $$
declare a uuid; r public.alliance_rallies;
begin
  a:=public.player_alliance_id();
  if a is null then raise exception 'Jogador sem aliança'; end if;
  if p_power<=0 or p_launch_seconds not between 60 and 1800 then raise exception 'Parâmetros inválidos'; end if;
  insert into public.alliance_rallies(alliance_id,leader_id,target_kind,target_id,total_power,launches_at)
  values(a,auth.uid(),p_target_kind,p_target_id,p_power,now()+make_interval(secs=>p_launch_seconds)) returning * into r;
  insert into public.rally_members(rally_id,player_id,troop_power) values(r.id,auth.uid(),p_power);
  return r;
end $$;

create or replace function public.join_rally(p_rally uuid,p_power bigint,p_payload jsonb default '{}'::jsonb) returns public.alliance_rallies
language plpgsql security definer set search_path=public as $$
declare r public.alliance_rallies; a uuid;
begin
  a:=public.player_alliance_id();
  select * into r from public.alliance_rallies where id=p_rally for update;
  if not found or r.status<>'forming' or r.launches_at<=now() then raise exception 'Rally indisponível'; end if;
  if r.alliance_id<>a then raise exception 'Rally de outra aliança'; end if;
  if r.total_power+p_power>r.capacity then raise exception 'Capacidade excedida'; end if;
  insert into public.rally_members(rally_id,player_id,troop_power,troop_payload) values(p_rally,auth.uid(),p_power,p_payload)
    on conflict(rally_id,player_id) do update set troop_power=excluded.troop_power,troop_payload=excluded.troop_payload;
  update public.alliance_rallies set total_power=(select coalesce(sum(troop_power),0) from public.rally_members where rally_id=p_rally) where id=p_rally returning * into r;
  return r;
end $$;

create or replace function public.resolve_alliance_rally(p_rally uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.alliance_rallies; p public.border_passes; target public.global_targets; damage bigint; won boolean:=false;
begin
  select * into r from public.alliance_rallies where id=p_rally for update;
  if not found then raise exception 'Rally inexistente'; end if;
  if r.alliance_id<>public.player_alliance_id() then raise exception 'Rally de outra aliança'; end if;
  if r.status<>'forming' or r.launches_at>now() then raise exception 'O rally ainda não pode ser resolvido'; end if;
  damage:=greatest(1,r.total_power);
  if r.target_kind='pass' then
    select * into p from public.border_passes where id=r.target_id for update;
    if not found then raise exception 'Portão inexistente'; end if;
    update public.border_passes set health=greatest(0,health-damage),owner_alliance_id=case when health-damage<=0 then r.alliance_id else owner_alliance_id end,
      shield_until=case when health-damage<=0 then now()+interval '24 hours' else shield_until end where id=p.id returning health=0 into won;
  elsif r.target_kind in ('world_boss','throne') then
    select * into target from public.global_targets where id=r.target_id for update;
    if not found then raise exception 'Alvo inexistente'; end if;
    update public.global_targets set health=greatest(0,health-damage),respawn_at=case when health-damage<=0 then now()+interval '6 hours' else respawn_at end where id=target.id returning health=0 into won;
  else
    raise exception 'Tipo de alvo ainda não suportado';
  end if;
  update public.alliance_rallies set status=case when won then 'won' else 'lost' end,arrives_at=now() where id=r.id;
  return jsonb_build_object('rally_id',r.id,'damage',damage,'victory',won);
end $$;

grant select on public.world_zones,public.border_passes,public.alliance_structures,public.alliance_buffs,public.global_targets,public.alliance_rallies,public.rally_members to authenticated;
grant execute on function public.create_alliance_structure(text,uuid,integer,integer) to authenticated;
grant execute on function public.create_rally(text,uuid,bigint,integer) to authenticated;
grant execute on function public.join_rally(uuid,bigint,jsonb) to authenticated;
grant execute on function public.resolve_alliance_rally(uuid) to authenticated;

insert into public.border_passes(realm_id,name,x,y,target_zone,max_health,health) values
 (1,'Portão Norte',560,330,2,1800000,1800000),(1,'Portão Sul',560,790,2,1800000,1800000),
 (1,'Portão Oeste',330,560,2,1800000,1800000),(1,'Portão Este',790,560,2,1800000,1800000),
 (1,'Passagem Norte',560,185,3,4800000,4800000),(1,'Passagem Sul',560,935,3,4800000,4800000),
 (1,'Passagem Oeste',185,560,3,4800000,4800000),(1,'Passagem Este',935,560,3,4800000,4800000)
on conflict(realm_id,name) do update set x=excluded.x,y=excluded.y,target_zone=excluded.target_zone,max_health=excluded.max_health;

insert into public.global_targets(realm_id,target_type,subtype,level,x,y,max_health,health,capacity,metadata) values
 (1,'throne','Fortaleza do Trono Supremo',80,560,560,250000000,250000000,null,'{"event":"kvk"}'),
 (1,'world_boss','Minotauro Ancestral',38,250,250,6840000,6840000,null,'{"loot":"forge_mythic"}'),
 (1,'world_boss','Hidra Imperial',55,870,240,9900000,9900000,null,'{"loot":"forge_mythic"}'),
 (1,'world_boss','Ciclope do Abismo',70,900,890,12600000,12600000,null,'{"loot":"forge_mythic"}'),
 (1,'world_boss','Serpente Titânica',80,210,910,14400000,14400000,null,'{"loot":"forge_mythic"}')
on conflict(realm_id,x,y) do update set subtype=excluded.subtype,level=excluded.level,max_health=excluded.max_health;

create or replace function public.world_zone_at(p_x integer,p_y integer) returns smallint language sql immutable as $$
  select case when sqrt(power(p_x-560,2)+power(p_y-560,2))<=174 then 3
              when sqrt(power(p_x-560,2)+power(p_y-560,2))<=344 then 2 else 1 end::smallint
$$;

create or replace function public.alliance_can_enter_zone(p_alliance uuid,p_zone smallint) returns boolean
language sql stable security definer set search_path=public as $$
  select p_zone=1 or exists(select 1 from public.border_passes where realm_id=1 and target_zone=p_zone and owner_alliance_id=p_alliance and health=0)
$$;

create or replace function public.teleport_castle(target_x integer,target_y integer) returns public.castles
language plpgsql security definer set search_path=public as $$
declare result public.castles; home public.castles; a uuid; target_zone smallint; foreign_land uuid; kvk_open boolean;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  if target_x not between 0 and 1119 or target_y not between 0 and 1119 then raise exception 'Coordenada inválida'; end if;
  select * into home from public.castles where user_id=auth.uid() for update;
  if not found then raise exception 'Senado não encontrado'; end if;
  a:=public.player_alliance_id(); target_zone:=public.world_zone_at(target_x,target_y);
  if target_zone>public.world_zone_at(home.x,home.y) and not public.alliance_can_enter_zone(a,target_zone) then raise exception 'A tua aliança ainda não conquistou um portão para esta zona'; end if;
  if sqrt(power(target_x-560,2)+power(target_y-560,2))<95 then raise exception 'Campo imediato do Trono reservado para guerra'; end if;
  if exists(select 1 from public.castles where realm_id=home.realm_id and x=target_x and y=target_y and user_id<>auth.uid()) then raise exception 'Quadrado ocupado'; end if;
  if exists(select 1 from public.map_entities where realm_id=home.realm_id and x=target_x and y=target_y and state not in ('depleted','defeated')) then raise exception 'Quadrado ocupado'; end if;
  select exists(select 1 from public.realm_events where realm_id=home.realm_id and event_type='kvk' and status='active' and now() between starts_at and ends_at) into kvk_open;
  select alliance_id into foreign_land from public.alliance_territories where realm_id=home.realm_id and target_x between min_x and max_x and target_y between min_y and max_y and alliance_id is distinct from a limit 1;
  if foreign_land is not null and not kvk_open then raise exception 'Território inimigo bloqueado fora do KVK'; end if;
  update public.castles set x=target_x,y=target_y,protected_until=now()+interval '10 minutes' where user_id=auth.uid() returning * into result;
  return result;
end $$;

create or replace function public.random_teleport_castle() returns public.castles
language plpgsql security definer set search_path=public as $$
declare result public.castles; home public.castles; tx integer; ty integer; a uuid; item_count integer; ps jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  select * into home from public.castles where user_id=auth.uid() for update;
  select state into ps from public.player_states where user_id=auth.uid() for update;
  item_count:=coalesce((ps#>>'{inventory,randomTeleports}')::integer,0);
  if item_count<1 then raise exception 'Sem teletransportes aleatórios'; end if;
  a:=public.player_alliance_id();
  for attempt in 1..350 loop
    tx:=floor(random()*1120)::integer;ty:=floor(random()*1120)::integer;
    continue when not public.alliance_can_enter_zone(a,public.world_zone_at(tx,ty));
    continue when sqrt(power(tx-560,2)+power(ty-560,2))<95;
    continue when exists(select 1 from public.castles where realm_id=home.realm_id and x=tx and y=ty);
    continue when exists(select 1 from public.map_entities where realm_id=home.realm_id and x=tx and y=ty and state not in ('depleted','defeated'));
    continue when exists(select 1 from public.alliance_territories t where t.realm_id=home.realm_id and tx between t.min_x and t.max_x and ty between t.min_y and t.max_y and t.alliance_id is distinct from a and not exists(select 1 from public.realm_events e where e.realm_id=home.realm_id and e.event_type='kvk' and e.status='active' and now() between e.starts_at and e.ends_at));
    update public.castles set x=tx,y=ty,protected_until=now()+interval '10 minutes' where user_id=auth.uid() returning * into result;
    update public.player_states set state=jsonb_set(state,'{inventory,randomTeleports}',to_jsonb(item_count-1),true),updated_at=now() where user_id=auth.uid();
    return result;
  end loop;
  raise exception 'Não foi encontrado um quadrado permitido';
end $$;

grant execute on function public.teleport_castle(integer,integer) to authenticated;
grant execute on function public.random_teleport_castle() to authenticated;

create or replace function public.enforce_world_zone_march() returns trigger
language plpgsql security definer set search_path=public as $$
declare source_zone smallint; target_zone smallint;
begin
  source_zone:=public.world_zone_at(new.source_x,new.source_y);
  target_zone:=public.world_zone_at(new.target_x,new.target_y);
  if target_zone>source_zone and not public.alliance_can_enter_zone(new.alliance_id,target_zone) then
    raise exception 'Marcha bloqueada pelas montanhas: conquista primeiro um Portão de Fronteira';
  end if;
  return new;
end $$;

drop trigger if exists enforce_world_zone_march_trigger on public.marches;
create trigger enforce_world_zone_march_trigger before insert or update of target_x,target_y on public.marches
for each row execute function public.enforce_world_zone_march();
