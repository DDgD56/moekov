# 웹 개발 규칙 (Godot 이식 대비)

**대상:** 현재 웹 프로토타입(MoeKov / quackscape)  
**전제:** Godot 이전 전까지 **웹에서 컨텐츠·밸런스·시스템을 계속 개발해도 된다.**  
Phase 0 준비(`data/*.json`, 세이브 스키마, 스모크)는 그걸 전제로 한 것이다.

관련 문서: [godot-port-plan.md](./godot-port-plan.md) · [save-schema.md](./save-schema.md) · [data/README.md](../data/README.md)

---

## 1. 원칙

1. **웹이 제품 검증 장소** — 재미·밸런스·루프는 웹에서 먼저 확정한다.
2. **데이터는 엔진 밖** — 테이블은 `data/*.json` 이 단일 소스. Godot도 같은 JSON을 읽는다.
3. **id 안정성** — 이미 배포·세이브에 쓰인 문자열 id는 함부로 바꾸지 않는다.
4. **룰과 뷰 분리 유지** — DOM/Canvas 없는 로직은 가능하면 순수 함수로 두고, 스모크로 검증한다.
5. **세이브 호환** — 필드 추가·의미 변경 시 스키마 문서와 `loadGame` 마이그레이션을 같이 한다.

---

## 2. 데이터 (`data/*.json`)

### 해도 됨
- 아이템·적·지역·퀘스트·루트 풀·셰이프 추가/수치 조정
- `blurb`, `reward`, `mods` 등 밸런스 필드 수정

### 반드시 지킬 것

| 규칙 | 설명 |
|------|------|
| **소스** | 손 편집은 `data/*.json` 만. `data.tables.js` 는 생성물 — 직접 수정 금지. |
| **빌드** | JSON 수정 후: `node scripts/build-data-tables.js` |
| **로드** | `index.html` 은 `data.tables.js` → `data.js` 순. 순서 바꾸지 말 것. |
| **id** | `items.json` / `enemies.json` 키, 퀘스트 `rewardItem`, 세이브에 박힌 id **변경·삭제 자제**. 대체는 새 id 추가 + 구 id 유지 또는 마이그레이션. |
| **참조** | 루트 풀·퀘스트·해금 조건이 가리키는 id가 JSON에 실제로 있는지 확인할 것. |

### 권장 워크플로
1. `data/items.json` (등) 편집  
2. `node scripts/build-data-tables.js`  
3. 브라우저 새로고침  
4. (룰 건드렸으면) `node scripts/phase0-smoke.js`

---

## 3. 세이브

- 구현: `core.js` — `saveGame` / `loadGame`
- 문서: `docs/save-schema.md` (필드 목록·영속 vs 런타임·마이그레이션)

### 필드 추가 시
1. `saveGame` 페이로드에 기록  
2. `loadGame` 에 default / 구세이브 분기  
3. `docs/save-schema.md` 갱신  
4. `v` 의미 파괴 시에만 버전 증가

### 주의
- **보관대 칸** (`stashSlots`) 은 아무 퀘스트 완료로 늘리지 않는다. `rewardStash` / `unlock:'stash'` 만.
- **듀얼 퀘스트:** `quest`(창구) + `exoQuest`(부품 수집가) 슬롯을 섞지 말 것.
- 레이드 런타임(`raid`, `player` 전투 필드, `panel` 등)은 세이브에 넣지 않는다.

---

## 4. 코드 수정 가이드

| 영역 | 파일 | 비고 |
|------|------|------|
| 테이블 | `data/*.json` | 위 §2 |
| 유틸 | `data.js` | `rnd`/`pick` 등만. 테이블 정의 넣지 말 것 |
| 인벤 | `inventory.js` | 패킹 로직 변경 시 스모크 필수 |
| 총·보관대 | `gun.js` | `gunStats` / `grantStashSlots` |
| 전투·보스 | `combat.js` | `killEnemy` 가 양 퀘스트 슬롯 갱신 |
| 탈출·해금 | `systems.js` | `onExtract` / `regionUnlocked` |
| UI·퀘스트 완료 | `ui.js` | `completeQuest('main'\|'exo')` |
| 세이브·State | `core.js` | 스키마 문서 동시 수정 |

- 전역 스크립트 구조 유지 (ES modules 전면 전환은 필수 아님).
- 새 **순수 룰**을 넣으면 `scripts/phase0-smoke.js` 에 실제 함수 호출 테스트를 추가하는 것을 권장 (루프 재구현 금지).

---

## 5. 검증

```bash
# 데이터 테이블 재생성
node scripts/build-data-tables.js

# Phase 0 순수 로직 스모크 (패킹, gunStats, 지역 해금, 듀얼 퀘스트, rewardStash)
node scripts/phase0-smoke.js
```

스모크는 **배포 코드의 함수**를 호출해야 한다. 테스트 안에 동일 로직을 다시 짜지 말 것.

---

## 6. Godot 이전이 시작되면 (참고)

웹 개발은 계속 가능하되:

- 새 컨텐츠는 가능하면 **JSON 스키마만**으로 표현되게 할 것 (하드코딩 문자열 남발 줄이기).
- 포트 브랜치와 메인 웹이 갈라지면, 테이블은 `data/*.json` 만 동기화해도 밸런스는 맞출 수 있다.
- 실제 Godot 씬/UI 작업은 [godot-port-plan.md](./godot-port-plan.md) Phase 1+ 를 따른다.

---

## 7. 한 줄 요약

**웹에서 마음껏 개발하되, 숫자는 `data/*.json` → 빌드, id·세이브는 안정적으로, 룰 바꾸면 스모크.**
