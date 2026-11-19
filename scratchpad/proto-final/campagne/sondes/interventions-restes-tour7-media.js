// Tour 7 : ce que @media (max-width:760px) and (max-height:620px) { #toast … } a pu casser à côté — la bulle est mesurée dans des fenêtres basses (clavier ouvert, paysage téléphone),
// pour trois bulles : la phrase de refus (frappe réelle), « Annuler » d'une photo retirée, une bulle longue sous une fenêtre ouverte (Nouvelle intervention).
// usage : node interventions-restes-tour7-media.js [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const nuit = process.argv[2] === 'nuit';
  const c = await L.ouvrir({ profil: 'petit', qui: 'sm', nuit }); const p = c.p, v = L.v;
  const TAILLES = [[320, 568], [360, 400], [390, 350], [667, 375], [568, 320], [740, 360], [360, 620], [360, 621], [844, 390], [360, 740]];
  const geo = () => p.evaluate(() => { const r = e => { const b = e.getBoundingClientRect(); return { h: Math.round(b.top), b: Math.round(b.bottom), g: Math.round(b.left), d: Math.round(b.right) }; };
    const inter = (a, b) => a && b && a.b > b.h && a.h < b.b && a.d > b.g && a.g < b.d;
    const t = document.getElementById('toast'), rt = r(t), cs = getComputedStyle(t), vis = e => { if (!e) return null; const x = r(e); return x.b > 0 && x.h < innerHeight && x.d > 0 && x.g < innerWidth ? x : null; };
    const term = vis(document.querySelector('[data-action="terminer"]')), pied = vis(document.querySelector('.fen-voile .fen-pied')), tete = vis(document.querySelector('.fen-voile .fen-tete')), bas = vis(document.getElementById('barre-bas')), col = vis(document.getElementById('collant'));
    const bt = t.querySelector('button'), rb = bt && r(bt);
    return { on: t.classList.contains('on'), toast: rt, taille: cs.fontSize, lignes: Math.round((rt.b - rt.h - 16) / (parseFloat(cs.lineHeight) || 18)), coupe: t.scrollHeight > t.clientHeight + 1,
      dans: rt.h >= 0 && rt.b <= innerHeight && rt.g >= 0 && rt.d <= innerWidth, surTerminer: !!term && inter(rt, term), surPied: !!pied && inter(rt, pied), surTete: !!tete && inter(rt, tete), surBarre: !!bas && inter(rt, bas), surCollant: !!col && inter(rt, col),
      btn: rb && { w: rb.d - rb.g, h: rb.b - rb.h, dans: rb.h >= rt.h && rb.b <= rt.b && rb.d <= innerWidth }, H: innerHeight, W: innerWidth, deborde: document.documentElement.scrollWidth > innerWidth + 1 }; });
  const taille = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await L.calme(p, 350); };
  const complete = id => p.evaluate(i => { const F = fiche(i); F.metier = 'clim'; F.releves = { Soufflage: '14' }; tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; F.etat = 'encours'; (INTS.find(o => o.id === i) || {}).st = 'planifiee'; F.photos = [{ nom: 'a.jpg', src: '' }]; }, id);
  const S = '[data-releve="Soufflage"]';
  let pop = 0;
  for (const [w, h] of TAILLES) {
    const et = `${w}x${h}`; await taille(w, h);
    // 1. refus à la frappe réelle
    await complete('i1'); await I.devenir(c, 'sm', 'inter-x-i1'); await p.locator(S).scrollIntoViewIfNeeded(); await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.type('10-12', { delay: 12 }); await p.keyboard.press('Tab'); await L.calme(p, 450);
    let g = await geo(); pop += g.on ? 1 : 0; v(`${et} refus : bulle visible`, g.on, g);
    v(`${et} refus : bulle dans la fenêtre, non coupée, sans débordement de page`, g.dans && !g.coupe && !g.deborde, g);
    v(`${et} refus : ne couvre ni Terminer ni la barre`, !g.surTerminer && !g.surBarre && !g.surCollant, g);
    await L.capture(c, I.CAP + `tour7-media-refus-${et}${nuit ? '-nuit' : ''}.png`);
    // 2. bulle à action « Annuler » : photo retirée
    await p.evaluate(() => { const T = document.getElementById('toast'); T.classList.remove('on'); }); const ph = p.locator('[data-action="photoSuppr"]').first();
    if (await ph.count()) { await ph.scrollIntoViewIfNeeded(); await ph.click({ force: true }); await L.calme(p, 450); g = await geo(); pop += g.btn ? 1 : 0; v(`${et} annuler : bulle avec bouton`, !!g.btn, g);
      if (g.btn) { v(`${et} annuler : bouton dans la bulle et la fenêtre, au moins 40 de haut`, g.btn.dans && g.btn.h >= 40, g); v(`${et} annuler : bulle dans la fenêtre, non coupée`, g.dans && !g.coupe, g); } }
    // 3. fenêtre ouverte (marc) + bulle longue
    await I.devenir(c, 'marc', 'accueil'); await p.evaluate(() => { ouvrirCreation(); }); await L.calme(p, 600);
    if (await p.locator('.fen-voile .fen-pied').count()) { await p.evaluate(() => toast('Un seul nombre ici : écris une seule mesure (ex. 14), pas « 3 sur 18 » ni « 10-12 ». Ta saisie n’est pas enregistrée.')); await L.calme(p, 450); g = await geo(); pop++;
      v(`${et} fenêtre : bulle dans la fenêtre`, g.dans && !g.coupe, g); v(`${et} fenêtre : ne couvre pas la barre d'actions de la fenêtre`, !g.surPied, g); if (h >= 540) v(`${et} fenêtre : ne couvre pas le titre de la fenêtre`, !g.surTete, g);
      await L.capture(c, I.CAP + `tour7-media-fenetre-${et}${nuit ? '-nuit' : ''}.png`); await p.evaluate(() => { try { fermerCreation(); } catch (e) {} document.querySelectorAll('.fen-voile').forEach(x => x.remove()); }); }
    else console.log(`  · NOTE ${et} : fenêtre de création non ouverte`);
  }
  v('population : au moins 25 bulles mesurées', pop >= 25, pop);
  const er = I.erreurs(c); v('aucune erreur de page', er.length === 0, er);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
