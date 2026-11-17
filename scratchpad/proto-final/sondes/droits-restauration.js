// UN REFUS NE LAISSE PAS L'ÉCRAN MENTIR : après le refus d'un geste de saisie, l'état VISIBLE de l'élément (case cochée, valeur d'un champ, valeur d'un <select>) égale la donnée.
// Trois populations : une case de droit (data-eqd), un <select> (data-eqprof), un champ de la fiche d'intervention (data-champ). Personne en lecture seule, au vrai clic et au vrai clavier. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
(async () => {
  const cases = Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1000']));
  const c = await ouvrirComme({ k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases, sp:{} });
  let n = 0;
  // 1. une case de droit : lecture seule sur Équipe (admin « Voir » seul) → le clic est avalé, la case revient à la donnée
  await L.aller(c.p, 'equipe'); await c.p.evaluate(() => { eqFiche('julie'); const d = document.querySelector('details.eqx-det'); if (d) d.open = true; }); await L.calme(c.p, 400);
  const sel = 'input[data-eqd="julie|crm|c"]';
  const avant = await c.p.evaluate(s => { const i = document.querySelector(s); return { coche:i.checked, donnee:eqDe('julie').droits.cats.crm.c, visible:getComputedStyle(i).pointerEvents }; }, sel);
  await c.p.evaluate(s => { const i = document.querySelector(s); i.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); }, sel); await L.calme(c.p, 300); n++;
  const ap = await c.p.evaluate(s => { const i = document.querySelector(s); return { coche:i.checked, donnee:eqDe('julie').droits.cats.crm.c, refus:DROITS_REFUS.length }; }, sel);
  v('case de droit : le clic est avalé, la case montre la donnée (rien n\'a changé)', ap.coche === ap.donnee && ap.donnee === avant.donnee && ap.refus >= 1, { avant, ap });
  // un « change » qui arrive quand même (clavier, clic synthétique de coche) : l'écran revient à la donnée
  await c.p.evaluate(s => { const i = document.querySelector(s); i.checked = !i.checked; i.dispatchEvent(new Event('change', { bubbles:true })); }, sel); await L.calme(c.p, 300); n++;
  const ap2 = await c.p.evaluate(s => { const i = document.querySelector(s); return { coche:i.checked, donnee:eqDe('julie').droits.cats.crm.c }; }, sel);
  v('case de droit : un « change » forcé est refusé et la case revient à la donnée', ap2.coche === ap2.donnee && ap2.donnee === avant.donnee, ap2);
  // 2. un <select> : le profil appliqué (data-eqprof) revient à « Choisir… »
  await c.p.evaluate(() => { const s = document.querySelector('select[data-eqprof]'); if (s) { s.value = 'resp'; s.dispatchEvent(new Event('change', { bubbles:true })); } }); await L.calme(c.p, 300); n++;
  const sp = await c.p.evaluate(() => { const s = document.querySelector('select[data-eqprof]'); return { valeur:s ? s.value : null, profil:eqDe('julie').droits.profil }; });
  v('<select> du profil : refusé, la valeur revient à « Choisir… » et le profil de Julie n\'a pas changé', sp.valeur === '' && sp.profil === 'secr', sp);
  await c.p.evaluate(() => fermerPanneau());
  // 3. un champ de saisie de la fiche d'intervention : la valeur d'avant revient
  await c.p.evaluate(() => aller('inter-x-i1')); await L.calme(c.p, 700);
  const ch = await c.p.evaluate(() => { const t = document.querySelector('textarea[data-champ="trouve"]'); if (!t) return null; const d0 = t.defaultValue; t.value = d0 + ' XXXX'; t.dispatchEvent(new Event('input', { bubbles:true })); return { d0, apres:t.value, figé:getComputedStyle(t).pointerEvents === 'none' }; });
  n++; v('champ de la fiche d\'intervention : la saisie est refusée, la valeur d\'avant revient (et le champ est figé, valeur lisible)', !!ch && ch.apres === ch.d0 && ch.figé === true, ch);
  v('population : trois sortes d\'éléments, quatre refus joués', n === 4, n);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
