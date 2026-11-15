'use strict';
const canvas=document.getElementById('preview');
const ctx=canvas.getContext('2d');
const play=document.getElementById('play');
const timeline=document.getElementById('timeline');
const elapsed=document.getElementById('elapsed');
const loop=document.getElementById('loop');
const status=document.getElementById('status');
const bg=new Image();
const ring=new Image();
let running=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=!document.getElementById('screen-detail').hidden;
let time=0,rotationTime=0,previous=null,ready=false;
function loadImage(im,url){return new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=url;});}
function draw(){
  if(!ready)return;
  ctx.drawImage(bg,0,0);
  ctx.save();ctx.translate(294,263);ctx.rotate(rotationTime*Math.PI);
  ctx.drawImage(ring,-74,-74,148,148);ctx.restore();
  elapsed.textContent='00:'+Math.floor(Math.min(time,15)).toString().padStart(2,'0');
  timeline.value=time;timeline.style.setProperty('--progress',`${time/15*100}%`);
}
function updatePlay(){play.classList.toggle('paused',!running);play.setAttribute('aria-label',running?'暫停動畫':'播放動畫');}
function tick(now){
  if(previous!==null&&active&&running&&ready&&!document.hidden){
    const delta=Math.max(0,(now-previous)/1000);time+=delta;rotationTime+=delta;
    if(time>=15){if(loop.checked){time%=15;}else{rotationTime-=time-15;time=15;running=false;updatePlay();}}
  }
  previous=now;if(active)draw();requestAnimationFrame(tick);
}
play.addEventListener('click',()=>{if(!ready)return;if(time>=15){time=0;rotationTime=0;}running=!running;previous=null;updatePlay();draw();});
document.getElementById('replay').addEventListener('click',()=>{time=0;rotationTime=0;running=true;previous=null;updatePlay();draw();});
timeline.addEventListener('input',()=>{time=Number(timeline.value);rotationTime=time;previous=null;draw();});
document.addEventListener('visibilitychange',()=>{previous=null;});
document.addEventListener('preview:enter',()=>{active=true;time=0;rotationTime=0;running=!matchMedia('(prefers-reduced-motion: reduce)').matches;previous=null;updatePlay();draw();});
document.addEventListener('preview:leave',()=>{active=false;previous=null;});
updatePlay();
Promise.all([window.MonthPassAssets.get('background.png'),window.MonthPassAssets.get('ring.png')]).then(([backgroundUrl,ringUrl])=>Promise.all([loadImage(bg,backgroundUrl),loadImage(ring,ringUrl)])).then(()=>{ready=true;document.getElementById('loading').remove();draw();requestAnimationFrame(tick);}).catch(()=>{document.getElementById('loading').textContent='圖片未能載入，請重新整理頁面。';});

document.getElementById('share').addEventListener('click',async()=>{
  const button=document.getElementById('share');button.disabled=true;status.textContent='正在準備影片…';
  try{
    const file=new File([await window.MonthPassAssets.getBlob('pool-motion-15s.mp4')],'月票動畫示範-15秒.mp4',{type:'video/mp4'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      status.textContent='請喺分享選單選擇 WhatsApp。';
      await navigator.share({files:[file]});status.textContent='已開啟手機分享功能。';
    }else{
      const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      status.textContent='影片已開始下載。儲存後，喺 WhatsApp 選擇影片即可傳送。';
    }
  }catch(error){status.textContent=error.name==='AbortError'?'已取消分享。':'請按「下載 15 秒影片」，儲存後再喺 WhatsApp 傳送。';}
  finally{button.disabled=false;}
});
