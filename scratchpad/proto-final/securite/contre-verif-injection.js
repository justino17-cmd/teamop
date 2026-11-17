// CONTRE-VÉRIFICATION de l'angle « injection » sur la TÊTE ACTUELLE (étape 6 sur 8, 17 novembre 2026), version LÉGÈRE :
// la sonde générique (injection-gestes.js) revisite 89 écrans par passage et dépasse son délai quand la machine est chargée.
// Ici, pour chaque faille : le geste d'une vraie personne (on ouvre le formulaire, on TAPE la charge, on valide), puis seulement
// l'écran où la faille dit que la charge sort. Une charge « sort » si elle crée une balise <img src="x"> (la charge) ; elle
// « s'exécute » si window.__xss monte. Chaque essai a son témoin (la même valeur, échappée, ne sort pas) et compte sa population.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Un ✗ est une faille qui existe encore sur la tête actuelle.
const L = require('../lib.js');
const CH = id => `ZQ${id}"'><img src=x data-ch="${id}" onerror="window.__xss=(window.__xss||0)+1">`;
const MESURE = id => `(() => ({ balise: document.querySelectorAll('img[data-ch="${id}"]').length, exec: window.__xss || 0 }))()`;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1200 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const attendre = ms => p.waitForTimeout(ms);
  const aller = async r => { await p.evaluate(r => aller(r), r); await attendre(700); };
  const mesure = async id => p.evaluate(`(() => ({ balise: document.querySelectorAll('img[data-ch="${id}"]').length, exec: window.__xss || 0 }))()`);
  const poser = async (sel, val) => { const l = p.locator(sel).first(); if (!(await l.count())) return false; await l.fill(val); await l.dispatchEvent('change'); await l.dispatchEvent('input'); return true; };
  const clic = async sel => { const l = p.locator(sel).first(); if (!(await l.count())) return false; await l.click(); await attendre(450); return true; };

  // ── injection-01 : « Inviter une personne » (prénom, nom) → planning ──
  await aller('equipe'); await clic('[data-eq="inviter"]');
  const okP = await poser('#eq-p', CH('p1')) && await poser('#eq-n', CH('n1')) && await poser('#eq-m', 'essai.pirate@exemple.fr');
  L.v('inj-01 (population) le formulaire « Inviter une personne » a pris la charge dans Prénom, Nom et e-mail', okP);
  await clic('[data-eq="inviterok"]'); await attendre(500);
  const cree = await p.evaluate(() => EQUIPE.some(q => /ZQp1/.test(q.prenom)));
  L.v('inj-01 (population) la personne piégée est créée (aucune garde d\'entrée ne l\'a refusée)', cree);
  const vues = {}; for (const r of ['planning', 'absences', 'accueil']) { await aller(r); vues[r] = await mesure('p1'); }
  console.log('inj-01 : par écran', JSON.stringify(vues));
  L.v('inj-01 le prénom d\'une personne invitée ne sort pas de son texte dans le planning, les absences, l\'accueil (écrans où la charge sort : ' + Object.keys(vues).filter(r => vues[r].balise).join(',') + ')', Object.values(vues).every(x => !x.balise), vues);
  L.v('inj-01 aucun code ne s\'exécute (exécutions : ' + (await mesure('p1')).exec + ')', (await mesure('p1')).exec === 0);
  // témoin : la même charge ÉCHAPPÉE ne sort pas (sinon la mesure ne distingue rien)
  const temoin = await p.evaluate(() => { const d = document.createElement('div'); document.body.appendChild(d); d.innerHTML = esc('ZQt"\'><img src=x data-ch="tem" onerror="window.__xss=99">'); const r = d.querySelectorAll('img[data-ch="tem"]').length; d.remove(); return r; });
  L.v('témoin : la charge échappée par esc() ne crée aucune balise', temoin === 0, temoin);

  // ── injection-02 : unité d'un article → Stock ──
  await aller('produits'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} prFormulaire(null, PACKS_ENT[0], PACKS[PACKS_ENT[0]].cats[0].n); }); await attendre(500);
  const okU = await poser('#pr-nom', 'Article de contre-vérification') && await poser('#pr-u', CH('u1'));
  L.v('inj-02 (population) le champ « Unité » a pris la charge', okU && (await p.evaluate(() => /ZQu1/.test(document.getElementById('pr-u').value))));
  await clic('[data-pr^="garder|"]'); await attendre(500);
  const art = await p.evaluate(() => PRODUITS.some(x => /ZQu1/.test(x.u || '')));
  L.v('inj-02 (population) l\'article piégé est enregistré (unité non filtrée)', art);
  const stock = {}; for (const r of ['stock', 'produits']) { await aller(r); stock[r] = await mesure('u1'); }
  console.log('inj-02 : par écran', JSON.stringify(stock));
  L.v('inj-02 l\'unité d\'un article ne sort pas de son texte dans le Stock et les Produits (sort dans : ' + Object.keys(stock).filter(r => stock[r].balise).join(',') + ')', Object.values(stock).every(x => !x.balise), stock);

  // ── injection-03 : toast ← nom de plateforme ──
  await aller('factures'); await clic('[data-cx="grp|conformite"]'); await clic('[data-cx="sec|normes"]'); await clic('[data-cx="plateforme"]');
  const okPl = await poser('#pa-n', CH('t1')); L.v('inj-03 (population) le champ « nom de la plateforme » a pris la charge', okPl);
  await clic('[data-cx="plateformeok"]'); await attendre(500);
  const toast = await mesure('t1'); const ts = await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  console.log('inj-03 : toast =', JSON.stringify(ts.slice(0, 60)), JSON.stringify(toast));
  L.v('inj-03 le message de confirmation ne fait pas sortir le nom saisi (auto-piégeage : l\'auteur voit son propre message)', !toast.balise, toast);

  // ── injection-05 : « Nouveau fournisseur » (téléphone) → détail d'une tâche de commande qui le désigne ──
  // La fiche d'un fournisseur existant n'a plus de champ « téléphone » ni « délai » en texte libre (mail, compte, remise) : seul le
  // formulaire « Nouveau fournisseur » (fo-l-tel) en prend un. La tâche de commande se crée ensuite par « Nouvelle tâche › pièces »
  // (tk-four est une liste des fournisseurs : la création de la tâche est LUE dans le code, pas jouée ; son détail, lui, est joué).
  await aller('produits'); await clic('[data-pr="vue|fournisseurs"]');
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} foLocal(); }); await attendre(500);
  const okN = await poser('#fo-l-nom', 'Fournisseur de contre-vérification') && await poser('#fo-l-tel', CH('f1')) && await poser('#fo-l-mail', 'contre@exemple.fr');
  L.v('inj-05 (population) le formulaire « Nouveau fournisseur » a pris la charge dans le téléphone', okN);
  await clic('[data-fo="localok"]'); await attendre(500);
  const nf = await p.evaluate(() => { const f = MES_FOURN.find(o => /ZQf1/.test(o.tel || '')); return f ? { id: f.id, tel: f.tel.slice(0, 12) } : null; });
  L.v('inj-05 (population) le fournisseur piégé est enregistré (téléphone non filtré)', !!nf, nf);
  if (nf) {
    await p.evaluate(id => { TACHES.push({ id: 'tcv', t: 'Commander des pièces (contre-vérification)', qui: 'marc', d: AUJ, h: null, urgent: false, lien: null, type: 'commande', etat: 'acommander', pieces: [{ nom: 'Pièce', ref: 'X', q: 1 }], four: id, inter: null }); }, nf.id);
    await aller('taches'); await p.evaluate(() => tDetail('tcv')); await attendre(500);
    const f = await mesure('f1');
    console.log('inj-05 : détail de la tâche de commande :', JSON.stringify(f));
    L.v('inj-05 le téléphone d\'un fournisseur ne sort pas de son texte dans le détail d\'une tâche de commande', !f.balise, f);
  }
  // ── angle que l'audit n'avait pas rejoué : la palette de recherche (Cmd K) écrit des noms de clients saisis par d'autres ──
  await aller('accueil');
  const pal = await p.evaluate(async () => { const k = Object.keys(CLIENTS)[0]; const avant = CLIENTS[k].nom; CLIENTS[k].nom = 'ZQc1"\'><img src=x data-ch="c1" onerror="window.__xss=(window.__xss||0)+1">';
    try { palOuvrir(); } catch (e) { return { erreur: e.message }; } await new Promise(r => setTimeout(r, 400));
    const q = document.getElementById('pal-q') || document.querySelector('#pal input'); if (q) { q.value = 'ZQc1'; q.dispatchEvent(new Event('input', { bubbles: true })); } await new Promise(r => setTimeout(r, 400));
    const r = { ouverte: !!document.getElementById('pal'), lignes: document.querySelectorAll('#pal-l .pal-i').length, balise: document.querySelectorAll('#pal img[data-ch="c1"]').length };
    try { document.getElementById('pal').remove(); } catch (e) {} CLIENTS[k].nom = avant; return r; });
  console.log('palette Cmd K, un client au nom piégé :', JSON.stringify(pal));
  L.v('palette (population) elle s\'ouvre et trouve au moins une ligne pour le client piégé', pal.ouverte && pal.lignes >= 1, pal);
  L.v('palette : le nom d\'un client ne sort pas de son texte dans la recherche Cmd K', !pal.balise, pal);
  console.log('erreurs page :', c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
