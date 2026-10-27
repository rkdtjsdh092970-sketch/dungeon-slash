const fs = require('fs');
const src = ['util', 'data', 'data2', 'data3', 'data4', 'data5', 'data6', 'state', 'battle', 'battle2'].map(f => fs.readFileSync(`/home/claude/game/src/${f}.js`, 'utf8')).join('\n');
const api = new Function(src + `
return { baseCastOf, playerPowerOld, powerDetail, CFG, ACTS, BOSSES, SKILLS, SETS, ENEMIES, MAP, newSave, computeStats, playerPower, enemyIndex, recPower, createBattle, stepBattle, finishBattle, botEquip, genItem, genSkill, skillOf, nodeUnlocked, questEvent, availableQuests, acceptQuest, claimQuest, maxActUnlocked, expNeed, TUTORIAL, setCounts, rollDrops, SLOTS, itemValue, QDEFS, ROSTER, UNIQUES, PASSIVES, rollDrops, dropBonus, genUnique, recommendEquip, addPassive, passivePoints, passiveSpent, endlessInfo, VOID_BOSS, enhCost, enhance, ENH_RATE, dismantleItem, itemValue, RIFT_MODS, planFor, PASSIVES, PASSIVE_BY_ID, canAddPassive, U_TIERS, mfEff, towerMf, rollUnique, genUnique, AFFIXES, ENEMY_DEF, uniquePool, uniqueLines, UNIQUE_BY_ID, SLOT_BASE };
`)();
module.exports = api;
