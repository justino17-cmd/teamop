// RECONTRÔLE ADVERSE du tour 5 bis — B (N5 : les 9 sites JOUÉS au navigateur) + C (liseré / aria-invalid champ par champ).
// Frappe réelle (CDP Input.insertText), clic réel sur le bouton d'enregistrement. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ».
// PROFIL=mac|iphone|ipad|android  NUIT=1
const L = require('../lib.js'), v = L.v, fs = require('fs');
const OUT = process.env.SORTIE || '/tmp/claude-0/r5/b/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: !!process.env.NUIT, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {})); const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); };
    window.__set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; };
    window.__cpt = 0; window.__u = (n, pre) => { const b = (pre || '') + (++window.__cpt).toString(26).replace(/[0-9]/g, c => 'qrstuvwxyz'[+c]) + 'q'; return (b + 'x'.repeat(n)).slice(0, n); }; });
  const pause = ms => L.calme(p, ms);
  const fermer = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} try { document.querySelectorAll('#calque').forEach(x => x.innerHTML = ''); } catch (e) {} });
  const msg = () => p.evaluate(() => { const t = window.__t.join(' | '); window.__t = []; return t; });
  const NFD = n => 'é'.normalize('NFD').repeat(n);
  const creaOuvrir = async () => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600); await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await pause(250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await pause(400); };
  const S = [
    { n: 'n-titre', sel: '#n-titre', max: 120, ouvrir: () => p.evaluate(() => panneauCreer('sm', AUJ, '09:00')), bouton: '[data-action="creerOk"]', lu: () => p.evaluate(() => INTS[INTS.length - 1].titre), nb: () => p.evaluate(() => INTS.length) },
    { n: 'm-titre', sel: '#m-titre', max: 120, ouvrir: () => p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }), bouton: '[data-action="modifierOk"]', lu: () => p.evaluate(() => INTS.find(i => i.id === window.__iid).titre), nb: () => p.evaluate(() => INTS.find(i => i.id === window.__iid).titre.length) },
    { n: 'tk-t', sel: '#tk-t', max: 120, ouvrir: () => p.evaluate(() => tPanneau(null)), bouton: '[data-tok]', lu: () => p.evaluate(() => TACHES[TACHES.length - 1].t), nb: () => p.evaluate(() => TACHES.length) },
    { n: 'pr-nom', sel: '#pr-nom', max: 80, ouvrir: () => p.evaluate(() => prFormulaire(null, PACKS_ENT[0], '')), bouton: '[data-pr^="garder|"]', lu: () => p.evaluate(() => PRODUITS[PRODUITS.length - 1].nom), nb: () => p.evaluate(() => PRODUITS.length) },
    { n: 't-nom', sel: '#t-nom', max: 40, ouvrir: async () => { await creaOuvrir(); await p.evaluate(() => { const b = document.querySelector('[data-action="cAjoutType"]'); if (b) b.click(); }); }, bouton: '[data-action="cAjoutTypeOk"]', lu: () => p.evaluate(() => TYPES[TYPES.length - 1]), nb: () => p.evaluate(() => TYPES.length) },
    { n: 'pa-lib', sel: '#pa-lib', max: 60, ouvrir: () => p.evaluate(() => paieReleve(EQUIPE.find(o => o.actif).k)), prep: () => p.evaluate(() => window.__set('#pa-m', '60')), bouton: '[data-paie^="primeajout|"]', lu: () => p.evaluate(() => { const a = Object.values(PAIE.primes).flat(); return a[a.length - 1].lib; }), nb: () => p.evaluate(() => Object.values(PAIE.primes).flat().length) },
    { n: 'ml-o', sel: '#ml-o', max: 200, ouvrir: () => p.evaluate(() => panneauEnvoi({ objet: '', corps: 'x', pj: 'a.pdf' })), prep: () => p.evaluate(() => { window.__set('#ml-a', 'a@exemple.fr'); window.__set('#ml-m', 'Bonjour'); }), bouton: '[data-mailenvoi]', lu: () => p.evaluate(() => ENVOIS[ENVOIS.length - 1].objet), nb: () => p.evaluate(() => ENVOIS.length) },
    { n: 'dvn-objet', sel: '#dvn-objet', max: 120, ouvrir: async () => { await p.evaluate(() => { DVN_F = null; dvNouveau(); }); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="nv|1"]').click()); await pause(400); await p.evaluate(() => document.querySelector('#calque [data-dvn="type|pro"]').click()); await pause(400); },
      prep: () => p.evaluate(() => { window.__set('#dvn-nom', window.__u(30, 'S')); window.__set('#dvn-tel', '05461' + String(10000 + (++window.__cpt)).slice(1).padStart(5, '0')); window.__set('#dvn-mail', 'e' + (++window.__cpt) + 'q@exemple.fr'); window.__set('#dvn-adr', window.__u(20, 'R')); }),
      bouton: '#calque [data-dvn="creer|1"]', lu: () => p.evaluate(() => DV[DV.length - 1].objet), nb: () => p.evaluate(() => DV.length) },
    { n: 'CREA titre', sel: '[data-cchamp="titre"]', max: 120, ouvrir: creaOuvrir, bouton: '[data-action="cCreer"]', lu: () => p.evaluate(() => INTS.filter(i => i.id !== 'brouillon').map(i => i.titre).join('|').length), nb: () => p.evaluate(() => INTS.filter(i => i.id !== 'brouillon').length), rang: () => p.evaluate(() => INTS.filter(i => i.id !== 'brouillon').slice(-1)[0].titre) },
  ];
  const vus = { b: 0 }; const rapport = [];
  for (const F of S) {
    await fermer(); await F.ouvrir(); await pause(400);
    const ok0 = await p.evaluate(s => !!document.querySelector(s), F.sel); v(F.n + ' population : le champ est à l’écran', ok0, F.sel); if (!ok0) { rapport.push({ site: F.n, joue: false, pourquoi: 'champ non atteint' }); continue; }
    // 1. frappe réelle de max « é » décomposés
    await p.locator(F.sel).first().click(); await p.keyboard.insertText(NFD(F.max)); await pause(150);
    const f1 = await p.evaluate(s => { const e = document.querySelector(s); return { u: e.value.length, g: nbSignes(e.value), nfd: e.value !== e.value.normalize('NFC') }; }, F.sel);
    v(F.n + ' : ' + F.max + ' « é » décomposés tapés : le champ en tient ' + F.max + ' (pas coupé à ' + (F.max / 2) + ')', f1.g === F.max, f1);
    if (F.prep) await F.prep(); const n0 = await F.nb(); await msg();
    await p.locator(F.bouton).first().click(); await pause(500);
    const m1 = await msg(); const st = F.rang ? await F.rang() : await F.lu(); const n1 = await F.nb();
    const rang = typeof st === 'string' ? st : '';
    const sortie = F.n === 'm-titre' ? true : n1 === n0 + 1;
    v(F.n + ' : enregistré (population +1 ou titre remplacé)', F.n === 'm-titre' ? rang.length > 0 : n1 === n0 + 1, { n0, n1, m1: m1.slice(0, 120) });
    v(F.n + ' : donnée rangée en NFC (' + F.max + ' unités, ' + F.max + ' signes)', rang === rang.normalize('NFC') && rang.length === F.max && nbG(rang) === F.max, [rang.length, rang === rang.normalize('NFC')]);
    // 2. 121 tapés : le champ s'arrête (ou refuse) ; 121 posés par le code : phrase
    await fermer(); await F.ouvrir(); await pause(400); await p.locator(F.sel).first().click(); await p.keyboard.insertText(NFD(F.max + 1)); await pause(150);
    const f2 = await p.evaluate(s => nbSignes(document.querySelector(s).value), F.sel);
    v(F.n + ' : ' + (F.max + 1) + ' « é » décomposés tapés : le champ s’arrête à ' + F.max, f2 === F.max, f2);
    await fermer(); await F.ouvrir(); await pause(400); if (F.prep) await F.prep(); const s0 = await F.nb(), l0 = await F.lu();
    await p.evaluate(([s, val]) => window.__set(s, val), [F.sel, NFD(F.max + 1)]); await msg();
    await p.locator(F.bouton).first().click(); await pause(500); const m2 = (await msg()) + ' ' + await p.evaluate(() => [...document.querySelectorAll('#calque .alerte, .erreur:not([hidden])')].map(e => e.textContent.trim()).join(' '));
    const aria = await p.evaluate(s => { const e = document.querySelector(s); return e ? { inv: e.getAttribute('aria-invalid'), foc: document.activeElement === e } : null; }, F.sel);
    v(F.n + ' : ' + (F.max + 1) + ' signes posés : refus avec phrase « limité à ' + F.max + ' signes… rien n’a été enregistré »', new RegExp('limité à ' + F.max + ' signes').test(m2) && /rien n’a été enregistré/.test(m2), m2.slice(0, 160));
    v(F.n + ' : rien d’enregistré au refus', (await F.nb()) === s0 && (await F.lu()) === l0, [s0, await F.nb()]);
    v(F.n + ' : champ refusé marqué (aria-invalid=true + focus)', !!aria && aria.inv === 'true' && aria.foc, aria);
    rapport.push({ site: F.n, joue: true });
  }
  function nbG(t) { return [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(t)].length; }
  v('aucune erreur de page', erreurs.length === 0, erreurs.slice(0, 3));
  console.log('RAPPORT', JSON.stringify(rapport));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(1); });
