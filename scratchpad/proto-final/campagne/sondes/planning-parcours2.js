// Campagne « planning » (suite) : les parcours de la vue « Sur mesure », des chiffres du bandeau, de la Carte des tournées
// et d'un client créé à la main. Même mode d'emploi que planning-parcours.js.
// Usage : timeout 580 node planning-parcours2.js <profil> [nuit] [P9 P10 …]     « N ✓ · M ✗ », code 1 si un contrôle tombe.
// Un contrôle qui tombe sur un défaut rapporté porte son numéro (planning-NN) : voir campagne/planning.json.
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning/';
const veut = args.filter(a => /^P\d+$/.test(a));
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); plJours = 6; multiJours = [AUJ, ajoute(AUJ, 2)]; multiGrp = 'personne'; multiN = 4; multiPop = null; multiExclu = new Set(); crSel = null; crFocus = null; crPlein = false; crV = null; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 450); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const texte = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, s);

parcours('P9 · la vue « Sur mesure » : choisir les jours, les personnes, le regroupement, le nombre de colonnes', async c => {
  await vue(c, 'multi');
  L.v('P9 · « Quels jours ? » ouvre la fenêtre des dates', await L.toucher(c, '[data-mpop="dates"]') && await L.attendre(c.p, () => !!document.querySelector('.pm-pop[aria-label="Choisir les dates"]')), '');
  await L.capture(c, CAP + `P9-dates-${profil}${nuit ? '-nuit' : ''}.png`);
  await L.toucher(c, '[data-mjpreset="sem"]');
  const sem = await c.p.evaluate(() => ({ J: [...multiJours].sort(), jours: [...multiJours].map(d => dObj(d).getDay()) }));
  L.v('P9 · « Lun → Ven » donne cinq jours, du lundi au vendredi', sem.J.length === 5 && sem.jours.every(g => g >= 1 && g <= 5), sem);
  const J0 = sem.J[2];
  await c.p.evaluate(d => document.querySelector('[data-mjbascule="' + d + '"]')?.click(), J0); await L.calme(c.p, 250);
  L.v('P9 · toucher un jour déjà choisi le retire (quatre jours restent)', await c.p.evaluate(d => multiJours.length === 4 && !multiJours.includes(d), J0), '');
  const resume = await texte(c.p, '[data-mpop="dates"]'); L.v('P9 · le bouton dit « 4 dates »', /4 dates/.test(resume), resume);
  // une date lointaine saisie à la main : elle s'ajoute, avec sa croix pour la retirer
  const lointaine = await c.p.evaluate(() => ajoute(AUJ, 40));
  await c.p.evaluate(d => { const i = document.querySelector('[data-mjajout]'); i.value = d; i.dispatchEvent(new Event('change', { bubbles: true })); }, lointaine); await L.calme(c.p, 250);
  const aj = await c.p.evaluate(d => ({ dans: multiJours.includes(d), croix: !!document.querySelector('[data-mjretire="' + d + '"]') }), lointaine);
  L.v('P9 · une autre date saisie s’ajoute et porte sa croix « Retirer »', aj.dans && aj.croix, aj);
  await L.toucher(c, '[data-mjretire="' + lointaine + '"]');
  L.v('P9 · la croix retire la date lointaine', await c.p.evaluate(d => !multiJours.includes(d), lointaine), '');
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
  L.v('P9 · Échap referme la fenêtre des dates (planning-03)', await c.p.evaluate(() => !document.querySelector('.pm-pop')), '');
  L.v('P9 · Échap rend le focus au bouton « Quels jours ? » qui avait ouvert la fenêtre', await c.p.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.mpop === 'dates'), await c.p.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 80)));
  if (await c.p.evaluate(() => !!document.querySelector('.pm-pop'))) await L.toucher(c, '[data-mpop="dates"]');
  // personnes
  await L.toucher(c, '[data-mpop="qui"]'); await L.capture(c, CAP + `P9-qui-${profil}${nuit ? '-nuit' : ''}.png`);
  const avant = await c.p.evaluate(() => techsVus().length);
  await c.p.evaluate(() => document.querySelector('[data-mqt="kb"]').click()); await L.calme(c.p, 250);
  const ap = await c.p.evaluate(() => ({ n: techsVus().length, kb: techsVus().some(t => t.id === 'kb') }));
  L.v('P9 · décocher Karim le retire des colonnes', ap.n === avant - 1 && !ap.kb, ap);
  await c.p.evaluate(() => document.querySelector('[data-mqtous="0"]').click()); await L.calme(c.p, 250);
  L.v('P9 · « Personne » : le planning dit quoi faire (« Aucune personne choisie »)', /Aucune personne choisie/.test(await texte(c.p, '#contenu') || ''), '');
  await c.p.evaluate(() => document.querySelector('[data-mqtous="1"]').click()); await L.calme(c.p, 250);
  L.v('P9 · « Tout le monde » remet les cinq lignes', await c.p.evaluate(() => techsVus().length === TECHS.length), '');
  // décocher une date pour une seule personne : sa colonne disparaît ce jour-là seulement
  const cle = await c.p.evaluate(() => 'sm|' + [...multiJours].sort()[0]);
  const colAvant = await c.p.evaluate(() => document.querySelectorAll('#contenu .pm-col, #contenu [data-mcol]').length);
  await c.p.evaluate(k => document.querySelector('[data-mqd="' + k + '"]').click(), cle); await L.calme(c.p, 250);
  L.v('P9 · décocher une date pour Sophie ne retire que cette colonne', await c.p.evaluate(k => multiExclu.has(k) && techsVus().some(t => t.id === 'sm'), cle), '');
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 250); if (await c.p.evaluate(() => !!document.querySelector('.pm-pop'))) await L.toucher(c, '[data-mpop="qui"]');
  // regroupement et colonnes par ligne
  await L.toucher(c, '[data-mgrp="jour"]');
  L.v('P9 · « Par date » regroupe par jour (le titre d’un groupe est une date)', await c.p.evaluate(() => multiGrp === 'jour' && /\d/.test((document.querySelector('#contenu .pm-groupe-t, #contenu .pm-g-t, #contenu [class*="pm-g"] b') || {}).textContent || '1')), '');
  await L.toucher(c, '[data-mgrp="personne"]');
  const n0 = await c.p.evaluate(() => multiN);
  await L.toucher(c, '[data-mpas="1"]'); const n1 = await c.p.evaluate(() => multiN);
  const PAL = [2, 3, 4, 6, 0], suivant = PAL[Math.min(PAL.length - 1, PAL.indexOf(n0) + 1)];   // les paliers du code (2, 3, 4, 6, toutes) : de 4 on passe à 6, c'est voulu
  L.v('P9 · « ＋ » passe au palier suivant (2, 3, 4, 6, toutes)', n1 === suivant, { n0, n1, suivant });
  for (let k = 0; k < 8; k++) await L.toucher(c, '[data-mpas="-1"]'); const nmin = await c.p.evaluate(() => multiN);
  L.v('P9 · « − » s’arrête à une colonne (jamais zéro ni négatif)', nmin >= 1, nmin);
  for (let k = 0; k < 12; k++) await L.toucher(c, '[data-mpas="1"]'); const nmax = await c.p.evaluate(() => ({ n: multiN, txt: document.querySelector('.pm-pas2 b')?.textContent }));
  L.v('P9 · « ＋ » a une fin claire (« Toutes » ou un maximum)', nmax.n === 0 || nmax.n <= 12, nmax);
  await L.capture(c, CAP + `P9-multi-${profil}${nuit ? '-nuit' : ''}.png`);
  // Mes vues : enregistrer (nom vide → « Ma vue », puis nom très long), appliquer, supprimer
  await vue(c, 'multi'); await c.p.evaluate(() => { vuesEcrire([]); rendre(); }); await L.calme(c.p, 250);
  await L.toucher(c, '[data-mpop="vues"]');
  L.v('P9 · sans vue enregistrée, la fenêtre le dit', /Aucune vue enregistrée/.test(await texte(c.p, '.pm-pop') || ''), '');
  await L.toucher(c, '[data-action="vueEnregistrer"]');
  L.v('P9 · « Enregistrer la vue actuelle » ouvre un panneau avec un champ nom', await c.p.evaluate(() => !!document.getElementById('vue-nom')), '');
  await L.toucher(c, '[data-action="vueEnregistrerOk"]'); await L.calme(c.p, 300);
  L.v('P9 · un nom vide devient « Ma vue »', await c.p.evaluate(() => vuesLire().length === 1 && vuesLire()[0].nom === 'Ma vue'), await c.p.evaluate(() => vuesLire()));
  const long = 'Équipe clim du secteur nord avec les chantiers de la copropriété Les Mimosas';
  await c.p.evaluate(() => { multiJours = [AUJ]; plMasques = new Set(['kb', 'lr', 'tl']); rendre(); }); await L.calme(c.p, 250);
  await L.toucher(c, '[data-mpop="vues"]'); await L.toucher(c, '[data-action="vueEnregistrer"]');
  await c.p.fill('#vue-nom', long); await L.toucher(c, '[data-action="vueEnregistrerOk"]'); await L.calme(c.p, 300);
  await L.toucher(c, '[data-mpop="vues"]'); await L.capture(c, CAP + `P9-vues-${profil}${nuit ? '-nuit' : ''}.png`);
  const dep = await c.p.evaluate(() => { const p = document.querySelector('.pm-pop'); const r = p ? p.getBoundingClientRect() : null; const b = [...document.querySelectorAll('.pm-vue-l')].map(x => { const q = x.getBoundingClientRect(); return { r: Math.round(q.right), t: x.textContent.trim().slice(0, 50) }; }); return { pop: r ? { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.bottom) } : null, b, L: innerWidth }; });
  L.v('P9 · la liste « Mes vues » reste dans l’écran avec un nom très long', dep.pop && dep.pop.d <= dep.L + 1 && dep.pop.g >= -1, dep);
  await c.p.evaluate(() => document.querySelector('[data-mvue="1"]').click()); await L.calme(c.p, 300);
  const app = await c.p.evaluate(() => ({ J: multiJours.length, T: techsVus().map(t => t.id) }));
  L.v('P9 · appliquer la vue longue : un jour, Sophie et Non assigné', app.J === 1 && app.T.join() === 'sm,', app);
  await L.toucher(c, '[data-mpop="vues"]'); await c.p.evaluate(() => document.querySelector('[data-mvuesuppr="0"]').click()); await L.calme(c.p, 300);
  L.v('P9 · la croix supprime la vue et le dit', await c.p.evaluate(() => vuesLire().length === 1 && vuesLire()[0].nom !== 'Ma vue') && /supprimée/.test(await toast(c.p)), await toast(c.p));
  await c.p.evaluate(() => { vuesEcrire([]); });
});

parcours('P10 · les chiffres du bandeau suivent ce qui est affiché (personne masquée, vue Jour, Semaine, Sur mesure)', async c => {
  await vue(c, 'jour');
  const cartes = () => c.p.evaluate(() => new Set([...document.querySelectorAll('#contenu .pc[data-int]')].map(x => x.dataset.int)).size);
  const k0 = await kpis(c.p), n0 = await cartes();
  L.v('P10 · vue Jour : « interventions sur la période » = cartes dessinées', +k0.int === n0, { kpi: k0.int, cartes: n0 });
  await L.toucher(c, '[data-masque="sm"]');
  const k1 = await kpis(c.p), n1 = await cartes();
  L.v('P10 · Sophie masquée : le chiffre « interventions » suit les cartes affichées (planning-04)', +k1.int === n1, { kpi: k1.int, cartes: n1, avant: k0.int });
  const t1 = await c.p.evaluate(() => { const J = joursPeriode(); const L1 = INTS.filter(i => J.includes(i.d) && i.st !== 'annulee' && !plMasques.has(i.tech || '')); return { n: L1.length, mn: L1.reduce((s, i) => s + i.dur, 0) }; });
  L.v('P10 · Sophie masquée : « de travail prévu » ne compte plus ses heures (planning-04)', (() => { const m = String(k1.temps).replace(/\s+/g, ' '); const h = (m.match(/(\d+) h/) || [])[1], mn = (m.match(/h (\d+)/) || [])[1]; return (h ? +h * 60 : 0) + (mn ? +mn : 0) === t1.mn; })(), { kpi: k1.temps, attendu: t1.mn });
  await L.toucher(c, '[data-masque="sm"]');
  // « à planifier » et « en retard » : ce sont des chiffres de TOUT le planning, pas de la période — le libellé le dit-il ?
  await vue(c, 'jour', await c.p.evaluate(() => ajoute(AUJ, 9)));
  const k2 = await kpis(c.p); const lib = await c.p.evaluate(() => [...document.querySelectorAll('#contenu [data-kpi]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  const globaux = await c.p.evaluate(() => ({ plan: INTS.filter(i => i.st === 'aplanifier').length, plan9: INTS.filter(i => i.st === 'aplanifier' && i.d === ajoute(AUJ, 9)).length, retard: INTS.filter(i => i.st === 'retard').length }));
  console.log('   jour +9 :', JSON.stringify(k2), JSON.stringify(globaux), JSON.stringify(lib));
  // « à planifier » compte TOUTES les interventions sans date (elles n'ont pas de jour) : le même chiffre sur chaque jour est voulu ; le panneau ci-dessous en liste autant
  L.v('P10 · « à planifier » = toutes les interventions sans date, quel que soit le jour regardé', +k2.plan === globaux.plan, { kpi: k2.plan, global: globaux.plan });
  // panneau « à planifier » : même nombre de lignes que le chiffre
  await L.toucher(c, '[data-kpi="plan"]'); const lignes = await c.p.evaluate(() => document.querySelectorAll('#calque .panneau [data-go], #calque .panneau .ligne-clic, #calque .panneau [data-int]').length);
  L.v('P10 · le panneau « à planifier » liste autant de lignes que le chiffre', lignes === +k2.plan, { lignes, chiffre: k2.plan });
  await L.ranger(c.p);
  // vue Sur mesure : les cinq chiffres suivent les dates et les personnes choisies
  await vue(c, 'multi'); await c.p.evaluate(() => { plMasques = new Set(['kb', 'lr', 'tl', '']); rendre(); }); await L.calme(c.p, 300);
  const km = await kpis(c.p), nm = await cartes();
  L.v('P10 · Sur mesure, Sophie seule : le chiffre « interventions » = cartes affichées (planning-04)', +km.int === nm, { kpi: km.int, cartes: nm });
});

parcours('P11 · la Carte des tournées : résumé, retour de chaque personne, fiche d’une étape, « Y aller avec », confier', async c => {
  await vue(c, 'carte');
  const base = await c.p.evaluate(() => { const T = crTournees(AUJ), C = crAConfier(AUJ), nb = T.reduce((s, x) => s + x.S.filter(y => !y.bureau).length, 0) + C.length, tourn = T.filter(x => x.S.length).length; return { nb, tourn, C: C.map(i => i.id), A: crAlertes(AUJ, T).length, ids: T.flatMap(x => x.S.filter(y => !y.bureau).map(y => y.i.id)) }; });
  const res = await texte(c.p, '.cr-resume'); console.log('   résumé :', res, JSON.stringify(base));
  L.v('P11 · le résumé du jour dit le nombre d’interventions et de tournées', new RegExp(base.nb + ' intervention').test(res || '') && new RegExp(base.tourn + ' tournée').test(res || ''), res);
  const alt = await texte(c.p, '.cr-al-t'); L.v('P11 · « À regarder · N » = nombre d’alertes calculées', base.A ? new RegExp('· ' + base.A + '$').test(alt || '') : /Rien à signaler/.test(alt || ''), { alt, calcule: base.A });
  await L.capture(c, CAP + `P11-carte-${profil}${nuit ? '-nuit' : ''}.png`);
  // une personne : sa tournée seule, « Tout voir » revient
  await L.toucher(c, '.cr-chips [data-crfocus="sm"], [data-crfocus="sm"]');
  const f = await c.p.evaluate(() => ({ nom: document.querySelector('.cr-resume b')?.textContent, tours: document.querySelectorAll('#contenu .cr-t[data-crcible]').length, focus: crFocus }));
  L.v('P11 · toucher Sophie ne montre que sa tournée', f.focus === 'sm' && /Sophie/.test(f.nom || ''), f);
  L.v('P11 · « Tout voir » revient à toutes les tournées', await c.p.evaluate(() => { document.querySelector('.cr-chips [data-crfocus=""]').click(); return crFocus === null; }), '');
  await L.calme(c.p, 300);
  // choisir une étape : la fiche, les trois liens « Y aller avec » vers LA position du client
  const cible = await c.p.evaluate(() => { const T = crTournees(AUJ); const s = T.flatMap(x => x.S).find(x => !x.bureau && CR_GEO[x.i.cli]); return s ? { id: s.i.id, cli: s.i.cli, nom: CLIENTS[s.i.cli].nom, ll: CR_GEO[s.i.cli] } : null; });
  L.v('P11 · il y a une étape à toucher', !!cible, cible);
  await L.toucher(c, '#contenu [data-crsel="' + cible.id + '"]'); await L.calme(c.p, 500);
  const fi = await c.p.evaluate(() => { const f = document.querySelector('.cr-fiche'); if (!f) return null; return { h4: f.querySelector('h4')?.textContent, liens: [...f.querySelectorAll('[data-craller]')].map(a => ({ k: a.dataset.craller, href: a.href, t: a.target, rel: a.rel, txt: a.textContent })), boutons: [...f.querySelectorAll('button')].map(b => b.textContent.trim() || b.getAttribute('aria-label')) }; });
  L.v('P11 · la fiche d’étape s’ouvre avec le nom du client', !!fi && fi.h4 === cible.nom, fi && fi.h4);
  const dst = cible.ll[0].toFixed(5) + ',' + cible.ll[1].toFixed(5);
  L.v('P11 · « Y aller avec » : Waze, Google Maps et Apple Plans visent la position du client', !!fi && fi.liens.length === 3 && fi.liens.every(l => l.href.includes(dst)), fi && fi.liens);
  L.v('P11 · les trois liens s’ouvrent à part et sans transmettre la page (noopener)', !!fi && fi.liens.every(l => l.t === '_blank' && /noopener/.test(l.rel)), fi && fi.liens.map(l => l.t + '/' + l.rel));
  await L.capture(c, CAP + `P11-fiche-${profil}${nuit ? '-nuit' : ''}.png`);
  // « Voir au planning » puis retour ; « Fiche »
  await c.p.evaluate(() => document.querySelector('.cr-fiche [data-crplan]').click()); await L.calme(c.p, 500);
  const vp = await c.p.evaluate(id => ({ v: plVue, d: plRef, carte: !!document.querySelector('.pc[data-int="' + id + '"]') }), cible.id);
  L.v('P11 · « Voir au planning » ouvre la vue Jour avec la carte de l’intervention', vp.v === 'jour' && vp.carte, vp);
  await vue(c, 'carte'); await L.toucher(c, '#contenu [data-crsel="' + cible.id + '"]'); await L.calme(c.p, 400);
  await c.p.evaluate(() => document.querySelector('.cr-fiche [data-go]').click()); await L.calme(c.p, 500);
  L.v('P11 · « Fiche » ouvre la fiche de la bonne intervention', (await L.etat(c.p)).hash === '#inter-x-' + cible.id, (await L.etat(c.p)).hash);
  // fermer la fiche
  await vue(c, 'carte'); await L.toucher(c, '#contenu [data-crsel="' + cible.id + '"]'); await L.calme(c.p, 400);
  await c.p.evaluate(() => (document.querySelector('.cr-fiche .x') || document.querySelector('.cr-ret'))?.click()); await L.calme(c.p, 300);
  L.v('P11 · la croix ferme la fiche', await c.p.evaluate(() => !document.querySelector('.cr-fiche')), '');
  // confier : une intervention sans technicien, au plus proche, puis Annuler
  if (base.C.length) {
    const conf = base.C[0]; const av = await c.p.evaluate(id => INTS.find(x => x.id === id).tech, conf);
    const ok = await c.p.evaluate(id => { const b = document.querySelector('[data-crconf^="' + id + '|"]'); if (!b) return null; const t = b.dataset.crconf.split('|')[1]; b.click(); return t; }, conf); await L.calme(c.p, 500);
    const ap = await c.p.evaluate(id => INTS.find(x => x.id === id).tech, conf);
    if (ok) { L.v('P11 · « Confier à … » donne l’intervention à la personne proposée', ap === ok && !av, { av, ap, ok }); const tt = await toast(c.p); L.v('P11 · un message le dit, avec « Annuler »', /Annuler/.test(tt), tt);
      await c.p.evaluate(() => [...document.querySelectorAll('#toast button')].find(b => /Annuler/.test(b.textContent))?.click()); await L.calme(c.p, 400);
      L.v('P11 · « Annuler » remet l’intervention sans technicien', await c.p.evaluate(id => !INTS.find(x => x.id === id).tech, conf), ''); }
    else L.v('P11 · une proposition « Confier à … » existe pour la première intervention à confier', false, { conf, personne_libre: 'aucun bouton' });
  }
  // fonds et thèmes de la carte
  await c.p.evaluate(() => { document.querySelector('[data-crfond="sat"]').click(); }); await L.calme(c.p, 300);
  L.v('P11 · « Satellite » : le fond change et « Jour / Nuit » se grise (avec son explication)', await c.p.evaluate(() => crFondType === 'sat' && [...document.querySelectorAll('[data-crtheme]')].every(b => b.disabled && /satellite/i.test(b.title))), '');
  await c.p.evaluate(() => { document.querySelector('[data-crfond="plan"]').click(); document.querySelector('[data-crtheme="nuit"]').click(); }); await L.calme(c.p, 300);
  L.v('P11 · « Plan » puis « Nuit » : la carte passe en sombre', await c.p.evaluate(() => document.getElementById('cr-carte').classList.contains('cr-sombre')), '');
  await c.p.evaluate(() => document.querySelector('[data-crtheme="auto"]').click());
  // plein écran puis Échap
  await c.p.evaluate(() => document.querySelector('[data-crplein]').click()); await L.calme(c.p, 400); const pl = await c.p.evaluate(() => crPlein);
  await L.capture(c, CAP + `P11-plein-${profil}${nuit ? '-nuit' : ''}.png`);
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
  L.v('P11 · plein écran : Échap en sort (ou le bouton, présent)', pl && (await c.p.evaluate(() => !crPlein) || await c.p.evaluate(() => !!document.querySelector('[data-crplein]'))), { plein: pl });
  await c.p.evaluate(() => { if (crPlein) document.querySelector('[data-crplein]').click(); });
  // jour suivant : la sélection ne suit pas
  await L.toucher(c, '[data-plnav="1"]'); const nx = await c.p.evaluate(() => ({ sel: crSel, d: plRef, h1: document.querySelector('.cr-resume b')?.textContent }));
  L.v('P11 · le jour suivant ne garde pas la fiche du jour d’avant', nx.sel === null, nx);
});

parcours('P12 · un client créé à la main (adresse à Rochefort) : sa place sur la carte et ses liens « Y aller avec » (planning-01)', async c => {
  await vue(c, 'semaine');
  await L.toucher(c, '[data-creer]'); await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen'));
  await L.toucher(c, '.fen [data-cnouveau="1"]');
  await c.p.fill('.fen [data-cnv="nom"]', 'Boulangerie Test Rochefort'); await c.p.fill('.fen [data-cnv="contact"]', 'Mme Dupuis'); await c.p.fill('.fen [data-cnv="tel"]', '06 12 34 56 78');
  await c.p.fill('.fen [data-cnv="adr"]', '12 Rue de la République, 17300 Rochefort'); await L.calme(c.p, 300);
  const d0 = await c.p.evaluate(() => ajoute(AUJ, 2));
  await L.toucher(c, '.fen [data-ctype="Entretien"]'); await c.p.evaluate(d => document.querySelector('.fen [data-cjour="' + d + '"]')?.click(), d0); await L.calme(c.p, 300);
  const dispo = await c.p.evaluate(() => { const b = [...document.querySelectorAll('.fen [data-dispo]')].find(x => !x.disabled && x.dataset.dispo.startsWith('sm|')); if (!b) return null; b.scrollIntoView({ block: 'center', inline: 'center' }); return b.dataset.dispo; });
  L.v('P12 · une case libre existe chez Sophie lundi', !!dispo, dispo);
  await L.toucher(c, '.fen [data-dispo="' + dispo + '"]');
  const rep = await texte(c.p, '.fen .adr-rep'); L.v('P12 · l’adresse est « Repérée : Rochefort » (38 km du dépôt)', /Rochefort/.test(rep || '') && /38 km/.test(rep || ''), rep);
  const avantIds = await c.p.evaluate(() => INTS.map(x => x.id));
  // le téléphone saisi est celui d'un client existant : « Créer » prévient AVANT de créer un doublon (un second toucher le crée quand même)
  await L.toucher(c, '[data-action="cCreer"]'); await L.calme(c.p, 500);
  const tdbl = await toast(c.p);
  L.v('P12 · un téléphone déjà connu : « Créer » prévient d’un doublon possible et ne crée rien', /existe peut-être déjà/.test(tdbl) && (await c.p.evaluate(() => INTS.length)) === avantIds.length, tdbl);
  await c.p.fill('.fen [data-cnv="tel"]', '06 98 76 54 32'); await L.calme(c.p, 300);
  await c.p.evaluate(() => { CREA.doublonOk = false; });   // un nouveau numéro : on repart sans l'avertissement déjà lu
  await L.toucher(c, '[data-action="cCreer"]'); await L.calme(c.p, 600);
  const nouveaux = await c.p.evaluate(av => INTS.filter(x => !av.includes(x.id) && x.id !== 'brouillon').map(x => x.id), avantIds);
  L.v('P12 · « Créer » ajoute UNE intervention de plus (la nouvelle, pas la dernière de la liste)', nouveaux.length === 1, nouveaux);
  const n = await c.p.evaluate(id => { const i = INTS.find(x => x.id === id) || INTS[INTS.length - 1]; return { id: i.id, cli: i.cli, d: i.d, h: i.h, geo: !!CR_GEO[i.cli], nom: CLIENTS[i.cli].nom }; }, nouveaux[0]);
  console.log('   créée :', JSON.stringify(n));
  await vue(c, 'carte', n.d); await L.toucher(c, '#contenu [data-crsel="' + n.id + '"]'); await L.calme(c.p, 500);
  await L.capture(c, CAP + `P12-carte-${profil}${nuit ? '-nuit' : ''}.png`);
  const r = await c.p.evaluate(({ id }) => { const T = crTournees(plRef), s = T.flatMap(x => x.S).find(x => x.i.id === id); const f = document.querySelector('.cr-fiche'); return { km: s && s.tr.km, min: s && s.tr.min, aDepot: s && crPos(s) === CR_DEPOT, liens: f ? [...f.querySelectorAll('[data-craller]')].map(a => a.href) : [], depot: CR_DEPOT }; }, n);
  console.log('   position :', JSON.stringify(r));
  L.v('P12 · le client de Rochefort n’est pas posé au dépôt de La Rochelle sur la carte (planning-01)', !r.aDepot, r);
  L.v('P12 · les liens « Y aller avec » ne visent pas le dépôt (planning-01)', r.liens.length === 3 && r.liens.every(h => !h.includes(r.depot[0].toFixed(5) + ',' + r.depot[1].toFixed(5))), r.liens);
  L.v('P12 · le trajet jusqu’à Rochefort n’est pas « 0 km » (planning-01)', r.km > 20, r.km);
});

parcours('P13 · un client SANS position connue : la fiche de la carte le dit et les liens « Y aller avec » visent l’adresse écrite (planning-01)', async c => {
  const o = await c.p.evaluate(() => { const i = INTS.find(x => x.d === AUJ && x.tech && x.st !== 'fait' && CR_GEO[x.cli]); if (!i) return null; delete CR_GEO[i.cli]; CLIENTS[i.cli].adr = '5 chemin des Vignes, Nullepart-les-Oies'; return { id: i.id, cli: i.cli, d: i.d }; });
  L.v('P13 · une intervention du jour dont on peut retirer la position', !!o, o); if (!o) return;
  await vue(c, 'carte', o.d); await L.calme(c.p, 600); await c.p.evaluate(id => crChoisir(id, false), o.id); await L.calme(c.p, 600);
  const f = await c.p.evaluate(() => { const e = document.querySelector('.cr-fiche'); return e ? { txt: e.textContent.replace(/\s+/g, ' '), liens: [...e.querySelectorAll('[data-craller]')].map(a => decodeURIComponent(a.href)) } : null; });
  L.v('P13 · la fiche dit « Position inconnue »', !!f && /Position inconnue/.test(f.txt), f && f.txt.slice(0, 200));
  L.v('P13 · les trois liens visent l’adresse écrite, pas des coordonnées de dépôt', !!f && f.liens.length === 3 && f.liens.every(h => /Vignes/.test(h) && !h.includes('46.15850')), f && f.liens);
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
