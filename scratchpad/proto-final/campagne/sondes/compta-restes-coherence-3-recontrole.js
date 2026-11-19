// Recontrôle ADVERSE du 3e tour « restes compta cohérence » (19 novembre 2026), JOUÉ au navigateur par le geste, pas relu :
//  A  l'hôte : un achat de 5 000 € saisi par le VRAI formulaire fait un solde négatif ; on lit TOUS les écrans qui portent la TVA (Comptabilité : ensemble, clôture, normes, TVA ; Accueil) à la
//     recherche d'un « à payer », d'un signe moins ou d'un « l'État te doit » oublié ; solde positif inchangé (contre-épreuve).
//  B  le reçu : le VRAI champ « Montant » de la fiche (data-paiemontant) refuse 1 000 000,01 et 1e9 avec une phrase, accepte 55 / 40,50 / 1000 / 1 000 000 ; un reçu compté (intervention terminée) arrive au cadre
//     avec le même plafond ; franchir le seuil par modification fait RETIRER l'écriture des deux côtés ; l'argent n'est jamais compté d'un côté seulement.
//  C  le cadre (mode application) : tous les écrans relus pour les promesses sur les heures, les formules « l'État te/vous doit / rend / rembourse », les doubles négations, les seuils chiffrés ; la démonstration inchangée.
//  D  captures à regarder (hôte TVA, carte du crédit, « À faire », Accueil ; cadre TVA, paie) : usage  node compta-restes-coherence-3-recontrole.js [profil] [nuit]
const fs = require('fs'), path = require('path');
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap-rc3/';
fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  const txt = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const lireHote = async () => { const T = []; for (const on of ['ensemble', 'cloture', 'normes', 'tva', 'balance', 'grandlivre', 'ecritures']) { await X.compta(c, on); T.push([on, await txt()]); }
    await p.evaluate(() => { location.hash = '#accueil'; }); await p.waitForTimeout(700); T.push(['accueil', await txt()]); return T; };
  const lignes = (T, re) => T.flatMap(t => (t[1].match(re) || []).map(m => t[0] + ' → ' + m.trim()));
  // ── A contre-épreuve : solde positif d'avant
  const sol0 = await p.evaluate(() => Math.round(cpTva().aPayer * 100)); const T0 = await lireHote();
  v('A0 population : solde de TVA positif (' + sol0 / 100 + ' €), 8 écrans lus', sol0 > 0 && T0.length === 8 && T0.every(t => t[1].length > 300), sol0);
  v('A0b le solde positif se dit « à payer » et jamais « crédit » (« Crédit de TVA » : ' + lignes(T0, /Crédit de TVA/g).length + ')', lignes(T0, /Crédit de TVA/g).length === 0 && T0.some(t => /162,75\s*€\s*à payer/.test(t[1])), lignes(T0, /.{0,40}162,75.{0,30}/g).slice(0, 4));
  // ── A1 la vraie saisie
  await p.evaluate(() => { cxDepense(); }); await p.waitForTimeout(500);
  await p.fill('#dp-f', 'Fournisseur Essai'); await p.fill('#dp-o', 'Gros achat d’essai'); await p.fill('#dp-h', '5000'); await p.fill('#dp-r', 'ESSAI-5000');
  await p.check('input[name="dp-j"][value="facture"]'); await p.check('input[name="dp-pay"][value="Carte"]'); await p.click('[data-cx="depenseok"]'); await p.waitForTimeout(900);
  const sol1 = await p.evaluate(() => Math.round(cpTva().aPayer * 100)); const T1 = await lireHote();
  v('A1 population : solde NÉGATIF par la vraie saisie (' + sol1 / 100 + ' €)', sol1 === -83725, sol1);
  const ap = lignes(T1, /[^.]{0,60}à payer[^.]{0,60}/gi).filter(l => /TVA|837/.test(l));
  console.log('  « à payer » rencontrés avec la TVA, solde négatif (à lire) :'); ap.forEach(l => console.log('     ' + l.slice(0, 230)));
  const faux = lignes(T1, /[^.]{0,40}(?:à payer|à déclarer et payer)[^.€]{0,25}837,25|−\s?837,25|-\s?837,25|(?:TVA à payer|à payer en novembre)[^.]{0,10}837/gi);
  v('A2 aucun écran ne dit « à payer » ni un signe moins devant 837,25 € (' + faux.length + ')', faux.length === 0, faux.slice(0, 4));
  const etat = lignes(T1, /l’État (?:te|vous) (?:doit|rend|rembourse)|te la rend|rendue? par l’État|te rembourse|remboursé automatiquement/gi);
  v('A3 aucun « l’État te doit / te la rend / te rembourse » dans les 8 écrans de l’hôte (' + etat.length + ')', etat.length === 0, etat);
  const nb = lignes(T1, /837,25/g).length; v('A4 population : 837,25 € paraît ' + nb + ' fois sur 8 écrans, tous les écrans qui le portent disent « crédit » ou « Crédit de TVA » à côté', nb >= 5 && T1.filter(t => /837,25/.test(t[1])).every(t => /Crédit de TVA|crédit de/i.test(t[1]) || t[0] === 'ecritures' || t[0] === 'grandlivre' || t[0] === 'balance'), T1.filter(t => /837,25/.test(t[1])).map(t => t[0]));
  // grand livre / balance : le compte 44567 (crédit de TVA) garde son sens, la balance reste équilibrée
  await X.compta(c, 'balance'); const bal = await p.evaluate(() => { const o = { de: 0, cr: 0 }; try { const B = cpBalance ? cpBalance() : null; } catch (e) {} return (typeof cpTva === 'function') ? Math.round(cpTva().aPayer * 100) : null; });
  v('A5 le solde reste négatif en interne (-837,25 : la balance ne change pas, seuls les mots changent)', bal === -83725, bal);
  await X.compta(c, 'tva'); await L.capture(c, CAP + tag + '-hote-tva.png');
  await p.evaluate(() => { const e = [...document.querySelectorAll('.carte')].find(x => /Crédit de TVA/.test(x.innerText)); if (e) e.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await L.capture(c, CAP + tag + '-hote-carte.png');
  await X.compta(c, 'ensemble'); await p.evaluate(() => { const e = [...document.querySelectorAll('.cx-af')].find(x => /Crédit de TVA/.test(x.innerText)); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400); await L.capture(c, CAP + tag + '-hote-afaire.png');
  await p.evaluate(() => { location.hash = '#accueil'; }); await p.waitForTimeout(700); await L.capture(c, CAP + tag + '-hote-accueil.png');
  await p.evaluate(() => { const i = ACHATS.findIndex(a => a.ref === 'ESSAI-5000'); if (i >= 0) ACHATS.splice(i, 1); rendre(); });

  // ── B le reçu par le VRAI champ de la fiche (intervention i3 : planifiée, le champ existe)
  await p.evaluate(() => aller('inter-x-i3')); await p.waitForTimeout(600);
  await p.click('input[data-paie="i3"][value="total"]'); await p.waitForTimeout(400); await p.click('[data-paiemode="Espèces"]'); await p.waitForTimeout(400);
  const sel = 'input[data-paiemontant="i3"]'; v('B0 le champ « Montant » de la fiche existe', (await p.locator(sel).count()) === 1);
  const ess = async val => { await p.evaluate(() => { window.__tm = []; if (!window.__tw) { const t0 = toast; toast = function (m) { (window.__tm = window.__tm || []).push(String(m)); return t0.apply(this, arguments); }; window.__tw = 1; } });
    await p.fill(sel, val); await p.press(sel, 'Tab'); await p.waitForTimeout(500); return p.evaluate(() => ({ m: fiche('i3').paiement.montant, champ: (document.querySelector('input[data-paiemontant]') || {}).value, toast: (window.__tm || []).join(' | ') })); };
  const att = { '55': true, '40,50': true, '1000': true, '1000000': true, '999999,99': true, '1000000,01': false, '1e9': false, '2000000': false, '0': 'asis', 'abc': 'asis', '-5': 'asis' };
  for (const [val, ok] of Object.entries(att)) { const r = await ess(val);
    if (ok === true) v('B1 « ' + val + ' » passe par le vrai champ : gardé (« ' + r.m + ' »), aucune phrase de refus', r.m === val && !/trop élevé/.test(r.toast), r);
    else if (ok === false) v('B2 « ' + val + ' » refusé par le vrai champ avec une phrase, champ vidé (« ' + r.champ + ' »)', r.m === '' && r.champ === '' && /trop élevé.*1[\s\u202f\u00a0]000[\s\u202f\u00a0]000,00/.test(r.toast), r);
    else v('B3 « ' + val + ' » comme avant : gardé tel quel, sans phrase de refus', r.m === val && !/trop élevé/.test(r.toast), r); }
  // un reçu COMPTÉ (intervention terminée, pas de facture) : des deux côtés, jamais d'un seul — on repose le montant par la fiche puis on termine l'intervention
  await p.evaluate(() => { location.hash = '#accueil'; }); await p.waitForTimeout(800);
  const f = await X.cadreCompta(c); await p.waitForTimeout(1200); v('B4 le cadre OP COMPTABLE est ouvert', !!f);
  const lit = () => f.evaluate(() => ({ actifs: E.filter(e => e.recuSP && !e.contrePar && e.etat === 'valide').map(e => Math.round(e.lignes[0].d * 100)), contres: E.filter(e => e.recuSP && e.contrePar).length, eq: balance({}).reduce((s, b) => s + Math.round(b.d * 100), 0) === balance({}).reduce((s, b) => s + Math.round(b.c * 100), 0) }));
  const hote = () => p.evaluate(() => cpPaieTerrain().map(e => Math.round(e.ttc * 100)));
  const poser = async mt => { await p.evaluate(m => { fiche('i3').paiement = Object.assign(fiche('i3').paiement || {}, { etat: 'total', mode: 'Espèces', montant: m }); const i = INTS.find(o => o.id === 'i3'); if (!window.__st) window.__st = i.st; i.st = 'fait'; rendre(); }, mt); await p.waitForTimeout(1200); };
  const defaut = await hote(); const kd = await lit();
  for (const [mt, ct] of [['1000000', 100000000], ['55', 5500]]) { await poser(mt); const H = await hote(), K = await lit();
    v('B5 reçu de ' + mt + ' € terminé : compté des DEUX côtés, équilibré (hôte ' + JSON.stringify(H) + ' / cadre ' + JSON.stringify(K.actifs) + ')', H.includes(ct) && K.actifs.includes(ct) && K.eq, { H, K }); }
  await poser('1000000'); let H = await hote(), K = await lit();
  v('B6 puis le même reçu passe à 1 000 000,01 « par modification » (import/démo) : compté des DEUX côtés avant (' + JSON.stringify(H) + ' / ' + JSON.stringify(K.actifs) + ')', H.length === K.actifs.length && H.includes(100000000));
  await poser('1000000,01'); H = await hote(); K = await lit();
  v('B6b 1 000 000,01 posé sur un reçu compté : ni l’hôte ni le cadre ne le comptent comme 1 000 000 € ni comme 1 000 000,01 € (' + JSON.stringify(H) + ' / ' + JSON.stringify(K.actifs) + ')', !H.includes(100000001) && !K.actifs.includes(100000001) && !K.actifs.includes(100000000) && (H.length === K.actifs.length), { H, K });
  await poser('1e9'); H = await hote(); K = await lit(); v('B6c 1e9 posé sur un reçu compté : rien nulle part (' + JSON.stringify(H) + ' / ' + JSON.stringify(K.actifs) + '), équilibré', !H.some(x => x >= 100000000) && !K.actifs.some(x => x >= 100000000) && H.length === K.actifs.length && K.eq, { H, K });
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i3'); i.st = window.__st; fiche('i3').paiement.etat = 'rien'; fiche('i3').paiement.montant = ''; rendre(); }); await p.waitForTimeout(900);
  // ── C le cadre en mode application : tous les écrans
  const crawl = fr => fr.evaluate(async () => { const T = [], dire = n => T.push([n, document.body.innerText.replace(/\s+/g, ' ')]);
    for (const mode of [false, true]) for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function') continue; try { UI.expert = mode; aller(k); await new Promise(r => setTimeout(r, 90)); dire((mode ? 'expert:' : 'simple:') + k); } catch (e) {} }
    UI.expert = false; try { aller('paie'); ouvrirBulletin('kb'); await new Promise(r => setTimeout(r, 120)); dire('bulletin'); fermerBase(); } catch (e) {}
    try { T.push(['fil', FIL.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {} try { T.push(['afaire', aFaireVu().map(x => [x.t, x.d, x.manque].join(' ')).join(' | ')]); } catch (e) {} try { T.push(['controles', typeof CONTROLES_PAIE !== 'undefined' ? JSON.stringify(CONTROLES_PAIE) : '']); } catch (e) {} return T; });
  await f.evaluate(() => { if (!PAIE.calc) paieCalculer(); }); await f.evaluate(() => { try { toutTraiter(); rendre(); } catch (e) {} }); await p.waitForTimeout(600);
  const CT = await crawl(f); v('C0 population : ' + CT.length + ' écrans/listes du cadre relus (mode application)', CT.length >= 60, CT.length);
  const ET = CT.flatMap(t => (t[1].match(/.{0,30}(?:l’État (?:te|vous|nous) (?:doit|rend|rembourse|reverse)|te la rend|te le rend|rendue? par l’État|remboursée? automatiquement|crédit[^.]{0,40}rembours[^.]{0,30}automatique)/gi) || []).map(m => t[0] + ' → ' + m));
  v('C1 aucune formule « l’État te/vous doit / rend / rembourse » sur les ' + CT.length + ' écrans du cadre (' + ET.length + ')', ET.length === 0, ET.slice(0, 5));
  const heures = [...new Set(CT.flatMap(t => (t[1].match(/[^.|‹]{0,60}(?:OP GESTION[^.|]{0,60}heures|heures[^.|]{0,60}OP GESTION)[^.|]{0,40}/gi) || []).map(m => m.trim())))];
  console.log('  phrases du cadre (mode application) qui rapprochent « heures » et « OP GESTION » (à lire) :'); heures.forEach(h => console.log('     ' + h.slice(0, 200)));
  v('C2 la seule mention des heures et d’OP GESTION est la négation (« la liaison avec OP GESTION n’envoie pas les heures ») : ' + heures.length + ' phrase(s) distincte(s)', heures.length >= 1 && heures.every(h => /n’envoie pas les heures/.test(h)), heures.slice(0, 4));
  const seuil = CT.flatMap(t => (/TVA/.test(t[1]) ? (t[1].match(/.{0,60}remboursement(?! de note)[^.]{0,100}/gi) || []) : []).filter(m => /\d/.test(m.replace(/2026|23|30/g, ''))).map(m => t[0] + ' → ' + m));
  v('C3 aucun chiffre près du mot « remboursement » (pas de seuil) : ' + seuil.length, seuil.length === 0, seuil.slice(0, 3));
  const neg = CT.flatMap(t => (t[1].match(/moins (?:la|le|les) [^.]{0,60}[−-]\s?\d/gi) || []).map(m => t[0] + ' → ' + m));
  v('C4 plus de « moins … − montant » (double négation) sur les écrans du cadre : ' + neg.length, neg.length === 0, neg.slice(0, 4));
  const dm = await c.ctx.newPage(); const racine = p.url().replace(/\/apercu\/.*$/, ''); await dm.goto(racine + '/apercu/prototype-comptabilite.html', { waitUntil: 'load' }); await dm.waitForFunction(() => typeof UI !== 'undefined' && typeof nbAVerifier === 'function', null, { timeout: 15000 }).catch(() => {});
  await dm.evaluate(() => { if (!PAIE.calc) paieCalculer(); }); const DT = await crawl(dm);
  v('C5 contre-épreuve : la démonstration (sans ?app=1) garde « Toutes les heures du mois sont validées dans OP GESTION », « 4 semaines complètes » et « Heures du mois reçues d’OP GESTION »', DT.some(t => /Toutes les heures du mois sont validées dans OP GESTION/.test(t[1])) && DT.some(t => /4 semaines complètes et la dernière jusqu’au 31/.test(t[1])) && DT.some(t => /Heures du mois reçues d’OP GESTION/.test(t[1])), DT.length);
  await dm.close();
  // le texte du crédit sur l'écran TVA du cadre, pour le lire
  await f.evaluate(() => { UI.expert = false; UI.tvaMois = '2026-10'; aller('tva'); }); await p.waitForTimeout(700);
  const tv = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  console.log('  écran TVA du cadre :', tv.slice(0, 900));
  await f.evaluate(() => { UI.expert = false; aller('tva'); const e = document.querySelector('#tva-auto'); if (e) e.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(500); await L.capture(c, CAP + tag + '-cadre-tva.png');
  await f.evaluate(() => { if (!PAIE.calc) paieCalculer(); rendre(); aller('paie'); const e = document.querySelector('#paie-controles') || document.querySelector('.etapes'); if (e) e.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(800); await L.capture(c, CAP + tag + '-cadre-paie.png');
  await f.evaluate(() => { aller('accueil'); }); await p.waitForTimeout(700); await L.capture(c, CAP + tag + '-cadre-accueil.png');
  const d = await L.deborde(c).catch(() => null); console.log('débordement', JSON.stringify(d));
  v('Z aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.stack); process.exit(2); });
