// ============================================================
// MoeKov — 절차적 칩튠 배경음악 (WebAudio, 파일 없음)
// game.js 의 AudioContext(AC)와 ac() 를 재사용한다.
// ============================================================

// ---- 음정 유틸 ----
// 반음 번호 → 주파수 (A4=57 기준, 12평균율)
function midiFreq(n){ return 440 * Math.pow(2, (n-57)/12); }
// 음이름 파싱은 안 쓰고, 스케일을 반음 오프셋 배열로 직접 표기한다.

// ---- 트랙 정의: 씬별 잔잔한 칩튠 ----
// 각 트랙:
//  bpm       : 템포
//  root      : 기준음(midi 번호). C4=48
//  chords    : 마디별 코드 (root 기준 반음 오프셋 배열) — 화음/아르페지오용
//  scale     : 멜로디가 고를 반음 오프셋 (펜타토닉 계열이라 뭘 골라도 안 어긋남)
//  bassType/leadType/padVol 등 음색·볼륨
const MUSIC_TRACKS = {
  // 🏠 케이브: 따뜻하고 아늑한 장조 (편안한 집)
  cave: {
    bpm: 84, root: 48, // C4
    // I – vi – IV – V (C – Am – F – G) 느낌, 밝고 포근
    chords: [ [0,4,7,12], [-3,0,4,9], [5,9,12,17], [7,11,14,19] ],
    scale: [0,2,4,7,9,12,14,16], // C 메이저 펜타토닉+
    leadType:'triangle', bassType:'sine', leadVol:0.10, bassVol:0.13, padVol:0.04,
    leadDensity:0.55, // 멜로디 음표가 나올 확률
  },
  // 🌄 레이드 낮: 평화롭지만 살짝 설렘 (도리안 느낌)
  dayRaid: {
    bpm: 92, root: 45, // A3
    chords: [ [0,3,7,12], [5,8,12,17], [-2,2,5,10], [3,7,10,15] ],
    scale: [0,3,5,7,10,12,15,17], // A 마이너 펜타토닉
    leadType:'square', bassType:'triangle', leadVol:0.075, bassVol:0.12, padVol:0.035,
    leadDensity:0.5,
  },
  // 🌙 레이드 밤: 어둡고 긴장 (내추럴 마이너, 저음 강조)
  nightRaid: {
    bpm: 100, root: 40, // E3 (낮게)
    chords: [ [0,3,7,10], [0,3,7,10], [-2,1,5,8], [3,7,10,14] ],
    scale: [0,3,5,6,7,10,12,15], // E 마이너 + 블루노트(6=b5) 로 불안감
    leadType:'square', bassType:'sawtooth', leadVol:0.07, bassVol:0.15, padVol:0.05,
    leadDensity:0.6,
  },
};

// ---- 재생 상태 ----
const Music = {
  enabled: true,        // 음소거 여부 (저장됨)
  cur: null,            // 현재 트랙 이름
  track: null,          // 현재 트랙 데이터
  master: null,         // 마스터 게인 노드
  nextNoteT: 0,         // 다음 음표 예정 시각 (AudioContext 시간)
  step: 0,              // 16분음표 스텝 카운터
  timer: null,          // 스케줄러 인터벌
  seed: 12345,          // 멜로디용 결정적 난수
};

// 저장된 음소거 설정 로드
try{
  const s = localStorage.getItem('moekov_music');
  if(s==='off') Music.enabled = false;
}catch(e){}

// 결정적 난수 (Math.random 대신 — 씨앗으로 멜로디 변주)
function mrand(){ Music.seed = (Music.seed*1103515245 + 12345) & 0x7fffffff; return Music.seed / 0x7fffffff; }
function mpick(arr){ return arr[Math.floor(mrand()*arr.length)]; }

// 마스터 게인 확보 (게임 AudioContext 재사용)
function musicMaster(){
  const a = ac(); if(!a) return null;
  if(!Music.master){
    Music.master = a.createGain();
    Music.master.gain.value = Music.enabled ? 1 : 0;
    Music.master.connect(a.destination);
  }
  return Music.master;
}

// 한 음 재생 (마스터 게인 경유 — 음소거·볼륨 일괄 제어)
function mnote(freq, dur, type, vol, when){
  const a = ac(), m = musicMaster(); if(!a || !m) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  // 부드러운 어택/릴리스 (칩튠이지만 딱딱하지 않게)
  const t0 = when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(m);
  o.start(t0); o.stop(t0+dur+0.02);
}

// 16분음표 하나 스케줄 (step 기반 패턴)
function scheduleStep(step, when){
  const T = Music.track; if(!T) return;
  const bar = Math.floor(step/16) % T.chords.length; // 어느 마디인지
  const s16 = step % 16;                              // 마디 내 16분음표 위치
  const chord = T.chords[bar];
  const rootMidi = T.root;

  // ── 베이스: 마디 첫 박·3박에 근음 (반박자 길이) ──
  if(s16===0 || s16===8){
    const bf = midiFreq(rootMidi + chord[0] - 12); // 한 옥타브 아래
    mnote(bf, s16===0?0.55:0.4, T.bassType, T.bassVol, when);
  }
  // ── 패드(화음): 마디 시작에 코드 전체를 은은하게 길게 ──
  if(s16===0){
    chord.forEach((off,i)=>{
      mnote(midiFreq(rootMidi+off), 1.7, 'sine', T.padVol*(i===0?1:0.7), when);
    });
  }
  // ── 아르페지오: 8분음표마다 코드음을 순회 (잔잔한 반짝임) ──
  if(s16%2===0){
    const ai = (s16/2) % chord.length;
    mnote(midiFreq(rootMidi+chord[ai]+12), 0.18, T.leadType, T.leadVol*0.5, when);
  }
  // ── 멜로디: 확률적으로 스케일에서 골라 얹기 ──
  if(mrand() < T.leadDensity && (s16%2===0)){
    const note = mpick(T.scale) + 12; // 한 옥타브 위
    mnote(midiFreq(rootMidi+note), 0.22, T.leadType, T.leadVol, when);
  }
}

// lookahead 스케줄러 (25ms마다 앞으로 0.1초치를 미리 큐잉 → 끊김 없음)
function musicScheduler(){
  const a = ac(); if(!a || !Music.track) return;
  const spb = 60 / Music.track.bpm;      // 초/박
  const stepDur = spb / 4;               // 16분음표 길이
  while(Music.nextNoteT < a.currentTime + 0.1){
    scheduleStep(Music.step, Music.nextNoteT);
    Music.nextNoteT += stepDur;
    Music.step++;
  }
}

// 트랙 시작/전환
function playMusic(name){
  if(Music.cur === name) return;         // 이미 그 곡이면 무시
  const T = MUSIC_TRACKS[name]; if(!T) return;
  Music.cur = name; Music.track = T;
  const a = ac();
  if(a && a.state==='running'){
    Music.nextNoteT = a.currentTime + 0.05;
    Music.step = 0;
  }
  musicMaster();
  if(!Music.timer){
    Music.timer = setInterval(musicScheduler, 25);
  }
}

// 완전 정지
function stopMusic(){
  if(Music.timer){ clearInterval(Music.timer); Music.timer = null; }
  Music.cur = null; Music.track = null;
}

// 음소거 토글 (게인만 0으로 — 스케줄은 계속 돌아 즉시 복귀)
function toggleMusic(){
  Music.enabled = !Music.enabled;
  const m = musicMaster();
  const a = ac();
  if(m && a){
    m.gain.cancelScheduledValues(a.currentTime);
    m.gain.setValueAtTime(m.gain.value, a.currentTime);
    m.gain.linearRampToValueAtTime(Music.enabled?1:0, a.currentTime+0.2);
  }
  try{ localStorage.setItem('moekov_music', Music.enabled?'on':'off'); }catch(e){}
  updateMusicBtn();
  return Music.enabled;
}

// 화면의 음소거 버튼 갱신
function updateMusicBtn(){
  const b = document.getElementById('musicBtn');
  if(b) b.textContent = Music.enabled ? '🔊' : '🔇';
}

// AudioContext가 사용자 상호작용으로 깨어나면 스케줄러 타이밍 재설정
document.addEventListener('mousedown', ()=>{
  const a = ac();
  if(a && Music.track && Music.nextNoteT < a.currentTime){
    Music.nextNoteT = a.currentTime + 0.05;
  }
}, {passive:true});
