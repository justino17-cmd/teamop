// Parcours A « compta-ventes » : une facture à la main, de la création à l'envoi, en gérant (Marc), valeurs absurdes comprises.
// Joue : Comptabilité › Ventes › Factures & avoirs › ＋ Ajouter › Facture client ; champs vides ; quantité négative ; prix extrême ;
// nom de 60 caractères ; « ＋ Ajouter une ligne » (peut-on la NOMMER ? la SUPPRIMER ?) ; aperçu et envoi ; numéro ; liste ; à recevoir.
// usage : node compta-ventes-parcours-a.js [profil]      « N ✓ · M ✗ », code 1 si un contrôle tombe (le nom du contrôle porte le numéro du défaut)
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const du0 = await X.du(p), d0 = await X.donnees(p);
  L.v('population : 8 factures au départ', d0.F.length === 8, d0.F.length);
  await X.compta(c, 'fventes', { cat: 'ventes' });
  L.v('l’écran Factures & avoirs est ouvert', /Factures/.test(await X.texte(p, '#contenu h1')) || /Comptabilité/.test(await X.texte(p, '#contenu h1')));
  await L.capture(c, X.CAP + `a-${profil}-liste.png`);
  // ＋ Ajouter → Facture client
  await L.toucher(c, '[data-cx="nouveau"]'); L.v('« ＋ Ajouter » ouvre une fenêtre à 4 choix', (await X.panneau(p)).includes('Facture client') && (await X.panneau(p)).includes('Paiement reçu'));
  await L.toucher(c, '#calque [data-cx="facture"]'); L.v('« Facture client » ouvre le formulaire', /Nouvelle facture/.test(await X.panneau(p)));
  await L.capture(c, X.CAP + `a-${profil}-formulaire.png`);
  // le client doit être CHOISI (compta-ventes-10) : le champ propose « Choisir le client… », la création est refusée tant que ce n'est pas fait
  const cl0 = await p.evaluate(() => { const s = document.getElementById('nf-c'); return { v: s.value, t: s.options[0].textContent }; });
  L.v('compta-ventes-10 · le champ Client propose « Choisir le client… » au départ (pas le premier client par ordre alphabétique)', cl0.v === '' && /Choisir le client/.test(cl0.t), cl0);
  await X.saisir(c, '#nf-d', 'Mise en service'); await X.saisir(c, '#nf-p', '100'); await L.toucher(c, '#calque [data-cx="factureok"]');
  let t = await X.toasts(p); L.v('compta-ventes-10 · sans client choisi, la création est refusée avec une phrase', /client/i.test(t) && !(await p.evaluate(() => FACTURES.some(f => f.id.startsWith('fm')))), t);
  await p.selectOption('#nf-c', 'vp'); await X.saisir(c, '#nf-d', ''); await X.saisir(c, '#nf-p', '');
  // champs vides
  await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v('désignation vide : un message dit quoi faire', /désignation|factures/i.test(t), t);
  await X.saisir(c, '#nf-d', 'Mise en service'); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v('prix vide : un message dit quoi faire', /prix/i.test(t), t);
  // valeurs absurdes
  await X.saisir(c, '#nf-p', '-50'); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v('prix négatif refusé', /prix/i.test(t) && !(await p.evaluate(() => FACTURES.some(f => f.id.startsWith('fm')))), t);
  await X.saisir(c, '#nf-p', '100'); await X.saisir(c, '#nf-q', '-3');
  const avantNeg = await p.evaluate(() => FACTURES.length); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p);
  L.v('compta-ventes-01 · le refus dit pourquoi (quantité supérieure à zéro)', /quantité/i.test(t), t);
  for (const q of ['0', 'abc', '1,5,5']) { await X.saisir(c, '#nf-q', q); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v(`compta-ventes-01 · quantité « ${q} » refusée, pas transformée en 1`, /quantité/i.test(t) && !(await p.evaluate(() => FACTURES.some(f => f.id.startsWith('fm')))), t); }
  const negat = await p.evaluate(() => { const f = FACTURES.find(x => x.id.startsWith('fm')); return f ? { q: f.lignes[0].q, ht: htDe(f) } : null; });
  L.v('compta-ventes-01 · une quantité négative ne fabrique pas une facture négative (ou est refusée)', !negat || (parseFloat(String(negat.q).replace(',', '.')) > 0 && negat.ht > 0), negat);
  // remettre d'aplomb : repartir d'une page neuve pour la suite
  await X.O.neuf(c, 'comptabilite'); await X.compta(c, 'fventes', { cat: 'ventes' });
  await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]'); await p.selectOption('#nf-c', 'vp');
  const nom60 = 'Mise en service d’une pompe à chaleur air-eau avec groupe extérieur';
  await X.saisir(c, '#nf-o', nom60); await X.saisir(c, '#nf-d', nom60); await X.saisir(c, '#nf-q', '2'); await X.saisir(c, '#nf-p', '12 345,67');
  await L.toucher(c, '#calque [data-cx="factureok"]'); await p.waitForTimeout(400);
  const nf = await p.evaluate(() => { const f = FACTURES.find(x => x.id.startsWith('fm')); return f ? { id: f.id, ht: htDe(f), tva: f.tva, st: f.st, route, param } : null; });
  L.v('la facture est créée, « à valider », sans numéro', !!nf && nf.st === 'avalider', nf);
  L.v('HT = 2 × 12 345,67 = 24 691,34 au centime', !!nf && Math.round(nf.ht * 100) === 2469134, nf && nf.ht);
  L.v('la fiche de la facture s’ouvre toute seule', !!nf && /facture/.test(nf.route), nf && nf.route);
  await L.capture(c, X.CAP + `a-${profil}-fiche-nouvelle.png`);
  const dep = await L.deborde(c); L.v('aucun glissement latéral sur la fiche (valeurs longues)', !dep.bouge, dep);
  // « ＋ Ajouter une ligne »
  await L.toucher(c, '[data-action="ligneAjout"]');
  const lig = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return f.lignes.map(l => l.d + '|' + l.pu); }, nf.id);
  L.v('« ＋ Ajouter une ligne » ajoute une ligne', lig.length === 2, lig);
  const champsLigne = await p.evaluate(() => [...document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t)')].map(tr => ({ champs: tr.querySelectorAll('input').length, suppr: !!tr.querySelector('[data-action="ligneSup"]'), foc: document.activeElement === tr.querySelector('[data-fdes]') })));
  L.v('compta-ventes-02 · la ligne ajoutée peut être NOMMÉE (un champ texte pour la désignation, déjà actif) ET changée de quantité', champsLigne.length === 2 && champsLigne[1].champs === 3 && champsLigne[1].foc, champsLigne);
  L.v('compta-ventes-02b · la ligne ajoutée peut être SUPPRIMÉE (et la première aussi)', champsLigne.length === 2 && champsLigne.every(x => x.suppr), champsLigne);
  await L.capture(c, X.CAP + `a-${profil}-ligne-libre.png`);
  // la croix retire VRAIMENT la ligne (et la dernière ligne ne se retire pas)
  await L.toucher(c, '[data-action="ligneSup"][data-k="1"]'); await L.calme(p, 300);
  const apresSup = await p.evaluate(id => ({ n: FACTURES.find(x => x.id === id).lignes.length, champs: document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t)').length, t: (document.getElementById('toast') || {}).textContent }), nf.id);
  L.v('compta-ventes-02b · la croix retire la ligne (la facture et l’écran passent à 1 ligne) et le dit', apresSup.n === 1 && apresSup.champs === 1 && /retirée/.test(apresSup.t || ''), apresSup);
  await L.toucher(c, '[data-action="ligneSup"][data-k="0"]'); await L.calme(p, 300);
  const derniere = await p.evaluate(id => ({ n: FACTURES.find(x => x.id === id).lignes.length, t: (document.getElementById('toast') || {}).textContent }), nf.id);
  L.v('une facture garde au moins une ligne : retirer la dernière est refusé avec une phrase', derniere.n === 1 && /au moins une ligne/.test(derniere.t || ''), derniere);
  await L.toucher(c, '[data-action="ligneAjout"]'); await L.calme(p, 300);
  // « Aperçu et envoi » est grisé tant qu'une ligne n'a pas de prix, et dit pourquoi
  const apercuOff = await p.evaluate(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b ? b.disabled : null; });
  L.v('« Aperçu et envoi » est grisé avec une ligne sans prix', apercuOff === true, apercuOff);
  const dit = await X.texte(p, '#contenu');
  L.v('compta-ventes-07 · l’écran dit POURQUOI « Aperçu et envoi » est grisé (une phrase « ligne sans prix » visible, pas seulement un champ bordé)', /sans prix/.test(dit) && await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu *')].find(e => e.children.length === 0 && /sans prix/.test(e.textContent)); return !!b && b.offsetParent !== null; }), dit.slice(0, 60));
  // on chiffre la ligne libre
  const grise = await p.evaluate(() => document.querySelector('[data-action="apercuEnvoi"]').disabled);
  await p.locator('[data-fdes="1"]').fill('Déplacement'); await p.locator('[data-fdes="1"]').blur(); await L.calme(p, 300);
  const dit2 = await X.texte(p, '#contenu'); L.v('compta-ventes-02 · la ligne nommée mais sans prix garde « Aperçu et envoi » grisé', await p.evaluate(() => document.querySelector('[data-action="apercuEnvoi"]').disabled) && /sans prix/.test(dit2), grise);
  await p.locator('[data-fdes="1"]').fill(''); await p.locator('[data-fdes="1"]').blur(); await L.calme(p, 300);
  await p.locator('[data-prix="1"]').fill('50'); await p.locator('[data-prix="1"]').blur(); await L.calme(p, 300);
  const dit3 = await X.texte(p, '#contenu'); L.v('compta-ventes-02 · une ligne chiffrée mais SANS NOM garde « Aperçu et envoi » grisé et le dit', await p.evaluate(() => document.querySelector('[data-action="apercuEnvoi"]').disabled) && /sans nom/.test(dit3), dit3.slice(0, 80));
  await p.locator('[data-fdes="1"]').fill('Déplacement'); await p.locator('[data-fdes="1"]').blur(); await L.calme(p, 300);
  await p.locator('[data-fqte="1"]').fill('-2'); await p.locator('[data-fqte="1"]').blur(); await L.calme(p, 200);
  const qv = await p.evaluate(() => ({ champ: document.querySelector('[data-fqte="1"]').value, t: (document.getElementById('toast') || {}).textContent })); L.v('compta-ventes-01 · une quantité de ligne négative est refusée et l’ancienne valeur revient', qv.champ === '1' && /quantité/i.test(qv.t || ''), qv);
  await p.locator('[data-fqte="1"]').fill('2'); await p.locator('[data-fqte="1"]').blur(); await L.calme(p, 300);
  const ht2 = await p.evaluate(id => Math.round(htDe(FACTURES.find(x => x.id === id)) * 100), nf.id); L.v('compta-ventes-02 · la quantité modifiée compte dans le total (24 691,34 + 2 × 50)', ht2 === 2479134, ht2);
  await L.capture(c, X.CAP + `a-${profil}-ligne-nommee.png`);
  await p.locator('[data-fqte="1"]').fill('1'); await p.locator('[data-fqte="1"]').blur(); await L.calme(p, 300);
  await L.toucher(c, '[data-action="apercuEnvoi"]');
  const ap = await X.panneau(p); L.v('l’aperçu montre le client, l’objet et les pièces jointes', /À\s*:/.test(ap) && /Objet/.test(ap), ap.slice(0, 80));
  await L.capture(c, X.CAP + `a-${profil}-apercu.png`);
  await L.toucher(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(500);
  const apres = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { num: f.num, st: f.st, ht: htDe(f), reste: restant(f), numSuiv }; }, nf.id);
  L.v('à l’envoi la facture prend un numéro définitif', /^FAC-2026-0\d{3}$/.test(apres.num), apres);
  L.v('à l’envoi elle passe « envoyée »', apres.st === 'envoyee', apres.st);
  const du1 = await X.du(p); L.v('« à recevoir » augmente du TTC exact (24 691,34 + 50 = 24 741,34 HT × 1,2)', du1 - du0 === Math.round(24741.34 * 1.2 * 100), { du0, du1 });
  await L.toucher(c, '[data-retourva], [data-retour]'); await X.compta(c, 'fventes', { cat: 'clients' });
  const liste = await X.texte(p, '#contenu'); L.v('la facture paraît dans la liste Factures clients', liste.includes(apres.num), apres.num);
  const err = c.err.slice(); L.v('aucune erreur de page', err.length === 0, err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
