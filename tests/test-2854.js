/* ══ test-2854 · LA TAILLE DU TEXTE SUIT LE TÉLÉPHONE (audit apple-design, point 4 ; partie Y) ═══════════════════════════════════
   Toute la typographie d'app.html est en px (2 157 tailles) et Safari ne fait grossir que la police du système : quelqu'un qui lit
   en gros caractères ne gagnait rien. Quand le facteur n'est pas 1, la page fait passer chaque taille en px par
   calc(… * var(--txt,1)) — les feuilles une fois, les styles en ligne par un observateur — ; à 1, rien ne bouge.
   Ce banc EXÉCUTE les vraies fonctions (txtReecrireCss, txtEnLigne, txtFacteur, txtSysteme, txtAppliquer) dans un bac à sable,
   relit la cascade (les barres gardent leur taille) et le câblage (au démarrage, après la plateforme ; le réglage dans
   Paramètres). La preuve dans la page : scratchpad/sonde-taille-texte.js (le mécanisme, puis chaque rubrique ×1 et ×1,35).     */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const i0 = CODE.indexOf("const TXT_CLE='elan_txt'"), i1 = CODE.indexOf('function setTxt(', i0);
const SRC = i0 < 0 || i1 < 0 ? '' : CODE.slice(i0, i1);

/* un bac à sable : un document minimal, un rangement, une plateforme */
function bac(o) {
  o = o || {};
  const attrs = {}, props = {}, styles = (o.styles || []).map(t => ({ textContent: t, dataset: {} }));
  const enLigne = (o.enLigne || []).map(fz => ({ style: { fontSize: fz } }));
  const obs = [];
  const racine = { getAttribute: k => (k === 'data-os' ? (o.os || 'android') : (k in attrs ? attrs[k] : null)), setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: k => { delete attrs[k]; },
    style: { setProperty: (k, v) => { props[k] = v; } } };
  const S = { Math, String, parseFloat, isFinite, Object,
    prefLocalLire: k => (k === 'elan_txt' ? (o.choix === undefined ? null : o.choix) : null),
    document: { documentElement: racine, body: { appendChild: () => {} },
      createElement: () => ({ style: {}, remove() {}, textContent: '' }),
      querySelectorAll: sel => (sel === 'style' ? styles : sel === '[style*="font-size"]' ? enLigne : []) },
    getComputedStyle: () => ({ fontSize: (o.systemePx || 17) + 'px' }),
    window: { CSS: { supports: (p, v) => !!o.webkit && p === 'font' && v === '-apple-system-body' } },
    MutationObserver: function (fn) { this.fn = fn; this.observe = (cible, opts) => { this.cible = cible; this.opts = opts; }; obs.push(this); } };
  S.CSS = S.window.CSS;
  vm.createContext(S); vm.runInContext(SRC.replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), S);
  return { S, attrs, props, styles, enLigne, obs };
}

console.log('\n── 2854 · 1. ce que devient une taille ──');
vrai('(population) le bloc de la taille du texte est trouvé', SRC.length > 800 && /function txtAppliquer\(/.test(SRC), SRC.length);
{ const { S } = bac();
  const cas = [
    ['.a{font-size:13px}', '.a{font-size:calc(13px * var(--txt,1))}'],
    ['.b{font-size: 12.5px !important;color:red}', '.b{font-size: calc(12.5px * var(--txt,1)) !important;color:red}'],
    ['.c{font-size:.5px}', '.c{font-size:calc(.5px * var(--txt,1))}'],
    ['.d{font:600 13px/1 ui-monospace}', '.d{font:600 13px/1 ui-monospace}'],
    ['.e{font-size:1.2em;line-height:13px;width:13px}', '.e{font-size:1.2em;line-height:13px;width:13px}'],
    ['.f{font-size:var(--fs)}', '.f{font-size:var(--fs)}'],
    ['@media (max-width:520px){.g{font-size:15px}}', '@media (max-width:520px){.g{font-size:calc(15px * var(--txt,1))}}'],
  ];
  for (const [a, b] of cas) vrai('« ' + a + ' » → « ' + b + ' »', S.txtReecrireCss(a) === b, S.txtReecrireCss(a));
  vrai('réécrire deux fois ne change plus rien (une taille déjà passée par calc() n’est plus en px nu)', S.txtReecrireCss(S.txtReecrireCss('.a{font-size:13px}')) === '.a{font-size:calc(13px * var(--txt,1))}');
  const el = (fz) => ({ style: { fontSize: fz } });
  const e1 = el('13px'), e2 = el('calc(13px * var(--txt,1))'), e3 = el('1.1em'), e4 = el('');
  [e1, e2, e3, e4].forEach(e => S.txtEnLigne(e));
  vrai('un style en ligne en px passe par la taille du texte ; calc, em et rien restent tels quels', e1.style.fontSize === 'calc(13px * var(--txt,1))' && e2.style.fontSize === 'calc(13px * var(--txt,1))' && e3.style.fontSize === '1.1em' && e4.style.fontSize === '', [e1, e2, e3, e4].map(e => e.style.fontSize));
  const feuille = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  const n = (feuille.match(/font-size\s*:\s*\d*\.?\d+px/g) || []).length, apres = S.txtReecrireCss(feuille);
  vrai('sur la vraie feuille : les ' + n + ' tailles en px passent toutes par calc(), et il n’en reste aucune', n > 700 && !/font-size\s*:\s*\d*\.?\d+px/.test(apres) && (apres.match(/calc\(\d*\.?\d+px \* var\(--txt,1\)\)/g) || []).length === n, n);
  vrai('… sans rien toucher d’autre (le texte, ces tailles mises à part, est identique)', apres.replace(/calc\((\d*\.?\d+px) \* var\(--txt,1\)\)/g, '$1') === feuille);
}

console.log('\n── 2854 · 2. le facteur : le réglage de l’appareil, borné ──');
for (const [o, att, t] of [
  [{ choix: '1' }, 1, '« Normale » : 1'], [{ choix: '1.12' }, 1.12, '« Grande » : 1,12'], [{ choix: '1.24' }, 1.24, '« Très grande » : 1,24'], [{ choix: '1.35' }, 1.35, '« La plus grande » : 1,35'],
  [{ choix: 'abc' }, 1, 'une valeur rangée inconnue vaut « Comme l’appareil » (ici, pas un iPhone : 1)'],
  [{ choix: 'abc', os: 'ios', webkit: true, systemePx: 21 }, 1.24, '⛔ … et sur un iPhone en grand (21 px), elle suit donc le téléphone : 1,24 (pas « inconnue » lue comme 1)'],
  [{ choix: null, os: 'ios', webkit: true, systemePx: 17 }, 1, 'iPhone, taille du système par défaut (17 px) : 1'],
  [{ choix: 'auto', os: 'ios', webkit: true, systemePx: 19 }, 1.12, 'iPhone, un cran au-dessus (19 px) : 1,12'],
  [{ choix: 'auto', os: 'ios', webkit: true, systemePx: 21 }, 1.24, 'iPhone, deux crans (21 px) : 1,24'],
  [{ choix: 'auto', os: 'ios', webkit: true, systemePx: 23 }, 1.35, 'iPhone, trois crans (23 px) : 1,35'],
  [{ choix: 'auto', os: 'ios', webkit: true, systemePx: 53 }, 1.35, '⛔ iPhone en taille d’accessibilité (53 px) : plafonné à 1,35 — au-delà, la mise en page ne tient plus'],
  [{ choix: 'auto', os: 'ios', webkit: true, systemePx: 14 }, 1, '⛔ iPhone en petite taille (14 px) : jamais sous 1 (un champ sous 16 px fait zoomer Safari)'],
  [{ choix: 'auto', os: 'android', webkit: true, systemePx: 21 }, 1, 'hors iPhone et iPad : 1 (Android grossit lui-même, le bureau a son zoom)'],
  [{ choix: 'auto', os: 'ios', webkit: false, systemePx: 21 }, 1, 'sans -apple-system-body (le navigateur ne le connaît pas) : 1'],
]) { const { S } = bac(o); vrai(t, S.txtFacteur() === att, S.txtFacteur()); }
{ const { S } = bac();
  vrai('les cinq choix : « Comme l’appareil » d’abord, puis des facteurs entre 1 et TXT_MAX', S.TXT_CHOIX.length === 5 && S.TXT_CHOIX[0][0] === 'auto' && S.TXT_CHOIX.slice(1).every(c => +c[0] >= 1 && +c[0] <= S.TXT_MAX) && S.TXT_MAX === 1.35, S.TXT_CHOIX); }

console.log('\n── 2854 · 3. txtAppliquer : rien à 1 ; au-dessus, une réécriture et un observateur, une seule fois ──');
{ const b = bac({ choix: '1', styles: ['.a{font-size:13px}'], enLigne: ['12px'] });
  const f = b.S.txtAppliquer();
  vrai('⛔ à 1 : --txt vaut 1, pas de data-txt, aucune feuille ni aucun style en ligne touchés, aucun observateur', f === 1 && b.props['--txt'] === '1' && !('data-txt' in b.attrs) && b.styles[0].textContent === '.a{font-size:13px}' && b.enLigne[0].style.fontSize === '12px' && !b.obs.length, { f, props: b.props, attrs: b.attrs, obs: b.obs.length }); }
{ const b = bac({ choix: '1.24', styles: ['.a{font-size:13px}', '.b{color:red}'], enLigne: ['12px'] });
  const f = b.S.txtAppliquer();
  vrai('à 1,24 : --txt et data-txt posés', f === 1.24 && b.props['--txt'] === '1.24' && b.attrs['data-txt'] === '1.24', { props: b.props, attrs: b.attrs });
  vrai('… les feuilles réécrites et marquées, les styles en ligne aussi', b.styles[0].textContent === '.a{font-size:calc(13px * var(--txt,1))}' && b.styles[0].dataset.txt === '1' && b.styles[1].dataset.txt === '1' && b.enLigne[0].style.fontSize === 'calc(12px * var(--txt,1))', b.styles.map(s => s.textContent));
  vrai('… un observateur sur tout le document : les ajouts, et l’attribut style seulement', b.obs.length === 1 && b.obs[0].opts.subtree && b.obs[0].opts.childList && b.obs[0].opts.attributes && JSON.stringify(b.obs[0].opts.attributeFilter) === '["style"]', b.obs.map(o => o.opts));
  const enfant = { style: { fontSize: '14px' } };
  const o = b.obs[0], ajoute = { nodeType: 1, tagName: 'DIV', style: { fontSize: '11px' }, querySelectorAll: () => [enfant] }, st = { nodeType: 1, tagName: 'STYLE', textContent: '.z{font-size:9px}', dataset: {} };
  o.fn([{ type: 'childList', addedNodes: [ajoute, st, { nodeType: 3 }] }, { type: 'attributes', target: { style: { fontSize: '10px' } } }]);
  vrai('l’observateur fait passer un élément ajouté, ses descendants et une feuille ajoutée', ajoute.style.fontSize === 'calc(11px * var(--txt,1))' && enfant.style.fontSize === 'calc(14px * var(--txt,1))' && st.textContent === '.z{font-size:calc(9px * var(--txt,1))}' && st.dataset.txt === '1', [ajoute.style.fontSize, enfant.style.fontSize, st.textContent]);
  b.S.txtAppliquer();
  vrai('rappelé (le réglage change encore) : ni seconde réécriture, ni second observateur', b.obs.length === 1, b.obs.length); }

console.log('\n── 2854 · 4. le câblage : les barres, le démarrage, le réglage ──');
{ const R = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const barres = R.filter(r => r.decls.some(d => d.p === '--txt' && d.v.trim() === '1'));
  const sels = barres.flatMap(r => r.sel.split(',').map(x => x.trim()));
  vrai('⛔ les trois barres (menu, barre du haut, onglets) gardent --txt:1, hors de tout média', ['.sidebar', '.topbar', '#tabbar'].every(x => sels.includes(x)) && barres.every(r => !r.media.length), barres.map(r => [r.sel, r.media])); }
vrai('au démarrage, la taille s’applique APRÈS la plateforme (data-os) et AVANT boot()', /opPlatAppliquer\(\); opPlatHaute\(\); \}catch\(e\)\{\}\s*applyTheme\(\);\s*try\{ txtAppliquer\(\); \}catch\(e\)\{\}\s*boot\(\);/.test(CODE));
vrai('forcer une plateforme réapplique la taille (data-os a pu changer)', /opPlatAppliquer\(\); try\{ txtAppliquer\(\); \}catch\(e\)\{\}/.test(CODE));
vrai('revenir sur l’application relit le réglage du téléphone, s’il est suivi', /visibilitychange',\(\)=>\{ if\(document\.visibilityState==='visible'&&txtChoix\(\)==='auto'\) txtAppliquer\(\); \}/.test(CODE));
{ const set = (CODE.match(/function setTxt\(k\)\{[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*/) || [''])[0];
  vrai('setTxt range sur l’appareil (prefLocal), PUIS applique, puis redessine les Paramètres', /prefLocal\(TXT_CLE,k\); txtAppliquer\(\);/.test(set) && set.indexOf('txtAppliquer()') < set.indexOf('views.parametres()'), set.slice(0, 160)); }
{ const app = (CODE.match(/<div class="txt-choix" role="radiogroup"[^\n]*/) || [''])[0];
  vrai('Paramètres › Apparence : un groupe de choix (radiogroup), un bouton radio par choix de TXT_CHOIX, coché selon txtChoix, qui appelle setTxt', /TXT_CHOIX\.map/.test(app) && /role="radio"/.test(app) && /aria-checked="\$\{txtChoix\(\)===k\}"/.test(app) && /onclick="setTxt\('\$\{k\}'\)"/.test(app), app.slice(0, 200)); }
{ const m = CODE.match(/function segTient\(g\)\{([\s\S]*?)\n\}/);
  const segTient = m ? new Function('g', 'getComputedStyle', m[1]) : null;
  const faux = (w, sw, pw, marge) => ({ marge: marge || 0, getBoundingClientRect: () => ({ width: w }), scrollWidth: sw, parentElement: { clientWidth: pw, marge: 0, pad: 16 } });
  const gcs = (e) => (e && e.pad !== undefined) ? { paddingLeft: '16', paddingRight: '16' } : { marginLeft: String(e.marge), marginRight: String(e.marge) };
  vrai('⛔ segTient lit le CONTENU : une boîte bornée à 328 px qui contient 336 px ne tient pas', !!segTient && segTient(faux(328, 336, 360), gcs) === false && segTient(faux(300, 300, 360), gcs) === true && segTient(faux(328, undefined, 360), gcs) === true,
    segTient && [segTient(faux(328, 336, 360), gcs), segTient(faux(300, 300, 360), gcs), segTient(faux(328, undefined, 360), gcs)]);
  vrai('⛔ … et ses propres marges : 300 px avec 16 px de chaque côté, dans 360 − 32 de rembourrage, ne tient pas (le sélecteur de Boxes au grand texte)', !!segTient && segTient(faux(300, 300, 360, 16), gcs) === false && segTient(faux(290, 290, 360, 0), gcs) === true,
    segTient && [segTient(faux(300, 300, 360, 16), gcs), segTient(faux(290, 290, 360, 0), gcs)]); }
{ const R = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const nav = R.find(r => /nav\.filters:not\(\.seg-on\)/.test(r.sel)), kp = R.find(r => /\[data-txt\] \.kpis/.test(r.sel));
  vrai('une rangée de destinations qui ne tient plus en segmenté passe à la ligne (ne défile pas hors de l’écran)', !!nav && nav.decls.some(d => d.p === 'flex-wrap' && /wrap/.test(d.v) && d.imp), nav && nav.decls);
  vrai('au grand texte, sur un téléphone, les chiffres clés prennent une colonne chacun', !!kp && kp.media.some(m => /max-width:\s*520px/.test(m)) && kp.decls.some(d => d.p === 'grid-template-columns' && /minmax\(0,\s*1fr\)/.test(d.v) && d.imp), kp && [kp.media, kp.decls]); }
vrai('le réglage est de L’APPAREIL : il ne voyage pas avec la fiche (hors de PREF_CLES)', /const PREF_CLES=\{[^}]*\}/.test(CODE) && !/txt/.test((CODE.match(/const PREF_CLES=\{[^}]*\}/) || [''])[0]));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
