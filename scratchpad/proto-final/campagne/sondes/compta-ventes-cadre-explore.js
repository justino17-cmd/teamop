// Exploration du CADRE plein écran de la Comptabilité côté ventes : ce que montre « Ventes et encaissements », ce que fait chaque ligne,
// et si les chiffres sont ceux d'OP GESTION. Ne conclut rien : sert à écrire la carte des écrans et les contrôles de la liaison.
// usage : node compta-ventes-cadre-explore.js [profil] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L, v = L.v;
// montant lu dans un texte français (« 3 045,00 € ») -> centimes ; null si rien ne se lit
const cts = t => { const m = String(t || '').replace(/[\s\u00a0\u202f]/g, '').match(/(\d+)(?:,(\d+))?/); return m ? parseInt(m[1], 10) * 100 + Math.round(parseFloat('0.' + (m[2] || '0')) * 100) : null; };
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const f = await X.cadreOuvert(c); v('V0 le cadre de la Comptabilité est ouvert', !!f); if (!f) { await L.fermer(); process.exit(L.bilan() ? 1 : 2); }
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-accueil.png`);
  const gAcc = await L.gestes(f, 'body'); console.log('gestes de l’accueil du cadre :', gAcc.length); v('V1 population : l’accueil du cadre offre des gestes (' + gAcc.length + ')', gAcc.length > 0);
  await f.evaluate(() => { try { aller('ventes'); } catch (e) {} }); await p.waitForTimeout(700);
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-ventes.png`);
  const g = await L.gestes(f, '#contenu'); console.log('gestes de « Ventes et encaissements » :', g.length); g.forEach(x => console.log('  ', x.balise, '|', x.lib, '|', x.data, '|', x.l + '×' + x.h));
  v('V2 population : « Ventes et encaissements » offre des gestes (' + g.length + ')', g.length > 0);
  v('V3 chaque geste porte un nom (' + g.filter(x => !String(x.lib || '').trim()).length + ' sans nom)', g.every(x => String(x.lib || '').trim()));
  const lignes = await f.evaluate(() => [...document.querySelectorAll('#contenu tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
  console.log('lignes :'); lignes.forEach(l => console.log('  ', l));
  const kp = await f.evaluate(() => [...document.querySelectorAll('#contenu .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
  console.log('KPI :', kp);
  const codes = await f.evaluate(() => { const b = [...document.querySelectorAll('#contenu .kpi b')].map(e => e.textContent); return { kpi: b.map(t => [...t].map(ch => ch.charCodeAt(0) > 127 || ch === ' ' ? 'U+' + ch.charCodeAt(0).toString(16) : ch).join('')), eur1475: [...eur(1475)].map(ch => ch.charCodeAt(0).toString(16)).join(' '), eur3045: [...eur(3045)].map(ch => ch.charCodeAt(0).toString(16)).join(' ') }; });
  console.log('CODES :', JSON.stringify(codes));
  const hote = await p.evaluate(() => ({ du: FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0), nb: FACTURES.length }));
  console.log('OP GESTION : à recevoir', hote.du, 'factures', hote.nb);
  // OP GESTION fait foi : on relit ses factures et on compare chaque chiffre du cadre (population comptée avant de croire un zéro)
  const H = await p.evaluate(() => { const a = FACTURES.filter(x => x.num !== '—' && x.st !== 'annulee' && x.st !== 'avoir');
    const n = st => a.filter(x => (Array.isArray(st) ? st : [st]).includes(x.st)).length;
    return { nums: a.map(x => x.num).sort(), reste: Math.round(FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0) * 100),
      enc: Math.round(ENCAISSEMENTS.filter(e => cpOct(e.d)).reduce((s, e) => s + e.ttc, 0) * 100), ht: Math.round(FACTURES.filter(x => cpOct(x.emise) && x.num !== '—').reduce((s, x) => s + (x.st === 'avoir' ? -x.ht : htDe(x)), 0) * 100),
      payees: n('payee'), encaisser: n(['envoyee', 'partielle']), retard: n('retard') }; });
  const rows = await f.evaluate(() => [...document.querySelectorAll('#contenu tr[data-fac]')].map(tr => tr.getAttribute('data-fac')).sort());
  v('V4 population : le cadre liste des factures (' + rows.length + ') et OP GESTION en a ' + H.nums.length, rows.length > 0 && H.nums.length > 0);
  v('V5 le cadre liste exactement les factures d’OP GESTION (mêmes numéros)', JSON.stringify(rows) === JSON.stringify(H.nums), { cadre: rows, hote: H.nums });
  const kpi = k => (kp.find(t => t.toLowerCase().startsWith(k.toLowerCase())) || '');
  v('V6 « Reste à encaisser » du cadre = ce que doivent les clients dans OP GESTION', cts(kpi('Reste à encaisser').replace(/^Reste à encaisser/i, '')) === H.reste, { cadre: kpi('Reste à encaisser'), hote: H.reste });
  v('V7 « Encaissé en octobre » du cadre = les encaissements d’octobre d’OP GESTION', cts(kpi('Encaissé en octobre').replace(/^Encaissé en octobre/i, '')) === H.enc, { cadre: kpi('Encaissé en octobre'), hote: H.enc });
  v('V8 « Facturé en octobre » du cadre = le hors taxes émis en octobre dans OP GESTION', cts(kpi('Facturé en octobre').replace(/^Facturé en octobre/i, '')) === H.ht, { cadre: kpi('Facturé en octobre'), hote: H.ht });
  const pil = await f.evaluate(() => [...document.querySelectorAll('#contenu button[data-cmpt^="vf|"]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  const nb = lib => { const m = pil.find(t => t.startsWith(lib) && /\(\d+\)/.test(t));   /* la tuile « En retard 1 touche pour les voir » commence par le même mot : seul le filtre porte un nombre entre parenthèses */ const r = m && /\((\d+)\)/.exec(m); return r ? +r[1] : null; };
  v('V9 les filtres comptent comme OP GESTION (« À encaisser » du cadre = envoyées + en retard, « Payées » = payées, « Toutes » = leur somme)', nb('Payées') === H.payees && nb('À encaisser') === H.encaisser + H.retard && nb('En retard') === H.retard && nb('Toutes') === H.nums.length && nb('Payées') + nb('À encaisser') === nb('Toutes'), { cadre: pil, hote: { payees: H.payees, envoyees: H.encaisser, retard: H.retard, toutes: H.nums.length } });
  // ── ligne par ligne : TTC, client et état de CHAQUE facture, la tuile « En retard », et ce que montre chaque filtre (2e tour, 18 novembre 2026 : les mutations « TTC +1 », « nom faux »,
  //    « tuile En retard +1 » et « état faux » ne faisaient tomber aucun contrôle — la sonde ne lisait que les numéros et le reste à encaisser) ──
  const HL = await p.evaluate(() => FACTURES.filter(x => x.num !== '—' && x.st !== 'annulee' && x.st !== 'avoir').map(x => ({ num: x.num, nom: CLIENTS[x.cli].nom, ttc: Math.round(ttcDe(x) * 100), st: x.st })));
  const CL = await f.evaluate(() => [...document.querySelectorAll('#contenu tr[data-fac]')].map(tr => { const t = tr.querySelector('td.lt-t'); return { num: tr.getAttribute('data-fac'), nom: t && t.firstChild ? t.firstChild.textContent.trim() : '', ttc: tr.querySelector('td.lt-m') ? tr.querySelector('td.lt-m').innerText : '', etat: (tr.querySelector('td.lt-e .st') || {}).textContent || '' }; }));
  v('V12 population : chaque facture d’OP GESTION a sa ligne dans le cadre, avec un TTC, un client et un état lus (' + CL.length + ' lignes pour ' + HL.length + ' factures)', CL.length === HL.length && CL.length >= 5 && CL.every(l => l.nom && l.etat && cts(l.ttc) != null), CL.slice(0, 2));
  const par = n => HL.find(h => h.num === n) || {};
  const ttcFaux = CL.filter(l => cts(l.ttc) !== par(l.num).ttc).map(l => l.num + ' : ' + l.ttc + ' au lieu de ' + par(l.num).ttc);
  v('V12a le TTC de CHAQUE ligne du cadre = le TTC de la facture dans OP GESTION (au centime)', ttcFaux.length === 0, ttcFaux);
  const nomFaux = CL.filter(l => l.nom !== par(l.num).nom).map(l => l.num + ' : « ' + l.nom + ' » au lieu de « ' + par(l.num).nom + ' »');
  v('V12b le client de CHAQUE ligne du cadre = le client de la facture dans OP GESTION', nomFaux.length === 0, nomFaux);
  const ETAT = { payee: /^Payée ·/, retard: /^En retard/, envoyee: /^À encaisser/, partielle: /^Payée en partie/ };
  const etatFaux = CL.filter(l => !(ETAT[par(l.num).st] || /^$/).test(l.etat)).map(l => l.num + ' : « ' + l.etat + ' » pour une facture « ' + par(l.num).st + ' »');
  v('V12c l’état de CHAQUE ligne du cadre dit ce que dit OP GESTION (payée / à encaisser / en retard / payée en partie) — population : ' + [...new Set(HL.map(h => h.st))].join(', '), etatFaux.length === 0 && new Set(HL.map(h => h.st)).size >= 3, etatFaux);
  const tuileRetard = (kp.find(t => /^En retard/i.test(t)) || '').match(/^En retard\s*(\d+)/i);
  v('V12d la tuile « En retard » du cadre = le nombre de factures en retard d’OP GESTION (' + HL.filter(h => h.st === 'retard').length + ')', !!tuileRetard && +tuileRetard[1] === HL.filter(h => h.st === 'retard').length && HL.filter(h => h.st === 'retard').length >= 1, kp);
  // ── colonnes que les contrôles ci-dessus ne lisaient pas (fusion de la sonde A1b du recontrôle du 18/11, 3e tour) : date d'émission, échéance, relances, moyen et date du paiement, ORDRE des lignes —
  //    comparés facture par facture à l'hôte (6 mutations les visaient : elles SURVIVAIENT toutes à « 20 ✓ »)
  { const HF = await p.evaluate(() => opLiaDonnees().factures.filter(x => x.st !== 'avoir' && x.num !== '—' && x.st !== 'annulee').map(x => ({ num: x.num, emise: x.emise, ech: x.ech, paye: x.paye, mode: x.mode, relances: x.relances, st: x.st })));
    const CR = await f.evaluate(() => { UI.expert = false; UI.vf = 'toutes'; aller('ventes'); return [...document.querySelectorAll('#contenu tr[data-fac]')].map(r => ({ num: r.dataset.fac, t: r.innerText.replace(/\s+/g, ' ') })); }); await p.waitForTimeout(500);
    const dm = i => i ? i.slice(8, 10) + '/' + i.slice(5, 7) + '/' + i.slice(0, 4) : '';
    const err = []; HF.forEach(h => { const r = CR.find(x => x.num === h.num); if (!r) return err.push(h.num + ' absente'); if (!r.t.includes(dm(h.emise))) err.push(h.num + ' date d’émission ' + dm(h.emise) + ' absente de « ' + r.t.slice(0, 90) + ' »');
      if (h.st === 'payee') { if (!r.t.includes('le ' + dm(h.paye))) err.push(h.num + ' date de paiement ' + dm(h.paye)); if (h.mode && !r.t.toLowerCase().includes('payée · ' + h.mode.toLowerCase())) err.push(h.num + ' moyen « ' + h.mode + ' » absent'); }
      else if (h.ech && !r.t.includes('due le ' + dm(h.ech))) err.push(h.num + ' échéance ' + dm(h.ech) + ' absente'); if (h.relances && !new RegExp(h.relances + ' relance').test(r.t)) err.push(h.num + ' relances ' + h.relances + ' absentes'); });
    const ordre = CR.map(x => x.num), tri = HF.filter(h => CR.some(x => x.num === h.num)).sort((a, b) => b.emise.localeCompare(a.emise) || b.num.localeCompare(a.num)).map(h => h.num);
    const pop = { payees: HF.filter(h => h.st === 'payee').length, retard: HF.filter(h => h.st === 'retard').length, relancees: HF.filter(h => h.relances).length, modes: new Set(HF.filter(h => h.st === 'payee').map(h => h.mode)).size };
    v('V13 population : ' + CR.length + ' lignes du cadre pour ' + HF.length + ' factures de l’hôte (' + pop.payees + ' payées, ' + pop.retard + ' en retard, ' + pop.relancees + ' relancée(s), ' + pop.modes + ' moyens)', CR.length >= 8 && HF.length >= 8 && pop.payees >= 2 && pop.retard >= 1 && pop.relancees >= 1 && pop.modes >= 2, pop);
    v('V13a chaque ligne dit la date d’émission, l’échéance (ou la date et le moyen du paiement) et les relances d’OP GESTION : ' + err.length + ' écart(s)', err.length === 0, err.slice(0, 4));
    v('V13b les lignes sont dans l’ordre d’OP GESTION (la plus récente d’abord)', JSON.stringify(ordre) === JSON.stringify(tri), { ordre, tri }); }
  // chaque filtre montre les bonnes factures (pas seulement le bon nombre sur la pastille)
  const filtre = async cle => { await f.evaluate(k => { const b = document.querySelector('#contenu button[data-cmpt="vf|' + k + '"].seg button, #contenu .cmpt-filtres button[data-cmpt="vf|' + k + '"]'); if (b) b.click(); }, cle); await p.waitForTimeout(500); return f.evaluate(() => [...document.querySelectorAll('#contenu tr[data-fac]')].map(tr => tr.getAttribute('data-fac')).sort()); };
  const att = { payees: HL.filter(h => h.st === 'payee'), retard: HL.filter(h => h.st === 'retard'), encaisser: HL.filter(h => ['envoyee', 'partielle', 'retard'].includes(h.st)) };
  for (const k of ['payees', 'retard', 'encaisser']) { const r = await filtre(k), w = att[k].map(h => h.num).sort();
    v('V12e le filtre « ' + k + ' » montre exactement les ' + w.length + ' factures attendues d’OP GESTION', w.length >= 1 && JSON.stringify(r) === JSON.stringify(w), { cadre: r, hote: w }); }
  await filtre('toutes');
  // ouvre la première ligne
  const ligne = await f.$('#contenu tr[data-fac]'); if (ligne) { await ligne.click(); await p.waitForTimeout(700); await L.capture(c, X.CAP + `cadre-${profil}-${qui}-facture.png`);
    const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 700) : ''; }); console.log('panneau :', pan);
    v('V10 la première ligne ouvre le panneau de SA facture', pan.includes(await ligne.getAttribute('data-fac')), pan.slice(0, 120)); }
  else v('V10 une ligne de facture existe pour l’ouvrir', false);
  console.log('erreurs', c.err.slice(0, 5));
  v('V11 aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
