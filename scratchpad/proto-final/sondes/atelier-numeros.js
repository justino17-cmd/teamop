// SONDE « numéros » : l'atelier suit la série d'OP GESTION (préfixe, dernier numéro), OP GESTION compte ce que l'atelier a composé — dans les DEUX sens (composé → rapide → composé,
// rapide → composé → rapide), pour les devis ET les contrats : jamais deux documents du même numéro, plus aucun « DEV-2026-… ». Rend « N ✓ · M ✗ ».
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const NUM = process.env.PROFIL || 'mac';
(async () => {
  const c = await L.ouvrir({ profil: NUM, qui: 'marc' }), p = c.p;
  const etat = () => p.evaluate(() => ({ dv: Math.max(...[...DV.map(x => x.num), ...Object.keys(DEVIS_REG)].filter(n => /^D-2026-\d+$/.test(n || '')).map(n => +n.slice(7))), ctr: Math.max(...CONTRATS.map(k => +k.num.slice(9))),
    tousDv: [...new Set([...DV.map(x => x.num).filter(Boolean)])].concat(ATD.docs.filter(x => x.type === 'devis').map(x => x.numero)), tousCtr: CONTRATS.map(k => k.num).concat(ATD.docs.filter(x => x.type === 'contrat').map(x => x.numero)) }));
  const retour = async f => { await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900); };
  const numDe = f => f.evaluate(() => D().meta.numero);
  let e0 = await etat(); v('population : des numéros côté prototype (devis et contrats)', e0.dv > 30 && e0.ctr >= 7, e0);
  const dv = n => 'D-2026-' + String(n).padStart(3, '0'), ctr = n => 'CTR-2026-' + String(n).padStart(3, '0');
  // ── devis : composé → rapide → composé ──
  let f = await A.ouvrirAtelier(c, 'devis', 'devis'); await A.composerDevis(c, f, { client: 'vp', objet: 'Premier composé', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a1 = await numDe(f); await retour(f);
  v('devis composé n° 1 : le suivant de la série du prototype (' + dv(e0.dv + 1) + ')', a1 === dv(e0.dv + 1), a1);
  const q1 = await A.envoyerRapide(c);
  v('devis RAPIDE envoyé ensuite : prend le numéro SUIVANT le composé (' + dv(e0.dv + 2) + '), pas un doublon', q1 === dv(e0.dv + 2), q1);
  f = await A.ouvrirAtelier(c, 'devis', 'devis'); await A.composerDevis(c, f, { client: 'hp', objet: 'Second composé', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a2 = await numDe(f); await retour(f);
  v('devis composé n° 2 : suit le rapide (' + dv(e0.dv + 3) + ')', a2 === dv(e0.dv + 3), a2);
  let e1 = await etat(); const dup = e1.tousDv.filter((x, i, t) => t.indexOf(x) !== i);
  v('aucun numéro de devis en double dans tout le prototype (population ' + e1.tousDv.length + ')', dup.length === 0 && e1.tousDv.length > 8, dup);
  v('plus aucun « DEV-2026-… » : ni dans les documents composés, ni dans leur copie rangée', !e1.tousDv.some(n => /^DEV-/.test(n)) && !(await p.evaluate(() => (localStorage.getItem('documents-sur-mesure-opg-v1') || '').includes('DEV-2026-') || (localStorage.getItem('opg_proto_atelier') || '').includes('DEV-2026-'))));
  // ── contrats : rapide → composé → rapide ──
  await L.aller(p, 'contrat-nouveau'); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
  const r1 = await p.evaluate(() => CONTRATS[CONTRATS.length - 1].num); v('contrat RAPIDE en premier : ' + ctr(e0.ctr + 1), r1 === ctr(e0.ctr + 1), r1);
  f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); await A.composerContrat(c, f, { client: 'hp', titre: 'Composé après le rapide' });
  const c1 = await numDe(f); await retour(f); v('contrat composé : ' + ctr(e0.ctr + 2) + ' (il suit le rapide)', c1 === ctr(e0.ctr + 2), c1);
  await L.aller(p, 'contrat-nouveau'); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
  const r2 = await p.evaluate(() => CONTRATS[CONTRATS.length - 1].num); v('contrat RAPIDE ensuite : ' + ctr(e0.ctr + 3) + ' (il suit le composé)', r2 === ctr(e0.ctr + 3), r2);
  f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); await A.composerContrat(c, f, { client: 'md', titre: 'Dernier composé' }); const c2 = await numDe(f); await retour(f);
  v('contrat composé suivant : ' + ctr(e0.ctr + 4), c2 === ctr(e0.ctr + 4), c2);
  const e2 = await etat(); const dup2 = e2.tousCtr.filter((x, i, t) => t.indexOf(x) !== i);
  v('aucun numéro de contrat en double (population ' + e2.tousCtr.length + ')', dup2.length === 0 && e2.tousCtr.length >= 7, dup2);
  // ── rechargement : la série tient (le prototype oublie ses créations, l'atelier se souvient des siennes) ──
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200); await L.aller(p, 'devis');
  const base = await p.evaluate(() => Math.max(...[...DV.map(x => x.num), ...Object.keys(DEVIS_REG)].filter(n => /^D-2026-\d+$/.test(n || '')).map(n => +n.slice(7)))), atel = await p.evaluate(() => Math.max(...ATD.docs.filter(x => x.type === 'devis').map(x => +x.numero.slice(7))));
  f = await A.ouvrirAtelier(c, 'devis', null); await A.composerDevis(c, f, { client: 'vp', objet: 'Après rechargement', articles: [{ ref: 'EL-ALL', qte: 1 }] }); const a3 = await numDe(f);
  v('après rechargement : le prototype a oublié l\'envoi rapide (dernier ' + base + '), l\'atelier se souvient de ses composés (dernier ' + atel + ') : le nouveau est ' + dv(Math.max(base, atel) + 1) + ', sans doublon', a3 === dv(Math.max(base, atel) + 1) && atel > base, [a3, base, atel]);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
