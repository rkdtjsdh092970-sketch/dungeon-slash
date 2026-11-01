# 메뉴 UI 개편 계획 (2026-11-02 작성, 11시 이후 진행)

## 문제 (사용자 피드백)
Studio 플레이 기준: 바깥 틀(로딩·마을·지도·전투·결과·설정)은 있으나 **메뉴 안쪽 화면이 웹 버전처럼 구현돼 있지 않다** (장비·스킬·패시브 등이 글자 카드 목록뿐) → 사실상 플레이 불가.
전투 중 직접 조작(스킬 수동 사용 등)은 **당분간 하지 않는다** (서버 계산 → 재생 구조 유지).

## 우선순위 (웹 `source/src/ui*.js` 의 화면을 옮긴다)
1. 전투 HUD (`battleHudBuild`) — **사용자: "전투 UI 가 너무 구리다" → 전면 재디자인**: 초상화 + HP/MP 숫자, 웨이브 바, 보스 바, 스킬바(쿨타임 표시, 재생 데이터 기준), 건너뛰기, 결과 연출(`resultHtml`/`animateResult`)
   - **배속 버튼**: 현재 배속("x1")을 보여주는 버튼 하나 → 누르면 아래로 x1 · x2 · x3 · x4 목록이 스르륵 펼쳐짐. **x1~x3 무료, x4 유료**(게임패스 — 미보유 시 구매 창 `MarketplaceService:PromptGamePassPurchase`, 보유 확인 `UserOwnsGamePassAsync` 는 서버에서). 상품 ID 는 `MONETIZATION.md` 에 추가, ID 0 이면 x4 잠금 표시. 고른 배속은 설정으로 저장.
1. 장비 (`openItems`/`renderItems`/`itemDetail`/`socketBlock`/`multiPanel`/`openBulk`/프리셋): 아이템 아이콘 격자, 착용 슬롯, 툴팁(옵션 범위·비교), 다중 선택 판매/분해
1. 스킬 (`openSkills`/`skillCells`/`skillAreaHtml`/`openRunePicker`/`openAutoSkill`): 스킬 칸, 툴팁·범위 그림, 룬
1. 패시브 트리 (`openPassives`/`ptDraw`/`ptPreview`/`ptAllocate`/프리셋): 노드 그래프 직접 찍기
2. 대장간·돌·소켓·보관함 (`openStones`/`openSockRoll`/`openSockDel`/`openSockPick`/`openStash`), 스탯(`openStats`), 도감(`openCodex`), 스킬 상점(`openSkillShop`), 퀘스트(`openBoard`/`openQuests`), 일일(`openDaily`)
3. 길드(`openGuild`), 랭킹(`openRanking`), 우편(`openMail`), 허수아비(`openDummy`), 콘텐츠(`openBossHub`/`openTemple`/`openSpire`/`openClass`/`openCRaid`/`openCharms`)
3. 공통: 마우스 올리면 뜨는 툴팁(`tipInit`), 확인창(`askConfirm`), 튜토리얼 안내(`setGuide`)

진행 방식: 웹 게임을 로컬 브라우저로 띄워 화면별 캡처(운영 서버는 건드리지 않음) → 같은 구성으로 Roblox 에 구현 → Studio 캡처로 확인.

## 참고 자료 (`art/sample/1~4.png`, 다른 로블록스 게임 화면)
- 파일은 확장자만 .png 인 HEIF(무압축 unci, BGRA). 일반 도구로 안 열림 — 변환은 PIL 로 deflate 해제 후 BGRA 로 읽으면 됨.
- 저작물 화면이므로 저장소에 커밋하지 않는다(참고용).
- 관찰한 패턴:
  - 왼쪽 위 로블록스 버튼 줄이 화면 폭 ~20% 까지 차지 → 게임 UI 는 그 아래/오른쪽.
  - 오른쪽 세로 아이콘 메뉴(원형 아이콘 + 이름, 2열 격자, 잠긴 메뉴는 자물쇠).
  - 왼쪽 위 프로필(초상화 원 + 레벨 + 경험치).
  - 창: 가운데 큰 패널, 굵은 제목 띠, 오른쪽 위 X, 장식 테두리. 내용은 **아이콘 타일(테두리 + 수량)** 줄, 큰 색 버튼(초록=받기, 금=시작, 파랑=구매).
  - 굵은 대문자 게임 글꼴, 등급별 색.
  - 튜토리얼: 왼쪽 NPC 초상화 + "STEP 2/10".
  - 아래 핫바(장비 슬롯 아이콘 + 위력 수치), 그 위 체력 바.
- 알려진 문제: 로블록스 채팅창이 열려 있으면 왼쪽 위 클릭을 가로챈다 → 창 배치 시 고려.

## 필요한 그림 (Codex)
아이템 슬롯 아이콘(무기·투구·갑옷·장갑·신발·반지·목걸이), 재화 아이콘(골드·강화석·연마석·혼돈/신성 구슬·돌), 스킬 아이콘(`data/Skills.lua`), 메뉴 아이콘(오른쪽 메뉴용), 창 테두리/제목 띠 장식.
