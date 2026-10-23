#!/usr/bin/env python3
"""Mutations de la messagerie de la Tour (test-2882, test-2883) — SUR UNE COPIE de tour.html (TOUR_FICHIER), jamais sur le dépôt.
Chaque mutation remplace UN texte qui doit exister UNE fois ; elle doit faire tomber (code ≠ 0) la suite nommée. Un « survit » est un banc aveugle."""
import os, subprocess, sys, tempfile, shutil
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(R, 'tour.html'), encoding='utf-8').read()
M = [
 ("M01 mention : plus de contrôle du caractère d'avant", "if(av&&/[\\p{L}\\p{N}_.@]/u.test(av)) continue; }\n    var mot=", "}\n    var mot=", ['2882']),
 ("M02 mention : sans accent ne se replie plus", "function msNorm(t){ return String(t==null?'':t).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase(); }", "function msNorm(t){ return String(t==null?'':t).toLowerCase(); }", ['2882','2883']),
 ("M03 coloration : le texte n'est plus échappé", "h+=esc(texte.slice(i,s.debut))+'<mark", "h+=texte.slice(i,s.debut)+'<mark", ['2882']),
 ("M04 coloration : la liste du serveur ne décide plus", "if(Array.isArray(serveur)&&!s.ids.every(function(id){ return serveur.indexOf(id)>=0; })) return;", "", ['2882']),
 ("M05 touche : Entrée liste ouverte envoie", "if((e.key==='Enter'&&!e.shiftKey)||(e.key==='Tab'&&!e.shiftKey)) return 'choisir';", "if(e.key==='Tab'&&!e.shiftKey) return 'choisir';", ['2882']),
 ("M06 touche : la composition (dictée) n'est plus gardée", "if(!e||e.isComposing||e.keyCode===229) return 'rien';", "if(!e) return 'rien';", ['2882']),
 ("M07 liste : ceux déjà cités reviennent", "    if(dej.indexOf(m.id)>=0) return;\n", "", ['2882']),
 ("M08 liste : plus de @tous", "if(liste.length&&(!n||'tous'.indexOf(n)===0||'equipe'.indexOf(n)===0)) sortie.push(", "if(false) sortie.push(", ['2882']),
 ("M09 choisir : plus d'espace après la mention", "else { ins+=' '; fin=ctx.debut+ins.length; }", "else { fin=ctx.debut+ins.length; }", ['2882']),
 ("M10 envoi : le serveur est appelé AVANT de repeindre", "e.etat='envoi'; e.raison=''; MS.envoi++; messPeindreFil();\n  var fin=function(){ MS.envoi=Math.max(0,MS.envoi-1); };\n  return apiPost(", "e.etat='envoi'; e.raison=''; MS.envoi++;\n  var fin=function(){ MS.envoi=Math.max(0,MS.envoi-1); messPeindreFil(); };\n  return apiPost(", ['2882']),
 ("M11 envoi : un refus retire le message en silence", "e.etat='echec'; e.raison=(x.d&&x.d.error)?String(x.d.error):'Le serveur a refusé ('+x.status+')'; messPeindreFil(); return x;", "MS.envois=MS.envois.filter(function(y){ return y!==e; }); messPeindreFil(); return x;", ['2882','2883']),
 ("M12 envoi : tout 200 vaut confirmation", "if(x.ok&&x.d&&x.d.message&&x.d.message.id){", "if(x.ok){", ['2882']),
 ("M13 envoi : plus de dédoublonnage par identifiant", "if(m&&m.id&&!vus[m.id]){ vus[m.id]=1; MS.msgs.push(m); neufs.push(m); }", "if(m&&m.id){ vus[m.id]=1; MS.msgs.push(m); neufs.push(m); }", ['2882']),
 ("M14 lecture : une réponse d'un autre fil n'est plus jetée", "if(!d||MS.fil!==fil) return;\n    if(!Array.isArray(d.messages))", "if(!d) return;\n    if(!Array.isArray(d.messages))", ['2882']),
 ("M15 lecture : une panne de première lecture devient « vide »", "if(MS.fil!==fil) return; if(!incr||MS.msgLec!==1) MS.msgLec=-1; else MS.retard=true; messPeindreFil(); });", "if(MS.fil!==fil) return; if(!incr||MS.msgLec!==1) MS.msgLec=1; else MS.retard=true; messPeindreFil(); });", ['2882']),
 ("M15b lecture : une réponse sans liste devient « vide »", "if(!Array.isArray(d.messages)){ if(!incr||MS.msgLec!==1) MS.msgLec=-1;", "if(!Array.isArray(d.messages)){ if(!incr||MS.msgLec!==1) MS.msgLec=1;", ['2882']),
 ("M16 lu : se pose même page cachée", "if(!MS.inst||document.visibilityState!=='visible'||TAB!=='messagerie'||MS.vueMob==='liste') return;", "if(!MS.inst||TAB!=='messagerie'||MS.vueMob==='liste') return;", ['2882']),
 ("M16b lu : se pose même derrière la liste (téléphone)", "||TAB!=='messagerie'||MS.vueMob==='liste') return;   /* au téléphone", "||TAB!=='messagerie') return;   /* au téléphone", ['2882']),
 ("M17 minuteries : même page cachée", "if(!oui||document.visibilityState!=='visible'||!MS.inst) return;", "if(!oui||!MS.inst) return;", ['2882']),
 ("M18 minuterie du fil : un autre écran ne l'éteint plus", "messFilCharger(true); else messTimers(false); },4000);", "messFilCharger(true); },4000);", ['2882']),
 ("M18b minuterie de la liste : un autre écran ne l'éteint plus", "messToutCharger(); else messTimers(false); },15000);", "messToutCharger(); },15000);", ['2882']),
 ("M19 qui fait quoi : les tâches finies paraissent", "ouv=MS.taches.filter(function(k){ return k.statut==='prise'||k.statut==='attente'; });\n  if(!ouv.length)", "ouv=MS.taches;\n  if(!ouv.length)", ['2882']),
 ("M20 qui fait quoi : « déléguée » n'est plus dit", "+(pp?' · déléguée, d’abord à '+esc(nom(pp)):'')+", "+", ['2882','2883']),
 ("M21 lu : l'appel au serveur est supprimé", "apiPost('/api/monitor/conversations/lire',{fil:fil}).then(function(x){ if(!x.ok) return;", "Promise.resolve({ok:false}).then(function(x){ if(!x.ok) return;", ['2882','2883']),
 ("M22 incrémentale : plus de « apres »", "var q=incr&&MS.dernier?'?apres='+encodeURIComponent(MS.dernier):'';", "var q='';", ['2882','2883']),
 ("M23 setTab ne relit plus la messagerie", "if(t==='messagerie') messOuvrir();", "", ['2882']),
 ("M24 droits : la messagerie sort de PATRON_SEUL", "'agents','messagerie','donnees'", "'agents','donnees'", ['2882']),
 ("M25 « Parler à X » ne mène plus à la messagerie", "function agParler(id){ messOuvrirFil(id); }", "function agParler(id){ AG.sec='conv'; if(AG.cv.lec===0) agCvCharger(); agCvOuvrir(id); }", ['2882']),
 ("M26 l'observateur typographique écrit dans le calque", ",[contenteditable],.ms-miroir')", ",[contenteditable]')", ['2882']),
 ("M27 calque : une mention en gras", ".ms-miroir .ms-m{font-weight:400}", ".ms-miroir .ms-m{font-weight:700}", ['2882']),
 ("M28 mention : une marge dans la règle de base", ".ms-m{color:var(--bleu);background:var(--bleuBg);border-radius:4px;", ".ms-m{color:var(--bleu);background:var(--bleuBg);padding:0 3px;border-radius:4px;", ['2882']),
 ("M29 saisie : le texte de la zone n'est plus transparent", "background:transparent;color:transparent;caret-color:var(--text);outline:0}", "background:transparent;color:var(--text);caret-color:var(--text);outline:0}", ['2882']),
 ("M30 envoi : un non-patron peut envoyer", "if(!t||MYROLE!=='patron') return Promise.resolve(null);", "if(!t) return Promise.resolve(null);", ['2882','2883']),
 ("M31 liste : une panne plus tard vide la liste", "} else if(MS.lec!==1) MS.lec=-1;\n    messPeindreListe(); messPeindreEntete();\n  }).catch(function(){ if(MS.lec!==1) MS.lec=-1; messPeindreListe(); });", "} else if(MS.lec!==1) MS.lec=-1;\n    messPeindreListe(); messPeindreEntete();\n  }).catch(function(){ MS.lec=-1; MS.fils=[]; messPeindreListe(); });", ['2882']),
 ("M32 lecture : « complet » n'est plus lu (le fil rogné s'ajoute)", "if(d.complet||!incr){", "if(!incr){", ['2882','2883']),
 ("M33 relève du menu : un collaborateur interroge", "if(MYROLE!=='patron'||MYAPPS.indexOf('gestion')<0) return;\n  apiGet('/api/monitor/conversations')", "apiGet('/api/monitor/conversations')", ['2882']),
 ("M34 la bulle d'un message du système devient une bulle de personne", "if(m.systeme||m.de==='systeme') return '<div class=\"ms-sys\"", "if(false) return '<div class=\"ms-sys\"", ['2882']),
 ("M35 la raison du refus n'est plus dite", "(e.raison?'<small>'+esc(e.raison)+'</small>':'')", "''", ['2882']),
]
sel = sys.argv[1:]
ok = ko = 0; surv = []
for nom, a, b, suites in M:
    if sel and not any(nom.startswith(s) for s in sel): continue
    n = SRC.count(a)
    if n != 1:
        print('  ?? %s : le motif existe %d fois — mutation mal visée' % (nom, n)); surv.append(nom + ' (mal visée)'); continue
    d = tempfile.mkdtemp(prefix='mut-msg-'); f = os.path.join(d, 'tour.html')
    open(f, 'w', encoding='utf-8').write(SRC.replace(a, b))
    env = dict(os.environ, TOUR_FICHIER=f)
    tombe = []
    for s in suites:
        try:
            r = subprocess.run(['node', os.path.join(R, 'tests', 'test-%s.js' % s)], env=env, capture_output=True, text=True, timeout=120)
            tombe.append((s, r.returncode != 0, len(r.stdout.split('✗')) - 1))
        except subprocess.TimeoutExpired:
            tombe.append((s, True, -1))
    shutil.rmtree(d, ignore_errors=True)
    if any(t[1] for t in tombe): ok += 1; print('  ✓ tombe  %s  %s' % (nom, ' '.join('%s:%s✗' % (t[0], t[2]) for t in tombe if t[1])))
    else: ko += 1; surv.append(nom); print('  ✗ SURVIT %s' % nom)
print('\n%d mutations tombées, %d survivantes' % (ok, ko))
if surv: print('survivantes :', surv)
sys.exit(1 if surv else 0)
