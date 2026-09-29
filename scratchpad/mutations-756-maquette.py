import io,subprocess,sys,os
W=sys.argv[1]
def lire(f): return io.open(os.path.join(W,f),encoding='utf-8').read()
def ecrire(f,s): io.open(os.path.join(W,f),'w',encoding='utf-8').write(s)
M=[
 ('Gratuit remis dans la maquette','apercu/site-apple.html',"      {n:'Pro', d:'Pour les équipes","      {n:'Gratuit', d:'Pour découvrir.', p:'0 €', u:'1 utilisateur', l:['Interventions']},\n      {n:'Pro', d:'Pour les équipes"),
 ('badge « Le plus choisi » remis','apercu/site-apple.html',"       phare:true,\n       l:['Tout le Pro","       tag:'⭐ LE PLUS CHOISI', phare:true,\n       l:['Tout le Pro"),
 ('prix de Pro réinventé (19 €)','apercu/site-apple.html',"p:'15 €', u:'1 utilisateur par abonnement',\n       l:['Planning","p:'19 €', u:'1 utilisateur par abonnement',\n       l:['Planning"),
 ('impayé qui revient au forfait gratuit','apercu/site-apple.html',"Rien n'est\n      retenu en otage.","Rien n'est\n      retenu en otage. Sans paiement, vous revenez au forfait gratuit."),
 ('« au même moment » remis','apercu/site-apple.html',"arrivent chez les autres en quelques secondes.</p>","arrivent chez les autres, au même moment.</p>"),
 ('« Un seul compte » remis','apercu/site-apple.html',"<h2>Deux applications, chacune à sa place.</h2>","<h2>Deux applications. Un seul compte.</h2>"),
 ('un métier sans pack présenté comme prêt','apercu/site-apple.html','<h3>Serrurerie</h3><p>Ouverture, sécurité, accès.</p>','<h3>Sécurité</h3><p>Rondes, contrôles, main courante.</p>'),
 ('la note OP MESSAGES ne se montre plus','apercu/site-apple.html',"    document.getElementById('note-msg').hidden=(k!=='messages');\n",""),
 ('« temps réel » hors d’OP MESSAGES','apercu/site-apple.html',"des rapports impeccables.', p:'15", "des rapports impeccables, en temps réel.', p:'15"),
 ('le site remet une formule que la maquette ignore','scripts/site-marine.js',"const FORMULES_GESTION = [\n","const FORMULES_GESTION = [\n  F('gratuit', 'Gratuit', '0', '€ / mois', '1 utilisateur', 'Découvrir.', 'Inclus', ['Interventions']),\n"),
 ('le prix du site change, la maquette non','scripts/site-marine.js',"F('business', 'Business', '25',","F('business', 'Business', '29',"),
]
mord=0
for nom,f,a,b in M:
  s=lire(f)
  if s.count(a)!=1: print('ANCRE %d× — %s' % (s.count(a), nom)); continue
  ecrire(f,s.replace(a,b))
  d=subprocess.run(['git','-C',W,'diff','--stat'],capture_output=True,text=True).stdout.strip().splitlines()
  r=subprocess.run(['node','tests/test-756.js'],cwd=W,capture_output=True,text=True,timeout=60)
  import re
  t=re.findall(r'(\d+) ✓ (\d+) ✗',r.stdout)
  ko=int(t[-1][1]) if t else -1
  print(('MORD ' if ko>0 else 'RATE ')+'%-50s %s  [%s]' % (nom, (t[-1][0]+' ✓ '+t[-1][1]+' ✗') if t else 'aucun total', d[-1] if d else 'aucun diff'))
  if ko>0: mord+=1
  subprocess.run(['git','-C',W,'checkout','--',f])
print('%d/%d mutations mordent' % (mord,len(M)))
print('diff final :', subprocess.run(['git','-C',W,'status','--short'],capture_output=True,text=True).stdout.strip() or 'vide')
