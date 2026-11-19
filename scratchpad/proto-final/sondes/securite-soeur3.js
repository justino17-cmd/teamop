// REJEU SŒUR 3 (19 novembre 2026) — restes de la sécurité, tour 5 bis : R1 (annuler / coller ne recoupent pas une fiche déjà plus longue), C2 (unités UTF-16 bornées),
// R5 (les quatre textareas : motif Créer/Modifier, note de tâche, corps du courriel — plafond + refus), N-b (anneau de focus rouge sur un champ refusé), C1 (client neuf particulier : le champ marqué est le plus long).
// Frappe réelle (clavier Playwright). PROFIL=mac|iphone|ipad|android|windows|petit · TOUS=1 : les six · NUIT=1. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ».
const L = require('../lib.js'), v = L.v;
const PROFILS = process.env.TOUS ? ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit'] : (process.env.PROFIL || 'mac').split(','), NUIT = !!process.env.NUIT;
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {})); const pause = ms => L.calme(p, ms);
    await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
    const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, u: e.value.length, g: nbSignes(e.value) } : null; }, sel);
    const poser = (sel, val) => p.evaluate(([s, val]) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.focus(); e.value = val; e.setSelectionRange(val.length, val.length); }, [sel, val]);
    const ouvrirN = async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauCreer('sm', AUJ, '09:00'); }); await pause(350); };
    // ── R1 : une fiche déjà plus longue que le plafond (150 pour 120) ne se recoupe ni à Ctrl+Z ni à Ctrl+V
    await ouvrirN(); const long = 'N' + 'x'.repeat(149), SEL = '#n-titre';
    await p.evaluate(([s, val]) => { const e = document.querySelector(s); e.value = val; e.focus(); e.setSelectionRange(val.length, val.length); }, [SEL, long]);
    let l = await lire(SEL); v(nom + 'R1 population : titre posé à 150 signes pour un plafond de 120', l.g === 150, l.g);
    await p.keyboard.press('Backspace'); await pause(80); l = await lire(SEL); v(nom + 'R1 Backspace : 149', l.g === 149, l.g);
    await p.keyboard.press('Control+z'); await pause(120); l = await lire(SEL); v(nom + 'R1 Ctrl+Z : 150 revenu, pas recoupé à 120', l.g === 150, l.g);
    await p.evaluate(([s, val]) => { const e = document.querySelector(s); e.value = val; e.focus(); e.setSelectionRange(10, 20); }, [SEL, long]); await p.keyboard.press('Control+x'); await pause(80);
    l = await lire(SEL); const apres = l.g; await p.keyboard.press('Control+v'); await pause(120); l = await lire(SEL);
    v(nom + 'R1 couper 10 signes (' + apres + ') puis coller : jamais 120 (le navigateur borne la fiche, il ne la rogne plus)', apres === 140 && l.g >= 140, [apres, l.g]);
    // contre-épreuve du bon sens : un champ qui TENAIT reste recoupé (collage de 150 dans un champ vide → 120)
    await p.evaluate(([s]) => { const e = document.querySelector(s); e.value = ''; e.focus(); }, [SEL]); await p.evaluate(t => navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}), 'q'.repeat(150)).catch(() => {});
    await p.keyboard.insertText('q'.repeat(150)); await pause(100); l = await lire(SEL); v(nom + 'R1 contre-épreuve : 150 signes collés dans un champ vide restent bornés à 120', l.g === 120, l.g);
    // ── C2 : unités UTF-16
    const abc = n => Array.from({ length: n }, (_, i) => String.fromCharCode(97 + (i % 26))).join('');
    await p.evaluate(([s, val]) => { const e = document.querySelector(s); e.value = val; e.focus(); e.setSelectionRange(val.length, val.length); }, [SEL, abc(120)]);
    await p.keyboard.insertText('́'.repeat(5000)); await pause(250); l = await lire(SEL); v(nom + 'C2 5 000 U+0301 collés à 120/120 : bornés (' + l.u + ' unités ≤ 480)', l.g === 120 && l.u <= 480, [l.g, l.u]);
    await p.evaluate(([s, val]) => { const e = document.querySelector(s); e.value = val; e.focus(); e.setSelectionRange(val.length, val.length); }, [SEL, 'a']); await p.keyboard.insertText('́'.repeat(100000)); await pause(300); l = await lire(SEL); v(nom + 'C2 champ vide : « a » + 100 000 accents : ≤ 480 unités', l.u <= 480, [l.g, l.u]);
    await p.evaluate(([s, val]) => { const e = document.querySelector(s); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }, [SEL, 'a' + '́'.repeat(5000)]);
    const r = await p.evaluate(() => refusLong('a' + '́'.repeat(5000), 120, 'Titre')), r0 = await p.evaluate(() => refusLong('é'.repeat(100), 120, 'Titre'));
    v(nom + 'C2 refusLong : 5 000 accents posés par le code → phrase (rien n’est enregistré) ; 100 « é » → rien', /signes combinants/.test(r) && r0 === '', [r.slice(0, 80), r0]);
    const crea = await p.evaluate(() => { const n = INTS.length; document.querySelector('#n-titre').value = 'a' + '́'.repeat(5000); ACTIONS.creerOk(document.querySelector('[data-action="creerOk"]')); return [INTS.length - n, window.__t.slice(-1)[0] || '']; });
    v(nom + 'C2 « Créer » avec ce titre : aucune intervention créée, phrase dite', crea[0] === 0 && /signes combinants/.test(crea[1]), crea);
    // ── R5 : les quatre textareas
    const R5 = [
      { n: 'n-motif (Créer)', sel: '#n-motif', max: 600, ouvrir: () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauCreer('sm', AUJ, '09:00'); }), prep: () => p.evaluate(() => { document.querySelector('#n-titre').value = 'Essai'; }), bouton: '[data-action="creerOk"]', stock: () => p.evaluate(() => INTS.filter(i => i.titre === 'Essai').length) },
      { n: 'm-motif (Modifier)', sel: '#m-motif', max: 600, ouvrir: () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }), bouton: '[data-action="modifierOk"]', stock: () => p.evaluate(() => (INTS.find(i => i.id === window.__iid).motif || '').length) },
      { n: 'tk-n (note de tâche)', sel: '#tk-n', max: 600, ouvrir: () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} tPanneau(null); }), prep: () => p.evaluate(() => { document.querySelector('#tk-t').value = 'Essai tâche'; }), bouton: '[data-tok]', stock: () => p.evaluate(() => TACHES.filter(t => t.t === 'Essai tâche').length) },
      { n: 'ml-m (courriel)', sel: '#ml-m', max: 5000, ouvrir: () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauEnvoi({ objet: 'Essai', corps: 'x', pj: 'a.pdf' }); }), prep: () => p.evaluate(() => { document.querySelector('#ml-a').value = 'a@exemple.fr'; }), bouton: '[data-mailenvoi]', stock: () => p.evaluate(() => ENVOIS.length) },
    ];
    for (const s of R5) {
      await s.ouvrir(); await pause(450); const ex = await p.evaluate(sel => { const e = document.querySelector(sel); return e ? { ml: e.getAttribute('maxlength'), tag: e.tagName } : null; }, s.sel);
      v(nom + 'R5 ' + s.n + ' : le champ existe et porte maxlength=' + s.max, !!ex && ex.tag === 'TEXTAREA' && ex.ml === String(s.max), ex);
      if (!ex) continue;
      await p.evaluate(([sel, big]) => { const e = document.querySelector(sel); e.value = big; }, [s.sel, 'z'.repeat(s.max + 25)]); if (s.prep) await s.prep();
      const avant = await s.stock(); await p.evaluate(() => { window.__t = []; }); await L.toucher(c, s.bouton); await pause(300);
      const apres = await s.stock(), t = await p.evaluate(() => window.__t.join(' | ')), m = await p.evaluate(sel => { const e = document.querySelector(sel); return e ? { inv: e.getAttribute('aria-invalid'), foc: document.activeElement === e } : null; }, s.sel);
      v(nom + 'R5 ' + s.n + ' : ' + (s.max + 25) + ' signes posés → phrase « limité à ' + s.max + ' signes », rien enregistré', new RegExp('limité à ' + s.max + ' signes').test(t) && apres === avant, { t: t.slice(0, 90), avant, apres });
      v(nom + 'R5 ' + s.n + ' : le champ est marqué (aria-invalid) et a le focus', !!m && m.inv === 'true' && m.foc, m);
      if (s.sel === '#n-titre') continue;
    }
    // ── N-b : l'anneau de focus du champ refusé est ROUGE (jeton --rouge), pas le bleu du thème
    const anneau = await p.evaluate(() => { const e = document.querySelector('#ml-m'); if (!e) return null; e.focus(); const cs = getComputedStyle(e), j = document.createElement('i'); j.style.color = 'var(--rouge)'; document.body.appendChild(j); const rouge = getComputedStyle(j).color; j.remove(); e.removeAttribute('aria-invalid'); const sans = getComputedStyle(e).outlineColor; e.setAttribute('aria-invalid', 'true'); return { avec: getComputedStyle(e).outlineColor, sans, rouge, w: getComputedStyle(e).outlineWidth }; });
    v(nom + 'N-b anneau de focus rouge sur [aria-invalid]:focus (' + (anneau && anneau.avec) + ' contre ' + (anneau && anneau.sans) + ' sans la marque)', !!anneau && anneau.avec === anneau.rouge && anneau.sans !== anneau.rouge && parseFloat(anneau.w) >= 2, anneau);
    await L.capture(c, '/tmp/claude-0/soeur3/anneau-rouge-' + profil + (NUIT ? '-nuit' : '') + '.png');
    // ── C1 : client neuf PARTICULIER — l'excès dans le Nom marque le Nom, pas le Prénom
    const cn = async (nomV, prenomV) => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await pause(600);
      await p.evaluate(() => { const b = document.querySelector('[data-action="cNouveauClient"], [data-action="cNv"]'); if (b) b.click(); }); await pause(300);
      return p.evaluate(([n, pr]) => { try { CREA.nouveau = true; CREA.nv = Object.assign({}, CREA.nv || {}, { type: 'particulier', nom: n, contact: pr, tel: '', mail: '', adr: '' }); const pl = clientPlafondRefus(cliCrea()); const rx = clientNvChampRefuse(pl ? pl.k : 'nom'); return { pl: pl && pl.k, champ: rx }; } catch (e) { return { err: String(e) }; } }, [nomV, prenomV]); };
    const r1 = await cn('N'.repeat(121), 'Jean'), r2 = await cn('Jean', 'P'.repeat(121)), r3 = await cn('N'.repeat(61), 'P'.repeat(60));
    v(nom + 'C1 Nom de 121, Prénom « Jean » : le champ marqué est « nom »', r1.champ === 'nom', r1);
    v(nom + 'C1 Prénom de 121, Nom « Jean » : le champ marqué est « contact » (le Prénom)', r2.champ === 'contact', r2);
    v(nom + 'C1 Nom 61 + Prénom 60 (la réunion dépasse 120) : le plus long, « nom »', r3.champ === 'nom', r3);
    v(nom + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
