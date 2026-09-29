#!/usr/bin/env python3
"""Mutations — la facturation différée pendant une période offerte (29 septembre 2026, « 2 oui » de Justin), puis les
correctifs des relectures (`gardien`, `relecteur`), le rappel J-7 à une entreprise déjà abonnée (série N) et la carte
refusée = impayé, accès payant bloqué jusqu'au règlement (série I, Justin, 29 septembre 2026 au soir) : chaque
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

if sh('git status --porcelain -- server/index.js server/portail.js merci.html').stdout.strip():
    print('⛔ server/index.js, server/portail.js ou merci.html a des changements non commités — rien ne part (git checkout les effacerait)')
    sys.exit(2)

S, M, PO = 'server/index.js', 'merci.html', 'server/portail.js'
MUT = [
  # la route de paiement
  ('E1', S, 'la fin d\'essai ne part plus chez Stripe',
   "    if (essai) p.append('subscription_data[trial_end]', String(essai.fin));\n", "", ['727', '839']),
  ('E2', S, 'OP MESSAGES différé aussi (le code ne le couvre pas)',
   "const essai = rangDuPrix >= 0 ? finEssaiPeriode(visees, payeurMin) : null;", "const essai = finEssaiPeriode(visees, payeurMin);", ['727', '839']),
  ('E3', S, 'le retour ne dit plus le jour à la page de remerciement',
   "p.append('success_url', 'https://teamop.fr/merci.html' + (essai ? '?debut=' + essai.debut : ''));",
   "p.append('success_url', 'https://teamop.fr/merci.html');", ['727', '839']),
  # ⚠️ E4 (« la référence vérifiée ignorée : `finEssaiPeriode([], payeurMin)` ») est RETIRÉE — elle est devenue ÉQUIVALENTE
  # avec `accba05` : l'adresse du compte doit désigner l'entreprise SEULE, et la référence la même (sinon rien). Ignorer la
  # référence ne change donc plus rien par la route (le verrou « B » garantit que le compte qui paie est à cette adresse) :
  # elle ne mordait plus, à juste titre. La garde qui la remplace (« la référence d'une AUTRE que l'entreprise de
  # l'adresse ») se joue sur la vraie fonction seule — mutation N1, test-727.
  # la fonction
  ('E5', S, 'deux entreprises à une adresse : la première est prise',
   "    if (parT.size !== 1) return null;", "    if (!parT.size) return null;", ['727', '839', '840']),
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
   "    if (!t || !parT.has(t) || espaceFerme(t)) return null;\n", "    if (!t || !parT.has(t)) return null;\n", ['727']),
  ('E11', S, 'une entrée sans identifiant acceptée',
   "    if (!t || !parT.has(t) || espaceFerme(t)) return null;\n", "    if (!parT.has(t) || espaceFerme(t)) return null;\n", ['727']),
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
  # ── les correctifs des relectures (29 septembre 2026, après `gardien` et `relecteur`) ──
  ('N1', S, 'la référence acceptée sans que l\'adresse du compte la désigne',
   "    if (!t || !parT.has(t) || espaceFerme(t)) return null;\n", "    if (!t || espaceFerme(t)) return null;\n", ['727']),
  ('N2', S, 'un abonnement réglé à la main dans la Tour différé quand même',
   "    if (lue && lue.aboStatut) return null;\n", "", ['727']),
  ('N3', S, 'sans adresse, la référence seule suffit',
   "    if (!adresse) return null;\n    const parT = new Map();", "    const parT = new Map();", ['727']),
  ('N4', S, 'J-7 : le courriel habituel (lien de paiement) à une entreprise déjà abonnée',
   "const m = ab.etat === 'abonne' ? rappelAbonneMail(code, eq.finLe, ab) : ab.etat === 'impaye' ? rappelImpayeMail(code, eq.finLe, urlFacture) : rappelEcheanceMail(code, eq.finLe, f, n, prelev);",
   "const m = rappelEcheanceMail(code, eq.finLe, f, n, prelev);", ['844']),
  # ⚠️ N5 (« la promesse même quand Stripe est illisible » : `const prelev = es && …` sans `ab.etat === 'aucun'`) est RETIRÉE —
  # ÉQUIVALENTE depuis le report du rappel (seconde relecture de `gardien`) : Stripe illisible avec un délai encore à venir,
  # le rappel attend (il n'atteint pas `prelev`) ; au dernier moment, `limite > auj` est faux dans la même condition ; abonnée,
  # l'autre courriel ne lit pas `prelev`. La condition reste, en défense, pour le jour où le report changerait.
  # ── la seconde relecture de `gardien` : la décision du lendemain de la fin ──
  ('N6', S, 'J-7 : Stripe illisible ou liste périmée, on décide quand même',
   "if (!espStripeCache.data || Date.now() - espStripeCache.ts > STRIPE_CACHE_MS) return { etat: 'inconnu' };", "if (false) return { etat: 'inconnu' };", ['844']),
  ('N6b', S, 'J-7 : une liste Stripe périmée décide (un paiement fait depuis n\'y est pas)',
   "if (!espStripeCache.data || Date.now() - espStripeCache.ts > STRIPE_CACHE_MS) return { etat: 'inconnu' };", "if (!espStripeCache.data) return { etat: 'inconnu' };", ['844']),
  ('N7', S, 'J-7 : la fiche « Gratuit » oubliée (seul le tarif payé décide)',
   "  if (((fp && fp.f) || e.formule) === 'gratuit') return { etat: 'aucun' };\n", "  if (fp && fp.f === 'gratuit') return { etat: 'aucun' };\n", ['844']),
  ('N8', S, 'J-7 : OP MESSAGES seul pris pour un abonnement OP GESTION',
   "  if (((fp && fp.f) || e.formule) === 'gratuit') return { etat: 'aucun' };\n", "", ['844']),
  ('N9', S, 'J-7 : un abonnement d\'avant la bascule ne compte plus pour les dates',
   "return aboAvantBascule(sb) || !l.length || l.some(it => !ligneMessages(it)); };", "return !l.length || l.some(it => !ligneMessages(it)); };", ['844']),
  ('N10', S, 'J-7 : les dates lues sur l\'abonnement OP MESSAGES',
   "|| l.some(it => !ligneMessages(it)); };", "|| true; };", ['844']),
  ('N11', S, 'J-7 : les dates d\'une autre entreprise (adresse partagée)',
   "  const gestion = (s.memes || []).filter(sb => sb && aboDeGestion(sb));", "  const gestion = [s.abo].concat(s.memes || []).filter(sb => sb && aboDeGestion(sb));", ['844']),
  ('N12', S, 'J-7 : la résiliation ignorée',
   "const finProg = sb => sec(sb.cancel_at) || (sb.cancel_at_period_end ? (finPeriode(sb) || sec(sb.trial_end) || 1) : 0);", "const finProg = sb => 0;", ['844']),
  ('N13', S, 'J-7 : la décision sur l\'état d\'AUJOURD\'HUI (les abonnements résiliés avant la fin comptent)',
   "espStripeCache.data.filter(sb => { const f = finProg(sb); return !f || f > debut; })", "espStripeCache.data", ['844']),
  ('N14', S, 'J-7 : « rien à faire » à une entreprise résiliée',
   "const suite = (ab.resilie ? 'Votre abonnement prend le relais jusqu\\'au '", "const suite = (false ? 'Votre abonnement prend le relais jusqu\\'au '", ['844']),
  ('N15', S, 'J-7 : l\'impayé tu',
   "impaye: !!imp, resilie: fin ? jour(fin) : '',", "impaye: false, resilie: fin ? jour(fin) : '',", ['844']),
  ('N16', S, 'J-7 : le jour du premier prélèvement tu (en essai)',
   "premier: abo.status === 'trialing' ? jour(sec(abo.trial_end) || finPeriode(abo)) : '',", "premier: '',", ['844']),
  ('N17', S, 'J-7 : l\'annuaire pas relu après l\'attente de Stripe',
   "          const el = eligible(code, t, eq0.finLe);\n", "          const el = el0;\n", ['844']),
  ('N18', S, 'J-7 : le premier abonnement trouvé décide, même résilié',
   "const rang = sb => (finProg(sb) ? 4 : 0) + (sb.status === 'trialing' ? 1 : 0);", "const rang = sb => 0;", ['844']),
  ('N18b', S, 'J-7 : l\'essai passe avant l\'abonnement actif (« premier prélèvement » à qui paie déjà)',
   "const rang = sb => (finProg(sb) ? 4 : 0) + (sb.status === 'trialing' ? 1 : 0);", "const rang = sb => (finProg(sb) ? 4 : 0);", ['844']),
  ('N19', S, 'Tour : le revenu mensuel compte encore les essais',
   "    if (statut === 'actif') mrr += mensuel;\n", "    if (statut === 'actif' || statut === 'essai') mrr += mensuel;\n", ['727']),
  ('N20', S, 'J-7 : Stripe illisible, le rappel part tout de suite (il n\'attend plus le passage suivant)',
   "if (ab.etat === 'inconnu' && limite > auj) {", "if (false) {", ['844']),
  ('N21', S, 'J-7 : Stripe illisible, le rappel attend même quand il ne peut plus attendre',
   "if (ab.etat === 'inconnu' && limite > auj) {", "if (ab.etat === 'inconnu') {", ['844']),
  ('N22', S, 'J-7 : réglée à la main dans la Tour, Stripe décide quand même',
   "  if (!e.formule || e.aboStatut) return { etat: 'aucun' };\n", "", ['844']),
  ('N23', S, 'J-7 : un réglage de la Tour pendant l\'attente ignoré (la décision d\'avant sert)',
   "if (!el || el.sig !== el0.sig) continue;", "if (!el) continue;", ['844']),
  ('N24', S, 'J-7 : les jours en UTC (un renouvellement à 23 h 30 UTC dit la veille)',
   "new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris',", "new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC',", ['844']),
  ('N25', S, 'J-7 : une résiliation sans date lisible prise pour « pas résilié »',
   "(finPeriode(sb) || sec(sb.trial_end) || 1)", "(finPeriode(sb) || sec(sb.trial_end))", ['844']),
  # ── la carte refusée = impayé (série I, Justin, 29 septembre 2026 au soir : « leur accès sont bloqués le temps que c'est
  # pas payé » ; « rien n'est perdu ») ──
  ('I1', S, 'past_due redevient « payé »',
   "const STATUTS_PAYES = ['active', 'trialing'];", "const STATUTS_PAYES = ['active', 'trialing', 'past_due'];", ['845', '844']),
  ('I2', S, 'unpaid n\'est plus un impayé',
   "const STATUTS_IMPAYES = ['past_due', 'unpaid'];", "const STATUTS_IMPAYES = ['past_due'];", ['845', '844']),
  ('I3', S, 'l\'application reçoit « non payé » AVEC sa formule (bandeau à toute l\'équipe, db réécrit)',
   "    if (p.bloque) return res.json({ ok: true, paye: false, impaye: true, motif: p.motif, opMessages, versionMin, enLigne, suspendu: true, sursisJours: 0 });\n", "", ['845']),
  ('I4', S, 'la forme B porte la formule',
   "motif: p.motif, opMessages, versionMin, enLigne, suspendu: true, sursisJours: 0 });", "motif: p.motif, formule: e.formule, opMessages, versionMin, enLigne, suspendu: true, sursisJours: 0 });", ['845']),
  ('I5', S, 'sept jours de sursis à un impayé Stripe',
   "enLigne, suspendu: true, sursisJours: 0 });", "enLigne, suspendu: true, sursisJours: 7 });", ['845']),
  ('I6', S, 'fiche Gratuit : son payé refusé passe pour le Gratuit normal',
   "    if (imp) return { paye: true, motif: 'gratuit — ' + motifImpaye(imp), impaye: true, bloque: true };\n", "", ['845']),
  ('I7', S, 'OP MESSAGES payé masque l\'impayé d\'OP GESTION',
   "    if (imp && f === 'gratuit') return bloqueImpaye(imp);\n", "", ['845']),
  ('I8', S, 'l\'impayé seul n\'est pas bloqué',
   "  if (imp) return bloqueImpaye(imp);\n  return { paye: false, motif: 'aucun paiement ni code promo' };", "  return { paye: false, motif: 'aucun paiement ni code promo' };", ['845']),
  ('I9', S, 'un OP MESSAGES refusé compte comme un impayé d\'OP GESTION',
   "const tous = ((imp && imp.memes) || []).filter(aboDeGestion);", "const tous = ((imp && imp.memes) || []);", ['845']),
  ('I10', S, 'un impayé attend les cinq minutes de la liste (l\'accès revient tard)',
   "  if (!s && imp && Date.now() - espStripeCache.ts > STRIPE_IMPAYE_FRAIS_MS) {", "  if (false) {", ['845']),
  ('I11', S, 'un impayé relit Stripe à chaque appel (rafale)',
   "  if (!s && imp && Date.now() - espStripeCache.ts > STRIPE_IMPAYE_FRAIS_MS) {\n    s = await espaceStripe(e, STRIPE_IMPAYE_FRAIS_MS);",
   "  if (!s && imp) {\n    s = await espaceStripe(e, 1);", ['845']),
  ('I12', S, 'une entreprise qui paie relit Stripe à chaque appel',
   "  let s = await espaceStripe(e);\n  let imp = null;", "  let s = await espaceStripe(e, 1);\n  let imp = null;", ['845']),
  ('I13', S, 'la page de paiement vend un second abonnement à un impayé',
   "    if (rangDuPrix >= 0) {\n      const due = await factureImpayeARegler", "    if (false) {\n      const due = await factureImpayeARegler", ['845']),
  ('I14', S, 'OP MESSAGES envoyé sur la facture d\'OP GESTION',
   "    if (rangDuPrix >= 0) {\n      const due = await factureImpayeARegler", "    if (true) {\n      const due = await factureImpayeARegler", ['845']),
  ('I15', S, 'la facture d\'une AUTRE entreprise (l\'impayé de la liste sans le compte qui paie)',
   " && aboDeGestion(sb) && duCompte(sb)) cand.set(sb.id, sb);", " && aboDeGestion(sb)) cand.set(sb.id, sb);", ['845']),
  ('I16', S, 'réglé depuis la liste : on le croit encore impayé',
   "    if (!f.impaye) continue;   // réglé depuis la liste\n", "", ['845']),
  ('I17', S, 'Stripe muet à la relecture : on vend quand même un abonnement',
   "return { refus: 502, error: 'stripe_indisponible' }; }", "continue; }", ['845']),
  ('I18', S, 'sans facture ouverte : on vend quand même un abonnement',
   "    return { refus: 409, error: 'impaye_sans_facture' };\n", "", ['845']),
  ('I19', S, 'la liste des factures ouvertes n\'est plus lue',
   "  const f = await stripeMonGet('https://api.stripe.com/v1/invoices?subscription=' + encodeURIComponent(subId) + '&status=open&limit=1', sk);",
   "  const f = null;", ['845', '844']),
  ('I20', S, 'une dernière facture close servie comme si elle était ouverte',
   "li.status === 'open' && httpsOk(", "httpsOk(", ['845', '844']),
  ('I21', S, '« Mon espace » dit « Actif » à un impayé (serveur)',
   "  if (p && p.bloque) return { statut: 'suspendu' };\n", "", ['845']),
  ('I22', PO, '« Mon espace » dit « Actif » à un impayé (portail)',
   "      else if (lbl && typeof lbl === 'object' && lbl.statut === 'suspendu') v.planStatus = 'suspendu';\n", "", ['845']),
  ('I23', S, 'la liste de la Tour ne voit plus l\'impayé',
   "      impaye: !!p.bloque, impayesPartiels: p.impayesPartiels || 0,\n", "      impaye: false, impayesPartiels: p.impayesPartiels || 0,\n", ['845']),
  ('I24', S, 'la fiche de la Tour ne voit plus l\'impayé',
   "    impaye: !!p.bloque, impayesPartiels: p.impayesPartiels || 0 });", "    impaye: false, impayesPartiels: p.impayesPartiels || 0 });", ['845']),
  ('I25', S, 'un refusé parmi des payés : le motif se tait',
   "      + (nImp ? ' — ' + nImp", "      + (false ? ' — ' + nImp", ['845']),
  ('I26', S, 'J-7 : un impayé reçoit le courriel habituel (lien vers un second abonnement)',
   "  if (!s) return imp ? { etat: 'impaye', abo: imp.abo, surs: imp.surs } : { etat: 'aucun' };", "  if (!s) return { etat: 'aucun' };", ['844']),
  ('I27', S, 'J-7 : OP MESSAGES payé masque l\'impayé d\'OP GESTION',
   "  if (!gestion.length && imp) return { etat: 'impaye', abo: imp.abo, surs: imp.surs };\n", "", ['844']),
  ('I28', S, 'J-7 : réglé depuis la liste, on dit encore « à régler »',
   "            if (lue && !lue.impaye) { ab.etat = 'abonne';", "            if (false) { ab.etat = 'abonne';", ['844']),
  ('I29', S, 'J-7 : Stripe muet à la relecture, le rappel part tout de suite (sans facture)',
   "            if (echec && limite > auj) {", "            if (false) {", ['844']),
  ('I30', S, 'J-7 : le premier prélèvement ne dit plus ce qui arrive s\'il échoue',
   "  const siRefus = ' S\\'il n\\'aboutit pas, les fonctions payantes seront bloquées jusqu\\'au règlement — vos données ne bougent pas.';",
   "  const siRefus = '';", ['844']),
  ('I31', S, 'J-7 : un refusé parmi des payés, « rien à faire »',
   "    + (ab.impaye ? ' Mais le dernier", "    + (false ? ' Mais le dernier", ['844']),
  ('I32', S, 'J-7 : la facture en attente jamais donnée',
   "  const agir = url ? ", "  const agir = false ? ", ['844']),
  ('I33', S, 'J-7 : un impayé reçoit « prend le relais »',
   "ab.etat === 'impaye' ? rappelImpayeMail(code, eq.finLe, urlFacture) : ", "", ['844']),
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
print('git status après le lot : ' + (sh('git status --porcelain -- server/index.js server/portail.js merci.html').stdout.strip() or 'propre'))
