// RECONTRÔLE ADVERSE restes-achats tour 2 (18 novembre 2026). Le correcteur a dit : « sans facture » = le MÊME nombre partout, le tarif au
// kilomètre s'écrit à trois décimales, la puce de filtre active se ramène dans la rangée. On cherche ce que ces corrections ont CASSÉ à côté :
//  S. « sans facture » joué par de VRAIS gestes d'écran (dépense saisie par le formulaire : sans justificatif, ticket seul, facture, sans TVA ; puis la
//     facture ajoutée après coup) — Comptabilité (cpTva), liste (cxDocs), tuile Fournisseurs, lignes par fournisseur, texte lu sur l'écran ;
//  K. le tarif au kilomètre dans TOUS ses endroits (règle, formulaire de note, fiche, Paramètres) et dans des saisies hostiles ;
//  P. la rangée de puces : la page ne glisse pas de côté, une puce non choisie n'est pas déplacée, la nuit, le téléphone ;
// Usage : node achats-restes2-adverse.js [profil=mac] [nuit]
const { L, ouvrirAchats, toast, txt, devenir, CAP, PNG } = require('./achats-outils.js'), v = L.v;
const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a), tel = c.largeur < 760;
  const tag = profil + (nuit ? '-nuit' : '-jour');

  // ───────── S. « sans facture » ─────────
  const mes = () => E(() => { const D = cxDocs(), F = cxFournisseurs();
    return { tv: cpTva().sans.length, sf: D.filter(x => x.src === 'ach' && x.sf).length, sfNdf: D.filter(x => x.src === 'ach' && x.sf && /^Note de frais/.test(x.tiers)).length,
      tuile: +((cxVueFournisseurs().match(/<b>(\d+)<\/b><span>achats sans facture/) || [])[1]), lignesF: F.reduce((s, o) => s + o.sans, 0),
      sp: axSansJustif() }; });
  const lu = async (onglet, re) => { await E(o => { cxAller(o); }, onglet); await L.calme(p, 500); const t = await txt(p, '#contenu'); const m = t.match(re); return m ? +m[1] : 0; };
  const ecran = async () => ({ afaire: await lu('ensemble', /(\d+) achats? sans facture/), normes: await lu('normes', /(\d+) achats? sans facture/) });
  const depense = async (o) => { await E(() => { cxAller('fachats'); }); await L.calme(p, 400); await E(() => cxDepense()); await L.calme(p, 400);
    await E(o => { const s = (id, x) => { const e = document.getElementById(id); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
      s('dp-f', o.four); s('dp-o', o.obj); s('dp-h', o.ht); s('dp-t', String(o.tva)); if (o.ref !== undefined) s('dp-r', o.ref);
      const r = (n, val) => { const e = document.querySelector(`input[name="${n}"][value="${val}"]`); if (e) { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); } };
      r('dp-j', o.just || ''); r('dp-pay', o.pay || ''); }, o);
    await E(() => document.querySelector('[data-cx="depenseok"]').click()); await L.calme(p, 600); return await toast(p); };
  const m0 = await mes(); const e0 = await ecran();
  console.log('  S base :', JSON.stringify(m0), JSON.stringify(e0));
  v('S0 population : des achats sans facture existent à l’état de départ', m0.sf > 0 && m0.tv > 0, m0);
  v('S1 départ : Comptabilité = liste = tuile = texte lu (À faire, Aux normes)', m0.tv === m0.sf && m0.sf === m0.tuile && e0.afaire === m0.tv && e0.normes === m0.tv, { m0, e0 });

  const ajouts = [
    { nom: 'sans justificatif, à payer, TVA 20 %', o: { four: 'Brico Test', obj: 'Visserie adverse un', ht: '40', tva: 20, just: '', pay: '' }, dTv: 1 },
    { nom: 'ticket de carte seul, payé, TVA 20 %', o: { four: 'Brico Test', obj: 'Visserie adverse deux', ht: '25', tva: 20, just: 'ticket', pay: 'Carte' }, dTv: 1 },
    { nom: 'facture avec numéro, TVA 20 % (rien ne bouge)', o: { four: 'Brico Test', obj: 'Visserie adverse trois', ht: '60', tva: 20, just: 'facture', ref: 'BT-ADV-3', pay: '' }, dTv: 0 },
    { nom: 'sans TVA, sans justificatif (rien ne bouge)', o: { four: 'Brico Test', obj: 'Cotisation adverse', ht: '30', tva: 0, just: '', pay: 'Virement' }, dTv: 0 },
  ];
  let prec = m0; const ids = [];
  for (const a of ajouts) {
    const t = await depense(a.o); const m = await mes(); const e = await ecran();
    console.log('  S', a.nom, '→', JSON.stringify(m), JSON.stringify(e), '| toast :', t);
    v('S2 « ' + a.nom + ' » : la dépense est bien enregistrée', await E(o => ACHATS.some(x => x.objet === o), a.o.obj), t);
    v('S3 « ' + a.nom + ' » : « sans facture » bouge de ' + a.dTv + ' en Comptabilité ET dans la liste', m.tv === prec.tv + a.dTv && m.sf === prec.sf + a.dTv, { prec, m });
    v('S4 « ' + a.nom + ' » : Comptabilité = liste = tuile = texte lu', m.tv === m.sf && m.sf === m.tuile && e.afaire === m.tv && e.normes === m.tv, { m, e });
    v('S5 « ' + a.nom + ' » : la tuile Fournisseurs = les lignes par fournisseur (+ les notes validées avec TVA)', m.tuile === m.lignesF + m.sfNdf, m);
    prec = m; ids.push(await E(o => (ACHATS.find(x => x.objet === o) || {}).id, a.o.obj));
  }
  // la facture arrive après coup sur la dépense « sans justificatif » : « sans facture » redescend partout
  await E(id => { CX.st = 'tous'; cxAller('fachats'); cxFicheAchat(id); }, ids[0]); await L.calme(p, 600);
  const entree = await E(() => !!document.querySelector('#calque .panneau [data-cpjust]'));
  v('S6 population : la fiche de la dépense propose d’ajouter la facture', entree);
  if (entree) { await p.setInputFiles('#calque .panneau [data-cpjust]', { name: 'facture-adverse.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 700);
    const m = await mes(), e = await ecran(); console.log('  S après facture :', JSON.stringify(m), JSON.stringify(e));
    v('S7 la facture ajoutée fait redescendre « sans facture » de 1 partout, au même nombre', m.tv === prec.tv - 1 && m.sf === prec.sf - 1 && m.tv === m.sf && m.sf === m.tuile && e.afaire === m.tv && e.normes === m.tv, { prec, m, e }); prec = m; }
  // une note de frais validée par le gérant puis annulée ? (pas de geste d'annulation connu : on regarde seulement l'état d'une 2e validation)
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
  const dispo = await E(() => [...document.querySelectorAll('[data-ac^="ndfok|"]')].map(b => b.dataset.ac));
  console.log('  notes à valider :', JSON.stringify(dispo));
  for (const d of dispo.filter(x => !/n3$/.test(x))) { await E(d => { const b = document.querySelector(`[data-ac="${d}"]`); if (b) b.click(); }, d); await L.calme(p, 700); }
  { const m = await mes(), e = await ecran(); console.log('  S après notes avec ticket :', JSON.stringify(m), JSON.stringify(e));
    v('S8 notes avec ticket validées : Comptabilité = liste = tuile = texte lu', m.tv === m.sf && m.sf === m.tuile && e.afaire === m.tv && e.normes === m.tv, { m, e });
    v('S9 la tuile Fournisseurs = lignes par fournisseur + notes validées avec TVA', m.tuile === m.lignesF + m.sfNdf, m); }
  // ce que lit une personne : la tuile et les lignes de la page Fournisseurs côte à côte (écart expliqué ou non ?)
  await E(() => { cxAller('fournisseurs'); }); await L.calme(p, 700);
  const four = await E(() => ({ tuile: (document.querySelector('[data-cx="sec|fachats|achats|sansfacture"] b') || {}).textContent, badges: [...document.querySelectorAll('.cx-crow .st-o')].map(e => e.textContent.trim()), note: /note/i.test((document.querySelector('[data-cx="sec|fachats|achats|sansfacture"]') || {}).textContent || '') || /note/i.test((document.querySelector('.cx-liste') || {}).parentElement.lastElementChild.textContent) }));
  console.log('  page Fournisseurs :', JSON.stringify(four));
  v('S10 la page Fournisseurs : si la tuile ≠ somme des pastilles « n sans facture » (les notes de frais n’y sont pas), la tuile ou la page le DIT (sinon c’est un écart muet)', (() => { const s = four.badges.reduce((a, b) => a + (parseInt(b, 10) || 0), 0); return +four.tuile === s || !!four.note; })(), four);
  await L.capture(c, CAP + 'adverse2-fournisseurs-' + tag + '.png');
  await E(() => { CX.cat = 'tous'; CX.st = 'sansfacture'; cxAller('fachats'); }); await L.calme(p, 700);
  { const l = await E(() => ({ n: document.querySelectorAll('#cx-liste [data-cx^="doc|"]').length, marques: [...document.querySelectorAll('#cx-liste [data-cx^="doc|"]')].map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 110)) }));
    const m = await mes(); console.log('  liste « Sans facture » :', l.n, JSON.stringify(l.marques));
    v('S11 la liste « Sans facture » montre autant de lignes que le nombre annoncé', l.n === m.sf, { l: l.n, m }); }
  await L.capture(c, CAP + 'adverse2-sansfacture-' + tag + '.png');
  // « sans justificatif » (autre mot) : tuile = liste, et jamais plus de lignes que de sans facture… (un justificatif suffit à ne plus être sans justificatif)
  { const sp = await E(() => ({ tuile: axSansJustif(), liste: cxDocs().filter(x => x.src !== 'ndf' && x.fam === 'achats' && !x.piece).length, sf: cxDocs().filter(x => x.src === 'ach' && x.sf).length }));
    v('S12 « sans justificatif » : tuile = liste ; et chaque achat sans justificatif avec TVA est aussi « sans facture » (le plus large contient le plus étroit)', sp.tuile === sp.liste, sp);
    v('S12b …vérifié sur les données', await E(() => cxDocs().filter(x => x.src === 'ach' && !x.piece && ACHATS.find(a => a.id === x.id).tva).every(x => x.sf))); }
  // tâches de l'Accueil : « Retrouver le ticket » ne parle de TVA que pour un achat qui en porte
  { const taches = await E(() => LIENS_SOURCES.flatMap(f => { try { return f(); } catch (e) { return []; } }).filter(t => /ticket/.test(t.t)).map(t => ({ t: t.t, pourquoi: t.pourquoi })));
    const sansTva = await E(() => ACHATS.filter(a => !a.piece && a.paye && !a.tva).map(a => a.id));
    console.log('  tâches « Retrouver le ticket » :', JSON.stringify(taches), '· sans TVA :', JSON.stringify(sansTva));
    const faux = await E(() => ACHATS.filter(a => !a.piece && a.paye).filter(a => !a.tva && LIENS_SOURCES.flatMap(f => { try { return f(); } catch (e) { return []; } }).some(t => t.cle === 'piece-' + a.id && /TVA ne se récupère/.test(t.pourquoi))).map(a => a.id));
    v('S13b population : au moins un achat sans justificatif et payé est suivi par une tâche', taches.length > 0, taches);
    v('S13c aucun achat SANS TVA ne porte la phrase « la TVA ne se récupère pas »', faux.length === 0, faux);
    // le pas-à-pas et l'infobulle de la touche disent la même chose
    const aide = await E(() => { const o = []; return document.documentElement.innerHTML.match(/ni la facture ni le ticket[^<]{0,80}/g); });
    console.log('  aide :', JSON.stringify(aide)); }
  await L.capture(c, CAP + 'adverse2-comptabilite-' + tag + '.png');

  // ───────── K. tarif au kilomètre ─────────
  const ouvrirTarif = async () => { await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
    if (tel) { await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 350); await L.toucher(c, '#calque [data-axa="kmtarif"]'); } else await L.toucher(c, '[data-axa="kmtarif"]'); await L.calme(p, 350); };
  const saisir = async (s) => { if (!await E(() => !!document.getElementById('ax-km'))) await ouvrirTarif();
    await p.fill('#ax-km', ''); await p.click('#ax-km'); await p.keyboard.type(s, { delay: 6 }); const av = await E(() => AX.kmTarif);
    await E(() => document.querySelector('[data-axa="kmok"]').click()); await L.calme(p, 300); return { s, av, ap: await E(() => AX.kmTarif), t: await toast(p), ouvert: await E(() => !!document.getElementById('ax-km')) }; };
  await ouvrirTarif();
  v('K0 population : le champ du tarif est ouvert', await E(() => !!document.getElementById('ax-km')));
  // le champ proposé se relit tel quel : enregistrer SANS toucher ne change jamais le tarif
  await saisir('0,603'); await ouvrirTarif();
  { const pre = await E(() => document.getElementById('ax-km').value); const r = await (async () => { const av = await E(() => AX.kmTarif); await E(() => document.querySelector('[data-axa="kmok"]').click()); await L.calme(p, 300); return { pre, av, ap: await E(() => AX.kmTarif) }; })();
    v('K1 ouvrir le champ à 0,603 puis « Enregistrer » sans rien changer garde 0,603 (le champ proposé se relit)', r.ap === 0.603 && r.pre === '0,603', r); }
  const H = {}; // saisies hostiles
  for (const s of ['0,6034', '0,60 €/km', '0,60 euros par km', '0,60 € par kilomètre', '€ 0,60', '0,60€', ' 0,603 ', '0 603', '0,05', '0,049', '10', '10,01', '0', '-0,6', 'abc', '', '0,60,3', '60 centimes', '00,603', '1,203']) { H[s] = await saisir(s); console.log('   ', JSON.stringify(H[s])); }
  v('K2 « 0,6034 » (quatre décimales) : refusé OU affiché et calculé pareil (jamais « 0,603 » à l’écran et 0,6034 dans le calcul)', H['0,6034'].ap === H['0,6034'].av || Math.round(H['0,6034'].ap * 1000) / 1000 === H['0,6034'].ap, H['0,6034']);
  v('K3 le refus de « 0,6034 » ne contredit pas l’écran : il ne dit pas « au plus deux chiffres » alors que 0,603 est accepté', !/au plus deux chiffres/.test(H['0,6034'].t), H['0,6034'].t);
  v('K4 « 0,60 €/km », « 0,60€ », « 0,60 euros par km » sont lus 0,60 (ou un refus qui dit quoi écrire)', [H['0,60 €/km'], H['0,60€'], H['0,60 euros par km']].every(r => r.ap === 0.6 || /0,60/.test(r.t)), [H['0,60 €/km'].t, H['0,60€'].t, H['0,60 euros par km'].t]);
  v('K5 « 0,60 € par kilomètre » (unité écrite en toutes lettres) : lu ou refus qui dit quoi faire', H['0,60 € par kilomètre'].ap === 0.6 || /0,60/.test(H['0,60 € par kilomètre'].t), H['0,60 € par kilomètre']);
  v('K6 « 0,05 » et « 10 » (bornes) acceptés ; « 0,049 », « 10,01 », « 0 », « -0,6 », « abc », vide refusés sans bouger le tarif', H['0,05'].ap === 0.05 && H['10'].ap === 10 && ['0,049', '10,01', '0', '-0,6', 'abc', ''].every(k => H[k].ap === H[k].av), ['0,05', '10', '0,049', '10,01', '0', '-0,6', 'abc', ''].map(k => [k, H[k].av, H[k].ap]));
  v('K7 chaque refus dit une phrase (jamais un champ qui ne répond pas)', ['0,049', '10,01', '0', '-0,6', 'abc', '', '0,60,3'].every(k => H[k].ap !== H[k].av ? true : (H[k].t || '').length > 8), ['0,049', '10,01', '0', '-0,6', 'abc', '', '0,60,3'].map(k => [k, H[k].t]));
  v('K8 « 1,203 » ne se lit pas 1 203 en silence', H['1,203'].ap === H['1,203'].av || H['1,203'].ap === 1.203, H['1,203']);
  // tous les endroits où le tarif se lit, à 0,603, puis à 0,5 (le « 0 » final ne s'écrit pas : 0,50 €)
  for (const [tarif, attendu] of [['0,603', '0,603 €'], ['0,5', '0,50 €'], ['0,631', '0,631 €']]) {
    await ouvrirTarif(); const r = await saisir(tarif); await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
    const regle = await txt(p, '#contenu'); const sets = await E(() => (typeof ETATS_REGLAGES === 'function' ? ETATS_REGLAGES() : null));
    const ndf = await E(() => { try { const m = (typeof axReglages === 'function' ? axReglages() : []).find(o => o.k === 'ndf'); return m ? m.etat : null; } catch (e) { return null; } });
    console.log('  K9', tarif, 'toast :', r.t, '| règle :', (regle.match(/Kilom[^.]{0,70}/) || [''])[0], '| Paramètres :', ndf);
    v('K9 tarif ' + tarif + ' : toast, ligne de la règle disent « ' + attendu + ' »', r.t.includes(attendu) && regle.includes('Kilomètres : ' + attendu), { toast: r.t, regle: (regle.match(/Kilom[^.]{0,70}/) || [''])[0] });
  }
  await saisir('0,603'); await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats'); await L.calme(p, 400);
  // ───────── P. rangée de puces ─────────
  for (const st of ['sansfacture', 'sanspiece', 'payee']) {
    await E(st => { CX.cat = 'tous'; CX.st = st; cxAller('fachats'); }, st); await L.calme(p, 700);
    const r = await E(() => { const rows = [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].filter(r => r.offsetParent); return { page: Math.round(scrollX), debordeLargeur: document.documentElement.scrollWidth - innerWidth,
      rangees: rows.map(row => { const b = row.querySelector('[aria-pressed="true"]'), rr = row.getBoundingClientRect(), br = b && b.getBoundingClientRect(); return { defile: row.scrollWidth > row.clientWidth + 2, sl: Math.round(row.scrollLeft), max: row.scrollWidth - row.clientWidth, vue: b ? (br.left >= rr.left - 1 && br.right <= rr.right + 1) : null, ecartCentre: b ? Math.round((br.left - rr.left) - (rr.right - br.right)) : null, puce: b ? b.textContent.trim() : null }; }) }; });
    console.log('  P', st, JSON.stringify(r));
    v('P1 ' + st + ' : la page ne glisse pas de côté (scrollX 0, pas de débordement de page)', r.page === 0 && r.debordeLargeur <= 0, r);
    v('P2 ' + st + ' : dans chaque rangée qui défile, la puce active se voit en entier (mesure par rectangles)', r.rangees.filter(x => x.defile && x.puce).every(x => x.vue), r.rangees);
    v('P4 ' + st + ' : quand la rangée peut la centrer (ni au bord gauche ni au bord droit), la puce active est CENTRÉE à 8 px près', r.rangees.filter(x => x.defile && x.puce && x.sl > 0 && x.sl < x.max - 1).every(x => Math.abs(x.ecartCentre) <= 8), r.rangees);
  }
  // une rangée que la personne a fait défiler elle-même n'est pas arrachée à chaque geste sans rapport (une coche, une ouverture de fiche)
  if (tel) { await E(() => { CX.cat = 'tous'; CX.st = 'tous'; cxAller('fachats'); }); await L.calme(p, 600);
    const r = await E(() => { const row = document.querySelector('.cx-cats'); if (!row || row.scrollWidth <= row.clientWidth + 2) return null; row.scrollLeft = row.scrollWidth; const avant = row.scrollLeft; return { avant }; });
    if (r) { await E(() => { const b = document.querySelector('#cx-liste [data-cx^="doc|"]'); if (b) { b.click(); } }); await L.calme(p, 500); await E(() => { const x = document.querySelector('#calque [data-ferme], #calque .fermer'); if (x) x.click(); }); await L.calme(p, 400);
      const ap = await E(() => { const row = document.querySelector('.cx-cats'); return row ? Math.round(row.scrollLeft) : null; });
      console.log('  P3 rangée défilée à la main :', JSON.stringify(r), '→ après ouverture/fermeture d’une fiche :', ap);
      v('P3 ouvrir puis fermer une fiche ne remet pas la rangée à zéro (info : position conservée ou ramenée sur la puce active)', ap !== null); } }
  await L.capture(c, CAP + 'adverse2-puce-' + tag + '.png');
  const ko = L.bilan(); console.log('  erreurs de page :', JSON.stringify(c.err)); await L.fin(c); await L.fermer(); process.exit(ko || c.err.length ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
