// RECONTRÔLE ADVERSE du tour 5 bis — E : ce que les corrections ont pu CASSER (coût par frappe, gros collage, curseur, annuler, champs téléphone / e-mail / SIREN / numériques atteints à tort).
// ⛔ 127.0.0.1 seulement. RACINE=<dossier> la fait lire une autre copie (comparaison avec la page d'AVANT le tour). « N ✓ · M ✗ ».
const L = require('../lib.js'), v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  await c.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:' + c.port }).catch(() => {});
  p.on('dialog', d => d.accept().catch(() => {})); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const pause = ms => L.calme(p, ms);
  const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, u: e.value.length, g: nbSignes(e.value), a: e.selectionStart, b: e.selectionEnd } : null; }, sel);
  const poser = (sel, val, a) => p.evaluate(([s, val, a]) => { const e = document.querySelector(s); e.focus(); e.value = val; const k = a == null ? val.length : a; try { e.setSelectionRange(k, k); } catch (x) {} }, [sel, val, a]);
  const ouvrirN = async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauCreer('sm', AUJ, '09:00'); }); await pause(350); };
  const SEL = '#n-titre';
  const sortie = {};
  // ───── E1 : coût d'une frappe, champ à plafond (n-titre) contre champ sans plafond (n-motif ?) ─────
  await ouvrirN(); const mm = await p.evaluate(() => { const m = document.querySelector('#n-motif'); return m ? m.getAttribute('maxlength') : 'absent'; });
  const cible2 = mm === null ? '#n-motif' : null;
  const chrono = async (sel, n) => { await poser(sel, ''); const t0 = Date.now(); await p.keyboard.type('a'.repeat(n), { delay: 0 }); return (Date.now() - t0) / n; };
  const a1 = await chrono(SEL, 110); const a2 = cible2 ? await chrono(cible2, 110) : null; sortie.frappe = { avecPlafond: a1, sansPlafond: a2 };
  console.log('  · frappe : ' + a1.toFixed(2) + ' ms/signe avec plafond, ' + (a2 == null ? 'n/a' : a2.toFixed(2)) + ' ms/signe sans plafond (aller-retour compris)');
  v('E1 frappe : moins de 25 ms par signe dans un champ à plafond (aller-retour compris)', a1 < 25, a1);
  // ───── E2 : gros collage (1 million de signes, puis 300 000 « é » décomposés) : la page reste vivante ─────
  for (const [nom, txt] of [['1 000 000 « a »', 'a'.repeat(1e6)], ['300 000 « é » décomposés', 'é'.normalize('NFD').repeat(3e5)], ['200 000 émojis famille', '👨‍👩‍👧'.repeat(2e5)]]) {
    await poser(SEL, ''); const t0 = Date.now(); await Promise.race([p.keyboard.insertText(txt), new Promise(r => setTimeout(r, 60000))]); const dt = Date.now() - t0;
    const rep = Date.now(); await p.evaluate(() => 1); const l = await lire(SEL); const rt = Date.now() - rep;
    console.log('  · collage de ' + nom + ' : ' + dt + ' ms, état : ' + l.g + ' signes / ' + l.u + ' unités'); sortie['collage ' + nom] = { ms: dt, g: l && l.g };
    v('E2 collage de ' + nom + ' : rendu en moins de 5 s, champ à 120 signes au plus', dt < 5000 && l.g <= 120, { ms: dt, g: l.g, u: l.u });
  }
  // ───── E3 : curseur ─────
  await ouvrirN(); await poser(SEL, 'abcdefghij', 5); await p.keyboard.type('X'); let l = await lire(SEL); v('E3 frappe au milieu : « abcdeXfghij », curseur à 6', l.v === 'abcdeXfghij' && l.a === 6, l);
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Backspace'); l = await lire(SEL); v('E3 flèche gauche puis Backspace au milieu : « abcdXfghij »', l.v === 'abcdXfghij' && l.a === 4, l);
  await poser(SEL, 'a'.repeat(118) + 'bc', 60); await p.evaluate(() => navigator.clipboard.writeText('QQQQQ')); await p.keyboard.press('Control+v'); l = await lire(SEL); v('E3 coller 5 signes au milieu d’un champ presque plein (118+2) : rien ne passe, curseur reste', l.g === 120 && l.a === 60, [l.g, l.a]);
  await poser(SEL, 'a'.repeat(110), 10); await p.evaluate(() => navigator.clipboard.writeText('QQQQQQQQQQQQQQQQQQQQ')); await p.keyboard.press('Control+v'); l = await lire(SEL); v('E3 coller 20 signes à la position 10 d’un champ de 110 : 10 acceptés, curseur à 20', l.g === 120 && l.a === 20 && l.v.slice(10, 20) === 'Q'.repeat(10), [l.g, l.a]);
  // ───── E4 : annuler ─────
  await poser(SEL, ''); await p.keyboard.type('hello'); await p.keyboard.press('Control+z'); await pause(80); l = await lire(SEL); v('E4 Ctrl+Z après une frappe : champ vide', l.v === '', l.v);
  await p.keyboard.press('Control+Shift+z'); await pause(80); l = await lire(SEL); v('E4 Rétablir : « hello »', l.v === 'hello', l.v);
  await poser(SEL, ''); await p.keyboard.type('debut-'); await p.evaluate(() => navigator.clipboard.writeText('court')); await p.keyboard.press('Control+v'); await p.keyboard.press('Control+z'); await pause(80); l = await lire(SEL); v('E4 coller un texte court (non coupé) puis Ctrl+Z : le collage seul est retiré', l.v === 'debut-', l.v);
  await poser(SEL, 'a'.repeat(100)); await p.evaluate(() => navigator.clipboard.writeText('Z'.repeat(50))); await p.keyboard.press('Control+v'); l = await lire(SEL); const apres = l.u; await p.keyboard.press('Control+z'); await pause(80); l = await lire(SEL);
  console.log('  · annuler après un collage COUPÉ (100 → ' + apres + ') : ' + l.u + ' unités'); sortie.annulerCoupe = { avant: apres, apres: l.u };
  v('E4 collage coupé (setRangeText) puis Ctrl+Z : le collage coupé est retiré (retour à 100), pas une frappe sans rapport', l.u === 100, [apres, l.u]);
  // ───── E5 : champs atteints à tort — téléphone, e-mail, SIREN, numériques : la saisie normale est intacte ─────
  const essais = [
    ['CREA tel', async () => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600); await p.evaluate(() => document.querySelector('[data-cnouveau="1"]').click()); await pause(400); }, '[data-cnv="tel"]', '05 46 12 34 56', '05 46 12 34 56'],
    ['CREA mail', null, '[data-cnv="mail"]', 'jean.dupont+essai@exemple.fr', 'jean.dupont+essai@exemple.fr'],
    ['CREA nom (accents)', null, '[data-cnv="nom"]', 'Société Générale d’Étanchéité', 'Société Générale d’Étanchéité'],
    ['CREA titre', null, '[data-cchamp="titre"]', 'Remplacement électrovanne', 'Remplacement électrovanne'],
    ['dvn-tel', async () => { await p.evaluate(() => { try { fermerCreation(); fermerPanneau(); } catch (e) {} DVN_F = null; dvNouveau(); }); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="nv|1"]').click()); await pause(400); }, '#dvn-tel', '0546123456', '0546123456'],
    ['dvn-mail', null, '#dvn-mail', 'a.b@exemple.fr', 'a.b@exemple.fr'],
    ['cs-tel', async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} ACTIONS.clientSeul(); }); await pause(500); }, '#cs-tel', '+33 6 12 34 56 78', '+33 6 12 34 56 78'],
    ['cs-mail', null, '#cs-mail', 'x@y.fr', 'x@y.fr'],
    ['pa-m (montant)', async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} paieReleve(EQUIPE.find(o => o.actif).k); }); await pause(400); }, '#pa-m', '1234,56', '1234,56'],
    ['pa-lib', null, '#pa-lib', 'Prime d’astreinte 🇫🇷', 'Prime d’astreinte 🇫🇷'],
  ];
  let faits = 0;
  for (const [nom, ouvrir, sel, tape, attendu] of essais) {
    if (ouvrir) await ouvrir(); const ok = await p.evaluate(s => !!document.querySelector(s), sel); if (!ok) { console.log('  · non atteint : ' + nom); continue; } faits++;
    await poser(sel, ''); await p.keyboard.type(tape, { delay: 0 }); l = await lire(sel);
    v('E5 ' + nom + ' : la saisie au clavier est intacte (« ' + attendu + ' »), curseur en fin', l.v === attendu && l.a === attendu.length, l);
  }
  v('E5 population : au moins 8 champs atteints', faits >= 8, faits);
  // champs date/heure (input sans maxlength ?) : les champs [maxlength] de type autre que text
  const tm = await p.evaluate(() => { const r = {}; document.querySelectorAll('input[maxlength]').forEach(e => { r[e.type] = (r[e.type] || 0) + 1; }); return r; }); console.log('  · types de champs à maxlength vus à l’écran : ' + JSON.stringify(tm));
  v('aucune erreur de page', erreurs.length === 0, erreurs.slice(0, 3));
  console.log('SORTIE', JSON.stringify(sortie));
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });
