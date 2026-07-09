# MoeKov / quackscape — agent notes

웹 프로토타입 개발 시 아래 규칙을 따른다.

## 필수 규칙

→ **[docs/web-dev-rules.md](docs/web-dev-rules.md)**

요약:
- 밸런스/테이블 수정은 `data/*.json` 만 → `node scripts/build-data-tables.js`
- `data.tables.js` 직접 편집 금지
- 아이템·적 id 함부로 rename 하지 말 것
- 세이브 필드 변경 시 `docs/save-schema.md` + `loadGame` 마이그레이션
- 룰 변경 후 `node scripts/phase0-smoke.js`

## 관련 문서

| 문서 | 내용 |
|------|------|
| [docs/web-dev-rules.md](docs/web-dev-rules.md) | 웹 개발 규칙 (일상) |
| [docs/godot-port-plan.md](docs/godot-port-plan.md) | Godot Windows 이식 로드맵 |
| [docs/save-schema.md](docs/save-schema.md) | 세이브 포맷 |
| [data/README.md](data/README.md) | JSON 테이블 설명 |

## 스택

Vanilla JS 전역 스크립트 (`index.html` 로드 순서 유지). ES modules 강제 아님.
