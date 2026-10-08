/* ⛔ CE QUE CE FICHIER GARDE — LE MODULE DU SERVEUR DE VISIO (`server-msg/visio.js`) ET SA CONFIGURATION (`appels.visio`, `server-msg/config.js`). Le module SEUL : un faux
   LiveKit (un `fetch` qui note chaque commande), une horloge qu'on avance, aucun réseau. La couture avec le VRAI LiveKit est dans `test-953` ; avec les salles, `test-954`.

   Les contrôles marqués ⛔ gardent ce dont la perte ne se verrait PAS :
     · un jeton d'entrée ne vaut que pour UNE salle et UNE identité, et une salle AUDIO ne laisse publier que le micro (une caméra y passerait sinon, et la maille ne la permet pas) ;
     · un jeton se vérifie AVANT de croire sa charge : signature, algorithme (HS256 et rien d'autre), émetteur, échéance — un avis contrefait ne doit rien déclencher ;
     · l'empreinte du corps d'un avis se compare au corps EXACT : un octet changé, et l'avis est refusé ;
     · une ENTRÉE qui n'est pas admise (personne retirée qui rejoue son jeton) est retirée aussitôt, et une entrée admise ne l'est JAMAIS ;
     · le secret ne sort NULLE PART : ni dans la configuration sérialisée, ni dans `sante()`, ni dans un message d'erreur ;
     · deux sondes ratées de suite mettent la visio hors service (une salle neuve s'ouvre alors en maille), une sonde réussie la remet en service — une seule ratée ne suffit pas. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const V = require(path.join(T.SERVICE, 'visio.js'));
const C = require(path.join(T.SERVICE, 'config.js'));

const SECRET = 'sEcReT-de-banc-' + 'x'.repeat(30), CLE = 'APIbancVisio';
const CONF = (extra) => C.appelsConfig({ appels: { visio: Object.assign({ url: 'ws://127.0.0.1:7880', interne: 'http://127.0.0.1:7880', cle: CLE, secret: SECRET }, extra || {}) } }, 'beta').visio;
const decoder = (j) => { const p = j.split('.'); return { tete: JSON.parse(Buffer.from(p[0], 'base64url')), charge: JSON.parse(Buffer.from(p[1], 'base64url')) }; };
const hmac = (j, s) => { const p = j.split('.'); return crypto.createHmac('sha256', s).update(p[0] + '.' + p[1]).digest('base64url') === p[2]; };

/* Un faux LiveKit : il note chaque appel (méthode, corps, jeton présenté) et répond ce qu'on lui dit. */
function fauxLiveKit() {
  const f = { appels: [], reponses: {}, sondeOk: true, panne: false };
  f.fetch = async (url, init) => {
    if (f.panne) throw new Error('ECONNREFUSED');
    const u = new URL(url);
    if (u.pathname === '/') return { ok: f.sondeOk, status: f.sondeOk ? 200 : 503, text: async () => (f.sondeOk ? 'OK' : 'non') };
    const m = /^\/twirp\/livekit\.RoomService\/(\w+)$/.exec(u.pathname);
    const auth = (init.headers || {}).Authorization || '';
    f.appels.push({ methode: m && m[1], corps: JSON.parse(init.body), auth });
    const st = f.reponses[m && m[1]] || 200;
    return { ok: st >= 200 && st < 300, status: st, json: async () => ({}) };
  };
  return f;
}

console.log('La configuration : sans bloc, pas de visio ; avec, des bornes, et un secret qui ne se montre pas');
{
  v('sans `appels.visio` : null (les salles restent en maille)', C.appelsConfig({}, 'beta').visio, null);
  const c = CONF();
  v('valeurs de départ : 12 en vidéo, 25 en audio, jeton d\'entrée de 2 min', [c.maxVideo, c.maxAudio, c.ttlS, c.sondeMs, c.delaiMs], [12, 25, 120, 10000, 3000]);
  vrai('⛔ le secret se LIT (c\'est lui qui signe)…', c.secret === SECRET);
  vrai('⛔ … mais ne se SÉRIALISE pas (JSON, clés, copie)', !JSON.stringify(c).includes(SECRET) && !Object.keys(c).includes('secret') && Object.assign({}, c).secret === undefined);
  const refus = (nom, extra, inst) => { try { C.appelsConfig({ appels: { visio: Object.assign({ url: 'ws://127.0.0.1:7880', interne: 'http://127.0.0.1:7880', cle: CLE, secret: SECRET }, extra) } }, inst || 'beta'); return nom + ' : ACCEPTÉ'; } catch (e) { return e.message.includes(SECRET) ? nom + ' : LE SECRET EST DANS LE MESSAGE' : 'refus'; } };
  v('⛔ refusés au démarrage : ws:// en production, ws:// vers une autre machine, http:// interne distant, clé ou secret mal formés, plafonds hors bornes ou sous la maille', [
    refus('ws en prod', {}, 'prod'), refus('ws distant', { url: 'ws://10.1.2.3:7880' }), refus('http interne distant', { interne: 'http://10.1.2.3:7880' }),
    refus('clé courte', { cle: 'abc' }), refus('secret court', { secret: 'court' }), refus('secret avec espace', { secret: 'a b'.repeat(20) }),
    refus('maxVideo 26', { maxVideo: 26 }), refus('maxVideo sous la maille', { maxVideo: 3 }), refus('maxAudio sous la maille', { maxAudio: 5 }), refus('ttl 10 s', { ttlS: 10 }),
    refus('chemin dans l\'url', { url: 'wss://msg.teamop.fr/autre' }), refus('url pas une chaîne', { url: 42 })
  ], Array(12).fill('refus'));
  v('acceptés : wss:// en production, https:// interne distant (une machine à part, le jour venu)', [
    C.appelsConfig({ appels: { visio: { url: 'wss://msg.teamop.fr', interne: 'https://sfu.interne.teamop.fr', cle: CLE, secret: SECRET } } }, 'prod').visio.url,
    C.appelsConfig({ appels: { visio: { url: 'wss://msg.teamop.fr/', interne: 'https://10.0.0.2:7880/', cle: CLE, secret: SECRET } } }, 'prod').visio.interne
  ], ['wss://msg.teamop.fr', 'https://10.0.0.2:7880']);
}

console.log('\nLe jeton d\'entrée : une salle, une identité, ce qu\'elle peut publier');
{
  const now = 1791470000000;
  const vi = V.creerVisio({ visio: CONF(), horloge: () => now });
  const j = vi.jetonEntree({ salle: 'S-abc', identite: 'u42', nom: 'Camille', audioSeul: false, maxParticipants: 12 });
  const { tete, charge } = decoder(j);
  v('en-tête HS256, signé par le secret de la configuration', [tete.alg, hmac(j, SECRET), hmac(j, 'autre')], ['HS256', true, false]);
  v('émetteur = la clé d\'API, sujet = l\'identité, nom affiché', [charge.iss, charge.sub, charge.name], [CLE, 'u42', 'Camille']);
  v('vie : 2 min (ttlS), commence 10 s avant (horloges décalées)', [charge.exp - Math.floor(now / 1000), Math.floor(now / 1000) - charge.nbf], [120, 10]);
  v('⛔ UNE salle, entrer, recevoir, publier — mais pas de données (les gestes passent par le service) ni de renommage', charge.video,
    { roomJoin: true, room: 'S-abc', canSubscribe: true, canPublish: true, canPublishData: false, canUpdateOwnMetadata: false, canPublishSources: ['camera', 'microphone', 'screen_share', 'screen_share_audio'] });
  v('la salle créée par LiveKit porte NOTRE plafond', charge.roomConfig, { maxParticipants: 12, emptyTimeout: 60, departureTimeout: 20 });
  const a = decoder(vi.jetonEntree({ salle: 'S-audio', identite: 'u1', nom: 'X', audioSeul: true })).charge;
  v('⛔ salle AUDIO : le micro seulement (ni caméra, ni écran)', a.video.canPublishSources, ['microphone']);
  v('sans plafond donné, pas de roomConfig', a.roomConfig, undefined);
  v('un nom trop long est coupé à 80 signes', decoder(vi.jetonEntree({ salle: 'S', identite: 'u', nom: 'é'.repeat(200) })).charge.name.length, 80);
  let jete = 0; for (const x of [{ salle: '', identite: 'u' }, { salle: 'S', identite: '' }, { salle: 3, identite: 'u' }]) { try { vi.jetonEntree(x); } catch (e) { jete++; } }
  v('salle ou identité manquante : refus (jamais un jeton « pour toutes les salles »)', jete, 3);
  let sansConf = false; try { V.creerVisio({ visio: null }).jetonEntree({ salle: 'S', identite: 'u' }); } catch (e) { sansConf = true; }
  vrai('sans configuration, aucun jeton', sansConf);
}

console.log('\nVérifier un jeton : signature, algorithme, émetteur, échéance — avant de croire un mot de la charge');
{
  const now = 1791470000000, t = Math.floor(now / 1000);
  const bon = V.signer({ iss: CLE, exp: t + 60, sha256: 'x' }, SECRET);
  vrai('un jeton bien signé et à jour est lu', V.verifierJwt(bon, CLE, SECRET, now) !== null);
  const p = bon.split('.');
  const autreCharge = Buffer.from(JSON.stringify({ iss: CLE, exp: t + 60, sha256: 'y' })).toString('base64url');
  const nonSigne = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + p[1] + '.';
  const rs = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url') + '.' + p[1] + '.' + p[2];
  v('⛔ refusés : charge changée, `alg: none`, `RS256`, mauvais secret, autre émetteur, échu (au-delà de la minute de jeu), pas encore valable, sans échéance, débris', [
    V.verifierJwt(p[0] + '.' + autreCharge + '.' + p[2], CLE, SECRET, now), V.verifierJwt(nonSigne, CLE, SECRET, now), V.verifierJwt(rs, CLE, SECRET, now),
    V.verifierJwt(V.signer({ iss: CLE, exp: t + 60 }, 'mauvais-secret-de-trente-deux-signes-xx'), CLE, SECRET, now),
    V.verifierJwt(V.signer({ iss: 'APIautre', exp: t + 60 }, SECRET), CLE, SECRET, now),
    V.verifierJwt(V.signer({ iss: CLE, exp: t - 61 }, SECRET), CLE, SECRET, now),
    V.verifierJwt(V.signer({ iss: CLE, exp: t + 600, nbf: t + 61 }, SECRET), CLE, SECRET, now),
    V.verifierJwt(V.signer({ iss: CLE }, SECRET), CLE, SECRET, now),
    V.verifierJwt('a.b', CLE, SECRET, now), V.verifierJwt('', CLE, SECRET, now), V.verifierJwt(null, CLE, SECRET, now), V.verifierJwt('x'.repeat(9000), CLE, SECRET, now)
  ], Array(12).fill(null));
  vrai('dans la minute de jeu (échu depuis 59 s) : encore lu, comme chez LiveKit', V.verifierJwt(V.signer({ iss: CLE, exp: t - 59 }, SECRET), CLE, SECRET, now) !== null);
}

console.log('\nLes commandes : retirer, fermer — un jeton d\'administration borné, un 404 qui veut dire « déjà fait »');
(async () => {
  {
    const now = 1791470000000;
    const lk = fauxLiveKit();
    const lignes = [];
    const vi = V.creerVisio({ visio: CONF(), horloge: () => now, appeler: lk.fetch, journal: (l) => lignes.push(l) });
    const r1 = await vi.retirer('S-abc', 'u42');
    const a1 = lk.appels[0];
    v('RemoveParticipant, corps { room, identity }', [a1.methode, a1.corps], ['RemoveParticipant', { room: 'S-abc', identity: 'u42' }]);
    const d1 = decoder(a1.auth.replace(/^Bearer /, ''));
    v('⛔ jeton d\'administration de CETTE salle seulement, une minute', [d1.charge.video, d1.charge.exp - Math.floor(now / 1000), hmac(a1.auth.replace(/^Bearer /, ''), SECRET)], [{ roomAdmin: true, room: 'S-abc' }, 60, true]);
    const r2 = await vi.fermer('S-abc');
    v('DeleteRoom, droit de création (et rien d\'autre)', [lk.appels[1].methode, lk.appels[1].corps, decoder(lk.appels[1].auth.replace(/^Bearer /, '')).charge.video], ['DeleteRoom', { room: 'S-abc' }, { roomCreate: true }]);
    lk.reponses.RemoveParticipant = 404;
    const r3 = await vi.retirer('S-abc', 'parti');
    lk.reponses.DeleteRoom = 500;
    const r4 = await vi.fermer('S-x');
    lk.panne = true;
    const r5 = await vi.retirer('S-abc', 'u1');
    v('réussite, 404 (« déjà parti ») = réussite, 500 = échec, réseau coupé = échec', [r1.ok, r2.ok, r3.ok, r4.ok, r5.ok], [true, true, true, false, false]);
    v('deux échecs comptés dans la santé', vi.sante().commandesEchouees, 2);
    vrai('⛔ le journal ne dit ni la salle, ni la personne, ni un jeton', !lignes.some(l => /S-abc|S-x|u1|u42|Bearer|ey[A-Za-z0-9_-]{10}/.test(l)) && lignes.length === 2);
  }

  console.log('\nLa sonde : deux ratées de suite mettent hors service, une réussite remet en service');
  {
    let now = 1791470000000;
    const lk = fauxLiveKit();
    const vi = V.creerVisio({ visio: CONF(), horloge: () => now, appeler: lk.fetch });
    v('avant toute sonde : pas en service (une salle neuve n\'y part pas sur une promesse)', vi.actif(), false);
    await vi.sonder();
    v('« OK » : en service', vi.actif(), true);
    lk.sondeOk = false; await vi.sonder();
    v('⛔ UNE ratée : toujours en service (un hoquet ne bascule pas les salles neuves)', vi.actif(), true);
    await vi.sonder();
    v('deux ratées de suite : hors service', vi.actif(), false);
    lk.sondeOk = true; now += 5000; await vi.sonder();
    v('une réussite : de retour, âge 0', [vi.actif(), vi.sante().ageS], [true, 0]);
    lk.panne = true; await vi.sonder(); await vi.sonder();
    v('réseau coupé : hors service aussi', vi.actif(), false);
    const s = JSON.stringify(vi.sante());
    vrai('⛔ santé : des compteurs, ni secret, ni clé, ni adresse', !s.includes(SECRET) && !s.includes(CLE) && !s.includes('127.0.0.1') && /"configuree":true/.test(s));
    v('sans configuration : { configuree: false } et jamais actif', [V.creerVisio({ visio: null }).sante(), V.creerVisio({ visio: null }).actif()], [{ configuree: false }, false]);
    const p1 = vi.sonder(), p2 = vi.sonder();
    vrai('une seule sonde à la fois (deux appels pendant qu\'une court : la même promesse)', p1 === p2);
    await p1;
  }

  console.log('\nLes avis de LiveKit : l\'empreinte du corps exact, puis la porte');
  {
    const now = 1791470000000, t = Math.floor(now / 1000);
    const lk = fauxLiveKit();
    const vi = V.creerVisio({ visio: CONF(), horloge: () => now, appeler: lk.fetch });
    const corps = Buffer.from(JSON.stringify({ event: 'participant_joined', room: { name: 'S-abc' }, participant: { identity: 'u42' }, id: 'EV_1', createdAt: String(t) }));
    const sha = crypto.createHash('sha256').update(corps).digest('base64');
    const jeton = V.signer({ iss: CLE, exp: t + 300, sha256: sha }, SECRET);
    const lu = vi.avisLire(jeton, corps);
    v('un avis signé, à l\'empreinte juste : lu', lu && [lu.event, lu.room.name, lu.participant.identity], ['participant_joined', 'S-abc', 'u42']);
    vrai('« Bearer » devant le jeton : toléré', vi.avisLire('Bearer ' + jeton, corps) !== null);
    const change = Buffer.from(corps); change[change.length - 3] ^= 1;
    v('⛔ refusés : un octet du corps changé, mauvaise empreinte, mauvais secret, sans empreinte, corps qui n\'est pas un tampon, sans jeton', [
      vi.avisLire(jeton, change), vi.avisLire(V.signer({ iss: CLE, exp: t + 300, sha256: 'AAAA' }, SECRET), corps),
      vi.avisLire(V.signer({ iss: CLE, exp: t + 300, sha256: sha }, 'mauvais-secret-de-trente-deux-signes-xx'), corps),
      vi.avisLire(V.signer({ iss: CLE, exp: t + 300 }, SECRET), corps), vi.avisLire(jeton, corps.toString()), vi.avisLire('', corps)
    ], Array(6).fill(null));
    v('six refus comptés', vi.sante().avisRefuses, 6);
    v('⛔ les avis SIGNÉS sont comptés à part (deux lus plus haut) : c\'est ce que relit `install-sfu.sh` pour prouver que LiveKit joint le service', vi.sante().avisRecus, 2);

    /* ⛔ ÉCHEC = FERMÉ : avant tout branchement (ou un branchement qui n'est pas une fonction), une entrée n'est PAS admise — elle est retirée, ce qui se voit, au lieu d'être admise en silence */
    v('⛔ RIEN de branché : une entrée est retirée', (await vi.avisRecu(lu)).suite, 'retiree');
    vi.brancherAdmission('pas une fonction');
    v('⛔ un branchement qui n\'est pas une fonction : retirée aussi', (await vi.avisRecu(lu)).suite, 'retiree');
    lk.appels.length = 0;

    const admises = new Set(['S-abc|u42']);
    vi.brancherAdmission((s, i) => admises.has(s + '|' + i));
    v('une entrée ADMISE : rien (et aucune commande)', [await vi.avisRecu(lu), lk.appels.length], [{ suite: 'admise' }, 0]);
    const rejoue = { event: 'participant_joined', room: { name: 'S-abc' }, participant: { identity: 'retiree' } };
    v('⛔ une entrée NON admise (jeton rejoué après un retrait) : retirée aussitôt', [await vi.avisRecu(rejoue), lk.appels.map(a => [a.methode, a.corps])], [{ suite: 'retiree' }, [['RemoveParticipant', { room: 'S-abc', identity: 'retiree' }]]]);
    vi.brancherAdmission(() => { throw new Error('base indisponible'); });
    v('⛔ la question « admise ? » qui JETTE : retirée (dans le doute, la porte reste fermée)', (await vi.avisRecu(lu)).suite, 'retiree');
    v('les autres avis ne décident de rien', [await vi.avisRecu({ event: 'participant_left', room: { name: 'S-abc' }, participant: { identity: 'x' } }), await vi.avisRecu({ event: 'room_finished', room: { name: 'S-abc' } }), await vi.avisRecu(null), await vi.avisRecu({ event: 'participant_joined', room: {}, participant: {} })], Array(4).fill({ suite: 'rien' }));
    v('quatre retraits forcés comptés (deux sans branchement, deux branchés)', vi.sante().retraitsForces, 4);
  }

  console.log('\nLe code vise du code : la sonde lit la réponse « OK », un jeton ne part jamais sans échéance');
  {
    const src = T.sansCommentaires(require('fs').readFileSync(path.join(T.SERVICE, 'visio.js'), 'utf8'));
    vrai('aucun `console.log` dans le module (le journal passe par la fonction injectée, sans donnée personnelle)', !/console\.(log|error|warn)\(/.test(src));
    vrai('`exp:` posé dans les deux fabriques de jetons', (src.match(/exp: maintenant \+/g) || []).length === 2);
  }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });
