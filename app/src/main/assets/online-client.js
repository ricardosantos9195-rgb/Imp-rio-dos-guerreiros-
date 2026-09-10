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
    await loadCastles();
  }

  async function saveProgress() {
    if (!session) return;
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
      const world = document.querySelector('.world-layer');
      if (!world) return;
      world.querySelectorAll('.player-castle').forEach(node => node.remove());
      castles.forEach(castle => {
        const node = document.createElement('button');
        const own = castle.user_id === session.user.id;
        const profile = castle.profiles || {};
        const ally = !own && ownAllianceId && profile.alliance_id === ownAllianceId;
        node.className = 'node player-castle ' + (own ? 'mine' : ally ? 'ally' : 'enemy');
        node.style.left = Math.max(2, Math.min(96, castle.x / 10)) + '%';
        node.style.top = Math.max(2, Math.min(94, castle.y / 10)) + '%';
        node.dataset.node = (profile.display_name || 'Guerreiro') + ' · Castelo Nv.' + castle.level;
        node.dataset.kind = own ? 'ownCastle' : 'playerCastle';
        node.innerHTML = '<span class="castle-art"><i class="tower left"></i><i class="keep"></i><i class="tower right"></i><i class="gate"></i></span><small>' + (own ? 'TEU CASTELO' : escapeHtml(profile.display_name || 'Guerreiro')) + '</small>';
        node.onclick = () => window.imperioToast(node.dataset.node + ' · Poder ' + Number(profile.power || 0).toLocaleString('pt-PT'));
        world.appendChild(node);
      });
    } catch (error) { setConnection(false, 'Mapa indisponível'); }
  }

  async function moveCastle(mapX, mapY) {
    if (!session) return false;
    const x = Math.max(0, Math.min(999, Math.round((Number(mapX) / 1120) * 999)));
    const y = Math.max(0, Math.min(999, Math.round((Number(mapY) / 1120) * 999)));
    await request('/rest/v1/castles?user_id=eq.' + encodeURIComponent(session.user.id), {
      method:'PATCH',
      headers:{Prefer:'return=minimal'},
      body:JSON.stringify({x, y, protected_until:new Date(Date.now()+10*60*1000).toISOString()})
    });
    await loadCastles();
    return true;
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
  window.imperioMoveCastle = moveCastle;
  restore();
})();
