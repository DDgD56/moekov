// ============================================================
// MoeKov — 전투 (적 AI·사격·총알·드롭)
// ============================================================

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
  const dusk = phase()==='dusk';
  // 밤엔 미니의 감지 시야가 크게 넓어진다 (해질녘도 약간). 낮 165 → 밤 460
  let aggroR = night ? 460 : (dusk ? 240 : 165);
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
    // 원거리 발사 배율 (지역별): 총알 속도·발사 빈도·점사 수
    const RGF = curRegion.fire || {};
    const bSpdMul = (RGF.bulletSpd || 1) * (night ? 1.08 : 1);  // 총알 속도 배수
    const fireCdMul = (RGF.fireRate ? 1/RGF.fireRate : 1) * (night ? 0.85 : 1); // 발사 쿨 배수(작을수록 자주)
    const burstAdd = RGF.burstAdd || 0;                          // 점사 추가 발수

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
                raid.ebullets.push({x:e.x, y:e.y, vx:Math.cos(a2)*230*bSpdMul, vy:Math.sin(a2)*230*bSpdMul,
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
          e.shootCd = 1.7 * fireCdMul;
          raid.ebullets.push({x:e.x,y:e.y,vx:dirx*250*bSpdMul,vy:diry*250*bSpdMul,dmg:Math.round(e.t.dmg*dmgN),life:2,r:4,c:'#b070e0'});
          sfx('spit');
        }
      } else if(e.t.ranged==='burst'){
        // 따발미니: 점사 (지역에 따라 발수 증가)
        e.shootCd -= dt;
        let mv = 0;
        if(dp>300) mv=1; else if(dp<180) mv=-0.7;
        moveCircle(e, dirx*spd*mv*dt, diry*spd*mv*dt, solidPx);
        if(e.burstN>0){
          e.burstT -= dt;
          if(e.burstT<=0){
            e.burstT = 0.09; e.burstN--;
            const a = Math.atan2(diry,dirx) + (Math.random()-0.5)*0.24;
            raid.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*330*bSpdMul,vy:Math.sin(a)*330*bSpdMul,dmg:Math.round(e.t.dmg*dmgN),life:1.6,r:3.5,c:'#e8c05a'});
            sfx('spit');
          }
        } else if(dp<360 && e.shootCd<=0 && canSee){ e.shootCd = 2.6 * fireCdMul; e.burstN = 4 + burstAdd; e.burstT = 0; }
      } else if(e.t.ranged==='sniper'){
        // 저격미니: 멀리서 조준(레이저) 후 고속탄
        let mv = 0;
        if(dp<190) mv=-1; else if(dp>560) mv=1;
        moveCircle(e, dirx*spd*mv*dt, diry*spd*mv*dt, solidPx);
        if(dp<600 && mv===0 && canSee){
          e.aimT = (e.aimT||0)+dt;
          if(e.aimT > 1.35 * fireCdMul){
            e.aimT = 0;
            raid.ebullets.push({x:e.x,y:e.y,vx:dirx*560*bSpdMul,vy:diry*560*bSpdMul,dmg:Math.round(e.t.dmg*dmgN),life:1.5,r:4.5,c:'#7ae0e8'});
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
  const SPW = curRegion.spawn || {};
  if(ph==='night' && raid.enemies.length < (SPW.nightCap??140)){
    raid.waveT -= dt;
    if(raid.waveT<=0){
      const ns = nightSec();
      raid.waveT = Math.max(1.8, 4.5 - ns/40);
      const n = Math.min(SPW.nightMax??16, (SPW.nightBase??5) + Math.floor(ns/(SPW.nightGrow??15)));
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
  } else if(ph==='dusk' && raid.enemies.length < (SPW.duskCap??70)){
    raid.waveT -= dt;
    if(raid.waveT<=0){
      raid.waveT = 5;
      for(let i=0;i<(SPW.duskBurst??3);i++){
        const a = rnd(0,Math.PI*2), d = rnd(600,800);
        const x = clamp(player.x+Math.cos(a)*d, 2*TILE, (raid.w-2)*TILE);
        const y = clamp(player.y+Math.sin(a)*d, 2*TILE, (raid.h-2)*TILE);
        if(solidPx(x,y) || houseAtPx(x,y)) continue;
        spawnEnemy(pickWeighted(curRegion.pool), x, y);
      }
    }
  } else if(ph==='day' && raid.enemies.length < (SPW.dayCap??20)){
    raid.trickleT -= dt;
    if(raid.trickleT<=0){
      raid.trickleT = SPW.dayEvery??13;
      // 폐공장처럼 유입이 잦은 지역은 한 번에 여러 마리
      const burst = (SPW.dayEvery && SPW.dayEvery<=8) ? 2 : 1;
      for(let i=0;i<burst;i++){
        const a=rnd(0,Math.PI*2), d=rnd(500,800);
        const x=clamp(player.x+Math.cos(a)*d,2*TILE,(raid.w-2)*TILE);
        const y=clamp(player.y+Math.sin(a)*d,2*TILE,(raid.h-2)*TILE);
        if(!solidPx(x,y) && !houseAtPx(x,y)) spawnEnemy(pickWeighted(curRegion.pool),x,y);
      }
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
  const inCave = scene==='cave';
  const world = inCave ? caveMap : raid;   // 총알을 담을 대상
  const g = curGun();
  const st = gunStats(g);
  player.fireCd -= dt; player.flash -= dt;
  player.swapT = Math.max(0, (player.swapT||0) - dt);
  if(player.reloading>0){
    player.reloading -= dt;
    if(player.reloading<=0){ g.ammo = st.ammo; player.reloading=0; }
  }
  g.ammo = Math.min(g.ammo, st.ammo);

  if(!mouse.down || panel || (!inCave && raid.over) || !g.body || player.swapT>0) return;
  if(player.fireCd>0 || player.reloading>0) return;
  if(g.ammo<=0){ sfx('click'); startReload(); mouse.down=false; return; }

  player.fireCd = 60/st.rpm;
  g.ammo--;
  player.flash = 0.06;
  if(inCave) caveMap.range.shots += st.pellets; // 사격장 통계
  const rec = st.recoil||5;
  shake = Math.min(12, shake + 1 + rec*0.12);

  const moving = (keys.w||keys.a||keys.s||keys.d);
  // 조준 시 탄퍼짐은 조금만 감소(최대 20%) — 대신 이동속도로 큰 대가를 치른다
  const spreadDeg = Math.max(0.5, (st.spread + player.bloom)*(moving?1.5:1)*(1-0.2*player.aimT));
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
    world.bullets.push({x:mx0,y:my0,vx:Math.cos(a)*760,vy:Math.sin(a)*760,dmg:st.dmg,life:0.95});
  }
  // 반동: 탄퍼짐 블룸 + 킥백 연출 + 뒤로 밀려남
  player.bloom = Math.min(24, player.bloom + rec*0.4);
  player.kick = 1;
  moveCircle(player, -Math.cos(player.ang)*rec*0.35, -Math.sin(player.ang)*rec*0.35, inCave?caveSolidPx:solidPx);
  if(!inCave) noiseEvent(player.x,player.y,st.noise);
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

// 🎯 사격장 총알 업데이트 (케이브) — 벽·과녁 충돌, 데미지 통계
function updateCaveBullets(dt){
  const R = caveMap.range;
  for(let i=caveMap.bullets.length-1;i>=0;i--){
    const b = caveMap.bullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    let dead = b.life<=0 || caveSolidPx(b.x,b.y);
    if(!dead){
      for(const tg of R.targets){
        if(dist(b.x,b.y,tg.x,tg.y) < tg.r){
          dead = true;
          tg.hitT = 0.12; tg.popT = 0.9; tg.lastDmg = Math.round(b.dmg); tg.wob = 1;
          R.totalDmg += b.dmg; R.hits++;
          caveMap.dnums.push({x:tg.x, y:tg.y-tg.r-4, txt:Math.round(b.dmg), t:0.8, c:'#ffd76a'});
          // 순간 DPS 창(최근 2초 히트 데미지)
          R.dpsWin.push({t:0, d:b.dmg});
          for(let p=0;p<6;p++)
            caveMap.parts.push({x:b.x,y:b.y,vx:rnd(-90,90),vy:rnd(-90,90),t:rnd(.2,.4),c:'#e8c05a',r:rnd(2,4)});
          sfx('hit');
          break;
        }
      }
    }
    if(dead && caveSolidPx(b.x,b.y))
      caveMap.parts.push({x:b.x,y:b.y,vx:0,vy:0,t:0.15,c:'#ccc',r:2});
    if(dead) caveMap.bullets.splice(i,1);
  }
  // 과녁 반응 감쇠
  for(const tg of R.targets){
    tg.hitT = Math.max(0, tg.hitT - dt);
    tg.popT = Math.max(0, tg.popT - dt);
    tg.wob = Math.max(0, tg.wob - dt*3);
  }
  // DPS 창 유지 (2초)
  for(let i=R.dpsWin.length-1;i>=0;i--){ R.dpsWin[i].t += dt; if(R.dpsWin[i].t>2) R.dpsWin.splice(i,1); }
  // 파티클/데미지숫자
  for(let i=caveMap.parts.length-1;i>=0;i--){ const p=caveMap.parts[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.t-=dt; if(p.t<=0) caveMap.parts.splice(i,1); }
  for(let i=caveMap.dnums.length-1;i>=0;i--){ const d=caveMap.dnums[i]; d.y-=30*dt; d.t-=dt; if(d.t<=0) caveMap.dnums.splice(i,1); }
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
  if(dp<85) hurtPlayer(Math.max(8, Math.round(34*(1-dp/110))));
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

