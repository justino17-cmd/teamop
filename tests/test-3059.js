/* ⛔ CE QUE CE FICHIER GARDE — LA VISIO, LA GRÂCE ET LA DURÉE DE CONSERVATION DE L'INVITÉ SANS COMPTE (relecture du `gardien`, 26 octobre 2026).

     1. PAS DE PARTAGE D'ÉCRAN EN VISIO : le jeton que LiveKit reçoit pour un invité sans compte ne signe que la caméra et le micro (le micro seul en audio) — jamais `screen_share`. Un compte ordinaire, lui, l'a
        (population : la même salle, le jeton de son organisateur) ;
     2. LA GRÂCE : l'organisateur dont l'appareil se tait (`perdu`) alors qu'il ne reste que des invités sans compte NE finit PAS la salle tout de suite — elle attend `invitesGraceMs`, puis finit (motif `seuls`, le lien meurt) ;
        s'il REVIENT pendant la grâce, la salle continue ;
     3. LA DURÉE DE CONSERVATION : trente jours après la fin de la salle, la ligne de l'invité (nom, entreprise, empreinte de réseau) et sa ligne de salle sont effacées — pas avant, et jamais celles d'une salle qui vit ;
        l'historique des appels, lui, reste (180 jours).
   ⛔ Une absence se prouve sur une population : chaque « pas de screen_share » est précédé du jeton d'un compte qui, lui, l'a. */
'use strict';
const path = require('path'), http = require('http'), crypto = require('crypto');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (170 s)'); process.exit(1); }, 170000).unref();

/* le FAUX LiveKit côté service : sa sonde répond « OK », ses commandes sont acceptées */
function fauxLiveKit(port) {
  const f = { commandes: [] };
  f.serveur = http.createServer((q, r) => {
    q.on('data', () => {}); q.on('end', () => {
      if (q.method === 'GET' && q.url === '/') { r.writeHead(200); return r.end('OK'); }
      const x = /^\/twirp\/livekit\.RoomService\/(\w+)$/.exec(q.url);
      if (!x) { r.writeHead(404); return r.end(); }
      f.commandes.push(x[1]); r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{}');
    });
  });
  return new Promise(ok => f.serveur.listen(port, '127.0.0.1', () => ok(f)));
}
const charge = (jwt) => JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8'));
const JOUR = 86400000;

(async () => {
  /* ═══ 1. LA VISIO ═══ */
  console.log('1. en visio, le jeton de l\'invité ne signe pas le partage d\'écran');
  const portLk = await T.portLibre(), LK = await fauxLiveKit(portLk);
  const BV = await O.monter({ service: { config: { appels: { balayageMs: 1000, perduMs: 600000,
    visio: { url: 'ws://127.0.0.1:' + portLk, interne: 'http://127.0.0.1:' + portLk, cle: 'APIbanc3059', secret: crypto.randomBytes(36).toString('base64url'), sondeMs: 100, delaiMs: 1000 } } } } });
  try {
    const sante = await T.attendre(async () => { const j = await (await fetch(BV.svc.base + '/health')).json(); return j.visio && j.visio.ok; }, 10000, 100);
    vrai('population : le service voit son serveur de visio (le faux répond « OK »)', !!sante);
    for (const type of ['video', 'audio']) {
      const ana = BV.pers('Ana' + type), a = BV.cl(ana), rid = await BV.programmer(a), j = await BV.lien(a, rid), sid = await BV.entrerSalle(a, rid, type);
      const p = await BV.invite(j, 'Paul', 'Durand');
      await a.post('/api/salles/' + sid + '/admettre', { uid: p.id });
      const etat = await p.c.get('/api/invite/etat');
      vrai('population : la salle ' + type + ' passe par la visio et Paul y est présent', etat.j.appel.visio === true && etat.j.appel.moi.statut === 'present');
      const hote = await a.post('/api/salles/' + sid + '/visio', {});
      const jh = hote.code === 200 ? charge(hote.j.jeton) : null;
      const sourcesHote = jh && jh.video.canPublishSources;
      v('(contre-épreuve) le jeton de l\'ORGANISATEUR signe : ' + (type === 'video' ? 'caméra, micro, écran' : 'le micro seul (une salle audio)'), type === 'video' ? [hote.code, sourcesHote.includes('screen_share')] : [hote.code, sourcesHote], type === 'video' ? [200, true] : [200, ['microphone']]);
      const inv = await p.c.post('/api/invite/visio', {});
      const ji = inv.code === 200 ? charge(inv.j.jeton) : null;
      v('⛔ le jeton de l\'INVITÉ ne signe que ' + (type === 'video' ? 'la caméra et le micro' : 'le micro') + ' — jamais `screen_share` ni `screen_share_audio`', [inv.code, ji && ji.video.canPublishSources], type === 'video' ? [200, ['camera', 'microphone']] : [200, ['microphone']]);
      v('… il ne publie pas de données non plus, et ne se renomme pas chez les autres', [ji && ji.video.canPublishData, ji && ji.video.canUpdateOwnMetadata], [false, false]);
    }
  } finally { await BV.arreter(); await new Promise(r => LK.serveur.close(r)); }

  /* ═══ 2. LA GRÂCE ═══ */
  console.log('2. la grâce : l\'hôte perdu ne finit pas la salle tout de suite');
  const GRACE = 3000;
  const BG = await O.monter({ service: { config: { appels: { balayageMs: 100, perduMs: 1000, invitesGraceMs: GRACE } } } });
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(BG.svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const minuteries = [];
  try {
    const scenario = async (nom, revient) => {
      const ana = BG.pers('Ana' + nom), a = BG.cl(ana), rid = await BG.programmer(a), j = await BG.lien(a, rid), sid = await BG.entrerSalle(a, rid, 'audio');
      const p = await BG.invite(j, 'Paul', 'Durand');
      await a.post('/api/salles/' + sid + '/admettre', { uid: p.id });
      /* Paul est vivant (sa page envoie son pouls) ; l'hôte, lui, ne dit plus rien */
      minuteries.push(setInterval(() => { p.c.post('/api/invite/signal', { type: 'pouls' }).catch(() => {}); }, 250));
      vrai('population : Paul est présent, l\'hôte aussi (' + nom + ')', un('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = \'present\'', sid).n === 2);
      const perdu = await T.attendre(() => un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid, ana.id).statut === 'parti', 8000, 50);
      const t0 = Date.now();
      vrai('population : l\'hôte est PERDU (sa ligne dit « parti ») et Paul est resté présent', perdu && un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid, p.id).statut === 'present');
      return { a, ana, rid, j, sid, p, t0 };
    };
    /* A. il ne revient pas */
    const A = await scenario('A', false);
    await T.dort(1200);
    v('⛔ 1,2 s après la perte, la salle VIT encore (la grâce est de ' + GRACE + ' ms) et Paul y est toujours', [un('SELECT etat FROM appel WHERE id = ?', A.sid).etat, (await A.p.c.get('/api/invite/etat')).code], ['en_cours', 200]);
    const finie = await T.attendre(() => un('SELECT etat FROM appel WHERE id = ?', A.sid).etat !== 'en_cours', 12000, 50);
    const dt = Date.now() - A.t0;
    vrai('⛔ passé la grâce, la salle FINIT (' + dt + ' ms après la perte : pas avant 2 s, pas après 9 s)', finie && dt >= 2000 && dt <= 9000);
    v('… motif `seuls`, la session de Paul est coupée (401) et le lien est mort (410 `reunion_terminee`)', [un('SELECT motif FROM appel WHERE id = ?', A.sid).motif, (await A.p.c.get('/api/invite/etat')).code, (await T.client(BG.svc.base).post('/api/invite/apercu', { jeton: A.j })).j.error], ['seuls', 401, 'reunion_terminee']);
    /* B. il revient pendant la grâce */
    const Bs = await scenario('B', true);
    await T.dort(900);
    const r = await Bs.a.post('/api/reunions/' + Bs.rid + '/rejoindre', { type: 'audio' });
    minuteries.push(setInterval(() => { Bs.a.post('/api/appels/' + Bs.sid + '/signal', { type: 'pouls' }).catch(() => {}); }, 250));
    v('l\'organisateur REVIENT pendant la grâce (200) et reprend la salle', [r.code, un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', Bs.sid, Bs.ana.id).statut], [200, 'present']);
    await T.dort(GRACE + 1500);
    v('⛔ la grâce écoulée, la salle VIT toujours : l\'hôte était revenu', [un('SELECT etat FROM appel WHERE id = ?', Bs.sid).etat, (await Bs.p.c.get('/api/invite/etat')).code], ['en_cours', 200]);
  } finally { for (const m of minuteries) clearInterval(m); await BG.arreter(); }

  /* ═══ 3. LA DURÉE DE CONSERVATION ═══ */
  console.log('3. trente jours après la fin de la salle, le nom s\'efface');
  const BP = await O.monter();
  const brutP = () => new (require('node:sqlite').DatabaseSync)(path.join(BP.svc.data, 'msg.db'));
  const unP = (sql, ...a) => { const d = brutP(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  try {
    const ana = BP.pers('AnaP'), a = BP.cl(ana), rid = await BP.programmer(a), j = await BP.lien(a, rid), sid = await BP.entrerSalle(a, rid, 'audio');
    const p = await BP.invite(j, 'Paul', 'Plomberie Durand');
    await a.post('/api/salles/' + sid + '/admettre', { uid: p.id });
    const ana2 = BP.pers('AnaV'), a2 = BP.cl(ana2), rid2 = await BP.programmer(a2), j2 = await BP.lien(a2, rid2), sid2 = await BP.entrerSalle(a2, rid2, 'audio');
    const v2 = await BP.invite(j2, 'Vivant', 'Atelier');
    const term = await a.post('/api/salles/' + sid + '/terminer', {});
    v('population : la salle de Paul est terminée (200), une autre salle vit avec son invité', [term.code, unP('SELECT etat FROM appel WHERE id = ?', sid2).etat], [200, 'en_cours']);
    const lignes = () => [unP('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE appel = ?', sid).n, unP('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND uid = ?', sid, p.id).n];
    v('population : juste après la fin, sa ligne d\'invité et sa ligne de salle existent', lignes(), [1, 1]);
    BP.svc.avancer(29 * JOUR);
    await T.dort(2500);
    v('⛔ vingt-neuf jours plus tard, elles existent encore (la conservation est de TRENTE)', lignes(), [1, 1]);
    BP.svc.avancer(2 * JOUR);
    const parti = await T.attendre(() => lignes()[0] === 0, 12000, 100);
    v('⛔ trente et un jours plus tard : le nom, l\'entreprise et la ligne de salle de Paul sont EFFACÉS', [parti, lignes()], [true, [0, 0]]);
    vrai('… mais l\'historique reste (l\'appel est conservé cent quatre-vingts jours) et l\'organisatrice y est toujours', unP('SELECT COUNT(*) AS n FROM appel WHERE id = ?', sid).n === 1 && unP('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND uid = ?', sid, ana.id).n === 1);
    vrai('⛔ l\'invité de l\'AUTRE salle, finie il y a deux jours seulement quand le balayeur l\'a close, garde sa ligne (la conservation court depuis la fin de SA salle)', unP('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE appel = ?', sid2).n === 1);
  } finally { await BP.arreter(); }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });
