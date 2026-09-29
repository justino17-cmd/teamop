#!/usr/bin/env python3
"""Mutations — la formule servie (29 septembre 2026) : chaque défaut est remis dans le VRAI fichier, les bancs qui le
gardent sont lancés au premier plan (délai par exécution), puis le fichier est restauré par `git checkout`.
⛔ L'ordre du dépôt : correctif → banc → COMMIT → mutation → git checkout. On refuse de démarrer sur un arbre sale, et
on vérifie après chaque restauration que `git diff` est vide (une mutation restée dans le fichier fausserait la suite).
Usage : python3 scratchpad/mutations-formule-servie.py   (SEULES=M1,M4 pour n'en jouer que certaines)"""
import os, re, subprocess, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RACINE)

def sh(cmd, timeout=None):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)

if sh('git status --porcelain -- server/index.js server/portail.js tour.html').stdout.strip():
    print('⛔ server/index.js, server/portail.js ou tour.html a des changements non commités — rien ne part (git checkout les effacerait)')
    sys.exit(2)

S, T, PT = 'server/index.js', 'tour.html', 'server/portail.js'
MUT = [
  ('M1', S, 'formulePayee ignore le tarif payé (toujours la fiche)',
   "rang = Math.max(rang, r >= 0 ? r : rangFiche);", "rang = Math.max(rang, rangFiche);", ['727', '842']),
  ('M2', S, 'OP MESSAGES seul ne donne plus Gratuit',
   "  if (apres && !avant) return 'gratuit';\n", "", ['727', '842']),
  ('M3', S, "un abonnement d'avant la bascule lu comme un d'après",
   "if (aboAvantBascule(sb)) { avant++; if (lignes.some(it => !ligneMessages(it))) rang = Math.max(rang, rangFiche); continue; }",
   "if (false) { avant++; }", ['727']),
  ('M4', S, "la fiche Gratuit sort avant Stripe (comme avant)",
   "    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s.memes) : null;",
   "    return { paye: true, motif: 'gratuit' };\n    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s.memes) : null;", ['727', '842']),
  ('M5', S, "/api/espaces/etat rend la fiche, pas la formule servie",
   "res.json({ ok: true, formule: p.formuleServie || e.formule, quantite", "res.json({ ok: true, formule: e.formule, quantite", ['842']),
  ('M6', S, "la période offerte sert la fiche seule (le code ignoré)",
   "const r = Math.max(RANG_FORMULE.indexOf(e && e.formule), RANG_FORMULE.indexOf(formuleDuCode(code)));",
   "const r = RANG_FORMULE.indexOf(e && e.formule);", ['727', '842', '840']),
  ('M7', S, "la période offerte sert le code seul (sous la fiche possible)",
   "const r = Math.max(RANG_FORMULE.indexOf(e && e.formule), RANG_FORMULE.indexOf(formuleDuCode(code)));",
   "const r = RANG_FORMULE.indexOf(formuleDuCode(code)) >= 0 ? RANG_FORMULE.indexOf(formuleDuCode(code)) : RANG_FORMULE.indexOf(e && e.formule);", ['727', '842', '840']),
  ('M8', S, "un code sans formule sert Pro (pas le plus gros forfait)",
   "return p ? (RANG_FORMULE.includes(p.formule) ? p.formule : 'premium') : '';",
   "return p ? (RANG_FORMULE.includes(p.formule) ? p.formule : 'pro') : '';", ['727', '842']),
  ('M9', S, "placesDeFormule sans « formule changée après la bascule »",
   "Object.assign({}, e, { formule: f }, f !== e.formule ? { formuleDepuis: Date.now() } : {})",
   "Object.assign({}, e, { formule: f })", ['727', '842']),
  ('M10', S, "formuleEtPlaces sans filet (une donnée mal formée fait jeter)",
   "  try { f = formulePayee(e, abos); return { f, places: placesDeFormule(e, f || e.formule, abos) }; }\n  catch (err) { console.error('espacePaye formule:', err.message); return { f, places: null }; }",
   "  f = formulePayee(e, abos); return { f, places: placesDeFormule(e, f || e.formule, abos) };", ['727']),
  ('M11', S, "la liste blanche des tarifs retirée",
   "if (rangDuPrix < 0 && !STRIPE_PRIX_MESSAGES.includes(String(price))) return res.status(400).json({ error: 'tarif_inconnu' });",
   "", ['727', '839']),
  ('M12', S, "J-7 : la formule du jour proposée deux fois",
   "const autres = ['pro', 'business', 'premium'].filter(g => g !== f);", "const autres = ['pro', 'business', 'premium'];", ['840']),
  ('M13', S, "J-7 : la version texte sans les autres formules",
   "      + '\\n\\n' + autresTxt\n", "", ['840']),
  ('M14', S, "J-7 : la fiche d'abord, comme la nuit d'avant",
   "        const f = formulePromo(e, code);\n",
   "        const f = e && ['pro', 'business', 'premium'].includes(e.formule) ? e.formule : formuleDuCode(code);\n", ['840']),
  ('M15', S, "la fiche de la Tour sans le code de la période",
   "formuleServie: p.formuleServie || e.formule || '', promoCode: p.promoCode || '', quantite",
   "formuleServie: p.formuleServie || e.formule || '', quantite", ['842']),
  ('M16', S, "la liste de la Tour sans la formule servie",
   "formule: e.formule || '', formuleServie: p.formuleServie || e.formule || '', quantite: e.quantite || 1, places: placesServies(e, p),",
   "formule: e.formule || '', quantite: e.quantite || 1, places: placesServies(e, p),", ['842']),
  ('M17', S, "le code en attente (lecture) sans la formule qu'il servira",
   "promoCode: c, enAttente: true, formuleServie: formulePromo(e, c) || e.formule };", "promoCode: c, enAttente: true };", ['727']),
  ('T1', T, "la Tour affiche la fiche (sans l'écart)",
   "  if(s===f) return lf;\n  return (ABN_F[s]||s)+' ('+abnEcart(e)+'\\u202f; la fiche dit '+lf+')';", "  return lf;", ['842']),
  ('T2', T, "la Tour dit « payée » même pour une période offerte",
   "function abnEcart(e){ return e.promoCode?'offerte par le code':", "function abnEcart(e){ return false?'offerte par le code':", ['842']),
  # ── « Mon espace » (le portail) dit la formule servie — ajoutées le 29 septembre au matin ──
  ('M18', S, "une adresse qui porte deux entreprises : on en choisit une",
   "  if (ts.size !== 1) return '';\n", "  if (ts.size < 1) return '';\n", ['727']),
  ('M19', S, "« Mon espace » dit la fiche même quand rien n'est payé",
   "const f = p && p.paye ? (p.formuleServie || e.formule) : '';", "const f = p ? (p.formuleServie || e.formule) : '';", ['727']),
  ('M20', S, "une entreprise fermée garde sa formule dans « Mon espace »",
   "if (!e || !e.formule || espaceFerme(espaceT(e))) return '';", "if (!e || !e.formule) return '';", ['727']),
  ('M21', S, "« Mon espace » reçoit l'identifiant (premium) au lieu du libellé",
   "  return (f && FORMULE_LBL2[f]) || '';\n}", "  return f || '';\n}", ['727', '813']),
  ('M22', S, "le serveur ne branche pas la formule servie dans le portail",
   "      formuleServie: formuleServieDe,", "", ['813']),
  ('M23', S, "le motif dit « formule payée : Gratuit » (OP MESSAGES seul)",
   "f === 'gratuit' ? ' — OP GESTION non payé : formule Gratuit' : ", "", ['727']),
  ('M24', S, "J-7 : les liens des autres formules illisibles de nuit",
   "    '.m-lien{color:#4FD196!important}' +", "", ['840']),
  ('P1', PT, "une adresse NON prouvée lit la formule servie",
   "if (!v || typeof d.formuleServie !== 'function' || !verifie(mail)) return v;", "if (!v || typeof d.formuleServie !== 'function') return v;", ['811']),
  ('P2', PT, "rien de servi : le dossier reçoit une formule vide",
   "if (typeof lbl === 'string' && lbl) v.plan = lbl;", "if (typeof lbl === 'string') v.plan = lbl;", ['811']),
  ('P3', PT, "une panne du calcul fait tomber la route (plus de filet)",
   "    try { const lbl = await d.formuleServie(mail); if (typeof lbl === 'string' && lbl) v.plan = lbl; } catch (e) { /* la fiche de la Tour, comme avant */ }",
   "    { const lbl = await d.formuleServie(mail); if (typeof lbl === 'string' && lbl) v.plan = lbl; }", ['811']),
  ('P4', PT, "/api/portail/moi rend la fiche seule",
   "if (refus) return res.status(403).json({ error: refus });\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));\n  });\n\n  app.post('/api/portail/demande'",
   "if (refus) return res.status(403).json({ error: refus });\n    return res.json({ ok: true, dossier: dossierVue(mail) });\n  });\n\n  app.post('/api/portail/demande'", ['811', '813']),
  ('P5', PT, "/api/portail/demande rend la fiche seule",
   "if (b.message) ajouterMsg(mail, 'client', b.message);\n    ecrire();\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));",
   "if (b.message) ajouterMsg(mail, 'client', b.message);\n    ecrire();\n    return res.json({ ok: true, dossier: dossierVue(mail) });", ['811']),
  ('P6', PT, "/api/portail/promo rend la fiche seule",
   "Profitez bien !');\n    ecrire();\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));",
   "Profitez bien !');\n    ecrire();\n    return res.json({ ok: true, dossier: dossierVue(mail) });", ['811']),
]

seules = set(filter(None, os.environ.get('SEULES', '').split(',')))
bilan = []
for (cle, fichier, nom, avant, apres, bancs) in MUT:
    if seules and cle not in seules: continue
    src = open(fichier, encoding='utf-8').read()
    n = src.count(avant)
    if n != 1:
        print(f'⛔ {cle} : l\'ancre apparaît {n} fois dans {fichier} — mutation NON jouée'); bilan.append((cle, 'ANCRE')); continue
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
print('git status après le lot : ' + (sh('git status --porcelain -- server/index.js server/portail.js tour.html').stdout.strip() or 'propre'))
