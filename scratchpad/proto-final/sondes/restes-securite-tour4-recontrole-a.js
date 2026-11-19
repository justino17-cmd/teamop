// RECONTRÔLE ADVERSE du tour 4 (19 novembre 2026), partie A : frappe réelle, collage, Entrée, drapeaux/ZWJ/peaux en limite, CRLF, plafond et plafond+1, accès 3 puis 4 lignes, signes de contrôle.
// Sondes NEUVES (n'importe rien de restes-securite-tour4.js). 127.0.0.1 seulement. « N ✓ · M ✗ ».
const L = require('../lib.js');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
  const msg = () => p.evaluate(() => { const t = window.__t.join(' | '); window.__t = []; return t; });
  const ouvrirFiche = async () => { await p.evaluate(async () => { window.__k = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel && CLIENTS[k].mail); aller('client-x-' + window.__k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }); };
  const acces = () => p.evaluate(() => CLIENTS[window.__k].acces);
  const vider = async sel => { await p.locator(sel).focus(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); };
  const enreg = async () => { await p.evaluate(() => { window.__t = []; }); await p.locator('[data-action="clientEnreg"]').click(); await L.calme(p, 400); return msg(); };
  const lignesTapees = async ls => { await vider('[data-ci="acces"]'); for (let i = 0; i < ls.length; i++) { if (i) await p.keyboard.press('Enter'); await p.keyboard.type(ls[i]); } };
  await ouvrirFiche();

  // ── (1) consignes d'accès ──
  await lignesTapees(['Code portail 4821', 'Sonner chez la gardienne', 'Local à gauche']);
  const tape = await p.evaluate(() => document.querySelector('[data-ci="acces"]').value);
  L.v('(1) population : 3 lignes tapées au clavier (Entrée réelle) sont dans le champ', tape.split('\n').length === 3, tape);
  let m = await enreg(); let a = await acces();
  L.v('(1) 3 lignes tapées → rangées sur 3 lignes, sans mot collé', a === 'Code portail 4821\nSonner chez la gardienne\nLocal à gauche' && !/4821Sonner|gardienneLocal/.test(a), [a, m]);
  // réaffichage : le champ remontre 3 lignes
  const reaff = await p.evaluate(() => { rendre(); return document.querySelector('[data-ci="acces"]').value; }); await L.calme(p, 300);
  L.v('(1) après réaffichage de la fiche, le champ montre toujours 3 lignes', reaff === a, reaff);
  // 4 lignes tapées
  const avant4 = await acces();
  await lignesTapees(['L1', 'L2', 'L3', 'L4']); m = await enreg();
  L.v('(1) 4 lignes tapées : REFUS avec phrase (« 3 lignes au plus ») et rien d’enregistré', /3 lignes au plus/.test(m) && /rien n’a été enregistré/.test(m) && (await acces()) === avant4, [m, await acces()]);
  // 3 lignes + 2 Entrées finales (lignes vides) → accepté sur 3
  await lignesTapees(['A1', 'A2', 'A3', '', '']); m = await enreg(); a = await acces();
  L.v('(1) 3 lignes + 2 lignes vides en fin : accepté, rangé sur 3 lignes', a === 'A1\nA2\nA3', [a, m]);
  // lignes vides entre : 5 lignes brutes → 3
  await lignesTapees(['B1', '', 'B2', '', 'B3']); m = await enreg(); a = await acces();
  L.v('(1) 5 lignes brutes dont 2 vides entre : rangé sur 3 lignes (les vides tombent)', a === 'B1\nB2\nB3', [a, m]);
  // 3 lignes + 1 ligne faite d'espaces + ligne 4 : 4 lignes réelles
  await lignesTapees(['C1', 'C2', '   ', 'C3', 'C4']); const av = await acces(); m = await enreg();
  L.v('(1) 4 lignes réelles séparées par une ligne d’espaces : REFUS', /3 lignes au plus/.test(m) && (await acces()) === av, [m, await acces()]);
  // CRLF collé (insertText) — le navigateur normalise-t-il ?
  await vider('[data-ci="acces"]'); await p.keyboard.insertText('D1\r\nD2\r\nD3'); const crlf = await p.evaluate(() => document.querySelector('[data-ci="acces"]').value); m = await enreg(); a = await acces();
  L.v('(1) CRLF collé (D1\\r\\nD2\\r\\nD3) : 3 lignes rangées, aucun \\r restant, aucun mot collé', a === 'D1\nD2\nD3' && !/\r/.test(a), [JSON.stringify(crlf), JSON.stringify(a), m]);
  // CR seul (vieux Mac) collé
  await vider('[data-ci="acces"]'); await p.keyboard.insertText('E1\rE2\rE3'); m = await enreg(); a = await acces();
  L.v('(1) CR seul collé (E1\\rE2\\rE3) : 3 lignes, pas de mot collé', a === 'E1\nE2\nE3', [JSON.stringify(a), m]);
  // U+2028 / U+0085 / vertical tab / form feed
  await p.evaluate(() => window.__set0 = (s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'F1 F2\u000bF3\u000cF4')); m = await enreg(); a = await acces();
  L.v('(1) U+2028 / tab verticale / saut de page : jamais collés (F1F2…) ; 4 segments → refus ou espaces', !/F1F2|F2F3|F3F4/.test(a) || /3 lignes/.test(m), [JSON.stringify(a), m]);
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'G1\u0085G2')); m = await enreg(); a = await acces();
  L.v('(1) NEL (U+0085) entre deux mots : rangé sans les coller', !/G1G2/.test(a), [JSON.stringify(a), m]);
  // signes de contrôle
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'Code\u0007portail\u0001 4821\u007f\nSonner\u001b ici')); m = await enreg(); a = await acces();
  L.v('(1) signes de contrôle (BEL, SOH, DEL, ESC) retirés', !/[\u0000-\u0009\u000b-\u001f\u007f]/.test(a), JSON.stringify(a));
  L.v('(1) … mais retirés SANS coller : « Code\\u0007portail » devient « Codeportail » (constat)', /Code portail/.test(a) || /Codeportail/.test(a), JSON.stringify(a));
  // invisibles : ligne faite de U+200B
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'H1\n​\nH2\n​\nH3')); const av2 = await acces(); m = await enreg(); a = await acces();
  L.v('(1) lignes faites de U+200B (invisibles) : comptées comme lignes ? (constat)', true, JSON.stringify([a, m.slice(0, 120)]));
  // 66+1+66+1+67
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'x'.repeat(66) + '\n' + 'y'.repeat(66) + '\n' + 'z'.repeat(67))); const av3 = await acces(); m = await enreg();
  L.v('(1+2) 66+\\n+66+\\n+67 = 201 signes : refus « limité à 200 », rien d’enregistré', /limité à 200 signes/.test(m) && /en fait 201/.test(m) && (await acces()) === av3, [m.slice(0, 160), (await acces()).length]);
  await p.evaluate(() => window.__set0('[data-ci="acces"]', 'x'.repeat(66) + '\n' + 'y'.repeat(66) + '\n' + 'z'.repeat(66))); m = await enreg(); a = await acces();
  L.v('(1+2) 66+\\n+66+\\n+66 = 200 signes : enregistré entier', a.length === 200 && a.split('\n').length === 3, [a.length, m.slice(0, 100)]);
  // frappe réelle au plafond : 300 signes tapés
  await vider('[data-ci="acces"]'); await p.keyboard.insertText('w'.repeat(300)); const t300 = await p.evaluate(() => document.querySelector('[data-ci="acces"]').value.length);
  L.v('(1) 300 signes collés dans le champ : il s’arrête à 200', t300 === 200, t300);
  // 3 Entrées (4 lignes) + texte à la limite: 4 lignes de 49 = 196+3
  await lignesTapees(['q'.repeat(49), 'r'.repeat(49), 's'.repeat(49), 't'.repeat(49)]); const tt = await p.evaluate(() => document.querySelector('[data-ci="acces"]').value.length); const av4 = await acces(); m = await enreg();
  L.v('(1) 4 lignes de 49 signes (199 au total) : refus 4 lignes, rien d’enregistré', /3 lignes au plus/.test(m) && (await acces()) === av4, [tt, m.slice(0, 100)]);
  // Entrée dans le textarea ne déclenche pas Enregistrer / n'envoie pas un formulaire
  const av5 = await acces(); await vider('[data-ci="acces"]'); await p.keyboard.type('I1'); await p.keyboard.press('Enter'); await p.keyboard.type('I2'); await L.calme(p, 300);
  L.v('(1) Entrée dans le textarea écrit une ligne, n’enregistre rien (la valeur gardée n’a pas bougé)', (await acces()) === av5, [av5, await acces()]);

  // ── (2) plafond, nom exactement au plafond et +1, par frappe réelle puis par valeur ──
  await ouvrirFiche();
  const U = (n, pre) => (pre + 'x'.repeat(n)).slice(0, n);
  for (const [champ, sel, max] of [['nom', '[data-ci="nom"]', 120], ['contact', '[data-ci="contact"]', 120], ['mail', '[data-ci="mail"]', 120], ['adr', '[data-ci="adr"]', 160]]) {
    await ouvrirFiche();
    // frappe réelle de max+1 signes : le champ s'arrête à max
    await vider(sel); await p.keyboard.insertText(champ === 'mail' ? U(max - 10, 'm') + '@exemple.fr' + 'zz' : U(max + 1, 'N'));
    const lu = await p.evaluate(s => document.querySelector(s).value.length, sel);
    L.v('(2/3) ' + champ + ' : max+1 signes collés → le champ s’arrête à ' + max, lu <= max, lu);
  }
  // nom à 120 / 121 par valeur
  await ouvrirFiche(); const n120 = U(120, 'Alpha'); await p.evaluate(v => window.__set0('[data-ci="nom"]', v), n120); m = await enreg();
  L.v('(2) nom à 120 : enregistré entier', (await p.evaluate(() => CLIENTS[window.__k].nom)) === n120, m.slice(0, 100));
  await ouvrirFiche(); const n121 = U(121, 'Beta'); const nAv = await p.evaluate(() => CLIENTS[window.__k].nom); await p.evaluate(v => window.__set0('[data-ci="nom"]', v), n121); m = await enreg();
  L.v('(2) nom à 121 : refusé avec phrase, ancien nom intact', /limité à 120/.test(m) && /rien n’a été enregistré/.test(m) && (await p.evaluate(() => CLIENTS[window.__k].nom)) === nAv, [m.slice(0, 160)]);
  // blancs doublés : 130 signes bruts qui font 120 nettoyés
  const dbl = (U(60, 'Gamma') + '      ' + U(54, 'd')).slice(0, 130); await ouvrirFiche(); await p.evaluate(v => window.__set0('[data-ci="nom"]', v), dbl); m = await enreg();
  const gard = await p.evaluate(() => CLIENTS[window.__k].nom);
  L.v('(2) nom de ' + dbl.length + ' signes bruts dont 6 espaces (120 propres) : accepté, espaces repliés', gard.length === 115 || gard.length <= 120, [gard.length, m.slice(0, 120)]);
  // guillemets / chevrons : retirés AVANT de compter
  await ouvrirFiche(); const gui = '"' + U(119, 'Delta') + '"<>'; await p.evaluate(v => window.__set0('[data-ci="nom"]', v), gui); m = await enreg();
  L.v('(2) nom de 122 signes dont 3 guillemets/chevrons (119 propres) : accepté', (await p.evaluate(() => CLIENTS[window.__k].nom.length)) === 119, m.slice(0, 120));
  // nom de 120 DRAPEAUX (240 unités) par valeur : 120 signes → ok ; 121 → refus
  await ouvrirFiche(); await p.evaluate(() => window.__set0('[data-ci="nom"]', '🇫🇷'.repeat(120))); m = await enreg();
  const f120 = await p.evaluate(() => nbSignes(CLIENTS[window.__k].nom));
  L.v('(2/5) nom de 120 drapeaux : 120 signes, enregistré entier', f120 === 120, [f120, m.slice(0, 100)]);
  await ouvrirFiche(); const nAv2 = await p.evaluate(() => CLIENTS[window.__k].nom); await p.evaluate(() => window.__set0('[data-ci="nom"]', '🇫🇷'.repeat(121))); m = await enreg();
  L.v('(2/5) nom de 121 drapeaux : refusé, « en fait 121 »', /en fait 121/.test(m) && (await p.evaluate(() => CLIENTS[window.__k].nom)) === nAv2, m.slice(0, 160));
  // ce que l'utilisateur peut TAPER : drapeaux collés dans le champ (maxlength en unités UTF-16)
  await ouvrirFiche(); await vider('[data-ci="nom"]'); await p.keyboard.insertText('🇫🇷'.repeat(80)); const lf = await p.evaluate(() => { const v = document.querySelector('[data-ci="nom"]').value; return { unites: v.length, signes: nbSignes(v), orph: /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v) }; });
  console.log('  · 80 drapeaux collés dans le champ Nom (maxlength 120) :', JSON.stringify(lf));
  L.v('(3/5) collage de 80 drapeaux dans Nom : aucune moitié de surrogate dans le champ', !lf.orph, lf);
  // 'a' + drapeaux : le maxlength coupe au milieu d'un drapeau ?
  await vider('[data-ci="nom"]'); await p.keyboard.insertText('a' + '🇫🇷'.repeat(80)); const lf2 = await p.evaluate(() => { const v = document.querySelector('[data-ci="nom"]').value; const g = graphemes(v); return { unites: v.length, signes: g.length, dernier: g[g.length - 1], orph: /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v) }; });
  console.log('  · « a » + 80 drapeaux collés (maxlength coupe à 120 unités) :', JSON.stringify(lf2));
  L.v('(3/5) « a » + 80 drapeaux : le maxlength ne laisse pas une moitié de surrogate', !lf2.orph, lf2);
  L.v('(3/5) « a » + 80 drapeaux : le dernier signe du champ est un drapeau ENTIER (pas une lettre régionale seule)', /^\p{RI}\p{RI}$/u.test(lf2.dernier || ''), lf2);
  m = await enreg(); const sauve = await p.evaluate(() => { const n = CLIENTS[window.__k].nom; const g = graphemes(n); return { signes: g.length, dernier: g[g.length - 1] }; });
  console.log('  · enregistré :', JSON.stringify(sauve), m.slice(0, 100));

  // ── (5) coupeSure : drapeaux, ZWJ, peaux, keycap, tag, VS16, combinants, en limite ──
  const r = await p.evaluate(() => {
    const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t);
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' }), G = t => Array.from(seg.segment(t), x => x.segment);
    const ex = { drapeau: '🇫🇷', famille: '👨‍👩‍👧‍👦', peau: '👍🏽', couple: '👩🏾‍❤️‍💋‍👨🏻', keycap: '1️⃣', angleterre: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', coeur: '❤️', ecomb: 'é', hangul: '한', ZWJ_pro: '👩‍💻', arcenciel: '🏳️‍🌈' };
    const out = [];
    for (const [nom, e] of Object.entries(ex)) for (const n of [1, 5, 40, 120]) {
      // n−1 lettres + e + « fin » : couper à n doit garder e ENTIER ; couper à n−1 doit le RETIRER entièrement
      const t = 'a'.repeat(n - 1) + e + 'fin', r1 = coupeSure(t, n), r0 = coupeSure(t, n - 1);
      out.push({ nom, n, ok: r1 === 'a'.repeat(n - 1) + e && !orph(r1) && nbSignes(r1) === n && r0 === 'a'.repeat(n - 1) && !orph(r0) });
    }
    // plafond+1 sur émojis uniquement, jamais d'orphelin ni de dépassement
    const mixte = [];
    for (const [nom, e] of Object.entries(ex)) for (const n of [3, 40, 120, 160, 200]) { const t = e.repeat(n + 3), r = coupeSure(t, n); mixte.push({ nom, n, ok: nbSignes(r) === n && !orph(r) && r === e.repeat(n) }); }
    // impair : drapeau + lettre régionale seule
    const impair = coupeSure('🇫🇷🇩', 1), impair2 = coupeSure('a🇫', 5);
    return { out, mixte, impair, impair2, pasDepasse: coupeSure('abc', 10), vide: coupeSure('', 3), zero: coupeSure('abc', 0), neg: coupeSure('abc', -1) };
  });
  L.v('(5) 11 émojis/séquences × 4 plafonds : n−1 lettres + émoji tient ENTIER à n, disparaît entier à n−1, jamais d’orphelin (' + r.out.length + ' cas)', r.out.length === 44 && r.out.every(x => x.ok), r.out.filter(x => !x.ok));
  L.v('(5) 11 séquences répétées (n+3 fois) coupées à 3/40/120/160/200 : exactement n signes entiers (' + r.mixte.length + ' cas)', r.mixte.length === 55 && r.mixte.every(x => x.ok), r.mixte.filter(x => !x.ok));
  L.v('(5) 🇫🇷🇩 à 1 signe → drapeau entier ; « a🇫 » à 5 inchangé', r.impair === '🇫🇷' && r.impair2 === 'a🇫', [r.impair, r.impair2]);
  L.v('(5) entrées limites : n ≥ longueur inchangé, vide, 0 et négatif sans exception', r.pasDepasse === 'abc' && r.vide === '' && typeof r.zero === 'string' && typeof r.neg === 'string', [r.zero, r.neg]);
  L.v('(5) aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
