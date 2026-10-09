/* Les captures d'OP MESSAGES pour la publicité — Justin, 9 octobre 2026 : « envoie-moi des captures d'OP MESSAGES, faites pour la pub ».
   ⛔ Le VRAI service, lancé ICI sur 127.0.0.1 (tests/outils-msg.js), avec des personnes et une entreprise ENTIÈREMENT FICTIVES : jamais un compte
   ni une donnée de la bêta en ligne. Rien ne sort de la machine. Les noms sont inventés ; la « photo » est un paysage dessiné par la page elle-même.
   Rend, dans SORTIE, des PNG nets (iPhone 393 × 852 à ×3, Mac 1440 × 900 à ×2), de jour et de nuit.
   Usage : node scratchpad/captures-opmessages.js            SORTIE=/un/dossier node scratchpad/captures-opmessages.js */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('../tests/outils-msg');
const F = require('../tests/outils-pieces');
let pw; for (const c of ['playwright-core', '/opt/node-tools/node_modules/playwright-core', '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core']) { try { pw = require(c); break; } catch (e) { /* suivant */ } }
if (!pw) { console.error('playwright-core introuvable'); process.exit(2); }
const SORTIE = process.env.SORTIE || path.join(__dirname, 'captures-opmessages');
fs.mkdirSync(SORTIE, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* les personnes : inventées. `julie` est la vedette (c'est son téléphone et son Mac qu'on photographie) */
const P = {
  julie: { nom: 'Julie Moreau' }, thomas: { nom: 'Thomas Bernard' }, sarah: { nom: 'Sarah Lefèvre' }, karim: { nom: 'Karim Haddad' },
  lea: { nom: 'Léa Fontaine' }, hugo: { nom: 'Hugo Mercier' }, ines: { nom: 'Inès Garnier' },
};
for (const k of Object.keys(P)) P[k].pass = 'pw-' + k + '-pub-2026';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, { pass: v.pass, nom: v.nom, actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  const navig = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'] });
  try {
    const C = {}; for (const k of Object.keys(P)) C[k] = await T.connecter(svc, og, k, P[k].pass);
    const id = k => C[k].moi.id;
    const ok = (r, quoi) => { if (!r || r.code >= 300) throw new Error(quoi + ' : ' + (r && r.code) + ' ' + JSON.stringify(r && r.j).slice(0, 200)); return r.j; };
    /* contacts : chacun avec Julie, et les collègues entre eux */
    const lier = async (a, b) => { const l = ok(await C[a].post('/api/contacts/lien', { max: 1 }), 'lien ' + a); ok(await C[b].post('/api/liens/accepter', { code: l.code }), 'accepter ' + b); };
    for (const k of ['thomas', 'sarah', 'karim', 'lea', 'hugo', 'ines']) await lier('julie', k);
    for (const [a, b] of [['thomas', 'sarah'], ['thomas', 'karim'], ['sarah', 'karim'], ['lea', 'hugo'], ['lea', 'thomas'], ['hugo', 'thomas'], ['thomas', 'ines'], ['sarah', 'ines'], ['karim', 'ines']]) await lier(a, b);
    for (const k of Object.keys(P)) await C[k].post('/api/moi/confidentialite', { position: true });
    let n = 0;
    const msg = async (k, conv, corps) => ok(await C[k].post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'pub-' + (++n) + '-' + k }, corps)), 'message ' + k);
    const deposer = async (k, conv, genre, corps, nom) => ok(await F.deposer(C[k], { conv, genre, corps, nom }), 'dépôt ' + genre).id;
    const ondes = (nb, graine) => Array.from({ length: nb }, (x, i) => Math.max(8, Math.min(100, Math.round(45 + 40 * Math.sin(i * 0.7 + graine) * Math.sin(i * 0.23 + graine * 2)))));

    /* la « photo » : un coucher de soleil sur la mer, dessiné par une page (aucune image d'Internet, aucune personne) */
    const atelier = await navig.newPage({ viewport: { width: 1200, height: 800 } });
    await atelier.setContent(`<body style="margin:0;width:1200px;height:800px;overflow:hidden;background:linear-gradient(180deg,#2b2d6e 0%,#7a3f8f 30%,#e8705a 55%,#f7b267 66%,#3a5f8a 66.2%,#1d3557 100%)">
      <div style="position:absolute;left:520px;top:400px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#fff6d5 0%,#ffd27a 55%,rgba(255,180,90,0) 72%)"></div>
      <div style="position:absolute;left:0;top:528px;width:1200px;height:272px;background:repeating-linear-gradient(180deg,rgba(255,214,150,.0) 0 9px,rgba(255,214,150,.18) 9px 11px);-webkit-mask:linear-gradient(90deg,transparent 30%,#000 47%,#000 53%,transparent 70%)"></div>
      <div style="position:absolute;left:0;top:470px;width:1200px;height:70px;background:#1b1f3b;clip-path:polygon(0 60%,8% 40%,15% 55%,22% 30%,30% 50%,34% 45%,38% 100%,0 100%)"></div>
      <div style="position:absolute;left:900px;top:330px;width:22px;height:200px;background:#1b1f3b;clip-path:polygon(30% 0,70% 0,100% 100%,0 100%)"></div>
      <div style="position:absolute;left:896px;top:318px;width:30px;height:16px;background:#ffe9a8;border-radius:4px;box-shadow:0 0 30px 10px rgba(255,230,160,.55)"></div>
      <div style="position:absolute;left:820px;top:520px;width:380px;height:30px;background:#1b1f3b;clip-path:polygon(0 100%,10% 30%,40% 20%,100% 40%,100% 100%)"></div></body>`);
    const photo = await atelier.screenshot({ type: 'jpeg', quality: 88 });
    await atelier.close();

    /* ── PERSO : un groupe d'amis, un échange direct ── */
    const ws = ok(await C.lea.post('/api/conversations/groupe', { nom: 'Week-end à Ré 🌊', membres: [id('julie'), id('hugo'), id('thomas')] }), 'groupe').conversation.id;
    await msg('lea', ws, { texte: 'Le gîte est réservé pour samedi 🎉 On sera bien, il y a même des vélos !' });
    await msg('hugo', ws, { type: 'photo', pieces: [{ id: await deposer('hugo', ws, 'photo', photo), w: 1200, h: 800 }], texte: 'Le coucher de soleil d’hier soir… on y retourne !' });
    const mPhoto = n;
    await msg('julie', ws, { texte: 'Trop beau 😍 Je m’occupe des courses et du pique-nique.' });
    const sond = await msg('lea', ws, { type: 'sondage', question: 'On part à quelle heure samedi ?', choix: ['8 h', '10 h', 'Après le déjeuner'], regles: { multiple: false, anonyme: false } });
    for (const [k, c] of [['lea', 1], ['hugo', 1], ['thomas', 0], ['julie', 1]]) await C[k].post('/api/conversations/' + ws + '/sondages/' + sond.seq + '/voter', { choix: [c] });
    await msg('hugo', ws, { type: 'position', lat: 46.2016, lng: -1.4093, precision: 30 });
    await msg('lea', ws, { texte: '@Julie tu peux prendre la glacière ? ☀️', mentions: [id('julie')] });
    await msg('thomas', ws, { texte: 'Je ramène les raquettes 🏓' });
    const leaJ = ok(await C.julie.post('/api/conversations/directe', { uid: id('lea') }), 'directe').conversation.id;
    await msg('lea', leaJ, { texte: 'Coucou ! Tu viens dîner samedi prochain ?' });
    await msg('julie', leaJ, { texte: 'Avec plaisir ! J’apporte le dessert 🍰' });
    await msg('lea', leaJ, { type: 'vocal', piece: await deposer('lea', leaJ, 'vocal', F.webm(9000)), dur: 18.4, bars: ondes(48, 1.3) });
    const hugoJ = ok(await C.julie.post('/api/conversations/directe', { uid: id('hugo') }), 'directe').conversation.id;
    await msg('hugo', hugoJ, { texte: 'Merci pour hier, c’était top 🙏' });

    /* ── PRO : une entreprise, deux canaux, des collègues ── */
    const esp = ok(await C.julie.post('/api/espaces', { nom: 'Atelier Lumen' }), 'espace').espace.id;
    for (const k of ['thomas', 'sarah', 'karim', 'ines']) { const inv = ok(await C.julie.post('/api/espaces/' + esp + '/invitations', { max: 1, jours: 7 }), 'invitation'); ok(await C[k].post('/api/invitations/accepter', { code: inv.code }), 'rejoindre ' + k); }
    const canal = async (nom) => { const r = ok(await C.julie.post('/api/espaces/' + esp + '/canaux', { nom, prive: false }), 'canal'); return (r.canal && (r.canal.conv || r.canal.id)) || r.conversation && r.conversation.id; };
    const chantier = await canal('Chantier Les Tilleuls');
    const general = await canal('Général');
    await msg('julie', general, { texte: 'Bienvenue à Inès dans l’équipe 👋' });
    await msg('ines', general, { texte: 'Merci à tous, ravie de vous rejoindre !' });
    await msg('thomas', chantier, { texte: 'Bonjour à tous, le devis est validé par le syndic 👍' });
    await msg('thomas', chantier, { type: 'fichier', piece: await deposer('thomas', chantier, 'fichier', F.pdf(246000), 'Devis Les Tilleuls.pdf') });
    await msg('sarah', chantier, { texte: 'Super nouvelle ! Je passe sur place jeudi à 9 h pour les mesures.' });
    await msg('karim', chantier, { type: 'vocal', piece: await deposer('karim', chantier, 'vocal', F.webm(12000)), dur: 42.0, bars: ondes(60, 2.1) });
    await msg('julie', chantier, { texte: 'Parfait. @Karim tu peux préparer le matériel pour lundi ?', mentions: [id('karim')] });
    const s2 = await msg('sarah', chantier, { type: 'sondage', question: 'Réunion de chantier : quel créneau ?', choix: ['Lundi 10 h', 'Mardi 14 h', 'Mercredi 9 h'], regles: { multiple: false, anonyme: false } });
    for (const [k, c] of [['sarah', 0], ['thomas', 0], ['karim', 1], ['ines', 0]]) await C[k].post('/api/conversations/' + chantier + '/sondages/' + s2.seq + '/voter', { choix: [c] });
    await msg('karim', chantier, { texte: 'C’est noté ✅ Tout sera prêt.' });
    const sarahJ = ok(await C.julie.post('/api/conversations/directe', { uid: id('sarah') }), 'directe').conversation.id;
    await msg('sarah', sarahJ, { texte: 'Je t’envoie le planning de la semaine prochaine ce soir.' });
    /* les réactions */
    const reagir = (k, conv, seq, emoji) => C[k].post('/api/conversations/' + conv + '/messages/reagir', { seq, emoji });
    await reagir('julie', ws, 2, '😍'); await reagir('lea', ws, 2, '😍'); await reagir('thomas', ws, 2, '🔥');
    await reagir('julie', chantier, 1, '👍'); await reagir('sarah', chantier, 1, '🎉'); await reagir('karim', chantier, 1, '👍');
    /* les réunions et l'agenda (le Pro) */
    const loc = (jours, h, m) => { const d = new Date(Date.now() + jours * 86400000); const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); return p + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
    const reu = (titre, j, h, m, dureeMin, invites, odj) => C.julie.post('/api/reunions', { titre, lieu: '', debut: loc(j, h, m), fin: loc(j, h + Math.floor((m + dureeMin) / 60), (m + dureeMin) % 60), tz: 'Europe/Paris', invites: invites.map(id), ordre_du_jour: odj, salle_attente: false, rappels: [15], repetition: 'aucune', notifier: false, cote: 'pro' });
    ok(await reu('Point chantier Les Tilleuls', 1, 10, 0, 45, ['thomas', 'sarah', 'karim'], ['Planning des travaux', 'Commande du matériel', 'Sécurité du site']), 'réunion');
    ok(await reu('Réunion d’équipe', 3, 9, 0, 30, ['thomas', 'sarah', 'karim', 'ines'], ['Tour de table', 'Chantiers de la semaine']), 'réunion');
    ok(await reu('Visite client — Résidence Horizon', 5, 14, 0, 60, ['sarah'], ['État des lieux']), 'réunion');
    ok(await reu('Formation sécurité', 8, 13, 30, 90, ['karim', 'ines'], []), 'réunion');
    ok(await C.julie.post('/api/agenda', { titre: 'Dîner chez Léa', debut: loc(8, 20, 0), fin: loc(8, 23, 0), tz: 'Europe/Paris', rappel: 60, cote: 'perso' }), 'agenda');
    /* Julie a lu ses conversations Perso sauf le groupe (une pastille) ; Lu sur ses envois */
    for (const [k, conv] of [['lea', leaJ], ['hugo', ws], ['thomas', ws], ['lea', ws], ['karim', chantier], ['sarah', chantier], ['thomas', chantier]]) await C[k].post('/api/conversations/' + conv + '/lu', { seq: 999 }).catch(() => {});
    console.log('données posées : 3 conversations Perso, 2 canaux et un échange Pro, 4 réunions');

    /* ── les captures ── */
    const PROFILS = {
      iphone: { w: 393, h: 852, dpr: 3, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
      mac: { w: 1440, h: 900, dpr: 2, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' },
    };
    const faites = [];
    async function seance(pf, theme, mode) {
      await C.julie.post('/api/moi/maj', { prefs: { mode } });
      const ctx = await navig.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, userAgent: pf.ua,
        colorScheme: theme === 'nuit' ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', baseURL: svc.base });
      const page = await ctx.newPage(); page.setDefaultTimeout(15000);
      await page.goto(svc.base + '/');
      await page.fill('#c-login', 'julie'); await page.fill('#c-pass', P.julie.pass); await page.click('#c-entrer');
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; });
      await dormir(1200);
      return { ctx, page };
    }
    /* ferme ce qui s'ouvre tout seul (accueil, demande de notifications, photo de profil) sans rien détruire */
    async function degager(page) {
      for (let i = 0; i < 4; i++) {
        const ouvert = await page.evaluate(() => Array.from(document.querySelectorAll('[role="dialog"]:not([hidden]), .feuille:not([hidden]), .modale:not([hidden])')).filter(e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').length);
        if (!ouvert) return; await page.keyboard.press('Escape'); await dormir(350);
      }
    }
    async function prendre(page, nom) {
      await degager(page); await dormir(700);
      const f = path.join(SORTIE, nom + '.png'); await page.screenshot({ path: f }); faites.push(f); console.log('  ✓ ' + nom);
    }
    const aller = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await dormir(1500); };

    for (const theme of ['jour', 'nuit']) {
      /* iPhone, Perso : la liste, puis le groupe */
      let s = await seance(PROFILS.iphone, theme, 'perso');
      await aller(s.page, '#messages'); await prendre(s.page, 'iphone-' + theme + '-1-conversations');
      await aller(s.page, '#messages/' + encodeURIComponent(ws)); await dormir(800);
      await s.page.evaluate(() => { const l = document.querySelector('#fil, .fil, #messages-fil'); if (l) l.scrollTop = l.scrollHeight; });
      await prendre(s.page, 'iphone-' + theme + '-2-groupe-amis');
      await aller(s.page, '#messages/' + encodeURIComponent(leaJ)); await prendre(s.page, 'iphone-' + theme + '-3-discussion');
      await s.ctx.close();
      /* iPhone, Pro : la liste, le canal, le tableau de bord, l'agenda */
      s = await seance(PROFILS.iphone, theme, 'pro');
      await aller(s.page, '#messages'); await prendre(s.page, 'iphone-' + theme + '-4-pro-conversations');
      await aller(s.page, '#messages/' + encodeURIComponent(chantier)); await prendre(s.page, 'iphone-' + theme + '-5-pro-canal');
      await aller(s.page, '#accueil'); await prendre(s.page, 'iphone-' + theme + '-6-pro-tableau-de-bord');
      await aller(s.page, '#reunions'); await prendre(s.page, 'iphone-' + theme + '-7-agenda');
      await s.ctx.close();
      /* Mac, Pro : le canal ouvert à côté de la liste, le tableau de bord, l'agenda ; Mac, Perso : le groupe d'amis */
      s = await seance(PROFILS.mac, theme, 'pro');
      await aller(s.page, '#messages/' + encodeURIComponent(chantier)); await prendre(s.page, 'mac-' + theme + '-1-pro-canal');
      await aller(s.page, '#accueil'); await prendre(s.page, 'mac-' + theme + '-2-pro-tableau-de-bord');
      await aller(s.page, '#reunions'); await prendre(s.page, 'mac-' + theme + '-3-agenda');
      await s.ctx.close();
      s = await seance(PROFILS.mac, theme, 'perso');
      await aller(s.page, '#messages/' + encodeURIComponent(ws)); await prendre(s.page, 'mac-' + theme + '-4-groupe-amis');
      await s.ctx.close();
    }
    console.log(faites.length + ' captures dans ' + SORTIE);
  } finally {
    await navig.close().catch(() => {}); await svc.arreter(); await og.fermer().catch(() => {});
  }
})().catch(e => { console.error(e); process.exit(1); });
