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
  // 러그 (생활공간 중앙)
  const [rx,ry] = worldToScreen(11*TILE, 14*TILE);
  ctx.fillStyle = 'rgba(160,60,60,.3)';
  ctx.beginPath(); ctx.ellipse(rx,ry,80,50,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(220,150,120,.3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(rx,ry,68,40,0,0,Math.PI*2); ctx.stroke();

  // 🎯 사격장: 사대(발사선) + 과녁 + 총알 + 파티클
  if(caveMap.range){
    const R = caveMap.range;
    // 사대 라인 (플레이어가 서서 쏘는 기준선)
    const [lx0] = worldToScreen(1*TILE, R.lineY);
    const [lx1, ly] = worldToScreen((caveMap.w-1)*TILE, R.lineY);
    ctx.strokeStyle = 'rgba(230,200,120,.35)'; ctx.lineWidth = 2; ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke(); ctx.setLineDash([]);
    // 과녁
    for(const tg of R.targets) drawTarget(tg);
    // 사격장 총알
    for(const b of caveMap.bullets){
      const [bx,by] = worldToScreen(b.x,b.y);
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(bx-2, by-2, 4, 4);
      ctx.strokeStyle = 'rgba(255,220,120,.4)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx-b.vx*0.012, by-b.vy*0.012); ctx.stroke();
    }
    // 파티클
    for(const p of caveMap.parts){
      const [px,py] = worldToScreen(p.x,p.y);
      ctx.globalAlpha = Math.max(0, p.t*2.5); ctx.fillStyle = p.c;
      ctx.fillRect(px-p.r/2, py-p.r/2, p.r, p.r); ctx.globalAlpha = 1;
    }
  }

  // 스테이션 (가구 아트)
  for(const s of caveMap.stations){
    const [sx,sy] = worldToScreen(s.x,s.y);
    drawStation(s, sx, sy);
  }

  drawPlayer();
}

// 사격장 과녁 그리기
function drawTarget(tg){
  const wob = Math.sin(performance.now()/40)*tg.wob*3;
  const [x,y] = worldToScreen(tg.x + wob, tg.y);
  const flash = tg.hitT>0;
  // 지지대
  ctx.fillStyle = '#4a3a28'; ctx.fillRect(x-3, y, 6, 30);
  // 과녁 원판 (동심원)
  const rings = [[tg.r, flash?'#ff6a5a':'#e8e0d0'], [tg.r*0.7, flash?'#ffd76a':'#c94a3a'], [tg.r*0.42, '#e8e0d0'], [tg.r*0.18, flash?'#fff':'#c94a3a']];
  for(const [rr,c] of rings){
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, tg.r, 0, Math.PI*2); ctx.stroke();
  // 거리 라벨
  const distTxt = tg.kind==='near'?'가까움':tg.kind==='mid'?'중간':'멀리';
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle = '#c9b8a0'; ctx.fillText(distTxt, x, y+42);
  // 마지막 데미지 팝(과녁 위)
  if(tg.popT>0){
    ctx.globalAlpha = Math.min(1, tg.popT*2);
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(tg.lastDmg, x, y - tg.r - 12);
    ctx.globalAlpha = 1;
  }
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

  // 🎯 사격장 데미지 숫자 (월드 좌표를 UI 레이어에)
  if(caveMap.range){
    for(const d of caveMap.dnums){
      const [dx,dy] = worldToScreen(d.x, d.y);
      ctx.globalAlpha = Math.min(1, d.t*2);
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle = '#000'; ctx.fillText(d.txt, dx+1, dy+1);
      ctx.fillStyle = d.c; ctx.fillText(d.txt, dx, dy);
      ctx.globalAlpha = 1;
    }
    // 사격장 안내판 + 통계 (과녁 아래·사대 근처 = 사격장 안쪽 위에 표시)
    const R = caveMap.range;
    const [px, py] = worldToScreen(11*TILE, 6.2*TILE);
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = '#e8c060';
    ctx.fillText('🎯 사격장 · 과녁을 향해 클릭 · R 재장전', px, py);
    const dps = Math.round(R.dpsWin.reduce((a,b)=>a+b.d,0) / 2);
    const acc = R.shots>0 ? Math.round(R.hits/R.shots*100) : 0;
    ctx.fillStyle = '#c9b8a0';
    ctx.fillText(`DPS ${dps}  ·  명중 ${R.hits}/${R.shots} (${acc}%)`, px, py+16);
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
      // 맵 밖: 어두운 수풀/폐허 실루엣
      if(hsh%3===0){
        ctx.fillStyle = (hsh%2)?G0.forest1:G0.forest2;
        ctx.beginPath(); ctx.arc(sx+(hsh%32), sy+((hsh>>4)%32), 14+(hsh%10), 0, Math.PI*2); ctx.fill();
      }
    } else if(v===0){
      // 지면: 불규칙 명암 패치 + 풀포기/균열 + 드문 꽃/기름때
      ctx.fillStyle = G0.base;
      ctx.fillRect(sx,sy,TILE,TILE);
      if(hsh%4===0){
        ctx.fillStyle = (hsh%8===0) ? G0.patchHi : G0.patchLo;
        ctx.beginPath();
        ctx.arc(sx+(hsh%29), sy+(hsh%23), 12+(hsh%14), 0, Math.PI*2);
        ctx.fill();
      }
      if(G0.crack){
        // 콘크리트 균열: 각진 금 + 이음새
        if(hsh%9===3){
          ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
          const gx=sx+(hsh%20), gy=sy+((hsh>>3)%20);
          ctx.beginPath(); ctx.moveTo(gx,gy);
          ctx.lineTo(gx+5-(hsh%9), gy+4+(hsh%5));
          ctx.lineTo(gx+9-(hsh%4), gy+2+(hsh%7)); ctx.stroke();
        }
        if(hsh%13===5){ ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(sx, sy+((hsh>>2)%28), TILE, 1); }
      } else {
        if(hsh%7===2){
          const gx = sx+6+(hsh%19), gy = sy+9+(hsh%17);
          ctx.strokeStyle = G0.blade; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx,gy); ctx.lineTo(gx-2,gy-6);
          ctx.moveTo(gx+3,gy); ctx.lineTo(gx+4,gy-7);
          ctx.moveTo(gx+6,gy); ctx.lineTo(gx+8,gy-5);
          ctx.stroke();
        }
      }
      if(G0.oilStain && hsh%23===4){
        ctx.fillStyle = 'rgba(10,8,14,.28)';
        ctx.beginPath(); ctx.ellipse(sx+(hsh%22)+5, sy+(hsh%18)+5, 6+(hsh%5), 4+(hsh%3), 0, 0, Math.PI*2); ctx.fill();
      }
      if(G0.flower && hsh%61===7){
        ctx.fillStyle = (hsh%2)?'#e8d8a0':'#d8a8c0';
        ctx.beginPath(); ctx.arc(sx+(hsh%26)+3, sy+(hsh%22)+3, 2.2, 0, Math.PI*2); ctx.fill();
      }
    } else if(v===1){
      // 벽: 벽돌 줄눈 (산업 지역은 콘크리트 패널)
      ctx.fillStyle = raid.biome==='industrial' ? '#5a5c5e' : '#5d5348'; ctx.fillRect(sx,sy,TILE,TILE);
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
      if(raid.biome==='industrial'){
        // 드럼통 / 잔해 더미 (산업 지역의 엄폐물)
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(sx+16, sy+24, 11, 4.5, 0, 0, Math.PI*2); ctx.fill();
        if(hsh%2===0){
          // 기름 드럼통 (원통)
          const dc = (hsh%3===0)?'#8a5a2a':(hsh%3===1)?'#5a6a4a':'#7a3a3a';
          ctx.fillStyle = dc; rrect(ctx, sx+7, sy+7, 18, 17, 3);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx+7, sy+7, 18, 3);
          ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(sx+7, sy+13, 18, 1.5); ctx.fillRect(sx+7, sy+19, 18, 1.5);
        } else {
          // 콘크리트 잔해 덩어리
          ctx.fillStyle = '#6a655c';
          ctx.beginPath(); ctx.moveTo(sx+6,sy+22); ctx.lineTo(sx+9,sy+9); ctx.lineTo(sx+20,sy+7); ctx.lineTo(sx+26,sy+16); ctx.lineTo(sx+22,sy+23); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#807a70'; ctx.beginPath(); ctx.moveTo(sx+10,sy+11); ctx.lineTo(sx+18,sy+9); ctx.lineTo(sx+20,sy+15); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(sx+13,sy+10); ctx.lineTo(sx+16,sy+21); ctx.stroke();
        }
      } else {
        // 바위
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(sx+16, sy+22, 13, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#8a8a84';
        ctx.beginPath(); ctx.ellipse(sx+16, sy+15, 12, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#a0a09a';
        ctx.beginPath(); ctx.ellipse(sx+12, sy+11, 6, 4.5, 0, 0, Math.PI*2); ctx.fill();
      }
    } else if(v===5){
      // 물 (강물 / 산업 지역은 탁한 오수·배수로)
      const indus = raid.biome==='industrial';
      ctx.fillStyle = indus ? '#3a4238' : '#35566e'; ctx.fillRect(sx,sy,TILE,TILE);
      const tt = Math.floor(performance.now()/400);
      if((hsh+tt)%7<2){
        ctx.fillStyle = indus ? 'rgba(120,140,110,.20)' : 'rgba(160,200,230,.28)';
        ctx.fillRect(sx+((hsh+tt*13)%24), sy+4+((hsh>>3)%24), 7, 2);
      }
      if(indus && hsh%5===0){ // 기름 무지개 얼룩
        ctx.fillStyle = 'rgba(80,60,90,.22)';
        ctx.beginPath(); ctx.ellipse(sx+(hsh%20)+6, sy+(hsh%18)+6, 5, 3, 0, 0, Math.PI*2); ctx.fill();
      }
      const landAt = (X,Y)=>{ const vv=raid.tiles[Y*raid.w+X]; return vv!==5 && vv!==7; };
      ctx.fillStyle = 'rgba(180,220,240,.35)';
      if(ty>0 && landAt(tx,ty-1)) ctx.fillRect(sx,sy,TILE,2.5);
      if(ty<raid.h-1 && landAt(tx,ty+1)) ctx.fillRect(sx,sy+TILE-2.5,TILE,2.5);
      if(tx>0 && landAt(tx-1,ty)) ctx.fillRect(sx,sy,2.5,TILE);
      if(tx<raid.w-1 && landAt(tx+1,ty)) ctx.fillRect(sx+TILE-2.5,sy,2.5,TILE);
    } else if(v===7){
      if(raid.biome==='industrial'){
        // 철판 건널목 (배수로 위 강판)
        ctx.fillStyle = '#6a6660'; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        for(let xx=sx+4; xx<sx+TILE; xx+=8) for(let yy=sy+4; yy<sy+TILE; yy+=8) ctx.fillRect(xx, yy, 2, 2); // 마름모 미끄럼방지
        ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(sx, sy, TILE, 2);
        ctx.fillStyle = '#3f3c38'; ctx.fillRect(sx, sy, TILE, 2.5); ctx.fillRect(sx, sy+TILE-2.5, TILE, 2.5);
      } else {
      // 다리 (널빤지)
      ctx.fillStyle = '#8a6a42'; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for(let xx=Math.ceil(sx/9)*9; xx<sx+TILE; xx+=9) ctx.fillRect(xx, sy, 1.5, TILE);
      ctx.fillStyle = '#5d4526';
      ctx.fillRect(sx, sy, TILE, 2.5); ctx.fillRect(sx, sy+TILE-2.5, TILE, 2.5);
      }
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

  // 📦 화물 컨테이너 야적장 (벽 위에 색색 컨테이너 스프라이트를 덮어 그림)
  if(raid.yards) for(const yard of raid.yards){
    for(const b of yard.boxes){
      const bx=b.tx*TILE, by=b.ty*TILE, bw2=b.w*TILE, bh2=b.h*TILE;
      if(offscreenW(bx+bw2/2, by+bh2/2, 120)) continue;
      const [sx,sy]=worldToScreen(bx,by);
      // 그림자
      ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(sx+3, sy+bh2-4, bw2, 6);
      // 몸통
      ctx.fillStyle=b.color; ctx.fillRect(sx, sy, bw2, bh2-2);
      // 세로 골판 리브
      ctx.fillStyle='rgba(0,0,0,.16)';
      for(let x=sx+5; x<sx+bw2-2; x+=7) ctx.fillRect(x, sy+2, 2, bh2-6);
      // 상단 하이라이트 + 하단 그늘
      ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(sx, sy, bw2, 3);
      ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(sx, sy+bh2-5, bw2, 3);
      // 문짝 손잡이 (오른쪽 끝)
      ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(sx+bw2-6, sy+6, 2, bh2-14);
      ctx.fillRect(sx+bw2-11, sy+6, 2, bh2-14);
    }
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
