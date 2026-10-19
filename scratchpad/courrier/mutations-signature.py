#!/usr/bin/env python3
"""Contre-épreuves de la VRAIE signature (v2.95). Règle du dépôt : correctif -> banc -> COMMIT -> mutation -> git checkout (git diff vide avant de lancer).
Chaque mutation remet UN défaut et exige qu'un banc tombe ; une mutation qui ne casse rien n'est pas une preuve (vérifier d'abord qu'elle a touché le bon endroit : le script le fait).
Lancer : COURRIER_RACINE=/home/user/teamop-csrv python3 scratchpad/courrier/mutations-signature.py   (au premier plan, un délai par exécution)"""
import subprocess, sys, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(R)
if subprocess.run(['git', 'diff', '--quiet'], capture_output=True).returncode:
    sys.exit('git diff non vide : committer avant de muter')
M = 'opcourrier.js'; T = 'tour.html'
MUTS = [
 ('module : l\'échéance du serveur n\'est plus rangée', M, 'if(vue.echeance>0) g.expires=vue.echeance;', '', 'tests/test-2702.js'),
 ('module : le relevé interroge aussi les demandes terminées', M, 'var cibles=MESSAGES.filter(function(m){ return signSrv(m)&&!!SIGN_EN_COURS[m.sign.st]; });', 'var cibles=MESSAGES.filter(function(m){ return signSrv(m); });', 'tests/test-2702.js'),
 ('module : le double clic appelle deux fois le service', M, 'if(m._occupe) return; m._occupe=true;', 'm._occupe=true;', 'tests/test-2702.js'),
 ('module : un fichier vide passe pour un PDF signé', M, 'if(!b||typeof b.size!=="number"||!b.size) throw', 'if(!b||typeof b.size!=="number") throw', 'tests/test-2702.js'),
 ('module : la capacité réelle sans les six méthodes', M, 'return typeof sg[k]==="function"; });', 'return true; });', 'tests/test-2702.js'),
 ('module : l\'annulation n\'efface plus les fichiers de l\'appareil', M, 'if(appliquer(vue)){ fichiersEffacer(fichiersDe(m)); renderAll(); persist(); toast("Demande annulée"); }', 'if(appliquer(vue)){ renderAll(); persist(); toast("Demande annulée"); }', 'tests/test-2702.js'),
 ('module : l\'échec de l\'envoi ne rend plus le bouton', M, '.catch(function(e){ if(!vivant) return; libre(); var t=msgErr(e,"échec de l’envoi");', '.catch(function(e){ if(!vivant) return; var t=msgErr(e,"échec de l’envoi");', 'tests/test-2702.js'),
 ('module : un état inconnu du serveur est accepté', M, 'if(!m||!m.sign||!vue||typeof vue!=="object"||!SIGN_DEPUIS_SRV[vue.etat]||typeof vue.id!=="string") throw', 'if(!m||!m.sign||!vue) throw', 'tests/test-2702.js'),
 ('module : le relevé automatique de 60 s est retiré', M, 'if(!document.hidden&&Date.now()-SIGN_RAF.t>=60000-100&&signEnCours()) signRafraichir(false);', '', 'tests/test-2702.js'),
 ('tour : `pret` pris pour « truthy »', T, 'j.signature&&j.signature.pret===true', 'j.signature&&j.signature.pret', 'tests/test-2705.js'),
 ('tour : plus de cache de 30 s sur /health', T, 'if(SIG_PRET&&t-SIG_PRET.t<30000) return SIG_PRET.p;', '', 'tests/test-2705.js'),
 ('tour : une session finie ne déconnecte plus', T, "if(!d||d.error!=='verification_indisponible'){ doLogout(); }", '', 'tests/test-2705.js'),
 ('tour : un brouillon abandonné reste sur le service', T, "return sigRequete('POST','/demandes/'+sigId(id)+'/annuler').then(null,function(){}).then(function(){ throw e; }); }); },", 'throw e; }); },', 'tests/test-2705.js'),
 ('tour : une réponse qui n\'est pas une demande passe pour une demande', T, "typeof v.id!=='string'||typeof v.etat!=='string'", 'false', 'tests/test-2705.js'),
 ('tour : le PDF part sans son type', T, "{corps:f.blob,type:'application/pdf'}", '{corps:f.blob}', 'tests/test-2705.js'),
 ('tour : le service est joint ailleurs', T, "var COURRIER_SRV='https://courrier-beta.teamop.fr';", "var COURRIER_SRV='https://courrier-beta.teamop.fr';\nCOURRIER_SRV='https://autre.example';", 'tests/test-2705.js'),
 ('tour : un refus du service devient un succès muet', T, "if(!r.ok) return r.json().catch(function(){ return {}; }).then(function(d){ throw new Error(signMessage(d,r.status)); });", '', 'tests/test-2705.js'),
]
env = dict(os.environ, COURRIER_RACINE=os.environ.get('COURRIER_RACINE', R))
mauvais = 0
for nom, f, a, b, banc in MUTS:
    s = open(f, encoding='utf8').read()
    if s.count(a) != 1:
        print('??  cible introuvable (%d) : %s' % (s.count(a), nom)); mauvais += 1; continue
    open(f, 'w', encoding='utf8').write(s.replace(a, b))
    try:
        d = subprocess.run(['git', 'diff', '--stat'], capture_output=True, text=True).stdout.strip().splitlines()[-1]
        r = subprocess.run(['node', banc], capture_output=True, text=True, timeout=200, env=env)
        tombe = r.returncode != 0
        fin = [l for l in r.stdout.splitlines() if 'ok' in l or '✓' in l][-1:]
        print(('MORD ' if tombe else 'VERT ') + nom + '  [' + d + ']')
        if not tombe: mauvais += 1
    except subprocess.TimeoutExpired:
        print('MORD (délai) ' + nom)
    finally:
        subprocess.run(['git', 'checkout', f], capture_output=True)
print('RESTE %d mutation(s) qui ne mordent pas' % mauvais)
sys.exit(1 if mauvais else 0)
