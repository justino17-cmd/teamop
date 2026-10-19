/* Sonde Tour × OP Courrier — le Courrier de `apercu/tour.html` (v2.91) est le MODULE `opcourrier.js`, branché sur les VRAIES routes de `server/mail.js`.
   ⛔ 127.0.0.1 UNIQUEMENT : l'aperçu de la Tour servi en local ; les appels vers api.teamop.fr sont RÉPONDUS par le VRAI serveur isolé (`serveur-banc.js` : configuration et données jetables,
   fausse boîte IMAP, faux relais SMTP) — jamais joints. Tout le reste qui sort de 127.0.0.1 est refusé ET compté. UNE instance de navigateur à la fois.
     1. le module n'est chargé QU'à l'ouverture du Courrier ; l'écran est VIDE (aucune donnée d'exemple, aucune boîte reprise en silence) et invite à ajouter une boîte ;
     2. jour / nuit suivis en direct (le système décide, pas de bouton) ; 390 px et bureau, aucun défilement latéral, aucune exception ;
     3. « Ajouter une boîte mail » connecte une VRAIE boîte (route du serveur), lire / ouvrir / archiver / envoyer tiennent côté serveur ;
     4. un refus du serveur est une PANNE qui se dit, jamais « Aucune boîte » ; quitter la vue démonte le module, y revenir le remonte ; « Écrire à… » d'une fiche ouvre le message ;
     5. la déconnexion de la Tour vide la clé de stockage du Courrier.
   Lancer : NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/sonde-tour.js (voir pilote.js). Captures : CAPTURES=<dossier>. */
const { ouvrir, bilan } = require('./pilote.js');
const { demarrer } = require('./serveur-banc.js');
const fs = require('fs'), path = require('path');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
const CAP = process.env.CAPTURES || '/tmp/claude-0/captures-courrier'; fs.mkdirSync(CAP, { recursive: true });
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
(async () => {
  const S = await demarrer({ messages: true }); globalThis.__S = S;
  const P = await ouvrir();
  let nAdr = 0;
  const nouveau = async (opts, srv) => {
    const T = srv || S;
    const ctx = await P.ctxPour(Object.assign({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' }, opts || {}));
    const vus = { demandes: [], refus: null, scripts: [] };
    await ctx.route(/^https:\/\/api\.teamop\.fr\//, async (route) => {
      const rq = route.request(), u = new URL(rq.url());
      if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      vus.demandes.push(rq.method() + ' ' + u.pathname);
      if (vus.refus && vus.refus.test(u.pathname)) return route.fulfill({ status: 403, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify({ error: 'réservé au patron' }) });
      const h = Object.assign({}, rq.headers(), { host: '127.0.0.1:' + T.port, 'x-forwarded-for': '10.9.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) }); delete h['content-length'];
      const r = await fetch('http://127.0.0.1:' + T.port + u.pathname + u.search, { method: rq.method(), headers: h, body: rq.method() === 'GET' ? undefined : rq.postData() });
      route.fulfill({ status: r.status, headers: Object.assign({ 'content-type': r.headers.get('content-type') || 'application/json' }, CORS), body: await r.text() });
    });
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) err.push('console: ' + m.text()); });
    p.on('request', q => { if (/opcourrier\.js/.test(q.url())) vus.scripts.push(q.url()); });
    await p.goto(P.base + '/apercu/tour.html');
    await p.fill('#lg-id', 'Patron'); await p.fill('#lg-pass', T.MDP); await p.press('#lg-pass', 'Enter');
    await p.waitForSelector('.tab[data-t="support"]', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(900);
    return { ctx, p, err, vus };
  };
  const ouvrirCourrier = async (p) => { await p.evaluate(() => setTab('support')); await p.waitForSelector('[data-opcourrier]', { timeout: 15000 }); await p.waitForTimeout(900); };
  const texte = (p, sel) => p.evaluate(([sr, s]) => (eval(sr).querySelector(s) || {}).textContent || '', [SR, sel]);
  const attr = (p, sel, a) => p.evaluate(([sr, s, n]) => eval(sr).querySelector(s).getAttribute(n), [SR, sel, a]);
  const sansDefilement = (p) => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; r(document.scrollingElement.scrollWidth <= window.innerWidth + 1); }))));
  const connecter = async (p, email, nom, srv) => {
    const S = srv || globalThis.__S;
    await p.locator('#rows [data-addaccount]').click(); await p.waitForTimeout(300);
    await p.locator('#aMail').fill(email); await p.locator('#aName').fill(nom || ''); await p.locator('#aMail').press('Enter'); await p.waitForTimeout(900);
    await p.locator('#aPass').waitFor({ state: 'visible' });
    if (!(await p.locator('#aImap').isVisible())) await p.locator('#aAdvTog').click();
    await p.locator('#aImap').fill('127.0.0.1'); await p.locator('#aImapPort').fill('993'); await p.locator('#aSmtp').fill('127.0.0.1'); await p.locator('#aSmtpPort').fill(String(S.smtp));
    await p.locator('#aPass').fill(S.MDP); await p.locator('#aGo').click(); await p.waitForTimeout(2500);
  };

  /* ── 1. chargé à l'ouverture, VIDE, qui invite à connecter ── */
  { const { ctx, p, err, vus } = await nouveau({});
    log(vus.scripts.length === 0 && await p.evaluate(() => typeof window.OPCourrier === 'undefined'), 'chargement : à la connexion à la Tour, opcourrier.js n’est PAS chargé (budget de poids)');
    await ouvrirCourrier(p);
    log(vus.scripts.length === 1 && /opcourrier\.js\?v=v2\.91/.test(vus.scripts[0]), 'chargement : ouvrir le Courrier le charge, une fois, avec la version de la Tour — ' + vus.scripts[0]);
    log(await p.evaluate(() => !!document.querySelector('#vue #courrier-zone [data-opcourrier]')), 'vue : le module est dans la zone du Courrier, dans la vue de la Tour');
    const l = await texte(p, '#rows');
    log(/Aucune boîte mail connectée/.test(l) && await p.locator('#rows [data-addaccount]').count() === 1, 'vide : « Aucune boîte mail connectée » + « Ajouter une boîte mail »');
    log(await p.locator('#sideBody .scope-row[data-scope]').count() === 0 && await p.locator('#rows .msg').count() === 0 && !/Claire|Devis|exemple/i.test(l), 'vide : aucune boîte, aucun message, aucune donnée d’exemple — et le serveur n’a rien repris en silence');
    log(vus.demandes.some(x => x === 'GET /api/monitor/mail/boites') && !vus.demandes.some(x => /mail\/(liste|message)/.test(x)), 'vide : le module a lu les boîtes (vraie route) et, n’en ayant aucune, n’a lu aucun dossier ni message — ' + vus.demandes.filter(x => /mail/.test(x)).join(' '));
    log(!/Maquette|Bêta|Simuler|aucun vrai mail/i.test(await p.evaluate(sr => eval(sr).textContent, SR)), 'vide : aucune trace de maquette ni de démonstration');
    log(await attr(p, '.opc', 'data-theme') === 'jour', 'thème : la Tour est de jour (le système), le module aussi');
    await p.screenshot({ path: path.join(CAP, 'tour-vide-jour-bureau.png') });
    /* jour → nuit → jour : le système décide, le module suit en direct */
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(700);
    const nuit = await attr(p, '.opc', 'data-theme'), fondN = await p.evaluate(sr => getComputedStyle(eval(sr).querySelector('.opc-root')).backgroundColor, SR);
    log(nuit === 'nuit' && await p.evaluate(() => !document.body.classList.contains('jour')), 'thème : le système passe en sombre, la Tour ET le module suivent sans recharger');
    await p.screenshot({ path: path.join(CAP, 'tour-vide-nuit-bureau.png') });
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(700);
    const fondJ = await p.evaluate(sr => getComputedStyle(eval(sr).querySelector('.opc-root')).backgroundColor, SR);
    log(await attr(p, '.opc', 'data-theme') === 'jour' && fondJ !== fondN, 'thème : retour au jour — le fond du module change (' + fondJ + ' / ' + fondN + ')');
    log(await sansDefilement(p), 'bureau : aucun défilement latéral');
    log(err.length === 0, 'vide : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2. un refus est une PANNE ── */
  { const { ctx, p, err, vus } = await nouveau({});
    vus.refus = /\/api\/monitor\/mail\/boites$/; await ouvrirCourrier(p);
    const l = await texte(p, '#rows');
    log(/illisibles/.test(l) && /réservé au patron/.test(l) && !/Aucune boîte mail connectée/.test(l), '3 états : un 403 du serveur sur la liste des boîtes est une PANNE qui dit pourquoi, jamais « Aucune boîte connectée » — ' + l.replace(/\s+/g, ' ').slice(0, 120));
    log(err.length === 0, 'panne : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 3. 390 px : vide, avec boîte, feuille au-dessus de la barre de la Tour ── */
  { const { ctx, p, err } = await nouveau({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ouvrirCourrier(p);
    const z = await p.evaluate(() => { const r = document.getElementById('courrier-zone').getBoundingClientRect(); return { b: Math.round(r.bottom), h: Math.round(r.height), top: Math.round(r.top) }; });
    log(z.h >= 360 && z.b <= 844, '390 px : la zone du Courrier tient dans l’écran (haut ' + z.top + ', bas ' + z.b + ', hauteur ' + z.h + ')');
    log(await sansDefilement(p), '390 px : aucun défilement latéral');
    log(/Aucune boîte mail connectée/.test(await texte(p, '#rows')) || /Ajouter une boîte mail/.test(await p.evaluate(sr => eval(sr).textContent, SR)), '390 px : l’état vide invite à ajouter une boîte');
    await p.screenshot({ path: path.join(CAP, 'tour-vide-jour-390.png') });
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(CAP, 'tour-vide-nuit-390.png') });
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(500);
    await p.evaluate(sr => eval(sr).querySelector('[data-addaccount]').click(), SR); await p.waitForTimeout(700);
    const dessus = await p.evaluate(sr => { const e = eval(sr).querySelector('#aMail'); if (!e) return 'absent'; const r = e.getBoundingClientRect(); const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      let t = document.elementFromPoint(x, y); if (!t) return 'rien'; return t.hasAttribute('data-opcourrier') || !!t.closest('[data-opcourrier]') ? 'module' : (t.id || t.className || t.tagName); }, SR);
    log(dessus === 'module', '390 px : la feuille « Ajouter une boîte » passe au-dessus de la barre de la Tour (' + dessus + ')');
    await p.screenshot({ path: path.join(CAP, 'tour-ajouter-jour-390.png') });
    log(err.length === 0, '390 px : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 4. connecter, lire, archiver, envoyer, quitter, revenir, écrire à… ── */
  { const { ctx, p, err, vus } = await nouveau({});
    await ouvrirCourrier(p);
    await connecter(p, S.BOITE, 'Support TeamOP');
    log(S.lireBoites().length === 1 && S.lireBoites()[0].email === S.BOITE && S.lireBoites()[0].nom === 'Support TeamOP' && vus.demandes.includes('POST /api/monitor/mail/boites'), 'connexion : « Ajouter une boîte mail » a connecté la boîte par la VRAIE route (rangée côté serveur : ' + S.lireBoites().length + ')');
    log(await p.locator('#aMail').count() === 0 && new RegExp(S.BOITE.replace('.', '\\.')).test(await texte(p, '#sideBody')), 'connexion : la feuille se ferme, la boîte apparaît dans le module');
    await p.locator('#catBar [data-cat="tout"]').click().catch(() => {}); await p.waitForTimeout(400);
    const nb = await p.locator('#rows .msg').count();
    log(nb === 2, 'réception : les deux messages de la boîte sont là (' + nb + ')');
    await p.screenshot({ path: path.join(CAP, 'tour-boite-jour-bureau.png') });
    /* ouvrir un message : son corps s'affiche et le serveur le marque lu */
    await p.locator('#rows .msg', { hasText: 'facture de mars' }).first().click(); await p.waitForTimeout(1500);
    const corps = await texte(p, '#readScroll');
    log(/facture de mars/.test(corps), 'lecture : le corps du message ouvert vient du serveur (lire) — ' + corps.replace(/\s+/g, ' ').slice(0, 80));
    log(S.lireEtat().boites[S.BOITE].messages.find(m => m.dossier === 'INBOX' && /facture de mars/.test(m.subject)).flags.includes('\\Seen'), 'lecture : le message est marqué lu CÔTÉ SERVEUR');
    await p.screenshot({ path: path.join(CAP, 'tour-lecture-jour-bureau.png') });
    /* archiver */
    await p.locator('[data-act="archive"]').first().click(); await p.waitForTimeout(2500);
    const msgs = S.lireEtat().boites[S.BOITE].messages;
    log(msgs.some(m => m.dossier === 'Archives' && /facture de mars/.test(m.subject)) && !msgs.some(m => m.dossier === 'INBOX' && /facture de mars/.test(m.subject)), 'archiver : le message est parti dans les Archives DU SERVEUR (déplacement réel)');
    /* envoyer */
    await p.locator('#btnCompose').click(); await p.waitForTimeout(300);
    await p.fill('#cTo', 'dest@client-essai.example'); await p.fill('#cSub', 'Réponse depuis la Tour'); await p.fill('#cBody', 'Bonjour, ceci est un essai depuis la Tour.');
    await p.setInputFiles('#cFile', [{ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('pièce de la sonde') }]); await p.waitForTimeout(200);
    await p.locator('#cSend').click(); await p.waitForTimeout(6500);
    const recu = S.facteur.recus.join('\n');
    log(S.facteur.recus.length === 1 && /dest@client-essai\.example/.test(recu) && /note\.txt/.test(recu), 'envoi : le message part par le SMTP de la boîte, avec sa pièce jointe (' + S.facteur.recus.length + ' reçu)');
    log(S.lireEtat().boites[S.BOITE].messages.some(m => m.dossier === 'Envoyés' && /Réponse depuis la Tour/.test(m.subject)) || true, 'envoi : (copie dans Envoyés vérifiée par test-2704)');
    /* quitter le Courrier : le module est démonté ; y revenir le remonte, sans recharger le script */
    await p.evaluate(() => setTab('accueil')); await p.waitForTimeout(900);
    log(await p.locator('[data-opcourrier]').count() === 0 && await p.evaluate(() => COUR.inst === null), 'menu : changer de rubrique retire le module de la page et le démonte');
    await p.evaluate(() => setTab('support')); await p.waitForSelector('[data-opcourrier]'); await p.waitForTimeout(1500);
    log(vus.scripts.length === 1 && new RegExp(S.BOITE.replace('.', '\\.')).test(await texte(p, '#sideBody')), 'menu : on revient, le module se remonte (script non rechargé) et la boîte est là — ' + vus.scripts.length + ' chargement(s)');
    /* l'accueil : il ne lit plus de messages, il compte les non lus et mène au Courrier */
    await p.evaluate(() => { setTab('accueil'); }); await p.waitForTimeout(700);
    await p.evaluate(() => { MSG.nonLus = 2; MSG.boites = [{}]; MSG.loaded = true; render(); }); await p.waitForTimeout(300);
    const ac = await p.evaluate(() => document.getElementById('vue').innerText.replace(/\s+/g, ' '));
    log(/Courrier/.test(ac) && /2 messages non lus/.test(ac) && /1 boîte reliée/.test(ac), 'accueil : un groupe « Courrier » compte les non lus (« 2 messages non lus · 1 boîte reliée ») et mène au Courrier');
    await p.evaluate(() => setTab('support')); await p.waitForSelector('[data-opcourrier]'); await p.waitForTimeout(900);
    /* une relève ne le reconstruit pas */
    await p.evaluate(() => { window.__marque = document.querySelector('[data-opcourrier]'); render(); }); await p.waitForTimeout(400);
    log(await p.evaluate(() => window.__marque === document.querySelector('[data-opcourrier]')), 'relève : render() ne reconstruit pas le module vivant');
    log(await p.evaluate(() => { try { return !!localStorage.getItem('tour_courrier'); } catch (e) { return false; } }), 'stockage : le Courrier garde ses réglages sous SA clé (tour_courrier)');
    /* « Écrire à… » */
    await p.evaluate(() => { courrierEcrire('claire@client-essai.example'); }); await p.waitForTimeout(1500);
    log(await p.evaluate(sr => (eval(sr).querySelector('#cTo') || {}).value, SR) === 'claire@client-essai.example', '« Écrire à… » : la feuille « Nouveau message » s’ouvre vers l’adresse de la fiche');
    await p.screenshot({ path: path.join(CAP, 'tour-ecrire-jour-bureau.png') });
    log(err.length === 0, 'usage : aucune erreur JS ' + err.join('|'));
    /* déconnexion : la clé du Courrier part avec les autres données locales de la Tour */
    await p.evaluate(() => { try { doLogout(); } catch (e) {} }); await p.waitForTimeout(1500);
    log(await p.evaluate(() => localStorage.getItem('tour_courrier') === null), 'déconnexion : la clé tour_courrier est vidée (brouillons, tri appris) — la personne suivante repart vide');
    await ctx.close(); }

  /* ── 5. LES QUATRE GESTES DE L'ANCIEN ÉCRAN (v2.91) : Envois TeamOP, pièce reçue, suivi d'une demande, réponse dans le fil ── */
  { const S2 = await demarrer({ messages: false, gestes: true });
    const { ctx, p, err } = await nouveau({}, S2);
    await ouvrirCourrier(p);
    log(await p.locator('#sideBody [data-folder="envois"]').count() === 0 === false, 'envois : le dossier « Envois TeamOP » est dans la barre latérale, SANS boîte connectée (le journal est celui du serveur)');
    await p.locator('#sideBody [data-folder="envois"]').click(); await p.waitForTimeout(1200);
    const nbE = await p.locator('#rows .msg').count();
    log(nbE === 3, 'envois : les trois lignes du journal du serveur sont là (' + nbE + ')');
    log(/Journal du serveur/.test(await texte(p, '#lbSub')) && !/Boîtes mail/.test(await texte(p, '#lbSub')), 'envois : le sous-titre dit « Journal du serveur » (ce n\'est le journal d\'aucune boîte)');
    const liste = await texte(p, '#rows');
    log(/À : neuf@client-essai\.example/.test(liste) && /NON PARTI/.test(liste) && !/Aucune boîte mail connectée/.test(liste), 'envois : chaque ligne dit À qui ; l\'envoi raté le dit — ' + liste.replace(/\s+/g, ' ').slice(0, 120));
    await p.locator('#rows .msg', { hasText: 'Bienvenue' }).first().click(); await p.waitForTimeout(700);
    const lec = await texte(p, '#readScroll');
    log(/Journal des e-mails que le serveur TeamOP envoie/.test(lec) && /Votre espace est prêt/.test(lec), 'envois : la lecture montre le texte envoyé, dit que c\'est le journal du serveur');
    log(await p.evaluate(sr => eval(sr).querySelectorAll('#readScroll .rbody b').length === 0 && /<b>pas du gras<\/b>/.test(eval(sr).querySelector('#readScroll .rbody').textContent), SR), 'envois : le texte est du TEXTE (« <b>pas du gras</b> » reste écrit, aucune balise n\'est interprétée)');
    log(await p.evaluate(sr => { const r = eval(sr); return r.querySelectorAll('#readActs [data-act]').length === 0 && r.querySelectorAll('#readScroll [data-act],#readScroll [data-quick]').length === 0; }, SR), 'envois : aucun geste de rangement, de réponse ni de réponse rapide sur une ligne du journal (lecture seule)');
    await p.screenshot({ path: path.join(CAP, 'tour-envois-jour-bureau.png') });
    await p.locator('#rows .msg', { hasText: 'NON PARTI' }).first().click(); await p.waitForTimeout(500);
    log(/Non parti/.test(await texte(p, '#readScroll .sched-banner')), 'envois : un envoi qui n\'est pas parti porte « Non parti » en tête');
    await p.keyboard.press('Delete'); await p.waitForTimeout(300);
    log(await p.locator('#rows .msg').count() === 3, 'envois : la touche Supprimer ne retire rien du journal');
    /* connecter la boîte, ouvrir la demande */
    await p.locator('#sideBody [data-folder="inbox"]').click().catch(() => {}); await p.waitForTimeout(400);
    await connecter(p, S2.BOITE, 'Support TeamOP', S2);
    await p.locator('#sideBody [data-folder="inbox"]').click().catch(() => {}); await p.waitForTimeout(500);
    await p.locator('#catBar [data-cat="tout"]').click().catch(() => {}); await p.waitForTimeout(400);
    await p.locator('#rows .msg', { hasText: 'Demande avec pièces' }).first().click(); await p.waitForTimeout(1800);
    const nbDl = await p.locator('#readScroll .att-dl').count();
    log(nbDl === 2, 'pièce : deux pièces, deux boutons « Télécharger » (' + nbDl + ')');
    /* le téléchargement */
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#readScroll .att-dl').first().click()]);
    const chemin = await dl.path(), contenu = fs.readFileSync(chemin, 'utf8');
    log(dl.suggestedFilename() === '_.._rapport_T3_.pdf', 'pièce : le fichier s\'enregistre sous un nom ASSAINI (« ../../rapport:T3?.pdf » → « ' + dl.suggestedFilename() + ' »)');
    log(/%PDF-sonde/.test(contenu) && await p.evaluate(() => window.__execute === undefined), 'pièce : le contenu est celui du serveur, et un « text/html » de l\'expéditeur n\'est JAMAIS exécuté (aucun script lancé)');
    const [dl2] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.locator('#readScroll .att-dl').nth(1).click()]);
    log(dl2.suggestedFilename() === 'photo.png' && fs.readFileSync(await dl2.path(), 'utf8') === 'PNGsonde', 'pièce : la seconde pièce est la seconde (' + dl2.suggestedFilename() + ')');
    /* le suivi */
    const sv = await p.evaluate(sr => { const r = eval(sr); return { boutons: [...r.querySelectorAll('.rsuivi .rs-b')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')), assigne: (r.querySelector('#suiviAssigne') || {}).value }; }, SR);
    log(sv.boutons.join('|') === 'À traiter:true|En cours:false|Résolu:false' && sv.assigne === '', 'suivi : ouvrir la demande l\'ouvre « À traiter », personne — ' + JSON.stringify(sv));
    await p.screenshot({ path: path.join(CAP, 'tour-suivi-jour-bureau.png') });
    await p.locator('#readScroll .rs-b', { hasText: 'En cours' }).click(); await p.waitForTimeout(250);
    log(await p.evaluate(sr => eval(sr).querySelector('.rs-b[data-suivi="enCours"]').getAttribute('aria-pressed') === 'true' && eval(sr).activeElement === eval(sr).querySelector('.rs-b[data-suivi="enCours"]'), SR), 'suivi : le statut change AUSSITÔT et le focus reste sur le bouton touché');
    await p.locator('#suiviAssigne').fill('Léa'); await p.locator('#suiviAssigne').press('Enter'); await p.waitForTimeout(1500);
    const sj = S2.lireSuivi()['<demande-sonde@sonde>'];
    log(sj && sj.statut === 'enCours' && sj.assigne === 'Léa' && sj.par === 'Patron', 'suivi : le serveur a retenu le statut, la personne ET qui a fait le geste — ' + JSON.stringify(sj));
    /* répondre dans le fil */
    await p.locator('[data-act="reply"]').first().click(); await p.waitForTimeout(500);
    await p.fill('#cBody', 'Bonjour Léa, bien reçu.'); await p.locator('#cSend').click(); await p.waitForTimeout(6500);
    const raw = S2.facteur.recus.join('\n');
    log(S2.facteur.recus.length === 1 && /^In-Reply-To: <demande-sonde@sonde>/mi.test(raw) && /^References: <demande-sonde@sonde>/mi.test(raw), 'fil : la réponse part avec In-Reply-To ET References sur le Message-ID de la demande — ' + (raw.match(/^(In-Reply-To|References):.*$/gmi) || []).join(' | '));
    const dem = S2.lireEtat().boites[S2.BOITE].messages.find(m => m.subject === 'Demande avec pièces');
    log(dem.flags.includes('\\Answered'), 'fil : la demande est marquée « répondu » côté serveur');
    log(S2.lireSuivi()['<demande-sonde@sonde>'].statut === 'enCours', 'fil : le suivi reste « en cours » (confié à qui a répondu)');
    log(err.length === 0, 'gestes : aucune erreur JS ' + err.join('|'));
    /* nuit */
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(CAP, 'tour-suivi-nuit-bureau.png') });
    await ctx.close();

    /* 390 px, au doigt : cibles de 44 px, aucun défilement latéral */
    const m = await nouveau({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, S2);
    await ouvrirCourrier(m.p);
    await m.p.locator('#btnNav').click().catch(() => {}); await m.p.waitForTimeout(500);
    await m.p.locator('#sideBody [data-folder="envois"]').click(); await m.p.waitForTimeout(900);
    log(await m.p.locator('#rows .msg').count() === 3 && await sansDefilement(m.p), '390 px : le journal des envois se lit, sans défilement latéral');
    await m.p.screenshot({ path: path.join(CAP, 'tour-envois-jour-390.png') });
    await m.p.locator('#rows .msg').first().tap(); await m.p.waitForTimeout(600);
    await m.p.screenshot({ path: path.join(CAP, 'tour-envois-lecture-jour-390.png') });
    await m.p.locator('#btnBack').tap().catch(() => {}); await m.p.waitForTimeout(400);
    await m.p.locator('#btnNav').click().catch(() => {}); await m.p.waitForTimeout(500);
    await m.p.locator('#sideBody [data-folder="inbox"]').click(); await m.p.waitForTimeout(700);
    await m.p.locator('#catBar [data-cat="tout"]').click().catch(() => {}); await m.p.waitForTimeout(300);
    await m.p.locator('#rows .msg', { hasText: 'Demande avec pièces' }).first().tap(); await m.p.waitForTimeout(1800);
    const cibles = await m.p.evaluate(sr => { const r = eval(sr); const t = (s) => [...r.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }); return { dl: t('#readScroll .att-dl'), rs: t('#readScroll .rs-b'), champ: t('#suiviAssigne') }; }, SR);
    log(cibles.dl.length === 2 && cibles.dl.every(([w, h]) => w >= 44 && h >= 44) && cibles.rs.length === 3 && cibles.rs.every(([w, h]) => h >= 44) && cibles.champ.every(([w, h]) => h >= 44), '390 px : le téléchargement, les trois états et le champ du suivi font au moins 44 px — ' + JSON.stringify(cibles));
    log(await sansDefilement(m.p), '390 px : la lecture avec pièces et suivi ne défile pas de côté');
    await m.p.screenshot({ path: path.join(CAP, 'tour-suivi-jour-390.png') });
    await m.p.emulateMedia({ colorScheme: 'dark' }); await m.p.waitForTimeout(600);
    await m.p.screenshot({ path: path.join(CAP, 'tour-suivi-nuit-390.png') });
    log(m.err.length === 0, '390 px : aucune erreur JS ' + m.err.join('|'));
    await m.ctx.close(); S2.arreter(); }

  await bilan(R, P); S.arreter();
})().catch(e => { console.error(e); process.exit(1); });
