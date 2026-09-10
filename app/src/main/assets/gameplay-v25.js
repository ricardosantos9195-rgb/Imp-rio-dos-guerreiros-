(() => {
  'use strict';
  const state = window.imperioState;
  const map = document.querySelector('.map');
  const world = map && map.querySelector('.world-layer');
  if (!state || !map || !world) return;
  state.huntEnergy = Number.isFinite(state.huntEnergy) ? state.huntEnergy : 100;
  state.battleReports = Array.isArray(state.battleReports) ? state.battleReports : [];
  state.gatheredNodes = state.gatheredNodes || {};

  const style = document.createElement('style');
  style.textContent = `
    .alliance-zone{position:absolute;z-index:2;width:19%;aspect-ratio:1;border:3px solid #51d87588;border-radius:50%;background:radial-gradient(circle,#2aa4522b 0 55%,transparent 72%);transform:translate(-50%,-50%);pointer-events:none;box-shadow:inset 0 0 20px #56e47b2e}.alliance-zone.enemy-zone{border-color:#ee554b66;background:radial-gradient(circle,#ba33242a 0 55%,transparent 72%)}
    .castle-level{position:absolute;right:3px;top:19px;min-width:18px;padding:1px 3px;border-radius:9px;background:#f1c75b;color:#2b1808;border:1px solid #4f2d17;font:900 8px Georgia}.castle-unit.level-2 .castle-art{scale:1.08}.castle-unit.level-3 .castle-art{scale:1.18}.castle-unit.level-3 .castle-art:after{content:"⚑";position:absolute;left:24px;top:-23px;color:#ffd15c;font-size:19px;text-shadow:0 1px #000}
    .node.depleted{filter:grayscale(1) brightness(.55)!important;pointer-events:none}.node.depleted:after{content:"ESGOTADO";position:absolute;background:#21140dcc;color:#ddd;padding:2px;font-size:7px}.node.selected-target{outline:3px solid #ffd45c;outline-offset:4px}
    .map-action-button{position:absolute;z-index:25;bottom:42px;padding:8px 10px;border:2px solid #d4a44d;border-radius:5px;background:linear-gradient(#5f281a,#1c0c08);color:#ffe2a0;font-weight:900}.reports-button{left:8px}.energy-button{left:112px;pointer-events:none}
    .game-sheet{width:min(470px,94vw);background:linear-gradient(#eadcae,#bea263);color:#2e1d0e;border:4px solid #59331c}.game-sheet h2{color:#572812;margin:0 0 8px}.node-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:10px 0}.node-stats span{padding:7px 4px;background:#4b2a18;color:#ffe8b1;border-radius:4px;text-align:center;font-size:11px}.report-list{display:grid;gap:7px;max-height:58vh;overflow:auto}.report{padding:9px;border-left:5px solid #4ba96a;background:#f3e4b8;text-align:left}.report.loss{border-color:#c8453b}.report h3{margin:0;font:800 15px Georgia}.report small{color:#644b35}.report p{margin:4px 0;font-size:12px}.empty-report{padding:25px;text-align:center;color:#6d573e}.formation-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:9px 0}.formation-unit{display:grid;grid-template-columns:34px 1fr;gap:5px;align-items:center;padding:7px;background:#4b2b1b;color:#ffe8b3;border-radius:5px}.formation-unit i{grid-row:1/3;font-size:25px;font-style:normal}.formation-unit b{font-size:11px}.formation-unit input{width:100%;box-sizing:border-box;padding:6px;border:1px solid #99703c;background:#f5e5b9;color:#26180d}.formation-heroes{display:flex;gap:4px;min-height:46px;padding:5px;background:#2a180f;border-radius:5px}.formation-hero{flex:1;min-width:0;padding:5px 2px;background:#8c5929;color:#fff2c8;border:1px solid #e1b65c;text-align:center;font-size:8px}.formation-hero.empty{filter:grayscale(1);opacity:.65}.formation-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:8px 0}.formation-summary span{padding:7px 3px;background:#2d190f;color:#ffe4a4;text-align:center;border-radius:4px;font-size:10px}.formation-counter{padding:6px;background:#efe0ad;border:1px solid #80562b;color:#4c2b13;text-align:center;font-size:11px;font-weight:800}.odds-high{color:#76ed8c!important}.odds-mid{color:#ffd568!important}.odds-low{color:#ff796f!important}
  `;
  document.head.appendChild(style);

  const energy = document.createElement('div');
  energy.className = 'map-action-button energy-button';
  const renderEnergy = () => energy.textContent = '⚡ ' + state.huntEnergy + '/100';
  renderEnergy(); map.appendChild(energy);

  const reportsButton = document.createElement('button');
  reportsButton.className = 'map-action-button reports-button'; reportsButton.textContent = '📜 Relatórios'; map.appendChild(reportsButton);
  const reportsModal = document.createElement('div'); reportsModal.className = 'modal';
  reportsModal.innerHTML = '<div class="dialog game-sheet"><h2>📜 Relatórios de Batalha</h2><div class="report-list"></div><br><button class="btn close-reports">Fechar</button></div>';
  document.body.appendChild(reportsModal);
  const drawReports = () => {
    const list=reportsModal.querySelector('.report-list');
    list.innerHTML=state.battleReports.length?state.battleReports.slice(0,20).map(r=>'<article class="report '+(r.win?'':'loss')+'"><h3>'+(r.win?'🏆 Vitória':'💀 Derrota')+' · '+r.target+'</h3><small>'+r.time+' · '+r.distance+' km</small><p>'+r.detail+'</p></article>').join(''):'<div class="empty-report">Ainda não existem batalhas registadas.</div>';
  };
  reportsButton.onclick=()=>{drawReports();reportsModal.classList.add('show')}; reportsModal.querySelector('.close-reports').onclick=()=>reportsModal.classList.remove('show');

  const gatherModal = document.createElement('div'); gatherModal.className='modal';
  gatherModal.innerHTML='<div class="dialog game-sheet"><h2 id="gatherTitle">Ponto de recursos</h2><div class="node-stats"><span id="gatherLevel"></span><span id="gatherCapacity"></span><span id="gatherTime"></span></div><p>Envia uma marcha de recolha. O ponto fica esgotado temporariamente quando a recolha terminar.</p><div class="row"><button class="btn gather-cancel">Cancelar</button><button class="action primary gather-start">RECOLHER</button></div></div>';
  document.body.appendChild(gatherModal);
  let selectedResource=null;
  const resourceLabel={gold:'ouro',wood:'madeira',food:'alimentos',wisdom:'sabedoria'};
  function openResource(node){
    selectedResource=node; const level=+(node.dataset.level||1),amount=level*850,seconds=Math.max(4,level+2);
    gatherModal.querySelector('#gatherTitle').textContent=node.dataset.node;
    gatherModal.querySelector('#gatherLevel').textContent='Nível '+level;
    gatherModal.querySelector('#gatherCapacity').textContent=amount.toLocaleString('pt-PT')+' '+resourceLabel[node.dataset.resource];
    gatherModal.querySelector('#gatherTime').textContent=seconds+' s'; gatherModal.classList.add('show');
  }
  gatherModal.querySelector('.gather-cancel').onclick=()=>gatherModal.classList.remove('show');
  gatherModal.querySelector('.gather-start').onclick=()=>{
    if(!selectedResource)return; const node=selectedResource,level=+(node.dataset.level||1),seconds=Math.max(4,level+2),key=node.dataset.resource,amount=level*850;
    const mine=world.querySelector('.castle-unit.mine'),source={name:'A minha Fortaleza',x:parseFloat(mine&&mine.style.left)||48,y:parseFloat(mine&&mine.style.top)||48},target={name:node.dataset.node,x:parseFloat(node.style.left)||50,y:parseFloat(node.style.top)||50};
    gatherModal.classList.remove('show'); node.classList.add('selected-target'); window.dispatchEvent(new CustomEvent('imperio:march',{detail:{action:'Recolha',source,target}}));
    setTimeout(()=>{state[key]+=amount;state.gatheredNodes[node.dataset.node]=Date.now();node.classList.remove('selected-target');node.classList.add('depleted');window.imperioRender();window.imperioToast('Recolha concluída: +'+amount.toLocaleString('pt-PT')+' '+resourceLabel[key]);setTimeout(()=>node.classList.remove('depleted'),30000)},seconds*1000);
  };

  world.querySelectorAll('[data-kind="resource"]').forEach(node=>{node.onclick=e=>{e.stopPropagation();if(!node.classList.contains('depleted'))openResource(node)}});

  let selectedMonster=null;
  const battle=document.querySelector('#battle'),attack=document.querySelector('#attack'),legacyAttack=attack.onclick;
  world.querySelectorAll('[data-kind="monster"]').forEach(node=>{node.onclick=e=>{e.stopPropagation();selectedMonster=node;world.querySelectorAll('.selected-target').forEach(n=>n.classList.remove('selected-target'));node.classList.add('selected-target');const level=+(node.dataset.level||1),cost=level*5;document.querySelector('#battleTitle').textContent=node.dataset.node+' · Energia '+cost;const pic=node.querySelector('img');document.querySelector('#battleImage').src=pic?pic.src:'monstros-v13/hidra.png';battle.classList.add('show')}});
  attack.onclick=()=>{
    if(!selectedMonster)return legacyAttack&&legacyAttack();
    const node=selectedMonster,level=+(node.dataset.level||1),cost=level*5,troops=Math.max(50,Math.min(480,+document.querySelector('#troops').value||0));
    if(state.huntEnergy<cost)return window.imperioToast('Energia insuficiente. Precisas de '+cost);
    state.huntEnergy-=cost;renderEnergy();battle.classList.remove('show');
    const mine=world.querySelector('.castle-unit.mine'),source={name:'A minha Fortaleza',x:parseFloat(mine&&mine.style.left)||48,y:parseFloat(mine&&mine.style.top)||48},target={name:node.dataset.node,x:parseFloat(node.style.left)||50,y:parseFloat(node.style.top)||50};
    window.dispatchEvent(new CustomEvent('imperio:march',{detail:{action:'Caçada',source,target}}));
    const chance=Math.min(.94,.42+troops/900+state.siege*.012-level*.055+(localStorage.getItem('imperio-faith')==='ares'?.08:0)),win=Math.random()<chance,distance=Math.round(Math.hypot(target.x-source.x,target.y-source.y)*7.2);
    setTimeout(()=>{
      let detail;if(win){const loot=level*(600+Math.floor(Math.random()*300));state.gold+=loot;state.food+=Math.round(loot*.7);state.wood+=Math.round(loot*.5);state.diamonds+=level*2;state.power+=level*90;state.monstersKilled++;window.dispatchEvent(new CustomEvent('imperio:monster-win',{detail:{level}}));detail='Saque: '+loot.toLocaleString('pt-PT')+' ouro, '+Math.round(loot*.7).toLocaleString('pt-PT')+' alimentos e '+(level*2)+' diamantes.'}else{const lost=Math.max(12,Math.round(level*troops*.045));state.power=Math.max(0,state.power-lost*3);detail='Perdeste '+lost+' tropas. Os sobreviventes regressaram à cidade.'}
      state.battleReports.unshift({win,target:node.dataset.node,time:new Date().toLocaleString('pt-PT'),distance,detail});state.battleReports=state.battleReports.slice(0,30);node.classList.remove('selected-target');window.imperioRender();window.imperioToast(win?'Vitória! Consulta o relatório da batalha.':'Derrota. Consulta as perdas no relatório.')
    },Math.max(4,Math.min(12,Math.round(distance/22)))*1000);
    selectedMonster=null;
  };
  document.querySelector('#cancel').addEventListener('click',()=>{if(selectedMonster)selectedMonster.classList.remove('selected-target');selectedMonster=null});

  const formationModal=document.createElement('div');formationModal.className='modal';
  formationModal.innerHTML='<div class="dialog game-sheet"><h2 id="formationTitle">Formação de ataque</h2><p>Escolhe as tropas. Ataques a castelos exigem exatamente cinco heróis no rally.</p><div class="formation-heroes" id="formationHeroes"></div><div class="formation-grid"><label class="formation-unit"><i>🛡️</i><b>Infantaria · <span data-stock="inf"></span></b><input data-unit="inf" type="number" min="0" value="0"></label><label class="formation-unit"><i>🏹</i><b>Arqueiros · <span data-stock="arc"></span></b><input data-unit="arc" type="number" min="0" value="0"></label><label class="formation-unit"><i>🐎</i><b>Cavalaria · <span data-stock="cav"></span></b><input data-unit="cav" type="number" min="0" value="0"></label><label class="formation-unit"><i>🪨</i><b>Catapultas · <span data-stock="siege"></span></b><input data-unit="siege" type="number" min="0" value="0"></label></div><div class="formation-counter" id="formationCounter">Seleciona tropas para calcular as vantagens.</div><div class="formation-summary"><span>⚔️ Poder<br><b id="formationPower">0</b></span><span>🔥 Bónus<br><b id="formationBonus">0%</b></span><span>📏 Distância<br><b id="formationDistance">0 km</b></span><span>🎯 Previsão<br><b id="formationOdds">0%</b></span></div><div class="row"><button class="btn formation-cancel">Cancelar</button><button class="action primary formation-send">ENVIAR MARCHA</button></div></div>';
  document.body.appendChild(formationModal);let pendingAttack=null;
  const unitPower={inf:20,arc:24,cav:31,siege:48};
  const getFormation=()=>Object.fromEntries([...formationModal.querySelectorAll('[data-unit]')].map(input=>[input.dataset.unit,Math.max(0,Math.min(+(state[input.dataset.unit]||0),+input.value||0))]));
  const calculateFormation=()=>{
    if(!pendingAttack)return;const troops=getFormation(),heroes=state.rallyHeroes.length,name=pendingAttack.target.name||'',seed=[...name].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%3,defender=seed===0?{inf:.5,arc:.2,cav:.3,name:'Infantaria'}:seed===1?{inf:.25,arc:.5,cav:.25,name:'Arqueiros'}:{inf:.25,arc:.2,cav:.55,name:'Cavalaria'},base=Object.entries(troops).reduce((sum,[key,value])=>sum+value*unitPower[key],0),counter=troops.inf*unitPower.inf*defender.arc*.35+troops.cav*unitPower.cav*defender.inf*.35+troops.arc*unitPower.arc*defender.cav*.35,siegeBonus=troops.siege*unitPower.siege*.65,bonus=counter+siegeBonus,total=base+bonus+heroes*25000+state.power*.25,targetPower=pendingAttack.target.power||100000,chance=Math.max(5,Math.min(95,Math.round(total/(total+targetPower)*112))),bonusPercent=base?Math.round(bonus/base*100):0,dominant=troops.inf>=troops.arc&&troops.inf>=troops.cav?'Infantaria':troops.arc>=troops.cav?'Arqueiros':'Cavalaria';
    let counterText='Defesa principal: '+defender.name+'. ';counterText+=dominant==='Infantaria'&&defender.name==='Arqueiros'?'✅ Infantaria com vantagem':dominant==='Cavalaria'&&defender.name==='Infantaria'?'✅ Cavalaria com vantagem':dominant==='Arqueiros'&&defender.name==='Cavalaria'?'✅ Arqueiros com vantagem':'⚠️ Formação sem vantagem principal';if(troops.siege)counterText+=' · Catapultas +65% contra muralhas';formationModal.querySelector('#formationCounter').textContent=counterText;
    formationModal.querySelector('#formationPower').textContent=Math.round(total).toLocaleString('pt-PT');formationModal.querySelector('#formationBonus').textContent='+'+bonusPercent+'%';const odds=formationModal.querySelector('#formationOdds');odds.textContent=chance+'%';odds.className=chance>=65?'odds-high':chance>=40?'odds-mid':'odds-low';return{troops,heroes,total,chance,bonusPercent,counterText};
  };
  function openFormation(detail){
    pendingAttack=detail;formationModal.querySelector('#formationTitle').textContent=detail.action+' · '+detail.target.name;const heroBox=formationModal.querySelector('#formationHeroes'),selected=state.rallyHeroes.map(id=>(window.imperioHeroes||[]).find(h=>h.id===id)).filter(Boolean);heroBox.innerHTML=Array.from({length:5},(_,i)=>selected[i]?'<span class="formation-hero">⭐ '+selected[i].name+'<br>'+selected[i].role+'</span>':'<span class="formation-hero empty">Herói '+(i+1)+'<br>vazio</span>').join('');
    formationModal.querySelectorAll('[data-stock]').forEach(span=>{const key=span.dataset.stock;span.textContent=(state[key]||0).toLocaleString('pt-PT')+' disponíveis'});formationModal.querySelectorAll('[data-unit]').forEach(input=>{const available=+(state[input.dataset.unit]||0);input.max=available;input.value=Math.min(available,input.dataset.unit==='siege'?10:Math.round(available*.35))});
    const distance=Math.round(Math.hypot(detail.target.x-detail.source.x,detail.target.y-detail.source.y)*7.2);formationModal.querySelector('#formationDistance').textContent=distance+' km';calculateFormation();formationModal.classList.add('show');
  }
  formationModal.querySelectorAll('[data-unit]').forEach(input=>input.addEventListener('input',calculateFormation));formationModal.querySelector('.formation-cancel').onclick=()=>{formationModal.classList.remove('show');pendingAttack=null};
  formationModal.querySelector('.formation-send').onclick=()=>{
    if(!pendingAttack)return;const result=calculateFormation(),totalTroops=Object.values(result.troops).reduce((a,b)=>a+b,0);if(result.heroes!==5)return window.imperioToast('Seleciona exatamente 5 heróis no menu Heróis');if(!totalTroops)return window.imperioToast('Escolhe pelo menos uma tropa');
    Object.entries(result.troops).forEach(([key,value])=>state[key]=Math.max(0,state[key]-value));const mission=pendingAttack,distance=Math.round(Math.hypot(mission.target.x-mission.source.x,mission.target.y-mission.source.y)*7.2),duration=Math.max(4,Math.min(12,Math.round(distance/22))),win=Math.random()*100<result.chance;formationModal.classList.remove('show');window.dispatchEvent(new CustomEvent('imperio:march',{detail:mission}));
    setTimeout(()=>{let detail;if(win){const reward=Math.round((mission.target.power||100000)*.035);state.gold+=reward;state.power+=Math.round(reward*.1);Object.entries(result.troops).forEach(([key,value])=>state[key]+=Math.round(value*.95));detail='A formação venceu com '+Math.round(result.total).toLocaleString('pt-PT')+' de poder e +'+result.bonusPercent+'% de bónus. '+result.counterText+'. Saque: '+reward.toLocaleString('pt-PT')+' ouro.'}else{const rate=.12+Math.random()*.18,lost=[];Object.entries(result.troops).forEach(([key,value])=>{const survivors=Math.round(value*(1-rate));state[key]+=survivors;lost.push(Math.max(0,value-survivors))});detail='A defesa resistiu. '+result.counterText+'. Baixas: '+lost.reduce((a,b)=>a+b,0).toLocaleString('pt-PT')+' tropas. Os sobreviventes regressaram.'}state.battleReports.unshift({win,target:mission.target.name,time:new Date().toLocaleString('pt-PT'),distance,detail});state.battleReports=state.battleReports.slice(0,30);window.imperioRender();window.imperioToast(win?'Castelo derrotado! Relatório disponível.':'Ataque repelido. Consulta o relatório.')},duration*1000);pendingAttack=null;
  };
  window.addEventListener('imperio:prepare-attack',event=>openFormation(event.detail));

  function decorateCastles(){
    world.querySelectorAll('.castle-unit,.player-castle').forEach((castle,index)=>{
      if(castle.querySelector('.castle-level'))return;const level=castle.dataset.level||((index%3)+1)*5;castle.classList.add('level-'+(level>=12?3:level>=6?2:1));const badge=document.createElement('b');badge.className='castle-level';badge.textContent='Nv.'+level;castle.appendChild(badge);
    });
  }
  function drawTerritories(){
    world.querySelectorAll('.alliance-zone').forEach(z=>z.remove());world.querySelectorAll('.castle-unit.ally,.castle-unit.enemy').forEach(castle=>{const zone=document.createElement('i');zone.className='alliance-zone '+(castle.classList.contains('enemy')?'enemy-zone':'');zone.style.left=castle.style.left;zone.style.top=castle.style.top;world.insertBefore(zone,world.firstChild)});
  }
  decorateCastles();drawTerritories();
  const observer=new MutationObserver(()=>decorateCastles());observer.observe(world,{childList:true});
  setInterval(()=>{if(state.huntEnergy<100){state.huntEnergy++;renderEnergy()}},30000);
})();
