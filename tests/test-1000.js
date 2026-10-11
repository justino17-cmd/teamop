/* ⛔ CE QUE CE FICHIER GARDE — LA TRANSCRIPTION D'UN VOCAL, DE LA PAGE AU SERVICE ET À L'OUVRIER (11 octobre 2026, « une transcription écrite, comme sur Instagram »).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle) contre le VRAI service, à trois
   personnes — et un FAUX ouvrier sur la boucle locale (il note ce qu'il reçoit et répond quand le banc le lui dit ; le vrai est joué par `test-1001`).
   Ce que ni `test-1001` (les pièces seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : la capacité, les deux méthodes, `transcriptionOuverte()` qui dit vrai (installée ou non), une route qui répond ce que le module lit ;
     · UN CALCUL, PARTAGÉ : deux personnes demandent, l'ouvrier ne reçoit qu'UN travail — les octets EXACTS du vocal, le secret, la langue de l'auteur — et le texte
       arrive par le flux chez tous ceux qui voient le vocal, sans recharger ;
     · ⛔ UNE TRANSCRIPTION SE LIT COMME SON VOCAL : un étranger, un membre arrivé APRÈS le vocal, qui l'a masqué « pour moi » → 404 uniforme ; un vocal supprimé
       pour tous emporte son texte ; ce qu'un vocal a dit se retrouve dans « Retrouver », et seulement chez qui le voit ;
     · LES REFUS SE DISENT : pas installée (503), trop long (413), file pleine ou ouvrier absent (503 avec son attente), trop de demandes (429), pas un vocal (409) —
       chacun avec sa phrase en français ;
     · UN ÉCHEC SE RETENTE, un nombre borné de fois, puis se dit définitif (sans rappeler l'ouvrier) ;
     · ⛔ UN CALCUL INTERROMPU PAR UN REDÉMARRAGE devient un échec DIT : la page qui attendait l'apprend par le flux (sinon « en cours » pour toujours) ;
     · ⛔ /health dit l'état de l'ouvrier sans son adresse ni son secret.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const blobDe = (buf, type) => new Blob([buf], { type: type || 'application/octet-stream' });
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const SECRET = 'TrSecret-BANC-' + 'Wq'.repeat(20);
const TEXTE = 'Salut JETON-QWZK je passe au chantier vers neuf heures';

/* LE FAUX OUVRIER : il refuse qui n'a pas le secret, note chaque travail (octets, langue), et répond quand le banc relâche — ou tout de suite si `auto` est posé */
function fauxOuvrier() {
  const o = { travaux: [], enAttente: [], sansSecret: 0, auto: null, sondes: 0, panne: false };
  o.serveur = http.createServer((q, r) => {
    const rep = (code, j) => { r.writeHead(code, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
    if (o.panne) { q.socket.destroy(); return; }
    if (q.headers.authorization !== 'Bearer ' + SECRET) { o.sansSecret++; q.resume(); return rep(401, { error: 'non_autorise' }); }
    if (q.method === 'GET' && q.url === '/sante') { o.sondes++; q.resume(); return rep(200, { ok: true, sha: 'banc0000', occupe: false }); }
    if (q.method === 'POST' && q.url === '/transcrire') {
      const morceaux = []; q.on('data', d => morceaux.push(d));
      q.on('end', () => {
        const t = { octets: Buffer.concat(morceaux), langue: q.headers['x-langue'], repondre: (code, j) => rep(code, j) };
        o.travaux.push(t);
        if (o.auto) { const a = o.auto; t.repondre(a[0], a[1]); } else o.enAttente.push(t);
      });
      return;
    }
    q.resume(); rep(404, { error: 'introuvable' });
  });
  o.ecouter = () => new Promise(ok => o.serveur.listen(0, '127.0.0.1', () => { o.port = o.serveur.address().port; ok(); }));
  o.relacher = (code, j) => { const t = o.enAttente.shift(); if (t) t.repondre(code, j); return !!t; };
  return o;
}

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const W = fauxOuvrier(); await W.ecouter();
  const trCfg = { url: 'http://127.0.0.1:' + W.port, secret: SECRET, sondeMs: 60, delaiSondeMs: 1000, delaiBaseMs: 5000, delaiParSMs: 100, file: 3, essais: 2, parHeure: 20, dureeMaxS: 60 };
  let svc = await T.lancerService({ urlGestion: og.url, config: { transcription: trCfg } });
  const sans = await T.lancerService({ urlGestion: og.url });
  const sources = [], dossiers = [];
  function monter(s) {
    const nav = T.navigateur(s.base);
    const src = creerSourceServeur({ OPMSG, base: s.base, fetch: (u, i) => nav.fetch(u, i), EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    const evs = []; src.ecouter(e => evs.push(e)); sources.push(src);
    return { src, evs, nav,
      async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
      async api(methode, chemin, corps) { const r = await nav.fetch(s.base + chemin, { method: methode, headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: corps ? JSON.stringify(corps) : undefined }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { statut: r.status, json: j }; } };
  }
  const vues = async (S, conv) => (await S.src.ouvrir(conv)).messages;
  const trouve = async (S, conv, pred) => { let m = null; await att(async () => { m = (await vues(S, conv)).find(pred) || null; return !!m; }); return m; };
  const sante = async (s) => { const r = await fetch(s.base + '/health'); return r.json(); };
  let vocalN = 0;
  const vocal = (S, conv, dur) => { vocalN++; const son = Buffer.concat([F.webm(3000), Buffer.from('VOCAL-' + vocalN)]); return S.src.envoyer(conv, { vocal: { blob: blobDe(son, 'audio/webm'), url: 'blob:banc/' + vocalN, dur: dur || 3.4, bars: [6, 9, 14, 18, 12] } }).then(() => son); };

  try {
    const A = monter(svc), B = monter(svc), C = monter(svc), D = monter(svc), Z = monter(sans), Z2 = monter(sans);
    const alice = await A.entrer('alice'), bob = await B.entrer('bob'), cleo = await C.entrer('cleo'); await D.entrer('dan'); await Z.entrer('alice'); await Z2.entrer('bob');

    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · le contrat de la page');
    v('la capacité et les deux méthodes', [A.src.capacites.transcription, typeof A.src.transcrire, typeof A.src.transcriptionOuverte], [true, 'function', 'function']);
    v('`transcriptionOuverte()` : installée (et la durée qu\'elle transcrit au plus)', await A.src.transcriptionOuverte(), { ouverte: true, dureeMaxS: 60 });
    v('… et sur un service sans ouvrier : pas installée — la page ne propose rien', await Z.src.transcriptionOuverte(), { ouverte: false, dureeMaxS: 0 });
    vrai('/health : l\'ouvrier est vu, sondé', await att(async () => { const h = await sante(svc); return h.transcription && h.transcription.configuree === true && h.transcription.ok === true; }));
    const h0 = JSON.stringify(await sante(svc));
    vrai('⛔ /health ne dit ni l\'adresse de l\'ouvrier ni son secret', !h0.includes(SECRET) && !h0.includes(':' + W.port));
    v('un service sans ouvrier : /health le dit « non configuré », sans crier', (await sante(sans)).transcription, { configuree: false, ok: false, file: 0, faites: 0, vides: 0, echecs: 0, echecsSonde: 0 });
    v('⛔ la sonde présente le secret (l\'ouvrier n\'a rien refusé)', W.sansSecret, 0);

    /* ═══ 2. UN VOCAL, UN CALCUL, PARTAGÉ ══════════════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · un vocal, une transcription, partagée');
    const l1 = await A.src.lienContact(); const conv = (await B.src.accepterLien(l1.code)).conv;
    const son1 = await vocal(A, conv, 3.4);
    const mB = await trouve(B, conv, x => x.vocal);
    vrai('Bruno reçoit le vocal, sans transcription (rien ne se calcule d\'office)', !!mB && mB.transcription === undefined && W.travaux.length === 0);
    const r1 = await B.src.transcrire(conv, mB.id);
    v('Bruno demande : « en cours »', r1, { etat: 'attente' });
    await att(() => W.travaux.length === 1);
    const t1 = W.travaux[0];
    vrai('⛔ l\'ouvrier reçoit les octets EXACTS du vocal (déchiffrés par le service), et la langue de l\'auteur', t1.octets.equals(son1) && t1.langue === 'fr');
    const mA = (await vues(A, conv)).find(x => x.vocal);
    v('Alice demande aussi, pendant le calcul : « en cours »', await A.src.transcrire(conv, mA.id), { etat: 'attente' });
    await T.dort(150);
    v('⛔ UN seul calcul pour deux personnes', W.travaux.length, 1);
    A.evs.length = 0; B.evs.length = 0;
    W.relacher(200, { ok: true, texte: TEXTE, langue: 'fr' });
    vrai('le texte arrive par le flux, chez Bruno ET chez Alice, sans recharger', await att(() => A.evs.some(e => e.type === 'conversation' && e.id === conv) && B.evs.some(e => e.type === 'conversation' && e.id === conv)));
    v('Bruno lit la transcription', (await trouve(B, conv, x => x.vocal && x.transcription && x.transcription.etat === 'prete')).transcription, { etat: 'prete', texte: TEXTE, langue: 'fr' });
    v('Alice aussi', (await trouve(A, conv, x => x.vocal && x.transcription && x.transcription.etat === 'prete')).transcription.texte, TEXTE);
    v('redemander ne recalcule rien : le texte revient tout de suite', [await B.src.transcrire(conv, mB.id), W.travaux.length], [{ etat: 'prete', texte: TEXTE, langue: 'fr' }, 1]);
    const B2 = monter(svc); await B2.entrer('bob');
    v('un autre appareil de Bruno, ouvert après : le texte est là au chargement', (await trouve(B2, conv, x => x.vocal)).transcription, { etat: 'prete', texte: TEXTE, langue: 'fr' });
    const rech = await B.src.chercher(conv, 'jeton-qwzk');
    vrai('⛔ ce qu\'un vocal a dit se retrouve dans « Retrouver »', rech.resultats.length === 1 && rech.resultats[0].seq > 0);

    /* ═══ 3. UNE TRANSCRIPTION SE LIT COMME SON VOCAL ════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · qui peut la lire, qui ne peut pas');
    const seq1 = (await vues(B, conv)).find(x => x.vocal).seq;
    v('⛔ Cléo, étrangère à la conversation : 404 (le même que pour un message qui n\'existe pas)', [(await C.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: seq1 })).statut, (await C.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: 99999 })).statut], [404, 404]);
    const lc = await A.src.lienContact(); await C.src.accepterLien(lc.code);
    const g = await A.src.creerGroupe({ nom: 'Chantier', membres: [bob.id] });
    const sonG = await vocal(A, g.id, 2.2);
    const mG = await trouve(B, g.id, x => x.vocal);
    await A.src.ajouterMembres(g.id, [cleo.id]);
    await att(async () => (await C.src.lister()).some(c => c.id === g.id));
    v('⛔ Cléo, ajoutée APRÈS le vocal : 404 — elle ne voit pas le vocal, elle n\'en lit pas le texte', (await C.api('POST', '/api/conversations/' + g.id + '/messages/transcrire', { seq: mG.seq })).statut, 404);
    void sonG;
    const n0 = W.travaux.length;
    await B.src.transcrire(g.id, mG.id);
    await att(() => W.travaux.length === n0 + 1);
    C.evs.length = 0;
    W.relacher(200, { ok: true, texte: 'Texte-DU-GROUPE-VXQ', langue: 'fr' });
    await trouve(B, g.id, x => x.vocal && x.transcription && x.transcription.etat === 'prete');
    await T.dort(200);
    vrai('⛔ … et le flux ne lui en dit rien (aucun événement, aucun texte)', !C.evs.some(e => e.type === 'conversation' && e.id === g.id) && !JSON.stringify(await vues(C, g.id)).includes('Texte-DU-GROUPE'));
    const rC = await C.src.chercher(g.id, 'groupe-vxq').catch(() => ({ resultats: [] }));
    v('⛔ ni « Retrouver »', rC.resultats.length, 0);
    await B.src.supprimer(conv, mB.id, 'moi');
    v('⛔ Bruno masque le vocal « pour moi » : sa transcription lui devient introuvable', (await B.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: seq1 })).statut, 404);
    v('Alice, elle, la lit toujours', (await vues(A, conv)).find(x => x.vocal).transcription.texte, TEXTE);
    await A.src.supprimer(conv, mA.id, 'tous');
    await att(async () => (await vues(A, conv)).find(x => x.seq === seq1 && x.supprime));
    const mSup = (await vues(A, conv)).find(x => x.seq === seq1);
    vrai('⛔ un vocal supprimé pour tous emporte son texte (plus de transcription, plus rien dans « Retrouver »)', mSup.supprime === true && mSup.transcription === undefined && (await A.src.chercher(conv, 'jeton-qwzk')).resultats.length === 0);
    v('et redemander : 404', (await A.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: seq1 })).statut, 404);

    /* ═══ 4. LES REFUS SE DISENT ══════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · les refus, chacun sa phrase');
    await vocal(A, conv, 2);
    const mZ = await trouve(B, conv, x => x.vocal && !x.supprime && x.seq > seq1);
    void mZ;
    const lz = await Z.src.lienContact(); const convZ = (await Z2.src.accepterLien(lz.code)).conv;
    await vocal(Z, convZ, 2);
    const mAbs = await trouve(Z2, convZ, x => x.vocal);
    const eAbs = await attrape(Z2.src.transcrire(convZ, mAbs.id));
    v('un service sans ouvrier : 503 « transcription_absente », dit en français', [eAbs && eAbs.code, eAbs && eAbs.phrase()], ['transcription_absente', 'La transcription des vocaux n\'est pas encore installée sur ce serveur.']);
    await vocal(A, conv, 75);
    const mLong = await trouve(B, conv, x => x.vocal && x.vocal.dur === 75);
    const eLong = await attrape(B.src.transcrire(conv, mLong.id));
    v('un vocal plus long que ce qu\'elle transcrit (75 s > 60) : 413, « trop long », et l\'ouvrier n\'est pas appelé', [eLong && eLong.code, eLong && eLong.phrase(), W.enAttente.length], ['vocal_trop_long', 'Ce vocal est trop long pour être transcrit.', 0]);
    await A.src.envoyer(conv, { texte: 'un texte, pas un vocal' });
    const mTxt = await trouve(B, conv, x => x.texte === 'un texte, pas un vocal');
    v('un message qui n\'est pas un vocal : 409', (await B.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: mTxt.seq })).json.error, 'type_invalide');
    v('un numéro de message illisible : 400', (await B.api('POST', '/api/conversations/' + conv + '/messages/transcrire', { seq: 'x' })).statut, 400);

    /* la file : 3 travaux au plus (le calcul en cours compris), le 4e est refusé AVEC son attente — et rien ne s'écrit pour lui */
    const ids = [];
    for (let i = 0; i < 4; i++) { await vocal(A, conv, 1.5); }
    const vocs = (await vues(B, conv)).filter(x => x.vocal && !x.supprime && !x.transcription && x.vocal.dur !== 75);
    for (const m of vocs.slice(-4)) ids.push(m.id);
    const nT = W.travaux.length;
    for (let i = 0; i < 3; i++) v('travail ' + (i + 1) + ' accepté : « en cours »', (await B.src.transcrire(conv, ids[i])).etat, 'attente');
    const ePlein = await attrape(B.src.transcrire(conv, ids[3]));
    v('⛔ la file pleine : 503 « occupée », avec son attente, et UNE seule invitation à réessayer', [ePlein && ePlein.code, ePlein && ePlein.retry, ePlein && ePlein.phrase()], ['transcription_occupee', 60, 'Beaucoup de vocaux sont en cours de transcription (réessaie dans 60 s).']);
    await att(() => W.travaux.length === nT + 1); await T.dort(100);
    v('⛔ un seul calcul à la fois chez l\'ouvrier (les deux autres attendent leur tour)', W.travaux.length, nT + 1);
    for (let i = 0; i < 3; i++) { await att(() => W.enAttente.length === 1); W.relacher(200, { ok: true, texte: 'texte ' + i, langue: 'fr' }); }
    vrai('les trois passent, chacun son tour', await att(async () => (await vues(B, conv)).filter(x => ids.slice(0, 3).includes(x.id) && x.transcription && x.transcription.etat === 'prete').length === 3));
    v('le 4e, refusé, n\'a rien laissé : il se redemande', (await B.src.transcrire(conv, ids[3])).etat, 'attente');
    await att(() => W.enAttente.length === 1); W.relacher(200, { ok: true, texte: '', langue: null });
    v('un vocal sans parole : « vide » (la page dira « Aucune parole reconnue »)', (await trouve(B, conv, x => x.id === ids[3] && x.transcription && x.transcription.etat !== 'attente')).transcription, { etat: 'vide' });

    /* ═══ 5. UN ÉCHEC SE RETENTE, PUIS SE DIT DÉFINITIF ═════════════════════════════════════════════════════ */
    console.log('\n── 1000 · un échec, un nouvel essai, puis « définitif »');
    await vocal(A, conv, 2);
    const mE = await trouve(B, conv, x => x.vocal && !x.transcription && !x.supprime && x.vocal.dur === 2 && !ids.includes(x.id) && x.seq > mTxt.seq);
    const nE = W.travaux.length;
    await B.src.transcrire(conv, mE.id);
    await att(() => W.enAttente.length === 1); W.relacher(500, { error: 'echec', etape: 'whisper' });
    v('l\'ouvrier échoue : « échec », dit par le flux', (await trouve(B, conv, x => x.id === mE.id && x.transcription && x.transcription.etat === 'echec')).transcription, { etat: 'echec' });
    /* après un 500, l'ouvrier n'est plus « actif » jusqu'à la sonde suivante : on attend qu'elle passe (au geste : le faux ouvrier compte ses sondes) */
    let s0 = W.sondes; await att(() => W.sondes > s0 + 1, 3000);
    v('un nouvel essai part (2 essais au plus)', (await B.src.transcrire(conv, mE.id)).etat, 'attente');
    await att(() => W.enAttente.length === 1); W.relacher(500, { error: 'echec', etape: 'whisper' });
    await trouve(B, conv, x => x.id === mE.id && x.transcription && x.transcription.etat === 'echec');
    s0 = W.sondes; await att(() => W.sondes > s0 + 1, 3000);
    v('⛔ les essais épuisés : « échec définitif », et l\'ouvrier n\'est PAS rappelé', [await B.src.transcrire(conv, mE.id), W.travaux.length - nE], [{ etat: 'echec', definitif: true }, 2]);

    /* ═══ 6. TROP DE DEMANDES ════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · le plafond par personne');
    const lD = await A.src.lienContact(); const convD = (await D.src.accepterLien(lD.code)).conv;
    await vocal(A, convD, 2);
    const mD = await trouve(D, convD, x => x.vocal);
    W.auto = [200, { ok: true, texte: 'pour Dan', langue: 'fr' }];
    const res = [];
    for (let i = 0; i < 21; i++) { const e = await attrape(D.src.transcrire(convD, mD.id)); res.push(e ? e.code : 'ok'); }
    v('⛔ vingt demandes par heure (réglage du banc), la vingt et unième : 429 — même sur un texte déjà prêt (le plafond passe AVANT le stockage)', res, Array(20).fill('ok').concat(['quota_atteint']));
    W.auto = null;

    /* ═══ 7. UN CALCUL INTERROMPU PAR UN REDÉMARRAGE ════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · un redémarrage pendant un calcul');
    await vocal(A, conv, 2);
    const mR = await trouve(B, conv, x => x.vocal && !x.transcription && !x.supprime && x.seq > mE.seq);
    await B.src.transcrire(conv, mR.id);
    await att(() => W.enAttente.length === 1);
    B.evs.length = 0;
    const dossier = svc.racine, cle = svc.cle, port = svc.port; dossiers.push(dossier);
    await svc.arreter(false);
    W.enAttente.length = 0;
    svc = await T.lancerService({ urlGestion: og.url, config: { transcription: trCfg }, dossier, cle, port });
    vrai('⛔ le calcul perdu devient un échec, et la page qui l\'attendait l\'apprend par le flux (elle n\'affiche pas « en cours » pour toujours)',
      await att(async () => { const m = (await vues(B, conv)).find(x => x.id === mR.id); return !!(m && m.transcription && m.transcription.etat === 'echec'); }, 15000));
    v('et il se retente', (await B.src.transcrire(conv, mR.id)).etat, 'attente');
    await att(() => W.enAttente.length === 1); W.relacher(200, { ok: true, texte: 'après le redémarrage', langue: 'fr' });
    v('le texte arrive', (await trouve(B, conv, x => x.id === mR.id && x.transcription && x.transcription.etat === 'prete')).transcription.texte, 'après le redémarrage');

    /* ═══ 8. L'OUVRIER TOMBE ═════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1000 · l\'ouvrier ne répond plus');
    W.panne = true;
    vrai('/health finit par dire « pas ok » (deux sondes ratées de suite)', await att(async () => (await sante(svc)).transcription.ok === false, 5000));
    await vocal(A, conv, 2);
    const mP = await trouve(B, conv, x => x.vocal && !x.transcription && !x.supprime && x.seq > mR.seq);
    const eP = await attrape(B.src.transcrire(conv, mP.id));
    v('une demande pendant la panne : refusée avec son attente, et rien ne s\'écrit', [eP && eP.code, (await vues(B, conv)).find(x => x.id === mP.id).transcription], ['transcription_occupee', undefined]);
    W.panne = false;
    vrai('l\'ouvrier revient : /health redit « ok »', await att(async () => (await sante(svc)).transcription.ok === true, 5000));
    void alice; void cleo;
  } catch (e) {
    console.log('  ✗ le banc a jeté : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    await svc.arreter(); await sans.arreter();
    try { W.serveur.close(); og.fermer && og.fermer(); } catch (e) { /* fermé */ }
    for (const d of dossiers) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } }
  }
  fin();
})();
