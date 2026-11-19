// GARDE du tour 3 « Retour ferme la couche du dessus, rien d'autre » (19 novembre 2026) — la Boîte mail et OP Security.
//  G1 : un menu de la Boîte mail (Filtrer) ouvert : UN Retour le ferme ET reste dans la Boîte mail ; fermé par Échap ou par un choix, UN Retour quitte la Boîte mail (aucune entrée laissée)
//  G2 : composeur ouvert puis départ par programme (aller) ou par un lien du menu (ordinateur) : UN seul Retour ramène à la Boîte mail, le second va à l'écran d'avant
//  G3 : OP Security ouvert (téléphone) puis aller() par programme, aussi dans la MÊME tâche : aucune entrée {cal:1} orpheline, le téléphone est rangé, UN Retour va à l'écran d'avant
//  G4 : OP Security ouvert, fenêtre élargie puis rétrécie : le téléphone ne revient pas en plein écran
// PROFIL=android|iphone|mac|ipad|windows|petit ; NUIT=1. Rend « N ✓ · M ✗ » et sort en 1 si un contrôle tombe.
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
const H = p => p.evaluate(() => ({ h: location.hash, n: history.length, st: history.state, pousse: CAL.pousse, pile: CAL.pile.join(','), ignore: CAL.ignore, off: CAL.off, sec: !!document.querySelector('#opsec[data-ouvert]'), w: innerWidth,
  ov: (() => { const r = window.R && window.R(); const o = r && r.querySelector('#overlay'); return o ? o.className : null; })() }));
const ouvrirMail = async () => { const c = await M.entrer({ profil: PROFIL, nuit: NUIT }); await L.aller(c.p, 'clients'); await L.aller(c.p, 'boiteMail'); await M.pret(c.p, 6000); return c; };
(async () => {
  // G1
  {
    const c = await ouvrirMail(), p = c.p;
    const ouvre = () => p.evaluate(() => { const b = window.R().querySelector('#btnFilter'); if (b) b.click(); return !!window.R().querySelector('#overlay.ov-menu'); });
    v('G1 le menu Filtrer s\'ouvre (population)', await ouvre() && (await H(p)).ov === 'overlay ov-menu', await H(p));
    const e0 = await H(p); v('G1 le menu pose UNE entrée d\'historique du module', e0.st && e0.st.opcourrier === 1, e0);
    await C.retour(p); const e1 = await H(p);
    v('G1 UN Retour ferme le menu ET reste dans la Boîte mail', e1.ov === null && e1.h === '#boiteMail', e1);
    await C.retour(p); const e2 = await H(p); v('G1 un second Retour quitte la Boîte mail (' + e2.h + ')', e2.h === '#clients', e2);
    // fermé par Échap : aucune entrée laissée
    await L.aller(p, 'boiteMail'); await M.pret(p, 6000); await ouvre(); await p.keyboard.press('Escape'); await C.attendre(p, 500);
    const e3 = await H(p); v('G1 Échap ferme le menu', e3.ov === null && e3.h === '#boiteMail', e3);
    await C.retour(p); const e4 = await H(p); v('G1 menu fermé par Échap puis UN Retour : on quitte la Boîte mail (aucune entrée laissée) — ' + e4.h, e4.h === '#clients', e4);
    // un choix dans le menu (Non lus) : ferme le menu, UN Retour quitte
    await L.aller(p, 'boiteMail'); await M.pret(p, 6000); await ouvre();
    await p.evaluate(() => { const b = window.R().querySelector('#overlay [data-pick="unread"]'); if (b) b.click(); }); await C.attendre(p, 600);
    const e5 = await H(p); v('G1 un choix dans le menu le ferme', e5.ov === null && e5.h === '#boiteMail', e5);
    await C.retour(p); const e6 = await H(p); v('G1 choix fait puis UN Retour : on quitte la Boîte mail — ' + e6.h, e6.h === '#clients', e6);
    // ouvert / fermé plusieurs fois de suite : l'historique ne grossit pas
    await L.aller(p, 'boiteMail'); await M.pret(p, 6000); const n0 = (await H(p)).n;
    for (let i = 0; i < 4; i++) { await ouvre(); await C.attendre(p, 250); await p.keyboard.press('Escape'); await C.attendre(p, 350); }
    const e7 = await H(p); v('G1 quatre ouvertures-fermetures : l\'historique n\'a pas grossi (' + n0 + ' → ' + e7.n + ') et aucune entrée du module n\'est restée', e7.n <= n0 + 1 && e7.st === null, e7);
    v('G1 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  // G1b : un choix dans un menu qui OUVRE une feuille (Répondre) : le menu part, le composeur arrive, UN Retour ferme le composeur (la lecture reste au téléphone), jamais plus d'une entrée à la fois
  {
    const c = await ouvrirMail(), p = c.p; const tel = L.PROFILS[PROFIL].w <= 760 || PROFIL === 'ipad';   // l'iPad en 820 px porte la mise en page du TÉLÉPHONE dans le module (lecture = un niveau d'historique) : mesuré au recontrôle du tour 3, le seuil de 760 px faisait tomber G1b sur l'iPad à tort
    await p.evaluate(() => { const m = window.R().querySelector('#rows .msg'); if (m) m.click(); }); await p.waitForTimeout(800);
    const ok = await p.evaluate(() => { const b = window.R().querySelector('[data-act="replyMenu"]'); if (!b) return false; b.click(); return !!window.R().querySelector('#overlay.ov-menu'); });
    v('G1b le menu « Répondre » s\'ouvre (population)', ok, await H(p));
    const pick = await p.evaluate(() => { const b = window.R().querySelector('#overlay [data-pick]'); if (!b) return null; const id = b.getAttribute('data-pick'); b.click(); return id; });
    await p.waitForTimeout(900); const e0 = await H(p);
    v('G1b le choix (' + pick + ') ouvre le composeur, le menu est parti, UNE seule entrée du module de plus que la lecture', e0.ov === 'overlay ov-compose' && e0.st && e0.st.opcourrier === (tel ? 2 : 1), e0);
    await C.retour(p); const e1 = await H(p);
    v('G1b UN Retour ferme le composeur et reste dans la Boîte mail', e1.ov === null && e1.h === '#boiteMail', e1);
    v('G1b aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  // G2
  for (const voie of ['aller', 'lien']) {
    if (voie === 'lien' && C.tel(await { largeur: L.PROFILS[PROFIL].w })) continue;   // le lien du menu latéral n'existe qu'à l'ordinateur
    const c = await ouvrirMail(), p = c.p;
    await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(800);
    const e0 = await H(p); v('G2 ' + voie + ' : le composeur est ouvert (population)', e0.ov === 'overlay ov-compose' && e0.st && e0.st.opcourrier === 1, e0);
    if (voie === 'aller') await L.aller(p, 'taches');
    else { await p.evaluate(() => { const a = document.querySelector('#menu a[href="#taches"], #menu [data-go="taches"]'); if (a) a.click(); }); await p.waitForTimeout(900); await L.calme(p, 300); }
    const e1 = await H(p); v('G2 ' + voie + ' : on est sur les tâches', e1.h === '#taches', e1);
    await C.retour(p); const e2 = await H(p);
    // DEPUIS 33192f69 (décision du chef) la Boîte mail GARDE son message en cours quand on va sur une autre rubrique : on le retrouve au retour. La règle reste « Retour ferme la couche du dessus » :
    // Retour 1 ramène à la Boîte mail (message gardé), Retour 2 ferme le message, Retour 3 va à l'écran d'avant — jamais une entrée orpheline qui répète la Boîte mail.
    v('G2 ' + voie + ' : UN Retour ramène à la Boîte mail, le message en cours est gardé (décision du 19/11)', e2.h === '#boiteMail' && e2.ov === 'overlay ov-compose', e2);
    await C.retour(p); const e2b = await H(p);
    v('G2 ' + voie + ' : le Retour suivant ferme le message, toujours dans la Boîte mail', e2b.h === '#boiteMail' && e2b.ov === null, e2b);
    await C.retour(p); const e3 = await H(p);
    v('G2 ' + voie + ' : puis le Retour suivant va à l\'écran d\'avant (Clients), pas une seconde fois à la Boîte mail — ' + e3.h, e3.h === '#clients', e3);
    v('G2 ' + voie + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await M.fin(c);
  }
  // G3
  if (L.PROFILS[PROFIL].w < 1100) {
    for (const meme of [false, true]) {
      const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
      await L.aller(p, 'interventions'); await L.aller(p, 'clients');
      if (!meme) {
        await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(600);
        const e0 = await H(p); v('G3 OP Security est ouvert, UNE entrée posée (population)', e0.sec && e0.pousse === 1 && e0.pile === 'securite', e0);
        await L.aller(p, 'accueil'); await p.waitForTimeout(700);
      } else { await p.evaluate(() => { opsMonter(); opsOuvrir(); aller('accueil'); }); await p.waitForTimeout(900); }
      const e1 = await H(p);
      v('G3' + (meme ? ' (même tâche)' : '') + ' : après aller(), le téléphone est rangé, pile vide, aucune entrée {cal:1} sur l\'écran d\'arrivée', !e1.sec && e1.pousse === 0 && e1.pile === '' && e1.st === null && e1.h === '#accueil' && !e1.off, e1);
      await C.retour(p); const e2 = await H(p); v('G3' + (meme ? ' (même tâche)' : '') + ' : UN Retour va à Clients (l\'écran d\'avant), jamais muet — ' + e2.h, e2.h === '#clients', e2);
      v('G3 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    // G4
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
    await L.aller(p, 'clients'); await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(500);
    v('G4 étroit : le téléphone est ouvert (population)', (await H(p)).sec, await H(p));
    await p.setViewportSize({ width: 1300, height: 900 }); await p.waitForTimeout(700);
    const e1 = await H(p); v('G4 élargi : le volet permanent est là, pile vide', e1.sec && e1.pousse === 0 && e1.pile === '' && e1.st === null, e1);
    await p.setViewportSize({ width: c.largeur, height: c.hauteur }); await p.waitForTimeout(700);
    const e2 = await H(p); v('G4 rétréci : le téléphone ne revient PAS en plein écran, aucune entrée posée', !e2.sec && e2.pousse === 0 && e2.pile === '' && e2.st === null, e2);
    await p.evaluate(() => opsOuvrir()); await p.waitForTimeout(500); const e3 = await H(p);
    v('G4 on peut le rouvrir à la main (rond), UNE entrée, et UN Retour le ferme sans quitter', e3.sec && e3.pousse === 1, e3);
    await C.retour(p); const e4 = await H(p); v('G4 UN Retour ferme le téléphone, l\'écran reste ' + e4.h, !e4.sec && e4.h === '#clients', e4);
    v('G4 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  } else v('G3/G4 : OP Security est un volet permanent à cette largeur, sans objet (population)', true);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
