#!/usr/bin/env python3
# Contre-épreuve de la double authentification (voie double-auth, étape 2) : on REMET un défaut dans une COPIE de la page, et la sonde qui garde la promesse doit tomber.
# ⛔ Jamais sur le fichier du dépôt : chaque mutation vit dans /tmp/.../mut-<n>/apercu/ (copie du dossier apercu/), servie par le serveur des sondes (RACINE=…).
# ⛔ Une mutation qui ne casse rien n'est pas une victoire : on vérifie d'abord qu'elle a TOUCHÉ le fichier (le motif existe exactement une fois), puis on demande ce que la sonde ne regarde pas.
# Usage : python3 double-auth-mutations.py [numéros…]      (sans argument : toutes ; chaque sonde est interrompue au PREMIER ✗, ce qui suffit à prouver qu'elle tombe)
# Le contrôle d'avant-mutation est la sonde sur la copie INTACTE (option --intact) : sinon une mutation « tombe » pour de mauvaises raisons.
import os, re, shutil, subprocess, sys, time, signal

DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
TMP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/da/mut'
PAGE = 'apercu/prototype-op-gestion.html'

# (numéro, nom, sonde qui doit tomber, [(ancienne, nouvelle), …])  — chaque « ancienne » doit exister EXACTEMENT une fois dans la page
M = [
 (1, 'le nombre tapé n’est plus comparé (toujours juste)', 'nombre', [("if (String(d.nombre) !== String(saisi)) { d.etat = 'echouee'; return 'mauvais'; }", "if (false) { d.etat = 'echouee'; return 'mauvais'; }")]),
 (2, 'le nombre est tiré de 0 à 99 (hors 10–99)', 'nombre', [("nombre:10 + secuAleaInt(90)", "nombre:secuAleaInt(100)")]),
 (3, 'le téléphone affiche le nombre', 'nombre', [('<label class="ops-qnb" for="ops-n-${d.id}">Tape le nombre', '<p class="ops-qnb">${d.nombre}</p><label class="ops-qnb" for="ops-n-${d.id}">Tape le nombre')]),
 (4, 'un mauvais nombre n’annule pas la demande', 'nombre', [("if (String(d.nombre) !== String(saisi)) { d.etat = 'echouee'; return 'mauvais'; }", "if (String(d.nombre) !== String(saisi)) { return 'mauvais'; }")]),
 (5, 'un mauvais nombre ne compte pas d’échec', 'nombre', [("resultat:'nombre' }); secuEchec(k, 'nombre');", "resultat:'nombre' });")]),
 (6, 'la demande n’expire jamais', 'nombre', [("const secuDemandeVivante = d => { if (d && d.etat === 'attente' && secuMaint() >= d.jusqua)", "const secuDemandeVivante = d => { if (false && d && d.etat === 'attente' && secuMaint() >= d.jusqua)")]),
 (7, 'la limite de 6 demandes par quart d’heure est retirée', 'nombre', [("now - d.ts < SECU_REGLES.fenetreMs).length >= SECU_REGLES.demandesMax", "now - d.ts < SECU_REGLES.fenetreMs).length >= 99999")]),
 (8, 'le code à 6 chiffres est accepté pour une connexion inhabituelle', 'inhabituelle', [("if (d.raisons.length) { secuJ('login.code_refused_unusual'", "if (false) { secuJ('login.code_refused_unusual'")]),
 (9, 'un autre ordinateur n’est pas détecté', 'inhabituelle', [("if (!a) r.push('Appareil jamais utilisé pour ce compte');", "")]),
 (10, 'la pleine nuit n’est pas détectée', 'inhabituelle', [("if (SECU.cases.nuit) r.push('En dehors des heures de travail habituelles (7 h – 21 h)');", "")]),
 (11, 'les mots de passe faux juste avant ne sont pas détectés', 'nombre', [("if (c.echecs >= 2 && now - c.dernierEchec < SECU_REGLES.fenetreMs)", "if (c.echecs >= 99 && now - c.dernierEchec < SECU_REGLES.fenetreMs)")]),
 (12, 'cinq échecs ne verrouillent pas', 'nombre', [("if (c.echecs >= SECU_REGLES.echecsMax) { c.nVerrous++;", "if (c.echecs >= 99999) { c.nVerrous++;")]),
 (13, 'le verrou ne double pas à chaque nouveau verrou', 'nombre', [("SECU_REGLES.verrouMs * Math.pow(2, c.nVerrous - 1)", "SECU_REGLES.verrouMs")]),
 (14, 'un compte verrouillé répond autrement qu’un mot de passe faux (fuite)', 'nombre', [("if (c.verrou) { secuJ('login.failed', p.k, 'Compte verrouillé'); return { refus:GEN }; }", "if (c.verrou) { secuJ('login.failed', p.k, 'Compte verrouillé'); return { refus:'Ce compte est verrouillé.' }; }")]),
 (20, 'le mot de passe provisoire reste valable après le choix du mot de passe', 'activation', [("return c.empreinte ? e === c.empreinte : !!c.provEmp && e === c.provEmp; };", "return (c.empreinte ? e === c.empreinte : !!c.provEmp && e === c.provEmp) || (!!c.provVieux && mdp === c.provVieux); };"), ("c.empreinte = secuEmpreinte(mdp, c.sel); c.prov = null;", "c.empreinte = secuEmpreinte(mdp, c.sel); c.provVieux = c.prov; c.prov = null;")]),
 (21, 'le mot de passe provisoire ne meurt jamais (72 heures)', 'demo', [("if (!c.empreinte && secuMaint() > c.provJusqua) return", "if (false) return")]),
 (24, 'un code d’activation sert deux fois', 'activation', [("if (!a || a.servi || secuMaint() >= a.jusqua ||", "if (!a || secuMaint() >= a.jusqua ||")]),
 (25, 'un code d’activation expiré (15 minutes) est accepté', 'activation', [("if (!a || a.servi || secuMaint() >= a.jusqua ||", "if (!a || a.servi ||")]),
 (26, 'un PIN faible (suite, répétition) est accepté', 'activation', [("const secuPinFaible = p =>", "const secuPinFaible = p => false; const secuPinFaibleVieux = p =>")]),
 (27, 'cinq PIN faux n’effacent pas le téléphone', 'telephone', [("if (reste <= 0) { c.tel.efface = true;", "if (reste <= -99) { c.tel.efface = true;")]),
 (45, '?auto= est accepté partout (le test d’adresse est retiré)', 'auto', [("return ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(loc.hostname); };", "return true; };")]),
 (46, '?auto= monte le téléphone', 'auto', [("SECU.auto = true; sessionOuvrir(auto); if (/[?&]tel=1\\b/.test(location.search)) opsMonter(); }", "SECU.auto = true; sessionOuvrir(auto); opsMonter(); }")]),
 (47, 'le mot de passe choisi est rangé dans le navigateur', 'secrets', [("function secuMdpDefinir(k, mdp){ const c = SECU.comptes[k];", "function secuMdpDefinir(k, mdp){ try { localStorage.setItem('opg_proto_mdp_' + k, mdp); } catch (e) {} const c = SECU.comptes[k];")]),
 (48, 'un lien « Code de secours » est ajouté à l’écran de connexion', 'secrets', [('<button type="button" class="cn-lien" data-cnx="oubli">Mot de passe oublié ?</button>', '<button type="button" class="cn-lien" data-cnx="oubli">Mot de passe oublié ?</button><button type="button" class="cn-lien" data-cnx="secours">Code de secours</button>')]),
 (49, 'le mot de passe commun « Bienvenue17 » est rétabli', 'secrets', [("const SECU_DEMO = true;", "const SECU_DEMO = true; const MDP_PROVISOIRE = 'Bienvenue17';")]),
 (53, 'la boîte rouge « Connexion inhabituelle détectée » est retirée', 'inhabituelle', [("${rouge ? `<div class=\"sec-alerte\" data-sec=\"alerte-rouge\"", "${false ? `<div class=\"sec-alerte\" data-sec=\"alerte-rouge\"")]),
 (58, 'le nombre est écrit dans une donnée data-', 'secrets', [('<div class="sec-nombre${rouge ? \' rouge\' : \'\'}" data-sec="nombre"', '<div class="sec-nombre${rouge ? \' rouge\' : \'\'}" data-n="${d.nombre}" data-sec="nombre"')]),
 (60, 'le texte à copier de la fiche contient le mot de passe provisoire', 'secrets', [("'3. Ton mot de passe provisoire : je te le remets en main propre.'", "'3. Ton mot de passe provisoire : ' + (c.prov || 'je te le remets en main propre.')")]),
 (61, 'la case « Rester connecté » revient', 'structure', [('<button type="button" class="cn-lien" data-cnx="oubli">Mot de passe oublié ?</button>', '<label><input type="checkbox" id="cn-reste" checked> Rester connecté</label><button type="button" class="cn-lien" data-cnx="oubli">Mot de passe oublié ?</button>')]),
 (62, 'le téléphone est clair de jour', 'structure', [("#opsec .ops-ecran{height:100%;display:flex;", "#opsec .ops-ecran{background:#fff !important;height:100%;display:flex;")]),
 (63, 'le hasard des secrets devient Math.random', 'crypto', [("const secuAleaInt = n => { const m = Math.floor(4294967296 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= m); return a[0] % n; };", "const secuAleaInt = n => Math.floor(Math.random() * n);")]),
 (64, 'une promesse d’absolu s’écrit dans un écran', 'mots', [("Il n’y a pas de code de secours : ton téléphone est ta clé.</p>", "Il n’y a pas de code de secours : ton téléphone est ta clé. Protection garantie à 100 %.</p>")]),
 (65, 'un écran tutoie puis vouvoie', 'mots', [("Dernière chose : choisis ton mot de passe personnel.", "Dernière chose : choisissez votre mot de passe personnel.")]),
 (67, 'l’inactivité (15 minutes) ne ferme plus la session', 'inactif', [("now - s.derniereActivite >= SECU_REGLES.inactiviteMs) { secuFermerSessions(k, 'inactif'); break; }", "false) { secuFermerSessions(k, 'inactif'); break; }")]),
 (68, 'le téléphone ne se verrouille plus à 60 secondes', 'telephone', [("now - u.derniere >= SECU_REGLES.telVerrouMs)", "false)")]),
 (69, '« Faire avancer l’horloge » n’avance rien', 'demo', [("SECU.decalage += (parseInt(b.dataset.m, 10) || 0) * 60000;", "SECU.decalage += 0;")]),
 (70, '« Activer tous les téléphones d’un coup » ne touche que Marc', 'demo', [("if (!c.tel && p.actif) { secuTelCreer(p.k, secuNomAppareil(p.k), SECU_DEPART.pin);", "if (!c.tel && p.actif && p.k === 'marc') { secuTelCreer(p.k, secuNomAppareil(p.k), SECU_DEPART.pin);")]),
 (71, 'un téléphone révoqué ne s’efface plus à la lecture suivante', 'telephone', [("function opsSynchro(k){ const c = secuCompte(k), u = secuUi(k); if (u.tel === (c.tel || null)) return u;", "function opsSynchro(k){ const c = secuCompte(k), u = secuUi(k); return u;")]),
 (72, 'une seconde porte pose SESSION sans passer par sessionOuvrir', 'auto', [("cnxCharger(() => { sessionOuvrir(p.k); toast(texte ||", "cnxCharger(() => { SESSION = p.k; sessionOuvrir(p.k); toast(texte ||")]),
 (66, 'le téléphone n’est plus ouvert d’office aux grands écrans', 'structure', [("SECU.ouvert = innerWidth >= 1100; opsDemo(); opsDessiner(); secuTicDemarrer(); }", "SECU.ouvert = false; opsDemo(); opsDessiner(); secuTicDemarrer(); }")]),
 # ── étape 3 : le pirate, le verrouillage, la page Sécurité, Équipe, Mon compte, les actions sensibles (sondes « da-… » = double-auth-….js) ──
 (61, 'Ce n’est pas moi ne verrouille pas le compte', 'da-pirate', [("  c.verrou = { le:now, par:'telephone', jusqua:null, n:1 };\n  const fermees", '  const fermees')]),
 (62, 'Ce n’est pas moi ne ferme pas la session', 'da-pirate', [("  secuFermerSessions(k, 'bloquee'); opsDemo();\n  if (d) secuPcSuite(d); }", '  opsDemo();\n  if (d) secuPcSuite(d); }')]),
 (63, 'Ce n’est pas moi ne retire pas les autres demandes', 'da-pirate', [("  SECU.demandes.forEach(x => { if (x.k === k && x.etat === 'attente') x.etat = 'annulee'; });\n  c.verrou", '  c.verrou')]),
 (64, 'Déverrouiller garde l’ancien mot de passe', 'da-equipe', [("  secuProvisoireNeuf(k); secuJ('account.unlocked', k, '');\n  eqxJ('a déverrouillé", "  secuJ('account.unlocked', k, '');\n  eqxJ('a déverrouillé")]),
 (65, 'Déverrouiller garde les appareils reconnus', 'da-equipe', [("c.verrou = null; c.echecs = 0; c.nVerrous = 0; c.appareils = [];\n  secuProvisoireNeuf(k); secuJ('account.unlocked', k, '');\n  eqxJ", "c.verrou = null; c.echecs = 0; c.nVerrous = 0;\n  secuProvisoireNeuf(k); secuJ('account.unlocked', k, '');\n  eqxJ")]),
 (66, 'Nouveau téléphone ne révoque pas l’ancien', 'da-equipe', [('const c = secuCompte(k); c.tel = null; c.codeActivation = null;', 'const c = secuCompte(k); c.codeActivation = null;')]),
 (67, 'Nouveau téléphone laisse valable l’ancien code d’activation', 'da-equipe', [('c.tel = null; c.codeActivation = null; c.appareils = [];', 'c.tel = null; c.appareils = [];')]),
 (68, 'la fenêtre de 5 minutes ne s’éteint jamais', 'da-sensibles', [('return !!t && secuMaint() - t < SECU_REGLES.confirmationMs; };', 'return !!t; };')]),
 (69, 'la fenêtre se PROLONGE à chaque geste', 'da-sensibles', [('  const qui = secuQui(); if (secuFenetreValide(qui)) return true;', '  const qui = secuQui(); if (secuFenetreValide(qui)) { SECU.confirmeA[qui] = secuMaint(); return true; }')]),
 (70, 'un mauvais nombre accorde la confirmation', 'da-sensibles', [("  if (res === 'ok') { SECU.confirmeA[s.qui] = secuMaint(); const r = s.rejouer;", "  if (res === 'ok' || res === 'mauvais') { SECU.confirmeA[s.qui] = secuMaint(); const r = s.rejouer;")]),
 (71, 'S1 : la garde de « voir l’IBAN » est retirée', 'da-sensibles', [("  if (!secuGarde('banque-ouvrir', () => entPanBanque())) return;\n", '')]),
 (72, 'S2 : la garde d’« enregistrer l’IBAN » est retirée', 'da-sensibles', [("  if (!secuGarde('banque-enregistrer', () => entEnregistrerBanque())) return;\n", '')]),
 (73, 'S3 : la garde du virement groupé est retirée', 'da-sensibles', [("  if (!secuGarde('virement-ouvrir', () => acVirement())) return;\n", '')]),
 (74, 'S4 : la garde du fichier de virement est retirée', 'da-sensibles', [("  if (!secuGarde('virement-fichier', () => acVirok())) return;\n", '')]),
 (75, 'S7 : la garde des fiches de paie est retirée', 'da-sensibles', [("if (o === 'fiches' && !secuGarde('paie-fiches', () => paieAller(o))) return; ", '')]),
 (76, 'S8 : la garde de l’envoi au cabinet est retirée', 'da-sensibles', [("  if (!secuGarde('paie-envoi', () => paieEnvoyer())) return;\n", '')]),
 (77, 'S9 : la garde de l’écriture de paie est retirée', 'da-sensibles', [("  if (!secuGarde('paie-compta', () => paieComptabiliser())) return;\n", '')]),
 (78, 'S10 : la garde des cases de droits est retirée', 'da-sensibles', [("  if (t.matches('[data-eqt],[data-eqd],[data-eqs]') && !secuGardeCase(t)) { ev.stopImmediatePropagation(); return; }\n", '')]),
 (79, 'S11 : la garde de « reposer un mot de passe » est retirée', 'da-sensibles', [("  if (!secuGarde('equipe-inviter', () => secuReposer(k), { k, v:'repose' })) return false;\n", '')]),
 (80, 'S12 : la garde de « désactiver » est retirée', 'da-sensibles', [("  if (!secuGarde('equipe-retirer', () => eqxDepart(k), { k })) return;\n", '')]),
 (81, 'S13 : la garde de « Nouveau téléphone » est retirée', 'da-sensibles', [("  if (!secuGarde('equipe-telephone', () => secuNouveauTelephone(k, par), { k, v:'tel' })) return false;\n", '')]),
 (82, 'S14 : la garde de « Ouvrir l’application comme » est retirée', 'da-sensibles', [("  if (!secuGarde('voir-comme', () => secuVoirComme(k), {", "  if (false) secuGarde('voir-comme', () => secuVoirComme(k), {")]),
 (83, 'S5/S6 : le cadre de la Comptabilité n’attend plus la confirmation de la banque', 'da-sensibles', [('    if (OPC_SENS.visite) return r3.apply(this, arguments);\n    rendreMenu();', '    if (true) return r3.apply(this, arguments);\n    rendreMenu();', 'apercu/prototype-comptabilite.html')]),
 (84, 'l’IBAN est toujours en clair (le masque est retiré)', 'da-sensibles', [("if (!s) return ''; if (!secuMasqueActif()) return i; return s.slice(0, 2)", "if (!s) return ''; return i; return s.slice(0, 2)")]),
 (85, 'l’IBAN ne se re-masque pas à l’expiration', 'da-sensibles', [("function secuIbanSurveille(){ const f = document.getElementById('en-iban'); if (!f || !secuMasqueActif()) return;", "function secuIbanSurveille(){ return; const f = document.getElementById('en-iban'); if (!f || !secuMasqueActif()) return;")]),
 (86, 'le cadre accepte un message qui ne vient pas de lui (la source n’est plus vérifiée)', 'da-sensibles', [("addEventListener('message', ev => { const w = secuCadre(); if (!w || ev.source !== w) return; const d = ev.data, m = d && typeof d === 'object' ? d.opc_sensible : null;", "addEventListener('message', ev => { const w = secuCadre() || ev.source; if (!w) return; const d = ev.data, m = d && typeof d === 'object' ? d.opc_sensible : null;")]),
 (87, 'la Sécurité est visible sans la case (la route ne demande plus rien)', 'da-securite', [("securite:{ equipe:['@securite'] },", 'securite:{ equipe:[] },')]),
 (88, '« Oublier » laisse l’appareil reconnu', 'da-compte', [("if (a === 'oublier-ok') { const c = SECU.comptes[SESSION]; if (c) c.appareils = c.appareils.filter(o => o.id !== x);", "if (a === 'oublier-ok') { const c = SECU.comptes[SESSION];")]),
 (89, 'le vol de session n’est pas détecté (la session reste ouverte)', 'da-pirate', [("  secuFermerSessions(k, 'vol'); return true; }", '  return true; }')]),
 (90, 'un administrateur peut se déverrouiller lui-même', 'da-equipe', [("  if (k === (par || acteur())) { toast('Pour ton propre compte, demande à un autre administrateur.'); return false; }\n  if (!secuVerifCoche()) return false;\n  if (!secuGarde('equipe-telephone', () => secuDeverrouiller(k, par)", "  if (!secuVerifCoche()) return false;\n  if (!secuGarde('equipe-telephone', () => secuDeverrouiller(k, par)")]),
 (91, 'la case « J’ai vérifié l’identité en personne » est ignorée', 'da-equipe', [("  if (!secuVerifCoche()) return false;\n  if (!secuGarde('equipe-telephone', () => secuNouveauTelephone(k, par)", "  if (!secuGarde('equipe-telephone', () => secuNouveauTelephone(k, par)")]),
 (92, '« Annuler » l’invitation laisse le compte de sécurité', 'da-equipe', [('  Object.keys(SECU.comptes).forEach(k => { if (!EQUIPE.some(p => p.k === k)) { delete SECU.comptes[k]; delete SECU.ui[k]; } });', '')]),
 (93, 'un secret (le provisoire) est écrit dans une data-', 'da-equipe', [('<p class="sec-provmdp" data-sec="provisoire">', '<p class="sec-provmdp" data-sec="provisoire" data-x="${esc(c.prov || \'\')}">')]),
 (94, 'le texte à copier contient le mot de passe provisoire', 'da-equipe', [("'3. Ton mot de passe provisoire : je te le remets en main propre.', '4. Installe", "'3. Ton mot de passe provisoire : ' + (SECU.comptes[k].prov || SECU.comptes[k].demoClair || ''), '4. Installe")]),
]

def copier(n):
    racine = os.path.join(TMP, 'mut-%d' % n)
    shutil.rmtree(racine, ignore_errors=True); os.makedirs(racine)
    shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
    return racine

def muter(racine, edits):
    # chaque édition : (ancienne, nouvelle) sur la page principale, ou (ancienne, nouvelle, 'apercu/autre-page.html')
    fichiers = {}; touche = False
    for e in edits:
        ancien, nouveau = e[0], e[1]; rel = e[2] if len(e) > 2 else PAGE
        if rel not in fichiers: fichiers[rel] = open(os.path.join(racine, rel), encoding='utf-8').read()
        n = fichiers[rel].count(ancien)
        if n != 1: return None, 'le motif existe %d fois (il en faut exactement 1) dans %s : %s' % (n, rel, ancien[:70])
        fichiers[rel] = fichiers[rel].replace(ancien, nouveau, 1); touche = True
    if not touche: return None, 'rien n’a changé'
    for rel, s in fichiers.items(): open(os.path.join(racine, rel), 'w', encoding='utf-8').write(s)
    return True, None

def jouer(racine, sonde, delai=560):
    env = dict(os.environ, RACINE=racine)
    fichier = ('double-auth-%s.js' % sonde[3:]) if sonde.startswith('da-') else ('secu-%s.js' % sonde)
    proc = subprocess.Popen(['node', os.path.join(SONDES, fichier)], cwd=DEPOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
    t0 = time.time(); tombe = None; ok = 0
    try:
        for ligne in proc.stdout:
            if ligne.startswith('  ✓'): ok += 1
            if ligne.startswith('  ✗') or ligne.startswith('ERR') or ligne.startswith('SONDE MORTE'):
                tombe = ligne.strip()[:200]; break
            if time.time() - t0 > delai: tombe = 'DÉLAI'; break
    finally:
        try: os.killpg(proc.pid, signal.SIGTERM)
        except Exception: pass
        try: proc.wait(timeout=20)
        except Exception:
            try: os.killpg(proc.pid, signal.SIGKILL)
            except Exception: pass
    return tombe, ok, int(time.time() - t0)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--intact' in sys.argv:
        # contrôle d'avant-mutation : chaque sonde utilisée doit être verte sur la copie intacte
        for sonde in sorted(set(m[2] for m in M)):
            racine = copier(0); tombe, ok, d = jouer(racine, sonde, 900)
            print(('VERT   ' if not tombe else 'ROUGE  ') + 'sonde %s sur la copie intacte (%d ✓ avant arrêt, %d s) %s' % (sonde, ok, d, tombe or '')); sys.stdout.flush()
        sys.exit(0)
    choix = [m for m in M if not args or str(m[0]) in args]
    tombees = 0; manque = []
    for n, nom, sonde, edits in choix:
        racine = copier(n); s, err = muter(racine, edits)
        if err: print('ERREUR  M%d %s → %s' % (n, nom, err)); manque.append(n); sys.stdout.flush(); continue
        tombe, ok, d = jouer(racine, sonde)
        if tombe: tombees += 1; print('TOMBE   M%-3d %s → %s après %d ✓ (%d s) : %s' % (n, nom, sonde, ok, d, tombe))
        else: manque.append(n); print('RESTE VERT  M%-3d %s → %s ne voit rien (%d ✓, %d s)' % (n, nom, sonde, ok, d))
        sys.stdout.flush(); shutil.rmtree(racine, ignore_errors=True)
    print('\n== %d mutations jouées · %d tombent · %d à examiner %s' % (len(choix), tombees, len(manque), manque))
    sys.exit(1 if manque else 0)
