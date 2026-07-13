// ============================================================
// 인벤토리: 폴리오미노 그리드 + 드래그&드롭
// ============================================================

let UID = 1;
function mkInst(defId){
  const def = ITEMS[defId];
  if(!def) throw new Error('unknown item: '+defId);
  return { uid: UID++, def, rot: 0 };
}

function baseShape(def){
  return Array.isArray(def.shape) ? def.shape : SHAPES[def.shape];
}
function normShape(cells){
  const mx = Math.min(...cells.map(c=>c[0])), my = Math.min(...cells.map(c=>c[1]));
  return cells.map(([x,y])=>[x-mx,y-my]);
}
function rotShapeOnce(cells){
  const maxY = Math.max(...cells.map(c=>c[1]));
  return normShape(cells.map(([x,y])=>[maxY-y, x]));
}
function shapeOf(def, rot){
  let s = baseShape(def);
  for(let i=0;i<(rot%4+4)%4;i++) s = rotShapeOnce(s);
  return s;
}
function shapeSize(cells){
  return [Math.max(...cells.map(c=>c[0]))+1, Math.max(...cells.map(c=>c[1]))+1];
}

// ---- 그리드 인벤토리 ----
class Inv {
  constructor(w,h){ this.w=w; this.h=h; this.items=[]; } // items: {inst, x, y}
  occMap(excludeInst){
    const m = new Map();
    for(const it of this.items){
      if(excludeInst && it.inst.uid===excludeInst.uid) continue;
      for(const [cx,cy] of shapeOf(it.inst.def, it.inst.rot)) m.set((it.x+cx)+','+(it.y+cy), it);
    }
    return m;
  }
  canPlace(inst, x, y, rot){
    const occ = this.occMap(inst);
    for(const [cx,cy] of shapeOf(inst.def, rot)){
      const gx=x+cx, gy=y+cy;
      if(gx<0||gy<0||gx>=this.w||gy>=this.h) return false;
      if(occ.has(gx+','+gy)) return false;
    }
    return true;
  }
  place(inst, x, y, rot){
    inst.rot = rot;
    this.remove(inst);
    this.items.push({inst, x, y});
  }
  remove(inst){
    const i = this.items.findIndex(it=>it.inst.uid===inst.uid);
    if(i>=0) this.items.splice(i,1);
  }
  has(inst){ return this.items.some(it=>it.inst.uid===inst.uid); }
  autoPlace(inst){
    for(let rot=0; rot<4; rot++)
      for(let y=0; y<this.h; y++)
        for(let x=0; x<this.w; x++)
          if(this.canPlace(inst,x,y,rot)){ this.place(inst,x,y,rot); return true; }
    return false;
  }
  totalValue(){ return this.items.reduce((a,it)=>a+it.inst.def.value,0); }
  count(){ return this.items.length; }
  serialize(){
    return { w:this.w, h:this.h,
      items: this.items.map(it=>({d:it.inst.def.id, x:it.x, y:it.y, r:it.inst.rot})) };
  }
  static load(data){
    const inv = new Inv(data.w, data.h);
    for(const it of (data.items||[])){
      if(!ITEMS[it.d]) continue;
      const inst = mkInst(it.d); inst.rot = it.r||0;
      inv.items.push({inst, x:it.x, y:it.y});
    }
    return inv;
  }
}

// ---- 아이템 셀 색 ----
function itemColor(def){
  if(def.kind==='att') return SOCK_INFO[def.sock].color;
  if(def.kind==='body') return def.color || '#c96a5a'; // 몸통은 고유색으로 구분
  if(def.kind==='food') return '#d488a8';
  if(def.kind==='gear') return '#7a9ab0'; // 장비: 강철빛
  return def.value>=150 ? '#d4a832' : '#9a7fc4'; // loot
}

// 작업대 창고 필터 매칭 (null=전체, 소켓키 / body / loot / food)
function itemMatchesBenchFilter(def, filter){
  if(!filter) return true;
  if(filter==='body') return def.kind==='body';
  if(filter==='loot') return def.kind==='loot';
  if(filter==='food') return def.kind==='food';
  // 소켓 타입 → 해당 부착물만
  return def.kind==='att' && def.sock===filter;
}

// ---- 그리드 DOM 렌더 ----
const CS = 40; // 인벤토리 셀 픽셀 (모든 패널 공통 — 그리드 통일)

// 폴리오미노 외곽선 추적 → SVG 패스 (도넛 구멍은 evenodd로 처리)
function outlinePathD(cells, cs){
  const set = new Set(cells.map(c=>c[0]+','+c[1]));
  const has = (x,y)=>set.has(x+','+y);
  const startMap = new Map(); // 경계 에지: 시작점 → 끝점 (일관된 방향)
  for(const [x,y] of cells){
    if(!has(x,y-1)) startMap.set(x+','+y, [x+1,y]);
    if(!has(x+1,y)) startMap.set((x+1)+','+y, [x+1,y+1]);
    if(!has(x,y+1)) startMap.set((x+1)+','+(y+1), [x,y+1]);
    if(!has(x-1,y)) startMap.set(x+','+(y+1), [x,y]);
  }
  const done = new Set();
  let d = '';
  for(const sk of startMap.keys()){
    if(done.has(sk)) continue;
    const pts = [];
    let cur = sk;
    while(!done.has(cur)){
      done.add(cur);
      const [cx,cy] = cur.split(',').map(Number);
      pts.push([cx,cy]);
      const n = startMap.get(cur);
      cur = n[0]+','+n[1];
    }
    // 일직선 위 중간점 제거
    const simp = pts.filter((p,i)=>{
      const a = pts[(i-1+pts.length)%pts.length], b = pts[(i+1)%pts.length];
      return !((a[0]===p[0]&&p[0]===b[0])||(a[1]===p[1]&&p[1]===b[1]));
    });
    d += 'M'+simp.map(p=>(p[0]*cs)+' '+(p[1]*cs)).join(' L ')+' Z ';
  }
  return d.trim();
}
// 셀 사이 칸 구분 점선
function innerGridD(cells, cs){
  const set = new Set(cells.map(c=>c[0]+','+c[1]));
  let d = '';
  for(const [x,y] of cells){
    if(set.has((x+1)+','+y)) d += `M${(x+1)*cs} ${y*cs} L${(x+1)*cs} ${(y+1)*cs} `;
    if(set.has(x+','+(y+1))) d += `M${x*cs} ${(y+1)*cs} L${(x+1)*cs} ${(y+1)*cs} `;
  }
  return d.trim();
}
// 이모지 표시 위치 (도넛류는 구멍 중앙에)
function emojiAnchor(cells){
  const [sw,sh] = shapeSize(cells);
  // 정중앙이 실제 채워진 칸이면 거기, 아니면(도넛 구멍 등) 채워진 칸 중 중앙에 가장 가까운 곳
  const filled = new Set(cells.map(c=>c[0]+','+c[1]));
  const cx = Math.floor(sw/2), cy = Math.floor(sh/2);
  if(filled.has(cx+','+cy)) return [cx+0.5, cy+0.5];
  let best = cells[0], bd = 1e9;
  for(const [x,y] of cells){
    const d = (x+0.5-sw/2)**2 + (y+0.5-sh/2)**2;
    if(d<bd){ bd=d; best=[x,y]; }
  }
  return [best[0]+0.5, best[1]+0.5];
}

// ── 모양 채움 아트: 아이콘을 폴리오미노 전체에 커버 스케일로 깔고 셀 경계로 클리핑 ──
// 번개(bolt) 아이템이면 번개 그림이 지그재그 칸들을 따라 채워지는 식.
const _shapeArtCache = new Map();
function shapeArtURL(def, cells, cs){
  const key = def.id + ':' + cs + ':' + cells.map(c=>c[0]+'.'+c[1]).join(',');
  if(_shapeArtCache.has(key)) return _shapeArtCache.get(key);
  const [sw,sh] = shapeSize(cells);
  const cn = document.createElement('canvas');
  cn.width = sw*cs; cn.height = sh*cs;
  const g = cn.getContext('2d');
  g.imageSmoothingEnabled = false;
  const path = new Path2D(outlinePathD(cells, cs));
  g.save();
  g.clip(path, 'evenodd');
  const srcIcon = itemIconCanvas(def, false); // 16×16 도트 아이콘
  // 절충 스케일: 완전 커버(max)는 큰 모양에서 과확대로 뭉개져서, min·max 평균으로
  // 모양 대부분을 채우되 아이콘 형태가 알아볼 수 있게 유지
  const scale = ((Math.max(sw,sh)+Math.min(sw,sh))/2) * cs / 16 * 1.15;
  const dw = 16*scale;
  g.drawImage(srcIcon, Math.round((sw*cs-dw)/2), Math.round((sh*cs-dw)/2), dw, dw);
  g.restore();
  const url = cn.toDataURL();
  if(_shapeArtCache.size > 400) _shapeArtCache.clear();
  _shapeArtCache.set(key, url);
  return url;
}

// 임의 셀 배열로 아이템 요소 생성 (인벤토리·작업대 공용)
// hidden: 미식별 실루엣 (모양만 보이고 정체 불명)
function buildShapeEl(cells, def, cs, hidden){
  const [sw,sh] = shapeSize(cells);
  const el = document.createElement('div');
  el.className = 'item';
  el.style.width = sw*cs+'px'; el.style.height = sh*cs+'px';
  const col = hidden ? '#8a8a80' : itemColor(def);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('width', sw*cs); svg.setAttribute('height', sh*cs);
  const p = document.createElementNS(NS,'path');
  p.setAttribute('d', outlinePathD(cells, cs));
  p.setAttribute('fill', col+'40');
  p.setAttribute('stroke', col);
  p.setAttribute('stroke-width', 2.5);
  p.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('fill-rule', 'evenodd');
  p.setAttribute('class', 'shape-path');
  svg.appendChild(p);
  const gd = innerGridD(cells, cs);
  if(gd){
    const g = document.createElementNS(NS,'path');
    g.setAttribute('d', gd);
    g.setAttribute('stroke', col);
    g.setAttribute('stroke-opacity', '0.3');
    g.setAttribute('stroke-width', '1');
    g.setAttribute('stroke-dasharray', '3 3');
    g.setAttribute('fill', 'none');
    svg.appendChild(g);
  }
  // 아이콘: 2칸 이상이면 모양 전체에 아트를 채움 (셀 경계 클리핑), 1칸·미식별은 중앙 아이콘
  const shapeFill = !hidden && cells.length >= 2 && typeof itemIconCanvas==='function';
  if(shapeFill){
    const art = document.createElement('div');
    art.className = 'item-shape-art';
    art.style.cssText = 'position:absolute;inset:0;pointer-events:none;image-rendering:pixelated;'
      + 'background-image:url('+shapeArtURL(def, cells, cs)+');background-size:100% 100%;';
    el.appendChild(art); // svg(틴트+외곽선) 위, 하지만 svg 스트로크가 아트 경계를 감싸줌
  }
  el.appendChild(svg);
  if(!shapeFill){
    const [ax,ay] = emojiAnchor(cells);
    const iconSz = Math.max(16, Math.floor(cs*0.58));
    const ic = (typeof itemIconEl==='function')
      ? itemIconEl(def, iconSz, !!hidden)
      : (()=>{ const d=document.createElement('div'); d.className='item-emoji'; d.textContent=hidden?'❓':def.emoji; return d; })();
    ic.classList.add('item-emoji');
    ic.style.left = ax*cs+'px'; ic.style.top = ay*cs+'px';
    ic.style.position = 'absolute';
    ic.style.transform = 'translate(-50%,-50%)';
    ic.style.pointerEvents = 'none';
    if(ic.tagName==='CANVAS'){
      ic.style.imageRendering = 'pixelated';
      ic.style.filter = 'drop-shadow(0 1px 0 #000)';
    }
    el.appendChild(ic);
  }
  if(hidden){
    el.classList.add('unknown');
  } else {
    if(def.exotic){ el.classList.add('epic'); }
    if(def.relic){ el.classList.add('relic'); } // ★★★ 유물: 보라 글로우
    else if(def.rare){ el.classList.add('epic'); }
    else if(def.value>=150){ el.classList.add('rare'); }
    attachTip(el, def);
  }
  return el;
}
function buildItemEl(inst, cs){
  return buildShapeEl(shapeOf(inst.def, inst.rot), inst.def, cs, inst.hidden);
}

// 활성 드롭존 목록 (패널 렌더 시 재구성)
let dropZones = [];

function renderGrid(rootEl, inv, opts={}){
  // opts: {cs, zoneKind:'inv', label, onDbl(inst)}
  const cs = opts.cs || CS;
  rootEl.innerHTML = '';
  rootEl.classList.add('inv-grid');
  rootEl.style.width = inv.w*cs+'px';
  rootEl.style.height = inv.h*cs+'px';
  rootEl.style.backgroundSize = cs+'px '+cs+'px';
  for(const it of inv.items){
    const el = buildItemEl(it.inst, cs);
    el.style.left = it.x*cs+'px'; el.style.top = it.y*cs+'px';
    // 작업대 필터: 소켓(부착물) / 총기몸통 / 귀중품 / 음식
    if(opts.highlightSock){
      const match = itemMatchesBenchFilter(it.inst.def, opts.highlightSock);
      if(!match) el.classList.add('dimmed');
      else el.classList.add('sock-hi');
    }
    // Ctrl/Cmd + 클릭 → 지정 인벤토리로 즉시 이동 (공통 처리)
    const quickMove = ()=>{
      if(it.inst.hidden){ toast('🔍 아직 조사 중...'); return true; }
      if(opts.quickTarget){
        if(quickTransfer(it.inst, inv, opts.quickTarget)) refreshPanel();
        return true;
      }
      return false;
    };
    el.addEventListener('mousedown', e=>{
      if(e.button!==0) return;
      e.preventDefault(); e.stopPropagation();
      if(it.inst.hidden){ toast('🔍 아직 조사 중...'); return; }
      if(e.ctrlKey || e.metaKey){ quickMove(); return; }
      armDrag(it.inst, {kind:'inv', inv, rerender: opts.rerender}, e, cs);
    });
    // macOS에서 Ctrl+클릭이 우클릭(contextmenu)으로 오는 경우도 커버
    el.addEventListener('contextmenu', e=>{
      if(e.ctrlKey || e.metaKey){ e.preventDefault(); e.stopPropagation(); quickMove(); }
    });
    el.addEventListener('dblclick', e=>{
      e.preventDefault(); e.stopPropagation();
      if(it.inst.hidden) return;
      if(it.inst.def.kind==='gear'){ equipGear(it.inst, inv); return; } // 장비: 어디서든 더블클릭 착용
      if(opts.onDbl) opts.onDbl(it.inst);
    });
    rootEl.appendChild(el);
  }
  dropZones.push({ el: rootEl, kind:'inv', inv, cs, rerender: opts.rerender });
}

// ---- 드래그 시스템 ----
const Drag = {
  active: null, // {inst, src, rot, ghost, cs, valid, cand}
  recent: false, // 이번 마우스다운에서 실제 드래그가 일어났는지 (클릭/더블클릭 구분)
};

// mousedown 즉시 드래그하지 않고 6px 이상 움직여야 시작 → 더블클릭이 살아남음
let pendingDrag = null;
function armDrag(inst, src, e, cs){
  Drag.recent = false;
  pendingDrag = { inst, src, cs: cs||CS, x: e.clientX, y: e.clientY };
}

function startDrag(inst, src, e, cs){
  cancelDrag();
  hideTip();
  Drag.recent = true;
  const ghost = buildItemEl({def:inst.def, rot:inst.rot}, cs||CS);
  ghost.classList.add('drag-ghost');
  document.getElementById('drag-layer').appendChild(ghost);
  Drag.active = { inst, src, rot: inst.rot, ghost, cs: cs||CS, cand: null, ghostKey:'free' };
  moveDragGhost(e.clientX, e.clientY);
  if(typeof sfx==='function') sfx('pick');
}

// 벤치 스냅 등에서 자유 커서 고스트로 복귀
function ensureFreeGhost(d){
  if(d.ghostKey==='free') return;
  const nx = d.ghost._x, ny = d.ghost._y;
  d.ghost.remove();
  d.ghost = buildItemEl({def:d.inst.def, rot:d.rot}, d.cs);
  d.ghost.classList.add('drag-ghost');
  document.getElementById('drag-layer').appendChild(d.ghost);
  d.ghost._x = nx; d.ghost._y = ny;
  d.ghostKey = 'free';
}

function rebuildGhost(){
  const d = Drag.active; if(!d) return;
  const nx = d.ghost._x||0, ny = d.ghost._y||0;
  d.ghost.remove();
  d.ghost = buildItemEl({def:d.inst.def, rot:d.rot}, d.cs);
  d.ghost.classList.add('drag-ghost');
  document.getElementById('drag-layer').appendChild(d.ghost);
  d.ghostKey = 'free';
  moveDragGhost(nx, ny);
}

function moveDragGhost(mx, my){
  const d = Drag.active; if(!d) return;
  d.ghost._x = mx; d.ghost._y = my;
  d.cand = null;
  let snapped = false;

  for(const z of dropZones){
    if(!document.body.contains(z.el)) continue;
    const r = z.el.getBoundingClientRect();
    if(mx<r.left-40 || mx>r.right+40 || my<r.top-40 || my>r.bottom+40) continue;

    if(z.kind==='inv'){
      if(mx<r.left||mx>r.right||my<r.top||my>r.bottom) continue;
      ensureFreeGhost(d);
      const cells = shapeOf(d.inst.def, d.rot);
      const [sw,sh] = shapeSize(cells);
      const gx = Math.round((mx - r.left)/z.cs - sw/2);
      const gy = Math.round((my - r.top)/z.cs - sh/2);
      const ok = z.inv.canPlace(d.inst, gx, gy, d.rot);
      d.cand = {kind:'inv', zone:z, gx, gy, ok};
      // 스냅
      d.ghost.style.left = (r.left + gx*z.cs)+'px';
      d.ghost.style.top  = (r.top + gy*z.cs)+'px';
      d.ghost.classList.toggle('ok', ok);
      d.ghost.classList.toggle('bad', !ok);
      snapped = true;
      break;
    }
    if(z.kind==='sell'){
      if(mx<r.left||mx>r.right||my<r.top||my>r.bottom) continue;
      d.cand = {kind:'sell', zone:z, ok:true};
      d.ghost.classList.add('ok'); d.ghost.classList.remove('bad');
      z.el.classList.add('hot');
      snapped = false;
      break;
    }
    if(z.kind==='discard'){
      if(mx<r.left||mx>r.right||my<r.top||my>r.bottom) continue;
      const ok = (typeof scene!=='undefined' && scene==='raid' && typeof raid!=='undefined' && !!raid);
      d.cand = {kind:'discard', zone:z, ok};
      d.ghost.classList.toggle('ok', ok);
      d.ghost.classList.toggle('bad', !ok);
      z.el.classList.add('hot');
      snapped = false;
      break;
    }
    if(z.kind==='qslot'){
      if(mx<r.left||mx>r.right||my<r.top||my>r.bottom) continue;
      const ok = d.inst.def.kind==='food' && (!State.qslots[z.i] || d.src.kind==='qslot');
      d.cand = {kind:'qslot', zone:z, i:z.i, ok};
      d.ghost.classList.toggle('ok', ok);
      d.ghost.classList.toggle('bad', !ok);
      z.el.classList.add('hot');
      snapped = false;
      break;
    }
    if(z.kind==='bench'){
      const cand = benchCandidate(z, d, mx, my);
      if(cand){
        d.cand = cand;
        if(cand.ok && cand.type==='mount' && z.bodyEl){
          // 장착될 모습 그대로 벤치 격자에 스냅
          const cells = mountLocalCells(shapeOf(d.inst.def, d.rot), cand.side);
          const [lw,lh] = shapeSize(cells);
          const br = z.bodyEl.getBoundingClientRect();
          let gx2, gy2;
          if(cand.side==='top'){ gx2 = br.left + cand.idx*GS; gy2 = br.top - lh*GS; }
          else if(cand.side==='bottom'){ gx2 = br.left + cand.idx*GS; gy2 = br.bottom; }
          else if(cand.side==='front'){ gx2 = br.right; gy2 = br.top + cand.idx*GS; }
          else { gx2 = br.left - lw*GS; gy2 = br.top + cand.idx*GS; }
          const key = 'b:'+cand.side+':'+cand.idx+':'+d.rot;
          if(d.ghostKey!==key){
            const nx = d.ghost._x, ny = d.ghost._y;
            d.ghost.remove();
            d.ghost = buildShapeEl(cells, d.inst.def, GS);
            d.ghost.classList.add('drag-ghost');
            document.getElementById('drag-layer').appendChild(d.ghost);
            d.ghost._x = nx; d.ghost._y = ny;
            d.ghostKey = key;
          }
          d.ghost.style.left = gx2+'px';
          d.ghost.style.top = gy2+'px';
          d.ghost.classList.add('ok'); d.ghost.classList.remove('bad');
          snapped = true;
        } else {
          ensureFreeGhost(d);
          d.ghost.classList.toggle('ok', cand.ok);
          d.ghost.classList.toggle('bad', !cand.ok);
          snapped = false;
        }
        break;
      }
    }
  }
  for(const z of dropZones){ if((z.kind==='sell'||z.kind==='qslot'||z.kind==='discard') && (!d.cand || d.cand.zone!==z)) z.el.classList.remove('hot'); }
  if(!snapped){
    ensureFreeGhost(d);
    d.ghost.style.left = (mx - d.cs*0.5)+'px';
    d.ghost.style.top  = (my - d.cs*0.5)+'px';
    if(!d.cand){ d.ghost.classList.remove('ok','bad'); }
  }
  benchHighlight(d);
}

function finishDrag(){
  const d = Drag.active; if(!d) return;
  const c = d.cand;
  if(c && c.ok){
    if(c.kind==='inv'){
      // 원래 위치에서 제거
      removeFromSource(d);
      c.zone.inv.place(d.inst, c.gx, c.gy, d.rot);
      if(typeof sfx==='function') sfx('drop');
    } else if(c.kind==='sell'){
      removeFromSource(d);
      State.coins += d.inst.def.value;
      toast('판매: '+d.inst.def.name+' +'+d.inst.def.value+'🪙');
      if(typeof sfx==='function') sfx('coin');
      saveGame();
    } else if(c.kind==='discard'){
      // 🗑 바닥에 버리기: 발밑에 떨어뜨림 (잠깐 뒤부터 다시 주울 수 있음)
      removeFromSource(d);
      d.inst.rot = d.rot||0;
      const da = Math.random()*Math.PI*2;
      raid.drops.push({kind:'item', x:player.x+Math.cos(da)*28, y:player.y+Math.sin(da)*28,
        inst:d.inst, bob:rnd(0,6), pickCd:1.5});
      toast('🗑 버림: '+d.inst.def.emoji+' '+d.inst.def.name);
      if(typeof sfx==='function') sfx('drop');
    } else if(c.kind==='qslot'){
      const cur = State.qslots[c.i];
      removeFromSource(d);
      if(cur && d.src.kind==='qslot') State.qslots[d.src.i] = cur; // 슬롯끼리 교체
      State.qslots[c.i] = d.inst;
      if(typeof sfx==='function') sfx('drop');
    } else if(c.kind==='bench'){
      if(c.type==='mount'){
        removeFromSource(d);
        editGun().atts.push({inst:d.inst, side:c.side, idx:c.idx, rot:c.rot||0});
        if(typeof sfx==='function') sfx('mount');
      } else if(c.type==='body'){
        // 몸통 교체
        const eg = editGun();
        const oldBody = eg.body;
        if(eg.atts.length>0){ toast('부착물을 먼저 떼어내세요!'); }
        else {
          const srcInv = d.src.inv;
          removeFromSource(d);
          eg.body = d.inst;
          if(oldBody && !srcInv.autoPlace(oldBody)){
            // 레이드 중엔 홈 창고로 못 보냄 (가방만) — 케이브에선 창고→가방 순
            const inRaid = (typeof scene!=='undefined' && scene==='raid');
            const placed = inRaid
              ? State.backpack.autoPlace(oldBody)
              : (State.storage.autoPlace(oldBody) || State.backpack.autoPlace(oldBody));
            if(!placed){
              // 자리가 정 없으면 되돌리기
              eg.body = oldBody;
              srcInv.autoPlace(d.inst);
              toast('기존 몸통을 놓을 공간이 없습니다!');
            }
          }
          if(typeof sfx==='function') sfx('mount');
        }
      }
    }
  }
  cancelDrag();
  refreshPanel();
  if(typeof renderQslots==='function') renderQslots();
}

function removeFromSource(d){
  if(d.src.kind==='inv') d.src.inv.remove(d.inst);
  else if(d.src.kind==='gun'){
    const eg = editGun();
    const i = eg.atts.findIndex(m=>m.inst.uid===d.inst.uid);
    if(i>=0) eg.atts.splice(i,1);
  }
  else if(d.src.kind==='gunbody'){
    const eg = editGun();
    if(eg.body && eg.body.uid===d.inst.uid) eg.body = null;
  }
  else if(d.src.kind==='qslot'){
    if(State.qslots[d.src.i] && State.qslots[d.src.i].uid===d.inst.uid) State.qslots[d.src.i] = null;
  }
}

function cancelDrag(){
  if(Drag.active){ Drag.active.ghost.remove(); Drag.active=null; }
  for(const z of dropZones){ if(z.kind==='sell'||z.kind==='discard') z.el.classList.remove('hot'); }
  benchHighlight(null);
}

document.addEventListener('mousemove', e=>{
  if(pendingDrag && !Drag.active){
    if(Math.hypot(e.clientX-pendingDrag.x, e.clientY-pendingDrag.y) > 6){
      const p = pendingDrag; pendingDrag = null;
      startDrag(p.inst, p.src, e, p.cs);
    }
  } else if(Drag.active) moveDragGhost(e.clientX, e.clientY);
});
document.addEventListener('mouseup', e=>{
  pendingDrag = null;
  if(Drag.active && e.button===0) finishDrag();
});

// R키 회전은 game.js 입력 처리에서 Drag.active 확인 후 호출
function rotateDrag(){
  const d = Drag.active; if(!d) return;
  d.rot = (d.rot+1)%4;
  rebuildGhost();
}

// ---- 빠른 이전 (더블클릭) ----
function quickTransfer(inst, fromInv, toInv){
  if(!toInv) return false;
  fromInv.remove(inst);
  if(toInv.autoPlace(inst)){ if(typeof sfx==='function') sfx('drop'); return true; }
  fromInv.autoPlace(inst); // 실패 시 원복
  toast('공간이 부족합니다!');
  return false;
}

// ---- 자동 정리 (큰 것부터 다시 배치) ----
function repackInv(inv){
  const backup = inv.items.slice();
  const insts = backup.map(it=>it.inst)
    .sort((a,b)=> shapeOf(b.def,0).length - shapeOf(a.def,0).length || b.def.value - a.def.value);
  inv.items = [];
  for(const inst of insts){
    if(!inv.autoPlace(inst)){ inv.items = backup; toast('정리 실패!'); return false; }
  }
  return true;
}

// ============================================================
// 아이템 툴팁
// ============================================================
let tipEl = null;
function ensureTip(){
  if(!tipEl){
    tipEl = document.createElement('div');
    tipEl.id = 'tooltip';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
const FIRE_TIP = { laser:'🔴 레이저', flame:'🔥 화염', dart:'🦟 독다트', glue:'🫧 끈끈이', ice:'🧊 냉기', shock:'⚡ 감전' };
const TIP_MODS = {
  dmg: v=>`공격력 ${v>0?'+':''}${v}`,
  ammo: v=>`장탄 ${v>0?'+':''}${v}`,
  spread: v=>`탄퍼짐 ${v>0?'+':''}${v}°`,
  reload: v=>`재장전 ${v>0?'+':''}${v}초`,
  noiseMul: v=>`소음 ×${v}`,
  zoom: v=>`줌 ×${v}`,
  light: v=>`라이트 +${Math.round(v*100)}%`,
  aim: v=>`조준속도 ${v>0?'+':''}${Math.round(v*100)}%`,
  rpmMul: v=>`연사 ×${v}`,
  recoilMul: v=>`반동 ×${v}`,
  pellets: v=>`산탄 ${v>0?'+':''}${v}발`,
  fire: v=>FIRE_TIP[v]||('모드 '+v),
  pierce: v=>`관통 ${v}`,
  burn: v=>`화상 ${v}초`,
  poison: v=>`독 ${v}초`,
  slow: v=>`둔화 ${v}초`,
  stun: v=>`기절 ${v}초`,
  chain: v=>`체인 ${v}명`,
  knock: v=>`넉백 ×${v}`,
  rangeMul: v=>`사거리 ×${v}`,
  bulletSpd: v=>`탄속 ×${v}`,
  ammoCost: v=>`탄 소모 ${v}/발`,
  extractDetect: ()=>`📡 탈출구 방향 표시`,
  // ★★★ 유물 기믹
  ricochet: v=>`🪃 도탄 ${v}회 (벽에 튕김)`,
  lifesteal: v=>`🩸 흡혈 ${v} (처치 시 회복)`,
  boom: v=>`💥 작렬 (명중 시 반경 ${v} 폭발)`,
  magnet: v=>`🧲 코인 자석 ×${v}`,
};
function tipHTML(def){
  let kind = '', extra = '';
  if(def.kind==='att'){
    const bs = baseShape(def), [bw2,bh2] = shapeSize(bs);
    kind = `부착물 · <b style="color:${SOCK_INFO[def.sock].color}">${SOCK_INFO[def.sock].name} 소켓</b> · ${bw2}×${bh2} · R로 회전 장착`;
    const mods = Object.entries(def.mods||{})
      .map(([k,v])=>TIP_MODS[k]?TIP_MODS[k](v):'').filter(Boolean).join(' · ');
    if(mods) extra = `<div class="tip-mods">${mods}</div>`;
  } else if(def.kind==='body'){
    kind = `총 몸통 · <b>${def.cls||'?'}</b> · ${def.bw}×${def.bh}`;
    const b = def.base;
    const rails = def.rails.map(r=>`${SOCK_INFO[r.type].name}${r.len}`).join(' · ');
    extra = `<div class="tip-mods">공격력 ${b.dmg}${(b.pellets||1)>1?'×'+b.pellets:''} · ${b.rpm}rpm · 장탄 ${b.ammo} · 탄퍼짐 ${b.spread}° · 반동 ${b.recoil!=null?b.recoil:6} · 소음 ${b.noise}</div>
      <div class="tip-mods">소켓: ${rails}</div>`;
  } else if(def.kind==='gear'){
    kind = `장비 · <b>${def.slot==='head'?'🪖 머리':'🦺 몸통'}</b> · 더블클릭 착용`;
    extra = `<div class="tip-mods">🛡 방어 ${def.armor||0} (받는 피해 -${def.armor||0}, 최소 25%는 관통)</div>`;
  } else if(def.kind==='food'){
    if(def.effect==='extractDetect'){
      kind = '소모품 · 더블클릭/퀵슬롯 사용';
      extra = `<div class="tip-mods">📡 탈출구 방향 ${def.effectDur||10}초</div>`;
    } else {
      kind = '음식 · 더블클릭 사용';
      extra = `<div class="tip-mods">체력 +${def.heal}</div>`;
    }
  } else {
    kind = '귀중품 · 케이브 판매함에서 판매';
  }
  const rareTag = def.relic ? ' <span class="tip-relic">★★★ 유물</span>'
    : (def.exotic ? ' <span class="tip-rare">★★ 엑조틱</span>'
    : (def.bossBody ? ' <span class="tip-rare">👑 보스 전용</span>'
    : (def.rare ? ' <span class="tip-rare">★ 희귀</span>' : '')));
  return `<div class="tip-name">${def.emoji} ${def.name}${rareTag}</div>
    <div class="tip-kind">${kind}</div>${extra}
    ${def.desc?`<div class="tip-desc">${def.desc}</div>`:''}
    <div class="tip-val">가치 ${def.value}🪙</div>`;
}
function positionTip(x,y){
  const r = tipEl.getBoundingClientRect();
  let tx = x+16, ty = y+16;
  if(tx+r.width > window.innerWidth-8) tx = x-r.width-12;
  if(ty+r.height > window.innerHeight-8) ty = y-r.height-12;
  tipEl.style.left = Math.max(4,tx)+'px';
  tipEl.style.top = Math.max(4,ty)+'px';
}
function showTip(def, x, y){
  ensureTip();
  tipEl.innerHTML = tipHTML(def);
  tipEl.classList.add('show');
  positionTip(x,y);
}
function hideTip(){ if(tipEl) tipEl.classList.remove('show'); }
function attachTip(el, def){
  el.addEventListener('mouseenter', e=>{ if(!Drag.active) showTip(def, e.clientX, e.clientY); });
  el.addEventListener('mousemove', e=>{
    if(!Drag.active && tipEl && tipEl.classList.contains('show')) positionTip(e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', hideTip);
}

// ---- 착용 장비 (헬멧/방탄복) ----
// 어느 인벤토리에서든 더블클릭 → 해당 슬롯에 착용. 이미 있으면 서로 교체.
function equipGear(inst, fromInv){
  const slot = inst.def.slot; // 'head' | 'body'
  if(!slot) return;
  const prev = State.gear[slot];
  fromInv.remove(inst);
  if(prev && !fromInv.autoPlace(prev)){
    // 벗은 장비 놓을 자리가 없으면 원복
    fromInv.autoPlace(inst);
    toast('벗은 장비를 놓을 공간이 없습니다!');
    return;
  }
  State.gear[slot] = inst;
  toast('착용: '+inst.def.emoji+' '+inst.def.name+' (방어 +'+(inst.def.armor||0)+')');
  if(typeof sfx==='function') sfx('mount');
  if(typeof scene==='undefined' || scene!=='raid') saveGame();
  refreshPanel();
  updateHud();
}
// 장비 해제 → 지정 인벤토리로
function unequipGear(slot, toInv){
  const cur = State.gear[slot];
  if(!cur) return;
  if(!toInv.autoPlace(cur)){ toast('공간이 부족합니다!'); return; }
  State.gear[slot] = null;
  if(typeof sfx==='function') sfx('drop');
  if(typeof scene==='undefined' || scene!=='raid') saveGame();
  refreshPanel();
  updateHud();
}
