# Dungeon Slash

2D 자동 전투 핵 앤 슬래시 (단일 HTML 빌드). 루트의 `index.html`이 서버(Cloudflare Worker)가 서비스하는 게임 본체이고 `ver.txt`는 업데이트 알림용 빌드 번호입니다.

- `source/` : 소스 (`python3 build.py` → `source/dist/game.html`, `dist/ver.txt`)
  - `src/` 게임 코드, `template.html` 화면/스타일, `art/` 스프라이트 시트와 생성 스크립트(`boss3.py`가 보스 도트), `server/worker.js` Cloudflare Worker(D1) 서버, `test/` 시뮬레이션·Playwright 테스트
- 배포: 빌드 결과를 루트의 `index.html`, `ver.txt`로 복사해 push
