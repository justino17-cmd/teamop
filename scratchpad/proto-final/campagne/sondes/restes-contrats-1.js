// RESTES DES CONTRATS, tour 1 (17 novembre 2026) : tout ce que le recontrôle a trouvé et que le chef de chantier a tranché, joué en VRAI
// (formulaire, vrai bouton « Terminer », vraie page de signature au tracé de souris, panneaux de confirmation), lu SUR L'ÉCRAN.
//   casse 1 : prix d'une visite au centime, le reste d'arrondi sur la dernière (1 000 € ÷ 6) ;  casse 2 : une pièce posée sur une visite comprise
//   se facture SEULE ;  casse 3 : « Terminer » une visite comprise ne dit pas « garantie » ;  casse 4 : pas de « Paiement sur place » avant la fin ;
//   casse 5 : « échu depuis N jours » et jamais un nombre négatif ;  contrats-06/07/11/14/15/16 et (i) HT et TTC (décisions du chef, 17/11).
// usage : node restes-contrats-1.js [profil] [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'restes-contrats');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p; await L.calme(p, 400);
  const part = await p.evaluate(() => Object.entries(CLIENTS).find(([k, x]) => x.type === 'part' && x.mail && k !== '__nv')[0]);
  const pro = await p.evaluate(() => Object.entries(CLIENTS).find(([k, x]) => x.type === 'pro' && x.mail && k !== '__nv' && !CONTRATS.some(o => o.cli === k))[0]);
  const visites = id => p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => i.id), id);
  const creer = async o => { const r = await O.creerSigner(c, o); return r; };

  // ───────────── casse 1 : 1 000 € en 6 visites « à chaque visite » (particulier) ─────────────
  const k1 = await creer({ modele: 'chauffage', cli: part, freq: 6, prix: 1000, fact: 'visite', lieu: 'la chaudière' });
  v('R1 le contrat de 1 000 € en 6 visites est créé et signé', !!k1 && (await visites(k1.id)).length === 6, k1);
  const ids = await visites(k1.id), fs = [];
  for (const id of ids) { const r = await O.terminerVisite(p, id); fs.push(r.facture); }
  const pus = fs.map(f => f && f.lignes[0] && f.lignes[0].pu);
  v('R1 les 6 visites ont chacune leur facture, une seule ligne', fs.every(f => f && f.lignes.length === 1), pus);
  v('R1 chaque prix de visite est un prix en centimes (5 × 166,67 puis 166,65)', pus.every(x => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6) && pus.slice(0, 5).every(x => x === 166.67) && pus[5] === 166.65, pus);
  v('R1 la somme des six factures fait exactement 1 000,00 € HT', Math.round(pus.reduce((a, b) => a + b, 0) * 100) === 100000, pus.reduce((a, b) => a + b, 0));
  await L.aller(p, 'facture-x-f-' + ids[0]);
  const t1 = await txt(p), ch = await p.evaluate(() => [...document.querySelectorAll('#contenu input')].map(i => i.value));
  v('R1 le champ « Prix HT » de la ligne affiche 166,67 (pas 166,66666…)', ch.some(x => /^166,67$/.test(x)) && !ch.some(x => /166[,.]666/.test(x)), ch.slice(0, 8));
  v('R1 la facture dit Total HT 166,67 · TVA 16,67 · TTC 183,34 (le particulier paie 10 %)', /166,67/.test(t1) && /16,67/.test(t1) && /183,34/.test(t1), t1.slice(0, 300));
  await L.aller(p, 'facture-x-f-' + ids[5]); const t6 = await txt(p);
  v('R1 la dernière visite porte le reste : 166,65 € HT', /166,65/.test(t6), t6.slice(0, 200));

  // ───────────── casses 2, 3, 4 : contrat « par an » (professionnel) ─────────────
  const k2 = await creer({ modele: 'clim', cli: pro, freq: 2, prix: 1200, fact: 'an' });
  const v2 = await visites(k2.id);
  await L.aller(p, 'inter-x-' + v2[0]); await p.evaluate(id => { const i = INTS.find(o => o.id === id); i.tech = 'tl'; i.st = 'planifiee'; rendre(); }, v2[0]); await L.calme(p, 300);
  const t4 = await txt(p);
  v('casse 4 : avant la fin, la visite comprise ne propose pas « Paiement sur place » ni « la facture lui sera envoyée »', !/Paiement sur place/.test(t4) && !/la facture lui sera envoyée/.test(t4), (t4.match(/Paiement.{0,80}/) || [''])[0]);
  v('casse 4 : …elle dit qu’elle est comprise dans le contrat', /comprise dans le contrat CTR-/.test(t4), '');
  await p.evaluate(id => { const F = fiche(id); F.pieces = [{ nom: 'Compresseur de remplacement', q: '1', pu: 420 }]; rendre(); }, v2[0]); await L.calme(p, 300);
  const t4b = await txt(p);
  v('casse 4 : une pièce posée ramène la question du paiement (la pièce se facture à part)', /Paiement sur place/.test(t4b), '');
  await p.evaluate(id => { const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Fait.'; rendre(); }, v2[0]); await L.calme(p, 300);
  await L.toucher(c, '[data-action="terminer"]', { delai: 2500 }); await L.calme(p, 500);
  const r2 = await p.evaluate(id => ({ f: FACTURES.filter(f => f.int === id).map(f => ({ n: f.lignes.length, d: f.lignes.map(l => l.d), tva: f.tva, st: f.st })), toast: (document.getElementById('toast') || {}).textContent }), v2[0]);
  v('casse 2 : la pièce de 420 € finit sur UNE facture « à valider », seule (ni main-d’œuvre ni visite)', r2.f.length === 1 && r2.f[0].n === 1 && /Compresseur/.test(r2.f[0].d[0]) && r2.f[0].st === 'avalider', r2);
  v('casse 3 : avec une pièce, le message de fin ne dit jamais « garantie » (le message du stock, posé après, le remplace : seule la facture compte ici)', !/garantie/i.test(r2.toast || ''), r2.toast);
  await L.aller(p, 'inter-x-' + v2[0]); const tf = await txt(p);
  v('casse 2 : la fiche terminée montre la facture des pièces (bouton « Ouvrir la facture »)', !!(await p.$('[data-go^="facture-x-"]')) && !/Sans facture/.test(tf), '');
  // …et sans pièce : message propre, aucune facture
  await p.evaluate(id => { const i = INTS.find(o => o.id === id); i.tech = 'tl'; i.st = 'planifiee'; const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Fait.'; }, v2[1]);
  await L.aller(p, 'inter-x-' + v2[1]); await L.calme(p, 300); await L.toucher(c, '[data-action="terminer"]', { delai: 2500 }); await L.calme(p, 500);
  const r3 = await p.evaluate(id => ({ f: FACTURES.filter(f => f.int === id).length, toast: (document.getElementById('toast') || {}).textContent }), v2[1]);
  v('casse 3 : sans pièce, aucune facture et le message dit « pas de facture à part »', r3.f === 0 && /pas de facture à part/.test(r3.toast || '') && !/garantie/i.test(r3.toast || ''), r3);
  v('« La suite du contrat » PROPOSE le renouvellement une fois les 2 visites faites', await (async () => { await L.aller(p, 'contrat-x-' + k2.id); const t = await txt(p); return /Les 2 visites sont faites/.test(t) && /Renouveler pour un an/.test(t); })(), '');

  // ───────────── casse 5 : un contrat échu ─────────────
  await p.evaluate(() => { const k = CONTRATS.find(o => o.id === 'c2'); k.fin = '15/10/2026'; });
  await L.aller(p, 'taches'); await L.calme(p, 400);
  const tt = await p.evaluate(() => { TACHES; return typeof tSuggestions === 'function' ? JSON.stringify(tSuggestions().filter(s => /contrat/i.test(s.t))) : ''; }).catch(() => '');
  const th = await txt(p, 'body');
  v('casse 5 : Tâches ne dit plus « dans -16 jours » : « échu depuis 16 jours »', !/dans -\d+ jour/.test(th + tt) && /échu depuis 16 jours/.test(th + tt), (th.match(/.{0,50}CTR-2026-007.{0,100}/) || [tt.slice(0, 200)])[0]);
  await L.aller(p, 'statistiques'); await L.calme(p, 500);
  const ts = await txt(p, 'body');
  v('casse 5 : Statistiques dit « échu depuis 16 j » et jamais « dans -16 j »', !/dans -\d+ j/.test(ts), (ts.match(/.{0,50}échu.{0,40}/) || [''])[0]);
  await p.evaluate(() => { CONTRATS.find(o => o.id === 'c2').fin = '31/03/2027'; });

  // ───────────── contrats-07 : fin, renouveler, mettre fin ─────────────
  await L.aller(p, 'contrat-x-c1'); const f1 = await txt(p);
  v('07 la fiche dit « Fin le 31/12/2026 » dans son en-tête', /Fin le 31\/12\/2026/.test(await txt(p, '#contenu .tete')), (await txt(p, '#contenu .tete')).slice(0, 200));
  v('07 elle porte « Renouveler pour un an » et « Mettre fin au contrat »', /Renouveler pour un an/.test(f1) && /Mettre fin au contrat/.test(f1), '');
  const av = await p.evaluate(() => ({ actifs: ctrActifs().length, rec: ctrActifs().reduce((s, k) => s + k.prix, 0), n: CONTRATS.length, j: JOURNAL.length, ints: INTS.length }));
  await L.toucher(c, '[data-action="renouvelerContrat"]'); await L.calme(p, 400);
  const pan = await txt(p, '#calque .panneau');
  v('07 « Renouveler » demande confirmation, en disant ce qui change (nouvelle période, visites à planifier)', /Renouveler CTR-2026-004 pour un an/.test(pan) && /01\/01\/2027 au 31\/12\/2027/.test(pan) && /4 visites/.test(pan), pan.slice(0, 300));
  await L.capture(c, CAP + `renouveler-panneau-${tag}.png`);
  await L.toucher(c, '[data-action="renouvelerOk"]'); await L.calme(p, 600);
  const ap = await p.evaluate(() => { const n = CONTRATS[CONTRATS.length - 1]; return { n: CONTRATS.length, num: n.num, st: n.st, debut: n.debut, fin: n.fin, freq: n.freq, prix: n.prix, cli: n.cli, vis: INTS.filter(i => i.ctr === n.id).map(i => i.st), actifs: ctrActifs().length, rec: ctrActifs().reduce((s, k) => s + k.prix, 0), j: JOURNAL.length, last: JOURNAL[JOURNAL.length - 1] && JOURNAL[JOURNAL.length - 1].action, hash: location.hash, vieux: CONTRATS.find(o => o.id === 'c1').renouvele }; });
  v('07 le renouvellement crée UN contrat de plus : même client, même prix, an suivant', ap.n === av.n + 1 && ap.cli === 'mi' && ap.prix === 1400 && ap.debut === '01/01/2027' && ap.fin === '31/12/2027' && ap.st === 'signe', ap);
  v('07 ses 4 visites sont posées « à planifier »', ap.vis.length === 4 && ap.vis.every(x => x === 'aplanifier'), ap.vis);
  v('07 « contrats signés » et « HT par an » ne comptent pas le contrat deux fois', ap.actifs === av.actifs && ap.rec === av.rec, [av.actifs, ap.actifs, av.rec, ap.rec]);
  v('07 une ligne à l’Historique', ap.j === av.j + 1 && /renouvelé/.test(ap.last || ''), [ap.j, ap.last]);
  const tn = await txt(p);
  v('07 la fiche du nouveau contrat dit « Fin le 31/12/2027 » et propose la suite', /Fin le 31\/12\/2027/.test(tn) && /Renouveler pour un an/.test(tn), tn.slice(0, 160));
  await L.capture(c, CAP + `renouvele-fiche-${tag}.png`);
  await L.aller(p, 'contrat-x-c1'); const to = await txt(p);
  v('07 l’ancien contrat dit « renouvelé jusqu’au 31/12/2027 » et ne propose plus de renouveler', /renouvelé jusqu’au 31\/12\/2027/.test(to) && !/Renouveler pour un an/.test(to), '');
  await p.evaluate(() => { ACTIONS.renouvelerOk({ dataset: { id: 'c1' } }); ACTIONS.renouvelerOk({ dataset: { id: 'c1' } }); });
  v('07 un second « Oui » (double appui, Retour) ne renouvelle pas deux fois', (await p.evaluate(() => CONTRATS.length)) === ap.n, '');
  await L.aller(p, 'contrats'); const tl = await txt(p);
  v('07 la liste montre les deux contrats, le suivant « Renouvelé le 31/10/2026 »', /Renouvelé le 31\/10\/2026/.test(tl), '');

  // mettre fin (c2 : 2 visites, 1 faite, 1 à venir)
  await L.aller(p, 'contrat-x-c2');
  const avf = await p.evaluate(() => ({ actifs: ctrActifs().length, j: JOURNAL.length, vis: INTS.filter(i => i.type === 'Contrat' && ctrDeVisite(i) && ctrDeVisite(i).id === 'c2' && ['aplanifier', 'planifiee'].includes(i.st)).length }));
  await L.toucher(c, '[data-action="finContratDemande"]'); await L.calme(p, 400);
  const pf = await txt(p, '#calque .panneau');
  v('07 « Mettre fin » demande confirmation et DIT ce qui sort du planning', /Mettre fin à CTR-2026-007/.test(pf) && /sort(ent)? du planning|Aucune visite à venir/.test(pf) && /Historique/.test(pf), pf.slice(0, 400));
  await L.capture(c, CAP + `fin-panneau-${tag}.png`);
  await L.toucher(c, '[data-ferme="1"]'); await L.calme(p, 300);
  v('07 « Le garder » ne change rien', (await p.evaluate(() => CONTRATS.find(o => o.id === 'c2').st)) === 'signe', '');
  await L.toucher(c, '[data-action="finContratDemande"]'); await L.calme(p, 300); await L.toucher(c, '[data-action="finContratOk"]'); await L.calme(p, 600);
  const apf = await p.evaluate(() => ({ st: CONTRATS.find(o => o.id === 'c2').st, fin: CONTRATS.find(o => o.id === 'c2').fin, actifs: ctrActifs().length, j: JOURNAL.length, last: JOURNAL[JOURNAL.length - 1] && JOURNAL[JOURNAL.length - 1].action, vis: INTS.filter(i => i.type === 'Contrat' && i.ctr === 'c2').length, toast: (document.getElementById('toast') || {}).textContent }));
  v('07 le contrat est terminé aujourd’hui (31/10/2026), les visites non faites sont sorties, une ligne à l’Historique', apf.st === 'termine' && apf.fin === '31/10/2026' && apf.actifs === avf.actifs - 1 && apf.j === avf.j + 1 && /mis fin/.test(apf.last || ''), apf);
  const tfin = await txt(p);
  v('07 la fiche dit « Terminé le 31/10/2026 » et n’offre plus de suite', /Terminé le 31\/10\/2026/.test(tfin) && !/Renouveler pour un an/.test(tfin) && !/Mettre fin au contrat/.test(tfin), tfin.slice(0, 200));
  await L.capture(c, CAP + `termine-fiche-${tag}.png`);
  await L.aller(p, 'taches'); const ttf = await txt(p, 'body');
  v('07 plus aucune proposition de renouvellement pour un contrat terminé', !/CTR-2026-007/.test((ttf.match(/Proposer le renouvellement[^.]{0,80}/g) || []).join(' ')), '');
  await L.aller(p, 'contrats'); const tl2 = await txt(p);
  v('07 la liste dit « Terminé le 31/10/2026 » pour lui (et pas « Envoyé · en attente »)', /Terminé le 31\/10\/2026/.test(tl2), '');
  await L.aller(p, 'client-x-hp'); await p.evaluate(() => { ongletClient = 'contrats'; rendre(); }); await L.calme(p, 300);
  v('07 la fiche du client le dit « terminé »', /terminé/.test(await txt(p)), '');

  // ───────────── contrats-15 : « chaque mois » agit ─────────────
  const k5 = await creer({ modele: 'clim', cli: pro, freq: 4, prix: 1000, fact: 'mois' });
  const f5 = await p.evaluate(id => { const f = FACTURES.find(x => x.id === 'fc-' + id); return f ? { st: f.st, pu: f.lignes[0].pu, d: f.lignes[0].d, tva: f.tva } : null; }, k5.id);
  v('15 à la signature, la facture du PREMIER MOIS est préparée (1 000 ÷ 12 = 83,33), « à valider »', !!f5 && f5.pu === 83.33 && f5.st === 'avalider', f5);
  await L.aller(p, 'contrat-x-' + k5.id); const t15 = await txt(p);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('.ctr-ech .ligne')].map(l => l.textContent.replace(/\s+/g, ' ').trim()));
  v('15 la carte Facturation liste les DOUZE échéances', lignes.length === 12, lignes.length);
  v('15 la première est « préparée », les onze autres « le 1er de chaque mois »', /préparée/.test(lignes[0] || '') && lignes.slice(1).every(x => /le 1er de chaque mois/.test(x)), lignes.slice(0, 3));
  const somme = await p.evaluate(id => ctrEcheances(CONTRATS.find(k => k.id === id)).reduce((s, e) => s + e.pu, 0), k5.id);
  v('15 les douze échéances font exactement 1 000,00 € (le reste d’arrondi sur la dernière)', Math.round(somme * 100) === 100000, somme);
  await L.capture(c, CAP + `mensuel-fiche-${tag}.png`);
  await L.aller(p, 'factures'); await L.calme(p, 300);
  v('15 la facture du premier mois est dans Factures', /Contrat d’entretien CTR-/.test(await txt(p)), '');

  // ───────────── contrats-16 / 14 / 06 / 11 et (i) ─────────────
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 400);
  const br = await p.evaluate(() => ({ mail: !!document.querySelector('[data-pdfmail]'), grand: !!document.querySelector('[data-pdfplein]'), dl: !!document.querySelector('[data-pdfdl]'), pied: ((document.querySelector('.pdf-pied') || {}).textContent || ''), pdf: (document.querySelector('.pdf') || {}).textContent || '' }));
  v('16 sous un BROUILLON : « Voir en grand » et « Télécharger », pas d’« Envoyer par e-mail »', br.grand && br.dl && !br.mail, br);
  await p.evaluate(() => document.querySelector('[data-pdfplein]').click()); await L.calme(p, 400);
  v('16 …ni dans « Voir en grand »', !(await p.$('#docplein [data-pdfmail]')) && !!(await p.$('#docplein [data-pdfdl]')), '');
  await p.evaluate(() => docPleinFermer()); await L.calme(p, 200);
  v('06 le pied du PDF ne dit plus « Modèle de démonstration » : ce sont les coordonnées de l’entreprise', !/démonstration|à faire relire/i.test(br.pied) && /Clim Services 17/.test(br.pied) && /SIRET/.test(br.pied) && /climservices17\.fr/.test(br.pied), br.pied);
  v('(i) l’article 4 du PDF donne HT ET TTC', /HT par an, soit .* TTC \(TVA \d+ %\)/.test(br.pdf), (br.pdf.match(/4 · Prix.{0,160}/) || [''])[0]);
  const hint = await txt(p, '[data-b="prix"] + .faible, label.champ:has([data-b="prix"])');
  v('(i) le formulaire donne le TTC sous le prix HT', /TTC \(TVA \d+ %\)/.test(hint), hint);
  await L.aller(p, 'contrats'); const tc = await txt(p);
  v('06 sous la liste des modèles : « Ces modèles sont des exemples : fais-les relire par ton conseil avant de t’en servir. »', /Ces modèles sont des exemples : fais-les relire par ton conseil avant de t’en servir\./.test(tc) && !/relus par le juriste/.test(tc), '');
  v('11 sous les deux boutons : la phrase qui les distingue', /Contrat rapide\s*:\s*un modèle de ton métier, prêt à envoyer\./.test(tc) && /Composer un contrat\s*:\s*le tien, article par article\./.test(tc), '');
  v('(i) la liste donne HT et TTC', /TTC/.test(tc), '');
  v('12 plus aucun « Télécharger le PDF signé » ni « Dans la vraie version » sur la liste', !/PDF signé/.test(tc) && !/Dans la vraie version/.test(tc), '');
  await L.aller(p, 'signer-x-c3'); await L.calme(p, 400);
  const sg = await p.evaluate(() => ({ url: !!document.querySelector('.client-web .url'), t: (document.getElementById('contenu').textContent || '').replace(/\s+/g, ' ') }));
  v('14 aucune fausse barre d’adresse sur la page de signature', !sg.url && !/teamop\.fr\/signer/.test(sg.t) && !/🔒/.test(sg.t), sg.t.slice(0, 200));
  v('14 côté bureau, une phrase : « C’est la page que ton client ouvre. »', /C’est la page que ton client ouvre\./.test(sg.t), '');
  v('(i) la page du client donne HT ET TTC', /120,00 € HT, soit 132,00 € TTC par an|HT, soit .* TTC par an/.test(sg.t), (sg.t.match(/visite.{0,80}par an.{0,60}/) || [''])[0]);
  await L.capture(c, CAP + `signature-${tag}.png`);

  // ───────────── contrats-13 : l'ordre sur la fiche, et le PDF replié au téléphone ─────────────
  await L.aller(p, 'contrat-x-c3'); await L.calme(p, 500);
  const ord = await p.evaluate(() => { const col = document.querySelector('.ctr-grille > .col'), doc = document.querySelector('.ctr-doc'), pdf = doc.querySelector('.pdf'), b = doc.querySelector('.ctr-lire'), r = e => e.getBoundingClientRect();
    return { colHaut: Math.round(r(col).top + scrollY), docHaut: Math.round(r(doc).top + scrollY), pdfVisible: !!pdf.offsetParent, btn: !!b.offsetParent, barre: !!(doc.querySelector('.doc-barre') || {}).offsetParent }; });
  const tel = L.PROFILS[profil].w <= 760;
  if (tel) {
    v('13 au téléphone : le chemin, les visites et la facturation passent AVANT le PDF', ord.colHaut < ord.docHaut, ord);
    v('13 au téléphone : le PDF est replié derrière « Lire le contrat »', ord.btn && !ord.pdfVisible && !ord.barre, ord);
    await L.capture(c, CAP + `fiche-plie-${tag}.png`);
    await L.toucher(c, '.ctr-lire'); await L.calme(p, 400);
    const ouv = await p.evaluate(() => { const d = document.querySelector('.ctr-doc'); return { pdf: !!d.querySelector('.pdf').offsetParent, barre: !!(d.querySelector('.doc-barre') || {}).offsetParent, lib: d.querySelector('.ctr-lire').textContent, aria: d.querySelector('.ctr-lire').getAttribute('aria-expanded') }; });
    v('13 d’un toucher, le PDF et sa barre s’ouvrent (et le bouton propose de replier)', ouv.pdf && ouv.barre && /Replier/.test(ouv.lib) && ouv.aria === 'true', ouv);
    await L.capture(c, CAP + `fiche-ouvert-${tag}.png`);
  } else {
    v('13 sur ordinateur : le PDF est à gauche, ouvert, sans bouton « Lire le contrat »', ord.pdfVisible && !ord.btn, ord);
    await L.capture(c, CAP + `fiche-${tag}.png`);
  }
  // un technicien ne voit ni les boutons ni la fiche de contrat (rôle) : les cases de Contrats décident
  const ko = L.bilan(); const err = c.err.filter(e => !/hl-ecran|horsLigne/.test(e));
  if (err.length) console.log('erreurs de page :', err.slice(0, 5));
  await L.fin(c); await L.fermer(); process.exit(ko || err.length ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
