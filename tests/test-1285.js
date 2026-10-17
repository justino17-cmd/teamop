/* ══ g15 · accueil#17 — « VERSION DU SYSTÈME : 10 » SUR UN MAC, PRÉSENTÉE COMME MESURÉE ══════════════════════
   La règle écrite au-dessus de `opPlatMesure` : la version de macOS NE SE LIT PAS depuis l'agent (Safari annonce
   « 10_15_7 » depuis Big Sur) ; on la demande à `userAgentData.getHighEntropyValues` — mais seulement quand c'est
   un VRAI Chromium qui répond. Un navigateur Chromium qui s'annonce « Safari » sur « Macintosh » (agent forcé :
   mode appareil des outils de développement, banc d'essai) répond avec sa propre plateforme (Linux…) : sa
   `platformVersion` ne décrit pas le Mac que l'agent prétend. Résultat mesuré : « 10 » affiché, `sur:'mesurée'`.
   Le doute rend 0 (« on ne sait pas »), jamais un faux numéro.

   Ce banc EXÉCUTE les vraies `opOS`, `opNavigateur`, `opSafariVer`, `opOSVer`, `opPlatHaute`, `opPlatMesure` et
   `carteAppareil` contre des `navigator` de bac à sable (Safari réel, Chrome réel, agent forcé, Windows…).   */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
console.log('\n── 1285 · 0. la population ──');
const NOMS = ['opAutonome', 'opOS', 'opNavigateur', 'opSafariVer', 'opOSVer', 'opPlatHaute', 'opPlatMesure', 'opPlatForce', 'opPlat', 'carteAppareil'];
const FONCTIONS = NOMS.map(n => bloc('function ' + n + '(){'));
vrai('les dix fonctions sont trouvées', FONCTIONS.every(f => f.length > 50), FONCTIONS.map(f => f.length));
const PLATS_BRUT = SRC.slice(SRC.indexOf('const PLATS={'), SRC.indexOf('};', SRC.indexOf('const PLATS={')) + 2);
vrai('PLATS est trouvé (dix rendus)', (PLATS_BRUT.match(/lbl:/g) || []).length === 10, (PLATS_BRUT.match(/lbl:/g) || []).length);
vrai('⛔ une seule définition de opPlatHaute', SRC.split('function opPlatHaute(').length - 1 === 1);

const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function jouer(ua, uad) {
  const ctx = { console, JSON, Math, Object, String, Promise, parseInt, isFinite, __applis: 0,
    navigator: { userAgent: ua, maxTouchPoints: 0, userAgentData: uad ? { platform: uad.platform, getHighEntropyValues: async () => ({ platformVersion: uad.pv }) } : undefined },
    window: {}, localStorage: { getItem: () => null } };
  vm.createContext(ctx);
  vm.runInContext(`${PLATS_BRUT}\nvar PLAT_CLE='elan_plat_force'; var _platHaute=null;
    function opPlatAppliquer(){ __applis++; }
    function esc(s){ return String(s); }
    ${FONCTIONS.join('\n')}`, ctx);
  ctx.opPlatHaute(); await new Promise(r => setTimeout(r, 10));
  return ctx;
}
const ligneVersion = ctx => { const h = ctx.carteAppareil(); const m = h.match(/Version du syst[^<]*<\/span><span class="frow-val">([^<]*)</); return m ? m[1] : null; };

(async () => {
  console.log('\n── 1285 · 1. un agent « Safari / Mac » qu\'un Chromium a forcé : on ne prétend pas savoir ──');
  { const W = await jouer(SAFARI_MAC, { platform: 'Linux', pv: '10.15.7' });
    const m = W.opPlatMesure();
    vrai('⛔ la version rendue est 0 (« on ne sait pas »), pas 10', m.version === 0, m);
    vrai('⛔ … et elle n\'est PAS présentée comme mesurée', m.sur !== 'mesurée' && /inconnue/.test(m.sur), m.sur);
    vrai('⛔ l\'écran des Paramètres dit « — inconnue… » au lieu de « 10 »', /^— inconnue/.test(ligneVersion(W) || ''), ligneVersion(W));
    vrai('… sans reposer les attributs pour rien', W.__applis === 0, W.__applis); }
  { const W = await jouer(SAFARI_MAC, { platform: 'macOS', pv: '14.5.0' });
    vrai('même un Chromium qui dit « macOS » mais s\'annonce Safari (pas de « Chrome/ ») est écarté', W.opPlatMesure().version === 0, W.opPlatMesure()); }

  console.log('\n── 2. contre-épreuves : ce qui se lit VRAIMENT se lit toujours ──');
  { const W = await jouer(CHROME_MAC, { platform: 'macOS', pv: '14.5.0' }); const m = W.opPlatMesure();
    vrai('un vrai Chrome sur Mac donne sa version, mesurée', m.version === 14 && m.sur === 'mesurée' && ligneVersion(W) === '14', [m, ligneVersion(W)]);
    vrai('… et les attributs sont reposés', W.__applis === 1, W.__applis); }
  { const W = await jouer(CHROME_WIN, { platform: 'Windows', pv: '15.0.0' }); const m = W.opPlatMesure();
    vrai('un vrai Chrome sur Windows : 15 = Windows 11, mesuré', m.version === 15 && m.sur === 'mesurée', m); }
  { const W = await jouer(CHROME_MAC, { platform: 'Windows', pv: '15.0.0' });
    vrai('Chrome « Mac » dont l\'API répond « Windows » : contradiction, on ne prétend pas savoir', W.opPlatMesure().version === 0, W.opPlatMesure()); }
  { const W = await jouer(SAFARI_MAC, null); const m = W.opPlatMesure();
    vrai('un vrai Safari (pas d\'userAgentData) : 0, « inconnue (le navigateur ne la donne pas) »', m.version === 0 && /le navigateur ne la donne pas/.test(m.sur) && /^— inconnue/.test(ligneVersion(W)), [m, ligneVersion(W)]); }
  { const W = await jouer(SAFARI_IOS, null); const m = W.opPlatMesure();
    vrai('iPhone : la version vient de l\'agent (18), mesurée — inchangé', m.version === 18 && m.sur === 'mesurée', m); }

  console.log('\n══ test-1285 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
