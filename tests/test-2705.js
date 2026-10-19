/* ⛔ CE QUE CE FICHIER GARDE — LA SIGNATURE DE LA TOUR : LA VRAIE `courrierSource().signature` DE `tour.html` CONTRE LE VRAI SERVEUR DE SIGNATURE (`server-courrier/`), 19 octobre 2026.

   Justin : brancher la vraie signature Yousign dans OP Courrier de la Tour. La règle du dépôt : dès que la page appelle une route neuve, UN banc fait parler la VRAIE fonction de la page au VRAI
   serveur — chaque moitié a son banc (test-2702 le module, test-1670 le serveur) et elles ne se parlaient pas. Ici : le serveur est LANCÉ en processus (faux OP GESTION pour le jeton, FAUX Yousign avec état,
   tout sur 127.0.0.1, jamais le vrai Yousign), et la fonction extraite de tour.html l'appelle exactement comme un navigateur :
     1. ⛔ `capacites().signature` n'est vrai que si `/health` dit `signature.pret === true` ; éteint, injoignable, non configuré → FAUX, sans bruit ; le cache de 30 s tient (une seule lecture) ;
     2. le CORS dont la Tour a besoin (origine teamop.fr, en-têtes Authorization + Content-Type, méthodes GET/POST/PUT/DELETE) : chaque réponse que la page reçoit porte l'origine autorisée, et la
        requête préalable du dépôt du PDF (PUT, application/pdf) passe ;
     3. envoyer : brouillon → PDF déposé → activé ; ce que Yousign reçoit (niveau, signataires, contre-signature en dernier) ; l'état revient dans la VUE ; un échec chez Yousign défait TOUT (aucun brouillon
        ne reste sur le service) et la raison du serveur arrive à l'écran ;
     4. le parcours jusqu'au bout : relancer, signatures reçues (webhook signé), « signé », le PDF signé et le dossier de preuve rendus EN OCTETS (Blob) ; annuler ;
     5. ⛔ UN REFUS EST UNE ERREUR QUI SE DIT : session finie (401 → déconnexion), collaborateur (403), mobile manquant (400 avec le numéro du signataire), service éteint — jamais une demande « envoyée ».
   Le serveur et ses faux viennent de `server-courrier/` et `tests/courrier-faux.js` (branche courrier/serveur) ; hors de cette racine : COURRIER_RACINE=<dépôt qui les porte>. Absents : le banc se SAUTE, en le disant. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);

const REPO = path.join(__dirname, '..');
const RACINE_SRV = process.env.COURRIER_RACINE ? path.resolve(process.env.COURRIER_RACINE) : REPO;
const FAUX = path.join(RACINE_SRV, 'tests', 'courrier-faux.js');
if (!fs.existsSync(FAUX) || !fs.existsSync(path.join(RACINE_SRV, 'server-courrier', 'node_modules', 'express'))) {
  console.log('  (sauté : server-courrier/ et tests/courrier-faux.js manquent ici, ou server-courrier/node_modules — COURRIER_RACINE=<dépôt>, npm ci --prefix server-courrier)'); console.log('\n0 ✓  0 ✗'); process.exit(0);
}
const F = require(FAUX);
const BRUT = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(REPO, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let p = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const crypto = require('crypto');

const T_P = 'a'.repeat(48), T_AUTRE = 'e'.repeat(48), T_TECH = 'c'.repeat(48), T_FINI = 'f'.repeat(48);
const MAIL_C = 'client.dupont@exemple.fr', MAIL_C2 = 'second.martin@exemple.fr', MAIL_ME = 'justin.moi@exemple.fr';

(async () => {
  console.log('── 2705 · La signature de la Tour : la VRAIE courrierSource contre le VRAI serveur de signature ──');
  /* la page : la constante est UNE, en tête du bloc, et c'est la bonne adresse */
  const decl = /var COURRIER_SRV='(https:\/\/[^']+)';/.exec(BRUT);
  vrai('(population) COURRIER_SRV est déclarée, une seule fois, en https', decl && (BRUT.match(/var COURRIER_SRV=/g) || []).length === 1);
  v('⛔ l\'adresse du service de signature de la bêta', decl && decl[1], 'https://courrier-beta.teamop.fr');
  const CODE = BRUT.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ aucune autre adresse du service écrite en dur dans la page (toutes les routes passent par la constante)', (CODE.match(/courrier-beta\.teamop\.fr/g) || []).length === 1);
  /* la valeur DÉCLARÉE ne dit pas où la page appelle : une seconde affectation plus loin la réadresse sans toucher à la déclaration (mutation « joint ailleurs ») */
  vrai('⛔ aucune autre affectation de COURRIER_SRV dans le code : rien ne réadresse le service plus loin', (CODE.match(/\bCOURRIER_SRV\s*=(?!=)/g) || []).length === 1);
  const src = corps(BRUT, 'function courrierSource(');
  vrai('(population) courrierSource est trouvée, avec son objet signature', src.length > 6000 && /var signature=\{/.test(src), src.length);

  const gestion = await F.fauxGestion();
  gestion.ajouter(T_P, { id: 'p1', nom: 'Justin', role: 'patron' });
  gestion.ajouter(T_AUTRE, { id: 'p2', nom: 'Autre', role: 'patron' });
  gestion.ajouter(T_TECH, { id: 't1', nom: 'Technicien', role: 'technicien' });
  const ys = await F.fauxYousign();
  const S = await F.lancer(gestion.url, ys.url);
  const H = (j) => ({ Authorization: 'Bearer ' + j });

  /* le « navigateur » : la fonction de la page appelle `fetch` comme le ferait la Tour depuis teamop.fr ; on note l'adresse et ce que la réponse permet de lire à une page de cette origine */
  let jeton = T_P, deconnexions = 0, srvUrl = S.url; const APPELS = [], CORS = [];
  const bac = { COURRIER_SRV: decl[1], MYNOM: 'Justin', API: 'http://127.0.0.1:1', INJOIGNABLE: 'Serveur injoignable', Promise, JSON, Date, encodeURIComponent, String, Array, Math, Error, parseInt, Blob, AbortSignal,
    hAuth: () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton }), srvEtat() {}, doLogout: () => { deconnexions++; },
    fetch: async (u, o) => {
      const url = String(u).replace('https://courrier-beta.teamop.fr', srvUrl); APPELS.push((o && o.method || 'GET') + ' ' + url.replace(srvUrl, ''));
      const r = await fetch(url, Object.assign({}, o, { headers: Object.assign({ Origin: 'https://teamop.fr' }, (o && o.headers) || {}) }));
      CORS.push(r.headers.get('access-control-allow-origin')); return r; } };
  vm.createContext(bac);
  vm.runInContext(src, bac);
  const nouvelle = () => vm.runInContext('courrierSource()', bac);
  const rejette = async (p) => { try { await p; return null; } catch (e) { return String(e && e.message); } };
  const pdf = (m) => new Blob([F.PDF(m || 'contrat')], { type: 'application/pdf' });
  const demande = (extra) => Object.assign({ titre: 'Contrat de nettoyage', type: 'Contrat de prestation', niveau: 'avance', jours: 15, relances: true,
    signataires: [{ nom: 'Marie Dupont', email: MAIL_C, telephone: '06 12 34 56 78' }, { nom: 'Paul Martin', email: MAIL_C2, telephone: '+33 7 98 76 54 32' }],
    contresignature: { nom: 'Justin Moi', email: MAIL_ME, telephone: '0611223344' } }, extra || {});
  const brut = (m, chemin, tok, o) => fetch(S.url + chemin, Object.assign({ method: m, headers: H(tok || T_P) }, o || {}));

  console.log('\n── 1. Le service est-il prêt ? ──');
  let s = nouvelle();
  let cap = await s.capacites();
  v('⛔ /health dit `signature.pret` : la capacité est VRAIE (et le reste de ce que la Tour sait faire ne bouge pas)', [cap.signature, cap.marquage, cap.suivi, cap.simulation], [true, true, true, false]);
  vrai('…la source expose l\'objet `signature` avec ses SIX méthodes (le module ne lit la capacité qu\'avec elles)', ['envoyer', 'etat', 'relancer', 'annuler', 'signe', 'preuve'].every(k => typeof s.signature[k] === 'function'));
  const avant = APPELS.length; await s.capacites(); await s.capacites();
  v('⛔ le cache de 30 s tient : trois lectures de la capacité, UNE seule lecture de /health', APPELS.length - avant, 0);
  v('…et /health est lu sans jeton ni corps (il est public)', APPELS[0], 'GET /health');
  { const sansY = await F.lancer(gestion.url, ys.url, { sansYousign: true }); srvUrl = sansY.url;
    v('⛔ service lancé SANS clé Yousign (`pret:false`) : la capacité est FAUSSE', (await nouvelle().capacites()).signature, false);
    await sansY.stop(); }
  srvUrl = 'http://127.0.0.1:1';
  v('⛔ service éteint / injoignable : FAUSSE, sans lever (échec silencieux)', (await nouvelle().capacites()).signature, false);
  srvUrl = S.url;
  { const faux = require('http').createServer((q, r) => r.end('pas du json')); await new Promise(r => faux.listen(0, '127.0.0.1', r)); srvUrl = 'http://127.0.0.1:' + faux.address().port;
    v('⛔ une réponse qui n\'est pas du JSON : FAUSSE', (await nouvelle().capacites()).signature, false);
    const faux2 = require('http').createServer((q, r) => r.end('{"ok":true,"signature":{"pret":"oui"}}')); await new Promise(r => faux2.listen(0, '127.0.0.1', r)); srvUrl = 'http://127.0.0.1:' + faux2.address().port;
    v('⛔ `pret` autre que `true` (une chaîne « oui ») : FAUSSE — jamais « truthy »', (await nouvelle().capacites()).signature, false);
    faux.close(); faux2.close(); }
  srvUrl = S.url;

  console.log('\n── 2. Le CORS dont la Tour a besoin ──');
  { const pre = await fetch(S.url + '/api/signature/demandes/' + 'a'.repeat(24) + '/documents?nom=x.pdf', { method: 'OPTIONS', headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } });
    const ah = (pre.headers.get('access-control-allow-headers') || '').toLowerCase(), am = (pre.headers.get('access-control-allow-methods') || '');
    v('⛔ la requête préalable du dépôt du PDF (PUT + Authorization + Content-Type) passe : 204, origine teamop.fr', [pre.status, pre.headers.get('access-control-allow-origin')], [204, 'https://teamop.fr']);
    vrai('…les en-têtes Authorization et Content-Type sont permis, et les méthodes GET, POST, PUT, DELETE', /authorization/.test(ah) && /content-type/.test(ah) && ['GET', 'POST', 'PUT', 'DELETE'].every(x => am.includes(x)), ah + ' | ' + am);
    const autre = await fetch(S.url + '/api/signature/demandes', { method: 'OPTIONS', headers: { Origin: 'https://mechant.example', 'Access-Control-Request-Method': 'GET' } });
    v('…une autre origine n\'obtient rien', autre.headers.get('access-control-allow-origin'), null); }

  console.log('\n── 3. Envoyer : brouillon → PDF → activation ──');
  s = nouvelle();
  const pasDeFichier = await rejette(s.signature.envoyer(demande(), []));
  vrai('⛔ sans PDF : refus lisible AVANT tout appel au service', /PDF/.test(pasDeFichier || '') && !APPELS.slice(-3).some(a => /demandes/.test(a)), pasDeFichier);
  APPELS.length = 0; CORS.length = 0;
  const vue = await s.signature.envoyer(demande(), [{ nom: 'Contrat 2027.pdf', blob: pdf('contrat') }]);
  v('⛔ le service a reçu, dans l\'ordre : création, dépôt du PDF, activation', APPELS.map(a => a.replace(/[0-9a-f]{24}/, 'ID')), ['POST /api/signature/demandes', 'PUT /api/signature/demandes/ID/documents?nom=Contrat%202027.pdf', 'POST /api/signature/demandes/ID/activer']);
  v('⛔ la VUE rendue : identifiant, état « en_attente », échéance dans ~15 jours, 3 signataires dont la contre-signature EN DERNIER', [/^[0-9a-f]{24}$/.test(vue.id), vue.etat, vue.echeance > Date.now() + 14 * 864e5 && vue.echeance < Date.now() + 16 * 864e5, vue.signataires.map(x => x.email), vue.signataires.map(x => x.contre)], [true, 'en_attente', true, [MAIL_C, MAIL_C2, MAIL_ME], [false, false, true]]);
  v('…le document est là, à son nom', vue.documents.map(d => [d.n, d.nom, d.signe]), [[1, 'Contrat 2027.pdf', false]]);
  vrai('⛔ chaque réponse reçue par la page porte l\'origine autorisée (sinon le navigateur la lui cacherait)', CORS.length === 3 && CORS.every(x => x === 'https://teamop.fr'), CORS.join(','));
  const R = ys.derniere();
  v('⛔ chez Yousign : niveau « Code SMS » (avancée), 3 signataires, la contre-signature en dernier, un document', [R.signers.length, R.signers[0].signature_authentication_mode, R.signers.map(x => x.info.email), R.docs.length], [3, 'otp_sms', [MAIL_C, MAIL_C2, MAIL_ME], 1]);
  v('…et le mobile saisi « 06 12 34 56 78 » est devenu E.164', R.signers[0].info.phone_number, '+33612345678');
  vrai('⛔ le jeton envoyé est celui de la Tour (le faux OP GESTION l\'a vérifié, et le service sait qui est la personne)', gestion.st.appels > 0 && (await brut('GET', '/api/signature/demandes')).ok);
  const simple = await s.signature.envoyer(demande({ niveau: 'simple', contresignature: undefined, signataires: [{ nom: 'Claire Dubois', email: 'claire@exemple.fr' }], titre: 'Devis simple' }), [{ nom: 'Devis.pdf', blob: pdf('devis') }]);
  v('« Code e-mail » (simple) : sans mobile, sans contre-signature — accepté', [simple.etat, simple.signataires.length], ['en_attente', 1]);
  v('…chez Yousign : niveau simple (e-mail)', [ys.derniere().signers[0].signature_level], ['electronic_signature']);

  console.log('\n── 4. Le parcours : état, relance, signatures, PDF signé, preuve, annulation ──');
  let e = await s.signature.etat(vue.id);
  v('etat(id) relit la demande', [e.id === vue.id, e.etat], [true, 'en_attente']);
  e = await s.signature.relancer(vue.id);
  v('⛔ relancer(id) : le service relance le signataire dont c\'est le tour (la demande est ORDONNÉE par la contre-signature : le premier client, pas les suivants ni l\'expéditeur)', [e.id === vue.id, R.rappels], [true, [R.signers[0].id]]);
  const encoreRelance = await rejette(s.signature.relancer(vue.id));
  vrai('⛔ une seconde relance aussitôt : refus qui DIT pourquoi (dix minutes), pas un « Relance envoyée » muet', /dix minutes/.test(encoreRelance || ''), encoreRelance);
  const hook = (ev) => { const b = Buffer.from(JSON.stringify(ev)); return fetch(S.url + '/api/signature/webhook/yousign', { method: 'POST', body: b, headers: { 'Content-Type': 'application/json', 'X-Yousign-Signature-256': S.signer(b) } }); };
  const evt = (nom, rec, signer) => ({ event_id: 'ev_' + crypto.randomBytes(6).toString('hex'), event_name: nom, event_time: '2026-10-19T10:00:00Z', data: Object.assign({ signature_request: { id: rec.id } }, signer ? { signer: { id: signer } } : {}) });
  const sg = R.signers.map(x => x.id);
  await hook(evt('signer.link_opened', R, sg[0]));
  e = await s.signature.etat(vue.id);
  v('⛔ le client ouvre le lien : état « ouvert », son état de signataire suit', [e.etat, e.signataires[0].etat], ['ouvert', 'viewed']);
  const trop = await rejette(s.signature.signe(vue.id, 1));
  vrai('⛔ le PDF signé d\'une demande non signée : refus qui le dit', /pas encore signé/.test(trop || ''), trop);
  await hook(evt('signer.signed', R, sg[0])); await hook(evt('signer.signed', R, sg[1]));
  e = await s.signature.etat(vue.id);
  v('⛔ les deux clients ont signé : « à contresigner » (le tour de l\'expéditeur, par le lien reçu par e-mail)', [e.etat, e.signataires.map(x => x.etat)], ['a_contresigner', ['signed', 'signed', 'pending']]);
  await hook(evt('signer.signed', R, sg[2])); await hook(evt('signature_request.done', R));
  e = await s.signature.etat(vue.id);
  v('⛔ tous ont signé : état « signe », les pièces sont archivées (1 PDF, 3 preuves)', [e.etat, e.documents.map(d => d.signe), e.preuves], ['signe', [true], 3]);
  const sgn = await s.signature.signe(vue.id, 1);
  const octets = Buffer.from(await sgn.arrayBuffer());
  vrai('⛔ signe(id, 1) rend un BLOB : les octets du PDF signé (« %PDF- », le contenu que Yousign a rendu)', octets.slice(0, 5).toString() === '%PDF-' && octets.toString().includes('SIGNE ' + R.id), octets.slice(0, 40).toString());
  for (const i of [1, 2, 3]) { const b = Buffer.from(await (await s.signature.preuve(vue.id, i)).arrayBuffer()); vrai('preuve(id, ' + i + ') : le dossier de preuve du signataire ' + i + ', en octets', b.slice(0, 5).toString() === '%PDF-' && b.toString().includes('PREUVE ' + R.id + ' ' + sg[i - 1]), b.slice(0, 50).toString()); }
  const horsPreuve = await rejette(s.signature.preuve(vue.id, 4));
  vrai('une preuve qui n\'existe pas : refus lisible (« introuvable »), pas un fichier vide', /introuvable/i.test(horsPreuve || ''), horsPreuve);
  const horsDoc = await rejette(s.signature.signe(vue.id, 0));
  vrai('un document 0 : refus avant tout appel', /introuvable/i.test(horsDoc || ''), horsDoc);
  e = await s.signature.annuler(simple.id);
  v('⛔ annuler(id) : la demande en cours est annulée chez Yousign ET rendue annulée', [e.etat, ys.derniere().annulee], ['annule', true]);
  const dejaAnnulee = await rejette(s.signature.annuler(simple.id));
  vrai('…l\'annuler de nouveau : refus qui le dit', /déjà terminée/.test(dejaAnnulee || ''), dejaAnnulee);

  console.log('\n── 5. Un refus est une ERREUR qui se dit ──');
  let r1 = await rejette(s.signature.envoyer(demande({ signataires: [{ nom: 'Marie Dupont', email: MAIL_C, telephone: '' }], contresignature: undefined }), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('⛔ « Code SMS » sans mobile : refus qui nomme LE SIGNATAIRE et LE CHAMP (« Signataire 1 : le mobile… »)', /Signataire 1 : le mobile/.test(r1 || ''), r1);
  const rl0 = await brut('GET', '/api/signature/demandes'); const liste0 = await rl0.json();
  vrai('⛔ …et rien n\'est resté sur le service (la demande refusée dès la création n\'existe pas)', liste0.demandes.every(d => d.titre !== 'x') && liste0.demandes.length === 2, JSON.stringify(liste0.demandes.map(d => d.titre)));
  r1 = await rejette(s.signature.envoyer(demande({ signataires: [{ nom: 'Marie', email: 'pas-une-adresse', telephone: '0612345678' }] }), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('une adresse e-mail invalide : refus qui nomme le signataire et l\'adresse', /Signataire 1 : l’adresse e-mail/.test(r1 || ''), r1);
  r1 = await rejette(s.signature.envoyer(demande({ contresignature: { nom: 'Doublon', email: MAIL_C, telephone: '0611223344' } }), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('la contre-signature à l\'adresse d\'un client : « même adresse e-mail »', /même adresse/.test(r1 || ''), r1);
  r1 = await rejette(s.signature.envoyer(demande(), [{ nom: 'faux.pdf', blob: new Blob(['ceci n\'est pas un pdf'], { type: 'application/pdf' }) }]));
  vrai('⛔ un fichier qui n\'est pas un PDF : refus lisible…', /PDF/.test(r1 || ''), r1);
  const liste1 = await (await brut('GET', '/api/signature/demandes')).json();
  v('⛔ …ET le brouillon créé avant le refus du fichier est EFFACÉ du service (aucune demande orpheline)', liste1.demandes.length, 2);
  /* Yousign qui échoue à l'activation : le serveur défait tout, la page efface le brouillon, la raison arrive */
  ys.st.echecs.set('activer', { fois: 1 });
  r1 = await rejette(s.signature.envoyer(demande({ titre: 'Échec Yousign' }), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('⛔ Yousign refuse l\'activation : l\'erreur dit que le prestataire a refusé, avec l\'étape', /Yousign\) a refusé/.test(r1 || '') && /étape/.test(r1 || ''), r1);
  const liste2 = await (await brut('GET', '/api/signature/demandes')).json();
  v('⛔ …et AUCUNE demande « Échec Yousign » ne reste sur le service (ni brouillon, ni envoyée)', liste2.demandes.filter(d => d.titre === 'Échec Yousign').length, 0);
  /* le PREMIER VRAI ESSAI (19 octobre 2026) : « (étape : creer, code 400) » sans dire quel champ — la phrase de la page porte maintenant le champ refusé et la raison nettoyée par le service */
  ys.st.refusCreer = { statut: 400, corps: { title: 'Bad Request', violations: [{ propertyPath: 'reminder_settings.max_occurrences', message: 'Valeur trop haute pour jean.dupont@exemple.fr 0612345678' }] } };
  ys.st.echecs.set('creer', { fois: 1 });
  r1 = await rejette(s.signature.envoyer(demande({ titre: 'Refus 400' }), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('⛔ un refus 400 de Yousign : la phrase de la page nomme l\'étape, le code ET le champ refusé', /étape : creer, code 400, champ : reminder_settings\.max_occurrences/.test(r1 || ''), r1);
  vrai('…avec la raison du prestataire, sans adresse ni numéro', /Valeur trop haute/.test(r1 || '') && !/@|0612/.test(r1 || ''), r1);
  ys.st.refusCreer = null; ys.st.echecs.clear();
  ys.st.echecs.set('annuler', { fois: 1 });
  r1 = await rejette(s.signature.annuler(vue.id));
  vrai('annuler() sur une demande déjà signée : refus lisible', /déjà terminée/.test(r1 || ''), r1);
  /* la personne */
  jeton = T_FINI; const d0 = deconnexions;
  r1 = await rejette(s.signature.etat(vue.id));
  vrai('⛔ session finie (jeton inconnu) : l\'erreur le dit ET la Tour déconnecte (comme ses autres routes)', /Session expirée/.test(r1 || '') && deconnexions === d0 + 1, r1);
  jeton = T_TECH;
  r1 = await rejette(s.signature.envoyer(demande(), [{ nom: 'a.pdf', blob: pdf('a') }]));
  vrai('⛔ un collaborateur (rôle autre que patron) : « réservé au patron », sans déconnexion', /patron/.test(r1 || '') && deconnexions === d0 + 1, r1);
  jeton = T_AUTRE;
  r1 = await rejette(s.signature.etat(vue.id));
  vrai('⛔ un AUTRE patron ne voit pas la demande de Justin : même réponse qu\'une demande inexistante', /introuvable/.test(r1 || ''), r1);
  jeton = T_P;
  r1 = await rejette(s.signature.etat('pas-un-identifiant'));
  vrai('un identifiant mal formé est refusé AVANT d\'être mis dans une adresse', /introuvable/.test(r1 || '') && !APPELS.some(a => /pas-un-id/.test(a)), r1);
  srvUrl = 'http://127.0.0.1:1';
  r1 = await rejette(s.signature.etat(vue.id));
  vrai('⛔ service éteint : l\'erreur dit « injoignable » — pas une réponse vide, pas un succès', /injoignable/.test(r1 || ''), r1);
  srvUrl = S.url;
  /* le service ne confond pas un refus et du JSON : une réponse 200 qui n'est pas une vue est une erreur */
  { const bidon = require('http').createServer((q, r) => { r.setHeader('Content-Type', 'application/json'); r.end('{"x":1}'); }); await new Promise(r => bidon.listen(0, '127.0.0.1', r)); srvUrl = 'http://127.0.0.1:' + bidon.address().port;
    r1 = await rejette(s.signature.etat(vue.id));
    vrai('⛔ une réponse 200 qui n\'est pas une demande (pas d\'identifiant, pas d\'état) : ERREUR « illisible »', /illisible/.test(r1 || ''), r1);
    bidon.close(); srvUrl = S.url; }

  await S.stop(); ys.fermer(); gestion.fermer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
