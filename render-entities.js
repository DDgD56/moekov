// ============================================================
// MoeKov — 렌더 엔티티 (스프라이트·픽셀폰트·플레이어/적 드로우)
// ============================================================

// ---- 픽셀 드로우 헬퍼 (주인공 도트 톤과 통일) ----
// 원·타원을 fillRect 스캔라인으로 찍어 저해상도에서도 또렷한 도트가 되게 한다.
function pBlob(cx, cy, r, color){
  cx = Math.round(cx); cy = Math.round(cy);
  r = Math.max(1, Math.round(r));
  ctx.fillStyle = color;
  for(let dy=-r; dy<=r; dy++){
    const w = Math.floor(Math.sqrt(r*r - dy*dy) + 0.5);
    if(w>=0) ctx.fillRect(cx-w, cy+dy, w*2+1, 1);
  }
}
function pOval(cx, cy, rx, ry, color){
  cx = Math.round(cx); cy = Math.round(cy);
  rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
  ctx.fillStyle = color;
  for(let dy=-ry; dy<=ry; dy++){
    const t = 1 - (dy*dy)/(ry*ry);
    if(t<0) continue;
    const w = Math.floor(rx * Math.sqrt(t) + 0.5);
    ctx.fillRect(cx-w, cy+dy, w*2+1, 1);
  }
}
function pRect(x, y, w, h, color){
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}
// 1px 도트 외곽 박스 (하이라이트용)
function pBox(x, y, w, h, color){
  x=Math.round(x); y=Math.round(y); w=Math.round(w); h=Math.round(h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y+h-1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x+w-1, y, 1, h);
}

// 색 계열에서 어두운 그림자색 생성 (음영은 1단계만)
function shade(hex, f){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.round(r*f); g=Math.round(g*f); b=Math.round(b*f);
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}

// ============================================================
// 3x5 픽셀 비트맵 폰트 (숫자 + 몇몇 기호) — 도트 톤 UI 텍스트용
// ============================================================
const PFONT = {
  '0':["111","101","101","101","111"], '1':["010","110","010","010","111"],
  '2':["111","001","111","100","111"], '3':["111","001","111","001","111"],
  '4':["101","101","111","001","001"], '5':["111","100","111","001","111"],
  '6':["111","100","111","101","111"], '7':["111","001","010","010","010"],
  '8':["111","101","111","101","111"], '9':["111","101","111","001","111"],
  '/':["001","001","010","100","100"], '.':["000","000","000","000","010"],
  '+':["000","010","111","010","000"], '-':["000","000","111","000","000"],
  '!':["1","1","1","0","1"], 'm':["00000","11010","10101","10101","10101"],
  ' ':["00","00","00","00","00"],
};
// 픽셀 폰트로 문자열 그리기 (cx=중앙 정렬 기준). s=픽셀 크기(월드px)
function pText(txt, cx, cy, s, color, outline){
  txt = String(txt);
  let tw = 0;
  for(const ch of txt){ const g=PFONT[ch]||PFONT['0']; tw += g[0].length+1; }
  tw -= 1;
  let x = cx - tw*s/2;
  const oc = outline || '#20161a';
  for(const ch of txt){
    const g = PFONT[ch]||PFONT['0'];
    const gw = g[0].length;
    for(let ry=0; ry<g.length; ry++) for(let rx=0; rx<gw; rx++){
      if(g[ry][rx]==='1'){
        // 외곽선(4방향) → 선명한 도트 느낌
        ctx.fillStyle = oc;
        ctx.fillRect(Math.round(x+rx*s-s*0.35), Math.round(cy+ry*s), Math.ceil(s+s*0.7), Math.ceil(s));
        ctx.fillRect(Math.round(x+rx*s), Math.round(cy+ry*s-s*0.35), Math.ceil(s), Math.ceil(s+s*0.7));
      }
    }
    for(let ry=0; ry<g.length; ry++) for(let rx=0; rx<gw; rx++){
      if(g[ry][rx]==='1'){
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x+rx*s), Math.round(cy+ry*s), Math.ceil(s), Math.ceil(s));
      }
    }
    x += (gw+1)*s;
  }
}

// ============================================================
// 미소녀 픽셀아트 스프라이트 — 명시적 픽셀맵 (앞모습 살짝 3/4)
// 16w x 20h 그리드. 문자 = 팔레트 키. 큰 애니 눈 + 검은 외곽선.
// 색: O=외곽선 K=머리 k=머리그림자 S=피부 s=피부그림자
//     C=옷 c=옷그림자 E=눈(홍채) W=흰자/하이라이트 P=볼/입 A=악세서리
// ============================================================
// 눈: 위쪽 외곽선(O)+흰 반사광(W) / 가운데 홍채(E) / 아래 흰자(W) → 반짝이는 애니 눈
// 사용자 디자인 반영: M자 앞머리, 속눈썹, 통짜 몸통 + 손
// O=외곽선 K=머리 w=머리광택 S=피부 s=피부그림자 L=속눈썹(진한선)
// E=홍채 W=하이라이트 P=볼 M=입 C=옷 c=옷그림자 H=손(피부)
// ⚠️ 스프라이트 모양·색은 sprite.js 파일에서 편집하세요!
//    (GIRL_SPRITE / GIRL_W / GIRL_H / GIRL_COLORS 는 sprite.js 에 정의됨)
function tint(hex, f){ // 밝게 (하이라이트용)
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.min(255,Math.round(r+(255-r)*f)); g=Math.min(255,Math.round(g+(255-g)*f)); b=Math.min(255,Math.round(b+(255-b)*f));
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
function girlColorMap(pal, hit){
  if(hit) return { O:'#fff', K:'#fff', k:'#fff', w:'#fff', S:'#fff', s:'#eee', C:'#fff', c:'#eee',
                   E:'#ccc', W:'#fff', L:'#fff', H:'#fff', P:'#fff', M:'#fff', A:'#fff', '.':null };
  const cm = GIRL_COLORS(pal, shade, tint); // sprite.js 의 색 정의
  cm['.'] = null;
  return cm;
}

// 캐시된 스프라이트 캔버스 (팔레트별) — 매 프레임 픽셀 다시 안 찍게
const _girlCache = new Map();
function girlCanvas(pal, hit){
  const key = (hit?'H':'') + pal.hair+pal.skin+pal.outfit+pal.eye+(pal.acc||'')+(pal.accRow||'');
  if(_girlCache.has(key)) return _girlCache.get(key);
  const cm = girlColorMap(pal, hit);
  const cn = document.createElement('canvas');
  cn.width=GIRL_W; cn.height=GIRL_H;
  const g = cn.getContext('2d');
  for(let y=0;y<GIRL_H;y++){
    const row = GIRL_SPRITE[y];
    for(let x=0;x<GIRL_W;x++){
      const c = cm[row[x]];
      if(c){ g.fillStyle=c; g.fillRect(x,y,1,1); }
    }
  }
  // 악세서리 (리본/모자/핀) — 스프라이트 위에 오버레이
  if(pal.acc && !hit){
    g.fillStyle = pal.acc;
    if(pal.accType==='ribbon'){ // 오른쪽 리본
      g.fillRect(11,2,3,2); g.fillRect(13,1,2,4); g.fillStyle=shade(pal.acc,0.7); g.fillRect(11,3,2,1);
    } else if(pal.accType==='cap'){ // 모자챙
      g.fillStyle='#20161a'; g.fillRect(3,1,10,1);
      g.fillStyle=pal.acc; g.fillRect(4,0,8,2); g.fillRect(3,2,3,1);
    } else { // 머리핀
      g.fillRect(5,2,2,1); g.fillRect(9,2,2,1);
    }
  }
  if(_girlCache.size>60) _girlCache.clear();
  _girlCache.set(key, cn);
  return cn;
}

function drawGirl(sx, sy, r, pal, faceDir, hit, elite, opt){
  opt = opt || {};
  const scale = r/7;              // 스프라이트 픽셀 → 월드 크기
  const dw = GIRL_W*scale, dh = GIRL_H*scale;
  const bob = (opt.bob||0)*scale;
  ctx.save();
  ctx.translate(sx, sy);
  // 그림자 / 엘리트 후광 (도트)
  pOval(0, dh*0.42, dw*0.4, Math.max(2, dh*0.09), 'rgba(0,0,0,.28)');
  if(elite) pBlob(0, -dh*0.05, Math.round(r*1.4), 'rgba(255,210,80,.25)');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(faceDir, 1);          // 좌우 반전만
  const cn = girlCanvas(pal, hit);
  // 스프라이트 중심을 발밑 기준으로 배치 (bob 반영)
  ctx.drawImage(cn, -dw/2, -dh*0.62 - bob, dw, dh);
  ctx.restore();
}

// ---- 팔레트 정의 (색 최소화: 머리/피부/옷/눈/악세) ----
// 기본 = 뒷동산(meadow). 공장·습지는 REGION_ENEMY_PALS 로 덮어씀.
const GIRL_PALS = {
  zduck:   { hair:'#7ea86a', skin:'#b8cf9a', outfit:'#6a8a5a', acc:null },
  fastduck:{ hair:'#c9524a', skin:'#f0c4a8', outfit:'#b05a5a', acc:'#ff6a5a', accType:'ribbon' },
  bigduck: { hair:'#5a6a9a', skin:'#e8c4a4', outfit:'#5a6a8a', acc:null },
  spitter: { hair:'#9a5ab0', skin:'#f0c8b0', outfit:'#8a5aa0', acc:'#d090e8', accType:'pin' },
  sniper:  { hair:'#3a8a9a', skin:'#eac4a8', outfit:'#3a7a8a', acc:'#5ad0e0', accType:'cap' },
  gunner:  { hair:'#b09040', skin:'#eac4a8', outfit:'#7a6a3a', acc:'#d0b050', accType:'cap' },
  bomber:  { hair:'#c94a3a', skin:'#f0c0a0', outfit:'#b03a3a', acc:'#ff9040', accType:'ribbon' },
  golden:  { hair:'#f0d860', skin:'#f4d4b0', outfit:'#d4a832', acc:'#ffe880', accType:'ribbon' },
  hillchief:{ hair:'#3a6a28', skin:'#c8d8a0', outfit:'#4a8a3a', acc:'#6aba40', accType:'pin' },
  kingduck:{ hair:'#ffe070', skin:'#f4d4b0', outfit:'#e0b83a', acc:'#ffd24a', accType:'cap' },
  mirequeen:{ hair:'#e0c850', skin:'#d8c090', outfit:'#c9a030', acc:'#a070d0', accType:'ribbon' },
};
// 지역 바리에이션 (같은 타입 id, 다른 색·악세)
// factory: 잿빛·안전모·기름때 / marsh: 이끼·진흙·황금 물기
const REGION_ENEMY_PALS = {
  factory: {
    zduck:   { hair:'#6a7a68', skin:'#a0b0a0', outfit:'#5a5e58', acc:'#c9a040', accType:'cap', eye:'#4a3020' }, // 작업복 좀비
    fastduck:{ hair:'#a04040', skin:'#d0b0a0', outfit:'#6a4848', acc:'#ff7040', accType:'ribbon', eye:'#5a2018' },
    bigduck: { hair:'#4a5568', skin:'#c8b8a8', outfit:'#4a5058', acc:'#8a9098', accType:'cap', eye:'#2a2830' }, // 철판 거구
    spitter: { hair:'#7a6a8a', skin:'#d0c0b0', outfit:'#5a4a62', acc:'#b080e0', accType:'pin', eye:'#3a2040' }, // 폐액 독
    sniper:  { hair:'#3a5a62', skin:'#c8b8a8', outfit:'#3a4848', acc:'#70c0c8', accType:'cap', eye:'#1a3040' }, // 경비 저격
    gunner:  { hair:'#8a7a50', skin:'#d0b8a0', outfit:'#5a5840', acc:'#c0a040', accType:'cap', eye:'#3a3020' }, // 공장 경비
    bomber:  { hair:'#a84838', skin:'#d0a898', outfit:'#6a3838', acc:'#ff8030', accType:'ribbon', eye:'#4a1810' }, // 유폭 작업자
    golden:  { hair:'#d0c070', skin:'#e0d0b0', outfit:'#a89850', acc:'#e8d060', accType:'cap', eye:'#4a4020' }, // 도금 부품
  },
  marsh: {
    zduck:   { hair:'#4a6a38', skin:'#90a870', outfit:'#3a5040', acc:'#6aba50', accType:'pin', eye:'#2a4020' }, // 이끼 좀비
    fastduck:{ hair:'#8a4038', skin:'#c8b090', outfit:'#5a4038', acc:'#c07040', accType:'ribbon', eye:'#3a2818' }, // 진흙 광란
    bigduck: { hair:'#3a5a48', skin:'#b8c0a0', outfit:'#2a4840', acc:'#80a060', accType:'pin', eye:'#1a3028' }, // 늪 거구
    spitter: { hair:'#6a4890', skin:'#c8d0a8', outfit:'#4a3860', acc:'#90e070', accType:'pin', eye:'#302050' }, // 독개구리빛
    sniper:  { hair:'#2a6a5a', skin:'#c0c8a8', outfit:'#2a4840', acc:'#50d0a0', accType:'cap', eye:'#103828' }, // 습지 엽사
    gunner:  { hair:'#8a7a30', skin:'#d0c8a0', outfit:'#5a5830', acc:'#d0c050', accType:'cap', eye:'#3a3818' }, // 황금빛 총잡
    bomber:  { hair:'#a05030', skin:'#c8b090', outfit:'#6a4030', acc:'#e09040', accType:'ribbon', eye:'#402018' }, // 늪가스 폭탄
    golden:  { hair:'#f0e070', skin:'#e8d8b0', outfit:'#c9a84a', acc:'#ffe890', accType:'ribbon', eye:'#5a4820' }, // 습지 황금
  },
};
// hex 미세 시프트 (개체마다 살짝 다르게)
function palShift(hex, d){
  if(!hex || hex[0]!=='#' || hex.length<7) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r = Math.max(0, Math.min(255, r+d));
  g = Math.max(0, Math.min(255, g+d));
  b = Math.max(0, Math.min(255, b+Math.round(d*0.6)));
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
function enemyPal(e){
  const base = GIRL_PALS[e.id] || GIRL_PALS.zduck;
  const reg = e.region || (raid && raid.region) || 'hill';
  const over = (REGION_ENEMY_PALS[reg] && REGION_ENEMY_PALS[reg][e.id]) || null;
  const g = over ? Object.assign({}, base, over) : base;
  // seed 기반 개체 바리에이션 (같은 지역·타입도 조금씩 다름)
  const s = ((e.seed||0) * 17 | 0) % 11 - 5; // -5..+5
  const hair = palShift(g.hair, s);
  const skin = palShift(g.skin, Math.round(s*0.5));
  const outfit = palShift(g.outfit || (e.t && e.t.color) || '#6a8a5a', Math.round(s*0.7));
  return {
    hair, skin, outfit,
    acc: g.acc, accType: g.accType,
    eye: g.eye || '#3a2632',
  };
}
const PLAYER_PAL = {
  hair:'#e0a850', skin:'#f6dcbe', outfit:'#5a86b0',
  acc:'#ff8fae', accType:'ribbon', eye:'#5a7a4a',
};

function drawPlayer(){
  const [sx,sy] = worldToScreen(player.x, player.y);
  if(player.iframe>0 && Math.floor(performance.now()/80)%2===0) ctx.globalAlpha = 0.45;
  const face = Math.cos(player.ang) >= 0 ? 1 : -1;
  const moving = (keys.w||keys.a||keys.s||keys.d);
  // 🤸 구르기: 진행도에 맞춰 몸 전체가 이동 방향으로 한 바퀴 뒹굴기
  const rolling = player.rollT > 0;
  if(rolling){
    const dur = player.rollDur || 0.26;
    const prog = 1 - Math.max(0, player.rollT)/dur;   // 0→1
    // 회전 방향: 좌우 구르기는 그쪽으로, 수직 구르기는 아래=시계/위=반시계
    const sign = Math.abs(player.rollDir.x) >= 0.3
      ? (player.rollDir.x>=0 ? 1 : -1)
      : (player.rollDir.y>=0 ? 1 : -1);
    const cx = sx, cy = sy - player.r*0.6; // 몸통 중심 축
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(prog * Math.PI*2 * sign);
    ctx.translate(-cx, -cy);
  }
  drawGirl(sx, sy, player.r, PLAYER_PAL, face, false, false,
    { walk: moving ? performance.now()/80 : 0,
      bob: (moving && !rolling) ? Math.abs(Math.sin(performance.now()/160))*1.3 : 0 });
  // 총은 조준각 그대로 회전 — 캐릭터 손(몸통 중간) 높이에 맞춤
  const spin = player.reloading>0 && player.reloadTotal>0
    ? (1 - player.reloading/player.reloadTotal)*Math.PI*2 : 0;
  drawGunWorld(ctx, curGun(), sx, sy-player.r*0.4, player.ang, player.flash, spin, player.kick); // 손 높이 (총알 발사점과 일치)
  if(rolling) ctx.restore();
  ctx.globalAlpha = 1;
}
