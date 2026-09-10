(()=>{
 const heroes=document.querySelector('#heroes');if(!heroes||heroes.querySelector('.hero-visual'))return;
 const art=document.createElement('div');art.className='hero-visual';art.innerHTML='<div><b>OS CAMPEÕES DE AURION</b><small>Infantaria · Arqueiros · Cavalaria · Cerco</small></div>';
 const css=document.createElement('style');css.textContent='.hero-visual{min-height:190px;margin:8px;padding:14px;display:flex;align-items:flex-end;color:#ffe8af;border:3px solid #bd8b3d;border-radius:9px;background:linear-gradient(0deg,#120a08e8 0%,#120a0833 70%),url(\'herois-corpo-v28.png\') center 30%/cover no-repeat;box-shadow:inset 0 0 35px #0008}.hero-visual b{display:block;font:900 19px Georgia;text-shadow:0 2px 4px #000}.hero-visual small{display:block;margin-top:3px;font-weight:800}';document.head.appendChild(css);heroes.querySelector('.hero-list').before(art);
})();
