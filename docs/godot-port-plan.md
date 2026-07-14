# MoeKov → Godot (Windows) 이식 계획

**상태:** 초안 (Phase 0 완료)  
**대상:** 현재 웹 프로토타입(vanilla JS) → Godot 4.x 데스크톱(Windows)  
**목적:** 이식 전에 웹 쪽을 정리하고, Godot에서 재구현 순서를 고정한다.

**일상 웹 개발 규칙:** [web-dev-rules.md](./web-dev-rules.md) · 루트 [AGENTS.md](../AGENTS.md)

---

## 1. 배경

| 항목 | 내용 |
|------|------|
| 현재 스택 | HTML5 Canvas + 다중 JS 전역 스크립트 (~7.5k LOC) |
| 핵심 시스템 | 폴리오미노 인벤, 총 레일 조립, 추출 레이드, 지역·보스·퀘스트 |
| 엔진 종속 | Canvas 렌더, DOM 패널 UI, localStorage, WebAudio |
| 이식이 쉬운 부분 | `data.js` 수치/테이블, 패킹·gunStats·퀘스트 등 순수 룰 |
| 다시 짤 부분 | 월드 렌더, HUD/패널, 입력, 오디오, 세이브 I/O |

웹은 **프로토타입·밸런스·콘텐츠 검증**용으로 유지하고,  
Windows 배포용 제품은 **Godot 프로젝트를 새로 쌓는 방향**을 기본으로 한다.  
(웹 엔진을 네이티브 포장하는 방식은 후보에서 제외 — 픽셀 UI·인벤 드래그가 Godot UI와 더 잘 맞음.)

> **방침 전환 (2026-07-15):** 이제 **Godot(`Game_DotKov`)이 메인 개발 버전.**
> 신규 기능은 Godot에 먼저 넣는다 (예: 보험 NPC — 웹에 없음).
> 웹 JS 버전은 유지 보수만, 데이터(`data/*.json`)는 계속 단일 소스로 공유.
> Godot 웹 export가 `ddgd56.github.io/moekov/play/`에 배포됨 (`tools/deploy-web.sh --push`).

---

## 2. 목표 / 비목표

### 목표
- Windows `.exe`로 실행 가능한 단일 플레이어 추출 슈터
- 현재 웹 빌드의 **핵심 루프** 재현  
  (케이브 → 출격 → 루팅·전투 → 탈출/사망 → 퀘스트·조립)
- 픽셀 아트 저해상도 내부 버퍼 + 정수 배율 업스케일
- 키보드·마우스 중심 조작

### 비목표 (1차 포트 범위 밖)
- 멀티플레이 / 온라인
- Steam 연동 (2차 이후)
- 모바일·게임패드 완성도 (입력 훅만 열어둘 수 있음)
- 웹 빌드와 바이너리 간 세이브 호환 필수화 (가능하면 JSON 스키마 공유, 강제는 아님)
- 웹 코드의 1:1 라인 이식

---

## 3. 현황 매핑

| 웹 모듈 | 역할 | Godot 대응 초안 |
|---------|------|------------------|
| `data.js` | 아이템·적·지역·퀘스트·셰이프 | JSON 또는 `Resource` |
| `inventory.js` | 폴리오미노 그리드·드래그 | `Control` + 순수 패킹 로직 |
| `gun.js` | 레일 장착·스탯 집계·보관대 | Autoload / 도메인 클래스 |
| `combat.js` | 적 AI·탄·보스 | 씬 노드 + AI 스크립트 |
| `map.js` | 레이드 프로시저럴 생성 | 생성 서비스 → TileMap/커스텀 draw |
| `systems.js` | 탈출·사망·퀵슬롯·소모 | GameFlow / RaidController |
| `ui.js` | 패널 HTML | `Control` 씬 (창구·작업대·출격…) |
| `render-*.js` | 월드·엔티티 도트 렌더 | Sprite / 커스텀 `_draw` / TileMap |
| `icons.js` | 절차 아이콘 | **사전 bake PNG** 권장 |
| `core.js` | State·세이브·입력·SFX | Autoload `GameState`, `Save`, `Audio` |
| `music.js` | BGM | `AudioStreamPlayer` |
| `main.js` | 루프 | 씬 트리 기본 루프 |

---

## 4. 원칙

1. **데이터 우선** — 밸런스 테이블은 엔진 밖 포맷으로 고정한다.
2. **룰과 뷰 분리** — DOM/Canvas 없는 함수는 테스트 가능한 순수 로직으로 유지·이전한다.
3. **인벤·총이 정체성** — 맵 생성보다 패킹/조립을 먼저 포팅한다.
4. **점진 이전** — 웹에서 콘텐츠를 계속 쌓되, 새 콘텐츠는 JSON 스키마를 지킨다.
5. **Windows 1순위** — 해상도·입력·세이브 경로는 데스크톱 기준으로 정한다.

---

## 5. 단계별 계획

### Phase 0 — 웹 쪽 준비 (Godot 착수 전, 병렬 가능)

**산출물**
- [x] `data/` JSON 분리 초안 (`items`, `enemies`, `regions`, `quests`, `shapes`, `loot_pools`)
- [x] 세이브 스키마 문서 (`save-schema.md`: 버전, 필드, 마이그레이션 규칙)
- [x] `GameState` 필드 목록 (현재 `State` + `player` + raid 런타임 구분)
- [x] 순수 로직 스모크 테스트 유지/확장  
      (패킹, `gunStats`, 지역 해금, 퀘스트 슬롯, `rewardStash`) — `node scripts/phase0-smoke.js`
- [ ] (선택) 아이콘·캐릭터 시트 PNG export 경로  
      (`icons.js` / `editor.html` → `art/export/`)

**완료 조건**
- 웹 빌드가 JSON(또는 동일 소스)을 읽어 기존과 동일하게 동작하거나,  
  최소한 테이블을 한곳에서 수정해 웹에 반영할 수 있을 것.  
  → **달성:** `data/*.json` 소스 + `node scripts/build-data-tables.js` → `data.tables.js` → `index.html` 로드.

**예상 공수:** 수일 ~ 1주 (콘텐츠 작업과 병행)

---

### Phase 1 — Godot 프로젝트 골격 (Windows)

**작업**
- [ ] Godot 4.x 프로젝트 생성, Windows Desktop export 템플릿 설치
- [ ] 내부 해상도 결정 (예: 480×270 또는 640×360) + 정수 배율 스트레치
- [ ] 폴더 규약:

```
godot/
  project.godot
  data/                 # JSON (웹과 공유 가능)
  assets/sprites/
  assets/audio/
  scenes/
    boot/
    cave/
    raid/
    ui/
  scripts/
    autoload/           # GameState, Save, DataDB, Audio
    domain/             # inv, gun, quest, region
    raid/               # combat, mapgen, enemies
  export/
```

- [ ] Autoload: `GameState`, `DataDB`, `SaveService`, `AudioBus`
- [ ] 입력 맵: 이동 WASD, 질주 Shift, 조준 RMB, 사격 LMB, 상호작용 E, 재장전 R, 총 교체 1·2, 퀵슬롯 3·4·5, 가방 Tab, ESC

**완료 조건**
- 빈 창 + 픽셀 스케일 + 키 입력 로그 + `user://` 세이브 더미 기록

**예상 공수:** 1~2일

---

### Phase 2 — 데이터 + 인벤토리 (핵심 #1)

**작업**
- [x] JSON → `DataDB` 로드 (Phase 1에서 완료)
- [x] 아이템 인스턴스 / 그리드 인벤 클래스 (`scripts/domain/inv.gd`, `item_inst.gd` — 웹 `Inv` 1:1)
- [x] 폴리오미노 배치·회전·충돌 검사 포팅 (직렬화 포맷 `{w,h,items:[{d,x,y,r}]}` 웹 호환)
- [x] 창고·가방 UI 드래그앤드롭 (`scenes/ui/inv_test.tscn` — R 회전·스냅·유효성 표시)
- [x] 툴팁 (축약판 — 이름·종류·mods·설명·가치)
- [x] 아이콘 시트 bake: 웹 `itemIconCanvas` 188종 → `assets/sprites/items16.png` (§Phase 0 선택 항목 해소)

**완료 조건**
- [x] 테스트 씬에서 아이템 생성·이동·회전·저장·로드 (2026-07-14 확인)
- [x] 웹과 동일 케이스로 패킹 스모크 통과 — `tests/packing_smoke.tscn` headless, placed=3/ser=3 웹과 일치

**남은 폴리시 (Phase 4 UI 본편에서):** 모양 채움 아트(SHAPE_ART 대응), Ctrl클릭 빠른 이동, 더블클릭 사용, 미식별 실루엣

**예상 공수:** 1~2주 → 실제 착수일 완료 (테스트 씬 기준)

---

### Phase 3 — 총 조립 + 보관대 (핵심 #2)

**작업**
- [x] 몸통 레일 / 부착물 장착 규칙 (`scripts/domain/gun_build.gd` — canMount/attFootprint/mountLocalCells 1:1)
- [x] `gunStats` 집계 (발사 모드 우선순위·엑조틱·유물 기믹 포함)
- [x] 작업대 테스트 UI (`scenes/ui/bench_test.tscn` — 레일 스냅 장착·R 회전·클릭 해제·몸통 교체·스탯 실시간)
- [~] 총 보관대 — GameState에 guns/stash/stashSlots + `grant_stash_slots`(rewardStash 전용 규칙) 포팅. 보관대 UI·퀘스트 연결은 Phase 4에서
- [x] 스탯 일치 검증 파이프라인: `tools/gen-gun-fixtures.js`(웹 실엔진 실행) → `tests/gun_smoke.tscn`

**완료 조건**
- [x] 조립한 총 스탯이 웹과 일치 — 픽스처 13케이스(몸통 6종 bare+만재, 부착물 3~8개) **377필드 전부 일치** (2026-07-14)
- [ ] 보관대 해금·확장 규칙 동작 (규칙 함수는 포팅, 퀘스트 연동 검증은 Phase 4)

**남은 폴리시 (Phase 4 UI 본편):** 슬롯 1·2 전환, 필터 태그, 보관대 넣기/꺼내기 UI

**예상 공수:** 1~2주 → 코어 완료 (테스트 씬 기준)

---

### Phase 4 — 케이브 허브 + 메타 진행

**작업**
- [x] 케이브 허브 씬 (`scenes/cave/cave_hub.tscn` — 탭형: 창구/수집가/업그레이드/출격 + 창고·작업대 씬 이동. 걸어다니는 케이브 월드는 Phase 5 렌더와 함께)
- [x] 퀘스트: 일반 + 엑조틱 슬롯 동시 진행 (`scripts/autoload/meta.gd` — ensureOffers/accept/complete/kill·extract 크레딧 포팅)
- [x] 지역 해금 (`region_unlocked` — extracts/boss 게이트)
- [x] 업그레이드 (구매·재료 소모·인벤 리사이즈 아이템 보존)·코인·세이브 연동 (메타 필드 웹 세이브 스키마 호환)
- [ ] 사격장(선택) — Phase 5 이후
- [x] 레이드 없는 동안 처치/탈출 시뮬 버튼으로 루프 검증 (Phase 5에서 실전 대체)

**완료 조건**
- [x] 세이브 로드 후 케이브에서 퀘스트 수락·보고·출격 지역 선택까지 루프 — `tests/meta_smoke.tscn` PASS (지역게이트·듀얼퀘·rewardStash·fetch·업그레이드·세이브 왕복)

**예상 공수:** 1~2주 → 코어 완료 (허브는 탭형 1차)

---

### Phase 5 — 레이드 코어

**작업**
- [x] 플레이어 이동·스태미나·조준(RMB 감속+카메라)·사격·재장전·구르기(무적) — `scenes/raid/raid.gd`
- [x] 총알 / 히트 / 상태이상 (burn·poison·slow·stun·pierce·knock, gunStats 발사모드 반영)
- [x] 적 스폰·AI — 근접(zduck/fastduck/bigduck)·원거리(spitter/gunner)·폭탄(bomber), 지역 배율·풀 가중치 적용. 스나이퍼·보스는 Phase 6
- [x] 컨테이너 루팅 — E 즉시 획득(container_types roll → loot_pools). 식별 딜레이·드래그 루팅 패널은 폴리시 단계에서 결정
- [x] 탈출 존(3초 대기) / 사망 시 가방 드롭 → 다음 출격 시체 회수 (deathCache)
- [x] 낮·황혼·밤 페이즈 — CanvasModulate 어둠 + 플레이어 라이트(스탯 light 반영), 밤 스폰 가속
- 맵은 고정 테스트맵 (§8 리스크 대응대로 — 프로시저럴은 Phase 6)

**완료 조건**
- [x] 단일 지역에서 출격 → 전투·루팅 → 탈출/사망 → 케이브 복귀 (2026-07-14, 스모크 3종 유지 PASS)

**남은 폴리시:** 캐릭터/적 스프라이트(현재 도형), 총 조립 외형 반영, 루팅 패널 UI, 사운드

**예상 공수:** 2~3주 → 코어 1일 (테스트맵 기준)

---

### Phase 6 — 맵 생성 + 지역 차별화 + 보스

**작업**
- [x] 프로시저럴 맵 — 간략화 자체 구현 (스폰↔탈출 대각, 장애물 군락, 상자 산개, 습지 물웅덩이). 웹 `buildRaid`의 집/실내·도로는 미구현 (후속)
- [x] 지역 프로필 — 배율·스폰풀(기존) + 바이옴 지형 3종 (meadow/industrial/swamp 타일·프롭 픽셀맵) + 지역 루트풀 55% 규칙(`pickRegionalPool` 대응)
- [x] 보스 3종 패턴 — 덤불대장(돌진) / 미니킹(소환+방사탄) / 늪여왕(5갈래 독다트, 플레이어 독 DOT)
- [x] 탐지기 — 휴대용(퀵슬롯, N초) + 탐지 모듈(상시) → 탈출구 방향 화살표 HUD
- [x] 엑조틱 파츠 발사 모드 (Phase 5에서 gunStats·탄환에 이미 반영)

**완료 조건**
- [x] 3지역 출격 가능, 보스 처치 → 해금 플로우 동작 (2026-07-15)

**남은 것:** ~~집/실내 구조물~~(완료 — 지붕 페이드·실내 상자·상주 적·벽 시야 차단·현관 매트), 도로/지형 다양화 (웹 buildRaid 수준: 강·다리·농장·차량·야적장), 지역별 적 팔레트 변주

**Phase 7 선행분 (완료):** SFX 12종 런타임 파형 합성(에셋 0개), 폐공장·습지 BGM = Battle_01, 스폰 보호 2초(웹 iframe=2)

**예상 공수:** 2~4주 → 코어 1일

---

### Phase 7 — 폴리시 + Windows 배포

**작업**
- [ ] 오디오 (SFX 목록 매핑, BGM)
- [ ] HUD·토스트·옵션(전체화면, 스케일, 볼륨)
- [ ] 성능 프로파일 (적·탄 상한)
- [ ] Windows export, 아이콘, 버전 표기
- [ ] (선택) 설치 패키지 / zip 배포
- [ ] 스모크 체크리스트 (아래 §7)

**완료 조건**
- 클린 Windows 환경에서 설치 없이(또는 설치 후) 풀 루프 플레이 가능

**예상 공수:** 1~2주

---

## 6. 데이터·세이브 규약 (Phase 0에서 확정)

### 6.1 공유 데이터
- 단일 소스: 가능하면 레포 루트 `data/*.json` 을 웹·Godot이 함께 참조
- 아이템 `id` 문자열 안정성 유지 (세이브·퀘스트 `rewardItem` 의존)

### 6.2 세이브
- 포맷: JSON, `v` 버전 필드 필수
- 경로: Godot `user://moekov_save.json` (웹은 localStorage 키 유지 가능)
- 마이그레이션: `v` 단위 함수 테이블 (웹 `loadGame` 마이그레이션 이력을 문서에 반영)

### 6.3 런타임 vs 영속
| 영속 (`GameState`) | 런타임 (레이드 중만) |
|--------------------|----------------------|
| coins, up, inv, guns, quests, regions, stash… | player 좌표, enemies, bullets, raid.time… |

---

## 7. 검증 체크리스트 (포트 완료 기준)

- [ ] 신규 게임 → 튜토리얼 구간(뒷동산 탈출 3회) → 공장 해금
- [ ] 일반 퀘스트 + 엑조틱 퀘스트 동시 진행
- [ ] 보관대: 아무 퀘스트가 아니라 `rewardStash` 만 칸 증가
- [ ] 총 조립·사격·엑조틱 모드 1종 이상
- [ ] 탐지기 소모 / 탐지모듈 장착
- [ ] 지역별 보스 1회 스폰·처치·드롭
- [ ] 사망 후 시체 회수(구현 범위에 포함할 경우)
- [ ] 세이브 후 재실행 시 상태 복원
- [ ] 1280×720 / 1920×1080 / 전체화면에서 UI 깨짐 없음

---

## 8. 리스크와 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 프로시저럴 맵 포팅 난이도 | 일정 지연 | Phase 5는 고정 테스트 맵, Phase 6에서 생성 복원 |
| 인벤 드래그 UX 차이 | 체감 품질 | 웹 조작감 기준 비디오 녹화 후 대조 |
| 절차 아이콘 의존 | 아트 공백 | Phase 0에서 PNG bake, Godot는 정적 텍스처 |
| 전역 JS 결합 | 포팅 누락 | State/함수 목록 체크리스트 + 스모크 테스트 |
| 범위 팽창 (신규 콘텐츠) | 포트 미완 | 포트 브랜치는 콘텐츠 프리즈 또는 JSON만 동기화 |

---

## 9. 일정 가이드 (1인 기준, 대략)

| Phase | 내용 | 누적 |
|-------|------|------|
| 0 | 웹 데이터/스키마 준비 | ~1주 |
| 1 | Godot 골격 | ~1주 |
| 2–3 | 인벤 + 총 | ~3–4주 |
| 4 | 케이브·메타 | ~5–6주 |
| 5 | 레이드 코어 | ~8–9주 |
| 6 | 맵·보스·지역 | ~11–12주 |
| 7 | 폴리시·배포 | ~12–14주 |

콘텐츠를 웹에서 계속 키우면 위 일정과 **겹치지 않게** Phase 0 규약만 지키면 된다.

---

## 10. 의사결정 로그 (확정 시 체크)

- [x] Godot 버전: **4.7 stable** — 프로젝트: `/Users/tamsoo/TamsooNAS/12_Work_Game/Game_DotKov` (2026-07-14 생성)
- [x] 렌더러: **Compatibility (GL)** — 2D 도트에 충분, 저사양 커버, 웹 데모 가능
- [x] 언어: **GDScript** (기본)
- [x] 내부 해상도: **640×360** + 정수 배율 (viewport stretch, 웹 ZOOM=2 체감과 유사, 1080p=3배)
- [x] 데이터 포맷: **`data/*.json` 공유** → 웹은 `scripts/build-data-tables.js`로 `data.tables.js` 생성
- [x] 아이콘: **PNG bake 권장** (Phase 0 선택 항목, 미구현 유지) / 당분간 웹 절차 생성 유지
- [x] 1차 지역 수: **3개 전부** (hill / factory / marsh) 유지

---

## 11. 다음 액션 (바로 할 일)

1. ~~Phase 0 데이터 JSON·세이브 스키마·스모크~~ **완료**
2. ~~Godot 4.x 프로젝트 생성 + 골격~~ **완료** (`Game_DotKov`: 설정·입력맵·오토로드 4종·data 동기화·부트 씬 — 남은 것: Windows export 템플릿 설치 후 export 스모크)
3. ~~아이콘 PNG bake~~ **완료** (`assets/sprites/items16.png` + json 매핑, 브라우저에서 export)
4. ~~Phase 2: 인벤 폴리오미노 포팅~~ **완료** (도메인 `Inv`/`ItemInst` + 테스트 씬 + 패킹 스모크)
5. ~~Phase 3: 총 조립~~ **완료** (`gun_build.gd` + 작업대 테스트 씬 + 픽스처 377필드 일치)
6. ~~Phase 4: 케이브 허브 + 메타~~ **완료** (`meta.gd` + `cave_hub.tscn` + 메타 스모크)
7. Phase 5: 레이드 코어 착수 — 플레이어 이동·사격, 적 스폰·AI, 맵은 고정 테스트맵부터

---

## 12. 관련 코드 앵커 (웹)

- 세이브: `core.js` — `saveGame` / `loadGame` / `State`
- 데이터: `data/*.json` (소스) → `data.tables.js` — `ITEMS`, `REGIONS`, `QUESTS`, `ENEMY_TYPES`
- 인벤: `inventory.js` — `Inv`, `shapeOf`, 드래그
- 총: `gun.js` — `canMount`, `gunStats`, `stashSlots`
- 전투·보스: `combat.js` — `updateBossAI`, `spawnEnemy`
- 맵: `map.js` — `buildRaid`
- 진입: `main.js`, `index.html`
