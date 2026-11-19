// Recontrôle ADVERSE « compta-reste » (campagne du 17 novembre 2026, étape 3) : rejoue, par mes propres gestes, les défauts annoncés « corrigés » 03, 04, 05, 07, 10, 11, 13, 14, 20,
// puis cherche ce que les corrections ont cassé à côté. Ne dépend PAS des sondes du correcteur (autre écriture, autres valeurs, plus longues).
// usage : node compta-reste-recontrole.js [profil] [nuit] [partie]   (partie : montants · chiffres · mots · mise · tout ) → « N ✓ · M ✗ », sort en 1 si un contrôle tombe
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', partie = process.argv[4] || 'tout';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p, T = (partie === 'tout' ? 'montants ndf chiffres mots mise' : partie).split(' ');
  const suf = `${profil}${nuit ? '-nuit' : ''}`;
  const etat = () => p.evaluate(() => ({ n: ACHATS.length, ndf: NDF.length, ens: cpEcritures().length }));
  const ouvrirDep = async () => { await X.compta(c, 'fachats', { cat: 'achats' }); await p.evaluate(() => cxDepense()); await p.waitForTimeout(250);
    await p.fill('#dp-f', 'Fournisseur de recontrôle'); await p.fill('#dp-o', 'Pièce de contrôle'); };
  const valider = async () => { await p.evaluate(() => { const b = document.querySelector('#calque [data-cx="depenseok"]'); if (b) b.click(); }); await p.waitForTimeout(350); return X.toasts(p); };

  if (T.includes('montants')) {
    // ── 03 / 04 : tous les montants qu'une personne peut taper, dans le formulaire, et ce que la page en fait ──
    // [saisie, ce qui doit arriver : 'ok' (enregistré à ce HT) | 'refus']
    const cas = [['1.234,56', 'ok', 1234.56], ['1,234.56', 'ok', 1234.56], ['1 234,56', 'ok', 1234.56], ['1 234,56', 'ok', 1234.56], ['1234.56', 'ok', 1234.56], ['1234,5', 'ok', 1234.5], ['0,99', 'ok', 0.99], ['12.5', 'ok', 12.5],
      ['1.234', 'refus'], ['1,234', 'refus'], ['9.999', 'refus'], ['0,001', 'refus'], ['12,345', 'refus'], ['1e9', 'refus'], ['12abc', 'refus'], ['-5', 'refus'], ['abc', 'refus'], ['0', 'refus'], ['0,00', 'refus'], ['1..2', 'refus'], ['1,2,3', 'refus'], ['12 ', 'ok', 12],
      ['1.234.567', 'refus'], ['2000000', 'refus'], ['1000000', 'ok', 1000000], ['€12', 'refus'], ['12 €', 'refus'], ['١٢٣', 'refus']];
    let n = 0;
    for (const [saisie, attendu, ht] of cas) {
      await ouvrirDep(); await p.fill('#dp-h', saisie); await p.dispatchEvent('#dp-h', 'input'); await p.waitForTimeout(60);
      const ttcLive = await p.evaluate(() => document.getElementById('dp-ttc').textContent.replace(/\s/g, ''));
      const av = await etat(); const t = await valider(); const ap = await etat(); n++;
      const rangee = ap.n === av.n + 1, ligne = rangee ? await p.evaluate(() => ({ ht: ACHATS[ACHATS.length - 1].ht })) : null;
      if (attendu === 'ok') v(`R03 · « ${saisie} » est lu ${ht} € HT et enregistré`, rangee && ligne && Math.abs(ligne.ht - ht) < .005, { t, ligne, ttcLive });
      else v(`R03 · « ${saisie} » est refusé AVEC une phrase, et rien n'est rangé`, !rangee && t.length > 15, { t, ttcLive });
      // le total en direct ne doit pas annoncer un autre montant que celui qu'on a tapé (« 1.234 » ne doit pas afficher 1,48 € TTC)
      if (attendu === 'refus' && /^1\.234$|^1,234$|^9\.999$/.test(saisie)) v(`R03b · « ${saisie} » : le total en direct ne montre pas un chiffre faux avant le refus`, !/^1,48|^1,2|^12,0|^0,00/.test(ttcLive) || ttcLive === '0,00€', ttcLive);
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
    console.log('montants joués :', n);
    // 04 : au-dessus du plafond, la phrase dit quoi faire
    await ouvrirDep(); await p.fill('#dp-h', '12000000'); const t4 = await valider(); v('R04 · 12 000 000 € : « Vérifie le montant »', /Vérifie le montant/.test(t4), t4);
    await p.evaluate(() => fermerPanneau());
    // 05 : la date hors octobre
    for (const [d, dit] of [['2026-11-05', true], ['2026-09-30', true], ['2026-10-31', false], ['2026-10-01', false]]) {
      await ouvrirDep(); await p.fill('#dp-h', '10'); await p.evaluate(x => { document.getElementById('dp-d').value = x; document.getElementById('dp-e').value = '2026-12-31'; }, d); const av = await etat(); const t = await valider(); const ap = await etat();
      if (dit) v(`R05 · date ${d} : la phrase dit que seul octobre est ouvert, rien n'est rangé`, /Octobre est le seul mois ouvert/.test(t) && ap.n === av.n, t);
      else v(`R05b · date ${d} (octobre) : enregistrée`, ap.n === av.n + 1, t);
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
    // 05c : la date effacée (champ vidé) ne casse rien
    await ouvrirDep(); await p.fill('#dp-h', '10'); await p.evaluate(() => { document.getElementById('dp-d').value = ''; }); const av5 = await etat(); const t5 = await valider(); const ap5 = await etat();
    v('R05c · date effacée : enregistrée à la date du jour ou refusée avec une phrase (pas de silence)', ap5.n === av5.n + 1 || t5.length > 10, t5); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    // la capture du refus, lue à l'œil
    await ouvrirDep(); await p.fill('#dp-h', '1.234'); await valider(); await L.capture(c, X.CAP + `rc-${suf}-refus-ambigu.png`); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });

  }
  if (T.includes('ndf')) {
    // ── la note de frais (nouvelle et modifiée), même lecture ──
    const ndfCas = [['1.234,56', 'ok', 1234.56], ['62,40', 'ok', 62.4], ['1.234', 'refus'], ['200000', 'refus'], ['1e3', 'refus'], ['-3', 'refus']];
    for (const [saisie, attendu, m] of ndfCas) {
      await X.compta(c, 'ndf', { cat: 'ndf' }); await p.evaluate(() => { try { axNdfForm(); } catch (e) {} }); await p.waitForTimeout(250);   /* le geste réel est axNdfForm (le « Note de frais » de la barre, data-rl=ndf, l'intercepte) : rlNdfForm est l'ancien formulaire, sans les champs de kilomètres que axNdfNature relit */
      if (!(await p.evaluate(() => !!document.getElementById('rn-m')))) { v(`R03n · formulaire de note de frais ouvert (« ${saisie} »)`, false, 'rn-m absent'); continue; }
      await p.selectOption('#rn-o', { index: 1 });   /* l'index 0 est « Choisis dans la liste… » (rien n'est choisi d'avance) */ await p.fill('#rn-m', saisie); const av = await etat(); await p.evaluate(() => { const b = document.querySelector('#calque [data-rl="ndfok"]'); if (b) b.click(); }); await p.waitForTimeout(300); const t = await X.toasts(p); const ap = await etat();
      if (attendu === 'ok') v(`R03n · note de frais « ${saisie} » = ${m} € TTC`, ap.ndf === av.ndf + 1 && await p.evaluate(x => Math.abs(NDF[0].ttc - x) < .005, m), { t, avant: av.ndf, apres: ap.ndf });
      else v(`R03n · note de frais « ${saisie} » refusée avec une phrase`, ap.ndf === av.ndf && t.length > 12, t);
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
  }

  if (T.includes('chiffres')) {
    // ── 10 : le bilan des encaissements = Paiements = TVA ; sa table tient sur le téléphone ──
    await X.compta(c, 'paiements'); const tPai = await X.texte(p);
    const ref = await p.evaluate(() => { const E = cpEncOct(), tv = cpTva(); return { n: E.length, ttc: E.reduce((s, e) => s + e.ttc, 0), tva: tv.taux.reduce((s, x) => s + (x.tva || 0), 0), col: tv.col }; });
    await X.compta(c, 'archives'); const ouvert = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button')].find(x => /Bilan des encaissements/i.test((x.closest('.cx-ligne, .ligne, li, tr, div') || x).innerText) && /Ouvrir|Voir/i.test(x.textContent)); if (b) { b.click(); return b.textContent.trim(); } return null; });
    await p.waitForTimeout(600); const bil = await p.evaluate(() => { const f = document.querySelector('#calque .panneau, #calque, .pdf-doc, .pdf-feuille'); const t = (document.querySelector('#calque') || document.body).innerText; return { t: t.replace(/\s+/g, ' ').slice(0, 1800), nb: document.querySelectorAll('#calque table tr').length, deb: (() => { const e = document.querySelector('#calque'); return e ? e.scrollWidth - e.clientWidth : -1; })() }; });
    v('R10 · le bouton « Bilan des encaissements › Ouvrir » ouvre bien un document', !!ouvert && bil.t.length > 100, { ouvert, extrait: bil.t.slice(0, 160) });
    const totBil = (bil.t.match(/3\s?085,00/) || [])[0];
    v('R10 · le bilan dit 3 085,00 € (le total de Paiements)', !!totBil && Math.abs(ref.ttc - 3085) < .005, { ref, totBil });
    v('R10 · le bilan ne dit plus 3 045,00 €', !/3\s?045,00/.test(bil.t), bil.t.slice(0, 300));
    v('R10 · la TVA du bilan = 445,17 € à 20 % + 37,64 € à 10 % (482,81 € ensemble, comme l’écran TVA)', /445,17/.test(bil.t) && /37,64/.test(bil.t) && Math.abs(ref.tva - 482.81) < .006, { tvaEcran: ref.tva });
    v('R10 · la mention des 40,00 € reçus sur place, pas encore sur une facture, est là', /reçus sur place[^€]*40,00/.test(bil.t), bil.t.slice(0, 500));
    await L.capture(c, X.CAP + `rc-${suf}-bilan.png`); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    // 13 : « N sur M points » = pastilles
    await X.compta(c, 'normes'); const n13 = await p.evaluate(() => { const t = document.querySelector('#contenu .cx-score-g'); const ch = [...document.querySelectorAll('#contenu .cx-score-d .st')].map(e => e.textContent.trim()); return { t: t ? t.innerText.replace(/\s+/g, ' ') : null, ch }; });
    const mm = (n13.t || '').match(/(\d+) sur (\d+)/); const somme = n13.ch.reduce((s, x) => s + (+(x.match(/^(\d+)/) || [0, 0])[1]), 0);
    const cp = k => +((n13.ch.find(x => new RegExp(k).test(x)) || '0').match(/^(\d+)/) || [0, 0])[1];
    v('R13 · « N sur M points » : M = en règle (N) + à régler + à surveiller', !!mm && +mm[2] === +mm[1] + cp('à régler') + cp('à surveiller') && +mm[2] > 0, n13);
    const pil = await p.evaluate(() => { const t = (document.querySelector('#contenu') || {}).innerText || ''; return /(\d+)\s*(points?|contrôles?)/g.exec(t) && 1; });
    // la même population sur la tuile du Pilotage (clôture du mois) et sur le tableau de bord du cadre
    await X.compta(c, 'cloture'); const tPil = await X.texte(p); const mp = tPil.match(/(\d+) sur (\d+) points?/);
    v('R13 · la clôture/pilotage cite la même population que Aux normes (s’il en parle)', !mp || (mm && +mp[2] === +mm[2]), { pilotage: mp && mp[0], normes: mm && mm[0] });
    // 14 : en-têtes de colonnes de Salariés
    await X.compta(c, 'salaries'); const th = await p.evaluate(() => [...document.querySelectorAll('#contenu .pt-entete, #contenu .pt-entete *')].map(e => ({ t: e.innerText || '', tt: getComputedStyle(e).textTransform })).filter(x => x.t));
    v('R14 · aucun en-tête de colonne n’est forcé en « Title Case » (text-transform)', th.length > 0 && th.every(x => x.tt !== 'capitalize'), th.slice(0, 4));
    v('R14 · et aucun en-tête n’a de capitale au milieu (« Entré Le »)', th.every(x => !/ [A-ZÉ][a-zé]+ [A-ZÉ]/.test(' ' + x.t) || /^[A-Z]/.test(x.t)), th.map(x => x.t).slice(0, 4));
    // 20 : à payer
    await X.compta(c, 'fachats', { cat: 'achats' }); const t1 = await X.texte(p, '#contenu .cx-total'); await X.compta(c, 'fournisseurs'); const t2 = await p.evaluate(() => { const k = [...document.querySelectorAll('.cx-kpis4 .kpi')].map(e => e.innerText.replace(/\s+/g, ' ')); return k; });
    const a1 = (t1.match(/à payer\s*([\d\s ,]+)/) || [])[1]; const a2 = (t2.join(' | ').match(/([\d\s\u00a0\u202f,]+)\s*€\s*encore à payer/i) || [])[1];
    v('R20 · « à payer » vaut le même montant en bas des achats et sur Comptes fournisseurs', a1 && a2 && L.cents(a1) === L.cents(a2), { liste: t1, fournisseurs: t2 });
    // l'inverse : après l'enregistrement d'une dépense non payée de 100 € HT à 20 %, « à payer » monte de 120 € des deux côtés
    const dd = await p.evaluate(() => { const a = ACHATS.filter(x => !x.paye).reduce((s, x) => s + cpTTC(x), 0); return Math.round(a * 100); });
    await ouvrirDep(); await p.fill('#dp-h', '100'); await valider(); await X.compta(c, 'fachats', { cat: 'achats' }); const t1b = await X.texte(p, '#contenu .cx-total'); const a1b = (t1b.match(/à payer\s*([\d\s ,]+)/) || [])[1];
    await X.compta(c, 'fournisseurs'); const t2b = await p.evaluate(() => [...document.querySelectorAll('.cx-kpis4 .kpi')].map(e => e.innerText.replace(/\s+/g, ' '))); const a2b = ((t2b.join(' | ').match(/([\d\s\u00a0\u202f,]+)\s*€\s*encore à payer/i)) || [])[1];
    v('R20b · après une dépense non payée de 120 € TTC, les deux « à payer » ont monté de 120 € ensemble', a1b && a2b && L.cents(a1b) === L.cents(a2b) && L.cents(a1b) - L.cents(a1) === 12000, { avant: a1, apres: a1b, fournisseurs: a2b });
    await L.capture(c, X.CAP + `rc-${suf}-fournisseurs.png`);
  }

  if (T.includes('mots')) {
    // ── 07 : les mots d'échafaudage, dans les onglets ET dans les fenêtres qu'ils ouvrent (le correcteur n'a lu que les onglets) ──
    const ECHAF = /prototype|vraie version|pour l.essai|pour essayer|d.exemple|\(exemple\)|fictif|fictive|simul[ée]|non simul|démonstration|dans cette démo|à titre d.exemple|jeu d.essai|en vrai\b|factice|bouchon/i;
    const trouve = t => [...new Set((t.match(new RegExp('[^.\\n]*(' + ECHAF.source + ')[^.\\n]*', 'gi')) || []).map(s => s.trim().slice(0, 170)))];
    const vus = {};
    if (!process.env.ONG) for (const [o, nom] of X.ONGLETS) { await X.compta(c, o, { cat: o === 'fachats' ? 'achats' : o === 'ndf' ? 'ndf' : undefined }); const t = await X.texte(p); const m = trouve(t); vus[nom] = m; v(`R07 · onglet ${nom} : aucun reste d’échafaudage`, m.length === 0, m); }
    // toutes les fenêtres qu'un bouton de l'onglet ouvre : on touche chaque geste d'un onglet dans une page neuve et on lit le panneau
    const ONG = (process.env.ONG || 'fachats,ndf,fournisseurs,paiemois,fiches,salaries,charges,banque,enligne,tva,ecritures,normes,archives,cloture,envoi').split(',');
    let fen = 0; for (const o of ONG) {
      await X.compta(c, o, { cat: o === 'fachats' ? 'achats' : o === 'ndf' ? 'ndf' : undefined }); const liste = await X.marquer(p, '#contenu'); const vusLib = new Set(); const garde = liste.filter(g => !/Envoyer|Verrouill|Supprim|Réinitial/i.test(g.lib || '')).filter(g => { const k = (g.lib || '') + '|' + (g.data || '').replace(/\|[^|]*$/, ''); if (vusLib.has(k)) return false; vusLib.add(k); return true; }).slice(0, 22);
      for (const g of garde) { await X.compta(c, o, { cat: o === 'fachats' ? 'achats' : o === 'ndf' ? 'ndf' : undefined }); await X.marquer(p, '#contenu'); const ok = await L.toucher(c, `[data-sonde="${g.i}"]`, { delai: 2500 }); if (!ok) continue; const pan = await X.panneau(p); const to = await X.toasts(p); const txt = pan + ' ' + to; if (pan) fen++; const m = trouve(txt); if (m.length) v(`R07 · fenêtre « ${(g.lib || g.data).slice(0, 40)} » (${o}) : aucun reste d’échafaudage`, false, m); await L.ranger(p); }
    }
    console.log('fenêtres lues :', fen); v('R07 · population : des fenêtres ont été lues', fen >= 3, fen);
    // la fiche de paie de chaque salarié (l'absence maladie porte une phrase)
    if (process.env.ONG && !process.env.ONG.includes('fiches')) { await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0); }
    await X.compta(c, 'fiches'); await L.toucher(c, '[data-paie="calculer"], [data-paie="calc"]'); const pers = await p.evaluate(() => PT_GENS.slice());
    for (const k of pers) { await p.evaluate(x => { try { paieFiche(x); } catch (e) { try { document.querySelector('[data-paie="fiche|' + x + '"]').click(); } catch (e2) {} } }, k); await p.waitForTimeout(250); const pan = await p.evaluate(() => { const e = document.querySelector('#calque'); return e ? e.innerText : ''; }); const m = trouve(pan);
      v(`R07 · fiche de paie de ${k} : aucun reste d’échafaudage (population ${pan.length} car.)`, pan.length > 100 && m.length === 0, m.length ? m : pan.length); await L.ranger(p); }
  }

  if (T.includes('mise')) {
    // ── 11 + effets de bord du fondu : sur CE profil, chaque tableau qui défile le dit ; les autres n'ont pas de masque ; le texte reste lisible ──
    let pop = 0;
    for (const [o, nom] of [['ecritures', 'Journal'], ['balance', 'Balance'], ['grandlivre', 'Grand livre'], ['resultat', 'Résultat'], ['fiches', 'Fiches de paie'], ['salaries', 'Salariés'], ['fachats', 'Achats'], ['banque', 'Banque'], ['tva', 'TVA'], ['charges', 'Charges']]) {
      await X.compta(c, o, { cat: o === 'fachats' ? 'achats' : undefined }); await L.calme(p, 500);
      const r = await p.evaluate(() => [...document.querySelectorAll('#contenu .cx-liste, #contenu .paie-liste, #contenu .tableau, #contenu .carte, #contenu .defile')].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => {
        const cs = getComputedStyle(e), av = e.scrollLeft; e.scrollLeft = 9999; const ap = e.scrollLeft; e.scrollLeft = av; return { cls: String(e.className).slice(0, 40), reste: e.scrollWidth - e.clientWidth, glisse: ap > 0, masque: cs.maskImage !== 'none' || cs.webkitMaskImage !== 'none', dp: e.classList.contains('d-plus-droite'), dg: e.classList.contains('d-plus-gauche') }; }));
      pop += r.length; for (const x of r) { v(`R11 · ${profil} ${o} : « ${x.cls} » déborde de ${x.reste} px : on peut le glisser ET la page le dit (fondu)`, x.glisse && (x.masque || x.dp), x); }
      // un tableau qui NE déborde PAS ne doit pas porter le fondu (il gommerait la dernière colonne sans raison)
      const faux = await p.evaluate(() => [...document.querySelectorAll('#contenu .cx-liste.d-plus-droite, #contenu .paie-liste.d-plus-droite, #contenu .tableau.d-plus-droite, #contenu .cx-liste.d-plus-gauche, #contenu .paie-liste.d-plus-gauche')].filter(e => e.scrollWidth <= e.clientWidth + 2).map(e => String(e.className).slice(0, 40)));
      v(`R11b · ${profil} ${o} : aucun fondu posé sur un tableau qui ne déborde pas`, faux.length === 0, faux);
      if (r.length) await L.capture(c, X.CAP + `rc-${suf}-${o}.png`);
    }
    console.log('tableaux qui débordent, sur ce profil :', pop);
    // fin de course + retour : le fondu change de côté et revient
    const l1 = await p.evaluate(() => { const l = [...document.querySelectorAll('#contenu .cx-liste, #contenu .paie-liste, #contenu .tableau')].find(e => e.scrollWidth > e.clientWidth + 2); return !!l; });
    if (l1) { const r = await p.evaluate(() => new Promise(ok => { const l = [...document.querySelectorAll('#contenu .cx-liste, #contenu .paie-liste, #contenu .tableau')].find(e => e.scrollWidth > e.clientWidth + 2); l.scrollLeft = 9999; setTimeout(() => { const a = [l.classList.contains('d-plus-droite'), l.classList.contains('d-plus-gauche')]; l.scrollLeft = 0; setTimeout(() => ok({ fin: a, debut: [l.classList.contains('d-plus-droite'), l.classList.contains('d-plus-gauche')] }), 300); }, 300); }));
      v('R11c · en fin de course le fondu passe à gauche, et revient à droite au retour', !r.fin[0] && r.fin[1] && r.debut[0] && !r.debut[1], r); }
    // l'application ne déborde pas elle-même, sur aucun des onglets de la partie
    for (const [o, nom] of X.ONGLETS) { await X.compta(c, o, { cat: o === 'fachats' ? 'achats' : undefined }); const d = await L.deborde(c); if (d && d.px > 2) v(`R-mise · ${profil} ${nom} : la page elle-même ne déborde pas (${d.px} px, ${d.qui || ''})`, false, d); }
  }

  const err = await p.evaluate(() => (window.__erreurs || []).length).catch(() => -1); v('aucune erreur JavaScript levée pendant la passe', c.err.length === 0 && err <= 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message, e.stack && e.stack.split('\n')[1]); process.exit(2); });
