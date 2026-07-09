// ============================================================
// MoeKov — 데이터 유틸
// 밸런스 테이블(ITEMS, REGIONS, …) 단일 소스: data/*.json
// 브라우저: data.tables.js 를 먼저 로드 (node scripts/build-data-tables.js 로 생성)
// ============================================================

function rnd(a,b){ return a + Math.random()*(b-a); }
function rndi(a,b){ return Math.floor(rnd(a,b+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickWeighted(pairs){ // [[key,weight],...]
  let s = pairs.reduce((a,p)=>a+p[1],0), r = Math.random()*s;
  for(const [k,w] of pairs){ if((r-=w)<=0) return k; }
  return pairs[pairs.length-1][0];
}
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function dist(ax,ay,bx,by){ return Math.hypot(bx-ax, by-ay); }
