// RECONTRÔLE ADVERSE des RESTES de l'Accueil, tour 1 : ce que les trois corrections (la ligne « reçu sur place » de l'Historique,
// la note « non compris » du bilan, le fondu du graphique des 12 mois) ont laissé de travers À CÔTÉ d'elles.
//  A. chaque ligne « a noté un paiement reçu sur place » correspond à de l'argent que l'Accueil / la Comptabilité COMPTENT (terrain ou encaissement), au même montant ;
//  B. l'envoi de la facture reprend cet argent UNE fois : plus de « reçu sur place », une ligne d'Historique, une seule, un encaissé qui ne double pas ;
//  C. le graphique des 12 mois : largeurs de fenêtre intermédiaires (souris ET doigt) — le premier mois n'est jamais coupé net, rien ne sort de la carte ;
//  D. l'Historique vu par les autres rôles (technicien, chef, secrétariat) ; E. valeurs LONGUES dans le bilan (tuile et tableau) sur téléphone.
// node accueil-restes-1-recontrole.js [parties : A B C D E, ou plusieurs collées (BCD), ou toutes] [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const partie = (process.argv[2] || 'toutes').toUpperCase(), profil = process.argv[3] || 'mac', nuit = process.argv.includes('nuit');
const veut = k => partie === 'TOUTES' || partie.includes(k);   // « BCD » joue les trois parties dans UN navigateur (la machine est chargée : une place se fait attendre)
const tag = profil + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `restes1-rec-${n}-${tag}.png`, false); } catch (e) {} };
  const propre = async (auto, qui) => { await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} });   // une session ouverte survit au rechargement : on la ferme AVANT, sinon la page suivante s'ouvre verrouillée
    await p.reload(); await p.waitForTimeout(1200);
    await p.evaluate(a => { reglages.auto = a; route = 'accueil'; }, !!auto);   // sans « qui » : on reste le gérant de la page (sessionFermer le déconnecterait)
    if (qui) await p.evaluate(q => { sessionOuvrir(q); }, qui); };
  // la technicienne termine i1 avec CE paiement ; rend ce que l'Historique, l'Accueil et la Comptabilité en disent
  const terminer = async (pa, auto) => { await propre(auto, 'sm'); await L.aller(p, 'inter-x-i1'); await L.calme(p, 400);
    await p.evaluate(pa => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Roulement du ventilateur remplacé.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Roulement ventilateur', q: '1', pu: 35.5 }]; F.paiement = pa; }, pa);
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
    return etatArgent(); };
  const etatArgent = () => p.evaluate(() => ({
    lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === 'i1').map(j => ({ qui: j.qui, det: j.det, v: parseFloat(j.det.replace(/[\u00a0\u202f]/g, '').replace(',', '.')) })),
    terrain: cpPaieTerrain().filter(e => e.int === 'i1').reduce((s, e) => s + e.ttc, 0),
    enc: ENCAISSEMENTS.filter(e => e.int === 'i1').reduce((s, e) => s + e.ttc, 0),
    nEnc: ENCAISSEMENTS.filter(e => e.int === 'i1').length,
    tousTerrain: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0),
    fac: FACTURES.filter(f => f.int === 'i1' && f.st !== 'annulee').map(f => ({ num: f.num, st: f.st, recu: f.recu || 0 })) }));
  const compte = e => Math.round((e.terrain + e.enc) * 100) / 100;

  // ── A. la ligne de l'Historique dit de l'argent que l'Accueil et la Comptabilité comptent vraiment
  if (veut('A')) {
    for (const [nom, pa, auto, attendu] of [
      ['A1 · Chèque, acompte 40,50 €, facture à valider', { etat: 'acompte', mode: 'Chèque', montant: '40,50', ticket: false }, false, true],
      ['A2 · Espèces, « payé en totalité » SANS montant (« si tu le connais »), facture à valider', { etat: 'total', mode: 'Espèces', montant: '', ticket: false }, false, true],
      ['A3 · Carte, « payé en totalité » sans montant, facture à valider', { etat: 'total', mode: 'Carte', montant: '', ticket: false }, false, true],
      ['A4 · Virement, « payé en totalité » sans montant, envoi automatique', { etat: 'total', mode: 'Virement', montant: '', ticket: false }, true, true],
      ['A6 · Carte, acompte 30 € (terminal), facture à valider', { etat: 'acompte', mode: 'Carte', montant: '30', ticket: true }, false, true],
      ['A7 · Chèque, « payé en totalité » SANS montant, facture à valider', { etat: 'total', mode: 'Chèque', montant: '', ticket: false }, false, true],
      ['A8 · Espèces, « payé en totalité » avec un montant retapé (150), facture à valider', { etat: 'total', mode: 'Espèces', montant: '150', ticket: false }, false, true],
      ['A5 · contre-épreuve : « pas encore payé » ne fait AUCUNE ligne', { etat: 'rien', mode: 'Carte', montant: '', ticket: false }, false, false]]) {
      const e = await terminer(pa, auto);
      if (!attendu) { v(nom + ' · aucune ligne et rien de compté pour i1', e.lignes.length === 0 && compte(e) === 0, e); continue; }
      v(nom + ' · population : une ligne d’Historique pour i1', e.lignes.length === 1, e.lignes);
      const dit = e.lignes.reduce((s, l) => s + l.v, 0);
      v(nom + ' · l’argent que dit la ligne (' + dit.toFixed(2) + ' €) est celui que l’Accueil et la Comptabilité comptent (' + compte(e).toFixed(2) + ' €)', Math.abs(dit - compte(e)) < 0.01, e);
    }
  }

  // ── B. la facture part : l'argent passe du « reçu sur place » à l'encaissé, une seule fois
  if (veut('B')) {
    const e0 = await terminer({ etat: 'acompte', mode: 'Chèque', montant: '40,50', ticket: false }, false);
    v('B · population : 40,50 € reçus sur place, comptés au terrain, pas encore sur une facture', e0.terrain === 40.5 && e0.enc === 0 && e0.fac.length === 1 && e0.fac[0].num === '—', e0);
    const avant = await p.evaluate(() => ({ tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), nJ: JOURNAL.length }));
    await p.evaluate(() => { const f = FACTURES.find(x => x.int === 'i1' && x.st !== 'annulee'); envoyerFacture(f, true, true); });
    const e1 = await etatArgent(), apres = await p.evaluate(() => ({ tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), nJ: JOURNAL.length, ac: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === 'i1').length }));
    v('B · la facture envoyée reprend l’argent : plus rien « sur place » pour i1, 40,50 € encaissés UNE fois', e1.terrain === 0 && e1.enc === 40.5 && e1.nEnc === 1, e1);
    v('B · le total « reçu sur place » baisse d’autant (le bilan et l’Accueil ne comptent pas deux fois)', Math.abs(avant.tout - apres.tout - 40.5) < 0.01, { avant, apres });
    v('B · l’Historique garde UNE ligne « reçu sur place » pour i1 (pas deux)', apres.ac === 1, apres);
    // la note du bilan suit : « Non compris » ne parle plus que du reste (on repasse gérant : la technicienne n'a pas les Statistiques)
    const gerant = await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} const ok = sessionOuvrir('marc'); return { ok, role: ROLE }; });
    v('B · population : on est redevenu le gérant pour lire le bilan', gerant.role === 'patron', gerant);
    await p.evaluate(() => { stPer = 'mois'; stK = ST_FIN; }); await L.aller(p, 'statistiques'); await L.calme(p, 400);
    const reste = await p.evaluate(() => cpPaieTerrain().reduce((s, e) => s + e.ttc, 0));
    await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(700);
    const bil = await p.evaluate(() => (document.querySelector('#calque') || document.body).innerText.replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' '));
    const eur2 = n => n.toFixed(2).replace('.', ',') + ' €';
    v('B · le bilan dit « Non compris : ' + eur2(reste) + ' » (ce qui reste sur place, pas 40,50 de plus)', reste > 0 ? bil.includes('Non compris : ' + eur2(reste) + ' reçus sur place') : !/Non compris/.test(bil), (bil.match(/Non compris.{0,90}/) || [''])[0]);
    await L.ranger(p);
  }

  // ── C. le graphique des 12 mois, à toutes les largeurs : le premier mois n'est jamais coupé net, rien ne sort de la carte
  if (veut('C')) {
    const larges = profil === 'ipad' ? [744, 768, 820, 834, 900, 901, 1024, 1180] : [320, 390, 430, 700, 760, 761, 800, 900, 1000, 1100, 1280];
    for (const w of larges) {
      await p.setViewportSize({ width: w, height: profil === 'ipad' ? 1366 : 900 }); await p.waitForTimeout(250);
      await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
      const g = await p.evaluate(() => { const e = document.querySelector('.st-graph'); if (!e) return null; const cs = getComputedStyle(e), defile = e.scrollWidth > e.clientWidth + 1;
        if (defile) e.scrollLeft = -(e.scrollWidth - e.clientWidth);   // direction:rtl, la fin du défilement est négative
        const r = e.getBoundingClientRect(), cols = [...e.querySelectorAll('.st-col')], r0 = cols[0].getBoundingClientRect(), r1 = cols[cols.length - 1].getBoundingClientRect(), carte = (e.closest('.carte') || e.parentElement).getBoundingClientRect();
        const lib = cols.map(k => { const s = k.querySelector('small'), q = s.getBoundingClientRect(), kr = k.getBoundingClientRect(); return { txt: s.textContent.trim(), coupe: s.scrollWidth > s.clientWidth + 1, deborde: q.width > kr.width + 1 }; });
        return { defile, mask: /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''), pad: parseFloat(cs.paddingLeft), debut: Math.round(r0.left - r.left), colMin: Math.round(Math.min(...cols.map(k => k.getBoundingClientRect().width))),
          sortDeLaCarte: Math.round(defile ? Math.max(0, r.right - carte.right, carte.left - r.left) : Math.max(0, r1.right - carte.right, carte.left - r0.left))   /* un graphique qui DÉFILE a ses colonnes hors de la fenêtre par construction : on mesure alors la fenêtre elle-même contre la carte */, n: cols.length, w: Math.round(r.width), libCoupes: lib.filter(x => x.coupe || x.deborde).map(x => x.txt), page: document.documentElement.scrollWidth }; });
      v(`C · ${w} px · population : le graphique et ses 12 mois`, !!g && g.n === 12, g);
      if (!g) continue;
      v(`C · ${w} px · rien ne sort de la carte et la page ne glisse pas de côté`, g.sortDeLaCarte <= 1 && g.page <= w + 1, g);
      v(`C · ${w} px · les 12 libellés de mois tiennent dans leur colonne (colonne la plus étroite : ${g.colMin} px)`, g.libCoupes.length === 0, g);
      if (g.defile) v(`C · ${w} px · il défile : au bout, le premier mois est entier (bord à ${g.debut} px)`, g.debut >= 29 && g.mask, g);
      else console.log(`   · C · ${w} px · il ne défile pas ; masque ${g.mask}, marge gauche ${g.pad} px (observé, voir le constat du recontrôle : un vide de 30 px à gauche quand tout tient)`);
      if (w === 900 || w === 1000 || w === 820) { await p.evaluate(() => { const e = document.querySelector('.st-graph'); e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(250); await cap('graphique-' + w); }
    }
  }

  // ── D. l'Historique par les autres rôles : la ligne se montre à qui voit l'Historique, et à personne d'autre
  if (veut('D')) {
    await propre(false, null);
    const ref = await p.evaluate(() => JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place').map(j => j.qui));
    v('D · population : la ligne de départ existe et porte un technicien', ref.length >= 1 && ref.every(q => q && q !== 'marc'), ref);
    for (const qui of ['marc', 'julie', 'kb', 'sm', 'tl', 'lr']) {
      await propre(false, null); await p.evaluate(q => { try { sessionOuvrir(q); } catch (e) {} }, qui);
      const e = await p.evaluate(() => ({ session: typeof SESSION !== 'undefined' ? SESSION : null, role: ROLE, voit: typeof peutVoirHistorique === 'function' ? peutVoirHistorique() : null, menu: [...document.querySelectorAll('#menu [data-aller], nav [data-aller]')].map(b => b.dataset.aller).filter(Boolean).slice(0, 40) }));
      await p.evaluate("hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set(JOURNAL.map(j=>j.d));"); await L.aller(p, 'historique'); await L.calme(p, 500);
      const r = await p.evaluate(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent, ligne: /a noté un paiement reçu sur place/.test(document.querySelector('#contenu').innerText), erreurTexte: /undefined|NaN|\[object/.test(document.querySelector('#contenu').innerText), vue: hVoirComme }));
      const rep = { qui, role: e.role, hash: r.hash, h1: (r.h1 || '').trim(), ligneVue: r.ligne, vue: r.vue };
      console.log('   · ' + JSON.stringify(rep));
      v(`D · ${qui} · l’écran Historique ne montre ni undefined ni NaN`, !r.erreurTexte, rep);
      if (qui === 'marc') v('D · le gérant voit la ligne de Tom dans l’Historique', r.ligne, rep);
    }
  }

  // ── E. valeurs LONGUES : la note du bilan et la tuile « hors X € » tiennent sur téléphone, de jour comme de nuit
  if (veut('E')) {
    await propre(false, null);
    await p.evaluate(() => { PAIE_DEMO.i6.montant = '12345,67'; try { fiche('i6').paiement.montant = '12345,67'; } catch (e) {} });
    await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 500);
    const surPlace = await p.evaluate(() => cpPaieTerrain().reduce((s, e) => s + e.ttc, 0));
    v('E · population : une valeur longue est comptée sur place', surPlace > 10000, surPlace);
    const tuile = await p.evaluate(() => { const k = document.querySelector('[data-stdet="enc"]'); if (!k) return null; const r = k.getBoundingClientRect(); return { txt: k.innerText.replace(/\s+/g, ' '), droite: Math.round(r.right), larg: innerWidth, coupe: [...k.querySelectorAll('small,b')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.slice(0, 40)) }; });
    v('E · la tuile « Encaissé TTC » dit « hors … reçus sur place » en entier, sans rien couper', !!tuile && /hors 12 346 € reçus sur place/.test(tuile.txt.replace(/[\u00a0\u202f]/g, ' ')) && tuile.coupe.length === 0 && tuile.droite <= tuile.larg, tuile);
    await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(700);
    const b = await p.evaluate(() => { const q = document.querySelector('#calque'); const sm = [...q.querySelectorAll('small')].find(x => /Non compris/.test(x.textContent)); const r = sm && sm.getBoundingClientRect(), pr = q.getBoundingClientRect();
      const tuiles = [...q.querySelectorAll('.bil-tuiles > *')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.replace(/\s+/g, ' ').slice(0, 40));
      return { note: sm && sm.textContent.replace(/[\u00a0\u202f]/g, ' '), noteDroite: r && Math.round(r.right), panneauDroite: Math.round(pr.right), larg: innerWidth, tuilesCoupees: tuiles, txt: q.innerText.replace(/\s+/g, ' ').replace(/[\u00a0\u202f]/g, ' ') }; });
    v('E · la note « Non compris : 12 345,67 € reçus sur place… » est là, entière, dans la fenêtre', !!b.note && /12 345,67 €/.test(b.note) && b.noteDroite <= b.panneauDroite + 1 && b.noteDroite <= b.larg, { note: b.note, noteDroite: b.noteDroite, panneauDroite: b.panneauDroite });
    v('E · aucune tuile du bilan ne coupe son texte', b.tuilesCoupees.length === 0, b.tuilesCoupees);
    const d = await L.deborde(c); v('E · la page ne glisse pas de côté avec le bilan ouvert', !d.bouge, d);
    await cap('bilan-long'); await L.ranger(p);
  }

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
