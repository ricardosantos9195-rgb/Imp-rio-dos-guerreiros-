(() => {
  'use strict';

  const state = window.imperioState;
  const mapView = document.querySelector('#map');
  const map = mapView && mapView.querySelector('.map');
  const world = map && map.querySelector('.world-layer');
  const camera = window.imperioMapCamera;
  if (!state || !map || !world || !camera) return;

  const MAP_KM = 1120;
  const CELL_KM = 10;
  const THRONE_KM = 40;
  const WAR_FIELD_KM = 240;
  const pct = km => km / MAP_KM * 100;
  const toKm = value => Math.max(0, Math.min(MAP_KM, Math.round(value / pct(CELL_KM)) * CELL_KM));
  const toPercent = km => km / MAP_KM * 100;
  const kvkActive = () => window.imperioMonthlyWars?.phase?.() === 'KVK';

  const style = document.createElement('style');
  style.textContent = `
    body.map-mode .nav{display:none!important}body.map-mode .realm{margin-bottom:0!important}body.map-mode #map{height:calc(100vh - 62px)!important;padding:0!important;overflow:hidden!important}
    body.map-mode #map .section-head{display:none!important}body.map-mode #map .map{height:calc(100vh - 62px)!important}
    #map .map-search,#map .teleport-tools,#map .map-legend,#map .map-controls,#map .mini-map,#map .map-coords,#map .map-action-button,#map .map>button.btn{display:none!important}
    #map .map-target-info{top:7px;left:50%;right:auto;width:min(72%,430px);transform:translateX(-50%);border-radius:6px;pointer-events:none}
    #map .kingdom-grid{display:block!important;opacity:.28!important;background-size:${pct(CELL_KM)}% ${pct(CELL_KM)}%!important;background-image:linear-gradient(#f6d58d4a 1px,transparent 1px),linear-gradient(90deg,#f6d58d4a 1px,transparent 1px)!important}
    .throne-war-field{position:absolute;left:50%;top:50%;width:${pct(WAR_FIELD_KM)}%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:3;border:3px solid #d9ae5599;border-radius:50%;background:radial-gradient(circle,#ddc07914 0 58%,#9a732817 72%,#3e27131f 100%);box-shadow:inset 0 0 30px #f5d77921,0 0 18px #0008;pointer-events:none}
    .throne-war-field:before{content:'CAMPO DO TRONO · 240 × 240 KM';position:absolute;left:50%;top:7%;transform:translateX(-50%);padding:3px 7px;border:1px solid #d9b65b;background:#130c08d9;color:#ffe3a0;font:900 7px Georgia;white-space:nowrap}
    .throne-war-field.kvk{border-color:#ff4d3f;box-shadow:inset 0 0 45px #da211f35,0 0 25px #ff4b34}.throne-war-field.kvk:before{content:'KVK ATIVO · CAMPO DE GUERRA DO TRONO';background:#711b17;color:#fff}
    #map .node.throne{left:50%!important;top:50%!important;width:${pct(THRONE_KM)}%!important;height:${pct(THRONE_KM)}%!important;min-width:104px!important;min-height:104px!important;max-width:150px!important;max-height:150px!important;transform:translate(-50%,-50%)!important;z-index:18!important;border:4px solid #ffe28a!important;border-radius:18%!important;background:linear-gradient(#170d0738,#170d0790),url('senado-realista-v41.png') center/cover!important;color:#fff3c2!important;box-shadow:0 0 0 6px #5c351bd9,0 0 30px #ffd45a9c!important;text-shadow:0 2px 4px #000;font:900 12px Georgia!important}
    #map .node.throne small{display:block;margin-top:57px;padding:3px;background:#1a0d08df;border:1px solid #e4ba60;color:#ffe7a5;white-space:nowrap}
    .selected-map-cell{position:absolute;z-index:17;width:${pct(CELL_KM)}%;aspect-ratio:1;transform:translate(-50%,-50%);border:2px solid #73efff;background:#34c8e730;box-shadow:0 0 12px #63e9ff;pointer-events:none}
    .map-bottom-ui{position:absolute;left:0;right:0;bottom:0;z-index:50;padding:0 5px 5px;pointer-events:none}.map-bottom-ui button{pointer-events:auto}
    .coordinate-return{width:min(390px,80%);margin:0 auto 5px;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;border:2px solid #c89b4b;border-radius:22px;background:linear-gradient(#26323aee,#10151aee);box-shadow:0 4px 14px #000c;overflow:hidden;color:#ffe4a3}
    .coordinate-return button{height:39px;border:0;background:#7a5223;color:#ffe8b1;font-size:21px}.coordinate-return span{text-align:center;font:900 12px Georgia;white-space:nowrap}
    .map-dock{display:grid;grid-template-columns:64px repeat(6,1fr) 64px;gap:4px;align-items:end;padding:4px;border-top:2px solid #b98136;background:linear-gradient(#21140df5,#080707fa)}
    .map-dock button,.map-extra button{position:relative;min-width:0;height:54px;padding:4px 2px;border:2px solid #b88b45;border-radius:50%;background:radial-gradient(circle at 42% 30%,#76512c,#25130c 68%);color:#ffe6ad;font-size:22px;box-shadow:0 3px 7px #000}.map-dock button.edge{height:61px;border-radius:9px;background:linear-gradient(#8b451f,#35140c)}
    .map-dock small,.map-extra small{display:block;font-size:7px;font-weight:900;color:#ffe7b2}.notice-dot{position:absolute;right:-2px;top:-4px;min-width:17px;height:17px;padding:0 2px;border-radius:10px;background:#d72920;border:2px solid #ffe16d;color:#fff;font:900 9px/13px sans-serif}
    .map-extra{display:none;grid-template-columns:repeat(4,1fr);gap:7px;width:min(330px,90%);margin:0 auto 5px;padding:7px;border:2px solid #b98c46;border-radius:12px;background:#130d09ee}.map-extra.show{display:grid}.map-extra button{height:48px}
    .map-dialog{width:min(420px,94vw);padding:15px;background:linear-gradient(#eadcae,#c3a866);border:4px solid #5a3219;color:#2d1b0d}.map-dialog h2{margin:0 0 7px;color:#55230f;font:900 23px Georgia}.map-dialog p{margin:5px 0 11px;font-weight:750}.map-dialog .cell-state{display:block;padding:7px;margin:7px 0;background:#3b2417;color:#ffe5a3;border:1px solid #8e6634}.map-dialog .row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.map-dialog button{padding:10px}.map-dialog .teleport-confirm{background:linear-gradient(#11728a,#123b47);border:2px solid #7edff3;color:#fff;font-weight:900}.map-dialog .teleport-confirm:disabled{filter:grayscale(1);opacity:.55}
    .target-search-box{display:grid;gap:8px}.target-search-box select{width:100%;padding:10px;background:#251910;color:#ffe7ad;border:1px solid #93672e}.target-search-box .search-options{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
    @media(max-width:620px){.map-dock{grid-template-columns:57px repeat(6,1fr) 57px;gap:2px}.map-dock button{height:48px;font-size:19px}.map-dock button.edge{height:55px}.coordinate-return{margin-bottom:3px}.throne-war-field:before{font-size:5px}}
  `;
  document.head.appendChild(style);

  const bodyMode = () => document.body.classList.toggle('map-mode', mapView.classList.contains('active'));
  new MutationObserver(bodyMode).observe(mapView, {attributes:true, attributeFilter:['class']});
  bodyMode();

  const oldSearch = map.querySelector('.map-search');
  if (oldSearch) oldSearch.remove();
  const oldTeleport = map.querySelector('.teleport-tools');
  if (oldTeleport) oldTeleport.remove();

  let field = world.querySelector('.throne-war-field');
  if (!field) {
    field = document.createElement('div');
    field.className = 'throne-war-field';
    const grid = world.querySelector('.kingdom-grid');
    world.insertBefore(field, grid ? grid.nextSibling : world.firstChild);
  }
  const refreshWarField = () => field.classList.toggle('kvk', kvkActive());
  refreshWarField();
  setInterval(refreshWarField, 30000);

  const throne = world.querySelector('[data-kind="throne"]');
  if (throne) {
    throne.style.left = '50%'; throne.style.top = '50%';
    throne.dataset.node = 'Trono Supremo';
    throne.innerHTML = '<small>TRONO SUPREMO<br>X560 · Y560</small>';
    const previousThroneAction = throne.onclick;
    throne.onclick = event => {
      event.stopPropagation();
      if (!kvkActive()) return window.imperioToast('O Trono Supremo só pode ser atacado durante o KVK.');
      previousThroneAction && previousThroneAction.call(throne, event);
    };
  }

  const inWarField = node => {
    const x = parseFloat(node.style.left) || 0, y = parseFloat(node.style.top) || 0;
    return Math.abs(x - 50) < pct(WAR_FIELD_KM) / 2 && Math.abs(y - 50) < pct(WAR_FIELD_KM) / 2;
  };
  const safeSlots = [[15,18],[27,14],[73,15],[86,22],[14,38],[84,39],[16,66],[85,67],[26,84],[74,85],[38,18],[63,82]];
  let slotIndex = 0, monstersKept = 0;
  [...world.querySelectorAll('[data-kind="resource"],.temple-site,.castle-unit')].forEach(node => {
    if (inWarField(node)) { const slot=safeSlots[slotIndex++%safeSlots.length]; node.style.left=slot[0]+'%'; node.style.top=slot[1]+'%'; }
  });
  [...world.querySelectorAll('[data-kind="monster"]')].forEach(node => {
    if (!inWarField(node)) return;
    if (monstersKept++ < 6) return;
    const slot=safeSlots[slotIndex++%safeSlots.length]; node.style.left=(slot[0]+slotIndex%4)+'%'; node.style.top=(slot[1]+slotIndex%3)+'%';
  });

  const modal = document.createElement('div');
  modal.className = 'modal map-ui';
  modal.innerHTML = '<div class="dialog map-dialog"><h2 id="mapDialogTitle"></h2><div id="mapDialogBody"></div><div class="row"><button class="btn" data-close>Fechar</button><button class="teleport-confirm" data-teleport>TELETRANSPORTAR</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');

  const marker = document.createElement('i'); marker.className = 'selected-map-cell'; marker.hidden = true; world.appendChild(marker);
  let selected = null;
  const ownSenates = () => [...world.querySelectorAll('.player-castle.mine,.castle-unit.mine')];
  const enemyLand = (x,y) => [...world.querySelectorAll('.castle-unit.enemy,.player-castle.enemy')].some(n => Math.hypot((parseFloat(n.style.left)||0)-x,(parseFloat(n.style.top)||0)-y) < 8);
  const occupant = (x,y) => [...world.querySelectorAll('.node')].find(n => n.style.display !== 'none' && !n.classList.contains('mine') && Math.hypot((parseFloat(n.style.left)||0)-x,(parseFloat(n.style.top)||0)-y) < pct(CELL_KM)*.48);
  const throneBlocked = (kmX,kmY) => Math.abs(kmX-560) < THRONE_KM/2 && Math.abs(kmY-560) < THRONE_KM/2;
  const statusFor = (kmX,kmY,x,y) => {
    if (throneBlocked(kmX,kmY)) return {ok:false,text:'Espaço reservado ao Trono Supremo.'};
    const node = occupant(x,y); if (node) return {ok:false,text:'Quadrado ocupado por '+(node.dataset.node||'outro alvo')+'.'};
    if (!kvkActive() && enemyLand(x,y)) return {ok:false,text:'Território inimigo: entrada permitida somente durante o KVK.'};
    return {ok:true,text:'Quadrado livre. O terreno não impede o teletransporte.'};
  };

  const moveSenate = async (kmX,kmY,label) => {
    const x=toPercent(kmX),y=toPercent(kmY),own=ownSenates();
    if (!own.length) return window.imperioToast('O teu Senado ainda não foi carregado.');
    own.forEach(n=>{n.style.left=x+'%';n.style.top=y+'%'});
    state.castleX=kmX;state.castleY=kmY;window.imperioRender();
    modal.classList.remove('show');marker.hidden=true;camera.centerOnPercent(x,y);
    try { if(window.imperioMoveCastle) await window.imperioMoveCastle(kmX,kmY); } catch (_) { window.imperioToast('Sem ligação: posição guardada neste dispositivo.'); }
    window.imperioToast('Senado teleportado para X'+kmX+' Y'+kmY+' · proteção de 10 minutos.');
    const info=map.querySelector('.map-target-info');if(info)info.textContent='Teletransporte '+label+' concluído · X'+kmX+' Y'+kmY;
  };

  const openCell = (kmX,kmY) => {
    const x=toPercent(kmX),y=toPercent(kmY),status=statusFor(kmX,kmY,x,y);
    selected={kmX,kmY,x,y,status};marker.hidden=false;marker.style.left=x+'%';marker.style.top=y+'%';
    modal.querySelector('#mapDialogTitle').textContent='Quadrado X'+kmX+' · Y'+kmY;
    modal.querySelector('#mapDialogBody').innerHTML='<p>Terreno: disponível para ocupação</p><span class="cell-state">'+status.text+'</span>'+(Math.abs(kmX-560)<=WAR_FIELD_KM/2&&Math.abs(kmY-560)<=WAR_FIELD_KM/2?'<p>⚔️ Campo de Guerra do Trono</p>':'');
    const confirm=modal.querySelector('[data-teleport]');confirm.disabled=!status.ok;confirm.textContent=status.ok?'TELETRANSPORTAR':'INDISPONÍVEL';
    modal.classList.add('show');
  };
  modal.querySelector('[data-teleport]').onclick=()=>{if(selected?.status.ok)moveSenate(selected.kmX,selected.kmY,'escolhido')};

  let press=null;
  map.addEventListener('pointerdown',e=>{if(e.target.closest('.map-ui,.node'))return;press={x:e.clientX,y:e.clientY}},true);
  map.addEventListener('pointerup',e=>{
    if(!press||e.target.closest('.map-ui,.node')){press=null;return}
    const moved=Math.hypot(e.clientX-press.x,e.clientY-press.y);press=null;if(moved>9)return;
    const rect=world.getBoundingClientRect(),rawX=(e.clientX-rect.left)/rect.width*100,rawY=(e.clientY-rect.top)/rect.height*100;
    openCell(toKm(rawX),toKm(rawY));
  },true);

  const searchModal = document.createElement('div');searchModal.className='modal map-ui';
  searchModal.innerHTML='<div class="dialog map-dialog"><h2>🔎 Pesquisar no mapa</h2><div class="target-search-box"><div class="search-options"><select data-kind><option value="monster">Monstros</option><option value="resource">Minas</option></select><select data-type></select><select data-level><option value="0">Todos níveis</option>'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">Nível '+(i+1)+'</option>').join('')+'</select></div><button class="teleport-confirm" data-find>PESQUISAR MAIS PRÓXIMO</button></div><br><button class="btn" data-close>Fechar</button></div>';
  document.body.appendChild(searchModal);searchModal.querySelector('[data-close]').onclick=()=>searchModal.classList.remove('show');
  const kindSelect=searchModal.querySelector('[data-kind]'),typeSelect=searchModal.querySelector('[data-type]');
  const searchTypes={monster:[['','Todos'],['Lobo','Lobo'],['Javali','Javali'],['Aranha','Aranha'],['Escorpião','Escorpião'],['Serpente','Serpente'],['Ciclope','Ciclope'],['Minotauro','Minotauro'],['Hidra','Hidra']],resource:[['','Todas'],['gold','Ouro'],['wood','Madeira'],['food','Alimentos'],['wisdom','Cristal']]};
  const drawTypes=()=>{typeSelect.innerHTML=searchTypes[kindSelect.value].map(v=>'<option value="'+v[0]+'">'+v[1]+'</option>').join('')};kindSelect.onchange=drawTypes;drawTypes();
  searchModal.querySelector('[data-find]').onclick=()=>{
    const kind=kindSelect.value,type=typeSelect.value,level=+searchModal.querySelector('[data-level]').value,center=camera.getCenter();
    const matches=[...world.querySelectorAll('[data-kind="'+kind+'"]')].filter(n=>n.style.display!=='none'&&(!level||+n.dataset.level===level)&&(!type||(kind==='resource'?n.dataset.resource===type:(n.dataset.node||'').startsWith(type))));
    if(!matches.length)return window.imperioToast('Nenhum alvo desse tipo e nível foi encontrado.');
    matches.sort((a,b)=>Math.hypot(parseFloat(a.style.left)-center.x,parseFloat(a.style.top)-center.y)-Math.hypot(parseFloat(b.style.left)-center.x,parseFloat(b.style.top)-center.y));
    const target=matches[0];world.querySelectorAll('.search-pulse').forEach(n=>n.classList.remove('search-pulse'));target.classList.add('search-pulse');camera.centerOnPercent(parseFloat(target.style.left),parseFloat(target.style.top));searchModal.classList.remove('show');
    const info=map.querySelector('.map-target-info');if(info)info.textContent='Encontrado: '+target.dataset.node+' · toca no alvo para interagir.';
  };

  const bagModal=document.createElement('div');bagModal.className='modal map-ui';document.body.appendChild(bagModal);
  const openBag=()=>{const inv=state.inventory||{};bagModal.innerHTML='<div class="dialog map-dialog"><h2>🎒 Bolsa</h2><p>Aceleradores: <b>'+(inv.speedups||0)+'</b><br>Teletransportes aleatórios: <b>'+(inv.randomTeleports||0)+'</b><br>Equipamentos de herói: <b>'+((inv.heroEquipment||[]).length)+'</b></p><div class="row"><button class="btn" data-close>Fechar</button><button class="teleport-confirm" data-random>USAR TELETRANSPORTE ALEATÓRIO</button></div></div>';bagModal.querySelector('[data-close]').onclick=()=>bagModal.classList.remove('show');bagModal.querySelector('[data-random]').onclick=()=>{if(!(inv.randomTeleports>0))return window.imperioToast('Não tens teletransportes aleatórios.');for(let i=0;i<500;i++){const kmX=Math.floor(Math.random()*112)*10+5,kmY=Math.floor(Math.random()*112)*10+5,x=toPercent(kmX),y=toPercent(kmY),s=statusFor(kmX,kmY,x,y);if(s.ok){inv.randomTeleports--;bagModal.classList.remove('show');return moveSenate(kmX,kmY,'aleatório')}}window.imperioToast('Não foi encontrado um quadrado livre.')}};

  const bottom=document.createElement('div');bottom.className='map-bottom-ui map-ui';
  bottom.innerHTML='<div class="map-extra"><button data-view="shop">💎<small>LOJA</small></button><button data-view="research">📚<small>PESQUISAS</small></button><button data-view="army">⚔️<small>TROPAS</small></button><button data-view="buildings">🏛️<small>EDIFÍCIOS</small></button></div><div class="coordinate-return"><button data-home title="Voltar ao Senado">⌖</button><span>#01 · X: 560 · Y: 560</span><button data-search title="Pesquisar monstros e minas">🔎</button></div><div class="map-dock"><button class="edge" data-view="city">🏛️<small>SENADO</small></button><button data-view="campaign">📜<i class="notice-dot">2</i><small>MISSÕES</small></button><button data-view="heroes">🪖<small>HERÓIS</small></button><button data-view="colossi">🐾<small>COLOSSOS</small></button><button data-reports>✉️<i class="notice-dot">!</i><small>RELATÓRIOS</small></button><button data-bag>🎒<small>BOLSA</small></button><button data-more>➤<small>MAIS</small></button><button class="edge" data-view="alliance">🛡️<i class="notice-dot">1</i><small>ALIANÇA</small></button></div>';
  map.appendChild(bottom);
  bottom.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>window.imperioShow(b.dataset.view));
  bottom.querySelector('[data-search]').onclick=()=>searchModal.classList.add('show');
  bottom.querySelector('[data-bag]').onclick=()=>{openBag();bagModal.classList.add('show')};
  bottom.querySelector('[data-more]').onclick=()=>bottom.querySelector('.map-extra').classList.toggle('show');
  bottom.querySelector('[data-reports]').onclick=()=>{const b=map.querySelector('.reports-button');if(b)b.click();else window.imperioToast('Ainda não existem relatórios de batalha.')};
  const coordText=bottom.querySelector('.coordinate-return span');
  const centerHome=()=>{const own=ownSenates()[0],x=own?parseFloat(own.style.left):toPercent(state.castleX||336),y=own?parseFloat(own.style.top):toPercent(state.castleY||739);camera.centerOnPercent(x,y);window.imperioToast('Câmara centrada no teu Senado.');};
  bottom.querySelector('[data-home]').onclick=centerHome;
  window.addEventListener('imperio:map-move',e=>{coordText.textContent='#01 · X: '+e.detail.kmX+' · Y: '+e.detail.kmY});
  window.imperioMapV43={openCell,moveSenate,centerHome};
  setTimeout(()=>{refreshWarField();centerHome()},300);
})();
