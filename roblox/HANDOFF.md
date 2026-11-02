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

## 2026-11-02 밤 — 전 테스터 밸런스 기준 반영 (진행 중)
- 기준 빌드: sim/reference.lua (장비 8 · 전설 5줄 · 옵션 티어 구성 · 품질 75% · 유효 옵션만 · 뽑기 기준 스킬 · 사탄 효과 · 계시의 돌). 성장 시뮬: sim/progress.lua.
- 스킬 역할별 기준선 보정 22종 상향(data/SkillBalance.lua, sim/skill_balance.lua). 패시브 마법 원소 분기에 주문 치명. 자동 배분 무기 계열 맞춤.
- 균열 FLOOR_TAB 재설정 → 기준 빌드가 목표 층 ±5 안 (물리·마법 모두). 전투력 FIT 재보정 A=9.085 G=2.250.
- 엔드게임: 보스 관문 단계별 GATE_TIERS {118..121}(공허 VOID_TIER 중립화), 탑 SPIRE.TAB 140→158, 신전=탑 20/50/80/100층, 레이드 153/157.5/164, 상급 관문 194~.
- **남은 문제**: 탑은 층 종류(보스층 0.8 쉬움, 20층 벽, 보스 10종 순환) · 운 편차가 커서 1판 측정으로 못 맞춤 → 여러 판 승률(≥75%) 기준 재측정 필요. 물리 기준 빌드가 탑에서 자주 사망(버티는 힘 부족). 심연의 문(raid)은 수정 직접 터뜨리기 조작이 필요해 시뮬 불가 → 미조정.
- 시작: 직업 선택(전사/마법사 스타터 3스킬) + 무료 10연차, 계열 소환, 중복=Lv+1, 연마석 폐지(→아르카나).

## 2026-11-02 — 화면 · 연출 손질 (Claude)
- 마을: 건물이 함께 그려진 배경 1장(`art/bg/town.jpg`)으로 교체, 건물 그림 덧붙이기 · 오른쪽 캐릭터 · 노란 이름표 제거. 누름 영역은 `Client` BUILD.box(그림 비율).
- 지도: 지점별 전용 창(균열 · 탑 층 목록, 보스 관문 보스 · 단계, 신전 · 레이드 난이도, 권장 전투력). 협곡 안개 · 용암 빛 · 불씨(Ambient mists/lights).
- 패시브: 클릭 시 다시 그리지 않음(깜빡임 제거), 찍은 노드 클릭 · 우클릭 = 빼기(서버 `passdrop`, 끝 노드만).
- 새 계정: 큰 직업 선택 → 짧은 튜토리얼(소환 → 스킬 칸 → 초원 1, 초원 1~4 첫 클리어마다 안내, sv.tut 0→99) · 도움말 공략.
- 전투: `BattleFx.lua` 스킬별 이펙트(그림은 `gen_fx.py` → art/fx), 영웅 돌진 · 내려찍기 · 시전 · 잔상, 몹 걸음 · 덤벼들기 · 밀려남, 히트스톱. 균열 배경(bg8) 새 그림(땅이 화면 46%부터).
- 확인 안 됨: 마법사(지팡이) 전투 연출은 Studio에서 화면으로 보지 못함. 실제 서버 미확인.
- Studio 시험용 Debug 값: "start"(직업 선택), "tut", "tutst".

## 2026-11-02 저녁 — 길드 v2 · 화면 정리 · 템포 (Claude)
- 길드 v2: `game/Guild.lua`(문양 · 색 · 소개 · 가입 방식 open/apply/closed · 최소 레벨, 신청 · 초대, 부길드장 · 추방 · 위임, 연구 4종, 레벨별 상점, 기여도 = 콘텐츠 + 기부) · `game/GuildUI.lua`(Menus 가 20만 자 한도를 넘어 분리). 랭킹에 길드 레벨 · 길드 전투력 탭.
- Studio 확인(시험 계정, FreshTest): 찾기 · 창설 · 홈 · 길드원 · 콘텐츠(길드 보스 도전 기록) · 연구 · 상점 · 관리(문양/색 즉시 변경) · 기부 · 랭킹 동작. **두 계정 신청/초대/추방은 아직 미확인.**
- Studio 시험 도구: `ServerStorage` 속성 `FreshTest=true`(세이브 불러오기/저장 안 함, 길드 메모리 저장소) + `TestGold=<숫자>`(접속 시 골드 지급). Studio 에서만 동작.
- 글꼴에 없는 기호(♛ ✦ ☾ ♞ ✠)는 빈칸으로 나온다 → 이모지나 ❖ ⚔ ☠ 만 쓴다.
- 템포: 균열 FLOOR_TAB 30층 이후 상향, 물리 기본 피해 1.4. 목표(x3 배속 기준) 240판 50~60층, 720판 중앙값 100층. 성장 시뮬 `sim/progress.lua`(결과 marks[n] = 120·n 판의 균열 층).

## 2026-11-02~03 — 정리 · 성장 시뮬 실전화 · 그림 (Claude)
- 폐지: 심연 각인(atlas) · 균열 조각(shards) — 드랍 · 보상 · 상점 · 재화칸 제거, migrate 에서 `sv.atlas = nil; sv.shards = nil`.
- 전투력 기준 버그: Power 가 "끼고 있는 장비 평균 티어"로 적 기준을 잡아 좋은 장비를 끼면 전투력이 내려가던 것 → `Stats.refIlvl = min(6, 1 + rift.best/20)`.
- 장비 창 "+0 비교" 토글(강화 수치 빼고 비교). 튜토리얼 강조 장식(art/ui/tut_corner · tut_arrow).
- 그림: 아르카나 카드 원소별 색으로 재생성(빨강 일색 금지), 지역 몬스터 art/mobs/a<지역>_<역할>.png, 보스 art/bosses/boss<n>(_atk).png — 전투 화면 표시는 Studio 미확인.
- '마나 1당 체력'(manaToHp): 일반 옵션 가중치 0(새로 안 붙음) → 사탄 갑옷 효과 `a_mom`(마나 1당 체력 +4, 마나 재생 -30%). 전사의 강인함은 넣었다가 제거.
- **주의: `data/Items.lua` · `data/Satan.lua` · `data/Config.lua` 는 웹에서 자동 변환된 파일인데 직접 고쳤다.** 변환 스크립트를 다시 돌리면 위 수정(manaToHp w=0, a_mom, 강인함 키 제거 등)이 사라지니 다시 넣을 것.
- 성장 시뮬 봇(sim/progress.lua)은 실제 플레이처럼: 유효 옵션 기준 장착 · 재굴림 · 혼돈 구슬 · 강화 · 퀘스트/일일 · 원초의 돌 · 룬, 막히면 아래층 파밍(지면 드랍 0이라 3층씩 더 내려감).
