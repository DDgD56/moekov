// ============================================================
// MoeKov — 맵 (케이브·레이드 생성·충돌)
// ============================================================

// ---------------- 케이브 ----------------
function buildCave(){
  const w=22, h=20; // 위쪽에 사격장, 아래쪽에 생활공간
  const t = new Uint8Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++)
    t[y*w+x] = (x===0||y===0||x===w-1||y===h-1) ? 1 : 2;
  // 사격장 칸막이: 위쪽 사격장과 아래 생활공간을 벽으로 구분 (가운데 통로로 오르내림)
  const dividerY = 7;
  for(let x=1;x<w-1;x++){ if(x<9||x>12) t[dividerY*w+x]=1; } // 9~12 통로

  caveMap = {
    w, h, tiles: t,
    stations: [
      // 생활공간(아래쪽)
      { x:3.5*TILE,  y:11.5*TILE, emoji:'📦', name:'창고', panel:'storage' },
      { x:18.5*TILE, y:11.5*TILE, emoji:'🛠️', name:'작업대', panel:'bench' },
      // 엑조틱 의뢰 전용 NPC (작업대 옆)
      { x:18.5*TILE, y:14.8*TILE, emoji:'🔧', name:'부품 수집가', panel:'exotic' },
      { x:3.5*TILE,  y:15.2*TILE, emoji:'🛒', name:'떠돌이 상인', panel:'shop' },
      { x:7.5*TILE,  y:17*TILE,   emoji:'📌', name:'업그레이드', panel:'board' },
      { x:14.5*TILE, y:17*TILE,   emoji:'📜', name:'퀘스트 창구', panel:'quest' },
      { x:11*TILE,   y:18*TILE,   emoji:'🚪', name:'출격', panel:'deploy' },
    ],
    // 🎯 사격장: 맨 위쪽. 과녁은 위 벽 앞에, 플레이어는 통로에서 올라와 위를 보고 쏨
    range: {
      lineY: 5.4*TILE,   // 사대(플레이어가 서서 쏘는 기준선)
      targets: [
        mkTarget(5.5*TILE,  2.4*TILE, 'near'),
        mkTarget(11*TILE,   2.4*TILE, 'mid'),
        mkTarget(16.5*TILE, 2.4*TILE, 'far'),
      ],
      totalDmg: 0, hits: 0, shots: 0, dpsWin: [], lastShotAmmo: 0,
    },
    bullets: [], dnums: [], parts: [],
  };
}
// 사격장 과녁 하나 생성
function mkTarget(x, y, kind){
  return { x, y, kind, r:26, hp:1, hitT:0, popT:0, lastDmg:0, wob:0 };
}

// ---------------- 레이드 이변 (모디파이어) ----------------
// 출격마다 낮은 확률로 하나 — 지역 프로필 위에 곱해지는 특수 규칙
const RAID_MODS = [
  { id:'fog',   w:1.2, name:'짙은 안개',   emoji:'🌫️', desc:'시야가 짧다. 대신 희귀품이 잘 나온다.',
    rareBonus:0.04, aggroMul:0.75, fog:true },
  { id:'moon',  w:1.0, name:'핏빛 보름달', emoji:'🌕', desc:'밤이 더 사납고, 보상이 두둑하다.',
    coinMul:1.5, nightCapMul:1.35, nightDmgMul:1.15 },
  { id:'rich',  w:1.0, name:'풍년',        emoji:'🌾', desc:'상자가 넉넉하다. 미니도 통통하게 여물었다.',
    coinMul:1.2, hpMul:1.15, extraCrates:14 },
  { id:'swarm', w:1.0, name:'미니 대발생', emoji:'🐣', desc:'미니가 바글바글. 코인도 바글바글.',
    roamMul:1.5, dayCapMul:1.6, coinMul:1.35 },
  { id:'supply',w:0.9, name:'보급 낙하',   emoji:'📦', desc:'고급 보급 상자가 떨어졌다. 경비가 지키고 있다.',
    supply:true },
];

// ---------------- 레이드 맵 생성 ----------------
let curRegion = REGIONS.hill; // 현재 레이드의 지역 (배율·풀 참조용)
function buildRaid(){
  curRegion = REGIONS[State.region] || REGIONS.hill;
  const RG = curRegion;
  // 이변 롤: 45% 평범한 날, 55% 가중 랜덤
  const MOD = Math.random() < 0.45 ? null : pickWeighted(RAID_MODS.map(md=>[md, md.w]));
  const w=200, h=200;
  const t = new Uint8Array(w*h).fill(8); // 8=맵 밖 숲 · 0풀 1벽 2바닥 4바위 5물 6차량 7다리
  // 유기적 지형: 중앙 + 사방으로 길게 뻗어나가는 블롭들 (비정형 대형 맵)
  {
    const blobs = [{x:w/2, y:h/2, r:rnd(28,36)}];
    const arms = rndi(9,13);
    for(let i=0;i<arms;i++){
      const a = (i/arms)*Math.PI*2 + rnd(-0.4,0.4);
      const d = rnd(32,58);
      blobs.push({x:clamp(w/2+Math.cos(a)*d,16,w-16), y:clamp(h/2+Math.sin(a)*d,16,h-16), r:rnd(16,25)});
      if(Math.random()<0.8){ // 팔 끝의 지름길 지대
        const a2 = a+rnd(-0.4,0.4), d2 = d+rnd(20,36);
        blobs.push({x:clamp(w/2+Math.cos(a2)*d2,12,w-12), y:clamp(h/2+Math.sin(a2)*d2,12,h-12), r:rnd(10,17)});
      }
    }
    for(let y=2;y<h-2;y++) for(let x=2;x<w-2;x++){
      for(const b of blobs){
        if(Math.hypot(x-b.x,y-b.y) < b.r + Math.sin(x*0.8+y*0.3)*1.5){ t[y*w+x]=0; break; }
      }
    }
  }

  const houses = [];
  const containers = [];
  const indoorSpawns = [];
  const doormats = [];
  const decor = []; // 실내 장식물 (공장 기계·랙·컨베이어 등)

  // 강: 맵 한가운데를 가로지름 + 다리 3개 (지역에 강이 있을 때만)
  let riverEnds = []; // 강이 실제로 새겨진 양 끝 (강 끝 탈출구 후보)
  if(RG.river){
    const vert = Math.random()<0.5;
    let c = Math.floor((vert?w:h)/2) + rndi(-4,4);
    const rw2 = rndi(1,2);
    const axisLen = vert? h : w;
    const bridges = [];
    while(bridges.length<4){
      const b = rndi(Math.floor(axisLen*0.2), Math.floor(axisLen*0.8));
      if(bridges.every(o=>Math.abs(o-b)>14)) bridges.push(b);
    }
    let firstCarve = null, lastCarve = null;
    for(let i=0;i<axisLen;i++){
      c = clamp(c + rndi(-1,1), 6, (vert?w:h)-7);
      const isBridge = bridges.some(b=>Math.abs(b-i)<=1);
      let carved = false;
      for(let k=-rw2;k<=rw2;k++){
        const x = vert? c+k : i, y = vert? i : c+k;
        if(t[y*w+x]===0){ t[y*w+x] = isBridge ? 7 : 5; carved = true; } // 지형 안쪽만 강으로
      }
      if(carved){
        const cx = vert? c : i, cy = vert? i : c;
        if(!firstCarve) firstCarve = {x:cx, y:cy};
        lastCarve = {x:cx, y:cy};
      }
    }
    if(firstCarve) riverEnds = [firstCarve, lastCarve];
  }

  // 🏭 콘크리트 배수로: 강 대신 맵을 가로지르는 직선 도랑 + 건널목(다리) — 산업 지역용
  if(RG.canal){
    const vert = Math.random()<0.5;
    const axisLen = vert? h : w;
    let c = Math.floor((vert?w:h)/2) + rndi(-6,6);
    const cw2 = rndi(1,2); // 도랑 폭
    // 건널목(다리) 5개 — 격리 방지 위해 촘촘히
    const cross = [];
    while(cross.length<5){
      const b = rndi(Math.floor(axisLen*0.12), Math.floor(axisLen*0.88));
      if(cross.every(o=>Math.abs(o-b)>10)) cross.push(b);
    }
    for(let i=0;i<axisLen;i++){
      if(i%22===0) c = clamp(c + rndi(-2,2), 6, (vert?w:h)-7); // 완만히 꺾임 (거의 직선)
      const isBridge = cross.some(b=>Math.abs(b-i)<=1);
      for(let k=-cw2;k<=cw2;k++){
        const x = vert? c+k : i, y = vert? i : c+k;
        if(t[y*w+x]===0) t[y*w+x] = isBridge ? 7 : 5;
      }
    }
  }

  // 🛢️ 기름웅덩이: 작은 오염 물웅덩이 몇 개 (통행 불가, 산업 지역 분위기)
  if(RG.ground && RG.ground.oilStain){
    for(let n=0;n<rndi(5,8);n++){
      const ox=rndi(14,w-14), oy=rndi(14,h-14);
      if(t[oy*w+ox]!==0) continue;
      const orr=rnd(2.5,4.5);
      for(let yy=-5;yy<=5;yy++) for(let xx=-5;xx<=5;xx++){
        if(Math.hypot(xx,yy) <= orr + Math.sin(xx*0.9+yy*0.6)*0.8 && t[(oy+yy)*w+ox+xx]===0)
          t[(oy+yy)*w+ox+xx]=5;
      }
    }
  }

  // 🪷 습지 연못: 중간 크기 물웅덩이 (과하면 맵이 고립·상자 전부 삭제되므로 절제)
  if(RG.ponds){
    for(let n=0;n<rndi(7,11);n++){
      const ox=rndi(14,w-14), oy=rndi(14,h-14);
      if(t[oy*w+ox]!==0) continue;
      // 중앙·강 지대는 피해서 연못이 강을 삼키지 않게
      if(Math.hypot(ox-w/2, oy-h/2) < 22) continue;
      const orr=rnd(2.0,4.2);
      for(let yy=-6;yy<=6;yy++) for(let xx=-6;xx<=6;xx++){
        const ny=oy+yy, nx=ox+xx;
        if(ny<2||nx<2||ny>=h-2||nx>=w-2) continue;
        if(Math.hypot(xx,yy) <= orr + Math.sin(xx*0.7+yy*0.5)*0.7 && t[ny*w+nx]===0)
          t[ny*w+nx]=5;
      }
    }
  }

  // 🏝️ 호수 + 섬: 탈출 요충지 — 양쪽 다리로만 진입 가능 (지역이 호수섬을 쓸 때만)
  let island = null;
  for(let tries=0; RG.lakeIsland && tries<80 && !island; tries++){
    const lx = rndi(18, w-18), ly = rndi(18, h-18);
    if(Math.hypot(lx-w/2, ly-h/2) < 34) continue; // 중앙 강 지대 회피
    let grass=0, tot=0;
    for(let yy=-13; yy<=13; yy++) for(let xx=-13; xx<=13; xx++){
      tot++; if(t[(ly+yy)*w+(lx+xx)]===0) grass++;
    }
    if(grass/tot < 0.8) continue;
    for(let yy=-12; yy<=12; yy++) for(let xx=-12; xx<=12; xx++){
      const dd = Math.hypot(xx,yy);
      if(dd <= 11.5 + Math.sin(xx*0.7+yy*0.5)*1.3){
        t[(ly+yy)*w+(lx+xx)] = dd<=3.8 ? 0 : 5; // 가운데 섬만 풀
      }
    }
    // 섬을 관통하는 2칸 폭 다리 (섬 양쪽으로 다리 2개)
    const horiz = Math.random()<0.5;
    for(let i=-13;i<=13;i++){
      const cells = horiz ? [[lx+i,ly],[lx+i,ly+1]] : [[lx,ly+i],[lx+1,ly+i]];
      for(const [x,y] of cells) if(t[y*w+x]===5) t[y*w+x]=7;
    }
    island = {x:(lx+0.5)*TILE, y:(ly+0.5)*TILE};
  }

  // 📦 화물 컨테이너 야적장: 격자로 늘어선 컨테이너 미로 (산업 지역 랜드마크·최우선 배치)
  const yards = [];
  for(let n=0;n<(RG.yardCount??0);n++){
    for(let tries=0;tries<120;tries++){
      const cols=rndi(3,5), rows=rndi(2,4);
      // 컨테이너 1개 = 가로 5 x 세로 2, 칸 사이 통로 2칸
      const cellW=5+2, cellH=2+2;
      const yw=cols*cellW+1, yh=rows*cellH+1;
      const yx=rndi(3,w-yw-3), yy=rndi(3,h-yh-3);
      if(yards.some(f=>yx<f.x+f.w+2 && f.x<yx+f.w+2 && yy<f.y+f.h+2 && f.y<yy+f.h+2)) continue;
      let clear4=true;
      for(let y=yy;y<yy+yh && clear4;y++) for(let x=yx;x<yx+yw;x++)
        if(t[y*w+x]!==0){ clear4=false; break; }
      if(!clear4) continue;
      const yard={x:yx,y:yy,w:yw,h:yh,boxes:[]};
      yards.push(yard);
      for(let ci=0;ci<cols;ci++) for(let ri=0;ri<rows;ri++){
        if(Math.random()<0.18) continue; // 빈 자리 (통로 다양성)
        const bx=yx+1+ci*cellW, by=yy+1+ri*cellH;
        for(let y=by;y<by+2;y++) for(let x=bx;x<bx+5;x++) t[y*w+x]=1; // 컨테이너 = 벽
        const col=pick(['#8a5a3a','#3a6a7a','#6a7a3a','#7a3a3a','#5a5a6a','#9a8a4a']);
        yard.boxes.push({tx:bx,ty:by,w:5,h:2,color:col,seed:rndi(0,9)});
        // 일부 컨테이너 옆에 파밍 상자
        if(Math.random()<0.4){
          const sx2=bx+rndi(0,4), sy2=by+2; // 컨테이너 남쪽 통로
          if(sy2<yy+yh-1 && t[sy2*w+sx2]===0 && !containers.some(k=>k.tx===sx2&&k.ty===sy2))
            containers.push(mkContainer(Math.random()<0.15?'safe':pick(['pallet','toolbox','crate']), sx2, sy2));
        }
      }
      break;
    }
  }

  // 🏭 공장: 초대형 실내 (집보다 먼저 배치해 빈 땅 우선 확보)
  for(let n=0;n<(RG.factoryCount??2);n++){
    for(let tries=0;tries<120;tries++){
      const rw=rndi(20,26), rh=rndi(15,20);
      const rx=rndi(3,w-rw-3), ry=rndi(3,h-rh-3);
      let clear2=true;
      for(let y=ry-1;y<ry+rh+1 && clear2;y++) for(let x=rx-1;x<rx+rw+1;x++)
        if(t[y*w+x]!==0){ clear2=false; break; }
      if(!clear2) continue;
      const hs={x:rx,y:ry,w:rw,h:rh,roofA:1,doors:[],factory:true,roofC:'#4a4e52'};
      houses.push(hs);
      for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++)
        t[y*w+x] = (x===rx||y===ry||x===rx+rw-1||y===ry+rh-1)?1:2;
      // 대형 셔터문 3칸씩 2개
      for(let dn=0;dn<2;dn++){
        const side=rndi(0,3);
        if(side===0){ const dx=rndi(rx+1,rx+rw-4); for(let k=0;k<3;k++)t[ry*w+dx+k]=2;
          hs.doors.push({x:dx,y:ry,side,wide:3}); doormats.push({tx:dx,ty:ry-1,horiz:true,wide:3}); }
        else if(side===1){ const dx=rndi(rx+1,rx+rw-4); for(let k=0;k<3;k++)t[(ry+rh-1)*w+dx+k]=2;
          hs.doors.push({x:dx,y:ry+rh-1,side,wide:3}); doormats.push({tx:dx,ty:ry+rh,horiz:true,wide:3}); }
        else if(side===2){ const dy=rndi(ry+1,ry+rh-4); for(let k=0;k<3;k++)t[(dy+k)*w+rx]=2;
          hs.doors.push({x:rx,y:dy,side,wide:3}); doormats.push({tx:rx-1,ty:dy,horiz:false,wide:3}); }
        else { const dy=rndi(ry+1,ry+rh-4); for(let k=0;k<3;k++)t[(dy+k)*w+rx+rw-1]=2;
          hs.doors.push({x:rx+rw-1,y:dy,side,wide:3}); doormats.push({tx:rx+rw,ty:dy,horiz:false,wide:3}); }
      }
      const occupied = (x,y)=> t[y*w+x]!==2 || decor.some(d=>d.hs===hs && x>=d.tx && x<d.tx+d.w && y>=d.ty && y<d.ty+d.h);
      // 긴 저장 랙 (실내 벽 역할 + 장식) — 세로/가로로 길게, 통로 남김
      const rackHoriz = rw >= rh;
      const nRacks = rndi(2,3);
      for(let ri=0; ri<nRacks; ri++){
        if(rackHoriz){
          const ryr = ry + 2 + Math.round((rh-4)*(ri+1)/(nRacks+1));
          const rxs = rx+2, rxe = rx+rw-3;
          const gap = rndi(rxs+3, rxe-3); // 통로 1칸
          let laid=false;
          for(let x=rxs;x<=rxe;x++){ if(x===gap) continue; if(t[ryr*w+x]===2){ t[ryr*w+x]=1; laid=true; } }
          if(laid) decor.push({kind:'rack', hs, tx:rxs, ty:ryr, w:rxe-rxs+1, h:1, horiz:true, gap});
        } else {
          const rxr = rx + 2 + Math.round((rw-4)*(ri+1)/(nRacks+1));
          const rys = ry+2, rye = ry+rh-3;
          const gap = rndi(rys+3, rye-3);
          let laid=false;
          for(let y=rys;y<=rye;y++){ if(y===gap) continue; if(t[y*w+rxr]===2){ t[y*w+rxr]=1; laid=true; } }
          if(laid) decor.push({kind:'rack', hs, tx:rxr, ty:rys, w:1, h:rye-rys+1, horiz:false, gap});
        }
      }
      // 대형 기계 (2x2, 엄폐물)
      for(let m=0;m<rndi(2,3);m++){
        for(let tr=0;tr<20;tr++){
          const mx=rndi(rx+1,rx+rw-3), my=rndi(ry+1,ry+rh-3);
          let ok=true;
          for(let yy=my;yy<my+2 && ok;yy++) for(let xx=mx;xx<mx+2;xx++) if(occupied(xx,yy)){ ok=false; break; }
          if(!ok) continue;
          for(let yy=my;yy<my+2;yy++) for(let xx=mx;xx<mx+2;xx++) t[yy*w+xx]=1;
          decor.push({kind:'machine', hs, tx:mx, ty:my, w:2, h:2, seed:rndi(0,9)});
          break;
        }
      }
      // 컨베이어 벨트 (바닥 장식, 통행 가능)
      for(let cb=0;cb<rndi(1,2);cb++){
        const choriz = Math.random()<0.5;
        if(choriz){ const cy2=rndi(ry+2,ry+rh-3), cxs=rndi(rx+2,rx+Math.floor(rw/2)), cl=rndi(4,7);
          decor.push({kind:'conveyor', hs, tx:cxs, ty:cy2, w:Math.min(cl,rx+rw-2-cxs), h:1, horiz:true}); }
        else { const cx2=rndi(rx+2,rx+rw-3), cys=rndi(ry+2,ry+Math.floor(rh/2)), cl=rndi(4,7);
          decor.push({kind:'conveyor', hs, tx:cx2, ty:cys, w:1, h:Math.min(cl,ry+rh-2-cys), horiz:false}); }
      }
      // 문 안쪽 통행 확보
      for(const d of hs.doors){
        const inw=d.side===0?[0,1]:d.side===1?[0,-1]:d.side===2?[1,0]:[-1,0];
        for(let k=0;k<(d.wide||2);k++){
          const cx2 = d.side<2 ? d.x+k : d.x, cy2 = d.side<2 ? d.y : d.y+k;
          t[(cy2+inw[1])*w+(cx2+inw[0])]=2;
        }
      }
      // 대량 컨테이너 (공장 특화: 사물함/팔레트/공구함)
      const cn=rndi(12,18);
      for(let c=0;c<cn;c++){
        const cx=rndi(rx+1,rx+rw-2), cy=rndi(ry+1,ry+rh-2);
        if(t[cy*w+cx]!==2 || containers.some(k=>k.tx===cx&&k.ty===cy)) continue;
        const type = Math.random()<0.12?'safe':pick(['locker','pallet','pallet','toolbox','locker']);
        containers.push(mkContainer(type, cx, cy));
      }
      // 적 다수 (공장은 위험지대) — 좁은 실내라 큰 몹(bigduck) 제외
      const en=rndi(5,8);
      for(let e2=0;e2<en;e2++){
        const ex=rndi(rx+1,rx+rw-2), ey=rndi(ry+1,ry+rh-2);
        // 스폰 칸 + 상하좌우가 모두 바닥이어야 (끼임 방지)
        if(t[ey*w+ex]===2 && t[ey*w+ex-1]===2 && t[ey*w+ex+1]===2 && t[(ey-1)*w+ex]===2 && t[(ey+1)*w+ex]===2)
          indoorSpawns.push({id:pick(['zduck','gunner','spitter','sniper','fastduck']),x:(ex+.5)*TILE,y:(ey+.5)*TILE});
      }
      break;
    }
  }

  // 집 (앞 몇 채는 방 구조가 촘촘한 대형 저택 / 공장 지역에선 창고·사무동)
  for(let n=0;n<(RG.houseCount??22);n++){
    const big = n<(RG.bigHouses??5);
    for(let tries=0;tries<40;tries++){
      const rw = big? rndi(13,18) : rndi(6,9);
      const rh = big? rndi(11,15) : rndi(5,7);
      const rx=rndi(3,w-rw-3), ry=rndi(3,h-rh-3);
      if(houses.some(hs=>rx<hs.x+hs.w+3 && hs.x<rx+rw+3 && ry<hs.y+hs.h+3 && hs.y<ry+rh+3)) continue;
      let clearArea = true;
      for(let y=ry-1;y<ry+rh+1 && clearArea;y++)
        for(let x=rx-1;x<rx+rw+1;x++)
          if(t[y*w+x]!==0){ clearArea=false; break; }
      if(!clearArea) continue;
      const hs = {x:rx, y:ry, w:rw, h:rh, roofA:1, doors:[],
        roofC: RG.biome==='industrial'
          ? pick(['#4e5257','#585048','#4a4d50','#5a5148']) // 창고·사무동: 회색 금속지붕
          : RG.biome==='swamp'
            ? pick(['#4a5a3a','#5a4a28','#3a4a32','#6a5a30']) // 습지 사당·이끼 기와
            : pick(['#7a4a3a','#6a5340','#5d4a45','#77503a'])};
      houses.push(hs);
      for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++)
        t[y*w+x] = (x===rx||y===ry||x===rx+rw-1||y===ry+rh-1) ? 1 : 2;
      // 바깥문 (2칸) — 위치 기록 + 문 앞 현관 매트
      const doorN = big? 2 : 1;
      for(let dn=0;dn<doorN;dn++){
        const side = rndi(0,3);
        if(side===0){ const dx=rndi(rx+1,rx+rw-3); t[ry*w+dx]=2; t[ry*w+dx+1]=2;
          hs.doors.push({x:dx,y:ry,side}); doormats.push({tx:dx, ty:ry-1, horiz:true}); }
        else if(side===1){ const dx=rndi(rx+1,rx+rw-3); t[(ry+rh-1)*w+dx]=2; t[(ry+rh-1)*w+dx+1]=2;
          hs.doors.push({x:dx,y:ry+rh-1,side}); doormats.push({tx:dx, ty:ry+rh, horiz:true}); }
        else if(side===2){ const dy=rndi(ry+1,ry+rh-3); t[dy*w+rx]=2; t[(dy+1)*w+rx]=2;
          hs.doors.push({x:rx,y:dy,side}); doormats.push({tx:rx-1, ty:dy, horiz:false}); }
        else { const dy=rndi(ry+1,ry+rh-3); t[dy*w+rx+rw-1]=2; t[(dy+1)*w+rx+rw-1]=2;
          hs.doors.push({x:rx+rw-1,y:dy,side}); doormats.push({tx:rx+rw, ty:dy, horiz:false}); }
      }
      // 대형 저택: 세로·가로 칸막이로 여러 개의 방 그리드 (문틈으로 연결)
      if(big){
        // 세로 칸막이 1~2개
        const vSplits = [];
        const nV = rndi(1,2);
        for(let s=0;s<nV;s++){
          const sx = rx + Math.round((rw)*(s+1)/(nV+1));
          if(sx>rx+1 && sx<rx+rw-2 && !vSplits.includes(sx)) vSplits.push(sx);
        }
        for(const sx of vSplits){
          const gapY = rndi(ry+1, ry+rh-3);
          for(let y=ry+1;y<ry+rh-1;y++)
            if(y!==gapY && y!==gapY+1) t[y*w+sx] = 1;
        }
        // 가로 칸막이 1~2개
        const nH = rndi(1,2);
        for(let s=0;s<nH;s++){
          const sy = ry + Math.round((rh)*(s+1)/(nH+1));
          if(sy<=ry+1 || sy>=ry+rh-2) continue;
          const gapX = rndi(rx+1, rx+rw-3);
          for(let x=rx+1;x<rx+rw-1;x++)
            if(x!==gapX && x!==gapX+1) t[sy*w+x] = 1;
        }
      }
      // 문 바로 안쪽은 항상 통행 확보 (칸막이가 입구를 막지 않게)
      for(const d of hs.doors){
        const cells = (d.side<2) ? [[d.x,d.y],[d.x+1,d.y]] : [[d.x,d.y],[d.x,d.y+1]];
        const inw = d.side===0?[0,1] : d.side===1?[0,-1] : d.side===2?[1,0] : [-1,0];
        for(const [cx2,cy2] of cells) t[(cy2+inw[1])*w + (cx2+inw[0])] = 2;
      }
      // 집 안 컨테이너 (실내 파밍 위주)
      const cn = big? rndi(7,11) : rndi(2,3);
      for(let c=0;c<cn;c++){
        const cx=rndi(rx+1,rx+rw-2), cy=rndi(ry+1,ry+rh-2);
        if(t[cy*w+cx]!==2 || containers.some(k=>k.tx===cx&&k.ty===cy)) continue;
        const type = Math.random()<(big?0.22:0.15) ? 'safe' : pick(['cupboard','fridge','cupboard','toolbox']);
        containers.push(mkContainer(type, cx, cy));
      }
      // 집 안 상주 적 (스폰 칸 + 상하좌우 바닥 확인 → 끼임 방지)
      const en = big? rndi(3,5) : (Math.random()<0.55 ? 1 : 0);
      for(let e2=0;e2<en;e2++){
        const ex=rndi(rx+1,rx+rw-2), ey=rndi(ry+1,ry+rh-2);
        if(t[ey*w+ex]===2 && t[ey*w+ex-1]===2 && t[ey*w+ex+1]===2 && t[(ey-1)*w+ex]===2 && t[(ey+1)*w+ex]===2)
          indoorSpawns.push({id: pick(['zduck','zduck','spitter','gunner']), x:(ex+.5)*TILE, y:(ey+.5)*TILE});
      }
      break;
    }
  }

  // 🚜 울타리 농장: 개방된 밭 + 여물통 + 헛간 상자 (울타리는 낮은 벽)
  const farms=[];
  for(let n=0;n<(RG.farmCount??3);n++){
    for(let tries=0;tries<50;tries++){
      const fw=rndi(12,18), fh=rndi(10,14);
      const fx=rndi(3,w-fw-3), fy=rndi(3,h-fh-3);
      if(houses.some(hs=>fx<hs.x+hs.w+2 && hs.x<fx+fw+2 && fy<hs.y+hs.h+2 && hs.y<fy+fh+2)) continue;
      if(farms.some(f=>fx<f.x+f.w+2 && f.x<fx+fw+2 && fy<f.y+f.h+2 && f.y<fy+fh+2)) continue;
      let clear3=true;
      for(let y=fy;y<fy+fh && clear3;y++) for(let x=fx;x<fx+fw;x++)
        if(t[y*w+x]!==0){ clear3=false; break; }
      if(!clear3) continue;
      // 울타리(벽)로 둘레, 밭이랑은 바닥으로 안 만들고 풀 유지, 출입구 2칸
      const gate=rndi(fx+2,fx+fw-3);
      for(let x=fx;x<fx+fw;x++){ t[fy*w+x]=1; t[(fy+fh-1)*w+x]=1; }
      for(let y=fy;y<fy+fh;y++){ t[y*w+fx]=1; t[y*w+fx+fw-1]=1; }
      t[(fy+fh-1)*w+gate]=0; t[(fy+fh-1)*w+gate+1]=0; // 남쪽 출입구
      const farm={x:fx,y:fy,w:fw,h:fh};
      farms.push(farm);
      // 밭이랑 표시용 데이터 (렌더에서 사용)
      farm.rows=[];
      for(let ry2=fy+2; ry2<fy+fh-2; ry2+=2) farm.rows.push(ry2);
      // 여물통 + 야외 상자 (냉장고·금고 같은 실내 가전은 없음)
      const cn=rndi(3,5);
      for(let c=0;c<cn;c++){
        const cx=rndi(fx+1,fx+fw-3), cy=rndi(fy+1,fy+fh-2);
        if(t[cy*w+cx]!==0 || containers.some(k=>Math.abs(k.tx-cx)<2&&Math.abs(k.ty-cy)<2)) continue;
        const type=pick(['trough','trough','trough','crate']);
        containers.push(mkContainer(type, cx, cy));
      }
      break;
    }
  }

  // 바위 (나무는 아래에서 캐노피 엔티티로) — 산업 지역은 드럼통/잔해로 렌더
  for(let n=0;n<(RG.rockCount??70);n++){
    const x=rndi(2,w-3), y=rndi(2,h-3);
    if(t[y*w+x]===0) t[y*w+x]=4;
  }

  // 바리케이드 (짧은 벽 조각)
  for(let n=0;n<24;n++){
    const horiz = Math.random()<0.5, len = rndi(3,6);
    const x0 = rndi(4, w-len-4), y0 = rndi(4, h-len-4);
    let ok = true;
    for(let i=0;i<len;i++){
      const x = horiz? x0+i : x0, y = horiz? y0 : y0+i;
      if(t[y*w+x]!==0){ ok=false; break; }
    }
    if(!ok) continue;
    for(let i=0;i<len;i++){
      const x = horiz? x0+i : x0, y = horiz? y0 : y0+i;
      t[y*w+x] = 1;
    }
  }

  // 나무 수풀: 군락 + 단독. 밑에 들어갈 수 있는 큰 캐노피
  const trees = [];
  const treeOK = (x,y)=>{
    const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
    if(tx<2||ty<2||tx>=w-2||ty>=h-2) return false;
    if(t[ty*w+tx]!==0) return false;
    for(const hs of houses){
      if(x>(hs.x-1.5)*TILE && x<(hs.x+hs.w+1.5)*TILE && y>(hs.y-1.5)*TILE && y<(hs.y+hs.h+1.5)*TILE) return false;
    }
    return true;
  };
  for(let n=0;n<(RG.treeClusters??50);n++){
    const cx=rnd(4,w-4)*TILE, cy=rnd(4,h-4)*TILE;
    const cnt=rndi(2,5);
    for(let i=0;i<cnt;i++){
      const x=cx+rnd(-95,95), y=cy+rnd(-95,95);
      if(treeOK(x,y)) trees.push({x,y,r:rnd(38,58),seed:rnd(0,7),a:1});
    }
  }
  for(let n=0;n<(RG.treeSingles??40);n++){
    const x=rnd(3,w-3)*TILE, y=rnd(3,h-3)*TILE;
    if(treeOK(x,y)) trees.push({x,y,r:rnd(30,46),seed:rnd(0,7),a:1});
  }

  // 야외 컨테이너 (실내 파밍 위주로 축소)
  let crates=0;
  for(let tries=0; tries<600 && crates<20; tries++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0 && !containers.some(k=>Math.abs(k.tx-x)<2&&Math.abs(k.ty-y)<2)){
      containers.push(mkContainer('crate', x, y)); crates++;
    }
  }
  let tbs=0;
  for(let tries=0; tries<600 && tbs<13; tries++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0 && !containers.some(k=>Math.abs(k.tx-x)<2&&Math.abs(k.ty-y)<2)){
      containers.push(mkContainer('toolbox', x, y)); tbs++;
    }
  }

  // 🌾 풍년: 야외 상자 대량 추가
  if(MOD && MOD.extraCrates){
    let added=0;
    for(let tries=0; tries<600 && added<MOD.extraCrates; tries++){
      const x=rndi(3,w-4), y=rndi(3,h-4);
      if(t[y*w+x]===0 && !containers.some(k=>Math.abs(k.tx-x)<2&&Math.abs(k.ty-y)<2)){
        containers.push(mkContainer(Math.random()<0.3?'toolbox':'crate', x, y)); added++;
      }
    }
  }

  // 스폰/탈출: 탈출 1 = 호수 섬(다리 2개 요충지), 탈출 2 = 지형 팔 끝(지름길 종점)
  const grassSpots = [];
  for(let i=0;i<1500 && grassSpots.length<160;i++){
    const x=rndi(3,w-4), y=rndi(3,h-4);
    if(t[y*w+x]===0) grassSpots.push({x:(x+.5)*TILE, y:(y+.5)*TILE});
  }
  const ctr = {x:w/2*TILE, y:h/2*TILE};
  grassSpots.sort((a,b)=>dist(b.x,b.y,ctr.x,ctr.y)-dist(a.x,a.y,ctr.x,ctr.y));
  // 탈출구는 스폰에서 최소 이만큼 떨어져야 함 (바로 옆 탈출 방지). 실제 강제는
  // 연결성 검사 뒤 그 판의 도달 범위에 맞춰 적응적으로 다시 적용한다.
  const MIN_EXIT_DIST = 1400;
  // 스폰: 가장자리, 섬에서 멀리
  let spawn = ctr;
  for(const s of grassSpots){
    if(island && dist(s.x,s.y,island.x,island.y)<MIN_EXIT_DIST) continue;
    spawn = s; break;
  }
  // 섬이 스폰에 너무 가까우면 탈출구로 쓰지 않는다 (위험 없는 즉시 탈출 방지)
  let ex1 = (island && dist(island.x,island.y,spawn.x,spawn.y)>=MIN_EXIT_DIST) ? island : null;
  if(!ex1){
    let bd1=0;
    for(const s of grassSpots){ const d0=dist(s.x,s.y,spawn.x,spawn.y); if(d0>bd1){bd1=d0; ex1=s;} }
  }
  let ex2 = null, bd2 = 0;
  for(const s of grassSpots){
    if(dist(s.x,s.y,spawn.x,spawn.y) < 1400) continue;
    if(dist(s.x,s.y,ex1.x,ex1.y) < 900) continue;
    const d0 = dist(s.x,s.y,ctr.x,ctr.y); // 중심에서 가장 먼 곳 = 팔 끝
    if(d0>bd2){ bd2=d0; ex2=s; }
  }
  if(!ex2){
    let bd3=0;
    for(const s of grassSpots){
      const d0 = Math.min(dist(s.x,s.y,spawn.x,spawn.y), dist(s.x,s.y,ex1.x,ex1.y));
      if(d0>bd3){ bd3=d0; ex2=s; }
    }
  }
  const extracts = [ex1||ctr, ex2||ctr];
  // 🏞️ 강 끝 탈출구: 강이 있는 지역은 스폰에서 먼 쪽 강 끝 근처 땅에 하나 더
  if(riverEnds.length){
    const end = riverEnds.reduce((a,b)=>
      dist(a.x*TILE,a.y*TILE,spawn.x,spawn.y) >= dist(b.x*TILE,b.y*TILE,spawn.x,spawn.y) ? a : b);
    // 강 끝 주변에서 걸을 수 있는 풀밭 탐색 (가까운 곳부터)
    let spot = null;
    outer:
    for(let rr=2; rr<=8 && !spot; rr++){
      for(let dy=-rr; dy<=rr; dy++) for(let dx=-rr; dx<=rr; dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==rr) continue;
        const nx=end.x+dx, ny=end.y+dy;
        if(nx<3||ny<3||nx>=w-3||ny>=h-3) continue;
        if(t[ny*w+nx]===0){ spot={x:(nx+.5)*TILE, y:(ny+.5)*TILE}; break outer; }
      }
    }
    if(spot) extracts.push({x:spot.x, y:spot.y, river:true}); // 격리되면 아래 연결성 검사에서 재배치
  }

  // 스폰 주변 정리 (물/다리 포함)
  const clear = (px,py)=>{
    const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
    for(let y=ty-2;y<=ty+2;y++) for(let x=tx-2;x<=tx+2;x++){
      const v = t[y*w+x];
      if(x>0&&y>0&&x<w-1&&y<h-1 && (v===4||v===1||v===5||v===7)) t[y*w+x]=0;
    }
  };
  clear(spawn.x,spawn.y); extracts.forEach(z=>clear(z.x,z.y));

  // 버려진 차량 — 승용차 / 버스 / 트럭 (엄폐물, 긴 벽 역할, 총알도 막음)
  const cars = [];
  const CAR_KINDS = [
    {kind:'car',   len:4, wide:2, w6:['#8a4a3a','#4a6a8a','#7a7a4a','#6a4a7a','#9a8a7a']},
    {kind:'car',   len:4, wide:2, w6:['#8a4a3a','#4a6a8a','#7a7a4a','#6a4a7a','#9a8a7a']},
    {kind:'bus',   len:9, wide:3, w6:['#c9a02a','#3a7a4a','#c04a3a']},   // 긴 버스
    {kind:'truck', len:7, wide:3, w6:['#5a6a7a','#7a5a3a','#4a5a5a']},   // 트럭
  ];
  for(let n=0;n<18;n++){
    const kd = pick(CAR_KINDS);
    for(let tries=0;tries<25;tries++){
      const horiz = Math.random()<0.5;
      const cw = horiz?kd.len:kd.wide, ch = horiz?kd.wide:kd.len;
      const cx = rndi(3, w-cw-3), cy = rndi(3, h-ch-3);
      let ok = true;
      for(let y=cy;y<cy+ch && ok;y++) for(let x=cx;x<cx+cw;x++) if(t[y*w+x]!==0){ ok=false; break; }
      if(!ok) continue;
      const px = (cx+cw/2)*TILE, py = (cy+ch/2)*TILE;
      if(dist(px,py,spawn.x,spawn.y)<150 || extracts.some(z=>dist(px,py,z.x,z.y)<150)) continue;
      if(containers.some(k=>k.tx>=cx-1&&k.tx<cx+cw+1&&k.ty>=cy-1&&k.ty<cy+ch+1)) continue;
      for(let y=cy;y<cy+ch;y++) for(let x=cx;x<cx+cw;x++) t[y*w+x]=6;
      cars.push({tx:cx, ty:cy, w:cw, h:ch, horiz, kind:kd.kind, color:pick(kd.w6)});
      break;
    }
  }

  // 💀 지난 사망 지점의 장비 잔해 (같은 지역 다음 출격 1회 한정 — 다른 지역이면 소멸)
  let corpsePlaced = null;
  let corpseLostOtherRegion = false;
  if(State.deathCache && State.deathCache.items.length){
    const dc = State.deathCache;
    const sameRegion = !dc.region || dc.region === RG.id;
    if(sameRegion){
      const tx0 = clamp(Math.floor(dc.x/TILE), 2, w-3);
      const ty0 = clamp(Math.floor(dc.y/TILE), 2, h-3);
      let best = null, bestD = 1e9;
      for(let ry2=-18; ry2<=18; ry2++) for(let rx2=-18; rx2<=18; rx2++){
        const x = tx0+rx2, y = ty0+ry2;
        if(x<2||y<2||x>=w-2||y>=h-2) continue;
        const v = t[y*w+x];
        if(v!==0 && v!==2 && v!==7) continue;
        const d2 = rx2*rx2 + ry2*ry2;
        if(d2 < bestD){ bestD = d2; best = {x, y}; }
      }
      if(best){
        const c = mkContainer('corpse', best.x, best.y);
        c.inv = new Inv(CONTAINER_TYPES.corpse.w, CONTAINER_TYPES.corpse.h);
        for(const it of dc.items){
          if(!ITEMS[it.d]) continue;
          const inst = mkInst(it.d);
          inst.rot = it.r||0;
          c.inv.autoPlace(inst); // 내 물건이라 조사(hidden) 없음
        }
        c.opened = true;
        containers.push(c);
        corpsePlaced = c;
      }
    } else {
      // 다른 지역 출격 → 시체 영구 소멸
      corpseLostOtherRegion = true;
    }
    State.deathCache = null; // 이번 판에 안 찾으면 소멸 (다른 지역도 동일)
  }

  let supplyDrop = null; // 📦 보급 낙하 지점 (이변)
  // ── 연결성 검사: 스폰에서 도달 못 하는 격리 공간 제거 ──
  // 걸을 수 있는 타일: 풀0·바닥2·다리7 (벽1·바위4·물5·차량6·맵밖8 은 못 지나감)
  {
    const walkable = v => v===0 || v===2 || v===7;
    const reach = new Uint8Array(w*h);
    const stx = clamp(Math.floor(spawn.x/TILE),0,w-1), sty = clamp(Math.floor(spawn.y/TILE),0,h-1);
    // BFS flood fill
    const q = [sty*w+stx]; reach[sty*w+stx]=1;
    let qi=0;
    while(qi<q.length){
      const idx=q[qi++]; const cx=idx%w, cy=(idx-cx)/w;
      const nb=[[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
      for(const [nx,ny] of nb){
        if(nx<0||ny<0||nx>=w||ny>=h) continue;
        const ni=ny*w+nx;
        if(reach[ni]) continue;
        if(!walkable(t[ni])) continue;
        reach[ni]=1; q.push(ni);
      }
    }
    // 도달 못 하는 걸을 수 있는 타일 → 벽밖(8)으로 메워 격리 공간 제거
    for(let i=0;i<w*h;i++){
      if(!reach[i] && walkable(t[i])) t[i]=8;
    }
    // 지점의 "개방도": 반경 5칸 안에서 걸을 수 있는(도달 가능) 타일 비율.
    // 낮으면 사방이 막힌 안전 주머니 → 적이 못 와서 위험 없이 탈출됨.
    const openness = (px,py)=>{
      const cx=clamp(Math.floor(px/TILE),0,w-1), cy=clamp(Math.floor(py/TILE),0,h-1);
      let open=0, tot=0;
      for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=w||ny>=h) continue;
        if(dx*dx+dy*dy>30) continue; // 대략 원형
        tot++;
        if(reach[ny*w+nx]) open++;
      }
      return tot? open/tot : 0;
    };
    // 실제 도달 가능한 모든 타일을 후보로 수집(grassSpots는 메우기 전 좌표라 부실).
    // 스폰에서의 거리도 함께 기록해 "도달 범위 최대거리"를 파악한다.
    const reachSpots = [];
    let maxReach = 0;
    for(let y=2;y<h-2;y++) for(let x=2;x<w-2;x++){
      if(!reach[y*w+x]) continue;
      const px=(x+.5)*TILE, py=(y+.5)*TILE;
      const dS = dist(px,py,spawn.x,spawn.y);
      if(dS>maxReach) maxReach = dS;
      reachSpots.push({x:px, y:py, d:dS});
    }
    const MIN_OPEN = 0.5; // 주변 절반 이상이 트여 있어야 탈출구로 인정
    // 스폰 최소거리: 그 판 도달 범위의 55% (넓은 맵은 멀리, 좁은 맵은 가능한 만큼)
    const minExit = Math.min(MIN_EXIT_DIST*1.6, maxReach*0.55);
    // 탈출구가 ①격리 ②안전 주머니 ③스폰에 너무 가까움 중 하나면 재배치.
    for(let zi=0; zi<extracts.length; zi++){
      const z = extracts[zi];
      const others = extracts.filter((_,oi)=>oi!==zi); // 나머지 탈출구들 (3개 이상 대응)
      const zx=clamp(Math.floor(z.x/TILE),0,w-1), zy=clamp(Math.floor(z.y/TILE),0,h-1);
      const isolated = !reach[zy*w+zx];
      // 강 끝 탈출구는 물가라 개방도가 낮게 나옴 → 기준 완화 (물은 몹만 못 건너는 지형)
      const needOpen = z.river ? 0.3 : MIN_OPEN;
      const cramped = openness(z.x,z.y) < needOpen;
      const tooClose = dist(z.x,z.y,spawn.x,spawn.y) < minExit;
      if(!isolated && !cramped && !tooClose) continue;
      // 우선순위별로 후보를 완화: (거리+개방) → (개방만) → (거리만) → (아무 도달지점)
      const pickBest = (needOpen, needDist)=>{
        let best=null, bd=-1;
        for(const s of reachSpots){
          if(others.some(o=>dist(s.x,s.y,o.x,o.y) < minExit*0.6)) continue; // 탈출구끼리 분리
          if(needDist && s.d < minExit) continue;
          if(needOpen && openness(s.x,s.y) < MIN_OPEN) continue;
          if(s.d>bd){ bd=s.d; best=s; }
        }
        return best;
      };
      const best = pickBest(true,true) || pickBest(true,false) || pickBest(false,true) || pickBest(false,false);
      if(best){ z.x=best.x; z.y=best.y; }
    }
    // 격리된 상자 제거 (접근 불가라 무의미) — 내 시체(corpse)는 유지
    for(let ci=containers.length-1; ci>=0; ci--){
      const c=containers[ci];
      if(c.type==='corpse') continue;
      const cx=clamp(Math.floor(c.x/TILE),0,w-1), cy=clamp(Math.floor(c.y/TILE),0,h-1);
      // 상자 자신 칸 또는 인접 칸이 도달 가능하면 OK
      let ok=false;
      for(const [ox,oy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
        const nx=cx+ox, ny=cy+oy;
        if(nx>=0&&ny>=0&&nx<w&&ny<h && reach[ny*w+nx]){ ok=true; break; }
      }
      if(!ok) containers.splice(ci,1);
    }

    // 📦 보급 낙하: 스폰에서 적당히 먼 개활지에 고급 상자 2개 (경비는 raid 조립 후 스폰)
    if(MOD && MOD.supply){
      let best=null, bd=-1;
      for(const s of reachSpots){
        if(s.d < maxReach*0.35) continue;
        if(openness(s.x,s.y) < 0.55) continue;
        // 스폰에서 중간~먼 거리 중 랜덤성: 점수 = 거리 + 노이즈
        const score = s.d + Math.random()*800;
        if(score>bd){ bd=score; best=s; }
      }
      if(best){
        supplyDrop = {x:best.x, y:best.y};
        const tx=Math.floor(best.x/TILE), ty=Math.floor(best.y/TILE);
        const c1 = mkContainer('safe', tx, ty); c1.supply = true; containers.push(c1);
        const c2 = mkContainer('crate', tx+1, ty+1); c2.supply = true; containers.push(c2);
      }
    }
  }

  // 스폰/탈출 지점 주변 나무 제거
  const farFrom = (tr)=> dist(tr.x,tr.y,spawn.x,spawn.y)>130 && extracts.every(z=>dist(tr.x,tr.y,z.x,z.y)>130);

  raid = {
    w, h, tiles:t, houses, containers, extracts, cars, doormats, farms, decor, yards,
    trees: trees.filter(farFrom),
    enemies:[], bullets:[], ebullets:[], drops:[], parts:[], dnums:[], noises:[],
    time:0, waveT:6, trickleT:10, extractT:0, over:false, nightToast:false, duskToast:false,
    inside:null, underTree:false, treeToastDone:false,
    bossSpawned:false, boss:null,
    region: RG.id, biome: RG.biome, ground: RG.ground,
    dayLen: RG.dayLen,
    coinMul: RG.coinMul * ((MOD&&MOD.coinMul)||1),
    rareBonus: RG.rareBonus + ((MOD&&MOD.rareBonus)||0),
    mod: MOD, supplyDrop,
  };
  // 📦 보급 경비: 상자 주변에 정예 경비대
  if(supplyDrop){
    const guards = ['gunner','zduck','zduck','fastduck','sniper','spitter'];
    for(let gi=0; gi<guards.length; gi++){
      const ga = gi/guards.length*Math.PI*2;
      const gx2 = supplyDrop.x + Math.cos(ga)*rnd(50,110);
      const gy2 = supplyDrop.y + Math.sin(ga)*rnd(50,110);
      if(!solidPx(gx2,gy2) && !houseAtPx(gx2,gy2)) spawnEnemy(guards[gi], gx2, gy2);
    }
    player.supplyDetectT = 30; // 30초간 방향 표시
  }

  // 낮 배회 미니들 (지역 풀) — 목표 수를 채울 때까지 재시도 (좁은 산업맵도 밀도 확보)
  const SP = RG.spawn || {};
  {
    const target = Math.round((SP.roam??40) * ((MOD&&MOD.roamMul)||1));
    let placed=0;
    for(let tries=0; tries<target*8 && placed<target; tries++){
      const x=rnd(3,w-3)*TILE, y=rnd(3,h-3)*TILE;
      if(dist(x,y,spawn.x,spawn.y)<420) continue;
      if(solidPx(x,y) || houseAtPx(x,y)) continue;
      spawnEnemy(pickWeighted(RG.pool), x, y);
      placed++;
    }
  }
  // 집 안 상주 적 (지붕에 가려져 있다가 들어가면 조우) — 지역 배수만큼 추가 소환
  const iMul = SP.indoorMul || 1;
  for(const s of indoorSpawns){
    spawnEnemy(s.id, s.x, s.y);
    // 배수의 소수부는 확률로 처리 (예: 1.5 → 항상 1 + 50% 확률로 1 더)
    let extra = iMul - 1;
    while(extra > 0){
      if(extra >= 1 || Math.random() < extra){
        // 원래 지점 근처 바닥에 추가 (약간 흩뿌림)
        const ex = s.x + rnd(-TILE, TILE), ey = s.y + rnd(-TILE, TILE);
        if(!solidPx(ex,ey)) spawnEnemy(s.id, ex, ey); else spawnEnemy(s.id, s.x, s.y);
      }
      extra -= 1;
    }
  }

  player.x = spawn.x; player.y = spawn.y;
  player.hp = maxHp();
  player.kills = 0; player.coinsGained = 0;
  player.iframe = 2;
  player.stam = stamMax(); player.exhausted = false;
  player.extractDetectT = 0;
  player.extractHintIntro = false;
  player.corpseDetectT = 0;
  player.supplyDetectT = (raid && raid.supplyDrop) ? 30 : 0;
  player.slowT = 0;
  player.poisonT = 0;
  // 시체가 배치됐으면 30초간 방향 표시
  if(corpsePlaced){
    player.corpseDetectT = 30;
  }
  // startRaid 토스트용 플래그 (다른 지역 출격으로 시체 소멸)
  raid._corpseLostOtherRegion = corpseLostOtherRegion;
  // 첫 맵(뒷동산): 시작 5초간 탈출구 방향 힌트
  if(RG.id === 'hill'){
    player.extractDetectT = 5;
    player.extractHintIntro = true;
  }
  for(const g of State.guns){ if(g.body) g.ammo = gunStats(g).ammo; }
  player.reloading = 0; player.aimT = 0; player.swapT = 0;
}

function mkContainer(type, tx, ty){
  const ct = CONTAINER_TYPES[type];
  const hp = ct.hp||40;
  return { type, tx, ty, x:(tx+0.5)*TILE, y:(ty+0.5)*TILE, inv:null, opened:false, ct, hp, hpMax:hp };
}
// 지역 전용 루트 풀 (att/loot/food) — 없으면 공용 풀
// 공용 풀에는 지역 전용·엑조틱을 넣지 않는다 (뒷동산에서 공장/습지 템 섞임 방지)
function pickRegionalPool(pool){
  const reg = raid && raid.region;
  const map = {
    att:  { factory:'attFactory',  marsh:'attMarsh' },
    loot: { factory:'lootFactory', marsh:'lootMarsh' },
    food: { factory:'foodFactory', marsh:'foodMarsh' },
  };
  const regKey = map[pool] && reg && map[pool][reg];
  const regPool = regKey && LOOT_POOLS[regKey];
  // 지역 맵: 전용 풀 우선 (지역 엑조틱 총구 포함 허용)
  if(regPool && regPool.length && Math.random()<0.55)
    return pick(regPool);
  // 공용 폴백: 엑조틱·지역 전용은 풀 데이터에서 제외되어 있어야 함 + 안전망
  const base = LOOT_POOLS[pool];
  if(base && base.length) return pickFiltered(base, pool==='att');
  return null;
}
// 일반 롤에서 엑조틱 플래그 아이템 제외 (풀 오염 시 안전망). allowExotic=false 기본
function pickFiltered(list, stripExotic){
  if(!list || !list.length) return null;
  if(!stripExotic) return pick(list);
  const ok = list.filter(id=>{
    const d = ITEMS[id];
    return d && !d.exotic;
  });
  return (ok.length ? pick(ok) : pick(list));
}
function fillContainer(c){
  c.inv = new Inv(c.ct.w, c.ct.h);
  const n = rndi(c.ct.count[0], c.ct.count[1]) + (c.supply ? 4 : 0); // 보급 상자는 두둑하게
  const stars = (raid && REGIONS[raid.region] && REGIONS[raid.region].stars) || 1;
  for(let i=0;i<n;i++){
    const pool = pickWeighted(c.ct.roll);
    // 부착물: 3%+지역보너스로 ★희귀 / ★2+ 지역에선 일부 ★★엑조틱
    const rareCh = 0.03 + ((raid && raid.rareBonus)||0) + (c.supply ? 0.5 : 0);
    let id;
    // 📦 보급 상자: 첫 슬롯은 엑조틱 확정
    if(c.supply && i===0 && LOOT_POOLS.exoticAtt){
      id = pick(LOOT_POOLS.exoticAtt);
      const inst0 = mkInst(id);
      inst0.hidden = true;
      c.inv.autoPlace(inst0);
      continue;
    }
    if(pool==='att' && Math.random()<rareCh){
      // 엑조틱: 폐공장(★2) 약 28%, 습지(★3) 약 55% 로 희귀 대신 등장
      // 유물(★★★): 엑조틱 자리를 습지 30%·폐공장 6% 로 대체 — 뒤로 갈수록 기괴하고 강한 파츠
      // 뒷동산(★1)은 엑조틱·유물 상자 드롭 없음
      const exoCh = stars>=3 ? 0.55 : (stars>=2 ? 0.28 : 0);
      const relCh = stars>=3 ? 0.30 : (stars>=2 ? 0.06 : 0);
      if(exoCh>0 && LOOT_POOLS.exoticAtt && Math.random()<exoCh){
        id = (relCh>0 && LOOT_POOLS.relicAtt && Math.random()<relCh)
          ? pick(LOOT_POOLS.relicAtt)
          : pick(LOOT_POOLS.exoticAtt);
      } else {
        id = pickFiltered(LOOT_POOLS.rareAtt, true);
      }
    } else if(pool==='loot' && Math.random()<rareCh*1.2){
      // 귀중품 희귀 롤 (공용 rareLoot만 — 지역 전용 귀중품은 일반 loot 지역풀)
      id = pick(LOOT_POOLS.rareLoot || LOOT_POOLS.loot);
    } else {
      // 공장/습지: 지역 전용 풀(장착·귀중품·음식) 우선, 뒷동산은 공용만
      id = pickRegionalPool(pool);
    }
    if(!ITEMS[id]) continue;
    const inst = mkInst(id);
    inst.hidden = true; // 열자마자는 실루엣만 — 조사(2초/개)로 식별
    c.inv.autoPlace(inst);
  }
}

function solidPx(px,py){ // 이동 차단: 벽·바위·물·차량
  if(!raid) return false;
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
  const v = raid.tiles[ty*raid.w+tx];
  return v===1||v===4||v===5||v===6||v===8;
}
function shotSolidPx(px,py){ // 총알 차단: 벽·바위·차량·맵 밖 (물 위는 통과)
  if(!raid) return false;
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
  const v = raid.tiles[ty*raid.w+tx];
  return v===1||v===4||v===6||v===8;
}
// 시야 차단: 벽·차량이 두 점 사이를 막는지 (적이 벽 너머 감지/사격 못 하게)
function sightBlocked(ax, ay, bx, by){
  if(!raid) return false;
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy);
  const steps=Math.ceil(len/(TILE*0.5));
  if(steps<=0) return false;
  for(let i=1;i<steps;i++){
    const x=ax+dx*i/steps, y=ay+dy*i/steps;
    const tx=Math.floor(x/TILE), ty=Math.floor(y/TILE);
    if(tx<0||ty<0||tx>=raid.w||ty>=raid.h) return true;
    const v = raid.tiles[ty*raid.w+tx];
    if(v===1||v===6||v===8) return true; // 벽·차량·맵밖은 시야 차단 (바위·물은 통과)
  }
  return false;
}
function caveSolidPx(px,py){
  const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
  if(tx<0||ty<0||tx>=caveMap.w||ty>=caveMap.h) return true;
  return caveMap.tiles[ty*caveMap.w+tx]===1;
}

// 해당 좌표가 어느 집의 실내(바닥/문간)인지
function houseAtPx(px,py){
  if(!raid) return null;
  const tx = Math.floor(px/TILE), ty = Math.floor(py/TILE);
  for(const hs of raid.houses){
    if(tx>=hs.x && tx<hs.x+hs.w && ty>=hs.y && ty<hs.y+hs.h
       && raid.tiles[ty*raid.w+tx]===2) return hs;
  }
  return null;
}

function moveCircle(ent, dx, dy, solidFn){
  // 축 분리 충돌 — 검사 반경을 살짝 줄여(0.82) 좁은 통로 통과를 관대하게 (끼임 완화)
  const r = ent.r * 0.82, rr = r*0.6;
  let nx = ent.x + dx;
  if(!solidFn(nx-r,ent.y-rr) && !solidFn(nx+r,ent.y-rr) && !solidFn(nx-r,ent.y+rr) && !solidFn(nx+r,ent.y+rr)) ent.x = nx;
  let ny = ent.y + dy;
  if(!solidFn(ent.x-rr,ny-r) && !solidFn(ent.x+rr,ny-r) && !solidFn(ent.x-rr,ny+r) && !solidFn(ent.x+rr,ny+r)) ent.y = ny;
}

