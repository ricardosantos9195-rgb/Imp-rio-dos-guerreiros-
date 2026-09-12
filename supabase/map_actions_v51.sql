-- Império dos Guerreiros v0.51 — marchas e ações autoritativas do mapa
-- Executar depois de map_v50.sql.

create or replace function public.start_map_action(target_entity_id uuid, action_type text, troop_count integer)
returns public.marches
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.map_entities;
  home public.castles;
  player_alliance uuid;
  player_state jsonb;
  available_troops integer;
  committed_troops integer;
  travel_seconds integer;
  result public.marches;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  if troop_count < 1 then raise exception 'Escolhe pelo menos uma tropa'; end if;

  select * into home from public.castles where user_id=auth.uid();
  if home.id is null then raise exception 'Senado não encontrado'; end if;
  select * into target from public.map_entities where id=target_entity_id and realm_id=home.realm_id for update;
  if target.id is null or target.state <> 'available' then raise exception 'Alvo indisponível'; end if;
  if (target.kind='monster' and action_type<>'hunt') or (target.kind='mine' and action_type<>'gather')
     or (target.kind='temple' and action_type<>'occupy') then raise exception 'Ação inválida para este alvo'; end if;

  select alliance_id into player_alliance from public.profiles where id=auth.uid();
  if target.kind in ('monster','temple') and player_alliance is null then
    raise exception 'Precisas de pertencer a uma aliança';
  end if;
  if target.kind='temple' and not exists(
    select 1 from public.realm_events where realm_id=home.realm_id and event_type='swz' and status='active'
      and now() between starts_at and ends_at
  ) then raise exception 'Os templos só podem ser ocupados durante o SWZ'; end if;

  select state into player_state from public.player_states where user_id=auth.uid();
  available_troops := coalesce((player_state->>'inf')::integer,0)+coalesce((player_state->>'cav')::integer,0)
                    +coalesce((player_state->>'arc')::integer,0)+coalesce((player_state->>'siege')::integer,0);
  select coalesce(sum((troops->>'count')::integer),0) into committed_troops from public.marches
    where owner_id=auth.uid() and status in ('preparing','marching','fighting','returning');
  if troop_count > available_troops-committed_troops then raise exception 'Não tens tropas livres suficientes'; end if;
  if (select count(*) from public.marches where owner_id=auth.uid() and status in ('preparing','marching','fighting','returning')) >= 5
    then raise exception 'Todas as filas de marcha estão ocupadas'; end if;

  travel_seconds := greatest(5,least(300,ceil(sqrt(power(target.x-home.x,2)+power(target.y-home.y,2))/3.0)::integer));
  insert into public.marches(realm_id,owner_id,alliance_id,march_type,source_x,source_y,target_x,target_y,troops,status,arrives_at)
  values(home.realm_id,auth.uid(),player_alliance,action_type,home.x,home.y,target.x,target.y,
         jsonb_build_object('count',troop_count),'marching',now()+make_interval(secs=>travel_seconds))
  returning * into result;
  update public.map_entities set state='marching',owner_id=auth.uid(),alliance_id=player_alliance where id=target.id;
  return result;
end;
$$;

create or replace function public.resolve_my_marches()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  march public.marches;
  target public.map_entities;
  player_power bigint;
  troops_count integer;
  victory boolean;
  reward integer;
  player_state jsonb;
  outcomes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  update public.map_entities set state='available',owner_id=null,alliance_id=null,respawns_at=null
    where state in ('depleted','defeated') and respawns_at<=now();

  for march in select * from public.marches where owner_id=auth.uid() and status='marching' and arrives_at<=now() for update
  loop
    select * into target from public.map_entities
      where realm_id=march.realm_id and x=march.target_x and y=march.target_y for update;
    if target.id is null or target.state<>'marching' or target.owner_id<>auth.uid() then
      update public.marches set status='cancelled' where id=march.id;
      outcomes:=outcomes||jsonb_build_array(jsonb_build_object('march_id',march.id,'status','cancelled'));
      continue;
    end if;
    select power into player_power from public.profiles where id=auth.uid();
    select state into player_state from public.player_states where user_id=auth.uid() for update;
    player_state:=jsonb_set(player_state,'{inventory}',coalesce(player_state->'inventory','{}'::jsonb),true);
    troops_count:=coalesce((march.troops->>'count')::integer,0);
    victory:=true;
    reward:=0;

    if target.kind='monster' then
      victory := player_power+(troops_count*25) >= (target.level*target.level*900)*(0.85+random()*0.30);
      if victory then
        reward:=target.level*900;
        player_state:=jsonb_set(player_state,'{gold}',to_jsonb(coalesce((player_state->>'gold')::bigint,0)+reward),true);
        player_state:=jsonb_set(player_state,'{food}',to_jsonb(coalesce((player_state->>'food')::bigint,0)+(reward*7/10)),true);
        player_state:=jsonb_set(player_state,'{wood}',to_jsonb(coalesce((player_state->>'wood')::bigint,0)+(reward/2)),true);
        player_state:=jsonb_set(player_state,'{diamonds}',to_jsonb(coalesce((player_state->>'diamonds')::bigint,0)+(target.level*20)),true);
        player_state:=jsonb_set(player_state,'{monstersKilled}',to_jsonb(coalesce((player_state->>'monstersKilled')::integer,0)+1),true);
        player_state:=jsonb_set(player_state,'{colossusExp}',to_jsonb(coalesce((player_state->>'colossusExp')::bigint,0)+(target.level*120)),true);
        player_state:=jsonb_set(player_state,'{inventory,colossusPieces}',to_jsonb(coalesce((player_state#>>'{inventory,colossusPieces}')::integer,0)+greatest(1,target.level/10)),true);
        update public.map_entities set state='defeated',respawns_at=now()+interval '5 minutes',owner_id=null,alliance_id=null where id=target.id;
      else
        update public.map_entities set state='available',owner_id=null,alliance_id=null where id=target.id;
      end if;
    elsif target.kind='mine' then
      reward:=target.level*850;
      player_state:=jsonb_set(player_state,array[target.subtype],to_jsonb(coalesce((player_state->>target.subtype)::bigint,0)+reward),true);
      update public.map_entities set state='depleted',respawns_at=now()+interval '5 minutes',owner_id=null,alliance_id=null where id=target.id;
    elsif target.kind='temple' then
      update public.map_entities set state='occupied',owner_id=auth.uid(),alliance_id=march.alliance_id where id=target.id;
    end if;

    update public.player_states set state=player_state,updated_at=now() where user_id=auth.uid();
    update public.profiles set power=coalesce((player_state->>'power')::bigint,power),updated_at=now() where id=auth.uid();
    update public.marches set status='finished' where id=march.id;
    insert into public.battle_reports(realm_id,attacker_id,target_kind,target_x,target_y,winner_id,result)
      values(march.realm_id,auth.uid(),target.kind,target.x,target.y,case when victory then auth.uid() end,
        jsonb_build_object('victory',victory,'reward',reward,'level',target.level,'subtype',target.subtype));
    outcomes:=outcomes||jsonb_build_array(jsonb_build_object('march_id',march.id,'status','finished','victory',victory,'reward',reward,'kind',target.kind));
  end loop;
  return outcomes;
end;
$$;

grant execute on function public.start_map_action(uuid,text,integer) to authenticated;
grant execute on function public.resolve_my_marches() to authenticated;
