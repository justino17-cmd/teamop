// LE GÉRANT NE SE COUPE PAS LA PAROLE ; PERSONNE NE S'ÉLÈVE : on ne règle pas ses propres droits ; on ne touche pas la fiche d'un administrateur ; on ne donne pas un droit qu'on n'a pas ; un clic
// synthétique sur une case sans « Modifier » (L'entreprise et l'équipe) est avalé ; le dernier administrateur ne se désactive pas. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, toast, fin } = require('./droits-commun.js');
(async () => {
  const cases = Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, k === 'admin' ? '1111' : k === 'crm' ? '1111' : '1000']));
  const c = await ouvrirComme({ k:'a2', prenom:'Alix', nom:'Deux', pd:'resp', terrain:false, cases, sp:{ comptes:1 } });   // « L'entreprise et l'équipe » complète, Clients complet, le reste en lecture seule
  let n = 0;
  await L.aller(c.p, 'equipe');
  const ouvrir = async k => { await c.p.evaluate(x => { fermerPanneau(); eqFiche(x); const d = document.querySelector('details.eqx-det'); if (d) d.open = true; }, k); await L.calme(c.p, 400); };
  // sa propre fiche : tout est désactivé, et elle le dit
  await ouvrir('a2'); let s = await c.p.evaluate(() => { const z = document.querySelector('#calque .panneau'); const I = [...z.querySelectorAll('input[data-eqd], input[data-eqs], input[data-eqt]')]; return { n:I.length, off:I.filter(i => i.disabled).length, phrase:/Tu ne peux pas régler tes propres droits : c’est une autre personne qui le fait\./.test(z.textContent), profil:!z.querySelector('select[data-eqprof]') }; }); n++;
  v('sa propre fiche : cases, droits à part et « Travaille sur le terrain » désactivés ; la phrase le dit ; pas de choix de profil', s.n > 20 && s.off === s.n && s.phrase && s.profil, s);
  // la fiche de Marc (administrateur) : figée
  await ouvrir('marc'); s = await c.p.evaluate(() => { const z = document.querySelector('#calque .panneau'); const I = [...z.querySelectorAll('input[data-eqd], input[data-eqs], input[data-eqt]')]; return { n:I.length, off:I.filter(i => i.disabled).length }; }); n++;
  v('la fiche d\'un administrateur : tout est désactivé', s.n > 20 && s.off === s.n, s);
  // la fiche de Sophie : réglable… mais jamais au-delà de ce qu'Alix a elle-même
  await ouvrir('sm');
  const g1 = await c.p.evaluate(() => { const i = document.querySelector('input[data-eqd="sm|stock|c"]'); const avant = eqDe('sm').droits.cats.stock.c; i.checked = true; i.dispatchEvent(new Event('change', { bubbles:true })); return { off:i.disabled, avant, apres:eqDe('sm').droits.cats.stock.c, coche:i.checked }; }); await L.calme(c.p, 300); n++;
  v('donner « Stock › Créer » (qu\'Alix n\'a pas) : refusé, la donnée ne bouge pas, la case revient', g1.off === false && g1.apres === g1.avant && g1.coche === g1.avant, g1);
  v('… et le message dit « Tu ne peux pas donner un droit que tu n’as pas toi-même. »', (await toast(c.p)).includes('Tu ne peux pas donner un droit que tu n’as pas toi-même.'), await toast(c.p));
  await ouvrir('sm');
  const g2 = await c.p.evaluate(() => { const i = document.querySelector('input[data-eqd="sm|crm|c"]'); const avant = eqDe('sm').droits.cats.crm.c; i.click(); return { avant, apres:eqDe('sm').droits.cats.crm.c }; }); await L.calme(c.p, 400); n++;
  v('donner « Clients › Créer » (qu\'Alix a) : passe, la donnée change', g2.avant === 0 && g2.apres === 1, g2);
  // un droit à part qu'elle n'a pas
  await ouvrir('sm');
  const g3 = await c.p.evaluate(() => { const i = document.querySelector('input[data-eqs="sm|corrpt"]'); if (!i) return null; const avant = eqDe('sm').droits.sp.corrpt; i.checked = true; i.dispatchEvent(new Event('change', { bubbles:true })); return { avant, apres:eqDe('sm').droits.sp.corrpt }; }); await L.calme(c.p, 300); n++;
  v('donner « Corriger les pointages » (qu\'Alix n\'a pas) : refusé', !!g3 && g3.apres === g3.avant, g3);
  // le dernier administrateur ne se désactive pas
  await ouvrir('marc'); const dernier = await c.p.evaluate(() => { const b = document.querySelector('[data-eq="actif|marc"]'); return { off:b.disabled, actif:eqDe('marc').actif }; }); n++;
  v('le dernier administrateur : « Désactiver le compte » est désactivé', dernier.off === true && dernier.actif === true, dernier);
  await L.fin(c);
  // une personne SANS « L'entreprise et l'équipe › Modifier » : un clic synthétique sur une case de droit est avalé (garde de fiche)
  const d = await ouvrirComme({ k:'sa', prenom:'Sam', nom:'Sans', pd:'resp', terrain:false, cases:Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1000'])), sp:{} });
  await L.aller(d.p, 'equipe'); await d.p.evaluate(() => { eqFiche('julie'); const x = document.querySelector('details.eqx-det'); if (x) x.open = true; }); await L.calme(d.p, 400);
  const z = await d.p.evaluate(() => { const i = document.querySelector('input[data-eqd="julie|crm|c"]'); const avant = eqDe('julie').droits.cats.crm.c; const n0 = DROITS_REFUS.length; i.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); return { avant, apres:eqDe('julie').droits.cats.crm.c, refus:DROITS_REFUS.length - n0 }; }); n++;
  v('sans « Modifier » : un clic synthétique sur une case de droit est avalé (garde de fiche)', z.avant === z.apres && z.refus >= 1, z);
  v('aucune erreur de page', c.err.length === 0 && d.err.length === 0, [c.err.slice(0, 2), d.err.slice(0, 2)]);
  v('population : sept situations jouées', n === 8, n);
  await L.fin(d); await fin();
})().catch(e => { console.error(e); process.exit(1); });
