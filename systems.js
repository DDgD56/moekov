// ============================================================
// MoeKov — 시스템 (인터랙트·퀵슬롯·탈출/사망)
// ============================================================

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
  player.x = 11*TILE; player.y = 13.5*TILE;
  player.hp = maxHp();
  closePanel();
  playMusic('cave');
  saveGame();
}
function startRaid(){
  closePanel();
  buildRaid();
  scene = 'raid';
  playMusic('dayRaid');
  toast('🚩 표시된 탈출 지점으로 이동해 탈출하세요. 밤이 되면... 조심하세요.');
}
