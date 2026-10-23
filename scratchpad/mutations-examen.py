#!/usr/bin/env python3
"""Mutations de l'examen de l'équipe (23 octobre 2026). Règle du dépôt : correctif -> banc -> COMMIT -> mutation -> git checkout.
Chaque mutation remet un défaut dans un fichier COMMITÉ, lance les bancs (les moins chers d'abord) et attend qu'au moins un tombe.
Usage : python3 scratchpad/mutations-examen.py [début [fin]]   (indices dans la liste)"""
import subprocess, sys, os
R = '/home/user/teamop-d4'
os.chdir(R)
BANCS = ['tests/test-2934.js', 'tests/test-2932.js', 'tests/test-2930.js', 'tests/test-2931.js', 'tests/test-2933.js']
E = 'server/examen.js'; I = 'server/index.js'; C = 'server/cerveau.js'; T = 'tour.html'
M = [
 (E, "crypto.timingSafeEqual(a, b)", "(a.toString() === b.toString())", 'comparaison de la clé hors temps constant'),
 (E, "if (illisibles.has(F_ETAT) || !cleValide(k))", "if (illisibles.has(F_ETAT) || false)", 'toute clé de la bonne forme est acceptée'),
 (E, "empreinte: sha(cle), creeLe", "empreinte: sha(cle), cle, creeLe", 'la clé rangée en clair'),
 (E, "app.post('/api/monitor/agents/examen/lancer', acces(monPatronStrict, 'lancer')", "app.post('/api/monitor/agents/examen/lancer', monPatronStrict", 'la clé ne lance plus'),
 (E, "app.post('/api/monitor/agents/examen/cle', monPatronStrict,", "app.post('/api/monitor/agents/examen/cle', acces(monPatronStrict, 'cle'),", 'la clé peut créer une clé'),
 (E, "if (courant) return { code: 409", "if (false) return { code: 409", 'deux examens à la fois'),
 (E, "if (attente > 0) return { code: 429", "if (false) return { code: 429", 'plus de limite à une heure'),
 (E, "etat.jour.n >= (ctx.parJour || PAR_JOUR)", "false", 'plus de limite journalière'),
 (E, "if (!garde.reserver()) { compte.coupe = true;", "if (false) { compte.coupe = true;", 'plus de plafond global d\'appels'),
 (E, "if (o.appelsMax && compte.appels >= o.appelsMax) { compte.plafondScenario = true;", "if (false) { compte.plafondScenario = true;", 'plus de plafond par scénario'),
 (E, "ctx.cerveau.imputer('examen', res.usd)", "0", 'la dépense n\'est plus imputée'),
 (E, "if (E.techniques() > 0) return { libelle, etat: 'inconnu'", "if (false) return { libelle, etat: 'inconnu'", 'une panne de Claude accuse (✗)'),
 (E, "if (o && o.capacite && !E.capa(o.capacite)) return", "if (false) return", 'plus d\'« en attente » : ✗ pour un module absent'),
 (E, "if (cond) return { libelle, etat: 'ok', detail: '' };", "if (cond || (o && o.capacite)) return { libelle, etat: 'ok', detail: '' };", '« en attente » passe pour ✓ à vide'),
 (E, "try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} },\n  };\n  return E;", "},\n  };\n  return E;", 'le dossier temporaire reste'),
 (E, ".finally(() => clearTimeout(t))", ".finally(() => 0)", 'une minuterie de scénario survit'),
 (E, "replace(/[<>]{3,}/g, ' ').replace(/[<>]/g, ' ')", "replace(/XXX/g, ' ')", 'le juge lit une donnée qui ferme ses délimiteurs'),
 (E, "if (typeof j[c] !== 'boolean') return null;", "if (j[c] === undefined) return null;", 'le juge accepte un non-booléen'),
 (E, "if (etat.courant && !illisibles.has(F_ETAT)", "if (false && etat.courant && !illisibles.has(F_ETAT)", 'un examen coupé ne se dit pas'),
 (E, "if (illisibles.has(nom)) { console.error('⛔ ' + nom + ' NON réécrit", "if (false) { console.error('⛔ ' + nom + ' NON réécrit", 'un fichier illisible est réécrit'),
 (E, "pose('la différence (sur mesure) et « 15 € »', /15\\s?€/.test(corps) &&", "pose('la différence (sur mesure) et « 15 € »', true &&", 'le contrôle « 15 € » ne mord plus'),
 (E, "const ditImpaye = t => DIT_IMPAYE.test(", "const ditImpaye = t => false && DIT_IMPAYE.test(", 'le contrôle « Hugo dit impayé » est aveugle'),
 (E, "resultats = resultats.slice(0, GARDER); etat.courant = null;", "etat.courant = null;", 'les résultats ne sont plus bornés (restart)'),
 (E, "resultats.unshift(r); resultats = resultats.slice(0, GARDER);", "resultats.unshift(r);", 'plus de vingt résultats'),
 (E, "const sansNom = o.entreprise ? corps.split(o.entreprise).join(' ') : corps;", "const sansNom = corps;", 'l\'activité est cherchée dans le nom de l\'entreprise'),
 (E, "if (def.dernier) E.compte.pannes += X.partage.techniques;", "", 'une panne ailleurs rend le ton ✗'),
 (E, "if (!ok) { ko++", "if (!ok) { ko++", None),
 (I, "'agents/examen/lancer': 'a lancé l’examen de l’équipe d’agents', ", "", 'lancer l\'examen sort du journal des gestes'),
 (I, "mail: { signature: messagerieTour.signature },", "mail: messagerieTour,", 'l\'examen reçoit la vraie poste'),
 (I, "      examenMod = require('./examen')(app, { DATA_DIR, monAdmin, monPatronStrict, agents: agentsMod,", "      examenMod = require('./examen')(app, { DATA_DIR, monAdmin, monPatronStrict, clients: clientsData, agents: agentsMod,", 'l\'examen reçoit les clients réels'),
 (C, "|| agents.AGENTS.some(a => a.id === nom)) return false;", ") return false;", 'imputer accepte un nom d\'agent'),
 (T, "toast('Clé créée : copie-la maintenant, elle ne sera plus montrée.');", "toast('Clé créée.'); try{ localStorage.setItem('cle',r.d.cle); }catch(e){}", 'la clé est rangée dans le navigateur'),
 (T, "function exCleCacher(){ EX.cle='';", "function exCleCacher(){", '« J\'ai copié » ne cache pas la clé'),
 (T, "function exVerifHtml(v){\n  var e=EX_ICO[v.etat]?v.etat:'inconnu';", "function exVerifHtml(v){\n  var e=EX_ICO[v.etat]?v.etat:'ok';", 'un verdict inconnu se lit ✓'),
 (T, "+esc(v.libelle)+(v.detail?'<small>'+esc(v.detail)+'</small>':'')", "+esc(v.libelle)+(v.detail?'<small>'+v.detail+'</small>':'')", 'un constat du serveur n\'est pas échappé'),
 (T, "if(!confirm('Faire passer l’examen à l’équipe ?", "if(false&&!confirm('Faire passer l’examen à l’équipe ?", 'lancer sans confirmation'),
 (T, "}).catch(function(e){ EX.lec=-1; EX.err=msgErreur(e);", "}).catch(function(e){ EX.lec=1; EX.err=msgErreur(e);", 'un serveur coupé se lit « aucun examen »'),
 (T, "    if(!exEcran()) return;\n    if(typeof document", "    if(typeof document", 'la minuterie survit à l\'écran quitté'),
 (T, "if(s==='examen') exEntrer(); render(); }", "render(); }", 'entrer dans l\'onglet ne relit pas'),
 (T, "if(MYROLE!=='patron'||!EX.d) return;\n  if(!confirm('Supprimer", "if(MYROLE!=='patron'||!EX.d) return;\n  if(!confirm('Supprimer", None),
]
M = [m for m in M if m[3]]
deb = int(sys.argv[1]) if len(sys.argv) > 1 else 0
fin = int(sys.argv[2]) if len(sys.argv) > 2 else len(M)
def vert(b):
    try:
        r = subprocess.run(['node', b], capture_output=True, text=True, timeout=150, env=dict(os.environ, NODE_PATH=subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()))
    except subprocess.TimeoutExpired:
        return False, 'délai'
    return r.returncode == 0, ''
tombent = 0; survivantes = []; mal = []
for i, (f, old, new, nom) in enumerate(M[deb:fin], start=deb):
    s = open(f, encoding='utf8').read()
    if s.count(old) != 1:
        mal.append((i, nom, s.count(old))); print(f'[{i}] ⚠ MOTIF INTROUVABLE ({s.count(old)}) : {nom}'); continue
    open(f, 'w', encoding='utf8').write(s.replace(old, new))
    d = subprocess.run(['git', 'diff', '--stat'], capture_output=True, text=True).stdout
    assert d.count('|') == 1, d
    tue = None
    try:
        for b in BANCS:
            ok, why = vert(b)
            if not ok: tue = b + (' (' + why + ')' if why else ''); break
    finally:
        subprocess.run(['git', 'checkout', '--', f], check=True)
    if tue: tombent += 1; print(f'[{i}] ✓ tombe sur {tue} : {nom}')
    else: survivantes.append((i, nom)); print(f'[{i}] ✗ SURVIT : {nom}')
d = subprocess.run(['git', 'diff', '--stat'], capture_output=True, text=True).stdout.strip()
print(f'\n{tombent} mutations tombent, {len(survivantes)} survivent, {len(mal)} mal visées ; git diff après restauration : {"VIDE" if not d else d}')
for x in survivantes: print('  survivante :', x)
