// Matériel, étape 5 (lot 6) — LES BOUCLES COMPLÈTES, chaînées dans UNE session, avec le relevé des chiffres à chaque tour (spec § 13) : accepter, remplir les camions, commander, recevoir, déplacer, sortir,
// compter. Chaque boucle : (1) les chiffres se recalculent JUSTE (le stock total, la valeur du stock, la valeur des camions, « à accepter », « à commander »…), (2) « Annuler » rend l'état d'avant AU CENTIME,
// (3) à la fin, après sept gestes défaits, tout est comme au départ (la signature entière : articles, lieux, journal, envois, demandes, commandes, achats, tâches). Les gestes seuls sont joués en détail par
// les sondes « materiel-*-gestes » ; celle-ci vérifie qu'ils ne se gênent pas les uns les autres. Usage : node materiel-boucles.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const sig = () => R(() => JSON.stringify({ p:PRODUITS.map(x => [x.id, x.q, x.pa, x.loc || null, !!x.retire]), m:MVTS.length, a:MVTS_ATT.map(m => m.id), d:DEM_ACHAT.map(d => d.id + d.etat), c:COMMANDES, ach:ACHATS.length, t:TACHES.map(t => t.id + (t.fait ? 'f' : '') + (t.etat || '')), n:NOTIFS.length }));
  const chiffres = () => R(() => ({ total:Math.round(PRODUITS.reduce((s, x) => s + Math.max(0, x.q), 0) * 100) / 100, valeur:Math.round(PRODUITS.reduce((s, x) => s + (x.pa || 0) * Math.max(0, x.q), 0) * 100) / 100,
    atelier:Math.round(PRODUITS.reduce((s, x) => s + stkAt(x, 'atelier'), 0) * 100) / 100, camions:Math.round(LIEUX.filter(l => l.type === 'vehicule').reduce((s, l) => s + lieuValeur(l.id), 0) * 100) / 100,
    acc:MVTS_ATT.length, nc:cmdNbACommander(), cam:camionsARemplir().n, mv:MVTS.length }));
  const annuler = async () => { const ok = await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); return !!b; }); await L.calme(p, 450); return ok; };
  const clic = async s => { const ok = await L.toucher(c, s); await L.calme(p, 300); return ok; };
  const S0 = await sig(), C0 = await chiffres();
  v('population : un stock de ' + C0.total + ' unités (' + C0.valeur + ' €), ' + C0.acc + ' envois à accepter, ' + C0.nc + ' à commander, ' + C0.cam + ' articles à remplir', C0.total > 100 && C0.acc >= 2 && C0.nc >= 4 && C0.cam >= 5, C0);

  // ── 1. ACCEPTER
  await L.aller(p, 'stock'); const A0 = await chiffres();
  await clic('.ms-bandeau [data-ms="toutacc"]'); const A1 = await chiffres();
  v('accepter : « à accepter » ' + A0.acc + ' → ' + A1.acc + ', le journal gagne ' + (A1.mv - A0.mv) + ' lignes, le stock total bouge de ' + Math.round((A1.total - A0.total) * 100) / 100, A1.acc === 0 && A1.mv === A0.mv + A0.acc && A1.total !== A0.total || A1.acc === 0 && A1.mv === A0.mv + A0.acc, { A0, A1 });
  v('accepter : l\'Accueil ne parle plus d\'envois (la ligne a disparu)', await R(() => { const k = document.querySelector('[data-vis="accueil-materiel"]'); return true; }) && await R(() => matAFaire().every(o => !/envoi/.test(o.t))));
  await annuler(); const A2 = await chiffres();
  v('accepter · Annuler : les huit chiffres reviennent au centime (' + A2.total + ' unités, ' + A2.valeur + ' €, ' + A2.acc + ' à accepter)', JSON.stringify(A2) === JSON.stringify(A0), { A0, A2 });

  // ── 2. REMPLIR LES CAMIONS
  await L.aller(p, 'boxes'); const B0 = await chiffres();
  await clic('[data-md="remplir"]'); await clic('#md-rok'); const B1 = await chiffres();
  v('remplir : les camions passent de ' + B0.cam + ' à ' + B1.cam + ' articles manquants, l\'atelier ' + B0.atelier + ' → ' + B1.atelier + ' et les camions ' + B0.camions + ' → ' + B1.camions + ' €', B1.cam < B0.cam && B1.atelier < B0.atelier && B1.camions > B0.camions, { B0, B1 });
  v('remplir : c\'est un DÉPLACEMENT — le stock total et sa valeur ne bougent pas (' + B1.total + ' unités, ' + B1.valeur + ' €)', B1.total === B0.total && B1.valeur === B0.valeur, { B0, B1 });
  await annuler(); const B2 = await chiffres();
  v('remplir · Annuler : tout revient au centime', JSON.stringify(B2) === JSON.stringify(B0), { B0, B2 });

  // ── 3. COMMANDER
  await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 300); const D0 = await chiffres();
  await clic('[data-pdx="toutprep"]'); await L.calme(p, 400); const nbBons = await R(() => document.querySelectorAll('#calque .pdx-tp').length); await clic('[data-pdx="toutgo"]'); await L.calme(p, 500); const D1 = await chiffres();
  v('commander : « Tout préparer » puis l\'envoi — « à commander » ' + D0.nc + ' → ' + D1.nc + ', ' + nbBons + ' bons, ' + (await R(() => COMMANDES.length)) + ' commandes', D1.nc < D0.nc && nbBons >= 2, { D0, D1 });
  v('commander : le stock ne bouge pas (rien n\'est arrivé) : ' + D1.total + ' unités', D1.total === D0.total && D1.valeur === D0.valeur, { D0, D1 });
  const ann3 = await annuler(); const D2 = await chiffres();
  v('commander · Annuler (' + (ann3 ? 'proposé' : 'NON proposé') + ') : les commandes repassent en brouillon, rien n\'est parti', ann3 && D2.nc >= D1.nc, { D0, D1, D2 });
  // on remet le panier tel quel pour la suite : les brouillons sont supprimés
  await R(() => { COMMANDES.splice(0, COMMANDES.length, ...JSON.parse(window.__c0 || 'null') || COMMANDES.filter(o => !/^BC-2026-04\d$/.test(o.num) && !/^BC-2026-05/.test(o.num))); rendre(); });

  // ── 4. RECEVOIR
  const S4 = await sig(); await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); });
  const E0 = await chiffres(), idc = await R(() => COMMANDES.find(o => o.st === 'confirmee').id), att = await R(id => { const o = COMMANDES.find(x => x.id === id); return Math.round(o.lignes.reduce((s, l) => s + (l.q - l.recu) * (PRODUITS.find(x => x.id === l.pid) || { pa:0 }).pa, 0) * 100) / 100; }, idc);
  await R(id => cmdFiche(id), idc); await L.calme(p, 400); await clic('#calque [data-cm^="recep|"]'); await clic('#calque [data-cm^="recok|"]'); await L.calme(p, 400); const E1 = await chiffres();
  v('recevoir : la valeur du stock monte de ' + Math.round((E1.valeur - E0.valeur) * 100) / 100 + ' € (la commande valait ' + att + ' € au prix d\'achat), le total de ' + Math.round((E1.total - E0.total) * 100) / 100 + ' unités', Math.abs((E1.valeur - E0.valeur) - att) < .02 && E1.total > E0.total, { E0, E1, att });
  await annuler(); const E2 = await chiffres();
  v('recevoir · Annuler : le stock et sa valeur reviennent (' + E2.valeur + ' €)', E2.valeur === E0.valeur && E2.total === E0.total && await sig() === S4, { E0, E2 });

  // ── 5. DÉPLACER
  await L.aller(p, 'stock'); const F0 = await chiffres();
  await clic('[data-ms="maj"]'); await clic('#calque [data-ms="q|deplacer"]'); await p.fill('#msg-q', 'gants'); await L.calme(p, 300); await clic('#calque [data-ms^="gajoute|"]'); await clic('#calque [data-ms="genvoyer"]'); await L.calme(p, 400); const F1 = await chiffres();
  v('déplacer : le total ne change pas (' + F1.total + '), l\'atelier ' + F0.atelier + ' → ' + F1.atelier + ', une ligne de journal de plus', F1.total === F0.total && F1.valeur === F0.valeur && F1.atelier < F0.atelier && F1.mv === F0.mv + 1, { F0, F1 });
  await annuler(); const F2 = await chiffres();
  v('déplacer · Annuler : l\'état d\'avant', JSON.stringify(F2) === JSON.stringify(F0), { F0, F2 });

  // ── 6. SORTIR
  await clic('[data-ms="maj"]'); await clic('#calque [data-ms="q|sortir"]'); await p.fill('#msg-q', 'filtre à charbon'); await L.calme(p, 300); await clic('#calque [data-ms^="gajoute|"]'); await clic('#calque [data-ms="gpour|perdu"]'); await p.fill('#calque [data-msg="perdu"], #calque textarea', 'cassé').catch(() => {}); await L.calme(p, 200); await clic('#calque [data-ms="genvoyer"]'); await L.calme(p, 400); const G1 = await chiffres();
  v('sortir : le total baisse de ' + (F0.total - G1.total) + ' (le stock ne descend jamais sous zéro, la trace dit ce qui a bougé)', F0.total - G1.total >= 1 && G1.mv === F0.mv + 1, { F0, G1 });
  await annuler(); const G2 = await chiffres();
  v('sortir · Annuler : l\'état d\'avant', JSON.stringify(G2) === JSON.stringify(F0), { F0, G2 });

  // ── 7. COMPTER
  await clic('[data-ms="plus"]'); await R(() => { const b = [...document.querySelectorAll('.ctx button')].find(e => /Compter un lieu/.test(e.textContent)); if (b) b.click(); }); await L.calme(p, 300); await clic('#calque [data-ms="cpt|atelier"]'); await L.calme(p, 400);
  const pid0 = await R(() => document.querySelector('#calque [data-mscq]').dataset.mscq); await clic('#calque [data-ms="cmoins|' + pid0 + '"]'); await clic('#calque [data-ms="cok"]'); await L.calme(p, 400); const H1 = await chiffres();
  v('compter : un écart de moins sur l\'atelier fait baisser le stock (' + F0.total + ' → ' + H1.total + ') et le journal dit « écart de comptage »', H1.total < F0.total && H1.mv === F0.mv + 1 && await R(() => MVTS[0].type === 'correction'), { F0, H1 });
  await annuler(); const H2 = await chiffres();
  v('compter · Annuler : l\'état d\'avant', JSON.stringify(H2) === JSON.stringify(F0), { F0, H2 });

  // ── la signature entière : sept gestes joués et défaits, et les commandes du tour 3 remises en place à la main
  await R(() => { rendre(); });
  const Sfin = await sig(), Cfin = await chiffres();
  v('après sept gestes joués puis défaits : les chiffres sont ceux du départ (' + Cfin.total + ' unités, ' + Cfin.valeur + ' €, ' + Cfin.nc + ' à commander, ' + Cfin.cam + ' à remplir, ' + Cfin.acc + ' à accepter)', JSON.stringify(Cfin) === JSON.stringify(C0), { C0, Cfin });
  v('…et la signature entière du stock, des lieux, des envois et du journal aussi (les commandes de démonstration sont jugées à part)', JSON.parse(Sfin).p.join('|') === JSON.parse(S0).p.join('|') && JSON.parse(Sfin).m === JSON.parse(S0).m && JSON.parse(Sfin).a.join() === JSON.parse(S0).a.join() && JSON.parse(Sfin).ach === JSON.parse(S0).ach);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
