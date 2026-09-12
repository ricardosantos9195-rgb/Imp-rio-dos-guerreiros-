(function(){
  'use strict';
  var state=window.imperioState||{},view=document.getElementById('map');
  if(!view)return;
  var map=view.querySelector('.map'),world=map&&map.querySelector('.world-layer');
  if(!map||!world)return;

  /* The old map extensions are loaded for other game screens, but their map
     controls and generated targets must not coexist with this engine. */
  Array.prototype.slice.call(map.querySelectorAll('.map-search,.map-target-info,.teleport-tools,.map-controls,.mini-map,.map-legend,.march-panel,.map-coords,.map-action-button,.map-hud')).forEach(function(n){n.remove()});
  Array.prototype.slice.call(world.querySelectorAll('.monster,.monster-unit,.resource,.mine-unit,.generated-v41,.portal,.territory')).forEach(function(n){
    if(!n.classList.contains('player-castle')&&!n.classList.contains('castle-unit')&&!n.classList.contains('throne'))n.remove();
  });
  Array.prototype.slice.call(map.querySelectorAll('.v55-ui')).forEach(function(n){n.remove()});

  var style=document.createElement('style');
  style.textContent='body.map-v55 .nav{display:none!important}body.map-v55 .realm{margin:0!important}body.map-v55 #map{height:calc(100vh - 62px)!important;padding:0!important;overflow:hidden!important}body.map-v55 #map .section-head{display:none!important}'+
  'body.map-v55 #map .map{height:calc(100vh - 62px)!important;border:0!important;overflow:hidden!important;touch-action:none!important;background:#172417!important;filter:none!important}'+
  'body.map-v55 #map .world-layer{display:block!important;position:absolute!important;left:0!important;top:0!important;width:2240px!important;height:2240px!important;transform-origin:0 0!important;transition:none!important;background:linear-gradient(#18301b22,#2b1c0b22),url("mapa-realista-v41.png") center/cover!important;filter:saturate(1.15) contrast(1.05)!important}'+
  'body.map-v55 #map .world-layer .node{display:grid!important;visibility:visible!important;place-items:center;position:absolute!important;transform:translate(-50%,-50%)!important;pointer-events:auto!important;z-index:8!important}'+
  'body.map-v55 #map .world-layer .monster-unit,body.map-v55 #map .world-layer .mine-unit{width:58px!important;height:62px!important;border:2px solid #c69b4b!important;border-radius:50%!important;background:radial-gradient(circle,#5b4024,#180e08)!important;box-shadow:0 5px 9px #000b!important}'+
  'body.map-v55 #map .world-layer .monster-unit img{display:block!important;width:50px!important;height:44px!important;object-fit:contain!important}body.map-v55 #map .world-layer .node small{display:block!important;background:#110b08e8!important;color:#ffe3a0!important;border:1px solid #a97835!important;padding:1px 4px!important;font-size:8px!important;white-space:nowrap!important}'+
  'body.map-v55 #map .world-layer .v55-senate{width:105px!important;height:92px!important;border:4px solid #65d9ff!important;border-radius:12px!important;background:linear-gradient(#07131b33,#07131ba8),url("senado-realista-v41.png") center/cover!important;box-shadow:0 0 0 5px #123d50,0 0 25px #5bd7ff!important;z-index:20!important}body.map-v55 #map .world-layer .v55-senate small{margin-top:58px!important;color:#bdeeff!important;border-color:#5ed8ff!important}'+
  'body.map-v55 #map .world-layer .throne{left:50%!important;top:50%!important;width:640px!important;height:520px!important;border:0!important;border-radius:0!important;background:url("fortaleza-trono-supremo-v58.webp") center/contain no-repeat!important;box-shadow:none!important;filter:drop-shadow(0 26px 20px #000e) drop-shadow(0 0 32px #f0b83fe0)!important;z-index:24!important;color:#fff!important}body.map-v55 #map .world-layer .throne:before{content:"";position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);width:900px;height:900px;border:6px solid #d9a936b8;border-radius:50%;background:radial-gradient(circle,#52130c0d 0 34%,#7f1c162e 35% 52%,#e3352342 53% 65%,#f0b83f21 66% 73%,transparent 74%);box-shadow:0 0 85px #ffb72d8c,inset 0 0 70px #8c190a80;z-index:-1;pointer-events:none}body.map-v55 #map .world-layer .throne small{position:absolute!important;left:50%!important;bottom:22px!important;transform:translateX(-50%)!important;margin:0!important;padding:8px 15px!important;border:3px solid #e2b953!important;border-radius:6px!important;background:#170806f2!important;color:#fff0bd!important;font:900 13px Georgia!important;white-space:nowrap!important;box-shadow:0 5px 14px #000!important}'+
  'body.map-v55 #map .world-layer .v59-temple{width:155px!important;height:170px!important;border:0!important;border-radius:0!important;background:url("edificios-v16/temple.png") center/contain no-repeat!important;filter:drop-shadow(0 10px 10px #000c) drop-shadow(0 0 13px #ffcf55aa)!important;z-index:19!important}body.map-v55 #map .world-layer .v59-temple:before{content:"";position:absolute;left:50%;bottom:70%;width:9px;height:330px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#ff4a35,#fff2aa,#ff4a35,transparent);box-shadow:0 0 18px #ff241c;opacity:.72;z-index:-1;pointer-events:none}body.map-v55 #map .world-layer .v59-temple small{position:absolute!important;left:50%;bottom:4px;transform:translateX(-50%);padding:5px 8px!important;border:2px solid #e2b953!important;background:#190b08ed!important;color:#fff0bd!important;font:900 10px Georgia!important}'+
  'body.map-v55 #map .map.v59-strategic .world-layer:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#ff3b2422 0 18%,#e52b1a46 19% 48%,#7e100c25 49% 72%,transparent 73%),repeating-linear-gradient(0deg,#ff3c2518 0 2px,transparent 2px 18px),repeating-linear-gradient(90deg,#ff3c2518 0 2px,transparent 2px 18px);box-shadow:inset 0 0 180px #290000cc;pointer-events:none;z-index:2}body.map-v55 #map .map.v59-strategic .monster-unit,body.map-v55 #map .map.v59-strategic .mine-unit,body.map-v55 #map .map.v59-strategic .castle-unit:not(.throne),body.map-v55 #map .map.v59-strategic .player-castle{opacity:0!important;pointer-events:none!important}body.map-v55 #map .map.v59-strategic .throne{width:390px!important;height:320px!important}body.map-v55 #map .map.v59-strategic .throne:before{width:650px;height:650px;background:#d7191942;border-color:#ffcf65;box-shadow:0 0 90px #ff2a22aa,inset 0 0 55px #6f0000}body.map-v55 #map .map.v59-strategic .v59-temple{width:210px!important;height:220px!important;filter:drop-shadow(0 0 24px #ff3b2fee)!important}body.map-v55 #map .map.v59-strategic .v59-temple:before{height:520px;opacity:1}body.map-v55 #map .map.v59-strategic .v55-status:after{content:" · VISÃO ESTRATÉGICA";color:#ffcf65}'+
  '.v55-ui{position:absolute;z-index:70;pointer-events:none}.v55-ui button{pointer-events:auto}.v55-top{left:8px;right:8px;top:8px;display:flex;justify-content:space-between;align-items:flex-start}.v55-status{padding:7px 10px;border:2px solid #c99847;border-radius:7px;background:#160e09eb;color:#ffe4a5;font:900 10px Georgia;box-shadow:0 3px 10px #000b}.v55-zoom{display:grid;gap:6px}.v55-zoom button{width:39px;height:39px;border:2px solid #d0a452;border-radius:50%;background:#24140df2;color:#ffe5a7;font-size:22px}.v55-bottom{left:0;right:0;bottom:0}.v55-coords{width:min(360px,82%);margin:0 auto 5px;display:grid;grid-template-columns:44px 1fr 44px;border:2px solid #c79445;border-radius:23px;overflow:hidden;background:#101820f5;color:#ffe4a4;box-shadow:0 2px 10px #000}.v55-coords button{border:0;background:#71471d;color:#fff0bc;font-size:21px}.v55-coords b{text-align:center;padding:11px 2px;font:900 12px Georgia}.v55-dock{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:5px;background:linear-gradient(#25160ff8,#080707);border-top:2px solid #ba8237}.v55-dock button{min-width:0;height:52px;border:2px solid #a97b39;border-radius:9px;background:linear-gradient(#5b321c,#20110b);color:#ffe3a5;font-size:21px}.v55-dock small{display:block;font-size:7px;font-weight:900}.v55-select{position:absolute;z-index:65;border:3px solid #58e6ff;background:#45dcff33;pointer-events:none}';
  document.head.appendChild(style);

  var oldCanvas=map.querySelector('.kingdom-canvas'),oldLayer=map.querySelector('.kingdom-entities');
  if(oldLayer){Array.prototype.slice.call(oldLayer.querySelectorAll('.node')).forEach(function(n){world.appendChild(n)});oldLayer.remove()}
  if(oldCanvas)oldCanvas.remove();
  Array.prototype.slice.call(world.querySelectorAll('.monster,.monster-unit,.resource,.mine-unit,.generated-v41,.portal,.territory')).forEach(function(n){
    if(!n.classList.contains('player-castle')&&!n.classList.contains('castle-unit')&&!n.classList.contains('throne'))n.remove();
  });
  Array.prototype.slice.call(world.querySelectorAll('.node')).forEach(function(n){n.hidden=false;if(n.dataset.mapX)n.style.left=(Number(n.dataset.mapX)/11.2)+'%';if(n.dataset.mapY)n.style.top=(Number(n.dataset.mapY)/11.2)+'%'});

  var castleX=Number(state.castleX);if(!isFinite(castleX)||castleX<0||castleX>1119)castleX=336;
  var castleY=Number(state.castleY);if(!isFinite(castleY)||castleY<0||castleY>1119)castleY=739;
  var own=world.querySelector('.player-castle.mine,.castle-unit.mine');
  if(!own){own=document.createElement('button');own.className='node player-castle castle-unit mine v55-senate';own.innerHTML='<small>MEU SENADO · Nv.'+(Number(state.senateLv)||1)+'</small>';own.dataset.node='Meu Senado';world.appendChild(own)}
  own.classList.add('v55-senate');own.style.left=(castleX/11.2)+'%';own.style.top=(castleY/11.2)+'%';own.onclick=function(e){e.stopPropagation();window.imperioShow('city')};

  var throne=world.querySelector('[data-kind="throne"],.node.throne');
  if(throne){throne.classList.add('throne');throne.style.left='50%';throne.style.top='50%';throne.dataset.node='Fortaleza do Trono Supremo';throne.innerHTML='<small>FORTALEZA DO TRONO · X560 Y560</small>'}

  var templeData=[['Templo do Norte',560,165],['Templo do Oriente',955,560],['Templo do Sul',560,955],['Templo do Ocidente',165,560]];
  templeData.forEach(function(t){
    var temple=document.createElement('button');
    temple.className='node v59-temple';temple.dataset.kind='temple';temple.dataset.node=t[0];
    temple.style.left=(t[1]/11.2)+'%';temple.style.top=(t[2]/11.2)+'%';
    temple.innerHTML='<small>'+t[0].toUpperCase()+'</small>';
    temple.onclick=function(e){e.stopPropagation();center(t[1],t[2]);window.imperioToast(t[0]+' · objetivo do evento SWZ')};
    world.appendChild(temple);
  });

  var nearby=world.querySelectorAll('.v55-nearby');
  if(!nearby.length){
    var monsters=[['Lobo','lobo.png'],['Javali','javali.png'],['Aranha','aranha.png'],['Escorpião','escorpiao.png'],['Serpente','serpente.png'],['Ciclope','ciclope.png']];
    var mines=[['Ouro','🪙'],['Madeira','🪵'],['Alimentos','🌾'],['Cristal','🔮']];
    /* Sparse rings keep every target tappable while the kingdom still feels alive. */
    var offsets=[[-210,-155],[-90,-205],[55,-220],[195,-165],[235,-35],[210,125],[105,220],[-45,235],[-185,175],[-235,40],[-125,-75],[0,-120],[125,-70],[135,70],[25,135],[-115,105]];
    offsets.forEach(function(o,i){var n=document.createElement('button'),monster=i%2===0,lv=1+i%8;n.className='node v55-nearby '+(monster?'monster monster-unit':'resource mine-unit');n.dataset.kind=monster?'monster':'resource';n.dataset.level=lv;n.style.left=(Math.max(10,Math.min(1110,castleX+o[0]))/11.2)+'%';n.style.top=(Math.max(10,Math.min(1110,castleY+o[1]))/11.2)+'%';if(monster){var m=monsters[i%monsters.length];n.dataset.node=m[0]+' Lv'+lv;n.innerHTML='<img src="monstros-v13/'+m[1]+'"><small>'+m[0]+' · Lv'+lv+'</small>'}else{var r=mines[i%mines.length];n.dataset.node='Mina de '+r[0]+' Lv'+lv;n.innerHTML='<span style="font-size:30px">'+r[1]+'</span><small>'+r[0]+' · Lv'+lv+'</small>'}n.onclick=function(e){e.stopPropagation();window.imperioToast(n.dataset.node+' selecionado')};world.appendChild(n)})
  }

  var ui=document.createElement('div');ui.innerHTML='<div class="v55-ui v55-top"><span class="v55-status">REINO 01 · MAPA 1.120 × 1.120 KM</span><div class="v55-zoom"><button data-plus>＋</button><button data-minus>−</button></div></div><div class="v55-ui v55-bottom"><div class="v55-coords"><button data-home>⌖</button><b>#01 · X: '+Math.round(castleX)+' · Y: '+Math.round(castleY)+'</b><button data-search>🔎</button></div><div class="v55-dock"><button data-view="city">🏛️<small>SENADO</small></button><button data-view="campaign">📜<small>MISSÕES</small></button><button data-view="heroes">🪖<small>HERÓIS</small></button><button data-view="colossi">🐾<small>COLOSSOS</small></button><button data-view="army">⚔️<small>TROPAS</small></button><button data-view="alliance">🛡️<small>ALIANÇA</small></button><button data-view="shop">🎒<small>BOLSA</small></button></div></div>';Array.prototype.slice.call(ui.children).forEach(function(n){map.appendChild(n)});
  var scale=.62,panX=0,panY=0,drag=false,startX=0,startY=0,baseX=0,baseY=0,coord=map.querySelector('.v55-coords b'),status=map.querySelector('.v55-status');
  function clamp(){var w=2240*scale,h=2240*scale;panX=Math.min(0,Math.max(map.clientWidth-w,panX));panY=Math.min(0,Math.max(map.clientHeight-h,panY))}
  function draw(){clamp();var strategic=scale<=.4;map.classList.toggle('v59-strategic',strategic);status.textContent=strategic?'REINO 01 · VISÃO ESTRATÉGICA · TRONO E 4 TEMPLOS':'REINO 01 · MAPA 1.120 × 1.120 KM';world.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';var x=Math.round((map.clientWidth/2-panX)/scale/2),y=Math.round((map.clientHeight/2-panY)/scale/2);coord.textContent='#01 · X: '+Math.max(0,Math.min(1120,x))+' · Y: '+Math.max(0,Math.min(1120,y))}
  function center(x,y){panX=map.clientWidth/2-x*2*scale;panY=map.clientHeight/2-y*2*scale;draw()}
  function activate(){var active=view.classList.contains('active');document.body.classList.toggle('map-v55',active);if(active)setTimeout(function(){center(castleX,castleY)},30)}
  new MutationObserver(activate).observe(view,{attributes:true,attributeFilter:['class']});document.addEventListener('click',function(){setTimeout(activate,0)});activate();
  map.addEventListener('pointerdown',function(e){if(e.target.closest('button'))return;drag=true;startX=e.clientX;startY=e.clientY;baseX=panX;baseY=panY;try{map.setPointerCapture(e.pointerId)}catch(_){}});
  map.addEventListener('pointermove',function(e){if(!drag)return;panX=baseX+e.clientX-startX;panY=baseY+e.clientY-startY;draw()});map.addEventListener('pointerup',function(){drag=false});map.addEventListener('pointercancel',function(){drag=false});
  map.querySelector('[data-plus]').onclick=function(){scale=Math.min(1.25,scale*1.25);draw()};map.querySelector('[data-minus]').onclick=function(){scale=Math.max(.29,scale/1.25);draw()};map.querySelector('[data-home]').onclick=function(){center(castleX,castleY);window.imperioToast('Regressaste ao teu Senado')};
  map.querySelector('[data-search]').onclick=function(){var targets=world.querySelectorAll('.v55-nearby');if(!targets.length)return;var n=targets[Math.floor(Math.random()*targets.length)],x=parseFloat(n.style.left)*11.2,y=parseFloat(n.style.top)*11.2;center(x,y);n.classList.add('search-pulse');setTimeout(function(){n.classList.remove('search-pulse')},2500);window.imperioToast('Alvo encontrado: '+n.dataset.node)};
  Array.prototype.slice.call(map.querySelectorAll('[data-view]')).forEach(function(b){b.onclick=function(){window.imperioShow(b.dataset.view)}});
  window.addEventListener('resize',function(){draw()});setTimeout(function(){center(castleX,castleY)},120);
})();
