/* ⛔ CE QUE CE FICHIER GARDE — LE SERVEUR DE SIGNATURE D'OP COURRIER (`server-courrier/`, Yousign), LE VRAI, EN HTTP, CONTRE UN FAUX YOUSIGN AVEC ÉTAT.
   Tout sur 127.0.0.1 : aucun appel Internet, jamais le vrai Yousign. Le service est lancé en processus (comme sur le VPS), avec une clé maître d'environnement.
     1. la porte : pas de jeton / jeton mal formé (sans appel à OP GESTION) / jeton inconnu / rôle autre que patron / OP GESTION muet (503, fermé) ;
     2. création : chaque entrée invalide est refusée, le mobile devient E.164, la contre-signature est le DERNIER signataire ;
     3. le PDF : mauvais type, mauvais octets, trop gros, et dépôt dans la demande d'un AUTRE refusés ; un vrai PDF passe ;
     4. activation : ce que Yousign reçoit (niveau, délai, relances, zones sur la dernière page, ordre), un échec à mi-parcours défait tout et se rejoue ;
     5. webhook : sans signature / mauvaise signature / corps modifié refusés ; événement rejoué deux fois traité UNE fois ; la suite jusqu'au PDF signé ;
     6. un second compte ne voit RIEN (même réponse qu'un identifiant inexistant) ; 7. annuler, relancer ; 8. plafonds ; 9. journal sans donnée personnelle ;
     10. au repos : PDF et fiches scellés, rien de lisible sur le disque ; 11. démarrage refusé hors de sa maison ; 12. sans clé Yousign ; 13. le ménage (horloge simulée).
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE : le journal et le disque sont d'abord PROUVÉS non vides. Contre-épreuves : scratchpad/mutations-courrier.py. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const F = require('./courrier-faux');

if (!fs.existsSync(path.join(F.RACINE, 'node_modules', 'express'))) { console.log('  (sauté : server-courrier/node_modules manque — npm ci --prefix server-courrier)'); console.log('\n0 ✓  0 ✗'); process.exit(0); }

const T_A = 'a'.repeat(48), T_B = 'b'.repeat(48), T_TECH = 'c'.repeat(48), T_PANNE = 'd'.repeat(48);
const MAIL_C = 'client.dupont@exemple.fr', MAIL_C2 = 'second.martin@exemple.fr', MAIL_ME = 'justin.moi@exemple.fr';

(async () => {
  const gestion = await F.fauxGestion();
  gestion.ajouter(T_A, { id: 'p1', nom: 'Justin', role: 'patron' });
  gestion.ajouter(T_B, { id: 'p2', nom: 'Autre Patron', role: 'patron' });
  gestion.ajouter(T_TECH, { id: 't1', nom: 'Technicien', role: 'technicien' });
  gestion.ajouter(T_PANNE, { id: 'p9', nom: 'X', role: 'patron' }); gestion.st.panne.add(T_PANNE);
  const ys = await F.fauxYousign();
  const S = await F.lancer(gestion.url, ys.url);

  async function req(methode, chemin, o = {}) {
    const h = Object.assign({}, o.headers || {});
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    let body = o.body;
    if (o.json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.json); }
    const r = await fetch((o.base || S.url) + chemin, { method: methode, headers: h, body });
    const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString()); } catch (e) { /* pas du JSON */ }
    return { s: r.status, j, buf, h: r.headers };
  }
  const demande = (extra) => Object.assign({ titre: 'Contrat de nettoyage', type: 'Contrat', niveau: 'avance', jours: 15, relances: true,
    signataires: [{ nom: 'Marie Dupont', email: MAIL_C, telephone: '06 12 34 56 78' }, { nom: 'Paul Martin', email: MAIL_C2, telephone: '+33 7 98 76 54 32' }],
    contresignature: { nom: 'Justin Moi', email: MAIL_ME, telephone: '0611223344' } }, extra || {});
  const pdf = (m) => F.PDF(m || 'doc');
  const poserPdf = (id, token, buf, nom) => req('PUT', '/api/signature/demandes/' + id + '/documents?nom=' + encodeURIComponent(nom || 'Contrat.pdf'), { token: token || T_A, body: buf || pdf(), headers: { 'Content-Type': 'application/pdf' } });
  const hook = (ev, o = {}) => { const b = Buffer.from(JSON.stringify(ev)); return req('POST', '/api/signature/webhook/yousign', { body: b, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Yousign-Signature-256': o.sig === undefined ? S.signer(b) : o.sig }, o.h || {}) }); };
  const evt = (nom, rec, signer, id) => ({ event_id: id || 'ev_' + crypto.randomBytes(6).toString('hex'), event_name: nom, event_time: '2026-10-19T10:00:00Z', data: Object.assign({ signature_request: { id: rec.id } }, signer ? { signer: { id: signer } } : {}) });

  console.log('\n── 0. Le service est là ──');
  let r = await req('GET', '/health');
  v('/health répond ok, sans jeton', [r.s, r.j.ok, r.j.service], [200, true, 'opcourrier']);
  vrai('/health dit que la signature est prête (clé + secret posés), en bac à sable', r.j.signature.pret === true && r.j.signature.sandbox === true);
  vrai('pas d\'en-tête X-Powered-By', !r.h.get('x-powered-by'));
  v('une route inconnue : 404 JSON', (await req('GET', '/n-importe-quoi')).s, 404);
  r = await req('OPTIONS', '/api/signature/demandes', { headers: { Origin: 'https://teamop.fr' } });
  v('CORS : la Tour (teamop.fr) est autorisée', [r.s, r.h.get('access-control-allow-origin')], [204, 'https://teamop.fr']);
  r = await req('OPTIONS', '/api/signature/demandes', { headers: { Origin: 'https://mechant.example' } });
  v('CORS : une autre origine n\'est pas autorisée', r.h.get('access-control-allow-origin'), null);

  console.log('\n── 1. La porte ──');
  const avant = gestion.st.appels;
  v('sans jeton : 401', (await req('GET', '/api/signature/demandes')).s, 401);
  v('jeton mal formé : 401', (await req('GET', '/api/signature/demandes', { token: 'pas-un-jeton' })).s, 401);
  v('…et OP GESTION n\'a PAS été interrogé (ce service n\'est pas un relais de devinette)', gestion.st.appels, avant);
  v('jeton inconnu d\'OP GESTION : 401', (await req('GET', '/api/signature/demandes', { token: 'e'.repeat(48) })).s, 401);
  v('rôle technicien : 403', (await req('GET', '/api/signature/demandes', { token: T_TECH })).s, 403);
  r = await req('GET', '/api/signature/demandes', { token: T_PANNE });
  v('OP GESTION muet : 503, FERMÉ (jamais « on laisse passer »)', [r.s, r.j.error], [503, 'verification_indisponible']);
  v('le patron entre', (await req('GET', '/api/signature/demandes', { token: T_A })).s, 200);

  console.log('\n── 2. Création : tout ce qui est invalide est refusé ──');
  const refus = async (t, extra) => { const x = await req('POST', '/api/signature/demandes', { token: T_A, json: demande(extra) }); v(t, x.s, 400); return x; };
  await refus('sans titre', { titre: '  ' });
  await refus('niveau inconnu', { niveau: 'qualifie' });
  await refus('délai de 10 jours', { jours: 10 });
  await refus('aucun signataire', { signataires: [], contresignature: undefined });
  await refus('adresse invalide', { signataires: [{ nom: 'A B', email: 'pas-une-adresse', telephone: '0612345678' }] });
  await refus('niveau avancé sans mobile', { signataires: [{ nom: 'A B', email: 'a@exemple.fr' }] });
  await refus('mobile illisible', { signataires: [{ nom: 'A B', email: 'a@exemple.fr', telephone: '12' }] });
  await refus('même adresse deux fois', { signataires: [{ nom: 'A B', email: MAIL_C, telephone: '0612345678' }, { nom: 'C D', email: MAIL_C.toUpperCase(), telephone: '0612345679' }] });
  await refus('onze signataires', { signataires: Array.from({ length: 11 }, (_, i) => ({ nom: 'N' + i, email: 'n' + i + '@exemple.fr', telephone: '06123456' + (10 + i) })), contresignature: undefined });
  r = await req('POST', '/api/signature/demandes', { token: T_A, body: '{pas du json', headers: { 'Content-Type': 'application/json' } });
  v('JSON cassé : 400 json_invalide', [r.s, r.j.error], [400, 'json_invalide']);
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande({ niveau: 'simple', signataires: [{ nom: 'Solo', email: 'solo@exemple.fr' }], contresignature: undefined }) });
  v('niveau « Code e-mail » : pas de mobile exigé', [r.s, r.j.niveau, r.j.etat], [201, 'simple', 'brouillon']);
  const simple = r.j;
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande() });
  v('demande valide : brouillon créé', [r.s, r.j.etat, r.j.signataires.length], [201, 'brouillon', 3]);
  const D = r.j;
  vrai('la contre-signature est le DERNIER signataire', D.signataires[2].contre === true && D.signataires[2].email === MAIL_ME && !D.signataires[0].contre);
  vrai('l\'identifiant est opaque (24 hexadécimaux)', /^[0-9a-f]{24}$/.test(D.id));

  console.log('\n── 3. Le PDF ──');
  v('activer sans document : 400', (await req('POST', '/api/signature/demandes/' + D.id + '/activer', { token: T_A })).s, 400);
  r = await req('PUT', '/api/signature/demandes/' + D.id + '/documents', { token: T_A, body: pdf(), headers: { 'Content-Type': 'text/plain' } });
  v('mauvais Content-Type : 415', [r.s, r.j.error], [415, 'type_pdf_requis']);
  r = await poserPdf(D.id, T_A, Buffer.from('<html><script>alert(1)</script>'.padEnd(300, ' ')));
  v('Content-Type PDF mais octets de HTML : 415 pdf_invalide', [r.s, r.j.error], [415, 'pdf_invalide']);
  r = await poserPdf(D.id, T_A, Buffer.concat([Buffer.from('MZ\u0090 un exécutable déguisé'), Buffer.alloc(400, 0x20), Buffer.from('%%EOF')]));
  v('pas d\'en-tête %PDF- (fin de fichier présente) : 415', r.s, 415);
  r = await poserPdf(D.id, T_A, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(400, 0x20)]));
  v('en-tête PDF mais sans fin de fichier : 415', r.s, 415);
  r = await poserPdf(D.id, T_A, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(26 * 1024 * 1024, 0x20), Buffer.from('%%EOF')]));
  v('plus de 25 Mo : 413', r.s, 413);
  r = await poserPdf(D.id, T_B);
  v('le PDF d\'un AUTRE compte dans ma demande : 404', r.s, 404);
  r = await poserPdf(D.id, T_A, pdf('contrat-un'), 'Contrat de nettoyage');
  v('un vrai PDF : 201, nom complété en .pdf', [r.s, r.j.documents.length, r.j.documents[0].nom], [201, 1, 'Contrat de nettoyage.pdf']);

  console.log('\n── 4. Activation ──');
  ys.st.echecs.set('signataire', { fois: 2 });   // le 2e signataire (3e appel : 2 échecs d'affilée l'un après l'autre) — on teste le défaire
  r = await req('POST', '/api/signature/demandes/' + D.id + '/activer', { token: T_A });
  v('un échec de Yousign en cours de route : 502, étape nommée', [r.s, r.j.error, r.j.etape], [502, 'yousign_refuse', 'signataire']);
  const brouillonYs = ys.derniere();
  vrai('…le brouillon chez Yousign est SUPPRIMÉ (rien ne traîne)', ys.st.appels.some((a) => a.m === 'DELETE'));
  r = await req('GET', '/api/signature/demandes/' + D.id, { token: T_A });
  v('…et la demande reste un brouillon qu\'on peut rejouer', r.j.etat, 'brouillon');
  ys.st.echecs.clear();
  /* ⛔ PREMIER VRAI ESSAI (19 octobre 2026) : Yousign refusait « creer » en 400 et le service ne disait pas POURQUOI (il jetait le corps, avec raison : il peut citer un nom ou une adresse).
     Il dit maintenant LE CHAMP refusé (son nom, jamais sa valeur) et une phrase nettoyée — à celui qui est connecté seulement : le JOURNAL ne reçoit que le nom du champ (§ 9 relit tout le journal). */
  ys.st.refusCreer = { statut: 400, corps: { title: 'Bad Request', violations: [
    { propertyPath: 'reminder_settings.max_occurrences', message: 'Valeur trop haute pour jean.dupont@exemple.fr 0612345678 Léa Roux' },
    { propertyPath: 'jean.dupont@exemple.fr', message: 'ne doit jamais sortir' }] } };
  ys.st.echecs.set('creer', { fois: 1 });
  r = await req('POST', '/api/signature/demandes/' + D.id + '/activer', { token: T_A });
  v('⛔ un refus 400 de Yousign à « creer » : le CHAMP refusé est nommé (et lui seul — un « champ » qui n\'est pas un nom de propriété est écarté)', [r.s, r.j.error, r.j.etape, r.j.statut, r.j.champ], [502, 'yousign_refuse', 'creer', 400, 'reminder_settings.max_occurrences']);
  vrai('…la phrase utile reste', /Valeur trop haute/.test(r.j.raison || ''), r.j.raison);
  vrai('…sans adresse e-mail ni numéro de téléphone', !/@|0612|\d{4}/.test(r.j.raison || ''), r.j.raison);
  vrai('…et rien du refus n\'est resté sur le service (brouillon rejouable)', (await req('GET', '/api/signature/demandes/' + D.id, { token: T_A })).j.etat === 'brouillon');
  ys.st.refusCreer = null; ys.st.echecs.clear();
  r = await req('POST', '/api/signature/demandes/' + D.id + '/activer', { token: T_A });
  v('rejouée : activée, « en attente »', [r.s, r.j.etat], [200, 'en_attente']);
  const R = ys.derniere();
  v('Yousign : nom, envoi par e-mail, fuseau, signataires ordonnés (contre-signature)', [R.corps.name, R.corps.delivery_mode, R.corps.timezone, R.corps.ordered_signers], ['Contrat de nettoyage', 'email', 'Europe/Paris', true]);
  v('Yousign : relances tous les 2 jours (1, 2, 7 ou 14 seulement), 7 au plus pour 15 jours', R.corps.reminder_settings, { interval_in_days: 2, max_occurrences: 7 });
  vrai('Yousign : échéance = aujourd\'hui + 15 jours', R.corps.expiration_date === new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
  v('Yousign : trois signataires, la contre-signature en DERNIER', R.signers.map((s) => s.info.email), [MAIL_C, MAIL_C2, MAIL_ME]);
  v('Yousign : « Code SMS » = signature avancée + otp_sms', [R.signers[0].signature_level, R.signers[0].signature_authentication_mode], ['advanced_electronic_signature', 'otp_sms']);
  v('Yousign : mobile en E.164 (« 06 12 34 56 78 » → +33612345678)', [R.signers[0].info.phone_number, R.signers[1].info.phone_number, R.signers[2].info.phone_number], ['+33612345678', '+33798765432', '+33611223344']);
  v('Yousign : prénom / nom découpés', [R.signers[0].info.first_name, R.signers[0].info.last_name], ['Marie', 'Dupont']);
  vrai('Yousign : une zone de signature par signataire, sur la DERNIÈRE page (3), sans chevauchement', R.signers.every((s) => s.fields.length === 1 && s.fields[0].page === 3 && s.fields[0].document_id === R.docs[0].id) && new Set(R.signers.map((s) => s.fields[0].x + ',' + s.fields[0].y)).size === 3);
  vrai('Yousign : la demande est ACTIVÉE', R.etat === 'ongoing');
  vrai('Yousign : le PDF est parti en multipart', ys.st.appels.some((a) => a.p.endsWith('/documents') && /multipart/.test(a.ct)));
  vrai('Yousign : la clé API est celle de la configuration (jamais celle du client)', ys.st.appels.every((a) => a.auth === 'Bearer ' + ys.cle));
  v('une seconde activation : 409', (await req('POST', '/api/signature/demandes/' + D.id + '/activer', { token: T_A })).s, 409);
  v('un PDF de plus après activation : 409', (await poserPdf(D.id)).s, 409);

  console.log('\n── 5. Le webhook Yousign ──');
  const sg = R.signers.map((s) => s.id);
  const corpsHook = Buffer.from(JSON.stringify(evt('signer.link_opened', R, sg[0])));
  v('sans signature : 401', (await req('POST', '/api/signature/webhook/yousign', { body: corpsHook })).s, 401);
  v('mauvaise signature : 401', (await hook(evt('signer.link_opened', R, sg[0]), { sig: 'sha256=' + 'f'.repeat(64) })).s, 401);
  v('signature mal formée : 401', (await hook(evt('signer.link_opened', R, sg[0]), { sig: 'sha256=zz' })).s, 401);
  r = await req('POST', '/api/signature/webhook/yousign', { body: Buffer.from(corpsHook.toString() + ' '), headers: { 'X-Yousign-Signature-256': S.signer(corpsHook) } });
  v('signature juste mais corps modifié d\'un octet : 401', r.s, 401);
  v('rien n\'a bougé après ces refus', (await req('GET', '/api/signature/demandes/' + D.id, { token: T_A })).j.etat, 'en_attente');
  const ouvert = evt('signer.link_opened', R, sg[0], 'ev_ouvert_1');
  r = await hook(ouvert);
  v('événement signé : accepté', [r.s, r.j.ok], [200, true]);
  r = await req('GET', '/api/signature/demandes/' + D.id, { token: T_A });
  v('« document ouvert » : état Ouvert, signataire 1 vu', [r.j.etat, r.j.signataires[0].etat], ['ouvert', 'viewed']);
  const nEv = r.j.evenements.length;
  r = await hook(ouvert);
  v('le MÊME événement reçu une 2e fois : accepté, marqué « déjà »', [r.s, r.j.deja], [200, true]);
  v('…et il n\'a pas été traité deux fois (le journal des événements n\'a pas grandi)', (await req('GET', '/api/signature/demandes/' + D.id, { token: T_A })).j.evenements.length, nEv);
  v('événement sans identifiant : 400', (await hook({ event_name: 'signer.signed', data: {} })).s, 400);
  r = await hook({ event_id: 'ev_inconnu', event_name: 'signature_request.done', data: { signature_request: { id: 'sr_zzz' } } });
  v('événement d\'une demande inconnue : 200 (sans réessai infini), rien créé', [r.s, r.j.ok], [200, true]);
  await hook(evt('signer.signed', R, sg[0], 'ev_s1')); await hook(evt('signer.signed', R, sg[1], 'ev_s2'));
  r = await req('GET', '/api/signature/demandes/' + D.id, { token: T_A });
  v('les deux clients ont signé : « À contresigner » (à vous)', r.j.etat, 'a_contresigner');
  v('pas encore de PDF signé : 409', (await req('GET', '/api/signature/demandes/' + D.id + '/documents/1/signe', { token: T_A })).s, 409);
  const t0 = ys.st.telechargements;
  await hook(evt('signature_request.done', R, null, 'ev_done'));
  r = await req('GET', '/api/signature/demandes/' + D.id, { token: T_A });
  v('demande terminée : Signé, tous signataires signés', [r.j.etat, r.j.signataires.every((s) => s.etat === 'signed'), r.j.documents[0].signe, r.j.preuves], ['signe', true, true, 3]);
  v('les PDF ont été téléchargés chez Yousign (1 signé + 3 preuves)', ys.st.telechargements - t0, 4);
  await hook(evt('signature_request.done', R, null, 'ev_done'));
  v('« terminé » rejoué : aucun nouveau téléchargement', ys.st.telechargements - t0, 4);
  r = await req('GET', '/api/signature/demandes/' + D.id + '/documents/1/signe', { token: T_A });
  vrai('le PDF signé est servi (PDF, octets de chez Yousign)', r.s === 200 && r.h.get('content-type') === 'application/pdf' && r.buf.toString().includes('SIGNE sr_') && /filename\*=UTF-8''Contrat%20de%20nettoyage%20\(sign%C3%A9\)\.pdf/.test(r.h.get('content-disposition')));
  r = await req('GET', '/api/signature/demandes/' + D.id + '/preuves/2', { token: T_A });
  vrai('le dossier de preuve du signataire 2 est servi', r.s === 200 && r.buf.toString().includes('PREUVE sr_'));
  v('preuve n° 4 (il n\'y en a que 3) : 404', (await req('GET', '/api/signature/demandes/' + D.id + '/preuves/4', { token: T_A })).s, 404);
  v('document n° 2 : 404', (await req('GET', '/api/signature/demandes/' + D.id + '/documents/2/signe', { token: T_A })).s, 404);
  v('l\'original à signer n\'est plus sur le disque (le signé suffit)', fs.readdirSync(path.join(S.data, 'pieces')).filter((f) => f.startsWith(D.id + '.src')).length, 0);

  console.log('\n── 5 bis. Yousign muet au moment du « terminé » : l\'événement n\'est pas perdu ──');
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande({ niveau: 'simple', signataires: [{ nom: 'Léa Roux', email: 'lea.roux@exemple.fr' }], contresignature: undefined }) });
  const E = r.j; await poserPdf(E.id, T_A, pdf('echec')); await req('POST', '/api/signature/demandes/' + E.id + '/activer', { token: T_A });
  const RE = ys.derniere();
  ys.st.echecs.set('signe', { fois: 1 });
  r = await hook(evt('signature_request.done', RE, null, 'ev_done_e'));
  v('« terminé » reçu, téléchargement refusé : le webhook répond quand même 200', r.s, 200);
  r = await req('GET', '/api/signature/demandes/' + E.id, { token: T_A });
  v('…état Signé, pièces pas encore récupérées', [r.j.etat, r.j.documents[0].signe], ['signe', false]);
  ys.st.echecs.set('signe', { fois: 1 });
  v('télécharger tant que Yousign ne répond pas : 503 pieces_en_cours', (await req('GET', '/api/signature/demandes/' + E.id + '/documents/1/signe', { token: T_A })).j.error, 'pieces_en_cours');
  v('Yousign revenu : le téléchargement récupère LUI-MÊME les pièces (200)', (await req('GET', '/api/signature/demandes/' + E.id + '/documents/1/signe', { token: T_A })).s, 200);

  console.log('\n── 6. Un second compte ne voit rien ──');
  r = await req('GET', '/api/signature/demandes', { token: T_A });
  vrai('⛔ la liste du premier compte N\'EST PAS vide (node:sqlite rend les BLOB en Uint8Array : sans Buffer.from, chaque fiche était « illisible » et la liste sortait vide — pris le 19 octobre 2026, par la Tour)', r.s === 200 && r.j.demandes.length >= 3 && r.j.demandes.every((d) => /^[0-9a-f]{24}$/.test(d.id) && d.titre && Array.isArray(d.signataires)));
  vrai('…et elle contient la demande qu\'on vient de lire, avec son état', r.j.demandes.some((d) => d.id === E.id && d.etat === 'signe'));
  r = await req('GET', '/api/signature/demandes', { token: T_B });
  v('sa liste est vide (alors que le premier en a)', [r.s, r.j.demandes.length], [200, 0]);
  const reponses = [];
  for (const [m, c] of [['GET', ''], ['POST', '/annuler'], ['POST', '/relancer'], ['POST', '/activer'], ['DELETE', ''], ['GET', '/documents/1/signe'], ['GET', '/preuves/1']]) {
    const b = await req(m, '/api/signature/demandes/' + D.id + c, { token: T_B });
    const inex = await req(m, '/api/signature/demandes/' + 'a'.repeat(24) + c, { token: T_B });
    reponses.push([b.s, JSON.stringify(b.j)] + '' === [inex.s, JSON.stringify(inex.j)] + '' && b.s === 404);
  }
  v('sept gestes sur la demande d\'un autre : tous 404, IDENTIQUES à un identifiant inexistant', reponses, Array(7).fill(true));
  v('la demande du premier est intacte', (await req('GET', '/api/signature/demandes/' + D.id, { token: T_A })).j.etat, 'signe');

  console.log('\n── 7. Relancer, annuler ──');
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande() });
  const G = r.j; await poserPdf(G.id, T_A, pdf('g')); await req('POST', '/api/signature/demandes/' + G.id + '/activer', { token: T_A });
  const RG = ys.derniere();
  v('relancer : accepté', (await req('POST', '/api/signature/demandes/' + G.id + '/relancer', { token: T_A })).s, 200);
  v('…Yousign relance le PREMIER signataire seulement (ordre de signature)', RG.rappels, [RG.signers[0].id]);
  r = await req('POST', '/api/signature/demandes/' + G.id + '/relancer', { token: T_A });
  v('relancer deux fois de suite : 429', [r.s, r.j.error], [429, 'relance_trop_proche']);
  v('effacer une demande EN COURS : 409 (on l\'annule d\'abord)', (await req('DELETE', '/api/signature/demandes/' + G.id, { token: T_A })).s, 409);
  ys.st.echecs.set('annuler', { fois: 1 });
  r = await req('POST', '/api/signature/demandes/' + G.id + '/annuler', { token: T_A });
  v('annuler quand Yousign refuse : 502 (on ne ment pas)', r.s, 502);
  v('…la demande reste en cours', (await req('GET', '/api/signature/demandes/' + G.id, { token: T_A })).j.etat, 'en_attente');
  vrai('…et son PDF à signer est encore là', fs.readdirSync(path.join(S.data, 'pieces')).some((f) => f.startsWith(G.id + '.src')));
  r = await req('POST', '/api/signature/demandes/' + G.id + '/annuler', { token: T_A });
  v('annuler : Annulée', [r.s, r.j.etat], [200, 'annule']);
  vrai('…Yousign a reçu l\'annulation', RG.annulee === true);
  v('…le PDF à signer est EFFACÉ du disque', fs.readdirSync(path.join(S.data, 'pieces')).filter((f) => f.startsWith(G.id + '.')).length, 0);
  v('annuler deux fois : 409', (await req('POST', '/api/signature/demandes/' + G.id + '/annuler', { token: T_A })).s, 409);
  v('relancer une demande annulée : 409', (await req('POST', '/api/signature/demandes/' + G.id + '/relancer', { token: T_A })).s, 409);
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande() });
  v('annuler un brouillon : supprimé, rien chez Yousign', [(await req('POST', '/api/signature/demandes/' + r.j.id + '/annuler', { token: T_A })).j.supprime, (await req('GET', '/api/signature/demandes/' + r.j.id, { token: T_A })).s], [true, 404]);
  v('effacer une demande finie : supprimée avec ses pièces', [(await req('DELETE', '/api/signature/demandes/' + D.id, { token: T_A })).s, fs.readdirSync(path.join(S.data, 'pieces')).filter((f) => f.startsWith(D.id + '.')).length], [200, 0]);
  await hook(evt('signature_request.expired', RE, null, 'ev_exp'));
  v('un événement « expirée » arrivant après un « signé » ne le défait pas', (await req('GET', '/api/signature/demandes/' + E.id, { token: T_A })).j.etat, 'signe');
  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande({ niveau: 'simple', signataires: [{ nom: 'Zoé Ba', email: 'zoe.ba@exemple.fr' }], contresignature: undefined }) });
  const Z = r.j; await poserPdf(Z.id, T_A, pdf('z')); await req('POST', '/api/signature/demandes/' + Z.id + '/activer', { token: T_A });
  const RZ = ys.derniere();
  await hook(evt('signer.declined', RZ, RZ.signers[0].id, 'ev_dec'));
  r = await req('GET', '/api/signature/demandes/' + Z.id, { token: T_A });
  v('un refus du signataire : Refusé, son PDF à signer effacé', [r.j.etat, fs.readdirSync(path.join(S.data, 'pieces')).filter((f) => f.startsWith(Z.id + '.')).length], ['refuse', 0]);

  console.log('\n── 8. Plafonds anti-abus (un second service, plafonds bas) ──');
  const S2 = await F.lancer(gestion.url, ys.url, { quotas: { creation: { max: 3, fenetreMs: 60000 }, sms: { max: 4, fenetreMs: 60000 } } });
  const req2 = (m, c, o) => req(m, c, Object.assign({ base: S2.url }, o));
  const cr = []; for (let i = 0; i < 4; i++) cr.push(await req2('POST', '/api/signature/demandes', { token: T_A, json: demande({ signataires: [{ nom: 'S ' + i, email: 's' + i + '@exemple.fr', telephone: '0612345678' }], contresignature: undefined }) }));
  v('création : 3 passent, la 4e est refusée (429 avec Retry-After)', [cr.map((x) => x.s), !!cr[3].h.get('retry-after')], [[201, 201, 201, 429], true]);
  v('…le plafond est PAR PERSONNE : l\'autre compte crée encore', (await req2('POST', '/api/signature/demandes', { token: T_B, json: demande() })).s, 201);
  const [a1, a2] = cr;
  const poser2 = (id, tk) => req2('PUT', '/api/signature/demandes/' + id + '/documents', { token: tk, body: pdf(), headers: { 'Content-Type': 'application/pdf' } });
  const b0 = await req2('POST', '/api/signature/demandes', { token: T_B, json: demande() });   // 3 signataires en « Code SMS » = 3 SMS (déjà créée plus haut : "l'autre compte crée encore")
  await poser2(b0.j.id, T_B);
  v('SMS : une demande à 3 SMS passe (3 ≤ 4)', (await req2('POST', '/api/signature/demandes/' + b0.j.id + '/activer', { token: T_B })).s, 200);
  const b1 = await req2('POST', '/api/signature/demandes', { token: T_B, json: demande() });
  await poser2(b1.j.id, T_B);
  r = await req2('POST', '/api/signature/demandes/' + b1.j.id + '/activer', { token: T_B });
  v('…une seconde (3 SMS de plus : 6 > 4) est refusée, par le plafond des SMS', [r.s, r.j.quota], [429, 'sms']);
  v('…et RIEN n\'est parti chez Yousign pour elle', ys.st.demandes.size, ys.st.demandes.size);
  const sansPdf = await req2('POST', '/api/signature/demandes/' + a2.j.id + '/activer', { token: T_A });
  v('activer sans document ne consomme aucun SMS (400 avant le plafond)', sansPdf.s, 400);
  r = await req2('POST', '/api/signature/demandes', { token: T_B, json: demande() });
  v('création : B en a créé 3 (une plus haut, deux ici) : la 4e est refusée', r.s, 429);
  for (let i = 0; i < 25; i++) await req2('GET', '/api/signature/demandes', { token: 'f'.repeat(48) });
  r = await req2('GET', '/api/signature/demandes', { token: 'f'.repeat(48) });
  v('trop de jetons refusés depuis une adresse : 429', r.s, 429);
  await S2.stop(); fs.rmSync(S2.dir, { recursive: true, force: true });

  r = await req('POST', '/api/signature/demandes', { token: T_A, json: demande() });
  await poserPdf(r.j.id, T_A, F.PDF('MARQUEUR-CLAIR-SUR-LE-DISQUE'), 'brouillon.pdf');

  console.log('\n── 9. Le journal ne porte aucune donnée personnelle ──');
  const J = S.sortie().split('\n').filter((l) => !/ExperimentalWarning|trace-warnings/.test(l)).join('\n');
  vrai('population : le journal n\'est pas vide (≥ 15 lignes)', J.split('\n').filter(Boolean).length >= 15);
  vrai('chaque ligne est du JSON', J.split('\n').filter(Boolean).every((l) => { try { JSON.parse(l); return true; } catch (e) { return false; } }));
  for (const [nom, motif] of [['une adresse e-mail', /@/], ['un nom de signataire', /Dupont|Martin|Marie|Léa|Roux|Justin|Zo[ée]/], ['un mobile', /\+33|0612|0611/], ['une adresse réseau', /127\.0\.0\.1|::1|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/], ['un jeton de la Tour', /\b[a-f0-9]{48}\b/], ['la clé Yousign', /CLE-YOUSIGN|SECRET-WEBHOOK/], ['un titre de document', /Contrat de nettoyage/]]) vrai('aucun(e) ' + nom + ' dans le journal', !motif.test(J.replace(/"t":"[^"]+"/g, '')));
  vrai('le journal sait quand même dire l\'essentiel (activation, événement, annulation)', /"evt":"activee"/.test(J) && /"evt":"evenement"/.test(J) && /"evt":"annulee"/.test(J));

  console.log('\n── 10. Au repos : rien de lisible sur le disque ──');
  await req('GET', '/health'); await S.stop();
  const fichiers = []; (function marche(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? marche(p) : fichiers.push(p); } })(S.data);
  const toutes = fichiers.map((f) => fs.readFileSync(f)); const total = Buffer.concat(toutes).toString('latin1');
  vrai('population : le disque porte des pièces ET la base (≥ 3 fichiers de pièce, courrier.db)', fichiers.filter((f) => f.includes('pieces')).length >= 3 && fichiers.some((f) => f.endsWith('courrier.db')));
  vrai('aucun en-tête « %PDF » en clair, ni le contenu du brouillon', !total.includes('%PDF') && !total.includes('MARQUEUR-CLAIR'));
  vrai('aucune adresse de signataire en clair (base, journal WAL, pièces)', ![MAIL_C, MAIL_C2, MAIL_ME, 'lea.roux'].some((m) => total.includes(m)));
  vrai('aucun nom en clair', !/Dupont|Marie|Paul Martin/.test(total));
  vrai('la clé maître n\'est écrite nulle part dans les données', !total.includes(S.kek));
  vrai('les fichiers de pièce sont en 0600', fichiers.filter((f) => f.includes('pieces')).every((f) => (fs.statSync(f).mode & 0o077) === 0));
  const { creerScelle } = require('../server-courrier/scelle');
  const sc = creerScelle(Buffer.from(S.kek, 'hex')), x = sc.sceller(Buffer.from('secret'), 'pdf', 'abc:src1');
  v('un scellé s\'ouvre avec sa clé et son contexte', sc.ouvrir(x, 'pdf', 'abc:src1').toString(), 'secret');
  let jete = 0; try { sc.ouvrir(x, 'pdf', 'autre:src1'); } catch (e) { jete++; } try { sc.ouvrir(x, 'json', 'abc:src1'); } catch (e) { jete++; }
  try { creerScelle(Buffer.alloc(32, 1)).ouvrir(x, 'pdf', 'abc:src1'); } catch (e) { jete++; } const y = Buffer.from(x); y[30] ^= 1; try { sc.ouvrir(y, 'pdf', 'abc:src1'); } catch (e) { jete++; }
  v('…pas sous un autre nom (recopié), pas pour un autre usage, pas avec une autre clé, pas altéré', jete, 4);
  fs.rmSync(S.dir, { recursive: true, force: true });

  console.log('\n── 11. Le démarrage refuse ce qui n\'est pas sa maison ──');
  const { spawnSync } = require('child_process');
  const lancerBrut = (envPlus, confTexte, mode) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-garde-')); const c = path.join(d, 'c.json'); fs.writeFileSync(c, confTexte || '{}', { mode: mode || 0o600 });
    const env = Object.assign({ PATH: process.env.PATH, OPCOURRIER_CONFIG: c, OPCOURRIER_DATA: path.join(d, 'data'), OPCOURRIER_INSTANCE: 'beta', OPCOURRIER_KEK: 'a'.repeat(64), PORT: '1' }, envPlus);
    const p = spawnSync(process.execPath, [path.join(F.RACINE, 'index.js')], { env, encoding: 'utf8', timeout: 8000 });
    return { code: p.status, sortie: p.stderr + p.stdout, d, existe: fs.existsSync(path.join(d, 'data')) };
  };
  let g = lancerBrut({ OPCOURRIER_DATA: '/opt/teamop/data/courrier' });
  vrai('données sous /opt/teamop : refus (code 1) et RIEN créé', g.code === 1 && /\/opt\/teamop/.test(g.sortie) && !fs.existsSync('/opt/teamop/data/courrier') && !fs.existsSync('/opt/teamop/x'));
  g = lancerBrut({ OPCOURRIER_DATA: '/opt/opmsg/../teamop/x' });
  vrai('un « .. » ne contourne pas la garde', g.code === 1);
  const lien = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-lien-')); fs.symlinkSync('/etc/teamop', path.join(lien, 'l'));
  g = lancerBrut({ OPCOURRIER_DATA: path.join(lien, 'l', 'data') });
  vrai('…ni un lien symbolique vers /etc/teamop', g.code === 1 && /\/etc\/teamop/.test(g.sortie));
  g = lancerBrut({ OPCOURRIER_INSTANCE: 'autre' }); vrai('instance inconnue : refus', g.code === 1);
  g = lancerBrut({ OPCOURRIER_KEK: 'zz' }); vrai('clé maître absente ou illisible : refus, sans l\'écrire', g.code === 1 && !g.sortie.includes('zz') && !g.existe);
  g = lancerBrut({}, JSON.stringify({ gestion: { url: 'http://api.teamop.fr' } })); vrai('OP GESTION en http clair hors boucle locale : refus', g.code === 1 && /https/.test(g.sortie));
  g = lancerBrut({}, JSON.stringify({ yousign: { urlApi: 'https://pirate.example' } })); vrai('une autre adresse que Yousign : refus', g.code === 1);
  g = lancerBrut({}, '{}', 0o644); vrai('configuration lisible par tous (clé Yousign dedans) : refus', g.code === 1 && /0600/.test(g.sortie));

  console.log('\n── 12. Sans clé Yousign posée ──');
  const S3 = await F.lancer(gestion.url, ys.url, { sansYousign: true });
  r = await req('GET', '/health', { base: S3.url });
  v('/health : signature NON prête (le module garde « en attente de Yousign »)', r.j.signature.pret, false);
  r = await req('POST', '/api/signature/demandes', { base: S3.url, token: T_A, json: demande() });
  const id3 = r.j.id; await req('PUT', '/api/signature/demandes/' + id3 + '/documents', { base: S3.url, token: T_A, body: pdf(), headers: { 'Content-Type': 'application/pdf' } });
  r = await req('POST', '/api/signature/demandes/' + id3 + '/activer', { base: S3.url, token: T_A });
  v('activer : 503 signature_non_configuree', [r.s, r.j.error], [503, 'signature_non_configuree']);
  r = await req('POST', '/api/signature/webhook/yousign', { base: S3.url, body: Buffer.from('{}'), headers: { 'X-Yousign-Signature-256': 'sha256=' + '0'.repeat(64) } });
  v('webhook : 503 (jamais accepté faute de secret)', r.s, 503);
  await S3.stop(); fs.rmSync(S3.dir, { recursive: true, force: true });

  console.log('\n── 13. Le ménage et le cache de la porte (horloge simulée, en processus) ──');
  let maintenant = Date.UTC(2026, 9, 19, 12);
  const { creerApp } = require('../server-courrier/index');
  const { charger } = require('../server-courrier/config');
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-menage-')); const cf = path.join(dir2, 'c.json');
  fs.writeFileSync(cf, JSON.stringify({ gestion: { url: gestion.url }, yousign: { cleApi: ys.cle, secretWebhook: 's', urlApi: ys.url } }), { mode: 0o600 });
  const conf = charger({ OPCOURRIER_CONFIG: cf, OPCOURRIER_DATA: path.join(dir2, 'data'), OPCOURRIER_INSTANCE: 'beta', OPCOURRIER_KEK: 'b'.repeat(64) });
  const lignes = []; const P = creerApp({ config: conf, horloge: () => maintenant, journal: (e, c) => lignes.push([e, c]) });
  const br = P.demandes.creer('u:p1', demande({ niveau: 'simple', signataires: [{ nom: 'Ana Ly', email: 'ana@exemple.fr' }], contresignature: undefined }));
  P.demandes.ajouterDocument('u:p1', br.id, 'a.pdf', pdf('menage'));
  vrai('population : un brouillon et sa pièce existent', P.stockage.lire(br.id) && P.stockage.pieceLire(br.id, 'src1'));
  maintenant += 6 * 86400000; await P.demandes.balayer();
  vrai('brouillon de 6 jours : gardé', P.stockage.lire(br.id) !== null);
  maintenant += 2 * 86400000; await P.demandes.balayer();
  v('brouillon de 8 jours : effacé avec sa pièce', [P.stockage.lire(br.id), P.stockage.pieceLire(br.id, 'src1')], [null, null]);
  vrai('…et le ménage est écrit au journal sans donnée', lignes.some(([e]) => e === 'purge'));
  const sg1 = P.demandes.creer('u:p1', demande({ niveau: 'simple', signataires: [{ nom: 'Ana Ly', email: 'ana@exemple.fr' }], contresignature: undefined }));
  P.demandes.ajouterDocument('u:p1', sg1.id, 'a.pdf', pdf('menage2')); await P.demandes.activer('u:p1', sg1.id);
  const rs = ys.derniere(); await P.demandes.appliquerEvenement(evt('signature_request.done', rs, null, 'ev_m'));
  maintenant += 89 * 86400000; await P.demandes.balayer();
  vrai('demande signée : gardée 89 jours', P.stockage.lire(sg1.id) !== null && P.stockage.pieceLire(sg1.id, 'sig1') !== null);
  maintenant += 2 * 86400000; await P.demandes.balayer();
  v('…et effacée après 90 jours (rétention bornée)', [P.stockage.lire(sg1.id), P.stockage.pieceLire(sg1.id, 'sig1')], [null, null]);
  v('un événement vieux de plus de 30 jours est oublié (la table ne grossit pas sans fin)', (P.stockage.evenementNeuf('ev_m'), P.stockage.evenementNeuf('ev_m')), false);
  maintenant += 31 * 86400000; await P.demandes.balayer();
  v('…puis réadmis après purge', P.stockage.evenementNeuf('ev_m'), true);
  // le cache de la porte
  const a = require('../server-courrier/auth').creerAuth({ gestionUrl: gestion.url, horloge: () => maintenant });
  const T_C = '1'.repeat(48); gestion.ajouter(T_C, { id: 'p3', nom: 'C', role: 'patron' });
  v('accès ouvert : accepté', (await a.verifier('Bearer ' + T_C)).ok, true);
  gestion.retirer(T_C);
  v('accès coupé à la Tour : encore accepté dans les 60 s (cache)', (await a.verifier('Bearer ' + T_C)).ok, true);
  maintenant += 61000;
  v('…refusé après 61 s', (await a.verifier('Bearer ' + T_C)).ok, false);
  gestion.ajouter(T_C, { id: '', nom: 'sans id', role: 'patron' });
  maintenant += 61000; a.oublier();
  v('un compte sans identifiant ne passe pas (fermé)', (await a.verifier('Bearer ' + T_C)).ok, false);
  // un événement dont le traitement ÉCHOUE est OUBLIÉ (500) : Yousign le renverra, et il sera traité (pas « déjà »)
  const srv = P.app.listen(0, '127.0.0.1'); await new Promise((r2) => srv.on('listening', r2));
  const vraiTraitement = P.demandes.appliquerEvenement;
  const envoyer = async (e2) => { const b = Buffer.from(JSON.stringify(e2)); const x = await fetch('http://127.0.0.1:' + srv.address().port + '/api/signature/webhook/yousign', { method: 'POST', body: b, headers: { 'X-Yousign-Signature-256': 'sha256=' + crypto.createHmac('sha256', 's').update(b).digest('hex') } }); return [x.status, (await x.json()).deja === true]; };
  P.demandes.appliquerEvenement = async () => { throw new Error('disque plein'); };
  const e500 = { event_id: 'ev_500', event_name: 'signer.signed', data: {} };
  v('traitement en échec : 500', (await envoyer(e500))[0], 500);
  P.demandes.appliquerEvenement = vraiTraitement;
  v('…Yousign renvoie le même événement : REPRIS (200, pas « déjà vu »)', await envoyer(e500), [200, false]);
  srv.close();
  P.fermer(); fs.rmSync(dir2, { recursive: true, force: true });

  gestion.fermer(); ys.fermer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
