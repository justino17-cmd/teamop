// Restes de cohérence cadre OP COMPTABLE / OP GESTION, 2e tour (18 novembre 2026) — chaque contrôle porte son numéro de point :
//  1  le « Reçu I6 » (argent reçu sur place, avant facture) part au cadre avec les autres encaissements : TVA collectée à 1 centime près (l'arrondi par taux / par paiement est laissé),
//     l'argent entre dans la caisse, le reste est un acompte (419100) ; quand la facture part le reçu est repris, quand le moyen change l'écriture suit.
//  2  un SOLDE DE TVA négatif se dit « Crédit de TVA » (« L'État te doit ») partout où le cadre le montre, jamais « À payer 0,00 € ».
//  3  la paie n'est plus dite « calculée avec les heures validées dans OP GESTION » : la liaison n'envoie pas les heures.
// usage : node compta-restes-coherence-2.js [profil] [qui]      « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v; X.CAP2 = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-compta-2/';
const cts = t => { const m = String(t || '').replace(/[\s  ]/g, '').match(/[−-]?(\d+)(?:,(\d+))?/); return m ? Math.round(parseFloat(m[0].replace('−', '-').replace(',', '.')) * 100) : null; };
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const H = await p.evaluate(() => ({ recus: cpPaieTerrain().map(e => ({ int: e.int, ttc: e.ttc, tva: e.tva, mode: e.mode, fac: e.fac })), nEnc: ENCAISSEMENTS.filter(e => cpOct(e.d)).length, col: Math.round(cpTva().col * 100), envoi: opLiaDonnees().recus.length }));
  v('R0 population : un reçu sur place d’octobre (40 € à 10 %, espèces) et ses encaissements facturés (' + H.nEnc + ')', H.recus.length === 1 && H.recus[0].ttc === 40 && H.recus[0].tva === 10 && H.nEnc >= 10, H);
  v('1a le reçu part au cadre dans les données de la liaison', H.envoi === H.recus.length, H.envoi);
  const f = await X.cadreCompta(c); v('R1 le cadre OP COMPTABLE est ouvert', !!f); await p.waitForTimeout(1200);
  const lit = () => f.evaluate(() => { const A = E.filter(e => e.recuSP && !e.contrePar && e.etat === 'valide'), T = tvaMois('2026-10'); return { actifs: A.map(e => ({ piece: e.piece, cle: e.recuSP, j: e.j, date: e.date, l: e.lignes.map(l => [l.c, l.d, l.cr, l.t ? l.t.taux : null, l.t ? l.t.base : null]), equilibre: equilibre(e) })), contres: E.filter(e => e.contre && E.find(o => o.id === e.contre && o.recuSP)).length, col: Math.round(T.brute * 100), recuApp: !!window.LIA && Array.isArray(LIA.recus) ? LIA.recus.length : -1 }; });
  let K = await lit(); const hot = () => p.evaluate(() => Math.round(cpTva().col * 100));
  v('1b population : une écriture de reçu sur place, validée, dans la comptabilité du cadre (' + K.actifs.length + ')', K.actifs.length === 1, K.actifs);
  const A = K.actifs[0] || { l: [], piece: '' };
  v('1c elle dit : espèces 40 € dans la caisse 530000, acompte 419100 36,36 €, TVA collectée 3,64 € à 10 % (base 36,36 €) — équilibrée', A.equilibre && A.piece === 'Reçu I6' && A.j === 'CA' && JSON.stringify(A.l) === JSON.stringify([['530000', 40, 0, null, null], ['419100', 0, 36.36, null, null], ['445710', 0, 3.64, 10, 36.36]]), A);
  const hCol = await hot(); const ecart = Math.abs(K.col - hCol);
  v('1d TVA collectée : le cadre (' + K.col + ' ct) et OP GESTION (' + hCol + ' ct) ne diffèrent plus que du centime d’arrondi (par paiement / par taux), pas des 3,65 € du reçu', ecart <= 1 && ecart >= 0, { cadre: K.col, hote: hCol });
  await f.evaluate(() => { try { aller('tva'); } catch (e) {} }); await p.waitForTimeout(900);
  const tt = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  const m = /ventes payées ce mois-ci\s*([\d\s  ,]+)\s*€/.exec(tt); v('1e l’écran TVA du cadre montre cette même TVA collectée', !!m && Math.abs(cts(m[1]) - hCol) <= 1, m && m[1]);
  await L.capture(c, X.CAP2 + `${profil}-tva-recu.png`);
  // le moyen de paiement noté change : l'écriture suit (la clé change), l'ancienne est contrepassée
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i6'); fiche('i6').paiement.mode = 'Carte'; rendre(); }); await p.waitForTimeout(900);
  K = await lit(); v('1f contre-épreuve : le moyen noté passe à « Carte » → une seule écriture active, dans 467100, et l’ancienne est contrepassée', K.actifs.length === 1 && K.actifs[0].l[0][0] === '467100' && K.contres === 1, { actifs: K.actifs.map(a => a.l[0]), contres: K.contres });
  await p.evaluate(() => { fiche('i6').paiement.mode = 'Espèces'; rendre(); }); await p.waitForTimeout(900);
  K = await lit(); v('1g retour aux espèces : une écriture active dans la caisse', K.actifs.length === 1 && K.actifs[0].l[0][0] === '530000' && K.contres === 2, { actifs: K.actifs.map(a => a.l[0]), contres: K.contres });
  // la facture part : le reçu devient l'encaissement de la facture, l'écriture d'acompte s'en va
  const F = await p.evaluate(() => { factureDepuis(INTS.find(o => o.id === 'i6')); const f = FACTURES.find(x => x.int === 'i6' && x.num === '—' && x.st !== 'annulee'); if (!f) return null; const ok = envoyerFacture(f, true, true); rendre(); return { ok, num: f.num, recus: opLiaDonnees().recus.length, enc: ENCAISSEMENTS.filter(e => e.int === 'i6').map(e => e.ttc) }; });
  v('1h population : la facture de l’intervention I6 est partie et a repris l’argent (' + JSON.stringify(F) + ')', !!F && F.ok && F.recus === 0 && F.enc.length === 1, F); await p.waitForTimeout(1000);
  K = await lit(); const hCol2 = await hot();
  v('1i le reçu est repris : plus d’écriture d’acompte active (' + K.actifs.length + '), la facture est dans le cadre', K.actifs.length === 0, K.actifs);
  const fac = F && F.num ? await f.evaluate(n => { const x = factureDe(n); return x ? { ttc: x.ttc, recu: oplRecu(n), lettree: !!x.lettree } : null; }, F.num) : null;
  v('1j la facture (103,04 €) est dans le cadre avec les 40 € déjà reçus, pas payée en entier — comme dans OP GESTION', !!fac && fac.ttc === 103.04 && fac.recu === 40 && !fac.lettree, fac);
  v('1k TVA collectée toujours à 2 centimes près (le reçu repris puis le paiement de la facture ne comptent pas deux fois : ' + K.col + ' / ' + hCol2 + ')', Math.abs(K.col - hCol2) <= 2, { cadre: K.col, hote: hCol2 });
  // ── 2 : un solde de TVA négatif se dit « crédit », jamais « à payer 0,00 € » ──
  const vue = async (r, sel) => { await f.evaluate(k => { UI.expert = false; try { aller(k); } catch (e) {} }, r); await p.waitForTimeout(800); return f.evaluate(z => document.querySelector(z || '#contenu').innerText.replace(/\s+/g, ' '), sel); };
  const AVANT = await vue('accueil'), AVANT_PAIE = await vue('paie');   // avant la nuit : c'est là que « Les fiches se calculent… » (liste « À faire ») se lit
  await f.evaluate(() => { try { toutTraiter(); rendre(); } catch (e) {} }); await p.waitForTimeout(900);   // la nuit lue et rangée : c'est ce qui permet d'arrêter la TVA
  const Tz = await f.evaluate(() => { const T = tvaMois('2026-10'); return { due: T.due, credit: T.credit, brute: T.brute, ded: T.ded }; });
  v('2a population : le cadre calcule un CRÉDIT de TVA (achats > ventes) : due 0, crédit > 0 (' + JSON.stringify(Tz) + ')', Tz.due === 0 && Tz.credit > 0, Tz);
  const eurTxt = m => f.evaluate(x => eur(x).replace(/\s/g, ' '), m);   // innerText normalisé : l'espace insécable devient une espace
  const credTxt = await eurTxt(Tz.credit);
  const acc = await vue('accueil');
  v('2b l’accueil dit « Crédit de TVA d’octobre » et la somme (' + credTxt + '), pas « TVA d’octobre 0,00 € »', acc.includes('Crédit de TVA d’octobre ' + credTxt) && !/TVA d’octobre 0,00/.test(acc), acc.slice(acc.indexOf('TVA d’octobre') - 20, acc.indexOf('TVA d’octobre') + 120));
  await L.capture(c, X.CAP2 + `${profil}-accueil-credit.png`);
  const tv = await vue('tva');
  v('2c l’écran TVA dit « Crédit de TVA » + la somme + « l’État te doit », jamais « À payer à l’État »', new RegExp('Crédit de TVA\\s*' + credTxt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(tv) && /l’État te doit/.test(tv) && !/À payer à l’État/.test(tv), tv.slice(0, 500));
  await L.capture(c, X.CAP2 + `${profil}-tva-credit.png`);
  const bd = await f.evaluate(() => { const b = document.querySelector('#tva-auto [data-a="tva-auto"]'); return !!b; });
  v('2d population : le bouton « Arrêter la TVA d’octobre » existe', bd);
  if (bd) { const arret = await f.evaluate(() => { const q = aVerifier; aVerifier = () => []; try { return tvaDeclarer('2026-10'); } finally { aVerifier = q; } });   /* les deux questions de « À vérifier » ne sont pas l'objet : le VRAI arrêt, avec ses écritures */
    v('2d2 l’arrêt de la TVA (vrai chemin, questions mises de côté) réussit', arret === '', arret); await f.evaluate(() => { rendre(); }); await p.waitForTimeout(900);
    const ar = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')); await L.capture(c, X.CAP2 + `${profil}-tva-credit-arretee.png`);
    v('2e après l’arrêt : « Crédit de X », « rien n’est prélevé », aucun « à payer », « Payée » devient « Rien à payer »', new RegExp('Crédit de ' + credTxt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(ar) && /rien n’est prélevé/.test(ar) && !/€ à payer/.test(ar) && /Rien à payer/.test(ar), ar.slice(0, 700));
    const ac2 = await vue('accueil'); v('2f l’accueil, TVA arrêtée, dit toujours le crédit', ac2.includes('Crédit de TVA d’octobre ' + credTxt), ac2.slice(ac2.indexOf('TVA d’octobre') - 20, ac2.indexOf('TVA d’octobre') + 120)); }
  // contre-épreuve : un solde POSITIF se dit « à payer » (on ajoute 6 000 € de TVA collectée au cadre, qui passe au-dessus des achats)
  await f.evaluate(() => { const e = ecr({ j:'OD', date:'2026-10-31', lib:'Essai de la sonde : TVA collectée en plus', etat:'brouillard', l:[['512000', null, 30000, 0], ['706000', null, 0, 25000], ['445710', null, 0, 5000, 'TVA', { taux:20, base:25000 }]] }); valider(e); });
  const T2 = await f.evaluate(() => { const T = tvaMois('2026-10'); return { due: T.due, credit: T.credit }; });
  v('2g contre-épreuve · population : la TVA est maintenant à PAYER (due > 0, crédit 0)', T2.due > 0 && T2.credit === 0, T2);
  await f.evaluate(() => { delete TVA_DECL['2026-10']; });
  const tv2 = await vue('tva');
  v('2h contre-épreuve : avec un solde à payer l’écran garde « À payer à l’État » et ne parle pas de crédit', /À payer à l’État/.test(tv2) && !/Crédit de TVA/.test(tv2) && !/l’État te doit/.test(tv2), tv2.slice(0, 400));
  // ── 3 : plus aucune promesse « les heures validées dans OP GESTION » (la liaison n'envoie pas les heures) ──
  const PROM = /heures? (?:pointées et )?validées dans OP GESTION|reçues d’OP GESTION|heures pointées dans OP GESTION|demandes validées dans OP GESTION|heures d’OP GESTION|heures et les notes de frais d’OP GESTION|heures pointées, corrigées et confirmées|heures supplémentaires et sa prime d’astreinte, relevées dans OP GESTION|heures pointées\)/;
  const TX = await f.evaluate(async () => { const T = []; const dire = n => { T.push([n, document.body.innerText.replace(/\s+/g, ' ')]); };
    for (const mode of [false, true]) for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function' || ['film', 'parcours', 'demo', 'tests'].includes(k)) continue; try { UI.expert = mode; aller(k); await new Promise(r => setTimeout(r, 90)); dire((mode ? 'expert:' : 'simple:') + k); } catch (e) { T.push(['erreur ' + k, String(e)]); } }
    UI.expert = false; try { aller('paie'); ouvrirBulletin('kb'); await new Promise(r => setTimeout(r, 120)); dire('bulletin'); fermerBase(); } catch (e) {}
    try { cmptLecture(); await new Promise(r => setTimeout(r, 120)); dire('lecture'); fermerBase(); } catch (e) {}
    return T; });
  const vues = TX.filter(t => !/^erreur/.test(t[0])).length;
  v('3a population : ' + vues + ' écrans du cadre relus (simples et experts, bulletin, lecture) — au moins 20', vues >= 20, TX.filter(t => /^erreur/.test(t[0])).map(t => t.join(' ')));
  TX.push(['accueil avant la nuit', AVANT], ['paie avant la nuit', AVANT_PAIE]);
  const fautifs = TX.filter(t => PROM.test(t[1])).map(t => t[0] + ' → ' + (PROM.exec(t[1]) || [''])[0]);
  v('3b aucun écran du cadre (mode application) ne promet les heures d’OP GESTION', fautifs.length === 0, fautifs);
  const paieOk = TX.filter(t => /paie/.test(t[0]) && /heures, (?:les )?absences et (?:les )?primes|heures, absences et primes|Heures du mois/.test(t[1])).length;
  v('3c population : la paie dit à la place ce qui est vrai (« les heures, les absences et les primes d’octobre ») sur ' + paieOk + ' écran(s)', paieOk >= 2, paieOk);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
