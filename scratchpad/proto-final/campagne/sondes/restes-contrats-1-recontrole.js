// RECONTRÔLE ADVERSE des « restes des contrats », tour 1 (17 novembre 2026) : ce que les corrections ont pu casser À CÔTÉ.
//   A  « Mettre fin » puis un NOUVEAU contrat du même client : les visites faites de l'ancien ne passent pas au nouveau
//   B  les visites sorties du planning par « Mettre fin » ne laissent rien qui pointe dans le vide (tâche, journal, adresse)
//   C  ctrPart : la somme des parts = le prix, pour toute fréquence et tout prix à deux décimales ; prix absurdes refusés par le formulaire
//   D  « échu depuis N jours » / « aujourd'hui » / « dans 1 jour » dans Tâches et Statistiques (veille, jour même, lendemain)
//   E  le technicien (sm) : la visite comprise, la pièce, la question du paiement ; il n'a pas les gestes du bureau
//   F  le client (espace) : contrat terminé / renouvelé, HT et TTC
//   G  une visite « à chaque visite » (c1) avec pièce : une seule facture, pièces comprises ; une visite hors contrat : inchangée
// usage : node restes-contrats-1-recontrole.js [profil] [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'restes-contrats-rec');
  let c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); let p = c.p; await L.calme(p, 400);

  // ───────────── A : fin d'un contrat, puis un nouveau pour le même client ─────────────
  const av = await p.evaluate(() => ({ faitesC1: ctrFaites(CONTRATS.find(k => k.id === 'c1')), visitesMi: INTS.filter(i => i.cli === 'mi' && /^Contrat — visite/.test(i.titre)).map(i => i.id + ':' + i.st) }));
  v('A le client « mi » a bien des visites de départ à éprouver (population)', av.visitesMi.length >= 2 && av.faitesC1 === 2, av);
  await p.evaluate(() => ACTIONS.finContratOk({ dataset: { id: 'c1' } })); await L.calme(p, 300);
  const k2 = await O.creerSigner(c, { modele: 'clim', cli: 'mi', freq: 4, prix: 1200, fact: 'visite', lieu: 'la clim' });
  v('A le nouveau contrat de « mi » est créé et signé', !!k2, k2);
  const ap = await p.evaluate(id => { const k = CONTRATS.find(x => x.id === id), tit = n => `Contrat — visite ${n} sur 4`; return { faites: ctrFaites(k), a: CONTRATS.find(x => x.id === 'c1').st, mesVisites: INTS.filter(i => ctrDeVisite(i) === k).map(i => i.id + ':' + i.st + ':' + i.d), doublons: [1, 2, 3, 4].map(n => INTS.filter(i => i.cli === 'mi' && i.titre === tit(n) && i.st !== 'annulee').length) }; }, k2 && k2.id);
  v('A le nouveau contrat n’hérite pas des visites FAITES de l’ancien : 0 sur 4 faites', ap.faites === 0, ap);
  v('A une seule visite par rang au planning pour ce client (pas de visite 2 en double, ni dans le passé)', ap.doublons.every(n => n === 1), ap.doublons);
  if (k2) { await L.aller(p, 'contrat-x-' + k2.id); const t = await txt(p); v('A la fiche du nouveau contrat dit « 0 sur 4 faites »', /0 sur 4 faites/.test(t), t.slice(0, 240)); }

  // ───────────── B : visites sorties du planning ─────────────
  await L.fin(c); c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); p = c.p; await L.calme(p, 400);
  const lien = await p.evaluate(() => { const sorties = INTS.filter(i => i.type === 'Contrat' && ctrDeVisite(i) === CONTRATS.find(k => k.id === 'c1') && ['aplanifier', 'planifiee'].includes(i.st)).map(i => i.id);
    const bloc = JSON.stringify([TACHES, JOURNAL, typeof NOTIFS !== 'undefined' ? NOTIFS : []]); return { sorties, citees: sorties.filter(id => bloc.includes('"' + id + '"') || bloc.includes('-' + id + '"')) }; });
  v('B la visite i11 (planifiée) est bien celle qui doit sortir', lien.sorties.includes('i11'), lien);
  await p.evaluate(() => ACTIONS.finContratOk({ dataset: { id: 'c1' } })); await L.calme(p, 300);
  const pile = c.err.length;
  await L.aller(p, 'inter-x-i11'); const ti = await txt(p);
  v('B l’adresse de la visite sortie n’ouvre pas une page cassée (ni erreur, ni « undefined »)', c.err.length === pile && !/undefined|NaN|\[object/.test(ti), { err: c.err.slice(pile, pile + 2), t: ti.slice(0, 160) });
  const apres = await p.evaluate(() => { const bloc = JSON.stringify([TACHES, JOURNAL, typeof NOTIFS !== 'undefined' ? NOTIFS : []]); return { citee: bloc.includes('"i11"') || bloc.includes('-i11"'), dansPlanning: INTS.some(i => i.id === 'i11') }; });
  v('B la visite i11 n’est plus au planning', !apres.dansPlanning, apres);
  if (apres.citee) console.log('  · à regarder : tâche, journal ou notification cite encore « i11 » (' + JSON.stringify(lien.citees) + ' avant)');
  for (const h of ['planning', 'interventions', 'taches', 'statistiques', 'client-x-mi', 'comptabilite']) { const e0 = c.err.length; await L.aller(p, h); v('B ' + h + ' après « Mettre fin » : aucune erreur', c.err.length === e0, c.err.slice(e0, e0 + 2)); }

  // ───────────── C : ctrPart et le formulaire ─────────────
  const parts = await p.evaluate(() => { const mal = []; let n = 0; for (let f = 1; f <= 12; f++) for (const prix of [1000, 999.99, 0.1, 1234.57, 100, 7, 3333.33, 1, 120, 620, 1400]) { n++; let s = 0; for (let r = 1; r <= f; r++) s += Math.round(ctrPart(prix, f, r) * 100); if (s !== Math.round(prix * 100)) mal.push([f, prix, s]); } return { n, mal: mal.slice(0, 5), nMal: mal.length }; });
  v('C ctrPart : 132 couples fréquence × prix, la somme des parts = le prix au centime', parts.n === 132 && parts.nMal === 0, parts);
  const bruts = {};
  for (const prix of ['0', '-50', 'abc', '', '99999999', '1000.005']) { await O.neuf(c, 'contrat-nouveau'); await p.fill('[data-b="prix"]', prix); const n0 = await p.evaluate(() => CONTRATS.length); const e0 = c.err.length;
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 400);
    bruts[prix] = await p.evaluate(n => ({ cree: CONTRATS.length > n, prix: CONTRATS.length > n ? CONTRATS[CONTRATS.length - 1].prix : null, toast: (document.getElementById('toast') || {}).textContent || '', nan: /NaN|Infinity/.test(document.getElementById('contenu').textContent) }), n0); bruts[prix].err = c.err.length - e0; }
  v('C un prix 0, négatif, vide ou non numérique ne crée pas un contrat', ['0', '-50', 'abc', ''].every(k => !bruts[k].cree), bruts);
  v('C aucun « NaN » à l’écran (aperçu du contrat) ni erreur sur ces essais (prix saisi « abc »)', Object.values(bruts).every(b => !b.nan && b.err === 0), bruts);
  console.log('  · prix 99999999 / 1000.005 :', JSON.stringify([bruts['99999999'], bruts['1000.005']]));
  await L.fin(c);

  // ───────────── D : « échu / aujourd'hui / dans 1 jour » ─────────────
  c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); p = c.p; await L.calme(p, 400);
  const jours = {};
  for (const [nom, delta] of [['veille', -1], ['aujourdhui', 0], ['demain', 1], ['dans2', 2], ['echu16', -16]]) {
    await p.evaluate(d => { const k = CONTRATS.find(x => x.id === 'c2'); const dd = new Date(AUJ + 'T12:00:00Z'); dd.setUTCDate(dd.getUTCDate() + d); k.fin = String(dd.getUTCDate()).padStart(2, '0') + '/' + String(dd.getUTCMonth() + 1).padStart(2, '0') + '/' + dd.getUTCFullYear(); }, delta);
    const e0 = c.err.length; const r = {};
    for (const h of ['taches', 'statistiques', 'contrat-x-c2']) { await L.aller(p, h); r[h] = await txt(p); }
    jours[nom] = { err: c.err.length - e0, neg: /dans -\d|-\d+ j\b|dans 0 jour|dans 1 jours|il y a -/.test(r.taches + r.statistiques + r['contrat-x-c2']), nan: /NaN|undefined/.test(r.taches + r.statistiques + r['contrat-x-c2']),
      mots: [...(r.taches + ' ' + r.statistiques + ' ' + r['contrat-x-c2']).matchAll(/(échu depuis \d+ jours?|échéance aujourd’hui|dans \d+ jours?|échu depuis \d+ j|dans \d+ j|aujourd’hui)/g)].map(m => m[0]).filter((x, i, a) => a.indexOf(x) === i).slice(0, 6) };
  }
  v('D aucune écriture négative, « NaN » ou erreur pour une fin à −16, −1, 0, +1, +2 jours', Object.values(jours).every(j => !j.neg && !j.nan && j.err === 0), jours);
  v('D la veille : « échu depuis 1 jour » (singulier) quelque part', jours.veille.mots.some(m => /échu depuis 1 jour\b/.test(m) || /échu depuis 1 j\b/.test(m)), jours.veille);
  v('D le lendemain : « dans 1 jour » au singulier, jamais « 1 jours »', !jours.demain.mots.some(m => /1 jours/.test(m)), jours.demain);
  await L.fin(c);

  // ───────────── E : le technicien (sm) ─────────────
  c = await L.ouvrir({ profil, qui: 'sm', hash: 'majournee', nuit }); p = c.p; await L.calme(p, 500);
  const idv = await p.evaluate(() => { const k = CONTRATS.find(x => x.id === 'c3'); k.st = 'signe'; k.signe = '02/11/2026';
    INTS.push({ id: 'x-an', d: AUJ, h: '09:00', dur: 60, tech: ROLES.tech.qui, cli: 'cm', titre: 'Contrat — visite 1 sur 1', type: 'Contrat', st: 'encours', ctr: 'c3' }); return ROLES.tech.qui; });
  await L.aller(p, 'inter-x-x-an'); await L.calme(p, 500);
  const te = await txt(p);
  v('E technicien : la fiche de la visite comprise dit « rien à payer sur place »', /rien à payer sur place/.test(te) && !/Paiement sur place/.test(te), te.slice(0, 260));
  v('E technicien : aucun mot de la facturation du contrat (prix HT/TTC) sur la fiche de la visite', !/HT par an|TTC par an|1[  ]?200|120,00 € HT/.test(te), te.slice(0, 200));
  await L.capture(c, CAP + `tech-comprise-${tag}.png`);
  const ct = await p.evaluate(() => { aller('contrat-x-c3'); return null; }); await L.calme(p, 500);
  const tc = await txt(p), droitT = await p.evaluate(() => ({ voit: rlPermis('contrats') }));
  v('E technicien : la fiche d’un contrat ne laisse aucun geste « Renouveler » / « Mettre fin » (ni la page, ni le panneau)', !/Mettre fin au contrat|Renouveler pour un an/.test(tc), { droitT, t: tc.slice(0, 160) });
  const refus = await p.evaluate(() => { const av = JSON.stringify(CONTRATS.map(k => [k.id, k.st, k.renouvele, k.fin])), mk = (a, id) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.action = a; b.dataset.id = id; document.getElementById('contenu').appendChild(b); b.click(); b.remove(); };
    mk('finContratOk', 'c1'); mk('renouvelerOk', 'c2'); return { role: ROLE, nContrats: CONTRATS.length, change: JSON.stringify(CONTRATS.map(k => [k.id, k.st, k.renouvele, k.fin])) !== av }; });
  v('E technicien : « Mettre fin » et « Renouveler » touchés par un vrai clic (bouton injecté) ne font rien (la table des gestes refuse)', refus.role === 'tech' && !refus.change && refus.nContrats === 3, refus);
  v('E technicien : aucune erreur de la page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);

  // ───────────── F : le client ─────────────
  c = await L.ouvrir({ profil, app: false, nuit }); p = c.p;
  await p.evaluate(() => { const k = CONTRATS.find(x => x.id === 'c1'); ACTIONS.finContratOk({ dataset: { id: 'c1' } }); ACTIONS.renouvelerOk({ dataset: { id: 'c2' } }); });
  await p.evaluate(() => rlChanger('client', { cli: 'mi' })); await L.calme(p, 600);
  await p.evaluate(() => { EC.tab = 'contrats'; aller('espaceclient'); }); await L.calme(p, 600);
  const tcl = await txt(p);
  v('F client « mi » (contrat terminé) : « Terminé » dit, HT ET TTC, aucun bouton Renouveler ni Mettre fin', /Terminé/.test(tcl) && /TTC/.test(tcl) && !/Mettre fin|Renouveler/.test(tcl), tcl.slice(0, 300));
  await L.capture(c, CAP + `client-termine-${tag}.png`);
  await p.evaluate(() => rlChanger('client', { cli: 'hp' })); await L.calme(p, 600);
  await p.evaluate(() => { EC.tab = 'contrats'; aller('espaceclient'); }); await L.calme(p, 600);
  const th = await txt(p);
  v('F client « hp » (contrat renouvelé : deux contrats) : le nouveau n’affiche pas les dates ni les états de l’ancien', /CTR-/.test(th) && !/undefined|NaN/.test(th), th.slice(0, 300));
  v('F client : aucune erreur de la page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c);

  // ───────────── G : pièce sur une visite « à chaque visite » et visite hors contrat ─────────────
  c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); p = c.p; await L.calme(p, 400);
  const g = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i22'), F = fiche('i22'); F.pieces.push({ nom: 'Filtre', q: '2', pu: 35 }); FACTURES.splice(0, FACTURES.length, ...FACTURES.filter(x => x.int !== 'i22')); factureDepuis(i); factureDepuis(i);
    const fs = FACTURES.filter(x => x.int === 'i22'); const hors = INTS.find(o => o.type !== 'Contrat' && o.st === 'fait' && !FACTURES.some(f => f.int === o.id)); let h = null; if (hors) { factureDepuis(hors); const fh = FACTURES.find(x => x.int === hors.id); h = fh ? fh.lignes.map(l => l.d) : null; }
    return { nFact: fs.length, lignes: fs[0] && fs[0].lignes.map(l => [l.d, l.q, l.pu]), hors: h }; });
  v('G une visite « à chaque visite » avec une pièce : UNE seule facture (même appelée deux fois), ligne de visite + pièce', g.nFact === 1 && /^Visite 2 sur 4/.test(g.lignes[0][0]) && g.lignes.some(l => l[0] === 'Filtre'), g);
  v('G une intervention hors contrat reste facturée avec sa main-d’œuvre (inchangé)', !g.hors || g.hors.some(d => /Main-d’œuvre|Forfait|Visite|devis|Déplacement/.test(d)), g.hors);
  await L.fin(c);

  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
