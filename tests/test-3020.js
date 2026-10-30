/* ⛔ CE QUE CE FICHIER GARDE — LE PONT DE PAULINE, DU MAC À LA TOUR (25 octobre 2026).
     Pauline (Harvey, sur le Mac de Justin) envoie un relevé complet à `POST /api/pauline/releve` ; la Tour le lit par `GET /api/monitor/pauline`. Le serveur reçoit des données de PROSPECTS
     (entreprises, parfois un nom de dirigeant, des adresses professionnelles) : ce qu'on garde ici, c'est qu'il ne les laisse ni à n'importe qui, ni dans un journal.
       1. `validerReleve` (le module, sans serveur) : types, longueurs, énumérations, plafonds (500 · 300 · 100 · 300), clés inconnues jetées, dates du futur refusées, `__proto__` sans effet ;
          le rangement : chiffré avec la clé maître, clair sans clé, une clé fausse ou un fichier trafiqué = illisible (jamais « vide ») ;
       2. le VRAI serveur, pont NON configuré : 503 avant toute lecture du corps ; la Tour lit « rien reçu » (recuLe: null) ;
       3. le VRAI serveur, pont configuré : pas de jeton, mauvais jeton, EMPREINTE présentée comme jeton (401) ; ⛔ le jeton se vérifie AVANT la lecture du corps (2,5 Mo + mauvais jeton = 401, pas 413) ;
          2,5 Mo avec le bon jeton : 413 (le plafond de 6 Mo du reste du serveur ne lit pas ce corps avant la route) ; schéma faux : 400, SANS une valeur du corps dans le motif ;
          relevé accepté puis relu par le patron ; collaborateur et anonyme : 403 ; plafonds ; élagage à 90 jours ; huit relevés par minute et par adresse ; ⛔ AUCUNE donnée de prospect dans le journal ;
       4. le fichier : droits 600, CHIFFRÉ avec la clé maître (rien de lisible dedans), clé différente = 503 à la lecture, écriture refusée = 500 sans fuite ;
       5. le script du Mac (`outils/pauline-releve.py`) : son banc Python, puis la COUTURE — le relevé qu'il fabrique est accepté par le vrai serveur sans une seule ligne écartée, et l'envoi réel passe. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const P = require(path.join(RACINE, 'server', 'pauline.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 240 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 240000).unref();
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const tmp = [];
process.on('exit', () => { for (const d of tmp) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} } });

/* des mots qui ne ressemblent à rien d'autre : si l'un d'eux sort ailleurs que dans la réponse du patron, c'est une fuite */
const NOM = 'Zébulon-Nettoyage-3020', MAIL = 'dirigeant.zebulon3020@exemple.fr', OBJET = 'Objet-secret-3020', TEXTE = 'Texte-secret-3020 pour le dirigeant', RESUME = 'Resume-secret-3020', CONTACT = 'Karim Zébulonne';
const FUITES = [NOM, 'Zébulon', 'zebulon3020', OBJET, 'Texte-secret', RESUME, CONTACT, 'Zébulonne'];
const JETON = 'jeton-de-banc-' + crypto.randomBytes(24).toString('hex'), EMPREINTE = sha(JETON);
const maint = Date.now(), iso = d => new Date(maint + d).toISOString();
const J = 86400000;
function releve() {
  return { version: 1, genereLe: iso(0), chauffe: { debut: '2026-10-10', jour: 15, plafondDuJour: 7, plafondMax: 15, phase: 'chauffe' },
    jour: { date: '2026-10-25', envoyes: 3, envoyesFroid: 2, reponses: 1, refus: 0, enAttente: 2 },
    recherches: [{ quand: iso(-3600e3), metier: 'nettoyage', ville: 'La Rochelle', trouvees: 12, origine: 'decouverte' }],
    entreprises: [{ id: 'c1', nom: NOM, ville: 'Niort', metier: 'dératisation', etat: 'courriel_pret', email: MAIL, contact: CONTACT, majLe: iso(-60e3) },
      { id: 'c2', nom: 'Clim Atlantique', ville: 'Rochefort', metier: 'climatisation', etat: 'envoye', majLe: iso(-120e3) }],
    courriels: [{ id: 'o1', entrepriseId: 'c1', etat: 'en_attente', objet: OBJET, texte: TEXTE, quand: iso(-1000) }],
    reponses: [{ entrepriseId: 'c1', quand: iso(-500), resume: RESUME, nature: 'interesse' }] };
}

(async () => {
  console.log('\n── 3020 · Le pont de Pauline ──');

  console.log('\n1. La validation et le rangement (le module)');
  const R = o => P.validerReleve(o, maint);
  const A = R(releve());
  vrai('un relevé juste est accepté, sans rien écarter', A.ok && A.ecartes.entreprises + A.ecartes.courriels + A.ecartes.recherches + A.ecartes.reponses === 0 && A.ecartes.tronque.length === 0);
  v('…et se retrouve à l’identique, e-mail passé en minuscules', [A.releve.entreprises[0].email, A.releve.entreprises[0].contact, A.releve.courriels[0].texte], [MAIL.toLowerCase(), CONTACT, TEXTE]);
  const faux = (t, f, attendu) => { const r = releve(); f(r); const x = R(r); v('⛔ ' + t, [x.ok, x.motif || ''], [false, attendu]); };
  v('⛔ un corps qui n’est pas un objet (tableau, texte, null) est refusé', [[], 'x', null, 3].map(x => R(x).ok), [false, false, false, false]);
  faux('version 2 : inconnue', r => { r.version = 2; }, 'version du relevé inconnue (1 attendu)');
  faux('genereLe illisible', r => { r.genereLe = 'avant-hier'; }, 'genereLe absent ou illisible');
  faux('genereLe dans le futur (plus de deux jours)', r => { r.genereLe = iso(3 * J); }, 'genereLe absent ou illisible');
  faux('chauffe absente', r => { delete r.chauffe; }, 'chauffe absente');
  faux('chauffe.plafondDuJour en texte', r => { r.chauffe.plafondDuJour = '15'; }, 'chauffe.plafondDuJour illisible');
  faux('jour.envoyes négatif', r => { r.jour.envoyes = -1; }, 'jour.envoyes illisible');
  faux('entreprises n’est pas une liste', r => { r.entreprises = { c1: 1 }; }, 'entreprises doit être une liste');
  faux('le motif ne cite JAMAIS une valeur du corps', r => { r.genereLe = 'Zébulon-valeur-du-corps'; }, 'genereLe absent ou illisible');
  const B = releve();
  B.entreprises = [{ id: 'bonne', nom: 'x', ville: '', metier: '', etat: 'envoye', majLe: iso(-1) }, 'texte', null, { id: 'sans-etat', nom: 'x', ville: '', metier: '', majLe: iso(-1) },
    { id: 'etat-inconnu', nom: 'x', ville: '', metier: '', etat: 'archivee', majLe: iso(-1) }, { id: 'bonne', nom: 'doublon', ville: '', metier: '', etat: 'envoye', majLe: iso(-1) },
    { id: 'id/../mauvais', nom: 'x', ville: '', metier: '', etat: 'envoye', majLe: iso(-1) }, { id: 'nom-nombre', nom: 12, ville: '', metier: '', etat: 'envoye', majLe: iso(-1) }];
  const x = R(B);
  v('un élément faux est JETÉ et compté, les bons restent (id, état, forme, doublon, nom du mauvais type)', [x.ok, x.releve.entreprises.map(e => e.id), x.ecartes.entreprises], [true, ['bonne'], 7]);
  const C = releve();
  C.entreprises[0].secret = 'x'; C.entreprises[0].__proto__ = { admin: true }; C.pirate = { a: 1 }; C.courriels[0].piece = 'AAAA';
  C.entreprises[0].email = 'pas une adresse'; C.entreprises[0].nom = 'N'.repeat(500) + '\u0000\u0007bout';
  C.courriels[0].texte = 'ligne1\nligne2\u0000\u0008fin' + 'z'.repeat(30000);
  const y = R(C);
  v('les clés inconnues ne passent jamais (ni sur une entreprise, ni sur un courriel, ni à la racine)', [Object.keys(y.releve.entreprises[0]).sort(), Object.keys(y.releve.courriels[0]).sort(), Object.keys(y.releve).sort()],
    [['contact', 'etat', 'id', 'majLe', 'metier', 'nom', 'ville'], ['entrepriseId', 'etat', 'id', 'objet', 'quand', 'texte'], ['chauffe', 'courriels', 'entreprises', 'genereLe', 'jour', 'recherches', 'reponses', 'version']]);
  v('une adresse qui n’en est pas une est omise ; un nom trop long est coupé à 200 et sans caractère de contrôle', [y.releve.entreprises[0].email, y.releve.entreprises[0].nom.length, /[\u0000-\u001f]/.test(y.releve.entreprises[0].nom)], [undefined, 200, false]);
  v('un texte de courriel garde ses fins de ligne, perd ses caractères de contrôle, et est coupé à 20 000', [y.releve.courriels[0].texte.length, y.releve.courriels[0].texte.startsWith('ligne1\nligne2fin')], [20000, true]);
  const D = releve();
  D.entreprises = Array.from({ length: 600 }, (_, i) => ({ id: 'e' + i, nom: 'n', ville: '', metier: '', etat: 'trouvee', majLe: iso(-i * 1000) }));
  D.courriels = Array.from({ length: 400 }, (_, i) => ({ id: 'o' + i, entrepriseId: 'e1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-i * 1000) }));
  D.recherches = Array.from({ length: 150 }, (_, i) => ({ quand: iso(-i * 1000), metier: 'm', ville: 'v', trouvees: i }));
  D.reponses = Array.from({ length: 400 }, (_, i) => ({ entrepriseId: 'e1', quand: iso(-i * 1000), resume: 'r', nature: 'autre' }));
  const z = R(D);
  v('⛔ plafonds : 500 entreprises, 300 courriels, 100 recherches, 300 réponses — les PREMIERS restent', [z.releve.entreprises.length, z.releve.courriels.length, z.releve.recherches.length, z.releve.reponses.length, z.releve.entreprises[0].id, z.releve.entreprises[499].id],
    [500, 300, 100, 300, 'e0', 'e499']);
  v('…et la réponse dit ce qui a été tronqué', z.ecartes.tronque.sort(), ['courriels', 'entreprises', 'recherches', 'reponses']);
  const E = releve();
  E.courriels = [{ id: 'vieux', entrepriseId: 'c1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-91 * J) }, { id: 'recent', entrepriseId: 'c1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-89 * J) }];
  E.recherches = [{ quand: iso(-120 * J), metier: 'a', ville: 'b', trouvees: 1 }, { quand: iso(-2 * J), metier: 'a', ville: 'b', trouvees: 1 }];
  E.reponses = [{ entrepriseId: 'c1', quand: iso(-100 * J), resume: 'r', nature: 'autre' }, { entrepriseId: 'c1', quand: iso(-1 * J), resume: 'r', nature: 'autre' }];
  E.entreprises[1].majLe = iso(-200 * J);
  const el = P.elaguer(R(E).releve, maint);
  v('⛔ l’élagage retire courriels, recherches et réponses de plus de 90 jours (pas les entreprises, qui sont un état)', [el.courriels.map(c => c.id), el.recherches.length, el.reponses.length, el.entreprises.length], [['recent'], 1, 1, 2]);

  /* le rangement */
  const dos = fs.mkdtempSync(path.join(os.tmpdir(), 'pau-')); tmp.push(dos);
  const cle = Buffer.from(crypto.randomBytes(32));
  const ancienneKek = process.env.TEAMOP_KEK, ancienneCred = process.env.CREDENTIALS_DIRECTORY;
  delete process.env.CREDENTIALS_DIRECTORY;
  process.env.TEAMOP_KEK = cle.toString('hex');
  const kek = P.sousCle();
  vrai('(population) la sous-clé existe quand la clé maître est là, et n’est pas la clé maître elle-même', kek && kek.length === 32 && !kek.equals(cle));
  const sc = P.versDisque(A.releve, 1700000000000, kek);
  vrai('chiffré : rien de lisible dans le fichier (ni nom, ni adresse, ni objet, ni texte)', sc.chiffre && !FUITES.some(f => sc.texte.includes(f)) && !sc.texte.includes('dératisation'));
  const f1 = path.join(dos, 'a.json'); fs.writeFileSync(f1, sc.texte);
  v('…et la bonne clé le relit à l’identique', P.deDisque(f1, kek).releve, A.releve);
  v('⛔ une AUTRE clé : illisible (cause « cle »), jamais « vide »', P.deDisque(f1, Buffer.from(crypto.randomBytes(32))), { etat: 'illisible', cause: 'cle' });
  v('⛔ pas de clé du tout sur un fichier chiffré : illisible', P.deDisque(f1, null), { etat: 'illisible', cause: 'cle' });
  const trafique = JSON.parse(sc.texte); trafique.recuLe += 1; fs.writeFileSync(f1, JSON.stringify(trafique));
  v('⛔ la date de réception est liée au chiffré (AAD) : la changer rend le fichier illisible', P.deDisque(f1, kek), { etat: 'illisible', cause: 'cle' });
  const cl = P.versDisque(A.releve, 1700000000000, null); fs.writeFileSync(f1, cl.texte);
  v('sans clé : clair, et relisible (le journal le dira une fois)', [cl.chiffre, P.deDisque(f1, null).releve.entreprises.length], [false, 2]);
  fs.writeFileSync(f1, '{ cassé'); v('un fichier cassé : illisible (cause « forme »)', P.deDisque(f1, kek), { etat: 'illisible', cause: 'forme' });
  v('un fichier absent : vide (« rien reçu »)', P.deDisque(path.join(dos, 'absent.json'), kek), { etat: 'vide' });
  if (ancienneKek === undefined) delete process.env.TEAMOP_KEK; else process.env.TEAMOP_KEK = ancienneKek;
  if (ancienneCred !== undefined) process.env.CREDENTIALS_DIRECTORY = ancienneCred;

  /* l'élagage du DISQUE (si le Mac se tait) */
  {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pau-pur-')); tmp.push(d);
    let horloge = maint;
    const M = P(null, { DATA_DIR: d, config: {}, monPatronStrict: null, maintenant: () => horloge, sansMinuterie: true });
    const r0 = releve();
    r0.courriels = [{ id: 'vieux', entrepriseId: 'c1', etat: 'envoye', objet: OBJET, texte: TEXTE, quand: iso(-10 * J) }, { id: 'recent', entrepriseId: 'c1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-1 * J) }];
    const rc = R(r0).releve;
    M.ranger(rc);
    v('(population) deux courriels sont rangés sur le disque', M.lire().releve.courriels.length, 2);
    v('un relevé récent et sans rien de périmé : rien à faire', M.purger(), 'inchange');
    horloge = maint + 85 * J;
    v('⛔ 85 jours plus tard (le Mac se tait) : le courriel de 95 jours s’efface DU FICHIER, le plus récent (86 jours) reste', [M.purger(), JSON.parse(fs.readFileSync(path.join(d, 'pauline-releve.json'), 'utf8')).releve.courriels.map(c => c.id)], ['elague', ['recent']]);
    v('…et la date de réception n’a pas bougé', M.lire().recuLe, maint);
    horloge = maint + 91 * J;
    v('⛔ plus de 90 jours sans relevé : le fichier entier s’efface (noms, adresses, textes)', [M.purger(), fs.existsSync(path.join(d, 'pauline-releve.json')), M.lire().etat], ['efface', false, 'vide']);
    fs.writeFileSync(path.join(d, 'pauline-releve.json'), '{ cassé');
    v('⛔ un fichier illisible n’est jamais touché par l’élagage', [M.purger(), fs.readFileSync(path.join(d, 'pauline-releve.json'), 'utf8')], ['illisible', '{ cassé']);
  }

  console.log('\n2. Le code : ce que les motifs d’ailleurs ne voient pas');
  const SRC = fs.readFileSync(path.join(RACINE, 'server', 'pauline.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('(population) le code du module est lu', SRC.length > 3000);
  vrai('⛔ le jeton se compare par timingSafeEqual, sur des EMPREINTES de même longueur — jamais par ===', /crypto\.timingSafeEqual\(vue, attendue\)/.test(SRC) && !/jeton\s*[!=]==|[!=]==\s*jeton|\.jetonSha256\s*[!=]==|[!=]==\s*attendue\b(?!\.)/.test(SRC));
  vrai('⛔ la route de relevé vérifie le jeton AVANT d’appeler le lecteur de corps (le lecteur est après la garde dans la liste des gestionnaires)', /app\.post\('\/api\/pauline\/releve', \(req, res, next\) => \{[\s\S]*?jetonValide\(req, attendue\)[\s\S]*?\}, json, \(req, res\)/.test(SRC));
  vrai('la lecture de la Tour est au patron seul (monPatronStrict), pas à un simple connecté', /app\.get\('\/api\/monitor\/pauline', monPatronStrict,/.test(SRC));
  vrai('⛔ aucun console.* du module ne cite le relevé, une entreprise ou un courriel', (SRC.match(/console\.(?:log|error|warn|info)\([^;]*\);/g) || []).every(l => !/releve|entreprise|courriel|corps|body|\.nom|\.email|\.texte|\.objet/i.test(l.replace(/'[^']*'/g, ''))));
  const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ index.js écarte la route du plafond global de 6 Mo (sinon un corps de 2,5 Mo serait lu avant la garde)', /CHEMIN_PAULINE\.test\(req\.path\)\) \? next\(\) : jsonCourant/.test(IDX));
  vrai('index.js monte le pont', /require\('\.\/pauline'\)\(app, \{ config, DATA_DIR, monPatronStrict(?:, pousseNotif: pousseNotifPauline)?(?:, surReleve: \(releve, dec\) => \{[^}]*\})? \}\)/.test(IDX));
  const ACORS = /Access-Control-Allow-Origin/.test(SRC);
  vrai('aucune origine CORS pour le pont (le Mac n’est pas un navigateur)', !ACORS);

  const SAUT = !fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'));
  if (SAUT) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const { demarrer, dormir } = require('./banc-serveur-gestion.js');
  const KEK_A = crypto.randomBytes(32).toString('hex'), KEK_B = crypto.randomBytes(32).toString('hex');
  const brut = async (S, methode, route, entetes, corps) => { const r = await fetch(S.B + route, { method: methode, headers: entetes || {}, body: corps }); const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {}, txt, h: r.headers }; };
  let adr = 0;
  const poster = (S, jeton, corps, ip) => brut(S, 'POST', '/api/pauline/releve', Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': ip || ('10.120.' + ((++adr >> 8) & 255) + '.' + (adr & 255)) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), typeof corps === 'string' ? corps : JSON.stringify(corps));
  const sansFuite = (S, quoi) => { const j = S.journal(); return FUITES.concat([JETON, EMPREINTE, 'dérat']).filter(f => j.includes(f)); };

  console.log('\n3. Le vrai serveur, pont NON configuré');
  {
    const S = await demarrer({});
    vrai('le serveur démarre', S.vivant, S.journal().slice(-300));
    if (S.vivant) {
      const a = await poster(S, JETON, releve());
      v('⛔ POST sans empreinte configurée : 503 « pont non configuré », avec ou sans jeton', [a.s, a.j.error, (await poster(S, '', releve())).s], [503, 'pont non configuré', 503]);
      const g = await S.get('/api/monitor/pauline');
      v('la Tour lit « rien reçu » : 200 et recuLe null (pas une erreur, pas un relevé vide)', [g.s, g.j.ok, g.j.recuLe, 'releve' in g.j], [200, true, null, false]);
      v('⛔ collaborateur et anonyme : 403', [(await S.get('/api/monitor/pauline', S.TA)).s, (await S.get('/api/monitor/pauline', '')).s], [403, 403]);
      v('aucun fichier n’a été écrit', fs.existsSync(path.join(S.D, 'pauline-releve.json')), false);
    }
    await S.fin();
  }

  console.log('\n4. Le vrai serveur, pont configuré (sans clé maître)');
  let S2;
  {
    S2 = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } } });
    const S = S2;
    vrai('le serveur démarre', S.vivant, S.journal().slice(-300));
    if (S.vivant) {
      v('⛔ sans en-tête Authorization : 401', (await poster(S, '', releve())).s, 401);
      v('⛔ mauvais jeton : 401', (await poster(S, JETON + 'x', releve())).s, 401);
      v('⛔ l’EMPREINTE présentée comme jeton : 401 (qui lit la configuration n’a pas le jeton)', (await poster(S, EMPREINTE, releve())).s, 401);
      v('un schéma autre que Bearer : 401', (await brut(S, 'POST', '/api/pauline/releve', { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('a:' + JETON).toString('base64') }, JSON.stringify(releve()))).s, 401);
      v('⛔ un jeton trop court ou aux caractères étranges : 401', [(await poster(S, 'abc', releve())).s, (await poster(S, 'a'.repeat(400), releve())).s], [401, 401]);
      const enorme = releve(); enorme.courriels[0].texte = 'x'.repeat(2500000);
      v('⛔ 2,5 Mo avec un MAUVAIS jeton : 401 — le corps n’est pas lu pour un inconnu', (await poster(S, JETON + 'x', enorme)).s, 401);
      const gros = await poster(S, JETON, enorme);
      v('⛔ 2,5 Mo avec le bon jeton : 413 (le plafond de la route, pas les 6 Mo du reste du serveur)', gros.s, 413);
      v('un corps qui n’est pas du JSON : 400', (await poster(S, JETON, '{ pas du json')).s, 400);
      v('un corps JSON de la mauvaise forme : 400 et un motif sans valeur du corps', (await poster(S, JETON, { version: 1, genereLe: 'Zébulon-valeur-du-corps' })).j.motif, 'genereLe absent ou illisible');
      const m400 = await poster(S, JETON, [1, 2]);
      v('un tableau au lieu d’un objet : 400', [m400.s, m400.j.error], [400, 'relevé refusé']);
      v('(rien n’a encore été rangé par un relevé refusé)', (await S.get('/api/monitor/pauline')).j.recuLe, null);

      const bon = await poster(S, JETON, releve());
      v('un relevé juste : 200 et seulement des nombres dans la réponse', [bon.s, bon.j.ok, bon.j.recu, bon.j.ecartes], [200, true, { entreprises: 2, courriels: 1, recherches: 1, reponses: 1 }, { entreprises: 0, courriels: 0, recherches: 0, reponses: 0, tronque: [] }]);
      vrai('…et la réponse ne cite aucun prospect', !FUITES.some(f => bon.txt.includes(f)));
      const g = await S.get('/api/monitor/pauline');
      v('le patron relit le relevé', [g.s, g.j.ok, g.j.releve.entreprises.map(e => e.id), g.j.releve.courriels[0].texte, g.j.releve.reponses[0].nature, g.j.releve.chauffe.plafondDuJour], [200, true, ['c1', 'c2'], TEXTE, 'interesse', 7]);
      vrai('…avec la date de réception (ISO) et un âge en secondes', typeof g.j.recuLe === 'string' && !isNaN(Date.parse(g.j.recuLe)) && Number.isInteger(g.j.age) && g.j.age >= 0 && g.j.age < 60);
      vrai('…et jamais mis en cache', /no-store/.test((await brut(S, 'GET', '/api/monitor/pauline', { Authorization: 'Bearer ' + S.TP })).h.get('cache-control') || ''));
      const refusTA = await S.get('/api/monitor/pauline', S.TA);
      v('⛔ collaborateur et anonyme : 403, le relevé ne sort pas', [refusTA.s, (await S.get('/api/monitor/pauline', '')).s, FUITES.some(f => refusTA.txt.includes(f))], [403, 403, false]);
      const fichier = path.join(S.D, 'pauline-releve.json');
      vrai('le fichier existe, aux droits 600', fs.existsSync(fichier) && (fs.statSync(fichier).mode & 0o777) === 0o600, fs.existsSync(fichier) && (fs.statSync(fichier).mode & 0o777).toString(8));
      v('sans clé maître : écrit en clair (installation de test) — et le journal le DIT, une fois', [JSON.parse(fs.readFileSync(fichier, 'utf8')).chiffre, (S.journal().match(/clé maître absente — le relevé est écrit EN CLAIR/g) || []).length], [false, 1]);

      const second = releve(); second.entreprises = [second.entreprises[1]]; second.courriels = [];
      await poster(S, JETON, second);
      v('un second relevé REMPLACE le premier (instantané, pas flux)', (await S.get('/api/monitor/pauline')).j.releve.entreprises.map(e => e.id), ['c2']);

      const gr = releve();
      gr.entreprises = Array.from({ length: 600 }, (_, i) => ({ id: 'e' + i, nom: 'n' + i, ville: '', metier: '', etat: 'trouvee', majLe: iso(-i * 1000), pirate: 'x' }));
      gr.courriels = Array.from({ length: 400 }, (_, i) => ({ id: 'o' + i, entrepriseId: 'e1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-i * 1000) }));
      gr.recherches = Array.from({ length: 150 }, (_, i) => ({ quand: iso(-i * 1000), metier: 'm', ville: 'v', trouvees: i }));
      gr.reponses = Array.from({ length: 400 }, (_, i) => ({ entrepriseId: 'e1', quand: iso(-i * 1000), resume: 'r', nature: 'autre' }));
      const pl = await poster(S, JETON, gr);
      v('⛔ plafonds sur le vrai serveur : 500 · 300 · 100 · 300, et la réponse dit ce qui a été tronqué', [pl.s, pl.j.recu, pl.j.ecartes.tronque.sort()], [200, { entreprises: 500, courriels: 300, recherches: 100, reponses: 300 }, ['courriels', 'entreprises', 'recherches', 'reponses']]);
      const lu = (await S.get('/api/monitor/pauline')).j.releve;
      v('…et ce qui est relu est plafonné aussi, sans la clé inconnue', [lu.entreprises.length, lu.courriels.length, lu.recherches.length, lu.reponses.length, 'pirate' in lu.entreprises[0]], [500, 300, 100, 300, false]);

      const el2 = releve();
      el2.courriels = [{ id: 'vieux', entrepriseId: 'c1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-91 * J) }, { id: 'recent', entrepriseId: 'c1', etat: 'envoye', objet: 'o', texte: 't', quand: iso(-89 * J) }];
      el2.recherches = [{ quand: iso(-120 * J), metier: 'a', ville: 'b', trouvees: 1 }, { quand: iso(-2 * J), metier: 'a', ville: 'b', trouvees: 1 }];
      el2.reponses = [{ entrepriseId: 'c1', quand: iso(-100 * J), resume: 'r', nature: 'autre' }];
      const pe = await poster(S, JETON, el2);
      const l2 = (await S.get('/api/monitor/pauline')).j.releve;
      v('⛔ élagage à 90 jours sur le vrai serveur : le courriel de 91 jours, la recherche de 120 et la réponse de 100 s’en vont', [pe.j.recu, l2.courriels.map(c => c.id), l2.recherches.length, l2.reponses.length], [{ entreprises: 2, courriels: 1, recherches: 1, reponses: 0 }, ['recent'], 1, 0]);

      /* l'anti-abus : par adresse (req.ip), huit par minute */
      const ip = '10.99.7.7', r = [];
      for (let i = 0; i < 10; i++) r.push((await poster(S, JETON + 'x', releve(), ip)).s);
      v('⛔ huit tentatives par minute et par adresse (mauvais jeton compris) : la 9ᵉ et la 10ᵉ sont refusées en 429', r, [401, 401, 401, 401, 401, 401, 401, 401, 429, 429]);
      v('…et une AUTRE adresse n’est pas touchée', (await poster(S, JETON, releve(), '10.99.7.8')).s, 200);
      const un429 = await poster(S, JETON, releve(), ip);
      vrai('…avec un Retry-After', un429.s === 429 && un429.h.get('retry-after') === '60');
      v('⛔ l’en-tête X-Forwarded-For de CLIENT ne donne pas une clé neuve à chaque requête (nginx est seul à y écrire ; un seul intermédiaire de confiance)',
        (await brut(S, 'POST', '/api/pauline/releve', { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4, ' + ip, Authorization: 'Bearer ' + JETON }, JSON.stringify(releve()))).s, 429);

      v('⛔ AUCUNE donnée de prospect, ni le jeton, ni son empreinte, dans le journal du serveur', sansFuite(S), []);
      vrai('(population) le journal n’est pas vide : on a bien regardé quelque chose', S.journal().length > 40, S.journal());
    }
    await S.fin();
  }

  console.log('\n5. Le fichier chiffré, la clé fausse, l’écriture refusée');
  let fichierChiffre = null;
  {
    const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } }, env: { TEAMOP_KEK: KEK_A } });
    vrai('le serveur démarre avec une clé maître', S.vivant, S.journal().slice(-300));
    if (S.vivant) {
      const bon = await poster(S, JETON, releve());
      v('un relevé accepté', bon.s, 200);
      const f = path.join(S.D, 'pauline-releve.json'), txt = fs.readFileSync(f, 'utf8');
      v('⛔ le fichier est CHIFFRÉ (chiffre: true) et rien de lisible n’y figure', [JSON.parse(txt).chiffre, FUITES.some(x => txt.includes(x)) || txt.includes('dératisation') || txt.includes('Niort')], [true, false]);
      v('droits 600', (fs.statSync(f).mode & 0o777).toString(8), '600');
      const g = await S.get('/api/monitor/pauline');
      v('la Tour le relit en clair (la clé est là)', [g.s, g.j.releve.entreprises[0].nom, g.j.releve.courriels[0].texte], [200, NOM, TEXTE]);
      vrai('le journal ne dit PAS « en clair »', !/EN CLAIR/.test(S.journal()));
      v('⛔ aucune donnée de prospect dans le journal (clé maître posée)', sansFuite(S), []);
      fichierChiffre = txt;
    }
    await S.fin();
  }
  {
    const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } }, env: { TEAMOP_KEK: KEK_B }, avant: D => { if (fichierChiffre) fs.writeFileSync(path.join(D, 'pauline-releve.json'), fichierChiffre); } });
    vrai('le serveur démarre avec une AUTRE clé maître', S.vivant, S.journal().slice(-300));
    if (S.vivant) {
      const g = await S.get('/api/monitor/pauline');
      v('⛔ clé fausse : la Tour reçoit 503 (« on ne sait pas »), jamais « rien reçu »', [g.s, 'releve' in g.j, g.j.recuLe === null, /clé maître/.test(g.j.error || '')], [503, false, false, true]);
      vrai('…sans rien dire du contenu', !FUITES.some(f => JSON.stringify(g.j).includes(f)));
      const bon = await poster(S, JETON, releve());
      v('le relevé suivant remplace le fichier illisible (c’est un instantané : la Mac renvoie tout)', [bon.s, (await S.get('/api/monitor/pauline')).s], [200, 200]);
    }
    await S.fin();
  }
  {
    const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } }, avant: D => { fs.mkdirSync(path.join(D, 'pauline-releve.json')); } });
    vrai('le serveur démarre, le fichier du pont étant impossible à écrire', S.vivant, S.journal().slice(-300));
    if (S.vivant) {
      const e = await poster(S, JETON, releve());
      v('⛔ écriture refusée : 500 « relevé non écrit » (jamais un faux succès), sans donnée dans la réponse', [e.s, e.j.error, FUITES.some(f => e.txt.includes(f))], [500, 'relevé non écrit', false]);
      const g = await S.get('/api/monitor/pauline');
      v('⛔ la lecture dit 503 (illisible), pas « rien reçu »', [g.s, g.j.recuLe === undefined], [503, true]);
      v('⛔ le journal de l’échec ne cite aucun prospect', sansFuite(S), []);
      vrai('…et dit l’échec par un code, sans le chemin des données', /pauline : relevé non écrit \(\w+\)/.test(S.journal()), S.journal().slice(-300));
    }
    await S.fin();
  }
  {
    const S = await demarrer({ config: { pauline: { jetonSha256: 'pas-une-empreinte' } } });
    if (S.vivant) {
      v('⛔ une empreinte mal formée ferme le pont (503), elle ne le laisse pas ouvert à tout jeton', [(await poster(S, 'pas-une-empreinte', releve())).s, (await poster(S, JETON, releve())).s], [503, 503]);
      vrai('…et le journal le dit sans citer la valeur', /jetonSha256 mal formée/.test(S.journal()) && !S.journal().includes('pas-une-empreinte'), S.journal().slice(-200));
    }
    await S.fin();
  }

  console.log('\n6. Le script du Mac');
  const py = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  if (py.status !== 0) console.log('  … SAUTÉ : python3 absent');
  else {
    const t = spawnSync('python3', ['-I', path.join(__dirname, 'pauline-releve-test.py')], { encoding: 'utf8', timeout: 120000 });
    const sortie = (t.stdout || '') + (t.stderr || '');
    const nb = (/Ran (\d+) tests/.exec(sortie) || [])[1];
    vrai('le banc Python du script passe (' + nb + ' contrôles : états, plafonds, base en lecture seule, aucun secret affiché, jeton, codes de sortie)', t.status === 0 && Number(nb) >= 20, sortie.slice(-600));
    ok += Number(nb) || 0;

    const pl = spawnSync('python3', ['-I', '-c', 'import plistlib,sys,json;d=plistlib.loads(sys.stdin.buffer.read());print(json.dumps(d))'], { input: fs.readFileSync(path.join(RACINE, 'outils', 'pauline-releve.plist'), 'utf8').replace(/__HARVEY__/g, '/Users/x/harvey'), encoding: 'utf8' });
    const pj = pl.status === 0 ? JSON.parse(pl.stdout) : {};
    v('le plist launchd est un plist valide : toutes les minutes (décisions de la Tour ; le relevé lui-même repart sur changement ou toutes les 14 minutes), au chargement, le journal dans data/, le dossier de Harvey en argument', [pj.StartInterval, pj.RunAtLoad, pj.ProgramArguments, pj.StandardOutPath], [60, true, ['/Users/x/harvey/.venv/bin/python', '/Users/x/harvey/outils/pauline-releve.py', '--harvey', '/Users/x/harvey'], '/Users/x/harvey/data/pauline-releve.log']);
    vrai('…et il ne contient aucun jeton ni aucune empreinte', !/[0-9a-f]{64}/.test(fs.readFileSync(path.join(RACINE, 'outils', 'pauline-releve.plist'), 'utf8')));
    const sh = spawnSync('bash', ['-n', path.join(RACINE, 'server', 'set-pauline.sh')], { encoding: 'utf8' });
    vrai('server/set-pauline.sh passe bash -n', sh.status === 0, sh.stderr);
    /* …et il SE JOUE : une configuration jetable, un systemctl et un curl de banc dans le PATH */
    const bacSh = fs.mkdtempSync(path.join(os.tmpdir(), 'pau-sh-')); tmp.push(bacSh);
    fs.mkdirSync(path.join(bacSh, 'bin'));
    fs.writeFileSync(path.join(bacSh, 'bin', 'systemctl'), '#!/bin/sh\necho redemarre >> "$0.appels"\n', { mode: 0o755 });
    fs.writeFileSync(path.join(bacSh, 'bin', 'curl'), '#!/bin/sh\necho \'{"ok":true}\'\n', { mode: 0o755 });
    const cfgSh = path.join(bacSh, 'config.json');
    const jouer = (entree, avant) => { if (avant) fs.writeFileSync(cfgSh, avant, { mode: 0o640 }); const r = spawnSync('bash', [path.join(RACINE, 'server', 'set-pauline.sh')], { input: entree, encoding: 'utf8', env: Object.assign({}, process.env, { PATH: path.join(bacSh, 'bin') + ':' + process.env.PATH, TEAMOP_CONFIG: cfgSh }) }); return { code: r.status, sortie: r.stdout + r.stderr, cfg: JSON.parse(fs.readFileSync(cfgSh, 'utf8')) }; };
    const emp = sha('autre-jeton');
    const a1 = jouer(emp.toUpperCase() + '\n', JSON.stringify({ a: 1 }));
    v('set-pauline.sh : une empreinte (même en MAJUSCULES) est rangée en minuscules, le reste de la configuration est gardé, les droits passent à 600, le serveur redémarre', [a1.code, a1.cfg, (fs.statSync(cfgSh).mode & 0o777).toString(8), fs.existsSync(path.join(bacSh, 'bin', 'systemctl.appels'))], [0, { a: 1, pauline: { jetonSha256: emp } }, '600', true]);
    const a2 = jouer('pas une empreinte\n', JSON.stringify({ a: 1, pauline: { jetonSha256: emp } }));
    v('⛔ set-pauline.sh : un texte qui n’est pas une empreinte est refusé (code 1) et la configuration reste intacte', [a2.code, a2.cfg, /Ce n.est pas une empreinte/.test(a2.sortie)], [1, { a: 1, pauline: { jetonSha256: emp } }, true]);
    const a3 = jouer('abcd\n', JSON.stringify({ a: 1 }));
    v('⛔ …même une empreinte trop courte', [a3.code, a3.cfg], [1, { a: 1 }]);
    const a4 = jouer('retirer\n', JSON.stringify({ a: 1, pauline: { jetonSha256: emp } }));
    v('set-pauline.sh : « retirer » ferme le pont (le champ disparaît, le reste reste)', [a4.code, a4.cfg], [0, { a: 1 }]);
    const a5 = jouer('\n', JSON.stringify({ a: 1 }));
    v('set-pauline.sh : Entrée seule ne change rien', [a5.code, a5.cfg, /Rien n.a été changé/.test(a5.sortie)], [0, { a: 1 }, true]);
    vrai('…et la question qu’il pose est celle de l’EMPREINTE (jamais « le jeton » seul)', /read [^\n]*Empreinte SHA-256/.test(fs.readFileSync(path.join(RACINE, 'server', 'set-pauline.sh'), 'utf8')));
    const dos = fs.mkdtempSync(path.join(os.tmpdir(), 'pau-mac-')); tmp.push(dos);
    const fab = spawnSync('python3', ['-I', path.join(__dirname, 'pauline-releve-test.py'), '--construire', dos], { encoding: 'utf8' });
    vrai('(population) la fausse base de Harvey est construite', fab.status === 0 && fs.existsSync(path.join(dos, 'data', 'harvey.db')), fab.stderr);
    fs.writeFileSync(path.join(dos, '.env'), 'TEAMOP_RELEVE_JETON=' + JETON + '\n', { mode: 0o600 });
    const script = path.join(RACINE, 'outils', 'pauline-releve.py');
    const essai = spawnSync('python3', ['-I', script, '--essai', '--harvey', dos], { encoding: 'utf8' });
    vrai('--essai produit un relevé', essai.status === 0, essai.stderr);
    const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } } });
    if (S.vivant && essai.status === 0) {
      const direct = await poster(S, JETON, essai.stdout);
      v('⛔ LA COUTURE : le relevé que fabrique le script est accepté par le vrai serveur SANS UNE LIGNE ÉCARTÉE ni tronquée', [direct.s, direct.j.ecartes], [200, { entreprises: 0, courriels: 0, recherches: 0, reponses: 0, tronque: [] }]);
      const mac = JSON.parse(essai.stdout);
      v('…avec toute la population : 7 entreprises, 7 courriels, 3 recherches de découverte plus un cycle, 2 réponses', [direct.j.recu.entreprises, direct.j.recu.courriels, direct.j.recu.recherches, direct.j.recu.reponses], [7, 7, mac.recherches.length, 2]);
      const reel = spawnSync('python3', ['-I', script, '--harvey', dos, '--url', S.B + '/api/pauline/releve'], { encoding: 'utf8', timeout: 60000 });
      v('l’envoi réel du script (jeton lu dans .env) : code 0, « Relevé envoyé »', [reel.status, /Relevé envoyé/.test(reel.stdout)], [0, true]);
      vrai('…et le jeton n’apparaît ni sur la sortie ni sur l’erreur', !(reel.stdout + reel.stderr).includes(JETON));
      const g = (await S.get('/api/monitor/pauline')).j;
      v('la Tour voit ce que Pauline a envoyé : les cinq états d’entreprise, les quatre états de courriel', [[...new Set(g.releve.entreprises.map(e => e.etat))].sort(), [...new Set(g.releve.courriels.map(c => c.etat))].sort()],
        [['a_repondu', 'courriel_pret', 'envoye', 'refus', 'trouvee'], ['en_attente', 'envoye', 'refuse', 'repondu']]);
      fs.writeFileSync(path.join(dos, '.env'), 'TEAMOP_RELEVE_JETON=' + JETON + 'faux\n');
      await dormir(100);
      const mauvais = spawnSync('python3', ['-I', script, '--harvey', dos, '--url', S.B + '/api/pauline/releve'], { encoding: 'utf8', timeout: 60000 });
      v('⛔ un mauvais jeton dans .env : le script sort en 5 et le dit sans afficher le jeton', [mauvais.status, /refuse le jeton/.test(mauvais.stderr), (mauvais.stdout + mauvais.stderr).includes('faux')], [5, true, false]);
      v('⛔ rien de ce qui a été envoyé n’est dans le journal du serveur', sansFuite(S).filter(f => f !== 'dérat'), []);
    }
    await S.fin();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort :', e && e.stack || e); process.exit(1); });
