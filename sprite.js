// ============================================================
//  🎨 캐릭터 스프라이트 — 여기만 고치면 됩니다!
// ============================================================
//
//  ▸ 각 줄은 반드시 GIRL_W 글자여야 합니다 (기본 16글자).
//  ▸ 줄 수는 자유롭게 늘리거나 줄여도 됩니다 (GIRL_H 자동).
//  ▸ 저장하고 게임 새로고침(F5)하면 바로 반영됩니다. (캐시 꺼져 있음)
//
//  ── 색 문자표 ──────────────────────────────
//   .  투명(빈칸)          O  외곽선(검정)
//   K  머리                k  머리 그림자        w  머리 광택(밝게)
//   S  피부                s  피부 그림자        H  손(피부색)
//   L  속눈썹(진한선)      E  눈동자(홍채)       W  눈 하이라이트(흰)
//   P  볼터치(분홍)        M  입(진분홍)
//   C  옷                 c  옷 그림자          A  팔(진한 실루엣)
//
//   ※ 머리색·피부색·옷색·눈색은 캐릭터마다 자동으로 다르게 칠해집니다.
//     (여기선 "모양"만 그리면 플레이어+모든 적에 전부 적용)
//   ※ 볼터치/입/속눈썹/외곽선 색을 바꾸려면 game.js의 girlColorMap 함수에서.
//
//  ── 색을 직접 바꾸고 싶으면 ─────────────────
//   아래 GIRL_COLORS 에서 각 문자의 색을 직접 지정할 수 있습니다.
//   pal.hair/pal.skin/pal.outfit/pal.eye 는 캐릭터별 색(자동).
//   고정색으로 하고 싶으면 '#ff88aa' 처럼 직접 써도 됩니다.
// ============================================================

const GIRL_W = 20;

const GIRL_SPRITE = [
  ".............KKk....",
  "......OOOOOOKOOO....",
  "....OkkKKKKKkKKKO...",
  "...OkKKKKKKKKKKKKO..",
  "..OkKKKKKKwKwwKKwKO.",
  "..OkKKKKKKKKKwKKKKO.",
  "..OkkKKKKKKkKKkskKKO",
  ".OkkkKKKKkKkKKksskKO",
  ".OkkkkKKkLLLKksLLkKO",
  ".OkkkkKKkAASkSSASkKO",
  ".LkkwkKKSEESSSSESkO.",
  ".LkkwkKKSEESSSSESkO.",
  ".OMLLkKKSssSSSSsSkO.",
  ".OMMMOKKKSSSSSSSkkKO",
  ".LOMMOkKLMMMMMMLkkO.",
  ".LkOOOALMMMMLLLA....",
  "..LkAAALLLLLACCA....",
  "..LkOAAAACCccCCCA...",
  "...LOAAACCCCCCCCO...",
  "....OOOOOAOOOAAOO...",
  ".......kkk.kkk......",
];

// 색 문자 → 색. pal.xxx = 캐릭터별 자동색. '#hex' = 고정색.
// (여기서 색을 바꾸면 전부 반영됩니다)
function GIRL_COLORS(pal, shade, tint){
  return {
    O: '#20161a',                 // 외곽선
    K: pal.hair,                  // 머리
    k: shade(pal.hair, 0.72),     // 머리 그림자
    w: tint(pal.hair, 0.4),       // 머리 광택
    S: pal.skin,                  // 피부
    s: shade(pal.skin, 0.82),     // 피부 그림자
    H: pal.skin,                  // 손
    L: '#3a2632',                 // 속눈썹
    E: pal.eye,                   // 눈동자
    W: '#ffffff',                 // 눈 하이라이트
    P: '#f0a0aa',                 // 볼터치
    M: '#d05a6a',                 // 입
    C: pal.outfit,                // 옷
    c: shade(pal.outfit, 0.72),   // 옷 그림자
    A: shade(pal.outfit, 0.5),    // 팔
  };
}

const GIRL_H = GIRL_SPRITE.length; // 세로 = 줄 수 (자동)
