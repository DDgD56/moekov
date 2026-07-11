# MoeKov 세이브 스키마

**스토리지 키 (웹):** `localStorage['quackscape_save']`  
**포맷:** JSON 객체  
**현재 버전:** `v: 1`  
**구현:** `core.js` — `saveGame()` / `loadGame()` / `newGame()`

Godot 이식 시 권장 경로: `user://moekov_save.json` (동일 JSON 스키마 유지 권장).

---

## 1. 최상위 페이로드 (`saveGame` 기록 필드)

| 필드 | 타입 | 설명 |
|------|------|------|
| `v` | number | 스키마 버전. **현재 1만 로드.** |
| `coins` | number | 보유 코인 |
| `up` | object | 업그레이드 티어 `{ pack, hp, shoes, store }` (각 정수 인덱스) |
| `storage` | object | 창고 인벤 직렬화 (`Inv.serialize`) |
| `backpack` | object | 가방 인벤 직렬화 |
| `guns` | array | 길이 2 총 슬롯 (`serializeGun`) |
| `activeGun` | 0\|1 | 활성 총 슬롯 |
| `gun2` | boolean | 총기 슬롯 2 해금 (퀘스트 「이도류 면허」) |
| `stashUnlocked` | boolean | 보관대 해금 여부 (`stashSlots > 0` 과 동기) |
| `stashSlots` | number | 개방된 보관 칸 수 (0–6). **`rewardStash` 퀘스트로만 증가** |
| `seenHelp` | boolean | 도움말 열람 여부 |
| `quest` | object\|null | 일반 퀘스트 슬롯 `{ def, prog }` |
| `exoQuest` | object\|null | 엑조틱 퀘스트 슬롯 `{ def, prog }` |
| `questOffers` | array\|null | 창구에 제안 중인 일반 의뢰 목록 |
| `questsDone` | number | 완료한 퀘스트 수 (보상 스케일·오퍼 조건) |
| `qslots` | array | 퀵슬롯 3칸 `[{d:itemId}\|null, …]` |
| `deathCache` | object\|null | 사망 시체 회수 `{ items:[{d,r}], x, y, region }` — 같은 지역 다음 출격 1회만 배치. 다른 지역 출격 시 소멸 |
| `region` | string | 마지막 선택 지역 id (`hill`/`factory`/`marsh`) |
| `regionExtracts` | object | 지역별 탈출 횟수 `{ [regionId]: number }` |
| `regionBoss` | object | 지역별 보스 처치 `{ [regionId]: true }` |
| `stash` | array | 총 보관대 6칸 (`serializeStash` 또는 null) |
| `exoticIntroDone` | boolean | 엑조틱 입문 퀘스트 완료 |

### 1.1 중첩 직렬화

**인벤 (`Inv.serialize`)**
```json
{ "w": 10, "h": 6, "items": [ { "d": "bandage", "x": 0, "y": 0, "r": 0 } ] }
```
- `d`: 아이템 def id (`ITEMS` 키)
- `r`: 회전 0–3

**총 (`serializeGun`)**
```json
{ "body": "potato_pistol", "atts": [ { "d": "glasses_scope", "side": "top", "idx": 0, "r": 0 } ] }
```
- `body`: 몸통 id 또는 `null`
- `atts[].side`: `top`\|`bottom`\|`front`\|`back`
- `atts[].idx`: 레일 시작 셀
- `atts[].r`: 부착물 회전

**보관대 칸 (`serializeStash`)**  
총과 동일 구조(body+atts) 또는 `null`. ammo는 보관 시 0으로 취급.

**퀘스트 슬롯**
```json
{ "def": { /* QUESTS 항목 스냅샷 */ }, "prog": 0 }
```
`def`는 수락 시점 복사본(보상 스케일 반영 가능).

---

## 2. 영속 `GameState` vs 레이드 런타임

### 영속 (세이브에 포함 / `State` 중심)

`coins`, `up`, `storage`, `backpack`, `guns`, `activeGun`, `gun2`,  
`stashUnlocked`, `stashSlots`, `stash`,  
`quest`, `exoQuest`, `questOffers`, `questsDone`,  
`qslots`, `deathCache`,  
`region`, `regionExtracts`, `regionBoss`,  
`exoticIntroDone`, `seenHelp`

### 레이드 런타임 (세이브 안 함)

| 심볼 | 내용 |
|------|------|
| `scene` | `'cave'` \| `'raid'` |
| `raid` | 맵·적·탄·시간·보스 인스턴스 등 전체 레이드 객체 |
| `player.*` 전투 필드 | `x,y,hp,ang,reloading,stam,iframe,kills,coinsGained,bloom,kick,swapT,extractDetectT,corpseDetectT,slowT,poisonT` 등 |
| `panel` | 열린 UI 패널 |
| `cam` / `shake` | 카메라·스크린 흔들림 |
| `benchIdx` / `benchFilter` | 작업대 UI 전용 (세션) |

`newGame()` / `returnToCave()` / `buildRaid()` 시작 시 런타임 필드는 재설정된다.

### 플레이어 객체

`player`는 대부분 런타임. 세이브에 직접 넣지 않는다.  
HP·탄약은 출격 시 `maxHp()` / `gunStats().ammo`로 리셋.

---

## 3. 로드 규칙 (`loadGame`)

1. `localStorage` 파싱 실패 또는 `v !== 1` → `false` (신규 게임 경로).
2. `v === 1` 이면 위 필드를 `State`에 복원.
3. 인벤/총은 `Inv.load` / `loadGun` / `loadStash` — 알 수 없는 아이템 id는 스킵.
4. 성공 시 `true`.

---

## 4. 마이그레이션 (이미 `loadGame`에 구현)

| 레거시 | 처리 |
|--------|------|
| 단일 `gun` 필드 (배열 `guns` 없음) | `guns = [loadGun(d.gun), loadGun(null)]` |
| `guns.length < 2` | 빈 슬롯 push |
| 엑조틱 입문이 `quest`에만 있음 (`def.unlock === 'exoticIntro'`) | `exoQuest`로 이동, `quest = null` |
| `stashSlots` 없음 + (`stashUnlocked` 또는 stash에 총 존재) | 구공식 `min(6, 2 + max(0, questsDone - stashBaseDone))` 로 **고정 변환** 후 저장 시 `stashSlots` 기록. 이후 아무 퀘스트 완료로는 칸 증가 안 함 |
| stash 뒤 칸에만 총 | 해당 인덱스까지 `stashSlots` 상향 (꺼내기 가능) |
| `exoticIntroDone` 없음 | `regionExtracts.factory` 있으면 완료로 간주 |
| `stashUnlocked` 없음 + stash에 총 | 해금으로 간주 (구세이브) |
| `deathCache.region` 없음 | `State.region`(마지막 선택 지역)으로 추정 |

**더 이상 사용하지 않음:** `stashBaseDone` (저장 안 함). 로드 시에만 레거시 키로 참조.

---

## 5. 게임플레이 규칙과 세이브 연동

- **보관대 칸:** `State.stashSlots`만 사용. `grantStashSlots(n)` / 퀘스트 `rewardStash`·`unlock:'stash'`.
- **지역 해금:** `regionExtracts` / `regionBoss` + `REGIONS[id].unlock` 실시간 판정 (`regionUnlocked`).
- **듀얼 퀘스트:** `quest`(창구) + `exoQuest`(부품 수집가) 동시 진행 가능.

---

## 6. 버전 정책

- 필드 추가: `v` 유지 가능 시 optional + default.
- 의미 파괴 변경: `v` 증가 + `loadGame` 분기 추가 + 이 문서 갱신.
