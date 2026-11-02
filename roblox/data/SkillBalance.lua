-- 스킬 역할별 기준선 보정 배율 (Battle.skillOf 에서 mult 에 곱함). 2026-11-02, 사용자 승인: 너프 없이 약한 스킬만 올림.
-- 계산: roblox/sim/skill_balance.lua — 값 = 실측 1회 배율(SkillTM) ÷ 쿨타임, 묶음 = 역할(기본·단일·관통/연쇄·범위·화면·장판·보스) × 해금 시기,
-- 묶음에서 가장 센 스킬의 85% 미만이면 그 선까지 (최대 x2.5, 지속형은 제곱근). 출혈·중독·점화가 기본으로 붙는 스킬은 측정에서 상태이상이 빠져 제외.
return { bigshuriken = 2.500, boomer = 1.018, chain = 1.389, crush = 1.265, ember = 2.500, execute = 2.219, firemark = 2.494, firewall = 1.641, judgment = 2.500, meteor = 1.450, orbs = 1.217, rapid = 2.032, reaper = 1.006, rip = 1.949, shuriken = 1.965, smite = 1.793, snipe = 1.152, spirit = 2.500, stormmark = 1.986, strike = 1.763, thunder = 1.175, volley = 1.754 }
