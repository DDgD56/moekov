// ============================================================
// MoeKov — 렌더 (카메라·업데이트·HUD·프레임 오케스트레이터)
// ============================================================

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
    // 조준할수록 크게 느려짐 (완전 조준 시 25% 속도) — 뿌리박고 정밀사격, 대신 회피 불가
    const aimSlow = 1 - 0.75*player.aimT;
    const debuffSlow = (player.slowT||0)>0 ? 0.42 : 1;
    const spd = moveSpd() * aimSlow * (sprinting?1.5:1) * debuffSlow;
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
  // 탈출 방향 표시 타이머 (입문 힌트 / 휴대용 탐지기)
  if(player.extractDetectT > 0){
    const prev = player.extractDetectT;
    const wasIntro = !!player.extractHintIntro;
    player.extractDetectT = Math.max(0, player.extractDetectT - dt);
    if(prev>0 && player.extractDetectT<=0){
      if(wasIntro){
        player.extractHintIntro = false;
        toast('탈출 방향 표시 종료 — 지도와 깃발을 기억해 두세요');
      } else {
        toast('📡 탐지 종료');
      }
    }
  }
  // 시체 방향 표시 타이머 (출격 직후 30초)
  if(player.corpseDetectT > 0){
    const prevC = player.corpseDetectT;
    player.corpseDetectT = Math.max(0, player.corpseDetectT - dt);
    if(prevC>0 && player.corpseDetectT<=0){
      toast('💀 시체 방향 표시 종료 — 위치를 기억해 두세요');
    }
  }
  // 보스 디버프
  if(player.slowT > 0) player.slowT = Math.max(0, player.slowT - dt);
  if(player.poisonT > 0 && scene==='raid' && raid && !raid.over){
    player.poisonT = Math.max(0, player.poisonT - dt);
    player.hp -= 7*dt;
    if(player.hp<=0){ player.hp=0; onDeath(); }
  } else if(player.poisonT > 0){
    player.poisonT = Math.max(0, player.poisonT - dt);
  }

  if(scene==='raid' && raid && !raid.over){
    raid.time += dt;
    const ph = phase();
    if(ph==='dusk' && !raid.duskToast){ raid.duskToast=true; toast('🌆 해가 지고 있다... 서둘러!'); sfx('night'); }
    if(ph==='night' && !raid.nightToast){ raid.nightToast=true; toast('🌙 밤이 왔다. 미니 떼가 몰려온다!!'); sfx('night'); }
    // 배경음악: 밤엔 어두운 곡, 그 외엔 낮 곡
    playMusic(ph==='night' ? 'nightRaid' : 'dayRaid');

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

  // 🎯 케이브 사격장: 발사 + 총알·과녁 처리
  if(scene==='cave' && caveMap){
    updateShooting(dt);
    updateCaveBullets(dt);
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
    toast((boss.t.emoji||'👑')+' '+boss.t.name+' 출현!');
    sfx('boss');
  }
  bossEl.classList.toggle('on', !!boss && !!boss.seen);
  if(boss){
    document.getElementById('bossfill').style.width = (boss.hp/boss.hpMax*100)+'%';
    const bn = document.getElementById('bossname');
    if(bn) bn.textContent = (boss.t.emoji||'👑')+' '+boss.t.name;
  }

  const qEl = document.getElementById('quest');
  const lines = [];
  let anyDone = false;
  for(const [q, icon] of [[State.quest,'📜'],[State.exoQuest,'🔧']]){
    if(!q) continue;
    const pr = questProg(q);
    let txt = icon+' '+q.def.title+' '+pr+'/'+q.def.n;
    if(q.def.fetch) txt += ' · 📦'+Math.min(countItem(q.def.fetch.item), q.def.fetch.n)+'/'+q.def.fetch.n;
    const done = questCanComplete(q);
    if(done){ txt += ' ✔'; anyDone = true; }
    lines.push(txt);
  }
  qEl.textContent = lines.join('\n');
  qEl.classList.toggle('done', anyDone && lines.length>0);

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
    // 케이브에서도 탄약 표시 (사격장에서 총 시험 사격 중)
    ammo.textContent = g.body
      ? (player.reloading>0 ? '재장전... '+player.reloading.toFixed(1) : g.ammo+' / '+st.ammo)
      : '';
    ammo.classList.toggle('low', !!g.body && g.ammo<=Math.max(1,st.ammo*0.2) && player.reloading<=0);
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
