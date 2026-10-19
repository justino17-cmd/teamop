#!/usr/bin/env python3
"""Contre-épreuve du serveur de signature d'OP Courrier : remet un défaut à la fois, vérifie que le banc visé TOMBE, restaure par git checkout.
⛔ Lancer APRÈS `git commit` du correctif et du banc (CLAUDE.md : git checkout restaure depuis HEAD). Au premier plan, délai par exécution."""
import subprocess, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 'server-courrier/'
M = [
 ('auth: tout rôle passe', [(S+'auth.js', "roles.includes(j.role) ? {", "true ? {")], 1670),
 ('auth: OP GESTION muet = on laisse passer', [(S+'auth.js', "} catch (e) { stats.indisponible++; return { ok: false, statut: 503, code: 'verification_indisponible' }; }\n    let v;", "} catch (e) { return { ok: true, proprio: 'u:x', nom: '' }; }\n    let v;")], 1670),
 ('auth: forme du jeton non vérifiée avant l\'appel', [(S+'auth.js', "if (!m) { stats.refus++;", "if (false) { stats.refus++;"), (S+'auth.js', "const FORME = /^Bearer\\s+([a-f0-9]{48})$/;", "const FORME = /^Bearer\\s+([a-f0-9]*)$/;")], 1670),
 ('auth: compte sans identifiant accepté', [(S+'auth.js', "(j.id == null || String(j.id) === '') ||", "")], 1670),
 ('auth: cache positif de 10 minutes', [(S+'auth.js', "ttlOkMs = 60000", "ttlOkMs = 600000")], 1670),
 ('demandes: la demande d\'un autre est servie', [(S+'demandes.js', "if (!rec || rec.proprio !== proprio)", "if (!rec)")], 1670),
 ('webhook: HMAC non vérifié', [(S+'index.js', "if (obtenu.length !== attendu.length || !crypto.timingSafeEqual(obtenu, attendu))", "if (false)")], 1670),
 ('webhook: HMAC sur autre chose que le corps brut', [(S+'index.js', "createHmac('sha256', secretWebhook).update(corps)", "createHmac('sha256', secretWebhook).update(JSON.stringify(JSON.parse(corps.toString() || '{}')))")], 1670),
 ('webhook: pas d\'idempotence', [(S+'index.js', "if (!stockage.evenementNeuf(eid))", "if (false)")], 1670),
 ('webhook: événement non oublié après un échec', [(S+'index.js', "stockage.evenementOter(eid); journal('webhook_echec'", "journal('webhook_echec'")], 1670),
 ('webhook: accepté sans secret posé', [(S+'index.js', "if (!secretWebhook) return res.status(503)", "if (false) return res.status(503)")], 1670),
 ('pdf: octets non vérifiés', [(S+'demandes.js', "buf.subarray(0, 5).toString('latin1') === '%PDF-' &&", "")], 1670),
 ('pdf: fin de fichier non vérifiée', [(S+'demandes.js', " && buf.subarray(Math.max(0, buf.length - 4096)).includes('%%EOF')", "")], 1670),
 ('pdf: Content-Type non vérifié', [(S+'index.js', "if (!/^application\\/pdf(\\s*;|$)/i.test(String(req.headers['content-type'] || ''))) throw new Refus(415, 'type_pdf_requis');", "")], 1670),
 ('pdf: plafond de taille retiré', [(S+'demandes.js', "MAX_PDF = 25 * 1024 * 1024", "MAX_PDF = 250 * 1024 * 1024")], 1670),
 ('activation: échec non défait chez Yousign', [(S+'demandes.js', "try { await y.supprimerBrouillon(rec.ysId); }", "try { /* rien */ }")], 1670),
 ('activation: brouillon non remis après échec', [(S+'demandes.js', "rec.ysId = null; rec.etat = 'brouillon'; rec.signataires", "rec.ysId = null; rec.signataires")], 1670),
 ('niveau avancé envoyé en code e-mail', [(S+'yousign.js', "niveau === 'avance' ? 'otp_sms' : 'otp_email'", "'otp_email'")], 1670),
 ('mobile non normalisé', [(S+'demandes.js', "else if (/^0[1-9]\\d{8}$/.test(s)) e = '+33' + s.slice(1);", "else if (/^0[1-9]\\d{8}$/.test(s)) e = s;")], 1670),
 ('contre-signature placée en premier', [(S+'demandes.js', "if (contre) liste.push(contre);", "if (contre) liste.unshift(contre);")], 1670),
 ('zones sur la 1re page', [(S+'demandes.js', "page: doc.pages,", "page: 1,")], 1670),
 ('PDF écrit en clair', [(S+'stockage.js', "scelle.sceller(buf, 'pdf', id + ':' + genre)", "buf")], 1670),
 ('fiche écrite en clair', [(S+'stockage.js', "scelle.scellerJSON(rec, rec.id)", "Buffer.from(JSON.stringify(rec))"), (S+'stockage.js', "scelle.ouvrirJSON(Buffer.from(r.corps), id)", "JSON.parse(Buffer.from(r.corps).toString())")], 1670),
 ('journal: l\'adresse du signataire', [(S+'index.js', "'ms', 'raison', 'n']);", "'ms', 'raison', 'n', 'email']);"), (S+'demandes.js', "jr('activee', rec);", "jr('activee', rec, { email: rec.signataires[0].email });")], 1670),
 ('annuler n\'efface pas le PDF à signer', [(S+'demandes.js', "if (etat !== 'signe') stockage.piecesEffacer(rec.id, 'src');", "")], 1670),
 ('annuler: Yousign refuse mais on dit annulée', [(S+'demandes.js', "catch (e) { jr('annulation_echec', rec, { statut: e && e.statut || 0 }); throw new Refus(502, 'yousign_refuse', { etape: 'annuler', statut: e && e.statut || 0 }); }", "catch (e) { /* tant pis */ }")], 1670),
 ('relance sans délai mini', [(S+'demandes.js', "if (now - rec.derniereRelance < 10 * 60000) throw new Refus(429, 'relance_trop_proche');", "")], 1670),
 ('relance de tous les signataires malgré l\'ordre', [(S+'demandes.js', "rec.ordonne ? restants.slice(0, 1) : restants", "restants")], 1670),
 ('SMS: le poids n\'est plus compté', [(S+'demandes.js', "rec.niveau === 'avance' ? rec.signataires.length : 0", "0")], 1670),
 ('plafond de création retiré', [(S+'index.js', "api.post('/demandes', limiter('creation'), json,", "api.post('/demandes', json,")], 1670),
 ('jetons refusés sans plafond', [(S+'index.js', "if (!l.ok) return res.set('Retry-After', String(l.reessayerS)).status(429).json({ error: 'trop_de_requetes' });\n      }\n      return res.status(v.statut)", "}\n      return res.status(v.statut)")], 1670),
 ('X-Powered-By laissé', [(S+'index.js', "app.disable('x-powered-by');", "")], 1670),
 ('CORS ouvert à tous', [(S+'index.js', "if (o && config.origines.includes(o))", "if (o)")], 1670),
 ('signé: pièces jamais récupérées en différé', [(S+'demandes.js', "if (!rec.recupere) { try { await recuperer(rec); } catch (e) { throw new Refus(503, 'pieces_en_cours'); } }\n    const doc", "const doc")], 1670),
 ('dossier de preuve non téléchargé', [(S+'demandes.js', "for (const s of rec.signataires) {\n      const buf = await y.telechargerPreuve", "for (const s of []) {\n      const buf = await y.telechargerPreuve")], 1670),
 ('PDF signé jamais effacé (rétention ×100)', [(S+'config.js', "retentionJours: Number(brut.retentionJours) || 90", "retentionJours: Number(brut.retentionJours) || 9000")], 1670),
 ('brouillon jamais purgé', [(S+'config.js', "brouillonJours: Number(brut.brouillonJours) || 7", "brouillonJours: Number(brut.brouillonJours) || 7000")], 1670),
 ('garde de séparation retirée', [(S+'config.js', "if (i) throw new Error(nom + ' est sous '", "if (false) throw new Error(nom + ' est sous '")], 1670),
 ('lien symbolique pendant non suivi', [(S+'config.js', "if (profondeur < 8 && fs.lstatSync(r).isSymbolicLink())", "if (false)")], 1670),
 ('configuration lisible par tous acceptée', [(S+'config.js', "if (mode && !env.OPCOURRIER_BANC)", "if (false)")], 1670),
 ('http clair hors boucle locale accepté', [(S+'config.js', "if (x.protocol === 'http:' && boucleOk && boucleLocale(x.hostname)) return x.origin;", "if (x.protocol === 'http:') return x.origin;")], 1670),
 ('un scellé s\'ouvre sous un autre nom', [(S+'scelle.js', "c.setAAD(Buffer.from(String(contexte)));\n    const ct", "const ct"), (S+'scelle.js', "d.setAAD(Buffer.from(String(contexte)));\n    d.setAuthTag", "d.setAuthTag")], 1670),
 ('configurer: deux saisies différentes acceptées', [(S+'configurer-yousign.js', "if (!egal(a, b))", "if (false)")], 1671),
 ('configurer: la clé saisie est réécrite', [(S+'configurer-yousign.js', "'Clé API Yousign', !!c.yousign.cleApi);", "'Clé API Yousign', !!c.yousign.cleApi); console.log('clé: ' + cle);")], 1671),
 ('configurer: saisie non masquée', [(S+'configurer-yousign.js', "(saisie masquée' + (existant ? ', vide = inchangé' : '') + ') : ', true);", "(saisie masquée' + (existant ? ', vide = inchangé' : '') + ') : ', false);")], 1671),
 ('configurer: fichier laissé en 0644', [(S+'configurer-yousign.js', "{ mode: 0o600 });\n  try { fs.chownSync", "{ mode: 0o644 });\n  try { fs.chownSync")], 1671),
 ('installeur: clé maître régénérée sur des données', [(S+'install-courrier.sh', "elif [ -n \"$(ls -A \"$DONNEES\" 2>/dev/null)\" ]; then", "elif false; then")], 1671),
 ('installeur: nginx journalise les accès', [(S+'install-courrier.sh', "    access_log off;\n", "")], 1671),
 ('installeur: adresse client forgeable', [(S+'install-courrier.sh', "proxy_set_header X-Forwarded-For \\$remote_addr;", "proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;")], 1671),
 ('installeur: toute l\'API exposée', [(S+'install-courrier.sh', "    location / { return 404; }", "    location / { proxy_pass http://127.0.0.1:$PORT; }")], 1671),
 ('installeur: nginx.conf réécrit', [(S+'install-courrier.sh', 'SITE="/etc/nginx/sites-available/courrier-$INSTANCE"', 'SITE="/etc/nginx/nginx.conf"')], 1671),
 ('installeur: un site existant écrasé', [(S+'install-courrier.sh', 'SITE="/etc/nginx/sites-available/courrier-$INSTANCE"', 'SITE="/etc/nginx/sites-available/default"')], 1671),
 ('installeur: reload avant nginx -t', [(S+'install-courrier.sh', "if ! nginx -t >/dev/null 2>&1; then\n  echo \"✗ nginx refuse", "systemctl reload nginx\nif ! nginx -t >/dev/null 2>&1; then\n  echo \"✗ nginx refuse")], 1671),
 ('installeur: nginx -t refusé mais on continue', [(S+'install-courrier.sh', "nginx -t 2>&1 | head -5 || true\n  exit 1", "nginx -t 2>&1 | head -5 || true")], 1671),
 ('installeur: port d\'un autre service accepté', [(S+'install-courrier.sh', "8080|8090|8091|7880|7881|3478|5349|80|443|22)", "80|443|22)")], 1671),
 ('installeur: port occupé non vérifié', [(S+'install-courrier.sh', "ss -ltnH", "true ss -ltnH")], 1671),
 ('installeur: certbot renew global', [(S+'install-courrier.sh', "--keep-until-expiring >/dev/null 2>&1; then", "--keep-until-expiring >/dev/null 2>&1 || certbot renew; then")], 1671),
 ('installeur: apt upgrade', [(S+'install-courrier.sh', "echo \"── 1 bis.", "apt-get upgrade -y\necho \"── 1 bis.")], 1671),
 ('installeur: pare-feu ouvert', [(S+'install-courrier.sh', "echo \"── 1 bis.", "ufw allow 443\necho \"── 1 bis.")], 1671),
 ('workflow: part à chaque poussée', [('.github/workflows/deploiement-courrier.yml', "on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:")], 1671),
 ('workflow: plus d\'interrupteur', [('.github/workflows/deploiement-courrier.yml', "    if: ${{ vars.COURRIER_ACTIF == 'oui' }}\n", "")], 1671),
 ('workflow: le déploiement n\'attend plus les bancs', [('.github/workflows/deploiement-courrier.yml', "    needs: bancs\n", "")], 1671),
 ('séparation: le service lit server/', [(S+'index.js', "const { charger } = require('./config');", "const { charger } = require('./config'); const _x = require('../server/quotas');")], 1671),
 ('séparation: fetch ailleurs que dans yousign/auth', [(S+'limites.js', "function creerLimiteur(", "const _f = (u) => fetch(u);\nfunction creerLimiteur(")], 1671),
]
def lancer(n):
    try:
        p = subprocess.run(['node', 'tests/test-%d.js' % n], cwd=R, capture_output=True, text=True, timeout=120)
        return p.returncode, p.stdout
    except subprocess.TimeoutExpired:
        return 124, ''
tombe = 0; vivants = []
sel = sys.argv[1:] 
for nom, edits, banc in M:
    if sel and not any(x in nom for x in sel): continue
    ok = True
    for f, a, b in edits:
        t = open(os.path.join(R, f)).read()
        if t.count(a) != 1: print('✗ MAL VISÉE (%d occurrences) : %s [%s]' % (t.count(a), nom, a[:50])); ok = False; break
        open(os.path.join(R, f), 'w').write(t.replace(a, b, 1))
    if not ok:
        subprocess.run(['git', 'checkout', '--'] + sorted({e[0] for e in edits}), cwd=R); vivants.append(nom + ' (mal visée)'); continue
    d = subprocess.run(['git', 'diff', '--stat'], cwd=R, capture_output=True, text=True).stdout.strip()
    code, sortie = lancer(banc)
    subprocess.run(['git', 'checkout', '--'] + sorted({e[0] for e in edits}), cwd=R)
    ko = sortie.count('  ✗')
    if code != 0 or ko: tombe += 1; print('✓ tombe  (%2d ✗, code %s) %s' % (ko, code, nom))
    else: vivants.append(nom); print('✗ VIVANTE : %s' % nom)
print('\n%d mutations tombent, %d vivantes' % (tombe, len(vivants)))
for x in vivants: print('   vivante : ' + x)
st = subprocess.run(['git', 'status', '--short', '--', 'server-courrier', 'tests', '.github'], cwd=R, capture_output=True, text=True).stdout.strip()
print('git status après restauration :', st or 'propre')
