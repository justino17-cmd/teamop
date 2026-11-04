/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR EST UNE (v2.119, 28 octobre 2026).

   Justin : « si le switch entre Gestion et OP MESSAGES est trop chiant, on met tout ensemble, mais bien rangé, comme ça c'est plus simple,
   les agents peuvent travailler sur tout en même temps » ; « côté OP MESSAGES de la Tour, il manque beaucoup de trucs, refais tout ça ».

   La Tour avait DEUX consoles (`APP`, `setApp`, le sélecteur « GESTION ▾ », une liste de vues, une barre et un dernier onglet PAR console) ; elle
   n'en a plus qu'une, rangée par sujet (Tour · Clients · Surveillance · …), avec un FILTRE « Tout · Gestion · Messages » sur les seules vues qui
   mélangent les deux sources. Ce banc joue les VRAIES fonctions de tour.html (extraites, exécutées dans un bac à sable) et garde cinq choses :

     1. PLUS DE SÉLECTEUR — ni `setApp`, ni `APP`, ni l'interrupteur dans l'en-tête, la feuille « Plus » ou le tiroir ; les clés d'avant
        (`tour_app`, `tour_tab_<app>`, `tour_barre_<app>`) ne sont lues qu'UNE fois, par `migrerReglagesAvant` ;
     2. LE FILTRE — ce qu'il montre (`sourcesAff`), ce qu'il ne change jamais (le menu, le compteur d'alerte, les droits du compte), et que
        l'accueil, le service, les sauvegardes et les entreprises montrent chaque source à sa place ;
     3. LES LIENS D'AVANT — `#messages/…` et `#gestion/…` ouvrent la bonne vue ET posent le filtre ; les clés rangées par console sont relues
        et migrées ;
     4. LE BUG « CONTRATS » — la console OP MESSAGES d'avant montrait les contrats d'OP GESTION comme les siens : Contrats est à Gestion
        seule, la page le dit, et aucun filtre n'y est posé ;
     5. UN COMPTE QUI N'A QU'UNE APPLICATION — il ne voit que la sienne, jamais de filtre, même si l'appareil a gardé « Messages » d'un compte
        d'avant ; la tête de chaque groupe devient la première vue qu'il voit.

   Rien de ce fichier ne touche à `server/` : le serveur garde ses refus (`monAppRefuse`) ; le filtre CHOISIT CE QU'ON MONTRE. */
'use strict';
const fs = require('fs'), vm = require('vm');
/* TOUR_FICHIER : une copie mutée, pour éprouver le banc sans jamais toucher le fichier du dépôt */
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || __dirname + '/../tour.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + d : ''), !!c, true);
/* on ne cherche que dans le CODE : les noms qu'on cherche sont écrits dans les commentaires qui les expliquent. Seuls les blocs qui COMMENCENT
   une ligne sont retirés (règle du dépôt : un motif « tout bloc » avale du vrai code). */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SCRIPTS = [...CODE.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const CORPS_HTML = (() => { const i = SRC.indexOf('<body>'), j = SRC.indexOf('<script>', i); return i > 0 && j > i ? SRC.slice(i, j) : ''; })();
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
const PIECES_FN = ['appsDeVue', 'vuesDe', 'vuePermise', 'vueAlias', 'vues', 'membresVisibles', 'teteDe', 'tabMenu', 'groupeDe', 'menuVisible', 'filtreEff', 'sourcesAff', 'aGestion', 'aMessages',
  'appDe', 'appVisible', 'filtreApp', 'filtreAffiche', 'setFiltre', 'lireHash', 'migrerReglagesAvant', 'incDeLaConsole', 'incOuvertsTous', 'incOuvertsDe', 'incToutIgnorer', 'nMot', 'entOuvertesMsg', 'msgBadge'];
const FN = PIECES_FN.map(fonction);
const LIGNES = [bloc('var MENU=[', '];'), ligne('var GROUPE_LIB='), ligne('var PARENT_DE='), ligne('var PATRON_SEUL='), ligne('var VUE_ALIAS='), ligne('var SOUS='), ligne('var VUES_PAR_APP='),
  bloc('var APPS_TOUR={', '} };'), ligne('var FILTRE_LIB='), ligne('var ANCIEN_MESSAGES='), ligne('var LIB_SOUS=')];
vrai('(population) ' + PIECES_FN.length + ' fonctions et ' + LIGNES.length + ' tables trouvées dans le fichier livré',
  FN.every(f => f.length > 30) && LIGNES.every(l => l.length > 20), PIECES_FN.filter((n, i) => FN[i].length <= 30).join(', ') + ' / ' + LIGNES.map((l, i) => l.length > 20 ? '' : i).join(' '));
const PIECES = LIGNES.join('\n') + '\n' + FN.join('\n') + '\nthis.__ok=1;';

/* un bac : un compte (ses applications, son rôle), un filtre posé, une adresse, un rangement d'appareil */
function bac(o) {
  o = o || {};
  const stock = new Map(Object.entries(o.stock || {})), journal = { rendus: [], charges: 0, badges: [] };
  const ctx = { console, JSON, String, Object, Array, Number, Math, Date, parseInt,
    MYAPPS: o.apps || ['gestion', 'messages'], MYROLE: o.role || 'patron', FILTRE: o.filtre || 'tout', TAB: 'accueil',
    INC: { list: o.list || [], sel: o.sel || null, grp: o.grp || null, loaded: true, err: '', f: { type: '', grav: '', statut: 'actifs', app: o.app || '', ent: o.ent || '' }, cnt: {} },
    ENT: { liste: o.ent_liste || [] }, SOUS: {}, TAB_AVANT: '',
    location: { hash: o.hash || '' },
    localStorage: { getItem: k => stock.has(k) ? stock.get(k) : null, setItem: (k, x) => { stock.set(k, String(x)); }, removeItem: k => { stock.delete(k); } },
    renderNav: s => journal.rendus.push('nav:' + s), render: () => journal.rendus.push('render'), setBdg: (id, n) => journal.badges.push(id + '=' + n),
    chargerPourFiltre: () => { journal.charges++; }, tiroirRafraichir: () => {}, teteListe: () => '', esc: s => String(s) };
  vm.createContext(ctx);
  vm.runInContext(PIECES, ctx);
  return { ctx, stock, journal, run: c => vm.runInContext(c, ctx) };
}
const menu = b => b.run('JSON.stringify(menuVisible().map(function(g){ return {s:g.section,v:g.vues.map(function(x){ return [x[0],x[1]]; })}; }))');
const tetes = b => JSON.parse(menu(b)).map(g => g.v.map(x => x[0]).join(','));

/* ═══════════════ 1. PLUS DE SÉLECTEUR ═══════════════ */
console.log('\n1. Plus de sélecteur de console');
vrai('⛔ `setApp` n’existe plus, ni son appel, ni `tiroirApp`', !/\bsetApp\b|\btiroirApp\b/.test(SCRIPTS) && !/function setApp\(|function tiroirApp\(/.test(CODE));
vrai('⛔ `APP` (la console ouverte) n’existe plus — ni lu, ni écrit (APP_L, APP_TEINTE… sont d’autres noms)', !/\bAPP\b/.test(SCRIPTS), (SCRIPTS.match(/.{0,30}\bAPP\b.{0,30}/) || [''])[0]);
vrai('⛔ aucune liste de vues « par console » à basculer : plus de `body.dataset.app`, plus de `tour_app` écrit', !/dataset\.app\b/.test(SCRIPTS) && !/setItem\('tour_app'/.test(SCRIPTS));
vrai('⛔ l’en-tête n’a plus d’interrupteur (ni .app-sw, ni #app-sw, ni les compteurs #app-n-…) ; la pastille du téléphone n’est plus un bouton qui ouvre la feuille « app »',
  !/app-sw|app-n-/.test(CORPS_HTML) && !/<button[^>]*id="app-pill"/.test(CORPS_HTML) && !/ouvrirFeuille\('app'\)|quoi==='app'/.test(SCRIPTS));
vrai('⛔ ni la feuille « Plus » ni le tiroir ne dessinent un interrupteur', !/app-sw/.test(fonction('ouvrirFeuille') + fonction('tiroirHtml')));
vrai('⛔ `tour_tab_<app>`, `tour_barre_<console>` et `tour_app` ne sont nommés QUE par la migration (relus une fois, puis effacés)',
  !/tour_tab_|tour_barre_(gestion|messages)|'tour_app'/.test(SCRIPTS.replace(fonction('migrerReglagesAvant'), ' ')) && /tour_barre_gestion/.test(fonction('migrerReglagesAvant')));
vrai('⛔ « Depuis OP GESTION » (la seconde liste des mêmes entreprises) n’existe plus : ni l’onglet, ni `vueEntreprisesMsg`, ni `SOUS.entreprisesmsg`',
  !/Depuis OP GESTION|vueEntreprisesMsg|entreprisesmsg|survgest|survmsg/.test(SCRIPTS));
vrai('les raccourcis Ctrl+Maj+G / M / T posent le FILTRE (plus de console à changer)', /e\.key==='G'[^]*?setFiltre\('gestion'\)[^]*?setFiltre\('messages'\)[^]*?setFiltre\('tout'\)/.test(SCRIPTS));
v('la barre du bas (par défaut) dit Accueil · À traiter · Clients · Surveillance, et le nom de chaque groupe est celui du menu',
  [SCRIPTS.match(/var BAS_DEFAUT=(\[[^\]]*\])/)[1], /support:'À traiter'/.test(SCRIPTS), /entreprises:'Clients'/.test(SCRIPTS)], ["['accueil','support','entreprises','surveillance']", true, true]);
{
  const m = SCRIPTS.match(/var TOUR_VERSION='v2\.(\d+)'/), aff = [...SRC.matchAll(/· (v\d+\.\d+)</g)].map(x => x[1]);
  vrai('la Tour est en v2.119 ou après, et les trois libellés (connexion, en-tête, pied) disent la même version', !!m && +m[1] >= 119 && aff.length >= 3 && aff.every(x => x === 'v2.' + m[1]), aff.join(','));
  vrai('…et l’en-tête n’annonce plus « Tour OP GESTION » ni « Tour OP MESSAGES » : « La Tour »', !/Tour OP (GESTION|MESSAGES) · v/.test(SRC) && /hd\.textContent='La Tour · '\+TOUR_VERSION/.test(SCRIPTS));
}

/* ═══════════════ 2. LE FILTRE ═══════════════ */
console.log('\n2. Le filtre « Tout · Gestion · Messages »');
for (const [apps, f, attendu] of [[['gestion', 'messages'], 'tout', ['gestion', 'messages']], [['gestion', 'messages'], 'gestion', ['gestion']], [['gestion', 'messages'], 'messages', ['messages']],
  [['gestion', 'messages'], 'n’importe quoi', ['gestion', 'messages']], [['gestion', 'messages'], undefined, ['gestion', 'messages']]]) {
  const b = bac({ apps, filtre: f });
  v('deux applications, filtre « ' + f + ' » : on montre ' + attendu.join(' + '), [b.run('sourcesAff()'), b.run('aGestion()'), b.run('aMessages()')], [attendu, attendu.includes('gestion'), attendu.includes('messages')]);
}
{
  const b = bac({ apps: ['gestion', 'messages'], filtre: 'messages' });
  v('⛔ le filtre ne dit jamais « les deux » quand un seul est posé (l’ordre est fixe : Gestion puis Messages)', bac({ apps: ['messages', 'gestion'], filtre: 'tout' }).run('sourcesAff()'), ['gestion', 'messages']);
  v('appVisible suit le filtre : les tags d’OP MESSAGES (opmessages, opmsg, messages) d’un côté, tout le reste (opgestion, espace, stripe, inconnu, vide) de l’autre',
    ['opmessages', 'opmsg', 'messages', 'opgestion', 'espace', 'stripe', '', 'elan'].map(c => [b.run('appVisible(' + JSON.stringify(c) + ')'), bac({ filtre: 'gestion' }).run('appVisible(' + JSON.stringify(c) + ')'), bac({ filtre: 'tout' }).run('appVisible(' + JSON.stringify(c) + ')')].map(x => x ? 1 : 0).join('')),
    ['opmessages', 'opmsg', 'messages', 'opgestion', 'espace', 'stripe', '', 'elan'].map(c => ['opmessages', 'opmsg', 'messages'].includes(c) ? '101' : '011'));
}
{
  /* v2.119 : les incidents des DEUX applications, et seulement ceux de la source choisie */
  const LISTE = [{ id: 'a', app: 'opgestion', statut: 'nouveau' }, { id: 'b', app: 'opmessages', statut: 'nouveau' }, { id: 'c', app: 'espace', statut: 'encours' }, { id: 'd', app: 'opmessages', statut: 'corrige' }, { id: 'e', app: 'stripe' }];
  const ids = (f, fn) => bac({ filtre: f, list: LISTE }).run('JSON.stringify(' + fn + '().map(function(i){ return i.id; }))');
  v('« Tout » : tous les incidents ; « Gestion » : ceux de Gestion (l’espace client et Stripe en sont) ; « Messages » : le seul d’OP MESSAGES', [ids('tout', 'incDeLaConsole'), ids('gestion', 'incDeLaConsole'), ids('messages', 'incDeLaConsole')],
    ['["a","b","c","d","e"]', '["a","c","e"]', '["b","d"]']);
  v('⛔ le compteur du MENU compte TOUTES les applications du compte, quel que soit le filtre (une alerte ne se masque pas) — et pas celles qu’il n’a pas',
    [ids('gestion', 'incOuvertsTous'), ids('messages', 'incOuvertsTous'), bac({ apps: ['gestion'], list: LISTE }).run('JSON.stringify(incOuvertsTous().map(function(i){ return i.id; }))')], ['["a","b","c","e"]', '["a","b","c","e"]', '["a","c","e"]']);
  v('…celui d’UNE application (les groupes de l’accueil) : Gestion a trois ouverts (sans-statut compris), Messages un', [bac({ list: LISTE }).run('incOuvertsDe("gestion").length'), bac({ list: LISTE }).run('incOuvertsDe("messages").length')], [3, 1]);
}
{
  /* setFiltre : mémorisé, jamais pour un compte à une seule application, oublie ce qui n'a plus de sens */
  const b = bac({ filtre: 'tout', sel: 'i1', grp: 'Entreprise X', ent: 'Entreprise X', app: 'espace' });
  b.run("setFiltre('messages')");
  v('setFiltre pose le filtre, le range sur l’appareil, et revient à la LISTE (l’incident ou l’entreprise ouvert n’est peut-être plus de la source)',
    [b.run('FILTRE'), b.stock.get('tour_filtre'), b.run('INC.sel'), b.run('INC.grp'), b.run('INC.f.ent'), b.run('INC.f.app')], ['messages', 'messages', null, null, '', '']);
  vrai('…redessine (avec une transition décidée) et charge ce que la source apparue demande', b.journal.rendus.join() === 'nav:fondu' && b.journal.charges === 1, b.journal.rendus.join());
  vrai('…le compteur du menu est relu SANS le filtre', b.journal.badges.join() === 'bdg-surv=0', b.journal.badges.join());
  b.run("setFiltre('xyz')");
  v('un filtre inconnu retombe sur « Tout »', b.run('FILTRE'), 'tout');
  const u = bac({ apps: ['gestion'], filtre: 'tout' });
  u.run("setFiltre('messages')");
  v('⛔ un compte à UNE application ne pose aucun filtre (rien ne s’écrit, rien ne se redessine)', [u.run('FILTRE'), u.stock.has('tour_filtre'), u.journal.rendus.length], ['tout', false, 0]);
  const m = bac({ filtre: 'gestion' }); m.run("setFiltre('gestion')");
  v('re-choisir le même filtre ne redessine pas en transition (rien ne change)', m.journal.rendus.join(), 'render');
}
{
  /* la rangée de choix : un groupe segmenté, trois boutons, celui du filtre pressé — et rien chez un compte à une seule application */
  const H = bac({ filtre: 'gestion' }).run('filtreApp()');
  /* v2.130 (Justin, 31 octobre 2026) : les choix NOMMENT les applications — « OP GESTION + OP MESSAGES · OP GESTION · OP MESSAGES » */
  v('filtreApp : « OP GESTION + OP MESSAGES · OP GESTION · OP MESSAGES », celui du filtre pressé', [[...H.matchAll(/aria-pressed="(\w+)" onclick="setFiltre\('(\w+)'\)">(.*?)<\/button>/g)].map(m => m[3].replace(/<[^>]+>/g, '') + '=' + m[1])], [['OP GESTION + OP MESSAGES=false', 'OP GESTION=true', 'OP MESSAGES=false']]);
  v('⛔ un compte à une seule application : aucune rangée (ni « Tout », ni l’autre)', [bac({ apps: ['gestion'] }).run('filtreApp()'), bac({ apps: ['messages'], filtre: 'gestion' }).run('filtreApp()')], ['', '']);
  const aff = (tab, extra) => { const b = bac(); b.run('TAB=' + JSON.stringify(tab) + '; ' + (extra || '')); return b.run('filtreAffiche()'); };
  v('le filtre se pose SEULEMENT sur les vues qui mélangent les deux sources : Incidents, Surveillance, Abonnements (sa liste), Journal, Accès, Équipe, Sauvegardes',
    ['incidents', 'surveillance', 'journal', 'essais', 'equipe', 'donnees'].map(t => aff(t)).concat([aff('abonnements', "SOUS.abonnements='abos'")]), [true, true, true, true, true, true, true]);
  v('…et PAS sur celles d’une seule : Contrats, Courrier, Demandes, Entreprises, Agents, Audience, Rapport — ni sur Facturation et Devis IA (Gestion), ni dans le dossier d’un incident',
    ['contrats', 'support', 'demandes', 'entreprises', 'agents', 'audience', 'rapport', 'messagerie', 'comptes', 'espaces'].map(t => aff(t)).concat([aff('abonnements', "SOUS.abonnements='facturation'"), aff('abonnements', "SOUS.abonnements='devisia'"), aff('surveillance', "INC.sel='i1'")]),
    Array(13).fill(false));
}
{
  /* « Tout remettre à zéro » : la demande porte `app` pour une source, et rien pour « Tout » (le serveur classe alors toutes les applications du compte) */
  const corps = (f, apps) => { const b = bac({ filtre: f, apps, list: [{ id: 'a', app: 'opgestion', statut: 'nouveau' }, { id: 'b', app: 'opmessages', statut: 'nouveau' }] }); let envoi = null;
    b.ctx.confirm = () => true; b.ctx.incOuverts = () => [{}, {}]; b.ctx.apiPost = (u, c) => { envoi = [u, c]; return { then: () => ({ catch: () => {} }) }; }; b.ctx.alert = () => {}; b.run('incToutIgnorer()'); return envoi; };
  v('« Tout » : {} ; « Gestion » : {app:"gestion"} ; « Messages » : {app:"messages"} ; un compte à une application : la sienne',
    [corps('tout'), corps('gestion'), corps('messages'), corps('tout', ['messages'])].map(x => x && JSON.stringify(x)),
    ['["/api/monitor/issues/tout-ignorer",{}]', '["/api/monitor/issues/tout-ignorer",{"app":"gestion"}]', '["/api/monitor/issues/tout-ignorer",{"app":"messages"}]', '["/api/monitor/issues/tout-ignorer",{"app":"messages"}]']);
}

/* l'accueil : UN écran, deux groupes — chacun écrit par sa fonction, le filtre dit lesquels paraissent */
{
  const accueil = (f, apps) => { const b = bac({ filtre: f, apps });
    Object.assign(b.ctx, { accueilGestion: () => ({ n: 2, html: '<G/>' }), accueilMessages: () => ({ n: 1, html: '<M/>' }), vueInfo: () => ({ section: 'Tour', lib: 'Accueil' }), MYNOM: 'Justin', APP_TEINTE: { gestion: 'g', messages: 'm' } });
    vm.runInContext(fonction('vueAccueil'), b.ctx); return b.run('vueAccueil()'); };
  const T = accueil('tout'), G = accueil('gestion'), M = accueil('messages'), U = accueil('tout', ['messages']), UG = accueil('messages', ['gestion']);
  v('accueil « Tout » : le groupe OP GESTION puis le groupe OP MESSAGES, chacun sous son nom ; le total additionne les deux (3 points)',
    [/<section class="ac-src" aria-label="OP GESTION"><div class="ac-src-t">[^]*?<G\/><\/section><section class="ac-src" aria-label="OP MESSAGES">[^]*?<M\/><\/section>/.test(T), /3 points à traiter/.test(T), (T.match(/filtre-app/g) || []).length], [true, true, 1]);
  v('accueil « Gestion » : OP GESTION seul, SANS titre de groupe (le filtre dit déjà lequel) ; « Messages » : l’inverse', [G.includes('<G/>'), G.includes('<M/>'), /ac-src/.test(G), /2 points à traiter/.test(G), M.includes('<M/>'), M.includes('<G/>'), /1 point à traiter/.test(M)],
    [true, false, false, true, true, false, true]);
  v('⛔ un compte sans Gestion : son groupe seul, aucune rangée de filtre ; un compte sans Messages, même avec « Messages » gardé sur l’appareil : Gestion seul',
    [U.includes('<M/>'), U.includes('<G/>'), /filtre-app/.test(U), UG.includes('<G/>'), UG.includes('<M/>'), /filtre-app/.test(UG)], [true, false, false, true, false, false]);
}
/* « Service » : les cartes de CHAQUE application côte à côte, le filtre en choisit une ou les deux */
{
  const service = (f, apps) => { const b = bac({ filtre: f, apps });
    Object.assign(b.ctx, { blocVersions: () => '<GV/>', blocSortieFirebase: () => '<GF/>', corpsServiceMsg: () => '<MS/>', blocBasculeMsg: () => '<MB/>', blocVersionsMsg: () => '<MV/>',
      enTete: (t, d, a) => '<h1>' + t + '|' + (a ? 'actions' : '') + '</h1>', APP_TEINTE: { gestion: 'g', messages: 'm' }, OPMA_SERV_ACT: '<act/>', OPMA_SERV_DESC: 'd-msg', GEST_SERV_DESC: 'd-gest' });
    vm.runInContext(ligne('function srcTitre(') + '\n' + fonction('srcTitre') + '\n' + fonction('vueService'), b.ctx); return b.run('vueService()'); };
  const T = service('tout'), G = service('gestion'), M = service('messages');
  vrai('« Tout » : deux colonnes dans une grille d’auto-ajustement (côte à côte, l’une sous l’autre sur un écran étroit) — Gestion (versions, Firebase) puis Messages (service, bascule, versions)',
    /<div class="svc-deux"><section class="svc-col" aria-label="OP GESTION">[^]*?<GV\/><GF\/><\/section><section class="svc-col" aria-label="OP MESSAGES">[^]*?<MS\/><MB\/><MV\/><\/section><\/div>/.test(T), T.slice(0, 200));
  v('« Gestion » : ses cartes seules, pas de grille ; « Messages » : les siennes seules, avec l’actualisation dans l’en-tête', [/<GV\/>/.test(G), /<MS\/>/.test(G), /svc-deux/.test(G), /<MS\/>/.test(M), /<GV\/>/.test(M), /svc-deux/.test(M), /\|actions<\/h1>/.test(M)],
    [true, false, false, true, false, false, true]);
}
/* Sauvegardes : la sauvegarde d'OP MESSAGES, lue dans ce que son relais renvoyait déjà (`sante.reglages`, `sante.sante.sauvegarde`) */
{
  const carte = (d, extra) => { const b = bac();
    Object.assign(b.ctx, { OPMA: { sante: Object.assign({ inst: 'beta', loaded: true, err: '', d }, extra || {}) }, opmaInstance: () => 'beta', opmaLire: () => {}, opmaBascule: () => '<bascule/>', squelListe: () => '<squel/>', acErr: (t, m) => '<err>' + t + '</err>' });
    vm.runInContext(fonction('gSauvMsg'), b.ctx); return b.run('gSauvMsg()'); };
  const BASE = { reglages: { inscription_courriel: true, courriel_ouvert: false, facturation_ouverte: true, facturation_mode: 'live', tout_ouvert: false, sauvegarde_configuree: true, admin_configuree: true }, base: { fichier_mo: 41.2 } };
  const T = carte(Object.assign({ sante: { sauvegarde: { configuree: true, ageH: 5.4, essaiJours: 12, echecs: 0 } } }, BASE));
  vrai('la carte dit « Réussie », l’âge (« il y a 5,4 h »), le dernier essai de restauration (« il y a 12 jours »), la base et les réglages — en LECTURE, sans bouton de lancement',
    /past p-vert">Réussie/.test(T) && /il y a 5,4 h/.test(T) && /il y a 12 jours/.test(T) && /41\.2 Mo/.test(T) && /Facturation ouverte<\/span><span class="v">oui · live/.test(T) && /E-mail ouvert \(SMTP\)<\/span><span class="v">non/.test(T) && !/<button/.test(T) && /<bascule\/>/.test(T), T.slice(0, 300));
  vrai('⛔ une sauvegarde en échec se dit « En échec (2 de suite) », jamais « Réussie »', /p-rouge">En échec \(2 de suite\)/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: true, ageH: 30, essaiJours: null, echecs: 2 } } }, BASE))));
  vrai('⛔ jamais une réussie : « Aucune réussie à ce jour » ; un essai jamais fait : « jamais fait » ; trop vieille (> 48 h) : « À vérifier »',
    /Aucune réussie à ce jour/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: true, ageH: null, essaiJours: null, echecs: 0 } } }, BASE))) && /jamais fait/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: true, ageH: null, essaiJours: null, echecs: 0 } } }, BASE)))
    && /À vérifier/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: true, ageH: 70, essaiJours: 3, echecs: 0 } } }, BASE))));
  vrai('⛔ pas configurée : c’est un CHOIX, et la carte le dit (pas une panne) ; un serveur qui ne répond pas : l’erreur, jamais « Pas configurée »',
    /Pas configurée/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: false } } }, BASE))) && /Aucune sauvegarde n’est branchée/.test(carte(Object.assign({ sante: { sauvegarde: { configuree: false } } }, BASE)))
    && /<err>OP MESSAGES ne répond pas<\/err>/.test(carte(null, { err: 'refus' })) && !/Pas configurée/.test(carte(null, { err: 'refus' })));
  vrai('la vue Sauvegardes : chez un compte sans Gestion, seulement la carte d’OP MESSAGES (le retour en arrière est par entreprise, d’OP GESTION) ; avec les deux, la carte s’ajoute',
    /if\(!G\) return tete\+'<div class="reg">'\+gSauvMsg\(\)\+'<\/div>';/.test(fonction('vueDonnees')) && /gSauv\+\(aMessages\(\)\?gSauvMsg\(\):''\)\+gRetour/.test(fonction('vueDonnees')));
}

/* ═══════════════ 3. LES LIENS D'AVANT ═══════════════ */
console.log('\n3. Les liens d’avant ouvrent la bonne vue — et posent le filtre');
{
  const lien = (hash, apps, role) => { const b = bac({ hash, apps, role }); return JSON.stringify(b.run('lireHash()')) + '|' + b.run('SOUS.abonnements||""'); };
  v('#messages/entreprises → l’écran « Espaces » d’OP MESSAGES, filtre Messages (l’onglet « Entreprises » de l’autre console s’appelle Espaces)', lien('#messages/entreprises'), '{"filtre":"messages","tab":"espaces","nomme":true}|abos');
  v('#messages/comptes et #messages/surveillance', [lien('#messages/comptes'), lien('#messages/surveillance')], ['{"filtre":"messages","tab":"comptes","nomme":true}|abos', '{"filtre":"messages","tab":"surveillance","nomme":true}|abos']);
  v('#gestion/entreprises → Entreprises, filtre Gestion ; #gestion/support (le Courrier) ; #gestion seul → l’accueil, filtre Gestion',
    [lien('#gestion/entreprises'), lien('#gestion/support'), lien('#gestion')], ['{"filtre":"gestion","tab":"entreprises","nomme":true}|abos', '{"filtre":"gestion","tab":"support","nomme":true}|abos', '{"filtre":"gestion","tab":"accueil","nomme":false}|abos']);
  v('⛔ #gestion/facturation (l’ancienne vue) → Abonnements, sur son onglet Facturation ; #devisia et #connexions de même (v2.87)',
    [lien('#gestion/facturation'), lien('#devisia'), lien('#connexions')], ['{"filtre":"gestion","tab":"abonnements","nomme":true}|facturation', '{"filtre":null,"tab":"abonnements","nomme":true}|devisia', '{"filtre":null,"tab":"entreprises","nomme":true}|abos']);
  v('une adresse d’aujourd’hui (#surveillance, #essais) n’a pas de filtre ; une inconnue ou vide : l’accueil', [lien('#surveillance'), lien('#essais'), lien('#nimporte'), lien('')],
    ['{"filtre":null,"tab":"surveillance","nomme":true}|abos', '{"filtre":null,"tab":"essais","nomme":true}|abos', '{"filtre":null,"tab":"accueil","nomme":false}|abos', '{"filtre":null,"tab":"accueil","nomme":false}|abos']);
  v('⛔ un lien d’avant vers un écran que le compte n’a pas (Courrier chez un compte sans Gestion ; Facturation chez un collaborateur) : l’accueil, jamais un écran blanc ni un écran réservé',
    [lien('#messages/support', ['messages']), lien('#gestion/entreprises', ['messages']), lien('#gestion/facturation', ['gestion'], 'collaborateur'), lien('#journal', ['gestion', 'messages'], 'collaborateur')],
    ['{"filtre":"messages","tab":"accueil","nomme":false}|abos', '{"filtre":"gestion","tab":"accueil","nomme":false}|abos', '{"filtre":"gestion","tab":"accueil","nomme":false}|abos', '{"filtre":null,"tab":"accueil","nomme":false}|abos']);
  const entr = fonction('entrer'), hc = SCRIPTS.slice(SCRIPTS.indexOf("window.addEventListener('hashchange'"), SCRIPTS.indexOf("window.addEventListener('hashchange'") + 500);
  vrai('⛔ au démarrage, le lien d’avant pose le filtre (si le compte a les deux applications) ; à un changement d’adresse aussi, et l’adresse se réécrit à la forme d’aujourd’hui',
    /if\(lh\.filtre&&MYAPPS\.length>1\)\{ FILTRE=lh\.filtre;/.test(entr) && /if\(h\.filtre&&MYAPPS\.length>1&&h\.filtre!==filtreEff\(\)\) setFiltre\(h\.filtre,true\);/.test(hc) && /else ecrireHash\(\);/.test(hc));
  vrai('l’adresse écrite n’a plus de console : #<onglet> seulement', /function ecrireHash\(\)\{ try\{ var h='#'\+TAB;/.test(SCRIPTS));
}
{
  /* les réglages d'avant : relus UNE fois puis rangés */
  const b = bac({ stock: { tour_barre_gestion: 'journal,equipe', tour_barre_messages: 'comptes,journal', tour_tab_gestion: 'abonnements', tour_tab_messages: 'entreprises', tour_app: 'messages' } });
  b.run('migrerReglagesAvant()');
  v('la barre de Gestion devient `tour_barre`, l’onglet de la console qui travaillait (Messages : « Entreprises » → « Espaces ») sert une fois, puis tout est effacé',
    [b.stock.get('tour_barre'), b.run('TAB_AVANT'), ['tour_barre_gestion', 'tour_barre_messages', 'tour_tab_gestion', 'tour_tab_messages', 'tour_app'].filter(k => b.stock.has(k)), b.stock.get('tour_migre_v2119')], ['journal,equipe', 'espaces', [], '1']);
  b.run("TAB_AVANT=''"); b.stock.set('tour_tab_gestion', 'journal'); b.run('migrerReglagesAvant()');
  v('⛔ une seconde fois, rien ne bouge (relue UNE fois : le drapeau tient) — un onglet rangé APRÈS la migration n’est pas repris', [b.run('TAB_AVANT'), b.stock.get('tour_tab_gestion')], ['', 'journal']);
  const m = bac({ stock: { tour_barre_messages: 'comptes,journal' } }); m.run('migrerReglagesAvant()');
  v('sans barre de Gestion, celle de Messages est reprise ; et une barre déjà rangée au nouveau nom n’est JAMAIS écrasée', [m.stock.get('tour_barre'), (() => { const x = bac({ stock: { tour_barre: 'agents', tour_barre_gestion: 'journal' } }); x.run('migrerReglagesAvant()'); return x.stock.get('tour_barre'); })()], ['comptes,journal', 'agents']);
  v('un rangement qui jette (appareil plein, navigation privée) ne casse pas le démarrage', (() => { const x = bac(); x.ctx.localStorage = { getItem() { throw new Error('plein'); }, setItem() { throw new Error('plein'); }, removeItem() { throw new Error('plein'); } }; try { x.run('migrerReglagesAvant()'); return 'ok'; } catch (e) { return String(e); } })(), 'ok');
}

/* ═══════════════ 4. LE BUG « CONTRATS » ═══════════════ */
console.log('\n4. Contrats : OP GESTION seulement — et la page le dit');
{
  const C = JSON.parse(bac().run('JSON.stringify(MENU.reduce(function(a,g){ return a.concat(g.vues); },[]).filter(function(x){ return x[0]==="contrats"; })[0])'));
  v('Contrats est déclaré à OP GESTION seule (la console OP MESSAGES d’avant le déclarait aux deux : son registre y paraissait comme celui d’OP MESSAGES)', C[2], 'gestion');
  v('⛔ chez un compte à deux applications, Contrats est ouvrable ; chez un compte SANS Gestion il ne l’est pas, ni par le menu, ni par vues(), ni par une adresse d’avant (#messages/contrats)',
    [bac({ apps: ['gestion', 'messages'] }).run('vues().indexOf("contrats")>=0'), bac({ apps: ['messages'] }).run('vues().indexOf("contrats")>=0'), tetes(bac({ apps: ['messages'] })).join().includes('contrats'),
      bac({ apps: ['messages'], hash: '#messages/contrats' }).run('lireHash().tab')], [true, false, false, 'accueil']);
  v('⛔ Contrats est au patron seul (il l’était), et le filtre « Tout · Gestion · Messages » n’y est PAS posé (il ferait croire qu’il vaut pour elle)',
    [bac().run('PATRON_SEUL.indexOf("contrats")>=0'), (() => { const b = bac(); b.run('TAB="contrats"'); return b.run('filtreAffiche()'); })()], [true, false]);
  const vc = fonction('vueContrats');
  vrai('⛔ et la page se dit : « Les contrats d’OP GESTION… OP MESSAGES n’en a pas ici » dans son en-tête', /enTete\('Contrats',\s*'Les contrats d’OP GESTION : [^']*OP MESSAGES n’en a pas ici\./.test(vc), vc.slice(0, 240));
  v('un filtre « Messages » gardé ne change PAS ce que Contrats montre (la fonction ne lit aucun filtre)', [/aMessages\(|aGestion\(|filtreEff\(|sourcesAff\(|FILTRE/.test(vc)], [false]);
}

/* ═══════════════ 5. UN COMPTE QUI N'A QU'UNE APPLICATION ═══════════════ */
console.log('\n5. Un compte qui n’a qu’une application : la sienne, sans filtre');
{
  const GESTION = bac({ apps: ['gestion'], filtre: 'messages' }), MSG = bac({ apps: ['messages'], filtre: 'gestion' }), DEUX = bac({ apps: ['gestion', 'messages'], role: 'collaborateur' });
  v('⛔ un compte Gestion seul ne voit JAMAIS OP MESSAGES, même avec « Messages » gardé sur l’appareil ; un compte Messages seul, jamais Gestion',
    [GESTION.run('filtreEff()'), GESTION.run('aMessages()'), GESTION.run('aGestion()'), MSG.run('filtreEff()'), MSG.run('aGestion()'), MSG.run('aMessages()')], ['gestion', false, true, 'messages', false, true]);
  v('le menu d’un compte Gestion seul : À traiter (Courrier), Clients (Entreprises), Abonnements, Surveillance — jamais Comptes ni Espaces OP MESSAGES',
    [tetes(GESTION)[0], tetes(GESTION)[1], menu(GESTION).includes('"comptes"'), menu(GESTION).includes('"espaces"')], ['accueil,support', 'entreprises,abonnements', false, false]);
  v('⛔ le menu d’un compte SANS Gestion : la tête d’« À traiter » devient Incidents, celle de « Clients » Comptes OP MESSAGES — et plus de Courrier, Demandes, Entreprises, Contrats, Agents…',
    tetes(MSG), ['accueil,incidents', 'comptes,abonnements', 'surveillance', 'essais,journal']);
  v('…chacune sous son nom de groupe seulement quand elle en a deux (Incidents reste « Incidents » seul ; Comptes est « Clients » parce que Espaces le rejoint)',
    JSON.parse(menu(MSG)).map(g => g.v.map(x => x[1]).join(',')), ['Accueil,Incidents', 'Clients,Abonnements', 'Surveillance', 'Accès,Système']);
  v('un compte à DEUX applications : les têtes habituelles, avec le nom du groupe', JSON.parse(menu(DEUX)).map(g => g.v.map(x => x[1]).join(',')), ['Accueil,À traiter', 'Clients,Abonnements', 'Surveillance']);
  v('un groupe rattaché garde ses écrans (Demandes, Incidents sous À traiter ; Comptes, Espaces sous Clients) : la vue ouverte allume la tête de SON groupe',
    [DEUX.run('tabMenu("incidents")'), DEUX.run('tabMenu("demandes")'), DEUX.run('tabMenu("espaces")'), MSG.run('tabMenu("incidents")'), MSG.run('tabMenu("espaces")')], ['support', 'support', 'entreprises', 'incidents', 'comptes']);
  v('les écrans d’un groupe : À traiter = Courrier · Demandes · Incidents (Gestion) ; Incidents seul sans Gestion (pas de rangée) ; Clients = Entreprises · Comptes · Espaces, ou Comptes · Espaces',
    [bac({ apps: ['gestion'] }).run('JSON.stringify(groupeDe("support").map(function(x){ return x[0]; }))'), MSG.run('JSON.stringify(groupeDe("support").map(function(x){ return x[0]; }))'),
      DEUX.run('JSON.stringify(groupeDe("entreprises").map(function(x){ return x[0]; }))'), MSG.run('JSON.stringify(groupeDe("entreprises").map(function(x){ return x[0]; }))')],
    ['["support","demandes","incidents"]', '["incidents"]', '["entreprises","comptes","espaces"]', '["comptes","espaces"]']);
  v('⛔ un lien d’avant ne mène jamais à ce que le compte n’a pas : setTab le renvoie à l’accueil (vues() est SA porte)', [MSG.run('vues().indexOf("support")<0&&vues().indexOf("entreprises")<0&&vues().indexOf("agents")<0'), GESTION.run('vues().indexOf("comptes")<0&&vues().indexOf("espaces")<0')], [true, true]);
  vrai('…et le menu, la barre et la feuille lisent la MÊME fonction (`menuVisible`) : aucune liste écrite à la main pour un compte', /function barreDispo\(\)\{[^}]*menuVisible\(\)/.test(SCRIPTS) && /menuVisible\(\)\.forEach/.test(fonction('ouvrirFeuille')) && /menuVisible\(\)\.forEach/.test(fonction('tiroirHtml')));
  vrai('⛔ le compte reçu par /moi relit le menu, la barre et la vue ouverte (un compte qui perd OP MESSAGES ne garde pas ses écrans)',
    /renderTabs\(\); if\(vues\(\)\.indexOf\(TAB\)<0\) setTab\('accueil',true\); else render\(\); majCompteursApp\(\); chargerPourFiltre\(\);/.test(fonction('entrer')));
  vrai('⛔ ce que la Tour charge au démarrage ne dépend pas du filtre mais des APPLICATIONS du compte (chargerTout lit MYAPPS) : un compte sans Gestion n’appelle aucune route de Gestion',
    /function chargerTout\(\)\{ var g=MYAPPS\.indexOf\('gestion'\)>=0;/.test(SCRIPTS));
}

/* ═══════════════ 6. UNE SEULE LISTE D'ENTREPRISES, UNE SEULE LISTE D'ACCÈS ═══════════════ */
console.log('\n6. Une liste d’entreprises (badge « OP MESSAGES »), une liste d’accès (colonne « appli »)');
{
  const b = bac({ ent_liste: [{ nom: 'A', opMessages: true }, { nom: 'B' }, { nom: 'C', opMessages: true, technique: true }] });
  v('msgBadge : le badge « OP MESSAGES » sur une entreprise ouverte, rien sur une fermée ; entOuvertesMsg ne compte pas les espaces techniques',
    [/past p-app messages[^>]*>OP MESSAGES<\/span>/.test(b.run('msgBadge({opMessages:true})')), b.run('msgBadge({})'), b.run('entOuvertesMsg().length')], [true, '', 1]);
  const ve = fonction('vueEntreprises');
  vrai('la liste des entreprises porte le badge (ligne « cliente » et ligne simple) et un filtre « OP MESSAGES » (segment, et filtre posé par l’accueil)',
    (ve.match(/msgBadge\(o\)/g) || []).length >= 3 && /segE\.push\(\['opmessages','OP MESSAGES'/.test(ve) && /if\(ENT\.filtre==='opmessages'\) return !!o\.opMessages&&!o\.technique;/.test(ve) && /opmessages:'ouvertes à OP MESSAGES'/.test(SCRIPTS));
  vrai('⛔ le geste d’ouvrir ou fermer OP MESSAGES est dans la FICHE (patron seul) et dans les accès publics : `tourApps`, déjà écrit — aucune seconde route, aucun détour par « sa console »',
    /MYROLE==='patron'&&es\.slug\?' <button type="button" class="btn-fant'\+\(es\.opMessages\?' danger':' teinte'\)\+'" onclick="tourApps\(/.test(SCRIPTS) && !/tourApps\(/.test(ve));
  vrai('l’accueil mène à cette liste : la tuile « ouvertes à OP MESSAGES » pose le filtre puis ouvre Entreprises', /entFiltrePoser\('opmessages'\);setTab\('entreprises'\)/.test(fonction('accueilMessages')));
  /* Accès : le filtre dit quelles bêtas ; la colonne dit laquelle chacune ouvre ; le formulaire dit celle qu'il ouvrira */
  const BETAS = [{ id: 'b1', login: 'marc', apps: ['gestion'] }, { id: 'b2', login: 'mona', apps: ['messages'] }, { id: 'b3', login: 'ancien' }];
  const acces = (f, apps) => { const x = bac({ filtre: f, apps }); x.ctx.BT = { comptes: BETAS, app: '' }; vm.runInContext(fonction('btAppsDe') + '\n' + ligne('var BT_APPS=') + '\n' + fonction('btAvec') + '\n' + fonction('btDeLaConsole') + '\n' + fonction('btApp') + '\n' + fonction('btChoisirApp') + '\n' + fonction('btAppsPastilles'), x.ctx); return x; };
  v('une seule liste de bêtas : « Tout » les montre toutes (un accès d’avant, sans champ, vaut Gestion) ; « Gestion » celles de Gestion ; « Messages » celle de Messages',
    ['tout', 'gestion', 'messages'].map(f => acces(f).run('JSON.stringify(btDeLaConsole().map(function(c){ return c.login; }))')), ['["marc","mona","ancien"]', '["marc","ancien"]', '["mona"]']);
  v('la colonne « appli » : chaque ligne dit SON application ; le formulaire ouvre celle du filtre (Messages) ou Gestion, et un compte sans Gestion ne peut proposer qu’OP MESSAGES',
    [acces('tout').run('btAppsPastilles({apps:["messages"]})').includes('OP MESSAGES'), acces('tout').run('btApp()'), acces('messages').run('btApp()'), acces('gestion', ['messages']).run('btApp()')], [true, 'gestion', 'messages', 'messages']);
  const accL = fonction('accLigneBeta');
  vrai('la ligne d’un accès porte la colonne « appli » (btAppsPastilles)', /btAppsPastilles\(c\)/.test(accL));
}

/* ═══════════════ 7. LES VUES ═══════════════ */
console.log('\n7. Chaque vue est dessinée par une seule branche de renderVue, sous la bonne rangée');
{
  const rv = fonction('renderVue');
  const branches = [...rv.matchAll(/TAB==='(\w+)'[^;]*?v\.innerHTML=([^;]+);/g)].map(m => m[1]);
  v('toutes les vues du menu (et leurs rattachées) ont leur branche ; plus de branche « facturation » (alias d’Abonnements)', [...new Set(JSON.parse(bac().run('JSON.stringify(vues())')))].filter(t => !branches.includes(t) && !/TAB==='support'/.test(rv)), []);
  vrai('⛔ Surveillance : UNE page, deux onglets (Incidents, Service) — vueService montre les deux applications', /else if\(TAB==='surveillance'\) v\.innerHTML=sousOnglets\('surveillance',\[\['apps','Incidents'\],\['service','Service'\]\]\)\+\(SOUS\.surveillance==='service'\?vueService\(\):survAvert\(\)\+vueSurveillance\(\)\);/.test(rv));
  vrai('⛔ Abonnements & facturation : Abonnements · Facturation · Devis IA — les abonnements d’OP MESSAGES y sont en groupe (vueAbonnementsTous)', /SOUS\.abonnements==='devisia'\?vueDevisIA\(\):SOUS\.abonnements==='facturation'\?vueFacturation\(\):vueAbonnementsTous\(\)/.test(rv)
    && /function vueAbonnementsTous\(\)/.test(SCRIPTS) && /vueAbonnements\(\)\+'<section class="ac-src ac-suite" aria-label="OP MESSAGES">'/.test(fonction('vueAbonnementsTous')));
  vrai('⛔ Clients : la rangée du groupe (Entreprises · Comptes OP MESSAGES · Espaces OP MESSAGES) se retire dans la FICHE d’une entreprise, les onglets propres d’Entreprises (Liste · Comptes du site · Connexions) restent dessous',
    /\(ENT\.sel\?'':groupeOnglets\('entreprises'\)\)\+sousOnglets\('entreprises',\[\['liste','Liste'\],\['comptes','Comptes du site'\],\['connexions','Connexions'\]\]\)/.test(rv));
  vrai('⛔ À traiter : Courrier, Demandes et Incidents portent la rangée du groupe ; le Courrier garde son module (courrierGarde) sous elle', /groupeOnglets\('support'\)\+vueCourrier\(\)/.test(rv) && /groupeOnglets\('demandes'\)\+vueDemandes\(\)/.test(rv) && /groupeOnglets\('incidents'\)\+vueIncidents\(\)/.test(rv));
  const sa = fonction('segsAbonnements');
  const segs = (apps, role) => { const b = bac({ apps, role }); vm.runInContext(sa, b.ctx); return b.run('segsAbonnements().map(function(x){ return x[0]; }).join()'); };
  v('les onglets d’Abonnements : patron Gestion = Abonnements · Facturation · Devis IA ; collaborateur = Abonnements · Devis IA (la facturation est au patron) ; sans Gestion = aucun onglet (une seule entrée n’est pas un choix)',
    [segs(['gestion', 'messages']), segs(['gestion'], 'collaborateur'), segs(['messages'])], ['abos,facturation,devisia', 'abos,devisia', 'abos']);
  vrai('…et `sousOnglets` ne dessine rien pour une seule entrée', /function sousOnglets\(vue,segs\)\{\s*if\(segs\.length<2\) return '';/.test(SCRIPTS));
}

  console.log('\nLa Messagerie (le pont des agents, 28 octobre 2026 — venu de test-3096) : le bandeau « Vos agents sont maintenant dans OP MESSAGES » a laissé la place au CADRE (v2.120)');
  /* v2.120 (28 octobre 2026 au soir, Justin : « là je veux OP MESSAGES avec les mêmes fonctions que OP MESSAGES Pro ») : la Messagerie AFFICHE le vrai OP MESSAGES dans un cadre. Le bandeau d'avant — un lien
     vers un AUTRE onglet, posé parce que la politique d'OP MESSAGES interdisait d'être encadré — n'a plus de raison d'être : OP MESSAGES autorise désormais teamop.fr à l'encadrer (configuration de la bêta). Ce banc ne
     garde donc plus que ce qui reste vrai (l'adresse, le lien vers un nouvel onglet) ; le cadre, ses états et son branchement sont gardés par `test-3127`, qui joue les mêmes fonctions. */
  {
    const TOUR = SRC;
    const ADR = (/var BETA_MSG_ADRESSE='([^']+)';/.exec(TOUR) || [])[1];
    v('(population) l\'adresse d\'OP MESSAGES bêta est celle de la Tour', ADR, 'https://msg-beta.teamop.fr');
    vrai('le bandeau « Vos agents sont maintenant dans OP MESSAGES » n\'existe plus (ni sa fonction, ni sa classe, ni son texte)', !/messBandeauOpm|opm-bandeau|Vos agents sont maintenant dans OP MESSAGES/.test(CODE));
    vrai('⛔ le lien vers OP MESSAGES reste un lien dans un NOUVEL onglet, sans lien d\'opener, vers l\'adresse de la Tour (« Ouvrir dans un nouvel onglet »)', /function opmLienOuvrir\(cls\)\{ return '<a class="'\+cls\+'" href="'\+esc\(opmAdresse\(\)\)\+'" target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet<\/a>'; \}/.test(SCRIPTS) && /function opmAdresse\(\)\{ return BETA_MSG_ADRESSE\+'\/'; \}/.test(SCRIPTS));
    vrai('⛔ le cadre n\'est PAS écrit dans le texte de la page (`createElement(\'iframe\')` dans `opmMonter`), et ne vise que l\'adresse de la Tour — jamais une adresse en dur', !/<iframe[^>]*(msg(-beta)?\.teamop\.fr|src=)/i.test(CODE) && /f\.src=opmAdresse\(\);/.test(SCRIPTS));
  }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
