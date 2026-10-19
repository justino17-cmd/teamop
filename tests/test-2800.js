/* ⛔ CE QUE CE FICHIER GARDE — LA SIGNATURE MAISON (moteur interne d'OP Courrier), RÈGLE PAR RÈGLE, AVEC UNE HORLOGE TRUQUÉE
   Justin, 19 octobre 2026 : « on arrête Yousign, on crée le nôtre ». Le service est monté EN PROCESSUS (`creerApp` : le vrai moteur, la vraie base, les vrais
   routes), avec un faux OP GESTION et un canal de code qui NOTE ce qu'on lui demande d'envoyer ; l'horloge est la nôtre, donc « 10 minutes plus tard » est
   instantané. On y joue : le parcours complet (deux signataires + la contre-signature du pro, dans l'ordre), le code à usage unique (60 s entre deux envois,
   5 envois, 5 essais, 10 minutes), le lien (ne se retient pas, un nouveau remplace l'ancien, l'annulation le tue, l'échéance le tue), l'ordre, les refus uniformes,
   le dossier de preuve (le document n'est JAMAIS modifié, son empreinte est au certificat, le journal chaîné se vérifie et un journal altéré se DIT), et la
   confidentialité du journal d'exploitation (ni adresse, ni nom, ni code, ni lien).
   Le branchement RÉEL (processus, SMTP, page, en-têtes) est dans `test-2801`. Contre-épreuves : scratchpad/courrier/mutations-signature-maison.py. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => v(t + (d !== undefined && !a ? ' — ' + String(d).slice(0, 200) : ''), !!a, true);
const F = require('./courrier-faux');

if (!fs.existsSync(path.join(F.RACINE, 'node_modules', 'express')) || !fs.existsSync(path.join(F.RACINE, 'node_modules', 'nodemailer'))) { console.log('  (sauté : server-courrier/node_modules manque — npm ci --prefix server-courrier)'); console.log('\n0 ✓  0 ✗'); process.exit(0); }
const { creerApp } = require(path.join(F.RACINE, 'index.js'));
const chaine = require(path.join(F.RACINE, 'chaine.js'));

const T_A = 'a'.repeat(48), T_B = 'b'.repeat(48);
const MAIL_C = 'claire.dubois@exemple.fr', MAIL_P = 'paul.martin@exemple.fr', MAIL_ME = 'justin.moi@exemple.fr';
const MIN = 60000;

(async () => {
  const gestion = await F.fauxGestion();
  gestion.ajouter(T_A, { id: 'p1', nom: 'Justin', role: 'patron' });
  gestion.ajouter(T_B, { id: 'p2', nom: 'Autre Patron', role: 'patron' });
  let t = Date.parse('2026-10-19T10:00:00Z');
  const horloge = () => t;
  const boite = [];                       // ce que le canal « e-mail » a été prié d'envoyer
  let pannes = 0;                          // nombre d'envois à faire échouer
  const canaux = { email: async (m) => { if (pannes > 0) { pannes--; throw new Error('SMTP en panne'); } boite.push(Object.assign({}, m)); } };
  const lignes = [];                       // le journal d'exploitation, tel que le service l'écrit
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-2800-'));
  const config = { instance: 'beta', kek: crypto.randomBytes(32), data: path.join(dir, 'data'), port: 0, sha: '', origines: ['https://teamop.fr'], gestion: { url: gestion.url, timeoutMs: 1500 },
    yousign: { cleApi: '', secretWebhook: '', sandbox: true, urlApi: '' }, signature: { moteur: 'interne', urlPublique: 'https://courrier.exemple.test', smtp: null },
    retentionJours: 90, retentionAnnuleJours: 30, brouillonJours: 7, quotas: { lecture: { max: 40, fenetreMs: MIN } } };
  const S = creerApp({ config, horloge, canaux, journal: (evt, champs) => lignes.push(JSON.stringify(Object.assign({ evt }, champs))) });
  const serveur = await new Promise((r) => { const s = S.app.listen(0, '127.0.0.1', () => r(s)); });
  const base = 'http://127.0.0.1:' + serveur.address().port;

  async function req(methode, chemin, o = {}) {
    const h = Object.assign({}, o.headers || {}); if (o.token) h.Authorization = 'Bearer ' + o.token;
    let body = o.body; if (o.json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.json); }
    const r = await fetch(base + chemin, { method: methode, headers: h, body });
    const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString()); } catch (e) { /* pas du JSON */ }
    return { s: r.status, j, buf, h: r.headers };
  }
  const pdf = (m) => F.PDF(m || 'doc');
  const demande = (extra) => Object.assign({ titre: 'Contrat de maintenance 2027', expediteur: 'Justin · contact@teamop.fr', niveau: 'simple', jours: 15, relances: true,
    signataires: [{ nom: 'Claire Dubois', email: MAIL_C }, { nom: 'Paul Martin', email: MAIL_P }], contresignature: { nom: 'Justin Moi', email: MAIL_ME } }, extra || {});
  async function ouvrirDemande(extra, original) {
    let r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande(extra) });
    if (r.s !== 201) return { r };
    const id = r.j.id, doc = original || pdf('contrat');
    await req('PUT', '/api/signature/demandes/' + id + '/documents?nom=Contrat.pdf', { token: T_A, body: doc, headers: { 'Content-Type': 'application/pdf' } });
    const a = await req('POST', '/api/signature/demandes/' + id + '/activer', { token: T_A });
    return { r: a, id, doc, liens: (a.j && a.j.liens) || [] };
  }
  const jeton = (l) => l.url.split('/signer/')[1];
  const lire = (j) => req('GET', '/api/signer/' + j);
  const code = (j) => req('POST', '/api/signer/' + j + '/code', { json: {} });
  const signer = (j, c, o = {}) => req('POST', '/api/signer/' + j + '/signer', { json: Object.assign({ code: c, consentement: true, version: '2026-10-19-1' }, o) });
  const dernierCode = () => boite.length ? boite[boite.length - 1].code : null;
  const vue = async (id) => (await req('GET', '/api/signature/demandes/' + id, { token: T_A })).j;

  console.log('\n── 1. La création : un canal qu\'on n\'a pas est refusé AVANT d\'enregistrer quoi que ce soit ──');
  let r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande({ niveau: 'avance', signataires: [{ nom: 'Claire Dubois', email: MAIL_C, telephone: '06 12 34 56 78' }], contresignature: undefined }) });
  v('« Code SMS » : refusé (pas de fournisseur de SMS), le message dit lequel', [r.s, r.j.error, r.j.niveau], [400, 'canal_indisponible', 'avance']);
  v('…et rien n\'a été enregistré', (await req('GET', '/api/signature/demandes', { token: T_A })).j.demandes.length, 0);

  console.log('\n── 2. Le parcours complet : deux signataires, puis la contre-signature du pro ──');
  const A = await ouvrirDemande();
  v('activer : 200, trois liens (deux signataires + la contre-signature), UNE seule fois', [A.r.s, A.liens.length, A.liens.map((l) => l.n), A.liens.map((l) => !!l.contre)], [200, 3, [1, 2, 3], [false, false, true]]);
  vrai('chaque lien porte l\'adresse publique + 43 signes', A.liens.every((l) => /^https:\/\/courrier\.exemple\.test\/signer\/[A-Za-z0-9_-]{43}$/.test(l.url)));
  vrai('les trois liens sont différents', new Set(A.liens.map((l) => l.url)).size === 3);
  v('à l\'activation, AUCUN courriel n\'est parti du service (les liens partent par la boîte du pro, par la Tour)', boite.length, 0);
  const rec = await vue(A.id);
  v('la demande est « en attente » ; on ne relit JAMAIS les liens dans la fiche', [rec.etat, rec.liens], ['en_attente', undefined]);
  v('relire la demande rend les mêmes signataires, sans lien', rec.signataires.map((s) => Object.keys(s).sort().join(',')), ['contre,email,etat,n,nom', 'contre,email,etat,n,nom', 'contre,email,etat,n,nom']);
  const [L1, L2, L3] = A.liens.map(jeton);

  r = await lire(L1);
  v('le signataire 1 ouvre son lien : « à signer »', [r.s, r.j.etat, r.j.titre, r.j.signataire.nom], [200, 'a_signer', 'Contrat de maintenance 2027', 'Claire Dubois']);
  vrai('…l\'adresse de destination est MASQUÉE (jamais l\'adresse entière)', r.j.signataire.destination === 'c***@exemple.fr' && !JSON.stringify(r.j).includes(MAIL_C), r.j.signataire.destination);
  v('…le texte de consentement est celui de la VERSION qu\'il devra renvoyer', [r.j.consentement.version, /Contrat de maintenance 2027/.test(r.j.consentement.texte), /signature électronique simple/.test(r.j.consentement.texte)], ['2026-10-19-1', true, true]);
  v('…un document est proposé', r.j.documents.map((d) => d.nom), ['Contrat.pdf']);
  v('ouvrir le lien fait passer la demande à « ouvert » (côté expéditeur)', (await vue(A.id)).etat, 'ouvert');
  r = await req('GET', '/api/signer/' + L1 + '/documents/1');
  vrai('le PDF à lire est EXACTEMENT celui qu\'on a déposé', r.s === 200 && r.h.get('content-type') === 'application/pdf' && Buffer.compare(r.buf, A.doc) === 0);
  v('un numéro de document qui n\'existe pas : 404', (await req('GET', '/api/signer/' + L1 + '/documents/9')).s, 404);

  r = await signer(L1, '123456');
  v('signer SANS avoir demandé de code : refusé « code_requis »', [r.s, r.j.error], [400, 'code_requis']);
  r = await code(L1);
  v('demander le code : 200, destination masquée, délai de renvoi 60 s', [r.s, r.j.envoye, r.j.destination, r.j.renvoiS], [200, true, 'c***@exemple.fr', 60]);
  v('…UN courriel est parti, à la bonne adresse, avec un code à 6 chiffres', [boite.length, boite[0].destination, /^\d{6}$/.test(boite[0].code)], [1, MAIL_C, true]);
  const c1 = dernierCode();
  r = await code(L1);
  v('redemander tout de suite : 429 « trop tôt » avec le temps à attendre', [r.s, r.j.error, r.j.attenteS > 0], [429, 'trop_tot', true]);
  v('…et AUCUN second courriel n\'est parti', boite.length, 1);
  r = await signer(L1, c1, { consentement: false });
  v('signer sans cocher le consentement : refusé', [r.s, r.j.error], [400, 'consentement_requis']);
  r = await signer(L1, c1, { version: 'ancienne' });
  v('signer avec un texte de consentement d\'une autre version : refusé', [r.s, r.j.error], [400, 'consentement_obsolete']);
  const faux = c1 === '000000' ? '111111' : '000000';
  r = await signer(L1, faux);
  v('un mauvais code : refusé, avec le nombre d\'essais qui restent', [r.s, r.j.error, r.j.restants], [400, 'code_incorrect', 4]);
  r = await signer(L1, 'abcdef');
  v('un code qui n\'a pas 6 chiffres compte aussi comme un essai', [r.s, r.j.error, r.j.restants], [400, 'code_incorrect', 3]);
  r = await signer(L1, c1);
  v('le BON code (après deux essais ratés) : signé, pas encore terminé', [r.s, r.j.signe, r.j.termine], [200, true, false]);
  r = await signer(L1, c1);
  v('rejouer le même code : refusé (déjà signé, un code ne sert qu\'une fois)', [r.s, r.j.error, r.j.etat], [409, 'pas_possible', 'signe']);
  r = await lire(L1);
  v('le lien dit maintenant « vous avez signé »', [r.j.etat, r.j.documents.length > 0], ['signe', true]);
  v('la demande reste « ouvert » : un seul des deux a signé', (await vue(A.id)).etat, 'ouvert');

  console.log('\n── 3. La contre-signature : le pro signe EN DERNIER ──');
  r = await lire(L3);
  v('le pro ouvre SON lien trop tôt : « attente des autres »', [r.j.etat, r.j.documents.length > 0], ['attente_autres', true]);
  r = await code(L3);
  v('…et il ne peut pas demander de code', [r.s, r.j.error, r.j.etat], [409, 'pas_possible', 'attente_autres']);
  boite.length = 0;
  await code(L2); const c2 = dernierCode();
  r = await signer(L2, c2);
  v('le signataire 2 signe : la demande passe « à contresigner »', [r.s, r.j.termine, (await vue(A.id)).etat], [200, false, 'a_contresigner']);
  r = await lire(L3);
  v('le lien du pro devient « à signer »', r.j.etat, 'a_signer');
  t += 61000;
  await code(L3); const c3 = dernierCode();
  vrai('le code du pro est parti à SON adresse', boite[boite.length - 1].destination === MAIL_ME);
  r = await signer(L3, c3);
  v('le pro contresigne : terminé', [r.s, r.j.signe, r.j.termine], [200, true, true]);
  const fin = await vue(A.id);
  v('la demande est « signé », avec son document et ses trois dossiers de preuve', [fin.etat, fin.documents[0].signe, fin.preuves], ['signe', true, 3]);
  r = await req('GET', '/api/signature/demandes/' + A.id + '/documents/1/signe', { token: T_A });
  vrai('le « document signé » est le PDF d\'origine, OCTET POUR OCTET (jamais modifié)', r.s === 200 && Buffer.compare(r.buf, A.doc) === 0);
  v('…nommé « (signé).pdf »', /Contrat%20\(sign%C3%A9\)\.pdf$/.test(r.h.get('content-disposition') || ''), true);

  console.log('\n── 4. Le dossier de preuve (certificat) ──');
  r = await req('GET', '/api/signature/demandes/' + A.id + '/preuves/2', { token: T_A });
  const cert = r.buf.toString('latin1');
  vrai('un vrai PDF : en-tête, fin de fichier, table des références', r.s === 200 && cert.startsWith('%PDF-1.4') && cert.includes('%%EOF') && /startxref\n\d+\n%%EOF/.test(cert));
  const sha = crypto.createHash('sha256').update(A.doc).digest('hex');
  vrai('…l\'empreinte SHA-256 du document d\'origine y est', cert.includes(sha));
  vrai('…les trois signataires y sont (nom, adresse, canal)', ['Claire Dubois', 'Paul Martin', 'Justin Moi', MAIL_C, MAIL_P, MAIL_ME].every((s) => cert.includes(s)));
  vrai('…le texte de consentement et sa version y sont', cert.includes('2026-10-19-1') && cert.includes('signature \xe9lectronique simple'));
  vrai('…le dossier est celui du signataire 2 (focus)', cert.includes('signataire n\xb02 : Paul Martin'));
  vrai('…le journal est dit INTÈGRE et le sceau est présent', cert.includes('int\xe8gre') && /Sceau de la demande/.test(cert));
  vrai('…il dit ce qu\'il N\'ATTESTE PAS (ni avancée ni qualifiée) et ne l\'affirme jamais', /n'est ni une signature avanc\xe9e ni une signature qualifi\xe9e/.test(cert) && !/signature (avanc\xe9e|qualifi\xe9e) (de|d'|conforme|au sens)/.test(cert.replace(/n'est ni une signature avanc\xe9e ni une signature qualifi\xe9e/g, '')));
  vrai('…aucune adresse de lien ni code à 6 chiffres dans le certificat', !/signer\/[A-Za-z0-9_-]{43}/.test(cert) && ![c1, c2, c3].some((c) => cert.includes('(' + c + ')') || cert.includes(' ' + c + ' ')));
  v('une preuve qui n\'existe pas : 404', (await req('GET', '/api/signature/demandes/' + A.id + '/preuves/9', { token: T_A })).s, 404);
  const ev = JSON.parse(S.stockage.pieceLire(A.id, 'ev').toString('utf8'));
  v('le journal chaîné se vérifie de bout en bout', chaine.verifier(ev.journal).ok, true);
  const rangs = ev.journal.map((e) => e.evt);
  v('…et il raconte tout, dans l\'ordre (création, documents, signataires, activation, ouvertures, codes, signatures, fin)', [rangs[0], rangs.includes('activee'), rangs.filter((x) => x === 'signe').length, rangs.filter((x) => x === 'code_refuse').length, rangs[rangs.length - 1]], ['creee', true, 3, 2, 'terminee']);
  const alt = JSON.parse(JSON.stringify(ev.journal)); alt[3].n = 99;
  v('modifier UNE ligne du journal casse la chaîne, et on sait à quel rang', chaine.verifier(alt), { ok: false, rang: 4 });
  const sans = ev.journal.slice(0, 2).concat(ev.journal.slice(3));
  v('retirer une ligne la casse aussi', chaine.verifier(sans).ok, false);
  const inter = ev.journal.slice(); [inter[1], inter[2]] = [inter[2], inter[1]];
  v('intervertir deux lignes la casse aussi', chaine.verifier(inter).ok, false);
  const evAltere = JSON.parse(JSON.stringify(ev)); evAltere.journal[2].canal = 'sms';
  S.stockage.pieceEcrire(A.id, 'ev', Buffer.from(JSON.stringify(evAltere)));
  vrai('le certificat rendu au patron est celui FIGÉ à la fin de la signature (une preuve ne se refabrique pas à chaque téléchargement)', Buffer.compare((await req('GET', '/api/signature/demandes/' + A.id + '/preuves/1', { token: T_A })).buf, (await req('GET', '/api/signature/demandes/' + A.id + '/preuves/1', { token: T_A })).buf) === 0);
  const certAlt = (await S.moteur.telechargerPreuve(A.id, 's1')).toString('latin1');
  vrai('un journal ALTÉRÉ sur le disque : le certificat qu\'on en refabrique le DIT (« ALTÉRÉ à la ligne … ne fait pas foi »)', certAlt.includes('ALT\xc9R\xc9') && certAlt.includes('ne fait pas foi'));
  S.stockage.pieceEcrire(A.id, 'ev', Buffer.from(JSON.stringify(ev)));
  vrai('…remis en état, le certificat refabriqué redit « intègre »', (await S.moteur.telechargerPreuve(A.id, 's1')).toString('latin1').includes('int\xe8gre'));

  console.log('\n── 5. Le code à usage unique : 60 s, 5 envois, 5 essais, 10 minutes ──');
  const B = await ouvrirDemande({ signataires: [{ nom: 'Léa Roux', email: 'lea.roux@exemple.fr' }], contresignature: undefined, titre: 'Devis <img src=x onerror=alert(1)>' });
  const LB = jeton(B.liens[0]);
  boite.length = 0;
  await code(LB); const b1 = dernierCode();
  t += 61000; r = await code(LB);
  v('60 s plus tard : un nouveau code part', [r.s, boite.length], [200, 2]);
  const b2 = dernierCode();
  r = await signer(LB, b1 === b2 ? '999999' : b1);
  v('l\'ANCIEN code ne vaut plus (le nouveau le remplace)', [r.s, r.j.error], b1 === b2 ? [400, 'code_incorrect'] : [400, 'code_incorrect']);
  for (let i = 0; i < 3; i++) { t += 61000; r = await code(LB); }
  v('le 5ᵉ envoi passe', [r.s, boite.length], [200, 5]);
  t += 61000; r = await code(LB);
  v('le 6ᵉ est refusé : « trop de codes » (le lien est à renvoyer par l\'expéditeur)', [r.s, r.j.error], [429, 'trop_de_codes']);
  v('…aucun courriel de plus', boite.length, 5);

  const C = await ouvrirDemande({ signataires: [{ nom: 'Hugo Petit', email: 'hugo.petit@exemple.fr' }], contresignature: undefined });
  const LC = jeton(C.liens[0]);
  await code(LC); const cc = dernierCode(); const mauvais = cc === '123456' ? '654321' : '123456';
  for (let i = 1; i <= 4; i++) { r = await signer(LC, mauvais); }
  v('quatre mauvais essais : il en reste un', [r.s, r.j.restants], [400, 1]);
  r = await signer(LC, mauvais);
  v('le 5ᵉ mauvais essai BLOQUE le code', [r.s, r.j.error], [429, 'code_bloque']);
  r = await signer(LC, cc);
  v('…même le BON code est refusé une fois bloqué', [r.s, r.j.error], [429, 'code_bloque']);
  t += 61000; await code(LC); const cn = dernierCode();
  r = await signer(LC, cn);
  v('un NOUVEAU code débloque (et signe)', [r.s, r.j.signe, r.j.termine], [200, true, true]);

  const D = await ouvrirDemande({ signataires: [{ nom: 'Ines Leroy', email: 'ines.leroy@exemple.fr' }], contresignature: undefined });
  const LD = jeton(D.liens[0]);
  await code(LD); const cd = dernierCode();
  t += 10 * MIN + 1000;
  r = await signer(LD, cd);
  v('un code de plus de 10 minutes : « expiré »', [r.s, r.j.error], [400, 'code_expire']);
  pannes = 1; t += 61000; r = await code(LD);
  v('le canal en panne : « envoi impossible », rien ne reste d\'un code qui n\'est pas parti', [r.s, r.j.error], [502, 'envoi_code_impossible']);
  const dEv = JSON.parse(S.stockage.pieceLire(D.id, 'ev').toString('utf8'));
  v('…et le journal le dit (code non parti)', dEv.journal.some((e) => e.evt === 'code_non_parti'), true);
  r = await code(LD);
  v('on peut réessayer tout de suite (le code qui n\'est pas parti ne bloque pas)', r.s, 200);

  console.log('\n── 6. Le lien : remplacé, annulé, expiré — et jamais deviné ──');
  const E = await ouvrirDemande({ signataires: [{ nom: 'Jean Moreau', email: 'jean.moreau@exemple.fr' }], contresignature: undefined });
  const LE = jeton(E.liens[0]);
  t += 11 * MIN;
  r = await req('POST', '/api/signature/demandes/' + E.id + '/relancer', { token: T_A });
  v('« relancer » : 200 et un NOUVEAU lien (le patron le renvoie par la boîte du pro)', [r.s, (r.j.liens || []).length, r.j.liens && r.j.liens[0].n], [200, 1, 1]);
  const LE2 = jeton(r.j.liens[0]);
  v('l\'ANCIEN lien est mort : même réponse qu\'un lien inconnu', [(await lire(LE)).s, (await lire(LE)).j], [404, { error: 'introuvable' }]);
  v('le nouveau lien marche', (await lire(LE2)).j.etat, 'a_signer');
  r = await req('POST', '/api/signature/demandes/' + E.id + '/annuler', { token: T_A });
  v('annuler la demande : « annulé »', [r.s, r.j.etat], [200, 'annule']);
  v('…le lien, même le nouveau, ne permet plus rien', [(await lire(LE2)).s, (await lire(LE2)).j.etat], [404, undefined]);

  const G = await ouvrirDemande({ signataires: [{ nom: 'Zoé Blanc', email: 'zoe.blanc@exemple.fr' }], contresignature: undefined, jours: 7 });
  const LG = jeton(G.liens[0]);
  await code(LG); const cg = dernierCode();
  t += 8 * 86400000;
  r = await lire(LG);
  v('après l\'échéance (7 jours) : le lien dit « expirée », sans document', [r.j.etat, r.j.documents.length], ['expiree', 0]);
  r = await signer(LG, cg);
  v('…et on ne peut plus signer, même avec un code encore dans la boîte', [r.s, r.j.error, r.j.etat], [409, 'pas_possible', 'expiree']);
  v('…le document ne se lit plus', (await req('GET', '/api/signer/' + LG + '/documents/1')).s, 404);
  await S.demandes.balayer();
  v('le ménage fait passer la demande à « expiré »', (await vue(G.id)).etat, 'expire');

  const inconnu = crypto.randomBytes(32).toString('base64url');
  const reps = [await lire(inconnu), await lire('x'.repeat(43)), await lire('court'), await req('GET', '/api/signer/' + inconnu + '/documents/1'), await code(inconnu), await signer(inconnu, '123456')];
  v('un lien inconnu, mal formé ou court : toujours 404 « introuvable », partout (on ne devine pas ce qui existe)', reps.map((x) => [x.s, x.j]).filter((x, i, a) => JSON.stringify(x) === JSON.stringify(a[0])).length, 6);
  vrai('…ni l\'ancien lien d\'une demande, ni un lien d\'une AUTRE demande n\'ouvre celle-ci', (await lire(L1)).j.titre === 'Contrat de maintenance 2027' && (await lire(LB)).j.titre.startsWith('Devis'));

  console.log('\n── 7. Ce que le service garde, et ce qu\'il écrit ──');
  const dB = JSON.parse(S.stockage.pieceLire(B.id, 'ev').toString('utf8'));
  vrai('le lien ne se retient pas : l\'état ne contient que son EMPREINTE (SHA-256), jamais le lien', JSON.stringify(dB).includes(crypto.createHash('sha256').update(LB).digest('hex')) && !JSON.stringify(dB).includes(LB));
  vrai('le code ne se retient pas non plus : on garde son HMAC, jamais les 6 chiffres', !JSON.stringify(dB).includes('"code"') && dB.signataires[0].otp && /^[0-9a-f]{64}$/.test(dB.signataires[0].otp.h));
  const octets = [];
  (function parcourir(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) parcourir(p); else octets.push(fs.readFileSync(p).toString('latin1')); } })(config.data);
  const tousLiens = [L1, L2, L3, LB, LC, LD, LE, LE2, LG];
  vrai('AUCUN lien en clair dans la base, le journal SQLite ni les pièces (' + octets.length + ' fichiers lus)', octets.length >= 6 && tousLiens.every((l) => !octets.some((o) => o.includes(l))));
  const shaLien = (l) => crypto.createHash('sha256').update(l).digest('hex');
  vrai('population : le lien de la demande signée est connu de la table des liens avant qu\'on l\'efface', S.stockage.jetonLire(shaLien(LC)) !== null);
  r = await req('DELETE', '/api/signature/demandes/' + C.id, { token: T_A });
  v('effacer une demande finie : 200', [r.s, r.j.supprime], [200, true]);
  v('…ses liens sont EFFACÉS de la table (pas d\'empreinte orpheline), et le lien répond comme un inconnu', [S.stockage.jetonLire(shaLien(LC)), (await lire(LC)).s], [null, 404]);
  const J = lignes.join('\n');
  vrai('population : le journal d\'exploitation n\'est pas vide', lignes.length >= 15, lignes.length);
  for (const [nom, re] of [['une adresse e-mail', /@/], ['un nom de signataire', /Dubois|Martin|Roux|Petit|Leroy|Moreau|Blanc|Justin|Claire/], ['un lien de signature', /[A-Za-z0-9_-]{43}/], ['un titre de document', /Contrat de maintenance|Devis/], ['une adresse réseau', /127\.0\.0\.1|::1/], ['un code à 6 chiffres', new RegExp('"[^"]*(' + [c1, c2, c3, b1, b2, cc, cn].join('|') + ')"')]]) vrai('le journal d\'exploitation ne porte pas : ' + nom, !re.test(J));
  const signeB = JSON.parse(S.stockage.pieceLire(A.id, 'ev').toString('utf8')).signataires[0].signe;
  v('la signature garde l\'adresse réseau et le navigateur (dans le dossier de preuve chiffré, pas au journal)', [typeof signeB.ip, signeB.consent.version, /^[0-9a-f]{64}$/.test(signeB.consent.h)], ['string', '2026-10-19-1', true]);
  r = await lire(LB);
  v('un titre piégé (« <img onerror> ») traverse en TEXTE, jamais interprété par le service', r.j.titre, 'Devis <img src=x onerror=alert(1)>');

  console.log('\n── 8. Les plafonds par adresse réseau (la page est publique) ──');
  let dernier; for (let i = 0; i < 45; i++) dernier = await lire(inconnu);
  v('au-delà de 40 lectures par minute depuis la même adresse : 429', dernier.s, 429);
  t += 61000;
  v('…la minute suivante, c\'est rouvert', (await lire(inconnu)).s, 404);

  console.log('\n── 9. Un autre compte ne voit RIEN (les routes du patron restent celles du patron) ──');
  v('un autre patron lit la demande d\'un autre : 404', (await req('GET', '/api/signature/demandes/' + A.id, { token: T_B })).s, 404);
  v('…et ne télécharge ni le signé ni la preuve', [(await req('GET', '/api/signature/demandes/' + A.id + '/documents/1/signe', { token: T_B })).s, (await req('GET', '/api/signature/demandes/' + A.id + '/preuves/1', { token: T_B })).s], [404, 404]);

  serveur.close(); S.fermer(); gestion.fermer && gestion.fermer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
