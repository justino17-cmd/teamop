// TOUR 3 (19 novembre 2026) — GARDE de la règle « Retour ferme la couche du dessus, rien d'autre » appliquée au cadre de la Comptabilité : « ‹ OP GESTION » FERME le panneau (D2 : on ne le retrouve pas ouvert) et un double clic dans la même tâche (D3 à 0 ms) ne laisse qu'une entrée. Reprise de retour-restes2-recontrole.js (tour 2), dont D2 et D3 changent de verdict.
// Ancien en-tête : RECONTRÔLE ADVERSE des « restes du bouton Retour, tour 2 » (18 novembre 2026) : la correction fait partir d'abord les entrées d'un panneau ou du tiroir du cadre de la Comptabilité,
// PUIS recule vers l'écran d'avant quand « ‹ OP GESTION » est touché. On cherche ce qu'elle a pu CASSER À CÔTÉ :
//  - une origine qui n'est pas l'accueil (Clients, Interventions) : « ‹ OP GESTION » ramène-t-il d'où l'on vient, et un Retour va-t-il à l'écran d'AVANT lui ?
//  - un panneau fantôme : on revient dans la Comptabilité, le panneau d'avant est-il resté posé (cadre ET page d'accord) ?
//  - le double toucher (deux doigts rapprochés sur « ‹ OP GESTION ») pendant le recul ;
//  - Échap côté hôte (la barre « ‹ OP GESTION » a le focus) panneau ouvert ;
//  - panneau puis tiroir (deux couches) ; panneau puis « Factures et paiements » ;
//  - Avancer (le navigateur rejoue l'entrée d'après) ; un historique qui n'a qu'une entrée (lien direct #comptabilite) ;
//  - la nuit, et les autres rôles qui voient la Comptabilité.
// Convention : « UN Retour » = p.goBack. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. PROFIL=android|iphone|mac|ipad|windows|petit ; NUIT=1 ; QUI=marc|julie|sm|kb.
const C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', NUIT = !!process.env.NUIT, QUI = process.env.QUI || 'marc';
const hash = p => p.evaluate(() => location.hash);
const doutes = [], dit = o => { doutes.push(o); console.log('  ?', JSON.stringify(o).slice(0, 300)); };
(async () => {
  const ouvrirCtx = async () => L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: QUI });
  const entrerCompta = async (c, depuis) => {   // on se place sur `depuis`, on ouvre la Comptabilité par le menu (comme la personne)
    const p = c.p;
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); }
    else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1700); await L.calme(p, 300); return L.cadre(p, /prototype-comptabilite\.html/);
  };
  const couche = f => f.evaluate(() => !!document.querySelector('#calque').innerHTML || document.body.classList.contains('menu-ouvert')).catch(() => 'cadre parti');
  const reglages = async (f, p) => { await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(500); return couche(f); };
  const tiroir = async (f, p) => { await f.evaluate(() => { const b = document.querySelector('[data-a="menu"], .menu-btn, #btnMenu, [aria-label*="enu"]'); if (b) b.click(); }); await p.waitForTimeout(500); return f.evaluate(() => document.body.classList.contains('menu-ouvert')); };
  const etat = p => p.evaluate(() => ({ h: location.hash, pousse: CAL.pousse, pile: CAL.pile.join(','), ignore: CAL.ignore, off: CAL.off, ouverts: calOuverts().join(','), cpCalque: typeof cpCalque !== 'undefined' ? cpCalque : null, cpsys: !!document.querySelector('#cpsys:not([hidden])') }));
  const barre = p => p.evaluate(() => document.querySelector('[data-cpsys="retour"]').click());
  // l'écran de départ : l'accueil, sauf pour un rôle qui n'en a pas (secrétariat : aller('accueil') le renvoie à la Comptabilité) — alors Clients, avec Interventions avant
  let sansAccueil = false;
  const placer = async p => { await L.aller(p, 'clients'); await L.aller(p, 'accueil'); if ((await hash(p)) === '#accueil') return { orig: 'accueil', avant: 'clients' }; sansAccueil = true; await L.aller(p, 'interventions'); await L.aller(p, 'clients'); return { orig: 'clients', avant: 'interventions' }; };
  const etr = PROFIL === 'android' || PROFIL === 'iphone' || PROFIL === 'petit';

  // ── D1 : origine Clients (la personne vient de Clients, pas de l'accueil), panneau ouvert, « ‹ OP GESTION » : retour à CLIENTS, puis UN Retour va à l'écran d'avant Clients (Interventions)
  for (const cas of ['panneau', 'tiroir']) {
    if (cas === 'tiroir' && !etr) continue;
    const c = await ouvrirCtx(), p = c.p;
    await L.aller(p, 'interventions'); await L.aller(p, 'clients');
    const f = await entrerCompta(c, 'clients'); v('D1 ' + cas + ' : le cadre de la Comptabilité est affiché (population)', !!f); if (!f) { await L.fin(c); continue; }
    const pose = cas === 'panneau' ? await reglages(f, p) : await tiroir(f, p);
    v('D1 ' + cas + ' : la couche est posée (population)', pose === true && (await etat(p)).pousse > 0, await etat(p));
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    const h1 = await hash(p); const e1 = await etat(p);
    v('D1 ' + cas + ' : « ‹ OP GESTION » ramène à Clients (d\'où l\'on vient), pas à l\'accueil — ' + h1, h1 === '#clients', e1);
    v('D1 ' + cas + ' : la pile du cadre est vide et l\'historique n\'est pas éteint', e1.pousse === 0 && e1.pile === '' && !e1.off && e1.ignore === 0 && !e1.cpsys, e1);
    await C.retour(p); const h2 = await hash(p);
    v('D1 ' + cas + ' : UN Retour va à Interventions (l\'écran d\'avant Clients), ni muet ni la Comptabilité — ' + h2, h2 === '#interventions', h2);
    v('D1 ' + cas + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D2 : on revient dans la Comptabilité après « ‹ OP GESTION » panneau ouvert. Règle déjà admise au tour 1 (B7) : si le panneau est encore là, la PAGE le sait (pile « cadre ») et
  //        UN Retour le ferme sans quitter l'écran ; un second quitte. L'inverse (panneau là, page qui l'ignore) serait le défaut.
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    let f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    f = await entrerCompta(c, 'accueil');
    const reste = await couche(f), e = await etat(p);
    v('D2 (tour 3) « ‹ OP GESTION » panneau ouvert FERME le panneau : au retour dans la Comptabilité il n\'est plus là, la pile du cadre est vide', reste === false && e.pousse === 0 && e.pile === '' && e.cpCalque === false, { reste, e });
    await C.retour(p); const h = await hash(p);
    v('D2 UN Retour quitte la Comptabilité (rien à fermer) — ' + h, h === '#' + O.orig, h);
    v('D2 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D3 : double toucher sur « ‹ OP GESTION » panneau ouvert (deux clics dans la même milliseconde puis à 80 ms) : on finit à l'accueil, historique sain, pas d'écran mélangé
  for (const sans of [false, true]) for (const delai of (process.env.DELAIS || "0,80,200").split(",").map(Number)) {
    if (sans && delai !== 0 && !process.env.DELAIS) continue;
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); if (!sans) await reglages(f, p);
    // le second toucher n'a lieu que si la barre est encore là : un doigt ne touche pas une barre déjà partie
    await p.evaluate(d => new Promise(r => { const b = () => { const z = document.querySelector('#cpsys'); const x = z && !z.hidden && z.querySelector('[data-cpsys="retour"]'); if (x) x.click(); }; b(); setTimeout(() => { b(); r(); }, d); }), delai);
    await p.waitForTimeout(1800); await L.calme(p, 300);
    const e = await etat(p);
    const sain = e.h === '#' + O.orig && !e.cpsys && !e.off && e.ignore === 0 && e.pousse === 0;
    await C.retour(p); const h = await hash(p);
    v('D3' + (sans ? ' TÉMOIN sans panneau' : '') + ' double toucher à ' + delai + ' ms : on est à l\'écran d\'origine, la Comptabilité est fermée, historique sain', sain, e);
    v('D3' + (sans ? ' TÉMOIN' : '') + ' (' + delai + ' ms) puis UN Retour : Clients (l\'écran d\'avant), pas la Comptabilité — ' + h, h === '#' + O.avant, h);
    v('D3 (' + delai + ' ms) aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D3b (tour 3) : DEUX clics RÉELLEMENT dans la même tâche JavaScript sur le MÊME bouton (le second ne vérifie pas que la barre est encore là : D3 le vérifie, et la barre est déjà partie à 0 ms) —
  //        une seule entrée d'historique : on est à l'écran d'origine, UN Retour va à l'écran d'avant
  for (const sans of [false, true]) {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); if (!sans) await reglages(f, p);
    const nb = await p.evaluate(() => { const b = document.querySelector('#cpsys [data-cpsys="retour"]'); if (!b) return 0; b.click(); b.click(); return 2; });
    v('D3b' + (sans ? ' TÉMOIN sans panneau' : '') + ' deux clics dans la même tâche (population : ' + nb + ')', nb === 2);
    await p.waitForTimeout(1800); await L.calme(p, 300);
    const e = await etat(p);
    v('D3b' + (sans ? ' TÉMOIN' : '') + ' : on est à l\'écran d\'origine, la Comptabilité est fermée, historique sain, UNE entrée posée', e.h === '#' + O.orig && !e.cpsys && !e.off && e.ignore === 0 && e.pousse === 0, e);
    await C.retour(p); const h = await hash(p);
    v('D3b' + (sans ? ' TÉMOIN' : '') + ' puis UN Retour : ' + O.avant + ' (l\'écran d\'avant), ni muet ni la Comptabilité — ' + h, h === '#' + O.avant, h);
    v('D3b aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D4 : Échap côté hôte (focus sur « ‹ OP GESTION ») panneau ouvert : même chemin que le bouton
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await p.evaluate(() => { const b = document.querySelector('[data-cpsys="retour"]'); if (b) b.focus(); });
    await p.keyboard.press('Escape'); await p.waitForTimeout(1500); await L.calme(p, 300);
    const e = await etat(p);
    v('D4 Échap côté hôte panneau ouvert : on est à l\'accueil (ou le panneau seul s\'est fermé, Comptabilité encore là) — sain, sans entrée orpheline', (e.h === '#' + O.orig && !e.cpsys) || (e.h === '#comptabilite' && e.pousse === 0), e);
    if (e.h === '#comptabilite') dit({ constat: 'D4 : Échap a seulement fermé le panneau du cadre (la Comptabilité reste) ; comportement jugé correct', profil: PROFIL });
    if (e.h === '#' + O.orig) { await C.retour(p); const h = await hash(p); v('D4 puis UN Retour : Clients — ' + h, h === '#' + O.avant, h); }
    else { await C.retour(p); const h = await hash(p); v('D4 (panneau fermé par Échap) UN Retour quitte la Comptabilité — ' + h, h === '#' + O.orig, h); }
    await L.fin(c);
  }

  // ── D5 : panneau PUIS tiroir (deux couches du cadre), téléphone seulement
  if (etr) {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); const a = await reglages(f, p); const b = await tiroir(f, p);
    v('D5 panneau puis tiroir : au moins une couche est posée (population) — réglages ' + a + ', tiroir ' + b, a === true || b === true, await etat(p));
    await barre(p); await p.waitForTimeout(1300); await L.calme(p, 300);
    const e = await etat(p);
    v('D5 « ‹ OP GESTION » avec deux couches : accueil, pile vide, historique sain', e.h === '#' + O.orig && e.pousse === 0 && !e.off && !e.cpsys, e);
    await C.retour(p); const h = await hash(p);
    v('D5 UN Retour : Clients — ' + h, h === '#' + O.avant, h);
    await L.fin(c);
  }

  // ── D6 : panneau ouvert puis « Factures et paiements » (l'autre bouton de la barre) : ne laisse pas d'entrée orpheline, et UN Retour ne tombe pas muet
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await p.evaluate(() => { const b = document.querySelector('[data-cpsys="quotidien"]'); if (b) b.click(); }); await p.waitForTimeout(1500); await L.calme(p, 300);
    const e = await etat(p);
    console.log('  · D6 état après « Factures et paiements » panneau ouvert', JSON.stringify(e));
    v('D6 « Factures et paiements » panneau ouvert : le cadre se referme, pas de calque fantôme dans la pile', !e.cpsys && e.pousse === 0 && e.pile === '' && !e.off, e);
    await C.retour(p); const h = await hash(p);
    v('D6 puis UN Retour ne reste pas muet sur la même adresse (adresse ' + e.h + ' puis ' + h + ')', h !== e.h, { avant: e.h, apres: h });
    await L.fin(c);
  }

  // ── D7 : Avancer après « ‹ OP GESTION » panneau ouvert + Retour : rien d'étrange (l'écran d'avant n'est pas muet, le cadre ne s'ouvre pas avec un panneau)
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    await C.retour(p); await C.avancer(p);
    const e = await etat(p);
    v('D7 Retour puis Avancer : on est à l\'accueil et rien n\'est resté ouvert, historique sain', e.h === '#' + O.orig && !e.cpsys && !e.off && e.pousse === 0, e);
    v('D7 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D8 : lien direct #comptabilite (historique d'une seule entrée, la personne arrive par un favori) : panneau ouvert puis « ‹ OP GESTION » : on arrive quelque part de sain
  {
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: QUI, hash: 'comptabilite' }), p = c.p;   // l'adresse #comptabilite dès l'ouverture : une seule entrée d'historique, comme un favori
    await p.waitForTimeout(1800); await L.calme(p, 300);
    const f = L.cadre(p, /prototype-comptabilite\.html/);
    if (f) { await reglages(f, p); const ok = await p.evaluate(() => !!document.querySelector('[data-cpsys="retour"]'));
      v('D8 le cadre et sa barre sont là (population)', ok);
      if (ok) { await barre(p); await p.waitForTimeout(1500); await L.calme(p, 300); const e = await etat(p);
        v('D8 « ‹ OP GESTION » depuis un lien direct, panneau ouvert : on quitte la Comptabilité vers un écran, historique sain — ' + e.h, (e.h !== '#comptabilite' || sansAccueil) && !e.cpsys && !e.off && e.ignore === 0, e); } }
    else dit({ constat: 'D8 : pas de cadre de Comptabilité atteint par aller(comptabilite) pour ' + QUI + ' (' + PROFIL + ')' });
    v('D8 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  const ko = L.bilan();
  await L.fermer();
  if (doutes.length) console.log('doutes', JSON.stringify(doutes));
  process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN ERREUR', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
