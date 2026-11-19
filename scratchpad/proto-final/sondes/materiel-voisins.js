// Matériel, étape 5 (lot 5 : voisins et guides) — ce que les écrans d'à côté disent du matériel, joué pour de bon :
//  · l'ACCUEIL : la carte « Matériel » (une ligne par chose, quatre au plus, chaque nombre égal à celui de SA rubrique, aucun préfixe « BC- »), plus de ligne « Stock » dans « À faire maintenant » ;
//  · la FICHE D'INTERVENTION : chaque pièce prévue porte UNE pastille (Prête / En route / À commander), « Commander » agit (une demande de plus, le chiffre « à commander » monte de 1),
//    le technicien voit la pastille mais jamais le bouton ; la création d'une intervention choisit ses pièces par RECHERCHE et enregistre leur `pid` ;
//  · le PLANNING et les tâches : la pastille « Pièces » reprend les mêmes trois mots ;
//  · le GUIDE des nouveautés : la carte « Le matériel, refait » (quatre lignes, chacune ouvre son écran, seulement ce que la personne peut ouvrir).
// Chaque contrôle compte d'abord sa population (un ensemble vide passe au vert sur tout). Usage : node materiel-voisins.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac';
  const NB = s => String(s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
  // ───────── Marc (gérant)
  const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), attendre = ms => p.waitForTimeout(ms || 300);
  await L.aller(p, 'accueil'); await L.calme(p, 500);
  const A = await R(() => { const k = document.querySelector('[data-vis="accueil-materiel"]'); return k ? { titre:k.querySelector('h3').textContent, lignes:[...k.querySelectorAll('.pdx-al')].map(b => (b.querySelector('.pdx-at') || {}).textContent), brut:k.innerText,
    nc:cmdNbACommander(), liv:COMMANDES.filter(cmdOuverte).length, retard:COMMANDES.filter(cmdOuverte).filter(o => (o.st === 'partielle' ? o.reliquat : o.prevue) < AUJ).length, env:matEnvoisAAccepter().n, cam:camionsARemplir().n, nbcam:camionsARemplir().camions.length,
    stockAfaire:[...document.querySelectorAll('#contenu .etiq-af')].map(e => e.textContent.trim()), tout:document.getElementById('contenu').innerText } : null; });
  v('population : l\'Accueil de Marc porte la carte « Matériel » avec ses lignes (' + (A && A.lignes.length) + ')', !!A && A.titre === 'Matériel' && A.lignes.length >= 3 && A.lignes.length <= 4, A && A.lignes);
  if (A) {
    v('la ligne « à commander » dit le nombre de LIGNES de panier (' + A.nc + '), le même que la tuile de Stock et le compteur de Commandes', A.lignes.some(t => t === `${A.nc} article${A.nc > 1 ? 's' : ''} à commander`), A.lignes);
    v('la ligne des livraisons dit ' + A.liv + ' attendues dont ' + A.retard + ' en retard (les commandes ouvertes, comme la tuile de Stock)', A.lignes.some(t => NB(t).startsWith(`${A.liv} livraison${A.liv > 1 ? 's' : ''} attendue${A.liv > 1 ? 's' : ''}`) && (!A.retard || NB(t).includes(`dont ${A.retard} en retard`))), A.lignes);
    v('la ligne des envois dit ' + A.env + ' « à accepter » (la fonction qui nourrit le bandeau de Stock)', A.lignes.some(t => t === `${A.env} envoi${A.env > 1 ? 's' : ''} à accepter`), A.lignes);
    v('la ligne des camions dit ' + A.cam + ' articles dans ' + A.nbcam + ' camions (les articles, pas les camions : la règle de Stock et de Dépôts)', A.lignes.some(t => NB(t) === `${A.cam} articles manquent dans ${A.nbcam} camions`), A.lignes);
    v('aucun numéro de commande avec son préfixe « BC- » ni l\'ancien titre « Achats à traiter » à l\'écran', !/\bBC-\d|\bBR-\d|Achats à traiter/.test(A.tout), A.tout.match(/BC-\S+|Achats à traiter/));
    v('« À faire maintenant » n\'a plus de ligne « Stock » (le doublon de la carte « Matériel »)', A.stockAfaire.length === 0 || !A.stockAfaire.includes('Stock'), A.stockAfaire);
  }
  // chaque ligne mène à SA rubrique
  const mene = async (i, h1, plus) => { await L.aller(p, 'accueil'); await L.calme(p, 400); const ok = await L.toucher(c, `[data-vis="accueil-materiel"] .pdx-al >> nth=${i}`); await L.calme(p, 600); return { ok, h1:await R(() => (document.querySelector('#contenu h1') || {}).textContent || ''), vue:await R(() => typeof prVue === 'string' ? prVue : '') }; };
  if (A) {
    const nl = A.lignes;
    const m0 = await mene(nl.findIndex(t => /à commander$/.test(t)), 'Fournisseurs, matériel & produits'); v('la ligne « à commander » ouvre Fournisseurs sur l\'onglet Commandes', m0.ok && /Fournisseurs, matériel & produits/.test(m0.h1) && m0.vue === 'commandes', m0);
    const m1 = await mene(nl.findIndex(t => /livraison/.test(t))); v('la ligne des livraisons ouvre Fournisseurs sur l\'onglet Commandes', m1.ok && /Fournisseurs/.test(m1.h1) && m1.vue === 'commandes', m1);
    const m2 = await mene(nl.findIndex(t => /envoi/.test(t))); v('la ligne des envois ouvre Stock', m2.ok && m2.h1 === 'Stock', m2);
    const m3 = await mene(nl.findIndex(t => /camion/.test(t))); v('la ligne des camions ouvre Dépôts et camions', m3.ok && /Dépôts et camions/.test(m3.h1), m3);
  }
  // la ligne disparaît quand la chose est faite (les nombres suivent les données)
  await L.aller(p, 'accueil'); await R(() => { window.__e = MVTS_ATT.splice(0); rendre(); }); await L.calme(p, 300);
  v('plus aucun envoi à accepter : la ligne s\'efface (la carte ne ment pas)', await R(() => ![...document.querySelectorAll('[data-vis="accueil-materiel"] .pdx-at')].some(e => /envoi/.test(e.textContent))));
  await R(() => { MVTS_ATT.push(...window.__e); rendre(); });

  // ───────── la fiche d'intervention
  const inter = await R(() => { const i = INTS.find(o => o.id === 'i2'); return { id:i.id, prevues:i.prevues, tech:i.tech }; });
  await L.aller(p, 'inter-x-' + inter.id); await L.calme(p, 500);
  const F1 = await R(() => { const k = document.querySelector('[data-vis="inter-pieces"]'); const car = k && k.closest('.carte'); return car ? { lignes:[...car.querySelectorAll('.pp-l')].map(l => ({ nom:l.querySelector('label').textContent.replace(/\s+/g, ' ').trim(), mot:(l.querySelector('.pp-e .st') || {}).textContent, bouton:!!l.querySelector('.pp-e .btn') })) } : null; });
  v('population : la carte « Pièces prévues » de l\'intervention de Sophie a ' + (F1 && F1.lignes.length) + ' ligne(s), chacune avec sa pastille', !!F1 && F1.lignes.length >= 1 && F1.lignes.every(l => /^(Prête|En route|À commander)/.test(l.mot || '')), F1);
  // on fabrique les trois états sur une pièce de la démonstration
  const art = await R(() => { const x = PRODUITS.find(o => !o.retire && !(o.seuil > 0) && enCommande(o) === 0 && !DEM_ACHAT.some(d => d.pid === o.id && d.etat === 'attente')); if (!x) return null; window.__av = JSON.stringify({ q:x.q, loc:x.loc || null }); x.q = 0; x.loc = {};   // « acheté au besoin » : jamais en stock, donc jamais seul dans les seuils
    return { id:x.id, nom:x.nom }; });
  v('population : un article sans aucun stock ni commande existe pour jouer « À commander » (un article acheté au besoin, mis à zéro pour l\'essai)', !!art, art);
  if (art) {
    const nc0 = await R(() => cmdNbACommander()), d0 = await R(() => DEM_ACHAT.length);
    await R(a => { const i = INTS.find(o => o.id === 'i2'); window.__prev = JSON.stringify(i.prevues); i.prevues = [...i.prevues, { nom:a.nom, q:2, pid:a.id }]; rendre(); }, art); await L.calme(p, 400);
    const F2 = await R(nom => { const car = document.querySelector('[data-vis="inter-pieces"]').closest('.carte'); const l = [...car.querySelectorAll('.pp-l')].find(e => e.textContent.includes(nom)); return l ? { mot:(l.querySelector('.pp-e .st') || {}).textContent, bouton:(l.querySelector('.pp-e .btn') || {}).textContent } : null; }, art.nom);
    v('une pièce sans stock ni commande : « À commander » et un bouton « Commander » (pour le gérant)', !!F2 && F2.mot === 'À commander' && F2.bouton === 'Commander', F2);
    const pille = await R(() => [...document.querySelectorAll('[data-vis="inter-pieces"] ~ .pp-l .st')].map(e => e.className)); // la couleur : orange pour à faire
    const cls = await R(nom => { const l = [...document.querySelectorAll('.pp-l')].find(e => e.textContent.includes(nom)); return l.querySelector('.pp-e .st').className; }, art.nom);
    v('…en orange (à faire), jamais en rouge ni en vert', /st-o/.test(cls), cls);
    await L.toucher(c, `.pp-l:has(.pp-e .btn) .pp-e .btn`); await L.calme(p, 500);
    const apres = await R(a => ({ nc:cmdNbACommander(), dem:DEM_ACHAT.length, d:DEM_ACHAT[0], mot:(() => { const l = [...document.querySelectorAll('.pp-l')].find(e => e.textContent.includes(a.nom)); return l ? { m:l.querySelector('.pp-e .st').textContent, s:(l.querySelector('.pp-e .gris') || {}).textContent, b:!!l.querySelector('.pp-e .btn.gris'), voir:!!l.querySelector('.pp-e .lien') } : null; })() }), art);
    v('« Commander » ajoute UNE demande avec l\'article (' + d0 + ' → ' + apres.dem + ') et le chiffre « à commander » monte de 1 (' + nc0 + ' → ' + apres.nc + ')', apres.dem === d0 + 1 && apres.d && apres.d.pid === art.id && apres.d.int === 'i2' && apres.nc === nc0 + 1, apres);
    v('…la ligne dit « À commander · déjà dans les commandes » et n\'offre plus de second « Commander » (jamais deux demandes pour la même pièce)', apres.mot && apres.mot.m === 'À commander' && /déjà dans les commandes/.test(apres.mot.s || '') && !apres.mot.b, apres.mot);
    // la pièce arrive : « En route · arrive … »
    await R(a => { const f = MES_FOURN[0]; const dem = DEM_ACHAT.find(d => d.pid === a.id); DEM_ACHAT.splice(DEM_ACHAT.indexOf(dem), 1); const x = PRODUITS.find(o => o.id === a.id); COMMANDES.push({ id:'cx-sonde', num:'BC-2026-999', four:x.four, st:'confirmee', env:jour(-1), prevue:jour(3), lignes:[{ pid:x.id, nom:null, ref:x.ref, u:x.u, q:2, pu:x.pa || 1, tva:20, recu:0 }], journal:[] }); rendre(); }, art); await L.calme(p, 400);
    const F3 = await R(nom => { const l = [...document.querySelectorAll('.pp-l')].find(e => e.textContent.includes(nom)); return l ? { mot:l.querySelector('.pp-e .st').textContent, cls:l.querySelector('.pp-e .st').className, sous:(l.querySelector('.pp-e .gris') || {}).textContent, bouton:!!l.querySelector('.pp-e .btn') } : null; }, art.nom);
    v('la pièce est dans une commande confirmée : « En route · arrive <jour> » en bleu, et la commande citée SANS préfixe', !!F3 && /^En route · arrive (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d+$/.test(F3.mot) && /st-b/.test(F3.cls) && /^commande 2026-999$/.test(F3.sous) && !F3.bouton, F3);
    // la pièce est en stock : « Prête »
    await R(a => { COMMANDES.splice(COMMANDES.findIndex(o => o.id === 'cx-sonde'), 1); const x = PRODUITS.find(o => o.id === a.id); window.__q = x.q; x.q = 5; rendre(); }, art); await L.calme(p, 300);
    const F4 = await R(nom => { const l = [...document.querySelectorAll('.pp-l')].find(e => e.textContent.includes(nom)); return l ? { mot:l.querySelector('.pp-e .st').textContent, cls:l.querySelector('.pp-e .st').className, sous:(l.querySelector('.pp-e .gris') || {}).textContent } : null; }, art.nom);
    v('la pièce est à l\'atelier : « Prête » en vert, avec où elle est', !!F4 && F4.mot === 'Prête' && /st-v/.test(F4.cls) && /atelier/.test(F4.sous || ''), F4);
    await R(a => { const x = PRODUITS.find(o => o.id === a.id), o0 = JSON.parse(window.__av); x.q = o0.q; x.loc = o0.loc || undefined; INTS.find(o => o.id === 'i2').prevues = JSON.parse(window.__prev); rendre(); }, art);
  }
  // ───────── la création d'une intervention : les pièces se CHOISISSENT par recherche, et l'enregistrement garde l'article (pid)
  await L.aller(p, 'planning'); await L.calme(p, 400); await R(() => { ouvrirCreation({ cli:'md' }); }); await L.calme(p, 700);
  const W0 = await R(() => ({ ouvert:!!document.querySelector('#fenetre [data-vis="crea-pieces"]'), puces:document.querySelectorAll('#fenetre [data-vis="crea-pieces"] [data-cpq]').length, champ:!!document.querySelector('#fenetre [data-cchamp="cpq"]'), taille:parseFloat(getComputedStyle(document.querySelector('#fenetre [data-cchamp="cpq"]') || document.body).fontSize) }));
  v('population : la fenêtre « Nouvelle intervention » propose des pièces à prévoir (' + W0.puces + ') ET un champ de recherche (police ' + W0.taille + ' px, pas de zoom sur iPhone)', W0.ouvert && W0.puces >= 4 && W0.champ && W0.taille >= 16, W0);
  await p.fill('#fenetre [data-cchamp="cpq"]', 'condens'); await L.calme(p, 300);
  const W1 = await R(() => [...document.querySelectorAll('#cp-res [data-cpq]')].map(b => b.dataset.cpq.split('|')[0]));
  v('la recherche « condens » propose les articles qui s\'appellent ainsi (' + W1.length + ') — sans accent, tous les mots', W1.length >= 1 && W1.every(n => /condens/i.test(n)), W1);
  await p.fill('#fenetre [data-cchamp="cpq"]', 'zzzzzz'); await L.calme(p, 300);
  v('rien trouvé : une phrase qui dit quoi faire, jamais une zone vide', /Aucun article ne s.appelle\s*.\s*zzzzzz/.test(await R(() => document.getElementById('cp-res').textContent)));
  await p.fill('#fenetre [data-cchamp="cpq"]', 'condens'); await L.calme(p, 300);
  const choisi = W1[0]; await L.toucher(c, '#cp-res [data-cpq] >> nth=0'); await L.calme(p, 400);
  const W2 = await R(() => ({ chips:[...document.querySelectorAll('#fenetre [data-vis="crea-pieces"] .puce-c[aria-pressed="true"]')].map(e => e.textContent.replace(/[−＋]/g, '').trim()), q:CREA.prevues, champ:document.querySelector('#fenetre [data-cchamp="cpq"]').value }));
  v('toucher un résultat le choisit (« ' + choisi + ' × 1 ») et la recherche garde sa frappe (' + W2.champ + ')', W2.chips.some(t => t.startsWith(choisi)) && W2.q[choisi] === 1 && W2.champ === 'condens', W2);
  const n0 = await R(() => INTS.length);
  await R(() => ACTIONS_CREA.cPlusTot()); await L.calme(p, 500);   // « Au plus tôt » pose le brouillon sur le planning (il entre dans INTS) ; « Créer l'intervention » le finalise
  await R(() => ACTIONS_CREA.cCreer({ dataset:{} })); await L.calme(p, 600);
  const N = await R(() => { const i = INTS[INTS.length - 1]; return { n:INTS.length, prevues:i.prevues, art:i.prevues && i.prevues[0] ? (PRODUITS.find(x => x.id === i.prevues[0].pid) || {}).nom : null }; });
  v('« Créer l\'intervention » enregistre la pièce AVEC son article (pid) : ' + JSON.stringify(N.prevues) + ' (' + n0 + ' → ' + N.n + ' interventions)', N.n === n0 + 1 && N.prevues && N.prevues.length === 1 && N.prevues[0].nom === choisi && !!N.prevues[0].pid && N.art === choisi, N);
  await R(() => { INTS.pop(); rendre(); });
  // ───────── la recherche du menu (⌘K) propose aussi les ARTICLES : « R32 » → « Fluide R32 · 7,5 kg · atelier 5, Sophie 2,5 » → sa fiche
  if (c.doigt) v('la recherche du menu (⌘K) est une affaire de clavier : elle n\'existe pas au doigt (téléphone, tablette), rien à vérifier ici', !(await R(() => typeof rcBureau === 'function' && rcBureau())));
  else {
  await L.aller(p, 'accueil'); await R(() => palOuvrir()); await L.calme(p, 300); await p.fill('#pal-q', 'r32'); await L.calme(p, 300);
  const P1 = await R(() => ({ groupes:[...document.querySelectorAll('#pal .pal-g')].map(e => e.textContent), lignes:[...document.querySelectorAll('#pal .pal-i')].map(e => ({ nom:e.querySelector('b').textContent, d:(e.querySelector('small') || {}).textContent || '' })) }));
  v('population : taper « r32 » dans la recherche du menu trouve un groupe « Articles » (' + P1.lignes.length + ' lignes)', P1.groupes.includes('Articles') && P1.lignes.some(l => /R32/.test(l.nom)), P1);
  const art32 = P1.lignes.find(l => /R32/.test(l.nom));
  v('la ligne dit combien et où, sans aucun prix : « ' + (art32 && art32.nom) + ' · ' + (art32 && art32.d) + ' »', !!art32 && /\d.*kg/.test(art32.d) && /atelier \d/i.test(art32.d) && !/€/.test(art32.d), art32);
  await R(() => { const b = [...document.querySelectorAll('#pal .pal-i')].find(e => /R32/.test(e.textContent)); b.click(); }); await L.calme(p, 500);
  v('la choisir ouvre la fiche de l\'article', /R32/.test(await R(() => (document.querySelector('#calque .panneau h2') || {}).textContent || '')), await R(() => (document.querySelector('#calque .panneau') || {}).innerText));
  await L.ranger(p); await R(() => palOuvrir()); await L.calme(p, 250);
  v('sans frappe, la recherche ne noie pas les rubriques sous 29 articles (le groupe « Articles » attend une frappe)', !(await R(() => [...document.querySelectorAll('#pal .pal-g')].some(e => e.textContent === 'Articles'))));
  await R(() => palFermer(true));
  }
  v('aucune erreur de page (gérant)', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);

  // ───────── la technicienne : la pastille oui, le bouton « Commander » et tout prix non
  const ct = await L.ouvrir({ profil, qui:'sm' }), q = ct.p;
  await L.aller(q, 'inter-x-i2'); await L.calme(q, 500);
  // une pièce À COMMANDER sur sa fiche : elle voit la pastille, jamais le bouton « Commander »
  await q.evaluate(() => { const x = PRODUITS.find(o => !o.retire && !(o.seuil > 0) && enCommande(o) === 0); x.q = 0; x.loc = {}; INTS.find(o => o.id === 'i2').prevues.push({ nom:x.nom, q:2, pid:x.id }); rendre(); }); await L.calme(q, 400);
  const T1 = await q.evaluate(() => { const car = (document.querySelector('[data-vis="inter-pieces"]') || {}).closest ? document.querySelector('[data-vis="inter-pieces"]').closest('.carte') : null; return car ? { pastilles:[...car.querySelectorAll('.pp-e .st')].map(e => e.textContent), boutons:car.querySelectorAll('.pp-e .btn, .pp-e .lien').length, euros:/€/.test(car.innerText) } : null; });
  v('population : la technicienne voit la carte des pièces prévues avec ' + (T1 && T1.pastilles.length) + ' pastille(s)', !!T1 && T1.pastilles.length >= 1, T1);
  v('population : sa fiche porte une pièce « À commander » (' + (T1 && T1.pastilles.join(' · ')) + ')', !!T1 && T1.pastilles.includes('À commander'), T1);
  v('…elle n\'a ni « Commander » ni « Voir » (elle demande une pièce, elle n\'en commande pas), ni aucun prix', !!T1 && T1.boutons === 0 && !T1.euros, T1);
  v('aucune erreur de page (technicienne)', ct.err.length === 0, ct.err.slice(0, 3));
  await L.fin(ct);

  // ───────── Julie (bureau) : la carte « Matériel » sans Stock ni Dépôts
  const cj = await L.ouvrir({ profil, qui:'julie' }), j = cj.p;
  await L.aller(j, 'accueil'); await L.calme(j, 500);
  // le bureau n'a pas d'Accueil (son écran d'ouverture est la Comptabilité) : la carte ne s'écrit pas, et ce que la fonction rendrait ne contient jamais Stock ni Dépôts
  const J = await j.evaluate(() => ({ route:location.hash, carte:!!document.querySelector('[data-vis="accueil-materiel"]'), lignes:matAFaire().map(o => o.t + ' · ' + o.rub), nc:cmdNbACommander(), menu:document.getElementById('menu').innerText.replace(/[\u00a0\u202f]/g, ' ') }));
  // « Voir » décide seule (équipe-11, MENU-FINAL.md) : le Secrétariat a Dépôts et camions, la ligne des camions est donc permise — mais JAMAIS un lien vers une rubrique que son menu n'a pas, ni « envois à accepter » (case à lui donner)
  const rubDe = t => t.split(' · ').pop();
  v('Julie : la fonction de la carte ne mène qu\'à des rubriques de son menu (' + J.lignes.length + ' lignes), jamais « envois à accepter »', J.lignes.length >= 1 && !J.lignes.some(t => /envoi/.test(t)) && J.lignes.every(t => /^(Commandes|Fournisseurs)$/.test(rubDe(t)) ? /Fournisseurs, matériel/.test(J.menu) : J.menu.includes(rubDe(t))) && J.lignes.some(t => /· (Fournisseurs|Commandes)$/.test(t)), J);
  v('Julie : elle n\'a pas d\'Accueil, donc aucune carte « Matériel » flottante sur son écran d\'ouverture (' + J.route + ')', !J.carte, J);
  v('aucune erreur de page (bureau)', cj.err.length === 0, cj.err.slice(0, 3));
  await L.fin(cj);

  // ───────── le guide des nouveautés (refait le 17 novembre : une carte par écran, « Voir » l'ouvre ; la sonde guide-voir.js joue chaque « Voir »)
  for (const [qui, attendu, absent] of [['marc', ['stock'], ['camion']], ['julie', ['produits'], ['stock', 'camion']], ['sm', ['camion'], ['stock', 'produits']]]) {
    const cg = await L.ouvrir({ profil, qui, guide:true }), g = cg.p;
    await g.evaluate(() => { try { nvOuvrir(); } catch (e) {} }); await L.calme(g, 500);
    const K = await g.evaluate(() => NV ? NV.pages.map(p => p.k) : []);
    v('guide (' + qui + ') : il porte la carte du matériel de cette personne (' + attendu.join(', ') + ') et rien de ce qu\'elle ne peut pas ouvrir (' + K.join(', ') + ')', attendu.every(k => K.includes(k)) && absent.every(k => !K.includes(k)), K);
    v('guide (' + qui + ') : aucune erreur de page', cg.err.length === 0, cg.err.slice(0, 3));
    await L.fin(cg);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
