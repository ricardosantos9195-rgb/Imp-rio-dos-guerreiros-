(()=>{
 const cards=[...document.querySelectorAll('#colossi .colossus-card')];
 if(!cards.length||!window.imperioState)return;
 const css=document.createElement('style');css.textContent=`#colossi .colossus-card .beast{background-image:url('colossos-bebes-v30.png')!important;transform-origin:center bottom;transition:transform .7s ease,filter .4s}.growth-stage{display:block;color:#ffe8a6;font-size:11px;font-weight:800;margin-top:3px}.growth-stage.max{color:#9dffb4}`;document.head.appendChild(css);
 const stage=level=>level<20?'Bebé':level<40?'Jovem':level<60?'Adolescente':level<80?'Adulto':'Adulto máximo';
 const sync=()=>{const list=window.imperioState.colossi||[];cards.forEach((card,i)=>{const c=list[i];if(!c)return;const beast=card.querySelector('.beast');if(beast){const scale=.72+Math.min(80,Math.max(1,+c.level||1))/80*.28;beast.style.transform='scale('+scale.toFixed(3)+')'}let label=card.querySelector('.growth-stage');if(!label){label=document.createElement('span');label.className='growth-stage';card.appendChild(label)}label.textContent='🌱 '+stage(+c.level||1);label.classList.toggle('max',+c.level>=80)})};
 sync();setInterval(sync,1500);
})();
