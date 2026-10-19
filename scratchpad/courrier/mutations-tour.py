#!/usr/bin/env python3
"""Mutations du Courrier de la Tour : chaque défaut est remis un par un dans une COPIE de tour.html (TOUR_FICHIER), et `tests/test-2704.js` doit TOMBER.
Un défaut qui ne fait rien tomber est un banc aveugle — ou une mutation mal visée : on vérifie d'abord que la copie DIFFÈRE de l'original (le motif a trouvé SA cible, une fois).
   python3 scratchpad/courrier/mutations-tour.py [filtre]    (au premier plan ; une mutation par processus, délai de 200 s)"""
import os, subprocess, sys, tempfile, re
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = open(os.path.join(RACINE, 'tour.html'), encoding='utf-8').read()
M = [
 ("clé de stockage empruntée à une autre application", "cleStockage:'tour_courrier'", "cleStockage:'elanB_courrier'"),
 ("les deux côtés Pro et Perso", "cotes:['pro'],cote:'pro'", "cotes:['pro','perso'],cote:'pro'"),
 ("thème figé", "return document.body.classList.contains('jour')?'jour':'nuit'; }", "return 'jour'; }"),
 ("la déconnexion garde la clé du Courrier", "localStorage.removeItem('tour_courrier'); }catch(e){} try{ sessionStorage.removeItem('tour_token');", "}catch(e){} try{ sessionStorage.removeItem('tour_token');"),
 ("une relève reconstruit le module", "if(!courrierGarde(v)){ v.innerHTML=vueCourrier(); courrierMonter(); }", "{ v.innerHTML=vueCourrier(); courrierMonter(); }"),
 ("quitter le Courrier ne le démonte pas", "if(TAB!=='support') courrierDemonter();", ""),
 ("le thème n'est plus suivi en direct", "try{ if(COUR.inst) COUR.inst.rafraichir({donnees:false}); }catch(e){}", ""),
 ("un refus du serveur devient une liste vide", "if(!r.ok) return erreurDe(r,defaut).then(function(e){ throw e; });", "if(!r.ok) return {boites:[],messages:[],dossiers:[]};"),
 ("une session expirée ne ramène plus à la connexion", "if(r.status===401){ doLogout(); throw", "if(r.status===401){ throw"),
 ("la boîte qui ne répond pas se lit comme vide", "if(b.erreur) throw new Error('la boîte ne répond pas : '+b.erreur);", ""),
 ("la Corbeille cherche un rôle inconnu", "trash:'corbeille'", "trash:'poubelle'"),
 ("le drapeau marque le lu", "marque:e.drapeau", "marque:e.lu"),
 ("déplacer vise toujours les archives", "role:ROLE[vers]", "role:'archives'"),
 ("l'envoi perd ses pièces jointes", "pieces:pieces},'Envoi refusé'", "pieces:[]},'Envoi refusé'"),
 ("un geste n'oublie plus la mémoire de la source", "var r=ref(id); oublier();\n      return appel('/api/monitor/mail/flag'", "var r=ref(id);\n      return appel('/api/monitor/mail/flag'"),
 ("la source ne dit plus qu'elle marque", "marquage:true,deplacement:true", "marquage:false,deplacement:true"),
 ("la source promet Google", "oauth:false,programmeServeur:false", "oauth:true,programmeServeur:false"),
 ("le corps lu est le HTML", "return {corps:m.texte,pj:", "return {corps:(m.html||m.texte),pj:"),
 ("le dossier Envoyés lit la Réception", "sent:'envoyes'", "sent:'inbox'"),
 ("l'ancien écran revient (une fonction)", "function vueCourrier(){", "function vueSupport(){ return ''; }\nfunction vueCourrier(){"),
 ("l'accueil relit des messages", "if(MSG.nonLus>0) G.push", "var _m=MSG.messages; if(MSG.nonLus>0) G.push"),
 ("la pastille ne suit plus le module", "onCompter:function(n){ MSG.nonLus=n; setBdg('bdg-supp',n); },", ""),
 ("le module se charge au démarrage", "<script>\n", "<script src=\"opcourrier.js\"></script>\n<script>\n", ),
 ("version non montée", "var TOUR_VERSION='v2.91'", "var TOUR_VERSION='v2.90'"),
 ("l'ancien envoi par le support", "'/api/monitor/mail/envoyer',{boite:m.boite", "'/api/monitor/support/envoyer',{boite:m.boite"),
 ("une règle de l'ancien écran survit", ".courrier-zone{min-height:360px", ".mail-rows{overflow-y:auto;flex:1}\n.courrier-zone{min-height:360px"),
 ("le relevé écrase le chiffre du module", "if(!COUR.inst){ MSG.nonLus=", "if(true){ MSG.nonLus="),
 ("v2.91 · la Tour ne déclare plus ses trois gestes", "journalEnvois:true,telechargerPiece:true,suivi:true", "journalEnvois:false,telechargerPiece:true,suivi:true"),
 ("v2.91 · Envois TeamOP lit une autre route", "appel('/api/monitor/mails',undefined", "appel('/api/monitor/journal',undefined"),
 ("v2.91 · un envoi qui n'est pas parti ne le dit plus", "etat:e.echec?'echec':(e.retard?'retard':'')", "etat:''"),
 ("v2.91 · deux envois du même instant partagent un identifiant", "id:t+'-'+k", "id:String(t)"),
 ("v2.91 · toute pièce a la place 0", "{id:p.idx,nom:p.nom", "{id:0,nom:p.nom"),
 ("v2.91 · la pièce demandée est toujours la première", "+'&idx='+n,undefined,'Téléchargement refusé'", "+'&idx=0',undefined,'Téléchargement refusé'"),
 ("v2.91 · la pièce est lue comme du texte", "return x.blob(); }", "return x.text(); }"),
 ("v2.91 · la pièce passe par la lecture JSON", "return requete('/api/monitor/mail/piece", "return appel('/api/monitor/mail/piece"),
 ("v2.91 · le suivi s'adresse à l'identifiant du module, pas au Message-ID", "var corps={mid:mid};", "var corps={mid:id};"),
 ("v2.91 · le suivi n'oublie plus la mémoire de la source", "oublier(); if(!d||!d.suivi)", "if(!d||!d.suivi)"),
 ("v2.91 · la lecture ne rend plus le suivi", "return {corps:m.texte,suivi:suiviDe(m.suivi),", "return {corps:m.texte,"),
 ("v2.91 · la liste ne rend plus le suivi", "pj:pj,suivi:suiviDe(m.suivi)}", "pj:pj}"),
 ("v2.91 · une réponse ne référence plus rien", "if(t[0]) corps.enReponseA=t[0];", ""),
 ("v2.91 · depuis une autre boîte, la place du message d'origine part quand même", "return r.boite===m.boite?{mid:mid,dossier:r.dossier,uid:r.uid}:{mid:mid}; }", "return {mid:mid,dossier:r.dossier,uid:r.uid}; }"),
 ("la liste d'un dossier ignore la boîte", "'/api/monitor/mail/liste?page='+p+'&boite='+encodeURIComponent(boite)+'&dossier='", "'/api/monitor/mail/liste?page='+p+'&dossier='"),
]
filtre = sys.argv[1] if len(sys.argv) > 1 else ''
tombes = 0; vives = 0; total = 0
for nom, ancien, nouveau in M:
    if filtre and filtre not in nom: continue
    total += 1
    n = SRC.count(ancien)
    if n < 1:
        print('MAL VISÉE   ', nom, '— motif introuvable'); continue
    if n > 1 and nom != "le module se charge au démarrage":
        print('MAL VISÉE   ', nom, '— motif trouvé', n, 'fois'); continue
    mut = SRC.replace(ancien, nouveau, 1)
    assert mut != SRC
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f: f.write(mut); chemin = f.name
    try:
        r = subprocess.run(['node', 'tests/test-2704.js'], cwd=RACINE, env=dict(os.environ, TOUR_FICHIER=chemin), capture_output=True, text=True, timeout=200)
        ko = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
        etat = ko[-1] if ko else ('?', '?')
        tombe = r.returncode != 0
    except subprocess.TimeoutExpired:
        tombe, etat = True, ('délai', '')
    finally: os.unlink(chemin)
    print(('TOMBE   ' if tombe else 'VIVANTE ') + nom + '  [' + ' ✓ '.join(map(str, etat[:1])) + ' / ' + ' ✗'.join(map(str, etat[1:])) + ']')
    if tombe: tombes += 1
    else: vives += 1
print('\n%d mutations jouées · %d tombent · %d survivent' % (total, tombes, vives))
sys.exit(1 if vives else 0)
