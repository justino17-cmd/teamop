// GARDE restes-achats tour 3 (18 novembre 2026) : ce que le recontrôle adverse du tour 2 avait laissé ouvert.
//  K. le montant d'une note kilométrique est UN calcul en centimes entiers (axKmMontant) : exhaustif sur 2 000 kilométrages × 4 tarifs, plus les
//     kilomètres à virgule, contre l'arithmétique exacte sur des entiers ; la phrase d'avant saisie dit « 0,603 € » et pas « 0,60 € » ;
//  T. la tâche « Retrouver le ticket » ne dit « la TVA ne se récupère pas » que d'un achat qui a de la TVA ;
//  R. le refus d'un tarif à quatre décimales dit « trois décimales », pas « deux » ;
//  F. la tuile « achats sans facture » de Comptes fournisseurs dit combien de notes de frais elle compte (« dont N notes de frais »), et son
//     chiffre = pastilles de la liste + ces notes ;
//  P. la puce active est centrée dans SA rangée (et non décalée du remplissage de la page) sur la rangée de la Comptabilité qui défile.
// Usage : node achats-restes3.js [profil=mac] [nuit]
const { L, ouvrirAchats, toast, txt, CAP } = require('./achats-outils.js'), v = L.v;
const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a), tag = profil + (nuit ? '-nuit' : '-jour');

  // ───────── K. le calcul, exhaustif ─────────
  const K = await E(() => { const tarifs = [0.603, 0.631, 0.6, 0.5]; let n = 0, faux = []; const pile = [];
    for (const t of tarifs) { const mill = Math.round(t * 1000);
      for (let k = 1; k <= 2000; k++) { n++; const exact = Math.floor((k * mill + 5) / 10);   // centimes entiers, demi vers le haut, sans flottant
        const a = Math.round(axKmMontant(k, t) * 100); if (a !== exact) faux.push({ t, k, a, exact }); }
      for (let k = 0.5; k <= 300; k += 0.5) { n++; const exact = Math.floor((k * 2 * mill + 10) / 20);
        const a = Math.round(axKmMontant(k, t) * 100); if (a !== exact) faux.push({ t, k, a, exact }); } }
    return { n, faux: faux.slice(0, 5), nf: faux.length, ex: [axKmMontant(85, 0.603), axKmMontant(45, 0.603), axKmMontant(255, 0.603)] }; });
  v('K1 population : plus de 9 000 montants recalculés', K.n > 9000, K.n);
  v('K2 axKmMontant = l’arithmétique en centimes entiers, sur tous les kilométrages et les quatre tarifs', K.nf === 0, K);
  v('K3 les trois kilométrages qui divergeaient à 0,603 : 85 km = 51,26 ; 45 km = 27,14 ; 255 km = 153,77', K.ex.join('|') === '51.26|27.14|153.77', K.ex);
  const av = await E(() => { AX.kmTarif = 0.603; axNdfForm(); const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); return document.getElementById('rn-kmtxt').textContent; });
  v('K4 avant la saisie, la phrase du formulaire écrit le tarif à trois décimales (« 0,603 € »)', /0,603 €/.test(av) && !/\(0,60 €\)/.test(av), av);
  // de bout en bout : la phrase du formulaire, la note enregistrée et le toast disent le même montant (les trois kilométrages qui divergeaient)
  await E(() => { AX.kmTarif = 0.603; });
  for (const km of [85, 45, 255]) {
    await E(() => { axNdfForm(); const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); const cv = document.getElementById('rn-cv'); if (cv && !cv.value) cv.value = '5'; }); await L.calme(p, 250);
    await p.fill('#rn-km', String(km)); await E(() => document.getElementById('rn-km').dispatchEvent(new Event('input', { bubbles: true }))); await L.calme(p, 200);
    const ph = await E(() => document.getElementById('rn-kmtxt').textContent), annonce = ((ph.match(/= ([\d\s\u00a0\u202f,]+)\s?€/) || [])[1] || '').replace(/[\s\u00a0\u202f]/g, '');
    await E(() => document.querySelector('[data-rl="ndfok"]').click()); await L.calme(p, 500);
    const t = await toast(p), n = await E(k => { const o = NDF.find(x => x.km && x.km.km === k); return o ? o.ttc : null; }, km), ttc = n == null ? '' : n.toFixed(2).replace('.', ',');
    v('K5 ' + km + ' km à 0,603 : phrase du formulaire = note enregistrée = toast (' + ttc + ' €)', !!ttc && annonce === ttc && t.replace(/[\s\u00a0\u202f]/g, '').includes(ttc + '€'), { annonce, ttc, t }); }
  await E(() => { fermerPanneau(); AX.kmTarif = 0.6; });

  // ───────── T. « Retrouver le ticket » ─────────
  const T = await E(() => { const A = ACHATS.length; ACHATS.push({ id:'t3-sans', d:'05/10', four:'Test sans TVA', objet:'Cotisation test', ht:30, tva:0, compte:'6281', mode:'Virement', paye:'2026-10-05', piece:null, ref:'T3-1' },
      { id:'t3-avec', d:'05/10', four:'Test avec TVA', objet:'Pièce test', ht:30, tva:20, compte:'6061', mode:'Virement', paye:'2026-10-05', piece:null, ref:'T3-2' });
    const L2 = liensAFaire().filter(o => /^piece-t3-/.test(o.cle)); ACHATS.length = A; return L2.map(o => ({ cle: o.cle, pourquoi: o.pourquoi })); });
  const ts = T.find(o => o.cle === 'piece-t3-sans'), ta = T.find(o => o.cle === 'piece-t3-avec');
  v('T1 population : les deux tâches de test existent', !!ts && !!ta, T);
  v('T2 sans TVA : « ni facture ni ticket » sans « la TVA ne se récupère pas »', ts && /ni facture ni ticket$/.test(ts.pourquoi) && !/TVA/.test(ts.pourquoi), ts);
  v('T3 avec TVA : « la TVA ne se récupère pas » reste dite', ta && /la TVA ne se récupère pas/.test(ta.pourquoi), ta);

  // ───────── R. le refus du tarif à quatre décimales ─────────
  const lire = async txtTarif => { await E(() => { AX.kmTarif = 0.6; });
    await E(() => { document.body.insertAdjacentHTML('beforeend', '<button id="t3-b" data-axa="kmtarif" hidden></button>'); document.getElementById('t3-b').click(); document.getElementById('t3-b').remove(); }); await L.calme(p, 300);
    await E(t => { const z = document.getElementById('ax-km'); z.value = t; }, txtTarif); await E(() => document.querySelector('[data-axa="kmok"]').click()); await L.calme(p, 300);
    const t = await toast(p), ok = await E(() => AX.kmTarif); await E(() => { try { fermerPanneau(); } catch (e) {} }); return { t, ok }; };
  const r4 = await lire('0,6034'), r00 = await lire('00,603'), rok = await lire('0,603');
  v('R1 « 0,6034 » : refusé, la phrase parle de TROIS décimales, le tarif ne bouge pas', /trois décimales/.test(r4.t) && !/deux chiffres/.test(r4.t) && r4.ok === 0.6, r4);
  v('R2 « 00,603 » : phrase du zéro de tête (restes achats 4)', /^Le zéro de tête est en trop : tape 0,603\.$/.test(r00.t) && r00.ok === 0.6, r00);
  v('R3 « 0,603 » reste accepté', rok.ok === 0.603 && /0,603/.test(rok.t), rok);
  await E(() => { AX.kmTarif = 0.6; });

  // ───────── F. la tuile de Comptes fournisseurs ─────────
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 500);
  const dispo = await E(() => [...document.querySelectorAll('[data-ac^="ndfok|"]')].map(b => b.dataset.ac));
  for (const d of dispo.filter(x => !/n3$/.test(x))) { await E(d => { const b = document.querySelector(`[data-ac="${d}"]`); if (b) b.click(); }, d); await L.calme(p, 700); }
  await E(() => { cxAller('fournisseurs'); }); await L.calme(p, 700);
  const F = await E(() => { const t = document.querySelector('[data-cx="sec|fachats|achats|sansfacture"]'); return { tuile: +(t.querySelector('b').textContent), lib: t.querySelector('span').textContent, badges: [...document.querySelectorAll('.cx-crow .st-o')].reduce((a, e) => a + (parseInt(e.textContent, 10) || 0), 0),
      notes: cxDocs().filter(x => x.src === 'ach' && x.sf && (ACHATS.find(a => a.id === x.id) || {}).mode === 'Note de frais').length }; });
  v('F0 population : au moins une note de frais avec TVA validée, comptée sans facture', F.notes > 0, F);
  v('F1 la tuile dit « dont ' + F.notes + ' note(s) de frais »', new RegExp('dont ' + F.notes + ' notes? de frais').test(F.lib), F);
  v('F2 le chiffre de la tuile = les pastilles de la liste + les notes dites', F.tuile === F.badges + F.notes, F);
  await L.capture(c, CAP + 'restes3-fournisseurs-' + tag + '.png');

  // ───────── P. la puce active, centrée dans sa rangée ─────────
  await E(() => { cxAller('fachats'); }); await L.calme(p, 600);
  const P = await E(() => [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].filter(r => r.scrollWidth > r.clientWidth + 2).length);
  if (P > 0) {
    for (const st of ['retard', 'payee']) {
      await E(s => { CX.st = s; rendre(); }, st); await L.calme(p, 500);
      const r = await E(() => [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].filter(r => r.scrollWidth > r.clientWidth + 2).map(r => { const b = r.querySelector('[aria-pressed="true"]'); if (!b) return null; const rb = b.getBoundingClientRect(), rr = r.getBoundingClientRect();
        return { sl: Math.round(r.scrollLeft), max: Math.round(r.scrollWidth - r.clientWidth), ecart: Math.round((rb.left + rb.width / 2) - (rr.left + rr.width / 2)), gauche: Math.round(rb.left - rr.left), droite: Math.round(rr.right - rb.right) }; }).filter(Boolean));
      v('P1 ' + st + ' : la puce active est dans sa rangée, entière (population : ' + r.length + ' rangée(s) qui défilent)', r.length > 0 && r.every(x => x.gauche >= -1 && x.droite >= -1), r);
      v('P2 ' + st + ' : centrée à 8 px près quand la rangée peut la centrer', r.every(x => !(x.sl > 0 && x.sl < x.max - 1) || Math.abs(x.ecart) <= 8), r); }
    await L.capture(c, CAP + 'restes3-puce-' + tag + '.png');
  } else console.log('  P : aucune rangée ne défile à cette largeur (' + profil + ') : contrôle sans objet ici');

  const ko = L.bilan(); console.log('  erreurs de page :', JSON.stringify(c.err)); await L.fin(c); await L.fermer(); process.exit(ko || c.err.length ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
