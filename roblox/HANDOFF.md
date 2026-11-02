# 로블록스 이식 — 인수인계

## 목표
웹 게임 Dungeon Slash(2D 도트 핵앤슬래시)를 Roblox 로 이식. 솔로 콘텐츠 + 길드(개선) 포함, 경매장 제외. 수익화 구조는 `MONETIZATION.md`.
방식: Luau 전체 재작성, 서버 권위(전투 계산은 서버). 운영 중인 웹 서버는 그대로 둔다.
**대상은 해외 플레이어: 게임 문구 기본 영어, 설정에서 한국어 전환.** (코드 주석·문서·커밋은 한국어)

## 현재 상태 (2026-11-02)
- 게임 로직 이식 완료: `game/` (Stats, Battle, Loot, Economy, Content, ClassCharm, Extras, Game, Guild, Server.server.lua, Client.client.lua). 데이터 표는 `data/` (JS 에서 자동 생성: emit_data.js → build_data.py).
- 화면(전체 화면, 로블록스 상단 버튼 줄 = GuiInset 아래부터 HUD): 로딩(움직이는 배경, 로그인 없음) → 마을(건물 8채 클릭 → 기능 창, 비슷한 기능은 탭으로 묶음) ⇄ 월드맵(웹 `buildMap` 흐름: 마을→스테이지1~5→심연의 균열→갈래→솟아난 탑, 잠김/다음 목표 표시, 노드 정보 카드) → 전투(웹 960x540 좌표를 화면 높이에 맞추고 가로는 늘림 = 여백 없음) → 결과창(다음/다시/지도/마을). 오른쪽 아래 이동 버튼: 마을 · 지도 · 장비 · 설정.
- 설정 창: 언어(EN/한국어) · 그래픽(UI 크기, 피해 숫자, 피격 반짝임) · 소리(볼륨 3개 + 음소거, SoundGroup Music/SFX — **아직 소리 자체가 없음**) · 베타 관리(게임 주인만). 설정은 세이브 `sv.set`, 언어는 `sv.lang`.
- 언어: `game/Lang.lua` 가 화면 글자를 자동 번역 (원문은 한국어). 번역표 `lang/en.tsv` → `python lang/build_lang.py` → `data/LangEn.lua` (검사 포함). 새 한국어 문구를 넣으면 `python lang/extract.py` 후 en.tsv 에 추가. 번역하지 않을 글자는 속성 `NoTr`.
- 그림: Codex CLI(`codex exec`, image_gen)로 생성 → `roblox/art/` → `python gen_art.py` → `sprites/art_*.rgba` + `data/ArtMap.lua`. 영웅 · 1지역 몬스터 5 · 보스 그룸 · 전투/마을 배경 · 월드맵 · 건물 8. 없는 그림은 도트로 대체.
- 비공개 베타: 서버 허용 명단 (기본 초대 전용, `/beta` 채팅 명령 또는 설정 창). `BETA.md` 참고.
- 저장: DataStore(플레이어/길드/베타). Studio 에서 DataStore 접근이 막혀 있으면 메모리 저장으로 대체(실서버는 그대로 보호).
- **Studio 확인 (Claude Code 의 roblox-studio MCP, 게시된 체험 placeId 84234172872745)**: 로딩 · 마을 · 지도 · 스테이지 1 전투 · 결과창 · 설정 4탭 · 언어 전환 · `/beta` 명령 동작, 오류 없음. 명단 밖 계정 차단은 실서버에서 미확인.

## 알려진 한계 / 남은 일
- 소리 없음: 로블록스 크리에이터 스토어(라이선스 음원)에서 후보를 찾아 연결 예정. 넣을 때 SoundGroup 을 Music / SFX 로.
- 그림: 2차 목록(지역 2~10 몬스터 · 보스 · 배경, `ART_SPEC.md`). 색조 변형 몬스터는 아직 도트.
- 출시 전: 그림을 Roblox 에 업로드해 에셋 ID 로 전환(`gen_art.py` 의 `IDS`, `SpriteMap.SHEETS[키].id`), EditableImage 의존 제거. 개발 중에는 체험 설정 → 보안 → "메시/이미지 API 허용" 필요.
- 미구현: 장비 프리셋, 심연 각인/균열 조각 사용, 세공의 인장, 상위 보스관문 UI, 정예 퀘스트, 참 광석 보너스(분해).
- 밸런스: 단순 봇이 균열 15층 근처에서 정체. 실제 플레이어 곡선은 미검증.
- 길드: 두 계정 실테스트 없음.
- 로블록스 채팅창이 열려 있으면 왼쪽 위 클릭(창의 탭 등)을 가로챈다.

## Studio 반영 방법
HttpService:GetAsync 로 raw.githubusercontent 의 커밋 SHA 고정 URL(`/<sha>/roblox/...`)에서 받아 Script/ModuleScript.Source 에 넣는다. 반영 전 Studio 쪽 Source 가 이전 커밋과 같은지 비교해 Studio 에서 직접 고친 내용을 덮어쓰지 않는다. 새 그림을 올리면 Studio 의 `SpriteMap.BASE` SHA 도 바꾼다. Source 는 20만 자 한도 (그래서 LangEn 은 조각 목록을 실행 시 만든다).
모듈: ReplicatedStorage.Game.{Lang, Stage, Sprites, ...}, Game.Data.{ArtMap, LangEn, SpriteMap, ...}, ServerScriptService.GameServer, StarterPlayerScripts.GameClient.

## 일하는 방법
- 변경 후 반드시 커밋/푸시.
- `data/*.lua` 는 자동 생성물이므로 직접 고치지 말고 생성 스크립트를 고친다.

## 2026-11-02 오후 진행 (Claude)
- 제목 **Arcana Slayer** (화면 표시만; 내부 식별자 · DataStore 이름은 그대로). 시작화면 = 샘플 배경 + 로고, "눌러서 시작".
- UI: Skin.lua(9-slice UI 키트), 글꼴 Balthazar(Theme.watch 로 FontFace 일괄), 마을 HUD(왼쪽 위 캐릭터 카드 · 골드 · 상점, 오른쪽 위 메뉴 아이콘 8, 오른쪽 아래 지도⇄마을), 창 바깥 클릭으로 닫히지 않음.
- 장비 창: 전체/부위 탭, 옵션 티어(T1~) 색 카드, 나란히 비교 툴팁, 클릭 시 재렌더 없음, 끌어다 놓기, 세트 탭(장비·스킬·패시브 1~3), 웹식 자동 분해(Game.autoRules/autoClean, 서버 저장 sv.autoR), 자동 장착.
- 생동감(Ambient.lua): 배경 고정 + 배경 자체 불 픽셀 8프레임 패치(fire_anim.py → ArtMap.PATCHES), 창문 빛, 구름 두 겹, 까마귀, 굴뚝 연기, 전투 안개.
- **전투력**(Power.lua): 웹 powerDetail 이식 + 스킬 83종 배율 실측(data/SkillTM.lua, sim/measure_tm.lua) + 사탄 조건 기대값. 보정 sim/calibrate_power.lua (균열 보스층, 112빌드, R²0.96 · 평균 오차 4층). 표시 = 100·(P로 깨는 난이도)/D(1). 탑은 실측 못 함(엔드게임 빌드도 1층 불가) → 난이도 공식 외삽.
- **아르카나 조각**(sv.arcana): 소환 전용, 1회 10 / 10회 90, 전투·보스·첫 클리어·탑·관문·일일(+10)·퀘스트(+5). 골드 소환 폐지. 스킬 판매 → 분해(연마석).
- **패시브 v2**(gen_passives.py → data/Passives.lua, 200노드, 한/영 데이터): 접속 시 예전 패시브 초기화(sv.passVer=2) + 안내 토스트.
- 지팡이 끼면 마법사 모습(hero/mage.png, summary.hero). 지도 아이콘 15, 패시브 아이콘 21 연결.
- 남은 것: 스킬 카드 48장(83 중 35만 있음, Codex 토큰 아끼는 중) · UI/글씨 통일(옛 보라 화면들) · 스킬 등급 차분 · 탑 전투력 검증.
