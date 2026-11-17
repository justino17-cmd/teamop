// Parcours C (gérant, ordinateur ou téléphone) : l'ERREUR et les valeurs extrêmes dans « Contrat rapide » : prix vide / zéro / négatif /
// texte / énorme / « 12 345,67 » / « 140,5 » / un centime, un lieu de 130 signes sans espace, un client sans adresse e-mail, le double
// toucher sur « Envoyer à signer », annuler au milieu, le Retour du navigateur, le rechargement sur la fiche d'un contrat neuf.
// usage : node contrats-parcours-c.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }); const p = c.p;
  const nC = () => p.evaluate(() => CONTRATS.length);
  const ouvrirForm = async () => { await O.neuf(c, 'contrats'); await L.aller(p, 'contrat-nouveau'); };
  const envoyer = async prix => { await p.fill('[data-b="prix"]', prix); const n = await nC(); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 400); const l = await O.lire(p); return { cree: (await nC()) > n, toast: l.toast, h1: l.h1 }; };
  // C1 — prix refusés : le message dit quoi faire et le champ prend la main
  for (const [prix, nom] of [['', 'vide'], ['0', 'zéro'], ['-50', 'négatif'], ['abc', 'du texte'], ['1e9', 'énorme (1e9)'], ['99999999', 'énorme (99 999 999)']]) {
    await ouvrirForm(); const r = await envoyer(prix); const foc = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-b'));
    v(`C1 : prix ${nom} refusé, rien n'est créé`, !r.cree, r);
    v(`C1 : prix ${nom} : le message dit quoi faire`, /prix|maximum/i.test(r.toast), r.toast);
    v(`C1 : prix ${nom} : le champ du prix reçoit le curseur`, foc === 'prix', foc);
  }
  // C2 — prix acceptés et leur affichage
  for (const [prix, att, nom] of [['12 345,67', 1234567, '« 12 345,67 »'], ['140,5', 14050, '« 140,5 »'], ['0,001', null, 'un millième d’euro']]) {
    await ouvrirForm(); const r = await envoyer(prix); const k = await p.evaluate(() => CONTRATS[CONTRATS.length - 1].prix);
    if (att !== null) { v(`C2 : prix ${nom} accepté et enregistré au centime`, r.cree && L.cents(k) === att, { k, r }); const aff = (await p.evaluate(() => document.getElementById('contenu').innerText)).replace(/[\u202f\u00a0]/g, ' '); v(`C2 : prix ${nom} : la fiche l'affiche en euros français`, aff.includes(prix === '140,5' ? '140,50 €' : '12 345,67 €'), aff.slice(0, 120)); }
    else v(`contrats-08 · C2 : un prix de ${prix} € (arrondi à 0,00 €) ne s'envoie pas à un client`, !r.cree, { k, r });
  }
  // C3 — un lieu de 130 signes sans espace : le texte déborde-t-il de la fiche ?
  await ouvrirForm(); await p.fill('[data-b="lieu"]', 'A'.repeat(130)); await L.calme(p, 300); const dform = await L.deborde(c);
  v(`C3 : lieu de 130 signes sur le formulaire : la page ne glisse pas (${dform.premiere}/${dform.largeur})`, !dform.bouge, dform);
  await L.capture(c, O.CAP + `C3-lieu-long-formulaire-${profil}.png`);
  await p.fill('[data-b="prix"]', '300'); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 500); const dfiche = await L.deborde(c);
  v(`contrats-10 · C3 : lieu de 130 signes sur la fiche : la page ne glisse pas (${dfiche.premiere}/${dfiche.largeur})`, !dfiche.bouge, dfiche);
  await L.capture(c, O.CAP + `C3-lieu-long-fiche-${profil}.png`);
  // C4 — client sans adresse e-mail
  await ouvrirForm(); await p.evaluate(() => { CLIENTS.cp.mail = ''; }); await p.selectOption('[data-b="cli"]', 'cp'); await p.fill('[data-b="prix"]', '200');
  let n = await nC(); await L.toucher(c, '[data-action="creerContrat"]'); const l4 = await O.lire(p);
  v('C4 : client sans e-mail : pas de contrat envoyé dans le vide', (await nC()) === n, l4);
  const b4 = await p.evaluate(() => (document.querySelector('#toast button') || {}).textContent || ''); v('C4 : le message dit pourquoi et propose « Ouvrir la fiche »', /e-mail/.test(l4.toast) && /Ouvrir la fiche/.test(b4), [l4.toast, b4]);
  await L.toucher(c, '#toast button'); const l4b = await O.lire(p); v('C4 : « Ouvrir la fiche » mène à la fiche du client', /client-x-cp/.test(l4b.hash) || /Camping/.test(l4b.h1 + l4b.panneau), l4b);
  // C5 — double toucher : un seul contrat
  await ouvrirForm(); await p.fill('[data-b="prix"]', '333'); n = await nC(); await p.locator('[data-action="creerContrat"]').dblclick(); await L.calme(p, 600);
  v('C5 : double toucher sur « Envoyer à signer » : UN seul contrat de plus', (await nC()) === n + 1, [n, await nC()]);
  // C6 — Retour du navigateur après l'envoi
  await p.goBack(); await L.calme(p, 500); const l6 = await O.lire(p); const n6 = await nC();
  v('C6 : Retour après l’envoi : on n’est pas sur un formulaire déjà envoyé qui en recréerait un', !/contrat-nouveau/.test(l6.hash) || n6 === n + 1, l6);
  console.log('  · après Retour :', JSON.stringify(l6));
  // C7 — le formulaire d'après repart d'une feuille vierge (pas du client / lieu / prix du contrat précédent)
  await L.aller(p, 'contrat-nouveau'); const f7 = await p.evaluate(() => ({ cli: document.querySelector('[data-b=cli]').value, lieu: document.querySelector('[data-b=lieu]').value, prix: document.querySelector('[data-b=prix]').value, fact: document.querySelector('[data-b=fact]').value, freq: document.querySelector('[data-b=freq]').value }));
  console.log('  · formulaire rouvert après un envoi :', JSON.stringify(f7));
  v('contrats-09 · C7 : un nouveau « Contrat rapide » repart du prix du modèle, pas de celui du contrat précédent (333 €, un prix qu\'aucun modèle ne propose)', f7.prix !== '333', f7);
  // C8 — taper un lieu puis changer de client : le lieu tapé est-il écrasé ?
  await ouvrirForm(); await p.fill('[data-b="lieu"]', 'Chaufferie, bâtiment B'); await p.selectOption('[data-b="cli"]', 'mi'); await L.calme(p, 300);
  const l8 = await p.inputValue('[data-b="lieu"]'); v('C8 : changer de client ne remplace pas le lieu que je viens de taper', l8 === 'Chaufferie, bâtiment B', l8);
  // C9 — quitter à moitié : « ‹ Contrats » ramène à la liste sans rien créer
  await ouvrirForm(); await p.fill('[data-b="prix"]', '333'); n = await nC(); await L.toucher(c, '.retour'); const l9 = await O.lire(p);
  v('C9 : « ‹ Contrats » en cours de saisie ramène à la liste, rien créé', /Contrats/.test(l9.h1) && (await nC()) === n, l9);
  // C10 — recharger sur la fiche d'un contrat qui n'existe plus (les données reviennent au rechargement) : pas de page blanche
  await p.evaluate(() => { location.hash = 'contrat-x-c99'; }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200); await L.calme(p, 400); const l10 = await O.lire(p);
  v('C10 : fiche d’un contrat inconnu (données revenues au rechargement) : un écran lisible, pas une page blanche', l10.h1.length > 0 && l10.long > 500, l10);
  v('C10 : aucune erreur de la page', c.err.length === 0, c.err.slice(0, 3));
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
