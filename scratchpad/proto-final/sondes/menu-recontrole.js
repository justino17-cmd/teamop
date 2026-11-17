// RECONTRÔLE ADVERSE du lot « menu » (17 novembre 2026) : ce que le correcteur n'a PAS cadré lui-même.
// Les sondes du correcteur rejouent ses propres corrections ; celle-ci cherche à côté : les surtitres contre les groupes du menu,
// la persistance de la place de la colonne par des chemins que la sonde du correcteur ne prend pas (retour arrière, adresse changée à la main,
// fenêtre redimensionnée), les noms d'objet de base dans les autres entrées d'adresse (?lien=, ?auto=, #lien-…), le poste sous le nom pour
// TOUS les comptes, la demande de congé de bout en bout jusqu'à la validation par le gérant, le chemin cité par le réglage « Rendez-vous en ligne ».
// ⛔ 127.0.0.1 seulement. Chaque partie compte d'abord sa population. PART=… pour n'en jouer qu'une.
const { L } = require('./menu-commun.js'), v = L.v;
const PART = process.env.PART || 'tout', cap = process.env.CAP;
const jouer = n => PART === 'tout' || PART.split(',').includes(n);
const pause = (p, ms) => p.waitForTimeout(ms);
(async () => {
  // ── A. place de la colonne : chemins que la sonde du correcteur ne prend pas ─────────────────────────────────────────────────────────
  if (jouer('A')) for (const [profil, h] of [['mac720', 720], ['windows', 768]]) {
    const c = await L.ouvrir({ profil, qui:'marc' }), tag = profil;
    const lire = () => c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'), a = l.querySelector('a.on'), r = a && a.getBoundingClientRect(), m = l.getBoundingClientRect();
      return { top:Math.round(l.scrollTop), on:a ? (a.querySelector('.m-n') || a).textContent.trim() : null, dedans:!!a && r.top >= m.top - 1 && r.bottom <= m.bottom + 1, ch:l.clientHeight, sh:l.scrollHeight, bas:l.classList.contains('m-plus-bas'), haut:l.classList.contains('m-plus-haut') }; });
    const e0 = await lire(); v(`${tag} : population (colonne défilable, ${e0.sh} > ${e0.ch})`, e0.sh > e0.ch + 20, e0);
    // 1. la ligne courante tout en bas, puis retour arrière du navigateur : la ligne d'avant doit être visible
    await c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'); l.scrollTop = l.scrollHeight; }); await L.calme(c.p, 200);
    await L.toucher(c, '#menu .m-liste a[href="#vehicules"]'); await L.calme(c.p, 400);
    await c.p.evaluate(() => history.back()); await L.calme(c.p, 700);
    const r1 = await lire(); v(`${tag} : après le retour du navigateur, la ligne courante est visible dans la colonne (${r1.on}, haut ${r1.top})`, r1.dedans && r1.on !== 'Véhicules', r1);
    // 2. l'adresse changée à la main vers une ligne du HAUT alors que la colonne est tout en bas
    await c.p.evaluate(() => { const l = document.querySelector('#menu .m-liste'); l.scrollTop = l.scrollHeight; }); await L.calme(c.p, 200);
    await c.p.evaluate(() => { location.hash = 'statistiques'; }); await L.calme(c.p, 700);
    const r2 = await lire(); v(`${tag} : adresse #statistiques tapée alors que la colonne est en bas : la ligne est ramenée en vue (${r2.on})`, r2.on === 'Statistiques' && r2.dedans, r2);
    // 3. la fenêtre se réduit (barre d'outils, clavier) : le menu garde ses repères et le pied reste atteignable
    for (const hh of [640, 560]) {
      await c.p.setViewportSize({ width:c.largeur, height:hh }); await L.calme(c.p, 500);
      const m = await c.p.evaluate(() => { const pied = document.querySelector('#menu .pied'), r = pied.getBoundingClientRect(), s = [...pied.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t:b.textContent.replace(/\s+/g, ' ').trim().slice(0, 30), dans:q.top >= 0 && q.bottom <= innerHeight + 1 && q.height > 10 }; });
        const l = document.querySelector('#menu .m-liste'), lr = l.getBoundingClientRect(); return { pied:{ top:Math.round(r.top), bas:Math.round(r.bottom), haut:innerHeight }, boutons:s, liste:{ h:Math.round(lr.height) }, recouvre:lr.bottom > r.top + 1 }; });
      v(`${tag} ${hh} px de haut : le pied du menu (Jour/Nuit, Nouveautés, Se déconnecter) est entièrement dans la fenêtre`, m.pied.bas <= hh + 1 && m.boutons.length >= 3 && m.boutons.every(b => b.dans), m);
      v(`${tag} ${hh} px de haut : la liste (${m.liste.h} px) ne passe pas sous le pied`, !m.recouvre && m.liste.h > 120, m);
      await L.toucher(c, '#menu .m-liste a[href="#equipe"]'); await L.calme(c.p, 400);
      const r3 = await lire(); v(`${tag} ${hh} px : « Équipe » touchée, elle est visible (${r3.on})`, r3.on === 'Équipe' && r3.dedans, r3);
    }
    if (cap) { await L.capture(c, `${cap}/A-${tag}.png`); }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }

  // ── B. surtitres contre les groupes du menu (MENU-FINAL : « partout où l'ancien s'affiche… surtitres ») ──────────────────────────────
  if (jouer('B')) {
    const c = await L.ouvrir({ profil:'mac', qui:'marc' });
    await c.p.evaluate(() => { try { mchPoser([...PACKS_ENT, '3d']); } catch (e) {} }); await L.calme(c.p, 400);
    const G = await c.p.evaluate(() => { const o = {}; let g = ''; for (const e of document.querySelector('#menu .m-liste').children) { if (e.classList.contains('grp')) { g = e.textContent.trim(); continue; } const h = e.getAttribute('href'); if (h) o[h.replace('#', '')] = { g, l:(e.querySelector('.m-n') || e).textContent.trim() }; } return o; });
    v(`population : ${Object.keys(G).length} lignes de menu`, Object.keys(G).length >= 19, Object.keys(G));
    const ecarts = [];
    for (const r of Object.keys(G)) { await c.p.evaluate(() => { const z = document.getElementById('cpsys'); if (z) { const b = z.querySelector('[data-cpsys="retour"]'); if (b) b.click(); } });
      await L.aller(c.p, r);
      const s = await c.p.evaluate(() => { const h1 = document.querySelector('#contenu h1'), st = document.querySelector('#contenu .surtitre'); return { h1:h1 ? h1.textContent.trim() : '', st:st ? st.textContent.trim() : '' }; });
      console.log(`  · #${r.padEnd(14)} groupe « ${G[r].g} » · ligne « ${G[r].l} » · surtitre « ${s.st} » · titre « ${s.h1} »`);
      if (s.st && G[r].g && s.st !== G[r].g && s.st !== G[r].l && !/^(Accueil|Statistiques|Historique)$/.test(G[r].l)) ecarts.push({ r, groupe:G[r].g, surtitre:s.st, titre:s.h1 }); }
    v('le surtitre d\'un écran est le groupe de sa ligne (ou sa ligne) : aucun écart', ecarts.length === 0, ecarts);
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }

  // ── C. noms d'objet de base dans les AUTRES entrées d'adresse ────────────────────────────────────────────────────────────────────────
  if (jouer('C')) for (const [nom, req, hash] of [['?lien=constructor', '?app=1&lien=constructor', ''], ['#lien-constructor', '?app=1', 'lien-constructor'], ['?auto=constructor', '?app=1&auto=constructor', ''], ['?auto=toString', '?app=1&auto=toString', ''],
      ['?lien=__proto__', '?app=1&lien=__proto__', ''], ['#constructor-x-1', '?app=1&auto=marc', 'constructor-x-1'], ['#inter-x-constructor', '?app=1&auto=marc', 'inter-x-constructor'], ['#clients-x-__proto__', '?app=1&auto=marc', 'clients-x-__proto__']]) {
    const c = await L.ouvrir({ profil:'mac', qui:null, requete:req, hash }), tag = `entrée ${nom}`;
    const e = await c.p.evaluate(() => ({ corps:document.body.innerText.slice(0, 160).replace(/\s+/g, ' '), objet:/\[object/.test(document.body.innerText), cnx:!!document.getElementById('cnx'), menu:!!document.querySelector('#menu a') }));
    v(`${tag} : la page répond (un écran de connexion ou une application, pas du vide)`, e.cnx || e.menu, e);
    v(`${tag} : pas de « [object Object] » à l'écran`, !e.objet, e.corps);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }

  // ── D. le poste sous le nom, pour TOUS les comptes, dans la feuille « Menu » du téléphone ───────────────────────────────────────────
  if (jouer('D')) for (const qui of ['marc', 'julie', 'sm', 'kb', 'lr', 'tl']) {
    const c = await L.ouvrir({ profil:'iphone', qui }), tag = `poste ${qui}`;
    const attendu = await c.p.evaluate(k => { const p = eqDe(k); return p ? { role:p.role, nom:eqNom(p), actif:p.actif } : null; }, qui);
    v(`${tag} : le compte existe (population)`, !!attendu && !!attendu.role, attendu);
    if (!attendu) { await L.fin(c); continue; }
    // le secrétariat ouvre sur la Comptabilité plein écran : le bouton « ‹ OP GESTION » ramène au menu de l'application
    if (qui === 'julie') { await L.toucher(c, 'button:has-text("OP GESTION")'); await L.calme(c.p, 600); }
    const ouvre = await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 500);
    v(`${tag} : la feuille « Menu » s'ouvre`, ouvre);
    const f = await c.p.evaluate(() => { const m = document.querySelector('#calque .fm-moi'); return { ligne:m ? m.textContent.trim() : null, out:(document.querySelector('#calque .cn-out') || {}).textContent || '' }; });
    f.sous = f.ligne ? f.ligne.split(' · ').slice(1).join(' · ') : null;
    v(`${tag} : sous le nom, « ${attendu.role} » (le poste d'Équipe) — lu : « ${f.sous} »`, f.sous === attendu.role, f);
    if (cap && qui === 'kb') await L.capture(c, `${cap}/D-${qui}.png`);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }

  // ── E. le chemin cité par « Rendez-vous en ligne » existe-t-il pour une intervention ordinaire ? ──────────────────────────────────────
  if (jouer('E')) {
    const c = await L.ouvrir({ profil:'mac', qui:'marc' });
    const ints = await c.p.evaluate(() => INTS.map(i => ({ id:i.id, st:i.st, cli:i.cli })));
    v(`population : ${ints.length} interventions`, ints.length >= 3, ints.slice(0, 3));
    const avec = [], sans = [];
    for (const i of ints.slice(0, 14)) { await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
      await L.aller(c.p, 'inter-x-' + i.id);
      const b = await c.p.evaluate(() => !![...document.querySelectorAll('#contenu button')].find(x => /Voir le lien client/.test(x.textContent)));
      (b ? avec : sans).push(i.id + ':' + i.st); }
    console.log('  · avec « Voir le lien client » :', avec.join(' '), '| sans :', sans.join(' '));
    v('au moins une intervention porte « Voir le lien client » (le texte du réglage dit vrai pour elle)', avec.length > 0, { avec, sans });
    v('toutes les interventions ouvertes portent le bouton (« ouvre une intervention » sans condition)', sans.length === 0, { sans });
    // le bouton mène-t-il bien à l'onglet « Le lien sur téléphone » ?
    if (avec.length) { await L.aller(c.p, 'inter-x-' + avec[0].split(':')[0]); await L.toucher(c, 'button[data-voirclient$="|ordi"]'); await L.calme(c.p, 600);
      const s = await c.p.evaluate(() => ({ route, h1:(document.querySelector('#contenu h1') || {}).textContent, onglets:[...document.querySelectorAll('#contenu .seg button')].map(b => b.textContent.trim()) }));
      v('« Voir le lien client » ouvre « Ce que voit le client » avec l\'onglet « Le lien sur téléphone » proposé', /Ce que voit le client/.test(s.h1 || '') && s.onglets.includes('Le lien sur téléphone'), s); }
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  // ── F. appui long sur la barre : le premier toucher d'APRÈS ne doit pas être avalé (l'écouteur qui avale un clic dit « seulement celui-là ») ──
  if (jouer('F')) for (const profil of ['iphone', 'android']) {
    const c = await L.ouvrir({ profil, qui:'marc' }), tag = `appui long ${profil}`;
    const onglet = await c.p.evaluate(() => { const b = document.querySelector('.opg-barre .opg-tab:not(.on), .opg-barre button:not(.on), .opg-barre a:not(.on)'); if (!b) return null; const r = b.getBoundingClientRect(); return { x:r.x + r.width / 2, y:r.y + r.height / 2 }; });
    v(`${tag} : la barre du bas existe (population)`, !!onglet, onglet); if (!onglet) { await L.fin(c); continue; }
    const cdp = await c.ctx.newCDPSession(c.p);
    await c.p.evaluate(() => { window.__clics = []; document.addEventListener('click', e => window.__clics.push((e.target.closest('[data-mabarre]') || e.target).tagName + ':' + (e.target.closest('[data-mabarre]') || {}).dataset?.mabarre), true); });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:onglet.x, y:onglet.y }] }); await c.p.waitForTimeout(800);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await L.calme(c.p, 600);
    const P = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); return p ? { titre:(p.querySelector('h2') || {}).textContent, lignes:[...p.querySelectorAll('[data-mabarre]')].map(b => ({ k:b.dataset.mabarre, on:/on|oui|coch/.test(b.className) || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true' })) } : null; });
    v(`${tag} : « Ma barre » est ouverte par l'appui long`, !!P && P.titre === 'Ma barre', P);
    const avale = await c.p.evaluate(() => ({ clics:window.__clics.slice(), reste:typeof mbAvale !== 'undefined' ? mbAvale : 'inconnu', maintenant:Date.now() }));
    console.log('  · après le relâcher :', JSON.stringify(avale));
    // 4 s plus tard (un NOUVEAU geste), on touche une ligne de la feuille : elle doit répondre du premier coup
    await c.p.waitForTimeout(4000);
    const avant = await c.p.evaluate(() => JSON.stringify(typeof mbLire === 'function' ? mbLire() : (JSON.parse(localStorage.getItem('opg_proto_barre') || 'null'))));
    const cible = await c.p.evaluate(() => { const l = [...document.querySelectorAll('#calque [data-mabarre]')].filter(b => !b.dataset.mabarre.startsWith('~')); const b = l[l.length - 1]; if (!b) return null; b.scrollIntoView({ block:'center' }); const r = b.getBoundingClientRect(); return { x:r.x + r.width / 2, y:r.y + r.height / 2, k:b.dataset.mabarre }; });
    v(`${tag} : une ligne de la feuille est là pour le toucher d'après (population)`, !!cible, cible);
    if (cible) { await c.p.evaluate(() => { window.__clics = []; }); await c.p.touchscreen.tap(cible.x, cible.y); await L.calme(c.p, 500);
      const ap = await c.p.evaluate(() => ({ clics:window.__clics.slice(), mem:localStorage.getItem('opg_proto_barre'), toast:(document.getElementById('toast') || {}).innerText || '', mbAvale:typeof mbAvale !== 'undefined' ? mbAvale : null }));
      v(`${tag} : le toucher fait 4 s après l'appui long n'est pas avalé (un clic est arrivé à la ligne, ou la barre a changé, ou le refus « 5 boutons » est dit)`, ap.clics.length > 0 && (ap.mem !== avant || /maximum|boutons/.test(ap.toast)) , { avant, ap, cible }); }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }

  // ── G1. parcours : la technicienne demande un congé au téléphone, le gérant le valide à l'ordinateur-style (même page), elle le retrouve ──
  if (jouer('G1')) {
    const c = await L.ouvrir({ profil:'android', qui:'sm' }), tag = 'parcours congé';
    const etat = () => c.p.evaluate(() => ({ dem:DEMANDES_ABS.length, abs:ABSENCES.length, dec:DECISIONS_ABS.length, h1:(document.querySelector('#contenu h1') || {}).textContent || '', route }));
    const e0 = await etat(); v('population : l\'écran d\'ouverture de la technicienne est « Ma journée »', e0.route === 'majournee', e0);
    // 1. par le bouton Menu puis la ligne « Mes congés »
    await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 500);
    const ligne = await c.p.evaluate(() => [...document.querySelectorAll('#calque .ligne-clic')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 24));
    v('la feuille « Menu » de la technicienne porte « Mes congés »', ligne.some(t => /Mes congés/.test(t)), ligne);
    await L.toucher(c, '#calque [data-go="absences"]'); await L.calme(c.p, 600);
    const e1 = await etat(); v('« Mes congés » s\'ouvre', e1.h1 === 'Mes congés', e1);
    // 2. la demande
    await L.toucher(c, '[data-atdem]');
    await c.p.evaluate(() => { document.getElementById('ad-du').value = jour(30); document.getElementById('ad-au').value = jour(32); for (const i of ['ad-du', 'ad-au']) document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true })); });
    await L.calme(c.p, 300); await L.toucher(c, '[data-atenvoi]'); await L.calme(c.p, 500);
    const e2 = await etat(), toast = await c.p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
    v('la demande est enregistrée (une de plus) et le message le dit', e2.dem === e0.dem + 1 && /Demande envoyée/.test(toast), { e0, e2, toast });
    const lue = await c.p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
    v('l\'écran « Mes congés » montre la demande en attente', /attente|En attente|à valider|Demande/i.test(lue), lue.slice(0, 300));
    if (cap) await L.capture(c, `${cap}/G1-demande-android.png`);
    // 3. elle se déconnecte par la feuille Menu
    await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 500);
    const sortie = await L.toucher(c, '#calque [data-cnx="sortir"]'); await L.calme(c.p, 800);
    v('« Se déconnecter » de la feuille Menu mène à l\'écran de connexion', sortie && await c.p.evaluate(() => !!document.getElementById('cnx')));
    // 4. le gérant se connecte avec son identifiant et son mot de passe
    const ids = await c.p.evaluate(() => { const p = eqDe('marc'); return { id:cnxLogin(p), mdp:MDP[p.k] || MDP_PROVISOIRE, premier:!MDP[p.k] }; });
    await c.p.fill('#cn-id', ids.id); await c.p.fill('#cn-mdp', ids.mdp); await c.p.click('#cn-form button[type=submit]'); await L.calme(c.p, 1200);
    // première connexion : le mot de passe provisoire doit être remplacé par un mot de passe à soi (écran « premier »)
    if (await c.p.evaluate(() => !!document.getElementById('cn-n1'))) { await c.p.fill('#cn-n1', 'Recontrole-Menu-2026'); await c.p.fill('#cn-n2', 'Recontrole-Menu-2026'); await c.p.click('#cn-form-premier button[type=submit]'); await L.calme(c.p, 2200); }
    await c.p.waitForFunction(() => !document.getElementById('cnx'), null, { timeout:8000 }).catch(() => {});
    await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 400);
    const connecte = await c.p.evaluate(() => ({ sess:SESSION, cnx:!!document.getElementById('cnx'), role:ROLE, route }));
    v('le gérant est connecté (sans écran de connexion restant) et le rôle est « patron »', connecte.sess === 'marc' && !connecte.cnx && connecte.role === 'patron', { connecte, ids:{ premier:ids.premier } });
    // 5. il valide : la validation est dans Absences et congés
    await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 500);
    const sheetMarc = await c.p.evaluate(() => [...document.querySelectorAll('#calque .ligne-clic')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    v('la feuille du gérant porte « Absences et congés »', sheetMarc.some(t => /Absences et congés/.test(t)), sheetMarc);
    await L.toucher(c, '#calque [data-go="absences"]'); await L.calme(c.p, 700);
    const aval = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, ok:[...document.querySelectorAll('#contenu [data-aok]')].map(b => b.dataset.aok), texte:document.getElementById('contenu').innerText.replace(/\s+/g, ' ').slice(0, 260), lect:aLecture(), dem:DEMANDES_ABS.map(d => ({ id:d.id, t:d.tid || d.tech || d.qui, st:d.st })) }));
    v('le gérant voit des demandes à valider (la sienne et celles de départ), pas en lecture seule', aval.ok.length > 0 && aval.lect === false, aval);
    const derniere = await c.p.evaluate(() => DEMANDES_ABS[DEMANDES_ABS.length - 1].id);
    await c.p.evaluate(id => document.querySelector(`[data-aok="${id}"]`) && document.querySelector(`[data-aok="${id}"]`).scrollIntoView({ block:'center' }), derniere); await L.calme(c.p, 300);
    const okb = await L.toucher(c, `[data-aok="${derniere}"]`); await L.calme(c.p, 700);
    const e3 = await etat(); v('il touche « Valider » : la demande devient une absence au planning et une décision est notée', okb && e3.abs === e2.abs + 1 && e3.dec >= e2.dec, { e2, e3, okb });
    if (cap) await L.capture(c, `${cap}/G1-valide-android.png`);
    // 6. la technicienne se reconnecte et retrouve la décision dans « Mes congés »
    await L.toucher(c, '#contenu .tt-menu'); await L.toucher(c, '#calque [data-cnx="sortir"]'); await L.calme(c.p, 800);
    const ids2 = await c.p.evaluate(() => { const p = eqDe('sm'); return { id:cnxLogin(p), mdp:MDP[p.k] || MDP_PROVISOIRE }; });
    await c.p.fill('#cn-id', ids2.id); await c.p.fill('#cn-mdp', ids2.mdp); await c.p.click('#cn-form button[type=submit]'); await L.calme(c.p, 1200);
    if (await c.p.evaluate(() => !!document.getElementById('cn-n1'))) { await c.p.fill('#cn-n1', 'Recontrole-Sophie-2026'); await c.p.fill('#cn-n2', 'Recontrole-Sophie-2026'); await c.p.click('#cn-form-premier button[type=submit]'); await L.calme(c.p, 2200); }
    await c.p.waitForFunction(() => !document.getElementById('cnx'), null, { timeout:8000 }).catch(() => {});
    await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 400);
    await L.toucher(c, '#contenu .tt-menu'); await L.toucher(c, '#calque [data-go="absences"]'); await L.calme(c.p, 700);
    const fin = await c.p.evaluate(() => ({ sess:SESSION, h1:(document.querySelector('#contenu h1') || {}).textContent, texte:document.getElementById('contenu').innerText.replace(/\s+/g, ' '), lect:aLecture() }));
    v('la technicienne reconnectée revoit « Mes congés », en lecture seule, avec la décision (validé / acceptée)', fin.sess === 'sm' && fin.h1 === 'Mes congés' && fin.lect === true && /accept|valid|Validé|approuv/i.test(fin.texte), fin);
    if (cap) await L.capture(c, `${cap}/G1-retour-sophie-android.png`);
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }

  // ── G2. parcours : le gérant au téléphone crée un client AVEC une intervention, puis le retrouve par la feuille « Menu » ────────────────
  if (jouer('G2')) {
    const c = await L.ouvrir({ profil:'iphone', qui:'marc' });
    await L.toucher(c, '#contenu .tt-menu'); await L.toucher(c, '#calque [data-go="clients"]'); await L.calme(c.p, 700);
    const lib = await c.p.evaluate(() => [...document.querySelectorAll('#contenu button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(t => /Nouveau|Ajouter|Créer|＋/.test(t)));
    v('« Clients » porte un bouton de création nommé « ＋ Nouveau client »', lib.some(t => /＋ Nouveau client/.test(t)), lib);
    const k0 = await c.p.evaluate(() => Object.keys(CLIENTS)), n0 = k0.length, i0 = await c.p.evaluate(() => INTS.length);
    await L.toucher(c, '#contenu button:has-text("Nouveau client")'); await L.calme(c.p, 500);
    v('le choix « Avec une intervention / Avec un devis » est proposé', await c.p.evaluate(() => !!document.querySelector('#calque [data-action="clientNvInt"]') && !!document.querySelector('#calque [data-action="clientNvDevis"]')));
    await L.toucher(c, '#calque [data-action="clientNvInt"]'); await L.calme(c.p, 900);
    const champs = await c.p.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea')].filter(i => i.offsetParent).map(i => ({ id:i.id, t:i.type, ph:i.placeholder || '', lab:(i.closest('label') || {}).innerText || '' })));
    v('la fenêtre « Nouvelle intervention » s\'ouvre avec les champs du nouveau client (population)', champs.length >= 4, champs);
    // les champs n'ont pas d'identifiant : on les trouve par leur libellé, et on écrit comme au clavier (événement « input »)
    const ecrit = (lib, val) => c.p.evaluate(([lib, val]) => { const l = [...document.querySelectorAll('label')].find(x => x.offsetParent && x.innerText.trim().toLowerCase().startsWith(lib)); const i = l && l.querySelector('input'); if (!i) return false; i.focus(); i.value = val; i.dispatchEvent(new Event('input', { bubbles:true })); i.dispatchEvent(new Event('change', { bubbles:true })); return true; }, [lib, val]);
    const remplis = [await ecrit('nom', 'Boulangerie Recontrôle'), await ecrit('téléphone', '06 99 88 77 66'), await ecrit('e-mail', 'recontrole.menu@exemple.fr'), await ecrit('adresse', '47 avenue des Essais, 17000 La Rochelle')];
    v('les champs du nouveau client sont trouvés et remplis (nom, téléphone, e-mail, adresse)', remplis.filter(Boolean).length >= 3, remplis);
    await L.calme(c.p, 300);
    const plus = await L.toucher(c, 'button:has-text("Plus tard")'); await L.calme(c.p, 400);
    const cree = await c.p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Créer l’intervention/.test(x.textContent)); return b ? { off:b.disabled || b.getAttribute('aria-disabled') === 'true' || /gris/.test(b.className), t:b.textContent.trim() } : null; });
    console.log('  · bouton de validation :', JSON.stringify(cree), '· « Plus tard » touché :', plus);
    if (cap) await L.capture(c, `${cap}/G2-formulaire-rempli-iphone.png`);
    const cliqueCree = await L.toucher(c, 'button:has-text("Créer l’intervention")'); await L.calme(c.p, 1000);
    console.log('  · « Créer l’intervention » touché :', cliqueCree, '· formulaire encore ouvert :', await c.p.evaluate(() => typeof CREA !== 'undefined' && !!CREA), '· écran :', await c.p.evaluate(() => (document.querySelector('h1, h2') || {}).textContent), '· toast :', await c.p.evaluate(() => (document.getElementById('toast') || {}).innerText || ''), '· aide :', await c.p.evaluate(() => [...document.querySelectorAll('.crea-aide, .aide-pied, .pied-crea, [class*=crea] .gris')].map(x => x.innerText.trim()).slice(0, 3).join(' / ')));
    if (cap) await L.capture(c, `${cap}/G2-apres-creer-iphone.png`);
    const ap = await c.p.evaluate(k0 => ({ n:Object.keys(CLIENTS).length, ints:INTS.length, neufs:Object.keys(CLIENTS).filter(k => !k0.includes(k)).map(k => ({ k, nom:CLIENTS[k].nom, contact:CLIENTS[k].contact, adr:CLIENTS[k].adr })), toast:(document.getElementById('toast') || {}).innerText || '', route, h1:(document.querySelector('#contenu h1') || {}).textContent }), k0);
    v('le client est créé avec son intervention (un client de plus, une intervention de plus)', ap.neufs.length === 1 && /Recontrôle/.test(ap.neufs[0].nom + ap.neufs[0].contact) && ap.n === n0 + 1 && ap.ints === i0 + 1, { n0, i0, ap });
    await L.toucher(c, '#contenu .tt-menu'); await L.toucher(c, '#calque [data-go="clients"]'); await L.calme(c.p, 700);
    const liste = await c.p.evaluate(n => ({ nom:n, trouve:document.getElementById('contenu').innerText.includes(n), cartes:[...document.querySelectorAll('#contenu [data-go]')].map(x => x.innerText.split('\n')[0]), table:Object.keys(CLIENTS).length }), ap.neufs[0] ? ap.neufs[0].nom : '§');
    v('le client apparaît dans « Clients » (retrouvé par la feuille Menu)', liste.trouve, liste);
    if (cap) await L.capture(c, `${cap}/G2-client-retrouve-iphone.png`);
    v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }

  // ── G3. parcours : le bureau (secrétariat) à l'ordinateur — le logo ramène à son ouverture, ses lignes s'ouvrent, aucun écran de gérant ─────
  if (jouer('G3')) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil:'windows', qui:'julie', nuit }), tag = 'bureau ' + (nuit ? 'nuit' : 'jour');
    const o = await c.p.evaluate(() => ({ route, ouv:rlOuverture() })); v(`${tag} : population (ouverture du bureau)`, o.route === o.ouv && o.route === 'comptabilite', o);
    // la Comptabilité est un module plein écran : « ‹ OP GESTION » ramène au menu de l'application
    v(`${tag} : le bouton « ‹ OP GESTION » du module Comptabilité est là et répond`, await L.toucher(c, '#cpsys [data-cpsys="retour"], button:has-text("OP GESTION")')); await L.calme(c.p, 500);
    for (const [h, t] of [['devis', 'Devis'], ['clients', 'Clients'], ['achats', 'Achats'], ['contrats', 'Contrats'], ['taches', 'tâches'], ['interventions', 'Interventions']]) {
      await L.toucher(c, `#menu .m-liste a[href="#${h}"]`); await L.calme(c.p, 500);
      const s = await c.p.evaluate(() => ({ route, h1:(document.querySelector('#contenu h1') || {}).textContent || '', on:(document.querySelector('#menu a.on .m-n') || {}).textContent || '', toast:(document.getElementById('toast') || {}).innerText || '' }));
      v(`${tag} : la ligne « ${t} » ouvre son écran, surlignée, sans refus`, s.route === h && new RegExp(t, 'i').test(s.h1) && s.on.length > 1 && !/n’existe pas|réservé/.test(s.toast), s);
      v(`${tag} · #${h} : l'écran ne glisse pas de côté`, (await L.deborde(c)).bouge === 0);
    }
    await L.toucher(c, '#menu .logo'); await L.calme(c.p, 500);
    v(`${tag} : le logo OP GESTION ramène à l'ouverture du rôle`, await c.p.evaluate(() => route === 'comptabilite'));
    if (cap) await L.capture(c, `${cap}/G3-bureau-${nuit ? 'nuit' : 'jour'}.png`);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
