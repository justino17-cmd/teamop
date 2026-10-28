/* ⛔ CE QUE CE FICHIER GARDE — L'ASSEMBLAGE DES SIX AGENTS DE LA PLATEFORME (23 octobre 2026), au niveau du MODULE.
     Le VRAI `agents-plateforme.js` monte les six vrais agents sur les vrais `agents.js`, `conversations.js`, `cerveau.js`, `plateforme-etat.js`, `incidents-agents.js` ;
     seuls l'horloge, Claude (un faux qui GARDE ce qu'il reçoit), l'état de santé, la sauvegarde, la conservation, la sécurité et les courriels envoyés sont simulés.
       · la cadence : Max, Théo et Nina toutes les cinq minutes, Jules et Victor chaque minute, Inès toutes les dix — dans l'ordre Max → Jules (qui prend l'incident de Max au
         MÊME passage) ; deux passages simultanés ne se chevauchent pas ; une panne d'un agent n'arrête pas les autres ;
       · de bout en bout : une sauvegarde en défaut ouvre UN incident, l'annonce UNE fois dans « Plateforme », Jules propose un diagnostic (un appel à Claude), le retour à la
         normale se dit « rétabli » et ferme l'incident — sans un appel de plus ;
       · les relevés confiés à la messagerie sont FERMÉS (rien n'est annulé par `fermer()`), et chaque rôle des six lit les siens (`plateforme-roles.js`) ;
       · les routes : lecture réservée à la Tour, tout ce qui engage au patron, un agent inconnu refusé, un passage en cours refuse le suivant (409) ;
       · le câblage d'`index.js` : UN bloc sous son `try`, les trois routes dans `MON_GESTES`, l'outil `arbitrer` et la part « qualité » des réunions branchés.
   Ce que ce fichier ne voit pas, `test-2925` le voit : le VRAI `index.js`, parlé en HTTP. */
const fs = require('fs'), path = require('path');
const { monter, SANTE_BONNE, S, RACINE } = require('./banc-plateforme');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();
const MIN = 60000;
const AC = require(S('agent-conversation.js'));
const EQ = require(S('agent-equipe.js'));
const PL = require(S('agents-plateforme.js'));
const ROLES_PLUS = require(S('plateforme-roles.js'));
const SRC_INDEX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const SANS_COMM = t => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE_INDEX = SANS_COMM(SRC_INDEX);

function assemble(o) {
  o = o || {};
  const B = monter(Object.assign({ claude: () => 'Diagnostic du banc : la minuterie ne tourne plus ; redémarre le service puis relis le journal.' }, o));
  const sante = { j: SANTE_BONNE(), lectures: 0, panne: false };
  const sv = { derniere: { ok: true, ts: B.horloge.t, motif: '', octets: 1 }, histo: [] };
  const cons = { suivis: 4, enPreavis: 0, echus: 0, jours: 730, jamaisAbonnes: 0, balayageOk: true };
  const secu = { verrousTour: 0, verrousPortail: 0, clesInvalides: 0 };
  const envoyes = [];
  const P = PL(B.app, { agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, fichier: B.fichier, monAdmin: (req, res, next) => (req.tourUser ? next() : res.status(401).json({ error: 'non connecté' })),
    monPatronStrict: (req, res, next) => (req.tourUser && req.tourUser.role === 'patron' ? next() : res.status(403).json({ error: 'réservé au patron' })), maintenant: B.maintenant,
    issues: () => B.issues, sauverIssues: () => { B.sauvees.n++; },
    sante: async () => { sante.lectures++; if (sante.panne) throw new Error('panne'); return JSON.parse(JSON.stringify(sante.j)); },
    sauvegarde: { etat: () => sv }, conservation: { sante: () => Object.assign({}, cons) }, contrats: { etat: () => ({ enAttente: 0, plusVieuxJours: 0, paquetsBloques: 0, paquetsTotal: 6, piecesAConfirmer: 0, envoyes: 0, acceptes: 0, total: 0 }) },
    securite: () => Object.assign({}, secu), courriels: depuis => envoyes.filter(c => c.ts >= depuis), courrier: () => ({ aTraiter: 0, enCours: 0 }), clients: () => ({ demandesEnAttente: 0 }) });
  /* la route lit `app.routes` du banc : on les rejoue par `appeler` */
  return Object.assign(B, { P, sante, sv, cons, secu, envoyes });
}
const allumer = async (B, ids) => { for (const id of ids) await B.appeler('POST /api/monitor/agents/mode', { tourUser: B.PATRON, body: { agent: id, mode: 'brouillon' } }); };
const dansFil = (B, f, de) => B.fil(f).filter(m => m.de === de).map(m => m.texte);

console.log('\n── 2924 · les six agents de la plateforme, assemblés ──');
(async () => {
  console.log('\n1. La cadence et l’ordre');
  {
    const B = assemble({ mode: 'arret' });
    await allumer(B, ['max', 'jules', 'theo', 'nina', 'ines', 'victor']);
    const r1 = await B.P.tic();
    v('premier passage : les six passent, dans l’ordre Max, Théo, Nina, Jules, Inès, Victor', Object.keys(r1), ['max', 'theo', 'nina', 'jules', 'ines', 'victor']);
    v('l’ordre exporté est celui-là, les pas aussi', [PL.ORDRE, PL.PAS], [['max', 'theo', 'nina', 'jules', 'ines', 'victor'], { max: 5, theo: 5, nina: 5, jules: 1, ines: 10, victor: 1 }]);
    B.avancer(MIN);
    v('une minute plus tard : Jules et Victor seulement', Object.keys(await B.P.tic()), ['jules', 'victor']);
    B.avancer(4 * MIN);
    v('cinq minutes après le premier : Max, Théo, Nina reviennent (et Jules, Victor)', Object.keys(await B.P.tic()), ['max', 'theo', 'nina', 'jules', 'victor']);
    B.avancer(5 * MIN);
    v('dix minutes : Inès revient aussi', Object.keys(await B.P.tic()), ['max', 'theo', 'nina', 'jules', 'ines', 'victor']);
    const lect = B.sante.lectures;
    B.avancer(MIN);
    await B.P.tic();
    v('⛔ Max, Théo et Nina ne relisent PAS la santé chaque minute (les lectures ne montent pas entre deux passages de cinq minutes)', B.sante.lectures, lect);
    B.nettoyer();

    /* deux passages à la fois : le second est refusé, pas empilé */
    const C = assemble({ mode: 'arret' });
    await allumer(C, ['max', 'jules', 'theo', 'nina', 'ines', 'victor']);
    const [a, b] = await Promise.all([C.P.tic(), C.P.tic()]);
    v('⛔ deux tic simultanés : un seul travaille, l’autre le dit', [Object.keys(a).length > 1, b], [true, { saute: 'en_cours' }]);

    /* une panne de la santé n'arrête personne : Jules et Victor passent quand même */
    C.sante.panne = true; C.avancer(10 * MIN);
    const r = await C.P.tic();
    v('la santé illisible : Max le dit à sa façon (rien d’inventé), les autres agents passent quand même', [Object.keys(r), !!r.victor, !!r.jules], [['max', 'theo', 'nina', 'jules', 'ines', 'victor'], true, true]);
    /* un agent qui JETTE n'arrête pas les suivants : il est noté « erreur », Jules et Victor passent */
    C.P.max.passer = async () => { throw new Error('panne de Max'); };
    C.avancer(10 * MIN);
    const rp = await C.P.tic();
    v('⛔ Max jette : le résultat dit « erreur » pour lui, et tous les agents d’après passent quand même', [rp.max, Object.keys(rp)], [{ saute: 'erreur' }, ['max', 'theo', 'nina', 'jules', 'ines', 'victor']]);
    C.nettoyer();
  }

  console.log('\n2. De bout en bout : une sauvegarde en défaut, de l’alarme au « rétabli »');
  {
    const B = assemble();
    await allumer(B, ['max', 'jules', 'theo', 'nina', 'ines', 'victor']);
    await B.P.tic();
    const avant = B.recus.length;
    B.sante.j.sauvegarde = Object.assign({}, B.sante.j.sauvegarde, { ok: false, ageH: 30 });
    B.avancer(5 * MIN);
    const r = await B.P.tic();
    v('la sauvegarde passe en défaut : Max annonce (un épisode), un incident s’ouvre dans le registre de la Tour', [r.max.nouveaux > 0, B.issues.length, B.issues[0] && B.issues[0].app], [true, 1, 'serveur']);
    vrai('…Jules a pris l’incident au MÊME passage, avec UN appel à Claude (le diagnostic)', B.recus.length === avant + 1 && B.issues[0].par === 'Jules', JSON.stringify([B.recus.length - avant, B.issues[0].par]));
    const annonces = dansFil(B, 'plateforme', 'max');
    v('« Plateforme » : une annonce de Max', annonces.length, 1);
    B.avancer(5 * MIN); await B.P.tic();
    B.avancer(5 * MIN); await B.P.tic();
    v('⛔ trois passages de plus dans le même défaut : ni nouvelle annonce, ni nouvel incident, ni nouvel appel à Claude', [dansFil(B, 'plateforme', 'max').length, B.issues.length, B.recus.length], [1, 1, avant + 1]);
    B.sante.j.sauvegarde = Object.assign({}, B.sante.j.sauvegarde, { ok: true, ageH: 2 });
    for (let k = 0; k < 3; k++) { B.avancer(5 * MIN); await B.P.tic(); }
    vrai('retour à la normale : « rétabli » dit une fois, l’incident fermé par Jules, aucun appel à Claude de plus', dansFil(B, 'plateforme', 'max').some(t => /Rétabli/.test(t)) && B.issues[0].statut === 'corrige' && B.recus.length === avant + 1, JSON.stringify([dansFil(B, 'plateforme', 'max'), B.issues[0].statut]));
    B.nettoyer();
  }

  console.log('\n3. Les relevés confiés à la messagerie : fermés, et lus rôle par rôle');
  {
    const B = assemble({ mode: 'arret' });
    await allumer(B, ['max', 'ines']);
    await B.P.tic();
    B.sante.j.sauvegarde = Object.assign({}, B.sante.j.sauvegarde, { ok: false, ageH: 30 });
    B.avancer(5 * MIN); await B.P.tic();
    for (const [nom, f] of Object.entries(B.P.faits)) {
      const r = f();
      v('le relevé « ' + nom + ' » est FERMÉ : `fermer()` n’en retire rien (ni texte, ni chaîne libre)', [r === null ? 'null' : JSON.stringify(AC.fermer(JSON.parse(JSON.stringify(r)))) === JSON.stringify(r)], [true]);
    }
    const cv = B.P.victor.collecter();
    vrai('⛔ Victor voit l’alarme ouverte dans SON relevé du matin (un nombre, jamais le texte)', cv.plateforme && cv.plateforme.alarmesOuvertes === 1 && cv.plateforme.alarmesCritiques === 1, JSON.stringify(cv.plateforme));
    const rel = await B.P.resume();
    vrai('⛔ le relevé de la Tour ne livre d’un épisode que ses champs (identifiant, règle, zone, niveau, dates, drapeaux, phrase du serveur) — pas ses valeurs brutes', rel.episodes.length >= 1 && rel.episodes.every(e => Object.keys(e).sort().join() === 'annonce,cle,depuis,fin,id,incident,niveau,pris,proprio,texte,zone'), JSON.stringify(rel.episodes[0]));
    const p = B.P.faits.plateforme();
    vrai('« plateforme » compte l’épisode ouvert, par clé de NOTRE table', p.episodesOuverts >= 1 && typeof p.actives === 'object' && Object.keys(p.actives).some(k => /^sauvegarde_/.test(k)), JSON.stringify(p));
    for (const id of Object.keys(ROLES_PLUS.AJOUTS)) {
      const attendus = ROLES_PLUS.AJOUTS[id].faits;
      vrai(id + ' lit ses relevés (' + attendus.join(', ') + ') ET garde ceux d’avant', attendus.every(f => EQ.ROLES[id].faits.includes(f)) && AC.ROLES[id].faits.every(f => EQ.ROLES[id].faits.includes(f)), JSON.stringify(EQ.ROLES[id].faits));
      vrai(id + ' : chaque relevé existe côté serveur (sinon l’agent croit lire quelque chose et lit « lecture impossible »)', EQ.ROLES[id].faits.filter(f => !['sante', 'equipe', 'courrier', 'reprise', 'clients', 'dossier'].includes(f)).every(f => typeof B.P.faits[f] === 'function'));
    }
    vrai('les entrées de `agent-conversation.js` ne sont PAS modifiées (copie, pas mutation)', JSON.stringify(AC.ROLES.max.faits) === JSON.stringify(['sante']) && !/Toutes les cinq minutes/.test(AC.ROLES.max.mission));
    vrai('chaque mission est élargie UNE fois', Object.keys(ROLES_PLUS.AJOUTS).every(id => EQ.ROLES[id].mission.split(ROLES_PLUS.AJOUTS[id].mission).length === 2));
    B.nettoyer();
  }

  console.log('\n4. Les routes');
  {
    const B = assemble({ mode: 'arret' });
    await allumer(B, ['max', 'jules', 'theo', 'nina', 'ines', 'victor', 'camille']);
    v('lecture sans compte : refusée', (await B.appeler('GET /api/monitor/agents/plateforme', {})).status, 401);
    const lec = await B.appeler('GET /api/monitor/agents/plateforme', { tourUser: B.COLLAB });
    v('lecture par un compte de la Tour : le relevé (six agents, épisodes, incidents)', [lec.status, Object.keys(lec.corps.agents), Array.isArray(lec.corps.episodes), lec.corps.ok], [200, ['max', 'theo', 'nina', 'jules', 'ines', 'victor'], true, true]);
    v('⛔ passer : réservé au patron', (await B.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: B.COLLAB, body: { agent: 'max' } })).status, 403);
    v('un agent inconnu (ou Hugo) : refusé', [(await B.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: B.PATRON, body: { agent: 'hugo' } })).status, (await B.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: B.PATRON, body: {} })).status], [400, 400]);
    const l0 = B.sante.lectures;
    const p = await B.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: B.PATRON, body: { agent: 'max' } });
    v('passer Max : un passage, une lecture de la santé', [p.status, p.corps.ok, B.sante.lectures - l0], [200, true, 1]);
    /* un passage en cours refuse le suivant */
    const lent = assemble({ mode: 'arret' });
    await allumer(lent, ['max']);
    lent.sante.j = SANTE_BONNE();
    const [r1, r2] = await Promise.all([lent.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: lent.PATRON, body: { agent: 'max' } }), lent.appeler('POST /api/monitor/agents/plateforme/passer', { tourUser: lent.PATRON, body: { agent: 'max' } })]);
    v('⛔ deux « passer » à la fois : le second reçoit 409', [r1.status, r2.status].sort(), [200, 409]);
    lent.nettoyer();
    const pt = await B.appeler('POST /api/monitor/agents/plateforme/point', { tourUser: B.PATRON, body: {} });
    v('le point de Victor à la demande : dit dans « Équipe »', [pt.status, pt.corps.ok, dansFil(B, 'equipe', 'victor').length], [200, true, 1]);
    v('⛔ le point : réservé au patron', (await B.appeler('POST /api/monitor/agents/plateforme/point', { tourUser: B.COLLAB, body: {} })).status, 403);
    B.agents.deposer('camille', 'nina', 'escalade_humain', { fil: 'f2924', motif: 'rgpd' });
    await B.P.nina.passer();
    const gid = B.P.nina.rgpd()[0].id;
    v('RGPD : un identifiant mal formé, un inconnu', [(await B.appeler('POST /api/monitor/agents/plateforme/rgpd', { tourUser: B.PATRON, body: { id: '../x' } })).status, (await B.appeler('POST /api/monitor/agents/plateforme/rgpd', { tourUser: B.PATRON, body: { id: 'inconnu1' } })).status], [400, 404]);
    v('⛔ RGPD : réservé au patron', (await B.appeler('POST /api/monitor/agents/plateforme/rgpd', { tourUser: B.COLLAB, body: { id: gid } })).status, 403);
    const cl = await B.appeler('POST /api/monitor/agents/plateforme/rgpd', { tourUser: B.PATRON, body: { id: gid } });
    v('Justin marque la demande traitée : elle sort des demandes ouvertes', [cl.status, B.P.nina.rgpd().length], [200, 0]);
    const lec2 = await B.appeler('GET /api/monitor/agents/plateforme', { tourUser: B.PATRON });
    vrai('⛔ le relevé de la Tour ne contient rien du courrier d’un client ni d’une personne (que des nombres, des clés, nos phrases)', !/@|pirate|Bonjour|f2924/.test(JSON.stringify(lec2.corps)), JSON.stringify(lec2.corps).slice(0, 300));
    B.nettoyer();
  }

  console.log('\n5. Les raccourcis : l’arbitrage de Victor, la part « qualité » des réunions');
  {
    const B = assemble({ mode: 'arret' });
    await allumer(B, ['victor', 'camille', 'lea']);
    v('`arbitrer` passe par Victor (deux agents, une décision)', (() => { const r = B.P.arbitrer({ entre: ['camille', 'lea'], decision: 'Léa garde la relance' }, { fil: 'equipe', prof: 1 }); return [r.ok, dansFil(B, 'equipe', 'victor').length]; })(), [true, 1]);
    v('…une entrée invalide est refusée sans jeter', (() => { try { return B.P.arbitrer(null, null).ok; } catch (e) { return 'jette'; } })(), false);
    v('la part qualité d’Inès sur une semaine vide : zéro jour relu', B.P.qualite(0, B.horloge.t + 1000), { joursRelus: 0 });
    B.nettoyer();
  }

  console.log('\n6. Le câblage d’index.js : un bloc, ses routes, ses crochets');
  {
    const blocs = CODE_INDEX.split("require('./agents-plateforme')").length - 1;
    v('UN seul montage des agents de la plateforme', blocs, 1);
    const i0 = CODE_INDEX.indexOf("plateformeMod = require('./agents-plateforme')"), iTry = CODE_INDEX.lastIndexOf('try {', i0), iCatch = CODE_INDEX.indexOf('catch (e) { plateformeMod = null', i0);
    vrai('…dans son PROPRE try (un échec n’emporte ni la messagerie ni les réunions)', i0 > 0 && iTry > 0 && iCatch > i0 && CODE_INDEX.slice(iTry, i0).split('\n').length <= 3 && !/\n\s*\}\s*catch/.test(CODE_INDEX.slice(iTry, i0)));
    vrai('…qui lit la santé SANS la vider (`santeCorps(false)`, jamais /health)', /sante: \(\) => santeCorps\(false\)/.test(CODE_INDEX));
    vrai('…et démarre la cadence', /plateformeMod\.demarrer\(\)/.test(CODE_INDEX));
    for (const g of ['agents/plateforme/passer', 'agents/plateforme/point', 'agents/plateforme/rgpd', 'agents/plateforme/rgpd/declarer']) vrai('la route « ' + g + ' » est déclarée dans MON_GESTES', new RegExp("'" + g + "': '").test(CODE_INDEX));
    vrai('la messagerie reçoit l’outil `arbitrer` de Victor', /arbitrer: \(e, c\) => plateformeMod \? plateformeMod\.arbitrer\(e, c\)/.test(CODE_INDEX));
    vrai('les réunions reçoivent la part « qualité » d’Inès', /qualite: \(debut, fin\) => plateformeMod \? plateformeMod\.qualite\(debut, fin\)/.test(CODE_INDEX));
    vrai('Nina lit les verrous de la Tour (ceux qui courent encore), ceux du portail et la série des preuves de clé refusées', /verrousTour: \[\.\.\.monLock\.values\(\)\]\.filter\(l => l && l\.until > Date\.now\(\)\)\.length/.test(CODE_INDEX) && /verrousPortail: \(comptes && typeof comptes\.bloques === 'function'\) \? comptes\.bloques\(\) : null/.test(CODE_INDEX) && /clesInvalides: cleEquipeVu\.invalide/.test(CODE_INDEX));
    vrai('Inès reçoit les courriels PARTIS par `brouillonsMod.envoyes` (jamais une adresse)', /courriels: \(depuis\) => \(brouillonsMod && typeof brouillonsMod\.envoyes === 'function' \? brouillonsMod\.envoyes\(depuis\) : null\)/.test(CODE_INDEX));
    vrai('Théo lit la sauvegarde et la conservation du serveur, Nina les contrats', /sauvegarde: \{ etat: \(\) => \(sauvegarde && typeof sauvegarde\.etat === 'function' \? sauvegarde\.etat\(\) : null\) \}/.test(CODE_INDEX) && /conservation: \{ sante: \(\) => \(conservation && typeof conservation\.sante === 'function' \? conservation\.sante\(\) : null\) \}/.test(CODE_INDEX) && /contrats: \{ etat: \(\) => \(contratsMod && typeof contratsMod\.etat === 'function' \? contratsMod\.etat\(\) : null\) \}/.test(CODE_INDEX));
    vrai('les relevés de la plateforme rejoignent ceux de la messagerie (une seule table)', /Object\.assign\(faitsAgents, plateformeMod\.faits\)/.test(CODE_INDEX));
    const routes = [...fs.readFileSync(S('agents-plateforme.js'), 'utf8').matchAll(/app\.(get|post)\('(\/api\/monitor\/[^']+)'/g)].map(m => m[1] + ' ' + m[2]);
    v('les routes du module : une lecture, quatre gestes', routes, ['get /api/monitor/agents/plateforme', 'post /api/monitor/agents/plateforme/passer', 'post /api/monitor/agents/plateforme/point', 'post /api/monitor/agents/plateforme/rgpd', 'post /api/monitor/agents/plateforme/rgpd/declarer']);
    vrai('chaque geste (POST) engage le patron seul', [...fs.readFileSync(S('agents-plateforme.js'), 'utf8').matchAll(/app\.post\('[^']+', (\w+)/g)].every(m => m[1] === 'monPatronStrict'));
    vrai('la lecture est celle de la Tour', /app\.get\('\/api\/monitor\/agents\/plateforme', monAdmin/.test(fs.readFileSync(S('agents-plateforme.js'), 'utf8')));
  }

  console.log('\n7. Le compteur de comptes bloqués du portail (`comptes.bloques()`), lu par Nina');
  {
    const fs2 = require('fs'), os = require('os');
    const dir = fs2.mkdtempSync(path.join(os.tmpdir(), 'b2924-'));
    const routes = {};
    const app = { get: (p, ...h) => { routes['GET ' + p] = h; }, post: (p, ...h) => { routes['POST ' + p] = h; }, use() {} };
    const comptes = require(S('comptes.js')).monterComptes(app, { dossier: dir, mailerEnvoi: () => Promise.resolve(), quotaOk: () => true, siteBase: 'https://teamop.fr', journal: () => {} });
    const appeler = async (cle, body) => { const hs = routes[cle]; const res = { code: 200, corps: null, status(c) { this.code = c; return this; }, json(x) { this.corps = x; return this; }, setHeader() {}, cookie() { return this; } }; await hs[hs.length - 1]({ body, headers: {}, ip: '10.9.9.9', get() { return ''; } }, res); return res; };
    const h = n => 'e'.repeat(48) + String(n).padStart(16, '0');
    vrai('(préparation) un compte du portail est créé', (await appeler('POST /api/compte/creer', { email: 'bloque-2924@exemple.fr', h: h(0) })).code === 200);
    v('aucun compte bloqué au départ', comptes.bloques(), 0);
    for (let k = 1; k <= 7; k++) await appeler('POST /api/compte/connexion', { email: 'bloque-2924@exemple.fr', h: h(k) });
    v('sept échecs : pas encore bloqué (le seuil est huit)', comptes.bloques(), 0);
    await appeler('POST /api/compte/connexion', { email: 'bloque-2924@exemple.fr', h: h(8) });
    v('⛔ le huitième bloque le compte : UN, un NOMBRE (jamais l’adresse)', [comptes.bloques(), typeof comptes.bloques()], [1, 'number']);
    const vraiMaintenant = Date.now; Date.now = () => vraiMaintenant() + 16 * 60000;
    try { v('⛔ quinze minutes plus tard le blocage est LEVÉ : le compteur redescend à zéro (il ne cumule pas les blocages passés)', comptes.bloques(), 0); } finally { Date.now = vraiMaintenant; }
    try { fs2.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
