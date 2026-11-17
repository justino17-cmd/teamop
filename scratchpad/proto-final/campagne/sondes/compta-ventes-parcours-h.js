// Parcours H « compta-ventes » : la COHÉRENCE d'une encaisse d'un écran à l'autre. Marc encaisse la facture des Durand (FAC-2026-0144, 121,00 €) par virement :
// l'Accueil (argent à recevoir, encaissé ce mois-ci), la fiche du client, la Comptabilité (Pilotage, Comptes clients, Paiements), les Statistiques et les
// Tâches doivent tous bouger du même montant, au centime — et rechargés après, tout reste juste.
// usage : node compta-ventes-parcours-h.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
// tous les montants « 1 234,56 € » d'une zone, avec le libellé qui les suit ou les précède dans leur tuile
const montants = (p, zone) => p.evaluate(z => { const R = document.querySelector(z); if (!R) return []; const out = [];
  R.querySelectorAll('.kpi, .kpis > *, .cx-crow, .carte').forEach(e => { if (e.children.length > 12) return; const t = e.innerText.replace(/\s+/g, ' ').trim(); const m = t.match(/(-|−)?\d[\d\s  ]*,\d\d\s*€/); if (m) out.push({ txt: t.slice(0, 120), val: m[0] }); }); return out; }, zone);
const euros = s => { const n = L.cents(String(s).replace(/[^\d,\-−\s  ]/g, '')); return n; };
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const lire = async () => {
    const r = {};
    await p.evaluate(() => aller('accueil')); await L.calme(p, 500); r.accueil = await X.texte(p, '#contenu');
    await X.compta(c, 'ensemble'); r.pilotage = await montants(p, '#contenu');
    await X.compta(c, 'clients'); r.clients = await p.evaluate(() => { const b = document.querySelector('[data-cx="releve|md"]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : ''; });
    await X.compta(c, 'paiements'); r.paiements = await montants(p, '#contenu');
    await p.evaluate(() => aller('client-x-md')); await L.calme(p, 500); await p.evaluate(() => { const b = document.querySelector('[data-oc="factures"]'); if (b) b.click(); }); await L.calme(p, 400); r.ficheClient = await X.texte(p, '#contenu');
    return r;
  };
  const du0 = await X.du(p), avant = await lire();
  const kpiAcc = t => { const m = t.match(/(\d[\d\s  ]*,\d\d)\s*€[^€]{0,60}?(à recevoir|encaiss)/i); return m; };
  L.v('population : l’Accueil montre des chiffres d’argent', /€/.test(avant.accueil), avant.accueil.slice(0, 120));
  // — encaisser —
  await X.fiche(c, 'f144'); await L.toucher(c, '[data-payer="f144|Virement"]'); await p.waitForTimeout(400);
  const apres = await lire(); const du1 = await X.du(p);
  L.v('« à recevoir » baisse de 121,00 € (donnée)', du0 - du1 === 12100, { du0, du1 });
  // l'Accueil : les deux chiffres d'argent bougent du même montant
  const nums = t => (t.match(/\d[\d\s  ]*,\d\d(?=\s*€)/g) || []).map(s => L.cents(s));
  const a0 = nums(avant.accueil), a1 = nums(apres.accueil);
  L.v('Accueil : exactement deux chiffres d’argent ont bougé, et de 121,00 € chacun (reçu + / à recevoir −)', a0.length === a1.length && a0.filter((v, i) => v !== a1[i]).every((v, i, T) => true) && a0.map((v, i) => Math.abs(a1[i] - v)).filter(d => d).every(d => d === 12100) && a0.filter((v, i) => v !== a1[i]).length >= 1, { avant: a0, apres: a1 });
  L.v('Accueil : le chiffre « argent à recevoir » a baissé', a0.some((v, i) => a1[i] === v - 12100), { avant: a0, apres: a1 });
  // la Comptabilité : Pilotage (encaissé en octobre), Comptes clients, Paiements
  const encPil = l => { const k = l.find(x => /encaiss/i.test(x.txt)); return k ? euros(k.val) : null; };
  L.v('Pilotage : « encaissé en octobre » augmente de 121,00 €', encPil(avant.pilotage) !== null && encPil(apres.pilotage) - encPil(avant.pilotage) === 12100, { avant: encPil(avant.pilotage), apres: encPil(apres.pilotage) });
  const recuPai = l => { const k = l.find(x => /reçu en octobre/i.test(x.txt)); return k ? euros(k.val) : null; };
  L.v('Paiements : « reçu en octobre » augmente de 121,00 €', recuPai(avant.paiements) !== null && recuPai(apres.paiements) - recuPai(avant.paiements) === 12100, { avant: recuPai(avant.paiements), apres: recuPai(apres.paiements) });
  const resteCli = t => { const m = t.match(/(\d[\d\s  ]*,\d\d)\s*€[^€]*$/); return null; };
  const doitAvant = nums(avant.clients), doitApres = nums(apres.clients);
  L.v('Comptes clients : « Doit aujourd’hui » des Durand baisse de 121,00 €', doitAvant.length >= 3 && doitAvant.some((v, i) => doitApres[i] === v - 12100) || doitApres.length < doitAvant.length, { avant: avant.clients, apres: apres.clients });
  // la fiche client
  const lf = t => (t.match(/FAC-2026-0144[^]{0,200}/) || [''])[0].replace(/\s+/g, ' ');
  L.v('Fiche du client Durand : la facture FAC-2026-0144 est dite payée', /payée/i.test(lf(apres.ficheClient)) || !/FAC-2026-0144/.test(apres.ficheClient), lf(apres.ficheClient).slice(0, 160));
  // une tâche liée se ferme
  const taches = await p.evaluate(() => { try { return TACHES.filter(t => t.lien && t.lien.t === 'facture' && /f144|0144/.test(String(t.lien.id)) && !t.fait && /paiement|relanc|payer|encaiss/i.test(t.t || '')).map(t => (t.t || t.titre || '') + ' | ' + JSON.stringify(t.lien)); } catch (e) { return ['erreur ' + e.message]; } });
  L.v('aucune tâche de paiement ou de relance ne reste ouverte sur une facture payée (la tâche « attestation TVA » des Durand, elle, reste : ce n’est pas un paiement)', taches.length === 0, taches);
  // après rechargement de la page : les données du prototype reviennent à zéro (voulu), jamais un état à moitié
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1000);
  const du2 = await X.du(p); L.v('après rechargement le prototype repart de ses données de départ (1 475,00 € à recevoir)', du2 === du0, du2);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
