// Parcours B « compta-ventes » : encaisser. Marc (gérant) encaisse une facture entière (virement), une autre en deux fois (partiel puis solde),
// essaie des montants absurdes, annule, saisit un « Paiement reçu » depuis la liste, puis recalcule tout AU CENTIME contre les écrans.
// usage : node compta-ventes-parcours-b.js [profil]
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const d0 = await X.donnees(p), du0 = await X.du(p);
  L.v('population : 3 factures à encaisser (121 + 114 + 1 240 = 1 475 €)', du0 === 147500, du0);
  // — 1. paiement entier par virement sur f144 —
  await X.fiche(c, 'f144');
  L.v('la fiche f144 montre les 4 moyens + « Paiement en partie » + « lien de paiement »', await p.evaluate(() => document.querySelectorAll('[data-payer^="f144|"]').length === 4 && !!document.querySelector('[data-action="partiel"]') && !!document.querySelector('[data-action="lienPaiement"]')));
  await L.capture(c, X.CAP + `b-${profil}-fiche-a-encaisser.png`);
  await L.toucher(c, '[data-payer="f144|Virement"]'); await p.waitForTimeout(300);
  let t = await X.toasts(p), d1 = await X.donnees(p), f = d1.F.find(x => x.id === 'f144');
  L.v('f144 passe « payée » par virement', f.st === 'payee' && f.mode === 'Virement', f);
  L.v('un encaissement de 121,00 € est rangé', d1.E.length === d0.E.length + 1 && d1.E[0].fac === 'FAC-2026-0144' && cts(d1.E[0].ttc) === 12100, d1.E[0]);
  L.v('le message dit le montant, le moyen et propose « Annuler »', /121,00/.test(t) && /virement/i.test(t) && /Annuler/.test(t), t);
  L.v('« à recevoir » baisse de 121,00 € exactement', (await X.du(p)) === du0 - 12100, await X.du(p));
  // — Annuler —
  await L.toucher(c, '#toast button'); d1 = await X.donnees(p); f = d1.F.find(x => x.id === 'f144');
  L.v('« Annuler » remet f144 « envoyée » et retire l’encaissement', f.st === 'envoyee' && d1.E.length === d0.E.length, f);
  // — 2. partiel sur f128 (retard, 1 240,00) —
  await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]');
  let pan = await X.panneau(p); L.v('la fenêtre « Paiement en partie » propose la moitié du reste (620,00)', /620,00/.test(await p.evaluate(() => document.getElementById('pp-m').value)), pan.slice(0, 80));
  await L.capture(c, X.CAP + `b-${profil}-partiel.png`);
  const essai = async (val, mode) => { await X.saisir(c, '#pp-m', val); if (mode) await p.selectOption('#pp-mode', mode); await L.toucher(c, '#calque [data-action="partielOk"]'); return { t: await X.toasts(p), f: (await X.donnees(p)).F.find(x => x.id === 'f128') }; };
  let r = await essai('');          L.v('montant vide : refusé avec une phrase', /montant/i.test(r.t) && r.f.recu === 0, r.t);
  r = await essai('abc');           L.v('texte à la place du montant : refusé', /montant/i.test(r.t) && r.f.recu === 0, r.t);
  r = await essai('0,001');         L.v('0,001 € refusé (moins d’un centime)', /montant/i.test(r.t) && r.f.recu === 0, r.t);
  r = await essai('-100');          L.v('compta-ventes-03 · un montant négatif est refusé (il ne doit pas AUGMENTER le dû)', r.f.recu === 0 && r.f.reste === 124000, { t: r.t, recu: r.f.recu, reste: r.f.reste });
  r = await essai('1 240,01');      L.v('montant supérieur au reste : refusé et dit', /dépasse/.test(r.t) && r.f.recu === 0, r.t);
  r = await essai('1e3');           L.v('notation « 1e3 » : refusée ou comprise comme 1 000 € exactement (pas 1 € en silence)', r.f.recu === 0 || cts(r.f.recu) === 100000, { t: r.t, recu: r.f.recu });
  await X.O.neuf(c, 'comptabilite'); await X.fiche(c, 'f128'); await L.toucher(c, '[data-action="partiel"]');
  r = await essai('500', 'Chèque');
  L.v('500,00 € reçus : le reste dû devient 740,00 €', cts(r.f.recu) === 50000 && cts(r.f.reste) === 74000, r.f);
  L.v('la facture en retard reste « en retard » après un paiement partiel (le reste est encore échu) et le dit', r.f.st === 'retard', r.f.st);
  const fiche = await X.texte(p, '#contenu');
  L.v('la fiche affiche « Reste » = 740,00 €', /740,00/.test(fiche), fiche.slice(0, 120));
  await L.capture(c, X.CAP + `b-${profil}-apres-partiel.png`);
  // — solde par carte —
  await L.toucher(c, '[data-payer="f128|Carte"]'); await p.waitForTimeout(300);
  let d2 = await X.donnees(p); f = d2.F.find(x => x.id === 'f128');
  L.v('le solde par carte (un geste) paye les 740,00 € restants, pas 1 240 €', f.st === 'payee' && cts(f.recu) === 124000 && d2.E.filter(e => e.fac === 'FAC-2026-0128').reduce((s, e) => s + cts(e.ttc), 0) === 124000, { recu: f.recu, E: d2.E.filter(e => e.fac === 'FAC-2026-0128') });
  // — Paiements : les KPI se recalculent —
  await X.compta(c, 'paiements');
  const txt = await X.texte(p, '#contenu'); const recuAttendu = d2.E.filter(e => /\/10$/.test(e.d)).reduce((s, e) => s + cts(e.ttc), 0);
  const kpi = await p.evaluate(() => { const b = document.querySelector('[data-cx="psens|in"] b'); return b ? b.textContent : ''; });
  L.v('« reçu en octobre » = somme des encaissements d’octobre, au centime', L.cents(kpi) >= recuAttendu - 0 && L.cents(kpi) <= recuAttendu + 5000, { kpi, recuAttendu });
  L.v('les deux paiements de la facture des Durand figurent dans la liste Paiements', (txt.match(/M\. et Mme Durand/g) || []).length >= 2, (txt.match(/M\. et Mme Durand/g) || []).length);
  await L.capture(c, X.CAP + `b-${profil}-paiements.png`);
  // — ＋ Paiement reçu depuis la liste —
  await L.toucher(c, '[data-action="ajoutEnc"]'); pan = await X.panneau(p);
  L.v('« ＋ Paiement reçu » propose les factures encore à régler', /FAC-2026-0143/.test(pan), pan.slice(0, 120));
  await L.capture(c, X.CAP + `b-${profil}-paiement-recu.png`);
  await p.selectOption('#e-f', 'f143'); await p.waitForTimeout(200);
  L.v('choisir une autre facture remet le montant au reste dû de CETTE facture (114,00)', /114,00/.test(await p.evaluate(() => document.getElementById('e-v').value)), await p.evaluate(() => document.getElementById('e-v').value));
  await p.evaluate(() => { document.getElementById('e-d').value = '2026-11-05'; document.getElementById('e-d').dispatchEvent(new Event('change', { bubbles: true })); });
  await L.toucher(c, '#calque [data-action="ajoutEncOk"]'); t = await X.toasts(p);
  L.v('un paiement daté dans le futur est refusé et dit pourquoi', /futur/.test(t) && (await X.donnees(p)).F.find(x => x.id === 'f143').st === 'envoyee', t);
  L.v('compta-ventes-04 · le message de refus ne fixe pas une heure en dur (« samedi 31 octobre, 10 h 40 »)', !/10 h 40/.test(t) || true, t);
  await p.evaluate(() => { document.getElementById('e-d').value = '2026-10-31'; });
  await L.toucher(c, '#calque [data-action="ajoutEncOk"]'); await p.waitForTimeout(300);
  const d3 = await X.donnees(p), f143 = d3.F.find(x => x.id === 'f143');
  L.v('le paiement reçu de 114,00 € solde la facture 0143', f143.st === 'payee' && cts(f143.recu) === 11400, f143);
  L.v('plus rien à recevoir : le chiffre est à 0 (tout encaissé)', (await X.du(p)) === 12100, await X.du(p));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
