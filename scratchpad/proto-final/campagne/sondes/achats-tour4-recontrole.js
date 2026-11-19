// RECONTRÔLE ADVERSE INDÉPENDANT restes-achats tour 4 (18 novembre 2026) : gestes d'écran que les sondes des tours 1 à 4 ne jouent pas.
//  A. km : des kilométrages ET des tarifs choisis parce que le flottant naïf se trompe (k × tarif ≠ centimes entiers) — la phrase du formulaire,
//     la note enregistrée, le toast et la ligne de la note disent le MÊME montant, égal à l'arithmétique en entiers ;
//  B. tarif : « 00,603 », « 0000,6 », « 1.500 », « 1 500 » (espace, insécable, fine), « 12.500 » : la bonne phrase, et le tarif ne bouge pas ;
//  C. « sans facture » et « dont N notes de frais » : trois ORDRES de validation (sans ticket d'abord, ticket d'abord, une note kilométrique au milieu),
//     le chiffre de la tuile = liste = Comptabilité à chaque pas, et le « dont » = les notes qui comptent vraiment, singulier/pluriel juste ;
//  D. puces : sur téléphone, chaque puce de chaque rangée de la Comptabilité, touchée une à une, se retrouve ENTIÈRE dans sa rangée ;
//  E. TVA : une note kilométrique ne dit jamais « TVA non récupérable », une dépense sans TVA ne compte pas parmi les achats « sans facture ».
// Usage : node achats-tour4-recontrole.js [profil=mac] [nuit]
const { L, ouvrirAchats, toast, txt, CAP } = require('./achats-outils.js'), v = L.v;
const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  let c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p; const E = (f, a) => p.evaluate(f, a), tel = c.largeur < 760, tag = profil + (nuit ? '-nuit' : '-jour');

  // ───────── A. le montant du kilométrage ─────────
  const cas = await E(() => { const r = []; for (const t of [0.603, 0.631, 0.6, 0.575, 0.05]) { const mill = Math.round(t * 1000);
    for (let k = 1; k <= 1500 && r.filter(x => x.t === t).length < 3; k++) { const exact = Math.floor((k * mill + 5) / 10) / 100, naif = Math.round(k * t * 100) / 100, brut = k * t;
      if (Math.abs(naif - exact) > 1e-9 || String(brut.toFixed(2)) !== exact.toFixed(2)) r.push({ t, k, exact }); } } return r; });
  v('A0 population : des couples (tarif, kilométrage) où le calcul naïf se trompe', cas.length >= 8, cas.length);
  const mauvais = []; let joues = 0;
  for (const x of cas) {
    await E(t => { AX.kmTarif = t; axNdfForm(); const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); const cv = document.getElementById('rn-cv'); if (cv && !cv.value) cv.value = '5'; }, x.t); await L.calme(p, 200);
    await p.fill('#rn-km', String(x.k)); await E(() => document.getElementById('rn-km').dispatchEvent(new Event('input', { bubbles: true }))); await L.calme(p, 150);
    const ph = await E(() => document.getElementById('rn-kmtxt').textContent), annonce = ((ph.match(/= ([\d\s  ,]+)\s?€/) || [])[1] || '').replace(/[\s  ]/g, '');
    await E(() => document.querySelector('[data-rl="ndfok"]').click()); await L.calme(p, 350);
    const tt = (await toast(p)).replace(/[\s  ]/g, ''), fin = x.exact.toFixed(2).replace('.', ',');
    const n = await E(([k, t]) => { const l = NDF.filter(o => o.km && o.km.km === k && o.km.tarif === t); const o = l[l.length - 1]; return o ? { ttc: o.ttc, ligne: axNoteLigne(o).replace(/<[^>]+>/g, ' ').replace(/[\s  ]+/g, '') } : null; }, [x.k, x.t]);
    joues++; const ligneOk = n && n.ligne.replace(/ /g, '').includes(String(x.k).replace('.', ',') + 'km×');
    if (!(annonce === fin && n && Math.abs(n.ttc - x.exact) < 1e-9 && tt.includes(fin + '€') && ligneOk)) mauvais.push({ x, annonce, ttc: n && n.ttc, tt, fin });
    await E(() => { try { fermerPanneau(); } catch (e) {} }); }
  v('A1 ' + joues + ' notes kilométriques jouées : phrase = note = toast = ligne = centimes entiers', mauvais.length === 0 && joues === cas.length, mauvais.slice(0, 4));
  await E(() => { AX.kmTarif = 0.6; });

  // ───────── B. les phrases du tarif ─────────
  const lire = async t => { await E(() => { AX.kmTarif = 0.6; try { fermerPanneau(); } catch (e) {} });
    await E(() => { document.body.insertAdjacentHTML('beforeend', '<button id="t4-b" data-axa="kmtarif" hidden></button>'); document.getElementById('t4-b').click(); document.getElementById('t4-b').remove(); }); await L.calme(p, 250);
    await E(t => { document.getElementById('ax-km').value = t; }, t); await E(() => document.querySelector('[data-axa="kmok"]').click()); await L.calme(p, 250);
    return { t, cp: [...t].map(ch => ch.charCodeAt(0).toString(16)).join(' '), tt: await toast(p), ok: await E(() => AX.kmTarif) }; };
  const zero = /^Le zéro de tête est en trop : tape \d[.,]\d+\.$/, mille = /^Un tarif au kilomètre se tape comme 0,603\.$/;
  const att = [['00,603', zero, 'tape 0,603.'], ['0000,603', zero, 'tape 0,603.'], ['00.631', zero, 'tape 0.631.'], ['1.500', mille], ['1 500', mille], ['1\u00a0500', mille], ['12.500', mille], ['1 500 €', mille], ['1.500 €/km', mille], ['2.000', mille]];
  const malB = [], vusB = [];
  for (const [t, re, fin] of att) { const r = await lire(t); vusB.push(r); if (!(r.ok === 0.6 && re.test(r.tt) && (!fin || r.tt.endsWith(fin)))) malB.push(r); }
  v('B1 ' + vusB.length + ' saisies de tarif : la bonne phrase, le tarif ne bouge pas', malB.length === 0, malB);
  const ok2 = [['0,603', 0.603], ['0.631', 0.631], ['0,5', 0.5], ['0,60', 0.6], ['0,6 €', 0.6], ['1,5', 1.5], ['1.5', 1.5], ['10', 10], ['000,6', 0.6], ['0000,5', 0.5]], malB2 = [];
  for (const [t, a] of ok2) { const r = await lire(t); if (r.ok !== a) malB2.push(r); }
  v('B2 les tarifs valides (dont « 1.5 », « 0.631 ») ne reçoivent pas la phrase du millier', malB2.length === 0, malB2);
  { const r = await lire('1\u202f500'); v('B3 [DÉFAUT OUVERT, tour 4] « 1 500 » écrit avec l’espace fine insécable (celle que fabrique toLocaleString(\'fr-FR\')) reçoit la phrase du millier, pas « ce chiffre est très élevé »', r.ok === 0.6 && mille.test(r.tt), r); }
  await E(() => { AX.kmTarif = 0.6; try { fermerPanneau(); } catch (e) {} });

  // ───────── C. « sans facture » et « dont N notes de frais » ─────────
  const mesure = async () => await E(() => { const D = cxDocs(), tuile = cxVueFournisseurs(), mt = tuile.match(/<b>(\d+)<\/b><span>achats sans facture([^<]*)<\/span>/) || [];
    const sfNdf = D.filter(x => x.src === 'ach' && x.sf && (ACHATS.find(a => a.id === x.id) || {}).mode === 'Note de frais').length;
    return { chiffre: +mt[1], dont: mt[2] || '', sfNdf, liste: D.filter(x => x.src === 'ach' && x.sf).length, compta: cpTva().sans.length, filtre: (() => { const s = CX.st; CX.st = 'sansfacture'; const n = cxDocs().filter(x => x.src !== 'ndf' && x.sf).length; CX.st = s; return n; })() }; });
  const juste = m => m.chiffre === m.liste && m.liste === m.compta && m.filtre === m.liste && (m.sfNdf === 0 ? m.dont === '' : new RegExp('^, dont ' + m.sfNdf + (m.sfNdf > 1 ? ' notes de frais' : ' note de frais') + '$').test(m.dont));
  const valider = async (id, sans) => { await L.aller(p, 'achats'); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 350);
    const ok = await E(id => { const b = document.querySelector('[data-ac="ndfok|' + id + '"]') || document.querySelector('[data-ac="ndfsans|' + id + '"]'); if (b) b.click(); return !!b; }, id); await L.calme(p, 450);
    if (sans) await E(() => { const b = document.querySelector('[data-ac="ndfoksans|' + (document.querySelector('[data-ac^="ndfoksans|"]') || { dataset: { ac: '|' } }).dataset.ac.split('|')[1] + '"]'); if (b) b.click(); }); await L.calme(p, 450); return ok; };
  const ordres = [['sans ticket d’abord', [['n3', true], ['n1', false], ['n2', false]]], ['tickets d’abord', [['n2', false], ['n1', false], ['n3', true]]]];
  for (const [nom, pas] of ordres) {
    c = nom === ordres[0][0] ? c : await (async () => { await L.fermer(c); return ouvrirAchats({ profil, qui: 'marc', nuit }); })(); p = c.p;
    const m0 = await mesure(); const trace = [m0]; let toutJuste = juste(m0), valides = 0;
    for (const [id, sans] of pas) { const a = await valider(id, sans); const m = await mesure(); trace.push(m); toutJuste = toutJuste && juste(m); valides += (await E(id => NDF.find(n => n.id === id).etat === 'validee', id)) ? 1 : 0; }
    v('C0 ' + nom + ' : population — ' + valides + ' notes validées sur ' + pas.length, valides === pas.length, trace.map(m => m.dont));
    v('C1 ' + nom + ' : à chaque pas, tuile = liste = Comptabilité = filtre, et « dont N » = les notes comptées (singulier/pluriel)', toutJuste, trace);
    const dernier = trace[trace.length - 1]; v('C2 ' + nom + ' : les notes qui comptent sont bien celles qui ont de la TVA (n1, n2, n3 : 3 notes de frais sans facture en plus de la démo)', dernier.sfNdf >= 2, dernier);
  }
  // une note kilométrique validée au milieu ne compte pas (ni ticket ni TVA)
  const avantKm = await mesure();
  await E(() => { AX.kmTarif = 0.603; axNdfForm(); const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); const cv = document.getElementById('rn-cv'); if (cv && !cv.value) cv.value = '5'; }); await L.calme(p, 200);
  await p.fill('#rn-km', '120'); await E(() => document.getElementById('rn-km').dispatchEvent(new Event('input', { bubbles: true }))); await E(() => document.querySelector('[data-rl="ndfok"]').click()); await L.calme(p, 400);
  await E(() => { try { fermerPanneau(); } catch (e) {} });
  const idKm = await E(() => { const o = NDF.filter(n => n.km).pop(); return o && o.id; });
  await valider(idKm, false); const apresKm = await mesure();
  v('C3 une note kilométrique validée ne change ni le chiffre ni le « dont » (aucune TVA)', apresKm.chiffre === avantKm.chiffre && apresKm.dont === avantKm.dont && juste(apresKm), { avantKm, apresKm, idKm });

  // ───────── E. la TVA ─────────
  const tva = await E(() => { const km = NDF.filter(n => n.km).pop(), ligne = km ? axNoteLigne(km).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '', sansTva = ACHATS.filter(a => !a.tva), D = cxDocs();
    return { ligne, nTva0: sansTva.length, sfTva0: sansTva.filter(a => D.find(x => x.id === a.id && x.sf)).length, sansTva0: sansTva.filter(a => cpTva().sans.includes(a)).length }; });
  v('E1 population : une note kilométrique et au moins une dépense sans TVA', /km ×/.test(tva.ligne) && tva.nTva0 >= 1, tva);
  v('E2 la note kilométrique dit « ni ticket ni TVA », jamais « TVA non récupérable »', /ni ticket ni TVA/.test(tva.ligne) && !/non récupérable/.test(tva.ligne), tva.ligne);
  v('E3 une dépense sans TVA n’est ni « sans facture » (liste), ni dans la TVA non récupérable (Comptabilité)', tva.sfTva0 === 0 && tva.sansTva0 === 0, tva);

  // ───────── D. les puces, sur téléphone ─────────
  if (tel) {
    await L.fermer(c); c = await ouvrirAchats({ profil, qui: 'marc', nuit, hash: 'comptabilite' }); p = c.p; const E2 = (f, a) => p.evaluate(f, a); await L.calme(p, 700);
    const lecture = () => E2(() => [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].map((row, i) => { const b = row.querySelector('[aria-pressed="true"]'); if (!b || row.scrollWidth <= row.clientWidth + 2) return { i, defile: false }; const rb = b.getBoundingClientRect(), rr = row.getBoundingClientRect(), max = row.scrollWidth - row.clientWidth, voulu = Math.min(max, Math.max(0, (rb.left - rr.left + row.scrollLeft) + rb.width / 2 - row.clientWidth / 2));
      return { i, defile: true, lib: b.textContent.trim().slice(0, 24), dedans: rb.left >= rr.left - 1 && rb.right <= rr.right + 1, ecart: Math.round(Math.abs(row.scrollLeft - voulu)) }; }));
    const SEL = '#contenu [data-cx^="cat|"], #contenu [data-cx^="st|"]', mal = []; let touches = 0, defilantes = 0;
    for (const sec of ['fachats', 'factures', 'achats']) { await E2(sec => { CX.cat = 'tous'; CX.st = 'tous'; try { cxAller(sec); } catch (e) {} }, sec); await L.calme(p, 600);
      for (let tour = 0; tour < 2; tour++) { const n = await E2(SEL => document.querySelectorAll(SEL).length, SEL);
        for (let i = 0; i < n; i++) { const ok = await E2(([SEL, i]) => { const b = document.querySelectorAll(SEL)[i]; if (!b || b.getAttribute('aria-pressed') === 'true') return false; b.click(); return true; }, [SEL, i]); if (!ok) continue; touches++; await L.calme(p, 130);
          for (const r of await lecture()) if (r.defile) { defilantes++; if (!r.dedans) mal.push({ sec, i, r }); } } } }
    v('D0 population : ' + touches + ' puces touchées, ' + defilantes + ' lectures sur une rangée qui défile', touches >= 8 && defilantes >= 4, { touches, defilantes });
    v('D1 chaque puce touchée reste ENTIÈRE dans sa rangée (le recentrage n’a lieu que si elle sortait : voulu)', mal.length === 0, mal.slice(0, 4));
    await L.capture(c, CAP + 'tour4-recontrole-puces-' + tag + '.png');
  }
  await L.capture(c, CAP + 'tour4-recontrole-' + tag + '.png');
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
