# 웹 게임 도트 스프라이트 → Roblox 용 raw RGBA + 데이터 표(Lua) 생성
# 나중에 업로드한 이미지로 교체하려면 data/SpriteMap.lua 의 SHEETS 항목에 id="rbxassetid://..." 만 넣으면 된다 (Sprites.lua 가 id 를 우선 사용).
import json, os, re, subprocess
from PIL import Image
ART='/home/claude/rkdtjsdh092970-sketch/dungeon-slash/source/art'
SRC='/home/claude/rkdtjsdh092970-sketch/dungeon-slash/source/src'
OUT='/home/claude/rkdtjsdh092970-sketch/dungeon-slash/roblox'
sheets={'warrior':'warrior_sheet.png','c_goblin':'goblin_sheet.png','c_archer':'archer_sheet.png','c_shaman':'shaman_sheet.png','c_brute':'brute_sheet.png','c_imp':'imp_sheet.png','bosses':'bosses_sheet96.png',
 'ghoul':'goblin_sheet48.png','skel':'archer_sheet48.png','necro':'shaman_sheet48.png','brute':'brute_sheet48.png','fiend':'imp_sheet48.png','pri_imp':'pri_imp_sheet48.png','pri_ghoul':'pri_ghoul_sheet48.png','pri_skel':'pri_skel_sheet48.png','pri_necro':'pri_necro_sheet48.png','pri_brute':'pri_brute_sheet48.png','tw_imp':'tw_imp_sheet48.png','tw_ghoul':'tw_ghoul_sheet48.png','tw_skel':'tw_skel_sheet48.png','tw_necro':'tw_necro_sheet48.png','tw_brute':'tw_brute_sheet48.png'}
for n in ['slime','slimeT','slimeL','mush','mushT','bat','batC','scorp','wolf','wolfH','eye','golem','golemI','golemM','frog']: sheets[n]=n+'_sheet48.png'
lines=['-- 자동 생성 (roblox/gen_sprites.py). 시트 파일은 roblox/sprites/<키>.rgba (RGBA 8bit, 가로 w × 세로 h).','-- id 를 채우면 그 이미지를 우선 사용한다 → 업로드한 에셋으로 즉시 교체.','local M = {}','M.SHEETS = {']
for k,f in sheets.items():
    im=Image.open(f'{ART}/{f}').convert('RGBA'); w,h=im.size
    open(f'{OUT}/sprites/{k}.rgba','wb').write(im.tobytes())
    cell = 96 if k=='bosses' else (w//5)
    lines.append(f'  {k} = {{ w = {w}, h = {h}, cell = {cell}, file = "{k}.rgba", id = nil }},')
lines.append('}')
# ROSTER / SPR_META 등은 JS 소스에서 추출
js=open(f'{SRC}/data2.js').read()+'\n'+open(f'{SRC}/render.js').read()
def grab(name):
    m=re.search(r'const '+name+r' = ',js); i=m.end(); depth=0; j=i
    while True:
        c=js[j]
        if c in '[{': depth+=1
        elif c in ']}':
            depth-=1
            if depth==0: break
        j+=1
    return js[i:j+1]
node="const R=%s;const M=%s;const I=%s;console.log(JSON.stringify({R,M,I}))"%(grab('ROSTER'),grab('SPR_META'),grab('ROLE_IDX'))
o=json.loads(subprocess.check_output(['node','-e',node]))
def lua(v):
    if isinstance(v,list): return '{'+','.join(lua(x) for x in v)+'}'
    if isinstance(v,dict): return '{'+','.join(f'{k}={lua(x)}' for k,x in v.items())+'}'
    if isinstance(v,str): return json.dumps(v)
    return str(v)
lines.append('M.BASE = "https://raw.githubusercontent.com/rkdtjsdh092970-sketch/dungeon-slash/main/roblox/sprites/"   -- 개발용: 서버가 이 주소에서 시트를 받아 클라이언트에 전달. 출시 땐 SHEETS[..].id 로 대체')
lines.append('M.ROSTER = '+lua(o['R']))
lines.append('M.META = '+lua(o['M']))
lines.append('M.ROLE_IDX = '+lua(o['I']))
lines.append('-- 애니메이션 행: {행, 프레임 수, fps, 반복}')
lines.append('M.ROWS = { warrior = { idle = {0,4,4,true}, attack = {1,5,12,false}, hurt = {2,1,6,false}, death = {3,3,6,false} }, std = { idle = {0,4,4,true}, walk = {1,4,8,true}, attack = {2,5,10,false}, hurt = {3,1,6,false}, death = {4,3,6,false} } }')
lines.append('return M')
open(f'{OUT}/data/SpriteMap.lua','w').write('\n'.join(lines)+'\n')
print(len(sheets),'sheets')
