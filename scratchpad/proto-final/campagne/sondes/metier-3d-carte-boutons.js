// Campagne « métiers » : sur la Carte des box, les boutons « Envoyer au client », « Imprimer les étiquettes » et « Modifier le plan » reçoivent-ils
// VRAIMENT le toucher (l'élément au point touché est-il le bouton, ou autre chose posé par-dessus) ? Mesuré le bouton amené au milieu de la fenêtre,
// après deux images (règle du dépôt : un contrôle « recouvert » se fait candidat centré), et la pile d'éléments sous le point est rendue en cas d'échec.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => {
  for (const profil of (process.argv[2] || 'mac,iphone').split(',')) {
    const c = await O.ouvrir({ profil, qui: 'marc', packs: O.METIERS.d3 }), p = c.p;
    await p.evaluate(() => aller('carteBox')); await L.calme(p, 900);
    // ces trois gestes vivent dans le menu « Plus d'actions » : on l'ouvre par SON bouton, comme la personne
    const menu = await L.toucher(c, p.locator('#contenu summary').filter({ hasText: /Plus d.actions/ }).first()); v(`${profil} : « Plus d'actions » s'ouvre`, menu);
    for (const cle of ['envoi', 'etiq', 'edit']) {
      const r = await p.evaluate(async cle => { const e = document.querySelector(`#contenu [data-cbx="${cle}"]`); if (!e) return { absent: true };
        e.scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
        const rc = e.getBoundingClientRect(), x = rc.left + rc.width / 2, y = rc.top + rc.height / 2, pile = document.elementsFromPoint(x, y).slice(0, 5).map(n => n.tagName + '.' + String(n.className).slice(0, 30) + (n.dataset && n.dataset.cbx ? '[cbx=' + n.dataset.cbx + ']' : ''));
        const top = document.elementFromPoint(x, y); return { libelle: e.textContent.replace(/\s+/g, ' ').trim(), rect: [Math.round(rc.left), Math.round(rc.top), Math.round(rc.width), Math.round(rc.height)], recu: top === e || e.contains(top), pile, visible: getComputedStyle(e).visibility, vh: innerHeight }; }, cle);
      v(`${profil} : le bouton data-cbx=${cle} existe`, !r.absent); if (r.absent) continue;
      v(`${profil} : « ${r.libelle} » reçoit le toucher à son centre`, r.recu, JSON.stringify(r));
      // et il FAIT quelque chose : une fenêtre, un message ou un changement du plan
      const av = await p.evaluate(() => document.getElementById('contenu').innerText.length), ok2 = await L.toucher(c, p.locator(`#contenu [data-cbx="${cle}"]`).first()); await L.calme(p, 700);
      const ap = await p.evaluate(() => ({ pan: (document.querySelector('#calque .panneau') || {}).innerText || '', toast: (document.getElementById('toast') && document.getElementById('toast').classList.contains('on')) ? document.getElementById('toast').textContent : '', len: document.getElementById('contenu').innerText.length }));
      v(`${profil} : « ${r.libelle} » fait quelque chose (fenêtre, message ou plan qui change)`, ok2 && !!(ap.pan || ap.toast || ap.len !== av), JSON.stringify({ ok2, av, ap: { pan: ap.pan.slice(0, 80), toast: ap.toast, len: ap.len } }));
      await O.nettoyer(p); await L.aller(p, 'carteBox'); await L.toucher(c, p.locator('#contenu summary').filter({ hasText: /Plus d.actions/ }).first());
    }
    await L.capture(c, O.CAP + `carte-boutons-${profil}.png`); await L.fin(c);
  }
  await L.fermer(); process.exit(O.bilan('metier-3d-carte-boutons', ok, ko, []));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
