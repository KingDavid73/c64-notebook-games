"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const modernCanvas=document.querySelector("#modern-text"),modernCtx=modernCanvas.getContext("2d");
modernCtx.imageSmoothingEnabled=true;modernCtx.setTransform(4,0,0,4,0,0);

const C = { bg:"#3e31a2", sky:"#6c5eb5", white:"#fff", black:"#000", cyan:"#70a4b2", green:"#5cab5e", lime:"#9ad284", yellow:"#d0dc71", orange:"#a8734a", red:"#b04444", brown:"#6d5412", gray:"#6c6c6c", pink:"#a057a3" };
const SPRAY_CAPACITY=2.2, SPRAY_RECHARGE=.62;
const keys = new Set();
let state = "title", level = 1, score = 0, waveScore = 0, waveTarget = 0, high = +(localStorage.insectAttackHigh || 0), lives = 3, modernText=false;
let heli, bugs, farms, particles, spawnClock, scroll, waveNotice = 0, paused = false, muted = false, elapsed = 0;
let audio = null, spraySoundClock = 0, musicClock = 0, musicStep = 0;
const textModeButton=document.querySelector("#text-mode");
addEventListener("message",event=>{if(event.data?.type==="c64-toggle"&&event.data.mode==="text")toggleTextMode()});
function updateTextModeButton(){textModeButton.textContent=modernText?"MODERN TEXT · T":"C64 TEXT · T";textModeButton.setAttribute("aria-pressed",String(modernText));document.body.classList.toggle("modern-text",modernText)}
function toggleTextMode(){modernText=!modernText;updateTextModeButton()}
textModeButton.addEventListener("click",toggleTextMode);updateTextModeButton();
const touchMain=document.querySelector("#touch-main"),touchMute=document.querySelector("#touch-mute"),touchPause=document.querySelector("#touch-pause");
document.querySelectorAll("[data-hold-key]").forEach(button=>{const key=button.dataset.holdKey,release=()=>{keys.delete(key);button.classList.remove("is-pressed")};button.addEventListener("pointerdown",e=>{e.preventDefault();wakeAudio();keys.add(key);button.classList.add("is-pressed");button.setPointerCapture(e.pointerId)});["pointerup","pointercancel","lostpointercapture"].forEach(name=>button.addEventListener(name,release))});
touchMain.addEventListener("click",()=>{wakeAudio();if(state==="play")paused=!paused;else if(state==="instructions")state="title";else start(1)});
document.querySelector("#touch-instructions").addEventListener("click",()=>{wakeAudio();if(state==="title")state="instructions"});
touchPause.addEventListener("click",()=>{if(state==="play")paused=!paused});
function toggleMute(){muted=!muted;touchMute.textContent=`SOUND ${muted?"OFF":"ON"}`}
touchMute.addEventListener("click",toggleMute);

// SID-inspired placeholders: simple pulse/saw/triangle/noise voices with short
// envelopes. They are synthesized live, so the game needs no sampled assets.
function wakeAudio(){
  if(!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if(audio.state === "suspended") audio.resume();
}
function tone(freq, duration=.1, wave="square", volume=.035, endFreq=freq, delay=0){
  if(muted || !audio) return;
  const t=audio.currentTime+delay, o=audio.createOscillator(), g=audio.createGain();
  o.type=wave;o.frequency.setValueAtTime(Math.max(30,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.01);
}
function noise(duration=.12, volume=.03){
  if(muted || !audio) return;
  const count=Math.ceil(audio.sampleRate*duration), buffer=audio.createBuffer(1,count,audio.sampleRate), data=buffer.getChannelData(0);
  for(let i=0;i<count;i++) data[i]=(Math.random()*2-1)*(1-i/count);
  const src=audio.createBufferSource(), g=audio.createGain();src.buffer=buffer;g.gain.value=volume;src.connect(g).connect(audio.destination);src.start();
}
const sfx={
  start(){tone(131,.09,"square",.035,196);tone(196,.09,"square",.035,262,.1);tone(262,.16,"square",.04,392,.2);},
  spray(){noise(.045,.012);tone(90,.045,"sawtooth",.012,60);},
  hit(){tone(520,.045,"square",.025,310);},
  kill(){tone(330,.06,"square",.03,660);tone(660,.08,"triangle",.025,880,.055);},
  rescue(){tone(392,.07,"square",.035,523);tone(523,.1,"square",.035,784,.075);},
  lost(){tone(180,.18,"sawtooth",.04,55);},
  crash(){noise(.32,.055);tone(150,.35,"sawtooth",.05,35);},
  level(){[262,330,392,523].forEach((f,i)=>tone(f,.11,"square",.035,f,i*.08));},
  over(){[220,175,131,82].forEach((f,i)=>tone(f,.18,"triangle",.04,f*.8,i*.12));}
};

const species = [
  {name:"DRAGONFLY", points:50,  speed:18, hp:1, color:C.cyan,   move:"wander"},
  {name:"BEE",       points:100, speed:27, hp:2, color:C.yellow, move:"wave"},
  {name:"WASP",      points:150, speed:23, hp:2, color:C.orange, move:"circle"},
  {name:"HORNET",    points:200, speed:42, hp:3, color:C.red,    move:"line"},
  {name:"FLY",       points:250, speed:31, hp:2, color:C.gray,   move:"climb"}
];

addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  wakeAudio();
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === "p" && state === "play") paused = !paused;
  if (k === "m") toggleMute();
  if (k === "t") { toggleTextMode(); return; }
  if (state === "title") { if (k === "i") state = "instructions"; else if (/^[1-9]$/.test(k)) start(+k); else if (k === "enter" || k === " ") start(1); }
  else if (state === "instructions" && (k === "enter" || k === " " || k === "escape")) state = "title";
  else if (state === "gameover" && (k === "enter" || k === " ")) state = "title";
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

function start(n) {
  level = Math.max(1, n); score = 0; waveScore = 0; waveTarget = 800 + level * 300; lives = 3; scroll = 0; elapsed = 0; waveNotice = 1.4;
  heli = {x:65,y:84,w:30,h:13,inv:0,spray:0,sprayFuel:SPRAY_CAPACITY}; bugs=[]; particles=[]; spawnClock=0;
  farms = Array.from({length:5}, (_,i)=>({x:42+i*66,y:166,alive:true,phase:i})); state="play";
  sfx.start();
}

function spawnBug() {
  const maxType = Math.min(4, Math.floor((level-1)/5)+1);
  const type = Math.floor(Math.random()*(maxType+1)), s=species[type];
  const roll=Math.random(), raidChance=Math.min(.82,.56+level*.009);
  const mode=roll<raidChance?"raid":roll<raidChance+.26?"attack":"roam";
  const available=farms.filter(f=>f.alive&&!f.carried);
  const target=available.length?available[Math.floor(Math.random()*available.length)]:null;
  bugs.push({x:330+Math.random()*60,y:30+Math.random()*100,w:12,h:8,type,hp:s.hp,t:Math.random()*6,carry:null,hit:0,mode,target,diveReady:mode==="attack",diving:false,diveTargetY:0,dodge:Math.random()<.45?-1:1});
}

function update(dt) {
  if (state !== "play" || paused) return;
  elapsed += dt; scroll += dt*(12+level*.45); heli.inv=Math.max(0,heli.inv-dt); heli.spray=Math.max(0,heli.spray-dt);
  waveNotice=Math.max(0,waveNotice-dt);
  musicClock-=dt;
  if(musicClock<=0){
    const lead=[110,131,117,156,139,104,123,92,110,165,117,185,104,147,98,139], bass=[46,46,55,49,46,41,49,43];
    const f=lead[musicStep%lead.length];
    tone(f,.13,musicStep%3?"sawtooth":"square",.009,f*(musicStep%4===3?1.059:1));
    if(musicStep%2===0)tone(bass[Math.floor(musicStep/2)%bass.length],.3,"triangle",.013);
    if(musicStep%4===2)noise(.045,.006);
    musicStep++;musicClock=.145;
  }
  spraySoundClock=Math.max(0,spraySoundClock-dt);
  const vy=(keys.has("arrowdown")||keys.has("s")?1:0)-(keys.has("arrowup")||keys.has("w")?1:0);
  const vx=(keys.has("arrowright")||keys.has("d")?1:0)-(keys.has("arrowleft")||keys.has("a")?1:0);
  heli.y=Math.max(23,Math.min(147,heli.y+vy*75*dt)); heli.x=Math.max(18,Math.min(145,heli.x+vx*55*dt));
  const spraying=keys.has(" ")||keys.has("z");
  if(spraying&&heli.sprayFuel>0){
    heli.spray=.09;heli.sprayFuel=Math.max(0,heli.sprayFuel-dt);
    if(spraySoundClock<=0){sfx.spray();spraySoundClock=.11;}
  }else if(!spraying){
    heli.sprayFuel=Math.min(SPRAY_CAPACITY,heli.sprayFuel+SPRAY_RECHARGE*dt);
  }
  spawnClock-=dt; if(spawnClock<=0){spawnBug(); spawnClock=Math.max(.32,1.25-level*.022)*(0.65+Math.random()*.7);}

  for(const b of bugs){
    const s=species[b.type]; b.t+=dt; b.x-=s.speed*(1+Math.min(.9,(level-1)*.015))*dt;
    const wobble=s.move==="wander"?Math.sin(b.t*5)*22:s.move==="wave"?Math.sin(b.t*8)*38:s.move==="circle"?Math.sin(b.t*4)*55:s.move==="climb"?Math.sin(b.t*11)*25:Math.sin(b.t*3)*8;
    b.y+=wobble*dt;
    // Raiders deliberately descend on a farm as they approach its column.
    // Attackers home in on the copter, then commit to one marked dive.
    if(b.mode==="raid"&&!b.carry){
      if(!b.target||!b.target.alive||b.target.carried){const choices=farms.filter(f=>f.alive&&!f.carried);b.target=choices[Math.floor(Math.random()*choices.length)];}
      if(b.target&&b.x<b.target.x+125){const desired=b.target.y-3;b.y+=Math.sign(desired-b.y)*Math.min(Math.abs(desired-b.y),34*dt+level*.18*dt);}
    } else if(b.mode==="attack"&&!b.carry){
      if(b.diveReady&&b.x<heli.x+100&&b.x>heli.x-24){b.diving=true;b.diveReady=false;b.diveTargetY=heli.y+7;}
      if(b.diving){
        b.y+=Math.sign(b.diveTargetY-b.y)*Math.min(Math.abs(b.diveTargetY-b.y),(100+level)*dt);
        b.x-=(24+level*.35)*dt;
      }else{
        const desired=heli.y+Math.sin(b.t*7+b.type)*12;b.y+=Math.sign(desired-b.y)*Math.min(Math.abs(desired-b.y),(24+level*.45)*dt);
        if(b.x<heli.x+115&&b.x>heli.x) b.x-=(10+level*.35)*dt;
      }
    }
    b.y=Math.max(22,Math.min(158,b.y));
    if(b.carry){ b.y-=12*dt; b.carry.x=b.x; b.carry.y=b.y+9; if(b.y<18){b.carry.alive=false;b.dead=true;sfx.lost();} }
    else if(b.y>137){ const f=farms.find(f=>f.alive&&!f.carried&&Math.abs(f.x-b.x)<23); if(f){b.carry=f;f.carried=true;b.mode="escape";b.diving=false;sfx.lost();} }
    if(heli.spray>0 && b.x>heli.x+18 && b.x<heli.x+88 && Math.abs(b.y-heli.y)<15){
      b.hit-=dt; if(b.hit<=0){b.hp--;b.hit=.16;particles.push({x:b.x,y:b.y,t:.3});sfx.hit();}
      if(b.hp<=0){b.dead=true;score+=s.points;waveScore+=s.points;sfx.kill();if(b.carry){b.carry.carried=false;b.carry.y=166;score+=100;waveScore+=100;sfx.rescue();}}
    }
    if(heli.inv<=0 && Math.abs((heli.x+15)-b.x)<14 && Math.abs((heli.y+7)-b.y)<9){ b.dead=true; crash(); }
    if(b.x<-20){if(b.carry){b.carry.alive=false;sfx.lost();}b.dead=true;}
  }
  bugs=bugs.filter(b=>!b.dead); particles.forEach(p=>p.t-=dt); particles=particles.filter(p=>p.t>0);
  if(waveScore>=waveTarget){
    level++; score+=500; waveScore=0; waveTarget=800+level*300; bugs=[]; particles=[]; spawnClock=1; waveNotice=1.65;
    heli.sprayFuel=SPRAY_CAPACITY;sfx.level();farms.filter(f=>f.alive).forEach(f=>{f.y=166;f.carried=false;});
  }
  if(farms.every(f=>!f.alive)) crash(true);
  if(score>high){high=score;localStorage.insectAttackHigh=high;}
}

function crash(force=false){
  if(heli.inv>0&&!force)return; lives--; heli.inv=2; heli.x=65;heli.y=84;
  sfx.crash();if(lives<=0){state="gameover";sfx.over();if(score>high){high=score;localStorage.insectAttackHigh=high;}}
}

function text(t,x,y,color=C.white,align="left",size=8){const target=modernText?modernCtx:ctx;target.fillStyle=color;target.font=modernText?`${size}px "Segoe UI", Arial, sans-serif`:`${size}px monospace`;target.textAlign=align;target.fillText(t,x,y);}
function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function helicopter(x,y){
  // The notebook sprite faces right, toward the incoming insects and spray.
  ctx.save();ctx.translate(2*x+24,0);ctx.scale(-1,1);
  px(x,y+5,20,7,C.yellow);px(x+4,y+2,12,4,C.yellow);px(x+7,y,8,2,C.white);px(x+19,y+7,9,3,C.orange);px(x+27,y+3,2,8,C.orange);
  px(x+2,y+12,20,2,C.black);px(x+8,y-2,2,3,C.gray);px(x-5,y-3,28,1,C.white);px(x-2,y+7,4,2,C.black);px(x+4,y+5,6,5,C.cyan);
  ctx.restore();
}
const insectSprites=[
  { // Dragonfly: long, slim body and four narrow blue wings.
    rows:["...WW...WW....","....WW.WW.....","K.CCCCGGGGGG.K","...WW...WW...."],
    colors:{K:C.black,W:C.white,C:C.cyan,G:C.green}
  },
  { // Bee: round yellow abdomen with two unmistakable dark bands.
    rows:["....WWWW......","...WWWWWW.....","KYYYKKYYYK....",".KYYYYYYYYK...","..KKKKKKKK...."],
    colors:{K:C.black,W:C.white,Y:C.yellow}
  },
  { // Wasp: narrow orange body, yellow bands and a pointed sting.
    rows:[".....WWW......","....WWWWW.....","KOOOKKYYOK....",".KOOOKKYYOK>..","....KKKK......"],
    colors:{K:C.black,W:C.white,O:C.orange,Y:C.yellow}
  },
  { // Hornet: broad dark body with red armor and a bright warning band.
    rows:["...WWWWWW.....","..WWWWWWWW....","KRRKKRRRKKK...",".KRRKKRRRKKK..","..KKKKKKKK...."],
    colors:{K:C.black,W:C.white,R:C.red}
  },
  { // Fly: compact gray body with a single red eye and short wings.
    rows:["...WW...WW....","..WWWW.WWWW...","KRHHHHHHHHK...",".KHHHHHHHHK...","..KKKKKKKK...."],
    colors:{K:C.black,W:C.white,R:C.red,H:C.gray}
  }
];
function insect(b){
  const x=Math.round(b.x), y=Math.round(b.y);
  // Small, fixed pixel silhouettes: wings sit behind the body, and each bug
  // uses one simple outline plus a species-specific color pattern. All face left.
  const sprite=insectSprites[b.type]||insectSprites[4];
  for(let row=0;row<sprite.rows.length;row++){
    for(let col=0;col<sprite.rows[row].length;col++){
      const color=sprite.colors[sprite.rows[row][col]];
      if(color) px(x+col,y-2+row,1,1,color);
    }
  }
  if(sprite.rows[3]&&sprite.rows[3].includes(">")) px(x+sprite.rows[3].indexOf(">"),y+1,1,1,C.black);
}
function farm(f){
  const x=f.x,y=f.y;px(x-7,y,15,7,C.red);px(x-5,y-5,11,5,C.white);px(x-2,y-8,5,3,C.red);px(x+2,y+2,3,5,C.black);px(x-11,y+7,22,2,C.green);
}
function field(){
  px(0,174,320,26,C.brown);px(0,171,320,4,C.green);
  for(let x=-(scroll%16);x<320;x+=16){px(x,180,9,2,C.yellow);px(x+4,185,7,2,C.orange);px(x,191,10,2,C.yellow);}
}

function drawPlay(){
  ctx.fillStyle=C.sky;ctx.fillRect(0,0,320,200);px(0,0,320,18,C.bg);text(`SCORE ${String(score).padStart(6,"0")}`,5,12);text(`LEVEL ${String(level).padStart(2,"0")}`,132,12);text(`HIGH ${String(high).padStart(6,"0")}`,315,12,C.white,"right");
  px(4,19,76,12,C.black);px(5,20,74,10,C.bg);text(heli.sprayFuel>.03?"SPRAY":"EMPTY",7,27,heli.sprayFuel>.03?C.white:C.red,"left",6);
  px(33,21,44,8,C.black);px(34,22,42,6,C.gray);if(heli.sprayFuel>0)px(34,22,Math.max(1,Math.ceil(42*heli.sprayFuel/SPRAY_CAPACITY)),6,C.yellow);
  text(`COPTERS ${lives}`,5,197,C.white);text(`FARMS ${farms.filter(f=>f.alive).length}`,315,197,C.white,"right");
  for(let x=0;x<384;x+=48){const cloudX=((x-scroll*.18)%384+384)%384;px(cloudX,34,24,3,C.white);px(cloudX+7,31,10,3,C.white);}
  field();farms.filter(f=>f.alive).forEach(farm);bugs.forEach(b=>{if(b.diving)px(b.x+6,b.y-6,2,1,C.red);insect(b);});
  if(heli.inv<=0||Math.floor(heli.inv*8)%2===0)helicopter(heli.x,heli.y);
  if(heli.spray>0){for(let i=0;i<16;i++){const sx=heli.x+29+i*4,sy=heli.y+5+Math.sin(i*7+elapsed*30)*8;px(sx,sy,1,1,i%3?C.white:C.cyan);}}
  particles.forEach(p=>{px(p.x-3,p.y-3,7,1,C.white);px(p.x,p.y-6,1,12,C.white);});
  text(`NEXT ${Math.max(0,waveTarget-waveScore)}`,160,197,C.lime,"center");
  if(waveNotice>0){px(76,76,168,42,C.black);px(78,78,164,38,C.bg);text(`WAVE ${String(level).padStart(2,"0")}`,160,94,C.yellow,"center",13);text("THREAT INCREASING",160,108,C.white,"center",7);}
  if(paused){px(92,78,136,36,C.bg);text("PAUSED",160,94,C.white,"center",14);text("PRESS P",160,107,C.yellow,"center");}
}
function title(){
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,320,200);
  text("INSECT",160,51,C.yellow,"center",28);text("ATTACK",160,78,C.yellow,"center",28);
  helicopter(48,101);for(let i=0;i<5;i++)insect({x:178+i*20,y:101+(i%2)*10,type:i,t:elapsed});
  text("PRESS ENTER TO FLY",160,139,C.white,"center");text("I  INSTRUCTIONS",160,156,C.cyan,"center");text("1-9  STARTING WAVE",160,169,C.lime,"center");text("A NOTEBOOK GAME BY MICHAEL KING",160,190,C.gray,"center",7);
}
function instructions(){
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,320,200);text("PILOT BRIEFING",160,18,C.yellow,"center",14);
  const lines=["A CHEMICAL ACCIDENT HAS CREATED", "GIANT INSECTS OVER KANSAS.", "DEFEND THE FARMS WITH BUG SPRAY.", "", "MOVE THE CROP-SPRAYING COPTER", "WITH ARROWS OR WASD.", "HOLD SPACE OR Z TO SPRAY.", "SHORT RANGE: LET BUGS COME CLOSE.", "RELEASE TO REFILL THE SPRAY TANK.", "ATTACK BUGS DIVE AT YOUR COPTER.", "EACH WAVE RESTOCKS YOUR TANK.", "YOU HAVE THREE COPTERS."];
  lines.forEach((l,i)=>text(l,160,40+i*11,i===8?C.lime:C.white,"center"));text("ENTER / SPACE TO RETURN",160,190,C.cyan,"center");
}
function endScreen(){ctx.fillStyle=C.bg;ctx.fillRect(0,0,320,200);text("YOUR COPTERS ARE GONE",160,61,C.red,"center",14);text(`WAVE ${String(level).padStart(2,"0")} REACHED`,160,87,C.yellow,"center",10);text(`SCORE ${String(score).padStart(6,"0")}`,160,111,C.white,"center",12);text("PRESS ENTER",160,145,C.lime,"center");}

let last=performance.now();function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;elapsed+=state==="play"?0:dt;update(dt);document.body.dataset.gameState=state;touchMain.textContent=state==="title"?"START WAVE":state==="instructions"?"BACK TO TITLE":"PLAY AGAIN";touchMain.hidden=state==="play";touchPause.textContent=paused?"RESUME":"PAUSE";touchPause.hidden=state!=="play";touchPause.disabled=state!=="play";document.querySelector("#touch-instructions").hidden=state!=="title";if(modernText)modernCtx.clearRect(0,0,320,200);if(state==="title")title();else if(state==="instructions")instructions();else if(state==="play")drawPlay();else endScreen();requestAnimationFrame(frame);}requestAnimationFrame(frame);
