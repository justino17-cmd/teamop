// Parcours réels de l'Accueil, des Statistiques et de l'Historique (gérant) : ce qu'une personne fait vraiment, avec la COHÉRENCE d'un écran à l'autre.
// node accueil-parcours.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const hash = () => p.evaluate(() => location.hash);
  // le libellé de la période ENTRE les flèches (« Octobre 2026 ») : le corps de la page cite aussi chaque mois dans les bulles du graphique, un motif lu dans tout le corps ne prouve rien (mutation M4)
  const periode = () => p.evaluate(() => { const b = document.querySelector('[data-stnav="-1"]'); return b ? b.parentElement.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const retour = async () => { const ok = await L.toucher(c, p.locator('#contenu button, #contenu a').filter({ hasText: /^‹\s*Retour/ }).first(), { delai: 3000 }); await p.waitForTimeout(500); return ok; };
  const panneau = () => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : null; });

  // P1 — Accueil → une intervention de la liste → la fiche → Retour → l'Accueil
  await L.aller(p, 'accueil'); await L.toucher(c, '[data-go="inter-x-i1"]'); await p.waitForTimeout(500);
  const f1 = await corps(); v('P1 : la ligne « Dépannage climatisation » ouvre la fiche de CETTE intervention', (await hash()) === '#inter-x-i1' && /Dépannage climatisation/.test(f1), await hash());
  v('P1 : la fiche dit d’où l’on vient (« Retour · Accueil »)', /Retour\s*·\s*Accueil/.test(f1), f1.slice(0, 80));
  v('P1 : « Retour » ramène à l’Accueil', (await retour()) && (await hash()) === '#accueil', await hash());
  // P1 bis — le retour du NAVIGATEUR
  await L.toucher(c, '[data-go="inter-x-i1"]'); await p.waitForTimeout(400); await p.goBack(); await p.waitForTimeout(600);
  v('P1 bis : le bouton Précédent du navigateur ramène à l’Accueil', (await hash()) === '#accueil', await hash());

  // P2 — « Nouvelle intervention » depuis l'Accueil
  await L.aller(p, 'accueil'); const a2 = await O.etat2(p); await L.toucher(c, '[data-creer="1"]'); await p.waitForTimeout(800);
  const e2 = await O.etat2(p); const vis = await p.evaluate(() => { const o = [...document.querySelectorAll('#calque > *, #opdz, #cmpt, [role=dialog]')].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed'); return o.map(e => (e.id || e.className).toString().slice(0, 40) + ':' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 80)); });
  console.log('  P2 après « Nouvelle intervention » :', JSON.stringify(e2), JSON.stringify(vis.slice(0, 4)));
  v('P2 : « Nouvelle intervention » ouvre quelque chose (fenêtre ou feuille)', vis.some(x => /interven|client|titre|quand/i.test(x)) || e2.pan || e2.fen, { e2, vis: vis.slice(0, 3) });
  await L.ranger(p);

  // P3 — une tâche de « À faire maintenant » : le volet, puis la marquer faite → elle quitte l'Accueil ; l'Historique la note
  await L.aller(p, 'accueil'); const avant3 = (await corps()).includes('Commander 2 condensateurs 5 µF');
  await L.toucher(c, '[data-tache="t2"]'); await p.waitForTimeout(600); const pan3 = await panneau(); console.log('  P3 volet tâche :', pan3);
  v('P3 : la ligne ouvre le volet de CETTE tâche', avant3 && pan3 && /Commander 2 condensateurs/.test(pan3), pan3);
  const btnFait = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).filter(Boolean)); console.log('  P3 boutons du volet :', JSON.stringify(btnFait));
  await L.ranger(p);

  // P4 — Statistiques : périodes, navigation, mois du graphique, détail
  await L.aller(p, 'statistiques'); await p.evaluate("stPer='mois'; stK=ST_FIN; stFiltreTech='tout';"); await L.aller(p, 'statistiques');
  const s0 = await periode(); v('P4 : par défaut « Octobre 2026 », mois', /Octobre 2026/.test(s0) && !/–/.test(s0), s0);
  await L.toucher(c, '[data-stper="trimestre"]'); const s3 = await periode(); v('P4 : « 3 mois » change la période affichée', /août 2026\s*–\s*oct/i.test(s3), s3);
  await L.toucher(c, '[data-stper="annee"]'); const s12 = await periode(); v('P4 : « 12 mois » change la période affichée', /nov\S* 2025\s*–\s*oct\S* 2026/i.test(s12), s12);
  await L.toucher(c, '[data-stper="mois"]'); await L.toucher(c, '[data-stnav="-1"]'); const sp = await periode(); v('P4 : « période précédente » donne septembre 2026', /Septembre 2026/.test(sp), sp);
  const suivDesact = await p.evaluate(() => { const b = document.querySelector('[data-stnav="1"]'); return b ? { dis: b.disabled || b.getAttribute('aria-disabled') } : null; });
  await L.toucher(c, '[data-stnav="1"]'); const sn = await periode(); v('P4 : « période suivante » revient à octobre 2026', /Octobre 2026/.test(sn), sn);
  const suiv2 = await p.evaluate(() => { const b = document.querySelector('[data-stnav="1"]'); return b ? { dis: b.disabled, aria: b.getAttribute('aria-disabled') } : 'absent'; }); console.log('  P4 bouton suivant à la fin :', JSON.stringify(suiv2));
  for (let i = 0; i < 14; i++) { const ok = await L.toucher(c, '[data-stnav="-1"]', { delai: 1500 }); if (!ok) break; }
  const sfin = await corps(); const pasDeVide = !/NaN|undefined|Infinity/.test(sfin); v('P4 : reculer jusqu’au bout ne casse rien (pas de NaN / undefined)', pasDeVide, sfin.slice(0, 200)); console.log('  P4 plus ancien mois :', sfin.slice(80, 160));
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques');
  // un mois du graphique
  await L.toucher(c, '[data-stmois="2026-07"]'); const sj = await periode(); v('P4 : toucher « juillet » dans le graphique affiche juillet 2026', /Juillet 2026/.test(sj), sj);
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques');
  // détail « encaissé » : le total du volet = la tuile
  await L.toucher(c, '[data-stdet="enc"]'); const pe = await panneau(); console.log('  P4 volet encaissé :', pe);
  v('P4 : le volet « Paiements reçus » existe', pe && /Paiements reçus/.test(pe), pe); await L.ranger(p);
  await L.toucher(c, '[data-stdet="tech-kb"]'); const pk = await panneau(); console.log('  P4 volet Karim :', pk); await L.ranger(p);
  await L.toucher(c, '[data-stdet="cli-md"]'); const pc = await panneau(); console.log('  P4 volet Durand :', pc);
  const boutonsPc = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim())); console.log('  P4 boutons volet client :', JSON.stringify(boutonsPc)); await L.ranger(p);
  await L.toucher(c, '[data-stbilan="1"]'); const pb = await panneau(); console.log('  P4 bilan PDF :', pb); v('P4 : « Bilan du mois en PDF » ouvre un aperçu', pb && /Bilan/.test(pb), pb); await L.ranger(p);

  // P5 — Historique : filtres combinés, remise à zéro, ouvrir une ligne, retour
  await L.aller(p, 'historique'); await p.evaluate("hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique');
  const nTous = (await corps()).match(/(\d+) actions? trouvées?/);
  await L.toucher(c, '[data-htype="facture"]'); const h1 = await corps(); const m1 = h1.match(/(\d+) actions? trouvées?/);
  v('P5 : le filtre « Factures et paiements » annonce un nombre', !!m1, h1.slice(150, 330));
  await p.evaluate(() => { const s = document.querySelector('[data-hqui]'); s.value = 'julie'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(400);
  const h2 = await corps(), m2 = h2.match(/(\d+) actions? trouvées?/); v('P5 : un second filtre (Julie) réduit ou garde le nombre', m1 && m2 && +m2[1] <= +m1[1], { m1: m1 && m1[1], m2: m2 && m2[1] });
  const tousJulie = await p.evaluate(() => [...document.querySelectorAll('.h-l')].every(e => /Julie Petit/.test(e.innerText))); v('P5 : toutes les lignes affichées sont de Julie', tousJulie);
  await L.toucher(c, '[data-hraz="1"]'); const h3 = await corps(); v('P5 : « Réinitialiser les filtres » rend tout', !/trouvées?/.test(h3.slice(0, 600)) && /Tout/.test(h3), h3.slice(150, 330));
  // recherche
  await p.fill('[data-hcherche]', 'mimosas'); await p.waitForTimeout(500); const h4 = await corps(); const m4 = h4.match(/(\d+) actions? trouvées?/); v('P5 : la recherche « mimosas » trouve des actions', m4 && +m4[1] > 0, h4.slice(150, 300));
  const toutesMim = await p.evaluate(() => [...document.querySelectorAll('.h-l')].every(e => /mimosas/i.test(e.innerText))); v('P5 : chaque ligne trouvée parle bien de « Mimosas »', toutesMim);
  await p.fill('[data-hcherche]', 'zzzz'); await p.waitForTimeout(500); const h5 = await corps(); v('P5 : une recherche sans résultat dit quoi faire', /Aucune action ne correspond/.test(h5) && /Réinitialiser/.test(h5), h5.slice(150, 330));
  await L.toucher(c, '[data-hraz="1"]');

  // P6 — ce que le prototype fait s'inscrit : un geste → une ligne « à l'instant » ; l'Historique la dit au nom de Marc
  await L.aller(p, 'planning'); const n0 = await p.evaluate(() => JOURNAL.length);
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i5'); poser(i, 'sm', i.d, '17:00', i.dur); }); 
  await L.aller(p, 'historique'); const n1 = await p.evaluate(() => JOURNAL.length), h6 = await corps();
  v('P6 : planifier une intervention ajoute une ligne à l’Historique', n1 === n0 + 1 && /à l’instant/.test(h6), { n0, n1 });
  await p.evaluate("hOuverts=new Set([AUJ])"); await L.aller(p, 'accueil'); const a6 = await corps();
  v('P6 : l’intervention planifiée quitte « à planifier » de l’Accueil (le nombre baisse)', /1 autre intervention à planifier|1 intervention à planifier/.test(a6) || !/2 autres interventions à planifier/.test(a6), a6.match(/\d+ (autres? )?interventions? à planifier/g));

  // P7 — Historique, ouvrir une ligne puis « Ouvrir » : la fiche annoncée ; Retour revient à l'Historique
  await L.aller(p, 'historique'); await p.evaluate("hOuverts=new Set([AUJ]);hMax=60"); await L.aller(p, 'historique');
  await L.toucher(c, '[data-hj="j45"]'); await p.waitForTimeout(500); const pj = await panneau(); console.log('  P7 volet :', pj);
  const ouvrir = p.locator('#calque .panneau button').filter({ hasText: /^Ouvrir/ }).first(); const okO = await L.toucher(c, ouvrir); await p.waitForTimeout(500);
  const hp = await panneau(); console.log('  P7 après « Ouvrir » :', hp);
  const pl = p.locator('#calque [data-plein]').first(); if (await pl.count()) { await L.toucher(c, pl); await p.waitForTimeout(600); }
  const e7 = await O.etat2(p); v('P7 : « Ouvrir » mène à la fiche de l’intervention de la ligne (Dépannage climatisation)', /Dépannage climatisation/.test(e7.h1) , e7);
  v('P7 : « Retour » de la fiche ramène à l’Historique', (await retour()) && (await hash()) === '#historique', await hash());

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
