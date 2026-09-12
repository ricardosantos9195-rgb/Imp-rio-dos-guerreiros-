(function () {
  'use strict';

  const config = window.IMPERIO_ONLINE_CONFIG || {};
  const enabled = /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || '') && (config.anonKey || '').length > 20;
  const status = document.querySelector('#onlineStatus');
  const authStatus = document.querySelector('#authStatus');
  const TOKEN_KEY = 'imperio-online-session';
  let session = null;
  let lastSaved = '';
  let ownAllianceId = null;
  let serverActionPending = false;

  function message(text, error) {
    authStatus.textContent = text;
    authStatus.style.color = error ? '#ff8b82' : '#8ff0ad';
  }

  function setConnection(connected, label) {
    status.textContent = connected ? '● Online · ' + label : '● ' + label;
    status.classList.toggle('connected', connected);
  }

  async function request(path, options) {
    const headers = Object.assign({apikey: config.anonKey, 'Content-Type': 'application/json'}, options && options.headers);
    if (session && session.access_token) headers.Authorization = 'Bearer ' + session.access_token;
    const response = await fetch(config.supabaseUrl + path, Object.assign({}, options, {headers}));
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error((body && (body.msg || body.message || body.error_description || body.hint)) || 'Erro de ligação (' + response.status + ')');
    return body;
  }

  async function signUp() {
    if (!enabled) return message('O servidor ainda precisa de ser ativado.', true);
    const email = document.querySelector('#loginEmail').value.trim();
    const password = document.querySelector('#loginPassword').value;
    const name = document.querySelector('#playerName').value.trim();
    if (!name || name.length < 3) return message('Escolhe um nome com pelo menos 3 letras.', true);
    if (!email || password.length < 6) return message('Confirma o e-mail e uma palavra-passe com 6 caracteres.', true);
    message('A criar o teu castelo…');
    try {
      const data = await request('/auth/v1/signup', {method:'POST', body:JSON.stringify({email, password, data:{display_name:name}})});
      if (!data.access_token) return message('Conta criada. Confirma o e-mail e depois entra.');
      await acceptSession(data, name);
    } catch (error) { message(error.message, true); }
  }

  async function login() {
    if (!enabled) return message('O servidor ainda precisa de ser ativado.', true);
    const email = document.querySelector('#loginEmail').value.trim();
    const password = document.querySelector('#loginPassword').value;
    message('A entrar no reino…');
    try {
      const data = await request('/auth/v1/token?grant_type=password', {method:'POST', body:JSON.stringify({email, password})});
      await acceptSession(data);
    } catch (error) { message(error.message, true); }
  }

  async function acceptSession(data, preferredName) {
    session = data;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
    localStorage.setItem('imperio-account', 'Online');
    document.querySelector('#authScreen').classList.remove('show');
    await loadPlayer(preferredName);
    if (!localStorage.getItem('imperio-faith')) document.querySelector('#faithScreen').classList.add('show');
    else window.imperioShow('city');
  }

  async function loadPlayer(preferredName) {
    const userId = session.user.id;
    const profileRows = await request('/rest/v1/profiles?id=eq.' + encodeURIComponent(userId) + '&select=display_name,faith,power,alliance_id');
    const stateRows = await request('/rest/v1/player_states?user_id=eq.' + encodeURIComponent(userId) + '&select=state');
    if (profileRows[0]) {
      ownAllianceId = profileRows[0].alliance_id || null;
      localStorage.setItem('imperio-faith', profileRows[0].faith || 'athenas');
      const title = document.querySelector('.title small');
      if (title) title.textContent = 'Reino 01 · ' + (profileRows[0].display_name || preferredName || 'Guerreiro');
    }
    if (stateRows[0] && stateRows[0].state) {
      Object.assign(window.imperioState, stateRows[0].state);
      localStorage.setItem('imperio-save', JSON.stringify(window.imperioState));
      window.imperioRender();
    }
    setConnection(true, (profileRows[0] && profileRows[0].display_name) || preferredName || 'Guerreiro');
    await Promise.all([loadCastles(), loadWorldState(), loadWorldV60()]);
  }

  function mapEntityNode(entity) {
    const node = document.createElement('button');
    const mine = entity.kind === 'mine';
    const temple = entity.kind === 'temple';
    node.className = 'node online-map-entity ' + (mine ? 'resource mine-unit' : temple ? 'temple temple-site' : entity.kind === 'monster' ? 'monster monster-unit' : 'throne');
    node.dataset.kind = mine ? 'resource' : entity.kind;
    node.dataset.resource = mine ? entity.subtype : '';
    node.dataset.level = entity.level;
    node.dataset.entityId = entity.id;
    node.dataset.entityState = entity.state;
    node.dataset.node = entity.subtype + ' Lv' + entity.level;
    if (entity.kind === 'monster') {
      const imageName = ({lobo:'lobo.png',javali:'javali.png',aranha:'aranha.png',escorpiao:'escorpiao.png',serpente:'serpente.png',ciclope:'ciclope.png',minotauro:'minotauro.png',hidra:'hidra.png'})[String(entity.subtype).toLowerCase()] || 'lobo.png';
      node.innerHTML = '<img src="monstros-v13/' + imageName + '" alt=""><small>Lv' + entity.level + '</small>';
    } else {
      const icon = mine ? ({gold:'🪙',wood:'🪵',food:'🌾',wisdom:'🔮'}[entity.subtype] || '⛏️') : temple ? '🏛️' : '👑';
      node.innerHTML = '<span class="resource-symbol">' + icon + '</span><small>Lv' + entity.level + '</small>';
    }
    node.onclick = event => { event.stopPropagation(); entity.state === 'available' ? openServerEntity(entity) : window.imperioToast('Este alvo está ' + (entity.state === 'occupied' ? 'ocupado.' : 'reservado por outra marcha.')); };
    return node;
  }

  function marchNode(march) {
    const node = document.createElement('button');
    node.className = 'node online-march ' + (march.owner_id === session.user.id ? 'mine' : march.alliance_id && march.alliance_id === ownAllianceId ? 'ally' : 'enemy');
    node.dataset.marchId = march.id;
    node.dataset.sourceX = march.source_x;
    node.dataset.sourceY = march.source_y;
    node.dataset.targetX = march.target_x;
    node.dataset.targetY = march.target_y;
    node.dataset.departsAt = march.departs_at;
    node.dataset.arrivesAt = march.arrives_at;
    node.dataset.node = (march.march_type === 'hunt' ? 'Caça' : march.march_type === 'gather' ? 'Recolha' : 'Marcha') + ' · ' + Number(march.troops && march.troops.count || 0).toLocaleString('pt-PT') + ' tropas';
    node.innerHTML = '<span style="font-size:25px;filter:drop-shadow(0 3px 2px #000)">⚔️</span><small>MARCHA</small>';
    node.onclick = event => { event.stopPropagation(); window.imperioToast(node.dataset.node); };
    return node;
  }

  function updateMarchPositions() {
    if (!window.imperioMapEngine) return;
    document.querySelectorAll('.online-march').forEach(node => {
      const start = Date.parse(node.dataset.departsAt), end = Date.parse(node.dataset.arrivesAt);
      const progress = Math.max(0, Math.min(1, (Date.now() - start) / Math.max(1, end - start)));
      node.dataset.mapX = Number(node.dataset.sourceX) + (Number(node.dataset.targetX) - Number(node.dataset.sourceX)) * progress;
      node.dataset.mapY = Number(node.dataset.sourceY) + (Number(node.dataset.targetY) - Number(node.dataset.sourceY)) * progress;
    });
    window.imperioMapEngine.render();
  }

  function openServerEntity(entity) {
    let modal = document.querySelector('#onlineMapAction');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'onlineMapAction';
      modal.className = 'modal';
      modal.innerHTML = '<div class="dialog v50-cell"><h2 data-title></h2><p data-description></p><label>Tropas da marcha</label><input data-troops type="number" min="1" value="100"><p data-result></p><div class="row"><button class="btn" data-close>Fechar</button><button class="v50-primary" data-send>ENVIAR MARCHA</button></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
    }
    const action = entity.kind === 'monster' ? 'hunt' : entity.kind === 'mine' ? 'gather' : 'occupy';
    const actionName = action === 'hunt' ? 'ATACAR MONSTRO' : action === 'gather' ? 'RECOLHER RECURSOS' : 'OCUPAR TEMPLO';
    modal.querySelector('[data-title]').textContent = entity.subtype + ' · Nv.' + entity.level;
    modal.querySelector('[data-description]').textContent = action === 'hunt' ? 'A caça exige uma aliança. A EXP do Colosso e o saque são calculados pelo servidor.' : action === 'gather' ? 'Envia tropas para recolher esta mina.' : 'A ocupação está disponível durante o evento SWZ.';
    modal.querySelector('[data-result]').textContent = '';
    const send = modal.querySelector('[data-send]');
    send.textContent = actionName;
    send.disabled = false;
    send.onclick = async () => {
      const troopCount = Math.floor(Number(modal.querySelector('[data-troops]').value));
      if (!troopCount || troopCount < 1) return window.imperioToast('Escolhe a quantidade de tropas.');
      send.disabled = true;
      modal.querySelector('[data-result]').textContent = 'A enviar a marcha…';
      try {
        const march = await request('/rest/v1/rpc/start_map_action', {method:'POST', body:JSON.stringify({target_entity_id:entity.id,action_type:action,troop_count:troopCount})});
        serverActionPending = true;
        const row = Array.isArray(march) ? march[0] : march;
        const seconds = Math.max(1, Math.ceil((Date.parse(row.arrives_at) - Date.now()) / 1000));
        modal.querySelector('[data-result]').textContent = 'Marcha enviada · chegada em aproximadamente ' + seconds + ' segundos.';
        window.imperioToast('Marcha enviada para ' + entity.subtype + '.');
        setTimeout(() => modal.classList.remove('show'), 1400);
        await loadWorldState();
      } catch (error) {
        modal.querySelector('[data-result]').textContent = error.message;
        send.disabled = false;
      }
    };
    modal.classList.add('show');
  }

  async function refreshStateAfterMarch() {
    const rows = await request('/rest/v1/player_states?user_id=eq.' + encodeURIComponent(session.user.id) + '&select=state');
    if (rows[0] && rows[0].state) {
      Object.assign(window.imperioState, rows[0].state);
      localStorage.setItem('imperio-save', JSON.stringify(window.imperioState));
      window.imperioRender();
    }
  }

  async function resolveMarches() {
    if (!session) return;
    try {
      const outcomes = await request('/rest/v1/rpc/resolve_my_marches', {method:'POST', body:'{}'});
      if (!Array.isArray(outcomes) || !outcomes.length) return;
      await Promise.all([refreshStateAfterMarch(), loadWorldState()]);
      lastSaved = JSON.stringify(window.imperioState);
      outcomes.forEach(outcome => {
        if (outcome.status === 'cancelled') return window.imperioToast('Uma marcha foi cancelada porque o alvo deixou de estar disponível.');
        const result = outcome.victory === false ? 'Derrota' : 'Vitória';
        window.imperioToast(result + (outcome.reward ? ' · recompensa ' + Number(outcome.reward).toLocaleString('pt-PT') : ''));
      });
    } catch (_) {}
  }

  async function openOnlineReports() {
    if (!session) return window.imperioToast('Entra numa conta online para veres os relatórios.');
    let modal = document.querySelector('#onlineReports');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'onlineReports';
      modal.className = 'modal';
      modal.innerHTML = '<div class="dialog v50-cell"><h2>✉️ Relatórios de batalha</h2><div data-list></div><button class="btn" data-close>Fechar</button></div>';
      document.body.appendChild(modal);
      modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
    }
    modal.querySelector('[data-list]').innerHTML = '<p>A carregar relatórios…</p>';
    modal.classList.add('show');
    try {
      const reports = await request('/rest/v1/battle_reports?or=(attacker_id.eq.' + encodeURIComponent(session.user.id) + ',defender_id.eq.' + encodeURIComponent(session.user.id) + ')&select=id,target_kind,target_x,target_y,result,created_at&order=created_at.desc&limit=30');
      modal.querySelector('[data-list]').innerHTML = reports.length ? reports.map(report => {
        const won = report.result && report.result.victory !== false;
        const title = report.target_kind === 'monster' ? 'Monstro' : report.target_kind === 'mine' ? 'Mina' : 'Templo';
        return '<article style="padding:8px;margin:6px 0;background:#2e1d12;color:#ffe5a7;border:1px solid #8d6533"><b>' + (won ? '🏆 Vitória' : '💀 Derrota') + ' · ' + title + '</b><small style="display:block">X' + report.target_x + ' Y' + report.target_y + ' · Recompensa ' + Number(report.result.reward || 0).toLocaleString('pt-PT') + '</small></article>';
      }).join('') : '<p>Ainda não existem relatórios.</p>';
    } catch (error) {
      modal.querySelector('[data-list]').textContent = error.message;
    }
  }

  async function loadWorldState() {
    if (!session || !window.imperioMapEngine) return;
    try {
      const [entities, territories, events, marches] = await Promise.all([
        request('/rest/v1/map_entities?realm_id=eq.1&kind=in.(monster,mine,temple)&state=not.in.(depleted,defeated)&select=id,kind,subtype,level,x,y,state&limit=2000'),
        request('/rest/v1/alliance_territories?realm_id=eq.1&select=id,alliance_id,min_x,max_x,min_y,max_y'),
        request('/rest/v1/realm_events?realm_id=eq.1&event_type=eq.kvk&status=eq.active&select=id,starts_at,ends_at&limit=1'),
        request('/rest/v1/marches?realm_id=eq.1&status=in.(marching,returning)&select=id,owner_id,alliance_id,march_type,source_x,source_y,target_x,target_y,troops,departs_at,arrives_at&limit=500')
      ]);
      const world = window.imperioMapEntityLayer;
      world.querySelectorAll('.online-map-entity,.online-march').forEach(node => node.remove());
      entities.forEach(entity => window.imperioMapEngine.register(mapEntityNode(entity), entity.x, entity.y));
      marches.forEach(march => {
        const node = marchNode(march);
        window.imperioMapEngine.register(node, march.source_x, march.source_y);
      });
      serverActionPending = marches.some(march => march.owner_id === session.user.id);
      updateMarchPositions();
      window.imperioMapEngine.updateServerState({
        kvkActive: events.some(event => Date.parse(event.starts_at) <= Date.now() && Date.now() <= Date.parse(event.ends_at)),
        territories: territories.map(t => Object.assign({}, t, {mine: !!ownAllianceId && t.alliance_id === ownAllianceId}))
      });
    } catch (_) {
      // A migração v0.50 pode ainda não ter sido instalada; o login continua disponível.
    }
  }

  async function loadWorldV60() {
    if (!session) return;
    try {
      const [passes, structures, buffs, rallies] = await Promise.all([
        request('/rest/v1/border_passes?realm_id=eq.1&select=id,name,x,y,target_zone,max_health,health,owner_alliance_id,shield_until'),
        request('/rest/v1/alliance_structures?realm_id=eq.1&active=eq.true&select=id,alliance_id,structure_type,parent_structure_id,x,y,level,health'),
        ownAllianceId ? request('/rest/v1/alliance_buffs?alliance_id=eq.' + encodeURIComponent(ownAllianceId) + '&select=march_speed,defense,debuff_resistance') : Promise.resolve([]),
        ownAllianceId ? request('/rest/v1/alliance_rallies?alliance_id=eq.' + encodeURIComponent(ownAllianceId) + '&status=in.(forming,marching,fighting)&select=id,target_kind,target_id,status,total_power,capacity,launches_at,arrives_at&order=created_at.desc&limit=30') : Promise.resolve([])
      ]);
      window.dispatchEvent(new CustomEvent('imperio:v60-world', {detail:{passes,structures,buffs:buffs[0]||null,rallies,allianceId:ownAllianceId}}));
    } catch (_) {
      // A migração world_war_v60.sql pode ainda não ter sido executada.
    }
  }

  async function saveProgress() {
    if (!session || serverActionPending) return;
    const serialized = JSON.stringify(window.imperioState);
    if (serialized === lastSaved) return;
    try {
      await request('/rest/v1/player_states?user_id=eq.' + encodeURIComponent(session.user.id), {
        method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({state:window.imperioState, updated_at:new Date().toISOString()})
      });
      const faith = localStorage.getItem('imperio-faith') || 'athenas';
      await request('/rest/v1/profiles?id=eq.' + encodeURIComponent(session.user.id), {
        method:'PATCH', headers:{Prefer:'return=minimal'}, body:JSON.stringify({faith, power:window.imperioState.power, updated_at:new Date().toISOString()})
      });
      lastSaved = serialized;
    } catch (error) { setConnection(false, 'Sem ligação'); }
  }

  async function loadCastles() {
    if (!session) return;
    try {
      const castles = await request('/rest/v1/castles?select=id,user_id,x,y,level,faith,profiles(display_name,power,alliance_id)&realm_id=eq.1&limit=200');
      const world = window.imperioMapEntityLayer || document.querySelector('.world-layer');
      if (!world) return;
      world.querySelectorAll('.player-castle').forEach(node => node.remove());
      castles.forEach(castle => {
        const node = document.createElement('button');
        const own = castle.user_id === session.user.id;
        const profile = castle.profiles || {};
        const ally = !own && ownAllianceId && profile.alliance_id === ownAllianceId;
        node.className = 'node player-castle ' + (own ? 'mine' : ally ? 'ally' : 'enemy');
        if (window.imperioMapEngine) {
          node.dataset.mapX = castle.x;
          node.dataset.mapY = castle.y;
        } else {
          node.style.left = Math.max(2, Math.min(96, castle.x / 11.2)) + '%';
          node.style.top = Math.max(2, Math.min(96, castle.y / 11.2)) + '%';
        }
        node.dataset.node = (profile.display_name || 'Guerreiro') + ' · Castelo Nv.' + castle.level;
        node.dataset.kind = own ? 'ownCastle' : 'playerCastle';
        node.innerHTML = '<span class="castle-art"><i class="tower left"></i><i class="keep"></i><i class="tower right"></i><i class="gate"></i></span><small>' + (own ? 'TEU CASTELO' : escapeHtml(profile.display_name || 'Guerreiro')) + '</small>';
        node.onclick = () => window.imperioToast(node.dataset.node + ' · Poder ' + Number(profile.power || 0).toLocaleString('pt-PT'));
        if (window.imperioMapEngine) window.imperioMapEngine.register(node, castle.x, castle.y);
        else world.appendChild(node);
      });
    } catch (error) { setConnection(false, 'Mapa indisponível'); }
  }

  async function moveCastle(mapX, mapY) {
    if (!session) return false;
    const x = Math.max(0, Math.min(1119, Math.floor(Number(mapX))));
    const y = Math.max(0, Math.min(1119, Math.floor(Number(mapY))));
    await request('/rest/v1/rpc/teleport_castle', {method:'POST', body:JSON.stringify({target_x:x,target_y:y})});
    await loadCastles();
    return true;
  }

  async function randomTeleportCastle() {
    if (!session) throw new Error('Sessão necessária');
    const moved = await request('/rest/v1/rpc/random_teleport_castle', {method:'POST', body:'{}'});
    const castle = Array.isArray(moved) ? moved[0] : moved;
    await loadCastles();
    return castle && {x:Number(castle.x), y:Number(castle.y)};
  }

  function escapeHtml(value) {
    const div = document.createElement('div'); div.textContent = value; return div.innerHTML;
  }

  async function restore() {
    if (!enabled) return setConnection(false, 'Servidor por ativar');
    try {
      session = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      if (!session || !session.access_token) return setConnection(false, 'Pronto para ligar');
      await request('/auth/v1/user', {method:'GET'});
      localStorage.setItem('imperio-account', 'Online');
      await loadPlayer();
    } catch (error) {
      session = null; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('imperio-account');
      setConnection(false, 'Sessão terminada');
    }
  }

  document.querySelector('#onlineLogin').onclick = login;
  document.querySelector('#onlineSignup').onclick = signUp;
  setInterval(saveProgress, 10000);
  setInterval(loadCastles, 30000);
  setInterval(loadWorldState, 30000);
  setInterval(loadWorldV60, 30000);
  setInterval(resolveMarches, 5000);
  setInterval(updateMarchPositions, 1000);
  window.imperioMoveCastle = moveCastle;
  window.imperioRandomTeleportCastle = randomTeleportCastle;
  window.imperioOpenOnlineReports = openOnlineReports;
  window.imperioOnlineRequest = request;
  window.imperioRefreshWorldV60 = loadWorldV60;
  restore();
})();
