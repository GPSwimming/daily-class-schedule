'use strict';
(() => {
  const facilities=document.getElementById('screen-facilities');
  const passes=document.getElementById('screen-passes');
  const detail=document.getElementById('screen-detail');
  const overlay=document.getElementById('type-overlay');
  const openTypes=document.getElementById('open-types');
  const pool=document.getElementById('choose-pool');
  const cancel=document.getElementById('cancel-types');
  const routes=new Set(['facilities','choose-type','passes','detail']);
  let current=null;

  // Coordinates are taken directly from the 589 × 1280 reference images.
  document.querySelectorAll('[data-box]').forEach(button=>{
    const [x,y,w,h]=button.dataset.box.split(',').map(Number);
    const [cw,ch]=(button.dataset.coordinateSize||'589,1280').split(',').map(Number);
    Object.assign(button.style,{left:`${x/cw*100}%`,top:`${y/ch*100}%`,width:`${w/cw*100}%`,height:`${h/ch*100}%`});
  });

  function render(){
    const route=location.hash.slice(1);
    const next=routes.has(route)?route:'facilities';
    const modal=next==='choose-type';
    if(current==='detail'&&next!=='detail')document.dispatchEvent(new Event('preview:leave'));
    facilities.hidden=next!=='facilities'&&!modal;
    passes.hidden=next!=='passes';detail.hidden=next!=='detail';overlay.hidden=!modal;
    openTypes.inert=modal;openTypes.setAttribute('aria-expanded',String(modal));
    if(next==='detail'&&current!=='detail')document.dispatchEvent(new Event('preview:enter'));
    document.title=next==='detail'?'月票詳情 · 動畫示範':next==='passes'?'公眾游泳池月票':modal?'選擇類型':'設施';
    window.scrollTo(0,0);
    const focusTarget=modal?pool:next==='passes'?document.getElementById('passes-title'):next==='detail'?document.getElementById('detail-title'):current==='choose-type'?openTypes:null;
    if(focusTarget)focusTarget.focus({preventScroll:true});
    current=next;
  }
  function go(route){if(location.hash==='#'+route)render();else location.hash=route;}
  openTypes.addEventListener('click',()=>go('choose-type'));
  pool.addEventListener('click',()=>go('passes'));
  cancel.addEventListener('click',()=>go('facilities'));
  document.getElementById('modal-backdrop').addEventListener('click',()=>go('facilities'));
  document.getElementById('passes-back').addEventListener('click',()=>go('facilities'));
  document.getElementById('passes-close').addEventListener('click',()=>go('facilities'));
  document.getElementById('view-pass').addEventListener('click',()=>go('detail'));
  document.getElementById('detail-back').addEventListener('click',()=>go('passes'));
  document.addEventListener('keydown',event=>{
    if(overlay.hidden)return;
    if(event.key==='Escape'){event.preventDefault();go('facilities');}
    if(event.key==='Tab'){
      if(event.shiftKey&&document.activeElement===pool){event.preventDefault();cancel.focus();}
      else if(!event.shiftKey&&document.activeElement===cancel){event.preventDefault();pool.focus();}
    }
  });
  window.addEventListener('hashchange',render);
  if(window.parent!==window){
    const reportHeight=()=>window.parent.postMessage({type:'month-pass:height',height:document.querySelector('.mobile-app').getBoundingClientRect().height},location.origin);
    new ResizeObserver(reportHeight).observe(document.querySelector('.mobile-app'));
    window.addEventListener('load',reportHeight);
  }
  render();
})();
