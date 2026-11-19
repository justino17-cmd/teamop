// RECONTRÔLE ADVERSE des « restes du bouton Retour, tour 3 » (19 novembre 2026) : les corrections appliquent la règle « Retour ferme la couche du dessus, rien d'autre » (menu de la Boîte mail = niveau
// d'historique, entrée orpheline du composeur sautée, OP Security rangé par aller() et par le redimensionnement, « ‹ OP GESTION » ferme la couche du cadre, double clic dédoublonné).
// On cherche ce qu'elles ont pu CASSER À CÔTÉ, ou la même règle laissée aux autres couches :
//  A  : téléphone, lecture + menu d'actions : DEUX niveaux (Retour ferme le menu, Retour ferme la lecture, Retour quitte)
//  B  : ouvrir/fermer un menu dans la MÊME tâche, puis UN Retour : l'historique et l'écran restent d'accord
//  C  : deux Retours coup sur coup (menu ouvert) ; Retour puis Avancer (l'orpheline sautée ne casse pas l'avance)
//  D  : les autres menus de la Boîte mail (clic droit sur un message, menu d'une boîte, confirmation « Supprimer la boîte ») : UN Retour les ferme
//  E  : menu ouvert puis départ par programme (aller) : UN Retour revient à la Boîte mail, sans menu
//  F  : autres couches du MÊME module (colonne des Boîtes de l'iPad, aperçu d'un PDF) : UN Retour ferme la couche, il ne quitte pas
//  G  : « ‹ OP GESTION » n'est pas la seule sortie du cadre de la Comptabilité : « Factures et paiements », le menu ☰, aller() — le panneau du cadre est-il refermé au retour ?
//  H  : OP Security : élargi pendant que le téléphone est ouvert en plein écran puis Retour ; rétréci puis rouvert
// PROFIL=android|iphone|mac|ipad|windows|petit ; NUIT=1 ; QUI=marc|julie|sm|kb ; SECTION=A,B… Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, QUI = process.env.QUI || 'marc';
const SEC = (process.env.SECTION || 'A,B,C,D,E,F,G,H').split(',');
// « téléphone » au sens du MODULE de la Boîte mail (isPhone) : l'iPad en 820 px porte la mise en page du téléphone (lecture = un niveau d'historique), l'ordinateur non
const tel = ['android', 'iphone', 'petit', 'ipad'].includes(PROFIL);
const H = p => p.evaluate(() => ({ h: location.hash, n: history.length, st: history.state, pousse: CAL.pousse, pile: CAL.pile.join(','), off: CAL.off, sec: !!document.querySelector('#opsec[data-ouvert]'), w: innerWidth,
  ov: (() => { const r = window.R && window.R(); const o = r && r.querySelector('#overlay'); return o ? o.className : null; })(),
  vue: (() => { const r = window.R && window.R(); const a = r && r.querySelector('.app'); return a ? a.getAttribute('data-view') : null; })(),
  nav: (() => { const r = window.R && window.R(); const a = r && r.querySelector('.app'); return a ? a.classList.contains('nav-open') : null; })(),
  pdf: (() => { const r = window.R && window.R(); return !!(r && r.querySelector('#pdfv')); })() }));
const ouvrirMail = async () => { const c = await M.entrer({ profil: PROFIL, nuit: NUIT, qui: QUI }); await L.aller(c.p, 'clients'); await L.aller(c.p, 'boiteMail'); await M.pret(c.p, 6000); return c; };
const clic = (p, s) => p.evaluate(sel => { const b = window.R().querySelector(sel); if (b) b.click(); return !!b; }, s);
(async () => {
  if (SEC.includes('A') && tel) {
    const c = await ouvrirMail(), p = c.p;
    await p.evaluate(() => { const m = window.R().querySelector('#rows .msg'); if (m) m.click(); }); await p.waitForTimeout(800);
    const e0 = await H(p); v('A la lecture est ouverte (population) : vue ' + e0.vue, e0.vue === 'reading', e0);
    const ok = await clic(p, '[data-act="replyMenu"]'); await p.waitForTimeout(500); const e1 = await H(p);
    v('A le menu d\'actions est ouvert (population) et pose un second niveau', ok && e1.ov === 'overlay ov-menu ov-asheet' && e1.st && e1.st.opcourrier === 2, e1);
    await C.retour(p); const e2 = await H(p); v('A UN Retour ferme le menu, la lecture reste', e2.ov === null && e2.vue === 'reading' && e2.h === '#boiteMail', e2);
    await C.retour(p); const e3 = await H(p); v('A le Retour suivant ferme la lecture (liste), on est encore dans la Boîte mail', e3.vue === 'list' && e3.h === '#boiteMail', e3);
    await C.retour(p); const e4 = await H(p); v('A le troisième quitte la Boîte mail — ' + e4.h, e4.h === '#clients', e4);
    v('A aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('B')) {
    const c = await ouvrirMail(), p = c.p; const n0 = (await H(p)).n;
    // ouvrir puis fermer (clic sur le fond) puis rouvrir, TOUT dans la même tâche
    await p.evaluate(() => { const r = window.R(); r.querySelector('#btnFilter').click(); const ov = r.querySelector('#overlay'); ov.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); ov.click(); r.querySelector('#btnFilter').click(); });
    await p.waitForTimeout(700); const e0 = await H(p);
    v('B ouvert-fermé-rouvert dans la même tâche : un seul menu, UNE entrée du module', e0.ov === 'overlay ov-menu' && e0.st && e0.st.opcourrier === 1 && e0.n <= n0 + 1, e0);
    await C.retour(p); const e1 = await H(p); v('B UN Retour ferme le menu et reste dans la Boîte mail', e1.ov === null && e1.h === '#boiteMail', e1);
    // fermé dans la même tâche que l'ouverture : rien ne doit rester
    await p.evaluate(() => { const r = window.R(); r.querySelector('#btnFilter').click(); const ov = r.querySelector('#overlay'); ov.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); ov.click(); });
    await p.waitForTimeout(700); const e2 = await H(p);
    v('B ouvert-fermé dans la même tâche : aucun menu, aucune entrée du module restée', e2.ov === null && e2.st === null, e2);
    await C.retour(p); const e3 = await H(p); v('B UN Retour quitte la Boîte mail (rien à fermer) — ' + e3.h, e3.h === '#clients', e3);
    // dix cycles rapides (50 ms) : l'historique ne grossit pas et reste d'accord avec l'écran
    await L.aller(p, 'boiteMail'); await M.pret(p, 6000); const n1 = (await H(p)).n;
    for (let i = 0; i < 10; i++) { await clic(p, '#btnFilter'); await p.waitForTimeout(50); await p.keyboard.press('Escape'); await p.waitForTimeout(50); }
    await p.waitForTimeout(900); const e4 = await H(p);
    v('B dix ouvertures-fermetures à 50 ms : ' + n1 + ' → ' + e4.n + ' entrées, aucun menu, aucune entrée du module', e4.n <= n1 + 1 && e4.ov === null && e4.st === null, e4);
    // le cycle à 50 ms laissé ouvert : UN Retour ferme
    await clic(p, '#btnFilter'); await p.waitForTimeout(40); await p.keyboard.press('Escape'); await p.waitForTimeout(40); await clic(p, '#btnFilter'); await p.waitForTimeout(900);
    const e5 = await H(p); await C.retour(p); const e6 = await H(p);
    v('B ouvert-fermé-rouvert à 40 ms puis UN Retour : le menu est fermé, la Boîte mail reste (menu avant : ' + e5.ov + ')', e5.ov === 'overlay ov-menu' && e6.ov === null && e6.h === '#boiteMail', { e5, e6 });
    v('B aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('C')) {
    const c = await ouvrirMail(), p = c.p;
    await clic(p, '#btnFilter'); await p.waitForTimeout(500);
    await p.goBack().catch(() => {}); await p.goBack().catch(() => {}); await C.attendre(p, 900); const e0 = await H(p);
    v('C deux Retours coup sur coup, menu ouvert : on a quitté la Boîte mail, aucun menu — ' + e0.h, e0.h === '#clients' && e0.ov === null, e0);
    await C.avancer(p); const e1 = await H(p); v('C Avancer revient dans la Boîte mail sans menu fantôme — ' + e1.h, e1.h === '#boiteMail' && e1.ov === null, e1);
    await C.retour(p); const e2 = await H(p); v('C puis Retour : Clients — ' + e2.h, e2.h === '#clients', e2);
    // menu ouvert, un Retour (ferme), Avancer : l'entrée sautée ne casse pas la Boîte mail
    await C.avancer(p); await M.pret(p, 6000); await clic(p, '#btnFilter'); await p.waitForTimeout(500);
    await C.retour(p); const e3 = await H(p); await C.avancer(p); const e4 = await H(p);
    v('C menu fermé par Retour puis Avancer : on est dans la Boîte mail, sans menu rouvert ni écran changé (' + e3.h + ' → ' + e4.h + ', n ' + e3.n + ' → ' + e4.n + ')', e4.h === '#boiteMail' && e4.ov === null, { e3, e4 });
    await C.retour(p); const e5 = await H(p); v('C puis Retour : on quitte la Boîte mail (' + e5.h + ') — l\'Avancer n\'a pas laissé de Retour muet', e5.h === '#clients', e5);
    v('C aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('D')) {
    // D1 : menu d'actions d'un message par un clic droit (ordinateur) ou un appui long (téléphone)
    {
      const c = await ouvrirMail(), p = c.p;
      let ok = false;
      try { const l = p.locator('#courrier-hote [data-opcourrier] >> css=#rows .msg').first(); await l.click({ button: 'right', timeout: 4000 }); ok = true; } catch (e) { ok = false; }
      await p.waitForTimeout(500); const e0 = await H(p);
      if (!ok || !e0.ov) {
        // le clic droit n'existe pas partout : on appelle le menu comme le fait l'appui long
        await p.evaluate(() => { const r = window.R(); const m = r.querySelector('#rows .msg'); const b = m.getBoundingClientRect(); m.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: b.left + 20, clientY: b.top + 20, cancelable: true })); }); await p.waitForTimeout(500);
      }
      const e1 = await H(p); v('D1 le menu du message est ouvert (population)', !!e1.ov && e1.ov.includes('ov-menu'), e1);
      await C.retour(p); const e2 = await H(p); v('D1 UN Retour le ferme et reste dans la Boîte mail', e2.ov === null && e2.h === '#boiteMail', e2);
      await C.retour(p); const e3 = await H(p); v('D1 le suivant quitte — ' + e3.h, e3.h === '#clients', e3);
      v('D1 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
    }
    // D2 : menu d'une boîte (clic droit / appui long sur une ligne de la colonne des Boîtes), puis « Supprimer la boîte… » : la confirmation est une seconde feuille de menu ; Retour la ferme SANS supprimer
    {
      const c = await ouvrirMail(), p = c.p; const w = L.PROFILS[PROFIL].w;
      if (w < 1000) { await clic(p, '#btnNav'); await p.waitForTimeout(700); }
      const nb0 = await p.evaluate(() => window.R().querySelectorAll('.scope-row').length);
      const menu = () => p.evaluate(() => { const r = window.R(); const m = r.querySelector('.scope-row[data-scope^="acct"], .scope-row[data-scope]:not([data-scope="all"]):not([data-scope="pro"]):not([data-scope="perso"])') || r.querySelectorAll('.scope-row')[1]; if (!m) return false; const b = m.getBoundingClientRect(); m.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: b.left + 20, clientY: b.top + 10, cancelable: true })); return !!r.querySelector('#overlay'); });
      const ouvert = await menu(); await p.waitForTimeout(500); const e0 = await H(p);
      v('D2 le menu de la boîte est ouvert (population : ' + nb0 + ' lignes)', ouvert && !!e0.ov, e0);
      if (e0.ov) {
        await C.retour(p); const e1 = await H(p); v('D2 UN Retour ferme le menu de la boîte, la Boîte mail reste (' + e1.h + ')', e1.ov === null && e1.h === '#boiteMail', e1);
        await menu(); await p.waitForTimeout(500);
        const nbAvant = await p.evaluate(() => window.R().querySelectorAll('.scope-row').length);
        const del = await p.evaluate(() => { const b = window.R().querySelector('#overlay [data-pick="del"]'); if (b) b.click(); return !!b; }); await p.waitForTimeout(600); const e2 = await H(p);
        v('D2 « Supprimer la boîte… » ouvre la confirmation (population)', del && !!e2.ov && e2.st && e2.st.opcourrier >= 1, e2);
        await C.retour(p); const e3 = await H(p); const nbApres = await p.evaluate(() => window.R().querySelectorAll('.scope-row').length);
        v('D2 UN Retour ferme la confirmation SANS supprimer (' + nbAvant + ' → ' + nbApres + ' lignes), la Boîte mail reste', e3.ov === null && e3.h === '#boiteMail' && nbApres === nbAvant, e3);
      }
      v('D2 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
    }
  }
  if (SEC.includes('E')) {
    const c = await ouvrirMail(), p = c.p;
    await clic(p, '#btnFilter'); await p.waitForTimeout(500); const e0 = await H(p); v('E le menu est ouvert (population)', e0.ov === 'overlay ov-menu', e0);
    await L.aller(p, 'taches'); await p.waitForTimeout(700); const e1 = await H(p);
    v('E aller() : on est sur les tâches, il ne reste aucun menu', e1.h === '#taches', e1);
    await C.retour(p); const e2 = await H(p); v('E UN Retour revient à la Boîte mail — ' + e2.h + ' (menu : ' + e2.ov + ')', e2.h === '#boiteMail' && e2.ov === null, e2);
    await C.retour(p); const e3 = await H(p); v('E le suivant va à Clients, pas une seconde fois à la Boîte mail — ' + e3.h, e3.h === '#clients', e3);
    if (!tel && PROFIL !== 'ipad') {   // ⌘K avec le menu ouvert
      await L.aller(p, 'boiteMail'); await M.pret(p, 6000); await clic(p, '#btnFilter'); await p.waitForTimeout(400);
      await p.keyboard.press('Control+k'); await p.waitForTimeout(500); const pal = await p.evaluate(() => !!document.getElementById('pal'));
      if (pal) { await p.keyboard.type('tâches'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(900); }
      const e4 = await H(p); console.log('  · E ⌘K : palette ' + (pal ? 'ouverte' : 'absente') + ', écran ' + e4.h);
      v('E ⌘K avec le menu ouvert : la palette s\'ouvre (population)', pal, e4);
      if (pal) { await C.retour(p); const e5 = await H(p); v('E ⌘K puis UN Retour : Boîte mail sans menu — ' + e5.h + ' (' + e5.ov + ')', e5.h === '#boiteMail' && e5.ov === null, e5);
        await C.retour(p); const e6 = await H(p); v('E ⌘K puis le Retour suivant : Clients — ' + e6.h, e6.h === '#clients', e6); }
    }
    v('E aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('F')) {
    const c = await ouvrirMail(), p = c.p;
    const w = L.PROFILS[PROFIL].w;
    // F1 : la colonne des Boîtes de l'iPad / le tiroir du téléphone
    const aBtn = await p.evaluate(() => { const b = window.R().querySelector('#btnNav'); return !!b && b.getClientRects().length > 0; });
    if (aBtn && w < 1100) {
      const n0 = (await H(p)).n; await clic(p, '#btnNav'); await p.waitForTimeout(700); const e0 = await H(p);
      console.log('  · F1 après #btnNav : vue ' + e0.vue + ', nav-open ' + e0.nav + ', entrée ' + JSON.stringify(e0.st));
      if (e0.nav) {
        v('F1 la colonne des Boîtes est ouverte (population)', e0.nav === true, e0);
        await C.retour(p); const e1 = await H(p); v('F1 UN Retour ferme la colonne et reste dans la Boîte mail — ' + e1.h + ' nav ' + e1.nav, e1.nav === false && e1.h === '#boiteMail', e1);
      } else {
        v('F1 le bouton ouvre la vue des Boîtes (téléphone : niveau d\'historique) : UN Retour la ferme', e0.vue === 'mailboxes', e0);
        await C.retour(p); const e1 = await H(p); v('F1 UN Retour revient à la liste, dans la Boîte mail — ' + e1.vue + ' ' + e1.h, e1.vue === 'list' && e1.h === '#boiteMail', e1);
      }
    } else console.log('  · F1 sans objet à cette largeur (pas de bouton de colonne)');
    // F2 : aperçu d'un PDF joint (composeur → Joindre → Aperçu) : UN Retour ferme l'aperçu seul
    await clic(p, '#btnCompose'); await p.waitForTimeout(700);
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
    let joint = false;
    try {
      const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }), clic(p, '#cAttBtn')]);
      await fc.setFiles({ name: 'devis-test.pdf', mimeType: 'application/pdf', buffer: pdf }); joint = true;
    } catch (e) { console.log('  · F2 pas de sélecteur de fichier : ' + e.message.slice(0, 80)); }
    await p.waitForTimeout(900);
    const apv = await clic(p, '.att-pv'); await p.waitForTimeout(800); const e2 = await H(p);
    v('F2 l\'aperçu du PDF est ouvert (population : joint ' + joint + ', bouton ' + apv + ')', e2.pdf === true, e2);
    if (e2.pdf) {
      await C.retour(p); const e3 = await H(p);
      v('F2 UN Retour ferme l\'aperçu SEUL : le composeur reste (aperçu ' + e3.pdf + ', fenêtre ' + e3.ov + ')', e3.pdf === false && e3.ov === 'overlay ov-compose', e3);
      const disc = () => p.evaluate(() => window.R().querySelectorAll('#cDiscard').length);
      await C.retour(p); const e4 = await H(p), d4 = await disc();
      if (tel) {
        // au téléphone, un message modifié (ici : une pièce jointe) ne se ferme pas sans question : « Annuler » propose Supprimer / Enregistrer le brouillon (comme Mail) — la feuille EST la couche du dessus
        v('F2 téléphone : le Retour suivant pose la feuille « Fermer le message » (UNE), le composeur reste dessous — feuilles ' + d4 + ', ' + e4.ov, d4 === 1 && e4.ov === 'overlay ov-compose' && e4.h === '#boiteMail', e4);
        await C.retour(p); const e5 = await H(p), d5 = await disc();
        v('F2 téléphone : un Retour de plus ferme la feuille SEULE (composeur gardé, pas deux feuilles) — feuilles ' + d5, d5 === 0 && e5.ov === 'overlay ov-compose', e5);
        await C.retour(p); const d6 = await disc(); await C.retour(p); const e7 = await H(p), d7 = await disc();
        v('F2 téléphone : rouvrir la feuille puis Retour la referme encore, jamais deux feuilles (' + d6 + ' puis ' + d7 + ')', d6 === 1 && d7 === 0 && e7.ov === 'overlay ov-compose', e7);
        await C.retour(p); await p.evaluate(() => { const b = window.R().querySelector('#cDiscard [data-dpick="discard"]'); if (b) b.click(); }); await p.waitForTimeout(700); const e8 = await H(p);
        v('F2 téléphone : « Supprimer le brouillon » ferme le composeur, reste dans la Boîte mail, aucune entrée de trop (état ' + JSON.stringify(e8.st) + ')', e8.ov === null && e8.h === '#boiteMail' && !(e8.st && e8.st.opcourrier), e8);
        await C.retour(p); const e9 = await H(p); v('F2 téléphone : le Retour suivant quitte la Boîte mail — ' + e9.h, e9.h === '#clients', e9);
      } else v('F2 le Retour suivant ferme le composeur — ' + e4.ov + ' ' + e4.h, e4.ov === null && e4.h === '#boiteMail', e4);
    }
    v('F aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('G')) {
    const etr = PROFIL === 'android' || PROFIL === 'iphone' || PROFIL === 'petit';
    const hash = p => p.evaluate(() => location.hash);
    const etat = p => p.evaluate(() => ({ h: location.hash, pousse: CAL.pousse, pile: CAL.pile.join(','), off: CAL.off, cpCalque: typeof cpCalque !== 'undefined' ? cpCalque : null, cpsys: !!document.querySelector('#cpsys:not([hidden])') }));
    const entrer = async c => { const p = c.p; if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]'); await p.waitForTimeout(1700); await L.calme(p, 300); return L.cadre(p, /prototype-comptabilite\.html/); };
    const couche = f => f.evaluate(() => !!document.querySelector('#calque').innerHTML || document.body.classList.contains('menu-ouvert')).catch(() => 'cadre parti');
    const reglages = async (f, p) => { await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(500); return couche(f); };
    const sorties = [
      ['Factures et paiements puis retour par le menu', async (c, p) => { await p.evaluate(() => document.querySelector('[data-cpsys="quotidien"]').click()); await p.waitForTimeout(1300); }],
      ['aller() par programme', async (c, p) => { await p.evaluate(() => aller('clients')); await p.waitForTimeout(1300); }],
    ];
    if (etr) sorties.push(['bouton Menu du cadre puis une rubrique', async (c, p) => { await p.evaluate(() => document.querySelector('.cpsys-menu').click()); await p.waitForTimeout(700); await p.evaluate(() => { const a = document.querySelector('#calque [data-go="interventions"]'); if (a) a.click(); }); await p.waitForTimeout(1300); }]);
    for (const [nom, sortir] of sorties) {
      const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: QUI }), p = c.p;
      await L.aller(p, 'clients'); await L.aller(p, 'accueil');
      let f = await entrer(c); v('G ' + nom + ' : le cadre est affiché (population)', !!f); if (!f) { await L.fin(c); continue; }
      const pose = await reglages(f, p); v('G ' + nom + ' : le panneau Réglages est posé (population)', pose === true, await etat(p));
      await sortir(c, p); const e1 = await etat(p);
      v('G ' + nom + ' : on a quitté le cadre plein écran (' + e1.h + ' ; « Factures et paiements » reste sur la page Comptabilité, sans cadre), aucun calque du cadre en pile', (e1.h !== '#comptabilite' || !e1.cpsys) && e1.pile === '' && !e1.cpCalque && !e1.off, e1);
      f = await entrer(c); const reste = await couche(f), e2 = await etat(p);
      try { await L.capture(c, require('path').join(M.CAP, 'rr3-G-' + PROFIL + (NUIT ? '-nuit' : '') + '-' + sorties.findIndex(x => x[0] === nom) + '.png')); } catch (x) {}
      v('G ' + nom + ' : on revient dans la Comptabilité, le panneau d\'avant n\'est PAS resté ouvert (cadre : ' + reste + ', page : pile « ' + e2.pile + ' »)', reste === false && e2.pile === '' && !e2.cpCalque, e2);
      await C.retour(p); const h = await hash(p); v('G ' + nom + ' : UN Retour quitte la Comptabilité (' + h + ')', h !== '#comptabilite', h);
      v('G aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }
  if (SEC.includes('H') && L.PROFILS[PROFIL].w < 1100) {
    const { w: W, h: Hh } = { w: L.PROFILS[PROFIL].w, h: L.PROFILS[PROFIL].h };
    // H1 : téléphone ouvert en plein écran, fenêtre élargie à 1280 (volet permanent), UN Retour
    {
      const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
      await L.aller(p, 'interventions'); await L.aller(p, 'clients');
      await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(600); const e0 = await H(p);
      v('H1 le téléphone est ouvert en plein écran, UNE entrée (population)', e0.sec && e0.pile === 'securite', e0);
      await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(900); await L.calme(p, 300); const e1 = await H(p);
      console.log('  · H1 élargi : volet ' + e1.sec + ', pile « ' + e1.pile + ' », entrée ' + JSON.stringify(e1.st));
      v('H1 élargi : le volet est là (permanent)', e1.sec === true, e1);
      try { await L.capture(c, require('path').join(M.CAP, 'rr3-H1-' + PROFIL + (NUIT ? '-nuit' : '') + '-elargi.png')); } catch (x) {}
      await C.retour(p); const e2 = await H(p);
      console.log('  · H1 après Retour : ' + e2.h + ', volet ' + e2.sec + ', pile « ' + e2.pile + ' »');
      v('H1 UN Retour après élargissement : le volet permanent ne DISPARAÎT pas sans geste (volet ' + e2.sec + ')', e2.sec === true, e2);
      v('H1 l\'entrée a été rendue à l\'élargissement (aucune entrée posée) : UN Retour va à l\'écran d\'avant, Interventions (' + e2.h + ')', e2.h === '#interventions', e2);
      await C.avancer(p); const e2b = await H(p);
      v('H1 puis Avancer : Clients, le volet reste, aucun plein écran ni entrée du téléphone rejouée (' + e2b.h + ', pile « ' + e2b.pile + ' »)', e2b.h === '#clients' && e2b.pile === '' && e2b.st === null && e2b.sec === true, e2b);
      await p.setViewportSize({ width: W, height: Hh }); await p.waitForTimeout(700);
      v('H1 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    // H2 : élargir/rétrécir plusieurs fois de suite : aucune entrée en trop, pas de plein écran sorti de nulle part
    {
      const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
      await L.aller(p, 'interventions'); await L.aller(p, 'clients'); await p.evaluate(() => opsMonter()); await p.waitForTimeout(500); const n0 = (await H(p)).n;
      for (let i = 0; i < 3; i++) { await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(500); await p.setViewportSize({ width: W, height: Hh }); await p.waitForTimeout(500); }
      await L.calme(p, 300); const e = await H(p);
      v('H2 trois élargissements-rétrécissements : pas de plein écran, pile vide, aucune entrée posée (état ' + JSON.stringify(e.st) + ')', !e.sec && e.pile === '' && e.st === null && e.h === '#clients', e);
      console.log('  · H2 longueur d\'historique ' + n0 + ' → ' + e.n + ' (entrée d\'avant rendue sans troncature : à regarder si l\'Avancer la rejoue)');
      await C.retour(p); const e1 = await H(p); v('H2 UN Retour va à Interventions — ' + e1.h, e1.h === '#interventions', e1);
      await C.avancer(p); const e1b = await H(p); v('H2 puis Avancer : Clients, pas de téléphone en plein écran rejoué (volet ' + e1b.sec + ', pile « ' + e1b.pile + ' »)', e1b.h === '#clients' && !e1b.sec && e1b.pile === '', e1b);
      v('H2 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }
  await M.sortie();
})().catch(async e => { console.log('ÉCHEC DE LA SONDE', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
