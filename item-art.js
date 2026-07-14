// ============================================================
// MoeKov — 폴리오미노 "모양 전용" 아이템 아트
// - SHAPE_ART[id]: 기본 방향(rot 0) 셀 배치를 따라 그리는 도트 (16px/칸)
//   ㄱ자·T자·도넛 등 비직사각 아이템은 여기서 칸 모양대로 다시 그린다.
// - 회전(rot)·작업대 장착면(side) 변환은 캔버스 픽셀 연산으로 그대로 따라감
// - 등록 안 된 아이템은 16×16 아이콘을 크롭·회전해 모양에 맞춰 배치 (generic)
// ============================================================

const ART_CELL = 16; // 기본 해상도: 칸당 16px

// 팔레트 (icons.js와 톤 통일 + 음영 단계 추가)
// 주의: core.js의 오디오 컨텍스트 전역 AC와 충돌하지 않도록 ARTC로 명명
const ARTC = {
  ink:'#1a1410',
  wood:'#8a6a3a', darkWood:'#5a4028', woodHi:'#a8845a',
  metal:'#8a9098', metalHi:'#b8c0c8', darkMetal:'#4a5058', steel:'#6a7280',
  gold:'#e8c84a', goldHi:'#f8e488', goldDk:'#b89020',
  red:'#c94a3a', redHi:'#e06858', redDk:'#8a2f24',
  green:'#5a9a4a', greenHi:'#78c060', leaf:'#3a7a3a', leafDk:'#2a5a28',
  blue:'#4a8ac0', blueHi:'#6aa8d8', blueDk:'#2f5f8a',
  purple:'#8a5ab0', purpleHi:'#a06ac0', purpleDk:'#5f3a80',
  pink:'#e8a0b0', pinkHi:'#f4c8d4', pinkDk:'#c06a80',
  orange:'#e8853a', orangeHi:'#f0a850', orangeDk:'#b05a20',
  yellow:'#f0d060', yellowHi:'#f8e488', yellowDk:'#c8a030',
  white:'#e8e4d8', whiteHi:'#fbfaf4', whiteDk:'#b8b4a8',
  grey:'#8a8578', greyDk:'#6a665c',
  black:'#2a2420', cyan:'#5ad0e8', cyanHi:'#a0e8f8', cyanDk:'#2f8aa8',
  slime:'#7ad060', brown:'#7a5a38', brownDk:'#523a22',
  skin:'#f0c8a0', bone:'#e8dfc8', boneDk:'#c0b090',
  rubber:'#32322e', glass:'#a8d8e8',
};

// ---- 도트 헬퍼 (painter에 전달) ----
function _artTools(g, W, H){
  const px = (x,y,c)=>{ if(!c) return; x|=0; y|=0; if(x<0||y<0||x>=W||y>=H) return; g.fillStyle=c; g.fillRect(x,y,1,1); };
  const rect = (x,y,w,h,c)=>{ for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++) px(x+xx,y+yy,c); };
  const frame = (x,y,w,h,c)=>{ rect(x,y,w,1,c); rect(x,y+h-1,w,1,c); rect(x,y,1,h,c); rect(x+w-1,y,1,h,c); };
  const disc = (cx,cy,r,c)=>{ const r2=r*r; for(let yy=Math.floor(cy-r);yy<=cy+r;yy++) for(let xx=Math.floor(cx-r);xx<=cx+r;xx++){ const dx=xx+0.5-cx, dy=yy+0.5-cy; if(dx*dx+dy*dy<=r2) px(xx,yy,c); } };
  const ring = (cx,cy,r0,r1,c)=>{ const a=r0*r0,b=r1*r1; for(let yy=Math.floor(cy-r1);yy<=cy+r1;yy++) for(let xx=Math.floor(cx-r1);xx<=cx+r1;xx++){ const dx=xx+0.5-cx, dy=yy+0.5-cy, d=dx*dx+dy*dy; if(d>=a&&d<=b) px(xx,yy,c); } };
  const line = (x0,y0,x1,y1,c,t)=>{
    t = t||1;
    const n = Math.max(Math.abs(x1-x0), Math.abs(y1-y0), 1);
    for(let i=0;i<=n;i++){
      const x = x0+(x1-x0)*i/n, y = y0+(y1-y0)*i/n;
      if(t<=1) px(Math.round(x),Math.round(y),c);
      else rect(Math.round(x-t/2), Math.round(y-t/2), Math.ceil(t), Math.ceil(t), c);
    }
  };
  return { W, H, C: ARTC, px, rect, frame, disc, ring, line };
}

// 실루엣 자동 외곽선: 불투명 픽셀에 접한 투명 픽셀을 ink로
function _outlineArt(cn){
  const w=cn.width, h=cn.height, g=cn.getContext('2d');
  const im = g.getImageData(0,0,w,h), d = im.data;
  const solid = (x,y)=> x>=0&&y>=0&&x<w&&y<h && d[(y*w+x)*4+3]>=140;
  g.fillStyle = ARTC.ink;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(!solid(x,y) && (solid(x+1,y)||solid(x-1,y)||solid(x,y+1)||solid(x,y-1)))
      g.fillRect(x,y,1,1);
  }
}

// ---- 캔버스 픽셀 변환 (셀 회전 규칙과 1:1 대응) ----
// rotShapeOnce: (x,y)→(maxY-y,x) = 시계방향 90° 회전
function _cwCanvas(cn){
  const o = document.createElement('canvas');
  o.width = cn.height; o.height = cn.width;
  const g = o.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(o.width, 0); g.rotate(Math.PI/2);
  g.drawImage(cn, 0, 0);
  return o;
}
function _flipHCanvas(cn){
  const o = document.createElement('canvas');
  o.width = cn.width; o.height = cn.height;
  const g = o.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(o.width, 0); g.scale(-1, 1);
  g.drawImage(cn, 0, 0);
  return o;
}
function _flipVCanvas(cn){
  const o = document.createElement('canvas');
  o.width = cn.width; o.height = cn.height;
  const g = o.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(0, o.height); g.scale(1, -1);
  g.drawImage(cn, 0, 0);
  return o;
}

// ---- 수제 아트 합성: 기본 방향 → rot 회전 → 장착면(side) 변환 ----
// side는 gun.js mountLocalCells와 동일: bottom=그대로, top=상하반전,
// front=전치(cw+좌우반전), back=시계 90°
const _itemArtCache = new Map();
function itemArtCanvas(def, rot, side){
  const painter = SHAPE_ART[def.id];
  if(!painter) return null;
  const key = def.id + ':' + (rot||0) + ':' + (side||'');
  if(_itemArtCache.has(key)) return _itemArtCache.get(key);

  const cells = Array.isArray(def.shape) ? def.shape : SHAPES[def.shape];
  const sw = Math.max(...cells.map(c=>c[0]))+1, sh = Math.max(...cells.map(c=>c[1]))+1;
  let cn = document.createElement('canvas');
  cn.width = sw*ART_CELL; cn.height = sh*ART_CELL;
  const g = cn.getContext('2d');
  g.imageSmoothingEnabled = false;
  painter(_artTools(g, cn.width, cn.height));
  _outlineArt(cn);

  const n = ((rot||0)%4+4)%4;
  for(let i=0;i<n;i++) cn = _cwCanvas(cn);
  if(side==='top') cn = _flipVCanvas(cn);
  else if(side==='front') cn = _flipHCanvas(_cwCanvas(cn));
  else if(side==='back') cn = _cwCanvas(cn);

  if(_itemArtCache.size > 300) _itemArtCache.clear();
  _itemArtCache.set(key, cn);
  return cn;
}

// ---- generic: 16×16 아이콘 크롭 → 방향 정렬 → 모양에 맞춤 ----
// 미러 변환(top/front)은 회전 근사: 아이콘 중앙 배치라 셀과 어긋나지 않음
const _GENERIC_SIDE_ROT = { top:2, front:3, back:1 };
function _genericArtInto(g, def, sw, sh, cs, rot, side){
  const src = itemIconCanvas(def, false, true);
  const r = iconArtRect(src);
  // 크롭만 떼어낸 소스 캔버스
  let art = document.createElement('canvas');
  art.width = r.w; art.height = r.h;
  const ag = art.getContext('2d');
  ag.imageSmoothingEnabled = false;
  ag.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);

  // 기본 모양과 아이콘의 장축이 어긋나면 90° 보정 (예: 가로 2칸인데 세로로 그려진 손전등)
  // shape가 없는 def(총 몸통: bw/bh)는 몸통 격자 크기를 기본 방향으로 삼는다
  let bw, bh;
  if(def.shape){
    const bs = Array.isArray(def.shape) ? def.shape : SHAPES[def.shape];
    bw = Math.max(...bs.map(c=>c[0]))+1; bh = Math.max(...bs.map(c=>c[1]))+1;
  } else { bw = def.bw||1; bh = def.bh||1; }
  let eff = ((rot||0) + (side ? (_GENERIC_SIDE_ROT[side]||0) : 0)) % 4;
  if(bw!==bh && r.w!==r.h && ((bw>bh) !== (r.w>r.h))) eff = (eff+1)%4;
  for(let i=0;i<eff;i++) art = _cwCanvas(art);

  // 비율 유지 기반 + 왜곡 상한 1.6배 내에서 모양 박스에 최대한 채움
  const BW = sw*cs, BH = sh*cs;
  let sX = BW/art.width, sY = BH/art.height;
  const uni = Math.min(sX, sY);
  sX = Math.min(sX, uni*1.6) * 1.02;
  sY = Math.min(sY, uni*1.6) * 1.02;
  const dw = Math.round(art.width*sX), dh = Math.round(art.height*sY);
  g.drawImage(art, Math.round((BW-dw)/2), Math.round((BH-dh)/2), dw, dh);
}

// ============================================================
// SHAPE_ART — 비직사각 아이템 전용 도트 (기본 방향, 16px/칸)
// 좌표는 캔버스 픽셀. 실루엣 외곽선은 자동 생성되므로 그리지 않는다.
// ============================================================
const SHAPE_ART = {

  // ───── corner (2×2 ㄱ자: 상단 2칸 + 좌하단) 32×32 ─────

  // 오르골: 좌하=나무 케이스(태엽), 좌상=발레리나, 우상=열린 뚜껑(거울)
  music_box(a){ const {C,px,rect,disc}=a;
    // 케이스
    rect(2,17,12,13,C.wood); rect(2,17,12,2,C.woodHi);
    rect(4,21,8,6,C.darkWood); rect(7,23,2,2,C.gold);
    rect(0,22,2,4,C.goldDk); px(0,21,C.gold); px(1,26,C.gold); // 태엽 크랭크
    rect(2,29,12,1,C.brownDk);
    // 무대
    rect(3,14,10,3,C.gold); rect(3,16,10,1,C.goldDk);
    // 발레리나
    rect(7,2,2,2,C.skin); px(7,1,C.brown); px(8,1,C.brown); px(9,2,C.brown);
    px(5,3,C.skin); px(6,2,C.skin); px(10,3,C.skin); px(9,2,C.skin); // 팔
    rect(7,4,2,3,C.pink);
    rect(5,7,6,2,C.pink); rect(6,9,4,1,C.pinkDk); // 튀튀
    rect(7,10,2,4,C.skin);
    px(3,5,C.cyan); px(12,7,C.whiteHi); px(2,10,C.whiteHi);
    // 뚜껑(안쪽 거울)
    rect(18,2,12,13,C.wood); rect(19,3,10,1,C.woodHi);
    rect(20,4,8,9,C.darkWood);
    rect(21,5,6,7,C.glass); px(22,6,C.whiteHi); px(23,7,C.whiteHi); px(24,8,C.cyanHi);
    rect(16,13,4,2,C.goldDk); // 경첩
    // 음표
    px(14,4,C.ink); rect(13,2,1,3,C.ink); px(15,7,C.ink);
  },

  // 돋보기 스코프: 상단=렌즈, 좌하=손잡이
  magnifier_scope(a){ const {C,px,rect,disc,ring,line}=a;
    ring(18,9,5.7,7.7,C.metal);
    ring(18,9,6.7,7.7,C.steel);
    disc(18,9,5.7,'#bfe8f4');
    px(15,6,C.whiteHi); px(16,7,C.whiteHi); px(14,8,C.cyanHi); // 글린트
    rect(11,13,5,4,C.goldDk); // 페룰
    line(12,16,6,28,C.wood,4);
    line(10,19,5,27,C.darkWood,1);
    rect(3,27,6,4,C.darkWood); // 손잡이 끝
    px(28,3,C.whiteHi); px(30,6,C.cyan);
  },

  // 부메랑 개머리판: ㄱ자로 꺾인 나무 부메랑
  boomerang_stock(a){ const {C,px,rect}=a;
    rect(3,3,25,7,C.wood); rect(28,4,2,5,C.wood);
    rect(3,3,7,25,C.wood); rect(4,28,5,2,C.wood);
    rect(4,4,23,2,C.woodHi); rect(4,4,2,23,C.woodHi);
    rect(5,8,23,2,C.darkWood); rect(8,5,2,23,C.darkWood);
    rect(23,4,2,5,C.red); px(24,6,C.redDk); // 밴드 장식
    rect(4,23,5,2,C.red);
    px(14,6,C.redDk); px(18,6,C.white); px(6,14,C.redDk); px(6,18,C.white);
  },

  // 자전거 브레이크: 좌하=고무 그립, 좌상=피벗, 상단=레버 날
  brake_grip(a){ const {C,px,rect,disc}=a;
    rect(3,17,9,13,C.rubber);
    for(let y=19;y<29;y+=3) rect(3,y,9,1,'#1f1f1c');
    rect(2,29,11,2,C.darkMetal);
    rect(2,6,11,9,C.darkMetal); rect(3,7,9,2,C.steel);
    disc(7,10,1.7,C.metal); px(7,10,C.metalHi);
    rect(12,5,14,4,C.metal); rect(25,3,5,4,C.metalHi);
    rect(12,8,14,1,C.darkMetal); px(30,4,C.metalHi);
    px(3,5,C.ink); px(2,4,C.ink); px(2,3,C.ink); // 케이블
  },

  // 깔때기 초크: 넓은 입이 좌하 배출구로 좁아지는 기울어진 깔때기
  funnel_choke(a){ const {C,px,rect,line}=a;
    rect(2,1,28,3,C.metalHi);
    rect(3,2,26,2,C.darkMetal); // 입 안쪽
    rect(3,4,26,3,C.metal);
    rect(5,7,20,3,C.metal);
    rect(7,10,14,3,C.metal);
    rect(7,13,8,2,C.metal);
    rect(6,15,5,13,C.metal); rect(7,16,1,11,C.metalHi);
    rect(6,28,5,2,C.darkMetal);
    line(5,5,9,13,C.metalHi,1);
    px(26,5,C.darkMetal); px(24,8,C.darkMetal);
  },

  // 진흙 초크: 상단 진흙 덩이 + 좌하로 흘러내리는 큰 방울
  mud_choke(a){ const {C,px,rect,disc}=a;
    disc(10,8,7,C.brown); disc(20,7,8,C.brown); disc(27,10,4.5,C.brown);
    disc(12,6,3.5,'#8a6a44'); disc(21,5,3.5,'#8a6a44');
    rect(5,12,24,3,C.brownDk);
    rect(4,14,9,8,C.brown); rect(6,22,5,5,C.brown); rect(7,27,3,3,C.brownDk);
    px(8,30,C.brownDk);
    rect(12,14,3,5,C.brown); px(13,19,C.brownDk);
    px(3,6,C.brownDk); px(25,12,C.brownDk); px(17,9,'#8a6a44');
  },

  // 조개껍질 그립: 좌하 힌지에서 우상으로 펼쳐지는 부채꼴
  shell_grip(a){ const {C,px,rect,disc,line}=a;
    rect(16,2,12,4,C.pink);
    rect(10,5,20,5,C.pink);
    rect(6,10,22,5,C.pink);
    rect(4,15,18,5,C.pink);
    rect(4,20,12,4,C.pink);
    rect(5,24,6,3,C.pink);
    line(7,26,13,4,C.pinkDk,1); line(7,26,21,5,C.pinkDk,1);
    line(7,26,27,8,C.pinkDk,1); line(7,26,28,14,C.pinkDk,1);
    line(9,22,13,7,C.pinkHi,1);
    rect(4,25,6,5,C.pinkDk);
    disc(6,23,1.7,C.white); px(5,22,C.whiteHi);
  },

  // 크루아상: ㄱ자 곡선을 따라 굽은 겹겹 반죽
  croissant(a){ const {C,px,disc,line}=a;
    const B='#d4913e', H='#edc06a', D='#a86a28';
    disc(6,26,4.5,B); disc(8,15,6,B); disc(11,7,7,B);
    disc(22,6,6,B); disc(29,9,4,B);
    disc(10,5,3.5,H); disc(21,4,3,H); disc(7,13,2.5,H);
    line(5,21,12,19,D,1); line(7,10,15,12,D,1); line(17,3,18,11,D,1); line(26,5,26,12,D,1);
    px(5,29,D); px(30,10,D);
  },

  // 늪 호박(보석): 각진 호박 덩어리 + 갇힌 날벌레
  bog_amber(a){ const {C,px,rect}=a;
    rect(4,3,24,10,C.orange);
    rect(2,7,13,21,C.orange);
    rect(24,4,4,7,C.orangeDk); rect(3,20,10,7,C.orangeDk);
    rect(6,4,9,4,C.orangeHi); rect(17,5,6,3,C.orangeHi);
    rect(4,14,4,5,C.orangeHi);
    rect(8,10,5,5,'#f8d080');
    rect(9,11,2,2,C.ink); px(11,12,C.ink); // 벌레
    px(8,10,C.brownDk); px(12,10,C.brownDk);
    px(24,3,'#ffe8b0'); px(26,5,'#ffe8b0'); px(5,26,C.brownDk);
  },

  // ───── L (세로 3칸 + 우하단 발) 32×48 ─────

  // 바나나 그립: L 곡선 그대로 바나나
  banana_grip(a){ const {C,px,rect,disc,line}=a;
    rect(5,1,4,4,C.brown); px(6,0,C.brownDk);
    disc(8,9,5,C.yellow); disc(7,17,5.5,C.yellow); disc(7,25,6,C.yellow);
    disc(9,33,6,C.yellow); disc(14,39,5.5,C.yellow); disc(21,42,4.5,C.yellow);
    disc(27,43,3,C.yellow);
    rect(29,42,3,3,C.brownDk);
    line(10,9,10,32,C.yellowHi,2); line(12,36,20,40,C.yellowHi,1);
    line(4,12,4,30,C.yellowDk,1); line(6,38,14,44,C.yellowDk,1);
    px(6,28,C.brown); px(5,16,C.brown);
  },

  // 지팡이 그립: 세로 지팡이 + 하단 갈고리 손잡이
  cane_grip(a){ const {C,px,rect,disc}=a;
    rect(5,1,6,4,C.metal); rect(5,1,6,1,C.metalHi);
    rect(6,5,4,34,C.wood);
    rect(6,5,1,34,C.woodHi); rect(9,8,1,30,C.darkWood);
    disc(9,41,3.5,C.wood);
    rect(9,39,13,5,C.wood); rect(10,39,11,1,C.woodHi);
    rect(20,33,5,8,C.wood); rect(20,33,5,2,C.darkWood);
    px(24,35,C.woodHi);
    rect(5,20,6,2,C.goldDk); // 장식 밴드
  },

  // 청동 주전자: 세로 몸통 + 우하단 주둥이
  bronze_kettle(a){ const {C,px,rect,disc}=a;
    const B='#b8863c', H='#e0b060', D='#8a6428';
    disc(8,11,4.5,B); rect(4,12,9,4,B);
    rect(7,7,3,3,D); px(8,6,D); // 꼭지
    rect(2,16,13,20,B);
    disc(6,24,3,H); rect(2,26,13,2,D);
    rect(0,19,2,10,D); px(1,18,D); px(1,29,D); // 손잡이
    rect(4,36,9,2,D);
    rect(14,34,8,5,B); rect(21,31,6,6,B);
    rect(25,29,4,4,B); rect(27,30,2,2,C.brownDk); // 주둥이 입
    px(5,31,C.green); px(11,34,C.green); px(4,22,C.green); // 파티나
  },

  // 파이프렌치 총구: 위 조(jaw) + 세로 자루 + 하단 그립
  pipe_wrench_muzzle(a){ const {C,px,rect}=a;
    rect(3,1,10,5,C.metal); rect(3,1,10,1,C.metalHi);
    for(let x=3;x<13;x+=2) px(x,5,C.darkMetal);
    rect(3,8,9,4,C.metal);
    for(let x=3;x<12;x+=2) px(x,8,C.darkMetal);
    rect(4,12,8,4,C.orange);
    for(let x=5;x<12;x+=2) rect(x,12,1,4,C.orangeDk);
    rect(5,16,6,23,C.darkMetal); rect(6,17,1,21,C.steel);
    rect(5,39,19,6,C.darkMetal); rect(6,40,17,1,C.steel);
    rect(23,38,7,8,C.red); rect(24,39,5,1,C.redHi);
    for(let y=40;y<45;y+=2) rect(24,y,5,1,C.redDk);
  },

  // ───── J (세로 3칸 + 좌하단 발) 32×48 ─────

  // 우산 그립: 접힌 우산 + 좌하단 갈고리 손잡이
  umbrella_grip(a){ const {C,px,rect,disc,line}=a;
    rect(23,0,2,4,C.metal);
    rect(22,4,4,4,C.red);
    rect(21,8,6,5,C.red);
    rect(20,13,8,6,C.red);
    rect(19,19,10,5,C.red);
    line(22,6,21,22,C.redDk,1); line(26,6,27,22,C.redDk,1);
    line(24,5,23,21,C.redHi,1);
    rect(20,16,8,2,C.redDk); px(24,17,C.gold); // 스트랩
    rect(23,24,2,15,C.metal);
    disc(10,42,3,C.wood);
    rect(9,40,15,4,C.wood); rect(10,40,13,1,C.woodHi);
    rect(7,34,4,8,C.wood); rect(7,34,4,2,C.darkWood);
  },

  // 물음표 탄창: J를 따라 흐르는 커다란 ?
  question_mag(a){ const {C,px,rect,disc}=a;
    rect(19,2,10,4,C.purple);
    rect(18,4,4,4,C.purple);
    rect(27,5,4,7,C.purple);
    rect(24,11,6,4,C.purple);
    rect(23,15,4,11,C.purple); rect(23,26,3,3,C.purple);
    rect(20,3,8,1,C.purpleHi); rect(28,6,1,5,C.purpleDk);
    rect(24,16,1,9,C.purpleHi);
    disc(14,41,4.5,C.purple); disc(13,40,1.5,C.purpleHi);
    px(24,37,C.gold); px(27,41,C.gold); px(5,38,C.gold); px(7,44,C.gold);
  },

  // 골동 열쇠꾸러미: 세로 큰 열쇠, 이가 좌하단으로
  key_bundle(a){ const {C,px,rect,ring,disc}=a;
    ring(24,2,1.3,2.5,C.metal);
    ring(24,8,3.5,6.5,C.gold); disc(24,8,1.5,C.goldDk);
    px(20,4,C.goldHi); px(21,3,C.goldHi);
    rect(22,14,5,3,C.goldDk);
    rect(23,17,3,19,C.gold); rect(23,17,1,19,C.goldHi);
    rect(10,36,14,4,C.gold); rect(10,36,14,1,C.goldHi);
    rect(10,40,4,5,C.gold); rect(16,40,3,4,C.gold);
    rect(11,44,2,1,C.goldDk); px(17,43,C.goldDk);
    rect(21,32,7,2,C.goldDk); // 이 연결부
  },

  // 클램프 그립: 왼쪽으로 열린 C-클램프 + 하단 나사 핸들
  clamp_grip(a){ const {C,px,rect}=a;
    rect(18,2,12,5,C.darkMetal); rect(19,3,10,1,C.steel);
    rect(25,7,5,26,C.darkMetal); rect(26,8,1,24,C.steel);
    rect(6,33,24,5,C.darkMetal); rect(7,34,22,1,C.steel);
    rect(15,5,4,2,C.metal); rect(16,7,3,2,C.metalHi); // 위 패드
    rect(9,38,3,7,C.metal); rect(10,38,1,7,C.metalHi); // 나사
    rect(4,45,13,2,C.gold); px(3,45,C.goldDk); px(17,45,C.goldDk);
    px(10,36,C.metalHi);
  },

  // ───── zig (S자 3단) 32×48 ─────

  // 스프링 개머리판: 대각선 코일
  spring_stock(a){ const {C,px,rect,ring,disc}=a;
    rect(25,1,5,3,C.darkMetal);
    ring(24,8,3.5,6,C.metal); ring(17,17,3.5,6,C.metal);
    ring(11,26,3.5,6,C.metal); ring(7,36,3.5,6,C.metal);
    disc(21,4,1.2,C.metalHi); disc(14,13,1.2,C.metalHi);
    disc(8,22,1.2,C.metalHi); disc(4,32,1.2,C.metalHi);
    rect(3,42,6,3,C.darkMetal);
  },

  // 젤리 지렁이: S자 그대로 두 가지 색 구미 웜
  jelly_worm(a){ const {C,px,rect,disc}=a;
    const R='#e05050', G='#7ad060';
    disc(24,6,5.5,R); disc(21,13,5,R); disc(16,19,5,R);
    disc(11,25,5,'#e8a03a');
    disc(8,32,5,G); disc(7,39,5,G); disc(9,44,3.5,G);
    disc(22,4,1.7,'#f08a8a'); disc(6,37,1.7,'#a8e890');
    px(19,16,'#b83838'); px(13,22,'#b87828'); px(6,29,'#4a9a3a'); px(5,36,'#4a9a3a');
    disc(22,5,1.6,C.white); disc(26,5,1.6,C.white);
    px(22,5,C.ink); px(26,5,C.ink); px(21,4,C.whiteHi); px(25,4,C.whiteHi);
    rect(23,8,3,1,C.redDk);
    px(18,17,C.whiteHi); px(9,29,C.whiteHi); px(6,42,C.whiteHi);
  },

  // 번개 장식: 지그재그 그대로 황금 번개
  lightning_relic(a){ const {C,px,rect}=a;
    rect(19,1,10,5,C.gold); rect(17,5,10,7,C.gold);
    rect(13,12,12,5,C.gold); rect(9,17,14,7,C.gold);
    rect(7,24,10,7,C.gold);
    rect(6,31,9,6,C.gold); rect(4,37,8,5,C.gold);
    rect(3,42,5,3,C.gold); px(2,45,C.gold); px(3,45,C.goldDk);
    rect(20,2,8,1,C.goldHi); rect(18,6,2,5,C.goldHi); rect(10,18,2,5,C.goldHi);
    rect(26,4,2,2,C.goldDk); rect(20,21,3,3,C.goldDk); rect(12,28,2,3,C.goldDk);
    px(22,3,C.whiteHi); px(23,4,C.whiteHi); px(8,26,C.whiteHi);
    px(29,10,C.whiteHi); px(4,33,C.whiteHi);
  },

  // 덩굴 그립: S자로 감기는 덩굴 + 잎
  vine_grip(a){ const {C,px,rect,disc,line}=a;
    line(25,2,20,14,C.leaf,3); line(20,14,10,26,C.leaf,3); line(10,26,7,44,C.leaf,3);
    line(24,3,19,13,'#4a9a44',1); line(19,15,10,25,'#4a9a44',1);
    disc(29,8,2.4,C.green); disc(16,16,2.6,C.green);
    disc(5,22,2.4,C.green); disc(12,33,2.6,C.green); disc(3,40,2.2,C.green);
    px(29,7,C.greenHi); px(16,15,C.greenHi); px(12,32,C.greenHi);
    px(30,3,C.leaf); px(31,2,C.leaf); // 덩굴손
    disc(9,29,1.6,C.pink); px(9,29,C.yellow);
  },

  // ───── sS (위 오른쪽 2칸 + 아래 왼쪽 2칸) 48×32 ─────

  // 고추 머즐브레이크: S커브 고추
  pepper_brake(a){ const {C,px,rect,disc}=a;
    const B='#d03828', H='#f06848', D='#8a2418';
    rect(42,1,3,5,C.leaf); disc(41,6,3,C.leafDk);
    disc(38,9,5.5,B); disc(31,8,5.5,B); disc(24,12,6,B);
    disc(16,19,6.5,B); disc(8,24,5.5,B); disc(3,27,3,B);
    disc(36,7,2.5,H); disc(22,10,2.5,H); disc(13,17,2.5,H);
    px(1,29,D); px(2,30,D);
    rect(10,28,8,2,D); rect(28,12,6,2,D);
    px(39,5,C.whiteHi);
  },

  // 게 집게 그립: 아래 몸통 + 오른쪽으로 벌린 집게
  crab_grip(a){ const {C,px,rect,disc}=a;
    const B='#e05038', H='#f07858', D='#a03020';
    disc(10,23,7.5,B); disc(19,22,6.5,B);
    disc(8,20,3,H);
    rect(24,18,8,9,'#c04028'); // 관절
    rect(26,3,14,6,B); disc(27,6,4.5,B);
    rect(40,3,5,4,C.white); px(44,5,C.whiteDk);
    rect(26,13,12,5,B);
    rect(37,13,4,3,C.white); px(40,15,C.whiteDk);
    px(12,18,D); px(16,26,D); px(8,27,D); px(29,5,D); px(30,15,D);
    px(28,4,H);
  },

  // ───── T (상단 3칸 + 중앙 아래 기둥) 48×32 ─────

  // 수정구 스코프: 중앙 보주 + 금 발톱 받침
  crystal_scope(a){ const {C,px,rect,disc,ring}=a;
    rect(3,11,9,3,C.purpleDk); rect(36,11,9,3,C.purpleDk); // 안개
    px(5,9,C.purpleHi); px(41,9,C.purpleHi); px(8,6,C.cyan); px(39,5,C.whiteHi);
    disc(24,9,8.5,C.purple);
    disc(21,6,3.5,C.purpleHi);
    px(27,11,C.cyan); px(25,13,C.cyan); px(22,12,C.cyanHi);
    disc(20,5,1.6,C.whiteHi);
    rect(13,9,3,6,C.gold); px(13,8,C.gold); px(12,7,C.goldHi);
    rect(32,9,3,6,C.gold); px(34,8,C.gold); px(35,7,C.goldHi);
    // 기둥 칸: 소켓 링 + 떠다니는 수정 조각 (위/아래 어느 쪽으로 달아도 어색하지 않게)
    rect(20,16,8,3,C.gold); rect(20,16,8,1,C.goldHi);
    disc(24,22,1.6,C.purple); px(23,21,C.purpleHi);
    disc(21,26,1.2,C.purpleHi); disc(27,25,1.2,C.purple);
    px(24,29,C.cyan); px(20,19,C.cyanHi); px(28,20,C.whiteHi); px(23,30,C.purpleHi);
  },

  // 샤워기 헤드: 넓은 헤드 + 물방울 + 파이프
  shower_head(a){ const {C,px,rect,disc}=a;
    disc(6,8,4,C.metal); disc(42,8,4,C.metal);
    rect(5,4,38,8,C.metal);
    rect(7,4,34,2,C.metalHi);
    rect(6,11,36,3,C.darkMetal);
    for(let x=9;x<40;x+=4) px(x,12,'#2a3038');
    px(11,15,C.cyan); px(19,15,C.cyanHi); px(27,15,C.cyan); px(35,15,C.cyanHi);
    rect(19,14,10,4,C.darkMetal);
    rect(21,18,6,10,C.metal); rect(22,18,1,10,C.metalHi);
    rect(19,28,10,3,C.darkMetal);
  },

  // 용접면 브레이크: 마스크 + 붉게 빛나는 창
  weld_mask_brake(a){ const {C,px,rect}=a;
    const B='#3d444d', D='#2a3038', H='#5a626d';
    rect(10,2,28,3,B);
    rect(6,4,36,10,B);
    rect(11,3,26,1,H);
    rect(14,6,20,5,C.black);
    rect(16,7,16,3,'#c03018'); rect(18,8,12,1,'#f08040');
    px(9,5,C.metal); px(38,5,C.metal);
    rect(7,9,2,4,D); rect(39,9,2,4,D);
    rect(17,14,14,6,B);
    rect(19,20,10,5,'#333a42');
    rect(21,25,6,3,D);
    rect(21,17,6,1,C.black); rect(21,19,6,1,C.black);
  },

  // 닻 개머리판: 고리+가로대+생크+갈고리
  anchor_stock(a){ const {C,px,rect,ring,disc}=a;
    ring(24,4,1.8,3.5,C.gold);
    rect(6,8,36,4,C.darkMetal);
    disc(7,10,3,C.darkMetal); disc(41,10,3,C.darkMetal);
    rect(8,8,32,1,C.steel);
    rect(21,12,6,15,C.darkMetal); rect(22,13,1,13,C.steel);
    rect(17,25,5,3,C.darkMetal); px(17,23,C.darkMetal); px(16,22,C.darkMetal);
    rect(26,25,5,3,C.darkMetal); px(30,23,C.darkMetal); px(31,22,C.darkMetal);
    rect(22,28,4,3,C.darkMetal); px(23,31,C.darkMetal); px(24,31,C.darkMetal);
  },

  // 황금 왕관: 왕관 + 붉은 방석 받침
  crown(a){ const {C,px,rect,disc}=a;
    rect(6,10,36,5,C.gold); rect(7,10,34,1,C.goldHi); rect(6,14,36,1,C.goldDk);
    rect(9,5,3,5,C.gold); px(10,3,C.gold); px(10,4,C.gold);
    rect(22,4,4,6,C.gold); px(23,2,C.gold); px(24,2,C.gold); px(23,3,C.gold); px(24,3,C.gold);
    rect(36,5,3,5,C.gold); px(37,3,C.gold); px(37,4,C.gold);
    disc(10,2,1.4,C.white); disc(23,1,1.5,C.white); px(24,1,C.white); disc(37,2,1.4,C.white);
    rect(12,11,2,2,C.red); rect(23,11,2,2,C.cyan); rect(34,11,2,2,C.red);
    rect(16,16,16,9,C.red);
    rect(18,17,12,2,C.redHi);
    rect(16,24,16,2,C.redDk);
    px(16,26,C.gold); px(31,26,C.gold); px(24,20,C.redDk);
  },

  // 공압 총구: 해머 블록 + 아래로 뻗은 피스톤
  pneumatic_muzzle(a){ const {C,px,rect}=a;
    rect(6,3,36,9,C.metal);
    rect(7,3,34,1,C.metalHi); rect(6,11,36,1,C.darkMetal);
    rect(20,3,8,9,C.metalHi); rect(20,3,8,1,'#d0d8e0');
    px(8,5,C.darkMetal); px(39,5,C.darkMetal); px(8,10,C.darkMetal); px(39,10,C.darkMetal);
    rect(10,6,2,4,C.darkMetal); rect(14,6,2,4,C.darkMetal);
    rect(32,6,2,4,C.darkMetal); rect(36,6,2,4,C.darkMetal);
    rect(19,12,10,3,C.darkMetal);
    rect(21,15,6,8,C.metalHi); rect(22,15,1,8,'#d0d8e0');
    rect(22,23,4,5,C.metal); px(23,28,C.metal); px(24,28,C.metal);
    px(17,18,C.cyan); px(16,20,C.cyanHi); px(30,18,C.cyan); px(31,20,C.cyanHi);
  },

  // ───── longT (상단 3칸 + 중앙 아래 2칸) 48×48 ─────

  // CCTV 스코프: 카메라 + 지지 기둥 + 바닥판
  cctv_scope(a){ const {C,px,rect,disc}=a;
    rect(4,4,32,9,'#3d444d'); rect(5,5,30,1,'#5a626d');
    rect(36,3,8,11,C.black); rect(36,2,9,2,'#2a3038');
    disc(40,8,3,'#20262c'); px(40,8,C.red); px(39,7,'#ff8070');
    rect(8,6,1,5,'#2a3038'); rect(11,6,1,5,'#2a3038'); rect(14,6,1,5,'#2a3038');
    px(6,6,C.green);
    rect(21,13,6,3,C.darkMetal);
    disc(24,17,3,C.darkMetal);
    rect(22,16,4,24,C.metal); rect(22,16,1,24,C.metalHi);
    // 기둥 끝은 안테나 크로스바 + 신호등 (장착 방향 무관)
    rect(19,40,10,2,C.darkMetal); rect(20,42,8,2,C.metal);
    disc(24,45,1.7,C.red); px(23,44,'#ff8070');
  },

  // 모기장 스코프: 하얀 그물 돔 + 기둥
  mosquito_net_scope(a){ const {C,px,rect,disc}=a;
    rect(16,1,16,3,C.white);
    rect(10,4,28,4,C.white);
    rect(6,8,36,6,C.white);
    for(let y=2;y<14;y+=3) for(let x=7;x<41;x+=3) px(x,y,'#a8a49a');
    rect(8,14,2,3,C.white); rect(22,14,4,2,C.white); rect(38,14,2,3,C.white);
    px(23,13,C.gold); px(24,13,C.gold);
    rect(22,16,4,24,C.wood); rect(22,16,1,24,C.woodHi);
    rect(20,40,8,2,C.darkWood);
    disc(24,44,2.2,C.gold); px(23,43,C.goldHi);
  },

  // ───── plus (십자) 48×48 ─────

  // 곰인형 개머리판: 십자로 뻗은 팔다리
  teddy_stock(a){ const {C,px,rect,disc,line}=a;
    disc(18,3,2.9,C.brown); disc(30,3,2.9,C.brown);
    disc(18,3,1.2,C.pink); disc(30,3,1.2,C.pink);
    disc(24,8,6.5,C.brown);
    disc(24,11,3,'#a8845a');
    disc(21,6,2,C.white); disc(27,6,2,C.white);
    disc(21,6,1.1,C.ink); disc(27,6,1.1,C.ink);
    px(20,5,C.whiteHi); px(26,5,C.whiteHi);
    px(23,10,C.ink); px(24,10,C.ink);
    rect(18,16,12,16,C.brown);
    disc(24,25,4.5,'#a8845a');
    line(24,21,24,28,C.brownDk,1);
    rect(3,19,13,7,C.brown); disc(5,22,3.6,C.brown); disc(5,22,1.9,C.pink);
    rect(32,19,13,7,C.brown); disc(43,22,3.6,C.brown); disc(43,22,1.9,C.pink);
    rect(18,32,5,11,C.brown); rect(25,32,5,11,C.brown);
    rect(16,43,8,4,C.brown); rect(24,43,8,4,C.brown);
    disc(19,45,1.7,C.pink); disc(29,45,1.7,C.pink);
    rect(27,27,4,4,'#6a4a2c'); px(28,26,C.ink); px(30,28,C.ink);
  },

  // 십자드라이버 그립: 십자 팁 단면
  driver_grip(a){ const {C,px,rect,disc}=a;
    rect(18,3,12,42,C.metal);
    rect(3,18,42,12,C.metal);
    rect(18,3,2,42,C.metalHi); rect(3,18,42,2,C.metalHi);
    rect(28,3,2,42,C.darkMetal); rect(3,28,42,2,C.darkMetal);
    rect(23,6,2,36,'#3a4048'); rect(6,23,36,2,'#3a4048');
    rect(20,20,8,8,C.darkMetal);
    disc(24,24,2.5,C.steel); px(23,23,C.metalHi);
    rect(19,4,10,1,'#d0d8e0'); rect(4,19,1,10,'#d0d8e0');
    px(20,5,C.whiteHi);
  },

  // 진주 목걸이 탄창: 십자로 펼친 진주 스트랜드 + 펜던트
  necklace_mag(a){ const {C,px,rect,disc,line}=a;
    line(24,6,24,20,C.goldDk,1); line(6,24,20,24,C.goldDk,1);
    line(28,24,42,24,C.goldDk,1); line(24,28,24,38,C.goldDk,1);
    rect(22,2,4,4,C.gold); px(23,1,C.goldHi);
    const P=(x,y,r)=>{ disc(x,y,r,C.white); px(x-1,y-1,C.whiteHi); px(x+1,y+1,C.whiteDk); };
    P(24,8,2); P(24,13,2); P(24,18,2);
    P(8,24,2); P(13,24,2); P(18,24,2);
    P(30,24,2); P(35,24,2); P(40,24,2);
    P(24,30,2); P(24,35,2);
    disc(24,24,3,C.white); px(23,23,C.whiteHi); px(25,25,C.whiteDk);
    rect(23,38,3,2,C.gold);
    disc(24,43,3.4,C.white); px(23,41,C.whiteHi); px(26,45,C.whiteDk);
    px(4,24,C.gold); px(44,24,C.gold);
  },

  // 잠자리 눈 스코프: 겹눈 머리 + 양옆 날개 + 꼬리
  dragonfly_scope(a){ const {C,px,rect,disc,line}=a;
    disc(20,7,4.6,C.cyan); disc(28,7,4.6,C.cyan);
    px(18,5,C.whiteHi); px(26,5,C.whiteHi);
    for(let y=5;y<11;y+=2) for(let x=17;x<32;x+=3) px(x,y,'#3aa8c8');
    px(18,1,C.ink); px(30,1,C.ink); px(19,2,C.ink); px(29,2,C.ink);
    rect(20,15,8,16,C.green); rect(21,16,1,14,C.greenHi);
    rect(20,20,8,2,C.leafDk); rect(20,25,8,2,C.leafDk);
    rect(2,18,17,4,C.cyan); rect(4,24,15,3,C.cyan);
    line(4,19,17,20,C.cyanDk,1); line(6,25,17,26,C.cyanDk,1);
    px(2,18,C.cyanHi); px(4,24,C.cyanHi);
    rect(29,18,17,4,C.cyan); rect(29,24,15,3,C.cyan);
    line(31,20,44,19,C.cyanDk,1); line(31,26,42,25,C.cyanDk,1);
    rect(22,31,4,15,C.green);
    rect(22,34,4,1,C.leafDk); rect(22,38,4,1,C.leafDk); rect(22,42,4,1,C.leafDk);
    px(23,46,C.leafDk); px(24,46,C.leafDk);
  },

  // 벌집 탄창: 십자 육각 벌집 + 꿀 + 꿀벌
  honeycomb_mag(a){ const {C,px,rect,disc}=a;
    const hex=(cx,cy,fill)=>{
      rect(cx-3,cy-6,6,12,fill); rect(cx-5,cy-4,10,8,fill);
      rect(cx-6,cy-2,12,4,fill);
    };
    hex(24,8,C.gold); hex(9,24,C.gold); hex(24,24,C.gold); hex(39,24,C.gold); hex(24,40,C.gold);
    rect(21,5,5,5,'#7a5410'); rect(37,22,5,5,'#7a5410'); // 빈 방
    rect(7,21,5,5,'#d4a020'); px(8,22,C.goldHi);
    px(20,3,C.goldHi); px(6,20,C.goldHi); px(36,20,C.goldHi); px(21,37,C.goldHi);
    rect(23,45,3,2,'#d4a020'); px(24,47,'#b8860c'); // 꿀 드립
    rect(21,23,5,3,C.yellow); px(22,24,C.ink); px(24,24,C.ink); // 꿀벌
    px(21,21,C.whiteHi); px(24,21,C.whiteHi);
  },

  // 프레첼 (음식): 세 갈래 매듭 도우
  pretzel(a){ const {C,px,rect,ring,line}=a;
    const B='#a86a28', H='#c98a48';
    ring(24,10,3.5,7,B); ring(10,24,3.5,7,B); ring(38,24,3.5,7,B);
    line(15,31,33,17,B,5); line(15,17,33,31,B,5);
    line(21,32,18,45,B,4); line(27,32,30,45,B,4);
    px(20,5,H); px(21,4,H); px(6,20,H); px(34,20,H); px(22,15,H);
    px(18,7,C.white); px(28,6,C.white); px(7,27,C.white); px(41,22,C.white);
    px(20,20,C.white); px(24,44,C.white); px(29,38,C.white);
  },

  // 프레첼 조준경: 매듭 중앙에 렌즈
  pretzel_scope(a){ const {C,px,rect,ring,line,disc}=a;
    SHAPE_ART.pretzel(a);
    disc(24,24,3.5,C.cyan); px(23,23,C.whiteHi);
    ring(24,24,3.5,4.5,C.goldDk);
  },

  // 순금 십자 훈장: 보석 박힌 십자
  cross_trophy(a){ const {C,px,rect,disc,ring}=a;
    rect(19,4,10,40,C.gold);
    rect(4,19,40,10,C.gold);
    rect(19,4,2,40,C.goldHi); rect(4,19,40,2,C.goldHi);
    rect(27,4,2,40,C.goldDk); rect(4,27,40,2,C.goldDk);
    rect(17,4,14,2,C.gold); rect(17,42,14,2,C.gold);
    rect(4,17,2,14,C.gold); rect(42,17,2,14,C.gold);
    disc(24,24,5,C.yellowHi); ring(24,24,4,5.2,C.goldDk);
    disc(24,24,2.3,C.red); px(23,23,'#ff9a8a');
    px(24,10,C.goldDk); px(24,38,C.goldDk); px(10,24,C.goldDk); px(38,24,C.goldDk);
    rect(21,2,6,2,C.red); px(23,2,C.white); px(24,2,C.white);
  },

  // 연꽃 탄창: 십자 꽃잎 + 씨방
  lotus_mag(a){ const {C,px,rect,disc,ring}=a;
    const petal=(cx,cy,tx,ty)=>{
      disc(cx,cy,5.3,C.pink);
      disc((cx+tx)/2,(cy+ty)/2,3.4,C.pink);
      px(tx,ty,C.pinkHi); px(tx+(cx>tx?-1:cx<tx?1:0),ty+(cy>ty?-1:cy<ty?1:0),C.pinkHi);
      disc(cx,cy,2.4,C.pinkDk);
    };
    petal(24,10,24,2); petal(10,24,2,24); petal(38,24,45,24); petal(24,38,24,45);
    ring(24,24,5.6,6.8,C.leaf);
    disc(24,24,5.5,C.gold);
    px(22,22,C.brown); px(26,22,C.brown); px(24,25,C.brown); px(21,25,C.brown); px(27,25,C.brown);
    px(23,21,C.goldHi);
  },

  // ───── U (양쪽 기둥 + 아래 가로) 48×32 ─────

  // 계란판 탄창: 판 + 꽂힌 계란 2개
  eggcarton_mag(a){ const {C,px,rect,disc}=a;
    const P='#b8ad98', D='#a89d88';
    rect(2,18,44,12,P);
    disc(8,19,6,P); disc(24,21,5,P); disc(40,19,6,P);
    disc(24,22,3.6,'#8a8070'); // 빈 컵
    rect(2,28,44,2,D);
    px(16,24,D); px(31,24,D); px(20,27,D); px(28,27,D);
    disc(8,10,5,C.white); disc(8,13,5.4,C.white);
    px(6,7,C.whiteHi); px(5,9,C.whiteHi); rect(11,12,2,4,C.whiteDk);
    disc(40,10,5,C.white); disc(40,13,5.4,C.white);
    px(38,7,C.whiteHi); px(37,9,C.whiteHi); rect(43,12,2,4,C.whiteDk);
  },

  // 고무장갑 그립: 두 손가락 세운 고무장갑
  glove_grip(a){ const {C,px,rect,disc}=a;
    const B='#e06a80', H='#f0a0b4', D='#b84a60';
    rect(3,17,42,10,B);
    rect(1,27,46,4,H);
    rect(3,3,10,15,B); disc(8,4,4.9,B);
    rect(35,3,10,15,B); disc(40,4,4.9,B);
    rect(4,13,8,1,D); rect(36,13,8,1,D);
    rect(4,5,1,9,H); rect(36,5,1,9,H);
    disc(30,20,3.4,B); px(29,18,H); // 엄지 볼록
    px(14,8,C.cyan); px(6,1,C.whiteHi); px(38,1,C.whiteHi);
  },

  // 트롬본 벨: 슬라이드 관 + 왼쪽 벨
  trombone_bell(a){ const {C,px,rect}=a;
    rect(4,20,40,3,C.gold); rect(4,25,40,3,C.gold);
    rect(4,21,40,1,C.goldHi); rect(4,26,40,1,C.goldHi);
    rect(42,20,4,8,C.gold); px(45,23,C.goldDk);
    rect(22,20,2,8,C.goldDk); // 브레이스
    rect(8,14,8,4,C.gold);
    rect(6,9,12,5,C.gold);
    rect(4,3,16,6,C.gold);
    rect(3,2,18,2,C.goldHi);
    rect(7,4,10,2,C.goldDk);
    rect(38,4,3,16,C.gold); rect(38,3,8,3,C.gold); rect(43,6,3,7,C.gold);
    rect(42,13,4,3,C.goldDk); // 마우스피스
    px(10,5,C.whiteHi); px(39,5,C.whiteHi);
    rect(6,28,36,1,C.goldDk);
  },

  // 오븐장갑 그립: 퀼팅 장갑 + 걸이 고리
  oven_mitt_grip(a){ const {C,px,rect,disc,ring,line}=a;
    const D='#a03028';
    rect(3,17,40,10,C.red);
    rect(3,3,10,15,C.red); disc(8,4,4.9,C.red);
    line(6,19,14,27,D,1); line(14,19,22,27,D,1); line(22,19,30,27,D,1);
    line(14,27,22,19,D,1); line(22,27,30,19,D,1); line(6,27,14,19,D,1);
    rect(4,6,1,8,'#e07060');
    rect(3,26,32,2,C.white);
    ring(40,9,2.6,5.5,D); rect(37,14,7,4,D); // 고리
    px(38,5,'#e07060');
  },

  // 작업장갑 그립: 가죽 장갑 + 버클
  workglove_grip(a){ const {C,px,rect,disc}=a;
    const B='#c07030', D='#8a5020', H='#d88a48';
    rect(3,17,42,10,B);
    rect(3,3,10,15,B); disc(8,4,4.9,B);
    rect(35,3,10,15,B); disc(40,4,4.9,B);
    rect(5,7,7,5,'#a05a24'); // 패치
    rect(36,17,10,10,D);
    rect(39,20,4,4,C.metal); px(40,21,C.metalHi);
    for(let x=5;x<34;x+=3) px(x,18,C.white);
    px(4,13,C.white); px(7,13,C.white); px(36,13,C.white); px(39,13,C.white);
    rect(4,5,1,8,H); rect(36,5,1,8,H);
    px(24,22,C.metal);
  },

  // 말굽 자석: 빨강·파랑 U + 은색 극
  horseshoe_magnet(a){ const {C,px,rect,disc}=a;
    rect(3,6,10,14,C.red);
    rect(35,6,10,14,C.blue);
    rect(3,18,21,10,C.red); rect(24,18,21,10,C.blue);
    disc(8,24,5,C.red); disc(40,24,5,C.blue); disc(24,26,4,'#7a4a90');
    rect(4,8,2,11,'#e37060'); rect(36,8,2,11,C.blueHi);
    rect(5,26,38,2,'#00000030');
    rect(2,2,12,4,C.metal); rect(34,2,12,4,C.metal);
    rect(3,2,10,1,C.metalHi); rect(35,2,10,1,C.metalHi);
    px(7,0,C.cyanHi); px(6,1,C.cyan); px(8,1,C.cyan);
    px(41,0,C.yellowHi); px(40,1,C.yellow); px(42,1,C.yellow);
  },

  // ───── stairs (계단 대각) 48×48 ─────

  // 소시지 체인: 계단을 따라 이어진 링크
  sausage_mag(a){ const {C,px,rect,disc,line}=a;
    const B='#c05038', H='#e07858', D='#8a3020';
    // 세로 링크
    rect(4,4,9,24,B); disc(8,5,4.4,B); disc(8,27,4.4,B);
    rect(5,6,2,20,H);
    // 매듭 1
    rect(7,29,3,2,D); px(6,30,C.gold); px(10,29,C.gold);
    // 가로 링크
    rect(13,20,17,9,B); disc(15,24,4.4,B); disc(29,24,4.4,B);
    rect(15,21,14,2,H);
    px(31,26,D);
    // 매듭 2
    rect(30,27,2,3,D); px(31,31,C.gold);
    // 세로 링크 2
    rect(19,30,9,15,B); disc(23,31,4.4,B); disc(23,43,4.4,B);
    rect(20,32,2,11,H);
    // 매듭 3 + 가로 링크
    rect(28,41,2,3,D);
    rect(30,38,15,9,B); disc(43,42,4.4,B);
    rect(32,39,12,2,H);
    px(8,10,C.whiteHi); px(20,22,C.whiteHi); px(24,35,C.whiteHi); px(36,40,C.whiteHi);
  },

  // 고무 닭 그립: 머리→축 늘어진 목→통통한 몸
  rubber_chicken_grip(a){ const {C,px,rect,disc,line}=a;
    disc(8,8,5.8,C.yellow);
    disc(5,2,1.6,C.red); disc(8,1,1.7,C.red); disc(11,2,1.6,C.red); // 볏
    rect(13,7,4,2,C.orange); px(16,8,C.orangeDk); // 부리
    px(12,11,C.red); px(12,12,C.red); // 턱볏
    disc(7,7,2,C.white); px(8,7,C.ink); px(6,6,C.whiteHi);
    line(9,14,11,24,C.yellow,4);
    line(11,24,21,29,C.yellow,4);
    px(8,17,C.yellowDk); px(9,21,C.yellowDk); px(13,26,C.yellowDk);
    disc(27,38,7.5,C.yellow); disc(37,40,6.5,C.yellow);
    disc(43,37,3,C.yellow);
    line(24,36,31,33,C.yellowDk,1); line(33,45,40,45,C.yellowDk,1);
    disc(24,34,2,'#f8e488');
    px(29,46,C.orange); px(30,47,C.orange); px(35,47,C.orange);
  },

  // 뱀 화석: 돌판 + 뼈 척추
  snake_fossil(a){ const {C,px,rect,disc,line}=a;
    const S='#8a8578', SD='#77726a';
    rect(1,1,14,30,S); rect(1,17,30,14,S); rect(17,17,14,30,S); rect(17,33,30,14,S); rect(33,33,14,14,S);
    rect(2,2,12,2,'#99948a'); rect(18,18,12,2,'#99948a'); rect(34,34,12,2,'#99948a');
    px(4,24,SD); px(12,9,SD); px(26,20,SD); px(22,44,SD); px(40,38,SD); px(44,44,SD);
    disc(8,8,4.6,C.bone);
    rect(6,7,2,2,'#5a564c'); px(11,10,'#5a564c'); // 눈구멍·콧구멍
    rect(11,10,3,2,C.bone);
    const vert=[[8,15],[8,20],[8,25],[10,29],[14,30],[19,30],[24,31],[24,36],[24,41],[28,43],[33,44],[38,44],[43,43]];
    for(let i=0;i<vert.length-1;i++) line(vert[i][0],vert[i][1],vert[i+1][0],vert[i+1][1],C.boneDk,1);
    for(const [x,y] of vert) disc(x,y,1.8,C.bone);
    // 갈비뼈
    px(4,15,C.bone); px(12,15,C.bone); px(4,20,C.bone); px(12,20,C.bone);
    px(4,25,C.bone); px(12,25,C.bone); px(19,27,C.bone); px(19,33,C.bone);
    px(28,39,C.bone); px(28,47,C.bone); px(33,40,C.bone); px(38,40,C.bone);
  },

  // ───── donut (3×3 고리) 48×48 ─────

  // 달팽이 드럼: 나선 껍데기 + 빼꼼 머리
  snail_drum(a){ const {C,px,rect,disc,ring,line}=a;
    ring(24,24,10,22,'#a87848');
    ring(24,24,10,13.5,'#c99a68');
    ring(24,24,17,20,'#8a6038');
    line(32,16,44,5,'#6a4426',2);
    line(24,3,24,7,'#8a6038',1); line(3,24,7,24,'#8a6038',1);
    line(24,41,24,45,'#8a6038',1); line(41,24,45,24,'#8a6038',1);
    px(12,10,'#e0b888'); px(10,13,'#e0b888'); px(36,36,'#6a4426');
    disc(9,42,4,C.slime);
    line(6,38,4,34,C.slime,1); px(4,33,C.ink);
    line(11,38,10,33,C.slime,1); px(10,32,C.ink);
    px(7,43,C.ink); px(6,41,'#a8e890');
  },

  // 액자 조준기: 빈 액자 프레임 + 조준 눈금
  frame_scope(a){ const {C,px,rect,frame,disc}=a;
    rect(2,2,44,6,C.wood); rect(2,40,44,6,C.wood);
    rect(2,2,6,44,C.wood); rect(40,2,6,44,C.wood);
    rect(3,3,42,1,C.woodHi); rect(3,3,1,42,C.woodHi);
    frame(8,8,32,32,C.gold); frame(9,9,30,30,C.goldDk);
    disc(4,4,2.6,C.gold); disc(43,4,2.6,C.gold); disc(4,43,2.6,C.gold); disc(43,43,2.6,C.gold);
    px(4,4,C.goldHi); px(43,4,C.goldHi); px(4,43,C.goldHi); px(43,43,C.goldHi);
    rect(23,8,2,4,C.red); rect(23,36,2,4,C.red);
    rect(8,23,4,2,C.red); rect(36,23,4,2,C.red);
    for(let x=12;x<38;x+=5) px(x,5,C.darkWood);
    for(let x=12;x<38;x+=5) px(x,43,C.darkWood);
  },

  // 톱니바퀴 드럼: 이빨 달린 기어 링
  gear_drum_mag(a){ const {C,px,rect,disc,ring}=a;
    rect(20,1,8,6,C.metal); rect(20,41,8,6,C.metal);
    rect(1,20,6,8,C.metal); rect(41,20,6,8,C.metal);
    rect(6,6,7,7,C.metal); rect(35,6,7,7,C.metal);
    rect(6,35,7,7,C.metal); rect(35,35,7,7,C.metal);
    ring(24,24,10,19.5,C.metal);
    ring(24,24,17.5,19.5,C.metalHi);
    ring(24,24,10,11.5,'#3a4048');
    disc(13,13,2,'#2f353c'); disc(35,13,2,'#2f353c');
    disc(13,35,2,'#2f353c'); disc(35,35,2,'#2f353c');
    px(24,3,C.metalHi); px(3,24,C.metalHi);
    px(38,8,'#2f353c'); px(9,39,'#2f353c');
  },

  // 구리 코일 개머리판: 감긴 구리선 토러스
  copper_coil_stock(a){ const {C,px,rect,ring,line}=a;
    const B='#c87838', H='#e8a050', D='#8a4a1c';
    ring(24,24,10,21,B);
    ring(24,24,12.5,16,H);
    for(let i=0;i<14;i++){
      const t = i/14*Math.PI*2;
      line(24+Math.cos(t)*10.5, 24+Math.sin(t)*10.5, 24+Math.cos(t)*20, 24+Math.sin(t)*20, D, 1);
    }
    line(38,40,45,45,B,2); line(35,43,42,47,B,2);
    px(46,46,C.darkMetal); px(43,47,C.darkMetal);
  },

  // 황금 오리 미니상: 오리 모양 금 튜브
  golden_duck(a){ const {C,px,rect,disc,ring,line}=a;
    ring(24,24,10,20,C.gold);
    ring(24,24,10,12.5,C.goldHi);
    ring(24,24,18,20,C.goldDk);
    rect(6,10,9,9,C.gold); // 목
    disc(10,8,5.5,C.gold);
    disc(11,6,2,C.goldHi);
    rect(15,7,5,3,C.orange); px(19,9,C.orangeDk);
    disc(11,7,1.4,C.ink); px(10,6,C.whiteHi);
    rect(38,8,6,5,C.gold); px(43,6,C.gold); px(44,7,C.gold); px(42,7,C.gold); // 꼬리
    line(13,37,24,41,C.goldDk,1); line(24,41,35,37,C.goldDk,1); // 날개 새김
    px(30,4,C.whiteHi); px(5,30,C.whiteHi); px(42,32,'#fff8d0');
  },

  // 명화 액자: 화려한 금박 프레임 (가운데는 도려진 채…)
  frame_art(a){ const {C,px,rect,frame,disc}=a;
    rect(2,2,44,6,C.gold); rect(2,40,44,6,C.gold);
    rect(2,2,6,44,C.gold); rect(40,2,6,44,C.gold);
    rect(3,3,42,1,C.goldHi); rect(3,3,1,42,C.goldHi);
    rect(3,44,42,1,C.goldDk); rect(44,3,1,42,C.goldDk);
    for(let x=10;x<40;x+=6){ px(x,4,C.goldDk); px(x+2,5,C.goldDk); px(x,43,C.goldDk); px(x+2,42,C.goldDk); }
    for(let y=10;y<40;y+=6){ px(4,y,C.goldDk); px(5,y+2,C.goldDk); px(43,y,C.goldDk); px(42,y+2,C.goldDk); }
    disc(4,4,3,C.goldDk); px(4,4,C.goldHi);
    disc(43,4,3,C.goldDk); px(43,4,C.goldHi);
    disc(4,43,3,C.goldDk); px(4,43,C.goldHi);
    disc(43,43,3,C.goldDk); px(43,43,C.goldHi);
    frame(8,8,32,32,'#8a2f24'); frame(9,9,30,30,'#5a1f18');
    rect(8,8,5,2,'#d8d0b8'); px(9,10,'#d8d0b8'); px(8,11,'#b8b09a'); // 찢긴 캔버스 조각
  },

  // 도넛: 딸기 프로스팅 + 스프링클
  donut_food(a){ const {C,px,rect,disc,ring}=a;
    ring(24,24,10,21,'#d4913e');
    ring(24,24,19,21,'#a86a28');
    ring(24,24,10,16.5,'#e87a9c');
    ring(24,24,10,11.5,'#b87830');
    disc(24,7,2.6,'#e87a9c'); disc(38,13,2.6,'#e87a9c'); disc(41,29,2.6,'#e87a9c');
    disc(31,40,2.6,'#e87a9c'); disc(13,39,2.6,'#e87a9c'); disc(7,26,2.6,'#e87a9c'); disc(11,12,2.6,'#e87a9c');
    rect(20,11,2,1,C.cyan); rect(30,13,2,1,C.yellow); rect(36,22,1,2,C.white);
    rect(33,32,2,1,C.green); rect(16,34,1,2,C.cyan); rect(11,22,2,1,C.yellow);
    rect(26,36,2,1,C.white); rect(14,16,1,2,C.green);
    px(19,8,'#f4b8c8'); px(37,26,'#f4b8c8');
  },

  // 타이어 방탄복: 트레드 달린 고무 링 + 스트랩
  tire_vest(a){ const {C,px,rect,disc,ring,line}=a;
    ring(24,24,10,21,C.rubber);
    ring(24,24,12,16,'#3d3d38');
    for(let i=0;i<12;i++){
      const t = i/12*Math.PI*2;
      rect(Math.round(22+Math.cos(t)*19), Math.round(22+Math.sin(t)*19), 3,3, '#1f1f1c');
    }
    for(let i=0;i<8;i++){
      const t = i/8*Math.PI*2 + 0.4;
      px(Math.round(24+Math.cos(t)*14), Math.round(24+Math.sin(t)*14), '#55554e');
    }
    line(10,10,16,7,'#55554e',2);
    rect(19,38,10,8,'#d4a020');
    rect(22,41,4,3,C.metal); px(23,42,C.metalHi);
    px(34,8,C.metal); px(35,7,C.metal); // 밸브
  },
  // ───── bigL (세로 4칸 + 하단 가로 3칸) 48×64 ─────

  // 현미경 스코프: bigL 그대로 현미경
  microscope_scope(a){ const {C,px,rect,disc}=a;
    rect(4,2,8,6,C.darkMetal); rect(5,2,6,1,C.steel);
    rect(5,8,7,14,C.metal); rect(6,9,1,12,C.metalHi);
    rect(3,22,11,4,C.darkMetal);
    rect(6,26,5,7,C.metal); rect(7,27,1,5,C.metalHi);
    rect(10,24,4,17,'#3d444d'); // 암
    disc(13,30,3,C.metal); disc(13,30,1.5,C.darkMetal); // 조절 노브
    rect(2,35,13,3,'#3d444d');
    rect(4,34,8,2,C.glass); px(7,34,C.green); // 슬라이드+시료
    disc(8,41,2,C.yellow); px(8,40,C.yellowHi); // 조명
    rect(2,52,42,3,C.darkMetal);
    rect(2,55,42,7,'#3d444d'); rect(3,55,40,1,'#5a626d');
    rect(3,62,8,2,C.black); rect(35,62,8,2,C.black);
    rect(24,56,9,4,'#2a3038'); px(26,57,C.green); px(30,57,C.red);
    disc(37,52,2.6,C.glass); px(36,51,C.whiteHi); // 반사경
  },

  // 목발 개머리판: 겨드랑이 패드 + 쌍대 + 넓은 고무 발
  crutch_stock(a){ const {C,px,rect}=a;
    rect(2,2,13,4,C.grey); rect(3,2,11,1,'#a8a294');
    rect(2,6,13,2,C.greyDk);
    rect(4,8,3,22,C.wood); rect(10,8,3,22,C.wood);
    rect(4,8,1,22,C.woodHi); rect(12,8,1,22,C.darkWood);
    rect(4,17,9,3,C.darkWood); px(5,18,C.woodHi); // 그립바
    px(5,15,C.metal); px(11,15,C.metal);
    rect(6,30,5,7,C.wood);
    rect(7,37,4,15,C.wood); rect(7,37,1,15,C.woodHi);
    rect(6,52,6,4,C.wood);
    rect(3,56,12,6,C.rubber);
    rect(14,57,30,5,C.rubber);
    rect(42,55,4,7,C.rubber);
    for(let x=17;x<42;x+=4) rect(x,58,2,1,'#55554e');
    rect(4,56,10,1,'#55554e');
  },

  // 라바콘 확성기: 세로 콘 + 넓은 바닥판
  traffic_cone_muzzle(a){ const {C,px,rect}=a;
    rect(4,1,9,3,C.orange);
    rect(6,2,5,2,C.ink); // 확성 구멍
    px(1,2,C.yellow); px(0,4,C.yellow); px(2,0,C.yellow); px(15,3,C.yellow); px(16,1,C.yellow); // 소리
    rect(5,4,7,6,C.orange);
    rect(4,10,9,8,C.orange);
    rect(3,18,11,5,C.white); px(4,19,'#fbfaf4'); px(11,21,C.whiteDk);
    rect(3,23,11,7,C.orange);
    rect(2,30,13,5,C.white); px(3,31,'#fbfaf4'); px(12,33,C.whiteDk);
    rect(2,35,13,9,C.orange);
    rect(1,44,15,6,C.orange);
    rect(5,5,2,12,C.orangeHi);
    rect(11,12,2,20,C.orangeDk);
    rect(1,52,45,8,'#e8742a');
    rect(2,52,43,2,C.orangeHi);
    rect(1,58,45,2,C.orangeDk);
    px(1,52,C.orangeDk); px(45,52,C.orangeDk);
  },

  // ───── H (양 기둥 + 중앙) 48×48 ─────

  // 문어 탄창: 가운데 머리 + 양쪽 다리 기둥
  octopus_mag(a){ const {C,px,rect,disc}=a;
    // 왼쪽 다리 2개
    disc(6,6,3.4,C.purple); disc(5,12,3.4,C.purple); disc(6,18,3.4,C.purple);
    disc(5,24,3.4,C.purple); disc(6,30,3.4,C.purple); disc(5,36,3.4,C.purple);
    disc(7,42,3.2,C.purple); disc(11,44,2.4,C.purple);
    disc(12,8,2.8,C.purple); disc(11,16,2.8,C.purple); disc(12,24,2.8,C.purple);
    disc(11,32,2.8,C.purple); disc(12,40,2.6,C.purple);
    // 오른쪽 다리 2개 (미러)
    disc(42,6,3.4,C.purple); disc(43,12,3.4,C.purple); disc(42,18,3.4,C.purple);
    disc(43,24,3.4,C.purple); disc(42,30,3.4,C.purple); disc(43,36,3.4,C.purple);
    disc(41,42,3.2,C.purple); disc(37,44,2.4,C.purple);
    disc(36,8,2.8,C.purple); disc(37,16,2.8,C.purple); disc(36,24,2.8,C.purple);
    disc(37,32,2.8,C.purple); disc(36,40,2.6,C.purple);
    // 빨판
    px(8,10,C.pink); px(7,22,C.pink); px(8,34,C.pink);
    px(40,10,C.pink); px(41,22,C.pink); px(40,34,C.pink);
    // 머리 (중앙 칸)
    disc(24,23,7,C.purple);
    disc(21,19,2.6,C.purpleHi);
    rect(20,28,8,3,C.purple);
    disc(21,23,2.1,C.white); disc(27,23,2.1,C.white);
    px(21,24,C.ink); px(27,24,C.ink);
    px(20,22,C.whiteHi); px(26,22,C.whiteHi);
    px(18,26,C.pink); px(30,26,C.pink);
    px(23,28,C.ink); px(24,28,C.ink); px(25,28,C.ink);
  },

  // 용가리 화석: 쌍 대퇴골 + 중앙 척추뼈
  dragon_bone(a){ const {C,px,rect,disc}=a;
    disc(6,7,3.4,C.bone); disc(11,7,3.4,C.bone);
    rect(5,10,6,28,C.bone); rect(6,11,1,26,'#f4ecd8');
    disc(6,41,3.4,C.bone); disc(11,41,3.4,C.bone);
    rect(9,14,1,20,C.boneDk);
    px(7,20,C.grey); px(6,27,C.grey);
    disc(37,7,3.4,C.bone); disc(42,7,3.4,C.bone);
    rect(37,10,6,28,C.bone); rect(38,11,1,26,'#f4ecd8');
    disc(37,41,3.4,C.bone); disc(42,41,3.4,C.bone);
    rect(41,14,1,20,C.boneDk);
    px(41,24,C.grey);
    disc(24,24,6,C.bone);
    disc(24,24,1.9,C.grey);
    rect(22,16,4,3,C.bone); rect(22,29,4,3,C.bone);
    rect(17,22,3,4,C.bone); rect(28,22,3,4,C.bone);
    px(21,20,'#f4ecd8'); px(26,28,C.boneDk);
  },

  // ───── bolt (십자+긴 꼬리) 48×64 — 고양이 레이저 포인터 ─────
  pointer_laser(a){ const {C,px,rect,disc,line,ring}=a;
    // 붉은 광선 버스트
    disc(24,8,3.2,C.red); px(23,7,'#ff9a8a'); px(24,8,'#ffd0c8');
    rect(23,1,2,4,C.red); px(23,0,'#ff6a5a');
    rect(2,23,12,2,C.red); px(2,23,'#ff6a5a'); px(3,24,'#ff9a8a');
    rect(34,23,12,2,C.red); px(45,23,'#ff6a5a'); px(44,24,'#ff9a8a');
    px(17,15,'#ff6a5a'); px(18,16,C.red); px(30,16,C.red); px(31,15,'#ff6a5a');
    px(17,31,'#ff6a5a'); px(30,31,C.red);
    // 펜 본체
    rect(22,15,4,4,C.metal); rect(21,18,6,2,C.metalHi);
    rect(20,20,8,24,'#3a3a36'); rect(21,21,1,22,'#55554e');
    rect(28,22,2,10,C.metal);
    rect(20,26,8,2,C.metal);
    disc(24,31,1.6,C.red);
    px(23,36,C.white); px(25,36,C.white); px(24,38,C.white); px(22,38,C.white); px(26,38,C.white); // 발자국
    rect(21,44,6,3,C.metal); rect(22,44,4,1,C.metalHi);
    line(24,47,22,57,C.grey,1);
    ring(23,60,1.5,3,C.grey);
  },

  // ───── boot — 바코드 스캐너 (그립+헤드) 48×48 ─────
  barcode_scanner(a){ const {C,px,rect,line}=a;
    const B='#b8402f', D='#8a2f24';
    rect(3,4,10,25,B); rect(4,5,1,23,'#d06048');
    for(let y=8;y<26;y+=4) rect(6,y,5,1,D);
    rect(13,14,3,6,D); // 방아쇠
    rect(2,29,30,15,B); rect(3,30,28,1,'#d06048');
    rect(32,18,13,26,B); rect(33,19,1,24,'#d06048');
    rect(34,18,9,3,C.black);
    rect(35,18,7,1,C.red); px(36,17,'#ff6a5a'); px(39,17,'#ff6a5a');
    rect(8,33,13,8,C.white);
    for(const x of [9,11,12,14,16,18,19]) rect(x,34,1,6,C.ink);
    px(6,20,C.yellow);
    px(4,45,'#2a2420'); px(6,46,'#2a2420'); px(8,45,'#2a2420'); px(10,46,'#2a2420');
  },

  // ───── hook — 주사기 총열 (꺾인 주사기) 48×48 ─────
  syringe_barrel(a){ const {C,px,rect,disc}=a;
    rect(2,1,12,3,C.white); rect(3,1,10,1,C.whiteHi);
    rect(6,4,4,6,C.white);
    rect(4,10,8,3,'#e05050');
    rect(3,13,10,20,C.glass); rect(4,14,1,18,'#d8f4ff');
    rect(5,17,6,15,C.slime); px(6,18,'#a8e890');
    for(let y=15;y<31;y+=4) px(12,y,C.ink);
    rect(13,35,6,6,C.metal); rect(14,36,1,4,C.metalHi);
    rect(19,37,20,2,C.metal);
    rect(37,20,3,19,C.metal); rect(38,21,1,17,C.metalHi);
    px(38,18,C.metal); px(38,17,C.metal);
    disc(38,15,1.6,C.slime); px(38,13,C.slime);
  },

  // ───── arch (∩자) — 고춧가루 방사기 80×48 ─────
  chili_flamethrower(a){ const {C,px,rect,disc,ring}=a;
    disc(20,7,4.4,'#c03828'); disc(60,7,4.4,'#c03828');
    rect(19,3,42,9,'#c03828');
    rect(21,4,38,2,'#e06848');
    disc(40,7,3.2,C.white); ring(40,7,3.2,4.2,C.darkMetal);
    px(40,6,C.red); px(41,7,C.red);
    rect(26,5,3,5,'#8a2418'); px(27,4,C.leaf); px(27,3,C.leafDk); // 고추 데칼
    disc(52,3,2.4,C.gold); px(52,3,C.goldDk); // 밸브
    rect(17,12,5,3,'#8a2418'); rect(58,12,5,3,'#8a2418');
    rect(4,17,8,17,'#8a2f24'); rect(5,18,1,15,'#c05038');
    rect(68,17,8,17,'#8a2f24'); rect(69,18,1,15,'#c05038');
    rect(2,34,12,5,C.darkMetal); rect(66,34,12,5,C.darkMetal);
    disc(8,43,3.8,C.orange); disc(8,44,2.2,C.yellow); px(5,41,C.red); px(11,40,C.red);
    disc(72,43,3.8,C.orange); disc(72,44,2.2,C.yellow); px(69,40,C.red); px(75,41,C.red);
  },

  // ───── snake (S자 관로) — 모기 다트총구 80×48 ─────
  mosquito_dart(a){ const {C,px,rect,disc,line}=a;
    line(8,8,24,8,C.slime,7); line(24,8,24,40,C.slime,7);
    line(24,40,56,40,C.slime,7); line(56,40,56,8,C.slime,7);
    line(56,8,71,8,C.slime,7);
    disc(24,8,4.5,'#68b850'); disc(24,24,4.5,'#8ae070'); disc(24,40,4.5,'#68b850');
    disc(40,40,4.5,'#8ae070'); disc(56,40,4.5,'#68b850'); disc(56,24,4.5,'#8ae070');
    disc(56,8,4.5,'#68b850');
    disc(8,8,5.5,C.slime);
    disc(6,7,2.2,C.red); disc(11,7,2.2,C.red);
    px(5,6,'#ff9a8a'); px(10,6,'#ff9a8a');
    rect(0,10,4,2,C.darkMetal); px(0,12,C.darkMetal); // 침
    px(6,3,C.leafDk); px(10,3,C.leafDk);
    rect(18,2,5,3,C.cyan); rect(26,2,5,3,C.cyan); px(19,2,C.cyanHi); px(27,2,C.cyanHi); // 날개
    px(21,13,C.ink); px(27,13,C.ink); px(21,45,C.ink); px(27,45,C.ink);
    px(53,13,C.ink); px(59,13,C.ink);
    line(74,7,78,9,C.darkMetal,2); px(79,9,C.ink); // 꽁무니 침
    px(22,20,C.leafDk); px(58,20,C.leafDk); px(38,37,C.leafDk); px(42,43,C.leafDk);
  },

  // ───── claw — 헤어드라이기 토치 48×48 ─────
  hairdryer_torch(a){ const {C,px,rect,disc}=a;
    disc(8,7,4.6,C.orange); disc(8,8,2.6,C.yellow);
    px(4,3,C.red); px(12,4,C.red); px(8,1,C.orangeHi); px(3,9,C.red);
    rect(3,15,10,5,'#6a4090');
    rect(12,14,23,11,C.purple);
    rect(14,15,19,2,C.purpleHi);
    rect(13,23,21,2,C.purpleDk);
    disc(40,13,5.6,'#6a4090');
    disc(40,13,3.8,'#3a2a50'); disc(40,13,1.6,'#6a4090');
    rect(29,24,4,2,C.red); // 스위치
    rect(35,25,9,6,'#6a4090');
    rect(37,31,8,6,'#6a4090');
    rect(39,37,8,8,'#6a4090');
    rect(36,26,1,4,C.purpleHi); rect(40,38,1,6,C.purpleHi);
    px(44,46,'#2a2420'); px(46,47,'#2a2420');
  },

  // ───── branch — 독개구리 탄창 64×48 ─────
  frog_poison_mag(a){ const {C,px,rect,disc,line}=a;
    rect(2,4,44,7,'#7a5a38');
    rect(3,5,42,1,'#9a7a50');
    for(let x=6;x<44;x+=7) rect(x,8,3,1,C.brownDk);
    disc(5,7,2,C.brownDk);
    disc(22,20,4,C.leaf); disc(27,24,4,C.green); disc(19,26,3,C.leaf);
    px(24,17,C.greenHi); px(21,23,C.leafDk);
    // 개구리 (주황 독개구리)
    line(40,12,38,19,'#e8853a',2); px(39,11,C.yellow); px(41,11,C.yellow); // 매달린 앞다리
    disc(40,26,6.5,'#e8853a');
    disc(37,21,3.4,'#e8853a');
    disc(35,19,1.9,C.white); disc(40,19,1.9,C.white);
    px(35,19,C.ink); px(40,19,C.ink);
    rect(36,23,4,1,C.ink);
    px(38,25,C.ink); px(42,24,C.ink); px(41,29,C.ink); px(36,28,C.ink); px(43,27,C.ink);
    line(38,32,36,42,'#e8853a',2); px(34,43,C.yellow); px(37,44,C.yellow);
    line(46,29,54,39,'#e8853a',2);
    disc(56,42,5.5,C.leaf);
    line(52,42,60,42,C.leafDk,1); line(56,39,56,45,C.leafDk,1);
    px(58,40,C.greenHi); px(53,44,C.leafDk);
  },

  // ───── wing — 아코디언 탄창 80×32 ─────
  accordion_mag(a){ const {C,px,rect}=a;
    // 끝판 (건반/버튼)
    rect(2,17,12,13,C.darkWood); rect(3,18,10,1,C.woodHi);
    rect(12,18,2,11,C.white);
    px(13,21,C.ink); px(13,24,C.ink); px(13,27,C.ink);
    rect(66,17,12,13,C.darkWood); rect(67,18,10,1,C.woodHi);
    px(68,20,C.white); px(71,20,C.white); px(74,20,C.white);
    px(68,24,C.white); px(71,24,C.white); px(74,24,C.white);
    // 벨로우즈: 두 봉우리 지그재그
    const top=(x)=>{
      if(x<24) return 18-Math.round((x-14)*1.4);
      if(x<40) return 4+Math.round((x-24)*0.9);
      if(x<56) return 18-Math.round((x-40)*0.9);
      return 4+Math.round((x-56)*1.4);
    };
    const cols=['#c04038','#8a2030','#e06050'];
    for(let x=14;x<66;x++){
      const t=Math.max(2,Math.min(18,top(x)));
      rect(x,t,1,30-t,cols[Math.floor((x-14)/3)%3]);
      px(x,t,C.gold);
    }
    rect(14,29,52,1,'#701822');
  },

  // ───── Z — 선인장 개머리판 48×48 ─────
  cactus_stock(a){ const {C,px,rect,disc}=a;
    // 화분
    rect(34,33,14,4,'#d47848');
    rect(35,37,12,9,'#c06840'); rect(36,38,1,7,'#e0906a');
    rect(36,34,10,2,'#5a4028');
    // 줄기·팔
    rect(37,18,8,16,C.green);
    rect(24,22,14,7,C.green);
    rect(24,6,7,17,C.green);
    rect(8,4,18,7,C.green);
    rect(38,19,1,14,C.greenHi); rect(43,19,1,14,C.leafDk);
    rect(25,7,1,15,C.greenHi); rect(30,8,1,14,C.leafDk);
    rect(9,5,16,1,C.greenHi); rect(9,10,16,1,C.leafDk);
    // 꽃
    disc(5,7,3.4,C.pink); px(5,7,C.yellow); px(3,5,C.pinkHi);
    // 가시
    px(40,21,C.white); px(42,26,C.white); px(39,30,C.white);
    px(27,10,C.white); px(29,17,C.white); px(26,20,C.white);
    px(13,6,C.white); px(19,8,C.white); px(28,25,C.white); px(33,24,C.white);
  },

  // ───── blob — 껌딱지 발사기 48×48 ─────
  gum_blaster(a){ const {C,px,rect,disc,line}=a;
    disc(24,24,13,C.pink);
    disc(24,9,6,C.pink); disc(8,24,6,C.pink); disc(40,24,6,C.pink);
    disc(9,40,5,C.pink); disc(39,40,5,C.pink); disc(24,40,6.5,C.pink);
    disc(20,19,3.4,C.pinkHi); disc(10,22,2.4,C.pinkHi);
    disc(30,12,4.6,C.pinkHi); px(28,10,C.whiteHi); px(29,11,C.whiteHi); // 풍선
    disc(28,32,5,C.pinkDk); disc(14,33,3.4,C.pinkDk);
    line(13,36,10,43,C.pinkDk,1); line(35,35,39,43,C.pinkDk,1);
    px(6,43,C.pinkDk); px(42,44,C.pinkDk); px(24,45,C.pinkDk);
    px(38,21,C.pinkHi); px(24,6,C.pinkHi);
  },

  // ───── spiral — 꿀단지 노즐 48×64 ─────
  honey_nozzle(a){ const {C,px,rect,disc,line}=a;
    const B='#e8a820', H='#f8cc50', D='#b8780c';
    rect(22,1,3,9,C.wood); rect(22,1,1,9,C.woodHi); // 디퍼 자루
    rect(19,9,9,6,'#c9a060');
    rect(19,10,9,1,C.brownDk); rect(19,12,9,1,C.brownDk); rect(19,14,9,1,C.brownDk);
    line(29,12,40,10,B,5);
    line(40,10,40,40,B,6);
    line(40,40,8,40,B,6);
    line(8,40,8,22,B,6);
    disc(8,20,3.4,B);
    line(8,43,8,56,B,4);
    disc(8,59,2.6,B); px(8,62,B);
    // 하이라이트·기포
    line(38,12,38,38,H,1); line(36,38,12,38,H,1); line(6,36,6,24,H,1);
    px(40,20,H); px(24,42,H); px(8,50,H);
    px(42,30,D); px(20,42,D); px(10,28,D);
  },

  // ───── fork3 — 전기파리채 총구 80×32 ─────
  taser_prong(a){ const {C,px,rect}=a;
    rect(2,19,76,9,'#e8c040');
    rect(3,20,74,1,C.yellowHi);
    for(let x=6;x<76;x+=4) px(x,24,'#b8901c');
    rect(2,27,76,1,'#b8901c');
    // 프롱 위쪽(d=0)은 총에 꽂히는 장착 소켓, 방전은 바 바깥쪽(전방)으로
    for(const cx of [5,37,69]){
      rect(cx,2,6,18,C.metal); rect(cx+1,3,1,16,C.metalHi);
      rect(cx-1,2,8,3,C.darkMetal);
    }
    px(24,12,C.cyan); px(56,11,C.cyan); // 프롱 사이 스파크
    for(const cx of [8,40,72]){ px(cx-2,29,C.cyan); px(cx,30,C.cyanHi); px(cx+2,29,C.cyan); } // 전방 방전
    px(38,22,C.ink); px(39,23,C.ink); px(40,24,C.ink); px(41,25,C.ink); // 번개 각인
  },

  // ───── crown 모양 — 가라앉은 왕관 80×32 ─────
  sunken_crown(a){ const {C,px,rect,disc,line}=a;
    rect(2,18,76,10,C.gold);
    rect(3,19,74,1,C.goldHi); rect(2,27,76,1,C.goldDk);
    disc(16,23,2.2,C.red); disc(40,23,2.2,C.cyan); disc(64,23,2.2,C.red);
    for(const cx of [8,40,72]){
      rect(cx-2,12,5,6,C.gold);
      rect(cx-1,7,3,5,C.gold);
      rect(cx,4,1,3,C.gold); px(cx-1,5,C.gold); px(cx+1,5,C.gold);
      disc(cx,3,1.8,C.white); px(cx-1,2,C.whiteHi);
      rect(cx-2,12,1,6,C.goldHi);
    }
    line(20,17,26,27,C.leaf,2); line(57,19,51,27,C.leaf,2); // 해초
    px(30,19,C.whiteDk); px(31,20,C.white); px(32,19,C.whiteDk); // 따개비
    px(69,26,C.whiteDk); px(70,25,C.white);
    px(12,8,C.cyanHi); px(60,5,C.cyanHi); px(45,11,C.cyanHi); // 기포
  },

  // ───── tentacle — 박쥐 송곳니 총구 32×80 ─────
  bat_fang(a){ const {C,px,rect}=a;
    rect(2,2,12,6,'#8a3040'); rect(3,2,10,2,'#a84858');
    rect(3,8,11,12,C.bone);
    rect(4,20,9,14,C.bone);
    rect(5,34,7,14,C.bone);
    rect(6,48,5,12,C.bone);
    rect(7,60,3,10,C.bone);
    rect(8,70,2,6,C.bone); px(8,76,C.bone); px(8,77,C.boneDk);
    rect(4,9,1,10,'#f4ecd8'); rect(5,20,1,12,'#f4ecd8');
    rect(12,10,1,9,C.boneDk); rect(11,22,1,11,C.boneDk); rect(10,36,1,11,C.boneDk);
    px(5,12,C.whiteHi); px(5,13,C.whiteHi);
    rect(18,17,10,4,'#8a3040'); px(19,17,'#a84858');
    rect(19,21,8,6,C.bone); rect(21,27,5,3,C.bone); px(22,30,C.boneDk);
    rect(20,22,1,4,'#f4ecd8');
    rect(18,49,10,4,'#8a3040'); px(19,49,'#a84858');
    rect(19,53,8,6,C.bone); rect(21,59,4,3,C.bone); px(22,62,C.boneDk);
    rect(20,54,1,4,'#f4ecd8');
  },

  // ───── zigzag8 — 고철 지네 탄띠 80×64 ─────
  scrap_centipede(a){ const {C,px,rect,disc,line}=a;
    const segs=[[8,8],[24,8],[24,24],[40,24],[40,40],[56,40],[56,56],[72,56]];
    for(let i=0;i<segs.length-1;i++)
      line(segs[i][0],segs[i][1],segs[i+1][0],segs[i+1][1],'#8a4a1c',4);
    for(let i=1;i<segs.length;i++){
      const [x,y]=segs[i];
      disc(x,y,6,i%2?'#c87838':'#a0a8b0');
      rect(x-6,y-1,12,2,'#8a4a1c');
      px(x-3,y-3,C.metalHi); px(x+2,y+2,'#6a3a14');
      px(x-4,y+7,C.ink); px(x+4,y+7,C.ink); // 다리
    }
    // 머리
    disc(8,8,6.2,'#b05a20');
    disc(9,6,2.2,'#d47838');
    px(5,7,C.red); px(6,7,'#ff6a5a'); px(10,7,C.red); px(11,7,'#ff6a5a');
    px(3,12,C.darkMetal); px(2,13,C.darkMetal); px(13,12,C.darkMetal); px(14,13,C.darkMetal);
    line(5,3,3,0,C.ink,1); line(11,3,13,0,C.ink,1);
    line(74,58,78,62,C.darkMetal,2); px(79,63,C.ink); // 꼬리 침
  },

  // ───── xdiag — 심연의 눈알 48×48 ─────
  abyss_eye(a){ const {C,px,rect,disc,ring}=a;
    // 대각 촉수
    disc(16,16,3,'#3a2a50'); disc(11,11,2.7,'#3a2a50'); disc(7,7,2.3,'#3a2a50'); disc(4,4,1.8,'#3a2a50');
    disc(32,16,3,'#3a2a50'); disc(37,11,2.7,'#3a2a50'); disc(41,7,2.3,'#3a2a50'); disc(44,4,1.8,'#3a2a50');
    disc(16,32,3,'#3a2a50'); disc(11,37,2.7,'#3a2a50'); disc(7,41,2.3,'#3a2a50'); disc(4,44,1.8,'#3a2a50');
    disc(32,32,3,'#3a2a50'); disc(37,37,2.7,'#3a2a50'); disc(41,41,2.3,'#3a2a50'); disc(44,44,1.8,'#3a2a50');
    px(5,5,C.purpleHi); px(43,5,C.purpleHi); px(5,43,C.purpleHi); px(43,43,C.purpleHi);
    // 눈
    ring(24,24,6.8,7.8,'#b06ae0');
    disc(24,24,7,'#2a1a3a');
    disc(24,24,4.9,C.purple);
    rect(23,19,2,10,C.ink);
    px(19,21,C.red); px(20,27,C.red); px(29,22,C.red);
    px(21,20,C.whiteHi); px(20,21,C.white);
  },

  // ───── twinTent — 크라켄 촉수 그립 48×64 ─────
  kraken_grip(a){ const {C,px,rect,disc}=a;
    // 왼쪽 촉수
    rect(3,20,10,15,C.purple);
    rect(4,10,8,10,C.purple);
    rect(5,4,6,7,C.purple);
    disc(9,3,3,C.purple); px(12,2,C.purple); px(13,3,C.purple);
    rect(4,11,1,20,C.purpleHi);
    disc(11,9,1.3,'#c98ad0'); disc(11,15,1.3,'#c98ad0'); disc(12,21,1.3,'#c98ad0'); disc(12,27,1.3,'#c98ad0');
    // 오른쪽 촉수
    rect(35,20,10,15,C.purple);
    rect(36,10,8,10,C.purple);
    rect(37,4,6,7,C.purple);
    disc(39,3,3,C.purple); px(35,2,C.purple); px(34,3,C.purple);
    rect(43,11,1,20,C.purpleDk);
    disc(36,9,1.3,'#c98ad0'); disc(36,15,1.3,'#c98ad0'); disc(35,21,1.3,'#c98ad0'); disc(35,27,1.3,'#c98ad0');
    // 몸통(물결)
    disc(8,34,3.4,C.purpleDk); disc(16,33,3.8,C.purpleDk); disc(24,34,3.4,C.purpleDk);
    disc(32,33,3.8,C.purpleDk); disc(40,34,3.4,C.purpleDk);
    rect(2,34,44,13,C.purpleDk);
    px(6,32,C.cyanHi); px(20,31,C.cyanHi); px(36,31,C.cyanHi);
    disc(24,40,3,C.yellow); rect(24,38,1,5,C.ink); // 눈
    // 가운데 늘어진 촉수 끝
    rect(21,47,6,7,C.purple); rect(22,54,4,5,C.purple); rect(23,59,2,3,C.purple);
    disc(25,50,1.3,'#c98ad0'); px(22,48,C.purpleHi);
  },

  // ───── ringBig — 블랙홀 드럼 64×48 ─────
  blackhole_drum(a){ const {C,px,rect,frame,line}=a;
    const bands=['#141026','#141026','#201636','#3a2a50','#3a2a50','#5f3a80','#5f3a80','#8a5ab0','#8a5ab0','#a06ac0','#5ad0e8','#5ad0e8','#a0e8f8','#c8f4ff','#f0fcff','#ffffff'];
    for(let t=0;t<16;t++) frame(t,t,64-2*t,48-2*t,bands[t]);
    px(6,4,C.white); px(40,3,C.white); px(57,8,C.whiteHi); px(10,42,C.white); px(52,44,C.whiteHi); px(26,2,C.whiteHi);
    line(50,10,55,5,C.whiteHi,1); px(56,4,C.white); // 빨려드는 별
    line(12,38,8,42,'#a0e8f8',1);
  },

  // ───── worm — 공룡 등뼈 총열 48×80 ─────
  dino_spine(a){ const {C,px,rect,disc,line}=a;
    const seg=[[8,8],[24,8],[40,8],[40,24],[40,40],[24,40],[8,40],[8,56],[8,72]];
    for(let i=0;i<seg.length-1;i++)
      line(seg[i][0],seg[i][1],seg[i+1][0],seg[i+1][1],C.bone,5);
    // 가시 (바깥 곡선 방향)
    for(const cx of [8,24,40]){ rect(cx-1,1,3,4,C.bone); px(cx,0,C.boneDk); }
    rect(44,22,4,3,C.bone); px(47,23,C.boneDk);
    rect(44,38,3,3,C.bone);
    rect(1,54,4,3,C.bone); px(0,55,C.boneDk);
    rect(1,70,4,3,C.bone);
    for(const [x,y] of seg){
      disc(x,y,5.4,C.bone);
      disc(x,y,1.6,C.boneDk);
      px(x-3,y-3,'#f4ecd8');
    }
    px(24,10,C.grey); px(40,26,C.grey); px(8,58,C.grey);
    rect(6,76,5,3,C.boneDk); // 꼬리 끝
  },

  // ───── crab 모양 — 폭죽 클러스터 노즐 64×48 ─────
  firework_cluster(a){ const {C,px,rect,line}=a;
    // 몸통 4발
    const R=[['#c94a3a','#e06858'],['#4a8ac0','#6aa8d8'],['#5a9a4a','#78c060'],['#8a5ab0','#a06ac0']];
    const xs=[3,19,35,51];
    for(let i=0;i<4;i++){
      rect(xs[i],17,10,14,R[i][0]);
      rect(xs[i]+1,18,1,12,R[i][1]);
      rect(xs[i],22,10,2,C.white);
      px(xs[i]+4,26,C.whiteHi); px(xs[i]+7,19,C.whiteHi);
    }
    // 양끝 로켓 원뿔 (위 칸)
    rect(4,11,8,6,'#e8c040'); rect(5,7,6,4,'#e8c040'); rect(6,3,4,4,'#e8c040'); px(7,1,C.gold); px(8,1,C.gold); px(7,2,C.gold); px(8,2,C.gold);
    rect(52,11,8,6,'#e8c040'); rect(53,7,6,4,'#e8c040'); rect(54,3,4,4,'#e8c040'); px(55,1,C.gold); px(56,1,C.gold); px(55,2,C.gold); px(56,2,C.gold);
    px(5,12,C.goldHi); px(53,12,C.goldHi);
    // 가운데 로켓 팁(칸 안에서 납작하게)
    rect(21,17,6,2,C.goldDk); rect(37,17,6,2,C.goldDk);
    // 묶음 밴드 + 막대·심지
    rect(17,33,30,6,'#c9a060'); rect(18,34,28,1,'#e0c088');
    rect(20,35,6,3,C.red); px(22,36,C.white);
    rect(23,39,2,8,C.wood); rect(39,39,2,8,C.wood);
    line(28,39,32,45,C.grey,1);
    px(33,45,C.yellow); px(34,44,C.orange); px(32,46,C.orange); px(34,46,C.yellowHi);
  },
};

// ---- 모양 채움 아트: 캔버스 생성 (인벤토리 표시·총 합성 공용) ----
function shapeArtCanvas(def, cells, cs, rot, side){
  rot = ((rot||0)%4+4)%4;
  const [sw,sh] = shapeSize(cells);
  const cn = document.createElement('canvas');
  cn.width = sw*cs; cn.height = sh*cs;
  const g = cn.getContext('2d');
  g.imageSmoothingEnabled = false;
  const path = new Path2D(outlinePathD(cells, cs));
  g.save();
  g.clip(path, 'evenodd');
  const authored = itemArtCanvas(def, rot, side);
  if(authored){
    g.drawImage(authored, 0, 0, cn.width, cn.height);
  } else {
    _genericArtInto(g, def, sw, sh, cs, rot, side);
  }
  g.restore();
  return cn;
}

// ---- 모양 채움 아트 URL (inventory.js buildShapeEl에서 사용) ----
const _shapeArtCache = new Map();
function shapeArtURL(def, cells, cs, rot, side){
  rot = ((rot||0)%4+4)%4;
  const key = def.id + ':' + cs + ':' + rot + ':' + (side||'') + ':' + cells.map(c=>c[0]+'.'+c[1]).join(',');
  if(_shapeArtCache.has(key)) return _shapeArtCache.get(key);
  const url = shapeArtCanvas(def, cells, cs, rot, side).toDataURL();
  if(_shapeArtCache.size > 400) _shapeArtCache.clear();
  _shapeArtCache.set(key, url);
  return url;
}

// ============================================================
// 인게임 총 스프라이트 — 몸통+부착물 실제 아트를 축소 합성하고
// 회전(5° 단위)·상하반전 변형을 캐시. drawGunWorld(gun.js)에서 사용.
// ============================================================
const GUN_COMP_CELL = 8;   // 합성 해상도 (칸당 px) — 월드 셀 7.5px와 거의 1:1
const GUN_ANG_STEPS = 72;  // 회전 캐시 단계 (5°)
const _gunCompCache = new Map();
const _gunSpriteCache = new Map();

function _gunSig(gun){
  return gun.body.def.id + '|' +
    gun.atts.map(m=>m.inst.def.id+':'+m.side+':'+m.idx+':'+(m.rot||0)).sort().join('|');
}

// 몸통 격자 기준 합성 (부착물은 벤치와 동일한 footprint 배치)
// 반환: {cn, ax, ay} — (ax,ay)는 몸통 왼쪽-세로중앙 앵커의 캔버스 좌표
function gunCompositeCanvas(gun, flip){
  const key = _gunSig(gun) + (flip?':f':'');
  if(_gunCompCache.has(key)) return _gunCompCache.get(key);
  const bd = gun.body.def;
  const C = GUN_COMP_CELL;
  const parts = [];
  let minX=0, minY=0, maxX=bd.bw, maxY=bd.bh;
  for(const m of gun.atts){
    const ad = m.inst.def;
    const local = mountLocalCells(shapeOf(ad, m.rot||0), m.side);
    const lw = Math.max(...local.map(c=>c[0]))+1, lh = Math.max(...local.map(c=>c[1]))+1;
    let ox, oy;
    if(m.side==='top'){ ox=m.idx; oy=-lh; }
    else if(m.side==='bottom'){ ox=m.idx; oy=bd.bh; }
    else if(m.side==='front'){ ox=bd.bw; oy=m.idx; }
    else { ox=-lw; oy=m.idx; }
    parts.push({ad, local, rot:m.rot||0, side:m.side, ox, oy});
    minX=Math.min(minX,ox); minY=Math.min(minY,oy);
    maxX=Math.max(maxX,ox+lw); maxY=Math.max(maxY,oy+lh);
  }
  const cn = document.createElement('canvas');
  cn.width=(maxX-minX)*C; cn.height=(maxY-minY)*C;
  const g = cn.getContext('2d');
  g.imageSmoothingEnabled = false;
  for(const p of parts){
    const art = shapeArtCanvas(p.ad, p.local, ART_CELL, p.rot, p.side);
    g.drawImage(art, (p.ox-minX)*C, (p.oy-minY)*C,
      art.width/ART_CELL*C, art.height/ART_CELL*C);
  }
  // 몸통 (부착물 뒤가 아니라 위에 — 칸이 겹치진 않지만 generic 오버스캔 침범 방지)
  g.save();
  g.translate((0-minX)*C, (0-minY)*C);
  _genericArtInto(g, bd, bd.bw, bd.bh, C, 0, null);
  g.restore();
  _outlineArt(cn);
  let out = cn, ay = (bd.bh/2-minY)*C;
  if(flip){ out = _flipVCanvas(cn); ay = cn.height - ay; }
  const res = { cn: out, ax: (0-minX)*C, ay };
  if(_gunCompCache.size > 60) _gunCompCache.clear();
  _gunCompCache.set(key, res);
  return res;
}

// 회전 스프라이트 (최근접 샘플링 — AA 없는 도트 회전)
// 반환: {cn, ax, ay} — (ax,ay)는 앵커의 회전 캔버스 좌표
function gunWorldSprite(gun, totAng, flip, scale){
  const step = 2*Math.PI/GUN_ANG_STEPS;
  const b = Math.round((((totAng%(2*Math.PI))+2*Math.PI)%(2*Math.PI))/step) % GUN_ANG_STEPS;
  const key = _gunSig(gun) + (flip?':f:':':n:') + b + ':' + scale;
  if(_gunSpriteCache.has(key)) return _gunSpriteCache.get(key);
  const comp = gunCompositeCanvas(gun, flip);
  const th = b*step, ct = Math.cos(th), st = Math.sin(th);
  const w0 = comp.cn.width, h0 = comp.cn.height;
  const W = Math.ceil((Math.abs(w0*ct)+Math.abs(h0*st))*scale)+2;
  const H = Math.ceil((Math.abs(w0*st)+Math.abs(h0*ct))*scale)+2;
  const src = comp.cn.getContext('2d').getImageData(0,0,w0,h0);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const og = out.getContext('2d');
  const dst = og.createImageData(W,H);
  const s32 = new Uint32Array(src.data.buffer), d32 = new Uint32Array(dst.data.buffer);
  for(let iy=0;iy<H;iy++) for(let ix=0;ix<W;ix++){
    const dx = ix+0.5-W/2, dy = iy+0.5-H/2;
    const sx = Math.floor(( dx*ct + dy*st)/scale + w0/2);
    const sy = Math.floor((-dx*st + dy*ct)/scale + h0/2);
    if(sx<0||sy<0||sx>=w0||sy>=h0) continue;
    d32[iy*W+ix] = s32[sy*w0+sx];
  }
  og.putImageData(dst,0,0);
  const axc = (comp.ax - w0/2)*scale, ayc = (comp.ay - h0/2)*scale;
  const res = { cn: out, ax: W/2 + axc*ct - ayc*st, ay: H/2 + axc*st + ayc*ct };
  if(_gunSpriteCache.size > 720) _gunSpriteCache.clear();
  _gunSpriteCache.set(key, res);
  return res;
}
