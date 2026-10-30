/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DES AGENTS DE LA TOUR, SES VRAIES FONCTIONS (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §6 et §11).
   Les fonctions de `tour.html` sont EXTRAITES du fichier livré et exécutées (jamais recopiées) : l'analyse et la coloration des mentions, la liste du « @ »
   (accents, casse, ceux déjà cités), le choix au clavier, ce que fait chaque touche, les morceaux d'HTML — et la machine d'envoi : le message PARAÎT À
   L'INSTANT (avant la réponse du serveur), puis il est confirmé ; un refus ou une coupure se DIT (« Non envoyé — réessayer »), et le réessai passe.
   Ici le serveur est un `fetch` scripté (réponses choisies, requêtes relevées) ; la couture avec le VRAI serveur est dans `test-2883`.
     · UNE règle de mention : celle du serveur (`analyserMentions`). La page en garde une recopie (elle colore, elle ne décide de rien) : on les
       compare sur une batterie de textes difficiles (accents, casse, adresses, « @@ », emoji devant, @tous, un nom qui n'est pas du fil…) ;
     · une mention n'est colorée dans une bulle que si le SERVEUR l'a reconnue ; tout texte venu du serveur est échappé ;
     · ⛔ TROIS ÉTATS pour chaque lecture : un fil que le serveur n'a pas pu lire ne se dessine JAMAIS « Aucun message » ; une panne pendant la lecture
       incrémentale garde ce qu'on a et le dit ;
     · une réponse qui arrive après un changement de fil est jetée ; « lu » ne se pose que page visible et écran ouvert ;
     · les minuteries : écran ouvert ET page visible seulement, et un tour sur un autre écran les éteint ;
     · ⛔ le calque miroir de la saisie ne porte aucun espacement ni graisse de plus que la zone de texte (sinon les deux se désalignent).
   Contre-épreuve : `TOUR_FICHIER=<autre tour>` lit une autre version. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
/* ⛔ on cherche dans le CODE : un commentaire qui cite une fonction n'est pas la fonction (on ne retire que les blocs qui COMMENCENT une ligne) */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
console.log('── test-2882 : la messagerie de la Tour, ses vraies fonctions ──');

/* Le corps d'une déclaration, accolade fermante comprise. Il traverse chaînes, gabarits, commentaires (en ligne aussi) et expressions régulières :
   un « ' » dans un commentaire (« l'écran ») ne doit pas fausser le compte. */
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev) ) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['msNorm', 'msMentions', 'msIds', 'msColorer', 'msContexte', 'msPropositions', 'msInserer', 'msTouche', 'msHeureCourte', 'msJourLib', 'msAgentsParId', 'msEtat', 'msEstGroupe', 'msGroupePerso', 'msIconeHtml', 'msNomFil',
  'msBulleHtml', 'msEnvoiHtml', 'msEcritTexte', 'msEcritHtml', 'msFluxHtml', 'msLigneFil', 'msListeHtml', 'msTacheTxt', 'msTachesHtml', 'msSousTitre', 'msPlaceholder',
  'msAjouterServeur', 'msEnvoyer', 'msEnvoiFaire', 'msReessayer', 'msRetirer', 'messListeCharger', 'messAgentsCharger', 'messTachesCharger', 'messToutCharger', 'messFilCharger', 'messLire', 'messFilTot',
  'messTimers', 'messDemonter', 'messOuvrir', 'messOuvrirFil', 'messChoisir', 'messDossier', 'messNonLusCharger', 'messReleve',
  'fmtHeure', 'agParams', 'apiGet', 'apiPost', 'acSquel', 'agAvatar'];
const FN = NOMS.map(fonction);
const VAR_MS = corps('var MS={') + ';';
const VARS = [ligne('var MS_GROUPES_LIB='), ligne('var MS_COULEURS='), ligne('var MS_ETAT_LIB='), ligne('var AG_PHOTOS='), corps('var AG_TYPES=') + ';'].join('\n');
vrai('(population) les ' + NOMS.length + ' fonctions, MS et les tables sont trouvés dans le fichier livré', ESC && FN.every(f => f.length > 30) && VAR_MS.length > 100 && VARS.length > 100,
  NOMS.filter((n, i) => FN[i].length <= 30).join(', '));

/* ── la page, face à un serveur scripté ── */
const { analyserMentions } = require(path.join(RACINE, 'server', 'conversations.js'));
function monde(o) {
  o = o || {};
  const j = { appels: [], peint: [], ordre: [], file: [], timers: [], effaces: [], dom: {}, bdg: [] };
  const rep = (st, d) => new Response(typeof d === 'string' ? d : JSON.stringify(d), { status: st, headers: { 'Content-Type': 'application/json' } });
  const ctx = {
    API: 'https://api.teamop.fr', Object, String, JSON, Promise, Math, Number, Array, Date, Error, Response, console, TypeError, setTimeout: (f, ms) => { j.timeouts = (j.timeouts || []).concat([ms]); return 1; },
    TAB: 'messagerie', MYROLE: 'patron', MYAPPS: ['gestion'], AG: { sec: '' }, document: { visibilityState: 'visible' },
    setInterval: (f, ms) => { j.timers.push({ f, ms }); return j.timers.length; }, clearInterval: id => { if (id) j.effaces.push(id); },
    $: id => j.dom[id] || null, setBdg: (id, n) => j.bdg.push([id, n]), setTab: t => { j.ordre.push('setTab:' + t); }, agDosOuvrir: () => {}, doLogout: () => {},
    messPeindreFil: c => { j.peint.push(['fil', !!c]); j.ordre.push('peint'); }, messPeindreListe: () => j.peint.push(['liste']), messPeindreEntete: () => j.peint.push(['entete']),
    messPeindreTaches: () => j.peint.push(['taches']), messPeindreSaisie: f => j.peint.push(['saisie', !!f]), messPeindrePanneau: () => {}, messMentionPeindre: () => {}, messMiroir: () => {},
    messMentionFermer: () => {}, messDescendre: () => {}, messNouvCacher: () => {},
    fetch: (url, opt) => { j.appels.push([String(url).replace('https://api.teamop.fr', ''), opt && opt.method || 'GET', opt && opt.body ? JSON.parse(opt.body) : null]); j.ordre.push('fetch');
      const r = j.file.length ? j.file.shift() : null;
      if (r === 'coupure') return Promise.reject(new TypeError('Failed to fetch'));
      if (typeof r === 'function') return r();
      if (!r) return Promise.resolve(rep(404, { error: 'non scripté' }));
      return Promise.resolve(rep(r.st || 200, r.d !== undefined ? r.d : {})); } };
  vm.createContext(ctx);
  ctx.hAuth = () => ({}); ctx.srvRepond = r => r; ctx.srvMuet = e => { throw e; };
  vm.runInContext(ESC + '\n' + VARS + '\n' + VAR_MS + '\n' + FN.join('\n') + '\n' + NOMS.concat(['MS']).map(n => 'this.' + n + '=' + n + ';').join(''), ctx);
  return { ctx, j, rep };
}

/* ═══════ 1. LA RÈGLE DES MENTIONS — celle du serveur, recopiée, comparée ═══════ */
console.log('\n1. Les mentions : la recopie de la page suit la règle du serveur');
{
  const { ctx } = monde();
  const noms = [['victor', 'Victor'], ['ines', 'Inès'], ['camille', 'Camille'], ['hugo', 'Hugo'], ['margaux', 'Margaux'], ['lea', 'Léa'], ['max', 'Max'], ['nina', 'Nina'], ['theo', 'Théo'], ['jules', 'Jules'], ['chloe', 'Chloé'], ['emma', 'Emma'], ['louis', 'Louis'], ['sarah', 'Sarah'], ['lola', 'Lola'], ['noah', 'Noah']].map(([id, nom]) => ({ id, nom }));
  const EQ = noms, CL = noms.filter(m => ['lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma'].includes(m.id)), PRIVE = [noms[2]];
  const TEXTES = ['@Camille', '@camille', '@CAMILLE', '@camil', '@Léa', '@lea', '@LÉA', '@Lea,', '(@Camille)', '“@Hugo”', 'salut@camille.fr', 'jean@camille.fr @hugo', '@@camille', 'a @tous', '@équipe', '@EQUIPE',
    '@Tous!', '@tous2', '@Inconnu', '@', '@@', 'x@', '@Camille@Hugo', '@Camille.@Hugo', '😀@Camille', 'é@Camille', '_@Camille', '1@Camille', '@Camille\n@Hugo', '@camille @camille', '@hugo @camille',
    'email: a.b@c.fr', '@Chloé @chloe', '@nina_', '@Max-Hugo', '@Victor.', 'mail @Margaux', '@Théo @theo @THÉO', '', '   ', '@Inès @ines', 'Bonjour @tous, @Camille vous faites ça ?', '@Emma\t@Louis', '#@Hugo', '/@Hugo', ':@Hugo', '—@Hugo'];
  let diff = [];
  for (const m of [EQ, CL, PRIVE]) for (const t of TEXTES) {
    const a = JSON.stringify(ctx.msIds(t, m)), b = JSON.stringify(analyserMentions(t, m));
    if (a !== b) diff.push([m.length, t, a, b]);
  }
  v('⛔ la page et le serveur reconnaissent les MÊMES mentions, dans le même ordre (' + TEXTES.length + ' textes × 3 fils)', diff, []);
  vrai('(population) la batterie contient des mentions reconnues ET des refus', TEXTES.some(t => analyserMentions(t, EQ).length) && TEXTES.some(t => t && !analyserMentions(t, EQ).length));
  v('@tous et @équipe : tous les membres DU FIL (6 dans « Clients »)', [ctx.msIds('@tous', CL).length, ctx.msIds('@équipe', CL).length, ctx.msIds('@tous', PRIVE)], [6, 6, ['camille']]);
  v('un nom qui n\'est pas du fil n\'est pas reconnu (Hugo dans le fil privé de Camille)', ctx.msIds('@Hugo', PRIVE), []);
  v('les spans : position exacte, mot, ids', ctx.msMentions('Salut @Camille et @tous !', CL).map(s => [s.debut, s.fin, s.mot, s.tous, s.ids.length]), [[6, 14, 'Camille', false, 1], [18, 23, 'tous', true, 6]]);
}

/* ═══════ 2. LA COLORATION — saisie et bulle ═══════ */
console.log('\n2. La coloration : reconnue = bleue, échappée, et d\'accord avec le serveur');
{
  const { ctx } = monde();
  const M = [{ id: 'camille', nom: 'Camille' }, { id: 'hugo', nom: 'Hugo' }, { id: 'lea', nom: 'Léa' }];
  v('la saisie : « @Camille » et « @Léa » colorées, « @Inconnu » non', ctx.msColorer('Bonjour @Camille, @Inconnu et @léa', M),
    'Bonjour <mark class="ms-m">@Camille</mark>, @Inconnu et <mark class="ms-m">@léa</mark>');
  v('⛔ tout est ÉCHAPPÉ : un texte hostile ne devient jamais une balise', ctx.msColorer('<img src=x onerror=alert(1)> @Camille "a" & \'b\'', M),
    '&lt;img src=x onerror=alert(1)&gt; <mark class="ms-m">@Camille</mark> &quot;a&quot; &amp; &#39;b&#39;');
  v('une bulle : coloré seulement ce que le SERVEUR a reconnu (mentions: ["camille"] → pas @Hugo)', ctx.msColorer('@Camille @Hugo', M, ['camille']), '<mark class="ms-m">@Camille</mark> @Hugo');
  v('une bulle sans mention reconnue par le serveur : rien de coloré, même si le nom existe', ctx.msColorer('@Camille', M, []), '@Camille');
  v('@tous n\'est coloré que si le serveur a cité TOUS les membres', [ctx.msColorer('@tous', M, ['camille', 'hugo', 'lea']), ctx.msColorer('@tous', M, ['camille'])], ['<mark class="ms-m">@tous</mark>', '@tous']);
  v('la saisie garde ses retours à la ligne (le calque les rend en pré-formaté)', ctx.msColorer('a\n@Hugo\n', M), 'a\n<mark class="ms-m">@Hugo</mark>\n');
  v('texte absent : chaîne vide, pas « undefined »', [ctx.msColorer(undefined, M), ctx.msColorer(null, M)], ['', '']);
}

/* ═══════ 3. LA LISTE DU « @ » ═══════ */
console.log('\n3. La liste du « @ » : filtrée sans accents ni casse, au clavier');
{
  const { ctx } = monde();
  const M = [['victor', 'Victor'], ['ines', 'Inès'], ['camille', 'Camille'], ['hugo', 'Hugo'], ['margaux', 'Margaux'], ['lea', 'Léa'], ['chloe', 'Chloé'], ['emma', 'Emma']].map(([id, nom]) => ({ id, nom }));
  const noms = (q, d) => ctx.msPropositions(q, M, d || []).map(x => x.tous ? '@tous' : x.nom);
  v('« @ » seul : @tous en tête, puis tous les membres, dans l\'ordre du fil', noms(''), ['@tous', 'Victor', 'Inès', 'Camille', 'Hugo', 'Margaux', 'Léa', 'Chloé', 'Emma']);
  v('« ca » : Camille (le préfixe)', noms('ca'), ['Camille']);
  v('« CA » (casse) : la même chose', noms('CA'), ['Camille']);
  v('« in » : Inès AVANT ceux qui le contiennent, et sans accent (« ine » trouve Inès)', [noms('in'), noms('ine')], [['Inès'], ['Inès']]);
  v('« lé » trouve Léa d\'abord (l\'accent tapé n\'empêche pas), puis Camille qui contient « le »', noms('lé'), ['Léa', 'Camille']);
  v('« h » : Hugo (préfixe) puis Chloé (contient) — le préfixe d\'abord', noms('h'), ['Hugo', 'Chloé']);
  v('« to » : @tous d\'abord (Entrée le choisit), puis Victor qui contient « to »', noms('to'), ['@tous', 'Victor']);
  v('« eq » (équipe) : @tous aussi', noms('eq'), ['@tous']);
  v('« zzz » : rien — la liste se ferme', noms('zzz'), []);
  v('ceux déjà cités n\'y reviennent pas (on enchaîne plusieurs personnes)', noms('', ['camille', 'hugo']).includes('Camille') || noms('', ['camille', 'hugo']).includes('Hugo'), false);
  v('…mais @tous reste proposé', noms('', ['camille'])[0], '@tous');
  v('un fil sans membre ne propose pas @tous', ctx.msPropositions('', [], []), []);
  /* le contexte : « @ca▮ » juste avant le curseur */
  v('contexte : « @ca » en fin de texte', ctx.msContexte('Bonjour @ca', 11), { debut: 8, q: 'ca' });
  v('contexte : le curseur au milieu — seul ce qui précède compte', ctx.msContexte('Bonjour @camille', 11), { debut: 8, q: 'ca' });
  v('contexte : « @ » seul', ctx.msContexte('@', 1), { debut: 0, q: '' });
  v('contexte : une adresse n\'ouvre pas la liste (jean@ca)', ctx.msContexte('jean@ca', 7), null);
  v('contexte : un mot après l\'espace ferme (« @ca bon »)', ctx.msContexte('@ca bon', 7), null);
  v('contexte : pas de « @ » du tout', ctx.msContexte('bonjour', 7), null);
  v('contexte : « @@ca » n\'ouvre rien (le second « @ » ne commence pas un mot)', ctx.msContexte('@@ca', 4), null);
  v('contexte : après un retour à la ligne', ctx.msContexte('ligne\n@h', 8), { debut: 6, q: 'h' });
  /* choisir */
  const camille = ctx.msPropositions('ca', M, [])[0];
  v('choisir : « @ca » devient « @Camille » + une espace, le curseur passe après', ctx.msInserer('Bonjour @ca', 11, { debut: 8, q: 'ca' }, camille), { texte: 'Bonjour @Camille ', caret: 17, ins: '@Camille ' });
  v('choisir devant une espace existante : pas de seconde espace, le curseur la saute', ctx.msInserer('@ca suite', 3, { debut: 0, q: 'ca' }, camille), { texte: '@Camille suite', caret: 9, ins: '@Camille' });
  v('choisir au milieu d\'un texte : le reste suit', ctx.msInserer('@ca,fin', 3, { debut: 0, q: 'ca' }, camille), { texte: '@Camille ,fin', caret: 9, ins: '@Camille ' });
  v('choisir @tous écrit « @tous »', ctx.msInserer('@to', 3, { debut: 0, q: 'to' }, ctx.msPropositions('to', M, [])[0]).texte, '@tous ');
  /* enchaînement complet, comme au clavier : @ca ⏎ @h ⇥ @to ⏎ */
  let t = '';
  const frappe = (suite, q) => { t += suite; const c = ctx.msContexte(t, t.length); const p = ctx.msPropositions(c.q, M, ctx.msIds(t.slice(0, c.debut), M)); const r = ctx.msInserer(t, t.length, c, p[0]); t = r.texte; };
  frappe('@ca'); frappe('@h'); frappe('@to');
  v('enchaîner trois choix : « @Camille @Hugo @tous »', t, '@Camille @Hugo @tous ');
  v('…et les trois sont reconnues (donc bleues)', ctx.msMentions(t, M).map(s => s.mot), ['Camille', 'Hugo', 'tous']);
}

/* ═══════ 4. LES TOUCHES ═══════ */
console.log('\n4. Les touches : ce que fait chacune, liste ouverte ou fermée');
{
  const { ctx } = monde();
  const T = (key, extra, etat) => ctx.msTouche(Object.assign({ key }, extra || {}), etat || { ouverte: false, n: 0 });
  const O = { ouverte: true, n: 3 };
  v('Entrée sans liste : envoie', T('Enter'), 'envoyer');
  v('Maj+Entrée : va à la ligne (rien ne part)', T('Enter', { shiftKey: true }), 'rien');
  v('Entrée liste ouverte : CHOISIT (n\'envoie pas)', T('Enter', {}, O), 'choisir');
  v('Tab liste ouverte : choisit', T('Tab', {}, O), 'choisir');
  v('Maj+Tab liste ouverte : laisse le navigateur faire', T('Tab', { shiftKey: true }, O), 'rien');
  v('Maj+Entrée liste ouverte : retour à la ligne, pas de choix', T('Enter', { shiftKey: true }, O), 'rien');
  v('↓ ↑ Échap liste ouverte', [T('ArrowDown', {}, O), T('ArrowUp', {}, O), T('Escape', {}, O)], ['suivant', 'precedent', 'fermer']);
  v('↓ ↑ Échap Tab liste fermée : rien (le navigateur garde la main)', [T('ArrowDown'), T('ArrowUp'), T('Escape'), T('Tab')], ['rien', 'rien', 'rien', 'rien']);
  v('liste « ouverte » mais vide : Entrée envoie', T('Enter', {}, { ouverte: true, n: 0 }), 'envoyer');
  v('⛔ composition en cours (dictée, accent mort, clavier asiatique) : Entrée ne part pas', [T('Enter', { isComposing: true }), T('Enter', { keyCode: 229 }), T('Enter', { isComposing: true }, O)], ['rien', 'rien', 'rien']);
  v('une lettre : rien', T('a'), 'rien');
  v('pas d\'événement : rien, sans planter', ctx.msTouche(null, null), 'rien');
}

/* ═══════ 5. LES MORCEAUX D'HTML ═══════ */
console.log('\n5. Les morceaux d\'écran : échappés, et honnêtes sur ce qu\'ils savent');
{
  const { ctx } = monde();
  const AG = [{ id: 'camille', nom: 'Camille', role: 'Courrier et support', mode: 'auto' }, { id: 'hugo', nom: 'Hugo', role: 'Paiements et accès', mode: 'brouillon' }, { id: 'nina', nom: 'Nina', role: 'Sécurité', mode: 'arret' },
    { id: 'zed', nom: '<b>Zed</b>', role: '"><script>x</script>', mode: 'inconnu' }];
  ctx.MS.agents = AG;
  const ag = ctx.msAgentsParId(), M = AG.map(a => ({ id: a.id, nom: a.nom }));
  v('l\'état d\'un agent : auto → allumé, brouillon, arrêt, un mode inconnu → à l\'arrêt', AG.map(a => ctx.msEtat(a)), ['allume', 'brouillon', 'arret', 'arret']);
  ctx.MS.pause = true;
  v('⛔ la pause générale : tout le monde à l\'arrêt', AG.map(a => ctx.msEtat(a)), ['arret', 'arret', 'arret', 'arret']);
  ctx.MS.pause = false; ctx.MS.illisible = true;
  v('⛔ un état illisible : tout le monde à l\'arrêt (la direction sûre)', AG.map(a => ctx.msEtat(a)), ['arret', 'arret', 'arret', 'arret']);
  ctx.MS.illisible = false;
  const m1 = { id: 'm1', ts: Date.now(), de: 'camille', nom: 'Camille', texte: 'Bonjour @Hugo <img src=x onerror=alert(1)>', niveau: 'info', mentions: ['hugo'] };
  const h1 = ctx.msBulleHtml(m1, M, ag);
  vrai('une bulle d\'agent : initiale sous sa photo, nom, rôle, mention colorée, texte échappé (la seule image est la photo)', /<span class="ms-av"[^>]*>C<img src="icons\/agents\/camille\.jpg"[^>]*><\/span>/.test(h1) && /<b>Camille<\/b>/.test(h1) && /Courrier et support/.test(h1) && /<mark class="ms-m">@Hugo<\/mark>/.test(h1) && (h1.match(/<img/g) || []).length === 1 && /&lt;img src=x/.test(h1), h1);
  const h2 = ctx.msBulleHtml({ id: 'm2', ts: Date.now(), de: 'justin', nom: 'Toi', texte: 'ok', niveau: 'info', mentions: [] }, M, ag);
  vrai('ma bulle : classe « moi », pas d\'avatar', /class="ms-b moi"/.test(h2) && !/ms-av/.test(h2), h2);
  const h3 = ctx.msBulleHtml({ id: 'm3', ts: Date.now(), de: 'systeme', nom: 'Système', texte: 'Camille a pris « <i>x</i> »', systeme: true, mentions: [] }, M, ag);
  vrai('une ligne du système : centrée, échappée, jamais une bulle de personne', /^<div class="ms-sys"/.test(h3) && !/<i>/.test(h3) && /&lt;i&gt;x/.test(h3), h3);
  const h4 = ctx.msBulleHtml({ id: 'm4', ts: Date.now(), de: 'camille', nom: 'Camille', texte: 'À rappeler', niveau: 'urgent', dossier: 'DOS-000123', mentions: [] }, M, ag);
  vrai('urgent et dossier : dits en toutes lettres (pas seulement une couleur), bouton « Ouvrir le dossier »', /class="ms-b urgent"/.test(h4) && />Urgent</.test(h4) && /data-act="dossier" data-dos="DOS-000123">Ouvrir le dossier DOS-000123</.test(h4), h4);
  const h5 = ctx.msBulleHtml({ id: 'm5', ts: Date.now(), de: 'zed', nom: '<b>Zed</b>', texte: 'x', niveau: 'info', mentions: [] }, M, ag);
  vrai('un nom et un rôle hostiles sont échappés', !/<b>Zed/.test(h5) && !/<script>/.test(h5) && /&lt;b&gt;Zed/.test(h5), h5);
  v('« X écrit… » : un nom, deux noms, trois, personne', [ctx.msEcritTexte([{ nom: 'Camille' }]), ctx.msEcritTexte([{ nom: 'Camille' }, { nom: 'Hugo' }]), ctx.msEcritTexte([{ nom: 'A' }, { nom: 'B' }, { nom: 'C' }]), ctx.msEcritTexte([]), ctx.msEcritHtml(undefined)],
    ['Camille écrit…', 'Camille et Hugo écrivent…', 'A, B et C écrivent…', '', '']);
  const H = ctx.msEnvoiHtml({ cle: 'local-1', texte: '@Hugo <b>x</b>', etat: 'envoi', raison: '' }, M), F = ctx.msEnvoiHtml({ cle: 'local-2', texte: 'a', etat: 'echec', raison: 'Message <i>non</i> enregistré' }, M);
  vrai('un message en cours d\'envoi : « Envoi… », mention colorée, échappé, aucun bouton', /Envoi…/.test(H) && /ms-envoi/.test(H) && /<mark class="ms-m">@Hugo<\/mark>/.test(H) && !/<b>x/.test(H) && !/data-act/.test(H), H);
  vrai('⛔ un message refusé DIT « Non envoyé — réessayer », la raison (échappée) et « retirer »', /role="alert"/.test(F) && /Non envoyé — <button[^>]*data-act="reessayer" data-cle="local-2">réessayer<\/button>/.test(F) && /Message &lt;i&gt;non&lt;\/i&gt; enregistré/.test(F) && /data-act="retirer"/.test(F), F);
  v('les jours : aujourd\'hui, hier, une date', [ctx.msJourLib(Date.UTC(2026, 9, 23, 10), Date.UTC(2026, 9, 23, 12)), ctx.msJourLib(Date.UTC(2026, 9, 22, 10), Date.UTC(2026, 9, 23, 12)), /octobre/.test(ctx.msJourLib(Date.UTC(2026, 9, 10, 10), Date.UTC(2026, 9, 23, 12)))], ['Aujourd’hui', 'Hier', true]);
  v('l\'heure courte : l\'heure aujourd\'hui, « hier », une date', [/^\d\d:\d\d$/.test(ctx.msHeureCourte(Date.UTC(2026, 9, 23, 10), Date.UTC(2026, 9, 23, 12))), ctx.msHeureCourte(Date.UTC(2026, 9, 22, 10), Date.UTC(2026, 9, 23, 12)), ctx.msHeureCourte(Date.UTC(2026, 9, 10, 10), Date.UTC(2026, 9, 23, 12)), ctx.msHeureCourte(0)], [true, 'hier', '10/10', '']);
  const f = ctx.msFluxHtml([{ id: 'a', ts: Date.UTC(2026, 9, 22, 10), de: 'camille', nom: 'Camille', texte: 'x', mentions: [] }, { id: 'b', ts: Date.UTC(2026, 9, 22, 11), de: 'camille', nom: 'Camille', texte: 'y', mentions: [] }, { id: 'c', ts: Date.UTC(2026, 9, 23, 9), de: 'camille', nom: 'Camille', texte: 'z', mentions: [] }], M, ag);
  v('le fil : une ligne de jour à chaque CHANGEMENT de jour (2 lignes pour 2 jours, pas 3)', (f.match(/class="ms-jour"/g) || []).length, 2);
  vrai('…et à la suite d\'un message déjà peint le même jour, aucune ligne de jour en trop', !/ms-jour/.test(ctx.msFluxHtml([{ id: 'b', ts: Date.UTC(2026, 9, 22, 11), de: 'camille', nom: 'Camille', texte: 'y', mentions: [] }], M, ag, { ts: Date.UTC(2026, 9, 22, 10) })));
  /* la liste de gauche */
  ctx.MS.fil = 'clients';
  ctx.MS.fils = [{ fil: 'equipe', nom: 'Équipe', groupe: true, nonLus: 0, membres: M, meneur: 'camille', ecrit: [], dernier: { ts: Date.now(), de: 'hugo', texte: 'ok' } },
    { fil: 'clients', nom: 'Clients', groupe: true, nonLus: 2, membres: M, meneur: 'camille', ecrit: [], dernier: { ts: Date.now(), de: 'justin', texte: 'Salut' } },
    { fil: 'camille', nom: 'Camille', groupe: false, nonLus: 1, membres: [M[0]], meneur: '', ecrit: [{ id: 'camille', nom: 'Camille' }], dernier: { ts: Date.now(), de: 'camille', texte: 'x' } },
    { fil: 'nina', nom: 'Nina', groupe: false, nonLus: 0, membres: [M[2]], meneur: '', ecrit: [], dernier: null },
    { fil: 'zed', nom: '<b>Zed</b>', groupe: false, nonLus: 0, membres: [], meneur: '', ecrit: [], dernier: { ts: Date.now(), de: 'systeme', texte: '<i>x</i>' } }];
  const L = ctx.msListeHtml();
  vrai('la liste : « Groupes » puis « Messages privés », le nom du groupe d\'équipe est « Équipe TeamOP »', /Groupes<\/div>[\s\S]*Messages privés<\/div>/.test(L) && /<b>Équipe TeamOP<\/b>/.test(L), L.slice(0, 300));
  vrai('le fil ouvert est marqué (aria-current), les autres non', /data-fil="clients" aria-current="true"/.test(L) && /data-fil="equipe" aria-current="false"/.test(L));
  vrai('non-lus : « 2 non lus » sur Clients, rien sur Équipe', /ms-nl" aria-label="2 non lus">2</.test(L) && !/data-fil="equipe"[^]*?ms-nl[^]*?data-fil="clients"/.test(L));
  vrai('« Camille écrit… » remplace le dernier message dans la liste', /class="ms-l3 ecrit">Camille écrit…</.test(L));
  vrai('un agent sans message montre son rôle ; un fil vide « Aucun message » n\'existe pas pour un agent', /Nina<\/b><\/span><span class="ms-l3">Sécurité</.test(L), L.slice(L.indexOf('Nina') - 40, L.indexOf('Nina') + 160));
  vrai('l\'état d\'un agent : pastille avec nom accessible (rôle img + libellé) — pas seulement une couleur', /class="ms-pt allume" role="img" aria-label="Allumé"/.test(L) && /class="ms-pt arret" role="img" aria-label="À l’arrêt"/.test(L), L);
  vrai('⛔ un nom de fil hostile et une ligne du système sont échappés', !/<b>Zed/.test(L) && !/<i>x/.test(L) && /&lt;b&gt;Zed/.test(L));
  vrai('un groupe n\'a pas de pastille d\'état', !/data-fil="clients"[^]*?ms-pt[^]*?data-fil="camille"/.test(L.replace(/data-fil="camille"[\s\S]*/, 'data-fil="camille"')));
  /* le sous-titre */
  ctx.MS.fil = 'equipe'; ctx.MS.membres = M; ctx.MS.meneur = 'camille';
  v('le sous-titre d\'un groupe de tous : « les 4 agents et toi · sans @mention, Camille répond »', ctx.msSousTitre(), 'les 4 agents et toi · sans @mention, Camille répond');
  ctx.MS.membres = M.slice(0, 2);
  v('…d\'un groupe restreint : les noms', ctx.msSousTitre(), 'Camille, Hugo et toi · sans @mention, Camille répond');
  ctx.MS.fil = 'hugo';
  v('…d\'un fil privé : le rôle et l\'état', ctx.msSousTitre(), 'Paiements et accès · brouillon');
  ctx.MS.fil = 'zed'; ctx.MS.membres = [];
  vrai('…un rôle hostile est échappé', !/<script>/.test(ctx.msSousTitre()), ctx.msSousTitre());
  v('le texte d\'aide de la saisie', ctx.msPlaceholder(), 'Écrire… — tape @ pour citer quelqu’un');
  /* Qui fait quoi */
  ctx.MS.tachesLec = 0; const t0 = ctx.msTachesHtml();
  ctx.MS.tachesLec = -1; const t1 = ctx.msTachesHtml();
  ctx.MS.tachesLec = 1; ctx.MS.taches = []; const t2 = ctx.msTachesHtml();
  vrai('⛔ TROIS ÉTATS : lecture en cours ≠ illisible (on ne sait pas qui fait quoi) ≠ vraiment aucune tâche', /Lecture des tâches/.test(t0) && /n’ont pas pu être lues/.test(t1) && /Réessayer/.test(t1) && /Aucune tâche ouverte/.test(t2) && !/Aucune tâche/.test(t1), [t0, t1, t2].join(' | '));
  const now = Date.now();
  ctx.MS.taches = [
    { id: 't1', ts: now - 3e5, de: 'justin', vers: 'camille', type: 'consigne', params: { texte: 'Répondre à <b>Société A</b>' }, statut: 'prise', passePar: [] },
    { id: 't2', ts: now - 2e5, de: 'justin', vers: 'hugo', type: 'consigne', params: { texte: 'Corriger le bouton' }, statut: 'prise', passePar: ['nina', 'camille'] },
    { id: 't3', ts: now - 1e5, de: 'camille', vers: 'nina', type: 'verifier_paiement', params: { espace: 'societe-c' }, statut: 'attente', passePar: [] },
    { id: 't4', ts: now - 9e4, de: 'justin', vers: 'camille', type: 'consigne', params: { texte: 'finie' }, statut: 'faite', passePar: [] },
    { id: 't5', ts: now - 8e4, de: 'justin', vers: 'camille', type: 'consigne', params: { texte: 'expirée' }, statut: 'expiree', passePar: [] }];
  const T3 = ctx.msTachesHtml().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const n = (ctx.msTachesHtml().match(/class="ms-tq"/g) || []).length;
  v('« Qui fait quoi » : les tâches OUVERTES seulement (prise, en attente) — 3 sur 5', n, 3);
  vrai('…qui, quoi, état, demandée par, déléguée (le dernier qui l\'a passée)', /Camille en cours/.test(T3) && /demandée par toi/.test(T3) && /Hugo en cours/.test(T3) && /déléguée, d’abord à Camille/.test(T3) && /Nina en attente/.test(T3) && /Vérifier un paiement/.test(T3) && /demandée par Camille/.test(T3), T3);
  vrai('…ni la finie ni l\'expirée', !/finie/.test(T3) && !/expirée/.test(T3));
  vrai('⛔ la phrase d\'une tâche est ÉCHAPPÉE', !/<b>Société A/.test(ctx.msTachesHtml()) && /&lt;b&gt;Société A/.test(ctx.msTachesHtml()));
  vrai('…et la page n\'invente PAS de priorité : le serveur n\'en donne pas, rien n\'en est dessiné', !/urgent|haute|priorit/i.test(T3));
}

/* ═══════ 6. L'ENVOI : à l'instant, puis confirmé — ou dit ═══════ */
console.log('\n6. L\'envoi : le message paraît à l\'instant ; un refus se dit ; le réessai passe');
(async () => {
  {
    const { ctx, j, rep } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1; ctx.MS.msgs = [{ id: 'a1', ts: 1, de: 'hugo', texte: 'x', mentions: [] }]; ctx.MS.dernier = 'a1';
    let lache; j.file.push(() => new Promise(res => { lache = () => res(rep(200, { ok: true, message: { id: 'srv1', ts: 5, fil: 'clients', de: 'justin', nom: 'Toi', texte: '@Camille salut', niveau: 'info', lu: true, mentions: ['camille'], prof: 0, systeme: false } })); }));
    const p = ctx.msEnvoyer('clients', '  @Camille salut  ');
    v('⛔ À L\'INSTANT : le message est dans la file ET l\'écran a été repeint AVANT l\'appel au serveur', [ctx.MS.envois.length, ctx.MS.envois[0].etat, ctx.MS.envois[0].texte, j.ordre.indexOf('peint') >= 0 && j.ordre.indexOf('peint') < j.ordre.indexOf('fetch')], [1, 'envoi', '@Camille salut', true]);
    v('…le serveur n\'a pas encore répondu : la liste du serveur n\'a pas bougé', ctx.MS.msgs.length, 1);
    v('…le corps envoyé : le fil et le texte (sans les espaces de bord), rien d\'autre', j.appels[0], ['/api/monitor/conversations/envoyer', 'POST', { fil: 'clients', texte: '@Camille salut' }]);
    lache(); await p;
    v('confirmé : la bulle locale disparaît, le message du serveur (avec son identifiant) la remplace — UNE seule fois', [ctx.MS.envois.length, ctx.MS.msgs.map(m => m.id), ctx.MS.dernier], [0, ['a1', 'srv1'], 'srv1']);
    vrai('…et le fil se relit juste après (la réponse d\'un agent peut arriver vite)', (j.timeouts || []).includes(1200));
  }
  {
    /* la lecture a livré le message AVANT la réponse du POST : pas de doublon */
    const { ctx, j, rep } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1; ctx.MS.msgs = []; ctx.MS.dernier = '';
    const m = { id: 'srv9', ts: 5, fil: 'clients', de: 'justin', nom: 'Toi', texte: 'x', niveau: 'info', lu: true, mentions: [] };
    j.file.push({ d: { ok: true, message: m } });
    const p = ctx.msEnvoyer('clients', 'x'); ctx.msAjouterServeur('clients', [m]); await p;
    v('⛔ pas de doublon quand la lecture a devancé la réponse (même identifiant)', ctx.MS.msgs.map(x => x.id), ['srv9']);
    v('…un message d\'un AUTRE fil que celui qu\'on regarde ne s\'ajoute pas', [ctx.msAjouterServeur('equipe', [{ id: 'z', ts: 1 }]).length, ctx.MS.msgs.length], [0, 1]);
  }
  {
    const { ctx, j, rep } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1;
    j.file.push({ st: 503, d: { error: 'Message non enregistré' } });
    await ctx.msEnvoyer('clients', 'Bonjour');
    const e = ctx.MS.envois[0];
    v('⛔ refus du serveur (503) : le message RESTE, marqué « echec », avec la raison du serveur', [ctx.MS.envois.length, e.etat, e.raison], [1, 'echec', 'Message non enregistré']);
    vrai('…et l\'écran le dit : « Non envoyé — réessayer »', /Non envoyé — <button/.test(ctx.msEnvoiHtml(e, [])) && /Message non enregistré/.test(ctx.msEnvoiHtml(e, [])));
    j.file.push({ st: 200, d: { ok: true, message: { id: 'srv2', ts: 9, fil: 'clients', de: 'justin', nom: 'Toi', texte: 'Bonjour', niveau: 'info', lu: true, mentions: [] } } });
    await ctx.msReessayer(e.cle);
    v('« réessayer » : le MÊME message repart (même texte), confirmé, plus aucun message en attente', [j.appels[1][2], ctx.MS.envois.length, ctx.MS.msgs.map(m => m.id)], [{ fil: 'clients', texte: 'Bonjour' }, 0, ['srv2']]);
    v('réessayer un message qui n\'est pas en échec : rien ne part', [await ctx.msReessayer('local-inconnu'), j.appels.length], [null, 2]);
  }
  {
    const { ctx, j } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1;
    j.file.push({ st: 404, d: '<html>pas du json</html>' });
    await ctx.msEnvoyer('clients', 'x');
    v('un refus qui n\'est pas du JSON (404 d\'un relais) : dit avec son code', ctx.MS.envois[0].raison, 'Le serveur a refusé (404)');
    j.file.push('coupure');
    await ctx.msEnvoyer('clients', 'y');
    v('⛔ serveur injoignable : « Serveur injoignable », le message reste', [ctx.MS.envois[1].etat, ctx.MS.envois[1].raison, ctx.MS.envoi], ['echec', 'Serveur injoignable', 0]);
    const cle = ctx.MS.envois[1].cle;
    ctx.$ = id => id === 'ms-ta' ? (ctx.__ta = ctx.__ta || { value: '' }) : null;
    ctx.msRetirer(cle);
    v('« retirer » : la bulle part et son texte revient dans la saisie vide', [ctx.MS.envois.length, ctx.MS.brouillons.clients], [1, 'y']);
  }
  {
    const { ctx, j } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1; ctx.MYROLE = 'collaborateur';
    v('⛔ lecture seule : un non-patron n\'envoie rien (aucun appel, aucune bulle)', [await ctx.msEnvoyer('clients', 'x'), j.appels.length, ctx.MS.envois.length], [null, 0, 0]);
    ctx.MYROLE = 'patron';
    v('un message vide ou fait d\'espaces ne part pas', [await ctx.msEnvoyer('clients', '   \n '), await ctx.msEnvoyer('clients', ''), j.appels.length], [null, null, 0]);
  }
  {
    /* le serveur ne dit pas « ok » sans message : ce n'est PAS une réussite */
    const { ctx, j } = monde();
    ctx.MS.fil = 'clients'; ctx.MS.msgLec = 1;
    j.file.push({ st: 200, d: { ok: true } });
    await ctx.msEnvoyer('clients', 'x');
    v('⛔ une réponse 200 sans message n\'est pas une confirmation : le message reste en attente de réessai', [ctx.MS.envois[0].etat, ctx.MS.msgs.length], ['echec', 0]);
  }

  /* ═══════ 7. LES LECTURES — trois états, incrémental, réponse tardive ═══════ */
  console.log('\n7. Les lectures : trois états, incrémentale, réponse tardive jetée');
  {
    const { ctx, j } = monde();
    ctx.MS.fil = 'equipe'; ctx.MS.msgLec = 1; ctx.MS.msgs = [{ id: 'a', ts: 1, de: 'hugo', texte: 'x', mentions: [] }, { id: 'b', ts: 2, de: 'hugo', texte: 'y', mentions: [] }]; ctx.MS.dernier = 'b';
    j.file.push({ d: { ok: true, membres: [{ id: 'hugo', nom: 'Hugo' }], meneur: 'victor', ecrit: [{ id: 'camille', nom: 'Camille' }], complet: false, messages: [{ id: 'c', ts: 3, de: 'camille', texte: 'z', lu: true, mentions: [] }] } });
    await ctx.messFilCharger(true);
    v('incrémentale : on demande après le DERNIER message connu, et on ajoute sans réécrire', [j.appels[0][0], ctx.MS.msgs.map(m => m.id), ctx.MS.dernier, j.peint.filter(p => p[0] === 'fil').pop()], ['/api/monitor/conversations/equipe?apres=b', ['a', 'b', 'c'], 'c', ['fil', false]]);
    v('…« écrit… », les membres et le meneur viennent du serveur', [ctx.MS.ecrit.map(x => x.nom), ctx.MS.membres.length, ctx.MS.meneur], [['Camille'], 1, 'victor']);
    j.file.push({ d: { ok: true, membres: [], meneur: '', ecrit: [], complet: true, messages: [{ id: 'z', ts: 9, de: 'hugo', texte: 'seul', lu: true, mentions: [] }] } });
    await ctx.messFilCharger(true);
    v('⛔ fil rogné (identifiant introuvable, « complet:true ») : on REMPLACE tout et on le repeint en entier', [ctx.MS.msgs.map(m => m.id), j.peint.filter(p => p[0] === 'fil').pop()], [['z'], ['fil', true]]);
    /* panne PENDANT la lecture incrémentale : on garde ce qu'on a et on le dit */
    j.file.push('coupure');
    await ctx.messFilCharger(true);
    v('⛔ panne pendant la lecture incrémentale : les messages restent, l\'écran dit « mise à jour impossible »', [ctx.MS.msgs.length, ctx.MS.msgLec, ctx.MS.retard], [1, 1, true]);
    j.file.push({ d: { ok: true, membres: [], meneur: '', ecrit: [], complet: false, messages: [] } });
    await ctx.messFilCharger(true);
    v('…le retour du réseau efface l\'avertissement', ctx.MS.retard, false);
  }
  {
    const { ctx, j } = monde();
    ctx.MS.fil = 'equipe';
    j.file.push({ st: 503, d: { error: 'Les conversations sont illisibles' } });
    await ctx.messFilCharger(false);
    v('⛔ TROIS ÉTATS : un fil que le serveur n\'a pas pu lire (503) est « −1 », jamais « vide »', [ctx.MS.msgLec, ctx.MS.msgs.length], [-1, 0]);
    j.file.push({ d: { ok: true, membres: [], meneur: '', ecrit: [], complet: true, messages: [] } });
    await ctx.messFilCharger(true);
    v('…l\'interrogation périodique REPREND en entier un fil qu\'on n\'avait pas pu lire (sans « apres »)', [j.appels[1][0], ctx.MS.msgLec], ['/api/monitor/conversations/equipe', 1]);
    v('…et un fil lu et vide est bien « 1 » avec zéro message (une vraie réponse)', [ctx.MS.msgLec, ctx.MS.msgs.length], [1, 0]);
    j.file.push({ d: { ok: true, fil: 'equipe' } });
    ctx.MS.msgLec = 0; await ctx.messFilCharger(false);
    v('une réponse sans liste de messages : « on n\'a pas su », pas « vide »', ctx.MS.msgLec, -1);
  }
  {
    const { ctx, j, rep } = monde();
    ctx.MS.fil = 'equipe'; ctx.MS.msgLec = 1; ctx.MS.msgs = [{ id: 'a', ts: 1, de: 'hugo', texte: 'x', mentions: [] }]; ctx.MS.dernier = 'a';
    let lache; j.file.push(() => new Promise(res => { lache = () => res(rep(200, { ok: true, membres: [{ id: 'hugo', nom: 'Hugo' }], meneur: 'hugo', ecrit: [{ id: 'hugo', nom: 'Hugo' }], complet: false, messages: [{ id: 'tard', ts: 5, de: 'hugo', texte: 'tard', lu: false, mentions: [] }] })); }));
    const p = ctx.messFilCharger(true);
    ctx.MS.fil = 'clients'; ctx.MS.msgs = []; ctx.MS.msgLec = 1; ctx.MS.dernier = ''; ctx.MS.membres = [{ id: 'lea', nom: 'Léa' }]; ctx.MS.meneur = 'lea'; ctx.MS.ecrit = [];
    lache(); await p;
    v('⛔ une réponse qui arrive APRÈS un changement de fil est jetée en entier : ni messages, ni membres, ni meneur, ni « écrit… » d\'un autre fil', [ctx.MS.msgs, ctx.MS.membres.map(m => m.id), ctx.MS.meneur, ctx.MS.ecrit], [[], ['lea'], 'lea', []]);
    /* pas deux lectures du même fil en même temps */
    ctx.MS.fil = 'equipe'; ctx.MS.msgLec = 1; ctx.MS.msgs = [{ id: 'a' }]; ctx.MS.dernier = 'a'; j.appels.length = 0; ctx.MS.enVol = '';
    let l2; j.file.push(() => new Promise(res => { l2 = () => res(rep(200, { ok: true, membres: [], meneur: '', ecrit: [], complet: false, messages: [] })); }));
    const p1 = ctx.messFilCharger(true), p2 = ctx.messFilCharger(true);
    l2(); await Promise.all([p1, p2]);
    v('deux lectures incrémentales simultanées du même fil : UNE seule requête', j.appels.length, 1);
    ctx.MS.envoi = 1; j.appels.length = 0; await ctx.messFilCharger(true); ctx.MS.envoi = 0;
    v('⛔ pendant un envoi, la lecture périodique se tait (elle montrerait le message deux fois)', j.appels.length, 0);
    ctx.MS.msgLec = 0; j.appels.length = 0; await ctx.messFilCharger(true);
    v('une lecture incrémentale ne devance pas la première (fil pas encore lu) : rien ne part', j.appels.length, 0);
    ctx.MS.msgLec = 1; ctx.MS.vueMob = 'liste'; await ctx.messFilCharger(true); ctx.MS.vueMob = 'fil';
    v('au téléphone, le fil caché derrière la liste ne se relit pas toutes les 4 s', j.appels.length, 0);
  }
  {
    /* « lu » : seulement après affichage, page visible, écran ouvert */
    const { ctx, j } = monde();
    ctx.MS.fil = 'margaux'; ctx.MS.msgs = [{ id: 'a', lu: false }, { id: 'b', lu: true }];
    const NON = [{ id: 'a', lu: false }];
    ctx.MS.inst = null; ctx.messLire(NON);
    ctx.MS.inst = { zone: {} }; ctx.document.visibilityState = 'hidden'; ctx.messLire(NON);
    ctx.document.visibilityState = 'visible'; ctx.TAB = 'accueil'; ctx.messLire(NON);
    ctx.TAB = 'messagerie'; ctx.messLire([{ id: 'x', lu: true }]); ctx.messLire([]); ctx.messLire(undefined);
    ctx.MS.vueMob = 'liste'; ctx.messLire(NON); ctx.MS.vueMob = 'fil';
    v('⛔ « lu » ne se pose NI sans écran, NI page cachée, NI sur un autre écran, NI sans message non lu, NI quand le fil est caché derrière la liste (téléphone) : aucun appel', j.appels.length, 0);
    j.file.push({ d: { ok: true, lus: 1 } }, { d: { ok: true, fils: [{ fil: 'margaux', nom: 'Margaux', groupe: false, nonLus: 0, membres: [], meneur: '', ecrit: [], dernier: null }], nonLus: 0, agents: [] } });
    ctx.messLire(NON); await dormir(60);
    v('page visible, écran ouvert, message non lu : UN appel « lire », puis la liste se relit', [j.appels.map(a => a[0] + ' ' + a[1]), ctx.MS.msgs.map(m => m.lu), j.bdg.pop()], [['/api/monitor/conversations/lire POST', '/api/monitor/conversations?tous=1 GET'], [true, true], ['bdg-msgr', 0]]);
    v('…le corps de « lire » nomme le fil', j.appels[0][2], { fil: 'margaux' });
  }
  {
    /* la liste : trois états aussi */
    const { ctx, j } = monde();
    j.file.push({ st: 503, d: { error: 'illisible' } });
    await ctx.messListeCharger();
    v('⛔ la liste que le serveur n\'a pas pu lire : « −1 » (le bouton Réessayer), jamais « aucun fil »', [ctx.MS.lec, ctx.MS.fils.length], [-1, 0]);
    j.file.push({ d: { ok: true, fils: [{ fil: 'equipe', nom: 'Équipe', groupe: true, nonLus: 2, membres: [], meneur: '', ecrit: [], dernier: null }, { fil: 'hugo', nom: 'Hugo', groupe: false, nonLus: 3, membres: [], meneur: '', ecrit: [], dernier: null }], nonLus: 5, agents: [] } });
    await ctx.messListeCharger();
    v('lue : deux fils, 5 non lus, la pastille du menu suit (bdg-msgr = 5)', [ctx.MS.lec, ctx.MS.fils.length, ctx.MS.nonLus, j.bdg.pop()], [1, 2, 5, ['bdg-msgr', 5]]);
    j.file.push('coupure');
    await ctx.messListeCharger();
    v('⛔ une panne PLUS TARD garde la liste qu\'on avait (elle ne devient pas « −1 »)', [ctx.MS.lec, ctx.MS.fils.length], [1, 2]);
    j.file.push({ d: { ok: true, agents: [{ id: 'hugo', nom: 'Hugo', role: 'x', mode: 'auto' }], pause: { actif: true }, illisible: false } });
    await ctx.messAgentsCharger();
    v('les agents : la pause générale est lue (tous à l\'arrêt)', [ctx.MS.agents.length, ctx.MS.pause, ctx.msEtat(ctx.MS.agents[0])], [1, true, 'arret']);
    j.file.push({ st: 503, d: {} });
    ctx.MS.tachesLec = 0; await ctx.messTachesCharger();
    v('⛔ les tâches illisibles : « −1 » (« on ne sait pas qui fait quoi »), jamais « aucune tâche »', ctx.MS.tachesLec, -1);
  }

  /* ═══════ 8. LES MINUTERIES ═══════ */
  console.log('\n8. Les minuteries : écran ouvert ET page visible — et rien d\'autre');
  {
    const { ctx, j } = monde();
    ctx.MS.inst = { zone: {} };
    ctx.messTimers(true);
    v('écran ouvert, page visible : deux minuteries — le fil toutes les 4 s, la liste toutes les 15 s', j.timers.map(t => t.ms), [4000, 15000]);
    j.timers.length = 0; ctx.document.visibilityState = 'hidden';
    ctx.messTimers(true);
    v('⛔ page CACHÉE : aucune minuterie', j.timers.length, 0);
    ctx.document.visibilityState = 'visible'; ctx.MS.inst = null;
    ctx.messTimers(true);
    v('⛔ sans écran monté : aucune minuterie', j.timers.length, 0);
    for (const [quel, nom] of [[0, 'du fil (4 s)'], [1, 'de la liste (15 s)']]) {
      ctx.TAB = 'messagerie'; ctx.MS.inst = { zone: {} }; ctx.messTimers(true); const tic = j.timers.slice(-2); j.appels.length = 0; j.effaces.length = 0;
      ctx.TAB = 'accueil'; tic[quel].f();
      v('⛔ un tour ' + nom + ' sur un AUTRE écran n\'appelle rien et éteint les minuteries (une minuterie qui survit redessine un autre écran)', [j.appels.length, j.effaces.length >= 2, ctx.MS.tFil, ctx.MS.tListe], [0, true, 0, 0]);
    }
    ctx.TAB = 'messagerie'; ctx.MS.inst = { zone: {} }; ctx.MS.msgLec = 1; ctx.MS.msgs = [{ id: 'a' }]; ctx.MS.dernier = 'a'; ctx.messTimers(true); const t2 = j.timers.slice(-2); j.appels.length = 0;
    j.file.push({ d: { ok: true, membres: [], ecrit: [], messages: [], complet: false } });
    t2[0].f(); await dormir(30);
    v('un tour du fil : relit le fil après le dernier message', j.appels.map(a => a[0]), ['/api/monitor/conversations/equipe?apres=a']);
    j.appels.length = 0; j.file.push({ d: { ok: true, fils: [], nonLus: 0, agents: [] } }, { d: { ok: true, agents: [] } }, { d: { ok: true, taches: [] } });
    t2[1].f(); await dormir(60);
    v('un tour de la liste : la liste, les agents et les tâches (trois lectures)', j.appels.map(a => a[0]).sort(), ['/api/monitor/agents', '/api/monitor/agents/taches', '/api/monitor/conversations?tous=1']);
    ctx.$ = id => id === 'ms-ta' ? { value: 'brouillon en cours' } : null; ctx.MS.fil = 'hugo';
    ctx.messDemonter();
    v('quitter l\'écran : minuteries éteintes, écran démonté, le brouillon du fil est gardé en mémoire', [ctx.MS.inst, ctx.MS.tFil, ctx.MS.tListe, ctx.MS.brouillons.hugo], [null, 0, 0, 'brouillon en cours']);
    /* la pastille de fond */
    const w = monde(); w.ctx.TAB = 'accueil'; w.j.file.push({ d: { ok: true, fils: [], nonLus: 4, agents: [] } });
    w.ctx.messNonLusCharger(); await dormir(40);
    v('la pastille du menu se relève hors de l\'écran (route légère, sans « tous »)', [w.j.appels[0][0], w.j.bdg.pop()], ['/api/monitor/conversations', ['bdg-msgr', 4]]);
    const c = monde(); c.ctx.MYROLE = 'collaborateur'; c.ctx.messNonLusCharger(); c.ctx.messReleve();
    v('⛔ un collaborateur : aucune relève (les routes sont au patron seul)', [c.j.appels.length, c.j.timers.length], [0, 0]);
    const g = monde(); g.ctx.messReleve(); g.ctx.messReleve();
    v('la relève du menu se pose UNE fois (une minuterie de vingt secondes : le rond d’OP MESSAGES à chaque tour, l’ancienne relève une fois sur trois — v2.127)', g.j.timers.map(t => t.ms), [20000]);
  }
  {
    /* ouvrir : « Parler à X » et les liens */
    const { ctx, j } = monde();
    ctx.MS.inst = null; ctx.messOuvrirFil('margaux');
    v('« Parler à Margaux » depuis une autre page : on ouvre la messagerie, sur ce fil', [ctx.MS.fil, ctx.MS.voulu, j.ordre.filter(x => /setTab/.test(x))], ['margaux', true, ['setTab:messagerie']]);
    ctx.messOuvrir();
    v('ouvrir l\'écran relit tout (liste, agents, tâches, fil) et repart d\'un fil non lu', [j.appels.map(a => a[0]).sort(), ctx.MS.msgLec], [['/api/monitor/agents', '/api/monitor/agents/taches', '/api/monitor/conversations/margaux', '/api/monitor/conversations?tous=1'], 0]);
    const k = monde(); k.ctx.MYROLE = 'collaborateur'; k.ctx.messOuvrir();
    v('⛔ un collaborateur n\'appelle aucune route de messagerie (patron seul)', k.j.appels.length, 0);
  }

  /* ═══════ 9. LE FICHIER LIVRÉ ═══════ */
  console.log('\n9. Le fichier livré : câblage, menu, droits, calque');
  {
    const SANS = CODE;
    const menu = /\['agents','Agents','gestion'\],\['messagerie','Messagerie','gestion','bdg-msgr'\],\['rapport','Rapport','gestion'/.test(SANS);
    vrai('le menu : « Messagerie » dans ÉQUIPE D\'AGENTS, entre Agents et Rapport, avec sa pastille', menu);
    vrai('⛔ les mêmes droits que l\'onglet Agents : « messagerie » est au patron seul (PATRON_SEUL)', /var PATRON_SEUL=\[[^\]]*'agents','messagerie'/.test(SANS));
    vrai('une icône, et un nom court pour la barre du bas', /\n  messagerie:'<path d=/.test(SANS) && /messagerie:'Messag\.'/.test(SANS));
    /* v2.120 (28 octobre 2026 au soir, « là je veux OP MESSAGES avec les mêmes fonctions que OP MESSAGES Pro ») : la Messagerie AFFICHE le vrai OP MESSAGES dans un cadre (`opmMonter`) ; l'ANCIENNE messagerie
       que ce fichier garde n'est montée que si on la demande (`OPM.ancienne`, « Ancienne messagerie de la Tour »), et seule elle se relit à l'ouverture. Le montage du cadre est gardé par `test-3127`. */
    vrai('setTab relit l\'ancienne messagerie à chaque ouverture (et elle seule : le cadre d\'OP MESSAGES se relit tout seul)', /if\(t==='messagerie'&&OPM\.ancienne\) messOuvrir\(\);/.test(SANS));
    vrai('renderVue monte l\'ancienne UNE fois (messGarde) quand elle est choisie et l\'arrête en la quittant ; le CADRE d\'OP MESSAGES, lui, vit hors de #vue (opmHote) et n\'est plus détruit en quittant — v2.120, relecture (test-3127 § 5 bis le joue)', /else if\(TAB==='messagerie'\)\{ if\(OPM\.ancienne\)\{ if\(!messGarde\(v\)\)\{ v\.innerHTML=vueMessagerie\(\); messMonter\(\); \} \} else v\.innerHTML=''; \}/.test(SANS) && /if\(TAB!=='messagerie'\) messDemonter\(\);/.test(SANS) && /opmHote\(TAB==='messagerie'&&!OPM\.ancienne\);/.test(SANS));
    vrai('« Parler à X » ouvre la messagerie (agParler)', /function agParler\(id\)\{ messOuvrirFil\(id\); \}/.test(SANS));
    vrai('la pastille se repose quand le menu est redessiné', /poser\('bdg-msgr',MS\.nonLus\)/.test(SANS) && /messReleve\(\);/.test(SANS));
    vrai('⛔ l\'observateur typographique n\'écrit JAMAIS dans le calque (il y poserait des insécables : un retour à la ligne de plus que la zone de texte)', /p\.closest\('pre,code,script,style,textarea,\[contenteditable\],\.ms-miroir'\)/.test(SANS));
    /* le calque et la zone de texte : UNE règle de métriques */
    const css = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const regle = (sel) => { const re = new RegExp('(^|\\})\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'm'); const m = re.exec(css); return m ? m[2] : ''; };
    const commune = (/\.ms-miroir,\.ms-ta\{([^}]*)\}/.exec(css) || [])[1] || '';
    vrai('⛔ le calque et la zone de texte partagent UNE règle (police, taille, interligne, espacement, retour à la ligne, marges)', /font-family:var\(--fs\)/.test(commune) && /font-size:15px/.test(commune) && /line-height:21px/.test(commune) && /padding:10px 12px/.test(commune) && /white-space:pre-wrap/.test(commune) && /overflow-wrap:break-word/.test(commune) && /letter-spacing:normal/.test(commune) && /text-rendering:auto/.test(commune) && /unicode-bidi:normal/.test(commune) && /box-sizing:border-box/.test(commune), commune);
    const mk = (/\.ms-miroir \.ms-m\{([^}]*)\}/.exec(css) || [])[1] || '';
    vrai('⛔ une mention DANS le calque ne change ni la graisse, ni la marge, ni l\'espacement (font-weight:400, aucun padding/margin)', /font-weight:400/.test(mk) && !/padding|margin|letter-spacing/.test(mk), mk);
    const mk0 = (/\n\.ms-m\{([^}]*)\}/.exec(css) || [])[1] || '';
    vrai('…et la règle de base d\'une mention est faite de fond et d\'ombre SANS épaisseur (aucun padding, aucune marge, aucune graisse)', /color:var\(--bleu\)/.test(mk0) && /background:var\(--bleuBg\)/.test(mk0) && !/padding|margin|font-weight/.test(mk0), mk0);
    const ta = (/\n\.ms-ta\{([^}]*)\}/.exec(css) || [])[1] || '';
    vrai('la zone de texte est transparente par-dessus le calque, son curseur reste visible', /color:transparent/.test(ta) && /caret-color:var\(--text\)/.test(ta) && /background:transparent/.test(ta), ta);
    vrai('le calque ne reçoit aucun geste (pointer-events:none) et le texte de sélection reste transparent', /pointer-events:none/.test((/\n\.ms-miroir\{([^}]*)\}/.exec(css) || [])[1] || '') && /\.ms-ta::selection\{[^}]*color:transparent/.test(css));
    vrai('une mention d\'une bulle à moi : lisible sur le fond d\'accent (pastille claire, encre bleue)', /\.ms-b\.moi \.ms-m\{[^}]*background:rgba\(255,255,255,\.92\)[^}]*\}/.test(css));
    vrai('trois colonnes par la largeur de la ZONE (requête de conteneur), « Qui fait quoi » en volet au-dessous de 1000 px, une seule colonne sous 700 px', /container:mess \/ inline-size/.test(css) && /@container mess \(max-width:1000px\)/.test(css) && /@container mess \(max-width:700px\)/.test(css));
    vrai('les points d\'écriture respectent « animations réduites »', /@media\(prefers-reduced-motion:reduce\)\{ \.ms-pts i\{animation:none/.test(css));
    /* 28 octobre 2026 : les agents SONT dans OP MESSAGES (le pont) — plus de « Bientôt » dans l'en-tête du fil. v2.120 : le bandeau d'avant (`messBandeauOpm`) a disparu avec le cadre, qui AFFICHE OP MESSAGES ; le lien « Ouvrir dans
       un nouvel onglet » (même adresse, autre onglet) vit dans la barre du cadre et dans ses messages — gardé par `test-3127`. */
    vrai('l\'en-tête du fil ne promet plus « Bientôt » : le lien vers OP MESSAGES est « Ouvrir dans un nouvel onglet » (barre du cadre), dans un autre onglet', !/ms-bientot|<b>Bientôt<\/b>/.test(SANS) && !/messBandeauOpm|opm-bandeau/.test(SANS) && /function opmLienOuvrir\(cls\)\{ return '<a class="'\+cls\+'" href="'\+esc\(opmAdresse\(\)\)\+'" target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet<\/a>'; \}/.test(SANS));
    /* ⛔ la messagerie n'écrit RIEN que par les deux routes de la messagerie */
    /* La population est celle du FICHIER (toute fonction `ms*` / `mess*`), jamais une liste de noms écrite ici : deux écritures de plus sont nées avec les réunions
       (`messReunionLancer`, `messLeconRetirer`) et une liste à la main ne les voyait pas. */
    /* `agCv*` : l'ancien panneau « Parler » de l'onglet Agents, qui écrit par les deux mêmes routes de messagerie — il a toujours existé, il est dans la population. */
    const nomsMs = [...CODE.matchAll(/\nfunction ((?:ms|mess|agCv)[A-Za-z]*)\(/g)].map(m => m[1]);
    vrai('(population) la page déclare des dizaines de fonctions `ms*` / `mess*`, toutes trouvées avec leur corps', nomsMs.length > 50 && nomsMs.every(n => fonction(n).length > 20), nomsMs.filter(n => fonction(n).length <= 20).join(', '));
    const ROUTE_MS = /apiPost\('(\/api\/monitor\/(?:conversations|agents\/reunions|agents\/lecons)[^']*)'/g;
    const dansMs = nomsMs.map(n => [n, [...fonction(n).matchAll(ROUTE_MS)].map(m => m[1])]).filter(x => x[1].length);
    v('⛔ les seules écritures de la messagerie : l\'envoi, « lu », le visage d\'un groupe (v2.112), le lancement d\'une réunion, le retrait d\'une leçon, et — 28 octobre 2026 — l\'annulation d\'une réunion prévue (test-3087) et la suppression d\'un message (test-3088) : exactement sept routes DISTINCTES', [...new Set(dansMs.map(x => x[1]).reduce((t, l) => t.concat(l), []))].sort(),
      ['/api/monitor/agents/lecons/retirer', '/api/monitor/agents/reunions/annuler', '/api/monitor/agents/reunions/lancer', '/api/monitor/conversations/envoyer', '/api/monitor/conversations/groupe', '/api/monitor/conversations/lire', '/api/monitor/conversations/supprimer']);
    vrai('⛔ le visage d\'un groupe ne s\'écrit que par le patron : la fonction qui poste refuse AVANT d\'appeler (MYROLE)', /if\(MYROLE!=='patron'\|\|MS\.groupeBusy\|\|!msEstGroupe\(fil\)\) return Promise\.resolve\(null\);\s*MS\.groupeBusy=true;/.test(fonction('msGroupeEnvoyer')));
    v('…et aucune de ces routes n\'est écrite HORS de ces fonctions (une cinquième écriture ailleurs dans la page ferait tomber ce contrôle)', [...CODE.matchAll(ROUTE_MS)].length, dansMs.reduce((n, x) => n + x[1].length, 0));
    /* ⛔ les deux phrases de sécurité DISENT ce que le code fait (relecture C1-C3) : les consignes portent du texte libre entre agents ; seules les demandes d'argent et d'accès sont en liste fermée */
    const phrases = [...SRC.matchAll(/ms-regle">([^<]*)</g)].map(m => m[1]).concat([...SRC.matchAll(/Les demandes d’argent et d’accès ne passent[^<]*/g)].map(m => m[0]));
    vrai('(population) les deux textes de sécurité sont trouvés dans le fichier livré', phrases.length === 2 && phrases.every(t => t.length > 80), phrases.length);
    vrai('…chacun dit que le travail confié en conversation est une phrase libre, jamais un texte de client', phrases.every(t => /phrase libre/.test(t) && /jamais un texte de client/.test(t)));
    vrai('…et plus aucun des deux ne promet que « seules des tâches d\'une liste fermée » passent entre agents', !/ne se passent que des tâches d’une liste fermée|Entre agents ne passent que des demandes fermées/.test(SRC));
    vrai('⛔ la confirmation d\'un lancement à la main DIT qu\'il tient lieu de la réunion du jour (le serveur le fait : sans cette phrase, l\'essai de 8 h 50 fait sauter celle de 9 h sans prévenir)', /confirm\([^;]*le jour même de cette réunion, elle en tient lieu : celle de l’heure dite ne se rejouera pas/.test(fonction('messReunionLancer')));
    const bloc = CODE.slice(CODE.indexOf('var MS_GROUPES_LIB='), CODE.indexOf('/* ══ démarrage'));
    v('⛔ rien ne se fabrique côté page : ni délégation, ni tâche, ni réponse d\'agent (aucun push dans MS.taches, aucun Math.random, aucun setTimeout qui parle)', [/MS\.taches\.push|taches\.push|Math\.random/.test(bloc), /setTimeout\([^)]*msg|setTimeout\([^)]*texte/.test(bloc)], [false, false]);
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
