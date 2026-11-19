// Restes de cohérence cadre OP COMPTABLE / OP GESTION, 3e tour (19 novembre 2026) : ce que le recontrôle du 18/11 a laissé ouvert, JOUÉ au navigateur, pas relu.
//  H  l'hôte : un solde de TVA négatif (un achat de 5 000 € posé par la VRAIE saisie d'une facture fournisseur) ne dit plus « à payer −837,25 € » mais « Crédit de TVA » sur ses écrans ;
//     contre-épreuve : le solde positif garde ses mots d'avant.
//  D1 la paie du cadre en mode application ne prétend pas que les heures sont validées / viennent d'OP GESTION ; la démonstration garde son récit.
//  D2 « moins la TVA payée sur tes achats − 4 313,36 € » : plus de double négation.
//  D3 un reçu absurde (1e9 €) est refusé des DEUX côtés avec une phrase, avec UN plafond ; 55 / 40,50 / 1000 passent, 0 / abc / −5 ne comptent nulle part comme avant.
//  D4 « l'État te doit » ne se lit plus nulle part : le crédit se reporte, un remboursement se demande (sans chiffre de seuil), phrase marquée « à faire relire par l'expert-comptable ».
// Chaque contrôle compte sa population avant de croire un zéro. usage : node compta-restes-coherence-3.js [profil] [qui]      « N ✓ · M ✗ », code 1 si un contrôle tombe
const fs = require('fs'), path = require('path');
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..', '..', '..');
const HOTE_SRC = fs.readFileSync(path.join(RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const txt = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const ECRANS = ['ensemble', 'cloture', 'normes', 'tva'];
  const lire = async () => { const T = []; for (const on of ECRANS) { await X.compta(c, on); T.push([on, await txt()]); } return T; };
  const NEG = /à payer[^.]{0,30}[−-]\s?\d|à (?:déclarer|payer)[^.]{0,6}[−-]\s?\d[\d  ]*,\d\d|[−-]\s?\d[\d  ]*,\d\d\s*€\s*(?:à payer|à déclarer)|TVA à payer\s*[−-]|TVA d’octobre à déclarer en novembre[^.]{0,60}[−-]\s?\d|[−-]\s?837,25/i;
  // ── H0 contre-épreuve : le solde POSITIF d'avant (162,75 €) garde ses mots
  const H0 = await p.evaluate(() => Math.round(cpTva().aPayer * 100)); const T0 = await lire();
  v('H0 population : le solde de TVA de l’hôte est POSITIF (' + H0 / 100 + ' €) et ses quatre écrans sont lus', H0 > 0 && T0.length === 4 && T0.every(t => t[1].length > 300), H0);
  v('H0b solde positif : « à payer » partout comme avant (« à payer en novembre », « TVA à payer »), aucun mot de crédit, aucun montant négatif', T0.some(t => /162,75\s*€\s*à payer en novembre/.test(t[1])) && T0.some(t => /TVA à payer\s*162,75/.test(t[1])) && !T0.some(t => /Crédit de TVA d’octobre|rien à payer en novembre/.test(t[1])) && !T0.some(t => NEG.test(t[1])), T0.map(t => t[0] + ' : ' + (t[1].match(/.{0,40}162,75.{0,40}/) || ['—'])[0]));
  const dit162 = t => (t[1].match(/.{0,70}162,75.{0,50}/g) || []).join(' | '); const avant = T0.map(dit162);
  // ── H1 la VRAIE saisie d'une facture d'achat de 5 000 € HT (déductible, payée par carte)
  await p.evaluate(() => { cxDepense(); }); await p.waitForTimeout(500);
  await p.fill('#dp-f', 'Fournisseur Essai'); await p.fill('#dp-o', 'Gros achat d’essai'); await p.fill('#dp-h', '5000'); await p.fill('#dp-r', 'ESSAI-5000');
  await p.check('input[name="dp-j"][value="facture"]'); await p.check('input[name="dp-pay"][value="Carte"]'); await p.click('[data-cx="depenseok"]'); await p.waitForTimeout(900);
  const H1 = await p.evaluate(() => ({ ap: Math.round(cpTva().aPayer * 100), n: ACHATS.filter(a => a.ref === 'ESSAI-5000').length }));
  v('H1 population : l’achat saisi par le formulaire existe (' + H1.n + ') et le solde de TVA est NÉGATIF (' + H1.ap / 100 + ' €)', H1.n === 1 && H1.ap === -83725, H1);
  const T1 = await lire(); const eur837 = T1.filter(t => /837,25/.test(t[1])).map(t => t[0]);
  v('H1b population : le solde de 837,25 € paraît sur ' + eur837.length + ' des 4 écrans (ensemble, clôture, normes, TVA)', eur837.length === 4, eur837);
  const neg = T1.filter(t => NEG.test(t[1])).map(t => t[0] + ' → …' + (t[1].match(NEG) || [''])[0]);
  v('H2 aucun écran de l’hôte ne dit « à payer −837,25 € » ni un montant négatif (' + neg.length + ' fautif(s))', neg.length === 0, neg);
  const sansMot = T1.filter(t => !/Crédit de TVA/.test(t[1])).map(t => t[0]);
  v('H2b chacun des 4 écrans dit « Crédit de TVA » avec la somme positive', sansMot.length === 0 && T1.every(t => /Crédit de TVA.{0,220}837,25|837,25.{0,60}Crédit de TVA/.test(t[1])), sansMot);
  const vers = T1.find(t => t[0] === 'tva')[1];
  v('H2c l’écran TVA : « Crédit de TVA » en titre et en total, le report et le remboursement sur demande, mention « à faire relire par ton expert-comptable », aucun chiffre de seuil', /Crédit de TVA d’octobre · 837,25/.test(vers) && /Crédit de TVA\s*837,25/.test(vers) && /se reporte sur la déclaration suivante/.test(vers) && /remboursement peut se demander/.test(vers) && /à faire relire par ton expert-comptable/.test(vers) && !/remboursement[^.]{0,80}\d/.test(vers), vers.match(/.{0,60}Crédit de TVA.{0,80}/g));
  // les six affichages passent par UNE fonction : aucune ligne du source ne lit tv.aPayer sans cpTvaDit (le KPI de l'ancienne vueComptabilite, recouverte, n'est lu par aucun écran : le code seul le garde)
  const lignes = HOTE_SRC.split('\n').filter(l => /tv\.aPayer/.test(l) && !/aj\('OD'/.test(l) && !/const cpTvaDit = /.test(l)); const sans = lignes.filter(l => !/cpTvaDit\(/.test(l));
  v('H3 population : ' + lignes.length + ' ligne(s) du source de l’hôte lisent tv.aPayer pour l’afficher ; toutes passent par cpTvaDit (' + sans.length + ' sans)', lignes.length >= 2 && sans.length === 0 && (HOTE_SRC.match(/cpTvaDit\(tv\)/g) || []).length >= 12, sans.map(l => l.trim().slice(0, 90)));
  await L.capture(c, '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap-c3/' + `${profil}-hote-credit.png`);
  // retour au solde positif : mêmes mots qu'avant
  await p.evaluate(() => { const i = ACHATS.findIndex(a => a.ref === 'ESSAI-5000'); if (i >= 0) ACHATS.splice(i, 1); rendre(); });
  const T2 = await lire(); const apres = T2.map(dit162);
  v('H4 contre-épreuve : l’achat retiré, le solde redevient positif et les écrans redisent EXACTEMENT ce qu’ils disaient avant', avant.every(x => x) && JSON.stringify(avant) === JSON.stringify(apres) && !T2.some(t => /Crédit de TVA d’octobre/.test(t[1])), { avant, apres });

  // ── D3 le reçu absurde : refusé des deux côtés, un seul plafond
  const f = await X.cadreCompta(c); v('R0 le cadre OP COMPTABLE est ouvert (mode application)', !!f); await p.waitForTimeout(1200);
  const lit = () => f.evaluate(() => ({ actifs: E.filter(e => e.recuSP && !e.contrePar && e.etat === 'valide').map(e => Math.round(e.lignes[0].d * 100)), equilibre: balance({}).reduce((s, b) => s + Math.round(b.d * 100), 0) === balance({}).reduce((s, b) => s + Math.round(b.c * 100), 0) }));
  const hote = () => p.evaluate(() => ({ recus: cpPaieTerrain().map(e => Math.round(e.ttc * 100)), toast: (window.__tm || []).join(' | ') }));
  // la vraie poignée de saisie : l'écouteur « change » du document lit data-paiemontant ; on pose un champ réel dans la page (comme celui de la fiche) et on lui fait dire ce qu'une personne taperait
  // rendre() après le change : la personne enchaîne sur un autre geste, qui redessine et envoie à la liaison
  const saisir = async val => { await p.evaluate(v0 => { if (!window.__tw) { const t0 = toast; toast = function (m) { (window.__tm = window.__tm || []).push(String(m)); return t0.apply(this, arguments); }; window.__tw = 1; } window.__tm = []; let el = document.getElementById('essai-montant'); if (!el) { el = document.createElement('input'); el.id = 'essai-montant'; el.dataset.paiemontant = 'i6'; el.style.cssText = 'position:fixed;left:-300px;top:0'; document.body.appendChild(el); } el.value = v0; el.dispatchEvent(new Event('change', { bubbles: true })); rendre(); return el.value; }, val); await p.waitForTimeout(1100); };
  await saisir('40'); let Hh = await hote(), K = await lit();
  v('R1 population : le reçu de départ (40 €) est compté des deux côtés (' + JSON.stringify(Hh.recus) + ' / ' + JSON.stringify(K.actifs) + ')', Hh.recus.length === 1 && Hh.recus[0] === 4000 && K.actifs.length === 1 && K.actifs[0] === 4000, { Hh, K });
  await saisir('1e9'); Hh = await hote(); K = await lit(); const champ = await p.evaluate(() => [document.getElementById('essai-montant').value, fiche('i6').paiement.montant]);
  v('R2 « 1e9 » : refusé avec une phrase claire (« ' + Hh.toast.slice(0, 90) + ' »), le montant n’est pas gardé (champ « ' + champ[0] + ' », fiche « ' + champ[1] + ' »)', /trop élevé/.test(Hh.toast) && /1\s?000\s?000/.test(Hh.toast) && champ[0] === '' && champ[1] === '', { Hh, champ });
  v('R2b « 1e9 » : l’hôte ne compte aucun reçu et le cadre aucune écriture (même nombre : ' + Hh.recus.length + ' / ' + K.actifs.length + '), équilibré', Hh.recus.length === 0 && K.actifs.length === 0 && K.equilibre, { Hh, K });
  // le chemin « on pose la valeur sans passer par la saisie » (un import, une démo) : la défense de chaque côté tient seule
  await p.evaluate(() => { fiche('i6').paiement.montant = '1e9'; rendre(); }); await p.waitForTimeout(1000); Hh = await hote(); K = await lit();
  v('R2c « 1e9 » posé SANS passer par la saisie : l’hôte ne le compte pas non plus et le cadre ne reçoit rien (' + Hh.recus.length + ' / ' + K.actifs.length + ')', Hh.recus.length === 0 && K.actifs.length === 0, { Hh, K });
  const cad = await f.evaluate(() => [oplRecusOk({ id: 'x', d: '2026-10-05', ttc: 1e9, tva: 10 }, 1e6), oplRecusOk({ id: 'x', d: '2026-10-05', ttc: 1e6, tva: 10 }, 1e6), oplRecusOk({ id: 'x', d: '2026-10-05', ttc: 1000000.01, tva: 10 }, 1e6), oplRecusOk({ id: 'x', d: '2026-10-05', ttc: 999999.99, tva: 10 }, 1e6), oplRecusOk({ id: 'x', d: '2026-10-05', ttc: 5e6, tva: 10 }, 2e7)]);
  const maxH = await p.evaluate(() => [typeof PAIEMENT_MAX === 'undefined' ? null : PAIEMENT_MAX, opLiaDonnees().recuMax]);
  v('R2d le cadre refuse lui-même ce qui dépasse le plafond reçu (1e9 : ' + cad[0] + ', 1 000 000 : ' + cad[1] + ', 1 000 000,01 : ' + cad[2] + ', 999 999,99 : ' + cad[3] + ') ; UNE constante : l’hôte envoie ' + maxH[1] + ' (= ' + maxH[0] + ')', cad[0] === false && cad[1] === true && cad[2] === false && cad[3] === true && cad[4] === true && maxH[0] === 1e6 && maxH[1] === 1e6, { cad, maxH });
  for (const [mt, ttc] of [['55', 5500], ['40,50', 4050], ['1000', 100000]]) { await saisir(mt); Hh = await hote(); K = await lit();
    v('R3 « ' + mt + ' » passe comme avant : un reçu de ' + ttc / 100 + ' € des deux côtés, pas de refus', Hh.recus.length === 1 && Hh.recus[0] === ttc && K.actifs.length === 1 && K.actifs[0] === ttc && !/trop élevé/.test(Hh.toast) && K.equilibre, { Hh, K }); }
  for (const mt of ['0', 'abc', '-5']) { await saisir(mt); Hh = await hote(); K = await lit(); const g = await p.evaluate(() => fiche('i6').paiement.montant);
    v('R4 « ' + mt + ' » comme avant : gardé tel quel (« ' + g + ' »), aucun reçu des deux côtés (' + Hh.recus.length + ' / ' + K.actifs.length + '), pas de phrase de refus', g === mt && Hh.recus.length === 0 && K.actifs.length === 0 && !/trop élevé/.test(Hh.toast), { Hh, K, g }); }
  await saisir('40');

  // ── D1, D2, D4 : tous les écrans du cadre en mode application, puis la démonstration
  const crawl = fr => fr.evaluate(async () => { const T = [], dire = n => T.push([n, document.body.innerText.replace(/\s+/g, ' ')]);
    for (const mode of [false, true]) for (const k of Object.keys(VUES)) { if (typeof VUES[k] !== 'function') continue; try { UI.expert = mode; aller(k); await new Promise(r => setTimeout(r, 90)); dire((mode ? 'expert:' : 'simple:') + k); } catch (e) { T.push(['erreur ' + k, e.message]); } }
    UI.expert = false; try { aller('paie'); ouvrirBulletin('kb'); await new Promise(r => setTimeout(r, 120)); dire('bulletin'); fermerBase(); } catch (e) {}
    try { T.push(['fil', FIL.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['afaire', aFaireVu().map(x => [x.t, x.d, x.manque].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['jour', JOUR.map(x => [x.t, x.d].join(' ')).join(' | ')]); } catch (e) {}
    try { T.push(['controles', typeof CONTROLES_PAIE !== 'undefined' ? JSON.stringify(CONTROLES_PAIE) : '']); } catch (e) {}
    return T; });
  await f.evaluate(() => { if (!PAIE.calc) paieCalculer(); });   // la nuit est traitée : c'est alors seulement que la liste des contrôles de la paie s'affiche
  const CT = await crawl(f); const bonnes = CT.filter(t => !/^erreur/.test(t[0]));
  v('C0 population : ' + bonnes.length + ' écrans/listes du cadre relus en mode application', bonnes.length >= 60, bonnes.length);
  const VALID = /Toutes les heures du mois sont validées|4 semaines complètes|heures du mois sont validées|semaines complètes/i;
  const fv = bonnes.filter(t => VALID.test(t[1])).map(t => t[0] + ' → …' + (t[1].match(new RegExp('.{0,40}(?:' + VALID.source + ').{0,40}', 'i')) || [''])[0] + '…');
  v('D1 aucun écran du cadre (mode application) ne dit que « toutes les heures du mois sont validées » ni « 4 semaines complètes » (' + fv.length + ')', fv.length === 0, fv.slice(0, 5));
  const nouv = bonnes.filter(t => /Les heures du mois sont toutes saisies/.test(t[1])).map(t => t[0]);
  v('D1b population : la paie dit maintenant « les heures du mois sont toutes saisies » (' + nouv.length + ' écran(s)) et que la liaison n’envoie pas les heures', nouv.length >= 1 && bonnes.some(t => /la liaison avec OP GESTION n’envoie pas les heures/.test(t[1])), nouv);
  const dp = await c.ctx.newPage(); const racine = p.url().replace(/\/apercu\/.*$/, ''); await dp.goto(racine + '/apercu/prototype-comptabilite.html', { waitUntil: 'load' }); await dp.waitForFunction(() => typeof UI !== 'undefined' && typeof nbAVerifier === 'function', null, { timeout: 15000 }).catch(() => {});
  await dp.evaluate(() => { if (!PAIE.calc) paieCalculer(); }); const DT = await crawl(dp); const dv = DT.filter(t => /Toutes les heures du mois sont validées dans OP GESTION/.test(t[1])).length;
  v('D1c contre-épreuve : la démonstration (sans ?app=1) garde son récit, octet pour octet (' + DT.length + ' écrans, ' + dv + ' avec « Toutes les heures du mois sont validées dans OP GESTION » et « 4 semaines complètes »)', DT.length >= 15 && dv >= 1 && DT.some(t => /4 semaines complètes et la dernière jusqu’au 31/.test(t[1])), { n: DT.length, dv });
  await dp.close();
  await f.evaluate(() => { UI.expert = false; UI.tvaMois = '2026-10'; aller('tva'); }); await p.waitForTimeout(700);
  const tvaT = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')); const tvaZ = await f.evaluate(() => { const Z = tvaDit(tvaMois('2026-10')); return Z.credit; });
  v('D2 population : l’écran TVA du cadre montre le calcul « TVA payée sur tes achats » (crédit : ' + tvaZ + ')', /TVA payée sur tes achats/.test(tvaT), tvaT.slice(0, 200));
  v('D2b « TVA payée sur tes achats, qu’on enlève 4 313,36 € » : plus de « moins … − » (double négation) ni de signe moins devant le montant', /TVA payée sur tes achats, qu’on enlève\s*\d/.test(tvaT) && !/moins la TVA payée/.test(tvaT) && !/qu’on enlève\s*[−-]/.test(tvaT) && !/TVA payée sur tes achats[^€]{0,30}[−-]\s?\d/.test(tvaT), tvaT.match(/.{0,50}TVA payée sur tes achats.{0,50}/g));
  const ET = bonnes.filter(t => /l’État te (?:doit|la rend)|te la rend|L’État te doit/i.test(t[1])).map(t => t[0]); const ETh = (await p.evaluate(async () => { const out = []; for (const k of ['comptabilite', 'accueil']) { try { aller(k); await new Promise(r => setTimeout(r, 300)); out.push(document.body.innerText.replace(/\s+/g, ' ')); } catch (e) {} } return out; })).filter(t => /l’État te (?:doit|la rend)/i.test(t)).length;
  const cr = bonnes.filter(t => /Crédit de TVA/.test(t[1])).map(t => t[0]);
  v('D4 population : le crédit de TVA est dit sur ' + cr.length + ' écran(s) du cadre', cr.length >= 3, cr.slice(0, 6));
  v('D4b « l’État te doit » / « te la rend » ne se lit sur AUCUN écran du cadre (' + ET.length + ') ni de l’hôte (' + ETh + ') ; ni dans le source des deux pages', ET.length === 0 && ETh === 0 && !/l’État te doit/.test(HOTE_SRC) && !/l’État te doit|l’État te la rend/.test(fs.readFileSync(path.join(RACINE, 'apercu', 'prototype-comptabilite.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), ET);
  v('D4c l’écran TVA du cadre dit la règle : report sur la prochaine déclaration, remboursement possible sur demande (jamais automatique), mention « à faire relire par l’expert-comptable », aucun chiffre de seuil', /se reporte sur ta prochaine déclaration de TVA/.test(tvaT) && /remboursement est possible sur demande/.test(tvaT) && /il n’arrive pas tout seul/.test(tvaT) && /à faire relire par l’expert-comptable/.test(tvaT) && !/remboursement[^.]{0,80}\d|seuil/i.test(tvaT), tvaT.match(/.{0,80}remboursement.{0,120}/g));
  await L.capture(c, '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap-c3/' + `${profil}-cadre-tva.png`);
  v('Z aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.stack); process.exit(2); });
