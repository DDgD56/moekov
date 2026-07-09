#!/usr/bin/env node
// Build data.tables.js from data/*.json (shared source of truth for web + Godot)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');

function loadJSON(name){
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}

function emit(name, value){
  return 'const ' + name + ' = ' + JSON.stringify(value, null, 2) + ';\n';
}

const SHAPES = loadJSON('shapes.json');
const SOCK_INFO = loadJSON('sock_info.json');
const ITEMS = loadJSON('items.json');
const LOOT_POOLS = loadJSON('loot_pools.json');
const CONTAINER_TYPES = loadJSON('container_types.json');
const UPGRADES = loadJSON('upgrades.json');
const reg = loadJSON('regions.json');
const REGIONS = reg.regions;
const REGION_ORDER = reg.order;
const QUESTS = loadJSON('quests.json');
const NPC_LINES = loadJSON('npc_lines.json');
const ENEMY_TYPES = loadJSON('enemies.json');

const header = `// ============================================================
// AUTO-GENERATED from data/*.json — do not edit by hand
// Source of truth: data/*.json
// Regenerate: node scripts/build-data-tables.js
// ============================================================
`;

const body = [
  emit('SHAPES', SHAPES),
  emit('SOCK_INFO', SOCK_INFO),
  emit('ITEMS', ITEMS),
  emit('LOOT_POOLS', LOOT_POOLS),
  emit('CONTAINER_TYPES', CONTAINER_TYPES),
  emit('UPGRADES', UPGRADES),
  emit('REGIONS', REGIONS),
  emit('REGION_ORDER', REGION_ORDER),
  emit('QUESTS', QUESTS),
  emit('NPC_LINES', NPC_LINES),
  emit('ENEMY_TYPES', ENEMY_TYPES),
].join('\n');

const out = path.join(ROOT, 'data.tables.js');
fs.writeFileSync(out, header + '\n' + body);
console.log('[build-data-tables] wrote', path.relative(ROOT, out),
  '(' + Object.keys(ITEMS).length + ' items,',
  Object.keys(ENEMY_TYPES).length + ' enemies,',
  QUESTS.length + ' quests)');
