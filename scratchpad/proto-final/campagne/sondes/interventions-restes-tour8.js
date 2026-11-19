// Tour 8 (SŒUR 5, 18 novembre 2026), deux défauts à garder :
//   A. RELEVE_REFUS (le refus de relevé gardé en mémoire) est VIDÉ au changement de fiche (aller()) et à la fermeture de session : un « Terminer » juste n'est jamais bloqué par le refus d'une AUTRE fiche ;
//   B. la bulle de refus (en bas, 108 px) ne cache jamais le champ qui a le focus, « Chercher un client » ni les onglets de « Nouvelle intervention » aux hauteurs basses (360×400, 390×350, 667×375, 740×360, clavier ouvert) :
//      elle passe en haut (classe « haut »), mesurée par elementFromPoint au centre de chaque cible ET par le rectangle ; et elle RESTE en bas quand rien n'est caché (contre-épreuve).
// usage : node interventions-restes-tour8.js [profil] [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p, v = L.v;
  const S = '[data-releve="Soufflage"]';
  const memoire = () => p.evaluate(() => Object.keys(RELEVE_REFUS));
  const prep = async id => { await p.evaluate(i => { const F = fiche(i); F.metier = 'clim'; F.releves = { Soufflage: '14' }; tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; F.etat = 'encours'; (INTS.find(o => o.id === i) || {}).st = 'planifiee'; }, id); };
  const frappe = async t => { await p.locator(S).scrollIntoViewIfNeeded(); await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.type(t, { delay: 12 }); await p.keyboard.press('Tab'); await L.calme(p, 200); };
  const etat = id => p.evaluate(i => ({ etat: fiche(i).etat }), id);
  const clic = async sl => { const b = p.locator(sl).first(); await b.scrollIntoViewIfNeeded(); await b.click({ force: true }); await L.calme(p, 500); };
  // ── A1. refus sur i1, puis AUTRE fiche : la mémoire est vide et Terminer termine du premier coup
  await prep('i1'); await prep('i2'); await I.devenir(c, 'sm', 'inter-x-i1');
  v('A population : le relevé Soufflage et Terminer existent, mémoire vide', (await p.locator(S).count()) === 1 && (await p.locator('[data-action="terminer"]').count()) >= 1 && (await memoire()).length === 0, await memoire());
  await frappe('10-12'); v('A1 le refus est gardé en mémoire (i1|Soufflage)', (await memoire()).includes('i1|Soufflage'), await memoire());
  await I.devenir(c, 'sm', 'inter-x-i2'); v('A1 changer de fiche (aller) vide la mémoire du refus', (await memoire()).length === 0, await memoire());
  await p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
  await clic('[data-action="terminer"]'); let e = await etat('i2'); v('A1 « Terminer » sur l’autre fiche termine du PREMIER coup (jamais bloqué par le refus d’i1)', e.etat === 'bureau', e);
  // ── A2. refus, puis fermeture de session
  await p.reload(); await L.calme(p, 700); await prep('i1'); await I.devenir(c, 'sm', 'inter-x-i1'); await frappe('3 sur 18');
  v('A2 refus gardé avant la fermeture de session', (await memoire()).includes('i1|Soufflage'), await memoire());
  await p.evaluate(() => { try { sessionFermer('essai'); } catch (x) {} });
  v('A2 fermer la session vide la mémoire du refus', (await memoire()).length === 0, await memoire());
  // ── A3. contre-épreuve : le refus d'un relevé de LA MÊME fiche bloque toujours le Terminer (la règle d'origine tient)
  await p.reload(); await L.calme(p, 700); await prep('i1'); await I.devenir(c, 'sm', 'inter-x-i1'); await frappe('10-12');
  await p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; }); await clic('[data-action="terminer"]'); e = await etat('i1');
  v('A3 le refus de la MÊME fiche bloque encore Terminer (la règle tient)', e.etat !== 'bureau', e);

  // ── B. la bulle et les cibles, hauteurs basses
  const PHRASE = 'Un seul nombre ici : écris une seule mesure (ex. 14), pas « 3 sur 18 » ni « 10-12 ». Ta saisie n’est pas enregistrée.';
  const mesure = async (w, h, fenetre) => { await p.setViewportSize({ width: w, height: h }); await L.calme(p, 400);
    await p.evaluate(() => { try { fermerPanneau(); document.querySelectorAll('.fen-voile').forEach(x => x.remove()); } catch (x) {} });
    if (fenetre) { await p.evaluate(() => ouvrirCreation()); await L.calme(p, 500); await p.evaluate(() => { const f = document.querySelector('.fen [data-cherchecli]'); if (f) f.focus({ preventScroll: true }); }); }
    else { await I.devenir(c, 'sm', 'inter-x-i1'); await p.evaluate(s => { const f = document.querySelector(s); if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); } }, S); }
    await p.evaluate(m => toast(m), PHRASE); await L.calme(p, 700);
    return p.evaluate(() => { const t = document.getElementById('toast'), g = t.getBoundingClientRect(), R = e => e.getBoundingClientRect();
      const cibles = [...new Set([document.activeElement, ...document.querySelectorAll('.fen [data-cherchecli], [data-cherche], .fen .seg button, .fen [role=tab]')])].filter(e => e && e !== document.body && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.tagName)).filter(e => { const r = R(e); return r.width && r.height && r.bottom > 0 && r.top < innerHeight; });
      const caches = cibles.filter(e => { const r = R(e), inter = Math.max(0, Math.min(g.right, r.right) - Math.max(g.left, r.left)) * Math.max(0, Math.min(g.bottom, r.bottom) - Math.max(g.top, r.top)); const q = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); return inter > 0 || (q && t.contains(q)); }).map(e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30));
      return { cibles: cibles.length, caches, haut: t.classList.contains('haut'), dedans: g.top >= 0 && g.bottom <= innerHeight && g.left >= 0 && g.right <= innerWidth, rect: [Math.round(g.left), Math.round(g.top), Math.round(g.right), Math.round(g.bottom)] }; }); };
  for (const [w, h] of [[360, 400], [390, 350], [667, 375], [740, 360], [390, 520]]) {
    const r = await mesure(w, h, true);
    v(`B ${w}×${h}, « Nouvelle intervention » : ${r.cibles} cibles visibles, la bulle n’en cache aucune (${r.caches.join(' | ') || 'rien'}) ${r.haut ? '· en haut' : '· en bas'}`, r.cibles >= 2 && r.caches.length === 0 && r.dedans, r);
    await L.capture(c, `/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/bulle-${w}x${h}-${profil}${nuit ? '-nuit' : ''}.png`);
  }
  for (const [w, h] of [[360, 400], [390, 350], [667, 375]]) {
    const r = await mesure(w, h, false);
    v(`B ${w}×${h}, fiche i1, champ « Soufflage » au focus : la bulle ne le cache pas (${r.caches.join(' | ') || 'rien'}) ${r.haut ? '· en haut' : '· en bas'}`, r.cibles >= 1 && r.caches.length === 0 && r.dedans, r);
  }
  // contre-épreuve : un grand écran, rien n'est caché → la bulle reste EN BAS (108 px sur téléphone), la règle d'origine
  { const r = await mesure(390, 844, false); v('B contre-épreuve 390×844 : la bulle reste en bas quand rien n’est caché', !r.haut && r.caches.length === 0, r); }
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})();
