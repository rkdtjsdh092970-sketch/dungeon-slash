# 로블록스 이식 — 인수인계

## 목표
웹 게임 Dungeon Slash(2D 도트 핵앤슬래시)를 Roblox 로 이식. 솔로 콘텐츠 + 길드(개선) 포함, 경매장 제외. 수익화 구조는 `MONETIZATION.md`.
방식: Luau 전체 재작성, 서버 권위(전투 계산은 서버). 운영 중인 웹 서버는 그대로 둔다.

## 현재 상태
- 게임 로직 이식 완료: `game/` (Stats, Battle, Loot, Economy, Content, ClassCharm, Extras, Game, Guild, Server.server.lua, Client.client.lua). 데이터 표는 `data/` (JS 에서 자동 생성: emit_data.js → build_data.py).
- 클라이언트: 텍스트 UI + 2D 전투 무대(`Stage.lua`, `Sprites.lua`). 웹 도트 스프라이트를 `sprites/*.rgba` 로 변환해 사용 (`gen_sprites.py`, `SPRITES.md`).
- 저장: DataStore(플레이어/길드). 길드 DataStore 는 키 인코딩 처리 완료. **실제 DataStore 는 Studio 에서 API 접근이 꺼져 있어 검증하지 못함.**
- 베타 게시 체크리스트: `BETA.md`.

## 알려진 한계 / 남은 일
- 그래픽: 지금은 웹 도트 + 코드로 그린 배경. 목표는 일러스트풍(참고: 상용 Roblox 게임 화면 — 상단 자원 바, 가로 탭, 옆면 전투, 하단 스킬 카드, 큰 피해 숫자). 이미지는 사용자가 **ChatGPT 채팅(무료 가능)** 에서 `ART_SPEC.md` 프롬프트로 생성해 `roblox/art/` 에 커밋한다 (Codex 의 이미지 생성은 무료 플랜에서 불가). 올라오면 정적 이미지 모드를 `Stage.lua` 에 추가해 연결한다.
- 이 PC 의 Codex 앱: 무료 플랜 + 세션 한도 때문에 이미지 생성 작업은 맡길 수 없음. 코드 작업은 가능.
- 출시 전: 업로드한 에셋 ID 로 전환(`SpriteMap.SHEETS[키].id`), EditableImage 의존 제거.
- 미구현: 장비 프리셋, 심연 각인/균열 조각 사용, 세공의 인장, 상위 보스관문 UI, 정예 퀘스트, 참 광석 보너스(분해).
- 밸런스: 단순 봇이 균열 15층 근처에서 정체. 실제 플레이어 곡선은 미검증.
- 길드: 두 계정 실테스트 없음.

## Studio 반영 방법 (웹 세션이 쓰는 방식)
HttpService:GetAsync 로 raw.githubusercontent 의 커밋 SHA 고정 URL(`/<sha>/roblox/...`)에서 받아 ModuleScript.Source 에 넣는다. require 캐시 때문에 갱신할 땐 Destroy 후 새로 만든다.

## 일하는 방법
- 변경 후 반드시 커밋/푸시. 웹 세션이 SHA 로 가져다 Studio 에 반영한다.
- `data/*.lua` 는 자동 생성물이므로 직접 고치지 말고 생성 스크립트를 고친다.
