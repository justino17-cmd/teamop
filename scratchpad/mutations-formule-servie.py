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
   "compte(r >= 0 ? r : rangFiche, it);", "compte(rangFiche, it);", ['727', '842']),
  ('M2', S, 'OP MESSAGES seul ne donne plus Gratuit',
   "  if (messages && !avant && !illisibles) return 'gratuit';\n", "", ['727', '842']),
  ('M3', S, "un abonnement d'avant la bascule lu comme un d'après",
   "if (aboAvantBascule(sb)) { avant++; for (const it of lignes || []) if (!ligneMessages(it)) compte(rangFiche, it); continue; }",
   "if (false) { avant++; }", ['727']),
  ('M4', S, "la fiche Gratuit sort avant Stripe (comme avant)",
   "    const po = periodeOfferte(e);\n    if (po) return po;\n    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s) : null;",
   "    return { paye: true, motif: 'gratuit' };\n    const po = periodeOfferte(e);\n    if (po) return po;\n    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s) : null;", ['727', '842']),
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
   "  } catch (err) { console.error('espacePaye formule:', err.message); return { f: null, places: null }; }",
   "  } finally {}", ['727']),
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
  # ── test-840 attend la fin RÉELLE du passage (29 septembre) : une attente plus longue ne doit rien masquer ──
  ('M25', S, "le rappel repart après un redémarrage (la marque n'est plus lue)",
   "if (!noms.length || noms.some(s => espacesReg[s].rappelFin === eq.finLe)) continue;", "if (!noms.length) continue;", ['840']),
  ('M26', S, "un envoi refusé garde sa marque (le rappel est perdu pour toujours)",
   "for (const s of noms) if (espacesReg[s] && espacesReg[s].rappelFin === eq.finLe) { espacesReg[s].rappelFin = avant[s]; defait = true; }",
   "for (const s of noms) if (false) { defait = true; }", ['840']),
  ('P1', PT, "une adresse NON prouvée lit la formule servie",
   "if (!v || typeof d.formuleServie !== 'function' || !verifie(mail)) return v;", "if (!v || typeof d.formuleServie !== 'function') return v;", ['811']),
  ('P2', PT, "rien de servi : le dossier reçoit une formule vide",
   "if (typeof lbl === 'string' && lbl) v.plan = lbl;", "if (typeof lbl === 'string') v.plan = lbl;", ['811']),
  ('P3', PT, "une panne du calcul fait tomber la route (plus de filet)",
   "    } catch (e) { /* la fiche de la Tour, comme avant */ } finally { clearTimeout(minuteur); }",
   "    } finally { clearTimeout(minuteur); }", ['811']),
  ('P4', PT, "/api/portail/moi rend la fiche seule",
   "if (refus) return res.status(403).json({ error: refus });\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));\n  });\n\n  app.post('/api/portail/demande'",
   "if (refus) return res.status(403).json({ error: refus });\n    return res.json({ ok: true, dossier: dossierVue(mail) });\n  });\n\n  app.post('/api/portail/demande'", ['811', '813']),
  ('P5', PT, "/api/portail/demande rend la fiche seule",
   "if (b.message) ajouterMsg(mail, 'client', b.message);\n    ecrire();\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));",
   "if (b.message) ajouterMsg(mail, 'client', b.message);\n    ecrire();\n    return res.json({ ok: true, dossier: dossierVue(mail) });", ['811']),
  ('P6', PT, "/api/portail/promo rend la fiche seule",
   "Profitez bien !');\n    ecrire();\n    return avecFormuleServie(mail, dossierVue(mail)).then(v => res.json({ ok: true, dossier: v }));",
   "Profitez bien !');\n    ecrire();\n    return res.json({ ok: true, dossier: dossierVue(mail) });", ['811']),
  # ── la relecture adverse du 29 septembre (matin) : chaque correctif, remis à l'envers ──
  ('R1', S, "monter sur un abonnement d'une AUTRE entreprise à la même adresse (surs = memes)",
   "const surs = memes.filter(sb => aMoi(sb) || !partagee);", "const surs = memes;", ['727']),
  ('R2', S, "descendre malgré un doute (un abonnement ambigu ignoré)",
   "if (fs !== null && (rangDe(fs) >= rangFiche || !(s.douteux || []).length)) f = fs;", "if (fs !== null) f = fs;", ['727']),
  ('R3', S, "une référence orpheline écartée quand le premier abonnement vient de la référence",
   ": ((!refDe(sb) || !designe(refDe(sb))) && !partagee)))));", ": (!refDe(sb) && !partagee)))));", ['727']),
  ('R4', S, "la plus HAUTE formule payée (et non celle qui porte le plus d'abonnements)",
   "for (let r = 0; r < parRang.length; r++) if (parRang[r] > 0 && (rang < 0 || parRang[r] > parRang[rang])) rang = r;",
   "for (let r = 0; r < parRang.length; r++) if (parRang[r] > 0) rang = r;", ['727']),
  ('R5', S, "à égalité, la plus HAUTE (moins de places)",
   "(rang < 0 || parRang[r] > parRang[rang])", "(rang < 0 || parRang[r] >= parRang[rang])", ['727']),
  ('R6', S, "monter retire des places (la règle du « au moins la fiche » retirée)",
   "    if (rangDe(fServie) > rangFiche) places = Math.max(places, placesStripe(e, s.memes || []));\n", "", ['727']),
  ('R7', S, "un abonnement d'avant la bascule n'interdit plus de descendre",
   "return RANG_FORMULE[avant && rangFiche > rang ? rangFiche : rang];", "return RANG_FORMULE[rang];", ['727']),
  ('R8', S, "un abonnement illisible (sans ligne) dit « Gratuit », comme la nuit d'avant",
   "  if (messages && !avant && !illisibles) return 'gratuit';", "  if (!avant && (abos || []).length) return 'gratuit';", ['727']),
  ('R9', S, "le courriel « code activé » annonce la formule du code seule",
   "    const fServie = formulePromo(espaceParT(teamT) || e, code) || formule;", "    const fServie = formule;", ['803']),
  ('R10', S, "/api/promo/valider rend la formule du code seule (l'application affiche Pro, la synchro Business Premium)",
   "formule: (!apercu && team && formulePromo(espaceParT(team), c)) || fCode,", "formule: fCode,", ['803']),
  ('R11', S, "l'aperçu PUBLIC dit la formule servie d'une entreprise (sa fiche fuit)",
   "(!apercu && team && formulePromo(espaceParT(team), c))", "(team && formulePromo(espaceParT(team), c))", ['803']),
  ('R12', S, "une fiche Gratuit ne lit plus sa période offerte (Gratuit pendant un code en cours)",
   "    const po = periodeOfferte(e);\n    if (po) return po;\n    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s) : null;",
   "    const s = await espaceStripe(e);\n    const fp = s ? formuleEtPlaces(e, s) : null;", ['727']),
  ('R13', S, "chaque lecture relance Stripe (plus de lecture partagée)",
   "if (!espStripeCache.enCours && Date.now() - espStripeCache.echecTs > 60000) {", "if (Date.now() - espStripeCache.echecTs > 60000) {", ['727']),
  ('R14', S, "Stripe en panne : une rafale d'essais (plus de pause d'une minute)",
   "if (!espStripeCache.enCours && Date.now() - espStripeCache.echecTs > 60000) {", "if (!espStripeCache.enCours) {", ['727']),
  ('R15', S, "J-7 : la règle de nuit des liens posée hors du bloc sombre (appliquée de jour)",
   "  'a{color:#1E7A4E}' +\n", "  'a{color:#1E7A4E}' + '.m-lien{color:#4FD196!important}' +\n", ['840']),
  ('P7', PT, "« Mon espace » attend Stripe sans limite (plus de délai)",
   "      const lbl = await Promise.race([Promise.resolve().then(() => d.formuleServie(mail)),\n        new Promise(r => { minuteur = setTimeout(() => r(''), FORMULE_DELAI); })]);",
   "      const lbl = await d.formuleServie(mail);", ['811']),
  ('T3', T, "la Tour coupe de nouveau une ligne à écart après deux lignes (l'échéance mangée)",
   ".reg-l2.abn-ecart{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}",
   ".reg-l2.abn-ecart{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}", ['842']),
  ('T4', T, "la liste des entreprises ne pose plus la classe d'écart (coupée au téléphone)",
   "'<span class=\"reg-l2'+(abnAEcart(e)?' abn-ecart':'')+'\">'+esc(abnFormule(e,e.quantite>1?' ×'+e.quantite:''))+",
   "'<span class=\"reg-l2\">'+esc(abnFormule(e,e.quantite>1?' ×'+e.quantite:''))+", ['842']),
  ('T5', T, "la fiche d'une entreprise ne dit plus ce que l'application reçoit",
   "      +(d.formuleServie&&d.formuleServie!==d.formule?' · l’application reçoit", "      +(false?' · l’application reçoit", ['842']),
  ('T6', T, "la fiche d'une entreprise écrit « premium » (l'identifiant) à côté de « Business Premium »",
   "'Formule actuelle\\u202f: <b>'+esc(ABN_F[d.formule]||d.formule)+", "'Formule actuelle\\u202f: <b>'+esc(d.formule)+", ['842']),
  ('T7', T, "le toast de « 💳 Statut paiement » écrit « premium » (l'identifiant)",
   "toast(r.d.formule?('📦 '+(ABN_F[r.d.formule]||r.d.formule)+", "toast(r.d.formule?('📦 '+r.d.formule+", ['842']),
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
