// SONDE « devis de bout en bout » : les clients et le catalogue arrivent dans l'atelier AU CENTIME, un devis se compose par les gestes de la personne, le TTC est RECALCULÉ ici,
// la liste du prototype, ses onglets et ses quatre chiffres le comptent, on le rouvre, on l'envoie, on recharge. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const nb = t => parseInt(String(t).replace(/\s/g, '').match(/^\d+/)[0], 10);
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', qui: 'marc' }), p = c.p;
  await L.aller(p, 'devis');
  // ── population ──
  const P = await p.evaluate(() => ({ clients: Object.keys(CLIENTS).length, vend: PRODUITS.filter(x => prVend(x) && !x.retire && PACKS_ENT.includes(x.p)).length }));
  v('population : des clients et des articles vendables côté prototype', P.clients >= 5 && P.vend >= 10, P);
  const k0 = await p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ b: k.querySelector('b').textContent, s: k.querySelector('span').textContent })));
  v('population : quatre chiffres en haut de Devis', k0.length === 4, k0);
  v('les deux boutons de création portent leurs mots', (await p.locator('[data-opd="devis"]').first().textContent()).trim() === 'Composer un devis' && (await p.locator('[data-dv="nouveau"]').first().textContent()).trim() === 'Devis rapide');
  const avant = { liste: await p.locator('#contenu .opd-l').count() };
  // ── l'atelier s'ouvre, les données arrivent ──
  const f = await A.ouvrirAtelier(c, 'devis', null);
  v('l\'atelier s\'ouvre dans un cadre (fenêtre « Nouveau devis »)', !!f && /Nouveau devis/.test(await f.evaluate(() => (document.querySelector('.fenetre') || {}).textContent || '')));
  const D = await f.evaluate(() => ({ cl: S.clients.map(x => [x.id, x.nom, x.pro, x.adresse, x.cp, x.ville, x.email, x.tel, x.contact || '']), cat: CATALOGUE.map(a => [a.ref, a.des, a.unite, a.puC, a.tvaBp]), ent: ENTREPRISE.nom + '|' + ENTREPRISE.siret + '|' + ENTREPRISE.iban + '|' + ENTREPRISE.rcs + '|' + ENTREPRISE.forme + '|' + ENTREPRISE.capital + '|' + ENTREPRISE.assureur + '|' + ENTREPRISE.bic }));
  const att = await p.evaluate(() => ({ cl: Object.entries(CLIENTS).map(([k, x]) => [k, x.nom, x.type === 'pro', x.mail, x.tel]), cat: PRODUITS.filter(x => prVend(x) && !x.retire && PACKS_ENT.includes(x.p)).sort((a, b) => (a.o || 99) - (b.o || 99)).map(x => [x.ref || x.id, x.nom, x.u || 'u', Math.round(x.pv * 100), Math.round((x.tva == null ? 20 : x.tva) * 100)]), ent: [ENTREPRISE.nom, ENTREPRISE.siret, ENTREPRISE.iban] }));
  v('clients reçus : même nombre, mêmes identifiants, mêmes noms, types, e-mails, téléphones', D.cl.length === att.cl.length && att.cl.every((x, i) => D.cl[i][0] === x[0] && D.cl[i][1] === x[1] && D.cl[i][2] === x[2] && D.cl[i][6] === x[3] && D.cl[i][7] === x[4]), [D.cl.length, att.cl.length]);
  v('catalogue reçu AU CENTIME : même nombre, mêmes références, mêmes prix, mêmes taux de TVA', D.cat.length === att.cat.length && att.cat.every((x, i) => D.cat[i][0] === x[0] && D.cat[i][3] === x[3] && D.cat[i][4] === x[4] && D.cat[i][1] === x[1]), [D.cat.length, att.cat.length]);
  v('population : un prix à décimale (au centime) est bien dans le catalogue', att.cat.some(x => x[3] % 100 !== 0), att.cat.slice(0, 3));
  v('aucune valeur d\'exemple d\'atelier : forme, capital, RCS, assureur, BIC vides', /^Clim Services 17\|123 456 789 00012\|FR76 3000 6000 0112 3456 7890 189\|\|\|\|\|$/.test(D.ent), D.ent);
  v('l\'IBAN du prototype a une clé de contrôle valide (l\'atelier le vérifierait)', await f.evaluate(() => ibanOk(ENTREPRISE.iban)));
  v('contact sans fonction : « Mme Bernard » (jamais « Mme Bernard, directrice »), société = pas de contact', await f.evaluate(() => { const g = id => S.clients.find(x => x.id === id); return g('hp').contact === 'Mme Bernard' && g('vp').contact === 'Marc Durand' && g('mi').contact === undefined; }));
  v('dans OP GESTION : pas d\'accueil derrière la fenêtre de composition (il n\'est pas « hidden » à ce moment : seule la règle d\'OP GESTION le cache), retour libellé « OP GESTION »', await f.evaluate(() => getComputedStyle(document.getElementById('vue-accueil')).display === 'none' && !document.getElementById('vue-accueil').hidden) && /OP GESTION/.test(await f.locator('[data-act="retour"]').first().getAttribute('aria-label')), await f.locator('[data-act="retour"]').first().getAttribute('aria-label'));
  // ── l'entreprise appartient à OP GESTION ──
  const z = await p.evaluate(() => [+getComputedStyle(document.getElementById('opdz')).zIndex, +getComputedStyle(document.getElementById('cpsys') || document.body).zIndex || 0]);
  v('l\'atelier est au-dessus de la Comptabilité (9000) et sous le guide (9500) : z-index 9100', z[0] === 9100 && z[0] > 9000 && z[0] < 9500, z);
  await f.locator('[data-vv="etape"][data-e="pres"]').first().click(); await p.waitForTimeout(250); await f.locator('[data-vv="ent-modifier"]').first().click(); await p.waitForTimeout(400);
  const ent = await f.evaluate(() => ({ txt: (document.querySelector('.fenetre') || {}).textContent || '', champs: document.querySelectorAll('.fenetre [data-id="nom"], .fenetre [data-id="iban"], .fenetre [data-id="siret"]').length }));
  v('« Modifier cet en-tête » (celui de l\'entreprise) : « Ton entreprise se règle dans OP GESTION. », AUCUN champ à régler', /Ton entreprise se règle dans OP GESTION\./.test(ent.txt) && ent.champs === 0, ent);
  await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(500);
  await f.locator('[data-vv="ent-nouveau"]').first().click(); await p.waitForTimeout(400);
  const nouv = await f.evaluate(() => ({ champs: document.querySelectorAll('.fenetre [data-id="nom"], .fenetre [data-id="iban"]').length, nom: (document.querySelector('.fenetre [data-id="nom"]') || {}).value, iban: (document.querySelector('.fenetre [data-id="iban"]') || {}).value }));
  v('« Nouvel en-tête » : modifiable (une autre société), et vierge — aucune valeur d\'exemple (ni IBAN, ni nom)', nouv.champs === 2 && nouv.iban === '' && nouv.nom === '', nouv);
  await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(500);
  // ── jour / nuit en direct : le prototype change de mode, l'atelier ouvert suit ──
  await p.evaluate(() => { mode = 'nuit'; appliquerMode(); }); await p.waitForTimeout(400);
  const th1 = await f.evaluate(() => document.documentElement.getAttribute('data-theme')); await p.evaluate(() => { mode = 'jour'; appliquerMode(); }); await p.waitForTimeout(400);
  v('mode jour/nuit en direct : le prototype passe en nuit, l\'atelier ouvert passe en « dark » ; puis revient « light »', th1 === 'dark' && (await f.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light', th1);
  // ── on compose ──
  const lignes = [{ ref: 'GS-20', qte: 2 }, { ref: 'EL-ALL', qte: 3 }];
  await A.composerDevis(c, f, { client: 'hp', objet: 'Remplacement de deux anodes', articles: lignes });
  const art = ref => att.cat.find(x => x[0] === ref);
  const attendu = A.ttc(lignes.map(l => ({ qte: l.qte, puC: art(l.ref)[3], tvaBp: art(l.ref)[4] })));
  const dd = await f.evaluate(() => ({ vue: S.vue, n: S.docs.length, d: S.docs.map(d => ({ nom: d.nom, num: d.meta.numero, etat: d.etat, ttc: calculer(d).ttc, cl: (d.blocs.find(b => b.type === 'client') || {}).client })) }));
  v('l\'éditeur s\'ouvre sur le devis créé', dd.vue === 'editeur' && dd.n === 1, dd);
  v('le TTC de l\'atelier = le TTC recalculé par la sonde (' + attendu + ' centimes)', dd.d[0] && dd.d[0].ttc === attendu, [dd.d[0] && dd.d[0].ttc, attendu]);
  v('le numéro suit la série du prototype (D-2026-…, jamais DEV-2026-…)', /^D-2026-\d{3}$/.test(dd.d[0].num), dd.d[0].num);
  v('le client choisi est celui du prototype (Hôtel de la Plage)', dd.d[0].cl && dd.d[0].cl.id === 'hp');
  v('le thème vient du prototype (data-theme posé par lui), jamais rangé dans le cadre', await f.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light' && !localStorage.getItem('documents-sur-mesure-opg-theme') && !localStorage.getItem('documents-sur-mesure-theme')));
  await L.capture(c, A.CAP + 'devis-editeur-' + c.profil + '.png');
  // ── retour au prototype : la liste, les onglets, les chiffres ──
  await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  v('« ‹ OP GESTION » ferme l\'atelier et laisse le prototype où il était (#devis)', (await L.etat(p)).atelier === false && (await p.evaluate(() => location.hash)) === '#devis');
  const rangee = () => p.evaluate(() => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  await L.toucher(c, '.seg [data-dvf="tous"]');
  let R = await rangee();
  v('Tous : le devis composé est dans « Composés dans l\'atelier » (1 ligne de plus)', R.length === avant.liste + 1, R);
  const ligne = R.find(t => /D-2026-0\d\d/.test(t)) || '';
  v('la ligne dit numéro, client, objet (sans le client répété), date, TTC et état', /D-2026-042/.test(ligne) && /Hôtel de la Plage/.test(ligne) && /Remplacement de deux anodes/.test(ligne) && !/ — Hôtel/.test(ligne) && /31\/10/.test(ligne) && L.cents(await p.locator('#contenu .opd-l .dv-m b').first().textContent()) === attendu && /Brouillon/.test(ligne), ligne);
  const k1 = await p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ b: k.querySelector('b').textContent, s: k.querySelector('span').textContent })));
  v('chiffre 1 « à finir et envoyer » : +1 (le brouillon composé)', nb(k1[0].b) === nb(k0[0].b) + 1, [k0[0].b, k1[0].b]);
  v('chiffres 2, 3 : inchangés (le brouillon n\'est ni en attente ni accepté)', k1[1].b === k0[1].b && k1[2].b === k0[2].b, [k0.map(x => x.b), k1.map(x => x.b)]);
  await L.toucher(c, '.seg [data-dvf="attente"]'); R = await rangee();
  v('En attente : pas encore là (il est brouillon)', !R.some(t => /D-2026-042/.test(t)), R);
  await L.toucher(c, '.seg [data-dvf="aenvoyer"]'); R = await rangee();
  v('À envoyer : il y est', R.some(t => /D-2026-042/.test(t)), R);
  // ── rouvrir, envoyer ──
  v('toucher la ligne rouvre le MÊME devis dans l\'atelier', await L.toucher(c, '#contenu .opd-l[data-opd="doc"]'));
  const f2 = await A.attendreAtelier(c);
  v('… éditeur ouvert sur D-2026-042', !!f2 && await f2.evaluate(() => S.vue === 'editeur' && D().meta.numero === 'D-2026-042'));
  await f2.locator('[data-act="envoyer"]:visible').first().click(); await p.waitForTimeout(500);
  v('le message d\'envoi salue la personne, sans sa fonction : « Bonjour Mme Bernard, »', /^Bonjour Mme Bernard,/.test(await f2.locator('#env-msg').inputValue()), await f2.locator('#env-msg').inputValue().then(t => t.slice(0, 40)));
  await f2.locator('[data-act="env-go"]:visible').first().click(); await p.waitForTimeout(1400);
  v('l\'envoi (simulé) passe le devis à « Envoyé »', await f2.evaluate(() => D().etat === 'envoye'), await f2.evaluate(() => D().etat));
  await f2.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  await L.toucher(c, '.seg [data-dvf="attente"]'); R = await rangee();
  const k2 = await p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ b: k.querySelector('b').textContent, s: k.querySelector('span').textContent })));
  v('En attente : le devis envoyé y est, pastille « Envoyé »', R.some(t => /D-2026-042/.test(t) && /Envoyé/.test(t)), R);
  v('chiffre 1 revient (rien à finir de plus)', nb(k2[0].b) === nb(k0[0].b), [k0[0].b, k2[0].b]);
  v('chiffre 2 « en attente de réponse » : + le TTC du devis (au centime) et +1 devis', L.cents(k2[1].b) === L.cents(k0[1].b) + attendu && nb(k2[1].s.replace(/^.*?réponse · /, '')) === nb(k0[1].s.replace(/^.*?réponse · /, '')) + 1, [k0[1].b, k2[1].b, k0[1].s, k2[1].s]);
  // ── accepté : le devis passe à « Signé » (la signature se fait dans l'atelier) ──
  const f3 = (await (async () => { await L.toucher(c, '.seg [data-dvf="attente"]'); await L.toucher(c, '#contenu .opd-l[data-opd="doc"]'); return A.attendreAtelier(c); })());
  await f3.evaluate(() => { const d = D(); d.etat = 'signe'; d.blocs.forEach(b => { if (b.type === 'signature') b.signataires.forEach(x => { x.date = '2026-10-31'; }); }); toucher(); sauverStock(); });   // raccourci, DIT : la signature au doigt n'est pas rejouée ici
  await f3.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
  await L.toucher(c, '.seg [data-dvf="accepte"]'); R = await rangee();
  const k3 = await p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => ({ b: k.querySelector('b').textContent, s: k.querySelector('span').textContent })));
  v('Acceptés : le devis signé y est, pastille « Signé »', R.some(t => /D-2026-042/.test(t) && /Signé/.test(t)), R);
  v('chiffre 3 « acceptés » : + le TTC et +1 ; chiffre 4 : le nombre de décidés +1', L.cents(k3[2].b) === L.cents(k0[2].b) + attendu && /· (\d+) décidés/.test(k3[3].s) && +k3[3].s.match(/· (\d+) décidés/)[1] === +k0[3].s.match(/· (\d+) décidés/)[1] + 1, [k0[2].b, k3[2].b, k0[3].s, k3[3].s]);
  await L.toucher(c, '.seg [data-dvf="perdu"]'); R = await rangee();
  v('Refusés, expirés : aucun devis composé (la liste n\'est pas là)', R.length === 0, R);
  // ── la fiche du client le montre ──
  await L.aller(p, 'client-x-hp');
  const fiche = await p.evaluate(() => [...document.querySelectorAll('#contenu .opd-cl')].map(e => e.innerText));
  v('la fiche du client (Hôtel de la Plage) montre son devis composé', fiche.some(t => /D-2026-042/.test(t)), fiche);
  // ── rechargement : la liste est là AU PREMIER RENDU, avant toute réponse de l'atelier ──
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
  await L.aller(p, 'devis'); await L.toucher(c, '.seg [data-dvf="tous"]');
  const apres = await p.evaluate(() => ({ lignes: document.querySelectorAll('#contenu .opd-l').length, cadre: !!document.getElementById('opdz') }));
  v('après rechargement : la ligne est là sans avoir ouvert l\'atelier (copie rangée côté hôte)', apres.lignes === 1 && apres.cadre === false, apres);
  const f4 = await A.ouvrirAtelier(c, 'devis', null); await f4.locator('[data-fen-x]').first().click(); await p.waitForTimeout(800);
  const apres2 = await p.evaluate(() => document.querySelectorAll('#contenu .opd-l').length);
  v('l\'atelier réouvert puis fermé : toujours 1 ligne, jamais 2 (aucun doublon)', apres2 === 1, apres2);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
