// Matériel, étape 1 (lot 0) — les PIÈCES COMMUNES, jouées dans la vraie page : un état d'article en quatre mots, UN compte de camions à remplir,
// UN compte de « à commander », UNE phrase par geste, les envois à accepter, la carte d'aide, les icônes, les montants.
// Chaque contrôle compte d'abord sa population (un ensemble vide passe au vert sur tout). Usage : node materiel-pieces.js
const L = require('../lib.js');
(async () => {
  const c = await L.ouvrir({ profil:'mac', qui:'marc' }), p = c.p, v = L.v;
  const R = (f, a) => p.evaluate(f, a);
  // ── matEtat : les quatre mots, et rien quand tout va bien ──
  const E = await R(() => { const t = (o) => { const e = matEtat(Object.assign({ id:'zz-essai', u:'u' }, o)); return e ? [e.mot, e.cls] : null; };
    const cmd = PRODUITS.find(x => enCommande(x) > 0), ec = cmd ? matEtat(cmd) : null;
    return { plus:t({ q:0, seuil:2 }), bientot:t({ q:2, seuil:2 }), bientot2:t({ q:1, seuil:3 }), besoin:t({ q:0, seuil:0 }), normal:t({ q:10, seuil:2 }), sansSeuil:t({ q:5, seuil:0 }), cmd:cmd && cmd.nom, ec:ec && [ec.mot, ec.cls], enc:cmd ? enCommande(cmd) : 0 }; });
  v('matEtat : « Plus en stock » rouge (rien en stock, un seuil)', JSON.stringify(E.plus) === JSON.stringify(['Plus en stock', 'st-r']), E.plus);
  v('matEtat : « Bientôt fini » orange (au seuil)', JSON.stringify(E.bientot) === JSON.stringify(['Bientôt fini', 'st-o']) && E.bientot2 && E.bientot2[0] === 'Bientôt fini', [E.bientot, E.bientot2]);
  v('matEtat : « Acheté au besoin » gris (jamais en stock, pas de seuil)', JSON.stringify(E.besoin) === JSON.stringify(['Acheté au besoin', 'st-g']), E.besoin);
  v('matEtat : le normal est SILENCIEUX (stock suffisant, ou du stock sans seuil)', E.normal === null && E.sansSeuil === null, [E.normal, E.sansSeuil]);
  v('matEtat : population — un article réellement en commande existe (' + E.cmd + ', ' + E.enc + ' attendus)', !!E.cmd && E.enc > 0);
  v('matEtat : « Commandé · arrive le j/m » bleu, la commande passe avant tout', !!E.ec && /^Commandé · arrive le \d{1,2}\/\d{1,2}$/.test(E.ec[0]) && E.ec[1] === 'st-b', E.ec);
  v('matEtat : « Sur commande » et « Épuisé » n’existent plus comme états', await R(() => ![matEtat({ id:'a', q:0, seuil:2, u:'u' }), matEtat({ id:'b', q:0, seuil:0, u:'u' })].some(e => /Sur commande|Épuisé/.test(e.mot))));
  // ── camionsARemplir : le camion au garage n'est NI orange NI compté ──
  const K = await R(() => { const r = camionsARemplir(), tout = LIEUX.filter(l => l.type === 'vehicule').map(l => ({ id:l.id, garage:!!bxGarage(l.id), nb:bxManques(l.id).length }));
    return { n:r.n, ids:r.camions.map(o => o.l.id), somme:r.camions.reduce((s, o) => s + o.manques.length, 0), tout, form:r.camions.every(o => o.l && Array.isArray(o.manques) && o.manques.length > 0) }; });
  const garage = K.tout.filter(o => o.garage), manquantGarage = garage.filter(o => o.nb > 0);
  v('camionsARemplir : population — un camion au garage qui a des manques existe', manquantGarage.length >= 1, K.tout);
  v('camionsARemplir : le camion au garage n’est PAS dans la liste', !K.ids.some(id => garage.some(g => g.id === id)), K.ids);
  v('camionsARemplir : n = les ARTICLES qui manquent dans les camions en service (' + K.n + ')', K.n === K.somme && K.n === K.tout.filter(o => !o.garage).reduce((s, o) => s + o.nb, 0) && K.n >= 1, K);
  v('camionsARemplir : forme { camions:[{l, manques}], n }', K.form);
  const K2 = await R(() => { const l = LIEUX.find(o => o.type === 'vehicule' && !bxGarage(o.id) && bxManques(o.id).length); const av = l.ferme; l.ferme = true; const r = camionsARemplir(); l.ferme = av; return { ferme:r.camions.some(o => o.l.id === l.id) }; });
  v('camionsARemplir : un lieu fermé n’est pas compté', K2.ferme === false);
  // ── cmdNbACommander : UNE règle, les demandes d'achat d'article y entrent (« Demandé par Tom ») ──
  const C = await R(() => { const n0 = cmdNbACommander(), somme = cmdPaniers().reduce((s, p) => s + p.lignes.length, 0), da = DEM_ACHAT.find(d => d.pid && d.etat === 'attente' && !d.tache);
    const ligne = da && cmdPaniers().flatMap(p => p.lignes).find(l => l.k === da.pid), av = da && da.etat; if (da) da.etat = 'refusee'; const n1 = cmdNbACommander(); if (da) da.etat = av;
    const t = { id:'t-essai', t:'x', qui:'marc', type:'commande', etat:'acommander', pieces:[], inter:null }; const x = PRODUITS.find(o => o.id === 'p4');
    const avT = da && da.tache; if (da) da.tache = 't-essai'; const n2 = cmdNbACommander(); if (da) { if (avT) da.tache = avT; else delete da.tache; }
    return { n0, somme, da:da && da.id, pourquoi:ligne && ligne.pourquoi, n1, n2 }; });
  v('cmdNbACommander : population — une demande d’achat d’un article du catalogue attend (' + C.da + ')', !!C.da);
  v('cmdNbACommander = le nombre de lignes des paniers (une seule règle)', C.n0 === C.somme && C.n0 >= 1, C);
  v('la demande entre dans le panier avec « Demandé par Tom »', /Demandé par Tom/.test(C.pourquoi || ''), C.pourquoi);
  v('traitée (état ≠ attente), elle SORT du panier : on retombe de un', C.n1 === C.n0 - 1, C);
  v('portée par une tâche de commande, elle ne compte pas deux fois', C.n2 === C.n0 - 1, C);
  // ── matDejaEnvoye : même qui, pid, de, vers, type (et la même intervention) tant que le premier attend ──
  const D = await R(() => { const a = MVTS_ATT[0], c = o => Object.assign({}, a, o); return { pop:MVTS_ATT.length, mm:matDejaEnvoye(c({ id:'x1' })), q:matDejaEnvoye(c({ id:'x2', q:99 })), pid:matDejaEnvoye(c({ pid:'p-autre' })), qui:matDejaEnvoye(c({ qui:'lr' })), vers:matDejaEnvoye(c({ vers:'v3' })), type:matDejaEnvoye(c({ type:'correction' })), inter:matDejaEnvoye(c({ inter:'i-autre' })) }; });
  v('matDejaEnvoye : population — des envois attendent (' + D.pop + ')', D.pop >= 2);
  v('matDejaEnvoye : un envoi identique est reconnu (même la quantité ne change rien)', D.mm === true && D.q === true, D);
  v('matDejaEnvoye : un autre article, une autre personne, un autre lieu, un autre type ou une autre intervention passent', !D.pid && !D.qui && !D.vers && !D.type && !D.inter, D);
  // ── matEnvoisAAccepter + matPhrase ──
  const A = await R(() => { const o = matEnvoisAAccepter(); return { n:o.n, att:MVTS_ATT.length, qui:o.qui, l0:o.lignes[0] && { phrase:o.lignes[0].phrase, apres:o.lignes[0].apres, reste:o.lignes[0].reste, dispo:o.lignes[0].dispo }, toutes:o.lignes.every(l => /après acceptation, il en restera \d|Il n’y en a plus|il n’y en a que/i.test(l.apres) && l.phrase.length > 8) }; });
  v('matEnvoisAAccepter : un envoi par ligne de MVTS_ATT (' + A.att + ')', A.n === A.att && A.att >= 2, A);
  v('matEnvoisAAccepter : « Tom et Sophie » (prénoms, sans doublon)', A.qui.includes('Tom') && A.qui.includes('Sophie'), A.qui);
  v('matEnvoisAAccepter : « il en restera N » = disponible − quantité', A.toutes && A.l0 && A.l0.reste >= 0, A.l0);
  const P = await R(() => { const m0 = (o) => Object.assign({ id:'z', d:AUJ, h:'09:00', pid:'p3', q:1 }, o);
    const x = PRODUITS.find(o => o.id === 'p3'), br = { id:'z2' };
    return { usage:matPhrase(m0({ type:'sortie', qui:'sm', de:'v1', motif:'Utilisé chez le client', inter:'i1', pourQui:'sm' })),
      prise:matPhrase(m0({ type:'transfert', qui:'tl', de:'atelier', vers:'v4', q:8, pid:'p7' })),
      entree:matPhrase(m0({ type:'entree', qui:'jm', vers:'atelier', q:6, pid:'p8', bc:'c39' })),
      compte:matPhrase(m0({ type:'correction', qui:'kb', de:'v2', q:-2, pid:'p24' })),
      colleg:matPhrase(m0({ type:'sortie', qui:'marc', de:'atelier', pourQui:'tl', motif:'Don', br:'BR-2026-017' })),
      casse:matPhrase(m0({ type:'sortie', qui:'marc', de:'atelier', motif:'Cassé' })),
      dep:matPhrase(m0({ type:'transfert', qui:'marc', de:'atelier', vers:'v2', q:2 })),
      cli:CLIENTS[INTS.find(i => i.id === 'i1').cli].nom, nom:matNomCourt(x) }; });
  v('matPhrase : « Sophie a utilisé 1 … chez <client> »', new RegExp('^Sophie a utilisé 1 ' + P.nom.replace(/[()]/g, '\\$&') + ' chez ' + P.cli.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$').test(P.usage), P.usage);
  v('matPhrase : « Tom a pris 8 … à l’atelier pour son camion »', /^Tom a pris 8 .+ à l’atelier pour son camion$/.test(P.prise), P.prise);
  v('matPhrase : « … a rangé la livraison 2026-039 : 6 kg de … » (sans « BC- »)', /a rangé la livraison 2026-039 : 6 kg de/.test(P.entree) && !/BC-/.test(P.entree), P.entree);
  v('matPhrase : « Karim a compté son camion : 2 … de moins que prévu » (le lieu n’est écrit qu’une fois)', /^Karim a compté son camion : 2 .+ de moins que prévu$/.test(P.compte) && (P.compte.match(/camion/g) || []).length === 1, P.compte);
  v('matPhrase : un bon de remise s’affiche sans « BR- »', /bon de remise 2026-017/.test(P.colleg) && !/BR-/.test(P.colleg), P.colleg);
  v('matPhrase : « cassé ou perdu » se dit', /cassé ou perdu/.test(P.casse), P.casse);
  v('matPhrase : un déplacement dit d’où et vers où', /dans le camion de Karim/.test(P.dep) || /vers/.test(P.dep), P.dep);
  const toutes = await R(() => MVTS.concat(MVTS_ATT).map(m => matPhrase(m)));
  v('matPhrase : population — le journal entier (' + toutes.length + ' gestes) donne une phrase propre', toutes.length >= 10 && toutes.every(t => typeof t === 'string' && t.length > 8 && !/undefined|NaN|\?\s|\[object/.test(t)), toutes.filter(t => /undefined|NaN|\[object/.test(t)).slice(0, 3));
  // ── la carte d'aide : la même que celle de Devis (on compare la CHARPENTE, pas le texte) ──
  const H = await R(() => { const sq = h => { const d = document.createElement('div'); d.innerHTML = h; const o = d.querySelector('.carte'); const walk = e => e.nodeType === 3 ? '' : '<' + e.tagName.toLowerCase() + (e.className ? '.' + e.className : '') + (e.getAttribute('style') ? '[' + e.getAttribute('style') + ']' : '') + '>' + [...e.childNodes].map(walk).join('') + '</>'; return o ? walk(o) : ''; };
    const dv = vueDevis(), i = dv.indexOf('<div class="carte"><h3>Le plus simple possible</h3>'), carteDevis = dv.slice(i), fin = carteDevis.lastIndexOf('</div></div>') + 12;
    return { a:sq(carteAide(['un', 'deux', 'trois'])).replace(/<span><\/>/g, ''), b:sq(carteDevis.slice(0, fin)).replace(/<span><\/>/g, ''), txt:carteAide(['un', 'deux']) }; });
  v('carteAide : même charpente que la carte « Le plus simple possible » de Devis', H.a.length > 40 && H.a === H.b, [H.a.slice(0, 100), H.b.slice(0, 100)]);
  v('carteAide : une puce par phrase, « • » devant', (H.txt.match(/<span>• /g) || []).length === 2 && /Le plus simple possible/.test(H.txt));
  // ── les icônes filaires : chacune rend un SVG d'un seul trait ──
  const noms = ['camion', 'atelier', 'reserve', 'article', 'fluide', 'photo', 'sortir', 'ranger', 'deplacer', 'compter', 'coche', 'livraison'];
  const I = await R(n => n.map(k => { const h = (typeof svg === 'function') ? svg(k) : ''; return [k, !!IC[k], /<svg[^>]*stroke-width="1.8"/.test(h) && /<(path|circle)/.test(h), /fill="none"/.test(h)]; }), noms);
  v('icônes : ' + noms.length + ' noms ajoutés, chacun rend un SVG filaire', I.length === 12 && I.every(o => o[1] && o[2] && o[3]), I.filter(o => !(o[1] && o[2] && o[3])));
  v('icônes : un émoji ne remplace aucune de ces icônes (le jeu IC ne porte pas de texte)', await R(n => n.every(k => !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(IC[k])), noms));
  // ── les montants : « 1 724,00 € », jamais « 1724 € » ──
  const M = {};
  for (const h of ['boxes', 'stock', 'produits']) { await L.aller(p, h); M[h] = await p.evaluate(() => (document.getElementById('contenu').textContent || '').replace(/\s+/g, ' ')); }
  const montants = t => (t.match(/\d[\d   ]*(?:,\d+)?[  ]€/g) || []);
  for (const h of ['boxes', 'stock']) { const m = montants(M[h]); v(`montants de « ${h} » : population ${m.length} (Stock n'en montre plus qu'un : la valeur est en pied de liste), chacun en 2 décimales`, m.length >= (h === 'stock' ? 1 : 2) && m.every(x => /,\d{2}[  ]€$/.test(x)), m.filter(x => !/,\d{2}[  ]€$/.test(x)).slice(0, 4)); }
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
