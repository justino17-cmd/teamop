// Contre-épreuve du guide des nouveautés : on REMET dans une COPIE de la page un défaut que les sondes guide-* gardent, et on exige que la sonde concernée TOMBE.
// « Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer » — et une mutation qui ne casse rien est mal visée : chaque remplacement doit toucher
// EXACTEMENT une occurrence, sinon rien n'est joué. ⛔ Commiter le correctif AVANT de muter : on mute des COPIES (jamais le fichier du dépôt), donc rien à restaurer.
// node guide-mutations.js [filtre]   (DRY=1 : vérifie seulement que chaque mutation est bien visée)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-guide-' + (process.env.MUT_I || '0');
const SRC = fs.readFileSync(PAGE, 'utf8');
// [nom, texte visé (une seule occurrence), remplacement, [sonde, environnement]]
const M = [
  ['1 · « Voir » de la carte Comptabilité du gérant ouvre le Planning', "rangés comme chez ton comptable.', voir:'comptabilite', mot:'Comptabilité' },\n    { k:'stock'", "rangés comme chez ton comptable.', voir:'planning', mot:'Comptabilité' },\n    { k:'stock'", ['guide-voir.js', { PROFIL:'mac', QUI:'marc' }]],
  ['2 · la phrase de la carte Stock passe à 24 mots', "Tape le nom d’un article : tu vois où il est et combien il en reste.'", "Tape le nom d’un article dans la grande liste : tu vois tout de suite où il est rangé et aussi combien il en reste ce matin.'", ['guide-mots.js', { PROFIL:'mac', QUI:'marc' }]],
  ['3 · le titre de la carte Équipe passe à 8 mots', "t:'Équipe : qui peut faire quoi'", "t:'Équipe : qui peut faire quoi dans ton entreprise'", ['guide-mots.js', { PROFIL:'mac', QUI:'marc' }]],
  ['4 · la marque « vu » n\'est plus posée à l\'ouverture', "nvSync(); nvMarquer(); const f = z.querySelector('.nv-feuille');", "nvSync(); const f = z.querySelector('.nv-feuille');", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['5 · le guide s\'ouvre par-dessus une fenêtre ouverte', "function nvOccupe(){ try { return calOuverts()", "function nvOccupe(){ try { return false && calOuverts()", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['6 · le toucher en dehors de la feuille ne ferme plus le guide', "if (t && t.id === 'nv') { nvFermer(); return; }", "if (false) { nvFermer(); return; }", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['7 · Échap ne ferme plus le guide', "if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); nvFermer(); }\n  else if (ev.key === 'ArrowRight'", "if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); }\n  else if (ev.key === 'ArrowRight'", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['8 · « Voir » et « Suivant » retombent à 30 px au téléphone', ".nv-voir{align-self:stretch;min-height:52px}", ".nv-voir{align-self:stretch;min-height:30px}", ['guide-mise-en-page.js', { PROFIL:'iphone', QUI:'sm' }]],
  ['9 · le client reçoit la ligne « Nouveautés » au pied du menu', "const nv = enApp() && nvRole() ? `<button", "const nv = enApp() ? `<button", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['10 · plus de mémoire de page quand le rangement est refusé', "const nvVu = () => { if (NV_MEM.has(SESSION)) return true; try", "const nvVu = () => { try", ['guide-fermer.js', { PROFIL:'mac', QUI:'marc' }]],
  ['11 · à l\'ordinateur, la première carte parle du bouton « Plus »', "return (nvEtroit() ? [c.tel, ...L] : L).slice(0, 3); }", "return [c.tel, ...L].slice(0, 3); }", ['guide-mots.js', { PROFIL:'mac', QUI:'marc' }]],
  ['12 · la carte « Mes congés » du technicien ouvre Mes tâches', "voir:'absences', mot:'Mes congés' }", "voir:'taches', mot:'Mes congés' }", ['guide-voir.js', { PROFIL:'iphone', QUI:'sm' }]],
  ['13 · le défilement ne s\'accroche plus sur une carte', "scroll-snap-type:x mandatory;overscroll-behavior-x:contain", "overscroll-behavior-x:contain", ['guide-mise-en-page.js', { PROFIL:'iphone', QUI:'sm' }]],
  ['14 · les cartes hors de vue ne sont plus inertes', "if (k === i) e.removeAttribute('inert'); else e.setAttribute('inert', '');", "e.removeAttribute('inert');", ['guide-voir.js', { PROFIL:'mac', QUI:'marc' }]],
  ['15 · l\'ancien nom « Boxes » est resté au menu du gérant (la carte mentirait)', "['boxes','🧱','Dépôts et camions']", "['boxes','🧱','Boxes']", ['guide-mots.js', { PROFIL:'mac', QUI:'marc' }]],
  ['16 · le texte « ancien nom » est presque effacé (contraste)', ".nv-avant{flex:1 1 38%;min-width:0;color:var(--encre2,var(--encre));opacity:.85}", ".nv-avant{flex:1 1 38%;min-width:0;color:var(--encre2,var(--encre));opacity:.3}", ['guide-mise-en-page.js', { PROFIL:'mac', QUI:'marc' }]],
  ['17 · Mon camion perd son champ « Chercher une pièce » (la carte le promet)', "inputmode=\"search\" enterkeyhint=\"search\" autocomplete=\"off\" placeholder=\"Chercher une pièce\" a", "inputmode=\"search\" enterkeyhint=\"search\" autocomplete=\"off\" placeholder=\"Filtrer\" a", ['guide-mots.js', { PROFIL:'iphone', QUI:'sm' }]],
  ['18 · la première connexion n\'ouvre plus le guide', "if (v && !sessionOuvrir.muet && (!/[?&]auto=/.test(location.search) || /[?&]guide=1\\b/.test(location.search))) setTimeout(nvProposer, 900); return v;", "return v;", ['guide-premiere-connexion.js', { PROFIL:'mac', QUI:'marc' }]]
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {   // une copie du dépôt visible du serveur : apercu/ en liens, sauf la page mutée
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
// MUT_N / MUT_I : plusieurs processus se partagent la liste (la mutation k est jouée par le processus k mod N), chacun dans son dossier
const PARTS = parseInt(process.env.MUT_N || '1', 10), CETTE = parseInt(process.env.MUT_I || '0', 10);
for (const [k, [nom, ancien, neuf, [sonde, env]]] of M.entries()) {
  if (k % PARTS !== CETTE) continue;
  if (filtre && !nom.includes(filtre)) continue;
  const c = SRC.split(ancien).length - 1;
  if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué`); process.exit(2); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const R = racine('m', SRC.replace(ancien, () => neuf));
  const jouer = () => cp.spawnSync('node', [path.join(__dirname, sonde)], { env: { ...process.env, ...env, RACINE: R }, encoding: 'utf8', timeout: 560000 });
  let r = jouer(); if (!/== \d+ ✓ · \d+ ✗/.test(r.stdout || '')) r = jouer();   // une sonde qui meurt sans bilan (machine chargée) se REJOUE avant d'en conclure quoi que ce soit
  const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 100) + ')';
  const tombe = r.status === 1 && /✗/.test(r.stdout || '');
  jouees++; if (tombe) tombes++; else vivantes.push(nom + ' ' + bil);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' → ' + sonde + ' : ' + bil + ' sortie ' + r.status);
  if (tombe) { const premier = (r.stdout.split('\n').find(l => /^ ✗/.test(l)) || '').slice(0, 170); if (premier) console.log('     ' + premier); }
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
