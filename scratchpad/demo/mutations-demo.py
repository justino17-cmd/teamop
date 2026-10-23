#!/usr/bin/env python3
"""Mutations de la démonstration publique : on REMET un défaut, on régénère demo.html, on rejoue tests/test-2940.js, on regarde tomber.
   ⛔ Méthode de la maison : correctif → banc → git commit → mutation → git checkout. Ce script refuse de partir si l'arbre n'est pas propre
   (sinon le `git checkout` de la première mutation emporte du travail non commité), restaure par `git checkout` après CHAQUE mutation,
   et vérifie que la mutation a bien touché le bon fichier (git diff non vide avant le banc). Chaque exécution a un délai."""
import subprocess, sys, re, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
def sh(args, timeout=240):
    return subprocess.run(args, cwd=R, capture_output=True, text=True, timeout=timeout)
if sh(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip():
    print('arbre non propre — commite d\'abord'); sys.exit(2)
PF, MOD, SCN, BLD = 'scripts/demo/pare-feu.js', 'scripts/demo/demo-publique.js', 'scripts/demo/scenarios.js', 'demo-build.js'
M = [
 ('M1  fetch laisse passer les adresses externes', PF, "if (local(url) && typeof fetchReel === 'function')", "if (typeof fetchReel === 'function')"),
 ('M2  sendBeacon répond vrai', PF, "note('sendBeacon', u); return false;", "return true;"),
 ('M3  le stockage ne préfixe plus', PF, "function prefixe(k) { k = String(k); return visible(k) ? k : 'elanD_x_' + k; }", "function prefixe(k) { return String(k); }"),
 ('M4  la vue du stockage montre tout', PF, "function visible(k) { return k.indexOf('elanD_') === 0 || k.indexOf('opD_') === 0; }", "function visible(k) { return true; }"),
 ('M5  window.open laisse passer l\'extérieur', PF, "if (u == null || u === '' || u === 'about:blank' || local(u) || memePage(u)) return ouvrirReel.apply(W, arguments);", "return ouvrirReel.apply(W, arguments);"),
 ('M6  le clic sur un lien externe n\'est plus arrêté', PF, "ev.preventDefault(); ev.stopPropagation();\n      note('lien', a.href);", "note('lien', a.href);"),
 ('M7  innerHTML n\'est plus nettoyé', PF, "note('html', url); return pre + 'data:,';", "return m;"),
 ('M8  les éléments créés ne sont plus gardés', PF, "set: function (v) { if (externe(v)) { note('élément', v); echecAsync(this); return; } d.set.call(this, v); } });", "set: function (v) { d.set.call(this, v); } });"),
 ('M9  la politique de contenu autorise api.teamop.fr', BLD, '"connect-src data: blob:",', '"connect-src data: blob: https://api.teamop.fr",'),
 ('M10 la politique de contenu autorise les images externes', BLD, '"img-src \'self\' data: blob:",', '"img-src \'self\' data: blob: https:",'),
 ('M11 BETA_ESSAI armé à vrai', BLD, "'const BETA_ESSAI=false;\\n/* Vrai uniquement", "'const BETA_ESSAI=true;\\n/* Vrai uniquement"),
 ('M12 le préfixe elan_ n\'est plus renommé', BLD, "s = s.split(\"'elan_\").join(\"'elanD_\");", ""),
 ('M13 un produit posé hors semis (cree ≠ 0)', MOD, "}, { semis: true });", "}, {});"),
 ('M14 un type d\'un autre métier chez le plombier', SCN, "types: ['Dépannage fuite', 'Chauffe-eau / ballon',", "types: ['Dératisation', 'Chauffe-eau / ballon',"),
 ('M15 un courriel réel chez un client', MOD, "'@exemple.invalid', adresse: c[2]", "'@gmail.com', adresse: c[2]"),
 ('M16 un client sans demo:1', MOD, "typeClient: c[1], demo: 1 };", "typeClient: c[1] };"),
 ('M17 « piscine » ouvert sans le site', MOD, "'eau', 'piscine'];", "'eau'];"),
 ('M18 srvMail n\'est plus coupé', MOD, "window.srvMail = function () {", "window.srvMailX = function () {"),
 ('M19 la sentinelle de la Tour démarre', PF, "W.localStorage.setItem('top_monitor_off', '1');", ""),
 ('M20 numéro de téléphone joignable', MOD, "return '01 99 00 ' + p(n) + ' ' + p(n * 7 + 3);", "return '01 23 45 ' + p(n) + ' ' + p(n * 7 + 3);"),
 ('M21 le semis double la base à la 2e passe', MOD, "COLLECTIONS_DONNEES.forEach(function (c) { db[c] = []; });", ""),
 ('M22 une catégorie hors liste du métier', MOD, "categorie: cats[p[1] % cats.length]", "categorie: 'TP14 — Rodenticide'"),
 ('M23 db.produits.push dans le semis', MOD, "produitCreer({ id: idProduit(p[0]),", "db.produits.push({ id: idProduit(p[0]),"),
 ('M24 la déconnexion rouvre l\'écran de connexion', MOD, "window.logout = function () { location.href = 'index.html'; };", ""),
 # ── la relecture du 23 octobre 2026 : chaque correctif, remis à l'envers ──
 ('M25 caches.keys() montre tous les caches de l\'origine', PF, "return ks.filter(miens); }); },", "return ks; }); },"),
 ('M26 caches.delete() efface un cache étranger', PF, "delete: function (n) { if (miens(n)) return cachesReel.delete(n);", "delete: function (n) { if (true) return cachesReel.delete(n);"),
 ('M27 forceUpdate vide les caches de l\'origine', BLD, "if(DEMO_PUBLIQUE){ location.reload(); return; }", "if(false){ location.reload(); return; }"),
 ('M28 la dictée vocale revient', PF, "['SpeechRecognition', 'webkitSpeechRecognition'].forEach(", "[].forEach("),
 ('M29 la vue du stockage n\'est plus relue', PF, "pose = W[nom] === vue;", "pose = true;"),
 ('M30 top_monitor_off écrit même sans vue', PF, "if (lsPose) { try {", "if (true) { try {"),
 ('M31 le démarrage ignore stockageIsole', MOD, "window.__demoPublique.stockageIsole === false) {", "false) {"),
 ('M32 ?metier= remplace sans demander', MOD, "db.demoPublique.metier === deja && !confirm(", "db.demoPublique.metier === deja && false && !confirm("),
 ('M33 une fonction async coupée rend undefined', MOD, "f.constructor.name === 'AsyncFunction')", "f.constructor.name === 'Zzz')"),
 ('M34 syncReactivate n\'est plus coupée', MOD, "'syncPush', 'syncReactivate', ", "'syncPush', "),
 ('M35 sms: n\'est plus détourné', BLD, "\"demoNav.href='sms:'+\", 4", "\"location.href='sms:'+\", 4"),
 ('M36 mailto: (window.location) n\'est plus détourné', BLD, "'demoNav.href=`mailto:${mail}?subject=', 2", "'window.location.href=`mailto:${mail}?subject=', 2"),
 ('M37 demoNav laisse la page naviguer', MOD, "set href(u) {", "set href(u) { location.href = u;"),
 ('M38 Devis IA rappelle le serveur', BLD, "if(DEMO_PUBLIQUE){ show(demoPubliqueDevisIAMessage()); return; }", ""),
 ('M39 l\'assistant devis redemande un code', BLD, "if(DEMO_PUBLIQUE){ demoPubliqueAssistantDevis(); return; }", ""),
 ('M40 la carte Synchronisation reste dans Paramètres', MOD, "'Synchronisation de l\\'équipe', ", ""),
 ('M41 Paramètres n\'est plus retouché', MOD, "  demoPubliqueParametresPoser();\n}", "}"),
 ('M42 la carte Forfait n\'est plus réécrite', MOD, "if (t === DEMO_PARAM_FORFAIT) {", "if (false) {"),
 ('M43 le bandeau ne dit plus ce qui manque', MOD, "Toutes les rubriques sont ouvertes ; l’IA, la synchro", "Toutes les rubriques ; l’IA, la synchro"),
 ('M44 stockageIsole toujours vrai', PF, "W.__demoPublique.stockageIsole = lsPose && ssPose;", "W.__demoPublique.stockageIsole = true;"),
 ('M45 les fenêtres vides perdent leur filet (form-action)', BLD, '"form-action \'none\''+'"', '"form-action *"'),
]
SEULES = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
if SEULES: M = [m for m in M if m[0].split()[0] in SEULES]
res = []
for nom, f, a, b in M:
    src = open(os.path.join(R, f), encoding='utf-8').read()
    if a not in src:
        res.append((nom, 'MOTIF INTROUVABLE (mutation mal visée)', 0)); continue
    open(os.path.join(R, f), 'w', encoding='utf-8').write(src.replace(a, b, 1))
    d = sh(['git', 'diff', '--stat', '--', f]).stdout.strip()
    r0 = sh(['node', 'demo-build.js'])
    build = 'build ÉCHOUE' if r0.returncode else 'build ok'
    r = sh(['node', 'tests/test-2940.js'])
    m = re.findall(r'(\d+) ✓\s+(\d+) ✗', r.stdout)
    ko = int(m[-1][1]) if m else -1
    res.append((nom, build + ' · ' + ('banc : ' + str(ko) + ' ✗' if m else 'banc mort (code %d)' % r.returncode) + ' · diff ' + ('oui' if d else 'VIDE'), ko if m else 99))
    sh(['git', 'checkout', '--', f, 'demo.html'])
for n, t, k in res: print(('✓ ' if k else '✗ ') + n + ' → ' + t)
print('tombées :', sum(1 for _, _, k in res if k), '/', len(res))
if sh(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip(): print('⚠ arbre non propre après le lot')
