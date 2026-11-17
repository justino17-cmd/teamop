// Outils communs des sondes « Devis et atelier » de la campagne du 17 novembre 2026 : ceux des sondes Tâches / Absences
// (page neuve, recensement depuis le DOM, état observable), plus les lectures propres aux devis.
const O = require('./taches-absences-outils.js'), A = require('../../sondes/atelier-outils.js');
exports.L = O.L; exports.marquer = O.marquer; exports.neuf = O.neuf; exports.lire = O.lire; exports.diff = O.diff; exports.doigtsReel = O.doigtsReel; exports.A = A;
exports.CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-devis-atelier/';
// les devis du prototype, lus dans les DONNÉES (pour les comparer à ce que la page affiche)
exports.donnees = p => p.evaluate(() => { dvInit(); return DV.map(x => ({ cle: dvCle(x), num: x.num, cli: x.cli, e: dvEtat(x), tva: x.tva, ht: dvHT(x), ttc: dvTTC(x), complet: dvComplet(x), acompte: x.acompte, int: x.int || '', facAcompte: x.facAcompte || '', facSolde: x.facSolde || '', n: x.lignes.length })); });
exports.kpis = p => p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ n: (k.querySelector('b') || {}).textContent, l: ((k.querySelector('span') || {}).textContent || '').trim() })));
// toutes les lignes de la liste (devis du prototype + devis composés), texte brut
exports.liste = p => p.evaluate(() => [...document.querySelectorAll('#contenu .dv-l, #contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
// signe en client (VRAIE fenêtre « Ce que voit le client », VRAI tracé à la souris ou au doigt)
exports.signer = async (c, cle) => { const p = c.p, L = exports.L;
  await L.aller(p, 'devis-x-' + cle); await L.toucher(c, '[data-dv="client|' + cle + '"]'); await L.calme(p, 400);
  await p.check('#dv-ok'); await p.evaluate(() => document.getElementById('dv-signe').scrollIntoView({ block: 'center' })); await L.calme(p, 250); const bb = await p.locator('#dv-signe').boundingBox();
  await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
  await L.toucher(c, '[data-dv="signer|' + cle + '"]'); await L.calme(p, 500); };
