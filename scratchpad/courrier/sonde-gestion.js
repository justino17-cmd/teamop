/* Sonde OP GESTION × OP Courrier — la « Boîte mail » de `beta.html` est le MODULE `opcourrier.js`, branché sur les vraies routes (ici répondues par la sonde).
   ⛔ BÊTA UNIQUEMENT (beta.html servie en 127.0.0.1, espace bêta isolé, aucune donnée d'entreprise) — jamais app.html, jamais teamop.fr. Les appels vers api.teamop.fr sont RÉPONDUS
   par la sonde (jamais joints) ; tout le reste qui sort de 127.0.0.1 est refusé ET compté.
     1. la vue : Boîte mail ouvre le module dans la zone de contenu, la barre / le menu d'OP GESTION restent utilisables (on change de rubrique et on revient) ;
     2. l'état vide (aucune donnée d'exemple), les TROIS ÉTATS (un refus du serveur n'est pas « aucune boîte »), la connexion d'une boîte par l'interface, l'envoi ;
     3. le jour et la nuit d'OP GESTION (data-theme sur <html>) sont suivis, en direct ;
     4. 390 px et bureau : aucun défilement latéral, aucune exception ; une feuille ouverte passe au-dessus de la barre d'OP GESTION ;
     5. le module n'est chargé QU'à l'ouverture de la vue (pas au démarrage).
   Lancer : voir l'en-tête de pilote.js. */
const { ouvrir, bilan } = require('./pilote.js');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const REPONSES = [
  { ts: Date.now() - 3600000, boite: 'ent@atelier-essai.example', from: 'claire.dubois@sarl-mercier.fr', fromName: 'Claire Essai', subject: 'Devis cuisine', text: 'Bonjour,\n\nPouvez-vous me confirmer le devis de la cuisine avant vendredi, afin que je puisse commander les meubles ? Merci d’avance.\n\nClaire', mid: 'm1' },
  { ts: Date.now() - 7200000, boite: 'ent@atelier-essai.example', from: 't.berger@berger-batiment.fr', fromName: 'Paul Essai', subject: 'Livraison jeudi', text: 'Bonjour, la livraison des meubles est prévue jeudi matin. Pouvez-vous confirmer que quelqu’un sera présent pour la réceptionner ?', mid: 'm2' },
  { ts: Date.now() - 86400000, boite: '', from: 'lea.fontaine@atelier-nord.fr', fromName: 'Sans Boîte', subject: 'Message sans boîte nommée', text: 'Bonjour, voici le compte rendu de la réunion de mardi. Dites-moi si j’ai oublié quelque chose, nous en reparlerons demain.', mid: 'm3' }
];

(async () => {
  const P = await ouvrir();
  const nouveau = async (opts, api) => {
    const ctx = await P.ctxPour(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
    const vus = { demandes: [], bodies: [] }; const etat = Object.assign({ boites: [{ id: 'mb1', email: 'ent@atelier-essai.example', name: 'Atelier Essai' }], replies: REPONSES, modeBoites: 'ok', modeReplies: 'ok', connexion: 'ok', envoi: 'ok' }, api || {});
    vus.etat = etat;
    await ctx.route(/^https:\/\/api\.teamop\.fr\//, async (route) => {
      const rq = route.request(), u = new URL(rq.url()); vus.demandes.push(rq.method() + ' ' + u.pathname);
      if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const json = (o, st) => route.fulfill({ status: st || 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify(o) });
      const refus = () => route.fulfill({ status: 403, headers: Object.assign({ 'content-type': 'text/plain' }, CORS), body: 'preuve de clé requise' });
      if (u.pathname === '/api/mailboxes') return etat.modeBoites === 'refus' ? refus() : json({ mailboxes: etat.boites });
      if (u.pathname === '/api/replies') return etat.modeReplies === 'refus' ? refus() : json({ replies: etat.replies });
      if (u.pathname === '/api/mailbox/connect') { let b = {}; try { b = rq.postDataJSON(); } catch (e) {} vus.bodies.push(['connect', b]);
        if (etat.connexion === 'refus') return json({ error: 'Connexion envoi (SMTP) refusée : identifiants incorrects (essai)' }, 400);
        etat.boites.push({ id: 'mb' + (etat.boites.length + 1), email: b.email, name: b.name }); return json({ ok: true, id: 'mb' + etat.boites.length, email: b.email }); }
      if (u.pathname === '/api/mailbox/disconnect') { let b = {}; try { b = rq.postDataJSON(); } catch (e) {} vus.bodies.push(['disconnect', b]); etat.boites = etat.boites.filter(x => x.id !== b.id); return json({ ok: true }); }
      if (u.pathname === '/api/sendmail') { let b = {}; try { b = rq.postDataJSON(); } catch (e) {} vus.bodies.push(['sendmail', b]); return etat.envoi === 'refus' ? json({ error: 'refusé par le facteur (essai)' }, 500) : json({ ok: true }); }
      if (u.pathname === '/api/version') return json({ min: 0 });
      return route.fulfill({ status: 503, headers: Object.assign({ 'content-type': 'text/plain' }, CORS), body: 'indisponible (essai)' });   // toute autre route : panne, jamais un « ok » que l’application lirait comme un verdict
    });
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) err.push('console: ' + m.text()); });
    const scripts = []; p.on('request', q => { if (/opcourrier\.js/.test(q.url())) scripts.push(q.url()); });
    await p.goto(P.base + '/beta.html'); 
    await p.waitForFunction(() => typeof db !== 'undefined' && !!db, null, { timeout: 90000 });
    await p.evaluate(() => { window.confirm = () => true; window.alert = () => {}; window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); window.pushPropose = function () {};
      if (!db.users.length) { db.users.push({ id: 'u1', prenom: 'Essai', nom: 'B', role: 'admin', username: 'j', pass: 'x', actif: true, pref: {} }); save(); }
      currentUser = db.users[0]; try { localStorage.setItem('elanB_onboarded_' + currentUser.id, '1'); } catch (e) {} enterApp(currentUser); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { try { closeModal(); } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); });
    return { ctx, p, err, vus, scripts };
  };
  const ouvrirMail = async (p) => { await p.evaluate(() => { window.horsLigneDebut = function () {}; try { localStorage.setItem('elanB_sync_team', 'equipe-essai'); } catch (e) {} go('boiteMail'); }); await p.waitForSelector('[data-opcourrier]', { timeout: 20000 }); await p.waitForTimeout(900); };
  const attr = (p, sel, a) => p.evaluate(([sr, s, n]) => eval(sr).querySelector(s).getAttribute(n), [SR, sel, a]);
  const texte = (p, sel) => p.evaluate(([sr, s]) => (eval(sr).querySelector(s) || {}).textContent || '', [SR, sel]);

  /* ── 1. la vue, le menu, le module chargé à la demande ── */
  { const { ctx, p, err, vus, scripts } = await nouveau({});
    log(scripts.length === 0 && await p.evaluate(() => typeof window.OPCourrier === 'undefined'), 'chargement : au démarrage de l’application, opcourrier.js n’est PAS chargé (budget de poids)');
    await ouvrirMail(p);
    log(scripts.length === 1 && /opcourrier\.js\?v=769/.test(scripts[0]), 'chargement : ouvrir la Boîte mail charge opcourrier.js, une fois, avec la version — ' + scripts[0]);
    log(await p.locator('[data-opcourrier]').count() === 1 && await p.evaluate(() => !!document.querySelector('#content #courrier-zone [data-opcourrier]')), 'vue : le module s’affiche dans la zone de contenu d’OP GESTION');
    await p.locator('#catBar [data-cat="tout"]').click(); await p.waitForTimeout(200);
    log(await p.locator('#rows .msg').count() === 3, 'vue : les trois messages reçus de /api/replies sont là (dont celui sans boîte nommée, rangé dans la première boîte) — ' + await p.locator('#rows .msg').count());
    log(await p.evaluate(() => document.querySelector('#topbar-actions').innerHTML.trim() === '' && document.getElementById('page-title').textContent === 'Boîte mail'), 'vue : le titre de la page est « Boîte mail » et la barre n’affiche plus les anciens boutons (Boîtes, Écrire)');
    log(!/Maquette|aucun vrai mail|Bêta —|Simuler|exemple/i.test(await p.evaluate(sr => eval(sr).textContent, SR)), 'vue : aucune trace de maquette, de démonstration ni de « bêta » dans le module');
    const dem = vus.demandes.join(' '); log(/GET \/api\/mailboxes/.test(dem) && /GET \/api\/replies/.test(dem) && vus.demandes.filter(x => x === 'GET /api/replies').length === 1, 'vue : /api/mailboxes puis UNE seule lecture de /api/replies pour toutes les boîtes — ' + vus.demandes.filter(x => /api\//.test(x)).join(', '));
    /* le menu d'OP GESTION reste utilisable : on change de rubrique puis on revient */
    await p.evaluate(() => go('dashboard')); await p.waitForTimeout(800);
    log(await p.locator('[data-opcourrier]').count() === 0 && await p.evaluate(() => current) === 'dashboard', 'menu : changer de rubrique retire le module de la page');
    await p.evaluate(() => go('boiteMail')); await p.waitForSelector('[data-opcourrier]'); await p.waitForTimeout(700);
    await p.locator('#catBar [data-cat="tout"]').click(); await p.waitForTimeout(200);
    log(await p.locator('[data-opcourrier]').count() === 1 && await p.locator('#rows .msg').count() === 3 && scripts.length === 1, 'menu : on revient, le module se remonte (le script n’est pas rechargé) — ' + await p.locator('#rows .msg').count() + ' messages');
    /* un rafraîchissement automatique de la rubrique ne reconstruit pas le module */
    await p.evaluate(() => { window.__marque = document.querySelector('[data-opcourrier]'); views.boiteMail(); }); await p.waitForTimeout(300);
    log(await p.evaluate(() => window.__marque === document.querySelector('[data-opcourrier]')), 'rafraîchissement : rappeler la vue ne reconstruit pas le module (la lecture en cours survit)');
    log(err.length === 0, 'vue : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2. vide, trois états, connexion, envoi ── */
  { const { ctx, p, err } = await nouveau({}, { boites: [], replies: [] });
    await ouvrirMail(p);
    const l = await texte(p, '#rows');
    log(/Aucune boîte mail connectée/.test(l) && await p.locator('#rows [data-addaccount]').count() === 1, 'vide : « Aucune boîte mail connectée » + « Ajouter une boîte mail » — premier affichage, rien d’autre');
    log(await p.locator('#sideBody .scope-row[data-scope]').count() === 0 && await p.locator('#rows .msg').count() === 0, 'vide : aucune boîte, aucun message (aucune donnée d’exemple, aucune boîte reprise en silence)');
    log(err.length === 0, 'vide : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({}, { modeBoites: 'refus' });
    await ouvrirMail(p);
    const l = await texte(p, '#rows');
    log(/Boîtes mail illisibles/.test(l) && /accès refusé par le serveur/.test(l) && !/Aucune boîte mail connectée/.test(l), '3 états : un 403 en text/plain sur /api/mailboxes est une PANNE qui se dit, jamais « Aucune boîte connectée » — ' + l.slice(0, 110));
    await ctx.close(); }
  { const { ctx, p, err } = await nouveau({}, { modeReplies: 'refus' });
    await ouvrirMail(p);
    const l = await texte(p, '#rows');
    log(/Réception indisponible/.test(l) && !/Aucun message/.test(l) && await p.locator('#sideBody .scope-row[data-scope]').count() >= 1, '3 états : un 403 sur /api/replies → « Réception indisponible » (la boîte reste connectée), jamais « Aucun message »');
    await ctx.close(); }
  { const { ctx, p, err, vus } = await nouveau({}, { boites: [], replies: [] });
    await ouvrirMail(p);
    await p.locator('#rows [data-addaccount]').click(); await p.waitForTimeout(250);
    await p.locator('#aMail').fill('contact@atelier-essai.example'); await p.locator('#aName').focus(); await p.waitForTimeout(600);
    log(/Le serveur reconnaît la messagerie à la connexion/.test(await texte(p, '#aDet')) && await p.locator('#aAdv').isVisible() === false, 'connexion : aucun réglage de serveur n’est proposé (le serveur choisit les siens), aucun appel DNS');
    log(await p.locator('#kKind').isVisible() === false, 'connexion : le côté n’est pas demandé (OP GESTION est un outil d’entreprise : côté Pro)');
    await p.locator('#aPass').fill('mdp-essai'); vus.etat.connexion = 'refus'; await p.locator('#aGo').click(); await p.waitForTimeout(700);
    log(/identifiants incorrects/.test(await texte(p, '#aMailErr')) && await p.locator('#aMail').count() === 1, 'connexion refusée : le message DU SERVEUR s’affiche dans la feuille, qui reste ouverte');
    vus.etat.connexion = 'ok'; await p.locator('#aGo').click(); await p.waitForTimeout(1500);
    const co = vus.bodies.filter(b => b[0] === 'connect');
    log(co.length === 2 && co[1][1].email === 'contact@atelier-essai.example' && co[1][1].pass === 'mdp-essai' && co[1][1].teamId === 'equipe-essai', 'connexion : POST /api/mailbox/connect avec { teamId, email, pass, name } — ' + JSON.stringify(Object.assign({}, co[1] && co[1][1], { pass: '…' })));
    log(await p.locator('#aMail').count() === 0 && /contact@atelier-essai\.example/.test(await texte(p, '#sideBody')), 'connexion : la feuille se ferme, la boîte apparaît (relue de /api/mailboxes)');
    /* envoi */
    await p.locator('#btnCompose').click(); await p.waitForTimeout(250);
    await p.fill('#cTo', 'client@exemple.fr'); await p.fill('#cSub', 'Essai OP Courrier'); await p.fill('#cBody', 'Bonjour, ceci est un essai.');
    await p.setInputFiles('#cFile', [{ name: 'devis.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 essai') }]); await p.waitForTimeout(150);
    await p.locator('#cSend').click(); await p.waitForTimeout(6200);
    const en = vus.bodies.filter(b => b[0] === 'sendmail');
    log(en.length === 1 && en[0][1].to === 'client@exemple.fr' && en[0][1].subject === 'Essai OP Courrier' && en[0][1].useMailbox && en[0][1].useMailbox.id === 'mb1' && /essai/.test(en[0][1].text) && en[0][1].atts && en[0][1].atts.length === 1 && en[0][1].atts[0].filename === 'devis.pdf' && Buffer.from(en[0][1].atts[0].content, 'base64').toString().startsWith('%PDF'),
      'envoi : POST /api/sendmail { teamId, to, subject, text, useMailbox:{id}, atts:[base64] } — ' + JSON.stringify(en[0] && Object.assign({}, en[0][1], { atts: en[0][1].atts && en[0][1].atts.length + ' pièce(s)', text: '…' })));
    log(/Message envoyé/.test(await texte(p, '#toast')), 'envoi : « Message envoyé » après la réponse du serveur');
    /* envoi refusé */
    vus.etat.envoi = 'refus';
    await p.locator('#btnCompose').click(); await p.waitForTimeout(250); await p.fill('#cTo', 'autre@exemple.fr'); await p.fill('#cSub', 'Refusé'); await p.fill('#cBody', 'x'); await p.locator('#cSend').click(); await p.waitForTimeout(6200);
    log(/Envoi impossible/.test(await texte(p, '#toast')) && /refusé par le facteur/.test(await texte(p, '#toast')), 'envoi refusé : l’erreur du serveur est DITE, le message retourne aux brouillons');
    /* déconnexion */
    await p.locator('#sideBody .scope-row[data-scope="mb1"]').click({ button: 'right' }).catch(() => {});
    log(err.length === 0, 'connexion / envoi : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 3. le jour et la nuit d'OP GESTION ── */
  { const { ctx, p, err } = await nouveau({ colorScheme: 'light' });
    await ouvrirMail(p);
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await p.waitForTimeout(300);
    const n = await attr(p, '.opc', 'data-theme'); const fondN = await p.evaluate(sr => getComputedStyle(eval(sr).querySelector('.opc-root')).backgroundColor, SR);
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await p.waitForTimeout(300);
    const j = await attr(p, '.opc', 'data-theme'); const fondJ = await p.evaluate(sr => getComputedStyle(eval(sr).querySelector('.opc-root')).backgroundColor, SR);
    log(n === 'nuit' && j === 'jour' && fondN !== fondJ, 'thème : le module suit le réglage jour / nuit d’OP GESTION en direct (data-theme sur <html>) — ' + fondJ + ' / ' + fondN);
    await p.evaluate(() => document.documentElement.removeAttribute('data-theme')); await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(300);
    log(await attr(p, '.opc', 'data-theme') === 'nuit', 'thème : sans réglage d’OP GESTION, l’appareil décide (sombre → nuit)');
    log(err.length === 0, 'thème : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 4. 390 px et bureau : pas de défilement latéral ; la feuille passe au-dessus de la barre d'OP GESTION ── */
  for (const [vp, nom, tactile] of [[{ width: 1440, height: 900 }, 'bureau', false], [{ width: 390, height: 844 }, '390 px', true]]) {
    const { ctx, p, err } = await nouveau({ viewport: vp, hasTouch: tactile, isMobile: tactile });
    await ouvrirMail(p);
    const mesure = () => p.evaluate((sr) => { const z = document.getElementById('courrier-zone'), r = z.getBoundingClientRect(), root = eval(sr).querySelector('.opc-root');
      return { fmt: eval(sr).querySelector('.opc').getAttribute('data-fmt'), larg: Math.round(r.width), haut: Math.round(r.height), bas: Math.round(r.bottom), fenetre: innerHeight, page: document.documentElement.scrollWidth - innerWidth, module: root.scrollWidth - root.clientWidth }; }, SR);
    const m = await mesure();
    log(m.page <= 1 && m.module <= 1, nom + ' : aucun défilement latéral (page ' + m.page + ' px, module ' + m.module + ' px) — format ' + m.fmt + ', zone ' + m.larg + '×' + m.haut);
    log(m.haut >= 360 && m.bas <= m.fenetre + 1, nom + ' : la zone prend ce qui reste de la fenêtre, sans la dépasser (bas à ' + m.bas + ' sur ' + m.fenetre + ')');
    await p.locator('#btnCompose').click(); await p.waitForTimeout(400);
    const haut = await p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, 6); return e ? (e.id || e.tagName + '.' + String(e.className).slice(0, 30)) : null; });
    log(await p.evaluate(() => !!document.querySelector('[data-opcourrier]').shadowRoot.querySelector('#overlay')) && /^DIV$|^DIV\./.test(String(haut)) && await p.evaluate(() => document.elementFromPoint(innerWidth / 2, 6) === document.querySelector('[data-opcourrier]')), nom + ' : la feuille « Nouveau message » passe AU-DESSUS de la barre d’OP GESTION (pile en haut de l’écran : ' + haut + ')');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => go('dashboard')); await p.waitForTimeout(600); await p.evaluate(() => go('boiteMail')); await p.waitForTimeout(800);
    const m2 = await mesure(); log(m2.page <= 1 && m2.module <= 1, nom + ' : aucun défilement latéral après un aller-retour de rubrique');
    log(err.length === 0, nom + ' : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* les polices de la page d'OP GESTION elle-même (Google Fonts) sont refusées par le pilote : ce n'est pas le module */
  const dehors = P.sorties.filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
  log(dehors.length === 0, 'réseau : rien n’est sorti de 127.0.0.1 en dehors des appels à api.teamop.fr (répondus par la sonde) et des polices de la page — ' + JSON.stringify(dehors.slice(0, 5)));
  P.sorties.length = 0;
  await bilan(R, P);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
