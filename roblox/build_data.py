# 사용법: node emit_data.js (→ /tmp/rbx/data.json) 후 python3 build_data.py (→ roblox/data/*.lua)
import json,os
d=json.load(open('/tmp/rbx/data.json',encoding='utf-8'))
groups={'Config':['CFG','GUILD_PASSIVES','GUILD_BOUNTIES'],'Skills':['SKILLS','SKILL_RARITY','RUNES','SINGLE_HITS','SINGLE_HIT_BONUS'],'Items':['AFFIXES','AT','TIER_SCALE','WTYPES','ITEM_RARITY','STONE_POOL','SLOTS','EQ_SLOTS','SLOT_BASE','SLOT_NAME','ELEMS','ELEM_NAME'],'Monsters':['ENEMIES','BOSSES','EB','ACT_SPECIAL','WARPS','ACT_ELEM','ENEMY_DEF','TRAIT_DEF'],'Satan':['SAT_DEFS'],'Class':['C_TREES','CHARMS','CHARM_BASIC'],'Passives':['PASSIVES']}
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'data'); os.makedirs(R,exist_ok=True)
for g,ks in groups.items():
    body='-- 자동 생성 (JS 원본에서 변환). 직접 고치지 말고 변환 스크립트를 다시 돌리세요.\nlocal M = {}\n'+''.join(f'M.{k} = {d[k]}\n' for k in ks if k in d)+'return M\n'
    open(f'{R}/{g}.lua','w',encoding='utf-8').write(body); print(g,len(body))
