/* ⛔ CE QUE CE FICHIER GARDE — JUSTIN LIT ET VALIDE UN MAIL DE PAULINE DEPUIS OP MESSAGES (30 octobre 2026).

   Justin, capture à l'appui : le lien de l'annonce ouvrait, dans la Tour, un cadre d'OP MESSAGES vide ; la vraie liste à valider était derrière « Ancienne messagerie de la Tour » — « je ne peux rien faire ».
   Depuis : l'annonce porte le TEXTE du mail (objet + corps, tel qu'il partirait), « OUI/OK <n> » accepte et « NON <n> » refuse — toujours par `pauline.decider`, LA fonction de la route de la Tour —,
   et le lien ouvre DIRECTEMENT l'ancienne messagerie (`#gestion/messagerie-tour`). Le VRAI `pauline.js` et le VRAI `pont-messages.js` contre un FAUX OP MESSAGES ; la Tour : les vraies fonctions de `tour.html`.
     1. l'annonce : première ligne inchangée, puis le corps (retours à la ligne gardés, contrôles retirés), puis les règles OUI / NON / lien ; jamais d'adresse ni de contact ;
     2. un corps trop long est COUPÉ (« … (suite dans la Tour) ») et « OUI <n> » est refusé pour CE mail, avec une phrase claire — « NON <n> » reste permis ; un corps vide de même ;
     3. « OUI <n> » et « OK <n> » (casse, espaces) acceptent par `decider`, pour la version LUE (`maj`) ; la réponse dit « accepté… pas encore parti », jamais « parti » ;
     4. 409 (déjà traité, réécrit depuis la lecture, parti entre-temps), numéro inconnu, annonce d'avant (sans texte montré), échec d'écriture : chacun a SA phrase, aucune décision de trop ;
     5. ⛔ rien du corps dans le journal du serveur ni dans le fichier d'état du pont ;
     6. le lien : partout `#gestion/messagerie-tour` (annonce, aide, notification de `pauline.js`) ; la Tour ouvre l'ANCIENNE messagerie sur cette ancre (au chargement et à la navigation).
   Pour éprouver la Tour : TOUR_FICHIER=<copie mutée> node tests/test-3225.js. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + JSON.stringify(d) : ''), !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3225-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();
const SECRET = crypto.randomBytes(32).toString('hex');
const JETON = crypto.randomBytes(24).toString('hex');

/* ── le FAUX OP MESSAGES : il note, il numérote, il reconnaît un `cid` déjà posé ── */
const etat = { requetes: [], seq: {}, cids: {}, evenements: [], curseur: 100, avatars: {} };
const faux = http.createServer((q, r) => { const m = []; q.on('data', d => m.push(d)); q.on('end', () => {
  const brut = Buffer.concat(m); let j = null; try { j = brut.length ? JSON.parse(brut.toString('utf8')) : null; } catch (e) {}
  etat.requetes.push({ m: q.method, url: q.url, corps: j, octets: brut });
  const rep = (code, o) => { r.writeHead(code, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (q.url === '/api/pont/installer') return rep(200, { ok: true, fils: [], robots: [], creees: {}, avatars: etat.avatars });
  if (q.url === '/api/pont/poster') return rep(200, { ok: true, resultats: j.messages.map(x => { if (x.texte.includes('REFUSE-PAR-LE-FAUX')) return { ok: false, raison: 'champ_invalide' }; if (etat.cids[x.cid]) return { ok: true, deja: true, seq: etat.cids[x.cid] }; etat.seq[x.fil] = (etat.seq[x.fil] || 0) + 1; etat.cids[x.cid] = etat.seq[x.fil]; return { ok: true, deja: false, seq: etat.seq[x.fil], ts: Date.now() }; }) });
  if (q.url.startsWith('/api/pont/nouveaux')) { const e = etat.evenements; etat.evenements = []; return rep(200, { ok: true, curseur: etat.curseur, plein: false, evenements: e }); }
  if (q.url.startsWith('/api/pont/avatar')) return rep(200, { ok: true, deja: false });
  rep(404, { error: 'introuvable' });
}); });
const posts = () => etat.requetes.filter(x => x.url === '/api/pont/poster');
const messages = () => posts().flatMap(x => x.corps.messages);
const toutPauline = () => messages().filter(m => m.fil === 'pauline');
const dePauline = () => toutPauline().filter(m => m.texte.includes('📬'));
const uniques = () => { const vu = new Set(); return dePauline().filter(m => !vu.has(m.cid) && vu.add(m.cid)); };   // ce que Justin voit : OP MESSAGES ne pose pas deux fois un même `cid`
const installs = () => etat.requetes.filter(x => x.url === '/api/pont/installer');


let consoleTexte = ''; for (const k of ['log', 'error', 'warn']) { const o = console[k]; console[k] = (...a) => { const t = a.map(String).join(' '); if (!t.startsWith('  ✓') && !t.startsWith('  ✗')) consoleTexte += t + '\n'; o.apply(console, a); }; }
(async () => {
  console.log('\n── test-3225 · Justin lit et valide un mail de Pauline depuis OP MESSAGES ──');
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const URL = 'http://127.0.0.1:' + faux.address().port;
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const PONT = require(path.join(RACINE, 'server', 'pont-messages.js'));
  const PAU = require(path.join(RACINE, 'server', 'pauline.js'));
  const FICHIER = require(path.join(RACINE, 'server', 'agents-fichier.js'));
  const routes = { get: {}, post: {} };
  const app = { get: (p, ...h) => { routes.get[p] = h; }, post: (p, ...h) => { routes.post[p] = h; } };
  const modes = {}; for (const a of AG.AGENTS) modes[a.id] = 'brouillon';
  fs.writeFileSync(path.join(banc, 'agents-etat.json'), JSON.stringify({ pause: { actif: false }, modes }));
  require('./banc-horaires.js').toujoursOuvert(banc);
  const appC = { get: () => {}, post: () => {} };
  let horloge = Date.UTC(2026, 9, 28, 17, 30);
  let pont = null;
  const conv = CV(appC, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {}, agents: AG(appC, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {} }), pousseNotif: () => Promise.resolve(), maintenant: () => horloge,
    surMessage: async () => {}, surAjout: (m) => { if (pont) pont.surAjout(m); }, surRetrait: (x) => { if (pont) pont.surRetrait(x); } });
  const fichier = FICHIER(banc);
  const paulineMod = PAU(app, { DATA_DIR: banc, monPatronStrict: (q, s, n) => n && n(), config: { pauline: { jetonSha256: crypto.createHash('sha256').update(JETON).digest('hex') } }, sansMinuterie: true, maintenant: () => horloge,
    surReleve: (releve, dec) => { if (pont) pont.surPauline(releve, dec); } });
  const nouveau = (extra) => PONT(Object.assign({ iconesDir: path.join(RACINE, 'icons'), DATA_DIR: banc, conversations: conv, agents: AG, groupes: CV.GROUPES, fichier, url: URL, secret: SECRET, horloge: () => horloge, attenteMaxMs: 400, delaiMs: 600, pauline: { decider: paulineMod.decider } }, extra || {}));
  const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
  let nMail = 0;
  const mail = (id, o) => Object.assign({ id, entrepriseId: 'e-' + id, etat: 'en_attente', objet: 'Votre dératisation à Lyon', texte: 'Bonjour, voici ma proposition.', quand: new Date(horloge).toISOString(), statutBrut: 'pending_review', maj: 'm' + (++nMail) }, o || {});
  const ent = (id, o) => Object.assign({ id: 'e-' + id, nom: 'Dupont Nettoyage', ville: 'Lyon', metier: 'nettoyage', etat: 'courriel_pret', email: 'patron.secret@dupont-nettoyage.fr', contact: 'Jean Dupont-Contact', site: 'dupont-nettoyage.fr', majLe: new Date(horloge).toISOString() }, o || {});
  const releveDe = (courriels, entreprises) => ({ version: 1, genereLe: new Date(horloge).toISOString(), chauffe: { debut: '2026-10-01', jour: 28, plafondDuJour: 20 },
    jour: { date: '2026-10-28', envoyes: 7, envoyesFroid: 6, reponses: 2, refus: 1, enAttente: courriels.filter(c => c.etat === 'en_attente').length }, recherches: [], entreprises, courriels, reponses: [] });
  const envoyerReleve = (corps) => { const h = routes.post['/api/pauline/releve']; const r = res(); h[h.length - 1]({ body: corps }, r); return r; };
  const decisionRoute = (corps) => { const h = routes.post['/api/monitor/pauline/decision']; const r = res(); h[h.length - 1]({ body: corps }, r); return r; };
  const vider = async () => { await pont._envoyer(); await pont._attendreFini(); };
  const evenement = (seq, texte, extra) => Object.assign({ gid: 1000 + seq + 5000, type: 'message', fil: 'pauline', seq: seq + 5000, genre: 'texte', texte, ts: horloge }, extra || {});
  const lire = async (evs) => { etat.evenements = evs; await pont._lire(); await vider(); };

  const LIEN = 'https://teamop.fr/tour.html#gestion/messagerie-tour';
  const derniere = () => toutPauline().filter(m => !m.texte.startsWith('📊')).pop().texte;   // le bilan du jour (18 h 30 à Paris) part dans le même relevé : on le met à part
  const cidDe = (id) => 'pauline-' + crypto.createHash('sha256').update(id).digest('hex').slice(0, 32);
  const numDe = (id) => { const mm = dePauline().filter(x => x.cid === cidDe(id)); return mm.length ? /n°(\d+)/.exec(mm[0].texte)[1] : null; };
  const dec = () => paulineMod.lireDec().decisions;
  const appels = []; const vraiDecider = paulineMod.decider;
  const espion = () => ({ decider: (b) => { appels.push(JSON.parse(JSON.stringify(b))); return vraiDecider(b); } });
  const annoncer = async (cs, ents) => { envoyerReleve(releveDe(cs, ents || cs.map(c => ent(c.id)))); await vider(); };
  pont = nouveau({ pauline: espion() });
  await pont._installer(); await pont._attendreFini();
  await lire([]);   // le premier passage de lecture ne fait que poser le curseur

  console.log('\n1. L\'annonce porte le texte du mail');
  {
    const corps = 'Bonjour,\r\n\r\nJe vous écris au sujet de vos locaux.\u0007\r\n\r\n\r\n\r\nCordialement,\r\nPauline​\tHarvey';
    await annoncer([mail('t1', { texte: corps })]);
    const t = derniere();
    v('la première ligne est celle d\'avant (numéro, entreprise, objet)', t.split('\n')[0], '📬 Mail n°1 — Dupont Nettoyage : « Votre dératisation à Lyon » attend ton accord.');
    vrai('le texte du mail est là, retours à la ligne gardés (paragraphes), au plus une ligne vide de suite', t.includes('Bonjour,\n\nJe vous écris au sujet de vos locaux.\n\nCordialement,\nPauline Harvey') && !/\n\n\n/.test(t), t);
    vrai('aucun caractère de contrôle ni invisible', !/[\u0000-\u0009\u000b-\u001f\u007f-\u009f​-‏\r]/.test(t));
    vrai('les règles du bas : OUI n (ou OK n), NON n, et le lien de l\'ANCIENNE messagerie', t.includes('OUI 1 (ou OK 1)') && t.includes('NON 1') && t.endsWith('Pour le modifier : ' + LIEN));
    vrai('aucune adresse ni contact du prospect', !/@|patron\.secret|Dupont-Contact|dupont-nettoyage/.test(t));
    vrai('l\'annonce tient dans la limite d\'OP MESSAGES (8 000 signes)', Array.from(t).length < 8000);
    v('le fichier d\'état note la version lue (texte entier = 0)', JSON.parse(fs.readFileSync(path.join(banc, 'pont-messages.json'), 'utf8')).pauline.fiches, [['t1', 0, 'm1']]);
  }

  console.log('\n2. Un texte coupé ou vide : OUI refusé pour ce mail-là');
  {
    const long = Array.from({ length: 400 }, (_, i) => 'Ligne numéro ' + i + ' du courriel très long.').join('\n');
    const c2 = mail('t2', { texte: long });
    await annoncer([mail('t1'), c2]);
    const t = derniere();
    vrai('un corps de plus de 6 000 signes est coupé, avec « … (suite dans la Tour) »', t.includes('… (suite dans la Tour)') && Array.from(t).length < 8000 && !t.includes('Ligne numéro 399'));
    vrai('…et l\'annonce DIT que l\'acceptation d\'ici est refusée, avec le lien et NON n', t.includes('je ne l’accepte pas d’ici') && t.includes(LIEN) && t.includes('NON 2') && !t.includes('OUI 2'));
    const a = appels.length;
    await lire([evenement(10, 'OUI 2')]);
    vrai('⛔ « OUI 2 » sur le mail coupé : decider n\'est PAS appelé, aucune décision, phrase claire', appels.length === a && !dec().t2 && /Je n’accepte pas le mail n°2 d’ici : son texte était coupé ou vide/.test(derniere()) && derniere().includes(LIEN), derniere());
    await lire([evenement(11, 'OK 2')]);
    vrai('…« OK 2 » de même', appels.length === a && !dec().t2);
    await annoncer([mail('t1'), c2, mail('t3', { texte: ' \n​ ' })]);
    vrai('un corps vide : annoncé « (texte vide) », OUI refusé', derniere().includes('(texte vide)') && !derniere().includes('OUI 3'));
    await lire([evenement(12, 'OUI 3')]);
    vrai('…et « OUI 3 » ne décide rien', appels.length === a && !dec().t3);
    await lire([evenement(13, 'NON 2')]);
    v('« NON 2 » reste permis sur le mail coupé (refuser ne part nulle part)', [dec().t2 && dec().t2.action, /Mail n°2 refusé/.test(derniere())], ['refuser', true]);
  }

  console.log('\n3. OUI / OK accepte, par decider');
  {
    const c1 = mail('a1'), c2 = mail('a2');
    await annoncer([c1, c2]);
    const n1 = numDe('a1'), n2 = numDe('a2');
    const a = appels.length;
    await lire([evenement(20, ' oui ' + n1 + ' ')]);
    v('⛔ « oui <n> » : UN appel de decider {id, accepter, maj de la version lue}, décision à faire par le Mac', [appels.length - a, appels[a], dec().a1 && dec().a1.action, dec().a1 && dec().a1.etat, dec().a1 && dec().a1.maj], [1, { id: 'a1', action: 'accepter', maj: c1.maj }, 'accepter', 'a_faire', c1.maj]);
    vrai('…Pauline dit accepté et PAS parti', derniere() === 'Mail n°' + n1 + ' accepté. Il n’est pas encore parti : le Mac de Pauline l’enverra à sa prochaine relève.', derniere());
    await lire([evenement(21, 'OK ' + n2)]);
    v('⛔ « OK <n> » est un synonyme : accepté de même', [dec().a2 && dec().a2.action, dec().a2 && dec().a2.maj], ['accepter', c2.maj]);
    await lire([evenement(20, 'OUI ' + n1)]);
    v('⛔ le MÊME événement relu : n\'agit pas deux fois', appels.length - a, 2);
    const viaRoute = decisionRoute({ id: 'a1', action: 'accepter' });
    v('la route de la Tour répond pour le même geste ce que le pont a écrit (200, à faire)', [viaRoute.code, viaRoute.corps.etat], [200, 'a_faire']);
    vrai('le pont ne connaît QUE `decider` pour décider (aucune écriture de décision ailleurs)', !/rangerDec|pauline-decisions|decisions\[[^\]]*\]\s*=/.test(fs.readFileSync(path.join(RACINE, 'server', 'pont-messages.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')));
    await annoncer([mail('n1')]);
    const nn = numDe('n1');
    await lire([evenement(22, 'NON ' + nn)]);
    v('« NON <n> » refuse comme avant', [dec().n1 && dec().n1.action, derniere()], ['refuser', 'Mail n°' + nn + ' refusé. Il ne partira pas.']);
  }

  console.log('\n4. Les refus et les cas limites disent ce qui s\'est passé');
  {
    const a = appels.length;
    await lire([evenement(30, 'OUI 9999')]);
    vrai('numéro inconnu : decider non appelé, aucune décision, Pauline le dit', appels.length === a && /Je ne connais pas de mail n°9999/.test(derniere()));
    await lire([evenement(31, 'OUI 1 merci')]); await lire([evenement(32, 'oui, 1')]); await lire([evenement(33, 'OUI')]);
    vrai('« OUI 1 merci », « oui, 1 », « OUI » : rien n\'est décidé', appels.length === a);
    await annoncer([mail('d1')]); const nd = numDe('d1');
    decisionRoute({ id: 'd1', action: 'refuser' });
    const d = paulineMod.lireDec(); d.decisions.d1.etat = 'fait'; paulineMod.rangerDec(d);
    await lire([evenement(34, 'OUI ' + nd)]);
    vrai('409 « déjà traité sur le Mac » : la décision n\'est pas réécrite, Pauline rend le message du serveur, jamais « accepté »', dec().d1.action === 'refuser' && dec().d1.etat === 'fait' && /Mail n°\d+ : Ce mail a déjà été traité sur le Mac\./.test(derniere()) && !/Mail n°\d+ accepté\./.test(derniere()), derniere());
    const cp = mail('p1'); await annoncer([cp]); const np = numDe('p1');
    envoyerReleve(releveDe([Object.assign({}, cp, { etat: 'envoye' })], [ent('p1')])); await vider();
    await lire([evenement(35, 'OUI ' + np)]);
    vrai('409 « n\'attend plus ton accord » (parti depuis l\'annonce) : aucune décision, dit tel quel', !dec().p1 && /n’attend plus ton accord/.test(derniere()) && !/Mail n°\d+ accepté\./.test(derniere()), derniere());
    const cr = mail('w1'); await annoncer([cr]); const nw = numDe('w1');
    envoyerReleve(releveDe([Object.assign({}, cr, { texte: 'Texte RÉÉCRIT par Harvey', maj: 'autre-version' })], [ent('w1')])); await vider();
    await lire([evenement(36, 'OUI ' + nw)]);
    vrai('409 « réécrit depuis que tu l\'as lu » : l\'accord à l\'aveugle est refusé et le dit', !dec().w1 && /réécrit depuis que tu l’as lu/.test(derniere()) && !/Mail n°\d+ accepté\./.test(derniere()), derniere());
    await annoncer([mail('e1')]); const ne = numDe('e1');
    pont.arreter(); pont = nouveau({ pauline: { decider: () => ({ statut: 500, corps: {} }) } }); await pont._installer(); await pont._attendreFini();
    await lire([evenement(37, 'OUI ' + ne)]);
    vrai('500 : « Je n\'ai pas pu enregistrer l\'accord », jamais « accepté »', /Je n’ai pas pu enregistrer l’accord du mail n°/.test(derniere()) && !/accepté/.test(derniere()) && !dec().e1, derniere());
    pont.arreter(); pont = nouveau({ pauline: { decider: () => { throw new Error('boum'); } } }); await pont._installer(); await pont._attendreFini();
    await lire([evenement(38, 'OK ' + ne)]);
    vrai('decider qui JETTE : même phrase, le pont survit', /Je n’ai pas pu enregistrer l’accord/.test(derniere()));
    pont.arreter();
    const fp = path.join(banc, 'pont-messages.json');
    const st = JSON.parse(fs.readFileSync(fp, 'utf8')); st.pauline.fiches = []; fs.writeFileSync(fp, JSON.stringify(st));
    pont = nouveau({ pauline: espion() }); await pont._installer(); await pont._attendreFini();
    const a2 = appels.length;
    await lire([evenement(39, 'OUI ' + ne)]);
    vrai('⛔ une annonce d\'AVANT cette version (aucun texte montré) : OUI refusé, « je ne t\'en ai pas montré le texte »', appels.length === a2 && /je ne t’en ai pas montré le texte/.test(derniere()), derniere());
    await lire([evenement(40, 'bonjour Pauline')]);
    const aide = derniere();
    vrai('un texte libre : l\'aide dit OUI et NON et porte le lien de l\'ancienne messagerie', aide.includes('« OUI <numéro> »') && aide.includes('« NON <numéro> »') && aide.includes(LIEN), aide);
  }

  console.log('\n5. Rien du corps dans le journal ni dans l\'état du pont');
  {
    await annoncer([mail('j1', { texte: 'CORPS-INTERDIT-AU-JOURNAL-3225 bonjour' })]);
    await lire([evenement(50, 'OUI ' + numDe('j1'))]); await lire([evenement(51, 'OUI 99999')]);
    vrai('population : le corps a bien été annoncé et accepté', dePauline().some(x => x.texte.includes('CORPS-INTERDIT-AU-JOURNAL-3225')) && dec().j1 && dec().j1.action === 'accepter');
    await annoncer([mail('j1', { texte: 'CORPS-INTERDIT-AU-JOURNAL-3225 bonjour' }), mail('j2', { texte: 'REFUSE-PAR-LE-FAUX CORPS-INTERDIT-REFUSE-3225' })]);
    vrai('population : OP MESSAGES a refusé une annonce et le pont l\'a journalisée (le contrôle regarde quelque chose)', consoleTexte.includes('pont messages : message refusé : champ_invalide'), consoleTexte.slice(-300));
    vrai('⛔ aucune ligne de journal (console) ne porte le corps', !consoleTexte.includes('CORPS-INTERDIT') && !consoleTexte.includes('Je vous écris'));
    vrai('⛔ le fichier d\'état du pont ne porte pas le corps', !fs.readFileSync(path.join(banc, 'pont-messages.json'), 'utf8').includes('CORPS-INTERDIT'));
    vrai('le code du pont ne journalise jamais le corps (aucun journal( … c.texte)', !/journal\([^)]*(c\.texte|corps\b)/.test(fs.readFileSync(path.join(RACINE, 'server', 'pont-messages.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')));
  }

  console.log('\n6. Le lien ouvre l\'ancienne messagerie de la Tour');
  {
    const code = (f) => fs.readFileSync(path.join(RACINE, 'server', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('pont-messages.js : une seule adresse de la Tour, l\'ancienne messagerie', (code('pont-messages.js').match(/teamop\.fr\/tour\.html#[a-z\/-]+/g) || []).join() === 'teamop.fr/tour.html#gestion/messagerie-tour');
    vrai('pauline.js : la notification du téléphone mène à l\'ancienne messagerie aussi', code('pauline.js').includes("'/tour.html#gestion/messagerie-tour'") && !/tour\.html#gestion\/messagerie'/.test(code('pauline.js')));
    const TOUR = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
    const SC = [...TOUR.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]).join('\n');
    const fn = (nom) => { const m = new RegExp('\\nfunction ' + nom + '\\(').exec(SC); if (!m) return ''; let k = SC.indexOf('{', m.index), prof = 0, q = null; for (; k < SC.length; k++) { const c = SC[k]; if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; } if (c === "'" || c === '"') { q = c; continue; } if (c === '{') prof++; else if (c === '}' && --prof === 0) return SC.slice(m.index + 1, k + 1); } return ''; };
    const vm = require('vm');
    const monter = (hash) => { const ctx = { location: { hash }, APPS_TOUR: { gestion: 1, messages: 1 }, ANCIEN_MESSAGES: { entreprises: 'espaces' }, vueAlias: (t) => t, vues: () => ['accueil', 'messagerie', 'entreprises'] };
      vm.createContext(ctx); vm.runInContext(['lireHash', 'hashAncienne'].map(fn).join('\n'), ctx); return ctx; };
    vrai('population : les deux fonctions de la Tour sont trouvées', fn('lireHash').length > 100 && fn('hashAncienne').length > 40);
    for (const [h, tab, anc] of [['#gestion/messagerie-tour', 'messagerie', true], ['#messagerie-tour', 'messagerie', true], ['#gestion/messagerie', 'messagerie', false], ['#messagerie', 'messagerie', false], ['#gestion/entreprises', 'entreprises', false], ['#gestion/messagerie-tourxx', 'accueil', false]]) {
      const c = monter(h);
      v('lireHash/hashAncienne ' + h, [vm.runInContext('lireHash().tab', c), vm.runInContext('hashAncienne()', c)], [tab, anc]);
    }
    const E = fn('entrer');
    vrai('entrer() : le choix « ancienne » est posé AVANT setTab (le premier rendu montre déjà la bonne messagerie)', E.indexOf('hashAncienne()') > 0 && E.indexOf('hashAncienne()') < E.indexOf('setTab(t,true)'), E.indexOf('hashAncienne()'));
    const hc = /window\.addEventListener\('hashchange',function\(\)\{[\s\S]*?\n\}\);/.exec(SC);
    vrai('hashchange : à la navigation aussi, AVANT setTab', !!hc && hc[0].includes('hashAncienne()') && hc[0].indexOf('hashAncienne()') < hc[0].indexOf('setTab('));
    vrai('opmAncienne(true) lit l\'ancienne messagerie (messOuvrir) — la fonction que le bouton appelle déjà', /if\(oui\) messOuvrir\(\);/.test(fn('opmAncienne')));
    vrai('la version de la Tour a changé (v2.122 au moins), et les trois libellés disent la même', (() => { const m = /var TOUR_VERSION='v2\.(\d+)';/.exec(SC); const aff = [...TOUR.matchAll(/(?:console interne · |La Tour · |journalisées · )v2\.(\d+)/g)].map(x => +x[1]); return !!m && +m[1] >= 122 && aff.length >= 3 && aff.every(x => x === +m[1]); })());
    vrai('apercu/tour.html est régénéré (même hashAncienne, même version)', (() => { try { const A = fs.readFileSync(path.join(RACINE, 'apercu', 'tour.html'), 'utf8'); return A.includes('function hashAncienne()') && A.includes("var TOUR_VERSION='v2.122'"); } catch (e) { return false; } })());
  }

  console.log('\n7. Le pont nettoie lui-même un relevé brut (sans passer par pauline.js)');
  {
    const brut = mail('k1', { texte: 'Bonjour\u0007 ici\u202e\u200b\r\n\u0000suite\u0085 fin\r\n\r\n\r\n\r\nSignature' });
    const n = pont.surPauline(releveDe([brut], [ent('k1')]), { decisions: {}, vus: [] }); await vider();
    const t = derniere();
    vrai('population : l\'annonce du relevé brut est partie', n === 1 && t.includes('Signature'), t);
    vrai('⛔ aucun caractère de contrôle ni de sens de lecture ne reste, les retours à la ligne oui', !/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\r]/.test(t) && t.includes('Bonjour ici\nsuite fin\n\nSignature'), JSON.stringify(t));
  }

  pont.arreter();
  faux.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
