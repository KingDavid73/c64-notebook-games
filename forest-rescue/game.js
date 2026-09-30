const c=document.querySelector('#game'),g=c.getContext('2d'),modernCanvas=document.querySelector('#modern-text'),tg=modernCanvas.getContext('2d');g.imageSmoothingEnabled=false;tg.imageSmoothingEnabled=true;tg.setTransform(4,0,0,4,0,0);const textModeButton=document.querySelector('#text-mode'),keys=new Set(),touchMain=document.querySelector('#touch-main'),touchMute=document.querySelector('#touch-mute');let state='title',p,bear,rocks,logs,trees,gems,score,time,last=0,audio=null,musicStep=0,musicClock=0,muted=false,modernText=false;
function updateTextModeButton(){textModeButton.textContent=modernText?'MODERN TEXT · T':'C64 TEXT · T';textModeButton.setAttribute('aria-pressed',String(modernText));document.body.classList.toggle('modern-text',modernText)}function toggleTextMode(){modernText=!modernText;updateTextModeButton()}textModeButton.addEventListener('click',toggleTextMode);updateTextModeButton();
const graphicsModeButton=document.querySelector('#graphics-mode'),remasterSprites=new RemasterSprites('assets/remaster-sprites-v2.png'),remasterBackgrounds=new RemasterBackgrounds('assets/remaster-backgrounds.png');let remasterGraphics=false;function toggleGraphicsMode(){remasterGraphics=!remasterGraphics;graphicsModeButton.textContent=remasterGraphics?'UPDATED GRAPHICS · G':'C64 GRAPHICS · G';graphicsModeButton.setAttribute('aria-pressed',String(remasterGraphics))}graphicsModeButton.addEventListener('click',toggleGraphicsMode);
addEventListener('message',event=>{if(event.data?.type!=='c64-toggle')return;if(event.data.mode==='text')toggleTextMode();if(event.data.mode==='graphics')toggleGraphicsMode()});
function wake(){if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}
document.querySelectorAll('[data-hold-key]').forEach(button=>{const key=button.dataset.holdKey,release=()=>{keys.delete(key);button.classList.remove('is-pressed')};button.addEventListener('pointerdown',e=>{e.preventDefault();wake();keys.add(key);button.classList.add('is-pressed');button.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(name=>button.addEventListener(name,release))});
touchMain.addEventListener('click',()=>{wake();if(state!=='play')start()});
function toggleMute(){muted=!muted;touchMute.textContent=`SOUND ${muted?'OFF':'ON'}`}
touchMute.addEventListener('click',toggleMute);
function tone(f,d=.09,type='square',v=.025,end=f){if(!audio||muted)return;let o=audio.createOscillator(),q=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+d);q.gain.setValueAtTime(.0001,t);q.gain.exponentialRampToValueAtTime(v,t+.008);q.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(q).connect(audio.destination);o.start(t);o.stop(t+d+.02)}
function sfx(n){if(n==='gem'){tone(660,.07);setTimeout(()=>tone(880,.1),55)}if(n==='hurt'){tone(150,.25,'sawtooth',.04,45)}if(n==='win')[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.13),i*90))}
addEventListener('keydown',e=>{let k=e.key.toLowerCase();wake();if(k==='m'){toggleMute();return}if(k==='t'){toggleTextMode();return}if(k==='g'){toggleGraphicsMode();return}keys.add(k);if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state!=='play'&&(k==='enter'||k===' '))start()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function start(){wake();state='play';p={x:28,y:98,hp:3,inv:0};bear={x:275,y:100,vx:-18,vy:14,t:0};score=0;time=0;musicStep=0;musicClock=0;rocks=make(9);logs=make(7);trees=make(18);gems=make(8)}function make(n){return Array.from({length:n},()=>({x:40+Math.random()*260,y:26+Math.random()*145,got:false}))}
function near(a,b,r=10){return Math.hypot(a.x-b.x,a.y-b.y)<r}function update(dt){if(state!=='play')return;time+=dt;p.inv=Math.max(0,p.inv-dt);musicClock-=dt;if(musicClock<=0){const mel=[262,330,392,330,294,349,440,349],bass=[131,131,147,147,117,117,131,131];tone(mel[musicStep%8],.16,'square',.012);tone(bass[musicStep%8],.25,'triangle',.012);musicStep++;musicClock=.22}let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),ox=p.x,oy=p.y;p.x=Math.max(8,Math.min(310,p.x+dx*55*dt));p.y=Math.max(22,Math.min(180,p.y+dy*55*dt));if([...rocks,...logs,...trees].some(o=>near(p,o,9))){p.x=ox;p.y=oy}bear.t-=dt;if(bear.t<=0){bear.t=.7+Math.random();let a=Math.atan2(p.y-bear.y,p.x-bear.x)+(Math.random()-.5)*1.8;bear.vx=Math.cos(a)*(25+time*.15);bear.vy=Math.sin(a)*(25+time*.15)}bear.x+=bear.vx*dt;bear.y+=bear.vy*dt;if(bear.x<8||bear.x>312)bear.vx*=-1;if(bear.y<22||bear.y>180)bear.vy*=-1;if(p.inv<=0&&near(p,bear,11)){p.hp--;p.inv=1.5;p.x=20;p.y=100;bear.x=280;sfx('hurt');if(p.hp<=0)state='lost'}gems.forEach(q=>{if(!q.got&&near(p,q,10)){q.got=true;score++;sfx('gem')}});if(score===gems.length){state='won';sfx('win')}}
function tx(s,a,b,col='#fff',z=8,al='left'){const target=modernText?tg:g;target.fillStyle=col;target.font=modernText?`${z}px "Segoe UI", Arial, sans-serif`:`${z}px monospace`;target.textAlign=al;target.fillText(s,a,b)}function px(x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h)}
function tree(o){if(remasterGraphics&&remasterSprites.draw(g,2,o.x-11,o.y-24,23,34))return;px(o.x-2,o.y,5,9,'#6b4325');px(o.x-7,o.y-9,15,8,'#24582b');px(o.x-5,o.y-13,11,6,'#33743b');px(o.x-2,o.y-16,6,5,'#4a8b47')}
function rock(o){if(remasterGraphics&&remasterSprites.draw(g,3,o.x-8,o.y-8,17,13))return;px(o.x-6,o.y-2,12,6,'#565c57');px(o.x-4,o.y-5,8,4,'#858a80');px(o.x-2,o.y-4,3,2,'#b1afa1')}
function log(o){if(remasterGraphics&&remasterSprites.draw(g,4,o.x-11,o.y-9,23,16))return;px(o.x-8,o.y-3,16,7,'#70451f');px(o.x-6,o.y-5,11,2,'#956232');px(o.x+5,o.y-2,3,5,'#bb8649');px(o.x+6,o.y-1,1,3,'#573418')}
function gem(o){if(remasterGraphics&&remasterSprites.draw(g,5,o.x-7,o.y-10,15,17))return;px(o.x-4,o.y-5,9,7,'#e5dc55');px(o.x-2,o.y-7,5,2,'#fff18a');px(o.x-2,o.y-3,5,5,'#c49c31');px(o.x,o.y-4,2,3,'#fff')}
function player(o){if(o.inv>0&&Math.floor(o.inv*10)%2)return;if(remasterGraphics&&remasterSprites.draw(g,0,o.x-10,o.y-14,20,27))return;px(o.x-3,o.y-7,7,6,'#e6c59a');px(o.x-4,o.y-1,9,8,'#d9d5c4');px(o.x-6,o.y,2,6,'#547ea0');px(o.x+5,o.y,2,8,'#7a4b25');px(o.x-3,o.y+7,2,4,'#242034');px(o.x+2,o.y+7,2,4,'#242034')}
function bearSprite(o){if(remasterGraphics&&remasterSprites.draw(g,1,o.x-16,o.y-16,32,30))return;px(o.x-6,o.y-6,4,4,'#6b3f22');px(o.x+3,o.y-6,4,4,'#6b3f22');px(o.x-7,o.y-3,15,10,'#8d572f');px(o.x-4,o.y+7,3,4,'#4e2d18');px(o.x+3,o.y+7,3,4,'#4e2d18');px(o.x-4,o.y-1,2,2,'#111');px(o.x+3,o.y-1,2,2,'#111');px(o.x-1,o.y+2,3,2,'#d0a274')}
function draw(t){
  const dt=Math.min(.03,(t-last)/1000||0);last=t;update(dt);
  touchMain.textContent=state==='title'?'START FOREST RUN':state==='play'?'RUN IN PROGRESS':'PLAY AGAIN';
  touchMain.disabled=state==='play';touchMute.textContent=`SOUND ${muted?'OFF':'ON'}`;
  if(modernText)tg.clearRect(0,0,320,200);
  g.fillStyle='#2c613e';g.fillRect(0,0,320,200);
  if(state==='title'){
    if(remasterGraphics)remasterBackgrounds.draw(g,0,0,0,320,200);
    tx('FOREST RUN',160,65,'#d7e67b',26,'center');tx('ROCKS · LOGS · TREES · BIRDS · BEAR',160,92,'#fff',8,'center');
    tx('PRESS ENTER',160,137,'#fff',9,'center');tx('FROM MICHAEL KING\'S SPRITE NOTES',160,187,'#81a878',7,'center');
  }else if(state==='won'||state==='lost'){
    if(remasterGraphics)remasterBackgrounds.draw(g,state==='won'?0:1,0,0,320,200);
    tx(state==='won'?'TREASURE RECOVERED!':'THE BEAR FOUND YOU',160,82,state==='won'?'#d7e67b':'#e2765b',16,'center');
    tx(`SCORE ${score}/8`,160,108,'#fff',9,'center');tx('PRESS ENTER',160,145,'#fff',8,'center');
  }else{
    if(!remasterGraphics||!remasterBackgrounds.draw(g,Math.min(3,Math.floor(score/2)),0,0,320,200)){
      g.fillStyle='#263b28';for(let y=20;y<190;y+=16)for(let x=0;x<320;x+=16)if((x+y)%3)px(x,y,1,1,'#172d20');
    }
    trees.forEach(tree);rocks.forEach(rock);logs.forEach(log);gems.filter(o=>!o.got).forEach(gem);bearSprite(bear);player(p);
    px(0,0,320,18,'#15251b');tx(`TREASURE ${score}/8`,5,12);tx(`LIVES ${p.hp}`,315,12,'#fff',8,'right');
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
