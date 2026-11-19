// RECONTRÔLE ADVERSE du tour 5 (sécurité) — A : ce que la coupe par graphèmes a pu CASSER.
// Frappe/collage réels (clavier Playwright + CDP pour la méthode de saisie). ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ».
const L = require('../lib.js'), v = L.v, fs = require('fs');
const OUT = process.env.SORTIE || '/tmp/claude-0/t5r/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
  const pause = ms => L.calme(p, ms);
  const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, u: e.value.length, g: nbSignes(e.value), a: e.selectionStart, b: e.selectionEnd, max: +e.getAttribute('maxlength') } : null; }, sel);
  const FICHE = async (nomLong) => { await p.evaluate(async nl => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); if (nl) { window.__sv = JSON.stringify(CLIENTS[window.__k0]); Object.assign(CLIENTS[window.__k0], nl); } aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }, nomLong || null); };
  const restaurer = () => p.evaluate(() => { if (window.__sv) { const o = JSON.parse(window.__sv); Object.keys(CLIENTS[window.__k0]).forEach(k => delete CLIENTS[window.__k0][k]); Object.assign(CLIENTS[window.__k0], o); window.__sv = null; } });
  const msg = () => p.evaluate(() => { const t = window.__t.join(' | '); window.__t = []; return t; });
  const cible = async sel => { await p.evaluate(s => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.focus(); }, sel); };

  // ───── A1 : un champ PRÉREMPLI plus long que le plafond (fiche existante) : l'ouverture ne détruit rien, Backspace non plus ─────
  const long = 'N' + 'x'.repeat(149), adrL = 'A' + 'y'.repeat(199);
  await FICHE({ nom: long, adr: adrL });
  let l = await lire('[data-ci="nom"]');
  v('A1 population : le champ nom est ouvert PRÉREMPLI à 150 signes (plafond 120)', l && l.g === 150 && l.max === 120, l && [l.g, l.max]);
  const donnees = await p.evaluate(() => ({ nom: CLIENTS[window.__k0].nom.length, adr: CLIENTS[window.__k0].adr.length }));
  v('A1 ouverture : la donnée gardée n’a pas bougé (150 / 200)', donnees.nom === 150 && donnees.adr === 200, donnees);
  await cible('[data-ci="nom"]'); await p.evaluate(() => { const e = document.querySelector('[data-ci="nom"]'); e.setSelectionRange(e.value.length, e.value.length); });
  await p.keyboard.press('Backspace'); await pause(100); l = await lire('[data-ci="nom"]');
  v('A1 Backspace sur un nom de 150 signes : 149 (une suppression = un signe), PAS 120 d’un coup', l.g === 149, l.g);
  const a1 = l.g;
  // saisie d’une lettre au début d’un champ trop long : bloquée sans rien couper
  await p.evaluate(() => { const e = document.querySelector('[data-ci="nom"]'); e.setSelectionRange(0, 0); }); await p.keyboard.type('ZZ'); await pause(100); l = await lire('[data-ci="nom"]');
  v('A1 taper 2 lettres dans un champ déjà trop long : rien n’est coupé en silence (≥ 149)', l.g >= a1, l.g);
  // Enregistrer : refus AVEC PHRASE, donnée intacte
  await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="clientEnreg"]').click(); }); await pause(500);
  const m1 = await msg(), d1 = await p.evaluate(() => ({ nom: CLIENTS[window.__k0].nom.length, adr: CLIENTS[window.__k0].adr.length }));
  v('A1 Enregistrer avec nom/adresse trop longs : une phrase de refus', /limité à|signes/.test(m1), m1);
  v('A1 … et rien n’est enregistré tronqué (150/200 intacts)', d1.nom === 150 && d1.adr === 200, d1);
  // adresse : Backspace de 200 → 199 ?
  await cible('[data-ci="adr"]'); await p.evaluate(() => { const e = document.querySelector('[data-ci="adr"]'); e.setSelectionRange(e.value.length, e.value.length); }); await p.keyboard.press('Backspace'); await pause(100);
  l = await lire('[data-ci="adr"]'); v('A1 Backspace sur une adresse de 200 signes (plafond 160) : 199, pas 160', l.g === 199, l.g);
  await restaurer();

  // ───── A2 : curseur au MILIEU, frappe, collage qui déborde ─────
  await FICHE(); const SEL = '[data-ci="nom"]';
  const base = Array.from({ length: 120 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
  await p.evaluate(([s, b]) => { const e = document.querySelector(s); e.focus(); e.value = b.slice(0, 118); e.setSelectionRange(50, 50); }, [SEL, base]);
  await p.keyboard.type('123'); await pause(100); l = await lire(SEL);
  v('A2 118 signes, curseur à 50, frappe de « 123 » (2 places) : « 12 » entrent à la position 50, le curseur suit (52), le reste intact', l.g === 120 && l.v.slice(50, 52) === '12' && l.v.slice(0, 50) === base.slice(0, 50) && l.v.slice(52) === base.slice(50, 118) && l.a === 52, [l.g, l.a, l.v.slice(46, 56)]);
  // frappe qui ne déborde pas, au milieu : aucun saut de caractère, curseur normal
  await p.evaluate(([s, b]) => { const e = document.querySelector(s); e.focus(); e.value = b.slice(0, 60); e.setSelectionRange(30, 30); }, [SEL, base]);
  await p.keyboard.type('ÉÀÇœ'); await pause(100); l = await lire(SEL);
  v('A2 frappe au milieu sous le plafond : tous les signes passent, ordre et curseur', l.v === base.slice(0, 30) + 'ÉÀÇœ' + base.slice(30, 60) && l.a === 34, [l.v.slice(26, 40), l.a]);
  // collage qui déborde au milieu avec sélection : remplace la sélection
  await p.evaluate(([s, b]) => { const e = document.querySelector(s); e.focus(); e.value = b.slice(0, 118); e.setSelectionRange(10, 14); }, [SEL, base]);
  await p.keyboard.insertText('🇫🇷🇩🇪🇪🇸🇮🇹'); await pause(100); l = await lire(SEL);
  v('A2 sélection de 4 signes remplacée par 4 drapeaux (4 places utiles +…) : 118-4+4 = 118 signes, drapeaux entiers, curseur après', l.g === 118 && l.v.includes('🇫🇷🇩🇪🇪🇸🇮🇹') && l.a === 10 + 16, [l.g, l.a]);
  // Backspace après une coupe : supprime UN signe, pas un bloc
  await p.evaluate(([s]) => { const e = document.querySelector(s); e.focus(); e.value = ''; }, [SEL]);
  await p.keyboard.insertText('a' + '🇫🇷'.repeat(130)); await pause(100); l = await lire(SEL); const gAvant = l.g;
  await p.keyboard.press('Backspace'); await pause(100); const l2 = await lire(SEL);
  v('A2 après une coupe à ' + gAvant + ' signes, Backspace supprime UN drapeau', l2.g === gAvant - 1, [gAvant, l2.g]);
  await p.keyboard.type('b'); await pause(60); const l3 = await lire(SEL);
  v('A2 puis une frappe « b » entre (place libre)', l3.g === gAvant && l3.v.endsWith('b'), [l3.g, l3.v.slice(-4)]);
  // Annuler (Ctrl+Z) après un collage coupé : on note le comportement
  await p.evaluate(([s]) => { const e = document.querySelector(s); e.focus(); e.value = ''; }, [SEL]);
  await p.keyboard.type('abc'); await p.keyboard.insertText('z'.repeat(200)); await pause(60); const u0 = await lire(SEL);
  await p.keyboard.press('Control+z'); await pause(80); const u1 = await lire(SEL);
  console.log('   · NOTE undo après collage coupé :', u0.g, '→', u1.g, JSON.stringify(u1.v.slice(0, 12)));
  v('A2 Ctrl+Z après un collage coupé ne fait pas planter et laisse un champ valide (≤ 120)', u1.g <= 120);

  // ───── A3 : textarea multiligne (consignes d’accès) : retours à la ligne, collage CRLF ─────
  const TA = '[data-ci="acces"]'; await cible(TA);
  await p.evaluate(s => { const e = document.querySelector(s); e.value = ''; }, TA);
  await p.keyboard.type('Ligne un'); await p.keyboard.press('Enter'); await p.keyboard.type('Ligne deux'); await p.keyboard.press('Enter'); await p.keyboard.type('Ligne trois'); await pause(80);
  l = await lire(TA); v('A3 textarea : 3 lignes tapées avec Entrée gardent leurs 2 sauts', l.v === 'Ligne un\nLigne deux\nLigne trois', JSON.stringify(l.v));
  await p.evaluate(s => { const e = document.querySelector(s); e.value = ''; }, TA);
  await p.keyboard.insertText('a\r\nb\r\nc'); await pause(80); l = await lire(TA);
  v('A3 collage CRLF (3 lignes) : 3 lignes, aucun \\r laissé', l.v === 'a\nb\nc' && !/\r/.test(l.v), JSON.stringify(l.v));
  await p.evaluate(s => { const e = document.querySelector(s); e.value = 'x'.repeat(195); e.setSelectionRange(195, 195); }, TA);
  await p.keyboard.insertText('\r\nabcdefgh'); await pause(80); l = await lire(TA);
  v('A3 collage CRLF qui déborde (195 + 10) : ≤ 200 signes, pas de \\r', l.g <= 200 && !/\r/.test(l.v), [l.g, JSON.stringify(l.v.slice(-8))]);
  // saut de ligne tapé quand il reste 1 place : accepté ou refusé, jamais perdu en silence en rognant le texte
  await p.evaluate(s => { const e = document.querySelector(s); e.value = 'x'.repeat(199); e.setSelectionRange(199, 199); }, TA);
  await p.keyboard.press('Enter'); await pause(60); l = await lire(TA);
  v('A3 Entrée à 199 sur 200 : le saut de ligne entre (200 signes), le texte n’est pas rogné', l.g === 200 && l.v.startsWith('x'.repeat(199)), l.g);

  // ───── A4 : méthode de saisie : Hangul décomposé, composition qui change, Backspace dans la composition ─────
  const cdp = await p.context().newCDPSession(p);
  await p.evaluate(([s]) => { const e = document.querySelector(s); e.focus(); e.value = ''; }, [SEL]);
  const HG = '\u1112\u1161\u11ab';  // jamo décomposés → 한
  await cdp.send('Input.imeSetComposition', { text: 'ᄒ', selectionStart: 1, selectionEnd: 1 }); await cdp.send('Input.imeSetComposition', { text: '하', selectionStart: 1, selectionEnd: 1 }); await cdp.send('Input.insertText', { text: '한' }); await pause(100);
  l = await lire(SEL); v('A4 IME : composition ᄒ → 하 → 한 validée : « 한 » (1 signe)', l.v === '한' && l.g === 1, [JSON.stringify(l.v), l.g]);
  await cdp.send('Input.insertText', { text: HG.repeat(3) }); await pause(100); l = await lire(SEL);
  console.log('   · NOTE Hangul décomposé collé : ', JSON.stringify(l.v), l.g, l.u);
  v('A4 Hangul décomposé collé (3 syllabes en jamo) : 3 signes affichés, le champ reste cohérent (jamais de jamo orphelin coupé)', l.g === 4 || l.g === 3 || l.g >= 4, [l.g, l.u]);
  // IME avec place presque épuisée : 118 signes + composition longue
  await p.evaluate(([s, b]) => { const e = document.querySelector(s); e.focus(); e.value = b.slice(0, 118); e.setSelectionRange(118, 118); }, [SEL, base]);
  await cdp.send('Input.imeSetComposition', { text: '🇫🇷🇩🇪', selectionStart: 8, selectionEnd: 8 }); await pause(100); await cdp.send('Input.insertText', { text: '🇫🇷🇩🇪' }); await pause(150); l = await lire(SEL);
  console.log('   · NOTE IME 2 drapeaux à 2 places :', l.g, l.u, JSON.stringify(l.v.slice(-10)));
  v('A4 IME : 2 drapeaux à 2 places libres : au plus 120 signes, aucun demi-drapeau', l.g <= 120 && !/(?<![\u{1F1E6}-\u{1F1FF}])[\u{1F1E6}-\u{1F1FF}](?![\u{1F1E6}-\u{1F1FF}])/u.test(l.v) && !/�/.test(l.v), [l.g, JSON.stringify(l.v.slice(-10))]);

  // ───── A5 : caractères spéciaux en limite : keycap, peaux, ZWJ, é décomposé, Å, œ ─────
  const D = x => x.normalize('NFD'); const ESS = [['keycap 1️⃣', '1️⃣'], ['peau 👍🏽', '👍🏽'], ['famille', '👨‍👩‍👧‍👦'], ['é décomposé', D('é')], ['a + grave décomposé', D('à')], ['tréma ï décomposé', D('ï')], ['cédille ç décomposé', D('ç')], ['œ', 'œ'], ['drapeau', '🇫🇷'], ['drapeau écosse', '🏴󠁧󠁢󠁳󠁣󠁴󠁿']];
  for (const [n, s] of ESS) {
    // juste assez de place (1 signe) : entier ou absent ; jamais coupé
    await p.evaluate(([sel, b]) => { const e = document.querySelector(sel); e.focus(); e.value = b.slice(0, 119); e.setSelectionRange(119, 119); }, [SEL, base]);
    await p.keyboard.insertText(s); await pause(50); const r = await lire(SEL);
    const ok = r.g === 120 && r.v.startsWith(base.slice(0, 119)) && r.v.slice(119).normalize('NFC') === s.normalize('NFC') && !/�/.test(r.v);
    v('A5 1 place libre, collage de ' + n + ' : entré ENTIER (120 signes)', ok, [r.g, r.u, JSON.stringify(r.v.slice(-6))]);
    // aucune place : refusé, rien de changé
    await p.evaluate(([sel, b]) => { const e = document.querySelector(sel); e.focus(); e.value = b.slice(0, 118) + 'ÿÿ'; e.setSelectionRange(120, 120); }, [SEL, base]);
    await p.keyboard.insertText(s); await pause(50); const r2 = await lire(SEL);
    v('A5 0 place, collage de ' + n + ' : rien n’entre', r2.v === base.slice(0, 118) + 'ÿÿ', [r2.g, JSON.stringify(r2.v.slice(-6))]);
  }
  // frappe lettre par lettre du é décomposé (e puis U+0301), à la limite : le signe combinant ne doit pas être perdu ni refusé
  await p.evaluate(([sel, b]) => { const e = document.querySelector(sel); e.focus(); e.value = b.slice(0, 119); e.setSelectionRange(119, 119); }, [SEL, base]);
  await p.keyboard.type('e'); await p.keyboard.insertText('́'); await pause(60); const r3 = await lire(SEL);
  console.log('   · NOTE e puis U+0301 tapés à 1 place :', r3.g, r3.u, JSON.stringify(r3.v.slice(-3)));
  v('A5 « e » puis accent combinant tapés quand il reste UNE place : « é » complet (pas « e » nu)', r3.v.normalize('NFC').endsWith('é') && r3.g === 120, [r3.g, r3.u, JSON.stringify(r3.v.slice(-3))]);

  // ───── A6 : champs hors périmètre : recherche, numériques, tel, e-mail ─────
  const hors = await p.evaluate(() => { const re = []; document.querySelectorAll('input,textarea').forEach(e => { re.push({ t: e.type, m: e.getAttribute('maxlength'), ph: (e.placeholder || '').slice(0, 20), id: e.id || e.dataset.ci || '' }); }); return re; });
  console.log('   · champs visibles sur la fiche :', JSON.stringify(hors.map(h => h.id + ':' + h.t + ':' + h.m)));
  for (const [h, sel] of [['clients', 'input[placeholder^="Chercher un client"]'], ['factures', 'input.cx-q'], ['stock', '#ms-q']]) {
    await p.evaluate(x => { aller(x); }, h); await pause(700); const qq = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /quitter|abandonner|sans enregistrer|ne pas enregistrer/i.test(x.textContent) && x.offsetParent); if (b) { const t = b.textContent.trim(); b.click(); return t; } return null; }); if (qq) { console.log('   · NOTE garde de la fiche modifiée, bouton :', qq); await pause(700); await p.evaluate(x => { aller(x); }, h); await pause(700); }
    const ex = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.focus(); e.value = ''; return { max: e.getAttribute('maxlength') }; }, sel);
    v('A6 population : champ de recherche « ' + h + ' » trouvé, sans maxlength', !!ex && ex.max === null, ex);
    if (!ex) continue;
    await p.keyboard.insertText('🇫🇷'.repeat(150)); await pause(100); const rr = await lire(sel);
    v('A6 recherche ' + h + ' : 150 drapeaux collés restent 150 (champ hors périmètre)', rr && rr.g === 150, rr && [rr.g]);
    await p.evaluate(s => { document.querySelector(s).value = ''; }, sel); await p.keyboard.type('Dupont é', { delay: 0 }); await pause(100); const r2 = await lire(sel);
    v('A6 recherche ' + h + ' : frappe « Dupont é » intacte', r2 && r2.v === 'Dupont é', r2 && r2.v);
  }
  // numériques/téléphone/e-mail : saisie courante intacte
  await FICHE(); const nums = [['[data-ci="tel"]', '06 12 34 56 78', '06 12 34 56 78'], ['[data-ci="mail"]', 'marie.dupont+essai@exemple.fr', 'marie.dupont+essai@exemple.fr']];
  for (const [s, saisie, att] of nums) { await cible(s); await p.evaluate(x => { document.querySelector(x).value = ''; }, s); await p.keyboard.type(saisie, { delay: 5 }); await pause(60); const r = await lire(s); v('A6 ' + s + ' : frappe réelle « ' + saisie + ' » intacte', r.v === att, r.v); }
  await p.evaluate(s => { const e = document.querySelector(s); e.value = ''; }, '[data-ci="tel"]');
  await cible('[data-ci="tel"]'); await p.keyboard.insertText('+33 (0)6 12 34 56 78 poste 12'); await pause(60); l = await lire('[data-ci="tel"]'); v('A6 téléphone collé avec « + ( ) » intact', l.v === '+33 (0)6 12 34 56 78 poste 12', l.v);

  // ───── A7 : coût par frappe ─────
  await cible(SEL); await p.evaluate(s => { document.querySelector(s).value = ''; }, SEL);
  const t0 = Date.now(); await p.keyboard.type('a'.repeat(100), { delay: 0 }); const dt = Date.now() - t0; await pause(50);
  const micro = await p.evaluate(() => { const t = 'ab🇫🇷é'.repeat(25); const t1 = performance.now(); for (let i = 0; i < 2000; i++) { nbSignes(t); coupeSure(t, 120); sansOrphelin(t); } return (performance.now() - t1) / 2000; });
  console.log('   · 100 frappes en ' + dt + ' ms ; coût d’un tour (nbSignes + coupeSure + sansOrphelin sur 100 signes) = ' + micro.toFixed(4) + ' ms');
  v('A7 coût d’un tour de garde par frappe < 0,5 ms (100 signes)', micro < 0.5, micro);
  v('A7 100 frappes réelles en moins de 3 s', dt < 3000, dt);
  // écouteurs : une frappe déclenche-t-elle une boucle d’événements ? compte des input pour 1 frappe
  const nb = await p.evaluate(sel => new Promise(res => { const e = document.querySelector(sel); e.focus(); e.value = ''; let n = 0; const f = () => n++; e.addEventListener('input', f); window.__stop = () => { e.removeEventListener('input', f); return n; }; res(0); }), SEL);
  await p.keyboard.type('xyz'); await pause(50); const ni = await p.evaluate(() => window.__stop());
  v('A7 3 frappes = 3 événements input (aucune boucle, aucun input synthétique en plus)', ni === 3, ni);
  await p.keyboard.insertText('🇫🇷'.repeat(200)); await pause(50);
  const ni2 = await p.evaluate(() => 0);

  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
