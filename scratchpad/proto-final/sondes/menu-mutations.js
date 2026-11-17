// Contre-épreuve : on REMET dans une COPIE de la page un défaut que les sondes « menu » gardent, et on exige que la sonde concernée TOMBE.
// « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer » — et une mutation qui ne casse rien est une mutation mal visée :
// chaque remplacement doit toucher EXACTEMENT une occurrence, sinon rien n'est joué (le script s'arrête et le dit).
// node scratchpad/proto-final/sondes/menu-mutations.js [filtre]   (RAPIDE=1 est posé pour les sondes longues)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-menu';
const SRC = fs.readFileSync(PAGE, 'utf8');
const M = [
  ['1 · le petit gris sous Comptabilité disparaît', "['comptabilite','📊','Comptabilité',0,'Factures, paiements, paie']", "['comptabilite','📊','Comptabilité',0,'']", ['ordinateur']],
  ['2 · le groupe « Travail » reprend l\'ancien nom « Planification »', "['Travail', [['planning'", "['Planification', [['planning'", ['ordinateur']],
  ['3 · « Dépôts et camions » redevient « Boxes » au menu', "['boxes','🧱','Dépôts et camions']", "['boxes','🧱','Boxes']", ['ordinateur']],
  ['4 · « Mes congés » du technicien redevient « Absences & congés »', "tech:{ taches:'Mes tâches', absences:'Mes congés' }", "tech:{ taches:'Mes tâches', absences:'Absences & congés' }", ['ordinateur']],
  ['5 · le logo ramène toujours à « accueil » (pas à l\'ouverture du rôle)', "ouvertureDe(eqDe(acteur()));   /* la première rubrique que la personne a le droit d'ouvrir */", "'accueil';   /* la première rubrique que la personne a le droit d'ouvrir */", ['ordinateur']],
  ['6 · la barre du bureau perd « Achats »', "equipe:['comptabilite', 'devis', 'clients', 'taches', 'achats', 'interventions',", "equipe:['comptabilite', 'devis', 'clients', 'taches', 'interventions',", ['telephone']],
  ['7 · « Interventions » redevient « Interv. » dans la barre', "const MB_COURT = { entreprise:'Entreprise', produits:'Produits',", "const MB_COURT = { interventions:'Interv.', entreprise:'Entreprise', produits:'Produits',", ['telephone']],
  ['8 · le bouton « Menu » perd son mot', '<span class="tt-mot">Menu</span>', '', ['telephone']],
  ['9 · la feuille « Menu » reprend son ancien titre', '<h2>Menu</h2>${p && enApp()', '<h2>Toutes les catégories</h2>${p && enApp()', ['telephone']],
  ['10 · le pied de la feuille perd « Nouveautés »', "const nv = enApp() ? `<button type=\"button\" class=\"nv-menu\"", "const nv = false ? `<button type=\"button\" class=\"nv-menu\"", ['telephone']],
  ['11 · une adresse inconnue ne ramène plus à l\'ouverture', "if (!routeConnue(route)) { const o = rlOuverture();", "if (false) { const o = rlOuverture();", ['memoire']],
  ['12 · Jour / Nuit / Auto ne se retient plus', "try { localStorage.setItem(MODE_CLE, mode); } catch (e) { /* rangement plein ou refusé : le choix vaut pour cette ouverture */ }", "", ['memoire']],
  ['13 · l\'ancienne adresse #factures n\'allume plus Comptabilité', "Object.assign(BASE, { facture:'comptabilite', factures:'comptabilite', encaissements:'comptabilite' });", "Object.assign(BASE, { facture:'comptabilite', encaissements:'comptabilite' });", ['memoire']],
  ['14 · l\'échafaudage « Prototype : rien n\'est enregistré » reparaît en mode application', "const echafaudage = enApp() || feuille ? '' :", "const echafaudage = feuille ? '' :", ['echafaudage']],
  ['15 · « Pour l\'essai, voir comme » reparaît dans l\'Historique en mode application', "${enApp() ? '' : `<div class=\"h-comme\">", "${false ? '' : `<div class=\"h-comme\">", ['echafaudage']],
  ['16 · « Mes congés » lit un technicien fixe (Karim) au lieu de la personne connectée', "const aTech = () => (typeof ROLE !== 'undefined' && ROLE === 'tech' && ROLES.tech.qui) || 'kb';", "const aTech = () => 'kb';", ['conges']],
  ['17 · l\'interrupteur « voir l\'écran comme » reparaît chez le technicien', "const aCommeSeg = () => ROLE === 'tech' || enApp() ? '' :", "const aCommeSeg = () =>", ['conges']],
  ['18 · le groupe 3D du technicien paraît sans le pack', "coque === 'tech' ? LIGNES_TERRAIN.filter(([g]) => g !== GROUPE_3D || pack3d)", "coque === 'tech' ? LIGNES_TERRAIN", ['pack3d']],
  ['19 · « Statistiques » reprend le surtitre « Tableau de bord »', 'class="surtitre">Accueil</span><h1>Statistiques</h1>', 'class="surtitre">Tableau de bord</span><h1>Statistiques</h1>', ['renommages', 'ordinateur']],
  ['20 · « Ce que voit le client » reprend une ligne au menu du gérant', "['interventions','🧰','Interventions',1],['taches','✅','Tâches']", "['interventions','🧰','Interventions',1],['clientvoit','📱','Ce que voit le client',1],['taches','✅','Tâches']", ['ordinateur']],
  ['21 · le prototype nu perd ses « faite » (l\'échafaudage de revue)', "${c.fait && !enApp() ? '<small class=\"m-faite\" title=\"Déjà refaite\">faite</small>' : ''}", "", ['nu']],
  ['22 · le groupe « Hygiène anti-nuisibles (3D) » s\'appelle de nouveau « Métier 3D »', "const GROUPE_3D = 'Hygiène anti-nuisibles (3D)';", "const GROUPE_3D = 'Métier 3D';", ['pack3d']],
  ['23 · le poste sous le nom redevient le nom du rôle de revue (« Patron »)', "const sousMoi = R => { const p = (typeof SESSION !== 'undefined' && SESSION ? eqDe(SESSION) : null) || (R.qui ? eqDe(R.qui) : null); return p && p.role ? p.role : (H_GENS[R.qui] || {}).role || R.l; };", "const sousMoi = R => R.l;", ['poste']],
  ['24 · le renvoi des réglages de rendez-vous cite de nouveau une ligne de menu qui n\'existe plus', "Pour les voir : ouvre une intervention, touche « Voir le lien client », onglet", "Pour les voir : « Ce que voit le client », onglet", ['renommages']],
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
  const R = racine('m', SRC.replace(ancien, () => neuf)); if (fs.readFileSync(path.join(R, 'apercu', 'prototype-op-gestion.html'), 'utf8') === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const s of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, 'menu-' + s + '.js')], { env: { ...process.env, RACINE: R, RAPIDE: '1' }, encoding: 'utf8', timeout: 330000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if (r.status === 1 && /✗/.test(r.stdout || '')) { tombe = true; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' →' + detail);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
