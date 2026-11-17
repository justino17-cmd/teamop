// Matériel, étape 8 — LES CORRECTIONS DE LA RELECTURE « BUREAU » (materiel-relecture-bureau.json, défauts bureau-01 à bureau-19).
// Chaque contrôle JOUE le geste du rapport sur la vraie page et lit ce que l'écran DIT ; chacun cite son numéro (bureau-NN).
// Usage : node materiel-bureau-corrections.js [profil] → « N ✓ · M ✗ ». Marc d'abord, puis Julie (tuile, pastille).
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const clic = async s => { const ok = await L.toucher(c, s); if (!ok) L.v('geste impossible : ' + s, false); return ok; };
  const toast = () => R(() => (document.getElementById('toast') || {}).textContent || '');
  const calme = ms => L.calme(p, ms || 350);
  const gros = profil === 'mac' || profil === 'mac720' || profil === 'windows';

  // ── bureau-01 : la carte, la fiche et la liste de l'atelier comptent la même chose ──
  await L.aller(p, 'boxes');
  const carte = await R(() => { const b = document.querySelector('[data-md="fiche|atelier"]'); return b ? (b.querySelector('.client-chiffres span:last-child b') || {}).textContent : null; });
  const pas = await R(() => { const b = document.querySelector('[data-md="fiche|atelier"] .st'); return b ? b.textContent : ''; });
  await clic('[data-md="fiche|atelier"]'); await calme(500);
  const fiche = await R(() => ({ kpi: (document.querySelector('#calque .md-kpis .kpi:nth-child(3) b') || {}).textContent, titre: (document.querySelector('#calque .md-o') || {}).textContent || '', lignes: document.querySelectorAll('#calque .md-o ~ .md-lg, #calque .md-liste .md-o').length }));
  const nListe = +((fiche.titre.match(/·\s*(\d+)/) || [])[1] || 0);
  v('bureau-01 : population — l\'atelier a des articles à surveiller (' + nListe + ')', nListe > 0);
  v('bureau-01 : la carte (« ' + carte + ' », « ' + pas + ' »), la fiche (« ' + fiche.kpi + ' ») et la liste (« ' + fiche.titre + ' ») disent le même nombre', +carte === nListe && +fiche.kpi === nListe && pas.startsWith(String(nListe)), { carte, pas, fiche });
  const condensateur = await R(() => { const x = PRODUITS.find(o => /Condensateur/.test(o.nom)); return x ? { atelier: stkAt(x, 'atelier'), etat: (matEtat(x) || {}).k } : null; });
  v('bureau-01 : le Condensateur (« Nulle part pour l\'instant ») n\'est pas compté à l\'atelier', !condensateur || condensateur.atelier > 0 || nListe === (await R(() => lieuArticles('atelier').filter(x => ['plus', 'bientot'].includes((matEtat(x) || {}).k)).length)), condensateur);
  await L.ranger(p);

  // ── bureau-02 : une commande en retard ne « arrive » pas à une date passée ──
  const e2 = await R(() => { const tard = COMMANDES.filter(cmdOuverte).filter(o => (o.st === 'partielle' ? o.reliquat : o.prevue) < AUJ); const x = PRODUITS.find(o => enCommande(o) > 0 && tard.some(k => k.lignes.some(l => l.pid === o.id && l.recu < l.q))); return { n: tard.length, mot: x ? matEtat(x).mot : null, cls: x ? matEtat(x).cls : null, aVenir: PRODUITS.filter(o => enCommande(o) > 0).map(o => matEtat(o).mot) }; });
  v('bureau-02 : population — une commande est en retard (' + e2.n + ')', e2.n > 0 && !!e2.mot);
  v('bureau-02 : Stock dit « ' + e2.mot + ' » (jamais « arrive le » une date passée)', e2.mot === 'Commandé · en retard' && e2.cls === 'st-o', e2);
  v('bureau-02 : une date à venir dit toujours « arrive le j/m »', await R(() => { const o = COMMANDES.find(cmdOuverte); const x = PRODUITS.find(q => q.id === 'p21') || PRODUITS[0]; const sv = COMMANDES.map(k => k.prevue); COMMANDES.forEach(k => { if (cmdOuverte(k)) k.prevue = jour(3); }); const r = PRODUITS.filter(q => enCommande(q) > 0).map(q => matEtat(q).mot); COMMANDES.forEach((k, i) => { k.prevue = sv[i]; }); return r.length > 0 && r.every(m => /^Commandé · arrive le \d+\/\d+$/.test(m) || m === 'Commandé · en retard' || m === 'Commandé · en route'); }));

  // ── bureau-03 : « le camion de Léa » garde sa majuscule dans le toast du comptage ──
  await L.aller(p, 'stock');
  await R(() => matCompter('v3')); await calme(400); await clic('#calque [data-ms="ctout"]'); await clic('#calque [data-ms="cok"]'); await calme(400);
  const t3 = await toast();
  v('bureau-03 : « Tout est juste dans le camion de Léa » (' + t3.slice(0, 60) + ')', /camion de Léa/.test(t3) && !/camion de léa/.test(t3), t3);

  // ── bureau-06 : l'écart se calcule PENDANT la frappe ──
  await R(() => matCompter('atelier')); await calme(400);
  const dg = await R(() => { const i = [...document.querySelectorAll('#calque [data-mscq]')].find(e => /Dégrippant/.test(e.closest('.mat-l').textContent)); return i ? { pid: i.dataset.mscq, prevu: stkAt(PRODUITS.find(x => x.id === i.dataset.mscq), 'atelier') } : null; });
  v('bureau-06 : population — la ligne Dégrippant est dans le comptage', !!dg, dg);
  if (dg) {
    const champ = p.locator('#calque [data-mscq="' + dg.pid + '"]'); await champ.click(); await champ.fill(''); await champ.type('6', { delay: 60 }); await calme(200);
    const pend = await R(() => ({ ligne: document.querySelector('#calque [data-mscq]').closest('.mat-l') && [...document.querySelectorAll('#calque .mat-l')].find(l => /Dégrippant/.test(l.textContent)).querySelector('.fo-n .petit').textContent, pied: document.querySelector('#calque .ms-csom').textContent, focus: document.activeElement && document.activeElement.dataset.mscq }));
    v('bureau-06 : pendant la frappe (sans quitter le champ) la ligne dit « de moins que prévu » et le pied « 1 écart »', /de moins que prévu/.test(pend.ligne) && /1 écart/.test(pend.pied) && pend.focus === dg.pid, pend);
    await champ.fill('8'); await calme(150);
    v('bureau-06 : revenir à la valeur prévue efface l\'écart (« Aucun écart »)', /Aucun écart/.test(await R(() => document.querySelector('#calque .ms-csom').textContent)));
  }
  await L.ranger(p);

  // ── bureau-04 / bureau-05 : une demande, une quantité ; le transfert se défait ; le camion au garage se dit ──
  const q4 = await R(() => { const d = DEM_ACHAT.find(o => o.id === 'da1'), s = acSource(d); const lig = cmdPaniers().flatMap(pp => pp.lignes).find(l => l.demande && l.demande.id === 'da1'); return { d: d.q, at: s.at, reste: s.reste, lig: lig ? lig.q : null, camion: s.camion && s.camion.id, garage: !!(s.camion && bxGarage(s.camion.id)) }; });
  v('bureau-04 : population — la demande de Tom (' + q4.d + ' kg), l\'atelier en a ' + q4.at, q4.d > q4.at && q4.at > 0, q4);
  v('bureau-04 : Commandes propose ' + q4.lig + ' (= ' + q4.reste + ' que l\'atelier n\'a pas), comme Achats et frais', q4.lig === q4.reste, q4);
  await L.aller(p, 'achats'); await calme(300);
  const av = await R(() => ({ at: stkAt(PRODUITS.find(x => x.id === 'p4'), 'v4'), mv: MVTS.length, cmd: COMMANDES.length, etat: DEM_ACHAT.find(o => o.id === 'da1').etat, cn: cmdNum }));
  await R(() => { const b = document.querySelector('[data-ac="transfert|da1"]'); if (b) b.scrollIntoView({ block: 'center' }); });
  const garage = q4.garage;
  await clic('[data-ac="transfert|da1"]'); await calme(400);
  if (garage) {
    const dem = await R(() => (document.querySelector('#calque .panneau') || {}).textContent || '');
    v('bureau-05 : le camion de Tom est au garage : l\'écran le dit (« Tu les mets quand même ? ») avant de transférer', /au garage/.test(dem) && /quand même/.test(dem), dem.slice(0, 120));
    const sans = await R(() => stkAt(PRODUITS.find(x => x.id === 'p4'), 'v4'));
    v('bureau-05 : rien n\'a bougé tant qu\'on n\'a pas confirmé', sans === av.at, { sans, av });
    await clic('#calque [data-ac="transfertok|da1"]'); await calme(500);
  } else v('bureau-05 : le camion de Tom est au garage (population)', false, 'le camion de Tom n\'est pas au garage dans les données');
  const ap = await R(() => ({ at: stkAt(PRODUITS.find(x => x.id === 'p4'), 'v4'), mv: MVTS.length, cmd: COMMANDES.length, etat: DEM_ACHAT.find(o => o.id === 'da1').etat }));
  const tt = await toast();
  v('bureau-05 : le transfert a eu lieu (' + av.at + ' → ' + ap.at + '), un brouillon de commande est né, la demande est approuvée', ap.at > av.at && ap.cmd === av.cmd + 1 && ap.etat === 'approuvee', { av, ap });
  v('bureau-05 : le toast porte « Annuler » (' + tt.slice(-40) + ')', /Annuler/.test(tt) && !!(await R(() => document.querySelector('#toast button'))), tt);
  await R(() => [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click()); await calme(500);
  const ann = await R(() => ({ at: stkAt(PRODUITS.find(x => x.id === 'p4'), 'v4'), mv: MVTS.length, cmd: COMMANDES.length, etat: DEM_ACHAT.find(o => o.id === 'da1').etat, cn: cmdNum }));
  v('bureau-05 : Annuler remet tout comme avant (stock, journal, commande, demande en attente, numéro de brouillon)', JSON.stringify(ann) === JSON.stringify({ at: av.at, mv: av.mv, cmd: av.cmd, etat: 'attente', cn: av.cn }), { av, ann });
  await L.ranger(p);

  // ── bureau-07 : le bandeau « Avant les visites » ne lie pas des personnes à une visite qui n'est pas la leur ──
  await L.aller(p, 'boxes');
  const bd = await R(() => { const e = document.querySelector('.ms-bandeau .gris.petit'); return { t: e ? e.textContent.trim() : '', G: bxBesoins().map(g => [prenomDe(g.l.tech), g.L.map(o => o.int.titre)]) }; });
  const nv = await R(() => new Set(bxBesoins().flatMap(g => g.L.map(o => o.int.id))).size);
  v('bureau-07 : population — le bandeau nomme ' + bd.G.length + ' camions et ' + nv + ' visites', bd.G.length > 1 && nv > 1, bd);
  v('bureau-07 : la sous-ligne compte les visites (« ' + bd.t + ' »), sans titre d\'une seule', /\d+ visites? d’ici/.test(bd.t) && !/Mise en service|Dépannage|Entretien/.test(bd.t), bd);

  // ── bureau-08 : l'export a SON icône (pas l'appareil photo) ──
  await L.aller(p, 'stock'); await clic('[data-ms="plus"]'); await calme(300);
  const ic8 = await R(() => { const b = [...document.querySelectorAll('.ctx button, .menu button, [role="menu"] button')].find(e => /Exporter l’historique/.test(e.textContent)); const ph = [...document.querySelectorAll('.ctx button, [role="menu"] button')].find(e => /Photographier/.test(e.textContent)); return { ex: b ? b.querySelector('svg') && b.querySelector('svg').innerHTML : null, ph: ph ? ph.querySelector('svg') && ph.querySelector('svg').innerHTML : null, photo: IC.photo }; });
  v('bureau-08 : « Exporter l\'historique » n\'a plus l\'icône de l\'appareil photo', !!ic8.ex && ic8.ex !== ic8.photo.replace(/\s/g, '') && !ic8.ex.includes('M4 8h3l1.5-2.5'), ic8.ex);
  // bureau-18 (même menu) : le registre des fluides — le client s'ouvre
  await R(() => [...document.querySelectorAll('.ctx button, [role="menu"] button')].find(e => /Registre des fluides/.test(e.textContent)).click()); await calme(450);
  const rg = await R(() => { const l = [...document.querySelectorAll('#calque .ms-regl .mv-l, #calque .ms-regl > *')]; return { n: document.querySelectorAll('#calque .ms-regl .mv-l').length, liens: document.querySelectorAll('#calque .ms-regl .mv-l .ms-lien[data-tvoir^="inter|"]').length, txt: (document.querySelector('#calque .ms-regl') || {}).textContent }; });
  v('bureau-18 : population — le registre a ' + rg.n + ' lignes', rg.n >= 2, rg);
  v('bureau-18 : chaque ligne du registre a son client en lien vers l\'intervention (' + rg.liens + '/' + rg.n + ')', rg.liens === rg.n, rg);
  const avant = await R(() => location.hash + '|' + (document.querySelector('#calque .panneau h2') || {}).textContent);
  await clic('#calque .ms-regl .mv-l .ms-lien'); await calme(600);
  const apres = await R(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1, #contenu h2') || {}).textContent || '', panneau: !!document.querySelector('#calque .panneau') }));
  v('bureau-18 : toucher le client ouvre la fiche de SON intervention (« ' + apres.h1 + ' », ' + apres.hash + ')', /^#inter-x-/.test(apres.hash) && apres.h1.length > 0 && !apres.panneau, { avant, apres });
  await L.ranger(p);

  // ── bureau-09 : la fréquence de comptage se règle lieu par lieu, dans « Modifier ce lieu » ──
  await L.aller(p, 'boxes'); await R(() => bxModifier('v1')); await calme(400);
  const f9 = await R(() => ({ champ: !!document.querySelector('#calque [data-bxl-mod="freq"]'), place: (document.querySelector('#calque [data-bxl-mod="freq"]') || {}).placeholder }));
  v('bureau-09 : « Modifier ce lieu » d\'un camion porte « Compter tous les … mois » (placeholder ' + f9.place + ')', f9.champ, f9);
  if (f9.champ) {
    await p.locator('#calque [data-bxl-mod="freq"]').fill('2'); await clic('#calque [data-bxl="modok"]'); await calme(400);
    const j9 = await R(() => ({ f: sxFreq('v1'), autre: sxFreq('v2') }));
    v('bureau-09 : le camion de Sophie se compte tous les 2 mois (' + j9.f + ' j), les autres gardent la durée du Stock (' + j9.autre + ' j)', j9.f === 60 && j9.autre !== 60, j9);
    await R(() => [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent)).click()); await calme(400);
    v('bureau-09 : Annuler rend sa durée d\'avant', (await R(() => sxFreq('v1'))) !== 60);
    await R(() => bxModifier('v1')); await calme(300); await p.locator('#calque [data-bxl-mod="freq"]').fill('2'); await clic('#calque [data-bxl="modok"]'); await calme(300);
    await R(() => bxModifier('v1')); await calme(300); await p.locator('#calque [data-bxl-mod="freq"]').fill(''); await clic('#calque [data-bxl="modok"]'); await calme(300);
    v('bureau-09 : vider le champ rend la durée du Stock', (await R(() => SX.freq.v1)) === undefined);
  }
  await L.ranger(p);

  // ── bureau-10 : une bouteille presque vide se voit côté bureau ──
  const b10 = await R(() => { const b = SX.bout.find(o => o.id === 'R32-2231'); b.reste = 0.6; rendre(); return { b: b.id, etat: sxBoutEtat(b)[0] }; });
  await L.aller(p, 'boxes'); await calme(300);
  const c10 = await R(() => { const k = document.querySelector('[data-md="fiche|v1"]'); return k ? k.textContent : ''; });
  v('bureau-10 : la carte du camion de Sophie dit « Bouteille presque vide » (' + c10.slice(0, 80).replace(/\s+/g, ' ') + ')', /Bouteille presque vide/.test(c10), c10);
  await clic('[data-md="fiche|v1"]'); await calme(450);
  const f10 = await R(() => (document.querySelector('#calque .fo-alerte') || {}).textContent || '');
  v('bureau-10 : la fiche du camion dit « Bouteille presque vide : R32-2231 (0,6 kg) »', /Bouteille presque vide/.test(f10) && /R32-2231\s*\(0,6 kg\)/.test(f10), f10);
  await L.ranger(p); await L.aller(p, 'accueil'); await calme(500);
  const a10 = await R(() => { const e = document.querySelector('[data-vis="accueil-materiel"]'); return e ? e.textContent : ''; });
  v('bureau-10 : la carte « Matériel » de l\'Accueil porte une ligne « Bouteille presque vide » (' + a10.replace(/\s+/g, ' ').slice(0, 120) + ')', /Bouteille presque vide\s*:\s*R32-2231/.test(a10), a10);
  v('bureau-10 : la fiche de l\'article dit « Presque vide » et non « Entamée »', b10.etat === 'Presque vide', b10);
  await R(() => { SX.bout.find(o => o.id === 'R32-2231').reste = 2.5; rendre(); });

  // ── bureau-15 : un fournisseur « au comptoir » n'a ni franco, ni port, ni délai ──
  await L.aller(p, 'produits'); await R(() => { prVue = 'fournisseurs'; rendre(); }); await calme(400);
  await R(() => fournFiche(MES_FOURN.find(f => f.dj === 0 && /Frigo/.test(f.nom)).id)); await calme(450);
  const f15 = await R(() => { const t = (document.querySelector('#calque .panneau, #calque') || {}).textContent || ''; return { franco: /Livraison gratuite à partir de/.test(t), port: /frais de port/.test(t), heure: /livre à l’heure/.test(t), comptoir: !!document.querySelector('#calque [data-fx^="comptoir|"]:checked') }; });
  v('bureau-15 : population — Frigo Distribution 17 est coché « au comptoir »', f15.comptoir, f15);
  v('bureau-15 : ni « Livraison gratuite à partir de », ni « frais de port », ni phrase de délai', !f15.franco && !f15.port && !f15.heure, f15);
  await L.ranger(p);

  // ── bureau-16 : en-tête de Fournisseurs sur UNE rangée de boutons (tablette) ──
  await L.aller(p, 'produits'); await calme(300);
  const h16 = await R(() => { const a = [...document.querySelectorAll('.fx-tete .actions > *')].map(e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }); return a; });
  v('bureau-16 : les boutons de l\'en-tête tiennent sur une seule rangée (' + h16.map(x => x.t).join('/') + ')', h16.length >= 3 && Math.max(...h16.map(x => x.t)) - Math.min(...h16.map(x => x.t)) <= 4, h16);   // un bouton carré de 48 px et un de 46 px centrés sur la même ligne diffèrent d'un pixel de haut

  // ── bureau-17 : le pied de liste dit ce que la liste montre ──
  await L.aller(p, 'stock'); await calme(300);
  await p.fill('#ms-q', 'condens'); await calme(400);
  const p17 = await R(() => (document.querySelector('.ms-pied') || {}).textContent || '');
  v('bureau-17 : la recherche « condens » donne « 1 article » sans le montant des 29 (« ' + p17 + ' »)', /^1 article\s*$/.test(p17.trim()), p17);
  await p.fill('#ms-q', ''); await calme(300);
  v('bureau-17 : sans recherche, le montant de tout le stock revient', /de matériel \(prix d’achat HT\)/.test(await R(() => (document.querySelector('.ms-pied') || {}).textContent || '')));

  // ── bureau-13 (écran bas, avec le bandeau « envois à accepter ») et bureau-14 (le menu montre tout le groupe Matériel) ──
  await L.aller(p, 'stock'); await calme(300);
  const m13 = await R(() => { const l = [...document.querySelectorAll('.ms-liste .ms-l')]; return { env: matEnvoisAAccepter().n, h: innerHeight, premiere: l[0] ? Math.round(l[0].getBoundingClientRect().top) : null, visibles: l.filter(e => e.getBoundingClientRect().bottom <= innerHeight).length }; });
  if (profil === 'windows' || profil === 'mac720') {
    v('bureau-13 : population — le bandeau « envois à accepter » est affiché (' + m13.env + ') sur un écran de ' + m13.h + ' px', m13.env > 0 && m13.premiere != null, m13);
    v('bureau-13 : la première ligne d\'article commence avant 0,6 écran (' + m13.premiere + ' px sur ' + m13.h + ') et au moins 4 lignes se voient sans défiler (' + m13.visibles + ')', m13.premiere <= 0.6 * m13.h && m13.visibles >= 4, m13);
  }
  if (profil === 'ipad') {
    const m14 = await R(() => { const l = document.querySelector('#menu .m-liste'), r = l.getBoundingClientRect(), pour = t => { const a = [...l.querySelectorAll('a')].find(e => e.textContent.trim().startsWith(t)); if (!a) return null; const b = a.getBoundingClientRect(); return b.top >= r.top - 1 && b.bottom <= r.bottom + 1; }; return { stock: pour('Stock'), depots: pour('Dépôts et camions'), four: pour('Fournisseurs'), liste: [Math.round(r.top), Math.round(r.bottom)], on: (l.querySelector('a.on') || {}).textContent }; });
    v('bureau-14 : sur iPad, le menu montre « Stock », « Dépôts et camions » et « Fournisseurs » en entier (rubrique courante : ' + (m14.on || '').trim().slice(0, 12) + ')', m14.stock === true && m14.depots === true && m14.four === true, m14);
  }

  // ── bureau-19 : « Ajouter un article » : pas de blanc entre le nom et la ligne « Rangé dans » ──
  await L.aller(p, 'produits'); await R(() => { prVue = 'articles'; rendre(); }); await calme(300);
  await clic('[data-pr^="nouveau|"]'); await calme(500);
  const g19 = await R(() => { const n = document.getElementById('pr-nom'), r = document.getElementById('ms-range'), s = document.getElementById('pr-sugg'); const lab = n && n.closest('label').getBoundingClientRect(); return { nomBas: lab && Math.round(lab.bottom), rangeHaut: r && Math.round(r.getBoundingClientRect().top), sugg: s ? Math.round(s.getBoundingClientRect().height) : null }; });
  v('bureau-19 : la suggestion vide ne garde pas sa place (hauteur ' + g19.sugg + ' px) et l\'écart entre le champ Nom et « Rangé dans » est d\'au plus 32 px (' + (g19.rangeHaut - g19.nomBas) + ' px)', g19.rangeHaut != null && g19.rangeHaut - g19.nomBas <= 32 && !g19.sugg, g19);
  await p.fill('#pr-nom', 'filtre à air'); await calme(300);
  const g19b = await R(() => ({ s: (document.getElementById('pr-sugg') || {}).textContent || '', h: Math.round((document.getElementById('pr-sugg') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }));
  v('bureau-19 : la suggestion apparaît toujours quand on tape (« ' + g19b.s.slice(0, 40) + ' »)', g19b.s.length > 3 && g19b.h > 0, g19b);
  await L.ranger(p);

  // ── les deux défauts de Julie (tuile et pastille sans le droit) ──
  await L.fin(c);
  const cj = await L.ouvrir({ profil, qui: 'julie' }), pj = cj.p, Rj = (f, a) => pj.evaluate(f, a);
  await L.aller(pj, 'stock'); await L.calme(pj, 400);
  const t11 = await Rj(() => ({ cam: (document.querySelector('.ms-kpis') || { children: [] }).children.length, botCam: !!document.querySelector('.ms-kpis button[data-ms="t|cam"]'), permis: rlPermis('boxes'), txt: [...document.querySelectorAll('.ms-kpis .kpi')].map(e => e.tagName + ':' + e.textContent.replace(/\s+/g, ' ').trim()) }));
  v('bureau-11 : Julie n\'a pas « Dépôts et camions » (population : ' + t11.permis + ') : la tuile « manquent dans les camions » n\'est pas un bouton', t11.permis === false && !t11.botCam && t11.cam === 3, t11);
  const ordre = await Rj(() => { const b = document.querySelector('.ms-kpis button[data-ms="t|cmd"]'); return !!b || !rlPermis('produits'); });
  v('bureau-11 : une tuile qui mène à une rubrique permise reste un bouton (ou n\'en est pas un quand elle est fermée)', ordre);
  // pastille « À accepter » : jouée avec un envoi en attente
  await Rj(() => { SX.mvQui = 'tous'; stkOnglet = 'mvts'; rendre(); }); await L.calme(pj, 500);
  const j12 = await Rj(() => ({ att: MVTS_ATT.length, boutons: document.querySelectorAll('.ms-att').length, bAccepter: document.querySelectorAll('button.ms-att').length, spans: [...document.querySelectorAll('span.ms-att')].map(e => e.textContent), droit: msAccepte() }));
  v('bureau-12 : population — Julie voit ' + j12.boutons + ' pastilles sur ' + j12.att + ' envois en attente', j12.att > 0 && j12.boutons > 0, j12);
  v('bureau-12 : sans le droit d\'accepter, la pastille est une étiquette « En attente du gérant », jamais un bouton', j12.droit === false && j12.bAccepter === 0 && j12.spans.every(t => /En attente du gérant/.test(t)), j12);
  await L.fin(cj);
  v('aucune erreur de page', c.err.length === 0 && cj.err.length === 0, c.err.concat(cj.err).slice(0, 3));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
