// Matériel, étape 5 (lot 6) — LES MOTS DE L'ARTISAN, PARTOUT où le matériel se dit hors de ses trois rubriques (spec § 3.4, § 9, § 13) : la carte de l'Accueil, la fiche d'intervention, les tâches, la pastille
// « Pièces » du planning, le guide des nouveautés, la visite guidée et les visites parlées (leurs textes), les toasts d'un geste. Les rubriques elles-mêmes sont lues par « materiel-stock-mots », « -depots-mots »
// et « -four-mots ». Aucun mot du lexique banni (dotation, réassort, franco, reliquat, rapprocher, seuil, inventaire, mouvement, « Fournisseur local », CSV, FAB-DIS, « IA », « Sur commande », « Épuisé »),
// aucun préfixe « BC- » / « BR- » à l'écran, aucun émoji, un bouton à icône seule porte un nom. On lit le `textContent` — jamais le `innerHTML`, qui porte le script de la page.
// Usage : node materiel-mots.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js'), fs = require('fs'), path = require('path');
const BANNI = /dotation|réassort|reassort|franco|reliquat|rapproch|\bseuils?\b|inventaires?\b|\bmouvements?\b|Fournisseur local|\bCSV\b|FAB-DIS|\bIA\b|Valider tout|\bBC-\d|\bBR-\d/i;
const BANNI_CASSE = /\bSur commande\b(?!s)|Épuisé/;   // sensibles à la casse : « sur Commandes » (l'onglet) n'est pas l'ancien état « Sur commande »
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;   // pictogrammes (✓ ✕ › ＋ sont des signes, pas des émojis colorés : U+2713/2715 sont dans 2700-27BF, on les écarte à part)
const SIGNES = /[✓✕✔✖➜➔]/g;
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac';
  // ───────── les textes de la page, lus dans le source (commentaires retirés)
  const src = fs.readFileSync(path.join(process.env.RACINE || path.join(__dirname, '..', '..', '..'), 'apercu', 'prototype-op-gestion.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const tranche = (debut, fin) => { const i = src.indexOf(debut); if (i < 0) return ''; const j = src.indexOf(fin, i + debut.length); return src.slice(i, j < 0 ? i + 6000 : j); };
  const blocs = { 'visite guidée · Fournisseurs':tranche("tourPartie('produits'", "tourPartie('stock'"), 'visite guidée · Stock':tranche("tourPartie('stock'", "tourPartie('boxes'"), 'visite guidée · Dépôts':tranche("tourPartie('boxes'", "tourPartie('pointage'"),
    'visite parlée · Fournisseurs':tranche("immChap('produits'", "immChap('stock'"), 'visite parlée · Stock':tranche("immChap('stock'", "immChap('boxes'"), 'visite parlée · Dépôts':tranche("immChap('boxes'", "\nimmChap('", ), 'guide · les cartes de chaque rôle (refait le 17 novembre)':tranche('const NV_CARTES = {', 'function nvRole()') };
  for (const [nom, t] of Object.entries(blocs)) {
    v('population : le texte « ' + nom + ' » a été trouvé dans la page (' + t.length + ' signes)', t.length > 150);
    // on n'examine que les CHAÎNES (ce que l'écran dit), pas les noms de fonctions ni les sélecteurs
    const chaines = [...t.matchAll(/'((?:[^'\\\n]|\\.){12,})'|`((?:[^`\\]|\\.){12,})`|"((?:[^"\\\n]|\\.){12,})"/g)].map(m => (m[1] || m[2] || m[3]).replace(/\\'/g, '’')).filter(s => !/^\[data-|^#|^\.|=>|function|\bconst\b/.test(s));
    const fautes = chaines.filter(s => BANNI.test(s) || BANNI_CASSE.test(s)).map(s => s.slice(0, 80)), emo = chaines.filter(s => EMOJI.test(s.replace(SIGNES, ''))).map(s => s.slice(0, 60));
    v('« ' + nom + ' » : aucun mot du lexique banni (' + chaines.length + ' phrases lues)', chaines.length >= 1 && fautes.length === 0, fautes);
    v('« ' + nom + ' » : aucun émoji', emo.length === 0, emo);
  }
  // ───────── les écrans voisins, lus dans le navigateur
  const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const lire = async (nom, f, regionEmoji) => { const t = await f(); const fautes = [...(t.match(new RegExp(BANNI.source, 'gi')) || []), ...(t.match(new RegExp(BANNI_CASSE.source, 'g')) || [])], emo = (regionEmoji ? await R(sel => [...document.querySelectorAll(sel)].map(e => e.innerText).join('\n'), regionEmoji) : t).replace(SIGNES, '').match(new RegExp(EMOJI.source, 'gu')) || [];
    v('population : « ' + nom + ' » a du texte à lire (' + t.length + ' signes)', t.length > 20);
    v('« ' + nom + ' » : aucun mot banni, aucun émoji', fautes.length === 0 && emo.length === 0, { fautes, emo }); };
  await L.aller(p, 'accueil'); await L.calme(p, 400);
  await lire('l\'Accueil (carte « Matériel » et tout le reste de la page)', () => R(() => document.getElementById('contenu').innerText), '[data-vis="accueil-materiel"]');
  await L.aller(p, 'inter-x-i2'); await L.calme(p, 400);
  await lire('la fiche d\'intervention (pièces prévues, pièces utilisées, fluide)', () => R(() => document.getElementById('contenu').innerText), '[data-vis="inter-pieces"], .pp-l, .pdx-pieces');
  await L.aller(p, 'taches'); await L.calme(p, 400);
  await lire('les Tâches (« commander des pièces », relances, factures à comparer)', () => R(() => document.getElementById('contenu').innerText), '.nothing-here');
  await R(() => { window.__c = COMMANDES.slice(); COMMANDES.push({ id:'cx-m', num:'BC-2026-997', four:'Sanitaire Pro 17', st:'confirmee', env:jour(-1), prevue:jour(3), pour:'i2', lignes:[{ pid:'p25', nom:null, ref:'x', u:'u', q:1, pu:1, tva:20, recu:0, pourInter:'i2' }], journal:[] }); });
  await L.aller(p, 'planning'); await L.calme(p, 700);
  await lire('le Planning (la pastille « Pièces »)', () => R(() => [...document.querySelectorAll('.pdx-pil, [data-int] .st')].map(e => e.textContent + ' ' + (e.title || '')).join('\n') + '\n' + document.getElementById('contenu').innerText.slice(0, 4000)), '.pdx-pil');
  const pil = await R(() => [...document.querySelectorAll('.pdx-pil')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  v('population : le planning porte des pastilles « Pièces » (' + pil.length + ') qui disent un des trois mots : prêtes, en route, à commander', pil.length >= 1 && pil.every(t => /^Pièces (prêtes|en route|à commander)/.test(t)), pil);
  await R(() => { COMMANDES.splice(0, COMMANDES.length, ...window.__c); });
  await L.aller(p, 'stock'); await L.calme(p, 300);
  // le guide : toutes ses pages
  await R(() => nvOuvrir()); await L.calme(p, 400);
  // le guide refait : toutes les cartes sont dans le document (on les lit d'un coup, sans les faire défiler)
  const guide = await R(() => (document.querySelector('#nv .nv-defile') || {}).innerText + '\n');
  await lire('le guide des nouveautés (les cartes de ce rôle)', async () => guide, '#nv .nv-defile');
  v('le guide parle du Stock avec les mots de l’écran (« où il est », « combien il en reste »)', /où il est/.test(guide) && /combien il en reste/.test(guide), guide.slice(0, 300));
  // les boutons à icône seule portent un nom
  await R(() => { fermerPanneau && fermerPanneau(); document.getElementById('nv') && document.getElementById('nv').remove(); });
  let sansNom = [];
  for (const [route, init] of [['accueil', null], ['stock', null], ['boxes', null], ['produits', () => { prVue = 'commandes'; rendre(); }], ['produits', () => { prVue = 'articles'; rendre(); }], ['produits', () => { prVue = 'fournisseurs'; rendre(); }], ['inter-x-i2', null]]) {
    await L.aller(p, route); if (init) { await R(init); await L.calme(p, 300); }
    sansNom.push(...await R(r => [...document.querySelectorAll('#contenu button, #contenu a')].filter(e => e.offsetParent && !(e.textContent || '').replace(/[✕✓›‹＋−+·\s]/g, '').trim() && !e.getAttribute('aria-label') && !e.title).map(e => r + ' › ' + e.outerHTML.slice(0, 80)), route));
  }
  v('population : sept écrans du groupe parcourus', true);
  v('chaque bouton ou lien à icône seule porte un nom (aria-label ou title) : ' + sansNom.length + ' sans nom', sansNom.length === 0, sansNom.slice(0, 5));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
