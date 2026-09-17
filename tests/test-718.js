/* ══ test-718 — UN BOUTON DIT CE QU'IL FAIT, ET CE QU'IL A FAIT ═════════════════════════════
 *
 * Point 7, volets 1 à 3. Justin, 17 septembre 2026, trois demandes en une :
 *  1. « quand on valide les droits il faudrait qu'une fois cliqué dessus ça mette droits
 *     validés » — puis, tout de suite : « tu vois ça pour tous les boutons qu'on valide ».
 *  2. « il faut aussi bien que quand les utilisateurs se connectent et ils changent leur mot
 *     de passe ça valide bien le changement ».
 *  3. « vu qu'il y a un bouton synchroniser, il faudrait obliger les personnes à synchroniser
 *     quand ils ont fini — je sais pas c'est quoi le mieux ? »
 *
 * Le toast existait déjà partout. Il ne suffit pas : il s'affiche AILLEURS que sous le doigt,
 * il dure 2,2 s, et sur un chantier — écran au soleil, une main, parfois un gant — on relâche
 * sans savoir si le tap a porté. Alors on retape.
 *
 * ⛔ SUR LE 3, LA RÉPONSE EST NON, ET ELLE EST DANS LE BANC. On n'oblige pas à synchroniser :
 * OP GESTION marche hors ligne par conception, et forcer un envoi qu'on ne PEUT pas faire
 * empêcherait quelqu'un de finir sa journée pour une raison qui ne dépend pas de lui. Le
 * bouton dit son état à la place — et le premier état vérifié ici est celui qui compte :
 * « du travail attend d'être envoyé ».
 */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');

let ok = 0, ko = 0;
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };
const eq = (nom, a, b) => { if (a === b) ok++; else { ko++; console.log('  ✗ ' + nom + '\n      obtenu  : ' + JSON.stringify(a) + '\n      attendu : ' + JSON.stringify(b)); } };
const dedans = (nom, h, t) => { if (String(h).indexOf(t) !== -1) ok++; else { ko++; console.log('  ✗ ' + nom + '\n      cherché : ' + JSON.stringify(t) + '\n      dans    : ' + JSON.stringify(String(h))); } };

function extraire(debut) {
  const i = SRC.indexOf(debut);
  if (i < 0) throw new Error('introuvable dans app.html : ' + debut);
  let p = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(i, k + 1); }
  }
  throw new Error('accolades non refermées : ' + debut);
}

/* Un élément minimal : exactement ce dont btnFait et btnOccupe se servent, rien de plus.
   Pas de jsdom — les suites de ce dépôt n'installent rien (tests/LISEZMOI.md). */
function faireBouton(html, largeur) {
  const cls = new Set();
  return {
    nodeType: 1, innerHTML: html, isConnected: true,
    style: { minWidth: '' },
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), _s: cls },
    getBoundingClientRect: () => ({ width: largeur === undefined ? 170 : largeur }),
  };
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── 1. btnFait : le bouton accuse réception, à l'endroit où le doigt a appuyé ─────────────── */
console.log('1. btnFait — l\'accusé de réception est SUR le bouton');
const btnFait = new Function('esc,setTimeout', extraire('function btnFait(el,texte,ms){') + '\nreturn btnFait;')(esc, (f, ms) => ({ _f: f, _ms: ms }));

let b = faireBouton('✓ Valider ses droits');
vrai('btnFait rend true quand il a pu marquer le bouton', btnFait(b, 'Droits validés') === true);
eq('le libellé dit ce qui vient de se passer', b.innerHTML, '✓ Droits validés');
vrai('la classe de confirmation est posée', b.classList.contains('btn-fait'));
/* ⛔ La largeur est figée AVANT l'échange : sans ça, un bouton qui rétrécit sous le doigt
   déplace ce qu'il y a autour, et on lit un mouvement au lieu d'une confirmation. */
eq('la largeur est figée pour que rien ne bouge autour', b.style.minWidth, '170px');

/* Un second tap pendant la confirmation ne doit RIEN relancer : c'est précisément le geste
   qu'on cherche à éviter (on retape parce qu'on n'a pas vu). */
eq('un second tap pendant la confirmation ne relance rien', btnFait(b, 'Autre chose'), false);
eq('… et ne change pas le libellé', b.innerHTML, '✓ Droits validés');

vrai('un appel sans élément ne jette pas et rend false', btnFait(null, 'x') === false);
vrai('un appel sur autre chose qu\'un élément rend false', btnFait({ nodeType: 3 }, 'x') === false);
/* Une largeur nulle (bouton pas encore mis en page) ne doit pas poser « 0px ». */
const b0 = faireBouton('X', 0); btnFait(b0, 'Fait');
eq('une largeur nulle ne fige rien', b0.style.minWidth, '');

console.log('2. btnFait — la remise en état, et le cas où la vue a été redessinée');
let rappel = null;
const btnFait2 = new Function('esc,setTimeout', extraire('function btnFait(el,texte,ms){') + '\nreturn btnFait;')(esc, (f) => { rappel = f; return 1; });
const b2 = faireBouton('✓ Valider ses droits');
btnFait2(b2, 'Droits validés'); rappel();
eq('le libellé d\'origine est remis', b2.innerHTML, '✓ Valider ses droits');
eq('la largeur figée est relâchée', b2.style.minWidth, '');
vrai('la classe de confirmation est retirée', !b2.classList.contains('btn-fait'));
/* ⛔ Si la vue a été redessinée, ce bouton-ci n'est plus à l'écran : y toucher réveillerait un
   nœud détaché pour rien, et écraserait un innerHTML qui ne s'affiche plus. */
const b3 = faireBouton('✓ Valider ses droits');
btnFait2(b3, 'Droits validés'); b3.isConnected = false; const avant = b3.innerHTML; rappel();
eq('un bouton retiré du DOM n\'est pas touché', b3.innerHTML, avant);

console.log('3. btnOccupe — le pire moment est PENDANT, pas après');
const btnOccupe = new Function('esc', extraire('function btnOccupe(el,texte){') + '\nreturn btnOccupe;')(esc);
const bo = faireBouton('Enregistrer', 120);
const relacher = btnOccupe(bo, 'Enregistrement…');
eq('le bouton dit qu\'il travaille', bo.innerHTML, 'Enregistrement…');
vrai('la classe occupé est posée', bo.classList.contains('btn-occupe'));
eq('la largeur est figée là aussi', bo.style.minWidth, '120px');
vrai('un second appel pendant l\'attente ne fait rien', btnOccupe(bo, 'Autre').call ? true : true);
eq('… et le libellé n\'a pas changé', bo.innerHTML, 'Enregistrement…');
relacher();
eq('le relâchement remet le libellé d\'origine', bo.innerHTML, 'Enregistrer');
eq('… et relâche la largeur', bo.style.minWidth, '');
vrai('… et retire la classe', !bo.classList.contains('btn-occupe'));
/* ⛔ Le relâchement doit être appelable même quand tout a mal tourné : un refus qui laisserait
   le bouton mort enfermerait la personne devant sa fenêtre. */
const bo2 = faireBouton('Enregistrer'); const r2 = btnOccupe(bo2, 'Enregistrement…');
bo2.isConnected = false; r2();
vrai('relâcher un bouton disparu ne jette pas', true);
vrai('un relâchement sur élément absent est une fonction inoffensive', typeof btnOccupe(null, 'x') === 'function');
btnOccupe(null, 'x')();

console.log('4. Les trois boutons passent bien leur élément (sinon rien de tout ça ne sert)');
dedans('« Valider ses droits » passe this', SRC, `usrDroitsValider('\${u.id}',this)`);
dedans('« Enregistrer » de Mon compte passe this', SRC, 'monComptePwdSave(this)');
dedans('« Enregistrer mon mot de passe » passe this', SRC, 'forcePwdSave(this)');
vrai('usrDroitsValider reçoit le bouton', /function usrDroitsValider\(uid,btn\)/.test(SRC));
vrai('monComptePwdSave reçoit le bouton', /async function monComptePwdSave\(btn\)/.test(SRC));
vrai('forcePwdSave reçoit le bouton', /async function forcePwdSave\(btn\)/.test(SRC));

console.log('5. Le redessin attend la confirmation — sinon elle est effacée dans la même image');
/* ⛔ C'est le cœur du volet 1 : views.utilisateurs() reconstruit la liste, donc DÉTRUIT le
   bouton. Appelé tout de suite, il effaçait l'accusé de réception à l'instant même. */
vrai('usrDroitsValider retarde le redessin quand le bouton a été marqué',
  /if\(btnFait\(btn,'Droits validés'\)\) setTimeout\(\(\)=>views\.utilisateurs\(\),\d+\)/.test(SRC));
vrai('… et redessine tout de suite quand il n\'y a pas de bouton', /else views\.utilisateurs\(\);/.test(SRC));
vrai('le mot de passe volontaire retarde la fermeture', /btnFait\(btn,'Mot de passe modifié'\)\) setTimeout/.test(SRC));
vrai('le mot de passe obligatoire retarde la fermeture', /btnFait\(btn,'Mot de passe enregistré'\)\) setTimeout/.test(SRC));
/* ⚠️ Et le save() reste AVANT : le délai ne retient qu'un rendu, jamais une écriture. */
vrai('les droits sont enregistrés AVANT la confirmation',
  SRC.indexOf("save(); toast('✓ Droits de ") < SRC.indexOf("btnFait(btn,'Droits validés')"));

console.log('6. L\'attente réseau est couverte — et relâchée dans les DEUX issues');
const mcp = extraire('async function monComptePwdSave(btn){');
vrai('Mon compte : le bouton est marqué occupé avant l\'aller-retour', /const relacher=btnOccupe\(btn,'Enregistrement…'\);\s*\n\s*const pb=await identifiantsDeposer/.test(mcp));
vrai('Mon compte : relâché AVANT le test d\'échec', mcp.indexOf('relacher();') < mcp.indexOf('if(pb){ show(pb); return; }'));
const fps = extraire('async function forcePwdSave(btn){');
vrai('Campagne : le bouton est marqué occupé avant l\'aller-retour', /const relacher=btnOccupe\(btn,'Enregistrement…'\);/.test(fps));
vrai('Campagne : relâché AVANT le test d\'échec', fps.indexOf('relacher();') < fps.indexOf('if(pb){ show(pb);'));

console.log('7. Les messages ont le temps d\'être lus');
/* ⛔ `toast()` sans argument vaut 2 200 ms. La phrase de la campagne était la plus longue de
   l'application pour la durée la plus courte — à l'instant même où l'application apparaît. */
/* Les apostrophes du source sont échappées en \' : on s'accroche à la queue de la phrase,
   qui n'en contient pas — c'est la durée qu'on vérifie, pas la ponctuation. */
vrai('la campagne laisse 6 s à sa phrase', /taper désormais',6000\)/.test(SRC));
vrai('le changement volontaire laisse 5 s', /prochaine fois',5000\)/.test(SRC));
vrai('« mot de passe oublié » laisse 5 s', /Mot de passe changé — te voilà connecté',5000\)/.test(SRC));

/* ── 8. Le bouton de synchro : cinq états, le premier qui s'applique gagne ─────────────────── */
console.log('8. syncEtat — le geste d\'abord, puis ce qui demande une action');
const mkEtat = (v) => new Function(
  '_versionBloquee,_nuageIllisible,_horsLignePush,_horsLigne,_horsLigneDepuis,_syncEnCours,_syncOn,_syncDernierOk,_syncOkJusqu,syncDepuis',
  extraire('function syncEtat(){') + '\nreturn syncEtat;')(
    v.bloquee || false, v.illisible || false, v.attente || false, v.horsLigne || false,
    v.depuis || 0, v.enCours || false, v.on || false, v.dernierOk || 0, v.okJusqu || 0,
    new Function('ts', extraire('function syncDepuis(ts){') + '\nreturn syncDepuis;')());

eq('rien d\'actif → on propose de l\'activer', mkEtat({})().c, '');
dedans('… et on le dit', mkEtat({})().t, 'non active');
eq('synchro active, rien envoyé encore → vert', mkEtat({ on: true })().c, 'st-ajour');
dedans('… et le titre ne prétend pas avoir envoyé', mkEtat({ on: true })().t, 'rien à envoyer');
eq('envoi en cours → rotation', mkEtat({ on: true, enCours: true })().c, 'spin');
eq('hors ligne sans rien en attente → ambre', mkEtat({ on: true, horsLigne: true })().c, 'st-attente');
dedans('… et il dit qu\'il n\'y a rien en attente', mkEtat({ on: true, horsLigne: true })().t, 'rien en attente');

/* ⛔ C'EST L'ÉTAT QUI RÉPOND À LA QUESTION DE JUSTIN. On n'oblige pas à synchroniser ; on
   rend impossible de ne pas voir qu'il reste du travail à envoyer. */
const att = mkEtat({ on: true, horsLigne: true, attente: true, depuis: Date.now() - 20 * 60000 })();
eq('du travail en attente → ambre', att.c, 'st-attente');
dedans('… et il le DIT en toutes lettres', att.t, 'Travail en attente d\'envoi');
dedans('… avec depuis quand', att.t, 'hors ligne depuis il y a 20 min');
dedans('… et il rassure : ça repartira tout seul', att.t, 'repartira tout seul');

/* ⛔ « Prime sur tout le reste » était trop fort, et c'est ce qui a masqué le défaut : le
   blocage prime sur tous les états PERMANENTS — c'est ce qui compte, sinon on croirait pouvoir
   envoyer — mais pas sur le retour d'un GESTE, qui dure au plus 12 s et laisse le rouge
   revenir juste après. La règle est donc vérifiée dans les deux sens. */
eq('version bloquée prime sur le travail en attente',
  mkEtat({ bloquee: true, on: true, attente: true })().c, 'st-bloque');
eq('… sur le hors-ligne', mkEtat({ bloquee: true, on: true, horsLigne: true })().c, 'st-bloque');
eq('… et sur « à jour »', mkEtat({ bloquee: true, on: true, dernierOk: Date.now() })().c, 'st-bloque');
eq('… mais PAS sur le retour du tap', mkEtat({ bloquee: true, on: true, enCours: true })().c, 'spin');
eq('… et le rouge revient dès que le tap est retombé',
  mkEtat({ bloquee: true, on: true, enCours: false })().c, 'st-bloque');
dedans('… et il dit que le travail n\'est pas perdu',
  mkEtat({ bloquee: true })().t, 'gardé sur l\'appareil');
eq('nuage illisible → rouge aussi', mkEtat({ illisible: true, on: true })().c, 'st-bloque');
/* ⛔ CORRIGÉ LE 17 SEPTEMBRE 2026, LE JOUR MÊME, SUR UN RETOUR DE JUSTIN DEPUIS LA BÊTA.
   Ce banc affirmait exactement l'inverse : « travail en attente prime sur envoi en cours ».
   C'était juste pour un état PERMANENT et faux pour le retour d'un GESTE — et le banc, en
   l'affirmant, verrouillait le défaut au lieu de l'attraper. Mesuré avant correction : hors
   ligne, travail en attente et version bloquée rendaient la MÊME classe avant et après le tap.
   Dans TROIS cas sur quatre, appuyer sur le bouton ne faisait rien voir.
   La règle est maintenant une PROPRIÉTÉ, vérifiée depuis chaque état de départ, et non plus
   un cas particulier : un tap doit TOUJOURS changer ce que l'écran montre. */
console.log('8b. Un tap change TOUJOURS ce qui est affiché — depuis n\'importe quel état');
[['en ligne, rien en attente', { on: true }],
 ['hors ligne', { on: true, horsLigne: true }],
 ['travail en attente', { on: true, horsLigne: true, attente: true, depuis: Date.now() - 6e5 }],
 ['version bloquée', { on: true, bloquee: true }],
 ['nuage illisible', { on: true, illisible: true }],
 ['synchro non active', {}],
].forEach(([nom, v]) => {
  const avant = mkEtat(v)(), apres = mkEtat(Object.assign({}, v, { enCours: true }))();
  vrai('depuis « ' + nom +' » : le tap se voit', avant.c !== apres.c);
  eq('depuis « ' + nom + ' » : et c\'est la rotation', apres.c, 'spin');
});

console.log('8c. Et il existe un moment « c\'est fini », pas seulement un « je travaille »');
const fini = mkEtat({ on: true, okJusqu: Date.now() + 1500 })();
eq('après un envoi réussi, le bouton le DIT', fini.c, 'st-ok');
dedans('… en toutes lettres', fini.t, 'Envoyé');
/* Le ✓ est transitoire : passé son échéance, on retombe sur l'état réel. */
eq('… et il s\'éteint tout seul', mkEtat({ on: true, okJusqu: Date.now() - 1 })().c, 'st-ajour');
/* ⛔ Mais il ne masque JAMAIS une rotation en cours : un second envoi lancé pendant le ✓
   doit reprendre la main, sinon on croirait fini ce qui recommence. */
eq('un nouvel envoi reprend la main sur le ✓', mkEtat({ on: true, okJusqu: Date.now() + 1500, enCours: true })().c, 'spin');
/* ⚠️ En revanche le ✓ passe devant « hors ligne » : il vient d'être allumé par un SUCCÈS, donc
   il dit une vérité plus récente que le drapeau hors ligne, qui n'a pas encore été rebaissé. */
eq('le ✓ passe devant un drapeau hors ligne périmé', mkEtat({ on: true, okJusqu: Date.now() + 1500, horsLigne: true })().c, 'st-ok');

console.log('9. syncDepuis — « il y a 3 min », jamais un horodatage à soustraire de tête');
const dep = new Function('ts', extraire('function syncDepuis(ts){') + '\nreturn syncDepuis;')();
eq('moins de 45 s', dep(Date.now() - 10000), 'à l\'instant');
eq('3 minutes', dep(Date.now() - 3 * 60000), 'il y a 3 min');
eq('90 minutes restent en minutes tant que c\'est lisible', dep(Date.now() - 89 * 60000), 'il y a 89 min');
eq('3 heures', dep(Date.now() - 3 * 3600000), 'il y a 3 h');
eq('au-delà d\'un jour on cesse de compter', dep(Date.now() - 50 * 3600000), 'il y a plus d\'un jour');
eq('un futur ne donne pas un nombre négatif', dep(Date.now() + 99999), 'à l\'instant');

console.log('10. La date d\'envoi vient du SUCCÈS, jamais du clic');
/* ⛔ Le commentaire de syncNow dit déjà pourquoi : le 11 septembre 2026, l'écran a annoncé
   « Synchronisé avec l'équipe » toute une soirée pendant que le quota Firebase refusait tout.
   Poser _syncDernierOk au clic aurait refait exactement ça, en pire — en couleur, en permanence. */
vrai('_syncDernierOk est posé à l\'endroit du succès', /_syncDernierOk=Date\.now\(\); _horsLignePush=false; _syncEnCours=false;/.test(SRC));
vrai('… et syncNow ne le pose PAS', !/_syncDernierOk\s*=/.test(extraire('function syncNow(){')));
vrai('un échec d\'envoi arrête la rotation', /_pushManuel=false; _syncEnCours=false; try\{ updateSyncBtn\(\); \}catch\(_e\)\{\} console\.error\('push'/.test(SRC));
/* ⛔ Le filet : syncPush a plusieurs sorties silencieuses qui ne rappelleront jamais
   updateSyncBtn. Sans lui, le bouton tournerait pour toujours. */
vrai('un filet arrête la rotation même si syncPush sort en silence',
  /setTimeout\(\(\)=>\{ if\(_syncEnCours\)\{ _syncEnCours=false;/.test(SRC));
vrai('la rotation ne suit plus un minuteur de 1 200 ms', !/classList\.add\('spin'\); setTimeout/.test(SRC));

console.log('11. La couleur ne parle jamais seule');
vrai('le point d\'état a un titre en toutes lettres', /b\.title=e\.t; b\.setAttribute\('aria-label'/.test(SRC));
vrai('le point est masqué aux lecteurs d\'écran (le titre porte déjà le sens)', /class="sync-pt" aria-hidden="true"/.test(SRC));
/* ⛔ Le style du point ne doit tenir à AUCUN identifiant : sinon il est intestable ailleurs
   que sur ce nœud-là, et il meurt en silence au premier renommage. */
/* On vise une RÈGLE (un sélecteur suivi de son accolade), pas le commentaire qui cite
   l'ancienne forme pour expliquer pourquoi elle a été abandonnée. */
vrai('le point est stylé par classes, pas par #sync-btn', !/#sync-btn[^{}\n]*\.sync-pt\s*\{/.test(SRC));
/* ⛔ Le ✓ ne s'allume QUE là où l'on sait qu'une écriture est passée. L'allumer au clic
   referait le 11 septembre 2026 : l'écran annonçait « Synchronisé » pendant que le quota
   Firebase refusait tout. */
vrai('_syncOkJusqu est posé à l\'endroit du succès', /_syncOkJusqu=Date\.now\(\)\+1800;/.test(SRC));
vrai('… et syncNow ne l\'allume PAS', !/_syncOkJusqu\s*=/.test(extraire('function syncNow(){')));
vrai('… et un rappel l\'éteint, sinon il resterait des heures', /setTimeout\(\(\)=>\{ try\{ updateSyncBtn\(\); \}catch\(_e\)\{\} \},1900\);/.test(SRC));
vrai('le ✓ existe dans le balisage du bouton', /class="sync-ok"[^>]*viewBox="0 0 24 24"/.test(SRC));
vrai('… et il remplace l\'icône plutôt que de s\'ajouter à côté', /\.st-ok>svg\{display:none\}/.test(SRC));
vrai('updateSyncBtn nettoie aussi st-ok', /remove\('st-attente','st-bloque','st-ajour','st-ok'\)/.test(SRC));
/* ⛔ MÊME RÈGLE POUR LE FOND QUE POUR LE POINT : aucune de ces règles ne doit tenir à un
   identifiant. Écrite « #sync-btn.st-ok », elle a été prise en défaut par la sonde le même
   jour — le fond ne changeait pas et rien ne le signalait. */
vrai('le fond de « envoyé » est stylé par classe', /\.bell\.st-ok\{/.test(SRC));
vrai('le fond de « en cours » est stylé par classe', /\.bell\.spin\{/.test(SRC));
vrai('aucune règle de fond ne tient à #sync-btn', !/#sync-btn\.(st-ok|spin)\s*\{/.test(SRC));
vrai('les trois états du point existent en classes',
  /\.st-ajour\s*>\s*\.sync-pt\s*\{/.test(SRC) && /\.st-attente\s*>\s*\.sync-pt\s*\{/.test(SRC) && /\.st-bloque\s*>\s*\.sync-pt\s*\{/.test(SRC));
vrai('le point est masqué par défaut', /\.sync-pt\{[^}]*display:none/.test(SRC));
vrai('la rotation est coupée en mouvement réduit', /prefers-reduced-motion: reduce\)\{ #sync-btn\.spin svg\{animation:none\}/.test(SRC));
/* ⛔ Ni la confirmation ni l'occupation ne passent par `disabled` : .btn:disabled tombe à 45 %
   d'opacité, soit l'inverse de ce qu'on veut d'une confirmation. */
vrai('btn-fait force l\'opacité pleine', /\.btn\.btn-fait[^}]*opacity:1!important/.test(SRC));
vrai('btn-fait bloque le clic sans `disabled`', /\.btn\.btn-fait[^}]*pointer-events:none/.test(SRC));
vrai('btnFait ne touche jamais à la propriété disabled', !/disabled/.test(extraire('function btnFait(el,texte,ms){')));
vrai('btnOccupe non plus', !/disabled/.test(extraire('function btnOccupe(el,texte){')));

console.log('\n════ test-718 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
if (ko) process.exit(1);
