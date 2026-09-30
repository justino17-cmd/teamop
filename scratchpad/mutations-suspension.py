#!/usr/bin/env python3
# Mutations du chantier « plus de Gratuit : non payé = suspendu » (#279, commit 7ea5837).
# Chaque mutation remet UN défaut dans un arbre à part (git worktree), et au moins un banc doit tomber.
# L'ordre du dépôt : correctif → banc → commit → mutation → restauration (git checkout dans l'arbre à part).
import os, subprocess, sys, shutil

# Usage : python3 scratchpad/mutations-suspension.py [dossier-du-worktree]   (par défaut : un dossier temporaire neuf)
import tempfile
DEPOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARBRE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.mkdtemp(prefix='mut-suspension-'), 'arbre')

def sh(cmd, cwd=None, timeout=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, timeout=timeout)

if os.path.exists(ARBRE):
    sh('git worktree remove --force ' + ARBRE, cwd=DEPOT)
    shutil.rmtree(ARBRE, ignore_errors=True)
r = sh('git worktree add --detach ' + ARBRE + ' HEAD', cwd=DEPOT)
if r.returncode:
    print(r.stderr); sys.exit(1)
os.symlink(DEPOT + '/server/node_modules', ARBRE + '/server/node_modules')

S, A, T, P, V, R = 'server/index.js', 'app.html', 'tour.html', 'espace.html', '.github/scripts/surveillance.js', 'recap-abonnement.html'
MUT = [
  ('M1 règle de suspension : un non-payé servi avec sa formule (ancienne forme)', S,
   "return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f)));",
   "return !!(p && (p.bloque || !RANG_FORMULE.includes(f)));", ['761', '845', '848']),
  ('M2 règle de suspension : une formule que l\'application ne connaît pas servie quand même', S,
   "return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f)));",
   "return !!(p && (p.bloque || !p.paye));", ['761', '842', '845']),
  ('M3 espacePaye : une fiche Gratuit sans rien redevient « payée, gratuit »', S,
   "return { paye: false, motif: ficheSansFormuleLbl(e) + ' — ' + pourquoi + ' : suspendue jusqu\\'au règlement' };",
   "return { paye: true, motif: 'gratuit' };", ['727', '761', '842']),
  ('M4 aboManuelDe : la fiche Gratuit réglée « active » à la main redevient payée', S,
   "  if (court && ficheSansFormule(e)) return false;   // (sans formule non plus : quelle formule servirait-il ?)\n",
   "", ['727', '761']),
  ('M5 « Revoir le lien » : l\'abonnement réglé à la main n\'est plus reporté', S,
   "    aboStatut: base.aboStatut, aboFin: base.aboFin, aboPar: base.aboPar, aboTs: base.aboTs, aboDepuis: base.aboDepuis,\n    formuleDepuis: base.formuleDepuis };",
   "    };", ['848']),
  ('M6 période offerte d\'un code retiré : retombe sur « gratuit »', S,
   "formuleServie: formulePromo(e, code) || (RANG_FORMULE.includes(e.formule) ? e.formule : 'premium') };",
   "formuleServie: formulePromo(e, code) || e.formule };", ['727']),
  ('M7 gratuitPayeIllisible : un abonnement illisible ne sert plus rien', S,
   "return !!(ficheSansFormule(e) && s && (s.surs || []).some(aboDeGestion) && !(fp && fp.f && fp.f !== 'gratuit'));",
   "return false;", ['727', '844']),
  ('M8 gratuitPayeIllisible : l\'abonnement d\'une voisine d\'adresse sert la petite', S,
   "return !!(ficheSansFormule(e) && s && (s.surs || []).some(aboDeGestion) && !(fp && fp.f && fp.f !== 'gratuit'));",
   "return !!(ficheSansFormule(e) && s && !(fp && fp.f && fp.f !== 'gratuit'));", ['727', '842']),
  ('M9 rappel J-7 : ne rejoue plus la règle de la fiche Gratuit payée illisible', S,
   "const servie = gratuitPayeIllisible(e, s, fp) ? formuleGratuitIllisible(s) : ((fp && fp.f) || e.formule);",
   "const servie = (fp && fp.f) || e.formule;", ['844']),
  ('M10 Mon espace : ne lit plus la règle unique de suspension', S,
   "  if (accesSuspenduPar(p, f) || (espaceEstSuspendu(tE) && sursisJoursDe(tE) === 0)) return { statut: 'suspendu' };",
   "  if (p.bloque || (espaceEstSuspendu(tE) && sursisJoursDe(tE) === 0)) return { statut: 'suspendu' };", ['727']),
  ('M11 route Tour : la formule Gratuit de nouveau acceptée', S,
   "  if (f === 'gratuit') return res.status(400).json({ error: REFUS_GRATUIT });\n  if (!RANG_FORMULE.includes(f)) return res.status(400).json({ error: 'formule inconnue' });\n  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));",
   "  if (!['gratuit', 'pro', 'business', 'premium'].includes(f)) return res.status(400).json({ error: 'formule inconnue' });\n  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));", ['761', '842', '845', '727', '848']),
  ('M12 app : une réponse « formule + paye:false » n\'est plus lue comme une suspension', A,
   "const nonPaye=!!(j.formule&&(j.paye!==true||!PLANS[j.formule]));",
   "const nonPaye=false;", ['845', '848']),
  ('M13 app : une page d\'erreur du proxy décide de nouveau', A,
   "    if(!r.ok||!j||j.ok!==true) return;\n", "", ['845']),
  ('M14 app : une vérification impossible pose de nouveau un état', A,
   "if(!j.verificationImpossible){ try{ suspensionPoser(",
   "if(true){ try{ suspensionPoser(", ['761', '845']),
  ('M15 app : la bêta peut être suspendue', A,
   "function accesSuspendu(){ return !BETA_ESSAI && suspensionGrise(); }",
   "function accesSuspendu(){ return suspensionGrise(); }", ['761', '749']),
  ('M16 app : les Paramètres sont grisés aussi (plus moyen de régler)', A,
   "function suspensionBloque(k){ return k!=='parametres' && accesSuspendu(); }",
   "function suspensionBloque(k){ return accesSuspendu(); }", ['761']),
  ('M17 app : la suspension ne grise plus les catégories', A,
   "if(!horsSusp&&suspensionBloque(k)) return true; ", "", ['761', '751']),
  ('M18 app : un « gratuit » resté dans une base d\'avant n\'est plus lu Pro', A,
   "  return PLANS[f]?f:'pro'; }", "  return f; }", ['838', '761']),
  ('M19 app : go() ne mène plus à l\'écran « Accès suspendu »', A,
   "if(accesSuspendu()){ if(view!=='parametres') view='suspendu'; }", "if(false){ if(view!=='parametres') view='suspendu'; }", ['775', '751', '761']),
  ('M21 route etat : la suspension de la Tour rend des jours de sursis à qui ne paie pas', S,
   "motif: 'accès suspendu', opMessages, metier, versionMin, enLigne, suspendu: true, sursisJours: 0 });",
   "motif: 'accès suspendu', opMessages, metier, versionMin, enLigne, suspendu: true, sursisJours: (!p.bloque && suspendu && sursisJours > 0) ? sursisJours : 0 });", ['761']),
  ('M22 app : l\'accès revenu, une adresse #v=suspendu restée garde l\'écran « Accès suspendu »', A,
   "  else if(view==='suspendu') view='dashboard';\n", "", ['775', '761']),
  ('M23 réglage à la main ÉCHU : il décide de nouveau (payeur suspendu, période ignorée)', S,
   "  return !(court && e.aboFin && e.aboFin < (jour || new Date().toISOString().slice(0, 10)));",
   "  return true;", ['727', '844', '840']),
  ('M24 rappel J-7 : le réglage à la main se juge de nouveau AUJOURD\'HUI (lien de paiement à une abonnée)', S,
   "if (aboManuelDe(e, jourApres(finLe))) return { etat: 'aucun' };",
   "if (aboManuelDe(e)) return { etat: 'aucun' };", ['844']),
  ('M25 facturation différée : le réglage à la main se juge de nouveau aujourd\'hui', S,
   "if (lue && aboManuelDe(lue, jourApres(po.finLe))) return null;",
   "if (lue && aboManuelDe(lue)) return null;", ['840']),
  ('M26 Stripe illisible redevient « rien de payé »', S,
   "const illisible = !s && cle && (!espStripeCache.data || perimee);",
   "const illisible = false;", ['727', '761']),
  ('M27 route : le doute servi comme un paiement (formule de la fiche)', S,
   "    if (p.inconnu) return res.json({ ok: true, verificationImpossible: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });\n",
   "", ['761']),
  ('M28 registre des codes illisible : de nouveau « non payé » (fiche payante)', S,
   "  if (promosIllisible) return payeInconnu('registre des codes illisible');\n  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };",
   "  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };", ['803']),
  ('M29 Mon espace : le doute dit une formule', S,
   "  if (!p || p.inconnu) return '';",
   "  if (!p) return '';", ['727']),
  ('M30 fiche Gratuit payée d\'avant la bascule : toujours Pro, même au tarif Business Premium', S,
   "  return rang >= 0 ? RANG_FORMULE[rang] : 'pro';",
   "  return 'pro';", ['727']),
  ('M31 « Revoir le lien » : la garde ne lit plus que prev.t', S,
   "  const tPrev = String(espaceT(prev) || '');",
   "  const tPrev = String(prev.t || '');", ['848']),
  ('M32 réglage échu : le motif ne le dit plus à la Tour', S,
   "  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };",
   "  return { paye: false, motif: 'aucun paiement ni code promo' };", ['727']),
  ('M33 app : un code promo tapé depuis l\'écran suspendu ne relit plus l\'état', A,
   "    try{ if(typeof _susp!=='undefined'&&_susp&&_susp.suspendu){ await forfaitServeurSync(true); encoreSusp=accesSuspendu(); } }catch(e){}\n",
   "", ['803']),
  ('M34 app : « ＋ Créer » pendant une suspension dit de nouveau « aucune création »', A,
   "  if(typeof accesSuspendu==='function'&&accesSuspendu()){ go('suspendu'); return; }\n",
   "", ['761']),
  ('M35 app : « J\'ai réglé — vérifier » affirme de nouveau sans avoir lu', A,
   "  let lu=false; try{ lu=await forfaitServeurSync(true); }catch(e){}",
   "  let lu=true; try{ await forfaitServeurSync(true); }catch(e){}", ['761']),
  ('M36 app : forfaitServeurSync dit « lu » sur une vérification impossible', A,
   "_placesSrv=null; return !j.verificationImpossible; }",
   "_placesSrv=null; return true; }", ['845']),
  ('M37 Tour : le courriel de bienvenue nomme de nouveau « Payer mon abonnement »', T,
   "Ton accès s\\'ouvre dès que ton abonnement est réglé : au premier lancement, l\\'application affiche « Accès suspendu » et le bouton « Régler mon abonnement ».",
   "Pour débloquer tous les avantages de ta formule : paye ton abonnement (l\\'app te guide, bouton « Payer mon abonnement »).", ['841']),
  # ── seconde relecture de `gardien` et de `relecteur` (30 septembre 2026, commit de la seconde passe) ──
  ('M38 horloge de conservation : un doute compte de nouveau (lève ou pose une date)', S,
   "        if (!r || r.doute || r.inconnu) continue;",
   "        if (!r) continue;", ['761']),
  ('M39 une liste Stripe PÉRIMÉE redevient une liste qui décide (absente = pas payée)', S,
   "  const illisible = !s && cle && (!espStripeCache.data || perimee);",
   "  const illisible = !s && cle && !espStripeCache.data;", ['727']),
  ('M40 une liste Stripe TRONQUÉE au plafond sert telle quelle', S,
   "    throw new Error('liste Stripe tronquée au plafond (' + tous.length + ' abonnements)');\n",
   "", ['727']),
  ('M41 doute du registre : la fiche seule redécide de la formule (Pro au lieu du code)', S,
   "    formuleServie: formulePromo(e, e.codePromo) || e.formule };",
   "    };", ['727']),
  ('M42 Mon espace : la suspension posée dans la Tour (sursis écoulé) n\'y paraît plus', S,
   "  if (accesSuspenduPar(p, f) || (espaceEstSuspendu(tE) && sursisJoursDe(tE) === 0)) return { statut: 'suspendu' };",
   "  if (accesSuspenduPar(p, f)) return { statut: 'suspendu' };", ['727']),
  ('M43 route etat : le motif complet (nom de la Tour, chemin Stripe) repart au public', S,
   "paye: true, motif: motifPublic(p.motif), opMessages",
   "paye: true, motif: p.motif, opMessages", ['848', '845', '803']),
  ('M43b motifPublic laisse tout passer', S,
   r"  return /^code promo \S+ \(jusqu'au \d{4}-\d{2}-\d{2}\)$/.test(s) ? s : 'accès actif';",
   "  return s;", ['727', '848']),
  ('M44 Tour : un code SANS identifiant d\'espace s\'enregistre de nouveau', S,
   "  if (!t) return res.status(400).json({ error: 'code illisible : il ne porte pas l",
   "  if (false) return res.status(400).json({ error: 'code illisible : il ne porte pas l", ['848']),
  ('M45 la minute d\'échec de Stripe n\'est plus remise à zéro par une lecture réussie', S,
   "espStripeCache.echecTs = 0; espStripeCache.echecDepuis = 0; },",
   "espStripeCache.echecTs = 0; },", ['727']),
  ('M45b la minute d\'échec repart à chaque échec (la panne ne dure jamais 90 minutes)', S,
   "espStripeCache.echecDepuis = espStripeCache.echecDepuis || Date.now();",
   "espStripeCache.echecDepuis = Date.now();", ['727']),
  ('M46 la surveillance ne crie plus quand Stripe ne se lit plus', V,
   "    if (j.stripeEchecMin >= 90) {",
   "    if (false) {", ['727']),
  ('M47 /health ne publie plus la minute d\'échec de Stripe', S,
   "atts: !!pieces, boite: !!(config.imap && config.imap.user), stripe: !!(config.stripe && config.stripe.secretKey), stripeEchecMin: stripeEchecMin(), ",
   "atts: !!pieces, boite: !!(config.imap && config.imap.user), stripe: !!(config.stripe && config.stripe.secretKey), ", ['761']),
  ('M48 app : « J\'ai réglé — vérifier » ne rend plus son bouton (Paramètres : grisé pour de bon)', A,
   "    try{ if(btn&&btn.isConnected){ btn.disabled=false; btn.innerHTML=html; } }catch(e){}\n",
   "", ['761']),
  ('M49 app : le 🔒 parle de règlement à tout le monde', A,
   ":'Accès momentanément suspendu';",
   ":'Accès suspendu jusqu’au règlement de l’abonnement';", ['761']),
  ('M50 app : le non-administrateur lit de nouveau « Ton administrateur est prévenu »', A,
   "<b>Ton administrateur peut le rétablir depuis son application.</b>",
   "<b>Ton administrateur est prévenu.</b>", ['761']),
  ('M51 app : code accepté, accès PAS rouvert — l\'annonce ne le dit plus', A,
   "await forfaitServeurSync(true); encoreSusp=accesSuspendu(); }",
   "await forfaitServeurSync(true); }", ['803']),
  ('M52 app : la largesse d\'une période offerte relit la suspension SANS la règle de la bêta', A,
   "e.finLe>=todayISO()&&!accesSuspendu()); }",
   "e.finLe>=todayISO()&&!suspensionGrise()); }", ['838', '761']),
  ('M53 app : la proposition d\'abonnement bloque de nouveau la bêta suspendue', A,
   "  if(!BETA_ESSAI&&_susp.suspendu){ if(confirm('Abonnement en attente de règlement",
   "  if(_susp.suspendu){ if(confirm('Abonnement en attente de règlement", ['838', '761']),
  # ── troisième relecture de `gardien` et de `relecteur` (30 septembre 2026) ──
  ('M54 app : la bêta reçoit de nouveau le rappel « Abonnement non réglé »', A,
   "    if(BETA_ESSAI || !_susp.suspendu || !currentUser || currentUser.role!=='admin') return;",
   "    if(!_susp.suspendu || !currentUser || currentUser.role!=='admin') return;", ['761']),
  ('M55 app : « J\'ai réglé — vérifier » garde son TEXTE (le bouton revient sans son icône)', A,
   "html=btn.innerHTML; btn.disabled=true;",
   "html=btn.textContent; btn.disabled=true;", ['761']),
  ('M56 paiement : un impayé réglé depuis la liste se rachète de nouveau (second abonnement)', S,
   "  if (regle) return { refus: 409, error: 'impaye_regle' };\n",
   "", ['845']),
  ('M57 J-7 : un abonnement ANNULÉ depuis la liste « prend le relais » de nouveau', S,
   "            if (lue && !lue.impaye && STATUTS_PAYES.includes(lue.statut)) {",
   "            if (lue && !lue.impaye) {", ['844']),
  ('M58 fiche « Gratuit » trouvée dans une liste périmée sans OP GESTION : de nouveau suspendue', S,
   "    if (perimee) return payeInconnu('liste Stripe périmée (la relecture a échoué)');\n",
   "", ['727']),
  ('M59 OP MESSAGES seul dans une liste périmée : de nouveau suspendue', S,
   "if (f === 'gratuit') return perimee ?",
   "if (f === 'gratuit') return false ?", ['727']),
  ('M60 la panne de Stripe ne se relit plus d\'elle-même', S,
   "setInterval(stripeRelirePanne, 5 * 60000).unref();\n",
   "", ['727']),
  ('M60b la relecture de la panne n\'attend plus la minute d\'attente', S,
   "  if (Date.now() - espStripeCache.echecTs <= 60000) return false;\n",
   "", ['727']),
  ('M61 page de paiement : l\'impayé réglé redevient « Le paiement n\'a pas pu s\'ouvrir »', R,
   "    else if (r && r.status === 409 && j && j.error === 'impaye_regle') compteMsg",
   "    else if (false) compteMsg", ['845']),
  ('M62 factureOuverteDe ne rend plus le statut d\'un abonnement réglé', S,
   "return { impaye: false, url: '', statut: String(d.status || '') };",
   "return { impaye: false, url: '' };", ['845', '844']),
  ('M20 portail : une formule « Gratuit » redevient affichée comme un abonnement', P,
   "return (p&&!/^(découverte|gratuit)$/i.test(p))?p:''; }", "return p; }", ['848', '813']),
  # ── A3 « Suspend » (Justin, 30 septembre 2026) : une fiche SANS formule suit le chemin de la fiche Gratuit ──
  ('A1 route : une fiche sans formule reçoit de nouveau tout l\'accès, avant espacePaye', S,
   "  if (!e) return res.json({ ok: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });",
   "  if (!e || !e.formule) return res.json({ ok: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });", ['761', '842']),
  ('A2 route : une entreprise ABSENTE de l\'annuaire passe par espacePaye (un annuaire illisible suspendrait tout le monde)', S,
   "  if (!e) return res.json({ ok: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });",
   "  if (false) return res.json({ ok: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });", ['761']),
  ('A3 ficheSansFormule : la fiche sans formule n\'est plus reconnue (seule « gratuit »)', S,
   "function ficheSansFormule(e) { return !!e && (!e.formule || e.formule === 'gratuit'); }",
   "function ficheSansFormule(e) { return !!e && e.formule === 'gratuit'; }", ['727', '761']),
  ('A4 espacePaye : la fiche sans formule ressort sur « aucune formule » avant la période et Stripe', S,
   "  if (!e) return { paye: false, motif: 'aucune formule' };",
   "  if (!e || !e.formule) return { paye: false, motif: 'aucune formule' };", ['727', '761']),
  ('A5 motif : « aucune formule » n\'est plus en tête (l\'horloge de conservation ne dit plus « jamais abonnée »)', S,
   ": 'aucune formule posée dans la Tour';",
   ": 'fiche sans formule, posée par personne';", ['727', '761']),
  ('A6 « Mon espace » : une fiche sans formule ne dit de nouveau rien', S,
   "  if (!e || espaceFerme(espaceT(e))) return '';\n  const p = await espacePaye(e, { lecture: true });",
   "  if (!e || !e.formule || espaceFerme(espaceT(e))) return '';\n  const p = await espacePaye(e, { lecture: true });", ['727']),
  ('A7 rappel J-7 : une fiche sans formule ne se juge plus sur Stripe (lien de paiement à une abonnée)', S,
   "  if (aboManuelDe(e, jourApres(finLe))) return { etat: 'aucun' };   // le lendemain de la période (`gardien` B2)",
   "  if (!e.formule || aboManuelDe(e, jourApres(finLe))) return { etat: 'aucun' };   // le lendemain de la période (`gardien` B2)", ['844']),
  ('A8 rappel J-7 : « rien de servi » n\'est plus reconnu (seul « gratuit »)', S,
   "  if (!RANG_FORMULE.includes(servie)) return { etat: 'aucun' };",
   "  if (servie === 'gratuit') return { etat: 'aucun' };", ['844']),
  ('A9 impayeBloque : une fiche sans formule bloquée par l\'impayé d\'une voisine (règle « rien de payé »)', S,
   "  if (s || ficheSansFormule(e)) return (imp.surs || []).length > 0;",
   "  if (s || (e && e.formule === 'gratuit')) return (imp.surs || []).length > 0;", ['727']),
  ('A10 aboManuelDe : un « actif » à la main sur une fiche sans formule redevient payé', S,
   "  if (court && ficheSansFormule(e)) return false;   // (sans formule non plus : quelle formule servirait-il ?)",
   "  if (court && e.formule === 'gratuit') return false;", ['727']),
  ('A11 Tour : la fiche sans formule ne dit plus « application suspendue »', T,
   "    el.innerHTML='Aucune formule attribuée'+(d.paye===false",
   "    el.innerHTML='Aucune formule attribuée'+(false", ['842']),
  ('A12 Tour : la ligne d\'un accès public ne dit plus que l\'application est suspendue', T,
   "  var nonPaye=!e.suspendu&&e.paye===false;",
   "  var nonPaye=false;", ['842']),
  # ── Relecture de `gardien` sur A3 (30 septembre 2026) : deux entreprises qui PAIENT, suspendues à tort — et ce que ses bancs
  #    ont trouvé ensuite (le rattrapage d'un code, une entreprise à plusieurs noms réglée par la Tour) ──
  ('B1 espacePaye : l\'identifiant d\'une entrée d\'avant n\'est plus lu dans son code (le rattrapage ne l\'active plus)', S,
   "  if (!e.t) { const tCode = espaceT(e); if (tCode) e = Object.assign({}, e, { t: tCode }); }\n",
   "", ['761']),
  ('B2 periodeOfferte : l\'identifiant lu en clair seulement (seule, neutre : `espacePaye` le pose déjà)', S,
   "      const eq = u && u.equipes && u.equipes[espaceT(e)];",
   "      const eq = u && u.equipes && u.equipes[e.t];", ['761', '727']),
  ('B2b les deux ensemble : une entrée d\'avant en période offerte redevient suspendue', S,
   "  if (!e.t) { const tCode = espaceT(e); if (tCode) e = Object.assign({}, e, { t: tCode }); }\n",
   "", ['761'], [("      const eq = u && u.equipes && u.equipes[espaceT(e)];", "      const eq = u && u.equipes && u.equipes[e.t];")]),
  ('B3 espaceParT : sert la fiche du dernier nom, sans la facturation de l\'entreprise', S,
   "  return facturationDe(Object.assign({ slug }, espacesReg[slug]));",
   "  return Object.assign({ slug }, espacesReg[slug]);", ['761', '842', '845']),
  ('B4 facturationDe : plus « groupe par groupe » — un nom qui porte une formule garde sa fiche entière', S,
   "  if (noms.length < 2) return e;   // un seul nom : sa fiche EST la facturation",
   "  if (noms.length < 2 || e.formule || e.aboStatut) return e;", ['761']),
  ('B5 Tour (formule) : repart de la fiche du nom, pas de la facturation de l\'entreprise', S,
   "  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));\n  facturationReprendre(e);",
   "  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));", ['842']),
  ('B6 Tour (formule) : n\'écrit plus sur les autres noms de l\'entreprise', S,
   "  facturationPartager(e, [0, 1]);   // … écrite sur TOUS les noms de l'entreprise (l'abonnement repris compris)",
   "", ['842']),
  ('B7 Tour (abonnement) : n\'écrit plus sur les autres noms de l\'entreprise', S,
   "  facturationPartager(e, [0, 1]);   // … écrite sur TOUS les noms de l'entreprise\n",
   "", ['842']),
  ('B8 liste de la Tour : la ligne d\'un nom dit sa fiche, pas la facturation de l\'entreprise', S,
   "    const e = facturationDe(e0);   // la ligne entière",
   "    const e = e0;   // la ligne entière", ['842']),
  ('B9 fiche de la Tour (statut) : la fiche du nom, pas la facturation de l\'entreprise', S,
   "  const e = facturationDe(espacesReg[slug]);   // la fiche montre",
   "  const e = espacesReg[slug];   // la fiche montre", ['842']),
  ('B10 horloge de conservation : lit la fiche de chaque nom (une entreprise payée datée « jamais abonnée »)', S,
   "        try { r = await espacePaye(Object.assign({}, facturationDe(e), { slug: slug }), { lecture: true }); } catch (err) { r = null; }",
   "        try { r = await espacePaye(Object.assign({}, e, { slug: slug }), { lecture: true }); } catch (err) { r = null; }", ['761']),
  ('B11 page de paiement : l\'impayé se juge sur la fiche du nom visé', S,
   "    try { p = await espacePaye(Object.assign({ slug: e.slug }, facturationDe(e)), { lecture: true }); } catch (err) { p = null; }",
   "    try { p = await espacePaye(Object.assign({ slug: e.slug }, e), { lecture: true }); } catch (err) { p = null; }", ['845']),
  ('B12 route d\'un nom neuf : reporte depuis le même nom seulement (né sans formule ni abonnement)', S,
   "  const base = facturationDe(Object.keys(prev).length ? prev : (ref || {}));",
   "  const base = prev;", ['842']),
  ('B13 rattrapage d\'un code : de nouveau « réservé aux fiches payantes »', S,
   "    if (e.codePromo && e.t) {",
   "    if (e.codePromo && e.t && !ficheSansFormule(e)) {", ['761']),
  ('B14 code appliqué par la Tour : la fiche du nom décide (un code Pro fait descendre l\'entreprise)', S,
   "  const fE = facturationDe(e).formule;   // (celle de l'ENTREPRISE : un autre de ses noms peut porter mieux)\n  if (!fE || fE === 'gratuit') { e.formule = f;",
   "  const fE = e.formule;\n  if (!fE || fE === 'gratuit') { e.formule = f;", ['842']),
]

def appliquer(fichier, avant, apres):
    chemin = os.path.join(ARBRE, fichier)
    s = open(chemin, encoding='utf-8').read()
    n = s.count(avant)
    if n != 1:
        return 'ancre trouvée %d fois' % n
    open(chemin, 'w', encoding='utf-8').write(s.replace(avant, apres))
    return ''

def banc(n):
    try:
        r = subprocess.run('node tests/test-%s.js' % n, cwd=ARBRE, shell=True, capture_output=True, text=True, timeout=400)
    except subprocess.TimeoutExpired:
        return False, 'délai dépassé'
    import re
    tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout + r.stderr)
    dernier = tot[-1] if tot else ('?', '?')
    return r.returncode == 0, '%s ✓ %s ✗ (code %d)' % (dernier[0], dernier[1], r.returncode)

# Mutations NEUTRES, vérifiées à la main : elles ne changent AUCUN comportement (une autre ligne fait déjà le travail).
# M10 : `formuleServieDe` pose `f = ''` quand rien n'est payé, donc `!RANG_FORMULE.includes(f)` suspend déjà — retirer
# `!p.paye` du test ne change rien. Une mutation neutre ne dit rien du banc (CLAUDE.md, « une mutation qui ne casse rien »).
NEUTRES = {'B2'}   # (M10 était neutre tant que « Mon espace » avait sa propre copie de la règle ; elle lit désormais `accesSuspenduPar`)
# B2 : `periodeOfferte` n'est appelée que par `espacePaye` (après que B1 a posé l'identifiant) et avec `{ t }` explicite (rappel
# J-7) — lire `e.t` y revient au même. Elle garde `espaceT` pour un appelant futur ; B2b (les deux ensemble) mord.
bilan = []
for m in MUT:
    (nom, fichier, avant, apres, bancs) = m[:5]
    err = appliquer(fichier, avant, apres)
    for (av2, ap2) in (m[5] if len(m) > 5 else []):
        err = err or appliquer(fichier, av2, ap2)
    if err:
        bilan.append((nom, 'ANCRE', err)); print('✗ ' + nom + ' — ' + err, flush=True); continue
    # la mutation a bien touché le fichier (et lui seul)
    d = sh('git diff --stat', cwd=ARBRE).stdout.strip().splitlines()
    mord = []
    for n in bancs:
        vert, txt = banc(n)
        if not vert:
            mord.append('test-%s : %s' % (n, txt))
            break
    sh('git checkout -- ' + fichier, cwd=ARBRE)
    propre = sh('git status --porcelain --untracked-files=no', cwd=ARBRE).stdout.strip()
    if mord:
        bilan.append((nom, 'MORD', mord[0])); print('✓ ' + nom + ' — ' + mord[0], flush=True)
    elif nom.split(' ')[0] in NEUTRES:
        bilan.append((nom, 'NEUTRE', '')); print('· ' + nom + ' — neutre, comme attendu (voir NEUTRES)', flush=True)
    else:
        bilan.append((nom, 'NE MORD PAS', ', '.join(bancs))); print('✗ ' + nom + ' — aucun banc ne tombe (' + ', '.join(bancs) + ')', flush=True)
    if propre:
        print('   ⚠️ arbre pas propre après restauration : ' + propre, flush=True)

print('\n%d / %d mutations mordent (%d neutre(s), vérifiée(s) à la main)' % (sum(1 for b in bilan if b[1] == 'MORD'), len(bilan) - sum(1 for b in bilan if b[1] == 'NEUTRE'), sum(1 for b in bilan if b[1] == 'NEUTRE')))
sh('git worktree remove --force ' + ARBRE, cwd=DEPOT)
