// ============================================================
// MoeKov — 데이터 정의
// ============================================================

// ---- 폴리오미노 모양 (셀 좌표 배열) ----
const SHAPES = {
  sq1: [[0,0]],
  h2: [[0,0],[1,0]],
  v2: [[0,0],[0,1]],
  h3: [[0,0],[1,0],[2,0]],
  v3: [[0,0],[0,1],[0,2]],
  h4: [[0,0],[1,0],[2,0],[3,0]],
  h5: [[0,0],[1,0],[2,0],[3,0],[4,0]],
  v4: [[0,0],[0,1],[0,2],[0,3]],
  sq2: [[0,0],[1,0],[0,1],[1,1]],
  L:  [[0,0],[0,1],[0,2],[1,2]],                       // ㄱ(긴) 모양
  J:  [[1,0],[1,1],[1,2],[0,2]],                       // ㄱ 반전
  zig:[[1,0],[1,1],[0,1],[0,2]],                       // 번개 모양
  sS: [[1,0],[2,0],[0,1],[1,1]],                       // 가로 S
  T:  [[0,0],[1,0],[2,0],[1,1]],
  longT: [[0,0],[1,0],[2,0],[1,1],[1,2]],              // 긴 T
  plus: [[1,0],[0,1],[1,1],[2,1],[1,2]],               // 십자
  U:  [[0,0],[2,0],[0,1],[1,1],[2,1]],                 // U자
  stairs: [[0,0],[0,1],[1,1],[1,2],[2,2]],             // 계단
  corner: [[0,0],[1,0],[0,1]],                         // 꺾임 3칸
  bigL: [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3]],         // 왕 ㄴ자
  H:  [[0,0],[0,1],[0,2],[1,1],[2,0],[2,1],[2,2]],     // H자
  donut: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]], // 도넛 (가운데 구멍)
};

// 소켓 타입별 색/이름
const SOCK_INFO = {
  muzzle: { name:'총구',    color:'#e8853a' },
  mag:    { name:'탄창',    color:'#6fbf5a' },
  grip:   { name:'그립',    color:'#e0c04a' },
  scope:  { name:'스코프',  color:'#5aa8e8' },
  stock:  { name:'개머리판', color:'#b07a52' },
};

// ---- 아이템 정의 ----
// kind: body(총몸통) / att(부착물) / loot(귀중품) / food(음식)
// body: bw,bh(직사각형), rails:[{side:'top|bottom|front|back', type, from, len}], base:{...}
// att:  sock(소켓타입), plug(플러그 칸수), mods:{...}
const ITEMS = {
  // ===== 총 몸통 =====
  potato_pistol: {
    id:'potato_pistol', kind:'body', name:'감자 권총', emoji:'🥔', shape:'h2', value:40,
    bw:2, bh:1, color:'#c9a94a',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'mag', from:1, len:1},
      {side:'top', type:'scope', from:0, len:1},
    ],
    cls:'권총',
    base:{ dmg:5, rpm:250, spread:7, ammo:6, reload:1.2, noise:230, pellets:1, recoil:3 },
    desc:'수제 감자 권총. 소박하지만 정직하다.',
  },
  bamboo_rifle: {
    id:'bamboo_rifle', kind:'body', name:'대나무 소총', emoji:'🎋', shape:'h4', value:160,
    bw:4, bh:1, color:'#7ab84a',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'grip', from:0, len:3},
      {side:'bottom', type:'mag',  from:2, len:2},   // 그립칸과 1칸 겹침!
      {side:'top', type:'scope', from:0, len:3},
      {side:'back', type:'stock', from:0, len:1},
    ],
    cls:'소총',
    base:{ dmg:9, rpm:430, spread:9, ammo:5, reload:1.6, noise:280, pellets:1, recoil:8 },
    desc:'속이 빈 대나무 소총. 확장성이 뛰어난 명품 몸통.',
  },
  water_pipe: {
    id:'water_pipe', kind:'body', name:'워터 파이프', emoji:'🚿', shape:'h3', value:120,
    bw:3, bh:1, color:'#7fa8b8',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'grip', from:0, len:1},
      {side:'bottom', type:'mag', from:1, len:2},
      {side:'top', type:'scope', from:0, len:1},
      {side:'back', type:'stock', from:0, len:1},
    ],
    cls:'기관단총',
    base:{ dmg:4, rpm:750, spread:12, ammo:9, reload:1.4, noise:200, pellets:1, recoil:1.5 },
    desc:'물이 새는 기관단총. 연사가 시원하다.',
  },
  ukulele: {
    id:'ukulele', kind:'body', name:'우쿨렐레', emoji:'🎸', shape:'sq2', value:200,
    bw:2, bh:2, color:'#a05ac0',
    rails:[
      {side:'front', type:'muzzle', from:0, len:2},  // 총구 2개 장착 가능!
      {side:'bottom', type:'grip', from:0, len:2},
      {side:'bottom', type:'mag', from:1, len:1},
      {side:'top', type:'scope', from:0, len:2},
      {side:'back', type:'stock', from:0, len:2},
    ],
    cls:'산탄총',
    base:{ dmg:4, rpm:95, spread:15, ammo:3, reload:2.2, noise:340, pellets:5, recoil:14 },
    desc:'알로하~ 산탄이 나가는 우쿨렐레.',
  },
  trumpet_shotgun: {
    id:'trumpet_shotgun', kind:'body', name:'나팔 산탄총', emoji:'🎺', shape:'h3', value:240,
    bw:3, bh:1, color:'#b5641e', cls:'산탄총',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'top', type:'scope', from:0, len:2},
      {side:'bottom', type:'grip', from:0, len:2},
      {side:'bottom', type:'mag', from:1, len:2},
      {side:'back', type:'stock', from:0, len:1},
    ],
    base:{ dmg:5, rpm:80, spread:17, ammo:2, reload:2.3, noise:380, pellets:7, recoil:17 },
    desc:'빠밤!! 산탄이 부채꼴로 쏟아진다. 어깨가 얼얼한 반동.',
  },
  stapler_pistol: {
    id:'stapler_pistol', kind:'body', name:'스테이플러 권총', emoji:'🖇️', shape:'h2', value:150,
    bw:2, bh:1, color:'#7a8a9a', cls:'권총',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'mag', from:1, len:1},
      {side:'top', type:'scope', from:0, len:1},
    ],
    base:{ dmg:7, rpm:330, spread:4.5, ammo:8, reload:0.9, noise:230, pellets:1, recoil:3 },
    desc:'딱, 딱, 정확하게 박아 넣는다. 반동이 거의 없다.',
  },
  extinguisher_smg: {
    id:'extinguisher_smg', kind:'body', name:'소화기 기관단총', emoji:'🧯', shape:'h3', value:260,
    bw:3, bh:1, color:'#c04a4a', cls:'기관단총',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'mag', from:0, len:3},
      {side:'top', type:'scope', from:1, len:1},
      {side:'back', type:'stock', from:0, len:1},
    ],
    base:{ dmg:3, rpm:950, spread:13, ammo:14, reload:1.2, noise:170, pellets:1, recoil:1.2 },
    desc:'뿌슈슈슉!! 미친 연사력. 한 발 한 발은 간지럽다. 탄창 레일 3칸!',
  },
  fishingrod_sniper: {
    id:'fishingrod_sniper', kind:'body', name:'낚싯대 저격총', emoji:'🎣', shape:'h5', value:380,
    bw:5, bh:1, color:'#5a7a9a', cls:'저격총',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'top', type:'scope', from:1, len:4},
      {side:'bottom', type:'grip', from:1, len:2},
      {side:'bottom', type:'mag', from:3, len:1},
      {side:'back', type:'stock', from:0, len:1},
    ],
    base:{ dmg:34, rpm:42, spread:1.5, ammo:3, reload:2.1, noise:330, pellets:1, recoil:26 },
    desc:'한 발 한 발이 월척. 쏠 때마다 뒤로 밀려난다. 스코프 레일 4칸.',
  },

  // ===== 총구 부착물 =====
  pinecone_silencer: {
    id:'pinecone_silencer', kind:'att', sock:'muzzle', plug:1, name:'솔방울 소음기', emoji:'🌰',
    shape:'sq1', value:65, mods:{ noiseMul:0.3, spread:-1 },
    desc:'퍽... 퍽... 조용하다.',
  },
  airhorn: {
    id:'airhorn', kind:'att', sock:'muzzle', plug:1, name:'에어혼', emoji:'📢',
    shape:'v2', value:95, mods:{ noiseMul:2.4, dmg:7 },
    desc:'빵!!! 엄청 시끄럽지만 데미지가 좋다. 온 동네 미니가 몰려온다.',
  },
  carrot_comp: {
    id:'carrot_comp', kind:'att', sock:'muzzle', plug:1, name:'당근 컴펜세이터', emoji:'🥕',
    shape:'h2', value:55, mods:{ spread:-3.5, noiseMul:1.15 },
    desc:'탄이 당근처럼 곧게 나간다.',
  },

  // ===== 탄창 =====
  mushroom_mag: {
    id:'mushroom_mag', kind:'att', sock:'mag', plug:1, name:'버섯 탄창', emoji:'🍄',
    shape:'v2', value:45, mods:{ ammo:7, reload:0.3 },
    desc:'포자가 총알이 된다. 가볍고 빠르다.',
  },
  corn_mag: {
    id:'corn_mag', kind:'att', sock:'mag', plug:1, name:'옥수수 탄창', emoji:'🌽',
    shape:'v3', value:75, mods:{ ammo:15, reload:0.7 },
    desc:'알알이 총알. 갈아끼우기는 좀 느리다.',
  },
  can_drum: {
    id:'can_drum', kind:'att', sock:'mag', plug:2, name:'통조림 드럼', emoji:'🥫',
    shape:'sq2', value:135, mods:{ ammo:26, reload:1.4, spread:1 },
    desc:'대용량 참치캔 드럼탄창. 탄창 소켓 2칸 필요.',
  },

  // ===== 그립 =====
  banana_grip: {
    id:'banana_grip', kind:'att', sock:'grip', plug:2, name:'바나나 그립', emoji:'🍌',
    shape:'L', value:65, mods:{ spread:-3, aim:0.15 },
    desc:'미끄러질 것 같지만 의외로 잘 잡힌다. 그립 2칸 필요.',
  },
  flashlight: {
    id:'flashlight', kind:'att', sock:'grip', plug:1, name:'손전등', emoji:'🔦',
    shape:'h2', value:55, mods:{ light:0.4 },
    desc:'밤에 시야가 넓고 밝아진다.',
  },
  fork_grip: {
    id:'fork_grip', kind:'att', sock:'grip', plug:1, name:'포크 그립', emoji:'🍴',
    shape:'v2', value:40, mods:{ spread:-1.5, aim:0.1 },
    desc:'찍어서 고정하는 그립.',
  },

  // ===== 스코프 =====
  glasses_scope: {
    id:'glasses_scope', kind:'att', sock:'scope', plug:1, name:'안경 스코프', emoji:'👓',
    shape:'h2', value:70, mods:{ zoom:1.3, spread:-1 },
    desc:'누군가의 도수 있는 안경. 조금 멀리 보인다.',
  },
  cucumber_scope: {
    id:'cucumber_scope', kind:'att', sock:'scope', plug:2, name:'오이 스코프', emoji:'🥒',
    shape:'h2', value:90, mods:{ zoom:1.8, spread:-1.5 },
    desc:'속을 파낸 오이. 의외로 선명하다. 스코프 2칸 필요.',
  },
  telescope: {
    id:'telescope', kind:'att', sock:'scope', plug:3, name:'망원경', emoji:'🔭',
    shape:'h3', value:150, mods:{ zoom:2.6, spread:-2, aim:-0.1 },
    desc:'저격용. 스코프 3칸짜리 몸통에만 달 수 있다.',
  },
  riceball_dot: {
    id:'riceball_dot', kind:'att', sock:'scope', plug:1, name:'주먹밥 도트', emoji:'🍙',
    shape:'sq1', value:50, mods:{ spread:-2.5 },
    desc:'김이 십자선 역할을 한다.',
  },

  // ===== 개머리판 =====
  slipper_stock: {
    id:'slipper_stock', kind:'att', sock:'stock', plug:1, name:'슬리퍼 개머리판', emoji:'🩴',
    shape:'h2', value:50, mods:{ aim:0.35, spread:-1, recoilMul:0.8 },
    desc:'어깨에 착 붙는 삼선 슬리퍼.',
  },
  backscratcher_stock: {
    id:'backscratcher_stock', kind:'att', sock:'stock', plug:1, name:'효자손 개머리판', emoji:'🪵',
    shape:'h3', value:75, mods:{ spread:-3, aim:0.2, recoilMul:0.7 },
    desc:'등도 긁고 반동도 잡고.',
  },
  bat_stock: {
    id:'bat_stock', kind:'att', sock:'stock', name:'야구방망이 개머리판', emoji:'🏏',
    shape:'h3', value:95, mods:{ recoilMul:0.6, aim:0.1 },
    desc:'어깨에 단단히 받친다. 홈런은 못 침.',
  },
  sponge_stock: {
    id:'sponge_stock', kind:'att', sock:'stock', name:'스펀지 개머리판', emoji:'🧽',
    shape:'sq2', value:120, mods:{ recoilMul:0.45, aim:-0.1 },
    desc:'반동을 쭉쭉 빨아들인다. 대신 물렁해서 조준이 굼뜸.',
  },
  spring_stock: {
    id:'spring_stock', kind:'att', sock:'stock', name:'스프링 개머리판', emoji:'🌀',
    shape:'zig', value:100, mods:{ rpmMul:1.15, recoilMul:1.25, spread:1 },
    desc:'통통 튀며 더 빨리 쏜다. 대신 더 튄다.',
  },
  teddy_stock: {
    id:'teddy_stock', kind:'att', sock:'stock', name:'곰인형 개머리판', emoji:'🧸',
    shape:'plus', value:130, mods:{ recoilMul:0.4 },
    desc:'꼭 껴안으면 반동이 무섭지 않아.',
  },

  // ===== 확장 총구 =====
  leek_silencer: {
    id:'leek_silencer', kind:'att', sock:'muzzle', name:'파 소음기', emoji:'🥬',
    shape:'v3', value:90, mods:{ noiseMul:0.4, dmg:1 },
    desc:'기다란 대파. 조용하고 알싸하다.',
  },
  pepper_brake: {
    id:'pepper_brake', kind:'att', sock:'muzzle', name:'고추 머즐브레이크', emoji:'🌶️',
    shape:'sS', value:85, mods:{ recoilMul:0.55, noiseMul:1.3, spread:-1 },
    desc:'매운맛으로 반동을 눌러버린다.',
  },
  funnel_choke: {
    id:'funnel_choke', kind:'att', sock:'muzzle', name:'깔때기 초크', emoji:'🔻',
    shape:'corner', value:70, mods:{ spread:-4 },
    desc:'산탄이 모여서 나간다. 산탄총과 찰떡.',
  },
  whistle_amp: {
    id:'whistle_amp', kind:'att', sock:'muzzle', name:'호루라기 증폭기', emoji:'📣',
    shape:'sq1', value:60, mods:{ dmg:3, noiseMul:1.5 },
    desc:'삑! 아프고 시끄럽다.',
  },
  // ===== 확장 탄창 =====
  baguette_mag: {
    id:'baguette_mag', kind:'att', sock:'mag', name:'바게트 탄창', emoji:'🥖',
    shape:'h4', value:110, mods:{ ammo:18, reload:0.8 },
    desc:'가로로 무지 길다. 어디에 꽂을지 고민되는 맛.',
  },
  snail_drum: {
    id:'snail_drum', kind:'att', sock:'mag', name:'달팽이 드럼', emoji:'🐌',
    shape:'donut', value:190, mods:{ ammo:34, reload:1.85, aim:-0.15 },
    desc:'가운데가 뚫린 대용량 드럼. 느리지만 든든하다.',
  },
  eggcarton_mag: {
    id:'eggcarton_mag', kind:'att', sock:'mag', name:'계란판 탄창', emoji:'🥚',
    shape:'U', value:130, mods:{ ammo:20, reload:0.9 },
    desc:'한 알 한 알 소중하게. U자 모양이라 끼우기 까다롭다.',
  },
  sausage_mag: {
    id:'sausage_mag', kind:'att', sock:'mag', name:'소시지 체인', emoji:'🌭',
    shape:'stairs', value:90, mods:{ ammo:12, reload:0.55 },
    desc:'계단 모양으로 줄줄이 이어진 소시지 탄띠.',
  },
  dice_mag: {
    id:'dice_mag', kind:'att', sock:'mag', name:'주사위 탄창', emoji:'🎲',
    shape:'sq1', value:40, mods:{ ammo:4, reload:0.2 },
    desc:'초소형. 운이 좋으면 6발쯤 들어있는 기분.',
  },
  // ===== 확장 그립 =====
  driver_grip: {
    id:'driver_grip', kind:'att', sock:'grip', name:'십자드라이버 그립', emoji:'🪛',
    shape:'plus', value:95, mods:{ spread:-2, aim:0.2 },
    desc:'십자 모양이라 배치가 퍼즐이다.',
  },
  umbrella_grip: {
    id:'umbrella_grip', kind:'att', sock:'grip', name:'우산 그립', emoji:'☂️',
    shape:'J', value:85, mods:{ spread:-2.5, recoilMul:0.8 },
    desc:'비 오는 날에도 든든한 갈고리 손잡이.',
  },
  glove_grip: {
    id:'glove_grip', kind:'att', sock:'grip', name:'고무장갑 그립', emoji:'🧤',
    shape:'U', value:100, mods:{ aim:0.15, recoilMul:0.7 },
    desc:'착 감기는 그립감. 설거지도 가능.',
  },
  selfiestick_grip: {
    id:'selfiestick_grip', kind:'att', sock:'grip', name:'셀카봉 그립', emoji:'🤳',
    shape:'v4', value:110, mods:{ aim:0.25, recoilMul:0.8, spread:-1 },
    desc:'길게 뻗어 안정적으로 받친다. 4칸이나 차지함.',
  },
  // ===== 확장 스코프 =====
  microscope_scope: {
    id:'microscope_scope', kind:'att', sock:'scope', name:'현미경 스코프', emoji:'🔬',
    shape:'bigL', value:170, mods:{ zoom:2.2, spread:-2 },
    desc:'세포까지 보인다. 왕 ㄴ자라 가방에서 최악의 모양.',
  },
  magnifier_scope: {
    id:'magnifier_scope', kind:'att', sock:'scope', name:'돋보기 스코프', emoji:'🔍',
    shape:'corner', value:60, mods:{ zoom:1.4 },
    desc:'햇빛 모으기도 가능(아마도).',
  },
  crystal_scope: {
    id:'crystal_scope', kind:'att', sock:'scope', name:'수정구 스코프', emoji:'🔮',
    shape:'T', value:120, mods:{ zoom:1.6, spread:1, dmg:4 },
    desc:'미래가 보인다... 대충 맞을 미래가.',
  },
  cctv_scope: {
    id:'cctv_scope', kind:'att', sock:'scope', name:'CCTV 스코프', emoji:'📹',
    shape:'longT', value:140, mods:{ zoom:1.9, light:0.2 },
    desc:'24시간 녹화 중. 야간 감시에 특화.',
  },

  // ===== 확장 2차: 총구 =====
  trombone_bell: {
    id:'trombone_bell', kind:'att', sock:'muzzle', name:'트롬본 벨', emoji:'📯',
    shape:'U', value:120, mods:{ dmg:4, noiseMul:1.6 },
    desc:'뿌우웅. 화력과 소음이 함께 커진다. U자 모양.',
  },
  shower_head: {
    id:'shower_head', kind:'att', sock:'muzzle', name:'샤워기 헤드', emoji:'🫧',
    shape:'T', value:140, mods:{ pellets:2, dmg:-1, spread:2 },
    desc:'탄이 물줄기처럼 갈라진다. 산탄 +2발!',
  },
  straw_silencer: {
    id:'straw_silencer', kind:'att', sock:'muzzle', name:'빨대 소음기', emoji:'🧃',
    shape:'h3', value:80, mods:{ noiseMul:0.55, spread:-1.5 },
    desc:'쪼로록. 얇고 길고 조용하다.',
  },
  cork_plug: {
    id:'cork_plug', kind:'att', sock:'muzzle', name:'코르크 마개', emoji:'🍾',
    shape:'sq1', value:70, mods:{ dmg:2, noiseMul:0.7, rpmMul:0.9 },
    desc:'뻥. 압축했다가 쏘는 느낌.',
  },
  // ===== 확장 2차: 탄창 =====
  octopus_mag: {
    id:'octopus_mag', kind:'att', sock:'mag', name:'문어 탄창', emoji:'🐙',
    shape:'H', value:200, mods:{ ammo:28, reload:1.55 },
    desc:'다리 8개로 탄을 꽉 쥔다. H자 7칸의 위엄.',
  },
  centipede_belt: {
    id:'centipede_belt', kind:'att', sock:'mag', name:'지네 탄띠', emoji:'🐛',
    shape:'h5', value:160, mods:{ ammo:22, reload:1.0 },
    desc:'가로 5칸짜리 탄띠. 어디에 눕힐 것인가.',
  },
  takeout_mag: {
    id:'takeout_mag', kind:'att', sock:'mag', name:'포장용기 탄창', emoji:'🥡',
    shape:'sq2', value:120, mods:{ ammo:16, reload:0.7 },
    desc:'곱빼기로 담았습니다.',
  },
  necklace_mag: {
    id:'necklace_mag', kind:'att', sock:'mag', name:'진주 목걸이 탄창', emoji:'📿',
    shape:'plus', value:150, mods:{ ammo:14, reload:0.6 },
    desc:'알알이 진주 총알. 우아하게 십자 모양.',
  },
  question_mag: {
    id:'question_mag', kind:'att', sock:'mag', name:'물음표 탄창', emoji:'❓',
    shape:'J', value:85, mods:{ ammo:10, reload:0.45 },
    desc:'몇 발 들었는지 세다가 만 탄창.',
  },
  // ===== 확장 2차: 그립 =====
  crab_grip: {
    id:'crab_grip', kind:'att', sock:'grip', name:'게 집게 그립', emoji:'🦀',
    shape:'sS', value:110, mods:{ spread:-2, recoilMul:0.85 },
    desc:'집게가 총을 꽉 물고 놓지 않는다.',
  },
  cane_grip: {
    id:'cane_grip', kind:'att', sock:'grip', name:'지팡이 그립', emoji:'🦯',
    shape:'L', value:90, mods:{ aim:0.2, spread:-1 },
    desc:'점잖게 짚고 쏘십시오.',
  },
  antenna_grip: {
    id:'antenna_grip', kind:'att', sock:'grip', name:'안테나 그립', emoji:'📡',
    shape:'v3', value:100, mods:{ light:0.15, aim:0.1 },
    desc:'수신 감도가 좋아 어둠 속이 잘 보인다.',
  },
  brake_grip: {
    id:'brake_grip', kind:'att', sock:'grip', name:'자전거 브레이크', emoji:'🚲',
    shape:'corner', value:95, mods:{ recoilMul:0.75 },
    desc:'끼익. 반동을 잡아 세운다.',
  },
  // ===== 확장 2차: 스코프 =====
  keyhole_scope: {
    id:'keyhole_scope', kind:'att', sock:'scope', name:'열쇠구멍 스코프', emoji:'🔑',
    shape:'v2', value:90, mods:{ zoom:1.5 },
    desc:'훔쳐보는 기분으로 정조준.',
  },
  panorama_scope: {
    id:'panorama_scope', kind:'att', sock:'scope', name:'파노라마 선글라스', emoji:'🕶️',
    shape:'h4', value:150, mods:{ zoom:1.3, light:0.3 },
    desc:'가로로 아주 길다. 시야가 넓고 밝다.',
  },
  dragonfly_scope: {
    id:'dragonfly_scope', kind:'att', sock:'scope', name:'잠자리 눈 스코프', emoji:'🪰',
    shape:'plus', value:130, mods:{ spread:-3, zoom:1.2 },
    desc:'겹눈으로 보면 빗나갈 수가 없다.',
  },
  frame_scope: {
    id:'frame_scope', kind:'att', sock:'scope', name:'액자 조준기', emoji:'🪟',
    shape:'donut', value:180, mods:{ zoom:2.0, aim:-0.1 },
    desc:'가운데 구멍으로 조준한다. 예술적이지만 부피가...',
  },
  // ===== 확장 2차: 개머리판 =====
  crutch_stock: {
    id:'crutch_stock', kind:'att', sock:'stock', name:'목발 개머리판', emoji:'🩼',
    shape:'bigL', value:160, mods:{ recoilMul:0.5, aim:0.1 },
    desc:'겨드랑이에 단단히 고정. 왕 ㄴ자 모양.',
  },
  boomerang_stock: {
    id:'boomerang_stock', kind:'att', sock:'stock', name:'부메랑 개머리판', emoji:'🪃',
    shape:'corner', value:105, mods:{ aim:0.3 },
    desc:'던지면 돌아온다. 조준이 착착 감긴다.',
  },
  eel_stock: {
    id:'eel_stock', kind:'att', sock:'stock', name:'전기장어 개머리판', emoji:'🦎',
    shape:'h4', value:140, mods:{ rpmMul:1.1, aim:0.15 },
    desc:'찌릿찌릿한 자극으로 방아쇠가 빨라진다.',
  },

  // ===== ★ 희귀 부착물 (상자 8% / 황금미니 확정 드랍) =====
  library_silencer: {
    id:'library_silencer', kind:'att', rare:true, sock:'muzzle', name:'도서관의 정적', emoji:'🤫',
    shape:'v2', value:340, mods:{ noiseMul:0.15, spread:-2, dmg:2 },
    desc:'★ 쉿. 총성마저 사서의 눈치를 본다.',
  },
  furnace_muzzle: {
    id:'furnace_muzzle', kind:'att', rare:true, sock:'muzzle', name:'용광로 총구', emoji:'🔥',
    shape:'sq1', value:380, mods:{ dmg:8, noiseMul:1.2 },
    desc:'★ 벌겋게 달아오른 탄이 나간다.',
  },
  magic_pouch: {
    id:'magic_pouch', kind:'att', rare:true, sock:'mag', name:'요술 주머니', emoji:'👝',
    shape:'sq2', value:420, mods:{ ammo:30, reload:0.9 },
    desc:'★ 넣은 것보다 많이 나온다. 원리는 묻지 말 것.',
  },
  honeycomb_mag: {
    id:'honeycomb_mag', kind:'att', rare:true, sock:'mag', name:'벌집 탄창', emoji:'🍯',
    shape:'plus', value:360, mods:{ ammo:20, reload:0.6 },
    desc:'★ 육각형은 완벽한 탄약 수납 구조다.',
  },
  hawk_scope: {
    id:'hawk_scope', kind:'att', rare:true, sock:'scope', name:'매의 눈', emoji:'🦅',
    shape:'h2', value:450, mods:{ zoom:2.8, spread:-3 },
    desc:'★ 2칸짜리인데 망원경보다 멀리 본다.',
  },
  samurai_grip: {
    id:'samurai_grip', kind:'att', rare:true, sock:'grip', name:'사무라이 그립', emoji:'⚔️',
    shape:'v2', value:400, mods:{ spread:-4, aim:0.3, recoilMul:0.7 },
    desc:'★ 총도(銃道)의 경지. 흔들림이 없다.',
  },
  rocket_stock: {
    id:'rocket_stock', kind:'att', rare:true, sock:'stock', name:'로켓 개머리판', emoji:'🚀',
    shape:'h2', value:430, mods:{ rpmMul:1.25, recoilMul:0.7, aim:0.2 },
    desc:'★ 반동을 추진력으로 재활용한다나 뭐라나.',
  },
  clover_charm: {
    id:'clover_charm', kind:'att', rare:true, sock:'grip', name:'네잎클로버 부적', emoji:'🍀',
    shape:'sq1', value:320, mods:{ spread:-2, aim:0.2, light:0.2 },
    desc:'★ 행운은 1x1칸밖에 차지하지 않는다.',
  },

  // ===== 귀중품 (판매용) =====
  gold_tooth:   { id:'gold_tooth', kind:'loot', name:'금니', emoji:'🦷', shape:'sq1', value:120, desc:'누구 건지는 묻지 말자.' },
  circuit:      { id:'circuit', kind:'loot', name:'회로기판', emoji:'💾', shape:'h2', value:80, desc:'아직 따끈따끈하다.' },
  toad_oil:     { id:'toad_oil', kind:'loot', name:'두꺼비 기름', emoji:'🧴', shape:'sq1', value:60, desc:'만병통치약(이라고 적혀있다).' },
  radio:        { id:'radio', kind:'loot', name:'고장난 라디오', emoji:'📻', shape:'sq2', value:150, desc:'가끔 지직거리는 소리가 나온다.' },
  bronze_kettle:{ id:'bronze_kettle', kind:'loot', name:'청동 주전자', emoji:'🫖', shape:'L', value:95, desc:'ㄱ자로 굽은 골동품.' },
  lightning_relic:{ id:'lightning_relic', kind:'loot', name:'번개 장식', emoji:'⚡', shape:'zig', value:200, desc:'지그재그 모양이라 넣기 애매하다.' },
  duck_ring:    { id:'duck_ring', kind:'loot', name:'미니 반지', emoji:'💍', shape:'sq1', value:180, desc:'작지만 비싸다.' },
  golden_duck:  { id:'golden_duck', kind:'loot', name:'황금 미니상', emoji:'🏆', shape:'donut', value:520, desc:'가운데가 뚫린 전설의 미니상. 부피가 크다.' },
  cross_trophy: { id:'cross_trophy', kind:'loot', name:'순금 십자 훈장', emoji:'🎖️', shape:'plus', value:260, desc:'누군가의 명예. 이젠 내 돈.' },
  snake_fossil: { id:'snake_fossil', kind:'loot', name:'뱀 화석', emoji:'🐍', shape:'stairs', value:320, desc:'계단처럼 굳어버린 화석. 가방 정리의 적.' },
  key_bundle:   { id:'key_bundle', kind:'loot', name:'골동 열쇠꾸러미', emoji:'🗝️', shape:'J', value:150, desc:'어느 문의 열쇠인지는 아무도 모른다.' },
  horseshoe_magnet:{ id:'horseshoe_magnet', kind:'loot', name:'말굽 자석', emoji:'🧲', shape:'U', value:190, desc:'행운과 자력을 동시에.' },
  dragon_bone:  { id:'dragon_bone', kind:'loot', name:'용가리 화석', emoji:'🦴', shape:'H', value:460, desc:'H자 모양의 거대 화석. 넣을 자리가 있을까?' },
  frame_art:    { id:'frame_art', kind:'loot', name:'명화 액자', emoji:'🖼️', shape:'donut', value:580, desc:'그림은 없고 액자만 남았다. 그래도 비싸다.' },
  crown:        { id:'crown', kind:'loot', rare:true, name:'황금 왕관', emoji:'👑', shape:'T', value:1000, desc:'★ 미니 왕국의 왕관. 황금미니 킹만이 떨어뜨린다.' },
  mahjong_set:  { id:'mahjong_set', kind:'loot', name:'마작패 묶음', emoji:'🀄', shape:'v4', value:140, desc:'한 줄로 길게 묶여 있다.' },
  music_box:    { id:'music_box', kind:'loot', name:'오르골', emoji:'🎵', shape:'corner', value:170, desc:'태엽을 감으면 맑은 소리가 난다.' },

  // ===== 음식 (더블클릭으로 사용) =====
  bandage:  { id:'bandage', kind:'food', name:'반창고', emoji:'🩹', shape:'sq1', value:15, heal:18, desc:'더블클릭으로 사용. 체력 +18' },
  lunchbox: { id:'lunchbox', kind:'food', name:'도시락', emoji:'🍱', shape:'h2', value:35, heal:35, desc:'더블클릭으로 사용. 체력 +35' },
  donut_food:{ id:'donut_food', kind:'food', name:'도넛', emoji:'🍩', shape:'donut', value:55, heal:55, desc:'진짜 도넛 모양이라 가방에서 자리를 많이 먹는다. 체력 +55' },
  soda:     { id:'soda', kind:'food', name:'탄산수', emoji:'🥤', shape:'v2', value:20, heal:12, desc:'더블클릭으로 사용. 체력 +12' },
  pretzel:  { id:'pretzel', kind:'food', name:'프레첼', emoji:'🥨', shape:'plus', value:45, heal:32, desc:'십자 모양이라 가방 구석에 안 들어간다. 체력 +32' },
  croissant:{ id:'croissant', kind:'food', name:'크루아상', emoji:'🥐', shape:'corner', value:25, heal:18, desc:'꺾인 모양. 버터 풍미. 체력 +18' },
  jelly_worm:{ id:'jelly_worm', kind:'food', name:'젤리 지렁이', emoji:'🪱', shape:'zig', value:30, heal:20, desc:'꿈틀꿈틀 지그재그. 체력 +20' },
  pancake_tower:{ id:'pancake_tower', kind:'food', name:'팬케이크 탑', emoji:'🥞', shape:'v3', value:60, heal:45, desc:'3단 팬케이크. 세로로 길다. 체력 +45' },
};

// ---- 루트 테이블 (컨테이너 종류별) ----
const LOOT_POOLS = {
  att: ['pinecone_silencer','airhorn','carrot_comp','mushroom_mag','corn_mag','can_drum',
        'banana_grip','flashlight','fork_grip','glasses_scope','cucumber_scope','riceball_dot',
        'slipper_stock','backscratcher_stock','telescope',
        'leek_silencer','pepper_brake','funnel_choke','whistle_amp',
        'baguette_mag','snail_drum','eggcarton_mag','sausage_mag','dice_mag',
        'driver_grip','umbrella_grip','glove_grip','selfiestick_grip',
        'microscope_scope','magnifier_scope','crystal_scope','cctv_scope',
        'bat_stock','sponge_stock','spring_stock','teddy_stock',
        'trombone_bell','shower_head','straw_silencer','cork_plug',
        'octopus_mag','centipede_belt','takeout_mag','necklace_mag','question_mag',
        'crab_grip','cane_grip','antenna_grip','brake_grip',
        'keyhole_scope','panorama_scope','dragonfly_scope','frame_scope',
        'crutch_stock','boomerang_stock','eel_stock'],
  rareAtt: ['library_silencer','furnace_muzzle','magic_pouch','honeycomb_mag',
            'hawk_scope','samurai_grip','rocket_stock','clover_charm'],
  loot: ['gold_tooth','circuit','toad_oil','radio','bronze_kettle','lightning_relic','duck_ring',
         'cross_trophy','key_bundle','horseshoe_magnet','mahjong_set','music_box'],
  rareLoot: ['golden_duck','duck_ring','lightning_relic','radio',
             'snake_fossil','dragon_bone','frame_art','cross_trophy'],
  food: ['bandage','bandage','lunchbox','soda','donut_food',
         'pretzel','croissant','jelly_worm','pancake_tower'],
  body: ['bamboo_rifle','water_pipe','ukulele','potato_pistol',
         'trumpet_shotgun','stapler_pistol','extinguisher_smg','fishingrod_sniper'],
};

// hp: 내구도 — 총에 맞으면 부서지고 내용물은 증발 (엄폐물 vs 루팅 선택)
const CONTAINER_TYPES = {
  crate:   { name:'나무 상자', emoji:'📦', w:4, h:3, color:'#a5793f', hp:30,
             roll:[ ['att',.45], ['loot',.25], ['food',.30] ], count:[2,4] },
  fridge:  { name:'냉장고', emoji:'🧊', w:3, h:4, color:'#9fc4d0', hp:65,
             roll:[ ['food',.92], ['loot',.08] ], count:[2,4] },      // 음식 특화
  cupboard:{ name:'찬장', emoji:'🗄️', w:4, h:3, color:'#8a6a4a', hp:45,
             roll:[ ['loot',.55], ['food',.30], ['att',.15] ], count:[2,3] },
  toolbox: { name:'공구함', emoji:'🧰', w:4, h:3, color:'#c0533a', hp:40,
             roll:[ ['att',.8], ['body',.2] ], count:[1,3] },
  safe:    { name:'금고', emoji:'🔒', w:3, h:3, color:'#777f8a', hp:130,
             roll:[ ['rareLoot',.88], ['body',.12] ], count:[1,3] },  // 귀중품 특화
  locker:  { name:'공장 사물함', emoji:'🚪', w:3, h:4, color:'#6a7a5a', hp:55,
             roll:[ ['att',.5], ['body',.28], ['loot',.22] ], count:[1,3] }, // 공장: 총기부품/몸통
  pallet:  { name:'적재 팔레트', emoji:'📦', w:5, h:3, color:'#8a6a3a', hp:35,
             roll:[ ['att',.4], ['loot',.35], ['food',.25] ], count:[2,5] },  // 공장 대량
  trough:  { name:'여물통', emoji:'🌾', w:4, h:2, color:'#9a8a5a', hp:25,
             roll:[ ['food',.75], ['loot',.25] ], count:[1,3] },       // 농장
  corpse:  { name:'내 배낭 잔해', emoji:'💀', w:12, h:10, color:'#6a6a72', hp:160,
             roll:[], count:[0,0] }, // 사망 지점 회수용 (직접 채워짐)
};

// ---- 업그레이드 ----
// tiers[].mats: 업그레이드에 필요한 재료 아이템 [[itemId, 개수], ...]
const UPGRADES = {
  pack: {
    name:'배낭 확장', emoji:'🎒',
    tiers:[
      {w:6,h:4,cost:0},
      {w:7,h:4,cost:250, mats:[['circuit',1]]},
      {w:7,h:5,cost:600, mats:[['circuit',2],['bronze_kettle',1]]},
      {w:8,h:6,cost:1200, mats:[['radio',1],['gold_tooth',2]]},
    ],
    desc:t=>`배낭 크기 ${t.w}×${t.h}`,
  },
  hp: {
    name:'미니 체력', emoji:'❤️',
    tiers:[
      {v:50,cost:0},
      {v:70,cost:200, mats:[['toad_oil',1]]},
      {v:95,cost:550, mats:[['toad_oil',2],['lunchbox',1]]},
      {v:125,cost:1100, mats:[['toad_oil',3],['duck_ring',1]]},
    ],
    desc:t=>`최대 체력 ${t.v}`,
  },
  shoes: {
    name:'물갈퀴 신발', emoji:'🩰',
    tiers:[
      {v:1,cost:0},
      {v:1.12,cost:200, mats:[['slipper_stock',1]]},
      {v:1.25,cost:600, mats:[['horseshoe_magnet',1]]},
    ],
    desc:t=>`이동속도 ×${t.v}`,
  },
  store: {
    name:'창고 확장', emoji:'🏦',
    tiers:[
      {w:10,h:6,cost:0},
      {w:12,h:8,cost:350, mats:[['bronze_kettle',1]]},
      {w:14,h:10,cost:900, mats:[['key_bundle',1],['radio',1]]},
    ],
    desc:t=>`창고 크기 ${t.w}×${t.h}`,
  },
};

// ---- 지역 (출격 시 선택 · 해금형 진행) ----
// hpMul/dmgMul/spdMul: 적 배율 · dayLen: 낮 길이(초) · coinMul: 코인 배율
// loot: 상자 등급 보정(rare 확률 가산) · boss: 밤 보스 등장 · pool: 낮 배회 적 가중치
// unlock: {extracts:지역별 탈출횟수} 또는 {boss:'지역id'} — null이면 처음부터 열림
const REGIONS = {
  hill: {
    id:'hill', name:'뒷동산', emoji:'⛰️', stars:1, color:'#6a8a4a',
    desc:'평화로운 초원. 미니가 약하고 낮이 길다. 입문자용.',
    hpMul:0.8, dmgMul:0.85, spdMul:0.92, dayLen:200, coinMul:1,
    rareBonus:0, boss:false,
    pool:[['zduck',6],['spitter',1],['gunner',0.5],['bigduck',0.5]],
    nightPool:[['zduck',6],['fastduck',2],['spitter',1.2],['gunner',0.8],['bomber',0.5],['bigduck',0.5]],
    unlock:null,
    // ── 스폰 밀도 프로필 (buildRaid/tick이 참조) ──
    spawn:{
      roam:40,                    // 초기 낮 배회 미니 수
      dayCap:20, dayEvery:13,     // 낮 트리클: 상한 / 간격(초)
      duskCap:70, duskBurst:3,    // 황혼 웨이브: 상한 / 1회 스폰 수
      nightCap:140, nightBase:5, nightMax:16, nightGrow:15, // 밤 웨이브: 상한/기본수/최대수/증가속도
      indoorMul:1, // 실내 상주 미니 배수
    },
    // 원거리 발사 배율: 총알 속도 / 발사 빈도 / 점사 추가 발수 (기본=평범)
    fire:{ bulletSpd:1, fireRate:1, burstAdd:0 },
    // ── 지형 프로필 (buildRaid/렌더가 참조) ──
    biome:'meadow',        // 지형 테마 키
    factoryCount:2,        // 대형 공장 건물 수
    houseCount:22, bigHouses:5, // 집 수 / 대형 저택 수
    farmCount:3,           // 울타리 농장 수
    treeClusters:50, treeSingles:40, // 나무 군락/단독 수
    rockCount:70,          // 바위 수
    yardCount:0,           // 컨테이너 야적장 수
    river:true, lakeIsland:true, // 강 + 호수섬 생성 여부
    ground:{ // 지형 색 (풀/패치/풀포기/꽃/맵밖숲)
      base:'#3f5136', patchHi:'rgba(110,140,80,.10)', patchLo:'rgba(15,25,10,.10)',
      blade:'rgba(125,165,95,.45)', flower:true,
      outer:'#1d2618', forest1:'#243020', forest2:'#1f2a1b',
    },
  },
  factory: {
    id:'factory', name:'폐공장 지구', emoji:'🏭', stars:2, color:'#8a7a5a',
    desc:'버려진 공장 단지. 총기 부품이 넘치지만 미니도 사납고 밤이 빠르다.',
    hpMul:1.5, dmgMul:1.55, spdMul:1.18, dayLen:150, coinMul:1.6,
    rareBonus:0.03, boss:true,
    pool:[['zduck',4],['gunner',2],['sniper',1.3],['spitter',1.4],['fastduck',1.2],['bigduck',1.2],['bomber',0.9],['golden',0.2]],
    nightPool:[['zduck',4],['fastduck',3],['gunner',2.2],['sniper',1.5],['spitter',1.6],['bomber',1.6],['bigduck',1.3],['golden',0.28]],
    unlock:{extracts:{hill:3}}, // 뒷동산 3회 탈출하면 해금
    unlockDesc:'뒷동산에서 3회 탈출',
    // ── 스폰 밀도 프로필: 뒷동산보다 훨씬 빽빽하고 빠르게 몰려온다 ──
    spawn:{
      roam:80,                    // 초기 배회 대폭 증가
      dayCap:44, dayEvery:5,      // 낮에도 끊임없이 유입
      duskCap:120, duskBurst:6,
      nightCap:240, nightBase:10, nightMax:26, nightGrow:9,
      indoorMul:1.8, // 공장 실내 상주 미니 1.8배
    },
    // 총알 더 빠르고 더 자주·더 많이 쏨 (원거리 압박 강화)
    fire:{ bulletSpd:1.4, fireRate:1.55, burstAdd:3 },
    // ── 산업 지형: 콘크리트 단지, 공장 다수, 컨테이너 야적장, 나무 거의 없음 ──
    biome:'industrial',
    factoryCount:5,        // 공장 건물 대폭 증가
    houseCount:8, bigHouses:1, // 사무동/창고 소수
    farmCount:0,           // 농장 없음
    treeClusters:5, treeSingles:8, // 나무 희소 (잡초처럼)
    rockCount:22,          // 바위 대신 잔해(드럼통 등)로 렌더
    yardCount:3,           // 화물 컨테이너 야적장 다수
    river:false, lakeIsland:false, // 강 대신 배수로/기름웅덩이
    canal:true,            // 콘크리트 배수로
    ground:{ // 회갈색 콘크리트 단지 + 균열 + 기름때
      base:'#4c4a44', patchHi:'rgba(150,140,110,.10)', patchLo:'rgba(20,18,14,.18)',
      blade:'rgba(120,140,80,.28)', flower:false, crack:true, oilStain:true,
      outer:'#151513', forest1:'#22201a', forest2:'#1a1815',
    },
  },
};
const REGION_ORDER = ['hill','factory'];

// ---- 퀘스트 ----
const QUESTS = [
  {type:'kill', enemy:'any', n:15, reward:150, title:'미니 대청소'},
  {type:'kill', enemy:'zduck', n:10, reward:130, title:'좀비미니 방역'},
  {type:'kill', enemy:'fastduck', n:6, reward:170, title:'과속 단속'},
  {type:'kill', enemy:'bigduck', n:3, reward:220, rewardItem:'sponge_stock', title:'대형 미니 포획'},
  {type:'kill', enemy:'golden', n:1, reward:400, rewardItem:'can_drum', title:'황금 사냥꾼'},
  {type:'kill', enemy:'any', n:10, fetch:{item:'bandage', n:2}, reward:300, title:'전투 의무병'},
  {type:'kill', enemy:'spitter', n:4, fetch:{item:'toad_oil', n:1}, reward:280, title:'가래 특효약'},
  {type:'kill', enemy:'bomber', n:2, fetch:{item:'circuit', n:1}, reward:340, rewardItem:'pepper_brake', title:'폭발물 처리반'},
  {type:'extract', n:1, fetch:{item:'golden_duck', n:1}, reward:700, rewardItem:'fishingrod_sniper', title:'황금 배달부'},
  {type:'fetch', item:'pretzel', n:1, reward:130, title:'출출한 사장님'},
  {type:'fetch', item:'dragon_bone', n:1, reward:600, rewardItem:'teddy_stock', title:'고생물학 의뢰'},
  {type:'fetch', item:'gold_tooth', n:2, reward:280, title:'치과 재료 수급'},
  {type:'fetch', item:'circuit', n:2, reward:200, title:'라디오 수리 부품'},
  {type:'fetch', item:'toad_oil', n:1, reward:100, title:'만병통치약 주문'},
  {type:'fetch', item:'radio', n:1, reward:220, rewardItem:'flashlight', title:'전파 수집가'},
  {type:'fetch', item:'mushroom_mag', n:1, reward:120, title:'버섯 애호가'},
  {type:'extract', n:2, reward:180, title:'생존 전문가'},
  {type:'kill', enemy:'any', n:25, reward:250, unlock:'gun2', title:'이도류 면허'},
  {type:'extract', n:1, fetch:{item:'circuit', n:1}, reward:200, unlock:'stash', title:'사장님의 금고'},
  {type:'kill', enemy:'kingduck', n:1, reward:800, rewardItem:'magic_pouch', title:'왕위 찬탈'},
];
const NPC_LINES = {
  greet: ['일감 좀 받아가라.','어서 와. 위험수당은 두둑하게 쳐준다.','살아 돌아오는 놈한테만 일을 준다.'],
  busy: ['그 일은 어떻게 됐나?','기다리고 있다. 서둘러라.','밖은 험하지. 그래도 일은 일이다.'],
  done: ['오, 해냈군! 약속한 보수다!','제법인데. 또 부탁하지.'],
};

// ---- 적 정의 ----
const ENEMY_TYPES = {
  // 근접은 플레이어 도보(175)보다 빠름 — 질주/사격으로 대응해야 함
  zduck:   { name:'좀비 미니', emoji:'🧟', hp:40, spd:185, dmg:21, r:14, color:'#6a8a5a', xp:1, ranged:false },
  fastduck:{ name:'광란 미니', emoji:'😡', hp:24, spd:230, dmg:20, r:11, color:'#b05a5a', xp:1, ranged:false },
  bigduck: { name:'거구 미니', emoji:'🗿', hp:160, spd:150, dmg:30, r:22, color:'#5a6a8a', xp:3, ranged:false },
  spitter: { name:'독침 미니', emoji:'🤢', hp:26, spd:55, dmg:12, r:13, color:'#8a5aa0', xp:2, ranged:'spit' },
  sniper:  { name:'저격 미니', emoji:'🎯', hp:20, spd:48, dmg:26, r:12, color:'#3a7a8a', xp:2, ranged:'sniper' },
  gunner:  { name:'난사 미니', emoji:'🔫', hp:35, spd:58, dmg:7,  r:14, color:'#7a6a3a', xp:2, ranged:'burst' },
  bomber:  { name:'폭탄 미니', emoji:'💣', hp:30, spd:215, dmg:20, r:12, color:'#b03a3a', xp:2, ranged:false, bomber:true },
  golden:  { name:'황금 미니', emoji:'✨', hp:260, spd:200, dmg:24, r:17, color:'#d4a832', xp:10, ranged:false, elite:true },
  kingduck:{ name:'황금 미니 킹', emoji:'👑', hp:750, spd:118, dmg:22, r:32, color:'#e0b83a', xp:100, ranged:false, boss:true },
};

// 유틸
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
