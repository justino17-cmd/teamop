#!/usr/bin/env python3
"""Contre-épreuve des bancs 930 à 934 : REMET chaque défaut qu'ils gardent, sur une COPIE, et exige que le banc tombe.

⛔ Règle du dépôt (CLAUDE.md) : « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER ». Et deux garde-fous
sur la méthode, qui ont coûté cher :
  · on ne mute JAMAIS l'arbre de travail : tout se passe dans une copie (le `git checkout` d'une mutation efface un correctif
    non commité) ;
  · on vérifie que la mutation a TOUCHÉ le bon endroit — le remplacement doit se produire EXACTEMENT le nombre de fois
    attendu, et on imprime le nombre de lignes qui diffèrent. Une mutation qui ne casse rien peut être une mutation mal visée.
Une ligne « tombe » quand le banc visé sort en code ≠ 0 ou imprime au moins un ✗ ; le nombre de ✗ est affiché (une
mutation qui fait tomber des contrôles SANS RAPPORT avec elle est le signe d'une copie abîmée, pas d'un banc qui mord).

Usage : python3 scratchpad/mutations-deploiement-messages.py [déployeur|installation|workflow|autres|tout]
"""
import os, re, shutil, subprocess, sys, tempfile, time

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A_COPIER = ['tests/bac-messages.js', 'tests/test-728.js', 'tests/test-930.js', 'tests/test-931.js', 'tests/test-932.js',
            'tests/test-933.js', 'tests/test-934.js', 'server-msg', 'scripts', '.github', 'design/opmessages', '.gitignore']


def copie():
    d = tempfile.mkdtemp(prefix='mut-opmsg-')
    for rel in A_COPIER:
        src, dst = os.path.join(RACINE, rel), os.path.join(d, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns('node_modules'))
        else:
            shutil.copy2(src, dst)
    return d


def lancer(d, banc):
    t0 = time.time()
    try:
        r = subprocess.run(['node', 'tests/' + banc], cwd=d, capture_output=True, text=True, timeout=240)
        sortie, rc = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return 'délai', 1, time.time() - t0
    m = re.findall(r'(\d+) ✓ +(\d+) ✗', sortie)
    ko = int(m[-1][1]) if m else -1
    return rc, ko, time.time() - t0


# (nom, fichier, [(ancien, nouveau, nombre attendu)], bancs qui doivent tomber)
M = {}


def mut(groupe, nom, fichier, remplacements, bancs):
    M.setdefault(groupe, []).append((nom, fichier, remplacements, bancs))


D, I, W = 'server-msg/deployer.sh', 'server-msg/install-msg.sh', '.github/workflows/deploiement-messages.yml'

# ── Le déployeur (banc 932, et 930 pour ce qui se lit) ───────────────────────────────────────────────
mut('déployeur', 'D1  /health : on ne compare plus le sha (ok:true seul)', D,
    [('typeof j.sha === "string" && j.sha.length >= 7 && process.argv[1].startsWith(j.sha)', 'true', 1)], ['test-932.js'])
mut('déployeur', 'D2  plus de retour arrière (on tombe sur « première installation »)', D,
    [('  elif [ -n "$PRECEDENT" ]; then', '  elif false; then', 1)], ['test-932.js'])
mut('déployeur', 'D3  npm ci sous root (plus de runuser -u opmsg)', D,
    [('runuser -u opmsg -- env HOME=', 'env HOME=', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D4  npm ci SANS --ignore-scripts', D,
    [(' --omit=dev --ignore-scripts --no-audit', ' --omit=dev --no-audit', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D5  l\'instance n\'est plus validée (^(beta|prod)$ → ^.*$)', D,
    [('[[ "$CIBLE" =~ ^(beta|prod)$ ]]', '[[ "$CIBLE" =~ ^.*$ ]]', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D6  plus de verrou (flock)', D,
    [('flock -w 600 9 || { echo "✗ un autre déploiement d\'OP MESSAGES dure depuis plus de 10 minutes"; exit 1; }', 'true', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D7  un commit hors de main est accepté (le contrôle compare le sha à lui-même)', D,
    [('merge-base --is-ancestor "$SHA" refs/heads/main \\', 'merge-base --is-ancestor "$SHA" "$SHA" \\', 1)], ['test-932.js'])
mut('déployeur', 'D8  sous ssh, le préfixe de chemin du bac n\'est plus ignoré', D,
    [('  R=""\n  [ "$#" -eq 0 ]', '  :\n  [ "$#" -eq 0 ]', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D9  un sha plus ancien que celui en service est déployé (recul silencieux)', D,
    [('&& git_miroir merge-base --is-ancestor "$SHA" "$ACTUEL"; then', '&& false; then', 1)], ['test-932.js'])
mut('déployeur', 'D10 jamais de ménage des vieilles releases', D,
    [('tail -n +5', 'tail -n +500', 1)], ['test-932.js'])
mut('déployeur', 'D11 un service qui n\'a pas redémarré est jugé bon (restart retiré)', D,
    [('if systemctl restart "$UNITE" && verifier "$SHA"; then OK=1; fi', 'if verifier "$SHA"; then OK=1; fi', 1)], ['test-932.js', 'test-930.js'])
mut('déployeur', 'D12 « non installé » sort en 1', D,
    [('rien n\'a été déployé"\n  exit 0', 'rien n\'a été déployé"\n  exit 1', 1)], ['test-932.js', 'test-930.js'])

# ── L'installation (banc 931, et 930) ───────────────────────────────────────────────────────────────────
mut('installation', 'I1  la clé est GÉNÉRÉE ici quand rien n\'est saisi', I,
    [('  if [ -z "$K1" ]; then\n    echo "  ⛔ Aucune clé saisie. On ne la génère pas ici : elle s\'afficherait sur ce VPS."', '  if [ -z "$K1" ]; then poser_cle; fi\n  if [ -z "$K1" ]; then\n    echo "  ⛔ Aucune clé saisie. On ne la génère pas ici : elle s\'afficherait sur ce VPS."', 1)], ['test-931.js'])
mut('installation', 'I2  la sortie de la pose de clé n\'est plus masquée', I,
    [('2>&1 | masquer; then', '2>&1; then', 1)], ['test-931.js', 'test-930.js'])
mut('installation', 'I3  l\'unité porte LoadCredential (avant la clé)', I,
    [('UMask=0077\n\nNoNewPrivileges=true', 'UMask=0077\nLoadCredential=kek:/etc/opmsg/%i.kek\n\nNoNewPrivileges=true', 1)], ['test-931.js'])
mut('installation', 'I4  nginx rechargé AVANT d\'être validé', I,
    [('    if ! nginx -t >/dev/null 2>&1; then', '    systemctl reload nginx\n    if ! nginx -t >/dev/null 2>&1; then', 1)], ['test-931.js', 'test-930.js'])
mut('installation', 'I5  X-Forwarded-For complété au lieu d\'être écrasé', I,
    [('proxy_set_header X-Forwarded-For \\$remote_addr;', 'proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;', 2)], ['test-931.js'])
mut('installation', 'I6  le flux SSE est retenu en tampon', I,
    [('        proxy_buffering off;\n        proxy_cache off;', '        proxy_buffering on;\n        proxy_cache off;', 1)], ['test-931.js'])
mut('installation', 'I7  clé SSH de la CI sans « restrict »', I,
    [('LIGNE="restrict,command=', 'LIGNE="command=', 1)], ['test-931.js', 'test-930.js'])
mut('installation', 'I8  la production s\'installe sans la phrase de Justin', I,
    [('[ "${OPMSG_PUBLIE:-}" != "oui" ]', '[ "${OPMSG_PUBLIE:-}" != "oui-ou-non" ] && false', 1)], ['test-931.js', 'test-930.js'])
mut('installation', 'I9  l\'installation relance teamop-api (OP GESTION)', I,
    [('systemctl enable "$UNITE" >/dev/null 2>&1 || true', 'systemctl enable "$UNITE" >/dev/null 2>&1 || true\nsystemctl restart teamop-api', 1)], ['test-931.js', 'test-930.js'])
mut('installation', 'I10 la configuration est réécrite à chaque passage (nouvelle paire VAPID)', I,
    [('if [ ! -f "$CONFIG" ]; then', 'if true; then', 1)], ['test-931.js'])
mut('installation', 'I11 le fichier de proxy d\'OP MESSAGES écrase celui d\'api.teamop.fr', I,
    [('CIBLE_NGX="$NGX/sites-available/opmsg-$INSTANCE.conf"', 'CIBLE_NGX="$NGX/sites-available/api.teamop.fr"', 1)], ['test-931.js'])
mut('installation', 'I12 la clé privée VAPID n\'est plus complétée à 32 octets', I,
    [('const priv32 = Buffer.concat([Buffer.alloc(32 - priv.length), priv]);', 'const priv32 = priv;', 1)], ['test-931.js'])
mut('installation', 'I13 le script écrit lui-même la clé dans /etc/opmsg', I,
    [('[ -s "$KEK" ] || { echo "✗ la clé n\'est pas là après poser-cle.js', 'printf "%s" "$K1" > "$KEK"\n[ -s "$KEK" ] || { echo "✗ la clé n\'est pas là après poser-cle.js', 1)], ['test-930.js'])
mut('installation', 'I14 un échec de nginx -t ne retire pas le fichier d\'OP MESSAGES', I,
    [('      if [ -n "$sauve" ]; then mv "$sauve" "$CIBLE_NGX"; else rm -f "$CIBLE_NGX"; [ -z "$LIEN_NGX" ] || rm -f "$LIEN_NGX"; fi', '      :', 1)], ['test-931.js'])
mut('installation', 'I15 la clé SSH publique n\'est plus validée (une privée passerait)', I,
    [('  [[ "$PUB" =~ $RE_PUB ]] \\\n    || {', '  true \\\n    || {', 1)], ['test-931.js'])

# ── Le workflow, la liste, la préparation ───────────────────────────────────────────────────────────────
mut('workflow', 'W1  la bêta ne dépend plus des bancs (needs retiré)', W,
    [('    needs: bancs\n    if: github.event_name == \'push\' || inputs.cible == \'beta\'', '    if: github.event_name == \'push\' || inputs.cible == \'beta\'', 1)], ['test-933.js'])
mut('workflow', 'W2  la production part aussi d\'une poussée', W,
    [('if: github.event_name == \'workflow_dispatch\' && inputs.cible == \'prod\'', 'if: github.event_name == \'push\' || inputs.cible == \'prod\'', 1)], ['test-933.js'])
mut('workflow', 'W3  la production sans environnement msg-prod', W,
    [('    environment: msg-prod\n', '', 1)], ['test-933.js'])
mut('workflow', 'W4  autre groupe de concurrence que celui d\'OP GESTION', W,
    [('group: deploiement-vps', 'group: deploiement-msg', 2)], ['test-933.js'])
mut('workflow', 'W5  la clé SSH interpolée dans le script', W,
    [('          printf \'%s\\n\' "$CLE_SSH" > ~/.ssh/id_msg\n          chmod 600 ~/.ssh/id_msg\n          # La clé d\'hôte', '          printf \'%s\\n\' "${{ secrets.VPS_SSH_KEY_MSG }}" > ~/.ssh/id_msg\n          chmod 600 ~/.ssh/id_msg\n          # La clé d\'hôte', 1)], ['test-933.js'])
mut('workflow', 'W6  le filtre de chemins attrape aussi server/**', W,
    [("paths: ['server-msg/**',", "paths: ['server/**', 'server-msg/**',", 1)], ['test-933.js'])
mut('workflow', 'W7  la bêta demande « prod » au VPS', W,
    [('"beta $SHA $RETOUR"', '"prod $SHA $RETOUR"', 1)], ['test-933.js'])
mut('workflow', 'W8  la production accepte « non installé » comme un succès', W,
    [('            echo "::error::la production d\'OP MESSAGES n\'est pas installée sur le VPS : rien n\'a été déployé."\n            exit 1', '            echo "::warning::la production d\'OP MESSAGES n\'est pas installée sur le VPS : rien n\'a été déployé."', 1)], ['test-933.js'])
mut('workflow', 'W9  les bancs ne passent plus par le plancher de la liste', W,
    [('run: BANCS_PLANCHER=$(sed -n \'s/^#plancher //p\' scripts/bancs-messages.liste) bash scripts/bancs-ci.sh $(grep', 'run: bash scripts/bancs-ci.sh $(grep', 1)], ['test-933.js'])
mut('workflow', 'W10 un journalctl dans les journaux de CI', W,
    [('          # ⛔ PAS DE journalctl ICI : le dépôt est PUBLIC', '          journalctl -u teamop-msg@beta -n 20\n          # ⛔ PAS DE journalctl ICI : le dépôt est PUBLIC', 1)], ['test-933.js'])
mut('workflow', 'W11 une apostrophe dans le mot d\'un ${var:?mot}', W,
    [('SHA="${SHA_VOULU:?SHA non transmis}"', 'SHA="${SHA_VOULU:?le SHA n\'a pas été transmis}"', 2)], ['test-933.js'])
mut('workflow', 'W12 le troisième workflow n\'est plus connu de test-728 (liste revenue à deux)', 'tests/test-728.js',
    [("['ci.yml', 'deploiement-messages.yml', 'deploiement.yml']", "['ci.yml', 'deploiement.yml']", 1)], ['test-933.js'])

mut('autres', 'L1  la liste perd son plancher', 'scripts/bancs-messages.liste',
    [('#plancher 400\n', '', 1)], ['test-933.js'])
mut('autres', 'L2  la liste nomme une suite qui n\'existe pas', 'scripts/bancs-messages.liste',
    [('tests/test-934.js\n', 'tests/test-934.js\ntests/test-999.js\n', 1)], ['test-933.js'])
mut('autres', 'P1  la préparation de main n\'emporte plus server-msg/', 'scripts/preparer-deploiement-serveur.sh',
    [('OPMSG_FICHIERS=(server-msg .github', 'OPMSG_FICHIERS=(.github', 1)], ['test-933.js'])
mut('autres', 'P2  la préparation ne lance plus la porte d\'OP MESSAGES', 'scripts/preparer-deploiement-serveur.sh',
    [('bash scripts/bancs-ci.sh "${SUITES_MSG[@]}"', 'true "${SUITES_MSG[@]}"', 1)], ['test-933.js'])
mut('autres', 'S1  la surveillance ne lit plus sauvegarde.ageH', '.github/scripts/surveillance-messages.js',
    [('j.sauvegarde.ageH', 'j.sauvegarde.age', 3)], ['test-934.js'])
mut('autres', 'S2  la surveillance ne compare plus l\'instance', '.github/scripts/surveillance-messages.js',
    [("if (instanceAttendue && j.instance !== instanceAttendue) {", "if (false) {", 1)], ['test-934.js'])
mut('autres', 'S3  un champ « vu » parle d\'un champ qui n\'existe pas', '.github/scripts/surveillance-messages.js',
    [("'sauvegarde.essaiJours':", "'sauvegarde.disparu':", 1)], ['test-934.js'])
mut('autres', 'S4  stripeEchecMin n\'est plus surveillé (seuil jamais atteint)', '.github/scripts/surveillance-messages.js',
    [('j.stripeEchecMin > SEUIL_STRIPE_MIN', 'false', 1)], ['test-934.js'])
mut('autres', 'G1  le mode d\'emploi génère la clé sans presse-papiers (elle s\'afficherait)', 'design/opmessages/INSTALLER-LE-SERVEUR.md',
    [('openssl rand -hex 32 | pbcopy', 'openssl rand -hex 32', 1)], ['test-930.js'])
mut('autres', 'G2  le mode d\'emploi fait afficher la configuration (clé VAPID privée)', 'design/opmessages/INSTALLER-LE-SERVEUR.md',
    [('systemctl status teamop-msg@beta --no-pager | head -5', 'cat /etc/opmsg/beta.json', 1)], ['test-930.js'])
mut('autres', 'G3  le mode d\'emploi relit la clé en l\'affichant (cat nu)', 'design/opmessages/INSTALLER-LE-SERVEUR.md',
    [('V=$(cat /etc/opmsg/beta.kek);', 'cat /etc/opmsg/beta.kek; V=$(cat /etc/opmsg/beta.kek);', 1)], ['test-930.js'])
mut('autres', 'G4  .gitignore ne retient plus server-msg/node_modules', '.gitignore',
    [('server-msg/node_modules\n', '', 1)], ['test-930.js', 'test-933.js'])


def main():
    groupe = sys.argv[1] if len(sys.argv) > 1 else 'tout'
    groupes = list(M) if groupe == 'tout' else [groupe]
    # Témoin : la copie intacte passe (sinon toute « chute » ne prouve rien).
    d = copie()
    bancs_tous = sorted({b for g in groupes for (_, _, _, bs) in M[g] for b in bs})
    for b in bancs_tous:
        rc, ko, t = lancer(d, b)
        print('  témoin %-12s rc=%s ✗=%s (%.0f s)' % (b, rc, ko, t))
        if rc != 0 or ko != 0:
            print('  ⛔ le témoin tombe déjà : la copie est abîmée, rien de ce qui suit ne vaut'); shutil.rmtree(d); sys.exit(2)
    shutil.rmtree(d)
    tombent = total = 0
    for g in groupes:
        for nom, fichier, remps, bancs in M[g]:
            total += 1
            d = copie()
            p = os.path.join(d, fichier)
            s = open(p, encoding='utf8').read()
            avant = s
            for ancien, nouveau, n in remps:
                if s.count(ancien) != n:
                    print('  ⛔ %s : motif trouvé %d fois au lieu de %d — mutation MAL VISÉE' % (nom, s.count(ancien), n)); shutil.rmtree(d); sys.exit(3)
                s = s.replace(ancien, nouveau)
            open(p, 'w', encoding='utf8').write(s)
            diff = sum(1 for a, b in zip(avant.split('\n'), s.split('\n')) if a != b) + abs(len(avant.split('\n')) - len(s.split('\n')))
            res = []
            for b in bancs:
                rc, ko, t = lancer(d, b)
                res.append((b, rc, ko, t))
            tombe = any((rc != 0 or ko != 0) for (_, rc, ko, _) in res)
            tombent += 1 if tombe else 0
            print('  %s %s [%d ligne(s)]  %s' % ('✓ tombe ' if tombe else '✗ VERT  ', nom, diff,
                  ' · '.join('%s rc=%s ✗=%s' % (b.replace('test-', '').replace('.js', ''), rc, ko) for (b, rc, ko, _) in res)))
            shutil.rmtree(d)
    print('\n%d/%d mutations font tomber un banc' % (tombent, total))
    sys.exit(0 if tombent == total else 1)


main()
