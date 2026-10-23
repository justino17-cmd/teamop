/* ══ test-2986 · LE SCRIPT INJECTÉ (#essai=…), L'ACCUEIL DES ESSAIS ET LA LISTE DES COURRIELS — EXÉCUTÉS ═════════════════════════════════════════
   23 octobre 2026. `scripts/essais-build.js` pose en tête de chaque page de test un petit script qui lit `#essai=<base64url d'un JSON>`,
   range ce que le serveur de test a préparé pour être connecté (localStorage, sessionStorage), efface le fragment, puis recharge ou va à
   une page du site. C'est une PORTE : un lien forgé ne doit ni écrire n'importe quelle clé, ni envoyer hors du site. Ce banc EXÉCUTE le vrai
   script (extrait d'une page fabriquée) dans un contexte simulé qui note chaque écriture, chaque `replaceState`, chaque redirection ; puis
   ÉPROUVE chaque règle en la retirant du générateur (une copie mutilée fabrique des pages, le même scénario doit tomber).
   Il exécute aussi la page `courriels.html` (un faux DOM, la vraie fonction) : un lien `javascript:` n'est pas rendu cliquable, le texte d'un
   courriel entre par textContent (jamais en HTML), le courriel « tel que le client le voit » va dans un cadre isolé. Et il lit essais.html :
   les quatre liens de connexion avec la clé, le bouton de remise à zéro (POST, confirmation), le parcours dans l'ordre, les tests de la
   modification AVANT le parcours de base.
   Ce que ce banc ne voit pas — le navigateur qui enchaîne 302, fragment, rechargement, Mon espace connecté — est dans scratchpad/sonde-essais.js
   (43 ✓ 0 ✗ le 23/10/2026). Population comptée avant chaque absence.                                                                         */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const { spawnSync } = require('child_process');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const RACINE = path.join(__dirname, '..');
const BUILD = path.join(RACINE, 'scripts', 'essais-build.js');
const CLE = crypto.randomBytes(32).toString('hex');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'essais2986-'));
let n = 0;
const neuf = () => path.join(TMP, 's-' + (++n));
function construire(sortie, o) {
  const opt = o || {}, env = Object.assign({}, process.env, { ESSAIS_CLE: CLE, ESSAIS_RACINE: RACINE }); delete env.TEAMOP_CONFIG; delete env.ESSAIS_PARCOURS;
  return spawnSync(process.execPath, [opt.script || BUILD, sortie, 'abcdef1', 'claude/essai-banc'].concat(opt.args || []), { encoding: 'utf8', env, timeout: 120000 });
}
const lire = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const scriptDe = d => { const m = /<script id="essai-fragment">([\s\S]*?)<\/script>/.exec(lire(d, 'espace.html')); return m ? m[1] : ''; };

/* ── le contexte simulé ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function jouer(SCRIPT, hash, opt) {
  const o = opt || {}, j = { ls: {}, ss: {}, replaceState: [], replace: [], reload: 0, warn: 0 };
  const stock = (cible) => ({ setItem(k, v) { if (o.quota) throw new Error('quota'); cible[String(k)] = String(v); } });
  const sb = {
    location: { hash, pathname: '/espace.html', search: '?x=1', replace(u) { j.replace.push(u); }, reload() { j.reload++; } },
    history: { replaceState(a, b, c) { j.replaceState.push(c); } },
    localStorage: stock(j.ls), sessionStorage: stock(j.ss),
    atob, TextDecoder, console: { warn() { j.warn++; } },
  };
  vm.runInNewContext(SCRIPT, sb, { timeout: 2000 });
  return j;
}
/* tous les scénarios, rendus en booléens nommés : le même jeu sert au vrai script et aux scripts mutilés */
function verdicts(SCRIPT) {
  const v = {}, par = (cle, f) => { try { v[cle] = !!f(); } catch (e) { v[cle] = false; } };
  const client = { stockage: { teamop_portail_jeton: 'jeton-essai-1' }, page: 'espace.html' };
  par('écrit la clé et va à la page', () => { const j = jouer(SCRIPT, '#essai=' + b64u(client)); return j.ls.teamop_portail_jeton === 'jeton-essai-1' && j.replace.length === 1 && j.replace[0] === '/espace.html' && j.reload === 0; });
  par('efface le fragment AVANT tout', () => { const j = jouer(SCRIPT, '#essai=' + b64u(client)); return j.replaceState.length === 1 && j.replaceState[0] === '/espace.html?x=1'; });
  par('sans page : recharge', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { a_b: '1' } })); return j.reload === 1 && j.replace.length === 0 && j.ls.a_b === '1'; });
  const REFUSEES = ['//exemple.fr/x', 'https://exemple.fr/x', 'javascript:alert(1)', '../x.html', 'a/../../x', '/etc/passwd', 'a b.html', 'x.html#h', 'a//b', 'é.html', ''];
  for (const p of REFUSEES) par('page refusée : ' + JSON.stringify(p), () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { k: '1' }, page: p })); return j.replace.length === 0 && j.reload === 1; });
  for (const [p, att] of [['tour.html', '/tour.html'], ['a/b.html?x=1&y=2', '/a/b.html?x=1&y=2'], ['espace.html?mode=resetPassword&oobCode=a-b_c', '/espace.html?mode=resetPassword&oobCode=a-b_c']])
    par('page acceptée : ' + p, () => { const j = jouer(SCRIPT, '#essai=' + b64u({ page: p })); return j.replace.length === 1 && j.replace[0] === att && j.reload === 0; });
  par('clé invalide refusée (espace, accent, vide, 81 signes)', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { 'a b': '1', 'clé': '1', '': '1', ['x'.repeat(81)]: '1', ok_1: '1' } })); return Object.keys(j.ls).join() === 'ok_1'; });
  par('valeur non texte : mise en JSON', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { o: { a: 1 }, nb: 5, ta: ['x'] } })); return j.ls.o === '{"a":1}' && j.ls.nb === '5' && j.ls.ta === '["x"]'; });
  par('valeur trop longue refusée (60 001), 60 000 gardée', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { long: 'x'.repeat(60001), juste: 'x'.repeat(60000) } })); return !('long' in j.ls) && j.ls.juste.length === 60000; });
  par('au plus 60 clés', () => { const s = {}; for (let i = 0; i < 100; i++) s['k' + i] = '1'; const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: s })); return Object.keys(j.ls).length === 60; });
  par('« session » va dans sessionStorage, pas dans localStorage', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ session: { tour_token: 't' } })); return j.ss.tour_token === 't' && Object.keys(j.ls).length === 0; });
  par('UTF-8 : é€ revient intact', () => { const j = jouer(SCRIPT, '#essai=' + b64u({ stockage: { nom: 'Élodie 12 €' } })); return j.ls.nom === 'Élodie 12 €'; });
  par('base64 invalide : aucune écriture, aucune exception', () => { const j = jouer(SCRIPT, '#essai=%%%%'); return Object.keys(j.ls).length === 0 && j.replace.length === 0 && j.replaceState.length === 1; });
  par('pas du JSON : aucune écriture, aucune exception', () => { const j = jouer(SCRIPT, '#essai=' + b64u('bonjour')); return Object.keys(j.ls).length === 0 && j.replace.length === 0; });
  par('JSON « null » : aucune écriture, aucun rechargement', () => { const j = jouer(SCRIPT, '#essai=' + b64u('null')); return Object.keys(j.ls).length === 0 && j.reload === 0 && j.replace.length === 0; });
  for (const h of ['', '#v=dashboard', '#essaiX=1', '#/essai=1', '#entreprise=abc'])
    par('autre fragment ' + JSON.stringify(h) + ' : rien du tout', () => { const j = jouer(SCRIPT, h); return j.replaceState.length === 0 && j.reload === 0 && j.replace.length === 0 && Object.keys(j.ls).length === 0; });
  par('stockage plein (setItem jette) : la navigation a lieu quand même', () => { const j = jouer(SCRIPT, '#essai=' + b64u(client), { quota: true }); return j.replace.length === 1; });
  return v;
}

/* ── 1. LE VRAI SCRIPT ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n1. Le vrai script injecté, exécuté');
const OUT = neuf(); const r0 = construire(OUT);
vrai('les pages se fabriquent', r0.status === 0, (r0.stderr || '').slice(0, 300));
if (r0.status !== 0) { console.log('\n════ test-2986 : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(1); }
const SCRIPT = scriptDe(OUT);
vrai('(population) le script est trouvé dans une page fabriquée', SCRIPT.length > 500 && /essai=/.test(SCRIPT), SCRIPT.length);
const V0 = verdicts(SCRIPT), noms = Object.keys(V0);
vrai('(population) ' + noms.length + ' scénarios joués (plus de 30)', noms.length > 30, noms.length);
for (const k of noms) vrai(k, V0[k]);
{ // le script est identique dans toutes les pages d'entrée (une seule définition, injectée)
  const pages = ['espace.html', 'tour.html', 'app.html', 'connexion.html', 'reinit.html', 'index.html'];
  egal('le même script est injecté dans les ' + pages.length + ' pages d\'entrée (espace, tour, app, connexion, reinit, accueil)', pages.filter(f => scriptDe_(f) !== SCRIPT), []);
  function scriptDe_(f) { const m = /<script id="essai-fragment">([\s\S]*?)<\/script>/.exec(lire(OUT, f)); return m ? m[1] : null; }
}
vrai('le script ne contient AUCUNE adresse (il n\'envoie rien, il ne lit que le fragment)', !/https?:\/\//.test(SCRIPT) && !/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(SCRIPT));

/* ── 2. CHAQUE RÈGLE, ÉPROUVÉE EN LA RETIRANT ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n2. Chaque règle du script tombe quand on la retire (générateur mutilé, mêmes scénarios)');
{
  const src = fs.readFileSync(BUILD, 'utf8');
  const MUTS = [
    ["le refus d'une page « // » (hors du site)", "&&p.indexOf('//')<0", '', /^page refusée : "(\/\/exemple\.fr\/x|a\/\/b)"$/],
    ['le refus de « .. » (remonter le dossier)', "&&p.indexOf('..')<0", '', /^page refusée : "(\.\.\/x\.html|a\/\.\.\/\.\.\/x)"$/],
    ['la forme d\'une page (chemin du site, signes sûrs)', "[A-Za-z0-9_][A-Za-z0-9_.\\\\/-]{0,80}(\\\\?[A-Za-z0-9_=&%.-]{0,200})?", '.*', /^(page refusée|sans page)/],
    ['la forme d\'une clé de stockage', "if(!/^[A-Za-z0-9_.:-]{1,80}$/.test(k))return;", '', /^clé invalide refusée/],
    ['la limite de 60 clés', '.slice(0,60)', '', /^au plus 60 clés$/],
    ['la limite de taille d\'une valeur', 'v.length>60000', 'false', /^valeur trop longue/],
    ['l\'effacement du fragment', "history.replaceState(null,'',location.pathname+location.search);", '', /^efface le fragment/],
    ['la lecture de « session » dans sessionStorage', 'try{ranger(sessionStorage,j.session);}catch(e){}', 'try{ranger(localStorage,j.session);}catch(e){}', /^« session »/],
    ['le décodage UTF-8', 'new TextDecoder().decode(oct)', 'bin', /^UTF-8/],
    ['le filtre « commence par #essai= »', "if(h.indexOf('#essai=')!==0)return;", '', /^autre fragment/],
  ];
  for (const [nom, motif, remplace, attendu] of MUTS) {
    const compte = src.split(motif).length - 1;
    if (compte !== 1) { vrai('règle « ' + nom + ' » : le motif est trouvé une fois dans le générateur', false, compte); continue; }
    const f = path.join(TMP, 'muet-' + (++n) + '.js'); fs.writeFileSync(f, src.replace(motif, () => remplace));
    const D = neuf(), r = construire(D, { script: f });
    const S = r.status === 0 ? scriptDe(D) : '';
    if (!S) { vrai('règle « ' + nom + ' » : la copie mutilée fabrique des pages', false, (r.stderr || '').slice(0, 160)); continue; }
    const V = verdicts(S), tombes = Object.keys(V).filter(k => !V[k]);
    vrai('règle « ' + nom + ' » : retirée, au moins un scénario tombe (' + tombes.length + ')', tombes.length > 0 && tombes.some(k => attendu.test(k)), tombes.slice(0, 4));
    vrai('   … et c\'est bien SON scénario, aucun sans rapport', tombes.length > 0 && tombes.every(k => attendu.test(k) || /^(écrit la clé|sans page|efface le fragment|autre fragment|base64|pas du JSON|JSON)/.test(k)), tombes);
  }
}

/* ── 3. L'ACCUEIL DES ESSAIS ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n3. essais.html');
const ESSAIS = lire(OUT, 'essais.html');
for (const c of ['client', 'prospect', 'patron', 'collaborateur'])
  vrai('le lien « Se connecter comme ' + c + ' » mène à /api/essais/connexion?compte=' + c + ' avec la clé', ESSAIS.indexOf('href="/api/essais/connexion?compte=' + c + '&amp;cle=' + CLE + '"') >= 0);
vrai('« Voir les courriels captés » mène à /courriels.html', /id="lien-courriels" href="\/courriels\.html"/.test(ESSAIS));
vrai('le commit et la branche en essai sont dits', ESSAIS.indexOf('<code>claude/essai-banc</code>') >= 0 && ESSAIS.indexOf('<code>abcdef1</code>') >= 0);
{ const code = ESSAIS.slice(ESSAIS.lastIndexOf('<script>'));
  vrai('la remise à zéro demande confirmation, puis POSTE sur /api/essais/remise-a-zero avec la clé',
    /window\.confirm\(/.test(code) && /fetch\('\/api\/essais\/remise-a-zero\?cle='\+encodeURIComponent\(CLE\),\{method:'POST'\}\)/.test(code) && code.indexOf('window.confirm(') < code.indexOf('/api/essais/remise-a-zero'));
  vrai('… et dit le refus (404 : pas un serveur de test ; 403 : clé refusée) au lieu de se taire', /r\.status===404/.test(code) && /r\.status===403/.test(code));
  vrai('les cases cochées se rangent par commit, derrière un try/catch (le stockage peut être vide ou fermé)', /MEMOIRE='essai_etapes_'\+COMMIT/.test(code) && /try\{ return JSON\.parse\(localStorage/.test(code) && /try\{ localStorage\.setItem\(MEMOIRE/.test(code)); }
{ const TITRES = ['Se connecter comme client', 'Se connecter comme prospect', 'Entrer dans la Tour comme patron', 'Entrer dans la Tour comme collaborateur', 'Lire les courriels captés', 'Remettre l\'espace à zéro'];
  const places = TITRES.map(t => ESSAIS.indexOf('<b>' + t.replace(/'/g, '\'') + '</b>'));
  vrai('(population) le parcours de base compte ses 6 étapes, numérotées par une liste ordonnée', (ESSAIS.match(/<li class="carte" data-etape="b\d"/g) || []).length === 6 && /<ol class="etapes">/.test(ESSAIS), places);
  vrai('… dans l\'ordre voulu : client, prospect, patron, collaborateur, courriels, remise à zéro', places.every((p, i) => p > 0 && (i === 0 || p > places[i - 1])), places);
  vrai('… et chacune dit ce qu\'il faut faire ET ce que l\'on doit voir', (ESSAIS.match(/Ce que tu dois voir :/g) || []).length === 6); }
vrai('sans parcours de la modification, aucune section « Les tests de cette modification »', ESSAIS.indexOf('Les tests de cette modification') < 0);

/* le parcours de la modification : AVANT le parcours de base, échappé */
{
  const pf = path.join(TMP, 'parcours.json');
  fs.writeFileSync(pf, JSON.stringify([
    { titre: 'Le devis <b>change</b> de couleur', quoi: 'Ouvre un devis & regarde le titre.', attendu: 'Le titre est vert "foncé".', lien: 'app.html' },
    { titre: 'Le second test', quoi: 'Rien à faire.', attendu: 'Rien ne bouge.' },
  ]));
  const D = neuf(), r = construire(D, { args: ['--parcours', pf] });
  vrai('un parcours de modification se fabrique', r.status === 0, (r.stderr || '').slice(0, 200));
  const E = r.status === 0 ? lire(D, 'essais.html') : '';
  const iMod = E.indexOf('Les tests de cette modification'), iBase = E.indexOf('Le parcours de base'), iPremier = E.indexOf('Le devis &lt;b&gt;change'), iSecond = E.indexOf('Le second test');
  vrai('les tests de la modification viennent AVANT le parcours de base, dans l\'ordre donné', iMod > 0 && iPremier > iMod && iSecond > iPremier && iBase > iSecond && E.indexOf('Se connecter comme client</b>') > iBase, [iMod, iPremier, iSecond, iBase]);
  vrai('⛔ le texte du parcours est ÉCHAPPÉ (jamais du HTML venu d\'un fichier)', E.indexOf('<b>change</b>') < 0 && E.indexOf('Ouvre un devis &amp; regarde') >= 0 && E.indexOf('&quot;foncé&quot;') >= 0);
  vrai('le lien d\'une étape devient un chemin du site', /<a class="bouton creux" href="\/app\.html">Ouvrir<\/a>/.test(E));
  vrai('les étapes de la modification se cochent à part (m1, m2), celles du parcours de base aussi (b1…)', /data-coche="m1"/.test(E) && /data-coche="m2"/.test(E) && /data-coche="b1"/.test(E));
}

/* ── 4. LA LISTE DES COURRIELS, EXÉCUTÉE ─────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n4. courriels.html — la vraie fonction, un faux DOM');
{
  const COURR = lire(OUT, 'courriels.html'), code = COURR.slice(COURR.lastIndexOf('<script>') + 8, COURR.lastIndexOf('</script>'));
  const sansCom = code.replace(/\/\*[\s\S]*?\*\//g, ' ');
  vrai('⛔ aucun innerHTML, outerHTML ni document.write : tout ce que dit un courriel entre par textContent', !/innerHTML|outerHTML|document\.write|insertAdjacentHTML/.test(sansCom));
  vrai('le cadre « tel que le client le voit » est isolé (sandbox vide) et sans référent', /sandbox:''/.test(sansCom) && /referrerpolicy:'no-referrer'/.test(sansCom));
  vrai('un lien s\'ouvre dans un autre onglet sans donner la main à la page (noopener)', /target:'_blank',rel:'noopener'/.test(sansCom));

  class El { constructor(nom) { this.nom = nom; this.attrs = {}; this.kids = []; this._t = ''; this.srcdoc = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k]; } appendChild(c) { this.kids.push(c); return c; } addEventListener() {}
    get textContent() { return this._t; } set textContent(v) { this._t = String(v); this.kids = []; } }
  const elts = {}; const ge = id => elts[id] || (elts[id] = new El('#' + id));
  const urls = [];
  const LISTE = {
    ok: [{ de: 'ne-pas-repondre@exemple-essai.fr', a: ['client@exemple-essai.fr', 'autre@exemple-essai.fr'], objet: 'Objet <img src=x onerror=alert(1)>', date: '2026-10-23T09:30:00Z', texte: '<b>texte brut</b>',
      html: '<p>Bonjour</p>', liens: ['https://test.teamop.fr/reinit.html?x=1', 'javascript:alert(1)', 'data:text/html,x', { href: 'http://test.teamop.fr/a', texte: 'La page A' }, { url: 'https://test.teamop.fr/b' }, { href: 'ftp://x/y' }, null, 42] }],
  };
  const scenario = async (reponse) => {
    const racine = new El('#racine'); Object.keys(elts).forEach(k => delete elts[k]);
    const sb = { document: { getElementById: ge, createElement: nom => new El(nom), visibilityState: 'visible' }, fetch: u => { urls.push(String(u)); return Promise.resolve(reponse); }, setInterval() {}, encodeURIComponent, Array, Date, String, JSON, isNaN, console };
    vm.runInNewContext(code, sb, { timeout: 2000 });
    for (let i = 0; i < 12; i++) await new Promise(r => setImmediate(r));
    return ge('liste');
  };
  const parcourir = (e, f) => { f(e); (e.kids || []).forEach(k => parcourir(k, f)); };
  (async () => {
    const liste = await scenario({ status: 200, ok: true, json: () => Promise.resolve(LISTE.ok) });
    vrai('la page interroge /api/essais/courriels avec la clé', urls.length >= 1 && urls[0] === '/api/essais/courriels?cle=' + CLE, urls);
    const ancres = [], cadres = [], pres = [], gras = [];
    parcourir(liste, e => { if (e.nom === 'a') ancres.push(e); if (e.nom === 'iframe') cadres.push(e); if (e.nom === 'pre') pres.push(e); if (e.nom === 'b') gras.push(e); });
    vrai('(population) un courriel est rendu : un titre, des liens, un texte, un cadre', gras.length === 1 && ancres.length > 0 && pres.length === 1 && cadres.length === 1, [gras.length, ancres.length, pres.length, cadres.length]);
    egal('seuls les liens http(s) deviennent cliquables (javascript:, data:, ftp: écartés, ainsi que null et 42)', ancres.map(a => a.attrs.href), ['https://test.teamop.fr/reinit.html?x=1', 'http://test.teamop.fr/a', 'https://test.teamop.fr/b']);
    egal('le texte d\'un lien est celui du courriel (ou l\'adresse à défaut)', ancres.map(a => a.textContent), ['https://test.teamop.fr/reinit.html?x=1', 'La page A', 'https://test.teamop.fr/b']);
    vrai('chaque ancre s\'ouvre dans un autre onglet (noopener)', ancres.every(a => a.attrs.target === '_blank' && /noopener/.test(a.attrs.rel)));
    vrai('⛔ l\'objet piégé (<img onerror>) entre comme TEXTE, pas comme élément', gras[0].textContent === 'Objet <img src=x onerror=alert(1)>' && gras[0].kids.length === 0);
    vrai('le texte du courriel entre comme texte', pres[0].textContent === '<b>texte brut</b>');
    vrai('le cadre du courriel tel que le client le voit : sandbox vide, contenu dans srcdoc', cadres[0].attrs.sandbox === '' && cadres[0].srcdoc === '<p>Bonjour</p>');
    let enTete = ''; parcourir(liste, e => { if (e.nom === 'p' && /exemple-essai/.test(e._t)) enTete = e._t; });
    vrai('les destinataires multiples sont joints (« à a, b ») et l\'expéditeur dit', /de ne-pas-repondre@exemple-essai\.fr — à client@exemple-essai\.fr, autre@exemple-essai\.fr/.test(enTete), enTete);
    vrai('le compteur dit « 1 courriel »', ge('compte').textContent === '1 courriel');
    const vide = await scenario({ status: 200, ok: true, json: () => Promise.resolve([]) });
    vrai('aucun courriel : la page le dit au lieu de rester blanche', /Aucun courriel capté/.test(vide.kids.map(k => k.textContent).join('')), vide.kids.map(k => k.textContent));
    const non = await scenario({ status: 404, ok: false, json: () => Promise.resolve({}) });
    vrai('route absente (404) : « ce serveur n\'est pas un serveur de test »', /pas un serveur de test/.test(non.kids.map(k => k.textContent).join('')), non.kids.map(k => k.textContent));
    const refus = await scenario({ status: 403, ok: false, json: () => Promise.resolve({}) });
    vrai('clé refusée (403) : la page le dit', /clé d'essais est refusée/.test(refus.kids.map(k => k.textContent).join('')), refus.kids.map(k => k.textContent));
    const forme = await scenario({ status: 200, ok: true, json: () => Promise.resolve({ courriels: [{ sujet: 'Autre forme', from: 'x@exemple-essai.fr', to: 'y@exemple-essai.fr', date: 'pas une date' }] }) });
    let titres = []; parcourir(forme, e => { if (e.nom === 'b') titres.push(e.textContent); });
    egal('la page accepte aussi {courriels:[…]} (sujet/from/to) sans casser sur une date illisible', titres, ['Autre forme']);
    fin();
  })().catch(e => { vrai('l\'exécution de courriels.html ne jette pas', false, String(e && e.stack || e).slice(0, 300)); fin(); });
}

function fin() {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* idem */ }
  console.log('\n════ test-2986 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
}
