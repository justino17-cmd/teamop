#!/usr/bin/env python3
"""Contre-épreuves de la SIGNATURE MAISON (moteur interne). Règle du dépôt : correctif -> banc -> COMMIT -> mutation -> git checkout (git diff VIDE avant de lancer).
Chaque mutation remet UN défaut dans le code et exige qu'un banc tombe ; une mutation qui ne casse rien n'est pas une preuve (vérifier d'abord qu'elle a touché le bon endroit :
chaque motif doit se trouver UNE fois, sinon le script s'arrête). Lancer, au premier plan ou en tâche de fond, avec un délai par exécution :
    python3 scratchpad/courrier/mutations-signature-maison.py          (FILTRE='^M[0-9]' pour une partie)"""
import subprocess, sys, os, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(R)
if subprocess.run(['git', 'diff', '--quiet'], capture_output=True).returncode:
    sys.exit('git diff non vide : committer avant de muter')
E = 'server-courrier/moteur-interne.js'; D = 'server-courrier/demandes.js'; SG = 'server-courrier/signataire.js'; C = 'server-courrier/config.js'; CA = 'server-courrier/canaux.js'
ST = 'server-courrier/stockage.js'; JS = 'server-courrier/public/signer.js'; CF = 'server-courrier/configurer-signature.js'; CT = 'server-courrier/certificat.js'
T0, T1, T2 = 'tests/test-2800.js', 'tests/test-2801.js', 'tests/test-2802.js'
MUTS = [
 # ── le code à usage unique
 ('M01 plus de délai de 60 s entre deux codes', E, 'if (s.otp && now - s.otp.dernier < DELAI_RENVOI_MS)', 'if (false)', T0),
 ('M02 envois de code illimités', E, 'if (s.envois >= ENVOIS_MAX)', 'if (false)', T0),
 ('M03 essais illimités', E, "if (s.otp.essais >= ESSAIS_MAX) throw new Refus(429, 'code_bloque');\n    const code", "const code", T0),
 ('M04 un code n\'expire jamais', E, 'if (now > s.otp.exp)', 'if (false)', T0),
 ('M05 le consentement n\'est pas exigé', E, "if (b.consentement !== true) throw", "if (false) throw", T0),
 ('M06 la version du consentement n\'est pas vérifiée', E, "if (b.version !== VERSION_CONSENTEMENT) throw", "if (false) throw", T0),
 ('M07 n\'importe quel code de 6 chiffres signe', E, "attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)", "false", T0),
 ('M08 un code mal formé ne compte pas comme un essai', E, "if (!/^\\d{6}$/.test(code) || attendu.length", "if (attendu.length", T0),
 ('M09 un code déjà utilisé reste valable (l\'otp n\'est pas effacé)', E, "garder(ev);\n    try { await evenement(ev, 'signer.signed'", "s.otp = { h: hmacCode(ev, s.n, code), exp: now + CODE_VALIDE_MS, essais: 0, dernier: now }; ev.signataires.find((x) => x.n === s.n).signe = null; garder(ev);\n    try { await evenement(ev, 'signer.signed'", T0),
 ('M10 le code est gardé EN CLAIR', E, "s.otp = { h: hmacCode(ev, s.n, code), exp: now + CODE_VALIDE_MS, essais: 0, dernier: now }; s.envois++;", "s.otp = { h: hmacCode(ev, s.n, code), code, exp: now + CODE_VALIDE_MS, essais: 0, dernier: now }; s.envois++;", T0),
 # ── le lien
 ('M11 l\'ancien lien survit à « relancer »', E, "stockage.jetonEffacer(id, n);\n      const jeton = jetonNeuf();", "const jeton = jetonNeuf();", T0),
 ('M12 annuler ne tue pas les liens', E, "stockage.jetonsEffacer(id); return {};", "return {};", T0),
 ('M13 le lien est gardé EN CLAIR dans l\'état', E, "jetonH: h, vu: false", "jetonH: h, lien: jeton, vu: false", T0),
 ('M14 l\'ordre de contre-signature est ignoré', E, "if (contre && !autres.every((x) => x.signe)) return 'attente_autres';", "", T0),
 ('M15 l\'échéance ne ferme pas le lien', E, "(rec.echeance && horloge() > rec.echeance && !TERMINAUX.has(rec.etat) && !s.signe)", "false", T0),
 ('M16 une demande annulée reste signable', E, "if (rec.etat === 'annule') return 'annulee';", "", T0),
 ('M17 un lien inconnu répond autre chose qu\'« introuvable » (403)', SG, "const introuvable = (res) => res.status(404).json({ error: 'introuvable' });", "const introuvable = (res) => res.status(403).json({ error: 'introuvable' });", T0),
 ('M18 plus de plafond sur les lectures publiques', SG, "api.get('/:lien', lien, plafond('lecture'), ", "api.get('/:lien', lien, ", T0),
 ('M19 effacer une demande oublie ses liens', ST, "supprimer(id) { sain(id, ID); this.piecesEffacer(id); q.jetonsTous.run(id); q.supprimer.run(id); },", "supprimer(id) { sain(id, ID); this.piecesEffacer(id); q.supprimer.run(id); },", T0),
 ('M20 le ménage n\'expire plus les demandes échues', D, "if (rec && rec.echeance && now > rec.echeance && rec.ysId) {", "if (false) {", T0),
 # ── la preuve
 ('M21 le « document signé » est modifié', E, "if (!b) throw new ErreurMoteur('signe', 404);\n      return b;", "if (!b) throw new ErreurMoteur('signe', 404);\n      return Buffer.concat([b, Buffer.from('\\n% signé\\n')]);", T0),
 ('M22 le certificat n\'a plus l\'empreinte du document', CT, "b.push({ t: 'p', texte: 'Empreinte SHA-256 :' }, { t: 'mono', texte: x.sha256, indent: 10 });", "b.push({ t: 'p', texte: 'Empreinte SHA-256 :' });", T0),
 ('M23 le journal altéré n\'est pas détecté', E, "journal: ev.journal, chaine: chaine.verifier(ev.journal), focus,", "journal: ev.journal, chaine: { ok: true, derniere: '' }, focus,", T0),
 ('M24 la chaîne ne dépend plus de la ligne précédente', 'server-courrier/chaine.js', "e.prev = prev; e.h = sha(prev + '|' + canon(e));", "e.prev = prev; e.h = sha('|' + canon(e));", T0),
 ('M25 l\'adresse du signataire n\'est plus masquée', E, "const masqueMail = (e) => { const i = String(e).indexOf('@'); return i < 1 ? '***' : e.slice(0, 1) + '***' + e.slice(i); };", "const masqueMail = (e) => e;", T0),
 ('M26 le journal d\'exploitation reçoit l\'adresse', E, "journal('code_echec', { id: ev.id, raison: s.canal });", "journal('code_echec', { id: ev.id, raison: s.email });", T0),
 ('M27 le certificat affirme une signature « avancée »', CT, "Elle n\\'est ni une signature avancée ni une signature qualifiée au sens du règlement européen eIDAS", "Elle est une signature avancée au sens du règlement européen eIDAS", T0),
 # ── la création et le réglage
 ('M28 « Code SMS » n\'est plus refusé sans fournisseur', D, "if (yousign && typeof yousign.canalDisponible === 'function' && !yousign.canalDisponible(niveau)) throw", "if (false) throw", T0),
 ('M29 le moteur interne est ALLUMÉ par défaut', C, "moteur: sg.moteur === 'interne' ? 'interne' : 'yousign',", "moteur: 'interne',", T1),
 ('M30 la politique de sécurité de la page perd frame-ancestors', SG, "; frame-ancestors 'none'\";", "\";", T1),
 ('M31 la politique de sécurité admet les scripts en ligne', SG, "script-src 'self';", "script-src 'self' 'unsafe-inline';", T1),
 ('M32 la page insère du HTML venu du serveur', JS, "if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k];", "if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.innerHTML = attrs[k];", T1),
 ('M33 le courriel du code n\'a plus le code dans l\'objet', CA, "subject: 'Votre code de signature : ' + code,", "subject: 'Votre code de signature',", T1),
 ('M34 la page appelle une adresse tierce', JS, "return fetch('/api/signer/' + jeton + chemin,", "return fetch('https://exemple.test/api/signer/' + jeton + chemin,", T1),
 ('M35 le mot de passe SMTP s\'affiche (saisie non masquée)', CF, "const a = await demander('  Mot de passe SMTP (saisie masquée' + (sm && sm.pass ? ', vide = inchangé' : '') + ') : ', true);", "const a = await demander('  Mot de passe SMTP (saisie masquée' + (sm && sm.pass ? ', vide = inchangé' : '') + ') : ', false);", T2),
 ('M36 l\'identifiant SMTP s\'affiche', CF, "(sm && sm.user ? ', vide = inchangé' : '') + ') : ', true);", "(sm && sm.user ? ', vide = inchangé' : '') + ') : ', false);", T2),
 ('M37 « allumer » sans rien de posé', CF, "if (!sg.urlPublique) { console.error('✗ pose d\\'abord l\\'adresse publique des liens (action « poser »).'); process.exit(1); }", "", T2),
 ('M38 poser ALLUME la signature', CF, "sg.smtp = n; ecrireConfig(c);", "sg.smtp = n; sg.moteur = 'interne'; ecrireConfig(c);", T2),
 ('M39 deux saisies différentes écrivent quand même', CF, "if (!egal(a, b)) { console.error('✗ Les deux saisies diffèrent. Rien n\\'a été modifié.'); process.exit(1); } pass = a;", "pass = a;", T2),
]
filtre = os.environ.get('FILTRE')
restent = 0; n = 0
for nom, f, ancien, nouveau, banc in MUTS:
    if filtre and not re.search(filtre, nom): continue
    n += 1
    t = open(f, encoding='utf8').read()
    if t.count(ancien) != 1:
        print('ANCRE  %s : le motif se trouve %d fois (attendu 1) dans %s' % (nom, t.count(ancien), f)); restent += 1; continue
    open(f, 'w', encoding='utf8').write(t.replace(ancien, nouveau))
    try:
        r = subprocess.run(['node', banc], capture_output=True, text=True, timeout=120)
        sortie = r.stdout + r.stderr
        tombe = r.returncode != 0 or '✗' in r.stdout
        print(('MORD  ' if tombe else 'VERT  ') + nom + '  [' + str(r.stdout.count('✗')) + ' ✗]')
        if not tombe: restent += 1
    except subprocess.TimeoutExpired:
        print('MORD  ' + nom + '  [délai dépassé : le banc se fige — compte comme tombé]')
    finally:
        subprocess.run(['git', 'checkout', f], check=True, capture_output=True)
print('RESTE %d mutation(s) qui ne mordent pas sur %d' % (restent, n))
if subprocess.run(['git', 'diff', '--quiet'], capture_output=True).returncode: print('⚠ git diff non vide après les mutations')
