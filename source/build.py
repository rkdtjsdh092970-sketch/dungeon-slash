import base64,sys,os
D=os.path.dirname(os.path.abspath(__file__)); A=os.environ.get('ART_DIR', D+'/art')
sheets={'warrior':'warrior_sheet.png','c_goblin':'goblin_sheet.png','c_archer':'archer_sheet.png','c_shaman':'shaman_sheet.png','c_brute':'brute_sheet.png','c_imp':'imp_sheet.png','bosses':'bosses_sheet96.png',
 'ghoul':'goblin_sheet48.png','skel':'archer_sheet48.png','necro':'shaman_sheet48.png','brute':'brute_sheet48.png','fiend':'imp_sheet48.png','pri_imp':'pri_imp_sheet48.png','pri_ghoul':'pri_ghoul_sheet48.png','pri_skel':'pri_skel_sheet48.png','pri_necro':'pri_necro_sheet48.png','pri_brute':'pri_brute_sheet48.png','tw_imp':'tw_imp_sheet48.png','tw_ghoul':'tw_ghoul_sheet48.png','tw_skel':'tw_skel_sheet48.png','tw_necro':'tw_necro_sheet48.png','tw_brute':'tw_brute_sheet48.png'}
for n in ['slime','slimeT','slimeL','mush','mushT','bat','batC','scorp','wolf','wolfH','eye','golem','golemI','golemM','frog']: sheets[n]=n+'_sheet48.png'
import json
sp={k:'data:image/png;base64,'+base64.b64encode(open(f'{A}/{v}','rb').read()).decode() for k,v in sheets.items()}
code='\n'.join(open(f'{D}/src/{f}.js').read() for f in ['util','data','data2','data3','data4','data5','data6','satan','state','battle','battle2','assets','audio','render','render2','raidview','town','ui','ui2','ui3','ui4','ui5','ui6','ui7','notes','main'])
t=open(f'{D}/template.html').read()
t=t.replace('//__SPRITES__','const SPRITE_DATA='+json.dumps(sp)+';').replace('//__CODE__',code)
import time
os.makedirs(f'{D}/dist',exist_ok=True)
BID=time.strftime('%Y%m%d-%H%M%S'); t=t.replace('__BUILD__',BID); open(f'{D}/dist/ver.txt','w').write(BID)
os.makedirs(f'{D}/dist',exist_ok=True); open(f'{D}/dist/game.html','w').write(t); print(len(t)//1024,'KB')
