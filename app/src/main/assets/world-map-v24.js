(() => {
  'use strict';
  const map = document.querySelector('.map');
  const world = map && map.querySelector('.world-layer');
  if (!map || !world) return;

  const style = document.createElement('style');
  style.textContent = `
    .world-layer{transform-origin:center center;transition:scale .18s ease;background-image:linear-gradient(120deg,#26361a18,#8c5d2b1a),url('mapa-neutro-v12.jpg')!important}
    .world-layer:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,#0a0805a6 100%);z-index:2}
    .kingdom-grid{z-index:3!important;background-size:4% 4%!important;opacity:.55}
    .map-controls{position:absolute;right:7px;top:7px;z-index:24;display:grid;gap:5px}.map-controls button{width:40px;height:40px;border:2px solid #d6ae65;border-radius:7px;background:linear-gradient(#49331f,#170e08);color:#ffe4a4;font-size:22px;font-weight:900;box-shadow:0 3px 8px #000a}
    .map-legend{position:absolute;left:7px;bottom:39px;z-index:22;display:flex;gap:6px;padding:5px 7px;border:1px solid #9b753e;background:#100b08dd;color:#f7e2b5;font-size:9px;border-radius:5px}.map-legend b{font-size:11px}.map-legend .mine-key{color:#69d6ff}.map-legend .ally-key{color:#73e98a}.map-legend .enemy-key{color:#ff776e}
    .mini-map{position:absolute;right:55px;top:7px;width:108px;height:78px;z-index:22;border:2px solid #d6ae65;border-radius:5px;background:linear-gradient(145deg,#506440,#25341f);box-shadow:0 4px 12px #000b;overflow:hidden;pointer-events:none}.mini-map:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#f3dca626 1px,transparent 1px),linear-gradient(90deg,#f3dca626 1px,transparent 1px);background-size:12px 12px}.mini-dot{position:absolute;width:5px;height:5px;border-radius:50%;box-shadow:0 0 4px #000}.mini-dot.mine{background:#62d7ff}.mini-dot.ally{background:#63eb80}.mini-dot.enemy{background:#ff6259}.mini-viewport{position:absolute;left:36%;top:30%;width:28%;height:35%;border:1px solid #fff;background:#fff2}
    .castle-unit{height:82px!important;overflow:visible!important}.castle-art{position:relative;display:block;width:58px;height:47px;margin:auto;filter:drop-shadow(0 6px 4px #000b)}.castle-art i{position:absolute;display:block;background:linear-gradient(90deg,#8e704f,#d2b077 45%,#6c5138);border:1px solid #3a2518}.castle-art .tower{width:15px;height:31px;bottom:0}.castle-art .tower:before,.castle-art .keep:before{content:"";position:absolute;left:-2px;right:-2px;top:-6px;height:7px;background:repeating-linear-gradient(90deg,#b99764 0 4px,transparent 4px 7px);border-bottom:2px solid #49311f}.castle-art .left{left:2px}.castle-art .right{right:2px}.castle-art .keep{width:31px;height:39px;left:13px;bottom:0}.castle-art .gate{width:10px;height:15px;left:24px;bottom:0;border-radius:7px 7px 0 0;background:#25160e}.castle-unit.mine .castle-art i,.player-castle.mine .castle-art i{background:linear-gradient(90deg,#477e94,#a9d7df,#315f73)}.castle-unit.ally .castle-art i{background:linear-gradient(90deg,#46784e,#9cc987,#315637)}.castle-unit.enemy .castle-art i{background:linear-gradient(90deg,#863d35,#c97865,#592721)}
    .march-layer{position:absolute;inset:0;width:100%;height:100%;z-index:12;pointer-events:none;overflow:visible}.march-line{fill:none;stroke:#ffd66b;stroke-width:.5;stroke-dasharray:2 1;filter:drop-shadow(0 0 2px #ff9d20);animation:marchDash .7s linear infinite}.march-line.enemy{stroke:#ff5f55}.march-token{position:absolute;z-index:14;transform:translate(-50%,-50%);font-size:25px;filter:drop-shadow(0 3px 3px #000);pointer-events:none;transition-timing-function:linear}.march-label{position:absolute;z-index:15;transform:translate(-50%,-145%);background:#160d08e8;border:1px solid #e6b956;color:#ffe7a9;border-radius:4px;padding:3px 6px;font-size:8px;font-weight:900;white-space:nowrap;pointer-events:none;transition-timing-function:linear}@keyframes marchDash{to{stroke-dashoffset:-3}}
    .march-panel{position:absolute;left:50%;top:7px;transform:translateX(-50%);z-index:23;max-width:42%;padding:5px 9px;background:linear-gradient(#4b2117,#190b08);border:2px solid #ce9d4b;color:#ffe5a6;border-radius:5px;font-size:10px;font-weight:800;text-align:center;box-shadow:0 3px 9px #000a}.march-panel.idle{opacity:.78}
    @media(max-width:620px){.mini-map{width:84px;height:60px;right:52px}.map-controls button{width:36px;height:36px}.map-legend{bottom:38px}.march-panel{top:72px;max-width:55%}}
  `;
  document.head.appendChild(style);

  let zoom = 1;
  const controls = document.createElement('div');
  controls.className = 'map-controls';
  controls.innerHTML = '<button data-zoom="in" aria-label="Aproximar">+</button><button data-zoom="out" aria-label="Afastar">−</button><button data-zoom="home" aria-label="Centrar castelo">⌂</button>';
  map.appendChild(controls);
  const setZoom = value => {
    zoom = Math.max(.72, Math.min(1.65, value));
    world.style.scale = zoom;
    window.imperioToast('Zoom do mapa: ' + Math.round(zoom * 100) + '%');
  };
  controls.addEventListener('pointerdown', e => e.stopPropagation());
  controls.addEventListener('click', e => {
    e.stopPropagation();
    const action = e.target.dataset.zoom;
    if (action === 'in') setZoom(zoom + .15);
    if (action === 'out') setZoom(zoom - .15);
    if (action === 'home') {
      setZoom(1);
      const mine = world.querySelector('.castle-unit.mine,.player-castle.mine');
      if (mine) mine.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
    }
  });
  map.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? .1 : -.1)); }, {passive:false});

  let pinchStart = 0, pinchZoom = 1;
  map.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      pinchStart = Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      pinchZoom = zoom;
    }
  }, {passive:true});
  map.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinchStart) {
      const distance = Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      zoom = Math.max(.72, Math.min(1.65, pinchZoom * distance / pinchStart));
      world.style.scale = zoom;
    }
  }, {passive:true});

  const mini = document.createElement('div');
  mini.className = 'mini-map';
  mini.innerHTML = '<i class="mini-viewport"></i>';
  map.appendChild(mini);
  const syncMiniMap = () => {
    mini.querySelectorAll('.mini-dot').forEach(dot => dot.remove());
    world.querySelectorAll('.castle-unit,.player-castle').forEach(castle => {
      const dot = document.createElement('i');
      dot.className = 'mini-dot ' + (castle.classList.contains('mine')?'mine':castle.classList.contains('ally')?'ally':'enemy');
      dot.style.left = castle.style.left; dot.style.top = castle.style.top;
      mini.appendChild(dot);
    });
  };
  syncMiniMap(); setInterval(syncMiniMap, 15000);

  const legend = document.createElement('div');
  legend.className = 'map-legend';
  legend.innerHTML = '<span class="mine-key"><b>●</b> Teu castelo</span><span class="ally-key"><b>●</b> Aliado</span><span class="enemy-key"><b>●</b> Inimigo</span>';
  map.appendChild(legend);
  const panel = document.createElement('div');
  panel.className = 'march-panel idle'; panel.textContent = 'Nenhuma marcha ativa'; map.appendChild(panel);
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','march-layer'); svg.setAttribute('viewBox','0 0 100 100'); svg.setAttribute('preserveAspectRatio','none'); world.appendChild(svg);

  const distanceBetween = (a,b) => Math.round(Math.hypot(b.x-a.x,b.y-a.y)*7.2);
  function startMarch(detail) {
    const source = detail.source || {x:48,y:48};
    const target = detail.target;
    if (!target) return;
    const distance = distanceBetween(source,target);
    const seconds = Math.max(4,Math.min(12,Math.round(distance/22)));
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',source.x); line.setAttribute('y1',source.y); line.setAttribute('x2',target.x); line.setAttribute('y2',target.y); line.setAttribute('class','march-line'); svg.appendChild(line);
    const token = document.createElement('div'); token.className='march-token'; token.textContent=detail.action==='Reforçar'?'🛡️':'⚔️'; token.style.left=source.x+'%'; token.style.top=source.y+'%'; token.style.transitionDuration=seconds+'s'; world.appendChild(token);
    const label = document.createElement('div'); label.className='march-label'; label.textContent=detail.action+' · '+distance+' km'; label.style.left=source.x+'%'; label.style.top=source.y+'%'; label.style.transitionDuration=seconds+'s'; world.appendChild(label);
    panel.classList.remove('idle'); panel.textContent=detail.action+' em marcha · '+distance+' km · '+seconds+' s';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{token.style.left=target.x+'%';token.style.top=target.y+'%';label.style.left=target.x+'%';label.style.top=target.y+'%'}));
    let remaining=seconds;
    const countdown=setInterval(()=>{remaining--;if(remaining>0)panel.textContent=detail.action+' em marcha · '+distance+' km · '+remaining+' s'},1000);
    setTimeout(()=>{clearInterval(countdown);line.remove();token.remove();label.remove();panel.classList.add('idle');panel.textContent='Marcha chegou a '+target.name;window.imperioToast(detail.action+' chegou a '+target.name+' após percorrer '+distance+' km')},seconds*1000);
  }
  window.addEventListener('imperio:march', event => startMarch(event.detail));
})();
