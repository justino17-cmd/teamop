// Mesure RÉELLE des exemples de saisie, à 320 px (retouche du 18/11, remplace le seuil commun de 238 px) : chaque exemple des trois tables
// (MET_EXEMPLES, MET_EX_FAM — chauf, plomb, nuis, nett —, MET_EX_CLIM) est lu DANS SON champ, avec SA place : l'écran est ouvert par les
// gestes de l'application, le métier posé comme le fait TEAM OP, puis largeur de place (clientWidth moins paddings) contre largeur du texte rendu
// (police, taille et espacement CALCULÉS du champ). Un textarea passe à la ligne (mots coupés à la ligne simulés) : il n'est « coupé » que si
// ses lignes dépassent sa hauteur ou si un mot seul dépasse sa largeur.
// Population : 13 champs × 7 familles de métier (clim, cvc, chauf, plomb, nuis, nett, gen). Le champ est RETROUVÉ dans le source par son
// identifiant (la clé de la table est le placeholder d'origine qu'on y lit) ; champ introuvable, écran non ouvert, indication absente : ✗ nommé.
// Les clés des tables que NI le source NI l'écran ne portent (jumelles « Ex. » en majuscule, clés « Ex. : … ») sont listées à part, comptées
// et vérifiées mortes (zéro occurrence exacte hors table) : elles ne s'affichent nulle part, donc ne peuvent pas être coupées.
// Usage : node metier-3d-exemples-320.js [petit|iphone|ipad|mac ...] [--nuit] [--capture]     Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L, fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../../../../apercu/prototype-op-gestion.html'), 'utf8');
const args = process.argv.slice(2), FAM = (args.find(a => a.startsWith('--fam=')) || '').slice(6).split(',').filter(Boolean), NUIT = args.includes('--nuit'), CAPT = args.includes('--capture'), PROFILS = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : ['petit'];
const LARG = { petit: 320, iphone: 390, ipad: 820, mac: 1440 };
let ok = 0, ko = 0; const notes = []; const v = (n, c, d) => { if (c) ok++; else { ko++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };
const FAMILLES_TOUTES = [['clim', ['climatisation']], ['cvc', ['climatisation', 'chauffage']], ['chauf', ['chauffage']], ['plomb', ['plomberie']], ['nuis', ['3d']], ['nett', ['nettoyage']], ['gen', ['electricite']]];
const FAMILLES = FAM.length ? FAMILLES_TOUTES.filter(f => FAM.includes(f[0])) : FAMILLES_TOUTES;
// les champs : identifiant de repérage dans le source (pour retrouver le placeholder d'origine), sélecteur, écran
const CHAMPS = [
  { n: 'lieu (nouveau contrat)', src: 'data-b="lieu"', sel: 'input[data-b="lieu"]' },
  { n: 'objet du devis', src: 'id="dvn-objet"', sel: '#dvn-objet' },
  { n: 'désignation de la facture', src: 'id="nf-d"', sel: '#nf-d' },
  { n: 'fournisseur de la dépense', src: 'id="dp-f"', sel: '#dp-f' },
  { n: 'description de la dépense', src: 'id="dp-o"', sel: '#dp-o' },
  { n: 'demande du client', src: 'id="ed-m"', sel: '#ed-m', multi: true },
  { n: 'besoin de la visite pour un devis', src: 'data-rlv="besoin|', sel: 'textarea[data-rlv^="besoin"]', multi: true },
  { n: 'article de la demande d’achat', src: 'id="ax-q"', sel: '#ax-q' },
  { n: 'recherche d’article (création)', src: 'data-cchamp="cpq"', sel: 'input[data-cchamp="cpq"]' },
  { n: 'pourquoi (demande d’achat)', src: 'id="ax-p"', sel: '#ax-p', multi: true },
  { n: 'nom de la vue (planning)', src: 'id="vue-nom"', sel: '#vue-nom' },
  { n: 'nom de l’appareil', src: 'id="app-nom"', sel: '#app-nom' },
  { n: 'détail de l’appareil', src: 'id="app-det"', sel: '#app-det' }
];
// le placeholder d'origine, lu dans le source (la clé de la table) : l'élément qui porte le repère, son attribut placeholder
for (const ch of CHAMPS) { const i = SRC.indexOf(ch.src); ch.cle = null; if (i >= 0) { const a = Math.max(SRC.lastIndexOf('<input', i), SRC.lastIndexOf('<textarea', i)), seg = SRC.slice(a, a + 700), m = seg.match(/placeholder="([^"]*)"/); ch.cle = m ? m[1] : null; if (m && m[1].startsWith('${')) ch.cle = (m[1].match(/'(ex\.[^']*)'/g) || []).map(x => x.slice(1, -1)).pop() || null; ch.ligne = SRC.slice(0, i).split('\n').length; } }
// la mesure, dans la page : place du champ contre texte rendu ; un textarea simule le retour à la ligne
const MESURE = (sel, larg) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return { absent: true };
  const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || getComputedStyle(e).visibility === 'hidden') return { absent: true, cache: true };
  const cs = getComputedStyle(e), c = document.createElement('canvas').getContext('2d'); c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const ph = e.getAttribute('placeholder') || '', ls = parseFloat(cs.letterSpacing) || 0, lg = t => c.measureText(t).width + ls * t.length;
  const debord = Math.max(0, innerWidth - ${larg}), place = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - debord, out = { ph, debord, place: Math.round(place * 10) / 10, val: e.value, multi: e.tagName === 'TEXTAREA', W: innerWidth, droite: Math.round(r.right) };
  if (!out.multi) { out.txt = Math.round(lg(ph) * 10) / 10; out.coupe = out.txt > place; return out; }
  const mots = ph.split(/\\s+/), plusLong = Math.max(...mots.map(lg)); let lignes = 1, cur = '';
  for (const m of mots) { const t = cur ? cur + ' ' + m : m; if (lg(t) <= place || !cur) cur = t; else { lignes++; cur = m; } }
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25, cap = Math.floor((e.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh + 0.02);
  out.txt = Math.round(plusLong); out.lignes = lignes; out.cap = cap; out.coupe = plusLong > place || lignes > cap; return out; })()`;
(async () => {
  // population avant tout : tables, champs, clés
  const c0 = await O.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', packs: ['3d'] });
  const T = await c0.p.evaluate(() => ({ ex: MET_EXEMPLES, clim: MET_EX_CLIM, fam: MET_EX_FAM, ligne: typeof metiersEx })); await L.fin(c0);
  const nTables = [T.ex, T.clim, ...Object.values(T.fam)].map(t => Object.keys(t).length);
  v('population : MET_EXEMPLES, MET_EX_CLIM et les familles de MET_EX_FAM sont trouvées', T.ex && T.clim && T.fam && Object.keys(T.fam).sort().join() === 'chauf,nett,nuis,plomb', Object.keys(T.fam || {}).join());
  const totalExemples = nTables.reduce((a, b) => a + b, 0); notes.push('entrées des tables : ' + totalExemples + ' (MET_EXEMPLES ' + Object.keys(T.ex).length + ', MET_EX_CLIM ' + Object.keys(T.clim).length + ', ' + Object.entries(T.fam).map(([k, t]) => k + ' ' + Object.keys(t).length).join(', ') + ')');
  for (const ch of CHAMPS) v('source : le champ « ' + ch.n + ' » est retrouvé avec son placeholder d\'origine', !!ch.cle, ch.src);
  const vives = new Set(CHAMPS.map(x => x.cle)); notes.push(CHAMPS.length + ' champs retrouvés dans le source (' + [...vives].length + ' placeholders d\'origine distincts)');
  // les clés que personne ne porte : mortes, vérifiées (zéro occurrence exacte du texte, hors lignes des tables)
  const lignesSrc = SRC.split('\n'), horsTables = lignesSrc.map((l, i) => (i >= 23764 && i <= 23916) ? '' : l).join('\n');
  const toutes = new Set(); [T.ex, T.clim, ...Object.values(T.fam)].forEach(t => Object.keys(t).forEach(k => toutes.add(k)));
  const mortes = [...toutes].filter(k => !vives.has(k)); mortes.forEach(k => v('clé sans champ « ' + k + ' » : aucune occurrence exacte dans le source hors table (jamais affichée)', !horsTables.includes('"' + k + '"') && !horsTables.includes("'" + k + "'"), k));
  notes.push(mortes.length + ' clés mortes (sans champ), jamais affichées : ' + mortes.join(' · '));
  const vivesEntrees = [...vives].filter(k => toutes.has(k)); notes.push(vives.size + ' clés vives, dont ' + vivesEntrees.length + ' présentes dans les tables (les autres gardent leur texte d\'origine)');
  let mesures = 0; const largMin = {};
  for (const profil of PROFILS) for (const [fam, packs] of FAMILLES) {
    const c = await O.ouvrir({ profil, nuit: NUIT, qui: 'marc', packs }), p = c.p, t = profil + (NUIT ? ' nuit' : '') + ' ' + fam; p.on('dialog', d => d.dismiss().catch(() => {}));
    const tap = async sel => { const l = p.locator(sel).locator('visible=true').first(); if (!(await l.count())) return false; await L.toucher(c, l); await L.calme(p, 400); return true; };
    const lire = async ch => { await L.calme(p, 250); let m = await p.evaluate(MESURE(ch.sel, LARG[profil])); const nom = t + ' · ' + ch.n;
      if (!m.absent && m.val !== '') { const avant = m.val; await p.fill(ch.sel, ''); await L.calme(p, 150); m = await p.evaluate(MESURE(ch.sel, LARG[profil])); notes.push(t + ' : « ' + ch.n + ' » arrive PRÉREMPLI (« ' + avant.slice(0, 40) + ' ») : l\'indication ne se voit qu\'une fois le champ vidé — mesurée alors'); }
      if (m.absent) { v(nom + ' : champ ouvert et visible (population)', false, m.cache ? 'caché' : 'introuvable à l\'écran'); return; }
      mesures++; const attendu = await p.evaluate(k => { try { const e = metiersEx(); return k in e ? e[k] : k; } catch (x) { return 'ERR'; } }, ch.cle);
      v(nom + ' : l\'indication affichée est celle que la table donne (« ' + m.ph + ' »)', m.ph === attendu, 'attendu « ' + attendu + ' »');
      v(nom + ' : l\'indication n\'est pas vide', m.ph.length > 3); v(nom + ' : le champ est vide (un exemple n\'est pas une valeur)', m.val === '', m.val);
      v(nom + ' tient dans son champ (« ' + m.ph + ' » : ' + m.txt + (m.multi ? ' mot le plus long, ' + m.lignes + ' ligne(s) sur ' + m.cap : '') + ' / place ' + m.place + ')', !m.coupe, JSON.stringify(m));
      v(nom + ' : le champ ne sort pas de l\'écran', m.droite - m.debord <= LARG[profil], JSON.stringify(m)); if (m.W > LARG[profil] + 1 && !notes.some(n => n.includes('déborde ' + ch.sel))) notes.push(t + ' : la page déborde (innerWidth ' + m.W + ' pour ' + LARG[profil] + ') à l\'écran de « ' + ch.n + ' » — défaut de mise en page voisin, hors exemples : la place du champ est jugée SANS ce débord (déborde ' + ch.sel + ')');
      if (!m.multi) { const k = ch.n; if (largMin[k] === undefined || m.place - m.txt < largMin[k].marge) largMin[k] = { marge: Math.round((m.place - m.txt) * 10) / 10, ph: m.ph, fam, profil }; }
      if (CAPT) { const f = '/tmp/claude-0/x/cap-ex/' + profil + (NUIT ? '-nuit' : '') + '-' + fam + '-' + ch.sel.replace(/[^a-z0-9]+/gi, '_').slice(0, 24) + '.png'; await p.evaluate(s => { const e = document.querySelector(s); e && e.scrollIntoView({ block: 'center' }); }, ch.sel); await L.calme(p, 200); await L.capture(c, f); } };
    const par = id => CHAMPS.find(x => x.sel === id);
    // 1 · contrat
    await L.aller(p, 'contrats'); v(t + ' : « nouveau contrat » s\'ouvre', await tap('[data-go="contrat-nouveau"]')); await lire(par('input[data-b="lieu"]')); await O.nettoyer(p);
    // 2 · devis
    await L.aller(p, 'devis'); v(t + ' : « nouveau devis » s\'ouvre', await tap('[data-dv="nouveau"]')); await lire(par('#dvn-objet')); await O.nettoyer(p);
    // 3-4-5 · comptabilité
    await L.aller(p, 'comptabilite'); v(t + ' : « nouvelle opération » s\'ouvre', await tap('[data-cx="nouveau"]')); v(t + ' : « facture client » s\'ouvre', await tap('[data-cx="facture"]')); await lire(par('#nf-d')); await O.nettoyer(p);
    await L.aller(p, 'comptabilite'); await tap('[data-cx="nouveau"]'); v(t + ' : « dépense » s\'ouvre', await tap('[data-cx="depense"]')); await lire(par('#dp-f')); await lire(par('#dp-o')); await O.nettoyer(p);
    // 8-10 · demande d'achat
    await L.aller(p, 'achats'); v(t + ' : « demande d\'achat » s\'ouvre', await tap('[data-axa="dem"]')); await lire(par('#ax-q')); await lire(par('#ax-p')); await O.nettoyer(p);
    // 11 · planning : enregistrer une vue
    await L.aller(p, 'planning'); await L.calme(p, 400); await tap('[data-plvue="multi"]'); await tap('[data-mpop="vues"]'); v(t + ' : « enregistrer la vue » s\'ouvre', await tap('[data-action="vueEnregistrer"]')); await lire(par('#vue-nom')); await O.nettoyer(p);
    // 12-13 · fiche client, onglet Appareils
    await L.aller(p, 'clients'); await L.calme(p, 300);
    const ouv = await p.evaluate(() => Object.keys(CLIENTS).find(x => CLIENTS[x].appareils && CLIENTS[x].appareils.length && !CLIENTS[x].archive) || ''); v(t + ' : un client avec appareils (population)', !!ouv);
    if (ouv) { await L.aller(p, 'client-x-' + ouv); await L.calme(p, 400); await tap('#contenu [data-onglet="appareils"], #contenu button:has-text("Appareils")'); v(t + ' : « ajouter un appareil » s\'ouvre', await tap('[data-action="clientAppForm"][data-n="-1"]')); await lire(par('#app-nom')); await lire(par('#app-det')); await O.nettoyer(p); }
    // 9 · création d'une intervention : recherche d'article
    await L.aller(p, 'interventions'); v(t + ' : « nouvelle intervention » s\'ouvre', await tap('[data-creer]')); await lire(par('input[data-cchamp="cpq"]')); await O.nettoyer(p);
    // 6-7 · espace client : la demande, puis la visite pour un devis qu'elle crée
    await p.evaluate(() => rlChanger('client', { cli: 'vp', ec: 'accueil', muet: true })); await L.calme(p, 600);
    v(t + ' : « demander une intervention » s\'ouvre', await tap('[data-ec="demande"]')); await lire(par('#ed-m'));
    await p.selectOption('#ed-t', 'Devis').catch(() => {}); await p.fill('#ed-m', 'Une demande de la sonde'); await tap('.panneau [data-ec="demandeok"]'); await L.calme(p, 500); await O.nettoyer(p);
    const vid = await p.evaluate(() => (INTS.find(i => i.origine === 'client' && i.type === 'Visite') || {}).id || ''); v(t + ' : la demande « devis » a créé une visite (population)', !!vid);
    if (vid) { await p.evaluate(h => rlChanger('patron', { h, muet: true }), 'inter-x-' + vid); await L.calme(p, 600); v(t + ' : « Planifier » la visite', await tap('[data-rl="placer|' + vid + '"]')); await lire(par('textarea[data-rlv^="besoin"]')); }
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c);
  }
  notes.push(mesures + ' exemples mesurés dans leur champ réel (' + PROFILS.join(', ') + (NUIT ? ', nuit' : ', jour') + ') ; population attendue : ' + (CHAMPS.length * FAMILLES.length * PROFILS.length));
  v('population : tous les champs de toutes les familles ont été mesurés', mesures === CHAMPS.length * FAMILLES.length * PROFILS.length, mesures + ' sur ' + CHAMPS.length * FAMILLES.length * PROFILS.length);
  Object.entries(largMin).forEach(([k, x]) => notes.push('plus juste · ' + k + ' : marge ' + x.marge + ' px (« ' + x.ph + ' », ' + x.fam + ')'));
  await L.fermer(); process.exit(O.bilan('exemples à ' + PROFILS.join('+'), ok, ko, notes));
})().catch(async e => { console.log('ERREUR ' + e.stack); try { await L.fermer(); } catch (x) {} process.exit(2); });
