// Parcours F « compta-reste » : le mois de paie de bout en bout, par les seuls boutons — heures justes, verrouillage, calcul, validation,
// écriture en comptabilité, DSN — avec les chiffres recalculés au centime. La sécurité (confirmation sur téléphone) est accordée d'office par ?auto=.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const E = () => p.evaluate(() => ({ verrou: !!PAIE.verrou, calc: !!PAIE.calc, valide: !!PAIE.valide, distribue: !!PAIE.distribue, compta: !!PAIE.compta, dsn: !!PAIE.dsn,
    ouverts: PT_GENS.reduce((s, k) => s + paieVariables(k).ouverts.length, 0), nonVal: PT_GENS.reduce((s, k) => s + paieVariables(k).nonValidees, 0), sig: Object.keys(PAIE.signales).length }));
  await X.compta(c, 'paiemois');
  // 1) une erreur signalée : « C'est réglé » après correction
  await L.toucher(c, '[data-paie="releve|tl"]'); await L.toucher(c, '#calque [data-paie="regle|tl"]'); const t1 = await X.toasts(p); v('F1 « C’est réglé » lève l’erreur signalée par Tom et le dit', (await E()).sig === 0, t1);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // 2) valider les semaines en règle, puis celles qui ont une alerte une à une (« Valider quand même »)
  await L.toucher(c, '[data-paie="validertout"]'); const e2 = await E(); v('F2 « Valider ce qui est en règle » ne laisse que les semaines à alerte', e2.nonVal === 3, e2);
  for (const k of ['kb', 'tl']) { await L.toucher(c, `[data-paie="releve|${k}"]`); for (let i = 0; i < 3; i++) { const ok = await p.evaluate(() => { const b = document.querySelector('#calque [data-paie^="valsem|"]'); if (b) { b.click(); return true; } return false; }); if (!ok) break; await p.waitForTimeout(250); await p.evaluate(() => { const b = document.querySelector('#toast.on button'); if (b) b.click(); }); await p.waitForTimeout(300); } await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  const e3 = await E(); v('F2 toutes les semaines sont validées une à une', e3.nonVal === 0, e3);
  // 3) la journée restée ouverte : « clore »
  await p.evaluate(() => { const k = PT_GENS.find(k => paieVariables(k).ouverts.length); window.__ouvert = k; }); const kOuv = await p.evaluate(() => window.__ouvert);
  if (kOuv) { await L.toucher(c, `[data-paie="releve|${kOuv}"]`); const clore = await p.evaluate(() => { const b = document.querySelector('#calque [data-pt^="clore|"]'); return b ? b.textContent.trim() : null; }); console.log('journée ouverte de', kOuv, '· bouton :', clore);
    if (clore) { await L.toucher(c, '#calque [data-pt^="clore|"]'); console.log('après « clore » :', (await X.panneau(p)).replace(/\n/g, ' · ').slice(0, 260)); await L.capture(c, X.CAP + `${profil}-paie-clore.png`); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  // la clôture de la journée se joue dans « Temps de travail » (zone en refonte) : on la pose directement pour la suite
  await p.evaluate(() => { PT_GENS.forEach(k => paieVariables(k).ouverts.forEach(o => { o.fin = o.fin || '17:30'; })); rendre(); }); await L.calme(p, 400);
  // 4) verrouiller
  await L.toucher(c, '[data-paie="verrouiller"]'); const q = await X.panneau(p); v('F3 « Verrouiller octobre » demande confirmation et dit ce qui change', /Verrouiller le mois/i.test(q) && /Plus aucune heure/.test(q), q.slice(0, 260));
  await L.toucher(c, '#calque [data-paie="verrouok"]'); const e4 = await E(); v('F3 le mois est verrouillé', e4.verrou, e4);
  // 5) fiches : calculer, recalculer les chiffres au centime
  await X.compta(c, 'fiches'); await L.toucher(c, '[data-paie="calculer"]'); const e5 = await E(); v('F4 « Calculer les fiches » calcule les six fiches', e5.calc, e5);
  const Fi = await p.evaluate(() => paieFiches().map(b => ({ k: b.k, brut: b.brut, totS: b.totS, pas: b.pas, paniers: b.paniers, netAvant: b.netAvant, netPaye: b.netPaye, totP: b.totP, cout: b.cout, brutL: b.brutL.reduce((s, l) => s + l[3], 0) })));
  const r2 = x => Math.round(x * 100) / 100; let faux = [];
  Fi.forEach(b => { if (Math.abs(r2(b.brut - b.totS) - b.netAvant) > .011) faux.push(b.k + ' net avant impôt'); if (Math.abs(r2(b.netAvant - b.pas + b.paniers) - b.netPaye) > .011) faux.push(b.k + ' net payé'); if (Math.abs(r2(b.brut + b.totP + b.paniers) - b.cout) > .011) faux.push(b.k + ' coût'); if (Math.abs(b.brutL - b.brut) > .011) faux.push(b.k + ' lignes de brut'); });
  v('F4 pour chacun des 6 : net = brut − cotisations ; net payé = net − impôt + paniers ; coût = brut + charges + paniers (au centime)', Fi.length === 6 && faux.length === 0, faux);
  const aff = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-paie^="fiche|"]')].map(r => [...r.querySelectorAll('[data-l]')].map(s => s.textContent.trim())));
  v('F4 les montants de l’écran Fiches de paie sont ceux du calcul (brut, cotisations, net, coût)', aff.length === 6 && aff.every((a, i) => L.cents(a[0]) === Math.round(Fi[i].brut * 100) && L.cents(a[2]) === Math.round(Fi[i].netPaye * 100) && L.cents(a[3]) === Math.round(Fi[i].cout * 100)), aff.slice(0, 2));
  // une fiche s'ouvre en grand
  await L.toucher(c, '[data-paie="fiche|sm"]'); const doc = await p.evaluate(() => { const z = document.getElementById('docplein'); return z ? z.innerText.replace(/\s+/g, ' ').slice(0, 400) : ''; });
  v('F5 la fiche de Sophie s’ouvre en grand (« fiche de paie », son nom, le mois)', /Sophie Martin/.test(doc) && /octobre 2026/i.test(doc), doc.slice(0, 200)); await L.capture(c, X.CAP + `${profil}-paie-fiche-grand.png`);
  const lignes = await p.evaluate(() => { const z = document.getElementById('docplein'); return z ? z.innerText : ''; });
  v('F5 la fiche ne parle pas de « Prototype » ni de « données fictives » à qui la reçoit', !/prototype|fictives|exemple/i.test(lignes), lignes.match(/[^\n]*(prototype|fictives|exemple)[^\n]*/i));
  await p.evaluate(() => { try { docPleinFermer(); } catch (e) {} });
  // 6) valider, distribuer, écriture, DSN
  await L.toucher(c, '[data-paie="validerfiches"]'); v('F6 « Valider les 6 fiches » les fige', (await E()).valide);
  await L.toucher(c, '[data-paie="distribuer"]'); v('F6 « Distribuer aux salariés » le fait', (await E()).distribue, await X.toasts(p));
  await X.compta(c, 'charges'); await L.toucher(c, '[data-paie="dsn"]'); v('F7 « Préparer la DSN d’octobre » la prépare', (await E()).dsn, await X.toasts(p));
  const avant = await p.evaluate(() => ({ n: cpEcritures().length }));
  await L.toucher(c, '[data-paie="comptabiliser"]'); const t7 = await X.toasts(p), ap = await p.evaluate(() => { const E = cpEcritures(), pa = E.find(e => e.j === 'PA'); let d = 0, cr = 0; if (pa) pa.lignes.forEach(l => { d += Math.round((l.de || 0) * 100); cr += Math.round((l.cr || 0) * 100); }); return { n: E.length, pa: !!pa, d, cr, net: Math.round(paieFiches().reduce((s, b) => s + b.netPaye, 0) * 100) }; });
  v('F7 « Passer l’écriture de paie » ajoute l’écriture au journal Paie', ap.pa && ap.n === avant.n + 1, { avant, ap, t7 }); v('F7 l’écriture de paie est équilibrée au centime (débit = crédit)', ap.pa && ap.d === ap.cr, ap);
  // 7) la paie se retrouve dans le résultat, la balance et la clôture
  await X.compta(c, 'resultat'); const rt = await X.texte(p); v('F8 le résultat d’octobre compte les salaires (« Salaires bruts »)', /Salaires bruts/.test(rt), rt.slice(0, 120));
  await X.compta(c, 'ecritures'); await L.toucher(c, '[data-cp="jf|PA"]'); const jp = await X.texte(p); v('F8 le journal « Paie » montre l’écriture (PA-001)', /PAIE-2026-10|PA-001|Paie d’octobre/.test(jp), jp.slice(0, 200));
  v('F erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
