(function(){
  'use strict';
  var state=window.imperioState||{},view=document.getElementById('map');
  if(!view)return;
  var map=view.querySelector('.map'),world=map&&map.querySelector('.world-layer');
  if(!map||!world)return;

  var style=document.createElement('style');
  style.textContent='body.map-v55 .nav{display:none!important}body.map-v55 .realm{margin:0!important}body.map-v55 #map{height:calc(100vh - 62px)!important;padding:0!important;overflow:hidden!important}body.map-v55 #map .section-head{display:none!important}'+
  'body.map-v55 #map .map{height:calc(100vh - 62px)!important;border:0!important;overflow:hidden!important;touch-action:none!important;background:#172417!important;filter:none!important}'+
  'body.map-v55 #map .world-layer{display:block!important;position:absolute!important;left:0!important;top:0!important;width:2240px!important;height:2240px!important;transform-origin:0 0!important;transition:none!important;background:linear-gradient(#18301b22,#2b1c0b22),url("mapa-realista-v41.png") center/cover!important;filter:saturate(1.15) contrast(1.05)!important}'+
  'body.map-v55 #map .world-layer .node{display:grid!important;visibility:visible!important;place-items:center;position:absolute!important;transform:translate(-50%,-50%)!important;pointer-events:auto!important;z-index:8!important}'+
  'body.map-v55 #map .world-layer .monster-unit,body.map-v55 #map .world-layer .mine-unit{width:58px!important;height:62px!important;border:2px solid #c69b4b!important;border-radius:50%!important;background:radial-gradient(circle,#5b4024,#180e08)!important;box-shadow:0 5px 9px #000b!important}'+
  'body.map-v55 #map .world-layer .monster-unit img{display:block!important;width:50px!important;height:44px!important;object-fit:contain!important}body.map-v55 #map .world-layer .node small{display:block!important;background:#110b08e8!important;color:#ffe3a0!important;border:1px solid #a97835!important;padding:1px 4px!important;font-size:8px!important;white-space:nowrap!important}'+
  'body.map-v55 #map .world-layer .v55-senate{width:105px!important;height:92px!important;border:4px solid #65d9ff!important;border-radius:12px!important;background:linear-gradient(#07131b33,#07131ba8),url("senado-realista-v41.png") center/cover!important;box-shadow:0 0 0 5px #123d50,0 0 25px #5bd7ff!important;z-index:20!important}body.map-v55 #map .world-layer .v55-senate small{margin-top:58px!important;color:#bdeeff!important;border-color:#5ed8ff!important}'+
  '.v55-ui{position:absolute;z-index:70;pointer-events:none}.v55-ui button{pointer-events:auto}.v55-top{left:7px;right:7px;top:7px;display:flex;justify-content:space-between}.v55-status{padding:7px 10px;border:2px solid #c99847;border-radius:7px;background:#160e09eb;color:#ffe4a5;font:900 10px Georgia}.v55-zoom{display:grid;gap:4px}.v55-zoom button{width:40px;height:40px;border:2px solid #d0a452;border-radius:50%;background:#24140ded;color:#ffe5a7;font-size:22px}.v55-bottom{left:0;right:0;bottom:0}.v55-coords{width:min(390px,88%);margin:0 auto 4px;display:grid;grid-template-columns:45px 1fr 45px;border:2px solid #c79445;border-radius:23px;overflow:hidden;background:#101820f2;color:#ffe4a4}.v55-coords button{border:0;background:#71471d;color:#fff0bc;font-size:21px}.v55-coords b{text-align:center;padding:11px 2px;font:900 12px Georgia}.v55-dock{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;padding:5px;background:linear-gradient(#25160ff8,#080707);border-top:2px solid #ba8237}.v55-dock button{min-width:0;height:52px;border:2px solid #a97b39;border-radius:9px;background:linear-gradient(#5b321c,#20110b);color:#ffe3a5;font-size:21px}.v55-dock small{display:block;font-size:7px;font-weight:900}.v55-select{position:absolute;z-index:65;border:3px solid #58e6ff;background:#45dcff33;pointer-events:none}';
  document.head.appendChild(style);

  var oldCanvas=map.querySelector('.kingdom-canvas'),oldLayer=map.querySelector('.kingdom-entities');
  if(oldLayer){Array.prototype.slice.call(oldLayer.querySelectorAll('.node')).forEach(function(n){world.appendChild(n)});oldLayer.remove()}
  if(oldCanvas)oldCanvas.remove();
  Array.prototype.slice.call(world.querySelectorAll('.node')).forEach(function(n){n.hidden=false;if(n.dataset.mapX)n.style.left=(Number(n.dataset.mapX)/11.2)+'%';if(n.dataset.mapY)n.style.top=(Number(n.dataset.mapY)/11.2)+'%'});

  var castleX=Number(state.castleX);if(!isFinite(castleX)||castleX<0||castleX>1119)castleX=336;
  var castleY=Number(state.castleY);if(!isFinite(castleY)||castleY<0||castleY>1119)castleY=739;
  var own=world.querySelector('.player-castle.mine,.castle-unit.mine');
  if(!own){own=document.createElement('button');own.className='node player-castle castle-unit mine v55-senate';own.innerHTML='<small>MEU SENADO · Nv.'+(Number(state.senateLv)||1)+'</small>';own.dataset.node='Meu Senado';world.appendChild(own)}
  own.classList.add('v55-senate');own.style.left=(castleX/11.2)+'%';own.style.top=(castleY/11.2)+'%';own.onclick=function(e){e.stopPropagation();window.imperioShow('city')};

  var nearby=world.querySelectorAll('.v55-nearby');
  if(!nearby.length){
    var monsters=[['Lobo','lobo.png'],['Javali','javali.png'],['Aranha','aranha.png'],['Escorpião','escorpiao.png'],['Serpente','serpente.png'],['Ciclope','ciclope.png']];
    var mines=[['Ouro','🪙'],['Madeira','🪵'],['Alimentos','🌾'],['Cristal','🔮']];
    var offsets=[[-95,-68],[-68,-25],[-42,-88],[-18,-48],[22,-82],[49,-35],[83,-69],[97,-12],[-91,32],[-58,69],[-21,87],[26,61],[61,84],[92,43],[-77,104],[-34,119],[18,112],[67,119],[116,78],[118,-49],[-119,-9],[-116,71],[-61,-112],[62,-119],[-132,119],[132,122],[-138,-92],[139,-100]];
    offsets.forEach(function(o,i){var n=document.createElement('button'),monster=i%2===0,lv=1+i%8;n.className='node v55-nearby '+(monster?'monster monster-unit':'resource mine-unit');n.dataset.kind=monster?'monster':'resource';n.dataset.level=lv;n.style.left=(Math.max(10,Math.min(1110,castleX+o[0]))/11.2)+'%';n.style.top=(Math.max(10,Math.min(1110,castleY+o[1]))/11.2)+'%';if(monster){var m=monsters[i%monsters.length];n.dataset.node=m[0]+' Lv'+lv;n.innerHTML='<img src="monstros-v13/'+m[1]+'"><small>'+m[0]+' · Lv'+lv+'</small>'}else{var r=mines[i%mines.length];n.dataset.node='Mina de '+r[0]+' Lv'+lv;n.innerHTML='<span style="font-size:30px">'+r[1]+'</span><small>'+r[0]+' · Lv'+lv+'</small>'}n.onclick=function(e){e.stopPropagation();window.imperioToast(n.dataset.node+' selecionado')};world.appendChild(n)})
  }

  var ui=document.createElement('div');ui.innerHTML='<div class="v55-ui v55-top"><span class="v55-status">REINO 01 · MAPA 1.120 × 1.120 KM</span><div class="v55-zoom"><button data-plus>＋</button><button data-minus>−</button></div></div><div class="v55-ui v55-bottom"><div class="v55-coords"><button data-home>⌖</button><b>#01 · X: '+Math.round(castleX)+' · Y: '+Math.round(castleY)+'</b><button data-search>🔎</button></div><div class="v55-dock"><button data-view="city">🏛️<small>SENADO</small></button><button data-view="campaign">📜<small>MISSÕES</small></button><button data-view="heroes">🪖<small>HERÓIS</small></button><button data-view="colossi">🐾<small>COLOSSOS</small></button><button data-view="army">⚔️<small>TROPAS</small></button><button data-view="alliance">🛡️<small>ALIANÇA</small></button><button data-view="shop">🎒<small>BOLSA</small></button></div></div>';Array.prototype.slice.call(ui.children).forEach(function(n){map.appendChild(n)});
  var scale=.62,panX=0,panY=0,drag=false,startX=0,startY=0,baseX=0,baseY=0,coord=map.querySelector('.v55-coords b');
  function clamp(){var w=2240*scale,h=2240*scale;panX=Math.min(0,Math.max(map.clientWidth-w,panX));panY=Math.min(0,Math.max(map.clientHeight-h,panY))}
  function draw(){clamp();world.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';var x=Math.round((map.clientWidth/2-panX)/scale/2),y=Math.round((map.clientHeight/2-panY)/scale/2);coord.textContent='#01 · X: '+Math.max(0,Math.min(1120,x))+' · Y: '+Math.max(0,Math.min(1120,y))}
  function center(x,y){panX=map.clientWidth/2-x*2*scale;panY=map.clientHeight/2-y*2*scale;draw()}
  function activate(){var active=view.classList.contains('active');document.body.classList.toggle('map-v55',active);if(active)setTimeout(function(){center(castleX,castleY)},30)}
  new MutationObserver(activate).observe(view,{attributes:true,attributeFilter:['class']});document.addEventListener('click',function(){setTimeout(activate,0)});activate();
  map.addEventListener('pointerdown',function(e){if(e.target.closest('button'))return;drag=true;startX=e.clientX;startY=e.clientY;baseX=panX;baseY=panY;try{map.setPointerCapture(e.pointerId)}catch(_){}});
  map.addEventListener('pointermove',function(e){if(!drag)return;panX=baseX+e.clientX-startX;panY=baseY+e.clientY-startY;draw()});map.addEventListener('pointerup',function(){drag=false});map.addEventListener('pointercancel',function(){drag=false});
  map.querySelector('[data-plus]').onclick=function(){scale=Math.min(1.25,scale*1.25);draw()};map.querySelector('[data-minus]').onclick=function(){scale=Math.max(.36,scale/1.25);draw()};map.querySelector('[data-home]').onclick=function(){center(castleX,castleY);window.imperioToast('Regressaste ao teu Senado')};
  map.querySelector('[data-search]').onclick=function(){var targets=world.querySelectorAll('.v55-nearby');if(!targets.length)return;var n=targets[Math.floor(Math.random()*targets.length)],x=parseFloat(n.style.left)*11.2,y=parseFloat(n.style.top)*11.2;center(x,y);n.classList.add('search-pulse');setTimeout(function(){n.classList.remove('search-pulse')},2500);window.imperioToast('Alvo encontrado: '+n.dataset.node)};
  Array.prototype.slice.call(map.querySelectorAll('[data-view]')).forEach(function(b){b.onclick=function(){window.imperioShow(b.dataset.view)}});
  window.addEventListener('resize',function(){draw()});setTimeout(function(){center(castleX,castleY)},120);
})();
