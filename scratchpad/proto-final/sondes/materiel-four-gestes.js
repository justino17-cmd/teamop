// Matériel, étape 4 (Fournisseurs, matériel & produits) — les gestes JOUÉS pour de bon (vrais clics), avec le relevé des chiffres avant et après, et « Annuler » de chacun qui rend l'état d'avant à l'identique.
//  · Commandes : un chiffre « à commander » (onglet, carte, nombre de lignes) ; plus / moins / retirer ; préparer puis ENVOYER en un seul bouton ; recevoir (tout, une partie) ; comparer avec la facture ; contester ;
//  · Articles : recherche, filtre, tri, « Prix à compléter » ; Fournisseurs : cartes sans bouton, fiche en trois cartes, UNE saisie du délai, ajouter / retirer un fournisseur ;
//  · Importer les prix et Photographier une facture : se défont avec Annuler.
// Usage : node materiel-four-gestes.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a), attendre = ms => p.waitForTimeout(ms || 300);
  const NB = s => String(s).replace(/[  ]/g, ' ');
  const etat = () => R(() => JSON.stringify({ c:COMMANDES, p:PRODUITS.map(x => [x.id, x.q, x.pa, x.pv, x.paAvant === undefined ? null : x.paAvant, x.loc || null, x.resa || null, x.four, !!x.retire]), m:MVTS.length, a:ACHATS.length, pan:CMD_PANIER, hors:[...CMD_HORS], fo:MES_FOURN, t:TACHES.map(t => [t.id, t.etat || null]) }));
  const annuler = async () => { const ok = await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); return !!b; }); await attendre(400); return ok; };
  const toast = () => R(() => (document.getElementById('toast') || {}).innerText || '').then(NB).catch(() => '');
  const clic = async s => { const ok = await L.toucher(c, s); await attendre(250); return ok; };
  const panneau = () => R(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText : ''; }).then(NB);
  const titre = () => R(() => { const e = document.querySelector('#calque .panneau h2'); return e ? e.textContent : ''; });
  const onglet = k => R(k => { prVue = k; rendre(); }, k).then(() => attendre(300));
  const nAC = () => R(() => cmdNbACommander());
  await R(() => { window.NB = s => String(s).replace(/[  ]/g, ' '); });
  await L.aller(p, 'produits'); await onglet('commandes');
  // ── 0. la population
  const pop = await R(() => ({ cmd:COMMANDES.length, pans:cmdPaniers().length, nac:cmdNbACommander(), four:MES_FOURN.length, art:PRODUITS.filter(x => !x.retire).length }));
  v('population : ' + pop.cmd + ' commandes, ' + pop.pans + ' paniers, ' + pop.nac + ' à commander, ' + pop.four + ' fournisseurs, ' + pop.art + ' articles', pop.cmd >= 4 && pop.pans >= 3 && pop.nac >= 5 && pop.four >= 5 && pop.art >= 25, pop);
  const n0 = pop.nac, e0 = await etat();
  // ── 1. la page Commandes : UN chiffre, UN noir, des boutons qui agissent
  const pg = await R(() => ({ h1:document.querySelector('#contenu h1').textContent, noirs:[...document.querySelectorAll('#contenu .fx-tete .btn:not(.gris)')].map(b => NB(b.textContent)), onglets:[...document.querySelectorAll('.fx-seg button')].map(b => NB(b.textContent)), pill:(document.querySelector('.fx-seg [data-pr="vue|commandes"] .pr-nb') || {}).textContent,
    carte:NB((document.querySelector('.fx-acmd h3') || {}).textContent || ''), lignes:document.querySelectorAll('.fx-acmd .fx-pl').length, groupes:[...document.querySelectorAll('.fx-liste .fx-gh')].map(e => NB(e.childNodes[0].textContent)), recep:document.querySelectorAll('.fx-ab[data-cm^="recep|"]').length, relance:document.querySelectorAll('.fx-ab[data-cm^="relance|"]').length, compare:document.querySelectorAll('.fx-ab[data-cm^="rappro|"]').length,
    photo:!!document.querySelector('[data-vis="four-photo"][aria-label="Photographier une facture"]') }));
  v('la page : « Fournisseurs, matériel & produits », UN seul bouton noir « ＋ Nouvelle commande »', pg.h1 === 'Fournisseurs, matériel & produits' && pg.noirs.length === 1 && /Nouvelle commande/.test(pg.noirs[0]), pg);
  v('trois onglets dont le compteur de Commandes est « à commander » (' + n0 + ')', pg.onglets.length === 3 && /^Commandes\s*\d+/.test(pg.onglets[0]) && /^Articles/.test(pg.onglets[1]) && /^Fournisseurs/.test(pg.onglets[2]) && pg.pill * 1 === n0, pg);
  v('la carte « À commander · ' + n0 + ' » compte autant de lignes que le chiffre (' + pg.lignes + ')', pg.carte === 'À commander · ' + n0 && pg.lignes === n0, pg);
  v('les commandes sont rangées par ce qu’il y a à FAIRE : « À traiter » puis « En route »', pg.groupes[0] === 'À traiter' && pg.groupes.includes('En route'), pg.groupes);
  v('chaque commande a le bouton de SON état : J’ai reçu la livraison (en route), Relancer (en retard), Comparer (facture arrivée)', pg.recep >= 1 && pg.relance >= 1 && pg.compare >= 1, pg);
  v('l’appareil photo de l’en-tête porte son nom (icône seule)', pg.photo);
  // ── 2. plus, moins, retirer
  const k = await R(() => cmdPaniers()[0].lignes[0].k), q0 = await R(k => cmdPaniers().flatMap(p => p.lignes).find(l => l.k === k).q, k);
  await clic(`[data-fx="pas|${k}|1"]`); const q1 = await R(k => ({ q:cmdPaniers().flatMap(p => p.lignes).find(l => l.k === k).q, champ:document.querySelector(`[data-cmq="${k}"]`).value }), k);
  v('« + » ajoute un à la quantité du panier (' + q0 + ' → ' + q1.q + ') et le champ le dit', q1.q === q0 + 1 && q1.champ.replace(',', '.') * 1 === q1.q, q1);
  await clic(`[data-fx="pas|${k}|-1"]`); const q2 = await R(k => cmdPaniers().flatMap(p => p.lignes).find(l => l.k === k).q, k);
  v('« − » la rend', q2 === q0, q2); v('le chiffre « à commander » n’a pas bougé (c’est la quantité qui change, pas le nombre de lignes)', await nAC() === n0);
  await clic(`[data-cm="hors|${k}"]`); v('« Retirer » sort la ligne de À commander (' + n0 + ' → ' + await nAC() + ') et le dit avec Annuler', await nAC() === n0 - 1 && /Annuler/.test(await R(() => document.getElementById('toast').innerText)));
  await annuler(); v('Annuler la remet : ' + await nAC(), await nAC() === n0);
  await R(() => { CMD_PANIER = {}; }); // la quantité réglée plus haut ne doit rien laisser derrière
  v('avant les envois : l’état est celui du départ, au caractère près', await etat() === e0);
  // ── 3. préparer, ENVOYER en un seul bouton, Annuler
  await clic('[data-cm="preparer|Sanitaire Pro 17"]'); await attendre(300);
  const bon = await R(() => { const p = document.querySelector('#calque .panneau'); return { h2:(p.querySelector('h2') || {}).textContent, noirs:[...p.querySelectorAll('.fo-pied .btn:not(.gris)')].map(b => NB(b.textContent)), gris:[...p.querySelectorAll('.fo-pied .btn.gris')].map(b => NB(b.textContent)), voir:!!p.querySelector('details.fx-voir'), txt:NB(p.innerText) }; });
  v('« Préparer la commande » ouvre le bon : UN seul bouton noir « Envoyer à Sanitaire Pro 17 », « Enregistrer sans envoyer » en gris', bon.noirs.length === 1 && /^Envoyer à Sanitaire Pro 17$/.test(bon.noirs[0]) && bon.gris.includes('Enregistrer sans envoyer'), bon);
  v('l’étape « Vérifier et envoyer » a disparu ; le message se voit dans « Voir le message »', bon.voir && !/Vérifier et envoyer|Voir le bon/.test(bon.txt), bon.txt.slice(0, 120));
  await R(() => { document.querySelector('#calque details.fx-voir').open = true; }); const msg = await panneau();
  v('« Voir le message » montre l’e-mail ET le bon (PDF joint)', /Objet : Bon de commande/.test(msg) && /BON DE COMMANDE/.test(msg), msg.slice(-300));
  await clic('#calque [data-ce="envoyer"]'); await attendre(400);
  const env = await R(() => { const o = COMMANDES[0]; return { four:o.four, st:o.st, sansMail:o.sansMail, panneau:!!document.querySelector('#calque .panneau'), nac:cmdNbACommander(), enRoute:[...document.querySelectorAll('.fx-liste .fx-l')].some(e => /Sanitaire Pro 17/.test(e.innerText) && /J’ai reçu/.test(e.innerText)), toast:(document.getElementById('toast') || {}).innerText || '' }; });
  v('« Envoyer à… » envoie : commande « envoyée », fenêtre fermée, la commande est dans « En route » avec son bouton « J’ai reçu la livraison »', env.four === 'Sanitaire Pro 17' && env.st === 'envoyee' && !env.panneau && env.enRoute, env);
  v('…le chiffre « à commander » baisse (' + n0 + ' → ' + env.nac + ') et le message dit Annuler', env.nac === n0 - 1 && /Annuler/.test(env.toast) && /Sanitaire Pro 17/.test(env.toast), env);
  await annuler(); const ann = await R(() => ({ st:COMMANDES[0].st, env:COMMANDES[0].env || null, brouillon:[...document.querySelectorAll('.fx-liste .fx-l')].some(e => /Sanitaire Pro 17/.test(e.innerText) && /Brouillon/.test(e.innerText)) }));
  v('Annuler : la commande repasse en BROUILLON (rien n’est parti), rangée dans « À traiter »', ann.st === 'brouillon' && !ann.env && ann.brouillon, ann);
  // la fiche du brouillon : UN noir, le menu Plus porte « Supprimer le brouillon »
  const id = await R(() => COMMANDES[0].id); await R(id => cmdFiche(id), id); await attendre(300);
  const fb = await R(() => { const p = document.querySelector('#calque .panneau'); return { noirs:[...p.querySelectorAll('.ms-boutons .btn:not(.gris)')].map(b => NB(b.textContent)), frise:[...p.querySelectorAll('.fx-frise > span')].map(e => NB(e.textContent)) }; });
  v('la fiche d’un brouillon : UN noir « Envoyer à Sanitaire Pro 17 », la frise a quatre étapes', fb.noirs.length === 1 && /Envoyer à Sanitaire Pro 17/.test(fb.noirs[0]) && fb.frise.length === 4 && /Préparée/.test(fb.frise[0]) && /Facture comparée/.test(fb.frise[3]), fb);
  await clic('#calque [data-fx^="cplus|"]'); const mc = await R(() => [...document.querySelectorAll('.ctx button')].map(b => NB(b.textContent)));
  v('le menu Plus du brouillon : Modifier, Voir le bon (PDF), Supprimer le brouillon', mc.some(t => /Modifier/.test(t)) && mc.some(t => /Voir le bon \(PDF\)/.test(t)) && mc.some(t => /Supprimer le brouillon/.test(t)), mc);
  await R(() => { const b = [...document.querySelectorAll('.ctx button')].find(e => /Supprimer le brouillon/.test(e.textContent)); b.click(); }); await attendre(300);
  v('« Supprimer le brouillon » le supprime (et dit Annuler) : l’état est celui du départ', await R(() => COMMANDES.length) === pop.cmd && await nAC() === n0 && /Annuler/.test(await R(() => (document.getElementById('toast') || {}).innerText || '')));
  await R(() => { CMD_PANIER = {}; CMD_DEPL = {}; CMD_HORS = new Set(); }); const e1 = await etat(); v('après le brouillon supprimé : même état qu’au départ, au caractère près', e1 === e0, e1.length + ' ≠ ' + e0.length);
  // ── 4. recevoir : tout, puis une partie ; Annuler
  const p8 = () => R(() => PRODUITS.find(x => x.id === 'p8').q);
  const q8 = await p8(); const late = await R(() => ({ aside:[...document.querySelectorAll('.fx-l')].filter(e => /2026-039/.test(e.innerText)).map(e => [...e.querySelectorAll('.fx-ab')].map(b => b.textContent.trim())).flat() }));
  v('une commande EN RETARD (039) offre « Relancer » sur sa ligne ; « J’ai reçu la livraison » est le noir de sa fiche', late.aside.join() === 'Relancer', late);
  await R(() => cmdFiche('c39')); await attendre(300); await clic('#calque [data-cm="recep|c39"]');
  const rec = await R(() => { const p = document.querySelector('#calque .panneau'); return { h2:p.querySelector('h2').textContent, champs:p.querySelectorAll('[data-cmr]').length, noirs:[...p.querySelectorAll('.fo-pied .btn:not(.gris)')].map(b => NB(b.textContent)), tout:!![...p.querySelectorAll('button')].find(b => b.textContent === 'Tout est arrivé'), bl:!!p.querySelector('details.ms-acc summary') && /bon de livraison/.test(p.innerText), ranger:p.querySelectorAll('[data-pdxlieu]').length }; });
  v('« J’ai reçu la livraison » : un champ par ligne en attente, « Tout est arrivé », le bon de livraison replié, un seul noir « Ranger dans le stock »', rec.h2 === 'J’ai reçu la livraison' && rec.champs === 1 && rec.tout && rec.bl && rec.noirs.length === 1 && rec.noirs[0] === 'Ranger dans le stock' && rec.ranger === 1, rec);
  await clic('#calque [data-fx="toutarrive"]'); await clic('#calque [data-cm="recok|c39"]'); await attendre(400);
  const apr = await R(() => ({ st:COMMANDES.find(o => o.id === 'c39').st, q8:PRODUITS.find(x => x.id === 'p8').q, mv:MVTS[0].motif, toast:(document.getElementById('toast') || {}).innerText || '' }));
  v('« Ranger dans le stock » : le stock monte de 6 (' + q8 + ' → ' + apr.q8 + '), la commande est « recue », le journal du stock le dit', apr.q8 === q8 + 6 && apr.st === 'recue' && /Réception de la commande/.test(apr.mv), apr);
  v('…et le message dit Annuler', /Annuler/.test(apr.toast), apr.toast);
  await annuler(); v('Annuler : le stock, la commande, le journal et les tâches reviennent à l’identique', await etat() === e0 && await p8() === q8);
  await R(() => cmdFiche('c39')); await attendre(300); await clic('#calque [data-cm="recep|c39"]'); await R(() => { const i = document.querySelector('#calque [data-cmr]'); i.value = '4'; i.dispatchEvent(new Event('input', { bubbles:true })); }); await attendre(200);
  const part = await R(() => ({ manque:NB((document.getElementById('fx-manque') || {}).innerText || ''), vis:!document.getElementById('fx-manque').hidden, reliq:!document.getElementById('fx-reliq').hidden }));
  v('une livraison PARTIELLE le dit tout de suite : « Il en manque 2 » et la date du reste', part.vis && part.reliq && /Il en manque 2/.test(part.manque), part);
  await clic('#calque [data-cm="recok|c39"]'); await attendre(400);
  v('ranger une livraison partielle : la commande passe à « partielle », le stock monte de 4', await R(() => COMMANDES.find(o => o.id === 'c39').st) === 'partielle' && await p8() === q8 + 4);
  await annuler(); v('Annuler la livraison partielle : état d’avant', await etat() === e0);
  // ── 5. comparer avec la facture
  await R(() => { fermerPanneau(); fermerMenu(); }); await attendre(200);
  await clic('.fx-ab[data-cm="rappro|c36"]');
  const cp = await R(() => { const p = document.querySelector('#calque .panneau'); return { h2:p.querySelector('h2').textContent, txt:NB(p.innerText), noirs:[...p.querySelectorAll('.fo-pied .btn:not(.gris)')].map(b => NB(b.textContent)), gris:[...p.querySelectorAll('.fo-pied .btn.gris')].map(b => NB(b.textContent)) }; });
  v('« Comparer avec la facture » : une phrase par écart, un noir, « Contester » en gris', cp.h2 === 'Comparer avec la facture' && /La facture dit 197,20 €. La commande dit 196,00 €/.test(cp.txt) && /Le fournisseur a facturé 119,20 € au lieu de 118,00 €/.test(cp.txt) && cp.noirs.length === 1 && /Accepter l’écart/.test(cp.noirs[0]) && cp.gris.includes('Contester'), cp);
  const pa0 = await R(() => PRODUITS.find(x => x.id === 'p18').pa), a0 = await R(() => ACHATS.length);
  await clic('#calque [data-cm="accepte|c36"]'); await attendre(400);
  const fa = await R(() => ({ st:COMMANDES.find(o => o.id === 'c36').st, pa:PRODUITS.find(x => x.id === 'p18').pa, ach:ACHATS.length }));
  v('« Accepter l’écart » : commande terminée, le prix d’achat suit la facture (' + pa0 + ' → ' + fa.pa + '), la facture rejoint les achats', fa.st === 'facturee' && fa.pa === 119.2 && fa.ach === a0 + 1, fa);
  await annuler(); v('Annuler : la commande repasse à « recue » et le prix revient', await R(() => COMMANDES.find(o => o.id === 'c36').st) === 'recue' && await R(() => PRODUITS.find(x => x.id === 'p18').pa) === pa0);
  await R(() => { fermerPanneau(); fermerMenu(); }); await attendre(200);
  await clic('.fx-ab[data-cm="rappro|c36"]'); await clic('#calque [data-cm="conteste|c36"]'); const ct = await panneau();
  v('« Contester » montre l’e-mail AVANT de l’envoyer (rien ne part sans accord)', /Contester la facture/.test(ct) && /Objet : Facture/.test(ct) && !/rapproch/i.test(ct) && await R(() => !COMMANDES.find(o => o.id === 'c36').contestee), ct.slice(0, 200));
  await R(() => fermerPanneau()); await R(() => { CMD_PANIER = {}; });
  v('après les commandes : l’état est celui du départ, au caractère près', await etat() === e0);
  // ── 6. Articles
  await onglet('articles');
  const ar = await R(() => ({ total:PRODUITS.filter(x => !x.retire).length, lignes:document.querySelectorAll('.fx-arts .fx-a').length, groupes:document.querySelectorAll('.fx-arts details').length, noirs:[...document.querySelectorAll('#contenu .fx-tete .btn:not(.gris)')].map(b => NB(b.textContent)), filtre:NB(document.querySelector('.fx-filtre').textContent), pied:NB((document.querySelector('.ms-pied') || {}).textContent || '') }));
  v('Articles : une ligne par article (' + ar.lignes + ' = ' + ar.total + '), rangées en ' + ar.groupes + ' catégories, UN noir « ＋ Ajouter un article »', ar.lignes === ar.total && ar.groupes >= 5 && ar.noirs.length === 1 && /Ajouter un article/.test(ar.noirs[0]) && /^Tout/.test(ar.filtre), ar);
  const ligne = await R(() => { const l = document.querySelector('.fx-arts .fx-a'), x = PRODUITS.find(o => 'fiche|' + o.id === l.dataset.pr); return { txt:NB(l.innerText), pv:x && x.pv, nom:x && x.nom }; });
  v('une ligne montre le prix de vente et la marge (jamais l’état du stock : c’est l’affaire de Stock)', /€/.test(ligne.txt) && /marge \d+ %/.test(ligne.txt) && !/En stock|Épuisé|À commander/.test(ligne.txt), ligne);
  await p.fill('#fx-q', 'condens'); await attendre(450);
  const rech = await R(() => ({ n:document.querySelectorAll('.fx-arts .fx-a').length, attendu:PRODUITS.filter(x => !x.retire && pdxChercheOk(x, 'condens')).length, val:document.getElementById('fx-q').value }));
  v('la recherche (sans accent, tous les mots) garde exactement les articles qui parlent de « condens » (' + rech.n + ' = ' + rech.attendu + ')', rech.n >= 1 && rech.n < ar.total && rech.n === rech.attendu && rech.val === 'condens', rech);
  await p.fill('#fx-q', 'zzzzzz'); await attendre(450);
  const rien = await R(() => NB(document.querySelector('#contenu .ms-vide').innerText));
  v('rien trouvé : une phrase et « ＋ Ajouter « zzzzzz » », jamais « Aucune donnée »', /Rien trouvé pour « zzzzzz »/.test(rien) && /Ajouter « zzzzzz »/.test(rien), rien);
  await R(() => { prQ = ''; rendre(); }); await attendre(250);
  await R(() => { window.__x = PRODUITS.find(x => x.id === 'p3'); window.__ac = [window.__x.ac, window.__x.pv, window.__x.pa]; window.__x.ac = true; window.__x.pv = null; rendre(); }); await attendre(300);
  const ban = await R(() => ({ b:NB((document.querySelector('.ms-bandeau') || {}).innerText || ''), ac:PRODUITS.filter(x => x.ac && !x.retire).length }));
  v('le bandeau « N article(s) attend(ent) son/leur prix » n’apparaît que quand il sert (' + ban.ac + ')', ban.ac >= 1 && new RegExp('^' + ban.ac + ' article').test(ban.b) && /Les compléter/.test(ban.b), ban);
  await clic('[data-fx="filtre"]'); const mf = await R(() => [...document.querySelectorAll('.ctx button')].map(b => NB(b.textContent)));
  v('le filtre « Tout ▾ » : Tout, Ce que je vends au client, Mon matériel (non facturé), Prix à compléter · N', mf.length === 4 && /Ce que je vends au client/.test(mf[1]) && /Mon matériel \(non facturé\)/.test(mf[2]) && new RegExp('Prix à compléter · ' + ban.ac).test(mf[3]), mf);
  await R(() => { [...document.querySelectorAll('.ctx button')][3].click(); }); await attendre(350);
  const fac = await R(() => ({ n:document.querySelectorAll('.fx-arts .fx-a').length, tous:[...document.querySelectorAll('.fx-arts .fx-a')].every(e => /Prix à compléter/.test(e.innerText)), btn:NB(document.querySelector('.fx-filtre').textContent) }));
  v('« Prix à compléter » ne garde que ces articles (' + fac.n + ' = ' + ban.ac + ') et le bouton le dit', fac.n === ban.ac && fac.tous && /^Prix à compléter/.test(fac.btn), fac);
  await clic('.fx-arts .fx-a'); await attendre(300); const pf = await R(() => ({ h2:(document.querySelector('#calque .panneau h2') || {}).textContent, nom:window.__x.nom, champ:!!document.querySelector('#calque [data-msf="pa"]') }));
  v('toucher un article sans prix ouvre sa fiche DÉJÀ sur le champ du prix', pf.h2 === pf.nom && pf.champ, pf);
  await R(() => { fermerPanneau(); const x = window.__x; [x.ac, x.pv, x.pa] = window.__ac; if (!x.ac) delete x.ac; prAC = false; FX.filtre = 'tout'; rendre(); }); await attendre(250);
  await clic('[data-fx="plus"]'); const mp = await R(() => [...document.querySelectorAll('.ctx button')].map(b => NB(b.textContent)));
  v('Plus ▾ : Importer les prix d’un fournisseur, Choisir parmi les articles habituels, Voir comment les articles sont rangés par métier, Trier par', mp.length === 4 && /Importer les prix d’un fournisseur/.test(mp[0]) && /articles habituels de mon métier/.test(mp[1]) && /rangés par métier/.test(mp[2]) && /Trier par/.test(mp[3]), mp);
  await R(() => { [...document.querySelectorAll('.ctx button')][3].click(); }); await attendre(200); await R(() => { [...document.querySelectorAll('.ctx button')].find(b => /Par nom/.test(b.textContent)).click(); }); await attendre(350);
  const tri = await R(() => { const L = [...document.querySelectorAll('.fx-arts details')].map(d => [...d.querySelectorAll('.fx-a .fo-n > b')].map(b => b.textContent)); return L.filter(g => g.join('|') !== [...g].sort((a, b) => prNorm(a).localeCompare(prNorm(b), 'fr')).join('|')); });
  v('« Trier par › Par nom » : chaque catégorie est dans l’ordre alphabétique', tri.length === 0, tri); await R(() => { PDX.tri = 'rangement'; rendre(); });
  // ── 7. Fournisseurs
  await onglet('fournisseurs');
  const fo = await R(() => ({ cartes:document.querySelectorAll('.fx-c').length, dans:document.querySelectorAll('.fx-c button, .fx-c a').length, n:MES_FOURN.length, noirs:[...document.querySelectorAll('#contenu .fx-tete .btn:not(.gris)')].map(b => NB(b.textContent)) }));
  v('Fournisseurs : une carte par fournisseur (' + fo.cartes + '), AUCUN bouton dans une carte, UN noir « ＋ Ajouter un fournisseur »', fo.cartes === fo.n && fo.dans === 0 && fo.noirs.length === 1 && /Ajouter un fournisseur/.test(fo.noirs[0]), fo);
  const dj0 = await R(() => { const f = MES_FOURN.find(o => o.id === 'cpa'); return [f.dj, f.delai]; });
  await clic('.fx-c[data-fo="fiche|cpa"]'); await attendre(300);
  const ff = await R(() => ({ h2:document.querySelector('#calque .panneau h2').textContent, cartes:[...document.querySelectorAll('#calque .fx-fc h3')].map(e => e.textContent), noirs:[...document.querySelectorAll('#calque .ms-boutons .btn:not(.gris)')].map(b => NB(b.textContent)), jours:!!document.querySelector('#calque [data-pdxfo="cpa|dj"]'), delaiChamp:!!document.querySelector('#calque [data-fochamp$="|delai"]') }));
  v('la fiche d’un fournisseur : TROIS cartes (le joindre, comment il livre, mon compte), un noir « Commander chez lui »', ff.h2 === 'Clim Pièces Atlantique' && ff.cartes.join('|') === 'Comment le joindre|Comment il livre|Mon compte' && ff.noirs.length === 1 && /Commander chez lui/.test(ff.noirs[0]), ff);
  v('UNE seule saisie du délai : le nombre de jours (plus de champ texte « délai » à côté)', ff.jours && !ff.delaiChamp, ff);
  await R(() => { const i = document.querySelector('#calque [data-pdxfo="cpa|dj"]'); i.value = '2'; i.dispatchEvent(new Event('change', { bubbles:true })); }); await attendre(500);
  const d2 = await R(() => { const f = MES_FOURN.find(o => o.id === 'cpa'); return { dj:f.dj, delai:f.delai, carte:NB(document.querySelector('.fx-c[data-fo="fiche|cpa"]').innerText) }; });
  v('« Livré en 2 jours » : le texte lu par l’e-mail est GÉNÉRÉ (« ' + d2.delai + ' ») et la carte le dit', d2.dj === 2 && d2.delai === 'livré sous 48 h' && /Livraison en 2 jours/.test(d2.carte), d2);
  await clic('#calque [data-fx="comptoir|cpa"]'); await attendre(300); const d3 = await R(() => { const f = MES_FOURN.find(o => o.id === 'cpa'); return { dj:f.dj, delai:f.delai, champ:!!document.querySelector('#calque [data-pdxfo="cpa|dj"]') }; });
  v('« Je le retire au comptoir » : 0 jour, le champ des jours disparaît', d3.dj === 0 && /comptoir/.test(d3.delai) && !d3.champ, d3);
  await clic('#calque [data-fx="comptoir|cpa"]'); await R(([a, b]) => { const f = MES_FOURN.find(o => o.id === 'cpa'); f.dj = a; f.delai = b; }, dj0); await R(() => fermerPanneau());
  // ajouter un fournisseur : « Un autre »
  await clic('#contenu .fx-tete [data-fo="liste"]'); const aj = await R(() => ({ h2:document.querySelector('#calque .panneau h2').textContent, onglets:[...document.querySelectorAll('#calque .seg button')].map(b => NB(b.textContent)) }));
  v('« Ajouter un fournisseur » : deux onglets « Dans la liste de mon métier » et « Un autre »', aj.h2 === 'Ajouter un fournisseur' && aj.onglets.join('|') === 'Dans la liste de mon métier|Un autre', aj);
  await clic('#calque [data-fx="ajtab|autre"]'); await p.fill('#fo-l-nom', 'Quincaillerie du Port'); await p.fill('#fo-l-mail', 'commandes@quincaillerie-port.fr'); await clic('#calque [data-fo="localok"]'); await attendre(400);
  const nv = await R(() => ({ n:MES_FOURN.length, f:MES_FOURN.find(o => o.nom === 'Quincaillerie du Port'), h2:(document.querySelector('#calque .panneau h2') || {}).textContent }));
  v('« Un autre » : trois champs suffisent, le fournisseur existe (' + nv.n + ') et sa fiche s’ouvre', nv.n === fo.n + 1 && nv.f && nv.f.mail === 'commandes@quincaillerie-port.fr' && nv.h2 === 'Quincaillerie du Port', nv);
  await clic('#calque [data-fx^="fplus|"]'); const mfo = await R(() => [...document.querySelectorAll('.ctx button')].map(b => NB(b.textContent)));
  v('Plus ▾ de la fiche : « Choisir parmi ses articles habituels », « Ce n’est plus mon fournisseur »', mfo.length === 2 && /articles habituels/.test(mfo[0]) && /Ce n’est plus mon fournisseur/.test(mfo[1]), mfo);
  await R(() => { [...document.querySelectorAll('.ctx button')][1].click(); }); await attendre(300);
  const conf = await panneau(); v('retirer un fournisseur demande confirmation et dit ce qui reste', /Retirer Quincaillerie du Port \?/.test(conf) && /Ses articles restent/.test(conf), conf);
  await clic('#calque [data-fo^="retirer|"]'); await attendre(350);
  v('retiré : la liste revient à ' + fo.n + ' fournisseurs, la fenêtre est fermée, Annuler le rend', await R(() => MES_FOURN.length) === fo.n && !await R(() => !!document.querySelector('#calque .panneau')) && /Annuler/.test(await toast()));
  await annuler(); v('Annuler : le fournisseur est revenu (' + await R(() => MES_FOURN.length) + ')', await R(() => MES_FOURN.length) === fo.n + 1);
  await R(() => { MES_FOURN.splice(MES_FOURN.findIndex(o => o.nom === 'Quincaillerie du Port'), 1); rendre(); });
  // dans la liste du métier : le choix ouvre tout de suite les articles habituels
  await clic('#contenu .fx-tete [data-fo="liste"]'); const dir = await R(() => document.querySelectorAll('#calque .fx-dir').length);
  v('« Dans la liste de mon métier » : des fournisseurs à choisir (' + dir + ')', dir >= 3, dir);
  await clic('#calque .fx-dir [data-fo^="ajouter|"]'); await attendre(450);
  const ch = await R(() => ({ n:MES_FOURN.length, h2:(document.querySelector('#calque .panneau h2') || {}).textContent, txt:NB((document.querySelector('#calque .panneau') || {}).innerText || '') }));
  v('choisir un fournisseur : il est ajouté (' + ch.n + ') et ses articles habituels s’ouvrent tout de suite', ch.n === fo.n + 1 && /articles habituels|Préparer mes articles/i.test(ch.txt), ch);
  await annuler(); v('Annuler : il repart', await R(() => MES_FOURN.length) === fo.n && !await R(() => !!document.querySelector('#calque .panneau')));
  // ── 8. importer les prix, photographier une facture : se défont
  const ePrix = await etat();
  await clic('[data-fx="plus"]'); await R(() => { [...document.querySelectorAll('.ctx button')][0].click(); }); await attendre(300);
  const im = await panneau(); v('« Importer les prix d’un fournisseur » : trois étapes écrites, aucun « CSV » ni « FAB-DIS »', /1\. Choisis ton fichier de prix/.test(im) && /2\. Vérifie/.test(im) && /3\. Mets à jour mes prix/.test(im) && !/CSV|FAB-DIS/.test(im), im.slice(0, 200));
  await clic('#calque [data-fo="exemple"]'); await attendre(350); const im2 = await panneau(); v('le fichier d’exemple : « 2. Vérifie : N prix reconnus », puis un seul noir « Mettre à jour mes prix »', /2\. Vérifie : \d+ prix reconnus/.test(im2), im2.slice(0, 160));
  await clic('#calque [data-fo="appliquer"]'); await attendre(350); v('mettre à jour les prix change des articles et dit Annuler', await etat() !== ePrix && /Annuler/.test(await toast()));
  await annuler(); v('Annuler : les prix reviennent au centime', await etat() === ePrix);
  await clic('[data-vis="four-photo"]'); await attendre(300); const ph = await panneau(); v('l’appareil photo ouvre « Photographier une facture » : « Prendre en photo » et « Choisir un fichier »', /Photographier une facture/.test(ph) && /Prendre en photo/.test(ph) && /Choisir un fichier/.test(ph) && !/par l’IA|Devis IA/.test(ph), ph.slice(0, 200));
  await clic('#calque [data-fo="facex"]'); await attendre(350); const ph2 = await panneau(); v('la facture d’exemple : « J’ai lu N lignes », une hausse en toutes lettres (« +0,… € sur … »), un noir « Mettre à jour le stock et les prix »', /J’ai lu \d+ lignes? · /.test(ph2) && /\+\d+,\d\d € sur /.test(ph2) && /Mettre à jour le stock et les prix/.test(ph2), ph2.slice(0, 260));
  await clic('#calque [data-fo="facok"]'); await attendre(450); v('valider la facture change le stock et les prix, et dit Annuler', await etat() !== ePrix && /Annuler/.test(await toast()));
  await annuler(); v('Annuler : stock, prix, achats et journal reviennent à l’identique', await etat() === ePrix);
  v('aucune erreur de page pendant tout le parcours', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 120) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });   // un parcours qui plante est un parcours qui échoue
