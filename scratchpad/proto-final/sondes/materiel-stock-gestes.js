// Matériel, étape 2 (Stock) — les gestes du gérant et du bureau, COMPTÉS au toucher et JOUÉS de bout en bout (vrais clics, vrai stock, vrai « Annuler »).
// Un geste = un toucher ou un clic ; les saisies et le choix dans une liste ne comptent pas. Chaque geste doit ABOUTIR : le chiffre relu avant/après change comme prévu,
// et « Annuler » rend l'état d'avant (stock, lignes de journal, numéro de bon, achats).
// Usage : node materiel-stock-gestes.js [profil]  (mac par défaut)  → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, tel = !!c.doigt; let n = 0;
  const T = async (s, o) => { n++; const ok = await L.toucher(c, s, o); if (ok === false) throw new Error('cible non atteinte : ' + s); };
  const NB = x => typeof x === 'string' ? x.replace(/[\u00a0\u202f]/g, ' ') : Array.isArray(x) ? x.map(NB) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, NB(y)])) : x;   // la typographie française met des espaces insécables avant « : » « ? » « » »
  const R = async (f, a) => NB(await p.evaluate(f, a)), zero = () => { n = 0; };
  const retour = async () => { await L.ranger(p); await L.aller(p, 'stock'); await L.calme(p, 250); zero(); };
  const sig = () => R(() => ({ s:sxSig(), att:MVTS_ATT.length, mv:MVTS.length, br:brNum, ach:ACHATS.length, q:PRODUITS.map(x => x.id + ':' + x.q + ':' + JSON.stringify(x.loc || {})).join('|') }));
  const annuler = async () => { await T('#toast button:has-text("Annuler")'); await L.calme(p, 400); };
  await retour();
  const pop = await R(() => document.querySelectorAll('.ms-l').length);
  v('population : la page Stock montre ses lignes d\'articles (' + pop + ')', pop >= 20);

  // GESTE 2 — savoir où est un article : le curseur est déjà dans la recherche (ordinateur) ; sur téléphone, 1 toucher
  if (!tel) { const act = await R(() => document.activeElement && document.activeElement.id); v('geste 2 · ordinateur : le curseur est déjà dans la recherche (0 toucher)', act === 'ms-q', act); }
  else { await T('#ms-q'); }
  await p.fill('#ms-q', 'filtre'); await L.calme(p, 500);
  const g2 = await R(() => [...document.querySelectorAll('.ms-l')].map(e => e.textContent.replace(/\s+/g, ' ')));
  v('geste 2 · la frappe « filtre » ne laisse que des filtres, chacun avec ses lieux et sa quantité', g2.length >= 1 && g2.every(t => /filtre/i.test(t)) && g2.every(t => /(Atelier|Sophie|Karim|Léa|Tom|Réserve)/.test(t)), g2);
  await p.fill('#ms-q', 'xyzzy'); await L.calme(p, 400);
  const vide = await R(() => (document.querySelector('.ms-vide') || {}).textContent || '');
  v('geste 2 · recherche sans résultat : « Rien trouvé pour « xyzzy » » et le geste d\'ajouter', /Rien trouvé pour « xyzzy »/.test(vide) && /Ajouter « xyzzy »/.test(vide), vide.replace(/\s+/g, ' '));
  await p.fill('#ms-q', ''); await L.calme(p, 300);

  // GESTE 4 — accepter ce que les techniciens ont pris : « Tout accepter » = 1 toucher depuis la page (menu : 2 sur ordinateur, 3 sur téléphone)
  await retour(); const a0 = await sig();
  v('population : le bandeau annonce les envois à accepter (' + a0.att + ')', a0.att >= 2 && await R(() => !!document.querySelector('.ms-bandeau')));
  await T('.ms-bandeau [data-ms="toutacc"]'); await L.calme(p, 400);
  const a1 = await sig(), toast = await R(() => (document.getElementById('toast') || {}).textContent || '');
  v('geste 4 · accepter : 1 toucher depuis la page (' + n + ' ; 2 avec le menu sur ordinateur, 3 sur téléphone), les envois passent dans le journal', n === 1 && a1.att === 0 && a1.mv === a0.mv + a0.att, [a0.att, a1.att, a0.mv, a1.mv]);
  v('… et le message dit « envois acceptés » avec Annuler', /envois? accept/.test(toast) && /Annuler/.test(toast), toast);
  v('… et le bandeau a disparu', !(await R(() => !!document.querySelector('.ms-bandeau'))));
  await annuler(); const a2 = await sig();
  v('… et « Annuler » rend l\'état d\'avant AU DÉTAIL (stock, envois en attente, journal)', a2.q === a0.q && a2.att === a0.att && a2.mv === a0.mv, [a2.att, a0.att]);

  // « Voir » → feuille « Envois à accepter » : une phrase par envoi, « Accepter » et « Refuser » par ligne
  await retour(); await T('.ms-bandeau [data-ms="envois"]'); await L.calme(p, 400);
  const f1 = await R(() => { const P = document.querySelector('#calque .panneau'); return { h2:P && P.querySelector('h2').textContent, nb:P ? P.querySelectorAll('.ms-ev').length : 0, txt:P ? P.querySelector('.ms-envois').textContent.replace(/\s+/g, ' ') : '', acc:P ? P.querySelectorAll('[data-ms^="acc|"]').length : 0, ref:P ? P.querySelectorAll('[data-ms^="ref|"]').length : 0 }; });
  v('« Voir » : la feuille « Envois à accepter » dit chaque envoi en PHRASE avec ce qui restera', f1.h2 === 'Envois à accepter' && f1.nb >= 2 && /a pris .* à l’atelier pour son camion/.test(f1.txt) && /il en restera \d/.test(f1.txt) && f1.acc === f1.nb && f1.ref === f1.nb, f1);
  const m0 = await sig(); await T('#calque [data-ms^="ref|"]'); await L.calme(p, 300);
  v('« Refuser » ouvre une mini-feuille « Pourquoi ? » avec trois réponses rapides', await R(() => [...document.querySelectorAll('#calque .puce-c')].map(e => e.textContent).join('|')) === 'Trop cher|Pas cette semaine|On en a déjà');
  await T('#calque [data-ms="rok|' + (await R(() => MVTS_ATT[0].id)) + '"]'); await L.calme(p, 300);
  v('… refuser sans dire pourquoi est refusé, et le stock ne bouge pas', (await sig()).att === m0.att);
  await T('#calque .puce-c:has-text("Trop cher")'); await T('#calque [data-ms^="rok|"]'); await L.calme(p, 400);
  const m1 = await sig(), q1 = await R(() => SX.refus.length && SX.refus[0].motif);
  v('… avec « Trop cher » le refus part, le stock ne bouge pas, le technicien reçoit le motif', m1.att === m0.att - 1 && m1.q === m0.q && q1 === 'Trop cher', [m0.att, m1.att, q1]);
  await annuler(); v('… et Annuler le remet à accepter', (await sig()).att === m0.att);

  // SORTIR pour un collègue : 6 touchers (menu/maj, Sortir du stock, l'article, Un collègue, [collègue], Noter) — chaque geste ABOUTIT
  await retour(); const s0 = await sig(); const cible = await R(() => PRODUITS.find(x => x.id === 'p27').q);
  await T('[data-ms="maj"]'); await L.calme(p, 300);
  v('« Mettre à jour le stock » ouvre « Que veux-tu faire ? » avec QUATRE lignes', await R(() => document.querySelector('#calque h2').textContent.replace(/\u00a0/g, ' ') === 'Que veux-tu faire ?' && document.querySelectorAll('#calque .ms-q').length === 4));
  await T('#calque [data-ms="q|sortir"]'); await L.calme(p, 300);
  await p.fill('#msg-q', 'gants'); await L.calme(p, 300); await T('#calque [data-ms^="gajoute|"]'); await L.calme(p, 300);
  await T('#calque [data-ms="gpour|collegue"]'); await L.calme(p, 300);
  const dis = await R(() => document.querySelector('#calque [data-ms="genvoyer"]').disabled), pb = await R(() => (document.querySelector('#calque .mat-pourquoi') || {}).textContent);
  v('le bouton est grisé et dit POURQUOI tant que le collègue n\'est pas choisi', dis && /collègue/.test(pb || ''), pb);
  await p.selectOption('#calque [data-msg="collegue"]', 'lr'); await L.calme(p, 300);
  const ph = await R(() => (document.querySelector('#calque .mat-phrase') || {}).textContent);
  v('une phrase de contrôle dit ce qu\'on va noter', /^Tu notes : .* sorti.* de l’atelier, pour Léa\.$/.test(ph || ''), ph);
  const lib = await R(() => document.querySelector('#calque [data-ms="genvoyer"]').textContent);
  await T('#calque [data-ms="genvoyer"]'); await L.calme(p, 400);
  const s1 = await sig(), tx = await R(() => (document.getElementById('toast') || {}).textContent || '');
  v('sortir pour un collègue : ' + n + ' touchers (Mettre à jour, Sortir, l\'article, Un collègue, Noter = 5 + le choix du collègue), le bouton disait « ' + lib + ' »', n <= 6 && /^Noter : j’ai sorti/.test(lib), [n, lib]);
  v('… le stock baisse, une ligne de journal et UN bon de remise naissent', s1.mv === s0.mv + 1 && s1.br === s0.br + 1 && s1.q !== s0.q, [s0.mv, s1.mv, s0.br, s1.br]);
  v('… le message dit « Sorti » et le numéro du bon SANS préfixe BR-, avec Annuler', /Sorti/.test(tx) && /bon de remise 2026-0\d+/.test(tx) && !/BR-/.test(tx) && /Annuler/.test(tx), tx);
  await annuler(); const s2 = await sig();
  v('… « Annuler » rend le stock, le journal ET le numéro de bon d\'avant', s2.q === s0.q && s2.mv === s0.mv && s2.br === s0.br, [s2.br, s0.br]);

  // RANGER un achat au comptoir : le ticket va dans les achats, Annuler le retire
  await retour(); const r0 = await sig();
  await T('[data-ms="maj"]'); await T('#calque [data-ms="q|ranger"]'); await L.calme(p, 300); await T('#calque [data-ms="gorig|comptoir"]'); await L.calme(p, 300);
  await p.fill('#msg-q', 'gants'); await L.calme(p, 300); await T('#calque [data-ms^="gajoute|"]'); await L.calme(p, 300);
  await p.fill('#calque [data-msg="montant"]', '18,50'); await T('#calque [data-ms="genvoyer"]'); await L.calme(p, 400);
  const r1 = await sig();
  v('ranger un achat au comptoir : le stock monte, une ligne naît, le ticket de 18,50 € entre dans les achats', r1.mv === r0.mv + 1 && r1.ach === r0.ach + 1 && await R(() => ACHATS[ACHATS.length - 1].ht === 18.5), [r0.ach, r1.ach]);
  await annuler(); const r2 = await sig(); v('… « Annuler » retire aussi le ticket des achats et rend le stock', r2.ach === r0.ach && r2.q === r0.q && r2.mv === r0.mv, [r2.ach, r0.ach]);

  // DÉPLACER de l'atelier vers un camion
  await retour(); const d0 = await sig();
  await T('[data-ms="maj"]'); await T('#calque [data-ms="q|deplacer"]'); await L.calme(p, 300);
  await p.fill('#msg-q', 'gants'); await L.calme(p, 300); await T('#calque [data-ms^="gajoute|"]'); await L.calme(p, 300); await T('#calque [data-ms="genvoyer"]'); await L.calme(p, 400);
  const d1 = await sig(); v('déplacer : une ligne de journal « transfert », le total ne change pas, les lieux changent', d1.mv === d0.mv + 1 && await R(() => MVTS[0].type === 'transfert'), [d0.mv, d1.mv]);
  await annuler(); v('… « Annuler » rend l\'état d\'avant', (await sig()).q === d0.q);

  // COMPTER : Plus › Compter un lieu › le lieu › un écart › Enregistrer
  await retour(); const k0 = await sig();
  await T('[data-ms="plus"]'); await L.calme(p, 250); await T('.ctx button:has-text("Compter un lieu")'); await L.calme(p, 300);
  await T('#calque [data-ms="cpt|atelier"]'); await L.calme(p, 400);
  const lignes = await R(() => document.querySelectorAll('#calque .mat-l').length);
  const pid0 = await R(() => document.querySelector('#calque [data-mscq]').dataset.mscq);
  await T('#calque [data-ms="cmoins|' + pid0 + '"]'); await L.calme(p, 300);
  const phr = await R(() => document.querySelector('#calque .ms-cliste .mc-o') && document.querySelector('#calque .ms-cliste .mc-o').textContent);
  v('compter : l\'écart se dit en PHRASE (« … de moins que prévu »)', /de moins que prévu/.test(phr || ''), phr);
  await T('#calque [data-ms="cok"]'); await L.calme(p, 400);
  const k1 = await sig();
  v('compter l\'atelier (' + lignes + ' lignes) : une correction est tracée, affichée « écart de comptage »', k1.mv === k0.mv + 1 && await R(() => MVTS[0].type === 'correction'), [k0.mv, k1.mv]);
  await annuler(); v('… « Annuler » rend le stock d\'avant', (await sig()).q === k0.q);

  // FICHE d'un article : une seule fenêtre, la réponse d'abord ; prix ; seuil ; Annuler
  await retour(); await p.fill('#ms-q', 'condensateur'); await L.calme(p, 400); await T('.ms-l'); await L.calme(p, 400);
  const fi = await R(() => { const P = document.querySelector('#calque .panneau'); return { big:P && P.querySelector('.ms-big') && P.querySelector('.ms-big').textContent.replace(/\s+/g, ' '), h3:P ? [...P.querySelectorAll('h3')].map(e => e.textContent) : [], acc:P ? [...P.querySelectorAll('summary')].map(e => e.textContent) : [], boutons:P ? [...P.querySelectorAll('.ms-boutons .btn')].map(e => e.textContent) : [] }; });
  v('la fiche d\'un article ouvre sur LA réponse (« Il en reste … »), le prix, et trois sections repliées', /^Il en reste/.test(fi.big || '') && fi.h3.includes('Prix') && fi.acc.join('|') === 'Où il est|Derniers gestes|Dans tes documents', fi);
  await T('#calque [data-ms^="fprixo|"]'); await p.fill('#calque [data-msf="pa"]', '50'); const pa0 = await R(() => PRODUITS.find(x => /Condensateur 5/.test(x.nom)).pa); await T('#calque [data-ms^="fprix|"]'); await L.calme(p, 400);
  const pa1 = await R(() => PRODUITS.find(x => /Condensateur 5/.test(x.nom)).pa);
  v('changer un prix : le prix d\'achat passe à 50, et la hausse se dit en toutes lettres', pa1 === 50 && /de plus qu’avant|de moins qu’avant/.test(await R(() => (document.querySelector('#calque .ms-haus') || {}).textContent || '')), [pa0, pa1]);
  await annuler(); v('… « Annuler » rend le prix d\'avant', (await R(() => PRODUITS.find(x => /Condensateur 5/.test(x.nom)).pa)) === pa0);

  // REGISTRE : Plus › Registre des fluides = 2 touchers depuis Stock (3 avec la page), une ligne de totaux PAR fluide
  await retour(); await T('[data-ms="plus"]'); await L.calme(p, 250); await T('.ctx button:has-text("Registre des fluides")'); await L.calme(p, 400);
  const rg = await R(() => ({ h2:document.querySelector('#calque h2').textContent, tot:[...document.querySelectorAll('#calque .carte:first-of-type .ligne, #calque .carte .ligne')].map(e => e.textContent.replace(/\s+/g, ' ')).slice(0, 4) }));
  v('registre des fluides : ' + n + ' touchers, une ligne de totaux par fluide (R32 et R410A séparés)', n === 2 && rg.h2 === 'Registre des fluides' && rg.tot.some(t => /R32/.test(t)) && rg.tot.some(t => /R410A/.test(t)), rg);

  // JOURNAL : l'onglet, la recherche, le filtre
  await retour(); await T('[data-ms="onglet|mvts"]'); await L.calme(p, 400);
  const j = await R(() => ({ g:document.querySelectorAll('.ms-g').length, ph:[...document.querySelectorAll('.ms-ph')].slice(0, 3).map(e => e.textContent), pied:(document.querySelector('.ms-pied') || {}).textContent, jours:[...document.querySelectorAll('.ms-liste .groupe')].map(e => e.textContent) }));
  v('« Ce qui a bougé » : UNE LIGNE = UNE PHRASE (« Sophie a utilisé … chez … »), groupées par jour, avec un pied de totaux', j.g >= 8 && j.ph.every(t => /^(Marc|Julie|Sophie|Karim|Léa|Tom) a /.test(t)) && /gestes? · .* sortis/.test(j.pied || '') && j.jours.includes('Aujourd’hui') || j.jours.includes('Hier'), j);
  await p.fill('#ms-mq', 'condensateur'); await L.calme(p, 500);
  const j2 = await R(() => [...document.querySelectorAll('.ms-ph')].map(e => e.textContent));
  v('la recherche du journal garde les gestes de l\'article (' + j2.length + ')', j2.length >= 1 && j2.every(t => /ondensateur/.test(t)), j2);
  await p.fill('#ms-mq', ''); await L.calme(p, 300); await T('[data-ms="filtrer"]'); await L.calme(p, 300); await T('#calque [data-ms="pk|correction"]'); await L.calme(p, 300);
  const j3 = await R(() => ({ g:document.querySelectorAll('.ms-g').length, btn:document.querySelector('[data-ms="filtrer"]').textContent.trim(), ph:[...document.querySelectorAll('.ms-ph')].map(e => e.textContent) }));
  v('le filtre « Compté » ne garde que les comptages, et le bouton dit « Filtrer · 1 »', j3.g >= 1 && j3.ph.every(t => /a compté/.test(t)) && j3.btn === 'Filtrer · 1', j3);

  // le bureau : Stock et Fournisseurs ouverts, rien à accepter, pas de réglages ; son geste part au gérant
  await L.fin(c); const c2 = await L.ouvrir({ profil, qui:'julie' }), p2 = c2.p;
  await L.aller(p2, 'stock'); await L.calme(p2, 300);
  const ju = await p2.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, bandeau:!!document.querySelector('.ms-bandeau'), lignes:document.querySelectorAll('.ms-l').length, menu:[...document.querySelectorAll('#menu a, #menu button')].map(e => e.textContent.trim()).filter(Boolean).join('|') }));
  v('bureau (Julie) : la route Stock s\'ouvre, avec ses articles (' + ju.lignes + ')', ju.h1 === 'Stock' && ju.lignes >= 20, ju);
  v('bureau : le menu porte « Stock » et « Fournisseurs, matériel & produits », pas « Dépôts et camions »', /Stock/.test(ju.menu) && /Fournisseurs, matériel & produits/.test(ju.menu) && !/Dépôts et camions/.test(ju.menu), ju.menu);
  v('bureau : aucun bandeau « à accepter »', !ju.bandeau);
  await p2.evaluate(() => { document.querySelector('[data-ms="plus"]').click(); });
  const mj = await p2.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.trim()));
  v('bureau : le menu Plus n\'a pas « Réglages du stock »', mj.length >= 3 && !mj.some(t => /Réglages/.test(t)), mj);
  await p2.evaluate(() => { fermerMenu(); });
  const att0 = await p2.evaluate(() => MVTS_ATT.length), qb0 = await p2.evaluate(() => PRODUITS.map(x => x.q).join());
  await p2.evaluate(() => { matGOuvrir('sortir', { pid:'p27' }); MAT.G.pour = 'perdu'; MAT.G.texte = 'cassé'; matGVue(); });
  await p2.waitForTimeout(250); await p2.evaluate(() => document.querySelector('#calque [data-ms="genvoyer"]').click()); await p2.waitForTimeout(400);
  const att1 = await p2.evaluate(() => MVTS_ATT.length), qb1 = await p2.evaluate(() => PRODUITS.map(x => x.q).join()), tj = await p2.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  v('bureau : sortir passe par l\'accord du gérant (« Envoyé au gérant »), le stock ne bouge pas', att1 === att0 + 1 && qb1 === qb0 && /Envoyé au gérant/.test(tj), [att0, att1, tj]);
  await L.fin(c2);
  // le technicien n'a pas la rubrique Stock
  const c3 = await L.ouvrir({ profil, qui:'sm' }); await c3.p.evaluate(() => { location.hash = '#stock'; }); await c3.p.waitForTimeout(700);
  v('technicien : #stock ramène sur son écran d\'ouverture, sans montrer le stock', await c3.p.evaluate(() => !document.querySelector('.ms-l') && /majournee|moncamion|^$/.test(route)), await c3.p.evaluate(() => route));
  v('aucune erreur de page', [c, c2, c3].every(x => x.err.length === 0), [c, c2, c3].map(x => x.err));
  await L.fin(c3); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
