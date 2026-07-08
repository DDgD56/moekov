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
  sq3: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]], // 3×3 정사각
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
  // ── 고티어·엑조틱용 해괴 셰이프 (장착 퍼즐 난이도↑) ──
  Z:     [[0,0],[1,0],[1,1],[2,1],[2,2]],                 // Z자
  arch:  [[0,1],[0,2],[1,0],[2,0],[3,0],[4,1],[4,2]],     // 아치(7칸)
  snake: [[0,0],[1,0],[1,1],[1,2],[2,2],[3,2],[3,1],[3,0],[4,0]], // 긴 뱀(9칸)
  claw:  [[0,0],[0,1],[1,1],[2,0],[2,1],[2,2]],           // 갈퀴
  branch:[[0,0],[1,0],[2,0],[2,1],[2,2],[1,1],[3,2]],     // 나뭇가지
  boot:  [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1]],           // 장화
  bolt:  [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]],           // 번개못
  wing:  [[0,1],[1,0],[1,1],[2,1],[3,0],[3,1],[4,1]],     // 날개
  cage:  [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[1,1]], // 우리(가운데 채움 9칸)
  hook:  [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1]],           // 갈고리
  blob:  [[1,0],[0,1],[1,1],[2,1],[1,2],[0,2],[2,2]],     // 끈적 얼룩(7칸)
  fork3: [[0,0],[2,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1]], // 삼지창 넓은 포크
  spiral:[[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3]], // 소용돌이
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
    // 시작 총: 약하지만 탄창·재장전으로 버틸 여유 (구 5/250/6 → 버퍼)
    base:{ dmg:6, rpm:270, spread:6.5, ammo:8, reload:1.05, noise:220, pellets:1, recoil:2.8 },
    desc:'수제 감자 권총. 소박하지만 정직하다. 탄창이 생각보다 든든하다.',
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
    // 확장성 만능 메타 완화: 맨몸 화력↓, 부착으로 키우는 맛 (구 9/430)
    base:{ dmg:8, rpm:400, spread:7.5, ammo:6, reload:1.65, noise:280, pellets:1, recoil:8.5 },
    desc:'속이 빈 대나무 소총. 확장성이 뛰어난 명품 몸통. 맨몸은 의외로 얌전하다.',
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
    // 중거리 SMG: 소화기보다 정확·한 발 셈, 장탄·연사는 밀림
    base:{ dmg:5, rpm:680, spread:9, ammo:10, reload:1.35, noise:200, pellets:1, recoil:2.2 },
    desc:'물이 새는 기관단총. 연사가 시원하고 의외로 곧게 나간다.',
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
    // 나팔과 차별: 더 빠른 후속타·탄창·조밀 산탄 (한 방 폭딜은 나팔)
    base:{ dmg:4, rpm:115, spread:12, ammo:4, reload:1.8, noise:300, pellets:5, recoil:11 },
    desc:'알로하~ 산탄이 나가는 우쿨렐레. 나팔보다 가볍고 연사된다.',
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
    // 근거리 원샷 특화 유지 (우쿨보다 느리고 넓고 아픔)
    base:{ dmg:6, rpm:72, spread:18, ammo:2, reload:2.4, noise:400, pellets:7, recoil:18 },
    desc:'빠밤!! 산탄이 부채꼴로 쏟아진다. 어깨가 얼얼한 반동. 한 방이 전부다.',
  },
  stapler_pistol: {
    id:'stapler_pistol', kind:'body', name:'스테이플러 권총', emoji:'🖇️', shape:'h2', value:150,
    bw:2, bh:1, color:'#7a8a9a', cls:'권총',
    rails:[
      {side:'front', type:'muzzle', from:0, len:1},
      {side:'bottom', type:'mag', from:1, len:1},
      {side:'top', type:'scope', from:0, len:1},
    ],
    // 정확 권총 유지, 소총급 지속화력은 살짝 하향
    base:{ dmg:6, rpm:300, spread:4, ammo:8, reload:0.95, noise:210, pellets:1, recoil:2.5 },
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
    // 탄막·장탄 특화 (워터 파이프와 역할 분리)
    base:{ dmg:3, rpm:980, spread:14, ammo:16, reload:1.25, noise:160, pellets:1, recoil:1.1 },
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
    // 원샷 정체성 강화 (DPS보다 한 발)
    base:{ dmg:38, rpm:38, spread:1.2, ammo:3, reload:2.2, noise:340, pellets:1, recoil:28 },
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
  detect_module: {
    id:'detect_module', kind:'att', sock:'scope', name:'탐지모듈', emoji:'🛰️',
    shape:'sq3', value:240, mods:{ extractDetect:true, zoom:1.15 },
    desc:'3×3 스코프 모듈. 이 파츠를 단 총을 장비 중이면 탈출구 방향이 항상 표시된다.',
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

  // ============================================================
  // ★★ 엑조틱 파츠 (폐공장★2+ / 황금습지★3 전용 풀)
  // fire: 'laser'|'flame'|'dart' — 발사 방식 변경 (총구에 달면 적용)
  // 강한 만큼 디버프·해괴한 모양으로 장착 퍼즐을 강요한다
  // ============================================================
  // ── 레이저 계열 ──
  pointer_laser: {
    id:'pointer_laser', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'고양이 레이저 포인터', emoji:'🔴',
    shape:'bolt', value:520,
    mods:{ fire:'laser', dmg:10, pierce:1, bulletSpd:2.4, rangeMul:1.3, spread:-4,
           rpmMul:0.55, ammoCost:2, noiseMul:1.5, recoilMul:0.6 },
    desc:'★★ 레이저! 관통 1. 2발치 에너지를 먹는다. 연사 반토막. 번개못 모양.',
  },
  disco_ball_lens: {
    id:'disco_ball_lens', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'디스코볼 렌즈', emoji:'🪩',
    shape:'cage', value:680,
    mods:{ fire:'laser', dmg:6, pierce:2, pellets:3, bulletSpd:2.0, spread:8,
           rpmMul:0.4, ammoCost:3, noiseMul:2.2, aim:-0.2 },
    desc:'★★ 레이저가 세 갈래로 찢어진다. 탄 3·연사 최악·우리 모양 9칸.',
  },
  barcode_scanner: {
    id:'barcode_scanner', kind:'att', rare:true, exotic:true, sock:'scope', name:'바코드 스캐너', emoji:'📠',
    shape:'boot', value:410,
    mods:{ zoom:2.4, spread:-2, aim:0.15, light:0.25, rpmMul:0.9, reload:0.4 },
    desc:'★★ 삐빅. 조준은 정확한데 재장전이 바코드 읽는 만큼 느리다. 장화 모양.',
  },
  // ── 화염 계열 ──
  chili_flamethrower: {
    id:'chili_flamethrower', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'고춧가루 방사기', emoji:'🌶️',
    shape:'arch', value:560,
    mods:{ fire:'flame', dmg:2, pellets:6, burn:2.2, rangeMul:0.28, bulletSpd:0.45, spread:22,
           rpmMul:1.35, noiseMul:2.5, ammo: -4, recoilMul:1.4 },
    desc:'★★ 화염방사! 근거리·광역·화상. 멀리 안 감. 아치 7칸·소음 지옥.',
  },
  hairdryer_torch: {
    id:'hairdryer_torch', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'헤어드라이기 토치', emoji:'💨',
    shape:'claw', value:480,
    mods:{ fire:'flame', dmg:3, pellets:4, burn:1.6, rangeMul:0.35, bulletSpd:0.55, spread:16,
           rpmMul:1.15, noiseMul:1.9, reload:0.6 },
    desc:'★★ 뜨거운 바람. 화상은 짧고 갈퀴 모양이 성가시다.',
  },
  oven_mitt_grip: {
    id:'oven_mitt_grip', kind:'att', rare:true, exotic:true, sock:'grip', name:'오븐장갑 그립', emoji:'🧤',
    shape:'U', value:360,
    mods:{ recoilMul:0.55, aim:-0.15, burn:0.4, spread:1 },
    desc:'★★ 화상 지속 +0.4초. 두꺼워서 조준이 둔하다. U자.',
  },
  // ── 다트/독 계열 ──
  mosquito_dart: {
    id:'mosquito_dart', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'모기 다트총구', emoji:'🦟',
    shape:'snake', value:540,
    mods:{ fire:'dart', dmg:3, poison:3.5, bulletSpd:0.55, rangeMul:0.9, noiseMul:0.2, spread:-2,
           rpmMul:0.5, ammoCost:1, reload:0.5 },
    desc:'★★ 독침 다트. 조용하고 지속딜. 직빵 약함·연사 느림. 뱀 9칸 악몽.',
  },
  syringe_barrel: {
    id:'syringe_barrel', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'주사기 총열', emoji:'💉',
    shape:'hook', value:500,
    mods:{ fire:'dart', dmg:5, poison:2.5, pierce:1, bulletSpd:0.7, noiseMul:0.35,
           rpmMul:0.6, ammo: -2, aim:0.1 },
    desc:'★★ 독 다트+약한 관통. 장탄 -2. 갈고리 모양.',
  },
  frog_poison_mag: {
    id:'frog_poison_mag', kind:'att', rare:true, exotic:true, sock:'mag', name:'독개구리 탄창', emoji:'🐸',
    shape:'branch', value:450,
    mods:{ ammo:12, poison:1.2, reload:1.1, dmg:-1 },
    desc:'★★ 탄에 독이 밴다(+1.2s). 재장전 느리고 데미지 -1. 나뭇가지 모양.',
  },
  // ── 기타 해괴 고성능 ──
  accordion_mag: {
    id:'accordion_mag', kind:'att', rare:true, exotic:true, sock:'mag', name:'아코디언 탄창', emoji:'🪗',
    shape:'wing', value:470,
    mods:{ ammo:24, reload:1.3, rpmMul:0.92, noiseMul:1.25 },
    desc:'★★ 펼치면 탄이 많다. 접을 때마다 시끄럽다. 날개 7칸.',
  },
  cactus_stock: {
    id:'cactus_stock', kind:'att', rare:true, exotic:true, sock:'stock', name:'선인장 개머리판', emoji:'🌵',
    shape:'Z', value:390,
    mods:{ recoilMul:0.4, aim:0.25, dmg:2, spread:2 },
    desc:'★★ 어깨에 박히면 반동이 사라진다. 대신 탄이 살짝 흔들림. Z자.',
  },
  traffic_cone_muzzle: {
    id:'traffic_cone_muzzle', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'라바콘 확성기', emoji:'🚧',
    shape:'bigL', value:430,
    mods:{ dmg:5, pellets:1, noiseMul:2.8, spread:4, recoilMul:1.3, rpmMul:0.85 },
    desc:'★★ 빵!!! 데미지↑ 소음 최악. 미니가 우르르. 왕 ㄴ자.',
  },
  pretzel_scope: {
    id:'pretzel_scope', kind:'att', rare:true, exotic:true, sock:'scope', name:'프레첼 조준경', emoji:'🥨',
    shape:'plus', value:400,
    mods:{ zoom:2.1, spread:-2.5, aim:0.1, reload:0.35 },
    desc:'★★ 구멍 세 개 중 어디로 볼지 고민된다. 재장전 +0.35.',
  },
  anchor_stock: {
    id:'anchor_stock', kind:'att', rare:true, exotic:true, sock:'stock', name:'닻 개머리판', emoji:'⚓',
    shape:'T', value:440,
    mods:{ recoilMul:0.35, aim:0.35, rpmMul:0.8, spread:-1 },
    desc:'★★ 뿌리내린 듯 안정. 연사가 묵직해진다. T자.',
  },
  rubber_chicken_grip: {
    id:'rubber_chicken_grip', kind:'att', rare:true, exotic:true, sock:'grip', name:'고무 닭 그립', emoji:'🐔',
    shape:'stairs', value:380,
    mods:{ aim:0.4, noiseMul:1.6, spread:-1, light:0.1 },
    desc:'★★ 꽉 쥐으면 삑. 조준은 최고, 소음이 닭 울음.',
  },
  // ── 끈끈이(슬로우) 계열 ──
  gum_blaster: {
    id:'gum_blaster', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'껌딱지 발사기', emoji:'🫧',
    shape:'blob', value:510,
    mods:{ fire:'glue', dmg:4, slow:2.4, bulletSpd:0.5, rangeMul:0.7, spread:10,
           rpmMul:0.7, noiseMul:0.85, recoilMul:0.8 },
    desc:'★★ 끈끈이! 맞은 미니가 느려진다. 직빵 약함·얼룩 7칸.',
  },
  honey_nozzle: {
    id:'honey_nozzle', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'꿀단지 노즐', emoji:'🍯',
    shape:'spiral', value:550,
    mods:{ fire:'glue', dmg:3, slow:3.2, pellets:3, bulletSpd:0.4, rangeMul:0.55, spread:14,
           rpmMul:0.55, reload:0.7, noiseMul:1.1 },
    desc:'★★ 끈적 산탄. 광역 슬로우. 연사·재장전 최악. 소용돌이 8칸.',
  },
  flypaper_mag: {
    id:'flypaper_mag', kind:'att', rare:true, exotic:true, sock:'mag', name:'파리지뢰 탄창', emoji:'📜',
    shape:'h4', value:420,
    mods:{ ammo:10, slow:0.8, reload:0.9, dmg:-1, rpmMul:0.95 },
    desc:'★★ 탄에 끈적임(+0.8s 슬로우). 장탄 적고 재장전 느림.',
  },
  // ── 전기(스턴·체인) 계열 ──
  taser_prong: {
    id:'taser_prong', kind:'att', rare:true, exotic:true, sock:'muzzle', name:'전기파리채 총구', emoji:'⚡',
    shape:'fork3', value:580,
    mods:{ fire:'shock', dmg:7, stun:0.85, chain:1, bulletSpd:1.3, spread:3,
           rpmMul:0.5, ammoCost:2, noiseMul:1.7, recoilMul:1.2 },
    desc:'★★ 감전! 짧은 기절+주변 1명 체인. 탄×2·연사 반. 삼지창 포크.',
  },
  battery_pack: {
    id:'battery_pack', kind:'att', rare:true, exotic:true, sock:'mag', name:'자동차 배터리', emoji:'🔋',
    shape:'sq2', value:460,
    mods:{ ammo:8, stun:0.35, chain:1, dmg:2, reload:1.2, noiseMul:1.3 },
    desc:'★★ 전기 탄 강화(스턴·체인). 무겁고 장탄 적음. 2×2.',
  },
  copper_coil_stock: {
    id:'copper_coil_stock', kind:'att', rare:true, exotic:true, sock:'stock', name:'구리 코일 개머리판', emoji:'🔌',
    shape:'donut', value:490,
    mods:{ fire:'shock', stun:0.5, aim:0.2, recoilMul:0.65, rpmMul:0.85, noiseMul:1.4 },
    desc:'★★ 개머리판만으로 감전 모드. 도넛 8칸이 짐.',
  },
  static_sock_grip: {
    id:'static_sock_grip', kind:'att', rare:true, exotic:true, sock:'grip', name:'정전기 양말 그립', emoji:'🧦',
    shape:'v3', value:370,
    mods:{ stun:0.25, aim:0.15, spread:-1, noiseMul:1.15 },
    desc:'★★ 스턴 +0.25s. 문지르면 지지직. 세로 3칸.',
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

  // ===== 음식·소모 (더블클릭/퀵슬롯 사용) =====
  bandage:  { id:'bandage', kind:'food', name:'반창고', emoji:'🩹', shape:'sq1', value:15, heal:18, desc:'더블클릭으로 사용. 체력 +18' },
  lunchbox: { id:'lunchbox', kind:'food', name:'도시락', emoji:'🍱', shape:'h2', value:35, heal:35, desc:'더블클릭으로 사용. 체력 +35' },
  donut_food:{ id:'donut_food', kind:'food', name:'도넛', emoji:'🍩', shape:'donut', value:55, heal:55, desc:'진짜 도넛 모양이라 가방에서 자리를 많이 먹는다. 체력 +55' },
  soda:     { id:'soda', kind:'food', name:'탄산수', emoji:'🥤', shape:'v2', value:20, heal:12, desc:'더블클릭으로 사용. 체력 +12' },
  pretzel:  { id:'pretzel', kind:'food', name:'프레첼', emoji:'🥨', shape:'plus', value:45, heal:32, desc:'십자 모양이라 가방 구석에 안 들어간다. 체력 +32' },
  croissant:{ id:'croissant', kind:'food', name:'크루아상', emoji:'🥐', shape:'corner', value:25, heal:18, desc:'꺾인 모양. 버터 풍미. 체력 +18' },
  jelly_worm:{ id:'jelly_worm', kind:'food', name:'젤리 지렁이', emoji:'🪱', shape:'zig', value:30, heal:20, desc:'꿈틀꿈틀 지그재그. 체력 +20' },
  pancake_tower:{ id:'pancake_tower', kind:'food', name:'팬케이크 탑', emoji:'🥞', shape:'v3', value:60, heal:45, desc:'3단 팬케이크. 세로로 길다. 체력 +45' },
  portable_detector: {
    id:'portable_detector', kind:'food', name:'휴대용 탐지기', emoji:'📡', shape:'sq1', value:90,
    heal:0, effect:'extractDetect', effectDur:10,
    desc:'1회용. 레이드 중 사용 시 10초간 가장 가까운 탈출구 방향을 표시한다. 퀵슬롯(3·4·5) 가능.',
  },
};

// ---- 루트 테이블 (컨테이너 종류별) ----
const LOOT_POOLS = {
  att: ['pinecone_silencer','airhorn','carrot_comp','mushroom_mag','corn_mag','can_drum',
        'banana_grip','flashlight','fork_grip','glasses_scope','cucumber_scope','riceball_dot',
        'slipper_stock','backscratcher_stock','telescope',
        'leek_silencer','pepper_brake','funnel_choke','whistle_amp',
        'baguette_mag','snail_drum','eggcarton_mag','sausage_mag','dice_mag',
        'driver_grip','umbrella_grip','glove_grip','selfiestick_grip',
        'microscope_scope','magnifier_scope','crystal_scope','cctv_scope','detect_module',
        'bat_stock','sponge_stock','spring_stock','teddy_stock',
        'trombone_bell','shower_head','straw_silencer','cork_plug',
        'octopus_mag','centipede_belt','takeout_mag','necklace_mag','question_mag',
        'crab_grip','cane_grip','antenna_grip','brake_grip',
        'keyhole_scope','panorama_scope','dragonfly_scope','frame_scope',
        'crutch_stock','boomerang_stock','eel_stock'],
  rareAtt: ['library_silencer','furnace_muzzle','magic_pouch','honeycomb_mag',
            'hawk_scope','samurai_grip','rocket_stock','clover_charm','detect_module'],
  // 폐공장★2+ / 황금습지★3 전용 — 발사모드·해괴 셰이프 엑조틱
  exoticAtt: ['pointer_laser','disco_ball_lens','barcode_scanner',
              'chili_flamethrower','hairdryer_torch','oven_mitt_grip',
              'mosquito_dart','syringe_barrel','frog_poison_mag',
              'accordion_mag','cactus_stock','traffic_cone_muzzle',
              'pretzel_scope','anchor_stock','rubber_chicken_grip',
              'gum_blaster','honey_nozzle','flypaper_mag',
              'taser_prong','battery_pack','copper_coil_stock','static_sock_grip'],
  loot: ['gold_tooth','circuit','toad_oil','radio','bronze_kettle','lightning_relic','duck_ring',
         'cross_trophy','key_bundle','horseshoe_magnet','mahjong_set','music_box'],
  rareLoot: ['golden_duck','duck_ring','lightning_relic','radio',
             'snake_fossil','dragon_bone','frame_art','cross_trophy'],
  food: ['bandage','bandage','lunchbox','soda','donut_food',
         'pretzel','croissant','jelly_worm','pancake_tower','portable_detector'],
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
    desc:'평화로운 초원. 미니가 약하고 낮이 길다. 입문자용. 밤엔 덤불 대장이 나타난다.',
    hpMul:0.9, dmgMul:0.95, spdMul:0.95, dayLen:190, coinMul:1,
    rareBonus:0, boss:true, bossId:'hillchief',
    pool:[['zduck',6],['spitter',1.2],['gunner',0.7],['bigduck',0.6],['fastduck',0.4]],
    nightPool:[['zduck',5],['fastduck',2.4],['spitter',1.4],['gunner',1],['bomber',0.7],['bigduck',0.6]],
    unlock:null,
    // ── 스폰 밀도 프로필 (buildRaid/tick이 참조) ──
    spawn:{
      roam:48,                    // 초기 낮 배회 미니 수
      dayCap:26, dayEvery:11,     // 낮 트리클: 상한 / 간격(초)
      duskCap:80, duskBurst:4,    // 황혼 웨이브: 상한 / 1회 스폰 수
      nightCap:160, nightBase:6, nightMax:18, nightGrow:13, // 밤 웨이브
      indoorMul:1.1, // 실내 상주 미니 배수
    },
    // 원거리 발사 배율: 총알 속도 / 발사 빈도 / 점사 추가 발수 (기본=평범)
    fire:{ bulletSpd:1, fireRate:1.05, burstAdd:0 },
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
    desc:'버려진 공장 단지. 총기 부품이 넘치지만 미니도 사납고 밤이 빠르다. 밤 보스: 황금 미니 킹.',
    hpMul:1.6, dmgMul:1.65, spdMul:1.22, dayLen:140, coinMul:1.7,
    rareBonus:0.035, boss:true, bossId:'kingduck',
    pool:[['zduck',3.5],['gunner',2.3],['sniper',1.5],['spitter',1.5],['fastduck',1.4],['bigduck',1.3],['bomber',1.1],['golden',0.25]],
    nightPool:[['zduck',3.5],['fastduck',3.2],['gunner',2.5],['sniper',1.7],['spitter',1.7],['bomber',1.8],['bigduck',1.4],['golden',0.32]],
    unlock:{extracts:{hill:3}}, // 뒷동산 3회 탈출하면 해금
    unlockDesc:'뒷동산에서 3회 탈출',
    // ── 스폰 밀도 프로필: 뒷동산보다 훨씬 빽빽하고 빠르게 몰려온다 ──
    spawn:{
      roam:90,                    // 초기 배회 대폭 증가
      dayCap:50, dayEvery:4.5,    // 낮에도 끊임없이 유입
      duskCap:135, duskBurst:7,
      nightCap:260, nightBase:11, nightMax:28, nightGrow:8,
      indoorMul:1.9, // 공장 실내 상주 미니
    },
    // 총알 더 빠르고 더 자주·더 많이 쏨 (원거리 압박 강화)
    fire:{ bulletSpd:1.45, fireRate:1.65, burstAdd:3 },
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
  // ── ★3 종반: 황금 습지 ──
  // 해금: 폐공장 보스 처치. 낮이 짧고 원거리·폭탄·엘리트 비중이 높다.
  marsh: {
    id:'marsh', name:'황금 습지', emoji:'🪷', stars:3, color:'#c9a84a',
    desc:'황금빛이 감도는 습지. 낮이 짧고 미니가 흉폭하다. 밤 보스: 황금 늪 여왕.',
    hpMul:1.95, dmgMul:1.9, spdMul:1.32, dayLen:115, coinMul:2.4,
    rareBonus:0.07, boss:true, bossId:'mirequeen',
    pool:[['zduck',2],['gunner',2.6],['sniper',2.2],['spitter',1.8],['fastduck',1.8],
          ['bigduck',1.6],['bomber',1.5],['golden',0.55]],
    nightPool:[['zduck',2],['fastduck',3.5],['gunner',2.8],['sniper',2.4],['spitter',2],
               ['bomber',2.2],['bigduck',1.7],['golden',0.7]],
    unlock:{boss:'factory'},
    unlockDesc:'폐공장에서 황금 미니 킹 처치',
    spawn:{
      roam:85,
      dayCap:52, dayEvery:4,
      duskCap:140, duskBurst:7,
      nightCap:270, nightBase:12, nightMax:30, nightGrow:7.5,
      indoorMul:2.0,
    },
    fire:{ bulletSpd:1.55, fireRate:1.8, burstAdd:4 },
    // 습지: 강·호수섬·연못, 나무 울창, 낡은 집·폐사당 느낌
    // (연못/나무는 통행·상자 배치를 막지 않도록 과하지 않게)
    biome:'swamp',
    factoryCount:2,
    houseCount:16, bigHouses:3,
    farmCount:2,
    treeClusters:55, treeSingles:40,
    rockCount:38,
    yardCount:0,
    // 호수섬(큰 물 고리)은 맵 고립을 잘 일으켜 습지에선 끔. 강+연못으로 분위기 유지.
    river:true, lakeIsland:false, ponds:true,
    ground:{
      base:'#3a4a38', patchHi:'rgba(150,150,70,.12)', patchLo:'rgba(10,20,14,.16)',
      blade:'rgba(140,160,70,.40)', flower:true, reed:true,
      outer:'#121812', forest1:'#1c2a1c', forest2:'#162016',
    },
  },
};
const REGION_ORDER = ['hill','factory','marsh'];

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
  {type:'kill', enemy:'any', n:25, reward:250, unlock:'gun2', title:'이도류 면허',
   blurb:'총기 슬롯 2를 해금한다. 작업대에서 두 번째 총을 조립할 수 있다.'},
  // 총 보관대: 칸 수는 rewardStash로만 증가 (아무 퀘스트 완료로는 안 늘어남)
  {type:'extract', n:1, fetch:{item:'circuit', n:1}, reward:200, unlock:'stash', rewardStash:2,
   title:'사장님의 금고',
   blurb:'작업대 총 보관대 2칸을 개방한다.'},
  {type:'kill', enemy:'any', n:18, reward:160, rewardStash:1, title:'금고 확장 공사',
   blurb:'총 보관대 +1칸.'},
  {type:'extract', n:2, reward:200, rewardStash:1, title:'여분 총 창고',
   blurb:'총 보관대 +1칸.'},
  {type:'fetch', item:'gold_tooth', n:3, reward:240, rewardStash:1, title:'금고 자물쇠 교체',
   blurb:'총 보관대 +1칸.'},
  {type:'kill', enemy:'golden', n:1, fetch:{item:'circuit', n:1}, reward:300, rewardStash:1, title:'프리미엄 금고',
   blurb:'총 보관대 +1칸 (최대 6칸).'},
  // 엑조틱 입문: 폐공장 해금 후 우선 제안 → 공장 1회 탈출 → ★★ 레이저 포인터
  {type:'extract', n:1, region:'factory', reward:320, rewardItem:'pointer_laser', unlock:'exoticIntro',
   title:'수상한 총구 주문서',
   blurb:'폐공장에서 살아 나와라. 이상한 총구를 쥐여 주마.'},
  {type:'kill', enemy:'kingduck', n:1, reward:800, rewardItem:'magic_pouch', title:'왕위 찬탈'},
  {type:'extract', n:1, fetch:{item:'golden_duck', n:1}, reward:900, rewardItem:'rocket_stock', title:'습지의 황금'},
  {type:'kill', enemy:'golden', n:2, reward:550, rewardItem:'hawk_scope', title:'황금 습지 사냥'},
  {type:'kill', enemy:'sniper', n:5, fetch:{item:'circuit', n:1}, reward:420, rewardItem:'panorama_scope', title:'습지 저격수 소탕'},
];
const NPC_LINES = {
  greet: ['일감 좀 받아가라.','어서 와. 위험수당은 두둑하게 쳐준다.','살아 돌아오는 놈한테만 일을 준다.'],
  busy: ['그 일은 어떻게 됐나?','기다리고 있다. 서둘러라.','밖은 험하지. 그래도 일은 일이다.'],
  done: ['오, 해냈군! 약속한 보수다!','제법인데. 또 부탁하지.'],
  // 부품 수집가 (엑조틱 NPC)
  exoGreet: [
    '이상한 부품만 모은다. 공장 쪽 일이 있으면 나한테 와.',
    '일반 의뢰는 창구로. 여기는 괴상한 총구 전문이야.',
    '레일 안 맞는 고철이 제일 좋지. 관심 있으면 일거리 줄게.',
  ],
  exoBusy: [
    '폐공장에서 살아서 돌아와. 그다음 얘기하자.',
    '아직이야? 부품은 도망 안 가. 너는 조심하고.',
    '공장 탈출이 먼저야. 나는 여기서 납땜이나 하지.',
  ],
  exoDone: [
    '공장에서 주운 고철 같지? 총에 달아 봐. 모양은 괴상해도 불이 나간다.',
    '레이저다. 탄을 두 발씩 먹으니 조심하고 — 작업대에서 돌려 가며 맞춰 봐.',
    '자, ★★ 부품이다. 사격장에서 한 발 쏴 보고 와.',
  ],
  exoLocked: [
    '아직 공장 문이 안 열렸군. 뒷동산에서 더 버텨 봐.',
    '폐공장이 열리면 나한테 와. 이상한 일거리 줄 테니까.',
  ],
  exoIdle: [
    '입문은 끝났지? 이제 공장·습지 상자에서 ★★를 직접 찾아.',
    '레이저·화염·다트… 레일에 우겨 넣는 맛이 핵심이야.',
    '해괴한 모양일수록 세다. 가방 정리 연습 많이 해.',
  ],
};

// ---- 적 정의 ----
const ENEMY_TYPES = {
  // 근접은 플레이어 도보(175)보다 빠름 — 질주/사격으로 대응해야 함
  zduck:   { name:'좀비 미니', emoji:'🧟', hp:42, spd:188, dmg:22, r:14, color:'#6a8a5a', xp:1, ranged:false },
  fastduck:{ name:'광란 미니', emoji:'😡', hp:26, spd:235, dmg:21, r:11, color:'#b05a5a', xp:1, ranged:false },
  bigduck: { name:'거구 미니', emoji:'🗿', hp:170, spd:152, dmg:32, r:22, color:'#5a6a8a', xp:3, ranged:false },
  spitter: { name:'독침 미니', emoji:'🤢', hp:28, spd:55, dmg:13, r:13, color:'#8a5aa0', xp:2, ranged:'spit' },
  sniper:  { name:'저격 미니', emoji:'🎯', hp:22, spd:48, dmg:28, r:12, color:'#3a7a8a', xp:2, ranged:'sniper' },
  gunner:  { name:'난사 미니', emoji:'🔫', hp:36, spd:58, dmg:8,  r:14, color:'#7a6a3a', xp:2, ranged:'burst' },
  bomber:  { name:'폭탄 미니', emoji:'💣', hp:32, spd:218, dmg:22, r:12, color:'#b03a3a', xp:2, ranged:false, bomber:true },
  golden:  { name:'황금 미니', emoji:'✨', hp:280, spd:205, dmg:26, r:17, color:'#d4a832', xp:10, ranged:false, elite:true },
  // ── 지역 보스 (밤 중반 1회 · 지역 배율 미적용 · bossStyle로 AI 분기) ──
  // 뒷동산: 돌진·가시·속박 — 입문용 보스
  hillchief:{ name:'덤불 대장', emoji:'🌿', hp:520, spd:138, dmg:20, r:26, color:'#4a8a3a',
    xp:55, ranged:false, boss:true, bossStyle:'thorn',
    blurb:'가시 연사와 뿌리 속박. 돌진에 주의.' },
  // 폐공장: 돌진·꽥노바·부하 소환 — 기존 킹
  kingduck:{ name:'황금 미니 킹', emoji:'👑', hp:820, spd:122, dmg:24, r:32, color:'#e0b83a',
    xp:100, ranged:false, boss:true, bossStyle:'king',
    blurb:'돌진·방사탄·부하 소환. 왕관을 떨어뜨린다.' },
  // 황금 습지: 독·도약·포자 — 최강
  mirequeen:{ name:'황금 늪 여왕', emoji:'🪷', hp:1180, spd:98, dmg:26, r:34, color:'#c9a030',
    xp:150, ranged:false, boss:true, bossStyle:'mire',
    blurb:'독 포자·도약 습격·독침 부하. 체력이 압도적.' },
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
