/* ══════════════════════════════════════════════════════════════════════════════════════
   test-760 — LES TUILES DE LA CARTE : QUELLE IMAGE, ET QUELLE TEINTE

   ⚠️ CE BANC A CHANGÉ DE SUJET LE 22 SEPTEMBRE 2026, ET C'EST LA LEÇON QU'IL PORTE.
   Il gardait, depuis la veille, un sélecteur à TROIS choix — Jour / Nuit / Satellite —
   posé pour que le terrain puisse garder une carte claire de nuit. Justin l'a retiré le
   lendemain, capture à l'appui : « le mode jour et nuit de la carte c'est en fonction de
   l'appareil sélectionné dans les paramètres, je veux pas voir ces boutons ici. »
   Un banc qui garde une décision périmée est pire qu'un banc absent : il bloque la
   correction et il a l'air d'avoir raison. Il est donc RECENTRÉ, pas supprimé — ce qu'il
   couvre seul reste vrai et n'est gardé nulle part ailleurs.

   ⛔ Partage avec test-762, à ne pas rejouer ici :
   · l'AIGUILLAGE (quel fond pour quel thème, la préférence héritée, le voyage d'un
     appareil à l'autre, la barre à une seule pastille) → test-762 ;
   · les TUILES (quelle URL Google, et laquelle est assombrie) → ici.

   ⛔ CE BANC EXÉCUTE LA VRAIE `mapTiles` d'app.html. Relire le texte ne prouverait rien :
   c'est un mélange de deux effets — l'URL demandée ET la classe d'assombrissement — et le
   piège est qu'ils se ressemblent. Jour et nuit partagent EXACTEMENT la même image ; seule
   la teinte les sépare. C'est ce qui permet à `mapNuitSync()` de basculer sans rien
   reconstruire, et c'est donc une propriété à garder, pas un détail.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const eq = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

/* ── on extrait les fonctions réelles, sans les recopier ── */
function corps(nom) {
  const i = APP.indexOf('function ' + nom + '(');
  if (i < 0) return null;
  /* on s'arrête à la prochaine déclaration de premier niveau — jamais au milieu d'une
     accolade. La règle du dépôt : une tranche qui déborde rend un verdict faux. */
  const suite = ['\nfunction ', '\nconst ', '\nlet ', '\nvar ', '\nviews.', '\n/* ']
    .map(m => APP.indexOf(m, i + 10)).filter(x => x > 0).sort((a, b) => a - b)[0];
  return APP.slice(i, suite > 0 ? suite : i + 4000);
}

console.log('\n══ 1. LA DÉCISION DU 22 SEPTEMBRE, ÉCRITE DANS LE CODE ══\n');
{
  /* ⛔ On cherche du CODE sur un texte dont les commentaires de bloc en début de ligne sont
     retirés — ce dépôt nomme ses fonctions dans les commentaires qui les expliquent, et un
     motif qui tombe dedans garde une phrase, pas un comportement. */
  const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(NU));
  eq('⛔ plus de table MAP_FONDS : le jour et la nuit ne se choisissent plus à la main',
     (NU.match(/MAP_FONDS/g) || []).length, 0);
  eq('⛔ plus de setMapLayer à trois valeurs', (NU.match(/setMapLayer/g) || []).length, 0);
  eq('⛔ ni l’ancien mémo _mapLayer, qui figeait la bascule du soir',
     (NU.match(/_mapLayer/g) || []).length, 0);
  vrai('⛔ le seul choix restant est le satellite', /function setMapSat\(on\)\{/.test(NU));
  vrai('⛔ le réglage est rangé sur le COMPTE, comme le thème et la langue',
    /PREF_CLES=\{[^}]*carte:'elan_carte'/.test(NU));
}

console.log('\n══ 2. mapTiles : L’URL ET L’ASSOMBRISSEMENT, LES DEUX EFFETS ══\n');
{
  /* v747 : `mapSatOn` lit par `prefLocalLire` (la mémoire de repli d'un appareil plein — test-808) */
  const src = ['const _prefVue={};', corps('prefLocalLire'), corps('mapSatOn'), corps('mapFond'), corps('mapTiles')].join('\n');
  /* ⛔ Une tranche vide passe au vert sur tout : on prouve d'abord qu'on a trouvé les trois. */
  vrai('les trois morceaux sont extraits',
    !!corps('mapSatOn') && !!corps('mapFond') && !!corps('mapTiles') && src.length > 400,
    src.length + ' caractères');

  const bac = { _d: {}, _theme: 'light' };
  const f = new Function('bac', `
    const localStorage={ getItem:k=>(k in bac._d?bac._d[k]:null), setItem:(k,v)=>{bac._d[k]=String(v);} };
    const PREF_CLES={theme:'elan_theme',carte:'elan_carte'};
    const effectiveTheme=()=>bac._theme;
    ${src}
    return {mapFond,mapTiles,mapSatOn};
  `)(bac);

  /* On pilote le fond par ce qui le décide VRAIMENT — le thème et la préférence satellite —
     et non par une variable posée à la main : c'est le chemin que prend un vrai appareil. */
  const joue = (theme, sat) => {
    bac._theme = theme; bac._d = sat ? { elan_carte: 's' } : {};
    const dem = []; const pane = { classList: { c: new Set(),
      toggle(k, on) { on ? this.c.add(k) : this.c.delete(k); }, contains(k) { return this.c.has(k); } } };
    global.L = { tileLayer: (url, o) => ({ addTo() { dem.push({ url, o }); return this; } }) };
    f.mapTiles({ getPanes: () => ({ tilePane: pane }) });
    delete global.L;
    return { fond: f.mapFond(), url: (dem[0] || {}).url || '', nuit: pane.classList.contains('tiles-night'),
             n: dem.length, opts: (dem[0] || {}).o || {} };
  };
  const M = joue('light', false), N = joue('dark', false), S = joue('dark', true), SJ = joue('light', true);

  eq('population : chaque passage pose exactement une couche', [M.n, N.n, S.n, SJ.n], [1, 1, 1, 1]);
  eq('les trois fonds attendus sont bien joués', [M.fond, N.fond, S.fond, SJ.fond], ['m', 'n', 's', 's']);

  vrai('thème jour → le plan Google', /lyrs=m&/.test(M.url), M.url);
  vrai('⛔ … et il n’est PAS assombri', M.nuit === false);
  vrai('thème nuit → EXACTEMENT le même plan', /lyrs=m&/.test(N.url), N.url);
  eq('⛔ … au caractère près : c’est ce qui permet de basculer sans reconstruire', N.url, M.url);
  vrai('⛔ … seule la teinte les sépare', N.nuit === true);
  vrai('satellite → la vue aérienne AVEC les libellés (une photo sans nom de rue ne sert à rien)',
       /lyrs=s,h&/.test(S.url), S.url);
  vrai('⛔ … et le satellite n’est JAMAIS assombri, même en thème nuit', S.nuit === false);
  vrai('⛔ … ni en thème jour, évidemment', SJ.nuit === false);
  eq('… et le satellite rend la même image dans les deux thèmes', S.url, SJ.url);

  vrai('les quatre sous-domaines Google sont demandés (sinon un seul serveur encaisse tout)',
       (M.opts.subdomains || []).length === 4, JSON.stringify(M.opts.subdomains));
  vrai('l’attribution Google est portée (condition d’usage des tuiles)', /Google/.test(M.opts.attribution || ''));
}

console.log('\n══ 3. LE SÉLECTEUR EST SUR LES DEUX CARTES, ET SUR LE PLANNING ══\n');
{
  const n = (APP.match(/\$\{mapFondBarre\(\)\}/g) || []).length;
  vrai('trois barres le portent : Carte interventions, Carte des box, Planning', n === 3, n + ' trouvée(s)');
  const barre = corps('mapFondBarre') || '';
  vrai('population : le corps de la barre est trouvé', barre.length > 200, barre.length + ' caractères');
  vrai('⛔ il réemploie le composant .chip du dépôt, il n’en invente pas un', /class="chip/.test(barre));
  vrai('⛔ la puce en cours est marquée « active », comme partout ailleurs', /\?' active'/.test(barre));
  vrai('… et elle l’annonce aussi aux lecteurs d’écran', /aria-pressed=/.test(barre));
}

console.log('\n═══ test-760 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
