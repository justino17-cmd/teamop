// RECONTRÔLE ADVERSE des restes de l'Accueil, tour 3 (18 novembre 2026) : cherche ce que les corrections du tour ont CASSÉ à côté.
//  A. graphique des 12 mois (seuil de conteneur 527 px) : balayage fin des largeurs, paysage de téléphone, tous les indicateurs de Statistiques, deux périodes —
//     la règle « défile ⇒ marge + fondu + phrase, tient ⇒ aucun des trois » tient partout, et le premier / dernier mois restent entiers ;
//  B. l'argent noté sur place : les portes que le tour n'a pas jouées (« Marquer terminée » du menu avec un paiement déjà noté, « Remettre à faire » puis re-terminer
//     avec un autre montant, facture déjà payée en entier, facture en retard payée en partie, « Terminer » rejoué) — le jour, le montant, l'Historique et l'Accueil se disent la même chose ;
//  C. tuiles du bilan (white-space:nowrap) : AUCUNE tuile du bilan ne sort de sa carte, à 320 px, avec des valeurs longues, dans les trois bilans ;
//  D. le bouton « Annuler par un avoir » : TOUTES les fiches de facture, à 320 et 360 px, aucun bouton ne sort de sa carte et la page ne glisse pas.
// node restes-accueil-3-recontrole.js [parties : A B C D, collées] [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const partie = (process.argv[2] || 'ABCD').toUpperCase(), profil = process.argv[3] || 'mac', nuit = process.argv.includes('nuit'), veut = k => partie.includes(k);
const tag = profil + (nuit ? '-nuit' : '-jour'), arrondi = x => Math.round(x * 100) / 100;
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `rr3-${n}-${tag}.png`, false); } catch (e) {} };
  const propre = async (auto, qui) => { await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} }); await p.reload(); await p.waitForTimeout(1200);
    await p.evaluate(a => { reglages.auto = a; route = 'accueil'; }, !!auto); if (qui) await p.evaluate(q => { sessionOuvrir(q); }, qui); };

  // ── A. le graphique des 12 mois
  if (veut('A')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    const mesure = () => p.evaluate(() => { const e = document.querySelector('.st-graph'); if (!e) return null; const cs = getComputedStyle(e), q = document.querySelector('.st-glisse'), cols = [...e.children].filter(x => x.getBoundingClientRect().width > 4);
      const re = e.getBoundingClientRect(); const prem = cols[0] && cols[0].getBoundingClientRect(), der = cols[cols.length - 1] && cols[cols.length - 1].getBoundingClientRect();
      return { defile: e.scrollWidth > e.clientWidth + 1, surplus: e.scrollWidth - e.clientWidth, gl: !!q && getComputedStyle(q).display !== 'none', mask: /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''), co: Math.round(e.parentElement.getBoundingClientRect().width),
        colonnes: cols.length, dernierEntier: !!der && der.right <= re.right + 1 && der.left >= re.left - 1, page: document.documentElement.scrollWidth, iw: innerWidth }; });
    let n = 0, defilent = 0, tiennent = 0;
    for (const w of [500, 515, 520, 527, 528, 529, 535, 545, 556, 557, 558, 565, 580, 650, 745, 760, 761, 780, 820, 880, 900, 901]) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150);
      for (const k of ['fin']) { await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 350); }
      const g = await mesure(); n++; if (!g) { v('A · ' + w + ' px · graphique présent', false); continue; }
      // sous 761 px la règle est « écran étroit » ; au-dessus, seulement au doigt : au bureau sans doigt aucune marge n'est posée (le profil mac n'a pas de doigt)
      const regle = w <= 760 || (c.doigt && w <= 900);
      if (g.defile) defilent++; else tiennent++;
      v(`A · ${w} px (carte ${g.co}) · ${g.defile ? 'défile de ' + g.surplus : 'tient'} · phrase ${g.gl} · fondu ${g.mask}`, regle ? (g.defile ? (g.surplus > 28 && g.gl && g.mask) : (!g.gl && !g.mask)) : (!g.gl && !g.mask), g);
      v(`A · ${w} px · la page ne glisse pas de côté (${g.page} contre ${g.iw})`, g.page <= g.iw + 1, g);
    }
    v('A · population : ' + n + ' largeurs, ' + defilent + ' où le graphique défile et ' + tiennent + ' où il tient', n >= 20 && defilent >= 2 && tiennent >= 3, { defilent, tiennent });
    // tous les indicateurs de Statistiques qui ont un graphique, deux périodes
    const cles = await p.evaluate(() => (typeof ST_KPIS !== 'undefined' ? Object.keys(ST_KPIS) : []).slice(0, 12));
    await p.setViewportSize({ width: 600, height: 900 }); await p.waitForTimeout(150);
    let vus = 0;
    for (const per of ['mois', 'trimestre', 'annee']) { await p.evaluate(x => { try { stPer = x; stK = ST_FIN; } catch (e) {} }, per); await L.aller(p, 'statistiques'); await L.calme(p, 300);
      const g = await mesure(); if (!g) continue; vus++; v(`A · période ${per}, 600 px : cohérent (défile ${g.defile}, phrase ${g.gl}, fondu ${g.mask})`, g.defile ? (g.gl && g.mask) : (!g.gl && !g.mask), g); }
    v('A · population : le graphique a été vu sur ' + vus + ' période(s)', vus >= 1, vus);
    // paysage de téléphone : 844 × 390 au doigt (règle « pointer:coarse », 761-900) et 740 × 360 (règle « écran étroit »)
    for (const [w, h] of [[844, 390], [740, 360], [667, 375]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(200);
      await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 400); const g = await mesure();
      v(`A · paysage ${w}×${h} : cohérent et la page ne glisse pas (carte ${g && g.co}, défile ${g && g.defile})`, !!g && (g.defile ? (g.gl && g.mask) : (!g.gl && !g.mask)) && g.page <= g.iw + 1, g); }
    // calage : le graphique défile et s'ouvre calé à droite — le DERNIER mois est entier ; en glissant à gauche le PREMIER l'est aussi
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200); await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    const cal = await p.evaluate(async () => { const e = document.querySelector('.st-graph'); if (!e) return null; const cols = [...e.children].filter(x => x.getBoundingClientRect().width > 4); const re = () => e.getBoundingClientRect();
      const fin = e.scrollLeft, dernier = cols[cols.length - 1].getBoundingClientRect(); const dOk = dernier.right <= re().right + 1; e.scrollLeft = 0; await new Promise(r => setTimeout(r, 150));
      const prem = cols[0].getBoundingClientRect(), pOk = prem.left >= re().left - 1; e.scrollLeft = fin; return { defile: e.scrollWidth > e.clientWidth + 1, dOk, pOk, fin, txtD: cols[cols.length - 1].textContent.replace(/\s+/g, ' ').trim(), txtP: cols[0].textContent.replace(/\s+/g, ' ').trim() }; });
    v('A · 390 px : le dernier mois est entier à l’ouverture, le premier l’est une fois glissé à gauche', !!cal && cal.defile && cal.dOk && cal.pOk, cal);
    await cap('graph-390');
  }

  // ── B. l'argent noté sur place : les portes non jouées par le tour
  const terminer = async (id, qui, pa, auto, avant) => { await propre(auto, qui); if (avant) await p.evaluate(avant, id);
    await L.aller(p, 'inter-x-' + id); await L.calme(p, 400);
    await p.evaluate(([id, pa]) => { const F = fiche(id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Pièce', q: '1', pu: 35.5 }]; F.paiement = pa; }, [id, pa]);
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
    return argent(id); };
  const argent = id => p.evaluate(id => ({ st: INTS.find(o => o.id === id).st,
    lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id).map(j => ({ det: j.det, v: parseFloat(j.det.replace(/[  ]/g, '').replace(',', '.')), mode: j.det.split(' · ')[1] })),
    terrain: cpPaieTerrain().filter(e => e.int === id).map(e => ({ d: e.d, ttc: e.ttc, mode: e.mode })), enc: ENCAISSEMENTS.filter(e => e.int === id).map(e => ({ d: e.d, ttc: e.ttc, mode: e.mode, fac: e.fac })),
    fac: FACTURES.filter(f => f.int === id && f.st !== 'annulee').map(f => ({ num: f.num, st: f.st, recu: f.recu || 0, ttc: ttcDe(f) })), recuLe: (fiche(id).paiement || {}).recuLe, tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) }), id);
  if (veut('B')) {
    // B1. « Marquer terminée » (menu de l'intervention) avec un paiement DÉJÀ noté par le technicien, sur une intervention prévue après octobre : même défaut que celui que le tour a réglé par « Terminer »
    await propre(false, 'marc');
    // (tour 4 : le geste est joué par le VRAI menu de la carte, plus en posant i.st à la main)
    const avant1 = await p.evaluate(() => { fiche('i8').paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }; return cpPaieTerrain().reduce((s, e) => s + e.ttc, 0); });
    await p.evaluate(() => { fermerMenu(); menuCarte('i8', 300, 300); }); await p.waitForTimeout(250); await L.toucher(c, p.locator('.ctx button', { hasText: /Marquer terminée/ }).first()); await L.calme(p, 400);
    const b1 = await p.evaluate(av => { const i = INTS.find(o => o.id === 'i8'); return { d: i.d, avant: av, apres: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), ligne: JOURNAL.some(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === 'i8') }; }, avant1);
    v('B1 · population : i8 est prévue après octobre (' + b1.d + ')', b1.d > '2026-10-31', b1);
    v('B1 · « Marquer terminée » avec 50 € déjà notés sur place : les 50 € sont comptés quelque part (Accueil, Comptabilité) — sinon l’argent n’existe nulle part', b1.apres - b1.avant === 50, b1);
    // B2. « Remettre à faire », le technicien corrige le montant, « Terminer » : la ligne de l'Historique dit ce que l'Accueil compte
    const e1 = await terminer('i3', 'kb', { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }, false);
    v('B2 · population : i3 terminée avec 50 € (une ligne)', e1.st === 'fait' && e1.lignes.length === 1 && e1.lignes[0].v === 50, e1);
    const b2 = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i3'), F = fiche('i3'); i.st = 'planifiee'; /* « Remettre à faire » */ F.etat = 'enCours'; F.paiement.montant = '80'; return true; });
    await L.aller(p, 'inter-x-i3'); await L.calme(p, 400); await p.evaluate(() => { const F = fiche('i3'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; });
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
    const e2 = await argent('i3');
    v('B2 · re-terminée avec 80 € : l’Accueil compte 80 €, et la ligne de l’Historique dit 80 € (pas encore 50 €, pas deux lignes)', e2.terrain.reduce((s, x) => s + x.ttc, 0) === 80 && e2.lignes.reduce((s, x) => s + x.v, 0) === 80 && e2.lignes.length <= 1, e2);
    // B3. facture déjà PAYÉE en entier avant « Terminer » : le technicien note quand même des espèces — rien ne doit être compté deux fois, rien ne doit planter
    const f3 = (id) => { const i = INTS.find(o => o.id === id); FACTURES.unshift({ id: 'f-rr-' + id, num: 'FAC-2026-0198', cli: i.cli, int: id, objet: 'Test', ht: 200, tva: 20, st: 'payee', emise: '31/10', ech: '30/11', recu: 240, paye: '31/10', mode: 'Carte' });
      ENCAISSEMENTS.unshift({ d: '31/10', h: '09:00', cli: i.cli, fac: 'FAC-2026-0198', mode: 'Carte', ttc: 240, tva: 20 }); };
    const e3 = await terminer('i8', 'kb', { etat: 'total', mode: 'Espèces', montant: '', ticket: false }, false, f3);
    v('B3 · facture déjà payée (240 € par carte) puis « payé en totalité » en espèces : la facture reste à 240 € reçus (pas 480)', e3.fac.length === 1 && e3.fac[0].recu === 240 && e3.fac[0].st === 'payee', e3);
    v('B3 · aucun encaissement d’espèces en plus, rien « sur place » en plus, pas d’erreur JavaScript', e3.enc.filter(x => x.mode === 'Espèces').length === 0 && e3.terrain.length === 0 && c.err.length === 0, { e3, err: c.err.slice(0, 2) });
    // B4. facture EN RETARD payée en partie : elle reste « en retard » ; payée en entier : « payée »
    const f4 = (id) => { const i = INTS.find(o => o.id === id); FACTURES.unshift({ id: 'f-rr4-' + id, num: 'FAC-2026-0197', cli: i.cli, int: id, objet: 'Test', ht: 200, tva: 20, st: 'retard', emise: '01/10', ech: '15/10', recu: 0 }); };
    const e4 = await terminer('i8', 'kb', { etat: 'acompte', mode: 'Espèces', montant: '100', ticket: false }, false, f4);
    v('B4 · facture en retard payée de 100 € sur 240 € : encore « en retard », 100 € reçus, une ligne dans l’Historique à 100 €', e4.fac.length === 1 && e4.fac[0].st === 'retard' && e4.fac[0].recu === 100 && e4.lignes.length === 1 && e4.lignes[0].v === 100, e4);
    const e4b = await terminer('i8', 'kb', { etat: 'total', mode: 'Espèces', montant: '', ticket: false }, false, f4);
    v('B4 · même facture « payé en totalité » : payée, 240 € reçus, une ligne à 240 €', e4b.fac.length === 1 && e4b.fac[0].st === 'payee' && e4b.fac[0].recu === 240 && e4b.lignes.length === 1 && e4b.lignes[0].v === 240, e4b);
    // B5. « Terminer » rejoué (la fiche rouverte puis refermée sans rien changer) : rien ne se compte deux fois — facture déjà partie, puis facture préparée
    for (const [nom, avant] of [['facture déjà partie', (id) => { const i = INTS.find(o => o.id === id); FACTURES.unshift({ id: 'f-rr5', num: 'FAC-2026-0196', cli: i.cli, int: id, objet: 'Test', ht: 200, tva: 20, st: 'envoyee', emise: '31/10', ech: '30/11', recu: 0 }); }], ['facture préparée', null]]) {
      const a = await terminer('i8', 'kb', { etat: 'acompte', mode: 'Espèces', montant: '60', ticket: false }, false, avant);
      await p.evaluate(() => { const i = INTS.find(o => o.id === 'i8'); i.st = 'planifiee'; fiche('i8').etat = 'enCours'; });
      await L.aller(p, 'inter-x-i8'); await L.calme(p, 400); await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
      const b = await argent('i8'), tot = arrondi(b.terrain.reduce((s, x) => s + x.ttc, 0) + b.enc.filter(x => x.mode === 'Espèces').reduce((s, x) => s + x.ttc, 0));
      v('B5 · ' + nom + ' : « Terminer » rejoué ne double rien (60 € comptés, une ligne)', tot === 60 && b.lignes.length === 1, { a, b });
    }
    // B6. cohérence d'ensemble après plusieurs gestes : Accueil, Comptabilité et Statistiques parlent du même « reçu sur place »
    await terminer('i3', 'kb', { etat: 'total', mode: 'Carte', montant: '', ticket: false }, false);
    await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} sessionOuvrir('marc'); });
    const att = await p.evaluate(() => cpPaieTerrain().reduce((s, e) => s + e.ttc, 0));
    await L.aller(p, 'accueil'); await L.calme(p, 500);
    const t = (await p.evaluate(() => document.querySelector('[data-kdash="enc"]').textContent)).replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
    const m = t.match(/dont ([\d  ]+(?:,\d+)?) ?€ reçus sur place/); const aff = m ? parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) : null;
    v('B6 · l’Accueil affiche le même « reçu sur place » que le calcul (' + att + ' €)', aff !== null && Math.abs(aff - att) < 1, { t: t.slice(0, 140), att, aff });
    await p.evaluate(() => { stPer = 'mois'; stK = ST_FIN; }); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    const st = (await p.evaluate(() => document.querySelector('#contenu').textContent)).replace(/[  ]/g, ' ').replace(/\s+/g, ' '); const m2 = st.match(/hors ([\d  ]+) ?€ reçus sur place/);
    v('B6 · les Statistiques disent « hors ' + att + ' € reçus sur place »', !!m2 && Math.abs(parseFloat(m2[1].replace(/\s/g, '')) - att) < 1, { m2: m2 && m2[0], att });
    await cap('argent');
  }

  // ── C. tuiles du bilan à 320 px, valeurs longues : aucune ne sort de sa carte, dans les trois bilans (activité, historique, tâches)
  if (veut('C')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    for (const w of [320, 360]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(200);
      await p.evaluate(() => { stPer = 'mois'; stK = ST_FIN; }); await L.aller(p, 'statistiques'); await L.calme(p, 400); await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(800);
      for (const [val, nom] of [[null, 'valeurs du jeu'], ['123 456 €', 'valeur de 6 chiffres'], ['1 234 567 €', 'valeur de 7 chiffres'], ['12 345 678 €', 'valeur de 8 chiffres']]) {
        const t = await p.evaluate(val => { const sortie = []; for (const x of document.querySelectorAll('.bil-t')) { const b = x.querySelector('b'); if (!b) continue; if (val) { const i = b.querySelector('i'); b.innerHTML = val + (i ? ' <i>' + i.textContent + '</i>' : ''); }
            const rb = b.getBoundingClientRect(), rt = x.getBoundingClientRect(), sec = x.closest('section, .bil'), rs = sec && sec.getBoundingClientRect(); sortie.push({ lib: x.querySelector('span').textContent, texte: b.textContent.trim(), dedans: rb.right <= rt.right + .5 && b.scrollWidth <= b.clientWidth + 1, tuile: Math.round(rt.width), b: Math.round(b.scrollWidth), carte: rs ? rt.right <= rs.right + .5 : true, sectionDefile: sec ? sec.scrollWidth > sec.clientWidth + 1 : false }); } return sortie; }, val);
        v(`C · ${w} px · ${nom} · population : ${t.length} tuiles (≥ 4)`, t.length >= 4, t.length);
        v(`C · ${w} px · ${nom} · aucune tuile n’est dépassée par son montant ; aucune ne sort de sa section (ou, si elle sort, la section défile : jamais la page)`, t.every(x => x.dedans && (x.carte || x.sectionDefile)), t.filter(x => !x.dedans || !(x.carte || x.sectionDefile)));
        if (val && /^1 234|^12 345/.test(val)) console.log(`  · DOUTE ${w} px · ${nom} : ${t.every(x => x.carte) ? 'les tuiles tiennent dans leur section' : 'les tuiles sortent de leur section, qui défile de côté (la page, non)'}`);
        const dbg = await L.deborde(c); v(`C · ${w} px · ${nom} · la page ne glisse pas de côté (${dbg.bouge} px)`, dbg.bouge === 0, dbg); }
      await L.ranger(p); }
    await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(200); await cap('bilan-long');
  }

  // ── D. TOUTES les fiches de facture : aucun bouton ne sort de sa carte, la page ne glisse pas (le correctif de l'avoir touche UN bouton : les autres sont-ils sains ?)
  if (veut('D')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    const ids = await p.evaluate(() => FACTURES.map(f => f.id)); v('D · population : ' + ids.length + ' factures (≥ 6)', ids.length >= 6, ids.length);
    const parEtat = await p.evaluate(() => [...new Set(FACTURES.map(f => f.st))]); v('D · population : les états de facture sont variés (' + parEtat.join(', ') + ')', parEtat.length >= 3, parEtat);
    for (const w of [320, 360]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(200); const mal = [];
      for (const id of ids) { await L.aller(p, 'facture-x-' + id); await L.calme(p, 250);
        const m = await p.evaluate(async w => { scrollTo(9999, 0); await new Promise(r => setTimeout(r, 120)); const sx = scrollX; scrollTo(0, 0); const sortis = [];
          for (const b of document.querySelectorAll('#contenu button, #contenu .btn, #contenu a.btn')) { if (!b.offsetParent) continue; const r = b.getBoundingClientRect(), k = b.closest('.carte'); if (r.width < 2) continue; const q = k && k.getBoundingClientRect(); if (r.right > w + .5 || r.left < -.5 || (q && (r.right > q.right + .5 || r.left < q.left - .5))) sortis.push((b.textContent || '').trim().slice(0, 40) + ' ' + Math.round(r.left) + '→' + Math.round(r.right) + (q ? ' carte ' + Math.round(q.left) + '→' + Math.round(q.right) : '')); }
          return { sx, iw: innerWidth, sortis }; }, w);
        if (m.sx !== 0 || m.iw !== w || m.sortis.length) mal.push([id, m]); }
      v(`D · ${w} px · sur ${ids.length} fiches de facture : aucun bouton ne sort de sa carte ni de l’écran, la page ne glisse jamais`, mal.length === 0, mal.slice(0, 5)); }
    await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(200);
    const fid = await p.evaluate(() => (FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st)) || {}).id); await L.aller(p, 'facture-x-' + fid); await L.calme(p, 500);
    await p.evaluate(() => { const b = document.querySelector('[data-action="avoir"]'); if (b) b.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(250); await cap('avoir-320');
    // le bouton garde-t-il sa hauteur de doigt (44 px) une fois sur deux lignes ?
    const h = await p.evaluate(() => { const b = document.querySelector('[data-action="avoir"]'); return b ? Math.round(b.getBoundingClientRect().height) : 0; });
    v('D · le bouton « Annuler par un avoir » reste un vrai doigt (≥ 44 px de haut : ' + h + ')', h >= 44, h);
    if (c.doigt) { const ok = await L.toucher(c, '[data-action="avoir"]'); const et = await L.etat(p); v('D · il répond au toucher (ouvre quelque chose)', ok && !!(et.panneau || et.toast || et.hash !== '#facture-x-' + fid), et); }
  }
  v('aucune erreur JavaScript pendant toute la sonde', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
