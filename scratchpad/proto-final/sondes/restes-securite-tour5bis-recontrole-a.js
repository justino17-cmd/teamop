// RECONTRÔLE ADVERSE du tour 5 bis — A : N1 (suppression, annuler), N2 (accent combinant, drapeaux, bourrage de signes combinants), beforeinput (coller, déposer, remplacer, composition).
// Frappe réelle (clavier Playwright, presse-papiers, CDP). ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ».
const L = require('../lib.js'), v = L.v, fs = require('fs');
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  await c.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:' + c.port }).catch(() => {});
  p.on('dialog', d => d.accept().catch(() => {})); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const pause = ms => L.calme(p, ms);
  const cdp = await c.ctx.newCDPSession(p);
  const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, u: e.value.length, g: nbSignes(e.value), a: e.selectionStart, b: e.selectionEnd } : null; }, sel);
  const poser = (sel, val, a, b) => p.evaluate(([s, val, a, b]) => { const e = document.querySelector(s); e.focus(); e.value = val; e.setSelectionRange(a == null ? val.length : a, b == null ? (a == null ? val.length : a) : b); }, [sel, val, a, b]);
  const copier = t => p.evaluate(x => navigator.clipboard.writeText(x), t);
  const ouvrirN = async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauCreer('sm', AUJ, '09:00'); }); await pause(350); };
  const SEL = '#n-titre', abc = n => Array.from({ length: n }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
  const FICHE = async nl => { await p.evaluate(async nl => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); window.__sv = JSON.stringify(CLIENTS[window.__k0]); Object.assign(CLIENTS[window.__k0], nl); aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }, nl); };
  // ═════ N1 : suppressions et annuler sur une fiche plus longue que le plafond (150 pour 120) ═════
  const long = 'N' + 'x'.repeat(149);
  await FICHE({ nom: long }); const NOM = '[data-ci="nom"]';
  const cible = async (sel, pos) => p.evaluate(([s, p0]) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.focus(); e.setSelectionRange(p0 == null ? e.value.length : p0, p0 == null ? e.value.length : p0); }, [sel, pos]);
  let l = await lire(NOM); v('N1 population : nom préouvert à 150 signes, plafond 120', l.g === 150, l.g);
  await cible(NOM); await p.keyboard.press('Backspace'); await pause(80); l = await lire(NOM); v('N1 Backspace : 149', l.g === 149, l.g);
  await p.keyboard.press('Control+z'); await pause(120); l = await lire(NOM); v('N1 Ctrl+Z après Backspace : 150 revenu (pas recoupé à 120 : un « annuler » ne détruit pas la fiche)', l.g === 150, l.g);
  await FICHE({ nom: long }); await cible(NOM, 0); await p.keyboard.press('Delete'); await pause(80); l = await lire(NOM); v('N1 touche Suppr en tête : 149', l.g === 149, l.g);
  await FICHE({ nom: long }); await cible(NOM); await p.keyboard.press('Control+Backspace'); await pause(80); l = await lire(NOM); v('N1 Ctrl+Backspace (mot entier) : le mot part, pas 30 signes de plus (≥ 1 signe restant, pas 120)', l.g < 120 ? true : l.g === 120 ? false : true, l.g);
  await FICHE({ nom: long }); await cible(NOM, 10); await p.evaluate(s => { const e = document.querySelector(s); e.setSelectionRange(10, 20); }, NOM); await p.keyboard.press('Control+x'); await pause(80); l = await lire(NOM); v('N1 couper 10 signes d’un nom de 150 : 140 (pas 120)', l.g === 140, l.g);
  await p.keyboard.press('Control+v'); await pause(120); l = await lire(NOM); v('N1 recoller ces 10 signes : 150 (la fiche d’origine n’est pas rognée)', l.g === 150, l.g);
  await p.keyboard.press('Control+z'); await pause(120); l = await lire(NOM); const lz = l.g; v('N1 puis annuler le collage : ≥ 140 (jamais 120)', lz >= 140, lz);
  await FICHE({ nom: long }); await cible(NOM, 0); await p.keyboard.type('Q'); await pause(80); l = await lire(NOM); v('N1 taper dans un champ déjà trop long : rien n’est coupé (≥ 140)', l.g >= 140, l.g);
  await FICHE({ nom: long }); await cible(NOM); await p.keyboard.press('Control+a'); await p.keyboard.type('Zed'); await pause(80); l = await lire(NOM); v('N1 tout sélectionner + « Zed » : « Zed »', l.v === 'Zed', l.v.slice(0, 20));
  // ═════ N2 ═════
  await ouvrirN(); const b119 = abc(119);
  await poser(SEL, b119); await p.keyboard.type('e'); await pause(50); await p.keyboard.insertText('́'); await pause(80); l = await lire(SEL); v('N2 119 + « e » puis U+0301 : « é » entier, 120 signes', l.g === 120 && l.v.normalize('NFC').endsWith('é'), [l.g, l.u]);
  await poser(SEL, b119); await p.keyboard.insertText('é'); await pause(80); l = await lire(SEL); v('N2 119 + « é » décomposé collé d’un coup : 120 signes', l.g === 120 && l.v.normalize('NFC').endsWith('é'), [l.g, l.u]);
  await poser(SEL, abc(118)); await p.keyboard.insertText('ééé'); await pause(80); l = await lire(SEL); v('N2 118 + trois « é » décomposés : 120 signes (deux gardés), pas de signe cassé', l.g === 120 && l.v.normalize('NFC') === abc(118) + 'éé', [l.g, JSON.stringify(l.v.slice(-4))]);
  await poser(SEL, b119 + 'é'); await p.keyboard.insertText('́'); await pause(80); l = await lire(SEL); v('N2 120/120 + U+0301 : s’empile sur le dernier signe (120 signes)', l.g === 120, [l.g, l.u]);
  await poser(SEL, b119); await p.keyboard.insertText('🇫'); await pause(50); await p.keyboard.insertText('🇷'); await pause(80); l = await lire(SEL); v('N2 119 + drapeau envoyé en deux moitiés : 120 signes, drapeau entier', l.g === 120 && /🇫🇷$/u.test(l.v), [l.g, JSON.stringify(l.v.slice(-6))]);
  await poser(SEL, abc(118)); await p.keyboard.insertText('👨‍👩‍👧'); await pause(80); l = await lire(SEL); v('N2 118 + famille ZWJ (1 signe) : 119 signes', l.g === 119, [l.g, l.u]);
  await poser(SEL, abc(60) + abc(60), 60); await p.keyboard.insertText('é'); await pause(80); l = await lire(SEL); v('N2 plein à 120, insertion « é » décomposé au milieu : refusé (le champ reste à 120 signes)', l.g === 120, [l.g, l.u]);
  // bourrage : des signes combinants ne coûtent aucune place — mais jusqu’où ?
  await poser(SEL, abc(120)); await p.keyboard.insertText('́'.repeat(5000)); await pause(200); l = await lire(SEL);
  v('N2 bourrage : 5000 U+0301 collés à 120/120 : le champ reste borné en UNITÉS aussi (≤ 1 000 unités)', l.u <= 1000, { signes: l.g, unites: l.u });
  await poser(SEL, ''); await p.keyboard.insertText('a' + '́'.repeat(100000)); await pause(300); l = await lire(SEL);
  v('N2 bourrage : 1 lettre + 100 000 accents collés dans un champ vide : borné en unités (≤ 1 000)', l.u <= 1000, { signes: l.g, unites: l.u });
  // ═════ beforeinput ═════
  await ouvrirN(); await copier('ZZZZZZZZZZ'.repeat(5)); await poser(SEL, abc(100)); await p.keyboard.press('Control+v'); await pause(100); l = await lire(SEL);
  v('B coller 50 signes à 100/120 (Ctrl+V réel) : 120, début du collé', l.g === 120 && l.v === abc(100) + 'Z'.repeat(20), [l.g, l.v.slice(-22)]);
  await p.keyboard.press('Control+z'); await pause(150); l = await lire(SEL);
  v('B annuler (Ctrl+Z) après un collage coupé : le champ a changé (revient avant le collage ou au début, jamais inchangé à 120)', l.g < 120, [l.g, l.u]);
  await poser(SEL, abc(120), 10, 30); await copier('Y'.repeat(40)); await p.keyboard.press('Control+v'); await pause(100); l = await lire(SEL);
  v('B remplacer une sélection de 20 signes par 40 : 120 (20 acceptés de plus), à la bonne place', l.g === 120 && l.v.slice(10, 30) === 'Y'.repeat(20) && l.v.slice(30, 34) === abc(120).slice(30, 34), [l.g, l.v.slice(5, 36)]);
  await poser(SEL, abc(120), 10, 30); await copier('Y'.repeat(10)); await p.keyboard.press('Control+v'); await pause(100); l = await lire(SEL);
  v('B remplacer 20 signes par 10 (tient) : 110, curseur après le collé', l.g === 110 && l.a === 20, [l.g, l.a]);
  await poser(SEL, abc(110)); await copier('🇫🇷🇩🇪🇪🇸🇮🇹🇧🇪🇨🇭'); await p.keyboard.press('Control+v'); await pause(100); l = await lire(SEL);
  v('B coller 6 drapeaux à 110/120 : 10 drapeaux au plus, aucun demi-drapeau', l.g === 116 && !/(?<![\u{1F1E6}-\u{1F1FF}])[\u{1F1E6}-\u{1F1FF}](?![\u{1F1E6}-\u{1F1FF}])/u.test(l.v), [l.g, l.u]);
  // composition Hangul : jamo décomposés qui se recomposent, à 119/120
  await poser(SEL, abc(119)); await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 }); await cdp.send('Input.imeSetComposition', { text: '하', selectionStart: 1, selectionEnd: 1 }); await cdp.send('Input.insertText', { text: '한' }); await pause(120); l = await lire(SEL);
  v('B composition Hangul à 119/120 : « 한 » en entier (120 signes)', l.g === 120 && l.v.endsWith('한'), [l.g, JSON.stringify(l.v.slice(-3))]);
  await poser(SEL, abc(120)); await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 }); await cdp.send('Input.insertText', { text: '한' }); await pause(120); l = await lire(SEL);
  v('B composition à 120/120 : le champ ne dépasse pas 120 signes', l.g <= 120, [l.g, l.u]);
  await poser(SEL, abc(118)); await cdp.send('Input.imeSetComposition', { text: '👨‍👩', selectionStart: 3, selectionEnd: 3 }); await cdp.send('Input.insertText', { text: '👨‍👩‍👧' }); await pause(120); l = await lire(SEL);
  v('B composition d’un émoji famille à 118/120 : 119 signes', l.g === 119, [l.g, l.u]);
  // frappe normale d'un caractère dans un champ à 119 : accepté, puis refusé
  await poser(SEL, abc(119)); await p.keyboard.type('xy'); await pause(100); l = await lire(SEL); v('B frappe de deux lettres à 119/120 : une seule passe', l.g === 120 && l.v.endsWith('x'), [l.g, l.v.slice(-3)]);
  // execCommand insertText (autre chemin de saisie : trusted ?)
  await poser(SEL, abc(118)); const ex = await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.setSelectionRange(118, 118); return document.execCommand('insertText', false, 'WXYZ'); }, SEL); await pause(100); l = await lire(SEL);
  v('B execCommand(insertText) « WXYZ » à 118/120 : 120 signes (autre chemin de saisie)', l.g <= 120, [ex, l.g, l.u]);
  // glisser-déposer : un texte sélectionné ailleurs, déposé dans le champ presque plein
  await ouvrirN(); await p.evaluate(() => { const m = document.querySelector('#n-motif'); if (m) m.value = 'GLISSE-MOI-GLISSE-MOI-GLISSE-MOI'; });
  await poser(SEL, abc(100)); const bm = await p.evaluate(() => { const m = document.querySelector('#n-motif'); if (!m) return null; m.focus(); m.setSelectionRange(0, m.value.length); const r = m.getBoundingClientRect(); return { x: r.x + 30, y: r.y + r.height / 2 }; });
  const bt = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + 60, y: r.y + r.height / 2 }; }, SEL);
  if (bm) { await p.mouse.move(bm.x, bm.y); await p.mouse.down(); await p.mouse.move(bm.x + 5, bm.y + 5, { steps: 3 }); await p.mouse.move(bt.x, bt.y, { steps: 8 }); await p.mouse.up(); await pause(300); l = await lire(SEL);
    console.log('  · dépôt : champ =', JSON.stringify(l.v.slice(0, 120)).slice(0, 90), 'u =', l.u);
    v('B DÉPÔT : le glisser-déposer a eu lieu (population)', l.u !== 100, [l.u, l.g]);
    if (l.u !== 100) { v('B dépôt à x≈60 px (vers le 8e signe) à 100/120 : jamais plus de 120 signes', l.g <= 120, l.g); v('B dépôt : le texte est déposé AU POINT de dépôt (pas à la fin ni à l’ancienne sélection)', l.v.indexOf('GLISSE') > 0 && l.v.indexOf('GLISSE') < 30, l.v.indexOf('GLISSE')); } }
  v('aucune erreur de page', erreurs.length === 0, erreurs.slice(0, 3));
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });
