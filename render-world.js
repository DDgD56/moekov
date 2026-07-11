// ============================================================
// MoeKov — 렌더 월드 (케이브/레이드 지형·장식·시야)
// ============================================================

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
  // 어두운 외곽
  pRect(cam.x-vw/2-40, cam.y-vh/2-40, vw+80, vh+80, '#1a1410');
  const [x0,x1,y0,y1] = tileRange(caveMap.w, caveMap.h);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const v = caveMap.tiles[ty*caveMap.w+tx];
    const [sx,sy] = worldToScreen(tx*TILE, ty*TILE);
    const hsh = ((tx*73856093) ^ (ty*19349663)) >>> 0;
    if(v===1){
      // 돌벽 — 정수 벽돌 패턴
      pRect(sx, sy, TILE, TILE, '#3a2c20');
      pRect(sx, sy+TILE-4, TILE, 4, '#2a1e16');
      pRect(sx, sy, TILE, 2, '#4a3a2c');
      // 가로 줄눈 2줄 + 세로 엇갈림
      pRect(sx, sy+10, TILE, 1, '#2a2018');
      pRect(sx, sy+20, TILE, 1, '#2a2018');
      const ox = (ty%2)?0:16;
      pRect(sx+ox, sy+1, 1, 9, '#2a2018');
      pRect(sx+((ox+16)%32), sy+11, 1, 9, '#2a2018');
      if(hsh%5===0) pRect(sx+4+(hsh%20), sy+4, 3, 2, '#4a3830'); // 돌 하이라이트
    } else {
      // 널빤지 바닥 — 타일마다 2장
      const plank = (hsh%3===0) ? '#6e5844' : (hsh%3===1) ? '#65503c' : '#5c4a38';
      pRect(sx, sy, TILE, TILE, plank);
      pRect(sx, sy+15, TILE, 1, '#3a2e24'); // 이음새
      pRect(sx+((hsh>>2)%28), sy+2, 1, 12, 'rgba(0,0,0,.12)'); // 나뭇결
      pRect(sx, sy, TILE, 1, 'rgba(255,255,255,.04)');
    }
  }

  // 카펫 (생활공간) — 직사각 패턴 러그
  {
    const [rx,ry] = worldToScreen(8*TILE, 12.2*TILE);
    const rw = 6*TILE, rh = 4*TILE;
    pRect(rx, ry, rw, rh, '#6a3030');
    pRect(rx+2, ry+2, rw-4, rh-4, '#8a4040');
    // 테두리 장식 점
    for(let i=0;i<rw;i+=8){ pRect(rx+i, ry+2, 3, 2, '#c07050'); pRect(rx+i, ry+rh-4, 3, 2, '#c07050'); }
    for(let i=0;i<rh;i+=8){ pRect(rx+2, ry+i, 2, 3, '#c07050'); pRect(rx+rw-4, ry+i, 2, 3, '#c07050'); }
    // 중앙 다이아
    pRect(rx+rw/2-6, ry+rh/2-6, 12, 12, '#a05040');
    pRect(rx+rw/2-3, ry+rh/2-3, 6, 6, '#c07050');
  }

  // 사격장 구역 바닥 틴트 (위쪽)
  {
    const [ax,ay] = worldToScreen(1*TILE, 1*TILE);
    pRect(ax, ay, 20*TILE, 6*TILE, 'rgba(40,50,30,.18)');
  }

  // 🎯 사격장
  if(caveMap.range){
    const R = caveMap.range;
    // 사대 라인
    const [lx0] = worldToScreen(1*TILE, R.lineY);
    const [lx1, ly] = worldToScreen((caveMap.w-1)*TILE, R.lineY);
    for(let x=Math.round(lx0); x<lx1; x+=8) pRect(x, ly-1, 4, 2, '#c9a84a');
    // 안내 발판
    pRect(lx0+8*TILE, ly+4, 4*TILE, 6, '#4a3a28');
    pRect(lx0+8*TILE+2, ly+5, 4*TILE-4, 4, '#5a4a30');

    for(const tg of R.targets) drawTarget(tg);
    for(const b of caveMap.bullets){
      const [bx,by] = worldToScreen(b.x,b.y);
      const rr = Math.max(1, Math.round(b.r || 2));
      pBlob(bx, by, rr, b.c || '#ffe08a');
      for(let i=1;i<=3;i++) pRect(bx-b.vx*0.004*i-1, by-b.vy*0.004*i-1, 2, 2, b.c||'#ffe08a');
    }
    for(const p of caveMap.parts){
      const [px,py] = worldToScreen(p.x,p.y);
      ctx.globalAlpha = Math.max(0, p.t*2.5);
      const pr = Math.max(1, Math.round(p.r||2));
      pRect(px-pr/2, py-pr/2, pr, pr, p.c);
      ctx.globalAlpha = 1;
    }
  }

  for(const s of caveMap.stations){
    const [sx,sy] = worldToScreen(s.x,s.y);
    drawStation(s, sx, sy);
  }
  drawPlayer();
}

// 사격장 과녁 — 또렷한 도트 표적
function drawTarget(tg){
  const wob = Math.round(Math.sin(performance.now()/40)*tg.wob*2);
  const [x,y] = worldToScreen(tg.x + wob, tg.y);
  const flash = tg.hitT>0;
  // 스탠드
  pRect(x-3, y+8, 6, 22, '#3a2c1c');
  pRect(x-8, y+28, 16, 4, '#2a2018');
  pRect(x-2, y+8, 4, 20, '#4a3a28');
  // 사각 표적판 (원 대신 또렷한 링)
  const outer = flash ? '#ff6a5a' : '#e8e0d0';
  const midc  = flash ? '#ffd76a' : '#c94a3a';
  const inn   = flash ? '#fff' : '#e8e0d0';
  const core  = flash ? '#ffd76a' : '#c94a3a';
  pRect(x-14, y-14, 28, 28, '#2a2018'); // 외곽 테두리
  pRect(x-12, y-12, 24, 24, outer);
  pRect(x-8, y-8, 16, 16, midc);
  pRect(x-5, y-5, 10, 10, inn);
  pRect(x-2, y-2, 4, 4, core);
  // 십자 조준
  pRect(x-12, y, 24, 1, 'rgba(0,0,0,.2)');
  pRect(x, y-12, 1, 24, 'rgba(0,0,0,.2)');
  // 거리 배지
  const distTxt = tg.kind==='near'?'NEAR':tg.kind==='mid'?'MID':'FAR';
  pRect(x-14, y+16, 28, 10, '#201810');
  pText(distTxt==='NEAR'?1:distTxt==='MID'?2:3, x, y+18, 1.5, '#c9b8a0', '#000');
  if(tg.popT>0){
    ctx.globalAlpha = Math.min(1, tg.popT*2);
    pText(tg.lastDmg, x, y - 22, 2, '#ffd76a', '#20161a');
    ctx.globalAlpha = 1;
  }
}

// 케이브 UI
function renderCaveUI(){
  const near = nearestInteractable();
  for(const s of caveMap.stations){
    // 이름 배지
    const label = s.name;
    const tw = label.length * 7 + 10;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const on = s===near;
    pRect(s.x - tw/2, s.y+28, tw, 14, on ? '#3a3020' : '#201810');
    pBox(s.x - tw/2, s.y+28, tw, 14, on ? '#ffd76a' : '#5a4a38');
    ctx.fillStyle = on ? '#ffd76a' : '#c9b8a0';
    ctx.fillText(label, s.x, s.y+35);
    if(on){
      // 선택 하이라이트 프레임
      pBox(s.x-30, s.y-36, 60, 62, '#ffd76a');
      pBox(s.x-28, s.y-34, 56, 58, 'rgba(255,215,106,.25)');
    }
  }

  if(caveMap.range){
    for(const d of caveMap.dnums){
      const [dx,dy] = worldToScreen(d.x, d.y);
      ctx.globalAlpha = Math.min(1, d.t*2);
      pText(d.txt, dx, dy, 2, d.c||'#ffd76a', '#20161a');
      ctx.globalAlpha = 1;
    }
    const R = caveMap.range;
    const [px, py] = worldToScreen(11*TILE, 6.0*TILE);
    // 안내 패널
    pRect(px-90, py-8, 180, 36, '#201810');
    pBox(px-90, py-8, 180, 36, '#5a4a38');
    ctx.font = 'bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = '#e8c060';
    ctx.fillText('RANGE  click=fire  R=reload', px, py+2);
    const dps = Math.round(R.dpsWin.reduce((a,b)=>a+b.d,0) / 2);
    const acc = R.shots>0 ? Math.round(R.hits/R.shots*100) : 0;
    ctx.fillStyle = '#c9b8a0';
    ctx.fillText('DPS '+dps+'  HIT '+R.hits+'/'+R.shots+' ('+acc+'%)', px, py+16);
  }
}

// 케이브 가구 — 또렷한 도트 스프라이트 (정수 격자)
function drawStation(s, x, y){
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  if(s.panel==='storage'){
    // 📦 나무 궤짝
    pOval(0, 22, 22, 5, 'rgba(0,0,0,.3)');
    // 몸통
    pRect(-22, -6, 44, 24, '#5a3e28');
    pRect(-20, -4, 40, 20, '#8a6238');
    // 뚜껑
    pRect(-22, -16, 44, 12, '#6a4a2c');
    pRect(-20, -14, 40, 8, '#a07840');
    pRect(-20, -6, 40, 2, '#3a2818'); // 뚜껑 이음
    // 금속 띠
    pRect(-20, -2, 40, 3, '#c9a84a');
    pRect(-20, 10, 40, 3, '#c9a84a');
    pRect(-18, -14, 3, 28, '#c9a84a');
    pRect(15, -14, 3, 28, '#c9a84a');
    // 자물쇠
    pRect(-5, 2, 10, 10, '#e8c84a');
    pRect(-3, 4, 6, 6, '#3a2c18');
    pRect(-2, 0, 4, 4, '#c9a84a');
    // 하이라이트
    pRect(-18, -12, 16, 2, 'rgba(255,255,255,.12)');
  }
  else if(s.panel==='bench'){
    // 🛠️ 작업대
    pOval(0, 22, 24, 5, 'rgba(0,0,0,.3)');
    // 다리
    pRect(-24, 6, 6, 14, '#3a2c1c');
    pRect(18, 6, 6, 14, '#3a2c1c');
    pRect(-24, 6, 6, 2, '#5a4a30');
    pRect(18, 6, 6, 2, '#5a4a30');
    // 상판
    pRect(-28, -12, 56, 20, '#4a3420');
    pRect(-26, -10, 52, 16, '#7a5a38');
    pRect(-26, -10, 52, 3, '#9a7a50'); // 상단 하이라이트
    pRect(-26, 4, 52, 2, '#3a2818');
    // 올려둔 총 실루엣
    pRect(-16, -6, 20, 4, '#3a3028');
    pRect(-14, -5, 14, 2, '#5a5048');
    pRect(-16, -4, 4, 6, '#3a3028'); // 손잡이
    // 망치
    pRect(10, -8, 3, 10, '#8a8a84');
    pRect(6, -10, 11, 4, '#6a6a64');
    pRect(7, -9, 9, 2, '#a0a09a');
  }
  else if(s.panel==='board'){
    // 📌 업그레이드 게시판
    pRect(-2, 6, 4, 16, '#3a2c1c'); // 기둥
    pRect(-22, -22, 44, 30, '#4a3420');
    pRect(-20, -20, 40, 26, '#7a5a38');
    pBox(-18, -18, 36, 22, '#5a4028');
    // 쪽지 3장
    pRect(-15, -15, 12, 14, '#e8dcc0');
    pRect(-14, -14, 10, 3, '#c94a3a'); // 빨간 핀 줄
    pRect(0, -14, 14, 10, '#e8dcc0');
    pRect(1, -13, 12, 2, '#5a8ac0');
    pRect(-8, -2, 16, 8, '#e8dcc0');
    // 압정
    pRect(-11, -16, 3, 3, '#c94a3a');
    pRect(5, -15, 3, 3, '#c94a3a');
    pRect(-2, -3, 3, 3, '#e8c84a');
  }
  else if(s.panel==='quest'){
    // 📜 퀘스트 창구 + 사장님
    // 창틀
    pRect(-26, -30, 52, 42, '#5a4028');
    pRect(-22, -26, 44, 32, '#1a1410'); // 안쪽 어둠
    // 차양
    pRect(-28, -34, 56, 8, '#8a3a30');
    pRect(-28, -34, 56, 3, '#a05040');
    for(let i=0;i<5;i++) pRect(-26+i*11, -32, 5, 5, '#e8dcc0');
    // 카운터
    pRect(-26, 8, 52, 10, '#6a4a2c');
    pRect(-24, 10, 48, 6, '#8a6238');
    pRect(-24, 10, 48, 2, '#a07848');
    // 사장님 (미니 도트 인형)
    // 모자
    pRect(-8, -24, 16, 5, '#3a2c4a');
    pRect(-6, -28, 12, 5, '#4a3a5a');
    pRect(-10, -22, 20, 2, '#2a1c3a');
    // 얼굴
    pRect(-7, -20, 14, 12, '#e8d0a8');
    pRect(-6, -19, 12, 10, '#f0dcb8');
    // 눈·부리
    pRect(-4, -16, 2, 2, '#1a1410');
    pRect(3, -16, 2, 2, '#1a1410');
    pRect(1, -13, 6, 3, '#e89040');
    pRect(2, -12, 4, 1, '#d07030');
    // 몸 (카운터 위)
    pRect(-8, -8, 16, 10, '#4a5a7a');
    pRect(-6, -7, 12, 7, '#5a6a8a');
    // 말풍선
    if(State.guns.every(g=>!g.body)){
      const by = -44 + Math.round(Math.sin(performance.now()/280)*2);
      pRect(12, by-10, 18, 16, '#fff8e8');
      pBox(12, by-10, 18, 16, '#5a4a38');
      pRect(14, by+5, 4, 4, '#fff8e8');
      pText('!', 21, by-4, 2.5, '#d84a3a', '#20161a');
    }
  }
  else if(s.panel==='exotic'){
    // 🔧 부품 수집가 — 괴짜 기술자 NPC
    pOval(0, 20, 16, 4, 'rgba(0,0,0,.28)');
    // 작업 상자 / 부품 더미
    pRect(-18, 4, 14, 12, '#3a3428');
    pRect(-16, 6, 10, 8, '#5a4a38');
    pRect(-14, 8, 3, 3, '#5ad0e8'); // 파란 부품
    pRect(-10, 10, 3, 3, '#e8853a');
    pRect(-7, 7, 3, 3, '#e8c84a');
    // 몸
    pRect(-8, -4, 16, 16, '#3a4a5a');
    pRect(-6, -2, 12, 12, '#4a6a7a');
    // 앞치마
    pRect(-7, 2, 14, 10, '#2a3038');
    pRect(-5, 4, 3, 3, '#5ad0e8');
    pRect(2, 6, 3, 3, '#ff8a3a');
    // 머리
    pRect(-7, -18, 14, 14, '#e8d0a8');
    pRect(-6, -17, 12, 12, '#f0dcb8');
    // 고글
    pRect(-7, -14, 6, 5, '#2a3038');
    pRect(1, -14, 6, 5, '#2a3038');
    pRect(-6, -13, 4, 3, '#5ad0e8');
    pRect(2, -13, 4, 3, '#5ad0e8');
    pRect(-1, -13, 2, 2, '#3a4048');
    // 헝클어진 머리
    pRect(-8, -22, 4, 5, '#3a2c1c');
    pRect(-3, -24, 5, 6, '#4a3a28');
    pRect(4, -22, 4, 5, '#3a2c1c');
    // 눈/입
    pRect(-4, -12, 2, 1, '#1a1410');
    pRect(3, -12, 2, 1, '#1a1410');
    pRect(-2, -8, 4, 1, '#c07050');
    // 든 공구
    pRect(10, -6, 3, 14, '#8a8a84');
    pRect(8, -8, 7, 4, '#6a6a64');
    // 수락/보고 가능할 때 말풍선 (엑조틱 슬롯 기준 — 일반 의뢰와 무관)
    if(!State.exoticIntroDone && regionUnlocked('factory')){
      const canAccept = !State.exoQuest;
      const canReport = !!(State.exoQuest
        && typeof questCanComplete==='function' && questCanComplete(State.exoQuest));
      if(canAccept || canReport){
        const by = -36 + Math.round(Math.sin(performance.now()/280)*2);
        pRect(12, by-10, 16, 14, '#fff8e8');
        pBox(12, by-10, 16, 14, '#5ad0e8');
        pText(canReport?'!':'?', 20, by-4, 2.2, canReport?'#d84a3a':'#5ad0e8', '#20161a');
      }
    }
  }
  else if(s.panel==='deploy'){
    // 🚪 출격 문
    pOval(0, 18, 18, 4, 'rgba(0,0,0,.25)');
    // 매트
    pRect(-18, 2, 36, 14, '#3a5a30');
    pRect(-16, 4, 32, 10, '#4a6a3a');
    pBox(-14, 5, 28, 8, '#6a8a50');
    // 문짝
    pRect(-14, -32, 28, 34, '#3a2c1c');
    pRect(-12, -30, 24, 30, '#6a4a2c');
    pRect(-10, -28, 20, 26, '#7a5a38');
    // 문 패널
    pRect(-8, -24, 8, 10, '#5a4028');
    pRect(0, -24, 8, 10, '#5a4028');
    pRect(-8, -10, 8, 8, '#5a4028');
    pRect(0, -10, 8, 8, '#5a4028');
    // 손잡이
    pRect(6, -14, 3, 5, '#e8c84a');
    pRect(7, -13, 1, 3, '#3a2c18');
    // 위 표지
    pRect(-12, -38, 24, 8, '#2a2018');
    pBox(-12, -38, 24, 8, '#e8c84a');
    // 화살표 도트
    pRect(-2, -36, 4, 2, '#e8c84a');
    pRect(-4, -35, 2, 2, '#e8c84a');
    pRect(2, -35, 2, 2, '#e8c84a');
  }
  ctx.restore();
}

function renderRaidWorld(){
  // 지형 — 배경은 맵 밖(울창한 숲/담장), 지형 안쪽만 풀/콘크리트
  const G0 = (raid && raid.ground) || {base:'#3f5136', patchHi:'rgba(110,140,80,.10)', patchLo:'rgba(15,25,10,.10)', blade:'rgba(125,165,95,.45)', flower:true, outer:'#1d2618', forest1:'#243020', forest2:'#1f2a1b'};
  const vw = W/ZOOM, vh = H/ZOOM;
  ctx.fillStyle = G0.outer;
  ctx.fillRect(cam.x-vw/2-40, cam.y-vh/2-40, vw+80, vh+80);
  const [x0,x1,y0,y1] = tileRange(raid.w, raid.h);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const v = raid.tiles[ty*raid.w+tx];
    const [sx,sy] = worldToScreen(tx*TILE, ty*TILE);
    const hsh = ((tx*73856093) ^ (ty*19349663)) >>> 0;
    if(v===8){
      // 맵 밖 수풀 — 덩어리 타일
      pRect(sx, sy, TILE, TILE, G0.outer);
      if(hsh%2===0) pRect(sx+4+(hsh%16), sy+4+((hsh>>3)%16), 12+(hsh%8), 10+(hsh%6), (hsh%2)?G0.forest1:G0.forest2);
      if(hsh%3===0) pRect(sx+2, sy+14, 8, 8, G0.forest2);
    } else if(v===0){
      // 지면
      pRect(sx, sy, TILE, TILE, G0.base);
      if(hsh%4===0) pRect(sx+(hsh%20)+2, sy+((hsh>>3)%18)+2, 8+(hsh%6), 6+(hsh%4), (hsh%8===0)?G0.patchHi:G0.patchLo);
      if(G0.crack){
        if(hsh%9===3){
          const gx=sx+(hsh%16)+2, gy=sy+((hsh>>3)%16)+2;
          pRect(gx, gy, 7, 1, 'rgba(0,0,0,.3)');
          pRect(gx+5, gy, 1, 6, 'rgba(0,0,0,.25)');
          pRect(gx+2, gy+5, 6, 1, 'rgba(0,0,0,.22)');
        }
        if(hsh%13===5) pRect(sx, sy+((hsh>>2)%26)+2, TILE, 1, 'rgba(0,0,0,.14)');
      } else if(hsh%7===2){
        const gx = sx+4+(hsh%18), gy = sy+14+(hsh%10);
        pRect(gx, gy-6, 1, 7, G0.blade);
        pRect(gx+3, gy-7, 1, 8, G0.blade);
        pRect(gx+6, gy-5, 1, 6, G0.blade);
      }
      if(G0.oilStain && hsh%23===4) pRect(sx+(hsh%16)+4, sy+(hsh%14)+6, 8, 5, 'rgba(10,8,14,.32)');
      if(G0.reed && hsh%17===3){
        const rx0 = sx+4+(hsh%16), ry0 = sy+20;
        pRect(rx0, ry0-11, 1, 11, 'rgba(90,110,50,.7)');
        pRect(rx0+3, ry0-13, 1, 13, 'rgba(90,110,50,.65)');
        pRect(rx0+6, ry0-10, 1, 10, 'rgba(90,110,50,.6)');
        if(hsh%2===0) pRect(rx0+2, ry0-14, 3, 2, 'rgba(200,180,60,.55)');
      }
      if(G0.flower && hsh%61===7){
        pRect(sx+(hsh%22)+4, sy+(hsh%18)+4, 3, 3, (hsh%2)?'#e8d8a0':'#d8a8c0');
        pRect(sx+(hsh%22)+5, sy+(hsh%18)+5, 1, 1, '#fff8c0');
      }
    } else if(v===1){
      // 벽 벽돌 / 산업 패널
      const wall = raid.biome==='industrial' ? '#5a5c5e' : '#5d5348';
      const wallHi = raid.biome==='industrial' ? '#6a6c70' : '#6d6358';
      pRect(sx, sy, TILE, TILE, wall);
      pRect(sx, sy, TILE, 3, wallHi);
      pRect(sx, sy+TILE-5, TILE, 5, 'rgba(0,0,0,.28)');
      pRect(sx, sy+10, TILE, 1, 'rgba(0,0,0,.18)');
      pRect(sx, sy+21, TILE, 1, 'rgba(0,0,0,.15)');
      const ox = (ty%2)?0:16;
      pRect(sx+ox, sy+1, 1, 9, 'rgba(0,0,0,.2)');
      pRect(sx+((ox+16)%32), sy+11, 1, 10, 'rgba(0,0,0,.18)');
    } else if(v===2){
      // 실내 널
      const fl = (hsh%2)?'#7d6b52':'#75634c';
      pRect(sx, sy, TILE, TILE, fl);
      pRect(sx, sy+15, TILE, 1, 'rgba(0,0,0,.14)');
      pRect(sx+(hsh%24)+2, sy+2, 1, 12, 'rgba(0,0,0,.1)');
      pRect(sx, sy, TILE, 1, 'rgba(255,255,255,.05)');
    } else if(v===4){
      if(raid.biome==='industrial'){
        pRect(sx+4, sy+22, 24, 4, 'rgba(0,0,0,.3)');
        if(hsh%2===0){
          const dc = (hsh%3===0)?'#8a5a2a':(hsh%3===1)?'#5a6a4a':'#7a3a3a';
          pRect(sx+6, sy+6, 20, 18, '#2a2420');
          pRect(sx+7, sy+7, 18, 16, dc);
          pRect(sx+7, sy+7, 18, 3, 'rgba(255,255,255,.14)');
          pRect(sx+7, sy+13, 18, 1, 'rgba(0,0,0,.25)');
          pRect(sx+7, sy+18, 18, 1, 'rgba(0,0,0,.25)');
          pRect(sx+13, sy+5, 6, 3, '#3a3428'); // 뚜껑
        } else {
          pRect(sx+5, sy+10, 20, 14, '#5a564e');
          pRect(sx+8, sy+8, 12, 8, '#6e6a60');
          pRect(sx+10, sy+12, 8, 6, '#807a70');
          pRect(sx+12, sy+9, 1, 12, 'rgba(0,0,0,.35)');
        }
      } else {
        // 바위 — 계단식 블록
        pRect(sx+4, sy+20, 24, 5, 'rgba(0,0,0,.25)');
        pRect(sx+6, sy+12, 20, 12, '#6a6a64');
        pRect(sx+8, sy+8, 16, 10, '#8a8a84');
        pRect(sx+10, sy+6, 10, 6, '#a0a09a');
        pRect(sx+11, sy+7, 4, 2, 'rgba(255,255,255,.12)');
      }
    } else if(v===5){
      const indus = raid.biome==='industrial';
      const swamp = raid.biome==='swamp';
      const water = indus ? '#3a4238' : swamp ? '#2a4a3e' : '#35566e';
      const waterHi = indus ? 'rgba(120,140,110,.22)' : swamp ? 'rgba(200,180,80,.25)' : 'rgba(160,200,230,.3)';
      pRect(sx, sy, TILE, TILE, water);
      const tt = Math.floor(performance.now()/400);
      if((hsh+tt)%7<2) pRect(sx+((hsh+tt*13)%22)+2, sy+6+((hsh>>3)%18), 8, 2, waterHi);
      if(indus && hsh%5===0) pRect(sx+(hsh%16)+4, sy+(hsh%14)+6, 8, 4, 'rgba(80,60,90,.3)');
      if(swamp && hsh%6===0) pRect(sx+(hsh%14)+6, sy+(hsh%12)+8, 6, 3, 'rgba(230,200,90,.4)');
      const landAt = (X,Y)=>{ const vv=raid.tiles[Y*raid.w+X]; return vv!==5 && vv!==7; };
      const shore = swamp ? 'rgba(160,180,120,.4)' : 'rgba(180,220,240,.45)';
      if(ty>0 && landAt(tx,ty-1)) pRect(sx,sy,TILE,2, shore);
      if(ty<raid.h-1 && landAt(tx,ty+1)) pRect(sx,sy+TILE-2,TILE,2, shore);
      if(tx>0 && landAt(tx-1,ty)) pRect(sx,sy,2,TILE, shore);
      if(tx<raid.w-1 && landAt(tx+1,ty)) pRect(sx+TILE-2,sy,2,TILE, shore);
    } else if(v===7){
      if(raid.biome==='industrial'){
        pRect(sx, sy, TILE, TILE, '#6a6660');
        pRect(sx, sy, TILE, 2, 'rgba(255,255,255,.12)');
        pRect(sx, sy+TILE-3, TILE, 3, '#3f3c38');
        for(let xx=4; xx<TILE; xx+=8) for(let yy=4; yy<TILE; yy+=8) pRect(sx+xx, sy+yy, 2, 2, 'rgba(0,0,0,.22)');
      } else {
        pRect(sx, sy, TILE, TILE, '#8a6a42');
        pRect(sx, sy, TILE, 2, '#5d4526');
        pRect(sx, sy+TILE-3, TILE, 3, '#5d4526');
        for(let xx=6; xx<TILE; xx+=8) pRect(sx+xx, sy, 1, TILE, 'rgba(0,0,0,.18)');
      }
    }
  }

  // 현관 매트
  for(const m of raid.doormats){
    const mx = m.tx*TILE, my = m.ty*TILE;
    if(offscreenW(mx, my, 90)) continue;
    if(m.horiz){
      pRect(mx+2, my+8, TILE*2-4, TILE-16, '#8a6a3a');
      pRect(mx+4, my+10, TILE*2-8, TILE-20, '#b8975a');
      pBox(mx+4, my+10, TILE*2-8, TILE-20, '#6a4a28');
    } else {
      pRect(mx+8, my+2, TILE-16, TILE*2-4, '#8a6a3a');
      pRect(mx+10, my+4, TILE-20, TILE*2-8, '#b8975a');
      pBox(mx+10, my+4, TILE-20, TILE*2-8, '#6a4a28');
    }
  }

  // 화물 컨테이너 야적장
  if(raid.yards) for(const yard of raid.yards){
    for(const b of yard.boxes){
      const bx=b.tx*TILE, by=b.ty*TILE, bw2=b.w*TILE, bh2=b.h*TILE;
      if(offscreenW(bx+bw2/2, by+bh2/2, 120)) continue;
      const [sx,sy]=worldToScreen(bx,by);
      pRect(sx+3, sy+bh2-3, bw2, 5, 'rgba(0,0,0,.3)');
      pRect(sx, sy, bw2, bh2-1, '#2a2420');
      pRect(sx+1, sy+1, bw2-2, bh2-3, b.color);
      for(let x=sx+5; x<sx+bw2-3; x+=6) pRect(x, sy+2, 2, bh2-6, 'rgba(0,0,0,.18)');
      pRect(sx+1, sy+1, bw2-2, 3, 'rgba(255,255,255,.12)');
      pRect(sx+1, sy+bh2-5, bw2-2, 2, 'rgba(0,0,0,.25)');
      pRect(sx+bw2-8, sy+8, 2, bh2-16, 'rgba(0,0,0,.4)');
      pRect(sx+bw2-12, sy+8, 2, bh2-16, 'rgba(0,0,0,.35)');
    }
  }

  // 탈출 지점 — 사각 링 + 깃발
  const pulse = 0.7 + 0.3*Math.sin(performance.now()/300);
  for(const z of raid.extracts){
    const [sx,sy] = worldToScreen(z.x,z.y);
    const r = 26;
    pRect(sx-r, sy-r, r*2, r*2, `rgba(90,220,120,${0.1*pulse})`);
    pBox(sx-r, sy-r, r*2, r*2, `rgba(90,220,120,${0.55*pulse})`);
    pBox(sx-r+3, sy-r+3, r*2-6, r*2-6, `rgba(90,220,120,${0.25*pulse})`);
    pRect(sx-1, sy-18, 2, 22, '#4a3a28');
    pRect(sx+1, sy-18, 11, 8, '#e05a4a');
    pRect(sx+1, sy-12, 9, 2, '#c94a3a');
    pRect(sx+2, sy-16, 3, 2, 'rgba(255,255,255,.25)');
  }

  // 실내 장식물 (공장 기계/랙/컨베이어) — 지붕이 걷힌 곳만
  drawDecor();

  // 컨테이너
  for(const c of raid.containers){
    if(offscreenW(c.x,c.y,60)) continue;
    const [sx,sy] = worldToScreen(c.x,c.y);
    drawContainer(c, sx, sy);
    if(c.hp < c.hpMax){
      pRect(sx-13, sy-24, 26, 4, 'rgba(0,0,0,.55)');
      pRect(sx-13, sy-24, Math.max(1,26*c.hp/c.hpMax), 4, '#c9a05a');
      pBox(sx-13, sy-24, 26, 4, '#2a2018');
    }
  }

  // 농장 밭이랑
  for(const f of (raid.farms||[])){
    if(offscreenW((f.x+f.w/2)*TILE, (f.y+f.h/2)*TILE, Math.max(f.w,f.h)*TILE/2+40)) continue;
    for(const ry2 of f.rows){
      const [sx,sy] = worldToScreen((f.x+1)*TILE, ry2*TILE);
      const fw = (f.w-2)*TILE;
      pRect(sx, sy+8, fw, TILE-16, '#4a3828');
      pRect(sx+1, sy+9, fw-2, TILE-18, '#5a4632');
      pRect(sx, sy+TILE/2, fw, 2, 'rgba(0,0,0,.2)');
      for(let cxp=sx+8; cxp<sx+fw; cxp+=14){
        pRect(cxp, sy+TILE/2-3, 3, 3, '#5a7a3a');
        pRect(cxp+1, sy+TILE/2-5, 1, 3, '#6a8a4a');
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
      pBlob(sx, sy, 5, '#e8c84a');
      pBox(sx-4, sy-4, 8, 8, '#a8882a');
    } else {
      const bob = Math.sin(performance.now()/300 + d.bob)*3;
      pOval(sx, sy+8, 9, 3, 'rgba(0,0,0,.28)');
      if(typeof drawItemIconWorld==='function')
        drawItemIconWorld(d.inst.def, sx, sy+bob-2, 18, !!d.inst.hidden);
      else {
        ctx.font = '18px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(d.inst.def.emoji, sx, sy+bob-4);
      }
    }
  }

  // 적
  for(const e of raid.enemies){
    if(offscreenW(e.x,e.y,60)) continue;
    const [sx,sy] = worldToScreen(e.x,e.y);
    // 저격 조준선 (도트 점선)
    if(e.t.ranged==='sniper' && e.state==='chase' && (e.aimT||0)>0.15){
      const ang = Math.atan2(player.y-e.y, player.x-e.x);
      const a = Math.min(0.8, e.aimT*0.55);
      for(let d=12; d<600; d+=8){
        pRect(sx+Math.cos(ang)*d-1, sy+Math.sin(ang)*d-1, 2, 2, `rgba(255,70,70,${a})`);
      }
    }
    if(e.t.bomber && e.state==='chase' && Math.floor(performance.now()/150)%2===0){
      pBox(sx-e.r-4, sy-e.r-4, (e.r+4)*2, (e.r+4)*2, 'rgba(255,80,60,.55)');
    }
    if(phase()==='night' && e.state==='chase' && !e.t.bomber){
      pBox(sx-e.r-2, sy-e.r-2, (e.r+2)*2, (e.r+2)*2, 'rgba(255,60,50,.3)');
    }
    if(e.t.boss && e.mode==='windup'){
      for(let d=8; d<320; d+=6){
        pRect(sx+(e.dashX||0)*d-1, sy+(e.dashY||0)*d-1, 3, 3, 'rgba(255,80,50,.7)');
      }
    }
    // 상태이상 아이콘
    if(e.burn>0) pRect(sx-10, sy-e.r-16, 4, 4, '#ff8a3a');
    if(e.poison>0) pRect(sx-4, sy-e.r-16, 4, 4, '#7ad060');
    if(e.chill>0) pRect(sx+2, sy-e.r-16, 4, 4, '#8ad8ff');
    else if(e.slow>0) pRect(sx+2, sy-e.r-16, 4, 4, '#e8b0d8');
    if(e.stun>0) pRect(sx+8, sy-e.r-16, 4, 4, '#a8d0ff');

    // 냉기 중: 파란 기운
    if(e.chill>0){
      const t = performance.now()/1000;
      const flick = 0.5 + 0.5*Math.sin(t*10 + (e.seed||0));
      pOval(sx, sy+e.r*0.3, e.r*0.9, Math.max(2, e.r*0.2),
        `rgba(120,200,255,${0.18+0.12*flick})`);
      for(let i=0;i<3;i++){
        const a = t*4 + i*2.1 + (e.seed||0);
        pBlob(sx+Math.cos(a)*e.r*0.6, sy-e.r*0.2+Math.sin(a)*3, 2,
          i%2?'#c8f0ff':'#70c8f0');
      }
    }

    // 화상 중: 발밑 불빛 + 몸 주변 불꽃 (도트)
    if(e.burn>0){
      const t = performance.now()/1000;
      const flick = 0.55 + 0.45*Math.sin(t*14 + (e.seed||0)*3);
      pOval(sx, sy+e.r*0.35, e.r*(0.85+0.15*flick), Math.max(2, e.r*0.22),
        `rgba(255,90,20,${0.22+0.18*flick})`);
      for(let i=0;i<5;i++){
        const a = t*6 + i*1.25 + (e.seed||0);
        const fr = e.r*(0.55 + 0.2*Math.sin(a*2));
        const fx = sx + Math.cos(a)*fr*0.85;
        const fy = sy - e.r*0.15 - Math.abs(Math.sin(a*1.7))*e.r*0.55 - i;
        const fs = 2 + (i%2) + Math.round(flick);
        pBlob(fx, fy, fs, i%2 ? '#ffd24a' : '#ff6a20');
        pRect(fx-1, fy-fs-1, 2, fs, 'rgba(255,200,80,.7)');
      }
    }

    const faceAng = e.state==='chase' ? Math.atan2(player.y-e.y, player.x-e.x) : e.wdir;
    const eFace = Math.cos(faceAng) >= 0 ? 1 : -1;
    const eMoving = e.state==='chase' || e.moveT>0;
    drawGirl(sx, sy, e.r, enemyPal(e), eFace, e.hitT>0, e.t.elite || e.t.boss,
      { walk: eMoving ? performance.now()/90 + e.seed*3 : 0,
        bob: eMoving ? Math.abs(Math.sin(performance.now()/180 + e.seed*3))*1.2 : 0 });
    // 보스 머리 장식 (스타일별)
    if(e.t.boss){
      const cy2 = Math.round(sy - e.r*1.4 - 4);
      const style = e.t.bossStyle || 'king';
      if(style==='thorn'){
        // 가시 덤불 왕관
        pRect(sx-11, cy2, 22, 5, '#3a6a28');
        pRect(sx-10, cy2-7, 3, 9, '#6aba40');
        pRect(sx-2, cy2-10, 4, 12, '#5aaa38');
        pRect(sx+7, cy2-7, 3, 9, '#6aba40');
        pRect(sx-1, cy2-2, 2, 2, '#c9e080');
      } else if(style==='mire'){
        // 연꽃·황금 왕관
        pRect(sx-13, cy2, 26, 6, '#c9a030');
        pRect(sx-12, cy2-5, 5, 7, '#e0c04a');
        pRect(sx-2, cy2-9, 5, 11, '#f0d860');
        pRect(sx+7, cy2-5, 5, 7, '#e0c04a');
        pRect(sx-1, cy2-3, 3, 3, '#a070d0');
      } else {
        pRect(sx-12, cy2, 24, 6, '#e0b83a');
        pRect(sx-12, cy2-6, 4, 8, '#ffd24a');
        pRect(sx-2, cy2-8, 4, 10, '#ffd24a');
        pRect(sx+8, cy2-6, 4, 8, '#ffd24a');
        pRect(sx-1, cy2-2, 2, 2, '#e04a4a');
      }
    }
    if(e.hp < e.hpMax){
      pRect(sx-14, sy-e.r-10, 28, 4, 'rgba(0,0,0,.55)');
      pRect(sx-14, sy-e.r-10, Math.max(1,28*e.hp/e.hpMax), 4, '#e05a5a');
      pBox(sx-14, sy-e.r-10, 28, 4, '#2a2018');
    }
  }

  // 총알 (모드별 도트)
  for(const b of raid.bullets){
    const [sx,sy] = worldToScreen(b.x,b.y);
    const rr = Math.max(1, Math.round(b.r || 3));
    const col = b.c || '#ffe9a0';
    pBlob(sx, sy, rr, col);
    if(b.mode==='laser'){
      for(let i=1;i<=4;i++) pRect(sx-b.vx*0.003*i-1, sy-b.vy*0.003*i-1, 2, 2, 'rgba(120,240,255,.55)');
    } else if(b.mode==='flame'){
      const ff = 0.6 + 0.4*Math.sin(performance.now()/50 + b.x);
      pBlob(sx, sy, rr+2, `rgba(255,140,60,${0.35*ff})`);
      pBlob(sx - b.vx*0.004, sy - b.vy*0.004, Math.max(1,rr), 'rgba(255,210,80,.45)');
      pRect(sx-1, sy-rr-2, 2, rr, 'rgba(255,180,60,.5)');
    } else if(b.mode==='ice'){
      pBlob(sx, sy, rr+1, 'rgba(140,220,255,.4)');
      pRect(sx-2, sy-1, 4, 2, '#e8f8ff');
      pRect(sx-1, sy-3, 2, 2, '#a0e0ff');
    } else if(b.mode==='glue'){
      pOval(sx, sy, rr+1, Math.max(1, rr-1), 'rgba(230,160,200,.4)');
    } else if(b.mode==='shock'){
      pRect(sx-1, sy-4, 2, 3, '#a8d0ff');
      pRect(sx, sy-1, 3, 2, '#a8d0ff');
      pRect(sx+1, sy+2, 2, 2, '#d0e8ff');
    }
  }
  for(const b of raid.ebullets){
    const [sx,sy] = worldToScreen(b.x,b.y);
    pBlob(sx, sy, Math.max(2, Math.round(b.r||4)), b.c || '#b070e0');
  }

  // 파티클
  for(const p of raid.parts){
    const [sx,sy] = worldToScreen(p.x,p.y);
    ctx.globalAlpha = Math.min(1,p.t*3);
    const pr = Math.max(1, Math.round(p.r||2));
    if(p.flame){
      // 불꽃: 둥근 핵 + 위쪽 가느다란 심지
      pBlob(sx, sy, pr, p.c);
      pRect(sx-1, sy-pr-1, 2, pr+1, p.c);
      ctx.globalAlpha = Math.min(0.5, p.t*2);
      pBlob(sx, sy-1, Math.max(1, pr-1), '#ffe9a0');
    } else if(p.ice){
      pBlob(sx, sy, pr, p.c);
      pRect(sx-pr, sy, pr*2+1, 1, '#e8f8ff');
    } else {
      pRect(sx-pr/2, sy-pr/2, pr, pr, p.c);
    }
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
  const near = nearestInteractable();
  if(near){
    pBox(near.x-20, near.y-19, 40, 38, '#ffd76a');
    const label = '[E] '+near.ct.name;
    const tw = Math.min(120, label.length*6+12);
    pRect(near.x-tw/2, near.y-36, tw, 12, '#201810');
    pBox(near.x-tw/2, near.y-36, tw, 12, '#ffd76a');
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffd76a';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, near.x, near.y-30);
  }
  // 소음 링 — 사각 점선
  for(const n of raid.noises){
    const [sx,sy] = worldToScreen(n.x,n.y);
    const a = n.t*0.5;
    const steps = 24;
    for(let i=0;i<steps;i++){
      const ang = i/steps*Math.PI*2;
      pRect(sx+Math.cos(ang)*n.r-1, sy+Math.sin(ang)*n.r-1, 2, 2, `rgba(255,200,80,${a})`);
    }
  }
  for(const d of raid.dnums){
    const [sx,sy] = worldToScreen(d.x,d.y);
    ctx.globalAlpha = Math.min(1, d.t*2);
    pText(d.txt, sx, sy-5, 2, d.c);
    ctx.globalAlpha = 1;
  }
  // 재장전 — 사각 프로그레스
  if(player.reloading>0 && player.reloadTotal>0){
    const pr = 1 - player.reloading/player.reloadTotal;
    pRect(psx-16, psy-48, 32, 6, '#201810');
    pRect(psx-16, psy-48, Math.max(1,32*pr), 6, '#ffd76a');
    pBox(psx-16, psy-48, 32, 6, '#5a4a38');
    pRect(psx-18, psy-58, 36, 10, '#201810');
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#ffd76a'; ctx.textAlign='center';
    ctx.fillText('RELOAD', psx, psy-53);
  } else if(curGun().body && curGun().ammo<=0 && !raid.over){
    if(Math.floor(performance.now()/280)%2===0){
      pRect(psx-28, psy-48, 56, 12, '#201810');
      pBox(psx-28, psy-48, 56, 12, '#ff9a5a');
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ff9a5a'; ctx.textAlign='center';
      ctx.fillText('R RELOAD', psx, psy-42);
    }
  }
  if(raid.extractT>0.05){
    const pr = raid.extractT/3;
    pRect(psx-18, psy-50, 36, 6, '#201810');
    pRect(psx-18, psy-50, Math.max(1,36*pr), 6, '#5adc78');
    pBox(psx-18, psy-50, 36, 6, '#3a6a40');
    pRect(psx-26, psy-62, 52, 10, '#201810');
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#8ae09a'; ctx.textAlign='center';
    ctx.fillText('EXTRACT', psx, psy-57);
  }
  drawExtractCompass(psx, psy);
  drawCorpseCompass(psx, psy);
}

// 탈출구 방향 표시 — 휴대용 탐지기(일시) 또는 탐지모듈 장착 총
function extractDetectActive(){
  if(player.extractDetectT > 0) return true;
  const st = gunStats(curGun());
  return !!(st && st.extractDetect);
}
function nearestExtractZone(){
  if(!raid || !raid.extracts || !raid.extracts.length) return null;
  let best = null, bd = Infinity;
  for(const z of raid.extracts){
    const d = dist(player.x, player.y, z.x, z.y);
    if(d < bd){ bd = d; best = z; }
  }
  return best;
}
function drawExtractCompass(psx, psy){
  if(!extractDetectActive() || raid.over) return;
  const z = nearestExtractZone();
  if(!z) return;
  const ang = Math.atan2(z.y - player.y, z.x - player.x);
  const pulse = 0.65 + 0.35*Math.sin(performance.now()/180);
  const r = 38;
  const ax = psx + Math.cos(ang)*r;
  const ay = psy + Math.sin(ang)*r;
  // 링
  pBox(psx-r-2, psy-r-2, r*2+4, r*2+4, `rgba(90,220,200,${0.25*pulse})`);
  // 화살 머리 (삼각형 픽셀)
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tipX = ax + ca*8, tipY = ay + sa*8;
  const bx = ax - ca*6, by = ay - sa*6;
  const px1 = bx - sa*7, py1 = by + ca*7;
  const px2 = bx + sa*7, py2 = by - ca*7;
  ctx.fillStyle = `rgba(90,230,180,${0.9*pulse})`;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(px1, py1);
  ctx.lineTo(px2, py2);
  ctx.closePath();
  ctx.fill();
  pBox(tipX-1, tipY-1, 3, 3, '#e8fff0');
  // 거리·남은 시간
  const distM = Math.round(dist(player.x, player.y, z.x, z.y)/TILE);
  let label;
  if(player.extractHintIntro && player.extractDetectT > 0)
    label = '🚪 탈출 '+distM+'m '+player.extractDetectT.toFixed(1)+'s';
  else if(player.extractDetectT > 0)
    label = '📡 '+distM+'m '+player.extractDetectT.toFixed(1)+'s';
  else
    label = '📡 '+distM+'m 모듈';
  const tw = Math.min(100, label.length*5.5+10);
  pRect(psx-tw/2, psy+r+4, tw, 11, 'rgba(16,24,20,.85)');
  pBox(psx-tw/2, psy+r+4, tw, 11, `rgba(90,220,180,${0.55*pulse})`);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#9ef0c8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, psx, psy+r+9.5);
}

// 시체 방향 표시 — 출격 직후 30초 (escape 탐지기와 별도 링)
function findRaidCorpse(){
  if(!raid || !raid.containers) return null;
  for(const c of raid.containers) if(c.type==='corpse') return c;
  return null;
}
function drawCorpseCompass(psx, psy){
  if(!player.corpseDetectT || player.corpseDetectT<=0 || !raid || raid.over) return;
  const c = findRaidCorpse();
  if(!c) return;
  const ang = Math.atan2(c.y - player.y, c.x - player.x);
  const pulse = 0.65 + 0.35*Math.sin(performance.now()/160);
  const r = 52;
  const ax = psx + Math.cos(ang)*r;
  const ay = psy + Math.sin(ang)*r;
  pBox(psx-r-2, psy-r-2, r*2+4, r*2+4, `rgba(200,120,120,${0.22*pulse})`);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tipX = ax + ca*8, tipY = ay + sa*8;
  const bx = ax - ca*6, by = ay - sa*6;
  const px1 = bx - sa*7, py1 = by + ca*7;
  const px2 = bx + sa*7, py2 = by - ca*7;
  ctx.fillStyle = `rgba(230,140,140,${0.92*pulse})`;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(px1, py1);
  ctx.lineTo(px2, py2);
  ctx.closePath();
  ctx.fill();
  pBox(tipX-1, tipY-1, 3, 3, '#ffe8e8');
  const distM = Math.round(dist(player.x, player.y, c.x, c.y)/TILE);
  const label = '💀 시체 '+distM+'m '+player.corpseDetectT.toFixed(1)+'s';
  const tw = Math.min(120, label.length*5.5+10);
  // 탈출 나침반 라벨 아래에 배치
  const ly = psy + r + 4;
  pRect(psx-tw/2, ly, tw, 11, 'rgba(28,16,16,.88)');
  pBox(psx-tw/2, ly, tw, 11, `rgba(200,100,100,${0.55*pulse})`);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#f0b0b0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, psx, ly+5.5);
}

// 지붕 — 각진 타일
function drawRoofs(){
  for(const hs of raid.houses){
    if(hs.roofA<=0.02) continue;
    const w = hs.w*TILE, h = hs.h*TILE, ov = 4;
    if(offscreenW((hs.x+hs.w/2)*TILE, (hs.y+hs.h/2)*TILE, Math.max(w,h)/2+60)) continue;
    const [sx,sy] = worldToScreen(hs.x*TILE, hs.y*TILE);
    ctx.globalAlpha = hs.roofA;
    pRect(sx-ov, sy-ov, w+ov*2, h+ov*2, hs.roofC);
    // 기와/널 줄
    for(let yy=sy+4; yy<sy+h; yy+=8) pRect(sx-ov+2, yy, w+ov*2-4, 1, 'rgba(0,0,0,.18)');
    // 용마루
    pRect(sx-ov, sy+h/2-2, w+ov*2, 4, 'rgba(0,0,0,.22)');
    pBox(sx-ov, sy-ov, w+ov*2, h+ov*2, 'rgba(0,0,0,.35)');
    // 문 위치 표시
    for(const d of (hs.doors||[])){
      const dw = (d.wide||2)*TILE-8;
      if(d.side<2){
        const dy2 = d.side===0 ? sy-ov : sy+h+ov-5;
        pRect(sx + (d.x-hs.x)*TILE + 4, dy2, dw, 5, 'rgba(255,220,140,.9)');
      } else {
        const dx2 = d.side===2 ? sx-ov : sx+w+ov-5;
        pRect(dx2, sy + (d.y-hs.y)*TILE + 4, 5, dw, 'rgba(255,220,140,.9)');
      }
    }
    if(hs.factory){
      for(let xx=sx+12; xx<sx+w; xx+=20) pRect(xx, sy-ov+2, 1, h+ov*2-4, 'rgba(120,140,160,.25)');
      for(let yy=sy+12; yy<sy+h; yy+=20) pRect(sx-ov+2, yy, w+ov*2-4, 1, 'rgba(120,140,160,.15)');
    }
    ctx.globalAlpha = 1;
  }
}

// 나무 — 블록형 캐노피 + 줄기
function drawTrees(){
  for(const t of raid.trees){
    if(offscreenW(t.x, t.y, t.r+30)) continue;
    ctx.globalAlpha = t.a;
    const r = Math.max(8, Math.round(t.r));
    // 그림자
    pRect(t.x-r*0.6, t.y+r*0.3, r*1.3, r*0.45, 'rgba(0,0,0,.18)');
    // 줄기
    pRect(t.x-2, t.y-2, 4, r*0.5, '#4a3420');
    pRect(t.x-1, t.y-2, 2, r*0.45, '#5a4430');
    // 잎 덩어리 (3단 사각)
    pRect(t.x-r*0.7, t.y-r*0.55, r*1.4, r*0.9, '#2c4224');
    pRect(t.x-r*0.55, t.y-r*0.75, r*1.1, r*0.7, '#3a5530');
    pRect(t.x-r*0.35, t.y-r*0.85, r*0.7, r*0.45, '#4c6c3e');
    // 하이라이트 점
    pRect(t.x-r*0.2, t.y-r*0.6, 3, 2, 'rgba(255,255,255,.08)');
    ctx.globalAlpha = 1;
  }
}

// 공장 장식
function drawDecor(){
  for(const d of (raid.decor||[])){
    const vis2 = 1 - (d.hs ? d.hs.roofA : 0);
    if(vis2 <= 0.03) continue;
    const px=d.tx*TILE, py=d.ty*TILE, wpx=d.w*TILE, hpx=d.h*TILE;
    if(offscreenW(px+wpx/2, py+hpx/2, Math.max(wpx,hpx))) continue;
    const [sx,sy]=worldToScreen(px,py);
    ctx.save();
    ctx.globalAlpha = vis2;
    ctx.translate(Math.round(sx), Math.round(sy));
    if(d.kind==='rack'){
      pRect(2, 3, wpx-2, hpx-2, 'rgba(0,0,0,.3)');
      pRect(0, 0, wpx, hpx, '#4a4e54');
      pRect(1, 1, wpx-2, hpx-2, '#5a5e64');
      if(d.horiz){
        for(let x=0;x<wpx;x+=TILE) pRect(x, 0, 2, hpx, '#3a3e44');
        pRect(0, hpx*0.5-1, wpx, 2, '#3a3e44');
      } else {
        for(let y=0;y<hpx;y+=TILE) pRect(0, y, wpx, 2, '#3a3e44');
        pRect(wpx*0.5-1, 0, 2, hpx, '#3a3e44');
      }
      const n = d.horiz ? Math.floor(wpx/TILE) : Math.floor(hpx/TILE);
      for(let i=0;i<n;i++){
        if((d.tx+d.ty+i)%3===0) continue;
        if(d.horiz) pRect(i*TILE+6, hpx*0.18, TILE-12, hpx*0.28, '#8a6a3a');
        else pRect(wpx*0.18, i*TILE+6, wpx*0.28, TILE-12, '#8a6a3a');
      }
    } else if(d.kind==='machine'){
      pRect(3, 4, wpx-3, hpx-3, 'rgba(0,0,0,.35)');
      pRect(0, 0, wpx, hpx, '#5a5e64');
      pRect(3, 3, wpx-6, hpx-6, '#3a3e44');
      pRect(wpx*0.2, -4, 5, 8, '#8a8e94');
      pRect(wpx*0.6, -4, 5, 8, '#8a8e94');
      for(let i=0;i<wpx;i+=8) pRect(i, hpx-5, 4, 3, (i/8%2)?'#c9a02a':'#2a2e34');
      const on = (Math.floor(performance.now()/500)+d.seed)%2===0;
      pRect(wpx*0.7, hpx*0.28, 5, 5, on ? '#e05a4a' : '#5a8a4a');
      pRect(wpx*0.16, hpx*0.24, wpx*0.34, hpx*0.2, '#2a2e34');
    } else if(d.kind==='conveyor'){
      pRect(0, 0, wpx, hpx, '#3a3e44');
      pRect(2, 2, wpx-4, hpx-4, '#2a2e34');
      const off = Math.floor(performance.now()/90)%12;
      if(d.horiz){
        for(let x=off-12; x<wpx; x+=12){
          pRect(x, hpx*0.35, 4, 2, 'rgba(150,160,170,.45)');
          pRect(x+2, hpx*0.5, 4, 2, 'rgba(150,160,170,.35)');
        }
      } else {
        for(let y=off-12; y<hpx; y+=12){
          pRect(wpx*0.35, y, 2, 4, 'rgba(150,160,170,.45)');
          pRect(wpx*0.5, y+2, 2, 4, 'rgba(150,160,170,.35)');
        }
      }
    }
    ctx.restore();
  }
}

// 차량 — 블록형
function drawCars(){
  for(const c of raid.cars){
    const px = c.tx*TILE, py = c.ty*TILE, wpx = c.w*TILE, hpx = c.h*TILE;
    if(offscreenW(px+wpx/2, py+hpx/2, Math.max(wpx,hpx))) continue;
    ctx.save();
    ctx.translate(Math.round(px), Math.round(py));
    pRect(3, 6, wpx-4, hpx-4, 'rgba(0,0,0,.3)');
    // 바퀴
    if(c.horiz){
      pRect(12, -3, 12, 8, '#1a1816'); pRect(wpx-28, -3, 12, 8, '#1a1816');
      pRect(12, hpx-5, 12, 8, '#1a1816'); pRect(wpx-28, hpx-5, 12, 8, '#1a1816');
    } else {
      pRect(-3, 12, 8, 12, '#1a1816'); pRect(-3, hpx-28, 8, 12, '#1a1816');
      pRect(wpx-5, 12, 8, 12, '#1a1816'); pRect(wpx-5, hpx-28, 8, 12, '#1a1816');
    }
    pRect(1, 1, wpx-2, hpx-2, '#2a2420');
    pRect(2, 2, wpx-4, hpx-4, c.color);
    pRect(3, 3, wpx-6, 3, 'rgba(255,255,255,.1)');
    if(c.kind==='truck'){
      if(c.horiz){
        pRect(6, 5, wpx*0.18, hpx-10, '#2e3c46');
        pRect(wpx*0.28, 2, 2, hpx-4, 'rgba(0,0,0,.3)');
      } else {
        pRect(5, 6, wpx-10, hpx*0.18, '#2e3c46');
        pRect(2, hpx*0.28, wpx-4, 2, 'rgba(0,0,0,.3)');
      }
    } else if(c.kind==='bus'){
      const n = Math.max(3, Math.floor((c.horiz?wpx:hpx)/24));
      for(let i=0;i<n;i++){
        if(c.horiz) pRect(8+(wpx-16)*i/n, 5, (wpx-16)/n*0.65, hpx-10, '#2e3c46');
        else pRect(5, 8+(hpx-16)*i/n, wpx-10, (hpx-16)/n*0.65, '#2e3c46');
      }
    } else {
      if(c.horiz){
        pRect(wpx*0.22, 5, wpx*0.14, hpx-10, '#2e3c46');
        pRect(wpx*0.72, 5, wpx*0.12, hpx-10, '#2e3c46');
        pRect(wpx*0.38, 4, wpx*0.3, hpx-8, 'rgba(255,255,255,.12)');
      } else {
        pRect(5, hpx*0.22, wpx-10, hpx*0.14, '#2e3c46');
        pRect(5, hpx*0.72, wpx-10, hpx*0.12, '#2e3c46');
        pRect(4, hpx*0.38, wpx-8, hpx*0.3, 'rgba(255,255,255,.12)');
      }
    }
    pRect(wpx*0.12, hpx*0.65, 5, 4, 'rgba(90,50,30,.5)'); // 녹
    ctx.restore();
  }
}

// 컨테이너 — 전부 도트 가구
function drawContainer(c, x, y){
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if(c.opened) ctx.globalAlpha = 0.7;
  pRect(-14, 12, 28, 5, 'rgba(0,0,0,.28)');
  switch(c.type){
    case 'crate':
      pRect(-15, -12, 30, 26, '#6d4e26');
      pRect(-14, -11, 28, 24, '#a5793f');
      pRect(-14, -3, 28, 2, 'rgba(0,0,0,.2)');
      pRect(-5, -11, 2, 24, 'rgba(0,0,0,.18)');
      pRect(4, -11, 2, 24, 'rgba(0,0,0,.18)');
      pBox(-14, -11, 28, 24, '#5a3e20');
      pRect(-12, -9, 10, 2, 'rgba(255,255,255,.1)');
      break;
    case 'fridge':
      pRect(-12, -16, 24, 32, '#9fb0b4');
      pRect(-11, -15, 22, 30, '#dfe8ea');
      pRect(-11, -4, 22, 2, '#b9c8cc');
      pRect(7, -12, 3, 6, '#8a9a9e');
      pRect(7, 0, 3, 8, '#8a9a9e');
      pBox(-11, -15, 22, 30, '#8a9a9e');
      break;
    case 'cupboard':
      pRect(-16, -12, 32, 26, '#5d4530');
      pRect(-15, -11, 30, 24, '#8a6a4a');
      pRect(-15, -11, 30, 5, '#9d7c58');
      pRect(-1, -6, 2, 18, 'rgba(0,0,0,.25)');
      pRect(-6, 1, 3, 3, '#3a2c1c');
      pRect(4, 1, 3, 3, '#3a2c1c');
      pBox(-15, -11, 30, 24, '#4a3420');
      break;
    case 'toolbox':
      pRect(-15, -9, 30, 20, '#8a3222');
      pRect(-14, -8, 28, 18, '#c0533a');
      pRect(-14, -2, 28, 2, '#a03e28');
      pRect(-6, -14, 12, 6, '#e8c84a'); // 손잡이 아치 대신 바
      pRect(-5, -13, 10, 4, '#3a2c18');
      pRect(-3, -3, 6, 5, '#d8d0c0');
      pBox(-14, -8, 28, 18, '#6a2818');
      break;
    case 'corpse':
      pRect(-15, -7, 30, 18, '#33333a');
      pRect(-14, -6, 28, 16, '#4a4a52');
      pRect(-12, -12, 14, 10, '#5d5d66');
      // 해골
      pRect(4, -12, 10, 10, '#e8e4da');
      pRect(5, -4, 8, 4, '#e8e4da');
      pRect(6, -10, 2, 2, '#33333a');
      pRect(10, -10, 2, 2, '#33333a');
      pBox(-14, -6, 28, 16, '#2a2a30');
      break;
    case 'safe':
      pRect(-14, -14, 28, 28, '#4a505a');
      pRect(-13, -13, 26, 26, '#6a7280');
      pBox(-10, -10, 20, 20, '#3a4048');
      pRect(-4, -4, 8, 8, '#d0d4da');
      pRect(-1, -5, 2, 10, '#4a505a');
      pRect(-5, -1, 10, 2, '#4a505a');
      break;
    case 'locker':
      pRect(-12, -16, 24, 32, '#4a5a40');
      pRect(-11, -15, 22, 30, '#6a7a5a');
      pRect(-11, -15, 22, 4, '#5a6a4a');
      pRect(6, -6, 3, 8, '#c9a84a');
      pBox(-11, -15, 22, 30, '#3a4a30');
      break;
    case 'pallet':
      pRect(-18, -10, 36, 20, '#6a4a28');
      pRect(-16, -8, 32, 16, '#8a6a3a');
      for(let i=0;i<4;i++) pRect(-14+i*8, -8, 2, 16, '#5a3e20');
      pRect(-16, -2, 32, 2, 'rgba(0,0,0,.2)');
      break;
    case 'trough':
      pRect(-16, -6, 32, 14, '#6a5a3a');
      pRect(-14, -4, 28, 10, '#9a8a5a');
      pRect(-12, -2, 24, 6, '#5a4a28');
      pRect(-10, 0, 4, 3, '#6a8a4a');
      pRect(4, -1, 4, 3, '#6a8a4a');
      break;
    default:
      pRect(-14, -12, 28, 24, c.ct?.color || '#8a6a4a');
      pBox(-14, -12, 28, 24, '#3a2c1c');
  }
  ctx.restore();
}
