/* ══ PRODUITS DONNÉS : UNE SOUS-CATÉGORIE DES BOX (v731) ═══════════════════════════════════════
   Justin, 23 septembre 2026 : « Produit donné, c'est quand des personnes donnent des produits à
   quelqu'un. Il faudrait le mettre en sous-catégorie dans Box : quand un technicien retire des
   produits de sa box, il choisit si c'est pour lui ou pour une autre personne. »

   Le geste existait déjà — « Ces produits sont pour qui ? » à la sortie d'une box, par les deux
   chemins (sortie directe : `boxDonneModal` ; sortie validée par le DR : `remiseDestModal`), et le
   bon de remise en gardait la trace. Ce qui manquait, c'était l'ENDROIT : l'écran d'avant ne
   listait que les dons saisis à la main depuis la fiche d'un véhicule, et n'était plus au menu.
   Les vrais dons ne se lisaient que dans Mouvements stock, filtre « Donné ».

   Ce banc EXÉCUTE les vraies fonctions extraites du fichier livré — la liste (`donsListe`), le
   total (`donTotTxt`), la rangée des sous-catégories (`boxSousCats`), la table (`SOUS_CATS`,
   `avecSousCats`) — puis relit le câblage. Le comportement de bout en bout (une vraie sortie de
   box, les deux réponses, la bulle et le menu allumés sur Boxes, le compte qui n'y a pas droit)
   est dans `scratchpad/sonde-dons.js`.                                                          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* Découpe par ACCOLADES appariées, à partir d'une ouverture donnée. */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); }
  }
  return '';
}

console.log('\n── 779 · 0. la population ──');
const fListe = bloc('function donsListe(){'), fTot = bloc('function donTotTxt(lignes){'),
      fCats = bloc('function boxSousCats(actif){'), fAvec = bloc('function avecSousCats(items){');
const lSous = (SRC.match(/^const SOUS_CATS=\[[^\n]*\];$/m) || [''])[0];
vrai('donsListe, donTotTxt, boxSousCats, avecSousCats et SOUS_CATS sont trouvés',
  fListe.length > 600 && fTot.length > 80 && fCats.length > 200 && fAvec.length > 40 && lSous.length > 40,
  [fListe.length, fTot.length, fCats.length, fAvec.length, lSous.length]);

console.log('\n── 779 · 1. la liste des dons, JOUÉE ──');
const MOI = { id: 'u-k', prenom: 'Karim', nom: 'Benali', role: 'technicien' };
const BASE = () => ({
  boxes: [{ id: 'bxA', nom: 'Box Nord', vis: true }, { id: 'bxB', nom: 'Box Sud', vis: false }],
  bonsRemise: [
    { id: 'r1', num: 'BR-2026-001', boxId: 'bxA', par: 'Léo Martin', pourQui: 'Nadia Lopez', date: '2026-09-20', ts: 100, valideDr: 'Justin Roux',
      lignes: [{ produitId: 'p1', qte: 3, unite: 'u' }, { produitId: 'p2', qte: 1, unite: 'cart.' }] },
    { id: 'r2', num: 'BR-2026-002', boxId: 'bxA', par: 'Léo Martin', pourQui: 'Léo Martin', date: '2026-09-23', ts: 300, lignes: [{ produitId: 'p1', qte: 9 }] },
    { id: 'r3', num: 'BR-2026-003', boxId: 'bxB', par: 'Karim Benali', pourQui: 'Sofia Perez', date: '2026-09-22', ts: 50, valideDr: 'Karim Benali',
      lignes: [{ produitId: 'p1', qte: 2, unite: 'u' }] },
    { id: 'r4', num: 'BR-2026-004', boxId: 'bxB', par: 'Sofia Perez', pourQui: 'Karim Benali', date: '2026-09-22', ts: 80, lignes: [{ produitId: 'pX', qte: 1 }] },
    { id: 'r5', num: 'BR-2026-005', boxId: 'bxB', par: 'Sofia Perez', pourQui: 'Nadia Lopez', date: '2026-09-23', ts: 90, lignes: [{ produitId: 'p1', qte: 1 }] },
    { id: 'r6', num: 'BR-2026-006', boxId: 'bxA', par: 'Léo Martin', pourQui: '', date: '2026-09-23', ts: 95, lignes: [{ produitId: 'p1', qte: 1 }] },
    null,
    { id: 'r8', num: 'BR-2026-008', boxId: 'disparue', boxNomTxt: 'Ancienne box', par: 'Karim Benali', pourQui: 'Jean Terrain', date: '2026-09-19', ts: 10, lignes: [] },
  ],
  produitsDonnes: [
    { id: 'pd1', auteurNom: 'Karim Benali', produitNom: 'Gel blattes', quantite: 2, unite: 'tube', date: '2026-09-21', vehiculeId: 'v1', notes: 'client' },
    { id: 'pd2', auteurNom: 'Autre Personne', produitNom: 'Raticide', quantite: 1, unite: 'u', date: '2026-09-23' },
  ],
});
const jouer = ({ user = MOI, voitTout = false, perim = null, db = BASE() } = {}) => {
  const bac = {
    currentUser: user, db,
    fullName: u => ((u.prenom || '') + ' ' + (u.nom || '')).trim(),
    can: k => k === 'voirTout' && voitTout,
    perimetreTechIds: () => perim,
    visibleBoxes: bx => bx.filter(b => b.vis),
    produit: pid => ({ p1: { id: 'p1', nom: 'Appât A' }, p2: { id: 'p2', nom: 'Colle B' } })[pid] || {},
  };
  vm.createContext(bac);
  vm.runInContext(fListe + '\nthis.r = donsListe();', bac);
  return bac.r;
};
if (fListe) {
  const L = jouer();
  const ids = L.map(r => r.id);
  L.forEach(r => console.log('      ' + [r.type, r.id, r.date, r.par, '→', r.pourQui || '·', r.boxNom || '', r.valideDr ? '✔ ' + r.valideDr : ''].join(' ')));
  vrai('⛔⛔ « Pour moi » n’est PAS un don (le destinataire est celui qui a sorti)', !ids.includes('r2'));
  vrai('⛔ un bon sans destinataire n’est pas un don', !ids.includes('r6'));
  vrai('un don sur une box qu’on voit est listé, avec le nom de la box', ids.includes('r1') && L.find(r => r.id === 'r1').boxNom === 'Box Nord');
  vrai('⛔ ce qu’on a DONNÉ soi-même est listé, même sur une box qu’on ne voit plus', ids.includes('r3'));
  vrai('⛔ ce qu’on a REÇU est listé, même sur une box qu’on ne voit pas', ids.includes('r4'));
  vrai('⛔⛔ un don entre deux autres personnes, sur une box qu’on ne voit pas, reste caché', !ids.includes('r5'));
  vrai('un enregistrement vide ne fait pas tomber la liste', L.length > 0);
  vrai('une box supprimée garde le nom écrit sur le bon', (L.find(r => r.id === 'r8') || {}).boxNom === 'Ancienne box');
  vrai('les lignes portent le NOM du produit (et « — » pour une fiche disparue)',
    JSON.stringify(L.find(r => r.id === 'r1').lignes) === JSON.stringify([{ nom: 'Appât A', qte: 3, unite: 'u' }, { nom: 'Colle B', qte: 1, unite: 'cart.' }])
    && L.find(r => r.id === 'r4').lignes[0].nom === '—' && L.find(r => r.id === 'r4').lignes[0].unite === 'u');
  v('⛔ « validé par » : montré quand c’est un DR, tu quand c’est la personne elle-même (sortie sans validation)',
    [L.find(r => r.id === 'r1').valideDr, L.find(r => r.id === 'r3').valideDr], ['Justin Roux', '']);
  vrai('un ancien don saisi à la main (fiche véhicule) reste listé pour son auteur', ids.includes('pd1') && L.find(r => r.id === 'pd1').type === 'saisie');
  vrai('⛔ … mais pas celui d’un autre, sans « tout voir »', !ids.includes('pd2'));
  v('⛔ ordre : le plus récent d’abord, et à date égale le plus tard dans la journée', ids, ['r4', 'r3', 'pd1', 'r1', 'r8']);
  const T = jouer({ voitTout: true });
  vrai('« tout voir » sans périmètre voit TOUT, comme Mouvements stock : les anciens dons de l’équipe (en tête, le plus récent)…', T[0] && T[0].id === 'pd2');
  vrai('… et les dons entre deux autres personnes, sur n’importe quelle box', T.map(r => r.id).includes('r5'));
  vrai('⛔ … mais jamais « Pour moi », même pour qui voit tout', !T.map(r => r.id).includes('r2'));
  const P = jouer({ voitTout: true, perim: new Set(['t1']) }).map(r => r.id);
  vrai('⛔ « tout voir » RATTACHÉ à des équipes : seulement ses box (et ce qui le regarde)', !P.includes('r5') && !P.includes('pd2') && P.includes('r1') && P.includes('r4'));
  v('personne de connecté → aucun don de personne en particulier, seulement les box visibles', jouer({ user: null }).map(r => r.id), ['r1']);
  v('base sans bons ni dons → liste vide, sans erreur', jouer({ db: { boxes: [] } }), []);
}

console.log('\n── 779 · 2. le total : deux unités ne s’additionnent pas ──');
if (fTot) {
  const bac = {}; vm.createContext(bac); vm.runInContext(fTot, bac);
  v('3 u + 1 cart. + 2 u → « 5 u · 1 cart. »', bac.donTotTxt([{ qte: 3, unite: 'u' }, { qte: 1, unite: 'cart.' }, { qte: 2, unite: 'u' }]), '5 u · 1 cart.');
  v('une ligne sans unité compte en unités', bac.donTotTxt([{ qte: 4 }]), '4 u');
  v('0,1 L + 0,2 L → « 0.3 L » (pas 0.30000000000000004)', bac.donTotTxt([{ qte: 0.1, unite: 'L' }, { qte: 0.2, unite: 'L' }]), '0.3 L');
  v('rien → « 0 »', bac.donTotTxt([]), '0');
}

console.log('\n── 779 · 3. la rangée des sous-catégories, JOUÉE ──');
if (fCats) {
  const rangee = (actif, voit) => {
    const bac = { currentUser: MOI, userSeesModule: (u, k) => { if (voit === 'jette') throw new Error('x'); return k === 'produitsDonnes' ? voit : true; } };
    vm.createContext(bac); vm.runInContext(fCats + '\nthis.r = boxSousCats(' + JSON.stringify(actif) + ');', bac);
    return bac.r;
  };
  const R = rangee('boxes', true);
  const libs = (R.match(/<div class="chip[^"]*"[^>]*>([^<]*)<\/div>/g) || []).map(x => x.replace(/<[^>]+>/g, ''));
  v('trois destinations : Liste · Carte · Produits donnés', libs, ['Liste', 'Carte', 'Produits donnés']);
  vrai('⛔⛔ libellés COURTS et sans émoji : la rangée doit tenir sur un téléphone (440 px mesurés avant, coupés à 360, 390 ET 430 ; 316 px après)',
    !/\p{Extended_Pictographic}/u.test(libs.join('')) && libs.join('').length <= 25);
  vrai('⛔ c’est une NAVIGATION (landmark nommé), pas une rangée de filtres', /^<nav class="filters" aria-label="Boxes"/.test(R) && /<\/nav>$/.test(R));
  vrai('⛔ l’écran ouvert est marqué (aria-current) et ne porte pas de clic vers lui-même',
    /<div class="chip active" aria-current="page">Liste<\/div>/.test(R) && !/go\('boxes'\)/.test(R));
  vrai('les deux autres mènent à leur écran', /onclick="go\('carteBox'\)"/.test(R) && /onclick="go\('produitsDonnes'\)"/.test(R));
  const P = rangee('produitsDonnes', true);
  vrai('sur Produits donnés, c’est lui qui est marqué, et Liste ramène aux box',
    /<div class="chip active" aria-current="page">Produits donnés<\/div>/.test(P) && /onclick="go\('boxes'\)"/.test(P));
  vrai('⛔ sans le droit, l’onglet Produits donnés n’apparaît pas du tout', !/produitsDonnes|Produits donnés/.test(rangee('carteBox', false)));
  vrai('⛔ un droit illisible ne casse pas la rangée (et n’ouvre rien)', />Carte</.test(rangee('boxes', 'jette')) && !/Produits donnés/.test(rangee('boxes', 'jette')));
}

console.log('\n── 779 · 4. une seule table, lue par le menu, les droits et les libellés ──');
if (lSous && fAvec) {
  const bac = {}; vm.createContext(bac);
  vm.runInContext(lSous.replace(/^const /, 'var ') + '\n' + fAvec + '\nthis.r = avecSousCats([{k:"mouvements"},{k:"boxes"},{k:"saisieConso"}]).map(x=>x.k);', bac);
  v('avecSousCats range la sous-catégorie juste APRÈS son parent', bac.r, ['mouvements', 'boxes', 'produitsDonnes', 'saisieConso']);
  vrai('SOUS_CATS donne à Produits donnés son parent, son icône et son libellé', /\{k:'produitsDonnes',ic:'🎁',l:'Produits donnés',parent:'boxes'\}/.test(lSous));
}
const iNav0 = SRC.indexOf('const NAV = ['), iNav1 = SRC.indexOf('\n];', iNav0);
vrai('population : le bloc NAV est trouvé', iNav0 > 0 && iNav1 > iNav0 + 2000, [iNav0, iNav1]);
vrai('⛔ Produits donnés n’a PAS de ligne au menu (c’est une sous-catégorie)', !/k:'produitsDonnes'/.test(SRC.slice(iNav0, iNav1)));
vrai('⛔ VUE_PARENT est DÉRIVÉE de SOUS_CATS (pas une seconde liste à tenir)',
  /const VUE_PARENT=Object\.fromEntries\(SOUS_CATS\.map\(s=>\[s\.k,s\.parent\]\)\);/.test(SRC) && (SRC.match(/const VUE_PARENT=/g) || []).length === 1);
vrai('… et SOUS_CATS est déclarée AVANT VUE_PARENT (sinon zone morte au chargement)',
  SRC.indexOf('const SOUS_CATS=') > 0 && SRC.indexOf('const SOUS_CATS=') < SRC.indexOf('const VUE_PARENT='));
v('une seule définition de chacune', ['function boxSousCats(', 'function donsListe(', 'function donTotTxt(', 'function avecSousCats(', 'function donDetail(', 'function donsRendre(']
  .map(n => SRC.split(n).length - 1), [1, 1, 1, 1, 1, 1]);

console.log('\n── 779 · 5. le parent s’allume : menu, barre du bas, glissement ──');
const fGo = bloc('function go(view){'), fActif = bloc('function ongletsActif(){'), fRender = bloc('function renderOnglets(){'),
      fGeste = bloc('function ongletsGeste(){'), fBulle = bloc('function ongletsBulle(bar){');
vrai('population : go, ongletsActif, renderOnglets, ongletsGeste, ongletsBulle', [fGo, fActif, fRender, fGeste, fBulle].every(x => x.length > 200),
  [fGo, fActif, fRender, fGeste, fBulle].map(x => x.length));
vrai('⛔ go() allume la ligne du PARENT au menu', /n\.dataset\.view===\(VUE_PARENT\[view\]\|\|view\)/.test(fGo));
vrai('⛔ go() refuse une sous-catégorie à qui n’a pas SON droit, même s’il voit les box',
  /\(VUE_PARENT\[view\] && !userSeesModule\(currentUser,view\)\)/.test(fGo) && /VUE_PARENT\[view\]==='boxes'/.test(fGo));
vrai('⛔ la barre du bas allume l’onglet du parent (au dessin ET au repeint)',
  /\(VUE_PARENT\[current\]\|\|current\)===k\?' on'/.test(fRender) && /const ici=VUE_PARENT\[current\]\|\|current;/.test(fActif) && /b\.dataset\.tab===ici/.test(fActif));
vrai('⛔ le glissement de page part de l’onglet du parent', /vues\.indexOf\(VUE_PARENT\[current\]\|\|current\)/.test(fGeste));
vrai('⛔ la bulle reposée sur l’onglet du parent ne navigue pas', /dest===\(VUE_PARENT\[current\]\|\|current\)/.test(fBulle));

console.log('\n── 779 · 6. les trois écrans partagent LA rangée ──');
const fBoxes = bloc('views.boxes=function(){'), fCarte = bloc('views.carteBox=function(){'), fDons = bloc('views.produitsDonnes=function(){'), fRendre = bloc('function donsRendre(){');
vrai('population : les trois vues et donsRendre', [fBoxes, fCarte, fDons, fRendre].every(x => x.length > 150), [fBoxes, fCarte, fDons, fRendre].map(x => x.length));
vrai('Liste → boxSousCats(\'boxes\')', /boxSousCats\('boxes'\)/.test(fBoxes));
vrai('⛔ le filtre « Avec du stock » vit sur SA ligne, hors de la navigation (dans un segmenté il passerait pour un 4ᵉ écran)',
  /\$\{boxSousCats\('boxes'\)\}\$\{filtrable\?`<div class="filters" style="margin:0 0 8px"><div class="chip\$\{boxFiltreStock\?' active':''\}"/.test(fBoxes));
vrai('Carte des box → boxSousCats(\'carteBox\')', /boxSousCats\('carteBox'\)/.test(fCarte));
vrai('Produits donnés → boxSousCats(\'produitsDonnes\')', /boxSousCats\('produitsDonnes'\)/.test(fDons));
vrai('⛔ plus aucune rangée écrite à la main (elle finirait par dire autre chose)',
  !/<div class="chip active">📋 Liste<\/div>/.test(SRC) && !/<div class="chip active">🗺️ Carte des box<\/div>/.test(SRC));
vrai('⛔ un écran vide dit POURQUOI : les bons de remise coupés dans Paramètres', /const coupe=!!db\.bonsRemiseOff/.test(fRendre) && /bonsRemiseSet\(true\)/.test(fRendre));
vrai('… sinon il dit d’où viennent les dons, et mène aux box', /Pour une autre personne/.test(fRendre) && /go\('boxes'\)/.test(fRendre));
vrai('une ligne s’ouvre au doigt ET au clavier', /role="button" tabindex="0" onclick="donDetail\(/.test(fRendre) && /onkeydown="if\(event\.key==='Enter'\)donDetail\(/.test(fRendre));
vrai('⛔ chaque ligne DIT qui donne à qui (« → » et « ✔ » deviennent des icônes muettes)',
  /' a remis à '\+r\.pourQui/.test(fRendre) && /', validé par '\+r\.valideDr/.test(fRendre) && /aria-label="\$\{esc\(dit\)\}"/.test(fRendre));
const fDetail = bloc('function donDetail(type,id){');
vrai('le détail d’un bon rend son PDF', /remisePdf\('\$\{r\.id\}'\)/.test(fDetail));
vrai('⛔ un ancien don saisi à la main se CORRIGE et se RETIRE depuis son détail (l’ancien écran le permettait)',
  /delItem\('produitsDonnes','\$\{r\.id\}'\)/.test(fDetail) && /formProduitDonne\('\$\{r\.id\}'\)/.test(fDetail) && /printProduitDonne\('\$\{r\.id\}'\)/.test(fDetail));
vrai('⛔ … et un ancien don garde son produit, même sorti du catalogue (sinon « — », champ obligatoire : on ne peut plus l’enregistrer)',
  /p\.produitNom&&!db\.produits\.some\(pr=>pr\.nom===p\.produitNom\)\?`<option selected>\$\{esc\(p\.produitNom\)\}<\/option>`/.test(bloc('function formProduitDonne(id,presetVeh){')));
vrai('la recherche du haut ne promet plus les chantiers (retirés en v730)', !/intervention, chantier…/.test(SRC) && /placeholder="Rechercher client, intervention, tâche…"/.test(SRC));

console.log('\n── 779 · 7. la question « pour qui ? », aux deux sorties de box ──');
const fDirect = bloc('function boxDonneModal(boxId,suite){'), fDr = bloc('function remiseDestModal(mid){');
vrai('population : boxDonneModal et remiseDestModal', fDirect.length > 800 && fDr.length > 800, [fDirect.length, fDr.length]);
vrai('⛔ les deux proposent « Pour moi » et « Pour une autre personne » (les mots de Justin)',
  [fDirect, fDr].every(f => /Pour moi — <b>/.test(f) && /Pour une autre personne<\/span>/.test(f)));
vrai('les deux proposent les personnes de l’entreprise, sans les imposer', /list="bd-gens"/.test(fDirect) && /list="rd-gens"/.test(fDr) && /<datalist id="rd-gens">/.test(fDr));
vrai('⛔ « Pour moi » inscrit bien la personne elle-même (donc PAS un don)',
  /const nom=autre\?\(\(\$\('bd-nom'\)\|\|\{\}\)\.value\|\|''\)\.trim\(\):fullName\(currentUser\);/.test(SRC) && /m\.pourQui=autre\?nom:fullName\(currentUser\);/.test(SRC));
vrai('⛔ la sortie directe écrit par = la personne connectée (c’est ce que la liste compare)',
  /remiseAjoute\(\{boxId:b\.id,par:fullName\(currentUser\),parId:currentUser&&currentUser\.id,pourQui:pour,produitId:pid\}/.test(SRC));

console.log('\n── 779 · 8. les droits se règlent là où on les voit ──');
const fDroits = bloc('function usrDroitsHtml(u,admin){'), fLire = bloc('function profilLireZone(zone){'), fValider = bloc('function usrDroitsValider(uid,btn){');
vrai('population : la grille, la lecture d’un profil, l’enregistrement', [fDroits, fLire, fValider].every(x => x.length > 300));
vrai('⛔ la grille des droits montre la sous-catégorie sous son parent', /const ms=avecSousCats\(NAV\.filter\(x=>PERM_GRP_OF\[x\.g\]===g\)/.test(fDroits) && /m\.parent\?'↳ ':''/.test(fDroits));
vrai('⛔ … et l’interrupteur est RELU à l’enregistrement (sinon on coche pour rien)',
  /avecSousCats\(NAV\.flatMap\(x=>x\.items\)\)\.forEach\(m=>\{ const v=val\('mod_'\+m\.k\); if\(v!==null\) u\.acces\.modules\[m\.k\]=v; \}\);/.test(fValider)
  && /avecSousCats\(NAV\.flatMap\(x=>x\.items\)\)\.forEach\(m=>\{ const v=val\('mod_'\+m\.k\); if\(v!==null\) modules\[m\.k\]=v; \}\);/.test(fLire));
vrai('les libellés (retour, menu de référence) la connaissent aussi',
  /function navLabel\(k\)\{ try\{ const it=avecSousCats\(/.test(SRC) && /function menuLabel\(v\)\{ const it=avecSousCats\(/.test(SRC));
vrai('le commercial et la comptable restent fermés par défaut', /produitsDonnes:false,\s*$/m.test(SRC.slice(SRC.indexOf('function defaultPerms'), SRC.indexOf('function defaultPerms') + 4000)) || (SRC.match(/saisieConso:false, produitsDonnes:false/g) || []).length === 2);

console.log('\n── 779 · 9. retirer un écran n’est pas retirer une donnée ──');
vrai('⛔ produitsDonnes reste une collection synchronisée', /const COLLECTIONS_DONNEES=\[[^\]]*'produitsDonnes'/.test(SRC) && /produitsDonnes: 'liste'/.test(SRC));
vrai('⛔ bonsRemise aussi', /bonsRemise: 'liste'/.test(SRC));
vrai('le don saisi depuis la fiche d’un véhicule existe toujours', /function formProduitDonne\(/.test(SRC) && /function saveProduitDonne\(/.test(SRC));

console.log('\n── 779 · 10. la mesure de bout en bout existe ──');
const PS = path.join(__dirname, '..', 'scratchpad', 'sonde-dons.js');
const SONDE = fs.existsSync(PS) ? fs.readFileSync(PS, 'utf8') : '';
vrai('scratchpad/sonde-dons.js existe', !!SONDE);
vrai('… elle fait une VRAIE sortie de box (boxSaisir, le geste « j’en prends N ») et répond à la vraie fenêtre', /boxSaisir\(/.test(SONDE) && /boxDonneSave\(\)/.test(SONDE));
vrai('… elle joue les DEUX réponses et le chemin validé par le DR', /bd-qui/.test(SONDE) && /value=autre/.test(SONDE) && /remiseDestSave/.test(SONDE) && /boxBrouillonValider\(/.test(SONDE) && /boxMvtValider\(/.test(SONDE));
vrai('… elle regarde le menu ET la bulle', /nav-item\.active/.test(SONDE) && /\.tab\.on/.test(SONDE));
vrai('… elle mesure que la rangée TIENT au téléphone et devient le segmenté', /scrollWidth<=f\.clientWidth/.test(SONDE) && /seg-on/.test(SONDE));
vrai('… elle lit la STRUCTURE des lignes, pas les glyphes remplacés par des icônes', /querySelector\('b'\)/.test(SONDE) && /aria-label/.test(SONDE));
vrai('… elle joue un compte qui n’y a pas droit', /commercial/.test(SONDE));
vrai('… elle corrige et retire un ancien don, en prouvant que les deux gestes ONT EU LIEU', /pd-essai/.test(SONDE) && /q:5/.test(SONDE) && /existe:false/.test(SONDE));
vrai('… elle attend la fin des transitions de vue avant de relever (sinon elle lit l’écran d’avant)', /window\.__vtN/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-779 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
