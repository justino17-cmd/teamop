/* SONDE — un flux fermé par le client n'est pas un flux que le SERVICE sait fermé (OP MESSAGES, 17 novembre 2026).
 *
 * Un signal d'appel adressé à une session SANS flux ouvert est retenu 30 s et livré à la réouverture (`flux.js`, `emettreSession`). Mais « sans flux ouvert » se juge sur ce que le
 * service a CONSTATÉ : tant qu'il n'a pas vu la fermeture, il écrit le signal dans le flux mort — et le signal est perdu. `tests/test-981.js` (section 5) fermait le flux de Ben
 * (`fermer`, `attendreFerme` : le lecteur DU BANC est fermé) puis signalait aussitôt ; si le service était en retard à cet instant, le banc tombait sur « les deux signaux
 * retenus arrivent à l'ouverture ».
 *
 * On rejoue le retard du service AU GESTE : SIGSTOP avant la fermeture, le signal part pendant le gel, SIGCONT ensuite — le service trouve la fermeture et la requête ensemble.
 *
 *   node scratchpad/sonde-opmessages-flux-ferme.js <mode>      (TOURS=10 par défaut ; ESPION=1 : le journal des connexions du service, tour par tour, sur la sortie)
 *     sans-gel      le témoin : service libre — retenu puis livré                                            mesuré : 10 retenus sur 10
 *     temoin-perte  le flux n'est PAS fermé avant le signal : la sonde sait VOIR une perte                   mesuré : 10 perdus sur 10
 *     gel           service gelé, le signal part par `fetch` (le client des bancs)                           mesuré : 10 retenus sur 10
 *     dur           service gelé, le signal part sur une connexion DÉJÀ OUVERTE (`http`, persistante)        mesuré : 10 PERDUS sur 10
 *     dur-au-geste  le même, mais on attend que `/health` compte un flux de moins avant de signaler         mesuré : 10 retenus sur 10
 *
 * Pourquoi « gel » ne perd rien et « dur » perd tout : avec `fetch`, la requête est partie sur une connexion NEUVE (le journal des connexions le montre), que le service n'accepte
 * qu'au tour suivant de sa boucle — après avoir traité la fermeture. Sur une connexion déjà ouverte, la requête est lue dans le MÊME tour, avant que la fermeture du flux ne soit
 * dite. Et dans test-981, les signaux partent tantôt sur l'une, tantôt sur l'autre (relevé : « retenu-1 » sur une neuve, « retenu-2 » sur une ancienne) : le banc n'était à
 * l'abri que par chance. Il attend maintenant le constat du service (`fermerPourLeService`), comme le mode « dur-au-geste ». */
'use strict';
const path = require('path'), crypto = require('crypto'), http = require('http'), fs = require('fs'), os = require('os');
const R = path.join(__dirname, '..');
const T = require(path.join(R, 'tests', 'outils-msg'));
T.sauterSiSansDependances();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const mode = process.argv[2] || 'dur', TOURS = parseInt(process.env.TOURS || '10', 10);
if (!['sans-gel', 'temoin-perte', 'gel', 'dur', 'dur-au-geste'].includes(mode)) { console.log('mode inconnu : ' + mode + ' (sans-gel, temoin-perte, gel, dur, dur-au-geste)'); process.exit(2); }
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');

/* l'espion des connexions, côté service : quelle requête arrive sur quelle connexion, et quand chaque connexion se ferme */
const ESPION = `
const http = require('http'), fs = require('fs'), j = process.env.ESPION_CONNEXIONS;
if (j && process.env.OPMSG_DATA) {
  let n = 0; const num = new WeakMap(), emettre = http.Server.prototype.emit;
  http.Server.prototype.emit = function (evt, a) {
    try {
      if (evt === 'connection') { num.set(a, ++n); a.on('close', () => { try { fs.appendFileSync(j, 'fermeture de la connexion ' + num.get(a) + '\\n'); } catch (e) {} }); fs.appendFileSync(j, 'connexion ' + n + ' acceptée\\n'); }
      if (evt === 'request') fs.appendFileSync(j, a.method + ' ' + a.url.replace(/a_[0-9a-f]{32}/, 'a_…') + ' sur la connexion ' + num.get(a.socket) + '\\n');
    } catch (e) {}
    return emettre.apply(this, arguments);
  };
}
`;

(async () => {
  let retenus = 0, perdus = 0;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-flux-'));
  const espion = path.join(dossier, 'espion-connexions.js'); fs.writeFileSync(espion, ESPION);
  for (let tour = 0; tour < TOURS; tour++) {
    const journal = process.env.ESPION ? path.join(dossier, 'connexions-' + tour) : null;
    const svc = await T.lancerService({ horloge: true, config: { appels: { balayageMs: 1000, perduMs: 600000 } }, env: journal ? { ESPION_CONNEXIONS: journal, NODE_OPTIONS: '--require=' + espion } : {} });
    const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: Date.now });
    const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Sonde', origine: 'beta', verifie: true });
    const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 }); c.poserCookie(j); return c; };
    const ana = pers('Ana'), ben = pers('Ben'); S.contactLier(ana.id, ben.id);
    const a1 = cl(ana), b1 = cl(ben);
    const fA = await T.flux(a1), fB = await T.flux(b1);
    const r = await a1.post('/api/appels', { uid: ben.id, type: 'audio' });
    await b1.post('/api/appels/' + r.j.appel.id + '/repondre', { accepte: true });
    const ouverts = async () => (await (await fetch(svc.base + '/health')).json()).flux.ouverts;
    const avant = await ouverts();
    const corps = { a: ben.id, type: 'candidats', donnees: { c: ['retenu'] } }, chemin = '/api/appels/' + r.j.appel.id + '/signal';
    /* les modes « dur » : UNE connexion persistante, chauffée avant le gel — la requête du signal est donc dans le tampon du service, sur une connexion qu'il surveille déjà */
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const brut = (ch, c) => new Promise((res, rej) => {
      const d = c === undefined ? null : Buffer.from(JSON.stringify(c));
      const q = http.request(svc.base + ch, { method: d ? 'POST' : 'GET', agent, headers: Object.assign({ Cookie: a1.enteteCookie() }, d ? { 'Content-Type': 'application/json', 'Content-Length': d.length, Origin: svc.base, 'X-OPM': '1' } : {}) }, (rp) => { let t = ''; rp.on('data', x => { t += x; }); rp.on('end', () => res({ code: rp.statusCode, txt: t })); });
      q.on('error', rej); if (d) q.write(d); q.end();
    });
    const geler = () => process.kill(svc.enfant.pid, 'SIGSTOP'), degeler = () => process.kill(svc.enfant.pid, 'SIGCONT');
    const fermerFlux = async () => { fB.fermer(); await fB.attendreFerme(); };                    // ce que faisait le banc : SON lecteur est fermé
    const constat = () => T.attendre(async () => ((await ouverts()) === avant - 1 ? true : null), 8000, 5);   // le SERVICE tient un flux de moins

    let rep;
    if (mode === 'sans-gel') { await fermerFlux(); rep = await a1.post(chemin, corps); }
    else if (mode === 'temoin-perte') { rep = await a1.post(chemin, corps); await fermerFlux(); }
    else if (mode === 'gel') { geler(); await fermerFlux(); const p = a1.post(chemin, corps); await T.dort(50); degeler(); rep = await p; }
    else if (mode === 'dur') { await brut('/api/appels'); geler(); await fermerFlux(); const p = brut(chemin, corps); await T.dort(80); degeler(); rep = await p; }
    else { await brut('/api/appels'); geler(); await fermerFlux(); degeler(); await constat(); rep = await brut(chemin, corps); }

    const f2 = await T.flux(b1);
    const recu = await T.attendre(() => f2.evenements.some(e => e.event === 'signal'), 1500, 10);
    if (recu) retenus++; else perdus++;
    console.log('  tour ' + tour + ' [' + mode + '] : le signal a répondu ' + rep.code + ' ; à la réouverture du flux, Ben ' + (recu ? 'le REÇOIT (il était retenu)' : 'ne reçoit RIEN (écrit dans le flux mort : perdu)'));
    if (journal) { try { console.log(fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(l => '        ' + l).join('\n')); } catch (e) { /* pas de journal */ } }
    agent.destroy(); fA.fermer(); f2.fermer(); try { S.fermer(); } catch (e) { /* déjà fermé */ } await svc.arreter();
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* rien */ }
  console.log('\n[' + mode + '] ' + retenus + ' retenu(s) puis livré(s), ' + perdus + ' perdu(s) sur ' + (retenus + perdus));
})();
