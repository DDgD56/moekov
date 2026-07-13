// ============================================================
// MoeKov — UI (패널·업그레이드·퀘스트)
// ============================================================

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
    benchIdx = State.activeGun; // 전투 중엔 들고 있는 총을 바로 정비
    p.classList.add('xwide');
    p.innerHTML = `
      <div class="panel-title">${c.ct.emoji} ${c.ct.name}</div>
      <div class="panel-cols bench-cols">
        <div class="col"><div class="col-label">${c.ct.name} <button class="btn mini" id="takeall">📥 모두 담기</button></div><div id="ga"></div>
          <div class="discard-zone" id="dz">🗑 여기로 드래그 → 바닥에 버리기</div></div>
        <div class="col"><div class="col-label">🎒 내 가방</div><div class="gear-row" id="gearRow"></div><div id="gb"></div></div>
        <div class="col bench-col"><div class="col-label">🔫 들고 있는 총 — 실시간 정비</div><div id="bench"></div></div>
      </div>
      <div class="panel-hint">드래그 이동 · <b>R</b> 회전 · <b>더블클릭</b> 빠른 이동 · 부품을 총에 드래그하면 <b>즉시 장착</b> · <b>WASD/ESC</b> 닫기<br>
      <span class="warn">🔍 창을 열어둔 동안 2초마다 하나씩 식별 · ⚠️ 그동안에도 적은 다가온다!</span></div>`;
    renderGrid(p.querySelector('#ga'), c.inv, { rerender:refreshPanel, quickTarget:State.backpack, onDbl:inst=>{ quickTransfer(inst,c.inv,State.backpack); refreshPanel(); } });
    renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, quickTarget:c.inv, onDbl:inst=>{
      if(inst.def.kind==='food') eatItem(inst);
      else { quickTransfer(inst,State.backpack,c.inv); refreshPanel(); }
    }});
    renderGearRow(p.querySelector('#gearRow'));
    renderBench(p.querySelector('#bench'));
    dropZones.push({el:p.querySelector('#dz'), kind:'discard'});
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
    if(scene==='raid'){
      // 전투 중 Tab: 가방 + 들고 있는 총 정비 + 버리기
      benchIdx = State.activeGun;
      p.classList.add('xwide');
      p.innerHTML = `
        <div class="panel-title">🎒 내 가방 <span class="sub">(가치 ${State.backpack.totalValue()}🪙)</span></div>
        <div class="panel-cols bench-cols">
          <div class="col"><div class="gear-row" id="gearRow"></div><div id="gb"></div>
            <div class="discard-zone" id="dz">🗑 여기로 드래그 → 바닥에 버리기</div></div>
          <div class="col bench-col"><div class="col-label">🔫 들고 있는 총 — 실시간 정비</div><div id="bench"></div></div>
          <div class="col stats-col" id="gs"></div>
        </div>
        <div class="panel-hint"><b>더블클릭</b> 음식 사용 · <b>R</b> 회전 · 부품 드래그로 <b>즉시 장착/해체</b> · <b>Tab/ESC</b> 닫기</div>`;
      renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, onDbl:inst=>{
        if(inst.def.kind==='food') eatItem(inst);
      }});
      renderGearRow(p.querySelector('#gearRow'));
      renderBench(p.querySelector('#bench'));
      dropZones.push({el:p.querySelector('#dz'), kind:'discard'});
      p.querySelector('#gs').innerHTML = statsHTML(editGun());
    } else {
      p.innerHTML = `
        <div class="panel-title">🎒 내 가방 <span class="sub">(가치 ${State.backpack.totalValue()}🪙)</span></div>
        <div class="panel-cols">
          <div class="col"><div class="gear-row" id="gearRow"></div><div id="gb"></div></div>
          <div class="col stats-col" id="gs"></div>
        </div>
        <div class="panel-hint"><b>더블클릭</b> 음식 사용 / 장비 착용 · <b>R</b> 회전 · <b>Tab/ESC</b> 닫기</div>`;
      renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, onDbl:inst=>{
        if(inst.def.kind==='food' && scene==='raid') eatItem(inst);
      }});
      renderGearRow(p.querySelector('#gearRow'));
      p.querySelector('#gs').innerHTML = statsHTML(curGun());
    }
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
      <div class="stash-row" id="stashRow"></div>
      <div class="panel-cols bench-cols">
        <div class="col">
          <div class="col-label">창고</div>
          <div class="sock-filter" id="sockFilter">
            <button class="sf-btn ${benchFilter===null?'on':''}" data-f="">전체</button>
            <button class="sf-btn ${benchFilter==='body'?'on':''}" data-f="body" style="--sc:#c96a5a">총기</button>
            ${Object.entries(SOCK_INFO).map(([k,v])=>
              `<button class="sf-btn ${benchFilter===k?'on':''}" data-f="${k}" style="--sc:${v.color}">${v.name}</button>`).join('')}
            <button class="sf-btn ${benchFilter==='loot'?'on':''}" data-f="loot" style="--sc:#d4a832">귀중품</button>
            <button class="sf-btn ${benchFilter==='food'?'on':''}" data-f="food" style="--sc:#d488a8">음식</button>
          </div>
          <div id="ga"></div>
        </div>
        <div class="col bench-col">
          <div id="bench"></div>
        </div>
        <div class="col"><div class="col-label">🎒 내 가방 <button class="btn mini" id="tostore">📦 전부 창고로</button></div><div id="gb"></div>
          <div class="col stats-col" id="gs"></div>
        </div>
      </div>
      <div class="panel-hint">몸통/부착물을 <b>드래그</b>해서 조립 · 드래그 중 <b>R</b> 회전 ·
      맞는 소켓에 <b>1칸만 걸쳐도</b> 장착 · <b>Ctrl(⌘)+클릭</b>으로 부품/총 즉시 창고 이동 · 🔫 보관대로 총 통째로 넣었다 뺐다 · <b>ESC</b> 닫기</div>`;
    renderGrid(p.querySelector('#ga'), State.storage, { rerender:refreshPanel, quickTarget:State.backpack, highlightSock:benchFilter, onDbl:inst=>{ quickTransfer(inst,State.storage,State.backpack); refreshPanel(); } });
    renderGrid(p.querySelector('#gb'), State.backpack, { rerender:refreshPanel, quickTarget:State.storage, highlightSock:benchFilter, onDbl:inst=>{ quickTransfer(inst,State.backpack,State.storage); refreshPanel(); } });
    renderBench(p.querySelector('#bench'));
    p.querySelectorAll('#sockFilter .sf-btn').forEach(b=>b.addEventListener('click', ()=>{
      const s = b.dataset.f || null;
      benchFilter = (benchFilter===s) ? null : s; // 같은 버튼 다시 누르면 전체로
      refreshPanel();
    }));
    p.querySelector('#gs').innerHTML = statsHTML(editGun());
    renderStash(p.querySelector('#stashRow'));
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
      const cur = State.up[key]||0, next = u.tiers[cur+1];
      const afford = next && State.coins>=next.cost && matsOK(next.mats);
      const curL = upgradeTierLabel(key, u.tiers[cur]);
      const nextL = next ? upgradeTierLabel(key, next) : '';
      const note = next && next.note ? ` <span class="up-note">[${next.note}]</span>` : '';
      rows += `<div class="up-row">
        <span class="up-emoji">${u.emoji}</span>
        <span class="up-name">${u.name} <small class="sub">Lv.${cur}/${u.tiers.length-1}</small><br>
          <small>${curL}${next? ' → '+nextL:''}${note}</small>
          ${next ? matsHTML(next.mats) : ''}</span>
        ${next ? `<button class="btn" data-up="${key}" ${afford?'':'disabled'}>${next.cost}🪙</button>`
               : '<span class="up-max">MAX</span>'}
      </div>`;
    }
    p.innerHTML = `
      <div class="panel-title">📌 업그레이드 <span class="sub">🪙 ${State.coins}</span></div>
      <div class="up-list">${rows}</div>
      <div class="panel-hint">고티어 재료는 <b>폐공장·황금 습지</b> 루트 · 창고/가방에서 자동 차감 · <b>ESC</b> 닫기</div>`;
    p.querySelectorAll('[data-up]').forEach(btn=>{
      btn.addEventListener('click', ()=>buyUpgrade(btn.dataset.up));
    });
  }
  else if(t==='quest'){
    // 일반 퀘스트 창구 — 엑조틱은 State.exoQuest / 부품 수집가 전용 (동시 진행)
    const q = State.quest;
    let body = '';
    const noEquipped = State.guns.every(g=>!g.body);
    const noBody = !hasAnyBody();
    if(noBody){
      body += `<div class="quest-card relief">
        <div class="npc-line">"또 빈손으로 왔군... 이거라도 받아가라. 다음엔 조심해."</div>
        <div class="q-title">🥔 감자 권총 지급</div>
        <div class="q-desc">총기 몸통을 모두 잃었을 때 창구에서 무료로 받을 수 있다.</div>
        <div class="q-btns"><button class="btn" id="relief">받기</button></div>
      </div>`;
    } else if(noEquipped){
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
          <div class="q-reward">${questRewardHTML(d)}</div>
          <div class="q-btns">
            ${can?'<button class="btn" id="qdone">완료 보고</button>':''}
            <button class="btn danger" id="qdrop">포기</button>
          </div>
        </div>`;
    } else {
      ensureOffers();
      body += `<div class="npc-line">"${pick(NPC_LINES.greet)}"</div>` +
        (State.questOffers||[]).map((d,i)=>`
        <div class="quest-card">
          <div class="q-title">📜 ${d.title}</div>
          <div class="q-desc">${questDesc(d)}</div>
          ${d.blurb?`<div class="q-desc">${d.blurb}</div>`:''}
          ${d.fetch?`<div class="q-desc">+ 납품: <span class="q-item" data-item="${d.fetch.item}">${ITEMS[d.fetch.item].emoji} ${ITEMS[d.fetch.item].name}</span> ${d.fetch.n}개</div>`:''}
          <div class="q-reward">${questRewardHTML(d)}</div>
          <div class="q-btns"><button class="btn" data-q="${i}">수락</button></div>
        </div>`).join('');
    }
    p.innerHTML = `
      <div class="panel-title">📜 퀘스트 창구 <span class="sub">완료 ${State.questsDone||0}건</span></div>
      <div class="quest-body">${body}</div>
      <div class="panel-hint"><b>ESC</b> 닫기</div>`;
    if(q){
      const qd = p.querySelector('#qdone');
      if(qd) qd.addEventListener('click', ()=>completeQuest('main'));
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
  else if(t==='shop'){
    renderShopPanel(p);
  }
  else if(t==='exotic'){
    // 🔧 부품 수집가 — 엑조틱 입문 의뢰 전용
    renderExoticPanel(p);
  }
  else if(t==='deploy'){
    p.classList.add('wide');
    const dc = State.deathCache;
    const hasCorpse = !!(dc && dc.items && dc.items.length);
    const corpseRegion = hasCorpse ? (dc.region || State.region) : null;
    const cards = REGION_ORDER.map(id=>{
      const rg = REGIONS[id];
      const unlocked = regionUnlocked(id);
      const stars = '★'.repeat(rg.stars) + '☆'.repeat(4-rg.stars);
      const ext = State.regionExtracts[id]||0;
      const bossClear = State.regionBoss[id];
      const sel = State.region===id ? ' sel' : '';
      const corpseHere = hasCorpse && corpseRegion===id;
      return `<div class="region-card${unlocked?'':' locked'}${sel}${corpseHere?' has-corpse':''}" data-region="${id}">
        <div class="rg-emoji">${rg.emoji}</div>
        <div class="rg-info">
          <div class="rg-name">${rg.name} <span class="rg-stars">${stars}</span>${corpseHere?' <span class="rg-corpse">💀 시체</span>':''}</div>
          <div class="rg-desc">${rg.desc}</div>
          <div class="rg-stat">🪙 보상 ×${rg.coinMul} · ☀️ 낮 ${rg.dayLen}초${rg.boss?` · 👑 ${(ENEMY_TYPES[rg.bossId]||{}).name||'보스'}`:''} · 탈출 ${ext}회${bossClear?' · 👑✔':''}</div>
          ${corpseHere ? '<div class="rg-corpse-hint">💀 지난 사망 시체가 이 지역에 있습니다 (출격 시 30초 표시)</div>' : ''}
          ${unlocked ? '' : `<div class="rg-lock">🔒 ${rg.unlockDesc||'잠김'}</div>`}
        </div>
      </div>`;
    }).join('');
    const corpseWarn = hasCorpse
      ? (corpseRegion===State.region
        ? `<p class="deploy-corpse ok">💀 시체가 <b>${REGIONS[corpseRegion]?REGIONS[corpseRegion].name:corpseRegion}</b>에 있습니다. 출격 시 30초간 위치를 표시합니다.</p>`
        : `<p class="deploy-corpse warn">⚠ 시체는 <b>${REGIONS[corpseRegion]?REGIONS[corpseRegion].emoji+' '+REGIONS[corpseRegion].name:corpseRegion}</b>에 있습니다. <b>다른 지역 출격 시 시체가 사라집니다.</b></p>`)
      : '';
    p.innerHTML = `
      <div class="panel-title">🚪 출격 — 지역 선택</div>
      <div class="region-list">${cards}</div>
      ${corpseWarn}
      <p class="deploy-tips">🚩 탈출구를 직접 찾아 3초 대기 · 💀 죽으면 가방·장착 총 상실(같은 지역 다음 출격에서 회수, 다른 지역 가면 소멸)</p>
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
      if(hasCorpse && corpseRegion && corpseRegion!==State.region){
        const nm = REGIONS[corpseRegion] ? REGIONS[corpseRegion].name : corpseRegion;
        if(!confirm('시체가 '+nm+'에 있습니다. 다른 지역 출격 시 시체가 사라집니다. 계속할까요?')) return;
      }
      startRaid();
    });
  }
  else if(t==='extract'){
    const newly = (panel.data && panel.data.newly) || [];
    const sum = panel.data && panel.data.sum;
    const unlockHtml = newly.length ? newly.map(id=>
      `<p class="rg-unlocked">🎉 새 지역 해금: <b>${REGIONS[id].emoji} ${REGIONS[id].name}</b>!</p>`).join('') : '';
    const exoHint = newly.includes('factory') && !State.exoticIntroDone
      ? `<p class="rg-unlocked">🔧 <b>부품 수집가</b> 해금 (작업대 옆) — 공장 탈출 시 ★★ 레이저</p>` : '';
    p.innerHTML = `
      <div class="panel-title">✅ 탈출 성공!</div>
      <div class="deploy-body">
        ${unlockHtml}
        ${exoHint}
        ${sum ? runSummaryHTML(sum, true) : ''}
        <button class="btn big" id="home">케이브로 돌아가기 🏠</button>
      </div>`;
    p.querySelector('#home').addEventListener('click', returnToCave);
  }
  else if(t==='death'){
    const lost = panel.data.lost;
    const dsum = panel.data && panel.data.sum;
    p.innerHTML = `
      <div class="panel-title dead">💀 사망...</div>
      <div class="deploy-body">
        ${dsum ? runSummaryHTML(dsum, false) : ''}
        <p>총과 가방을 모두 그 자리에 떨어뜨렸다:</p>
        <p class="lost-list">${lost.length? lost.join(', ') : '(없음)'}</p>
        <p>💀 <b>같은 지역</b> 다음 출격에서 쓰러진 자리를 찾아가면 회수할 수 있다.<br>
        <small>출격 직후 30초간 시체 방향을 표시한다. 단 한 번뿐 — 그 판에 못 찾거나 <b>다른 지역</b>으로 가면 영영 사라진다. 창고는 무사하다.</small></p>
        ${panel.data.needBody ? '<p>🔫 총기 몸통이 하나도 없다. <b>퀘스트 창구</b>에 들러라 (❗ 표시).</p>' : ''}
        <button class="btn big" id="home">케이브로 돌아가기 🏠</button>
      </div>`;
    p.querySelector('#home').addEventListener('click', returnToCave);
  }
  else if(t==='help'){
    p.innerHTML = `
      <div class="panel-title">🎀 MoeKov — 조작법</div>
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

// 업그레이드 티어 표시 (JSON 테이블 — desc 함수 없음)
// 이번 판 요약 HTML (탈출/사망 공용)
function runSummaryHTML(sum, extracted){
  const mm = Math.floor(sum.time/60), ss = String(sum.time%60).padStart(2,'0');
  const rec = t=>` <span class="run-new">★신기록</span>`;
  const R = State.records||{};
  return `
    <div class="run-stats">
      <div>💀 처치 <b>${sum.kills}</b>${sum.newKills?rec():''}</div>
      <div>⚔️ 입힌 피해 <b>${sum.dmg}</b></div>
      <div>🔫 발사 <b>${sum.shots}</b></div>
      <div>⏱ 생존 <b>${mm}:${ss}</b></div>
      <div>🪙 ${extracted?'주운 코인':'놓친 코인'} <b>${sum.coins}</b>${sum.newCoins?rec():''}</div>
      ${extracted
        ? `<div>🎒 루팅 이득 <b>+${sum.lootGain}</b>${sum.newLoot?rec():''}</div>`
        : `<div>🎒 가방 <b>전부 상실</b></div>`}
    </div>
    <div class="run-records">누적 — 출격 ${R.totalRaids||0} · 탈출 ${R.totalExtracts||0} · 사망 ${R.totalDeaths||0} · 총 처치 ${R.totalKills||0}</div>`;
}

// 착용 장비 줄 (가방 패널): 슬롯 클릭 → 가방으로 해제
function renderGearRow(rootEl){
  if(!rootEl) return;
  const slots = [['head','🪖 머리'],['body','🦺 몸통']];
  rootEl.innerHTML = slots.map(([s,label])=>{
    const g = State.gear[s];
    return `<div class="gear-slot ${g?'filled':''}" data-slot="${s}" title="${g?'클릭하면 벗어서 가방으로':'비어있음 — 장비를 더블클릭해 착용'}">
      <span class="gs-label">${label}</span>
      <span class="gs-item">${g ? g.def.emoji+' '+g.def.name+' <b>🛡'+(g.def.armor||0)+'</b>' : '<span class="gs-none">없음</span>'}</span>
    </div>`;
  }).join('') + `<div class="gear-total">🛡 총 방어 ${gearArmor()}</div>`;
  rootEl.querySelectorAll('.gear-slot.filled').forEach(el=>{
    el.addEventListener('click', ()=> unequipGear(el.dataset.slot, State.backpack));
  });
}

function upgradeTierLabel(key, t){
  if(!t) return '';
  if(key==='pack' || key==='store') return `크기 ${t.w}×${t.h}`;
  if(key==='hp') return `체력 ${t.v}`;
  if(key==='shoes') return `이동 ×${Number(t.v).toFixed(2)}`;
  if(key==='roll') return `구르기 ${t.n}회 · 쿨 ${t.cd}초`;
  return '';
}
function buyUpgrade(key){
  const u = UPGRADES[key];
  const next = u.tiers[(State.up[key]||0)+1];
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
  if(d.region && REGIONS[d.region])
    return REGIONS[d.region].emoji+' '+REGIONS[d.region].name+'에서 '+d.n+'회 생존 탈출';
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
// 퀘스트 카드 보상 줄 (코인·아이템·해금·보관대)
function questRewardHTML(d){
  let s = `보상: ${d.reward}🪙`;
  if(d.rewardItem && ITEMS[d.rewardItem])
    s += ` + <span class="q-item" data-item="${d.rewardItem}">${ITEMS[d.rewardItem].emoji} ${ITEMS[d.rewardItem].name}</span>`;
  if(d.unlock==='gun2') s += ' + <b>🔫 총기 슬롯 2 해금</b>';
  if(d.unlock==='stash' || (d.rewardStash|0)>0){
    const n = (d.rewardStash|0) || STASH_START;
    if(d.unlock==='stash') s += ` + <b>🔫 총 보관대 ${n}칸 개방</b>`;
    else s += ` + <b>🔫 총 보관대 +${n}칸</b>`;
  }
  return s;
}
function ensureOffers(){
  if(State.questOffers && State.questOffers.length) return;
  // 엑조틱 입문(unlock:exoticIntro)은 부품 수집가 NPC 전용 — 여기선 제외
  // 보관대 확장(rewardStash)은 별도 제안 — 랜덤 풀에서 빼 중복 난사 방지
  const pool = QUESTS.filter(q=>!q.unlock && !(q.rewardStash>0));
  const offers = [];
  const stashQ = QUESTS.find(q=>q.unlock==='stash');
  if(stashQ && !State.stashUnlocked && (State.questsDone||0)>=2) offers.push({...stashQ});
  // 이미 해금된 뒤: 칸이 MAX 미만이면 확장 퀘스트 1개 우선 제안
  if(State.stashUnlocked && stashSlots() < MAX_STASH){
    const expand = QUESTS.filter(q=>q.rewardStash>0 && q.unlock!=='stash');
    if(expand.length) offers.push({...expand[Math.floor(Math.random()*expand.length)]});
  }
  const lic = QUESTS.find(q=>q.unlock==='gun2');
  if(lic && !State.gun2 && (State.questsDone||0)>=3) offers.push({...lic});
  while(offers.length<2 && pool.length){
    const q = {...pool.splice(Math.floor(Math.random()*pool.length),1)[0]};
    q.reward = Math.round(q.reward*(1+(State.questsDone||0)*0.15));
    offers.push(q);
  }
  State.questOffers = offers;
  saveGame();
}

// 부품 수집가 패널 (엑조틱 슬롯 전용 — 일반 의뢰와 동시 진행)
function renderExoticPanel(p){
  const exoQ = QUESTS.find(q=>q.unlock==='exoticIntro');
  const q = State.exoQuest;
  const unlocked = regionUnlocked('factory');
  let body = '';

  if(State.exoticIntroDone){
    body = `<div class="npc-line">"${pick(NPC_LINES.exoIdle)}"</div>
      <div class="quest-card featured">
        <div class="q-title">★★ 입문 완료</div>
        <div class="q-desc">폐공장·습지 상자에서 엑조틱 파츠가 뜬다. 작업대에서 해괴한 모양을 맞춰 봐.</div>
      </div>`;
  } else if(!unlocked){
    body = `<div class="npc-line">"${pick(NPC_LINES.exoLocked)}"</div>
      <div class="quest-card">
        <div class="q-title">🔒 아직 잠김</div>
        <div class="q-desc">뒷동산에서 <b>3회 탈출</b>하면 폐공장이 열린다. 그다음 다시 와.</div>
      </div>`;
  } else if(q){
    const d = q.def, pr = questProg(q), can = questCanComplete(q);
    body = `<div class="npc-line">"${can ? pick(NPC_LINES.exoDone) : pick(NPC_LINES.exoBusy)}"</div>
      <div class="quest-card featured">
        <div class="q-title">🔧 ${d.title} <span class="tip-rare">★★ 입문</span></div>
        <div class="q-desc">${questDesc(d)} — <b>${pr}/${d.n}</b>${pr>=d.n?' ✔':''}</div>
        ${d.blurb?`<div class="q-desc">${d.blurb}</div>`:''}
        <div class="q-reward">보상: ${d.reward}🪙 + <span class="q-item" data-item="${d.rewardItem}">${ITEMS[d.rewardItem].emoji} ${ITEMS[d.rewardItem].name}</span> ★★</div>
        <div class="q-btns">
          ${can?'<button class="btn" id="qdone">완료 보고</button>':''}
          <button class="btn danger" id="qdrop">포기</button>
        </div>
      </div>`;
  } else {
    const d = {...exoQ};
    body = `<div class="npc-line">"${pick(NPC_LINES.exoGreet)}"</div>
      <div class="quest-card featured">
        <div class="q-title">🔧 ${d.title} <span class="tip-rare">★★ 입문</span></div>
        <div class="q-desc">${questDesc(d)}</div>
        ${d.blurb?`<div class="q-desc">${d.blurb}</div>`:''}
        <div class="q-reward">보상: ${d.reward}🪙 + <span class="q-item" data-item="${d.rewardItem}">${ITEMS[d.rewardItem].emoji} ${ITEMS[d.rewardItem].name}</span> ★★</div>
        <div class="q-btns"><button class="btn" id="exo-accept">수락</button></div>
      </div>`;
  }
  p.innerHTML = `
    <div class="panel-title">🔧 부품 수집가 <span class="sub">엑조틱</span></div>
    <div class="quest-body">${body}</div>
    <div class="panel-hint">일반 의뢰와 동시 진행 가능 · <b>ESC</b> 닫기</div>`;

  const acc = p.querySelector('#exo-accept');
  if(acc) acc.addEventListener('click', ()=>{
    if(State.exoQuest){ toast('이미 엑조틱 의뢰를 진행 중입니다'); return; }
    State.exoQuest = { def: {...exoQ}, prog: 0 };
    sfx('open');
    toast('🔧 의뢰 수락: '+exoQ.title);
    saveGame(); refreshPanel();
  });
  const qd = p.querySelector('#qdone');
  if(qd) qd.addEventListener('click', ()=>completeQuest('exo'));
  const drop = p.querySelector('#qdrop');
  if(drop) drop.addEventListener('click', ()=>{
    State.exoQuest = null; toast('엑조틱 의뢰를 포기했습니다'); saveGame(); refreshPanel();
  });
}
function acceptQuest(i){
  if(State.quest || !State.questOffers || !State.questOffers[i]) return;
  State.quest = { def: State.questOffers[i], prog: 0 };
  State.questOffers = null;
  sfx('open');
  toast('📜 의뢰 수락: '+State.quest.def.title);
  saveGame(); refreshPanel();
}
// slot: 'main' | 'exo'
function completeQuest(slot){
  const key = slot==='exo' ? 'exoQuest' : 'quest';
  const q = State[key];
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
  // 보관대: rewardStash 칸만 증가 (unlock:stash 는 첫 개방, 아무 퀘스트로는 안 늘어남)
  const stashGrant = (d.rewardStash|0) || (d.unlock==='stash' ? STASH_START : 0);
  const beforeSlots = stashSlots();
  const wasStashLocked = !State.stashUnlocked;
  let gainedSlots = 0;
  if(stashGrant > 0) gainedSlots = grantStashSlots(stashGrant);

  const exoticJustDone = (d.unlock==='exoticIntro' && !State.exoticIntroDone);
  State.questsDone = (State.questsDone||0)+1;
  if(exoticJustDone){
    State.exoticIntroDone = true;
  }
  State[key] = null;
  if(slot!=='exo') State.questOffers = null;
  sfx('extract');
  toast((slot==='exo'?'🔧':'📜')+' 퀘스트 완료! +'+d.reward+'🪙');
  if(gainedSlots > 0){
    if(wasStashLocked)
      toast('🔓 총 보관대 개방! '+stashSlots()+'칸 (작업대) — 보상으로만 확장됩니다');
    else
      toast('🔓 총 보관대 +'+gainedSlots+'칸 → 이제 '+stashSlots()+'/'+MAX_STASH+'칸');
  } else if(stashGrant > 0 && beforeSlots >= MAX_STASH){
    toast('총 보관대는 이미 최대('+MAX_STASH+'칸)입니다');
  }
  if(exoticJustDone){
    toast('★★ 엑조틱 입문! 작업대에서 총구에 달고 사격장에서 시험해 봐', 4000);
    toast('"'+pick(NPC_LINES.exoDone)+'"', 4500);
  }
  saveGame(); refreshPanel();
}


// ---------------- 🛒 떠돌이 상인 ----------------
// 재고는 실제 날짜 기준으로 하루 한 번 로테이션. 리롤은 유료(코인 싱크).
function shopTodayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function shopPrice(def, mul){ return Math.max(10, Math.round(def.value*mul/10)*10); }
function rollShopStock(){
  const stock = [];
  const used = new Set();
  const add = (id, mul)=>{
    const def = ITEMS[id];
    if(!def || used.has(id)) return false;
    used.add(id);
    stock.push({ id, price: shopPrice(def, mul), sold: false });
    return true;
  };
  // 부착물 3칸: 70% 일반 / 22% 희귀 / 8% 엑조틱 (유물은 필드 전용 — 상점 미취급)
  for(let i=0;i<3;i++){
    for(let tr=0;tr<8;tr++){
      const r = Math.random();
      const pool = r<0.08 ? LOOT_POOLS.exoticAtt : (r<0.30 ? LOOT_POOLS.rareAtt : LOOT_POOLS.att);
      const mul = pool===LOOT_POOLS.att ? 1.6 : 1.9;
      const id = pick(pool);
      if(ITEMS[id] && ITEMS[id].relic) continue; // 혹시 풀에 섞여 있어도 제외
      if(add(id, mul)) break;
    }
  }
  // 총 몸통 1 · 장비 1 · 음식 1
  for(let tr=0;tr<6;tr++) if(add(pick(LOOT_POOLS.body), 1.7)) break;
  for(let tr=0;tr<6;tr++) if(add(pick(['pot_helmet','hard_hat','board_vest','tire_vest']), 1.6)) break;
  for(let tr=0;tr<6;tr++) if(add(pick(LOOT_POOLS.food), 1.5)) break;
  return stock;
}
function ensureShop(){
  const t = shopTodayStr();
  if(!State.shop || State.shop.date !== t){
    State.shop = { date: t, stock: rollShopStock(), rerolls: 0 };
    saveGame();
  }
}
function shopRerollCost(){ return 80 * ((State.shop && State.shop.rerolls|0) + 1); }
function buyShopItem(i){
  const s = State.shop && State.shop.stock[i];
  if(!s || s.sold) return;
  const def = ITEMS[s.id];
  if(State.coins < s.price){ toast('코인이 부족합니다!'); sfx('click'); return; }
  const inst = mkInst(s.id);
  if(!State.storage.autoPlace(inst) && !State.backpack.autoPlace(inst)){
    toast('창고·가방에 공간이 없습니다!'); return;
  }
  State.coins -= s.price;
  s.sold = true;
  toast('구매: '+def.emoji+' '+def.name+' (-'+s.price+'🪙)');
  sfx('coin');
  saveGame();
  refreshPanel();
}
function renderShopPanel(p){
  ensureShop();
  const shop = State.shop;
  p.classList.add('wide');
  const cards = shop.stock.map((s,i)=>{
    const def = ITEMS[s.id];
    const rare = def.relic?'★★★':(def.exotic?'★★':(def.rare?'★':''));
    return `<div class="shop-card ${s.sold?'sold':''}" data-i="${i}">
      <div class="shop-icon" data-icon="${i}"></div>
      <div class="shop-name">${def.name}${rare?` <span class="shop-rare">${rare}</span>`:''}</div>
      <div class="shop-kind">${def.kind==='att'?SOCK_INFO[def.sock].name:def.kind==='body'?'총 몸통':def.kind==='gear'?'장비':def.kind==='food'?'음식':'귀중품'}</div>
      ${s.sold ? '<div class="shop-soldout">품절</div>'
               : `<button class="btn mini shop-buy" data-buy="${i}">${s.price}🪙</button>`}
    </div>`;
  }).join('');
  p.innerHTML = `
    <div class="panel-title">🛒 떠돌이 상인 <span class="sub">🪙 ${State.coins}</span></div>
    <div class="npc-line">"오늘 물건은 이게 다야. 내일 또 와 보든가."</div>
    <div class="shop-grid">${cards}</div>
    <div class="shop-foot">
      <button class="btn" id="reroll">🎲 재고 리롤 (${shopRerollCost()}🪙)</button>
      <span class="shop-date">재고 갱신: 매일 자정</span>
    </div>
    <div class="panel-hint">구매하면 창고로 들어감 · 아이콘에 마우스를 올리면 상세 · <b>ESC</b> 닫기</div>`;
  // 아이콘 + 툴팁
  p.querySelectorAll('[data-icon]').forEach(el=>{
    const def = ITEMS[shop.stock[+el.dataset.icon].id];
    if(typeof itemIconEl==='function'){
      const ic = itemIconEl(def, 34, false);
      ic.style.imageRendering = 'pixelated';
      el.appendChild(ic);
    } else el.textContent = def.emoji;
    attachTip(el.parentElement, def);
  });
  p.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click', e=>{
    e.stopPropagation(); buyShopItem(+b.dataset.buy);
  }));
  p.querySelector('#reroll').addEventListener('click', ()=>{
    const cost = shopRerollCost();
    if(State.coins < cost){ toast('코인이 부족합니다!'); return; }
    State.coins -= cost;
    State.shop.stock = rollShopStock();
    State.shop.rerolls = (State.shop.rerolls|0)+1;
    sfx('coin');
    saveGame();
    refreshPanel();
  });
}
