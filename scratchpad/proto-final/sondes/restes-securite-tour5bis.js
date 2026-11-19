// TOUR 5 BIS (sécurité) — N1 (Backspace) est couvert par restes-securite-tour5-recontrole-a.js (A1) ; ici :
//   P : PDF de DEVIS du cadre Documents, objet ET désignation décomposés (lus au texte) ; N2 ; N3 ; N5 ; E : refus marqué ; beforeinput restreint.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ». SECTIONS=pdf,champs,marque (défaut : tout)
const A = require('./atelier-outils.js'), L = A.L, v = L.v, fs = require('fs'), cp = require('child_process');
const SORTIE = process.env.SORTIE || '/tmp/claude-0/t5b/'; fs.mkdirSync(SORTIE, { recursive: true });
const SECTIONS = (process.env.SECTIONS || 'pdf,champs,marque').split(',');
(async () => {
  if (SECTIONS.includes('pdf')) {
    const c2 = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p2 = c2.p; p2.on('dialog', d => d.accept().catch(() => {}));
    await c2.ctx.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/dep/html2canvas.min.js') }));
    const f = await A.ouvrirAtelier(c2, 'devis', 'devis'); v('P l’atelier de devis s’ouvre', !!f);
    const OBJ = 'Remplacement électrovanne été à ï Ç Ö Å', DES = 'Électrovanne œuvre été à ï Çà';
    const ref = await f.evaluate(() => CATALOGUE[0].ref);
    await A.composerDevis(c2, f, { objet: OBJ.normalize('NFD'), articles: [{ ref, qte: 1 }] });
    const res = await f.evaluate(async des => { const d = D(); if (!d) return null; const t = d.blocs.find(b => b.type === 'tableau'); t.lignes[0].des = des; const r = await pdfFabriquer(d, () => true); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), nfdObj: d.blocs.find(b => b.type === 'objet') && d.blocs.find(b => b.type === 'objet').texte }; }, DES.normalize('NFD'));
    v('P population : le PDF du devis (objet et désignation décomposés) est fabriqué', !!res && !!res.b64, res && Object.keys(res));
    if (res && res.b64) { const fp = SORTIE + 'devis-nfd.pdf'; fs.writeFileSync(fp, Buffer.from(res.b64, 'base64'));
      const txt = cp.spawnSync('pdftotext', ['-layout', fp, '-']).stdout.toString().replace(/\s+/g, ' ');
      v('P devis PDF : l’objet décomposé garde ses accents', txt.includes(OBJ), (txt.match(/Remplacement.{0,50}/) || [''])[0]);
      v('P devis PDF : la désignation décomposée garde ses accents (œ, É, ç)', txt.includes(DES), (txt.match(/lectrovanne.{0,30}/g) || []).join('|'));
      v('P devis PDF : aucun « ? » ni « � »', !/[?�]/.test(txt), (txt.match(/.{0,15}[?�].{0,15}/g) || []).slice(0, 3));
      cp.spawnSync('pdftoppm', ['-r', '90', '-png', '-f', '1', '-l', '1', fp, SORTIE + 'devis-nfd']); }
    await L.fin(c2);
  }
  if (SECTIONS.includes('champs')) {
    const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
    await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; window.__set = (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }; });
    const pause = ms => L.calme(p, ms);
    const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return { v: e.value, u: e.value.length, g: nbSignes(e.value) }; }, sel);
    // ───── N2 : à 119/120, « e » puis U+0301 envoyés séparément → « é » complet ─────
    await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); await pause(300);
    const base = Array.from({ length: 119 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
    await p.evaluate(b => { const e = document.querySelector('#n-titre'); e.focus(); e.value = b; e.setSelectionRange(b.length, b.length); }, base);
    await p.keyboard.type('e'); await pause(60); await p.keyboard.insertText('́'); await pause(100);
    let l = await lire('#n-titre');
    v('N2 119 signes + « e » puis U+0301 envoyés séparément : « é » complet (120 signes, 121 unités)', l.g === 120 && l.v.endsWith('é') && l.v.length === 121, [l.g, l.u, JSON.stringify(l.v.slice(-3))]);
    await p.keyboard.type('Z'); await pause(60); l = await lire('#n-titre');
    v('N2 puis une lettre de plus : refusée (le champ est plein)', l.g === 120 && !l.v.endsWith('Z'), [l.g, JSON.stringify(l.v.slice(-3))]);
    await p.keyboard.insertText('́'); await pause(60); l = await lire('#n-titre');
    v('N2 un second accent combinant s’empile sur le même signe (le champ reste à 120 signes, rien ne se perd)', l.g === 120, [l.g, l.u]);
    // un signe qui ne tient pas reste refusé : 120 signes pleins + « x »
    await p.evaluate(b => { const e = document.querySelector('#n-titre'); e.focus(); e.value = b + 'q'; e.setSelectionRange(120, 120); }, base);
    await p.keyboard.type('x'); await pause(60); l = await lire('#n-titre');
    v('N2 contre-épreuve : un VRAI signe à 120/120 reste refusé', l.g === 120 && !l.v.endsWith('x'), [l.g, JSON.stringify(l.v.slice(-3))]);
    await p.keyboard.insertText('🇫🇷'); await pause(60); l = await lire('#n-titre');
    v('N2 contre-épreuve : un drapeau à 120/120 reste refusé (rien, pas une lettre régionale)', l.g === 120 && !/[\u{1F1E6}-\u{1F1FF}]/u.test(l.v), [l.g]);
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    // ───── N3 : invisibles — la propriété Unicode, pas une liste ─────
    const inv = await p.evaluate(() => { const cas = { 'U+2800': '⠀', 'tag E0020': '\u{E0020}', 'sélecteur E0100': '\u{E0100}', 'U+1D173': '\u{1D173}', 'U+1BCA0': '\u{1BCA0}', 'U+FFF9': '￹', 'U+FFFA': '￺', 'U+FFFB': '￻', 'U+E007F': '\u{E007F}', 'U+3164': 'ㅤ', 'U+200B': '​', 'U+00AD': '­', 'U+034F': '͏' }; const r = {}; for (const k in cas) r[k] = accesLignes(cas[k] + '\n' + cas[k] + cas[k]).length; return { r, vraies: accesLignes('4821\n⠀\nSonner chez la gardienne\n\u{E0020}\n é \n👨‍👩\nfin').length, un: accesLignes('⠀\n\u{E0100}\nligne\n\u{1D173}').join('|') }; });
    const faux = Object.entries(inv.r).filter(([k, n]) => n !== 0);
    v('N3 population : 13 invisibles essayés (liste d’avant + U+2800, tags, sélecteurs E01xx, U+1D173, U+1BCA0, U+FFF9-FFFB)', Object.keys(inv.r).length === 13, Object.keys(inv.r).length);
    v('N3 aucune ligne faite d’un seul de ces invisibles ne compte comme ligne d’accès', faux.length === 0, faux);
    v('N3 les vraies lignes restent (« é », « 👨‍👩 », texte) : 5 lignes sur 7', inv.vraies === 5, inv.vraies);
    v('N3 mélange invisibles + texte : seule « ligne » reste', inv.un === 'ligne', inv.un);
    // ───── N5 : NFC à l'entrée des titres libres ─────
    const NFD = 'é'.normalize('NFD').repeat(120);
    await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); await pause(300);
    await p.evaluate(t => window.__set('#n-titre', t), NFD); const n0 = await p.evaluate(() => INTS.length);
    await p.evaluate(() => document.querySelector('[data-action="creerOk"]').click()); await pause(500);
    const cr = await p.evaluate(() => ({ n: INTS.length, t: INTS[INTS.length - 1].titre }));
    v('N5 intervention (n-titre) : 120 « é » décomposés → créée, rangée en NFC (120 unités, pas 240)', cr.n === n0 + 1 && cr.t === 'é'.repeat(120) && cr.t.length === 120, [cr.n - n0, cr.t.length, cr.t === cr.t.normalize('NFC')]);
    const iid = await p.evaluate(() => INTS[INTS.length - 1].id);
    await p.evaluate(i => { try { fermerPanneau(); } catch (e) {} panneauModifier(i); }, iid); await pause(400);
    await p.evaluate(t => window.__set('#m-titre', t), 'Remplacement électrovanne'); await p.evaluate(() => document.querySelector('[data-action="modifierOk"]').click()); await pause(500);
    const mo = await p.evaluate(i => INTS.find(x => x.id === i).titre, iid);
    v('N5 modification (m-titre) : « Remplacement électrovanne » en NFC', mo === 'Remplacement électrovanne', [mo.length, mo === mo.normalize('NFC')]);
    // les sept autres sites de lecture : on lit la page SERVIE (code), pas une phrase — chaque id est lu par nfc(…)
    const page = fs.readFileSync(L.RACINE + '/apercu/prototype-op-gestion.html', 'utf8');
    const ids = ['tk-t', 'pr-nom', 't-nom', 'pa-lib', 'ml-o'], man = ids.filter(i => !new RegExp("nfc\\(document\\.getElementById\\('" + i + "'\\)\\.value\\)").test(page));
    v('N5 code : tk-t, pr-nom, t-nom, pa-lib, ml-o sont lus par nfc(…) (5 sur 5)', man.length === 0, man);
    v('N5 code : l’objet du devis (dvnLire) et le titre de la création (CREA) passent par nfc', /f\.objet = nfc\(o\)/.test(page) && /CREA\[t\.dataset\.cchamp\] = nfc\(texteNet/.test(page), 'dvnLire / CREA');
    // beforeinput : seules la frappe, le collage et le glisser sont pris (code lu) ; remplacement/composition passent par « input » (mesuré par A4 de la sonde recontrole-a : méthode de saisie CDP)
    const bi = page.slice(page.indexOf("document.addEventListener('beforeinput'"), page.indexOf("document.addEventListener('input', e => { if (!e.isTrusted)")).replace(/\/\*[\s\S]*?\*\//g, '');
    v('B6 code : le beforeinput ne vise que insertText, insertFromPaste, insertFromDrop (ni remplacement, ni composition)', /\^\(insertText\|insertFromPaste\|insertFromDrop\)\$/.test(bi) && !/insertReplacementText|insertCompositionText/.test(bi), 'beforeinput');
    v('N5 aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SECTIONS.includes('marque')) {
    for (const profil of ['mac', 'iphone', 'ipad', 'android']) for (const nuit of [false, true]) {
      const tag = profil + (nuit ? '-nuit' : '-jour');
      const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
      await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
      const pause = ms => L.calme(p, ms);
      const rouge = await p.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--rouge)'; document.body.appendChild(d); const r = getComputedStyle(d).color; d.remove(); return r; });
      await p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }); await pause(600);
      const avant = await p.evaluate(() => { const e = document.querySelector('#m-titre'); return { inv: e.getAttribute('aria-invalid'), bord: getComputedStyle(e).borderTopColor }; });
      await p.evaluate(() => { const e = document.querySelector('#m-titre'); e.value = 'é'.repeat(125); });
      await p.evaluate(() => document.querySelector('[data-action="modifierOk"]').click()); await pause(450);
      const ap = await p.evaluate(() => { const e = document.querySelector('#m-titre'), t = document.querySelector('#toast'), r = x => { if (!x) return null; const b = x.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const champs = ['#q-d', '#q-h', '#q-dur'].map(s => { const x = document.querySelector(s), l = x && x.closest('.champ'); return l && l.offsetParent ? [s, r(l)] : null; }).filter(Boolean);
        return { inv: e.getAttribute('aria-invalid'), bord: getComputedStyle(e).borderTopColor, focus: document.activeElement === e, toast: r(t), toastOn: t && t.classList.contains('on'), msg: window.__t.join(' | '), champs, titre: r(e) }; });
      v(tag + ' population : le champ refusé et la bulle existent', !!ap.toast && ap.toastOn && /limité à 120/.test(ap.msg), [ap.toastOn, ap.msg.slice(0, 40)]);
      v(tag + ' avant le refus : le champ n’est pas marqué (aria-invalid absent, liseré normal)', avant.inv === null && avant.bord !== rouge, avant);
      v(tag + ' refus : aria-invalid="true" posé, liseré = jeton rouge du thème (' + rouge + '), focus sur le champ', ap.inv === 'true' && ap.bord === rouge && ap.focus, [ap.inv, ap.bord, ap.focus]);
      const rec = (a, b) => a && b ? Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])) : 0;
      const rc = ap.champs.map(([s, r]) => [s, rec(ap.toast, r)]), rt = rec(ap.toast, ap.titre);
      console.log('   · ' + tag + ' bulle', JSON.stringify(ap.toast), 'recouvrement px² champs', JSON.stringify(rc), 'titre', rt);
      v(tag + ' population : Jour, Début, Durée mesurés (3 champs)', rc.length === 3, rc.length);
      v(tag + ' la bulle ne recouvre pas le champ refusé (px² de recouvrement : 0)', rt === 0, rt);
      console.log('   · CONSIGNÉ ' + tag + ' : la bulle recouvre Jour/Début/Durée de', rc.map(x => x[0] + '=' + x[1]).join(' '), 'px²');
      await p.screenshot({ path: SORTIE + 'refus-' + tag + '.png' });
      await p.keyboard.press('Backspace'); await pause(100);
      const apres = await p.evaluate(() => { const e = document.querySelector('#m-titre'); return { inv: e.getAttribute('aria-invalid'), bord: getComputedStyle(e).borderTopColor }; });
      v(tag + ' à la frappe suivante (Backspace) : la marque part (aria-invalid retiré, liseré normal)', apres.inv === null && apres.bord !== rouge, apres);
      if (tag === 'android-jour') { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} aller('clients'); }); await pause(500);
        const rest = await p.evaluate(() => { const t = document.querySelector('#toast'); return { on: t.classList.contains('on'), txt: t.textContent.slice(0, 40), route: typeof route !== 'undefined' ? route : '?' }; });
        console.log('   · CONSIGNÉ (comportement général de toast(), 6 s, non vidé par la navigation) : 0,5 s après le refus et un changement d’écran, la bulle est encore là :', JSON.stringify(rest)); }
      v(tag + ' aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
