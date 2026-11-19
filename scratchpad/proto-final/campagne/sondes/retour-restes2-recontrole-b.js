// RECONTRÔLE ADVERSE, suite (19 novembre 2026) : ce que la correction « les couches du cadre partent d'abord » peut casser PAR LES AUTRES CHEMINS qui la traversent.
//  E1 : le cadre ouvert depuis la Comptabilité « classique » (Factures et paiements, puis le menu) : cpSysDe vaut 'comptabilite' et le recul ne sert pas — panneau ouvert puis « ‹ OP GESTION » : historique sain
//  E2 : le panneau est fermé par le Retour DU NAVIGATEUR, puis « ‹ OP GESTION » (aucune couche) : le recul d'une entrée, Clients ensuite
//  E3 : panneau fermé par sa croix (Réglages) puis « ‹ OP GESTION » : même résultat que sans panneau
//  E4 : panneau ouvert, « ‹ OP GESTION », on rouvre la Comptabilité, on ferme le panneau par Retour, puis « ‹ OP GESTION » : jamais deux Retour muets d'affilée
// Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. PROFIL=android|iphone|mac|ipad|windows|petit ; NUIT=1 ; QUI=marc|julie|sm|kb.
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


  // ── E1 : « Factures et paiements » (la Comptabilité classique) puis le menu « Comptabilité » : le cadre s'ouvre depuis la Comptabilité elle-même (cpSysDe = 'comptabilite')
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    let f = await entrerCompta(c, 'accueil'); v('E1 le cadre est affiché (population)', !!f);
    if (f) {
      await p.evaluate(() => { const b = document.querySelector('[data-cpsys="quotidien"]'); if (b) b.click(); }); await p.waitForTimeout(1300); await L.calme(p, 300);
      const classique = await p.evaluate(() => { const z = document.querySelector('#cpsys'); return !z || z.hidden; });
      v('E1 la Comptabilité classique est affichée (le cadre est replié) — population', classique, await etat(p));
      // on rouvre le cadre par la porte de la Comptabilité (menu ou onglet) : cpSysDe devient 'comptabilite'
      if (etr) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); }
      else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
      await p.waitForTimeout(1700); await L.calme(p, 300);
      f = L.cadre(p, /prototype-comptabilite\.html/);
      const ouvert = await p.evaluate(() => { const z = document.querySelector('#cpsys'); return !!z && !z.hidden; });
      v('E1 le cadre est rouvert depuis la Comptabilité (population)', ouvert, await etat(p));
      if (ouvert && f) {
        const pose = await reglages(f, p);
        v('E1 le panneau est posé (population)', pose === true && (await etat(p)).pousse > 0, await etat(p));
        await barre(p); await p.waitForTimeout(1300); await L.calme(p, 300);
        const e = await etat(p);
        v('E1 « ‹ OP GESTION » depuis la Comptabilité, panneau ouvert : le cadre est fermé, pile vide, historique sain', !e.cpsys && e.pousse === 0 && e.pile === '' && !e.off && e.ignore === 0, e);
        const h0 = e.h; await C.retour(p); const h = await hash(p);
        v('E1 puis UN Retour : on ne reste pas muet sur la même adresse (' + h0 + ' puis ' + h + ')', h !== h0 || (await etat(p)).pousse === 0 && h === '#' + O.avant, { h0, h });
        const e2 = await etat(p);
        v('E1 aucun cadre fantôme après le Retour', !e2.cpsys || h === '#comptabilite', e2);
      }
    }
    v('E1 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── E2 : le panneau est fermé par le Retour du navigateur, puis « ‹ OP GESTION » : aucune couche, le recul d'une entrée
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await C.retour(p); await p.waitForTimeout(500);
    const e0 = await etat(p);
    v('E2 le Retour a fermé le panneau et on reste dans la Comptabilité (population) — ' + e0.h, e0.h === '#comptabilite' && e0.pousse === 0 && e0.cpsys, e0);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    const e = await etat(p);
    v('E2 « ‹ OP GESTION » sans panneau : on est à l\'écran d\'origine, historique sain — ' + e.h, e.h === '#' + O.orig && !e.cpsys && e.pousse === 0 && !e.off && e.ignore === 0, e);
    await C.retour(p); const h = await hash(p);
    v('E2 UN Retour : ' + O.avant + ' — ' + h, h === '#' + O.avant, h);
    v('E2 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── E3 : panneau fermé par sa croix (le même geste que la personne) puis « ‹ OP GESTION »
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    const f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await f.evaluate(() => { const x = document.querySelector('#calque .x, #calque [data-a="fermer"], #calque [aria-label*="ermer"]'); if (x) x.click(); }); await p.waitForTimeout(600);
    const e0 = await etat(p);
    v('E3 la croix a fermé le panneau et retiré son entrée (population)', e0.pousse === 0 && e0.h === '#comptabilite', e0);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    const e = await etat(p);
    v('E3 « ‹ OP GESTION » : écran d\'origine, historique sain — ' + e.h, e.h === '#' + O.orig && !e.cpsys && e.pousse === 0 && !e.off && e.ignore === 0, e);
    await C.retour(p); const h = await hash(p);
    v('E3 UN Retour : ' + O.avant + ' — ' + h, h === '#' + O.avant, h);
    await L.fin(c);
  }

  // ── E4 : panneau, « ‹ OP GESTION », la Comptabilité rouverte (le panneau est encore là), fermé par Retour, puis « ‹ OP GESTION » : aucun Retour muet d'affilée
  {
    const c = await ouvrirCtx(), p = c.p;
    const O = await placer(p);
    let f = await entrerCompta(c, 'accueil'); await reglages(f, p);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    f = await entrerCompta(c, 'accueil');
    await C.retour(p);                           // ferme le panneau resté ouvert
    const e0 = await etat(p);
    v('E4 le Retour ferme le panneau resté ouvert et reste dans la Comptabilité (population) — ' + e0.h, e0.h === '#comptabilite' && e0.pousse === 0, e0);
    await barre(p); await p.waitForTimeout(1200); await L.calme(p, 300);
    const e = await etat(p);
    v('E4 « ‹ OP GESTION » : écran d\'origine, historique sain — ' + e.h, e.h === '#' + O.orig && !e.cpsys && e.pousse === 0 && !e.off, e);
    const hs = []; for (let i = 0; i < 2; i++) { await C.retour(p); hs.push(await hash(p)); }
    v('E4 deux Retour d\'affilée : jamais deux fois la même adresse, jamais la Comptabilité — ' + hs.join(' → '), hs[0] !== hs[1] && !hs.includes('#comptabilite'), hs);
    v('E4 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  const ko = L.bilan();
  await L.fermer();
  if (doutes.length) console.log('doutes', JSON.stringify(doutes));
  process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN ERREUR', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
