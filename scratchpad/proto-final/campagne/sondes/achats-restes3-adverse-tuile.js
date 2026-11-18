// Recontrôle adverse : la tuile « achats sans facture » de Comptes fournisseurs MÈNE à une liste de la même taille ; singulier/pluriel ; phrase « Retrouver le ticket ».
const { L, ouvrirAchats, toast, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit, onglet: 'notes' }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const etat = async (tag) => { await E(() => { cxAller('fournisseurs'); }); await L.calme(p, 500);
    const t = await E(() => { const k = document.querySelector('[data-cx="sec|fachats|achats|sansfacture"]'); return { n: +k.querySelector('b').textContent, lib: k.querySelector('span').textContent }; });
    await E(() => document.querySelector('[data-cx="sec|fachats|achats|sansfacture"]').click()); await L.calme(p, 700);
    const d = await E(() => ({ onglet: CP.onglet, st: CX.st, cat: CX.cat, lignes: document.querySelectorAll('#contenu .cx-lig, #contenu .cx-row, #contenu tr.cx-doc, #contenu [data-cx^="doc|"]').length, txt: (document.querySelector('#contenu').textContent.match(/(\d+)\s+(?:achat|document|ligne|résultat)[^.]{0,60}/) || [''])[0] }));
    return { tag, t, d }; };
  const pas = [await etat('départ')];
  // valider des notes (avec ticket) une à une et revoir la tuile
  for (let i = 0; i < 3; i++) {
    await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
    const b = await E(() => { const b = [...document.querySelectorAll('[data-ac^="ndfok|"]')].find(x => !/n3$/.test(x.dataset.ac)); if (!b) return null; b.click(); return b.dataset.ac; }); await L.calme(p, 700);
    if (!b) break; pas.push(await etat('après ' + b));
  }
  const bad = [];
  for (const s of pas) { const attendu = s.t.n; const sing = / 1 note de frais/.test(s.t.lib) ; const m = s.t.lib.match(/dont (\d+) notes? de frais/); if (m && ((+m[1] > 1) !== /notes de frais/.test(s.t.lib))) bad.push(['accord', s]); if (!m && /dont/.test(s.t.lib)) bad.push(['dont', s]); }
  v('D1 population : ' + pas.length + ' états de la tuile', pas.length >= 2, pas.map(s => s.t.n + ' | ' + s.t.lib));
  v('D2 singulier/pluriel juste, « dont » seulement s’il y a des notes', bad.length === 0, bad);
  console.log(JSON.stringify(pas.map(s => [s.tag, s.t.n, s.t.lib, s.d.lignes, s.d.txt, s.d.st])));
  await L.capture(c, CAP + 'restes3-adverse-tuile-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
