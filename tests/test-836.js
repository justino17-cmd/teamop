/* ⛔ CE QUE CE FICHIER GARDE — LES PAGES HORS DU SITE PARLENT LE THÈME DU SITE, JOUR ET NUIT.

   Justin, 27 septembre 2026 au soir, sur son iPhone : « au niveau des connexions ou création de compte, j'ai pas mon
   thème, pourquoi ? ». Le site (8 pages, scripts/site-marine.js) avait sa palette Marine, jour ET nuit, et son bouton
   ☀︎/☾ ; les dix pages vers lesquelles il envoie — le portail (espace.html), la connexion des équipes
   (connexion.html), le lien du courriel (reinit.html), la page où l'on paie (recap-abonnement.html), celle où Stripe
   renvoie (merci.html), les quatre pages juridiques et la page d'erreur (404.html) — gardaient chacune leur vieille
   feuille, toujours sombre, en DM Sans, Space Mono ou Courier, trois d'entre elles avec le logo VERT d'OP GESTION à
   côté de « TEAM OP ».

   Elles lisent désormais la palette du site dans vitrine/v2/theme.css (sous des noms à part, --m-…) et, comme le site,
   suivent l'appareil — sans bouton depuis le 29 septembre 2026 (Justin, capture de son iPhone à l'appui : « Sur le site
   je veux pas le bouton jour nuit, je veux que ça soit automatique »). Ce banc garde :
   1. que theme.css porte EXACTEMENT les valeurs de site.css, jeton par jeton, jour et nuit — deux palettes recopiées
      divergent toujours ;
   2. que chaque page embarque la tête du mode (couleur de la barre du navigateur, et l'ancien choix effacé) et la
      palette À L'IDENTIQUE de celles du site, et qu'AUCUNE ne porte plus de bouton ☀︎/☾, ni son script, ni un mode
      forcé — une seule page qui le garderait rendrait le mode d'un visiteur « collé » sur cette page-là ;
   3. qu'aucune n'a gardé l'ancien habillage (polices, fond animé, logo d'OP GESTION), ni une couleur écrite en dur
      hors des écarts NOMMÉS ci-dessous — une couleur en dur ne suit pas le mode ;
   4. que les copies d'aperçu (apercu/, scripts/apercu.sh) se renvoient les unes aux autres et au site d'aperçu, ne
      sont pas référencées, et ne sont pas en retard sur les pages qu'elles doublent ;
   5. qu'une page à la racine est SOIT exactement celle en service (vitrine/portail-v1.json, c'est l'état de main
      tant que Justin n'a pas dit « remplace »), SOIT au thème en entier — jamais à moitié ;
   6. que les pages juridiques gardent leurs numéros de ligne : server/index.js, les bancs, CLAUDE.md et les plans
      citent « mentions-legales.html:74 », « sous-traitance.html:162 »… Une tête plus longue d'une ligne les rendait
      toutes fausses d'un coup. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const PAGES = ['espace.html', 'connexion.html', 'reinit.html', 'recap-abonnement.html', 'merci.html', 'mentions-legales.html',
  'confidentialite.html', 'sous-traitance.html', 'registre-traitements.html', '404.html'];
const SITE = ['index', 'tarifs', 'applications', 'creer', 'elan', 'metiers', 'opmessages', 'pourquoi'];
const { TETE_MODE } = require(path.join(RACINE, 'scripts', 'site-marine.js'));
const THEME = lire('vitrine/v2/theme.css'), SITECSS = lire('vitrine/v2/site.css'), MODEJS = lire('vitrine/v2/mode.js'), SW = lire('sw.js');
const EMPREINTES = JSON.parse(lire('vitrine/portail-v1.json')).pages;
/* ⛔ le mode : par la FONCTION, dans le CODE, et les scripts EXÉCUTÉS — la même aide que test-835 (relecture adverse du
   29 septembre au soir : un bouton `class="mode on"`, un mode.js commenté par `//`, un script `type="text/plain"`, un
   second bloc de nuit, `color-scheme: light` passaient tous) */
const MS = require('./mode-site.js');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
/* un motif de banc vise du CODE : les blocs de commentaire qui COMMENCENT une ligne, et les lignes // (CLAUDE.md) */
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* ── les couleurs : hexadécimal ou rgb(a), rien d'autre (un analyseur qui devine lit faux, CLAUDE.md) ── */
function rgba(c) {
  c = String(c).trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(1); }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null;
}
const surFond = (c, f) => [0, 1, 2].map(i => c[i] * c[3] + f[i] * (1 - c[3])).concat(1);
const lum = c => { const k = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* ── les blocs de jetons d'une feuille : jour, et nuit par l'appareil (la nuit forcée n'existe plus : § 2) ── */
function jetons(css, prefixe) {
  const bloc = (re) => { const m = re.exec(css); if (!m) return null; const o = {};
    for (const d of m[1].matchAll(new RegExp('--' + prefixe + '([a-z-]+)\\s*:\\s*([^;]+);', 'g'))) o[d[1]] = d[2].trim(); return o; };
  return {
    jour: bloc(/(?:^|\n):root\s*\{([^}]*)\}/),
    nuitSys: bloc(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/),
  };
}

console.log('\n══ 1. LA PALETTE DU PORTAIL EST CELLE DU SITE, JETON PAR JETON ══\n');
/* un bloc introuvable rend {} : le banc le DIT (contrôle ci-dessous), il ne plante pas sur le suivant */
const jetonsSurs = (css, p) => { const j = jetons(css, p); return { jour: j.jour, nuitSys: j.nuitSys, trouves: !!(j.jour && j.nuitSys) }; };
const T0 = jetonsSurs(THEME, 'm-'), S0 = jetonsSurs(SITECSS, '');
const T = { jour: T0.jour || {}, nuitSys: T0.nuitSys || {} }, S = { jour: S0.jour || {}, nuitSys: S0.nuitSys || {} };
const PARTAGES = ['bg', 'text', 'sub', 'body', 'link', 'line', 'card', 'tile', 'seg', 'seg-on', 'accent', 'on-accent', 'nav'];
vrai('les deux blocs de theme.css sont trouvés (jour, nuit de l\'appareil, sur :root)', T0.trouves);
vrai('et ceux de site.css aussi', S0.trouves);
if (T.jour && S.jour) {
  vrai('   (la population n\'est pas vide : ' + Object.keys(T.jour).length + ' jetons de jour)', Object.keys(T.jour).length >= PARTAGES.length);
  for (const mode of ['jour', 'nuitSys']) {
    const ecarts = PARTAGES.filter(k => (T[mode][k] || '').replace(/\s/g, '') !== (S[mode][k] || '').replace(/\s/g, ''));
    v('⛔ ' + mode + ' : les ' + PARTAGES.length + ' jetons partagés ont la valeur de site.css', ecarts.map(k => k + ' ' + T[mode][k] + ' ≠ ' + S[mode][k]), []);
  }
  v('   chaque jeton de jour a sa valeur de nuit', Object.keys(T.jour).filter(k => /^(bg|text|sub|body|link|line|card|tile|seg|seg-on|accent|on-accent|nav|ok|ok-fond|err|err-fond|warn|warn-fond)$/.test(k) && !(k in T.nuitSys)), []);
  vrai('   les polices et le ressort sont ceux du site', ['titre', 'corps', 'ressort'].every(k => (T.jour[k] || '').replace(/\s/g, '') === (S.jour[k] || '').replace(/\s/g, '')));
  /* Les couleurs d'état n'existent pas sur le site : on les MESURE ici — texte sur son fond teinté, posé sur une carte. */
  for (const [mode, J] of [['jour', T.jour], ['nuit', T.nuitSys]]) {
    const carte = rgba(J.card);
    for (const e of ['ok', 'err', 'warn']) {
      const fond = surFond(rgba(J[e + '-fond']), carte), c = contraste(rgba(J[e]), fond);
      vrai(mode + ' : « ' + e + ' » se lit sur son fond teinté (' + c.toFixed(2) + ' ≥ 4,5)', c >= 4.5);
    }
    const c = contraste(rgba(J.sub), carte);
    vrai(mode + ' : le texte secondaire se lit sur une carte (' + c.toFixed(2) + ' ≥ 4,5)', c >= 4.5);
  }
}

console.log('\n══ 2. LE JOUR ET LA NUIT SUIVENT L\'APPAREIL — SANS BOUTON, SANS MODE FORCÉ ══\n');
/* Justin, 29 septembre 2026, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux que ça
   soit automatique ». La feuille suit `prefers-color-scheme` ; plus rien ne force un mode. */
{
  const tete = TETE_MODE.split('\n');
  v('la tête du mode tient en CINQ lignes, comme avant (les pages juridiques sont citées par numéro de ligne, § 6)', tete.length, 5);
  vrai('   les deux couleurs de barre suivent l\'appareil (media), sans marque pour un script', /<meta name="theme-color" content="#f0f3f8" media="\(prefers-color-scheme: light\)">/.test(TETE_MODE) && /<meta name="theme-color" content="#0b1426" media="\(prefers-color-scheme: dark\)">/.test(TETE_MODE) && !/data-(jour|nuit)/.test(TETE_MODE));
  vrai('   la page dit au navigateur qu\'elle a un jour ET une nuit (champs, barres, fond de rebond)', /<meta name="color-scheme" content="light dark">/.test(TETE_MODE));
  /* le script, EXÉCUTÉ dans une fausse page : un `//`, un `return`, un `type` qui le rend inerte ne passent plus */
  const t = MS.jouerTete(TETE_MODE);
  v('   son script, exécuté : une balise <script> nue, il tourne, il efface la clé de l\'ancien bouton et rien d\'autre — [scripts, attributs, tourne, clé effacée, autre clé gardée]',
    [t.scripts, t.balise, !!t.ok, !!t.cleEffacee, !!t.autreGardee], [1, [], true, true, true]);
  v('   ⛔ et ne range rien, ne pose aucun mode, n\'appelle rien d\'autre', t.note && [t.note.set, t.note.attrPose, t.note.attrRetire, t.note.appels], [[], [], [], []]);
}
for (const [nom, css] of [['theme.css', THEME], ['site.css', SITECSS]]) {
  const f = MS.formeFeuille(css);
  v('⛔ ' + nom + ' : UN :root de jour, UN bloc de nuit sous la requête (:root seul), aucun jour forcé, dans l\'ordre — [racines, nuits, jours, ordre, nuit = :root seul]',
    [f.racines, f.nuits, f.jours, f.ordre, f.nuitSeulementRacine], [2, 1, 0, true, true]);
  v('   ' + nom + ' : color-scheme « light dark », une seule fois, sur le :root de jour', [f.schemes, f.schemeJour], [1, true]);
  v('   ' + nom + ' : ⛔ aucun mode forcé (data-theme), et du bouton que la garde qui le cache', [f.dataTheme, f.reglesMode], [false, ['.mode, .coin-mode { display: none !important; }']]);
}
v('⛔ theme.css : aucune couleur écrite en dur hors des jetons (fond, texte, bord, ombre — @media compris)', MS.couleursEnDurFeuille(THEME).map(d => d.join(' | ')), []);
/* mode.js n'est plus appelé par aucune page, mais il RESTE : une page restée en cache (navigateur, service worker) le
   demande encore, et le service worker ne remplace sa copie que par une réponse réussie — il reprend même l'ancien cache à
   chaque version. Supprimé, l'ANCIENNE copie (qui démasquait le bouton) resterait servie pour toujours. Ce n'est PAS
   l'installation du service worker qui en dépend : chaque ressource s'y charge à part (écrit à tort ici le 29 septembre,
   relecture adverse du soir). */
{
  vrai('mode.js existe (une page restée en cache le demande)', MODEJS.length > 0);
  vrai('   (et sw.js le précharge toujours : la copie neuve remplace l\'ancienne dès l\'installation)', /'vitrine\/v2\/mode\.js'/.test(SW));
  const m = MS.jouerModeJs(MODEJS);
  v('   exécuté sur une page restée en cache : il tourne, efface le choix rangé, retire le mode posé, garde le reste — [tourne, clé effacée, mode retiré, autre clé gardée]',
    [!!m.ok, !!m.cleEffacee, !!m.modeRetire, !!m.autreGardee], [true, true, true, true]);
  v('   ⛔ et ne range rien, ne pose aucun mode, ne branche rien (aucun appel au document)', m.note && [m.note.set, m.note.attrPose, m.note.appels], [[], [], []]);
}

/* ── ce qu'une page au thème doit porter ── */
/* ÉCARTS : les seules couleurs écrites en dur admises, chacune avec sa raison. Une entrée qui ne sert plus est une
   décision prise pour du vide : le banc la signale aussi. */
const ECARTS = {
  'espace.html': {
    '--elan: #22b14c': 'le vert d\'OP GESTION : le bouton « Ouvrir » porte la couleur de l\'application qu\'il ouvre',
    'color: #04140a': 'l\'encre de ce vert (7,9:1), la même dans les deux modes : le bouton est un aplat',
    '#04140a': 'la même encre, portée par la fiche de l\'application (APPS.elan.encre) pour « Ouvrir »',
    'color: #fff': 'l\'initiale sur la pastille dégradée du client',
    'background: linear-gradient(135deg,#1e3a8a,#3b6fd0)': 'la pastille du client, un aplat bleu dans les deux modes',
    'box-shadow: 0 1px 4px rgba(0,0,0,.18)': 'une ombre', 'box-shadow: 0 30px 80px rgba(0,0,0,.35)': 'une ombre',
    'background: rgba(0,0,0,.45)': 'le voile sous une fenêtre',
    /* le contrat imprimable (contratVoir) : une FEUILLE BLANCHE qu'on imprime, dans les deux modes — sa feuille vit dans
       une chaîne du script, elle se lit donc comme une feuille de la page */
    'color: #111': 'le contrat imprimable : une feuille blanche', 'border-top: 1px solid #ccc': 'idem', 'border-top: 1px solid #999': 'idem',
    'color: #555': 'idem', '#999': 'le bouton « Imprimer » du contrat',
  },
  'connexion.html': {
    'rgba(52,211,153,.14)': 'la tuile d\'OP GESTION (vert à 14 %)', 'rgba(59,130,246,.14)': 'la tuile d\'OP MESSAGES',
    'rgba(167,139,250,.14)': 'la tuile de l\'espace client',
  },
  'recap-abonnement.html': { 'box-shadow: 0 1px 4px rgba(0,0,0,.18)': 'une ombre (le segment choisi)' },
};
const COULEURS_TETE = ['#f0f3f8', '#0b1426'];   // les deux couleurs de barre, dans la tête du mode
const COULEURS_RUBAN = ['#fff', '#B26E12', 'rgba(0,0,0,.25)'];   // le ruban « APERÇU » que pose scripts/apercu.sh

function couleursEnDur(s) {
  const styles = [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const feuille = [...styles.matchAll(/([a-z-]+)\s*:\s*([^;{}]*(?:#[0-9a-fA-F]{3,8}\b|rgba?\()[^;{}]*)/g)].map(m => m[1] + ': ' + m[2].trim());
  const hors = sansCom(s.replace(/<style>[\s\S]*?<\/style>/g, ' '));
  const ailleurs = [...hors.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z_-])|rgba?\([^)]*\)/g)].map(m => m[0]);
  return [...new Set(feuille.concat(ailleurs))];
}

function auTheme(nom, s, etiquette, apercu) {
  const code = sansCom(s), tete = s.slice(0, s.indexOf('</head>'));
  vrai(etiquette + ' : la tête du mode, à l\'identique de celle du site, une seule fois', s.split(TETE_MODE).length === 2);
  vrai(etiquette + '    dans <head>, avant la palette et avant la feuille de la page',
    tete.indexOf(TETE_MODE) >= 0 && tete.indexOf(TETE_MODE) < tete.indexOf('<link rel="stylesheet" href="/vitrine/v2/theme.css">') && tete.indexOf(TETE_MODE) < tete.indexOf('<style>'));
  vrai(etiquette + ' : la palette du site (/vitrine/v2/theme.css), une fois, dans <head>', s.split('href="/vitrine/v2/theme.css"').length === 2 && tete.indexOf('/vitrine/v2/theme.css') > 0);
  v(etiquette + ' : ⛔ aucun bouton de mode, aucun mode forcé, aucune clé de mode, aucun color-scheme à elle (quelle qu\'en soit l\'écriture)',
    MS.restesDeMode(s, TETE_MODE), []);
  v(etiquette + ' : ⛔ rien de l\'ancien habillage (polices, fond animé, polices Google)',
    ['DM Sans', 'Space Mono', 'Courier New', 'fonts.googleapis', 'fond-anime-teamop'].filter(x => code.indexOf(x) >= 0), []);
  v(etiquette + ' : ⛔ pas le logo d\'OP GESTION à côté de « TEAM OP »', /plan-gestion\.png/.test(code), false);
  vrai(etiquette + ' : le logo TEAM OP', /icons\/teamop-(192|512)\.png/.test(code));
  const ecarts = ECARTS[nom] || {};
  const dur = couleursEnDur(s).filter(c => COULEURS_TETE.indexOf(c) < 0 && !(apercu && COULEURS_RUBAN.indexOf(c) >= 0));
  v(etiquette + ' : ⛔ aucune couleur en dur hors des écarts nommés', dur.filter(c => !(c in ecarts)), []);
  v(etiquette + '    et aucun écart qui ne sert plus', Object.keys(ecarts).filter(e => dur.indexOf(e) < 0), []);
  /* Safari zoome sur un champ sous 16 px — et la page reste zoomée */
  const styles = [...s.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  /* ⚠️ `\b.inp` ne trouve rien : il n'y a pas de frontière de mot devant un point — la contre-épreuve l'a montré */
  const champsPetits = [...styles.matchAll(/([^{}]*(?:\binput\b|\bselect\b|\btextarea\b|\.inp\b)[^{}]*)\{([^}]*)\}/g)]
    .filter(m => !/::?-webkit|autofill|spin-button|checkbox|radio/.test(m[1]))
    .map(m => [m[1].trim(), (/(?:^|;)\s*font-size\s*:\s*([\d.]+)px/.exec(m[2]) || [])[1]]).filter(x => x[1] && +x[1] < 16);
  const enLigne = [...code.matchAll(/<input\b[^>]*style="[^"]*font-size:\s*([\d.]+)px/g)].map(m => +m[1]).filter(x => x < 16);
  v(etiquette + ' : ⛔ aucun champ sous 16 px (Safari zoome au toucher)', champsPetits.concat(enLigne), []);
}

console.log('\n══ 3. CHAQUE PAGE : SOIT CELLE EN SERVICE, SOIT AU THÈME EN ENTIER — JAMAIS À MOITIÉ ══\n');
const etats = {};
for (const p of PAGES) {
  const s = lire(p);
  const enService = sha(s) === EMPREINTES[p];
  const theme = s.indexOf('/vitrine/v2/theme.css') >= 0;
  etats[p] = enService ? 'service' : 'theme';
  vrai(p + ' : ' + (enService ? 'la page en service (main), à l\'octet près' : 'au thème du site'), enService || theme);
  if (!enService) auTheme(p, s, p);
}
v('les dix empreintes sont celles des dix pages (rien d\'oublié, rien en trop)', Object.keys(EMPREINTES).sort(), PAGES.slice().sort());

console.log('\n══ 4. LES MESSAGES DE LA CONNEXION DES ÉQUIPES SONT DES JETONS ══\n');
if (etats['connexion.html'] === 'theme') {
  const c = sansCom(lire('connexion.html'));
  v('⛔ aucun message en couleur écrite en dur (adrMsg, cxMsg, msg)', (c.match(/\b(?:adrMsg|cxMsg|msg)\('#/g) || []).length, 0);
  const n = (c.match(/\b(?:adrMsg|cxMsg|msg)\('var\(--m-(?:err|body|ok|warn)\)'/g) || []).length;
  vrai('   ils passent tous par un jeton de sens (' + n + ' appels : erreur, information, réussite, attente)', n >= 12);
} else vrai('(connexion.html est la page en service : rien à juger ici)', true);

console.log('\n══ 5. LA PAGE D\'ERREUR AIGUILLE AVANT TOUT LE RESTE ══\n');
{
  const s = lire('404.html'), premier = (/<script>([\s\S]*?)<\/script>/.exec(s) || [])[1] || '';
  vrai('le PREMIER script de 404.html est l\'aiguillage des adresses d\'entreprise (scripts/verifier-adresses.js l\'exécute)', /location\.replace\('\/connexion\.html\?e='/.test(premier));
}

console.log('\n══ 6. LES PAGES JURIDIQUES GARDENT LEURS NUMÉROS DE LIGNE (ils sont cités ailleurs) ══\n');
{
  const ligne = (f, n) => lire(f).split('\n')[n - 1] || '';
  vrai('mentions-legales.html:74 est toujours l\'article 5 (« n\'entraînent aucune suppression ») — cité par server/index.js, server/op-socle.js, CLAUDE.md, test-726, test-735, test-796',
    /n'entraînent aucune suppression/.test(ligne('mentions-legales.html', 74)));
  vrai('mentions-legales.html:52 est toujours l\'hébergeur (IONOS SE) — cité par les plans et REPRISE', /IONOS SE/.test(ligne('mentions-legales.html', 52)));
  vrai('sous-traitance.html:162 est toujours la ligne d\'IONOS dans la liste des sous-traitants — citée par les plans', /IONOS SE/.test(ligne('sous-traitance.html', 162)));
}

console.log('\n══ 7. LES COPIES D\'APERÇU : ENTRE ELLES, AU THÈME, NON RÉFÉRENCÉES, À JOUR ══\n');
const FAM = PAGES.filter(p => p !== '404.html').map(p => p.replace('.html', ''));
for (const p of PAGES) {
  const f = 'apercu/' + p;
  if (!fs.existsSync(path.join(RACINE, f))) { vrai(f + ' existe', false); continue; }
  const s = lire(f), code = sansCom(s);
  auTheme(p, s, f, true);
  vrai(f + ' : <base href="/">, pas de référencement (noindex), le ruban d\'aperçu',
    /<head[^>]*><base href="\/">/.test(s) && /<meta name="robots" content="noindex">/.test(s) && /id="apercu-ruban"/.test(s));
  vrai(f + ' : ⛔ aucun service worker ne s\'inscrit depuis l\'aperçu', !/navigator\.serviceWorker\.register\(/.test(code));
  /* les liens vers la famille ou le site qui ne mènent PAS à l'aperçu (hors la valeur du retour après connexion) */
  const fuites = [...code.matchAll(new RegExp(`(?<!encodeURIComponent\\()(["'(])/?(${FAM.join('|')}|${SITE.join('|')})\\.html`, 'g'))].map(m => m[0]);
  v(f + ' : ⛔ aucun lien ne ramène au portail ou au site EN SERVICE', fuites, []);
  const cibles = [...code.matchAll(/["'(](\/apercu\/[a-z0-9/-]+\.html)/g)].map(m => m[1]);
  v(f + ' : chaque lien d\'aperçu mène à une page qui existe (' + new Set(cibles).size + ' cibles)', [...new Set(cibles)].filter(c => !fs.existsSync(path.join(RACINE, c))), []);
}
{
  const c = sansCom(lire('apercu/connexion.html'));
  vrai('apercu/connexion.html : une adresse d\'entreprise reste dans l\'aperçu (plus de teamop.fr/e/… vers la page en service)',
    !/location\.href='\/e\/'/.test(c) && /location\.href='\/apercu\/connexion\.html\?e='\+/.test(c));
  const e = sansCom(lire('apercu/espace.html'));
  vrai('apercu/espace.html : après connexion, le retour au paiement reste dans l\'aperçu',
    (e.match(/location\.href='\/apercu\/'\+RETOUR_PAIEMENT;/g) || []).length === 2 && !/location\.href=RETOUR_PAIEMENT;/.test(e));
  vrai('   et sa garde n\'a pas bougé (un nom de page nu, contrôlé)', /\/\^recap-abonnement\\\.html\(\\\?\[\\w=&%\.-\]\*\)\?\$\//.test(e));
}
/* ⛔ UN APERÇU PLUS VIEUX QUE LA PAGE QU'IL DOUBLE EST PIRE QUE PAS D'APERÇU (CLAUDE.md). Quand les pages à la racine
   sont au thème (la branche), on refait les copies avec le VRAI scripts/apercu.sh, à côté, et on compare à l'octet.
   Quand elles sont celles en service (main), les copies viennent de la branche : il n'y a rien à refaire ici. */
if (PAGES.every(p => etats[p] === 'theme')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-836-'));
  let refait = true;
  try { execFileSync('bash', [path.join(RACINE, 'scripts', 'apercu.sh'), 'portail'], { cwd: RACINE, env: Object.assign({}, process.env, { APERCU_SORTIE: tmp }), stdio: 'pipe' }); }
  catch (e) { refait = false; }
  vrai('scripts/apercu.sh refait les dix copies', refait);
  if (refait) v('⛔ aucune copie d\'aperçu en retard sur sa page (refaite à l\'identique)', PAGES.filter(p => fs.readFileSync(path.join(tmp, p), 'utf8') !== lire('apercu/' + p)), []);
  fs.rmSync(tmp, { recursive: true, force: true });
} else if (PAGES.every(p => etats[p] === 'service')) {
  vrai('(les pages à la racine sont celles en service : l\'aperçu vient de la branche, rien à refaire ici)', true);
} else vrai('⛔ les dix pages changent ENSEMBLE — ici : ' + PAGES.filter(p => etats[p] === 'theme').join(', ') + ' au thème, les autres non', false);

console.log('\n══ 8. LE SITE D\'APERÇU ENVOIE AU PORTAIL D\'APERÇU ══\n');
for (const c of SITE) {
  const f = 'apercu/site/' + c + '.html';
  if (!fs.existsSync(path.join(RACINE, f))) continue;
  const s = lire(f);
  v(f + ' : aucun lien vers le portail en service', [...s.matchAll(new RegExp(`href="/(${FAM.join('|')})\\.html`, 'g'))].map(m => m[0]), []);
}

console.log('\n══ 9. TOUTES LES PAGES DU DÉPÔT : AUCUN BOUTON DE MODE HORS DES EXCEPTIONS NOMMÉES ══\n');
/* Un recensement part du DÉPÔT, jamais d'une liste (CLAUDE.md) : les § 2 à 8 ne lisent que les 10 pages voisines et les
   8 du site. Une 19ᵉ page copiée d'un ancien modèle, un aperçu refait d'une vieille copie, ne seraient vus par personne.
   Les exceptions sont NOMMÉES, avec leur raison, et chacune doit encore servir. */
{
  const EXCEPTIONS = {
    'app.html': 'OP GESTION : son propre réglage Jour / Nuit / Auto (Paramètres), ce n\'est pas le site',
    'beta.html': 'OP GESTION bêta : même réglage, générée depuis app.html',
    'messages.html': 'OP MESSAGES (fermée, OPMSG_EN_TRAVAUX) : son propre thème d\'application',
    'messages-beta.html': 'OP MESSAGES bêta : même thème',
    'tour.html': 'la Tour : la console du patron, avec son propre jour et nuit — ce n\'est pas le site',
    'apercu/tour.html': 'la Tour en aperçu : même chose',
    /* (`apercu/site-apple.html`, la maquette de comparaison, est supprimée — Justin, 30 septembre 2026 : « pour le site on
       garde la maquette qu'on a à l'heure actuelle, l'ancienne tu peux les supprimer ») */
  };
  const fichiers = require('child_process').execSync('git ls-files "*.html"', { cwd: RACINE }).toString().trim().split('\n').filter(Boolean);
  vrai('population : ' + fichiers.length + ' pages suivies', fichiers.length >= 50);
  const fautes = [], servies = [];
  for (const f of fichiers) {
    const r = MS.restesDeMode(lire(f), TETE_MODE);
    if (f in EXCEPTIONS) { if (r.length) servies.push(f); continue; }
    if (r.length) fautes.push(f + ' : ' + r.join(', '));
  }
  v('⛔ aucune page du dépôt, hors exceptions nommées, ne porte un bouton, un mode forcé ou une clé de mode', fautes, []);
  v('   et chaque exception sert encore (une exception vide est une décision prise pour du vide)', Object.keys(EXCEPTIONS).filter(f => servies.indexOf(f) < 0), []);
}

console.log('\n══ 10. LES RÈGLES DES OPTIONS DU PRO NE PORTENT AUCUNE COULEUR EN DUR (le jour et la nuit suivent l\'appareil) ══\n');
/* Le tableau comparatif et les cartes d'options (1er octobre 2026) vivent dans la feuille du site, que le portail partage : une
   couleur écrite en dur n'y suivrait pas la nuit. On lit le BLOC de règles (de son titre jusqu'aux « questions »), pas la feuille
   entière : un banc qui lit tout ne voit pas qui a écrit quoi. */
{
  const css = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.css'), 'utf8');
  const i = css.indexOf('/* ── les options du Pro et le tableau comparatif'), j = css.indexOf('/* questions */');
  vrai('le bloc des options est trouvé dans la feuille (' + (j - i) + ' signes)', i > 0 && j > i + 2000);
  const code = css.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, ' ');
  v('aucune couleur hexadécimale, rgb() ni nom de couleur — seulement des jetons (var(--…)) et l\'ombre rgba(0,0,0,…) des cartes', code.match(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\brgba\((?!0,0,0,)|(?<![-\w])(white|black|red|green|blue)(?![-\w])/g) || [], []);
  v('et le bloc ne redéfinit aucun jeton (il les LIT)', code.match(/--[\w-]+\s*:/g) || [], []);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
