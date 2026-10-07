/* ⛔ CE QUE CE FICHIER GARDE — LES ANNOTATIONS D'UNE SALLE : DESSINER SUR L'ÉCRAN PARTAGÉ, ÉCRIRE, LE TABLEAU BLANC (famille 3 : le VRAI service, parlé en HTTP et en flux).

   Demandé le 7 octobre 2026 : « un système où on peut faire du partage d'écran, dessiner sur l'écran, ajouter du texte… un vrai système de réunion très très pro ». Le service tient ce qui est dessiné
   EN MÉMOIRE (comme le reste de l'éphémère d'une salle : jamais en base, jamais dans un journal) ; ce banc dit ce que la route RÉPOND et ce que les appareils REÇOIVENT :

     · le SUPPORT : un partage d'écran qui commence le devient (pour tous, l'expéditeur compris) ; quand il s'arrête, ce qui était dessiné part, et le support passe à un autre partage en cours ;
       ⛔ un tableau ouvert n'est jamais écrasé par un partage qui commence, ni vidé par un second « ouvrir » ;
     · un trait arrive en MORCEAUX : le premier crée (outil, couleur, épaisseur), les suivants ajoutent, `fin` le termine ; personne n'ajoute au trait d'un autre ;
     · les droits : l'hôte réserve les annotations aux hôtes (`permis`) ; « maître » du support (l'hôte, un co-hôte, celui qui partage, celui qui a ouvert le tableau) efface pour tous et ferme le tableau ;
       chacun retire, annule, efface LES SIENNES ;
     · les bornes : 400 traits ou textes, 4 000 points par trait, 600 par envoi, 200 signes par texte, des coordonnées entières 0..10 000 — chaque refus avec sa réponse ;
     · celui qui arrive après les autres VOIT ce qui est dessiné (`GET /api/salles/:id`) ; celui qui part emporte le support qu'il partageait.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien reçu » est précédé d'un marqueur reçu APRÈS, qui prouve que le flux était vivant. */
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 21, 9, 0, 0);
const dit = (rep) => [rep.code, rep.j && rep.j.error];

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { appels: { balayageMs: 1000, perduMs: 600000 } } });
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const flux = [];
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan');
    for (const p of [ben, cleo, dan]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan);
    const fA = await T.flux(a1), fB = await T.flux(b1), fC = await T.flux(c1), fD = await T.flux(d1); flux.push(fA, fB, fC, fD);
    const marqueVers = async (p, f) => { await a1.post('/api/conversations/' + S.convDirecteObtenir(ana.id, p.id).id + '/messages', { cid: 'cid-m-' + crypto.randomBytes(5).toString('hex'), texte: 'marqueur' }); await f.attendre(e => e.event === 'message' && f.evenements.indexOf(e) >= (f._vu || 0)); };
    const groupe = S.convCreerGroupe({ createur: ana.id, nom: 'Revue', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
    const r0 = await a1.post('/api/appels', { conv: groupe, type: 'video' });
    const id = r0.j.appel.id, U = '/api/salles/' + id;
    await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
    await c1.post('/api/appels/' + id + '/repondre', { accepte: true });
    const annot = (f) => f.evenements.filter(e => e.event === 'salle_evt' && e.data.k === 'annot').map(e => e.data);
    const attendreOp = (f, op, depuis) => f.attendre(e => e.event === 'salle_evt' && e.data.k === 'annot' && e.data.op === op && f.evenements.indexOf(e) >= (depuis || 0));
    const salle = async (c) => (await c.get(U)).j.salle.annot;
    const P = (c, d) => c.post(U + '/annot', d);
    const ID = () => 'tr' + crypto.randomBytes(5).toString('hex');

    console.log('Le support : rien à annoter tant que personne ne partage ; un partage d\'écran le devient, pour tous');
    vrai('population : la salle est ouverte, Ana (hôte), Ben et Cleo y sont ; Dan sonne', r0.code === 201 && (await a1.get(U)).code === 200);
    v('sans support, l\'instantané le dit (personne, « tous », rien de dessiné) et un trait est refusé 409 `rien_a_annoter`', [await salle(a1), dit(await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2, pts: [10, 10] }))],
      [{ support: null, ouvreur: null, permis: 'tous', items: [] }, [409, 'rien_a_annoter']]);
    const nB0 = fB.evenements.length;
    await b1.post(U + '/etat', { partage: true });
    await attendreOp(fA, 'support'); await attendreOp(fC, 'support'); await attendreOp(fB, 'support', nB0);
    v('Ben partage son écran : le support devient « ecran:Ben », dit à Ana, à Cleo ET à Ben (l\'expéditeur aussi : sa page doit savoir qu\'on dessine sur lui)',
      [annot(fA).filter(e => e.op === 'support').map(e => [e.support === 'ecran:' + ben.id, e.ouvreur === ben.id]), annot(fB).filter(e => e.op === 'support').length, (await salle(c1)).support === 'ecran:' + ben.id], [[[true, true]], 1, true]);

    console.log('\nUn trait part en morceaux : le premier crée, les suivants ajoutent, `fin` le termine — les autres le voient se tracer');
    const t1 = ID();
    const m1 = await P(c1, { op: 'trait', id: t1, outil: 'stylo', couleur: 'bleu', ep: 2, pts: [1000, 1000, 1200, 1100] });
    await attendreOp(fA, 'trait'); await attendreOp(fB, 'trait');
    v('Cleo commence un trait : 200, l\'événement lui REVIENT dans la réponse (le service ne le lui pousse pas) ; Ana et Ben le reçoivent', [m1.code, m1.j.ev.op, m1.j.ev.item.id === t1, m1.j.ev.suite, annot(fA).filter(e => e.op === 'trait').map(e => [e.de === cleo.id, e.item.outil, e.item.couleur, e.item.pts.length, e.item.fini])],
      [200, 'trait', true, false, [[true, 'stylo', 'bleu', 4, false]]]);
    const m2 = await P(c1, { op: 'trait', id: t1, pts: [1400, 1300, 1600, 1500] });
    const m3 = await P(c1, { op: 'trait', id: t1, pts: [1800, 1700], fin: true });
    await fA.attendre(e => e.event === 'salle_evt' && e.data.k === 'annot' && e.data.op === 'trait' && e.data.item.fini === true);
    const tenu = (await salle(b1)).items.find(x => x.id === t1);
    v('deux morceaux de plus (le dernier avec `fin`) : Ana reçoit chaque morceau (`suite`), l\'instantané tient le trait ENTIER, terminé', [m2.code, m3.code, annot(fA).filter(e => e.op === 'trait' && e.item.id === t1).map(e => [e.suite, e.item.pts.length]), tenu && tenu.pts.length, tenu && tenu.fini],
      [200, 200, [[false, 4], [true, 4], [true, 2]], 10, true]);
    const t2 = ID();
    await P(c1, { op: 'trait', id: t2, outil: 'stylo', couleur: 'vert', ep: 1, pts: [3000, 3000] });
    const pris = await P(a1, { op: 'trait', id: t2, pts: [9000, 9000] });
    v('⛔ personne n\'ajoute au trait d\'un autre, même EN COURS (Ana, hôte, sur celui que Cleo trace encore) : 400, et le trait de Cleo n\'a pas bougé', [dit(pris), (await salle(a1)).items.find(x => x.id === t2).pts], [[400, 'champ_invalide'], [3000, 3000]]);
    await P(c1, { op: 'trait', id: t2, pts: [3100, 3100], fin: true });
    v('⛔ ni à un trait terminé, le sien compris : 400', [dit(await P(a1, { op: 'trait', id: t1, pts: [5, 5] })), dit(await P(c1, { op: 'trait', id: t1, pts: [5, 5] }))], [[400, 'champ_invalide'], [400, 'champ_invalide']]);
    const nb = (await salle(a1)).items.length;
    v('⛔ un trait mal formé est refusé 400 et n\'est pas écrit : outil, couleur ou épaisseur hors liste, nombre impair de coordonnées, hors de 0..10 000, non entier, plus de 600 points d\'un coup, identifiant malformé, rien',
      [await P(c1, { op: 'trait', id: ID(), outil: 'laser', couleur: 'rouge', ep: 2, pts: [1, 1] }), await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: '#ff0000', ep: 2, pts: [1, 1] }),
       await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 4, pts: [1, 1] }), await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2, pts: [1, 1, 1] }),
       await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2, pts: [1, 10001] }), await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2, pts: [1, 1.5] }),
       await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2, pts: new Array(1202).fill(3) }), await P(c1, { op: 'trait', id: '<x>', outil: 'stylo', couleur: 'rouge', ep: 2, pts: [1, 1] }),
       await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 2 }), await P(c1, { op: 'gribouille' }), await P(c1, {})].map(dit).concat([(await salle(a1)).items.length]),
      new Array(11).fill([400, 'champ_invalide']).concat([nb]));
    const fl = await P(b1, { op: 'trait', id: ID(), outil: 'fleche', couleur: 'jaune', ep: 3, pts: [5000, 5000, 7000, 3000] });
    v('une forme (flèche, rectangle, cercle) part d\'un coup et naît TERMINÉE', [fl.code, fl.j.ev.item.outil, fl.j.ev.item.fini], [200, 'fleche', true]);

    console.log('\nLe texte : une ligne posée à un point, 200 signes au plus');
    const tx = await P(c1, { op: 'texte', id: ID(), pts: [2000, 8000], texte: '  À  revoir   avant vendredi  ', couleur: 'rouge', ep: 2 });
    await fA.attendre(e => e.event === 'salle_evt' && e.data.k === 'annot' && e.data.op === 'trait' && e.data.item.outil === 'texte');
    v('Cleo pose un texte : 200, les espaces sont resserrés, Ana le reçoit', [tx.code, tx.j.ev.item.texte, annot(fA).filter(e => e.op === 'trait' && e.item.outil === 'texte').map(e => e.item.texte)], [200, 'À revoir avant vendredi', ['À revoir avant vendredi']]);
    v('⛔ un texte vide, de 201 signes, à deux points, ou un identifiant déjà pris : 400', [dit(await P(c1, { op: 'texte', id: ID(), pts: [1, 1], texte: '   ', couleur: 'rouge', ep: 1 })), dit(await P(c1, { op: 'texte', id: ID(), pts: [1, 1], texte: 'é'.repeat(201), couleur: 'rouge', ep: 1 })),
      dit(await P(c1, { op: 'texte', id: ID(), pts: [1, 1, 2, 2], texte: 'x', couleur: 'rouge', ep: 1 })), dit(await P(c1, { op: 'texte', id: t1, pts: [1, 1], texte: 'x', couleur: 'rouge', ep: 1 }))], new Array(4).fill([400, 'champ_invalide']));
    vrai('   et 200 signes passent (la borne est comprise)', (await P(c1, { op: 'texte', id: ID(), pts: [1, 1], texte: 'é'.repeat(200), couleur: 'noir', ep: 1 })).code === 200);

    console.log('\nCelui qui arrive après voit ce qui est dessiné ; Dan, qui sonne, ne reçoit rien');
    const vu = await salle(a1);
    v('l\'instantané (`GET /api/salles/:id`) porte le support, le permis et chaque trait avec son auteur', [vu.support === 'ecran:' + ben.id, vu.permis, vu.items.map(x => [x.outil, x.de === cleo.id ? 'Cleo' : x.de === ben.id ? 'Ben' : '?'])],
      [true, 'tous', [['stylo', 'Cleo'], ['stylo', 'Cleo'], ['fleche', 'Ben'], ['texte', 'Cleo'], ['texte', 'Cleo']]]);
    await marqueVers(dan, fD);
    v('⛔ Dan (invité qui sonne) n\'a reçu AUCUN événement d\'annotation (marqueur reçu après : son flux est vivant) ; il ne peut pas dessiner', [annot(fD).length, (await P(d1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 1, pts: [1, 1] })).code !== 200], [0, true]);
    v('⛔ l\'expéditeur ne reçoit pas ses propres traits par le flux (il les a dans la réponse) : Cleo n\'a reçu que ceux de Ben', annot(fC).filter(e => e.op === 'trait').map(e => e.de === ben.id), [true]);

    console.log('\nLes droits : l\'hôte réserve les annotations ; le maître du support efface pour tous ; chacun retire, annule, efface les siennes');
    v('⛔ un participant ne règle pas le permis (403) ; un permis inconnu : 400', [dit(await P(c1, { op: 'permis', qui: 'hotes' })), dit(await P(a1, { op: 'permis', qui: 'personne' }))], [[403, 'interdit'], [400, 'champ_invalide']]);
    const pm = await P(a1, { op: 'permis', qui: 'hotes' });
    await attendreOp(fC, 'permis');
    v('l\'hôte les réserve aux hôtes : 200, Cleo le reçoit ; elle ne dessine plus (403) — Ben, qui PARTAGE, si (le support est le sien)',
      [pm.code, annot(fC).filter(e => e.op === 'permis').map(e => e.permis), dit(await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 1, pts: [1, 1] })), (await P(b1, { op: 'trait', id: ID(), outil: 'rect', couleur: 'vert', ep: 1, pts: [100, 100, 900, 900] })).code, (await salle(c1)).permis],
      [200, ['hotes'], [403, 'interdit'], 200, 'hotes']);
    await P(a1, { op: 'permis', qui: 'tous' });
    const deBen = (await salle(a1)).items.find(x => x.de === ben.id).id, deCleo = (await salle(a1)).items.find(x => x.de === cleo.id && x.outil === 'texte').id;
    const nA = fA.evenements.length;
    v('⛔ Cleo ne retire pas le trait de Ben (403) ; un trait inconnu : 404', [dit(await P(c1, { op: 'retirer', id: deBen })), dit(await P(c1, { op: 'retirer', id: 'inconnu123' }))], [[403, 'interdit'], [404, 'introuvable']]);
    const rt = await P(b1, { op: 'retirer', id: deCleo });
    await attendreOp(fA, 'retirer', nA);
    v('Ben, qui partage, retire un texte de Cleo : 200, Ana reçoit `retirer` avec l\'identifiant, l\'instantané ne l\'a plus', [rt.code, annot(fA).filter(e => e.op === 'retirer').map(e => e.ids), (await salle(a1)).items.some(x => x.id === deCleo)], [200, [[deCleo]], false]);
    const avantAnn = (await salle(a1)).items.filter(x => x.de === cleo.id).map(x => x.id);
    const an1 = await P(c1, { op: 'annuler' });
    v('Cleo annule : SON dernier trait part (et lui seul)', [an1.code, an1.j.ev.ids, (await salle(a1)).items.filter(x => x.de === cleo.id).map(x => x.id)], [200, [avantAnn[avantAnn.length - 1]], avantAnn.slice(0, -1)]);
    v('⛔ Cleo n\'efface pas tout (403) ; un « qui » inconnu : 400', [dit(await P(c1, { op: 'effacer', qui: 'tous' })), dit(await P(c1, { op: 'effacer', qui: 'autres' }))], [[403, 'interdit'], [400, 'champ_invalide']]);
    const ef = await P(c1, { op: 'effacer', qui: 'miens' });
    v('Cleo efface les siennes : celles de Ben restent', [ef.code, (await salle(a1)).items.map(x => x.de === ben.id)], [200, [true, true]]);
    const vide = await P(c1, { op: 'annuler' });
    v('   annuler quand on n\'a plus rien : 200, rien ne part', [vide.code, vide.j.ev.ids], [200, []]);
    await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 1, pts: [1, 1], fin: true });
    const tout = await P(a1, { op: 'effacer', qui: 'tous' });
    v('l\'hôte efface TOUT : 200, plus rien de dessiné', [tout.code, tout.j.ev.ids.length, (await salle(b1)).items.length], [200, 3, 0]);

    console.log('\nLe tableau blanc : il s\'ouvre, il ne s\'écrase pas, il se ferme — et le partage reprend la main');
    v('⛔ Cleo n\'ouvre pas le tableau par-dessus l\'écran que Ben partage (409 `annot_occupe`) ; un « actif » qui n\'est pas un booléen : 400', [dit(await P(c1, { op: 'tableau', actif: true })), dit(await P(c1, { op: 'tableau', actif: 'oui' }))], [[409, 'annot_occupe'], [400, 'champ_invalide']]);
    await P(c1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'rouge', ep: 1, pts: [1, 1], fin: true });
    const nA2 = fA.evenements.length;
    await b1.post(U + '/etat', { partage: false });
    await attendreOp(fA, 'support', nA2);
    v('Ben arrête de partager : le support s\'en va (dit à Ana), ce qui était dessiné dessus aussi', [annot(fA).slice(-1)[0].support, await salle(a1)], [null, { support: null, ouvreur: null, permis: 'tous', items: [] }]);
    const tb = await P(c1, { op: 'tableau', actif: true });
    await fA.attendre(e => e.event === 'salle_evt' && e.data.k === 'annot' && e.data.support === 'tableau');
    v('Cleo ouvre un tableau blanc : 200, le support est « tableau », ouvert par elle — Ana le reçoit', [tb.code, (await salle(a1)).support, (await salle(a1)).ouvreur === cleo.id], [200, 'tableau', true]);
    await P(a1, { op: 'texte', id: ID(), pts: [500, 500], texte: 'Ordre du jour', couleur: 'noir', ep: 3 });
    v('⛔ un second « ouvrir » (Ben) ne VIDE pas le tableau : 200, le texte d\'Ana est toujours là', [(await P(b1, { op: 'tableau', actif: true })).code, (await salle(a1)).items.map(x => x.texte)], [200, ['Ordre du jour']]);
    await b1.post(U + '/etat', { partage: true });
    v('⛔ Ben recommence à partager : le tableau RESTE le support (un partage ne l\'écrase pas)', [(await salle(a1)).support, (await salle(a1)).items.length], ['tableau', 1]);
    v('⛔ Ben (ni hôte ni celui qui l\'a ouvert) ne ferme pas le tableau : 403', dit(await P(b1, { op: 'tableau', actif: false })), [403, 'interdit']);
    const fe = await P(c1, { op: 'tableau', actif: false });
    v('Cleo, qui l\'a ouvert, le ferme : 200, et le support passe à l\'écran que Ben partage toujours (vide)', [fe.code, await salle(a1)], [200, { support: 'ecran:' + ben.id, ouvreur: ben.id, permis: 'tous', items: [] }]);
    await P(a1, { op: 'permis', qui: 'hotes' });
    await b1.post(U + '/etat', { partage: false });
    v('⛔ annotations réservées aux hôtes : Cleo n\'ouvre pas de tableau (403) ; l\'hôte, si', [dit(await P(c1, { op: 'tableau', actif: true })), (await P(a1, { op: 'tableau', actif: true })).code], [[403, 'interdit'], 200]);
    await P(a1, { op: 'permis', qui: 'tous' });

    console.log('\nLes bornes : 4 000 points par trait, 400 traits ou textes');
    const lg = ID(), morceau = () => Array.from({ length: 1200 }, (_, i) => (i * 7) % 10000);
    const rl = [await P(c1, { op: 'trait', id: lg, outil: 'stylo', couleur: 'rouge', ep: 1, pts: morceau() })];
    for (let i = 0; i < 5; i++) rl.push(await P(c1, { op: 'trait', id: lg, pts: morceau() }));
    rl.push(await P(c1, { op: 'trait', id: lg, pts: morceau().slice(0, 800) }));
    const trop = await P(c1, { op: 'trait', id: lg, pts: [1, 1] });
    v('⛔ un trait de 4 000 points passe en sept envois ; le point de plus est refusé 409 `annot_pleine`', [rl.map(x => x.code), (await salle(a1)).items.find(x => x.id === lg).pts.length, dit(trop)], [new Array(7).fill(200), 8000, [409, 'annot_pleine']]);
    await P(a1, { op: 'effacer', qui: 'tous' });
    let ok = 0, dernier = null;
    for (let i = 0; i < 401; i++) { const x = await P(i % 2 ? b1 : c1, { op: 'texte', id: 'n' + String(i).padStart(5, '0') + 'x', pts: [i * 10, i * 10], texte: 'n' + i, couleur: 'bleu', ep: 1 }); if (x.code === 200) ok++; else dernier = dit(x); }
    v('⛔ 400 traits ou textes au plus sur un support : le 401ᵉ est refusé 409 `annot_pleine`', [ok, dernier, (await salle(a1)).items.length], [400, [409, 'annot_pleine'], 400]);

    console.log('\nQui part emporte le support qu\'il partageait ; rien n\'est écrit ailleurs qu\'en mémoire');
    await P(a1, { op: 'tableau', actif: false });
    await c1.post(U + '/etat', { partage: true });
    await P(b1, { op: 'trait', id: ID(), outil: 'stylo', couleur: 'violet', ep: 1, pts: [10, 10], fin: true });
    const nA3 = fA.evenements.length;
    await c1.post('/api/appels/' + id + '/quitter', {});
    await attendreOp(fA, 'support', nA3);
    v('⛔ Cleo, qui partageait, PART : le support s\'en va (dit aux présents) et ce qui était dessiné sur son écran avec', [annot(fA).slice(-1)[0].support, await salle(a1)], [null, { support: null, ouvreur: null, permis: 'tous', items: [] }]);
    const journal = svc.sortie.texte();
    v('⛔ ni un texte posé ni un identifiant de trait n\'apparaît dans le journal du service', ['Ordre du jour', 'revoir avant vendredi', t1, lg].filter(x => journal.includes(x)), []);
    v('⛔ ni dans la base : aucune table ne porte le texte d\'une annotation (l\'éphémère vit en mémoire)', S.sonde().schema > 0 && !Buffer.concat([require('fs').readFileSync(path.join(svc.data, 'msg.db'))].concat(require('fs').existsSync(path.join(svc.data, 'msg.db-wal')) ? [require('fs').readFileSync(path.join(svc.data, 'msg.db-wal'))] : [])).includes(Buffer.from('Ordre du jour')), true);

    console.log('\nLe plafond : 900 gestes d\'annotation par minute et par personne');
    await b1.post(U + '/etat', { partage: true });
    let passes = 0, code = 0;
    for (let i = 0; i < 920 && code !== 429; i++) { const x = await P(a1, { op: 'annuler' }); code = x.code; if (code === 200) passes++; }
    v('⛔ les premiers passent, puis 429 (une boucle ne submerge pas la salle)', [passes > 0 && passes <= 900, code], [true, 429]);
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    try { S.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
