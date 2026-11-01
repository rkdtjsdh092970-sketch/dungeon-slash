-- 자동 생성 (roblox/gen_sprites.py). 시트 파일은 roblox/sprites/<키>.rgba (RGBA 8bit, 가로 w × 세로 h).
-- id 를 채우면 그 이미지를 우선 사용한다 → 업로드한 에셋으로 즉시 교체.
local M = {}
M.SHEETS = {
  warrior = { w = 160, h = 128, cell = 32, file = "warrior.rgba", id = nil },
  c_goblin = { w = 160, h = 160, cell = 32, file = "c_goblin.rgba", id = nil },
  c_archer = { w = 160, h = 160, cell = 32, file = "c_archer.rgba", id = nil },
  c_shaman = { w = 160, h = 160, cell = 32, file = "c_shaman.rgba", id = nil },
  c_brute = { w = 160, h = 160, cell = 32, file = "c_brute.rgba", id = nil },
  c_imp = { w = 160, h = 160, cell = 32, file = "c_imp.rgba", id = nil },
  bosses = { w = 480, h = 384, cell = 96, file = "bosses.rgba", id = nil },
  ghoul = { w = 240, h = 240, cell = 48, file = "ghoul.rgba", id = nil },
  skel = { w = 240, h = 240, cell = 48, file = "skel.rgba", id = nil },
  necro = { w = 240, h = 240, cell = 48, file = "necro.rgba", id = nil },
  brute = { w = 240, h = 240, cell = 48, file = "brute.rgba", id = nil },
  fiend = { w = 240, h = 240, cell = 48, file = "fiend.rgba", id = nil },
  pri_imp = { w = 240, h = 240, cell = 48, file = "pri_imp.rgba", id = nil },
  pri_ghoul = { w = 240, h = 240, cell = 48, file = "pri_ghoul.rgba", id = nil },
  pri_skel = { w = 240, h = 240, cell = 48, file = "pri_skel.rgba", id = nil },
  pri_necro = { w = 240, h = 240, cell = 48, file = "pri_necro.rgba", id = nil },
  pri_brute = { w = 240, h = 240, cell = 48, file = "pri_brute.rgba", id = nil },
  tw_imp = { w = 240, h = 240, cell = 48, file = "tw_imp.rgba", id = nil },
  tw_ghoul = { w = 240, h = 240, cell = 48, file = "tw_ghoul.rgba", id = nil },
  tw_skel = { w = 240, h = 240, cell = 48, file = "tw_skel.rgba", id = nil },
  tw_necro = { w = 240, h = 240, cell = 48, file = "tw_necro.rgba", id = nil },
  tw_brute = { w = 240, h = 240, cell = 48, file = "tw_brute.rgba", id = nil },
  slime = { w = 240, h = 240, cell = 48, file = "slime.rgba", id = nil },
  slimeT = { w = 240, h = 240, cell = 48, file = "slimeT.rgba", id = nil },
  slimeL = { w = 240, h = 240, cell = 48, file = "slimeL.rgba", id = nil },
  mush = { w = 240, h = 240, cell = 48, file = "mush.rgba", id = nil },
  mushT = { w = 240, h = 240, cell = 48, file = "mushT.rgba", id = nil },
  bat = { w = 240, h = 240, cell = 48, file = "bat.rgba", id = nil },
  batC = { w = 240, h = 240, cell = 48, file = "batC.rgba", id = nil },
  scorp = { w = 240, h = 240, cell = 48, file = "scorp.rgba", id = nil },
  wolf = { w = 240, h = 240, cell = 48, file = "wolf.rgba", id = nil },
  wolfH = { w = 240, h = 240, cell = 48, file = "wolfH.rgba", id = nil },
  eye = { w = 240, h = 240, cell = 48, file = "eye.rgba", id = nil },
  golem = { w = 240, h = 240, cell = 48, file = "golem.rgba", id = nil },
  golemI = { w = 240, h = 240, cell = 48, file = "golemI.rgba", id = nil },
  golemM = { w = 240, h = 240, cell = 48, file = "golemM.rgba", id = nil },
  frog = { w = 240, h = 240, cell = 48, file = "frog.rgba", id = nil },
}
M.BASE = "https://raw.githubusercontent.com/rkdtjsdh092970-sketch/dungeon-slash/main/roblox/sprites/"   -- 개발용: 서버가 이 주소에서 시트를 받아 클라이언트에 전달. 출시 땐 SHEETS[..].id 로 대체
M.ROSTER = {{{"c_imp"},{"c_goblin"},{"c_archer"},{"c_shaman"},{"c_brute"},{"slime"}},{{"batC"},{"c_goblin",45},{"c_archer",45},{"c_shaman",20},{"c_brute",40},{"mush"}},{{"bat"},{"ghoul"},{"skel"},{"necro"},{"golem"},{"ghoul",20}},{{"bat",40},{"ghoul",55},{"skel",30},{"necro",40},{"brute",20},{"scorp"}},{{"slimeT"},{"ghoul",85},{"skel",100},{"necro",100},{"brute",100},{"frog"}},{{"bat",170},{"ghoul",150},{"skel",160},{"necro",160},{"golemI"},{"wolf"}},{{"fiend"},{"ghoul",-35},{"skel",-30},{"necro",-70},{"golemM"},{"slimeL"}},{{"bat",-80},{"ghoul",250},{"skel",270},{"necro",280},{"brute",-90},{"eye"}},{{"batC",55},{"ghoul",50},{"skel",55},{"necro",55},{"brute",55},{"golem"}},{{"fiend"},{"ghoul",-60},{"skel",-20},{"necro",-30},{"brute",-20},{"wolfH"}},{{"pri_imp"},{"pri_ghoul"},{"pri_skel"},{"pri_necro"},{"pri_brute"},{"pri_imp"}},{{"tw_imp"},{"tw_ghoul"},{"tw_skel"},{"tw_necro"},{"tw_brute"},{"tw_imp"}}}
M.META = {c_imp={cell=32,h=26},c_goblin={cell=32,h=28},c_archer={cell=32,h=28},c_shaman={cell=32,h=30},c_brute={cell=32,h=28},pri_imp={cell=48,h=40},pri_ghoul={cell=48,h=40},pri_skel={cell=48,h=42},pri_necro={cell=48,h=44},pri_brute={cell=48,h=42},tw_imp={cell=48,h=40},tw_ghoul={cell=48,h=40},tw_skel={cell=48,h=42},tw_necro={cell=48,h=44},tw_brute={cell=48,h=42},ghoul={cell=48,h=40},skel={cell=48,h=42},necro={cell=48,h=44},brute={cell=48,h=42},fiend={cell=48,h=40},slime={cell=48,h=24},slimeT={cell=48,h=24},slimeL={cell=48,h=24},mush={cell=48,h=40},mushT={cell=48,h=40},bat={cell=48,h=36},batC={cell=48,h=36},scorp={cell=48,h=34},wolf={cell=48,h=36},wolfH={cell=48,h=36},eye={cell=48,h=40},golem={cell=48,h=42},golemI={cell=48,h=42},golemM={cell=48,h=42},frog={cell=48,h=32}}
M.ROLE_IDX = {imp=0,grunt=1,archer=2,mage=3,brute=4,spec=5}
-- 애니메이션 행: {행, 프레임 수, fps, 반복}
M.ROWS = { warrior = { idle = {0,4,4,true}, attack = {1,5,12,false}, hurt = {2,1,6,false}, death = {3,3,6,false} }, std = { idle = {0,4,4,true}, walk = {1,4,8,true}, attack = {2,5,10,false}, hurt = {3,1,6,false}, death = {4,3,6,false} } }
return M
