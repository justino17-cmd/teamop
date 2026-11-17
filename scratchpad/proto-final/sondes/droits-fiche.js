// LA FICHE d'une personne (écran Équipe) après l'étape 5 : « Travaille sur le terrain », les phrases « Ce que {prénom} voit / ne voit pas » (égales à son menu), la grille repliée et générée par la table
// (une case sans geste n'est pas dessinée), les libellés (« L’entreprise et l’équipe », « Planning et absences »), le droit « Voir toute l'équipe » retiré, les phrases retirées, aucune case qui se règle soi-même,
// et le changement de « Travaille sur le terrain » qui change la coque, le menu et la barre à l'instant. Jour ET nuit, ordinateur et téléphones (aucun débordement contre la largeur du profil). ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, etatPersonne, toast, CAP, fin } = require('./droits-commun.js');
const FICHE = () => { const z = document.querySelector('#calque .panneau'); return z ? { texte:z.innerText.replace(/\s+/g, ' '), plein:z.textContent.replace(/\s+/g, ' '), html:z.innerHTML, lignesVoit:(z.querySelector('#eqx-voit') || {}).innerText || '', rangs:[...z.querySelectorAll('.eq-dr:not(.eq-dr-t)')].map(r => r.querySelector('span').textContent.trim()), cases:z.querySelectorAll('input[data-eqd]').length, terrain:(z.querySelector('input[data-eqt]') || {}).checked, terrainDesactive:(z.querySelector('input[data-eqt]') || {}).disabled, sp:[...z.querySelectorAll('input[data-eqs]')].map(i => i.dataset.eqs.split('|')[1]), replie:z.querySelector('details.eqx-det') ? !z.querySelector('details.eqx-det').open : null, desactives:[...z.querySelectorAll('input[data-eqd]')].filter(i => i.disabled).length } : null; };
(async () => {
  const c = await ouvrirComme('marc');
  await L.aller(c.p, 'equipe');
  // Julie : le bureau
  await c.p.evaluate(() => eqFiche('julie')); await L.calme(c.p, 400);
  let f = await c.p.evaluate(FICHE), e = await c.p.evaluate(() => rlLignesDe(eqDe('julie')).map(x => x.l));
  v('Julie : la case « Travaille sur le terrain » existe et est décochée', f && f.terrain === false && f.terrainDesactive === false, f && [f.terrain, f.terrainDesactive]);
  v('Julie : « Ce que Julie voit » = les lignes de SON menu (même fonction)', f && f.lignesVoit.replace(/\s+/g, ' ').includes('Ce que Julie voit : ' + e.join(', ') + '.'), { voit:f && f.lignesVoit, e });
  v('Julie : « Ce que Julie ne voit pas » nomme ce qui lui est fermé (Planning, Équipe, Boîte mail)', f && /Ce que Julie ne voit pas : .*Planning.*Boîte mail.*Équipe/.test(f.lignesVoit.replace(/\s+/g, ' ')) , f && f.lignesVoit);
  v('Julie : grille repliée par défaut, dix catégories, libellés « Planning et absences » et « L’entreprise et l’équipe »', f && f.replie === true && f.rangs.length === 10 && f.rangs.includes('Planning et absences') && f.rangs.includes('L’entreprise et l’équipe'), f && f.rangs);
  v('Julie : une case sans geste n\'est pas dessinée (la case « Supprimer » de Clients)', await c.p.evaluate(() => !document.querySelector('input[data-eqd="julie|crm|s"]') && !!document.querySelector('input[data-eqd="julie|crm|m"]')), null);
  v('Julie : « Créer des comptes », « Corriger les pointages » (droits qui AGISSENT) sont là ; « Voir les interventions de toute l’équipe » et « Voir les prix » n\'y sont plus', f && ['comptes', 'corrpt', 'atelier', 'valstock', 'commander'].every(k => f.sp.includes(k)) && !f.sp.includes('tout') && !f.sp.includes('prix') && !/toute l’équipe/.test(f.texte.replace('Voir toute l’équipe','')), f && f.sp);
  v('les phrases d\'avant (« ces cases ne changent pas encore », « pas encore appliqués ») ont disparu', f && !/ne changent pas encore|pas encore appliqu/.test(f.plein), null);
  v('la phrase de la grille dit ce que fait « Voir » et ce que font les trois autres', f && /Décocher « Voir » cache la rubrique et ferme son adresse\. Décocher « Créer », « Modifier » ou « Supprimer » retire le bouton correspondant : la personne regarde, elle ne change rien\./.test(f.plein), null);
  // Sophie : le terrain, six catégories, trois droits à part au plus
  await c.p.evaluate(() => { fermerPanneau(); eqFiche('sm'); }); await L.calme(c.p, 400);
  f = await c.p.evaluate(FICHE);
  v('Sophie : case cochée ; six catégories seulement (celles qui ont un écran personnel)', f && f.terrain === true && f.rangs.length === 6 && ['Planning et absences', 'Interventions', 'Clients'].every(x => f.rangs.includes(x)), f && f.rangs);
  v('Sophie : un terrain n\'a pas « Créer des comptes », « Valider », « Commander » (sans effet pour lui)', f && !f.sp.includes('comptes') && !f.sp.includes('valstock') && !f.sp.includes('commander') && f.sp.includes('atelier') && f.sp.includes('corrpt'), f && f.sp);
  // décocher « Travaille sur le terrain » pour Sophie : sa coque, son menu, sa barre, son ouverture changent à l'instant
  const avant = await c.p.evaluate(() => ({ role:sessionRole(eqDe('sm')), lignes:rlLignesDe(eqDe('sm')).map(x => x.k) }));
  await c.p.evaluate(() => { const i = document.querySelector('input[data-eqt="sm"]'); i.click(); }); await L.calme(c.p, 500);
  const apres = await c.p.evaluate(() => ({ role:sessionRole(eqDe('sm')), lignes:rlLignesDe(eqDe('sm')).map(x => x.k), ouv:ouvertureDe(eqDe('sm')), planningOk:rlLignesDe(eqDe('sm')).some(x => x.k === 'planning') }));
  v('décocher « Travaille sur le terrain » pour Sophie : sa coque passe à « gestion », son menu devient celui du bureau', avant.role === 'tech' && apres.role === 'gestion' && !apres.lignes.includes('majournee') && apres.lignes.includes('taches'), { avant, apres });
  const pasErreur = await c.p.evaluate(() => { try { aller('planning'); return true; } catch (e) { return String(e); } }); await L.calme(c.p, 500);
  v('le planning s\'ouvre encore (Sophie reste connue de l\'Équipe et du passé)', pasErreur === true && c.err.length === 0, { pasErreur, err:c.err.slice(0, 2) });
  await c.p.evaluate(() => { eqFiche('sm'); }); await L.calme(c.p, 400);
  await c.p.evaluate(() => { document.querySelector('input[data-eqt="sm"]').click(); }); await L.calme(c.p, 500);
  const retour = await c.p.evaluate(() => ({ role:sessionRole(eqDe('sm')), lignes:rlLignesDe(eqDe('sm')).map(x => x.k) }));
  v('recocher la rend à ses cinq écrans personnels', retour.role === 'tech' && retour.lignes.length === 6, retour);
  // la fiche de Marc : ses cases sont figées, et le dit
  await c.p.evaluate(() => { fermerPanneau(); eqFiche('marc'); }); await L.calme(c.p, 400); f = await c.p.evaluate(FICHE);
  v('Marc : ses cases sont désactivées et la fiche dit « Les droits d’un administrateur ne se retirent pas. »', f && f.cases > 0 && f.desactives === f.cases && /Les droits d’un administrateur ne se retirent pas\./.test(f.plein) && f.terrainDesactive === true, f && [f.cases, f.desactives]);
  await L.fin(c);
  // téléphones et nuit : aucun débordement, captures à regarder
  let n = 0;
  for (const [appareil, nuit] of [['iphone', false], ['android', true], ['petit', false], ['ipad', true], ['mac', true]]) {
    const d = await ouvrirComme({ qui:'marc', appareil, nuit }); await L.aller(d.p, 'equipe'); await d.p.evaluate(() => { eqFiche('julie'); const dt = document.querySelector('details.eqx-det'); if (dt) dt.open = true; }); await L.calme(d.p, 500); n++;
    const dep = await L.deborde(d, null); v(`${appareil} ${nuit ? 'nuit' : 'jour'} : la fiche déborde-t-elle ? (contre la largeur du profil)`, dep.bouge === 0 && dep.seconde <= dep.largeur + 1, dep);
    await d.p.evaluate(() => { const z = document.querySelector('#calque .panneau'); if (z) z.scrollTop = 99999; }); await L.calme(d.p, 300);
    await L.capture(d, CAP + `fiche-julie-${appareil}-${nuit ? 'nuit' : 'jour'}.png`);
    await L.fin(d);
  }
  v('population : cinq appareils / modes joués', n === 5, n);
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
