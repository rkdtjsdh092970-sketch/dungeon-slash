# 로블록스 베타 게시 체크리스트

## 게시 전 (Studio)
1. Game Settings → Security → **Enable Studio Access to API Services** 켜기 (DataStore 테스트용), **Allow HTTP Requests** 켜기 (HttpService 로 모듈을 가져오는 방식이면 필요. 최종 게시본은 Studio에 스크립트를 직접 넣은 상태로 올리는 것을 권장).
2. 이 저장소의 `roblox/game`, `roblox/data` 를 Studio 에 반영 (README/roblox-port.md 의 SHA 고정 방식) → ReplicatedStorage.Game, ServerScriptService.GameServer, StarterPlayerScripts.GameClient.
3. 게임 설정: Max Players 20~50, 기기 PC/모바일, 연령 설정(설문) 작성, 비공개(Private) 또는 "친구/링크" 접근으로 베타.
4. File → Publish to Roblox.

## 비공개 베타 접근 (초대 전용)
- 서버의 허용 명단이 기본으로 **닫힘(초대 전용)**. 명단에 없으면 "closed beta (invite only)" 안내와 함께 퇴장. 게임 주인과 Studio 테스트는 항상 입장.
- 게임 주인이 게임 안 채팅으로 관리 (다시 게시 불필요, DataStore `DungeonSlashBeta`):
  - `/beta add 닉네임` (또는 UserId) · `/beta remove 닉네임` · `/beta list`
  - `/beta open` = 누구나 입장 (정식 출시) · `/beta close` = 다시 초대 전용
- 체험 자체도 비공개(Private)로 두고 테스터에게 플레이 권한을 주면 이중으로 막힌다.
- Studio 에서 명령 동작(추가/목록/삭제)은 확인함. 명단 밖 계정이 실제로 막히는지는 게시 후 다른 계정으로 확인할 것.

## 베타 중 확인할 것
- 저장: 접속 → 진행 → 퇴장 → 재접속에서 유지되는지 (DataStore, 길드 DataStore 두 개).
- 길드: 두 계정으로 창설/가입/기부/목표/보스.
- 성능: 서버 CPU(전투 계산이 서버에서 돌아감). 동시 접속 20+ 에서 응답 지연 확인.
- 밸런스: 네이키드 봇은 균열 15층 근처에서 정체 — 실제 플레이어 곡선은 미검증.

## 알려진 한계 (베타 공지에 넣을 것)
- 그래픽 없음(텍스트 UI). 수익화 상품 ID 0 = 전부 비활성.
- 장비 프리셋, 심연 각인/균열 조각 사용처, 세공의 인장, 상위 보스관문 UI, 정예 퀘스트 없음.
- 오프라인 보상은 마지막 전투 기준 근사값.
- 세션 잠금 없음: 같은 계정이 서로 다른 서버에 동시에 있으면 마지막 저장이 덮어쓴다.
