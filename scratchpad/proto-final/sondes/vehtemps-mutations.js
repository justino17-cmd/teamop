// Contre-épreuve de la voie « Temps de travail » (étape 1) : on REMET, dans une COPIE de la page, un défaut que les sondes vehtemps-* gardent,
// et on exige que la sonde concernée TOMBE. Chaque remplacement doit toucher EXACTEMENT une occurrence (sinon le script s'arrête et le dit) :
// « une mutation qui ne casse rien est peut-être une mutation mal visée ». Jamais sur le fichier du dépôt : une copie sous /tmp.
// node scratchpad/proto-final/sondes/vehtemps-mutations.js [filtre]      DRY=1 : vérifie seulement que chaque mutation vise juste
const fs = require('fs'), path = require('path'), cp = require('child_process');
const REPO = path.join(__dirname, '..', '..', '..'), PAGE = path.join(REPO, 'apercu', 'prototype-op-gestion.html');
const TMP = process.env.MUT_DIR || '/tmp/mutations-vehtemps';
const SRC = fs.readFileSync(PAGE, 'utf8');
const G = 'gestes', S = 'structure', J = 'journee', SA = 'salarie', K = 'g56', V1 = 'liste', V2 = 'fiche', V3 = 'vgestes', V4 = 'visites';   // V1 à V4 : l'étape 3 (Véhicules, la liste et la fiche)
const FICHIER = { gestes:'vehtemps-t1-gestes.js', structure:'vehtemps-t1-structure.js', journee:'vehtemps-t5-journee.js', salarie:'vehtemps-t6-salarie.js', g56:'vehtemps-t56-gestes.js', liste:'vehtemps-v1-liste.js', fiche:'vehtemps-v2-fiche.js', vgestes:'vehtemps-v3-gestes.js', visites:'vehtemps-v4-visites.js' };
const M = [
  ['1 · « Terminer à… » écrit l\'heure qu\'il est au lieu de la fin d\'habitude (et la garde de l\'heure proposée tombe)', [
    ["act:'terminer|' + p.id + '|' + f.h }", "act:'terminer|' + p.id + '|' + hNow() }"],
    ["if (!f.src || f.h !== h) return toast('L’heure proposée a changé : ouvre « Choisir une autre heure ».');", ""]], [G]],
  ['2 · terminer la journée ne retire plus la validation de la semaine (ptDevalide)', [["ptDevalide(k, p.date); delete PAIE.confirmes[k]; if (dem)", "delete PAIE.confirmes[k]; if (dem)"]], [G]],
  ['3 · terminer la journée n\'écrit plus la trace (qui, quand, pourquoi)', [["PT_TRACE.push({ pid:p.id, qui:k, date:p.date, champ:'fin', avant:'journée pas terminée'", "0 && PT_TRACE.push({ pid:p.id, qui:k, date:p.date, champ:'fin', avant:'journée pas terminée'"]], [G]],
  ['4 · terminer une journée d\'un mois fermé n\'est plus refusé', [["if (paieMoisVerrou(p.date)) return toast(ttFerme());\n  if (!h)", "if (!h)"]], [G]],
  ['5 · « Ajouter une journée » n\'exige plus le motif', [["if (!motif) return toast('Écris d’abord pourquoi", "if (false) return toast('Écris d’abord pourquoi"]], [G]],
  ['6 · « Ajouter une journée » dans un mois fermé n\'est plus refusé', [["if (paieMoisVerrou(d)) return toast(ttFerme());\n  if (!deb", "if (!deb"]], [G]],
  ['7 · le toast de « Terminer à… » perd son « Annuler »', [["{ lib:'Annuler', fn:() => {\n    Object.keys(p).forEach(x => delete p[x]);", "{ lib:'Défaire', fn:() => {\n    Object.keys(p).forEach(x => delete p[x]);"]], [G]],
  ['8 · la demande de Tom propose « Accepter la correction » au lieu de « Accepter 17:40 »', [["lib:seul ? 'Accepter ' + seul : 'Accepter la correction'", "lib:'Accepter la correction'"]], [G]],
  ['9 · valider le lot dans un mois fermé n\'est plus refusé', [["if (S.J.some(paieMoisVerrou)) { fermerPanneau(); return toast(ttFerme()); }", "if (false) { fermerPanneau(); return toast(ttFerme()); }"]], [G]],
  ['10 · le bouton de la semaine redevient « Valider 4 semaines » (personnes et semaines mêlées)', [["'Valider les ' + S.ok.length + ' personnes en règle'", "'Valider ' + S.ok.length + ' semaines'"]], [G]],
  ['11 · la pastille de l\'onglet Aujourd\'hui ne compte plus ce qui attend', [["${k === 'auj' && R.length ?", "${false && R.length ?"]], [S]],
  ['12 · le bandeau bleu « La paie du mois est dans Comptabilité » reparaît', [["<span class=\"gris\">${esc(ttPhrase(E))}</span></div>", "<span class=\"gris\">${esc(ttPhrase(E))}</span><span class=\"gris\">La paie du mois est dans Comptabilité › Paie</span></div>"]], [S]],
  ['13 · la grille de sept jours et la liste paraissent ENSEMBLE (le seuil de conteneur saute)', [["@container ttsem (min-width:1000px){\n  .tt-grille{display:block}.tt-liste{display:none}", "@container ttsem (min-width:1000px){\n  .tt-grille{display:block}"]], [S]],
  ['14 · les flèches de la semaine rétrécissent de nouveau sous 44 px au doigt', [["@media (pointer:coarse){.tt-barre .st-nav button{width:44px;height:44px;flex:none}}", "@media (pointer:coarse){.tt-barre .st-nav button{width:44px;height:44px}}"]], [S], { PROFILS:'petit' }],
  ['15 · le mois ne propose plus « Valider ce qui est en règle » quand des semaines attendent', [["else if (B.aValider) { bouton = `<button type=\"button\" class=\"btn\" data-tt=\"validertout\">Valider ce qui est en règle</button>`", "else if (false) { bouton = `<button type=\"button\" class=\"btn\" data-tt=\"validertout\">Valider ce qui est en règle</button>`"]], [G]],
  ['16 · la journée oubliée de Tom est dite DEUX fois (une rangée en plus)', [["  /* 2. une demande de correction du salarié", "  POINTAGES.filter(p => ptOuvert(p) && p.qui !== 'marc').forEach(p => R.push({ rang:0, g:'r', lib:'À terminer', k:p.qui, texte:'Tom n’a pas terminé sa journée du ' + jlong(p.date) + '.', bouton:{ lib:'Voir la journée', act:'jour|' + p.qui + '|' + p.date }, liens:[] }));\n  /* 2. une demande de correction du salarié"]], [S]],
  /* ── étape 2 : la journée d'une personne (T5), « Mes heures » (T6), les gestes comptés ── */
  ['17 · « Enregistrer la correction » n\'exige plus le motif (la fonction ne le vérifie plus)', [["if (B.heures.length && !motif) return dire('Écris d’abord pourquoi.');", ""]], [J], { SEULS:'A' }],
  ['18 · le bouton « Enregistrer la correction » n\'est plus grisé tant que le motif est vide', [["btn.disabled = !ok; g('tt-aide').hidden = ok;", "btn.disabled = false; g('tt-aide').hidden = ok;"]], [J], { SEULS:'A' }],
  ['19 · choisir une heure écrit tout de suite (le défaut d\'avant : écriture à la sortie du champ)', [["const B = ttBrouillon(); if (!B) return; const g = i => document.getElementById(i), motif", "const B = ttBrouillon(); if (!B) return; B.ch.forEach(x => { x.p[x.c] = x.c === 'pause' ? parseInt(x.apres, 10) || 0 : x.apres; }); const g = i => document.getElementById(i), motif"]], [J], { SEULS:'A' }],
  ['20 · la correction n\'écrit plus la trace (avant → après, qui, quand, pourquoi)', [["if (x.c !== 'note') PT_TRACE.push({ pid:x.p.id, qui:k, date:d, champ:x.c,", "if (0 && x.c !== 'note') PT_TRACE.push({ pid:x.p.id, qui:k, date:d, champ:x.c,"]], [J], { SEULS:'A' }],
  ['21 · la correction ne retire plus la validation de la semaine (ptDevalide)', [["if (B.heures.length) { ptDevalide(k, d); delete PAIE.confirmes[k];", "if (B.heures.length) { delete PAIE.confirmes[k];"]], [J], { SEULS:'A' }],
  ['22 · la correction ne défait plus la confirmation du salarié (il ne reconfirme pas)', [["if (B.heures.length) { ptDevalide(k, d); delete PAIE.confirmes[k];", "if (B.heures.length) { ptDevalide(k, d);"]], [J], { SEULS:'A' }],
  ['23 · le toast de la correction perd son « Annuler »', [["{ lib:'Annuler', fn:() => { copies.forEach(", "{ lib:'Défaire', fn:() => { copies.forEach("]], [J], { SEULS:'A' }],
  ['24 · le mois fermé laisse les champs d\'heure ouverts dans la fiche', [["const R = verr ? [ligne('Début', p.debut)", "const R = 0 ? [ligne('Début', p.debut)"]], [J], { SEULS:'E' }],
  ['25 · une heure dans le futur est acceptée dans la fiche', [["if (d === AUJ && (ptMin(deb) > MAINT_MIN || (fin && ptMin(fin) > MAINT_MIN))) return dire(", "if (0 && (ptMin(deb) > MAINT_MIN || (fin && ptMin(fin) > MAINT_MIN))) return dire("]], [J], { SEULS:'C' }],
  ['26 · une pause plus longue que la journée est acceptée dans la fiche', [["if (pau > f - ptMin(deb)) return dire('La pause est plus longue que la journée.');", ""]], [J], { SEULS:'B' }],
  ['27 · un refus reste affiché après la réussite (le message d\'erreur n\'est plus effacé)', [["const B = ttBrouillon(), err = document.getElementById('tt-err'); if (err) err.textContent = ''; if (!B || !B.ch.length) return;", "const B = ttBrouillon(), err = document.getElementById('tt-err'); if (!B || !B.ch.length) return;"], ["g('tt-aide').hidden = ok; g('tt-err').textContent = '';", "g('tt-aide').hidden = ok;"]], [J], { SEULS:'B' }],
  ['28 · « Mes heures » recopie la carte « Ma journée de travail » (la carte vue deux fois)', [["return `${ttMhPret(k, v)}${ttMhAuj(k)}", "return `${ttMhPret(k, v)}${ptxCarteSalarie(k)}${ttMhAuj(k)}"]], [SA], { SEULS:'A' }],
  ['29 · confirmer ses heures n\'avertit plus d\'une journée restée ouverte', [["if (!O.length) return ttViaPaie('confirme|' + k);", "if (1) return ttViaPaie('confirme|' + k);"]], [SA], { SEULS:'B' }],
  ['30 · un mois fermé garde le bouton « Je confirme mes heures »', [["if (paieVerrouille()) return `<div class=\"info petit\">Le mois est fermé", "if (0) return `<div class=\"info petit\">Le mois est fermé"]], [SA], { SEULS:'E' }],
  ['31 · la liste de « Mes heures » ouvre la fiche du GÉRANT (avec ses champs) au lieu de la feuille du salarié', [["${ttJoursListe(k, w.L, 'mhjour', { jours:jrs, pointees:true })}", "${ttJoursListe(k, w.L, 'jour', { jours:jrs, pointees:true })}"]], [SA], { SEULS:'C,D' }],
  ['32 · « Il y a une erreur » retrouve son second bouton « Annuler » (deux gros boutons)', [["<div class=\"actions\"><button type=\"button\" class=\"btn large\" data-ptx=\"sigok|${k}\">Envoyer au bureau</button></div>", "<div class=\"actions\"><button type=\"button\" class=\"btn large\" data-ptx=\"sigok|${k}\">Envoyer au bureau</button><button type=\"button\" class=\"btn gris\" data-ferme=\"1\">Annuler</button></div>"]], [SA], { SEULS:'C' }],
  ['33 · « Mes heures » redit « sup. » (le mot d\'artisan « en plus » disparaît)', [["<span>en plus ce mois-ci</span>", "<span>sup. ce mois-ci</span>"]], [SA], { SEULS:'A' }],
  ['34 · le mois fermé fait perdre à « Il y a une erreur » son retrait dans la feuille d\'une journée', [["${paieMoisVerrou(d) ? `<div class=\"info petit\">Le mois est fermé : pour une erreur, parle au bureau, elle sera régularisée le mois prochain.</div>` : `<div class=\"actions\"><button type=\"button\" class=\"btn gris large\" data-tt=\"erreur|${k}|${d}\">Il y a une erreur</button></div>`}", "<div class=\"actions\"><button type=\"button\" class=\"btn gris large\" data-tt=\"erreur|${k}|${d}\">Il y a une erreur</button></div>"]], [SA], { SEULS:'E' }],
  ['35 · « Je confirme mes heures » demande toujours une fenêtre de plus (un geste de trop)', [["if (!O.length) return ttViaPaie('confirme|' + k);\n  const p = O[0];", "const p = O[0] || { date:AUJ };"]], [K]],
  /* ── étape 3 : Véhicules, la liste et la fiche ── */
  ['36 · une rangée au garage perd son geste « Le remettre en service »', [["bouton:{ act:'statut|' + v.id + (from === 'fiche' ? '|fiche' : ''), lib:'Le remettre en service' }, lien:nb", "bouton:null, lien:nb"]], [V1], { PROFILS:'mac', SEULS:'A' }],
  ['37 · l\'assurance du groupe revient sur CHAQUE rangée (une échéance dite quatre fois)', [["const prop = E.filter(e => e.urg !== 'v' && !(e.k === 'assur' && gr));", "const prop = E.filter(e => e.urg !== 'v');"]], [V1], { PROFILS:'mac', SEULS:'A' }],
  ['38 · le rendez-vous noté ne fait plus passer la ligne à « Noter le contrôle technique » (D11 : toujours « Noter le rendez-vous »)', [["&& e.urg !== 'v' && !vhRdvNote(v, e)) return { act:'rdv|'", "&& e.urg !== 'v') return { act:'rdv|'"]], [V3], { PROFILS:'mac', SEULS:'A' }],
  ['39 · « Noter le rendez-vous » écrit la tâche dans 3 jours au lieu du jour saisi (le défaut d\'avant)', [["t:vxTitreTache(v, e) + (g ? ' · chez ' + g : ''), d, qui:rlQui()", "t:vxTitreTache(v, e) + (g ? ' · chez ' + g : ''), d:jour(3), qui:rlQui()"]], [V3], { PROFILS:'mac', SEULS:'A' }],
  ['40 · un rendez-vous noté pour un jour déjà passé est accepté', [["if (d < AUJ) return toast('Ce jour est déjà passé : choisis aujourd’hui ou plus tard.');", ""]], [V3], { PROFILS:'mac', SEULS:'A' }],
  ['41 · le bureau retrouve « ＋ Nouveau véhicule » (la liste des gestes interdits perd « nouveau »)', [["const VH_BUREAU_NON = ['nouveau', 'creerok', 'modif'", "const VH_BUREAU_NON = ['creerok', 'modif'"]], [V3], { SEULS:'D' }],
  ['42 · la garde du bureau saute dans l\'écouteur des véhicules (un geste forcé à la main ouvre la feuille)', [["  if (!vhPeut(a)) return;   // la garde du bureau est ICI, avant toute écriture : un bouton caché ne protège rien\n", ""]], [V3], { SEULS:'D' }],
  ['43 · la garde du bureau saute dans l\'ancien écouteur data-vx (modifier, conducteur, amende… se rouvrent)', [["  if (!vhPeut(a)) return;   // le bureau ne fait pas tout : la garde est ICI, avant toute écriture\n", ""]], [V3], { SEULS:'D' }],
  ['44 · « Annuler » du matériel ne rétablit plus l\'état d\'AVANT « Tout est là » (la photo est prise après)', [["const av = av0 || vxPhoto(v),", "const av = vxPhoto(v),"]], [V3], { PROFILS:'mac', SEULS:'C' }],
  ['45 · la feuille « Cette dépense » perd « Supprimer cette dépense » (plus aucun moyen de supprimer)', [["\n    <button type=\"button\" class=\"btn rouge\" data-vx=\"frdel|${v.id}|${cle}\">Supprimer cette dépense</button>`);", "`);"]], [V2, V3], { PROFILS:'mac', SEULS:'B' }],
  ['46 · l\'onglet Dépenses répète « Noter un plein » (déjà en haut de la fiche)', [["<div class=\"actions\"><button type=\"button\" class=\"btn gris petit\" data-vh=\"csv|${v.id}\">Exporter en tableau</button></div></div>`;\n}", "<div class=\"actions\"><button type=\"button\" class=\"btn gris petit\" data-vh=\"plein|${v.id}\">Noter un plein</button><button type=\"button\" class=\"btn gris petit\" data-vh=\"csv|${v.id}\">Exporter en tableau</button></div></div>`;\n}"]], [V2], { PROFILS:'mac', SEULS:'B' }],
  ['47 · au garage, « Le remettre en service » est répété sous la phrase (le même geste deux fois)', [["Ce véhicule est au garage${im.du ? ' depuis le ' + esc(vhJM(im.du)) : ''}.</p>`; }", "Ce véhicule est au garage${im.du ? ' depuis le ' + esc(vhJM(im.du)) : ''}.</p>${vhGeste(E.bouton)}`; }"]], [V2], { PROFILS:'mac', SEULS:'C' }],
  ['48 · la pastille rouge de l\'onglet « À faire » ne compte plus', [["['afaire', 'À faire', aF ? `<span class=\"t-nb rouge\">${aF}</span>` : '']", "['afaire', 'À faire', '']"]], [V1], { PROFILS:'mac', SEULS:'A' }],
  ['49 · le chiffre « dépensés » n\'est plus une porte (il n\'ouvre plus la feuille des coûts)', [["kpi('cout', eur0(dep)", "kpi('onglet|tous', eur0(dep)"]], [V1], { PROFILS:'mac', SEULS:'B' }],
  ['50 · une AUTRE fiche s\'ouvre sur l\'onglet de la précédente (l\'onglet suit le véhicule d\'avant)', [["VH.fOnglet = onglet || 'afaire'; VX.fiche = v.id;", "VH.fOnglet = onglet || VH.fOnglet; VX.fiche = v.id;"]], [V2], { PROFILS:'mac', SEULS:'E' }],
  ['51 · le classement des coûts peint le plus cher d\'une couleur d\'alerte (la barre dit la taille, pas une alerte)', [["<i style=\"width:${Math.max(4, c.auKm / max * 100)}%\"></i>", "<i style=\"width:${Math.max(4, c.auKm / max * 100)}%;background:${c.auKm === max ? 'var(--rouge)' : 'var(--doux)'}\"></i>"]], [V1], { PROFILS:'mac', SEULS:'B' }],
  ['52 · la visite « Véhicules » cite un sélecteur qui n\'existe plus (la fiche s\'ouvre par une classe d\'avant)', [["{ c:'.vh-liste [data-vh=\"fiche|veh2\"]', t:'La fiche, courte'", "{ c:'.ve-grille [data-ve=\"fiche|veh2\"]', t:'La fiche, courte'"], ["jouer:() => immClic('.vh-liste [data-vh=\"fiche|veh2\"]') },", "jouer:() => immClic('.ve-grille [data-ve=\"fiche|veh2\"]') },"]], [V4]],
  ['53 · le matériel de sécurité reperd ses interrupteurs à 44 px (la ligne retombe sous le plancher tactile)', [[".vh-mat-l{min-height:52px;cursor:pointer;justify-content:space-between}", ".vh-mat-l{min-height:0;padding:0;cursor:pointer;justify-content:space-between}"], [".vh-sw{appearance:none;-webkit-appearance:none;flex:none;width:52px;height:32px;", ".vh-sw{appearance:none;-webkit-appearance:none;flex:none;width:40px;height:20px;"]], [V3], { PROFILS:'mac', SEULS:'C' }],
];
const filtre = process.argv[2] || '';
fs.mkdirSync(TMP, { recursive: true });
function racine(nom, page) {
  const R = path.join(TMP, nom), A = path.join(R, 'apercu'); fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });
  for (const f of fs.readdirSync(path.join(REPO, 'apercu'))) if (f !== 'prototype-op-gestion.html') fs.symlinkSync(path.join(REPO, 'apercu', f), path.join(A, f));
  fs.writeFileSync(path.join(A, 'prototype-op-gestion.html'), page); return R; }
let tombes = 0, vivantes = [], jouees = 0;
for (const [nom, paires, sondes, env] of M) {
  if (filtre && !nom.includes(filtre)) continue;
  if (+process.env.MIN && parseInt(nom, 10) < +process.env.MIN) continue;   // MIN=17 : seulement les mutations de l'étape 2
  let page = SRC;
  for (const [ancien, neuf] of paires) { const c = page.split(ancien).length - 1;
    if (c !== 1) { console.log(`✗ « ${nom} » : ${c} occurrence(s) du texte visé, 1 attendue — la mutation est mal visée, rien n'est joué\n   ${ancien.slice(0, 90)}`); process.exit(2); }
    page = page.replace(ancien, () => neuf); }
  if (process.env.DRY) { console.log('✓ visée juste :', nom); continue; }
  const R = racine('m', page); if (page === SRC) { console.log('✗ la copie est identique à la page : ' + nom); process.exit(2); }
  let tombe = false, detail = '';
  for (const s of sondes) { const r = cp.spawnSync('node', [path.join(__dirname, FICHIER[s])], { env: { ...process.env, RACINE: R, PROFILS:(s === J || s === SA || s === K) ? 'iphone' : 'mac,iphone', NUIT:'0', ...(env || {}) }, encoding: 'utf8', timeout: 400000 });
    const bil = ((r.stdout || '').match(/== (\d+) ✓ · (\d+) ✗/) || [])[0] || '(pas de bilan : ' + String(r.stderr || '').split('\n')[0].slice(0, 80) + ')';
    detail += ` ${s}: ${bil} sortie ${r.status}`; if ((r.status === 1 || r.status === 2) && /^  ✗/m.test(r.stdout || '')) { tombe = true; if (r.status === 2) detail += ' (une vérification a échoué, puis la sonde est morte faute de l\'écran attendu)'; break; }
    if (r.status === 2 && /TypeError: Cannot (read|set) properties of null/.test(r.stderr || '')) { tombe = true; detail += ' (la sonde meurt faute de l\'élément gardé)'; break; } }
  jouees++; if (tombe) tombes++; else vivantes.push(nom);
  console.log((tombe ? '✓ TOMBE ' : '✗ VIVANTE') + ' · ' + nom + ' →' + detail);
}
console.log(`\n== ${tombes} ✓ · ${vivantes.length} ✗  (${jouees} mutations jouées)`); vivantes.forEach(v => console.log(' ✗ vivante :', v));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(vivantes.length ? 1 : 0);
