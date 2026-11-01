# 일러스트 제작 스펙 (Codex 이미지 생성용)

목표: 로블록스 2D 전투 화면을 상용 모바일 RPG 같은 밝은 카툰 일러스트로 교체한다. 현재는 웹 게임의 도트 스프라이트(`sprites/`)를 쓰고 있고, 이 문서대로 만든 PNG가 올라오면 `SpriteMap`/`Stage.lua` 에 연결해 교체한다 (`SPRITES.md` 참고).

## 작업 순서
1. **1차 시험**: 아래 "1차 목록" 8장만 만든다 → 화풍이 맞는지 확인.
2. 화풍이 맞으면 "2차 목록"으로 확장 (지역별 몬스터 · 보스 · 배경).
3. 만든 PNG 를 이 저장소의 `roblox/art/<폴더>/<파일이름>.png` 에 그대로 넣고 커밋/푸시한다 (아래 "올리는 방법").

## 공통 규칙
- 형식: **PNG, 투명 배경** (캐릭터·몬스터·보스·아이콘). 배경 이미지만 불투명.
- 시점: 옆면(측면). 영웅은 **오른쪽**을 본다. 몬스터·보스는 **왼쪽**을 본다 (영웅을 향해 다가오므로).
- 한 장에 캐릭터 한 명, 정중앙, 발바닥이 이미지 아래쪽 8% 근처, 잘리지 않게 여백 10%.
- 그림자·바닥·글자·워터마크·테두리 프레임 넣지 않는다.
- 파일 이름은 소문자 영문, 아래 표의 이름 그대로. 크기가 달라도 되지만 정사각형을 유지한다.

## 화풍 고정 문구 (모든 프롬프트 맨 앞에 붙인다)
```
Bright cheerful cartoon fantasy RPG game art, hand-painted look, thick dark purple outline, soft cel shading, vivid saturated colors, side view, full body, single character centered, transparent background, no shadow, no text, no watermark, game asset sprite
```
- **같은 화풍 유지 요령**: 첫 번째로 마음에 든 이미지(전사)를 대화에 계속 두고, 이후 요청에 "same art style as the previous images"를 덧붙인다. 화풍이 흔들리면 새 대화를 열지 말고 같은 대화에서 "redo in the same style as the warrior"로 다시 요청한다.
- 투명 배경이 안 나오면: "pure flat white background"로 뽑은 뒤 배경 제거(remove.bg 등)를 한다. (Codex/ChatGPT 에서 투명 PNG 옵션이 있으면 그걸 사용)

## 1차 목록 (시험용 8장)

| 파일 | 크기 | 방향 | 프롬프트 (고정 문구 뒤에 붙임) |
|---|---|---|---|
| `art/hero/warrior.png` | 1024 | → | young knight hero in silver armor with a red plume helmet, holding a glowing blue sword, facing right, dynamic ready stance |
| `art/mobs/imp.png` | 512 | ← | small mischievous red imp with bat wings and a pointed tail, big yellow eyes, facing left |
| `art/mobs/goblin.png` | 512 | ← | green goblin warrior with big pointy ears, wooden club, ragged brown clothes, facing left |
| `art/mobs/archer.png` | 512 | ← | goblin archer holding a short bow, leather hood, quiver on back, facing left |
| `art/mobs/shaman.png` | 512 | ← | goblin shaman with a bone staff glowing purple orb, feather headdress, facing left |
| `art/mobs/brute.png` | 768 | ← | huge muscular orc brute elite, iron shoulder plates, big spiked club, angry face, facing left |
| `art/bosses/groom.png` | 1024 | ← | giant meadow lord boss "Groom", huge horned ogre king in leaf armor and a crown of thorns, giant wooden hammer, facing left |
| `art/bg/act1.jpg` | 1536x640 | - | wide side-scrolling game background, sunny green meadow with rolling hills, distant castle, blue sky with clouds, empty flat ground strip in the lower third, no characters, (이 항목만 "transparent background" 문구 제외) |

## 2차 목록 (1차 통과 후)
지역(액트) 10곳: 초원 · 숲 · 폐광 · 사막 · 늪지 · 설원 · 화산 · 심연 · 천공성 · 마계. 각 지역마다 **배경 1장 + 무리(imp) / 근접(grunt) / 궁수 / 주술사 / 정예 / 특수 몬스터 6종**.
- 이름 규칙: `art/bg/act<번호>.jpg`, `art/mobs/a<번호>_<역할>.png` (역할 = imp, grunt, archer, mage, brute, spec). 예: `a3_archer.png`.
- 지역 특수 몬스터: 분열 슬라임(1) · 독버섯(2) · 폭탄 구울(3) · 모래 전갈(4) · 늪 두꺼비(5) · 서리 늑대(6) · 용암 슬라임(7) · 심연의 눈(8) · 석상 수호자(9) · 지옥견(10).
- 보스 18종 (`art/bosses/<번호>_<영문이름>.png`, 번호는 게임 내 보스 순서 0~17): 0 들판의 군주 그룸 · 1 고목 수호자 · 2 광산 감독관 볼트 · 3 모래폭풍의 술탄 · 4 독안개 마녀 히드라 · 5 서리 거인 요툰 · 6 용암 군주 이그니스 · 7 심연의 눈 아가론 · 8 폐허의 대천사 · 9 마왕 바알제뷔트 · 10 공허의 군주 모르가스 · 11 화염 정령왕 아스카 · 12 철갑의 투사 그라크 · 13 뇌제 라이곤 · 14 서리 여왕 글라시아 · 15 독니의 군주 베노크 · 16 심연의 문지기 모르가스 · 17 거대 보물상자.
- 아이콘(256, 투명): 골드, 강화석, 연마석, 혼돈 구슬, 신성한 구슬, 스킬 아이콘(스킬 이름은 `data/Skills.lua`).
- 배경 구분 팔레트는 `game/Stage.lua` 의 `M.PAL` 참고 (지역별 색감).

## 올리는 방법 (사용자, PowerShell)
저장소 폴더에서:
```
git pull
(이미지 파일을 roblox\art\... 폴더에 복사)
git add roblox/art
git commit -m "art: 1차 일러스트"
git push
```
git 로그인 창이 뜨면 GitHub 계정으로 로그인한다. 올라오면 웹 세션(Claude)이 받아서 Studio 화면에 연결한다.

## 연결 쪽 작업 (Claude 가 할 일 — 이미지가 올라온 뒤)
- 정적 이미지 모드: `Stage.lua` 에 PNG 한 장을 그리는 유닛 추가. 애니메이션은 코드로 (둥실거림, 공격 시 돌진, 피격 번쩍임, 사망 시 쓰러짐/페이드).
- 개발용 전달: PNG → RGBA 변환(`gen_sprites.py` 확장) → 서버가 HttpService 로 전달 → EditableImage. 출시용: 사용자가 Roblox 에 업로드해 얻은 ID 를 `SpriteMap` 에 기록.
- 이미지가 없는 몬스터는 기존 도트로 대체 표시 (섞여도 동작해야 함).
