// ============================================================
// EZKov — 메인 게임
// 탑뷰 미니 익스트랙션 슈터 (덕코프 오마주)
// ============================================================

// ---------------- 캔버스 & 기본 ----------------
const cv = document.getElementById('cv');
let ctx = cv.getContext('2d'); // 렌더 패스에 따라 저해상도 캔버스로 스왑됨
const vis = document.createElement('canvas'); // 시야(어둠) 오버레이
const vctx = vis.getContext('2d');
const low = document.createElement('canvas'); // 도트(픽셀아트) 렌더용 저해상도 캔버스
const lctx = low.getContext('2d');
const ZOOM = 2;    // 카메라 줌 — PIX*ZOOM 이 정수여야 도트가 균일 (깜빡임 방지)
const PIX = 2;     // 1도트 = 월드 2px → 타일(32px)당 16x16 도트
let W = 0, H = 0;
function resize(){
  W = cv.width = vis.width = window.innerWidth;
  H = cv.height = vis.height = window.innerHeight;
  low.width = Math.ceil(W/(ZOOM*PIX))+4;
  low.height = Math.ceil(H/(ZOOM*PIX))+4;
}
window.addEventListener('resize', resize); resize();

const TILE = 32;
const DAY_LEN = 180, DUSK_LEN = 30;

// ---------------- 사운드 (WebAudio 미니 신스) ----------------
let AC = null;
function ac(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
document.addEventListener('mousedown', ()=>{ const a=ac(); if(a && a.state==='suspended') a.resume(); }, {passive:true});

function tone(freq, dur, type='square', vol=0.1, slide=0){
  const a = ac(); if(!a || a.state!=='running') return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), a.currentTime+dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime+dur);
}
function sfx(name){
  try{
    switch(name){
      case 'shoot': tone(rnd(180,220), .09, 'square', .08, -120); break;
      case 'honk': tone(310,.3,'sawtooth',.16,-40); tone(390,.3,'sawtooth',.12,-40); break;
      case 'silenced': tone(120,.05,'triangle',.05,-60); break;
      case 'hit': tone(140,.07,'triangle',.09,-70); break;
      case 'kill': tone(320,.2,'square',.09,-260); break;
      case 'hurt': tone(110,.25,'sawtooth',.14,-60); break;
      case 'pick': tone(620,.06,'square',.06); break;
      case 'drop': tone(420,.06,'square',.06); break;
      case 'coin': tone(880,.07,'square',.07); setTimeout(()=>tone(1318,.1,'square',.07),60); break;
      case 'mount': tone(500,.07,'square',.07,200); break;
      case 'open': tone(300,.08,'triangle',.08,60); break;
      case 'eat': tone(500,.08,'triangle',.09,-200); setTimeout(()=>tone(700,.08,'triangle',.08,-200),90); break;
      case 'reveal': tone(760,.06,'square',.06); setTimeout(()=>tone(1140,.09,'square',.05),70); break;
      case 'reload': tone(240,.05,'square',.06); setTimeout(()=>tone(340,.05,'square',.06),140); break;
      case 'click': tone(200,.04,'square',.05); break;
      case 'extract': [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.18,'square',.08),i*110)); break;
      case 'death': [400,300,200,120].forEach((f,i)=>setTimeout(()=>tone(f,.25,'sawtooth',.1),i*160)); break;
      case 'night': tone(80,.6,'sine',.12,-20); break;
      case 'spit': tone(260,.08,'sawtooth',.06,-100); break;
      case 'boom': tone(60,.5,'sine',.28,-30); tone(190,.22,'square',.16,-140); break;
      case 'break': tone(160,.14,'square',.12,-90); setTimeout(()=>tone(95,.16,'square',.1,-50),60); break;
      case 'boss': tone(85,.7,'sawtooth',.22,-25); tone(128,.55,'square',.13,-35);
        setTimeout(()=>tone(64,.6,'sawtooth',.2,-15),240); break;
    }
  }catch(e){}
}

// ---------------- 입력 ----------------
const keys = {};
const mouse = { x: W/2, y: H/2, down:false, rdown:false };

window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if(k==='tab'){ e.preventDefault(); }
  if(e.repeat) return;
  keys[k] = true;

  if(k==='r'){
    if(Drag.active){ rotateDrag(); return; }
    if(scene==='raid' && !panel) startReload();
    return;
  }
  if(['w','a','s','d'].includes(k)){
    if(panel && !['extract','death'].includes(panel.type)) closePanel();
    return;
  }
  if(k==='escape'){
    if(Drag.active){ cancelDrag(); return; }
    if(panel && !['extract','death'].includes(panel.type)) closePanel();
    return;
  }
  if(k==='e'){ if(!panel) tryInteract(); else if(!['extract','death'].includes(panel.type)) closePanel(); return; }
  if(k==='tab'){
    if(panel){ if(!['extract','death'].includes(panel.type)) closePanel(); }
    else openPanel('bag');
    return;
  }
  if(k==='q'){ if(scene==='raid') quickHeal(); return; }
  if(k==='1'||k==='2'){ switchGun(+k-1); return; }
  if(k==='3'||k==='4'||k==='5'){ eatSlot(+k-3); return; }
  if(k==='h'){ if(!panel) openPanel('help'); return; }
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', ()=>{ for(const k in keys) keys[k]=false; mouse.down=false; mouse.rdown=false; });

cv.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
document.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
cv.addEventListener('contextmenu', e=>e.preventDefault());
cv.addEventListener('mousedown', e=>{
  if(panel) return;
  if(e.button===2){ mouse.rdown = true; return; }
  if(e.button!==0) return;
  if(scene==='cave'){ clickInteract(e.clientX, e.clientY); return; }
  mouse.down = true; // 레이드에선 클릭 = 무조건 사격 (상자는 E로만)
});
document.addEventListener('mouseup', e=>{
  if(e.button===0) mouse.down=false;
  if(e.button===2) mouse.rdown=false;
});

// ---------------- 토스트 ----------------
let toastTimer = null;
function toast(msg, dur=2200){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), dur);
}

// ---------------- 영구 상태 & 세이브 ----------------
const State = {
  coins: 0,
  up: { pack:0, hp:0, shoes:0, store:0 },
  storage: null, backpack: null,
  guns: [ {body:null, atts:[], ammo:0}, {body:null, atts:[], ammo:0} ],
  activeGun: 0,
  gun2: false, // 총기 슬롯 2 해금 (퀘스트 「이도류 면허」)
  seenHelp: false,
  quest: null, questOffers: null, questsDone: 0,
  qslots: [null, null, null], // 음식 퀵슬롯 (3·4·5키)
  deathCache: null, // 사망 시 떨어뜨린 장비 {items:[{d,r}], x, y} — 다음 출격 1회 한정 회수
  region: 'hill',            // 마지막 선택 지역
  regionExtracts: {},        // 지역별 탈출 횟수 {hill:3, ...}
  regionBoss: {},            // 지역별 보스 처치 여부 {factory:true}
};

function curGun(){ return State.guns[State.activeGun]; }
let benchIdx = 0; // 작업대 탭에서 편집 중인 총
function editGun(){ return State.guns[benchIdx]; }

function switchGun(i){
  if(i===1 && !State.gun2){ toast('🔒 총기 슬롯 2는 퀘스트 「이도류 면허」로 해금'); return; }
  if(State.activeGun===i) return;
  if(!State.guns[i].body){ toast((i+1)+'번 슬롯에 총이 없습니다 (작업대에서 조립)'); return; }
  State.activeGun = i;
  player.reloading = 0;
  player.swapT = 0.35;
  sfx('mount');
  toast('🔫 '+(i+1)+'번: '+State.guns[i].body.def.name);
  updateHud();
}

function upTier(key){ return UPGRADES[key].tiers[State.up[key]]; }
function maxHp(){ return upTier('hp').v; }
function moveSpd(){ return 175 * upTier('shoes').v; }

function saveGame(){
  try{
    localStorage.setItem('quackscape_save', JSON.stringify({
      v:1, coins: State.coins, up: State.up,
      storage: State.storage.serialize(), backpack: State.backpack.serialize(),
      guns: State.guns.map(serializeGun), activeGun: State.activeGun, gun2: State.gun2,
      seenHelp: State.seenHelp,
      quest: State.quest, questOffers: State.questOffers, questsDone: State.questsDone||0,
      qslots: State.qslots.map(i=>i?{d:i.def.id}:null),
      deathCache: State.deathCache,
      region: State.region, regionExtracts: State.regionExtracts, regionBoss: State.regionBoss,
    }));
  }catch(e){}
}
function loadGame(){
  let d = null;
  try{ d = JSON.parse(localStorage.getItem('quackscape_save')); }catch(e){}
  if(d && d.v===1){
    State.coins = d.coins||0;
    Object.assign(State.up, d.up||{});
    State.storage = Inv.load(d.storage);
    State.backpack = Inv.load(d.backpack);
    if(d.guns) State.guns = d.guns.map(loadGun);
    else State.guns = [loadGun(d.gun), loadGun(null)]; // 구버전 세이브 마이그레이션
    while(State.guns.length<2) State.guns.push(loadGun(null));
    State.gun2 = !!d.gun2;
    State.activeGun = (d.activeGun===1 && State.gun2 && State.guns[1].body) ? 1 : 0;
    State.seenHelp = !!d.seenHelp;
    State.quest = d.quest||null;
    State.questOffers = d.questOffers||null;
    State.questsDone = d.questsDone||0;
    State.qslots = (d.qslots||[null,null,null]).map(s=> s && ITEMS[s.d] ? mkInst(s.d) : null);
    while(State.qslots.length<3) State.qslots.push(null);
    State.deathCache = d.deathCache||null;
    State.region = d.region || 'hill';
    State.regionExtracts = d.regionExtracts || {};
    State.regionBoss = d.regionBoss || {};
    return true;
  }
  return false;
}
function newGame(){
  const p = upTier('pack'), s = upTier('store');
  State.backpack = new Inv(p.w, p.h);
  State.storage = new Inv(s.w, s.h);
  State.guns = [ {body: mkInst('potato_pistol'), atts:[], ammo:0}, {body:null, atts:[], ammo:0} ];
  State.activeGun = 0; State.gun2 = false;
  State.backpack.autoPlace(mkInst('bandage'));
  State.backpack.autoPlace(mkInst('bandage'));
  State.backpack.autoPlace(mkInst('mushroom_mag'));
  State.storage.autoPlace(mkInst('glasses_scope'));
  State.storage.autoPlace(mkInst('soda'));
  State.quest = null; State.questOffers = null; State.questsDone = 0;
  State.deathCache = null;
  saveGame();
}

// ---------------- 플레이어 ----------------
const player = {
  x:0, y:0, r:13, hp:50, ang:0,
  ammo:0, reloading:0, reloadTotal:0, fireCd:0, flash:0, aimT:0,
  iframe:0, kills:0, coinsGained:0, lootMsgCd:0,
  stam:100, exhausted:false,
  bloom:0, kick:0, swapT:0, // 반동 블룸 / 킥백 / 무기 교체 딜레이
};
function stamMax(){ return 100 + State.up.shoes*25; }

// ---------------- 씬 ----------------
let scene = 'cave'; // 'cave' | 'raid'
let raid = null;    // 레이드 상태
let caveMap = null;

// ---------------- 케이브 ----------------
function buildCave(){
  const w=22, h=14;
  const t = new Uint8Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++)
    t[y*w+x] = (x===0||y===0||x===w-1||y===h-1) ? 1 : 2;
  caveMap = {
    w, h, tiles: t,
    stations: [
      { x:3.5*TILE, y:3.5*TILE, emoji:'📦', name:'창고', panel:'storage' },
      { x:18.5*TILE, y:3.5*TILE, emoji:'🛠️', name:'작업대', panel:'bench' },
      { x:7.5*TILE, y:2.3*TILE, emoji:'📌', name:'업그레이드', panel:'board' },
      { x:14*TILE, y:1.9*TILE, emoji:'📜', name:'퀘스트 창구', panel:'quest' },
      { x:11*TILE, y:12*TILE, emoji:'🚪', name:'출격', panel:'deploy' },
    ],
  };
}

// ---------------- 레이드 맵 생성 ----------------
let curRegion = REGIONS.hill; // 현재 레이드의 지역 (배율·풀 참조용)
function buildRaid(){
  curRegion = REGIONS[State.region] || REGIONS.hill;
  const RG = curRegion;
  const w=200, h=200;
  const t = new Uint8Array(w*h).fill(8); // 8=맵 밖 숲 · 0풀 1벽 2바닥 4바위 5물 6차량 7다리
  // 유기적 지형: 중앙 + 사방으로 길게 뻗어나가는 블롭들 (비정형 대형 맵)
  {
    const blobs = [{x:w/2, y:h/2, r:rnd(28,36)}];
    const arms = rndi(9,13);
    for(let i=0;i<arms;i++){
      const a = (i/arms)*Math.PI*2 + rnd(-0.4,0.4);
      const d = rnd(32,58);
      blobs.push({x:clamp(w/2+Math.cos(a)*d,16,w-16), y:clamp(h/2+Math.sin(a)*d,16,h-16), r:rnd(16,25)});
      if(Math.random()<0.8){ // 팔 끝의 지름길 지대
        const a2 = a+rnd(-0.4,0.4), d2 = d+rnd(20,36);
        blobs.push({x:clamp(w/2+Math.cos(a2)*d2,12,w-12), y:clamp(h/2+Math.sin(a2)*d2,12,h-12), r:rnd(10,17)});
      }
    }
    for(let y=2;y<h-2;y++) for(let x=2;x<w-2;x++){
      for(const b of blobs){
        if(Math.hypot(x-b.x,y-b.y) < b.r + Math.sin(x*0.8+y*0.3)*1.5){ t[y*w+x]=0; break; }
      }
    }
  }

  const houses = [];
  const containers = [];
  const indoorSpawns = [];
  const doormats = [];
  const decor = []; // 실내 장식물 (공장 기계·랙·컨베이어 등)

  // 강: 맵 한가운데를 가로지름 + 다리 3개
  {
    const vert = Math.random()<0.5;
    let c = Math.floor((vert?w:h)/2) + rndi(-4,4);
    const rw2 = rndi(1,2);
    const axisLen = vert? h : w;
    const bridges = [];
    while(bridges.length<4){
      const b = rndi(Math.floor(axisLen*0.2), Math.floor(axisLen*0.8));
      if(bridges.every(o=>Math.abs(o-b)>14)) bridges.push(b);
    }
    for(let i=0;i<axisLen;i++){
      c = clamp(c + rndi(-1,1), 6, (vert?w:h)-7);
      const isBridge = bridges.some(b=>Math.abs(b-i)<=1);
      for(let k=-rw2;k<=rw2;k++){
        const x = vert? c+k : i, y = vert? i : c+k;
        if(t[y*w+x]===0) t[y*w+x] = isBridge ? 7 : 5; // 지형 안쪽만 강으로
      }
    }
  }

  // 🏝️ 호수 + 섬: 탈출 요충지 — 양쪽 다리로만 진입 가능
  let island = null;
  for(let tries=0; tries<80 && !island; tries++){
    const lx = rndi(18, w-18), ly = rndi(18, h-18);
    if(Math.hypot(lx-w/2, ly-h/2) < 34) continue; // 중앙 강 지대 회피
    let grass=0, tot=0;
    for(let yy=-13; yy<=13; yy++) for(let xx=-13; xx<=13; xx++){
      tot++; if(t[(ly+yy)*w+(lx+xx)]===0) grass++;
    }
    if(grass/tot < 0.8) continue;
    for(let yy=-12; yy<=12; yy++) for(let xx=-12; xx<=12; xx++){
      const dd = Math.hypot(xx,yy);
      if(dd <= 11.5 + Math.sin(xx*0.7+yy*0.5)*1.3){
        t[(ly+yy)*w+(lx+xx)] = dd<=3.8 ? 0 : 5; // 가운데 섬만 풀
      }
    }
    // 섬을 관통하는 2칸 폭 다리 (섬 양쪽으로 다리 2개)
    const horiz = Math.random()<0.5;
    for(let i=-13;i<=13;i++){
      const cells = horiz ? [[lx+i,ly],[lx+i,ly+1]] : [[lx,ly+i],[lx+1,ly+i]];
      for(const [x,y] of cells) if(t[y*w+x]===5) t[y*w+x]=7;
    }
    island = {x:(lx+0.5)*TILE, y:(ly+0.5)*TILE};
  }

  // 🏭 공장: 초대형 실내 (집보다 먼저 배치해 빈 땅 우선 확보)
  for(let n=0;n<2;n++){
    for(let tries=0;tries<120;tries++){
      const rw=rndi(20,26), rh=rndi(15,20);
      const rx=rndi(3,w-rw-3), ry=rndi(3,h-rh-3);
      let clear2=true;
      for(let y=ry-1;y<ry+rh+1 && clear2;y++) for(let x=rx-1;x<rx+rw+1;x++)
        if(t[y*w+x]!==0){ clear2=false; break; }
      if(!clear2) continue;
      const hs={x:rx,y:ry,w:rw,h:rh,roofA:1,doors:[],factory:true,roofC:'#4a4e52'};
      houses.push(hs);
      for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++)
        t[y*w+x] = (x===rx||y===ry||x===rx+rw-1||y===ry+rh-1)?1:2;
      // 대형 셔터문 3칸씩 2개
      for(let dn=0;dn<2;dn++){
        const side=rndi(0,3);
        if(side===0){ const dx=rndi(rx+1,rx+rw-4); for(let k=0;k<3;k++)t[ry*w+dx+k]=2;
          hs.doors.push({x:dx,y:ry,side,wide:3}); doormats.push({tx:dx,ty:ry-1,horiz:true,wide:3}); }
        else if(side===1){ const dx=rndi(rx+1,rx+rw-4); for(let k=0;k<3;k++)t[(ry+rh-1)*w+dx+k]=2;
          hs.doors.push({x:dx,y:ry+rh-1,side,wide:3}); doormats.push({tx:dx,ty:ry+rh,horiz:true,wide:3}); }
        else if(side===2){ const dy=rndi(ry+1,ry+rh-4); for(let k=0;k<3;k++)t[(dy+k)*w+rx]=2;
          hs.doors.push({x:rx,y:dy,side,wide:3}); doormats.push({tx:rx-1,ty:dy,horiz:false,wide:3}); }
        else { const dy=rndi(ry+1,ry+rh-4); for(let k=0;k<3;k++)t[(dy+k)*w+rx+rw-1]=2;
          hs.doors.push({x:rx+rw-1,y:dy,side,wide:3}); doormats.push({tx:rx+rw,ty:dy,horiz:false,wide:3}); }
      }
      const occupied = (x,y)=> t[y*w+x]!==2 || decor.some(d=>d.hs===hs && x>=d.tx && x<d.tx+d.w && y>=d.ty && y<d.ty+d.h);
      // 긴 저장 랙 (실내 벽 역할 + 장식) — 세로/가로로 길게, 통로 남김
      const rackHoriz = rw >= rh;
      const nRacks = rndi(2,3);
      for(let ri=0; ri<nRacks; ri++){
        if(rackHoriz){
          const ryr = ry + 2 + Math.round((rh-4)*(ri+1)/(nRacks+1));
          const rxs = rx+2, rxe = rx+rw-3;
          const gap = rndi(rxs+3, rxe-3); // 통로 1칸
          let laid=false;
          for(let x=rxs;x<=rxe;x++){ if(x===gap) continue; if(t[ryr*w+x]===2){ t[ryr*w+x]=1; laid=true; } }
          if(laid) decor.push({kind:'rack', hs, tx:rxs, ty:ryr, w:rxe-rxs+1, h:1, horiz:true, gap});
        } else {
          const rxr = rx + 2 + Math.round((rw-4)*(ri+1)/(nRacks+1));
          const rys = ry+2, rye = ry+rh-3;
          const gap = rndi(rys+3, rye-3);
          let laid=false;
          for(let y=rys;y<=rye;y++){ if(y===gap) continue; if(t[y*w+rxr]===2){ t[y*w+rxr]=1; laid=true; } }
          if(laid) decor.push({kind:'rack', hs, tx:rxr, ty:rys, w:1, h:rye-rys+1, horiz:false, gap});
        }
      }
      // 대형 기계 (2x2, 엄폐물)
      for(let m=0;m<rndi(2,3);m++){
        for(let tr=0;tr<20;tr++){
          const mx=rndi(rx+1,rx+rw-3), my=rndi(ry+1,ry+rh-3);
          let ok=true;
          for(let yy=my;yy<my+2 && ok;yy++) for(let xx=mx;xx<mx+2;xx++) if(occupied(xx,yy)){ ok=false; break; }
          if(!ok) continue;
          for(let yy=my;yy<my+2;yy++) for(let xx=mx;xx<mx+2;xx++) t[yy*w+xx]=1;
          decor.push({kind:'machine', hs, tx:mx, ty:my, w:2, h:2, seed:rndi(0,9)});
          break;
        }
      }
      // 컨베이어 벨트 (바닥 장식, 통행 가능)
      for(let cb=0;cb<rndi(1,2);cb++){
        const choriz = Math.random()<0.5;
        if(choriz){ const cy2=rndi(ry+2,ry+rh-3), cxs=rndi(rx+2,rx+Math.floor(rw/2)), cl=rndi(4,7);
          decor.push({kind:'conveyor', hs, tx:cxs, ty:cy2, w:Math.min(cl,rx+rw-2-cxs), h:1, horiz:true}); }
        else { const cx2=rndi(rx+2,rx+rw-3), cys=rndi(ry+2,ry+Math.floor(rh/2)), cl=rndi(4,7);
          decor.push({kind:'conveyor', hs, tx:cx2, ty:cys, w:1, h:Math.min(cl,ry+rh-2-cys), horiz:false}); }
      }
      // 문 안쪽 통행 확보
      for(const d of hs.doors){
        const inw=d.side===0?[0,1]:d.side===1?[0,-1]:d.side===2?[1,0]:[-1,0];
        for(let k=0;k<(d.wide||2);k++){
          const cx2 = d.side<2 ? d.x+k : d.x, cy2 = d.side<2 ? d.y : d.y+k;
          t[(cy2+inw[1])*w+(cx2+inw[0])]=2;
        }
      }
      // 대량 컨테이너 (공장 특화: 사물함/팔레트/공구함)
      const cn=rndi(12,18);
      for(let c=0;c<cn;c++){
        const cx=rndi(rx+1,rx+rw-2), cy=rndi(ry+1,ry+rh-2);
        if(t[cy*w+cx]!==2 || containers.some(k=>k.tx===cx&&k.ty===cy)) continue;
        const type = Math.random()<0.12?'safe':pick(['locker','pallet','pallet','toolbox','locker']);
        containers.push(mkContainer(type, cx, cy));
      }
      // 적 다수 (공장은 위험지대) — 좁은 실내라 큰 몹(bigduck) 제외
      const en=rndi(5,8);
      for(let e2=0;e2<en;e2++){
        const ex=rndi(rx+1,rx+rw-2), ey=rndi(ry+1,ry+rh-2);
        // 스폰 칸 + 상하좌우가 모두 바닥이어야 (끼임 방지)
        if(t[ey*w+ex]===2 && t[ey*w+ex-1]===2 && t[ey*w+ex+1]===2 && t[(ey-1)*w+ex]===2 && t[(ey+1)*w+ex]===2)
          indoorSpawns.push({id:pick(['zduck','gunner','spitter','sniper','fastduck']),x:(ex+.5)*TILE,y:(ey+.5)*TILE});
      }
      break;
    }
  }

  // 집 (앞의 5채는 방 구조가 촘촘한 대형 저택)
  for(let n=0;n<22;n++){
    const big = n<5;
    for(let tries=0;tries<40;tries++){
      const rw = big? rndi(13,18) : rndi(6,9);
      const rh = big? rndi(11,15) : rndi(5,7);
      const rx=rndi(3,w-rw-3), ry=rndi(3,h-rh-3);
      if(houses.some(hs=>rx<hs.x+hs.w+3 && hs.x<rx+rw+3 && ry<hs.y+hs.h+3 && hs.y<ry+rh+3)) continue;
      let clearArea = true;
      for(let y=ry-1;y<ry+rh+1 && clearArea;y++)
        for(let x=rx-1;x<rx+rw+1;x++)
          if(t[y*w+x]!==0){ clearArea=false; break; }
      if(!clearArea) continue;
      const hs = {x:rx, y:ry, w:rw, h:rh, roofA:1, doors:[],
        roofC:pick(['#7a4a3a','#6a5340','#5d4a45','#77503a'])};
      houses.push(hs);
      for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++)
        t[y*w+x] = (x===rx||y===ry||x===rx+rw-1||y===ry+rh-1) ? 1 : 2;
      // 바깥문 (2칸) — 위치 기록 + 문 앞 현관 매트
      const doorN = big? 2 : 1;
      for(let dn=0;dn<doorN;dn++){
        const side = rndi(0,3);
        if(side===0){ const dx=rndi(rx+1,rx+rw-3); t[ry*w+dx]=2; t[ry*w+dx+1]=2;
          hs.doors.push({x:dx,y:ry,side}); doormats.push({tx:dx, ty:ry-1, horiz:true}); }
        else if(side===1){ const dx=rndi(rx+1,rx+rw-3); t[(ry+rh-1)*w+dx]=2; t[(ry+rh-1)*w+dx+1]=2;
          hs.doors.push({x:dx,y:ry+rh-1,side}); doormats.push({tx:dx, ty:ry+rh, horiz:true}); }
        else if(side===2){ const dy=rndi(ry+1,ry+rh-3); t[dy*w+rx]=2; t[(dy+1)*w+rx]=2;
          hs.doors.push({x:rx,y:dy,side}); doormats.push({tx:rx-1, ty:dy, horiz:false}); }
        else { const dy=rndi(ry+1,ry+rh-3); t[dy*w+rx+rw-1]=2; t[(dy+1)*w+rx+rw-1]=2;
          hs.doors.push({x:rx+rw-1,y:dy,side}); doormats.push({tx:rx+rw, ty:dy, horiz:false}); }
      }
      // 대형 저택: 세로·가로 칸막이로 여러 개의 방 그리드 (문틈으로 연결)
      if(big){
        // 세로 칸막이 1~2개
        const vSplits = [];
        const nV = rndi(1,2);
        for(let s=0;s<nV;s++){
          const sx = rx + Math.round((rw)*(s+1)/(nV+1));
          if(sx>rx+1 && sx<rx+rw-2 && !vSplits.includes(sx)) vSplits.push(sx);
        }
        for(const sx of vSplits){
          const gapY = rndi(ry+1, ry+rh-3);
          for(let y=ry+1;y<ry+rh-1;y++)
            if(y!==gapY && y!==gapY+1) t[y*w+sx] = 1;
        }
        // 가로 칸막이 1~2개
        const nH = rndi(1,2);
        for(let s=0;s<nH;s++){
          const sy = ry + Math.round((rh)*(s+1)/(nH+1));
          if(sy<=ry+1 || sy>=ry+rh-2) continue;
          const gapX = rndi(rx+1, rx+rw-3);
          for(let x=rx+1;x<rx+rw-1;x++)
            if(x!==gapX && x!==gapX+1) t[sy*w+x] = 1;
        }
      }
      // 문 바로 안쪽은 항상 통행 확보 (칸막이가 입구를 막지 않게)
      for(const d of hs.doors){
        const cells = (d.side<2) ? [[d.x,d.y],[d.x+1,d.y]] : [[d.x,d.y],[d.x,d.y+1]];
        const inw = d.side===0?[0,1] : d.side===1?[0,-1] : d.side===2?[1,0] : [-1,0];
        for(const [cx2,cy2] of cells) t[(cy2+inw[1])*w + (cx2+inw[0])] = 2;
      }
      // 집 안 컨테이너 (실내 파밍 위주)
      const cn = big? rndi(7,11) : rndi(2,3);
      for(let c=0;c<cn;c++){
        const cx=rndi(rx+1,rx+rw-2), cy=rndi(ry+1,ry+rh-2);
        if(t[cy*w+cx]!==2 || containers.some(k=>k.tx===cx&&k.ty===cy)) continue;
        const type = Math.random()<(big?0.22:0.15) ? 'safe' : pick(['cupboard','fridge','cupboard','toolbox']);
        containers.push(mkContainer(type, cx, cy));
      }
      // 집 안 상주 적 (스폰 칸 + 상하좌우 바닥 확인 → 끼임 방지)
      const en = big? rndi(3,5) : (Math.random()<0.55 ? 1 : 0);
      for(let e2=0;e2<en;e2++){
        const ex=rndi(rx+1,rx+rw-2), ey=rndi(ry+1,ry+rh-2);
        if(t[ey*w+ex]===2 && t[ey*w+ex-1]===2 && t[ey*w+ex+1]===2 && t[(ey-1)*w+ex]===2 && t[(ey+1)*w+ex]===2)
          indoorSpawns.push({id: pick(['zduck','zduck','spitter','gunner']), x:(ex+.5)*TILE, y:(ey+.5)*TILE});
      }
      break;
    }
  }

  // 🚜 울타리 농장: 개방된 밭 + 여물통 + 헛간 상자 (울타리는 낮은 벽)
  const farms=[];
  for(let n=0;n<3;n++){
    for(let tries=0;tries<50;tries++){
      const fw=rndi(12,18), fh=rndi(10,14);
      const fx=rndi(3,w-fw-3), fy=rndi(3,h-fh-3);
      if(houses.some(hs=>fx<hs.x+hs.w+2 && hs.x<fx+fw+2 && fy<hs.y+hs.h+2 && hs.y<fy+fh+2)) continue;
      if(farms.some(f=>fx<f.x+f.w+2 && f.x<fx+fw+2 && fy<f.y+f.h+2 && f.y<fy+fh+2)) continue;
      let clear3=true;
      for(let y=fy;y<fy+fh && clear3;y++) for(let x=fx;x<fx+fw;x++)
        if(t[y*w+x]!==0){ clear3=false; break; }
      if(!clear3) continue;
      // 울타리(벽)로 둘레, 밭이랑은 바닥으로 안 만들고 풀 유지, 출입구 2칸
      const gate=rndi(fx+2,fx+fw-3);
      for(let x=fx;x<fx+fw;x++){ t[fy*w+x]=1; t[(fy+fh-1)*w+x]=1; }
      for(let y=fy;y<fy+fh;y++){ t[y*w+fx]=1; t[y*w+fx+fw-1]=1; }
      t[(fy+fh-1)*w+gate]=0; t[(fy+fh-1)*w+gate+1]=0; // 남쪽 출입구
      const farm={x:fx,y:fy,w:fw,h:fh};
      farms.push(farm);
      // 밭이랑 표시용 데이터 (렌더에서 사용)
      farm.rows=[];
      for(let ry2=fy+2; ry2<fy+fh-2; ry2+=2) farm.rows.push(ry2);
      // 여물통 + 야외 상자 (냉장고·금고 같은 실내 가전은 없음)
      const cn=rndi(3,5);
      for(let c=0;c<cn;c++){
        const cx=rndi(fx+1,fx+fw-3), cy=rndi(fy+1,fy+fh-2);
        if(t[cy*w+cx]!==0 || containers.some(k=>Math.abs(k.tx-cx)<2&&Math.abs(k.ty-cy)<2)) continue;
        const type=pick(['trough','trough','trough','crate']);
        containers.push(mkContainer(type, cx, cy));
      }
      break;
    }
  }

  // 바위 (나무는 아래에서 캐노피 엔티티로)
  for(let n=0;n<70;n++){
    const x=rndi(2,w-3), y=rndi(2,h-3);
    if(t[y*w+x]===0) t[y*w+x]=4;
  }

  // 바리케이드 (짧은 벽 조각)
  for(let n=0;n<24;n++){
    const horiz = Math.random()<0.5, len = rndi(3,6);
    const x0 = rndi(4, w-len-4), y0 = rndi(4, h-len-4);
    let ok = true;
    for(let i=0;i<len;i++){
      const x = horiz? x0+i : x0, y = horiz? y0 : y0+i;
      if(t[y*w+x]!==0){ ok=false; break; }
    }
    if(!ok) continue;
    for(let i=0;i<len;i++){
      const x = horiz? x0+i : x0, y = horiz? y0 : y0+i;
      t[y*w+x] = 1;
    }
  }

  // 나무 수풀: 군락 + 단독. 밑에 들어갈 수 있는 큰 캐노피
  const trees = [];
  const treeOK = (x,y)=>{
    const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
    if(tx<2||ty<2||tx>=w-2||ty>=h-2) return false;
    if(t[ty*w+tx]!==0) return false;
    for(const hs of houses){
      if(x>(hs.x-1.5)*TILE && x<(hs.x+hs.w+1.5)*TILE && y>(hs.y-1.5)*TILE && y<(hs.y+hs.h+1.5)*TILE) return false;
    }
    return true;
  };
  for(let n=0;n<50;n++){
    const cx=rnd(4,w-4)*TILE, cy=rnd(4,h-4)*TILE;
    const cnt=rndi(2,5);
    for(let i=0;i<cnt;i++){
      const x=cx+rnd(-95,95), y=cy+rnd(-95,95);
      if(treeOK(x,y)) trees.push({x,y,r:rnd(38,58),seed:rnd(0,7),a:1});
    }
  }
  for(let n=0;n<40;n++){
    const x=rnd(3,w-3)*TILE, y=rnd(3,h-3)*TILE;
    if(treeOK(x,y)) trees.push({x,y,r:rnd(30,46),seed:rnd(0,7),a:1});
  }

  // 야외 컨테이너 (실내 파밍 위주로 축소)
  let crates=0;
  for(let tries=0; tries<600 && crates<20; tries++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0 && !containers.some(k=>Math.abs(k.tx-x)<2&&Math.abs(k.ty-y)<2)){
      containers.push(mkContainer('crate', x, y)); crates++;
    }
  }
  let tbs=0;
  for(let tries=0; tries<600 && tbs<13; tries++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0 && !containers.some(k=>Math.abs(k.tx-x)<2&&Math.abs(k.ty-y)<2)){
      containers.push(mkContainer('toolbox', x, y)); tbs++;
    }
  }

  // 스폰/탈출: 탈출 1 = 호수 섬(다리 2개 요충지), 탈출 2 = 지형 팔 끝(지름길 종점)
  const grassSpots = [];
  for(let i=0;i<1500 && grassSpots.length<160;i++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0) grassSpots.push({x:(x+.5)*TILE, y:(y+.5)*TILE});
  }
  const ctr = {x:w/2*TILE, y:h/2*TILE};
  grassSpots.sort((a,b)=>dist(b.x,b.y,ctr.x,ctr.y)-dist(a.x,a.y,ctr.x,ctr.y));
  // 스폰: 가장자리, 섬에서 멀리
  let spawn = ctr;
  for(const s of grassSpots){
    if(island && dist(s.x,s.y,island.x,island.y)<700) continue;
    spawn = s; break;
  }
  let ex1 = island;
  if(!ex1){
    let bd1=0;
    for(const s of grassSpots){ const d0=dist(s.x,s.y,spawn.x,spawn.y); if(d0>bd1){bd1=d0; ex1=s;} }
  }
  let ex2 = null, bd2 = 0;
  for(const s of grassSpots){
    if(dist(s.x,s.y,spawn.x,spawn.y) < 1400) continue;
    if(dist(s.x,s.y,ex1.x,ex1.y) < 900) continue;
    const d0 = dist(s.x,s.y,ctr.x,ctr.y); // 중심에서 가장 먼 곳 = 팔 끝
    if(d0>bd2){ bd2=d0; ex2=s; }
  }
  if(!ex2){
    let bd3=0;
    for(const s of grassSpots){
      const d0 = Math.min(dist(s.x,s.y,spawn.x,spawn.y), dist(s.x,s.y,ex1.x,ex1.y));
      if(d0>bd3){ bd3=d0; ex2=s; }
    }
  }
  const extracts = [ex1||ctr, ex2||ctr];

  // 스폰 주변 정리 (물/다리 포함)
  const clear = (px,py)=>{
    const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
    for(let y=ty-2;y<=ty+2;y++) for(let x=tx-2;x<=tx+2;x++){
      const v = t[y*w+x];
      if(x>0&&y>0&&x<w-1&&y<h-1 && (v===4||v===1||v===5||v===7)) t[y*w+x]=0;
    }
  };
  clear(spawn.x,spawn.y); extracts.forEach(z=>clear(z.x,z.y));

  // 버려진 차량 — 승용차 / 버스 / 트럭 (엄폐물, 긴 벽 역할, 총알도 막음)
  const cars = [];
  const CAR_KINDS = [
    {kind:'car',   len:4, wide:2, w6:['#8a4a3a','#4a6a8a','#7a7a4a','#6a4a7a','#9a8a7a']},
    {kind:'car',   len:4, wide:2, w6:['#8a4a3a','#4a6a8a','#7a7a4a','#6a4a7a','#9a8a7a']},
    {kind:'bus',   len:9, wide:3, w6:['#c9a02a','#3a7a4a','#c04a3a']},   // 긴 버스
    {kind:'truck', len:7, wide:3, w6:['#5a6a7a','#7a5a3a','#4a5a5a']},   // 트럭
  ];
  for(let n=0;n<18;n++){
    const kd = pick(CAR_KINDS);
    for(let tries=0;tries<25;tries++){
      const horiz = Math.random()<0.5;
      const cw = horiz?kd.len:kd.wide, ch = horiz?kd.wide:kd.len;
      const cx = rndi(3, w-cw-3), cy = rndi(3, h-ch-3);
      let ok = true;
      for(let y=cy;y<cy+ch && ok;y++) for(let x=cx;x<cx+cw;x++) if(t[y*w+x]!==0){ ok=false; break; }
      if(!ok) continue;
      const px = (cx+cw/2)*TILE, py = (cy+ch/2)*TILE;
      if(dist(px,py,spawn.x,spawn.y)<150 || extracts.some(z=>dist(px,py,z.x,z.y)<150)) continue;
      if(containers.some(k=>k.tx>=cx-1&&k.tx<cx+cw+1&&k.ty>=cy-1&&k.ty<cy+ch+1)) continue;
      for(let y=cy;y<cy+ch;y++) for(let x=cx;x<cx+cw;x++) t[y*w+x]=6;
      cars.push({tx:cx, ty:cy, w:cw, h:ch, horiz, kind:kd.kind, color:pick(kd.w6)});
      break;
    }
  }

  // 💀 지난 사망 지점의 장비 잔해 (이번 출격 1회 한정 — 이후 소멸)
  if(State.deathCache && State.deathCache.items.length){
    const dc = State.deathCache;
    const tx0 = clamp(Math.floor(dc.x/TILE), 2, w-3);
    const ty0 = clamp(Math.floor(dc.y/TILE), 2, h-3);
    let best = null, bestD = 1e9;
    for(let ry2=-18; ry2<=18; ry2++) for(let rx2=-18; rx2<=18; rx2++){
      const x = tx0+rx2, y = ty0+ry2;
      if(x<2||y<2||x>=w-2||y>=h-2) continue;
      const v = t[y*w+x];
      if(v!==0 && v!==2 && v!==7) continue;
      const d2 = rx2*rx2 + ry2*ry2;
      if(d2 < bestD){ bestD = d2; best = {x, y}; }
    }
    if(best){
      const c = mkContainer('corpse', best.x, best.y);
      c.inv = new Inv(CONTAINER_TYPES.corpse.w, CONTAINER_TYPES.corpse.h);
      for(const it of dc.items){
        if(!ITEMS[it.d]) continue;
        const inst = mkInst(it.d);
        inst.rot = it.r||0;
        c.inv.autoPlace(inst); // 내 물건이라 조사(hidden) 없음
      }
      c.opened = true;
      containers.push(c);
    }
  }
  State.deathCache = null; // 이번 판에 안 찾으면 소멸

  // 스폰/탈출 지점 주변 나무 제거
  const farFrom = (tr)=> dist(tr.x,tr.y,spawn.x,spawn.y)>130 && extracts.every(z=>dist(tr.x,tr.y,z.x,z.y)>130);

  raid = {
    w, h, tiles:t, houses, containers, extracts, cars, doormats, farms, decor,
    trees: trees.filter(farFrom),
    enemies:[], bullets:[], ebullets:[], drops:[], parts:[], dnums:[], noises:[],
    time:0, waveT:6, trickleT:10, extractT:0, over:false, nightToast:false, duskToast:false,
    inside:null, underTree:false, treeToastDone:false,
    bossSpawned:false, boss:null,
    region: RG.id, dayLen: RG.dayLen, coinMul: RG.coinMul, rareBonus: RG.rareBonus,
  };

  // 낮 배회 미니들 (지역 풀)
  for(let n=0;n<40;n++){
    const x=rnd(3,w-3)*TILE, y=rnd(3,h-3)*TILE;
    if(dist(x,y,spawn.x,spawn.y)<420) continue;
    if(solidPx(x,y) || houseAtPx(x,y)) continue;
    spawnEnemy(pickWeighted(RG.pool), x, y);
  }
  // 집 안 상주 적 (지붕에 가려져 있다가 들어가면 조우)
  for(const s of indoorSpawns) spawnEnemy(s.id, s.x, s.y);

  player.x = spawn.x; player.y = spawn.y;
  player.hp = maxHp();
  player.kills = 0; player.coinsGained = 0;
  player.iframe = 2;
  player.stam = stamMax(); player.exhausted = false;
  for(const g of State.guns){ if(g.body) g.ammo = gunStats(g).ammo; }
  player.reloading = 0; player.aimT = 0; player.swapT = 0;
}

function mkContainer(type, tx, ty){
  const ct = CONTAINER_TYPES[type];
  const hp = ct.hp||40;
  return { type, tx, ty, x:(tx+0.5)*TILE, y:(ty+0.5)*TILE, inv:null, opened:false, ct, hp, hpMax:hp };
}
function fillContainer(c){
  c.inv = new Inv(c.ct.w, c.ct.h);
  const n = rndi(c.ct.count[0], c.ct.count[1]);
  for(let i=0;i<n;i++){
    const pool = pickWeighted(c.ct.roll);
    // 부착물 슬롯은 3% 확률로 ★ 희귀 (지역 보너스 가산)
    const rareCh = 0.03 + ((raid && raid.rareBonus)||0);
    const id = (pool==='att' && Math.random()<rareCh)
      ? pick(LOOT_POOLS.rareAtt)
      : pick(LOOT_POOLS[pool]);
    const inst = mkInst(id);
    inst.hidden = true; // 열자마자는 실루엣만 — 조사(2초/개)로 식별
    c.inv.autoPlace(inst);
  }
}

function solidPx(px,py){ // 이동 차단: 벽·바위·물·차량
  if(!raid) return false;
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
  const v = raid.tiles[ty*raid.w+tx];
  return v===1||v===4||v===5||v===6||v===8;
}
function shotSolidPx(px,py){ // 총알 차단: 벽·바위·차량·맵 밖 (물 위는 통과)
  if(!raid) return false;
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
  const v = raid.tiles[ty*raid.w+tx];
  return v===1||v===4||v===6||v===8;
}
// 시야 차단: 벽·차량이 두 점 사이를 막는지 (적이 벽 너머 감지/사격 못 하게)
function sightBlocked(ax, ay, bx, by){
  if(!raid) return false;
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy);
  const steps=Math.ceil(len/(TILE*0.5));
  if(steps<=0) return false;
  for(let i=1;i<steps;i++){
    const x=ax+dx*i/steps, y=ay+dy*i/steps;
    const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
    if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
    const v = raid.tiles[ty*raid.w+tx];
    if(v===1||v===6||v===8) return true; // 벽·차량·맵밖은 시야 차단 (바위·물은 통과)
  }
  return false;
}
function caveSolidPx(px,py){
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=caveMap.w||ty>=caveMap.h) return true;
  return caveMap.tiles[ty*caveMap.w+tx]===1;
}

// 해당 좌표가 어느 집의 실내(바닥/문간)인지
function houseAtPx(px,py){
  if(!raid) return null;
  const tx = Math.floor(px/TILE), ty = Math.floor(py/TILE);
  for(const hs of raid.houses){
    if(tx>=hs.x && tx<hs.x+hs.w && ty>=hs.y && ty<hs.y+hs.h
       && raid.tiles[ty*raid.w+tx]===2) return hs;
  }
  return null;
}

function moveCircle(ent, dx, dy, solidFn){
  // 축 분리 충돌 — 검사 반경을 살짝 줄여(0.82) 좁은 통로 통과를 관대하게 (끼임 완화)
  const r = ent.r * 0.82, rr = r*0.6;
  let nx = ent.x + dx;
  if(!solidFn(nx-r,ent.y-rr) && !solidFn(nx+r,ent.y-rr) && !solidFn(nx-r,ent.y+rr) && !solidFn(nx+r,ent.y+rr)) ent.x = nx;
  let ny = ent.y + dy;
  if(!solidFn(ent.x-rr,ny-r) && !solidFn(ent.x+rr,ny-r) && !solidFn(ent.x-rr,ny+r) && !solidFn(ent.x+rr,ny+r)) ent.y = ny;
}

// ---------------- 적 ----------------
function spawnEnemy(typeId, x, y){
  const T = ENEMY_TYPES[typeId];
  const rg = curRegion;
  const bossType = !!T.boss;
  // 보스는 지역 배율 미적용(자체 밸런스), 일반 적만 지역 배율
  const hpMul = bossType ? 1 : rg.hpMul;
  const hp = Math.round(T.hp * hpMul * (phase()==='night' ? 1.6 : 1)); // 밤 스폰은 강화
  raid.enemies.push({
    id:typeId, t:T, x, y, hp, hpMax:hp, r:T.r,
    spdMul: bossType ? 1 : rg.spdMul,   // 이동속도 지역 배율
    dmgMul: bossType ? 1 : rg.dmgMul,   // 공격력 지역 배율
    state:'wander', wt:rnd(0,2), wdir:rnd(0,Math.PI*2), moveT:0,
    atkCd:0, shootCd:rnd(0.5,1.5), hitT:0, target:null,
    seed:rnd(0,10), backT:0, lungeT:0,
  });
}

function dayLen(){ return (raid && raid.dayLen) || DAY_LEN; }
function phase(){
  if(!raid) return 'day';
  const dl = dayLen();
  if(raid.time < dl) return 'day';
  if(raid.time < dl+DUSK_LEN) return 'dusk';
  return 'night';
}
function nightSec(){ return Math.max(0, raid.time - dayLen() - DUSK_LEN); }

function updateEnemies(dt){
  const night = phase()==='night';
  let aggroR = night ? 300 : 165;
  if(raid.underTree) aggroR *= 0.45; // 수풀 은신

  for(const e of raid.enemies){
    e.hitT -= dt; e.atkCd -= dt;
    // 끼임 탈출: 몸이 벽/장애물에 박혔으면 열린 방향으로 밀어냄
    if(solidPx(e.x, e.y)){
      let best=null, bd=1e9;
      for(let a=0;a<8;a++){
        const ang=a/8*Math.PI*2;
        for(let d=TILE*0.6; d<=TILE*3; d+=TILE*0.5){
          const tx=e.x+Math.cos(ang)*d, ty=e.y+Math.sin(ang)*d;
          if(!solidPx(tx,ty)){ if(d<bd){ bd=d; best=[tx,ty]; } break; }
        }
      }
      if(best){ e.x=best[0]; e.y=best[1]; }
    }
    const dp = Math.max(0.001, dist(e.x,e.y,player.x,player.y)); // 0나눗셈(NaN) 방지
    const spd = e.t.spd * (e.spdMul||1) * (night ? 1.10 : 1);   // 지역·밤 배율
    const dmgN = (e.dmgMul||1) * (night ? 1.3 : 1);             // 지역·밤 배율

    // 시야 확보 여부 (벽·차량 너머면 못 봄) — 보스는 항상 봄
    const canSee = e.t.boss || (dp < (night?1500:700) && !sightBlocked(e.x,e.y,player.x,player.y));
    // 감지: 시야 안에 있고 어그로 반경 이내일 때만 추격 시작
    if(e.state!=='chase' && dp < aggroR && canSee){ e.state='chase'; e.lastSeen={x:player.x,y:player.y}; }

    if(e.state==='chase'){
      if(dp > (night?1400:650) && !e.t.boss){ e.state='wander'; e.aimT=0; continue; }
      // 추격 중 시야를 잃으면 마지막 목격 지점으로 이동, 도착하면 포기
      if(!canSee && !e.t.boss){
        // 시야 상실: 마지막 목격 지점으로 향하되, 벽에 막히면 옆으로 미끄러져 우회
        const ls = e.lastSeen;
        if(!ls){ e.state='wander'; e.aimT=0; continue; }
        e.lostT = (e.lostT||0) + dt;
        if(e.lostT > 6){ e.state='wander'; e.lastSeen=null; e.lostT=0; e.aimT=0; continue; } // 6초 못 찾으면 포기
        const ld = Math.max(1, dist(e.x,e.y,ls.x,ls.y));
        if(ld < 30){ e.state='wander'; e.lastSeen=null; e.lostT=0; e.aimT=0; continue; }
        const dxg=(ls.x-e.x)/ld, dyg=(ls.y-e.y)/ld;
        const ox=e.x, oy=e.y;
        moveCircle(e, dxg*spd*dt, dyg*spd*dt, solidPx);
        // 거의 안 움직였으면(벽에 막힘) 좌/우 수직 방향으로 우회 시도
        if(Math.hypot(e.x-ox, e.y-oy) < spd*dt*0.3){
          const side = ((e.seed*7|0)%2)?1:-1;
          moveCircle(e, -dyg*side*spd*dt, dxg*side*spd*dt, solidPx);
        }
        continue;
      }
      e.lostT = 0;
      // 시야 확보 시, 또는 가까이(같은 방 안) 있으면 마지막 목격 지점 갱신 → 실내에서 잘 쫓아옴
      if(canSee || dp < 220) e.lastSeen = {x:player.x, y:player.y};
      const dirx = (player.x-e.x)/dp, diry = (player.y-e.y)/dp;
      if(e.t.boss){
        // 👑 보스: 추격 + 4.2초 사이클로 돌진/꽥노바/부하소환
        e.atkT = (e.atkT||0) + dt;
        if(e.mode==='windup'){
          e.windT -= dt;
          if(e.windT<=0){ e.mode='dash'; e.dashT=0.55; sfx('honk'); }
        } else if(e.mode==='dash'){
          e.dashT -= dt;
          const ox=e.x, oy=e.y;
          moveCircle(e, e.dashX*540*dt, e.dashY*540*dt, solidPx);
          if(Math.hypot(e.x-ox, e.y-oy) < 540*dt*0.3){ e.dashT=0; shake=Math.min(16, shake+8); } // 벽에 쿵
          if(dp < e.r+player.r+6 && e.atkCd<=0){ e.atkCd=0.8; hurtPlayer(Math.round(e.t.dmg*dmgN)); }
          if(e.dashT<=0) e.mode='chase';
        } else {
          moveCircle(e, dirx*spd*dt, diry*spd*dt, solidPx);
          if(dp < e.r+player.r+4 && e.atkCd<=0){ e.atkCd=0.9; hurtPlayer(Math.round(24*dmgN)); }
          if(e.atkT>4.2){
            e.atkT = 0;
            e.cycle = (e.cycle||0)+1;
            if(e.cycle%3===0){
              // 부하 소환
              sfx('boss');
              raid.dnums.push({x:e.x, y:e.y-e.r-16, txt:'꽤애애액!!', t:1.1, c:'#ffd24a'});
              for(let i=0;i<5;i++){
                for(let tr=0; tr<6; tr++){
                  const a2 = rnd(0,Math.PI*2), dd = rnd(50,110);
                  const x2 = e.x+Math.cos(a2)*dd, y2 = e.y+Math.sin(a2)*dd;
                  if(!solidPx(x2,y2)){
                    spawnEnemy(pick(['zduck','zduck','fastduck']), x2, y2);
                    raid.enemies[raid.enemies.length-1].state = 'chase';
                    break;
                  }
                }
              }
            } else if(dp>180){
              // 돌진 예고
              e.mode='windup'; e.windT=0.85; e.dashX=dirx; e.dashY=diry;
            } else {
              // 꽥 노바 (방사탄)
              sfx('honk');
              for(let i=0;i<18;i++){
                const a2 = i/18*Math.PI*2;
                raid.ebullets.push({x:e.x, y:e.y, vx:Math.cos(a2)*230, vy:Math.sin(a2)*230,
                  dmg:Math.round(12*dmgN), life:2.2, r:5, c:'#ffd24a'});
              }
            }
          }
        }
      } else if(e.t.bomber){
        // 폭탄미니: 돌진 후 자폭
        moveCircle(e, dirx*spd*dt, diry*spd*dt, solidPx);
        if(dp < e.r+player.r+6){
          const i = raid.enemies.indexOf(e);
          if(i>=0) raid.enemies.splice(i,1);
          explode(e.x, e.y);
          continue;
        }
      } else if(e.t.ranged==='spit'){
        e.shootCd -= dt;
        let mv = 0;
        if(dp>240) mv=1; else if(dp<150) mv=-0.8;
        moveCircle(e, dirx*spd*mv*dt, diry*spd*mv*dt, solidPx);
        if(dp<320 && e.shootCd<=0 && canSee){
          e.shootCd = 1.7;
          raid.ebullets.push({x:e.x,y:e.y,vx:dirx*250,vy:diry*250,dmg:Math.round(e.t.dmg*dmgN),life:2,r:4,c:'#b070e0'});
          sfx('spit');
        }
      } else if(e.t.ranged==='burst'){
        // 따발미니: 4발 점사
        e.shootCd -= dt;
        let mv = 0;
        if(dp>300) mv=1; else if(dp<180) mv=-0.7;
        moveCircle(e, dirx*spd*mv*dt, diry*spd*mv*dt, solidPx);
        if(e.burstN>0){
          e.burstT -= dt;
          if(e.burstT<=0){
            e.burstT = 0.09; e.burstN--;
            const a = Math.atan2(diry,dirx) + (Math.random()-0.5)*0.24;
            raid.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*330,vy:Math.sin(a)*330,dmg:Math.round(e.t.dmg*dmgN),life:1.6,r:3.5,c:'#e8c05a'});
            sfx('spit');
          }
        } else if(dp<360 && e.shootCd<=0 && canSee){ e.shootCd = 2.6; e.burstN = 4; e.burstT = 0; }
      } else if(e.t.ranged==='sniper'){
        // 저격미니: 멀리서 조준(레이저) 후 고속탄
        let mv = 0;
        if(dp<190) mv=-1; else if(dp>560) mv=1;
        moveCircle(e, dirx*spd*mv*dt, diry*spd*mv*dt, solidPx);
        if(dp<600 && mv===0 && canSee){
          e.aimT = (e.aimT||0)+dt;
          if(e.aimT>1.35){
            e.aimT = 0;
            raid.ebullets.push({x:e.x,y:e.y,vx:dirx*560,vy:diry*560,dmg:Math.round(e.t.dmg*dmgN),life:1.5,r:4.5,c:'#7ae0e8'});
            sfx('shoot');
          }
        } else e.aimT = 0;
      } else if(e.t.r < 18){
        // 소형 근접: 찌르고 빠지기 — 평소엔 총 맞을 거리(오비트)를 유지, 쿨마다 순간 돌진해 때리고 후퇴
        const ORBIT = 96;   // 이 거리를 맴돔 — 플레이어 총구(≈40px)보다 확실히 바깥
        const touch = e.r + player.r + 4;
        if(e.backT > 0){
          // 후퇴: 오비트 거리까지 물러남
          e.backT -= dt;
          const away = dp < ORBIT+30 ? 1 : 0.2;
          const sway = Math.sin(performance.now()/150 + e.seed*7) * 0.5;
          moveCircle(e, (-dirx*away - diry*sway)*spd*dt, (-diry*away + dirx*sway)*spd*dt, solidPx);
        } else if(e.lungeT > 0){
          // 돌진: 플레이어에게 곧장 파고들어 접촉하면 타격 후 즉시 후퇴
          e.lungeT -= dt;
          moveCircle(e, dirx*spd*1.5*dt, diry*spd*1.5*dt, solidPx);
          if(dp < touch){
            hurtPlayer(Math.round(e.t.dmg*dmgN));
            e.lungeT = 0;
            e.backT = 0.5 + rnd(0,0.3);
            e.atkCd = 1.0 + rnd(0,0.5);
          }
        } else if(dp < ORBIT){
          // 오비트: 접근하지 않고 좌우로 맴돌며 조준을 흘림
          const sway = Math.sin(performance.now()/160 + e.seed*7);
          const tang = 0.9 * (sway>0?1:-1);
          const radial = dp < ORBIT-24 ? -0.5 : 0; // 너무 붙으면 살짝 벌림
          moveCircle(e, (dirx*radial - diry*tang)*spd*dt, (diry*radial + dirx*tang)*spd*dt, solidPx);
          if(e.atkCd <= 0){ e.lungeT = 0.55; } // 쿨 차면 돌진 개시
        } else {
          // 오비트 밖: 그냥 접근
          moveCircle(e, dirx*spd*dt, diry*spd*dt, solidPx);
        }
      } else {
        // 대형 근접(뚱뚱미니 등): 우직하게 밀어붙임
        moveCircle(e, dirx*spd*dt, diry*spd*dt, solidPx);
        if(dp < e.r+player.r+4 && e.atkCd<=0){
          e.atkCd = 0.9;
          hurtPlayer(Math.round(e.t.dmg*dmgN));
        }
      }
    } else if(e.state==='invest' && e.target){
      const dt2 = dist(e.x,e.y,e.target.x,e.target.y);
      if(dt2<30){ e.state='wander'; e.target=null; }
      else moveCircle(e, (e.target.x-e.x)/dt2*spd*0.9*dt, (e.target.y-e.y)/dt2*spd*0.9*dt, solidPx);
    } else {
      e.wt -= dt;
      if(e.wt<=0){ e.wt = rnd(1.5,4); e.wdir = rnd(0,Math.PI*2); e.moveT = rnd(0,1)<0.6 ? rnd(0.8,2):0; }
      if(e.moveT>0){ e.moveT-=dt; moveCircle(e, Math.cos(e.wdir)*e.t.spd*0.35*dt, Math.sin(e.wdir)*e.t.spd*0.35*dt, solidPx); }
    }
  }

  // 서로 밀어내기 (간단 해시)
  const cell = 48, hash = new Map();
  raid.enemies.forEach((e,i)=>{
    const k = Math.floor(e.x/cell)+','+Math.floor(e.y/cell);
    if(!hash.has(k)) hash.set(k,[]);
    hash.get(k).push(e);
  });
  for(const e of raid.enemies){
    const cx = Math.floor(e.x/cell), cy = Math.floor(e.y/cell);
    for(let oy=-1;oy<=1;oy++) for(let ox=-1;ox<=1;ox++){
      const arr = hash.get((cx+ox)+','+(cy+oy)); if(!arr) continue;
      for(const o of arr){
        if(o===e) continue;
        const d = dist(e.x,e.y,o.x,o.y), min = e.r+o.r;
        if(d>0 && d<min){
          const push = (min-d)*0.3, nx=(e.x-o.x)/d, ny=(e.y-o.y)/d;
          e.x += nx*push; e.y += ny*push;
        }
      }
    }
  }

  // 플레이어와 겹침 금지 — 몸으로 밀착해도 총구가 확보되도록 완전 분리
  for(const e of raid.enemies){
    const d = dist(e.x,e.y,player.x,player.y), min = e.r + player.r;
    if(d>0.01 && d<min){
      const nx = (e.x-player.x)/d, ny = (e.y-player.y)/d, push = min-d;
      e.x += nx*push*0.7; e.y += ny*push*0.7;
      moveCircle(player, -nx*push*0.3, -ny*push*0.3, solidPx);
    } else if(d<=0.01){ // 완전히 같은 위치면 임의 방향으로 분리
      e.x += rnd(-1,1)*min; e.y += rnd(-1,1)*min;
    }
  }

  // 밤 웨이브: 시야 밖에서 무리로 스폰 → 즉시 떼로 몰려옴
  const ph = phase();
  // 👑 밤 45초 후 황금미니 킹 등장 (보스 지역 한정, 레이드당 1회)
  if(ph==='night' && !raid.bossSpawned && nightSec()>45 && curRegion.boss){
    let bx=0, by=0, ok=false;
    for(let tries=0; tries<30 && !ok; tries++){
      const a=rnd(0,Math.PI*2), d0=rnd(600,850);
      bx = clamp(player.x+Math.cos(a)*d0, 2*TILE, (raid.w-2)*TILE);
      by = clamp(player.y+Math.sin(a)*d0, 2*TILE, (raid.h-2)*TILE);
      if(!solidPx(bx,by) && !houseAtPx(bx,by)) ok=true;
    }
    if(ok){
      raid.bossSpawned = true;
      spawnEnemy('kingduck', bx, by);
      raid.boss = raid.enemies[raid.enemies.length-1];
      // 알림 없음 — 돌아다니다가 우연히 마주쳐야 한다
    }
  }
  if(ph==='night' && raid.enemies.length < 140){
    raid.waveT -= dt;
    if(raid.waveT<=0){
      const ns = nightSec();
      raid.waveT = Math.max(1.8, 4.5 - ns/40);
      const n = Math.min(16, 5 + Math.floor(ns/15));
      // 시야 밖에서 걸을 수 있는 땅을 찾을 때까지 무리 지점 재시도
      let px0 = 0, py0 = 0, found = false;
      for(let tries=0; tries<24 && !found; tries++){
        const a = rnd(0,Math.PI*2), d0 = rnd(700,950);
        px0 = clamp(player.x+Math.cos(a)*d0, 2*TILE, (raid.w-2)*TILE);
        py0 = clamp(player.y+Math.sin(a)*d0, 2*TILE, (raid.h-2)*TILE);
        if(!solidPx(px0,py0) && !houseAtPx(px0,py0)) found = true;
      }
      if(found) for(let i=0;i<n;i++){
        let x = px0, y = py0;
        for(let tr=0; tr<4; tr++){ // 무리 내 개별 위치도 재시도
          const nx2 = clamp(px0+rnd(-85,85), 2*TILE, (raid.w-2)*TILE);
          const ny2 = clamp(py0+rnd(-85,85), 2*TILE, (raid.h-2)*TILE);
          if(!solidPx(nx2,ny2) && !houseAtPx(nx2,ny2)){ x=nx2; y=ny2; break; }
        }
        if(solidPx(x,y) || houseAtPx(x,y)) continue;
        const id = pickWeighted(curRegion.nightPool);
        spawnEnemy(id, x, y);
        raid.enemies[raid.enemies.length-1].state = 'chase'; // 스폰 즉시 추격
      }
    }
  } else if(ph==='dusk' && raid.enemies.length < 70){
    raid.waveT -= dt;
    if(raid.waveT<=0){
      raid.waveT = 5;
      for(let i=0;i<3;i++){
        const a = rnd(0,Math.PI*2), d = rnd(600,800);
        const x = clamp(player.x+Math.cos(a)*d, 2*TILE, (raid.w-2)*TILE);
        const y = clamp(player.y+Math.sin(a)*d, 2*TILE, (raid.h-2)*TILE);
        if(solidPx(x,y) || houseAtPx(x,y)) continue;
        spawnEnemy(pickWeighted(curRegion.pool), x, y);
      }
    }
  } else if(ph==='day' && raid.enemies.length<20){
    raid.trickleT -= dt;
    if(raid.trickleT<=0){
      raid.trickleT = 13;
      const a=rnd(0,Math.PI*2), d=rnd(500,800);
      const x=clamp(player.x+Math.cos(a)*d,2*TILE,(raid.w-2)*TILE);
      const y=clamp(player.y+Math.sin(a)*d,2*TILE,(raid.h-2)*TILE);
      if(!solidPx(x,y) && !houseAtPx(x,y)) spawnEnemy(pickWeighted(curRegion.pool),x,y);
    }
  }
}

function noiseEvent(x,y,r){
  raid.noises.push({x,y,r:20,maxR:r,t:0.5});
  for(const e of raid.enemies){
    if(dist(e.x,e.y,x,y)<r && e.state!=='chase'){
      e.state='invest'; e.target={x,y};
      if(phase()==='night' && Math.random()<0.6) e.state='chase';
    }
  }
}

function hurtPlayer(dmg){
  if(player.iframe>0 || raid.over) return;
  player.hp -= dmg;
  player.iframe = 0.6;
  shake = Math.min(14, shake+7);
  sfx('hurt');
  const rf = document.getElementById('redflash');
  rf.classList.remove('on'); void rf.offsetWidth; rf.classList.add('on');
  if(player.hp<=0){ player.hp=0; onDeath(); }
}

// ---------------- 사격 ----------------
function startReload(){
  const g = curGun();
  const st = gunStats(g);
  if(!g.body || player.reloading>0 || g.ammo>=st.ammo) return;
  player.reloading = st.reload;
  player.reloadTotal = st.reload;
  sfx('reload');
}
function updateShooting(dt){
  const g = curGun();
  const st = gunStats(g);
  player.fireCd -= dt; player.flash -= dt;
  player.swapT = Math.max(0, (player.swapT||0) - dt);
  if(player.reloading>0){
    player.reloading -= dt;
    if(player.reloading<=0){ g.ammo = st.ammo; player.reloading=0; }
  }
  g.ammo = Math.min(g.ammo, st.ammo);

  if(!mouse.down || panel || raid.over || !g.body || player.swapT>0) return;
  if(player.fireCd>0 || player.reloading>0) return;
  if(g.ammo<=0){ sfx('click'); startReload(); mouse.down=false; return; }

  player.fireCd = 60/st.rpm;
  g.ammo--;
  player.flash = 0.06;
  const rec = st.recoil||5;
  shake = Math.min(12, shake + 1 + rec*0.12);

  const moving = (keys.w||keys.a||keys.s||keys.d);
  const spreadDeg = Math.max(0.5, (st.spread + player.bloom)*(moving?1.5:1)*(1-0.4*player.aimT));
  const bd = g.body.def;
  const mx0 = player.x + Math.cos(player.ang)*(12+bd.bw*7.5);
  const my0 = player.y + Math.sin(player.ang)*(12+bd.bw*7.5);
  for(let p=0;p<st.pellets;p++){
    let a;
    if(st.pellets>1){ // 산탄: 부채꼴로 고르게 방사
      const tt = p/(st.pellets-1);
      a = player.ang + (tt-0.5)*spreadDeg*Math.PI/180 + (Math.random()-0.5)*0.03;
    } else {
      a = player.ang + (Math.random()-0.5)*spreadDeg*Math.PI/180;
    }
    raid.bullets.push({x:mx0,y:my0,vx:Math.cos(a)*760,vy:Math.sin(a)*760,dmg:st.dmg,life:0.95});
  }
  // 반동: 탄퍼짐 블룸 + 킥백 연출 + 뒤로 밀려남
  player.bloom = Math.min(24, player.bloom + rec*0.4);
  player.kick = 1;
  moveCircle(player, -Math.cos(player.ang)*rec*0.35, -Math.sin(player.ang)*rec*0.35, solidPx);
  noiseEvent(player.x,player.y,st.noise);
  if(st.noise>450) sfx('honk');
  else if(st.noise<120) sfx('silenced');
  else sfx('shoot');
}

// 상자/가구도 총알을 막음 (내구도 있음 — 부수면 내용물 증발)
function containerAt(x, y){
  for(const c of raid.containers){
    if(Math.abs(x-c.x)<16 && Math.abs(y-c.y)<15) return c;
  }
  return null;
}
function destroyContainer(c){
  const i = raid.containers.indexOf(c);
  if(i>=0) raid.containers.splice(i,1);
  for(let p=0;p<14;p++)
    raid.parts.push({x:c.x, y:c.y, vx:rnd(-130,130), vy:rnd(-130,130),
      t:rnd(.3,.65), c:c.ct.color, r:rnd(2,5)});
  sfx('break');
  noiseEvent(c.x, c.y, 200);
  if(panel && panel.type==='loot' && panel.data===c){
    closePanel();
  }
  toast('💥 '+c.ct.name+' 파괴 — 안의 물건도 박살났다');
}

function updateBullets(dt){
  for(let i=raid.bullets.length-1;i>=0;i--){
    const b = raid.bullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    let dead = b.life<=0 || shotSolidPx(b.x,b.y);
    if(!dead){
      const hc = containerAt(b.x,b.y);
      if(hc){
        dead = true;
        hc.hp -= b.dmg;
        raid.parts.push({x:b.x,y:b.y,vx:0,vy:0,t:0.15,c:'#c9a05a',r:2.5});
        if(hc.hp<=0) destroyContainer(hc);
      }
    }
    if(!dead){
      for(const e of raid.enemies){
        if(dist(b.x,b.y,e.x,e.y) < e.r+3){
          e.hp -= b.dmg; e.hitT = 0.1; e.state='chase';
          const kb = 60/Math.max(1,e.r/12);
          e.x += b.vx/760*kb*0.1; e.y += b.vy/760*kb*0.1;
          raid.dnums.push({x:e.x,y:e.y-e.r,txt:Math.round(b.dmg),t:0.7,c:'#ffd76a'});
          sfx('hit');
          if(e.hp<=0) killEnemy(e);
          dead = true; break;
        }
      }
    } else if(shotSolidPx(b.x,b.y)){
      raid.parts.push({x:b.x,y:b.y,vx:0,vy:0,t:0.15,c:'#ccc',r:2});
    }
    if(dead) raid.bullets.splice(i,1);
  }
  for(let i=raid.ebullets.length-1;i>=0;i--){
    const b = raid.ebullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    let dead = b.life<=0 || shotSolidPx(b.x,b.y) || !!containerAt(b.x,b.y); // 적탄은 막히기만 함
    if(!dead && dist(b.x,b.y,player.x,player.y)<player.r+(b.r||4)){
      hurtPlayer(b.dmg); dead = true;
    }
    if(dead) raid.ebullets.splice(i,1);
  }
}

// 폭발 (폭탄미니) — 플레이어·적 모두 피해
function explode(x, y){
  sfx('boom');
  shake = Math.min(20, shake+12);
  noiseEvent(x, y, 420);
  for(let i=0;i<26;i++)
    raid.parts.push({x, y, vx:rnd(-190,190), vy:rnd(-190,190), t:rnd(.3,.7),
      c:pick(['#ffb84a','#ff7a3a','#5a5a5a']), r:rnd(3,6)});
  const dp = dist(x,y,player.x,player.y);
  if(dp<85) hurtPlayer(Math.max(6, Math.round(22*(1-dp/110))));
  for(const o of raid.enemies.slice()){
    const d2 = dist(x,y,o.x,o.y);
    if(d2<85){ o.hp -= 40*(1-d2/110); if(o.hp<=0) killEnemy(o); }
  }
  // 폭발은 상자도 부순다 — 폭탄미니를 상자 근처에서 터뜨리지 말 것!
  for(const c of raid.containers.slice()){
    const d3 = dist(x,y,c.x,c.y);
    if(d3<95){ c.hp -= 60; if(c.hp<=0) destroyContainer(c); }
  }
}

function killEnemy(e){
  const i = raid.enemies.indexOf(e);
  if(i<0) return;
  raid.enemies.splice(i,1);
  player.kills++;
  sfx('kill');
  const q = State.quest;
  if(q && q.def.type==='kill' && q.prog<q.def.n && (q.def.enemy==='any' || q.def.enemy===e.id)){
    q.prog++;
    if(q.prog>=q.def.n) toast('📜 퀘스트 목표 달성! 케이브 창구로 돌아가세요');
  }
  for(let p=0;p<7;p++)
    raid.parts.push({x:e.x,y:e.y,vx:rnd(-80,80),vy:rnd(-80,80),t:rnd(0.3,0.6),c:e.t.color,r:rnd(2,4)});
  if(e.t.bomber){ explode(e.x, e.y); return; } // 폭탄미니는 죽어도 터짐 (드롭 없음)
  if(e.t.boss){
    raid.boss = null;
    if(raid.region) State.regionBoss[raid.region] = true; // 지역 보스 클리어 기록
    raid.drops.push({kind:'item', x:e.x, y:e.y, inst:mkInst('crown'), bob:rnd(0,6)});
    raid.drops.push({kind:'item', x:e.x-20, y:e.y+10, inst:mkInst(pick(LOOT_POOLS.rareAtt)), bob:rnd(0,6)});
    raid.drops.push({kind:'item', x:e.x+20, y:e.y+10, inst:mkInst(pick(LOOT_POOLS.rareAtt)), bob:rnd(0,6)});
    raid.drops.push({kind:'coin', x:e.x, y:e.y-14, v:rndi(150,250)});
    for(let p=0;p<20;p++)
      raid.parts.push({x:e.x,y:e.y,vx:rnd(-150,150),vy:rnd(-150,150),t:rnd(.4,.9),c:'#ffd24a',r:rnd(3,6)});
    toast('👑 황금미니 킹 격파!! 왕관을 손에 넣어라', 3200);
    sfx('extract');
    return;
  }
  // 드롭
  if(e.t.elite){
    raid.drops.push({kind:'item', x:e.x, y:e.y, inst:mkInst('golden_duck'), bob:rnd(0,6)});
    raid.drops.push({kind:'item', x:e.x-14, y:e.y+10, inst:mkInst(pick(LOOT_POOLS.rareAtt)), bob:rnd(0,6)});
    raid.drops.push({kind:'coin', x:e.x+10, y:e.y, v:rndi(40,80)});
    toast('🏆 황금미니 격파! ★ 희귀 부품을 떨어뜨렸다');
  } else {
    if(Math.random()<0.45) raid.drops.push({kind:'coin', x:e.x, y:e.y, v:rndi(3,12)});
    if(Math.random()<0.09){
      const id = pick(Math.random()<0.6 ? LOOT_POOLS.food : LOOT_POOLS.att);
      raid.drops.push({kind:'item', x:e.x, y:e.y, inst:mkInst(id), bob:rnd(0,6)});
    }
  }
}

function updateDrops(dt){
  player.lootMsgCd -= dt;
  for(let i=raid.drops.length-1;i>=0;i--){
    const d = raid.drops[i];
    const dp = dist(d.x,d.y,player.x,player.y);
    if(d.kind==='coin'){
      if(dp<80){ d.x = lerp(d.x,player.x,dt*8); d.y = lerp(d.y,player.y,dt*8); }
      if(dp<18){ player.coinsGained += Math.round(d.v * (raid.coinMul||1)); sfx('coin'); raid.drops.splice(i,1); }
    } else {
      if(dp<24){
        if(State.backpack.autoPlace(d.inst)){
          toast('획득: '+d.inst.def.emoji+' '+d.inst.def.name);
          sfx('pick');
          raid.drops.splice(i,1);
        } else if(player.lootMsgCd<=0){
          player.lootMsgCd = 2;
          toast('가방이 가득 찼습니다!');
        }
      }
    }
  }
}

// ---------------- 인터랙트 ----------------
function nearestInteractable(){
  if(scene==='cave'){
    let best=null, bd=70;
    for(const s of caveMap.stations){
      const d = dist(player.x,player.y,s.x,s.y);
      if(d<bd){ bd=d; best=s; }
    }
    return best;
  }
  let best=null, bd=64;
  for(const c of raid.containers){
    if(houseAtPx(c.x,c.y)!==raid.inside) continue; // 벽/지붕 너머 상자는 못 염
    const d = dist(player.x,player.y,c.x,c.y);
    if(d<bd){ bd=d; best=c; }
  }
  return best;
}
function tryInteract(){
  const t = nearestInteractable();
  if(!t) return;
  sfx('open');
  if(scene==='cave') openPanel(t.panel);
  else {
    if(!t.inv) fillContainer(t);
    t.opened = true;
    openPanel('loot', t);
  }
}
function clickInteract(sx, sy){
  const wx = cam.x + (sx - W/2)/ZOOM, wy = cam.y + (sy - H/2)/ZOOM;
  if(scene==='cave'){
    for(const s of caveMap.stations){
      if(Math.abs(wx-s.x)<30 && Math.abs(wy-s.y)<30 && dist(player.x,player.y,s.x,s.y)<80){
        sfx('open'); openPanel(s.panel); return true;
      }
    }
    return false;
  }
  for(const c of raid.containers){
    if(houseAtPx(c.x,c.y)!==raid.inside) continue;
    if(Math.abs(wx-c.x)<22 && Math.abs(wy-c.y)<22 && dist(player.x,player.y,c.x,c.y)<70){
      if(!c.inv) fillContainer(c);
      c.opened = true;
      sfx('open'); openPanel('loot', c);
      return true;
    }
  }
  return false;
}

function quickHeal(){
  const missing = maxHp()-player.hp;
  if(missing<=0){ toast('체력이 가득 찼습니다'); return; }
  const foods = State.backpack.items.filter(it=>it.inst.def.kind==='food')
    .sort((a,b)=>a.inst.def.heal-b.inst.def.heal);
  if(!foods.length){ toast('먹을 것이 없다!'); return; }
  let chosen = foods.find(f=>f.inst.def.heal>=missing) || foods[foods.length-1];
  eatItem(chosen.inst);
}
function eatItem(inst){
  State.backpack.remove(inst);
  player.hp = Math.min(maxHp(), player.hp + inst.def.heal);
  sfx('eat');
  toast(inst.def.emoji+' '+inst.def.name+' 사용! 체력 +'+inst.def.heal);
  refreshPanel();
}

// ---------------- 퀵슬롯 ----------------
function eatSlot(i){
  const it = State.qslots[i];
  if(!it) return;
  if(player.hp >= maxHp()){ toast('체력이 가득 찼습니다'); return; }
  player.hp = Math.min(maxHp(), player.hp + it.def.heal);
  State.qslots[i] = null;
  sfx('eat');
  toast(it.def.emoji+' '+it.def.name+' 사용! 체력 +'+it.def.heal);
  renderQslots();
}
function renderQslots(){
  document.querySelectorAll('#qslots .qslot').forEach((el,i)=>{
    const it = State.qslots[i];
    el.classList.toggle('filled', !!it);
    el.querySelector('.qs-emoji').textContent = it ? it.def.emoji : '';
    el.querySelector('.qs-heal').textContent = it ? '+'+it.def.heal : '';
  });
}
function refreshQslotZones(){
  dropZones = dropZones.filter(z=>z.kind!=='qslot');
  document.querySelectorAll('#qslots .qslot').forEach((el,i)=>{
    dropZones.push({el, kind:'qslot', i});
  });
}
function setupQslots(){
  document.querySelectorAll('#qslots .qslot').forEach((el,i)=>{
    el.addEventListener('mousedown', e=>{
      if(e.button!==0) return;
      const it = State.qslots[i];
      if(!it) return;
      e.preventDefault();
      armDrag(it, {kind:'qslot', i}, e, CS);
    });
    el.addEventListener('click', ()=>{ if(!Drag.recent) eatSlot(i); });
    el.addEventListener('mouseenter', e=>{
      const it = State.qslots[i];
      if(it && !Drag.active) showTip(it.def, e.clientX, e.clientY);
    });
    el.addEventListener('mouseleave', hideTip);
  });
}

// ---------------- 탈출 / 사망 ----------------
function onExtract(){
  raid.over = true;
  State.coins += player.coinsGained;
  // 탈출 전 잠긴 지역 → 탈출 기록 후 새로 열린 지역 감지
  const wasLocked = REGION_ORDER.filter(id=>!regionUnlocked(id));
  const rid = raid.region;
  State.regionExtracts[rid] = (State.regionExtracts[rid]||0) + 1;
  const newly = wasLocked.filter(id=>regionUnlocked(id));
  const q = State.quest;
  if(q && q.def.type==='extract' && q.prog<q.def.n){
    q.prog++;
    if(q.prog>=q.def.n) toast('📜 퀘스트 목표 달성! 창구에서 보고하세요');
  }
  sfx('extract');
  mouse.down = false;
  openPanel('extract', {newly});
  saveGame();
}
// 지역이 열렸는지 (조건 실시간 판정)
function regionUnlocked(id){
  const rg = REGIONS[id];
  if(!rg || !rg.unlock) return true; // 조건 없으면 항상 열림
  const u = rg.unlock;
  if(u.extracts){
    for(const [reg, cnt] of Object.entries(u.extracts))
      if((State.regionExtracts[reg]||0) < cnt) return false;
    return true;
  }
  if(u.boss) return !!State.regionBoss[u.boss];
  return true;
}
function onDeath(){
  raid.over = true;
  closePanel();
  sfx('death');
  // 가방·퀵슬롯·장착 총까지 전부 그 자리에 떨어뜨림 → 다음 출격에서 1회 한정 회수
  const cacheItems = [];
  const lost = [];
  for(const it of State.backpack.items){
    cacheItems.push({d:it.inst.def.id, r:it.inst.rot});
    lost.push(it.inst.def.emoji+' '+it.inst.def.name);
  }
  for(const s of State.qslots){
    if(s){ cacheItems.push({d:s.def.id, r:0}); lost.push(s.def.emoji+' '+s.def.name); }
  }
  for(const g of State.guns){
    if(g.body){ cacheItems.push({d:g.body.def.id, r:0}); lost.push(g.body.def.emoji+' '+g.body.def.name); }
    for(const m of g.atts) cacheItems.push({d:m.inst.def.id, r:0});
    g.body = null; g.atts = []; g.ammo = 0;
  }
  State.backpack.items = [];
  State.qslots = [null,null,null];
  State.activeGun = 0;
  State.deathCache = cacheItems.length
    ? {items:cacheItems, x:Math.round(player.x), y:Math.round(player.y)} : null;
  renderQslots();
  // 몸통이 하나도 없으면 창구에서 무료 지급받도록 안내 (자동 지급 X)
  const needBody = !hasAnyBody();
  openPanel('death', {lost, needBody});
  saveGame();
}
// 창고/가방/장착 총 어디든 총기 몸통이 하나라도 있는지
function hasAnyBody(){
  return State.guns.some(g=>g.body)
    || State.storage.items.some(i=>i.inst.def.kind==='body')
    || State.backpack.items.some(i=>i.inst.def.kind==='body');
}
function returnToCave(){
  scene = 'cave';
  raid = null;
  player.x = 11*TILE; player.y = 8*TILE;
  player.hp = maxHp();
  closePanel();
  saveGame();
}
function startRaid(){
  closePanel();
  buildRaid();
  scene = 'raid';
  toast('🚩 표시된 탈출 지점으로 이동해 탈출하세요. 밤이 되면... 조심하세요.');
}

// ---------------- 패널 UI ----------------
let panel = null;
let searchT = 0; // 루팅 조사 타이머
const panelRoot = document.getElementById('panel-root');

function openPanel(type, data){
  cancelDrag();
  panel = {type, data};
  if(type==='loot') searchT = 1; // 첫 식별은 1초 뒤
  renderPanel();
}
function closePanel(){
  cancelDrag();
  hideTip();
  panel = null;
  dropZones = [];
  refreshQslotZones();
  panelRoot.classList.add('hidden');
  panelRoot.innerHTML = '';
  if(scene==='cave') saveGame();
}
function refreshPanel(){ if(panel) renderPanel(); updateHud(); }

function renderPanel(){
  dropZones = [];
  hideTip();
  panelRoot.classList.remove('hidden');
  panelRoot.innerHTML = '';
  const p = document.createElement('div');
  p.className = 'panel';
  panelRoot.appendChild(p);
  const t = panel.type;

  if(t==='loot'){
    const c = panel.data;
    p.classList.add('wide');
    p.innerHTML = `
      <div class="panel-title">${c.ct.emoji} ${c.ct.name}</div>
      <div class="panel-cols">
        <div class="col"><div class="col-label">${c.ct.name} <button class="btn mini" id="takeall">📥 모두 담기</button></div><div id="ga"></div></div>
        <div class="col"><div class="col-label">🎒 내 가방</div><div id="gb"></div></div>
      </div>
      <div class="panel-hint">드래그 이동 · <b>R</b> 회전 · <b>더블클릭</b> 빠른 이동 · <b>WASD/ESC</b> 닫기<br>
      <span class="warn">🔍 창을 열어둔 동안 2초마다 하나씩 식별 · ⚠️ 그동안에도 적은 다가온다!</span></div>`;
    renderGrid(p.querySelector('#ga'), c.inv, { rerender:refreshPanel, quickTarget:State.backpack, onDbl:inst=>{ quickTransfer(inst,c.inv,State.backpack); refreshPanel(); } });
    renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, quickTarget:c.inv, onDbl:inst=>{
      if(inst.def.kind==='food') eatItem(inst);
      else { quickTransfer(inst,State.backpack,c.inv); refreshPanel(); }
    }});
    p.querySelector('#takeall').addEventListener('click', ()=>{
      let left = 0, searching = 0;
      for(const it of c.inv.items.slice()){
        if(it.inst.hidden){ searching++; continue; }
        if(State.backpack.autoPlace(it.inst)) c.inv.remove(it.inst);
        else left++;
      }
      if(left>0) toast('가방 공간 부족! '+left+'개를 못 담았습니다');
      else if(searching>0) toast('🔍 '+searching+'개는 아직 조사 중');
      sfx('pick');
      refreshPanel();
    });
  }
  else if(t==='bag'){
    p.innerHTML = `
      <div class="panel-title">🎒 내 가방 <span class="sub">(가치 ${State.backpack.totalValue()}🪙)</span></div>
      <div class="panel-cols">
        <div class="col"><div id="gb"></div></div>
        <div class="col stats-col" id="gs"></div>
      </div>
      <div class="panel-hint"><b>더블클릭</b> 음식 사용 · <b>R</b> 회전 · <b>Tab/ESC</b> 닫기</div>`;
    renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, onDbl:inst=>{
      if(inst.def.kind==='food' && scene==='raid') eatItem(inst);
    }});
    p.querySelector('#gs').innerHTML = statsHTML(curGun());
  }
  else if(t==='storage'){
    p.classList.add('wide');
    p.innerHTML = `
      <div class="panel-title">📦 창고 <span class="sub">🪙 ${State.coins}</span></div>
      <div class="panel-cols">
        <div class="col"><div class="col-label">창고 <button class="btn mini" id="sortA">🧹 정리</button></div><div id="ga"></div></div>
        <div class="col"><div class="col-label">🎒 내 가방 <button class="btn mini" id="sortB">🧹 정리</button> <button class="btn mini" id="tostoreS">📦 전부 창고로</button></div><div id="gb"></div>
          <div class="sell-bin" id="sell">🪙 판매함<br><span>아이템을 끌어다 놓으면 판매</span></div>
        </div>
      </div>
      <div class="panel-hint">드래그 이동 · <b>R</b> 회전 · <b>더블클릭</b> 빠른 이동 · <b>ESC</b> 닫기</div>`;
    renderGrid(p.querySelector('#ga'), State.storage, { rerender:refreshPanel, quickTarget:State.backpack, onDbl:inst=>{ quickTransfer(inst,State.storage,State.backpack); refreshPanel(); } });
    renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, quickTarget:State.storage, onDbl:inst=>{ quickTransfer(inst,State.backpack,State.storage); refreshPanel(); } });
    dropZones.push({el: p.querySelector('#sell'), kind:'sell'});
    p.querySelector('#sortA').addEventListener('click', ()=>{ repackInv(State.storage); sfx('drop'); refreshPanel(); });
    p.querySelector('#sortB').addEventListener('click', ()=>{ repackInv(State.backpack); sfx('drop'); refreshPanel(); });
    p.querySelector('#tostoreS').addEventListener('click', ()=>{
      let left = 0;
      for(const it of State.backpack.items.slice()){
        if(State.storage.autoPlace(it.inst)) State.backpack.remove(it.inst);
        else left++;
      }
      if(left>0) toast('창고 공간 부족! '+left+'개 남음');
      sfx('drop'); refreshPanel();
    });
  }
  else if(t==='bench'){
    if(!State.gun2) benchIdx = 0;
    p.classList.add('xwide');
    p.innerHTML = `
      <div class="panel-title">🛠️ 총기 작업대
        <span class="bench-tabs">
          <button class="btn mini tab ${benchIdx===0?'on':''}" data-tab="0">🔫 총기 1</button>
          <button class="btn mini tab ${benchIdx===1?'on':''} ${State.gun2?'':'locked'}" data-tab="1">${State.gun2?'🔫':'🔒'} 총기 2</button>
        </span>
      </div>
      <div class="panel-cols bench-cols">
        <div class="col"><div class="col-label">창고</div><div id="ga"></div></div>
        <div class="col bench-col"><div id="bench"></div><div class="col stats-col" id="gs"></div></div>
        <div class="col"><div class="col-label">🎒 내 가방 <button class="btn mini" id="tostore">📦 전부 창고로</button></div><div id="gb"></div></div>
      </div>
      <div class="panel-hint">몸통/부착물을 <b>드래그</b>해서 조립 · 드래그 중 <b>R</b> 회전 ·
      맞는 소켓에 <b>1칸만 걸쳐도</b> 장착 · <b>더블클릭/Ctrl(⌘)+클릭</b>으로 창고↔가방 즉시 이동 · <b>ESC</b> 닫기</div>`;
    renderGrid(p.querySelector('#ga'), State.storage, { cs:36, rerender:refreshPanel, quickTarget:State.backpack, onDbl:inst=>{ quickTransfer(inst,State.storage,State.backpack); refreshPanel(); } });
    renderGrid(p.querySelector('#gb'), State.backpack, { cs:36, rerender:refreshPanel, quickTarget:State.storage, onDbl:inst=>{ quickTransfer(inst,State.backpack,State.storage); refreshPanel(); } });
    renderBench(p.querySelector('#bench'));
    p.querySelector('#gs').innerHTML = statsHTML(editGun());
    p.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>{
      const i = +b.dataset.tab;
      if(i===1 && !State.gun2){ toast('🔒 퀘스트 「이도류 면허」를 완료하면 해금됩니다'); return; }
      benchIdx = i; refreshPanel();
    }));
    p.querySelector('#tostore').addEventListener('click', ()=>{
      let left = 0;
      for(const it of State.backpack.items.slice()){
        if(State.storage.autoPlace(it.inst)) State.backpack.remove(it.inst);
        else left++;
      }
      if(left>0) toast('창고 공간 부족! '+left+'개 남음');
      sfx('drop'); refreshPanel();
    });
  }
  else if(t==='board'){
    let rows = '';
    for(const key in UPGRADES){
      const u = UPGRADES[key];
      const cur = State.up[key], next = u.tiers[cur+1];
      const afford = next && State.coins>=next.cost && matsOK(next.mats);
      rows += `<div class="up-row">
        <span class="up-emoji">${u.emoji}</span>
        <span class="up-name">${u.name}<br><small>${u.desc(u.tiers[cur])}${next? ' → '+u.desc(next):''}</small>
          ${next ? matsHTML(next.mats) : ''}</span>
        ${next ? `<button class="btn" data-up="${key}" ${afford?'':'disabled'}>${next.cost}🪙</button>`
               : '<span class="up-max">MAX</span>'}
      </div>`;
    }
    p.innerHTML = `
      <div class="panel-title">📌 업그레이드 <span class="sub">🪙 ${State.coins}</span></div>
      <div class="up-list">${rows}</div>
      <div class="panel-hint">재료 아이템은 창고/가방에서 자동 차감됩니다 · <b>ESC</b> 닫기</div>`;
    p.querySelectorAll('[data-up]').forEach(btn=>{
      btn.addEventListener('click', ()=>buyUpgrade(btn.dataset.up));
    });
  }
  else if(t==='quest'){
    const q = State.quest;
    let body = '';
    const noEquipped = State.guns.every(g=>!g.body);   // 장착된 총이 없음
    const noBody = !hasAnyBody();                        // 어디에도 몸통이 없음
    if(noBody){
      // 정말 총이 하나도 없음 → 감자 권총 무료 지급
      body += `<div class="quest-card relief">
        <div class="npc-line">"또 빈손으로 왔군... 이거라도 받아가라. 다음엔 조심해."</div>
        <div class="q-title">🥔 감자 권총 지급</div>
        <div class="q-desc">총기 몸통을 모두 잃었을 때 창구에서 무료로 받을 수 있다.</div>
        <div class="q-btns"><button class="btn" id="relief">받기</button></div>
      </div>`;
    } else if(noEquipped){
      // 슬롯은 비었지만 창고/가방에 몸통 있음 → 작업대 안내
      body += `<div class="quest-card relief">
        <div class="npc-line">"총은 있는데 안 들고 왔구먼. 작업대에서 챙겨 가."</div>
        <div class="q-title">🔧 장착 안내</div>
        <div class="q-desc">창고에 총 몸통이 있다. <b>작업대</b>에서 몸통을 슬롯에 끌어다 장착하면 된다.</div>
      </div>`;
    }
    if(q){
      const d = q.def, pr = questProg(q), can = questCanComplete(q);
      body += `<div class="npc-line">"${can ? pick(NPC_LINES.done) : pick(NPC_LINES.busy)}"</div>
        <div class="quest-card">
          <div class="q-title">📜 ${d.title}</div>
          <div class="q-desc">${questDesc(d)} — <b>${pr}/${d.n}</b>${pr>=d.n?' ✔':''}</div>
          ${questFetchLine(d)}
          <div class="q-reward">보상: ${d.reward}🪙${d.rewardItem?` + <span class="q-item" data-item="${d.rewardItem}">${ITEMS[d.rewardItem].emoji} ${ITEMS[d.rewardItem].name}</span>`:''}</div>
          <div class="q-btns">
            ${can?'<button class="btn" id="qdone">완료 보고</button>':''}
            <button class="btn danger" id="qdrop">포기</button>
          </div>
        </div>`;
    } else {
      ensureOffers();
      body += `<div class="npc-line">"${pick(NPC_LINES.greet)}"</div>` +
        State.questOffers.map((d,i)=>`
        <div class="quest-card">
          <div class="q-title">📜 ${d.title}</div>
          <div class="q-desc">${questDesc(d)}</div>
          ${d.fetch?`<div class="q-desc">+ 납품: <span class="q-item" data-item="${d.fetch.item}">${ITEMS[d.fetch.item].emoji} ${ITEMS[d.fetch.item].name}</span> ${d.fetch.n}개</div>`:''}
          <div class="q-reward">보상: ${d.reward}🪙${d.rewardItem?` + <span class="q-item" data-item="${d.rewardItem}">${ITEMS[d.rewardItem].emoji} ${ITEMS[d.rewardItem].name}</span>`:''}</div>
          <div class="q-btns"><button class="btn" data-q="${i}">수락</button></div>
        </div>`).join('');
    }
    p.innerHTML = `
      <div class="panel-title">📜 퀘스트 창구 <span class="sub">완료 ${State.questsDone||0}건</span></div>
      <div class="quest-body">${body}</div>
      <div class="panel-hint">한 번에 하나의 의뢰만 수행 가능 · 납품은 창고/가방에서 자동 차감 · <b>ESC</b> 닫기</div>`;
    if(q){
      const qd = p.querySelector('#qdone');
      if(qd) qd.addEventListener('click', completeQuest);
      p.querySelector('#qdrop').addEventListener('click', ()=>{
        State.quest = null; toast('의뢰를 포기했습니다'); saveGame(); refreshPanel();
      });
    } else {
      p.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click', ()=>acceptQuest(+b.dataset.q)));
    }
    const rb = p.querySelector('#relief');
    if(rb) rb.addEventListener('click', ()=>{
      if(hasAnyBody()) return;
      const slot = State.guns.find(g=>!g.body) || State.guns[0];
      slot.body = mkInst('potato_pistol');
      sfx('mount');
      toast('🥔 감자 권총을 받았다. 다음엔 조심하자!');
      saveGame();
      refreshPanel();
    });
  }
  else if(t==='deploy'){
    p.classList.add('wide');
    const cards = REGION_ORDER.map(id=>{
      const rg = REGIONS[id];
      const unlocked = regionUnlocked(id);
      const stars = '★'.repeat(rg.stars) + '☆'.repeat(4-rg.stars);
      const ext = State.regionExtracts[id]||0;
      const bossClear = State.regionBoss[id];
      const sel = State.region===id ? ' sel' : '';
      return `<div class="region-card${unlocked?'':' locked'}${sel}" data-region="${id}">
        <div class="rg-emoji">${rg.emoji}</div>
        <div class="rg-info">
          <div class="rg-name">${rg.name} <span class="rg-stars">${stars}</span></div>
          <div class="rg-desc">${rg.desc}</div>
          <div class="rg-stat">🪙 보상 ×${rg.coinMul} · ☀️ 낮 ${rg.dayLen}초${rg.boss?' · 👑 보스':''} · 탈출 ${ext}회${bossClear?' · 👑✔':''}</div>
          ${unlocked ? '' : `<div class="rg-lock">🔒 ${rg.unlockDesc||'잠김'}</div>`}
        </div>
      </div>`;
    }).join('');
    p.innerHTML = `
      <div class="panel-title">🚪 출격 — 지역 선택</div>
      <div class="region-list">${cards}</div>
      <p class="deploy-tips">🚩 탈출구를 직접 찾아 3초 대기 · 💀 죽으면 가방·장착 총·주운 코인 상실(창고는 안전)</p>
      <button class="btn big" id="go" ${regionUnlocked(State.region)?'':'disabled'}>${REGIONS[State.region].emoji} ${REGIONS[State.region].name} 출격! 🚀</button>
      <div class="panel-hint">지역을 클릭해 선택 · <b>ESC</b> 닫기</div>`;
    p.querySelectorAll('.region-card').forEach(c=>{
      c.addEventListener('click', ()=>{
        const id = c.dataset.region;
        if(!regionUnlocked(id)){ toast('🔒 '+(REGIONS[id].unlockDesc||'아직 잠긴 지역')); return; }
        State.region = id; sfx('click'); saveGame(); refreshPanel();
      });
    });
    p.querySelector('#go').addEventListener('click', ()=>{
      if(!regionUnlocked(State.region)) return;
      startRaid();
    });
  }
  else if(t==='extract'){
    const newly = (panel.data && panel.data.newly) || [];
    const unlockHtml = newly.length ? newly.map(id=>
      `<p class="rg-unlocked">🎉 새 지역 해금: <b>${REGIONS[id].emoji} ${REGIONS[id].name}</b>!</p>`).join('') : '';
    p.innerHTML = `
      <div class="panel-title">✅ 탈출 성공!</div>
      <div class="deploy-body">
        ${unlockHtml}
        <p>🪙 주운 코인: <b>${player.coinsGained}</b></p>
        <p>🎒 가져온 물건 가치: <b>${State.backpack.totalValue()}</b> (창고에서 판매 가능)</p>
        <p>💀 처치: <b>${player.kills}</b></p>
        <button class="btn big" id="home">케이브로 돌아가기 🏠</button>
      </div>`;
    p.querySelector('#home').addEventListener('click', returnToCave);
  }
  else if(t==='death'){
    const lost = panel.data.lost;
    p.innerHTML = `
      <div class="panel-title dead">💀 사망...</div>
      <div class="deploy-body">
        <p>총과 가방을 모두 그 자리에 떨어뜨렸다:</p>
        <p class="lost-list">${lost.length? lost.join(', ') : '(없음)'}</p>
        <p>💀 <b>다음 출격</b>에서 쓰러진 자리를 찾아가면 회수할 수 있다.<br>
        <small>단 한 번뿐 — 그 판에 못 찾으면 영영 사라진다. 창고는 무사하다.</small></p>
        ${panel.data.needBody ? '<p>🔫 총기 몸통이 하나도 없다. <b>퀘스트 창구</b>에 들러라 (❗ 표시).</p>' : ''}
        <button class="btn big" id="home">케이브로 돌아가기 🏠</button>
      </div>`;
    p.querySelector('#home').addEventListener('click', returnToCave);
  }
  else if(t==='help'){
    p.innerHTML = `
      <div class="panel-title">🎀 EZKov — 조작법</div>
      <div class="help-body">
        <div><b>WASD</b> 이동 · <b>마우스</b> 조준 · <b>좌클릭</b> 사격 · <b>우클릭(꾹)</b> 정조준(줌)</div>
        <div><b>E</b> 상자·기물 열기 (클릭은 사격 전용) · <b>Tab</b> 가방 · <b>R</b> 재장전 / (드래그 중) 회전</div>
        <div><b>Q</b> 빠른 회복 · <b>더블클릭</b> 빠른 이동/음식 사용 · <b>H</b> 도움말</div>
        <div><b>Shift</b> 질주(스태미너 소모) · <b>1·2</b> 총기 교체 · <b>3·4·5</b> 퀵슬롯 음식 · 아이템 <b>호버</b>로 설명</div>
        <div>음식을 화면 하단 <b>퀵슬롯에 드래그</b>해 두면 전투 중 바로 먹을 수 있습니다</div>
        <hr>
        <div>🔫 <b>작업대</b>에서 부품을 조립하세요. 드래그 중 <b>R</b>로 회전 — 세로로 세우면 레일 1칸만 차지!</div>
        <div>🌙 밤이 되면 미니 떼가 몰려옵니다. 그 전에 🚩 탈출 지점으로!</div>
        <div>🌳 나무 수풀에 숨으면 적이 잘 못 봅니다 · 📜 케이브 창구에서 의뢰를 받아 보상을 챙기세요</div>
        <div>📢 시끄러운 총은 적을 부릅니다. 소음기를 고려하세요.</div>
        <div class="help-btns">
          <button class="btn big" id="ok">알겠다! 🎀</button>
          <button class="btn danger" id="wipe">🗑️ 처음부터</button>
        </div>
      </div>`;
    p.querySelector('#ok').addEventListener('click', ()=>{ State.seenHelp=true; closePanel(); saveGame(); });
    p.querySelector('#wipe').addEventListener('click', ()=>{
      if(confirm('저장 데이터를 모두 지우고 처음부터 시작할까요?')){
        localStorage.removeItem('quackscape_save');
        location.reload();
      }
    });
  }

  // 아이템 언급(재료 칩·퀘스트 납품/보상)에 호버 툴팁 연결
  p.querySelectorAll('[data-item]').forEach(el=>{
    const def = ITEMS[el.dataset.item];
    if(def) attachTip(el, def);
  });

  // 닫기 버튼 (모달 아닌 것들)
  if(!['extract','death','help'].includes(t)){
    const x = document.createElement('button');
    x.className = 'panel-close'; x.textContent = '✕';
    x.addEventListener('click', closePanel);
    p.appendChild(x);
  }
  refreshQslotZones(); // 퀵슬롯은 패널 위에서도 드롭 가능
}

function buyUpgrade(key){
  const u = UPGRADES[key];
  const next = u.tiers[State.up[key]+1];
  if(!next || State.coins<next.cost || !matsOK(next.mats)) return;
  for(const [id,n] of (next.mats||[])) consumeItem(id, n);
  State.coins -= next.cost;
  State.up[key]++;
  if(key==='pack'){
    const nb = new Inv(next.w, next.h);
    for(const it of State.backpack.items) nb.autoPlace(it.inst);
    State.backpack = nb;
  }
  if(key==='store'){
    const ns = new Inv(next.w, next.h);
    for(const it of State.storage.items) ns.autoPlace(it.inst);
    State.storage = ns;
  }
  if(key==='hp') player.hp = maxHp();
  sfx('coin');
  toast(u.name+' 업그레이드 완료!');
  saveGame();
  refreshPanel();
}

// ---------------- 아이템 재료 헬퍼 ----------------
function countItem(id){
  let c = 0;
  for(const inv of [State.storage, State.backpack])
    c += inv.items.filter(it=>it.inst.def.id===id).length;
  return c;
}
function consumeItem(id, n){
  for(const inv of [State.storage, State.backpack]){
    for(const it of inv.items.slice()){
      if(n<=0) return true;
      if(it.inst.def.id===id){ inv.remove(it.inst); n--; }
    }
  }
  return n<=0;
}
function matsOK(mats){
  return (mats||[]).every(([id,n])=>countItem(id)>=n);
}
function matsHTML(mats){
  if(!mats || !mats.length) return '';
  return '<span class="up-mats">'+mats.map(([id,n])=>{
    const have = countItem(id), ok = have>=n;
    return `<span class="${ok?'ok':'lack'}" data-item="${id}">${ITEMS[id].emoji}${have}/${n}</span>`;
  }).join('')+'</span>';
}

// ---------------- 퀘스트 ----------------
function questDesc(d){
  if(d.type==='kill') return (d.enemy==='any' ? '아무 미니나' : ENEMY_TYPES[d.enemy].name)+' '+d.n+'마리 처치';
  if(d.type==='fetch') return `<span class="q-item" data-item="${d.item}">${ITEMS[d.item].emoji} ${ITEMS[d.item].name}</span> ${d.n}개 납품`;
  return d.n+'회 생존 탈출';
}
function questProg(q){
  if(q.def.type==='fetch'){
    let cnt = 0;
    for(const inv of [State.backpack, State.storage])
      cnt += inv.items.filter(it=>it.inst.def.id===q.def.item).length;
    return Math.min(cnt, q.def.n);
  }
  return Math.min(q.prog, q.def.n);
}
function questCanComplete(q){
  return questProg(q) >= q.def.n
    && (!q.def.fetch || countItem(q.def.fetch.item) >= q.def.fetch.n);
}
// 부가 납품 조건 표시줄
function questFetchLine(d){
  if(!d.fetch) return '';
  const have = Math.min(countItem(d.fetch.item), d.fetch.n);
  const ok = have>=d.fetch.n;
  return `<div class="q-desc">+ 납품: <span class="q-item" data-item="${d.fetch.item}">${ITEMS[d.fetch.item].emoji} ${ITEMS[d.fetch.item].name}</span> — <b>${have}/${d.fetch.n}</b>${ok?' ✔':''}</div>`;
}
function ensureOffers(){
  if(State.questOffers && State.questOffers.length) return;
  const pool = QUESTS.filter(q=>!q.unlock); // 해금 퀘스트는 아래에서 별도 처리
  const offers = [];
  // 총기 슬롯 2 해금 퀘스트: 의뢰 2건 완료 후 미해금 상태면 반드시 제안
  const lic = QUESTS.find(q=>q.unlock==='gun2');
  if(lic && !State.gun2 && (State.questsDone||0)>=2) offers.push({...lic});
  while(offers.length<2 && pool.length){
    const q = {...pool.splice(Math.floor(Math.random()*pool.length),1)[0]};
    q.reward = Math.round(q.reward*(1+(State.questsDone||0)*0.15));
    offers.push(q);
  }
  State.questOffers = offers;
  saveGame();
}
function acceptQuest(i){
  if(State.quest || !State.questOffers || !State.questOffers[i]) return;
  State.quest = { def: State.questOffers[i], prog: 0 };
  State.questOffers = null;
  sfx('open');
  toast('📜 의뢰 수락: '+State.quest.def.title);
  saveGame(); refreshPanel();
}
function completeQuest(){
  const q = State.quest;
  if(!q || !questCanComplete(q)) return;
  const d = q.def;
  if(d.type==='fetch'){
    if(!consumeItem(d.item, d.n)){ toast('납품할 아이템이 부족합니다!'); return; }
  }
  if(d.fetch){
    if(!consumeItem(d.fetch.item, d.fetch.n)){ toast('납품할 아이템이 부족합니다!'); return; }
  }
  State.coins += d.reward;
  if(d.rewardItem){
    const inst = mkInst(d.rewardItem);
    if(!State.storage.autoPlace(inst)) State.backpack.autoPlace(inst);
    toast('보상 획득: '+ITEMS[d.rewardItem].emoji+' '+ITEMS[d.rewardItem].name);
  }
  if(d.unlock==='gun2'){
    State.gun2 = true;
    toast('🔫 총기 슬롯 2 해금! 작업대에서 조립하고 1·2키로 교체하세요');
  }
  State.questsDone = (State.questsDone||0)+1;
  State.quest = null;
  State.questOffers = null;
  sfx('extract');
  toast('📜 퀘스트 완료! +'+d.reward+'🪙');
  saveGame(); refreshPanel();
}

// ---------------- 카메라 ----------------
const cam = {x:0, y:0};
let shake = 0;

// ---------------- 업데이트 ----------------
let last = performance.now();
function update(dt){
  const st = gunStats(State.gun);

  // 이동
  let vx=0, vy=0;
  if(!panel){
    if(keys.w) vy-=1; if(keys.s) vy+=1;
    if(keys.a) vx-=1; if(keys.d) vx+=1;
  }
  // 스태미너 & 질주
  const wantSprint = keys.shift && (vx||vy) && player.aimT<0.3;
  const sprinting = wantSprint && player.stam>0 && !player.exhausted;
  if(sprinting){
    player.stam -= 30*dt;
    if(player.stam<=0){ player.stam=0; player.exhausted=true; toast('헉헉... 지쳤다!'); }
  } else {
    player.stam = Math.min(stamMax(), player.stam + ((vx||vy)?13:22)*dt);
    if(player.exhausted && player.stam>=stamMax()*0.35) player.exhausted=false;
  }
  if(vx||vy){
    const l = Math.hypot(vx,vy);
    const spd = moveSpd() * (player.aimT>0.3 ? 0.6 : 1) * (sprinting?1.5:1);
    const solidFn = scene==='cave' ? caveSolidPx : solidPx;
    moveCircle(player, vx/l*spd*dt, vy/l*spd*dt, solidFn);
  }

  // 조준
  if(!panel){
    const wx = cam.x + (mouse.x - W/2)/ZOOM, wy = cam.y + (mouse.y - H/2)/ZOOM;
    player.ang = Math.atan2(wy-player.y, wx-player.x);
  }
  const aimSpd = 3*st.aim;
  player.aimT = mouse.rdown && !panel
    ? Math.min(1, player.aimT + dt*aimSpd)
    : Math.max(0, player.aimT - dt*5);

  // 카메라
  const camShift = player.aimT * (50 + 70*(st.zoom-1));
  const tx = player.x + Math.cos(player.ang)*camShift;
  const ty = player.y + Math.sin(player.ang)*camShift;
  cam.x = lerp(cam.x, tx, Math.min(1, dt*7));
  cam.y = lerp(cam.y, ty, Math.min(1, dt*7));
  shake = Math.max(0, shake - dt*40);

  player.iframe -= dt;
  player.bloom = Math.max(0, player.bloom - dt*14);
  player.kick = Math.max(0, player.kick - dt*7);

  if(scene==='raid' && raid && !raid.over){
    raid.time += dt;
    const ph = phase();
    if(ph==='dusk' && !raid.duskToast){ raid.duskToast=true; toast('🌆 해가 지고 있다... 서둘러!'); sfx('night'); }
    if(ph==='night' && !raid.nightToast){ raid.nightToast=true; toast('🌙 밤이 왔다. 미니 떼가 몰려온다!!'); sfx('night'); }

    // 실내 판정 & 지붕 페이드
    raid.inside = houseAtPx(player.x, player.y);
    for(const hs of raid.houses){
      hs.roofA = lerp(hs.roofA, hs===raid.inside ? 0 : 1, Math.min(1, dt*9));
    }
    // 수풀(나무 캐노피) 은신 판정 & 캐노피 페이드
    raid.underTree = false;
    for(const tr of raid.trees){
      const near = dist(player.x,player.y,tr.x,tr.y) < tr.r*0.9;
      if(near) raid.underTree = true;
      tr.a = lerp(tr.a, dist(player.x,player.y,tr.x,tr.y) < tr.r+14 ? 0.35 : 1, Math.min(1, dt*8));
    }
    if(raid.underTree && !raid.treeToastDone){
      raid.treeToastDone = true;
      toast('🌳 수풀 속: 적의 눈에 잘 띄지 않습니다');
    }

    updateShooting(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateDrops(dt);

    // 파티클/숫자/소음링
    for(let i=raid.parts.length-1;i>=0;i--){
      const p = raid.parts[i];
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.t-=dt;
      if(p.t<=0) raid.parts.splice(i,1);
    }
    for(let i=raid.dnums.length-1;i>=0;i--){
      const d = raid.dnums[i]; d.y -= 30*dt; d.t -= dt;
      if(d.t<=0) raid.dnums.splice(i,1);
    }
    for(let i=raid.noises.length-1;i>=0;i--){
      const n = raid.noises[i]; n.t -= dt; n.r = lerp(n.r, n.maxR, dt*6);
      if(n.t<=0) raid.noises.splice(i,1);
    }

    // 탈출
    let inZone = false;
    for(const z of raid.extracts){
      if(dist(player.x,player.y,z.x,z.y)<70) inZone = true;
    }
    if(inZone && !panel){
      raid.extractT += dt;
      if(raid.extractT>=3) onExtract();
    } else {
      raid.extractT = Math.max(0, raid.extractT - dt*2);
    }
  }

  // 루팅 조사: 패널을 열어둔 동안 2초마다 하나씩 식별 (그동안 적은 계속 다가옴)
  if(scene==='raid' && raid && panel && panel.type==='loot' && panel.data.inv){
    const hiddenItems = panel.data.inv.items.filter(it=>it.inst.hidden);
    if(hiddenItems.length){
      searchT += dt;
      if(searchT >= 2){
        searchT = 0;
        hiddenItems[0].inst.hidden = false;
        sfx('reveal');
        refreshPanel();
      }
    }
  }

  updateHud();
}

// ---------------- HUD ----------------
function updateHud(){
  const g = curGun();
  const st = gunStats(g);
  const slotTag = State.gun2 ? '['+(State.activeGun+1)+'] ' : '';
  document.getElementById('hpfill').style.width = (player.hp/maxHp()*100)+'%';
  document.getElementById('hptext').textContent = Math.ceil(player.hp)+' / '+maxHp();
  document.getElementById('stamfill').style.width = (player.stam/stamMax()*100)+'%';
  document.getElementById('stambar').classList.toggle('exhausted', !!player.exhausted);
  const coins = State.coins + (scene==='raid'? player.coinsGained : 0);
  document.getElementById('coins').textContent = '🪙 '+coins + (scene==='raid'&&player.coinsGained? ' (+'+player.coinsGained+')':'');
  // 보스 HP바 — 실제로 조우(근접 목격 또는 피해)한 뒤에만 표시
  const bossEl = document.getElementById('bossbar');
  const boss = (scene==='raid' && raid && raid.boss && raid.enemies.includes(raid.boss)) ? raid.boss : null;
  if(boss && !boss.seen && (dist(boss.x,boss.y,player.x,player.y)<520 || boss.hp<boss.hpMax)){
    boss.seen = true;
    toast('👑 ...저건 뭐지?!');
    sfx('boss');
  }
  bossEl.classList.toggle('on', !!boss && !!boss.seen);
  if(boss) document.getElementById('bossfill').style.width = (boss.hp/boss.hpMax*100)+'%';

  const qEl = document.getElementById('quest');
  if(State.quest){
    const q = State.quest, pr = questProg(q);
    let txt = '📜 '+q.def.title+' '+pr+'/'+q.def.n;
    if(q.def.fetch) txt += ' · 📦'+Math.min(countItem(q.def.fetch.item), q.def.fetch.n)+'/'+q.def.fetch.n;
    const done = questCanComplete(q);
    qEl.textContent = txt + (done?' ✔':'');
    qEl.classList.toggle('done', done);
  } else qEl.textContent = '';

  const clock = document.getElementById('clock');
  const kills = document.getElementById('kills');
  const ammo = document.getElementById('ammo');
  const gname = document.getElementById('gunname');
  const hint = document.getElementById('hud-bl');

  if(scene==='raid' && raid){
    const ph = phase();
    const icon = ph==='day'?'☀️':ph==='dusk'?'🌆':'🌙';
    const t = Math.floor(raid.time);
    clock.textContent = icon+' '+String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
    clock.className = ph;
    kills.textContent = '💀 '+player.kills;
    gname.textContent = slotTag + (g.body ? g.body.def.emoji+' '+st.name : '맨손');
    ammo.textContent = player.reloading>0
      ? '재장전... '+player.reloading.toFixed(1)
      : g.ammo+' / '+st.ammo;
    ammo.classList.toggle('low', g.ammo<=Math.max(1,st.ammo*0.2) && player.reloading<=0);
    const near = nearestInteractable();
    hint.textContent = near ? '[E] '+near.ct.name+' 열기' : '';
  } else {
    clock.textContent = '🏠 케이브';
    clock.className = '';
    kills.textContent = '';
    gname.textContent = slotTag + (g.body ? g.body.def.emoji+' '+st.name : '맨손');
    ammo.textContent = '';
    const near = nearestInteractable();
    hint.textContent = near ? '[E] '+near.name : 'H: 도움말';
  }
}

// ---------------- 렌더 ----------------
// 월드 변환(ctx.setTransform) 아래에서 그리므로 항등 — 기존 호출부 유지용
function worldToScreen(wx,wy){ return [wx, wy]; }
// 실제 스크린 픽셀 좌표 (어둠 오버레이용)
function w2s(wx,wy){ return [(wx-cam.x)*ZOOM + W/2, (wy-cam.y)*ZOOM + H/2]; }
function offscreenW(wx,wy,m){
  return Math.abs(wx-cam.x) > W/(2*ZOOM)+m || Math.abs(wy-cam.y) > H/(2*ZOOM)+m;
}

function render(){
  const shx = (Math.random()-0.5)*shake, shy = (Math.random()-0.5)*shake;
  // 1) 월드 → 저해상도 캔버스 (도트 그림)
  const main = ctx;
  ctx = lctx;
  ctx.imageSmoothingEnabled = false;
  const txi = Math.round(low.width/2 - cam.x/PIX);
  const tyi = Math.round(low.height/2 - cam.y/PIX);
  ctx.setTransform(1/PIX, 0, 0, 1/PIX, txi, tyi);
  if(scene==='cave') renderCaveWorld(); else renderRaidWorld();
  ctx.setTransform(1,0,0,1,0,0);
  ctx = main;
  // 2) 픽셀 그대로 업스케일
  const S = PIX*ZOOM;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#15120e';
  ctx.fillRect(0,0,W,H);
  // 위치를 정수 픽셀로 정렬 → 도트가 화면 격자에 딱 맞아 떨림/깜빡임 제거
  const dx = Math.round(W/2 - cam.x*ZOOM - txi*S + shx);
  const dy = Math.round(H/2 - cam.y*ZOOM - tyi*S + shy);
  ctx.drawImage(low, 0, 0, low.width, low.height, dx, dy, low.width*S, low.height*S);
  // 3) 조명(어둠)과 4) 선명한 UI
  const setWorld = ()=>ctx.setTransform(ZOOM,0,0,ZOOM, W/2 - cam.x*ZOOM + shx, H/2 - cam.y*ZOOM + shy);
  if(scene==='raid'){
    renderDarkness();
    setWorld();
    renderRaidUI();
  } else {
    setWorld();
    renderCaveUI();
  }
  ctx.setTransform(1,0,0,1,0,0);
}

function tileRange(mapW, mapH){
  const hw = W/(2*ZOOM), hh = H/(2*ZOOM);
  const x0 = clamp(Math.floor((cam.x-hw)/TILE)-1, 0, mapW-1);
  const x1 = clamp(Math.ceil((cam.x+hw)/TILE)+1, 0, mapW-1);
  const y0 = clamp(Math.floor((cam.y-hh)/TILE)-1, 0, mapH-1);
  const y1 = clamp(Math.ceil((cam.y+hh)/TILE)+1, 0, mapH-1);
  return [x0,x1,y0,y1];
}

function renderCaveWorld(){
  const vw = W/ZOOM, vh = H/ZOOM;
  ctx.fillStyle = '#241a12';
  ctx.fillRect(cam.x-vw/2-40, cam.y-vh/2-40, vw+80, vh+80);
  const [x0,x1,y0,y1] = tileRange(caveMap.w, caveMap.h);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const v = caveMap.tiles[ty*caveMap.w+tx];
    const [sx,sy] = worldToScreen(tx*TILE, ty*TILE);
    const hsh = ((tx*73856093) ^ (ty*19349663)) >>> 0;
    if(v===1){
      ctx.fillStyle = '#3a2c20'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx,sy+TILE-6,TILE,6);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(sx, sy+13, TILE, 1.5);
      ctx.fillRect(sx+((ty%2)?8:20), sy+2, 1.5, 11);
    } else {
      // 널빤지 바닥
      ctx.fillStyle = '#6a5540'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for(let yy=Math.ceil(sy/13)*13; yy<sy+TILE; yy+=13) ctx.fillRect(sx, yy, TILE, 1.5);
      if(hsh%3===0) ctx.fillRect(sx+(hsh%28), sy+((hsh%2)?2:15), 1.5, 11);
    }
  }
  // 러그
  const [rx,ry] = worldToScreen(11*TILE, 8*TILE);
  ctx.fillStyle = 'rgba(160,60,60,.3)';
  ctx.beginPath(); ctx.ellipse(rx,ry,80,50,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,150,120,.3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(rx,ry,68,40,0,0,Math.PI*2); ctx.stroke();

  // 스테이션 (가구 아트)
  for(const s of caveMap.stations){
    const [sx,sy] = worldToScreen(s.x,s.y);
    drawStation(s, sx, sy);
  }

  drawPlayer();
}

// 케이브 선명한 UI (라벨/하이라이트)
function renderCaveUI(){
  const near = nearestInteractable();
  for(const s of caveMap.stations){
    if(s===near){
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
      ctx.strokeRect(s.x-32, s.y-34, 64, 64);
    }
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = s===near ? '#ffd76a' : '#c9b8a0';
    ctx.fillText(s.name, s.x, s.y+36);
  }
}

// 케이브 가구
function drawStation(s, x, y){
  ctx.save();
  ctx.translate(x, y);
  if(s.panel==='storage'){ // 대형 궤짝
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0,20,28,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8a6a42'; rrect(ctx,-26,-8,52,28,4);
    ctx.fillStyle='#a5824f'; rrect(ctx,-26,-20,52,14,5);
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(-26,-7,52,3);
    ctx.fillStyle='#c9a95a';
    ctx.fillRect(-17,-20,5,40); ctx.fillRect(12,-20,5,40);
    ctx.fillStyle='#e8c84a'; rrect(ctx,-4,-6,8,10,2);
    ctx.fillStyle='#3a2c18'; ctx.fillRect(-1.5,-2,3,4);
  }
  else if(s.panel==='bench'){ // 작업대
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0,20,30,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#5d4526'; ctx.fillRect(-26,6,6,14); ctx.fillRect(20,6,6,14);
    ctx.fillStyle='#7a5a38'; rrect(ctx,-30,-14,60,24,3);
    ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(-30,-4,60,2);
    // 총 실루엣 + 망치
    ctx.fillStyle='#4a3a28'; rrect(ctx,-18,-9,22,5,2); rrect(ctx,-14,-4,5,6,1);
    ctx.fillStyle='#9a9a94'; rrect(ctx,8,-11,4,12,1);
    ctx.fillStyle='#6d6d68'; rrect(ctx,4,-13,12,5,2);
  }
  else if(s.panel==='board'){ // 게시판
    ctx.fillStyle='#5d4526'; ctx.fillRect(-2.5,4,5,16);
    ctx.fillStyle='#7a5a38'; rrect(ctx,-24,-20,48,26,3);
    ctx.strokeStyle='#5d4526'; ctx.lineWidth=3; ctx.strokeRect(-22,-18,44,22);
    ctx.fillStyle='#e8dcc0'; ctx.fillRect(-16,-14,12,14); ctx.fillRect(2,-15,13,10);
    ctx.fillStyle='#c05a4a';
    ctx.beginPath(); ctx.arc(-10,-13,2,0,Math.PI*2); ctx.arc(8,-14,2,0,Math.PI*2); ctx.fill();
  }
  else if(s.panel==='quest'){ // 벽 창구 + NPC 미니
    ctx.fillStyle='#241a12'; rrect(ctx,-24,-26,48,36,5); // 뚫린 창
    ctx.strokeStyle='#8a6a42'; ctx.lineWidth=4; ctx.strokeRect(-24,-26,48,36);
    // 차양
    ctx.fillStyle='#a05a4a'; ctx.fillRect(-28,-30,56,7);
    ctx.fillStyle='#e8dcc0'; for(let i=0;i<4;i++) ctx.fillRect(-28+i*14+7,-30,7,7);
    // NPC 미니 (모자 쓴 사장님)
    ctx.fillStyle='#e8d8b0';
    ctx.beginPath(); ctx.arc(0,-8,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e8a03a';
    ctx.beginPath(); ctx.moveTo(2,-4); ctx.lineTo(10,-2); ctx.lineTo(2,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#1a1a1a';
    ctx.beginPath(); ctx.arc(-3,-10,1.7,0,Math.PI*2); ctx.arc(4,-10,1.7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#4a3a5a'; rrect(ctx,-8,-22,16,6,2); rrect(ctx,-5,-27,10,6,2); // 중절모
    // 카운터
    ctx.fillStyle='#8a6a42'; rrect(ctx,-26,8,52,8,3);
    ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(-26,13,52,3);
    // 장착된 총이 없으면 ❗ 말풍선 (둥실둥실) — 감자총 지급 또는 장착 안내
    if(State.guns.every(g=>!g.body)){
      const by = -46 + Math.sin(performance.now()/300)*2.5;
      ctx.fillStyle='#fff';
      rrect(ctx, 14, by-11, 22, 20, 6);
      ctx.beginPath(); ctx.moveTo(18, by+7); ctx.lineTo(20, by+15); ctx.lineTo(26, by+7); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#d84a3a'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('!', 25, by-1);
    }
  }
  else if(s.panel==='deploy'){ // 출구 문 + 매트
    ctx.fillStyle='rgba(90,120,70,.4)'; rrect(ctx,-20,-6,40,22,4); // 매트
    ctx.strokeStyle='rgba(200,220,180,.35)'; ctx.lineWidth=2; ctx.strokeRect(-16,-3,32,16);
    ctx.fillStyle='#5d4526'; rrect(ctx,-16,-34,32,30,3);
    ctx.fillStyle='#7a5a38'; rrect(ctx,-13,-31,26,24,2);
    ctx.fillStyle='#e8c84a'; ctx.beginPath(); ctx.arc(8,-18,2.5,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function renderRaidWorld(){
  // 지형 — 배경은 맵 밖(울창한 숲), 지형 안쪽만 풀색
  const vw = W/ZOOM, vh = H/ZOOM;
  ctx.fillStyle = '#1d2618';
  ctx.fillRect(cam.x-vw/2-40, cam.y-vh/2-40, vw+80, vh+80);
  const [x0,x1,y0,y1] = tileRange(raid.w, raid.h);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const v = raid.tiles[ty*raid.w+tx];
    const [sx,sy] = worldToScreen(tx*TILE, ty*TILE);
    const hsh = ((tx*73856093) ^ (ty*19349663)) >>> 0;
    if(v===8){
      // 맵 밖 숲: 어두운 수풀 실루엣
      if(hsh%3===0){
        ctx.fillStyle = (hsh%2)?'#243020':'#1f2a1b';
        ctx.beginPath(); ctx.arc(sx+(hsh%32), sy+((hsh>>4)%32), 14+(hsh%10), 0, Math.PI*2); ctx.fill();
      }
    } else if(v===0){
      // 풀: 불규칙 명암 패치 + 풀포기 + 드문 꽃
      ctx.fillStyle = '#3f5136';
      ctx.fillRect(sx,sy,TILE,TILE);
      if(hsh%4===0){
        ctx.fillStyle = (hsh%8===0) ? 'rgba(110,140,80,.10)' : 'rgba(15,25,10,.10)';
        ctx.beginPath();
        ctx.arc(sx+(hsh%29), sy+(hsh%23), 12+(hsh%14), 0, Math.PI*2);
        ctx.fill();
      }
      if(hsh%7===2){
        const gx = sx+6+(hsh%19), gy = sy+9+(hsh%17);
        ctx.strokeStyle = 'rgba(125,165,95,.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx,gy); ctx.lineTo(gx-2,gy-6);
        ctx.moveTo(gx+3,gy); ctx.lineTo(gx+4,gy-7);
        ctx.moveTo(gx+6,gy); ctx.lineTo(gx+8,gy-5);
        ctx.stroke();
      }
      if(hsh%61===7){
        ctx.fillStyle = (hsh%2)?'#e8d8a0':'#d8a8c0';
        ctx.beginPath(); ctx.arc(sx+(hsh%26)+3, sy+(hsh%22)+3, 2.2, 0, Math.PI*2); ctx.fill();
      }
    } else if(v===1){
      // 벽: 벽돌 줄눈
      ctx.fillStyle = '#5d5348'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sx,sy+TILE-7,TILE,7);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(sx,sy,TILE,4);
      ctx.fillStyle = 'rgba(0,0,0,.13)';
      ctx.fillRect(sx, sy+12, TILE, 1.5);
      ctx.fillRect(sx+((ty%2)?9:21), sy+2, 1.5, 10);
    } else if(v===2){
      // 실내 바닥: 나무 널빤지 (전역 정렬로 이음새 연속)
      ctx.fillStyle = '#7d6b52'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      for(let yy=Math.ceil(sy/12)*12; yy<sy+TILE; yy+=12) ctx.fillRect(sx, yy, TILE, 1.5);
      if(hsh%3===0) ctx.fillRect(sx+(hsh%28), sy+((hsh%2)?2:14), 1.5, 10);
    } else if(v===4){
      // 바위
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.ellipse(sx+16, sy+22, 13, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8a8a84';
      ctx.beginPath(); ctx.ellipse(sx+16, sy+15, 12, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#a0a09a';
      ctx.beginPath(); ctx.ellipse(sx+12, sy+11, 6, 4.5, 0, 0, Math.PI*2); ctx.fill();
    } else if(v===5){
      // 강물 (일렁임 애니메이션)
      ctx.fillStyle = '#35566e'; ctx.fillRect(sx,sy,TILE,TILE);
      const tt = Math.floor(performance.now()/400);
      if((hsh+tt)%7<2){
        ctx.fillStyle = 'rgba(160,200,230,.28)';
        ctx.fillRect(sx+((hsh+tt*13)%24), sy+4+((hsh>>3)%24), 7, 2);
      }
      const landAt = (X,Y)=>{ const vv=raid.tiles[Y*raid.w+X]; return vv!==5 && vv!==7; };
      ctx.fillStyle = 'rgba(180,220,240,.35)';
      if(ty>0 && landAt(tx,ty-1)) ctx.fillRect(sx,sy,TILE,2.5);
      if(ty<raid.h-1 && landAt(tx,ty+1)) ctx.fillRect(sx,sy+TILE-2.5,TILE,2.5);
      if(tx>0 && landAt(tx-1,ty)) ctx.fillRect(sx,sy,2.5,TILE);
      if(tx<raid.w-1 && landAt(tx+1,ty)) ctx.fillRect(sx+TILE-2.5,sy,2.5,TILE);
    } else if(v===7){
      // 다리 (널빤지)
      ctx.fillStyle = '#8a6a42'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for(let xx=Math.ceil(sx/9)*9; xx<sx+TILE; xx+=9) ctx.fillRect(xx, sy, 1.5, TILE);
      ctx.fillStyle = '#5d4526';
      ctx.fillRect(sx, sy, TILE, 2.5); ctx.fillRect(sx, sy+TILE-2.5, TILE, 2.5);
    }
  }

  // 현관 매트 (집 입구 표시)
  for(const m of raid.doormats){
    const mx = m.tx*TILE, my = m.ty*TILE;
    if(offscreenW(mx, my, 90)) continue;
    ctx.fillStyle = '#b8975a';
    if(m.horiz) rrect(ctx, mx+3, my+7, TILE*2-6, TILE-14, 3);
    else rrect(ctx, mx+7, my+3, TILE-14, TILE*2-6, 3);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
    if(m.horiz) ctx.strokeRect(mx+6, my+10, TILE*2-12, TILE-20);
    else ctx.strokeRect(mx+10, my+6, TILE-20, TILE*2-12);
  }

  // 탈출 지점
  const pulse = 0.7 + 0.3*Math.sin(performance.now()/300);
  for(const z of raid.extracts){
    const [sx,sy] = worldToScreen(z.x,z.y);
    ctx.strokeStyle = `rgba(90,220,120,${0.5*pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx,sy,66,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = `rgba(90,220,120,${0.10*pulse})`;
    ctx.beginPath(); ctx.arc(sx,sy,66,0,Math.PI*2); ctx.fill();
    ctx.font = '26px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🚩', sx, sy);
  }

  // 실내 장식물 (공장 기계/랙/컨베이어) — 지붕이 걷힌 곳만
  drawDecor();

  // 컨테이너
  for(const c of raid.containers){
    if(offscreenW(c.x,c.y,60)) continue;
    const [sx,sy] = worldToScreen(c.x,c.y);
    drawContainer(c, sx, sy);
    if(c.hp < c.hpMax){ // 내구도 표시
      ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(sx-13, sy-24, 26, 3);
      ctx.fillStyle='#c9a05a'; ctx.fillRect(sx-13, sy-24, 26*c.hp/c.hpMax, 3);
    }
  }

  // 농장 밭이랑 (풀 위에 흙 이랑)
  for(const f of (raid.farms||[])){
    if(offscreenW((f.x+f.w/2)*TILE, (f.y+f.h/2)*TILE, Math.max(f.w,f.h)*TILE/2+40)) continue;
    for(const ry2 of f.rows){
      const [sx,sy] = worldToScreen((f.x+1)*TILE, ry2*TILE);
      ctx.fillStyle = '#5a4632';
      rrect(ctx, sx, sy+8, (f.w-2)*TILE, TILE-16, 4);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(sx, sy+TILE/2, (f.w-2)*TILE, 2);
      // 작물 점점이
      ctx.fillStyle = '#6a8a4a';
      for(let cxp=sx+10; cxp<sx+(f.w-2)*TILE; cxp+=18){
        ctx.beginPath(); ctx.arc(cxp, sy+TILE/2, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // 차량
  drawCars();

  // 드롭
  for(const d of raid.drops){
    if(offscreenW(d.x,d.y,40)) continue;
    const [sx,sy] = worldToScreen(d.x,d.y);
    if(d.kind==='coin'){
      ctx.fillStyle = '#e8c84a';
      ctx.beginPath(); ctx.arc(sx,sy,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#a8882a'; ctx.lineWidth=1.5; ctx.stroke();
    } else {
      const bob = Math.sin(performance.now()/300 + d.bob)*3;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(sx,sy+9,10,4,0,0,Math.PI*2); ctx.fill();
      ctx.font = '20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(d.inst.def.emoji, sx, sy+bob-4);
    }
  }

  // 적
  for(const e of raid.enemies){
    if(offscreenW(e.x,e.y,60)) continue;
    const [sx,sy] = worldToScreen(e.x,e.y);
    // 저격미니 조준 레이저
    if(e.t.ranged==='sniper' && e.state==='chase' && (e.aimT||0)>0.15){
      const ang = Math.atan2(player.y-e.y, player.x-e.x);
      ctx.strokeStyle = `rgba(255,70,70,${Math.min(0.8, e.aimT*0.55)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx,sy);
      ctx.lineTo(sx+Math.cos(ang)*620, sy+Math.sin(ang)*620);
      ctx.stroke();
    }
    // 폭탄미니 점멸 경고
    if(e.t.bomber && e.state==='chase' && Math.floor(performance.now()/150)%2===0){
      ctx.fillStyle = 'rgba(255,80,60,.45)';
      ctx.beginPath(); ctx.arc(sx,sy,e.r+5,0,Math.PI*2); ctx.fill();
    }
    // 밤 추격자는 붉은 기운
    if(phase()==='night' && e.state==='chase' && !e.t.bomber){
      ctx.strokeStyle = 'rgba(255,60,50,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx,sy,e.r+3,0,Math.PI*2); ctx.stroke();
    }
    // 보스 돌진 예고선
    if(e.t.boss && e.mode==='windup'){
      ctx.strokeStyle = 'rgba(255,80,50,.7)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx,sy);
      ctx.lineTo(sx+(e.dashX||0)*340, sy+(e.dashY||0)*340);
      ctx.stroke();
    }
    const faceAng = e.state==='chase' ? Math.atan2(player.y-e.y, player.x-e.x) : e.wdir;
    const eFace = Math.cos(faceAng) >= 0 ? 1 : -1;
    const eMoving = e.state==='chase' || e.moveT>0;
    drawGirl(sx, sy, e.r, enemyPal(e), eFace, e.hitT>0, e.t.elite || e.t.boss,
      { walk: eMoving ? performance.now()/90 + e.seed*3 : 0,
        bob: eMoving ? Math.abs(Math.sin(performance.now()/180 + e.seed*3))*1.2 : 0 });
    // 보스 왕관
    if(e.t.boss){
      const cy2 = sy - e.r*1.4 - 4;
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(sx-13, cy2+5); ctx.lineTo(sx-13, cy2-5); ctx.lineTo(sx-6, cy2);
      ctx.lineTo(sx, cy2-9); ctx.lineTo(sx+6, cy2); ctx.lineTo(sx+13, cy2-5); ctx.lineTo(sx+13, cy2+5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e04a4a';
      ctx.beginPath(); ctx.arc(sx, cy2, 2.2, 0, Math.PI*2); ctx.fill();
    }
    if(e.hp < e.hpMax){
      ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(sx-14, sy-e.r-10, 28, 4);
      ctx.fillStyle='#e05a5a'; ctx.fillRect(sx-14, sy-e.r-10, 28*e.hp/e.hpMax, 4);
    }
  }

  // 총알
  ctx.fillStyle = '#ffe9a0';
  for(const b of raid.bullets){
    const [sx,sy] = worldToScreen(b.x,b.y);
    ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
  }
  for(const b of raid.ebullets){
    const [sx,sy] = worldToScreen(b.x,b.y);
    ctx.fillStyle = b.c || '#b070e0';
    ctx.beginPath(); ctx.arc(sx,sy,b.r||4,0,Math.PI*2); ctx.fill();
  }

  // 파티클
  for(const p of raid.parts){
    const [sx,sy] = worldToScreen(p.x,p.y);
    ctx.globalAlpha = Math.min(1,p.t*3);
    ctx.fillStyle = p.c;
    ctx.fillRect(sx-p.r/2, sy-p.r/2, p.r, p.r);
    ctx.globalAlpha = 1;
  }

  drawPlayer();
  drawRoofs();
  drawTrees();
}

// ---- 시야(어둠) 오버레이 (스크린 좌표) ----
function renderDarkness(){
  const st = gunStats(curGun());
  const ph = phase();
  let dark = 0.12; // 낮은 확실히 밝게
  if(ph==='dusk') dark = lerp(0.12, 0.9, (raid.time-dayLen())/DUSK_LEN);
  if(ph==='night') dark = 0.9;
  if(raid.inside) dark = Math.max(dark, 0.86); // 실내에선 바깥이 안 보임

  vctx.clearRect(0,0,W,H);
  vctx.fillStyle = `rgba(8,8,18,${dark})`;
  vctx.fillRect(0,0,W,H);
  vctx.globalCompositeOperation = 'destination-out';

  const [psx,psy] = w2s(player.x, player.y);
  let g;
  if(raid.inside){
    // 실내: 집 내부만 밝힘
    const hs = raid.inside;
    const [rx,ry] = w2s(hs.x*TILE, hs.y*TILE);
    vctx.fillStyle = 'rgba(0,0,0,0.97)';
    vctx.fillRect(rx, ry, hs.w*TILE*ZOOM, hs.h*TILE*ZOOM);
    const rr = 70*ZOOM;
    g = vctx.createRadialGradient(psx,psy,10, psx,psy,rr);
    g.addColorStop(0,'rgba(0,0,0,0.85)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    vctx.fillStyle = g;
    vctx.beginPath(); vctx.arc(psx,psy,rr,0,Math.PI*2); vctx.fill();
  } else {
    // 주변(뒤쪽) 시야 — 약함
    const br = (110+st.light*60)*ZOOM;
    g = vctx.createRadialGradient(psx,psy,10, psx,psy,br);
    g.addColorStop(0,'rgba(0,0,0,0.95)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    vctx.fillStyle = g;
    vctx.beginPath(); vctx.arc(psx,psy,br,0,Math.PI*2); vctx.fill();
    // 조준 시야 콘
    const coneLen = (330 + st.light*140) * (1 + (st.zoom-1)*player.aimT) * ZOOM;
    const half = (0.55 + st.light*0.18) * (1 - 0.25*player.aimT);
    g = vctx.createRadialGradient(psx,psy,20, psx,psy,coneLen);
    g.addColorStop(0,'rgba(0,0,0,1)');
    g.addColorStop(0.6,'rgba(0,0,0,0.9)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    vctx.fillStyle = g;
    vctx.beginPath();
    vctx.moveTo(psx,psy);
    vctx.arc(psx,psy,coneLen, player.ang-half, player.ang+half);
    vctx.closePath(); vctx.fill();
  }
  // 총구 화염 섬광
  if(player.flash>0){
    const fx = psx+Math.cos(player.ang)*40*ZOOM, fy = psy+Math.sin(player.ang)*40*ZOOM;
    g = vctx.createRadialGradient(fx,fy,5,fx,fy,120*ZOOM);
    g.addColorStop(0,'rgba(0,0,0,0.9)'); g.addColorStop(1,'rgba(0,0,0,0)');
    vctx.fillStyle = g;
    vctx.beginPath(); vctx.arc(fx,fy,120*ZOOM,0,Math.PI*2); vctx.fill();
  }
  vctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(vis, 0, 0);
}

// ---- 어둠 위 월드 UI ----
function renderRaidUI(){
  const psx = player.x, psy = player.y;
  // 가까운 상자 하이라이트 + 라벨 (선명하게)
  const near = nearestInteractable();
  if(near){
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
    ctx.strokeRect(near.x-20, near.y-19, 40, 38);
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffd76a';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('[E] '+near.ct.name, near.x, near.y-28);
  }
  // 소음 링
  for(const n of raid.noises){
    const [sx,sy] = worldToScreen(n.x,n.y);
    ctx.strokeStyle = `rgba(255,200,80,${n.t*0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx,sy,n.r,0,Math.PI*2); ctx.stroke();
  }
  // 데미지 숫자 (픽셀 폰트)
  for(const d of raid.dnums){
    const [sx,sy] = worldToScreen(d.x,d.y);
    ctx.globalAlpha = Math.min(1, d.t*2);
    pText(d.txt, sx, sy-5, 2, d.c);
    ctx.globalAlpha = 1;
  }
  // 재장전 링 (캐릭터 머리 위)
  if(player.reloading>0 && player.reloadTotal>0){
    const pr = 1 - player.reloading/player.reloadTotal;
    ctx.strokeStyle = 'rgba(255,200,90,.25)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(psx, psy-38, 13, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,90,.95)';
    ctx.beginPath(); ctx.arc(psx, psy-38, 13, -Math.PI/2, -Math.PI/2 + Math.PI*2*pr); ctx.stroke();
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ffd76a'; ctx.textAlign='center';
    ctx.fillText('재장전', psx, psy-60);
  } else if(curGun().body && curGun().ammo<=0 && !raid.over){
    if(Math.floor(performance.now()/280)%2===0){
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#ff9a5a'; ctx.textAlign='center';
      ctx.fillText('R 재장전!', psx, psy-40);
    }
  }
  // 탈출 진행 링
  if(raid.extractT>0.05){
    ctx.strokeStyle = 'rgba(90,220,120,.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(psx, psy-34, 14, -Math.PI/2, -Math.PI/2 + Math.PI*2*(raid.extractT/3));
    ctx.stroke();
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#8ae09a'; ctx.textAlign='center';
    ctx.fillText('탈출 중...', psx, psy-58);
  }
}

// 지붕: 플레이어가 안에 있는 집만 서서히 걷힘
function drawRoofs(){
  for(const hs of raid.houses){
    if(hs.roofA<=0.02) continue;
    const w = hs.w*TILE, h = hs.h*TILE, ov = 5;
    if(offscreenW((hs.x+hs.w/2)*TILE, (hs.y+hs.h/2)*TILE, Math.max(w,h)/2+60)) continue;
    const [sx,sy] = worldToScreen(hs.x*TILE, hs.y*TILE);
    ctx.globalAlpha = hs.roofA;
    ctx.fillStyle = hs.roofC;
    rrect(ctx, sx-ov, sy-ov, w+ov*2, h+ov*2, 7);
    // 지붕널 줄무늬
    ctx.strokeStyle = 'rgba(0,0,0,.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let yy=sy+8; yy<sy+h; yy+=13){ ctx.moveTo(sx-ov+4, yy); ctx.lineTo(sx+w+ov-4, yy); }
    ctx.stroke();
    // 용마루
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(sx-ov, sy+h/2-3, w+ov*2, 6);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx-ov+1.5, sy-ov+1.5, w+ov*2-3, h+ov*2-3);
    // 입구 표식 (지붕 가장자리의 밝은 문턱)
    for(const d of (hs.doors||[])){
      const dw = (d.wide||2)*TILE-8;
      ctx.fillStyle = 'rgba(255,220,140,.9)';
      if(d.side<2){
        const dy2 = d.side===0 ? sy-ov : sy+h+ov-6;
        rrect(ctx, sx + (d.x-hs.x)*TILE + 4, dy2, dw, 6, 2);
      } else {
        const dx2 = d.side===2 ? sx-ov : sx+w+ov-6;
        rrect(ctx, dx2, sy + (d.y-hs.y)*TILE + 4, 6, dw, 2);
      }
    }
    // 공장 지붕: 채광창 격자
    if(hs.factory){
      ctx.strokeStyle='rgba(120,140,160,.28)'; ctx.lineWidth=1.5;
      ctx.beginPath();
      for(let xx=sx+14; xx<sx+w; xx+=24){ ctx.moveTo(xx,sy-ov); ctx.lineTo(xx,sy+h+ov); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// 나무 캐노피(수풀): 밑에 들어가면 반투명 + 은신
function drawTrees(){
  for(const t of raid.trees){
    if(offscreenW(t.x, t.y, t.r+30)) continue;
    ctx.globalAlpha = t.a;
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.beginPath(); ctx.ellipse(t.x+5, t.y+7, t.r*0.95, t.r*0.7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2c4224';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a5530';
    for(let i=0;i<3;i++){
      const a = t.seed + i*2.1;
      ctx.beginPath();
      ctx.arc(t.x+Math.cos(a)*t.r*0.38, t.y+Math.sin(a)*t.r*0.38, t.r*0.52, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = '#4c6c3e';
    for(let i=0;i<2;i++){
      const a = t.seed*1.7 + i*2.8;
      ctx.beginPath();
      ctx.arc(t.x+Math.cos(a)*t.r*0.3, t.y+Math.sin(a)*t.r*0.3 - t.r*0.12, t.r*0.3, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// 공장 실내 장식물 (긴 랙 / 대형 기계 / 컨베이어)
function drawDecor(){
  for(const d of (raid.decor||[])){
    const vis2 = 1 - (d.hs ? d.hs.roofA : 0); // 지붕 걷힌 만큼 보임
    if(vis2 <= 0.03) continue;
    const px=d.tx*TILE, py=d.ty*TILE, wpx=d.w*TILE, hpx=d.h*TILE;
    if(offscreenW(px+wpx/2, py+hpx/2, Math.max(wpx,hpx))) continue;
    const [sx,sy]=worldToScreen(px,py);
    ctx.save();
    ctx.globalAlpha = vis2;
    ctx.translate(sx,sy);
    if(d.kind==='rack'){
      // 긴 저장 랙: 강철 프레임 + 선반 칸마다 화물
      ctx.fillStyle='rgba(0,0,0,.3)'; rrect(ctx, 2, 3, wpx-2, hpx-2, 2);
      ctx.fillStyle='#5a5e64'; rrect(ctx, 0, 0, wpx, hpx, 2);
      ctx.fillStyle='#3a3e44';
      if(d.horiz){
        for(let x=0;x<wpx;x+=TILE){ ctx.fillRect(x, 0, 2, hpx); }        // 세로 지지대
        ctx.fillRect(0, hpx*0.5-1, wpx, 2);                              // 선반
      } else {
        for(let y=0;y<hpx;y+=TILE){ ctx.fillRect(0, y, wpx, 2); }
        ctx.fillRect(wpx*0.5-1, 0, 2, hpx);
      }
      // 화물 상자
      ctx.fillStyle='#8a6a3a';
      const n = d.horiz ? Math.floor(wpx/TILE) : Math.floor(hpx/TILE);
      for(let i=0;i<n;i++){
        if((d.tx+d.ty+i)%3===0) continue; // 듬성듬성
        if(d.horiz) rrect(ctx, i*TILE+7, hpx*0.16, TILE-14, hpx*0.3, 2);
        else rrect(ctx, wpx*0.16, i*TILE+7, wpx*0.3, TILE-14, 2);
      }
    } else if(d.kind==='machine'){
      // 대형 기계: 본체 + 패널 + 파이프 + 게이지
      ctx.fillStyle='rgba(0,0,0,.35)'; rrect(ctx, 3, 4, wpx-3, hpx-3, 4);
      ctx.fillStyle='#6a6e74'; rrect(ctx, 0, 0, wpx, hpx, 4);
      ctx.fillStyle='#4a4e54'; rrect(ctx, 4, 4, wpx-8, hpx-8, 3);
      // 상단 파이프
      ctx.fillStyle='#8a8e94'; ctx.fillRect(wpx*0.2, -4, 6, 8); ctx.fillRect(wpx*0.6, -4, 6, 8);
      // 경고 줄무늬
      ctx.fillStyle='#c9a02a';
      for(let i=0;i<wpx;i+=10) ctx.fillRect(i, hpx-6, 5, 4);
      // 게이지 (깜빡)
      const on = (Math.floor(performance.now()/500)+d.seed)%2===0;
      ctx.fillStyle = on ? '#e05a4a' : '#5a8a4a';
      ctx.beginPath(); ctx.arc(wpx*0.72, hpx*0.32, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#2a2e34'; rrect(ctx, wpx*0.16, hpx*0.24, wpx*0.34, hpx*0.2, 2);
    } else if(d.kind==='conveyor'){
      // 컨베이어 벨트: 롤러 + 움직이는 화살표 (통행 가능, 낮은 장식)
      ctx.fillStyle='#3a3e44'; rrect(ctx, 0, 0, wpx, hpx, 3);
      ctx.fillStyle='#2a2e34'; rrect(ctx, 2, 2, wpx-4, hpx-4, 2);
      ctx.strokeStyle='rgba(150,160,170,.4)'; ctx.lineWidth=1.5;
      const off = (performance.now()/90)%16;
      ctx.beginPath();
      if(d.horiz){
        for(let x=-16+off; x<wpx; x+=16){ ctx.moveTo(x, hpx*0.3); ctx.lineTo(x+7, hpx*0.5); ctx.lineTo(x, hpx*0.7); }
      } else {
        for(let y=-16+off; y<hpx; y+=16){ ctx.moveTo(wpx*0.3, y); ctx.lineTo(wpx*0.5, y+7); ctx.lineTo(wpx*0.7, y); }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 버려진 차량
function drawCars(){
  for(const c of raid.cars){
    const px = c.tx*TILE, py = c.ty*TILE, wpx = c.w*TILE, hpx = c.h*TILE;
    if(offscreenW(px+wpx/2, py+hpx/2, Math.max(wpx,hpx))) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    rrect(ctx, 3, 6, wpx-4, hpx-4, 10);
    // 바퀴
    ctx.fillStyle = '#22201e';
    if(c.horiz){
      rrect(ctx, 16, -4, 16, 12, 3); rrect(ctx, wpx-32, -4, 16, 12, 3);
      rrect(ctx, 16, hpx-8, 16, 12, 3); rrect(ctx, wpx-32, hpx-8, 16, 12, 3);
    } else {
      rrect(ctx, -4, 16, 12, 16, 3); rrect(ctx, -4, hpx-32, 12, 16, 3);
      rrect(ctx, wpx-8, 16, 12, 16, 3); rrect(ctx, wpx-8, hpx-32, 12, 16, 3);
    }
    // 차체
    ctx.fillStyle = c.color;
    rrect(ctx, 1, 1, wpx-2, hpx-2, c.kind==='car'?9:5);
    if(c.kind==='bus' || c.kind==='truck'){
      // 대형: 길이 방향으로 창문 여러 개 (버스) 또는 운전석+화물칸 (트럭)
      const long = c.horiz ? wpx : hpx;
      ctx.fillStyle = '#2e3c46';
      if(c.kind==='truck'){
        // 트럭: 앞쪽 운전석 창 + 뒤 컨테이너 이음선
        if(c.horiz){
          rrect(ctx, 8, 6, wpx*0.16, hpx-12, 3);
          ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(wpx*0.30, 2, 2, hpx-4);
        } else {
          rrect(ctx, 6, 8, wpx-12, hpx*0.16, 3);
          ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(2, hpx*0.30, wpx-4, 2);
        }
      } else {
        // 버스: 창문 띠
        const n = Math.max(3, Math.floor(long/26));
        for(let i=0;i<n;i++){
          if(c.horiz){
            const wx = 8 + (wpx-16)*(i+0.15)/n;
            rrect(ctx, wx, 5, (wpx-16)/n*0.7, hpx-10, 2);
          } else {
            const wy = 8 + (hpx-16)*(i+0.15)/n;
            rrect(ctx, 5, wy, wpx-10, (hpx-16)/n*0.7, 2);
          }
        }
      }
      ctx.fillStyle='rgba(255,255,255,.08)';
      rrect(ctx, 3, 3, wpx-6, (c.horiz?hpx:wpx)*0.12+2, 3);
    } else {
      // 승용차: 앞뒤 유리 + 지붕 하이라이트
      ctx.fillStyle = '#2e3c46';
      if(c.horiz){
        rrect(ctx, wpx*0.24, 5, wpx*0.13, hpx-10, 4);
        rrect(ctx, wpx*0.78, 5, wpx*0.1, hpx-10, 4);
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        rrect(ctx, wpx*0.40, 4, wpx*0.34, hpx-8, 5);
      } else {
        rrect(ctx, 5, hpx*0.24, wpx-10, hpx*0.13, 4);
        rrect(ctx, 5, hpx*0.78, wpx-10, hpx*0.1, 4);
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        rrect(ctx, 4, hpx*0.40, wpx-8, hpx*0.34, 5);
      }
    }
    // 녹슨 자국
    ctx.fillStyle = 'rgba(90,50,30,.4)';
    ctx.beginPath(); ctx.arc(wpx*0.15, hpx*0.7, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// 가구/컨테이너 벡터 아트
function drawContainer(c, x, y){
  ctx.save();
  ctx.translate(x, y);
  if(c.opened) ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(0, 14, 17, 6, 0, 0, Math.PI*2); ctx.fill();
  switch(c.type){
    case 'crate': { // 나무 상자
      ctx.fillStyle = '#a5793f'; rrect(ctx, -16, -13, 32, 27, 3);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(-16, -4, 32, 2); ctx.fillRect(-6, -13, 2, 27); ctx.fillRect(5, -13, 2, 27);
      ctx.strokeStyle = '#6d4e26'; ctx.lineWidth = 2.5;
      ctx.strokeRect(-15, -12, 30, 25);
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-13,-10); ctx.lineTo(13,11); ctx.stroke();
      break;
    }
    case 'fridge': { // 냉장고
      ctx.fillStyle = '#dfe8ea'; rrect(ctx, -13, -17, 26, 34, 4);
      ctx.fillStyle = '#b9c8cc'; ctx.fillRect(-13, -5, 26, 2);
      ctx.fillStyle = '#8a9a9e';
      rrect(ctx, 8, -13, 3, 6, 1.5); rrect(ctx, 8, 0, 3, 8, 1.5);
      ctx.strokeStyle = '#9fb0b4'; ctx.lineWidth = 1.5;
      ctx.strokeRect(-12.5, -16.5, 25, 33);
      break;
    }
    case 'cupboard': { // 찬장
      ctx.fillStyle = '#8a6a4a'; rrect(ctx, -17, -13, 34, 27, 3);
      ctx.fillStyle = '#9d7c58'; ctx.fillRect(-17, -13, 34, 5);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-1, -7, 2, 20);
      ctx.fillStyle = '#5d4530';
      ctx.beginPath(); ctx.arc(-5, 2, 1.8, 0, Math.PI*2); ctx.arc(5, 2, 1.8, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#5d4530'; ctx.lineWidth = 2;
      ctx.strokeRect(-16, -12, 32, 25);
      break;
    }
    case 'toolbox': { // 공구함
      ctx.fillStyle = '#c0533a'; rrect(ctx, -16, -10, 32, 22, 3);
      ctx.fillStyle = '#a03e28'; ctx.fillRect(-16, -3, 32, 2);
      ctx.strokeStyle = '#8a3222'; ctx.lineWidth = 2;
      ctx.strokeRect(-15, -9, 30, 20);
      ctx.strokeStyle = '#e8c84a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -10, 7, Math.PI, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#d8d0c0'; rrect(ctx, -3, -4, 6, 5, 1);
      break;
    }
    case 'corpse': { // 사망 지점 배낭 잔해
      ctx.fillStyle = '#4a4a52'; rrect(ctx, -16, -8, 32, 20, 6); // 쓰러진 배낭
      ctx.fillStyle = '#5d5d66'; rrect(ctx, -12, -12, 14, 10, 4);
      ctx.strokeStyle = '#33333a'; ctx.lineWidth = 2;
      ctx.strokeRect(-14, -6, 28, 16);
      // 해골
      ctx.fillStyle = '#e8e4da';
      ctx.beginPath(); ctx.arc(7, -8, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(4, -4, 6, 4);
      ctx.fillStyle = '#33333a';
      ctx.beginPath(); ctx.arc(4.7, -9, 1.7, 0, Math.PI*2); ctx.arc(9.3, -9, 1.7, 0, Math.PI*2); ctx.fill();
      break;
    }
    case 'safe': { // 금고
      ctx.fillStyle = '#6a7280'; rrect(ctx, -15, -15, 30, 30, 4);
      ctx.strokeStyle = '#4a505a'; ctx.lineWidth = 2.5;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.fillStyle = '#d0d4da';
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#4a505a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0,-5.5); ctx.lineTo(0,5.5); ctx.moveTo(-5.5,0); ctx.lineTo(5.5,0);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// 색 계열에서 어두운 그림자색 생성 (음영은 1단계만)
function shade(hex, f){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.round(r*f); g=Math.round(g*f); b=Math.round(b*f);
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}

// ============================================================
// 3x5 픽셀 비트맵 폰트 (숫자 + 몇몇 기호) — 도트 톤 UI 텍스트용
// ============================================================
const PFONT = {
  '0':["111","101","101","101","111"], '1':["010","110","010","010","111"],
  '2':["111","001","111","100","111"], '3':["111","001","111","001","111"],
  '4':["101","101","111","001","001"], '5':["111","100","111","001","111"],
  '6':["111","100","111","101","111"], '7':["111","001","010","010","010"],
  '8':["111","101","111","101","111"], '9':["111","101","111","001","111"],
  '/':["001","001","010","100","100"], '.':["000","000","000","000","010"],
  '+':["000","010","111","010","000"], '-':["000","000","111","000","000"],
  '!':["1","1","1","0","1"], 'm':["00000","11010","10101","10101","10101"],
  ' ':["00","00","00","00","00"],
};
// 픽셀 폰트로 문자열 그리기 (cx=중앙 정렬 기준). s=픽셀 크기(월드px)
function pText(txt, cx, cy, s, color, outline){
  txt = String(txt);
  let tw = 0;
  for(const ch of txt){ const g=PFONT[ch]||PFONT['0']; tw += g[0].length+1; }
  tw -= 1;
  let x = cx - tw*s/2;
  const oc = outline || '#20161a';
  for(const ch of txt){
    const g = PFONT[ch]||PFONT['0'];
    const gw = g[0].length;
    for(let ry=0; ry<g.length; ry++) for(let rx=0; rx<gw; rx++){
      if(g[ry][rx]==='1'){
        // 외곽선(4방향) → 선명한 도트 느낌
        ctx.fillStyle = oc;
        ctx.fillRect(Math.round(x+rx*s-s*0.35), Math.round(cy+ry*s), Math.ceil(s+s*0.7), Math.ceil(s));
        ctx.fillRect(Math.round(x+rx*s), Math.round(cy+ry*s-s*0.35), Math.ceil(s), Math.ceil(s+s*0.7));
      }
    }
    for(let ry=0; ry<g.length; ry++) for(let rx=0; rx<gw; rx++){
      if(g[ry][rx]==='1'){
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x+rx*s), Math.round(cy+ry*s), Math.ceil(s), Math.ceil(s));
      }
    }
    x += (gw+1)*s;
  }
}

// ============================================================
// 미소녀 픽셀아트 스프라이트 — 명시적 픽셀맵 (앞모습 살짝 3/4)
// 16w x 20h 그리드. 문자 = 팔레트 키. 큰 애니 눈 + 검은 외곽선.
// 색: O=외곽선 K=머리 k=머리그림자 S=피부 s=피부그림자
//     C=옷 c=옷그림자 E=눈(홍채) W=흰자/하이라이트 P=볼/입 A=악세서리
// ============================================================
// 눈: 위쪽 외곽선(O)+흰 반사광(W) / 가운데 홍채(E) / 아래 흰자(W) → 반짝이는 애니 눈
// 사용자 디자인 반영: M자 앞머리, 속눈썹, 통짜 몸통 + 손
// O=외곽선 K=머리 w=머리광택 S=피부 s=피부그림자 L=속눈썹(진한선)
// E=홍채 W=하이라이트 P=볼 M=입 C=옷 c=옷그림자 H=손(피부)
// ⚠️ 스프라이트 모양·색은 sprite.js 파일에서 편집하세요!
//    (GIRL_SPRITE / GIRL_W / GIRL_H / GIRL_COLORS 는 sprite.js 에 정의됨)
function tint(hex, f){ // 밝게 (하이라이트용)
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.min(255,Math.round(r+(255-r)*f)); g=Math.min(255,Math.round(g+(255-g)*f)); b=Math.min(255,Math.round(b+(255-b)*f));
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
function girlColorMap(pal, hit){
  if(hit) return { O:'#fff', K:'#fff', k:'#fff', w:'#fff', S:'#fff', s:'#eee', C:'#fff', c:'#eee',
                   E:'#ccc', W:'#fff', L:'#fff', H:'#fff', P:'#fff', M:'#fff', A:'#fff', '.':null };
  const cm = GIRL_COLORS(pal, shade, tint); // sprite.js 의 색 정의
  cm['.'] = null;
  return cm;
}

// 캐시된 스프라이트 캔버스 (팔레트별) — 매 프레임 픽셀 다시 안 찍게
const _girlCache = new Map();
function girlCanvas(pal, hit){
  const key = (hit?'H':'') + pal.hair+pal.skin+pal.outfit+pal.eye+(pal.acc||'')+(pal.accRow||'');
  if(_girlCache.has(key)) return _girlCache.get(key);
  const cm = girlColorMap(pal, hit);
  const cn = document.createElement('canvas');
  cn.width=GIRL_W; cn.height=GIRL_H;
  const g = cn.getContext('2d');
  for(let y=0;y<GIRL_H;y++){
    const row = GIRL_SPRITE[y];
    for(let x=0;x<GIRL_W;x++){
      const c = cm[row[x]];
      if(c){ g.fillStyle=c; g.fillRect(x,y,1,1); }
    }
  }
  // 악세서리 (리본/모자/핀) — 스프라이트 위에 오버레이
  if(pal.acc && !hit){
    g.fillStyle = pal.acc;
    if(pal.accType==='ribbon'){ // 오른쪽 리본
      g.fillRect(11,2,3,2); g.fillRect(13,1,2,4); g.fillStyle=shade(pal.acc,0.7); g.fillRect(11,3,2,1);
    } else if(pal.accType==='cap'){ // 모자챙
      g.fillStyle='#20161a'; g.fillRect(3,1,10,1);
      g.fillStyle=pal.acc; g.fillRect(4,0,8,2); g.fillRect(3,2,3,1);
    } else { // 머리핀
      g.fillRect(5,2,2,1); g.fillRect(9,2,2,1);
    }
  }
  if(_girlCache.size>60) _girlCache.clear();
  _girlCache.set(key, cn);
  return cn;
}

function drawGirl(sx, sy, r, pal, faceDir, hit, elite, opt){
  opt = opt || {};
  const scale = r/7;              // 스프라이트 픽셀 → 월드 크기
  const dw = GIRL_W*scale, dh = GIRL_H*scale;
  const bob = (opt.bob||0)*scale;
  ctx.save();
  ctx.translate(sx, sy);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(0, dh*0.42, dw*0.4, dh*0.09, 0, 0, Math.PI*2); ctx.fill();
  if(elite){
    ctx.fillStyle = 'rgba(255,210,80,.22)';
    ctx.beginPath(); ctx.arc(0, -dh*0.05, r*1.5, 0, Math.PI*2); ctx.fill();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.scale(faceDir, 1);          // 좌우 반전만
  const cn = girlCanvas(pal, hit);
  // 스프라이트 중심을 발밑 기준으로 배치 (bob 반영)
  ctx.drawImage(cn, -dw/2, -dh*0.62 - bob, dw, dh);
  ctx.restore();
}

// ---- 팔레트 정의 (색 최소화: 머리/피부/옷/눈/악세) ----
const GIRL_PALS = {
  zduck:   { hair:'#7ea86a', skin:'#b8cf9a', acc:null },                          // 좀비: 창백한 초록빛
  fastduck:{ hair:'#c9524a', skin:'#f0c4a8', acc:'#ff6a5a', accType:'ribbon' },   // 광전사: 붉은머리
  bigduck: { hair:'#5a6a9a', skin:'#e8c4a4', acc:null },                          // 거구: 남색
  spitter: { hair:'#9a5ab0', skin:'#f0c8b0', acc:'#d090e8', accType:'pin' },      // 마녀: 보라
  sniper:  { hair:'#3a8a9a', skin:'#eac4a8', acc:'#5ad0e0', accType:'cap' },      // 저격: 청록+모자
  gunner:  { hair:'#b09040', skin:'#eac4a8', acc:'#d0b050', accType:'cap' },      // 총잡이: 금발+모자
  bomber:  { hair:'#c94a3a', skin:'#f0c0a0', acc:'#ff9040', accType:'ribbon' },   // 폭탄: 위험한 주황
  golden:  { hair:'#f0d860', skin:'#f4d4b0', acc:'#ffe880', accType:'ribbon' },   // 황금
  kingduck:{ hair:'#ffe070', skin:'#f4d4b0', acc:'#ffd24a', accType:'cap' },      // 보스 (왕관은 별도)
};
function enemyPal(e){
  const g = GIRL_PALS[e.id] || GIRL_PALS.zduck;
  return { hair:g.hair, skin:g.skin, outfit:e.t.color,
           acc:g.acc, accType:g.accType, eye:'#3a2632' };
}
const PLAYER_PAL = {
  hair:'#e0a850', skin:'#f6dcbe', outfit:'#5a86b0',
  acc:'#ff8fae', accType:'ribbon', eye:'#5a7a4a',
};

function drawPlayer(){
  const [sx,sy] = worldToScreen(player.x, player.y);
  if(player.iframe>0 && Math.floor(performance.now()/80)%2===0) ctx.globalAlpha = 0.45;
  const face = Math.cos(player.ang) >= 0 ? 1 : -1;
  const moving = (keys.w||keys.a||keys.s||keys.d);
  drawGirl(sx, sy, player.r, PLAYER_PAL, face, false, false,
    { walk: moving ? performance.now()/80 : 0,
      bob: moving ? Math.abs(Math.sin(performance.now()/160))*1.3 : 0 });
  // 총은 조준각 그대로 회전 — 캐릭터 손(몸통 중간) 높이에 맞춤
  const spin = player.reloading>0 && player.reloadTotal>0
    ? (1 - player.reloading/player.reloadTotal)*Math.PI*2 : 0;
  drawGunWorld(ctx, curGun(), sx, sy-player.r*0.7, player.ang, player.flash, spin, player.kick);
  ctx.globalAlpha = 1;
}

// ---------------- 메인 루프 ----------------
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------------- 부트 ----------------
buildCave();
if(!loadGame()) newGame();
// 몸통이 하나도 없어도 자동 지급하지 않음 — 퀘스트 창구(❗)에서 받는다
player.x = 11*TILE; player.y = 8*TILE;
player.hp = maxHp();
player.stam = stamMax();
cam.x = player.x; cam.y = player.y;
setupQslots();
renderQslots();
refreshQslotZones();
if(!State.seenHelp) openPanel('help');
updateHud();
requestAnimationFrame(loop);

// 테스트/디버그용
window.G = { State, player, startRaid, openPanel, closePanel, get raid(){return raid;}, get scene(){return scene;}, gunStats };
