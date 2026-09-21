/* ══════════════════════════════════════════════════════════════════════════════════════
   test-760 — LE FOND DE CARTE : JOUR / NUIT / SATELLITE

   Justin, 21 septembre 2026, capture à l'appui : « l'avoir en mode jour nuit satelite et
   tout ça serait bien », puis « pareil pour la carte des box ».

   Avant : UN interrupteur Plan ↔ Satellite, et la nuit se déduisait du thème. Impossible de
   garder une carte claire en mode nuit — ce que le terrain demande, parce qu'un écran sombre
   au soleil ne se lit pas.

   ⛔ CE BANC EXÉCUTE LES VRAIES FONCTIONS d'app.html. Relire le texte ne prouverait rien :
   c'est un ORDRE de décisions (choix rangé > choix en mémoire > thème) et un mélange de
   deux effets (l'URL des tuiles ET la classe d'assombrissement) — exactement le genre de
   câblage qu'une expression régulière lit très bien et qui ne marche pas.
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
  const suite = ['\nfunction ', '\nconst ', '\nlet ', '\nvar ', '\nviews.']
    .map(m => APP.indexOf(m, i + 10)).filter(x => x > 0).sort((a, b) => a - b)[0];
  return APP.slice(i, suite > 0 ? suite : i + 4000);
}
/* ⛔ [^\]]* s'arrête au PREMIER crochet fermant — or la table est un tableau de tableaux.
   Le motif rendait « introuvable » sur une table bien présente, et deux contrôles tombaient
   pour rien : un motif mal visé accuse le code d'un défaut qu'il n'a pas. */
const MAPF = (APP.match(/const MAP_FONDS=\[[\s\S]*?\];/) || [])[0];

console.log('\n══ 1. LES TROIS FONDS EXISTENT, ET ILS SONT TROIS ══\n');
vrai('la table MAP_FONDS est là', !!MAPF, 'introuvable');
vrai('… et elle porte Jour, Nuit et Satellite',
  !!MAPF && /'m','Jour'/.test(MAPF) && /'n','Nuit'/.test(MAPF) && /'s','Satellite'/.test(MAPF), MAPF);
vrai('⛔ l’ancien interrupteur à deux états a disparu des trois barres',
  !/_mapLayer==='m'\?'s':'m'/.test(APP));
vrai('⛔ le réglage est rangé sur le COMPTE, comme le thème et la langue',
  /PREF_CLES=\{[^}]*carte:'elan_carte'/.test(APP));

console.log('\n══ 2. CE QUE LES FONCTIONS FONT VRAIMENT ══\n');
{
  const bac = {
    rangement: {},
    localStorage: { getItem(k) { return this._d && k in this._d ? this._d[k] : null; },
                    setItem(k, v) { (this._d = this._d || {})[k] = String(v); },
                    removeItem(k) { if (this._d) delete this._d[k]; }, _d: {} },
    PREF_CLES: { theme: 'elan_theme', carte: 'elan_carte' },
    _theme: 'light',
    current: '', views: {},
  };
  bac.effectiveTheme = () => bac._theme;
  bac.prefEcrire = (c, v) => { bac.rangement[c] = v; };
  const src = [MAPF, corps('mapFond'), corps('setMapLayer'), corps('mapTiles')].join('\n');
  /* ⛔ Une tranche vide passe au vert sur tout : on prouve d'abord qu'on a trouvé les quatre. */
  vrai('les quatre morceaux sont extraits', !!MAPF && !!corps('mapFond') && !!corps('setMapLayer')
    && !!corps('mapTiles') && src.length > 400, src.length + ' caractères');
  let _mapLayer = null;
  const f = new Function('bac', `
    let _mapLayer=null;
    const {localStorage,PREF_CLES,effectiveTheme,prefEcrire}=bac;
    let current='', views={};
    ${src}
    return {mapFond,setMapLayer,mapTiles,MAP_FONDS,
            voir:()=>_mapLayer, poser:v=>{_mapLayer=v;}};
  `)(bac);

  /* ── le défaut : personne n'a choisi, on suit le thème ── */
  bac.localStorage._d = {}; f.poser(null); bac._theme = 'light';
  eq('sans choix, en thème jour, le fond est « m »', f.mapFond(), 'm');
  f.poser(null); bac._theme = 'dark';
  eq('sans choix, en thème nuit, le fond est « n »', f.mapFond(), 'n');

  /* ── un choix explicite l'emporte sur le thème, et c'est tout l'intérêt ── */
  f.poser(null); bac._theme = 'dark'; bac.localStorage.setItem('elan_carte', 'm');
  eq('⛔ un choix « Jour » TIENT même en thème nuit (lisibilité au soleil)', f.mapFond(), 'm');
  f.poser(null); bac._theme = 'light'; bac.localStorage.setItem('elan_carte', 'n');
  eq('⛔ … et un choix « Nuit » tient en thème jour', f.mapFond(), 'n');

  /* ── une valeur abîmée ne doit pas casser la carte ── */
  f.poser(null); bac._theme = 'light'; bac.localStorage.setItem('elan_carte', 'n’importe quoi');
  eq('une valeur inconnue retombe sur le thème', f.mapFond(), 'm');

  /* ── écrire : les DEUX rangements, et seulement des valeurs connues ── */
  bac.localStorage._d = {}; bac.rangement = {};
  f.setMapLayer('s');
  eq('setMapLayer range dans l’appareil', bac.localStorage.getItem('elan_carte'), 's');
  eq('… ET sur le compte (il suit l’utilisateur d’un appareil à l’autre)', bac.rangement.carte, 's');
  bac.localStorage._d = {}; bac.rangement = {};
  f.setMapLayer('bidon');
  eq('⛔ une valeur inconnue n’est pas rangée', bac.localStorage.getItem('elan_carte'), null);

  /* ── mapTiles : l'URL ET l'assombrissement, les deux effets ── */
  const joue = (fond) => {
    const dem = []; const pane = { classList: { c: new Set(),
      toggle(k, on) { on ? this.c.add(k) : this.c.delete(k); }, contains(k) { return this.c.has(k); } } };
    global.L = { tileLayer: (url, o) => ({ addTo() { dem.push({ url, o }); return this; } }) };
    f.poser(fond);
    f.mapTiles({ getPanes: () => ({ tilePane: pane }) });
    delete global.L;
    return { url: (dem[0] || {}).url || '', nuit: pane.classList.contains('tiles-night') };
  };
  const M = joue('m'), N = joue('n'), S = joue('s');
  vrai('« Jour » demande le plan Google', /lyrs=m&/.test(M.url), M.url);
  vrai('⛔ … et il n’est PAS assombri', M.nuit === false);
  vrai('« Nuit » demande le même plan', /lyrs=m&/.test(N.url), N.url);
  vrai('⛔ … mais il EST assombri (c’est là toute la différence)', N.nuit === true);
  vrai('« Satellite » demande la vue aérienne avec les libellés', /lyrs=s,h&/.test(S.url), S.url);
  vrai('⛔ … et le satellite n’est JAMAIS assombri (une photo noircie ne se lit plus)', S.nuit === false);
}

console.log('\n══ 3. LE SÉLECTEUR EST SUR LES DEUX CARTES, ET SUR LE PLANNING ══\n');
{
  const n = (APP.match(/\$\{mapFondBarre\(\)\}/g) || []).length;
  vrai('trois barres le portent : Carte interventions, Carte des box, Planning', n === 3, n + ' trouvée(s)');
  const barre = corps('mapFondBarre') || '';
  vrai('⛔ il réemploie le composant .chip du dépôt, il n’en invente pas un', /class="chip/.test(barre));
  vrai('⛔ la puce en cours est marquée « active », comme partout ailleurs', /\?' active'/.test(barre));
  vrai('… et elle l’annonce aussi aux lecteurs d’écran', /aria-pressed=/.test(barre));
}

console.log('\n═══ test-760 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
