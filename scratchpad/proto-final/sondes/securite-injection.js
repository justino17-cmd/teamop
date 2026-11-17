// GARDE de l'audit de sécurité (étape 7 sur 8, 17 novembre 2026) : S01, S02, S03, S07, S08, S09, S12 — un texte venu d'une personne, d'un client, d'un
// expéditeur ou d'un fichier ne devient JAMAIS du code. Deux barrières, jouées SÉPARÉMENT (une faille réapparaît par l'une ou par l'autre) :
//   A. L'ENTRÉE : le vrai formulaire, une vraie charge tapée, le geste de validation — ce qui n'est pas permis est refusé avec un message
//      (prénom, nom, unité, téléphone) ou nettoyé (nom de la plateforme) ; chaque refus a son TÉMOIN (une saisie légitime passe, sinon la garde
//      refuserait tout) ;
//   B. LA SORTIE : la charge est posée DIRECTEMENT dans les données (comme le ferait une base d'avant, un import ou un e-mail), sans passer
//      par le formulaire, puis les écrans qui l'écrivent sont revisités : aucune balise, aucune exécution.
// Une charge « sort » si elle crée une balise <img data-ch=…> ; elle « s'exécute » si window.__xss monte. Chaque mesure compte sa population.
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js');
const CH = id => `ZQ${id}"'><img src=x data-ch="${id}" onerror="window.__xss=(window.__xss||0)+1">`;
const MES = id => `(() => ({ balise: document.querySelectorAll('img[data-ch="${id}"]').length, exec: window.__xss || 0 }))()`;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1200 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const aller = async r => { await p.evaluate(r => { try { fermerPanneau(); } catch (e) {} aller(r); }, r); await att(650); };
  const mesure = id => p.evaluate(MES(id));
  const poser = async (sel, val) => { const l = p.locator(sel).first(); if (!(await l.count())) return false; await l.fill(val); await l.dispatchEvent('change'); await l.dispatchEvent('input'); return true; };
  const clic = async sel => { const l = p.locator(sel).first(); if (!(await l.count())) return false; await l.click(); await att(450); return true; };
  const toast = () => p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');

  // ═══ A. L'ENTRÉE ═══
  // A1 · S03 : « Inviter une personne » — prénom et nom
  await aller('equipe'); await clic('[data-eq="inviter"]');
  const okP = await poser('#eq-p', CH('p1')) && await poser('#eq-n', CH('n1')) && await poser('#eq-m', 'essai.pirate@exemple.fr');
  L.v('A1 (population) le formulaire « Inviter une personne » a pris la charge dans Prénom, Nom et e-mail', okP);
  const n0 = await p.evaluate(() => EQUIPE.length);
  await clic('[data-eq="inviterok"]'); await att(400);
  const a1 = await p.evaluate(() => ({ n: EQUIPE.length, piege: EQUIPE.some(q => /ZQ/.test(q.prenom + q.nom)), panneau: !!document.getElementById('eq-p') }));
  const t1 = await toast();
  L.v('A1 S03 une personne au prénom et au nom piégés n\'est pas créée', !a1.piege && a1.n === n0, a1);
  L.v('A1 le refus DIT pourquoi (message sur les signes permis) et le formulaire reste ouvert pour corriger', /lettres|signes/i.test(t1) && a1.panneau, { toast: t1.slice(0, 120), panneau: a1.panneau });
  // témoin : un vrai nom, avec tiret et apostrophe droite, est accepté (apostrophe rendue typographique)
  const plein = await p.evaluate(() => typeof eqxPlein === 'function' ? eqxPlein() : false);
  if (!plein) {
    await poser('#eq-p', 'Jean-Pierre'); await poser('#eq-n', 'N\'Diaye'); await poser('#eq-m', 'jp.ndiaye@exemple.fr'); await clic('[data-eq="inviterok"]'); await att(500);
    const tem = await p.evaluate(() => { const q = EQUIPE.find(o => o.prenom === 'Jean-Pierre'); return q ? { nom: q.nom, tech: (typeof tech === 'function' ? tech(q.k) : {}).nom || '' } : null; });
    L.v('A1 témoin : « Jean-Pierre N\'Diaye » est créé, apostrophe rendue typographique (N’Diaye)', !!tem && tem.nom === 'N’Diaye', tem);
  } else console.log('  · A1 témoin non joué : toutes les places de l\'abonnement sont prises (à DIRE)');

  // A2 · S07 : unité d'un article (formulaire)
  await aller('produits'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} prFormulaire(null, PACKS_ENT[0], PACKS[PACKS_ENT[0]].cats[0].n); }); await att(500);
  const okU = await poser('#pr-nom', 'Article de garde') && await poser('#pr-u', CH('u1'));
  L.v('A2 (population) le champ « Unité » a pris la charge', okU && await p.evaluate(() => /ZQu1/.test(document.getElementById('pr-u').value)));
  const np0 = await p.evaluate(() => PRODUITS.length);
  await clic('[data-pr^="garder|"]'); await att(500);
  const a2 = await p.evaluate(() => ({ n: PRODUITS.length, piege: PRODUITS.some(x => /ZQ/.test(x.u || '')) }));
  L.v('A2 S07 un article à l\'unité piégée n\'est pas enregistré', !a2.piege && a2.n === np0, a2);
  L.v('A2 le refus dit pourquoi (une unité s\'écrit en quelques lettres)', /unité/i.test(await toast()), (await toast()).slice(0, 100));
  const unites = await p.evaluate(() => { const bons = ['u', 'kg', 'm²', 'L', 'lot', 'boîte', 'aérosol', 'm', 'paire', 'flacon', 'g/L'].every(u => uniteSure(u) === u), mauvais = ['<b>', 'x"y', 'a'.repeat(13), '', 'u<img>'].every(u => uniteSure(u) === ''); const usage = [...new Set(PRODUITS.map(x => x.u || 'u'))]; return { bons, mauvais, usage, refusees: usage.filter(u => !uniteSure(u)) }; });
  L.v('A2 témoin : les unités ordinaires passent et les piégées sont refusées', unites.bons && unites.mauvais, unites);
  L.v('A2 aucune unité des ' + unites.usage.length + ' qu\'utilisent les articles de la démonstration n\'est refusée (population : ' + unites.usage.length + ')', unites.usage.length >= 4 && unites.refusees.length === 0, unites.refusees);

  // A3 · S08 : téléphone d'un nouveau fournisseur
  await aller('produits'); await clic('[data-pr="vue|fournisseurs"]');
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} foLocal(); }); await att(500);
  const okF = await poser('#fo-l-nom', 'Fournisseur de garde') && await poser('#fo-l-tel', CH('f1')) && await poser('#fo-l-mail', 'garde@exemple.fr');
  L.v('A3 (population) le formulaire « Nouveau fournisseur » a pris la charge dans le téléphone', okF);
  const nf0 = await p.evaluate(() => MES_FOURN.length); await clic('[data-fo="localok"]'); await att(400);
  L.v('A3 S08 un fournisseur au téléphone piégé n\'est pas enregistré', await p.evaluate(n => MES_FOURN.length === n && !MES_FOURN.some(f => /ZQ/.test(f.tel || '')), nf0));
  await poser('#fo-l-tel', '05 46 12 34 56'); await clic('[data-fo="localok"]'); await att(500);
  L.v('A3 témoin : le même fournisseur avec « 05 46 12 34 56 » est enregistré', await p.evaluate(n => MES_FOURN.length === n + 1 && MES_FOURN[MES_FOURN.length - 1].tel === '05 46 12 34 56', nf0));

  // A4 · S12 : nom de la plateforme agréée (message de confirmation)
  await aller('factures'); await clic('[data-cx="grp|conformite"]'); await clic('[data-cx="sec|normes"]'); await clic('[data-cx="plateforme"]');
  L.v('A4 (population) le champ « nom de la plateforme » a pris la charge', await poser('#pa-n', CH('t1')));
  await clic('[data-cx="plateformeok"]'); await att(500);
  const a4 = await mesure('t1');
  L.v('A4 S12 le message de confirmation ne fait pas sortir le nom saisi (balise ' + a4.balise + ', exécution ' + a4.exec + ')', !a4.balise && !a4.exec, a4);
  L.v('A4 le message a bien été affiché (population : « Plateforme enregistrée »)', /Plateforme enregistrée/.test(await toast()), (await toast()).slice(0, 80));

  // A5 · S09 : nom d'un fichier de paie
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} PAIE.mode = 'cabinet'; paieRecevoir(); }); await att(600);
  const champ = p.locator('[data-paiefichiers]').first(); L.v('A5 (population) le champ de dépôt des fiches de paie est atteint', (await champ.count()) > 0);
  await champ.setInputFiles({ name: CH('nf1') + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') }); await att(600);
  const a5 = await p.evaluate(() => ({ balise: document.querySelectorAll('#toast img[data-ch="nf1"]').length, exec: window.__xss || 0, texte: ((document.getElementById('toast') || {}).textContent || '').slice(0, 80) }));
  L.v('A5 (population) le message dit qu\'une fiche est « sans nom reconnu »', /sans nom reconnu/.test(a5.texte), a5);
  L.v('A5 S09 le nom d\'un fichier déposé ne sort pas de son texte dans le message (balise ' + a5.balise + ', exécution ' + a5.exec + ')', !a5.balise && !a5.exec, a5);

  // ═══ B. LA SORTIE : la charge est posée dans les DONNÉES, sans passer par un formulaire ═══
  await p.evaluate(() => { window.__xss = 0; });
  // B1 · S03 : une personne dont le prénom et le nom sont piégés (donnée d'avant, import) — planning, absences, accueil, équipe, statistiques
  // la fonction CH ne traverse pas evaluate : on la reconstruit dans la page
  const chPage = `(id => 'ZQ' + id + '"\\'><img src=x data-ch="' + id + '" onerror="window.__xss=(window.__xss||0)+1">')`;
  await p.evaluate(`(() => { const CH = ${chPage}; EQUIPE = EQUIPE.filter(q => q.k !== 'zq1'); EQUIPE.push({ k: 'zq1', prenom: CH('p2'), nom: CH('n2'), role: 'Essai', mail: 'zq1@exemple.fr', tel: '', actif: true, invite: false, terrain: true, droits: copieProfil('tech'), habil: [] }); eqxSynchro(); })()`);
  const nomsB1 = await p.evaluate(() => ({ tech: tech('zq1').nom, hnom: H_NOM('zq1'), eq: eqNom(EQUIPE.find(q => q.k === 'zq1')) }));
  L.v('B1 (population) la personne piégée est dans les données (planning, historique et équipe en portent le nom)', /ZQp2/.test(nomsB1.tech) && /ZQp2/.test(nomsB1.hnom), nomsB1);
  L.v('B1 S03 le nom que le planning et l\'historique lisent ne contient plus aucun signe de balise ni de guillemet', !/[<>"]/.test(nomsB1.tech + nomsB1.hnom + nomsB1.eq), nomsB1);
  const vues = {}; for (const r of ['planning', 'absences', 'accueil', 'equipe', 'pointage']) { await aller(r); vues[r] = await mesure('p2'); }
  console.log('B1 : par écran', JSON.stringify(vues));
  L.v('B1 S03 le prénom d\'une personne ne sort pas de son texte (écrans visités : ' + Object.keys(vues).length + ' ; sort dans : ' + (Object.keys(vues).filter(r => vues[r].balise).join(',') || 'aucun') + ')', Object.values(vues).every(x => !x.balise), vues);
  L.v('B1 aucune exécution (' + (await mesure('p2')).exec + ')', (await mesure('p2')).exec === 0);

  // B2 · S07 : une unité piégée déjà rangée (import d'avant) — Stock et Produits
  await p.evaluate(`(() => { const CH = ${chPage}; const x = PRODUITS.find(o => !o.retire) || PRODUITS[0]; window.__avU = x.u; window.__idU = x.id; x.u = CH('u2'); })()`);
  const stock = {}; for (const r of ['stock', 'produits']) { await aller(r); stock[r] = await mesure('u2'); }
  console.log('B2 : par écran', JSON.stringify(stock));
  L.v('B2 S07 l\'unité d\'un article ne sort pas de son texte dans le Stock ni les Produits (sort dans : ' + (Object.keys(stock).filter(r => stock[r].balise).join(',') || 'aucun') + ')', Object.values(stock).every(x => !x.balise), stock);
  await p.evaluate(() => { const x = PRODUITS.find(o => o.id === window.__idU); if (x) x.u = window.__avU; });

  // B3 · S08 : le téléphone et le délai d'un fournisseur dans le détail d'une tâche de commande
  await p.evaluate(`(() => { const CH = ${chPage}; MES_FOURN.push({ id: 'fzq', nom: 'Fournisseur piégé', packs: [PACKS_ENT[0]], mail: 'z@exemple.fr', tel: CH('f2'), compte: '', delai: CH('f3'), remise: null, contact: 'Contact' });
    TACHES.push({ id: 'tzq', t: 'Commander des pièces (garde)', qui: 'marc', d: AUJ, h: null, urgent: false, lien: null, type: 'commande', etat: 'acommander', pieces: [{ nom: 'Pièce', ref: 'X', q: 1 }], four: 'fzq', inter: null }); })()`);
  await aller('taches'); await p.evaluate(() => tDetail('tzq')); await att(500);
  const b3 = { tel: await mesure('f2'), delai: await mesure('f3') };
  L.v('B3 (population) le détail de la tâche de commande est ouvert (carte « Fournisseur » présente)', await p.evaluate(() => /Fournisseur piégé/.test((document.querySelector('#calque') || document.body).innerText)), b3);
  L.v('B3 S08 le téléphone et le délai d\'un fournisseur ne sortent pas de leur texte (balises ' + (b3.tel.balise + b3.delai.balise) + ')', !b3.tel.balise && !b3.delai.balise, b3);

  // B4 · S02 : l'Historique (liste, fiche d'une ligne) avec une action et un nom d'acteur piégés
  await p.evaluate(`(() => { const CH = ${chPage}; try { fermerPanneau(); } catch (e) {} journalAjout('marc', 'equipe', 'a répondu à ' + CH('j1'), { lib: 'Essai' }); })()`);
  await aller('historique');
  const lh = await p.evaluate(() => ({ lignes: document.querySelectorAll('#contenu [data-hj]').length, aff: /ZQj1/.test(document.getElementById('contenu').innerText) }));
  const b4 = await mesure('j1');
  L.v('B4 (population) l\'Historique montre la ligne piégée (' + lh.lignes + ' lignes)', lh.aff, lh);
  L.v('B4 S02 une action piégée ne sort pas de son texte dans la liste de l\'Historique (balise ' + b4.balise + ')', !b4.balise, b4);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu [data-hj]')].find(x => /ZQj1/.test(x.textContent)); if (b) b.click(); }); await att(500);
  L.v('B4 S02 ni dans la fiche d\'une ligne (panneau ouvert : ' + (await p.evaluate(() => !!document.querySelector('#calque .panneau'))) + ')', !(await mesure('j1')).balise && (await mesure('j1')).exec === 0);

  // B5 · S01 : « À faire maintenant » (Accueil) avec le titre d'une tâche et le nom d'un client piégés
  await p.evaluate(`(() => { const CH = ${chPage}; try { fermerPanneau(); } catch (e) {} TACHES.push({ id: 'tzq2', t: CH('a1'), qui: 'marc', d: AUJ, h: null, urgent: true, lien: null }); window.__avN = CLIENTS.hp.nom; CLIENTS.hp.nom = CH('a2'); })()`);
  await aller('accueil');
  const acc = { tache: await mesure('a1'), client: await mesure('a2'), texte: await p.evaluate(() => /ZQa1/.test(document.getElementById('contenu').innerText)) };
  L.v('B5 (population) « À faire maintenant » écrit la tâche piégée', acc.texte, acc);
  L.v('B5 S01 le titre d\'une tâche ne sort pas de son texte à l\'Accueil (balise ' + acc.tache.balise + ', exécution ' + acc.tache.exec + ')', !acc.tache.balise && !acc.tache.exec, acc);
  L.v('B5 S01 ni le nom d\'un client (balise ' + acc.client.balise + ')', !acc.client.balise, acc);
  await p.evaluate(() => { CLIENTS.hp.nom = window.__avN; });

  // B6 · témoin : sur une page sans protection la même charge SORT (sinon la mesure ne distingue rien)
  const temoin = await p.evaluate(() => { const d = document.createElement('div'); document.body.appendChild(d); d.innerHTML = 'x"\'><img src=x data-ch="tem" onerror="window.__tem=1">'; const brut = document.querySelectorAll('img[data-ch="tem"]').length; d.innerHTML = esc('x"\'><img src=x data-ch="tem2" onerror="window.__tem=2">'); const net = document.querySelectorAll('img[data-ch="tem2"]').length; d.remove(); return { brut, net }; });
  L.v('B6 témoin : la même charge écrite brute crée une balise, écrite par esc() non', temoin.brut === 1 && temoin.net === 0, temoin);
  console.log('erreurs page :', c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
