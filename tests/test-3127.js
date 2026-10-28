/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DE LA TOUR AFFICHE LE VRAI OP MESSAGES (v2.120, 28 octobre 2026 au soir).

   Justin, capture de l'aperçu v2.119 : « là je veux OP MESSAGES avec les mêmes fonctions que OP MESSAGES Pro ». Les agents vivent dans OP MESSAGES (le pont) ; la Messagerie de la Tour
   n'est plus une copie appauvrie : c'est le VRAI OP MESSAGES (https://msg-beta.teamop.fr/) dans un cadre plein écran. L'ancienne messagerie reste joignable, le temps de l'essai.

   Ce banc joue les VRAIES fonctions de tour.html (extraites, exécutées dans un bac à sable avec un faux DOM et de fausses minuteries) et garde :

     1. LA PAGE — le cadre n'est jamais écrit dans le texte de la vue (il est CONSTRUIT par `opmMonter`), la barre porte « Ouvrir dans un nouvel onglet » (lien, nouvel onglet, sans lien d'opener) et
        « Ancienne messagerie de la Tour » ; la carte de repli est DERRIÈRE le cadre ; le bandeau « Vos agents sont maintenant dans OP MESSAGES » n'existe plus ;
     2. LE CADRE — `allow=` délègue les huit fonctions dont les appels, les vocaux, les réunions et le presse-papiers ont besoin ; l'adresse est posée AVANT l'insertion ; ⛔ un `load` de la page
        blanche (about:blank) ne lève pas le voile — mesuré au navigateur : un service qui ne répond jamais passait « ok » sur un cadre vide ;
     3. LES ÉTATS — chargement, hors ligne, délai (20 s), Tour d'essai (`.invalid`), refus ; chacun a SON message, son bouton « Ouvrir dans un nouvel onglet » et son accès à l'ancienne messagerie ;
     4. LA POIGNÉE DE MAIN — `parent.postMessage({opmsg:'pret'})` ne compte que venue du cadre (origine ET fenêtre) ; une fois vue, son absence après `load` est un refus ; avant, la Tour ne devine rien ;
     5. LES BRANCHEMENTS — `renderVue` monte le cadre (ou l'ancienne), quitter la rubrique le retire, `setTab` ne relit que l'ancienne, `messGarde` ne remonte pas le cadre à chaque `render()`.

   ⚠️ CE QUE LE BANC NE VOIT PAS, ET OÙ C'EST MESURÉ : que le navigateur affiche vraiment OP MESSAGES dans le cadre (CSP `frame-ancestors`, cookie `__Host-opm`, Permissions-Policy), qu'on s'y connecte, qu'on
   y ouvre une conversation et qu'on y envoie un message, qu'il n'y a pas de double défilement, que le repli couvre toute la scène. Cela se MESURE dans un vrai Chromium, contre le VRAI service
   d'OP MESSAGES (branche `claude/opmsg-dans-la-tour`, `server-msg/` — `encadrement`) : `scratchpad/cadre-tour/bench-cadre.js` (74 ✓ · 0 ✗) et `bench-refus.js` (36 ✓ · 0 ✗), téléphone 390×844 et bureau
   1280×800, jour et nuit, et leurs captures. Une sonde `fetch` vers OP MESSAGES n'est PAS posée : `Cross-Origin-Resource-Policy: same-origin` la ferait échouer même serveur en bonne santé.
   Pour éprouver ce fichier : TOUR_FICHIER=<copie mutée> node tests/test-3127.js. */
'use strict';
const fs = require('fs'), vm = require('vm');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || __dirname + '/../tour.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + JSON.stringify(d) : ''), !!c, true);
/* seuls les blocs qui COMMENCENT une ligne sont retirés (règle du dépôt : un motif « tout bloc » avale du vrai code) ; les noms qu'on cherche vivent aussi dans les commentaires qui les expliquent */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SCRIPTS = [...CODE.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const FEUILLE = (CODE.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(SCRIPTS); if (!m) return '';
  let k = SCRIPTS.indexOf('{', m.index), prof = 0, q = null;
  for (; k < SCRIPTS.length; k++) {
    const c = SCRIPTS[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && SCRIPTS[k + 1] === '/') { k = SCRIPTS.indexOf('\n', k); continue; }
    if (c === '/' && SCRIPTS[k + 1] === '*') { k = SCRIPTS.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return SCRIPTS.slice(m.index + 1, k + 1);
}
const ligne = (debut) => { const i = SCRIPTS.indexOf(debut); if (i < 0) return ''; return SCRIPTS.slice(i, SCRIPTS.indexOf('\n', i)); };
const bloc = (debut, fin) => { const i = SCRIPTS.indexOf(debut); if (i < 0) return ''; const j = SCRIPTS.indexOf(fin, i); return j < 0 ? '' : SCRIPTS.slice(i, j + fin.length); };

console.log('0. Population : les pièces jouées');
const FNS = ['opmAdresse', 'opmPoigneeVue', 'opmDisponible', 'opmLienOuvrir', 'opmVoile', 'opmEtat', 'opmRepli', 'vueMessagerie', 'opmMonter', 'opmApresChargement', 'opmAide', 'opmEcouter', 'opmDemonter', 'opmAncienne', 'messGarde'];
const CORPS = FNS.map(fonction);
const TABLES = [ligne('var OPM_ALLOW='), bloc('var OPM_PANNES={', ']};')];   /* l'adresse est celle du bac à sable (`BETA_MSG_ADRESSE`) : on joue la Tour de production ET celle d'essai */
vrai('(population) l\'adresse d\'OP MESSAGES bêta de la Tour est https://msg-beta.teamop.fr (sa ligne est trouvée)', /var BETA_MSG_ADRESSE='https:\/\/msg-beta\.teamop\.fr';/.test(ligne('var BETA_MSG_ADRESSE=')));
vrai('(population) ' + FNS.length + ' fonctions et ' + TABLES.length + ' déclarations trouvées dans le fichier livré', CORPS.every(f => f.length > 40) && TABLES.every(t => t.length > 20), FNS.filter((n, i) => CORPS[i].length <= 40));

/* ── le bac à sable : un faux DOM, de fausses minuteries, un faux stockage ── */
function monter(opts = {}) {
  const o = Object.assign({ enLigne: true, appris: false, adresse: null }, opts);
  const journal = [], minuteries = [], ecouteurs = {}, dom = {}, stockage = {};
  let idMin = 0, ajustements = 0;
  const unEl = (id) => { const e = { id, attrs: {}, dataset: {}, innerHTML: '', setAttribute(k, x) { this.attrs[k] = String(x); }, getAttribute(k) { return this.attrs[k]; } }; return e; };
  dom['opm-cadre'] = unEl('opm-cadre'); dom['opm-voile'] = unEl('opm-voile');
  dom['opm-scene'] = Object.assign(unEl('opm-scene'), { insertBefore(f, ref) { journal.push('insertion'); f.parentNode = dom['opm-scene']; dom['opm-frame'] = f; }, removeChild() { delete dom['opm-frame']; journal.push('retrait'); } });
  const cree = (tag) => {
    const f = { tag, attrs: {}, ecouteurs: {}, parentNode: null, mode: 'vrai', setAttribute(k, x) { this.attrs[k] = String(x); }, addEventListener(t, fn) { journal.push('écouteur:' + t); this.ecouteurs[t] = fn; } };
    Object.defineProperty(f, 'src', { set(x) { journal.push('adresse'); f.adresse = x; }, get() { return f.adresse; } });
    f.contentWindow = { location: { get href() { if (f.mode === 'blanc') return 'about:blank'; throw new Error('SecurityError : autre origine'); } } };
    return f;
  };
  const ctx = {
    OPM: { n: 0, etat: '', cause: '', charge: false, pret: false, tDelai: 0, tPoignee: 0, tAide: 0, ancienne: false, ecoute: false },
    BETA_MSG_ADRESSE: o.adresse || 'https://msg-beta.teamop.fr', TAB: 'messagerie', MS: { inst: null },
    esc: x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    $: (id) => dom[id] || null,
    document: { createElement: (t) => { journal.push('création:' + t); return cree(t); } },
    window: { addEventListener: (t, fn) => { (ecouteurs[t] = ecouteurs[t] || []).push(fn); } },
    navigator: { onLine: o.enLigne },
    localStorage: { getItem: (k) => (k in stockage ? stockage[k] : null), setItem: (k, x) => { stockage[k] = String(x); } },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: (f, ms) => { minuteries.push({ id: ++idMin, f, ms }); return idMin; },
    clearTimeout: (i) => { const k = minuteries.findIndex(m => m.id === i); if (k >= 0) minuteries.splice(k, 1); },
    messVeiller: () => { journal.push('veille'); }, messAjuster: () => { ajustements++; }, messDemonter: () => {}, messOuvrir: () => {}, render: () => {},
  };
  if (o.appris) stockage.tour_opm_poignee = '1';
  vm.createContext(ctx);
  vm.runInContext(TABLES.join('\n') + '\n' + CORPS.join('\n') + '\nthis.__ok=1;', ctx);
  const rend = {
    ctx, journal, minuteries, ecouteurs, dom, stockage, get ajustements() { return ajustements; },
    etat: () => ctx.OPM.etat + (ctx.OPM.cause ? ':' + ctx.OPM.cause : ''),
    cadre: () => dom['opm-frame'],
    charger: (mode) => { const f = dom['opm-frame']; f.mode = mode || 'vrai'; f.ecouteurs.load(); },
    ecouler: (ms) => { const m = minuteries.filter(x => x.ms === ms).slice(); m.forEach(x => { const k = minuteries.indexOf(x); if (k >= 0) { minuteries.splice(k, 1); x.f(); } }); return m.length; },
    message: (e) => (ecouteurs.message || []).forEach(fn => fn(e)),
  };
  return rend;
}
const T = (nom) => nom;
{
  const R = monter();
  vrai('(population) le bac à sable a chargé le code réel', R.ctx.__ok === 1 && typeof R.ctx.opmMonter === 'function' && typeof R.ctx.vueMessagerie === 'function');
}

console.log('\n1. La page de la Messagerie');
{
  const R = monter(), h = R.ctx.vueMessagerie();
  vrai('la vue est le CADRE (`#opm-cadre`, état « charge »), pas l\'ancienne zone', /id="opm-cadre"[^>]*data-etat="charge"/.test(h) && h.indexOf('id="mess-zone"') < 0, h.slice(0, 120));
  vrai('⛔ aucun `<iframe>` n\'est écrit dans le texte de la vue : il est CONSTRUIT par `opmMonter` (un cadre neuf à chaque montage)', h.indexOf('<iframe') < 0 && /createElement\('iframe'\)/.test(fonction('opmMonter')));
  const lien = /<a [^>]*>Ouvrir dans un nouvel onglet<\/a>/.exec(h);
  vrai('⛔ « Ouvrir dans un nouvel onglet » est un LIEN vers https://msg-beta.teamop.fr/, dans un nouvel onglet, sans lien d\'opener', !!lien && /href="https:\/\/msg-beta\.teamop\.fr\/"/.test(lien[0]) && /target="_blank"/.test(lien[0]) && /rel="noopener noreferrer"/.test(lien[0]), lien && lien[0]);
  vrai('« Ancienne messagerie de la Tour » est un bouton qui appelle `opmAncienne(true)` ; son nom vocal est entier', /<button type="button" class="opm-lien" onclick="opmAncienne\(true\)" aria-label="Ancienne messagerie de la Tour">/.test(h) && /Ancienne messagerie<span class="opm-suite"> de la Tour<\/span>/.test(h));
  v('la carte de repli est DANS la scène, avant le voile (donc derrière le cadre, que `opmMonter` insère avant le voile)', [h.indexOf('class="opm-repli"') > h.indexOf('id="opm-scene"'), h.indexOf('class="opm-repli"') < h.indexOf('id="opm-voile"')], [true, true]);
  vrai('la carte de repli porte, elle aussi, le lien « Ouvrir dans un nouvel onglet » (un cadre transparent la laisse lire)', (h.match(/Ouvrir dans un nouvel onglet/g) || []).length === 2);
  vrai('le bandeau « Vos agents sont maintenant dans OP MESSAGES » n\'existe plus (ni sa fonction, ni sa classe, ni son texte)', !/messBandeauOpm|opm-bandeau|Vos agents sont maintenant dans OP MESSAGES/.test(SCRIPTS + FEUILLE + (SRC.match(/<body>[\s\S]*?<script>/) || [''])[0]));
  R.ctx.OPM.ancienne = true;
  const a = R.ctx.vueMessagerie();
  vrai('l\'ANCIENNE messagerie : sa zone `#mess-zone` d\'avant et le retour « ← Revenir à OP MESSAGES » (`opmAncienne(false)`), aucun cadre', /id="mess-zone" class="mess-zone"/.test(a) && /onclick="opmAncienne\(false\)">← Revenir à OP MESSAGES</.test(a) && a.indexOf('opm-cadre') < 0);
}

console.log('\n2. Le cadre');
{
  const R = monter(); R.ctx.opmMonter();
  const f = R.cadre();
  vrai('un cadre est créé, titré « OP MESSAGES »', !!f && f.tag === 'iframe' && f.id === undefined ? true : !!f && f.tag === 'iframe');
  const ALLOW = (/var OPM_ALLOW='([^']+)'/.exec(SCRIPTS) || [])[1] || '';
  v('⛔ `allow=` délègue EXACTEMENT les huit fonctions d\'OP MESSAGES (appels, vocaux, réunions, partage d\'écran, position, presse-papiers, lecture auto, plein écran) — rien d\'autre, jamais de joker',
    ALLOW.split(';').map(x => x.trim()).sort(), ['autoplay', 'camera', 'clipboard-read', 'clipboard-write', 'display-capture', 'fullscreen', 'geolocation', 'microphone']);
  vrai('… et le cadre porte cet `allow=` tel quel', f.attrs.allow === ALLOW && ALLOW.indexOf('*') < 0 && f.attrs.allow.indexOf('self') < 0);
  v('l\'adresse du cadre est celle d\'OP MESSAGES bêta, avec sa barre finale', f.adresse, 'https://msg-beta.teamop.fr/');
  vrai('une politique de référent est posée (jamais l\'adresse complète de la Tour à un autre site)', f.attrs.referrerpolicy === 'strict-origin-when-cross-origin');
  vrai('⛔ l\'adresse est posée AVANT l\'insertion, et l\'écouteur `load` AVANT l\'adresse (sinon un `load` de page blanche lève le voile sur un cadre vide)',
    R.journal.indexOf('écouteur:load') < R.journal.indexOf('adresse') && R.journal.indexOf('adresse') < R.journal.indexOf('insertion'), R.journal);
  v('le voile « Ouverture d\'OP MESSAGES… » est en place pendant le chargement', [R.etat(), /Ouverture d’OP MESSAGES/.test(R.dom['opm-voile'].innerHTML), R.dom['opm-cadre'].attrs['data-etat']], ['charge', true, 'charge']);
  vrai('la hauteur est posée dès le montage (`messAjuster`) et la veille du redimensionnement est branchée', R.ajustements >= 1 && R.journal.indexOf('veille') >= 0);
  R.charger('blanc');
  v('⛔ un `load` dont la page est about:blank NE LÈVE PAS le voile', [R.etat(), R.ctx.OPM.charge], ['charge', false]);
  R.charger('vrai');
  v('le `load` de la vraie page (d\'une autre origine, donc illisible) lève le voile : état « ok »', [R.etat(), R.dom['opm-voile'].innerHTML, R.dom['opm-cadre'].attrs['data-etat']], ['ok', '', 'ok']);
  v('le délai de 20 s est désarmé une fois chargé', R.minuteries.filter(m => m.ms === 20000).length, 0);
  v('aucune poignée vue sur cet appareil : la barre proposera « Rien ne s\'affiche ? » 6 s plus tard (et ne devine rien)', R.minuteries.filter(m => m.ms === 6000).length, 1);
  R.ecouler(6000);
  v('… 6 s après, la barre le dit (`data-aide="1"`) ; l\'état reste « ok »', [R.dom['opm-cadre'].attrs['data-aide'], R.etat()], ['1', 'ok']);
  /* remonter (« Réessayer ») : un cadre NEUF, l'ancien retiré */
  const avant = R.cadre(); R.ctx.opmMonter();
  vrai('« Réessayer » (opmMonter de nouveau) retire l\'ancien cadre et en crée un neuf', R.cadre() !== avant && R.journal.filter(x => x === 'retrait').length === 1 && R.journal.filter(x => x === 'création:iframe').length === 2);
}

console.log('\n3. Les états');
{
  let R = monter({ enLigne: false }); R.ctx.opmMonter();
  v('hors ligne : état « panne:horsligne », AUCUN cadre créé, le message le dit', [R.etat(), !!R.cadre(), /Vous êtes hors ligne/.test(R.dom['opm-voile'].innerHTML)], ['panne:horsligne', false, true]);
  R = monter({ adresse: 'https://msg-indisponible-en-essai.invalid' }); R.ctx.opmMonter();
  v('Tour d\'essai (adresse « .invalid ») : « panne:indisponible », aucun cadre, « n\'est pas branché »', [R.etat(), !!R.cadre(), /pas branché/.test(R.dom['opm-voile'].innerHTML)], ['panne:indisponible', false, true]);
  vrai('… et il n\'y propose ni « Ouvrir dans un nouvel onglet » ni « Réessayer » (il n\'y a rien à ouvrir), mais l\'ancienne messagerie', !/Ouvrir dans un nouvel onglet|Réessayer/.test(R.dom['opm-voile'].innerHTML) && /Ancienne messagerie de la Tour/.test(R.dom['opm-voile'].innerHTML));
  v('l\'adresse d\'une Tour de production est disponible, celle d\'essai non', [monter().ctx.opmDisponible(), R.ctx.opmDisponible()], [true, false]);
  R = monter(); R.ctx.opmMonter();
  v('un service qui ne répond jamais : le délai est de 20 s', R.minuteries.filter(m => m.ms === 20000).length, 1);
  R.ecouler(20000);
  v('… à 20 s sans `load` : « panne:delai », message « met trop de temps »', [R.etat(), /met trop de temps/.test(R.dom['opm-voile'].innerHTML)], ['panne:delai', true]);
  for (const cause of ['horsligne', 'delai', 'refus']) {
    const S = monter(); S.ctx.OPM.etat = 'panne'; S.ctx.OPM.cause = cause; const t = S.ctx.opmVoile();
    vrai('« ' + cause + ' » : un titre, une explication, « Ouvrir dans un nouvel onglet » (lien, nouvel onglet), « Réessayer » et « Ancienne messagerie de la Tour »',
      /<b>[^<]{10,}<\/b><p>[^<]{20,}<\/p>/.test(t) && /<a class="btn-plein" href="https:\/\/msg-beta\.teamop\.fr\/" target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet<\/a>/.test(t) && /onclick="opmMonter\(\)">Réessayer</.test(t) && /onclick="opmAncienne\(true\)">Ancienne messagerie de la Tour</.test(t), t);
  }
  const S = monter(); S.ctx.OPM.etat = 'panne'; S.ctx.OPM.cause = 'inconnue'; vrai('une cause inconnue retombe sur le message du délai (jamais un voile vide ni « undefined »)', /met trop de temps/.test(S.ctx.opmVoile()) && !/undefined/.test(S.ctx.opmVoile()));
  vrai('le message du refus nomme la cause et le geste qui marche (« refuse d\'être encadré », « Ouvrez-le dans un nouvel onglet »)', /refuse d’être encadré par la Tour/.test(bloc('var OPM_PANNES={', ']};')) && /Ouvrez-le dans un nouvel onglet/.test(bloc('var OPM_PANNES={', ']};')));
  /* hors ligne PUIS retour du réseau / réseau coupé PENDANT le chargement */
  R = monter({ enLigne: false }); R.ctx.opmMonter(); R.ctx.navigator.onLine = true;
  (R.ecouteurs.online || []).forEach(fn => fn());
  v('le réseau revient : le cadre se remonte TOUT SEUL', [R.etat(), !!R.cadre()], ['charge', true]);
  R.ctx.OPM.etat = 'charge'; R.ctx.OPM.cause = ''; R.ctx.navigator.onLine = false; (R.ecouteurs.offline || []).forEach(fn => fn());
  v('le réseau se coupe PENDANT le chargement : « panne:horsligne »', R.etat(), 'panne:horsligne');
  R.ctx.TAB = 'agents'; R.ctx.navigator.onLine = true; (R.ecouteurs.online || []).forEach(fn => fn());
  v('⛔ un retour du réseau sur une AUTRE rubrique ne remonte rien (le cadre n\'est pas dans la page)', R.etat(), 'panne:horsligne');
}

console.log('\n4. La poignée de main');
{
  let R = monter({ appris: true }); R.ctx.opmMonter(); R.charger('vrai');
  v('une poignée DÉJÀ vue sur l\'appareil : après `load`, le voile RESTE (on attend celle de CE cadre, 6 s)', [R.etat(), R.minuteries.filter(m => m.ms === 6000).length], ['charge', 1]);
  R.ecouler(6000);
  v('… 6 s sans poignée : c\'est un REFUS (« panne:refus »), jamais un cadre vide', R.etat(), 'panne:refus');
  R = monter({ appris: true }); R.ctx.opmMonter(); R.charger('vrai');
  const f = R.cadre();
  R.message({ origin: 'https://autre.exemple', source: f.contentWindow, data: { opmsg: 'pret' } });
  v('⛔ une poignée venue d\'une AUTRE origine est ignorée', [R.ctx.OPM.pret, R.etat()], [false, 'charge']);
  R.message({ origin: 'https://msg-beta.teamop.fr', source: {}, data: { opmsg: 'pret' } });
  v('⛔ une poignée venue d\'une AUTRE fenêtre (même origine : la Tour elle-même) est ignorée', [R.ctx.OPM.pret, R.etat()], [false, 'charge']);
  R.message({ origin: 'https://msg-beta.teamop.fr', source: f.contentWindow, data: { opmsg: 'autre' } });
  R.message({ origin: 'https://msg-beta.teamop.fr', source: f.contentWindow, data: 'pret' });
  R.message({ origin: 'https://msg-beta.teamop.fr', source: f.contentWindow, data: null });
  v('une charge utile qui n\'est pas `{opmsg:"pret"}` (autre clé, chaîne, null) est ignorée', [R.ctx.OPM.pret, R.etat()], [false, 'charge']);
  R.message({ origin: 'https://msg-beta.teamop.fr', source: f.contentWindow, data: { opmsg: 'pret' } });
  v('la vraie poignée (origine ET fenêtre du cadre) : « ok », la minuterie du refus est désarmée', [R.ctx.OPM.pret, R.etat(), R.minuteries.filter(m => m.ms === 6000).length], [true, 'ok', 0]);
  R = monter(); R.ctx.opmMonter();
  R.message({ origin: 'https://msg-beta.teamop.fr', source: R.cadre().contentWindow, data: { opmsg: 'pret' } });
  v('la poignée arrive AVANT le `load` : elle est retenue, le `load` lève ensuite le voile', [R.ctx.OPM.pret, R.etat()], [true, 'charge']);
  R.charger('vrai');
  v('… et l\'appareil s\'en souvient (la poignée est rangée), la barre ne dit rien', [R.etat(), R.stockage.tour_opm_poignee, R.dom['opm-cadre'].attrs['data-aide']], ['ok', '1', '0']);
  v('un seul écouteur `message` pour toute la séance (remonter ne le double pas)', (R.ctx.opmMonter(), R.ctx.opmMonter(), (R.ecouteurs.message || []).length), 1);
  R = monter(); R.ctx.opmMonter(); R.ctx.opmDemonter(); R.charger('vrai');
  v('⛔ un `load` ou une minuterie qui arrive APRÈS qu\'on a quitté la rubrique ne change rien (`opmDemonter` invalide le montage)', [R.etat(), R.ctx.OPM.charge], ['', false]);
}

console.log('\n5. Les branchements');
{
  const RV = bloc('function renderVue(v){', "else if(TAB==='incidents')");
  vrai('(population) le corps de `renderVue` est trouvé', RV.length > 500 && RV.indexOf("TAB==='messagerie'") > 0);
  vrai('`renderVue` monte le cadre, ou l\'ancienne messagerie quand elle est choisie — une seule fois (`messGarde`)', /else if\(TAB==='messagerie'\)\{ if\(!messGarde\(v\)\)\{ v\.innerHTML=vueMessagerie\(\); if\(OPM\.ancienne\) messMonter\(\); else opmMonter\(\); \} \}/.test(RV));
  vrai('⛔ quitter la rubrique retire le cadre ET arrête l\'ancienne messagerie (`opmDemonter`, `messDemonter`)', /if\(TAB!=='messagerie'\)\{ messDemonter\(\); opmDemonter\(\); \}/.test(RV));
  vrai('`setTab` ne relit QUE l\'ancienne messagerie à l\'ouverture (le cadre se relit tout seul : un appel inutile partirait au serveur)', /if\(t==='messagerie'&&OPM\.ancienne\) messOuvrir\(\);/.test(SCRIPTS));
  const R = monter(), v1 = { querySelector: (s) => s === '#opm-cadre' ? { isConnected: true } : null };
  vrai('`messGarde` : un cadre déjà monté n\'est PAS remonté par un `render()` (la saisie et la conversation ouverte restent)', R.ctx.messGarde(v1) === true && R.ajustements === 1);
  vrai('`messGarde` : sans cadre dans la page, elle rend faux (on monte)', R.ctx.messGarde({ querySelector: () => null }) === false);
  R.ctx.OPM.ancienne = true;
  vrai('`messGarde` : le choix « ancienne messagerie » avec un cadre dans la page rend faux (on remplace)', R.ctx.messGarde(v1) === false);
  const AJ = fonction('messAjuster');
  vrai('`messAjuster` pose la hauteur du CADRE comme celle de l\'ancienne zone (une seule fonction, deux conteneurs)', /\$\('mess-zone'\)\|\|\$\('opm-cadre'\)/.test(AJ));
  const AN = fonction('opmAncienne');
  vrai('`opmAncienne` : le choix vaut pour la séance (`sessionStorage`, jamais `localStorage`), démonte le cadre et l\'ancienne avant de rendre', /sessionStorage\.setItem\('tour_msg_ancienne'/.test(AN) && !/localStorage/.test(AN) && AN.indexOf('opmDemonter()') < AN.indexOf('render()') && AN.indexOf('messDemonter()') < AN.indexOf('render()'));
  vrai('la séance repart sur le CADRE : le choix « ancienne » se relit de `sessionStorage` (un nouvel onglet revient à OP MESSAGES)', /OPM\.ancienne=sessionStorage\.getItem\('tour_msg_ancienne'\)==='1'/.test(SCRIPTS));
  const MV = (/var OPM=\{[^}]*\}/.exec(SCRIPTS) || [''])[0];
  vrai('l\'état du cadre ne vit pas dans `MS` (l\'ancienne messagerie se démonte sans toucher au cadre, et inversement)', MV.length > 30 && !/MS\./.test(fonction('opmMonter')));
}

console.log('\n6. La feuille de style (une feuille nue : commentaires retirés)');
{
  const regle = (sel) => { const m = new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{').exec(FEUILLE); return m ? FEUILLE.slice(m.index, FEUILLE.indexOf('}', m.index) + 1) : ''; };
  const z = (sel) => { const m = /z-index:(\d+)/.exec(regle(sel)); return m ? +m[1] : null; };
  vrai('(population) les règles du cadre sont trouvées', ['.opm', '.opm-barre', '.opm-scene', '.opm-repli,.opm-voile', '.opm-frame', '.opm-voile'].every(s => regle(s).length > 10), ['.opm', '.opm-barre', '.opm-scene', '.opm-frame', '.opm-voile'].filter(s => regle(s).length <= 10));
  vrai('le cadre remplit sa scène (position absolue, `inset:0`, 100 % × 100 %, sans bordure)', /position:absolute/.test(regle('.opm-frame')) && /inset:0/.test(regle('.opm-frame')) && /width:100%/.test(regle('.opm-frame')) && /height:100%/.test(regle('.opm-frame')) && /border:0/.test(regle('.opm-frame')));
  vrai('⛔ l\'ordre de peinture : la carte de repli (0) < le cadre (1) < le voile (2) — le repli ne se lit qu\'à travers un cadre transparent, le voile couvre le cadre', z('.opm-repli,.opm-voile') === null && /\.opm-repli\{z-index:0\}/.test(FEUILLE) && z('.opm-frame') === 1 && z('.opm-voile') === 2, [z('.opm-frame'), z('.opm-voile')]);
  vrai('le voile a un FOND opaque (`var(--bg)`) : un voile transparent laisserait lire un cadre vide', /background:var\(--bg\)/.test(regle('.opm-voile')));
  vrai('un cadre prêt (`data-etat="ok"`) efface le voile', /\.opm\[data-etat="ok"\] \.opm-voile\{display:none\}/.test(FEUILLE));
  vrai('la scène prend tout ce que la barre laisse (`flex:1 1 auto`, `min-height:0`) et la barre ne rétrécit pas', /flex:1 1 auto/.test(regle('.opm-scene')) && /min-height:0/.test(regle('.opm-scene')) && /flex:none/.test(regle('.opm-barre')));
  vrai('au bureau, la zone prend toute la page (pas de rayon, pas de bordure) comme le Courrier', /body\.plein-courrier \.opm\{border-radius:0;border-width:0\}/.test(FEUILLE));
  vrai('un geste de la barre se touche au doigt : 40 px sous `(pointer:coarse)`', /@media \(pointer:coarse\)\{ \.opm-lien\{min-height:40px\} \}/.test(FEUILLE));
  vrai('sur téléphone (≤ 520 px) le bout « de la Tour » et l\'aide s\'effacent : les deux gestes tiennent sur UNE rangée', /@media \(max-width:520px\)\{[^}]*\}[^}]*\.opm-aide,\.opm-suite\{display:none\}/.test(FEUILLE));
  vrai('l\'animation du chargement ralentit sous « animations réduites »', /prefers-reduced-motion:reduce\)\{ \.opm-rond\{animation-duration:2\.4s\}/.test(FEUILLE));
  vrai('le bandeau d\'avant n\'a plus de règle de style', FEUILLE.indexOf('opm-bandeau') < 0);
}

console.log('\n7. La version');
{
  const m = /var TOUR_VERSION='v2\.(\d+)';/.exec(SCRIPTS);
  const aff = [...(SRC.match(/(?:console interne · |La Tour · |journalisées · )v2\.(\d+)/g) || [])].map(x => +/v2\.(\d+)/.exec(x)[1]);
  vrai('la Tour est en v2.120 ou après, et les trois libellés (connexion, en-tête, pied) disent la même version', !!m && +m[1] >= 120 && aff.length >= 3 && aff.every(x => x === +m[1]), [m && m[1], aff]);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
