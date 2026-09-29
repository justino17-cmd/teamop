#!/usr/bin/env python3
"""Mutations — la facturation différée pendant une période offerte (29 septembre 2026, « 2 oui » de Justin) : chaque
défaut est remis dans le VRAI fichier (serveur, page de remerciement), les bancs qui le gardent sont lancés au premier
plan (délai par exécution), puis le fichier est restauré par `git checkout`.
⛔ L'ordre du dépôt : correctif → banc → COMMIT → mutation → git checkout. On refuse de démarrer sur un arbre sale, et
on vérifie après chaque restauration que `git diff` est vide (une mutation restée dans le fichier fausserait la suite).
À lancer dans un arbre à part (git worktree) : une suite lancée ailleurs pendant ce temps ne doit jamais lire un fichier
muté.
Usage : python3 scratchpad/mutations-essai.py   (SEULES=E1,P2 pour n'en jouer que certaines)"""
import os, re, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RACINE)

def sh(cmd, timeout=None):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)

if sh('git status --porcelain -- server/index.js merci.html').stdout.strip():
    print('⛔ server/index.js ou merci.html a des changements non commités — rien ne part (git checkout les effacerait)')
    sys.exit(2)

S, M = 'server/index.js', 'merci.html'
MUT = [
  # la route de paiement
  ('E1', S, 'la fin d\'essai ne part plus chez Stripe',
   "    if (essai) p.append('subscription_data[trial_end]', String(essai.fin));\n", "", ['727', '839']),
  ('E2', S, 'OP MESSAGES différé aussi (le code ne le couvre pas)',
   "const essai = rangDuPrix >= 0 ? finEssaiPeriode(visees, payeurMin) : null;", "const essai = finEssaiPeriode(visees, payeurMin);", ['727', '839']),
  ('E3', S, 'le retour ne dit plus le jour à la page de remerciement',
   "p.append('success_url', 'https://teamop.fr/merci.html' + (essai ? '?debut=' + essai.debut : ''));",
   "p.append('success_url', 'https://teamop.fr/merci.html');", ['727', '839']),
  ('E4', S, 'la référence vérifiée ignorée (l\'adresse seule décide)',
   "const essai = rangDuPrix >= 0 ? finEssaiPeriode(visees, payeurMin) : null;", "const essai = rangDuPrix >= 0 ? finEssaiPeriode([], payeurMin) : null;", ['727', '839']),
  # la fonction
  ('E5', S, 'deux entreprises à une adresse : la première est prise',
   "      if (parT.size !== 1) return null;", "      if (!parT.size) return null;", ['727', '839', '840']),
  ('E6', S, 'la borne des 48 h retirée',
   "if (debutMs < maint + 48 * 3600000 + 10 * 60000 || debutMs > maint + 730 * 86400000) return null;",
   "if (debutMs > maint + 730 * 86400000) return null;", ['727']),
  ('E7', S, 'la marge de 10 minutes retirée (l\'horloge de Stripe n\'est pas la nôtre)',
   "if (debutMs < maint + 48 * 3600000 + 10 * 60000 ||", "if (debutMs < maint + 48 * 3600000 ||", ['727']),
  ('E8', S, 'la borne des deux ans retirée',
   " || debutMs > maint + 730 * 86400000) return null;", ") return null;", ['727']),
  ('E9', S, 'le premier prélèvement le DERNIER jour de la période (un jour trop tôt)',
   "const debutMs = Date.UTC(+m[1], +m[2] - 1, +m[3] + 1);", "const debutMs = Date.UTC(+m[1], +m[2] - 1, +m[3]);", ['727', '839', '840']),
  ('E10', S, 'une entreprise fermée différée quand même',
   "    if (!t || espaceFerme(t)) return null;\n    const po = periodeOfferte(", "    if (!t) return null;\n    const po = periodeOfferte(", ['727']),
  ('E11', S, 'une entrée sans identifiant acceptée',
   "    if (!t || espaceFerme(t)) return null;\n    const po = periodeOfferte(", "    if (espaceFerme(t)) return null;\n    const po = periodeOfferte(", ['727']),
  ('E12', S, 'l\'adresse de l\'annuaire comparée sans casse ni espaces retirés',
   "if (!x || typeof x.email !== 'string' || x.email.trim().toLowerCase() !== adresse) continue;",
   "if (!x || typeof x.email !== 'string' || x.email !== adresse) continue;", ['727']),
  ('E13', S, 'la fonction sans filet (une exception casse le paiement)',
   "    return { fin: Math.floor(debutMs / 1000), debut: new Date(debutMs).toISOString().slice(0, 10), finLe: po.finLe, t };\n  } catch (err) { return null; }",
   "    return { fin: Math.floor(debutMs / 1000), debut: new Date(debutMs).toISOString().slice(0, 10), finLe: po.finLe, t };\n  } finally {}", ['727']),
  # le courriel J-7
  ('E14', S, 'J-7 : la promesse même quand la limite est passée',
   "es.finLe === eq.finLe && limite > auj\n", "es.finLe === eq.finLe\n", ['840']),
  ('E15', S, 'J-7 : la promesse sans la règle de la page (adresse partagée comprise)',
   "const es = finEssaiPeriode([], String(dest).trim().toLowerCase());", "const es = finEssaiPeriode([Object.assign({ slug: noms[0] }, e)], '');", ['840']),
  ('E16', S, 'J-7 : la version texte sans la promesse',
   " + (prelevTxt ? '\\n\\n' + prelevTxt : '')", "", ['840']),
  ('E17', S, 'J-7 : le HTML sans la promesse',
   "MAIL_BLOCS.cadre(devisHtml + prelevHtml,", "MAIL_BLOCS.cadre(devisHtml,", ['840']),
  ('E18', S, 'J-7 : la limite annoncée la veille (trop tard : Stripe veut 48 h)',
   "new Date(Date.UTC(+mL[1], +mL[2] - 1, +mL[3] - 2))", "new Date(Date.UTC(+mL[1], +mL[2] - 1, +mL[3] - 1))", ['840']),
  # la page de remerciement
  ('P1', M, 'une date impossible acceptée (30 février)',
   "    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return;\n", "", ['839']),
  ('P2', M, 'une date passée acceptée',
   "if (d.getTime() <= Date.now() || d.getTime() > Date.now() + 731 * 86400000) return;",
   "if (d.getTime() > Date.now() + 731 * 86400000) return;", ['839']),
  ('P3', M, 'une date lointaine acceptée',
   "if (d.getTime() <= Date.now() || d.getTime() > Date.now() + 731 * 86400000) return;",
   "if (d.getTime() <= Date.now()) return;", ['839']),
  ('P4', M, 'le titre reste « Paiement confirmé »',
   "    document.getElementById('titre').textContent = 'Abonnement confirmé';\n", "", ['839']),
  ('P5', M, 'la date lue sans ancres (ce qui suit passe)',
   "var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(", "var m = /(\\d{4})-(\\d{2})-(\\d{2})/.exec(", ['839']),
  ('P6', M, 'le message annonce encore la facture partie',
   "rien n\\'est prélevé avant le <strong>", "un e-mail avec ta facture vient de partir, rien n\\'est prélevé avant le <strong>", ['839']),
]

seules = set(filter(None, os.environ.get('SEULES', '').split(',')))
bilan = []
for (cle, fichier, nom, avant, apres, bancs) in MUT:
    if seules and cle not in seules: continue
    src = open(fichier, encoding='utf-8').read()
    n = src.count(avant)
    if n != 1:
        print(f'⛔ {cle} : l\'ancre apparaît {n} fois dans {fichier} — mutation NON jouée', flush=True); bilan.append((cle, 'ANCRE')); continue
    open(fichier, 'w', encoding='utf-8').write(src.replace(avant, apres))
    diff = sh(f'git diff --stat -- {fichier}').stdout.strip()
    morsures = []
    try:
        for b in bancs:
            try:
                r = sh(f'node tests/test-{b}.js', timeout=400)
                tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
                ko = int(tot[-1][1]) if tot else -1
                morsures.append((b, r.returncode, ko))
            except subprocess.TimeoutExpired:
                morsures.append((b, 'délai', -1))
    finally:
        sh(f'git checkout -- {fichier}')
        if sh(f'git diff --stat -- {fichier}').stdout.strip():
            print('⛔⛔ la restauration a échoué — ARRÊT'); sys.exit(3)
    mord = any((code not in (0,)) or ko > 0 for (_, code, ko) in morsures)
    print(f"{'✓ MORD' if mord else '✗ NE MORD PAS'}  {cle} · {nom} · {diff.splitlines()[-1] if diff else '(aucun diff !)'} · " +
          ', '.join(f'test-{b}: code {c}, {k} ✗' for (b, c, k) in morsures), flush=True)
    bilan.append((cle, 'mord' if mord else 'NE MORD PAS'))

print('\n' + str(sum(1 for _, x in bilan if x == 'mord')) + '/' + str(len(bilan)) + ' mutations mordent')
print('git status après le lot : ' + (sh('git status --porcelain -- server/index.js merci.html').stdout.strip() or 'propre'))
