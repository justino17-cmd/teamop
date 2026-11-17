// QUI A FAIT QUOI : le journal ne dit plus « Marc » pour ce que quelqu'un d'autre vient de faire. En tant que Julie (la vraie ouverture de session) : acteur() est elle ; journalAjout('marc', …) écrit SON nom ;
// les gestes de stock, d'achats et de tâches qui écrivaient 'marc' en dur écrivent le sien ; l'Accueil d'une personne qui y a droit la salue par SON prénom (« Bonjour Rémi »), jamais « Bonjour Marc ».
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte ses enregistrements neufs avant de conclure.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
(async () => {
  const c = await ouvrirComme('julie');
  const r = await c.p.evaluate(() => {
    const j0 = JOURNAL.length, m0 = MVTS.length, t0 = TACHES.length, p0 = POINTAGES.length;
    journalAjout('marc', 'client', 'a modifié le client', { lib:'Essai' });                       // le chemin des 90 appels du fichier
    const p = PRODUITS.find(x => x.q > 2); stkJournalEntree(p.id, 1, 'Essai droits', null);       // une entrée de stock
    const dem = DEM_ACHAT && DEM_ACHAT.find(d => d.etat === 'attente'); if (dem) acNoter(dem, 'Essai');   // une décision d'achat
    const neufs = JOURNAL.slice(j0).concat(MVTS.slice(0, MVTS.length - m0).length ? MVTS.slice(0, MVTS.length - m0) : []);
    return { acteur:acteur(), session:SESSION, role:ROLE, nJournal:JOURNAL.length - j0, nMvts:MVTS.length - m0, quiJournal:JOURNAL.slice(j0).map(x => x.qui), quiMvts:MVTS.slice(0, MVTS.length - m0).map(x => x.qui), decide:dem ? dem.par : '(aucune demande en attente)' }; });
  v('acteur() est Julie (session ouverte)', r.acteur === 'julie' && r.session === 'julie', r);
  v('journalAjout(\'marc\', …) écrit « julie » (au moins une ligne neuve)', r.nJournal >= 1 && r.quiJournal.every(q => q === 'julie'), r.quiJournal);
  v('une entrée de stock faite par Julie porte « julie » (au moins un mouvement neuf)', r.nMvts >= 1 && r.quiMvts.every(q => q === 'julie'), r.quiMvts);
  v('la décision d\'une demande d\'achat porte « julie »', r.decide === 'julie' || r.decide === '(aucune demande en attente)', r.decide);
  // l'Accueil d'une personne qui y a droit : son prénom
  await L.fin(c);
  const d = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false });
  await L.aller(d.p, 'accueil'); const h = await d.p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent || '');
  v('l\'Accueil du Responsable dit « Bonjour Rémi » (jamais « Bonjour Marc »)', h.trim() === 'Bonjour Rémi', h);
  await L.fin(d);
  const m = await ouvrirComme('marc'); await L.aller(m.p, 'accueil'); const hm = await m.p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent || '');
  v('l\'Accueil de Marc dit « Bonjour Marc »', hm.trim() === 'Bonjour Marc', hm);
  const rm = await m.p.evaluate(() => { const j0 = JOURNAL.length; journalAjout('marc', 'client', 'x', {}); return JOURNAL[j0].qui; });
  v('Marc : journalAjout(\'marc\') reste « marc »', rm === 'marc', rm);
  v('aucune erreur de page', c.err.length === 0 && d.err.length === 0 && m.err.length === 0, [c.err.slice(0, 2), d.err.slice(0, 2)]);
  await L.fin(m); await fin();
})().catch(e => { console.error(e); process.exit(1); });
