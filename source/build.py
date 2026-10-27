import base64,sys,os
D=os.path.dirname(os.path.abspath(__file__)); A='/home/claude/art'
sheets={'warrior':'warrior_sheet.png','c_goblin':'goblin_sheet.png','c_archer':'archer_sheet.png','c_shaman':'shaman_sheet.png','c_brute':'brute_sheet.png','c_imp':'imp_sheet.png','bosses':'bosses_sheet96.png',
 'ghoul':'goblin_sheet48.png','skel':'archer_sheet48.png','necro':'shaman_sheet48.png','brute':'brute_sheet48.png','fiend':'imp_sheet48.png'}
for n in ['slime','slimeT','slimeL','mush','mushT','bat','batC','scorp','wolf','wolfH','eye','golem','golemI','golemM','frog']: sheets[n]=n+'_sheet48.png'
import json
sp={k:'data:image/png;base64,'+base64.b64encode(open(f'{A}/{v}','rb').read()).decode() for k,v in sheets.items()}
code='\n'.join(open(f'{D}/src/{f}.js').read() for f in ['util','data','data2','data3','data4','data5','state','battle','battle2','assets','audio','render','render2','town','ui','ui2','ui3','ui4','ui5','ui6','main'])
t=open(f'{D}/template.html').read()
t=t.replace('//__SPRITES__','const SPRITE_DATA='+json.dumps(sp)+';').replace('//__CODE__',code)
import time
os.makedirs(f'{D}/dist',exist_ok=True)
BID=time.strftime('%Y%m%d-%H%M%S'); t=t.replace('__BUILD__',BID); open(f'{D}/dist/ver.txt','w').write(BID)
os.makedirs(f'{D}/dist',exist_ok=True); open(f'{D}/dist/game.html','w').write(t); print(len(t)//1024,'KB')
