// RECONTRÔLE ADVERSE restes-achats tour 2 (18 novembre 2026), suite : le tarif au kilomètre à TROIS décimales, joué dans le formulaire de la
// note de frais kilométrique (la phrase qui annonce le montant, le montant enregistré, la ligne de la note, sa fiche). Avec 0,603 € le km,
// kilomètres × tarif tombe sur un DEMI-CENTIME pour un kilométrage sur 15 : « eur(k × tarif) » (arrondi du navigateur) et « axR2(k × tarif) »
// (celui qui est écrit dans la note) ne disent plus la même chose. Usage : node achats-restes2-adverse-km.js [profil=mac] [nuit] [qui=marc]
const { L, ouvrirAchats, toast, txt, CAP } = require('./achats-outils.js'), v = L.v;
const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', qui = process.argv[4] || 'marc';
  const c = await ouvrirAchats({ profil, qui, nuit, hash: false }), p = c.p, E = (f, a) => p.evaluate(f, a), tag = profil + (nuit ? '-nuit' : '-jour') + '-' + qui;
  await E(() => { AX.kmTarif = 0.603; });
  for (const [km, attendu] of [[85, '51,26'], [45, '27,14'], [100, '60,30'], [255, '153,77']]) {
    await E(() => { axNdfForm(); }); await L.calme(p, 400);
    const present = await E(() => !!document.getElementById('rn-o'));
    v('K0 population : le formulaire de note de frais s’ouvre (' + km + ' km)', present); if (!present) continue;
    const av = await E(() => { const o = document.getElementById('rn-o'); o.value = AX_NATURES[4]; o.dispatchEvent(new Event('change', { bubbles: true })); return document.getElementById('rn-kmtxt').textContent; });
    await p.fill('#rn-km', String(km)); await E(() => document.getElementById('rn-km').dispatchEvent(new Event('input', { bubbles: true }))); await L.calme(p, 250);
    const ap = await E(() => document.getElementById('rn-kmtxt').textContent);
    console.log('  ' + km + ' km · avant saisie :', av, '| après :', ap);
    if (km === 85) { v('K1 avant saisie, la phrase écrit le tarif avec ses trois décimales (« 0,603 € »), pas arrondi', /0,603/.test(av), av); await L.capture(c, CAP + 'adverse2-formulaire-km-' + tag + '.png'); }
    const annonce = (ap.match(/= ([\d\s  ,]+)\s?€/) || [])[1];
    await E(() => { const s = document.getElementById('rn-cv'); if (s && !s.value) s.value = '5'; });
    const nAv = await E(() => NDF.length); await E(() => document.querySelector('[data-rl="ndfok"]').click()); await L.calme(p, 600);
    const t = await toast(p), nAp = await E(() => NDF.length);
    const dern = await E(k => { const o = NDF.find(x => x.km && x.km.km === k); return o ? { ttc: o.ttc, km: o.km, id: o.id } : null; }, km);
    console.log('    annoncé :', annonce, '| note enregistrée :', JSON.stringify(dern), '| toast :', t, '| notes', nAv, '→', nAp);
    v('K2 ' + km + ' km : la note est créée', nAp === nAv + 1 && dern && dern.km.km === km, { nAv, nAp, dern });
    if (dern) { const ttc = String(dern.ttc.toFixed(2)).replace('.', ',');
      v('K3 ' + km + ' km : le montant annoncé dans le formulaire = le montant enregistré (' + ttc + ' €)', (annonce || '').replace(/[\s  ]/g, '') === ttc, { annonce, ttc, attendu });
      v('K4 ' + km + ' km : le montant enregistré est l’arrondi usuel de ' + km + ' × 0,603 (' + attendu + ')', ttc === attendu, { ttc, attendu }); }
  }
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 500);
  const liste = await txt(p, '#contenu'); console.log('  liste des notes :', (liste.match(/\d+ km × [\d,]+ €[^N]{0,40}/g) || []).slice(0, 4));
  if (qui === 'marc') v('K5 la ligne d’une note kilométrique écrit « × 0,603 € »', /km × 0,603 €/.test(liste));
  await L.capture(c, CAP + 'adverse2-notes-km-' + tag + '.png');
  const ko = L.bilan(); console.log('  erreurs de page :', JSON.stringify(c.err)); await L.fin(c); await L.fermer(); process.exit(ko || c.err.length ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
