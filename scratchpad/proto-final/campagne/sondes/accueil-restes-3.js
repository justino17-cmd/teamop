// RESTES de l'Accueil, tour 3 (décisions du chef du 17/11, 12 h 35) — l'argent noté sur place par le technicien :
//  M. LE MOYEN NE CHANGE PAS LA RÈGLE : Espèces, Chèque, Carte, Virement × envoi manuel / automatique de la facture : UNE ligne « reçu sur place » avec son moyen,
//     comptée par l'Accueil et la Comptabilité au même montant ; la seule différence est la facture (« pas encore sur une facture » tant qu'elle n'est pas partie) ;
//  D. LE JOUR OÙ L'ARGENT EST REÇU : i8 (prévue le 2 novembre, finie le 31 octobre) avec 50 € compte 50 € en octobre, partout (Accueil, Historique, Comptabilité,
//     fiche intervention, Statistiques) — on ne refuse pas « Terminée » avant le jour prévu ;
//  F. LE CAS « FACTURE DÉJÀ PARTIE » : facture envoyée AVANT « Terminée » avec un encaissement d'un autre moyen (carte du client) ; le technicien note des espèces : la ligne de
//     l'Historique ne dit QUE ces espèces (jamais le total de la facture), l'encaissement s'inscrit une fois, pour ce qui reste à payer et pas plus ;
//  C. le graphique des 12 mois ne défile plus pour la seule marge du fondu (590-625 px, iPad 890-900) ; T. la tuile « Encaissé » du bilan à 320 px : « TTC » reste à côté du montant.
// node accueil-restes-3.js [parties : M D F C T V, collées] [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const partie = (process.argv[2] || 'MDFCTV').toUpperCase(), profil = process.argv[3] || 'mac', nuit = process.argv.includes('nuit'), veut = k => partie.includes(k);
const tag = profil + (nuit ? '-nuit' : '-jour'), arrondi = x => Math.round(x * 100) / 100;
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `restes3-${n}-${tag}.png`, false); } catch (e) {} };
  const propre = async (auto, qui) => { await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} }); await p.reload(); await p.waitForTimeout(1200);
    await p.evaluate(a => { reglages.auto = a; route = 'accueil'; }, !!auto); if (qui) await p.evaluate(q => { sessionOuvrir(q); }, qui); };
  // le technicien termine l'intervention `id` avec CE paiement ; avant, `avant` peut préparer l'état (une facture déjà partie)
  const terminer = async (id, qui, pa, auto, avant) => { await propre(auto, qui); if (avant) await p.evaluate(avant, id);
    await L.aller(p, 'inter-x-' + id); await L.calme(p, 400);
    await p.evaluate(([id, pa]) => { const F = fiche(id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Pièce', q: '1', pu: 35.5 }]; F.paiement = pa; }, [id, pa]);
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
    return argent(id); };
  const argent = id => p.evaluate(id => ({ st: INTS.find(o => o.id === id).st,
    lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id).map(j => ({ det: j.det, v: parseFloat(j.det.replace(/[  ]/g, '').replace(',', '.')), mode: j.det.split(' · ')[1] })),
    terrain: cpPaieTerrain().filter(e => e.int === id).map(e => ({ d: e.d, h: e.h, ttc: e.ttc, mode: e.mode })), enc: ENCAISSEMENTS.filter(e => e.int === id).map(e => ({ d: e.d, ttc: e.ttc, mode: e.mode, fac: e.fac })),
    carte30: ENCAISSEMENTS.some(e => e.fac === 'FAC-2026-0199' && e.mode === 'Carte' && e.ttc === 30),
    fac: FACTURES.filter(f => f.int === id && f.st !== 'annulee').map(f => ({ num: f.num, st: f.st, recu: f.recu || 0, ttc: ttcDe(f) })), tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) }), id);
  const somme = a => arrondi(a.reduce((s, x) => s + (x.ttc !== undefined ? x.ttc : x.v), 0));

  // ── M. quatre moyens × deux modes d'envoi
  if (veut('M')) {
    for (const mode of ['Espèces', 'Chèque', 'Carte', 'Virement']) for (const auto of [false, true]) {
      const nom = `M · ${mode}, « total » sans montant, envoi ${auto ? 'automatique' : 'manuel'}`, e = await terminer('i1', 'sm', { etat: 'total', mode, montant: '', ticket: false }, auto);
      v(nom + ' · population : l’intervention est terminée, une ligne dans l’Historique', e.st === 'fait' && e.lignes.length === 1, e.lignes);
      v(nom + ' · la ligne dit le moyen (' + mode + ')', e.lignes.length === 1 && e.lignes[0].mode === mode, e.lignes);
      const compte = arrondi(somme(e.terrain) + somme(e.enc));
      v(nom + ' · le montant de la ligne (' + (e.lignes[0] || {}).v + ' €) est celui que l’Accueil et la Comptabilité comptent (' + compte + ' €)', e.lignes.length === 1 && Math.abs(e.lignes[0].v - compte) < .01 && compte > 100, e);
      v(nom + (auto ? ' · la facture part payée : plus rien « sur place », un encaissement' : ' · la facture attend : l’argent est « sur place », pas encore sur une facture'),
        auto ? e.terrain.length === 0 && e.enc.length === 1 && e.fac[0].num !== '—' : e.terrain.length === 1 && e.enc.length === 0 && e.fac[0].num === '—', e);
    }
    // l'Accueil le dit, pour une carte comme pour des espèces
    await terminer('i1', 'sm', { etat: 'acompte', mode: 'Virement', montant: '30', ticket: false }, false); await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} sessionOuvrir('marc'); });
    await L.aller(p, 'accueil'); await L.calme(p, 500);
    const t = (await p.evaluate(() => document.querySelector('[data-kdash="enc"]').textContent)).replace(/[  ]/g, ' ');
    v('M · l’Accueil dit « reçus sur place, pas encore sur une facture » avec le virement noté (' + t.replace(/\s+/g, ' ').slice(0, 110) + ')', /reçus sur place, pas encore sur une facture/.test(t), t);
  }

  // ── D. une intervention prévue le 2 novembre, finie le 31 octobre : l'argent compte en octobre
  if (veut('D')) {
    const av = await (async () => { await propre(false, null); return p.evaluate(() => ({ d: INTS.find(o => o.id === 'i8').d, tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) })); })();
    v('D · population : i8 est prévue après octobre (' + av.d + ')', av.d > '2026-10-31', av);
    const e = await terminer('i8', 'kb', { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }, false);
    v('D · i8 terminée : UNE ligne « 50,00 € · Espèces » dans l’Historique', e.st === 'fait' && e.lignes.length === 1 && e.lignes[0].v === 50, e);
    v('D · l’argent est daté du 31/10 (le jour reçu), compté 50 €', e.terrain.length === 1 && e.terrain[0].d === '31/10' && e.terrain[0].ttc === 50, e.terrain);
    v('D · le total « reçu sur place » monte de 50 €', arrondi(e.tout - av.tout) === 50, { avant: av.tout, apres: e.tout });
    // les écrans qui le lisent : Accueil, Comptabilité (le mois, caisse, journal), fiche intervention, Statistiques (on repasse gérant SANS recharger : la page perdrait l'état)
    await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} sessionOuvrir('marc'); });
    const ecr = await p.evaluate(() => { const E = cpEncOct().filter(x => x.int === 'i8'), C = cpCaisse(), ec = cpEcritures().filter(x => /Reçu I8/.test(x.piece));
      return { enc: E.reduce((s, x) => s + x.ttc, 0), chezTech: C.chezTech.filter(x => x.int === 'i8').reduce((s, x) => s + x.ttc, 0), ecritures: ec.length, dateEcr: ec.map(x => x.d) }; });
    v('D · Comptabilité : l’encaissement est dans le mois (50 €), la caisse du technicien le porte, une écriture au 31/10', ecr.enc === 50 && ecr.chezTech === 50 && ecr.ecritures >= 1 && ecr.dateEcr.every(d => d === '31/10'), ecr);
    await L.aller(p, 'accueil'); await L.calme(p, 500);
    const acc = (await p.evaluate(() => document.querySelector('[data-kdash="enc"]').textContent)).replace(/[  ]/g, ' ');
    v('D · Accueil : « dont … reçus sur place » compte les 50 € (' + acc.replace(/\s+/g, ' ').slice(0, 110) + ')', /dont 90 € reçus sur place|dont 90,00 € reçus sur place/.test(acc), acc);
    await L.aller(p, 'inter-x-i8'); await L.calme(p, 500);
    const fi = (await p.evaluate(() => document.querySelector('#contenu').textContent)).replace(/[  ]/g, ' ');
    v('D · la fiche de l’intervention parle des 50 € reçus sur place', /50,00 € versé sur place|50,00 € · espèces/i.test(fi), fi.match(/.{0,60}sur place.{0,60}/) && fi.match(/.{0,60}sur place.{0,60}/)[0]);
    await p.evaluate(() => { stPer = 'mois'; stK = ST_FIN; }); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    const st = (await p.evaluate(() => document.querySelector('#contenu').textContent)).replace(/[  ]/g, ' ');
    v('D · Statistiques : « hors 90 € reçus sur place » (les 40 € d’avant + les 50 €)', /hors 90 € reçus sur place/.test(st), st.match(/hors [^ ]+ ?€ reçus sur place/));
    await cap('i8-accueil');
    // contre-épreuve : le jour prévu dans le mois ne change rien (i3, octobre) ; et un pointage « Marquer terminée » sans paiement ne crée rien
    const e3 = await terminer('i3', 'kb', { etat: 'total', mode: 'Chèque', montant: '', ticket: false }, false);
    v('D · contre-épreuve i3 (prévue en octobre) : une ligne, comptée au 31/10', e3.lignes.length === 1 && e3.terrain.length === 1 && e3.terrain[0].d === '31/10', e3);
    // une intervention terminée par le menu « Marquer terminée » (sans « Terminer » de la fiche) garde le jour prévu : rien de nouveau n'est compté
    await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} sessionOuvrir('marc'); });
    const m = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i2'); const avant = cpPaieTerrain().reduce((s, e) => s + e.ttc, 0); i.st = 'fait'; return { avant, apres: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) }; });
    v('D · contre-épreuve : « marquer terminée » sans paiement noté ne compte rien', m.avant === m.apres, m);
  }

  // ── F. la facture était DÉJÀ partie, avec le paiement par carte du client : le technicien note des espèces
  if (veut('F')) {
    const facture = id => { const i = INTS.find(o => o.id === id); FACTURES.unshift({ id: 'f-test-' + id, num: 'FAC-2026-0199', cli: i.cli, int: id, objet: 'Test · ' + id, ht: 200, tva: 20, st: 'partielle', emise: '31/10', ech: '30/11', recu: 30 });
      ENCAISSEMENTS.unshift({ d: '31/10', h: '09:00', cli: i.cli, fac: 'FAC-2026-0199', mode: 'Carte', ttc: 30, tva: 20 }); };
    for (const [nom, pa, attendu] of [['acompte 50 € en espèces', { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }, 50], ['« payé en totalité » en espèces, sans montant', { etat: 'total', mode: 'Espèces', montant: '', ticket: false }, 210], ['acompte de 500 € (plus que le reste)', { etat: 'acompte', mode: 'Espèces', montant: '500', ticket: false }, 210]]) {
      const e = await terminer('i8', 'kb', pa, false, facture), n = 'F · facture déjà partie (240 € dont 30 € payés par carte), ' + nom;
      v(n + ' · population : la facture existe, 30 € de carte', e.fac.length === 1 && e.fac[0].num === 'FAC-2026-0199' && e.carte30, e);
      v(n + ' · la ligne de l’Historique dit ' + attendu + ' € (ce que le technicien a reçu), jamais le total de la facture', e.lignes.length === 1 && e.lignes[0].v === attendu && e.lignes[0].mode === 'Espèces', e.lignes);
      v(n + ' · l’encaissement des espèces est inscrit UNE fois sur la facture : ' + (30 + attendu) + ' € reçus en tout', e.enc.filter(x => x.mode === 'Espèces').length === 1 && e.fac[0].recu === 30 + attendu, e);
      v(n + ' · rien « sur place » de plus (la facture est partie : l’argent est sur elle)', e.terrain.length === 0, e.terrain);
      v(n + ' · la facture passe ' + (30 + attendu >= 240 ? 'payée' : 'partielle'), e.fac[0].st === (30 + attendu >= 240 ? 'payee' : 'partielle'), e.fac);
    }
  }

  // ── C. le graphique des 12 mois ne défile plus pour la seule marge du fondu
  if (veut('C')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    const larges = [530, 560, 590, 600, 610, 620, 625, 640, 700, 760]; let n = 0;
    for (const w of larges) {
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150);
      await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 350);
      const g = await p.evaluate(() => { const e = document.querySelector('.st-graph'); if (!e) return null; const cs = getComputedStyle(e), q = document.querySelector('.st-glisse');
        return { defile: e.scrollWidth > e.clientWidth + 1, surplus: e.scrollWidth - e.clientWidth, gl: !!q && getComputedStyle(q).display !== 'none', mask: /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''), co: Math.round(e.parentElement.getBoundingClientRect().width) }; });
      n++; if (!g) { v('C · ' + w + ' px · graphique présent', false); continue; }
      v(`C · ${w} px (carte ${g.co}) · ${g.defile ? 'défile de ' + g.surplus + ' px' : 'tient'} · phrase ${g.gl} · fondu ${g.mask}`, g.defile ? (g.surplus > 30 && g.gl && g.mask) : (!g.gl && !g.mask), g);
    }
    v('C · population : ' + n + ' largeurs jouées', n === larges.length);
  }

  // ── T. la tuile « Encaissé » du bilan à 320 px : le montant et « TTC » ne se séparent pas, dans AUCUNE des deux tuiles
  if (veut('T')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    for (const [w, val] of [[320, null], [320, 12345.67], [360, null], [390, null]]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(200);
      await p.evaluate(() => { stPer = 'mois'; stK = ST_FIN; });
      await L.aller(p, 'statistiques'); await L.calme(p, 400); await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(700);
      const t = await p.evaluate(val => [...document.querySelectorAll('.bil-t')].filter(x => /Facturé|Encaissé/.test(x.querySelector('span').textContent)).map(x => { const b = x.querySelector('b'), i = b.querySelector('i'); if (val) b.innerHTML = '12 346 € <i>' + i.textContent + '</i>'; const i2 = b.querySelector('i'), rb = b.getBoundingClientRect(), ri = i2.getBoundingClientRect(), rt = x.getBoundingClientRect(); return { lib: x.querySelector('span').textContent, memeLigne: rb.height < 1.6 * parseFloat(getComputedStyle(b).fontSize) && Math.abs(ri.top + ri.height / 2 - (rb.top + rb.height / 2)) < ri.height,   /* une seule ligne de texte : la boîte du montant ne fait pas deux lignes */ dedans: rb.right <= rt.right + 1 && b.scrollWidth <= x.clientWidth + 1, txt: b.textContent.replace(/\s+/g, ' ') }; }), val);
      v(`T · ${w} px${val ? ' · valeur longue' : ''} · population : les deux tuiles Facturé et Encaissé sont là`, t.length >= 2, t);
      v(`T · ${w} px${val ? ' · valeur longue' : ''} · le montant et l’unité tiennent sur UNE ligne, dans la tuile (${t.map(x => x.txt).join(' | ')})`, t.every(x => x.memeLigne && x.dedans), t);
      if (w === 320 && !val) await cap('bilan-320');
      await L.ranger(p);
    }
  }
  // ── V. la fiche d'une facture envoyée, à 320 px : « Annuler cette facture par un avoir » reste dans la carte (le bouton sortait de 13 px, la page glissait de côté)
  if (veut('V')) {
    await propre(false, null); await p.evaluate(() => { sessionOuvrir('marc'); });
    const fid = await p.evaluate(() => (FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st)) || {}).id);
    v('V · population : une facture envoyée existe', !!fid, fid);
    for (const w of [320, 360, 390]) {
      await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(200);
      await L.aller(p, 'facture-x-' + fid); await L.calme(p, 600);
      const m = await p.evaluate(async w => { scrollTo(9999, 0); await new Promise(r => setTimeout(r, 250)); const sx = scrollX; scrollTo(0, 0); const b = document.querySelector('[data-action="avoir"]'), k = b && b.closest('.carte'), r = b && b.getBoundingClientRect(), q = k && k.getBoundingClientRect();
        return { bouton: !!b, sx, iw: innerWidth, dedans: !!b && r.right <= q.right + .5 && r.right <= w, h: r && Math.round(r.height) }; }, w);
      v(`V · ${w} px · le bouton « Annuler par un avoir » existe, dans sa carte, et la page ne glisse pas de côté`, m.bouton && m.dedans && m.sx === 0 && m.iw === w, m);
      await L.ranger(p);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
