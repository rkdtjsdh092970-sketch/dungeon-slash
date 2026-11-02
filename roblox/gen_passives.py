# 패시브 트리 생성 (roblox/PASSIVE_PLAN.md): 가운데 → 4갈래(물리 · 마법 · 재화 · 방어) × 50노드 = 200
# 갈래 = 줄기 10 → 두 분기 각 15 (끝에 핵심 노드) → 이웃 갈래로 가는 다리 8 (반은 이 갈래, 반은 이웃 갈래 몫)
# 노드 종류: small(1점) · notable(2점, 5칸마다, 이름 있는 묶음) · key(3점, 분기 끝, 큰 효과) · bridge(1점, 이웃 갈래와 섞인 효과)
# 실행: py roblox/gen_passives.py → data/Passives.lua (직접 고치지 말 것)
import math, os
HERE = os.path.dirname(os.path.abspath(__file__))
STEP = 220          # 노드 간격 (세계 좌표)
FORK = 22           # 분기 각도 (도)

# 효과 이름 (화면 글자)
LABEL = {
 'atkPct': ('공격력', '%'), 'physDmg': ('물리 피해', '%'), 'critChance': ('치명타 확률', '%'), 'critDmg': ('치명타 피해', '%'), 'ignoreDef': ('방어 무시', '%'),
 'shredDef': ('대상 방어력 감소', '%'), 'bleedChance': ('출혈 확률', '%'), 'dotDmg': ('지속 피해', '%'), 'boss': ('보스 추가 피해', '%'), 'elite': ('정예 추가 피해', '%'),
 'magPct': ('주문력', '%'), 'magDmg': ('마법 피해', '%'), 'elemDmg': ('원소 피해', '%'), 'penElem': ('원소 저항 관통', '%'), 'spellCrit': ('주문 치명타', '%'),
 'manaPct': ('최대 마나', '%'), 'manaRegen': ('마나 재생', '%'), 'cdr': ('쿨타임 감소', '%'), 'manaShield': ('마나 보호막', '%'), 'manaCostRed': ('마나 소모 감소', '%'),
 'goldFind': ('골드 획득', '%'), 'mf': ('아이템 발견', '%'), 'expFind': ('경험치', '%'), 'density': ('몬스터 밀도', ''), 'normal': ('일반 몹 추가 피해', '%'),
 'hpPct': ('체력', '%'), 'defPct': ('방어력', '%'), 'dmgTaken': ('받는 피해', '%'), 'dodge': ('회피', '%'), 'lifesteal': ('흡혈', '%'), 'regen': ('초당 체력 회복', '%'),
 'allDmg': ('주는 피해', '%'), 'aoeDmg': ('광역 피해', '%'), 'atkMore': ('공격력 (곱)', 'x'), 'magMore': ('주문력 (곱)', 'x'), 'hpMore': ('체력 (곱)', 'x'), 'revive': ('부활', ''),
}
LABEL_EN = {
 'atkPct': 'Attack', 'physDmg': 'Physical Damage', 'critChance': 'Crit Chance', 'critDmg': 'Crit Damage', 'ignoreDef': 'Ignore Defense', 'shredDef': 'Defense Shred',
 'bleedChance': 'Bleed Chance', 'dotDmg': 'Damage over Time', 'boss': 'Boss Damage', 'elite': 'Elite Damage', 'magPct': 'Spell Power', 'magDmg': 'Magic Damage',
 'elemDmg': 'Elemental Damage', 'penElem': 'Elemental Penetration', 'spellCrit': 'Spell Crit', 'manaPct': 'Max Mana', 'manaRegen': 'Mana Regen', 'cdr': 'Cooldown Reduction',
 'manaShield': 'Mana Shield', 'manaCostRed': 'Mana Cost Reduction', 'goldFind': 'Gold Find', 'mf': 'Magic Find', 'expFind': 'Experience', 'density': 'Monster Density',
 'normal': 'Damage vs Normal', 'hpPct': 'Life', 'defPct': 'Defense', 'dmgTaken': 'Damage Taken', 'dodge': 'Dodge', 'lifesteal': 'Lifesteal', 'regen': 'Life Regen / s',
 'allDmg': 'All Damage', 'aoeDmg': 'Area Damage', 'atkMore': 'Attack (more)', 'magMore': 'Spell Power (more)', 'hpMore': 'Life (more)', 'revive': 'Revive',
}
NAME_EN = {
 '물리의 길': 'Path of Might', '마법의 길': 'Path of Arcana', '재화의 길': 'Path of Fortune', '방어의 길': 'Path of the Bulwark',
 '물리의 곁가지': 'Might Offshoot', '마법의 곁가지': 'Arcana Offshoot', '재화의 곁가지': 'Fortune Offshoot', '방어의 곁가지': 'Bulwark Offshoot',
 '전사의 힘': "Warrior's Strength", '무기 숙련': 'Weapon Mastery', '치명': 'Critical', '급소 찌르기': 'Vital Strike', '피의 갈증': 'Bloodthirst', '필살': 'Deathblow', '학살자': 'Slaughterer',
 '관통 · 출혈': 'Pierce & Bleed', '갑옷 가르기': 'Armor Cleaver', '깊은 상처': 'Deep Wounds', '사냥꾼의 눈': "Hunter's Eye", '처형자': 'Executioner',
 '비전 집중': 'Arcane Focus', '주문 숙련': 'Spell Mastery', '원소': 'Elemental', '불꽃의 혀': 'Tongue of Flame', '얼음 심장': 'Frozen Heart', '폭풍 부름': 'Stormcaller', '원소 군주': 'Elemental Lord',
 '마나': 'Mana', '마나의 샘': 'Wellspring', '시간 왜곡': 'Time Warp', '비전 방벽': 'Arcane Barrier', '대마법사': 'Archmage',
 '행운의 손': 'Lucky Hand', '보물 감별사': 'Treasure Appraiser', '보물': 'Treasure', '황금 손길': 'Golden Touch', '귀한 것만': 'Only the Rare', '보물 사냥꾼': 'Treasure Hunter', '탐욕': 'Greed',
 '사냥': 'Hunt', '몰이꾼': 'Driver', '학살의 기술': 'Art of Carnage', '끝없는 사냥': 'Endless Hunt', '수집가': 'Collector',
 '강인함': 'Toughness', '단련된 몸': 'Tempered Body', '강철': 'Steel', '강철 피부': 'Steel Skin', '견고함': 'Sturdiness', '철벽': 'Iron Wall', '불굴': 'Unyielding',
 '생존': 'Survival', '그림자 걸음': 'Shadow Step', '피의 맛': 'Taste of Blood', '재생': 'Regeneration', '피의 계약': 'Blood Pact', '갈래 잇기': 'Crossroad',
}
def text_en(per):
    out = []
    for k, v in per.items():
        name, u = LABEL_EN.get(k, k), LABEL.get(k, (k, ''))[1]
        if u == '%': out.append(f'{name} {"+" if v >= 0 else ""}{v * 100:g}%')
        elif u == 'x': out.append(f'{name} +{(v - 1) * 100:g}%')
        else: out.append(f'{name} +{v:g}')
    return ' · '.join(out)
def text(per):
    out = []
    for k, v in per.items():
        name, u = LABEL.get(k, (k, ''))
        if u == '%': out.append(f'{name} {"+" if v >= 0 else ""}{v * 100:g}%')
        elif u == 'x': out.append(f'{name} +{(v - 1) * 100:g}%')
        else: out.append(f'{name} +{v:g}')
    return ' · '.join(out)

# 갈래 정의: 각도 · 줄기 효과 · 분기 A/B (이름, 작은 노드 효과, 주요 노드 이름들+효과, 핵심 노드)
ARMS = [
 dict(arm='phys', ang=-90, name='물리',
   trunk=[{'atkPct': 0.05}, {'physDmg': 0.06}], trunkN=[('전사의 힘', {'atkPct': 0.10, 'physDmg': 0.08}), ('무기 숙련', {'atkPct': 0.08, 'critChance': 0.02, 'physDmg': 0.08})],
   A=dict(name='치명', small=[{'critChance': 0.015}, {'critDmg': 0.10}], notes=[('급소 찌르기', {'critChance': 0.03, 'critDmg': 0.15}), ('피의 갈증', {'critDmg': 0.25, 'atkPct': 0.05}), ('필살', {'critChance': 0.04, 'critDmg': 0.20})],
          key=('학살자', {'critChance': 0.10, 'critDmg': 0.60, 'atkMore': 1.10}, 'k_slayer')),
   B=dict(name='관통 · 출혈', small=[{'ignoreDef': 0.03}, {'bleedChance': 0.04}, {'dotDmg': 0.06}], notes=[('갑옷 가르기', {'ignoreDef': 0.06, 'shredDef': 0.05}), ('깊은 상처', {'bleedChance': 0.08, 'dotDmg': 0.12}), ('사냥꾼의 눈', {'boss': 0.15, 'elite': 0.15})],
          key=('처형자', {'boss': 0.35, 'ignoreDef': 0.12, 'bleedChance': 0.15}, 'k_executioner'))),
 dict(arm='def', ang=0, name='방어',
   trunk=[{'hpPct': 0.05}, {'defPct': 0.06}], trunkN=[('강인함', {'hpPct': 0.10, 'defPct': 0.08}), ('단련된 몸', {'hpPct': 0.08, 'defPct': 0.10})],
   A=dict(name='강철', small=[{'defPct': 0.08}, {'dmgTaken': -0.015}], notes=[('강철 피부', {'defPct': 0.16}), ('견고함', {'dmgTaken': -0.04, 'defPct': 0.06}), ('철벽', {'defPct': 0.12, 'hpPct': 0.06})],
          key=('불굴', {'hpMore': 1.15, 'dmgTaken': -0.08, 'revive': 1}, 'k_unyielding')),
   B=dict(name='생존', small=[{'dodge': 0.012}, {'lifesteal': 0.004}, {'regen': 0.0015}], notes=[('그림자 걸음', {'dodge': 0.03}), ('피의 맛', {'lifesteal': 0.01, 'hpPct': 0.05}), ('재생', {'regen': 0.004, 'hpPct': 0.05})],
          key=('피의 계약', {'lifesteal': 0.03, 'hpPct': 0.20, 'regen': 0.006}, 'k_bloodpact'))),
 dict(arm='mag', ang=90, name='마법',
   trunk=[{'magPct': 0.05}, {'magDmg': 0.06}], trunkN=[('비전 집중', {'magPct': 0.10, 'magDmg': 0.08}), ('주문 숙련', {'magPct': 0.08, 'spellCrit': 0.02, 'magDmg': 0.08})],
   A=dict(name='원소', small=[{'elemDmg': 0.07}, {'penElem': 0.03}], notes=[('불꽃의 혀', {'elemDmg': 0.14}), ('얼음 심장', {'elemDmg': 0.10, 'penElem': 0.05}), ('폭풍 부름', {'elemDmg': 0.12, 'spellCrit': 0.03})],
          key=('원소 군주', {'elemDmg': 0.40, 'penElem': 0.15, 'magMore': 1.08}, 'k_elemlord')),
   B=dict(name='마나', small=[{'manaPct': 0.06}, {'cdr': 0.02}, {'manaRegen': 0.04}], notes=[('마나의 샘', {'manaPct': 0.12, 'manaRegen': 0.06}), ('시간 왜곡', {'cdr': 0.05, 'manaCostRed': 0.05}), ('비전 방벽', {'manaShield': 0.08, 'manaPct': 0.06})],
          key=('대마법사', {'magMore': 1.15, 'cdr': 0.06, 'manaShield': 0.15}, 'k_archmage'))),
 dict(arm='wealth', ang=180, name='재화',
   trunk=[{'goldFind': 0.06}, {'mf': 0.05}], trunkN=[('행운의 손', {'goldFind': 0.12, 'mf': 0.08}), ('보물 감별사', {'mf': 0.12, 'goldFind': 0.08})],
   A=dict(name='보물', small=[{'goldFind': 0.08}, {'mf': 0.06}], notes=[('황금 손길', {'goldFind': 0.18}), ('귀한 것만', {'mf': 0.15}), ('보물 사냥꾼', {'goldFind': 0.12, 'mf': 0.10})],
          key=('탐욕', {'goldFind': 0.60, 'mf': 0.30, 'allDmg': 0.05}, 'k_greed')),
   B=dict(name='사냥', small=[{'expFind': 0.05}, {'normal': 0.06}, {'aoeDmg': 0.05}], notes=[('몰이꾼', {'density': 1, 'normal': 0.08}), ('학살의 기술', {'aoeDmg': 0.10, 'normal': 0.08}), ('끝없는 사냥', {'expFind': 0.10, 'aoeDmg': 0.06})],
          key=('수집가', {'mf': 0.40, 'density': 2, 'aoeDmg': 0.10}, 'k_collector'))),
]
BRIDGE = {('phys', 'def'): {'atkPct': 0.03, 'defPct': 0.04}, ('def', 'mag'): {'hpPct': 0.04, 'manaPct': 0.04}, ('mag', 'wealth'): {'manaPct': 0.04, 'mf': 0.04}, ('wealth', 'phys'): {'goldFind': 0.04, 'atkPct': 0.03}}
ICON = {'phys': 'p_phys', 'mag': 'p_mag', 'wealth': 'p_wealth', 'def': 'p_def'}
SUBICON = {('phys', 'A'): 'p_crit', ('phys', 'B'): 'p_bleed', ('mag', 'A'): 'p_elem', ('mag', 'B'): 'p_mana', ('wealth', 'A'): 'p_treasure', ('wealth', 'B'): 'p_hunt', ('def', 'A'): 'p_steel', ('def', 'B'): 'p_survive'}

nodes = []
def add(id, name, per, kind, x, y, links, arm, icon=None, branch=None):
    cost = {'small': 1, 'bridge': 1, 'notable': 2, 'key': 3}[kind]
    nodes.append(dict(id=id, name=name, per=per, cost=cost, x=round(x), y=round(y), links=links, arm=arm, kind=kind, icon=icon, br=branch))
def pol(r, deg): a = math.radians(deg); return r * math.cos(a), r * math.sin(a)
branchNode = {}   # (arm, 'A'/'B', i) → id
for A in ARMS:
    arm, ang = A['arm'], A['ang']
    prev = 'C'
    for i in range(1, 11):   # 줄기
        x, y = pol(STEP * (i + 0.5), ang)
        nid = f'{arm}_t{i}'
        if i % 5 == 0: nm, per = A['trunkN'][i // 5 - 1]; add(nid, nm, per, 'notable', x, y, [prev], arm, ICON[arm], 'trunk')
        else: per = A['trunk'][(i - 1) % len(A['trunk'])]; add(nid, f'{A["name"]}의 길', per, 'small', x, y, [prev], arm, None, 'trunk')
        prev = nid
    trunkEnd = prev
    for j, ti in enumerate((3, 7)):   # 곁가지: 줄기 3 · 7번째에서 옆으로 한 칸 (갈래 기본 효과 두 가지를 함께)
        bx, by_ = pol(STEP * (ti + 0.5), ang); ox, oy = pol(STEP * 0.9, ang + (90 if j == 0 else -90))
        per = {}; [per.update(t) for t in A['trunk']]
        add(f'{arm}_s{j + 1}', f'{A["name"]}의 곁가지', per, 'small', bx + ox, by_ + oy, [f'{arm}_t{ti}'], arm, None, 'trunk')
    for side, sgn in (('A', -1), ('B', 1)):
        S = A[side]; p = trunkEnd
        for i in range(1, 16):
            r = STEP * (10.5 + i); x, y = pol(r, ang + sgn * FORK * min(1, i / 3))
            nid = f'{arm}_{side.lower()}{i}'
            if i == 15: nm, per, ic = S['key']; add(nid, nm, per, 'key', x, y, [p], arm, 'p_' + ic[2:] if False else ic.replace('k_', 'p_k_'), side)
            elif i % 5 == 0: nm, per = S['notes'][i // 5 - 1]; add(nid, nm, per, 'notable', x, y, [p], arm, SUBICON[(arm, side)], side)
            else: per = S['small'][(i - 1) % len(S['small'])]; add(nid, S['name'], per, 'small', x, y, [p], arm, None, side)
            branchNode[(arm, side, i)] = nid; p = nid
# 다리: 갈래 i 의 B 분기 9번째 ↔ 다음 갈래의 A 분기 9번째, 둥근 호 위 8칸 (앞 4칸은 이 갈래, 뒤 4칸은 다음 갈래)
for k, A in enumerate(ARMS):
    Bn = ARMS[(k + 1) % 4]
    a0 = A['ang'] + FORK; a1 = A['ang'] + 90 - FORK
    r = STEP * (10.5 + 9)
    per = BRIDGE[(A['arm'], Bn['arm'])]
    prev = branchNode[(A['arm'], 'B', 9)]
    for j in range(1, 9):
        x, y = pol(r, a0 + (a1 - a0) * j / 9)
        owner = A['arm'] if j <= 4 else Bn['arm']
        nid = f'br_{A["arm"]}_{Bn["arm"]}{j}'
        add(nid, '갈래 잇기', per, 'bridge', x, y, [prev], owner, None, 'bridge')
        prev = nid
    last = branchNode[(Bn['arm'], 'A', 9)]
    for n in nodes:
        if n['id'] == last: n['links'].append(prev)
# 양방향 연결
by = {n['id']: n for n in nodes}
for n in nodes:
    for l in list(n['links']):
        if l != 'C' and n['id'] not in by[l]['links']: by[l]['links'].append(n['id'])

def lua(v):
    if isinstance(v, dict): return '{' + ','.join(f'{k}={lua(x)}' for k, x in v.items()) + '}'
    if isinstance(v, list): return '{' + ','.join(lua(x) for x in v) + '}'
    if isinstance(v, str): return '"' + v + '"'
    if v is None: return 'nil'
    return f'{v:g}' if isinstance(v, float) else str(v)
out = []
for n in nodes:
    d = dict(id=n['id'], name=n['name'], name_en=NAME_EN.get(n['name'], n['name']), per=n['per'], cost=n['cost'], x=n['x'], y=n['y'], links=n['links'], arm=n['arm'], kind=n['kind'], text=text(n['per']), text_en=text_en(n['per']), br=n['br'])
    if n['icon']: d['icon'] = n['icon']
    out.append(lua(d))
src = ('-- 자동 생성 (roblox/gen_passives.py). 직접 고치지 말고 생성 스크립트를 고친 뒤 다시 돌리세요.\n'
       '-- 패시브 v2: 가운데 → 물리 · 마법 · 재화 · 방어 4갈래 × 50노드 (줄기 10 · 분기 15+15 · 다리)\n'
       'local M = {}\nM.VERSION = 2\nM.LABEL = ' + lua({k: v[0] for k, v in LABEL.items()}) + '\nM.LABEL_EN = ' + lua(LABEL_EN) + '\nM.PASSIVES = {' + ',\n'.join(out) + '}\nreturn M\n')
open(os.path.join(HERE, 'data', 'Passives.lua'), 'w', encoding='utf-8', newline='\n').write(src)
from collections import Counter
print(len(nodes), Counter(n['arm'] for n in nodes), Counter(n['kind'] for n in nodes), 'total cost', sum(n['cost'] for n in nodes))
