(() => {
  'use strict';
  const state = window.imperioState;
  const city = document.querySelector('.city');
  const map = document.querySelector('.map');
  const world = map && map.querySelector('.world-layer');
  if (!state || !city || !map || !world) return;

  const style = document.createElement('style');
  style.textContent = `
    .city{background-image:linear-gradient(#0b08031c,#0b080342),url('senado-realista-v41.png')!important;background-position:center top!important;background-size:cover!important}
    #city .section-head h2{font-size:0}#city .section-head h2:after{content:'Senado Imperial de Aurion';font-size:22px}
    #map .section-head h2{font-size:0}#map .section-head h2:after{content:'Mapa 1.120 × 1.120 km';font-size:22px}
    .senate-entry{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);z-index:12;padding:11px 17px;border:2px solid #e1b85e;border-radius:7px;background:#2b130de8;color:#ffe4a0;font:900 14px Georgia;box-shadow:0 5px 16px #000}
    .senate-menu{position:absolute;left:8px;right:8px;bottom:44px;z-index:12;display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.senate-menu button{padding:8px 3px;border:1px solid #d3a656;border-radius:5px;background:#1d110ddb;color:#ffe0a0;font-size:10px;font-weight:900}
    .world-layer{width:280%!important;height:280%!important;background-image:linear-gradient(#17241212,#1b120718),url('mapa-realista-v41.png')!important;background-size:cover!important;background-position:center!important;background-blend-mode:normal!important}
    .world-layer:after,.terrain-layer,.realism-key{display:none!important}.alliance-zone{display:none!important}.kingdom-grid{display:block!important;opacity:.15!important;background-size:4% 4%!important;z-index:2!important}
    .castle-unit .castle-art,.player-castle .castle-art{width:62px!important;height:54px!important}.castle-unit{width:72px!important;height:72px!important}.mine-unit{width:55px!important;height:58px!important}.resource-art{width:51px!important;height:46px!important}.monster-unit{width:58px!important;height:62px!important}.monster-unit img{height:48px!important}
    .map-search{position:absolute;z-index:40;left:7px;right:7px;top:7px;display:grid;grid-template-columns:1.2fr .8fr auto;gap:5px;padding:6px;background:#110c09e8;border:2px solid #c79a48;border-radius:7px;box-shadow:0 4px 14px #000c}.map-search select,.map-search button{min-width:0;padding:8px 5px;border:1px solid #a67a39;border-radius:4px;background:#efe0b2;color:#321d0d;font-weight:900}.map-search button{background:#7c2c1e;color:#ffe2a0}
    .map-target-info{position:absolute;z-index:39;left:8px;right:8px;top:57px;padding:6px 9px;background:#11100bdc;border:1px solid #b28b49;color:#ffe4a4;font-size:10px;text-align:center}.search-pulse{animation:targetPulse .8s ease-in-out 4;outline:4px solid #ffe066!important;outline-offset:5px}@keyframes targetPulse{50%{filter:brightness(1.8) drop-shadow(0 0 10px #ffcf3d)}}
    .teleport-tools{position:absolute;z-index:41;right:7px;bottom:90px;display:grid;gap:5px}.teleport-tools button{padding:8px;border:2px solid #d1a14c;border-radius:6px;background:#163c48e8;color:#e4f8ff;font-size:10px;font-weight:900}.teleport-tools .random{background:#5e281be8;color:#ffe2a0}.teleport-mode{cursor:crosshair!important;box-shadow:inset 0 0 0 4px #55dfff}.teleport-marker{position:absolute;z-index:38;width:4%;aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid #6ff3ff;background:#55dfff44;pointer-events:none;animation:targetPulse .8s infinite}
    #colossi .colossus-card .beast{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;height:210px!important;border-bottom:2px solid #c69b4d}
    #colossi .colossus-card:nth-of-type(1) .beast{background-image:url('colosso-lobo-v41.png')!important}
    #colossi .colossus-card:nth-of-type(2) .beast{background-image:url('colosso-urso-v41.png')!important}
    #colossi .colossus-card:nth-of-type(3) .beast{background-image:url('colosso-rinoceronte-v41.png')!important}
    #colossi .colossus-card:nth-of-type(4) .beast{background-image:url('colosso-tigre-v41.png')!important}
    #colossi .colossus-card:nth-of-type(5) .beast{background-image:url('colosso-leao-v41.png')!important}
    #colossi .colossus-card:nth-of-type(6) .beast{background-image:url('colosso-elefante-v41.png')!important}
    .colossus-sheet:before{content:'';display:block;width:180px;height:150px;margin:0 auto 8px;background:var(--colossus-photo) center/cover;border:3px solid #795027;box-shadow:0 5px 12px #0008}
  `;
  document.head.appendChild(style);

  const senateButton = document.createElement('button');
  senateButton.className = 'senate-entry'; senateButton.textContent = '🏛️ ENTRAR NO SENADO';
  senateButton.onclick = () => window.imperioShow('buildings'); city.appendChild(senateButton);
  const senateMenu = document.createElement('div'); senateMenu.className = 'senate-menu';
  [['⚔️ Guerra','alliance'],['📜 Conselho','buildings'],['🔬 Arquivos','research'],['💰 Tesouro','shop'],['🦁 Heróis','heroes'],['🐾 Reserva','colossi']].forEach(([label,view]) => { const b=document.createElement('button'); b.textContent=label; b.onclick=()=>window.imperioShow(view); senateMenu.appendChild(b); });
  city.appendChild(senateMenu);

  const ordered = [
    ['Lobo Cinzento','Velocidade','colosso-lobo-v41.png'],['Urso Pardo','Resistência','colosso-urso-v41.png'],['Rinoceronte Branco','Muralha','colosso-rinoceronte-v41.png'],['Tigre de Bengala','Caça','colosso-tigre-v41.png'],['Leão','Comando','colosso-leao-v41.png'],['Elefante Africano','Impacto','colosso-elefante-v41.png']
  ];
  state.colossi.forEach((c,i)=>{ if(ordered[i]) c.name=ordered[i][0]; });
  document.querySelectorAll('#colossi .colossus-card').forEach((card,i)=>{ const title=card.querySelector('b'),small=card.querySelector('small'); if(title&&ordered[i])title.textContent=ordered[i][0]; if(small&&ordered[i])small.textContent='Lv. '+(state.colossi[i]?.level||1)+'/80 · '+ordered[i][1]; card.addEventListener('click',()=>setTimeout(()=>{const sheet=document.querySelector('.colossus-sheet');if(sheet&&ordered[i])sheet.style.setProperty('--colossus-photo',`url('${ordered[i][2]}')`)},0)); });

  const search = document.createElement('div'); search.className='map-search';
  search.innerHTML='<select aria-label="Tipo de alvo"><option value="monster">Monstros</option><option value="resource">Minas</option><option value="castle">Castelos</option></select><select aria-label="Nível"><option value="0">Todos os níveis</option>'+Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'">Nível '+(i+1)+'</option>').join('')+'</select><button>🔎 PESQUISAR</button>';
  const info=document.createElement('div');info.className='map-target-info';info.textContent='Escolhe um tipo e nível para localizar um alvo no mapa.';map.append(search,info);
  let searchIndex=0;
  search.querySelector('button').onclick=()=>{
    const type=search.children[0].value, level=+search.children[1].value;
    let selector=type==='monster'?'[data-kind="monster"]':type==='resource'?'[data-kind="resource"]':'.castle-unit,.player-castle';
    const matches=[...world.querySelectorAll(selector)].filter(n=>!level||+(n.dataset.level||n.querySelector('.castle-level')?.textContent.replace(/\D/g,'')||0)===level);
    world.querySelectorAll('.search-pulse').forEach(n=>n.classList.remove('search-pulse'));
    if(!matches.length){info.textContent='Nenhum alvo desse tipo e nível foi encontrado.';return;}
    const target=matches[searchIndex++%matches.length];target.classList.add('search-pulse');
    const x=parseFloat(target.style.left)||50,y=parseFloat(target.style.top)||50;
    const mapW=map.clientWidth,mapH=map.clientHeight,worldW=mapW*2.8,worldH=mapH*2.8;
    world.style.transform='translate('+Math.max(-(worldW-mapW),Math.min(0,mapW/2-x/100*worldW))+'px,'+Math.max(-(worldH-mapH),Math.min(0,mapH/2-y/100*worldH))+'px)';
    info.textContent='Alvo encontrado: '+(target.dataset.node||target.textContent.trim())+' · toca nele para atacar ou recolher.';
  };

  let seed=401;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const monsterTypes=[['Lobo','lobo.png'],['Javali','javali.png'],['Aranha','aranha.png'],['Escorpião','escorpiao.png'],['Serpente','serpente.png'],['Ciclope','ciclope.png'],['Minotauro','minotauro.png'],['Hidra','hidra.png']];
  const resources=[['gold','🪙','Ouro'],['wood','🪵','Madeira'],['food','🌾','Alimentos'],['wisdom','🔮','Cristal']];
  let customMonster=null;const battle=document.querySelector('#battle'),attack=document.querySelector('#attack'),previousAttack=attack.onclick;
  for(let i=0;i<72;i++){const type=monsterTypes[i%monsterTypes.length],level=1+(i%8),node=document.createElement('button');node.className='node monster monster-unit generated-v41';node.style.left=(3+random()*94).toFixed(2)+'%';node.style.top=(4+random()*92).toFixed(2)+'%';node.dataset.kind='monster';node.dataset.level=level;node.dataset.node=type[0]+' Lv'+level;node.innerHTML='<img src="monstros-v13/'+type[1]+'" alt="'+type[0]+'"><small>Lv'+level+'</small>';node.onclick=e=>{e.stopPropagation();customMonster=node;document.querySelector('#battleTitle').textContent=node.dataset.node+' · Energia '+(level*5);document.querySelector('#battleImage').src=node.querySelector('img').src;battle.classList.add('show')};world.appendChild(node)}
  for(let i=0;i<56;i++){const type=resources[i%resources.length],level=1+(i%8),node=document.createElement('button');node.className='node resource mine-unit generated-v41';node.style.left=(3+random()*94).toFixed(2)+'%';node.style.top=(4+random()*92).toFixed(2)+'%';node.dataset.kind='resource';node.dataset.resource=type[0];node.dataset.level=level;node.dataset.node=type[2]+' Nv.'+level;node.innerHTML='<span class="resource-symbol">'+type[1]+'</span><small>Lv'+level+'</small>';node.onclick=e=>{e.stopPropagation();if(node.classList.contains('depleted'))return;node.classList.add('selected-target');info.textContent='Recolha enviada para '+node.dataset.node;setTimeout(()=>{const amount=level*850;state[type[0]]=(state[type[0]]||0)+amount;node.classList.remove('selected-target');node.classList.add('depleted');window.imperioRender();window.imperioToast('Recolha concluída: +'+amount.toLocaleString('pt-PT')+' '+type[2]);setTimeout(()=>node.classList.remove('depleted'),30000)},Math.max(4,level+2)*1000)};world.appendChild(node)}
  attack.onclick=()=>{if(!customMonster)return previousAttack&&previousAttack();const node=customMonster,level=+node.dataset.level,cost=level*5;if((state.huntEnergy||0)<cost)return window.imperioToast('Energia insuficiente');state.huntEnergy-=cost;battle.classList.remove('show');node.classList.add('selected-target');setTimeout(()=>{const loot=level*700;state.gold+=loot;state.food+=Math.round(loot*.7);state.wood+=Math.round(loot*.5);state.diamonds+=level*2;state.monstersKilled=(state.monstersKilled||0)+1;state.power+=level*80;node.classList.remove('selected-target');node.style.display='none';window.dispatchEvent(new CustomEvent('imperio:monster-win',{detail:{level}}));window.imperioRender();window.imperioToast('Monstro derrotado! Recompensas recebidas.')},Math.max(4,level)*1000);customMonster=null};

  const ownSenate=()=>world.querySelector('.player-castle.mine,.castle-unit.mine');
  const decorateSenate=()=>{const own=ownSenate();if(!own)return;own.dataset.node='Meu Senado';const small=own.querySelector('small');if(small)small.textContent='MEU SENADO';const art=own.querySelector('.castle-art');if(art){art.style.backgroundImage="url('senado-realista-v41.png')";art.style.borderRadius='50%'}};
  decorateSenate();new MutationObserver(decorateSenate).observe(world,{childList:true});

  const tele=document.createElement('div');tele.className='teleport-tools';tele.innerHTML='<button data-teleport="choose">✦ ESCOLHER QUADRADO</button><button class="random" data-teleport="random">⤨ ALEATÓRIO</button>';map.appendChild(tele);let choosing=false;
  const blocked=(x,y)=>[...world.querySelectorAll('.node:not(.mine)')].some(n=>n.style.display!=='none'&&Math.hypot((parseFloat(n.style.left)||0)-x,(parseFloat(n.style.top)||0)-y)<2.2);
  const enemyLand=(x,y)=>[...world.querySelectorAll('.castle-unit.enemy,.player-castle.enemy')].some(n=>Math.hypot((parseFloat(n.style.left)||0)-x,(parseFloat(n.style.top)||0)-y)<8);
  const kvkActive=()=>window.imperioMonthlyWars?.phase?.()==='KVK';
  const valid=(x,y)=>x>=1&&x<=99&&y>=1&&y<=99&&!blocked(x,y)&&(kvkActive()||!enemyLand(x,y));
  const toKm=value=>Math.max(0,Math.min(1120,Math.round(value*11.2)));
  const moveSenate=(x,y,label)=>{const own=ownSenate();if(!own)return window.imperioToast('O Senado ainda não foi carregado');own.style.left=x+'%';own.style.top=y+'%';state.castleX=toKm(x);state.castleY=toKm(y);choosing=false;map.classList.remove('teleport-mode');window.imperioRender();info.textContent='Senado teleportado para X '+state.castleX+' km · Y '+state.castleY+' km ('+label+'). Proteção de 10 minutos ativa.';if(window.imperioMoveCastle)window.imperioMoveCastle(state.castleX,state.castleY).catch(()=>window.imperioToast('Sem ligação: posição guardada apenas neste dispositivo'));window.imperioToast('Teletransporte concluído')};
  tele.querySelector('[data-teleport="choose"]').onclick=e=>{e.stopPropagation();choosing=true;map.classList.add('teleport-mode');info.textContent='Toca num quadrado livre do mapa ou em território da tua aliança.'};
  tele.querySelector('[data-teleport="random"]').onclick=e=>{e.stopPropagation();for(let i=0;i<250;i++){const x=2+random()*96,y=2+random()*96;if(valid(x,y))return moveSenate(x,y,'aleatório')}window.imperioToast('Não foi encontrado território livre. Tenta novamente.')};
  map.addEventListener('pointerup',e=>{if(!choosing||e.target.closest('.map-search,.teleport-tools,.node'))return;const rect=world.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;if(!valid(x,y)){info.textContent=enemyLand(x,y)&&!kvkActive()?'Território inimigo bloqueado. Só podes entrar durante o KVK.':'Quadrado ocupado. Escolhe outro espaço livre.';window.imperioToast('Não podes teleportar para esse quadrado');return}moveSenate(x,y,'escolhido')},true);
  const throne=world.querySelector('[data-kind="throne"]');if(throne){throne.style.left='50%';throne.style.top='50%';throne.dataset.node='Trono Supremo · X560 Y560'}
  const coords=map.querySelector('.map-coords');if(coords)coords.textContent='REINO 1.120 × 1.120 km · TRONO X560 Y560';
})();
