// ============================================================
// MoeKov — 16×16 도트 아이템 아이콘
// 아이템 id/이름 키워드로 실루엣을 구분 (이모지 대체)
// ============================================================

const _iconCache = new Map();

function iconHash(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h>>>0;
}

function itemIconCanvas(def, hidden){
  const id = hidden ? '???' : (def && def.id) || 'unknown';
  const key = id + (hidden?':h':'') + (def&&def.exotic?':x':'') + (def&&def.rare?':r':'');
  if(_iconCache.has(key)) return _iconCache.get(key);

  const S = 16;
  const cn = document.createElement('canvas');
  cn.width = S; cn.height = S;
  const g = cn.getContext('2d');
  g.imageSmoothingEnabled = false;

  const px = (x,y,c)=>{ if(x<0||y<0||x>=S||y>=S||!c) return; g.fillStyle=c; g.fillRect(x|0,y|0,1,1); };
  const rect = (x,y,w,h,c)=>{ for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++) px(x+xx,y+yy,c); };
  const outline = (pts,c)=>{ for(const [x,y] of pts) px(x,y,c); };

  if(hidden){
    rect(4,3,8,10,'#4a4a44');
    rect(5,4,6,8,'#2e2e2a');
    // ?
    rect(7,5,2,2,'#c9c9b0');
    rect(8,7,1,2,'#c9c9b0');
    rect(7,10,2,1,'#c9c9b0');
    _iconCache.set(key, cn); return cn;
  }

  const ink = '#1a1410';
  const tag = (id + ' ' + (def.name||'') + ' ' + (def.emoji||'')).toLowerCase();
  const has = (...ws)=> ws.some(w=> tag.includes(w));

  // 팔레트
  const C = {
    skin:'#f0c8a0', wood:'#8a6a3a', darkWood:'#5a4028', metal:'#8a9098', darkMetal:'#4a5058',
    gold:'#e8c84a', red:'#c94a3a', green:'#5a9a4a', leaf:'#3a7a3a', blue:'#4a8ac0',
    purple:'#8a5ab0', pink:'#e8a0b0', orange:'#e8853a', yellow:'#f0d060', white:'#e8e4d8',
    black:'#2a2420', cyan:'#5ad0e8', slime:'#7ad060', brown:'#7a5a38',
  };

  // 공통 그림자
  rect(2,14,12,1,'rgba(0,0,0,.3)');

  // ========== 총 몸통 ==========
  if(def.kind==='body'){
    if(has('potato','감자')){
      // 감자 + 총구
      rect(3,5,9,7,C.yellow); rect(4,6,7,5,'#d4b040');
      rect(2,7,2,3,C.darkWood); // 눈
      px(5,7,ink); px(8,7,ink); px(6,9,ink);
      rect(11,6,4,4,C.metal); rect(13,7,2,2,C.darkMetal);
    } else if(has('bamboo','대나무')){
      rect(1,6,13,4,C.green); rect(2,7,11,2,'#6ab84a');
      for(let x=3;x<13;x+=3) rect(x,6,1,4,'#3a6a2a');
      rect(0,7,2,3,C.darkWood); rect(13,5,3,2,C.leaf);
    } else if(has('water_pipe','파이프','워터')){
      rect(1,6,12,4,C.metal); rect(2,7,10,2,'#a0a8b0');
      rect(12,5,3,6,C.blue); rect(0,7,2,3,C.darkMetal);
      px(4,5,C.cyan); px(8,5,C.cyan); // 물방울
    } else if(has('ukulele','우쿨')){
      rect(4,3,7,9,C.purple); rect(5,4,5,7,'#a06ac0');
      rect(6,1,3,3,C.wood); rect(7,0,1,2,C.darkWood); // 넥
      px(6,6,ink); px(8,6,ink); px(7,8,ink); // 사운드홀
      rect(10,5,5,3,C.metal);
    } else if(has('trumpet','나팔')){
      rect(2,7,8,3,C.gold); rect(9,5,5,7,C.orange);
      rect(11,4,4,9,'#d07030'); rect(1,6,2,5,C.yellow);
    } else if(has('stapler','스테이플')){
      rect(2,5,11,6,C.metal); rect(3,6,9,4,'#6a7a8a');
      rect(10,4,4,3,C.darkMetal); rect(2,9,4,3,C.black);
    } else if(has('extinguish','소화')){
      rect(5,2,5,11,C.red); rect(6,3,3,9,'#a03a30');
      rect(7,0,2,3,C.metal); rect(9,1,5,2,C.darkMetal); // 호스
      rect(4,12,7,2,C.black);
    } else if(has('fishing','낚싯','저격') && !has('lotus','연꽃')){
      rect(0,7,14,2,C.blue); rect(1,6,12,1,C.metal);
      rect(12,5,3,3,C.darkMetal); rect(0,5,3,6,C.wood);
      rect(13,3,1,3,C.leaf); // 찌
    } else if(has('bramble','가시덤불','덤불 산탄')){
      rect(1,6,11,4,C.green); rect(2,7,9,2,'#4a8a3a');
      px(3,5,C.leaf); px(6,5,C.leaf); px(9,5,C.leaf);
      px(4,10,C.leaf); px(8,10,C.leaf);
      rect(11,5,4,6,C.darkMetal); rect(0,7,2,3,C.wood);
    } else if(has('crown_smg','왕관 기관')){
      rect(1,6,11,4,C.gold); rect(2,7,9,2,'#e0b83a');
      rect(4,3,6,3,C.gold); // 왕관
      px(5,2,C.red); px(7,1,C.red); px(9,2,C.red);
      rect(11,5,4,6,C.darkMetal); rect(0,7,2,3,C.yellow);
    } else if(has('lotus_lance','연꽃 장창','연꽃')){
      rect(0,7,13,2,C.gold); rect(1,6,11,1,'#e0c04a');
      rect(10,4,5,3,C.pink); rect(11,3,3,2,C.pink); // 연꽃
      px(12,4,C.yellow);
      rect(0,5,3,6,C.wood); rect(13,6,2,4,C.darkMetal);
    } else {
      rect(1,7,12,3,C.metal); rect(0,6,3,5,C.darkWood); rect(12,6,3,3,C.darkMetal);
    }
  }
  // ========== 부착물 ==========
  else if(def.kind==='att'){
    // --- 총구 계열 특수 ---
    if(has('pointer_laser','레이저 포인터','고양이 레이저')){
      rect(2,6,8,4,C.white); rect(3,7,6,2,C.red);
      rect(9,5,5,6,C.black); px(13,7,C.red); px(14,7,C.red); px(14,6,C.red);
    } else if(has('disco')){
      rect(4,3,8,10,C.metal); rect(5,4,6,8,'#6a7080');
      px(6,5,C.cyan); px(9,6,C.pink); px(7,8,C.yellow); px(10,9,C.blue); px(6,10,C.green);
    } else if(has('chili','고추') && has('flame','방사','flamethrower') || has('chili_flamethrower')){
      rect(2,6,7,4,C.metal); rect(8,4,6,8,C.red);
      rect(10,3,4,3,C.orange); rect(11,2,3,2,C.yellow);
      rect(3,5,2,1,C.leaf);
    } else if(has('hairdryer','드라이')){
      rect(3,4,7,6,C.purple); rect(9,5,5,4,C.darkMetal);
      rect(4,9,3,5,C.purple); // 손잡이
      rect(12,6,3,2,C.orange);
    } else if(has('mosquito','모기')){
      rect(3,6,8,3,C.slime); rect(10,5,5,2,C.darkMetal);
      rect(2,5,2,2,ink); rect(2,8,2,2,ink); // 날개 점
      px(13,5,C.red); // 침
    } else if(has('syringe','주사')){
      rect(4,3,4,9,C.white); rect(5,4,2,7,C.cyan);
      rect(3,11,6,2,C.metal); rect(5,1,2,3,C.darkMetal);
      rect(5,13,2,2,C.slime);
    } else if(has('gum','껌딱')){
      rect(4,5,8,6,C.pink); rect(5,6,6,4,'#f0b0c0');
      px(6,7,C.white); px(9,8,C.white);
      rect(11,7,4,2,C.pink);
    } else if(has('honey_nozzle','꿀단지 노즐') || (has('honey') && has('nozzle','노즐'))){
      rect(4,4,7,8,C.gold); rect(5,5,5,6,'#d4a830');
      rect(10,6,5,4,C.yellow); rect(6,2,3,3,C.brown);
    } else if(has('taser','전기파리','감전 총')){
      rect(3,5,7,5,C.yellow); rect(9,4,5,7,C.darkMetal);
      rect(12,3,3,2,C.cyan); rect(12,9,3,2,C.cyan); // 포크
      px(13,5,C.cyan); px(13,7,C.cyan);
    } else if(has('traffic_cone','라바콘','콘 확성')){
      rect(6,2,4,2,C.white); rect(5,4,6,3,C.orange);
      rect(4,7,8,3,C.orange); rect(3,10,10,3,C.orange);
      rect(5,5,6,1,C.white);
    } else if(has('airhorn','에어혼','혼')){
      rect(2,6,6,4,C.red); rect(7,4,6,8,C.orange);
      rect(11,3,4,10,C.yellow);
    } else if(has('pinecone','솔방울')){
      rect(5,3,6,10,C.brown); rect(6,4,4,8,'#9a7040');
      for(let y=5;y<12;y+=2){ px(4,y,C.brown); px(11,y,C.brown); }
    } else if(has('carrot','당근')){
      rect(5,3,5,10,C.orange); rect(6,4,3,8,'#e07030');
      rect(5,1,2,3,C.leaf); rect(7,0,2,3,C.leaf); rect(9,1,2,2,C.leaf);
    } else if(has('leek','파 소음')){
      rect(6,1,3,12,C.leaf); rect(5,10,5,4,C.white);
      rect(6,2,3,2,C.green);
    } else if(has('pepper','고추') && !has('flame')){
      rect(5,4,5,9,C.red); rect(6,5,3,7,'#d04030');
      rect(6,2,3,3,C.leaf);
    } else if(has('funnel','깔때기')){
      rect(6,2,4,3,C.metal); rect(4,5,8,3,C.metal); rect(3,8,10,3,C.darkMetal);
    } else if(has('whistle','호루라기')){
      rect(3,6,10,4,C.metal); rect(11,5,3,3,C.darkMetal); px(5,7,ink);
    } else if(has('trombone','트롬본')){
      rect(2,6,9,4,C.gold); rect(10,3,5,10,C.yellow);
    } else if(has('shower','샤워')){
      rect(6,2,3,6,C.metal); rect(3,7,10,4,C.blue);
      for(let x=4;x<12;x+=2) px(x,12,C.cyan);
    } else if(has('straw','빨대')){
      rect(6,1,3,13,C.pink); rect(6,1,3,3,C.white); rect(7,12,1,3,C.red);
    } else if(has('cork','코르크')){
      rect(5,4,6,8,C.brown); rect(6,5,4,6,'#c9a060');
    } else if(has('furnace','용광로')){
      rect(3,4,10,9,C.darkMetal); rect(5,6,6,5,C.orange);
      rect(6,7,4,3,C.yellow); px(7,5,C.red);
    } else if(has('library','도서관','정적')){
      rect(3,3,10,11,C.wood); rect(4,4,8,9,C.darkWood);
      rect(5,5,2,7,C.red); rect(8,5,2,7,C.blue); rect(11,5,1,7,C.green);
    } else if(has('silencer','소음기') || (def.sock==='muzzle' && has('소음'))){
      rect(2,6,11,4,C.darkMetal); rect(3,7,9,2,C.metal);
      for(let x=4;x<12;x+=2) px(x,8,ink);
    } else if(has('pipe_wrench','파이프렌치','렌치')){
      rect(2,7,10,3,C.metal); rect(10,4,4,9,C.darkMetal); rect(11,5,2,3,C.orange);
    } else if(has('oil_filter','오일필터','오일')){
      rect(5,2,6,12,C.darkMetal); rect(6,3,4,10,'#3a4a3a'); rect(6,2,4,2,C.orange);
    } else if(has('weld_mask','용접면','용접')){
      rect(3,4,10,9,C.darkMetal); rect(5,6,6,5,C.black); rect(6,7,4,3,C.red);
    } else if(has('reed_silencer','갈대 소음') || (has('reed','갈대') && def.sock==='muzzle')){
      rect(3,5,10,6,C.leaf); rect(4,6,8,4,'#6a9a40'); for(let x=5;x<12;x+=2) px(x,5,C.yellow);
    } else if(has('mud_choke','진흙')){
      rect(4,5,8,6,C.brown); rect(5,6,6,4,'#6a4a30'); px(7,7,C.darkMetal);
    } else if(has('gold_nugget','금덩이')){
      rect(5,5,6,6,C.gold); rect(6,6,4,4,'#f0d060'); px(7,7,C.white);
    } else if(has('dryice','드라이아이스','냉동')){
      rect(3,5,8,6,C.cyan); rect(4,6,6,4,'#a0e8ff'); rect(10,6,4,4,C.metal);
      px(5,7,C.white); px(8,8,C.white);
    } else if(has('icicle','고드름')){
      rect(2,7,8,3,C.metal); rect(9,4,5,9,C.cyan); rect(10,5,3,7,'#c8f0ff');
      px(11,3,C.white);
    } else if(has('pneumatic','공압')){
      rect(2,6,8,4,C.metal); rect(9,4,5,8,C.darkMetal); rect(11,5,3,3,C.cyan);
      px(12,6,C.white); px(13,8,C.white);
    } else if(has('sledge','해머헤드','해머')){
      rect(2,7,7,3,C.metal); rect(8,4,6,9,C.darkMetal); rect(9,5,4,7,'#6a7080');
    } else if(def.sock==='muzzle'){
      rect(2,6,9,4,C.metal); rect(10,5,5,6,C.darkMetal);
    }
    // --- 탄창 ---
    else if(has('mushroom','버섯')){
      rect(4,6,8,7,C.white); rect(3,3,10,5,C.red);
      px(5,4,C.white); px(8,5,C.white); px(10,4,C.white);
    } else if(has('corn','옥수수')){
      rect(5,2,6,12,C.yellow); rect(6,3,4,10,'#e8c84a');
      for(let y=4;y<13;y+=2){ px(5,y,C.gold); px(10,y,C.gold); }
      rect(6,1,4,2,C.leaf);
    } else if(has('can_drum','통조림','참치')){
      rect(3,3,10,11,C.metal); rect(4,4,8,9,'#6a8a9a');
      rect(4,4,8,2,C.red); rect(6,8,4,3,C.blue);
    } else if(has('baguette','바게트')){
      rect(1,6,14,4,C.yellow); rect(2,7,12,2,'#e8c070');
      for(let x=3;x<13;x+=3) px(x,6,C.brown);
    } else if(has('snail','달팽이')){
      rect(6,5,7,7,C.brown); rect(7,6,5,5,'#c99060');
      rect(2,8,5,3,C.slime); px(3,7,ink);
    } else if(has('egg','계란')){
      rect(4,3,8,5,C.white); rect(3,7,10,5,C.white);
      rect(5,4,2,2,'#f0a0a0'); rect(9,5,2,2,'#f0a0a0');
    } else if(has('sausage','소시지')){
      rect(2,6,12,4,C.red); rect(3,7,10,2,'#d06050');
      px(4,6,ink); px(8,9,ink);
    } else if(has('dice','주사위')){
      rect(4,4,8,8,C.white); rect(5,5,6,6,'#e8e8e0');
      px(6,6,ink); px(9,6,ink); px(7,8,ink); px(6,10,ink); px(9,10,ink);
    } else if(has('octopus','문어')){
      rect(5,3,6,5,C.purple); rect(4,7,2,5,C.purple); rect(7,8,2,5,C.purple);
      rect(10,7,2,5,C.purple); px(6,5,ink); px(9,5,ink);
    } else if(has('centipede','지네')){
      for(let x=1;x<15;x+=2) rect(x,7,2,3,C.orange);
      for(let x=2;x<14;x+=2){ px(x,6,C.red); px(x,10,C.red); }
    } else if(has('takeout','포장')){
      rect(3,4,10,9,C.white); rect(4,5,8,7,C.red);
      rect(3,4,10,2,C.white); rect(7,8,2,3,C.gold);
    } else if(has('necklace','진주','목걸이')){
      for(let i=0;i<5;i++) pBlobDot(px, 3+i*2, 6+((i%2)?1:0), 2, C.white);
      rect(6,10,4,3,C.gold);
    } else if(has('question','물음표')){
      rect(5,3,6,3,C.purple); rect(9,5,2,3,C.purple);
      rect(7,8,2,2,C.purple); rect(7,11,2,2,C.purple);
    } else if(has('magic_pouch','요술','주머니')){
      rect(4,5,8,8,C.purple); rect(5,6,6,6,'#7a4aa0');
      rect(5,3,6,3,C.gold); px(7,8,C.yellow);
    } else if(has('honeycomb','벌집')){
      rect(4,3,8,10,C.gold); rect(5,4,6,8,'#e8c84a');
      px(6,6,C.brown); px(9,6,C.brown); px(7,9,C.brown);
    } else if(has('frog','독개구리')){
      rect(4,5,8,6,C.slime); rect(3,7,2,3,C.green); rect(11,7,2,3,C.green);
      px(6,6,ink); px(9,6,ink); rect(6,9,4,1,C.red);
    } else if(has('accordion','아코디언')){
      rect(2,4,12,8,C.red); for(let x=3;x<13;x+=2) rect(x,5,1,6,C.black);
      rect(2,4,2,8,C.wood); rect(12,4,2,8,C.wood);
    } else if(has('battery','배터리')){
      rect(4,3,8,11,C.darkMetal); rect(5,4,6,9,C.red);
      rect(6,2,4,2,C.metal); rect(5,5,6,3,C.white);
    } else if(has('flypaper','파리지뢰','끈끈이 탄')){
      rect(2,4,12,9,C.yellow); rect(3,5,10,7,'#e8d060');
      px(5,7,ink); px(9,8,C.brown); px(7,10,ink);
    } else if(has('gear_drum','톱니','기어')){
      rect(3,3,10,10,C.metal); rect(5,5,6,6,C.darkMetal);
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; px(8+Math.cos(a)*5|0, 8+Math.sin(a)*5|0, C.gold); }
    } else if(has('conveyor','컨베이어')){
      rect(1,6,14,4,C.darkMetal); for(let x=2;x<14;x+=3) rect(x,7,2,2,C.yellow);
    } else if(has('lotus','연꽃')){
      rect(6,7,4,5,C.green); rect(3,5,4,4,C.pink); rect(9,5,4,4,C.pink);
      rect(5,3,6,4,C.pink); px(7,6,C.yellow);
    } else if(has('cattail','부들')){
      rect(7,2,2,12,C.brown); rect(6,3,4,6,'#8a5a30'); rect(6,1,4,2,C.leaf);
    } else if(def.sock==='mag'){
      rect(5,3,6,11,C.darkMetal); rect(6,4,4,9,C.metal);
    }
    // --- 그립 ---
    else if(has('banana','바나나')){
      rect(3,4,3,3,C.yellow); rect(4,6,4,3,C.yellow); rect(7,8,5,3,C.yellow);
      rect(11,9,3,3,C.yellow); px(12,8,C.brown);
    } else if(has('flashlight','손전등','라이트') && !has('barcode')){
      rect(5,2,5,10,C.metal); rect(6,3,3,8,C.darkMetal);
      rect(5,11,5,3,C.yellow); rect(6,12,3,2,C.white);
    } else if(has('fork','포크') && def.sock==='grip'){
      rect(6,8,4,6,C.metal); rect(5,2,2,8,C.metal); rect(7,2,2,8,C.metal); rect(9,2,2,8,C.metal);
    } else if(has('driver','드라이버','십자')){
      rect(7,1,2,10,C.metal); rect(5,10,6,4,C.yellow); rect(6,2,4,2,C.darkMetal);
    } else if(has('umbrella','우산')){
      rect(3,4,10,4,C.red); rect(7,7,2,7,C.wood); rect(2,5,12,2,C.red);
    } else if(has('workglove','작업장갑') || (has('glove','장갑') && has('work','작업'))){
      rect(4,3,8,10,C.orange); rect(5,4,6,8,'#c07030');
      rect(3,8,2,4,C.orange); rect(11,6,2,5,C.orange);
    } else if(has('glove','장갑') && !has('oven')){
      rect(4,3,8,10,C.skin); rect(5,4,6,8,'#e8b890');
      rect(3,8,2,4,C.skin); rect(11,6,2,5,C.skin);
    } else if(has('clamp','클램프')){
      rect(4,3,8,3,C.metal); rect(5,5,2,8,C.darkMetal); rect(9,5,2,8,C.darkMetal);
      rect(4,12,8,2,C.metal);
    } else if(has('vine','덩굴')){
      rect(7,2,2,12,C.leaf); rect(4,4,3,2,C.green); rect(9,7,3,2,C.green);
      rect(5,10,4,2,C.leaf);
    } else if(has('shell_grip','조개') || (has('shell','조개') && def.sock==='grip')){
      rect(3,5,10,7,C.pink); rect(4,6,8,5,'#e8c0c8'); px(7,8,C.white);
    } else if(has('oven_mitt','오븐장갑','오븐')){
      rect(3,3,10,11,C.red); rect(4,4,8,9,'#d05040');
      rect(2,8,3,5,C.red); rect(5,2,6,3,C.white);
    } else if(has('selfiestick','셀카')){
      rect(7,1,2,13,C.black); rect(4,1,8,3,C.metal); rect(5,2,6,1,C.blue);
    } else if(has('crab','게')){
      rect(5,5,6,5,C.red); rect(2,4,4,3,C.red); rect(10,4,4,3,C.red);
      px(6,6,ink); px(9,6,ink);
    } else if(has('cane','지팡이')){
      rect(7,2,2,12,C.wood); rect(5,2,5,3,C.darkWood);
    } else if(has('antenna','안테나')){
      rect(7,4,2,10,C.metal); rect(4,2,8,3,C.darkMetal); px(7,1,C.red);
    } else if(has('brake','브레이크','자전거')){
      rect(3,5,10,3,C.metal); rect(5,7,2,6,C.black); rect(9,7,2,6,C.black);
    } else if(has('samurai','사무라이')){
      rect(5,2,6,12,C.black); rect(6,3,4,10,C.red); rect(7,1,2,2,C.gold);
    } else if(has('clover','클로버','네잎')){
      rect(6,7,4,6,C.leaf); rect(4,5,4,4,C.green); rect(8,5,4,4,C.green);
      rect(6,3,4,4,C.green); rect(6,7,4,4,C.green);
    } else if(has('chicken','닭','고무 닭')){
      rect(5,5,7,6,C.yellow); rect(10,6,3,2,C.orange); px(7,6,ink);
      rect(6,3,4,3,C.red);
    } else if(has('sock','양말','정전기')){
      rect(5,2,6,10,C.white); rect(4,10,8,4,C.white);
      rect(5,3,6,2,C.blue); px(7,6,C.cyan); px(9,8,C.cyan);
    } else if(def.sock==='grip'){
      rect(5,3,6,11,C.brown); rect(6,4,4,9,C.wood);
    }
    // --- 스코프 ---
    else if(has('glasses','안경')){
      rect(2,6,5,5,C.metal); rect(9,6,5,5,C.metal); rect(7,7,2,2,C.metal);
      rect(3,7,3,3,C.cyan); rect(10,7,3,3,C.cyan);
    } else if(has('cucumber','오이')){
      rect(3,5,10,6,C.green); rect(4,6,8,4,'#5aaa4a');
      px(6,7,C.leaf); px(9,8,C.leaf);
    } else if(has('telescope','망원경')){
      rect(1,6,6,4,C.metal); rect(6,5,5,6,C.darkMetal); rect(10,4,5,8,C.black);
      px(13,7,C.blue);
    } else if(has('riceball','주먹밥','도트')){
      rect(4,4,8,9,C.white); rect(5,5,6,7,'#f0f0e8');
      rect(4,10,8,3,ink); px(7,7,ink);
    } else if(has('microscope','현미경')){
      rect(6,1,4,6,C.metal); rect(4,7,8,6,C.darkMetal); rect(5,12,6,2,C.black);
    } else if(has('magnifier','돋보기')){
      rect(4,3,7,7,C.metal); rect(5,4,5,5,C.cyan); rect(9,9,5,5,C.brown);
    } else if(has('crystal','수정')){
      rect(6,2,4,3,C.purple); rect(4,5,8,5,C.purple); rect(5,10,6,3,'#c090e0');
      px(7,6,C.white);
    } else if(has('cctv','감시')){
      rect(3,5,10,6,C.darkMetal); rect(4,6,5,4,C.black); rect(10,7,3,3,C.red);
      rect(7,11,2,3,C.metal);
    } else if(has('keyhole','열쇠구멍')){
      rect(4,3,8,10,C.gold); rect(6,5,4,4,ink); rect(7,9,2,3,ink);
    } else if(has('panorama','파노라마','선글라스')){
      rect(1,6,14,4,ink); rect(2,7,5,2,C.blue); rect(9,7,5,2,C.blue);
    } else if(has('dragonfly','잠자리')){
      rect(6,6,4,4,C.slime); rect(2,5,5,3,C.cyan); rect(9,5,5,3,C.cyan);
      rect(2,8,5,3,C.cyan); rect(9,8,5,3,C.cyan);
    } else if(has('frame_scope','액자 조준') || (has('frame') && def.sock==='scope')){
      rect(2,2,12,12,C.wood); rect(4,4,8,8,C.cyan); rect(5,5,6,6,'#80c0e0');
    } else if(has('hawk','매의')){
      rect(3,5,10,5,C.brown); rect(4,6,8,3,C.gold); px(12,6,ink); rect(1,6,3,2,C.yellow);
    } else if(has('barcode','바코드','스캐너')){
      rect(2,4,12,8,C.red); rect(3,5,10,6,C.black);
      for(let x=4;x<12;x+=2) rect(x,5,1,6,C.white);
      rect(12,6,3,2,C.red);
    } else if(has('pretzel','프레첼') && def.sock==='scope'){
      rect(4,4,3,3,C.brown); rect(9,4,3,3,C.brown); rect(4,9,3,3,C.brown); rect(9,9,3,3,C.brown);
      rect(5,6,6,4,C.brown); px(6,5,C.white); px(10,10,C.white);
    } else if(has('detect','탐지') && def.sock==='scope'){
      // 탐지모듈 3×3 — 위성 안테나
      rect(2,2,12,12,C.darkMetal); rect(3,3,10,10,'#2a3840');
      rect(6,4,4,4,C.cyan); rect(7,5,2,2,C.white);
      rect(4,9,8,2,C.metal); rect(7,11,2,3,C.metal);
      px(4,4,C.green); px(11,4,C.green); px(4,11,C.green); px(11,11,C.green);
    } else if(has('rivet','리벳')){
      rect(4,4,8,8,C.metal); rect(6,6,4,4,C.darkMetal); px(5,5,C.gold); px(10,5,C.gold); px(5,10,C.gold); px(10,10,C.gold);
    } else if(has('safety_goggles','안전고글','고글')){
      rect(2,6,12,5,C.darkMetal); rect(3,7,4,3,C.cyan); rect(9,7,4,3,C.cyan); rect(7,8,2,1,C.metal);
    } else if(has('mosquito_net','모기장')){
      rect(3,3,10,10,C.white); for(let y=4;y<12;y+=2) for(let x=4;x<12;x+=2) px(x,y,C.darkMetal);
    } else if(has('dew_lens','이슬')){
      rect(5,4,6,8,C.cyan); rect(6,5,4,6,'#a0e0f0'); px(7,6,C.white); px(8,9,C.white);
    } else if(def.sock==='scope'){
      rect(2,6,12,4,C.darkMetal); rect(3,7,10,2,C.metal); rect(12,5,3,6,C.blue);
    }
    // --- 개머리판 ---
    else if(has('slipper','슬리퍼')){
      rect(2,6,12,6,C.blue); rect(3,7,10,4,'#5a8ac0'); rect(2,5,5,3,C.white);
    } else if(has('backscratch','효자손')){
      rect(3,7,11,3,C.wood); rect(11,4,4,9,C.skin); px(12,5,ink);
    } else if(has('bat_stock','야구','방망이')){
      rect(2,6,12,4,C.wood); rect(1,5,3,6,C.darkWood); rect(12,5,3,6,C.yellow);
    } else if(has('sponge','스펀지')){
      rect(3,4,10,9,C.yellow); rect(4,5,8,7,'#e8d060');
      px(6,7,C.orange); px(9,9,C.orange); px(7,10,C.orange);
    } else if(has('spring','스프링')){
      for(let i=0;i<5;i++) rect(3+i,4+i,8,2,C.metal);
    } else if(has('teddy','곰인형','곰')){
      rect(4,5,8,8,C.brown); rect(3,3,3,3,C.brown); rect(10,3,3,3,C.brown);
      px(6,7,ink); px(9,7,ink); rect(6,10,4,2,C.pink);
    } else if(has('crutch','목발')){
      rect(6,1,3,13,C.metal); rect(3,1,9,3,C.darkMetal); rect(4,12,7,3,C.black);
    } else if(has('boomerang','부메랑')){
      rect(2,4,6,3,C.wood); rect(6,5,6,3,C.wood); rect(10,7,4,4,C.wood);
    } else if(has('eel','장어')){
      rect(1,6,14,4,C.purple); rect(2,7,12,2,'#6a4a90');
      px(13,6,C.cyan); px(12,9,C.cyan);
    } else if(has('rocket','로켓')){
      rect(5,2,6,10,C.white); rect(6,3,4,8,C.red); rect(6,1,4,2,C.metal);
      rect(4,11,3,3,C.orange); rect(9,11,3,3,C.orange); rect(6,12,4,3,C.yellow);
    } else if(has('cactus','선인장')){
      rect(6,3,4,11,C.green); rect(3,6,3,4,C.green); rect(10,5,3,5,C.green);
      px(7,5,C.yellow); px(8,9,C.yellow);
    } else if(has('anchor','닻')){
      rect(7,2,2,10,C.darkMetal); rect(4,4,8,2,C.metal);
      rect(3,10,4,3,C.metal); rect(9,10,4,3,C.metal); rect(6,1,4,2,C.gold);
    } else if(has('copper','코일','구리')){
      rect(3,3,10,10,C.orange); rect(5,5,6,6,C.darkMetal);
      for(let i=0;i<3;i++) rect(4,4+i*3,8,1,'#e8a050');
    } else if(has('rebar','철근')){
      rect(2,7,12,2,C.darkMetal); rect(2,5,2,6,C.metal); rect(12,5,2,6,C.metal);
      for(let x=4;x<12;x+=2) px(x,6,C.orange);
    } else if(has('pallet','팔레트')){
      rect(2,5,12,7,C.wood); for(let x=3;x<13;x+=3) rect(x,5,1,7,C.darkWood);
      rect(2,5,12,2,C.yellow);
    } else if(has('lily_pad','연잎')){
      rect(3,4,10,9,C.leaf); rect(4,5,8,7,C.green); rect(7,7,3,2,'#2a5a20');
    } else if(has('driftwood','유목')){
      rect(2,6,12,4,C.wood); rect(3,7,10,2,'#a08050'); px(5,6,C.darkWood); px(11,8,C.darkWood);
    } else if(def.sock==='stock'){
      rect(2,5,12,6,C.wood); rect(1,6,4,5,C.darkWood);
    }
    else {
      rect(4,4,8,8,C.metal); rect(5,5,6,6,C.darkMetal);
    }
  }
  // ========== 음식 ==========
  else if(def.kind==='food'){
    if(has('bandage','반창고')){
      rect(3,6,10,4,C.white); rect(6,5,4,6,C.pink); rect(7,6,2,4,C.red);
    } else if(has('lunch','도시락')){
      rect(2,4,12,9,C.red); rect(3,5,10,7,C.white);
      rect(4,6,3,3,C.yellow); rect(8,7,3,2,C.green); rect(5,10,6,1,C.orange);
    } else if(has('donut','도넛')){
      rect(4,4,8,8,C.pink); rect(5,5,6,6,'#f0b0c0'); rect(6,6,4,4,ink);
      px(5,5,C.white); px(10,7,C.yellow); px(7,10,C.cyan);
    } else if(has('soda','탄산')){
      rect(5,2,6,12,C.red); rect(6,3,4,10,C.blue); rect(6,2,4,2,C.metal);
      px(7,6,C.white); px(8,9,C.white);
    } else if(has('pretzel','프레첼')){
      rect(3,4,4,4,C.brown); rect(9,4,4,4,C.brown); rect(3,9,4,4,C.brown); rect(9,9,4,4,C.brown);
      rect(5,6,6,5,C.brown); px(6,5,C.white);
    } else if(has('croissant','크루아상')){
      rect(2,7,5,4,C.yellow); rect(5,5,5,5,C.gold); rect(9,6,5,5,C.yellow);
    } else if(has('jelly','젤리','지렁이')){
      rect(2,7,3,3,C.red); rect(5,6,3,3,C.green); rect(8,7,3,3,C.blue); rect(11,6,3,3,C.yellow);
    } else if(has('pancake','팬케이크')){
      rect(3,9,10,3,C.brown); rect(3,7,10,3,C.gold); rect(3,5,10,3,C.yellow);
      rect(6,3,4,3,C.red); // 딸기
    } else if(has('portable','detector','탐지기','휴대')){
      // 휴대용 탐지기 — 손바닥 레이더
      rect(4,3,8,10,C.darkMetal); rect(5,4,6,7,'#1a2830');
      rect(6,5,4,4,C.green); rect(7,6,2,2,'#b0ff60');
      rect(6,11,4,2,C.metal); px(7,2,C.red); rect(7,1,2,2,C.red);
    } else if(has('energy_bar','식량바','비상 식량')){
      rect(2,6,12,4,C.brown); rect(3,7,10,2,C.orange); px(5,7,C.yellow);
    } else if(has('canned_stew','통조림 스튜','스튜')){
      rect(4,3,8,11,C.metal); rect(5,4,6,9,C.orange); rect(5,4,6,2,C.red);
    } else if(has('coffee','보온병','커피')){
      rect(5,2,6,12,C.metal); rect(6,3,4,9,C.darkMetal); rect(6,2,4,2,C.orange);
    } else if(has('vitamin','비타민')){
      rect(5,4,6,8,C.white); rect(6,5,4,6,C.red); rect(7,6,2,2,C.yellow);
    } else if(has('welding_crackers','크래커')){
      rect(2,6,12,4,C.yellow); for(let x=3;x<13;x+=2) px(x,7,C.brown);
    } else if(has('lunch_ticket','구내식당')){
      rect(2,4,12,9,C.red); rect(3,5,10,7,C.white); rect(4,6,3,3,C.yellow); rect(9,7,3,2,C.green);
    } else if(has('marsh_riceball','습지 주먹밥') || (has('주먹밥') && has('습지'))){
      rect(4,4,8,9,C.white); rect(5,5,6,7,'#e0f0d8'); rect(4,10,8,3,C.leaf);
    } else if(has('lotus_tea','연꽃차')){
      rect(4,6,8,6,C.white); rect(5,4,6,3,C.pink); rect(6,7,4,3,'#d0e8c0');
    } else if(has('dried_fish','말린 물고기','건어')){
      rect(2,6,12,4,C.blue); rect(3,7,10,2,'#80b0d0'); px(12,6,C.white);
    } else if(has('mud_honey','늪꿀')){
      rect(5,4,6,9,C.gold); rect(6,5,4,7,'#e8c84a'); rect(6,3,4,2,C.brown);
    } else if(has('reed_juice','갈대 주스')){
      rect(5,2,6,12,C.green); rect(6,3,4,10,'#8ad060'); rect(6,2,4,2,C.leaf);
    } else if(has('gold_berry','황금 열매')){
      rect(5,5,6,6,C.gold); rect(6,6,4,4,'#f0e080'); rect(7,3,2,3,C.leaf); px(7,7,C.white);
    } else {
      rect(5,5,6,6,C.red); rect(6,6,4,4,C.pink);
    }
  }
  // ========== 귀중품 ==========
  else {
    if(has('gold_tooth','금니')){
      rect(5,5,6,7,C.gold); rect(6,6,4,5,'#f0d060'); px(7,8,C.white);
    } else if(has('circuit','회로')){
      rect(3,3,10,10,C.green); rect(4,4,8,8,'#3a6a3a');
      px(5,5,C.gold); px(8,5,C.gold); px(6,8,C.gold); px(10,9,C.gold);
      rect(5,6,6,1,C.gold); rect(7,5,1,6,C.gold);
    } else if(has('toad','두꺼비','기름') && has('oil','기름','toad')){
      rect(5,3,6,10,C.green); rect(6,5,4,6,C.slime); rect(6,2,4,2,C.metal);
    } else if(has('radio','라디오')){
      rect(2,4,12,9,C.brown); rect(3,5,6,7,C.darkWood); rect(10,5,3,3,C.metal);
      rect(10,9,3,2,C.red); rect(4,1,2,4,C.metal);
    } else if(has('kettle','주전자')){
      rect(4,5,8,8,C.metal); rect(5,6,6,6,'#7a9aaa'); rect(11,6,3,3,C.darkMetal);
      rect(6,3,4,3,C.metal);
    } else if(has('rust_bolt','볼트 병','녹슨 볼트')){
      rect(5,3,6,11,C.glass||'#a0c0c8'); rect(6,4,4,8,C.orange); px(7,6,C.darkMetal); px(8,9,C.metal);
    } else if(has('punch_card','천공카드')){
      rect(2,5,12,6,C.white); for(let x=4;x<12;x+=2) px(x,7,ink);
    } else if(has('safety_sign','안전 표지')){
      rect(3,3,10,10,C.yellow); rect(7,5,2,5,ink); rect(7,11,2,1,ink);
    } else if(has('factory_badge','출입증')){
      rect(4,3,8,10,C.metal); rect(5,4,6,4,C.blue); rect(5,9,6,3,C.white);
    } else if(has('grease_can','그리스')){
      rect(5,3,6,11,C.darkMetal); rect(6,4,4,9,'#3a3a28'); rect(6,3,4,2,C.orange);
    } else if(has('blueprint','도면')){
      rect(2,4,12,9,C.blue); rect(3,5,10,7,'#d0e8f8'); for(let y=6;y<11;y+=2) rect(4,y,8,1,C.blue);
    } else if(has('fuse_box','퓨즈')){
      rect(3,3,10,10,C.darkMetal); rect(5,5,6,6,C.orange); px(7,7,C.yellow);
    } else if(has('swamp_pearl','습지 진주')){
      rect(5,5,6,6,C.white); rect(6,6,4,4,'#e8f0e8'); px(7,7,C.cyan);
    } else if(has('gold_flake','금가루')){
      rect(5,3,6,11,C.glass||'#a0c0c8'); rect(6,5,4,7,C.gold); px(7,7,C.yellow); px(8,9,C.white);
    } else if(has('bog_amber','늪 호박','호박')){
      rect(4,4,8,9,C.orange); rect(5,5,6,7,'#e09030'); px(7,8,ink);
    } else if(has('reed_whistle','갈대 피리')){
      rect(2,7,12,3,C.leaf); rect(3,6,2,5,C.brown); px(12,7,C.darkMetal);
    } else if(has('frog_idol','개구리 우상')){
      rect(4,5,8,8,C.green); rect(5,4,3,3,C.slime); rect(8,4,3,3,C.slime); px(6,7,ink); px(9,7,ink);
    } else if(has('lily_coin','연꽃 주화')){
      rect(4,4,8,8,C.gold); rect(5,5,6,6,'#e8c84a'); rect(6,6,4,4,C.pink);
    } else if(has('moss_compass','이끼 나침반','나침반')){
      rect(3,3,10,10,C.metal); rect(5,5,6,6,C.leaf); rect(7,4,2,5,C.red); px(7,10,ink);
    } else if(has('lightning','번개')){
      rect(8,1,3,5,C.yellow); rect(5,5,6,3,C.yellow); rect(5,7,3,6,C.yellow);
      rect(7,10,4,2,C.gold);
    } else if(has('duck_ring','반지') && !has('golden_duck')){
      rect(5,5,6,6,C.gold); rect(6,6,4,4,ink); rect(7,4,2,2,C.yellow);
    } else if(has('golden_duck','황금 미니상','미니상')){
      rect(5,4,6,6,C.gold); rect(4,9,8,4,C.gold); px(6,6,ink); px(9,6,ink);
      rect(6,2,4,3,C.yellow); // 머리
    } else if(has('cross_trophy','훈장','십자 훈')){
      rect(6,2,4,12,C.gold); rect(3,5,10,4,C.gold); rect(7,3,2,2,C.red);
    } else if(has('snake','뱀 화석')){
      rect(2,8,4,3,C.white); rect(5,6,4,3,C.white); rect(8,8,4,3,C.white); rect(11,6,3,3,C.white);
    } else if(has('key_bundle','열쇠')){
      rect(3,5,4,4,C.gold); rect(6,6,8,2,C.gold); px(12,5,C.gold); px(12,8,C.gold);
      rect(4,3,2,3,C.yellow);
    } else if(has('horseshoe','말굽','자석')){
      rect(3,4,3,9,C.red); rect(10,4,3,9,C.blue); rect(4,3,8,3,C.metal);
    } else if(has('dragon_bone','용가리','용')){
      rect(2,5,4,6,C.white); rect(6,4,4,4,C.white); rect(10,5,4,6,C.white); rect(7,8,2,5,C.white);
    } else if(has('frame_art','명화','액자') && !has('scope')){
      rect(2,2,12,12,C.wood); rect(4,4,8,8,C.blue); rect(5,5,6,6,'#80a0c0'); px(7,7,C.yellow);
    } else if(has('crown','왕관')){
      rect(3,6,10,6,C.gold); rect(3,3,2,5,C.gold); rect(7,2,2,5,C.gold); rect(11,3,2,5,C.gold);
      px(4,4,C.red); px(8,3,C.cyan); px(12,4,C.red);
    } else if(has('mahjong','마작')){
      rect(4,2,8,12,C.white); rect(5,3,6,10,'#f0f0e8');
      rect(6,5,2,2,C.red); rect(8,8,2,2,C.green);
    } else if(has('music_box','오르골')){
      rect(3,5,10,8,C.wood); rect(4,6,8,6,C.gold); rect(6,3,4,3,C.metal);
      px(7,8,C.red); px(9,9,C.red);
    } else {
      // 기본 보석
      rect(6,2,4,2,C.gold); rect(4,4,8,3,C.gold); rect(5,7,6,4,C.yellow); rect(6,11,4,2,C.brown);
    }
  }

  // 희귀/엑조틱 코너 점
  if(def.exotic){
    px(0,0,C.cyan); px(15,0,C.cyan); px(0,15,C.gold); px(15,15,C.gold);
  } else if(def.rare){
    px(0,0,C.gold); px(15,1,C.gold); px(1,15,C.gold);
  }

  _iconCache.set(key, cn);
  if(_iconCache.size>400){ _iconCache.clear(); _iconCache.set(key, cn); }
  return cn;
}

// 작은 원 헬퍼 (아이콘 내부용)
function pBlobDot(px, cx, cy, r, c){
  for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++)
    if(dx*dx+dy*dy<=r*r) px(cx+dx, cy+dy, c);
}

function itemIconEl(def, displayPx, hidden){
  const src = itemIconCanvas(def, hidden);
  const c = document.createElement('canvas');
  const d = displayPx || 28;
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  c.className = 'item-icon';
  c.style.width = d+'px';
  c.style.height = d+'px';
  c.style.imageRendering = 'pixelated';
  c.style.display = 'block';
  return c;
}

function drawItemIconWorld(def, cx, cy, size, hidden){
  const src = itemIconCanvas(def, hidden);
  const s = size || 18;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, Math.round(cx-s/2), Math.round(cy-s/2), s, s);
}
