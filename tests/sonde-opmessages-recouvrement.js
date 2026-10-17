/* ══ SONDE — CE QUI SE POSE PAR-DESSUS L'ÉCRAN NE RECOUVRE NI TITRE NI COMMANDE (lot m07, 17 octobre 2026) ═══════════════════════════════════════════════════
   Trois choses se posent en travers de l'écran de la VRAIE PAGE SERVIE (`server-msg/public/`), contre le VRAI service, et les testeurs ont mesuré chacune au-dessus de ce qu'on touche :
     · le PETIT MOT (`#mot`, « Lien copié », « Marquer comme fait », « OP MESSAGES PRO »…) — il se posait à 56 px du haut : sur le grand titre « Tableau de bord » (≈ 42 % de sa surface),
       sur le segmenté Semaine / Mois, sur « Fermer » et le titre d'une feuille (pro#7, agenda#3) ;
     · la BANDE « Connexion perdue — reconnexion en cours… » — `position: fixed; top: 0` : elle cachait le logo, « Messages / Modifier / + », « Ajouter » de Contacts, l'avatar et le titre de
       la conversation, « Quitter » de la salle, tant que la coupure durait (temps-reel#4, contacts@10, salle@3) ;
     · (la bannière d'arrivée de la discussion de la salle est gardée par `tests/test-2430.js`, les vraies fonctions de la page).
   Ce que la sonde exige, sur quatre appareils (360, 390 avec encoche, 820, 1 440) et sur les écrans où l'on est vraiment (la liste, une conversation, Contacts, l'Agenda, une feuille) :
     1. le petit mot, court et long, ne recouvre AUCUN titre ni AUCUNE commande de l'en-tête, de la feuille, de la barre d'onglets ni du champ d'écriture ;
     2. la bande hors ligne ne recouvre rien non plus : le contenu est POUSSÉ de sa hauteur, et revient en place quand la connexion revient.
   ⛔ MESURE : le candidat est AMENÉ au milieu de l'écran quand il défile ; on attend deux images ET une lecture forcée avant de lire (CLAUDE.md, « la barre de défilement verticale »), et la
   mesure est faite DEUX FOIS (un rangement après coup ne se prend pas pour un recouvrement). ⛔ Chaque « rien ne recouvre » est précédé de sa POPULATION (combien de commandes ont été
   examinées) — un recouvrement qu'on ne regarderait pas passerait pour une absence. Les encoches sont posées (`Emulation.setSafeAreaInsetsOverride`).
   Lancer :   node tests/sonde-opmessages-recouvrement.js         CAPTURES=/dossier pour les images.        Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234' };
const PROFILS = {
  android: { w: 360, h: 800, mobile: true, insets: { top: 0, bottom: 0 } },
  iphone: { w: 390, h: 844, mobile: true, insets: { top: 47, bottom: 34 } },
  ipad: { w: 820, h: 1180, mobile: true, insets: { top: 0, bottom: 0 } },
  mac: { w: 1440, h: 900, mobile: false, insets: null },
};
/* ce que le petit mot ne doit jamais recouvrir : les titres et les COMMANDES FIXES (l'en-tête, la feuille, la barre d'onglets, le champ d'écriture) — pas les lignes d'une liste, qui défilent */
const PROTEGES_MOT = 'h1, .grand-titre, .entete-vue button, .entete-vue a, #reu-vue-seg, #reu-vue-seg *, .feuille-tete *, .conv-nav *, .tabs, .tabs *, .composer button, .composer textarea, .side *';
/* ce que la bande hors ligne ne doit jamais recouvrir : tout ce qui se tient en haut de l'écran */
const PROTEGES_BANDE = 'h1, .grand-titre, .entete-vue *, .marque-tel, .conv-nav *, .conv-salle, .side *, .feuille-tete *';

/* ce que la page répond : chaque élément protégé, visible, qui touche le rectangle (sans lui-même en faire partie) */
const MESURE = `(function (sel, rect) {
  const sortie = [], vus = new Set(); let examines = 0;
  const visible = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; } return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  for (const e of document.querySelectorAll(sel)) {
    if (e.closest('#mot, #hors-ligne, #notif, svg') || !visible(e)) continue;
    examines++;
    const r = e.getBoundingClientRect(), w = Math.min(r.right, rect.right) - Math.max(r.left, rect.left), h = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
    if (w > 1 && h > 1) {
      /* ⛔ « recouvert » veut dire VU puis caché : au point de l'intersection, l'élément qui reçoit la vue (le petit mot et la bande ne reçoivent rien, ils sont en pointer-events:none) est lui ou sa lignée —
         sinon c'est autre chose qui le couvre déjà (la conversation qui recouvre la liste, une feuille fermée) et le petit mot ne lui ôte rien */
      const px = Math.max(Math.max(r.left, rect.left), 0) + w / 2, py = Math.max(Math.max(r.top, rect.top), 0) + h / 2;
      const pile = document.elementsFromPoint(Math.min(px, innerWidth - 1), Math.min(py, innerHeight - 1)).filter(x => !x.closest('#mot, #hors-ligne, #notif'));
      const haut = pile[0]; if (!haut || !(e.contains(haut) || haut.contains(e))) continue;
      const nom = (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : '')) + ' « ' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + ' »'; if (!vus.has(nom)) { vus.add(nom); sortie.push(nom + ' ' + Math.round(w) + '×' + Math.round(h)); }
    }
  }
  return { examines, recouverts: sortie };
})`;

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOTS.alice, nom: 'Alice Martin', actif: true }, bruno: { pass: MOTS.bruno, nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], beta: { relectureMs: 300 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await T.connecter(svc, og, 'alice', MOTS.alice), Bb = await T.connecter(svc, og, 'bruno', MOTS.bruno);
    const lien = await A.post('/api/contacts/lien', { max: 1 }); await Bb.post('/api/liens/accepter', { code: lien.j.code });
    const conv = (await A.post('/api/conversations/directe', { uid: Bb.moi.id })).j.conversation.id;
    await Bb.post('/api/conversations/' + conv + '/messages', { cid: 'c-' + Date.now(), texte: 'Bonjour, tu passes demain ?' });
    vrai('population : la conversation Alice–Bruno existe', /^c_[0-9a-f]{32}$/.test(conv));

    for (const [nom, pf] of Object.entries(PROFILS)) {
      console.log('\n══ ' + nom + ' ' + pf.w + '×' + pf.h + (pf.insets && pf.insets.top ? ' (encoche ' + pf.insets.top + '/' + pf.insets.bottom + ')' : '') + ' ══');
      const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: 1, isMobile: pf.mobile, hasTouch: pf.mobile, reducedMotion: 'reduce', locale: 'fr-FR', baseURL: svc.base });
      const page = await ctx.newPage(); page.setDefaultTimeout(9000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
      const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
      /* deux images et une lecture forcée, puis la mesure, DEUX FOIS (la seconde doit redire la première) */
      const poser = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; setTimeout(r, 450); }))));
      const mesurer = async (sel, rectJs) => {
        await poser();
        const a = await page.evaluate(`(${MESURE})(${JSON.stringify(sel)}, (${rectJs})())`);
        await poser();
        const c = await page.evaluate(`(${MESURE})(${JSON.stringify(sel)}, (${rectJs})())`);
        return JSON.stringify(a.recouverts) === JSON.stringify(c.recouverts) ? a : { examines: a.examines, recouverts: a.recouverts.filter(x => c.recouverts.includes(x)), instable: true };
      };
      const RECT_MOT = `() => { const r = document.getElementById('mot').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }`;
      const RECT_BANDE = `() => { const r = document.getElementById('hors-ligne').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }`;
      const motPose = (texte) => page.evaluate(t => { const m = document.getElementById('mot'); m.textContent = t; m.classList.add('on'); }, texte);
      const motRange = () => page.evaluate(() => document.getElementById('mot').classList.remove('on'));
      const capture = async (n) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, nom + '-' + n + '.png') }); };
      const coupe = () => page.evaluate(() => window.dispatchEvent(new Event('offline')));
      const rend = () => page.evaluate(() => window.dispatchEvent(new Event('online')));

      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOTS.alice); await page.locator('#c-entrer').click();
      vrai('population : Alice est connectée dans la vraie page servie', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, 12000));
      const COURT = 'Lien copié', LONG = 'La nouvelle version n\'a pas encore pu s\'installer : réessaie dans un instant, le temps que le relais serve la bonne.';
      const ecrans = [
        ['la liste', '#messages'], ['une conversation', '#messages/' + encodeURIComponent(conv)], ['Contacts', '#contacts'], ['l\'Agenda', '#reunions'],
      ];
      for (const [titre, hash] of ecrans) {
        await page.evaluate(h => { location.hash = h; }, hash);
        await attendre(h => location.hash === h, hash, 4000);
        await page.waitForTimeout(700);

        /* — 1. le petit mot — */
        for (const [genre, texte] of [['court', COURT], ['long', LONG]]) {
          await motPose(texte);
          const r = await mesurer(PROTEGES_MOT, RECT_MOT);
          vrai('(population) ' + nom + ' · ' + titre + ' · mot ' + genre + ' : ' + r.examines + ' commandes ou titres examinés', r.examines >= 2);
          v('⛔ ' + nom + ' · ' + titre + ' : le petit mot ' + genre + ' ne recouvre aucun titre ni aucune commande', r.recouverts, []);
          if (genre === 'long') await capture('mot-' + titre.replace(/[^\w]+/g, '_'));
          await motRange();
        }

        /* — 2. la bande hors ligne — */
        /* l'en-tête de la vue visible et son champ de recherche : la bande les pousse de SA hauteur, ni plus (lot p03, n#11 : 56 px au lieu de 28 sur la liste « Messages » du bureau — la barre vitrée
           recouvrait « Rechercher ») ni moins */
        const ENTETE_VUE = () => page.evaluate(() => {
          const vis = Array.from(document.querySelectorAll('.vue')).find(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'), en = vis && vis.querySelector(':scope > .entete-vue');
          const rech = vis && vis.querySelector('input[type=search], .recherche');
          return en ? { haut: Math.round(en.getBoundingClientRect().top), bas: Math.round(en.getBoundingClientRect().bottom), champ: rech && rech.getBoundingClientRect().height ? Math.round(rech.getBoundingClientRect().top) : null } : null;
        });
        await poser(); const enteteAvant = await ENTETE_VUE();
        await coupe();
        vrai(nom + ' · ' + titre + ' : la bande « Connexion perdue » est là', await attendre(() => { const e = document.getElementById('hors-ligne'); return !!e && !e.hidden && e.getClientRects().length > 0; }, null, 4000));
        const r = await mesurer(PROTEGES_BANDE, RECT_BANDE);
        vrai('(population) ' + nom + ' · ' + titre + ' · bande : ' + r.examines + ' commandes ou titres examinés', r.examines >= 2);
        v('⛔ ' + nom + ' · ' + titre + ' : la bande hors ligne ne recouvre rien (le contenu est poussé de sa hauteur)', r.recouverts, []);
        await poser(); const enteteApres = await ENTETE_VUE(), bande = await page.evaluate(() => Math.round(parseFloat(getComputedStyle(document.body).paddingTop)));      /* la poussée du corps (28 px), pas la hauteur peinte de la bande : l'encoche s'y ajoute et le contenu garde son propre rembourrage */
        vrai('(population) ' + nom + ' · ' + titre + ' : l\'en-tête de la vue est mesuré en ligne et hors ligne, la bande pousse de ' + bande + ' px', !!enteteAvant && !!enteteApres && bande >= 20);
        if (enteteAvant && enteteApres) {
          vrai('⛔ ' + nom + ' · ' + titre + ' : l\'en-tête descend de la hauteur de la bande, ni plus ni moins (' + enteteAvant.haut + ' → ' + enteteApres.haut + ', bande ' + bande + ' px)', Math.abs(enteteApres.haut - enteteAvant.haut - bande) <= 1);
          if (enteteApres.champ !== null) vrai('⛔ ' + nom + ' · ' + titre + ' : la barre de l\'en-tête (bas ' + enteteApres.bas + ' px) ne recouvre pas le champ de recherche (haut ' + enteteApres.champ + ' px)', enteteApres.bas <= enteteApres.champ + 1);
        }
        const debord = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth }));
        vrai(nom + ' · ' + titre + ' : et rien ne déborde sur le côté (' + debord.x + ' px)', debord.x <= 0);
        await capture('hors-ligne-' + titre.replace(/[^\w]+/g, '_'));
        await rend();
        vrai(nom + ' · ' + titre + ' : la connexion revenue, la bande disparaît et le contenu revient en place', await attendre(() => document.getElementById('hors-ligne').hidden, null, 4000)
          && await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingTop) === 0));
      }

      /* — 3. une feuille ouverte (le fond est un voile, inerte) : le petit mot ne recouvre ni son titre ni « Annuler / Créer » — */
      await page.evaluate(() => { location.hash = '#messages'; }); await page.waitForTimeout(500);
      await page.locator('#btn-plus').click();
      const ouverte = await attendre(() => document.documentElement.classList.contains('feuille-ouverte'), null, 5000);
      vrai('population : la feuille « Nouvelle discussion » est ouverte', ouverte);
      if (ouverte) {
        await page.waitForTimeout(700);
        for (const [genre, texte] of [['court', COURT], ['long', LONG]]) {
          await motPose(texte);
          const r = await mesurer(PROTEGES_MOT, RECT_MOT);
          vrai('(population) ' + nom + ' · feuille · mot ' + genre + ' : ' + r.examines + ' commandes ou titres examinés', r.examines >= 2);
          v('⛔ ' + nom + ' · feuille : le petit mot ' + genre + ' ne recouvre ni le titre ni les boutons de la feuille', r.recouverts, []);
          if (genre === 'long') await capture('mot-feuille');
          await motRange();
        }
      }
      v(nom + ' : aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } catch (e) { vrai('la sonde ne meurt pas : ' + (e && e.stack || e), false); }
  finally { try { await b.close(); } catch (e) { /* déjà fermé */ } await svc.arreter(); await og.fermer(); }
  fin();
})();
