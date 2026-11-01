# 스프라이트 교체 방법

- 시트 표: `roblox/data/SpriteMap.lua` (`python3 roblox/gen_sprites.py` 로 다시 생성). 각 시트는 `SHEETS[키] = { w, h, cell, file, id }`.
- 지금(개발용): `id = nil` 이면 서버가 `BASE`(GitHub raw)에서 `roblox/sprites/<키>.rgba` 를 받아 클라이언트에 보내고, `Sprites.lua` 가 EditableImage 로 그린다. (Studio 에서는 HttpService 허용 필요)
- 교체: 새 PNG 를 Roblox 에 업로드해 얻은 ID 를 `id = "rbxassetid://123..."` 로 적으면 그 이미지가 우선 쓰인다. 같은 칸 크기(48 / 96 보스 / 32 구형)와 행 배치(`SpriteMap.ROWS`)를 유지하면 코드 수정이 필요 없다. 색조(hue)·좌우 반전 변형은 업로드 이미지에선 아직 적용되지 않는다(원본만) — 필요하면 변형을 미리 만들어 별도 시트 키로 추가.
- 몬스터 ↔ 시트 매핑은 웹과 같은 `ROSTER`(지역 × 역할) 표를 쓴다. 보스는 `bosses` 시트(96칸, 5열)의 인덱스.
- 배경: `Stage.lua` 의 `M.PAL` 지역 팔레트 + 코드로 그린 실루엣. 이미지로 바꾸려면 `buildBg` 안에서 ImageLabel 로 대체.
