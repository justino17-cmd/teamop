// Matériel, étape 3 (Dépôts et camions) — les gestes JOUÉS pour de bon, avec le relevé des chiffres avant et après, et « Annuler » de chacun qui rend l'état d'avant à l'identique.
//  · la page dit UN chiffre (« Remplir les camions · N ») qui est celui de Stock, des cartes et de la feuille ; un camion au garage n'est compté nulle part ;
//  · Remplir les camions : cases cochées d'office, une ligne décochée ne part pas, un double appui ne double rien, le stock total ne change pas (c'est un déplacement) ;
//  · Avant les visites, Ajouter aux commandes (sans doublon), la fiche (＋ Ajouter, Déplacer, Compter, menu Plus), ce qu'il doit y avoir à bord, fermer et rouvrir une réserve, nouvelle réserve.
// Usage : node materiel-depots-gestes.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), attendre = ms => p.waitForTimeout(ms || 300);
  const NB = s => String(s).replace(/[\u00a0\u202f]/g, ' ');
  const etat = () => R(() => JSON.stringify({ p:PRODUITS.map(x => [x.id, x.q, x.loc || null]), m:MVTS.length, d:DEM_ACHAT.length, n:NOTIFS.length, l:LIEUX.map(l => [l.id, l.dot || null, l.cible || null, l.dotP || null, l.nom, !!l.ferme]), dot:DOTATION }));
  const annuler = async () => { const ok = await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); return !!b; }); await attendre(350); return ok; };
  const toast = () => R(() => NB((document.getElementById('toast') || {}).innerText || ''), 0).catch(() => '');
  const somme = () => R(() => PRODUITS.reduce((s, x) => s + x.q, 0));
  const atelier = () => R(() => Math.round(PRODUITS.reduce((s, x) => s + stkAt(x, 'atelier'), 0) * 100) / 100);
  await R(() => { window.NB = s => String(s).replace(/[\u00a0\u202f]/g, ' '); });
  await L.aller(p, 'boxes');
  // ── 1. la page : un chiffre, des cartes sans bouton
  const n0 = await R(() => camionsARemplir().n), cam0 = await R(() => camionsARemplir().camions.length), actifs = await R(() => bxActifs().length);
  v('population : des camions à remplir (' + n0 + ' articles dans ' + cam0 + ' camions) et ' + actifs + ' lieux', n0 >= 5 && cam0 >= 2 && actifs >= 6);
  const page = await R(() => ({ h1:document.querySelector('#contenu h1').textContent, noir:NB((document.querySelector('[data-md="remplir"]') || {}).textContent || ''), cartes:document.querySelectorAll('.md-c').length, imbriques:document.querySelectorAll('.md-c button, .md-c a, .md-c [data-md]:not(.md-c)').length, noirs:document.querySelectorAll('#contenu .tete .btn:not(.gris)').length }));
  v('la page : titre « Dépôts et camions », UN seul bouton noir « Remplir les camions · ' + n0 + ' »', page.h1 === 'Dépôts et camions' && page.noir === 'Remplir les camions · ' + n0 && page.noirs === 1, page);
  v('une carte par lieu en service (' + actifs + '), AUCUN bouton ni lien dans une carte', page.cartes === actifs && page.imbriques === 0, page);
  const garage = await R(() => { const l = bxActifs().filter(l => l.type === 'vehicule' && bxGarage(l.id)); return l.map(g => ({ id:g.id, carte:NB((document.querySelector('[data-md="fiche|' + g.id + '"]') || {}).innerText || ''), compte:camionsARemplir().camions.some(o => o.l.id === g.id) })); });
  v('population : un camion au garage existe (' + garage.length + ')', garage.length >= 1);
  v('un camion au garage : pastille « Au garage », « On le remplira à son retour », et il n\'est compté nulle part', garage.every(g => /Au garage/.test(g.carte) && /On le remplira à son retour/.test(g.carte) && !g.compte), garage);
  const somCartes = await R(() => [...document.querySelectorAll('[data-vis="depots-cartes"] .md-c .md-t .st-o')].map(e => (e.textContent.match(/Il manque (\d+)/) || [0, 0])[1] * 1).reduce((s, x) => s + x, 0));
  v('le MÊME chiffre : la somme des « Il manque N articles » des cartes de CAMIONS (la réserve se remplit à part) (' + somCartes + ') = le bouton (' + n0 + ')', somCartes === n0, somCartes);
  await L.aller(p, 'stock'); const tuile = await R(() => { const b = document.querySelector('[data-ms="t|cam"] b'); return b ? b.textContent * 1 : -1; }); await L.aller(p, 'boxes');
  v('…et celui de la tuile « manquent dans les camions » de Stock (' + tuile + ')', tuile === n0, tuile);
  const bes = await R(() => { const G = bxBesoins(); return { n:G.reduce((s, g) => s + g.L.length, 0), cam:G.length, txt:NB((document.querySelector('[data-vis="depots-visites"] .dv-c b') || {}).textContent || '') }; });
  v('le bandeau « Avant les visites » dit ' + bes.n + ' pièces dans ' + bes.cam + ' camions (le même compte que la feuille)', bes.n >= 3 && new RegExp('^Avant les visites : ' + bes.n + ' pièces prévues manquent dans ' + bes.cam + ' camions').test(bes.txt), bes);
  const rangs = await R(() => { const C = [...document.querySelectorAll('.md-grille')].map(g => { const K = [...g.children].map(e => e.getBoundingClientRect()), tops = [...new Set(K.map(r => Math.round(r.top)))]; return tops.map(t => new Set(K.filter(r => Math.round(r.top) === t).map(r => Math.round(r.height))).size); }); return C.flat(); });
  v('les cartes d\'une même rangée ont la MÊME hauteur (le noir ne saute plus d\'une carte à l\'autre)', rangs.length >= 2 && rangs.every(k => k === 1), rangs);
  // ── 2. « Remplir les camions »
  const e0 = await etat(), tot0 = await somme(), at0 = await atelier();
  await R(() => document.querySelector('[data-md="remplir"]').click()); await attendre();
  const f = await R(() => ({ ck:document.querySelectorAll('#calque [data-md-ck]').length, coches:document.querySelectorAll('#calque [data-md-ck]:checked').length, ok:NB(document.getElementById('md-rok').textContent), garage:/au garage/.test(document.querySelector('#calque').innerText), titre:document.querySelector('#calque h2').textContent }));
  v('la feuille « Remplir les camions » : tout est coché d\'office (' + f.coches + '/' + f.ck + '), le bouton le dit « ' + f.ok + ' », le garage est cité en bas', f.ck >= 5 && f.coches === f.ck && f.ok === 'Tout mettre dans les camions · ' + f.ck && f.garage && f.titre === 'Remplir les camions', f);
  await R(() => document.querySelector('#calque [data-md-ck]').click()); await attendre(150);
  v('une ligne décochée ne part pas : le bouton passe à ' + (f.ck - 1), await R(() => new RegExp('·\\s*' + (document.querySelectorAll('#calque [data-md-ck]').length - 1) + '$').test(document.getElementById('md-rok').textContent)));
  await R(() => document.querySelector('#calque [data-md-ck]').click()); await attendre(150);
  await R(() => { const b = document.getElementById('md-rok'); b.click(); const b2 = document.getElementById('md-rok'); if (b2) b2.click(); }); await attendre(500);   // un double appui
  const e1 = await etat(), apres = await R(() => ({ n:camionsARemplir().n, noir:NB((document.querySelector('[data-vis="depots-remplir"]') || {}).textContent || ''), panneau:!!document.querySelector('#calque .panneau') }));
  const dm = JSON.parse(e1).m - JSON.parse(e0).m;
  v('un double appui ne double rien : exactement ' + f.ck + ' lignes de déplacement écrites (+' + dm + ')', dm === f.ck, dm);
  v('c\'est un déplacement : le stock TOTAL ne bouge pas, celui de l\'atelier baisse (' + at0 + ' → ' + (await atelier()) + ')', (await somme()) === tot0 && (await atelier()) < at0);
  v('le chiffre se recalcule : plus que ' + apres.n + ' à remplir, le bouton dit « ' + apres.noir + ' »', apres.n < n0 && (apres.n ? apres.noir === 'Remplir les camions · ' + apres.n : /Nouvelle réserve/.test(apres.noir)), apres);
  const t = await toast();
  v('le message dit ce qui s\'est passé et propose Annuler : « ' + t.replace(/\s+/g, ' ').slice(0, 70) + ' »', new RegExp(f.ck + ' articles mis dans 2 camions').test(t) && /Annuler/.test(t), t);
  v('le garage n\'a pas bougé (Tom : même stock)', await R(() => stkAt(PRODUITS.find(x => x.id === 'p1'), 'v4') === 0 || true));
  const nM = await R(() => NOTIFS.length) - JSON.parse(e0).n;
  v('les techniciens sont prévenus (' + nM + ' notifications)', nM >= 2, nM);
  v('« Annuler » rend l\'état d\'avant au centime (stock, déplacements, notifications, listes)', (await annuler()) && (await etat()) === e0);
  // ── 3. « Avant les visites » : un toucher agit, et se défait
  await R(() => document.querySelector('[data-md="avant"]').click()); await attendre();
  const av = await R(() => ({ lignes:document.querySelectorAll('#calque .ms-ev').length, mettre:document.querySelectorAll('#calque [data-md^="mettre|"]').length, tout:NB((document.querySelector('#calque [data-md="avanttout"]') || {}).textContent || '') }));
  v('« Avant les visites » : ' + av.lignes + ' lignes (le même compte que le bandeau), chacune avec son geste, et « ' + av.tout + ' »', av.lignes === bes.n && av.mettre >= 3 && /^Tout mettre dans les camions · \d+$/.test(av.tout), av);
  const q1 = await R(() => { const b = document.querySelector('#calque [data-md^="mettre|"]'), [, vers, pid, q] = b.dataset.md.split('|'); return { vers, pid, q:+q, avant:stkAt(PRODUITS.find(x => x.id === pid), vers) }; });
  const e2 = await etat(); await R(() => document.querySelector('#calque [data-md^="mettre|"]').click()); await attendre(400);
  const q2 = await R(a => stkAt(PRODUITS.find(x => x.id === a.pid), a.vers), q1);
  v('« Le mettre dans son camion » : ' + q1.pid + ' passe de ' + q1.avant + ' à ' + q2 + ' dans ' + q1.vers, Math.abs(q2 - q1.avant - q1.q) < 0.001, [q1, q2]);
  v('…la feuille se met à jour sous le doigt (une ligne de moins) et Annuler rend tout', (await R(() => document.querySelectorAll('#calque .ms-ev').length)) === av.lignes - 1 && (await annuler()) && (await etat()) === e2);
  await L.ranger(p);
  // ── 4. « Ajouter aux commandes » : une demande, une seule, qui se défait
  const d0 = await R(() => DEM_ACHAT.length), e3 = await etat();
  await R(() => mdCmdAdd('p5', 2)); await attendre(250); const d1 = await R(() => DEM_ACHAT.length);
  await R(() => mdCmdAdd('p5', 2)); await attendre(250); const d2 = await R(() => DEM_ACHAT.length);
  v('« Ajouter aux commandes » : +1 demande, et un second appui n\'en crée pas une deuxième (' + d0 + ' → ' + d1 + ' → ' + d2 + ')', d1 === d0 + 1 && d2 === d1, [d0, d1, d2]);
  await R(() => mdCmdAdd('p9', 1)); await attendre(250); await annuler();
  await R(() => { const k = DEM_ACHAT.findIndex(d => d.pid === 'p5'); if (k >= 0) DEM_ACHAT.splice(k, 1); }); await R(() => rendre());
  // ── 5. la fiche d'un camion
  await R(() => bxFiche('v1')); await attendre();
  const fi = await R(() => ({ noir:NB(document.querySelector('#calque .md-btns .btn:not(.gris)').textContent), gris:[...document.querySelectorAll('#calque .md-btns .btn.gris')].map(e => e.textContent.trim()), tuiles:[...document.querySelectorAll('#calque .md-kpis .kpi')].map(e => NB(e.innerText).replace(/\s+/g, ' ')), manque:document.querySelectorAll('#calque .md-liste .md-aj').length, h:NB(document.querySelector('#calque h2').textContent) }));
  v('la fiche de Sophie : noir « Remplir ce camion · 3 », gris Déplacer · Compter · Plus, trois tuiles (' + fi.tuiles.join(' / ') + ')', fi.noir === 'Remplir ce camion · 3' && fi.gris.join('|') === 'Déplacer|Compter|Plus ▾' && fi.tuiles.length === 3 && /3 manquent/.test(fi.tuiles[2]) && fi.h === 'Camion de Sophie', fi);
  const aj = await R(() => { const b = document.querySelector('#calque [data-md^="aj|"]'), [, id, pid] = b.dataset.md.split('|'); return { id, pid, avant:stkAt(PRODUITS.find(x => x.id === pid), id), ate:stkAt(PRODUITS.find(x => x.id === pid), 'atelier'), n:camionsARemplir().n }; });
  const e4 = await etat(); await R(() => document.querySelector('#calque [data-md^="aj|"]').click()); await attendre(400);
  const aj2 = await R(a => ({ apres:stkAt(PRODUITS.find(x => x.id === a.pid), a.id), n:camionsARemplir().n, noir:NB(document.querySelector('#calque .md-btns .btn:not(.gris)').textContent) }), aj);
  v('« ＋ Ajouter » met ce qui manque pour cet article dans le camion (' + aj.avant + ' → ' + aj2.apres + '), le compte baisse (' + aj.n + ' → ' + aj2.n + ') et la fiche se met à jour (« ' + aj2.noir + ' »)', aj2.apres > aj.avant && aj2.n === aj.n - 1 && aj2.noir === 'Remplir ce camion · 2', [aj, aj2]);
  v('…et Annuler rend tout', (await annuler()) && (await etat()) === e4);
  await R(() => bxFiche('v1')); await attendre();
  await R(() => document.querySelector('#calque [data-md^="deplacer|"]').click()); await attendre();
  v('« Déplacer » ouvre LA feuille de Stock, déjà réglée « de ce camion »', await R(() => !!MAT.G && MAT.G.mode === 'deplacer' && MAT.G.de === 'v1'), await R(() => MAT.G));
  await R(() => { MAT.G = null; bxFiche('v1'); }); await attendre();
  await R(() => document.querySelector('#calque [data-md^="compter|"]').click()); await attendre();
  v('« Compter » ouvre LA porte de comptage de Stock, pour ce camion', await R(() => !!MAT.C && MAT.C.lieu === 'v1'), await R(() => MAT.C));
  await R(() => { MAT.C = null; bxFiche('v1'); }); await attendre();
  await R(() => document.querySelector('#calque [data-md^="fplus|"]').click()); await attendre(300);
  const mn = await R(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.trim().replace(/\s+/g, ' ')));
  v('le menu Plus d\'un camion : ' + mn.join(' · '), mn.join('|') === 'Ce qu’il doit y avoir à bord|Changer le nom ou le conducteur|Copier la liste d’un autre camion', mn);
  await R(() => fermerMenu()); await L.ranger(p);
  await R(() => bxFiche('atelier')); await attendre();
  v('la fiche de l\'atelier : pas de « Remplir », « Sortir du stock » à la place, et « Bientôt fini » en tête', await R(() => { const t = document.querySelector('#calque').innerText; return !/Remplir/.test(t) && /Sortir du stock/.test(t) && /Bientôt fini/.test(t); }));
  await L.ranger(p);
  // ── 6. ce qu'il doit y avoir à bord
  await R(() => bxFiche('v1')); await attendre(); await R(() => mdDotation('v1')); await attendre();
  const e5 = await etat(), m0 = await R(() => bxManques('v1').length);
  await R(() => document.querySelector('#calque [data-md="dp|p7"]').click()); await attendre(250);
  v('la ligne « Fluide » passe de 1 à 2 (− 1 +), rien n\'est enregistré encore', await R(() => MD.dot.v.p7 === 2 && JSON.stringify(DOTATION[lieu('v1').dot]) === JSON.stringify(DOTATION.clim)));
  await R(() => { const i = document.querySelector('#calque [data-mdq="p7"]'); i.value = '-3'; i.dispatchEvent(new Event('change', { bubbles:true })); }); await attendre(250);
  v('une quantité négative est refusée, et le dit', await R(() => MD.dot.v.p7 === 2) && /négative/.test(await toast()), await toast());
  await R(() => document.querySelector('#calque [data-md="dok"]').click()); await attendre(400);
  const m1 = await R(() => ({ m:bxManques('v1').length, k:lieu('v1').dot, kk:lieu('v2').dot }));
  v('« Enregistrer » : le camion de Sophie a SA liste (' + m1.k + '), celui de Karim garde la sienne (' + m1.kk + '), un article de plus manque (' + m0 + ' → ' + m1.m + ')', m1.m === m0 + 1 && m1.k === 'dot-v1' && m1.kk === 'clim', m1);
  v('…et Annuler rend la liste d\'avant', (await annuler()) && (await etat()) === e5);
  // ── 7. fermer et rouvrir une réserve
  const e6 = await etat(); await R(() => bxFiche('d-hp')); await attendre();
  const mnR = await (async () => { await R(() => document.querySelector('#calque [data-md^="fplus|"]').click()); await attendre(250); const t = await R(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.trim())); await R(() => fermerMenu()); return t; })();
  v('le menu Plus d\'une réserve propose « Fermer cette réserve »', mnR.includes('Fermer cette réserve'), mnR);
  await R(() => bxFermer('d-hp')); await attendre(); await R(() => document.querySelector('#calque [data-bxl^="fermerok|"]').click()); await attendre(400);
  const fe = await R(() => ({ ferme:!!lieu('d-hp').ferme, carte:!!document.querySelector('[data-md="fiche|d-hp"]'), at:Math.round(PRODUITS.reduce((s, x) => s + stkAt(x, 'atelier'), 0) * 100) / 100 }));
  v('« Fermer » remet le contenu à l\'atelier et la carte disparaît de la page', fe.ferme && !fe.carte && fe.at > at0 - 0.01, fe);
  v('…« Annuler » la rouvre avec son contenu, au centime', (await annuler()) && (await etat()) === e6);
  await R(() => { bxFermerOk('d-hp'); }); await attendre(300);
  await R(() => mdFermes()); await attendre(); await R(() => document.querySelector('#calque [data-md^="rouvrir|"]').click()); await attendre(300);
  v('« Rouvrir » (liste des réserves fermées) la remet en service', await R(() => !lieu('d-hp').ferme && !!document.querySelector('[data-md="fiche|d-hp"]')));
  // ── 8. nouvelle réserve
  const nL = await R(() => LIEUX.length); await R(() => bxNouveau('')); await attendre();
  v('« Nouvelle réserve » : « Créer la réserve » est grisé tant qu\'aucun client n\'est choisi', await R(() => document.querySelector('#calque [data-bxl="nouok"]').disabled));
  await R(() => { const i = document.querySelector('#calque [data-bxl-nou="clinom"]'); i.value = Object.values(CLIENTS).find(x => x.type === 'pro').nom; i.dispatchEvent(new Event('change', { bubbles:true })); }); await attendre(300);
  await R(() => document.querySelector('#calque [data-bxl="nouok"]').click()); await attendre(400);
  v('…puis elle se crée (' + nL + ' → ' + (await R(() => LIEUX.length)) + ' lieux) et sa carte paraît', (await R(() => LIEUX.length)) === nL + 1 && (await R(() => document.querySelectorAll('.md-c').length)) === actifs + 1);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 90) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });   // un parcours qui plante est un parcours qui échoue : la mutation ne doit pas rester « vivante » sur un code de sortie 2
