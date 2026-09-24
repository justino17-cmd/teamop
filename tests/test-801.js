/* ⛔ CE QUE CE FICHIER GARDE — LES PHOTOS DE PLANS SORTENT DU DOCUMENT DE L'ÉQUIPE (v744).

   La dette (REPRISE, B2) : les photos vivent sur le VPS depuis la v702 (`piece:<64 hex>`), mais
   DEUX familles de photos y échappaient — et ce sont les plus lourdes de l'application :
   · la photo d'un PLAN D'APPÂTAGE (`db.plansSite[client][k].img`, 1 200 px) : `plansSite` est un
     dictionnaire, `syncSortirPieces` ne le visitait pas et `syncAlleger` ne savait pas l'alléger ;
   · les photos de l'onglet « Plans » d'une intervention (`i.plans`, 1 400 px) : dans AUCUNE liste,
     ni sorties ni allégeables — trois prises hors réseau rendaient la base « impossible » et
     arrêtaient la synchro de toute l'entreprise.
   Et en l'écrivant, un défaut de la v702 : l'empreinte d'une fiche lisait le CONTENU d'une photo
   déposée. Relire la photo pour l'écran (`intPhotosCombler`) suffisait à la « modifier » : au
   premier `save()`, `_m` neuf, et l'appareil qui ne faisait que REGARDER gagnait la fusion.

   On EXÉCUTE les vraies fonctions, extraites du fichier livré, sur des bases simulées : on ne
   relit pas l'intention, on regarde ce qui part, ce qui revient et ce qui s'écrit. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

/* Une déclaration de premier niveau, entière : bornée à la déclaration SUIVANTE, puis le plus long
   bloc qui compile (la règle de `tests/LISEZMOI.md`). */
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }

/* La tranche des pièces est prise DANS L'ORDRE DU FICHIER (PH_MARQUE → syncAlleger) : c'est ainsi
   que `test-714` garde la zone morte temporelle, et c'est là que vivent planImgSrc/planImgsResoudre. */
const iMarque = APP.indexOf('const PH_MARQUE='), iAlleger = APP.indexOf('function syncAlleger(base, budget){');
vrai('la tranche des pièces est trouvée, dans l\'ordre', iMarque > 0 && iAlleger > iMarque);
const TRANCHE = APP.slice(iMarque, iAlleger);
vrai('   et elle porte les deux aides des plans', /function planImgSrc\(/.test(TRANCHE) && /async function planImgsResoudre\(/.test(TRANCHE));

const CODE = ['const COLLS_HORS_FUSION=', 'function collsFusion(d){', 'const COLLS_DICT=', 'function dictFusion(prio,autre){',
  'function recEmpreinte(r){', 'const stockEmpreinte=', 'const MS_MAX=', 'let _ombre={}, _ombreStock={};',
  'function ombreRelever(o,os){', 'const TOMBE_JOURS=', 'function estampiller(){', 'function msElaguer(ms,st,now){',
  'function boxFusionFine(gagnante,perdante){', 'function tombesElaguer(t,now){', 'function tombesUnion(a,b){', 'function numMaxUnion(a,b){',
  'function plansFusionFine(', 'function plansSiteFusion(',
  'function fusionnerBases(local,remote,prioriteLocale){', 'function baseSignature(d){',
  'function syncAlleger(base, budget){', 'function syncRegreffer(', 'function opFichiersDe(', 'function opAmpute(',
  'function pieceMotifTexte(', 'function papMarque(', 'function papImgEmpCalc(', 'const _papImgEmp=', 'function papImgEmpreinte(',
  'async function planImgDeposer(', 'async function intPlanDeposer('].map(decoupe).join('\n');
vrai('les trente et une déclarations sont extraites du fichier réel', CODE.length > 5000);

const neuf = (etat) => new Function('etat', `let db=etat.db; const syncEnabled=()=>true;
  const E=etat; function toast(m){ E.toasts.push(String(m)); } function save(){ E.saves++; }
  async function pieceLire(id){ return E.pieceLire(id); } async function pieceDeposer(d){ return E.pieceDeposer(d); }
  ${TRANCHE}
  ${CODE}
  return { estampiller, ombreRelever, fusionnerBases, syncSortirPieces, syncAlleger, syncRegreffer, opFichiersDe, opAmpute,
    photosResoudre, planImgsResoudre, planImgSrc, photoSrc, photoPid, photoMarquer, papImgEmpreinte, papImgEmpCalc,
    planImgDeposer, intPlanDeposer, recEmpreinte, etatImg:()=>_papImgEtat, getDb:()=>db, setDb:d=>{db=d;} };`)(etat);
const copie = o => JSON.parse(JSON.stringify(o));
const monter = (base, extra) => { const E = Object.assign({ db: copie(base), toasts: [], saves: 0,
    pieceLire: async () => ({ inconnu: true, motif: 'reseau' }), pieceDeposer: async () => ({ erreur: true, motif: 'reseau' }) }, extra || {});
  const g = neuf(E); g.E = E; g.ombreRelever(); return g; };

const H1 = '1'.repeat(64), H2 = 'b'.repeat(64), H3 = 'c'.repeat(64);
const IMG = 'data:image/jpeg;base64,' + 'P'.repeat(6000), IMG2 = 'data:image/jpeg;base64,' + 'Q'.repeat(5000);
const T0 = 1790000000000;
const plan = (id, img, extra) => Object.assign({ id, nom: 'RDC', mode: 'img', img, postes: [{ id: 'po1', num: 1, x: 10, y: 20, _m: T0 }], version: 1, historique: [], _m: T0 }, extra || {});

(async () => {
console.log('\n══ 1. ⛔ REGARDER UNE PHOTO NE LA « MODIFIE » PAS (le défaut de la v702) ══\n');
{
  const g = monter({ interventions: [{ id: 'i1', titre: 'Passage', _m: T0, photos: ['piece:' + H1], plans: ['piece:' + H2], comments: [] }], _tombes: {} },
    { pieceLire: async (id) => ({ dataUrl: id === H1 ? IMG : IMG2 }) });
  const i = () => g.getDb().interventions[0];
  const n = (await g.photosResoudre(i().photos)) + (await g.photosResoudre(i().plans));
  v('la population : les deux photos sont bien relues en mémoire', [n, g.photoSrc(i().photos[0]).length, g.photoSrc(i().plans[0]).length], [2, IMG.length, IMG2.length]);
  g.estampiller();
  v('⛔⛔ … et le save() qui suit ne tamponne PAS la fiche (elle n\'a pas changé)', i()._m, T0);
  i().comments.push({ ts: 1, txt: 'vrai geste' }); g.estampiller();
  vrai('   contre-épreuve : un VRAI geste la tamponne (l\'estampille n\'est pas éteinte)', i()._m > T0);
  const R = g.recEmpreinte;
  v('l\'empreinte coupe au marqueur : « piece:H » ≡ « piece:H:contenu »', R({ p: ['piece:' + H1] }) === R({ p: ['piece:' + H1 + ':' + IMG] }), true);
  v('   mais deux pièces différentes restent différentes', R({ p: ['piece:' + H1] }) === R({ p: ['piece:' + H2] }), false);
  v('   et deux photos EN CLAIR différentes aussi (rien ne change pour elles)', R({ p: [IMG] }) === R({ p: [IMG2] }), false);
  v('   un faux marqueur (pas 64 hexadécimaux) n\'est pas coupé', R({ p: ['piece:' + 'Z'.repeat(64) + ':x'] }) === R({ p: ['piece:' + 'Z'.repeat(64) + ':y'] }), false);
  v('   le texte d\'un utilisateur qui commence par « piece: » non plus', R({ t: 'piece: la cuisine est propre, rien à signaler de plus aujourd\'hui ni demain ni après-demain' }) === R({ t: 'piece: la cuisine est propre, rien à signaler de plus aujourd\'hui ni demain ni après-demain !' }), false);
}

console.log('\n══ 2. CE QUI PART DANS LE DOCUMENT DE L\'ÉQUIPE ══\n');
{
  const base = { plansSite: { c1: [plan('A', 'piece:' + H1 + ':' + IMG), plan('B', IMG2), plan('C', 'piece:' + H3)], c2: [plan('D', IMG)] },
    interventions: [{ id: 'i1', plans: [IMG, 'piece:' + H2 + ':' + IMG2], photos: [] }, { id: 'i2', plans: [IMG] }] };
  const g = monter(base); const avant = JSON.stringify(g.getDb());
  const r = g.syncSortirPieces(g.getDb());
  v('⛔ la photo de plan DÉPOSÉE ne voyage plus que par son identifiant', r.copie.plansSite.c1[0].img, 'piece:' + H1);
  v('   et le reste du plan est intact (postes, nom)', [r.copie.plansSite.c1[0].nom, r.copie.plansSite.c1[0].postes.length], ['RDC', 1]);
  v('⛔ la photo de plan SANS identifiant garde son contenu — c\'est le seul exemplaire au monde', r.copie.plansSite.c1[1].img, IMG2);
  v('   un marqueur déjà nu ne bouge pas', r.copie.plansSite.c1[2].img, 'piece:' + H3);
  v('⛔ l\'onglet « Plans » : la déposée sort, la locale reste, les rangs ne bougent pas', r.copie.interventions[0].plans, [IMG, 'piece:' + H2]);
  v('   deux pièces sorties, pas une de plus', r.sorties, 2);
  v('⛔⛔ LA BASE LOCALE N\'EST PAS TOUCHÉE, octet pour octet', JSON.stringify(g.getDb()), avant);
  vrai('   copies à chaque étage : dictionnaire, liste du client, plan',
    r.copie.plansSite !== g.getDb().plansSite && r.copie.plansSite.c1 !== g.getDb().plansSite.c1 && r.copie.plansSite.c1[0] !== g.getDb().plansSite.c1[0]);
  vrai('   et un client sans pièce n\'est pas copié pour rien', r.copie.plansSite.c2 === g.getDb().plansSite.c2);
  const vide = g.syncSortirPieces({ plansSite: { c1: [plan('B', IMG2)] } });
  vrai('   une base sans pièce à sortir est rendue telle quelle (même objet)', vide.sorties === 0);
}

console.log('\n══ 3. ⛔ L\'ONGLET « PLANS » S\'ALLÈGE COMME LES MÉDIAS — PLUS DE SYNCHRO À L\'ARRÊT ══\n');
{
  const gros = 'data:image/jpeg;base64,' + 'G'.repeat(60000);
  const base = { interventions: [{ id: 'i1', _m: T0, plans: [gros, gros + 'x', gros + 'y'], photos: [] }] };
  const g = monter(base); const avant = JSON.stringify(g.getDb());
  const a = g.syncAlleger(g.getDb(), 40000);
  v('les trois photos de plan en clair sont retirées de la COPIE poussée', a.copie.interventions[0].plans.length, 0);
  v('   et c\'est dit : plansHorsNuage', a.copie.interventions[0].plansHorsNuage, 3);
  v('   la base tient désormais (plus « impossible »)', a.impossible, false);
  v('⛔ la base LOCALE garde ses trois photos', JSON.stringify(g.getDb()), avant);
  v('   un enregistrement amputé ne part pas au socle (opAmpute)', g.opAmpute(a.copie.interventions[0]), 'plans');
}

console.log('\n══ 4. ⛔ CE QUI REVIENT : L\'APPAREIL QUI A LA PHOTO NE LA PERD PAS ══\n');
{
  /* Le trajet complet : A photographie le plan (déposé), synchronise ; B le renomme (plan plus
     récent), synchronise ; A reçoit. Les champs du plan viennent de B — la photo nue aussi. */
  const baseA = { plansSite: { c1: [plan('A', 'piece:' + H1 + ':' + IMG, { _m: T0 + 10 })] },
    interventions: [{ id: 'i1', _m: T0, plans: ['piece:' + H2 + ':' + IMG2], photos: [] }], _tombes: {} };
  const A = monter(baseA);
  const parti = A.syncSortirPieces(A.getDb()).copie;
  const chezB = copie(parti); chezB.plansSite.c1[0].nom = 'Réserve'; chezB.plansSite.c1[0]._m = T0 + 50;
  const fus = A.fusionnerBases(A.getDb(), chezB, false);
  v('la population : la fusion a bien pris les champs de B (le nom) et sa photo nue', [fus.plansSite.c1[0].nom, fus.plansSite.c1[0].img], ['Réserve', 'piece:' + H1]);
  const n = A.syncRegreffer(A.getDb(), fus);
  v('⛔⛔ la photo du plan est RENDUE à celui qui l\'a prise', fus.plansSite.c1[0].img, 'piece:' + H1 + ':' + IMG);
  v('⛔ et la photo de l\'onglet « Plans » aussi', fus.interventions[0].plans[0], 'piece:' + H2 + ':' + IMG2);
  v('   deux regreffes, pas une de plus', n, 2);
  /* allégées (sans identifiant) : la règle `plansHorsNuage`, comme `photosHorsNuage` */
  const loc = { interventions: [{ id: 'i1', plans: [IMG, IMG2] }] }, rec = { interventions: [{ id: 'i1', plans: [], plansHorsNuage: 2 }] };
  A.syncRegreffer(loc, rec);
  v('⛔ une copie ALLÉGÉE ne prend pas ses photos de plan à l\'appareil qui les a', rec.interventions[0].plans, [IMG, IMG2]);
  const loc2 = { plansSite: { c1: [plan('A', IMG)] } }, rec2 = { plansSite: { c1: [plan('A', 'piece:' + H3)] } };
  A.syncRegreffer(loc2, rec2);
  v('   une pièce que l\'appareil n\'a pas reste nue (rien n\'est inventé)', rec2.plansSite.c1[0].img, 'piece:' + H3);
}

console.log('\n══ 5. LE REGISTRE DES PIÈCES DU SOCLE LES DÉCLARE (sinon le ménage les effacerait) ══\n');
{
  const g = monter({});
  v('l\'onglet « Plans » déclare ses pièces', g.opFichiersDe({ id: 'i1', plans: ['piece:' + H2, IMG], photos: ['piece:' + H1] }), [H1, H2]);
  v('⛔ une ligne de plansSite ({v:[plans]}) déclare la photo de chaque plan', g.opFichiersDe({ v: [plan('A', 'piece:' + H1 + ':' + IMG), plan('B', IMG), plan('C', 'piece:' + H3)] }), [H1, H3]);
  v('   une ligne sans pièce ne déclare rien', g.opFichiersDe({ v: [plan('B', IMG)] }), []);
}

console.log('\n══ 6. ⛔ L\'EMPREINTE DU PLAN D\'IMPLANTATION NE BOUGE PAS AVEC LE DÉPÔT ══\n');
{
  const g = monter({});
  /* l'ANCIENNE recEmpreinte, texte exact d'avant la v744 : un plan déjà envoyé ne doit pas passer à « modifié » */
  function vieux(r) { let h = 2166136261; const t = JSON.stringify(r, (k, v) => (k === '_m' || k === '_ms') ? undefined : v) || ''; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  v('⛔ un plan d\'AVANT (photo en clair, sans imgEmp) rend EXACTEMENT l\'empreinte d\'avant', g.papImgEmpreinte({ id: 'L', img: IMG }), IMG.length + ':' + vieux(IMG));
  const E = g.papImgEmpCalc(IMG);
  v('   papImgEmpCalc est la même formule', E, IMG.length + ':' + vieux(IMG));
  v('⛔⛔ un plan neuf garde SON empreinte : en clair, déposé, puis contenu absent',
    [g.papImgEmpreinte({ id: 'N', img: IMG, imgEmp: E }), g.papImgEmpreinte({ id: 'N', img: 'piece:' + H1 + ':' + IMG, imgEmp: E }), g.papImgEmpreinte({ id: 'N', img: 'piece:' + H1, imgEmp: E })], [E, E, E]);
  v('   déposé sans empreinte : l\'identifiant la tient, contenu présent ou non',
    [g.papImgEmpreinte({ id: 'X', img: 'piece:' + H1 }), g.papImgEmpreinte({ id: 'X', img: 'piece:' + H1 + ':' + IMG })], ['p:' + H1, 'p:' + H1]);
}

console.log('\n══ 7. ⛔ LE DÉPÔT : ENREGISTRÉ D\'ABORD, MARQUÉ AU RETOUR, SUR LE PLAN VIVANT ══\n');
  {
    const g = monter({ plansSite: { c1: [plan('A', IMG)] } }, { pieceDeposer: async (d) => ({ id: d === IMG ? H1 : H3 }) });
    await g.planImgDeposer('c1', 'A');
    const pl = g.getDb().plansSite.c1[0];
    v('⛔ la photo porte son identifiant ET garde son contenu', pl.img, 'piece:' + H1 + ':' + IMG);
    vrai('   le plan est daté (la version marquée gagne la fusion contre la version en clair)', pl._m > T0);
    v('   un seul save()', g.E.saves, 1);
    await g.planImgDeposer('c1', 'A');
    v('   déjà déposée : on ne redépose pas', g.E.saves, 1);
  }
  {
    const g = monter({ plansSite: { c1: [plan('A', IMG)] } }, { pieceDeposer: async () => ({ erreur: true, motif: 'reseau' }) });
    await g.planImgDeposer('c1', 'A');
    v('⛔ échec : la photo reste en clair, rien n\'est enregistré', [g.getDb().plansSite.c1[0].img === IMG, g.E.saves], [true, 0]);
    vrai('   et on le DIT, avec le mot juste (« Plan gardé sur cet appareil »)', g.E.toasts.some(t => /Plan gardé sur cet appareil/.test(t)));
  }
  {
    let G; const g = G = monter({ plansSite: { c1: [plan('A', IMG)] } }, { pieceDeposer: async () => { G.getDb().plansSite.c1[0].img = IMG2; return { id: H1 }; } });
    await g.planImgDeposer('c1', 'A');
    v('⛔ la photo reprise PENDANT l\'envoi ne reçoit pas l\'identifiant de l\'ancienne', g.getDb().plansSite.c1[0].img, IMG2);
  }
  {
    let G; const g = G = monter({ plansSite: { c1: [plan('A', IMG)] } }, { pieceDeposer: async () => { G.setDb(copie(G.getDb())); return { id: H1 }; } });
    const ancien = g.getDb().plansSite.c1[0];
    await g.planImgDeposer('c1', 'A');
    v('⛔ la synchro a remplacé la base pendant l\'envoi : c\'est le plan VIVANT qui est marqué', g.getDb().plansSite.c1[0].img, 'piece:' + H1 + ':' + IMG);
    v('   pas l\'objet d\'avant, qui n\'est plus dans la base', ancien.img, IMG);
  }
  {
    let G; const g = G = monter({ interventions: [{ id: 'i1', plans: [IMG2, IMG] }] }, { pieceDeposer: async () => { G.getDb().interventions[0].plans.splice(0, 1); return { id: H1 }; } });
    await g.intPlanDeposer('i1', IMG);
    v('⛔ onglet « Plans » : une photo supprimée pendant l\'envoi ne décale pas le marqueur sur la voisine', g.getDb().interventions[0].plans, ['piece:' + H1 + ':' + IMG]);
  }

  console.log('\n══ 8. LA RÉSOLUTION : EN MÉMOIRE, SANS RIEN ENREGISTRER, ET ELLE DIT CE QU\'ELLE N\'A PAS PU ══\n');
  {
    const g = monter({ plansSite: { c1: [plan('A', 'piece:' + H1), plan('B', 'piece:' + H2), plan('C', 'piece:' + H3), plan('D', IMG)] } },
      { pieceLire: async (id) => id === H1 ? { dataUrl: IMG } : id === H2 ? { absente: true } : { inconnu: true, motif: 'reseau' } });
    const r = await g.planImgsResoudre('c1');
    v('une arrivée, deux manques', [r.n, r.reste], [1, 2]);
    v('⛔ la photo arrivée est en mémoire', g.getDb().plansSite.c1[0].img, 'piece:' + H1 + ':' + IMG);
    v('⛔⛔ AUCUN save() — rien ne s\'écrit au seul affichage', g.E.saves, 0);
    v('   trois états, jamais deux : 404 = « absente », réseau = « inconnu »', [g.etatImg()[H2].e, g.etatImg()[H3].e], ['absente', 'inconnu']);
    v('   la photo en clair n\'est pas touchée', g.getDb().plansSite.c1[3].img, IMG);
  }
  {
    let G; const g = G = monter({ plansSite: { c1: [plan('A', 'piece:' + H1)] } }, { pieceLire: async () => { G.setDb(copie(G.getDb())); return { dataUrl: IMG }; } });
    await g.planImgsResoudre('c1');
    v('⛔ base remplacée pendant la lecture : le contenu va sur le plan VIVANT', g.getDb().plansSite.c1[0].img, 'piece:' + H1 + ':' + IMG);
  }
  {
    let G; const g = G = monter({ plansSite: { c1: [plan('A', 'piece:' + H1)] } }, { pieceLire: async () => { G.getDb().plansSite.c1[0].img = IMG2; return { dataUrl: IMG }; } });
    await g.planImgsResoudre('c1');
    v('⛔ une photo reprise pendant la lecture n\'est pas écrasée par l\'ancienne', g.getDb().plansSite.c1[0].img, IMG2);
  }

  console.log('\n══ 9. LES LECTEURS : AUCUN NE MET « piece:… » DANS UNE IMAGE ══\n');
  {
    /* commentaires retirés (blocs en début de ligne seulement — la règle du 21 septembre) */
    const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    const corps = (h) => { const i = SRC.indexOf(h); if (i < 0) return ''; let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); } } return ''; };
    v('⛔ plus aucun `${pl.img}` dans un gabarit', (SRC.match(/\$\{pl\.img\}/g) || []).length, 0);
    /* borné à la branche de l'onglet « Plans » : d'autres images (bon de livraison, preuves de
       contrôle) s'écrivent aussi `src="${ph}"`, et ne sont pas des pièces — la première version de
       ce motif les accusait. */
    const ongletPlans = SRC.slice(SRC.indexOf("} else if(intTab==='plans'){"), SRC.indexOf("} else if(intTab==='planApp'){"));
    vrai('   la branche de l\'onglet « Plans » est trouvée', ongletPlans.length > 200);
    v('⛔ plus aucune photo de l\'onglet « Plans » mise telle quelle dans un src', /src="\$\{ph\}"/.test(ongletPlans), false);
    vrai('   … elle passe par photoSrc, et l\'onglet relit ce qui vit sur le serveur', /src="\$\{photoSrc\(ph\)\}"/.test(ongletPlans) && /intPlansCombler\(id\)/.test(ongletPlans));
    v('   le PDF d\'implantation convertit le CONTENU, pas le marqueur', /papImplJpeg\(pl\.img/.test(SRC), false);
    const doc = corps('async function papImplDocument(');
    vrai('   … et relit les photos manquantes dans l\'INSTANTANÉ (figes), avant la première conversion',
      doc.indexOf('const pid=photoPid(pl.img); if(!pid||photoSrc(pl.img)) continue;') > 0 && doc.indexOf('await pieceLire(pid)') < doc.indexOf('await papImplJpeg('));
    vrai('   … et un plan d\'implantation sans son fond ne part pas', /rien n’est parti\.'\}; \}/.test(doc));
    const vue = corps('function papViewHtml(');
    vrai('⛔ l\'écran : un cadre qui dit ce qui se passe, jamais un plan écrasé à zéro', /class="pap-attente"/.test(vue) && /papImgCombler\(i\)/.test(vue));
    const comb = corps('function papImgCombler(');
    v('⛔ résoudre pour l\'écran n\'écrit RIEN', /save\(\)/.test(comb), false);
    vrai('   et ne relance pas en boucle un essai qui vient d\'échouer', /_papImgEchec\[cid\]/.test(comb));
    const pr = corps('async function printRapport(');
    vrai('⛔ le rapport PDF attend les photos de plans, et demande s\'il en manque', /await planImgsResoudre\(i\.clientId\)/.test(pr) && pr.indexOf('await planImgsResoudre(i.clientId)') < pr.indexOf("window.open('','_blank')"));
    const ds = corps('async function papDossierSanitaire(');
    vrai('⛔ le dossier sanitaire ouvre sa fenêtre DANS le geste, puis attend les plans', ds.indexOf("window.open('','_blank')") > 0 && ds.indexOf("window.open('','_blank')") < ds.indexOf('await planImgsResoudre(cid)'));
    vrai('   et referme l\'attente, pour que l\'écriture finale la REMPLACE', /Récupération des plans…<\/p>'\); w\.document\.close\(\);/.test(ds));
    const pp = corps('function papPlacePoste('), mp = corps('function papMovePoste(');
    vrai('⛔ pas de poste posé ni déplacé à l\'aveugle (garde AVANT toute écriture)',
      pp.indexOf('papSansFond(pl)') > 0 && pp.indexOf('papSansFond(pl)') < pp.indexOf('db.interventions') && mp.indexOf('papSansFond(pl)') > 0 && mp.indexOf('papSansFond(pl)') < mp.indexOf('papSetXY('));
    const del = corps('function paDelPlan('), idel = corps('function intPlanDel(');
    vrai('   supprimer un plan retire aussi sa pièce du serveur, APRÈS la suppression locale',
      del.indexOf('plans.splice(ix,1)') > 0 && del.indexOf('plans.splice(ix,1)') < del.indexOf('pieceSupprimer(pid)')
      && idel.indexOf('i.plans.splice(ix,1)') > 0 && idel.indexOf('i.plans.splice(ix,1)') < idel.indexOf('pieceSupprimer(pid)'));
    const rep = corps('async function papRephoto(');
    vrai('   reprendre la photo : nouvelle empreinte, ancienne pièce retirée, nouvelle déposée',
      /pl\.imgEmp=papImgEmpCalc\(img\)/.test(rep) && rep.indexOf('save()') < rep.indexOf('pieceSupprimer(ancienne)') && /planImgDeposer\(i\.clientId,pl\.id\)/.test(rep));
    const crea = [corps('async function paAddPlan('), corps('async function papAddPhotoNiveau(')];
    vrai('   les deux créations posent l\'empreinte et déposent APRÈS le save()',
      crea.every(c => /imgEmp:papImgEmpCalc\(img\)/.test(c) && c.indexOf('save()') < c.indexOf('planImgDeposer(i.clientId,pl.id)')));
  }

  console.log('\n════ test-801 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n════ test-801 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗ ════'); process.exit(1); });

