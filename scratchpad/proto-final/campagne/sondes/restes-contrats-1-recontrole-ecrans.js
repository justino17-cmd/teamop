// RECONTRÔLE des restes des contrats, tour 1 : les écrans NEUFS (fin / renouvellement / terminé / visite comprise / fiche pliée) sur les profils
// étroits et larges, jour et nuit : débordement contre la largeur du profil, cibles au doigt, textes écrasés, captures à REGARDER.
// usage : node restes-contrats-1-recontrole-ecrans.js <profil> [nuit]   → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'restes-contrats-rec');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  // un contrat « chaque mois » aux noms longs, signé ; une visite comprise avec une pièce ; un contrat terminé ; un contrat renouvelé
  const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 12, prix: 12345.67, fact: 'mois', lieu: 'les locaux techniques du sous-sol et la cuisine centrale de l’établissement' });
  v('création d’un contrat mensuel de 12 345,67 €', !!k, k);
  const mesure = async (nom, cap) => { const d = await L.deborde(c), dg = await L.doigts(p), t = await p.evaluate(() => document.getElementById('contenu').scrollHeight);
    v(`${nom} : rien ne déborde du profil (${c.largeur} px)`, d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    v(`${nom} : champs ≥ 16 px et pas de texte écrasé`, !dg.champs.length && !dg.ecrases.length, { champs: dg.champs.slice(0, 3), ecrases: dg.ecrases.slice(0, 3) });
    if (dg.petits.length) console.log('  · cibles sous 44 px (' + nom + ') :', JSON.stringify(dg.petits.slice(0, 6)));
    if (cap) await L.capture(c, CAP + cap + '-' + tag + '.png'); return t; };
  await L.aller(p, 'contrat-x-' + k.id); await mesure('fiche d’un contrat mensuel', 'fiche-mensuel');
  await p.evaluate(() => { const b = document.querySelector('[data-action="ctrLire"]'); if (b && b.offsetParent) b.click(); }); await L.calme(p, 400);
  await mesure('fiche, contrat lu', 'fiche-lu');
  await p.evaluate(id => { const b = document.querySelector('[data-action="renouvelerContrat"]'); b && b.click(); }, k.id); await L.calme(p, 500);
  const pan = await p.evaluate(() => !!document.querySelector('#calque .panneau .ctr-conf'));
  v('le panneau « Renouveler » s’ouvre', pan);
  await mesure('panneau Renouveler', 'panneau-renouveler');
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 300);
  await p.evaluate(id => { const b = document.querySelector('[data-action="finContratDemande"]'); b && b.click(); }, k.id); await L.calme(p, 500);
  v('le panneau « Mettre fin » s’ouvre', await p.evaluate(() => !!document.querySelector('#calque .panneau [data-action="finContratOk"]')));
  await mesure('panneau Mettre fin', 'panneau-fin');
  await p.evaluate(() => document.querySelector('#calque .panneau [data-action="finContratOk"]').click()); await L.calme(p, 600);
  await mesure('fiche d’un contrat terminé', 'fiche-termine');
  await L.aller(p, 'contrats'); await mesure('liste des contrats', 'liste');
  await L.aller(p, 'signer-x-' + k.id); await mesure('page de signature d’un contrat terminé', 'signature-termine');
  v('aucune erreur de la page', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
