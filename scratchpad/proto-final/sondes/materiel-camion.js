// Matériel, étape 1 (lot 1) — « Mon camion » du technicien, joué au doigt dans la vraie page (iPhone 390×844, Sophie) : la structure, la recherche,
// « Je l’ai pris » / « J’ai tout pris » avec leur Annuler au centime, le double appui, les TROIS portes d’un même envoi (écran Camion, clôture,
// fiche d’intervention), « Il me manque une pièce » jusqu’au panier du bureau, le sans-réseau, la pastille des envois refusés.
// Chaque contrôle compte d'abord sa population. Usage : node materiel-camion.js → « N ✓ · M ✗ »
const L = require('../lib.js');
const photo = () => `(() => ({ stock:JSON.stringify(PRODUITS.map(x => [x.id, x.q, x.loc || null])), att:MVTS_ATT.map(m => m.id).join(), mv:MVTS.length, dem:DEM_ACHAT.length, tac:TACHES.length, ntf:NOTIFS.length, jr:JOURNAL.length, sig:sxSig() }))()`;
(async () => {
  const c = await L.ouvrir({ profil:'iphone', qui:'sm' }), p = c.p, v = L.v;
  const R = (f, a) => p.evaluate(f, a), T = (s, o) => L.toucher(c, s, o), txt = s => p.evaluate(s2 => { const e = document.querySelector(s2); return e ? (e.textContent || '').replace(/[\s\u00a0\u202f]+/g, ' ').trim() : null; }, s);   // l'écran met une espace insécable avant « : » et « ? » : on les lit comme des espaces
  const PH = () => p.evaluate(photo());
  // 17 novembre (restes technicien 1) : le rappel du matin ne vit plus que sur Ma journée ; la pastille de Mon camion se mesure donc avec un VRAI message du bureau
  await R(() => { NOTIFS.push({ k: rlQui(), txt: 'Marc a validé ta demande de matériel.', d: AUJ, h: '09:50' }); });
  await L.aller(p, 'moncamion');
  // ── 1. la structure (l'essentiel, sans défiler) ──
  const S = await R(() => { const q = s => document.querySelector(s), vis = e => !!e && e.offsetParent !== null; const sig = [...document.querySelectorAll('#contenu button, #contenu input')].filter(vis);
    const manque = q('[data-vis="camion-manque"]'), h = q('#contenu h1');
    return { h1:h && h.textContent.trim(), sous:q('#contenu .tete .gris') && q('#contenu .tete .gris').textContent.trim(), ancienne:/Ce que tu as à bord, ce qui manque, ce que tu as pris ou utilisé/.test(document.getElementById('contenu').textContent),
      msg:q('.mc-msg') && q('.mc-msg').textContent.trim(), carteMsg:[...document.querySelectorAll('#contenu h3')].some(e => /Messages du bureau/i.test(e.textContent)),
      cherche:!!q('[data-vis="camion-cherche"] input#mc-q'), utilise:q('[data-vis="camion-utilise"]') && q('[data-vis="camion-utilise"]').textContent.trim(), noir:q('[data-vis="camion-utilise"]') && q('[data-vis="camion-utilise"]').className,
      duo:[...document.querySelectorAll('.mc-duo .btn')].map(b => b.textContent.trim()), titre:manque && manque.querySelector('h3').textContent.trim(), tout:manque && (manque.querySelector('[data-mat="toutpris"]') || {}).textContent,
      lignes:manque ? manque.querySelectorAll('.mc-l').length : 0, boutons:manque ? [...manque.querySelectorAll('.mc-l .btn')].map(b => b.textContent.trim()) : [],
      basManque:manque ? Math.round(manque.querySelector('.mc-l').getBoundingClientRect().bottom) : 9999, H:innerHeight,
      avant:manque ? sig.filter(e => e.getBoundingClientRect().top < manque.querySelector('.mc-l').getBoundingClientRect().top).length : 99,
      bordPlie:q('.mc-bord') && q('.mc-bord').getAttribute('aria-expanded'), envois:[...document.querySelectorAll('#contenu .mc-liste')].filter(e => /Mes envois/.test(e.textContent)).length, etats:[...document.querySelectorAll('.mc-l .st')].map(e => e.textContent.trim()) }; });
  // 17 novembre : le chantier Véhicules dit l'ÉTAT du camion sous le titre (« Tout est en règle. », « Ton camion est au garage… ») et le véhicule au-dessus (« RENAULT TRAFIC · plaque »)
  v('titre « Mon camion », une seule phrase d\'état du véhicule dessous (« Papiers et entretien : en règle. »)', S.h1 === 'Mon camion' && /^(Papiers et entretien\s: en règle\.|Ton camion|Ce camion|Ton souci|.* est .*Le bureau s’en occupe\.)/.test(S.sous), S);
  v('la longue phrase d’avant a disparu', !S.ancienne);
  v('la carte « Messages du bureau » n’est plus un bloc : une pastille « 1 message du bureau › »', !S.carteMsg && /^1 message du bureau ›$/.test(S.msg || ''), [S.carteMsg, S.msg]);
  v('champ « Chercher une pièce » présent (data-vis camion-cherche)', S.cherche);
  v('un seul bouton NOIR « J’ai utilisé chez un client » (pleine largeur) puis deux gris', S.utilise === 'J’ai utilisé chez un client' && /btn large/.test(S.noir) && !/gris/.test(S.noir) && JSON.stringify(S.duo) === JSON.stringify(['J’ai pris à l’atelier', 'Il me manque une pièce']), [S.utilise, S.noir, S.duo]);
  v('carte « Il manque à bord · 3 » avec « J’ai tout pris · 3 » et trois « Je l’ai pris »', S.titre.replace(/\u00a0/g, ' ') === 'Il manque à bord · 3' && /J’ai tout pris · 3/.test(S.tout || '') && S.lignes === 3 && S.boutons.filter(b => b === 'Je l’ai pris').length === 3, S);
  v('GESTE 1 : ce qui manque est visible SANS défiler (première ligne avant le bas de l’écran) — ' + S.basManque + ' px sur ' + S.H, S.basManque < S.H - 90, S.basManque);
  v('densité : au plus 12 éléments touchables avant la première ligne de donnée (population ' + S.avant + ')', S.avant >= 4 && S.avant <= 12, S.avant);
  v('« À bord · 6 articles » est REPLIÉ au départ', S.bordPlie === 'false' && S.lignes === 3);
  v('« Mes envois » : une carte, avec « En attente du bureau » et « Accepté »', S.envois === 1 && S.etats.includes('En attente du bureau') && S.etats.includes('Accepté'), S.etats);
  await T('[data-mat="bord"]');
  const B = await R(() => ({ ouvert:document.querySelector('.mc-bord').getAttribute('aria-expanded'), n:[...document.querySelectorAll('.mc-liste')].filter(e => !e.hasAttribute('data-vis') && !/Mes envois/.test(e.textContent)).reduce((s, e) => s + e.querySelectorAll('.mc-l').length, 0), txt:(document.getElementById('contenu').textContent || '').replace(/\s+/g, ' ') }));
  v('« À bord » se déplie : six articles en lecture, avec « il en manque N sur M »', B.ouvert === 'true' && B.n === 6 && /il en manque 0,5 sur 3|il en manque 1 sur 3/.test(B.txt), B.n);
  await T('[data-mat="bord"]');
  // ── 2. la recherche : où est la pièce, combien — jamais un prix ──
  await p.fill('#mc-q', 'filtre'); await L.calme(p, 250);
  const Q = await R(() => { const r = document.getElementById('mc-res'); return { t:r.textContent.replace(/\s+/g, ' ').trim(), btn:[...r.querySelectorAll('[data-mat^="pris|"]')].length, eur:/€|\d\s?€/.test(r.textContent) }; });
  v('recherche « filtre » : réponse en phrase « mon camion 2 · atelier 5 · camion de Karim … » avec les quantités', /Filtre à charbon/.test(Q.t) && /mon camion 2 · atelier \d/.test(Q.t) && /camion de Karim \d/.test(Q.t), Q.t);
  v('la recherche n’affiche AUCUN prix', !Q.eur, Q.t);
  v('« Je l’ai pris » sur la ligne de l’atelier', Q.btn >= 1, Q.btn);
  await p.fill('#mc-q', 'condensateur'); await L.calme(p, 250);
  v('un article qui n’est nulle part se montre : « Plus en stock nulle part » et « Il me manque »', /Condensateur 5 µF/.test(await txt('#mc-res')) && /Plus en stock nulle part/.test(await txt('#mc-res')) && await R(() => !!document.querySelector('#mc-res [data-mat="manque|p3"]')), await txt('#mc-res'));
  await p.fill('#mc-q', 'xyzzy'); await L.calme(p, 200);
  v('recherche sans résultat : « Rien trouvé pour « xyzzy » » et le chemin « Il me manque une pièce »', /Rien trouvé pour « xyzzy »/.test(await txt('#mc-res')) && await R(() => !!document.querySelector('#mc-res [data-mat^="manque|"]')));
  await p.fill('#mc-q', ''); await L.calme(p, 150);
  v('champ vidé : la réponse disparaît', (await txt('#mc-res')) === '');
  // ── 3. « Je l’ai pris » : une demande, la ligne devient grise, Annuler au centime ──
  const a0 = await PH();
  await T('[data-vis="camion-manque"] [data-mat^="pris|"]');
  const a1 = await PH(), G = await R(() => ({ gris:[...document.querySelectorAll('.mc-l.envoye')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), tout:(document.querySelector('[data-mat="toutpris"]') || {}).textContent, toast:((document.getElementById('toast') || {}).textContent || '').replace(/[\u00a0\u202f]/g, ' '), restants:document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length }));
  v('« Je l’ai pris » : UNE ligne de plus dans les envois à accepter (2 → 3)', a0.att.split(',').length === 2 && a1.att.split(',').length === 3, [a0.att, a1.att]);
  v('le stock ne bouge PAS avant l’accord du bureau', a0.stock === a1.stock);
  v('la ligne devient grise « Envoyé au bureau · en attente » avec « Annuler », et son bouton ne se redonne pas', G.gris.length === 1 && /Envoyé au bureau · en attente/.test(G.gris[0]) && /Annuler/.test(G.gris[0]) && G.restants === 2, G);
  v('« J’ai tout pris » passe de 3 à 2', /J’ai tout pris · 2/.test(G.tout || ''), G.tout);
  v('le message dit « Envoyé au bureau » et propose Annuler', /Envoyé au bureau/.test(G.toast || '') && /Annuler/.test(G.toast || ''), G.toast);
  await T('#toast button');
  const a2 = await PH();
  v('Annuler (message) : tout revient comme avant, au centime (stock, envois, journal)', a2.stock === a0.stock && a2.att === a0.att && a2.mv === a0.mv, [a2.att, a0.att]);
  // « J’ai tout pris »
  await T('[data-mat="toutpris"]');
  const b1 = await PH();
  v('« J’ai tout pris · 3 » : trois demandes d’un coup, toutes les lignes grises, plus de bouton', b1.att.split(',').length === 5 && (await R(() => document.querySelectorAll('.mc-l.envoye').length === 3 && !document.querySelector('[data-mat="toutpris"]') && document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length === 0)), b1.att);
  await T('#toast button');
  v('Annuler « J’ai tout pris » : retour exact', (await PH()).att === a0.att && (await PH()).stock === a0.stock);
  // l'« Annuler » de la ligne grise
  await T('[data-vis="camion-manque"] [data-mat^="pris|"]'); await T('.mc-l.envoye [data-mat^="retire|"]');
  const r1 = await PH();
  v('« Annuler » sur la ligne grise retire la demande et rend le bouton', r1.att === a0.att && (await R(() => document.querySelectorAll('.mc-l.envoye').length === 0)), r1.att);
  // sans validation (le bureau n'a rien à accepter) : le stock bouge tout de suite, Annuler le rend
  await R(() => { STK_VALID = false; rendre(); }); await L.calme(p, 300);
  const s0 = await PH(); await T('[data-vis="camion-manque"] [data-mat^="pris|"]'); const s1 = await PH();
  v('sans validation du bureau : le stock bouge tout de suite (la ligne quitte « Il manque »)', s1.stock !== s0.stock && s1.att === s0.att, [s0.stock === s1.stock]);
  await T('#toast button'); const s2 = await PH();
  v('… et Annuler le remet au centime', s2.stock === s0.stock && s2.mv === s0.mv);
  await R(() => { STK_VALID = true; rendre(); });
  // ── 3 bis. l'atelier n'en a pas assez : on ne note que ce qu'il y a (sinon « Annuler » ou l'accord du gérant ferait tomber un stock sous zéro) ──
  const LIM = await R(() => { const b = [...document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]')].pop(); if (!b) return null; const pid = b.dataset.mat.split('|')[1], x = PRODUITS.find(o => o.id === pid), man = lieuManques(sxMonLieu().id).find(o => o.x.id === pid).manque, q0 = x.q;
    x.q = stkR(Object.values(x.loc || {}).reduce((s, n) => s + n, 0) + 0.5); rendre(); const at = stkAt(x, 'atelier'); document.querySelector('[data-vis="camion-manque"] [data-mat="pris|' + pid + '"]').click();
    const m = MVTS_ATT[0], r = { pid, man, at, q:m && m.q, pid2:m && m.pid }; MVTS_ATT.shift(); x.q = q0; rendre(); return r; });
  v('l\'atelier n\'en a que 0,5 pour 1 qui manque : la demande dit 0,5, pas 1 (population : manque ' + (LIM && LIM.man) + ')', !!LIM && LIM.man >= 1 && LIM.at === 0.5 && LIM.q === 0.5 && LIM.pid2 === LIM.pid, LIM);
  await L.calme(p, 200);
  // ── 4. double appui : jamais deux demandes ──
  const d0 = await PH();
  const dbl = await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); const n0 = MVTS_ATT.length; b.click(); b.click(); return { n0, n1:MVTS_ATT.length }; });
  v('double appui sur « Je l’ai pris » : UNE seule demande (' + dbl.n0 + ' → ' + dbl.n1 + ')', dbl.n1 === dbl.n0 + 1, dbl);
  const dbl2 = await R(() => { const n0 = MVTS_ATT.length; matPrendre(['p5']); matPrendre(['p5']); return { n0, n1:MVTS_ATT.length, ex:!!PRODUITS.find(x => x.id === 'p5') }; });
  v('deux appels de matPrendre sur le même article : au plus UNE demande de plus', dbl2.n1 <= dbl2.n0 + 1, dbl2);
  await R(() => { MVTS_ATT.splice(0, MVTS_ATT.length, ...MVTS_ATT.filter(m => ['a1', 'a2'].includes(m.id))); rendre(); }); await L.calme(p, 300);
  // ── 5. la feuille « J’ai utilisé chez un client » depuis l’écran Camion ──
  await T('[data-mat="usage"]');
  const U = await R(() => ({ titre:document.querySelector('#calque h2').textContent, inter:document.querySelector('.mat-inter').textContent.replace(/\s+/g, ' '), pourquoi:(document.querySelector('.mat-pourquoi') || {}).textContent, dis:document.querySelector('[data-mat="envoyer"]').disabled, rech:!!document.getElementById('mat-q'), dans:/Dans ton camion/.test(document.getElementById('mat-res').textContent), lignes:document.querySelectorAll('.mat-l').length }));
  v('feuille : « J’ai utilisé chez un client », intervention du jour déjà choisie avec « Changer »', U.titre === 'J’ai utilisé chez un client' && /Dépannage climatisation · Restaurant Le Vieux Port/.test(U.inter) && /aujourd’hui 08:30/.test(U.inter) && /Changer/.test(U.inter), U.inter);
  v('rien choisi : le bouton est grisé ET une ligne dit pourquoi (« Choisis un article. »)', U.dis === true && U.pourquoi === 'Choisis un article.', U);
  v('« Dans ton camion » : les articles du camion d’abord', U.dans && U.rech);
  await p.fill('#mat-q', 'liaison'); await L.calme(p, 200); await T('#calque [data-mat^="ajoute|"]');
  const U2 = await R(() => ({ phrase:document.querySelector('.mat-phrase').textContent, btn:document.querySelector('[data-mat="envoyer"]').textContent.trim().replace(/[\u00a0\u202f]/g, ' '), dis:document.querySelector('[data-mat="envoyer"]').disabled, val:document.querySelector('[data-matq="0"]').value }));
  v('un article choisi : phrase de contrôle « Tu notes : … utilisé chez … » et « Envoyer : 1 article »', /^Tu notes : 0,5 m de Liaison frigorifique .* utilisé chez Restaurant Le Vieux Port\.$/.test(U2.phrase.replace(/[\u00a0\u202f]/g, ' ')) && U2.btn === 'Envoyer : 1 article' && !U2.dis, U2);
  await T('#calque [data-mat="plus|0"]'); await T('#calque [data-mat="plus|0"]');
  v('« + » ajoute au pas de l’unité (0,5 m deux fois : 1,5)', (await R(() => document.querySelector('[data-matq="0"]').value)) === '1,5');
  await p.fill('#calque [data-matq="0"]', '999'); await p.keyboard.press('Tab'); await L.calme(p, 300);
  v('plus que le camion n’en a : la quantité est ramenée à ce qu’il y a, et le message le dit', (await R(() => document.querySelector('[data-matq="0"]').value)) === '10' && /Il n’y en a que 10 m/.test(await txt('#toast')), await txt('#toast'));
  await p.fill('#calque [data-matq="0"]', '2'); await p.keyboard.press('Tab'); await L.calme(p, 300);
  const e0 = await PH(); await T('#calque [data-mat="envoyer"]'); const e1 = await PH();
  const env = await R(() => { const m = MVTS_ATT[0]; return { type:m.type, pid:m.pid, q:m.q, de:m.de, qui:m.qui, inter:m.inter, motif:m.motif, toast:(document.getElementById('toast') || {}).textContent, panneau:!!document.querySelector('#calque .panneau') }; });
  v('envoi : une sortie du camion de Sophie, sur son intervention, 2 m, « Utilisé chez le client »', env.type === 'sortie' && env.de === 'v1' && env.qui === 'sm' && env.inter === 'i1' && env.q === 2 && /Utilisé chez le client/.test(env.motif) && e1.att.split(',').length === 3, env);
  v('la feuille se ferme, le message dit « Envoyé au bureau » avec Annuler', !env.panneau && /Envoyé au bureau/.test(env.toast || '') && /Annuler/.test(env.toast || ''), env.toast);
  await T('#toast button'); v('Annuler : retour exact', (await PH()).att === e0.att && (await PH()).stock === e0.stock);
  // ── 5 bis. un fluide frigorigène : « kilos récupérés » dans la même feuille, la trace du registre, et Annuler défait aussi cela ──
  // (le même envoi attend déjà dans les données de départ : « Déjà envoyé » le refuserait, c'est la règle de la double demande ; on l'écarte le temps de l'essai)
  const A2 = await R(() => { const k = MVTS_ATT.findIndex(m => m.id === 'a2'); const m = k >= 0 ? MVTS_ATT.splice(k, 1)[0] : null; rendre(); return { k, m }; });
  v('population : l\'envoi de départ « a2 » existait (rangé le temps de l\'essai du fluide)', A2.k >= 0 && !!A2.m, A2.k);
  await T('[data-mat="usage"]'); await p.fill('#mat-q', 'fluide'); await L.calme(p, 200); await T('#calque [data-mat^="ajoute|"]');
  const FL0 = await R(() => ({ reg:SX.reg.length, bout:JSON.stringify(SX.bout.map(b => [b.id, b.reste])), champ:!!document.querySelector('#calque [data-matr="0"]'), lib:(document.querySelector('#calque .mat-fl') || {}).textContent }));
  v('fluide : le champ « Kilos récupérés » paraît dans la feuille (population : ' + FL0.reg + ' lignes de registre)', FL0.champ && /Kilos récupérés/.test(FL0.lib || '') && FL0.reg >= 1, FL0);
  await p.fill('#calque [data-matr="0"]', '1,8'); await p.keyboard.press('Tab'); await L.calme(p, 200);
  await T('#calque [data-mat="envoyer"]');
  const FL1 = await R(() => ({ reg:SX.reg.length, d:SX.reg[0], bout:JSON.stringify(SX.bout.map(b => [b.id, b.reste])) }));
  v('fluide envoyé : une ligne de registre « à retraiter » avec 1,8 kg récupérés, la bouteille de récupération monte', FL1.reg === FL0.reg + 1 && FL1.d.recup === 1.8 && FL1.d.inter === 'i1' && FL1.bout !== FL0.bout, FL1);
  await T('#toast button');
  const FL2 = await R(() => ({ reg:SX.reg.length, bout:JSON.stringify(SX.bout.map(b => [b.id, b.reste])) }));
  v('Annuler : le registre et la bouteille reviennent au centime', FL2.reg === FL0.reg && FL2.bout === FL0.bout, FL2);
  await R(a => { MVTS_ATT.splice(Math.min(a.k, MVTS_ATT.length), 0, a.m); rendre(); }, A2);
  // ── 6. les TROIS portes mènent à la MÊME feuille ──
  // porte 2 : la clôture
  await R(() => { const F = fiche('i1'); F.pieces = [{ nom:'Condensateur 5 µF', q:'1' }, { nom:'Filtre à charbon', q:'2' }]; sxIntProposer('i1'); }); await L.calme(p, 300);
  const C1 = await R(() => ({ titre:document.querySelector('#calque h2').textContent.replace(/\u00a0/g, ' '), ok:(document.querySelector('[data-mat="envoyer"]') || {}).textContent, mod:!!document.querySelector('[data-mat="modifier"]'), lignes:document.querySelectorAll('.mat-l').length, rech:!!document.getElementById('mat-q'), noms:[...document.querySelectorAll('.mat-l b')].map(e => e.textContent), surtitre:document.querySelector('#calque .surtitre').textContent }));
  v('clôture : « Noter les pièces utilisées ? », lignes déjà remplies, « C’est bon » / « Modifier », sans champ de recherche', C1.titre === 'Noter les pièces utilisées ?' && C1.ok === 'C’est bon' && C1.mod && C1.lignes >= 1 && !C1.rech, C1);
  await T('#calque [data-mat="modifier"]');
  v('« Modifier » : la même feuille s’ouvre à la saisie (recherche, « Envoyer : N »)', await R(() => !!document.getElementById('mat-q') && /^Envoyer/.test(document.querySelector('[data-mat="envoyer"]').textContent) && document.querySelector('#calque h2').textContent.replace(/\u00a0/g, ' ') === 'Noter les pièces utilisées ?'));
  await T('#calque [data-mat="envoyer"]');
  v('… et un seul envoi part pour la clôture', (await PH()).att.split(',').length >= 3);
  await R(() => { MVTS_ATT.splice(0, MVTS_ATT.length, ...MVTS_ATT.filter(m => ['a1', 'a2'].includes(m.id))); rendre(); });
  // porte 3 : la fiche d'intervention (« Pièces et produits utilisés »)
  await L.aller(p, 'inter-x-i1'); await L.calme(p, 500);
  const F3 = await R(() => { const n = document.getElementById('p-nom'), q = document.getElementById('p-q'), b = document.querySelector('[data-action="pieceAjout"]'); if (!n || !b) return { absent:true, html:document.getElementById('contenu').textContent.slice(0, 120) };
    n.value = 'Filtre à charbon'; q.value = '1'; b.click(); return { absent:false }; });
  await L.calme(p, 400);
  const F3b = await R(() => ({ titre:(document.querySelector('#calque h2') || {}).textContent, ok:(document.querySelector('[data-mat="envoyer"]') || {}).textContent, lignes:document.querySelectorAll('#calque .mat-l').length }));
  v('fiche d’intervention : la pièce ajoutée ouvre la MÊME feuille « Noter les pièces utilisées ? »', !F3.absent && (F3b.titre || '').replace(/\u00a0/g, ' ') === 'Noter les pièces utilisées ?' && F3b.ok === 'C’est bon' && F3b.lignes === 1, [F3, F3b]);
  await L.ranger(p);
  // porte 3 bis : « Il me manque une pièce » depuis l'intervention = la fenêtre de Mon camion
  const pm = await R(() => { const b = document.querySelector('[data-pdx^="pm|"]'); if (b) b.click(); return !!b; }); await L.calme(p, 400);
  const PM = await R(() => ({ titre:(document.querySelector('#calque h2') || {}).textContent, inter:(document.querySelector('#calque .mat-inter') || {}).textContent, envoi:!!document.querySelector('[data-mat="menvoyer"]'), ancien:!!document.getElementById('pdx-pm-nom') }));
  v('fiche d’intervention : « Il me manque une pièce » ouvre la même fenêtre (intervention déjà choisie, pas l’ancienne)', pm && PM.titre === 'Il me manque une pièce' && PM.envoi && !PM.ancien && /Dépannage climatisation/.test(PM.inter || ''), PM);
  await L.ranger(p); await L.aller(p, 'moncamion');
  // ── 7. « Il me manque une pièce » jusqu'au panier du bureau ──
  const ZP = await R(() => { const ids = new Set(cmdPaniers().flatMap(pp => pp.lignes).map(l => l.k)); const x = PRODUITS.find(o => !o.retire && !ids.has(o.id) && o.q > (o.seuil || 0) && o.pa && !DEM_ACHAT.some(d => d.pid === o.id)); return x ? { id:x.id, nom:x.nom, n:cmdNbACommander() } : null; });
  v('population : un article du catalogue hors panier existe pour l’essai (' + (ZP && ZP.nom) + ')', !!ZP);
  await T('[data-mat="manque"]');
  const M0 = await R(() => ({ dis:document.querySelector('[data-mat="menvoyer"]').disabled, pourquoi:(document.querySelector('.mat-pourquoi') || {}).textContent, quand:[...document.querySelectorAll('.mat-quand .puce-c')].map(b => b.textContent.trim()), inter:document.querySelector('#calque .mat-inter').textContent.replace(/\s+/g, ' ') }));
  v('rien choisi : « Prévenir le bureau » est grisé et dit pourquoi', M0.dis === true && /Choisis une pièce/.test(M0.pourquoi || ''), M0);
  v('« Pour quand ? » : Aujourd’hui · Demain · Cette semaine · Sans urgence', JSON.stringify(M0.quand) === JSON.stringify(['Aujourd’hui', 'Demain', 'Cette semaine', 'Sans urgence']), M0.quand);
  v('« Pour quelle intervention ? » : celle du jour est déjà choisie', /Dépannage climatisation · Restaurant Le Vieux Port/.test(M0.inter), M0.inter);
  await p.fill('#mm-rech', ZP.nom.slice(0, 6)); await L.calme(p, 250); await T('#calque [data-mat^="mpiece|"]');
  await T('#calque [data-mat="mplus"]'); await T('#calque [data-mat="mquand|dem"]'); await p.fill('#mm-why', 'mise en service lundi'); await L.calme(p, 150);
  const n0 = await PH(); await T('#calque [data-mat="menvoyer"]'); const n1 = await PH();
  const DM = await R(() => { const d = DEM_ACHAT[0], t = TACHES.find(o => o.id === d.tache); return { qui:d.qui, pid:d.pid, q:d.q, quand:d.quand, int:d.int, why:d.pourquoi, etat:d.etat, tache:!!t, tt:t && t.t, nb:cmdNbACommander(), ntf:NOTIFS[NOTIFS.length - 1].txt, demain:jour(1) }; });
  v('envoi : UNE demande (qui Sophie, l’article, 2, demain, l’intervention, le pourquoi) + la tâche de commande + le message au gérant', DM.qui === 'sm' && DM.pid === ZP.id && DM.q === 2 && DM.quand === DM.demain && DM.int === 'i1' && /mise en service lundi/.test(DM.why) && DM.tache && /Sophie demande 2/.test(DM.ntf), DM);
  v('« À commander » du bureau : l’article y est UNE fois (' + ZP.n + ' → ' + DM.nb + '), pas deux (tâche + demande)', DM.nb === ZP.n + 1, DM);
  await T('#toast button'); const n2 = await PH();
  v('Annuler : la demande, la tâche et le message au gérant disparaissent', n2.dem === n0.dem && n2.tac === n0.tac && n2.ntf === n0.ntf && n2.jr === n0.jr, [n0, n2]);
  // sans intervention : la demande seule entre dans le panier, « Demandé par Sophie »
  await T('[data-mat="manque"]'); await p.fill('#mm-rech', ZP.nom.slice(0, 6)); await L.calme(p, 250); await T('#calque [data-mat^="mpiece|"]'); await T('#calque [data-mat="minter|"]');
  await T('#calque [data-mat="menvoyer"]');
  const DN = await R(() => { const d = DEM_ACHAT[0], l = cmdPaniers().flatMap(pp => pp.lignes).find(o => o.k === d.pid); return { tache:d.tache || null, int:d.int || null, nb:cmdNbACommander(), pourquoi:l && l.pourquoi }; });
  v('sans intervention : pas de tâche, mais la demande entre dans le panier avec « Demandé par Sophie »', !DN.tache && !DN.int && DN.nb === ZP.n + 1 && /Demandé par Sophie/.test(DN.pourquoi || ''), DN);
  await T('[data-mat="manque"]'); await p.fill('#mm-rech', ZP.nom.slice(0, 6)); await L.calme(p, 250); await T('#calque [data-mat^="mpiece|"]'); await T('#calque [data-mat="minter|"]'); await T('#calque [data-mat="menvoyer"]');
  v('redemander la même pièce : refusé en une phrase, aucune seconde demande', /Tu as déjà demandé cette pièce/.test(await txt('#toast')) && (await R(() => DEM_ACHAT.filter(d => d.pid && d.qui === 'sm' && d.etat === 'attente').length)) === 1);
  // texte libre : hors catalogue, ne compte pas dans « à commander » mais arrive chez le bureau
  await T('[data-mat="manque"]'); await T('#calque [data-mat="mlibre"]'); await p.fill('#mm-texte', 'Échelle 3 plans'); await L.calme(p, 150); await T('#calque [data-mat="minter|"]'); await T('#calque [data-mat="menvoyer"]');
  const LB = await R(() => ({ d:DEM_ACHAT[0].quoi, pid:DEM_ACHAT[0].pid, nb:cmdNbACommander() }));
  v('hors catalogue (« Échelle 3 plans ») : la demande part au bureau, sans article, sans fausser « à commander »', LB.d === 'Échelle 3 plans' && !LB.pid && LB.nb === DN.nb, LB);
  // ── 8. sans réseau : l'envoi attend, il part quand ça revient ──
  await T('[data-mat="usage"]'); await p.fill('#mat-q', 'liaison'); await L.calme(p, 200); await T('#calque [data-mat^="ajoute|"]');
  const o0 = await PH(); await c.ctx.setOffline(true); await p.waitForTimeout(200);
  const hors0 = await R(() => navigator.onLine); await T('#calque [data-mat="envoyer"]');
  const o1 = await PH(), H = await R(() => ({ file:MAT.file.length, toast:(document.getElementById('toast') || {}).textContent, envois:document.getElementById('contenu').textContent.replace(/[\s\u00a0]+/g, ' ') }));
  v('sans réseau : rien ne part, le message le dit (« Pas de réseau : ton envoi partira dès que ça revient. »)', hors0 === false && o1.att === o0.att && H.file === 1 && /Pas de réseau : ton envoi partira dès que ça revient\./.test((H.toast || '').replace(/[\u00a0\u202f]/g, ' ')), [hors0, H.file, H.toast]);
  v('« Mes envois » montre l’envoi en attente de réseau', /Part dès que le réseau revient/.test(H.envois));
  await c.ctx.setOffline(false); await p.waitForTimeout(500); await L.calme(p, 300);
  const o2 = await PH(), H2 = await R(() => MAT.file.length);
  v('le réseau revient : l’envoi PART (une demande de plus, la file est vidée)', o2.att.split(',').length === o0.att.split(',').length + 1 && H2 === 0, [o0.att, o2.att, H2]);
  // ── 9. la pastille de la barre du bas : les envois REFUSÉS (ni les messages, ni ce qui manque) ──
  const P0 = await R(() => rlPastille('moncamion')); 
  v('pastille Camion : 0 tant que rien n’est refusé (3 articles manquent, 1 message : ni l’un ni l’autre ne comptent)', P0 === 0, P0);
  await R(() => { SX.refus.unshift({ id:'rf-essai', m:{ ...MVTS_ATT[MVTS_ATT.length - 1], id:'zz', qui:'sm' }, motif:'Trop cher', d:AUJ, h:'09:00' }); rendre(); }); await L.calme(p, 300);
  const P1 = await R(() => ({ n:rlPastille('moncamion'), refuse:[...document.querySelectorAll('.mc-l .st-r')].map(e => e.textContent.trim().replace(/[\u00a0\u202f]/g, ' ')), bar:(document.querySelector('.opg-tab[data-tab="moncamion"] .nb') || {}).textContent || null }));
  v('un envoi refusé : la pastille passe à 1 et la ligne dit « Refusé : Trop cher »', P1.n === 1 && P1.refuse.some(t => /Refusé : Trop cher/.test(t)), P1);
  v('la pastille s’affiche dans la barre du bas', P1.bar === '1', P1.bar);
  await T('.mc-l [data-mat^="oublie|"]');
  v('« Retirer » un refus : la ligne et la pastille s’en vont', (await R(() => rlPastille('moncamion'))) === 0);
  // ── 9 bis. camion au garage : une phrase, ni carte « Il manque », ni « J'ai tout pris » (un camion au garage n'est pas à remplir) ──
  await R(() => { VEHICULES.find(o => o.lieu === sxMonLieu().id).statut = 'atelier'; rendre(); }); await L.calme(p, 300);
  const GA = await R(() => ({ phrase:(document.querySelector('.mc-etat') || {}).textContent, tout:!!document.querySelector('[data-mat="toutpris"]'), pastille:rlPastille('moncamion'), trois:document.querySelectorAll('.mc-gros button').length }));
  v('camion au garage : la phrase « Ton camion est au garage. », aucun « J’ai tout pris », les trois gros boutons restent', /^Ton camion est au garage/.test(GA.phrase || '') && !GA.tout && GA.trois === 3, GA);
  await R(() => { VEHICULES.find(o => o.lieu === sxMonLieu().id).statut = 'service'; rendre(); }); await L.calme(p, 300);
  v('… et de retour en service : la phrase du garage disparaît', (await R(() => !/au garage/.test((document.querySelector('.mc-etat') || {}).textContent || ''))));
  // ── 9 ter. l'emplacement réservé à la partie Véhicule (chantier voisin) : un conteneur vide, à l'identifiant stable, dernier de la page ──
  const VH = await R(() => { const e = document.getElementById('mc-vehicule'), liste = document.querySelector('[data-vis="camion-manque"]'); return { existe:!!e, rempli:!!e && !!e.querySelector('.vh-cam'), vis:e && e.getAttribute('data-vis'), avant:!!e && !!liste && !!(e.compareDocumentPosition(liste) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  v('« mc-vehicule » : le conteneur à l\'identifiant stable, data-vis « camion-vehicule », rempli par la carte « Le camion » du chantier Véhicules, posée AVANT « Il manque à bord »', VH.existe && VH.rempli && VH.vis === 'camion-vehicule' && VH.avant, VH);
  // ── 10. un technicien n'a ni prix ni valeur dans Mon camion ──
  await T('[data-mat="bord"]');   // la liste « À bord » dépliée : elle aussi est lue (elle écrit « plus que la liste », jamais un prix)
  const EU = await R(() => (document.getElementById('contenu').textContent.match(/\d[\d\s  ]*(?:,\d+)?\s?€/g) || []).length);
  const NB = await R(() => document.querySelectorAll('.mc-bord[aria-expanded="true"] ~ .mc-liste .mc-l').length);
  v('aucun montant en euros dans Mon camion (liste « À bord » dépliée : population ' + NB + ' lignes)', EU === 0 && NB >= 4, [EU, NB]);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
