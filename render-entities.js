// ============================================================
// MoeKov — 렌더 엔티티 (스프라이트·픽셀폰트·플레이어/적 드로우)
// ============================================================

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
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(0, dh*0.42, dw*0.4, dh*0.09, 0, 0, Math.PI*2); ctx.fill();
  if(elite){
    ctx.fillStyle = 'rgba(255,210,80,.22)';
    ctx.beginPath(); ctx.arc(0, -dh*0.05, r*1.5, 0, Math.PI*2); ctx.fill();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.scale(faceDir, 1);          // 좌우 반전만
  const cn = girlCanvas(pal, hit);
  // 스프라이트 중심을 발밑 기준으로 배치 (bob 반영)
  ctx.drawImage(cn, -dw/2, -dh*0.62 - bob, dw, dh);
  ctx.restore();
}

// ---- 팔레트 정의 (색 최소화: 머리/피부/옷/눈/악세) ----
const GIRL_PALS = {
  zduck:   { hair:'#7ea86a', skin:'#b8cf9a', acc:null },                          // 좀비: 창백한 초록빛
  fastduck:{ hair:'#c9524a', skin:'#f0c4a8', acc:'#ff6a5a', accType:'ribbon' },   // 광전사: 붉은머리
  bigduck: { hair:'#5a6a9a', skin:'#e8c4a4', acc:null },                          // 거구: 남색
  spitter: { hair:'#9a5ab0', skin:'#f0c8b0', acc:'#d090e8', accType:'pin' },      // 마녀: 보라
  sniper:  { hair:'#3a8a9a', skin:'#eac4a8', acc:'#5ad0e0', accType:'cap' },      // 저격: 청록+모자
  gunner:  { hair:'#b09040', skin:'#eac4a8', acc:'#d0b050', accType:'cap' },      // 총잡이: 금발+모자
  bomber:  { hair:'#c94a3a', skin:'#f0c0a0', acc:'#ff9040', accType:'ribbon' },   // 폭탄: 위험한 주황
  golden:  { hair:'#f0d860', skin:'#f4d4b0', acc:'#ffe880', accType:'ribbon' },   // 황금
  kingduck:{ hair:'#ffe070', skin:'#f4d4b0', acc:'#ffd24a', accType:'cap' },      // 보스 (왕관은 별도)
};
function enemyPal(e){
  const g = GIRL_PALS[e.id] || GIRL_PALS.zduck;
  return { hair:g.hair, skin:g.skin, outfit:e.t.color,
           acc:g.acc, accType:g.accType, eye:'#3a2632' };
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
  drawGirl(sx, sy, player.r, PLAYER_PAL, face, false, false,
    { walk: moving ? performance.now()/80 : 0,
      bob: moving ? Math.abs(Math.sin(performance.now()/160))*1.3 : 0 });
  // 총은 조준각 그대로 회전 — 캐릭터 손(몸통 중간) 높이에 맞춤
  const spin = player.reloading>0 && player.reloadTotal>0
    ? (1 - player.reloading/player.reloadTotal)*Math.PI*2 : 0;
  drawGunWorld(ctx, curGun(), sx, sy-player.r*0.7, player.ang, player.flash, spin, player.kick);
  ctx.globalAlpha = 1;
}
