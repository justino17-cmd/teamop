/* ⛔ CE QUE CE FICHIER GARDE — PAULINE DANS OP MESSAGES (29 octobre 2026).

   Justin : « j'aimerais aussi Pauline sur OP MESSAGES ». Pauline n'est PAS un agent de la Tour (c'est Harvey, sur le Mac de Justin) : le pont lui prête sa voix pour ce que la Tour
   dit déjà au patron. Ce banc joue les VRAIS `pauline.js` (la vraie route du relevé, la vraie fonction de décision, le vrai fichier rangé), `pont-messages.js`, `conversations.js`
   et `agents.js`, contre un FAUX OP MESSAGES qui note ce qu'il reçoit (le vrai service : `test-3094` ; le pont de bout en bout : `test-3095`).
     1. SANS `pauline` fournie, le pont est celui d'avant : seize agents, aucune photo de Pauline, `surPauline` ne dit rien ;
     2. installée : un dix-septième robot « Pauline — Prospection » (sa directe porte l'identifiant « pauline ») et SA PHOTO, la vraie, celle du dépôt ;
     3. un courriel qui attend l'accord de Justin = UN message dans son fil, numéroté, avec le lien de la Tour — jamais deux (relevé suivant, redémarrage, fichier d'état perdu) ;
        ni un courriel déjà décidé, ni « approved », ni une décision illisible ; au plus huit annonces par relevé ;
     4. ⛔ ce qui d'un prospect entre dans le message : l'entreprise et l'objet, rien d'autre — ni adresse, ni lien, ni contact, ni texte du courriel ;
     5. le bilan du jour : après 18 h (Paris), une fois par jour, seulement si le relevé est d'aujourd'hui, des NOMBRES ;
     6. ⛔ les réponses : « NON <n> » EXACT refuse, par `decider` — LA fonction de la route de la Tour ; « OK <n> » n'accepte RIEN ; tout le reste, un numéro inconnu, un autre fil, une
        pièce jointe, une suppression : aucune décision ; une même réponse n'agit qu'une fois ;
     7. ⛔ le pont n'écrit nulle part ailleurs : aucun registre d'agents touché, aucune autre écriture de décision que `decider`. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3166-'));
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
  if (q.url === '/api/pont/poster') return rep(200, { ok: true, resultats: j.messages.map(x => { if (etat.cids[x.cid]) return { ok: true, deja: true, seq: etat.cids[x.cid] }; etat.seq[x.fil] = (etat.seq[x.fil] || 0) + 1; etat.cids[x.cid] = etat.seq[x.fil]; return { ok: true, deja: false, seq: etat.seq[x.fil], ts: Date.now() }; }) });
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

(async () => {
  console.log('\n── test-3166 · Pauline dans OP MESSAGES (pont-messages.js + pauline.js) ──');
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
  let horloge = Date.UTC(2026, 9, 28, 17, 30);           // 18 h 30 à Paris (heure d'hiver depuis le 25 octobre)
  let pont = null;
  const conv = CV(appC, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {}, agents: AG(appC, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {} }), pousseNotif: () => Promise.resolve(), maintenant: () => horloge,
    surMessage: async () => {}, surAjout: (m) => { if (pont) pont.surAjout(m); }, surRetrait: (x) => { if (pont) pont.surRetrait(x); } });
  const fichier = FICHIER(banc);
  const paulineMod = PAU(app, { DATA_DIR: banc, monPatronStrict: (q, s, n) => n && n(), config: { pauline: { jetonSha256: crypto.createHash('sha256').update(JETON).digest('hex') } }, sansMinuterie: true, maintenant: () => horloge,
    surReleve: (releve, dec) => { if (pont) pont.surPauline(releve, dec); } });
  const nouveau = (extra) => PONT(Object.assign({ iconesDir: path.join(RACINE, 'icons'), DATA_DIR: banc, conversations: conv, agents: AG, groupes: CV.GROUPES, fichier, url: URL, secret: SECRET, horloge: () => horloge, attenteMaxMs: 400, delaiMs: 600, pauline: { decider: paulineMod.decider } }, extra || {}));
  const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };

  /* le relevé arrive par la VRAIE route (son dernier gestionnaire : le jeton et le corps JSON sont vérifiés avant, ailleurs — `test-3020`) */
  let nMail = 0;
  const mail = (id, o) => Object.assign({ id, entrepriseId: 'e-' + id, etat: 'en_attente', objet: 'Votre dératisation à Lyon', texte: 'CORPS-SECRET-DU-COURRIEL bonjour', quand: new Date(horloge).toISOString(), statutBrut: 'pending_review', maj: 'm' + (++nMail) }, o || {});
  const ent = (id, o) => Object.assign({ id: 'e-' + id, nom: 'Dupont Nettoyage', ville: 'Lyon', metier: 'nettoyage', etat: 'courriel_pret', email: 'patron.secret@dupont-nettoyage.fr', contact: 'Jean Dupont-Contact', site: 'dupont-nettoyage.fr', majLe: new Date(horloge).toISOString() }, o || {});
  const releveDe = (courriels, entreprises, jour) => ({ version: 1, genereLe: new Date(horloge).toISOString(), chauffe: { debut: '2026-10-01', jour: 28, plafondDuJour: 20 },
    jour: Object.assign({ date: '2026-10-28', envoyes: 7, envoyesFroid: 6, reponses: 2, refus: 1, enAttente: courriels.filter(c => c.etat === 'en_attente').length }, jour || {}), recherches: [], entreprises, courriels, reponses: [] });
  const envoyerReleve = (corps) => { const h = routes.post['/api/pauline/releve']; const r = res(); h[h.length - 1]({ body: corps }, r); return r; };
  const decisionRoute = (corps) => { const h = routes.post['/api/monitor/pauline/decision']; const r = res(); h[h.length - 1]({ body: corps }, r); return r; };
  const vider = async () => { await pont._envoyer(); await pont._attendreFini(); };
  const evenement = (seq, texte, extra) => Object.assign({ gid: 1000 + seq, type: 'message', fil: 'pauline', seq, genre: 'texte', texte, ts: horloge }, extra || {});
  const lire = async (evs) => { etat.evenements = evs; await pont._lire(); await vider(); };

  console.log('\n1. Sans `pauline` fournie : le pont d\'avant');
  {
    const sans = nouveau({ pauline: undefined });
    await sans._installer(); await sans._attendreFini();
    const ins = installs()[0].corps;
    v('seize agents, aucun « pauline »', [ins.agents.length, ins.agents.some(a => a.id === 'pauline')], [16, false]);
    vrai('aucune photo de Pauline ne part', !etat.requetes.some(q => q.url.startsWith('/api/pont/avatar?cible=pauline')));
    v('`surPauline` ne dit rien (et ne jette pas)', sans.surPauline(releveDe([mail('c1')], [ent('c1')]), { decisions: {}, vus: [] }), 0);
    sans.arreter();
    etat.requetes.length = 0;
  }

  console.log('\n2. Installée : le robot « Pauline — Prospection » et sa photo');
  {
    pont = nouveau();
    await pont._installer(); await pont._attendreFini();
    const ins = installs()[0].corps;
    v('dix-sept agents, Pauline en dernier, son nom et son rôle', [ins.agents.length, ins.agents[16]], [17, { id: 'pauline', nom: 'Pauline', role: 'Prospection' }]);
    vrai('Pauline n\'est PAS dans le registre des agents de la Tour', !AG.AGENTS.some(a => a.id === 'pauline') && !conv.filValide('pauline'));
    const photo = etat.requetes.find(q => q.url === '/api/pont/avatar?cible=pauline');
    vrai('sa photo part, UNE fois : c\'est le vrai fichier du dépôt (même empreinte)', photo && crypto.createHash('sha256').update(photo.octets).digest('hex') === crypto.createHash('sha256').update(fs.readFileSync(path.join(RACINE, 'icons', 'agents', 'pauline.jpg'))).digest('hex') && etat.requetes.filter(q => q.url === '/api/pont/avatar?cible=pauline').length === 1);
    v('les groupes ne contiennent pas Pauline', installs()[0].corps.groupes.some(g => g.membres.includes('pauline')), false);
  }

  console.log('\n3. Un courriel qui attend l\'accord : UN message, jamais deux');
  {
    etat.requetes.length = 0;
    const c1 = mail('c1'), c2 = mail('c2', { statutBrut: 'approved' }), c3 = mail('c3'), c4 = mail('c4', { etat: 'envoye' });
    const corps = releveDe([c1, c2, c3, c4], [ent('c1'), ent('c2'), ent('c3', { nom: 'Martin & Fils' }), ent('c4')]);
    // c3 déjà décidé dans la Tour : pas d'annonce
    paulineMod.rangerDec({ decisions: { c3: { action: 'refuser', etat: 'a_faire', le: new Date(horloge).toISOString() } }, vus: ['c3'] });
    v('la route du relevé répond 200', envoyerReleve(corps).code, 200);
    await vider();
    const m = dePauline();
    v('(le bilan du 28, relevé d\'aujourd\'hui après 18 h, part aussi : un message de plus, à part)', toutPauline().length - dePauline().length, 1);
    v('exactement UN message : le courriel en attente (pas « approved », pas décidé, pas envoyé)', m.length, 1);
    v('…au nom de Pauline, dans SON fil, avec la notification de téléphone, jamais une importation', [m[0].de, m[0].fil, m[0].push, posts()[0].corps.import], ['pauline', 'pauline', true, false]);
    v('…numéroté 1, avec l\'entreprise, l\'objet et le lien de la Tour', [m[0].texte.includes('n°1'), m[0].texte.includes('Dupont Nettoyage'), m[0].texte.includes('« Votre dératisation à Lyon »'), m[0].texte.includes('https://teamop.fr/tour.html#gestion/messagerie'), m[0].texte.includes('NON 1')], [true, true, true, true, true]);
    vrai('…le `cid` se déduit du courriel (idempotent côté OP MESSAGES)', /^pauline-[0-9a-f]{32}$/.test(m[0].cid) && m[0].cid === 'pauline-' + crypto.createHash('sha256').update('c1').digest('hex').slice(0, 32));
    // le relevé suivant, identique : rien
    envoyerReleve(releveDe([c1, c2, c3, c4], [ent('c1'), ent('c2'), ent('c3'), ent('c4')])); await vider();
    v('⛔ le relevé suivant, identique : aucun message de plus', dePauline().length, 1);
    // un redémarrage du pont (même fichier d'état)
    pont.arreter(); pont = nouveau(); await pont._installer(); await pont._attendreFini();
    envoyerReleve(releveDe([c1, c2, c3, c4], [ent('c1'), ent('c2'), ent('c3'), ent('c4')])); await vider();
    v('⛔ après un redémarrage du Tour : toujours un seul message', dePauline().length, 1);
    // le fichier d'état perdu : le `cid` déterministe fait reconnaître le message, le faux service ne le recrée pas
    const avant = Object.keys(etat.cids).length;
    pont.arreter(); fs.unlinkSync(path.join(banc, 'pont-messages.json')); const fichier2 = FICHIER(banc);
    pont = nouveau({ fichier: fichier2 }); await pont._installer(); await pont._attendreFini();
    envoyerReleve(releveDe([c1], [ent('c1')])); await vider();
    v('⛔ état perdu : le message repart (même `cid`) mais OP MESSAGES le reconnaît — pas de doublon côté Justin', [Object.keys(etat.cids).filter(k => /^pauline-[0-9a-f]{32}$/.test(k)).length, Object.keys(etat.cids).length - avant], [1, 0]);
    // décision illisible : rien
    const n0 = dePauline().length;
    v('une liste de décisions illisible (null) : rien n\'est annoncé', pont.surPauline(releveDe([mail('c9')], [ent('c9')]), null), 0);
    // au plus huit par relevé
    const dix = Array.from({ length: 10 }, (_, i) => mail('d' + i));
    envoyerReleve(releveDe(dix, dix.map((c, i) => ent('d' + i)))); await vider();
    v('⛔ dix courriels neufs d\'un coup : huit annonces ce passage-ci', dePauline().length - n0, 8);
    envoyerReleve(releveDe(dix, dix.map((c, i) => ent('d' + i)))); await vider();
    v('…les deux autres au relevé suivant, aucun doublon', [uniques().length, dePauline().length - n0], [11, 10]);
    vrai('les numéros se suivent sans trou ni répétition (1 à 11)', uniques().map(x => /n°(\d+)/.exec(x.texte)[1]).join(',') === Array.from({ length: 11 }, (_, i) => i + 1).join(','));
  }

  console.log('\n4. ⛔ Ce qui d\'un prospect entre dans le message');
  {
    const n0 = dePauline().length;
    const piege = mail('p1', { objet: 'Voir www.piege-lien.fr ou contacter fuite.objet@exemple.fr   rapidement\nligne2', texte: 'TEXTE-INTERDIT-1234' });
    envoyerReleve(releveDe([piege], [ent('p1', { nom: 'Chez nom@fuite-nom.fr SARL ' + 'x'.repeat(200) })])); await vider();
    const t = dePauline()[n0].texte;
    const interdits = ['patron.secret@dupont-nettoyage.fr', 'Jean Dupont-Contact', 'dupont-nettoyage.fr', 'CORPS-SECRET', 'TEXTE-INTERDIT', 'fuite.objet', 'fuite-nom', 'piege-lien', '@', 'Lyon', '\n\n'];
    v('ni adresse, ni lien, ni contact, ni site, ni texte du courriel, ni ville', interdits.filter(x => t.includes(x) && !(x === 'Lyon' && false)), []);
    vrai('…le nom est coupé (60 signes au plus) et l\'objet tient sur une ligne', t.split('\n')[0].length < 260 && !t.split('\n')[0].includes('ligne2\n'));
    const tous = dePauline().map(x => x.texte).join('\n');
    vrai('aucun message de Pauline, tous confondus, ne porte une adresse ni un texte de courriel', !/@/.test(tous) && !tous.includes('CORPS-SECRET') && !tous.includes('Jean Dupont'));
    // le fichier d'état du pont ne garde ni nom ni adresse
    const brut = fs.readFileSync(path.join(banc, 'pont-messages.json'), 'utf8');
    vrai('le fichier d\'état du pont ne porte aucun nom ni adresse de prospect', !/Dupont|@|fuite|CORPS/.test(brut));
  }

  console.log('\n5. Le bilan du jour');
  {
    const n0 = toutPauline().length;
    horloge = Date.UTC(2026, 9, 29, 15, 0);   // 16 h Paris : trop tôt
    envoyerReleve(releveDe([], [], { date: '2026-10-29' })); await vider();
    v('avant 18 h (Paris), le relevé étant bien d\'aujourd\'hui : pas de bilan', toutPauline().length - n0, 0);
    horloge = Date.UTC(2026, 9, 29, 17, 30);
    envoyerReleve(releveDe([], [], { date: '2026-10-28' })); await vider();
    v('⛔ un relevé de la VEILLE (le Mac dormait) : pas de bilan', toutPauline().length - n0, 0);
    envoyerReleve(releveDe([], [], { date: '2026-10-29', envoyes: 7, reponses: 2, refus: 1, enAttente: 0 })); await vider();
    const b = toutPauline().slice(n0);
    v('après 18 h, le relevé du jour : UN bilan, des nombres', [b.length, b[0] && b[0].texte, b[0] && b[0].push === true, b[0] && b[0].cid], [1, '📊 Bilan du jour : 7 mail(s) envoyé(s), 2 réponse(s), 1 refus, 0 en attente de ton accord.', false, 'pauline-bilan-2026-10-29']);
    envoyerReleve(releveDe([], [], { date: '2026-10-29' })); await vider();
    v('⛔ le relevé suivant, le même jour : pas de second bilan', toutPauline().length - n0, 1);
    horloge += 86400000;
    envoyerReleve(releveDe([], [], { date: '2026-10-30' })); await vider();
    v('le lendemain : un nouveau bilan', toutPauline().length - n0, 2);
    horloge = Date.UTC(2026, 9, 29, 17, 30);
  }

  console.log('\n6. Les réponses de Justin');
  {
    // un courriel frais, annoncé, et son numéro
    const cf = mail('r1', { texte: 'TEXTE-REPONSE' });
    envoyerReleve(releveDe([cf], [ent('r1')])); await vider();
    const num = /n°(\d+)/.exec(dePauline().filter(x => x.texte.includes('📬')).pop().texte)[1];
    const decisions = () => paulineMod.lireDec().decisions;
    const sansDecision = () => !decisions().r1;
    const n0 = () => toutPauline().length;

    for (const [nom, texte] of [['« OK <n> » n\'accepte RIEN', 'OK ' + num], ['« ok <n> » non plus', 'ok ' + num], ['« NON <n> merci »', 'NON ' + num + ' merci'], ['« non, <n> »', 'non, ' + num], ['un numéro à zéro devant', 'NON 0' + num], ['« NON <n> <m> »', 'NON ' + num + ' 2'], ['« NON <n>\\nOK 1 »', 'NON ' + num + '\nOK 1'], ['du texte libre', 'refuse le dernier mail'], ['« NON » seul', 'NON']]) {
      const a = n0();
      await lire([evenement(100 + Math.floor(Math.random() * 1e6), texte)]);
      vrai('⛔ ' + nom + ' : aucune décision enregistrée', sansDecision());
      vrai('…Pauline répond une ligne qui renvoie à la Tour ou à la forme exacte', n0() - a <= 1);
    }
    // un numéro inconnu
    await lire([evenement(3000, 'NON 9999')]);
    vrai('« NON 9999 » (aucun mail n°9999) : aucune décision, et Pauline le dit', sansDecision() && toutPauline().pop().texte.includes('Je ne connais pas de mail n°9999'));
    // un autre fil, une pièce jointe, une suppression
    await lire([evenement(3001, 'NON ' + num, { fil: 'victor' })]);
    vrai('« NON <n> » écrit dans le fil d\'un AUTRE agent : ne touche pas Pauline', sansDecision());
    await lire([evenement(3002, null, { genre: 'autre' })]);
    await lire([{ gid: 5000, type: 'suppression', fil: 'pauline', seq: 1, pour: 'tous' }]);
    vrai('une pièce jointe, une suppression : rien', sansDecision());

    // « NON <n> » exact : refuse, par `decider`
    let appels = 0; const vrai_decider = paulineMod.decider;
    pont.arreter(); pont = nouveau({ pauline: { decider: (b) => { appels++; return vrai_decider(b); } } });
    await pont._installer(); await pont._attendreFini();
    const a = n0();
    await lire([evenement(3100, ' non ' + num + ' ')]);
    v('⛔ « non <n> » (casse, espaces) : UNE décision « refuser », en attente du Mac, par la fonction de la route', [appels, decisions().r1 && decisions().r1.action, decisions().r1 && decisions().r1.etat], [1, 'refuser', 'a_faire']);
    vrai('…Pauline confirme', n0() - a === 1 && toutPauline().pop().texte === 'Mail n°' + num + ' refusé. Il ne partira pas.');
    v('⛔ le MÊME événement relu (curseur perdu) : n\'agit pas une seconde fois', (await lire([evenement(3100, 'NON ' + num)]), appels), 1);
    // même chemin que la route de la Tour : même résultat pour le même geste
    const viaRoute = decisionRoute({ id: 'r1', action: 'refuser' });
    v('la route de la Tour et le pont écrivent la MÊME décision (même action, même état)', [viaRoute.code, viaRoute.corps.etat, decisions().r1.action], [200, 'a_faire', 'refuser']);
    vrai('…la route de la Tour appelle `decider` (aucune copie de la logique)', /decider\(req\.body\)/.test(fs.readFileSync(path.join(RACINE, 'server', 'pauline.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')));
    // un mail déjà traité par le Mac : le pont le dit, ne réécrit rien
    const d = paulineMod.lireDec(); d.decisions.r1.etat = 'fait'; paulineMod.rangerDec(d);
    const cf2 = mail('r2'); envoyerReleve(releveDe([cf, cf2], [ent('r1'), ent('r2')])); await vider();
    const num2 = /n°(\d+)/.exec(dePauline().filter(x => x.texte.includes('📬')).pop().texte)[1];
    // r2 refusé via le pont puis traité par le Mac, puis redemandé
    await lire([evenement(3200, 'NON ' + num2)]);
    const d2 = paulineMod.lireDec(); d2.decisions.r2.etat = 'fait'; paulineMod.rangerDec(d2);
    await lire([evenement(3201, 'NON ' + num2)]);
    vrai('⛔ un mail déjà traité sur le Mac : « NON <n> » ne réécrit rien et Pauline dit pourquoi', paulineMod.lireDec().decisions.r2.etat === 'fait' && /déjà|n’attend plus/.test(toutPauline().pop().texte));
    // un mail annoncé qui n'attend plus l'accord (parti entre-temps) : « NON <n> » ne décide pas dessus
    const cf4 = mail('r4'); envoyerReleve(releveDe([cf4], [ent('r4')])); await vider();
    const num4 = /n°(\d+)/.exec(dePauline().filter(x => x.texte.includes('📬')).pop().texte)[1];
    envoyerReleve(releveDe([Object.assign({}, cf4, { etat: 'envoye' })], [ent('r4')])); await vider();
    await lire([evenement(3250, 'NON ' + num4)]);
    vrai('⛔ un mail PARTI depuis son annonce : « NON <n> » ne crée aucune décision, et le dit', !paulineMod.lireDec().decisions.r4 && /n’attend plus ton accord/.test(toutPauline().pop().texte));
    const route4 = decisionRoute({ id: 'r4', action: 'refuser' });
    v('…et la route de la Tour répond la même chose (409)', [route4.code, /n’attend plus ton accord/.test(route4.corps.error)], [409, true]);
    // OK n : jamais d'accord
    const cf3 = mail('r3'); envoyerReleve(releveDe([cf3], [ent('r3')])); await vider();
    const num3 = /n°(\d+)/.exec(dePauline().filter(x => x.texte.includes('📬')).pop().texte)[1];
    const a3 = appels;
    await lire([evenement(3300, 'OK ' + num3)]);
    vrai('⛔ « OK <n> » : `decider` n\'est même pas appelé, rien n\'est accepté', appels === a3 && !paulineMod.lireDec().decisions.r3 && toutPauline().pop().texte.includes('il faut le lire d’abord'));
  }

  console.log('\n7. Le pont n\'écrit nulle part ailleurs');
  {
    const src = fs.readFileSync(path.join(RACINE, 'server', 'pont-messages.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('aucune écriture de décision dans le pont (`rangerDec`, `pauline-decisions`, `etat.decisions[`)', !/rangerDec|pauline-decisions|decisions\[[^\]]*\]\s*=/.test(src));
    vrai('le pont n\'envoie aucun courriel et ne parle pas à Stripe ni à un prospect', !/nodemailer|srvMail|smtp|api\.stripe/i.test(src));
    vrai('le registre des agents n\'a reçu AUCUN message de Pauline ni de ses réponses', !conv.tous().some(m => m.fil === 'pauline' || m.de === 'pauline'));
    vrai('`/health` reste des nombres', JSON.stringify(Object.keys(pont.sante()).sort()) === JSON.stringify(['echecMin', 'file']));
    const idx = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('index.js : le pont reçoit `decider` de pauline.js et pauline.js prévient le pont (surReleve) — rien d\'autre', /pauline: paulineMod && typeof paulineMod\.decider === 'function' \? \{ decider: paulineMod\.decider \} : undefined/.test(idx) && /surReleve: \(releve, dec\) => \{ if \(pontMessages\) pontMessages\.surPauline\(releve, dec\); \}/.test(idx));
  }

  pont.arreter();
  faux.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
