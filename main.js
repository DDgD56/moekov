// ============================================================
// MoeKov — 메인 (루프·부트)
// ============================================================

// ---------------- 메인 루프 ----------------
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------------- 부트 ----------------
buildCave();
if(!loadGame()) newGame();
// 몸통이 하나도 없어도 자동 지급하지 않음 — 퀘스트 창구(❗)에서 받는다
player.x = 11*TILE; player.y = 13.5*TILE;
player.hp = maxHp();
player.stam = stamMax();
cam.x = player.x; cam.y = player.y;
setupQslots();
renderQslots();
refreshQslotZones();
if(!State.seenHelp) openPanel('help');
updateHud();
requestAnimationFrame(loop);

// ---------------- 배경음악 시작 ----------------
// WebAudio는 사용자 상호작용 후에만 소리가 난다 → 첫 클릭/키 입력에서 현재 씬 곡을 켠다.
updateMusicBtn();
{
  const startBgm = ()=>{
    playMusic(scene==='raid' ? (raid && phase()==='night' ? 'nightRaid':'dayRaid') : 'cave');
    window.removeEventListener('mousedown', startBgm);
    window.removeEventListener('keydown', startBgm);
  };
  window.addEventListener('mousedown', startBgm, {passive:true});
  window.addEventListener('keydown', startBgm, {passive:true});
}
{
  const b = document.getElementById('musicBtn');
  if(b) b.addEventListener('click', (e)=>{ e.stopPropagation(); const a=ac(); if(a&&a.state==='suspended')a.resume(); if(!Music.cur) playMusic(scene==='raid'?'dayRaid':'cave'); toggleMusic(); });
}

// 테스트/디버그용
window.G = { State, player, startRaid, openPanel, closePanel, get raid(){return raid;}, get scene(){return scene;}, gunStats };
