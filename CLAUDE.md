# Dungeon Slash — 작업 안내 (Claude Code 용)

처음 읽는 세션이면 `roblox/HANDOFF.md` 를 먼저 읽는다. 사용자에게는 **한국어로, 간결하게** 답한다.

## 저장소 구조
- `index.html`, `ver.txt`, `source/` : 웹 게임 (운영 중). **웹 서버/게임은 사용자가 따로 말하기 전에는 건드리지 않는다.**
- `roblox/` : 로블록스 이식(Luau). 자세한 현황은 `roblox/HANDOFF.md`.

## 규칙
- 라이브 서버/게임 동작은 직접 확인하지 못한 것을 확인했다고 말하지 않는다 (로컬 시뮬레이션·Studio 테스트만 한 것은 그렇게 밝힌다).
- 사용자가 요청하지 않은 밸런스 너프는 하지 않는다.
- 커밋 메시지는 한국어, 끝에 아래 두 줄을 붙인다:
  `Co-Authored-By: Claude <noreply@anthropic.com>`
- 이미지·에셋은 `roblox/art/` 에 넣고 커밋한다 (스펙은 `roblox/ART_SPEC.md`, 있다면).
