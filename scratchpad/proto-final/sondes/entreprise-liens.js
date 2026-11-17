// « Mon entreprise › Ce qui se règle ailleurs » : six lignes, chacune MÈNE à l'endroit où la case vit (aucune copie), l'état écrit est CALCULÉ
// (on change la case, la ligne suit), une ligne dont la destination est refusée n'est pas dessinée, et « Compléter ma fiche légale » de la
// Conformité ouvre le MÊME panneau que la carte. Le bouton « Métiers » de la bande de test reste hors du mode application.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (lignes, destinations) avant de conclure.
const { L, v, ouvrirEnt, panneauOuvert, fin } = require('./entreprise-commun.js');
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
async function cliquerLien(c, k) { await L.aller(c.p, 'entreprise'); await L.toucher(c, `[data-ent="lien|${k}"]`); await L.calme(c.p, 600); }
const lire = c => c.p.evaluate(() => ({ hash:location.hash, h2:(document.querySelector('#calque .panneau h2') || {}).textContent || '', surtitre:(document.querySelector('#calque .panneau .surtitre') || {}).textContent || '', notes:document.querySelector('.ax-regle') ? { visible:document.querySelector('.ax-regle').offsetParent !== null, onglet:acOnglet } : null, auto:(() => { const e = document.querySelector('[data-reglage="auto"]'); return e ? { visible:e.offsetParent !== null } : null; })() }));
(async () => {
  const c = await ouvrirEnt({ profil:'mac' });
  const L0 = await c.p.evaluate(() => [...document.querySelectorAll('[data-ent^="lien|"]')].map(e => ({ k:e.dataset.ent.split('|')[1], t:e.querySelector('b').textContent, etat:e.querySelector('.gris').textContent })));
  v('population : six lignes de liens', L0.length === 6, L0.map(l => l.k));
  v('les six libellés : Rendez-vous en ligne, Facture envoyée toute seule, Notes de frais, Sorties de stock à valider, Boîtes mail, Tes métiers', L0.map(l => l.t).join('|') === 'Rendez-vous en ligne|Facture envoyée toute seule|Notes de frais|Sorties de stock à valider|Boîtes mail|Tes métiers', L0.map(l => l.t));
  // destinations
  await cliquerLien(c, 'rdv'); { const r = await lire(c); v('Rendez-vous en ligne → Planning, panneau « Rendez-vous en ligne » (surtitre « Planning », plus « Paramètres »)', r.hash === '#planning' && r.h2 === 'Rendez-vous en ligne' && r.surtitre === 'Planning', r); }
  await cliquerLien(c, 'auto'); { const r = await lire(c); v('Facture envoyée toute seule → Comptabilité, la case « Envoyer la facture toute seule » est à l’écran', r.hash === '#comptabilite' && r.auto && r.auto.visible, r); }
  await cliquerLien(c, 'ndf'); { const r = await lire(c); v('Notes de frais → Achats et frais › Notes de frais, bloc des règles (« Changer ») à l’écran', r.hash === '#achats' && r.notes && r.notes.visible && r.notes.onglet === 'notes', r); }
  await cliquerLien(c, 'stock'); { const r = await lire(c); v('Sorties de stock à valider → Stock, panneau « Réglages du stock »', r.hash === '#stock' && r.h2 === 'Réglages du stock', r); }
  await cliquerLien(c, 'boites'); { const r = await lire(c); v('Boîtes mail → Boîte mail, panneau « Boîtes connectées »', r.hash === '#boiteMail' && r.h2 === 'Boîtes connectées', r); }
  await cliquerLien(c, 'metiers'); { const r = await lire(c), t = norm(await c.p.evaluate(() => document.querySelector('#calque .panneau').textContent)); v('Tes métiers → un panneau en lecture seule : la liste, « Réglé par TEAM OP à l’ouverture de ton compte. »', r.h2 === 'Tes métiers' && /Réglé par TEAM OP à l’ouverture de ton compte\./.test(t) && /Climatisation/.test(t) && (await c.p.evaluate(() => !document.querySelector('#calque .panneau input, #calque .panneau select'))), t.slice(0, 120)); await L.ranger(c.p); }
  const bande = await c.p.evaluate(() => { const b = document.querySelector('[data-mch="ouvrir"]'); return !b || b.offsetParent === null; });
  v('le bouton « Métiers » de la bande de test ne paraît pas en mode application', bande, bande);
  // l'état écrit est calculé : on change la case, la ligne suit
  await L.aller(c.p, 'entreprise');
  const etat = async () => c.p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-ent^="lien|"]')].map(e => [e.dataset.ent.split('|')[1], e.querySelector('.gris').textContent.replace(/[  ]/g, ' ')])));
  const e0 = await etat();
  v('état : « Ouvert 5 jours par semaine », « Désactivée », « Activé », « 2 boîtes connectées »', e0.rdv === 'Ouvert 5 jours par semaine' && e0.auto === 'Désactivée' && e0.stock === 'Activé' && e0.boites === '2 boîtes connectées', e0);
  await c.p.evaluate(() => { RDV_REGLES.actif = false; reglages.auto = true; STK_VALID = false; ML_BOITES.pop(); NDF_REGLE.sansTicket = false; AX.kmTarif = 0.7; PACKS_ENT.splice(0, PACKS_ENT.length, 'plomberie'); rendre(); }); await L.calme(c.p, 300);
  const e1 = await etat();
  v('on change les cases ailleurs : les six états suivent (Fermé, Activée, Désactivé, 1 boîte, règle de notes, un seul métier)', e1.rdv === 'Fermé' && e1.auto === 'Activée' && e1.stock === 'Désactivé' && e1.boites === '1 boîte connectée' && /Kilomètre à 0,70 € · sans ticket : refusées/.test(e1.ndf) && !/Climatisation|Chauffage/.test(e1.metiers), e1);
  await c.p.evaluate(() => { RDV_REGLES.jours[1].matin = false; RDV_REGLES.jours[1].aprem = false; RDV_REGLES.actif = true; rendre(); }); await L.calme(c.p, 200);
  const e2 = await etat(); v('un jour fermé de moins : « Ouvert 4 jours par semaine »', e2.rdv === 'Ouvert 4 jours par semaine', e2.rdv);
  // une ligne dont la destination est refusée n'est pas dessinée
  const faire = [['planning', 'rdv'], ['comptabilite', 'auto'], ['achats', 'ndf'], ['stock', 'stock'], ['boiteMail', 'boites']];
  let n = 0;
  for (const [route, lien] of faire) {
    const ks = await c.p.evaluate(r => { const p0 = rlPermis; window.rlPermis = x => x === r ? false : p0(x); rendre(); const k = [...document.querySelectorAll('[data-ent^="lien|"]')].map(e => e.dataset.ent.split('|')[1]); window.rlPermis = p0; rendre(); return k; }, route);
    n++; v(`destination « ${route} » refusée : la ligne « ${lien} » n’est pas dessinée, les autres restent`, !ks.includes(lien) && ks.length === 5, ks);
  }
  v('population : cinq destinations refusées jouées', n === 5, n);
  // « Compléter ma fiche légale » de la Conformité ouvre le MÊME panneau
  await c.p.evaluate(() => { rendre(); }); await L.aller(c.p, 'entreprise'); await L.toucher(c, '[data-ent="carte|legal"]');
  const carte = await panneauOuvert(c.p); await L.ranger(c.p);
  const conf = await c.p.evaluate(() => { const b = document.createElement('button'); b.type = 'button'; b.dataset.cx = 'fiche'; b.textContent = 'Compléter ma fiche légale'; document.body.appendChild(b); b.click(); b.remove(); return (document.querySelector('#calque .panneau h2') || {}).textContent; });
  v('le bouton de la Conformité (data-cx="fiche") ouvre le MÊME panneau que la carte « Tes mentions légales »', !!carte && carte === conf, { carte, conf });
  const src = await c.p.evaluate(() => (document.documentElement.innerHTML.match(/data-cx="fiche"/g) || []).length); v('population : la Conformité propose bien ce bouton quelque part dans la page', src >= 1, src);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await fin();
})();
