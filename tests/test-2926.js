/* ⛔ CE QUE CE FICHIER GARDE — LE PANNEAU DES AGENTS DE LA PLATEFORME DANS LA TOUR, SES VRAIES FONCTIONS (23 octobre 2026).
   Les fonctions de `tour.html` (bloc « LES AGENTS DE LA PLATEFORME ») sont EXTRAITES du fichier livré et exécutées — jamais recopiées. Le serveur est un `fetch` scripté ;
   la couture avec le VRAI serveur est dans `test-2927`.
     · le HTML est une fonction des données : TROIS états (en lecture, PAS PU LIRE, lu) — on ne dit jamais « rien d'anormal » d'une lecture qui a échoué ; le voyant et le MOT
       (critique / en cours / calme) ; les pluriels ; le retard d'une demande RGPD dit en toutes lettres ;
     · ⛔ tout texte venu du serveur est ÉCHAPPÉ ;
     · une lecture ratée garde ce qu'on avait ; une seule lecture à la fois ;
     · les trois gestes (passer, point, RGPD) : confirmation d'abord (« Non » n'envoie rien) — pour « passer », seulement Jules et Victor, qui peuvent appeler Claude ; ils grisent le
       panneau pendant l'appel, DISENT le refus du serveur, relisent après ;
     · ⛔ l'ACCORD page ↔ serveur : chaque URL que la page appelle est une route de `agents-plateforme.js`, et inversement — la page n'en appelle aucune que le serveur n'a pas ;
     · le câblage dans le fichier : un montage, le panneau caché hors du fil « Plateforme », la relecture avec la liste, la règle CSS du voyant. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SERVEUR_PF = fs.readFileSync(path.join(RACINE, 'server', 'agents-plateforme.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 1500) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
console.log('── test-2926 : le panneau des agents de la plateforme, ses vraies fonctions ──');

/* Le corps d'une déclaration, accolade fermante comprise (traverse chaînes, commentaires et expressions régulières). */
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['msPfIlYa', 'msPfNom', 'msPfCartes', 'msPfHtml', 'messPeindrePf', 'messPfCharger', 'messPfGeste', 'messPfPasser', 'messPfPoint', 'messPfRgpd', 'messPfClic', 'msAgentsParId', 'fmtDate'];
const FN = NOMS.map(fonction);
const VARS = [ligne('var MS_PF_AG_CLAUDE='), ligne('var MS_PF_MODE='), ligne('var MS_PF_NIV='), ligne('MS.pf={')].join('\n');
vrai('(population) les ' + NOMS.length + ' fonctions, le coffre MS.pf et les tables sont trouvés dans le fichier livré', ESC && FN.every(f => f.length > 30) && VARS.split('\n').every(l => l.length > 20), NOMS.filter((n, i) => FN[i].length <= 30).join(', ') + ' | ' + VARS.slice(0, 200));

function faux(id) {
  const o = { hidden: true, html: '', attrs: {}, setAttribute(k, x) { this.attrs[k] = x; }, getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; }, contains: () => false,
    querySelector: () => null, ecritures: 0 };
  Object.defineProperty(o, 'innerHTML', { get() { return this.html; }, set(x) { this.html = x; this.ecritures++; } });
  return o;
}
function monde() {
  const j = { appels: [], file: [], toasts: [], confirms: [], filTot: 0, dom: { 'ms-pf': faux() } };
  const rep = (st, d) => new Response(JSON.stringify(d), { status: st, headers: { 'Content-Type': 'application/json' } });
  const ctx = { API: 'https://api.teamop.fr', Object, String, JSON, Promise, Math, Number, Array, Date, Error, Response, console, TypeError, setTimeout,
    $: id => j.dom[id] || null, document: { activeElement: null }, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.',
    toast: t => j.toasts.push(t), confirm: m => { j.confirms.push(m); return j.reponseConfirm !== false; }, messFilTot: () => { j.filTot++; }, msgErreur: e => 'ERR:' + (e && e.message || e), doLogout: () => {},
    fetch: (url, opt) => { j.appels.push([String(url).replace('https://api.teamop.fr', ''), opt && opt.method || 'GET', opt && opt.body ? JSON.parse(opt.body) : null]);
      const r = j.file.length ? j.file.shift() : { st: 200, d: {} };
      if (r === 'coupure') return Promise.reject(new TypeError('Failed to fetch'));
      if (typeof r === 'function') return r();
      return Promise.resolve(rep(r.st || 200, r.d !== undefined ? r.d : {})); } };
  vm.createContext(ctx);
  ctx.hAuth = () => ({}); ctx.srvRepond = r => r; ctx.srvMuet = e => { throw e; };
  ctx.apiGet = u => ctx.fetch(ctx.API + u, {}).then(r => r.ok ? r.json() : r.json().then(d => { const e = new Error((d && d.error) || ('HTTP ' + r.status)); e.status = r.status; throw e; }));
  ctx.apiPost = (u, b) => ctx.fetch(ctx.API + u, { method: 'POST', body: JSON.stringify(b) }).then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })));
  vm.runInContext('var MS={agents:[{id:"max",nom:"Max"},{id:"jules",nom:"Jules"},{id:"theo",nom:"Théo"},{id:"nina",nom:"Nina"},{id:"ines",nom:"Inès"},{id:"victor",nom:"Victor"},{id:"camille",nom:"Camille"},{id:"lea",nom:"Léa"}],fil:"plateforme",inst:{}};var TAB="messagerie";\n' +
    ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + NOMS.concat(['MS']).map(n => 'this.' + n + '=' + n + ';').join(''), ctx);
  return { ctx, j, rep };
}
const NOW = Date.now(), M = 60000, H = 3600000, JOUR = 86400000;
const ep = (o) => Object.assign({ id: 'e1', proprio: 'max', cle: 'bugs_applications', zone: 'serveur', niveau: 'important', depuis: NOW - 25 * M, fin: 0, annonce: true, incident: true, pris: true, texte: '3 erreurs signalées' }, o);
const donnees = (o) => Object.assign({ ok: true, ts: NOW, illisible: false, agents: { max: { mode: 'brouillon', dernier: NOW - 2 * M }, jules: { mode: 'brouillon', dernier: NOW - M, diagnosticsAujourdhui: 1 }, theo: { mode: 'brouillon', dernier: 0 }, nina: { mode: 'brouillon', dernier: NOW },
  ines: { mode: 'arret', dernier: 0, relu: '', derniere: null }, victor: { mode: 'brouillon', dernier: NOW, dernierPoint: null, decisions: [] } }, episodes: [], recents: [], rgpd: [], incidents: {} }, o || {});
const txt = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  console.log('\n1. Le temps relatif');
  {
    const { ctx } = monde();
    v('« il y a » : à l\'instant, minutes, heures, jours, et « pas encore » sans date', [NOW, NOW - 20 * 1000, NOW - 5 * M, NOW - 59 * M, NOW - 2 * H, NOW - 3 * JOUR, 0].map(t => ctx.msPfIlYa(t)),
      ['à l’instant', 'à l’instant', 'il y a 5 min', 'il y a 59 min', 'il y a 2 h', 'il y a 3 j', 'pas encore']);
  }

  console.log('\n2. Le HTML : trois états, le mot, le voyant, les pluriels');
  {
    const { ctx } = monde();
    const R = ctx.MS.pf;
    v('en lecture : « Plateforme — Lecture… », aucun bouton', [txt(ctx.msPfHtml()), /<button/.test(ctx.msPfHtml())], ['Plateforme Lecture…', false]);
    R.lec = -1; R.err = 'refusé (503)';
    const h = ctx.msPfHtml();
    vrai('⛔ PAS PU LIRE : le dit, donne la raison, propose Réessayer — et ne dit JAMAIS « rien d\'anormal »', /n’a pas pu être lu/.test(h) && /refusé \(503\)/.test(h) && /data-act="pfRecharger"/.test(h) && !/Rien d’anormal/.test(h), h);
    R.err = '';
    vrai('…sans raison du serveur, une phrase par défaut', /On ne sait pas ce qu’ils ont relevé/.test(ctx.msPfHtml()));
    R.lec = 1; R.d = donnees();
    let t = txt(ctx.msPfHtml());
    vrai('calme : « Rien d\'anormal sur la plateforme », voyant « ok », Max relu', /Rien d’anormal sur la plateforme/.test(t) && /class="ms-pf-pt ok"/.test(ctx.msPfHtml()) && /Max a relu la santé il y a 2 min/.test(t), t);
    R.d = donnees({ episodes: [ep()] });
    vrai('un épisode : singulier, voyant ambre', /1 épisode en cours/.test(txt(ctx.msPfHtml())) && /ms-pf-pt alerte/.test(ctx.msPfHtml()) && !/dont/.test(txt(ctx.msPfHtml())));
    R.d = donnees({ episodes: [ep(), ep({ id: 'e2', cle: 'sauvegarde_vieille', proprio: 'theo', niveau: 'critique' })] });
    vrai('deux épisodes dont un critique : pluriel, voyant ROUGE', /2 épisodes en cours dont 1 critique/.test(txt(ctx.msPfHtml())) && /ms-pf-pt crit/.test(ctx.msPfHtml()));
    R.d = donnees({ episodes: [ep({ niveau: 'critique' }), ep({ id: 'e2', niveau: 'critique', proprio: 'theo' })] });
    vrai('deux critiques : « 2 critiques »', /dont 2 critiques/.test(txt(ctx.msPfHtml())));
    R.d = donnees({ episodes: [ep({ fin: NOW - M })] });
    vrai('un épisode déjà FINI n\'est pas « en cours » (population : il existe dans la réponse)', /Rien d’anormal/.test(txt(ctx.msPfHtml())) && R.d.episodes.length === 1);
    R.d = donnees({ rgpd: [{ id: 'g0000001', recu: NOW - 33 * JOUR, limite: NOW - 2 * JOUR, joursRestants: -2, accusee: false }] });
    t = txt(ctx.msPfHtml());
    vrai('⛔ une demande RGPD en retard : voyant ROUGE même sans épisode, « en retard de 2 jours » en mots, sans « accusé »', /ms-pf-pt crit/.test(ctx.msPfHtml()) && /en retard de 2 jours/.test(t) && !/accusé de réception/.test(t), t);
    R.d = donnees({ rgpd: [{ id: 'g1', recu: NOW, limite: NOW + 31 * JOUR, joursRestants: 31, accusee: true }, { id: 'g2', recu: NOW, limite: NOW, joursRestants: 0, accusee: true }, { id: 'g3', recu: NOW, limite: NOW, joursRestants: 1, accusee: true }] });
    t = txt(ctx.msPfHtml());
    vrai('« il reste 31 jours » · « dernier jour » · « il reste 1 jour » (singulier) · accusé dit', /il reste 31 jours/.test(t) && /dernier jour/.test(t) && /il reste 1 jour(?!s)/.test(t) && /accusé de réception envoyé/.test(t), t);
    vrai('la mémoire illisible se dit à la place de la ligne de Max', (R.d = donnees({ illisible: true }), /mémoire des agents est illisible/.test(txt(ctx.msPfHtml()))));
    R.d = donnees({ episodes: [ep({ texte: '<img src=x onerror=alert(1)> "piégé"', proprio: 'max' })], recents: [{ cle: 'x', depuis: NOW - 30 * H, fin: NOW - 29 * H, niveau: 'info', texte: '<b>gras</b>' }], rgpd: [{ id: 'g"><x', recu: NOW, limite: NOW + JOUR, joursRestants: 1, accusee: false }] });
    R.ouvert = { ep: true, ag: true, rgpd: true };
    const hh = ctx.msPfHtml();
    vrai('⛔ tout texte du serveur est ÉCHAPPÉ (phrase d\'épisode, rétablis, identifiant de demande) : aucune balise ne naît', !/<img src=x|<b>gras|<x/.test(hh) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(hh) && /&lt;b&gt;gras/.test(hh) && /data-id="g&quot;&gt;&lt;x"/.test(hh), hh);
  }

  console.log('\n3. Les sections : fermées, elles ne montrent rien ; les six agents');
  {
    const { ctx } = monde();
    const R = ctx.MS.pf; R.lec = 1;
    R.d = donnees({ rgpd: [{ id: 'g1', recu: NOW, limite: NOW + JOUR, joursRestants: 1, accusee: true }], episodes: [ep()] });
    R.ouvert = { ep: false, ag: false, rgpd: false };
    let h = ctx.msPfHtml();
    vrai('toutes fermées : trois en-têtes (aria-expanded=false), aucune carte, aucun bouton de geste de section', (h.match(/aria-expanded="false"/g) || []).length === 3 && !/ms-reu-ag/.test(h) && !/pfPasser|pfRgpd/.test(h), h);
    R.ouvert.ag = true; h = ctx.msPfHtml();
    const passer = [...h.matchAll(/data-act="pfPasser" data-agent="(\w+)"( disabled)?/g)].map(m => [m[1], !!m[2]]);
    v('⛔ les six agents : « Passer maintenant » pour chacun, dans l\'ordre, GRISÉ pour celui qui est à l\'arrêt (Inès)', passer, [['max', false], ['jules', false], ['theo', false], ['nina', false], ['ines', true], ['victor', false]]);
    vrai('chaque bouton est NOMMÉ (aria-label « Faire passer X maintenant »)', [...h.matchAll(/aria-label="Faire passer (\S+) maintenant"/g)].length === 6);
    R.d = donnees({ agents: Object.assign(donnees().agents, { ines: { mode: 'brouillon', dernier: 0, relu: '2026-10-22', derniere: { courriels: { envoyes: 4, conformes: 3 } } }, victor: { mode: 'auto', dernier: NOW, dernierPoint: { jour: '2026-10-23', ts: NOW - 90 * M, statut: 'fait' }, decisions: [] } }), victor: { decisions: [{ id: 'd1', ts: NOW - 5 * H, entre: ['camille', 'lea'], decision: 'Léa garde la relance', statut: 'dite' }] } });
    const t = txt(ctx.msPfHtml());
    vrai('Inès : « relu le … » et « 3 courriels conformes sur 4 » ; Victor : « point dit il y a… » ; ses décisions nomment les agents', /relu le 2026-10-22/.test(t) && /3 courriels conformes sur 4/.test(t) && /point dit il y a 2 h|point dit il y a 1 h/.test(t) && /Léa garde la relance Camille et Léa/.test(t), t);
    R.d = donnees({ agents: Object.assign(donnees().agents, { ines: { mode: 'brouillon', dernier: 0, relu: '', derniere: { courriels: { envoyes: 1, conformes: 1 } } } }) });
    vrai('un seul courriel conforme : le singulier', /1 courrier?el? conforme sur 1/.test(txt(ctx.msPfHtml())) || /1 courriel conforme sur 1/.test(txt(ctx.msPfHtml())));
    R.occ = '/api/monitor/agents/plateforme/passer';
    h = ctx.msPfHtml();
    vrai('pendant un geste : TOUS les boutons sont grisés (le point, passer, RGPD)', !/<button[^>]*data-act="(pfPoint|pfPasser|pfRgpd)"(?![^>]*disabled)/.test(h), h);
  }

  console.log('\n4. Le dessin : caché hors du fil « Plateforme », écrit une seule fois');
  {
    const { ctx, j } = monde();
    const c = j.dom['ms-pf']; const R = ctx.MS.pf; R.lec = 1; R.d = donnees();
    ctx.MS.fil = 'equipe'; ctx.messPeindrePf();
    v('sur un autre fil : le panneau reste caché et vide', [c.hidden, c.html, c.ecritures], [true, '', 0]);
    ctx.MS.fil = 'plateforme'; ctx.messPeindrePf();
    vrai('sur « Plateforme » : visible, rempli, data-plie posé', c.hidden === false && /Rien d’anormal/.test(c.html) && c.getAttribute('data-plie') === '0', c.html.slice(0, 100));
    const n = c.ecritures; ctx.messPeindrePf(); ctx.messPeindrePf();
    v('⛔ un repeint identique n\'écrit PAS le DOM (le focus et le défilement ne sautent pas)', c.ecritures, n);
    R.plie = true; ctx.messPeindrePf();
    v('plié (téléphone) : data-plie=1 et le HTML change', [c.getAttribute('data-plie'), /aria-expanded="false"/.test(c.html) && /Détails/.test(c.html)], ['1', true]);
    ctx.MS.fil = 'reunions'; ctx.messPeindrePf();
    v('on quitte le fil : le panneau se vide et se cache', [c.hidden, c.html, c.getAttribute('data-h')], [true, '', null]);
    j.dom['ms-pf'] = null; ctx.MS.fil = 'plateforme'; let jete = false; try { ctx.messPeindrePf(); } catch (e) { jete = true; }
    v('sans l\'élément (écran pas monté) : rien ne jette', jete, false);
  }

  console.log('\n5. La lecture : trois états, une à la fois');
  {
    const { ctx, j } = monde();
    j.file.push({ st: 200, d: donnees({ episodes: [ep()] }) });
    await ctx.messPfCharger();
    v('lu : les données sont gardées, état « lu », route « agents/plateforme »', [ctx.MS.pf.lec, ctx.MS.pf.d.episodes.length, j.appels], [1, 1, [['/api/monitor/agents/plateforme', 'GET', null]]]);
    j.file.push({ st: 503, d: { error: 'La mémoire des agents est illisible' } });
    await ctx.messPfCharger();
    v('⛔ un rafraîchissement RATÉ garde ce qu\'on avait lu', [ctx.MS.pf.lec, ctx.MS.pf.d.episodes.length], [1, 1]);
    j.file.push('coupure');
    await ctx.messPfCharger();
    v('…une coupure aussi', [ctx.MS.pf.lec, !!ctx.MS.pf.d], [1, true]);
    const B = monde();
    B.j.file.push({ st: 503, d: { error: 'La mémoire des agents est illisible' } });
    await B.ctx.messPfCharger();
    vrai('⛔ une PREMIÈRE lecture ratée : « pas pu lire » avec la raison, pas de données', B.ctx.MS.pf.lec === -1 && !B.ctx.MS.pf.d && /ERR:La mémoire des agents est illisible/.test(B.ctx.MS.pf.err), JSON.stringify(B.ctx.MS.pf));
    const C = monde();
    C.j.file.push({ st: 200, d: { ok: false } });
    await C.ctx.messPfCharger();
    v('une réponse sans « agents » n\'est pas des données (état « pas pu lire », pas « calme »)', [C.ctx.MS.pf.lec, C.ctx.MS.pf.d], [-1, null]);
    const D = monde(); let libre; D.j.file.push(() => new Promise(r => { libre = () => r(D.rep(200, donnees())); }));
    const p1 = D.ctx.messPfCharger(); const p2 = D.ctx.messPfCharger();
    await dormir(20); libre(); await p1; await p2;
    v('⛔ deux lectures en même temps : UNE seule requête part', D.j.appels.length, 1);
  }

  console.log('\n6. Les gestes : confirmation d\'abord, grisé pendant l\'appel, refus dit, relecture après');
  {
    const M1 = monde(); M1.ctx.MS.pf.d = donnees(); M1.ctx.MS.pf.lec = 1;
    M1.j.reponseConfirm = false;
    await M1.ctx.messPfPasser('jules'); await M1.ctx.messPfPoint(); await M1.ctx.messPfRgpd('g1');
    v('⛔ « Non » à la confirmation : RIEN n\'est envoyé, trois questions posées', [M1.j.appels.length, M1.j.confirms.length], [0, 3]);
    vrai('…la question de Jules dit qu\'il peut appeler Claude ; celle du point dit « en plus de celui du matin » ; celle du RGPD, que Nina arrête ses rappels', /Faire passer Jules maintenant/.test(M1.j.confirms[0]) && /appeler Claude/.test(M1.j.confirms[0]) && /en plus de celui du matin/.test(M1.j.confirms[1]) && /Nina arrête ses rappels/.test(M1.j.confirms[2]), M1.j.confirms.join(' | '));

    const P = monde(); P.ctx.MS.pf.d = donnees(); P.ctx.MS.pf.lec = 1;
    P.j.file.push({ st: 200, d: { ok: true } }, { st: 200, d: donnees() });
    await P.ctx.messPfPasser('max');
    v('⛔ Max (le code seul) passe SANS question : le POST part avec l\'agent, un toast le dit, la page relit', [P.j.confirms.length, P.j.appels[0], P.j.toasts, P.j.appels[1] && P.j.appels[1][0]], [0, ['/api/monitor/agents/plateforme/passer', 'POST', { agent: 'max' }], ['Max est passé.'], '/api/monitor/agents/plateforme']);
    v('…le panneau est dégrisé après (occ vide), le fil est relu (messFilTot)', [P.ctx.MS.pf.occ, P.j.filTot], ['', 1]);

    const V = monde(); V.ctx.MS.pf.d = donnees(); V.ctx.MS.pf.lec = 1; V.j.file.push({ st: 200, d: { ok: true } }, { st: 200, d: donnees() });
    await V.ctx.messPfPasser('victor');
    v('Victor : une question, puis le POST', [V.j.confirms.length, V.j.appels[0][2]], [1, { agent: 'victor' }]);

    const T = monde(); T.ctx.MS.pf.d = donnees(); T.ctx.MS.pf.lec = 1; T.j.file.push({ st: 200, d: { ok: true } }, { st: 200, d: donnees() });
    await T.ctx.messPfPoint();
    v('le point : POST sans corps utile, toast', [T.j.appels[0], T.j.toasts], [['/api/monitor/agents/plateforme/point', 'POST', {}], ['Le point de Victor est dit dans « Équipe ».']]);

    const G = monde(); G.ctx.MS.pf.d = donnees(); G.ctx.MS.pf.lec = 1; G.j.file.push({ st: 200, d: { ok: true } }, { st: 200, d: donnees() });
    await G.ctx.messPfRgpd('g0000001');
    v('RGPD : POST avec l\'identifiant, toast', [G.j.appels[0], G.j.toasts], [['/api/monitor/agents/plateforme/rgpd', 'POST', { id: 'g0000001' }], ['Demande RGPD marquée traitée.']]);

    const R = monde(); R.ctx.MS.pf.d = donnees(); R.ctx.MS.pf.lec = 1; R.j.file.push({ st: 409, d: { error: 'Un passage est déjà en cours' } }, { st: 200, d: donnees() });
    await R.ctx.messPfPasser('theo');
    v('⛔ un refus du serveur : le toast REPREND sa phrase, le panneau se dégrise', [R.j.toasts, R.ctx.MS.pf.occ], [['Un passage est déjà en cours'], '']);
    const R2 = monde(); R2.ctx.MS.pf.d = donnees(); R2.ctx.MS.pf.lec = 1; R2.j.file.push({ st: 500, d: {} });
    await R2.ctx.messPfPasser('theo');
    vrai('un refus SANS phrase : le code HTTP est dit', /refusé \(500\)/.test(R2.j.toasts[0]), R2.j.toasts.join('|'));
    const R3 = monde(); R3.ctx.MS.pf.d = donnees(); R3.ctx.MS.pf.lec = 1; R3.j.file.push('coupure');
    await R3.ctx.messPfPasser('theo');
    v('une coupure : « Serveur injoignable… » et le panneau se dégrise', [R3.j.toasts, R3.ctx.MS.pf.occ], [['Serveur injoignable — nouvelle tentative dans un instant.'], '']);
    const Q = monde(); Q.ctx.MS.pf.d = donnees(); Q.ctx.MS.pf.lec = 1; Q.ctx.MS.pf.occ = '/x';
    await Q.ctx.messPfPasser('max');
    v('⛔ pendant un geste, un second est ignoré (pas de double envoi)', Q.j.appels.length, 0);
  }

  console.log('\n7. Les clics');
  {
    const { ctx, j } = monde();
    const el = (a, o) => Object.assign({ getAttribute: k => (o && o[k]) || (k === 'data-act' ? a : null) }, {});
    ctx.MS.pf.d = donnees(); ctx.MS.pf.lec = 1;
    ctx.messPfClic(el('pfSection', { 'data-s': 'ag' }));
    v('une section se déplie / se replie', ctx.MS.pf.ouvert.ag, true);
    ctx.messPfClic(el('pfSection', { 'data-s': 'ag' }));
    v('…et se replie', ctx.MS.pf.ouvert.ag, false);
    const plie = ctx.MS.pf.plie; ctx.messPfClic(el('pfPlier'));
    v('« Détails / Réduire » bascule', ctx.MS.pf.plie, !plie);
    j.file.push({ st: 200, d: donnees() }); ctx.MS.pf.lec = -1; ctx.messPfClic(el('pfRecharger')); await dormir(30);
    v('« Réessayer » relit', [j.appels.length, ctx.MS.pf.lec], [1, 1]);
    j.reponseConfirm = false; ctx.messPfClic(el('pfPoint')); ctx.messPfClic(el('pfPasser', { 'data-agent': 'victor' })); ctx.messPfClic(el('pfRgpd', { 'data-id': 'g1' }));
    v('point, passer et RGPD aboutissent à leur confirmation (trois questions)', j.confirms.length, 3);
  }

  console.log('\n8. L\'accord page ↔ serveur, et le câblage dans le fichier');
  {
    const urlsPage = [...new Set([...(FN.join('\n') + VARS).matchAll(/['"](\/api\/monitor\/agents\/plateforme[^'"?]*)['"]/g)].map(m => m[1]))].sort();
    const routesServeur = [...new Set([...SERVEUR_PF.matchAll(/app\.(?:get|post)\('(\/api\/monitor\/agents\/plateforme[^']*)'/g)].map(m => m[1]))].sort();
    v('⛔ chaque URL que la page appelle est une route du serveur, et le serveur n\'en a pas d\'autre (UNE liste, deux fichiers)', urlsPage, routesServeur);
    vrai('(population) quatre routes', routesServeur.length === 4, routesServeur.join());
    const verbes = [...SERVEUR_PF.matchAll(/app\.(get|post)\('(\/api\/monitor\/agents\/plateforme[^']*)'/g)].map(m => m[1] + ' ' + m[2]).sort();
    const pageVerbes = [...new Set([...(fonction('messPfCharger') + fonction('messPfGeste') + fonction('messPfPasser') + fonction('messPfPoint') + fonction('messPfRgpd')).matchAll(/(apiGet|apiPost)\('(\/api\/monitor\/agents\/plateforme[^']*)'/g)].map(m => (m[1] === 'apiGet' ? 'get ' : 'post ') + m[2]))].sort();
    v('…et chaque appel emploie le BON verbe (apiGet pour la lecture, apiPost pour les gestes — la page passe l\'URL à `messPfGeste`)', pageVerbes.filter(x => x.startsWith('get')), verbes.filter(x => x.startsWith('get')));
    const gestes = [...new Set([...(fonction('messPfPasser') + fonction('messPfPoint') + fonction('messPfRgpd')).matchAll(/messPfGeste\('([^']+)'/g)].map(m => m[1]))].sort();
    v('…les trois gestes de la page sont les trois POST du serveur', gestes, verbes.filter(x => x.startsWith('post')).map(x => x.slice(5)).sort());

    vrai('le panneau est monté dans la messagerie (un seul #ms-pf, après celui des réunions)', (CODE.match(/id="ms-pf"/g) || []).length === 1 && CODE.indexOf('id="ms-reu"') < CODE.indexOf('id="ms-pf"'));
    vrai('la relecture suit la liste (messToutCharger relit le panneau sur le fil « Plateforme »)', /function messToutCharger\(\)\{ if\(MS\.fil==='plateforme'\) messPfCharger\(\);/.test(CODE));
    vrai('on le repeint quand on change de fil ET au premier dessin (deux appels), on le charge en entrant sur le fil', (CODE.match(/messPeindreReunions\(\); messPeindrePf\(\);/g) || []).length === 2 && /if\(fil==='plateforme'\) messPfCharger\(\);/.test(CODE));
    vrai('un clic « pf… » va au gestionnaire du panneau', /else if\(a\.indexOf\('pf'\)===0\) messPfClic\(el\);/.test(CODE));
    vrai('le voyant a ses trois états et sa règle de survol des liens désactivés', /\.ms-pf-pt\.ok\{/.test(SRC) && /\.ms-pf-pt\.alerte\{/.test(SRC) && /\.ms-pf-pt\.crit\{/.test(SRC) && /\.ms-pf \.ms-lien:disabled\{/.test(SRC));
    vrai('au doigt : les liens du panneau ont une cible de 44 px', /@media\(pointer:coarse\)\{ \.ms-pf \.ms-lien\{min-height:44px/.test(SRC));
    vrai('⛔ aucune fonction du bloc ne s\'appelle comme une fonction existante (une déclaration dupliquée : la seconde gagne PARTOUT)', NOMS.every(n => (CODE.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length === 1), NOMS.filter(n => (CODE.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length !== 1).join());
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
