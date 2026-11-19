// Tour 5, recontrôle adverse : un clic sur un bouton (data-action) sans rien saisir n'écrit AUCUN relevé (le vidage releveFlush valide tous les champs de l'écran, y compris ceux qu'on n'a pas touchés).
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  const cand = await p.evaluate(() => INTS.filter(i => FICHES[i.id] && RELEVES[FICHES[i.id].metier] && FICHES[i.id].etat !== 'bureau').map(i => ({ id: i.id, st: i.st, metier: FICHES[i.id].metier, rel: FICHES[i.id].releves === undefined ? 'absent' : 'present' })));
  console.log('  · fiches ouvrables :', JSON.stringify(cand));
  v('population : au moins une fiche sans relevés enregistrés', cand.some(x => x.rel === 'absent'), cand);
  let n = 0;
  for (const f of cand.filter(x => x.rel === 'absent').slice(0, 4)) {
    await I.devenir(c, 'sm', 'inter-x-' + f.id); await L.calme(p, 200);
    const av = await p.evaluate(id => JSON.stringify(fiche(id).releves === undefined ? null : fiche(id).releves), f.id);
    const champs = await p.locator('input[data-releve]').count();
    if (!champs) { console.log('  · pas de champ relevé pour', f.id); continue; }
    n++;
    // un clic sur un bouton data-action neutre de la fiche (jamais Terminer) : on prend le premier qui n'enregistre ni ne quitte
    const noms = await p.evaluate(() => [...document.querySelectorAll('[data-action]')].map(b => b.dataset.action));
    const sur = await p.evaluate(() => ({ ctrl: [...document.querySelectorAll('input[data-releve]')].map(e => e.value) }));
    const choix = noms.find(a => /pieceAjout|modifInt|photo|reprendre|note/i.test(a));
    await p.evaluate(a => { const b = document.querySelector(`[data-action="${a}"]`); b && b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }, choix);
    await L.calme(p, 300);
    const ap = await p.evaluate(id => JSON.stringify(fiche(id).releves === undefined ? null : fiche(id).releves), f.id);
    v(`${f.id} (${f.st}, ${f.metier}) : clic « ${choix} » sans saisie, releves inchangés`, av === ap, { av, ap, champs: sur.ctrl });
    try { await p.keyboard.press('Escape'); } catch (e) {}
  }
  v('population : au moins une fiche jouée', n >= 1, n);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
