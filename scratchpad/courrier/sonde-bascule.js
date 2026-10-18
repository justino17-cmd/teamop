/* Sonde OP COURRIER (bêta) — ce que les trois sondes de la maquette (ctx, miss, sign) ne jouent pas : ce que l'INTÉGRATION a changé.
     · le jour et la nuit suivent l'appareil, sans bouton ni `data-theme` (on bascule `colorScheme` : la page se repeint, <html> ne reçoit rien) ;
     · le stockage porte le préfixe bêta, et une page dont le stockage JETTE (navigation privée, quota) démarre quand même ;
     · le côté d'ouverture : #pro / #perso, un changement de hash en cours de route, le hash qui suit le côté choisi ;
     · LA LECTURE DU MX DERRIÈRE UN GESTE : rien ne part pendant la frappe ; une demande, avec le seul domaine, quand on quitte le champ ou
       qu'on appuie sur Entrée ; rien du tout quand on ferme la feuille (Échap) ; un domaine grand public ne fait aucun appel ;
     · le mode démo : sans `window.OPCOURRIER_SERVEUR` tout est là ; avec, plus un exemple, plus d'arrivée simulée, plus de simulation de signature,
       et envoyer / ajouter une boîte refusent honnêtement ;
     · aucune requête hors 127.0.0.1 hormis les deux annuaires DNS (ici REPONDUS par la sonde, jamais joints) ; aucune erreur JS, aucune violation de la politique.
   Lancer : voir l'en-tête de pilote.js. Chiffre attendu : tout vert (bilan imprimé). */
const { ouvrir, bilan } = require('./pilote.js');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const MX = (h) => JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 ' + h + '.' }] });

(async () => {
  const P = await ouvrir();
  const nouveau = async (opts, init) => {
    const ctx = await P.ctxPour(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
    const dns = [];
    /* les deux annuaires sont REPONDUS ici (jamais joints) : on note ce qui est demandé */
    await ctx.route(/^https:\/\/(dns\.google|cloudflare-dns\.com)\//, (route) => { dns.push(route.request().url()); route.fulfill({ status: 200, contentType: 'application/json', body: MX('ssl0.ovh.net') }); });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error') err.push('console: ' + m.text()); });
    return { ctx, p, err, dns };
  };

  /* ── 1. jour / nuit : l'appareil décide, <html> ne reçoit rien ── */
  { const { ctx, p, err } = await nouveau({ colorScheme: 'light' });
    await p.goto(P.url); await p.waitForTimeout(300);
    const fond = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor + '|' + getComputedStyle(document.querySelector('.sidebar')).color);
    const jour = await fond();
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(200);
    const nuit = await fond();
    log(jour !== nuit, 'thème : la page se repeint quand l’appareil passe au sombre (' + jour + ' → ' + nuit + ')');
    log(await p.locator('#btnTheme').count() === 0, 'thème : aucun bouton de thème');
    log(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === null, 'thème : <html> ne porte aucun data-theme');
    await p.locator('.msg').first().click(); await p.waitForTimeout(200);
    log(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === null && !/theme/.test(await p.evaluate(() => localStorage.getItem('opcourrierB_v2') || '').then(x => (JSON.parse(x || '{}').theme !== undefined) ? 'theme' : '')), 'thème : rien n’est écrit ni relu (pas de champ « theme » dans le stockage)');
    log(err.length === 0, 'thème : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2. stockage : préfixe bêta, et un stockage qui jette ne casse rien ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300);
    await p.locator('.msg').first().click(); await p.waitForTimeout(200);
    const cles = await p.evaluate(() => Object.keys(localStorage));
    log(cles.length > 0 && cles.every(k => k.startsWith('opcourrierB_')), 'stockage : toutes les clés portent opcourrierB_ — ' + JSON.stringify(cles));
    log(await p.evaluate(() => sessionStorage.length === 0 && document.cookie === ''), 'stockage : ni sessionStorage ni cookie');
    log(err.length === 0, 'stockage : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({}, () => { const jette = () => { throw new DOMException('quota', 'QuotaExceededError'); };
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('refusé', 'SecurityError'); } }); });
    await p.goto(P.url); await p.waitForTimeout(400);
    log(await p.locator('#rows .msg').count() > 0, 'stockage refusé : la page démarre et montre ses messages (' + await p.locator('#rows .msg').count() + ')');
    await p.locator('.msg').first().click(); await p.waitForTimeout(200);
    log(await p.locator('#readScroll').textContent().then(t => t.length > 20), 'stockage refusé : on peut lire un message');
    log(err.length === 0, 'stockage refusé : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 3. le côté d'ouverture ── */
  const cote = (p) => p.evaluate(() => (document.querySelector('.sptab.sp-perso[aria-pressed="true"]') ? 'perso' : document.querySelector('.sptab.sp-pro[aria-pressed="true"]') ? 'pro' : '?'));
  for (const c of ['pro', 'perso']) {
    const { ctx, p, err } = await nouveau({});
    await p.goto(P.url + '#' + c); await p.waitForTimeout(400);
    log(await cote(p) === c, 'côté : #' + c + ' ouvre le côté ' + c);
    log(await p.evaluate(() => document.getElementById('app').getAttribute('data-scope')) === c, 'côté : data-scope = ' + c);
    err.length && log(false, 'côté #' + c + ' : erreurs ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.url + '#perso'); await p.waitForTimeout(300);
    const h0 = await p.evaluate(() => history.length);
    await p.locator('.sptab.sp-pro').click(); await p.waitForTimeout(200);
    log(await p.evaluate(() => location.hash) === '#pro', 'côté : le hash suit le côté choisi (#perso → #pro)');
    log(await p.evaluate(() => history.length) === h0, 'côté : replaceState — le clic n’ajoute aucune entrée d’historique (' + h0 + ')');
    await p.reload(); await p.waitForTimeout(400);
    log(await cote(p) === 'pro', 'côté : un rechargement reste du côté choisi, pas du côté d’arrivée');
    await p.evaluate(() => { location.hash = '#perso'; }); await p.waitForTimeout(400);
    log(await cote(p) === 'perso', 'côté : un changement de hash en cours de route change de côté');
    log(err.length === 0, 'côté : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300);
    await p.locator('.sptab.sp-perso').click(); await p.waitForTimeout(200);
    log(await p.evaluate(() => location.hash) === '', 'côté : sans hash à l’arrivée, la page n’en écrit pas');
    await p.reload(); await p.waitForTimeout(400);
    log(await cote(p) === 'perso', 'côté : sans hash, le côté mémorisé reste (comportement de la maquette)'); await ctx.close(); }

  /* ── 4. la lecture du MX derrière un geste ── */
  const ouvrirAjout = async (p) => { await p.locator('.side-foot [data-addaccount]').click(); await p.waitForTimeout(150); };
  { const { ctx, p, dns, err } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.locator('#aMail').pressSequentially('julie@societe-exemple.fr', { delay: 25 }); await p.waitForTimeout(900);
    log(dns.length === 0, 'MX : AUCUNE demande pendant la frappe d’un domaine d’entreprise (' + dns.length + ')');
    const idle = await p.textContent('#aDet'); log(/Entrée ou quittez le champ/.test(idle) && /societe-exemple\.fr/.test(idle), 'MX : le panneau dit qu’il attend la fin de la saisie');
    log(await p.textContent('#aGo') === 'Vérifier la messagerie' && !(await p.locator('#aGo').isDisabled()), 'MX : le bouton propose « Vérifier la messagerie »');
    await p.locator('#aName').focus(); await p.waitForTimeout(700);   // quitter le champ
    log(dns.length === 1 && /dns\.google\/resolve\?name=societe-exemple\.fr&type=MX$/.test(dns[0]), 'MX : UNE demande en quittant le champ, avec le seul domaine — ' + JSON.stringify(dns));
    log(!dns.join(' ').includes('julie'), 'MX : ni l’adresse ni le nom ne sont envoyés');
    log(/OVH/.test(await p.textContent('#aDet')) && await p.textContent('#aGo') === 'Se connecter', 'MX : le service est reconnu (OVH, réglages IMAP proposés) après le geste');
    log(err.length === 0, 'MX : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, dns } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.fill('#aMail', 'paul@autre-societe.fr'); await p.waitForTimeout(700);
    await p.locator('#aMail').press('Enter'); await p.waitForTimeout(900);
    log(dns.length === 1, 'MX : Entrée déclenche UNE demande (Entrée + « change » ne font qu’une lecture) — ' + dns.length);
    await ctx.close(); }
  { const { ctx, p, dns } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.fill('#aMail', 'paul@encore-une-societe.fr'); await p.waitForTimeout(700);
    await p.locator('#aGo').click(); await p.waitForTimeout(900);
    log(dns.length === 1, 'MX : « Vérifier la messagerie » déclenche UNE demande — ' + dns.length);
    await ctx.close(); }
  { const { ctx, p, dns, err } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.fill('#aMail', 'paul@societe-fermee.fr'); await p.waitForTimeout(700);
    await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    log(dns.length === 0, 'MX : fermer la feuille (Échap) n’est pas un geste — aucune demande (' + dns.length + ')');
    log(err.length === 0, 'MX : fermer la feuille en pleine saisie ne jette rien ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, dns } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.locator('#aMail').pressSequentially('karim@gmail.com', { delay: 25 }); await p.waitForTimeout(700);
    await p.locator('#aName').focus(); await p.waitForTimeout(500);
    log(dns.length === 0 && /Google|Gmail/.test(await p.textContent('#aDet')), 'MX : un domaine grand public est reconnu par la table, sans aucune demande');
    await ctx.close(); }
  { /* le réseau refuse : la détection retombe sur la table + mail.<domaine> */
    const { ctx, p, err } = await nouveau({});
    await ctx.route(/^https:\/\/(dns\.google|cloudflare-dns\.com)\//, (route) => route.abort());
    await p.goto(P.url); await p.waitForTimeout(300); await ouvrirAjout(p);
    await p.fill('#aMail', 'paul@hors-ligne.fr'); await p.waitForTimeout(600); await p.locator('#aName').focus(); await p.waitForTimeout(1200);
    log(/Impossible de vérifier le domaine/.test(await p.textContent('#aDet')) && await p.inputValue('#aImap') === 'mail.hors-ligne.fr', 'MX : réseau refusé → repli sur mail.<domaine>, dit honnêtement (' + await p.inputValue('#aImap') + ')');
    /* le navigateur écrit lui-même « Failed to load resource » quand on lui coupe une requête : c'est la coupure de la sonde, pas une erreur de la page */
    const propres = err.filter(x => !/Failed to load resource/.test(x));
    log(propres.length === 0, 'MX : le repli ne jette rien ' + propres.join('|')); await ctx.close(); }

  /* ── 5. le mode démo ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.url); await p.waitForTimeout(300);
    log(await p.locator('#rows .msg').count() > 0, 'démo : les messages d’exemple sont là');
    log(/Bêta/.test(await p.textContent('.demo-pill')) && /aucun vrai mail n.est lu ni envoyé/.test(await p.getAttribute('.demo-pill', 'title')), 'démo : la mention honnête « Bêta — aucun vrai mail n’est lu ni envoyé »');
    log(!/Maquette/.test(await p.evaluate(() => document.body.innerText)), 'démo : le mot « Maquette » n’apparaît plus à l’écran');
    log(err.length === 0, 'démo : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({}, () => { window.OPCOURRIER_SERVEUR = true; });
    await p.goto(P.url); await p.waitForTimeout(400);
    log(await p.locator('#rows .msg').count() === 0 && await p.locator('#sideBody .scope-row[data-scope]').count() === 0, 'sans démo : plus un message ni une boîte d’exemple');
    await p.locator('#btnCompose').click(); await p.waitForTimeout(250);
    log(/Ajoutez d.abord une boîte/.test(await p.textContent('#toast')), 'sans démo : composer sans boîte le dit au lieu de jeter');
    await p.locator('.side-foot [data-settings]').click(); await p.waitForTimeout(250);
    log(await p.locator('#stTest').count() === 0, 'sans démo : plus de « Recevoir un mail d’exemple »');
    await p.keyboard.press('Escape'); await p.locator('.side-foot [data-addaccount]').click(); await p.waitForTimeout(200);
    await p.fill('#aMail', 'karim@gmail.com'); await p.waitForTimeout(600); await p.locator('#aGo').click(); await p.waitForTimeout(1300);
    log(await p.locator('#sideBody .scope-row[data-scope]').count() === 0 && /pas encore relié à un serveur/.test(await p.textContent('#toast')), 'sans démo : ajouter une boîte refuse honnêtement (rien n’est ajouté)');
    log(err.length === 0, 'sans démo : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { /* l'arrivée simulée : minuterie de 180 s — on avance l'horloge de la page */
    const { ctx, p } = await nouveau({}, () => { window.__t = []; const st = window.setTimeout; window.setTimeout = function (f, ms) { if (ms === 180000) { window.__t.push(ms); } return st.apply(this, arguments); }; });
    await p.goto(P.url); await p.waitForTimeout(300);
    log(await p.evaluate(() => window.__t.length) === 1, 'démo : la minuterie d’arrivée simulée (180 s) est posée');
    await ctx.close(); }
  { const { ctx, p } = await nouveau({}, () => { window.OPCOURRIER_SERVEUR = true; window.__t = []; const st = window.setTimeout; window.setTimeout = function (f, ms) { if (ms === 180000) { window.__t.push(ms); } return st.apply(this, arguments); }; });
    await p.goto(P.url); await p.waitForTimeout(300);
    log(await p.evaluate(() => window.__t.length) === 0, 'sans démo : AUCUNE minuterie d’arrivée simulée');
    await ctx.close(); }

  log(P.sorties.length === 0, 'réseau : rien n’est sorti de 127.0.0.1 en dehors des deux annuaires (répondus par la sonde) — ' + JSON.stringify(P.sorties));
  await bilan(R, P);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
