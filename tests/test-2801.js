/* ⛔ CE QUE CE FICHIER GARDE — LA SIGNATURE MAISON, BRANCHÉE POUR DE VRAI : LE SERVICE EST LANCÉ COMME SUR LE VPS (un processus, sa configuration, sa clé)
   Là où `test-2800` monte le moteur en processus, ici on lance `index.js` et on lui parle en HTTP, avec un VRAI serveur SMTP local (sur 127.0.0.1, jamais Internet) qui
   REÇOIT le courriel du code, comme le ferait la boîte de TeamOP. On y garde ce que seul un vrai processus montre :
     1. le moteur interne est ÉTEINT PAR DÉFAUT — sans le réglage, la page et l'API du signataire n'existent pas (404) et `/health` dit « yousign » ;
     2. allumé : `/health` dit « interne » et quels canaux existent (e-mail oui, SMS non) ; « Code SMS » est refusé ;
     3. la page : le même HTML pour tous les liens, AUCUN script en ligne, la politique de sécurité de la page (rien de tiers, jamais encadrable), les fichiers sont servis ;
     4. le parcours réel : lien → page → code REÇU PAR SMTP → signature → le patron voit « signé » et lit le certificat ;
     5. ⛔ le code et le lien ne sont écrits NULLE PART dans la sortie du processus ; la page n'insère rien comme HTML (textContent) et n'appelle personne d'autre.
   Contre-épreuves : scratchpad/courrier/mutations-signature-maison.py. */
'use strict';
const fs = require('fs'), path = require('path');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => v(t + (d !== undefined && !a ? ' — ' + String(d).slice(0, 200) : ''), !!a, true);
const F = require('./courrier-faux');

if (!fs.existsSync(path.join(F.RACINE, 'node_modules', 'express')) || !fs.existsSync(path.join(F.RACINE, 'node_modules', 'nodemailer'))) { console.log('  (sauté : server-courrier/node_modules manque — npm ci --prefix server-courrier)'); console.log('\n0 ✓  0 ✗'); process.exit(0); }

const T_A = 'a'.repeat(48);
const lire = (f) => fs.readFileSync(path.join(F.RACINE, 'public', f), 'utf8');
(async () => {
  const gestion = await F.fauxGestion(); gestion.ajouter(T_A, { id: 'p1', nom: 'Justin', role: 'patron' });
  const ys = await F.fauxYousign();
  const smtp = await F.fauxSmtp();

  async function req(base, methode, chemin, o = {}) {
    const h = Object.assign({}, o.headers || {}); if (o.token) h.Authorization = 'Bearer ' + o.token;
    let body = o.body; if (o.json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.json); }
    const r = await fetch(base + chemin, { method: methode, headers: h, body });
    const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString()); } catch (e) { /* pas du JSON */ }
    return { s: r.status, j, buf, h: r.headers, texte: buf.toString('utf8') };
  }

  console.log('\n── 1. ÉTEINT PAR DÉFAUT : sans le réglage, rien de la signature maison n\'existe ──');
  const Y = await F.lancer(gestion.url, ys.url);   // configuration d'avant : moteur Yousign
  let r = await req(Y.url, 'GET', '/health');
  v('/health dit « yousign »', [r.j.signature.moteur, r.j.signature.pret], ['yousign', true]);
  v('la page du signataire n\'existe pas (404 JSON, comme une route inconnue)', [(await req(Y.url, 'GET', '/signer/signer.js')).s, (await req(Y.url, 'GET', '/signer/' + 'a'.repeat(43))).s, (await req(Y.url, 'GET', '/api/signer/' + 'a'.repeat(43))).s], [404, 404, 404]);
  r = await req(Y.url, 'POST', '/api/signature/demandes', { token: T_A, json: { titre: 'X', niveau: 'avance', jours: 7, signataires: [{ nom: 'Marie Dupont', email: 'm@exemple.fr', telephone: '0612345678' }] } });
  v('et « Code SMS » reste accepté avec Yousign (rien n\'a changé pour l\'ancien moteur)', r.s, 201);
  await Y.stop();

  console.log('\n── 2. ALLUMÉ : le service sait ce qu\'il peut ──');
  const S = await F.lancer(gestion.url, ys.url, { sansYousign: true, config: { signature: { moteur: 'interne', urlPublique: 'http://127.0.0.1:1', smtp: { host: '127.0.0.1', port: smtp.port, secure: false, from: 'TeamOP Signature <signature@teamop.test>' } } } });
  r = await req(S.url, 'GET', '/health');
  v('/health : moteur interne, prêt, canal e-mail oui et SMS non', [r.j.signature.moteur, r.j.signature.pret, r.j.signature.canaux], ['interne', true, { email: true, sms: false }]);
  vrai('…et il ne parle plus de bac à sable (aucun prestataire)', r.j.signature.sandbox === undefined);
  r = await req(S.url, 'POST', '/api/signature/demandes', { token: T_A, json: { titre: 'X', niveau: 'avance', jours: 7, signataires: [{ nom: 'Marie Dupont', email: 'm@exemple.fr', telephone: '0612345678' }] } });
  v('« Code SMS » : refusé tant qu\'il n\'y a pas de fournisseur de SMS', [r.s, r.j.error], [400, 'canal_indisponible']);

  console.log('\n── 3. La page : un seul HTML, aucun script en ligne, une politique stricte ──');
  const lien0 = 'A'.repeat(43);
  r = await req(S.url, 'GET', '/signer/' + lien0);
  const csp = r.h.get('content-security-policy') || '';
  v('la page se sert (200, HTML)', [r.s, /^text\/html/.test(r.h.get('content-type'))], [200, true]);
  vrai('la politique de sécurité : tout fermé par défaut, scripts et styles de CE service seulement, visionneuse en blob, jamais encadrable', /default-src 'none'/.test(csp) && /script-src 'self'/.test(csp) && /style-src 'self'/.test(csp) && /frame-src blob:/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /form-action 'none'/.test(csp) && /connect-src 'self'/.test(csp), csp);
  vrai('…aucun « unsafe-inline », aucun « unsafe-eval », aucun site tiers', !/unsafe-|https?:/.test(csp), csp);
  v('…pas de mémoire, pas de référent, pas de devinette de type', [r.h.get('cache-control'), r.h.get('referrer-policy'), r.h.get('x-content-type-options')], ['no-store', 'no-referrer', 'nosniff']);
  vrai('le HTML n\'a AUCUN script en ligne : un seul <script>, avec une source', (r.texte.match(/<script\b/gi) || []).length === 1 && /<script src="\/signer\/signer\.js">/.test(r.texte));
  vrai('…ni gestionnaire d\'événement en ligne (onclick=…), ni style en ligne', !/\son[a-z]+\s*=/i.test(r.texte) && !/\sstyle\s*=/i.test(r.texte));
  vrai('…et le lien n\'est PAS recopié dans la page (le même HTML pour tous)', !r.texte.includes(lien0) && Buffer.compare(r.buf, (await req(S.url, 'GET', '/signer/' + 'B'.repeat(43))).buf) === 0);
  v('un lien mal formé : la page ne s\'ouvre pas (404), et c\'est la même page', [(await req(S.url, 'GET', '/signer/pas-un-lien')).s], [404]);
  const js = await req(S.url, 'GET', '/signer/signer.js'), css = await req(S.url, 'GET', '/signer/signer.css');
  v('le script et la feuille de style se servent, avec leur type', [js.s, /javascript/.test(js.h.get('content-type')), css.s, /text\/css/.test(css.h.get('content-type'))], [200, true, 200, true]);

  console.log('\n── 4. Ce que la page FAIT (lu dans son code) ──');
  const SJ = lire('signer.js').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('population : on lit bien le script (plus de 80 lignes)', SJ.split('\n').length > 80, SJ.length);
  vrai('RIEN n\'est inséré comme HTML : ni innerHTML, ni outerHTML, ni insertAdjacentHTML, ni document.write, ni eval, ni new Function', !/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function|setTimeout\s*\(\s*['"`]/.test(SJ));
  vrai('…tout texte venu du serveur passe par textContent ou un nœud de texte', /textContent/.test(SJ) && /createTextNode/.test(SJ));
  vrai('…la page n\'appelle QUE ce service : aucune adresse en dur, ni script, ni image, ni police d\'ailleurs', !/https?:\/\//.test(SJ + lire('signer.css') + lire('signer.html').replace(/<!doctype[^>]*>/i, '')));
  vrai('…aucun cookie, aucun stockage de l\'appareil (le lien est tout ce qu\'elle a)', !/document\.cookie|localStorage|sessionStorage|indexedDB/.test(SJ) && /credentials: 'omit'/.test(SJ));
  vrai('…le lien ne part qu\'en chemin vers /api/signer/ de CE service', (SJ.match(/\/api\/signer\//g) || []).length === 2 && /referrerPolicy: 'no-referrer'/.test(SJ));
  vrai('…aucune feuille de style en ligne ne serait admise : le script ne pose pas d\'attribut « style »', !/setAttribute\(\s*['"]style|\.style\.|cssText/.test(SJ));

  console.log('\n── 5. Le parcours RÉEL : lien, code reçu par SMTP, signature, certificat ──');
  r = await req(S.url, 'POST', '/api/signature/demandes', { token: T_A, json: { titre: 'Devis nettoyage — Résidence Les Lilas', expediteur: 'Justin · contact@teamop.test', niveau: 'simple', jours: 15, relances: true, signataires: [{ nom: 'Claire Dubois', email: 'claire.dubois@exemple.fr' }] } });
  const id = r.j.id; const original = F.PDF('devis-reel');
  await req(S.url, 'PUT', '/api/signature/demandes/' + id + '/documents?nom=Devis.pdf', { token: T_A, body: original, headers: { 'Content-Type': 'application/pdf' } });
  r = await req(S.url, 'POST', '/api/signature/demandes/' + id + '/activer', { token: T_A });
  v('activer : un lien, vers l\'adresse publique réglée', [r.s, r.j.liens.length, /^http:\/\/127\.0\.0\.1:1\/signer\/[A-Za-z0-9_-]{43}$/.test(r.j.liens[0].url)], [200, 1, true]);
  const lien = r.j.liens[0].url.split('/signer/')[1];
  v('…rien n\'est parti par SMTP à ce stade', smtp.recus.length, 0);
  r = await req(S.url, 'GET', '/api/signer/' + lien);
  v('le lien donne la demande', [r.s, r.j.etat, r.j.documents.length], [200, 'a_signer', 1]);
  r = await req(S.url, 'POST', '/api/signer/' + lien + '/code', { json: {} });
  v('demander le code : 200', [r.s, r.j.envoye], [200, true]);
  await F.attendre(150);
  const mail = smtp.recus[0];
  vrai('le courriel est ARRIVÉ au serveur SMTP, adressé au signataire, de la boîte de signature', mail && /claire\.dubois@exemple\.fr/.test(mail.a.join()) && /signature@teamop\.test/.test(mail.de), JSON.stringify(mail && { a: mail.a, de: mail.de }));
  const code = mail && (mail.texte.match(/Subject: Votre code de signature : (\d{6})/) || [])[1];
  vrai('…avec le code à 6 chiffres dans l\'objet', /^\d{6}$/.test(code || ''), mail && mail.texte.slice(0, 400));
  vrai('…et une consigne claire (valable 10 minutes, ne le communiquez à personne)', /10 minutes/.test(mail.texte.replace(/=\r?\n/g, '')) && /communiquez/.test(mail.texte.replace(/=\r?\n/g, '')));
  r = await req(S.url, 'POST', '/api/signer/' + lien + '/signer', { json: { code, consentement: true, version: '2026-10-19-1' } });
  v('signer avec le code reçu : signé et terminé (un seul signataire)', [r.s, r.j.signe, r.j.termine], [200, true, true]);
  r = await req(S.url, 'GET', '/api/signature/demandes/' + id, { token: T_A });
  v('le patron voit « signé » et un dossier de preuve', [r.j.etat, r.j.preuves], ['signe', 1]);
  r = await req(S.url, 'GET', '/api/signature/demandes/' + id + '/preuves/1', { token: T_A });
  vrai('le certificat est un PDF qui nomme le titre, le signataire et l\'empreinte du document', r.s === 200 && r.buf.toString('latin1').startsWith('%PDF-') && r.buf.toString('latin1').includes('Claire Dubois') && r.buf.toString('latin1').includes(require('crypto').createHash('sha256').update(original).digest('hex')));

  console.log('\n── 6. Ce que le processus écrit ──');
  await S.stop();
  const sortie = S.sortie();
  vrai('population : le processus a écrit son journal (au moins 5 lignes JSON)', sortie.split('\n').filter((l) => l.startsWith('{')).length >= 5, sortie.slice(0, 200));
  vrai('ni le lien, ni le code, ni une adresse e-mail, ni un nom de signataire dans ce qu\'il a écrit', !sortie.includes(lien) && !sortie.includes(code) && !/@/.test(sortie) && !/Claire|Dubois|Lilas/.test(sortie), sortie.slice(0, 300));

  smtp.fermer(); ys.fermer(); gestion.fermer && gestion.fermer();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
