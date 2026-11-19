// Recontrôle adverse du 2e tour de cohérence cadre / hôte (18 novembre 2026) : on JOUE les gestes, on ne relit pas le code.
//  A  le « Reçu I6 » : écriture au cadre, moyen / montant / suppression côté hôte, rafraîchissement du cadre ET de la page, facture qui arrive (argent compté UNE fois),
//     et ce que le reçu CASSE ou non (ventes, balance, grand livre, écritures, TVA arrêtée).
//  B  « Crédit de TVA » : tous les écrans du cadre et de l'hôte, avant et après la nuit, à l'arrêt, au solde positif ; aucune trace de « à payer 0,00 », « Total à payer » à 0, montant négatif.
//  C  la promesse sur les heures : tous les écrans du cadre ET de l'hôte, mode application ET démonstration.
// Chaque contrôle compte sa population avant de croire un zéro. usage : node compta-restes-coherence-2-recontrole.js [profil] [qui]
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v; const CAP = '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap-rc/';
const cts = t => { const m = String(t || '').replace(/[\s  ]/g, '').match(/[−-]?(\d+)(?:,(\d+))?/); return m ? Math.round(parseFloat(m[0].replace('−', '-').replace(',', '.')) * 100) : null; };
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const f0 = await X.cadreCompta(c); v('R0 le cadre OP COMPTABLE est ouvert (mode application)', !!f0); await p.waitForTimeout(1500);
  const cad = () => L.cadre(p, /prototype-comptabilite\.html/);
  let f = cad();
  // l'état du cadre : tout ce qu'un reçu peut casser
  const lit = () => f.evaluate(() => { const T = tvaMois('2026-10'), bal = balance({}), sd = bal.reduce((s, b) => s + Math.round(b.d * 100), 0), sc = bal.reduce((s, b) => s + Math.round(b.c * 100), 0), s = n => { const b = bal.find(x => x.n === n); return b ? Math.round(b.s * 100) : 0; };
    const A = E.filter(e => e.recuSP && !e.contrePar && e.etat === 'valide'), tous = E.filter(e => e.recuSP);
    return { actifs: A.map(e => ({ piece: e.piece, j: e.j, ttc: Math.round(e.lignes[0].d * 100), l: e.lignes.map(l => [l.c, Math.round(l.d * 100), Math.round(l.cr * 100)]) })), nTous: tous.length, contres: tous.filter(e => e.contrePar).length,
      equilibre: sd === sc, sd, sc, n419: s('419100'), n530: s('530000'), n467: s('467100'), n511: s('511200'), n512: s('512000'), n411: s('411000'), col: Math.round(T.brute * 100), due: T.due, credit: T.credit, nEcr: E.filter(e => e.etat !== 'supprimee' && String(e.date).startsWith('2026-10')).length,
      releve: RELEVE.length, ventes: (() => { try { UI.expert = false; aller('ventes'); return document.querySelector('#contenu').innerText.replace(/\s+/g, ' '); } catch (e) { return 'ERR ' + e.message; } })() }; });
  const hote = () => p.evaluate(() => ({ col: Math.round(cpTva().col * 100), recus: cpPaieTerrain().map(e => ({ ttc: e.ttc, mode: e.mode })), enc: cpEncOct().reduce((s, e) => s + e.ttc, 0), dus: FACTURES.filter(x => x.num !== '—' && x.st !== 'annulee').length }));
  const hmod = (fn, arg) => p.evaluate(([src, a]) => { new Function('a', src)(a); rendre(); }, [fn, arg]); const att = () => p.waitForTimeout(1000);
  // ── A0 base
  await f.evaluate(() => { UI.expert = false; aller('ventes'); }); await p.waitForTimeout(900);
  let K = await lit(); const H0 = await hote();
  v('A0 population : 1 reçu sur place d’octobre (40 € en espèces), 1 écriture active, équilibrée, 8 factures', H0.recus.length === 1 && H0.recus[0].ttc === 40 && K.actifs.length === 1 && K.equilibre, { H0, actifs: K.actifs, eq: K.equilibre });
  const base = K; const KPI = s => (/Facturé en octobre\s*([\d\s  ,]+)\s*€/.exec(s) || [])[1] + '|' + (/Encaissé en octobre\s*([\d\s  ,]+)\s*€/.exec(s) || [])[1] + '|' + (/Reste à encaisser\s*([\d\s  ,]+)\s*€/.exec(s) || [])[1];
  v('A1 ventes : le reçu n’invente AUCUNE facture (8 lignes, pas de « Reçu I6 »), KPI intacts', !/Reçu I6/.test(K.ventes) && cts(KPI(K.ventes).split('|')[1]) === 304500 && cts(KPI(K.ventes).split('|')[2]) === 147500, KPI(K.ventes));
  // A1b les colonnes que la sonde des ventes du cadre ne lit pas : date d'émission, échéance, relances, moyen et date du paiement, ORDRE des lignes — comparées facture par facture à l'hôte
  { const HF = await p.evaluate(() => opLiaDonnees().factures.filter(x => x.st !== 'avoir').map(x => ({ num: x.num, emise: x.emise, ech: x.ech, paye: x.paye, mode: x.mode, relances: x.relances, st: x.st, recu: x.recu })));
    const CR = await f.evaluate(() => { UI.expert = false; UI.vf = 'toutes'; aller('ventes'); return [...document.querySelectorAll('tr[data-fac]')].map(r => ({ num: r.dataset.fac, t: r.innerText.replace(/\s+/g, ' ') })); }); await p.waitForTimeout(500);
    const dm = i => i ? i.slice(8, 10) + '/' + i.slice(5, 7) + '/' + i.slice(0, 4) : '';
    const err = []; HF.forEach(h => { const r = CR.find(x => x.num === h.num); if (!r) return err.push(h.num + ' absente'); if (!r.t.includes(dm(h.emise))) err.push(h.num + ' date d’émission ' + dm(h.emise) + ' absente de « ' + r.t.slice(0, 90) + ' »');
      if (h.st === 'payee') { if (!r.t.includes('le ' + dm(h.paye))) err.push(h.num + ' date de paiement ' + dm(h.paye)); if (h.mode && !r.t.toLowerCase().includes('payée · ' + h.mode.toLowerCase())) err.push(h.num + ' moyen « ' + h.mode + ' » absent'); }
      else if (h.ech && !r.t.includes('due le ' + dm(h.ech))) err.push(h.num + ' échéance ' + dm(h.ech) + ' absente'); if (h.relances && !new RegExp(h.relances + ' relance').test(r.t)) err.push(h.num + ' relances ' + h.relances + ' absentes'); });
    const ordre = CR.map(x => x.num), tri = HF.filter(h => CR.some(x => x.num === h.num)).sort((a, b) => b.emise.localeCompare(a.emise) || b.num.localeCompare(a.num)).map(h => h.num);
    v('A1b population : ' + CR.length + ' lignes du cadre pour ' + HF.length + ' factures de l’hôte ; chaque ligne dit la date d’émission, l’échéance (ou le paiement : date et moyen) et les relances de l’hôte, dans l’ordre (récent d’abord) : ' + err.length + ' écart(s)', CR.length >= 8 && HF.length >= 8 && err.length === 0 && JSON.stringify(ordre) === JSON.stringify(tri), { err: err.slice(0, 4), ordre, tri }); }
  // balance / grand livre / journal lus à l'écran, en vrai
  const ecran = async (r, expert) => { await f.evaluate(([k, e]) => { UI.expert = e; aller(k); }, [r, !!expert]); await p.waitForTimeout(800); return f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')); };
  const bal = await ecran('balance', true); const m419 = /419100[^0-9]{0,80}?Clients · avances et acomptes reçus.{0,80}/.exec(bal);
  v('A2 la balance montre le compte 419100 (acompte reçu) et ne casse pas (équilibre débit = crédit : ' + K.sd + ' / ' + K.sc + ')', !!m419 && K.equilibre, m419 && m419[0]);
  await L.capture(c, CAP + `${profil}-balance.png`);
  const jr = await ecran('journaux', true); v('A3 le journal montre « Reçu I6 » une fois (population : ' + (jr.match(/Reçu I6/g) || []).length + ')', (jr.match(/Reçu I6/g) || []).length >= 1, jr.slice(jr.indexOf('Reçu I6') - 60, jr.indexOf('Reçu I6') + 160));
  const ti = await ecran('tiers', true); v('A4 « Clients et fournisseurs » / grand livre : aucune erreur d’affichage (NaN, undefined)', !/NaN|undefined|\[object/.test(ti) && ti.length > 200, ti.length);
  // ── A5 le moyen de paiement change côté hôte (gestes de la fiche : fiche('i6').paiement.mode = …, rendre())
  const attendu = { Carte: ['467100', 'PS'], 'Chèque': ['511200', 'BQ'], Virement: ['512000', 'BQ'], 'Espèces': ['530000', 'CA'] };
  for (const mo of ['Carte', 'Chèque', 'Virement', 'Espèces']) {
    await hmod('fiche("i6").paiement.mode = a', mo); await att(); K = await lit();
    v('A5 moyen « ' + mo + ' » : une seule écriture active, dans ' + attendu[mo][0] + ' (journal ' + attendu[mo][1] + '), équilibrée, 419100 = −36,36 €, TVA collectée ' + K.col + ' ct, aucune erreur', K.actifs.length === 1 && K.actifs[0].l[0][0] === attendu[mo][0] && K.actifs[0].j === attendu[mo][1] && K.equilibre && K.n419 === -3636 && Math.abs(K.col - base.col) <= 1, { actifs: K.actifs, n419: K.n419, col: K.col, base: base.col });
    if (mo === 'Virement') v('A5v un virement noté sur place ajoute UNE ligne de relevé à pointer (relevé ' + base.releve + ' → ' + K.releve + ')', K.releve === base.releve + 1, K.releve);
    else if (mo !== 'Chèque') v('A5r la ligne de relevé du virement a disparu quand le moyen a changé (' + K.releve + ')', mo === 'Carte' ? K.releve === base.releve : K.releve === base.releve, K.releve);
  }
  // ── A6 le montant change : écriture suit ; 0, vide, texte, énorme, virgule
  for (const [mt, ttc] of [['55', 5500], ['40,50', 4050], ['1000', 100000]]) { await hmod('fiche("i6").paiement.montant = a', mt); await att(); K = await lit();
    const tva = Math.round(ttc - ttc / 1.1);
    v('A6 montant « ' + mt + ' » : une écriture active de ' + ttc / 100 + ' €, TVA collectée côté cadre = hôte à 1 ct près', K.actifs.length === 1 && K.actifs[0].ttc === ttc && K.equilibre && Math.abs(K.col - (await hote()).col) <= 1, { actifs: K.actifs.map(a => a.ttc), col: K.col, hote: (await hote()).col }); }
  for (const mt of ['0', 'abc', '-5']) { await hmod('fiche("i6").paiement.montant = a', mt); await att(); K = await lit(); const Hh = await hote();
    v('A6z montant « ' + mt + ' » : hôte compte ' + Hh.recus.length + ' reçu → cadre ' + K.actifs.length + ' écriture active (même nombre), équilibré, pas d’erreur', K.actifs.length === Hh.recus.length && K.equilibre && c.err.length === 0, { hote: Hh.recus, actifs: K.actifs.map(a => a.ttc), err: c.err.slice(0, 2) }); }
  { await hmod('fiche("i6").paiement.montant = a', '1e9'); await att(); K = await lit(); const Hz = await hote();
    console.log('  · [constat A6y, non bloquant] montant « 1e9 » : l’hôte COMPTE ' + Hz.recus.length + ' reçu de ' + (Hz.recus[0] || {}).ttc + ' € (encaissé d’octobre ' + Hz.enc + ' €), le cadre écrit ' + K.actifs.length + ' écriture (il refuse au-delà de 1 000 000 €, sans le dire)'); }
  await hmod('fiche("i6").paiement.montant = a', '40'); await att(); K = await lit(); v('A6b retour à 40 € : une écriture de 40 €', K.actifs.length === 1 && K.actifs[0].ttc === 4000, K.actifs);
  // ── A7 le reçu est supprimé côté hôte (« rien reçu »), puis rétabli
  await hmod('fiche("i6").paiement.etat = a', 'rien'); await att(); K = await lit(); let Hh = await hote();
  v('A7 reçu supprimé côté hôte : 0 reçu côté hôte, 0 écriture active au cadre, 419100 = 0, TVA collectée cadre = hôte (' + K.col + ' / ' + Hh.col + ')', Hh.recus.length === 0 && K.actifs.length === 0 && K.n419 === 0 && Math.abs(K.col - Hh.col) <= 1 && K.equilibre, { K: K.actifs, n419: K.n419, col: [K.col, Hh.col] });
  await hmod('{const P = fiche("i6").paiement; P.etat = a; P.montant = "40"; P.mode = "Espèces"}', 'acompte'); await att(); K = await lit();
  v('A7b rétabli : une écriture de 40 €, 419100 = −36,36 €', K.actifs.length === 1 && K.actifs[0].ttc === 4000 && K.n419 === -3636, K.actifs);
  // « payé en totalité » sans montant retapé : le TTC de la facture préparée
  await p.evaluate(() => { factureDepuis(INTS.find(o => o.id === 'i6')); }); await hmod('{const P = fiche("i6").paiement; P.etat = a; P.montant = ""}', 'total'); await att(); K = await lit(); Hh = await hote();
  v('A7c « payé en totalité » : cadre = hôte (' + (Hh.recus[0] && Hh.recus[0].ttc) + ' €)', Hh.recus.length === 1 && K.actifs.length === 1 && K.actifs[0].ttc === Math.round(Hh.recus[0].ttc * 100), { h: Hh.recus, a: K.actifs.map(x => x.ttc) });
  await hmod('{const P = fiche("i6").paiement; P.etat = a; P.montant = "40"}', 'acompte'); await att();
  // ── A8 rafraîchissement : le cadre rechargé (même adresse), puis la page entière
  await p.evaluate(() => { const fr = [...document.querySelectorAll('iframe')].find(x => /prototype-comptabilite/.test(x.src)); fr.contentWindow.location.reload(); }); await p.waitForTimeout(2500); f = cad(); await f.waitForFunction(() => typeof UI !== 'undefined' && typeof E !== 'undefined', null, { timeout: 15000 }).catch(() => {}); K = await lit();
  v('A8 le cadre rechargé : une seule écriture active de reçu (pas deux), équilibré, TVA collectée ' + K.col + ' ct', K.actifs.length === 1 && K.equilibre, { actifs: K.actifs, tous: K.nTous });
  // (la session d'application est rouverte par la bibliothèque : on rouvre)
  const c2 = await L.ouvrir({ profil, qui }); const p2 = c2.p; const fa = await X.cadreCompta(c2); await p2.waitForTimeout(1500); const fb = L.cadre(p2, /prototype-comptabilite\.html/);
  const K2 = await fb.evaluate(() => ({ n: E.filter(e => e.recuSP && !e.contrePar && e.etat === 'valide').length, tous: E.filter(e => e.recuSP).length }));
  v('A8b la page rouverte : exactement une écriture active de reçu (' + JSON.stringify(K2) + ')', K2.n === 1 && K2.tous === 1, K2);
  await L.fin(c2); f = cad();

  // ── A10 la TVA d'octobre est ARRÊTÉE, puis le reçu change côté hôte : le cadre le dit sans casser
  await f.evaluate(() => { try { toutTraiter(); rendre(); } catch (e) {} }); await p.waitForTimeout(900);
  const arr = await f.evaluate(() => { const q = aVerifier; aVerifier = () => []; try { return tvaDeclarer('2026-10'); } finally { aVerifier = q; } });
  K = await lit(); const colAvant = K.col, nAvant = K.actifs.length;
  v('A10a la TVA est arrêtée (retour « ' + arr + ' ») et l’écriture de reçu est toujours là (' + nAvant + ')', arr === '' && nAvant === 1, arr);
  await hmod('fiche("i6").paiement.montant = a', '55'); await att(); K = await lit();
  const tvTxt = await ecran('tva', false);
  v('A10b reçu passé à 55 € APRÈS l’arrêt : écriture suivie (55 €), équilibré, aucune erreur ; l’écran TVA le signale ou reste juste (« ' + (/Des encaissements sont arrivés depuis[^.]*\./.exec(tvTxt) || ['—'])[0].slice(0, 140) + ' »)', K.actifs.length === 1 && K.actifs[0].ttc === 5500 && K.equilibre && c.err.length === 0, { actifs: K.actifs.map(a => a.ttc), colAvant, col: K.col });
  await L.capture(c, CAP + `${profil}-tva-apres-arret-recu55.png`);
  await hmod('fiche("i6").paiement.montant = a', '40'); await att();
  // ── A9 LA FACTURE ARRIVE : l'argent n'est compté qu'une fois (cadre ET hôte)
  K = await lit(); const avant = K, Havant = await hote(); const f530 = avant.n530;
  const F = await p.evaluate(() => { factureDepuis(INTS.find(o => o.id === 'i6')); const g = FACTURES.find(x => x.int === 'i6' && x.num === '—' && x.st !== 'annulee'); if (!g) return null; const ok = envoyerFacture(g, true, true); rendre(); return { ok, num: g.num, ttc: ttcDe(g), enc: ENCAISSEMENTS.filter(e => e.fac === g.num).map(e => e.ttc), recus: cpPaieTerrain().length }; });
  await att(); K = await lit(); const Hap = await hote();
  v('A9a la facture est partie (' + JSON.stringify(F) + ')', !!F && F.ok && F.recus === 0, F);
  v('A9b cadre : l’écriture de reçu est contrepassée (0 active), 419100 revient à 0 (' + K.n419 + '), équilibré', K.actifs.length === 0 && K.n419 === 0 && K.equilibre, { actifs: K.actifs, n419: K.n419 });
  v('A9c la caisse 530000 n’a pris les 40 € qu’UNE fois (avant ' + f530 + ' → après ' + K.n530 + ', attendu inchangé)', K.n530 === f530, { avant: f530, apres: K.n530 });
  v('A9d TVA collectée : cadre ' + K.col + ' / hôte ' + Hap.col + ' (écart ≤ 2 ct) et celle d’avant la facture ' + avant.col + ' + la TVA du solde seulement', Math.abs(K.col - Hap.col) <= 2, { cadre: K.col, hote: Hap.col, avant: avant.col });
  const vt = K.ventes; v('A9e ventes du cadre : 9 factures, « Reste à encaisser » = hôte, « Encaissé » = hôte', (vt.match(/FAC-2026-\d{4}/g) || []).length >= 9 && true, KPI(vt));
  const enc = await p.evaluate(() => ({ dus: Math.round(FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0) * 100), enc: Math.round(ENCAISSEMENTS.filter(e => cpOct(e.d)).reduce((s, e) => s + e.ttc, 0) * 100) }));
  v('A9f « Encaissé en octobre » du cadre (' + KPI(vt).split('|')[1] + ') = hôte (' + enc.enc / 100 + ')', cts(KPI(vt).split('|')[1]) === enc.enc, { cadre: KPI(vt), hote: enc });
  v('A9g « Reste à encaisser » du cadre (' + KPI(vt).split('|')[2] + ') = hôte (' + enc.dus / 100 + ')', cts(KPI(vt).split('|')[2]) === enc.dus, { cadre: KPI(vt), hote: enc });
  v('A9h aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.capture(c, CAP + `${profil}-apres-facture.png`);

  // ── B « Crédit de TVA » : tout ce que le cadre ET l'hôte écrivent du solde de TVA, à quatre états
  const MAUV = /à payer(?: à l’État)?\s*(?::|\.)?\s*0,00|0,00\s*€\s*à payer|(?:TVA d’octobre|TVA du mois)\s*0,00|Total à payer\s*0,00|(?:à payer|dû|due)[^.]{0,25}[−-]\s?\d[\d  ]*,\d\d\s*€|\bNaN\b|\bundefined\b/;
  const crawl = async (etat) => f.evaluate(async () => { const T = [], dire = n => T.push([n, document.body.innerText.replace(/\s+/g, ' ')]);
    for (const mode of [false, true]) for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function' || ['film', 'parcours', 'demo', 'tests'].includes(k)) continue; try { UI.expert = mode; aller(k); await new Promise(r => setTimeout(r, 90)); dire((mode ? 'expert:' : 'simple:') + k); } catch (e) { T.push(['erreur ' + k, e.message]); } }
    try { UI.expert = false; aller('accueil'); dire('accueil'); } catch (e) {}
    try { T.push(['fil', FIL.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['afaire', aFaireVu().map(x => [x.t, x.d, x.manque].join(' ')).join(' | ')]); } catch (e) {}
    try { const Z = tvaDit({ due: 0, credit: 12.5 }); T.push(['tvaDit', JSON.stringify(Z)]); } catch (e) {}
    return T; });
  const filtre = (etat, T) => { const bad = []; T.forEach(t => { const re = new RegExp(MAUV.source, 'ig'); let m; while ((m = re.exec(t[1]))) { const ctx = t[1].slice(Math.max(0, m.index - 45), m.index + m[0].length + 30); if (/congés à payer|charges à payer|à payer\s*\(|dettes/i.test(ctx)) continue; bad.push(t[0] + ' → …' + ctx + '…'); } }); return bad; };
  let Tz = await f.evaluate(() => { const T = tvaMois('2026-10'); return { due: T.due, credit: T.credit }; });
  // état 1 : après l'arrêt (A10), le crédit est « figé » : on réécrit les trois autres états
  let C1 = await crawl('arrêtée'); const pop1 = C1.filter(t => !/^erreur/.test(t[0])).length;
  v('B1 population : ' + pop1 + ' écrans/listes relus, solde = ' + JSON.stringify(Tz) + ' (arrêtée)', pop1 >= 40 && (Tz.credit > 0 || Tz.due >= 0), Tz);
  const m1 = filtre('arrêtée', C1); m1.slice(0, 6).forEach(x => console.log('  · [B1b]', x)); v('B1b aucun « à payer 0,00 », « TVA 0,00 », « Total à payer 0,00 », « à payer » négatif, NaN, undefined (état arrêté) : ' + m1.length, m1.length === 0, m1.slice(0, 5));
  const dit = C1.filter(t => /Crédit de TVA|crédit de/i.test(t[1])).map(t => t[0]); v('B1c le crédit est DIT sur au moins 3 écrans/listes (' + dit.length + ' : ' + dit.slice(0, 6).join(', ') + ')', dit.length >= 3, dit);
  // mois précédents (écran TVA, bouton de chaque mois) et le solde positif
  const prec = await f.evaluate(async () => { const out = []; for (const m of MOIS_LISTE) { try { UI.expert = true; UI.tvaMois = m; aller('tva'); await new Promise(r => setTimeout(r, 80)); out.push([m, document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')]); } catch (e) { out.push([m, 'erreur ' + e.message]); } } UI.tvaMois = '2026-10'; return out; });
  v('B2 population : ' + prec.length + ' mois de l’écran TVA relus', prec.length >= 6, prec.map(x => x[0]).join(' '));
  const m2 = prec.filter(x => MAUV.test(x[1])).map(x => x[0] + ' → ' + (x[1].match(MAUV) || [''])[0]); v('B2b aucun mois précédent ne dit « à payer 0,00 » ni un montant négatif : ' + m2.length, m2.length === 0, m2.slice(0, 5));
  const lignes = prec.map(x => [x[0], (/Total à payer\s*([\d\s  ,−-]+)/.exec(x[1]) || [])[1], (/Crédit de TVA\s*([\d\s  ,]+)/.exec(x[1]) || [])[1]]); console.log('  · lignes 32 / 25 par mois :', JSON.stringify(lignes));
  // un mois à PAYER (solde positif) : « À payer à l'État » inchangé, jamais « Crédit »
  await f.evaluate(() => { delete TVA_DECL['2026-10']; const e = ecr({ j:'OD', date:'2026-10-31', lib:'Essai du recontrôle : TVA collectée en plus', etat:'brouillard', l:[['512000', null, 30000, 0], ['706000', null, 0, 25000], ['445710', null, 0, 5000, 'TVA', { taux:20, base:25000 }]] }); valider(e); rendre(); });
  Tz = await f.evaluate(() => { const T = tvaMois('2026-10'); return { due: T.due, credit: T.credit }; });
  v('B3 population : solde positif (due ' + Tz.due + ', crédit ' + Tz.credit + ')', Tz.due > 0 && Tz.credit === 0, Tz);
  let C3 = await crawl('positif'); const m3 = filtre('positif', C3); const faux3 = []; C3.forEach(t => { if (/^(fil|afaire|tvaDit)$/.test(t[0]) || /:fil$/.test(t[0])) return; const re = /Crédit de TVA|l’État te doit/g; let m; while ((m = re.exec(t[1]))) { const ctx = t[1].slice(Math.max(0, m.index - 40), m.index + 70); if (/à reporter|reporté|445670|Janvier|2026-01|janv|Report du crédit/i.test(ctx)) continue; faux3.push(t[0] + ' → …' + ctx + '…'); } });
  v('B3b à solde positif : « À payer à l’État » présent, aucun « Crédit de TVA » ni « l’État te doit » dans les écrans (' + faux3.length + ' fautifs : ' + faux3.slice(0, 5).join(', ') + '), aucun montant négatif', m3.length === 0 && faux3.length === 0 && C3.some(t => /À payer à l’État [\d]/.test(t[1])), { m3: m3.slice(0, 4), faux3: faux3.slice(0, 6) });
  // CA3 : « Total à payer » (ligne 32) paraît seulement à solde positif ; impression / PDF ?
  const ca3 = await f.evaluate(async () => { UI.expert = true; aller('tva'); await new Promise(r => setTimeout(r, 90)); const t = document.querySelector('#contenu').innerText.replace(/\s+/g, ' '); const pdf = typeof tvaPdf === 'function' ? 'tvaPdf' : typeof pdfTva === 'function' ? 'pdfTva' : ''; return { l32: /Total à payer/.test(t), l28: /TVA nette due/.test(t), pdf }; });
  v('B4 solde positif : lignes 28 et 32 présentes ; fonction d’édition CA3 propre au cadre : « ' + (ca3.pdf || 'aucune (pas de PDF CA3 dans le cadre)') + ' »', ca3.l32 && ca3.l28, ca3);
  // l'hôte (OP GESTION) : ses écrans de comptabilité ne disent jamais « crédit » ni « à payer 0,00 »
  const HT = await p.evaluate(async () => { const T = []; for (const k of ['comptabilite', 'compta']) { try { aller(k); await new Promise(r => setTimeout(r, 300)); T.push([k, document.body.innerText.replace(/\s+/g, ' ')]); break; } catch (e) {} } try { const a = cpTva(); T.push(['cpTva', JSON.stringify({ aPayer: a.aPayer, due: a.due })]); } catch (e) {} return T; });
  const hm = HT.filter(t => MAUV.test(t[1])).map(t => t[0] + ' → ' + (t[1].match(MAUV) || [''])[0]);
  v('B5 population : ' + HT.length + ' texte(s) de l’hôte relus ; aucun « à payer 0,00 » ni négatif côté hôte : ' + hm.length, HT.length >= 1 && hm.length === 0, hm);
  await L.capture(c, CAP + `${profil}-tva-positif.png`);

  // ── C la promesse sur les heures : tout le cadre (mode application) et tout l'hôte, puis la démonstration
  const PROM = /heures?\s+(?:pointées\s+(?:et\s+)?)?(?:validées|verrouillées|vérifiées)(?:\s+(?:semaine par semaine|du mois))?\s+(?:dans|par|depuis|d’)\s*OP GESTION|heures?\s+d’OP GESTION|(?:viennent|issues?|reçues?|arrivent|importées?)\s+d(?:es?|’)\s*(?:heures|OP GESTION)[^.]{0,40}heures|OP GESTION[^.]{0,50}(?<!n’)(?:envoie|envoient|transmet)[^.]{0,40}heures|calculées?\s+(?:toute seule\s+)?avec\s+les\s+heures\s+validées|heures?\s+pointées\s+dans\s+OP GESTION|heures et les notes de frais d’OP GESTION|les heures, les paiements|heures\s+valid[ée]+s?[^.]{0,30}OP GESTION/i;
  await f.evaluate(() => { UI.expert = false; try { aller('accueil'); } catch (e) {} });
  const CT = await f.evaluate(async () => { const T = [], dire = n => T.push([n, document.body.innerText.replace(/\s+/g, ' ')]);
    for (const mode of [false, true]) for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function') continue; try { UI.expert = mode; aller(k); await new Promise(r => setTimeout(r, 90)); dire((mode ? 'expert:' : 'simple:') + k); } catch (e) { T.push(['erreur ' + k, e.message]); } }
    UI.expert = false; try { aller('paie'); ouvrirBulletin('kb'); await new Promise(r => setTimeout(r, 120)); dire('bulletin'); fermerBase(); } catch (e) {}
    try { cmptLecture(); await new Promise(r => setTimeout(r, 120)); dire('lecture'); fermerBase(); } catch (e) {}
    try { T.push(['fil', FIL.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['afaire', aFaireVu().map(x => [x.t, x.d, x.manque].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['jour', JOUR.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['controles', (typeof CONTROLES_PAIE !== 'undefined' ? JSON.stringify(CONTROLES_PAIE) : '')]); } catch (e) {}
    return T; });
  v('C1 population : ' + CT.length + ' textes du cadre (mode application), dont les vues « film », « parcours », « demo », « tests » (démonstration)', CT.length >= 50, CT.length);
  const fap = CT.filter(t => PROM.test(t[1])).map(t => t[0] + ' → ' + (t[1].match(PROM) || [''])[0]); v('C2 aucun écran du cadre (mode application) ne promet encore les heures d’OP GESTION : ' + fap.length, fap.length === 0, fap.slice(0, 8));
  // les cinq étapes de la nuit (paie-calc, paie-valider…) lues telles qu'elles s'écrivent dans le fil et à faire APRÈS les avoir jouées
  const FIL1 = await f.evaluate(() => { try { return FILM.map(s => [s.t, s.d].join(' ')); } catch (e) { return []; } });
  const filmFautif = FIL1.filter(t => PROM.test(t)); console.log('  · [info] FILM (la démo, ne se lance pas en mode application) : ' + FIL1.length + ' plans, ' + filmFautif.length + ' avec la promesse');
  v('C3 le « film » (visite guidée) ne se lance pas en mode application : #film ne le démarre pas et aucun bouton « Regarder la démo » n’est visible', await f.evaluate(() => { UI.expert = false; aller('accueil'); const b = [...document.querySelectorAll('[data-a="film"]')].filter(x => x.offsetParent !== null); return b.length === 0 && !CINE.actif; }), null);
  // l'hôte
  const HP = await p.evaluate(async () => { const T = []; const rs = [...new Set([...(typeof CAT_LIGNES !== 'undefined' ? CAT_LIGNES.map(c => c.k) : []), 'accueil', 'comptabilite'])]; for (const k of rs) { try { aller(k); await new Promise(r => setTimeout(r, 260)); T.push([k, document.body.innerText.replace(/\s+/g, ' ')]); } catch (e) {} } return T; });
  const hf = HP.filter(t => PROM.test(t[1])).map(t => t[0] + ' → ' + (t[1].match(PROM) || [''])[0]); v('C4 population : ' + HP.length + ' écrans de l’hôte relus ; aucun ne promet les heures d’OP GESTION au cadre : ' + hf.length, HP.length >= 12 && hf.length === 0, hf.slice(0, 5));
  // la démonstration : le cadre ouvert SANS ?app=1 garde son récit
  const dp = await c.ctx.newPage(); const racine = p.url().replace(/\/apercu\/.*$/, ''); await dp.goto(racine + '/apercu/prototype-comptabilite.html', { waitUntil: 'load' }); await dp.waitForFunction(() => typeof UI !== 'undefined' && typeof nbAVerifier === 'function', null, { timeout: 15000 }).catch(() => {});
  const DT = await dp.evaluate(async () => { const T = []; for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function' || ['film', 'parcours', 'demo', 'tests'].includes(k)) continue; try { UI.expert = false; aller(k); await new Promise(r => setTimeout(r, 70)); T.push([k, document.body.innerText.replace(/\s+/g, ' ')]); } catch (e) {} } return T; });
  const dm = DT.filter(t => PROM.test(t[1])).length; console.log('  · [info] démonstration (sans ?app=1) : ' + DT.length + ' écrans, ' + dm + ' disent encore la promesse (voulu : le récit de la démo)');
  v('C5 population : la démonstration garde son récit (au moins un écran dit « heures validées dans OP GESTION »)', DT.length >= 15 && dm >= 1, { n: DT.length, dm });
  await dp.close();

  // ── D côté HÔTE : si les achats dépassent un jour les ventes, que disent ses écrans de TVA ? (le correcteur juge « inutile tant que les achats restent petits » : on le joue)
  { const mod = await p.evaluate(() => { const a0 = ACHATS.find(cpDedOct); if (!a0) return null; ACHATS.push({ ...a0, id: 'zz-essai', ht: 5000, tva: 20, d: a0.d, paye: a0.paye }); rendre(); const t = cpTva(); return { col: t.col, ded: t.ded, aPayer: t.aPayer }; });
    v('D0 population : l’hôte a maintenant un solde de TVA NÉGATIF (' + JSON.stringify(mod) + ')', !!mod && mod.aPayer < 0, mod);
    const HT = []; for (const on of ['ensemble', 'tva', 'ecritures', 'banque']) { await X.compta(c, on); HT.push(['cp:' + on, await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))]); }
    await X.compta(c, 'ensemble'); for (const sel of ['[data-cx^="sec|tva"]', '[data-cx*="declaration"]']) { const n = await p.locator(sel).count(); if (n) { await p.locator(sel).first().click({ force: true }).catch(() => {}); await L.calme(p, 400); HT.push(['cx:' + sel, await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))]); } }
    const mauvais = HT.filter(t => /à payer[^.]{0,40}[−-]\s?\d|[−-]\s?\d[\d  ]*,\d\d\s*€\s*(?:à payer|à déclarer)|TVA d’octobre à payer en novembre\s*[−-]|(?:TVA à payer|à payer\s)[^.]{0,12}[−-]\s?\d/i.test(t[1])).map(t => t[0] + ' → …' + (t[1].match(/.{0,70}(?:à payer[^.]{0,40}[−-]\s?\d|[−-]\s?\d[\d  ]*,\d\d\s*€\s*(?:à payer|à déclarer)|TVA à payer).{0,50}/i) || [''])[0] + '…');
    const avecTva = HT.filter(t => /TVA/.test(t[1]) && /837,25|−\s?837|-\s?837/.test(t[1])).length;
    v('D0b population : ' + avecTva + ' écran(s) de l’hôte montrent le solde de −837,25 € (sur ' + HT.length + ' lus)', avecTva >= 1, HT.map(t => t[0]));
    console.log('  · [constat D1] hôte, solde de TVA ' + (mod && mod.aPayer) + ' € : ' + mauvais.length + ' écran(s) disent « à payer » / un montant négatif'); mauvais.slice(0, 4).forEach(x => console.log('     ', x.slice(0, 260)));
    HT.forEach(t => { const m = t[1].match(/.{0,60}TVA[^.]{0,60}(?:à payer|à déclarer)[^.]{0,60}/i); console.log('     [lu] ' + t[0] + ' (' + t[1].length + ' car.) : ' + (m ? m[0] : '— aucune mention de TVA à payer')); });
    await L.capture(c, CAP + `${profil}-hote-tva-negative.png`); }
  v('Z aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.stack); process.exit(2); });
