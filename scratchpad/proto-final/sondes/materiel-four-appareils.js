// Matériel, étape 4 (Fournisseurs, matériel & produits) — LES APPAREILS : sur un profil, de jour ou de nuit, chaque onglet, chaque fiche, chaque feuille ET les valeurs les plus longues plausibles.
//  · aucun débordement horizontal (contre la largeur POSÉE du profil, deux lectures espacées, et la page qu'on pousse), ni dans la page ni dans une feuille ;
//  · les trois onglets tiennent dans leur colonne, sur UNE ligne ; champs ≥ 16 px (zoom d'iPhone) ; cibles au doigt ≥ 44 px (zone qui RÉPOND) ; aucun texte écrasé (< 12 signes par ligne sur 4 lignes).
// Usage : node materiel-four-appareils.js [profil] [nuit] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), tag = profil + (nuit ? ' nuit' : '');
  let vues = 0, cibles = 0;
  const mesure = async nom => { await L.calme(p, 450);
    const d = await L.deborde(c); const pn = await R(() => { const e = document.querySelector('#calque .panneau'); return e ? { sw:e.scrollWidth, cw:e.clientWidth } : null; });
    const doigts = await L.doigts(p, '#contenu'), doigtsP = pn ? await L.doigts(p, '#calque .panneau') : { petits:[], champs:[], ecrases:[] };
    cibles += await R(() => document.querySelectorAll('#contenu button, #calque button, #contenu a, #calque a, #contenu input, #calque input').length); vues++;
    v(tag + ' · ' + nom + ' : la page ne glisse pas de côté (' + d.seconde + ' sur ' + d.largeur + ')', d.bouge === 0 && d.seconde <= d.largeur + 1, d);
    if (pn) v(tag + ' · ' + nom + ' : la feuille ne déborde pas (' + pn.sw + ' sur ' + pn.cw + ')', pn.sw <= pn.cw + 1, pn);
    const T = [...doigts.champs, ...doigtsP.champs]; v(tag + ' · ' + nom + ' : champs ≥ 16 px', T.length === 0, T);
    if (c.doigt) { const P = [...doigts.petits, ...doigtsP.petits]; v(tag + ' · ' + nom + ' : cibles au doigt ≥ 44 px', P.length === 0, P); }
    const E = [...doigts.ecrases, ...doigtsP.ecrases]; v(tag + ' · ' + nom + ' : aucun texte écrasé', E.length === 0, E); };
  const ranger = () => L.ranger(p);
  await L.aller(p, 'produits');
  const et = [['commandes', 'Commandes'], ['articles', 'Articles'], ['fournisseurs', 'Fournisseurs']];
  for (const [k, nom] of et) { await R(k => { prVue = k; rendre(); window.scrollTo(0, 0); }, k); await mesure(nom);
    const tab = await R(() => { const s = document.querySelector('.fx-seg'), B = [...s.querySelectorAll('button')]; return { sw:s.scrollWidth, cw:s.clientWidth, parent:s.parentElement.clientWidth, lignes:B.map(b => Math.round(b.getBoundingClientRect().height)), droite:Math.round(s.getBoundingClientRect().right) }; });
    if (k === 'commandes') v(tag + ' · les trois onglets tiennent dans leur colonne, sur une ligne (' + tab.sw + ' dans ' + tab.parent + ')', tab.sw <= tab.cw + 1 && tab.cw <= tab.parent + 1 && tab.lignes.every(h => h <= 52) && tab.droite <= c.largeur, tab); }
  for (const [nom, f] of [['Fiche fournisseur', () => fournFiche('cpa')], ['Fiche fournisseur (comptoir)', () => fournFiche('fd')], ['Ajouter un fournisseur (liste)', () => { FX.ajTab = 'liste'; fournListe(); }], ['Ajouter un fournisseur (un autre)', () => { FX.ajTab = 'autre'; fournListe(); }],
    ['Le bon', () => cmdPreparer('Clim Pièces Atlantique')], ['Commande confirmée', () => cmdFiche('c39')], ['Commande partielle', () => cmdFiche('c38')], ['J’ai reçu la livraison', () => cmdReception('c38')], ['Comparer avec la facture', () => cmdRappro('c36')], ['Importer les prix', () => fournTarifs('cpa')], ['Photographier une facture', () => fournFacture('')], ['Retirer un fournisseur', () => fxRetirerConfirm('cpa')]]) {
    await R(f); await mesure(nom); await ranger(); }
  // les valeurs les plus longues plausibles : un nom de fournisseur et d'article de 70 signes, un montant à 5 chiffres, une grosse quantité
  await R(() => { const f = MES_FOURN[0]; f.nom = 'Établissements Dupont-Delaunay-Martin et Fils Distribution Régionale'; f.franco = 123456.78; f.port = 12345.67; PRODUITS.slice(0, 6).forEach((x, i) => { x.nom = 'Condensateur permanent à double enroulement ' + (i + 1) + ' µF 450 V (modèle professionnel renforcé)'; x.four = f.nom; x.pa = 12345.67; x.pv = 23456.78; x.q = 1523.5; }); COMMANDES.forEach(o => { o.four = f.nom; }); CMD_PANIER = {}; rendre(); });
  for (const [k, nom] of et) { await R(k => { prVue = k; rendre(); window.scrollTo(0, 0); }, k); await mesure(nom + ' (valeurs longues)'); }
  for (const [nom, f] of [['Fiche fournisseur (valeurs longues)', () => fournFiche('cpa')], ['Le bon (valeurs longues)', () => cmdPreparer(MES_FOURN[0].nom)], ['Commande (valeurs longues)', () => cmdFiche('c39')], ['J’ai reçu (valeurs longues)', () => cmdReception('c38')]]) { await R(f); await mesure(nom); await ranger(); }
  v(tag + ' : population : ' + vues + ' écrans mesurés, ' + cibles + ' éléments touchables recensés', vues >= 30 && cibles >= 500, { vues, cibles });
  v(tag + ' : aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 120) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
