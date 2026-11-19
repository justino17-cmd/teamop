// RECONTRÔLE ADVERSE du tour 5 bis — N5 : la POPULATION des textes libres enregistrés, au-delà des 9 sites annoncés. NFD tapé (frappe réelle), enregistré par le vrai bouton, donnée relue.
// ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const pause = ms => L.calme(p, ms); const NFD = n => 'é'.normalize('NFD').repeat(n);
  const fermer = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} });
  const frappe = async (sel, txt) => { await p.locator(sel).first().click(); await p.keyboard.insertText(txt); await pause(120); };
  const res = [];
  const essai = async (nom, ouvrir, champs, bouton, lire) => { await fermer(); await ouvrir(); await pause(400); for (const [s, t] of champs) { if (!await p.evaluate(x => !!document.querySelector(x), s)) { v('N5pop ' + nom + ' : champ atteint (' + s + ')', false, s); return; } await frappe(s, t); }
    await p.locator(bouton).first().click(); await pause(500); const r = await lire(); const ok = typeof r === 'string' && r.length > 0 && r === r.normalize('NFC'); res.push([nom, ok, r && r.length]);
    v('N5pop ' + nom + ' : rangé en NFC', ok, { unites: r && r.length, nfc: r === (r && r.normalize('NFC')) }); };
  await essai('appareil · nom (app-nom)', () => p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].appareils); ACTIONS.clientAppForm({ dataset: { cli: k, n: '-1' } }); window.__k = k; }), [['#app-nom', NFD(40)]], '[data-action="clientAppEnreg"]', () => p.evaluate(() => { const a = CLIENTS[window.__k].appareils; return a[a.length - 1].nom; }));
  await essai('appareil · détail (app-det)', () => p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].appareils); ACTIONS.clientAppForm({ dataset: { cli: k, n: '-1' } }); window.__k = k; }), [['#app-nom', 'Daikin'], ['#app-det', NFD(40)]], '[data-action="clientAppEnreg"]', () => p.evaluate(() => { const a = CLIENTS[window.__k].appareils; return a[a.length - 1].det; }));
  await essai('intervention · motif (n-motif, panneau Créer)', () => p.evaluate(() => panneauCreer('sm', AUJ, '09:00')), [['#n-titre', 'Essai'], ['#n-motif', NFD(60)]], '[data-action="creerOk"]', () => p.evaluate(() => INTS[INTS.length - 1].motif));
  await essai('intervention · motif (m-motif, panneau Modifier)', () => p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); document.querySelector('#m-motif').value = ''; }), [['#m-motif', NFD(60)]], '[data-action="modifierOk"]', () => p.evaluate(() => INTS.find(i => i.id === window.__iid).motif));
  await essai('tâche · note (tk-n)', () => p.evaluate(() => tPanneau(null)), [['#tk-t', 'Essai'], ['#tk-n', NFD(60)]], '[data-tok]', () => p.evaluate(() => TACHES[TACHES.length - 1].note));
  // textareas sans plafond : un motif d'un million de signes s'enregistre-t-il ?
  await fermer(); await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); await pause(400); const mx = await p.evaluate(() => [document.querySelector('#n-motif').getAttribute('maxlength'), document.querySelector('#tk-n') && 1]);
  await frappe('#n-titre', 'Gros motif'); await frappe('#n-motif', 'x'.repeat(1e6)); await p.locator('[data-action="creerOk"]').first().click(); await pause(900);
  const gros = await p.evaluate(() => { const i = INTS[INTS.length - 1]; return i.motif ? i.motif.length : 0; });
  console.log('  · motif de 1 000 000 signes dans le panneau Créer : rangé à', gros, 'signes (maxlength =', mx[0], ')');
  v('N5pop le motif du panneau « Nouvelle intervention » est borné (≤ 600 signes, comme dans la création complète)', gros > 0 && gros <= 600, gros);
  console.log('RES', JSON.stringify(res));
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });
