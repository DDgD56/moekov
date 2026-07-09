// ============================================================
// MoeKov — 코어 (캔버스·사운드·입력·상태·세이브)
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
    if((scene==='raid' || scene==='cave') && !panel) startReload();
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
  if(scene==='cave'){
    // 스테이션을 클릭하면 상호작용, 아니면 사격 (사격장에서 총 시험)
    if(clickInteract(e.clientX, e.clientY)) return;
    mouse.down = true; // 빈 공간 클릭 = 사격
    return;
  }
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
  stashUnlocked: false,      // 총 보관대 해금 (State.stashSlots>0 과 동기)
  stashSlots: 0,             // 개방된 보관 칸 수 (퀘스트 rewardStash로만 증가, 최대 6)
  seenHelp: false,
  quest: null,           // 일반 퀘스트 슬롯 (창구)
  exoQuest: null,        // 엑조틱 퀘스트 슬롯 (부품 수집가) — 일반과 동시 진행
  questOffers: null, questsDone: 0,
  qslots: [null, null, null], // 음식 퀵슬롯 (3·4·5키)
  deathCache: null, // 사망 시 떨어뜨린 장비 {items:[{d,r}], x, y} — 다음 출격 1회 한정 회수
  region: 'hill',            // 마지막 선택 지역
  regionExtracts: {},        // 지역별 탈출 횟수 {hill:3, ...}
  regionBoss: {},            // 지역별 보스 처치 여부 {factory:true}
  stash: [null,null,null,null,null,null], // 총 보관대 (칸 수는 stashSlots)
  exoticIntroDone: false,    // 엑조틱 입문 퀘스트 「수상한 총구 주문서」 완료
};

function curGun(){ return State.guns[State.activeGun]; }
let benchIdx = 0; // 작업대 탭에서 편집 중인 총
let benchFilter = null; // 작업대 창고 필터 (null=전체, sock키 | 'body'|'loot'|'food')
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
      stashUnlocked: !!State.stashUnlocked, stashSlots: State.stashSlots|0,
      seenHelp: State.seenHelp,
      quest: State.quest, exoQuest: State.exoQuest,
      questOffers: State.questOffers, questsDone: State.questsDone||0,
      qslots: State.qslots.map(i=>i?{d:i.def.id}:null),
      deathCache: State.deathCache,
      region: State.region, regionExtracts: State.regionExtracts, regionBoss: State.regionBoss,
      stash: State.stash.map(serializeStash),
      exoticIntroDone: !!State.exoticIntroDone,
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
    State.exoQuest = d.exoQuest||null;
    // 구세이브: 엑조틱 입문이 일반 슬롯에 있으면 분리
    if(State.quest && State.quest.def && State.quest.def.unlock==='exoticIntro'){
      if(!State.exoQuest) State.exoQuest = State.quest;
      State.quest = null;
    }
    State.questOffers = d.questOffers||null;
    State.questsDone = d.questsDone||0;
    // 총 보관대: stashSlots 명시. 구세이브는 예전 공식으로 고정 변환(이후 아무 퀘스트로 안 늘어남)
    State.stash = (d.stash || []).map(loadStash);
    while(State.stash.length<6) State.stash.push(null);
    if(d.stashSlots != null){
      State.stashSlots = Math.max(0, d.stashSlots|0);
    } else if(d.stashUnlocked || (Array.isArray(d.stash) && d.stash.some(Boolean))){
      const extra = Math.max(0, (d.questsDone||0) - (d.stashBaseDone||0));
      let slots = Math.min(6, 2 + extra);
      // 보관 중인 총이 더 뒤 칸에 있으면 그 칸까지 열어 꺼낼 수 있게
      for(let i=State.stash.length-1;i>=0;i--){
        if(State.stash[i]){ slots = Math.max(slots, i+1); break; }
      }
      State.stashSlots = slots;
    } else {
      State.stashSlots = 0;
    }
    State.stashUnlocked = State.stashSlots > 0;
    State.qslots = (d.qslots||[null,null,null]).map(s=> s && ITEMS[s.d] ? mkInst(s.d) : null);
    while(State.qslots.length<3) State.qslots.push(null);
    State.deathCache = d.deathCache||null;
    State.region = d.region || 'hill';
    State.regionExtracts = d.regionExtracts || {};
    State.regionBoss = d.regionBoss || {};
    // 엑조틱 입문: 이미 레이저 포인터를 갖고 있거나 공장 탈출 이력이 많으면 완료로 간주
    State.exoticIntroDone = d.exoticIntroDone!==undefined
      ? !!d.exoticIntroDone
      : !!(d.regionExtracts && d.regionExtracts.factory);
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
  State.exoticIntroDone = false;
  State.backpack.autoPlace(mkInst('bandage'));
  State.backpack.autoPlace(mkInst('bandage'));
  State.backpack.autoPlace(mkInst('mushroom_mag'));
  State.storage.autoPlace(mkInst('glasses_scope'));
  State.storage.autoPlace(mkInst('soda'));
  State.quest = null; State.exoQuest = null;
  State.questOffers = null; State.questsDone = 0;
  State.stashUnlocked = false; State.stashSlots = 0;
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
  extractDetectT:0, // 휴대용 탐지기·입문 힌트 남은 시간(초)
  extractHintIntro:false, // 뒷동산 시작 5초 탈출 방향 힌트
  slowT:0,          // 보스 가시/속박 등 이속 저하
  poisonT:0,        // 보스 독 지속 피해
};
function stamMax(){ return 100 + State.up.shoes*25; }

// ---------------- 씬 ----------------
let scene = 'cave'; // 'cave' | 'raid'
let raid = null;    // 레이드 상태
let caveMap = null;

