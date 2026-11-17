// Contre-épreuve de « Mon entreprise » et d'« Achats et frais » : on REMET dans une COPIE de la page un défaut que les sondes gardent, et on exige que la
// sonde concernée TOMBE. « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer » — et une mutation qui ne casse rien est une mutation mal visée :
// chaque remplacement doit toucher EXACTEMENT une occurrence, sinon rien n'est joué (le script s'arrête et le dit). La copie va dans /tmp (jamais le dépôt) :
// aucune mutation ne touche un fichier suivi, rien à restaurer. Complété d'étape en étape (étape 4 : M1 à M18 ; les droits ajouteront les leurs).
// node scratchpad/proto-final/sondes/entreprise-mutations.js [filtre]      (DRY=1 : seulement vérifier que chaque mutation vise juste)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-entreprise';
const SRC = fs.readFileSync(PAGE, 'utf8');
const M = [
  ['1 · le filtre < > " du nom est retiré (le nom injecte du HTML)', "const ENT_INTERDIT = /[<>\"]/,", "const ENT_INTERDIT = /(?!)/,", ['rapide']],
  ['2 · l’adresse n’est plus écrite en UNE chaîne (la ville se perd)', "adr:`${V['en-rue']}, ${V['en-cp']} ${V['en-ville']}`", "adr:V['en-rue']", ['rapide']],
  ['3 · PAIE_CAB redevient une COPIE du cabinet (le nouveau cabinet ne reçoit pas la paie)', "const PAIE_CAB = { get nom(){ return typeof CP_EXPERT !== 'undefined' ? CP_EXPERT.cab : 'Cabinet de paie'; }, get qui(){ return typeof CP_EXPERT !== 'undefined' ? CP_EXPERT.qui : ''; }, get mail(){ return typeof CP_EXPERT !== 'undefined' ? CP_EXPERT.mail : ''; } };", "const PAIE_CAB = { nom:CP_EXPERT.cab, qui:CP_EXPERT.qui, mail:CP_EXPERT.mail };", ['rapide', 'destinations']],
  ['4 · UN gabarit (la facture) écrit de nouveau « CS » en dur', "return `<div class=\"pdf\" ${f.num==='—' ? 'data-brouillon=\"1\"' : ''}><div class=\"pdf-tete\">${logoEnt('div')}", "return `<div class=\"pdf\" ${f.num==='—' ? 'data-brouillon=\"1\"' : ''}><div class=\"pdf-tete\"><div class=\"logo-ent\">CS</div>", ['rapide']],
  ['5 · l’assurance s’écrit de nouveau sous l’ancien nom « assur » (l’atelier ne la reçoit pas)', "assureur:V['fl-ass'], assurNum:V['fl-num']", "assur:V['fl-ass'], assurNum:V['fl-num']", ['rapide']],
  ['6 · envoyerFacture n’interroge plus l’identité (la porte est ouverte)', "function envoyerFacture(f, muet){ const M = entrepriseManque(); if (M.length)", "function envoyerFacture(f, muet){ const M = []; if (M.length)", ['rapide', 'garde']],
  ['7 · ACTIONS.envoyer ignore le refus (l’écran dit « Facture envoyée » après un refus)', "    if (!envoyerFacture(f)) return;   /* le manque est dit par la porte", "    envoyerFacture(f);   /* le manque est dit par la porte", ['rapide', 'garde']],
  ['8 · terminer n’est plus retenu par un client sans e-mail', " && entClientJoignable(fa.cli)) envoyerFacture(fa, true);", ") envoyerFacture(fa, true);", ['rapide', 'garde']],
  ['9 · toutValider dit « 0 facture envoyée » au lieu du manque (une phrase pour le lot)', "    if (L.length && !parties.length) return entRefusFacture(entrepriseManque(), { aucune:true });", "", ['rapide', 'garde']],
  ['10 · terminer parle au technicien (le refus n’est plus silencieux : envoyerFacture sans « muet »)', "envoyerFacture(fa, true);   /* elle attend « à valider »", "envoyerFacture(fa);   /* elle attend « à valider »", ['garde']],
  ['11 · le SIRET de démonstration est refusé (la clé de contrôle bloque au lieu d’avertir)', "['fl-siret', v => /^\\d{14}$/.test(v.replace(/\\s/g, '')) ? '' :", "['fl-siret', v => /^\\d{14}$/.test(v.replace(/\\s/g, '')) && cxSirenOk(v.replace(/\\s/g, '').slice(0, 9)) ? '' :", ['rapide', 'champs']],
  ['12 · la lecture seule laisse les champs actifs', "P.querySelectorAll('input, select, textarea').forEach(e => { e.disabled = true; });", "", ['rapide', 'lecture-seule']],
  ['13 · la lecture seule n’avale plus l’écriture forcée', "  if (!entModifiable()) return toast('Ce geste n’est pas ouvert à ton compte : changer la fiche de l’entreprise. Demande à ' + esc(entPremierAdmin()) + '.');\n  if (a === 'identok')", "  if (a === 'identok')", ['lecture-seule']],
  ['14 · le lien « Rendez-vous en ligne » n’ouvre plus le panneau', "if (k === 'rdv') { aller('planning'); return entApres(panneauReglagesRdv); }", "if (k === 'rdv') { aller('planning'); return; }", ['rapide', 'liens']],
  ['15 · le lien « Notes de frais » reste proposé à qui ne peut pas les régler', "voit:rlPermis('achats') && entModifiable() }", "voit:rlPermis('achats') }", ['lecture-seule']],
  ['16 · un SVG qui porte un script est accepté comme logo', "if (/<script|\\son[a-z]+\\s*=|javascript:|<foreignObject|<iframe/i.test(x))", "if (false)", ['logo']],
  ['17 · le panneau « Rendez-vous en ligne » reprend son surtitre « Paramètres »', "ouvrirPanneau(`<span class=\"surtitre\">Planning</span><h2>Rendez-vous en ligne</h2>", "ouvrirPanneau(`<span class=\"surtitre\">Paramètres</span><h2>Rendez-vous en ligne</h2>", ['rapide', 'phrases']],
  ['18 · « Comment ça marche » promet de nouveau un plafond (il n’existe pas)', "• il manque ton nom, ton adresse ou ton SIRET dans", "• le total dépasse le plafond que tu fixes ;<br>• il manque ton nom, ton adresse ou ton SIRET dans", ['garde', 'phrases']],
  ['19 · Achats redevient QUATRE chiffres (deux d’entre eux mènent ailleurs)', "<div class=\"kpis ach-k2\"><button type=\"button\" class=\"kpi\" data-ac=\"onglet|demandes\">", "<div class=\"kpis ach-k2\"><button type=\"button\" class=\"kpi\" data-cx=\"sec|factures|achats|traiter\"><b>0</b><span>à payer</span></button><button type=\"button\" class=\"kpi\" data-ac=\"onglet|demandes\">", ['rapide', 'achats-lisible']],
  ['20 · la ligne grise du menu Achats redevient trop longue', "['achats','🛒','Achats et frais',0,'Demandes de l’équipe']", "['achats','🛒','Achats et frais',0,'Demandes et notes de frais à décider']", ['achats-lisible']],
  ['21 · « ＋ Demande » reste dessiné en lecture seule', "${lect ? '' : '<div class=\"actions ach-act\">", "${false ? '' : '<div class=\"actions ach-act\">", ['achats-lisible']],
  ['22 · la pastille du menu compte aussi pour qui ne peut pas modifier', "n = entModifiable() ? entrepriseManque().length : 0;", "n = entrepriseManque().length;", ['lecture-seule']],
  ['23 · le BIC n’est plus écrit sur la facture', " + (ENTREPRISE.bic ? ' · BIC ' + ENTREPRISE.bic : '') + '<br>Carte", " + '<br>Carte", ['rapide', 'destinations']],
  ['24 · une écriture de la fiche légale ne passe plus par la garde de lecture', "entEnregistrerLegal = function () { if (!entModifiable()) return toast(", "entEnregistrerLegal = function () { if (false) return toast(", ['lecture-seule']]
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {   // une copie du dépôt visible du serveur : apercu/ en liens, sauf la page mutée
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, ancien, neuf, sondes] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  const c = SRC.split(ancien).length - 1;
  if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué`); process.exit(2); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const page = SRC.replace(ancien, () => neuf), R = racine('m', page);
  if (page === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const s of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, 'entreprise-' + s + '.js')], { env: { ...process.env, RACINE: R, RAPIDE: '1' }, encoding: 'utf8', timeout: 400000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n').find(l => /Error/.test(l)) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if (r.status !== 0) { tombe = true; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log(`${tombe ? '✓ tombe' : '✗ VIVANTE'} · ${nom} ·${detail}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
if (!process.env.DRY) { console.log(`\n== ${tombes} mutation(s) sur ${jouees} font tomber une sonde`); if (vivantes.length) { console.log('VIVANTES (la sonde ne regarde pas au bon endroit) :'); vivantes.forEach(n => console.log('  ✗ ' + n)); process.exit(1); } }
