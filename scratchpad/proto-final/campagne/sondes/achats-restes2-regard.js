// RESTES ACHATS tour 2 (18 novembre 2026) : les captures à REGARDER après les corrections — la liste « Sans facture » après la validation d'une note
// avec ticket (ordinateur jour, iPhone nuit), la puce choisie en vue sur petit téléphone, la fenêtre du tarif à 0,603.
// Usage : node achats-restes2-regard.js   (captures dans CAP)
const { L, ouvrirAchats, CAP } = require('./achats-outils.js'), v = L.v;
const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
(async () => {
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['petit', false], ['android', true]]) {
    const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
    await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 500);
    await E(() => { const b = document.querySelector('[data-ac="ndfok|n1"]'); if (b) b.click(); }); await L.calme(p, 900);
    await E(() => { CX.cat = 'tous'; CX.st = 'sansfacture'; cxAller('fachats'); }); await L.calme(p, 900);
    const n = await E(() => ({ lignes: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, puce: (document.querySelector('#contenu [data-cx^="st|"][aria-pressed="true"]') || {}).textContent }));
    v(profil + ' : la liste « Sans facture » montre la note validée et sa puce est active', n.lignes >= 4 && /Sans facture/.test(n.puce || ''), n);
    await L.capture(c, CAP + 'restes2-sansfacture-' + profil + (nuit ? '-nuit' : '-jour') + '.png');
    if (profil === 'mac') { await E(() => { cxAller('fournisseurs'); }); await L.calme(p, 700); await L.capture(c, CAP + 'restes2-fournisseurs-mac-jour.png'); }
    if (profil === 'iphone') {
      await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 500);
      await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 400); await L.toucher(c, '#calque [data-axa="kmtarif"]'); await L.calme(p, 400);
      await p.fill('#ax-km', '0,603 €'); await L.capture(c, CAP + 'restes2-tarif-iphone-nuit.png');
      await L.toucher(c, '[data-axa="kmok"]'); await L.calme(p, 400);
      await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 400); await L.capture(c, CAP + 'restes2-regle-iphone-nuit.png');
    }
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
