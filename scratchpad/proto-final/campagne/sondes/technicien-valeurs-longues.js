// Valeurs LONGUES sur les écrans du technicien (campagne du 17 novembre 2026) : nom de client de 70 signes, adresse longue, titre d'intervention long,
// motif long, note de frais à l'objet très long et au montant de 12 345,67 €, tâche de 140 signes, pièce de 100 signes. Contre la largeur POSÉE du profil.
// Usage : node technicien-valeurs-longues.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p;
  const LONG = 'Établissements Hospitaliers Réunis de la Côte Atlantique et de l’Île de Ré SARL';
  const mise = await p.evaluate(LONG => {
    const mes = rlMesInts(); mes.forEach(i => { const cl = CLIENTS[i.cli]; cl.nom = LONG; cl.adr = '12 bis quai Valin, bâtiment B, escalier 3, 2e étage porte gauche, 17000 La Rochelle'; i.titre = 'Dépannage de la climatisation de la salle de réunion principale et de la cuisine centrale'; i.motif = 'La clim de la salle fait un bruit de ferraille et ne refroidit plus depuis ce matin, le directeur est très mécontent et veut une réponse avant midi.'; });
    NDF.unshift({ id: 'nlong', qui: 'sm', d: AUJ, objet: 'Carburant · plein exceptionnel à la station Total de la zone industrielle de Périgny avant la tournée de la semaine', ttc: 12345.67, tva: 20, recu: false, etat: 'attente', rl: true });
    TACHES.unshift({ id: 'tlong', t: 'Rappeler le fournisseur pour le condensateur permanent 5 µF 450 V et vérifier la référence exacte avant de passer commande chez Climatech', qui: 'sm', d: AUJ, h: '09:00', urgent: true });
    return mes.length; }, LONG);
  v('population : des interventions ont reçu des valeurs longues', mise >= 2, mise);
  for (const r of ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences', 'inter-x-i2']) {
    await L.aller(p, r); await L.calme(p, 500);
    const d = await L.deborde(c), f = await L.doigts(c.p);
    v(`${r} : aucun glissement latéral avec des valeurs longues`, d.bouge === 0 && d.premiere <= c.largeur, d);
    v(`${r} : aucun texte écrasé`, f.ecrases.length === 0, f.ecrases.slice(0, 4));
    if (c.doigt) v(`${r} : champs ≥ 16 px`, f.champs.length === 0, f.champs.slice(0, 4));
    await L.capture(c, CAP + `longues-${profil}-${J}-${r}.png`, true);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
