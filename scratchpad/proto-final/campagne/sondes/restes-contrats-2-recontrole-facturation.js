// RECONTRÔLE tour 2 : la carte « Facturation » de la fiche d'un contrat avec les valeurs LONGUES (prix à sept chiffres, 12 visites), pour chaque mode de
// facturation, sur les profils étroits : le libellé de gauche et le montant de droite ne s'écrasent pas (texte ≥ 12 signes par ligne sur ≤ 3 lignes).
// usage : node restes-contrats-2-recontrole-facturation.js <profil> [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-rec2/';
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  for (const [fact, prix] of [['visite', 12345.67], ['mois', 12345.67], ['an', 123456.78], ['visite', 123456.78]]) {
    const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 12, prix, fact, lieu: 'les locaux techniques du sous-sol' });
    v('contrat ' + fact + ' à ' + prix + ' créé et signé', !!k, k); if (!k) continue;
    await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 450);
    await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); h && h.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400);
    const m = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); if (!h) return null; return [...h.parentElement.querySelectorAll('.ligne')].map(l => [...l.children].map(e => { const r = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return { t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), w: Math.round(r.width), lignes: Math.round(r.height / lh) }; })); });
    v('population : la carte Facturation a des lignes (' + fact + ')', !!m && m.length >= 2, m);
    if (m) { const mal = m.flat().filter(x => x.w < 100 && x.lignes >= 3); v('aucun libellé de la carte Facturation écrasé (' + fact + ' ' + prix + ')', mal.length === 0, mal); }
    const d = await L.deborde(c); v('rien ne déborde du profil (' + c.largeur + ' px) (' + fact + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    await L.capture(c, CAP + 'facturation-' + fact + '-' + prix + '-' + tag + '.png');
  }
  v('aucune erreur de la page', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
