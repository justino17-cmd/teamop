/* Sonde du MODULE OP Courrier (`opcourrier.js`) — ce que les quatre sondes portées de la maquette (ctx, miss, sign, contraste) ne jouent pas : ce que le MODULE promet à ses hôtes.
     1. le thème : l'hôte décide (options.theme, attribut posé sur <html> vu sans prévenir, rafraichir), à défaut l'appareil ;
     2. l'ISOLEMENT, dans les deux sens : une feuille hostile de l'hôte ne touche pas le module, et le module n'écrit rien dans la page (ni feuille, ni classe, ni attribut) ;
     3. le format se décide sur la LARGEUR DU CONTENEUR (un écran de 1 440 px dont la zone ne fait que 600 px est un iPhone) ;
     4. le calque : une feuille ouverte passe AU-DESSUS de la barre de l'hôte (couche supérieure) ;
     5. un seul côté (options.cotes) : ni sélecteur Pro/Perso, ni badge, ni choix de côté ; le côté d'ouverture et api.cote() ;
     6. ⛔ ce que la source ne sait pas faire est dit « Bientôt » (mode=reel) : pas de simulation, pas de signature, pas d'envoi programmé, OAuth → mot de passe d'application ;
     7. ⛔ l'état vide (aucune donnée d'exemple, une invitation à ajouter une boîte) ; les TROIS ÉTATS (on ne sait pas ≠ aucune boîte) ; un envoi refusé se DIT et rend le message aux brouillons ;
     8. la lecture du MX n'est qu'un service de la SOURCE, derrière un geste (jamais pendant la frappe) ; sans ce service, aucun appel réseau ;
     9. le stockage (une clé, un stockage qui jette ne casse rien), le démontage (plus rien ne tourne), aucune erreur JS, aucune requête hors 127.0.0.1 (les deux annuaires DNS sont répondus par la sonde).
   Lancer : voir l'en-tête de pilote.js. Chiffre attendu : tout vert. */
const { ouvrir, bilan } = require('./pilote.js');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const MX = (h) => JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 ' + h + '.' }] });
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";

(async () => {
  const P = await ouvrir();
  const nouveau = async (opts, init) => {
    const ctx = await P.ctxPour(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
    const dns = [];
    await ctx.route(/^https:\/\/(dns\.google|cloudflare-dns\.com)\//, (route) => { dns.push(route.request().url()); route.fulfill({ status: 200, contentType: 'application/json', body: MX('ssl0.ovh.net') }); });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); });
    return { ctx, p, err, dns };
  };
  const texte = (p) => p.evaluate((sr) => eval(sr).textContent, SR);
  const attr = (p, sel, a) => p.evaluate(([sr, s, n]) => eval(sr).querySelector(s).getAttribute(n), [SR, sel, a]);
  const ouvrirAjout = async (p) => { await p.locator('.side-foot [data-addaccount]').click(); await p.waitForTimeout(150); };

  /* ── 1. le thème ── */
  { const { ctx, p, err } = await nouveau({ colorScheme: 'light' });
    await p.goto(P.avec('mode=demo')); await p.waitForTimeout(400);
    const fond = () => p.evaluate((sr) => { const r = eval(sr); return getComputedStyle(r.querySelector('.opc-root')).backgroundColor + '|' + getComputedStyle(r.querySelector('.sidebar')).color; }, SR);
    const jour = await fond(); log(await attr(p, '.opc', 'data-theme') === 'jour', 'thème : à défaut, l’appareil décide (clair → jour)');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(250);
    const nuit = await fond(); log(await attr(p, '.opc', 'data-theme') === 'nuit' && jour !== nuit, 'thème : l’appareil passe au sombre, le module se repeint (' + jour + ' → ' + nuit + ')');
    log(await p.locator('#btnTheme').count() === 0, 'thème : aucun bouton de thème');
    log(await p.evaluate(() => document.documentElement.getAttribute('data-theme') === null && !document.documentElement.className), 'thème : <html> ne reçoit ni attribut ni classe du module');
    log(err.length === 0, 'thème : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({ colorScheme: 'light' });
    await p.goto(P.avec('mode=demo&theme=hote')); await p.waitForTimeout(400);
    log(await attr(p, '.opc', 'data-theme') === 'jour', 'thème hôte : sans réglage, jour (même si l’appareil est clair)');
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'nuit')); await p.waitForTimeout(250);
    log(await attr(p, '.opc', 'data-theme') === 'nuit', 'thème hôte : l’hôte pose data-theme="nuit" sur <html> — le module le voit SANS qu’on le prévienne');
    await p.emulateMedia({ colorScheme: 'dark' }); await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'jour')); await p.waitForTimeout(250);
    log(await attr(p, '.opc', 'data-theme') === 'jour', 'thème hôte : l’hôte décide, pas l’appareil (appareil sombre, hôte jour → jour)');
    await p.evaluate(() => { window.__opc.rafraichir({ donnees: false }); }); await p.waitForTimeout(100);
    log(await attr(p, '.opc', 'data-theme') === 'jour', 'thème hôte : rafraichir({donnees:false}) relit le thème');
    log(err.length === 0, 'thème hôte : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2. l'isolement, dans les deux sens ── */
  { const { ctx, p, err } = await nouveau({});
    await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style');
      s.textContent = 'button{background:red !important;border:5px solid red !important;color:red !important;border-radius:0 !important} .btn,.tb,.msg,.sheet,.empty,.seg,.chip{background:lime !important;padding:30px !important;outline:3px solid blue !important} h1,h2,p,span,div{font-family:Courier !important;letter-spacing:5px !important} *{box-sizing:content-box !important}';
      document.head.appendChild(s); }); });
    const avant = await p.evaluate(() => 0);
    await p.goto(P.avec('mode=demo')); await p.waitForTimeout(500);
    const mesure = () => p.evaluate((sr) => { const r = eval(sr), b = r.querySelector('.tb'), m = r.querySelector('.msg'), t = r.querySelector('.rsubj,.m-from');
      return { tb: getComputedStyle(b).backgroundColor, tbBord: getComputedStyle(b).borderTopWidth, msgPad: getComputedStyle(m).paddingTop, police: getComputedStyle(m.querySelector('.m-from')).fontFamily, lettre: getComputedStyle(m.querySelector('.m-from')).letterSpacing }; }, SR);
    const m = await mesure();
    log(m.tb !== 'rgb(0, 255, 0)' && m.tbBord !== '5px' && m.msgPad !== '30px' && !/Courier/.test(m.police) && m.lettre !== '5px', 'isolement : une feuille hostile de l’hôte (boutons rouges, .btn/.msg en lime, Courier) ne touche pas le module — ' + JSON.stringify(m));
    log(err.length === 0, 'isolement : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p } = await nouveau({});
    await p.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.body.insertAdjacentHTML('afterbegin', '<button id="hbtn" class="btn tb">Bouton de l’hôte</button><div id="hmsg" class="msg sheet">Hôte</div>'); document.body.style.background = 'rgb(1, 2, 3)'; }); });
    await p.goto(P.avec('mode=demo&barre=1')); await p.waitForTimeout(500);
    const etat = await p.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, bouton: getComputedStyle(document.getElementById('hbtn')).backgroundColor, hmsg: getComputedStyle(document.getElementById('hmsg')).position,
      feuilles: document.styleSheets.length, styles: document.querySelectorAll('style').length, cls: document.documentElement.className + '|' + document.body.className, kids: document.getElementById('zone').children.length }));
    log(etat.bg === 'rgb(1, 2, 3)' && etat.hmsg === 'static', 'isolement : les classes du module (.msg, .sheet, .btn, .tb) ne touchent pas un élément de l’hôte qui porte les mêmes noms — ' + JSON.stringify(etat));
    log(etat.styles === 1 && etat.cls === '|avec-barre' && etat.kids === 1, 'isolement : le module n’ajoute ni <style>, ni classe, ni attribut à la page (1 <style> : celui de l’hôte), un seul enfant dans son conteneur');
    log(await p.evaluate(() => document.adoptedStyleSheets.length === 0), 'isolement : aucune feuille adoptée par le document (la feuille du module vit dans son arbre d’ombre)');
    await ctx.close(); }

  /* ── 3. le format suit le conteneur, pas l'écran ── */
  { const { ctx, p, err } = await nouveau({ viewport: { width: 1440, height: 900 } });
    await p.goto(P.avec('mode=demo')); await p.waitForTimeout(500);
    const fmt = async (w) => { await p.evaluate((w) => { document.getElementById('zone').style.width = w + 'px'; }, w); await p.waitForTimeout(350); return attr(p, '.opc', 'data-fmt'); };
    log(await fmt(1300) === 'mac' && await p.evaluate((sr) => eval(sr).querySelector('.opc').hasAttribute('data-etroit'), SR) === false, 'format : conteneur de 1 300 px → Mac');
    log(await fmt(1100) === 'mac' && await p.evaluate((sr) => eval(sr).querySelector('.opc').hasAttribute('data-etroit'), SR) === true, 'format : 1 100 px → Mac étroit (colonnes resserrées)');
    log(await fmt(900) === 'pad', 'format : 900 px dans un écran de 1 440 → iPad');
    log(await p.locator('#btnNav').isVisible(), 'format iPad : le bouton de la colonne des boîtes est là');
    log(await fmt(600) === 'phone', 'format : 600 px dans un écran de 1 440 → iPhone (pile de navigation)');
    log(await attr(p, '#app', 'data-view') === 'list', 'format iPhone : la pile montre la liste');
    const sansDefilement = await p.evaluate((sr) => { const root = eval(sr).querySelector('.opc-root'); return root.scrollWidth <= root.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }, SR);
    log(sansDefilement, 'format iPhone dans une zone de 600 px : aucun défilement latéral');
    log(await fmt(1300) === 'mac' && await p.locator('#btnNav').isVisible() === false, 'format : on revient à Mac sans recharger (la barre latérale est de nouveau en colonne)');
    log(err.length === 0, 'format : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 4. le calque passe au-dessus de la barre de l'hôte ── */
  for (const [vp, nom] of [[{ width: 1440, height: 900 }, 'Mac'], [{ width: 390, height: 844 }, 'iPhone']]) {
    const { ctx, p, err } = await nouveau({ viewport: vp, hasTouch: vp.width < 700, isMobile: vp.width < 700 });
    await p.goto(P.avec('mode=demo&barre=1')); await p.waitForTimeout(500);
    const haut = () => p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, 10); return e ? (e.id || e.tagName) : null; });
    log(await haut() === 'barre', 'calque ' + nom + ' : sans feuille, la barre de l’hôte est tout en haut');
    await p.locator('#btnCompose').click(); await p.waitForTimeout(350);
    const sous = await haut();
    log(sous !== 'barre', 'calque ' + nom + ' : une feuille ouverte (Nouveau message) passe AU-DESSUS de la barre de l’hôte (z-index 2 147 483 000) — pile : ' + sous);
    log(await p.evaluate((sr) => !!eval(sr).querySelector('.opc-layer').matches(':popover-open'), SR), 'calque ' + nom + ' : promu dans la couche supérieure du navigateur (popover)');
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    log(await p.locator('#overlay').count() === 0, 'calque ' + nom + ' : Échap referme la feuille');
    log(err.length === 0, 'calque ' + nom + ' : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 5. les côtés ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro')); await p.waitForTimeout(500);
    log(await p.locator('#spaceBar').isVisible() === false, 'un côté : le sélecteur Pro / Perso n’apparaît pas');
    log(await p.evaluate((sr) => [...eval(sr).querySelectorAll('.kbadge')].every(e => getComputedStyle(e).display === 'none'), SR), 'un côté : aucun badge Pro / Perso visible');
    log(/Boîtes mail/.test(await p.textContent('#sideBody')) && !/Comptes (pro|perso)/.test(await p.textContent('#sideBody')) && await p.locator('#sideBody .scope-row[data-scope="a2"]').count() === 1, 'un côté : groupe « Boîtes mail », ni « Comptes pro » ni « Comptes perso » — toutes les boîtes de la source sont du côté unique');
    await p.locator('#sideBody .scope-row[data-scope="a1"]').click({ button: 'right' }); await p.waitForTimeout(150);
    log(!(await p.locator('.menu .mitem').allTextContents()).some(t => /Passer côté/.test(t)), 'un côté : le menu d’une boîte ne propose pas « Passer côté… »');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await ouvrirAjout(p); await p.locator('#aMail').pressSequentially('karim@gmail.com', { delay: 10 }); await p.waitForTimeout(600);
    log(await p.locator('#kKind').isVisible() === false, 'un côté : la feuille « Ajouter un compte » ne demande pas le côté');
    log(await p.evaluate(() => window.__opc.cote()) === 'pro' && await p.evaluate(() => window.__opc.cote('perso')) === 'pro', 'un côté : api.cote(\'perso\') est refusé (rend le côté courant : pro)');
    log(err.length === 0, 'un côté : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro,perso&cote=perso')); await p.waitForTimeout(500);
    log(await p.locator('#spaceBar').isVisible(), 'deux côtés : le sélecteur est là');
    log(await p.evaluate(() => window.__opc.cote()) === 'perso' && await attr(p, '#app', 'data-scope') === 'perso', 'deux côtés : options.cote="perso" ouvre le côté perso');
    await p.evaluate(() => window.__opc.cote('pro')); await p.waitForTimeout(250);
    log(await p.evaluate(() => window.__opc.cote()) === 'pro' && await p.locator('.sptab.sp-pro[aria-pressed="true"]').count() === 1, 'deux côtés : api.cote(\'pro\') change de côté');
    await p.reload(); await p.waitForTimeout(500);
    log(await p.evaluate(() => window.__opc.cote()) === 'perso', 'deux côtés : au rechargement, options.cote gagne sur le côté mémorisé');
    await p.goto(P.avec('mode=demo&cotes=pro,perso')); await p.waitForTimeout(500);
    log(await p.evaluate(() => window.__opc.cote()) === 'perso', 'deux côtés : sans options.cote, le dernier côté ouvert reste (perso, ouvert à la visite d’avant)');
    log(err.length === 0, 'deux côtés : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 6. TOUTES les fonctions sont là ; « Bientôt » ne s'écrit que sur le geste précis qui exige un service absent (mode=reel : ce que sait le serveur d'OP GESTION) ── */
  { const { ctx, p, err, dns } = await nouveau({});
    await p.goto(P.avec('mode=reel&cotes=pro&titredoc=1')); await p.waitForTimeout(600);
    const t0 = await texte(p);
    log(!/Maquette|aucun vrai mail|Bêta/.test(t0), 'bientôt : aucune trace de maquette ni de « bêta » à l’écran');
    log(await p.locator('.soon').count() === 0, 'bientôt : AUCUNE pastille « Bientôt » sur un dossier ou une rubrique — Signatures et Programmés sont de vrais dossiers');
    log(/^\(\d+\) /.test(await p.title()), 'titre : les non lus s’écrivent devant le titre de la page de l’hôte — « ' + await p.title() + ' »');
    await p.locator('.folder[data-folder="sign"]').click(); await p.waitForTimeout(250);
    log(await p.locator('#rows [data-signnew]').count() === 1 && !/Bientôt/.test(await p.textContent('#rows')), 'signature : le dossier Signatures a son bouton « Envoyer un document à signer » (la fonction est là)');
    await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
    await p.selectOption('#sgType', 'Contrat de maintenance'); await p.fill('#sgN0', 'Claire Dubois'); await p.fill('#sgE0', 'claire.dubois@sarl-mercier.fr'); await p.fill('#sgP0', '06 12 34 56 78'); await p.locator('#sgTpl').click(); await p.waitForTimeout(100);
    await p.locator('#sgGo').click(); await p.waitForTimeout(200);
    log(/Bientôt : l.envoi du document à signer/.test(await p.textContent('#toast')) && await p.locator('#sgGo').count() === 1, 'signature : le parcours est utilisable jusqu’à « Envoyer », qui dit « Bientôt : l’envoi du document à signer (Yousign) » et la feuille reste ouverte');
    await p.locator('#sgCancel').click(); await p.waitForTimeout(250);
    log(await p.locator('#rows .msg').count() === 0 && await p.locator('[data-act="signSim"]').count() === 0, 'signature : AUCUNE fausse demande n’a été créée, aucun « Simuler la signature »');
    await p.locator('.folder[data-folder="inbox"]').click(); await p.waitForTimeout(200);
    await p.locator('.side-foot [data-settings]').click(); await p.waitForTimeout(250);
    log(await p.locator('#stTest').count() === 0 && await p.locator('#stThreads').count() === 1 && await p.locator('[data-sig]').count() >= 1, 'réglages : notifications, conversations, signatures par boîte sont là ; plus de « Recevoir un mail d’exemple »');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.locator('#btnCompose').click(); await p.waitForTimeout(250);
    log(await p.locator('#cSignBtn').isVisible(), 'composer : « Faire signer » est là (côté Pro)');
    await p.locator('#cSched').click(); await p.waitForTimeout(200);
    log(await p.locator('#cSchedWrap').isVisible() && /Bientôt : l.envoi à l.heure dite, même application fermée/.test(await p.textContent('#cSchedWrap')), 'programmer : le panneau s’ouvre (la fonction est là) ; « Bientôt » ne parle que de l’envoi APPLICATION FERMÉE');
    await p.fill('#cTo', 'a@exemple.fr, b@exemple.fr'); await p.locator('#cSend').click(); await p.waitForTimeout(200);
    log(/Bientôt : plusieurs destinataires/.test(await p.textContent('#toast')) && await p.locator('#cSheet').count() === 1, 'bientôt : deux destinataires → « Bientôt : plusieurs destinataires » (la feuille reste ouverte)');
    await p.fill('#cTo', 'a@exemple.fr'); await p.setInputFiles('#cFile', [{ name: 'gros.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024) }]); await p.waitForTimeout(150);
    log(await p.locator('#cAtt .att').count() === 0 && /4,0 Mo maximum/.test(await p.textContent('#toast')), 'pièces jointes : la limite de la source (4 Mo) s’applique, pas celle de la maquette (25 Mo)');
    /* programmer pour de vrai : 40 s plus tard, page ouverte → le message PART */
    await p.fill('#cSub', 'Programmé essai'); await p.fill('#cBody', 'Bonjour');
    const quand = await p.evaluate(() => { const d = new Date(Date.now() + 40000), p2 = (n) => (n < 10 ? '0' : '') + n; return [d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds())]; });
    await p.locator('#cSched').click(); await p.waitForTimeout(250);
    await p.locator('#cSchedPanel input[type="date"]').fill(quand[0]); await p.locator('#cSchedPanel input[type="time"]').fill(quand[1].slice(0, 5)); await p.evaluate((q) => { const i = document.querySelector('[data-opcourrier]').shadowRoot.querySelector('#cSchedPanel input[type="time"]'); i.value = q; }, quand[1]);
    await p.locator('#cSchedPanel [data-custom]').click(); await p.waitForTimeout(400);
    log(/Envoi programmé/.test(await p.textContent('#toast')), 'programmer : « Envoi programmé … » (le message est dans Programmés)');
    await p.locator('.folder[data-folder="scheduled"]').click(); await p.waitForTimeout(250);
    log(await p.locator('#rows .msg').count() === 1 && !(await p.evaluate(() => window.__source.envoyes.length)), 'programmer : il attend dans « Programmés », rien n’est parti');
    await p.waitForTimeout(52000);
    log(await p.evaluate(() => window.__source.envoyes.length) === 1 && /Programmé essai/.test(await p.evaluate(() => window.__source.envoyes[0].objet)), 'programmer : à l’heure dite, page ouverte, la source reçoit le message (UN seul envoi)');
    await p.locator('.side-foot [data-addaccount]').click(); await p.waitForTimeout(200);
    await p.locator('#aMail').pressSequentially('karim@gmail.com', { delay: 10 }); await p.locator('#aName').focus(); await p.waitForTimeout(500);
    const det = await p.textContent('#aDet');
    log(/Bientôt : connexion sécurisée via Google/.test(det) && /mot de passe d.application/.test(det), 'bientôt : Gmail sans OAuth → « Bientôt : connexion sécurisée via Google… mot de passe d’application »');
    log(await p.locator('#aPassWrap').isVisible() && await p.locator('#aAdv').isVisible(), 'connexion : le mot de passe est demandé et « Réglages du serveur » est présent');
    await p.locator('#aAdvTog').click(); await p.waitForTimeout(100);
    log(/Bientôt : des réglages de serveur personnalisés/.test(await p.textContent('#aAdvBody')) && await p.locator('#aImap').isVisible() === false, 'connexion : les réglages de serveur disent « Bientôt » (le serveur reconnaît les siens) au lieu de champs qu’il ignorerait');
    await p.locator('#aMail').fill('paul@societe-sans-mx.fr'); await p.locator('#aName').focus(); await p.waitForTimeout(700);
    log(dns.length === 0 && /reconnaît la messagerie à la connexion/.test(await p.textContent('#aDet')), 'bientôt : sans service MX, AUCUN appel réseau pour un domaine d’entreprise (' + dns.length + ' demande)');
    log(err.length === 0, 'bientôt : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { /* un message programmé dont l'heure est passée PENDANT QUE LA PAGE ÉTAIT FERMÉE ne part pas tout seul */
    const { ctx, p, err } = await nouveau({});
    await p.addInitScript(() => { const now = Date.now(); localStorage.setItem('opcourrierEssai_ui', JSON.stringify({ v: 4, scope: 'pro', folder: 'scheduled', cat: 'principal', rules: { senders: {}, domains: {} }, contacts: [], settings: { notif: true, threads: true }, kinds: {}, names: {}, sigs: {}, msgs: {}, gone: [],
      user: [{ id: 'm1', acct: 'a1', folder: 'scheduled', from: null, to: 'equipe@exemple.fr', subject: 'En retard', preview: 'x', body: ['Bonjour'], read: true, flagged: false, vip: false, att: [], user: true, at: now - 7200000, sendAt: now - 3600000 }] })); });
    await p.goto(P.avec('mode=reel&cotes=pro&intervalle=1000')); await p.waitForTimeout(2500);
    log(await p.evaluate(() => window.__source.envoyes.length) === 0 && await p.locator('#rows .msg').count() === 1, 'programmer : un message dont l’heure est passée depuis une heure (page fermée) NE part PAS tout seul — il attend dans Programmés');
    await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300);
    log(/l.heure est passée pendant que la page était fermée/.test(await p.textContent('.sched-banner')) && await p.locator('[data-act="sendNow"]').count() === 1 && await p.locator('[data-act="reschedule"]').count() === 1, 'programmer : le bandeau le dit et propose « Envoyer maintenant » / « Changer l’heure »');
    log(err.length === 0, 'programmer : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 7. l'état vide, les trois états, un envoi refusé ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=vide&cotes=pro')); await p.waitForTimeout(500);
    const t = await texte(p);
    log(/Aucune boîte mail connectée/.test(await p.textContent('#rows')) && await p.locator('#rows [data-addaccount]').count() === 1, 'vide : « Aucune boîte mail connectée » et UN bouton « Ajouter une boîte mail »');
    log(await p.locator('#rows .msg').count() === 0 && await p.locator('#sideBody .scope-row[data-scope]').count() === 0, 'vide : aucun message, aucune boîte');
    log(!/Berger|Fontaine|Dubois|Gestion Essai|Camille|SARL|Booking|Doctolib/.test(t), 'vide : AUCUNE donnée d’exemple à l’écran (noms, objets)');
    await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
    log(/Ajoutez d.abord une boîte/.test(await p.textContent('#toast')), 'vide : composer sans boîte le dit au lieu de jeter');
    await p.locator('#rows [data-addaccount]').click(); await p.waitForTimeout(250);
    log(await p.locator('#aMail').count() === 1, 'vide : le bouton ouvre la feuille d’ajout d’une boîte');
    log(err.length === 0, 'vide : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=panne&cotes=pro')); await p.waitForTimeout(500);
    const l = await p.textContent('#rows');
    log(/Boîtes mail illisibles/.test(l) && /serveur injoignable/.test(l) && !/Aucune boîte mail connectée/.test(l) && await p.locator('#rows [data-retry]').count() === 1, '3 états : boîtes() qui échoue → « illisibles » + Réessayer, JAMAIS « Aucune boîte mail connectée »');
    log(await p.locator('#rows [data-addaccount]').count() === 0, '3 états : on ne propose pas d’ajouter une boîte quand on ne SAIT pas s’il y en a');
    log(await p.locator('#sideBody [data-retry]').count() === 1, '3 états : la barre latérale propose aussi de réessayer');
    log(err.length === 0, '3 états : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=panne-messages&cotes=pro,perso&cote=perso')); await p.waitForTimeout(600);
    const l = await p.textContent('#rows');
    log(/Réception indisponible/.test(l) && !/Aucun message/.test(l) && await p.locator('#rows .msg').count() === 0, '3 états : les messages d’une boîte illisibles → « Réception indisponible », pas « Aucun message »');
    await p.locator('.sptab.sp-pro').click(); await p.waitForTimeout(300);
    log(await p.locator('#rows .msg').count() > 0, '3 états : l’autre boîte, elle, se lit normalement');
    log(err.length === 0, '3 états : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=refus&cotes=pro')); await p.waitForTimeout(500);
    await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
    await p.fill('#cTo', 'client@exemple.fr'); await p.fill('#cSub', 'Refus essai'); await p.fill('#cBody', 'Bonjour'); await p.locator('#cSend').click(); await p.waitForTimeout(5800);
    log(/Envoi impossible/.test(await p.textContent('#toast')) && /refusé par le serveur/.test(await p.textContent('#toast')), 'envoi refusé : le message d’échec de la source est DIT (' + (await p.textContent('#toast')).slice(0, 80) + ')');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('opcourrierEssai_ui')).user.filter(m => m.subject === 'Refus essai').map(m => m.folder));
    log(JSON.stringify(st) === '["drafts"]', 'envoi refusé : le message revient dans les brouillons, pas dans Envoyés — ' + JSON.stringify(st));
    log(err.length === 0, 'envoi refusé : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=reel&cotes=pro')); await p.waitForTimeout(500);
    await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
    await p.fill('#cTo', 'client@exemple.fr'); await p.fill('#cSub', 'Envoi essai'); await p.fill('#cBody', 'Bonjour'); await p.locator('#cSend').click(); await p.waitForTimeout(5800);
    const env = await p.evaluate(() => window.__source.envoyes);
    log(env.length === 1 && env[0].a === 'client@exemple.fr' && env[0].boite === 'a1' && /Envoi essai/.test(env[0].objet) && env[0].de === 'camille.moreau@atelier-moreau.example', 'envoi : la source reçoit la boîte, l’expéditeur, le destinataire et l’objet — ' + JSON.stringify(env).slice(0, 160));
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('opcourrierEssai_ui')).user.filter(m => m.subject === 'Envoi essai').map(m => m.folder));
    log(JSON.stringify(st) === '["sent"]' && /Message envoyé/.test(await p.textContent('#toast')), 'envoi : « Message envoyé » ne s’écrit qu’APRÈS la réponse de la source, et le message est dans Envoyés');
    log(err.length === 0, 'envoi : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=differe&cotes=pro')); await p.waitForTimeout(500);
    await p.locator('.msg').first().click(); await p.waitForTimeout(500);
    const appels = await p.evaluate(() => window.__source.appels.filter(a => /^lire:/.test(a)));
    log(appels.length === 1 && (await p.textContent('#readScroll')).length > 80 && !/Chargement du message/.test(await p.textContent('#readScroll')), 'lecture différée : le corps se lit à l’ouverture (SRC.lire appelée une fois) — ' + JSON.stringify(appels));
    log(err.length === 0, 'lecture différée : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro,perso&cote=pro')); await p.waitForTimeout(500);
    const n0 = await p.locator('#sideBody .scope-row[data-scope]').count();
    await ouvrirAjout(p); await p.locator('#aMail').fill('refus@societe-exemple.fr'); await p.locator('#aMail').press('Enter'); await p.locator('#aPass').waitFor({ state: 'visible', timeout: 5000 }); await p.waitForTimeout(100);
    await p.locator('#aPass').fill('x'); await p.locator('#aGo').click(); await p.waitForTimeout(500);
    log(await p.locator('#aMail').count() === 1 && /refusée/.test(await p.textContent('#aMailErr')), 'ajout refusé : la source dit non, la feuille RESTE ouverte avec le message — ' + (await p.textContent('#aMailErr')).slice(0, 70));
    log(await p.locator('#sideBody .scope-row[data-scope]').count() === n0, 'ajout refusé : aucune boîte n’est ajoutée (' + n0 + ' avant, ' + await p.locator('#sideBody .scope-row[data-scope]').count() + ' après)');
    await p.locator('#aMail').fill('nouveau@societe-exemple.fr'); await p.locator('#aMail').press('Enter'); await p.waitForTimeout(100);
    log(await p.locator('#aMail').count() === 1, 'ajout : Entrée dans les 350 ms qui suivent une frappe refait la reconnaissance, elle ne connecte pas avec l’ancienne (la feuille reste ouverte)');
    await p.locator('#aPass').waitFor({ state: 'visible', timeout: 5000 });
    await p.locator('#aPass').fill('x'); await p.locator('#aGo').click(); await p.waitForTimeout(900);
    log(await p.locator('#aMail').count() === 0 && await p.locator('#sideBody .scope-row[data-scope]').count() >= n0 + 1 && /nouveau@societe-exemple\.fr/.test(await p.textContent('#sideBody')), 'ajout : la source accepte → la feuille se ferme, la boîte apparaît (relue de la source)');
    log(err.length === 0, 'ajout : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 8. la lecture du MX derrière un geste ── */
  { const { ctx, p, dns, err } = await nouveau({});
    await p.goto(P.avec('mode=demo')); await p.waitForTimeout(500); await ouvrirAjout(p);
    await p.locator('#aMail').pressSequentially('julie@societe-exemple.fr', { delay: 25 }); await p.waitForTimeout(900);
    log(dns.length === 0, 'MX : AUCUNE demande pendant la frappe d’un domaine d’entreprise (' + dns.length + ')');
    await p.locator('#aName').focus(); await p.waitForTimeout(800);
    log(dns.length === 1 && /dns\.google\/resolve\?name=societe-exemple\.fr&type=MX$/.test(dns[0]) && !dns.join(' ').includes('julie'), 'MX : UNE demande en quittant le champ, avec le seul domaine — ' + JSON.stringify(dns));
    log(/OVH/.test(await p.textContent('#aDet')) && await p.textContent('#aGo') === 'Se connecter', 'MX : le service est reconnu (OVH) après le geste');
    await p.fill('#aMail', 'paul@autre-societe.fr'); await p.waitForTimeout(600); await p.locator('#aMail').press('Enter'); await p.waitForTimeout(900);
    log(dns.length === 2, 'MX : Entrée déclenche UNE demande (Entrée + « change » ne font qu’une lecture) — ' + dns.length);
    await p.fill('#aMail', 'paul@societe-fermee.fr'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(900);
    log(dns.length === 2, 'MX : fermer la feuille (Échap) n’est pas un geste — aucune demande');
    await ouvrirAjout(p); await p.locator('#aMail').pressSequentially('karim@gmail.com', { delay: 25 }); await p.waitForTimeout(700); await p.locator('#aName').focus(); await p.waitForTimeout(500);
    log(dns.length === 2 && /Google|Gmail/.test(await p.textContent('#aDet')), 'MX : un domaine grand public est reconnu par la table, sans aucune demande');
    log(err.length === 0, 'MX : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await ctx.route(/^https:\/\/(dns\.google|cloudflare-dns\.com)\//, (route) => route.abort());
    await p.goto(P.avec('mode=demo')); await p.waitForTimeout(400); await ouvrirAjout(p);
    await p.fill('#aMail', 'paul@hors-ligne.fr'); await p.waitForTimeout(600); await p.locator('#aName').focus(); await p.waitForTimeout(1500);
    log(/Impossible de vérifier le domaine/.test(await p.textContent('#aDet')) && await p.inputValue('#aImap') === 'mail.hors-ligne.fr', 'MX : réseau refusé → repli sur mail.<domaine>, dit honnêtement');
    log(err.filter(x => !/Failed to load resource/.test(x)).length === 0, 'MX : le repli ne jette rien'); await ctx.close(); }

  /* ── 9. stockage, démontage ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cle=elanB_courrier')); await p.waitForTimeout(400);
    await p.locator('.msg').first().click(); await p.waitForTimeout(250);
    const cles = await p.evaluate(() => Object.keys(localStorage).sort());
    log(cles.includes('elanB_courrier') && cles.every(k => k === 'elanB_courrier' || k === 'opcourrierEssai_v1'), 'stockage : le module n’écrit que sous options.cleStockage (« elanB_courrier ») — ' + JSON.stringify(cles) + ' (opcourrierEssai_v1 est celui de la source de démonstration)');
    log(await p.evaluate(() => sessionStorage.length === 0 && document.cookie === ''), 'stockage : ni sessionStorage ni cookie');
    log(err.length === 0, 'stockage : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({}, () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('refusé', 'SecurityError'); } }); });
    await p.goto(P.avec('mode=reel&cotes=pro')); await p.waitForTimeout(500);
    log(await p.locator('#rows .msg').count() > 0, 'stockage refusé : le module démarre et montre ses messages (' + await p.locator('#rows .msg').count() + ')');
    await p.locator('.msg').first().click(); await p.waitForTimeout(250);
    log((await p.textContent('#readScroll')).length > 20, 'stockage refusé : on peut lire un message');
    log(err.length === 0, 'stockage refusé : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&intervalle=1000')); await p.waitForTimeout(500);
    const avant = await p.evaluate(() => window.__source.appels.length);
    await p.evaluate(() => window.__opc.demonter()); await p.waitForTimeout(6500);
    log(await p.locator('[data-opcourrier]').count() === 0 && await p.evaluate(() => document.getElementById('zone').children.length) === 0, 'démontage : l’hôte du module est retiré du conteneur');
    log(await p.evaluate((a) => window.__source.appels.length === a, avant), 'démontage : plus AUCUN relevé de la source après demonter() (' + avant + ' appels avant, aucun après 6,5 s)');
    log(err.length === 0, 'démontage : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&intervalle=1000')); await p.waitForTimeout(500);
    await p.evaluate(() => { document.getElementById('zone').innerHTML = ''; }); await p.waitForTimeout(500);
    const a1 = await p.evaluate(() => window.__source.appels.length); await p.waitForTimeout(6500);
    log(await p.evaluate((a) => window.__source.appels.length - a <= 2, a1), 'démontage : l’hôte retire le conteneur sans prévenir → le module s’éteint de lui-même');
    log(err.length === 0, 'démontage : aucune erreur JS ' + err.join('|')); await ctx.close(); }
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&intervalle=1000')); await p.waitForTimeout(500);
    await p.evaluate(() => window.__source.simuler('recevoir', { boite: 'a1' })); await p.waitForTimeout(2500);
    log(/Nouveau message/.test(await p.textContent('#toast')), 'relevé : un mail arrivé chez la source est relevé et annoncé (« Nouveau message de… »)');
    log(err.length === 0, 'relevé : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  log(P.sorties.length === 0, 'réseau : rien n’est sorti de 127.0.0.1 en dehors des deux annuaires (répondus par la sonde) — ' + JSON.stringify(P.sorties));
  await bilan(R, P);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
