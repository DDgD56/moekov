// ============================================================
// 총 조립 시스템: 레일(소켓) 로직 + 작업대 UI + 인게임 렌더
// ============================================================
// State.gun = { body: inst|null, atts: [{inst, side, idx}] }
// side: 'top' | 'bottom' | 'front' | 'back'
// idx: 해당 변의 시작 셀 인덱스. 부착물은 idx ~ idx+plug-1 칸을 점유.

function sideLen(bodyDef, side){
  return (side==='top'||side==='bottom') ? bodyDef.bw : bodyDef.bh;
}

// 해당 변에서 소켓타입이 커버하는 셀 집합
function railCellSet(bodyDef, side, type){
  const s = new Set();
  for(const r of bodyDef.rails){
    if(r.side!==side || r.type!==type) continue;
    for(let i=r.from; i<r.from+r.len; i++) s.add(i);
  }
  return s;
}

// 회전 장착: rot으로 돌린 모양의 0번째 줄(접촉면) 중 "1칸 이상"이 맞는 소켓 레일에
// 닿아 있으면 장착 가능 — 나머지는 걸치거나 총 밖으로 삐져나와도 됨.
// 단, 같은 변에 붙은 다른 부착물과 2D로 겹치면 안 됨 (진짜 패킹 퍼즐)
function canMount(gun, attDef, side, idx, rot, ignoreInst){
  if(!gun.body) return false;
  const bd = gun.body.def;
  const cells = shapeOf(attDef, rot||0);
  const contact = cells.filter(c=>c[1]===0); // 몸통에 닿는 줄
  if(!contact.length) return false;
  const rail = railCellSet(bd, side, attDef.sock);
  const len = sideLen(bd, side);
  let touching = 0;
  for(const [a] of contact){
    const cell = idx+a;
    if(cell>=0 && cell<len && rail.has(cell)) touching++;
  }
  if(touching===0) return false;
  // 2D 겹침 검사 — 화면에 실제로 그려지는 격자 좌표(mountLocalCells 변환 후)로 비교.
  // 서로 다른 변(side)의 부착물이라도 몸통 밖으로 뻗어 같은 격자칸을 차지하면 겹침으로 막는다.
  const mineCells = new Set(attFootprint(bd, attDef, side, idx, rot||0));
  for(const m of gun.atts){
    if(ignoreInst && m.inst.uid===ignoreInst.uid) continue;
    for(const k of attFootprint(bd, m.inst.def, m.side, m.idx, m.rot||0)){
      if(mineCells.has(k)) return false;
    }
  }
  return true;
}

// 부착물이 몸통 격자에서 실제로 차지하는 칸들의 절대 좌표 문자열 집합.
// 몸통: x 0..bw-1, y 0..bh-1. top→y음수, bottom→y>=bh, front→x>=bw, back→x음수.
// renderBench의 배치 공식과 동일한 좌표계를 쓴다(화면과 검사 일치).
function attFootprint(bd, attDef, side, idx, rot){
  const cells = shapeOf(attDef, rot||0);
  const local = mountLocalCells(cells, side);
  const lw = Math.max(...local.map(c=>c[0]))+1;
  const lh = Math.max(...local.map(c=>c[1]))+1;
  return local.map(([lx,ly])=>{
    if(side==='top')    return (idx+lx)+','+(ly-lh);
    if(side==='bottom') return (idx+lx)+','+(bd.bh+ly);
    if(side==='front')  return (bd.bw+lx)+','+(idx+ly);
    return (lx-lw)+','+(idx+ly); // back
  });
}

// 부착물 footprint(a=레일 방향, d=깊이)를 화면 로컬 좌표로 변환
function mountLocalCells(cells, side){
  if(side==='bottom') return cells.map(c=>[c[0],c[1]]);
  if(side==='top'){ const md = Math.max(...cells.map(c=>c[1])); return cells.map(([a,d])=>[a, md-d]); }
  if(side==='front') return cells.map(([a,d])=>[d, a]);
  const md = Math.max(...cells.map(c=>c[1]));
  return cells.map(([a,d])=>[md-d, a]); // back
}

// 발사 모드 우선순위 (여러 개 달면 높은 쪽이 이김)
const FIRE_PRI = { laser:5, shock:4, flame:3, ice:2.5, glue:2, dart:1 };

// ---- 총 스탯 집계 ----
function gunStats(gun){
  if(!gun || !gun.body){
    return { name:'맨손', cls:'', dmg:2, rpm:120, spread:10, ammo:0, reload:1, noise:100,
             pellets:1, recoil:5, zoom:1, light:0, aim:1,
             fire:null, pierce:0, burn:0, poison:0, slow:0, stun:0, chain:0,
             rangeMul:1, bulletSpd:1, ammoCost:1, extractDetect:false, knock:1,
             ricochet:0, lifesteal:0, boom:0, magnet:1 };
  }
  const b = gun.body.def;
  const s = { name:b.name, cls:b.cls||'', dmg:b.base.dmg, rpm:b.base.rpm, spread:b.base.spread,
              ammo:b.base.ammo, reload:b.base.reload, noise:b.base.noise,
              pellets:b.base.pellets||1, recoil:b.base.recoil!=null?b.base.recoil:6,
              zoom:1, light:0, aim:1,
              fire:null, pierce:0, burn:0, poison:0, slow:0, stun:0, chain:0,
              rangeMul:1, bulletSpd:1, ammoCost:1, extractDetect:false, knock:1,
              ricochet:0, lifesteal:0, boom:0, magnet:1 };
  for(const m of gun.atts){
    const mod = m.inst.def.mods||{};
    if(mod.dmg) s.dmg += mod.dmg;
    if(mod.ammo) s.ammo += mod.ammo;
    if(mod.spread) s.spread += mod.spread;
    if(mod.reload) s.reload += mod.reload;
    if(mod.noiseMul) s.noise *= mod.noiseMul;
    if(mod.zoom) s.zoom = Math.max(s.zoom, mod.zoom);
    if(mod.light) s.light += mod.light;
    if(mod.aim) s.aim += mod.aim;
    if(mod.rpmMul) s.rpm *= mod.rpmMul;
    if(mod.recoilMul) s.recoil *= mod.recoilMul;
    if(mod.pellets) s.pellets = Math.max(1, s.pellets + mod.pellets);
    // 엑조틱 발사/특수
    if(mod.fire && (!s.fire || (FIRE_PRI[mod.fire]||0) > (FIRE_PRI[s.fire]||0)))
      s.fire = mod.fire;
    if(mod.pierce) s.pierce = Math.max(s.pierce, mod.pierce|0);
    if(mod.burn) s.burn += mod.burn;
    if(mod.poison) s.poison += mod.poison;
    if(mod.slow) s.slow += mod.slow;
    if(mod.stun) s.stun += mod.stun;
    if(mod.chain) s.chain = Math.max(s.chain, mod.chain|0);
    if(mod.rangeMul) s.rangeMul *= mod.rangeMul;
    if(mod.bulletSpd) s.bulletSpd *= mod.bulletSpd;
    if(mod.ammoCost) s.ammoCost = Math.max(s.ammoCost, mod.ammoCost|0);
    if(mod.extractDetect) s.extractDetect = true;
    if(mod.knock) s.knock = Math.max(s.knock||1, mod.knock);
    // ★★★ 유물 기믹
    if(mod.ricochet) s.ricochet = Math.max(s.ricochet, mod.ricochet|0);
    if(mod.lifesteal) s.lifesteal += mod.lifesteal;
    if(mod.boom) s.boom = Math.max(s.boom, mod.boom);
    if(mod.magnet) s.magnet = Math.max(s.magnet, mod.magnet);
  }
  // fire 없이 stun/slow만 있는 파츠 → 보조 모드 추론 (ice 명시 없을 때만 glue)
  if(!s.fire){
    if(s.stun>0 && s.chain>0) s.fire = 'shock';
    else if(s.slow>0 && s.burn<=0 && s.poison<=0) s.fire = 'glue';
  }
  s.spread = Math.max(1, s.spread);
  s.reload = Math.max(0.4, s.reload);
  s.noise = Math.round(s.noise);
  s.recoil = Math.max(0.3, s.recoil);
  s.ammo = Math.max(1, Math.round(s.ammo));
  s.dmg = Math.max(1, s.dmg);
  s.pellets = Math.max(1, s.pellets|0);
  s.ammoCost = Math.max(1, s.ammoCost|0);
  s.rangeMul = Math.max(0.12, s.rangeMul);
  s.bulletSpd = Math.max(0.2, s.bulletSpd);
  // 모드별 기본 보정 (파츠가 안 넣은 여백 채움)
  if(s.fire==='laser'){
    s.pellets = Math.max(1, s.pellets);
    s.spread = Math.min(s.spread, 6);
  } else if(s.fire==='flame'){
    s.pellets = Math.max(3, s.pellets);
    s.rangeMul = Math.min(s.rangeMul, 0.45);
    // 화염탄은 항상 화상 DOT (파츠 burn이 없으면 기본 1.8초)
    if(!(s.burn>0)) s.burn = 1.8;
  } else if(s.fire==='dart'){
    s.pellets = 1;
  } else if(s.fire==='glue'){
    s.bulletSpd = Math.min(s.bulletSpd, 0.65);
  } else if(s.fire==='ice'){
    s.pellets = Math.max(1, s.pellets);
    if(!(s.slow>0)) s.slow = 2.2;
    s.bulletSpd = Math.min(s.bulletSpd, 0.9);
  } else if(s.fire==='shock'){
    s.pellets = Math.max(1, s.pellets);
  }
  if(!(s.knock>0)) s.knock = 1;
  return s;
}

function serializeGun(gun){
  return {
    body: gun.body ? gun.body.def.id : null,
    atts: gun.atts.map(m=>({d:m.inst.def.id, side:m.side, idx:m.idx, r:m.rot||0})),
  };
}
function loadGun(data){
  const gun = { body:null, atts:[], ammo:0 };
  if(data && data.body && ITEMS[data.body]){
    gun.body = mkInst(data.body);
    for(const m of (data.atts||[])){
      if(ITEMS[m.d]) gun.atts.push({inst:mkInst(m.d), side:m.side, idx:m.idx, rot:m.r||0});
    }
  }
  return gun;
}

// ---- 총 보관대 (조립된 총을 통째로 넣었다 뺐다) ----
const MAX_STASH = 6;      // 보관대 최대 칸 수 (물리 배열 크기)
const STASH_START = 2;    // 「사장님의 금고」 완료 시 개방 칸 수
// 칸 수는 State.stashSlots — 아무 퀘스트나 깨도 안 늘고, rewardStash 보상 퀘스트만 증가
function stashSlots(){
  return Math.min(MAX_STASH, Math.max(0, State.stashSlots|0));
}
function grantStashSlots(n){
  if(!(n>0)) return 0;
  const before = stashSlots();
  State.stashSlots = Math.min(MAX_STASH, before + n);
  State.stashUnlocked = State.stashSlots > 0;
  return stashSlots() - before;
}
// 현재 편집 총을 보관 슬롯에 넣기 (슬롯이 비어있어야 함)
function stashGun(slot){
  if(slot >= stashSlots()){ toast('🔒 아직 잠긴 보관칸입니다 (보관대 확장 퀘스트 보상)'); return; }
  const g = editGun();
  if(!g.body){ toast('작업대에 총이 없습니다'); return; }
  if(State.stash[slot]){ toast('그 보관칸은 이미 차 있습니다'); return; }
  // 총 구성을 통째로 저장하고 작업대는 비움
  State.stash[slot] = { body:g.body, atts:g.atts };
  g.body = null; g.atts = []; g.ammo = 0;
  if(typeof sfx==='function') sfx('drop');
  toast('📦 보관대 '+(slot+1)+'에 넣었습니다');
  saveGame();
  refreshPanel();
}
// 보관 슬롯의 총을 작업대로 꺼내기 (작업대가 비어있어야 함)
function unstashGun(slot){
  const st = State.stash[slot];
  if(!st){ return; }
  const g = editGun();
  if(g.body){ toast('작업대를 먼저 비우세요 (총을 보관대나 창고로)'); return; }
  g.body = st.body; g.atts = st.atts; g.ammo = 0;
  State.stash[slot] = null;
  if(typeof sfx==='function') sfx('mount');
  toast('🔧 보관대 '+(slot+1)+'에서 꺼냈습니다: '+g.body.def.name);
  saveGame();
  refreshPanel();
}
// 보관대 직렬화/역직렬화 (세이브용)
function serializeStash(st){ return st ? { body:st.body.def.id, atts:st.atts.map(m=>({d:m.inst.def.id, side:m.side, idx:m.idx, r:m.rot||0})) } : null; }
function loadStash(data){
  if(!data || !data.body || !ITEMS[data.body]) return null;
  const g = loadGun(data);
  return g.body ? { body:g.body, atts:g.atts } : null;
}
// 보관대 UI 렌더
function renderStash(rootEl){
  const open = stashSlots();
  const unlocked = !!State.stashUnlocked;
  // 해금 후: 열린 칸 + 다음 잠금 칸 1개 미리보기. 미해금: 잠금 칸 2개만 미리 보여줌.
  let show = unlocked
    ? Math.min(MAX_STASH, open + (open < MAX_STASH ? 1 : 0))
    : STASH_START;
  // 방어: 잠긴 칸에 이미 총이 들어있으면(구세이브 등) 그 칸까지 표시해 꺼낼 수 있게
  for(let i=MAX_STASH-1;i>=show;i--){ if(State.stash[i]){ show=i+1; break; } }
  const lbl = unlocked
    ? `🔫 총 보관대 <span class="stash-count">${open}/${MAX_STASH}칸</span>`
    : `🔫 총 보관대 <span class="stash-count locked">잠김 — 「사장님의 금고」 보상으로 개방</span>`;
  rootEl.innerHTML = `<div class="stash-label">${lbl}</div>`;
  const wrap = document.createElement('div');
  wrap.className = 'stash-slots';
  for(let i=0;i<show;i++){
    const st = State.stash[i];
    // 잠긴 칸이라도 총이 들어있으면(구세이브) 꺼낼 수 있게 열린 칸으로 취급
    const locked = i >= open && !st;
    const slot = document.createElement('div');
    slot.className = 'stash-slot' + (locked?' locked':(st?' filled':''));
    if(locked){
      slot.innerHTML = `<div class="ss-lock">🔒</div>
        <div class="ss-empty">확장 퀘스트<br>보상으로 개방</div>`;
    } else if(st){
      const s = gunStats({body:st.body, atts:st.atts});
      slot.innerHTML = `<div class="ss-emoji"></div>
        <div class="ss-name">${st.body.def.name}</div>
        <div class="ss-stat">⚔️${s.dmg} 🔁${Math.round(s.rpm)} 🎒${st.atts.length}</div>
        <button class="btn mini ss-btn" data-take="${i}">꺼내기</button>`;
      if(typeof itemIconEl==='function'){
        const ic = itemIconEl(st.body.def, 32, false);
        ic.style.margin = '0 auto 4px';
        slot.querySelector('.ss-emoji').appendChild(ic);
      } else {
        slot.querySelector('.ss-emoji').textContent = st.body.def.emoji;
      }
      attachTip(slot, st.body.def);
    } else {
      slot.innerHTML = `<div class="ss-empty">비어있음</div>
        <button class="btn mini ss-btn" data-put="${i}">현재 총 넣기</button>`;
    }
    wrap.appendChild(slot);
  }
  rootEl.appendChild(wrap);
  rootEl.querySelectorAll('[data-put]').forEach(b=>b.addEventListener('click', ()=>stashGun(+b.dataset.put)));
  rootEl.querySelectorAll('[data-take]').forEach(b=>b.addEventListener('click', ()=>unstashGun(+b.dataset.take)));
}

// ============================================================
// 작업대 UI
// ============================================================
const GS = 44;      // 작업대 몸통 셀 픽셀
const RAIL_T = 5;   // 레일 선 두께
const RAIL_G = 2;   // 레일 선 간격

let benchState = null; // {bodyRect, padEl}

function renderBench(rootEl){
  rootEl.innerHTML = '';
  rootEl.className = 'bench';
  const gun = editGun(); // 작업대 탭에서 선택된 총

  if(!gun.body){
    const ph = document.createElement('div');
    ph.className = 'bench-empty';
    ph.textContent = '총 몸통을 여기로 드래그하세요';
    rootEl.appendChild(ph);
    dropZones.push({el: rootEl, kind:'bench', rootEl});
    benchState = { rootEl };
    return;
  }

  const bd = gun.body.def;
  const PADX = 165, PADY = 150;
  const wrap = document.createElement('div');
  wrap.className = 'bench-wrap';
  wrap.style.width = (bd.bw*GS + PADX*2)+'px';
  wrap.style.height = (bd.bh*GS + PADY*2)+'px';
  rootEl.appendChild(wrap);

  // 몸통
  const bodyEl = document.createElement('div');
  bodyEl.className = 'bench-body';
  bodyEl.style.left = PADX+'px'; bodyEl.style.top = PADY+'px';
  bodyEl.style.width = bd.bw*GS+'px'; bodyEl.style.height = bd.bh*GS+'px';
  // 몸통 고유색을 진하게 채워 종류가 한눈에 구분되게 + 그 위에 격자선
  bodyEl.style.backgroundColor = bd.color;
  bodyEl.style.borderColor = bd.color;
  bodyEl.style.boxShadow = 'inset 0 0 0 2px rgba(255,255,255,.15), 0 2px 8px rgba(0,0,0,.5)';
  bodyEl.style.backgroundImage =
    'linear-gradient(90deg, rgba(0,0,0,.28) 1.5px, transparent 1.5px), linear-gradient(rgba(0,0,0,.28) 1.5px, transparent 1.5px)';
  bodyEl.style.backgroundSize = GS+'px '+GS+'px';
  const be = document.createElement('div');
  be.className = 'bench-body-emoji';
  if(typeof itemIconEl==='function'){
    const ic = itemIconEl(bd, 40, false);
    ic.style.margin = '0 auto';
    be.appendChild(ic);
  } else be.textContent = bd.emoji;
  bodyEl.appendChild(be);
  const bn = document.createElement('div');
  bn.className = 'bench-body-name'; bn.textContent = bd.name;
  bodyEl.appendChild(bn);
  const bodyToStore = ()=>{
    if(gun.atts.length>0){ toast('부착물을 먼저 떼어내세요!'); return; }
    const b = gun.body;
    if(State.storage.autoPlace(b)){ gun.body=null; if(typeof sfx==='function') sfx('drop'); refreshPanel(); }
    else if(State.backpack.autoPlace(b)){ gun.body=null; if(typeof sfx==='function') sfx('drop'); refreshPanel(); }
    else toast('창고·가방에 공간이 부족합니다!');
  };
  bodyEl.addEventListener('mousedown', e=>{
    if(e.button!==0) return;
    e.preventDefault(); e.stopPropagation();
    if(gun.atts.length>0){ toast('부착물을 먼저 떼어내세요!'); return; }
    if(e.ctrlKey || e.metaKey){ bodyToStore(); return; } // Ctrl/Cmd+클릭 → 창고로
    armDrag(gun.body, {kind:'gunbody'}, e, CS);
  });
  bodyEl.addEventListener('contextmenu', e=>{ if(e.ctrlKey||e.metaKey){ e.preventDefault(); e.stopPropagation(); bodyToStore(); } });
  attachTip(bodyEl, bd);
  wrap.appendChild(bodyEl);

  // 레일 — 글자 없는 얇은 색선 (몸통 가장자리에 밀착)
  const sideRails = {top:[], bottom:[], front:[], back:[]};
  for(const r of bd.rails) sideRails[r.side].push(r);
  const railEls = [];
  for(const side of ['top','bottom','front','back']){
    sideRails[side].forEach((r, sti)=>{
      const el = document.createElement('div');
      el.className = 'rail';
      el.style.background = SOCK_INFO[r.type].color;
      if(side==='top'){
        el.style.left = (PADX + r.from*GS+1)+'px';
        el.style.top = (PADY - (sti+1)*(RAIL_T+RAIL_G))+'px';
        el.style.width = (r.len*GS-2)+'px'; el.style.height = RAIL_T+'px';
      } else if(side==='bottom'){
        el.style.left = (PADX + r.from*GS+1)+'px';
        el.style.top = (PADY + bd.bh*GS + RAIL_G + sti*(RAIL_T+RAIL_G))+'px';
        el.style.width = (r.len*GS-2)+'px'; el.style.height = RAIL_T+'px';
      } else if(side==='front'){ // 오른쪽
        el.style.left = (PADX + bd.bw*GS + RAIL_G + sti*(RAIL_T+RAIL_G))+'px';
        el.style.top = (PADY + r.from*GS+1)+'px';
        el.style.width = RAIL_T+'px'; el.style.height = (r.len*GS-2)+'px';
      } else { // back = 왼쪽
        el.style.left = (PADX - (sti+1)*(RAIL_T+RAIL_G))+'px';
        el.style.top = (PADY + r.from*GS+1)+'px';
        el.style.width = RAIL_T+'px'; el.style.height = (r.len*GS-2)+'px';
      }
      el._rail = r;
      wrap.appendChild(el);
      railEls.push(el);
    });
  }

  // 장착된 부착물 — 몸통에 딱 붙여 테트리스처럼 격자에 맞물림
  for(const m of gun.atts){
    const ad = m.inst.def;
    const cells = shapeOf(ad, m.rot||0);
    const local = mountLocalCells(cells, m.side);
    const [lw,lh] = shapeSize(local);
    const el = buildShapeEl(local, ad, GS);
    let lx, ly;
    if(m.side==='top'){ lx = PADX + m.idx*GS; ly = PADY - lh*GS; }
    else if(m.side==='bottom'){ lx = PADX + m.idx*GS; ly = PADY + bd.bh*GS; }
    else if(m.side==='front'){ lx = PADX + bd.bw*GS; ly = PADY + m.idx*GS; }
    else { lx = PADX - lw*GS; ly = PADY + m.idx*GS; }
    el.style.left = lx+'px'; el.style.top = ly+'px';
    const detachToStore = ()=>{
      const i = editGun().atts.findIndex(x=>x.inst.uid===m.inst.uid);
      if(i<0) return;
      m.inst.rot = 0;
      if(State.storage.autoPlace(m.inst)){ editGun().atts.splice(i,1); if(typeof sfx==='function') sfx('drop'); refreshPanel(); }
      else if(State.backpack.autoPlace(m.inst)){ editGun().atts.splice(i,1); if(typeof sfx==='function') sfx('drop'); refreshPanel(); }
      else toast('창고·가방에 공간이 부족합니다!');
    };
    el.addEventListener('mousedown', e=>{
      if(e.button!==0) return;
      e.preventDefault(); e.stopPropagation();
      if(e.ctrlKey || e.metaKey){ detachToStore(); return; } // Ctrl/Cmd+클릭 → 창고로
      m.inst.rot = m.rot||0;
      armDrag(m.inst, {kind:'gun'}, e, CS);
    });
    el.addEventListener('contextmenu', e=>{ if(e.ctrlKey||e.metaKey){ e.preventDefault(); e.stopPropagation(); detachToStore(); } });
    wrap.appendChild(el);
  }

  // 소켓 색 범례
  const legend = document.createElement('div');
  legend.className = 'bench-legend';
  legend.innerHTML = Object.entries(SOCK_INFO).map(([k,v])=>
    `<span style="color:${v.color}"><i style="background:${v.color}"></i>${v.name}</span>`).join('');
  rootEl.appendChild(legend);

  dropZones.push({el: rootEl, kind:'bench', rootEl, wrap, bodyEl, bd, PADX, PADY});
  benchState = { rootEl, wrap, bodyEl, bd, railEls };
}

// 드래그 중 작업대 후보 계산
function benchCandidate(zone, d, mx, my){
  const def = d.inst.def;
  // 몸통 교체
  if(def.kind==='body'){
    const r = zone.rootEl.getBoundingClientRect();
    if(mx<r.left||mx>r.right||my<r.top||my>r.bottom) return null;
    const eg = editGun();
    const ok = eg.atts.length===0 && (!eg.body || eg.body.uid!==d.inst.uid);
    return {kind:'bench', type:'body', zone, ok};
  }
  if(def.kind!=='att' || !zone.bodyEl || !editGun().body) return null;
  const br = zone.bodyEl.getBoundingClientRect();
  const bd = zone.bd;
  const M = 175; // 몸통 주변 마진
  if(mx<br.left-M || mx>br.right+M || my<br.top-M || my>br.bottom+M) return null;

  // 커서 위치로 변 결정
  let side;
  if(my < br.top && mx>br.left-M && mx<br.right+M) side='top';
  else if(my > br.bottom && mx>br.left-M && mx<br.right+M) side='bottom';
  else if(mx > br.right) side='front';
  else if(mx < br.left) side='back';
  else { // 몸통 위에 있으면 소켓 타입에 따라 추정
    side = def.sock==='scope' ? 'top' : def.sock==='muzzle' ? 'front'
         : def.sock==='stock' ? 'back' : 'bottom';
  }
  const cells = shapeOf(def, d.rot);
  const aW = Math.max(...cells.map(c=>c[0]))+1;
  const horiz = (side==='top'||side==='bottom');
  const along = horiz ? (mx - br.left)/GS : (my - br.top)/GS;
  let idx = Math.round(along - aW/2);
  // 근처에서 유효한 위치 탐색
  const tryOrder = [0,-1,1,-2,2,-3,3];
  let found = null;
  for(const off of tryOrder){
    if(canMount(editGun(), def, side, idx+off, d.rot, d.inst)){ found = idx+off; break; }
  }
  const ok = found!==null;
  if(ok) idx = found; else idx = clamp(idx, 0, Math.max(0, sideLen(bd, side)-1));
  return {kind:'bench', type:'mount', zone, side, idx, rot:d.rot, ok};
}

// 드래그 중 레일 하이라이트
function benchHighlight(d){
  if(!benchState || !benchState.railEls) return;
  for(const el of benchState.railEls){
    const r = el._rail;
    const active = d && d.inst.def.kind==='att' && d.inst.def.sock===r.type;
    el.classList.toggle('hl', !!active);
  }
}

// ---- 스탯 패널 ----
function statsHTML(gun){
  const s = gunStats(gun);
  const fireName = s.fire==='laser'?'🔴 레이저':s.fire==='flame'?'🔥 화염'
    :s.fire==='dart'?'🦟 독다트':s.fire==='glue'?'🫧 끈끈이':s.fire==='ice'?'🧊 냉기'
    :s.fire==='shock'?'⚡ 감전':null;
  const rows = [
    ['공격력', s.dmg + (s.pellets>1? ' ×'+s.pellets+'발':'')],
    ['연사속도', Math.round(s.rpm)+' rpm'],
    ['탄퍼짐', s.spread.toFixed(1)+'°'],
    ['반동', s.recoil.toFixed(1) + (s.recoil>=15?' ⚠️':'')],
    ['장탄수', s.ammo + (s.ammoCost>1? ' (소모'+s.ammoCost+')':'')],
    ['재장전', s.reload.toFixed(1)+'초'],
    ['소음', s.noise + (s.noise>400?' ⚠️':'')],
    ['줌', '×'+s.zoom.toFixed(1)],
    ['조준속도', '×'+s.aim.toFixed(2)],
  ];
  if(fireName) rows.unshift(['발사', fireName]);
  if(s.pierce>0) rows.push(['관통', String(s.pierce)]);
  if(s.burn>0) rows.push(['화상', s.burn.toFixed(1)+'초']);
  if(s.poison>0) rows.push(['독', s.poison.toFixed(1)+'초']);
  if(s.slow>0) rows.push(['둔화', s.slow.toFixed(1)+'초']);
  if(s.stun>0) rows.push(['기절', s.stun.toFixed(2)+'초']);
  if(s.chain>0) rows.push(['체인', s.chain+'명']);
  if(s.knock>1) rows.push(['넉백', '×'+s.knock.toFixed(1)]);
  if(s.rangeMul!==1) rows.push(['사거리', '×'+s.rangeMul.toFixed(2)]);
  if(s.light>0) rows.push(['라이트','+'+Math.round(s.light*100)+'%']);
  if(s.extractDetect) rows.push(['탐지','📡 탈출구 방향']);
  return `<div class="stats-title">${gun.body ? gun.body.def.emoji+' '+s.name : '총 없음'}${s.cls?` <span class="stats-cls">${s.cls}</span>`:''}</div>`
    + rows.map(r=>`<div class="stat-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}

// ============================================================
// 인게임 총 렌더 (엔터 더 건전 스타일 — 캐릭터가 조립총을 들고 있음)
// ============================================================
function drawGunWorld(ctx, gun, px, py, ang, flash, spin, kick){
  if(!gun.body) return;
  const bd = gun.body.def;
  const S = 7.5; // 월드 총 셀 픽셀
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  if(spin){ // 재장전 트월링 (총 중심 기준 회전)
    const scx = 10 + bd.bw*S/2;
    ctx.translate(scx, 0); ctx.rotate(spin); ctx.translate(-scx, 0);
  }
  const gx = 10 - (kick||0)*5, gy = -bd.bh*S/2; // 반동 킥백

  // 부착물 (몸통 뒤에 깔리는 것 먼저) — 장착 회전에 따른 footprint 반영
  for(const m of gun.atts){
    const ad = m.inst.def;
    const cells = shapeOf(ad, m.rot||0);
    const aW = Math.max(...cells.map(c=>c[0]))+1;
    const dD = Math.max(...cells.map(c=>c[1]))+1;
    const d = dD*4;
    ctx.fillStyle = SOCK_INFO[ad.sock].color;
    if(m.side==='top')
      rrect(ctx, gx+m.idx*S+1, gy-d, aW*S-2, d, 2);
    else if(m.side==='bottom')
      rrect(ctx, gx+m.idx*S+1, gy+bd.bh*S, aW*S-2, d, 2);
    else if(m.side==='front')
      rrect(ctx, gx+bd.bw*S, gy+m.idx*S+1, d, aW*S-2, 2);
    else
      rrect(ctx, gx-d, gy+m.idx*S+1, d, aW*S-2, 2);
  }

  // 몸통 (어두운 외곽선으로 배경과 분리 → 색 구분이 또렷)
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  rrect(ctx, gx-1.5, gy-1.5, bd.bw*S+3, bd.bh*S+3, 4);
  ctx.fillStyle = bd.color;
  rrect(ctx, gx, gy, bd.bw*S, bd.bh*S, 3);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  rrect(ctx, gx, gy+bd.bh*S*0.55, bd.bw*S, bd.bh*S*0.45, 2);

  // 총구 화염 (도트 블롭)
  if(flash>0){
    ctx.globalAlpha = Math.min(1, flash*8);
    const fr = Math.round(4 + flash*14);
    pBlob(gx+bd.bw*S+5, gy+bd.bh*S/2, fr, '#ffd76a');
    pBlob(gx+bd.bw*S+7, gy+bd.bh*S/2, Math.max(1, fr-2), '#fff2b0');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// 픽셀 톤: 둥근 모서리 무시, 정수 격자 박스만 (도트 통일)
function rrect(ctx, x, y, w, h, r){
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
