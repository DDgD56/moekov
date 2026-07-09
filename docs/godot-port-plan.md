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
- [ ] JSON → `DataDB` 로드
- [ ] 아이템 인스턴스 / 그리드 인벤 클래스 (웹 `Inv` 대응)
- [ ] 폴리오미노 배치·회전·충돌 검사 포팅
- [ ] 창고·가방 UI 드래그앤드롭
- [ ] 툴팁 (스탯·소켓·설명)

**완료 조건**
- 에디터/테스트 씬에서 아이템 생성·이동·회전·저장·로드
- 웹과 동일 케이스로 패킹 스모크 통과

**예상 공수:** 1~2주

---

### Phase 3 — 총 조립 + 보관대 (핵심 #2)

**작업**
- [ ] 몸통 레일 / 부착물 장착 규칙 (`canMount`, footprint)
- [ ] `gunStats` 집계 (발사 모드·엑조틱 포함)
- [ ] 작업대 UI (슬롯 1·2, 필터 태그: 총기·소켓·귀중품·음식)
- [ ] 총 보관대 (`stashSlots` / `rewardStash` 규칙 유지)

**완료 조건**
- 조립한 총 스탯이 웹과 오차 허용 범위 내 일치
- 보관대 해금·확장 규칙이 퀘스트 보상 전용으로 동작

**예상 공수:** 1~2주

---

### Phase 4 — 케이브 허브 + 메타 진행

**작업**
- [ ] 케이브 씬 (작업대·창고·창구·부품 수집가·출격·업그레이드)
- [ ] 퀘스트: 일반 슬롯 + 엑조틱 슬롯 동시 진행
- [ ] 지역 해금 (`extracts` / `boss`)
- [ ] 업그레이드·코인·세이브 연동
- [ ] 사격장(선택, 웹 동등 기능)

**완료 조건**
- 세이브 로드 후 케이브에서 퀘스트 수락·보고·출격 지역 선택까지 루프

**예상 공수:** 1~2주

---

### Phase 5 — 레이드 코어

**작업**
- [ ] 플레이어 이동·스태미나·조준·사격·재장전
- [ ] 총알 / 히트 / 상태이상 (burn, poison, slow, stun 등)
- [ ] 적 스폰·AI (근접·원거리·폭탄·엘리트)
- [ ] 컨테이너 루팅 UI (식별 딜레이 포함 여부 결정)
- [ ] 탈출 존 / 사망·시체 회수
- [ ] 낮·황혼·밤 페이즈 + 웨이브

**완료 조건**
- 단일 지역(뒷동산)에서 출격 → 전투·루팅 → 탈출/사망 → 케이브 복귀

**예상 공수:** 2~3주

---

### Phase 6 — 맵 생성 + 지역 차별화 + 보스

**작업**
- [ ] `buildRaid` 프로시저럴 로직 포팅 (또는 단계적 단순화 후 복원)
- [ ] 지역 프로필 (hill / factory / marsh) 배율·풀·지형
- [ ] 보스 3종 (`hillchief` / `kingduck` / `mirequeen`) 패턴
- [ ] 탐지기(소모·스코프 모듈) UI
- [ ] 엑조틱 파츠 발사 모드

**완료 조건**
- 3지역 출격 가능, 보스 처치·해금 플로우 웹과 동일

**예상 공수:** 2~4주

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

- [x] Godot 버전: **4.x** (권장, Phase 1에서 프로젝트 생성)
- [x] 언어: **GDScript** (기본)
- [ ] 내부 해상도: ________ (Phase 1에서 확정, 후보 480×270 / 640×360)
- [x] 데이터 포맷: **`data/*.json` 공유** → 웹은 `scripts/build-data-tables.js`로 `data.tables.js` 생성
- [x] 아이콘: **PNG bake 권장** (Phase 0 선택 항목, 미구현 유지) / 당분간 웹 절차 생성 유지
- [x] 1차 지역 수: **3개 전부** (hill / factory / marsh) 유지

---

## 11. 다음 액션 (바로 할 일)

1. ~~Phase 0 데이터 JSON·세이브 스키마·스모크~~ **완료**
2. Godot 4.x 빈 프로젝트 생성 + Windows export 스모크 (Phase 1)
3. (선택) 아이콘 PNG bake 경로
4. Phase 2: JSON → DataDB + 인벤 폴리오미노 포팅 착수

---

## 12. 관련 코드 앵커 (웹)

- 세이브: `core.js` — `saveGame` / `loadGame` / `State`
- 데이터: `data/*.json` (소스) → `data.tables.js` — `ITEMS`, `REGIONS`, `QUESTS`, `ENEMY_TYPES`
- 인벤: `inventory.js` — `Inv`, `shapeOf`, 드래그
- 총: `gun.js` — `canMount`, `gunStats`, `stashSlots`
- 전투·보스: `combat.js` — `updateBossAI`, `spawnEnemy`
- 맵: `map.js` — `buildRaid`
- 진입: `main.js`, `index.html`
