# Dungeon Slash — v3.1 ~ v3.22 변경 요약 + 인수인계 (원본: 프로젝트 문서 `claude/game-v3-changelog.md`, 10/28 기준)

이후 v4.x는 `source/src/notes.js`(패치노트)와 `docs/tower-design.md` 참고. 충돌하면 소스가 우선.

## 1. 작업 방식 / 상시 규칙 (사용자 요구)
- 모든 답변은 한국어. 친구 테스트용이라 보안은 느슨해도 됨. 최종 이식 목표는 Godot였으나 현재는 Roblox 이식(`roblox/`) 진행 중.
- 업데이트마다 `src/notes.js` 맨 위에 패치노트 항목 추가 (버전·날짜·제목·items). 패치노트는 짧게.
- 노드/UI가 겹치지 않게, 세로쓰기·읽기 어려운 글씨 금지. **액트 1~10은 쉬워야 함**(너프는 엔드게임에만). 사용자가 말하기 전에는 너프하지 않는다.
- 실제 사이트 URL은 샌드박스에서 접근 불가 → 항상 "직접 확인 못함"이라고 밝힐 것. Playwright 로컬 테스트(`test/pw*.js`)로 검증.
- 긴 한 번의 명령은 거부될 수 있음 → 짧게 나눠 실행.

## 2. 빌드 / 배포 / 서버
- 빌드: `source/build.py`가 `source/src/*.js`(+`template.html`, 스프라이트 시트)를 `dist/game.html`+`dist/ver.txt`(BUILD_ID)로 합침. 엔진 모듈(util,data,data2~6,state,battle,battle2)은 DOM 없이 `test/simlib.js`로 Node 시뮬 가능.
- 배포: `dist/game.html`→저장소 루트 `index.html`, `ver.txt`로 복사 후 커밋·푸시. Cloudflare Worker가 `index.html`을 서비스(접속 주소 https://dungeon-slash.jjy1.workers.dev). **이 웹 서버는 사용자가 따로 말하기 전에는 건드리지 않는다.**
- 서버: Cloudflare Worker `dungeon-slash` + D1 (id `2c3c1e66-9e02-4048-8efb-1e5701f9061c`). 워커 소스 `source/server/worker.js`. 테이블: players, auctions, guilds, chat, revoked, save_backup, mail. (경매장은 로블록스 이식에서 제외)
- 아트: `source/art/` (스프라이트 PNG + 생성 스크립트 `boss3.py`, `boss4.py` 등).

## 3. 버전별 요약
- **3.1~3.3** 스킬 등급 확장(이터널·소버린·엔젤릭), 저격수·패시브 프리셋, 데미지 공식 도감, 툴팁, 퀘스트 느낌표, 길드 패시브.
- **3.4~3.9** 황금 보물고 상향, 공허의 군주 3·4단계 상향·입장 조건, 화염 정령왕 상향.
- **3.10~3.13** 마나 방패 고유 교체·새 고유 18종, 흡혈 상한(토큰 버킷), 물리·마법 밸런스.
- **3.14** 마을 우편함(서버 우편 → 골드/강화석).
- **3.15** 물리 보스 '철갑의 투사 그라크'(titan)와 번개 보스 '뇌제 라이곤'(storm). 화염(hive)과 함께 `EB` 표(data2.js)로 공통 처리, 1~4단계, 전용 고유 각 7종, 보스 전용 스킬 12종.
- **3.16** 균열 탑 10층 단위 보상 우편, 장비 개편(엔드게임 희귀3·전설4 옵션, 재굴림 비용·균등 롤, 강화 효율), 소버린 신규 12종, 보스 4종 새 도트.
- **3.17** 상태이상 대상 추가 피해(출혈·중독·점화·둔화·감전), 연계 스킬 6종, 핵심 고유 10종.
- **3.18** 인벤토리 '자동 분해'(등급별 유지/판매/분해, ▲보호, 옵션 품질 기준), 피격 화면 반짝임·흔들림 설정.
- **3.19** 보스 고유 드랍 하향, 설정 '다음 스테이지로 자동 이동'.
- **3.20** 스킬 드랍 증가, 스킬 승급 삭제, 스킬 분해(연마석), 스킬 자동 정리.
- **3.21~3.22** 열쇠 4종 드랍 확률 전투당 1%.

## 4. 핵심 구조 메모
- 속성 보스 공통 표 `EB`(data2.js): hive/titan/storm → boss, pool, key, wtype, stage 키, tiers/need. `isEB(kind)`. 드랍은 state.js `rollDrops`의 isEB 분기. 보스 능력은 battle.js `bossAbility`.
- 고유 등급: U_TIERS 1 미스틱 / 2 이터널 / 3 소버린 / 4 엔젤릭. 이터널+는 `ensureUX`로 추가 옵션, `clampItem`에서 새 고유 능력을 기존 장비에 보충.
- 장비 등급과 고유 등급은 별개. 엔드게임 = ilvl > 10.
- 전투력(playerPower)은 마나/마법 빌드를 낮게 평가하는 알려진 문제 있음 (v4.4x에서 일부 보정, 정밀화는 미완).
- 시뮬 도구: `test/uleg.js`, `wpn.js`, `statchk.js`, `ebbal.js`, `goldchk.js`, `pw50~58.js`.

## 5. 남은 이슈
- 열쇠 1%는 매우 귀함. 전투력 표시 모델의 마나/마법 과소평가. 철갑 태세·피뢰침 기믹 체감 미검증. 실사이트(워커) 동작은 샌드박스에서 확인 불가.
