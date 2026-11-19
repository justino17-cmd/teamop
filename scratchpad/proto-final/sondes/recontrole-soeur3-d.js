// RECONTRÔLE ADVERSE sœur 3 — points (d) client neuf, (e) combinants, (f) Ctrl+Z / Ctrl+V, (g) textareas, (h) anneau rouge, et ce que ça casse à côté.
// Frappe réelle (clavier Playwright). PROFILS=mac,iphone,android · NUIT=1. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone,android').split(','), NUIT = !!process.env.NUIT, CAP = '/tmp/claude-0/recontrole/';
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', attente: 1500 }), p = c.p, pause = ms => L.calme(p, ms);
    await p.evaluate(() => { window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); }; });
    const lire = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { v: e.value, u: e.value.length, g: nbSignes(e.value) } : null; }, sel);
    const poser = (sel, val, a, b) => p.evaluate(([s, val, a, b]) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.focus(); e.value = val; e.setSelectionRange(a == null ? val.length : a, b == null ? val.length : b); }, [sel, val, a, b]);
    const saisie = (sel, val) => p.evaluate(([s, val]) => { const e = document.querySelector(s); e.scrollIntoView({ block: 'center' }); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, val]);
    // ───── D : client neuf, via l'écran « Créer une intervention »
    const ouvrirNv = async (type) => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} ouvrirCreation({}); }); await pause(500);
      await p.evaluate(() => document.querySelector('[data-cnouveau="1"]').click()); await pause(300); if (type) { await p.evaluate(t => document.querySelector('[data-cnvtype="' + t + '"]').click(), type); await pause(300); } };
    let compteur = 0;
    const essai = async (type, nomV, contactV) => { compteur++; await ouvrirNv(type); await p.evaluate(() => document.querySelector('[data-action="cPlusTard"]').click()); await pause(400);
      await saisie('[data-cnv="nom"]', nomV); await saisie('[data-cnv="contact"]', contactV); await saisie('[data-cnv="tel"]', '06 12 34 56 ' + String(10 + compteur)); await saisie('[data-cnv="adr"]', compteur + ' rue des Essais 17000 La Rochelle');
      await p.evaluate(() => { window.__t = []; }); const n0 = await p.evaluate(() => Object.keys(CLIENTS).length);
      await p.evaluate(() => document.querySelector('[data-action="cCreer"]').click()); await pause(500);
      return p.evaluate(n0 => ({ inv: [...document.querySelectorAll('[aria-invalid="true"]')].map(e => e.dataset.cnv || e.id), foc: (document.activeElement.dataset || {}).cnv, t: window.__t.join(' | ').slice(0, 120), clients: Object.keys(CLIENTS).length - n0 }), n0); };
    let r = await essai('part', 'N'.repeat(110), 'P'.repeat(20)); v(nom + 'D1 particulier, Nom 110 + Prénom 20 : la marque est sur le Nom', r.inv.join() === 'nom' && r.foc === 'nom' && !/créée/.test(r.t), r);
    r = await essai('part', 'N'.repeat(20), 'P'.repeat(110)); v(nom + 'D2 particulier, Nom 20 + Prénom 110 : la marque est sur le Prénom (contact)', r.inv.join() === 'contact' && !/créée/.test(r.t), r);
    r = await essai('pro', 'R'.repeat(121), 'Marie'); v(nom + 'D3 professionnel, Raison sociale 121 : marque sur la raison sociale (nom)', r.inv.join() === 'nom' && !/créée/.test(r.t), r);
    r = await essai('pro', 'R'.repeat(100), 'C'.repeat(61)); v(nom + 'D4 professionnel, contact de 61 (plafond 60 ?) : marque sur le contact, ou rien si le plafond est 120', /Intervention créée/.test(r.t) && !r.inv.length, r);
    r = await essai('pro', 'R'.repeat(110), 'Marie'); v(nom + 'D5 professionnel, Raison 110 + contact court : création possible (pas de réunion)', /Intervention créée/.test(r.t) && !r.inv.length, r);
    r = await essai('part', 'O’Brien & Fils', 'Jean-Éric'); v(nom + 'D6 particulier « Jean-Éric O’Brien & Fils » : accepté', /Intervention créée/.test(r.t) && r.inv.length === 0, r);
    const nomOk = await p.evaluate(() => { const k = Object.keys(CLIENTS).pop(); return CLIENTS[k] && CLIENTS[k].nom; }); v(nom + 'D6b le nom gardé garde l’apostrophe et le « & » (' + nomOk + ')', /O’Brien & Fils/.test(nomOk || ''), nomOk);
    r = await essai('part', 'N'.repeat(60), 'P'.repeat(60)); v(nom + 'D7 particulier : 60 + 60 : à la limite (120 + espace = 121 ?)', true, r);
    // capture de l'écran refusé (à regarder) : Nom très long particulier
    await essai('part', 'N'.repeat(110), 'P'.repeat(20)); await L.capture(c, CAP + 'd-refus-' + profil + (NUIT ? '-nuit' : '') + '.png');
    // ───── H : anneau rouge
    const ring = await p.evaluate(() => { const e = document.activeElement; if (!e || e.getAttribute('aria-invalid') !== 'true') return null; const cs = getComputedStyle(e), j = document.createElement('i'); j.style.color = 'var(--rouge)'; document.body.appendChild(j); const rouge = getComputedStyle(j).color; j.remove();
      const a = { color: cs.outlineColor, w: cs.outlineWidth, st: cs.outlineStyle, rouge, bord: cs.borderColor }; e.setAttribute('aria-invalid', 'false'); a.faux = getComputedStyle(e).outlineColor; e.removeAttribute('aria-invalid'); a.sans = getComputedStyle(e).outlineColor; e.setAttribute('aria-invalid', 'true'); return a; });
    v(nom + 'H champ refusé et focalisé : anneau rouge 3 px plein (' + (ring && ring.color) + ')', !!ring && ring.color === ring.rouge && ring.w === '3px' && ring.st === 'solid', ring);
    v(nom + 'H contre-épreuves : aria-invalid="false" ou absent → pas d’anneau rouge', !!ring && ring.faux !== ring.rouge && ring.sans !== ring.rouge, ring);
    // le clavier de la tablette/téléphone : cible hors focus — le champ marqué qui perd le focus garde son liseré (pas d'anneau)
    const hors = await p.evaluate(() => { const e = document.querySelector('[aria-invalid="true"]'); if (!e) return null; e.blur(); const cs = getComputedStyle(e); return { st: cs.outlineStyle, bord: cs.borderColor, ombre: cs.boxShadow.slice(0, 60) }; }); v(nom + 'H champ marqué sans focus : pas d’anneau (outline ' + (hors && hors.st) + ')', !!hors && hors.st === 'none', hors);
    // ───── E : signes combinants dans d'AUTRES champs
    await ouvrirNv('part');
    for (const [sel, max] of [['[data-cnv="tel"]', 60], ['[data-cnv="mail"]', 120], ['[data-cnv="adr"]', 160], ['[data-cnv="contact"]', 120]]) {
      await poser(sel, 'a'.repeat(5)); await p.keyboard.insertText('́'.repeat(5000)); await pause(250); const l = await lire(sel);
      await ouvrirNv('part');
      v(nom + 'E ' + sel + ' : 5 000 U+0301 collés après « aaaaa » : ≤ ' + max * 4 + ' unités (' + l.u + ')', l.u <= max * 4, l);
    }
    await ouvrirNv('part'); await poser('[data-cnv="nom"]', ''); await p.keyboard.insertText('é'.repeat(3000)); await pause(250); let l = await lire('[data-cnv="nom"]');
    v(nom + 'E « é » décomposés collés ×3 000 : bornés à 120 signes (' + l.g + ' signes, ' + l.u + ' unités)', l.g <= 120 && l.u <= 480, l);
    await poser('[data-cnv="nom"]', ''); await p.keyboard.insertText('🇫🇷'.repeat(120)); await pause(200); l = await lire('[data-cnv="nom"]'); v(nom + 'E 120 drapeaux collés : tous gardés (480 unités = limite)', l.g === 120, l);
    await poser('[data-cnv="nom"]', ''); await p.keyboard.insertText('👨‍👩‍👧‍👦'.repeat(60)); await pause(200); l = await lire('[data-cnv="nom"]'); v(nom + 'E 60 familles d’émojis (11 unités) collées : on mesure ce qui reste (' + l.g + ' signes / ' + l.u + ' unités)', l.g >= 1, { g: l.g, u: l.u });
    // saisie normale au clavier, sous le plafond
    await poser('[data-cnv="nom"]', ''); await p.keyboard.type('L’Hôtel du Port & Fils — Éric O’Neill (SARL) 17000', { delay: 5 }); await pause(150); l = await lire('[data-cnv="nom"]');
    v(nom + 'E saisie normale au clavier : le texte est intact', l.v === 'L’Hôtel du Port & Fils — Éric O’Neill (SARL) 17000', l);
    await poser('[data-cnv="nom"]', ''); await p.keyboard.type('x'.repeat(119)); await p.keyboard.type('éa'); await pause(150); l = await lire('[data-cnv="nom"]'); v(nom + 'E 119 « x » puis « éa » : 120 signes exactement (le plafond laisse passer le 120e)', l.g === 120, l);
    // ───── F : annuler / coller sur une fiche déjà plus longue
    const SEL = '[data-cnv="nom"]', long = 'N' + 'x'.repeat(149);
    await poser(SEL, long); l = await lire(SEL); v(nom + 'F population : fiche de 150 pour un plafond de 120', l.g === 150, l.g);
    await p.keyboard.press('Control+a'); await p.keyboard.press('Delete'); await pause(100); await p.keyboard.press('Control+z'); await pause(150); l = await lire(SEL);
    v(nom + 'F1 tout effacer puis Ctrl+Z : la fiche de 150 revient entière (' + l.g + ')', l.g === 150, l.g);
    await poser(SEL, long); for (let i = 0; i < 40; i++) await p.keyboard.press('Backspace'); await pause(100); l = await lire(SEL); const apres = l.g; await p.keyboard.press('Control+z'); await pause(150); l = await lire(SEL);
    v(nom + 'F2 40 retours arrière (' + apres + ') puis Ctrl+Z : 150 revenu, pas recoupé à 120 (' + l.g + ')', l.g === 150, [apres, l.g]);
    await poser(SEL, 'abc'); await p.keyboard.insertText('z'.repeat(200)); await pause(100); l = await lire(SEL); const col = l.g; await p.keyboard.press('Control+z'); await pause(150); l = await lire(SEL);
    v(nom + 'F3 coller 200 dans « abc » (' + col + ') puis Ctrl+Z : revient à « abc » (' + l.v.slice(0, 10) + ')', col === 120 && l.v === 'abc', [col, l.v.slice(0, 20)]);
    await p.keyboard.press('Control+Shift+z'); await pause(150); l = await lire(SEL); v(nom + 'F3b Ctrl+Maj+Z (rétablir) : 120 au plus', l.g <= 120, l.g);
    await poser(SEL, long); await p.keyboard.insertText('YY'); await pause(100); l = await lire(SEL); v(nom + 'F4 fiche de 150 + 2 signes tapés : rien n’est ajouté ni rogné (150)', l.g === 150, l.g);
    // ───── G : textareas
    await p.evaluate(() => { try { fermerCreation(); } catch (e) {} try { fermerPanneau(); } catch (e) {} });
    const mots = await p.evaluate(() => ({ motifMax: Math.max(...INTS.map(i => (i.motif || '').length)), noteMax: Math.max(0, ...TACHES.map(t => (t.note || '').length)) })); v(nom + 'G population : motifs ≤ 600, notes ≤ 600 dans les données de démonstration', mots.motifMax <= 600 && mots.noteMax <= 600, mots);
    await p.evaluate(() => { window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; panneauModifier(window.__iid); }); await pause(450);
    await poser('#m-motif', ''); await p.keyboard.insertText('Panne de clim' + ' très bruyante, é à’ & ô.'.repeat(60)); await pause(150); l = await lire('#m-motif'); v(nom + 'G1 Modifier : 1 500 signes collés dans le motif : bornés à 600 (' + l.g + ')', l.g <= 600 && l.g >= 590, l.g);
    const lignes = Array.from({ length: 30 }, (_, i) => 'ligne ' + i + ' ' + 'x'.repeat(10)).join('\n'); await poser('#m-motif', ''); await p.keyboard.insertText(lignes); await pause(150); l = await lire('#m-motif');
    v(nom + 'G2 Modifier : un motif de 30 lignes (' + lignes.length + ' signes) garde ses sauts de ligne (' + (l.v.match(/\n/g) || []).length + ')', (l.v.match(/\n/g) || []).length === 29, l.g);
    await p.evaluate(() => { window.__t = []; }); await p.evaluate(() => document.querySelector('[data-action="modifierOk"]').click()); await pause(400);
    const sv = await p.evaluate(() => ({ motif: INTS.find(i => i.id === window.__iid).motif, t: window.__t.join(' | ').slice(0, 100) })); v(nom + 'G2b … et s’enregistre sans refus (' + (sv.motif || '').split('\n').length + ' lignes)', (sv.motif || '').split('\n').length === 30 && !/limité/.test(sv.t), { n: (sv.motif || '').length, t: sv.t });
    // motif long posé par le code (ancien enregistrement 700) : l'écran Modifier s'ouvre, l'enregistrement dit pourquoi, et on peut raccourcir
    await p.evaluate(() => { INTS.find(i => i.id === window.__iid).motif = 'm'.repeat(700); try { fermerPanneau(); } catch (e) {} panneauModifier(window.__iid); }); await pause(450); l = await lire('#m-motif');
    await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(400); const t2 = await p.evaluate(() => ({ t: window.__t.join(' | ').slice(0, 130), inv: document.activeElement.id }));
    v(nom + 'G3 ancien motif de 700 signes : Enregistrer refuse avec une phrase et pose le focus sur le motif (' + t2.t.slice(0, 70) + ')', /limité à 600/.test(t2.t) && t2.inv === 'm-motif', t2);
    await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace'); await p.keyboard.insertText('court'); await pause(100); await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="modifierOk"]').click(); }); await pause(400);
    v(nom + 'G3b … raccourci à la main, le motif s’enregistre', await p.evaluate(() => INTS.find(i => i.id === window.__iid).motif === 'court'), await p.evaluate(() => INTS.find(i => i.id === window.__iid).motif.length));
    // note de tâche et courriel : saisie normale puis envoi
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} tPanneau(null); }); await pause(450); await saisie('#tk-t', 'Essai tâche R5'); await poser('#tk-n', ''); await p.keyboard.insertText('Appeler le client demain & vérifier l’accès.'); await pause(100);
    await p.evaluate(() => { window.__t = []; document.querySelector('[data-tok]').click(); }); await pause(400); v(nom + 'G4 tâche avec note normale : créée', await p.evaluate(() => TACHES.some(t => t.t === 'Essai tâche R5')), await p.evaluate(() => window.__t.join(' | ').slice(0, 100)));
    // courriel : un corps long préparé par l'application (relance) passe-t-il ? on prend la plus longue des préparations existantes via panneauEnvoi avec un corps de 5 200 signes
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauEnvoi({ objet: 'Essai', corps: 'ligne de relance — facture n° 2026-001 : 120,00 €\n'.repeat(120), pj: 'a.pdf' }); }); await pause(450);
    l = await lire('#ml-m'); await p.evaluate(() => { document.querySelector('#ml-a').value = 'a@exemple.fr'; window.__t = []; }); const e0 = await p.evaluate(() => ENVOIS.length); await p.evaluate(() => document.querySelector('[data-mailenvoi]').click()); await pause(400);
    const e1 = await p.evaluate(() => ({ n: ENVOIS.length, t: window.__t.join(' | ').slice(0, 130) })); v(nom + 'G5 courriel préparé de ' + l.g + ' signes (relance de 120 lignes) : ' + (e1.n > e0 ? 'part' : 'refusé « ' + e1.t + ' »'), true, { signes: l.g, ...e1 });
    v(nom + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
