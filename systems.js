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
  const foods = State.backpack.items
    .filter(it=>it.inst.def.kind==='food' && (it.inst.def.heal||0)>0)
    .sort((a,b)=>a.inst.def.heal-b.inst.def.heal);
  if(!foods.length){ toast('먹을 것이 없다!'); return; }
  let chosen = foods.find(f=>f.inst.def.heal>=missing) || foods[foods.length-1];
  eatItem(chosen.inst);
}
// 소모품 사용 (음식 회복 / 휴대용 탐지기 등). from: 'bag'|'qslot'
// 성공 시 true (아이템 소모 완료)
function applyConsumable(inst){
  const d = inst.def;
  if(d.effect==='extractDetect'){
    if(scene!=='raid' || !raid || raid.over){
      toast('레이드 중에만 쓸 수 있다');
      return false;
    }
    const dur = d.effectDur||10;
    player.extractDetectT = Math.max(player.extractDetectT||0, dur);
    player.extractHintIntro = false; // 소모 탐지기는 입문 라벨 아님
    sfx('open');
    toast(d.emoji+' '+d.name+' 가동! '+dur+'초간 탈출구 방향 표시');
    return true;
  }
  // 기본: 체력 회복
  if(!(d.heal>0)){ toast('사용할 수 없다'); return false; }
  if(player.hp >= maxHp()){ toast('체력이 가득 찼습니다'); return false; }
  player.hp = Math.min(maxHp(), player.hp + d.heal);
  sfx('eat');
  toast(d.emoji+' '+d.name+' 사용! 체력 +'+d.heal);
  return true;
}
function eatItem(inst){
  if(!applyConsumable(inst)) return;
  State.backpack.remove(inst);
  refreshPanel();
}

// ---------------- 퀵슬롯 ----------------
function eatSlot(i){
  const it = State.qslots[i];
  if(!it) return;
  if(!applyConsumable(it)) return;
  State.qslots[i] = null;
  renderQslots();
}
function renderQslots(){
  document.querySelectorAll('#qslots .qslot').forEach((el,i)=>{
    const it = State.qslots[i];
    el.classList.toggle('filled', !!it);
    const slot = el.querySelector('.qs-emoji');
    slot.innerHTML = '';
    if(it && typeof itemIconEl==='function'){
      const ic = itemIconEl(it.def, 28, false);
      ic.style.margin = '0 auto';
      slot.appendChild(ic);
    } else {
      slot.textContent = it ? it.def.emoji : '';
    }
    const label = !it ? ''
      : it.def.effect==='extractDetect' ? (it.def.effectDur||10)+'s'
      : '+'+it.def.heal;
    el.querySelector('.qs-heal').textContent = label;
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
// 이번 판 요약 + 누적 기록 갱신 (extract: 탈출 여부)
function buildRunSummary(extracted){
  const R = State.records || (State.records = {});
  const lootGain = extracted ? Math.max(0, State.backpack.totalValue() - (raid.lootVal0||0)) : 0;
  const sum = {
    kills: player.kills,
    dmg: Math.round((raid.stats&&raid.stats.dmg)||0),
    shots: (raid.stats&&raid.stats.shots)||0,
    coins: player.coinsGained,
    lootGain,
    time: Math.floor(raid.time),
    newKills: false, newCoins: false, newLoot: false,
  };
  R.totalRaids = (R.totalRaids||0)+1;
  R.totalKills = (R.totalKills||0)+sum.kills;
  if(extracted) R.totalExtracts = (R.totalExtracts||0)+1;
  else R.totalDeaths = (R.totalDeaths||0)+1;
  if(sum.kills > (R.bestKills||0)){ R.bestKills = sum.kills; sum.newKills = sum.kills>0; }
  if(extracted && sum.coins > (R.bestCoins||0)){ R.bestCoins = sum.coins; sum.newCoins = sum.coins>0; }
  if(extracted && sum.lootGain > (R.bestLoot||0)){ R.bestLoot = sum.lootGain; sum.newLoot = sum.lootGain>0; }
  return sum;
}
function onExtract(){
  raid.over = true;
  State.coins += player.coinsGained;
  // 탈출 전 잠긴 지역 → 탈출 기록 후 새로 열린 지역 감지
  const wasLocked = REGION_ORDER.filter(id=>!regionUnlocked(id));
  const rid = raid.region;
  State.regionExtracts[rid] = (State.regionExtracts[rid]||0) + 1;
  const newly = wasLocked.filter(id=>regionUnlocked(id));
  // 일반·엑조틱 슬롯 모두 탈출 진행 (동시 진행)
  for(const q of [State.quest, State.exoQuest]){
    if(!q || q.def.type!=='extract' || q.prog>=q.def.n) continue;
    if(!q.def.region || q.def.region===rid){
      q.prog++;
      const tag = (q.def.unlock==='exoticIntro') ? '🔧 부품 수집가' : '📜 창구';
      if(q.prog>=q.def.n) toast(tag+' 퀘스트 목표 달성! 보고하세요');
    } else if(q===State.quest){
      toast('📜 이 탈출은 「'+(REGIONS[q.def.region]?.name||q.def.region)+'」 전용 의뢰에는 안 셈');
    }
  }
  // 폐공장 첫 해금 시 부품 수집가 NPC 안내
  if(newly.includes('factory') && !State.exoticIntroDone){
    toast('🔧 케이브 「부품 수집가」가 이상한 일을 맡긴다 (작업대 옆)', 4000);
  }
  sfx('extract');
  mouse.down = false;
  openPanel('extract', {newly, sum: buildRunSummary(true)});
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
    const e = {d:it.inst.def.id, r:it.inst.rot};
    if(it.inst.dur!=null) e.du = it.inst.dur;
    cacheItems.push(e);
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
  // 착용 장비도 그 자리에 떨어뜨림 (내구도 유지)
  for(const slot of ['head','body']){
    const gEq = State.gear[slot];
    if(gEq){
      const e = {d:gEq.def.id, r:0};
      if(gEq.dur!=null) e.du = gEq.dur;
      cacheItems.push(e);
      lost.push(gEq.def.emoji+' '+gEq.def.name);
      State.gear[slot] = null;
    }
  }
  State.backpack.items = [];
  State.qslots = [null,null,null];
  State.activeGun = 0;
  State.deathCache = cacheItems.length
    ? {
        items: cacheItems,
        x: Math.round(player.x),
        y: Math.round(player.y),
        region: (raid && raid.region) || State.region || 'hill',
      }
    : null;
  renderQslots();
  // 몸통이 하나도 없으면 창구에서 무료 지급받도록 안내 (자동 지급 X)
  const needBody = !hasAnyBody();
  openPanel('death', {lost, needBody, sum: buildRunSummary(false)});
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
  player.extractDetectT = 0;
  player.extractHintIntro = false;
  player.corpseDetectT = 0;
  closePanel();
  playMusic('cave');
  saveGame();
}
function startRaid(){
  closePanel();
  buildRaid();
  scene = 'raid';
  playMusic('dayRaid');
  // 이변 안내 (시체 토스트와 겹치지 않게 지연)
  if(raid && raid.mod){
    const md = raid.mod;
    setTimeout(()=>{ if(raid && raid.mod===md) toast(md.emoji+' 이변: '+md.name+' — '+md.desc, 4000); },
      (player.corpseDetectT>0 || player.extractHintIntro) ? 2800 : 500);
  }
  if(raid && raid._corpseLostOtherRegion){
    toast('💀 다른 지역 출격으로 시체가 사라졌다...');
  } else if(player.corpseDetectT > 0){
    toast('💀 30초간 시체 위치를 표시합니다. 같은 지역에서만 회수할 수 있습니다.');
  } else if(player.extractHintIntro){
    toast('🚪 5초간 탈출구 방향을 표시합니다. 표시된 지점으로 이동해 탈출하세요.');
  } else {
    toast('🚩 표시된 탈출 지점으로 이동해 탈출하세요. 밤이 되면... 조심하세요.');
  }
}
