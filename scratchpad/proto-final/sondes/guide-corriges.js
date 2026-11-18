// Guide des nouveautés, les constats de la relecture « tout » (refonte/guide-relecture-tout.json) rejoués :
//  tout-02 la ligne « Mes demandes » et la carte Achats et frais suivent la case « Créer » des achats (Julie sans la case : Boxes → Dépôts et camions, « Tu suis ici… » ; avec : « Mes demandes », phrase d'origine)
//  tout-03 Tâches et Historique ne portent plus l'ancien nom « Factures et paiements »
//  tout-04 le cadre de la Comptabilité n'a plus de rubrique « Tableau de bord » (« Vue d'ensemble »)
//  tout-06/07 les phrases réécrites (Ma journée, Mon camion, Comptabilité, Tâches)
// Usage : node guide-corriges.js
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const ancien = /Factures et paiements/;
(async () => {
  // — Julie, sans puis avec la case « Créer » des achats
  { const c = await G.ouvrir('mac', 'julie'), p = c.p;
    let pg = await G.pages(c);
    v('julie : population : 6 cartes au plus et la carte « Achats et frais » est là', pg.length <= 6 && pg.some(x => x.k === 'achats'), pg.map(x => x.k));
    const sans = await p.evaluate(() => peut('achats', 'c')); v('julie : sans la case « Créer » des achats (état de départ)', sans === false, sans);
    v('julie sans la case : la première carte ne dit plus « Mes demandes → … »', !pg[0].lignes.some(l => /^Mes demandes/.test(l)), pg[0].lignes);
    v('julie sans la case : la première carte garde TROIS lignes, dont « Boxes → Dépôts et camions »', pg[0].lignes.length === 3 && pg[0].lignes.includes('Boxes → Dépôts et camions'), pg[0].lignes);
    v('julie sans la case : la carte Achats dit « Tu suis ici les demandes… »', /^Tu suis ici les demandes de matériel et les notes de frais de l’équipe\.$/.test(pg.find(x => x.k === 'achats').texte), pg.find(x => x.k === 'achats').texte);
    await p.evaluate(() => { nvFermer(); const d = eqDe('julie').droits.cats; d.achats = { ...(d.achats || {}), v:1, c:1 }; }); await L.calme(p, 700);
    await p.evaluate(() => { nvOuvrir(); }); await L.calme(p, 700);
    pg = await G.pages(c);
    v('julie avec la case : la première carte redit « Mes demandes → Achats et frais »', pg[0].lignes.includes('Mes demandes → Achats et frais'), pg[0].lignes);
    v('julie avec la case : la carte Achats redit la phrase d\'origine', /réunies ici\.$/.test(pg.find(x => x.k === 'achats').texte), pg.find(x => x.k === 'achats').texte);
    v('julie : aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  // — Marc : phrases et anciens noms
  { const c = await G.ouvrir('mac', 'marc'), p = c.p, pg = await G.pages(c);
    const f = k => (pg.find(x => x.k === k) || {}).texte || '';
    v('marc : carte Comptabilité : « se retrouvent ici » (plus « se suivent »)', /se retrouvent ici/.test(f('compta')) && !/se suivent/.test(f('compta')), f('compta'));
    v('marc : carte Tâches : « te propose la tâche et la termine seule »', /te propose la tâche et la termine seule\.$/.test(f('taches')), f('taches'));
    const nm = await p.evaluate(() => [Object.values(H_TYPES).map(x => x[0]), T_CATS.map(x => x[1]), TKX_FAM.map(x => x[1])].flat());
    v(`marc : population : ${nm.length} intitulés de groupes lus`, nm.length > 15, nm.length);
    v('marc : aucun groupe de Tâches / Historique ne s\'appelle « Factures et paiements »', !nm.some(x => ancien.test(x)), nm.filter(x => ancien.test(x)));
    await p.evaluate(() => { nvFermer(); }); await L.calme(p, 500);
    for (const r of ['taches', 'historique']) { await L.aller(p, r); await L.calme(p, 900);
      const t = await p.evaluate(() => document.getElementById('contenu').innerText);
      v(`marc : écran « ${r} » : population (${t.length} signes lus) et pas d'ancien nom`, t.length > 300 && !ancien.test(t), t.match(ancien)); }
    // la Comptabilité en grand : plus de « Tableau de bord » nulle part dans son texte ni ses noms accessibles
    await p.evaluate(() => { aller('accueil'); cpProg = null; cpSysteme = false; aller('comptabilite'); }); await L.calme(p, 2500);   /* « Ouvrir dans la Comptabilité » : la fenêtre plein écran, qui porte le cadre prototype-comptabilite.html */
    let cad = null, r = null;   /* on attend le CONTENU du cadre (un zéro sur un cadre pas encore chargé ne prouve rien) */
    for (let k = 0; k < 40 && !(r && r.t.length > 300); k++) { cad = L.cadre(p, /prototype-comptabilite\.html/); if (cad) { try { r = await cad.evaluate(() => ({ t:document.body.innerText, a:[...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' | ') })); } catch (e) {} } if (!(r && r.t.length > 300)) await p.waitForTimeout(500); }
    v('marc : le cadre de la Comptabilité est là', !!cad);
    if (cad && r) {
      v(`marc : Comptabilité : population (${r.t.length} signes) et « Vue d'ensemble » est la première rubrique`, r.t.length > 300 && /Vue d’ensemble/.test(r.t), r.t.slice(0, 160));
      v('marc : Comptabilité : plus de « Tableau de bord » (texte ni nom accessible)', !/tableau de bord/i.test(r.t + ' ' + r.a), (r.t + r.a).match(/.{20}tableau de bord.{20}/i)); }
    v('marc : aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  // — Sophie : les deux phrases réécrites, et ce qu'elles promettent
  { const c = await G.ouvrir('iphone', 'sm'), p = c.p, pg = await G.pages(c);
    const f = k => (pg.find(x => x.k === k) || {}).texte || '';
    v('sophie : carte Ma journée : parle du bouton « Je commence ma journée »', /Je commence ma journée/.test(f('journee')), f('journee'));
    v('sophie : carte Mon camion : « dis au bureau ce que tu as utilisé »', /dis au bureau ce que tu as utilisé/.test(f('camion')) && !/en un geste/.test(f('camion')), f('camion'));
    await p.evaluate(() => { nvFermer(); }); await L.calme(p, 500);
    await L.aller(p, 'majournee'); await L.calme(p, 900);
    const b1 = await p.evaluate(() => [...document.querySelectorAll('#contenu button')].map(b => b.textContent.trim()));
    v('sophie : Ma journée porte le bouton « Je commence ma journée »', b1.includes('Je commence ma journée'), b1.slice(0, 8));
    await L.aller(p, 'moncamion'); await L.calme(p, 900);
    const b2 = await p.evaluate(() => [...document.querySelectorAll('#contenu button')].map(b => b.textContent.replace(/[’]/g, '\'').trim()));
    v('sophie : Mon camion porte « J\'ai utilisé chez un client »', b2.includes('J\'ai utilisé chez un client'), b2.slice(0, 8));
    const tc = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
    v('sophie : Mon camion montre ses envois « En attente du bureau » (ce que la carte appelle « dis au bureau »)', /En attente du bureau/.test(tc), tc.slice(0, 200));
    await L.fin(c); }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
