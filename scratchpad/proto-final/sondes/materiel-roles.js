// Matériel, étape 5 (lot 6) — LES TROIS RÔLES dans chaque écran du groupe (spec § 4, § 13) : Marc (gérant), Julie (bureau, rôle « gestion »), Sophie (technicienne).
// Une MATRICE de portes : chaque porte est présente ou ABSENTE (jamais grisée sans raison) selon le rôle — et le technicien n'a AUCUN prix, AUCUNE valeur, AUCUNE marge dans son DOM, ni dans Mon camion,
// ni dans ses feuilles, ni dans la fiche d'intervention. Une route fermée ramène sur l'écran d'ouverture avec « Cette page n'existe pas. ». Complète les sondes « materiel-*-roles » (qui jouent le détail
// de chaque rubrique) : celle-ci compare les trois rôles côte à côte. Usage : node materiel-roles.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', M = {};
  // ── la matrice, relevée pour chaque rôle
  const releve = async qui => {
    const c = await L.ouvrir({ profil, qui }), p = c.p, R = (f, a) => p.evaluate(f, a), o = { qui, err:c.err };
    const ouvre = async route => { await L.aller(p, route); await L.calme(p, 400); return R(() => ({ h:(document.querySelector('#contenu h1') || {}).textContent || '', toast:(document.getElementById('toast') || {}).textContent || '', hash:location.hash })); };
    o.routes = {}; for (const r of ['stock', 'produits', 'boxes']) o.routes[r] = await ouvre(r);
    if (qui !== 'sm') {
      await ouvre('stock'); o.stock = await R(() => ({ bandeau:!!document.querySelector('.ms-bandeau'), maj:!!document.querySelector('[data-ms="maj"]'), recherche:!!document.querySelector('#ms-q') }));
      await R(() => document.querySelector('[data-ms="plus"]').click()); await L.calme(p, 300); o.plus = await R(() => [...document.querySelectorAll('.ctx button')].map(b => b.textContent.trim())); await L.ranger(p);
      await R(() => prFiche('p3')); await L.calme(p, 300); o.fiche = await R(() => ({ retirer:!!document.querySelector('#calque [data-pr^="retirer|"]'), modifier:!!document.querySelector('#calque [data-pr^="modif|"]'), prix:!!document.querySelector('#calque [data-ms^="fprixo|"]') })); await R(() => document.querySelector('[data-ms^="fprixo|"]').click()); await L.calme(p, 200);
      o.pv = await R(() => { const e = document.querySelector('[data-msf="pv"]'), a = document.querySelector('[data-msf="pa"]'); return { pv:e ? !e.disabled : null, pa:a ? !a.disabled : null }; }); await L.ranger(p);
      await ouvre('produits'); await R(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 300);
      o.cmd = await R(() => ({ photo:!!document.querySelector('[data-vis="four-photo"]'), nouvelle:/Nouvelle commande/.test((document.querySelector('#contenu .tete') || {}).textContent || ''), preparer:!!document.querySelector('[data-cm^="preparer|"]'), toutprep:!!document.querySelector('[data-pdx="toutprep"]') }));
      await R(() => { prVue = 'fournisseurs'; rendre(); }); await L.calme(p, 300); o.fou = await R(() => ({ ajouter:!!document.querySelector('#contenu .fx-tete [data-fo="liste"]'), cartes:document.querySelectorAll('.fx-c').length }));
    } else {
      await ouvre('moncamion'); o.camion = await R(() => ({ t:document.getElementById('contenu').innerText, h:document.getElementById('contenu').innerHTML }));
      o.feuilles = {};
      for (const [nom, ouvrir] of [['usage', () => document.querySelector('[data-mat="usage"]').click()], ['manque', () => document.querySelector('[data-mat="manque"]').click()]]) { await R(ouvrir); await L.calme(p, 400); o.feuilles[nom] = await R(() => (document.querySelector('#calque .panneau') || {}).innerText || ''); await L.ranger(p); }
      await ouvre('inter-x-i2'); o.fiche = await R(() => document.getElementById('contenu').innerText);
      await ouvre('majournee'); o.journee = await R(() => document.getElementById('contenu').innerText);
    }
    await L.fin(c); return o;
  };
  for (const qui of ['marc', 'julie', 'sm']) M[qui] = await releve(qui);
  const { marc, julie, sm } = M, FERME = /(n’existe pas|fermée à ton compte|n’est pas dans ton espace)/;   // les trois façons de dire « pas pour toi » : page inconnue, rubrique fermée au compte, page hors de l'espace de la personne
  // ── les routes
  v('Marc : Stock, Fournisseurs et Dépôts s\'ouvrent', marc.routes.stock.h === 'Stock' && /Fournisseurs/.test(marc.routes.produits.h) && /Dépôts et camions/.test(marc.routes.boxes.h), marc.routes);
  v('Julie : Stock et Fournisseurs s\'ouvrent ; Dépôts et camions est FERMÉ (retour à son écran d\'ouverture, « Cette page n\'existe pas. »)', julie.routes.stock.h === 'Stock' && /Fournisseurs/.test(julie.routes.produits.h) && !/Dépôts/.test(julie.routes.boxes.h) && FERME.test(julie.routes.boxes.toast), julie.routes);
  v('Sophie : AUCUNE des trois rubriques (« Cette page n\'existe pas. » chaque fois, retour sur son écran d\'ouverture)', ['stock', 'produits', 'boxes'].every(r => !/^(Stock|Fournisseurs|Dépôts)/.test(sm.routes[r].h) && FERME.test(sm.routes[r].toast)), sm.routes);
  // ── les portes de Marc et de Julie
  v('population : Marc voit le bandeau/ses portes (Mettre à jour, recherche) et Julie aussi', marc.stock.maj && marc.stock.recherche && julie.stock.maj && julie.stock.recherche, { marc:marc.stock, julie:julie.stock });
  v('« Accepter les envois » : Marc a le bandeau, Julie non (case « Accepter les envois des techniciens » à lui donner dans Équipe)', marc.stock.bandeau && !julie.stock.bandeau, { marc:marc.stock.bandeau, julie:julie.stock.bandeau });
  v('« Réglages du stock » : dans le menu Plus de Marc, ABSENT de celui de Julie (pas grisé)', marc.plus.some(t => /Réglages du stock/.test(t)) && !julie.plus.some(t => /Réglages du stock/.test(t)), { marc:marc.plus, julie:julie.plus });
  v('« Retirer cet article » : Marc oui, Julie non — mais Julie peut « Modifier » (le prix d\'achat et la fiche : oui)', marc.fiche.retirer && !julie.fiche.retirer && julie.fiche.modifier, { marc:marc.fiche, julie:julie.fiche });
  v('le prix de VENTE : modifiable pour Marc, grisé pour Julie ; le prix d\'ACHAT : modifiable pour tous les deux', marc.pv.pv === true && julie.pv.pv === false && marc.pv.pa === true && julie.pv.pa === true, { marc:marc.pv, julie:julie.pv });
  v('commander, préparer, photographier une facture : Marc ET Julie (une secrétaire qui reçoit les livraisons les prépare)', ['photo', 'nouvelle', 'preparer', 'toutprep'].every(k => marc.cmd[k] && julie.cmd[k]), { marc:marc.cmd, julie:julie.cmd });
  v('ajouter / retirer un fournisseur : Marc oui, Julie non — elle voit pourtant les mêmes cartes (' + julie.fou.cartes + ')', marc.fou.ajouter && !julie.fou.ajouter && julie.fou.cartes === marc.fou.cartes && julie.fou.cartes >= 5, { marc:marc.fou, julie:julie.fou });
  // ── la technicienne : aucun prix, aucune valeur, aucune marge
  const toutSm = [sm.camion.t, sm.feuilles.usage, sm.feuilles.manque, sm.fiche].join('\n');
  v('population : de quoi lire pour Sophie (Mon camion ' + sm.camion.t.length + ' signes, deux feuilles ' + (sm.feuilles.usage.length + sm.feuilles.manque.length) + ', sa fiche d\'intervention ' + sm.fiche.length + ')', sm.camion.t.length > 300 && sm.feuilles.usage.length > 40 && sm.feuilles.manque.length > 40 && sm.fiche.length > 500, { c:sm.camion.t.length, u:sm.feuilles.usage.length, m:sm.feuilles.manque.length, f:sm.fiche.length });
  v('Sophie : AUCUN « € » dans Mon camion, ses feuilles, sa fiche d\'intervention et Ma journée', !/€/.test(toutSm), (toutSm.match(/[\s\S]{0,40}€[\s\S]{0,12}/g) || []).map(t => t.replace(/\s+/g, ' ')));
  v('Sophie : aucun mot de prix, de valeur ou de marge (prix d\'achat, marge, valeur du stock, « HT ») dans ces écrans, ni dans le code HTML de Mon camion', !/prix d.achat|marge|valeur du stock|\bHT\b|prix de vente/i.test(toutSm) && !/\d[\d  ]*[,.]\d{2}\s*(€|&euro;)|data-pa=|data-pv=/.test(sm.camion.h), (toutSm.match(/[\s\S]{0,20}(prix d.achat|marge|valeur du stock|\bHT\b|prix de vente)[\s\S]{0,10}/gi) || []));
  v('aucune erreur de page (trois rôles)', ['marc', 'julie', 'sm'].every(q => M[q].err.length === 0), ['marc', 'julie', 'sm'].map(q => M[q].err.slice(0, 2)));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
