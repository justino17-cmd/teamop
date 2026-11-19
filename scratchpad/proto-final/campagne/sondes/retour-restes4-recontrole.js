// RECONTRÔLE ADVERSE des « restes du bouton Retour, tour 4 » (19 novembre 2026). Corrections à rejouer : l'aperçu d'un PDF et la feuille « Fermer le message » sont des niveaux d'historique,
// un menu de la Boîte mail part avec l'écran, le panneau du cadre de la Comptabilité part par toutes les sorties. On cherche ce que ça a CASSÉ À CÔTÉ :
//  P1 : l'aperçu ouvert puis fermé par Fermer / Échap / Retour, trois fois : l'historique revient au même état que sans aperçu (aucune entrée qui fuit)
//  P2 : l'aperçu ouvert puis départ par programme (aller / hashchange) : l'aperçu part, aucun Retour muet ensuite
//  P3 : la feuille « Fermer le message » : Échap, clic sur le fond, Annuler, puis Retour : même état qu'avant (téléphone) ; un « Enregistrer le brouillon » ne laisse aucune entrée
//  P4 : une fenêtre qui n'est PAS un menu (« Ajouter une boîte mail ») : départ par aller() puis retour — constat (gardée comme le message en cours ?) et un Retour jamais muet
//  P5 : Comptabilité : sortie par aller(), retour, nouveau panneau ouvert : UN Retour le ferme (le cadre n'est pas désynchronisé par la fermeture forcée) puis on reste dans la Comptabilité
// PROFIL=android|iphone|mac|ipad|windows|petit ; NUIT=1 ; QUI=marc|julie ; SECTION=P1,P2… Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, QUI = process.env.QUI || 'marc';
const SEC = (process.env.SECTION || 'P1,P2,P3,P4,P5').split(',');
const tel = ['android', 'iphone', 'petit', 'ipad'].includes(PROFIL);
const H = p => p.evaluate(() => ({ h: location.hash, n: history.length, st: history.state, pile: CAL.pile.join(','), off: CAL.off,
  ov: (() => { const r = window.R && window.R(); const o = r && r.querySelector('#overlay'); return o ? o.className : null; })(),
  vue: (() => { const r = window.R && window.R(); const a = r && r.querySelector('.app'); return a ? a.getAttribute('data-view') : null; })(),
  pdf: (() => { const r = window.R && window.R(); return !!(r && r.querySelector('#pdfv')); })(),
  feuille: (() => { const r = window.R && window.R(); return r ? r.querySelectorAll('#cDiscard').length : 0; })() }));
// history.length ne sert PAS à la signature : il garde l'entrée « avant » d'un Retour (les entrées d'après ne disparaissent qu'au prochain pushState) ; la fuite se juge à sa CROISSANCE d'un cycle à l'autre
const sig = e => JSON.stringify({ h: e.h, st: e.st, ov: e.ov, vue: e.vue, f: e.feuille });
const ouvrirMail = async () => { const c = await M.entrer({ profil: PROFIL, nuit: NUIT, qui: QUI }); await L.aller(c.p, 'clients'); await L.aller(c.p, 'boiteMail'); await M.pret(c.p, 6000); return c; };
const clic = (p, s) => p.evaluate(sel => { const b = window.R().querySelector(sel); if (b) b.click(); return !!b; }, s);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
// composeur + un PDF joint ; rend true si le bouton d'aperçu existe
const composeurPdf = async p => { await clic(p, '#btnCompose'); await p.waitForTimeout(700);
  try { const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }), clic(p, '#cAttBtn')]); await fc.setFiles({ name: 'devis-test.pdf', mimeType: 'application/pdf', buffer: PDF }); } catch (e) { return false; }
  await p.waitForTimeout(900); return await p.evaluate(() => !!window.R().querySelector('.att-pv')); };
(async () => {
  if (SEC.includes('P1')) {
    const c = await ouvrirMail(), p = c.p;
    const ok = await composeurPdf(p); v('P1 composeur + PDF joint, bouton d\'aperçu présent (population)', ok);
    if (ok) {
      await p.waitForTimeout(500); const base = await H(p); const sb = sig(base);
      const ouvre = async () => { await clic(p, '.att-pv'); await p.waitForTimeout(700); return H(p); };
      let e = await ouvre(); v('P1 l\'aperçu s\'ouvre (population)', e.pdf === true, e);
      await clic(p, '[data-pv="close"]'); await p.waitForTimeout(700); e = await H(p); v('P1 Fermer : état identique à l\'avant-aperçu — ' + sig(e), sig(e) === sb && !e.pdf, { base, e });
      e = await ouvre(); await p.keyboard.press('Escape'); await p.waitForTimeout(700); e = await H(p); v('P1 Échap : l\'aperçu SEUL part, état identique — ' + sig(e), sig(e) === sb && !e.pdf && e.ov === 'overlay ov-compose', { base, e });
      e = await ouvre(); await C.retour(p); e = await H(p); v('P1 Retour : l\'aperçu SEUL part, état identique — ' + sig(e), sig(e) === sb && !e.pdf && e.ov === 'overlay ov-compose', { base, e });
      const n1 = (await H(p)).n;
      for (let i = 0; i < 3; i++) { await ouvre(); await clic(p, '[data-pv="close"]'); await p.waitForTimeout(500); }
      e = await H(p); v('P1 trois cycles ouvrir-Fermer : aucune entrée de plus qu\'après le premier cycle (' + n1 + ' → ' + e.n + ')', e.n === n1 && sig(e) === sb, { base, e });
      // ouvrir, fermer dans la MÊME tâche (0 ms) : rien ne doit rester
      await p.evaluate(() => { const r = window.R(); r.querySelector('.att-pv').click(); const b = r.querySelector('[data-pv="close"]'); if (b) b.click(); }); await p.waitForTimeout(900); e = await H(p);
      v('P1 ouvrir puis fermer dans la même tâche : état identique, aucun aperçu — ' + sig(e), sig(e) === sb && !e.pdf, { base, e });
      // double clic sur « Aperçu » : un seul aperçu
      await p.evaluate(() => { const b = window.R().querySelector('.att-pv'); b.click(); b.click(); }); await p.waitForTimeout(800); e = await H(p);
      const nb = await p.evaluate(() => window.R().querySelectorAll('#pdfv').length); v('P1 double clic sur Aperçu : UN seul aperçu (' + nb + ')', nb === 1, e);
      await C.retour(p); e = await H(p); v('P1 … et UN Retour le ferme — ' + sig(e), !e.pdf && e.ov === 'overlay ov-compose', e);
      try { await M.cap(c, 'r4-P1-' + PROFIL + (NUIT ? '-nuit' : '')); } catch (x) {}
    }
    v('P1 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('P2')) {
    const c = await ouvrirMail(), p = c.p;
    const ok = await composeurPdf(p); v('P2 composeur + PDF (population)', ok);
    if (ok) {
      await clic(p, '.att-pv'); await p.waitForTimeout(700); const e0 = await H(p); v('P2 aperçu ouvert (population)', e0.pdf === true, e0);
      await p.evaluate(() => aller('clients')); await p.waitForTimeout(1200); const e1 = await H(p);
      v('P2 départ par aller() : on est à Clients — ' + e1.h, e1.h === '#clients', e1);
      await L.aller(p, 'boiteMail'); await M.pret(p, 6000); const e2 = await H(p);
      // CONSTAT (pas un contrôle) : l'aperçu d'un PDF est retrouvé ouvert au retour, comme le message gardé, alors qu'un menu est fermé — voir restes-retour-tour4-recontrole.json (« nouveaux »)
      console.log('  · P2 retour dans la Boîte mail : aperçu ' + (e2.pdf ? 'RETROUVÉ OUVERT' : 'fermé') + ', message ' + e2.ov);
      try { await M.cap(c, 'r4-P2-retour-' + PROFIL + (NUIT ? '-nuit' : '')); } catch (x) {}
      // une série de Retour : chacun doit CHANGER quelque chose (aucun muet) jusqu'à quitter la Boîte mail
      let muets = 0, prec = sig(e2), vu = [e2.h];
      for (let i = 0; i < 5 && (await H(p)).h === '#boiteMail'; i++) {
        // une feuille de brouillon ouverte par Retour (téléphone) est « Supprimer » pour avancer, comme un utilisateur
        const s = await H(p); if (s.feuille) await p.evaluate(() => { const b = window.R().querySelector('#cDiscard [data-dpick="discard"]'); if (b) b.click(); }), await p.waitForTimeout(600);
        await C.retour(p); const e = await H(p); if (sig(e) === prec) muets++; prec = sig(e); vu.push(e.h + '/' + (e.ov || e.vue) + (e.feuille ? '/F' : ''));
      }
      v('P2 aucun Retour muet avant de quitter (' + vu.join(' > ') + ')', muets === 0, vu);
    }
    v('P2 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('P3') && tel) {   // sur ordinateur « Annuler » d'un message modifié se ferme sans feuille (brouillon gardé) : la feuille est une couche du téléphone
    {
    const c = await ouvrirMail(), p = c.p;
    const ok = await composeurPdf(p); v('P3 composeur modifié (population)', ok);
    if (ok) {
      const base = await H(p); const sb = sig(base);
      await clic(p, '#cCancel'); await p.waitForTimeout(700); let e = await H(p);
      v('P3 « Annuler » du composeur modifié pose la feuille (UNE) — feuilles ' + e.feuille, e.feuille === 1, e);
      const sF = sig(e);
      await p.keyboard.press('Escape'); await p.waitForTimeout(600); e = await H(p); v('P3 Échap ferme la feuille SEULE, composeur gardé, état d\'avant — ' + sig(e), e.feuille === 0 && sig(e) === sb, { base, e });
      await clic(p, '#cCancel'); await p.waitForTimeout(600); e = await H(p); v('P3 rouverte : même état que la première fois (' + sig(e) + ')', sig(e) === sF, e);
      await p.evaluate(() => { const f = window.R().querySelector('#cDiscard'); f.click(); }); await p.waitForTimeout(600); e = await H(p); v('P3 clic sur le fond de la feuille : fermée, composeur gardé, état d\'avant', e.feuille === 0 && sig(e) === sb, { base, e });
      await clic(p, '#cCancel'); await p.waitForTimeout(600); await p.evaluate(() => window.R().querySelector('#cDiscard [data-dpick="cancel"]').click()); await p.waitForTimeout(600); e = await H(p);
      v('P3 bouton « Annuler » de la feuille : fermée, composeur gardé, état d\'avant', e.feuille === 0 && sig(e) === sb, { base, e });
      await clic(p, '#cCancel'); await p.waitForTimeout(600); await C.retour(p); e = await H(p); v('P3 Retour sur la feuille : fermée, composeur gardé, état d\'avant', e.feuille === 0 && e.ov === 'overlay ov-compose' && e.h === '#boiteMail', e);
      // Enregistrer le brouillon : le composeur se ferme, aucune entrée du module ne reste
      await clic(p, '#cCancel'); await p.waitForTimeout(600); await p.evaluate(() => window.R().querySelector('#cDiscard [data-dpick="save"]').click()); await p.waitForTimeout(900); e = await H(p);
      v('P3 « Enregistrer le brouillon » : composeur fermé, Boîte mail, aucune entrée du module (état ' + JSON.stringify(e.st) + ')', e.ov === null && e.h === '#boiteMail' && !(e.st && e.st.opcourrier) && e.feuille === 0, e);
      await C.retour(p); e = await H(p); v('P3 … puis UN Retour quitte la Boîte mail (jamais muet) — ' + e.h, e.h !== '#boiteMail', e);
      try { await M.cap(c, 'r4-P3-' + PROFIL + (NUIT ? '-nuit' : '')); } catch (x) {}
    }
    v('P3 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }}
  if (SEC.includes('P4')) {
    const c = await ouvrirMail(), p = c.p;
    // sur ordinateur le bouton est dans la colonne ; au téléphone il est dans la vue des Boîtes
    if (tel) { await clic(p, '#btnNav'); await p.waitForTimeout(600); }
    const ok = await clic(p, '[data-addaccount="1"]'); await p.waitForTimeout(800); const e0 = await H(p);
    v('P4 « Ajouter une boîte mail » est ouverte (population : bouton ' + ok + ', fenêtre ' + e0.ov + ')', !!e0.ov && !/ov-menu/.test(e0.ov), e0);
    if (e0.ov) {
      await p.evaluate(() => aller('clients')); await p.waitForTimeout(1200);
      await L.aller(p, 'boiteMail'); await M.pret(p, 6000); const e1 = await H(p);
      console.log('  · P4 au retour dans la Boîte mail : fenêtre « ' + e1.ov + ' », entrée ' + JSON.stringify(e1.st) + ' (constat : gardée comme le message en cours, ou fermée comme un menu)');
      let muets = 0, prec = sig(e1), vu = [e1.h + '/' + e1.ov];
      for (let i = 0; i < 4 && (await H(p)).h === '#boiteMail'; i++) { await C.retour(p); const e = await H(p); if (sig(e) === prec) muets++; prec = sig(e); vu.push(e.h + '/' + (e.ov || e.vue)); }
      v('P4 aucun Retour muet avant de quitter la Boîte mail (' + vu.join(' > ') + ')', muets === 0, vu);
      try { await M.cap(c, 'r4-P4-' + PROFIL + (NUIT ? '-nuit' : '')); } catch (x) {}
    }
    v('P4 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  if (SEC.includes('P5')) {
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: QUI }), p = c.p;
    const etr = PROFIL === 'android' || PROFIL === 'iphone' || PROFIL === 'petit';
    const etat = () => p.evaluate(() => ({ h: location.hash, pile: CAL.pile.join(','), cpCalque, cpsys: !!document.querySelector('#cpsys:not([hidden])'), off: CAL.off, n: history.length }));
    const entrer = async () => { if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]'); await p.waitForTimeout(1700); await L.calme(p, 300); return L.cadre(p, /prototype-comptabilite\.html/); };
    const couche = f => f.evaluate(() => !!document.querySelector('#calque').innerHTML || document.body.classList.contains('menu-ouvert')).catch(() => 'cadre parti');
    const reglages = async f => { await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(500); return couche(f); };
    await L.aller(p, 'clients'); await L.aller(p, 'accueil');
    let f = await entrer(); v('P5 le cadre est affiché (population)', !!f); 
    if (f) {
      v('P5 Réglages posé (population)', (await reglages(f)) === true, await etat());
      await p.evaluate(() => aller('clients')); await p.waitForTimeout(1300);
      f = await entrer(); v('P5 rouvert : pas de panneau', (await couche(f)) === false, await etat());
      v('P5 on rouvre Réglages : le panneau est posé et une couche est en pile', (await reglages(f)) === true && (await etat()).pile === 'cadre', await etat());
      await C.retour(p); const e1 = await etat(); const cc = await couche(f);
      v('P5 UN Retour ferme ce panneau et reste dans la Comptabilité — ' + e1.h + ', couche ' + cc, e1.h === '#comptabilite' && cc === false && e1.pile === '', { e1, cc });
      await C.retour(p); const e2 = await etat(); v('P5 le Retour suivant quitte la Comptabilité — ' + e2.h, e2.h !== '#comptabilite', e2);
      // deuxième tour complet : sortie par « Factures » puis nouvelle entrée, panneau, Retour
      f = await entrer(); await reglages(f); await p.evaluate(() => document.querySelector('[data-cpsys="quotidien"]').click()); await p.waitForTimeout(1300);
      const e3 = await etat(); v('P5 après « Factures » : aucune couche en pile, pas de cadre — ' + JSON.stringify(e3), e3.pile === '' && !e3.cpCalque && !e3.cpsys, e3);
      try { await L.capture(c, require('path').join(M.CAP, 'r4-P5-' + PROFIL + (NUIT ? '-nuit' : '') + '.png')); } catch (x) {}
    }
    v('P5 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  await M.sortie();
})().catch(async e => { console.log('ERREUR SONDE', e && e.stack || e); try { await M.sortie(); } catch (x) {} process.exit(1); });
