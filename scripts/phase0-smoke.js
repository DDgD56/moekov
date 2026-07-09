#!/usr/bin/env node
/**
 * Phase 0 pure-logic smoke — drives real shipped functions (not reimplementations).
 * Run: node scripts/phase0-smoke.js
 * Areas: packing, gunStats, region unlock, dual quests, rewardStash
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SCRATCH = process.env.PHASE0_SCRATCH || '';

function fail(msg){
  console.error('FAIL:', msg);
  process.exitCode = 1;
  throw new Error(msg);
}
function assert(cond, msg){ if(!cond) fail(msg); }

const noop = ()=>{};
const makeEl = () => {
  const el = {
    style:{}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
    textContent:'', _html:'', className:'', id:'', children:[], dataset:{},
    width:800, height:600,
    get innerHTML(){ return this._html; }, set innerHTML(v){ this._html = v; },
    appendChild(c){ return c; }, remove:noop, setAttribute:noop, getAttribute:()=>null,
    addEventListener:noop, removeEventListener:noop,
    querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
    getContext(){ return ctxStub; },
  };
  return el;
};
const ctxStub = new Proxy({
  canvas:{width:800,height:600},
  createLinearGradient:()=>({addColorStop:noop}),
  createRadialGradient:()=>({addColorStop:noop}),
  measureText:()=>({width:10}),
  getImageData:()=>({data:new Uint8ClampedArray(4),width:1,height:1}),
  createImageData:(w,h)=>({data:new Uint8ClampedArray(Math.max(4,w*h*4)),width:w||1,height:h||1}),
}, { get(t,p){ if(p in t) return t[p]; if(typeof p==='string') return noop; }});

const els = {};
const document = {
  getElementById: id => els[id] || (els[id]=Object.assign(makeEl(),{id})),
  createElement: () => makeEl(), createElementNS: () => makeEl(),
  body: makeEl(), documentElement: makeEl(),
  addEventListener: noop, removeEventListener: noop,
  querySelector: ()=>makeEl(), querySelectorAll: ()=>[], write: noop,
};
const localStore = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, Map, Set, Uint8Array, Uint8ClampedArray,
  String, Number, Boolean, Error, TypeError, parseInt, parseFloat, isNaN, isFinite,
  undefined, NaN, Infinity,
  performance: { now: ()=>Date.now() },
  requestAnimationFrame: ()=>1, cancelAnimationFrame: noop,
  localStorage: {
    getItem: k => (k in localStore ? localStore[k] : null),
    setItem: (k,v)=>{ localStore[k]=String(v); },
    removeItem: k=>{ delete localStore[k]; },
  },
  Image: class { set src(v){} },
  AudioContext: class {
    constructor(){ this.state='running'; this.currentTime=0; this.destination={}; }
    createOscillator(){ return { connect:noop, start:noop, stop:noop, type:'', frequency:{value:0, exponentialRampToValueAtTime:noop} }; }
    createGain(){ return { connect:noop, gain:{value:0, setValueAtTime:noop, exponentialRampToValueAtTime:noop, linearRampToValueAtTime:noop} }; }
    createBiquadFilter(){ return { connect:noop, type:'', frequency:{value:0}, Q:{value:0} }; }
    resume(){ return Promise.resolve(); }
  },
  document, innerWidth:800, innerHeight:600, navigator:{userAgent:'node'},
  setTimeout, clearTimeout, setInterval, clearInterval,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.webkitAudioContext = sandbox.AudioContext;
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;

const ctx = vm.createContext(sandbox);

// Load shipped modules in index.html order (data from JSON-built tables)
const files = [
  'sprite.js','data.tables.js','data.js','icons.js','inventory.js','gun.js','music.js',
  'core.js','map.js','combat.js','systems.js','ui.js',
  'render-entities.js','render-world.js','render.js','main.js',
];
for(const f of files){
  const p = path.join(ROOT, f);
  assert(fs.existsSync(p), 'missing module '+f);
  vm.runInContext(fs.readFileSync(p,'utf8'), ctx, { filename:f, timeout:15000 });
}

// Export handle: classic const bindings live in script env — re-read via Function
function g(name){
  try { return vm.runInContext(name, ctx); }
  catch(e){ fail('global missing: '+name+' ('+e.message+')'); }
}

const results = [];

// ---- 0) JSON source of truth vs loaded tables ----
{
  const itemsJson = JSON.parse(fs.readFileSync(path.join(ROOT,'data/items.json'),'utf8'));
  const enemiesJson = JSON.parse(fs.readFileSync(path.join(ROOT,'data/enemies.json'),'utf8'));
  const ITEMS = g('ITEMS');
  const ENEMY_TYPES = g('ENEMY_TYPES');
  assert(Object.keys(ITEMS).length === Object.keys(itemsJson).length, 'ITEMS count mismatch vs data/items.json');
  assert(ITEMS.potato_pistol && ITEMS.potato_pistol.id==='potato_pistol', 'potato_pistol from JSON tables');
  assert(ENEMY_TYPES.hillchief && ENEMY_TYPES.mirequeen, 'bosses present from enemies.json');
  assert(Object.keys(ENEMY_TYPES).length === Object.keys(enemiesJson).length, 'ENEMY_TYPES count mismatch');
  results.push('data-source: OK items='+Object.keys(ITEMS).length+' enemies='+Object.keys(ENEMY_TYPES).length);
}

// ---- 1) Packing (Inv.autoPlace / canPlace) — real inventory.js ----
{
  const Inv = g('Inv');
  const mkInst = g('mkInst');
  const inv = new Inv(4, 4);
  const a = mkInst('bandage'); // sq1
  const b = mkInst('lunchbox'); // h2
  assert(inv.autoPlace(a), 'place bandage');
  assert(inv.autoPlace(b), 'place lunchbox');
  assert(inv.items.length===2, 'two items packed');
  // Overfill with large shapes
  let placed = 0;
  for(let i=0;i<20;i++){
    if(inv.autoPlace(mkInst('donut_food'))) placed++;
  }
  assert(placed < 20, 'grid eventually full');
  // Serialize round-trip
  const ser = inv.serialize();
  const inv2 = Inv.load(ser);
  assert(inv2.items.length === inv.items.length, 'Inv.load preserves count');
  results.push('packing: OK placed='+inv.items.length+' serRoundTrip='+inv2.items.length);
}

// ---- 2) gunStats aggregation — real gun.js ----
{
  const mkInst = g('mkInst');
  const gunStats = g('gunStats');
  const canMount = g('canMount');
  const gun = { body: mkInst('potato_pistol'), atts:[], ammo:0 };
  const base = gunStats(gun);
  assert(base.dmg >= 1 && base.ammo >= 1, 'base gun stats');
  // Mount glasses scope if possible
  const scope = mkInst('glasses_scope');
  let mounted = false;
  for(let idx=0; idx<4 && !mounted; idx++){
    if(canMount(gun, scope.def, 'top', idx, 0)){
      gun.atts.push({inst:scope, side:'top', idx, rot:0});
      mounted = true;
    }
  }
  const withScope = gunStats(gun);
  if(mounted){
    assert(withScope.zoom >= base.zoom, 'scope increases zoom');
    assert(withScope.extractDetect === false || withScope.extractDetect === true, 'extractDetect field exists');
  }
  // detect_module
  const det = mkInst('detect_module');
  const g2 = { body: mkInst('bamboo_rifle'), atts:[], ammo:0 };
  for(let idx=0; idx<6; idx++){
    if(canMount(g2, det.def, 'top', idx, 0)){
      g2.atts.push({inst:det, side:'top', idx, rot:0});
      break;
    }
  }
  const stDet = gunStats(g2);
  if(g2.atts.length) assert(stDet.extractDetect === true, 'detect_module sets extractDetect');
  results.push('gunStats: OK baseDmg='+base.dmg+' mountedScope='+mounted+' detect='+!!stDet.extractDetect);
}

// ---- 3) Region unlock — real regionUnlocked ----
{
  const regionUnlocked = g('regionUnlocked');
  const State = g('State');
  State.regionExtracts = {};
  State.regionBoss = {};
  assert(regionUnlocked('hill') === true, 'hill always open');
  assert(regionUnlocked('factory') === false, 'factory locked without extracts');
  State.regionExtracts = { hill: 3 };
  assert(regionUnlocked('factory') === true, 'factory after 3 hill extracts');
  assert(regionUnlocked('marsh') === false, 'marsh needs factory boss');
  State.regionBoss = { factory: true };
  assert(regionUnlocked('marsh') === true, 'marsh after factory boss');
  results.push('regionUnlock: OK hill/factory/marsh gates');
}

// ---- 4) Dual quest slots via real killEnemy + onExtract ----
{
  const State = g('State');
  const player = g('player');
  const Inv = g('Inv');
  const ENEMY_TYPES = g('ENEMY_TYPES');
  const killEnemy = g('killEnemy');
  const onExtract = g('onExtract');

  // saveGame / openPanel need inventories + coins
  if(!State.storage) State.storage = new Inv(10, 8);
  if(!State.backpack) State.backpack = new Inv(8, 6);
  State.regionExtracts = State.regionExtracts || {};
  State.regionBoss = State.regionBoss || {};

  // Concurrent quests: main kill-any, exo factory extract
  State.quest = { def: { type:'kill', enemy:'any', n:3, title:'T', reward:10 }, prog: 0 };
  State.exoQuest = {
    def: { type:'extract', n:1, region:'factory', title:'Exo', reward:100, unlock:'exoticIntro' },
    prog: 0,
  };

  // Minimal raid + grunt enemy for killEnemy (shipped combat.js)
  const gruntType = ENEMY_TYPES.zduck;
  assert(gruntType && !gruntType.boss && !gruntType.bomber, 'zduck is normal kill target');
  const enemy = {
    id: 'zduck',
    t: gruntType,
    x: 100, y: 100,
    hp: 1, hpMax: 1, r: gruntType.r || 14,
  };
  // Assign raid global used by killEnemy / onExtract
  vm.runInContext(`
    raid = {
      enemies: [], parts: [], drops: [], dnums: [],
      region: 'factory', over: false, coinMul: 1,
      extracts: [], time: 0,
    };
    player.kills = 0;
    player.coinsGained = 0;
  `, ctx);
  // push same enemy reference into raid.enemies
  const raid = g('raid');
  raid.enemies.push(enemy);

  killEnemy(enemy);
  assert(State.quest.prog === 1, 'killEnemy advances main kill quest');
  assert(State.exoQuest.prog === 0, 'killEnemy does not advance extract exo quest');
  assert(player.kills === 1, 'killEnemy increments player.kills');
  assert(raid.enemies.indexOf(enemy) < 0, 'enemy removed from raid.enemies');

  // Second concurrent: both have extract progress independently when types match
  // Reset kill prog check already done; now factory extract via real onExtract
  const exoBefore = State.exoQuest.prog;
  const mainBefore = State.quest.prog;
  player.coinsGained = 7;
  const coinsBefore = State.coins || 0;
  onExtract();
  assert(g('raid').over === true, 'onExtract sets raid.over');
  assert(State.exoQuest.prog === exoBefore + 1, 'onExtract advances exo extract quest');
  assert(State.quest.prog === mainBefore, 'onExtract does not advance kill main quest');
  assert((State.regionExtracts.factory || 0) >= 1, 'onExtract records regionExtracts.factory');
  assert(State.coins === coinsBefore + 7, 'onExtract banks coinsGained');
  assert(State.quest && State.exoQuest, 'both quest slots still held after kill+extract');

  results.push('dualQuest: OK killEnemy+onExtract concurrent slots');
}

// ---- 5) rewardStash-only growth — real grantStashSlots / stashSlots / completeQuest ----
{
  const State = g('State');
  const stashSlots = g('stashSlots');
  const grantStashSlots = g('grantStashSlots');
  const completeQuest = g('completeQuest');
  const questCanComplete = g('questCanComplete');
  const mkInst = g('mkInst');
  const Inv = g('Inv');

  State.stashSlots = 0;
  State.stashUnlocked = false;
  State.questsDone = 5;
  assert(stashSlots() === 0, 'locked stash is 0 even with questsDone');
  // Normal quest complete must not open stash without rewardStash
  State.storage = new Inv(20, 20);
  State.backpack = new Inv(20, 20);
  State.coins = 0;
  State.quest = { def: { type:'kill', enemy:'any', n:1, title:'NoStash', reward:50 }, prog: 1 };
  assert(questCanComplete(State.quest), 'quest completable');
  const before = stashSlots();
  completeQuest('main');
  assert(stashSlots() === before, 'completeQuest without rewardStash does not grow stash');
  assert(State.questsDone === 6, 'questsDone still increments');

  // Stash unlock quest
  const stashQ = g('QUESTS').find(q=>q.unlock==='stash');
  assert(stashQ && (stashQ.rewardStash|0) >= 1, 'stash quest has rewardStash');
  // Satisfy extract+fetch if needed
  State.quest = { def: { ...stashQ, type:'kill', enemy:'any', n:1, fetch:null }, prog: 1 };
  // Use grant path via completeQuest with rewardStash
  State.quest = { def: { type:'kill', enemy:'any', n:1, title:'Open', reward:10, unlock:'stash', rewardStash:2 }, prog: 1 };
  completeQuest('main');
  assert(stashSlots() === 2, 'stash opens to 2 via rewardStash');
  assert(State.stashUnlocked === true, 'stashUnlocked set');

  // Another non-stash quest
  State.quest = { def: { type:'kill', enemy:'any', n:1, title:'Plain', reward:10 }, prog: 1 };
  completeQuest('main');
  assert(stashSlots() === 2, 'plain quest does not add slots');

  // Expansion
  State.quest = { def: { type:'kill', enemy:'any', n:1, title:'Expand', reward:10, rewardStash:1 }, prog: 1 };
  completeQuest('main');
  assert(stashSlots() === 3, 'rewardStash +1 works');

  // Direct API
  grantStashSlots(10);
  assert(stashSlots() === g('MAX_STASH'), 'capped at MAX_STASH');

  results.push('rewardStash: OK only grant/reward grows slots max='+stashSlots());
}

console.log('=== phase0-smoke PASS ===');
for(const line of results) console.log(' ', line);

if(SCRATCH){
  try {
    fs.mkdirSync(SCRATCH, { recursive:true });
    fs.writeFileSync(path.join(SCRATCH, 'phase0-smoke.log'),
      ['=== phase0-smoke PASS ===', ...results.map(l=>' '+l), ''].join('\n'));
  } catch(e){ console.warn('scratch write failed', e.message); }
}

process.exit(0);
