# Shared game data (web + Godot)

**Source of truth:** the `*.json` files in this directory.

개발 규칙 전문: [docs/web-dev-rules.md](../docs/web-dev-rules.md)

| File | Contents |
|------|----------|
| `shapes.json` | Polyomino cell shapes |
| `sock_info.json` | Attachment socket labels/colors |
| `items.json` | All items (`ITEMS`) |
| `enemies.json` | Enemy types (`ENEMY_TYPES`) |
| `regions.json` | `{ regions, order }` |
| `quests.json` | Quest definitions array |
| `loot_pools.json` | Loot table id lists |
| `container_types.json` | Raid containers |
| `upgrades.json` | Cave upgrades |
| `npc_lines.json` | NPC dialogue pools |
| `manifest.json` | File list / version |

## Web pipeline

1. Edit JSON here.
2. Run: `node scripts/build-data-tables.js`
3. That regenerates root `data.tables.js`, which `index.html` loads **before** `data.js`.

Do not hand-edit `data.tables.js`.

## Godot

Load the same JSON under `res://data/` or a shared path (see `docs/godot-port-plan.md`).
