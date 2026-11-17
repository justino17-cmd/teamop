// Matériel, étape 2 (Stock) — LES MOTS : le textContent (jamais le innerHTML, qui porte le script) de la page Stock, de chaque feuille, de la fiche d'un article,
// du formulaire, du journal et des messages, ne contient AUCUN mot du lexique banni (spec § 3.4), aucun préfixe « BC- / BR- », aucun émoji ;
// chaque bouton à icône seule porte un nom (aria-label). La population (nombre d'écrans lus, de caractères lus) est comptée d'abord.
// Usage : node materiel-stock-mots.js → « N ✓ · M ✗ »
const L = require('../lib.js');
const BANNI = [[/dotation/i, 'dotation'], [/réassort/i, 'réassort'], [/franco/i, 'franco'], [/reliquat/i, 'reliquat'], [/rapproch/i, 'rapprocher'], [/\bseuil/i, 'seuil'], [/inventaire/i, 'inventaire'], [/mouvement/i, 'mouvement'],
  [/\bentrée\b/i, 'Entrée (bouton)'], [/\bsortie\b/i, 'Sortie (bouton)'], [/\btransfert\b/i, 'Transfert (bouton)'], [/fournisseur local/i, 'Fournisseur local'], [/\bCSV\b/, 'CSV'], [/FAB-DIS/, 'FAB-DIS'], [/\bIA\b/, 'IA'], [/sur commande/i, 'Sur commande'],
  [/épuisé/i, 'Épuisé'], [/\b(BC|BR)-\d/, 'BC-/BR-'], [/\bvalider\b|\bvalidé/i, 'valider'], [/\bboxes?\b/i, 'Box']];
(async () => {
  const v = L.v, c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, lus = [];
  const lire = async nom => { await L.calme(p, 350); const t = await p.evaluate(() => { const s = [...document.querySelectorAll('#contenu, #calque, #toast')].map(e => e.innerText).join('\n'); const sans = [...document.querySelectorAll('#contenu button, #calque button')].filter(b => { const t = b.textContent.trim(); return t.length <= 1 || !/[\p{L}\d]/u.test(t); }).filter(b => !(b.getAttribute('aria-label') || b.title)).length; return { s, sans }; }); lus.push([nom, t.s, t.sans]); };
  const R = (f, a) => p.evaluate(f, a);
  await L.aller(p, 'stock'); await lire('page Articles');
  await R(() => { stkOnglet = 'mvts'; rendre(); }); await lire('Ce qui a bougé'); await R(() => { stkOnglet = 'ensemble'; rendre(); });
  await R(() => matGOuvrir('quoi')); await lire('Que veux-tu faire ?');
  for (const m of ['sortir', 'ranger', 'deplacer']) { await R(m2 => { matGOuvrir(m2, { pid:'p1' }); MAT.G.pour = 'collegue'; matGVue(); }, m); await lire('feuille ' + m); }
  await R(() => { matGOuvrir('ranger'); MAT.G.origine = 'comptoir'; matGVue(); }); await lire('feuille ranger (comptoir)');
  await R(() => matCompter()); await lire('Compter quel lieu'); await R(() => matCompter('atelier')); await lire('Compter l\'atelier');
  await R(() => msEnvois()); await lire('Envois à accepter'); await R(() => msRefuser(MVTS_ATT[0].id)); await lire('Refuser');
  await R(() => sxExport()); await lire('Exporter l\'historique'); await R(() => msReglagesVue()); await lire('Réglages du stock'); await R(() => sxRegistre()); await lire('Registre des fluides'); await R(() => msFiltrer()); await lire('Filtrer');
  for (const id of ['p3', 'p4', 'p1']) { await R(i => prFiche(i), id); await lire('fiche ' + id); }
  await R(() => prFormulaire(null, PACKS_ENT[0], '')); await lire('Ajouter un article'); await R(() => prFormulaire(PRODUITS[0])); await lire('Modifier un article');
  await R(() => { fermerPanneau(); }); await R(() => document.querySelector('[data-ms="plus"]').click()); await p.waitForTimeout(250); lus.push(['menu Plus', await R(() => [...document.querySelectorAll('.ctx')].map(e => e.innerText).join('\n')), 0]); await R(() => fermerMenu());
  await R(() => { const b = document.querySelector('[data-ms="toutacc"]'); if (b) b.click(); }); await L.calme(p, 400); lus.push(['message « envois acceptés »', await R(() => (document.getElementById('toast') || {}).innerText || ''), 0]);
  const total = lus.reduce((n, x) => n + x[1].length, 0);
  v('population : ' + lus.length + ' écrans et feuilles lus, ' + total + ' caractères', lus.length >= 20 && total > 8000);
  for (const [nom, t, sans] of lus) {
    const eu = BANNI.filter(([re]) => re.test(t.replace(/[  ]/g, ' '))).map(x => x[1]);
    v('« ' + nom + ' » : aucun mot du lexique banni', eu.length === 0, eu);
    const emo = (t.match(/\p{Extended_Pictographic}/gu) || []).filter(x => !/[←-⇿•✓✔·]/.test(x));
    v('« ' + nom + ' » : aucun émoji', emo.length === 0, emo);
    v('« ' + nom + ' » : chaque bouton à icône seule porte un nom', sans === 0, sans);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
