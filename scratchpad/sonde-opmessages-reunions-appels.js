/* SONDE — les décisions réunions / appels de Justin du 26 octobre 2026 (« fait les 18 »), dans de VRAIS navigateurs : la VRAIE page servie (`server-msg/public/`), le VRAI service, sur 127.0.0.1, un iPhone de 390 px
   au doigt et un bureau de 1280 px à la souris, jour et nuit ; le micro et la caméra sont ceux que Chromium fabrique (les pistes sont relevées : « ended » dès l'écran de fin).
   Elle joue ce que les bancs 3030 à 3036 ne peuvent pas voir : l'écran de fin et l'écran de refus RESTENT (3 s plus tard), la fiche se rouvre au raccrochage, la bannière laisse passer le toucher, le successeur a
   le panneau d'un hôte — et elle a trouvé une collision de nom (`X.venus`) que les bancs, qui jouent les fonctions une à une, ne voyaient pas.
   Lancer : node scratchpad/sonde-opmessages-reunions-appels.js   (CAPTURES=/dossier ; SEULES=manques,jours,fin,refus,retour,banniere,quitter,fiche pour ne jouer que ces parties)
   Parties : manques (#9) · jours (#17) · fin (#5) · refus (#4 et #8) · retour (#8) · banniere (#3) · quitter (#18) · fiche (#2)  */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const T = require(path.join(R, 'tests/outils-msg'));
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
let pw; for (const c of ['playwright-core', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || path.join(require('os').tmpdir(), 'opmsg-reunions-appels-captures');
fs.mkdirSync(DOSSIER, { recursive: true });
const SEULES = (process.env.SEULES || '').split(',').filter(Boolean);
const joue = (n) => !SEULES.length || SEULES.includes(n);
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand', cleo: 'Cléo Petit' };
const PARIS = 'Europe/Paris', MIN = 60000, H = 3600000;
const PROFILS = { iphone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, bureau: { viewport: { width: 1280, height: 800 } } };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], quotas: { piece: { max: 100000, fenetreMs: 3600000 }, reunion: { max: 100000, fenetreMs: 3600000 } },
    appels: { balayageMs: 200, perduMs: 60000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 } } });
  const nav = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  try {
    const C = {};
    for (const l of Object.keys(MOTS)) C[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo']) { const k = await C.ana.post('/api/contacts/lien', {}); await C[l].post('/api/liens/accepter', { code: k.j.code }); }
    const kb = await C.ben.post('/api/contacts/lien', {}); await C.cleo.post('/api/liens/accepter', { code: kb.j.code });
    const AB = (await C.ana.post('/api/conversations/directe', { uid: C.ben.moi.id })).j.conversation.id;
    /* une session d'essai de la bêta est COURTE : sur une passe longue elle expire (401 `session_requise`) — chaque partie rouvre les trois clients de l'API (les contacts, eux, tiennent aux comptes) */
    const relier = async () => { await quitterTous(); for (const l of Object.keys(MOTS)) C[l] = await T.connecter(svc, og, l, MOTS[l]); };       // ⛔ on raccroche AVEC les anciens clients : un appel est lié à la session qui y est entrée (`appareil_non_lie` sinon)
    const quitterTous = async () => { for (const c of Object.values(C)) { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };

    /* ── une session = un navigateur d'un profil, connecté ── */
    const ouvrir = async (nomP, login, extra) => {
      const pf = PROFILS[nomP], tactile = !!pf.hasTouch, nuit = !!(extra && extra.nuit);
      const ctx = await nav.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, baseURL: svc.base, colorScheme: nuit ? 'dark' : 'light', permissions: ['camera', 'microphone'] }, pf));
      await ctx.addInitScript(() => {
        window.__pistes = [];
        const gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices) : null;
        if (gum) navigator.mediaDevices.getUserMedia = async (c) => { const f = await gum(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
      });
      const page = await ctx.newPage(); page.setDefaultTimeout(15000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      const S = { ctx, page, nom: nomP, login, tactile, pf, erreurs, nuit };
      S.attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 50 }).then(() => true, () => false);
      S.toucher = async (sel) => { const l = page.locator(sel).filter({ visible: true }).first(); if (tactile) await l.tap(); else await l.click(); };
      S.voit = async (sel, texte, ms) => { try { await page.locator(sel).filter(texte ? { hasText: texte } : {}).first().waitFor({ state: 'visible', timeout: ms || 15000 }); return true; } catch (e) { return false; } };
      S.cache = async (sel, texte, ms) => { try { await page.locator(sel).filter(texte ? { hasText: texte } : {}).first().waitFor({ state: 'hidden', timeout: ms || 15000 }); return true; } catch (e) { return false; } };
      S.capture = async (n) => { await page.screenshot({ path: path.join(DOSSIER, nomP + (nuit ? '-nuit-' : '-jour-') + n + '.png') }); };
      S.aller = async (h) => { await page.evaluate(x => { location.hash = x; }, h); };
      S.poser = () => page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; });
      await page.goto('/');
      const essai = await S.attendre(() => { const c = document.getElementById('c-login'), l = document.querySelector('#f-mel [data-cx-essai]'); return (c && c.getClientRects().length > 0) || (l && !l.hidden && l.getClientRects().length > 0); });
      vrai('population : l\'écran de connexion propose l\'accès d\'essai (' + nomP + ' ' + login + ')', essai);
      if (await page.evaluate(() => { const c = document.getElementById('c-login'); return !(c && c.getClientRects().length > 0); })) await S.toucher('#f-mel [data-cx-essai]');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await S.toucher('#c-entrer');
      vrai('population : ' + NOMS[login] + ' est connecté(e) (' + nomP + ')', await S.attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      return S;
    };
    const programmer = async (extra) => {
      const debut = Date.now() + 2 * MIN;
      const r = await C.ana.post('/api/reunions', Object.assign({ titre: 'Point chantier', debut, fin: debut + H, tz: PARIS, invites: [C.ben.moi.id, C.cleo.moi.id], rappels: [15], notifier: false }, extra || {}));
      return r.j.reunion.id;
    };
    /* entrer dans la salle d'une réunion PAR LA PAGE : fiche → Rejoindre → « avant d'entrer » → Rejoindre */
    const entrerSalle = async (S, rid) => {
      await S.aller('#reunions/' + rid);
      vrai('population : la fiche de la réunion s\'ouvre (' + S.login + ')', await S.attendre(() => !!document.querySelector('[data-reu="rejoindre"]')));
      await S.toucher('[data-reu="rejoindre"][data-type="video"]');
      vrai('population : la feuille « avant d\'entrer » s\'ouvre (' + S.login + ')', await S.attendre(() => !!document.getElementById('avant-rejoindre')));
      await S.toucher('#avant-rejoindre');
    };
    const enSalle = (S) => S.attendre(() => document.documentElement.dataset.salle === '1' && !document.documentElement.hasAttribute('data-sortie'));
    const sidDe = async (c) => { const r = await c.get('/api/appels'); return r.j && r.j.actif && r.j.actif.id; };

    /* ═══ #9 — « 3 appels manqués » ═══ */
    if (joue('manques')) {
      await relier();
      console.log('\n── #9 : trois appels manqués d\'affilée ──');
      for (let i = 0; i < 3; i++) { const a = await C.ana.post('/api/appels', { uid: C.ben.moi.id, type: 'audio' }); const id = a.j.appel && a.j.appel.id; if (id) await C.ana.post('/api/appels/' + id + '/quitter', {}); }
      for (const [nomP, nuit] of [['iphone', false], ['bureau', true]]) {
        const S = await ouvrir(nomP, 'ben', { nuit });
        await S.aller('#appels');
        const ok = await S.attendre(() => Array.from(document.querySelectorAll('#liste-appels .appel-kind')).some(e => /appels manqués/.test(e.textContent)));
        const lignes = await S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-appels .appel-ligne')).map(b => [b.querySelector('.appel-kind').textContent.trim(), b.getAttribute('aria-label')]));
        vrai('⛔ la liste Appels de Ben dit « 3 appels manqués » en UNE ligne (' + nomP + (nuit ? ' · nuit' : '') + ') — lu : ' + JSON.stringify(lignes[0]), ok && lignes.length === 1 && lignes[0][0] === '3 appels manqués' && /3 appels manqués/.test(lignes[0][1]));
        await S.capture('appels-manques');
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #17 — une réunion de plusieurs jours, chaque jour ═══ */
    if (joue('jours')) {
      await relier();
      console.log('\n── #17 : un séminaire de trois jours ──');
      const demain = new Date(); demain.setDate(demain.getDate() + 1); demain.setHours(9, 0, 0, 0);
      const fn = new Date(demain); fn.setDate(fn.getDate() + 2); fn.setHours(12, 0, 0, 0);
      const r = await C.ana.post('/api/reunions', { titre: 'Séminaire équipe', debut: demain.getTime(), fin: fn.getTime(), tz: PARIS, invites: [C.ben.moi.id], rappels: [], notifier: false });
      vrai('population : le séminaire est programmé (' + r.code + ')', r.code === 201);
      for (const [nomP, nuit] of [['iphone', false], ['bureau', true]]) {
        const S = await ouvrir(nomP, 'ben', { nuit });
        await S.aller('#reunions');
        vrai('population : la bande des sept jours porte les trois jours du séminaire (« avec ») — attendue, jamais devinée', await S.attendre(() => document.querySelectorAll('#sem-jours .jour.avec').length >= 3));
        const lire = async (k) => {
          /* le k-ième jour à partir du premier jour « avec » de la bande des sept jours (le fuseau de la page est Paris, pas celui du banc) */
          const dt = await S.page.evaluate((k) => { const b = Array.from(document.querySelectorAll('#sem-jours .jour')); const i0 = b.findIndex(x => x.classList.contains('avec')); const x = b[i0 + k]; if (x) { x.click(); return x.dataset.jour; } return null; }, k);
          await S.attendre((d) => { const x = document.querySelector('#sem-jours .jour[data-jour="' + d + '"]'); return x && x.getAttribute('aria-pressed') === 'true'; }, dt);
          await S.poser();
          /* la liste du jour se relit jusqu'à ce qu'elle soit STABLE (deux lectures de suite égales) : elle se redessine après le toucher, jamais au même instant */
          const lireListe = () => S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions li')).map(li => li.textContent.replace(/\s+/g, ' ').trim()));
          let prec = null, cur = await lireListe();
          for (let i = 0; i < 8 && JSON.stringify(prec) !== JSON.stringify(cur); i++) { prec = cur; await T.dort(250); cur = await lireListe(); }
          return cur;
        };
        const jours = [await lire(0), await lire(1), await lire(2), await lire(3)];
        console.log('   ' + nomP + ' · ' + (nuit ? 'nuit' : 'jour') + ' : ' + JSON.stringify(jours));
        vrai('⛔ le séminaire est dans le jour 1, le jour 2 et le jour 3 — pas le lendemain de sa fin (' + nomP + ')', [0, 1, 2].every(i => jours[i].some(t => /Séminaire équipe/.test(t))) && !jours[3].some(t => /Séminaire équipe/.test(t)));
        vrai('… avec « Jour 1 sur 3 », « Jour 2 sur 3 », « Jour 3 sur 3 »', [1, 2, 3].every((n, i) => jours[i].some(t => new RegExp('Jour ' + n + ' sur 3').test(t))));
        vrai('… et « Suite » les jours 2 et 3 (le jour 1 garde son heure)', jours[1].some(t => /Suite/.test(t)) && jours[2].some(t => /Suite/.test(t)) && !jours[0].some(t => /Suite/.test(t)));
        await lire(1); await S.capture('seminaire-jour2');
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #5 — la fin d'une réunion ═══ */
    if (joue('fin')) {
      await relier();
      console.log('\n── #5 : la réunion se termine pour tous ──');
      for (const [nomP, nuit] of [['iphone', false], ['bureau', true]]) {
        await quitterTous();
        const rid = await programmer({ titre: 'Point fin ' + nomP });
        const ra = await C.ana.post('/api/reunions/' + rid + '/rejoindre', { type: 'audio' }); const sid = ra.j.appel && ra.j.appel.id;
        const S = await ouvrir(nomP, 'ben', { nuit });
        await entrerSalle(S, rid);
        vrai('population : Ben est dans la salle (' + nomP + ')', await enSalle(S));
        await S.capture('salle-avant-fin');
        const camera = await S.page.evaluate(() => window.__pistes.map(t => t.kind + ':' + t.readyState));
        vrai('population : le micro (et la caméra) de Ben sont ouverts avant la fin — ' + JSON.stringify(camera), camera.length > 0 && camera.some(x => /live/.test(x)));
        await T.dort(1500);
        const t0 = Date.now();
        const f = await C.ana.post('/api/salles/' + sid + '/terminer', {});
        v('Ana termine la réunion pour tous', f.code, 200);
        const ok = await S.attendre(() => document.documentElement.hasAttribute('data-sortie') && document.getElementById('sortie-titre').textContent.length > 0);
        vrai('⛔ l\'écran de fin paraît chez Ben (' + nomP + ', ' + (Date.now() - t0) + ' ms)', ok);
        await S.poser();
        const E = await S.page.evaluate(() => ({ titre: document.getElementById('sortie-titre').textContent, raison: document.getElementById('sortie-raison').textContent, faits: Array.from(document.querySelectorAll('#sortie-faits > div')).map(d => d.textContent), bouton: document.getElementById('sortie-bouton').textContent,
          visible: document.getElementById('sortie-ecran').getClientRects().length > 0, salleVisible: document.getElementById('salle-ecran').getClientRects().length > 0, pistes: window.__pistes.map(t => t.readyState), hash: location.hash,
          r: (() => { const r = document.getElementById('sortie-bouton').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(), larg: document.documentElement.scrollWidth, innerW: window.innerWidth }));
        console.log('   écran de fin : ' + JSON.stringify(E));
        vrai('⛔ « Réunion terminée », la phrase du service, « Durée … », « Présents Toi, Ana … », et « Revenir à la conversation »', E.titre === 'Réunion terminée' && /mis fin/.test(E.raison) && E.faits.some(x => /^Durée/.test(x)) && E.faits.some(x => /^Présents/.test(x) && /Ana/.test(x)) && E.bouton === 'Revenir à la conversation');
        vrai('l\'écran de fin est affiché et la salle ne l\'est plus', E.visible && !E.salleVisible);
        vrai('⛔ la caméra et le micro sont ÉTEINTS dès l\'écran de fin (toute piste « ended ») : ' + JSON.stringify(E.pistes), E.pistes.length > 0 && E.pistes.every(x => x === 'ended'));
        vrai('le bouton se touche : ≥ 44 px de haut, la page ne défile pas de côté', E.r[1] >= 44 && E.larg <= E.innerW);
        await S.capture('ecran-fin');
        await T.dort(2500);
        vrai('l\'écran RESTE (2,5 s plus tard, aucun retour automatique)', await S.page.evaluate(() => document.documentElement.hasAttribute('data-sortie')));
        await S.toucher('#sortie-bouton');
        vrai('⛔ « Revenir à la conversation » ouvre la conversation de la réunion (l\'adresse la porte) et ferme la couche', await S.attendre(() => !document.documentElement.hasAttribute('data-sortie') && !document.documentElement.hasAttribute('data-appel') && /#messages\/c_/.test(location.hash)));
        await S.capture('apres-revenir');
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #4 et #8 — un refus d'entrer reste à l'écran ; « Retour » rouvre la fiche d'où l'on est parti ═══ */
    if (joue('refus')) {
      await relier();
      console.log('\n── #4 / #8 : refusé à la porte ──');
      /* trois façons de fermer l'écran de refus : le bouton « Retour », la touche Échap (bureau), le retour système (téléphone) — chacune rouvre la fiche d'où l'on est parti */
      for (const [nomP, nuit, geste] of [['iphone', true, 'bouton'], ['bureau', false, 'echap'], ['iphone', false, 'retour']]) {
        await quitterTous();
        const rid = await programmer({ titre: 'Réunion à porte ' + nomP + geste, salle_attente: true });
        await C.ana.post('/api/reunions/' + rid + '/rejoindre', { type: 'audio' });
        const sid = await sidDe(C.ana);
        const S = await ouvrir(nomP, 'ben', { nuit });
        await entrerSalle(S, rid);
        vrai('⛔ Ben attend à la porte (salle d\'attente) : la salle est ouverte en mode « attente » (' + nomP + ')', await S.attendre(() => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').hasAttribute('data-attente')));
        await S.capture('attente');
        const t0 = Date.now();
        const rf = await C.ana.post('/api/salles/' + sid + '/refuser', { uid: C.ben.moi.id });
        v('Ana refuse Ben', rf.code, 200);
        vrai('⛔ l\'écran de sortie paraît chez Ben, « refus » (' + (Date.now() - t0) + ' ms)', await S.attendre(() => document.documentElement.hasAttribute('data-sortie')));
        await S.poser();
        const E = await S.page.evaluate(() => ({ titre: document.getElementById('sortie-titre').textContent, raison: document.getElementById('sortie-raison').textContent, faits: document.querySelectorAll('#sortie-faits > div').length, bouton: document.getElementById('sortie-bouton').textContent }));
        console.log('   refus : ' + JSON.stringify(E));
        v('⛔ « Tu n\'es pas entré dans la réunion », SA phrase, aucune ligne de faits, « Retour »', [E.titre, E.raison, E.faits, E.bouton], ['Tu n\'es pas entré dans la réunion', 'L\'hôte n\'a pas accepté ta demande.', 0, 'Retour']);
        await S.capture('refus');
        await T.dort(3500);
        vrai('⛔ l\'écran RESTE plus de 3 secondes (le toast d\'avant s\'effaçait en 2,4 s : on n\'avait pas le temps de lire)', await S.page.evaluate(() => document.documentElement.hasAttribute('data-sortie') && document.getElementById('sortie-ecran').getClientRects().length > 0));
        if (geste === 'bouton') await S.toucher('#sortie-bouton'); else if (geste === 'echap') await S.page.keyboard.press('Escape'); else await S.page.goBack();
        vrai('⛔ ' + geste + ' : ferme la couche ET la fiche de la réunion d\'où Ben est parti est VISIBLE et porte le titre (#8)', await S.attendre(() => !document.documentElement.hasAttribute('data-sortie') && !document.documentElement.hasAttribute('data-appel')) && await S.voit('#info-corps .info-nom', 'Réunion à porte ' + nomP + geste));
        if (geste === 'retour') { await S.page.goBack(); vrai('… et un second retour système ferme la fiche (une seule entrée a été posée, pas deux)', await S.cache('#info-corps .info-nom', 'Réunion à porte ' + nomP + geste)); }
        await S.capture('retour-fiche-' + geste);
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #8 — après un appel, on revient à l'écran de départ (les détails d'un appel) ═══ */
    if (joue('retour')) {
      await relier();
      console.log('\n── #8 : appeler depuis les détails d\'un appel, raccrocher ──');
      for (const [nomP, nuit] of [['iphone', false], ['bureau', true]]) {
        await quitterTous();
        { const a1 = await C.ana.post('/api/appels', { uid: C.ben.moi.id, type: 'audio' }); const i1 = a1.j.appel && a1.j.appel.id; if (i1) await C.ana.post('/api/appels/' + i1 + '/quitter', {}); }       // une ligne d'historique chez Ben
        const S = await ouvrir(nomP, 'ben', { nuit });
        await S.aller('#appels');
        vrai('population : la liste des appels de Ben a au moins une ligne (' + nomP + ')', await S.attendre(() => document.querySelectorAll('#liste-appels .appel-ligne').length > 0));
        await S.toucher('#liste-appels li:has(.appel-nom-ligne:text-is("Ana Martin")) [data-infos]');       // la ligne d'Ana (un appel à deux), pas celle d'une salle d'une partie d'avant
        vrai('population : la feuille des détails de l\'appel est ouverte', await S.attendre(() => !!document.querySelector('[data-info-act="rappeler"]')));
        const nomFiche = await S.page.evaluate(() => document.querySelector('#info-corps .info-nom').textContent);
        await S.capture('details-appel');
        await S.toucher('[data-info-act="rappeler"]');
        vrai('⛔ l\'écran d\'appel de Ben est affiché (il rappelle ' + nomFiche + ')', await S.attendre(() => document.documentElement.hasAttribute('data-appel')));
        await S.capture('appel-en-cours');
        await S.toucher('#appel-raccrocher');
        vrai('⛔ Ben raccroche : les détails de l\'appel d\'où il est parti sont ROUVERTS, visibles (' + nomFiche + ')', await S.attendre(() => !document.documentElement.hasAttribute('data-appel')) && await S.voit('#info-corps .info-nom', nomFiche));
        vrai('… sur la liste des appels (la feuille est posée sur elle)', await S.page.evaluate(() => document.documentElement.dataset.vue === 'appels'));
        await S.capture('apres-raccrocher');
        /* le retour système ferme la feuille (une route de plus, jamais deux) et on est sur Appels, comme avant */
        await S.page.goBack();
        vrai('un retour système ferme les détails (la feuille est cachée) : la liste des appels reste', await S.cache('#info-corps .info-nom', nomFiche) && await S.page.evaluate(() => document.documentElement.dataset.vue === 'appels'));
        /* ⛔ contre-épreuve : « Message » pendant l'appel ne rouvre PAS les détails au raccrochage */
        await S.aller('#appels');
        await S.toucher('#liste-appels li:has(.appel-nom-ligne:text-is("Ana Martin")) [data-infos]');       // la ligne d'Ana (un appel à deux), pas celle d'une salle d'une partie d'avant
        await S.attendre(() => !!document.querySelector('[data-info-act="rappeler"]'));
        await S.toucher('[data-info-act="rappeler"]');
        await S.attendre(() => document.documentElement.hasAttribute('data-appel'));
        await S.toucher('#appel-msg');
        vrai('« Message » pendant l\'appel ouvre la conversation (l\'appel est réduit)', await S.attendre(() => document.documentElement.hasAttribute('data-appel-reduit') && /#messages\/c_/.test(location.hash)));
        await S.toucher('#appel-barre-raccrocher');
        await S.attendre(() => !document.documentElement.hasAttribute('data-appel-reduit'));
        vrai('⛔ raccrocher depuis la barre (l\'appel réduit) ne tire PAS vers les détails : on reste sur la conversation, aucune feuille visible', /#messages\/c_/.test(await S.page.evaluate(() => location.hash)) && await S.cache('#info-corps .info-nom', nomFiche, 3000));
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #3 — la bannière d'un message pendant une réunion ═══ */
    if (joue('banniere')) {
      await relier();
      console.log('\n── #3 : un message arrive pendant la réunion ──');
      for (const [nomP, nuit] of [['iphone', false], ['bureau', true]]) {
        await quitterTous();
        const rid = await programmer({ titre: 'Point bannière ' + nomP });
        await C.ana.post('/api/reunions/' + rid + '/rejoindre', { type: 'audio' });
        const S = await ouvrir(nomP, 'ben', { nuit });
        await entrerSalle(S, rid);
        vrai('population : Ben est dans la salle (' + nomP + ')', await enSalle(S));
        await T.dort(1200);
        await C.ana.post('/api/conversations/' + AB + '/messages', { cid: 'c-ban-' + nomP + Date.now(), texte: 'Tu peux me rappeler après ?' });
        vrai('⛔ la bannière du message arrive (une AUTRE conversation que celle de la réunion)', await S.attendre(() => document.getElementById('notif').classList.contains('on')));
        await S.poser();
        const M = await S.page.evaluate(() => {
          const n = document.getElementById('notif'), r = n.getBoundingClientRect(), b = document.getElementById('notif-ouvrir'), br = b.getBoundingClientRect(), c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), t = document.getElementById('salle-titre').getBoundingClientRect();
          return { h: Math.round(r.height), pe: getComputedStyle(n).pointerEvents, centreNotif: !!(c && c.closest('#notif')), centreSous: c ? (c.closest('#salle-ecran') ? 'salle' : c.tagName) : null, bouton: [Math.round(br.width), Math.round(br.height)], bvisible: br.width > 0, texte: n.textContent.replace(/\s+/g, ' ').trim(),
            recouvreTitre: !(r.bottom < t.top || r.top > t.bottom || r.right < t.left || r.left > t.right), x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2), bx: Math.round(br.left + br.width / 2), by: Math.round(br.top + br.height / 2) };
        });
        console.log('   bannière : ' + JSON.stringify(M));
        await S.capture('banniere-en-salle');
        vrai('⛔ la bannière est FINE (≤ 56 px), son corps laisse passer le toucher (le centre est la salle), son bouton « Ouvrir » existe (44 px de zone)', M.h <= 56 && M.pe === 'none' && !M.centreNotif && M.centreSous === 'salle' && M.bvisible && M.bouton[1] >= 32);
        /* un vrai toucher au CORPS de la bannière : la salle reste, rien ne s'ouvre */
        if (S.tactile) await S.page.touchscreen.tap(M.x, M.y); else await S.page.mouse.click(M.x, M.y);
        await S.poser();
        vrai('⛔ un toucher au corps de la bannière : la salle reste affichée, non réduite, l\'adresse n\'a pas bougé', await S.page.evaluate(() => document.documentElement.dataset.salle === '1' && !document.documentElement.hasAttribute('data-appel-reduit') && !/#messages\/c_/.test(location.hash)));
        vrai('… et la bannière est toujours là', await S.page.evaluate(() => document.getElementById('notif').classList.contains('on')));
        if (S.tactile) await S.page.touchscreen.tap(M.bx, M.by); else await S.page.mouse.click(M.bx, M.by);
        vrai('⛔ « Ouvrir » ouvre la conversation de l\'autre (l\'adresse la porte) et RÉDUIT la salle (elle continue)', await S.attendre((ab) => document.documentElement.hasAttribute('data-appel-reduit') && location.hash === '#messages/' + ab, AB));
        await S.capture('banniere-apres-ouvrir');
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }

    /* ═══ #18 — l'organisateur qui « Quitte » ═══ */
    if (joue('quitter')) {
      await relier();
      console.log('\n── #18 : Ana quitte sa réunion, Ben devient l\'organisateur ──');
      for (const [pa, pb, nuit] of [['bureau', 'iphone', false], ['iphone', 'bureau', true]]) {
        await quitterTous();
        const rid = await programmer({ titre: 'Réunion à passer ' + pa });
        const A = await ouvrir(pa, 'ana', { nuit }), B = await ouvrir(pb, 'ben', { nuit });
        await entrerSalle(A, rid);
        vrai('population : Ana est dans la salle (' + pa + ')', await enSalle(A));
        await entrerSalle(B, rid);
        vrai('population : Ben est dans la salle (' + pb + ')', await enSalle(B));
        const sid = await sidDe(C.ana);
        await T.dort(800);
        const avant = (await C.ben.get('/api/salles/' + sid)).j.appel.moi;
        v('population : Ben est simple participant avant le départ d\'Ana', [avant.grade, !!avant.interim], [0, false]);
        await A.toucher('#salle-quitter');
        vrai('⛔ Ana touche « Quitter » : le panneau des deux choix s\'ouvre', await A.attendre(() => !document.getElementById('salle-panneau').hidden && !!document.querySelector('[data-sa="quitter-simple"]')));
        const phrase = await A.page.evaluate(() => document.querySelector('#salle-panneau-corps .salle-note').textContent);
        console.log('   phrase : ' + phrase);
        vrai('⛔ la phrase dit ce que fait le service : « Tu organises cette réunion … l\'invité suivant … en devient l\'organisateur, avec tous les gestes d\'un hôte »', /Tu organises cette réunion/.test(phrase) && /l'invité suivant dans la salle en devient l'organisateur, avec tous les gestes d'un hôte/.test(phrase));
        await A.capture('quitter-panneau');
        await A.toucher('[data-sa="quitter-simple"]');
        await A.attendre(() => !document.documentElement.hasAttribute('data-appel'));
        const apres = (await C.ben.get('/api/salles/' + sid)).j.appel.moi;
        v('⛔ le service : Ben est le nouvel organisateur (grade 2, pas intérimaire)', [apres.grade, !!apres.interim], [2, false]);
        /* chez Ben : « Plus » propose « Terminer pour tous » (un hôte qui n'est pas intérimaire) */
        await B.toucher('#salle-plus');
        vrai('⛔ chez Ben, « Plus » propose « Terminer pour tous » et la sécurité de la salle (verrou)', await B.attendre(() => !document.getElementById('salle-panneau').hidden && /Terminer pour tous/.test(document.getElementById('salle-panneau-corps').textContent) && /verrou/i.test(document.getElementById('salle-panneau-corps').textContent)));
        await B.capture('plus-nouvel-organisateur');
        const verr = await C.ben.post('/api/salles/' + sid + '/verrouiller', { actif: true });
        v('… et le service lui laisse verrouiller (200)', verr.code, 200);
        for (const S of [A, B]) v('aucune erreur JavaScript (' + S.login + ')', S.erreurs, []);
        await A.ctx.close(); await B.ctx.close();
      }
    }

    /* ═══ #2 — la fiche d'une réunion terminée ═══ */
    if (joue('fiche')) {
      await relier();
      console.log('\n── #2 : la fiche d\'une réunion terminée, et celle d\'une réunion à venir ──');
      await quitterTous();
      const rT = await programmer({ titre: 'Réunion finie' });
      await C.ana.post('/api/reunions/' + rT + '/rejoindre', { type: 'audio' }); await C.ben.post('/api/reunions/' + rT + '/rejoindre', { type: 'audio' });
      const sT = await sidDe(C.ana); await T.dort(1200);
      v('population : Ana termine la réunion pour tous', (await C.ana.post('/api/salles/' + sT + '/terminer', {})).code, 200);
      const debutV = Date.now() + 3 * H;
      const rV = (await C.ana.post('/api/reunions', { titre: 'Réunion à venir', debut: debutV, fin: debutV + H, tz: PARIS, invites: [C.ben.moi.id], rappels: [15], lieu: '12 rue des Lilas, Lyon', notifier: false })).j.reunion.id;
      for (const [nomP, nuit] of [['iphone', true], ['bureau', false]]) {
        const S = await ouvrir(nomP, 'ben', { nuit });
        await S.aller('#reunions/' + rV);
        vrai('population : la fiche de la réunion À VENIR propose « Ta réponse », « Me rappeler » (' + nomP + ')', await S.voit('#info-corps .info-nom', 'Réunion à venir') && await S.attendre(() => !!document.querySelector('[data-reu="reponse"]') && !!document.getElementById('reu-rappels')));
        await S.capture('fiche-a-venir');
        await S.aller('#reunions');
        await S.aller('#reunions/' + rT);
        vrai('⛔ la fiche de la réunion TERMINÉE s\'ouvre (' + nomP + ')', await S.voit('#info-corps .info-nom', 'Réunion finie'));
        await S.attendre(() => /terminée/.test(document.getElementById('info-corps').textContent));
        const F = await S.page.evaluate(() => ({ txt: document.getElementById('info-corps').textContent.replace(/\s+/g, ' '), reponse: !!document.querySelector('#info-corps [data-reu="reponse"]'), rappels: !!document.getElementById('reu-rappels'), puces: document.querySelectorAll('#info-corps .rappel-puce').length, trajet: !!document.getElementById('reu-trajet-zone'), rejoindre: !!document.querySelector('#info-corps [data-reu="rejoindre"]'), parts: document.querySelectorAll('#info-corps .contact').length }));
        console.log('   fiche terminée : ' + JSON.stringify({ reponse: F.reponse, rappels: F.rappels, puces: F.puces, trajet: F.trajet, rejoindre: F.rejoindre, parts: F.parts, extrait: F.txt.slice(0, 200) }));
        vrai('⛔ terminée : plus de « Ta réponse », de « Me rappeler », de puces, de zone du trajet — ni de « Rejoindre »', !F.reponse && !F.rappels && F.puces === 0 && !F.trajet && !F.rejoindre && !/Ta réponse|Me rappeler/.test(F.txt));
        vrai('… la durée, les présents (« terminée · Durée … · 2 présents ») et les participants (≥ 2 lignes) restent', /Cette réunion est terminée/.test(F.txt) && /Durée \d+ min/.test(F.txt) && /2 présents/.test(F.txt) && F.parts >= 2);
        await S.capture('fiche-terminee');
        v('aucune erreur JavaScript', S.erreurs, []);
        await S.ctx.close();
      }
    }
  } finally {
    await nav.close(); await svc.arreter(); await og.fermer();
  }
  fin();
})().catch((e) => { console.error('✗ la sonde est morte :', e && e.stack || e); process.exit(1); });
